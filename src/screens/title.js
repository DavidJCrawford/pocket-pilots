import { createWorld } from '../core/scene.js';
import { buildAircraftModel } from '../game/plane-model.js';
import { AIRCRAFT } from '../data/aircraft.js';

/**
 * Title screen: the red Fokker Dr.I (the game's hero skin) bobbing and turning over the
 * blue sky, with a "Fight!" button that leads to Plane Select.
 */
export function createTitleScreen(ctx) {
  const { scene, camera } = createWorld({ mood: 'dusk' });
  camera.position.set(0, 2.3, 7.5);
  camera.lookAt(0, 2.0, 0); // tilt up so the hero plane sits low in frame, clear of the title plaque

  const { group: hero } = buildAircraftModel(AIRCRAFT.fokker_dr1);
  hero.position.y = 0.4;
  scene.add(hero);

  const dom = document.getElementById('screen-title');
  const fightBtn = document.getElementById('title-fight');
  const onFight = () => ctx.go('select');

  let t = 0;
  return {
    enter() {
      dom.style.display = 'flex';
      fightBtn.addEventListener('click', onFight);
    },
    exit() {
      dom.style.display = 'none';
      fightBtn.removeEventListener('click', onFight);
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    update(dt) {
      t += dt;
      hero.rotation.y += dt * 0.5;
      hero.position.y = 0.4 + Math.sin(t * 1.2) * 0.15;
    },
    render() {
      ctx.renderer.render(scene, camera);
    },
  };
}
