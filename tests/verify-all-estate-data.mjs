/* Estate data audit: location, device, discovery and legacy-bundle ground truth,
   plus the Inventory ⇄ Discovery device cross-checks (one population, two views).
   Static checks always run; pass --browser to add the Playwright pass against :5173.
   Run: node tests/verify-all-estate-data.mjs [--browser]      (0 warn, 0 fail expected) */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { loadModule, closeLoader } from './unit/load.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rows = [];
const check = (cat, name, expected, actual, files, warn = false) => {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  rows.push({ cat, name, expected, actual, ok, files, warn: warn && !ok });
};
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const count = (a, f) => a.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
const imp = p => loadModule('/' + p);   /* Vite resolves the app's extensionless TS + JSON imports */

/* ── 1. allLocations.json ── */
const LOC = JSON.parse(readFileSync(join(root, 'src/data/allLocations.json'), 'utf8'));
const F = 'src/data/allLocations.json';
const REGION = {
  North: ['Punjab','Haryana','Uttar Pradesh','Uttarakhand','Himachal Pradesh','Delhi','Chandigarh','Jammu and Kashmir','Ladakh'],
  West: ['Maharashtra','Gujarat','Rajasthan','Goa','Madhya Pradesh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu'],
  East: ['West Bengal','Bihar','Odisha','Jharkhand','Assam','Sikkim','Arunachal Pradesh','Meghalaya','Nagaland','Manipur','Mizoram','Tripura'],
  South: ['Karnataka','Tamil Nadu','Telangana','Andhra Pradesh','Kerala','Puducherry','Andaman and Nicobar Islands','Lakshadweep']
};
const stReg = Object.fromEntries(Object.entries(REGION).flatMap(([r, s]) => s.map(x => [x, r])));
const REQ = ['id','name','cat','type','st','city','state','lat','lon','ne','disc'];
const badRec = LOC.filter(l => REQ.some(k => l[k] === undefined || l[k] === null || l[k] === '')).length;
const ids = new Set(LOC.map(l => l.id));
check('Location', 'total locations', 12494, LOC.length, F);
check('Location', 'records missing a required field', 0, badRec, F);
check('Location', 'duplicate ids', 0, LOC.length - ids.size, F);
check('Location', 'lat/lon inside India bbox (invalid count)', 0,
  LOC.filter(l => !(l.lat > 6 && l.lat < 38 && l.lon > 67 && l.lon < 98)).length, F);
const cat = count(LOC, l => l.cat);
check('Location', 'Datacenters (Central)', 848, cat.Central, F);
check('Location', 'PoPs (Regional)', 2711, cat.Regional, F);
check('Location', 'Sites (Edge)', 8935, cat.Edge, F);
const st = count(LOC, l => l.st);
check('Location', 'On-air', 9230, st['On-air'], F);
check('Location', 'In progress', 1849, st['In progress'], F);
check('Location', 'Planned', 1271, st.Planned, F);
check('Location', 'Failed', 144, st.Failed, F);
const unmapped = LOC.filter(l => !stReg[l.state]).length;
check('Location', 'locations in a state with no region', 0, unmapped, F);
const reg = count(LOC, l => stReg[l.state]);
const regTier = (r, c) => LOC.filter(l => stReg[l.state] === r && l.cat === c).length;
const RG = { North: [3457,235,762,2460], West: [2431,166,550,1715], East: [4673,303,973,3397], South: [1933,144,426,1363] };
for (const [r, [t, d, p, s]] of Object.entries(RG)) {
  check('Location', `${r} region total`, t, reg[r], F);
  check('Location', `${r} DC/PoP/Site`, [d, p, s], [regTier(r,'Central'), regTier(r,'Regional'), regTier(r,'Edge')], F);
}
check('Location', 'distinct states', 28, new Set(LOC.map(l => l.state)).size, F);
const geoTotals = {};
for (const l of LOC) geoTotals[l.state] = (geoTotals[l.state] || 0) + 1;

