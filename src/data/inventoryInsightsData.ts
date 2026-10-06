export interface ParentLeaf {
  name: string;
  count: string;
  health: string;
  badgeBg: string;
  badgeFg: string;
  scope: string;
  covLabel: string;
  coverage: string;
  critical: number;
  high: number;
  color: string;
}

export interface ParentCategory {
  name: string;
  desc: string;
  count: string;
  delta: string;
  health: string;
  children: ParentLeaf[];
}

export interface PanelItem {
  name: string;
  count: string;
  w: string;
}

export interface PanelFact {
  name: string;
  value: string;
  color: string;
}

export interface PanelCategory {
  title: string;
  color: string;
  route: string;
  desc: string;
  items: PanelItem[];
  facts: PanelFact[];
}

export interface QualityRow {
  name: string;
  color: string;
  v1: string;
  c1: string;
  v2: string;
  c2: string;
  v3: string;
  c3: string;
  v4: string;
  c4: string;
  v5: string;
  c5: string;
}

export interface CrossLink {
  name: string;
  value: string;
  color: string;
}

export interface SiteRow {
  name: string;
  region: string;
  kind: string;
  active: string;
  passive: string;
  health: string;
  healthW: string;
  healthColor: string;
  issues: number;
  status: string;
  badgeBg: string;
  badgeFg: string;
}

export interface ServiceRow {
  name: string;
  count: string;
  path: string;
  color: string;
}

export interface ActivityRow {
  tag: string;
  what: string;
  who: string;
  when: string;
  tagBg: string;
  tagFg: string;
}

export interface EolRow {
  name: string;
  count: string;
  w: string;
  segs: { w: string; color: string }[];
}

export interface SparesRow {
  model: string;
  deployed: string;
  spares: string;
  ratio: string;
  color: string;
}

export const ACCENT = '#1C81EF';
export const GOOD = '#15803D';
export const WARN = '#B45309';
export const CRIT = '#B91C1C';
export const INFO = '#1C81EF';
export const PURP = '#6D28D9';
export const TEAL = '#0F766E';
export const GREY = '#64748B';

export const ACT = '#1C81EF';
export const PHY = '#0F766E';
export const LOG = '#B45309';
export const PAS = '#0F766E';
export const VIR = '#6D28D9';

export const hc = (n: number) => (n >= 90 ? GOOD : n >= 80 ? WARN : CRIT);
export const ic = (n: number) => (n <= 1 ? GOOD : n <= 2 ? WARN : CRIT);
export const sevColor = (s: string) => (s === 'Critical' ? CRIT : s === 'High' ? WARN : s === 'Medium' ? INFO : '#475569');
export const sevBg = (s: string) => (s === 'Critical' ? '#fee2e2' : s === 'High' ? '#fef3c7' : s === 'Medium' ? '#eff6ff' : '#f1f5f9');
export const statusBg = (s: string) => (s === 'Healthy' ? '#dcfce7' : s === 'Watch' ? '#fef3c7' : '#fee2e2');
export const statusFg = (s: string) => (s === 'Healthy' ? GOOD : s === 'Watch' ? WARN : CRIT);
export const tagBg = (t: string) =>
  t === 'ADD' ? '#dcfce7' : t === 'FIX' ? '#eff6ff' : t === 'DECOM' ? '#fee2e2' : t === 'UPD' ? '#ede9fe' : t === 'SURVEY' ? '#fef3c7' : '#f1f5f9';
export const tagFg = (t: string) =>
  t === 'ADD' ? GOOD : t === 'FIX' ? INFO : t === 'DECOM' ? CRIT : t === 'UPD' ? PURP : t === 'SURVEY' ? WARN : '#334155';

const bars = (rows: [string, string, number][], _color?: string): PanelItem[] => {
  const max = Math.max(...rows.map(r => r[2]));
  return rows.map(r => ({
    name: r[0],
    count: r[1],
    w: `${Math.max(Math.round((r[2] / max) * 100), 2)}%`
  }));
};

const leaf = (k: [string, string, number, string, string, string, number, number, string]): ParentLeaf => ({
  name: k[0],
  count: k[1],
  health: `${k[2]}%`,
  badgeBg: k[2] >= 90 ? '#DCFCE7' : k[2] >= 80 ? '#FEF3C7' : '#FEE2E2',
  badgeFg: hc(k[2]),
  scope: k[3],
  covLabel: k[4],
  coverage: k[5],
  critical: k[6],
  high: k[7],
  color: k[8]
});

