/* ── Numbers on the Location dashboard ────────────────────────────────────────
   The KPI cards, the "Inventory across the estate" cards and the Coverage-by-circle table.
   Default: the estate's own figures, exactly as the dashboard has always shown them.
   Data center solution: the same figures counted from the data centers' records
   (src/data/dc), with a zero wherever a thing has no data center records (PoPs, sites, links,
   services, fibre). Same shapes, same screen. */
import { DC_SUM, DC_TOTAL, SCOPED, type DcSum } from './dc/scope';
import { DC_COUNTS } from './dc';

export interface Split { total: number; live: number; build: number; plan: number; fail: number }
export interface InvCardData {
  total: number; sub: string;
  segs: { w: number; color: string; title: string }[];
  chips: { label: string; n: number; to: string; title: string }[];
}
export interface CoverageCircle {
  code: string; name: string; dc: number; pop: number; sites: number; total: number; onAirPct: number; failed: number;
  severity: 'blocked' | 'delayed' | 'risk' | 'clean';
  /** what the rollout detail is counted over: the circle's sites by default, its data centers in the data center solution */
  base?: number; dcIds?: string[];
}
export interface LocStats {
  all: Split; dc: Split; pop: Split; site: Split;
  active: InvCardData; logical: InvCardData; passive: InvCardData;
  circles: CoverageCircle[];
}

const DEFAULT_CIRCLES: CoverageCircle[] = [
  { code: 'PB', name: 'Punjab', dc: 81, pop: 282, sites: 934, total: 1297, onAirPct: 75, failed: 16, severity: 'delayed' },
  { code: 'TN', name: 'Tamil Nadu', dc: 62, pop: 176, sites: 646, total: 884, onAirPct: 74, failed: 12, severity: 'blocked' },
  { code: 'HP', name: 'Himachal Pradesh', dc: 45, pop: 152, sites: 533, total: 730, onAirPct: 76, failed: 7, severity: 'delayed' },
  { code: 'UP', name: 'Uttar Pradesh', dc: 47, pop: 137, sites: 370, total: 554, onAirPct: 75, failed: 11, severity: 'blocked' },
  { code: 'KL', name: 'Kerala', dc: 33, pop: 119, sites: 375, total: 527, onAirPct: 76, failed: 6, severity: 'delayed' },
  { code: 'RJ', name: 'Rajasthan', dc: 32, pop: 114, sites: 368, total: 514, onAirPct: 75, failed: 6, severity: 'delayed' },
  { code: 'MP', name: 'Madhya Pradesh', dc: 33, pop: 114, sites: 361, total: 508, onAirPct: 74, failed: 6, severity: 'delayed' },
  { code: 'HR', name: 'Haryana', dc: 30, pop: 102, sites: 325, total: 457, onAirPct: 74, failed: 6, severity: 'blocked' },
  { code: 'WB', name: 'West Bengal', dc: 31, pop: 95, sites: 315, total: 441, onAirPct: 74, failed: 5, severity: 'blocked' },
  { code: 'CG', name: 'Chhattisgarh', dc: 27, pop: 92, sites: 310, total: 429, onAirPct: 73, failed: 5, severity: 'delayed' },
  { code: 'UK', name: 'Uttarakhand', dc: 26, pop: 89, sites: 298, total: 413, onAirPct: 75, failed: 4, severity: 'delayed' },
  { code: 'NL', name: 'Nagaland', dc: 25, pop: 86, sites: 294, total: 405, onAirPct: 74, failed: 5, severity: 'delayed' },
  { code: 'MN', name: 'Manipur', dc: 24, pop: 85, sites: 290, total: 399, onAirPct: 73, failed: 5, severity: 'delayed' },
  { code: 'BR', name: 'Bihar', dc: 25, pop: 81, sites: 290, total: 396, onAirPct: 71, failed: 6, severity: 'blocked' },
  { code: 'TR', name: 'Tripura', dc: 24, pop: 84, sites: 288, total: 396, onAirPct: 75, failed: 4, severity: 'delayed' },
  { code: 'ML', name: 'Meghalaya', dc: 24, pop: 83, sites: 286, total: 393, onAirPct: 75, failed: 4, severity: 'delayed' },
  { code: 'MZ', name: 'Mizoram', dc: 24, pop: 83, sites: 286, total: 393, onAirPct: 74, failed: 4, severity: 'delayed' },
  { code: 'JH', name: 'Jharkhand', dc: 26, pop: 80, sites: 283, total: 389, onAirPct: 75, failed: 4, severity: 'delayed' },
  { code: 'GA', name: 'Goa', dc: 23, pop: 81, sites: 282, total: 386, onAirPct: 75, failed: 4, severity: 'delayed' },
  { code: 'AR', name: 'Arunachal Pradesh', dc: 23, pop: 81, sites: 282, total: 386, onAirPct: 75, failed: 4, severity: 'delayed' },
  { code: 'OR', name: 'Odisha', dc: 27, pop: 78, sites: 278, total: 383, onAirPct: 72, failed: 4, severity: 'delayed' },
  { code: 'AS', name: 'Assam', dc: 26, pop: 78, sites: 275, total: 379, onAirPct: 69, failed: 5, severity: 'blocked' },
  { code: 'MH', name: 'Maharashtra', dc: 28, pop: 86, sites: 220, total: 334, onAirPct: 70, failed: 6, severity: 'blocked' },
  { code: 'SK', name: 'Sikkim', dc: 20, pop: 59, sites: 230, total: 309, onAirPct: 78, failed: 2, severity: 'risk' },
  { code: 'KA', name: 'Karnataka', dc: 26, pop: 75, sites: 198, total: 299, onAirPct: 76, failed: 4, severity: 'blocked' },
  { code: 'GJ', name: 'Gujarat', dc: 20, pop: 63, sites: 174, total: 257, onAirPct: 69, failed: 1, severity: 'blocked' },
  { code: 'AP', name: 'Andhra Pradesh', dc: 16, pop: 50, sites: 132, total: 198, onAirPct: 67, failed: 1, severity: 'blocked' },
  { code: 'TS', name: 'Telangana', dc: 1, pop: 6, sites: 12, total: 19, onAirPct: 84, failed: 1, severity: 'risk' }
];

