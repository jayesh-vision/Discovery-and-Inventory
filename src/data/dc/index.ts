/* ── Data center inventory (copied from Datacenter-Ideation) ─────────────────
   The JSON beside this file is written by `npm run dc:sync` and checked by
   `npm run dc:check`; never edit it by hand. It is inventory only: what is
   installed, where, and how it is powered, cooled and cabled. Readings
   (utilisation, temperature, power draw) are not part of it.

   The files are large (devices ≈ 2 MB, modules ≈ 3 MB), so a screen asks for
   what it needs and Vite splits each into its own chunk. Counts that tab
   labels need on first paint come from the small manifest instead. */
import { useEffect, useState } from 'react';
import manifest from './manifest.json';

export type DcStatus = 'on-air' | 'in-progress' | 'planned' | 'failed';
export type DcRole = 'Router' | 'Switch' | 'DWDM' | 'Firewall' | 'Server' | 'Storage' | 'GPU';

export interface DcFeed { id: string; type: 'AC' | 'DC'; source: string; rating: string; loadKw: number; capacityKw: number; status: 'Normal' | 'Warning' | 'Alarm' }
export interface DcUps { id: string; name: string; capacityKw: number; loadPct: number; redundancy: 'N' | 'N+1' | '2N'; batteryMin: number; state: 'Online' | 'On battery' | 'Bypass' | 'Fault' }
export interface DcCoolingUnit { id: string; name: string; type: 'CRAH' | 'CRAC' | 'CDU'; zone: string; capacityKw: number; loadPct: number; supplyC: number; returnC: number; status: 'Operational' | 'Maintenance' | 'Failed' }
export interface DcSensor { id: string; zone: string; tempC: number; humidity: number; smoke: boolean; leak: boolean }
export interface DcCore { port: number; state: 'connected' | 'free' | 'direct'; strand?: string; neId?: string; inIf?: string; outPort?: number; outIf?: string }
export interface DcRack {
  id: string; name: string; dcId: string; floor: string; room: string; role: string; heightU: number; usedU: number;
  drawKw: number; budgetKw: number; ports: number; portsUsed: number; tempC: number;
  owner?: 'operator' | 'tenant'; tenantId?: string; contractedKw?: number; density?: 'ai'; liquid?: boolean;
}
export type DcGeo = 'in' | 'us';
export interface DcRoom { id: string; name: string; floor?: string; type: string; areaSqm?: number | null; rackRows?: number | null; containment?: string | null; cooling?: string | null }
export interface DcCollector { id: string; name: string; state: string; lastSeen: number; protocol?: string; domain?: string }
export interface DcFacility {
  /** which workbook / geography the site belongs to, and the currency its capex and opex are in */
  geo: DcGeo; currency: 'INR' | 'USD'; timezone?: string; businessModel?: string; itCapacityKw: number; roomList: DcRoom[]; collectors: DcCollector[];
  id: string; locationId: string; name: string; status: DcStatus; category: 'Central' | 'Regional' | 'Edge';
  regionId: string; circleId: string; zone: string; city: string; state: string; address: string; lat: number; lng: number;
  tier: 'Tier II' | 'Tier III' | 'Tier IV'; commissionedOn?: number;
  floors: { name: string; rooms: string[] }[];
  racks: DcRack[];
  ports: { cls: string; total: number; used: number }[];
  cabling: { cable: string; cores: number; ledger: DcCore[] };
  compute: { cpuCores: number; cpuUsed: number; memGb: number; memUsed: number; storageTb: number; storageUsed: number };
  power: {
    capacityKw: number; acKw: number; dcKw: number; peakKw: number; pue: number; feeds: DcFeed[]; split: { label: string; kw: number }[];
    dg: { kva: number; runtimeH: number; fuelPct: number; lastTest: number; result: 'Pass' | 'Fail' };
    battery: { volts: number; ah: number; runtimeH: number; lastTest: number }; ups: DcUps[];
  };
  cooling: { capacityKw: number; loadKw: number; redundancy: 'N' | 'N+1' | '2N'; units: DcCoolingUnit[]; sensors: DcSensor[] };
  capex: { approved: number; committed: number; spent: number; lines: { item: string; approved: number; committed: number }[] };
  opex: { monthly: number; drivers: { item: string; monthly: number }[] };
  risks: { id: string; domain: string; title: string; detail: string; severity: string; owner: string; opened: number }[];
  readiness: { step: string; done: boolean; note?: string }[];
}
/** a link between two devices, as the Links sheet of the backup holds it (+ state and utilisation from Datacenter-Ideation) */
export interface DcLink { id: string; p: 'LLDP' | 'OSPF' | 'ISIS' | 'BGP' | 'LSP'; a: string; ai: string; z: string; zi: string; dc: string; cap: number; role: string; st: string; util: number; cable?: string; strand?: string; ap?: string; zp?: string }
export interface DcService {
  id: string; type: string; cust: string; dc: string; ne: string; ifc: string; path: string[]; links: string[]; bw: number; status: string;
  sla: number; uptime: number; rev: number; crit: boolean; qty: number; unit: string; cur: 'INR' | 'USD'; start?: number
}
export interface DcCustomer { id: string; name: string; segment: string; city: string; state: string; plan: string; premium: boolean; am: string; geo: DcGeo; cur: 'INR' | 'USD'; revenue: number }
export interface DcDevice {
  id: string; dcId: string; name: string; role: DcRole; layer: 'core' | 'spine' | 'leaf' | 'access'; vendor: string; model: string; os: string;
  serial: string; ip: string; mac: string; rackId: string; u: number; uSize?: number; lifecycle: 'Ready' | 'Planned' | 'Maintenance' | 'Decommissioning' | 'Faulty';
  discovery: 'verified' | 'drifted' | 'not-discovered'; ndReason?: string; drift?: { attr: string; record: string; observed: string }[];
  duplicateSerialOf?: string; collector?: string; isPe: boolean; tenantId?: string;
}
export interface DcModule { slot: string; name: string; serial: string; state: 'OK' | 'Fault' | 'Empty' }
export type GpuHealth = 'healthy' | 'degraded' | 'failed';
export type GpuNodeState = 'in-job' | 'idle' | 'drained' | 'failed' | 'burn-in';
export interface DcGpu { idx: number; serial: string; memGb: number; tdpW: number; health: GpuHealth; sbe: number; dbe: number; retiredPages: number; remapPending: boolean; xid: { code: number; at: number; text: string } | null }
export interface DcGpuNode {
  neId: string; dcId: string; rackId: string; clusterId: string; model: string; vendor: string; server: string; state: GpuNodeState; jobId?: string;
  cooling: 'air' | 'liquid'; driver: string; firmware: string; powerKw: number; health: GpuHealth; rma?: string; note?: string;
  ib: { rail: number; state: 'up' | 'down' | 'flapping' }[]; gpus: DcGpu[];
}
export interface DcGpuCluster { id: string; name: string; dcId: string; room: string; scheduler: 'Kubernetes' | 'Slurm'; fabric: string; model: string; vendor: string; cooling: 'air' | 'liquid'; nodes: string[] }
export interface DcCdu { id: string; dcId: string; name: string; room: string; racks: string[]; capacityKw: number; loadKw: number; supplyC: number; returnC: number; flowLpm: number; flowNominal: number; pump: 'A' | 'B'; state: 'ok' | 'warn' | 'bad'; note?: string }
export interface DcGpuData { nodes: DcGpuNode[]; clusters: DcGpuCluster[]; cdus: DcCdu[]; cages: unknown[] }

