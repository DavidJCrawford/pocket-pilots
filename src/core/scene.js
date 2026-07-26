import * as THREE from 'three';

/**
 * Rendering primitives shared by every screen:
 *   - one WebGLRenderer (createRenderer)
 *   - a fresh sky + lights + camera "world" per screen (createWorld)
 * Palette follows knowledge/pocket-pilots/art-direction/color-palette.md.
 */

export const PALETTE = {
  skyHorizon: 0x8fd3ff,
  skyZenith: 0x2166cf, // a bit deeper blue directly overhead
  sun: 0xfff6e0,
  hemiSky: 0xbfe3ff,
  hemiGround: 0x6b7a3a,
};

// Gradient based on the LOCAL view direction (the sky sphere is centred on the camera), so
// the colour depends only on elevation — identical on the horizon at every compass bearing,
// independent of where in the world the camera is. A flat band near the horizon keeps the
// sky exactly the horizon colour there, so the distance fog blends seamlessly into it.
const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float horizon;
  uniform float spread;
  varying vec3 vDir;
  void main() {
    float t = smoothstep(horizon, spread, vDir.y);
    gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
    #include <colorspace_fragment>
  }
`;

// Two moods: the bright battle day sky, and a cinematic twilight for the menus (so the
// title/select backdrop reads as a designed scene, not a flat blue wash).
const SKY_MOODS = {
  day: { zenith: PALETTE.skyZenith, horizon: PALETTE.skyHorizon, horizonBand: 0.02, spread: 0.62 },
  dusk: { zenith: 0x1b2444, horizon: 0xc0864a, horizonBand: -0.15, spread: 0.72 },
};

export function makeSky(mood = 'day') {
  const m = SKY_MOODS[mood] ?? SKY_MOODS.day;
  const geo = new THREE.SphereGeometry(600, 32, 16);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(m.zenith) },
      bottomColor: { value: new THREE.Color(m.horizon) },
      horizon: { value: m.horizonBand }, // pure horizon colour up to this elevation (fog match on 'day')
      spread: { value: m.spread }, // elevation at which it becomes fully the zenith colour
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  return sky;
}

/** The single shared renderer. */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping; // keep cel colours punchy
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // softened edges for the plane shadows
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}

/** A scene with sky + sun + hemisphere fill + a camera. Each screen owns one.
 *  `mood: 'dusk'` gives the menus a warm twilight backdrop with low, golden key light. */
export function createWorld({ fov = 55, mood = 'day' } = {}) {
  const scene = new THREE.Scene();
  const sky = makeSky(mood);
  scene.add(sky);

  const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.3, 6000);

  const dusk = mood === 'dusk';
  // Day: the angled sun still does most of the cel modelling, but shares the load with the
  // overhead key below so the planes' straight-down shadows land dark without washing out.
  const sun = new THREE.DirectionalLight(dusk ? 0xffcf94 : PALETTE.sun, dusk ? 1.35 : 0.8);
  sun.position.set(dusk ? -6 : 5, dusk ? 3.5 : 8, dusk ? 4 : 6); // low, raking key at dusk
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(
    dusk ? 0x394a6b : PALETTE.hemiSky,
    dusk ? 0x241d14 : PALETTE.hemiGround,
    dusk ? 0.42 : 0.3, // day fill trimmed to make room for the overhead key below
  );
  scene.add(hemi);

  // Overhead "midday" key that casts the planes' shadows straight down onto the ground.
  // Only the battle world (day) has terrain to receive them; the menus (dusk) skip it.
  // The battle screen slides this light to sit directly above the player each frame.
  let shadowLight = null;
  if (!dusk) {
    shadowLight = new THREE.DirectionalLight(0xfff4df, 0.72);
    shadowLight.position.set(0, 600, 0);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(2048, 2048);
    const sc = shadowLight.shadow.camera;
    sc.near = 10; sc.far = 680;
    sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160;
    shadowLight.shadow.bias = -0.0004;
    shadowLight.shadow.normalBias = 0.7; // push samples off the surface to kill shadow acne
    scene.add(shadowLight);
    scene.add(shadowLight.target);
  }

  return { scene, camera, sky, sun, hemi, shadowLight };
}
