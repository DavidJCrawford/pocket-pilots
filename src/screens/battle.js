import * as THREE from 'three';
import { createWorld, PALETTE } from '../core/scene.js';
import { Input } from '../core/input.js';
import { buildAircraftModel } from '../game/plane-model.js';
import { buildTerrain, obstacleTop } from '../game/terrain.js';
import { Aircraft } from '../game/aircraft.js';
import { Bullets } from '../game/bullets.js';
import { Effects } from '../game/effects.js';
import { PilotAI } from '../game/ai.js';
import { AIRCRAFT, AIRCRAFT_ORDER } from '../data/aircraft.js';
import { opposingSide } from '../data/factions.js';

/**
 * The dogfight screen. enter({planeId}) sets up the player's chosen fighter and a wave of
 * opposing-faction AI pilots; win/lose shows a Result overlay. Grounded in the flight-model
 * and combat concepts under knowledge/pocket-pilots/flight-model/.
 */

const SPAWN = new THREE.Vector3(0, 220, 0);
const ENEMY_COUNT = 3;
const FORWARD_Z = new THREE.Vector3(0, 0, 1);

const CAM_OFFSET = new THREE.Vector3(0, 3.2, -9);
const CAM_LAMBDA = 7;

export function createBattleScreen(ctx) {
  const { scene, camera, sky, shadowLight } = createWorld();
  scene.fog = new THREE.Fog(PALETTE.skyHorizon, 1500, 4600); // fade scenery into the sky-horizon colour
  buildWorld(scene);
  const input = new Input();
  const bullets = new Bullets(scene);
  const effects = new Effects(scene);

  const dom = document.getElementById('screen-battle');
  const hud = {
    name: document.getElementById('hud-name'),
    thr: document.getElementById('hud-thr'),
    spd: document.getElementById('hud-spd'),
    alt: document.getElementById('hud-alt'),
    pipBox: document.getElementById('enemy-pips'),
    pips: [],
    heatFill: document.getElementById('heat-fill'),
    hitmarker: document.getElementById('hitmarker'),
    result: document.getElementById('result'),
    resultText: document.getElementById('result-text'),
  };

  /** (Re)build one roundel pip per enemy in the top-centre kill tally. */
  function buildPips(count) {
    hud.pipBox.replaceChildren();
    hud.pips = [];
    for (let i = 0; i < count; i++) {
      const pip = document.createElement('i');
      pip.className = 'pip';
      hud.pipBox.appendChild(pip);
      hud.pips.push(pip);
    }
  }

  const state = { player: null, model: null, propeller: null, enemies: [], over: null };
  let lastPlaneId = AIRCRAFT_ORDER[0];
  let hitmarkerT = 0;

  const desiredCam = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const tmpFwd = new THREE.Vector3();
  const smokePos = new THREE.Vector3();

  // --- Setup helpers ---

  function buildPlayer(planeId) {
    if (state.model) disposeModel(scene, state.model);
    const def = AIRCRAFT[planeId];
    const { group, propeller } = buildAircraftModel(def);
    scene.add(group);
    state.model = group;
    state.propeller = propeller;
    state.player = new Aircraft(group, def, { position: SPAWN.clone(), throttle: 0.7 });
    state.player.syncRender(1);
    hud.name.textContent = def.name;
    dom.dataset.side = def.side; // tints the whole HUD to the player's faction
  }

  function spawnEnemies() {
    for (const e of state.enemies) disposeModel(scene, e.object);
    state.enemies = [];
    const side = opposingSide(state.player.side);
    const ids = AIRCRAFT_ORDER.filter((id) => AIRCRAFT[id].side === side);
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const def = AIRCRAFT[ids[i % ids.length]];
      const { group } = buildAircraftModel(def);
      scene.add(group);
      const theta = (i - (ENEMY_COUNT - 1) / 2) * 0.6;
      const R = 175;
      const pos = new THREE.Vector3(
        SPAWN.x + Math.sin(theta) * R,
        SPAWN.y + (i - 1) * 12,
        SPAWN.z + Math.cos(theta) * R,
      );
      const enemy = new Aircraft(group, def, { position: pos, throttle: 0.75 });
      enemy.quaternion.setFromUnitVectors(FORWARD_Z, SPAWN.clone().sub(pos).normalize());
      enemy.prevQuaternion.copy(enemy.quaternion);
      enemy.ai = new PilotAI(enemy, { difficulty: 'normal', seed: i });
      enemy.syncRender(1);
      state.enemies.push(enemy);
    }
    buildPips(state.enemies.length);
  }

  function snapCamera() {
    desiredCam.copy(CAM_OFFSET).applyQuaternion(state.model.quaternion).add(state.model.position);
    camera.position.copy(desiredCam);
  }

  let shake = 0;
  const addShake = (a) => { shake = Math.min(0.7, shake + a); };

  function updateCamera(frameDelta) {
    desiredCam.copy(CAM_OFFSET).applyQuaternion(state.model.quaternion).add(state.model.position);
    camera.position.lerp(desiredCam, 1 - Math.exp(-CAM_LAMBDA * frameDelta));
    state.player.forward(tmpFwd);
    lookTarget.copy(state.model.position).addScaledVector(tmpFwd, 6);
    lookTarget.y += 0.5;
    camera.lookAt(lookTarget);

    // Subtle speed-scaled FOV for a sense of pace.
    const targetFov = 54 + Math.min(1, state.player.speed / 50) * 10;
    camera.fov += (targetFov - camera.fov) * Math.min(1, 4 * frameDelta);
    camera.updateProjectionMatrix();

    // Camera shake (decays), applied as small rotations after lookAt.
    if (shake > 0.001) {
      camera.rotateZ((Math.random() - 0.5) * shake * 0.16);
      camera.rotateX((Math.random() - 0.5) * shake * 0.1);
      camera.rotateY((Math.random() - 0.5) * shake * 0.1);
      shake *= Math.exp(-9 * frameDelta);
    } else {
      shake = 0;
    }
  }

  // 1 at the player, fading to 0 by ~120 units away — for SFX volume + shake strength.
  const nearness = (pos) => Math.max(0, 1 - state.player.position.distanceTo(pos) / 120);

  // Blow a plane up exactly once (bullet kill or crash).
  function destroy(plane) {
    if (plane.exploded) return;
    plane.exploded = true;
    plane.dead = true;
    plane.object.visible = false;
    effects.explode(plane.position);
    const n = nearness(plane.position);
    ctx.audio.explosion(0.5 + 0.5 * n);
    addShake(0.5 * n);
  }

  // Ground / tree / plane-plane collisions → destroy any plane involved.
  function checkCollisions() {
    const all = [state.player, ...state.enemies];
    for (const p of all) {
      if (p.dead) continue;
      if (p.position.y < obstacleTop(p.position.x, p.position.z) + p.collisionRadius) destroy(p);
    }
    for (let a = 0; a < all.length; a++) {
      if (all[a].dead) continue;
      for (let b = a + 1; b < all.length; b++) {
        if (all[b].dead) continue;
        if (all[a].position.distanceTo(all[b].position) < all[a].collisionRadius + all[b].collisionRadius) {
          destroy(all[a]);
          destroy(all[b]);
        }
      }
    }
  }

  function trailSmokeIfHurt(plane, dt) {
    if (plane.dead || plane.health > plane.maxHealth * 0.45) return;
    plane.smokeTimer -= dt;
    if (plane.smokeTimer <= 0) {
      plane.smokeTimer = 0.05;
      plane.forward(tmpFwd);
      smokePos.copy(plane.position).addScaledVector(tmpFwd, -0.6);
      effects.smoke(smokePos);
    }
  }

  function updateHUD(frameDelta) {
    const t = state.player.telemetry();
    hud.thr.textContent = Math.round(t.throttle * 100);
    hud.spd.textContent = Math.round(t.speed * 6);
    hud.alt.textContent = Math.round(t.altitude);
    for (let i = 0; i < hud.pips.length; i++) {
      hud.pips[i].classList.toggle('down', !!state.enemies[i]?.dead);
    }
    hud.heatFill.style.width = `${Math.round(state.player.heat * 100)}%`;
    hud.heatFill.classList.toggle('hot', state.player.overheated);
    if (hitmarkerT > 0) {
      hitmarkerT -= frameDelta;
      hud.hitmarker.style.opacity = hitmarkerT > 0 ? '1' : '0';
    }
  }

  function showResult(win) {
    hud.resultText.textContent = win ? 'Sector Cleared' : 'Shot Down';
    hud.resultText.classList.toggle('lose', !win);
    hud.result.style.display = 'flex';
    ctx.audio.stopEngine(); // the round is over — cut the engine drone under the result plaque
  }

  // --- Result buttons ---
  const onRefly = () => ctx.go('battle', { planeId: lastPlaneId });
  const onChange = () => ctx.go('select');
  const onTitle = () => ctx.go('title');
  const onKey = (e) => { if (e.code === 'KeyR' && state.over) onRefly(); };

  return {
    enter(payload) {
      lastPlaneId = payload?.planeId ?? lastPlaneId;
      dom.style.display = 'block';
      hud.result.style.display = 'none';
      bullets.clear();
      effects.clear();
      state.over = null;
      hitmarkerT = 0;
      shake = 0;
      buildPlayer(lastPlaneId);
      spawnEnemies();
      snapCamera();
      ctx.audio.startEngine();
      document.getElementById('result-refly').addEventListener('click', onRefly);
      document.getElementById('result-change').addEventListener('click', onChange);
      document.getElementById('result-title').addEventListener('click', onTitle);
      window.addEventListener('keydown', onKey);
    },

    exit() {
      dom.style.display = 'none';
      ctx.audio.stopEngine();
      document.getElementById('result-refly').removeEventListener('click', onRefly);
      document.getElementById('result-change').removeEventListener('click', onChange);
      document.getElementById('result-title').removeEventListener('click', onTitle);
      window.removeEventListener('keydown', onKey);
    },

    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    update(dt) {
      const c = input.readControls();
      if (!state.player.dead) {
        state.player.update(dt, c);
        if (state.player.tryFire(dt, c.fire, bullets)) {
          ctx.audio.gun();
          state.player.forward(tmpFwd);
          effects.muzzle(smokePos.copy(state.player.position).addScaledVector(tmpFwd, state.player.def.model.fuselage.length / 2 + 0.4));
        }
      }
      ctx.audio.setEngine(state.player.throttle);

      for (const e of state.enemies) {
        if (e.dead) continue;
        const ec = e.ai.think(dt, state.player);
        e.update(dt, ec);
        if (e.tryFire(dt, ec.fire && !state.player.dead, bullets)) ctx.audio.gun(0.5 * nearness(e.position));
      }

      const hits = bullets.update(dt, [state.player, ...state.enemies]);
      for (const h of hits) {
        if (h.target.side !== state.player.side) hitmarkerT = 0.12;
        if (h.target === state.player) { ctx.audio.hit(); addShake(0.14); }
        if (h.killed) destroy(h.target);
      }

      checkCollisions(); // ground, trees, and mid-air collisions

      trailSmokeIfHurt(state.player, dt);
      for (const e of state.enemies) trailSmokeIfHurt(e, dt);

      if (!state.over) {
        if (state.player.dead) { state.over = 'lose'; showResult(false); }
        else if (state.enemies.every((e) => e.dead)) { state.over = 'win'; showResult(true); }
      }
    },

    render(alpha, frameDelta) {
      state.player.syncRender(alpha);
      for (const e of state.enemies) e.syncRender(alpha);
      state.propeller.rotation.z += frameDelta * (8 + state.player.throttle * 26);
      effects.update(frameDelta);
      updateCamera(frameDelta);
      sky.position.copy(camera.position); // sky follows; terrain is static world scenery
      if (shadowLight) {
        // Keep the shadow frustum directly over the player so the midday shadow stays crisp.
        const p = state.model.position;
        shadowLight.position.set(p.x, 600, p.z);
        shadowLight.target.position.set(p.x, 0, p.z);
        shadowLight.target.updateMatrixWorld();
      }
      updateHUD(frameDelta);
      ctx.renderer.render(scene, camera);
    },
  };
}

