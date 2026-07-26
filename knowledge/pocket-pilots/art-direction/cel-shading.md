---
type: Art Direction
title: Cel-Shading Recipe
description: The concrete Three.js toon-shading recipe — MeshToonMaterial with a banded gradient map (NearestFilter) plus inverted-hull outlines — for a bright plasticky cartoon look.
tags: [art-direction, cel-shading, toon, shaders, outlines]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
sources:
  - id: toon-mat
    resource: https://threejs.org/docs/pages/MeshToonMaterial.html
    title: MeshToonMaterial — three.js docs
  - id: inverted-hull
    resource: https://github.com/Delt06/toon-rp/wiki/Inverted-Hull-Outline
    title: Inverted Hull Outline technique
  - id: manbust
    resource: https://github.com/manbust/three-js-toon-shader
    title: manbust/three-js-toon-shader (gradient-map cel + edge outlines)
---

# Goal

"Bright plasticky colours" + "super cartoony" cel shading. Flat, poster-like surfaces
with a few hard shading bands, bold dark outlines, saturated toy colours, and a rim
sheen. This is the game's signature look and must be consistent across all planes.

# Core technique — MeshToonMaterial + banded gradient map

Fastest path to hard cel banding, no custom shader required. [^toon-mat]

- `THREE.MeshToonMaterial` replaces smooth diffuse falloff with **discrete steps**.
- Supply a **`gradientMap`**: a tiny 1-D texture (a 3–5 pixel strip dark → mid → light).
  Pixel count = number of shading bands.
- **Critical gotcha:** set `gradientMap.minFilter = gradientMap.magFilter =
  THREE.NearestFilter`. Without nearest filtering the GPU interpolates the strip into a
  soft gradient and you lose the hard cel bands — the single most common mistake.
- Build the strip in code with a `DataTexture` (a `Uint8Array` of a few grey levels) — no
  image asset needed. Reuse **one** gradient map across all materials.

```js
const colors = new Uint8Array([90, 90, 170, 255]); // 4 bands, don't let the darkest go near-black
const gradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;
const mat = new THREE.MeshToonMaterial({ color: 0xff3b3b, emissive: 0x220a0a, gradientMap });
```

# Outlines — inverted hull (recommended)

Bold dark borders are what read as "cartoon." Use the **inverted-hull** method: [^inverted-hull]

- Render each mesh a second time, scaled slightly outward along its normals, with
  **front-face culling** (`side: THREE.BackSide`) and a flat black (or dark) material.
- **Why this one:** per-object, cheap, scales to several planes, plays well with
  instancing/LOD (distant planes can drop the outline), and gives the consistent
  "sticker" border.
- Keep thickness roughly pixel-constant by scaling the shell by depth in the vertex
  shader if distance variation is noticeable.
- **Optional upgrade:** add a screen-space depth+normal Sobel post-pass later for clean
  edges where planes cross in front of each other. [^manbust]

# Bright plasticky colours

- **Saturated base `color`**; keep the gradient's darkest band fairly light so shadows
  don't crush to black — reads as bright plastic/toy.
- Small **`emissive`** in the base hue so shadowed areas still glow (flat poster look).
- **Rim light** (bright edge term facing away from camera) sells the plastic sheen and
  separates planes from the blue sky.
- Keep **specular tight and hard** — one small quantized highlight, never a broad soft one.
- `renderer.toneMapping = THREE.NoToneMapping` (or flat exposure) so colours stay punchy.

# Lighting

One strong **directional "sun"** + a soft **hemisphere/ambient fill** → clean two/three-band
shading. See [colour palette](color-palette.md) for values.

# Alternatives considered

`MeshToonMaterial` + inverted hull is the low-risk shippable choice. Custom
`ShaderMaterial`/`onBeforeCompile` or **TSL NodeMaterial** give more control (custom
stepped lighting, rim) at higher maintenance/complexity — reserved for later polish. See
the engine rationale in [Three.js rendering](../tech-stack/threejs-rendering.md).
