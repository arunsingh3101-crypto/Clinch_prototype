import { CONFIG } from '../config.js?v=20260725065836';
import { dist, pointInPolygon } from '../utils/geometry.js?v=20260725065836';
import Player from '../entities/Player.js?v=20260725065836';
import VirtualJoystick from '../systems/VirtualJoystick.js?v=20260725065836';
import Spawner from '../systems/Spawner.js?v=20260725065836';
import ScoreManager from '../systems/ScoreManager.js?v=20260725065836';

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

    this.player = new Player(this, CONFIG.ARENA.WIDTH / 2, CONFIG.ARENA.HEIGHT / 2);
    this.enemies = [];
    this.projectiles = [];
    this.joystick = new VirtualJoystick(this);
    this.spawner = new Spawner(this);
    this.scoreManager = new ScoreManager();
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

    this.player.move(vec.x, vec.y, deltaSeconds, time);
    this.player.trail.update(time);
    this.resolveLoop(time);

    this.updateEnemies(time, deltaSeconds);
    this.updateProjectiles(time, deltaSeconds);

    this.spawner.update(time, this.player, this.enemies);
    this.scoreManager.update(time);

    this.player.trail.draw(time);
    this.player.syncSprite();
    this.updateHud();

    if (this.player.health <= 0) {
      this.triggerGameOver();
    }
  }

  resolveLoop(time) {
    const hit = this.player.trail.checkSelfIntersection(time);
    if (!hit) return;

    const area = this.player.trail.areaFrom(hit.index, hit.point);
    if (area < CONFIG.TRAIL.MIN_LOOP_AREA) {
      // Inert no-op (Part 4.2): below minimum area, nothing happens — the trail continues.
      return;
    }

    const polygon = this.player.trail.polygonFrom(hit.index, hit.point);
    const caught = this.enemies.filter((e) => e.alive && pointInPolygon(e.x, e.y, polygon));
    for (const e of caught) {
      e.alive = false;
      e.destroy();
    }
    this.enemies = this.enemies.filter((e) => e.alive);

    this.scoreManager.registerLoop(caught.length, time);
    this.player.resetTrail(time);
  }

  updateEnemies(time, deltaSeconds) {
    for (const enemy of this.enemies) {
      if (enemy.constructor.type === 'shooter') {
        enemy.update(this.player, this.player.trail, time, deltaSeconds, this.projectiles);
      } else {
        enemy.update(this.player, this.player.trail, deltaSeconds);
      }

      if (enemy.constructor.type !== 'cutter') {
        const d = dist(enemy.x, enemy.y, this.player.x, this.player.y);
        if (d < enemy.radius + CONFIG.PLAYER.RADIUS) {
          this.player.takeDamage(1, time);
        }
      }
    }
  }

  updateProjectiles(time, deltaSeconds) {
    const survivors = [];
    for (const p of this.projectiles) {
      const stillAlive = p.update(this.player.trail, deltaSeconds);
      if (!stillAlive) {
        p.destroy();
        continue;
      }
      if (dist(p.x, p.y, this.player.x, this.player.y) < p.radius + CONFIG.PLAYER.RADIUS) {
        this.player.takeDamage(1, time);
        p.destroy();
        continue;
      }
      survivors.push(p);
    }
    this.projectiles = survivors;
  }

  updateHud() {
    const sm = this.scoreManager;
    this.hudText.setText(
      `HP: ${'♥'.repeat(Math.max(0, this.player.health))}${'·'.repeat(Math.max(0, CONFIG.PLAYER.HEALTH - this.player.health))}\n` +
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
