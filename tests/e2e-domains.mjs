/* Domain hierarchy (Transport └ IP/MPLS) across every Discovery &
   Reconciliation screen, plus a horizontal-overflow audit at the window
   widths and browser-zoom levels the responsive work targets. Run against
   `vite preview` (npm run preview) on :4173:  npm run test:e2e:domains
   Env: BASE (server), CHROMIUM (browser executable), MODE=func|resp|all */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const MODE = process.env.MODE ?? 'all';
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
page.route('**://fonts.**', r => r.abort());
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|favicon/.test(m.text())) errs.push('console: ' + m.text()); });
let fails = 0;
const ok = (cond, label) => { console.log((cond ? 'ok   ' : 'FAIL ') + label); if (!cond) fails++; };

async function goto(path) { await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(250); }
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

/* one grid screen: the Domain filter lists the tree, Transport ⊇ IP/MPLS, IP/MPLS exact, RAN untouched */
async function gridChecks(name, path) {
  console.log(`\n# ${name} (${path})`);
  await goto(path);
  const opts = await domainOptions();
  ok(JSON.stringify(opts.map(o => o.v)) === JSON.stringify(['', 'RAN', 'Core', 'Transport', 'IP/MPLS']), `${name}: Domain options are the tree in order`);
  const ip = opts.find(o => o.v === 'IP/MPLS');
  ok(!!ip && /└/.test(ip.l) && ip.l.indexOf('└') > 0, `${name}: IP/MPLS option is indented under Transport`);
  await applyFilter('Domain', 'Transport');
  let rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /Transport/.test(r)), `${name}: Transport filter → every row is Transport (${rows.length})`);
  ok(rows.some(r => /IP\/MPLS/.test(r)), `${name}: Transport filter includes IP/MPLS rows`);
  await goto(path);
  await applyFilter('Domain', 'IP/MPLS');
  rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /Transport · IP\/MPLS/.test(r)), `${name}: IP/MPLS filter → only IP/MPLS rows, tagged "Transport · IP/MPLS" (${rows.length})`);
  await goto(path);
  await applyFilter('Domain', 'RAN');
  rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => !/IP\/MPLS|Transport/.test(r)), `${name}: RAN filter excludes Transport and IP/MPLS (${rows.length})`);
}

