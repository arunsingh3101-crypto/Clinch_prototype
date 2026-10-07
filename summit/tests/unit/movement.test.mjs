import test from 'node:test';
import assert from 'node:assert/strict';
import { I, room, sim, hold } from './helpers.mjs';
import { SANDBOX } from '../../src/world/testRoom.js';
import { MOVE as M } from '../../src/config.js';

const FLOOR = 320; // sandbox floor top (px)

test('stands on the floor', () => {
  const s = sim(SANDBOX);
  hold(s, {}, 10);
  const p = s.player;
  assert.equal(p.y + p.h, FLOOR);
  assert.ok(p.collideAt(0, 1));
});

test('run accelerates to MAX_RUN', () => {
  const s = sim(SANDBOX);
  hold(s, { x: 1 }, 12);
  assert.equal(s.player.vx, M.MAX_RUN);
  hold(s, {}, 20);
  assert.equal(s.player.vx, 0, 'decelerates to a stop');
});

test('full jump ~56px, short hop much lower (variable jump)', () => {
  let s = sim(SANDBOX);
  hold(s, {}, 2);
  let minY = s.player.y;
  hold(s, { jump: true }, 60, (s) => (minY = Math.min(minY, s.player.y)));
  const full = s.player.y - minY;
  assert.ok(full >= 52 && full <= 60, `full jump ${full}`);

  s = sim(SANDBOX);
  hold(s, {}, 2);
  minY = s.player.y;
  hold(s, { jump: true }, 1);
  hold(s, {}, 40, (s) => (minY = Math.min(minY, s.player.y)));
  const tap = s.player.y - minY;
  assert.ok(tap < 22, `tap jump ${tap}`);
  assert.ok(tap > 8, `tap jump ${tap}`);
});

// ledge: floor only under the left part
const LEDGE = room({
  19: '#..P...................................#',
  20: '##########.............................#',
  21: '##########.............................#',
});

test('coyote time: can jump shortly after running off a ledge', () => {
  const s = sim(LEDGE);
  let leftAt = -1;
  // run right until no longer on ground
  for (let f = 0; f < 60 && leftAt < 0; f++) {
    s.step(I({ x: 1 }));
    if (!s.player.collideAt(0, 1)) leftAt = f;
  }
  assert.ok(leftAt > 0);
  hold(s, { x: 1 }, 3); // 3 frames (0.05s) of falling
  hold(s, { x: 1, jump: true }, 1);
  assert.ok(s.player.vy < 0, 'jumped within coyote window');
});

test('no jump after coyote time expires', () => {
  const s = sim(LEDGE);
  for (let f = 0; f < 60 && s.player.collideAt(0, 1); f++) s.step(I({ x: 1 }));
  hold(s, { x: 1 }, 9); // 0.15s
  hold(s, { x: 1, jump: true }, 1);
  assert.ok(s.player.vy > 0, 'still falling');
});

test('jump buffer: pressing jump just before landing jumps on landing', () => {
  const s = sim(SANDBOX);
  hold(s, {}, 2);
  hold(s, { jump: true }, 40); // full jump, falling now
  // fall until 4 frames before landing
  let f = 0;
  while (s.player.y + s.player.h < FLOOR - 16 && f++ < 100) s.step(I());
  hold(s, { jump: true }, 1);
  hold(s, { jump: true, noPress: true }, 6);
  assert.ok(s.player.vy < 0, 'buffered jump fired on landing');
});

test('dash: freeze frames, ~72px horizontal, momentum carried, then no air dash', () => {
  const s = sim(SANDBOX);
  hold(s, {}, 2);
  hold(s, { jump: true }, 8);
  const x0 = s.player.x;
  const y0 = s.player.y;
  hold(s, { x: 1, dash: true }, 1);
  hold(s, { x: 1 }, 3); // freeze 0.05s = 3 steps
  assert.equal(s.player.x, x0, 'frozen at dash start');
  hold(s, { x: 1 }, 9);
  const dx = s.player.x - x0;
  assert.ok(dx >= 66 && dx <= 80, `dash distance ${dx}`);
  assert.ok(Math.abs(s.player.y - y0) <= 2, 'no gravity during dash');
  assert.equal(s.player.dashes, 0);
  assert.ok(s.player.vx >= M.END_DASH_SPEED - 40, `momentum ${s.player.vx}`);
  // second dash in the air does nothing
  hold(s, { x: -1, dash: true }, 1);
  assert.notEqual(s.player.state, 'dash');
  // refill on landing
  hold(s, {}, 60);
  assert.equal(s.player.dashes, 1);
});

test('8-direction dash: up-right is diagonal, up dash rises', () => {
  const s = sim(SANDBOX);
  hold(s, {}, 2);
  const x0 = s.player.x, y0 = s.player.y;
  hold(s, { x: 1, y: -1, dash: true }, 13);
  assert.ok(s.player.x - x0 > 40 && y0 - s.player.y > 40, `${s.player.x - x0},${y0 - s.player.y}`);
});

