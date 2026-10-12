/* The data center solution (?solution=datacenter) in a browser, against `vite preview` on :4173:
   the two DCO backups together — 48 sites, 7,678 devices, 25,057 links, 1,456 services — shown on the same screens
   as the default Inventory, whose numbers must not change.
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
p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET|ERR_NAME|tile/.test(m.text())) errs.push('console: ' + m.text()); });
let fails = 0;
const ok = (label, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  ' + detail : '')); if (!cond) fails++; };
const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const open = async path => { await p.goto(BASE + path, { waitUntil: 'load' }); await p.waitForTimeout(2200); };
const has = async (...t) => { const s = await body(); return t.every(x => s.includes(x)); };

await open('/inventory/location');
ok('default Location unchanged', await has('12,475'));
await open('/inventory/location?solution=datacenter');
ok('Location: 48 data centers, both countries', await has('Total locations 48', 'US West Region', 'West Region', 'India', 'United States'));
ok('Location: logical inventory from the Links and Services sheets', await has('25,057 links and 1,456 customer services', 'LLDP 23,878', 'On-demand GPUs 765'));
await p.getByText('United States', { exact: true }).first().click(); await p.waitForTimeout(600);
ok('Location: the US map lists 24 sites', await has('All United States', '24 sites'));

await open('/inventory/physical?solution=datacenter');
ok('Physical: 48 data centers in the picker', await has('All data centers (48)'));
await open('/inventory/links?solution=datacenter');
ok('Links: one tab per protocol, real counts', await has('LLDP 23,878', 'BGP 900', 'OSPF 46', 'ISIS 46', 'LSP 187', 'Showing 25 of 23,878'));
await open('/inventory/links');
ok('Links default unchanged (LLDP/OSPF/BGP/ISIS 16 each)', await has('LLDP 16') && !(await has('LSP')));
await open('/inventory/services?solution=datacenter');
ok('Services: GPU, CPU, storage, reserved', await has('On-demand GPUs 765', 'CPU instances 317', 'Storage volume 272', 'Reserved cluster 102'));
await p.locator('[data-svcview]').first().click(); await p.waitForTimeout(500);
ok('Services: a row opens its detail', await has('Service', 'Monthly revenue', 'Uptime (30 days)'));
await open('/inventory/services?solution=datacenter&tab=cpu');
await open('/inventory/location/site/VA-DC-002/capex?solution=datacenter');
ok('a US site shows dollars, not rupees', (await body()).includes('$') && !(await body()).includes('₹'));
await open('/inventory/location/site/KA-DC-008/capex?solution=datacenter');
ok('an Indian site shows rupees', (await body()).includes('₹'));

ok('no console or page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
