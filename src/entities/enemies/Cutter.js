import { CONFIG } from '../../config.js';

// The anti-verb: ignores the trail as a wall, passes through it, and severs it
// from the crossing point back to the tail. Beelines for the nearest point on
// the player's live open trail; if there's no meaningful trail, it pursues the
// player directly.
export default class Cutter {
  static type = 'cutter';

  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = CONFIG.ENEMIES.CUTTER.RADIUS;
    this.alive = true;
    this.sprite = scene.add.rectangle(x, y, this.radius * 2, this.radius * 2, CONFIG.ENEMIES.CUTTER.COLOR);
    this.sprite.setAngle(45);
  }

  update(player, trail, deltaSeconds) {
    let targetX = player.x;
    let targetY = player.y;

    if (!trail.isEmpty()) {
      const nearest = trail.nearestPoint(this.x, this.y);
      if (nearest) {
        targetX = nearest.x;
        targetY = nearest.y;
      }
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = CONFIG.ENEMIES.CUTTER.SPEED;
    const from = { x: this.x, y: this.y };
    const to = { x: this.x + (dx / len) * speed * deltaSeconds, y: this.y + (dy / len) * speed * deltaSeconds };

    // Passes through the trail — but crossing it severs the trail behind the crossing.
    // Try a clean sweep-crossing first, falling back to radius-proximity so a slow
    // approach onto an existing trail point (a segment vertex) still counts as a cross.
    const hit = trail.blocksSegment(from, to) || trail.crossingNear(to, this.radius);
    if (hit) {
      trail.severAt(hit.index, hit.point);
    }

    this.x = to.x;
    this.y = to.y;
    this.sprite.setPosition(this.x, this.y);
  }

  destroy() {
    this.sprite.destroy();
  }
}
