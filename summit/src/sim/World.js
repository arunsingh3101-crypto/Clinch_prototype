// Room state: tile grid + dynamic objects. Pure JS (no Phaser) so it runs
// headless in Node tests.
import { TILE, ROOM_W, ROOM_H, WORLD } from '../config.js';

export const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Spike hitboxes: the thin half of the tile the spikes point out of.
function spikeRect(tx, ty, dir) {
  const x = tx * TILE, y = ty * TILE;
  switch (dir) {
    case 'up': return { x, y: y + 9, w: TILE, h: 7 };
    case 'down': return { x, y, w: TILE, h: 7 };
    case 'left': return { x: x + 9, y, w: 7, h: TILE };
    case 'right': return { x, y, w: 7, h: TILE };
  }
}

const SPIKE_CHARS = { '^': 'up', v: 'down', '<': 'left', '>': 'right' };

export class World {
  constructor(def) {
    this.def = def;
    this.w = ROOM_W;
    this.h = ROOM_H;
    this.grid = new Uint8Array(ROOM_W * ROOM_H);
    this.spikes = [];
    this.crystals = [];
    this.berries = [];
    this.crumbles = [];
    this.platforms = [];
    this.flag = null;
    this.spawn = { x: 32, y: 32 };

    const rows = def.map;
    if (rows.length !== ROOM_H) throw new Error(`${def.name}: ${rows.length} rows, want ${ROOM_H}`);
    rows.forEach((row, ty) => {
      if (row.length !== ROOM_W) throw new Error(`${def.name} row ${ty}: ${row.length} cols, want ${ROOM_W}`);
      for (let tx = 0; tx < ROOM_W; tx++) {
        const c = row[tx];
        const px = tx * TILE, py = ty * TILE;
        if (c === '#') this.grid[ty * ROOM_W + tx] = 1;
        else if (SPIKE_CHARS[c]) this.spikes.push({ tx, ty, dir: SPIKE_CHARS[c], ...spikeRect(tx, ty, SPIKE_CHARS[c]) });
        else if (c === 'P') this.spawn = { x: px + 2, y: py + TILE - 20 };
        else if (c === 'C') this.crystals.push({ x: px, y: py, w: TILE, h: TILE, active: true, timer: 0 });
        else if (c === 'S') this.berries.push({ id: `${def.id}:${tx},${ty}`, x: px, y: py, w: TILE, h: TILE, collected: false });
        else if (c === 'X') this.crumbles.push({ x: px, y: py, w: TILE, h: TILE, state: 'idle', timer: 0 });
        else if (c === 'F') this.flag = { x: px, y: py - TILE, w: TILE, h: TILE * 2 };
      }
    });

    for (const p of def.platforms || []) {
      const pl = {
        x: p.x * TILE, y: p.y * TILE, w: p.w * TILE, h: (p.h || 1) * TILE,
        ax: p.x * TILE, ay: p.y * TILE, bx: p.x2 * TILE, by: p.y2 * TILE,
        speed: p.speed || 60, toB: true, remX: 0, remY: 0, vx: 0, vy: 0,
        wait: 0, pause: p.pause ?? 0.3,
      };
      this.platforms.push(pl);
    }
  }

  // Reset per-life objects (called on death).
  resetObjects() {
    for (const c of this.crystals) { c.active = true; c.timer = 0; }
    for (const c of this.crumbles) { c.state = 'idle'; c.timer = 0; }
  }

  tileSolid(tx, ty) {
    if (tx < 0) return true; // left edge is always a wall
    if (tx >= this.w || ty < 0 || ty >= this.h) return false;
    return this.grid[ty * this.w + tx] === 1;
  }

  // Is any solid overlapping rect? `ignore` skips one object (a moving platform).
  solidAt(x, y, w, h, ignore = null) {
    const tx0 = Math.floor(x / TILE), tx1 = Math.floor((x + w - 1) / TILE);
    const ty0 = Math.floor(y / TILE), ty1 = Math.floor((y + h - 1) / TILE);
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++)
        if (this.tileSolid(tx, ty)) return true;
    const r = { x, y, w, h };
    for (const c of this.crumbles) if (c.state !== 'gone' && overlaps(r, c)) return true;
    for (const p of this.platforms) if (p !== ignore && overlaps(r, p)) return true;
    return false;
  }

  // Which solid object (crumble/platform) is at rect, for touch reactions.
  objectsAt(x, y, w, h) {
    const r = { x, y, w, h };
    const out = [];
    for (const c of this.crumbles) if (c.state !== 'gone' && overlaps(r, c)) out.push(c);
    for (const p of this.platforms) if (overlaps(r, p)) out.push(p);
    return out;
  }

  updateObjects(dt, player, events) {
    for (const c of this.crystals) {
      if (!c.active && (c.timer -= dt) <= 0) { c.active = true; events.push({ type: 'crystalBack', x: c.x, y: c.y }); }
    }
    for (const c of this.crumbles) {
      if (c.state === 'shaking' && (c.timer -= dt) <= 0) {
        c.state = 'gone'; c.timer = WORLD.CRUMBLE_RESPAWN;
        events.push({ type: 'crumble', x: c.x, y: c.y });
      } else if (c.state === 'gone' && (c.timer -= dt) <= 0) {
        if (player && overlaps(player.rect(), c)) c.timer = 0.1;
        else c.state = 'idle';
      }
    }
  }

  touchCrumble(c) {
    if (c.state === 'idle') { c.state = 'shaking'; c.timer = WORLD.CRUMBLE_SHAKE; }
  }
}
