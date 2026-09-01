import { CONFIG } from '../config.js?v=20260901123254';
import ArenaSim from '../core/ArenaSim.js?v=20260901123254';
import VirtualJoystick from '../systems/VirtualJoystick.js?v=20260901123254';
import Spawner from '../systems/Spawner.js?v=20260901123254';
import ScoreManager from '../systems/ScoreManager.js?v=20260901123254';

// Arcade mode. Owns the arcade-specific policy — pulsed wave spawner, scoring,
// HUD/overlay, restart — and drives a shared ArenaSim for the verb itself.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#10141a');

    // Arena bounds (outer walls only — Part 8). Not a loop boundary, purely visual + movement clamp.
    const g = this.add.graphics();
    g.lineStyle(3, 0x3a4552, 1);
    g.strokeRect(
      CONFIG.ARENA.WALL_MARGIN,
      CONFIG.ARENA.WALL_MARGIN,
      CONFIG.ARENA.WIDTH - CONFIG.ARENA.WALL_MARGIN * 2,
      CONFIG.ARENA.HEIGHT - CONFIG.ARENA.WALL_MARGIN * 2
    );

    this.scoreManager = new ScoreManager();
    this.sim = new ArenaSim(this, {
      // Arcade only kills, so killedCount === caughtCount here — same as before.
      onLoopResolved: (result, time) => this.scoreManager.registerLoop(result.killedCount, time),
    });
    this.joystick = new VirtualJoystick(this);
    this.spawner = new Spawner(this);
    this.gameOver = false;

    this.hudText = this.add.text(12, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8eef2',
    }).setDepth(2000);

    this.overlayText = this.add.text(CONFIG.ARENA.WIDTH / 2, CONFIG.ARENA.HEIGHT / 2, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setDepth(2000).setVisible(false);

    this.input.on('pointerdown', () => {
      if (this.gameOver) this.scene.restart();
    });
  }

  update(time, delta) {
    if (this.gameOver) return;

    const deltaSeconds = delta / 1000;
    const vec = this.joystick.getVector(deltaSeconds);

    this.sim.step(vec, time, deltaSeconds);

    this.spawner.update(time, this.sim.player, this.sim.enemies);
    this.scoreManager.update(time);
    this.updateHud();

    if (this.sim.player.health <= 0) {
      this.triggerGameOver();
    }
  }

  updateHud() {
    const sm = this.scoreManager;
    const player = this.sim.player;
    this.hudText.setText(
      `HP: ${'♥'.repeat(Math.max(0, player.health))}${'·'.repeat(Math.max(0, CONFIG.PLAYER.HEALTH - player.health))}\n` +
      `Score: ${sm.score}   Kills: ${sm.kills}   Combo: x${sm.multiplier.toFixed(1)}`
    );
  }

  triggerGameOver() {
    this.gameOver = true;
    const sm = this.scoreManager;
    this.overlayText.setText(
      `RUN OVER\n\nKills: ${sm.kills}\nScore: ${sm.score}\nBest combo: x${sm.bestMultiplier.toFixed(1)}\n\nTap to restart`
    ).setVisible(true);
  }
}
