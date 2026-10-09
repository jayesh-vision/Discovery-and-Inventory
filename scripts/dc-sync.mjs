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
   and puts the same 24 data centers in the location roster (src/data/allLocations.json):
   a site that already has the ID is corrected in place, a missing one is added
   after the last data center of its state. Discovery-and-Inventory's roster
   folds Delhi into the Uttar Pradesh circle, so "Delhi NCR" is filed there.

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
const DC_KEYS = ['id', 'locationId', 'name', 'status', 'category', 'regionId', 'circleId', 'zone', 'city', 'state', 'address', 'lat', 'lng', 'tier', 'commissionedOn', 'floors', 'racks', 'ports', 'cabling', 'compute'];
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

/* ---------- location roster ---------- */
const ROSTER = join(root, 'src', 'data', 'allLocations.json');
const STATE = { 'Delhi NCR': 'Uttar Pradesh' };
const ST = { 'on-air': ['On-air', 'success'], 'in-progress': ['In progress', 'warning'], planned: ['Planned', 'info'], failed: ['Failed', 'error'] };
function rosterRecords({ datacenters, devices }) {
  return datacenters.map(d => {
    const mine = devices.filter(n => n.dcId === d.id);
    const [st, chip] = ST[d.status];
    return { st, chip, name: d.id, cat: 'Central', ct: 'amber', type: 'Datacenter', id: d.id, addr: d.address, city: d.city, state: STATE[d.state] ?? d.state,
      ne: mine.length, disc: mine.filter(n => n.discovery !== 'not-discovered').length, stage: null, issue: null, risk: null, lat: d.lat, lon: d.lng };
  });
}
function applyRoster(list, recs) {
  const out = [...list];
  for (const r of recs) {
    const i = out.findIndex(l => l.id === r.id);
    if (i >= 0) { out[i] = r; continue; }
    let at = -1;
    out.forEach((l, j) => { if (l.type === 'Datacenter' && l.state === r.state) at = j; });
    out.splice(at >= 0 ? at + 1 : out.length, 0, r);
  }
  return out;
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
  'gpu.json': JSON.stringify(inv.gpu)
};
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
const counts = summary(inv);
const roster = JSON.parse(readFileSync(ROSTER, 'utf8'));
const recs = rosterRecords(inv);

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
  for (const r of recs) {
    const l = roster.find(x => x.id === r.id);
    if (!l) problems.push(`allLocations.json: ${r.id} is missing`);
    else if (JSON.stringify(l) !== JSON.stringify(r)) problems.push(`allLocations.json: ${r.id} differs (${Object.keys(r).filter(k => JSON.stringify(l[k]) !== JSON.stringify(r[k])).join(', ')})`);
  }
  if (man && man.source.commit !== commit) console.log(`note: files were synced from ${man.source.commit.slice(0, 7)}, reference is now at ${commit.slice(0, 7)}`);
  if (problems.length) { console.error('Data center inventory differs from Datacenter-Ideation:\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log(`Data center inventory matches Datacenter-Ideation (${commit.slice(0, 7)}, ${MODEL}): ${counts.datacenters} data centers, ${counts.devices} devices, ${counts.gpuServers} GPU servers.`);
  process.exit(0);
}

mkdirSync(out, { recursive: true });
for (const [f, body] of Object.entries(files)) writeFileSync(join(out, f), body);
const before24 = recs.filter(r => roster.some(l => l.id === r.id)).length;
const next = applyRoster(roster, recs);
if (JSON.stringify(next) !== JSON.stringify(roster)) writeFileSync(ROSTER, JSON.stringify(next, null, 2));
console.log(`Location roster: ${before24} data centers corrected in place, ${recs.length - before24} added (${roster.length} → ${next.length} locations)`);
writeFileSync(join(out, 'manifest.json'), JSON.stringify({
  source: { repo: 'Datacenter-Ideation', commit, model: MODEL, generator: 'app/src/mock/generate.ts' },
  counts, datacenterIds: inv.datacenters.map(d => d.id), files: Object.fromEntries(Object.entries(files).map(([f, b]) => [f, { bytes: b.length, sha256: hash(b) }]))
}, null, 2) + '\n');
console.log(`Synced from Datacenter-Ideation ${commit.slice(0, 7)} (${MODEL}):`, JSON.stringify(counts));
for (const [f, b] of Object.entries(files)) console.log(`  src/data/dc/${f}  ${(b.length / 1024).toFixed(0)} KB`);
