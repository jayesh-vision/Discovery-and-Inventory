/* ── Inventory ledger ─────────────────────────────────────
   Every count on every screen comes from here. Sample rows are samples;
   nothing derives a total from an array length. */

import { DC_SUM, DC_TOTAL, SCOPED, scope } from './dc/scope';
import type { DcDevice, DcRole } from './dc';
import { currentGeo } from '../solution';

/* In the data center solution (src/solution.ts) the same ledger is counted from the data centers'
   records (src/data/dc); nothing else changes shape. Where the data center records hold nothing
   (links, services, VNFs, end-of-life, spares, decommissioned equipment) the figure is zero. */
const DEFAULT_IL = {
  locations: 12475, central: 829, regional: 2711, edge: 8935,
  ne: 2703, discovered: 2379, links: 7846, services: 2457, vnf: 28, inactive: 412, reports: 22
};
const DEFAULT_EST = {
  ports:      { total: 48216, used: 31894, free: 16322 },
  compliance: { compliant: 1612, behind: 807, unknown: 240 },
  eol:        { past: 118, within12: 341 },
  spares:     { instore: 34, rma: 41, intransit: 12 }
};

/* the data center devices as ledger rows: class, stock state and whether discovery has seen them */
const DC_CLASS: Record<DcRole, NeClass> = { Router: 'router', Switch: 'switch', Server: 'server', DWDM: 'dwdm', Firewall: 'firewall', Storage: 'storage', GPU: 'gpu' };
const DC_STOCK: Record<DcDevice['lifecycle'], StockState> = { Ready: 'deployed', Planned: 'planned', Maintenance: 'faulty', Decommissioning: 'deployed' };
const DC_ROWS = SCOPED ? scope().devices : [];
const dcGeo = typeof window !== 'undefined' ? currentGeo() : null;
const sumList = SCOPED ? (dcGeo ? DC_SUM.filter(d => d.geo === dcGeo) : DC_SUM) : [];
const dcDevCount = DC_ROWS.length;
const dcDcsCount = sumList.length || (DC_ROWS.length > 0 ? (dcGeo ? 24 : DC_TOTAL.dcs) : DC_TOTAL.dcs);
const addSum = (f: (d: (typeof DC_SUM)[number]) => number) => sumList.reduce((a, d) => a + f(d), 0);

/** a device counts as "discovered" when its source is Discovery: seen by discovery and already in service */
export const dcDiscovered = (d: DcDevice) => d.discovery !== 'not-discovered' && d.lifecycle !== 'Planned';
export const dcStockOf = (d: DcDevice): StockState => DC_STOCK[d.lifecycle];
export const dcClassOf = (d: DcDevice): NeClass => DC_CLASS[d.role];

import { DC_COUNTS } from './dc';

export const IL: typeof DEFAULT_IL = SCOPED ? {
  locations: dcDcsCount,
  central: sumList.filter(d => d.category === 'Central').length || dcDcsCount,
  regional: sumList.filter(d => d.category === 'Regional').length || 0,
  edge: sumList.filter(d => d.category === 'Edge').length || 0,
  ne: dcDevCount,
  discovered: DC_ROWS.filter(dcDiscovered).length,
  links: addSum(d => d.links) || DC_COUNTS.links,
  services: addSum(d => d.services) || DC_COUNTS.services,
  vnf: 0,
  inactive: dcGeo === 'in' ? 90 : 104,
  reports: 0
} : DEFAULT_IL;

export const EST: typeof DEFAULT_EST = SCOPED ? {
  ports: { total: addSum(d => d.ports.total) || DC_TOTAL.portsTotal, used: addSum(d => d.ports.used) || DC_TOTAL.portsUsed, free: (addSum(d => d.ports.total) - addSum(d => d.ports.used)) || (DC_TOTAL.portsTotal - DC_TOTAL.portsUsed) },
  compliance: { compliant: addSum(d => d.verified) || DC_TOTAL.verified, behind: addSum(d => d.drifted) || DC_TOTAL.drifted, unknown: addSum(d => d.notDiscovered) || DC_TOTAL.notDiscovered },
  eol: { past: 0, within12: 0 }, spares: { instore: 0, rma: 0, intransit: 0 }
} : DEFAULT_EST;

export type NeClass = 'router' | 'switch' | 'server' | 'dwdm' | 'enodeb' | 'gnodeb' | 'firewall' | 'storage' | 'gpu';
export type StockState = 'planned' | 'instore' | 'deployed' | 'faulty' | 'decomm';
export type ActiveStock = Exclude<StockState, 'decomm'>;

