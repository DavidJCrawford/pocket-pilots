---
type: Flight Model
title: Combat & Weapons
description: Forward-firing machine guns with tracers, raycast/instanced-projectile hit detection, deflection shooting, and simple health/damage.
tags: [flight-model, combat, weapons, guns, damage]
generated: { by: pocket-pilots-research/claude-opus-4.8, at: 2026-07-25T00:00:00Z }
status: stable
---

# Weapons

WW1 fighters had **fixed, forward-firing** synchronized machine guns — you aim the whole
aircraft. See per-plane armament in [aircraft](../aircraft/index.md):

- Twin guns: [Camel](../aircraft/sopwith-camel.md), [SPAD](../aircraft/spad-s13.md),
  [Dr.I](../aircraft/fokker-dr1.md), [D.VII](../aircraft/fokker-d7.md),
  [Albatros](../aircraft/albatros-d3.md).
- Single gun: [Nieuport 17](../aircraft/nieuport-17.md) — lower `Firepower`.

Model as a `Firepower` DPS scaled by gun count, with limited ammo or a heat/jam meter
(optional) to discourage holding fire.

# Projectiles & hit detection

Two viable approaches; either works for a handful of targets:

- **Raycast (hitscan):** on fire, cast a ray from the muzzle along the nose; if it hits
  an enemy collider within range, apply damage. Cheap and precise.
- **Simulated tracers:** spawn fast projectiles as a single **`InstancedMesh`** (many
  bullets, one draw call — see [rendering](../tech-stack/threejs-rendering.md)); step
  them each frame and test against enemy bounding spheres.

Render bright **tracer** streaks so the player can walk fire onto a target. Use simple
sphere/AABB colliders on aircraft, not per-triangle collision.

# Deflection & aiming

Guns are fixed, so hitting a crossing target requires **leading** it (deflection
shooting) — historically a prized skill. Most kills came from **directly astern** where
deflection is near zero, which naturally teaches players to get on the enemy's tail.
Optionally draw a subtle **lead indicator** on easier difficulties.

# Damage & health

- Each plane has hit points scaled by `Durability`.
- Optional damage states for readability: trailing **smoke** at low health, then fire,
  then a spin-down + explosion on death (all cel-shaded, cartoony — puffs and stars, not
  gore). Keep it bright and toy-like per [art direction](../art-direction/cel-shading.md).
- **No parachutes** historically early-war; in-game a downed plane simply respawns or
  ends the round depending on [game mode](../../docs/SPEC.md).

# Feel

Short effective range (get close), punchy hit feedback (sparks, a hit-marker sound), and
readable tracers. The combat loop should reward the era's real doctrine: gain altitude,
dive in from behind/above, fire close, zoom away.
