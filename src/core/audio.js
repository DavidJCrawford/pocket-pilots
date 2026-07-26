/**
 * Procedural audio via the Web Audio API — no sound files to ship. Everything is
 * synthesized from oscillators and noise, so it stays tiny and licence-free for the static
 * GitHub Pages build. See knowledge/pocket-pilots/... (§11 Audio in docs/SPEC.md).
 *
 * Browsers block audio until a user gesture, so call resume() from a click/keydown.
 */
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engine = null;
    this._noise = null;
  }

  #ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
  }

  /** Create/resume the context; safe to call repeatedly (idempotent). */
  resume() {
    this.#ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  #getNoise() {
    if (this._noise) return this._noise;
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  }

  // --- Engine drone (throttle-modulated, loops for the whole battle) ---
  startEngine() {
    this.#ensure();
    if (this.engine) return;
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = 55;
    const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 56; // beat/detune
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const gain = ctx.createGain(); gain.gain.value = 0.025;
    osc1.connect(lp); osc2.connect(lp); lp.connect(gain); gain.connect(this.master);
    osc1.start(); osc2.start();
    this.engine = { osc1, osc2, lp, gain };
  }

  setEngine(throttle) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    const base = 50 + throttle * 45; // lower-pitched drone (~50–95 Hz), but still audible on laptop speakers
    this.engine.osc1.frequency.setTargetAtTime(base, t, 0.06);
    this.engine.osc2.frequency.setTargetAtTime(base * 1.02, t, 0.06);
    this.engine.lp.frequency.setTargetAtTime(400 + throttle * 700, t, 0.06); // darker than before
    this.engine.gain.gain.setTargetAtTime(0.0225 + throttle * 0.01, t, 0.06); // quiet drone; guns sit well on top
  }

  stopEngine() {
    if (!this.engine) return;
    try { this.engine.osc1.stop(); this.engine.osc2.stop(); } catch { /* already stopped */ }
    this.engine = null;
  }

  // --- One-shot SFX ---
  #burst({ type = 'bandpass', freq = 1400, q = 0.8, peak = 0.4, attack = 0.005, decay = 0.08, vol = 1 }) {
    this.#ensure();
    if (this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.#getNoise();
    const filt = ctx.createBiquadFilter();
    filt.type = type; filt.frequency.value = freq; filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + decay + 0.02);
    return { ctx, t, g, filt };
  }

  gun(vol = 1) {
    // A crisp machine-gun "tack": a sharp high crack layered over a short low-end punch, so
    // each round reads clearly over the engine rumble.
    this.#burst({ type: 'bandpass', freq: 1900, q: 1.0, peak: 0.6, attack: 0.001, decay: 0.06, vol });
    this.#burst({ type: 'lowpass', freq: 360, q: 0.6, peak: 0.42, attack: 0.001, decay: 0.05, vol });
  }

  hit(vol = 1) {
    this.#burst({ type: 'bandpass', freq: 3200, q: 1.2, peak: 0.25, decay: 0.05, vol });
  }

  explosion(vol = 1) {
    // Noise body with a downward low-pass sweep...
    const b = this.#burst({ type: 'lowpass', freq: 1400, q: 0.4, peak: 0.6, attack: 0.01, decay: 0.6, vol });
    if (b) b.filt.frequency.exponentialRampToValueAtTime(180, b.t + 0.6);
    // ...plus a low sine "boom".
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx; const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.6);
  }

  click() {
    this.#ensure();
    if (this.muted) return;
    const ctx = this.ctx; const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 620;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.08);
  }
}