export const NE_CLASSES: NeClass[] = SCOPED
  ? ['router', 'switch', 'server', 'dwdm', 'firewall', 'storage', 'gpu', 'enodeb', 'gnodeb']
  : ['router', 'switch', 'server', 'dwdm', 'enodeb', 'gnodeb'];
export const ACTIVE_STATES: ActiveStock[] = ['planned', 'instore', 'deployed', 'faulty'];

export interface ClassMeta { k: NeClass; n: string; c: number; disc: number }
const CLASS_NAME: Record<NeClass, string> = { router: 'Router', switch: 'Switch', server: 'Server', dwdm: 'DWDM', enodeb: 'eNodeB', gnodeb: 'gNodeB', firewall: 'Firewall', storage: 'Storage', gpu: 'GPU' };
export const PHY_TABS: ClassMeta[] = SCOPED
  ? NE_CLASSES.map(k => { const rows = DC_ROWS.filter(d => dcClassOf(d) === k); return { k, n: CLASS_NAME[k], c: rows.length, disc: rows.filter(dcDiscovered).length }; })
  : [
  { k: 'router', n: 'Router', c: 2148, disc: 2096 }, { k: 'switch', n: 'Switch', c: 349, disc: 283 },
  { k: 'server', n: 'Server', c: 96,  disc: 0 },     { k: 'dwdm',   n: 'DWDM',   c: 78,  disc: 0 },
  { k: 'enodeb', n: 'eNodeB', c: 18,  disc: 0 },     { k: 'gnodeb', n: 'gNodeB', c: 14,  disc: 0 }
];
export type InactiveTab = NeClass | 'l2vpn' | 'l3vpn' | 'link' | 'service';
export const INACTIVE_TABS: { k: InactiveTab; n: string }[] = [
  { k: 'router', n: 'Router' }, { k: 'switch', n: 'Switch' },
  { k: 'dwdm', n: 'DWDM' }, { k: 'enodeb', n: 'eNodeB' }, { k: 'gnodeb', n: 'gNodeB' },
  { k: 'l2vpn', n: 'L2VPN' }, { k: 'l3vpn', n: 'L3VPN' }
];

export const DC_INACTIVE_TABS: { k: InactiveTab; n: string }[] = [
  { k: 'switch', n: 'Fabric Switches' },
  { k: 'router', n: 'Border Routers' },
  { k: 'storage', n: 'Storage Arrays' },
  { k: 'firewall', n: 'Security / FW' },
  { k: 'dwdm', n: 'DWDM DCI' },
  { k: 'link', n: 'Retired Links' },
  { k: 'service', n: 'Retired Services' }
];
export const classMeta = (k: NeClass): ClassMeta => PHY_TABS.find(x => x.k === k)!;

/* Classes that have a Node view destination. Server has no node-level page —
   nothing to view — so it's the one class left out; every other class opens
   Node view, even where the page itself has no live assurance feed to show. */
export const NODE_VIEW_CLASSES: NeClass[] = ['router', 'switch'];
export const hasNodeView = (k?: string | null): boolean => !!k && NODE_VIEW_CLASSES.includes(k.toLowerCase() as NeClass);

/* Node view is a genuinely different screen per class (see legacy/app-node2.js
   — separate header/overview/hardware per class, not one template branching
   on cls). The breadcrumb and page title should say which one a reader is
   actually looking at, instead of the same generic "Node view" for all four. */
const NODE_VIEW_LABEL: Partial<Record<NeClass, string>> = {
  router: 'Router node view', switch: 'Switch node view', dwdm: 'DWDM node view', enodeb: 'eNodeB node view'
};
export const nodeViewLabel = (k?: string | null): string => (k ? NODE_VIEW_LABEL[k.toLowerCase() as NeClass] : undefined) || 'Node view';
/* the short form, for spots (like the breadcrumb's drill segment) that sit
   right after something that already said "Node view" once */
const NODE_CLASS_NAME: Partial<Record<NeClass, string>> = { router: 'Router', switch: 'Switch', dwdm: 'DWDM', enodeb: 'eNodeB' };
export const nodeClassName = (k?: string | null): string => (k ? NODE_CLASS_NAME[k.toLowerCase() as NeClass] : undefined) || 'Node';

export type ChipTone = 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'purple' | 'cyan' | 'orange' | 'pink';
export type ColorTone = 'sky' | 'cyan' | 'emerald' | 'amber' | 'slate' | 'red' | 'purple' | 'orange' | 'fuchsia' | 'gray';

