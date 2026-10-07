import { test, expect } from '@playwright/test';

// Real-time keyboard input (no test stepping): title -> game, run, jump, dash.
test('keyboard: start from title, run right, jump and dash', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./?mute=1');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screens/title.png' });
  await page.keyboard.press('z');
  await page.waitForFunction(() => window.__summit?.ready, null, { timeout: 5000 });
  await page.waitForTimeout(400);
  const s0 = await page.evaluate(() => window.__summit.snapshot());
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowRight');
  const s1 = await page.evaluate(() => window.__summit.snapshot());
  expect(s1.x).toBeGreaterThan(s0.x + 20);
  await page.waitForTimeout(200);
  await page.keyboard.down('c');
  await page.waitForTimeout(120);
  const s2 = await page.evaluate(() => window.__summit.snapshot());
  await page.keyboard.up('c');
  expect(s2.y).toBeLessThan(s1.y - 10);
  expect(errors).toEqual([]);
});

test('keyboard: dash spends the charge in a dash-enabled room', async ({ page }) => {
  await page.goto('./?mute=1&room=3');
  await page.waitForFunction(() => window.__summit?.ready);
  await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('x');
  await page.waitForTimeout(60);
  const s = await page.evaluate(() => window.__summit.snapshot());
  await page.keyboard.up('ArrowRight');
  expect(s.dashes).toBe(0);
});
