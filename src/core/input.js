/**
 * Keyboard input → semantic flight controls.
 * Control scheme (see docs/SPEC.md §6):
 *   W  climb (nose up)          S  dive (nose down)
 *   ←  roll left                →  roll right
 *   D  yaw left (rudder)        A  yaw right
 *   ↑  throttle up              ↓  throttle down
 */

// Codes we swallow so they don't scroll the page.
const BLOCKED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.mouseDown = false; // left mouse / trackpad click → fire
    target.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (BLOCKED.has(e.code)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouseDown = true; });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    // Release everything if the window loses focus (prevents stuck keys/buttons).
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
  }

  /** True if any of the given key codes is currently held. */
  anyDown(codes) {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  /** +1 if a "positive" key is held, -1 for "negative", 0 if neither/both. */
  #axis(neg, pos) {
    return (this.anyDown(pos) ? 1 : 0) - (this.anyDown(neg) ? 1 : 0);
  }

  /** Read the current semantic control state. All axes in [-1, 1]. */
  readControls() {
    return {
      pitch: this.#axis(['KeyS'], ['KeyW']), // +1 = nose up
      roll: this.#axis(['ArrowLeft'], ['ArrowRight']), // +1 = roll right
      yaw: this.#axis(['KeyD'], ['KeyA']), // +1 = yaw right (rudder); A = right, D = left
      throttle: this.#axis(['ArrowDown'], ['ArrowUp']), // +1 = up (↑ throttle up, ↓ down)
      fire: this.anyDown(['Space']) || this.mouseDown, // Space or left-click / trackpad tap
    };
  }
}
