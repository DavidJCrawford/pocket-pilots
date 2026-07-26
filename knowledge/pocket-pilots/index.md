---
okf_version: "0.2"
---

# Pocket Pilots — Knowledge Bundle

Grounding knowledge for **Pocket Pilots**, a browser-based WW1 dogfight game rendered
in 3D with a bright, plasticky, cel-shaded ("cartoony") art style, publishable as a
static GitHub Pages site. This bundle is the source of truth that the game spec
([`/docs/SPEC.md`](../../docs/SPEC.md)) and implementation are grounded against.

## Subdirectories

* [aircraft](aircraft/index.md) — The six playable WW1 fighters: specs, handling reputation, silhouette cues, and liveries.
* [factions](factions/index.md) — The Allied and Central Powers sides, their rosters, and national insignia.
* [flight-model](flight-model/index.md) — Arcade flight physics, weapons, damage, and AI opponent behaviour.
* [art-direction](art-direction/index.md) — Cel-shading recipe, colour palette, and markings/livery rules.
* [tech-stack](tech-stack/index.md) — Rendering engine choice (Three.js), architecture, and GitHub Pages deployment.

## Reading order

1. [factions](factions/index.md) sets the two-sided conflict.
2. [aircraft](aircraft/index.md) defines the six models and their tuning inputs.
3. [flight-model](flight-model/index.md) turns handling reputations into numbers.
4. [art-direction](art-direction/index.md) and [tech-stack](tech-stack/index.md) define how it looks and runs.
