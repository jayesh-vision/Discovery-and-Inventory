/* Hierarchy + responsive verification against the preview server on :4173 */
import { chromium } from 'playwright';

const EXE = '/Users/bootnext-mac-27/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const BASE = 'http://localhost:4173';
const MODE = process.argv[2] || 'all';
const fails = [];
const ok = (cond, msg) => { if (!cond) { fails.push(msg); console.log('  FAIL', msg); } else console.log('  ok  ', msg); };

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
}

/* apply one DataGrid / legacy filter-panel value */
async function applyFilter(field, value) {
  await page.click('button[aria-label="Filters"]');
  await page.waitForSelector('.fpanel');
  await page.locator('.fpanel .fp-f', { hasText: field }).first().click();
  await page.selectOption('.fpanel select.fp-sel', value);
  await page.click('.fpanel .fp-apply');
  await page.waitForTimeout(300);
}
async function domainOptions() {
  await page.click('button[aria-label="Filters"]');
  await page.waitForSelector('.fpanel');
  await page.locator('.fpanel .fp-f', { hasText: 'Domain' }).first().click();
  const opts = await page.$$eval('.fpanel select.fp-sel option', os => os.map(o => ({ v: o.value, l: o.textContent })));
  await page.click('.fpanel .fp-x');
  return opts;
}
const rowsText = () => page.$$eval('table tbody tr', trs => trs.map(t => t.innerText.replace(/\s+/g, ' ')).filter(t => t.trim() && !/No .* found|no rows/i.test(t)));

async function gridChecks(name, path, expectIpmpls = true) {
  console.log(`\n# ${name} (${path})`);
  await goto(path);
  const opts = await domainOptions();
  ok(JSON.stringify(opts.map(o => o.v)) === JSON.stringify(['', 'RAN', 'Core', 'Transport', 'IP/MPLS']), `${name}: Domain options are the tree in order`);
  const ip = opts.find(o => o.v === 'IP/MPLS');
  ok(ip && /└/.test(ip.l) && ip.l.indexOf('└') > 0, `${name}: IP/MPLS option is indented under Transport`);
  await applyFilter('Domain', 'Transport');
  let rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /Transport/.test(r)), `${name}: Transport filter → every row is Transport (${rows.length} rows)`);
  if (expectIpmpls) ok(rows.some(r => /IP\/MPLS/.test(r)), `${name}: Transport filter includes IP/MPLS rows`);
  await goto(path);
  await applyFilter('Domain', 'IP/MPLS');
  rows = await rowsText();
  if (expectIpmpls) ok(rows.length > 0 && rows.every(r => /Transport · IP\/MPLS/.test(r)), `${name}: IP/MPLS filter → only IP/MPLS rows, tagged "Transport · IP/MPLS" (${rows.length} rows)`);
  await goto(path);
  await applyFilter('Domain', 'RAN');
  rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => !/IP\/MPLS|Transport/.test(r)), `${name}: RAN filter excludes Transport and IP/MPLS (${rows.length} rows)`);
}

