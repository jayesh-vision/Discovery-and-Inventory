/* Data center inventory sync: Datacenter-Ideation → Discovery-and-Inventory.

   Datacenter-Ideation (read only here) generates its estate in memory from a
   seeded generator. This script runs that generator — "cloud" model, the same
   one the reference app shows for the GPU estate — and writes the inventory
   part of it into src/data/dc/ as plain JSON:
     datacenters.json  facility per data center: power, cooling, floors, racks, ports, cabling, compute
     devices.json      every device (routers … GPU servers), inventory fields only
     modules.json      each device's hardware modules (slots, PSUs, fans), kept apart so the
                       device list stays small; only a device's detail needs them
     gpu.json          GPU servers with their GPUs, clusters, liquid-cooling CDUs, AI cages
     manifest.json     source commit, counts and a hash per file
   This data is shown only when Inventory is opened with ?solution=datacenter (see
   src/solution.ts). The default Inventory data, including the location roster, is never
   touched by this script.

   Telemetry (hourly series, CPU/ICMP/NTP/RADIUS, GPU utilisation), alarms,
   incidents, customers, services and revenue are not inventory and are left out.

     npm run dc:sync              write the files
     npm run dc:check             compare the files with the reference, write nothing;
                                  exit 1 and list the differences if they disagree
   The reference path defaults to ../Datacenter-Ideation (override: DCI_PATH=…).
   Nothing is written inside the reference repo: its git status is checked
   before and after, and the Vite cache lives in this repo's tests/unit/.vite-cache. */
import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = resolve(process.env.DCI_PATH ?? join(root, '..', 'Datacenter-Ideation'));
const app = join(ref, 'app');
const out = join(root, 'src', 'data', 'dc');
const CHECK = process.argv.includes('--check');
const MODEL = 'cloud';

if (!existsSync(join(app, 'src', 'mock', 'generate.ts'))) { console.error(`Datacenter-Ideation not found at ${ref} (set DCI_PATH)`); process.exit(2); }
const git = (...a) => execFileSync('git', ['-C', ref, ...a], { encoding: 'utf8' }).trim();
const before = git('status', '--porcelain');
const commit = git('rev-parse', 'HEAD');

/* ---------- inventory shapes ---------- */
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
const DC_KEYS = ['id', 'locationId', 'name', 'status', 'category', 'regionId', 'circleId', 'zone', 'city', 'state', 'address', 'lat', 'lng', 'tier', 'commissionedOn', 'floors', 'racks', 'ports', 'cabling', 'compute', 'capex', 'opex', 'risks', 'readiness'];
const POWER_KEYS = ['capacityKw', 'acKw', 'dcKw', 'peakKw', 'pue', 'feeds', 'split', 'dg', 'battery', 'ups'];
const COOLING_KEYS = ['capacityKw', 'loadKw', 'redundancy', 'units', 'sensors'];
const NE_KEYS = ['id', 'dcId', 'name', 'role', 'layer', 'vendor', 'model', 'os', 'serial', 'ip', 'mac', 'rackId', 'u', 'uSize', 'lifecycle', 'discovery', 'ndReason', 'drift', 'duplicateSerialOf', 'collector', 'isPe', 'tenantId', 'modules'];
const MODULE_KEYS = ['slot', 'name', 'serial', 'state'];
const NODE_KEYS = ['neId', 'dcId', 'rackId', 'clusterId', 'model', 'vendor', 'server', 'state', 'jobId', 'cooling', 'driver', 'firmware', 'powerKw', 'health', 'rma', 'note'];
const GPU_KEYS = ['idx', 'serial', 'memGb', 'tdpW', 'health', 'sbe', 'dbe', 'retiredPages', 'remapPending', 'xid'];

function inventory(db) {
  const datacenters = db.datacenters.map(d => ({ ...pick(d, DC_KEYS), power: pick(d.power, POWER_KEYS), cooling: pick(d.cooling, COOLING_KEYS) }));
  const devices = db.nes.map(n => pick(n, NE_KEYS.filter(k => k !== 'modules')));
  const modules = db.nes.filter(n => n.modules?.length).map(n => ({ id: n.id, modules: n.modules.map(m => pick(m, MODULE_KEYS)) }));
  const g = db.gpu;
  const gpu = g ? {
    nodes: [...g.nodes.values()].map(n => ({ ...pick(n, NODE_KEYS), ib: n.ib.map(x => ({ rail: x.rail, state: x.state })), gpus: n.gpus.map(x => pick(x, GPU_KEYS)) })),
    clusters: g.clusters, cdus: g.cdus, cages: g.cages
  } : { nodes: [], clusters: [], cdus: [], cages: [] };
  return { datacenters, devices, modules, gpu };
}

