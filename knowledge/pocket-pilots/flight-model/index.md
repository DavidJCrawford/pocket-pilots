# Flight Model

How the aircraft fly, shoot, take damage, and how the AI behaves. This turns the
per-plane **handling reputations** from [aircraft](../aircraft/index.md) into concrete,
tunable arcade numbers.

* [Arcade flight model](arcade-flight-model.md) — quaternion orientation, bank-to-turn, per-plane tuning dials.
* [Combat & weapons](combat-weapons.md) — guns, tracers, hit detection, damage and health.
* [AI opponents](ai-opponents.md) — enemy pilot behaviour and difficulty.

Design pillar: **arcade, not simulation.** Fun, readable, forgiving flight that still
lets each plane feel distinct. Grounded in the tech patterns in
[Three.js rendering](../tech-stack/threejs-rendering.md).
