/* ── Unified device repository ─────────────────────────────
   One population, two views. data/physical.ts and data/archive.ts (Inventory)
   and data/discovery.ts (Discovery) are all built from masterDevices.json, so a
   device carries the same hostname, IP, serial, OEM, model and location id on
   every screen that lists it. The file is generated — see
   scripts/generate-synced-devices.mjs for how each ledger figure is reached. */
import raw from './masterDevices.json';
import type { NeClass, StockState, RecState, Source } from './ledger';

export type MasterRegion = 'North' | 'East' | 'West' | 'South';

/** a network element — the Inventory record, and (for the discovered ones) the Discovery primary */
export interface MasterNe {
  id: string; name: string; ip: string; ip2?: string; sn: string;
  oem: string; vendor: string; model: string; os: string;
  cls: NeClass; stock: StockState; s: Source; st: RecState; v: number | null;
  loc: string; city: string; state: string; region: MasterRegion;
  /* the archive's own fields — decommissioned elements only */
  why?: string; on?: string; by?: string; wo?: string; zombie?: boolean;
}
/** a routing engine, logical system or stack member Discovery identifies under an element */
export interface MasterSub { id: string; name: string; parent: number }
/** one polled address: an element's management IP, or the loopback of a dual-homed one */
export interface MasterTarget { ne: number; ip: string; ok: boolean; rk?: string; partial?: true; h: number; m: number }
export interface MasterState { st: string; c: string; region: MasterRegion; lat: number; lon: number }

export const MASTER_NE = raw.ne as unknown as MasterNe[];
export const MASTER_SUB = raw.sub as unknown as MasterSub[];
export const MASTER_TGT = raw.tgt as unknown as MasterTarget[];
export const MASTER_STATES = raw.states as unknown as MasterState[];

/** lookups the cross-checks and both products use */
export const masterByName = new Map(MASTER_NE.map(n => [n.name, n]));
export const masterByIp = new Map<string, MasterNe>(MASTER_NE.flatMap(n => (n.ip2 ? [[n.ip, n], [n.ip2, n]] : [[n.ip, n]]) as [string, MasterNe][]));
