/* Inventory in its two modes, in a browser, against `vite preview` on :4173.
   DEFAULT (no parameter): the network estate exactly as before — no data center records anywhere.
   DATA CENTER SOLUTION (?solution=datacenter): only Datacenter-Ideation's data centers (src/data/dc):
   home, Location, a data center's site page, Physical resources (7 classes incl. GPU), Passive
   infrastructure (racks, power, cooling, sensors, ODF, cabling), and an empty state where a screen has
   no data center data.
   Run: npm run build && npx vite preview --port 4173 & node tests/e2e-dc-inventory.mjs */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const launch = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM }
  : existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : { channel: 'chrome' };
const b = await chromium.launch(launch);
const errs = []; let fails = 0;
const ok = (label, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  ' + detail : '')); if (!cond) fails++; };
/* a fresh browser tab each time: nothing remembered from an earlier mode */
async function tab() {
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  p.route('**://fonts.**', r => r.abort());
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
  return p;
}
const text = p => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const go = async (p, path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); };
const has = async (p, ...parts) => { const t = await text(p); return parts.every(x => t.includes(x)); };
const lacks = async (p, ...parts) => { const t = await text(p); return parts.every(x => !t.includes(x)); };
const SC = '?solution=datacenter', SCQ = '&solution=datacenter';

/* ════════ DEFAULT: the previous data, untouched ════════ */
let p = await tab();
await go(p, '/inventory/physical');
let t = await text(p);
ok('default Physical: Router Switch Server DWDM eNodeB gNodeB, nothing else', /Router\s+Switch\s+Server\s+DWDM\s+eNodeB\s+gNodeB/.test(t) && !/Firewall|Storage|GPU/.test(t.split('Showing')[0]));
ok('default Physical: Router 2,148', await has(p, 'Showing 25 of 2,148'));
ok('default Physical: no data center picker', await lacks(p, 'All data centers'));
await go(p, '/inventory/physical?cls=server'); ok('default Server: 96', await has(p, 'Showing 25 of 96'));
await go(p, '/inventory/physical?cls=gpu'); ok('default ?cls=gpu is not a tab: no GPU screen', await lacks(p, 'GPU servers', 'GPU models', 'GPUs 4,880'));
await go(p, '/inventory/physical?cls=enodeb'); ok('default eNodeB: 18', await has(p, 'Showing 18 of 18'));
await go(p, '/inventory/physical?cls=gnodeb'); ok('default gNodeB: 14', await has(p, 'Showing 14 of 14'));
await go(p, '/inventory/passive');
ok('default Passive: the original seven tabs and tiles', await has(p, 'Passive records 5,120', 'Fiber spans ODF Racks Power plant Splice closures Patch cords Ducts') && await lacks(p, 'Cooling Sensors'));
await go(p, '/inventory/passive?tab=rack'); ok('default Racks: the 10 sample rows, no data center rows', await has(p, 'Showing 10 of 10') && await lacks(p, 'All data centers'));
await go(p, '/inventory/location');
ok('default Location: 12,475 / 829 datacenters / 2,711 PoPs / 8,935 sites', await has(p, '12,475', '829 datacenters', '2,711', '8,935'));
await go(p, '/inventory/location/site/KA-DC-008/details');
ok('default site details: the derived facility, not the data center record', await has(p, 'Load, last 24 hours') && await lacks(p, '2,200 kW'));
await go(p, '/inventory/insights'); ok('default Insights: not the data center home', await lacks(p, 'GPU servers 610'));
await p.context().close();

/* ════════ DATA CENTER SOLUTION ════════ */
p = await tab();
await go(p, '/inventory' + SC);
ok('home: 24 data centers, 6,398 devices, 610 GPU servers, 641 racks', await has(p, 'Data centers 24', 'Devices 6,398', 'GPU servers 610', '4,880 GPUs', 'Racks 641', 'Cooling 20.0 MW'));

await go(p, '/inventory/location' + SC);
ok('Location: only the 24 data centers', await has(p, 'Data centers 24', 'Showing 24 of 24', 'MH-DC-001', 'KL-DC-024') && await lacks(p, '12,475', 'PoP locations', '829'));
await p.getByText('KA-DC-008', { exact: true }).first().click(); await p.waitForTimeout(800);
ok('clicking a data center opens its own page', p.url().includes('/inventory/location/site/KA-DC-008') && await has(p, 'Devices 360', 'GPU servers 39', 'Racks 36'));
ok('its breadcrumb has no city page', await lacks(p, 'Kathua') && await has(p, 'Location'));

