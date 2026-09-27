import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:4173';
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
p.route('**://fonts.**', r => r.abort());
const results = [];
async function settle() { await p.waitForTimeout(700); }
async function shot(key, opts = {}) {
  await settle();
  const file = `${OUT}/${key}.jpg`;
  await p.screenshot({ path: file, type: 'jpeg', quality: 78, fullPage: !!opts.full });
  results.push({ key, url: p.url(), title: await p.title() });
  console.log('shot', key, p.url());
}
async function go(key, path, opts) { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await shot(key, opts); }
async function clickRowThen(key, path, action) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' }); await settle();
  const before = p.url();
  try {
    const row = p.locator('.nst-table tbody tr').first();
    await row.waitFor({ timeout: 4000 });
    if (action) {
      const kebab = row.locator('[aria-label="Row actions"], .icon-btn, button').last();
      await kebab.click({ timeout: 3000 }); await p.waitForTimeout(200);
      await p.getByText(action, { exact: false }).first().click({ timeout: 3000 });
    } else {
      await row.click();
    }
    await p.waitForTimeout(600);
    if (p.url() !== before) { await shot(key); return true; }
    await shot(key + '_drawer'); return true;      // row click opened a drawer on the same page
  } catch (e) { console.log('skip', key, e.message.split('\n')[0]); return false; }
}

// ---- Discovery & reconciliation ----
await go('insights', '/discovery/insights', { full: true });
await go('insights_region', '/discovery/insights/region/west');
await go('insights_discovered', '/discovery/insights/discovered');
await go('insights_domain', '/discovery/insights/domain/ran');
await go('insights_discrepancies', '/discovery/insights/discrepancies');
await go('jobs', '/discovery/jobs');
await go('targets', '/discovery/targets');
await go('target', '/discovery/targets/SP-CNOC-LAB-J204-PE-T3-NR1');
await go('reconcile', '/discovery/reconcile', { full: true });
await go('reconcilejobs', '/discovery/reconcile/jobs');
await clickRowThen('reconcilejobs_drawer', '/discovery/reconcile/jobs');
await go('reconcileresults', '/discovery/reconcile/results');
await go('reconcileexceptions', '/discovery/reconcile/exceptions');
await clickRowThen('reconcileexceptions_drawer', '/discovery/reconcile/exceptions');
await go('rules', '/discovery/reconcile/rules');
await go('rulenew', '/discovery/reconcile/rules/new', { full: true });
await go('ruledetails', '/discovery/reconcile/rules/RUL-RAN-001', { full: true });
await go('discoveryreports', '/discovery/reports');
await go('discoveryreport', '/discovery/reports/DR-01', { full: true });
// ---- Inventory ----
await go('home', '/inventory');
await go('location', '/inventory/location');
await go('site', '/inventory/location/site/BGLK-277', { full: true });
await go('capex', '/inventory/location/site/BGLK-277/capex');
await go('opex', '/inventory/location/site/BGLK-277/opex');
await go('sitedetails', '/inventory/location/site/BGLK-277/details', { full: true });
await go('siteequipment', '/inventory/location/site/BGLK-277/equipment');
await clickRowThen('node', '/inventory/location/site/BGLK-277/equipment');
await go('virtual', '/inventory/virtual');
await go('vnfdetails', '/inventory/virtual/details');
await go('vnflifecycle', '/inventory/virtual/lifecycle');
await go('cell5gdetails', '/inventory/virtual/cell-5g-details', { full: true });
await go('physical', '/inventory/physical');
await go('resource', '/inventory/resource/VZG-N540X-PE-T4-NR', { full: true });
await go('passive', '/inventory/passive');
for (const tab of ['rack', 'odf', 'power', 'splice', 'cord', 'duct', 'fiber']) {
  await p.goto(BASE + '/inventory/passive', { waitUntil: 'networkidle' }); await settle();
  try {
    await p.locator(`[data-passtab="${tab}"], [data-tab="${tab}"], .tabbar >> text=/${tab}/i`).first().click({ timeout: 2500 });
    await settle(); await shot('passive_' + tab);
    const before = p.url();
    const row = p.locator('.nst-table tbody tr').first();
    await row.waitFor({ timeout: 2500 });
    const kebab = row.locator('button, .icon-btn').last();
    await kebab.click({ timeout: 2000 }); await p.waitForTimeout(200);
    await p.getByText(/view details|view|open/i).first().click({ timeout: 2000 });
    await p.waitForTimeout(600);
    if (p.url() !== before) await shot('passive_' + tab + '_detail', { full: true });
  } catch (e) { console.log('skip passive', tab, e.message.split('\n')[0]); }
}
await go('links', '/inventory/links');
await go('services', '/inventory/services');
await go('inactive', '/inventory/inactive');
await go('reports', '/inventory/reports');
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(results, null, 1));
await b.close();
