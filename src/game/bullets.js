import * as THREE from 'three';

/**
 * Pooled tracer bullets rendered as a single InstancedMesh (many bullets, one draw call —
 * see knowledge/pocket-pilots/tech-stack/threejs-rendering.md). Bullets are team-tagged so
 * they only damage the opposing side. Hit detection is bullet-vs-bounding-sphere.
 */

const UNIT_Z = new THREE.Vector3(0, 0, 1);
const TRACER_LEN = 2.6;
const TRACER_W = 0.09;
const LIFETIME = 1.1; // seconds → ~180u range at muzzle speed

const TEAM_COLORS = {
  allied: new THREE.Color(0xfff2a0), // warm yellow tracers
  central: new THREE.Color(0xff8038), // orange tracers
};

export class Bullets {
  constructor(scene, capacity = 256) {
    this.capacity = capacity;
    const geo = new THREE.BoxGeometry(TRACER_W, TRACER_W, TRACER_LEN);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false }); // bright, unlit tracers
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);

    // Per-bullet state (parallel arrays).
    this.active = new Array(capacity).fill(false);
    this.pos = Array.from({ length: capacity }, () => new THREE.Vector3());
    this.vel = Array.from({ length: capacity }, () => new THREE.Vector3());
    this.life = new Float32Array(capacity);
    this.team = new Array(capacity).fill('allied');
    this.damage = new Float32Array(capacity);

    // Allocate instanceColor and hide all instances.
    this._dummy = new THREE.Object3D();
    const c = new THREE.Color(0xffffff);
    for (let i = 0; i < capacity; i++) {
      this.mesh.setColorAt(i, c);
      this.#hide(i);
    }
    this.mesh.count = capacity;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;

    this._q = new THREE.Quaternion();
    this._next = 0;
  }

  /** Deactivate and hide every bullet (call when (re)starting a round). */
  clear() {
    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) continue;
      this.active[i] = false;
      this.#hide(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  spawn(position, velocity, team, damage) {
    // Find a free slot (linear probe from a rotating cursor).
    let idx = -1;
    for (let n = 0; n < this.capacity; n++) {
      const i = (this._next + n) % this.capacity;
      if (!this.active[i]) { idx = i; break; }
    }
    if (idx === -1) return; // pool full — drop the shot
    this._next = (idx + 1) % this.capacity;

    this.active[idx] = true;
    this.pos[idx].copy(position);
    this.vel[idx].copy(velocity);
    this.life[idx] = LIFETIME;
    this.team[idx] = team;
    this.damage[idx] = damage;
    this.mesh.setColorAt(idx, TEAM_COLORS[team] ?? TEAM_COLORS.allied);
    this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Advance bullets and resolve hits against `combatants`.
   * @returns {Array<{position:THREE.Vector3, target:object, killed:boolean}>}
   */
  update(dt, combatants) {
    const hits = [];
    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) continue;

      this.pos[i].addScaledVector(this.vel[i], dt);
      this.life[i] -= dt;

      // Collision vs opposing-team combatants.
      let consumed = false;
      for (const c of combatants) {
        if (c.dead || c.side === this.team[i]) continue;
        if (this.pos[i].distanceToSquared(c.position) <= c.collisionRadius * c.collisionRadius) {
          const killed = c.takeDamage(this.damage[i]);
          hits.push({ position: this.pos[i].clone(), target: c, killed });
          consumed = true;
          break;
        }
      }

      if (consumed || this.life[i] <= 0) {
        this.active[i] = false;
        this.#hide(i);
        continue;
      }
      this.#place(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return hits;
  }

  /** Orient a tracer along its velocity and write its instance matrix. */
  #place(i) {
    this._q.setFromUnitVectors(UNIT_Z, this.vel[i].clone().normalize());
    this._dummy.position.copy(this.pos[i]);
    this._dummy.quaternion.copy(this._q);
    this._dummy.scale.set(1, 1, 1);
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this._dummy.matrix);
  }

  #hide(i) {
    this._dummy.position.set(0, 0, 0);
    this._dummy.quaternion.identity();
    this._dummy.scale.set(0, 0, 0);
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this._dummy.matrix);
  }
}
