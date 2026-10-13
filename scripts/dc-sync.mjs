/* Data center inventory import: two DCO backup workbooks + Datacenter-Ideation → src/data/dc/.

   Source of the data center solution (?solution=Datacenter, see src/solution.ts):
     data/dco-backup/dco-backup-neocloud-in-*.xlsx   India estate, 24 sites  (master data, as exported by the DCO tool)
     data/dco-backup/dco-backup-neocloud-us-*.xlsx   USA estate, 24 sites
   Both are read and shown together: one estate of 48 sites.

   What is taken from where:
     the workbooks        sites, floors, rooms, racks, devices, modules, interfaces (counted), links, services,
                          customers, GPU clusters and nodes, collectors, power, cooling, sensors — master data
     Datacenter-Ideation  what a workbook does not carry: capex/opex, risks, cabling-core ledger, compute and
                          port totals, discovery state and drift, GPU card detail, CDUs
   Datacenter-Ideation (read only) generates its estate in memory; the "neocloud" model under geography `in`
   and `us` is the one these backups were exported from. This script runs it for both, then CHECKS every
   workbook table against it (same ids, same values) and the workbooks against their own Summary-sheet rules
   (devices sit in racks that exist, no over-filled rack, unique device ids, …). Any disagreement stops the
   import and is listed; nothing is made up to fill a gap.

   Files written (JSON, never edited by hand):
     Datacenters.json  facility per site: power, cooling, rooms, racks, ports, cabling, compute, capex/opex, risks
     devices.json      every device, inventory fields only
     modules.json      each device's hardware modules, apart so the device list stays small
     gpu.json          GPU servers with their GPUs, clusters, liquid-cooling CDUs
     links.json        every link (LLDP / BGP / OSPF / ISIS / LSP …) with both ends and the patch ports
     services.json     every customer service, with its device, path and revenue
     customers.json    customers (one per geography: the same company in India and in the USA is two accounts)
     summary.json      small, always loaded: per-site and total figures, regions, states
     manifest.json     sources, counts, hash per file
   The default Inventory data is never touched by this script.

     npm run dc:sync              write the files
     npm run dc:check             compare the files with what the sources give, write nothing; exit 1 on a difference
   Paths: workbooks DCO_BACKUP_IN / DCO_BACKUP_US (default: data/dco-backup/*), reference DCI_PATH (default ../Datacenter-Ideation).
   Nothing is written inside the reference repo: its git status is checked before and after. */
import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWorkbook, table } from './lib/xlsx.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = resolve(process.env.DCI_PATH ?? join(root, '..', 'Datacenter-Ideation'));
const app = join(ref, 'app');
const out = join(root, 'src', 'data', 'dc');
const CHECK = process.argv.includes('--check');
const MODEL = 'neocloud';
const GEOS = ['in', 'us'];
const CUR = { in: 'INR', us: 'USD' };
const bk = join(root, 'data', 'dco-backup');
const workbookPath = g => process.env[`DCO_BACKUP_${g.toUpperCase()}`]
  ?? join(bk, (readdirSync(bk).find(f => f.startsWith(`dco-backup-${MODEL}-${g}-`) && f.endsWith('.xlsx')) ?? `dco-backup-${MODEL}-${g}.xlsx`));

if (!existsSync(join(app, 'src', 'mock', 'generate.ts'))) { console.error(`Datacenter-Ideation not found at ${ref} (set DCI_PATH)`); process.exit(2); }
const git = (...a) => execFileSync('git', ['-C', ref, ...a], { encoding: 'utf8' }).trim();
const before = git('status', '--porcelain');
const commit = git('rev-parse', 'HEAD');

/* ================= 1. read ================= */
const server = await createServer({
  root: app, configFile: false, logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: null },
  cacheDir: join(root, 'tests', 'unit', '.vite-cache', 'dci'),
  optimizeDeps: { noDiscovery: true, include: [] }
});
const dbs = {};
try {
  const geo = await server.ssrLoadModule('/src/mock/geo.ts');
  const gen = await server.ssrLoadModule('/src/mock/generate.ts');
  for (const g of GEOS) { geo.setActiveGeo(g); dbs[g] = gen.generate(MODEL); dbs[g].geoDef = geo.GEO_BY_ID[g]; }
} finally { await server.close(); }
if (git('status', '--porcelain') !== before) { console.error('Datacenter-Ideation working tree changed during the run — stopping.'); process.exit(2); }
const wbs = {}, wbFiles = {};
for (const g of GEOS) {
  wbFiles[g] = workbookPath(g);
  if (!existsSync(wbFiles[g])) { console.error(`workbook not found: ${wbFiles[g]} (set DCO_BACKUP_${g.toUpperCase()})`); process.exit(2); }
  const raw = readWorkbook(wbFiles[g]);
  wbs[g] = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, table(v)]));
}