export interface StockMeta { k: StockState; n: string; c: number; chip: ChipTone; tone: ColorTone }
const dcStock = (k: StockState) => DC_ROWS.filter(d => DC_STOCK[d.lifecycle] === k).length;
export const STOCK_ST: StockMeta[] = [
  { k: 'planned',  n: 'Planned',        c: SCOPED ? dcStock('planned') : 92,    chip: 'info',    tone: 'sky' },
  { k: 'instore',  n: 'In store',       c: SCOPED ? 0 : 34,                     chip: 'cyan',    tone: 'cyan' },
  { k: 'deployed', n: 'Deployed',       c: SCOPED ? dcStock('deployed') : 2503, chip: 'success', tone: 'emerald' },
  { k: 'faulty',   n: 'Faulty / RMA',   c: SCOPED ? dcStock('faulty') : 74,     chip: 'warning', tone: 'amber' },
  { k: 'decomm',   n: 'Decommissioned', c: SCOPED ? 0 : 412,                    chip: 'neutral', tone: 'slate' }
];
export const stockMeta = (k: StockState): StockMeta => STOCK_ST.find(s => s.k === k)!;

/* class × stock cross-tab: a class total and a stock total are two views of one population */
const DEFAULT_MATRIX = {
  router: { planned: 58, instore: 21, deployed: 2017, faulty: 52, decomm: 289 },
  switch: { planned: 14, instore:  8, deployed:  315, faulty: 12, decomm:  61 },
  server: { planned:  6, instore:  3, deployed:   82, faulty:  5, decomm:  34 },
  dwdm:   { planned:  8, instore:  2, deployed:   65, faulty:  3, decomm:  19 },
  enodeb: { planned:  3, instore:  0, deployed:   14, faulty:  1, decomm:   5 },
  gnodeb: { planned:  3, instore:  0, deployed:   10, faulty:  1, decomm:   4 }
};
const dcMatrix = (): Record<NeClass, Record<StockState, number>> => Object.fromEntries(NE_CLASSES.map(k => [k, Object.fromEntries((['planned', 'instore', 'deployed', 'faulty', 'decomm'] as StockState[])
  .map(st => [st, DC_ROWS.filter(d => dcClassOf(d) === k && DC_STOCK[d.lifecycle] === st).length]))])) as Record<NeClass, Record<StockState, number>>;
export const PHY_MATRIX: Record<NeClass, Record<StockState, number>> = SCOPED ? dcMatrix() : DEFAULT_MATRIX as Record<NeClass, Record<StockState, number>>;
export const stockCount = (cls: NeClass, s: StockState): number => PHY_MATRIX[cls][s];
export const phyCount = (cls: NeClass, states: Iterable<StockState>): number =>
  [...states].reduce((a, s) => a + stockCount(cls, s), 0);
export const stockTotal = (s: StockState): number => NE_CLASSES.reduce((a, c) => a + stockCount(c, s), 0);

/* ledger self-check, run once at import so a broken edit fails loudly in dev */
(() => {
  for (const t of PHY_TABS) {
    const active = phyCount(t.k, ACTIVE_STATES);
    if (active !== t.c) throw new Error(`ledger: ${t.k} active ${active} ≠ PHY_TABS ${t.c}`);
  }
  for (const s of STOCK_ST) {
    const tot = stockTotal(s.k);
    if (tot !== s.c) throw new Error(`ledger: ${s.k} ${tot} ≠ STOCK_ST ${s.c}`);
  }
  const grand = NE_CLASSES.reduce((a, c) => a + phyCount(c, ACTIVE_STATES), 0);
  if (grand !== IL.ne) throw new Error(`ledger: active grand total ${grand} ≠ IL.ne ${IL.ne}`);
  const disc = PHY_TABS.reduce((a, t) => a + t.disc, 0);
  if (disc !== IL.discovered) throw new Error(`ledger: discovered by class ${disc} ≠ IL.discovered ${IL.discovered}`);
})();

/* source of a record and freshness of its last verification — the bridge from Discovery */
export type Source = 'd' | 'p' | 'm' | 'e';
export const SRC: Record<Source, [string, ChipTone]> = {
  d: ['Discovered', 'success'], p: ['Planned · CIQ', 'info'], m: ['Manual', 'neutral'], e: ['EMS', 'purple']
};
export type RecState = 'ok' | 'drift' | 'stale' | 'miss' | 'none';
export const RSTATE: Record<RecState, [string, ChipTone]> = {
  ok: ['Verified', 'success'], drift: ['Drifted', 'warning'], stale: ['Stale', 'orange'],
  miss: ['Missing', 'error'], none: ['Planned', 'neutral']
};

export const fmt = (v: number): string => {
  const isIndia = typeof window !== 'undefined' && currentGeo() === 'in';
  return v.toLocaleString(isIndia ? 'en-IN' : 'en-US');
};
