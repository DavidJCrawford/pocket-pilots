/**
 * Minimal screen state machine. Each screen is an object with optional
 * enter(payload) / exit() / update(dt) / render(alpha, frameDelta) / resize(w, h).
 * The active screen owns what's drawn; switching runs exit() then enter().
 */
export class ScreenManager {
  constructor() {
    this.current = null;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
  }

  set(screen, payload) {
    if (!screen || screen === this.current) {
      // Allow re-entering the same screen (e.g. "refly") explicitly.
      if (screen && screen === this.current) {
        this.current.exit?.();
        this.current.enter?.(payload);
        this.current.resize?.(this.w, this.h);
      }
      return;
    }
    this.current?.exit?.();
    this.current = screen;
    screen.enter?.(payload);
    screen.resize?.(this.w, this.h);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.current?.resize?.(w, h);
  }

  update(dt) { this.current?.update?.(dt); }
  render(alpha, frameDelta) { this.current?.render?.(alpha, frameDelta); }
}
