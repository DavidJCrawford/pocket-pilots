---
type: Tech Decision
title: Three.js Rendering
description: Decision to use Three.js (WebGLRenderer) for a cel-shaded browser dogfight; rationale vs Babylon/PlayCanvas/Godot, plus the toon path and performance rules.
tags: [tech, threejs, rendering, webgl, decision]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
verified: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
sources:
  - id: three-r180
    resource: https://github.com/mrdoob/three.js/releases/tag/r180
    title: three.js r180 release notes
  - id: compare
    resource: https://www.utsubo.com/blog/threejs-vs-babylonjs-vs-playcanvas-comparison
    title: Three.js vs Babylon.js vs PlayCanvas comparison
  - id: babylon-cell
    resource: https://doc.babylonjs.com/toolsAndResources/assetLibraries/materialsLibrary/cellShadingMat
    title: Babylon.js CellMaterial docs
  - id: perf-tips
    resource: https://www.utsubo.com/blog/threejs-best-practices-100-tips
    title: 100 Three.js performance tips
---

# Decision

Use **Three.js (r180+), classic `WebGLRenderer`**. It is the smallest, most
static-friendly engine that still ships cel shading out of the box, with by far the
largest ecosystem of toon/outline recipes. [^three-r180]

# Why Three.js over the alternatives

Evaluated against the project's stated constraints — minimal framework, small static
bundle for GitHub Pages, real-time cel-shaded dogfight. [^compare]

| Engine | Core bundle (gzip) | Cel-shading | Verdict |
|---|---|---|---|
| **Three.js** | **~168 kB** | built-in `MeshToonMaterial`, `ToonOutlinePassNode` | **chosen** |
| Babylon.js | ~1.4 MB | turnkey `CellMaterial` + `renderOutline` | best DX, but ~8× the bundle |
| PlayCanvas | ~300 kB | shader/editor | editor-centric, not "minimal framework" |
| Godot 4 (WASM) | ~5 MB+ (25–35 MB w/ assets) | shaders | far too heavy; needs COOP/COEP headers Pages can't set |
| Unity WebGL | many MB + loader | URP toon | heaviest, overkill |
| raw WebGPU/WebGL | ~0 | write everything | too much low-level work |

**Flagged alternative:** Babylon.js is the only genuine rival — its built-in
`CellMaterial` (`computeHighLevel` for multi-band toon) and per-mesh `renderOutline` are
more turnkey than Three.js. [^babylon-cell] But its ~1.4 MB baseline loses on the
"small static bundle / minimal framework" priority, so we do **not** switch.

WebGPU/TSL is shippable in 2025–2026 but the WebGLRenderer path is the most battle-tested
for the toon+outline recipe; keep WebGPU/TSL noted for future polish.

# Cel-shading path (summary)

Full recipe in [cel-shading](../art-direction/cel-shading.md):
`MeshToonMaterial` + a shared 3–4 band `DataTexture` gradient map (**NearestFilter!**),
saturated colours, small `emissive`, `NoToneMapping`, **inverted-hull** black outlines,
one directional sun + hemisphere fill, rim light.

# Performance rules (target 60 fps) [^perf-tips]

- **Draw calls are the enemy** — keep under ~100. Watch bullets/particles.
- **`InstancedMesh`** for anything numerous — bullets/tracers, clouds, distant AI planes
  (N copies in **1 draw call**). See [combat](../flight-model/combat-weapons.md).
- **Share materials** — reuse one `MeshToonMaterial` + gradient map across planes so
  Three can batch; a fresh material per object defeats batching.
- **LOD + frustum culling** — drop inverted-hull outlines and swap to lower-poly meshes
  for distant planes.
- **Dispose** geometries/materials/textures you stop using.
- Cap pixel ratio: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

# Assets

Ship low-poly **`.glb`** via `GLTFLoader` (flat/toon shading hides low poly beautifully).
With a flat cartoon palette you need almost no textures — per-material colours keep GLBs
tiny. Draco/meshopt compression only if needed. A jam-style build can even assemble planes
from primitives + per-team colour to avoid asset loading entirely.
