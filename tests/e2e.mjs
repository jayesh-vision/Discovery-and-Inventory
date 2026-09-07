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
ok('no header of our own (host draws it)', await count('.topbar') === 0 && await count('header') === 0);
ok('title names the screen', (await p.title()).startsWith('Resources · Physical Resources'), await p.title());
ok('embedded: no left menu', await count('.side') === 0);
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
ok('title for site', (await p.title()).startsWith('Location · Site details'), await p.title());
ok('site screen has its own way back', (await text('#view')).includes('Back to list'));

/* ── React ↔ React: decommissioned → archive with class ─ */
await p.goto(BASE + '/inventory/physical?cls=dwdm'); await p.waitForSelector('.stock-presets');
await p.click('.stock-presets button:nth-child(2)');
await p.waitForSelector('.nst-table tbody .ro-lock');   /* the archive's read-only rows, not the ones we came from */
ok('→ archive with class', p.url().endsWith('/inventory/inactive?cls=dwdm'), p.url());
ok('archive DWDM 19 rows, all under one page', await count('.nst-table tbody tr') === 19 && await count('.tbl-more') === 0);
ok('archive tab active', (await text('.tab.is-on')).startsWith('DWDM'));
await p.click('.tab:first-child'); await p.waitForTimeout(150);
ok('router archive starts at 25 rows', await count('.nst-table tbody tr') === 25, String(await count('.nst-table tbody tr')));
ok('grid count reads what is painted, not the whole set', (await text('.grid-count')) === 'Showing 25 of 289', await text('.grid-count'));
ok('strip names the next page', (await text('.tbl-more')).includes('25'), await text('.tbl-more'));
/* the grid is a bounded scroll box of its own, and the strip at its end is the
   sentinel: reaching it asks for the next block */
const wrap = () => p.evaluate(() => {
  const w = document.querySelector('.tbl-wrap');
  return { client: w.clientHeight, scroll: w.scrollHeight, top: w.scrollTop, vh: innerHeight, pageY: scrollY };
});
const toEnd = async () => { await p.evaluate(() => { const w = document.querySelector('.tbl-wrap'); w.scrollTop = w.scrollHeight; }); await p.waitForTimeout(350); };
let w0 = await wrap();
ok('grid is bounded and scrolls inside itself', w0.client < w0.scroll && w0.client <= w0.vh, JSON.stringify(w0));
await toEnd();
const after1 = await count('.nst-table tbody tr');
ok('scrolling the grid to its end reveals a block of 25', after1 > 25 && after1 % 25 === 0, String(after1));
ok('the page itself never moved', (await wrap()).pageY === 0);
ok('the header stayed pinned', await p.evaluate(() => {
  const w = document.querySelector('.tbl-wrap');
  return Math.abs(w.querySelector('thead th').getBoundingClientRect().top - w.getBoundingClientRect().top) <= 1;
}));
await toEnd();
ok('and keeps going down the list', await count('.nst-table tbody tr') > after1, String(await count('.nst-table tbody tr')));
/* a row menu must clear the scroll box it lives in */
await p.evaluate(() => {
  const w = document.querySelector('.tbl-wrap'), wb = w.getBoundingClientRect();
  const seen = [...w.querySelectorAll('tbody tr')].filter(r => {
    const b = r.getBoundingClientRect();
    return !r.hidden && b.top >= wb.top && b.bottom <= wb.bottom;
  });
  seen[seen.length - 1].querySelector('.kb').click();
});
await p.waitForTimeout(200);
ok('the bottom row\'s menu opens fully on screen', await p.evaluate(() => {
  const r = document.querySelector('.kmenu').getBoundingClientRect();
  return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0;
}));
await p.mouse.click(5, 5); await p.waitForTimeout(150);
await p.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.tbl-wrap').scrollTop = 0; });
ok('archive has no stock chips', await count('.stock-chip') === 0);
ok('status pill class on Physical only', await count('.st-td') === 0);
await p.click('.grid-tools [aria-label="More actions"]');
ok('grid menu: page actions first', (await text('.kmenu-r')).startsWith('Go to active inventory'));
await p.click('.kmenu-r .kmenu-i:first-child'); await p.waitForTimeout(150);
ok('→ back to active inventory', p.url().endsWith('/inventory/physical'), p.url());

