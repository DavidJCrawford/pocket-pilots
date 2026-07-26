<div align="center">

# ✈️ Pocket Pilots

### Pocket-sized WWI dogfights, right in your browser.

A bright, plasticky, **cel-shaded** aerial combat game — six iconic Great War fighters,
a quick blue-sky (and golden-hour) dogfight, and **zero art assets**. Every plane, sound,
tree, and explosion is generated in code, and it ships as a tiny static site.

Built with **[Three.js](https://threejs.org)** · **[Vite](https://vitejs.dev)** · vanilla ES modules · no game engine.

<!--
  Drop a hero screenshot in when you have one, e.g.:
  ![Pocket Pilots](docs/media/hero.png)
-->

**[▶ Play it](https://davidjcrawford.github.io/pocket-pilots/)** &nbsp;·&nbsp;
**[Design spec](docs/SPEC.md)** &nbsp;·&nbsp;
**[Knowledge bundle](knowledge/pocket-pilots/index.md)**

</div>

---

## ✨ Highlights

- **Cel-shaded from scratch** — hard toon bands (`MeshToonMaterial` + a nearest-filtered gradient map) with bold **inverted-hull outlines**, welded to smooth over hard box edges. That "kid's-toy" plastic look, no textures.
- **Six distinct fighters** — each one's silhouette, livery, and national markings are built parametrically, and its handling comes from six tuning **dials** (turn, speed, climb, dive, armour, guns) feeding a shared arcade flight model.
- **Quaternion arcade flight** — pitch/roll/yaw about local axes, bank-to-turn, a light energy model (dive to gain speed, climb to bleed it), and hands-off roll self-levelling that keeps whatever climb/dive attitude you set.
- **A living sky** — value-noise rolling terrain with patchwork fields, a winding river with smooth sandy banks, instanced low-poly pines, distance fog that melts seamlessly into the horizon, and drifting wispy clouds.
- **Midday shadows** — planes cast real shadows straight down onto the ground via a shadow-mapped overhead key light that tracks the player.
- **Enemy aces** — an AI pilot controller flies the opposing side: pursuit, lead-aimed fire, breaking off when tailed or hurt, and ground avoidance — on the *same* flight model as you, no stat cheating.
- **Procedural everything else** — Web Audio engine drone, machine-gun rattle, and explosions synthesised live (no sound files); billboard-sprite smoke and fireballs from canvas-drawn textures.
- **An ornate WWI UI** — gunmetal-and-brass instrument plates, riveted frames, faction heraldry (Allied blue / Central red), and period type (Cinzel + Oswald).
- **Tiny & static** — one runtime dependency (`three`), ~150 KB gzipped, auto-deployed to GitHub Pages.

## 🎮 Controls

| Keys | Action |
| :--- | :--- |
| **W** / **S** | Pitch — climb / dive |
| **A** / **D** | Rudder — yaw right / left |
| **←** / **→** | Roll — left / right |
| **↑** / **↓** | Throttle — up / down |
| **Space** / **Click** | Fire guns |
| **R** | Refly (on the result screen) |

Roll self-levels when you let go; your pitch attitude holds. Hold the trigger too long and
your guns overheat — watch the heat gauge.

## ✈️ The fighters

Pick a side and take on the other. Each plane flies to its reputation.

**Allied**

| Fighter | Nation | Character |
| :--- | :--- | :--- |
| Sopwith Camel | 🇬🇧 UK | Turn-fighter · tricky rotary torque |
| SPAD S.XIII | 🇫🇷 France | Energy fighter · fast & strong diver |
| Nieuport 17 | 🇫🇷 France | Nimble climber · fragile in dives |

**Central Powers**

| Fighter | Nation | Character |
| :--- | :--- | :--- |
| Fokker Dr.I | 🇩🇪 Germany | Triplane · turn king, slow & poor dive |
| Fokker D.VII | 🇩🇪 Germany | All-rounder · forgiving & steady |
| Albatros D.III | 🇩🇪 Germany | Hard-hitting · fragile in dives |

## 🕹️ Run it locally

Requires [Node.js](https://nodejs.org) 20+.

```bash
npm install
npm run dev        # → http://localhost:5173/pocket-pilots/
```

```bash
npm run build      # static site into dist/
npm run preview    # serve the production build locally
```

## 🚀 Deploy to GitHub Pages

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds and publishes `dist/` to Pages automatically. Two things to know:

1. **Enable Pages** in the repo: *Settings → Pages → Source: GitHub Actions*.
2. The site is served from a sub-path (`/<repo>/`), so `base` in
   [`vite.config.js`](vite.config.js) must match the repo name. It's set to
   `/pocket-pilots/` — **if you name the repo anything else, update `base` to match**, or
   every asset 404s in production.

## 🧩 How it works

A short tour of the interesting bits:

- **Cel-shading core** ([`src/core/toon.js`](src/core/toon.js)) — one shared banded gradient
  map so materials batch; outlines are a welded, smooth-normal shell inflated along its
  normals and drawn back-faces-only, so hard box corners don't tear.
- **Flight model** ([`src/game/aircraft.js`](src/game/aircraft.js)) — pure quaternion
  attitude with per-plane constants derived from the data dials, plus signature quirks
  (rotary torque, low-speed mush, dive limits).
- **Draw-call diet** ([`src/game/plane-model.js`](src/game/plane-model.js)) — each plane's
  static parts are merged to one mesh per material plus one merged outline shell, with
  geometry and materials cached per type, so the three AI enemies reuse the player's build.
  Bullets, trees, and clouds are instanced.
- **Procedural world** ([`src/game/terrain.js`](src/game/terrain.js)) — seedless value-noise
  fbm heightfield, vertex-coloured fields, a `sin`-driven river with smoothstep banks, and
  instanced cel-shaded pines that double as collision obstacles.
- **Procedural audio** ([`src/core/audio.js`](src/core/audio.js)) — oscillators + filtered
  noise for the whole soundscape, no files to ship.
- **Screen flow** ([`src/core/screen.js`](src/core/screen.js)) — a small state machine drives
  Title → Plane Select → Battle → Result, each screen owning its own Three.js world.

## 📁 Project structure

```
index.html            # canvas + all screen/HUD markup
src/
  main.js             # bootstrap: renderer, loop, screen manager, audio
  style.css           # the gunmetal-and-brass UI theme
  core/               # engine-ish bits: scene, toon shading, input, loop, audio, screens
  data/               # the six aircraft + faction data (the game's tuning knobs)
  game/               # aircraft flight, AI, weapons, effects, plane models, terrain
  screens/            # title, select, battle
docs/SPEC.md          # full design & technical spec
knowledge/            # OKF knowledge bundle grounding the whole game
.github/workflows/    # GitHub Pages deploy
```

## 📚 Design & research

This game was built spec-first. If you want the *why* behind any decision:

- **[`docs/SPEC.md`](docs/SPEC.md)** — the detailed game design & technical spec (start here).
- **[`knowledge/pocket-pilots/`](knowledge/pocket-pilots/index.md)** — the grounding knowledge
  bundle: real aircraft, factions, the arcade flight model, art direction, and the tech stack.

## 📜 Credits & licence

Aircraft, flight characteristics, and markings are inspired by real Great War fighters;
everything here is an original, stylised interpretation — no game assets are used.

No licence is set yet. Add one (MIT is a good default for a project like this) before
making the repo public.