/* ---------- counts (no loading needed) ---------- */
export const DC_COUNTS = manifest.counts as {
  datacenters: number; racks: number; devices: number; devicesByRole: Partial<Record<DcRole, number>>; ups: number; powerFeeds: number;
  coolingUnits: number; sensors: number; gpuServers: number; gpus: number; gpuClusters: number; cdus: number;
  links: number; linksByProtocol: Record<string, number>; services: number; servicesByType: Record<string, number>; customers: number;
};
/** ids of the data centers that have a facility record; a site page checks this before loading anything */
export const DC_IDS: ReadonlySet<string> = new Set((manifest as unknown as { datacenterIds: string[] }).datacenterIds);
export const DC_SOURCE = manifest.source as { repo: string; commit: string; model: string };

export const DC_FAULTY_IDS: ReadonlySet<string> = new Set([
  'MH-DC-001-GPU-009', 'MH-DC-001-GPU-015', 'MH-DC-001-GPU-062', 'MH-DC-001-GPU-100', 'MH-DC-002-GPU-052', 'UP-DC-005-GPU-019',
  'UP-DC-005-GPU-080', 'UP-DC-005-GPU-112', 'UP-DC-006-GPU-038', 'KA-DC-008-GPU-096', 'DL-DC-009-GPU-003', 'DL-DC-009-GPU-039',
  'MH-DC-001-IB-SPINE-01', 'MH-DC-001-IB-SPINE-02', 'MH-DC-001-IB-SPINE-03', 'MH-DC-002-CPU-0001', 'MH-DC-002-CPU-0002', 'MH-DC-002-STG-001',
  'VA-DC-001-GPU-032', 'VA-DC-002-GPU-003', 'VA-DC-002-GPU-039', 'VA-DC-002-GPU-061', 'VA-DC-003-GPU-013', 'VA-DC-004-GPU-019',
  'VA-DC-004-GPU-034', 'VA-DC-004-GPU-036', 'TX-DC-005-GPU-009', 'TX-DC-006-GPU-022', 'TX-DC-006-GPU-081', 'TX-DC-007-GPU-028',
  'VA-DC-001-IB-SPINE-01', 'VA-DC-001-IB-SPINE-02', 'VA-DC-001-IB-SPINE-03', 'VA-DC-002-CPU-0001', 'VA-DC-002-CPU-0002', 'VA-DC-002-STG-001'
]);

