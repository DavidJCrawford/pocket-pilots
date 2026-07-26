# Pocket Pilots — Game Specification

> A browser-based WW1 dogfight game with bright, plasticky, cel-shaded 3D aircraft.
> Playable in a webpage, shippable as a static GitHub Pages site.

**Status:** Design spec v1 · 2026-07-25
**Grounded in:** the OKF knowledge bundle at [`/knowledge/pocket-pilots/`](../knowledge/pocket-pilots/index.md).
Every design claim here traces to a concept in that bundle; when they disagree, the
bundle is the source of truth and this spec should be corrected.

---

## 1. Vision & pillars

Pocket Pilots is a fast, friendly arcade dogfighter. You pick one of six iconic WW1
fighters and fight the opposing side in a clear blue sky. The planes look like glossy
toys — cel-shaded, boldly outlined, saturated colours.

**Design pillars**

1. **Toy-box beautiful.** Bright plasticky cel-shading is the signature. Every visual
   decision serves "cartoony WW1 toys in a blue sky." → [art-direction](../knowledge/pocket-pilots/art-direction/index.md)
2. **Arcade, not simulation.** Easy to fly, hard to master. Fun over realism, but each
   plane feels historically distinct. → [flight-model](../knowledge/pocket-pilots/flight-model/arcade-flight-model.md)
3. **Six planes, two sides, instant fights.** Minimal friction: Title → pick a plane →
   dogfight. → [factions](../knowledge/pocket-pilots/factions/index.md)
4. **Lightweight & open.** Minimal framework, small static bundle, runs from GitHub
   Pages. → [tech-stack](../knowledge/pocket-pilots/tech-stack/index.md)

---

## 2. Scope

### v1 (this spec)

- Three screens: **Title**, **Plane Select** (6 planes), **Battle**.
- Player flies one chosen aircraft; enemies are AI drawn from the **opposing** faction.
- Full cel-shaded rendering, arcade flight, gun combat, health/damage, basic HUD, audio.
- One battle arena (open sky). One core game mode (see §5.4).
- Ships to GitHub Pages.

### Non-goals for v1 (future)

Multiplayer, campaign/career, bombers/two-seaters, ground targets, mobile touch controls,
plane unlocks/progression, damage-model complexity beyond health + smoke/fire, weather.
(The BMW-engined [D.VII](../knowledge/pocket-pilots/aircraft/fokker-d7.md) variant and
per-plane hero-skin unlocks are noted as natural future additions.)

---

## 3. Technology & architecture

Decisions and rationale live in [tech-stack](../knowledge/pocket-pilots/tech-stack/index.md).
Summary:

| Area | Choice | Why |
|---|---|---|
| Engine | **Three.js r180+, WebGLRenderer** | smallest bundle (~168 kB), built-in toon material, biggest ecosystem — [rationale](../knowledge/pocket-pilots/tech-stack/threejs-rendering.md) |
| Build | **Vite** | bundling, minification, GLB handling, HMR |
| Hosting | **GitHub Pages** (static) via CI Action | [deployment](../knowledge/pocket-pilots/tech-stack/deployment-github-pages.md) |
| Framework | **Vanilla ES modules** | minimal framework; HTML/CSS overlays for UI |
| Language | JavaScript (ES2022) | no build-type overhead; TS optional later |