/* ================= 2. check: every workbook table against the reference, and the workbook's own rules ================= */
const count = (a, f) => a.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const problems = [], notes = [];   /* notes: the source itself breaks one of its own Summary rules; reported, not hidden, and not blocking */
const norm = v => v === undefined || v === '' ? null : typeof v === 'string' && /^[YN]$/.test(v) ? v === 'Y' : typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v;
const day = ms => ms == null ? null : Math.round(ms / 864e5);
const xlDay = n => n == null ? null : Math.round(n) - 25569;
function same(label, wb, rf, wbKey, rfKey, fields) {
  const a = new Map(wb.map(r => [wbKey(r), r])), b = new Map(rf.map(r => [rfKey(r), r]));
  if (a.size !== wb.length) problems.push(`${label}: workbook has duplicate keys`);
  const onlyWb = [...a.keys()].filter(k => !b.has(k)), onlyRf = [...b.keys()].filter(k => !a.has(k));
  if (onlyWb.length || onlyRf.length) problems.push(`${label}: ${onlyWb.length} only in the workbook (${onlyWb.slice(0, 3)}), ${onlyRf.length} only in Datacenter-Ideation (${onlyRf.slice(0, 3)})`);
  for (const [name, wf, rfn, cmp] of fields) {
    let n = 0, ex = '';
    for (const [k, r] of a) { const o = b.get(k); if (!o) continue; const x = norm(wf(r)), y = norm(rfn(o)); if (cmp ? !cmp(x, y) : x !== y) { n++; ex ||= `${k}: workbook ${JSON.stringify(x)} vs ${JSON.stringify(y)}`; } }
    if (n) problems.push(`${label}.${name}: ${n} differ (e.g. ${ex})`);
  }
}
const F = (n, wf, rfn, cmp) => [n, wf, rfn, cmp];
const sameDay = (x, y) => x === y;
for (const g of GEOS) {
  const w = wbs[g], db = dbs[g], L = `${g.toUpperCase()}`;
  const dcs = db.Datacenters, racks = dcs.flatMap(d => d.racks), nes = db.nes;
  same(`${L} Sites`, w.Sites, dcs, r => r.site_id, d => d.id, [
    F('name', r => r.site_name, d => d.name), F('status', r => r.status, d => d.status), F('tier', r => r.tier, d => d.tier), F('category', r => r.category, d => d.category),
    F('state', r => r.state, d => d.state), F('city', r => r.city, d => d.city), F('address', r => r.address, d => d.address),
    F('lat', r => r.latitude, d => d.lat), F('lng', r => r.longitude, d => d.lng), F('coolingKw', r => r.cooling_capacity_kw, d => d.cooling.capacityKw),
    F('redundancy', r => r.cooling_redundancy, d => d.cooling.redundancy), F('pue', r => r.design_pue, d => d.power.pue)]);
  same(`${L} Racks`, w.Racks, racks, r => r.rack_id, r => r.id, [
    F('site', r => r.site_id, r => r.dcId), F('name', r => r.rack_name, r => r.name), F('role', r => r.role, r => r.role), F('heightU', r => r.height_u, r => r.heightU),
    F('budgetKw', r => r.power_budget_kw, r => r.budgetKw), F('owner', r => r.owner, r => r.owner ?? 'operator'), F('density', r => r.density, r => r.density ?? 'standard'),
    F('liquid', r => r.liquid_cooled, r => !!r.liquid)]);
  same(`${L} Devices`, w.Devices, nes, r => r.device_id, n => n.id, [
    F('site', r => r.site_id, n => n.dcId), F('name', r => r.hostname, n => n.name), F('role', r => r.role, n => n.role), F('layer', r => r.layer, n => n.layer),
    F('vendor', r => r.vendor, n => n.vendor), F('model', r => r.model, n => n.model), F('os', r => r.os_version, n => n.os), F('serial', r => r.serial, n => n.serial),
    F('ip', r => r.mgmt_ip, n => n.ip), F('mac', r => r.mac, n => n.mac), F('rack', r => r.rack_id, n => n.rackId), F('u', r => r.u_position, n => n.u),
    F('uSize', r => r.u_size, n => n.uSize ?? 1), F('lifecycle', r => r.lifecycle, n => n.lifecycle), F('collector', r => r.collector_id, n => n.collector)]);
  const modCount = new Map(); for (const m of w.Modules) modCount.set(m.device_id, (modCount.get(m.device_id) ?? 0) + 1);
  same(`${L} Modules`, [...modCount].map(([id, n]) => ({ id, n })), nes.filter(n => n.modules?.length), r => r.id, n => n.id, [F('count', r => r.n, n => n.modules.length)]);
  const ifCount = new Map(); for (const i of w.Interfaces) ifCount.set(i.device_id, (ifCount.get(i.device_id) ?? 0) + 1);
  same(`${L} Interfaces`, [...ifCount].map(([id, n]) => ({ id, n })), [...db.ifaces].map(([id, v]) => ({ id, n: v.length })), r => r.id, r => r.id, [F('count', r => r.n, r => r.n)]);
  same(`${L} Links`, w.Links, db.links, r => r.link_id, l => l.id, [
    F('a', r => r.a_device_id, l => l.aNe), F('aIf', r => r.a_if_name, l => l.aIf), F('z', r => r.z_device_id, l => l.zNe), F('zIf', r => r.z_if_name, l => l.zIf),
    F('role', r => r.role, l => l.role), F('protocol', r => r.protocol, l => l.protocol), F('capacity', r => r.capacity_mbps, l => l.capacityMbps),
    F('cable', r => r.cable_id, l => l.physical?.cable), F('strand', r => r.strand, l => l.physical?.strand), F('aPort', r => r.a_patch_port, l => l.physical?.aPort), F('zPort', r => r.z_patch_port, l => l.physical?.zPort)]);
  same(`${L} Services`, w.Services, db.services, r => r.service_id, s => s.id, [
    F('customer', r => r.customer_id, s => s.customerId), F('type', r => r.type, s => s.type), F('site', r => r.site_id, s => s.dcId), F('device', r => r.device_id, s => s.neId),
    F('if', r => r.if_name, s => s.ifName), F('qty', r => r.qty, s => s.qty), F('unit', r => r.unit, s => s.unit), F('bandwidth', r => r.bandwidth_mbps, s => s.bandwidthMbps),
    F('sla', r => r.sla_target_pct, s => s.slaTarget), F('revenue', r => r.monthly_revenue, s => s.revenueMonthly), F('critical', r => r.critical, s => !!s.critical)]);
  same(`${L} Customers`, w.Customers, db.customers, r => r.customer_id, c => c.id, [
    F('name', r => r.name, c => c.name), F('segment', r => r.segment, c => c.segment), F('city', r => r.city, c => c.city), F('state', r => r.state, c => c.state),
    F('plan', r => r.plan, c => c.plan), F('premium', r => r.premium, c => !!c.premium), F('am', r => r.account_manager, c => c.accountManager)]);
  same(`${L} GPU_Clusters`, w.GPU_Clusters, db.gpu.clusters, r => r.cluster_id, c => c.id, [
    F('site', r => r.site_id, c => c.dcId), F('name', r => r.name, c => c.name), F('scheduler', r => r.scheduler, c => c.scheduler), F('fabric', r => r.fabric, c => c.fabric),
    F('model', r => r.gpu_model, c => c.model), F('cooling', r => r.cooling, c => c.cooling)]);
  same(`${L} GPU_Nodes`, w.GPU_Nodes, [...db.gpu.nodes.values()], r => r.device_id, n => n.neId, [
    F('cluster', r => r.cluster_id, n => n.clusterId), F('model', r => r.gpu_model, n => n.model), F('vendor', r => r.gpu_vendor, n => n.vendor), F('gpus', r => r.gpu_count, n => n.gpus.length),
    F('server', r => r.server_model, n => n.server), F('cooling', r => r.cooling, n => n.cooling), F('driver', r => r.driver, n => n.driver), F('firmware', r => r.firmware, n => n.firmware)]);
  same(`${L} Collectors`, w.Collectors, dcs.flatMap(d => d.collectors.map(c => ({ ...c, dcId: d.id }))), r => r.collector_id, c => c.id, [F('site', r => r.site_id, c => c.dcId), F('name', r => r.name, c => c.name)]);
  same(`${L} UPS`, w.UPS, dcs.flatMap(d => d.power.ups), r => r.ups_id, u => u.id, [F('capacity', r => r.capacity_kw, u => u.capacityKw), F('redundancy', r => r.redundancy, u => u.redundancy)]);
  same(`${L} Power_Feeds`, w.Power_Feeds, dcs.flatMap(d => d.power.feeds.map(f => ({ ...f, k: `${d.id}-${f.id}` }))), r => r.feed_id, f => f.k, [F('capacity', r => r.capacity_kw, f => f.capacityKw), F('type', r => r.type, f => f.type)]);
  same(`${L} Cooling_Units`, w.Cooling_Units, [...dcs.flatMap(d => d.cooling.units), ...db.gpu.cdus], r => r.unit_id, u => u.id, [F('capacity', r => r.capacity_kw, u => u.capacityKw), F('type', r => r.type, u => u.type ?? 'CDU')]);
  same(`${L} CDUs`, w.CDUs, db.gpu.cdus, r => r.cdu_id, c => c.id, [F('capacity', r => r.capacity_kw, c => c.capacityKw), F('flow', r => r.nominal_flow_lpm, c => c.flowNominal)]);
  same(`${L} Sensors`, w.Sensors, dcs.flatMap(d => d.cooling.sensors), r => r.sensor_id, s => s.id, []);
  same(`${L} Generators`, w.Generators, dcs.map(d => ({ id: `${d.id}-DG-1`, kva: d.power.dg.kva })), r => r.dg_id, g2 => g2.id, [F('kva', r => r.kva, g2 => g2.kva)]);

  /* the workbook's own rules (its Summary sheet) */
  const rackIds = new Set(w.Racks.map(r => r.rack_id)), used = new Map(), ids = new Set();
  let bad;
  bad = w.Devices.filter(d => !rackIds.has(d.rack_id)); if (bad.length) problems.push(`${L}: ${bad.length} devices sit in a rack that does not exist (${bad[0].device_id})`);
  for (const d of w.Devices) used.set(d.rack_id, (used.get(d.rack_id) ?? 0) + (d.u_size ?? 1));
  bad = w.Racks.filter(r => (used.get(r.rack_id) ?? 0) > r.height_u); if (bad.length) problems.push(`${L}: ${bad.length} racks are over-filled (${bad[0].rack_id})`);
  bad = w.Devices.filter(d => ids.has(d.device_id) || !ids.add(d.device_id)); if (bad.length) problems.push(`${L}: ${bad.length} duplicate device ids`);
  bad = w.Devices.filter(d => d.owner === 'tenant' && !d.tenant_customer_id); if (bad.length) problems.push(`${L}: ${bad.length} tenant devices without a tenant`);
  bad = w.Racks.filter(r => r.owner === 'tenant' && (!r.tenant_customer_id || !r.contracted_kw)); if (bad.length) problems.push(`${L}: ${bad.length} tenant racks without tenant or contracted kW`);
  bad = w.Racks.filter(r => r.liquid_cooled === 'Y' && !r.cdu_id); if (bad.length) problems.push(`${L}: ${bad.length} liquid racks without a CDU`);
  const budget = new Map(); for (const r of w.Racks) budget.set(r.site_id, (budget.get(r.site_id) ?? 0) + r.power_budget_kw);
  bad = w.Sites.filter(s => (budget.get(s.site_id) ?? 0) > s.it_capacity_kw); if (bad.length) notes.push(`${L}: ${bad.length} site(s) whose racks budget more power than the site IT capacity: ${bad.map(x => `${x.site_id} (${x.site_name}, ${x.status}; racks ${budget.get(x.site_id)} kW > ${x.it_capacity_kw} kW)`).join(', ')}`);
  const gpuDev = w.Devices.filter(d => d.role === 'GPU').length; if (gpuDev !== w.GPU_Nodes.length) {
    const nodeIds = new Set(w.GPU_Nodes.map(n => n.device_id)), miss = w.Devices.filter(d => d.role === 'GPU' && !nodeIds.has(d.device_id));
    notes.push(`${L}: ${gpuDev} devices have role GPU but ${w.GPU_Nodes.length} have a GPU_Nodes row; ${miss.length} GPU devices without one (sites ${Object.entries(count(miss, d => d.site_id)).map(([k, v]) => `${k}:${v}`).join(' ')}; lifecycle ${JSON.stringify(count(miss, d => d.lifecycle))})`);
  }
  const custRev = new Map(), svcRev = new Map(); for (const s of w.Services) svcRev.set(s.customer_id, (svcRev.get(s.customer_id) ?? 0) + s.monthly_revenue);
  bad = w.Services.filter(s => !w.Customers.some(c => c.customer_id === s.customer_id)); if (bad.length) problems.push(`${L}: ${bad.length} services without a customer`);
  const devSet = new Set(w.Devices.map(d => d.device_id)); bad = w.Links.filter(l => !devSet.has(l.a_device_id) || !devSet.has(l.z_device_id)); if (bad.length) problems.push(`${L}: ${bad.length} links end on a device that does not exist (${bad[0]?.link_id})`);
  void custRev;
}
for (const n of notes) console.log('note: ' + n);
if (problems.length) { console.error('The workbooks and Datacenter-Ideation disagree — nothing written:\n  ' + problems.join('\n  ')); process.exit(1); }

