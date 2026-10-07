// Whole-game simulation: rooms, player, objects, deaths, timer. Pure JS.
import { STEP, VIEW_W, VIEW_H, WORLD, MOVE } from '../config.js';
import { World, overlaps } from './World.js';
import { Player, ST_CLIMB } from './Player.js';

const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const roundAway = (v) => (v < 0 ? -Math.round(-v) : Math.round(v));

export const EMPTY_INPUT = Object.freeze({ x: 0, y: 0, jump: false, jumpPressed: false, dash: false, dashPressed: false, grab: false });

export class Sim {
  constructor(rooms, startRoom = 0) {
    this.rooms = rooms;
    this.events = [];
    this.deaths = 0;
    this.time = 0;
    this.frames = 0;
    this.berries = new Set();
    this.freezeTimer = 0;
    this.deadTimer = 0;
    this.transitionTimer = 0;
    this.finished = false;
    this.pending = { jumpPressed: false, dashPressed: false };
    this.loadRoom(startRoom);
  }

  get totalBerries() { return this.rooms.reduce((n, r) => n + r.map.join('').split('S').length - 1, 0); }

  loadRoom(i) {
    this.roomIndex = i;
    this.world = new World(this.rooms[i]);
    for (const b of this.world.berries) b.collected = this.berries.has(b.id);
    this.player = new Player(this.world, this.world.spawn.x, this.world.spawn.y);
    this.freezeTimer = 0;
  }

  freeze(t) { this.freezeTimer = Math.max(this.freezeTimer, t); }
  frozen() { return this.freezeTimer > 1e-6; }

  step(input = EMPTY_INPUT) {
    if (this.finished) return;
    this.frames++;
    this.time += STEP;

    // latch button presses that land on skipped (frozen / dead) frames
    const inp = {
      ...input,
      jumpPressed: input.jumpPressed || this.pending.jumpPressed,
      dashPressed: input.dashPressed || this.pending.dashPressed,
    };
    if (this.transitionTimer > 0) { this.transitionTimer -= STEP; return; }
    if (this.deadTimer > 0) {
      if ((this.deadTimer -= STEP) <= 0) this.respawn();
      return;
    }
    if (this.freezeTimer > 1e-6) {
      this.freezeTimer -= STEP;
      this.pending.jumpPressed ||= input.jumpPressed;
      this.pending.dashPressed ||= input.dashPressed;
      return;
    }
    this.pending.jumpPressed = this.pending.dashPressed = false;

    const p = this.player;
    this.world.updateObjects(STEP, p, this.events);
    this.updatePlatforms(STEP);
    if (p.dead) return this.die();
    p.update(STEP, inp, this);
    this.checkTouches();
  }

  // --- moving platforms carry riders and push the player ----------------
  updatePlatforms(dt) {
    const p = this.player;
    for (const pl of this.world.platforms) {
      if (pl.wait > 0) { pl.wait -= dt; pl.vx = pl.vy = 0; continue; }
      const tx = pl.toB ? pl.bx : pl.ax, ty = pl.toB ? pl.by : pl.ay;
      const dx = tx - (pl.x + pl.remX), dy = ty - (pl.y + pl.remY);
      const dist = Math.hypot(dx, dy);
      const stepLen = pl.speed * dt;
      let mx, my;
      if (dist <= stepLen) {
        mx = dx; my = dy; pl.toB = !pl.toB; pl.wait = pl.pause;
      } else { mx = (dx / dist) * stepLen; my = (dy / dist) * stepLen; }
      pl.vx = mx / dt; pl.vy = my / dt;

      const riding = p.ridingPlatform(pl);
      pl.remX += mx; pl.remY += my;
      const ix = roundAway(pl.remX), iy = roundAway(pl.remY);
      pl.remX -= ix; pl.remY -= iy;
      this.movePlatformAxis(pl, ix, 0, riding);
      this.movePlatformAxis(pl, 0, iy, riding);
    }
  }

  movePlatformAxis(pl, dx, dy, riding) {
    const p = this.player;
    const n = Math.abs(dx || dy), sx = sign(dx), sy = sign(dy);
    for (let k = 0; k < n; k++) {
      pl.x += sx; pl.y += sy;
      if (overlaps(p.rect(), pl)) {
        // pushed: must move the full pixel or get squished
        if (this.world.solidAt(p.x + sx, p.y + sy, p.w, p.h, pl)) { p.dead = true; return; }
        p.x += sx; p.y += sy;
      } else if (riding) {
        if (!this.world.solidAt(p.x + sx, p.y + sy, p.w, p.h, pl)) { p.x += sx; p.y += sy; }
      }
    }
  }

