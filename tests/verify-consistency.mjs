import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';

console.log('Starting Playwright automated browser verification...');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => {
  errors.push(err.message);
});

try {
  // Test 1: All locations list view
  console.log('Navigating to /inventory/location?view=list&drill=All+locations...');
  await page.goto('http://localhost:5173/inventory/location?view=list&drill=All+locations', {
    waitUntil: 'networkidle',
    timeout: 15000
  });
  await page.waitForTimeout(1000);

  const bodyText = await page.innerText('body');
  console.log('Checking page text for 12,494...');
  assert.ok(bodyText.includes('12,494'), 'Page body must contain 12,494');

  // Check region cards
  console.log('Checking North region (3,457)...');
  assert.ok(bodyText.includes('3,457') || bodyText.includes('3457'), 'North region must show 3,457');

  console.log('Checking East region (4,673)...');
  assert.ok(bodyText.includes('4,673') || bodyText.includes('4673'), 'East region must show 4,673');

  console.log('Checking West region (2,431)...');
  assert.ok(bodyText.includes('2,431') || bodyText.includes('2431'), 'West region must show 2,431');

  console.log('Checking South region (1,933)...');
  assert.ok(bodyText.includes('1,933') || bodyText.includes('1933'), 'South region must show 1,933');

  // Take screenshot of reconciled view
  await page.screenshot({ path: 'screenshots/02_inventory_location_list_all.png' });
  console.log('Updated screenshots/02_inventory_location_list_all.png');

  // Test 2: Datacenters filter
  console.log('Navigating to /inventory/location?view=list&type=dc&drill=Datacenters...');
  await page.goto('http://localhost:5173/inventory/location?view=list&type=dc&drill=Datacenters', {
    waitUntil: 'networkidle',
    timeout: 15000
  });
  await page.waitForTimeout(800);
  const dcText = await page.innerText('body');
  assert.ok(dcText.includes('848'), 'Datacenters view must contain 848');
  await page.screenshot({ path: 'screenshots/03_inventory_location_list_datacenters.png' });

  // Test 3: PoP locations filter
  console.log('Navigating to /inventory/location?view=list&type=pop&drill=PoP+locations...');
  await page.goto('http://localhost:5173/inventory/location?view=list&type=pop&drill=PoP+locations', {
    waitUntil: 'networkidle',
    timeout: 15000
  });
  await page.waitForTimeout(800);
  const popText = await page.innerText('body');
  assert.ok(popText.includes('2,711'), 'PoP view must contain 2,711');
  await page.screenshot({ path: 'screenshots/04_inventory_location_list_pops.png' });

  // Test 4: Sites filter
  console.log('Navigating to /inventory/location?view=list&type=site&drill=Sites...');
  await page.goto('http://localhost:5173/inventory/location?view=list&type=site&drill=Sites', {
    waitUntil: 'networkidle',
    timeout: 15000
  });
  await page.waitForTimeout(800);
  const siteText = await page.innerText('body');
  assert.ok(siteText.includes('8,935'), 'Sites view must contain 8,935');
  await page.screenshot({ path: 'screenshots/05_inventory_location_list_sites.png' });

  console.log('Console errors encountered:', errors.length);
  if (errors.length > 0) {
    console.warn('Errors:', errors);
  }

  console.log('ALL PLAYWRIGHT ASSERTIONS PASSED! 100% RECONCILED!');
} finally {
  await browser.close();
}