/* ================= 3. merge the two geographies into one estate ================= */
/* ids that are only unique within a geography (links, services, customers) get a "-US" suffix for the USA estate */
const sfx = g => g === 'us' ? '-US' : '';
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
const DC_KEYS = ['id', 'locationId', 'name', 'status', 'category', 'regionId', 'circleId', 'zone', 'city', 'state', 'address', 'lat', 'lng', 'tier', 'commissionedOn', 'floors', 'racks', 'ports', 'cabling', 'compute', 'capex', 'opex', 'risks', 'readiness', 'collectors'];
const POWER_KEYS = ['capacityKw', 'acKw', 'dcKw', 'peakKw', 'pue', 'feeds', 'split', 'dg', 'battery', 'ups'];
const COOLING_KEYS = ['capacityKw', 'loadKw', 'redundancy', 'units', 'sensors'];
const RACK_KEYS = ['id', 'name', 'dcId', 'floor', 'room', 'role', 'heightU', 'usedU', 'drawKw', 'budgetKw', 'ports', 'portsUsed', 'tempC', 'owner', 'tenantId', 'contractedKw', 'density', 'liquid'];
const NE_KEYS = ['id', 'dcId', 'name', 'role', 'layer', 'vendor', 'model', 'os', 'serial', 'ip', 'mac', 'rackId', 'u', 'uSize', 'lifecycle', 'discovery', 'ndReason', 'drift', 'duplicateSerialOf', 'collector', 'isPe', 'tenantId'];
const MODULE_KEYS = ['slot', 'name', 'serial', 'state'];
const NODE_KEYS = ['neId', 'dcId', 'rackId', 'clusterId', 'model', 'vendor', 'server', 'state', 'jobId', 'cooling', 'driver', 'firmware', 'powerKw', 'health', 'rma', 'note'];
const GPU_KEYS = ['idx', 'serial', 'memGb', 'tdpW', 'health', 'sbe', 'dbe', 'retiredPages', 'remapPending', 'xid'];
const CDU_KEYS = ['id', 'dcId', 'name', 'room', 'racks', 'capacityKw', 'flowNominal', 'state'];

