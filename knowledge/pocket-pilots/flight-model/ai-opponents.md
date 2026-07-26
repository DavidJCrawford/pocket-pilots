---
type: Flight Model
title: AI Opponents
description: Enemy pilots drawn from the opposing faction; a simple pursuit/evade state machine tuned per difficulty, following WW1 dogfight doctrine.
tags: [flight-model, ai, enemy, difficulty]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
---

# Selection rule

Enemy aircraft are always drawn from the **opposing** [faction](../factions/index.md)'s
roster. If the player picks an [Allied](../factions/allied.md) plane, opponents fly
[Central Powers](../factions/central-powers.md) types, and vice versa. Enemies use the
same [flight model](arcade-flight-model.md) and per-plane dials as the player — no cheating stats.

# Behaviour — simple state machine

- **Patrol/Cruise:** fly a loose path (or a "Vic" formation of three) until a target is
  detected.
- **Pursue:** turn toward the player's predicted position and try to get **astern**
  (low-deflection kill zone), respecting its own plane's strengths — turn-fighters
  ([Dr.I](../aircraft/fokker-dr1.md)) circle; energy-fighters
  ([Albatros](../aircraft/albatros-d3.md)) slash and climb away.
- **Attack:** when aligned within a cone and in range, fire in bursts.
- **Evade:** when damaged or on the player's guns, break — roll-and-pull away, dive, or
  scissor. Respect the plane's `DiveSafety` (fragile sesquiplanes shouldn't dive to death).
- **Disengage/Reset:** extend, regain altitude, re-enter — echoing real energy tactics.

# Difficulty tuning

Scale a small set of knobs, not the flight physics:

| Knob | Easy → Hard |
|---|---|
| Reaction time | slow → fast |
| Aim error / lead accuracy | large spread → tight |
| Aggression | cautious → relentless pursuit |
| Number of enemies | few → many / formations |
| Situational awareness | tunnel-vision → checks six |

# Doctrine flavour (Dicta Boelcke)

Bake the era's rules into AI priorities: seek altitude advantage, attack from behind and
out of the sun, fire only at close range, keep the enemy in view, and meet a head-on
attack head-on. This makes fights read as authentic WW1 dogfights, matching the
[theatre](../factions/index.md) the game depicts.
