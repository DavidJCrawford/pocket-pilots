---
type: Art Direction
title: Markings & Liveries
description: National insignia and paint schemes — roundels, cocardes, Iron Cross/Balkenkreuz, lozenge camo, and per-plane hero skins — rendered stylised for cel shading.
tags: [art-direction, liveries, markings, insignia, decals]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
sources:
  - id: roundel
    resource: https://en.wikipedia.org/wiki/Roundel
    title: Roundel — Wikipedia
---

# National insignia (get these right — they define the sides)

| Side | Insignia | Detail |
|---|---|---|
| British (RFC/RAF) | **Roundel** | centre→rim **red–white–blue**; rudder striped, **blue at leading edge** |
| French | **Cocarde** | centre→rim **red–white–blue reversed** (blue on outer ring); rudder **blue at trailing edge** |
| German | **Iron Cross → Balkenkreuz** | flared-arm black cross (early) → straight-armed thick black cross w/ thin white outline (from Mar–Apr 1918) |

See the two [factions](../factions/index.md). Render insignia as simple **decals /
texture patches** or as flat geometry — crisp, high-contrast, cartoon-clean.

# Fabric & fuselage looks

- **Allied:** doped linen — natural cream/silver-grey early, **PC10 khaki-olive** uppers
  later. Bright French unit emblems (e.g. the stork).
- **German:** varnished plywood ([Albatros](../aircraft/albatros-d3.md)), streaky green
  factory dope, or **printed lozenge camouflage** (four/five-colour polygons, esp.
  [Fokker D.VII](../aircraft/fokker-d7.md)). Stylise lozenge as a clean repeating
  low-contrast polygon pattern so it doesn't fight the cel shading.

# Hero / default skins per plane

Pick one bold, recognisable livery per plane as its default:

- [Fokker Dr.I](../aircraft/fokker-dr1.md) — **all red** (von Richthofen, the "Red Baron"). The hero skin of the game.
- [Albatros D.III](../aircraft/albatros-d3.md) — **Jasta 11 red** with an individual accent stripe/chevron.
- [Fokker D.VII](../aircraft/fokker-d7.md) — **lozenge camo** with a bright squadron colour.
- [Sopwith Camel](../aircraft/sopwith-camel.md) — PC10 olive with **RAF roundels**.
- [SPAD S.XIII](../aircraft/spad-s13.md) — natural linen or camo with a **stork** unit emblem.
- [Nieuport 17](../aircraft/nieuport-17.md) — silver-grey with **French cocardes** (Nungesser-style personal mark optional).

# Implementation notes

- Reuse a shared decal texture atlas for insignia; tint per faction.
- Keep livery to flat colour fields + a few decals — cheap, and it reads best under the
  [cel-shading recipe](cel-shading.md).
- Distinct hero colours double as **friend/foe readability** at distance.
