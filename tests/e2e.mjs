/* Drives the built app through every screen and the bridge in both
   directions. Run against `vite preview` (npm run preview) on :4173. */
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.route('**://fonts.**', r => r.abort());
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); }); /* fonts are aborted on purpose */
let fails = 0;
const ok = (label, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  ' + detail : '')); if (!cond) fails++; };
const text = sel => p.evaluate(s => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? '', sel);
const count = sel => p.evaluate(s => document.querySelectorAll(s).length, sel);

/* ── React-owned: Physical Resources ───────────────────── */
await p.goto(BASE + '/inventory/physical'); await p.waitForSelector('.nst-table tbody tr');
ok('physical renders 12 rows', await count('.nst-table tbody tr') === 12);
ok('crumb', (await text('.topbar-crumb')) === 'Resources · Physical Resources', await text('.topbar-crumb'));
ok('rail highlights Physical', (await text('.side-item.is-active')) === 'Physical Resources');
const tabs = async () => (await text('.tabbar')).replace(/([a-zA-Z])(\d)/g, '$1 $2');
ok('tabs from ledger', (await tabs()).includes('Router 2,148') && (await tabs()).includes('gNodeB 14'), await tabs());
ok('4 active stock chips, no archive chip', await count('.stock-chip') === 4);
await p.click('.stock-chip:nth-child(3)'); /* drop Deployed */
await p.waitForTimeout(100);
ok('URL carries stock filter', p.url().includes('stock=planned%2Cinstore%2Cfaulty') || p.url().includes('stock=planned,instore,faulty'), p.url());
ok('tab counts follow the chip', (await tabs()).includes('Router 131'), await tabs());
ok('grid count follows the chip', (await text('.grid-count')).includes('of 131'), await text('.grid-count'));
await p.click('.tab:nth-child(2)'); await p.waitForTimeout(120);
ok('switch tab → URL', p.url().includes('cls=switch'));
ok('switch chips', /In store\s*8/.test(await text('.stock-chips')), await text('.stock-chips'));
/* row menu with icons */
await p.click('.nst-table tbody tr:first-child .kb');
ok('row menu opens', await count('.kmenu .kmenu-i') === 8);
ok('every item has an icon', await count('.kmenu .kmenu-i svg.kmi') === 8);
await p.click('.kmenu .kmenu-i:nth-child(3)'); /* Open site */
await p.waitForTimeout(400);
ok('row action → legacy site screen', p.url().includes('/inventory/location/site/'), p.url());
await p.waitForSelector('#view .page');
ok('legacy site renders', (await text('#view')).length > 200);
ok('crumb for site', (await text('.topbar-crumb')) === 'Location · Site details');
ok('rail highlights Location', (await text('.side-item.is-active')) === 'Location');

/* ── React ↔ React: decommissioned → archive with class ─ */
await p.goto(BASE + '/inventory/physical?cls=dwdm'); await p.waitForSelector('.stock-presets');
await p.click('.stock-presets button:nth-child(2)');
await p.waitForSelector('.pgr');
ok('→ archive with class', p.url().endsWith('/inventory/inactive?cls=dwdm'), p.url());
ok('archive DWDM 19 rows', await count('.nst-table tbody tr') === 19);
ok('archive tab active', (await text('.tab.is-on')).startsWith('DWDM'));
await p.click('.tab:first-child'); await p.waitForTimeout(100);
ok('router archive paginates 20', await count('.nst-table tbody tr') === 20);
ok('pager range', (await text('.pgr-note')).startsWith('Showing 1–20 of 289'), await text('.pgr-note'));
await p.click('.pgr-b[aria-label="Next page"]'); await p.waitForTimeout(80);
ok('page 2', (await text('.pgr-note')).startsWith('Showing 21–40'));
await p.selectOption('.pgr-sel', '50'); await p.waitForTimeout(80);
ok('50 per page', await count('.nst-table tbody tr') === 50);
ok('archive has no stock chips', await count('.stock-chip') === 0);
ok('status pill class on Physical only', await count('.st-td') === 0);
await p.click('.grid-tools [aria-label="More actions"]');
ok('grid menu: page actions first', (await text('.kmenu-r')).startsWith('Go to active inventory'));
await p.click('.kmenu-r .kmenu-i:first-child'); await p.waitForTimeout(150);
ok('→ back to active inventory', p.url().endsWith('/inventory/physical'), p.url());

/* ── legacy → React: a drill from a legacy screen lands on a React one ── */
await p.goto(BASE + '/discovery/insights'); await p.waitForSelector('#view .page');
ok('legacy insights renders', (await text('#view')).includes('collector'));
const drilled = await p.evaluate(() => { window.__nsLegacy.drillTo('physical', 'Spares in store', 'stock=instore'); return location.pathname + location.search; });
await p.waitForSelector('.stock-chips');
ok('legacy drill → React physical with filter', drilled.startsWith('/inventory/physical?stock=instore'), drilled);
ok('drill banner shows', (await text('.drill-bar')).includes('Spares in store'));
ok('only In store selected', (await text('.stock-chip.is-on')) .includes('In store') && await count('.stock-chip.is-on') === 1);

/* ── every legacy screen mounts through the bridge ─────── */
for (const path of ['/discovery/jobs', '/discovery/targets', '/discovery/reconcile', '/inventory', '/inventory/location',
  '/inventory/virtual', '/inventory/passive', '/inventory/links', '/inventory/services', '/inventory/reports',
  '/inventory/resource/NDLS-J960-P_R1-T1-NR', '/inventory/node/NDLS-J960-P_R1-T1-NR', '/inventory/location/site/BGLK-277/capex']) {
  await p.goto(BASE + path); await p.waitForSelector('#view .page, #view .nv-head', { timeout: 5000 }).catch(() => {});
  const t = await text('#view');
  ok('legacy ' + path.padEnd(42), t.length > 200, t.length + ' chars');
}

/* ── in-place legacy navigation updates the URL ─────────── */
await p.goto(BASE + '/inventory/location'); await p.waitForSelector('#view .page');
await p.evaluate(() => window.__nsLegacy.go('reports')); await p.waitForTimeout(150);
ok('legacy go() syncs URL', p.url().endsWith('/inventory/reports'), p.url());
ok('crumb follows', (await text('.topbar-crumb')) === 'Reports');

/* ── deep link + reload keeps state ─────────────────────── */
await p.goto(BASE + '/inventory/physical?cls=server&stock=planned'); await p.waitForSelector('.stock-chips');
ok('deep link restores class', (await text('.tab.is-on')).startsWith('Server'));
ok('deep link restores stock', await count('.stock-chip.is-on') === 1);

/* ── sidebar collapse persists and reaches legacy CSS ───── */
await p.click('.side-toggle'); await p.waitForTimeout(50);
ok('collapsed class', await p.evaluate(() => document.querySelector('.app').classList.contains('is-collapsed')));
await p.reload(); await p.waitForSelector('.stock-chips');
ok('collapse persists', await p.evaluate(() => document.querySelector('.app').classList.contains('is-collapsed')));

console.log('\n' + (errs.length ? 'ERRORS:\n  ' + errs.join('\n  ') : 'no page or console errors'));
console.log(fails ? `${fails} FAILED` : 'all passed');
await b.close();
process.exit(fails || errs.length ? 1 : 0);
