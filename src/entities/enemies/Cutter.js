import { CONFIG } from '../../config.js?v=20260901134553';

// The anti-verb: ignores the trail as a wall, passes through it, and severs it
// from the crossing point back to the tail. Beelines for a point on the
// player's live open trail; if there's no meaningful trail, it pursues the
// player directly.
//
// Which trail point it aims for is a tunable (CONFIG.DEBUG.CUTTER_TARGETING —
// see the start screen). Literally-nearest-to-the-cutter (the spec's default
// phrasing) tends to collapse onto the abandoned tail in practice: the tail
// sits still while the head keeps racing away with the player, so "nearest"
// ends up meaning "wherever you started drawing," not "wherever the action
// is." Defaulting to nearest-to-the-player keeps it threatening the live part
// of the line instead.
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

  pickTrailTarget(player, trail) {
    switch (CONFIG.DEBUG.CUTTER_TARGETING) {
      case 'nearest_to_cutter':
        return trail.nearestPoint(this.x, this.y);
      case 'trail_midpoint':
        return trail.points[Math.floor(trail.points.length / 2)];
      case 'nearest_to_player':
      default:
        return trail.nearestPoint(player.x, player.y);
    }
  }

  update(player, trail, deltaSeconds) {
    let targetX = player.x;
    let targetY = player.y;

    if (!trail.isEmpty()) {
      const target = this.pickTrailTarget(player, trail);
      if (target) {
        targetX = target.x;
        targetY = target.y;
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
