import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeToonMaterial, makeToonMesh, weldedSmoothGeometry, makeOutlineMaterial } from '../core/toon.js';

/**
 * Parametric cel-shaded aircraft builder, optimised for draw calls. Each plane's static
 * parts are collected then MERGED — one visible mesh per material, one merged outline shell
 * (per-vertex thickness), and merged marking meshes — so a plane is ~a dozen draw calls
 * instead of ~fifty. The merged geometry + materials are cached per plane type, so the
 * three AI enemies reuse the player's build. The propeller stays separate (it spins).
 *
 * Convention: nose = local +Z, up = +Y, wings span X (matches game/aircraft.js).
 */

// A box with softly rounded corners; radius clamped to 40% of the smallest side so thin
// parts never break (see the earlier toy-aesthetic pass).
function roundedBox(w, h, d, { max = 0.12, segments = 3 } = {}) {
  const radius = Math.min(max, Math.min(w, h, d) * 0.4);
  return new RoundedBoxGeometry(w, h, d, segments, radius);
}

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3(1, 1, 1);
function composeMatrix(pos, rot) {
  _pos.set(pos[0], pos[1], pos[2]);
  if (rot) _quat.setFromEuler(_euler.set(rot[0], rot[1], rot[2]));
  else _quat.identity();
  return new THREE.Matrix4().compose(_pos, _quat, _scl);
}

const typeCache = new Map(); // def.id → merged geometry set
const matCache = new Map(); // def.id → materials

/**
 * @param {object} def  an entry from AIRCRAFT
 * @returns {{ group: THREE.Group, propeller: THREE.Mesh }}
 */
export function buildAircraftModel(def) {
  const built = getBuilt(def);
  const mats = getMaterials(def);
  const group = new THREE.Group();
  group.name = def.id;

  for (const [key, geo] of built.matGeos) group.add(new THREE.Mesh(geo, mats[key]));
  if (built.outlineGeo) group.add(new THREE.Mesh(built.outlineGeo, makeOutlineMaterial()));
  const MM = getMarkMats();
  for (const [color, geo] of built.markGeos) group.add(new THREE.Mesh(geo, MM[color]));

  // Propeller — its own mesh (spins), sharing the cached geometry.
  const propeller = makeToonMesh(built.propGeo, { material: mats.metal, outline: { thickness: 0.02 } });
  propeller.position.copy(built.propPos);
  group.add(propeller);

  // Cast shadows from the solid cel meshes; skip the inverted-hull outline shells (BackSide),
  // whose flipped faces would throw an inside-out shadow. (No-op unless a shadow light exists.)
  group.traverse((o) => { if (o.isMesh && o.material.side !== THREE.BackSide) o.castShadow = true; });

  return { group, propeller };
}

// --- Materials (cached per plane type) ---------------------------------------
function getMaterials(def) {
  if (matCache.has(def.id)) return matCache.get(def.id);
  const l = def.livery;
  const mats = {
    body: makeToonMaterial({ color: l.body }),
    wing: makeToonMaterial({ color: l.wing }),
    metal: makeToonMaterial({ color: l.metal }),
    accent: makeToonMaterial({ color: l.accent }),
    glass: makeToonMaterial({ color: 0x1d2733 }),
    skin: makeToonMaterial({ color: 0xe8b78a }),
    spinner: makeToonMaterial({ color: l.spinner ?? l.metal }),
  };
  matCache.set(def.id, mats);
  return mats;
}

