import * as THREE from 'three';

/**
 * Arcade flight model — quaternion orientation, velocity along the nose, bank-to-turn,
 * and a light energy model (diving gains speed, climbing bleeds it). No aerodynamics.
 * See knowledge/pocket-pilots/flight-model/arcade-flight-model.md.
 *
 * Per-plane character comes from the six normalized dials (turn/speed/climb/diveSafety/
 * durability/firepower), which scale the base constants below, plus signature mechanics
 * (torque bias, low-speed penalty, dive limit). Data lives in src/data/aircraft.js.
 *
 * Convention: nose = local +Z, up = +Y, right = +X (matches plane-model.js).
 */

const FORWARD = new THREE.Vector3(0, 0, 1);
const RIGHT = new THREE.Vector3(1, 0, 0);
const LOCAL_X = new THREE.Vector3(1, 0, 0);
const LOCAL_Y = new THREE.Vector3(0, 1, 0);
const LOCAL_Z = new THREE.Vector3(0, 0, 1);
const WORLD_Y = new THREE.Vector3(0, 1, 0);

const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

// Constants shared by all planes (not dial-driven).
const COMMON = {
  throttleRate: 0.5, // throttle units/s
  speedResponse: 1.6, // how fast speed chases its target
  autoLevel: 2.6, // hands-off ROLL self-righting rate toward upright (pitch is left as set)
  floor: -500, // failsafe only; real ground contact is handled by collision (→ explosion)
  ceiling: 500,
};

/** Map a plane's dials → concrete flight constants. */
export function deriveTuning(dials) {
  const { turn, speed, climb, diveSafety } = dials;
  const maxSpeed = lerp(30, 52, speed);
  return {
    // Control authority scales with the turn dial.
    pitchRate: lerp(0.95, 1.7, turn),
    rollRate: lerp(1.7, 3.3, turn),
    yawRate: lerp(0.6, 1.0, turn),
    bankTurnRate: lerp(0.95, 1.45, turn),
    // Speed envelope.
    minSpeed: lerp(10, 16, speed),
    maxSpeed,
    diveMaxSpeed: maxSpeed * lerp(1.15, 1.5, diveSafety), // fragile planes top out lower
    // Energy coupling: better climbers bleed less speed going up.
    energyDive: 24,
    energyClimb: lerp(30, 16, climb),
    ...COMMON,
  };
}

export class Aircraft {
  /**
   * @param {THREE.Object3D} object  visual model (its transform is driven each render)
   * @param {object} def             an entry from src/data/aircraft.js
   * @param {object} [opts]
   * @param {THREE.Vector3} [opts.position]
   * @param {number} [opts.throttle=0.7]
   */
  constructor(object, def, { position = new THREE.Vector3(0, 60, 0), throttle = 0.7 } = {}) {
    this.object = object;
    this.def = def;
    this.side = def.side;
    this.tuning = deriveTuning(def.dials);
    this.mechanics = def.mechanics ?? {};

    // Combat stats.
    this.maxHealth = lerp(60, 120, def.dials.durability);
    this.health = this.maxHealth;
    this.dead = false;
    this.exploded = false; // guards the one-time death explosion (bullet kill or crash)
    this.collisionRadius = 2.4;
    this.smokeTimer = 0;

    // Weapon: fire rate + per-bullet damage scale with the firepower dial.
    const fp = def.dials.firepower;
    this.gunCount = def.guns;
    this.fireInterval = lerp(0.12, 0.075, fp);
    this.bulletDamage = lerp(5, 9, fp);
    this.muzzleSpeed = 165;
    this._fireTimer = 0;
    this.heat = 0;
    this.overheated = false;
    const nz = def.model.fuselage.length / 2 + 0.25;
    this.muzzles = this.gunCount >= 2
      ? [new THREE.Vector3(-0.18, 0.12, nz), new THREE.Vector3(0.18, 0.12, nz)]
      : [new THREE.Vector3(0, 0.16, nz)];
    this._muzzleWorld = new THREE.Vector3();
    this._bulletVel = new THREE.Vector3();

    // Simulation state.
    this.position = position.clone();
    this.quaternion = new THREE.Quaternion();
    this.throttle = throttle;
    this.speed = lerp(this.tuning.minSpeed, this.tuning.maxSpeed, throttle);
    this.stress = 0; // dive-limit wing stress (0..1), for HUD/feel

    // Previous-step state for render interpolation.
    this.prevPosition = this.position.clone();
    this.prevQuaternion = this.quaternion.clone();

    // Scratch (avoid per-frame allocation).
    this._dq = new THREE.Quaternion();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._desUp = new THREE.Vector3();
    this._desFwd = new THREE.Vector3();
    this._targetQ = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
  }

