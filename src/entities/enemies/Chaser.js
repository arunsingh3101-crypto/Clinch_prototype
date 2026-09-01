import { CONFIG } from '../../config.js?v=20260901124225';
import { clamp } from '../../utils/geometry.js?v=20260901124225';

// Pure pursuit, slower than the player, blocked by the trail like a wall
// (basic wall-slide steering — enough for "paths around it" at prototype fidelity).
export default class Chaser {
  static type = 'chaser';

  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = CONFIG.ENEMIES.CHASER.RADIUS;
    this.alive = true;
    this.sprite = scene.add.rectangle(x, y, this.radius * 2, this.radius * 2, CONFIG.ENEMIES.CHASER.COLOR);
  }

  update(player, trail, deltaSeconds) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = CONFIG.ENEMIES.CHASER.SPEED;
    const stepX = (dx / len) * speed * deltaSeconds;
    const stepY = (dy / len) * speed * deltaSeconds;

    this.tryMove(trail, stepX, stepY);
    this.sprite.setPosition(this.x, this.y);
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
    // Slide: try each axis independently so the chaser flows along the wall.
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
