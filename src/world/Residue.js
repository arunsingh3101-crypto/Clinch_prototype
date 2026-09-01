import { CONFIG } from '../config.js?v=20260901124225';

// A residue left behind by the player 'cut' action (tutorial spec §1.3): the
// abandoned trail path, frozen in place, persisting for a fixed duration then
// expiring. Unlike the live trail it does not decay point-by-point or close
// loops — it is inert geometry that other systems read: a detection trigger for
// cutters and a movement obstacle for chasers (consumers added with their AI).
export default class Residue {
  constructor(scene, points, now) {
    this.scene = scene;
    // Snapshot the path so later trail edits can't mutate it.
    this.points = points.map((p) => ({ x: p.x, y: p.y }));
    this.duration = CONFIG.STORY.CUT_RESIDUE.DURATION_MS;
    this.tStart = now;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(400);
  }

  // Consecutive point pairs — the same segment form other systems expect, so a
  // chaser's trail-style blocking / a cutter's seek can reuse existing helpers.
  segments() {
    const segs = [];
    for (let i = 0; i < this.points.length - 1; i++) {
      segs.push([this.points[i], this.points[i + 1]]);
    }
    return segs;
  }

  alive(now) {
    return now - this.tStart < this.duration;
  }

  draw(now) {
    const progress = Math.min(1, (now - this.tStart) / this.duration);
    const g = this.graphics;
    g.clear();
    // Dimmer and cooler than the live trail so it reads as a leftover, and
    // fades as it nears expiry.
    g.lineStyle(3, 0x5fa8a0, 0.5 * (1 - progress));
    g.beginPath();
    let moved = false;
    for (let i = 0; i < this.points.length - 1; i++) {
      g.moveTo(this.points[i].x, this.points[i].y);
      g.lineTo(this.points[i + 1].x, this.points[i + 1].y);
      moved = true;
    }
    if (moved) g.strokePath();
  }

  destroy() {
    this.graphics.destroy();
  }
}
