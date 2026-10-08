/* DCIM inventory upload, end to end in a browser, against `vite preview` on :4173:
   upload Excel → columns → review → upload → data center inventory (overview,
   locations, racks + rack drawer, devices, connectivity, power, cooling,
   sensors, findings, import history, discovery links) → download current
   inventory → re-upload it unchanged → site Infrastructure tab, then a smoke
   check that existing Inventory and Discovery screens still render.
   Run: npm run build && npx vite preview --port 4173 & node tests/e2e-dcim.mjs
   (needs public/templates/dcim-sample-acme.xlsx — npm run gen:dcim-templates) */
import { chromium } from 'playwright';
import { existsSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const SAMPLE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'templates', 'dcim-sample-acme.xlsx');
const launch = process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM }
  : existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : { channel: 'chrome' };
const b = await chromium.launch(launch);
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage();
p.route('**://fonts.**', r => r.abort());
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
let fails = 0;
const ok = (label, cond, detail = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + label + (detail ? '  ' + detail : '')); if (!cond) fails++; };
const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const click = async (sel, t) => { await p.locator(sel, { hasText: t }).first().click(); await p.waitForTimeout(250); };
const pill = t => click('.pills button', t);

/* fresh browser storage */
await p.goto(BASE + '/inventory/dcim');
await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dcim.')).forEach(k => localStorage.removeItem(k)));
await p.reload(); await p.waitForTimeout(300);
ok('landing: empty state', (await body()).includes('No client infrastructure imported yet'));
ok('no 3D on the page', await p.locator('canvas').count() === 0);

/* 1 · client */
await click('button', 'Upload inventory');
ok('upload: stepper with five steps', await p.locator('.stepper li').count() === 5);
await p.fill('#nc-id', 'ACME'); await p.fill('#nc-name', 'Acme Cloud Services');
await click('button', 'Continue');
/* 2 · file */
ok('file step: sheet checklist of 16 sheets', await p.locator('.sheet-list li').count() === 16);
await p.setInputFiles('input[type=file]', SAMPLE);
await p.waitForSelector('text=Check the columns', { timeout: 20000 });
/* 3 · columns */
ok('columns: every sheet ready', await p.locator('.map-table .vw-chip', { hasText: 'Ready' }).count() === 16);
await click('button', 'Validate');
await p.waitForSelector('.up-banner', { timeout: 30000 });
/* 4 · review */
let t = await body();
ok('review: ready to upload', t.includes('Ready to upload for Acme Cloud Services'));
ok('review: tiles count new records', /4,8\d\d New/.test(t), t.match(/[\d,]+ New/)?.[0]);
await p.locator('button', { hasText: /^Upload [\d,]+ changes/ }).click();
await p.waitForSelector('text=Inventory uploaded', { timeout: 20000 });
/* 5 · done → data center */
await p.locator('.done-dcs .client-card', { hasText: 'Acme Bengaluru Campus' }).click();
await p.waitForSelector('.pills', { timeout: 10000 });
t = await body();
ok('inventory header with upload + download', t.includes('Acme Bengaluru Campus') && t.includes('Upload update') && t.includes('Download current inventory'));
ok('counts from records: 2 · 5 · 10 locations, 88 racks, 748 devices', /Locations\s*2 · 5 · 10/.test(t) && /Racks\s*88/.test(t) && /Devices\s*748/.test(t));
ok('power plant from records: 3 gen · 4 UPS · 178 PDUs', t.includes('3 gen · 4 UPS · 178 PDUs'));
ok('overview cards', ['Power plant', 'Cooling', 'Space', 'Connectivity', 'Environmental sensors', 'Findings'].every(x => t.includes(x)));
ok('no 3D, no simulated values', await p.locator('canvas').count() === 0 && !t.includes('Simulated'));

/* findings card opens the rack drawer */
await p.locator('.attn', { hasText: 'single power feed' }).first().click(); await p.waitForTimeout(400);
t = await body();
ok('rack drawer: elevation front/rear and power path', await p.locator('.ov-drawer .elev svg').count() === 1 && t.includes('Front') && t.includes('Rear') && t.includes('Power path'));
await p.locator('.ov-drawer .elev-dev').first().click(); await p.waitForTimeout(250);
ok('rack drawer: device card with ports', await p.locator('.ov-drawer .dev-card').count() === 1);
await click('.ov-drawer button', 'Close');

for (const [name, expect] of [['Locations', 'Data hall 1'], ['Racks', 'A+B'], ['Devices', 'dh1-a01-srv01'], ['Connectivity', 'cables'], ['Power', 'Utility feed A'], ['Cooling', 'CRAH'], ['Sensors', 'inlet'], ['Findings', 'single power feed'], ['Import history', 'IMP-']]) {
  await pill(name);
  ok(`tab ${name}`, (await body()).includes(expect));
}
await pill('Power');
ok('power: rack feeds table', (await body()).includes('Rack feeds'));
await pill('Discovery links');
const linkBtn = p.locator('button', { hasText: /^Link$/ }).first();
if (await linkBtn.count()) { await linkBtn.click(); await p.waitForTimeout(250); ok('a suggestion can be linked', /Linked\s*1/.test(await body())); }

