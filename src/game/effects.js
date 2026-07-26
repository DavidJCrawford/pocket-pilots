import * as THREE from 'three';

/**
 * Soft particle effects built from camera-facing billboard sprites with a procedurally
 * drawn cloudy alpha texture, so they read as real smoke and fire rather than solid polygons:
 *  - Damage smoke trail — dark, drifting, fading puffs.
 *  - Death explosion — a bright additive fireball flash, glowing fire bursting outward, fast
 *    sparks, and a lingering smoke cloud.
 *  - Muzzle flash — a tiny bright pop.
 *
 * Two fixed-blend sprite pools (additive "fire", normal "smoke") so per-particle blending
 * never forces a shader recompile.
 */

const SMOKE_POOL = 72;
const FIRE_POOL = 64;

/** A soft, cloudy circular alpha texture drawn on a canvas (no image asset needed). */
function makeSoftTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const soft = (x, y, r, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  soft(size / 2, size / 2, size / 2, 0.9);
  for (let i = 0; i < 10; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.45;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.45;
    soft(x, y, size * 0.16 * (0.7 + Math.random()), 0.4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePool(scene, tex, count, blending) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    scene.add(sprite);
    arr.push({ sprite, life: 0, maxLife: 1, vel: new THREE.Vector3(), drag: 0.95, size0: 1, size1: 2, op0: 0.6, fadeIn: 0.12, spin: 0 });
  }
  return arr;
}

const _dir = new THREE.Vector3();
function randomDir(speed) {
  _dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  if (_dir.lengthSq() < 1e-4) _dir.set(0, 1, 0);
  return _dir.normalize().multiplyScalar(speed);
}

export class Effects {
  constructor(scene) {
    this.tex = makeSoftTexture();
    this.smokes = makePool(scene, this.tex, SMOKE_POOL, THREE.NormalBlending);
    this.fires = makePool(scene, this.tex, FIRE_POOL, THREE.AdditiveBlending);
    this._smokeI = 0;
    this._fireI = 0;
  }

  #emit(pool, cursor, cfg) {
    const n = pool.length;
    let idx = this[cursor];
    for (let k = 0; k < n; k++) {
      const i = (this[cursor] + k) % n;
      if (pool[i].life <= 0) { idx = i; break; }
    }
    this[cursor] = (idx + 1) % n;
    const p = pool[idx];
    p.sprite.position.copy(cfg.pos);
    p.vel.copy(cfg.vel);
    p.drag = cfg.drag ?? 0.94;
    p.size0 = cfg.size0;
    p.size1 = cfg.size1;
    p.op0 = cfg.op0;
    p.fadeIn = cfg.fadeIn ?? 0.12;
    p.spin = cfg.spin ?? 0;
    p.maxLife = p.life = cfg.life;
    p.sprite.material.color.set(cfg.color);
    p.sprite.material.rotation = Math.random() * Math.PI * 2;
    p.sprite.material.opacity = 0;
    p.sprite.scale.setScalar(cfg.size0);
    p.sprite.visible = true;
  }

  /** A single soft smoke puff (call repeatedly for a damage trail). */
  smoke(pos) {
    const g = 0.12 + Math.random() * 0.16;
    this.#emit(this.smokes, '_smokeI', {
      pos,
      vel: new THREE.Vector3((Math.random() - 0.5) * 1.6, 2.4 + Math.random() * 1.8, (Math.random() - 0.5) * 1.6),
      size0: 0.7 + Math.random() * 0.5,
      size1: 3.0 + Math.random() * 1.8,
      op0: 0.55 + Math.random() * 0.2,
      life: 1.3 + Math.random() * 0.8,
      color: new THREE.Color(g, g, g),
      drag: 0.95,
      spin: (Math.random() - 0.5) * 1.2,
    });
  }

  /** A quick bright muzzle flash at a gun. */
  muzzle(pos) {
    this.#emit(this.fires, '_fireI', {
      pos, vel: new THREE.Vector3(), size0: 0.4, size1: 1.0, op0: 0.9, life: 0.08, fadeIn: 0.03, color: 0xffe28a, drag: 0.9,
    });
  }

  /** A real-looking explosion: fireball flash, bursting fire, sparks, and a smoke cloud. */
  explode(pos) {
    const FIRE = [0xffd060, 0xff8a2e, 0xff5a20];
    // Bright central flash.
    this.#emit(this.fires, '_fireI', { pos, vel: new THREE.Vector3(), size0: 2.5, size1: 7, op0: 0.95, life: 0.16, fadeIn: 0.04, color: 0xfff0c0, drag: 0.9 });
    // Fireballs bursting outward.
    for (let i = 0; i < 12; i++) {
      this.#emit(this.fires, '_fireI', {
        pos, vel: randomDir(4 + Math.random() * 9).clone(),
        size0: 1 + Math.random() * 1.2, size1: 3.5 + Math.random() * 2.5, op0: 0.85, life: 0.35 + Math.random() * 0.35, fadeIn: 0.06,
        color: FIRE[(Math.random() * FIRE.length) | 0], drag: 0.85, spin: (Math.random() - 0.5) * 2,
      });
    }
    // Fast sparks / embers.
    for (let i = 0; i < 10; i++) {
      this.#emit(this.fires, '_fireI', {
        pos, vel: randomDir(12 + Math.random() * 16).clone(),
        size0: 0.5, size1: 0.15, op0: 1, life: 0.3 + Math.random() * 0.35, fadeIn: 0.02, color: 0xffd870, drag: 0.9,
      });
    }
    // Lingering smoke cloud (bursts out, then rises and fades).
    for (let i = 0; i < 14; i++) {
      const g = 0.1 + Math.random() * 0.14;
      const v = randomDir(3 + Math.random() * 6).clone();
      v.y += 1.5 + Math.random() * 1.5;
      this.#emit(this.smokes, '_smokeI', {
        pos, vel: v, size0: 1.4 + Math.random() * 1.2, size1: 5 + Math.random() * 3.5, op0: 0.6 + Math.random() * 0.2,
        life: 1.4 + Math.random() * 1.3, color: new THREE.Color(g, g, g), drag: 0.9, spin: (Math.random() - 0.5) * 1.4,
      });
    }
  }

  /** Hide every active particle (call when (re)starting a round). */
  clear() {
    for (const p of this.smokes) { p.life = 0; p.sprite.visible = false; }
    for (const p of this.fires) { p.life = 0; p.sprite.visible = false; }
  }

  update(dt) {
    this.#step(this.smokes, dt);
    this.#step(this.fires, dt);
  }

  #step(pool, dt) {
    for (const p of pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.sprite.visible = false; continue; }
      p.sprite.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(p.drag);
      const t = 1 - p.life / p.maxLife; // 0→1
      p.sprite.scale.setScalar(p.size0 + (p.size1 - p.size0) * t);
      p.sprite.material.opacity = p.op0 * Math.min(1, t / p.fadeIn) * (1 - t);
      p.sprite.material.rotation += p.spin * dt;
    }
  }
}