const DEFAULT: LocStats = {
  all: { total: 12475, live: 9213, build: 0, plan: 0, fail: 0 },
  dc: { total: 829, live: 718, build: 73, plan: 35, fail: 3 },
  pop: { total: 2711, live: 2120, build: 385, plan: 175, fail: 31 },
  site: { total: 8935, live: 6375, build: 1390, plan: 1060, fail: 110 },
  active: {
    total: 3421, sub: 'Physical elements across the estate · 3,567 verified on the network',
    segs: [{ w: 86, color: '#0284c7', title: 'Router: 2,943' }, { w: 14, color: '#0ea5e9', title: 'Switch: 478' }],
    chips: [{ label: 'Router', n: 2943, to: '/inventory/physical?tab=router', title: 'View Routers in inventory' },
      { label: 'Switch', n: 478, to: '/inventory/physical?tab=switch', title: 'View Switches in inventory' }]
  },
  logical: {
    total: 9222, sub: '6,705 links and 2,517 provisioned services · plus 428 VNFs',
    segs: [{ w: 40, color: '#a855f7', title: 'LLDP: 3,015' }, { w: 22, color: '#0284c7', title: 'OSPF: 1,675' }, { w: 13, color: '#06b6d4', title: 'BGP: 1,006' },
      { w: 18, color: '#0d9488', title: 'L3VPN: 1,865' }, { w: 7, color: '#7c3aed', title: 'L2VPN: 661' }],
    chips: [{ label: 'LLDP', n: 3015, to: '/inventory/links?tab=lldp', title: 'View LLDP links' }, { label: 'OSPF', n: 1675, to: '/inventory/links?tab=ospf', title: 'View OSPF links' },
      { label: 'L3VPN', n: 1865, to: '/inventory/services?tab=l3vpn', title: 'View L3VPN services' }, { label: 'L2VPN', n: 661, to: '/inventory/services?tab=l2vpn', title: 'View L2VPN services' }]
  },
  passive: {
    total: 1945, sub: 'Physical plant across 7 categories',
    segs: [{ w: 35, color: '#f59e0b', title: 'ODF: 680' }, { w: 30, color: '#64748b', title: 'Racks: 584' }, { w: 20, color: '#06b6d4', title: 'Fiber spans: 389' }, { w: 15, color: '#a855f7', title: 'Splice closures: 292' }],
    chips: [{ label: 'ODF', n: 680, to: '/inventory/passive?tab=odf', title: 'View ODF in passive infrastructure' },
      { label: 'Racks', n: 584, to: '/inventory/passive?tab=rack', title: 'View Racks in passive infrastructure' },
      { label: 'Fiber', n: 389, to: '/inventory/passive?tab=fiber', title: 'View Fiber spans in passive infrastructure' }]
  },
  circles: DEFAULT_CIRCLES
};

/* ── the data center solution ── */
const split = (rows: DcSum[]): Split => ({
  total: rows.length, live: rows.filter(d => d.status === 'on-air').length, build: rows.filter(d => d.status === 'in-progress').length,
  plan: rows.filter(d => d.status === 'planned').length, fail: rows.filter(d => d.status === 'failed').length
});
const en = (n: number) => n.toLocaleString('en-US');
const share = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);
const palette = ['#0284c7', '#0ea5e9', '#06b6d4', '#0d9488', '#a855f7', '#7c3aed', '#f59e0b'];

