import { CONFIG } from '../config.js?v=20260901140734';
import { segmentIntersection, polygonArea, dist, distToSegment } from '../utils/geometry.js?v=20260901140734';

// The trail is the whole game (Part 3). Points are ordered oldest (tail, index 0)
// to newest (head, last index). Each point carries the time it was laid down so
// the tail can dissolve independently of whether the player is currently moving.
export default class Trail {
  constructor(scene) {
    this.scene = scene;
    this.points = []; // {x, y, t}
    this.graphics = scene.add.graphics();
  }

  reset(stubPoints = []) {
    this.points = stubPoints.slice();
  }

  addPoint(x, y, now) {
    const last = this.points[this.points.length - 1];
    if (last && dist(last.x, last.y, x, y) < CONFIG.TRAIL.MIN_POINT_SPACING) return;
    this.points.push({ x, y, t: now });
  }

  // Ages out the tail. Runs every frame regardless of movement — standing still
  // dissolves the weapon (Part 3).
  update(now) {
    const lifetime = CONFIG.TRAIL.LIFETIME_MS;
    let cut = 0;
    while (cut < this.points.length && now - this.points[cut].t > lifetime) cut++;
    if (cut > 0) this.points.splice(0, cut);
  }

  isEmpty() {
    return this.points.length < 2;
  }

  // Segment list for collision / intersection tests: consecutive point pairs.
  segments() {
    const segs = [];
    for (let i = 0; i < this.points.length - 1; i++) {
      segs.push([this.points[i], this.points[i + 1]]);
    }
    return segs;
  }

  // Does the moving segment (from,to) cross the live trail? Used by enemies/
  // projectiles, which are blocked by the trail (Part 3 solidity rule).
  // Returns {point, index} of the first blocking crossing, or null.
  blocksSegment(from, to) {
    const segs = this.segments();
    for (let i = 0; i < segs.length; i++) {
      const hit = segmentIntersection(from, to, segs[i][0], segs[i][1]);
      if (hit) return { point: hit, index: i };
    }
    return null;
  }

  // Self-intersection check for loop closing (Part 4). Tests the newest segment
  // (second-to-last point -> head) against older segments, skipping a short
  // window nearest the head so consecutive near-collinear points can't
  // falsely register as a crossing.
  checkSelfIntersection(now) {
    const n = this.points.length;
    if (n < 4) return null;

    const head = this.points[n - 1];
    const prevHead = this.points[n - 2];

    let ignoreUntilIndex = n - 2;
    while (
      ignoreUntilIndex > 0 &&
      now - this.points[ignoreUntilIndex].t < CONFIG.TRAIL.SELF_INTERSECT_IGNORE_RECENT_MS
    ) {
      ignoreUntilIndex--;
    }

    for (let i = 0; i < ignoreUntilIndex - 1; i++) {
      const hit = segmentIntersection(prevHead, head, this.points[i], this.points[i + 1]);
      if (hit) {
        return { point: hit, index: i };
      }
    }
    return null;
  }

  // Builds the enclosed polygon from a self-intersection: crossing point,
  // forward through the trail to the head.
  polygonFrom(index, crossingPoint) {
    const poly = [crossingPoint];
    for (let i = index + 1; i < this.points.length; i++) {
      poly.push(this.points[i]);
    }
    return poly;
  }

  areaFrom(index, crossingPoint) {
    return polygonArea(this.polygonFrom(index, crossingPoint));
  }

  // Cutter severs the trail from the crossing point back to the tail (Part 7).
  // Only the fresh segment from the crossing to the head survives.
  severAt(index, crossingPoint) {
    this.points = [crossingPoint, ...this.points.slice(index + 1)];
  }

  // Radius-based fallback for the cutter: a circular body "touches" the trail
  // once it comes within `radius` of any segment, even if its exact per-frame
  // movement step never draws a mathematically clean line-crossing (this
  // matters most when the cutter is homing straight at an existing trail
  // vertex, where it can otherwise approach asymptotically and stall).
  crossingNear(point, radius) {
    const segs = this.segments();
    let best = null;
    let bestDist = radius;
    for (let i = 0; i < segs.length; i++) {
      const [p1, p2] = segs[i];
      const d = distToSegment(point.x, point.y, p1.x, p1.y, p2.x, p2.y);
      if (d <= bestDist) {
        bestDist = d;
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        let t = lenSq === 0 ? 0 : ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        best = { point: { x: p1.x + t * dx, y: p1.y + t * dy }, index: i };
      }
    }
    return best;
  }

  // Nearest point on the live trail to (x, y) — used by the cutter AI.
  nearestPoint(x, y) {
    if (this.points.length === 0) return null;
    let best = null;
    let bestDist = Infinity;
    for (const p of this.points) {
      const d = dist(x, y, p.x, p.y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  draw(now) {
    const g = this.graphics;
    g.clear();
    const lifetime = CONFIG.TRAIL.LIFETIME_MS;
    const BANDS = 6;
    for (let b = 0; b < BANDS; b++) {
      const ageLo = (b / BANDS) * lifetime;
      const ageHi = ((b + 1) / BANDS) * lifetime;
      // Newer trail (low age) is more opaque; older trail fades toward expiry.
      const alpha = 0.9 - (b / BANDS) * 0.8;
      g.lineStyle(4, 0x2ecc71, alpha);
      g.beginPath();
      let moved = false;
      for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const age = now - p2.t;
        if (age >= ageLo && age < ageHi) {
          g.moveTo(p1.x, p1.y);
          g.lineTo(p2.x, p2.y);
          moved = true;
        }
      }
      if (moved) g.strokePath();
    }
  }

  destroy() {
    this.graphics.destroy();
  }
}
