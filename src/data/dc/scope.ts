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
export interface DcRegion { geo: DcGeo; id: string; name: string }
export interface DcCircle { geo: DcGeo; id: string; name: string; state: string; regionId: string; lat: number; lng: number }
const SUMMARY = summaryJson as unknown as { datacenters: DcSum[]; regions: DcRegion[]; circles: DcCircle[] };
export const DC_SUM = SUMMARY.datacenters;
/** regions and states (circles) of both geographies; an id is only unique together with its `geo` */
export const DC_REGIONS = SUMMARY.regions;
export const DC_CIRCLES = SUMMARY.circles;
export const DC_GEO_LABEL: Record<DcGeo, string> = { in: 'India', us: 'United States' };
export const dcSum = (id: string): DcSum | undefined => DC_SUM.find(d => d.id === id);
/** a site's region as it is written on a screen: India's North / East / West / South, the USA's "US Northeast" … ("West" exists in both) */
export const dcRegionLabel = (d: { geo: DcGeo; regionId: string }): string => {
  const name = DC_REGIONS.find(r => r.geo === d.geo && r.id === d.regionId)?.name ?? d.regionId;
  return d.geo === 'us' ? `US ${name}` : name;
};
/** every region label that has a data center, in order */
export const dcRegionLabels = (): string[] => [...new Set(DC_SUM.map(dcRegionLabel))];

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
export function scoped<T>(def: T, dc: () => T): T { return SCOPED ? dc() : def; }

/* ── full records ── */
export interface ScopeData { facs: DcFacility[]; devices: DcDevice[]; gpu: DcGpuData; links: DcLink[]; services: DcService[]; customers: DcCustomer[]; devicesOf: (dcId: string) => DcDevice[]; facOf: (dcId: string) => DcFacility | undefined }
let loaded: ScopeData | null = null;

/** load the full records; the app calls this before it renders in the data center solution */
export async function preloadScope(): Promise<void> {
  if (!SCOPED || loaded) return;
  const [facs, devices, gpu, links, services, customers] = await Promise.all([loadFacilities(), loadDevices(), loadGpu(), loadLinks(), loadServices(), loadCustomers()]);
  const by = new Map<string, DcDevice[]>();
  for (const d of devices) (by.get(d.dcId) ?? by.set(d.dcId, []).get(d.dcId)!).push(d);
  const fac = new Map(facs.map(f => [f.id, f]));
  loaded = { facs, devices, gpu, links, services, customers, devicesOf: id => by.get(id) ?? [], facOf: id => fac.get(id) };
}

/** the full records, once preloaded (always, by the time any screen renders in the data center solution) */
export function scope(): ScopeData {
  if (!loaded) throw new Error('data center scope used before preloadScope() finished');
  return loaded;
}
export const scopeReady = (): boolean => loaded !== null;
