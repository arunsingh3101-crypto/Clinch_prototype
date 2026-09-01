import { CONFIG } from './config.js?v=20260901135929';
import GameScene from './scenes/GameScene.js?v=20260901135929';
import StoryScene from './scenes/StoryScene.js?v=20260901135929';

// `mode` selects the starting scene: 'arcade' (default) or 'story'. The menu
// will pass this once the Story/Arcade toggle lands; until then a '#story' URL
// hash is a dev entry into story mode. The first scene in the array autostarts;
// the other stays registered but inactive.
export function startGame(mode = 'arcade') {
  const hash = (typeof location !== 'undefined' ? location.hash.replace('#', '') : '');
  // Dev entry: '#story' (optionally '#story&beat=N' to jump to a beat).
  const useStory = mode === 'story' || hash.startsWith('story');

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
    scene: useStory ? [StoryScene, GameScene] : [GameScene, StoryScene],
  });

  // Belt-and-suspenders against the container having been display:none until
  // just before this call: force the scale manager to re-measure its parent
  // once boot completes, in case its own resize-detection missed the
  // none->visible transition on a given browser.
  game.events.once(Phaser.Core.Events.READY, () => game.scale.refresh());

  return game;
}