export const PARENTS_DATA: ParentCategory[] = [
  {
    name: 'Physical inventory',
    desc: 'things you can touch',
    count: '1.55M',
    delta: '+2.6%',
    health: '92%',
    children: [
      leaf(['Active', '1.48M', 92, '65,680 managed elements and their shelves, cards, ports', 'Discovered', '96%', 39, 136, ACT]),
      leaf(['Passive', '69,730', 84, 'fibre, ducts, closures, towers, ODFs', 'Survey verified', '72%', 38, 94, PAS])
    ]
  },
  {
    name: 'Logical inventory',
    desc: 'configured on top of physical',
    count: '59,870',
    delta: '+5.4%',
    health: '91%',
    children: [
      leaf(['Virtual', '2,860', 96, 'VNF / CNF instances on 46 clusters', 'Mapped to host', '99%', 3, 8, VIR]),
      leaf(['Logical', '57,010', 91, 'cells, tunnels, VRFs, trails, links', 'Mapped to port', '93%', 24, 80, LOG])
    ]
  }
];

export const PANELS_DATA: PanelCategory[] = [
  {
    title: 'Active (Physical)',
    color: ACT,
    route: '/inventory/physical',
    desc: 'Physical routers, switches, RAN, optical & microwave nodes managed via EMS / NMS.',
    items: bars([
      ['Cell-site routers (CSR)', '21,640', 21640],
      ['Radio units (RRU / AAU)', '18,640', 18640],
      ['Carrier Ethernet & access switches', '9,120', 9120],
      ['Baseband units (BBU / DU)', '6,230', 6230],
      ['Microwave radios (IDU / ODU)', '4,210', 4210],
      ['Metro agg. & PE routers', '2,910', 2910],
      ['DWDM / ROADM optical nodes', '1,510', 1510],
      ['Data centre & spine-leaf switches', '860', 860],
      ['GPON / XGS-PON OLTs', '390', 390],
      ['Core / backbone routers (P)', '170', 170]
    ]),
    facts: [
      { name: 'Reachable in last discovery', value: '96.2%', color: GOOD },
      { name: 'Software version recorded', value: '94%', color: GOOD },
      { name: 'Chassis serial verified', value: '97.6%', color: GOOD },
      { name: 'Dual PSU / power monitored', value: '98.8%', color: '#111827' }
    ]
  },
  {
    title: 'Passive (Physical)',
    color: PAS,
    route: '/inventory/passive',
    desc: 'Unpowered outside and inside plant from GIS and field survey.',
    items: bars([
      ['Manholes / handholes', '14,920', 14920],
      ['Fibre spans / segments', '12,480', 12480],
      ['Antennas (passive)', '11,280', 11280],
      ['ODF / patch panels', '9,870', 9870],
      ['Splice closures / joints', '9,640', 9640],
      ['Fibre cables', '8,420', 8420],
      ['Ducts / sub-ducts', '6,310', 6310],
      ['Towers / masts / poles', '5,210', 5210]
    ]),
    facts: [
      { name: 'Fibre route length', value: '48,210 km', color: '#111827' },
      { name: 'Geo-referenced (GIS)', value: '87%', color: WARN },
      { name: 'Strands lit', value: '66% of 582k', color: '#111827' },
      { name: 'Avg. duct occupancy', value: '64%', color: '#111827' }
    ]
  },
  {
    title: 'Virtual (Logical)',
    color: VIR,
    route: '/inventory/virtual',
    desc: 'Network functions (VNFs / CNFs) across Core, vRAN, Transport, IMS & Security domains.',
    items: bars([
      ['5G UPF & Packet Core (UPF/SGW-U)', '590', 590],
      ['vIMS Core (CSCF / TAS / vSBC)', '500', 500],
      ['5G/4G Control (AMF / MME / SMF)', '430', 430],
      ['vRAN Cloud Units (vCU / vDU)', '370', 370],
      ['vRouter & vBNG (Transport / IP)', '320', 320],
      ['vFirewall & SecGW (Security Domain)', '260', 260],
      ['UDM, UDR & Policy (PCF / PCRF)', '230', 230],
      ['vCPE & SD-WAN Virtual Edge', '160', 160]
    ]),
    facts: [
      { name: 'Mapped to hosting cluster / server', value: '99.5%', color: GOOD },
      { name: 'Clusters · pods tracked', value: '46 · 18,400', color: '#111827' },
      { name: 'Release recorded', value: '98%', color: GOOD },
      { name: 'Licence capacity mismatches', value: '15', color: WARN }
    ]
  },
  {
    title: 'Logical',
    color: LOG,
    route: '/inventory/links',
    desc: 'Software-defined objects riding on active ports and virtual functions.',
    items: bars([
      ['Cells (4G / 5G)', '28,900', 28900],
      ['LSPs / SR tunnels', '14,120', 14120],
      ['VRFs / L3VPN', '6,380', 6380],
      ['EVPN / VLAN services', '3,080', 3080],
      ['Transport paths / trails', '2,390', 2390],
      ['Wavelength services', '2,140', 2140]
    ]),
    facts: [
      { name: 'Mapped to an active port', value: '93%', color: GOOD },
      { name: 'IP addresses in use / stranded', value: '361,400 / 57,200', color: WARN },
      { name: 'Orphan logical objects', value: '539', color: WARN },
      { name: 'Links / circuits with A–Z resolved', value: '94%', color: GOOD }
    ]
  }
];