/* ---------- summary: small, always loaded ----------
   Everything a screen needs at import time, per data center and in total, so the data center
   solution's dashboards and counts never wait for the large files. Roster-shaped `location`
   records let it stand in for the location roster. Delhi NCR is filed under Uttar Pradesh, as
   this app's default roster does. */
const STATE = { 'Delhi NCR': 'Uttar Pradesh' };
const ST = { 'on-air': ['On-air', 'success'], 'in-progress': ['In progress', 'warning'], planned: ['Planned', 'info'], failed: ['Failed', 'error'] };
const CIRCLE = { 'Maharashtra': 'MH', 'Uttar Pradesh': 'UP', 'Karnataka': 'KA', 'Andhra Pradesh': 'AP', 'Haryana': 'HR', 'Punjab': 'PB', 'Gujarat': 'GJ', 'Madhya Pradesh': 'MP', 'Rajasthan': 'RJ', 'West Bengal': 'WB', 'Odisha': 'OR', 'Bihar': 'BR', 'Tamil Nadu': 'TN', 'Telangana': 'TS', 'Kerala': 'KL' };
function makeSummary({ datacenters, devices, gpu }) {
  const gpuBy = count(gpu.nodes, n => n.dcId);
  const per = datacenters.map(d => {
    const mine = devices.filter(n => n.dcId === d.id);
    const state = STATE[d.state] ?? d.state;
    const [stLabel, chip] = ST[d.status];
    const odf = d.ports.find(p => p.cls === 'Optical (ODF)') ?? { total: 0, used: 0 };
    const cores = d.cabling.ledger;
    const nodes = gpu.nodes.filter(n => n.dcId === d.id);
    return {
      id: d.id, city: d.city, state, regionId: d.regionId, circleId: CIRCLE[state] ?? d.circleId, tier: d.tier, category: d.category, status: d.status,
      address: d.address, lat: d.lat, lng: d.lng,
      devices: mine.length, byRole: count(mine, n => n.role), gpuServers: gpuBy[d.id] ?? 0, gpus: nodes.reduce((a, n) => a + n.gpus.length, 0),
      discovered: mine.filter(n => n.discovery !== 'not-discovered').length, verified: mine.filter(n => n.discovery === 'verified').length,
      drifted: mine.filter(n => n.discovery === 'drifted').length, notDiscovered: mine.filter(n => n.discovery === 'not-discovered').length,
      racks: d.racks.length, aiRacks: d.racks.filter(r => r.density === 'ai').length, uTotal: d.racks.reduce((a, r) => a + r.heightU, 0), uUsed: d.racks.reduce((a, r) => a + r.usedU, 0),
      racksFull: d.racks.filter(r => r.usedU >= r.heightU).length, rackKw: +d.racks.reduce((a, r) => a + r.drawKw, 0).toFixed(1),
      powerKw: d.power.capacityKw, itKw: d.power.split.find(x => x.label === 'IT equipment')?.kw ?? 0, pue: d.power.pue, ups: d.power.ups.length, feeds: d.power.feeds.length,
      dgLastTest: d.power.dg.lastTest, batteryLastTest: d.power.battery.lastTest,
      coolingKw: d.cooling.capacityKw, coolingUnits: d.cooling.units.length, cdu: d.cooling.units.filter(u => u.type === 'CDU').length, sensors: d.cooling.sensors.length,
      sensorAlarms: d.cooling.sensors.filter(x => x.smoke || x.leak).length,
      ports: { total: d.ports.reduce((a, p) => a + p.total, 0), used: d.ports.reduce((a, p) => a + p.used, 0) }, odf, cores: { total: cores.length, lit: cores.filter(c => c.state !== 'free').length },
      risks: { critical: d.risks.filter(r => r.severity === 'critical').length, major: d.risks.filter(r => r.severity === 'major').length, minor: d.risks.filter(r => r.severity === 'minor').length,
        byDomain: count(d.risks, r => r.domain) },
      vendors: count(mine, n => n.vendor), driftByVendor: count(mine.filter(n => n.discovery === 'drifted'), n => n.vendor),
      models: [...new Set(mine.map(n => `${n.vendor} ${n.model}`))].sort(), planned: mine.filter(n => n.lifecycle === 'Planned').length,
      capex: { approved: d.capex.approved, committed: d.capex.committed, spent: d.capex.spent }, opexMonthly: d.opex.monthly,
      location: { st: stLabel, chip, name: d.id, cat: 'Central', ct: 'amber', type: 'Datacenter', id: d.id, addr: d.address, city: d.city, state,
        ne: mine.length, disc: mine.filter(n => n.discovery !== 'not-discovered').length, stage: null, issue: null, risk: null, lat: d.lat, lon: d.lng }
    };
  });
  return { datacenters: per };
}

