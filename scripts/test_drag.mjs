import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

console.log('1. Navigating to Location Hierarchy page...');
await page.goto('http://localhost:5173/inventory/location', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Screenshot initial state with animated threads
await page.screenshot({
  path: '/Users/apple/.gemini/antigravity-ide/brain/cfb38d23-67ab-4df9-aae0-08be8a6d5a56/scratch/screen_drag_initial.png',
  fullPage: false
});

console.log('2. Dragging States column to the right...');
const stateHeader = page.locator('.geo-col-header:has-text("States in")');
const stateBox = await stateHeader.boundingBox();

if (stateBox) {
  await page.mouse.move(stateBox.x + stateBox.width / 2, stateBox.y + stateBox.height / 2);
  await page.mouse.down();
  // Drag 80px to the right
  await page.mouse.move(stateBox.x + stateBox.width / 2 + 80, stateBox.y + stateBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

await page.screenshot({
  path: '/Users/apple/.gemini/antigravity-ide/brain/cfb38d23-67ab-4df9-aae0-08be8a6d5a56/scratch/screen_drag_state_moved.png',
  fullPage: false
});

console.log('3. Dragging Regions column to the right by 50px...');
const regionHeader = page.locator('.geo-col-header:has-text("Regions")');
const regionBox = await regionHeader.boundingBox();

if (regionBox) {
  await page.mouse.move(regionBox.x + regionBox.width / 2, regionBox.y + regionBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(regionBox.x + regionBox.width / 2 + 50, regionBox.y + regionBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

await page.screenshot({
  path: '/Users/apple/.gemini/antigravity-ide/brain/cfb38d23-67ab-4df9-aae0-08be8a6d5a56/scratch/screen_drag_both_moved.png',
  fullPage: false
});

console.log('4. Clicking Reset alignment button...');
const resetBtn = page.locator('.geo-reset-drag-btn');
if (await resetBtn.isVisible()) {
  await resetBtn.click();
  await page.waitForTimeout(400);
}

await page.screenshot({
  path: '/Users/apple/.gemini/antigravity-ide/brain/cfb38d23-67ab-4df9-aae0-08be8a6d5a56/scratch/screen_drag_reset.png',
  fullPage: false
});

console.log('Done testing drag and animated threads!');
await browser.close();