/* ── 2. ledger.ts ── */
const L = await imp('src/data/ledger.ts');   // import runs the ledger self-check; a throw fails the run
const FL = 'src/data/ledger.ts';
check('Reconciliation', 'ledger self-checks (PHY_TABS/STOCK_ST/PHY_MATRIX) import without throwing', true, true, FL);
check('Location', 'IL.locations/central/regional/edge', [12494,848,2711,8935], [L.IL.locations,L.IL.central,L.IL.regional,L.IL.edge], FL);
check('Location', 'IL tiers sum to IL.locations', 12494, L.IL.central + L.IL.regional + L.IL.edge, FL);
check('Physical Devices', 'IL.ne / discovered / inactive', [2703,2379,412], [L.IL.ne,L.IL.discovered,L.IL.inactive], FL);
check('Physical Devices', 'grand total elements', 3115, L.IL.ne + L.IL.inactive, FL);
const tabs = Object.fromEntries(L.PHY_TABS.map(t => [t.k, [t.c, t.disc]]));
check('Physical Devices', 'class totals/discovered', {
  router:[2148,2096], switch:[349,283], server:[96,0], dwdm:[78,0], enodeb:[18,0], gnodeb:[14,0] }, tabs, FL);
check('Physical Devices', 'class sum = IL.ne', 2703, sum(L.PHY_TABS, t => t.c), FL);
check('Physical Devices', 'PHY_TABS discovered by class', { router: 2096, switch: 283 }, { router: tabs.router[1], switch: tabs.switch[1] }, FL);
check('Physical Devices', 'PHY_TABS discovered sum = IL.discovered', 2379, sum(L.PHY_TABS, t => t.disc), FL);
const stock = Object.fromEntries(L.STOCK_ST.map(s => [s.k, s.c]));
check('Physical Devices', 'stock states', { planned:92, instore:34, deployed:2503, faulty:74, decomm:412 }, stock, FL);
check('Physical Devices', 'active stock sum', 2703, 92 + 34 + 2503 + 74, FL);
const mxRowsOk = L.NE_CLASSES.every(c => L.phyCount(c, L.ACTIVE_STATES) === tabs[c][0]);
const mxColsOk = L.STOCK_ST.every(s => L.stockTotal(s.k) === s.c);
check('Reconciliation', 'PHY_MATRIX rows foot to PHY_TABS', true, mxRowsOk, FL);
check('Reconciliation', 'PHY_MATRIX columns foot to STOCK_ST', true, mxColsOk, FL);
check('Physical Devices', 'ports', { total:48216, used:31894, free:16322 }, L.EST.ports, FL);
check('Physical Devices', 'ports used+free = total', 48216, L.EST.ports.used + L.EST.ports.free, FL);
check('Physical Devices', 'compliance', { compliant:1612, behind:807, unknown:240 }, L.EST.compliance, FL);
check('Physical Devices', 'spares', { instore:34, rma:41, intransit:12 }, L.EST.spares, FL);

/* ── 3. networkHierarchy.ts ── */
const H = (await imp('src/data/networkHierarchy.ts')).ESTATE_HIERARCHY;
const FH = 'src/data/networkHierarchy.ts';
check('Location', 'ESTATE_HIERARCHY totals', [848,2711,8935,12494], [H.dcCount,H.popCount,H.siteCount,H.totalLocations], FH);
check('Location', 'ESTATE_HIERARCHY tiers sum', 12494, H.dcCount + H.popCount + H.siteCount, FH);

/* ── 4. discovery.ts ── */
const D = await imp('src/data/discovery.ts');
const FD = 'src/data/discovery.ts';
check('Discovery Devices', 'targets', 3162, D.DL.targets, FD);
check('Discovery Devices', 'run full/partial/fail', [2524,399,239], [D.DL.runFull,D.DL.runPartial,D.DL.runFail], FD);
check('Discovery Devices', 'run outcomes sum = targets', 3162, D.DL.runFull + D.DL.runPartial + D.DL.runFail, FD);
check('Discovery Devices', 'identified', 3567, D.DL.identified, FD);
check('Discovery Devices', 'identified router/switch', [3032,535], [D.DL.discRouter,D.DL.discSwitch], FD);
check('Discovery Devices', 'router+switch = identified', 3567, D.DL.discRouter + D.DL.discSwitch, FD);
check('Discovery Devices', 'new this cycle', 93, D.DL.newThisCycle, FD);
check('Discovery Devices', 'vendors', [['Juniper',2208,131],['Cisco',1104,71],['Cisco SDN',134,15],['Nokia',74,11],['Adva',29,7],['Edgecore',18,4]],
  D.VENDORS.map(v => [v.n, v.ok, v.fail]), FD);
