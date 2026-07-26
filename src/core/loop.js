/**
 * Fixed-timestep game loop with render interpolation.
 *
 * The simulation advances in fixed `fixedDt` steps (frame-rate independent, stable
 * physics), while rendering happens once per animation frame with an `alpha` in [0,1)
 * describing how far we are between the last two sim steps — so entities can interpolate
 * for smooth motion. See knowledge/pocket-pilots/flight-model/arcade-flight-model.md.
 *
 * @param {object} cfg
 * @param {(dt:number)=>void} cfg.update    fixed-step simulation tick
 * @param {(alpha:number, frameDelta:number)=>void} cfg.render  per-frame render
 * @param {number} [cfg.fixedDt=1/60]       simulation step in seconds
 * @param {number} [cfg.maxFrame=0.25]      clamp on frame delta (avoids spiral of death)
 * @returns {()=>void} stop function
 */
export function startLoop({ update, render, fixedDt = 1 / 60, maxFrame = 0.25 }) {
  let last = performance.now() / 1000;
  let acc = 0;
  let running = true;

  function frame() {
    if (!running) return;
    const now = performance.now() / 1000;
    let delta = now - last;
    last = now;
    if (delta > maxFrame) delta = maxFrame;

    acc += delta;
    while (acc >= fixedDt) {
      update(fixedDt);
      acc -= fixedDt;
    }
    render(acc / fixedDt, delta);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return () => { running = false; };
}