function scopedStats(): LocStats {
  const dc = split(DC_SUM);
  const T = DC_TOTAL;
  const roles: [string, string, string][] = [['Router', 'router', 'Routers'], ['Switch', 'switch', 'Switches'], ['Server', 'server', 'Servers'], ['DWDM', 'dwdm', 'DWDM'],
    ['Firewall', 'firewall', 'Firewalls'], ['Storage', 'storage', 'Storage arrays'], ['GPU', 'gpu', 'GPU servers']];
  const counts = roles.map(([r, k, plural]) => ({ label: r, k, plural, n: T.byRole(r as never) })).filter(x => x.n > 0);
  const active = counts.reduce((a, x) => a + x.n, 0);
  const odf = DC_SUM.filter(d => d.odf.total > 0).length;   // one optical frame per data center
  const passive = odf + T.racks;
  /* a state code alone is not unique across the two countries (Oregon / Odisha, Georgia / Goa), so the USA's carry a prefix */
  const circles = new Map<string, DcSum[]>();
  const circleKey = (d: DcSum) => (d.geo === 'us' ? `US-${d.circleId}` : d.circleId);
  for (const d of DC_SUM) (circles.get(circleKey(d)) ?? circles.set(circleKey(d), []).get(circleKey(d))!).push(d);
  /* links and services, from the Links and Services sheets of the backups */
  const links = DC_SUM.reduce((a, d) => a + d.links, 0), services = DC_SUM.reduce((a, d) => a + d.services, 0);
  const LINK_TABS: [string, string][] = [['LLDP', 'lldp'], ['BGP', 'bgp'], ['OSPF', 'ospf'], ['ISIS', 'isis'], ['LSP', 'lsp']];
  const SVC_TABS: [string, string][] = [['On-demand GPUs', 'gpu'], ['CPU instances', 'cpu'], ['Storage volume', 'storage'], ['Reserved cluster', 'reserved']];
  const parts = [...LINK_TABS.map(([p, k]) => ({ label: p, n: DC_COUNTS.linksByProtocol[p] ?? 0, to: `/inventory/links?tab=${k}`, title: `View ${p} links` })),
    ...SVC_TABS.map(([t, k]) => ({ label: t, n: DC_COUNTS.servicesByType[t] ?? 0, to: `/inventory/services?tab=${k}`, title: `View ${t} services` }))].filter(x => x.n > 0);
  const lTotal = links + services;
  const logical: InvCardData = {
    total: lTotal, sub: `${en(links)} links and ${en(services)} customer services`,
    segs: parts.map((x, i) => ({ w: share(x.n, lTotal), color: palette[i % palette.length], title: `${x.label}: ${en(x.n)}` })),
    chips: parts
  };
  return {
    all: { ...dc },
    dc,
    pop: { total: 0, live: 0, build: 0, plan: 0, fail: 0 },
    site: { total: 0, live: 0, build: 0, plan: 0, fail: 0 },
    active: {
      total: active, sub: `Physical elements across the estate · ${en(T.verified)} verified on the network`,
      segs: counts.map((x, i) => ({ w: share(x.n, active), color: palette[i % palette.length], title: `${x.label}: ${en(x.n)}` })),
      chips: counts.map(x => ({ label: x.label, n: x.n, to: `/inventory/physical?tab=${x.k}`, title: `View ${x.plural} in inventory` }))
    },
    logical,
    passive: {
      total: passive, sub: 'Physical plant across 7 categories',
      segs: [{ w: share(odf, passive), color: '#f59e0b', title: `ODF: ${en(odf)}` }, { w: share(T.racks, passive), color: '#64748b', title: `Racks: ${en(T.racks)}` },
        { w: 0, color: '#06b6d4', title: 'Fiber spans: 0' }, { w: 0, color: '#a855f7', title: 'Splice closures: 0' }],
      chips: [{ ...DEFAULT.passive.chips[0], n: odf }, { ...DEFAULT.passive.chips[1], n: T.racks }, { ...DEFAULT.passive.chips[2], n: 0 }]
    },
    circles: [...circles.entries()].map(([code, ds]) => {
      const s = split(ds);
      const onAirPct = share(s.live, s.total);
      return { code, name: ds[0].state, dc: s.total, pop: 0, sites: 0, total: s.total, onAirPct, failed: s.fail,
        severity: s.fail > 0 ? 'blocked' : s.total - s.live > 0 ? 'delayed' : 'clean', base: s.total, dcIds: ds.map(d => d.id) } as CoverageCircle;
    }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  };
}

export const LOC_STATS: LocStats = SCOPED ? scopedStats() : DEFAULT;
