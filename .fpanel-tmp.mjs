import { chromium } from 'playwright';
const EXE = '/Users/bootnext-mac-27/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: EXE });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const routes = ['/discovery/reconcile/rules', '/discovery/reconcile/exceptions', '/discovery/insights/discrepancies', '/discovery/jobs', '/discovery/targets', '/discovery/reports/DR-03', '/discovery/insights/domain/transport/ipmpls'];
for (const [w, h] of [[768, 1024], [900, 700], [1024, 768], [1280, 800], [1920, 1080], [2866, 1612]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const r of routes) {
    await page.goto('http://localhost:4173' + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    await page.click('button[aria-label="Filters"]');
    await page.waitForSelector('.fpanel');
    const m = await page.evaluate(() => {
      const p = document.querySelector('.fpanel').getBoundingClientRect();
      const tb = document.querySelector('.gbar, .grid-bar, .toolbar, [class*="gridbar"], [class*="grid-toolbar"]');
      const btn = document.querySelector('button[aria-label="Filters"]').getBoundingClientRect();
      const apply = document.querySelector('.fp-apply').getBoundingClientRect();
      return { panel: [Math.round(p.left), Math.round(p.right), Math.round(p.bottom)], apply: [Math.round(apply.right), Math.round(apply.bottom)], btn: Math.round(btn.right), iw: innerWidth, ih: innerHeight, sw: document.documentElement.scrollWidth };
    });
    const bad = m.panel[0] < 0 || m.panel[1] > m.iw || m.apply[0] > m.iw || m.btn > m.iw || m.sw > m.iw;
    console.log(bad ? 'BAD ' : 'ok  ', w, r, JSON.stringify(m));
  }
}
await browser.close();