/* ── React Insights ─────────────────────────────────────── */
await p.goto(BASE + '/discovery/insights'); await p.waitForSelector('.kpi2-row');
ok('insights: 4 KPI cards', await count('.kpi3') === 4);
ok('insights: KPI reads the ledger', (await text('.kpi3:first-child .kpi3-v')) === '2,308', await text('.kpi3:first-child .kpi3-v'));
ok('insights: answered card = rate over polled', (await text('.kpi3:nth-child(2) .kpi3-v')) === '92.4%' && (await text('.kpi3:nth-child(2) .kpi3-of')).includes('2,133 of 2,308'), await text('.kpi3:nth-child(2) .kpi3-of'));
ok('insights: no sparkline duplicating the chart', await count('.kpi3-cyc') === 0);
ok('insights: every KPI has a definition', await count('.kpi3 .kpi3-info') === 4);
ok('insights: every KPI names its action', await count('.kpi3 .kpi3-act') === 4);
await p.click('.kpi3:nth-child(2) .kpi3-info'); await p.waitForTimeout(80);
ok('insights: definition opens', (await text('.kpi3-def')).includes('at least one collector'));
ok('insights: 7 cycle points on the line', await count('.ch-svg circle') === 7);
ok('insights: region tiles', await count('.rtile') === 4);
ok('insights: model rows match vendor rows', await p.evaluate(() => { const t = [...document.querySelectorAll('.ins2-6-6 .mtbl')]; return t.length === 2 && t[0].querySelectorAll('tbody tr').length === t[1].querySelectorAll('tbody tr').length; }));
ok('insights: donut total = failures', (await text('.ch-hero')) === '175', await text('.ch-hero'));
ok('insights: 6 reasons listed', await count('.ins2-reason') === 6);
ok('insights: vendor rows', await count('.ins2-6-6 .mtbl tbody tr') === 12);
ok('insights: attention grid ≥ 10 rows', await count('.nst-table tbody tr') >= 10);
ok('insights: 21 state bubbles', await count('.geo-b') === 21);

/* ── a region tile opens that region's devices, and only those ── */
await p.click('.rtile'); await p.waitForSelector('.nst-table tbody tr'); await p.waitForTimeout(300);
ok('region tile → devices by region', p.url().includes('/discovery/insights/region/North'), p.url());
ok('region grid holds every device the tile counts', (await text('.grid-count')) === 'Showing 25 of 636', await text('.grid-count'));
ok('region screen is the grid, nothing else', await count('.stat-strip') === 0 && await count('.kpi-row') === 0 && await count('.kpi3') === 0);
ok('region screen names its failures', (await text('.grid-bar')).includes('52 of 636 failed'), await text('.grid-bar'));
ok('and mixes them into the roster, not a page of red', await p.evaluate(() => {
  const c = [...document.querySelectorAll('.nst-table tbody tr td:first-child')].map(t => t.textContent.trim());
  return c.some(x => x === 'Answered');
}));
await p.click('.grid-tools [aria-label="Filters"]'); await p.waitForTimeout(150);
await p.selectOption('.fpanel .fp-sel', 'Failed'); await p.click('.fpanel-foot .nst-btn--filled'); await p.waitForTimeout(300);
ok('filtering to Failed lands on the tile\'s 52', (await text('.grid-count')) === 'Showing 25 of 52', await text('.grid-count'));
await p.goto(BASE + '/discovery/insights'); await p.waitForSelector('.kpi2-row');
await p.click('.kpi3:first-child .kpi3-act'); await p.waitForSelector('#view .page');
ok('insights KPI → legacy targets', p.url().endsWith('/discovery/targets'), p.url());
ok('targets: quick filter lives in the grid bar, no page bar', await count('.grid-bar .seg [data-tgt-filter]') === 4 && await count('#view .page-bar') === 0);
ok('targets: no loose Run now button', !(await text('.grid-bar')).includes('Run now'));
await p.click('.grid-bar [data-gridmenu]'); await p.waitForTimeout(150);
ok('targets: Run now is the kebab primary action', (await text('.grid-bar .kmenu .kmenu-i.is-primary')) === 'Run now');
await p.click('.grid-bar [data-gridmenu]'); await p.waitForTimeout(100);
await p.goto(BASE + '/discovery/insights'); await p.waitForSelector('.ins2-6-6 .mtbl');
await p.click('.ins2-6-6 .mtbl tbody tr:first-child'); await p.waitForSelector('.stock-chips');
ok('insights vendor → React physical', p.url().includes('/inventory/physical?oem=JUNIPER'), p.url());

/* ── legacy → React: a drill from a legacy screen lands on a React one ── */
await p.goto(BASE + '/discovery/reconcile'); await p.waitForSelector('#view .page');
ok('legacy reconcile renders', (await text('#view')).length > 200);
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
ok('title follows', (await p.title()).startsWith('Reports'), await p.title());

/* ── deep link + reload keeps state ─────────────────────── */
await p.goto(BASE + '/inventory/physical?cls=server&stock=planned'); await p.waitForSelector('.stock-chips');
ok('deep link restores class', (await text('.tab.is-on')).startsWith('Server'));
ok('deep link restores stock', await count('.stock-chip.is-on') === 1);

