// Route solver: best-first search over short held-input "macros" on the
// headless sim. Used to prove every room (and every berry) is reachable and
// to produce input scripts the tests replay.
//
//   node tools/solver.mjs            -> solve all rooms, write tests/routes.json
//   node tools/solver.mjs 3          -> solve room 3 only (1-based), print stats
import { Sim } from '../src/sim/Sim.js';
import { ROOMS } from '../src/world/rooms.js';
import { VIEW_W } from '../src/config.js';
import { decode } from '../src/sim/routeInput.js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

// Action tokens: see src/sim/routeInput.js. Each action lasts K frames.
const K = 4;
const ACTIONS = [];
for (const h of ['L', '', 'R']) {
  for (const extra of ['', 'J', 'j', 't', 'G', 'GU', 'GJ', 'D']) ACTIONS.push(h + extra);
}
for (const d of ['R', 'L', 'U', 'D', 'RU', 'LU', 'RD', 'LD']) ACTIONS.push(d + 'X');


// Replay a route ([[token, frames], ...]) on a sim. Returns the sim.
export { decode };

export function replay(sim, route) {
  for (const [tok, n] of route) for (let f = 0; f < n; f++) sim.step(decode(tok, f));
  return sim;
}

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

function key(sim) {
  const p = sim.player, w = sim.world;
  let k = `${p.x >> 2},${p.y >> 2},${Math.round(p.vx / 60)},${Math.round(p.vy / 60)},${p.dashes},${p.state[0]},${Math.floor(p.stamina / 28)},${p.varJumpTimer > 0 ? 1 : 0}`;
  for (const c of w.crystals) k += c.active ? 'C' : 'c';
  for (const c of w.crumbles) k += c.state[0];
  for (const pl of w.platforms) k += `${pl.x >> 3},${pl.y >> 3}${pl.toB ? '>' : '<'}`;
  return k;
}

// goal: { type: 'exit' } | { type: 'berry', id, x, y }
export function solve(rooms, roomIndex, goal, opts = {}) {
  const sim = new Sim(rooms, roomIndex);
  if (opts.start) sim.restore(opts.start);
  const startRoom = roomIndex;
  const def = rooms[roomIndex];
  const target = goal.type === 'berry' ? { x: goal.x, y: goal.y } : def.goal || { x: VIEW_W + 8, y: 100 };
  const done = () => goal.type === 'berry'
    ? sim.berries.has(goal.id)
    : sim.roomIndex !== startRoom || sim.finished;
  const W = opts.weight ?? 3;
  const maxExp = opts.maxExpansions ?? 120000;
  const h = () => {
    const p = sim.player;
    return Math.hypot(p.x + 6 - target.x, p.y + 10 - target.y) / 200; // seconds-ish
  };
  const seen = new Set([key(sim)]);
  const heap = new Heap();
  const root = { s: sim.save(), parent: null, tok: null, g: 0 };
  root.f = W * h();
  heap.push(root);
  let exp = 0, best = root, bestH = Infinity;
  while (heap.size && exp < maxExp) {
    const node = heap.pop();
    exp++;
    for (const tok of ACTIONS) {
      sim.restore(node.s);
      const deaths = sim.deaths;
      let ok = true, reached = false, n = 0;
      for (let f = 0; f < K; f++) {
        sim.step(decode(tok, f));
        n++;
        if (sim.deaths !== deaths) { ok = false; break; }
        if (done()) { reached = true; break; }
      }
      if (!ok) continue;
      const child = { parent: node, tok, n, g: node.g + n / 60 };
      if (reached) return { route: unwind(child), expansions: exp, frames: Math.round(child.g * 60), state: sim.save() };
      const k = key(sim);
      if (seen.has(k)) continue;
      seen.add(k);
      child.s = sim.save();
      const hh = h();
      child.f = child.g + W * hh;
      if (hh < bestH) { bestH = hh; best = child; }
      heap.push(child);
    }
  }
  sim.restore(best.s);
  return { route: null, expansions: exp, closest: sim.player.rect() };
}

function unwind(n) {
  const out = [];
  for (; n.parent; n = n.parent) out.push([n.tok, n.n]);
  out.reverse();
  // merge repeated tokens that don't press anything
  const merged = [];
  for (const [t, f] of out) {
    const last = merged[merged.length - 1];
    if (last && last[0] === t && !/[JtX]/.test(t)) last[1] += f;
    else merged.push([t, f]);
  }
  return merged;
}

export function berriesOf(rooms, i) {
  const sim = new Sim(rooms, i);
  return sim.world.berries.map((b) => ({ type: 'berry', id: b.id, x: b.x + 8, y: b.y + 8 }));
}

// --------------------------------------------------------------------- CLI --
if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2] ? [parseInt(process.argv[2], 10) - 1] : ROOMS.map((_, i) => i);
  const out = existsSync('tests/routes.json') ? JSON.parse(readFileSync('tests/routes.json', 'utf8')) : {};
  for (const i of only) {
    const t0 = Date.now();
    const r = solve(ROOMS, i, { type: 'exit' });
    console.log(`room ${i + 1} ${ROOMS[i].name}: ${r.route ? `solved in ${r.frames} frames` : 'NO ROUTE'} (${r.expansions} expansions, ${Date.now() - t0} ms)`);
    if (!r.route) { console.log('  closest', r.closest); continue; }
    const entry = { exit: r.route, berries: {} };
    for (const b of berriesOf(ROOMS, i)) {
      const rb = solve(ROOMS, i, b);
      if (!rb.route) { console.log(`  berry ${b.id}: NOT REACHABLE`, rb.closest); continue; }
      const rx = solve(ROOMS, i, { type: 'exit' }, { start: rb.state });
      console.log(`  berry ${b.id}: ${rb.frames} frames, then exit: ${rx.route ? rx.frames + ' frames' : 'STUCK'}`);
      if (rx.route) entry.berries[b.id] = [...rb.route, ...rx.route];
    }
    out[ROOMS[i].id] = entry;
  }
  writeFileSync('tests/routes.json', JSON.stringify(out, null, 0).replace(/\],\[/g, '],[') + '\n');
}