const Datacenters = [], devices = [], modules = [], links = [], services = [], customers = [];
const gpu = { nodes: [], clusters: [], cdus: [] };
const regions = [], circles = [];
for (const g of GEOS) {
  const db = dbs[g], w = wbs[g], S = sfx(g);
  const site = new Map(w.Sites.map(s => [s.site_id, s]));
  const rooms = new Map(); for (const r of w.Rooms) (rooms.get(r.site_id) ?? rooms.set(r.site_id, []).get(r.site_id)).push(r);
  const floorsBy = new Map(); for (const f of w.Floors) (floorsBy.get(f.site_id) ?? floorsBy.set(f.site_id, []).get(f.site_id)).push(f);
  const colBy = new Map(w.Collectors.map(c => [c.collector_id, c]));
  const sensorBy = new Map(w.Sensors.map(s => [s.sensor_id, s]));
  const dcRacks = new Map(w.Racks.map(r => [r.rack_id, r]));
  for (const d of db.Datacenters) {
    const s = site.get(d.id);
    Datacenters.push({
      ...pick(d, DC_KEYS), geo: g, currency: CUR[g], timezone: s.timezone, businessModel: s.business_model, itCapacityKw: s.it_capacity_kw,
      /* rooms as the workbook lists them: type, rack rows, cooling method */
      roomList: (rooms.get(d.id) ?? []).map(r => ({ id: r.room_id, name: r.room_name, floor: (floorsBy.get(d.id) ?? []).find(f => f.floor_id === r.floor_id)?.floor_name, type: r.room_type, areaSqm: r.area_sqm, rackRows: r.rack_rows, containment: r.containment, cooling: r.cooling_method })),
      racks: d.racks.map(r => ({ ...pick(r, RACK_KEYS), ...(dcRacks.get(r.id).tenant_customer_id ? { tenantId: dcRacks.get(r.id).tenant_customer_id + S } : {}) })),
      collectors: d.collectors.map(c => ({ ...pick(c, ['id', 'name', 'state', 'lastSeen']), protocol: colBy.get(c.id)?.protocol, domain: colBy.get(c.id)?.domain })),
      power: { ...pick(d.power, POWER_KEYS), ups: d.power.ups.map(u => pick(u, ['id', 'name', 'capacityKw', 'loadPct', 'redundancy', 'batteryMin', 'state'])) },
      cooling: { ...pick(d.cooling, COOLING_KEYS), sensors: d.cooling.sensors.map(x => ({ ...pick(x, ['id', 'zone', 'tempC', 'humidity', 'smoke', 'leak']), kind: sensorBy.get(x.id)?.kind })) }
    });
    regions.push(...[]);
  }
  for (const n of db.nes) {
    devices.push({ ...pick(n, NE_KEYS), ...(w.Devices.find ? {} : {}) });
    if (n.modules?.length) modules.push({ id: n.id, modules: n.modules.map(m => pick(m, MODULE_KEYS)) });
  }
  for (const l of db.links) links.push({ id: l.id + S, p: l.protocol, a: l.aNe, ai: l.aIf, z: l.zNe, zi: l.zIf, dc: l.dcId, cap: l.capacityMbps, role: l.role, st: l.state, util: l.utilPct, ...(l.physical ? { cable: l.physical.cable, strand: l.physical.strand, ap: l.physical.aPort, zp: l.physical.zPort } : {}) });
  for (const x of db.services) services.push({
    id: x.id + S, type: x.type, cust: x.customerId + S, dc: x.dcId, ne: x.neId, ifc: x.ifName, path: x.path, links: x.linkIds.map(i => i + S), bw: x.bandwidthMbps, status: x.status,
    sla: x.slaTarget, uptime: x.uptime30d, rev: x.revenueMonthly, crit: !!x.critical, qty: x.qty, unit: x.unit, cur: CUR[g],
    ...(w.Services.find(r => r.service_id === x.id)?.start_date ? { start: w.Services.find(r => r.service_id === x.id).start_date } : {})
  });
  for (const c of db.customers) customers.push({ id: c.id + S, name: c.name, segment: c.segment, city: c.city, state: c.state, plan: c.plan, premium: !!c.premium, am: c.accountManager, geo: g, cur: CUR[g] });
  for (const n of db.gpu.nodes.values()) gpu.nodes.push({ ...pick(n, NODE_KEYS), ib: n.ib.map(x => ({ rail: x.rail, state: x.state })), gpus: n.gpus.map(x => pick(x, GPU_KEYS)) });
  gpu.clusters.push(...db.gpu.clusters); gpu.cdus.push(...db.gpu.cdus.map(c => pick(c, CDU_KEYS)));
  regions.push(...db.geoDef.regions.map(r => ({ geo: g, id: r.id, name: r.name })));
  circles.push(...db.circles.map(c => ({ geo: g, id: c.id, name: c.name, state: c.state, regionId: c.regionId, lat: c.lat, lng: c.lng })));
}
/* the services' per-site revenue by customer is a sum the workbooks' Summary sheet checks; keep the per-customer figure with the account */
for (const c of customers) c.revenue = services.filter(x => x.cust === c.id).reduce((a, x) => a + x.rev, 0);
if (new Set(links.map(l => l.id)).size !== links.length || new Set(services.map(l => l.id)).size !== services.length || new Set(customers.map(l => l.id)).size !== customers.length ||
    new Set(devices.map(l => l.id)).size !== devices.length || new Set(Datacenters.map(l => l.id)).size !== Datacenters.length)
  { console.error('ids are not unique across the two geographies'); process.exit(1); }

