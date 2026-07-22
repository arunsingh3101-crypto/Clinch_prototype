import { CONFIG } from './config.js';

// Wires the start-screen overlay (plain HTML for touch-friendly native
// sliders/checkboxes) to CONFIG before the Phaser game is created. Playtest
// knobs only — mirrors a subset of the Part 11 tuning knobs plus two
// debug-only conveniences (god mode, enemy spawning) that aren't part of the
// design spec, just useful for isolating movement/trail testing from combat.

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

document.getElementById('start-btn').addEventListener('click', () => {
  CONFIG.PLAYER.SPEED = Number(speedSlider.value);
  CONFIG.PLAYER.HEALTH = Number(healthSlider.value);
  CONFIG.TRAIL.LIFETIME_MS = Number(trailSlider.value);
  CONFIG.TRAIL.MIN_LOOP_AREA = Number(loopAreaSlider.value);
  CONFIG.DEBUG.GOD_MODE = godModeCheckbox.checked;
  CONFIG.DEBUG.ENEMY_SPAWNING = spawningCheckbox.checked;

  document.getElementById('menu-overlay').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';

  import('./main.js').then(({ startGame }) => startGame());
});
