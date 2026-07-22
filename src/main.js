import { CONFIG } from './config.js?v=20260722a';
import GameScene from './scenes/GameScene.js?v=20260722a';

export function startGame() {
  const game = new Phaser.Game({
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

  // Belt-and-suspenders against the container having been display:none until
  // just before this call: force the scale manager to re-measure its parent
  // once boot completes, in case its own resize-detection missed the
  // none->visible transition on a given browser.
  game.events.once(Phaser.Core.Events.READY, () => game.scale.refresh());

  return game;
}