export const QUALITY_ROWS_DATA: QualityRow[] = [
  { name: 'Active', color: ACT, v1: '95%', c1: hc(95), v2: '92%', c2: hc(92), v3: '93%', c3: hc(93), v4: '0.5%', c4: ic(0.5), v5: '0.6%', c5: ic(0.6) },
  { name: 'Passive', color: PAS, v1: '86%', c1: hc(86), v2: '81%', c2: hc(81), v3: '72%', c3: hc(72), v4: '1.4%', c4: ic(1.4), v5: '2.1%', c5: ic(2.1) },
  { name: 'Virtual', color: VIR, v1: '97%', c1: hc(97), v2: '95%', c2: hc(95), v3: '96%', c3: hc(96), v4: '0.2%', c4: ic(0.2), v5: '0.3%', c5: ic(0.3) },
  { name: 'Logical', color: LOG, v1: '94%', c1: hc(94), v2: '92%', c2: hc(92), v3: '90%', c3: hc(90), v4: '0.5%', c4: ic(0.5), v5: '0.9%', c5: ic(0.9) }
];

export const CROSS_LINKS_DATA: CrossLink[] = [
  { name: 'Logical object ↔ active port', value: '93%', color: hc(93) },
  { name: 'Virtual function ↔ active host / cluster', value: '99%', color: hc(99) },
  { name: 'Passive span ↔ active termination (ODF / port)', value: '88%', color: hc(88) },
  { name: 'Active element ↔ site & rack position', value: '95%', color: hc(95) },
  { name: 'Passive antenna ↔ cell', value: '90%', color: hc(90) },
  { name: 'IP address ↔ interface', value: '91%', color: hc(91) },
  { name: 'Service ↔ end-to-end path', value: '86%', color: hc(86) }
];

export const GAP_ROWS_DATA = [
  { name: 'Software version drift', value: '363' },
  { name: 'Port / interface mismatch', value: '231' },
  { name: 'Capacity mismatch', value: '221' },
  { name: 'Survey vs GIS position mismatch', value: '186' },
  { name: 'Location mismatch', value: '96' }
];

export const LIFECYCLE_STATES_DATA = [
  { name: 'In service', count: '1.43M', color: GOOD },
  { name: 'Planned', count: '81,200', color: INFO },
  { name: 'Faulty', count: '9,400', color: CRIT },
  { name: 'Maintenance', count: '48,600', color: WARN },
  { name: 'Decommissioned', count: '64,900', color: GREY }
];

export const LIFECYCLE_BARS_DATA = [
  { name: 'In service', count: '1.43M', pct: '87%', w: '87%', color: GOOD },
  { name: 'Planned', count: '81,200', pct: '5%', w: '5%', color: INFO },
  { name: 'Faulty', count: '9,400', pct: '1%', w: '1%', color: CRIT },
  { name: 'Under maintenance', count: '48,600', pct: '3%', w: '3%', color: WARN },
  { name: 'Decommissioning', count: '64,900', pct: '4%', w: '4%', color: GREY }
];

export const SITES_RAW: [string, string, string, string, string, number, number, string][] = [
  ['GUW-SITE-0094', 'North-East', 'Macro cell site', '26', '41', 72, 11, 'At risk'],
  ['KOL-OTN-04', 'East', 'Transport hub', '910', '1,260', 82, 9, 'Watch'],
  ['KOL-SITE-0608', 'East', 'Macro cell site', '31', '38', 81, 7, 'Watch'],
  ['NAG-MW-HUB-07', 'Central', 'Microwave hub', '640', '212', 86, 6, 'Watch'],
  ['PUN-EDGE-07', 'West', 'Edge data centre', '96', '184', 85, 5, 'Watch'],
  ['KOL-DC-04', 'East', 'Core data centre', '318', '402', 89, 4, 'Watch'],
  ['HYD-AGG-11', 'Central', 'Aggregation node', '860', '690', 90, 3, 'Healthy']
];

export const SERVICES_RAW: [string, string, number][] = [
  ['Mobile backhaul (per site)', '4,218', 91],
  ['Enterprise L3VPN', '6,840', 88],
  ['EVPN / E-Line / E-LAN', '3,080', 84],
  ['Wholesale wavelengths', '2,140', 82],
  ['Dark fibre leases', '1,260', 76],
  ['Internet / peering', '882', 90]
];