if (MODE === 'all' || MODE === 'func') {
  await gridChecks('Reconciliation jobs', '/discovery/reconcile/jobs');
  await gridChecks('Reconciliation results', '/discovery/reconcile/results');
  await gridChecks('Reconciliation exceptions', '/discovery/reconcile/exceptions');
  await gridChecks('Rules', '/discovery/reconcile/rules');
  await gridChecks('Discrepancy details', '/discovery/insights/discrepancies');
  await gridChecks('Scan jobs (legacy)', '/discovery/jobs');
  await gridChecks('Scan targets (legacy)', '/discovery/targets');

  console.log('\n# URL query domain');
  await goto('/discovery/reconcile/results?domain=IPMPLS');
  let rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /IP\/MPLS/.test(r)), 'results?domain=IPMPLS pre-filters to IP/MPLS');
  await goto('/discovery/reconcile/results?domain=Transport');
  rows = await rowsText();
  ok(rows.some(r => /IP\/MPLS/.test(r)) && rows.every(r => /Transport/.test(r)), 'results?domain=Transport includes IP/MPLS');
  await goto('/discovery/insights/discrepancies?domain=ipmpls');
  rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /IP\/MPLS/.test(r)), 'discrepancies?domain=ipmpls (slug) pre-filters');

  console.log('\n# Domain devices routes');
  await goto('/discovery/insights/domain/transport/ipmpls');
  let title = await page.textContent('.page .row span[style*="1.375rem"]');
  ok(/Transport · IP\/MPLS devices/.test(title || ''), `nested route title: "${title?.trim()}"`);
  let crumb = await page.textContent('body');
  ok(/Domain devices/.test(crumb || ''), 'nested route resolves to the Domain devices screen (breadcrumb present)');
  await goto('/discovery/insights/domain/ipmpls');
  await page.waitForTimeout(300);
  ok(page.url().endsWith('/discovery/insights/domain/transport/ipmpls'), `flat /domain/ipmpls redirects → ${page.url()}`);
  await goto('/discovery/insights/domain/ipmpls?region=West');
  await page.waitForTimeout(300);
  ok(page.url().endsWith('/domain/transport/ipmpls?region=West'), `redirect keeps the query → ${page.url()}`);
  await goto('/discovery/insights/domain/transport');
  title = await page.textContent('.page .row span[style*="1.375rem"]');
  ok(/^Transport devices/.test((title || '').trim()), `parent route title: "${title?.trim()}"`);
  await goto('/discovery/insights/domain/transport/ran');
  ok(/Unknown domain/.test(await page.textContent('body')), 'RAN under Transport is rejected (Unknown domain)');
  await goto('/discovery/insights/domain/core/ipmpls');
  ok(/Unknown domain/.test(await page.textContent('body')), 'IP/MPLS under Core is rejected (Unknown domain)');

  console.log('\n# Insights');
  await goto('/discovery/insights');
  const ctxText = await page.textContent('.ix-context');
  ok(/3 domains · 1 sub-domain/.test(ctxText || ''), `Insights header: ${ctxText?.replace(/\s+/g, ' ').slice(0, 80)}`);
  const heat = await page.$$eval('.ix-table th', ths => ths.map(t => t.textContent.trim()));
  const idxT = heat.indexOf('Transport'), idxI = heat.indexOf('IP/MPLS');
  ok(idxT >= 0 && idxI === idxT + 1, `Insights heat header: IP/MPLS directly after Transport (${heat.filter(h => /RAN|Core|Transport|IP/.test(h)).join(', ')})`);
  const tags = await page.$$eval('.ix-dom', ds => ds.map(d => d.textContent.trim()));
  ok(tags.some(t => t === 'Transport · IP/MPLS'), 'Insights domain tags show "Transport · IP/MPLS"');
  const domainRows = await page.$$eval('.ix-table tbody tr', trs => trs.map(t => t.querySelector('td')?.textContent.trim()));
  const iT = domainRows.indexOf('Transport'), iI = domainRows.indexOf('Transport · IP/MPLS');
  ok(iT >= 0 && iI === iT + 1, 'Insights tables: IP/MPLS row directly under Transport');
  await page.click('.ix-panel:has-text("By domain") .ix-table tbody tr:has-text("Transport · IP/MPLS")');
  await page.waitForTimeout(400);
  ok(/\/domain\/transport\/ipmpls/.test(page.url()), `Insights row click → nested route (${page.url()})`);

  console.log('\n# Reconciliation overview');
  await goto('/discovery/reconcile');
  const rowsR = await page.$$eval('table tbody tr td:first-child', tds => tds.map(t => t.textContent.trim()));
  const rT = rowsR.indexOf('Transport'), rI = rowsR.indexOf('Transport · IP/MPLS');
  ok(rT >= 0 && rI === rT + 1, 'Reconcile "By domain": IP/MPLS row directly under Transport');
  await page.click('table tbody tr:has-text("Transport · IP/MPLS")');
  await page.waitForTimeout(400);
  ok(/\/domain\/transport\/ipmpls/.test(page.url()), `Reconcile row click → nested route (${page.url()})`);

  console.log('\n# Rule definition form');
  await goto('/discovery/reconcile/rules/new');
  const sel = await page.$$eval('select', ss => ss.map(s => [...s.options].map(o => ({ v: o.value, l: o.textContent }))));
  const dom = sel.find(o => o.some(x => x.v === 'IPMPLS'));
  ok(dom && JSON.stringify(dom.map(o => o.v)) === JSON.stringify(['RAN', 'Core', 'Transport', 'IPMPLS']), 'Rule form Domain select lists the tree in order');
  ok(dom && /└ IP\/MPLS$/.test(dom[3].l) && dom[3].l.indexOf('└') > 0, 'Rule form: IP/MPLS indented under Transport');
  await goto('/discovery/reconcile/rules/RUL-IPM-001');
  ok(/RUL-IPM-001 · Transport · IP\/MPLS/.test(await page.textContent('body')), 'Rule details header shows Transport · IP/MPLS');
  await goto('/discovery/reconcile/rules/RUL-IPM-001/edit');
  ok((await page.inputValue('select >> nth=0')) === 'IPMPLS' || (await page.$$eval('select', ss => ss.some(s => s.value === 'IPMPLS'))), 'Editing an IP/MPLS rule pre-selects IP/MPLS');

  console.log('\n# Reports');
  await goto('/discovery/reports/DR-01');
  ok(/Transport · IP\/MPLS/.test(await page.textContent('body')), 'DR-01 scorecard shows Transport · IP/MPLS');
  await goto('/discovery/reports/DR-02');
  ok(/Transport · IP\/MPLS/.test(await page.textContent('body')), 'DR-02 shows Transport · IP/MPLS');

  console.log('\n# Legacy jobs drill from Insights (domain=IP/MPLS)');
  await goto('/discovery/jobs?drill=IP%2FMPLS&from=Insights&domain=IP%2FMPLS');
  rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /IP\/MPLS/.test(r)), `jobs?domain=IP/MPLS narrows to IP/MPLS (${rows.length} rows)`);
}

