import { test, expect } from '@playwright/test';

// Phone emulation: on-screen controls exist, are thumb-sized, and drive the player,
// including two buttons held at once (multi-touch).
const down = (page, sel, id, x, y) => page.locator(sel).dispatchEvent('pointerdown', { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true });
const up = (page, sel, id) => page.locator(sel).dispatchEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true });

for (const orientation of ['portrait', 'landscape']) {
  test(`touch controls (${orientation})`, async ({ page }) => {
    if (orientation === 'landscape') await page.setViewportSize({ width: 915, height: 412 });
    await page.goto('./?mute=1&room=3');
    await page.waitForFunction(() => window.__summit?.ready);
    await expect(page.locator('#touch')).toBeVisible();
    for (const sel of ['#btn-jump', '#btn-dash', '#btn-grab']) {
      const b = await page.locator(sel).boundingBox();
      expect(b.width).toBeGreaterThanOrEqual(56);
    }
    const pad = await page.locator('#dpad').boundingBox();
    expect(pad.width).toBeGreaterThanOrEqual(120);
    // the d-pad and buttons must not cover each other
    const jump = await page.locator('#btn-jump').boundingBox();
    expect(pad.x + pad.width).toBeLessThan(jump.x);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `tests/screens/phone-${orientation}.png` });

    const s0 = await page.evaluate(() => window.__summit.snapshot());
    // hold right on the d-pad (pointer 1) ...
    await down(page, '#dpad', 1, pad.x + pad.width * 0.95, pad.y + pad.height / 2);
    await page.waitForTimeout(150);
    // ... while tapping jump with another finger (pointer 2)
    await down(page, '#btn-jump', 2, jump.x + 10, jump.y + 10);
    await page.waitForTimeout(100);
    const s1 = await page.evaluate(() => window.__summit.snapshot());
    expect(s1.x).toBeGreaterThan(s0.x + 10);
    expect(s1.y).toBeLessThan(s0.y - 10);
    // third finger: dash while still holding right + jump
    await down(page, '#btn-dash', 3, 0, 0);
    await page.waitForTimeout(40);
    const s2 = await page.evaluate(() => window.__summit.snapshot());
    expect(s2.dashes).toBe(0);
    await up(page, '#btn-dash', 3);
    await up(page, '#btn-jump', 2);
    await up(page, '#dpad', 1);
  });
}
