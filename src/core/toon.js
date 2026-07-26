import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Cel-shading core for Pocket Pilots.
 *
 * Recipe (see knowledge/pocket-pilots/art-direction/cel-shading.md):
 *   - MeshToonMaterial + a shared banded gradient map for hard cel steps.
 *   - The gradient map MUST use NearestFilter or the GPU smears the bands into a
 *     soft gradient — the #1 toon-shading mistake.
 *   - Saturated base color, a small emissive in the base hue so shadows stay bright,
 *     giving the "bright plasticky" look.
 *   - Inverted-hull outlines for the bold cartoon border.
 *
 * One gradient map is shared across every material so Three.js can batch draw calls.
 */

// --- Shared gradient map -----------------------------------------------------

const BAND_COLORS = new Uint8Array([92, 148, 205, 255]); // 4 even bands; darkest ~36% so shadows never crush to black
let sharedGradientMap = null;

/** The single shared cel gradient map (lazily built). */
export function getGradientMap() {
  if (sharedGradientMap) return sharedGradientMap;
  const map = new THREE.DataTexture(
    BAND_COLORS,
    BAND_COLORS.length,
    1,
    THREE.RedFormat,
  );
  map.minFilter = THREE.NearestFilter; // hard bands, not a smooth ramp
  map.magFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  sharedGradientMap = map;
  return map;
}

// --- Toon material factory ---------------------------------------------------

/**
 * Make a bright plasticky toon material.
 * @param {object} opts
 * @param {THREE.ColorRepresentation} opts.color    base color
 * @param {THREE.ColorRepresentation} [opts.emissive] override glow (defaults to a dim tint of `color`)
 * @param {number} [opts.emissiveIntensity=0.12] how much the base hue glows in shadow
 * @returns {THREE.MeshToonMaterial}
 */
export function makeToonMaterial({ color = 0xffffff, emissive, emissiveIntensity = 0.12 } = {}) {
  const base = new THREE.Color(color);
  return new THREE.MeshToonMaterial({
    color: base,
    emissive: emissive !== undefined ? new THREE.Color(emissive) : base.clone(),
    emissiveIntensity: emissive !== undefined ? 1 : emissiveIntensity,
    gradientMap: getGradientMap(),
  });
}

// --- Inverted-hull outline ---------------------------------------------------

const OUTLINE_VERT = /* glsl */ `
  uniform float outlineThickness;
  void main() {
    // Push each vertex out along its (smooth, welded) normal to inflate the shell.
    vec3 pos = position + normal * outlineThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const OUTLINE_FRAG = /* glsl */ `
  uniform vec3 outlineColor;
  void main() {
    gl_FragColor = vec4(outlineColor, 1.0);
  }
`;

// A separate, WELDED copy of each geometry with SMOOTH (averaged) normals, used only for
// the outline shell. Hard-edged meshes (boxes) split their vertices at every edge with
// face-perpendicular normals; pushing those along their own normals tears the faces apart
// and opens gaps at the edges. Welding coincident corners into one vertex with an averaged
// normal makes the shell expand as a single closed surface — a bigger plane wrapped around
// the real one, with no seams. Cached per source geometry.
const outlineGeoCache = new WeakMap();
function outlineGeometry(geometry) {
  const cached = outlineGeoCache.get(geometry);
  if (cached) return cached;
  let g = geometry.clone();
  // Keep only position so mergeVertices welds purely by location (per-face normals/uvs
  // would otherwise block the merge), then rebuild averaged normals.
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position') g.deleteAttribute(name);
  }
  g = mergeVertices(g);
  g.computeVertexNormals();
  outlineGeoCache.set(geometry, g);
  return g;
}

/**
 * Build an inverted-hull outline mesh for `mesh`: a welded, smooth-normal copy of the
 * geometry inflated along its normals, drawn back-faces-only in flat dark. The result is a
 * closed shell slightly larger than the mesh — you see its inside (the border) around the
 * silhouette, with no gaps at hard edges.
 *
 * @param {THREE.Mesh} mesh
 * @param {object} [opts]
 * @param {number} [opts.thickness=0.045] shell inflation in the mesh's local units
 * @param {THREE.ColorRepresentation} [opts.color=0x1a1a2e] outline color (near-black indigo)
 * @returns {THREE.Mesh} the outline mesh
 */
export function makeOutline(mesh, { thickness = 0.045, color = 0x1a1a2e } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      outlineThickness: { value: thickness },
      outlineColor: { value: new THREE.Color(color) },
    },
    vertexShader: OUTLINE_VERT,
    fragmentShader: OUTLINE_FRAG,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(outlineGeometry(mesh.geometry), material);
  outline.name = `${mesh.name || 'mesh'}__outline`;
  return outline;
}

/**
 * Convenience: attach an inverted-hull outline as a child of `mesh` so it follows
 * the mesh's transform automatically. Returns the outline mesh.
 */
export function addOutline(mesh, opts) {
  const outline = makeOutline(mesh, opts);
  mesh.add(outline);
  return outline;
}

/**
 * Make a toon mesh (geometry + toon material) with an inverted-hull outline already
 * attached. Ensures the geometry has normals. Returns the visible mesh (outline is a child).
 */
export function makeToonMesh(geometry, { material, outline } = {}) {
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material ?? makeToonMaterial());
  addOutline(mesh, outline);
  return mesh;
}

// --- Merged-outline support (for the perf pass) ------------------------------
// The welded, smooth-normal shell used by inverted-hull outlines (see above), exposed so
// many parts' outlines can be baked and merged into ONE mesh. Thickness travels as a
// per-vertex `aThickness` attribute so merging preserves each part's original outline width.
export function weldedSmoothGeometry(geometry) {
  return outlineGeometry(geometry);
}

const OUTLINE_ATTR_VERT = /* glsl */ `
  attribute float aThickness;
  void main() {
    vec3 pos = position + normal * aThickness;
    // Support InstancedMesh (trees) as well as regular meshes (merged plane outlines).
    #ifdef USE_INSTANCING
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
    #else
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    #endif
  }
`;

/** Outline material that reads a per-vertex `aThickness` attribute (for merged shells). */
export function makeOutlineMaterial(color = 0x1a1a2e) {
  return new THREE.ShaderMaterial({
    uniforms: { outlineColor: { value: new THREE.Color(color) } },
    vertexShader: OUTLINE_ATTR_VERT,
    fragmentShader: OUTLINE_FRAG,
    side: THREE.BackSide,
  });
}
