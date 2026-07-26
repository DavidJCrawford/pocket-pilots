import { createWorld } from '../core/scene.js';
import { buildAircraftModel } from '../game/plane-model.js';
import { AIRCRAFT, AIRCRAFT_ORDER } from '../data/aircraft.js';

/**
 * Plane Select: a roster of the six fighters grouped by side, a rotating 3D preview of the
 * focused plane in its hero livery, and a detail panel (nation, role, tuning dials).
 * "Fight!" launches the battle with the chosen plane.
 */

const DIALS = [
  ['turn', 'Turn'],
  ['speed', 'Speed'],
  ['climb', 'Climb'],
  ['diveSafety', 'Dive'],
  ['durability', 'Armor'],
  ['firepower', 'Guns'],
];

export function createSelectScreen(ctx) {
  const { scene, camera } = createWorld({ mood: 'dusk' });
  camera.position.set(3.6, 1.8, 6);
  camera.lookAt(0, 0.2, 0);

  let preview = null;
  let focusId = AIRCRAFT_ORDER[0];

  const dom = document.getElementById('screen-select');
  const detail = {
    name: document.getElementById('detail-name'),
    nation: document.getElementById('detail-nation'),
    role: document.getElementById('detail-role'),
    dials: document.getElementById('detail-dials'),
  };
  const rosterBtns = new Map();

  buildRoster();
  buildDialBars();

  function buildRoster() {
    const groups = { allied: document.getElementById('roster-allied'), central: document.getElementById('roster-central') };
    for (const id of AIRCRAFT_ORDER) {
      const def = AIRCRAFT[id];
      const btn = document.createElement('button');
      btn.className = 'roster-btn';
      btn.textContent = def.name;
      btn.addEventListener('click', () => setFocus(id));
      groups[def.side].appendChild(btn);
      rosterBtns.set(id, btn);
    }
  }

  function buildDialBars() {
    detail.dials.innerHTML = '';
    for (const [key, label] of DIALS) {
      const row = document.createElement('div');
      row.className = 'dial-row';
      row.innerHTML = `<span class="dial-label">${label}</span><span class="dial-bar"><i data-dial="${key}"></i></span>`;
      detail.dials.appendChild(row);
    }
  }

  function setPreview(id) {
    if (preview) {
      scene.remove(preview);
      preview.traverse((o) => o.geometry?.dispose?.());
    }
    const { group } = buildAircraftModel(AIRCRAFT[id]);
    scene.add(group);
    preview = group;
  }

  function setFocus(id) {
    focusId = id;
    setPreview(id);
    const def = AIRCRAFT[id];
    detail.name.textContent = def.name;
    detail.nation.textContent = `${def.nation} · ${def.side === 'allied' ? 'Allied' : 'Central Powers'}`;
    detail.role.textContent = def.role;
    for (const [key] of DIALS) {
      const bar = detail.dials.querySelector(`[data-dial="${key}"]`);
      if (bar) bar.style.width = `${Math.round(def.dials[key] * 100)}%`;
    }
    for (const [bid, btn] of rosterBtns) btn.classList.toggle('active', bid === id);
  }

  const backBtn = document.getElementById('select-back');
  const fightBtn = document.getElementById('select-fight');
  const onBack = () => ctx.go('title');
  const onFight = () => ctx.go('battle', { planeId: focusId });

  return {
    enter() {
      dom.style.display = 'flex';
      setFocus(focusId);
      backBtn.addEventListener('click', onBack);
      fightBtn.addEventListener('click', onFight);
    },
    exit() {
      dom.style.display = 'none';
      backBtn.removeEventListener('click', onBack);
      fightBtn.removeEventListener('click', onFight);
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    update(dt) {
      if (preview) preview.rotation.y += dt * 0.6;
    },
    render() {
      ctx.renderer.render(scene, camera);
    },
  };
}