check('Discovery Devices', 'sum VENDORS.ok', 3567, sum(D.VENDORS, v => v.ok), FD);
const EXP_MODELS = [['MX960',412,41],['ASR920',388,29],['MX204',526,27],['EX2200-24T',143,19],['NCS-540',297,14],['C9300-48UXM',210,11]];
const dsrc = readFileSync(join(root, FD), 'utf8');
const lit = [...dsrc.matchAll(/\{ model: '([^']+)',\s*oem: '[^']+',\s*total: (\d+), fail: (\d+) \}/g)].map(m => [m[1], +m[2], +m[3]]);
check('Discovery Devices', 'MODELS source literals', EXP_MODELS, lit, FD);
/* the declared literals ARE the runtime values — the rosters are built to them, and the module's own self-check enforces it */
check('Discovery Devices', 'MODELS runtime values = declared literals', EXP_MODELS, D.MODELS.map(m => [m.model, m.total, m.fail]), FD);
check('Discovery Devices', 'MODELS runtime fail <= runFail', true, sum(D.MODELS, m => m.fail) <= D.DL.runFail, FD);
check('Discovery Devices', 'regions', [['North',871],['East',823],['West',737],['South',731]], D.REGIONS.map(r => [r.region, r.total]), FD);
check('Discovery Devices', 'sum REGIONS.total', 3162, sum(D.REGIONS, r => r.total), FD);
check('Discovery Devices', 'failure reasons', [93,56,45,25,12,8], D.REASONS.map(r => r.c), FD);
check('Reconciliation', 'sum REASONS = runFail', 239, sum(D.REASONS, r => r.c), FD);
check('Reconciliation', 'sum VENDORS.fail = runFail', 239, sum(D.VENDORS, v => v.fail), FD);

/* ── 5. COVERAGE_CIRCLES / GEOGRAPHIC_HIERARCHY ── */
const loc = readFileSync(join(root, 'src/screens/Location.tsx'), 'utf8');
const cc = loc.match(/const COVERAGE_CIRCLES: CoverageCircle\[\] = \[([\s\S]*?)\n\];/);
if (cc) {
  const tot = [...cc[1].matchAll(/\btotal:\s*(\d+)/g)].map(m => +m[1]);
  check('Location', 'COVERAGE_CIRCLES count / sum', [28, 12494], [tot.length, tot.reduce((a, b) => a + b, 0)], 'src/screens/Location.tsx');
} else check('Location', 'COVERAGE_CIRCLES parse', 'found', 'not found', 'src/screens/Location.tsx');
const geo = await imp('src/data/geographicHierarchy.ts').catch(e => ({ err: e.message }));
if (geo.GEOGRAPHIC_HIERARCHY) {
  const g = JSON.stringify(geo.GEOGRAPHIC_HIERARCHY);
  const walk = o => Array.isArray(o) ? o.flatMap(walk) : o && typeof o === 'object' ? [o, ...Object.values(o).flatMap(walk)] : [];
  const states = walk(geo.GEOGRAPHIC_HIERARCHY).filter(n => n && n.level === 'state' || n?.type === 'state');
  check('Location', 'GEOGRAPHIC_HIERARCHY parsed', true, g.length > 0, 'src/data/geographicHierarchy.ts');
  const sTot = states.map(s => s.total ?? s.totalLocations ?? s.count).filter(Number.isFinite);
  if (sTot.length) check('Location', 'GEOGRAPHIC_HIERARCHY state totals', [28, 12494], [sTot.length, sum(sTot, x => x)], 'src/data/geographicHierarchy.ts');
} else check('Location', 'GEOGRAPHIC_HIERARCHY import', 'ok', geo.err, 'src/data/geographicHierarchy.ts');

