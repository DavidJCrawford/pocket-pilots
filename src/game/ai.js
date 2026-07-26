import * as THREE from 'three';
import { obstacleTop } from './terrain.js';

/**
 * Enemy pilot AI. Produces the SAME controls object the player's Input does
 * ({pitch, roll, yaw, throttle, fire}), fed into the identical flight model — the AI
 * flies by the same rules, no stat cheating. See knowledge/pocket-pilots/flight-model/
 * ai-opponents.md.
 *
 * Behaviour: ENGAGE (pursue the target, aim with lead, fire inside a forward cone) with an
 * EVADE break when tailed or badly hurt. Difficulty scales aim/fire/steering.
 */

const clamp = THREE.MathUtils.clamp;
const NEUTRAL = { pitch: 0, roll: 0, yaw: 0, throttle: 0, fire: false };

const DIFFICULTY = {
  easy: { steerRoll: 0.9, steerPitch: 1.1, fireCone: 0.985, fireAngle: 0.14, aimError: 11, aggression: 0.7 },
  normal: { steerRoll: 1.3, steerPitch: 1.6, fireCone: 0.975, fireAngle: 0.2, aimError: 6, aggression: 1 },
  hard: { steerRoll: 1.7, steerPitch: 2.0, fireCone: 0.965, fireAngle: 0.26, aimError: 2.5, aggression: 1 },
};

export class PilotAI {
  constructor(aircraft, { difficulty = 'normal', seed = 0 } = {}) {
    this.ac = aircraft;
    this.d = DIFFICULTY[difficulty] ?? DIFFICULTY.normal;
    this.state = 'engage';
    this.evadeT = 0;
    this.evadeDir = 1;
    // Hold fire while closing in — staggered per pilot so they don't all open up at once,
    // giving the player a moment to react at the merge.
    this.age = 0;
    this.holdFire = 1.4 + (seed % 3) * 0.7;
    this.jitter = new THREE.Vector3();
    this.jitterT = 0;
    this.seed = seed;

    // Scratch.
    this._toT = new THREE.Vector3();
    this._aim = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._local = new THREE.Vector3();
    this._invQ = new THREE.Quaternion();
    this._tvel = new THREE.Vector3();
    this._tfwd = new THREE.Vector3();
    this._playerToMe = new THREE.Vector3();
  }

  /** @returns {{pitch,roll,yaw,throttle,fire}} */
  think(dt, target) {
    const ac = this.ac;
    if (ac.dead || !target || target.dead) return NEUTRAL;
    const d = this.d;
    this.age += dt;

    // Refresh aim jitter occasionally (imperfect marksmanship, scaled by difficulty).
    this.jitterT -= dt;
    if (this.jitterT <= 0) {
      this.jitterT = 0.35;
      this.jitter.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(d.aimError);
    }

    // Lead the target: aim where it will be, given bullet travel time.
    this._toT.subVectors(target.position, ac.position);
    const dist = this._toT.length();
    const bulletSpeed = ac.muzzleSpeed + ac.speed;
    const lead = clamp(dist / bulletSpeed, 0, 1.3);
    target.forward(this._tfwd);
    this._tvel.copy(this._tfwd).multiplyScalar(target.speed);
    this._aim.copy(target.position).addScaledVector(this._tvel, lead).add(this.jitter);

    // Direction to aim point in the AI's LOCAL frame.
    this._dir.subVectors(this._aim, ac.position).normalize();
    this._invQ.copy(ac.quaternion).invert();
    this._local.copy(this._dir).applyQuaternion(this._invQ);
    const yawErr = Math.atan2(this._local.x, this._local.z); // 0 ahead, ± behind
    const pitchErr = Math.asin(clamp(this._local.y, -1, 1));

    // --- Evade decision ---
    // Tailed: player is behind me, close, and pointing at me.
    this._playerToMe.subVectors(ac.position, target.position).normalize();
    const aimingAtMe = this._tfwd.dot(this._playerToMe) > 0.9;
    const behindMe = this._local.z < -0.1;
    const tailed = aimingAtMe && behindMe && dist < 45;
    const hurt = ac.health < ac.maxHealth * 0.3;

    if (this.evadeT > 0) this.evadeT -= dt;
    if (this.evadeT <= 0 && (tailed || (hurt && Math.random() < 0.02))) {
      this.evadeT = 1.4;
      this.evadeDir = Math.random() < 0.5 ? -1 : 1;
      this.state = 'evade';
    }
    if (this.evadeT <= 0) this.state = 'engage';

    // Height above the terrain/tree tops beneath us — used to pull up before crashing.
    const clearance = ac.position.y - obstacleTop(ac.position.x, ac.position.z);

    // --- EVADE: hard climbing break turn ---
    if (this.state === 'evade') {
      let pitch = 0.65;
      if (clearance < 45) pitch = 0.9; // don't break into the ground
      return { pitch, roll: this.evadeDir, yaw: this.evadeDir * 0.3, throttle: 1, fire: false };
    }

    // --- ENGAGE: steer to the aim point ---
    let roll = clamp(yawErr * d.steerRoll, -1, 1);
    let yaw = clamp(yawErr * 0.4, -1, 1);
    let pitch = clamp(pitchErr * d.steerPitch, -1, 1);

    // Ground avoidance overrides a downward chase (pull up when close to terrain/trees).
    if (clearance < 40) pitch = Math.max(pitch, 0.6);

    // Throttle: close fast, ease off when near to avoid overshooting.
    const throttle = dist > 45 ? 1 : dist < 18 ? -1 : 0;

    // Fire when the target sits in a tight forward cone and roughly boresight.
    const inCone = this._local.z > d.fireCone;
    const aligned = Math.abs(yawErr) < d.fireAngle && Math.abs(pitchErr) < d.fireAngle;
    const fire = this.age > this.holdFire && inCone && aligned && dist < 95 && Math.random() < d.aggression;

    return { pitch, roll, yaw, throttle, fire };
  }
}
