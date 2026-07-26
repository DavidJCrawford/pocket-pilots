# Tech Stack

How Pocket Pilots is built and shipped. Verdict: **Three.js** (WebGLRenderer), built with
**Vite**, deployed as a static site to **GitHub Pages**.

* [Three.js rendering](threejs-rendering.md) — engine choice, cel-shading path, performance.
* [GitHub Pages deployment](deployment-github-pages.md) — static hosting, the base-path gotcha, CI.
* [Project architecture](project-architecture.md) — module layout, game loop, state, assets.

These decisions serve the constraints: **minimal framework, small static bundle, real-time
3D with cel shading**. They underpin the [art direction](../art-direction/index.md) and
[flight model](../flight-model/index.md).
