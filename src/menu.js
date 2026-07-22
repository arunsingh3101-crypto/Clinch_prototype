import { CONFIG } from './config.js';

// Wires the start-screen overlay (plain HTML for touch-friendly native
// sliders/checkboxes) to CONFIG before the Phaser game is created. Playtest
// knobs only — mirrors a subset of the Part 11 tuning knobs plus debug-only
// conveniences (god mode, enemy spawning, per-type spawn filters, cutter
// targeting mode) that aren't part of the design spec, just useful for
// isolating specific mechanics to test on their own.

function bindSlider(sliderId, valueId, format = (v) => v) {
  const slider = document.getElementById(sliderId);
  const valueEl = document.getElementById(valueId);
  const update = () => { valueEl.textContent = format(Number(slider.value)); };
  slider.addEventListener('input', update);
  update();
  return slider;
}

const speedSlider = bindSlider('speed-slider', 'speed-value', (v) => `${v} px/s`);
const trailSlider = bindSlider('trail-slider', 'trail-value', (v) => `${(v / 1000).toFixed(1)}s`);
const loopAreaSlider = bindSlider('looparea-slider', 'looparea-value');
const healthSlider = bindSlider('health-slider', 'health-value', (v) => `${v} hits`);

const godModeCheckbox = document.getElementById('god-mode');
const spawningCheckbox = document.getElementById('enemy-spawning');
const typeChaserCheckbox = document.getElementById('type-chaser');
const typeShooterCheckbox = document.getElementById('type-shooter');
const typeCutterCheckbox = document.getElementById('type-cutter');
const cutterTargetingSelect = document.getElementById('cutter-targeting');

document.getElementById('start-btn').addEventListener('click', () => {
  CONFIG.PLAYER.SPEED = Number(speedSlider.value);
  CONFIG.PLAYER.HEALTH = Number(healthSlider.value);
  CONFIG.TRAIL.LIFETIME_MS = Number(trailSlider.value);
  CONFIG.TRAIL.MIN_LOOP_AREA = Number(loopAreaSlider.value);
  CONFIG.DEBUG.GOD_MODE = godModeCheckbox.checked;
  CONFIG.DEBUG.ENEMY_SPAWNING = spawningCheckbox.checked;
  CONFIG.DEBUG.ENEMY_TYPES = {
    chaser: typeChaserCheckbox.checked,
    shooter: typeShooterCheckbox.checked,
    cutter: typeCutterCheckbox.checked,
  };
  CONFIG.DEBUG.CUTTER_TARGETING = cutterTargetingSelect.value;

  document.getElementById('menu-overlay').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';

  // Wait for a real layout pass before Phaser measures the now-visible
  // container for its FIT scale calculation — going straight from
  // display:none to creating the game in the same tick risks measuring a
  // still-zero-sized element on some browsers. Two rAFs guarantee at least
  // one full layout/paint has happened first.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      import('./main.js')
        .then(({ startGame }) => startGame())
        .catch((err) => {
          const el = document.getElementById('error-overlay');
          el.style.display = 'block';
          el.textContent += 'Failed to start game: ' + (err.stack || err.message || err) + '\n\n';
        });
    });
  });
});
