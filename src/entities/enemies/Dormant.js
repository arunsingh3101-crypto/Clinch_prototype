import { CONFIG } from '../../config.js?v=20260725061932';
import { clamp, dist } from '../../utils/geometry.js?v=20260725061932';

// Ambush type: inert outside its activation band. Only closes in on the
// player while they're within [ACTIVATE_MIN_DIST, ACTIVATE_MAX_DIST] of it —
// too close or too far and it goes stationary again. Uses the same
// trail-blocked wall-slide steering as Chaser while active.
export default class Dormant {
  static type = 'dormant';

  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = CONFIG.ENEMIES.DORMANT.RADIUS;
    this.alive = true;
    this.active = false;
    this.sprite = scene.add.rectangle(x, y, this.radius * 2, this.radius * 2, CONFIG.ENEMIES.DORMANT.COLOR);
    this.sprite.setStrokeStyle(2, 0xffffff, 0.5);
  }

  update(player, trail, deltaSeconds) {
    const cfg = CONFIG.ENEMIES.DORMANT;
    const d = dist(this.x, this.y, player.x, player.y);
    this.active = d >= cfg.ACTIVATE_MIN_DIST && d <= cfg.ACTIVATE_MAX_DIST;

    if (this.active) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = cfg.SPEED;
      const stepX = (dx / len) * speed * deltaSeconds;
      const stepY = (dy / len) * speed * deltaSeconds;
      this.tryMove(trail, stepX, stepY);
    }

    this.sprite.setPosition(this.x, this.y);
    this.sprite.setStrokeStyle(2, this.active ? 0xffffff : 0x2a323d, this.active ? 0.8 : 0.5);
  }

  tryMove(trail, stepX, stepY) {
    const from = { x: this.x, y: this.y };
    const full = { x: this.x + stepX, y: this.y + stepY };
    if (!trail.blocksSegment(from, full)) {
      this.x = full.x;
      this.y = full.y;
      this.clampToArena();
      return;
    }
    // Slide: try each axis independently so it flows along the wall.
    const onlyX = { x: this.x + stepX, y: this.y };
    if (!trail.blocksSegment(from, onlyX)) {
      this.x = onlyX.x;
      this.clampToArena();
      return;
    }
    const onlyY = { x: this.x, y: this.y + stepY };
    if (!trail.blocksSegment(from, onlyY)) {
      this.y = onlyY.y;
      this.clampToArena();
    }
  }

  clampToArena() {
    const margin = CONFIG.ARENA.WALL_MARGIN + this.radius;
    this.x = clamp(this.x, margin, CONFIG.ARENA.WIDTH - margin);
    this.y = clamp(this.y, margin, CONFIG.ARENA.HEIGHT - margin);
  }

  destroy() {
    this.sprite.destroy();
  }
}