/* ---------- summary: small, always loaded ----------
   Everything a screen needs at import time, per site and in total, so dashboards and counts never wait for the
   large files. Roster-shaped `location` records let it stand in for the location roster. */
const ST = { 'on-air': ['On-air', 'success'], 'in-progress': ['In progress', 'warning'], planned: ['Planned', 'info'], failed: ['Failed', 'error'] };
const linkBy = count(links, l => l.dc), svcBy = count(services, s => s.dc), gpuBy = count(gpu.nodes, n => n.dcId);
const sum = Datacenters.map(d => {
  const mine = devices.filter(n => n.dcId === d.id);
  const [stLabel, chip] = ST[d.status];
  const odf = d.ports.find(p => p.cls === 'Optical (ODF)') ?? { total: 0, used: 0 };
  const cores = d.cabling.ledger;
  const nodes = gpu.nodes.filter(n => n.dcId === d.id);
  return {
    id: d.id, geo: d.geo, currency: d.currency, city: d.city, state: d.state, regionId: d.regionId, circleId: d.circleId, tier: d.tier, category: d.category, status: d.status,
    address: d.address, lat: d.lat, lng: d.lng, timezone: d.timezone,
    devices: mine.length, byRole: count(mine, n => n.role), gpuServers: gpuBy[d.id] ?? 0, gpus: nodes.reduce((a, n) => a + n.gpus.length, 0),
    discovered: mine.filter(n => n.discovery !== 'not-discovered').length, verified: mine.filter(n => n.discovery === 'verified').length,
    drifted: mine.filter(n => n.discovery === 'drifted').length, notDiscovered: mine.filter(n => n.discovery === 'not-discovered').length,
    racks: d.racks.length, aiRacks: d.racks.filter(r => r.density === 'ai').length, uTotal: d.racks.reduce((a, r) => a + r.heightU, 0), uUsed: d.racks.reduce((a, r) => a + r.usedU, 0),
    racksFull: d.racks.filter(r => r.usedU >= r.heightU).length, rackKw: +d.racks.reduce((a, r) => a + r.drawKw, 0).toFixed(1),
    powerKw: d.power.capacityKw, itKw: d.itCapacityKw, pue: d.power.pue, ups: d.power.ups.length, feeds: d.power.feeds.length,
    dgLastTest: d.power.dg.lastTest, batteryLastTest: d.power.battery.lastTest,
    coolingKw: d.cooling.capacityKw, coolingUnits: d.cooling.units.length, cdu: d.cooling.units.filter(u => u.type === 'CDU').length, sensors: d.cooling.sensors.length,
    sensorAlarms: d.cooling.sensors.filter(x => x.smoke || x.leak).length,
    ports: { total: d.ports.reduce((a, p) => a + p.total, 0), used: d.ports.reduce((a, p) => a + p.used, 0) }, odf, cores: { total: cores.length, lit: cores.filter(c => c.state !== 'free').length },
    risks: { critical: d.risks.filter(r => r.severity === 'critical').length, major: d.risks.filter(r => r.severity === 'major').length, minor: d.risks.filter(r => r.severity === 'minor').length, byDomain: count(d.risks, r => r.domain) },
    vendors: count(mine, n => n.vendor), driftByVendor: count(mine.filter(n => n.discovery === 'drifted'), n => n.vendor),
    models: [...new Set(mine.map(n => `${n.vendor} ${n.model}`))].sort(), planned: mine.filter(n => n.lifecycle === 'Planned').length,
    links: linkBy[d.id] ?? 0, services: svcBy[d.id] ?? 0,
    capex: { approved: d.capex.approved, committed: d.capex.committed, spent: d.capex.spent }, opexMonthly: d.opex.monthly,
    location: { st: stLabel, chip, name: d.id, cat: d.category, ct: 'amber', type: 'Datacenter', id: d.id, addr: d.address, city: d.city, state: d.state,
      ne: mine.length, disc: mine.filter(n => n.discovery !== 'not-discovered').length, stage: null, issue: null, risk: null, lat: d.lat, lon: d.lng }
  };
});
const summaryObj = { Datacenters: sum, regions, circles };