/* ── 6. public/legacy.js (evaluated in a stub sandbox) ── */
const FG = 'public/legacy.js';
try {
  const stubEl = () => new Proxy(function () {}, { get: (t, k) => k === 'style' || k === 'classList' || k === 'dataset' ? stubEl() : stubEl(), apply: () => stubEl(), set: () => true });
  const sb = { console, document: stubEl(), localStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout, requestAnimationFrame: () => 0 };
  sb.window = sb; sb.globalThis = sb;
  createContext(sb);
  runInContext(readFileSync(join(root, FG), 'utf8') + '\n;globalThis.__x={LOCATIONS,IL,STATE_REGION,LOC_GEO,TARGETS,MASTER_BY_IP,MASTER_BY_NAME,nodeRecord};', sb);
  const X = sb.__x;
  globalThis.__legacy = X;
  check('Location', 'legacy LOCATIONS length', 12494, X.LOCATIONS.length, FG);
  check('Location', 'legacy IL.locations', 12494, X.IL.locations, FG);
  const lc = count(X.LOCATIONS, l => l.cat);
  check('Location', 'legacy tiers', [848,2711,8935], [lc.Central, lc.Regional, lc.Edge], FG);
  const unm = [...new Set(LOC.map(l => l.state))].filter(s => !X.STATE_REGION[s]);
  check('Location', 'legacy STATE_REGION covers all 28 data states (unmapped)', [], unm, FG);
  const bad = Object.entries(X.STATE_REGION).filter(([s, r]) => stReg[s] !== r).length;
  check('Location', 'legacy STATE_REGION mapping mismatches', 0, bad, FG);
  const lr = count(X.LOCATIONS, l => X.STATE_REGION[l.state] || 'UNMAPPED');
  check('Location', 'legacy regional sums', { North:3457, West:2431, East:4673, South:1933 }, lr, FG);
  check('Location', 'legacy LOC_GEO sum', 12494, sum(X.LOC_GEO, g => g.tot), 'legacy/app-data.js');
  check('Location', 'legacy LOC_GEO states', 28, X.LOC_GEO.length, 'legacy/app-data.js');
  const lg = Object.fromEntries(X.LOC_GEO.map(g => [g.st, g.tot]));
  const mism = Object.keys(geoTotals).filter(s => lg[s] !== geoTotals[s]).length;
  check('Location', 'LOC_GEO vs allLocations per-state mismatches', 0, mism, 'legacy/app-data.js');
} catch (e) { check('Location', 'legacy bundle evaluation', 'ok', e.message, FG); }

/* ── 6b. Inventory ⇄ Discovery: one device, same identity, both directions ── */
const P = await imp('src/data/physical.ts');
const AR = await imp('src/data/archive.ts');
const FP = 'src/data/physical.ts', FX = 'src/data/discovery.ts ⇄ src/data/physical.ts';
const locById = new Map(LOC.map(l => [l.id, l]));
const inv = Object.entries(P.PHY).flatMap(([cls, rs]) => rs.map(r => ({ ...r, cls })));
const invByName = new Map(inv.map(r => [r.name, r]));
const invByIp = new Map(inv.flatMap(r => (r.ip2 ? [[r.ip, r], [r.ip2, r]] : [[r.ip, r]])));
const isRS = r => r.cls === 'router' || r.cls === 'switch';
const sameVendor = (label, oem) => label.split(' ')[0].toUpperCase() === oem.toUpperCase();