await go(p, '/inventory/location/site/KA-DC-008' + SC);
ok('site page: header is the data center record (Mangaluru, Tier III)', await has(p, 'Mangaluru', 'Tier III', 'Data center', 'PUE 1.65 · 4 UPS'));
ok('site page: its 4 real routers, from the reference', await has(p, 'KA-DC-008-PE-T4-01', 'MX204', 'JU0011006', 'Showing 4 of 4'));
await p.getByText('GPU', { exact: true }).first().click(); await p.waitForTimeout(600);
ok('site page: GPU class has its 39 servers', await has(p, 'Showing 25 of 39'));
await p.getByText('KA-DC-008-GPU-004').first().click(); await p.waitForTimeout(500);
ok('device drawer: 8 GPUs, 8 InfiniBand rails, burn-in note', await has(p, 'GPUs · 8', 'InfiniBand rails · 8 of 8 up', 'Returned from repair'));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
await go(p, '/inventory/location/site/KA-DC-008/details' + SC);
ok('Facility: 2,200 kW, PUE 1.65, 36 racks, 4 UPS, DG, cooling N+1, compute', await has(p, '2,200 kW capacity', 'PUE 1.65', '36 racks', 'UPS · N+1', '2750 kVA', 'N+1 · 1,090 kW installed', 'CPU cores'));
ok('Facility: no 24-hour chart (the record has no load history)', await lacks(p, 'Load, last 24 hours'));
await go(p, '/inventory/location/site/BGLK-277' + SC);
ok('a non-data-center site id: says so', await has(p, 'BGLK-277 is not a data center'));
await go(p, '/inventory/location/site/KA-DC-008/capex' + SC);
ok('Capex/Opex/equipment URLs land on the data center page', await has(p, 'Devices 360'));

await go(p, '/inventory/physical' + SC);
t = await text(p);
ok('Physical: Router Switch Server DWDM Firewall Storage GPU (no eNodeB/gNodeB)', /Router\s+Switch\s+Server\s+DWDM\s+Firewall\s+Storage\s+GPU/.test(t) && !/eNodeB|gNodeB/.test(t));
ok('Physical Router: 96, only data center devices', await has(p, 'Showing 25 of 96', 'MH-DC-001') && await lacks(p, 'RTR-WEST-2045'));
for (const [cls, n] of [['switch', '457'], ['server', '4,037'], ['dwdm', '46'], ['firewall', '33'], ['storage', '1,038'], ['gpu', '691']]) {
  await go(p, `/inventory/physical?cls=${cls}${SCQ}`); ok(`Physical ${cls}: ${n}`, await has(p, `Showing 25 of ${n}`));
}
await go(p, '/inventory/physical?cls=gpu' + SCQ);
ok('GPU: 610 servers, 4,880 GPUs, 491 in a job… stats from the records', await has(p, 'GPU servers 610', 'GPUs 4,880', 'In a job 493', 'Liquid-cooled 126'));
await go(p, '/inventory/physical?cls=gpu&dc=KA-DC-008' + SCQ);
ok('GPU, one data center: 39 servers, 2 clusters', await has(p, 'GPU servers 39', 'AI-POD-1', 'AI-POD-2', 'Showing 25 of 39'));
await p.getByText('KA-DC-008-GPU-004').first().click(); await p.waitForTimeout(500);
ok('GPU drawer opens', await has(p, 'InfiniBand rails · 8 of 8 up'));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
await go(p, '/inventory/physical?cls=router&oem=JUNIPER' + SCQ);
ok('a Discovery drill (?oem=) does not narrow the data center solution', await has(p, 'Showing 25 of 96'));

await go(p, '/inventory/passive' + SC);
ok('Passive: tiles from the data center records', await has(p, 'Data centers 24', 'Rack space 60%', 'Power plant 205', 'Cooling 19,990 kW', 'Sensors 98'));
ok('Passive tabs: Racks Power plant Cooling Sensors ODF Patch cords only', await has(p, 'Racks Power plant Cooling Sensors ODF Patch cords') && await lacks(p, 'Fiber spans', 'Splice closures', 'Ducts'));
for (const [tabk, n] of [['rack', '641'], ['power', '205'], ['cooling', '212'], ['sensors', '98'], ['odf', '24']]) {
  await go(p, `/inventory/passive?tab=${tabk}${SCQ}`); ok(`Passive ${tabk}: ${n}`, await has(p, `of ${n}`) || await has(p, `Showing ${n} of ${n}`));
}
await go(p, '/inventory/passive?tab=rack&dc=KA-DC-008&rack=RACK-S' + SCQ);
ok('View rack link lands on KA-DC-008-RACK-S', await has(p, 'KA-DC-008-RACK-S', 'Showing 1 of 1'));
await p.locator('.kmenu-btn, button[aria-label*="ction"], .row-menu').first().click().catch(() => {});
await go(p, '/inventory/passive?tab=cooling&dc=KA-DC-008' + SCQ);
ok('Cooling for one data center: its 8 units', await has(p, 'KA-DC-008-CRAH-11', 'Showing 8 of 8'));

for (const route of ['/inventory/services', '/inventory/links', '/inventory/virtual', '/inventory/inactive', '/inventory/reports']) {
  await go(p, route + SC);
  ok(`${route}: says there is no data center data`, await has(p, 'No data center data for this view') && await lacks(p, 'Showing 16 of 16'));
}
await p.context().close();

/* ════════ leaving the solution restores the default ════════ */
p = await tab();
await go(p, '/inventory/location' + SC);
await go(p, '/inventory/location?solution=all');
ok('?solution=all: back to 12,475 locations', await has(p, '12,475', '829 datacenters') && !p.url().includes('solution'));
await p.context().close();

ok('no console or page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
