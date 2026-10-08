import { chromium } from 'playwright';

async function main() {
  console.log('Launching headless Chrome to test failure reason display...');
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:4173/discovery/jobs ...');
  await page.goto('http://localhost:4173/discovery/jobs', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Check if failure pills are visible in the table
  const failurePills = await page.$$('.job-failure-pill');
  console.log(`Found ${failurePills.length} failure pills in the jobs table.`);

  if (failurePills.length > 0) {
    const firstPillText = await failurePills[0].innerText();
    const firstPillTitle = await failurePills[0].getAttribute('title');
    console.log(`First failure pill text: "${firstPillText.trim()}"`);
    console.log(`First failure pill title/tooltip:\n"${firstPillTitle}"`);
  }

  // Click on DSC-AP-ACCESS row or pill to open drawer
  console.log('Clicking on DSC-AP-ACCESS to verify drawer failure diagnostics...');
  const apRow = page.locator('tr:has-text("DSC-AP-ACCESS")');
  await apRow.click();
  await page.waitForTimeout(800);

  // Check drawer failure alert box
  const drawerAlert = page.locator('.job-failure-alert-box');
  const isAlertVisible = await drawerAlert.isVisible();
  console.log('Is failure alert box visible in drawer?', isAlertVisible);

  if (isAlertVisible) {
    const alertTitle = await page.locator('.job-failure-title').innerText();
    const alertCode = await page.locator('.job-failure-code-badge').innerText();
    const rootCause = await page.locator('.job-failure-text-full').innerText();
    const remediation = await page.locator('.remediation-desc').innerText();

    console.log(`\n--- DRAWER DIAGNOSTICS FOR DSC-AP-ACCESS ---`);
    console.log(`Title: ${alertTitle}`);
    console.log(`Error Code: ${alertCode}`);
    console.log(`Full Root Cause: ${rootCause}`);
    console.log(`Remediation: ${remediation}`);
    console.log(`-------------------------------------------\n`);
  }

  // Take screenshot of drawer with failure diagnostics
  await page.screenshot({ path: 'screenshots/failure_reason_drawer.png', fullPage: true });
  console.log('Saved screenshot: screenshots/failure_reason_drawer.png');

  // Close drawer
  const closeBtn = page.locator('.ov-drawer-head button:has-text("Close")');
  await closeBtn.click();
  await page.waitForTimeout(500);

  // Take screenshot of jobs table showing failure pills
  await page.screenshot({ path: 'screenshots/failure_reason_grid.png' });
  console.log('Saved screenshot: screenshots/failure_reason_grid.png');

  await browser.close();
  console.log('Test completed successfully!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