/* Inventory is internally sound and every location tag is real */
check('Physical Devices', 'active elements in the register', 2703, inv.length, FP);
check('Physical Devices', 'hostnames unique', 0, inv.length - invByName.size, FP);
check('Physical Devices', 'management + loopback IPs unique', 0, sum(inv, r => (r.ip2 ? 2 : 1)) - invByIp.size, FP);
check('Physical Devices', 'serial numbers unique', 0, inv.length - new Set(inv.map(r => r.sn)).size, FP);
const orphan = inv.filter(r => !locById.has(r.loc));
check('Location', 'Inventory elements whose loc is not in allLocations.json (orphans)', 0, orphan.length, FP);
const misaligned = inv.filter(r => { const l = locById.get(r.loc); return l && (l.city !== r.city || l.state !== r.state || stReg[l.state] !== r.region || P.regionOf(r.loc) !== r.region); });
/* Three Mumbai-named routers are tagged MH-DC-001, which the Datacenter-Ideation sync moved to Pune. The
   network estate's own records were left exactly as they were, so those three are the only known mismatch. */
const KNOWN_MOVED = ['MH-MMB-ACX2200-03', 'MH-MMB-MX204-03', 'MH-MMB-NCS540-01'];
check('Location', 'Inventory elements whose city / state / region disagree with their location (only the 3 left on the moved MH-DC-001)', KNOWN_MOVED, misaligned.map(r => r.name).sort(), FP);
const decomm = ['router','switch','server','dwdm','enodeb','gnodeb'].flatMap(k => AR.DECOMM[k]);
check('Physical Devices', 'decommissioned elements (archive)', 412, decomm.length, 'src/data/archive.ts');
check('Location', 'archive elements whose loc is not in allLocations.json', 0, decomm.filter(r => !locById.has(r.loc)).length, 'src/data/archive.ts');
check('Physical Devices', 'archive IPs / hostnames clash with the live register', 0, decomm.filter(r => invByName.has(r.name) || invByIp.has(r.ip)).length, 'src/data/archive.ts');

/* Discovery → Inventory: every device Discovery lists is a record Inventory holds */
const identityGaps = (list, label, { sub = false } = {}) => list.filter(d => {
  const el = sub ? invByName.get(d.parent) : invByName.get(d.name);
  return !(el && (el.ip === d.ip || el.ip2 === d.ip) && el.loc === d.loc && el.sn === (sub ? el.sn : d.sn) && el.model === d.model &&
    sameVendor(d.vendor, el.oem) && el.state === d.state && el.region === d.region && el.city === d.city);
}).length;
check('Reconciliation', 'polled targets (3,162) with no identical Inventory element', 0, identityGaps(D.REGION_DEVICES), FX);
check('Reconciliation', 'failed targets (ATTENTION, 239) with no identical Inventory element', 0, identityGaps(D.ATTENTION), FX);
check('Reconciliation', 'identified elements (2,379) with no identical Inventory element', 0, identityGaps(D.IDENTIFIED_DEVICES.filter(d => d.kind === 'element')), FX);
const subs = D.IDENTIFIED_DEVICES.filter(d => d.kind === 'sub');
check('Reconciliation', 'identified sub-elements (1,188) with no Inventory parent at the same IP / location', 0, identityGaps(subs, '', { sub: true }), FX);
check('Reconciliation', 'identified devices in total / elements / sub-elements', [3567, 2379, 1188],
  [D.IDENTIFIED_DEVICES.length, D.IDENTIFIED_DEVICES.length - subs.length, subs.length], FX);
check('Location', 'Discovery devices whose loc is not in allLocations.json', 0,
  [...D.REGION_DEVICES, ...D.IDENTIFIED_DEVICES, ...D.ATTENTION].filter(d => !locById.has(d.loc)).length, FX);
check('Location', 'Discovery states not among the 28 circles', 0, D.STATE_DEVICES.filter(s => !geoTotals[s.st]).length, FX);
check('Location', 'Discovery state → region agrees with the Location taxonomy', 0, D.STATE_DEVICES.filter(s => stReg[s.st] !== s.region).length, FX);

