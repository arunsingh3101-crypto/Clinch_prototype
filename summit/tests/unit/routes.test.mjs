// Replays the solver's input scripts (tests/routes.json) on the headless sim:
// proves every room can be finished and every berry collected. If a room or a
// movement constant changes, re-run `node tools/solver.mjs` to refresh routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Sim } from '../../src/sim/Sim.js';
import { ROOMS } from '../../src/world/rooms.js';
import { replay } from '../../tools/solver.mjs';

const routes = JSON.parse(readFileSync(new URL('../routes.json', import.meta.url), 'utf8'));

test('there are 8 rooms with one berry each', () => {
  assert.equal(ROOMS.length, 8);
  for (const r of ROOMS) assert.equal(new Sim([r]).world.berries.length, 1, r.name);
  assert.ok(new Sim([ROOMS[7]]).world.flag, 'last room has the summit flag');
});

ROOMS.forEach((room, i) => {
  test(`room ${i + 1} ${room.name}: route reaches the exit without dying`, () => {
    const sim = replay(new Sim(ROOMS, i), routes[room.id].exit);
    assert.equal(sim.deaths, 0);
    assert.ok(i === ROOMS.length - 1 ? sim.finished : sim.roomIndex === i + 1, `ended in room ${sim.roomIndex + 1}`);
  });
  test(`room ${i + 1} ${room.name}: berry is reachable and the room is still finishable`, () => {
    const [id, route] = Object.entries(routes[room.id].berries)[0];
    const sim = replay(new Sim(ROOMS, i), route);
    assert.ok(sim.berries.has(id));
    assert.ok(i === ROOMS.length - 1 ? sim.finished : sim.roomIndex === i + 1);
  });
});

test('full run: all rooms back to back reaches the end', () => {
  const sim = new Sim(ROOMS, 0);
  for (let i = 0; i < ROOMS.length; i++) {
    assert.equal(sim.roomIndex, i);
    replay(sim, Object.values(routes[ROOMS[i].id].berries)[0]);
    while (sim.transitionTimer > 0) sim.step();
  }
  assert.ok(sim.finished);
  assert.equal(sim.berries.size, 8);
  assert.equal(sim.deaths, 0);
});
