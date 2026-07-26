import './style.css';
import { createRenderer } from './core/scene.js';
import { ScreenManager } from './core/screen.js';
import { startLoop } from './core/loop.js';
import { Audio } from './core/audio.js';
import { createTitleScreen } from './screens/title.js';
import { createSelectScreen } from './screens/select.js';
import { createBattleScreen } from './screens/battle.js';

/**
 * Bootstrap: one renderer, one loop, a screen manager driving
 * Title → Select → Battle → (Result → Select/Title). See docs/SPEC.md §4.
 */

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const manager = new ScreenManager();
const audio = new Audio();

// Browsers block audio until a user gesture — resume on the first interaction.
const resumeAudio = () => audio.resume();
window.addEventListener('pointerdown', resumeAudio);
window.addEventListener('keydown', resumeAudio);

// UI click sound on any button.
document.addEventListener('click', (e) => {
  if (e.target.closest('button')) audio.click();
});

// Mute toggle button.
const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊';
});

// Shared context handed to every screen: renderer, audio, and a navigation helper.
const ctx = {
  renderer,
  audio,
  go: (name, payload) => manager.set(screens[name], payload),
};

const screens = {
  title: createTitleScreen(ctx),
  select: createSelectScreen(ctx),
  battle: createBattleScreen(ctx),
};

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  manager.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

manager.set(screens.title);

startLoop({
  update: (dt) => manager.update(dt),
  render: (alpha, frameDelta) => manager.render(alpha, frameDelta),
});
