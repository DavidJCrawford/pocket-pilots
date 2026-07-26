---
type: Aircraft
title: Sopwith Camel
description: British rotary-engined biplane fighter; twin Vickers, the "hump", and vicious right-turn gyroscopic torque. The Allied turn-fighter archetype.
tags: [aircraft, allied, uk, biplane, rotary, turn-fighter]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
sources:
  - id: wiki-camel
    resource: https://en.wikipedia.org/wiki/Sopwith_Camel
    title: Sopwith Camel — Wikipedia
    last_modified: 2026-07-25
---

# Real-world profile

The Sopwith Camel is the defining rotary-torque fighter of WW1 and the highest-scoring
Allied fighter of the war (~1,294 credited victories). Single-bay wire-braced biplane
with a wooden box-girder fuselage, aluminium cowling, and fabric covering. [^wiki-camel]

| Spec | Value |
|---|---|
| Side | Allied (United Kingdom) |
| Configuration | Single-bay biplane, rotary engine |
| Engine | Clerget 9B / Bentley BR1 / Le Rhône 9J rotary |
| Power | 110–150 hp (typically 130 hp) |
| Wingspan | 8.53 m |
| Length | 5.72 m |
| Height | 2.59 m |
| Max speed | 182 km/h (113 mph) |
| Service ceiling | 5,800 m (19,000 ft) |
| Climb | 5.51 m/s (1,085 ft/min) |
| Endurance | ~2.5 h (range ~480 km) |
| Armament | 2× synchronized .303 Vickers |

# Handling & reputation

The signature trait: ~90% of the mass (engine, guns, pilot, fuel) sat in the front
~7 ft, and the spinning rotary engine produced strong **gyroscopic precession**.

- **Right turns were extremely fast** (torque pulled the nose down); **left turns were
  sluggish** (nose pulled up). Expert pilots turned 270° right rather than 90° left to
  snap onto a target.
- Very tail-heavy with a vicious spin entry on the stall — deadly for novices
  ("a wooden cross, the Red Cross, or a Victoria Cross").
- In expert hands, supremely agile. A pure **turn-fighter**, not an energy fighter.

# Game tuning inputs

Feeds [the arcade flight model](../flight-model/arcade-flight-model.md).

- **Archetype:** Turn-fighter — high turn rate, modest top speed, poor dive.
- **Signature mechanic (optional flavour):** asymmetric yaw — a small yaw bias so
  right-hand turns feel snappier than left. Keep it readable, not punishing, for an
  arcade audience; expose as `torqueBias` tuning value.
- Relative dials (0–1): TurnRate **0.85**, TopSpeed **0.55**, Climb **0.55**,
  DiveSafety **0.5**, Durability **0.5**, Firepower **0.7** (twin guns).

# Silhouette — low-poly cues

For [cel-shaded modelling](../art-direction/cel-shading.md), the recognisable reads:

- The **"hump"** — the metal fairing over the twin gun breeches directly ahead of the
  cockpit (this named the aircraft). Non-negotiable identifying feature.
- Short, stubby fuselage; flat-topped rotary cowling with a cut-away front.
- Equal-span single-bay wings; slight dihedral on the **lower wing only**.

# Livery & markings

British doped linen, often **PC10 khaki-olive** upper surfaces with clear/cream
undersides. RAF/RFC **roundel** (centre→rim: red–white–blue) on wings and fuselage;
rudder striped with **blue at the leading edge**. See [markings & liveries](../art-direction/markings-liveries.md).
Belongs to the [Allied faction](../factions/allied.md).

[^wiki-camel]: Sopwith Camel — Wikipedia
