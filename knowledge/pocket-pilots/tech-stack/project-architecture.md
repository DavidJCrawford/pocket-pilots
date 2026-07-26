---
type: Tech Decision
title: Project Architecture
description: A minimal-framework module layout — plain ES modules, a fixed-timestep game loop, a simple screen/state machine, and data-driven aircraft definitions.
tags: [tech, architecture, game-loop, structure, decision]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
---

# Principles

- **Minimal framework:** vanilla ES modules + Three.js. No React/Vue for the game itself;
  the UI (title, plane select) can be plain HTML/CSS overlays over the canvas.
- **Data-driven:** the six planes are data (specs + tuning dials) consumed by one shared
  flight/render code path — no per-plane bespoke classes. Source data lives in the
  [aircraft](../aircraft/index.md) concepts.
- **Deterministic loop:** fixed-timestep update + interpolated render for frame-rate
  independence (see [flight model](../flight-model/arcade-flight-model.md)).

# Suggested module layout

```
pocket-pilots/
  index.html            # canvas + UI overlays, importmap or Vite entry
  vite.config.js        # base: '/pocket-pilots/'  (see deployment)
  src/
    main.js             # bootstrap, renderer, screen state machine
    core/
      loop.js           # fixed-timestep game loop
      input.js          # keyboard/mouse/gamepad
      scene.js          # renderer, lights (sun + hemi), sky, camera
      toon.js           # shared gradient map + MeshToonMaterial factory + outline helper
    data/
      aircraft.js       # the six planes: specs + tuning dials (from OKF aircraft bundle)
      factions.js       # side membership + insignia
    game/
      aircraft.js       # shared Aircraft entity (quaternion flight)
      weapons.js        # guns, instanced tracers, hit detection
      ai.js             # enemy state machine
      hud.js            # health, ammo, hit markers
    screens/
      title.js          # "Fight!" title page
      select.js         # plane picker (6 planes)
      battle.js         # the dogfight
  public/ or src/assets # low-poly .glb models, decal atlas
  .github/workflows/deploy.yml
```

# Screen / state machine

`Title → Select → Battle → (Result → Select/Title)`. Each screen is a module with
`enter()/update(dt)/exit()`; `main.js` owns the current screen. Matches the flow in the
[spec](../../docs/SPEC.md).

# Rendering & entities

- One `scene.js` owns renderer, the sun `DirectionalLight`, hemisphere fill, gradient sky,
  and the chase camera.
- `toon.js` centralises the [cel-shading recipe](../art-direction/cel-shading.md) so every
  entity shares one gradient map and material factory (batching + consistency).
- Aircraft, bullets (instanced), and clouds (instanced) are the main entity types — keep
  draw calls low per [rendering perf rules](threejs-rendering.md).

# Why not a bigger framework

The game is small and real-time; a heavy framework adds bundle weight and indirection that
fights the [GitHub Pages](deployment-github-pages.md) "small static bundle" goal. Plain
modules keep it legible and fast to load.
