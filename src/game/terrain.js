import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getGradientMap, weldedSmoothGeometry, makeOutlineMaterial } from '../core/toon.js';

/**
 * Cliché European scenery: gently rolling terrain with patchwork field colours, a winding
 * river, and cute low-poly cel-shaded pine trees. One static landscape centred on the
 * battle area (the sky and fog fade its edges into the horizon).
 */

// --- Value noise (deterministic, seedless) -----------------------------------
function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x, z) {
  const xi = Math.floor(x); const zi = Math.floor(z);
  const xf = x - xi; const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf); const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi); const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1); const d = hash(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x, z) {
  let f = 0; let amp = 0.5; let freq = 1;
  for (let i = 0; i < 4; i++) { f += amp * noise2(x * freq, z * freq); freq *= 2; amp *= 0.5; }
  return f;
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// --- World shape -------------------------------------------------------------
const SIZE = 8000;
const SEG = 260;
const HILL_AMP = 24;
const HILL_SCALE = 0.0016;
const RIVER_HALF = 90; // half-width of open water
const RIVER_LEVEL = -26; // flat water-surface height
const BANK_SLOPE = 140; // horizontal run the bank rises over (smooth slope)
const BANK_COLOR = 100; // width of the water → sand → field colour blend
const WATER_COL = new THREE.Color(0.3, 0.52, 0.72);
const SAND_COL = new THREE.Color(0.64, 0.6, 0.44);

/** Winding river centreline: x offset as a function of z. */
function riverX(z) {
  return Math.sin(z * 0.00075) * 1000 + Math.sin(z * 0.0022 + 1.5) * 260;
}

/**
 * TRUE distance from (x, z) to the river centreline curve (riverX(t), t), found by sampling
 * the curve near z and taking the nearest point (coarse scan, then a fine refine). Measuring
 * the real perpendicular distance — not the horizontal gap at a fixed z — keeps the water a
 * constant width and the banks running parallel to the flow even where the river swings hard
 * across the map. The old `|x - riverX(z)|` compressed the bank band into a single grid cell
 * on steep bends, which is what made those sections look jagged.
 */
function riverDist(x, z) {
  let best = Infinity;
  let bestT = z;
  for (let t = z - 520; t <= z + 520; t += 20) {
    const dx = x - riverX(t);
    const dz = z - t;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) { best = d2; bestT = t; }
  }
  for (let t = bestT - 20; t <= bestT + 20; t += 2) {
    const dx = x - riverX(t);
    const dz = z - t;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/** Terrain height at world (x, z): rolling hills with a flat river and smoothly sloped banks. */
export function heightAt(x, z) {
  const base = (fbm(x * HILL_SCALE, z * HILL_SCALE) - 0.5) * 2 * HILL_AMP;
  const d = riverDist(x, z);
  if (d < RIVER_HALF) return RIVER_LEVEL; // flat open water
  // Ease the bank smoothly up from the water surface to the surrounding land.
  const s = smoothstep(RIVER_HALF, RIVER_HALF + BANK_SLOPE, d);
  return RIVER_LEVEL + (base - RIVER_LEVEL) * s;
}

// Coarse grid of tree-canopy tops, for cheap collision queries (populated by buildTrees).
const TREE_CELL = 45;
const canopyGrid = new Map();
const cellKey = (x, z) => `${Math.round(x / TREE_CELL)},${Math.round(z / TREE_CELL)}`;

/** Top of the tallest obstacle (terrain or tree canopy) at world (x, z). */
export function obstacleTop(x, z) {
  const ground = heightAt(x, z);
  const canopy = canopyGrid.get(cellKey(x, z));
  return canopy === undefined ? ground : Math.max(ground, canopy);
}

const _field = new THREE.Color();
function fieldColor(x, z, out) {
  const patch = fbm(x * 0.0009 + 5, z * 0.0009 + 5); // broad field patches
  const fine = noise2(x * 0.007, z * 0.007);
  if (patch > 0.72) {
    out.setRGB(0.70, 0.64, 0.40); // ripe/ploughed farmland
  } else if (patch < 0.3) {
    out.setRGB(0.30, 0.47, 0.24); // darker woodland green
  } else {
    out.setRGB(0.36 + patch * 0.28 + fine * 0.05, 0.55 + patch * 0.14 + fine * 0.05, 0.26 + patch * 0.12);
  }
  return out;
}

/** Final ground colour at world (x, z): water → sandy bank → field, blended by river distance. */
function groundColor(x, z, out) {
  const bank = smoothstep(RIVER_HALF - 12, RIVER_HALF + BANK_COLOR, riverDist(x, z));
  if (bank <= 0) return out.copy(WATER_COL);
  if (bank >= 1) return fieldColor(x, z, out);
  fieldColor(x, z, _field);
  if (bank < 0.45) out.copy(WATER_COL).lerp(SAND_COL, bank / 0.45);
  else out.copy(SAND_COL).lerp(_field, (bank - 0.45) / 0.55);
  return out;
}

// --- Ground colour TEXTURE ---------------------------------------------------
// The ground colours are baked into a texture (evaluated per-texel) rather than stored as
// per-vertex colours. Per-vertex colours are interpolated linearly across the terrain's
// triangles, so every colour transition (shorelines, field edges) revealed the ~30 m grid
// as a jagged diagonal zigzag. A texture is sampled per fragment, so the colouring is smooth
// no matter how coarse the mesh is — the definitive fix for the faceting.
const GROUND_TEX_RES = 1024; // ~7.8 m per texel across the 8 km map
function makeGroundTexture() {
  const N = GROUND_TEX_RES;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(N, N);
  const data = img.data;
  const col = new THREE.Color();
  let o = 0;
  for (let py = 0; py < N; py++) {
    const z = (py / (N - 1) - 0.5) * SIZE;
    for (let px = 0; px < N; px++) {
      const x = (px / (N - 1) - 0.5) * SIZE;
      groundColor(x, z, col);
      data[o] = Math.max(0, Math.min(255, col.r * 255));
      data[o + 1] = Math.max(0, Math.min(255, col.g * 255));
      data[o + 2] = Math.max(0, Math.min(255, col.b * 255));
      data[o + 3] = 255;
      o += 4;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  // Bytes hold the (linear) diffuse values verbatim, matching the old vertex-colour look.
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8; // stays crisp at the grazing angles the terrain is viewed from
  // The plane's UVs map v→+z directly; the default flipY would sample our rows mirrored in z,
  // putting the painted water off the carved channel. Keep the rows aligned to world z.
  tex.flipY = false;
  return tex;
}

// --- Terrain mesh ------------------------------------------------------------
function buildTerrainMesh() {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2); // lay flat, +Y up (uv still maps the map extent 0..1)
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  // Smooth (non-toon) diffuse, coloured by the per-texel ground map, lit by the sun + sky.
  const mat = new THREE.MeshLambertMaterial({ map: makeGroundTexture() });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terrain';
  mesh.receiveShadow = true; // planes cast their midday shadow onto the ground
  return mesh;
}

// --- Pine trees --------------------------------------------------------------
function paint(geo, hex) {
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** One cute low-poly pine: brown trunk + stacked green cones, vertex-coloured, merged. */
function makePineGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.5, 0.7, 3, 6);
  trunk.translate(0, 1.5, 0);
  parts.push(paint(trunk, 0x6b4a2f));
  const greens = [0x2f6d33, 0x357a38, 0x2b6330];
  const cones = [[3.4, 4.5, 3], [2.5, 3.8, 5.6], [1.5, 3.2, 8]];
  cones.forEach(([r, h, y], i) => {
    const cone = new THREE.ConeGeometry(r, h, 7);
    cone.translate(0, y, 0);
    parts.push(paint(cone, greens[i]));
  });
  return mergeGeometries(parts, false);
}

const PINE_TOP = 9.6; // local canopy top (top cone y8 + h3.2/2)

function buildTrees() {
  const geo = makePineGeometry();
  // Cel-shaded, vertex-coloured (brown trunk + green foliage) pines — with a bold outline
  // like the planes (an instanced inverted-hull shell).
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getGradientMap() });
  const MAX = 900;
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.receiveShadow = true; // a plane's shadow crossing the treetops still reads

  const outGeo = weldedSmoothGeometry(geo).clone();
  const th = new Float32Array(outGeo.attributes.position.count).fill(0.15);
  outGeo.setAttribute('aThickness', new THREE.BufferAttribute(th, 1));
  const outline = new THREE.InstancedMesh(outGeo, makeOutlineMaterial(), MAX);

  const dummy = new THREE.Object3D();
  let n = 0;
  const half = SIZE / 2 - 200;
  for (let tries = 0; tries < MAX * 6 && n < MAX; tries++) {
    const x = (Math.random() - 0.5) * 2 * half;
    const z = (Math.random() - 0.5) * 2 * half;
    if (riverDist(x, z) < RIVER_HALF + 60) continue; // keep out of the water
    const forest = fbm(x * 0.0016 + 11, z * 0.0016 + 7); // clump into woods
    if (forest < 0.5 && Math.random() > 0.08) continue;
    const scale = 1.4 + Math.random() * 1.6;
    const baseY = heightAt(x, z) - 0.5;
    dummy.position.set(x, baseY, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    outline.setMatrixAt(n, dummy.matrix);
    n++;
    // Record canopy top for collision.
    const key = cellKey(x, z);
    const top = baseY + PINE_TOP * scale;
    canopyGrid.set(key, Math.max(canopyGrid.get(key) ?? -Infinity, top));
  }
  mesh.count = n;
  outline.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  outline.instanceMatrix.needsUpdate = true;
  mesh.name = 'trees';
  outline.name = 'tree-outlines';

  const group = new THREE.Group();
  group.add(mesh);
  group.add(outline);
  return group;
}

/** Build the whole static landscape as a group to add to the scene. */
export function buildTerrain() {
  const group = new THREE.Group();
  group.name = 'landscape';
  group.add(buildTerrainMesh());
  group.add(buildTrees());
  return group;
}