// --- Geometry assembly + merge (cached per plane type) -----------------------
function getBuilt(def) {
  if (typeCache.has(def.id)) return typeCache.get(def.id);
  const mdl = def.model;
  const L = mdl.fuselage.length;
  const W = mdl.fuselage.width;
  const H = mdl.fuselage.height;
  const noseZ = L / 2;
  const tailZ = -L / 2;

  const parts = []; // { geo, matKey, thickness, matrix }
  const markParts = []; // { geo, color, matrix }
  const rec = (geo, matKey, pos, { rot, thickness = 0.045 } = {}) =>
    parts.push({ geo, matKey, thickness, matrix: composeMatrix(pos, rot) });

  // Fuselage
  if (mdl.fuselage.style === 'round') {
    rec(new THREE.CylinderGeometry(H * 0.42, H * 0.52, L, 16), 'body', [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  } else {
    const boxy = mdl.fuselage.style === 'boxy' ? 1.08 : 1;
    rec(roundedBox(W * boxy, H * boxy, L, { segments: 4 }), 'body', [0, 0, 0]);
  }

  // Nose + propeller position
  let propZ = noseZ + 0.16;
  if (mdl.nose.style === 'radiator') {
    rec(roundedBox(W * 1.05, H * 1.05, 0.18), 'metal', [0, 0, noseZ + 0.02]);
  } else if (mdl.nose.style === 'spinner') {
    rec(new THREE.ConeGeometry(H * 0.5, 0.5, 16), 'spinner', [0, 0, noseZ + 0.22], { rot: [Math.PI / 2, 0, 0] });
    propZ = noseZ + 0.02;
  } else {
    rec(new THREE.CylinderGeometry(H * 0.52, H * 0.52, 0.28, 16), 'metal', [0, 0, noseZ + 0.02], { rot: [Math.PI / 2, 0, 0] });
  }
  const propGeo = roundedBox(0.09, H * 2.7, 0.06);
  const propPos = new THREE.Vector3(0, 0, propZ);

  // Wings
  const wingZ = 0.12;
  for (const w of mdl.wings) rec(roundedBox(w.span, w.thickness ?? 0.09, w.chord), 'wing', [0, w.y, wingZ]);

  // Interplane struts
  for (let i = 0; i < mdl.wings.length - 1; i++) {
    const a = mdl.wings[i];
    const b = mdl.wings[i + 1];
    const midY = (a.y + b.y) / 2;
    const gap = Math.abs(a.y - b.y);
    const x = Math.min(a.span, b.span) * 0.3;
    const lean = mdl.strut === 'V' ? 0.18 : 0;
    rec(roundedBox(0.06, gap, 0.06), 'metal', [x, midY, wingZ], { rot: [0, 0, lean], thickness: 0.015 });
    rec(roundedBox(0.06, gap, 0.06), 'metal', [-x, midY, wingZ], { rot: [0, 0, -lean], thickness: 0.015 });
    if (mdl.strut === 'N') {
      rec(roundedBox(0.05, gap, 0.05), 'metal', [x * 0.4, midY, wingZ], { thickness: 0.012 });
      rec(roundedBox(0.05, gap, 0.05), 'metal', [-x * 0.4, midY, wingZ], { thickness: 0.012 });
    }
  }

  // Hump (Camel)
  if (mdl.hump) rec(roundedBox(W * 0.7, 0.26, 0.5), 'metal', [0, H * 0.5 + 0.06, 0.42], { thickness: 0.02 });

  // Cockpit + pilot
  rec(roundedBox(W * 0.62, 0.24, 0.42), 'glass', [0, H * 0.5 + 0.02, -0.22], { thickness: 0.02 });
  rec(new THREE.SphereGeometry(0.12, 14, 10), 'skin', [0, H * 0.5 + 0.14, -0.2], { thickness: 0.02 });

  // Tail
  rec(roundedBox(1.25, 0.08, 0.5), 'wing', [0, 0.05, tailZ + 0.12]);
  rec(roundedBox(0.08, 0.5, 0.5), 'accent', [0, 0.26, tailZ + 0.05]);

  // Landing gear (hung from the lowest wing's underside so it never pierces the top)
  if (mdl.gear) {
    const lowestBottom = Math.min(-H * 0.5, ...mdl.wings.map((w) => w.y - (w.thickness ?? 0.09) / 2));
    const strutLen = 0.4;
    const strutTop = lowestBottom + 0.02;
    const strutY = strutTop - strutLen / 2;
    const wheelY = strutTop - strutLen;
    const gx = W * 0.8;
    rec(roundedBox(0.05, strutLen, 0.05), 'metal', [gx, strutY, 0.3], { thickness: 0.012 });
    rec(roundedBox(0.05, strutLen, 0.05), 'metal', [-gx, strutY, 0.3], { thickness: 0.012 });
    rec(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 14), 'metal', [gx, wheelY, 0.3], { rot: [0, 0, Math.PI / 2], thickness: 0.02 });
    rec(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 14), 'metal', [-gx, wheelY, 0.3], { rot: [0, 0, Math.PI / 2], thickness: 0.02 });
  }

  // National markings
  collectMarkings(def, W, markParts);

  // --- Merge everything ---
  // Primitives differ in indexing (RoundedBox is non-indexed, cylinders/cones/spheres are
  // indexed), so normalise to non-indexed before merging or mergeGeometries rejects the mix.
  const nonIndexed = (g) => (g.index ? g.toNonIndexed() : g);

  const matGeos = mergeByKey(parts, 'matKey', (p) => {
    let g = p.geo.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    g = nonIndexed(g);
    g.applyMatrix4(p.matrix);
    return g;
  });

  const outlineParts = parts.map((p) => {
    let g = nonIndexed(weldedSmoothGeometry(p.geo).clone());
    const th = new Float32Array(g.attributes.position.count).fill(p.thickness);
    g.setAttribute('aThickness', new THREE.BufferAttribute(th, 1));
    g.applyMatrix4(p.matrix);
    return g;
  });
  const outlineGeo = outlineParts.length ? mergeGeometries(outlineParts, false) : null;

  const markGeos = mergeByKey(markParts, 'color', (m) => {
    let g = m.geo.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    g = nonIndexed(g);
    g.applyMatrix4(m.matrix);
    return g;
  });

  const built = { matGeos, outlineGeo, markGeos, propGeo, propPos };
  typeCache.set(def.id, built);
  return built;
}

