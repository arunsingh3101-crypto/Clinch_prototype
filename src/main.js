import { CONFIG } from './config.js';
import GameScene from './scenes/GameScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CONFIG.ARENA.WIDTH,
  height: CONFIG.ARENA.HEIGHT,
  backgroundColor: '#10141a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: [GameScene],
});