if (MODE === 'all' || MODE === 'resp') {
  console.log('\n# Responsive / zoom audit');
  const ROUTES = [
    '/discovery/insights', '/discovery/insights/devices', '/discovery/insights/discovered', '/discovery/insights/region/West',
    '/discovery/insights/domain/transport', '/discovery/insights/domain/transport/ipmpls', '/discovery/insights/discrepancies',
    '/discovery/jobs', '/discovery/targets', '/discovery/targets/NDLS-J960-P_R1-T1-NR',
    '/discovery/reports', '/discovery/reports/DR-01', '/discovery/reports/DR-03',
    '/discovery/reconcile', '/discovery/reconcile/jobs', '/discovery/reconcile/results', '/discovery/reconcile/exceptions',
    '/discovery/reconcile/rules', '/discovery/reconcile/rules/new', '/discovery/reconcile/rules/RUL-TRN-001', '/discovery/reconcile/rules/RUL-TRN-001/edit'
  ];
  /* 768…1920 windows, then 1920 at 90/80/75/67/50% zoom (= a wider CSS viewport) */
  const WIDTHS = [[768, 1024], [900, 700], [1024, 768], [1280, 800], [1440, 900], [1600, 900], [1920, 1080], [2133, 1200], [2400, 1350], [2560, 1440], [2866, 1612], [3840, 2160]];
  const issues = [];
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const r of ROUTES) {
      await goto(r);
      const m = await page.evaluate(() => {
        const iw = window.innerWidth;
        const over = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
          const rc = el.getBoundingClientRect();
          if (rc.width === 0) continue;
          /* an element allowed to scroll inside its own container is fine */
          if (rc.right > iw + 1) {
            let p = el.parentElement, scrolls = false;
            while (p && p !== document.body) { const pc = getComputedStyle(p); if (/(auto|scroll)/.test(pc.overflowX) && p.scrollWidth > p.clientWidth) { scrolls = true; break; } p = p.parentElement; }
            if (!scrolls) over.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} right=${Math.round(rc.right)}`);
          }
          if (over.length > 4) break;
        }
        return { sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, iw, over };
      });
      const bad = m.sw > m.iw + 1 || m.bw > m.iw + 1 || m.over.length;
      if (bad) issues.push({ w, r, ...m });
    }
  }
  if (issues.length) { console.log('  overflow issues:'); issues.forEach(i => console.log('   ', i.w, i.r, `scrollWidth=${i.sw}/${i.bw} innerWidth=${i.iw}`, i.over.join(' | '))); }
  ok(issues.length === 0, `no horizontal page overflow on ${ROUTES.length} routes × ${WIDTHS.length} widths`);
}

console.log('\nconsole errors:', errors.length ? errors : 'none');
ok(errors.length === 0, 'zero console/page errors');
console.log(fails.length ? `\n${fails.length} FAILURES` : '\nALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