/* Inventory → Discovery: every router / switch Inventory registers is polled, and every discovered one is identified */
const polled = new Set(D.REGION_DEVICES.map(d => `${d.name}|${d.ip}`));
const identified = new Set(D.IDENTIFIED_DEVICES.filter(d => d.kind === 'element').map(d => `${d.name}|${d.ip}`));
const rsInv = inv.filter(isRS);
check('Reconciliation', 'active routers + switches in Inventory', 2497, rsInv.length, FP);
check('Reconciliation', 'Inventory routers / switches never polled by Discovery', 0, rsInv.filter(r => !polled.has(`${r.name}|${r.ip}`)).length, FX);
check('Reconciliation', 'Inventory elements marked discovered but not identified', 0, rsInv.filter(r => r.s === 'd' && !identified.has(`${r.name}|${r.ip}`)).length, FX);
check('Reconciliation', 'identified elements Inventory does not mark discovered', 0, D.IDENTIFIED_DEVICES.filter(d => d.kind === 'element' && invByName.get(d.name).s !== 'd').length, FX);
check('Reconciliation', 'not-discovered elements (118) are exactly the ones whose poll failed first-hand', 118,
  rsInv.filter(r => r.s !== 'd').length, FX);
check('Reconciliation', 'Inventory reconciliation split ok / drift / stale (discovered)', { ok: 1829, drift: 392, stale: 158 },
  { ok: rsInv.filter(r => r.s === 'd' && r.st === 'ok').length, drift: rsInv.filter(r => r.s === 'd' && r.st === 'drift').length, stale: rsInv.filter(r => r.s === 'd' && r.st === 'stale').length }, FP);
check('Reconciliation', 'dual-homed elements polled on a second (loopback) address', 665, inv.filter(r => r.ip2).length, FP);
check('Reconciliation', 'non-router/switch classes never polled (no collector)', 0, inv.filter(r => !isRS(r) && polled.has(`${r.name}|${r.ip}`)).length, FX);

/* searchability: the same four keys find the same element in both products */
const hit = (rowsFrom, key) => q => rowsFrom.some(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) && r[key] !== undefined);
const sample = rsInv.filter((_, i) => i % 11 === 0);
const searchGaps = { ip: 0, name: 0, sn: 0, loc: 0 };
const discAll = [...D.REGION_DEVICES, ...D.IDENTIFIED_DEVICES];
for (const e of sample) {
  const inInv = q => inv.some(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) && r.name === e.name);
  const inDisc = q => discAll.some(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) && (r.name === e.name || r.parent === e.name));
  for (const [k, q] of [['ip', e.ip], ['name', e.name], ['sn', e.sn], ['loc', e.loc]]) if (!inInv(q) || !inDisc(q)) searchGaps[k]++;
}
check('Reconciliation', `search by IP / hostname / serial / location id finds the element in both products (${sample.length} sampled, gaps)`, { ip: 0, name: 0, sn: 0, loc: 0 }, searchGaps, FX);
const named = invByName.get('RTR-WEST-2045');
check('Reconciliation', 'RTR-WEST-2045 · 172.31.84.45 — same device in both, Indore, Madhya Pradesh', ['172.31.84.45', 'Indore', 'Madhya Pradesh', 'West'],
  [named?.ip, named?.city, named?.state, named?.region], FP);
check('Reconciliation', 'RTR-WEST-2045 is also a failed Discovery target at the same address and location', true,
  D.ATTENTION.some(a => a.name === 'RTR-WEST-2045' && a.ip === '172.31.84.45' && a.loc === named?.loc), FX);

/* legacy prototype: Scan targets and Node/Resource view resolve the same elements */
if (globalThis.__legacy?.TARGETS) {
  const X = globalThis.__legacy, FGL = 'legacy/app-data.js → public/legacy.js';
  const ipmpls = X.TARGETS.filter(t => t.domain === 'IPMPLS' && !['Rogue', 'Unclaimed'].includes(t.out));
  check('Reconciliation', 'legacy IP/MPLS scan targets (excl. Rogue / Unclaimed) with no Inventory element at that IP', [], ipmpls.filter(t => !X.MASTER_BY_IP.has(t.ip)).map(t => t.ip), FGL);
  const named2 = X.TARGETS.filter(t => t.host && t.host !== '—' && X.MASTER_BY_NAME.has(t.host.toUpperCase()));
  const bad = named2.filter(t => { const m = X.MASTER_BY_NAME.get(t.host.toUpperCase()); return !(m.ip === t.ip || m.ip2 === t.ip) || m.oem.toUpperCase() !== t.oem.toUpperCase() || m.model !== t.model || m.state !== t.circle; });
  check('Reconciliation', 'legacy scan targets naming an Inventory element agree on IP / vendor / model / circle', [], bad.map(t => t.host), FGL);
  const nodeBad = sample.slice(0, 120).filter(e => { const n = X.nodeRecord(e.name, e.ip); return !(n && n.loc === e.loc && n.sn === e.sn && n.ip === e.ip && n.model === e.model); });
  check('Reconciliation', 'legacy Node / Resource view resolves 120 sampled elements to the same record', 0, nodeBad.length, 'legacy/app-node.js');
}