test('wall climb drains stamina, slides when empty', () => {
  const s = sim(SANDBOX);
  // run right to the pillar at x=384
  hold(s, { x: 1 }, 120);
  assert.equal(s.player.x + s.player.w, 384);
  hold(s, { x: 1, jump: true }, 10);
  hold(s, { x: 1, grab: true, y: -1 }, 30);
  assert.equal(s.player.state, 'climb');
  const yClimb = s.player.y;
  assert.ok(yClimb < FLOOR - 20 - 56, `climbed above jump height: ${yClimb}`);
  assert.ok(s.player.stamina < M.CLIMB_MAX_STAMINA);
  // hold still until stamina runs out, then slip
  let f = 0;
  while (s.player.stamina > 0 && f++ < 60 * 12) s.step(I({ grab: true }));
  assert.ok(f > 60 * 8, `hung for ${f} frames`);
  assert.ok(Math.abs(s.player.y - yClimb) <= 2, 'held position while stamina lasted');
  hold(s, { grab: true }, 20);
  assert.equal(s.player.state, 'climb');
  assert.ok(s.player.y > yClimb + 5, 'slow slide when out of stamina');
  assert.ok(s.player.vy <= M.CLIMB_SLIP_SPEED);
});

test('wall jump kicks away from the wall', () => {
  const s = sim(SANDBOX);
  hold(s, { x: 1 }, 120);
  hold(s, { x: 1, jump: true }, 20);
  hold(s, { x: 1, jump: true }, 1);
  assert.equal(s.player.vx < 0, true, `vx ${s.player.vx}`);
  assert.ok(s.player.vy < 0);
  assert.ok(s.player.forceMoveXTimer > 0);
});

test('neutral wall jump has no input lock', () => {
  const s = sim(SANDBOX);
  hold(s, { x: 1 }, 120);
  hold(s, { x: 1, jump: true }, 20);
  hold(s, { jump: true }, 1);
  assert.ok(s.player.vx < 0);
  assert.equal(s.player.forceMoveXTimer, 0);
});

test('climb hop over the top of a wall', () => {
  const STEP = room({
    17: '#.................######...............#',
    18: '#.................######...............#',
    19: '#..P..............######...............#',
  });
  const s = sim(STEP);
  hold(s, { x: 1 }, 60);
  hold(s, { x: 1, grab: true, y: -1 }, 90);
  assert.ok(s.player.y + s.player.h <= 17 * 16, `on top: ${s.player.y}`);
  assert.ok(s.player.x + s.player.w > 18 * 16, 'moved onto the ledge');
});

test('upward corner correction slips past a ceiling edge', () => {
  // ceiling block whose right edge overlaps the player by 4px
  const CEIL = room({
    16: '#.......###............................#',
    19: '#..P...................................#',
  });
  const s = sim(CEIL);
  // place player so its left 4px are under the block (block spans x 128..175)
  s.player.x = 176 - 4;
  hold(s, {}, 2);
  hold(s, { jump: true }, 25);
  assert.ok(s.player.y < 16 * 16, `passed the ceiling: y=${s.player.y}`);
  assert.ok(s.player.x >= 176, 'nudged right');
});

test('dash corner correction lifts over a ledge lip', () => {
  const LIP = room({
    19: '#..P....................##.............#',
  });
  const s = sim(LIP);
  hold(s, {}, 2);
  // hop a bit so feet are just below the top of the 1-tile lip
  hold(s, { jump: true }, 1);
  hold(s, {}, 5);
  const feet = s.player.y + s.player.h;
  assert.ok(feet > 304 && feet <= 312, `feet ${feet}`);
  s.player.x = 330;
  hold(s, { x: 1, dash: true }, 16);
  assert.ok(s.player.x > 26 * 16 - 12, `got over the lip: ${s.player.x}`);
});

test('dash crystal refills dash in the air', () => {
  const CR = room({
    14: '#.......C..............................#',
  });
  const s = sim(CR);
  s.player.x = 128; s.player.y = 260;
  s.player.dashes = 0;
  hold(s, { y: -1, dash: true }, 1); // can't dash
  hold(s, {}, 1);
  s.player.y = 14 * 16 - 2; s.player.vy = 0;
  hold(s, {}, 1);
  assert.equal(s.player.dashes, 1);
});

test('spikes kill and respawn within 0.5s', () => {
  const SP = room({
    19: '#..P.....^^^^..........................#',
  });
  const s = sim(SP);
  hold(s, { x: 1 }, 40);
  assert.equal(s.deaths, 1);
  hold(s, {}, 30);
  assert.equal(s.snapshot().dead, false);
  assert.equal(s.player.x, s.world.spawn.x);
});
