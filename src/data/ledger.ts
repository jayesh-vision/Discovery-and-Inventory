/* ── Inventory ledger ─────────────────────────────────────
   Every count on every screen comes from here. Sample rows are samples;
   nothing derives a total from an array length. */

export const IL = {
  locations: 1754, central: 118, regional: 342, edge: 1294,
  ne: 2703, discovered: 2379, links: 7846, services: 2457, vnf: 28, inactive: 412, reports: 22
} as const;

export const EST = {
  ports:      { total: 48216, used: 31894, free: 16322 },
  compliance: { compliant: 1612, behind: 807, unknown: 240 },
  eol:        { past: 118, within12: 341 },
  spares:     { instore: 34, rma: 41, intransit: 12 }
} as const;

export type NeClass = 'router' | 'switch' | 'server' | 'dwdm' | 'enodeb' | 'gnodeb';
export type StockState = 'planned' | 'instore' | 'deployed' | 'faulty' | 'decomm';
export type ActiveStock = Exclude<StockState, 'decomm'>;

export const NE_CLASSES: NeClass[] = ['router', 'switch', 'server', 'dwdm', 'enodeb', 'gnodeb'];
export const ACTIVE_STATES: ActiveStock[] = ['planned', 'instore', 'deployed', 'faulty'];

export interface ClassMeta { k: NeClass; n: string; c: number; disc: number }
export const PHY_TABS: ClassMeta[] = [
  { k: 'router', n: 'Router', c: 2148, disc: 2114 }, { k: 'switch', n: 'Switch', c: 349, disc: 283 },
  { k: 'server', n: 'Server', c: 96,  disc: 0 },     { k: 'dwdm',   n: 'DWDM',   c: 78,  disc: 0 },
  { k: 'enodeb', n: 'eNodeB', c: 18,  disc: 0 },     { k: 'gnodeb', n: 'gNodeB', c: 14,  disc: 0 }
];
export type InactiveTab = NeClass | 'l2vpn' | 'l3vpn';
export const INACTIVE_TABS: { k: InactiveTab; n: string }[] = [
  { k: 'router', n: 'Router' }, { k: 'switch', n: 'Switch' }, { k: 'server', n: 'Server' },
  { k: 'dwdm', n: 'DWDM' }, { k: 'enodeb', n: 'eNodeB' }, { k: 'gnodeb', n: 'gNodeB' },
  { k: 'l2vpn', n: 'L2VPN service' }, { k: 'l3vpn', n: 'L3VPN service' }
];
export const classMeta = (k: NeClass): ClassMeta => PHY_TABS.find(x => x.k === k)!;

/* Classes that have a Node view destination. Server has no node-level page —
   nothing to view — so it's the one class left out; every other class opens
   Node view, even where the page itself has no live assurance feed to show. */
export const NODE_VIEW_CLASSES: NeClass[] = ['router', 'switch', 'dwdm', 'enodeb'];
export const hasNodeView = (k: NeClass): boolean => NODE_VIEW_CLASSES.includes(k);

export type ChipTone = 'success' | 'info' | 'warning' | 'error' | 'neutral' | 'purple' | 'cyan' | 'orange' | 'pink';
export type ColorTone = 'sky' | 'cyan' | 'emerald' | 'amber' | 'slate' | 'red' | 'purple' | 'orange' | 'fuchsia' | 'gray';

export interface StockMeta { k: StockState; n: string; c: number; chip: ChipTone; tone: ColorTone }
export const STOCK_ST: StockMeta[] = [
  { k: 'planned',  n: 'Planned',        c: 92,   chip: 'info',    tone: 'sky' },
  { k: 'instore',  n: 'In store',       c: 34,   chip: 'cyan',    tone: 'cyan' },
  { k: 'deployed', n: 'Deployed',       c: 2503, chip: 'success', tone: 'emerald' },
  { k: 'faulty',   n: 'Faulty / RMA',   c: 74,   chip: 'warning', tone: 'amber' },
  { k: 'decomm',   n: 'Decommissioned', c: 412,  chip: 'neutral', tone: 'slate' }
];
export const stockMeta = (k: StockState): StockMeta => STOCK_ST.find(s => s.k === k)!;

/* class × stock cross-tab: a class total and a stock total are two views of one population */
export const PHY_MATRIX: Record<NeClass, Record<StockState, number>> = {
  router: { planned: 58, instore: 21, deployed: 2017, faulty: 52, decomm: 289 },
  switch: { planned: 14, instore:  8, deployed:  315, faulty: 12, decomm:  61 },
  server: { planned:  6, instore:  3, deployed:   82, faulty:  5, decomm:  34 },
  dwdm:   { planned:  8, instore:  2, deployed:   65, faulty:  3, decomm:  19 },
  enodeb: { planned:  3, instore:  0, deployed:   14, faulty:  1, decomm:   5 },
  gnodeb: { planned:  3, instore:  0, deployed:   10, faulty:  1, decomm:   4 }
};
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
})();

/* source of a record and freshness of its last verification — the bridge from Discovery */
export type Source = 'd' | 'p' | 'm' | 'e';
export const SRC: Record<Source, [string, ChipTone]> = {
  d: ['Discovered', 'success'], p: ['Planned · CIQ', 'info'], m: ['Manual', 'neutral'], e: ['EMS', 'purple']
};
export type RecState = 'ok' | 'drift' | 'stale' | 'miss' | 'none';
export const RSTATE: Record<RecState, [string, ChipTone]> = {
  ok: ['Verified', 'success'], drift: ['Drifted', 'warning'], stale: ['Stale', 'orange'],
  miss: ['Missing', 'error'], none: ['Not discovered', 'neutral']
};

export const fmt = (v: number): string => v.toLocaleString('en-IN');
