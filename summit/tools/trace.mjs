// Print a room with the solver route drawn on it:  node tools/trace.mjs <room#> [berryId]
import { readFileSync } from 'node:fs';
import { Sim } from '../src/sim/Sim.js';
import { ROOMS } from '../src/world/rooms.js';
import { decode } from './solver.mjs';
const i = parseInt(process.argv[2], 10) - 1;
const routes = JSON.parse(readFileSync('tests/routes.json', 'utf8'));
const entry = routes[ROOMS[i].id];
const route = process.argv[3] ? entry.berries[process.argv[3]] : entry.exit;
const sim = new Sim(ROOMS, i);
const grid = ROOMS[i].map.map((r) => [...r]);
let f = 0;
const log = [];
for (const [tok, n] of route) {
  for (let k = 0; k < n; k++) {
    sim.step(decode(tok, k));
    if (sim.roomIndex !== i) break;
    const p = sim.player;
    const tx = Math.floor((p.x + 6) / 16), ty = Math.floor((p.y + 10) / 16);
    if (grid[ty]?.[tx] === '.') grid[ty][tx] = p.state === 'dash' ? '*' : p.state === 'climb' ? '|' : 'o';
    f++;
  }
  log.push(`${tok}x${n}`);
}
console.log(grid.map((r) => r.join('')).join('\n'));
console.log(log.join(' '));