  forward(out = new THREE.Vector3()) {
    return out.copy(FORWARD).applyQuaternion(this.quaternion);
  }

  /**
   * Fixed-step simulation update.
   * @param {number} dt   fixed timestep (s)
   * @param {object} c    controls {pitch, roll, yaw, throttle} in [-1,1]
   */
  update(dt, c) {
    const t = this.tuning;
    const m = this.mechanics;

    this.prevPosition.copy(this.position);
    this.prevQuaternion.copy(this.quaternion);

    // --- Throttle ---
    this.throttle = clamp(this.throttle + c.throttle * t.throttleRate * dt, 0, 1);

    // --- Control authority modifiers (signature mechanics) ---
    let authority = 1;
    // Low-speed penalty (SPAD): mushy near the stall.
    if (m.lowSpeedPenalty) {
      const lowThresh = t.minSpeed * 1.6;
      if (this.speed < lowThresh) {
        authority *= lerp(1 - m.lowSpeedPenalty, 1, clamp((this.speed - t.minSpeed) / (lowThresh - t.minSpeed), 0, 1));
      }
    }
    // Dive limit (Nieuport, Albatros): wings flex under high-speed dive stress.
    this.stress = clamp((this.speed - t.diveMaxSpeed * 0.85) / (t.diveMaxSpeed * 0.15), 0, 1);
    if (m.diveLimit && this.stress > 0) {
      authority *= lerp(1, 0.55, this.stress);
    }

    // --- Rotation: small deltas about LOCAL axes ---
    // Pitch: +control = nose up → negative rotation about local X.
    this.#rotateLocal(LOCAL_X, -c.pitch * t.pitchRate * authority * dt);

    // Roll: +control = roll right. Torque bias makes right rolls snappier (Camel, Dr.I).
    let rollInput = c.roll;
    if (m.torqueBias) {
      rollInput *= rollInput > 0 ? 1 + m.torqueBias : 1 - m.torqueBias * 0.5;
    }
    this.#rotateLocal(LOCAL_Z, rollInput * t.rollRate * authority * dt);

    // Rudder yaw is a local nose-swing. Rotary torque (Camel, Dr.I) adds a mild pull only
    // while turning — snappier right turns, no drift at neutral.
    let localYaw = c.yaw * t.yawRate * authority;
    if (m.torqueBias && rollInput !== 0) localYaw += rollInput * m.torqueBias * t.yawRate;
    this.#rotateLocal(LOCAL_Y, localYaw * dt);

    // Bank-to-turn: a banked plane curves its HEADING about the world vertical, so banking
    // turns the plane without dropping the nose — it stays level through the turn.
    this._right.copy(RIGHT).applyQuaternion(this.quaternion);
    const bank = clamp(-this._right.y, -1, 1);
    this.#rotateWorldY(bank * t.bankTurnRate * dt);

    // Roll self-level toward UPRIGHT only, when hands-off the roll axis — the wings ease back
    // level while the PITCH is left exactly as the pilot set it (whatever climb/dive attitude
    // you're on, it holds). Slerp toward a target with the same nose direction but wings-level,
    // which is a pure roll, so it rights cleanly from any bank (including inverted).
    if (c.roll === 0) {
      this.forward(this._desFwd); // keep the current nose direction (vertical trajectory)
      this._desUp.set(0, 1, 0); // wings toward world-up
      this._right.crossVectors(this._desUp, this._desFwd);
      if (this._right.lengthSq() < 1e-5) this._right.copy(RIGHT).applyQuaternion(this.quaternion); // nose vertical
      this._right.normalize();
      this._up.crossVectors(this._desFwd, this._right);
      this._m.makeBasis(this._right, this._up, this._desFwd);
      this._targetQ.setFromRotationMatrix(this._m);
      this.quaternion.slerp(this._targetQ, Math.min(1, t.autoLevel * dt));
    }

    // --- Speed / energy model ---
    this.forward(this._fwd);
    let target = lerp(t.minSpeed, t.maxSpeed, this.throttle);
    // forward.y > 0 climbing (lose speed), < 0 diving (gain speed).
    target += this._fwd.y < 0 ? -this._fwd.y * t.energyDive : -this._fwd.y * t.energyClimb;
    target = clamp(target, t.minSpeed, t.diveMaxSpeed);
    this.speed += (target - this.speed) * Math.min(1, t.speedResponse * dt);

    // --- Integrate position along the nose ---
    this.position.addScaledVector(this._fwd, this.speed * dt);

    // --- Altitude clamp (soft; crash handling later) ---
    this.position.y = clamp(this.position.y, t.floor, t.ceiling);
  }

