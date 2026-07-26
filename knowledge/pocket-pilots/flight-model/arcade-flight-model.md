---
type: Flight Model
title: Arcade Flight Model
description: Quaternion-based arcade flight — velocity along the nose plus light forces and bank-to-turn — with per-plane tuning dials derived from historical handling.
tags: [flight-model, physics, arcade, quaternion]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
sources:
  - id: forum-flight
    resource: https://discourse.threejs.org/t/simplified-flight-model/15058
    title: Simplified flight model — three.js forum
  - id: web-flight-sim
    resource: https://github.com/dimartarmizi/web-flight-simulator
    title: web-flight-simulator (Three.js arcade flight)
---

# Design intent

Arcade, not aerodynamic simulation. The plane flies forward along its own nose; the
player banks and pulls to turn; light gravity and drag give weight without realism.
Every plane must still feel distinct via the tuning dials below.

# Orientation — use quaternions

Represent aircraft attitude with a `THREE.Quaternion`, **never Euler angles** (Euler
gimbal-locks in loops and rolls). Each frame, build small delta rotations around the
plane's **local** axes from input and multiply them in: [^forum-flight]

- Pitch → rotate about local **X**
- Yaw → rotate about local **Y**
- Roll → rotate about local **Z**
- `plane.quaternion.multiply(deltaQuat)` — order-independent, clean 3D maneuvering.

If any Euler is needed for the camera, use order `'YXZ'`.

# Motion model

- **Forward velocity:** move along the plane's local forward vector at a throttled speed
  (`throttle` between a stall floor and the plane's TopSpeed). [^web-flight-sim]
- **Bank-to-turn:** couple roll into yaw so banking curves the flight path (the arcade
  "on-rails but responsive" feel).
- **Light forces:** a gentle gravity/lift bias (nose-down sags, hard climb bleeds speed)
  and simple drag. No lift equations.
- **Smoothing:** slerp toward target orientation; lerp the chase camera toward a point
  behind the plane. Use delta-time-scaled or fixed-timestep updates for frame-rate
  independence.

# Per-plane tuning dials

Each aircraft exposes normalized dials (0–1) that scale base constants. Source values
live in each [aircraft](../aircraft/index.md) concept ("Game tuning inputs").

| Dial | Meaning | Drives |
|---|---|---|
| `TurnRate` | sustained turn/roll authority | angular speed of pitch/yaw/roll |
| `TopSpeed` | max level speed | forward velocity cap |
| `Climb` | climb performance | vertical climb rate, energy retention up |
| `DiveSafety` | structural dive tolerance | dive-damage threshold (see below) |
| `Durability` | health pool | hit points |
| `Firepower` | gun output | DPS, tied to gun count in [combat](combat-weapons.md) |

# Signature mechanics (flavour, keep readable)

- **Rotary torque** ([Camel](../aircraft/sopwith-camel.md), [Dr.I](../aircraft/fokker-dr1.md)):
  optional small yaw bias making right turns snappier. Expose as `torqueBias`; tune for
  feel, not frustration.
- **Structural dive limit** ([Nieuport 17](../aircraft/nieuport-17.md),
  [Albatros D.III](../aircraft/albatros-d3.md)): sustained high-speed dives accrue wing
  stress; crossing `DiveSafety` degrades control or fails a wing. Energy fighters like
  the [SPAD](../aircraft/spad-s13.md) have near-immunity (high `DiveSafety`).
- **Low-speed penalty** ([SPAD](../aircraft/spad-s13.md)): reduced control authority /
  higher stall risk below a speed threshold — rewards keeping energy up.
- **Altitude handling** ([D.VII](../aircraft/fokker-d7.md)): retains control authority at
  high altitude where others get "mushy."

# Controls (target)

Keyboard/mouse primary; gamepad optional. Pitch/roll on the main axis, yaw on shoulder
keys, throttle up/down, fire. Keep the scheme forgiving — assist auto-levels roll when
input is released (toggleable).
