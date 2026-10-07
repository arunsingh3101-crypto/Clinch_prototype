import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const routes = JSON.parse(readFileSync('tests/routes.json', 'utf8'));
const ROOM_IDS = ['trailhead', 'cliffside', 'gap', 'crystals', 'lift', 'thorns', 'rotten', 'summit'];

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./?test=1&mute=1');
  await page.waitForFunction(() => window.__summit?.ready);
  return errors;
}

for (let i = 0; i < ROOM_IDS.length; i++) {
  test(`room ${i + 1}: screenshot + scripted route reaches the exit`, async ({ page }) => {
    const errors = await boot(page);
    await page.evaluate((i) => window.__summit.loadRoom(i), i);
    await page.evaluate(() => window.__summit.step(0));
    await page.screenshot({ path: `tests/screens/room-${i + 1}.png` });
    const route = routes[ROOM_IDS[i]].exit;
    // play the first half, screenshot mid-route, then finish
    const half = Math.floor(route.length / 2);
    let s = await page.evaluate((r) => window.__summit.replay(r), route.slice(0, half));
    expect(s.room).toBe(i);
    expect(s.dead).toBe(false);
    await page.screenshot({ path: `tests/screens/room-${i + 1}-mid.png` });
    s = await page.evaluate((r) => window.__summit.replay(r), route.slice(half));
    expect(s.deaths).toBe(0);
    if (i < ROOM_IDS.length - 1) expect(s.room).toBe(i + 1);
    else expect(s.finished).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('full run with all berries ends on the stats screen', async ({ page }) => {
  const errors = await boot(page);
  for (let i = 0; i < ROOM_IDS.length; i++) {
    const s = await page.evaluate(([r, i]) => {
      const h = window.__summit;
      const snap = h.replay(r);
      h.skipTransition();
      return snap;
    }, [Object.values(routes[ROOM_IDS[i]].berries)[0], i]);
    expect(s.deaths).toBe(0);
  }
  await page.waitForFunction(() => window.__summitEnd, null, { timeout: 5000 });
  const end = await page.evaluate(() => window.__summitEnd);
  expect(end.berries).toBe(8);
  expect(end.total).toBe(8);
  expect(end.deaths).toBe(0);
  expect(end.time).toBeGreaterThan(10);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/screens/end.png' });
  expect(errors).toEqual([]);
});

test('spikes: death counter increments and respawn is under 0.5s', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__summit.loadRoom(5)); // Thorns
  let s = await page.evaluate(() => window.__summit.step(40, { x: 1 })); // walk into the first spike field
  expect(s.deaths).toBe(1);
  expect(s.dead).toBe(true);
  await page.screenshot({ path: 'tests/screens/death.png' });
  s = await page.evaluate(() => window.__summit.step(30)); // 0.5s
  expect(s.dead).toBe(false);
  expect(s.x).toBe(34); // back at the spawn tile
});
