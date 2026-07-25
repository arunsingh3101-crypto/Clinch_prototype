import { CONFIG } from '../../config.js?v=20260722a';
import { clamp } from '../../utils/geometry.js?v=20260722a';

// The coward: always runs directly away from the player, using the same
// trail-blocked wall-slide steering as Chaser (just pointed the other way).
// Can't outrun a corner — get it against a wall and it has nowhere left to
// flee, which is the intended way to catch one in a loop.
export default class Fleer {
  static type = 'fleer';

  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = CONFIG.ENEMIES.FLEER.RADIUS;
    this.alive = true;
    this.sprite = scene.add.rectangle(x, y, this.radius * 2, this.radius * 2, CONFIG.ENEMIES.FLEER.COLOR);
  }

  update(player, trail, deltaSeconds) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = CONFIG.ENEMIES.FLEER.SPEED;
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
    // Slide: try each axis independently so it flows along the wall/trail
    // instead of freezing dead the instant its escape line is blocked.
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
