/* ── The data center solution's data, for every screen ──────────────────────────
   One place, two layers:
     • SUMMARY: per data center and in total. Small (27 KB), always bundled, and available the
       moment a module is imported, so dashboards and counts can be built at import time.
     • FULL records (facilities, devices, GPU servers): large, loaded once by preloadScope()
       before the app renders in the data center solution, then read synchronously with scope().

   Everything here is data copied from Datacenter-Ideation by `npm run dc:sync`. The mode itself
   (default or data center) is fixed for a page load; see src/solution.ts.

   Nothing in the default Inventory reads from this module except through `scoped()`, which
   returns the default value untouched. */
import summaryJson from './summary.json';
import { isDatacenter } from '../../solution';
import { loadCustomers, loadDevices, loadFacilities, loadGpu, loadLinks, loadServices, type DcCustomer, type DcDevice, type DcFacility, type DcGeo, type DcGpuData, type DcLink, type DcRole, type DcService } from './index';

export interface DcSum {
  id: string; geo: DcGeo; currency: 'INR' | 'USD'; timezone?: string; city: string; state: string; regionId: string; circleId: string; tier: 'Tier II' | 'Tier III' | 'Tier IV'; category: 'Central' | 'Regional' | 'Edge';
  status: 'on-air' | 'in-progress' | 'planned' | 'failed'; address: string; lat: number; lng: number;
  devices: number; byRole: Partial<Record<DcRole, number>>; gpuServers: number; gpus: number;
  discovered: number; verified: number; drifted: number; notDiscovered: number; planned: number;
  racks: number; aiRacks: number; uTotal: number; uUsed: number; racksFull: number; rackKw: number;
  powerKw: number; itKw: number; pue: number; ups: number; feeds: number; dgLastTest: number; batteryLastTest: number;
  coolingKw: number; coolingUnits: number; cdu: number; sensors: number; sensorAlarms: number;
  ports: { total: number; used: number }; odf: { total: number; used: number }; cores: { total: number; lit: number };
  capex: { approved: number; committed: number; spent: number }; opexMonthly: number;
  risks: { critical: number; major: number; minor: number; byDomain: Record<string, number> };
  links: number; services: number;
  vendors: Record<string, number>; driftByVendor: Record<string, number>; models: string[];
  /** a location roster record (the same shape as src/data/allLocations.json) */
  location: { st: string; chip: string; name: string; cat: string; ct: string; type: string; id: string; addr: string; city: string; state: string; ne: number; disc: number; stage: null; issue: null; risk: null; lat: number; lon: number };
}

export const SCOPED: boolean = isDatacenter();
export const isScoped = (): boolean => isDatacenter() || SCOPED;
export interface DcRegion { geo: DcGeo; id: string; name: string }
export interface DcCircle { geo: DcGeo; id: string; name: string; state: string; regionId: string; lat: number; lng: number }
const SUMMARY = summaryJson as unknown as { datacenters: DcSum[]; regions: DcRegion[]; circles: DcCircle[] };
export const DC_SUM = SUMMARY.datacenters;
/** regions and states (circles) of both geographies; an id is only unique together with its `geo` */
export const DC_REGIONS = SUMMARY.regions;
export const DC_CIRCLES = SUMMARY.circles;
export const DC_GEO_LABEL: Record<DcGeo, string> = { in: 'India', us: 'United States' };
export const dcSumList = (geo?: DcGeo | null): DcSum[] =>
  geo ? DC_SUM.filter(d => d.geo === geo) : DC_SUM;

export const dcSum = (id: string): DcSum | undefined => DC_SUM.find(d => d.id === id);
/** a site's macro region: North / East / West / South consolidating all countries */
export const dcRegionLabel = (d: { geo: DcGeo; regionId: string }): string => {
  const r = String(d && d.regionId || '').toLowerCase();
  if (r.includes('west')) return 'West';
  if (r.includes('north')) return 'North';
  if (r.includes('south')) return 'South';
  return 'East';
};
/** the 4 standard macro regions in order */
export const dcRegionLabels = (): string[] => ['North', 'South', 'West', 'East'];