export const ACTIVITY_RAW: [string, string, string, string][] = [
  ['SYNC', 'Discovery run #4,812 — 1,240 active and logical updates', 'system', '12 min ago'],
  ['ADD', '42 cell-site routers and 28 gNodeB onboarded (West)', 'r.mehta', '1 h ago'],
  ['SURVEY', 'Field survey imported: 312 manholes, 96 closures (NE)', 'field-ops', '2 h ago'],
  ['FIX', '94 LSP paths resolved from LDP / SR data', 'system', '3 h ago'],
  ['FIX', '71 fibre spans terminated on ODF ports', 'a.sharma', '5 h ago'],
  ['UPD', 'Rack / slot positions corrected for 1,180 cards', 'v.nair', 'Yesterday'],
  ['ADD', 'UPF cluster #14 onboarded at Mumbai edge', 'k.rao', 'Yesterday'],
  ['DECOM', '12 SDH nodes and 3G NodeB batch 7 retired', 'p.iyer', '2 days ago']
];

export const DECOM_RAW: [string, number][] = [
  ['Active', 260],
  ['Passive', 112],
  ['Logical', 32],
  ['Virtual', 8]
];

export const EOL_VENDORS = [
  { name: 'Ericsson', color: PURP },
  { name: 'Nokia', color: INFO },
  { name: 'Cisco', color: TEAL },
  { name: 'Ciena', color: '#0891B2' },
  { name: 'Huawei', color: WARN },
  { name: 'Others', color: GREY }
];

export const EOL_RAW: [string, number, number[]][] = [
  ['Active', 3100, [30, 26, 22, 10, 6, 6]],
  ['Passive', 540, [0, 0, 0, 0, 0, 100]],
  ['Logical', 170, [26, 34, 24, 0, 8, 8]],
  ['Virtual', 60, [40, 36, 12, 0, 6, 6]]
];

export const DRIFT_RAW: [string, number][] = [
  ['Cisco', 720],
  ['Nokia', 540],
  ['Huawei', 380],
  ['Juniper', 290],
  ['Others', 210]
];

export const SPARES_RAW: [string, number, number][] = [
  ['Nokia AirScale ASIA', 1980, 12],
  ['Cisco ASR 920', 1350, 8],
  ['Ericsson Radio 4480', 2420, 31],
  ['Ciena 6500 line card', 860, 9],
  ['Huawei ATN 910C', 1120, 14],
  ['Nokia 7250 IXR-e', 640, 7]
];

export const STALE_ITEMS = [
  { name: 'Active · element not discovered 7+ days', count: '1,180' },
  { name: 'Active · component position not reconfirmed', count: '960' },
  { name: 'Logical · port mapping not reconfirmed', count: '360' },
  { name: 'Passive · not surveyed 12+ months', count: '280' },
  { name: 'Virtual · host mapping not reconfirmed', count: '60' }
];

export const VERIFY_TREND = [58, 61, 63, 66, 69, 72].map((v, i, arr) => ({
  label: `${v}%`,
  h: `${Math.round(((v - 40) / 40) * 34)}px`,
  color: i === arr.length - 1 ? PAS : '#F5D0A5'
}));

export const WINDOWS_TREND: Record<string, [string, number][]> = {
  '7d': [
    ['Fri', 96],
    ['Sat', 41],
    ['Sun', 38],
    ['Mon', 142],
    ['Tue', 128],
    ['Wed', 151],
    ['Thu', 134]
  ],
  '30d': [
    ['W36', 690],
    ['W37', 742],
    ['W38', 815],
    ['W39', 903]
  ],
  '90d': [
    ['Jul', 2970],
    ['Aug', 3330],
    ['Sep', 3150]
  ],
  '12m': [
    ['Oct', 1310],
    ['Nov', 1730],
    ['Dec', 1600],
    ['Jan', 2110],
    ['Feb', 2520],
    ['Mar', 2000],
    ['Apr', 2860],
    ['May', 2590],
    ['Jun', 2390],
    ['Jul', 2970],
    ['Aug', 3330],
    ['Sep', 3150]
  ]
};

export const BOTTOM_NAVIGATE_DATA = [
  { count: '65,680', name: 'Active elements', where: 'Resources › Physical', color: ACT, route: '/inventory/physical' },
  { count: '69,730', name: 'Passive assets', where: 'Resources › Passive', color: PAS, route: '/inventory/passive' },
  { count: '2,860', name: 'Virtual functions', where: 'Resources › Virtual', color: VIR, route: '/inventory/virtual' },
  { count: '57,010', name: 'Logical objects', where: 'Connectivity · Services', color: LOG, route: '/inventory/links' },
  { count: '4,218', name: 'Locations and sites', where: 'Location', color: '#374151', route: '/inventory/location' }
];