/* download current inventory → re-upload it: nothing changes */
const [dl] = await Promise.all([p.waitForEvent('download'), click('button', 'Download current inventory')]);
const file = join(mkdtempSync(join(tmpdir(), 'dcim-')), dl.suggestedFilename());
await dl.saveAs(file);
ok('download named after the data center', dl.suggestedFilename() === 'ACME-BLR1-inventory.xlsx', dl.suggestedFilename());
await click('button', 'Upload update');
ok('upload update preselects the client and site', p.url().includes('client=ACME') && p.url().includes('location=KA-DC-008'), p.url());
await click('button', 'Continue');
await p.setInputFiles('input[type=file]', file);
await p.waitForSelector('text=Check the columns', { timeout: 20000 });
await click('button', 'Validate');
await p.waitForSelector('.up-banner', { timeout: 30000 });
t = await body();
ok('re-upload of the downloaded inventory: 0 new, 0 updated', /0 New/.test(t) && /0 Updated/.test(t), t.match(/[\d,]+ New.{0,40}/)?.[0]);

/* an upload with an error is blocked */
await p.goto(BASE + '/inventory/dcim/import?client=ACME&location=PB-DC-001');
await click('button', 'Continue');
await p.setInputFiles('input[type=file]', { name: 'Racks.csv', mimeType: 'text/csv', buffer: Buffer.from('RackId,RoomId,Name,HeightU\nBAD-1,NO-SUCH-ROOM,Bad rack,42\n') });
await p.waitForSelector('text=Check the columns', { timeout: 20000 });
await click('button', 'Validate');
await p.waitForSelector('.up-banner', { timeout: 30000 });
t = await body();
ok('error blocks the upload, issue points at the row', t.includes('must be fixed') && t.includes('Row 2') && await p.locator('button', { hasText: 'Fix errors to upload' }).isDisabled());
ok('location check warns when no data center names the site', t.includes('No data center in this file has LocationId PB-DC-001'));

/* site page: Infrastructure tab */
await p.goto(BASE + '/inventory/location/site/KA-DC-008'); await p.waitForTimeout(2500);
await p.locator('button.stab', { hasText: 'Infrastructure' }).first().click();
await p.waitForSelector('.pills', { timeout: 15000 });
ok('site tab shows the uploaded inventory', p.url().includes('/inventory/location/site/KA-DC-008/infrastructure') && (await body()).includes('Acme Bengaluru Campus'), p.url());
await p.goto(BASE + '/inventory/location/site/PB-DC-001/infrastructure'); await p.waitForTimeout(1500);
t = await body();
ok('site without upload offers the upload', t.includes('No infrastructure inventory uploaded for PB-DC-001'));
ok('site header Opex shows text, not markup', !t.includes('<span'));
/* upload the generated CSV set for PB-DC-001 (npm run gen:site-csv) from the site tab */
const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'templates', 'sites', 'PB-DC-001');
if (existsSync(SITE_DIR)) {
  await click('button', 'Upload inventory');
  ok('site upload carries the location', p.url().includes('location=PB-DC-001'));
  await p.locator('.client-card', { hasText: 'New client' }).click();
  await p.fill('#nc-id', 'DEMO-TELCO'); await p.fill('#nc-name', 'Demo Telco Operations');
  await click('button', 'Continue');
  const csvs = ['Clients', 'DataCenters', 'Buildings', 'Floors', 'Rooms', 'Zones', 'Rows', 'Racks', 'Devices', 'Ports', 'Connections', 'PowerEquipment', 'PowerConnections', 'CoolingEquipment', 'Sensors', 'MonitoringMappings'].map(n => join(SITE_DIR, `${n}.csv`));
  await p.setInputFiles('input[type=file]', csvs);
  await p.waitForSelector('text=Check the columns', { timeout: 20000 });
  ok('16 CSV files recognised by name', await p.locator('.map-table .vw-chip', { hasText: 'Ready' }).count() === 16);
  await click('button', 'Validate');
  await p.waitForSelector('.up-banner', { timeout: 30000 });
  t = await body();
  ok('site CSV set: ready, no errors, no warnings', t.includes('Ready to upload for Demo Telco Operations') && /0 Errors/.test(t) && /0 Warnings/.test(t) && !t.includes('No data center in this file has LocationId'));
  await p.locator('button', { hasText: /^Upload [\d,]+ changes/ }).click();
  await p.waitForSelector('text=Inventory uploaded', { timeout: 20000 });
  await click('button', 'Back to site PB-DC-001');
  await p.waitForSelector('.pills', { timeout: 15000 });
  t = await body();
  ok('PB-DC-001 Infrastructure tab shows its inventory: 130 network elements in racks', p.url().includes('/site/PB-DC-001/infrastructure') && /Devices\s*142/.test(t) && /Racks\s*9/.test(t), t.match(/Devices\s*\d+/)?.[0]);
}

/* existing screens still work */
for (const [path, sel] of [['/inventory/physical', '.nst-table tbody tr'], ['/inventory/location', '.page'], ['/discovery/insights', '.page'], ['/inventory/inactive', '.nst-table tbody tr']]) {
  await p.goto(BASE + path);
  ok(`existing screen renders: ${path}`, await p.waitForSelector(sel, { timeout: 15000 }).then(() => true, () => false));
}
ok('no page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
await b.close();
console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed');
process.exit(fails ? 1 : 0);
