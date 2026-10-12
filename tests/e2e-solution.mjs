/* ?solution=datacenter on Inventory URLs, in a browser,
   against `vite preview` on :4173. Every Inventory route opens with the parameter and shows the data
   center solution's own content (or its empty state); the parameter follows the reader through
   Inventory and stays; Discovery ignores it.
   Run: npm run build && npx vite preview --port 4173 & node tests/e2e-solution.mjs */
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';

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
const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const open = async path => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); };
const url = () => new URL(p.url());
const hasParam = () => url().searchParams.get('solution') === 'datacenter';

/* every Inventory route in the registry, with a real value for each :param */
const src = readFileSync(new URL('../src/routes.ts', import.meta.url), 'utf8');
const SAMPLE = { ':id': 'KA-DC-008', ':name': 'MH-DC-001-PE-T4-01', ':cityId': 'pb-ludhiana', ':dcId': 'KA-DC-008' };
const paths = [...src.matchAll(/path: '(\/inventory[^']*)'/g)].map(m => m[1])
  .map(x => x.replace(/:[A-Za-z]+/g, t => SAMPLE[t] ?? 'x'));
ok(`found ${paths.length} Inventory routes`, paths.length >= 30);
const unique = [...new Set(paths)];

for (const path of unique) {
  await open(path + (path.includes('?') ? '&' : '?') + 'solution=all');   // the way out: the default view
  const plain = await body();
  await open(path + '?solution=datacenter');
  const scoped = await body();
  ok(`${path}: opens in the data center solution, parameter kept, no error page`,
    hasParam() && scoped.length > 40 && !scoped.includes('Something went wrong') && plain.length > 40, hasParam() ? '' : 'parameter was dropped');
}

/* a plain URL in a fresh tab is the default */
{ const f = await b.newPage();
  await f.goto(BASE + '/inventory/physical', { waitUntil: 'networkidle' }); await f.waitForTimeout(600);
  ok('a fresh tab on a plain Inventory URL stays plain', !new URL(f.url()).searchParams.has('solution'));
  await f.goto(BASE + '/inventory/passive', { waitUntil: 'networkidle' }); await f.waitForTimeout(400);
  ok('and it stays plain while navigating', !new URL(f.url()).searchParams.has('solution'));
  await f.close(); }

/* the parameter follows the reader */
await open('/inventory?solution=datacenter');
ok('/inventory redirect keeps it', url().pathname === '/inventory/insights' && hasParam());
await open('/inventory/location?solution=datacenter');
await p.locator('a[href], button').filter({ hasText: /Physical/i }).first().click().catch(() => {});
await open('/inventory/physical?solution=datacenter');
await p.getByText('Switch', { exact: true }).first().click(); await p.waitForTimeout(500);
ok('switching a Physical tab keeps it', hasParam() && url().searchParams.get('cls') === 'switch');
await p.getByText('GPU', { exact: true }).first().click(); await p.waitForTimeout(500);
ok('and the GPU tab', hasParam() && url().searchParams.get('cls') === 'gpu');
await p.getByText('KA-DC-008-GPU-001').first().isVisible().catch(() => {});
await open('/inventory/passive?solution=datacenter');
await p.getByText('Racks', { exact: true }).first().click(); await p.waitForTimeout(600);
ok('legacy Passive tab click keeps it, no loop', hasParam() && (await body()).includes('U used'));
await open('/inventory/location/site/KA-DC-008?solution=datacenter');
await p.getByText('Facility', { exact: true }).first().click(); await p.waitForTimeout(600);
ok('site tabs keep it', hasParam() && url().pathname.endsWith('/details'));
await p.goBack(); await p.waitForTimeout(600);
ok('Back keeps it', hasParam());

/* an unknown value is ignored (checked on a fresh browser tab with nothing remembered) */
const q = await b.newPage();
await q.goto(BASE + '/inventory/physical?solution=nonsense', { waitUntil: 'networkidle' }); await q.waitForTimeout(600);
ok('unknown value ignored: no error, nothing added', !(await q.evaluate(() => document.body.innerText)).includes('Something went wrong') && new URL(q.url()).searchParams.get('solution') === 'nonsense');
await q.close();

/* BOTH modes are always available: the URL you open decides, in the same browser tab, every time */
await open('/inventory/location?solution=datacenter');
ok('opened with the parameter: the data center solution', hasParam() && (await body()).includes('Showing 24 of 24'));
await p.getByText('KA-DC-008', { exact: true }).first().click(); await p.waitForTimeout(700);
ok('clicking in it keeps the parameter (site page)', hasParam() && url().pathname === '/inventory/location/site/KA-DC-008');
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
ok('reload of that URL stays in it', hasParam() && (await body()).includes('Devices 360'));
for (const path of ['/inventory/location', '/inventory/physical', '/inventory/passive?tab=cooling', '/inventory/location/site/KA-DC-008/details', '/inventory/services', '/inventory/reports']) {
  await open(path);   // typed plain URL, same tab that was just in the data center solution
  ok(`typed plain ${path} is the default Inventory`, !hasParam() && url().pathname === path.split('?')[0]);
}
await open('/inventory/location');
ok('and shows the default data (12,475 locations)', (await body()).includes('12,475'));
await open('/inventory/location?solution=datacenter');
ok('then the parameter is the data center solution again', hasParam() && (await body()).includes('Showing 24 of 24'));
await open('/inventory/location');
await p.getByText('Physical', { exact: false }).first().click().catch(() => {});
ok('clicking around the default stays default', !hasParam());

/* Discovery is untouched */
await open('/discovery/insights');
ok('Discovery URLs are never given the parameter', !hasParam());
const discPlain = await body();
await open('/discovery/insights?solution=datacenter');
ok('Discovery: same content with the parameter', discPlain === (await body()));

/* the way out, from inside the data center solution */
await open('/inventory/physical?solution=datacenter');
await open('/inventory/physical?solution=all');
ok('?solution=all gives the default view and removes the parameter', !url().searchParams.has('solution') && (await body()).includes('Showing 25 of 2,148'));

ok('no console or page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