/* ── 7. optional browser pass ── */
if (process.argv.includes('--browser')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  const B = 'http://localhost:5173';
  const screens = [
    ['/inventory/location', ['12,494', 'Regions (4)', '5 States · 140 Cities', '6 States · 109 Cities', '12 States · 182 Cities', '5 States · 121 Cities']],
    ['/inventory/location?view=list&drill=All+locations', ['Showing 25 of 12,494', '3,457', '4,673', '2,431', '1,933']],
    ['/inventory/physical', ['Router (2,148)', 'Switch (349)', 'Server (96)', 'DWDM (78)', 'eNodeB (18)', 'gNodeB (14)', 'Showing 25 of 2,148']],
    ['/inventory/physical?cls=server', ['Server (96)', 'Showing 25 of 96']],
    ['/discovery/insights', ['98.23', '99.44', 'IP/MPLS polled targets: 3,162 (2,524 full · 399 partial · 239 failed)']],
    ['/discovery/insights/devices', ['Showing 25 of 3,162', 'North region', '871', 'East region', '823', 'West region', '737', 'South region', '731', 'Total targets', '3,162', '71 failed', '64 failed', '52 failed']],
    ['/discovery/insights/discovered', ['Showing 25 of 3,567']]
  ];
  for (const [path, must] of screens) {
    await page.goto(B + path, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1200);
    const t = await page.innerText('body');
    check('Browser Render', path, [], must.filter(n => !t.includes(n)), 'live UI');
  }
  /* a user searching one device by hostname, IP, serial or location id lands on it in every screen that lists it */
  const probe = rsInv.find(r => r.name === 'RTR-WEST-2045');
  const searches = [
    ['/inventory/physical?cls=router', 'Name, IP address, serial'],
    ['/discovery/insights/devices', 'Hostname, IP, serial, location'],
    ['/discovery/insights/discovered', 'Hostname, IP, serial, location']
  ];
  for (const [path, ph] of searches) for (const [key, q] of [['IP', probe.ip], ['hostname', probe.name], ['serial', probe.sn], ['location id', probe.loc]]) {
    await page.goto(B + path, { waitUntil: 'networkidle', timeout: 20000 });
    await page.getByPlaceholder(ph).first().fill(q);
    await page.waitForTimeout(500);
    const t = await page.innerText('body');
    check('Browser Render', `${path} · search by ${key} "${q}" shows ${probe.name} at ${probe.loc}`, [true, true], [t.includes(probe.name), t.includes(probe.loc)], 'live UI');
  }
  const real = errs.filter(e => !/favicon/.test(e) && !/status of 404/.test(e));
  check('Browser Render', 'console/page errors across all screens (favicon 404 ignored)', [], real, 'live UI');
  await browser.close();
}

/* ── report ── */
const short = v => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 70 ? s.slice(0, 67) + '…' : s; };
for (const r of rows) console.log(`${r.ok ? 'PASS' : r.warn ? 'WARN' : 'FAIL'}  [${r.cat}] ${r.name}${r.ok ? '' : `\n      expected ${short(r.expected)}\n      actual   ${short(r.actual)}   (${r.files})`}`);
const fails = rows.filter(r => !r.ok && !r.warn).length, warns = rows.filter(r => r.warn).length;
console.log(`\n${rows.length - fails - warns} pass, ${warns} warn, ${fails} fail of ${rows.length}`);
await closeLoader();
process.exit(fails ? 1 : 0);
