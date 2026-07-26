---
type: Art Direction
title: Colour Palette
description: A bright, saturated, plasticky palette — clear blue sky, toy-coloured planes, hard cel bands — with concrete hex/lighting guidance.
tags: [art-direction, palette, colour, sky, lighting]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
---

# Mood

Toy fighters in a clear summer sky. Everything reads bright, clean, and saturated — no
grit, no muddy realism. High value, high chroma, hard shadow terminators.

# Sky & environment

- **Sky:** a clean, slightly gradient blue (bright cyan-blue at the horizon → deeper blue
  overhead). Suggested: horizon `#8FD3FF`, zenith `#2E6FE0`. Use a gradient skybox or a
  large inverted sphere with a vertex gradient — cheap and toy-like.
- **Clouds:** soft rounded white cel-shaded puffs (billboards or low-poly blobs),
  rendered with the same toon material. Great for parallax and depth cues; instance them.
- Optional distant patchwork **Western Front** ground far below (green/brown fields, a
  river ribbon) — stylised, low detail, mostly for orientation.

# Aircraft colours

- Each plane's **hero livery** is a bold saturated toy colour (e.g. Red Baron red
  `#E23B2E`). See [markings & liveries](markings-liveries.md).
- Keep 2–4 hues per plane max; big flat fields of colour read best under cel shading.
- Team-tint distant/AI planes toward their faction so friend/foe is instantly readable.

# Lighting values (starting point)

- **Sun:** `THREE.DirectionalLight`, warm white `#FFF6E0`, intensity ~1.2, high angle.
- **Fill:** `THREE.HemisphereLight`, sky `#BFE3FF` / ground `#6B7A3A`, intensity ~0.5 —
  keeps shadowed sides bright and sky-tinted (plastic look).
- **Cel bands:** 3–4 bands; darkest band stays light (~35% value), never near-black.
- **Rim:** subtle bright rim on aircraft to pop them off the sky.
- `NoToneMapping`, capped pixel ratio (≤2) — see [rendering](../tech-stack/threejs-rendering.md).

# Contrast rule

Planes must always separate cleanly from the blue sky: rely on the **dark outline** plus
**rim light**, and avoid blue-dominant liveries that camouflage against the backdrop.
