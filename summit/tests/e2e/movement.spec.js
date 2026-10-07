import { test, expect } from '@playwright/test';

// Drives the real game build through the window.__summit test hook
// (?test=1 turns off the real-time loop so every step is deterministic).
const FLOOR = 320;

async function boot(page, room = 'sandbox') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`./?test=1&room=${room}&mute=1`);
  await page.waitForFunction(() => window.__summit?.ready);
  return errors;
}
const step = (page, n, input = {}) => page.evaluate(([n, i]) => window.__summit.step(n, i), [n, input]);

test('jump: full jump ~56px, released jump lower', async ({ page }) => {
  const errors = await boot(page);
  let s = await step(page, 5);
  expect(s.y + 20).toBe(FLOOR);
  const y0 = s.y;
  let minY = y0;
  for (let i = 0; i < 40; i++) {
    s = await step(page, 1, { jump: true, noPress: i > 0 });
    minY = Math.min(minY, s.y);
  }
  expect(y0 - minY).toBeGreaterThanOrEqual(52);
  expect(y0 - minY).toBeLessThanOrEqual(60);
  s = await step(page, 40);
  expect(s.onGround).toBe(true);

  // short hop
  minY = s.y;
  await step(page, 1, { jump: true });
  for (let i = 0; i < 30; i++) { s = await step(page, 1); minY = Math.min(minY, s.y); }
  expect(y0 - minY).toBeLessThan(25);
  await page.screenshot({ path: 'tests/screens/m1-jump.png' });
  expect(errors).toEqual([]);
});

test('dash: right dash travels ~72px and spends the charge', async ({ page }) => {
  await boot(page);
  let s = await step(page, 3);
  const x0 = s.x;
  s = await step(page, 1, { x: 1, dash: true });
  expect(s.dashes).toBe(0);
  s = await step(page, 3, { x: 1 });
  expect(s.x).toBe(x0); // freeze frames
  s = await step(page, 4, { x: 1 });
  await page.screenshot({ path: 'tests/screens/m1-dash.png' });
  s = await step(page, 5, { x: 1 });
  expect(s.x - x0).toBeGreaterThanOrEqual(66);
  s = await step(page, 30);
  expect(s.dashes).toBe(1); // refilled on ground
});

test('wall climb: run to the pillar, grab and climb above jump height', async ({ page }) => {
  await boot(page);
  let s = await step(page, 120, { x: 1 });
  expect(s.x + 12).toBe(384);
  await step(page, 8, { x: 1, jump: true });
  s = await step(page, 40, { x: 1, grab: true, y: -1 });
  expect(s.state).toBe('climb');
  expect(s.y).toBeLessThan(FLOOR - 20 - 60);
  expect(s.stamina).toBeLessThan(110);
  await page.screenshot({ path: 'tests/screens/m1-climb.png' });
  // keep climbing over the top of the pillar (y=128)
  s = await step(page, 85, { grab: true, y: -1 }); // climb hop over the top
  expect(s.y + 20).toBeLessThanOrEqual(128);
  s = await step(page, 30);
  expect(s.onGround).toBe(true);
  expect(s.y + 20).toBe(128); // standing on the pillar
});

test('wall jump kicks away', async ({ page }) => {
  await boot(page);
  await step(page, 120, { x: 1 });
  await step(page, 15, { x: 1, jump: true });
  const s0 = await step(page, 1, { x: 1, jump: true });
  const s = await step(page, 6, { x: 1, jump: true, noPress: true });
  expect(s.vx).toBeLessThan(0);
  expect(s.x).toBeLessThan(s0.x);
});
