import { CONFIG } from '../../config.js?v=20260901135929';
import Projectile from '../Projectile.js?v=20260901135929';

// Stationary-ish; fires aimed shots on a cadence. Its job is to punish camping —
// the trail blocks its shots, so the player can shield behind their own line.
export default class Shooter {
  static type = 'shooter';

  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = CONFIG.ENEMIES.SHOOTER.RADIUS;
    this.alive = true;
    this.nextFireAt = scene.time.now + Phaser.Math.Between(200, CONFIG.ENEMIES.SHOOTER.FIRE_INTERVAL_MS);
    this.sprite = scene.add.rectangle(x, y, this.radius * 2, this.radius * 2, CONFIG.ENEMIES.SHOOTER.COLOR);
  }

  update(player, trail, now, deltaSeconds, projectiles) {
    // Slow drift toward the player so it isn't a totally static turret, but it's
    // still blocked by the trail like any other threat.
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CONFIG.ENEMIES.SHOOTER.MIN_RANGE * 1.5) {
      const speed = CONFIG.ENEMIES.SHOOTER.SPEED;
      const stepX = (dx / dist) * speed * deltaSeconds;
      const stepY = (dy / dist) * speed * deltaSeconds;
      const from = { x: this.x, y: this.y };
      const to = { x: this.x + stepX, y: this.y + stepY };
      if (!trail.blocksSegment(from, to)) {
        this.x = to.x;
        this.y = to.y;
      }
    }

    if (now >= this.nextFireAt && dist >= CONFIG.ENEMIES.SHOOTER.MIN_RANGE) {
      this.nextFireAt = now + CONFIG.ENEMIES.SHOOTER.FIRE_INTERVAL_MS;
      projectiles.push(new Projectile(this.scene, this.x, this.y, dx / dist, dy / dist));
    }

    this.sprite.setPosition(this.x, this.y);
  }

  destroy() {
    this.sprite.destroy();
  }
}
