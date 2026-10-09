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
export interface DcFacility {
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
}
export interface DcDevice {
  id: string; dcId: string; name: string; role: DcRole; layer: 'core' | 'spine' | 'leaf' | 'access'; vendor: string; model: string; os: string;
  serial: string; ip: string; mac: string; rackId: string; u: number; uSize?: number; lifecycle: 'Ready' | 'Planned' | 'Maintenance' | 'Decommissioning';
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
  datacenters: number; racks: number; devices: number; devicesByRole: Record<DcRole, number>; ups: number; powerFeeds: number;
  coolingUnits: number; sensors: number; gpuServers: number; gpus: number; gpuClusters: number; cdus: number;
};
/** ids of the data centers that have a facility record; a site page checks this before loading anything */
export const DC_IDS: ReadonlySet<string> = new Set((manifest as unknown as { datacenterIds: string[] }).datacenterIds);
export const DC_SOURCE = manifest.source as { repo: string; commit: string; model: string };

/* ---------- lazy loading ---------- */
const once = <T,>(load: () => Promise<T>) => { let p: Promise<T> | null = null; return () => (p ??= load()); };
export const loadFacilities = once(() => import('./datacenters.json').then(m => m.default as unknown as DcFacility[]));
export const loadDevices = once(() => import('./devices.json').then(m => m.default as unknown as DcDevice[]));
export const loadGpu = once(() => import('./gpu.json').then(m => m.default as unknown as DcGpuData));
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
export const dcTabCount = (tab: DcTab): number => DC_COUNTS.devicesByRole[DC_ROLE_BY_TAB[tab]] ?? 0;

export const GPU_STATE: Record<GpuNodeState, [string, 'success' | 'neutral' | 'warning' | 'error' | 'info']> = {
  'in-job': ['In a job', 'success'], idle: ['Idle', 'neutral'], drained: ['Drained', 'warning'], failed: ['Failed', 'error'], 'burn-in': ['Burn-in', 'info']
};
