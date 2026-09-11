import { chromium } from 'playwright';
const CHROMIUM = "/Users/bootnext-mac-27/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const BASE = 'http://localhost:4173';

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', String(e)));

async function report(step) {
  const url = page.url();
  const crumb = await page.locator('.topbar').first().innerText().catch(() => '(no topbar)');
  const title = await page.locator('.vw-page-title, h1').first().innerText().catch(() => '(no title)');
  const desc = await page.locator('.vw-page-description').first().innerText().catch(() => '(no desc)');
  console.log(`--- ${step} ---`);
  console.log('URL:', url);
  console.log('BREADCRUMB:', crumb);
  console.log('TITLE:', title);
  console.log('DESC:', desc);
}

await page.goto(`${BASE}/discovery/jobs`, { waitUntil: 'networkidle' });
await page.waitForSelector('#view .page');
await report('1. Scan jobs page');

// open kebab on first job row, click "View targets"
await page.locator('#view table.nst-table tbody tr').first().locator('[data-kebab]').click();
await page.waitForTimeout(150);
await page.getByText('View targets', { exact: true }).click();
await page.waitForTimeout(300);
await report('2. Targets in DSC-SOUTH-CORE list (first arrival)');

// click first row -> transcript
await page.locator('#view table.nst-table tbody tr').first().click();
await page.waitForTimeout(400);
await report('3. Transcript (first click, row 1)');

// go back to list via breadcrumb "Scan targets"
await page.locator('.topbar .topbar-crumb-link', { hasText: 'Scan targets' }).click();
await page.waitForTimeout(400);
await report('4. Back on targets list (via breadcrumb)');

// click first row again
await page.locator('#view table.nst-table tbody tr').first().click();
await page.waitForTimeout(400);
await report('5. Transcript (second click, row 1 again)');

// go back via breadcrumb again, then click a DIFFERENT (2nd) row
await page.locator('.topbar .topbar-crumb-link', { hasText: 'Scan targets' }).click();
await page.waitForTimeout(400);
await report('6. Back on targets list again');

await page.locator('#view table.nst-table tbody tr').nth(1).click();
await page.waitForTimeout(400);
await report('7. Transcript (click row 2)');

// now try browser back instead of breadcrumb
await page.goBack();
await page.waitForTimeout(400);
await report('8. Browser back to list');

await page.locator('#view table.nst-table tbody tr').nth(2).click();
await page.waitForTimeout(400);
await report('9. Transcript (click row 3, after browser back)');

await browser.close();