**Considered and rejected:** Babylon.js (turnkey `CellMaterial` but ~8× bundle), Godot/
Unity web (too heavy, need headers Pages can't set), raw WebGL (too low-level). Full
comparison in [threejs-rendering](../knowledge/pocket-pilots/tech-stack/threejs-rendering.md).

Module layout, game loop, and state machine: [project-architecture](../knowledge/pocket-pilots/tech-stack/project-architecture.md).

---

## 4. Screen flow

```
┌────────┐   Fight!   ┌──────────────┐  pick plane  ┌────────┐  win/lose  ┌────────┐
│ TITLE  │──────────▶ │ PLANE SELECT │ ───────────▶ │ BATTLE │ ─────────▶ │ RESULT │
└────────┘            └──────────────┘              └────────┘            └────────┘
     ▲                       ▲                                                 │
     └───────────────────────┴─────────────────────────────────────────────  ┘
                         (back / play again)
```

Each screen is a module exposing `enter() / update(dt) / exit()`; `main.js` owns the
active screen. → [project-architecture](../knowledge/pocket-pilots/tech-stack/project-architecture.md).

### 4.1 Title

- Game logo "Pocket Pilots," a slowly orbiting hero plane (the red
  [Fokker Dr.I](../knowledge/pocket-pilots/aircraft/fokker-dr1.md)) over the blue sky.
- Single primary button: **Fight!** → Plane Select.
- Secondary (optional): a short "How to play" panel, sound toggle.

### 4.2 Plane Select

- Grid/carousel of the **six** planes, grouped by side:
  **Allied** — Camel, SPAD S.XIII, Nieuport 17; **Central Powers** — Dr.I, D.VII,
  Albatros D.III. → [factions](../knowledge/pocket-pilots/factions/index.md)
- Each card shows: rotating 3D cel-shaded model in its **hero livery**, name, nation
  flag/insignia, one-line archetype, and the tuning dials as little bars
  (Turn / Speed / Climb / Dive / Durability / Firepower).
- Selecting a plane sets the player's **side**; enemies will be the opposing faction.
  → [ai-opponents](../knowledge/pocket-pilots/flight-model/ai-opponents.md)
- Confirm → Battle.

### 4.3 Battle

The dogfight. Player spawns airborne in clear sky (per the brief: "flying in the blue
sky"), enemies inbound. See §6–§10.

### 4.4 Result

Win (all enemies downed) or lose (player downed) → summary (kills, time) → **Play again**
(back to Select) or **Title**.

---

## 5. Aircraft & factions

### 5.1 The six planes

Full per-plane detail — specs, handling reputation, silhouette cues, livery — in the
[aircraft bundle](../knowledge/pocket-pilots/aircraft/index.md). Master reference:

| Plane | Side | Config | Engine | Archetype | Guns | Hero livery |
|---|---|---|---|---|---|---|
| [Sopwith Camel](../knowledge/pocket-pilots/aircraft/sopwith-camel.md) | Allied 🇬🇧 | biplane, rotary | Clerget 130 hp | turn-fighter (torque) | 2× Vickers | PC10 olive + roundels |
| [SPAD S.XIII](../knowledge/pocket-pilots/aircraft/spad-s13.md) | Allied 🇫🇷 | biplane, inline V8 | Hispano-Suiza 220 hp | energy fighter | 2× Vickers | linen + stork |
| [Nieuport 17](../knowledge/pocket-pilots/aircraft/nieuport-17.md) | Allied 🇫🇷 | sesquiplane, rotary | Le Rhône 120 hp | light turn-fighter | 1× gun | silver + cocardes |
| [Fokker Dr.I](../knowledge/pocket-pilots/aircraft/fokker-dr1.md) | Central 🇩🇪 | **triplane**, rotary | Oberursel 110 hp | turn-fighter | 2× Spandau | **all red (Red Baron)** |
| [Fokker D.VII](../knowledge/pocket-pilots/aircraft/fokker-d7.md) | Central 🇩🇪 | biplane, inline 6 | Mercedes/BMW 180 hp | all-rounder / altitude | 2× Spandau | lozenge camo |
| [Albatros D.III](../knowledge/pocket-pilots/aircraft/albatros-d3.md) | Central 🇩🇪 | sesquiplane, inline 6 | Mercedes 175 hp | hard-hitting energy | 2× Spandau | Jasta 11 red |

### 5.2 Tuning dials (0–1)

Each plane exposes normalized dials that scale shared base constants. Values are set in
each aircraft concept's "Game tuning inputs" and consumed by the
[flight model](../knowledge/pocket-pilots/flight-model/arcade-flight-model.md).

| Plane | Turn | Speed | Climb | DiveSafety | Durability | Firepower |
|---|---|---|---|---|---|---|
| Sopwith Camel | 0.85 | 0.55 | 0.55 | 0.50 | 0.50 | 0.70 |
| SPAD S.XIII | 0.50 | 0.95 | 0.75 | 0.95 | 0.70 | 0.70 |
| Nieuport 17 | 0.90 | 0.45 | 0.80 | 0.35 | 0.45 | 0.45 |
| Fokker Dr.I | 0.95 | 0.50 | 0.85 | 0.40 | 0.50 | 0.70 |
| Fokker D.VII | 0.70 | 0.80 | 0.75 | 0.85 | 0.80 | 0.70 |
| Albatros D.III | 0.60 | 0.75 | 0.70 | 0.35 | 0.75 | 0.75 |

> These are **starting** values for playtest tuning, derived from documented historical
> handling. Adjust for fun, but keep the relative archetypes intact (Dr.I/Camel turn;
> SPAD/Albatros energy; D.VII forgiving all-rounder; single-gun Nieuport weaker firepower).

### 5.3 Signature mechanics

Optional flavour that makes planes distinct — keep readable, never frustrating.
Defined in [arcade-flight-model](../knowledge/pocket-pilots/flight-model/arcade-flight-model.md):

- **Rotary torque** (Camel, Dr.I): slight yaw bias, right turns snappier (`torqueBias`).
- **Structural dive limit** (Nieuport 17, Albatros D.III): sustained high-speed dives
  accrue wing stress; crossing `DiveSafety` degrades control / fails a wing.
- **Low-speed penalty** (SPAD): reduced authority / stall risk below a speed threshold.
- **Altitude handling** (D.VII): keeps control authority high where others get mushy.

### 5.4 Game mode (v1)

**Skirmish / Last-plane-flying.** Player vs a wave (start with 1–3) of opposing-faction
AI. Downing all enemies wins; being downed loses. Difficulty scales enemy count and
skill (§8). Keep the loop < 3 minutes for replayability.

---

## 6. Flight model

Authoritative detail: [arcade-flight-model](../knowledge/pocket-pilots/flight-model/arcade-flight-model.md).

- **Orientation via `THREE.Quaternion`** — never Euler (gimbal lock). Per frame, build
  small delta rotations about the plane's **local** axes (pitch=X, yaw=Y, roll=Z) from
  input and `quaternion.multiply()` them in.
- **Motion:** velocity along the local forward vector at a throttled speed; **bank-to-turn**
  (roll couples into yaw); light gravity/lift bias + drag. No aerodynamic equations.
- **Smoothing:** slerp toward target orientation; chase camera lerps to a point behind
  the plane. Fixed-timestep or delta-scaled updates for frame-rate independence.
- **Envelope per plane** comes from the §5.2 dials scaling shared base constants
  (max turn rate, top speed, climb rate, dive stress threshold).

**Controls (v1, keyboard + mouse; gamepad optional)**

| Action | Default |
|---|---|
| Pitch | W / S (or mouse Y) |
| Roll | ← / → (arrow keys) |
| Yaw (rudder) | A / D |
| Throttle up/down | ↑ / ↓ (arrow keys) |
| Fire guns | Space / Left-click |
| Auto-level assist (toggle) | on by default; releasing roll re-centres |
| Pause | Esc |

Keep it forgiving: assists on by default, roll auto-levels when input released
(toggleable for advanced players).

---

## 7. Combat & weapons

Authoritative detail: [combat-weapons](../knowledge/pocket-pilots/flight-model/combat-weapons.md).

- **Fixed forward-firing** guns — you aim the whole aircraft. Firepower scales by
  §5.2 `Firepower` and gun count (single-gun Nieuport is weaker).
- **Hit detection:** raycast (hitscan) from the muzzle, **or** instanced simulated
  tracers vs bounding spheres. Either is fine for a few targets. Use simple sphere/AABB
  colliders, not per-triangle.
- **Tracers:** bright streaks rendered as a single `InstancedMesh` (one draw call) so the
  player can walk fire onto a target.
- **Deflection:** hitting crossing targets needs leading; easiest kills are from directly
  astern — this naturally teaches getting on the enemy's tail (real WW1 doctrine).
  Optional lead indicator on easier difficulty.
- **Damage & health:** hit points scale with `Durability`. Damage states for readability
  — trailing **smoke** at low health → **fire** → spin-down + **cartoon explosion** (puffs
  and stars, bright and toy-like, no gore). → [art direction](../knowledge/pocket-pilots/art-direction/cel-shading.md)
- **Ammo:** limited magazines or a light heat/jam meter (optional) to discourage holding
  the trigger.

**Combat feel:** short effective range (get close), punchy feedback (sparks + hit-marker
sound), readable tracers. Reward the era's loop: climb, dive in from behind/above, fire
close, zoom away.

---

## 8. AI opponents

Authoritative detail: [ai-opponents](../knowledge/pocket-pilots/flight-model/ai-opponents.md).

- **Selection:** always the **opposing faction's** roster. Same flight model & dials as
  the player — no cheating stats.
- **State machine:** Patrol → Pursue (get astern) → Attack (burst fire in cone/range) →
  Evade (break/dive/scissor, respecting own `DiveSafety`) → Disengage/Reset.
- **Archetype-aware:** turn-fighters (Dr.I) circle; energy-fighters (Albatros) slash and
  climb away.
- **Difficulty** scales knobs, not physics: reaction time, aim error/lead accuracy,
  aggression, enemy count/formations, situational awareness.
- **Doctrine flavour (Dicta Boelcke):** seek altitude, attack from behind/out of the sun,
  fire close, keep enemy in view, meet head-on attacks head-on.

---

## 9. Art direction & rendering

Authoritative detail: [art-direction](../knowledge/pocket-pilots/art-direction/index.md)
and [threejs-rendering](../knowledge/pocket-pilots/tech-stack/threejs-rendering.md).

### 9.1 Cel-shading recipe

- **`MeshToonMaterial`** + a shared **3–4 band `DataTexture` gradient map**.
  **Set `minFilter = magFilter = THREE.NearestFilter`** — the #1 gotcha; without it the
  bands smear into soft gradients.
- **Inverted-hull outlines:** render each mesh again, scaled out along normals, front-face
  culled (`side: THREE.BackSide`), flat dark material → bold cartoon border. Per-object,
  cheap, LOD-friendly. Optional depth+normal Sobel post-pass later for cross-plane edges.
- **Plasticky look:** saturated base `color`; darkest band stays light (~35% value, never
  black); small `emissive` in the base hue; tight **hard** specular highlight;
  **rim light** for the toy sheen; `renderer.toneMapping = THREE.NoToneMapping`.

### 9.2 Palette & world

→ [color-palette](../knowledge/pocket-pilots/art-direction/color-palette.md)

- **Sky:** clean blue gradient (horizon `#8FD3FF` → zenith `#2E6FE0`) via gradient skybox.
- **Clouds:** soft rounded white cel puffs, **instanced**, for parallax/depth.
- **Ground (optional):** stylised distant Western-Front patchwork (fields + a river
  ribbon), low detail, for orientation only.
- **Lighting:** one warm directional **sun** (`#FFF6E0`, ~1.2) + **hemisphere fill**
  (sky `#BFE3FF` / ground `#6B7A3A`, ~0.5). Keeps shadow sides bright & sky-tinted.
- **Contrast rule:** planes must pop from the sky via dark outline + rim; avoid
  blue-dominant liveries.

### 9.3 Models & liveries

- Low-poly **`.glb`** per plane (flat/toon shading flatters low poly). Few/no textures —
  flat colour fields + decals. Build each plane around its **silhouette cues** (see each
  [aircraft](../knowledge/pocket-pilots/aircraft/index.md) concept): Dr.I's three wings,
  Camel's hump, Nieuport/Albatros V-strut + narrow lower wing, D.VII's thick cantilever
  wings + kidney radiator, Albatros's shark nose + spinner, SPAD's boxy fuselage.
- **Markings:** roundels / cocardes / Iron Cross-Balkenkreuz as decals; per-plane hero
  skins. → [markings-liveries](../knowledge/pocket-pilots/art-direction/markings-liveries.md)
- **Shared material:** one `MeshToonMaterial` + gradient map reused across planes
  (batching + look consistency), tinted per plane/team.

### 9.4 Camera

Third-person chase camera behind/above the player's plane, lerp-smoothed for the arcade
"on-rails but responsive" feel. Slight FOV widen with speed. Optional brief cinematic on
kills/death.

---

## 10. HUD & UI

- **HUD (Battle):** health/smoke indicator, ammo/heat, enemies remaining, a subtle target
  reticle, optional off-screen enemy arrows and lead indicator (difficulty-dependent),
  speed/altitude readout (stylised, era-flavoured gauges).
- **UI style:** clean, chunky, toy-catalogue aesthetic matching the cel look; HTML/CSS
  overlays over the canvas (no heavy UI framework).
- **Menus:** Title, Plane Select (§4.2), Result, Pause.

---

## 11. Audio

- Looping engine drone that pitches with throttle (distinct rotary vs inline timbre is a
  nice-to-have), machine-gun rattle, bullet impacts, wind, explosion, UI clicks.
- Light, punchy, cartoony mixing. Master mute toggle. Keep files small (compressed) for
  the static-bundle budget.

---

## 12. Data schema

Planes are **data**, consumed by one shared code path
([project-architecture](../knowledge/pocket-pilots/tech-stack/project-architecture.md)).
Suggested `src/data/aircraft.js` shape:

```js
export const AIRCRAFT = {
  fokker_dr1: {
    name: 'Fokker Dr.I',
    side: 'central',            // 'allied' | 'central'
    nation: 'Germany',
    config: 'triplane',
    model: 'fokker-dr1.glb',
    heroLivery: 'red-baron',
    dials: { turn: 0.95, speed: 0.50, climb: 0.85, diveSafety: 0.40, durability: 0.50, firepower: 0.70 },
    guns: 2,
    mechanics: { torqueBias: 0.15 }, // signature flavour flags
  },
  // ...five more, values from §5.2 and the aircraft bundle
};
```

Base constants (max turn rate, top speed, climb rate, dive-stress threshold, HP, DPS) live
in one tuning module and are scaled by each plane's dials.

---

## 13. Deployment

Authoritative detail: [deployment-github-pages](../knowledge/pocket-pilots/tech-stack/deployment-github-pages.md).

- Build with Vite; **set `base: '/pocket-pilots/'`** in `vite.config.js` — matching the
  repo name — or all assets 404 on Pages (the #1 deployment failure).
- Publish `dist/` via a GitHub Action (`upload-pages-artifact` + `deploy-pages`); set
  Pages source to "GitHub Actions."
- Load all assets relative to `base` (Vite imports or `import.meta.env.BASE_URL`), never
  absolute `/` paths.
- Static only — no server code, no custom headers.

---

## 14. Performance budget

Target **60 fps**. Rules from [threejs-rendering](../knowledge/pocket-pilots/tech-stack/threejs-rendering.md):

- Keep **draw calls < ~100**.
- **`InstancedMesh`** for bullets/tracers, clouds, distant AI planes.
- **Share materials/gradient map** across planes; a fresh material per object defeats
  batching.
- **LOD + frustum culling**; drop outlines on distant planes.
- **Dispose** unused geometries/materials/textures.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Low-poly GLBs, minimal textures; keep first load small.

---

## 15. Build milestones

Suggested order (each milestone independently runnable):

1. **Skeleton:** Vite project, Three.js scene, sky + sun + hemisphere fill, chase camera,
   an empty flat GitHub Pages deploy of the canvas.
2. **Cel-shading core:** `toon.js` — shared gradient map + `MeshToonMaterial` factory +
   inverted-hull outline helper, validated on a test mesh (bright + banded + outlined).
3. **Flight:** one placeholder plane (primitives), quaternion arcade flight, controls,
   chase-cam smoothing.
4. **Planes as data:** the six `aircraft.js` entries + dial-scaled envelopes; low-poly
   GLBs with silhouette cues and hero liveries.
5. **Combat:** guns, instanced tracers, hit detection, health/damage, cartoon explosions.
6. **AI:** opposing-faction enemy state machine + difficulty knobs.
7. **Screens & UI:** Title, Plane Select, Battle, Result; HUD.
8. **Audio + polish:** engine/gun/impact/explosion SFX, camera cinematics, particles.
9. **Perf pass:** instancing, LOD, material sharing, draw-call audit → lock 60 fps.
10. **Ship:** final GitHub Pages deploy.

---

## 16. Open questions

- **Round framing:** single skirmish vs waves vs endless — start with a short skirmish
  (§5.4), revisit after playtest.
- **Player death:** respawn vs round-end — v1 round-end (lose), tune later.
- **Deflection assist:** how much lead indicator on default difficulty — playtest.
- **Ground plane:** include the stylised Western Front or keep pure sky for v1 — pure sky
  is cheaper and matches "flying in the blue sky"; ground is a polish add.
- **Input on mouse vs keys** as the primary scheme — playtest both.

---

## Appendix — knowledge bundle map

The full grounding knowledge (OKF v0.2) lives at
[`/knowledge/pocket-pilots/`](../knowledge/pocket-pilots/index.md):

- [aircraft/](../knowledge/pocket-pilots/aircraft/index.md) — the six fighters.
- [factions/](../knowledge/pocket-pilots/factions/index.md) — Allied vs Central Powers.
- [flight-model/](../knowledge/pocket-pilots/flight-model/index.md) — flight, combat, AI.
- [art-direction/](../knowledge/pocket-pilots/art-direction/index.md) — cel-shading, palette, liveries.
- [tech-stack/](../knowledge/pocket-pilots/tech-stack/index.md) — Three.js, deployment, architecture.
