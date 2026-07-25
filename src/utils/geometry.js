// Small geometry helpers shared by the trail, loop-resolution, and enemy steering.

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Returns the intersection point of segments (p1,p2) and (p3,p4), or null.
// Deliberately excludes shared-endpoint touches (t/u must fall strictly inside (0,1)
// with a small epsilon) so adjacent trail points never register as a crossing.
export function segmentIntersection(p1, p2, p3, p4, eps = 1e-6) {
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < eps) return null; // parallel / collinear

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;

  if (t > eps && t < 1 - eps && u > eps && u < 1 - eps) {
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t, u };
  }
  return null;
}

// Shoelace formula, absolute area.
export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

// Ray-casting point-in-polygon, generous on boundary: a point within `edgeEps`
// of any edge counts as inside (Part 4.3: "borderline cases resolve generously").
export function pointInPolygon(px, py, points, edgeEps = 3) {
  let inside = false;
  const n = points.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;

    if (distToSegment(px, py, xi, yi, xj, yj) <= edgeEps) return true;

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