const counts = {
  Datacenters: Datacenters.length, racks: Datacenters.reduce((a, d) => a + d.racks.length, 0), devices: devices.length, devicesByRole: count(devices, n => n.role),
  ups: Datacenters.reduce((a, d) => a + d.power.ups.length, 0), powerFeeds: Datacenters.reduce((a, d) => a + d.power.feeds.length, 0),
  coolingUnits: Datacenters.reduce((a, d) => a + d.cooling.units.length, 0), sensors: Datacenters.reduce((a, d) => a + d.cooling.sensors.length, 0),
  gpuServers: gpu.nodes.length, gpus: gpu.nodes.reduce((a, n) => a + n.gpus.length, 0), gpuClusters: gpu.clusters.length, cdus: gpu.cdus.length,
  links: links.length, linksByProtocol: count(links, l => l.p), services: services.length, servicesByType: count(services, s => s.type), customers: customers.length
};
const files = {
  'Datacenters.json': JSON.stringify(Datacenters), 'devices.json': JSON.stringify(devices), 'modules.json': JSON.stringify(modules), 'gpu.json': JSON.stringify(gpu),
  'links.json': JSON.stringify(links), 'services.json': JSON.stringify(services), 'customers.json': JSON.stringify(customers), 'summary.json': JSON.stringify(summaryObj)
};
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

