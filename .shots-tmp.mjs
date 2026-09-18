import { chromium } from 'playwright';
const EXE = '/Users/bootnext-mac-27/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT = '/private/tmp/claude-502/-Users-bootnext-mac-27-Documents-GitHub-Discovery-and-Inventory/3313860b-622d-4a50-a33b-cb6c71f29ef5/scratchpad/shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.5 })).newPage();
const notFound = [];
page.on('console', m => { if (m.type() === 'error') notFound.push({ text: m.text(), loc: m.location() }); });
page.on('response', r => { if (r.status() === 404) notFound.push({ url: r.url() }); });
page.on('requestfailed', r => notFound.push({ failed: r.url() }));
const routes = { reconcile: '/discovery/reconcile', rules: '/discovery/reconcile/rules', rjobs: '/discovery/reconcile/jobs', jobs: '/discovery/jobs', targets: '/discovery/targets', insights: '/discovery/insights', ruledetails: '/discovery/reconcile/rules/RUL-TRN-001', disc: '/discovery/insights/discrepancies', rulenew: '/discovery/reconcile/rules/new', exceptions: '/discovery/reconcile/exceptions', reports: '/discovery/reports/DR-03' };
for (const [w, h] of [[2866, 1612], [1024, 768], [768, 1024]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const [k, r] of Object.entries(routes)) {
    await page.goto('http://localhost:4173' + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${k}-${w}.png`, fullPage: true, clip: { x: 0, y: 0, width: w, height: Math.min(h * 1.6, 2600) } });
  }
}
console.log(JSON.stringify(notFound, null, 1));
await browser.close();