function disposeModel(scene, model) {
  scene.remove(model);
  model.traverse((o) => o.geometry?.dispose?.());
}

/** A soft, billowy white cloud alpha texture drawn on a canvas (no image asset needed). */
function makeCloudTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const blob = (x, y, r, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(size / 2, size / 2, size * 0.5, 0.55);
  for (let i = 0; i < 16; i++) { // billowy lumps
    const x = size / 2 + (Math.random() - 0.5) * size * 0.55;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.45;
    blob(x, y, size * 0.18 * (0.6 + Math.random()), 0.35);
  }
  // Force every texel's RGB to solid white, keeping only the soft alpha we drew. Transparent
  // canvas texels are (0,0,0,0), and some GPUs surface that undefined colour as rainbow
  // speckles when the sprite is magnified up close — a uniformly white RGB channel makes the
  // cloud read as pure white/grey everywhere, whatever the driver does with near-zero alpha.
  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildWorld(scene) {
  scene.add(buildTerrain()); // rolling fields, winding river, pine forests

  // Clouds: clusters of soft, semi-transparent camera-facing sprites → wispy, see-through
  // clouds (off-screen sprites are frustum-culled, so they cost no draw calls).
  const cloudTex = makeCloudTexture();
  const cloudMats = [0.3, 0.45, 0.6].map((opacity) => new THREE.SpriteMaterial({
    map: cloudTex, transparent: true, depthWrite: false, opacity, color: 0xffffff,
  }));
  const clouds = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const cx = (Math.random() - 0.5) * 1900;
    const cy = 45 + Math.random() * 170;
    const cz = (Math.random() - 0.5) * 1900;
    const puffs = 3 + Math.floor(Math.random() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = 22 + Math.random() * 28;
      const sprite = new THREE.Sprite(cloudMats[(Math.random() * cloudMats.length) | 0]);
      sprite.position.set(
        cx + (Math.random() - 0.5) * s * 1.5,
        cy + (Math.random() - 0.5) * s * 0.35,
        cz + (Math.random() - 0.5) * s * 1.5,
      );
      sprite.scale.setScalar(s);
      clouds.add(sprite);
    }
  }
  scene.add(clouds);
}