  #rotateLocal(axis, angle) {
    if (angle === 0) return;
    this._dq.setFromAxisAngle(axis, angle);
    this.quaternion.multiply(this._dq).normalize();
  }

  /** Rotate about the WORLD vertical (heading change), independent of the plane's attitude. */
  #rotateWorldY(angle) {
    if (angle === 0) return;
    this._dq.setFromAxisAngle(WORLD_Y, angle);
    this.quaternion.premultiply(this._dq).normalize();
  }

  syncRender(alpha) {
    this.object.position.lerpVectors(this.prevPosition, this.position, alpha);
    this.object.quaternion.copy(this.prevQuaternion).slerp(this.quaternion, alpha);
  }

  /**
   * Fire the guns if triggered and not on cooldown/overheated. Spawns one tracer per gun.
   * @returns {boolean} whether it fired this call
   */
  tryFire(dt, firing, bullets) {
    const HEAT_PER_SHOT = 0.055;
    const COOL_RATE = 0.5;
    this._fireTimer -= dt;
    if (firing && !this.overheated && !this.dead && this._fireTimer <= 0) {
      this.forward(this._fwd);
      for (const m of this.muzzles) {
        this._muzzleWorld.copy(m).applyQuaternion(this.quaternion).add(this.position);
        this._bulletVel.copy(this._fwd).multiplyScalar(this.muzzleSpeed + this.speed);
        bullets.spawn(this._muzzleWorld, this._bulletVel, this.side, this.bulletDamage);
      }
      this._fireTimer = this.fireInterval;
      this.heat = Math.min(1, this.heat + HEAT_PER_SHOT);
      if (this.heat >= 1) this.overheated = true;
      return true;
    }
    this.heat = Math.max(0, this.heat - COOL_RATE * dt);
    if (this.overheated && this.heat < 0.3) this.overheated = false;
    return false;
  }

  /** Apply damage. @returns {boolean} true if this hit was the killing blow. */
  takeDamage(amount) {
    if (this.dead) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      return true;
    }
    return false;
  }

  /** Reset for a fresh round at `position` (keeps current throttle setting). */
  respawn(position) {
    this.position.copy(position);
    this.prevPosition.copy(position);
    this.quaternion.identity();
    this.prevQuaternion.identity();
    this.speed = lerp(this.tuning.minSpeed, this.tuning.maxSpeed, this.throttle);
    this.health = this.maxHealth;
    this.dead = false;
    this.exploded = false;
    this.heat = 0;
    this.overheated = false;
    this.stress = 0;
    this.object.visible = true;
    this.syncRender(1);
  }

  telemetry() {
    return {
      speed: this.speed,
      throttle: this.throttle,
      altitude: this.position.y,
      stress: this.stress,
    };
  }
}