const count = (a, f) => a.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
function summary({ datacenters, devices, gpu }) {
  return {
    datacenters: datacenters.length,
    racks: datacenters.reduce((a, d) => a + d.racks.length, 0),
    devices: devices.length,
    devicesByRole: count(devices, n => n.role),
    ups: datacenters.reduce((a, d) => a + d.power.ups.length, 0),
    powerFeeds: datacenters.reduce((a, d) => a + d.power.feeds.length, 0),
    coolingUnits: datacenters.reduce((a, d) => a + d.cooling.units.length, 0),
    sensors: datacenters.reduce((a, d) => a + d.cooling.sensors.length, 0),
    gpuServers: gpu.nodes.length,
    gpus: gpu.nodes.reduce((a, n) => a + n.gpus.length, 0),
    gpuClusters: gpu.clusters.length,
    cdus: gpu.cdus.length,
    aiCages: gpu.cages.length
  };
}

/* ---------- run the reference generator ---------- */
const server = await createServer({
  root: app, configFile: false, logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: null },
  cacheDir: join(root, 'tests', 'unit', '.vite-cache', 'dci'),
  optimizeDeps: { noDiscovery: true, include: [] }
});
let inv;
try {
  const gen = await server.ssrLoadModule('/src/mock/generate.ts');
  inv = inventory(gen.generate(MODEL));
} finally { await server.close(); }
if (git('status', '--porcelain') !== before) { console.error('Datacenter-Ideation working tree changed during the run — stopping.'); process.exit(2); }

const files = {
  'datacenters.json': JSON.stringify(inv.datacenters),
  'devices.json': JSON.stringify(inv.devices),
  'modules.json': JSON.stringify(inv.modules),
  'gpu.json': JSON.stringify(inv.gpu),
  'summary.json': JSON.stringify(makeSummary(inv))
};
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
const counts = summary(inv);

if (CHECK) {
  const problems = [];
  const man = existsSync(join(out, 'manifest.json')) ? JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8')) : null;
  if (!man) problems.push('src/data/dc/manifest.json is missing — run npm run dc:sync');
  for (const [f, body] of Object.entries(files)) {
    const p = join(out, f);
    if (!existsSync(p)) { problems.push(`${f} is missing`); continue; }
    const mine = readFileSync(p, 'utf8');
    if (mine === body) continue;
    /* say what differs, record by record */
    const a = JSON.parse(mine), b = JSON.parse(body);
    const list = x => Array.isArray(x) ? x : Object.entries(x).flatMap(([k, v]) => Array.isArray(v) ? v.map(r => ({ __set: k, ...r })) : []);
    const key = r => `${r.__set ?? ''}${r.id ?? r.neId ?? r.rackId ?? JSON.stringify(r).slice(0, 40)}`;
    const ma = new Map(list(a).map(r => [key(r), JSON.stringify(r)])), mb = new Map(list(b).map(r => [key(r), JSON.stringify(r)]));
    const added = [...mb.keys()].filter(k => !ma.has(k)), removed = [...ma.keys()].filter(k => !mb.has(k));
    const changed = [...mb.keys()].filter(k => ma.has(k) && ma.get(k) !== mb.get(k));
    problems.push(`${f}: ${changed.length} changed, ${added.length} only in Datacenter-Ideation, ${removed.length} only here` +
      [...changed.slice(0, 5).map(k => `\n    changed  ${k}`), ...added.slice(0, 5).map(k => `\n    missing  ${k}`), ...removed.slice(0, 5).map(k => `\n    extra    ${k}`)].join(''));
  }
  if (man && man.source.commit !== commit) console.log(`note: files were synced from ${man.source.commit.slice(0, 7)}, reference is now at ${commit.slice(0, 7)}`);
  if (problems.length) { console.error('Data center inventory differs from Datacenter-Ideation:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log(`Data center inventory matches Datacenter-Ideation (${commit.slice(0, 7)}, ${MODEL}): ${counts.datacenters} data centers, ${counts.devices} devices, ${counts.gpuServers} GPU servers.`);
  process.exit(0);
}

mkdirSync(out, { recursive: true });
for (const [f, body] of Object.entries(files)) writeFileSync(join(out, f), body);
writeFileSync(join(out, 'manifest.json'), JSON.stringify({
  source: { repo: 'Datacenter-Ideation', commit, model: MODEL, generator: 'app/src/mock/generate.ts' },
  counts, datacenterIds: inv.datacenters.map(d => d.id), files: Object.fromEntries(Object.entries(files).map(([f, b]) => [f, { bytes: b.length, sha256: hash(b) }]))
}, null, 2) + '\n');
console.log(`Synced from Datacenter-Ideation ${commit.slice(0, 7)} (${MODEL}):`, JSON.stringify(counts));
for (const [f, b] of Object.entries(files)) console.log(`  src/data/dc/${f}  ${(b.length / 1024).toFixed(0)} KB`);
