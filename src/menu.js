import { CONFIG } from './config.js?v=20260901124225';

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
const enemySpeedSlider = bindSlider('enemy-speed-slider', 'enemy-speed-value', (v) => `${v} px/s`);

const godModeCheckbox = document.getElementById('god-mode');
const spawningCheckbox = document.getElementById('enemy-spawning');
const typeChaserCheckbox = document.getElementById('type-chaser');
const typeShooterCheckbox = document.getElementById('type-shooter');
const typeCutterCheckbox = document.getElementById('type-cutter');
const typeDormantCheckbox = document.getElementById('type-dormant');
const typeFleerCheckbox = document.getElementById('type-fleer');
const cutterTargetingSelect = document.getElementById('cutter-targeting');

const pauseBtn = document.getElementById('pause-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');

// Tracks the live Phaser.Game instance so the pause controls (plain HTML,
// same reasoning as the rest of this file) can reach into it. Reassigned
// each time Start is pressed, since returning to the config screen destroys
// the previous instance outright rather than leaving it suspended.
let currentGame = null;

pauseBtn.addEventListener('click', () => {
  if (!currentGame) return;
  const scene = currentGame.scene.getScene('GameScene');
  if (!scene || scene.gameOver) return;
  currentGame.scene.pause('GameScene');
  pauseOverlay.style.display = 'flex';
});

resumeBtn.addEventListener('click', () => {
  if (!currentGame) return;
  currentGame.scene.resume('GameScene');
  pauseOverlay.style.display = 'none';
});

quitToMenuBtn.addEventListener('click', () => {
  pauseOverlay.style.display = 'none';
  pauseBtn.style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('menu-overlay').style.display = 'flex';
  if (currentGame) {
    currentGame.destroy(true);
    currentGame = null;
  }
});

document.getElementById('start-btn').addEventListener('click', () => {
  CONFIG.PLAYER.SPEED = Number(speedSlider.value);
  CONFIG.PLAYER.HEALTH = Number(healthSlider.value);
  CONFIG.TRAIL.LIFETIME_MS = Number(trailSlider.value);
  CONFIG.TRAIL.MIN_LOOP_AREA = Number(loopAreaSlider.value);
  CONFIG.ENEMIES.CHASER.SPEED = Number(enemySpeedSlider.value);
  CONFIG.ENEMIES.DORMANT.SPEED = Number(enemySpeedSlider.value);
  CONFIG.ENEMIES.FLEER.SPEED = Number(enemySpeedSlider.value);
  CONFIG.DEBUG.GOD_MODE = godModeCheckbox.checked;
  CONFIG.DEBUG.ENEMY_SPAWNING = spawningCheckbox.checked;
  CONFIG.DEBUG.ENEMY_TYPES = {
    chaser: typeChaserCheckbox.checked,
    shooter: typeShooterCheckbox.checked,
    cutter: typeCutterCheckbox.checked,
    dormant: typeDormantCheckbox.checked,
    fleer: typeFleerCheckbox.checked,
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
      import('./main.js?v=20260901124225')
        .then(({ startGame }) => {
          currentGame = startGame();
          pauseBtn.style.display = 'flex';
        })
        .catch((err) => {
          const el = document.getElementById('error-overlay');
          el.style.display = 'block';
          el.textContent += 'Failed to start game: ' + (err.stack || err.message || err) + '\n\n';
        });
    });
  });
});