if (MODE !== 'resp') {
  await gridChecks('Reconciliation jobs', '/discovery/reconcile/jobs');
  await gridChecks('Reconciliation results', '/discovery/reconcile/results');
  await gridChecks('Reconciliation exceptions', '/discovery/reconcile/exceptions');
  await gridChecks('Rules', '/discovery/reconcile/rules');
  await gridChecks('Discrepancy details', '/discovery/insights/discrepancies');
  await gridChecks('Scan jobs (legacy)', '/discovery/jobs');
  await gridChecks('Scan targets (legacy)', '/discovery/targets');

  console.log('\n# ?domain= query');
  await goto('/discovery/reconcile/results?domain=IPMPLS');
  let rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /IP\/MPLS/.test(r)), 'results?domain=IPMPLS pre-filters to IP/MPLS');
  await goto('/discovery/reconcile/results?domain=Transport');
  rows = await rowsText();
  ok(rows.some(r => /IP\/MPLS/.test(r)) && rows.every(r => /Transport/.test(r)), 'results?domain=Transport includes IP/MPLS');
  await goto('/discovery/insights/discrepancies?domain=ipmpls');
  rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /IP\/MPLS/.test(r)), 'discrepancies?domain=ipmpls (slug) pre-filters');
  await goto('/discovery/jobs?drill=IP%2FMPLS&from=Insights&domain=IP%2FMPLS');
  rows = await rowsText();
  ok(rows.length > 0 && rows.every(r => /IP\/MPLS/.test(r)), `Scan jobs ?domain=IP/MPLS narrows to IP/MPLS (${rows.length})`);

  console.log('\n# Domain devices routes');
  const title = () => page.textContent('.page .row span[style*="1.375rem"]').then(t => (t || '').trim());
  await goto('/discovery/insights/domain/transport/ipmpls');
  ok(/^Transport · IP\/MPLS devices/.test(await title()), `nested route title: "${await title()}"`);
  ok(/Domain devices/.test(await page.textContent('body')), 'nested route resolves to the Domain devices screen');
  await goto('/discovery/insights/domain/ipmpls');
  await page.waitForTimeout(300);
  ok(page.url().endsWith('/discovery/insights/domain/transport/ipmpls'), `flat /domain/ipmpls redirects → ${page.url()}`);
  await goto('/discovery/insights/domain/ipmpls?region=West');
  await page.waitForTimeout(300);
  ok(page.url().endsWith('/domain/transport/ipmpls?region=West'), 'redirect keeps the query string');
  await goto('/discovery/insights/domain/transport');
  ok(/^Transport devices/.test(await title()), `parent route title: "${await title()}"`);
  await goto('/discovery/insights/domain/transport/ran');
  ok(/Unknown domain/.test(await page.textContent('body')), 'RAN under Transport is rejected');
  await goto('/discovery/insights/domain/core/ipmpls');
  ok(/Unknown domain/.test(await page.textContent('body')), 'IP/MPLS under Core is rejected');
  await goto('/discovery/insights/domain/optical');
  ok(/Unknown domain/.test(await page.textContent('body')), 'an unknown domain is rejected');

  console.log('\n# Insights');
  await goto('/discovery/insights');
  ok(/3 domains · 1 sub-domain/.test(await page.textContent('.ix-context') || ''), 'header counts 3 domains · 1 sub-domain');
  const heat = await page.$$eval('.ix-table th', ths => ths.map(t => t.textContent.trim()));
  ok(heat.indexOf('IP/MPLS') === heat.indexOf('Transport') + 1, 'heat header: IP/MPLS directly after Transport');
  ok((await page.$$eval('.ix-dom', ds => ds.map(d => d.textContent.trim()))).includes('Transport · IP/MPLS'), 'domain tags read "Transport · IP/MPLS"');
  const first = await page.$$eval('.ix-table tbody tr', trs => trs.map(t => t.querySelector('td')?.textContent.trim()));
  ok(first.indexOf('Transport · IP/MPLS') === first.indexOf('Transport') + 1, 'tables: IP/MPLS row directly under Transport');
  await page.click('.ix-panel:has-text("By domain") .ix-table tbody tr:has-text("Transport · IP/MPLS")');
  await page.waitForTimeout(400);
  ok(/\/domain\/transport\/ipmpls/.test(page.url()), `By domain row → nested route (${page.url()})`);

  console.log('\n# Reconciliation overview');
  await goto('/discovery/reconcile');
  const cells = await page.$$eval('table tbody tr td:first-child', tds => tds.map(t => t.textContent.trim()));
  ok(cells.indexOf('Transport · IP/MPLS') === cells.indexOf('Transport') + 1, '"By domain": IP/MPLS row directly under Transport');
  await page.click('table tbody tr:has-text("Transport · IP/MPLS")');
  await page.waitForTimeout(400);
  ok(/\/domain\/transport\/ipmpls/.test(page.url()), `row click → nested route (${page.url()})`);

  console.log('\n# Rule definition / details');
  await goto('/discovery/reconcile/rules/new');
  const sel = await page.$$eval('select', ss => ss.map(s => [...s.options].map(o => ({ v: o.value, l: o.textContent }))));
  const dom = sel.find(o => o.some(x => x.v === 'IPMPLS'));
  ok(!!dom && JSON.stringify(dom.map(o => o.v)) === JSON.stringify(['RAN', 'Core', 'Transport', 'IPMPLS']), 'Domain select lists the tree in order');
  ok(!!dom && /└ IP\/MPLS$/.test(dom[3].l) && dom[3].l.indexOf('└') > 0, 'IP/MPLS indented under Transport in the form');
  await goto('/discovery/reconcile/rules/RUL-IPM-001');
  ok(/RUL-IPM-001 · Transport · IP\/MPLS/.test(await page.textContent('body')), 'Rule details header shows Transport · IP/MPLS');
  await goto('/discovery/reconcile/rules/RUL-IPM-001/edit');
  ok(await page.$$eval('select', ss => ss.some(s => s.value === 'IPMPLS')), 'editing an IP/MPLS rule pre-selects IP/MPLS');

  console.log('\n# Reports');
  for (const id of ['DR-01', 'DR-02', 'DR-03']) {
    await goto(`/discovery/reports/${id}`);
    ok(/Transport · IP\/MPLS/.test(await page.textContent('body')), `${id} shows Transport · IP/MPLS`);
  }

  console.log('\n# Filter panel stays inside the viewport');
  for (const [w, h] of [[768, 1024], [1024, 768], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const r of ['/discovery/reconcile/rules', '/discovery/jobs', '/discovery/targets']) {
      await goto(r);
      await page.click('button[aria-label="Filters"]');
      await page.waitForSelector('.fpanel');
      const m = await page.evaluate(() => {
        const p = document.querySelector('.fpanel').getBoundingClientRect(), a = document.querySelector('.fp-apply').getBoundingClientRect();
        return p.left >= 0 && p.right <= innerWidth && a.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth;
      });
      ok(m, `${w}px ${r}: filter panel and Apply button inside the viewport`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

if (MODE !== 'func') {
  console.log('\n# Horizontal overflow audit (windows 768–1920, then 1920 at 90/80/75/67/50% zoom)');
  const ROUTES = [
    '/discovery/insights', '/discovery/insights/devices', '/discovery/insights/discovered', '/discovery/insights/region/West',
    '/discovery/insights/domain/transport', '/discovery/insights/domain/transport/ipmpls', '/discovery/insights/discrepancies',
    '/discovery/jobs', '/discovery/targets', '/discovery/targets/NDLS-J960-P_R1-T1-NR',
    '/discovery/reports', '/discovery/reports/DR-01', '/discovery/reports/DR-03',
    '/discovery/reconcile', '/discovery/reconcile/jobs', '/discovery/reconcile/results', '/discovery/reconcile/exceptions',
    '/discovery/reconcile/rules', '/discovery/reconcile/rules/new', '/discovery/reconcile/rules/RUL-TRN-001', '/discovery/reconcile/rules/RUL-TRN-001/edit'
  ];
  const WIDTHS = [[768, 1024], [900, 700], [1024, 768], [1280, 800], [1440, 900], [1600, 900], [1920, 1080], [2133, 1200], [2400, 1350], [2560, 1440], [2866, 1612], [3840, 2160]];
  const issues = [];
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    for (const r of ROUTES) {
      await goto(r);
      const m = await page.evaluate(() => {
        const iw = window.innerWidth, over = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
          const rc = el.getBoundingClientRect();
          if (rc.width === 0 || rc.right <= iw + 1) continue;
          let p = el.parentElement, scrolls = false;
          while (p && p !== document.body) { const pc = getComputedStyle(p); if (/(auto|scroll)/.test(pc.overflowX) && p.scrollWidth > p.clientWidth) { scrolls = true; break; } p = p.parentElement; }
          if (!scrolls) over.push(`${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).slice(0, 2).join('.')} right=${Math.round(rc.right)}`);
          if (over.length > 3) break;
        }
        return { sw: document.documentElement.scrollWidth, iw, over };
      });
      if (m.sw > m.iw + 1 || m.over.length) issues.push(`${w}px ${r}: scrollWidth=${m.sw} innerWidth=${m.iw} ${m.over.join(' | ')}`);
    }
  }
  issues.forEach(i => console.log('   ', i));
  ok(issues.length === 0, `no horizontal page overflow on ${ROUTES.length} routes × ${WIDTHS.length} widths`);
}

ok(errs.length === 0, `zero page/console errors${errs.length ? ': ' + errs.join(' ; ') : ''}`);
console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
await b.close();
process.exit(fails ? 1 : 0);
