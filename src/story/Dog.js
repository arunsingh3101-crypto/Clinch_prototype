import { CONFIG } from '../config.js?v=20260901140734';
import { dist } from '../utils/geometry.js?v=20260901140734';
import Chaser from '../entities/enemies/Chaser.js?v=20260901140734';

// Shepherd dog (spec §2 beat 2). An autonomous assist — no new player input.
// It extends Chaser purely to reuse the trail-aware movement (tryMove/slide/
// clamp), so it routes around the player's active trail and never crosses it.
// It is NOT an enemy: it is not in the sim's enemy list, deals no damage, and
// can't be looped.
//
// Behavior (from the spec's open-constants list): each frame it targets the
// MOST ISOLATED sheep (largest nearest-neighbor distance), positions itself just
// beyond that sheep on the side AWAY FROM THE FLOCK, and — on a short cooldown —
// nudges it, so the sheep flees toward the flock centroid. Speed stays capped at
// or below the player's.
export default class Dog extends Chaser {
  static type = 'dog';

  constructor(scene, x, y) {
    super(scene, x, y);
    const D = CONFIG.STORY.DOG;
    this.radius = D.RADIUS;
    this.nudgeReadyAt = 0;
    this.sprite.setFillStyle(D.COLOR);
    this.sprite.setSize(this.radius * 2, this.radius * 2);
  }

  // Driven by StoryScene after the sim step, with the current live sheep list.
  update(player, trail, sheep, deltaSeconds, now) {
    const D = CONFIG.STORY.DOG;
    const flock = sheep.filter((s) => s.alive && !s.penned);
    if (flock.length === 0) return;

    // Most isolated sheep = the one whose nearest flockmate is farthest away.
    let target = flock[0];
    let bestIso = -1;
    for (const s of flock) {
      let nearest = Infinity;
      for (const o of flock) {
        if (o === s) continue;
        const dd = dist(s.x, s.y, o.x, o.y);
        if (dd < nearest) nearest = dd;
      }
      if (nearest === Infinity) nearest = 0; // lone sheep
      if (nearest > bestIso) { bestIso = nearest; target = s; }
    }

    // Flock centroid (excluding the target); fall back to the player if the
    // target is the only sheep left.
    let cx = 0;
    let cy = 0;
    let n = 0;
    for (const s of flock) {
      if (s === target) continue;
      cx += s.x; cy += s.y; n++;
    }
    if (n > 0) { cx /= n; cy /= n; } else { cx = player.x; cy = player.y; }

    // Aim for a standoff point just beyond the target, away from the flock, so a
    // nudge sends the sheep back toward the flock.
    let ax = target.x - cx;
    let ay = target.y - cy;
    const al = Math.hypot(ax, ay) || 1;
    const apX = target.x + (ax / al) * D.STANDOFF;
    const apY = target.y + (ay / al) * D.STANDOFF;

    const mx = apX - this.x;
    const my = apY - this.y;
    const ml = Math.hypot(mx, my) || 1;
    const step = D.SPEED * deltaSeconds;
    this.tryMove(trail, (mx / ml) * step, (my / ml) * step); // reused, trail-aware
    this.sprite.setPosition(this.x, this.y);

    if (now >= this.nudgeReadyAt && dist(this.x, this.y, target.x, target.y) < D.NUDGE_RANGE) {
      target.nudge(this.x, this.y, now);
      this.nudgeReadyAt = now + D.NUDGE_COOLDOWN_MS;
    }
  }
}
