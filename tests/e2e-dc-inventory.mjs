/* Data center inventory inside the existing screens, in a browser, against
   `vite preview` on :4173: Physical resources (Firewall / Storage / GPU tabs,
   source filter, data center picker, device drawer), Passive infrastructure
   (Cooling / Sensors tabs, data center rows, View rack link) and a data
   center's Site details (facility from its record).
   Run: npm run build && npx vite preview --port 4173 & node tests/e2e-dc-inventory.mjs */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const launch = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM }
  : existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : { channel: 'chrome' };
const b = await chromium.launch(launch);
const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
p.route('**://fonts.**', r => r.abort());
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
let fails = 0;
const ok = (label, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  ' + detail : '')); if (!cond) fails++; };
const text = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const go = async path => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); };
const has = async (...parts) => { const t = await text(); return parts.every(x => t.includes(x)); };

/* ── Physical resources ── */
await go('/inventory/physical');
let t = await text();
ok('tabs: Router … Firewall, Storage, GPU, eNodeB, gNodeB in order', /Router\s+Switch\s+Server\s+DWDM\s+Firewall\s+Storage\s+GPU\s+eNodeB\s+gNodeB/.test(t));
ok('Router tab total = 2,148 network estate + 96 data center', t.includes('of 2,244'), (t.match(/Showing \d+ of [\d,]+/) ?? [''])[0]);
ok('source filter shows counts', await has('Network estate · 2,148', 'Data centers · 96'));

await go('/inventory/physical?cls=server&src=dc');
ok('Server, Data centers only: 4,037', await has('Showing 25 of 4,037'));
await go('/inventory/physical?cls=server&src=net');
ok('Server, Network estate only: 96 (unchanged)', await has('Showing 25 of 96'));

await go('/inventory/physical?cls=firewall');
ok('Firewall tab: 33 FortiGate', await has('Showing 25 of 33', 'FortiGate 3700F'));
await go('/inventory/physical?cls=storage');
ok('Storage tab: 1,038', await has('Showing 25 of 1,038'));

await go('/inventory/physical?cls=gpu');
ok('GPU tab: 610 servers, 4,880 GPUs, 691 on record, 81 planned', await has('GPU servers 610', '691 on record · 81 planned', 'GPUs 4,880', 'In a job 493', 'Liquid-cooled 126'));
ok('GPU tab: model mix and cluster hint, list of 691', await has('H100 SXM 80 GB · 233', '29 clusters across 21 data centers', 'Showing 25 of 691'));

await go('/inventory/physical?cls=gpu&dc=KA-DC-008');
ok('GPU, KA-DC-008: 39 servers, 312 GPUs, 2 clusters, 2 burn-in', await has('GPU servers 39', 'GPUs 312', 'Burn-in 2', 'AI-POD-1', 'AI-POD-2', 'Showing 25 of 39'));
await p.getByText('KA-DC-008-GPU-004').first().click(); await p.waitForTimeout(500);
ok('drawer: 8 GPUs, 8 IB rails, burn-in note', await has('GPUs · 8', 'InfiniBand rails · 8 of 8 up', 'Returned from repair', 'NV0013271-G0'));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
ok('drawer closes on Escape', !(await has('InfiniBand rails')));

await go('/inventory/physical?cls=router&oem=JUNIPER');
ok('discovery drill still scoped to the network estate', !(await has('Data centers ·')) && await has('Router'));
await go('/inventory/physical?cls=server&src=dc&dc=KA-DC-008');
await p.getByText('eNodeB', { exact: true }).first().click(); await p.waitForTimeout(500);
ok('eNodeB opened from a data center view still shows its 18 rows (filters do not leak)', await has('Showing 18 of 18'));
await p.getByText('gNodeB', { exact: true }).first().click(); await p.waitForTimeout(500);
ok('gNodeB the same: 14 rows', await has('Showing 14 of 14'));
await go('/inventory/physical?cls=gnodeb');
ok('gNodeB unchanged: 14, no source filter', await has('Showing 14 of 14') && !(await has('Network estate ·')));

/* ── Passive infrastructure ── */
await go('/inventory/passive?tab=cooling');
ok('Passive tabs: Cooling and Sensors', await has('Power plant Cooling Sensors Splice closures'));
ok('Cooling: 212 units', await has('Showing 25 of 212', 'MH-DC-001-CRAH-11'));
await go('/inventory/passive?tab=sensors');
ok('Sensors: 98, with smoke and leak', await has('Showing 25 of 98', 'Smoke', 'Leak'));
await go('/inventory/passive?tab=rack');
ok('Racks: the 10 sample rows + 641 data center racks', await has('of 651', 'Data center'));
await go('/inventory/passive?tab=power');
ok('Power plant: the 10 sample rows + 205 data center units', await has('of 215'));
await go('/inventory/passive?tab=fiber');
ok('Fiber spans unchanged, no source filter', await has('Showing 12 of 12') && !(await has('Network estate ·')) );
await go('/inventory/passive?tab=rack&dc=KA-DC-008&rack=RACK-S');
ok('View rack link lands on KA-DC-008-RACK-S', await has('KA-DC-008-RACK-S', 'Data center'));

/* ── Site details ── */
await go('/inventory/location/site/KA-DC-008/details');
ok('KA-DC-008 Facility from its record: 2,200 kW, PUE 1.65, 36 racks, 4 UPS', await has('2,200 kW capacity', 'PUE 1.65', '36 racks', 'UPS · N+1', 'DG set', '2750 kVA'));
ok('KA-DC-008: devices, compute and cooling cards', await has('GPU', '39', 'CPU cores', 'N+1 · 1,090 kW installed', 'CRAH-11'));
ok('no 24-hour chart (the record has no load history)', !(await has('Load, last 24 hours')));
await go('/inventory/location/site/PB-DC-001/details');
ok('PB-DC-001 (not in the reference) keeps its derived facility', await has('Load, last 24 hours'));

/* ── location roster ── */
await go('/inventory/location');
ok('Location: 12,494 locations, 848 data centers', await has('12,494', '848'));

ok('no console or page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
