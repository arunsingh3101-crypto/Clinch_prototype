import { CONFIG } from '../config.js?v=20260725065836';

export default class Projectile {
  constructor(scene, x, y, dirX, dirY) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.alive = true;
    this.radius = CONFIG.ENEMIES.SHOOTER.PROJECTILE_RADIUS;
    this.sprite = scene.add.circle(x, y, this.radius, 0xf1c40f);
  }

  // Returns false if the projectile should be removed this frame (blocked or off-arena).
  update(trail, deltaSeconds) {
    const speed = CONFIG.ENEMIES.SHOOTER.PROJECTILE_SPEED;
    const from = { x: this.x, y: this.y };
    const to = { x: this.x + this.dirX * speed * deltaSeconds, y: this.y + this.dirY * speed * deltaSeconds };

    if (trail.blocksSegment(from, to)) {
      this.alive = false;
      return false;
    }

    this.x = to.x;
    this.y = to.y;
    this.sprite.setPosition(this.x, this.y);

    if (
      this.x < 0 || this.x > CONFIG.ARENA.WIDTH ||
      this.y < 0 || this.y > CONFIG.ARENA.HEIGHT
    ) {
      this.alive = false;
      return false;
    }
    return true;
  }

  destroy() {
    this.sprite.destroy();
  }
}