/* ── map: clusters break into sites, sites open a card ──── */
await p.goto(BASE + '/discovery/insights'); await p.waitForSelector('.geo-svg');
ok('map: 21 state clusters', await count('.geo-b') === 21);
await p.evaluate(() => { const b = [...document.querySelectorAll('.geo-b')].find(e => e.textContent.trim() === '211'); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await p.waitForTimeout(600);
ok('map: click breaks the cluster into sites', await count('.geo-b') > 21, String(await count('.geo-b')));
ok('map: selected state highlighted', await count('.geo-st.is-sel') === 1);
ok('map: crumb shows the state', (await text('.geo-crumb')).includes('Karnataka'));
ok('map: state card totals = cluster', (await text('.geo-card')).includes('211'));
await p.evaluate(() => { const b = [...document.querySelectorAll('.geo-b:not(.is-other)')][0]; b.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await p.waitForTimeout(200);
ok('map: site card with an action', (await text('.geo-card')).includes('Open site'));
await p.click('.geo-zoom [aria-label="Reset view"]'); await p.waitForTimeout(600);
ok('map: reset returns to clusters', await count('.geo-b') === 21);
await p.fill('.geo-search input', 'Bhopal'); await p.press('.geo-search input', 'Enter'); await p.waitForTimeout(600);
ok('map: search finds a site', (await text('.geo-card')).includes('Bhopal'));

/* ── Site details: legacy tab → React screen, facility ledger ── */
await p.goto(BASE + '/inventory/location/site/BGLK-277'); await p.waitForSelector('.section-tabs');
ok('site: legacy tab row has Site details + Site equipment', (await text('.section-tabs')).includes('Site details') && (await text('.section-tabs')).includes('Site equipment'));
await p.click('.section-tabs [data-nav="sitedetails"]'); await p.waitForSelector('.kpi3');
ok('site: tab → React facility screen', p.url().endsWith('/inventory/location/site/BGLK-277/details'), p.url());
ok('site: 4 facility KPIs', await count('.kpi3') === 4);
ok('site: power KPI = sum of feeds', (await text('.kpi3:first-child .kpi3-v')) === '14.5', await text('.kpi3:first-child .kpi3-v'));
ok('site: rack KPI = sum of racks', (await text('.kpi3:nth-child(2) .kpi3-v')) === '107');
ok('site: React tab row keeps all five sections', await count('.section-tabs .stab') === 5);
await p.click('.section-tabs .stab:first-child'); await p.waitForSelector('#view .page');
ok('site: tab → back to legacy NE list', p.url().endsWith('/inventory/location/site/BGLK-277'), p.url());
await p.goto(BASE + '/inventory/location/site/DEL-279/details'); await p.waitForSelector('.kpi3');
ok('site: any site has a facility record', (await text('.kpi3:first-child .kpi3-v')).length > 0);

/* ── Site equipment: the Fiberneo cable view in a frame ── */
await p.goto(BASE + '/inventory/location/site/BGLK-277'); await p.waitForSelector('.section-tabs');
await p.click('.section-tabs [data-nav="siteequipment"]'); await p.waitForSelector('.cv-frame');
ok('equipment: legacy tab → React frame screen', p.url().endsWith('/inventory/location/site/BGLK-277/equipment'), p.url());
const cvSrc = await p.getAttribute('.cv-frame', 'src');
ok('equipment: frame carries the site id, no mock flag', cvSrc.startsWith('/cable-view/index.html?') && cvSrc.includes('station_id=BGLK-277') && !cvSrc.includes('mock='), cvSrc);
ok('equipment: ledger badge and 12 lit cores', (await text('.cv-bar')).includes('Ledger data') && (await text('.cv-bar')).includes('12 of 24'));
const cvFrame = await (await p.waitForSelector('.cv-frame')).contentFrame();
await cvFrame.waitForSelector('#cv-loader[hidden]', { state: 'attached', timeout: 15000 }); await p.waitForTimeout(800);
ok('equipment: cable view took the injected payload (4 ledger equipment)', await cvFrame.locator('#equip-list > *').count() === 4, String(await cvFrame.locator('#equip-list > *').count()));
ok('equipment: site header from the ledger', (await cvFrame.locator('#tb-info').innerText()).includes('KA-BGLK-277'));
ok('equipment: mapping shows 12 / 24 cores used', (await cvFrame.locator('body').innerText()).includes('12 / 24 used'));
const wires = await cvFrame.evaluate(() => [...document.querySelectorAll('#ov__diag-wrap path[stroke], #ov__diag-wrap path[style*="stroke"]')].length);
ok('equipment: wires drawn in the diagram', wires >= 19, String(wires));
await p.goto(BASE + '/inventory/location/site/DEL-279/equipment'); await p.waitForSelector('.cv-frame');
const cvFrame2 = await (await p.waitForSelector('.cv-frame')).contentFrame();
await cvFrame2.waitForSelector('#cv-loader[hidden]', { state: 'attached', timeout: 15000 }); await p.waitForTimeout(500);
ok('equipment: any site gets a ledger-derived cable view', await cvFrame2.locator('#equip-list > *').count() === 2);
await p.goto(BASE + '/inventory/location/site/BGLK-277/equipment?token=abc&facility_id=F1'); await p.waitForSelector('.cv-frame');
const cvLive = await p.getAttribute('.cv-frame', 'src');
ok('equipment: token + facility handed through, demo off', cvLive.includes('token=abc') && cvLive.includes('facility_id=F1') && !cvLive.includes('mock='), cvLive);
ok('equipment: live badge', (await text('.cv-bar')).includes('Live'));

console.log('\n' + (errs.length ? 'ERRORS:\n  ' + errs.join('\n  ') : 'no page or console errors'));
console.log(fails ? `${fails} FAILED` : 'all passed');
await b.close();
process.exit(fails || errs.length ? 1 : 0);