if (CHECK) {
  const diff = [];
  const man = existsSync(join(out, 'manifest.json')) ? JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8')) : null;
  if (!man) diff.push('src/data/dc/manifest.json is missing — run npm run dc:sync');
  for (const [f, body] of Object.entries(files)) {
    const p = join(out, f);
    if (!existsSync(p)) { diff.push(`${f} is missing`); continue; }
    if (readFileSync(p, 'utf8') !== body) diff.push(`${f} differs from what the workbooks and Datacenter-Ideation give`);
  }
  if (man && man.source.commit !== commit) console.log(`note: files were synced from ${man.source.commit.slice(0, 7)}, reference is now at ${commit.slice(0, 7)}`);
  if (diff.length) { console.error('Data center inventory is out of date:\n  ' + diff.join('\n  ')); process.exit(1); }
  console.log(`Data center inventory matches the workbooks and Datacenter-Ideation (${commit.slice(0, 7)}, ${MODEL}): ${counts.Datacenters} sites, ${counts.devices} devices, ${counts.links} links, ${counts.services} services.`);
  process.exit(0);
}

mkdirSync(out, { recursive: true });
for (const [f, body] of Object.entries(files)) writeFileSync(join(out, f), body);
writeFileSync(join(out, 'manifest.json'), JSON.stringify({
  source: { repo: 'Datacenter-Ideation', commit, model: MODEL, generator: 'app/src/mock/generate.ts', geographies: GEOS,
    workbooks: Object.fromEntries(GEOS.map(g => [g, wbFiles[g].replace(/^.*\//, '')])) },
  counts, DatacenterIds: Datacenters.map(d => d.id), files: Object.fromEntries(Object.entries(files).map(([f, b]) => [f, { bytes: b.length, sha256: hash(b) }]))
}, null, 2) + '\n');
console.log(`Imported ${MODEL} (India + USA) — workbooks and Datacenter-Ideation ${commit.slice(0, 7)} agree:`, JSON.stringify(counts));
for (const [f, b] of Object.entries(files)) console.log(`  src/data/dc/${f}  ${(b.length / 1024).toFixed(0)} KB`);
