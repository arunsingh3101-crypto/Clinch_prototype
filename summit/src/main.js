import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { EndScene } from './scenes/EndScene.js';
import { params } from './globals.js';
import { sfx } from './audio/Sfx.js';

window.Phaser = Phaser; // RetroFont etc. referenced as a global in Art.js

// audio can only start from a user gesture
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => sfx.unlock(), { passive: true });
if (params.get('mute') === '1') sfx.toggleMute();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0d0e1a',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60 },
  input: { keyboard: false, touch: false, mouse: false },
  audio: { noAudio: true },
  scene: [BootScene, TitleScene, GameScene, EndScene],
});
window.__game = game;

// re-fit when the phone rotates or the touch layout changes the container
const refit = () => setTimeout(() => game.scale.refresh(), 50);
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', refit);
new MutationObserver(refit).observe(document.body, { attributes: true, attributeFilter: ['class'] });
