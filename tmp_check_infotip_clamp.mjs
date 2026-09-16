import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://localhost:5173/discovery/insights');
await page.waitForSelector('text=Match classes');
const el = page.locator('text=Match classes').first();
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);

// hover the info tip inside the LAST tile ("Missing — no live peer") - the one at the right edge
const tile = page.locator('.info-tip', { hasText: '' }).last(); // fallback, will refine
const missingTileTip = page.locator('button, [role=button]').filter({ hasText: '' });

// more precise: find the tile containing text 'Missing' then its info-tip button
const missingTile = page.locator('div,button', { hasText: 'Missing — no live peer' }).last();
const tipBtn = missingTile.locator('.info-tip-btn').first();
await tipBtn.hover();
await page.waitForTimeout(300);

const box = await el.boundingBox();
await page.screenshot({ path: './tmp_infotip_clamp.png', clip: { x: Math.max(0, box.x - 20), y: box.y - 10, width: 1400 - box.x + 20, height: 260 } });

const defBox = await page.locator('.info-tip-def').boundingBox();
console.log('Tooltip box:', defBox);
console.log('Viewport width:', 1400);
console.log('Tooltip right edge within viewport?', defBox ? defBox.x + defBox.width <= 1400 : 'not found');
console.log('Tooltip left edge >= 0?', defBox ? defBox.x >= 0 : 'not found');

await browser.close();