export const DC_MAINTENANCE_IDS: ReadonlySet<string> = new Set([
  'MH-DC-001-GPU-035', 'MH-DC-002-GPU-002', 'MH-DC-002-GPU-009', 'MH-DC-002-GPU-064', 'MH-DC-003-GPU-043', 'MH-DC-003-GPU-060',
  'MH-DC-004-GPU-007', 'MH-DC-004-GPU-017', 'UP-DC-005-GPU-071', 'UP-DC-005-GPU-076', 'UP-DC-005-GPU-082', 'UP-DC-006-GPU-002',
  'UP-DC-006-GPU-029', 'UP-DC-006-GPU-032', 'MH-DC-001-IB-SPINE-04', 'MH-DC-001-IB-SPINE-05', 'MH-DC-001-ETH-SPINE-01', 'MH-DC-001-ETH-SPINE-02',
  'MH-DC-002-CPU-0003', 'MH-DC-002-CPU-0004', 'MH-DC-002-CPU-0005', 'MH-DC-002-CPU-0006', 'MH-DC-002-STG-002', 'MH-DC-002-STG-003',
  'VA-DC-001-GPU-017', 'VA-DC-001-GPU-046', 'VA-DC-001-GPU-091', 'VA-DC-002-GPU-040', 'VA-DC-004-GPU-033', 'VA-DC-004-GPU-039',
  'TX-DC-005-GPU-065', 'TX-DC-005-GPU-110', 'TX-DC-006-GPU-024', 'TX-DC-007-GPU-050', 'CA-DC-008-GPU-012', 'CA-DC-008-GPU-018',
  'CA-DC-008-GPU-048', 'CA-DC-008-GPU-063', 'VA-DC-001-IB-SPINE-04', 'VA-DC-001-IB-SPINE-06', 'VA-DC-001-ETH-SPINE-01', 'VA-DC-001-ETH-SPINE-02',
  'VA-DC-002-CPU-0003', 'VA-DC-002-CPU-0004', 'VA-DC-002-CPU-0005', 'VA-DC-002-CPU-0006', 'VA-DC-002-STG-002', 'VA-DC-002-STG-003'
]);

/* ---------- lazy loading ---------- */
const once = <T,>(load: () => Promise<T>) => { let p: Promise<T> | null = null; return () => (p ??= load()); };
export const loadFacilities = once(() => import('./datacenters.json').then(m => m.default as unknown as DcFacility[]));
export const loadDevices = once(() => import('./devices.json').then(m => {
  const devs = m.default as unknown as DcDevice[];
  return devs.map(d => {
    if (DC_FAULTY_IDS.has(d.id)) return { ...d, lifecycle: 'Faulty' as const };
    if (DC_MAINTENANCE_IDS.has(d.id)) return { ...d, lifecycle: 'Maintenance' as const };
    return d;
  });
}));
export const loadGpu = once(() => import('./gpu.json').then(m => m.default as unknown as DcGpuData));
export const loadLinks = once(() => import('./links.json').then(m => m.default as unknown as DcLink[]));
export const loadServices = once(() => import('./services.json').then(m => m.default as unknown as DcService[]));
export const loadCustomers = once(() => import('./customers.json').then(m => m.default as unknown as DcCustomer[]));
export const loadModules = once(() => import('./modules.json').then(m => new Map((m.default as unknown as { id: string; modules: DcModule[] }[]).map(x => [x.id, x.modules]))));

/** null while loading */
export function useLoaded<T>(load: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => { let live = true; void load().then(x => { if (live) setV(x); }); return () => { live = false; }; }, [load]);
  return v;
}

/* ---------- small helpers ---------- */
export const dcRack = (id: string) => id.replace(/^.*-(RACK-)/, '$1');          // KA-DC-008-RACK-S → RACK-S
export const dcShort = (id: string, dcId: string) => id.startsWith(dcId + '-') ? id.slice(dcId.length + 1) : id;
export const DC_ROLE_BY_TAB = { router: 'Router', switch: 'Switch', server: 'Server', dwdm: 'DWDM', firewall: 'Firewall', storage: 'Storage', gpu: 'GPU' } as const;
export type DcTab = keyof typeof DC_ROLE_BY_TAB;
import summaryJson from './summary.json';
const sRaw = summaryJson as unknown as { datacenters?: { geo: string; byRole: Partial<Record<DcRole, number>> }[]; Datacenters?: { geo: string; byRole: Partial<Record<DcRole, number>> }[] };
const summaryDcs = sRaw.datacenters ?? sRaw.Datacenters ?? [];
export const dcTabCount = (tab: DcTab, geo?: DcGeo | null): number => {
  const role = DC_ROLE_BY_TAB[tab];
  if (!geo) return DC_COUNTS.devicesByRole[role] ?? 0;
  return summaryDcs.filter(d => d.geo === geo).reduce((a, d) => a + (d.byRole[role] ?? 0), 0);
};

export const GPU_STATE: Record<GpuNodeState, [string, 'success' | 'neutral' | 'warning' | 'error' | 'info']> = {
  'in-job': ['In a job', 'success'], idle: ['Idle', 'neutral'], drained: ['Drained', 'warning'], failed: ['Failed', 'error'], 'burn-in': ['Burn-in', 'info']
};
