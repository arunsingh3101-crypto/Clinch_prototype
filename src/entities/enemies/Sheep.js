import { CONFIG } from '../../config.js?v=20260901124225';
import { clamp } from '../../utils/geometry.js?v=20260901124225';
import Chaser from './Chaser.js?v=20260901124225';

// Tutorial sheep (spec §1.6, §5): instantiated as a chaser-variant — it reuses
// Chaser's trail-aware movement (tryMove / slide / clamp), not a new system —
// but with:
//   - aggro disabled (it never pursues the player; no threat, no contact damage)
//   - a movement-style reaction: a fast, DIRECT player approach scatters it,
//     a slow/careful or tangential approach does not (§1.6). This is its own
//     simple trigger, separate from the trail alert pulse (which doesn't exist
//     yet at this point in the tutorial).
//   - resolution type 'pen': a loop closed around it pens rather than kills,
//     via the same loop-close trigger and the onPenned outcome handler (§1.6).
export default class Sheep extends Chaser {
  static type = 'sheep';

  constructor(scene, x, y, options = {}) {
    super(scene, x, y);
    const S = CONFIG.STORY.SHEEP;
    this.radius = S.RADIUS;
    this.dealsContactDamage = false; // zero aggro — never hurts the player
    this.resolution = 'pen'; // loop-close pens instead of killing
    this.pen = options.pen || null; // where a penned sheep is corralled to
    this.penned = false;

    // Scatter / graze state.
    this.scatterUntil = 0;
    this.scatterDx = 0;
    this.scatterDy = 0;
    this.grazeTargetX = x;
    this.grazeTargetY = y;
    this.grazeRetargetAt = 0;

    // Reskin the inherited chaser rectangle.
    this.sprite.setFillStyle(S.COLOR);
    this.sprite.setSize(this.radius * 2, this.radius * 2);
  }

  update(player, trail, deltaSeconds) {
    const S = CONFIG.STORY.SHEEP;
    const now = this.scene.time.now;

    // §1.6 movement-style reaction: scatter only on a fast, direct approach.
    const toX = this.x - player.x;
    const toY = this.y - player.y;
    const d = Math.hypot(toX, toY) || 1;
    if (d < S.SCATTER_RADIUS) {
      const dirX = toX / d;
      const dirY = toY / d;
      // Closing speed = player's velocity projected onto player→sheep. High and
      // positive means "coming straight at me fast"; tangential/slow/away is low.
      const closing = player.vx * dirX + player.vy * dirY;
      if (closing > S.SCATTER_CLOSING_SPEED) this.scatterAwayFrom(player.x, player.y, now);
    }

    let stepX = 0;
    let stepY = 0;
    if (now < this.scatterUntil) {
      stepX = this.scatterDx * S.SCATTER_SPEED * deltaSeconds;
      stepY = this.scatterDy * S.SCATTER_SPEED * deltaSeconds;
    } else {
      // Graze: drift slowly toward a periodically-chosen nearby point.
      if (now >= this.grazeRetargetAt) this.pickGrazeTarget(now);
      const gx = this.grazeTargetX - this.x;
      const gy = this.grazeTargetY - this.y;
      const gl = Math.hypot(gx, gy);
      if (gl > 4) {
        stepX = (gx / gl) * S.GRAZE_SPEED * deltaSeconds;
        stepY = (gy / gl) * S.GRAZE_SPEED * deltaSeconds;
      }
    }

    this.tryMove(trail, stepX, stepY); // reused Chaser movement (trail wall + slide)
    this.sprite.setPosition(this.x, this.y);
  }

  // Flee directly away from a threat point for a short burst. Shared entry point
  // for both the §1.6 player reaction and the dog's nudge.
  scatterAwayFrom(px, py, now) {
    const dx = this.x - px;
    const dy = this.y - py;
    const l = Math.hypot(dx, dy) || 1;
    this.scatterDx = dx / l;
    this.scatterDy = dy / l;
    this.scatterUntil = now + CONFIG.STORY.SHEEP.SCATTER_DURATION_MS;
  }

  // The shepherd dog drives a sheep by nudging it away from the dog's position.
  nudge(px, py, now) {
    this.scatterAwayFrom(px, py, now);
  }

  pickGrazeTarget(now) {
    const S = CONFIG.STORY.SHEEP;
    const margin = CONFIG.ARENA.WALL_MARGIN + this.radius;
    this.grazeTargetX = clamp(this.x + (Math.random() - 0.5) * 120, margin, CONFIG.ARENA.WIDTH - margin);
    this.grazeTargetY = clamp(this.y + (Math.random() - 0.5) * 120, margin, CONFIG.ARENA.HEIGHT - margin);
    this.grazeRetargetAt = now + S.GRAZE_RETARGET_MS * (0.6 + Math.random() * 0.8);
  }

  // Pen outcome (spec §1.6): corral into the pen and grey out rather than die.
  // ArenaSim keeps the sprite alive (tracked for teardown) so the penned flock
  // stays visible.
  onPenned(sim, now) {
    this.penned = true;
    if (this.pen) {
      this.x = this.pen.x + (Math.random() - 0.5) * this.pen.w * 0.7;
      this.y = this.pen.y + (Math.random() - 0.5) * this.pen.h * 0.7;
    }
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setFillStyle(CONFIG.STORY.SHEEP.PENNED_COLOR);
  }
}