  checkTouches() {
    const p = this.player, w = this.world, r = p.rect();
    if (p.dead) return this.die();
    for (const s of w.spikes) {
      if (!overlaps(r, s)) continue;
      const hit = (s.dir === 'up' && p.vy >= 0) || (s.dir === 'down' && p.vy <= 0) ||
        (s.dir === 'left' && p.vx >= 0) || (s.dir === 'right' && p.vx <= 0);
      if (hit) return this.die();
    }
    for (const c of w.crystals) {
      if (c.active && overlaps(r, c) && (p.dashes < p.maxDashes || p.stamina < MOVE.CLIMB_TIRED_THRESHOLD)) {
        p.dashes = p.maxDashes;
        p.stamina = MOVE.CLIMB_MAX_STAMINA;
        p.hairFlash = 0.1;
        c.active = false; c.timer = WORLD.CRYSTAL_RESPAWN;
        this.freeze(0.05);
        this.events.push({ type: 'crystal', x: c.x + 8, y: c.y + 8 });
      }
    }
    for (const b of w.berries) {
      if (!b.collected && overlaps(r, b)) {
        b.collected = true; this.berries.add(b.id);
        this.events.push({ type: 'berry', x: b.x + 8, y: b.y + 8 });
      }
    }
    if (w.flag && overlaps(r, w.flag)) {
      this.finished = true;
      this.events.push({ type: 'finish' });
      return;
    }
    // bounds
    if (p.y > VIEW_H + 4) return this.die();
    if (p.x + p.w / 2 > VIEW_W || p.y + p.h / 2 < 0) return this.nextRoom();
  }

  die() {
    const p = this.player;
    if (this.deadTimer > 0) return;
    this.deaths++;
    this.deadTimer = WORLD.DEATH_RESPAWN;
    this.events.push({ type: 'death', x: p.x + p.w / 2, y: p.y + p.h / 2 });
  }

  respawn() {
    this.world.resetObjects();
    for (const pl of this.world.platforms) { pl.x = pl.ax; pl.y = pl.ay; pl.toB = true; pl.wait = 0; pl.remX = pl.remY = 0; }
    this.player.reset(this.world.spawn.x, this.world.spawn.y);
    this.events.push({ type: 'respawn' });
  }

  nextRoom() {
    if (this.roomIndex + 1 >= this.rooms.length) { this.finished = true; this.events.push({ type: 'finish' }); return; }
    this.loadRoom(this.roomIndex + 1);
    this.transitionTimer = WORLD.ROOM_TRANSITION;
    this.events.push({ type: 'room', index: this.roomIndex });
  }

  // Cheap save/restore of all mutable state (used by the route solver).
  save() {
    const p = this.player;
    const ps = {};
    for (const k in p) if (k !== 'world' && k !== 'input') ps[k] = p[k];
    ps.dashDir = { ...p.dashDir }; ps.beforeDash = { ...p.beforeDash };
    const w = this.world;
    return {
      p: ps, room: this.roomIndex,
      crystals: w.crystals.map((c) => ({ ...c })), crumbles: w.crumbles.map((c) => ({ ...c })),
      platforms: w.platforms.map((c) => ({ ...c })), berriesW: w.berries.map((b) => b.collected),
      berries: [...this.berries], deaths: this.deaths, time: this.time, frames: this.frames,
      freeze: this.freezeTimer, dead: this.deadTimer, trans: this.transitionTimer, finished: this.finished,
      pending: { ...this.pending },
    };
  }

  restore(s) {
    if (s.room !== this.roomIndex) this.loadRoom(s.room);
    const w = this.world;
    Object.assign(this.player, s.p);
    this.player.dashDir = { ...s.p.dashDir }; this.player.beforeDash = { ...s.p.beforeDash };
    s.crystals.forEach((c, i) => Object.assign(w.crystals[i], c));
    s.crumbles.forEach((c, i) => Object.assign(w.crumbles[i], c));
    s.platforms.forEach((c, i) => Object.assign(w.platforms[i], c));
    s.berriesW.forEach((b, i) => (w.berries[i].collected = b));
    this.berries = new Set(s.berries);
    this.deaths = s.deaths; this.time = s.time; this.frames = s.frames;
    this.freezeTimer = s.freeze; this.deadTimer = s.dead; this.transitionTimer = s.trans; this.finished = s.finished;
    this.pending = { ...s.pending };
    this.events = [];
  }

  drainEvents() { const e = this.events; this.events = []; return e; }

  // snapshot for tests / HUD
  snapshot() {
    const p = this.player;
    return {
      room: this.roomIndex, x: p.x, y: p.y, vx: p.vx, vy: p.vy, state: p.state,
      dashes: p.dashes, stamina: p.stamina, onGround: p.collideAt(0, 1),
      deaths: this.deaths, time: this.time, berries: this.berries.size,
      dead: this.deadTimer > 0, finished: this.finished, frames: this.frames,
    };
  }
}

export { ST_CLIMB };