const add = (f: (d: DcSum) => number) => DC_SUM.reduce((a, d) => a + f(d), 0);
const roleSum = (r: DcRole) => add(d => d.byRole[r] ?? 0);
/** totals across all the data centers (both geographies), computed from the summary */
export const DC_TOTAL = {
  dcs: DC_SUM.length, racks: add(d => d.racks), aiRacks: add(d => d.aiRacks), devices: add(d => d.devices), gpuServers: add(d => d.gpuServers), gpus: add(d => d.gpus),
  discovered: add(d => d.discovered), verified: add(d => d.verified), drifted: add(d => d.drifted), notDiscovered: add(d => d.notDiscovered), planned: add(d => d.planned),
  uTotal: add(d => d.uTotal), uUsed: add(d => d.uUsed), racksFull: add(d => d.racksFull), powerKw: add(d => d.powerKw), itKw: add(d => d.itKw), coolingKw: add(d => d.coolingKw),
  coolingUnits: add(d => d.coolingUnits), cdu: add(d => d.cdu), sensors: add(d => d.sensors), ups: add(d => d.ups), feeds: add(d => d.feeds),
  portsTotal: add(d => d.ports.total), portsUsed: add(d => d.ports.used), odfTotal: add(d => d.odf.total), odfUsed: add(d => d.odf.used), cores: add(d => d.cores.total), coresLit: add(d => d.cores.lit),
  byStatus: (s: DcSum['status']) => DC_SUM.filter(d => d.status === s).length,
  byRole: roleSum
};

/** the default value in the default Inventory, the data center value in the data center solution */
export function scoped<T>(def: T, dc: () => T): T { return (isDatacenter() || SCOPED) ? dc() : def; }

/* ── full records ── */
export interface ScopeData { facs: DcFacility[]; devices: DcDevice[]; gpu: DcGpuData; links: DcLink[]; services: DcService[]; customers: DcCustomer[]; devicesOf: (dcId: string) => DcDevice[]; facOf: (dcId: string) => DcFacility | undefined }
let loaded: ScopeData | null = null;

/** load the full records; the app calls this before it renders in the data center solution */
export async function preloadScope(): Promise<void> {
  if ((!SCOPED && !isDatacenter()) || loaded) return;
  const [facs, devices, gpu, links, services, customers] = await Promise.all([loadFacilities(), loadDevices(), loadGpu(), loadLinks(), loadServices(), loadCustomers()]);
  const by = new Map<string, DcDevice[]>();
  for (const d of devices) (by.get(d.dcId) ?? by.set(d.dcId, []).get(d.dcId)!).push(d);
  const fac = new Map(facs.map(f => [f.id, f]));
  loaded = { facs, devices, gpu, links, services, customers, devicesOf: id => by.get(id) ?? [], facOf: id => fac.get(id) };
}

/** the full records, once preloaded (always, by the time any screen renders in the data center solution) */
export function scope(geo?: DcGeo | null): ScopeData {
  if (!loaded) throw new Error('data center scope used before preloadScope() finished');
  if (!geo) return loaded;
  const facs = loaded.facs.filter(f => f.geo === geo);
  const facIds = new Set(facs.map(f => f.id));
  const devices = loaded.devices.filter(d => facIds.has(d.dcId));
  const by = new Map<string, DcDevice[]>();
  for (const d of devices) (by.get(d.dcId) ?? by.set(d.dcId, []).get(d.dcId)!).push(d);
  const fac = new Map(facs.map(f => [f.id, f]));
  const links = loaded.links.filter(l => facIds.has(l.dc));
  const services = loaded.services.filter(s => facIds.has(s.dc));
  const customers = loaded.customers.filter(c => c.geo === geo);
  const gpuNodes = (loaded.gpu?.nodes ?? []).filter(n => facIds.has(n.dcId));
  const gpuClusters = (loaded.gpu?.clusters ?? []).filter(c => facIds.has(c.dcId));
  const gpuCdus = (loaded.gpu?.cdus ?? []).filter(c => facIds.has(c.dcId));
  const gpu: DcGpuData = { ...loaded.gpu, nodes: gpuNodes, clusters: gpuClusters, cdus: gpuCdus };
  return { facs, devices, gpu, links, services, customers, devicesOf: id => by.get(id) ?? [], facOf: id => fac.get(id) };
}
export const scopeReady = (): boolean => loaded !== null;