/** Group items by `key`, transform each geometry with `bake`, and merge each group. */
function mergeByKey(items, key, bake) {
  const groups = new Map();
  for (const it of items) {
    const k = it[key];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(bake(it));
  }
  const merged = new Map();
  for (const [k, arr] of groups) merged.set(k, mergeGeometries(arr, false));
  return merged;
}

// --- Markings ----------------------------------------------------------------
let markMats = null;
function getMarkMats() {
  if (markMats) return markMats;
  markMats = {
    red: makeToonMaterial({ color: 0xcf2f2a }),
    white: makeToonMaterial({ color: 0xf2f2ee }),
    blue: makeToonMaterial({ color: 0x2f5fd0 }),
    black: makeToonMaterial({ color: 0x161616 }),
  };
  return markMats;
}

function collectMarkings(def, W, out) {
  const topWing = def.model.wings[0];
  const wy = topWing.y + 0.06;
  const spanX = topWing.span * 0.3;

  const disk = (r, color, pos, axis) => {
    const g = new THREE.CylinderGeometry(r, r, 0.03, 18);
    out.push({ geo: g, color, matrix: composeMatrix(pos, axis === 'x' ? [0, 0, Math.PI / 2] : null) });
  };
  const roundel = (pos, axis, r, centre, mid, rim) => {
    const push = axis === 'x' ? 0.008 : -0.008;
    const p0 = [...pos];
    const off = (i) => (axis === 'x' ? [p0[0] + i * push, p0[1], p0[2]] : [p0[0], p0[1], p0[2] + i * push]);
    disk(r, rim, off(0), axis);
    disk(r * 0.62, mid, off(1), axis);
    disk(r * 0.3, centre, off(2), axis);
  };
  const cross = (pos, axis, s) => {
    const t = s * 0.34;
    const g1 = axis === 'y' ? new THREE.BoxGeometry(s, 0.04, t) : new THREE.BoxGeometry(0.04, s, t);
    const g2 = axis === 'y' ? new THREE.BoxGeometry(t, 0.04, s) : new THREE.BoxGeometry(0.04, t, s);
    out.push({ geo: g1, color: 'black', matrix: composeMatrix(pos, null) });
    out.push({ geo: g2, color: 'black', matrix: composeMatrix(pos, null) });
  };
  const place = (pos, axis, size) => {
    if (def.marking === 'roundel-british') roundel(pos, axis, size, 'red', 'white', 'blue');
    else if (def.marking === 'roundel-french') roundel(pos, axis, size, 'blue', 'white', 'red');
    else cross(pos, axis, size * 1.7);
  };

  place([spanX, wy, 0.1], 'y', 0.22);
  place([-spanX, wy, 0.1], 'y', 0.22);
  place([W * 0.55, 0.02, -0.5], 'x', 0.2);
  place([-W * 0.55, 0.02, -0.5], 'x', 0.2);
}
