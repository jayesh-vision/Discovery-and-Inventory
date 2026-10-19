export type DayRangeOption = '7d' | '14d' | '30d' | '90d' | '12m';

export const DAY_RANGE_LABELS: Record<DayRangeOption, string> = {
  '7d': 'Last 7 days',
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months'
};
import { DC_SUM, DC_TOTAL, dcRegionLabel, type DcSum } from './dc/scope';
import { DC_COUNTS } from './dc/index';
import { currentGeo, isDatacenter } from '../solution';
import { DC_VIRTUAL_RESOURCES } from './dcVirtualResources';
import {
  ACT,
  PAS,
  VIR,
  LOG,
  GOOD,
  WARN,
  CRIT,
  INFO,
  PURP,
  TEAL,
  GREY,
  hc,
  statusBg,
  statusFg,
  ParentCategory,
  ParentLeaf,
  PanelCategory,
  PanelItem,
  QualityRow,
  CrossLink,
  SiteRow,
  ServiceRow
} from './inventoryInsightsData';

const leaf = (
  name: string,
  count: string,
  healthNum: number,
  scope: string,
  covLabel: string,
  coverage: string,
  critical: number,
  high: number,
  color: string
): ParentLeaf => ({
  name,
  count,
  health: `${healthNum}%`,
  badgeBg: healthNum >= 90 ? '#DCFCE7' : healthNum >= 80 ? '#FEF3C7' : '#FEE2E2',
  badgeFg: hc(healthNum),
  scope,
  covLabel,
  coverage,
  critical,
  high,
  color
});

const bars = (rows: [string, string, number][]) => {
  const max = Math.max(...rows.map(r => r[2]));
  return rows.map(r => ({
    name: r[0],
    count: r[1],
    w: `${Math.max(Math.round((r[2] / max) * 100), 2)}%`
  }));
};

// ── 1. Total Records (Dark Card) ──
const DEFAULT_TOTAL_RECORDS_DATA: Record<DayRangeOption, {
  totalDisplay: string;
  totalRaw: number;
  sitesCount: string;
  managedElements: string;
  delta: string;
  period: string;
  health: string;
  confirmed: string;
  stranded: string;
  strandedVal: string;
}> = {
  '7d': {
    totalDisplay: '1.61M',
    totalRaw: 1612200,
    sitesCount: '4,218',
    managedElements: '65,680',
    delta: '+0.9%',
    period: 'vs last 7 days',
    health: '90%',
    confirmed: '93.1%',
    stranded: '6.9%',
    strandedVal: '111k'
  },
  '14d': {
    totalDisplay: '1.60M',
    totalRaw: 1602400,
    sitesCount: '4,210',
    managedElements: '65,240',
    delta: '+1.8%',
    period: 'vs last 14 days',
    health: '90%',
    confirmed: '92.8%',
    stranded: '7.2%',
    strandedVal: '116k'
  },
  '30d': {
    totalDisplay: '1.58M',
    totalRaw: 1583600,
    sitesCount: '4,192',
    managedElements: '64,410',
    delta: '+3.8%',
    period: 'vs last 30 days',
    health: '90%',
    confirmed: '92.4%',
    stranded: '7.6%',
    strandedVal: '123k'
  },
  '90d': {
    totalDisplay: '1.51M',
    totalRaw: 1514000,
    sitesCount: '4,140',
    managedElements: '61,850',
    delta: '+8.2%',
    period: 'vs last 90 days',
    health: '89%',
    confirmed: '91.8%',
    stranded: '8.2%',
    strandedVal: '132k'
  },
  '12m': {
    totalDisplay: '1.26M',
    totalRaw: 1262000,
    sitesCount: '3,920',
    managedElements: '54,200',
    delta: '+18.4%',
    period: 'vs last 12 months',
    health: '88%',
    confirmed: '90.5%',
    stranded: '9.5%',
    strandedVal: '153k'
  }
};

// ── 2. Parents Data (Physical & Logical cards) ──
const DEFAULT_PARENTS_DATA_DYNAMIC: Record<DayRangeOption, ParentCategory[]> = {
  '7d': [
    {
      name: 'Physical inventory',
      desc: '',
      count: '1.55M',
      delta: '+0.6%',
      health: '93%',
      children: [
        leaf('Active', '1.48M', 92, '65,680 managed elements and their shelves, cards, ports', 'Discovered', '96%', 39, 136, ACT),
        leaf('Passive', '69,730', 84, 'fibre, ducts, closures, towers, ODFs', 'Survey verified', '72%', 38, 94, PAS)
      ]
    },
    {
      name: 'Connectivity inventory',
      desc: '',
      count: '59,870',
      delta: '+1.2%',
      health: '92%',
      children: [
        leaf('Virtual', '2,860', 96, 'VNF / CNF instances on 46 clusters', 'Mapped to host', '99.5%', 3, 8, VIR),
        leaf('Connectivity', '57,010', 92, 'L3VPN, SR tunnels, EVPN, cells & optical trails', 'Path A–Z resolved', '96.8%', 18, 62, LOG)
      ]
    }
  ],
  '14d': [
    {
      name: 'Physical inventory',
      desc: '',
      count: '1.54M',
      delta: '+1.2%',
      health: '93%',
      children: [
        leaf('Active', '1.47M', 92, '65,240 managed elements and their shelves, cards, ports', 'Discovered', '95.8%', 44, 142, ACT),
        leaf('Passive', '69,200', 83, 'fibre, ducts, closures, towers, ODFs', 'Survey verified', '71%', 41, 98, PAS)
      ]
    },
    {
      name: 'Connectivity inventory',
      desc: '',
      count: '58,400',
      delta: '+2.5%',
      health: '92%',
      children: [
        leaf('Virtual', '2,780', 96, 'VNF / CNF instances on 44 clusters', 'Mapped to host', '99.4%', 4, 9, VIR),
        leaf('Connectivity', '55,620', 92, 'L3VPN, SR tunnels, EVPN, cells & optical trails', 'Path A–Z resolved', '96.4%', 21, 68, LOG)
      ]
    }
  ],
  '30d': [
    {
      name: 'Physical inventory',
      desc: '',
      count: '1.52M',
      delta: '+2.6%',
      health: '92%',
      children: [
        leaf('Active', '1.45M', 91, '64,410 managed elements and their shelves, cards, ports', 'Discovered', '95.2%', 52, 158, ACT),
        leaf('Passive', '68,400', 82, 'fibre, ducts, closures, towers, ODFs', 'Survey verified', '69%', 46, 106, PAS)
      ]
    },
    {
      name: 'Connectivity inventory',
      desc: '',
      count: '55,200',
      delta: '+5.4%',
      health: '91%',
      children: [
        leaf('Virtual', '2,620', 95, 'VNF / CNF instances on 42 clusters', 'Mapped to host', '98.8%', 5, 11, VIR),
        leaf('Connectivity', '52,580', 91, 'L3VPN, SR tunnels, EVPN, cells & optical trails', 'Path A–Z resolved', '95.7%', 26, 74, LOG)
      ]
    }
  ],
  '90d': [
    {
      name: 'Physical inventory',
      desc: '',
      count: '1.46M',
      delta: '+5.8%',
      health: '91%',
      children: [
        leaf('Active', '1.39M', 90, '61,850 managed elements and their shelves, cards, ports', 'Discovered', '94.1%', 68, 184, ACT),
        leaf('Passive', '65,100', 80, 'fibre, ducts, closures, towers, ODFs', 'Survey verified', '65%', 58, 122, PAS)
      ]
    },
    {
      name: 'Connectivity inventory',
      desc: '',
      count: '48,900',
      delta: '+11.6%',
      health: '89%',
      children: [
        leaf('Virtual', '2,240', 94, 'VNF / CNF instances on 38 clusters', 'Mapped to host', '98.2%', 7, 15, VIR),
        leaf('Connectivity', '46,660', 90, 'L3VPN, SR tunnels, EVPN, cells & optical trails', 'Path A–Z resolved', '94.8%', 34, 88, LOG)
      ]
    }
  ],
  '12m': [
    {
      name: 'Physical inventory',
      desc: '',
      count: '1.22M',
      delta: '+14.2%',
      health: '89%',
      children: [
        leaf('Active', '1.16M', 88, '54,200 managed elements and their shelves, cards, ports', 'Discovered', '91.5%', 94, 228, ACT),
        leaf('Passive', '58,900', 76, 'fibre, ducts, closures, towers, ODFs', 'Survey verified', '58%', 76, 148, PAS)
      ]
    },
    {
      name: 'Connectivity inventory',
      desc: '',
      count: '36,500',
      delta: '+28.5%',
      health: '87%',
      children: [
        leaf('Virtual', '1,600', 92, 'VNF / CNF instances on 28 clusters', 'Mapped to host', '97.0%', 11, 22, VIR),
        leaf('Connectivity', '34,900', 87, 'L3VPN, SR tunnels, EVPN, cells & optical trails', 'Path A–Z resolved', '92.3%', 48, 114, LOG)
      ]
    }
  ]
};

// ── 3. Open Issues (Tile 4) ──
const DEFAULT_ISSUES_DYNAMIC: Record<DayRangeOption, {
  count: string;
  change: string;
  periodLabel: string;
  crit: number;
  high: number;
  med: number;
  low: number;
  medianDays: number;
  assigned: number;
}> = {
  '7d': {
    count: '1,142',
    change: '−2%',
    periodLabel: 'this week',
    crit: 92,
    high: 304,
    med: 440,
    low: 306,
    medianDays: 4,
    assigned: 26
  },
  '14d': {
    count: '1,168',
    change: '−4%',
    periodLabel: 'last 14 days',
    crit: 98,
    high: 312,
    med: 446,
    low: 308,
    medianDays: 5,
    assigned: 32
  },
  '30d': {
    count: '1,184',
    change: '−7%',
    periodLabel: 'this month',
    crit: 104,
    high: 318,
    med: 452,
    low: 310,
    medianDays: 6,
    assigned: 38
  },
  '90d': {
    count: '1,260',
    change: '−16%',
    periodLabel: 'this quarter',
    crit: 118,
    high: 336,
    med: 472,
    low: 334,
    medianDays: 11,
    assigned: 52
  },
  '12m': {
    count: '1,410',
    change: '−34%',
    periodLabel: 'this year',
    crit: 142,
    high: 380,
    med: 518,
    low: 370,
    medianDays: 22,
    assigned: 84
  }
};

// ── 4. Bucket Share (Donut 1) ──
const DEFAULT_BUCKET_SHARE_DATA: Record<DayRangeOption, {
  centerLabel: string;
  summaryText: string;
  rows: [string, string, number, string][];
}> = {
  '7d': {
    centerLabel: '1.61M',
    summaryText: 'Physical inventory is 96.3% of records (Active 92.0%, Passive 4.3%) because every port, card and shelf is its own record; Connectivity holds 3.5% and Virtual 0.2%.',
    rows: [
      ['Active', '1.48M', 1482600, ACT],
      ['Passive', '69,730', 69730, PAS],
      ['Connectivity', '57,010', 57010, LOG],
      ['Virtual', '2,860', 2860, VIR]
    ]
  },
  '14d': {
    centerLabel: '1.60M',
    summaryText: 'Physical inventory is 96.2% of records (Active 91.9%, Passive 4.3%) because every port, card and shelf is its own record; Connectivity holds 3.5% and Virtual 0.2%.',
    rows: [
      ['Active', '1.47M', 1474800, ACT],
      ['Passive', '69,200', 69200, PAS],
      ['Connectivity', '55,620', 55620, LOG],
      ['Virtual', '2,780', 2780, VIR]
    ]
  },
  '30d': {
    centerLabel: '1.58M',
    summaryText: 'Physical inventory is 96.1% of records (Active 91.8%, Passive 4.3%) because every port, card and shelf is its own record; Connectivity holds 3.3% and Virtual 0.2%.',
    rows: [
      ['Active', '1.45M', 1459800, ACT],
      ['Passive', '68,400', 68400, PAS],
      ['Connectivity', '52,580', 52580, LOG],
      ['Virtual', '2,620', 2620, VIR]
    ]
  },
  '90d': {
    centerLabel: '1.51M',
    summaryText: 'Physical inventory is 95.8% of records (Active 91.5%, Passive 4.3%) because every port, card and shelf is its own record; Connectivity holds 3.1% and Virtual 0.1%.',
    rows: [
      ['Active', '1.39M', 1399800, ACT],
      ['Passive', '65,100', 65100, PAS],
      ['Connectivity', '46,660', 46660, LOG],
      ['Virtual', '2,240', 2240, VIR]
    ]
  },
  '12m': {
    centerLabel: '1.26M',
    summaryText: 'Physical inventory was 95.9% of records (Active 91.3%, Passive 4.6%) because every port, card and shelf is its own record; Connectivity held 2.8% and Virtual 0.1%.',
    rows: [
      ['Active', '1.16M', 1166600, ACT],
      ['Passive', '58,900', 58900, PAS],
      ['Connectivity', '34,900', 34900, LOG],
      ['Virtual', '1,600', 1600, VIR]
    ]
  }
};

// ── 5. Lifecycle (Donut 2 / Lifecycle Panel) ──
const DEFAULT_LIFECYCLE_DYNAMIC: Record<DayRangeOption, {
  states: Array<{ name: string; count: string; color: string }>;
  bars: Array<{ name: string; count: string; pct: string; w: string; color: string }>;
  faultsNote: string;
  leadTimeNote: string;
}> = {
  '7d': {
    states: [
      { name: 'In service', count: '1.44M', color: GOOD },
      { name: 'Planned', count: '74,100', color: INFO },
      { name: 'Faulty', count: '7,800', color: CRIT },
      { name: 'Maintenance', count: '42,300', color: WARN },
      { name: 'Decommissioned', count: '59,200', color: GREY }
    ],
    bars: [
      { name: 'In service', count: '1.44M', pct: '89%', w: '89%', color: GOOD },
      { name: 'Planned', count: '74,100', pct: '5%', w: '5%', color: INFO },
      { name: 'Faulty', count: '7,800', pct: '1%', w: '1%', color: CRIT },
      { name: 'Under maintenance', count: '42,300', pct: '2%', w: '2%', color: WARN },
      { name: 'Decommissioning', count: '59,200', pct: '3%', w: '3%', color: GREY }
    ],
    faultsNote: 'Faults concentrate in Active records (7,280) — 93% of all faulty records; Passive faults are splice and duct damage found on survey.',
    leadTimeNote: 'Planned records take a median 42 days before going in service, gated mainly by passive field verification.'
  },
  '14d': {
    states: [
      { name: 'In service', count: '1.43M', color: GOOD },
      { name: 'Planned', count: '77,600', color: INFO },
      { name: 'Faulty', count: '8,600', color: CRIT },
      { name: 'Maintenance', count: '45,100', color: WARN },
      { name: 'Decommissioned', count: '61,800', color: GREY }
    ],
    bars: [
      { name: 'In service', count: '1.43M', pct: '88%', w: '88%', color: GOOD },
      { name: 'Planned', count: '77,600', pct: '5%', w: '5%', color: INFO },
      { name: 'Faulty', count: '8,600', pct: '1%', w: '1%', color: CRIT },
      { name: 'Under maintenance', count: '45,100', pct: '3%', w: '3%', color: WARN },
      { name: 'Decommissioning', count: '61,800', pct: '3%', w: '3%', color: GREY }
    ],
    faultsNote: 'Faults concentrate in Active records (8,040) — 93.5% of all faulty records; Passive faults are splice and duct damage found on survey.',
    leadTimeNote: 'Planned records take a median 48 days before going in service, gated mainly by passive field verification.'
  },
  '30d': {
    states: [
      { name: 'In service', count: '1.43M', color: GOOD },
      { name: 'Planned', count: '81,200', color: INFO },
      { name: 'Faulty', count: '9,400', color: CRIT },
      { name: 'Maintenance', count: '48,600', color: WARN },
      { name: 'Decommissioned', count: '64,900', color: GREY }
    ],
    bars: [
      { name: 'In service', count: '1.43M', pct: '87%', w: '87%', color: GOOD },
      { name: 'Planned', count: '81,200', pct: '5%', w: '5%', color: INFO },
      { name: 'Faulty', count: '9,400', pct: '1%', w: '1%', color: CRIT },
      { name: 'Under maintenance', count: '48,600', pct: '3%', w: '3%', color: WARN },
      { name: 'Decommissioning', count: '64,900', pct: '4%', w: '4%', color: GREY }
    ],
    faultsNote: 'Faults concentrate in Active records (8,800) — 94% of all faulty records; Passive faults are splice and duct damage found on survey.',
    leadTimeNote: 'Planned records take a median 54 days before going in service, gated mainly by passive field verification — 61% of the wait is survey, not installation.'
  },
  '90d': {
    states: [
      { name: 'In service', count: '1.38M', color: GOOD },
      { name: 'Planned', count: '96,400', color: INFO },
      { name: 'Faulty', count: '12,200', color: CRIT },
      { name: 'Maintenance', count: '56,000', color: WARN },
      { name: 'Decommissioned', count: '72,400', color: GREY }
    ],
    bars: [
      { name: 'In service', count: '1.38M', pct: '85%', w: '85%', color: GOOD },
      { name: 'Planned', count: '96,400', pct: '6%', w: '6%', color: INFO },
      { name: 'Faulty', count: '12,200', pct: '1%', w: '1%', color: CRIT },
      { name: 'Under maintenance', count: '56,000', pct: '4%', w: '4%', color: WARN },
      { name: 'Decommissioning', count: '72,400', pct: '4%', w: '4%', color: GREY }
    ],
    faultsNote: 'Faults concentrate in Active records (11,400) — 93.4% of all faulty records; Passive faults are splice and duct damage found on survey.',
    leadTimeNote: 'Planned records take a median 62 days before going in service, gated mainly by passive field verification.'
  },
  '12m': {
    states: [
      { name: 'In service', count: '1.15M', color: GOOD },
      { name: 'Planned', count: '128,000', color: INFO },
      { name: 'Faulty', count: '16,800', color: CRIT },
      { name: 'Maintenance', count: '68,400', color: WARN },
      { name: 'Decommissioned', count: '86,200', color: GREY }
    ],
    bars: [
      { name: 'In service', count: '1.15M', pct: '83%', w: '83%', color: GOOD },
      { name: 'Planned', count: '128,000', pct: '8%', w: '8%', color: INFO },
      { name: 'Faulty', count: '16,800', pct: '1%', w: '1%', color: CRIT },
      { name: 'Under maintenance', count: '68,400', pct: '4%', w: '4%', color: WARN },
      { name: 'Decommissioning', count: '86,200', pct: '4%', w: '4%', color: GREY }
    ],
    faultsNote: 'Faults concentrated in Active records (15,600) — 93% of all faulty records; Passive faults were splice and duct damage found on survey.',
    leadTimeNote: 'Planned records took a median 78 days before going in service during initial rollout phases.'
  }
};

// ── 6. Vendor Mix (Donut 3) ──
const DEFAULT_VENDOR_MIX_DATA: Record<DayRangeOption, {
  activeNEs: string;
  models: string;
  unmapped: string;
  rows: [string, number, string][];
}> = {
  '7d': {
    activeNEs: '65.7k',
    models: '1,284',
    unmapped: '37',
    rows: [
      ['Nokia', 29, INFO],
      ['Ericsson', 24, PURP],
      ['Cisco', 19, TEAL],
      ['Huawei', 11, WARN],
      ['Ciena', 7, '#0891B2'],
      ['Others', 10, GREY]
    ]
  },
  '14d': {
    activeNEs: '65.2k',
    models: '1,276',
    unmapped: '41',
    rows: [
      ['Nokia', 29, INFO],
      ['Ericsson', 24, PURP],
      ['Cisco', 19, TEAL],
      ['Huawei', 11, WARN],
      ['Ciena', 7, '#0891B2'],
      ['Others', 10, GREY]
    ]
  },
  '30d': {
    activeNEs: '64.4k',
    models: '1,262',
    unmapped: '49',
    rows: [
      ['Nokia', 28, INFO],
      ['Ericsson', 24, PURP],
      ['Cisco', 20, TEAL],
      ['Huawei', 12, WARN],
      ['Ciena', 7, '#0891B2'],
      ['Others', 9, GREY]
    ]
  },
  '90d': {
    activeNEs: '61.8k',
    models: '1,210',
    unmapped: '68',
    rows: [
      ['Nokia', 28, INFO],
      ['Ericsson', 23, PURP],
      ['Cisco', 20, TEAL],
      ['Huawei', 13, WARN],
      ['Ciena', 7, '#0891B2'],
      ['Others', 9, GREY]
    ]
  },
  '12m': {
    activeNEs: '54.2k',
    models: '1,080',
    unmapped: '114',
    rows: [
      ['Nokia', 27, INFO],
      ['Ericsson', 22, PURP],
      ['Cisco', 21, TEAL],
      ['Huawei', 15, WARN],
      ['Ciena', 6, '#0891B2'],
      ['Others', 9, GREY]
    ]
  }
};

// ── 7. Detailed Panels (What exists row 2) ──
const DEFAULT_PANELS_DATA_DYNAMIC: Record<DayRangeOption, PanelCategory[]> = {
  '7d': [
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
      title: 'Connectivity (Logical & Services)',
      color: LOG,
      route: '/inventory/links',
      desc: 'End-to-end transport paths, VPN services, routing protocols & network slices configured across physical and virtual fabrics.',
      items: bars([
        ['4G / 5G radio cells & sector carriers', '23,400', 23400],
        ['SRv6 & SR-MPLS policy tunnels (LSPs)', '11,650', 11650],
        ['L3VPN VRFs & 5G network slices', '6,840', 6840],
        ['EVPN-VPWS & E-Line / E-LAN services', '4,210', 4210],
        ['Optical channels & OTN trails (DWDM/OCh)', '3,140', 3140],
        ['BGP peering & routing adjacency sessions', '2,920', 2920],
        ['IP subnets & interface address pools', '2,760', 2760],
        ['Broadband subscriber sessions (PPPoE/PON)', '2,090', 2090]
      ]),
      facts: [
        { name: 'Mapped to active port / interface', value: '94.2%', color: GOOD },
        { name: 'A–Z circuit path continuity resolved', value: '96.8%', color: GOOD },
        { name: 'Protected / redundant paths (1+1 / FRR)', value: '89.4%', color: GOOD },
        { name: 'IP addresses in use / stranded', value: '361,400 / 42,100', color: WARN },
        { name: 'Orphan logical objects', value: '184', color: WARN }
      ]
    }
  ],
  '14d': [
    {
      title: 'Active (Physical)',
      color: ACT,
      route: '/inventory/physical',
      desc: 'Physical routers, switches, RAN, optical & microwave nodes managed via EMS / NMS.',
      items: bars([
        ['Cell-site routers (CSR)', '21,480', 21480],
        ['Radio units (RRU / AAU)', '18,510', 18510],
        ['Carrier Ethernet & access switches', '9,060', 9060],
        ['Baseband units (BBU / DU)', '6,190', 6190],
        ['Microwave radios (IDU / ODU)', '4,180', 4180],
        ['Metro agg. & PE routers', '2,890', 2890],
        ['DWDM / ROADM optical nodes', '1,500', 1500],
        ['Data centre & spine-leaf switches', '850', 850],
        ['GPON / XGS-PON OLTs', '410', 410],
        ['Core / backbone routers (P)', '170', 170]
      ]),
      facts: [
        { name: 'Reachable in last discovery', value: '96.0%', color: GOOD },
        { name: 'Software version recorded', value: '93.8%', color: GOOD },
        { name: 'Chassis serial verified', value: '97.4%', color: GOOD },
        { name: 'Dual PSU / power monitored', value: '98.6%', color: '#111827' }
      ]
    },
    {
      title: 'Passive (Physical)',
      color: PAS,
      route: '/inventory/passive',
      desc: 'Unpowered outside and inside plant from GIS and field survey.',
      items: bars([
        ['Manholes / handholes', '14,810', 14810],
        ['Fibre spans / segments', '12,390', 12390],
        ['Antennas (passive)', '11,210', 11210],
        ['ODF / patch panels', '9,810', 9810],
        ['Splice closures / joints', '9,580', 9580],
        ['Fibre cables', '8,370', 8370],
        ['Ducts / sub-ducts', '6,270', 6270],
        ['Towers / masts / poles', '5,180', 5180]
      ]),
      facts: [
        { name: 'Fibre route length', value: '47,890 km', color: '#111827' },
        { name: 'Geo-referenced (GIS)', value: '86.8%', color: WARN },
        { name: 'Strands lit', value: '65.8% of 582k', color: '#111827' },
        { name: 'Avg. duct occupancy', value: '63.8%', color: '#111827' }
      ]
    },
    {
      title: 'Virtual (Logical)',
      color: VIR,
      route: '/inventory/virtual',
      desc: 'Network functions (VNFs / CNFs) across Core, vRAN, Transport, IMS & Security domains.',
      items: bars([
        ['5G UPF & Packet Core (UPF/SGW-U)', '575', 575],
        ['vIMS Core (CSCF / TAS / vSBC)', '485', 485],
        ['5G/4G Control (AMF / MME / SMF)', '420', 420],
        ['vRAN Cloud Units (vCU / vDU)', '360', 360],
        ['vRouter & vBNG (Transport / IP)', '310', 310],
        ['vFirewall & SecGW (Security Domain)', '250', 250],
        ['UDM, UDR & Policy (PCF / PCRF)', '225', 225],
        ['vCPE & SD-WAN Virtual Edge', '155', 155]
      ]),
      facts: [
        { name: 'Mapped to hosting cluster / server', value: '99.4%', color: GOOD },
        { name: 'Clusters · pods tracked', value: '44 · 18,100', color: '#111827' },
        { name: 'Release recorded', value: '97.8%', color: GOOD },
        { name: 'Licence capacity mismatches', value: '16', color: WARN }
      ]
    },
    {
      title: 'Connectivity (Logical & Services)',
      color: LOG,
      route: '/inventory/links',
      desc: 'End-to-end transport paths, VPN services, routing protocols & network slices configured across physical and virtual fabrics.',
      items: bars([
        ['4G / 5G radio cells & sector carriers', '22,850', 22850],
        ['SRv6 & SR-MPLS policy tunnels (LSPs)', '11,360', 11360],
        ['L3VPN VRFs & 5G network slices', '6,670', 6670],
        ['EVPN-VPWS & E-Line / E-LAN services', '4,110', 4110],
        ['Optical channels & OTN trails (DWDM/OCh)', '3,060', 3060],
        ['BGP peering & routing adjacency sessions', '2,850', 2850],
        ['IP subnets & interface address pools', '2,690', 2690],
        ['Broadband subscriber sessions (PPPoE/PON)', '2,030', 2030]
      ]),
      facts: [
        { name: 'Mapped to active port / interface', value: '93.8%', color: GOOD },
        { name: 'A–Z circuit path continuity resolved', value: '96.4%', color: GOOD },
        { name: 'Protected / redundant paths (1+1 / FRR)', value: '88.9%', color: GOOD },
        { name: 'IP addresses in use / stranded', value: '358,200 / 43,800', color: WARN },
        { name: 'Orphan logical objects', value: '198', color: WARN }
      ]
    }
  ],
  '30d': [
    {
      title: 'Active (Physical)',
      color: ACT,
      route: '/inventory/physical',
      desc: 'Physical routers, switches, RAN, optical & microwave nodes managed via EMS / NMS.',
      items: bars([
        ['Cell-site routers (CSR)', '21,120', 21120],
        ['Radio units (RRU / AAU)', '18,240', 18240],
        ['Carrier Ethernet & access switches', '8,920', 8920],
        ['Baseband units (BBU / DU)', '6,120', 6120],
        ['Microwave radios (IDU / ODU)', '4,140', 4140],
        ['Metro agg. & PE routers', '2,860', 2860],
        ['DWDM / ROADM optical nodes', '1,480', 1480],
        ['Data centre & spine-leaf switches', '840', 840],
        ['GPON / XGS-PON OLTs', '530', 530],
        ['Core / backbone routers (P)', '160', 160]
      ]),
      facts: [
        { name: 'Reachable in last discovery', value: '95.8%', color: GOOD },
        { name: 'Software version recorded', value: '93.4%', color: GOOD },
        { name: 'Chassis serial verified', value: '97.2%', color: GOOD },
        { name: 'Dual PSU / power monitored', value: '98.5%', color: '#111827' }
      ]
    },
    {
      title: 'Passive (Physical)',
      color: PAS,
      route: '/inventory/passive',
      desc: 'Unpowered outside and inside plant from GIS and field survey.',
      items: bars([
        ['Manholes / handholes', '14,640', 14640],
        ['Fibre spans / segments', '12,240', 12240],
        ['Antennas (passive)', '11,060', 11060],
        ['ODF / patch panels', '9,710', 9710],
        ['Splice closures / joints', '9,460', 9460],
        ['Fibre cables', '8,280', 8280],
        ['Ducts / sub-ducts', '6,190', 6190],
        ['Towers / masts / poles', '5,120', 5120]
      ]),
      facts: [
        { name: 'Fibre route length', value: '47,340 km', color: '#111827' },
        { name: 'Geo-referenced (GIS)', value: '86.2%', color: WARN },
        { name: 'Strands lit', value: '65.2% of 582k', color: '#111827' },
        { name: 'Avg. duct occupancy', value: '63.2%', color: '#111827' }
      ]
    },
    {
      title: 'Virtual (Logical)',
      color: VIR,
      route: '/inventory/virtual',
      desc: 'Network functions (VNFs / CNFs) across Core, vRAN, Transport, IMS & Security domains.',
      items: bars([
        ['5G UPF & Packet Core (UPF/SGW-U)', '540', 540],
        ['vIMS Core (CSCF / TAS / vSBC)', '460', 460],
        ['5G/4G Control (AMF / MME / SMF)', '390', 390],
        ['vRAN Cloud Units (vCU / vDU)', '340', 340],
        ['vRouter & vBNG (Transport / IP)', '290', 290],
        ['vFirewall & SecGW (Security Domain)', '240', 240],
        ['UDM, UDR & Policy (PCF / PCRF)', '210', 210],
        ['vCPE & SD-WAN Virtual Edge', '150', 150]
      ]),
      facts: [
        { name: 'Mapped to hosting cluster / server', value: '99.2%', color: GOOD },
        { name: 'Clusters · pods tracked', value: '42 · 17,600', color: '#111827' },
        { name: 'Release recorded', value: '97.4%', color: GOOD },
        { name: 'Licence capacity mismatches', value: '18', color: WARN }
      ]
    },
    {
      title: 'Connectivity (Logical & Services)',
      color: LOG,
      route: '/inventory/links',
      desc: 'End-to-end transport paths, VPN services, routing protocols & network slices configured across physical and virtual fabrics.',
      items: bars([
        ['4G / 5G radio cells & sector carriers', '21,600', 21600],
        ['SRv6 & SR-MPLS policy tunnels (LSPs)', '10,740', 10740],
        ['L3VPN VRFs & 5G network slices', '6,310', 6310],
        ['EVPN-VPWS & E-Line / E-LAN services', '3,880', 3880],
        ['Optical channels & OTN trails (DWDM/OCh)', '2,890', 2890],
        ['BGP peering & routing adjacency sessions', '2,690', 2690],
        ['IP subnets & interface address pools', '2,550', 2550],
        ['Broadband subscriber sessions (PPPoE/PON)', '1,920', 1920]
      ]),
      facts: [
        { name: 'Mapped to active port / interface', value: '93.1%', color: GOOD },
        { name: 'A–Z circuit path continuity resolved', value: '95.7%', color: GOOD },
        { name: 'Protected / redundant paths (1+1 / FRR)', value: '88.1%', color: GOOD },
        { name: 'IP addresses in use / stranded', value: '351,800 / 46,200', color: WARN },
        { name: 'Orphan logical objects', value: '224', color: WARN }
      ]
    }
  ],
  '90d': [
    {
      title: 'Active (Physical)',
      color: ACT,
      route: '/inventory/physical',
      desc: 'Physical routers, switches, RAN, optical & microwave nodes managed via EMS / NMS.',
      items: bars([
        ['Cell-site routers (CSR)', '20,400', 20400],
        ['Radio units (RRU / AAU)', '17,500', 17500],
        ['Carrier Ethernet & access switches', '8,560', 8560],
        ['Baseband units (BBU / DU)', '5,880', 5880],
        ['Microwave radios (IDU / ODU)', '3,980', 3980],
        ['Metro agg. & PE routers', '2,750', 2750],
        ['DWDM / ROADM optical nodes', '1,420', 1420],
        ['Data centre & spine-leaf switches', '810', 810],
        ['GPON / XGS-PON OLTs', '400', 400],
        ['Core / backbone routers (P)', '150', 150]
      ]),
      facts: [
        { name: 'Reachable in last discovery', value: '95.1%', color: GOOD },
        { name: 'Software version recorded', value: '92.2%', color: GOOD },
        { name: 'Chassis serial verified', value: '96.8%', color: GOOD },
        { name: 'Dual PSU / power monitored', value: '98.0%', color: '#111827' }
      ]
    },
    {
      title: 'Passive (Physical)',
      color: PAS,
      route: '/inventory/passive',
      desc: 'Unpowered outside and inside plant from GIS and field survey.',
      items: bars([
        ['Manholes / handholes', '14,020', 14020],
        ['Fibre spans / segments', '11,720', 11720],
        ['Antennas (passive)', '10,580', 10580],
        ['ODF / patch panels', '9,320', 9320],
        ['Splice closures / joints', '9,080', 9080],
        ['Fibre cables', '7,940', 7940],
        ['Ducts / sub-ducts', '5,940', 5940],
        ['Towers / masts / poles', '4,910', 4910]
      ]),
      facts: [
        { name: 'Fibre route length', value: '45,400 km', color: '#111827' },
        { name: 'Geo-referenced (GIS)', value: '84.5%', color: WARN },
        { name: 'Strands lit', value: '63.6% of 582k', color: '#111827' },
        { name: 'Avg. duct occupancy', value: '61.5%', color: '#111827' }
      ]
    },
    {
      title: 'Virtual (Logical)',
      color: VIR,
      route: '/inventory/virtual',
      desc: 'Network functions (VNFs / CNFs) across Core, vRAN, Transport, IMS & Security domains.',
      items: bars([
        ['5G UPF & Packet Core (UPF/SGW-U)', '460', 460],
        ['vIMS Core (CSCF / TAS / vSBC)', '390', 390],
        ['5G/4G Control (AMF / MME / SMF)', '330', 330],
        ['vRAN Cloud Units (vCU / vDU)', '290', 290],
        ['vRouter & vBNG (Transport / IP)', '250', 250],
        ['vFirewall & SecGW (Security Domain)', '210', 210],
        ['UDM, UDR & Policy (PCF / PCRF)', '180', 180],
        ['vCPE & SD-WAN Virtual Edge', '130', 130]
      ]),
      facts: [
        { name: 'Mapped to hosting cluster / server', value: '98.6%', color: GOOD },
        { name: 'Clusters · pods tracked', value: '38 · 16,100', color: '#111827' },
        { name: 'Release recorded', value: '96.2%', color: GOOD },
        { name: 'Licence capacity mismatches', value: '22', color: WARN }
      ]
    },
    {
      title: 'Connectivity (Logical & Services)',
      color: LOG,
      route: '/inventory/links',
      desc: 'End-to-end transport paths, VPN services, routing protocols & network slices configured across physical and virtual fabrics.',
      items: bars([
        ['4G / 5G radio cells & sector carriers', '19,160', 19160],
        ['SRv6 & SR-MPLS policy tunnels (LSPs)', '9,530', 9530],
        ['L3VPN VRFs & 5G network slices', '5,600', 5600],
        ['EVPN-VPWS & E-Line / E-LAN services', '3,450', 3450],
        ['Optical channels & OTN trails (DWDM/OCh)', '2,570', 2570],
        ['BGP peering & routing adjacency sessions', '2,390', 2390],
        ['IP subnets & interface address pools', '2,260', 2260],
        ['Broadband subscriber sessions (PPPoE/PON)', '1,700', 1700]
      ]),
      facts: [
        { name: 'Mapped to active port / interface', value: '91.9%', color: GOOD },
        { name: 'A–Z circuit path continuity resolved', value: '94.8%', color: GOOD },
        { name: 'Protected / redundant paths (1+1 / FRR)', value: '86.7%', color: GOOD },
        { name: 'IP addresses in use / stranded', value: '338,400 / 51,600', color: WARN },
        { name: 'Orphan logical objects', value: '286', color: WARN }
      ]
    }
  ],
  '12m': [
    {
      title: 'Active (Physical)',
      color: ACT,
      route: '/inventory/physical',
      desc: 'Physical routers, switches, RAN, optical & microwave nodes managed via EMS / NMS.',
      items: bars([
        ['Cell-site routers (CSR)', '17,900', 17900],
        ['Radio units (RRU / AAU)', '15,350', 15350],
        ['Carrier Ethernet & access switches', '7,500', 7500],
        ['Baseband units (BBU / DU)', '5,150', 5150],
        ['Microwave radios (IDU / ODU)', '3,500', 3500],
        ['Metro agg. & PE routers', '2,410', 2410],
        ['DWDM / ROADM optical nodes', '1,240', 1240],
        ['Data centre & spine-leaf switches', '710', 710],
        ['GPON / XGS-PON OLTs', '310', 310],
        ['Core / backbone routers (P)', '130', 130]
      ]),
      facts: [
        { name: 'Reachable in last discovery', value: '92.4%', color: GOOD },
        { name: 'Software version recorded', value: '88.6%', color: GOOD },
        { name: 'Chassis serial verified', value: '95.1%', color: GOOD },
        { name: 'Dual PSU / power monitored', value: '97.2%', color: '#111827' }
      ]
    },
    {
      title: 'Passive (Physical)',
      color: PAS,
      route: '/inventory/passive',
      desc: 'Unpowered outside and inside plant from GIS and field survey.',
      items: bars([
        ['Manholes / handholes', '12,140', 12140],
        ['Fibre spans / segments', '10,140', 10140],
        ['Antennas (passive)', '9,160', 9160],
        ['ODF / patch panels', '8,060', 8060],
        ['Splice closures / joints', '7,860', 7860],
        ['Fibre cables', '6,880', 6880],
        ['Ducts / sub-ducts', '5,140', 5140],
        ['Towers / masts / poles', '4,250', 4250]
      ]),
      facts: [
        { name: 'Fibre route length', value: '41,200 km', color: '#111827' },
        { name: 'Geo-referenced (GIS)', value: '80.2%', color: WARN },
        { name: 'Strands lit', value: '58.4% of 582k', color: '#111827' },
        { name: 'Avg. duct occupancy', value: '57.2%', color: '#111827' }
      ]
    },
    {
      title: 'Virtual (Logical)',
      color: VIR,
      route: '/inventory/virtual',
      desc: 'Network functions (VNFs / CNFs) across Core, vRAN, Transport, IMS & Security domains.',
      items: bars([
        ['5G UPF & Packet Core (UPF/SGW-U)', '330', 330],
        ['vIMS Core (CSCF / TAS / vSBC)', '280', 280],
        ['5G/4G Control (AMF / MME / SMF)', '240', 240],
        ['vRAN Cloud Units (vCU / vDU)', '200', 200],
        ['vRouter & vBNG (Transport / IP)', '180', 180],
        ['vFirewall & SecGW (Security Domain)', '150', 150],
        ['UDM, UDR & Policy (PCF / PCRF)', '130', 130],
        ['vCPE & SD-WAN Virtual Edge', '90', 90]
      ]),
      facts: [
        { name: 'Mapped to hosting cluster / server', value: '97.4%', color: GOOD },
        { name: 'Clusters · pods tracked', value: '28 · 12,400', color: '#111827' },
        { name: 'Release recorded', value: '94.0%', color: GOOD },
        { name: 'Licence capacity mismatches', value: '31', color: WARN }
      ]
    },
    {
      title: 'Connectivity (Logical & Services)',
      color: LOG,
      route: '/inventory/links',
      desc: 'End-to-end transport paths, VPN services, routing protocols & network slices configured across physical and virtual fabrics.',
      items: bars([
        ['4G / 5G radio cells & sector carriers', '14,330', 14330],
        ['SRv6 & SR-MPLS policy tunnels (LSPs)', '7,130', 7130],
        ['L3VPN VRFs & 5G network slices', '4,190', 4190],
        ['EVPN-VPWS & E-Line / E-LAN services', '2,580', 2580],
        ['Optical channels & OTN trails (DWDM/OCh)', '1,920', 1920],
        ['BGP peering & routing adjacency sessions', '1,790', 1790],
        ['IP subnets & interface address pools', '1,690', 1690],
        ['Broadband subscriber sessions (PPPoE/PON)', '1,270', 1270]
      ]),
      facts: [
        { name: 'Mapped to active port / interface', value: '89.4%', color: WARN },
        { name: 'A–Z circuit path continuity resolved', value: '92.3%', color: GOOD },
        { name: 'Protected / redundant paths (1+1 / FRR)', value: '83.5%', color: WARN },
        { name: 'IP addresses in use / stranded', value: '294,000 / 64,800', color: WARN },
        { name: 'Orphan logical objects', value: '412', color: WARN }
      ]
    }
  ]
};

// ── 8. Decommission Pipeline & Decom by Bucket ──
const DEFAULT_DECOM_DYNAMIC: Record<DayRangeOption, {
  periodLabel: string;
  marked: number;
  live: number;
  confirmed: number;
  note: string;
}> = {
  '7d': {
    periodLabel: 'Last 7 days',
    marked: 96,
    live: 14,
    confirmed: 82,
    note: '14 active elements marked decommissioned are still answering discovery this week; 4 are awaiting field survey signoff. Passive decommissions are confirmed by survey, not discovery.'
  },
  '14d': {
    periodLabel: 'Last 14 days',
    marked: 198,
    live: 28,
    confirmed: 170,
    note: '28 active elements marked decommissioned are still answering discovery over the fortnight; 12 are scheduled for removal this weekend. Passive decommissions are confirmed by survey.'
  },
  '30d': {
    periodLabel: 'Last 30 days',
    marked: 412,
    live: 63,
    confirmed: 349,
    note: '63 active elements marked decommissioned are still answering discovery — awaiting physical removal; 41 are older than 30 days. Passive decommissions are confirmed by survey, not discovery.'
  },
  '90d': {
    periodLabel: 'Last 90 days',
    marked: 1180,
    live: 174,
    confirmed: 1006,
    note: '174 active elements marked decommissioned were discovered live across the quarter; 112 have since been recovered by field engineering.'
  },
  '12m': {
    periodLabel: 'Last 12 months',
    marked: 4620,
    live: 480,
    confirmed: 4140,
    note: '480 legacy elements marked decommissioned lingered across the annual refresh; all have now completed final scrap salvage.'
  }
};

const DEFAULT_DECOM_BUCKET_DYNAMIC: Record<DayRangeOption, [string, number][]> = {
  '7d': [
    ['Active', 62],
    ['Passive', 24],
    ['Logical', 8],
    ['Virtual', 2]
  ],
  '14d': [
    ['Active', 128],
    ['Passive', 52],
    ['Logical', 14],
    ['Virtual', 4]
  ],
  '30d': [
    ['Active', 260],
    ['Passive', 112],
    ['Logical', 32],
    ['Virtual', 8]
  ],
  '90d': [
    ['Active', 740],
    ['Passive', 320],
    ['Logical', 94],
    ['Virtual', 26]
  ],
  '12m': [
    ['Active', 2940],
    ['Passive', 1280],
    ['Logical', 310],
    ['Virtual', 90]
  ]
};

// ── 9. EOL / EOS Exposure ──
const DEFAULT_EOL_DYNAMIC: Record<DayRangeOption, {
  total: string;
  note: string;
  rows: [string, number, number[]][];
}> = {
  '7d': {
    total: '3,870',
    note: 'Active equipment and its cards carry 80% of the exposure, mostly Ericsson and Nokia legacy generations with Cisco and Ciena line cards; 1,240 of these assets go end-of-support within 6 months.',
    rows: [
      ['Active', 3100, [30, 26, 22, 10, 6, 6]],
      ['Passive', 540, [0, 0, 0, 0, 0, 100]],
      ['Logical', 170, [26, 34, 24, 0, 8, 8]],
      ['Virtual', 60, [40, 36, 12, 0, 6, 6]]
    ]
  },
  '14d': {
    total: '3,890',
    note: 'Active equipment carries 80% of exposure; 1,260 assets go end-of-support within 6 months.',
    rows: [
      ['Active', 3120, [30, 26, 22, 10, 6, 6]],
      ['Passive', 540, [0, 0, 0, 0, 0, 100]],
      ['Logical', 170, [26, 34, 24, 0, 8, 8]],
      ['Virtual', 60, [40, 36, 12, 0, 6, 6]]
    ]
  },
  '30d': {
    total: '3,940',
    note: 'Active equipment carries 80% of exposure; 1,290 assets go end-of-support within 6 months.',
    rows: [
      ['Active', 3160, [30, 26, 22, 10, 6, 6]],
      ['Passive', 550, [0, 0, 0, 0, 0, 100]],
      ['Logical', 170, [26, 34, 24, 0, 8, 8]],
      ['Virtual', 60, [40, 36, 12, 0, 6, 6]]
    ]
  },
  '90d': {
    total: '4,120',
    note: 'Active equipment carries 80% of exposure; 1,380 assets go end-of-support within 6 months.',
    rows: [
      ['Active', 3310, [30, 26, 22, 10, 6, 6]],
      ['Passive', 580, [0, 0, 0, 0, 0, 100]],
      ['Logical', 170, [26, 34, 24, 0, 8, 8]],
      ['Virtual', 60, [40, 36, 12, 0, 6, 6]]
    ]
  },
  '12m': {
    total: '4,680',
    note: 'Active equipment carried 80% of exposure; 1,640 assets went end-of-support during this year.',
    rows: [
      ['Active', 3740, [30, 26, 22, 10, 6, 6]],
      ['Passive', 660, [0, 0, 0, 0, 0, 100]],
      ['Logical', 210, [26, 34, 24, 0, 8, 8]],
      ['Virtual', 70, [40, 36, 12, 0, 6, 6]]
    ]
  }
};

// ── 10. OS Drift ──
const DEFAULT_DRIFT_DYNAMIC: Record<DayRangeOption, {
  total: string;
  activeWithVersion: string;
  cve: string;
  noVersion: string;
  note: string;
  rows: [string, number][];
}> = {
  '7d': {
    total: '2,140',
    activeWithVersion: '61,740',
    cve: '612',
    noVersion: '3,940',
    note: 'Most common single offender: Cisco IOS XR 7.3.2 on cell-site routers — itself vendor-EoL — 486 devices.',
    rows: [
      ['Cisco', 720],
      ['Nokia', 540],
      ['Huawei', 380],
      ['Juniper', 290],
      ['Others', 210]
    ]
  },
  '14d': {
    total: '2,180',
    activeWithVersion: '61,250',
    cve: '624',
    noVersion: '3,990',
    note: 'Most common single offender: Cisco IOS XR 7.3.2 on cell-site routers — itself vendor-EoL — 492 devices.',
    rows: [
      ['Cisco', 730],
      ['Nokia', 550],
      ['Huawei', 390],
      ['Juniper', 295],
      ['Others', 215]
    ]
  },
  '30d': {
    total: '2,240',
    activeWithVersion: '60,330',
    cve: '648',
    noVersion: '4,080',
    note: 'Most common single offender: Cisco IOS XR 7.3.2 on cell-site routers — itself vendor-EoL — 504 devices.',
    rows: [
      ['Cisco', 750],
      ['Nokia', 570],
      ['Huawei', 400],
      ['Juniper', 300],
      ['Others', 220]
    ]
  },
  '90d': {
    total: '2,460',
    activeWithVersion: '57,530',
    cve: '710',
    noVersion: '4,320',
    note: 'Most common single offender: Cisco IOS XR 7.3.2 on cell-site routers — 540 devices undergoing upgrade batching.',
    rows: [
      ['Cisco', 820],
      ['Nokia', 620],
      ['Huawei', 440],
      ['Juniper', 330],
      ['Others', 250]
    ]
  },
  '12m': {
    total: '2,890',
    activeWithVersion: '49,280',
    cve: '840',
    noVersion: '4,920',
    note: 'Baseline compliance was established across H2, resolving 620 older kernel anomalies.',
    rows: [
      ['Cisco', 960],
      ['Nokia', 740],
      ['Huawei', 510],
      ['Juniper', 380],
      ['Others', 300]
    ]
  }
};

// ── 11. Spares Coverage Risk ──
const DEFAULT_SPARES_DYNAMIC: Record<DayRangeOption, {
  titleCount: string;
  note: string;
  rows: [string, number, number][];
}> = {
  '7d': {
    titleCount: '6',
    note: 'Two of the six are also on the EOL list (ASR 920, Radio 4480), so replacement rather than restocking is the likely fix.',
    rows: [
      ['Nokia AirScale ASIA', 1980, 12],
      ['Cisco ASR 920', 1350, 8],
      ['Ericsson Radio 4480', 2420, 31],
      ['Ciena 6500 line card', 860, 9],
      ['Huawei ATN 910C', 1120, 14],
      ['Nokia 7250 IXR-e', 640, 7]
    ]
  },
  '14d': {
    titleCount: '6',
    note: 'Two of the six are also on the EOL list (ASR 920, Radio 4480), so replacement rather than restocking is the likely fix.',
    rows: [
      ['Nokia AirScale ASIA', 1960, 12],
      ['Cisco ASR 920', 1340, 8],
      ['Ericsson Radio 4480', 2400, 31],
      ['Ciena 6500 line card', 855, 9],
      ['Huawei ATN 910C', 1110, 14],
      ['Nokia 7250 IXR-e', 635, 7]
    ]
  },
  '30d': {
    titleCount: '6',
    note: 'Two of the six are also on the EOL list (ASR 920, Radio 4480), so replacement rather than restocking is the likely fix.',
    rows: [
      ['Nokia AirScale ASIA', 1940, 11],
      ['Cisco ASR 920', 1320, 7],
      ['Ericsson Radio 4480', 2360, 29],
      ['Ciena 6500 line card', 840, 8],
      ['Huawei ATN 910C', 1090, 13],
      ['Nokia 7250 IXR-e', 620, 6]
    ]
  },
  '90d': {
    titleCount: '7',
    note: 'Three of the seven are on the EOL list, driving planned fleet modernisation.',
    rows: [
      ['Nokia AirScale ASIA', 1880, 10],
      ['Cisco ASR 920', 1280, 6],
      ['Ericsson Radio 4480', 2280, 26],
      ['Ciena 6500 line card', 810, 7],
      ['Huawei ATN 910C', 1040, 11],
      ['Nokia 7250 IXR-e', 590, 5],
      ['Juniper ACX5448', 420, 4]
    ]
  },
  '12m': {
    titleCount: '8',
    note: 'Four models had acute depot stock gaps resolved through supplier batch replenishment.',
    rows: [
      ['Nokia AirScale ASIA', 1640, 8],
      ['Cisco ASR 920', 1120, 5],
      ['Ericsson Radio 4480', 1980, 21],
      ['Ciena 6500 line card', 720, 6],
      ['Huawei ATN 910C', 920, 9],
      ['Nokia 7250 IXR-e', 510, 4],
      ['Juniper ACX5448', 360, 3],
      ['ZTE ZXCTN 6180', 290, 2]
    ]
  }
};

// ── 12. Not Reconfirmed ──
const DEFAULT_NOT_RECONFIRMED_DYNAMIC: Record<DayRangeOption, {
  title: string;
  count: string;
  delta: string;
  stale30: string;
  items: Array<{ name: string; count: string }>;
}> = {
  '7d': {
    title: 'Not reconfirmed in 7+ days',
    count: '2,840',
    delta: '↓180 vs last week',
    stale30: '612',
    items: [
      { name: 'Active · element not discovered 7+ days', count: '1,180' },
      { name: 'Active · component position not reconfirmed', count: '960' },
      { name: 'Logical · port mapping not reconfirmed', count: '360' },
      { name: 'Passive · not surveyed 12+ months', count: '280' },
      { name: 'Virtual · host mapping not reconfirmed', count: '60' }
    ]
  },
  '14d': {
    title: 'Not reconfirmed in 14+ days',
    count: '3,120',
    delta: '↓140 vs previous fortnight',
    stale30: '680',
    items: [
      { name: 'Active · element not discovered 14+ days', count: '1,290' },
      { name: 'Active · component position not reconfirmed', count: '1,040' },
      { name: 'Logical · port mapping not reconfirmed', count: '390' },
      { name: 'Passive · not surveyed 12+ months', count: '320' },
      { name: 'Virtual · host mapping not reconfirmed', count: '80' }
    ]
  },
  '30d': {
    title: 'Not reconfirmed in 30+ days',
    count: '3,480',
    delta: '↓210 vs last month',
    stale30: '820',
    items: [
      { name: 'Active · element not discovered 30+ days', count: '1,420' },
      { name: 'Active · component position not reconfirmed', count: '1,160' },
      { name: 'Logical · port mapping not reconfirmed', count: '440' },
      { name: 'Passive · not surveyed 12+ months', count: '380' },
      { name: 'Virtual · host mapping not reconfirmed', count: '80' }
    ]
  },
  '90d': {
    title: 'Not reconfirmed in 90+ days',
    count: '4,260',
    delta: '↓380 vs last quarter',
    stale30: '1,140',
    items: [
      { name: 'Active · element not discovered 90+ days', count: '1,740' },
      { name: 'Active · component position not reconfirmed', count: '1,380' },
      { name: 'Logical · port mapping not reconfirmed', count: '520' },
      { name: 'Passive · not surveyed 12+ months', count: '480' },
      { name: 'Virtual · host mapping not reconfirmed', count: '140' }
    ]
  },
  '12m': {
    title: 'Not reconfirmed in 12+ months',
    count: '6,120',
    delta: '↓890 vs previous year',
    stale30: '1,840',
    items: [
      { name: 'Active · element not discovered 12+ months', count: '2,420' },
      { name: 'Active · component position not reconfirmed', count: '1,980' },
      { name: 'Logical · port mapping not reconfirmed', count: '760' },
      { name: 'Passive · not surveyed 12+ months', count: '740' },
      { name: 'Virtual · host mapping not reconfirmed', count: '220' }
    ]
  }
};

// ── 13. Quality Rows & Cross Links ──
const DEFAULT_QUALITY_ROWS_DYNAMIC: Record<DayRangeOption, QualityRow[]> = {
  '7d': [
    { name: 'Active', color: ACT, v1: '95%', c1: hc(95), v2: '92%', c2: hc(92), v3: '93%', c3: hc(93), v4: '0.5%', c4: GOOD, v5: '0.6%', c5: GOOD },
    { name: 'Passive', color: PAS, v1: '86%', c1: hc(86), v2: '81%', c2: hc(81), v3: '72%', c3: hc(72), v4: '1.4%', c4: WARN, v5: '2.1%', c5: WARN },
    { name: 'Virtual', color: VIR, v1: '97%', c1: hc(97), v2: '95%', c2: hc(95), v3: '96%', c3: hc(96), v4: '0.2%', c4: GOOD, v5: '0.3%', c5: GOOD },
    { name: 'Logical', color: LOG, v1: '94%', c1: hc(94), v2: '92%', c2: hc(92), v3: '90%', c3: hc(90), v4: '0.5%', c4: GOOD, v5: '0.9%', c5: GOOD }
  ],
  '14d': [
    { name: 'Active', color: ACT, v1: '95%', c1: hc(95), v2: '92%', c2: hc(92), v3: '92%', c3: hc(92), v4: '0.5%', c4: GOOD, v5: '0.7%', c5: GOOD },
    { name: 'Passive', color: PAS, v1: '85%', c1: hc(85), v2: '80%', c2: hc(80), v3: '71%', c3: hc(71), v4: '1.5%', c4: WARN, v5: '2.2%', c5: WARN },
    { name: 'Virtual', color: VIR, v1: '97%', c1: hc(97), v2: '95%', c2: hc(95), v3: '95%', c3: hc(95), v4: '0.2%', c4: GOOD, v5: '0.3%', c5: GOOD },
    { name: 'Logical', color: LOG, v1: '94%', c1: hc(94), v2: '91%', c2: hc(91), v3: '89%', c3: hc(89), v4: '0.6%', c4: GOOD, v5: '1.0%', c5: GOOD }
  ],
  '30d': [
    { name: 'Active', color: ACT, v1: '94%', c1: hc(94), v2: '91%', c2: hc(91), v3: '90%', c3: hc(90), v4: '0.6%', c4: GOOD, v5: '0.8%', c5: GOOD },
    { name: 'Passive', color: PAS, v1: '84%', c1: hc(84), v2: '79%', c2: hc(79), v3: '69%', c3: hc(69), v4: '1.6%', c4: WARN, v5: '2.4%', c5: WARN },
    { name: 'Virtual', color: VIR, v1: '96%', c1: hc(96), v2: '94%', c2: hc(94), v3: '94%', c3: hc(94), v4: '0.3%', c4: GOOD, v5: '0.4%', c5: GOOD },
    { name: 'Logical', color: LOG, v1: '93%', c1: hc(93), v2: '90%', c2: hc(90), v3: '88%', c3: hc(88), v4: '0.7%', c4: GOOD, v5: '1.1%', c5: WARN }
  ],
  '90d': [
    { name: 'Active', color: ACT, v1: '93%', c1: hc(93), v2: '90%', c2: hc(90), v3: '87%', c3: hc(87), v4: '0.8%', c4: GOOD, v5: '1.1%', c5: WARN },
    { name: 'Passive', color: PAS, v1: '82%', c1: hc(82), v2: '76%', c2: hc(76), v3: '65%', c3: hc(65), v4: '1.9%', c4: WARN, v5: '2.8%', c5: WARN },
    { name: 'Virtual', color: VIR, v1: '95%', c1: hc(95), v2: '93%', c2: hc(93), v3: '92%', c3: hc(92), v4: '0.4%', c4: GOOD, v5: '0.5%', c5: GOOD },
    { name: 'Logical', color: LOG, v1: '91%', c1: hc(91), v2: '88%', c2: hc(88), v3: '85%', c3: hc(85), v4: '0.9%', c4: GOOD, v5: '1.4%', c5: WARN }
  ],
  '12m': [
    { name: 'Active', color: ACT, v1: '91%', c1: hc(91), v2: '88%', c2: hc(88), v3: '82%', c3: hc(82), v4: '1.1%', c4: WARN, v5: '1.6%', c5: WARN },
    { name: 'Passive', color: PAS, v1: '78%', c1: hc(78), v2: '71%', c2: hc(71), v3: '58%', c3: hc(58), v4: '2.4%', c4: WARN, v5: '3.6%', c5: CRIT },
    { name: 'Virtual', color: VIR, v1: '93%', c1: hc(93), v2: '91%', c2: hc(91), v3: '88%', c3: hc(88), v4: '0.5%', c4: GOOD, v5: '0.8%', c5: GOOD },
    { name: 'Logical', color: LOG, v1: '88%', c1: hc(88), v2: '85%', c2: hc(85), v3: '80%', c3: hc(80), v4: '1.2%', c4: WARN, v5: '1.9%', c5: WARN }
  ]
};

const DEFAULT_CROSS_LINKS_DYNAMIC: Record<DayRangeOption, CrossLink[]> = {
  '7d': [
    { name: 'Logical object ↔ active port', value: '93%', color: hc(93) },
    { name: 'Virtual function ↔ active host / cluster', value: '99%', color: hc(99) },
    { name: 'Passive span ↔ active termination (ODF / port)', value: '88%', color: hc(88) },
    { name: 'Active element ↔ site & rack position', value: '95%', color: hc(95) },
    { name: 'Passive antenna ↔ cell', value: '90%', color: hc(90) },
    { name: 'IP address ↔ interface', value: '91%', color: hc(91) },
    { name: 'Service ↔ end-to-end path', value: '86%', color: hc(86) }
  ],
  '14d': [
    { name: 'Logical object ↔ active port', value: '93%', color: hc(93) },
    { name: 'Virtual function ↔ active host / cluster', value: '99%', color: hc(99) },
    { name: 'Passive span ↔ active termination (ODF / port)', value: '88%', color: hc(88) },
    { name: 'Active element ↔ site & rack position', value: '95%', color: hc(95) },
    { name: 'Passive antenna ↔ cell', value: '90%', color: hc(90) },
    { name: 'IP address ↔ interface', value: '90%', color: hc(90) },
    { name: 'Service ↔ end-to-end path', value: '85%', color: hc(85) }
  ],
  '30d': [
    { name: 'Logical object ↔ active port', value: '92%', color: hc(92) },
    { name: 'Virtual function ↔ active host / cluster', value: '98%', color: hc(98) },
    { name: 'Passive span ↔ active termination (ODF / port)', value: '87%', color: hc(87) },
    { name: 'Active element ↔ site & rack position', value: '94%', color: hc(94) },
    { name: 'Passive antenna ↔ cell', value: '89%', color: hc(89) },
    { name: 'IP address ↔ interface', value: '89%', color: hc(89) },
    { name: 'Service ↔ end-to-end path', value: '85%', color: hc(85) }
  ],
  '90d': [
    { name: 'Logical object ↔ active port', value: '91%', color: hc(91) },
    { name: 'Virtual function ↔ active host / cluster', value: '98%', color: hc(98) },
    { name: 'Passive span ↔ active termination (ODF / port)', value: '85%', color: hc(85) },
    { name: 'Active element ↔ site & rack position', value: '92%', color: hc(92) },
    { name: 'Passive antenna ↔ cell', value: '87%', color: hc(87) },
    { name: 'IP address ↔ interface', value: '87%', color: hc(87) },
    { name: 'Service ↔ end-to-end path', value: '82%', color: hc(82) }
  ],
  '12m': [
    { name: 'Logical object ↔ active port', value: '88%', color: hc(88) },
    { name: 'Virtual function ↔ active host / cluster', value: '97%', color: hc(97) },
    { name: 'Passive span ↔ active termination (ODF / port)', value: '81%', color: hc(81) },
    { name: 'Active element ↔ site & rack position', value: '89%', color: hc(89) },
    { name: 'Passive antenna ↔ cell', value: '84%', color: hc(84) },
    { name: 'IP address ↔ interface', value: '84%', color: hc(84) },
    { name: 'Service ↔ end-to-end path', value: '78%', color: hc(78) }
  ]
};

// ── 14. Discovery & Recon (Tier 5) ──
const DEFAULT_RECON_DYNAMIC: Record<DayRangeOption, {
  invOnly: string;
  matched: string;
  netOnly: string;
  gaps: Array<{ name: string; value: string }>;
}> = {
  '7d': {
    invOnly: '778',
    matched: '119,840',
    netOnly: '224',
    gaps: [
      { name: 'Software version drift', value: '94' },
      { name: 'Port / interface mismatch', value: '62' },
      { name: 'Capacity mismatch', value: '58' },
      { name: 'Survey vs GIS position mismatch', value: '41' },
      { name: 'Location mismatch', value: '22' }
    ]
  },
  '14d': {
    invOnly: '810',
    matched: '118,920',
    netOnly: '242',
    gaps: [
      { name: 'Software version drift', value: '182' },
      { name: 'Port / interface mismatch', value: '118' },
      { name: 'Capacity mismatch', value: '110' },
      { name: 'Survey vs GIS position mismatch', value: '84' },
      { name: 'Location mismatch', value: '48' }
    ]
  },
  '30d': {
    invOnly: '890',
    matched: '116,400',
    netOnly: '280',
    gaps: [
      { name: 'Software version drift', value: '363' },
      { name: 'Port / interface mismatch', value: '231' },
      { name: 'Capacity mismatch', value: '221' },
      { name: 'Survey vs GIS position mismatch', value: '186' },
      { name: 'Location mismatch', value: '96' }
    ]
  },
  '90d': {
    invOnly: '1,040',
    matched: '111,200',
    netOnly: '360',
    gaps: [
      { name: 'Software version drift', value: '840' },
      { name: 'Port / interface mismatch', value: '520' },
      { name: 'Capacity mismatch', value: '480' },
      { name: 'Survey vs GIS position mismatch', value: '390' },
      { name: 'Location mismatch', value: '210' }
    ]
  },
  '12m': {
    invOnly: '1,420',
    matched: '98,400',
    netOnly: '580',
    gaps: [
      { name: 'Software version drift', value: '2,240' },
      { name: 'Port / interface mismatch', value: '1,380' },
      { name: 'Capacity mismatch', value: '1,210' },
      { name: 'Survey vs GIS position mismatch', value: '940' },
      { name: 'Location mismatch', value: '520' }
    ]
  }
};

// ── 15. Support & Ageing ──
const DEFAULT_SUPPORT_DYNAMIC: Record<DayRangeOption, {
  eos: string;
  war: string;
  spares: string;
  fibre: string;
  contracts: string;
  lic: string;
  age: string;
}> = {
  '7d': { eos: '3,870', war: '1,240', spares: '6,112', fibre: '1,860 km', contracts: '214', lic: '1,380', age: '5.8 yrs' },
  '14d': { eos: '3,890', war: '1,280', spares: '6,080', fibre: '1,880 km', contracts: '220', lic: '1,410', age: '5.8 yrs' },
  '30d': { eos: '3,940', war: '1,320', spares: '5,980', fibre: '1,910 km', contracts: '232', lic: '1,450', age: '5.9 yrs' },
  '90d': { eos: '4,120', war: '1,480', spares: '5,640', fibre: '1,980 km', contracts: '260', lic: '1,560', age: '6.1 yrs' },
  '12m': { eos: '4,680', war: '1,840', spares: '4,920', fibre: '2,140 km', contracts: '340', lic: '1,890', age: '6.4 yrs' }
};

// ── 16. Drill-down Bottom 5 Tiles ──
const DEFAULT_BOTTOM_NAVIGATE_DYNAMIC: Record<DayRangeOption, Array<{ count: string; name: string; where: string; color: string; route: string }>> = {
  '7d': [
    { count: '65,680', name: 'Active elements', where: 'Resources › Physical', color: ACT, route: '/inventory/physical' },
    { count: '69,730', name: 'Passive assets', where: 'Resources › Passive', color: PAS, route: '/inventory/passive' },
    { count: '2,860', name: 'Virtual functions', where: 'Resources › Virtual', color: VIR, route: '/inventory/virtual' },
    { count: '57,010', name: 'Logical objects', where: 'Connectivity · Services', color: LOG, route: '/inventory/links' },
    { count: '4,218', name: 'Locations and sites', where: 'Location', color: '#374151', route: '/inventory/location' }
  ],
  '14d': [
    { count: '65,240', name: 'Active elements', where: 'Resources › Physical', color: ACT, route: '/inventory/physical' },
    { count: '69,200', name: 'Passive assets', where: 'Resources › Passive', color: PAS, route: '/inventory/passive' },
    { count: '2,780', name: 'Virtual functions', where: 'Resources › Virtual', color: VIR, route: '/inventory/virtual' },
    { count: '55,620', name: 'Logical objects', where: 'Connectivity · Services', color: LOG, route: '/inventory/links' },
    { count: '4,210', name: 'Locations and sites', where: 'Location', color: '#374151', route: '/inventory/location' }
  ],
  '30d': [
    { count: '64,410', name: 'Active elements', where: 'Resources › Physical', color: ACT, route: '/inventory/physical' },
    { count: '68,400', name: 'Passive assets', where: 'Resources › Passive', color: PAS, route: '/inventory/passive' },
    { count: '2,620', name: 'Virtual functions', where: 'Resources › Virtual', color: VIR, route: '/inventory/virtual' },
    { count: '52,580', name: 'Logical objects', where: 'Connectivity · Services', color: LOG, route: '/inventory/links' },
    { count: '4,192', name: 'Locations and sites', where: 'Location', color: '#374151', route: '/inventory/location' }
  ],
  '90d': [
    { count: '61,850', name: 'Active elements', where: 'Resources › Physical', color: ACT, route: '/inventory/physical' },
    { count: '65,100', name: 'Passive assets', where: 'Resources › Passive', color: PAS, route: '/inventory/passive' },
    { count: '2,240', name: 'Virtual functions', where: 'Resources › Virtual', color: VIR, route: '/inventory/virtual' },
    { count: '46,660', name: 'Logical objects', where: 'Connectivity · Services', color: LOG, route: '/inventory/links' },
    { count: '4,140', name: 'Locations and sites', where: 'Location', color: '#374151', route: '/inventory/location' }
  ],
  '12m': [
    { count: '54,200', name: 'Active elements', where: 'Resources › Physical', color: ACT, route: '/inventory/physical' },
    { count: '58,900', name: 'Passive assets', where: 'Resources › Passive', color: PAS, route: '/inventory/passive' },
    { count: '1,600', name: 'Virtual functions', where: 'Resources › Virtual', color: VIR, route: '/inventory/virtual' },
    { count: '34,900', name: 'Logical objects', where: 'Connectivity · Services', color: LOG, route: '/inventory/links' },
    { count: '3,920', name: 'Locations and sites', where: 'Location', color: '#374151', route: '/inventory/location' }
  ]
};

// ── 17. Sites Needing Attention ──
const DEFAULT_SITES_DYNAMIC: Record<DayRangeOption, SiteRow[]> = {
  '7d': [
    { name: 'GUW-SITE-0094', region: 'North-East', kind: 'Macro cell site', active: '26', passive: '41', health: '72%', healthW: '72%', healthColor: hc(72), issues: 11, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'KOL-OTN-04', region: 'East', kind: 'Transport hub', active: '910', passive: '1,260', health: '82%', healthW: '82%', healthColor: hc(82), issues: 9, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-SITE-0608', region: 'East', kind: 'Macro cell site', active: '31', passive: '38', health: '81%', healthW: '81%', healthColor: hc(81), issues: 7, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'NAG-MW-HUB-07', region: 'Central', kind: 'Microwave hub', active: '640', passive: '212', health: '86%', healthW: '86%', healthColor: hc(86), issues: 6, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'PUN-EDGE-07', region: 'West', kind: 'Edge data centre', active: '96', passive: '184', health: '85%', healthW: '85%', healthColor: hc(85), issues: 5, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-DC-04', region: 'East', kind: 'Core data centre', active: '318', passive: '402', health: '89%', healthW: '89%', healthColor: hc(89), issues: 4, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'HYD-AGG-11', region: 'Central', kind: 'Aggregation node', active: '860', passive: '690', health: '90%', healthW: '90%', healthColor: hc(90), issues: 3, status: 'Healthy', badgeBg: statusBg('Healthy'), badgeFg: statusFg('Healthy') }
  ],
  '14d': [
    { name: 'GUW-SITE-0094', region: 'North-East', kind: 'Macro cell site', active: '26', passive: '41', health: '70%', healthW: '70%', healthColor: hc(70), issues: 14, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'KOL-OTN-04', region: 'East', kind: 'Transport hub', active: '905', passive: '1,250', health: '80%', healthW: '80%', healthColor: hc(80), issues: 11, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-SITE-0608', region: 'East', kind: 'Macro cell site', active: '31', passive: '38', health: '79%', healthW: '79%', healthColor: hc(79), issues: 9, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'NAG-MW-HUB-07', region: 'Central', kind: 'Microwave hub', active: '635', passive: '210', health: '85%', healthW: '85%', healthColor: hc(85), issues: 8, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'PUN-EDGE-07', region: 'West', kind: 'Edge data centre', active: '95', passive: '182', health: '84%', healthW: '84%', healthColor: hc(84), issues: 7, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-DC-04', region: 'East', kind: 'Core data centre', active: '316', passive: '398', health: '88%', healthW: '88%', healthColor: hc(88), issues: 6, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'HYD-AGG-11', region: 'Central', kind: 'Aggregation node', active: '855', passive: '685', health: '89%', healthW: '89%', healthColor: hc(89), issues: 4, status: 'Healthy', badgeBg: statusBg('Healthy'), badgeFg: statusFg('Healthy') }
  ],
  '30d': [
    { name: 'GUW-SITE-0094', region: 'North-East', kind: 'Macro cell site', active: '26', passive: '41', health: '68%', healthW: '68%', healthColor: hc(68), issues: 18, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'KOL-OTN-04', region: 'East', kind: 'Transport hub', active: '890', passive: '1,240', health: '78%', healthW: '78%', healthColor: hc(78), issues: 14, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-SITE-0608', region: 'East', kind: 'Macro cell site', active: '30', passive: '37', health: '77%', healthW: '77%', healthColor: hc(77), issues: 12, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'NAG-MW-HUB-07', region: 'Central', kind: 'Microwave hub', active: '625', passive: '208', health: '83%', healthW: '83%', healthColor: hc(83), issues: 10, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'PUN-EDGE-07', region: 'West', kind: 'Edge data centre', active: '92', passive: '180', health: '82%', healthW: '82%', healthColor: hc(82), issues: 9, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-DC-04', region: 'East', kind: 'Core data centre', active: '310', passive: '394', health: '86%', healthW: '86%', healthColor: hc(86), issues: 8, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'HYD-AGG-11', region: 'Central', kind: 'Aggregation node', active: '845', passive: '675', health: '88%', healthW: '88%', healthColor: hc(88), issues: 5, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') }
  ],
  '90d': [
    { name: 'GUW-SITE-0094', region: 'North-East', kind: 'Macro cell site', active: '25', passive: '39', health: '64%', healthW: '64%', healthColor: hc(64), issues: 24, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'KOL-OTN-04', region: 'East', kind: 'Transport hub', active: '860', passive: '1,200', health: '74%', healthW: '74%', healthColor: hc(74), issues: 19, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'KOL-SITE-0608', region: 'East', kind: 'Macro cell site', active: '29', passive: '36', health: '73%', healthW: '73%', healthColor: hc(73), issues: 16, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'NAG-MW-HUB-07', region: 'Central', kind: 'Microwave hub', active: '605', passive: '198', health: '80%', healthW: '80%', healthColor: hc(80), issues: 14, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'PUN-EDGE-07', region: 'West', kind: 'Edge data centre', active: '88', passive: '172', health: '79%', healthW: '79%', healthColor: hc(79), issues: 12, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-DC-04', region: 'East', kind: 'Core data centre', active: '298', passive: '380', health: '83%', healthW: '83%', healthColor: hc(83), issues: 11, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'HYD-AGG-11', region: 'Central', kind: 'Aggregation node', active: '820', passive: '650', health: '85%', healthW: '85%', healthColor: hc(85), issues: 8, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') }
  ],
  '12m': [
    { name: 'GUW-SITE-0094', region: 'North-East', kind: 'Macro cell site', active: '24', passive: '36', health: '58%', healthW: '58%', healthColor: hc(58), issues: 38, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'KOL-OTN-04', region: 'East', kind: 'Transport hub', active: '780', passive: '1,090', health: '67%', healthW: '67%', healthColor: hc(67), issues: 31, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'KOL-SITE-0608', region: 'East', kind: 'Macro cell site', active: '26', passive: '32', health: '69%', healthW: '69%', healthColor: hc(69), issues: 26, status: 'At risk', badgeBg: statusBg('At risk'), badgeFg: statusFg('At risk') },
    { name: 'NAG-MW-HUB-07', region: 'Central', kind: 'Microwave hub', active: '540', passive: '175', health: '74%', healthW: '74%', healthColor: hc(74), issues: 22, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'PUN-EDGE-07', region: 'West', kind: 'Edge data centre', active: '76', passive: '154', health: '76%', healthW: '76%', healthColor: hc(76), issues: 19, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'KOL-DC-04', region: 'East', kind: 'Core data centre', active: '260', passive: '340', health: '79%', healthW: '79%', healthColor: hc(79), issues: 18, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') },
    { name: 'HYD-AGG-11', region: 'Central', kind: 'Aggregation node', active: '730', passive: '580', health: '81%', healthW: '81%', healthColor: hc(81), issues: 14, status: 'Watch', badgeBg: statusBg('Watch'), badgeFg: statusFg('Watch') }
  ]
};

// ── 18. Services on Inventory ──
const DEFAULT_SERVICES_DYNAMIC: Record<DayRangeOption, {
  active: string;
  e2e: string;
  rows: ServiceRow[];
}> = {
  '7d': {
    active: '18,420',
    e2e: '86%',
    rows: [
      { name: 'Mobile backhaul (per site)', count: '4,218', path: '91%', color: hc(91) },
      { name: 'Enterprise L3VPN', count: '6,840', path: '88%', color: hc(88) },
      { name: 'EVPN / E-Line / E-LAN', count: '3,080', path: '84%', color: hc(84) },
      { name: 'Wholesale wavelengths', count: '2,140', path: '82%', color: hc(82) },
      { name: 'Dark fibre leases', count: '1,260', path: '76%', color: hc(76) },
      { name: 'Internet / peering', count: '882', path: '90%', color: hc(90) }
    ]
  },
  '14d': {
    active: '18,310',
    e2e: '85.6%',
    rows: [
      { name: 'Mobile backhaul (per site)', count: '4,210', path: '91%', color: hc(91) },
      { name: 'Enterprise L3VPN', count: '6,810', path: '87%', color: hc(87) },
      { name: 'EVPN / E-Line / E-LAN', count: '3,050', path: '84%', color: hc(84) },
      { name: 'Wholesale wavelengths', count: '2,120', path: '81%', color: hc(81) },
      { name: 'Dark fibre leases', count: '1,250', path: '75%', color: hc(75) },
      { name: 'Internet / peering', count: '870', path: '89%', color: hc(89) }
    ]
  },
  '30d': {
    active: '18,120',
    e2e: '84.8%',
    rows: [
      { name: 'Mobile backhaul (per site)', count: '4,192', path: '90%', color: hc(90) },
      { name: 'Enterprise L3VPN', count: '6,740', path: '86%', color: hc(86) },
      { name: 'EVPN / E-Line / E-LAN', count: '3,010', path: '83%', color: hc(83) },
      { name: 'Wholesale wavelengths', count: '2,090', path: '80%', color: hc(80) },
      { name: 'Dark fibre leases', count: '1,230', path: '74%', color: hc(74) },
      { name: 'Internet / peering', count: '858', path: '88%', color: hc(88) }
    ]
  },
  '90d': {
    active: '17,640',
    e2e: '82.4%',
    rows: [
      { name: 'Mobile backhaul (per site)', count: '4,140', path: '88%', color: hc(88) },
      { name: 'Enterprise L3VPN', count: '6,520', path: '84%', color: hc(84) },
      { name: 'EVPN / E-Line / E-LAN', count: '2,920', path: '80%', color: hc(80) },
      { name: 'Wholesale wavelengths', count: '2,010', path: '78%', color: hc(78) },
      { name: 'Dark fibre leases', count: '1,190', path: '72%', color: hc(72) },
      { name: 'Internet / peering', count: '830', path: '86%', color: hc(86) }
    ]
  },
  '12m': {
    active: '15,480',
    e2e: '78.2%',
    rows: [
      { name: 'Mobile backhaul (per site)', count: '3,920', path: '84%', color: hc(84) },
      { name: 'Enterprise L3VPN', count: '5,780', path: '79%', color: hc(79) },
      { name: 'EVPN / E-Line / E-LAN', count: '2,540', path: '76%', color: hc(76) },
      { name: 'Wholesale wavelengths', count: '1,780', path: '74%', color: hc(74) },
      { name: 'Dark fibre leases', count: '1,040', path: '68%', color: hc(68) },
      { name: 'Internet / peering', count: '740', path: '82%', color: hc(82) }
    ]
  }
};

const DEFAULT_NET_RECORD_DYNAMIC: Record<DayRangeOption, {
  label: string;
  added: string;
  retired: string;
  net: string;
}> = {
  '7d': { label: 'Last 7 days, daily', added: '+9,640', retired: '−2,810', net: '+6,830' },
  '14d': { label: 'Last 14 days, daily', added: '+19,800', retired: '−5,920', net: '+13,880' },
  '30d': { label: 'Last 30 days, weekly', added: '+41,200', retired: '−12,640', net: '+28,560' },
  '90d': { label: 'Last 90 days, monthly', added: '+126,400', retired: '−38,200', net: '+88,200' },
  '12m': { label: 'Last 12 months, monthly', added: '+492,000', retired: '−154,000', net: '+338,000' }
};

const DEFAULT_TREND_SERIES: Record<DayRangeOption, [string, number][]> = {
  '7d': [
    ['Mon', 142],
    ['Tue', 128],
    ['Wed', 151],
    ['Thu', 134],
    ['Fri', 96],
    ['Sat', 41],
    ['Sun', 38]
  ],
  '14d': [
    ['D1', 110],
    ['D2', 125],
    ['D3', 140],
    ['D4', 98],
    ['D5', 85],
    ['D6', 60],
    ['D7', 45],
    ['D8', 130],
    ['D9', 142],
    ['D10', 128],
    ['D11', 151],
    ['D12', 134],
    ['D13', 96],
    ['D14', 79]
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

const DEFAULT_ACTIVITY_BY_RANGE: Record<DayRangeOption, [string, string, string, string][]> = {
  '7d': [
    ['ADD', '24 cell-site routers auto-discovered in East', 'Discovery run #4,812', '12m ago'],
    ['FIX', 'Port mismatch resolved on KOL-AGG-04', 'Field recon (Kolkata)', '2h ago'],
    ['DECOM', '12 SDH nodes retired at MUM-CORE-01', 'CR-4491 · Decom team', '5h ago'],
    ['UPD', 'Firmware upgraded to IOS XR 7.5.1 on 48 CSRs', 'NetOps automation', '1d ago'],
    ['SURVEY', 'Fibre span verified: BLR-RING-04', 'GIS team (Bengaluru)', '2d ago'],
    ['ADD', '16 BBU chassis mapped to HYD-RAN-03', 'Inventory sync', '5d ago']
  ],
  '14d': [
    ['ADD', '48 cell-site routers auto-discovered in East & Central', 'Discovery run #4,810', '2h ago'],
    ['FIX', 'Port mismatch resolved on KOL-AGG-04 & DEL-AGG-02', 'Field recon', '1d ago'],
    ['DECOM', '28 SDH nodes retired at MUM-CORE-01 & CHN-HUB-02', 'CR-4485', '3d ago'],
    ['UPD', 'Firmware upgraded to IOS XR 7.5.1 on 112 CSRs', 'NetOps automation', '6d ago'],
    ['SURVEY', 'Fibre span verified: BLR-RING-04 & HYD-SPAN-09', 'GIS survey', '9d ago'],
    ['ADD', '32 BBU chassis mapped across South region', 'Inventory sync', '12d ago']
  ],
  '30d': [
    ['ADD', '41,200 records added to active and passive hierarchy', 'Discovery run #4,800', '2h ago'],
    ['FIX', '363 software version drift discrepancies auto-reconciled', 'Nightly audit job', '1d ago'],
    ['DECOM', '349 assets confirmed physically removed from sites', 'Decommission team', '4d ago'],
    ['UPD', 'OS baseline catalog updated for Q3 audit', 'SecOps baseline sync', '12d ago'],
    ['SURVEY', '1,240 km route length geo-referenced into GIS', 'Survey team East', '18d ago'],
    ['ADD', '46 NFVI Kubernetes clusters enrolled into Virtual bucket', 'CNF orchestrator', '26d ago']
  ],
  '90d': [
    ['ADD', '126,400 active and passive elements enrolled in Q3 rollout', 'Network expansion', '3d ago'],
    ['DECOM', '1,006 legacy copper and SDH elements decommissioned', 'Decommission Q3 batch', '14d ago'],
    ['UPD', 'Major OS migration wave: 1,840 nodes to release 22.4', 'Firmware engineering', '1mo ago'],
    ['SURVEY', 'State-wide passive fibre audit completed for Karnataka & Maharashtra', 'Field Operations', '1.5mo ago'],
    ['FIX', '840 stale optical transceivers cleansed across 18 DWDM sites', 'Asset cleanup drive', '2mo ago'],
    ['ADD', '180 5G UPF edge instances commissioned across 12 cities', 'Core engineering', '2.5mo ago']
  ],
  '12m': [
    ['ADD', '492,000 new inventory items added across FY26 5G expansion', 'Capital project launch', '1mo ago'],
    ['DECOM', '4,140 2G/3G nodes and copper pairs retired across national grid', 'Network sunset project', '3mo ago'],
    ['UPD', 'Unified Inventory data model v2 rolled out with 98% accuracy', 'Architecture board', '5mo ago'],
    ['SURVEY', '100% GIS alignment completed for 48,210 km optical network', 'GIS audit certification', '7mo ago'],
    ['FIX', 'Automated reconciliation engine deployed across 65k managed elements', 'Software release', '9mo ago'],
    ['ADD', 'Cloud-native 5G Core inventory mapping integrated with Kubernetes', 'VNF/CNF pipeline', '11mo ago']
  ]
};

/* ── Reconciliation pass ────────────────────────────────────────────────────
   Several figures above are hand-typed twice — once as a raw count and once as
   a label, headline or sentence — and had drifted apart (a total that was 200
   off its buckets, "1.45M" for 1,459,800, a summary sentence quoting 91.8% when
   the donut shows 92.2%, lifecycle bars named differently from their tiles so
   hovering one never lit the other, a headline that disagreed with the severity
   bars under it). The raw counts are the source of truth: every derived label
   is rebuilt from them here, once, so the two can no longer disagree.        */
const countOf = (s: string | number): number => {
  const m = String(s).replace(/,/g, '').trim().match(/^([\d.]+)\s*([kKmM]?)/);
  if (!m) return 0;
  const u = m[2].toLowerCase();
  return parseFloat(m[1]) * (u === 'm' ? 1e6 : u === 'k' ? 1e3 : 1);
};
const fmtCount = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n.toLocaleString('en-US'));

(Object.keys(DAY_RANGE_LABELS) as DayRangeOption[]).forEach(r => {
  /* total = sum of the four buckets; every label follows from the raw counts */
  const buckets = DEFAULT_BUCKET_SHARE_DATA[r];
  const raw: Record<string, number> = {};
  buckets.rows.forEach(row => { raw[row[0]] = row[2]; row[1] = fmtCount(row[2]); });
  const total = buckets.rows.reduce((a, row) => a + row[2], 0);
  const pct = (n: number) => (n / total) * 100;

  const T = DEFAULT_TOTAL_RECORDS_DATA[r];
  T.totalRaw = total;
  T.totalDisplay = fmtCount(total);
  buckets.centerLabel = T.totalDisplay;
  /* confirmed + stranded = 100%, so the stranded count is that share of the total */
  T.strandedVal = `${Math.round((total * parseFloat(T.stranded)) / 100 / 1000)}k`;

  buckets.summaryText = buckets.summaryText.replace(
    /(Physical inventory is )[\d.]+(% of records \(Active )[\d.]+(%, Passive )[\d.]+(%\)[\s\S]*?Connectivity holds )[\d.]+(% and Virtual )[\d.]+/,
    (_m, a, b, c, d, e) =>
      `${a}${pct(raw.Active + raw.Passive).toFixed(1)}${b}${pct(raw.Active).toFixed(1)}${c}${pct(raw.Passive).toFixed(1)}${d}${pct(raw.Connectivity).toFixed(1)}${e}${pct(raw.Virtual).toFixed(1)}`
  );

  DEFAULT_PARENTS_DATA_DYNAMIC[r].forEach(p => {
    p.children.forEach(c => { if (raw[c.name] != null) c.count = fmtCount(raw[c.name]); });
    p.count = fmtCount(p.children.reduce((a, c) => a + (raw[c.name] ?? 0), 0));
  });

  /* lifecycle: one name per state (tile and bar share it, so hover links them)
     and each share is that state's part of the lifecycle total */
  const life = DEFAULT_LIFECYCLE_DYNAMIC[r];
  const lifeTotal = life.states.reduce((a, s) => a + countOf(s.count), 0);
  life.bars.forEach((b, i) => {
    const s = life.states[i];
    if (!s) return;
    const share = (countOf(s.count) / lifeTotal) * 100;
    b.name = s.name;
    b.pct = `${Math.round(share)}%`;
    b.w = `${share.toFixed(1)}%`;
  });

  /* headline counts equal the sum of what sits under them */
  const iss = DEFAULT_ISSUES_DYNAMIC[r];
  iss.count = (iss.crit + iss.high + iss.med + iss.low).toLocaleString('en-US');
  const svc = DEFAULT_SERVICES_DYNAMIC[r];
  svc.active = svc.rows.reduce((a, row) => a + countOf(row.count), 0).toLocaleString('en-US');
});

/* ── Macro grouping for the Active and Virtual cards ────────────────────────
   Both cards used to list granular modules (RRU/AAU, BBU/DU, UPF, AMF …). They
   now show device / NFV-layer categories. Each category is the sum of named
   source rows, so the card still adds up to its bucket (Active = managed
   elements, Virtual = VNF/CNF instances) in every time window, and the original
   rows stay visible in each category's tooltip. Nothing here is a new number
   except the two hosting-infrastructure rows noted below.                     */
const ACTIVE_GROUPS: { name: string; from: string[] }[] = [
  { name: 'Routers (CSR / PE / Metro agg. / Core)', from: ['Cell-site routers (CSR)', 'Metro agg. & PE routers', 'Core / backbone routers (P)'] },
  { name: 'Switches (DC / Spine-leaf / Carrier Ethernet / Access)', from: ['Carrier Ethernet & access switches', 'Data centre & spine-leaf switches'] },
  { name: 'Optical & DWDM (ROADM / Transponder nodes)', from: ['DWDM / ROADM optical nodes'] },
  { name: 'RAN / Base stations (RRU / AAU / BBU / DU)', from: ['Radio units (RRU / AAU)', 'Baseband units (BBU / DU)'] },
  { name: 'Microwave nodes (IDU / ODU)', from: ['Microwave radios (IDU / ODU)'] },
  { name: 'Access / PON equipment (OLT shelves)', from: ['GPON / XGS-PON OLTs'] }
];

const VIRTUAL_GROUPS: { name: string; from: string[] }[] = [
  { name: 'Virtual routers & gateways (vPE / vBNG / vSecGW / vFirewall)', from: ['vRouter & vBNG (Transport / IP)', 'vFirewall & SecGW (Security Domain)'] },
  { name: 'Cloud core network functions (UPF / AMF / SMF / IMS / UDM)', from: ['5G UPF & Packet Core (UPF/SGW-U)', 'vIMS Core (CSCF / TAS / vSBC)', '5G/4G Control (AMF / MME / SMF)', 'UDM, UDR & Policy (PCF / PCRF)'] },
  { name: 'Virtualised RAN (vCU / vDU)', from: ['vRAN Cloud Units (vCU / vDU)'] },
  { name: 'SD-WAN & edge appliances (vCPE / Virtual Edge)', from: ['vCPE & SD-WAN Virtual Edge'] }
];

const INFRA_GROUP = 'Hosting infrastructure';

(Object.keys(DAY_RANGE_LABELS) as DayRangeOption[]).forEach(r => {
  const regroup = (panel: PanelCategory, groups: { name: string; from: string[] }[]) => {
    const byName = new Map(panel.items.map(i => [i.name, i]));
    const used = new Set<string>();
    const rows = groups.map(g => {
      const src = g.from.map(n => byName.get(n)).filter((x): x is PanelItem => !!x);
      src.forEach(x => used.add(x.name));
      return {
        name: g.name,
        total: src.reduce((a, x) => a + countOf(x.count), 0),
        members: src.map(x => `${x.name} ${x.count}`).join(' · ')
      };
    });
    /* a source row nobody claimed would silently drop out of the card's total */
    const orphan = panel.items.filter(i => !used.has(i.name));
    if (orphan.length) throw new Error(`Unmapped ${panel.title} rows (${r}): ${orphan.map(o => o.name).join(', ')}`);
    rows.sort((a, b) => b.total - a.total);
    const max = rows[0]?.total || 1;
    panel.items = rows.map(x => ({
      name: x.name,
      count: x.total.toLocaleString('en-US'),
      w: `${Math.round((x.total / max) * 100)}%`,
      members: x.members
    }));
  };

  const panels = DEFAULT_PANELS_DATA_DYNAMIC[r];
  const active = panels.find(p => p.title === 'Active (Physical)');
  const virtual = panels.find(p => p.title === 'Virtual (Logical)');
  if (active) regroup(active, ACTIVE_GROUPS);
  if (virtual) {
    regroup(virtual, VIRTUAL_GROUPS);
    /* Hosting infrastructure is not part of the VNF/CNF count (the Virtual bucket),
       so it sits under its own heading and its own scale. Pods and clusters come
       from this card's existing "Clusters · pods tracked" fact. Hypervisor / NFVI
       hosts have no source in the data yet: MOCK = 14 hosts per tracked cluster. */
    const tracked = virtual.facts.find(f => f.name.startsWith('Clusters'))?.value.split('·').map(t => countOf(t));
    if (tracked && tracked.length === 2) {
      const [clusters, pods] = tracked;
      const hosts = Math.round(clusters * 14);
      const top = Math.max(hosts, pods);
      virtual.items.push(
        { name: 'Hypervisors & NFVI compute hosts (ESXi / KVM / OpenStack)', count: hosts.toLocaleString('en-US'), w: `${Math.round((hosts / top) * 100)}%`, group: INFRA_GROUP },
        { name: 'Container pods on K8s worker nodes (hosting CNFs)', count: pods.toLocaleString('en-US'), w: `${Math.round((pods / top) * 100)}%`, group: INFRA_GROUP }
      );
    }
  }
});

/* ── Per-bucket health lines for the Active and Virtual cards ───────────────
   Open defects come from the KPI tiles' bucket figures and duplicate / orphan
   rates from the Quality table, so a card can never disagree with the tile or
   table that reports the same bucket. "Mapped to hosting cluster / server" is
   the same measure as the Virtual tile's "Mapped to host"; it is taken from
   the tile (the two had drifted apart in the 30d, 90d and 12m windows).      */
(Object.keys(DAY_RANGE_LABELS) as DayRangeOption[]).forEach(r => {
  const leafOf = (name: string) =>
    DEFAULT_PARENTS_DATA_DYNAMIC[r].flatMap(p => p.children).find(c => c.name === name);
  const quality = (name: string) => DEFAULT_QUALITY_ROWS_DYNAMIC[r].find(q => q.name === name);
  const addHealth = (title: string, bucket: string) => {
    const panel = DEFAULT_PANELS_DATA_DYNAMIC[r].find(p => p.title === title);
    const leaf = leafOf(bucket);
    const q = quality(bucket);
    if (!panel || !leaf || !q) return;
    /* every figure below is read from the section that already reports it */
    const eol = DEFAULT_EOL_DYNAMIC[r].rows.find(x => x[0] === bucket);
    const decom = DEFAULT_DECOM_BUCKET_DYNAMIC[r].find(x => x[0] === bucket);
    const stale = DEFAULT_NOT_RECONFIRMED_DYNAMIC[r].items
      .filter(i => i.name.startsWith(`${bucket} ·`))
      .reduce((a, i) => a + countOf(i.count), 0);
    const staleWindow = DEFAULT_NOT_RECONFIRMED_DYNAMIC[r].title.replace(/^Not reconfirmed in\s*/i, '');
    panel.facts.push(
      { name: 'Complete · integrity · fresh', value: `${q.v1} · ${q.v2} · ${q.v3}`, color: [q.c1, q.c2, q.c3].every(c => c === GOOD) ? GOOD : WARN },
      { name: 'Duplicate · orphan records', value: `${q.v4} · ${q.v5}`, color: q.c4 === GOOD && q.c5 === GOOD ? GOOD : WARN },
      { name: 'Open defects (critical · high)', value: `${leaf.critical} · ${leaf.high}`, color: leaf.critical ? CRIT : GOOD }
    );
    /* OS baseline drift is measured on active network elements only */
    if (bucket === 'Active') panel.facts.push({ name: 'Off approved OS baseline', value: DEFAULT_DRIFT_DYNAMIC[r].total, color: WARN });
    if (eol) panel.facts.push({ name: 'EOL / EOS exposed', value: eol[1].toLocaleString('en-US'), color: WARN });
    panel.facts.push({ name: `Not reconfirmed ${staleWindow}`, value: stale.toLocaleString('en-US'), color: WARN });
    if (decom) panel.facts.push({ name: `Decommissioned · ${DEFAULT_DECOM_DYNAMIC[r].periodLabel.toLowerCase()}`, value: decom[1].toLocaleString('en-US'), color: GOOD });
    return panel;
  };
  addHealth('Active (Physical)', 'Active');
  const virtualPanel = addHealth('Virtual (Logical)', 'Virtual');
  const mapped = leafOf('Virtual')?.coverage;
  const fact = virtualPanel?.facts.find(f => f.name === 'Mapped to hosting cluster / server');
  if (fact && mapped) fact.value = mapped;
});


/* ════════════════════════════════════════════════════════════════════════════
   The data center solution (src/solution.ts): the same datasets, counted from the data centers'
   records. The dashboard has no history for them, so every range shows the same current figures,
   and anything the data center records do not hold (links, services, VNFs, end-of-life, spares,
   field surveys) is zero or "—" rather than borrowed from the rest of the estate. */
const RANGES: DayRangeOption[] = ['7d', '14d', '30d', '90d', '12m'];
const eachRange = <T,>(f: (r: DayRangeOption) => T): Record<DayRangeOption, T> => Object.fromEntries(RANGES.map(r => [r, f(r)])) as Record<DayRangeOption, T>;
const fn = (x: number) => x.toLocaleString('en-US');
const pcs = (a: number, b: number, d = 0) => (b > 0 ? `${((a / b) * 100).toFixed(d)}%` : '—');
const NONE = '—';
const bars0 = (rows: [string, string, number][]) => {
  const max = Math.max(1, ...rows.map(r => r[2]));
  return rows.map(r => ({ name: r[0], count: r[1], w: `${Math.max(Math.round((r[2] / max) * 100), 2)}%` }));
};
const PERIOD: Record<DayRangeOption, string> = { '7d': 'vs last 7 days', '14d': 'vs last 14 days', '30d': 'vs last 30 days', '90d': 'vs last 90 days', '12m': 'vs last 12 months' };
const ISSUE_PERIOD: Record<DayRangeOption, string> = { '7d': 'this week', '14d': 'last 14 days', '30d': 'this month', '90d': 'this quarter', '12m': 'this year' };
const KIND = (d: DcSum) => (d.tier === 'Tier IV' ? 'Core data centre' : d.category === 'Edge' ? 'Edge data centre' : 'Regional data centre');

const DC_ACTIVITY_US_BY_RANGE: Record<DayRangeOption, [string, string, string, string][]> = {
  '7d': [
    ['ADD', '32 NVIDIA HGX H100 GPU nodes racked in AI-POD-2 at VA-DC-001 (Ashburn)', 'DCIM Auto-Provisioning', '14m ago'],
    ['FIX', 'OS version drift resolved: EOS 4.30.2M applied to 8 Arista spine switches', 'NetOps Automation (East)', '2h ago'],
    ['SURVEY', 'Physical U-space and structured cabling audit in Row-C at NJ-DC-012 (Secaucus)', 'DC Operations Team', '5h ago'],
    ['UPD', 'Thermal sensor & CRAC airflow thresholds rebalanced in Data Hall 2 at IL-DC-009 (Chicago)', 'Facilities Telemetry', '1d ago'],
    ['ADD', '24 Dell PowerEdge compute nodes & dual 100G RoCE NICs enrolled at TX-DC-005 (Dallas)', 'Discovery run #1,402', '3d ago'],
    ['DECOM', '16 legacy 1U compute servers retired and sanitized at CA-DC-020 (Los Angeles)', 'Asset Lifecycle Team', '5d ago']
  ],
  '14d': [
    ['ADD', '64 NVIDIA H100 nodes & 8 Quantum-2 InfiniBand switches deployed in Ashburn & Dallas', 'DC Rollout Batch #8', '2h ago'],
    ['FIX', '400G-QSFP-DD optical transceiver errors cleared on Pod-01 at CA-DC-008 (Santa Clara)', 'Hardware Engineering', '1d ago'],
    ['SURVEY', 'Full electrical feed & UPS redundancy audit completed across 51 racks at VA-DC-001', 'Critical Facilities Ops', '3d ago'],
    ['UPD', 'Firmware upgraded to Junos 23.4R2 on border routers across East region data centers', 'SecOps Release Job', '6d ago'],
    ['ADD', '12 Weka NVMe storage nodes commissioned in AI cluster at TX-DC-005 (Dallas)', 'Storage Engineering', '9d ago'],
    ['DECOM', '28 EOL top-of-rack switches decommissioned across NJ-DC-012 & OH-DC-016', 'CR-5102 · Decom team', '12d ago']
  ],
  '30d': [
    ['ADD', '1,240 devices and 348 racks verified across US data centers in Q3 discovery sweep', 'Discovery run #1,390', '2h ago'],
    ['FIX', '48 FortiGate 3700F security cluster interface drifts reconciled to baseline', 'Nightly Audit Engine', '1d ago'],
    ['SURVEY', '100% optical fibre cross-connect & ODF tray validation completed at VA-DC-001 & VA-DC-002', 'Field Survey Team', '4d ago'],
    ['UPD', 'Standard DCIM baseline applied to 1,840 cooling, PDU and CDU telemetry sensors', 'Facilities Engineering', '12d ago'],
    ['ADD', 'Liquid-cooled AI compute hall commissioned with 4 CDU loops at CA-DC-008 (Santa Clara)', 'Capital Project Launch', '18d ago'],
    ['DECOM', '84 legacy storage shelves and SAS enclosures retired across Central & West regions', 'Asset Disposal Board', '26d ago']
  ],
  '90d': [
    ['ADD', '3,480 physical assets enrolled across 24 US data centers for high-density compute', 'US Infrastructure Expansion', '3d ago'],
    ['FIX', 'Automated reconciliation resolved 312 device serial number and rack slot discrepancies', 'Recon Scheduler', '14d ago'],
    ['UPD', 'Data center network spine upgrade: 400G InfiniBand fabric migration completed in Ashburn', 'Network Architecture', '1mo ago'],
    ['SURVEY', 'ASHRAE thermal compliance and power efficiency PUE certification across all 24 sites', 'Energy & Facilities Audit', '1.5mo ago'],
    ['ADD', 'High-performance AI storage cluster expanded to 18 PB across Dallas and Santa Clara', 'Data Platform Team', '2mo ago'],
    ['DECOM', '240 legacy compute blades and Gen9 servers decommissioned and recycled', 'E-Waste Lifecycle Program', '2.5mo ago']
  ],
  '12m': [
    ['ADD', 'Full-stack US Data Center inventory onboarding: 24 facilities, 3,800+ devices, 96 AI pods', 'Enterprise Deployment', '1mo ago'],
    ['SURVEY', '100% physical-to-digital DCIM twin reconciliation completed for all racks and rows', 'DCIM Modernization', '3mo ago'],
    ['UPD', 'Unified Inventory data model rolled out across all US North, South, West & East regions', 'Platform Architecture', '5mo ago'],
    ['FIX', 'Automated discovery & reconciliation engine connected to all out-of-band management fabrics', 'Systems Engineering', '7mo ago'],
    ['ADD', 'InfiniBand NDR 400G and 800G optical telemetry monitoring integrated into inventory pipeline', 'Fabric Engineering', '9mo ago'],
    ['DECOM', 'Tier II legacy data hall sunset completed in Secaucus and Chicago: 620 older units cleared', 'DC Consolidation Phase 1', '11mo ago']
  ]
};

const DC_ACTIVITY_IN_BY_RANGE: Record<DayRangeOption, [string, string, string, string][]> = {
  '7d': [
    ['ADD', '16 NVIDIA HGX H100 GPU servers onboarded at MH-DC-001 (Pune)', 'DCIM Auto-Provisioning', '15m ago'],
    ['FIX', 'OS baseline drift cleared on 6 Arista spine switches at MH-DC-002', 'NetOps Automation (West)', '2h ago'],
    ['SURVEY', 'Physical rack elevation and PDU cabling audit in Row-A at MH-DC-003 (Nagpur)', 'DC Operations Team', '5h ago'],
    ['UPD', 'Thermal sensor & CRAC airflow thresholds adjusted in Server Room 1 at UP-DC-005', 'Facilities Telemetry', '1d ago'],
    ['ADD', '18 Dell PowerEdge compute nodes & 100G RoCE NICs racked at MH-DC-004 (Pune)', 'Discovery run #1,402', '3d ago'],
    ['DECOM', '12 legacy 1U compute servers retired and sanitized at MH-DC-001', 'Asset Lifecycle Team', '5d ago']
  ],
  '14d': [
    ['ADD', '32 NVIDIA H100 nodes & 4 Quantum-2 InfiniBand switches deployed in Pune & Nagpur', 'DC Rollout Batch #6', '3h ago'],
    ['FIX', '400G optical transceiver alarms cleared on Leaf switches at MH-DC-002 (Pune)', 'Hardware Engineering', '1d ago'],
    ['SURVEY', 'Full electrical feed & UPS redundancy audit completed across 48 racks at MH-DC-001', 'Facilities Ops', '4d ago'],
    ['UPD', 'Firmware upgraded to Junos 23.4R2 on core border routers at MH-DC-001 & MH-DC-004', 'SecOps Release', '7d ago'],
    ['ADD', '8 Weka NVMe flash storage nodes added to AI cluster at MH-DC-001', 'Storage Team', '10d ago'],
    ['DECOM', '14 legacy top-of-rack switches decommissioned at UP-DC-005', 'CR-4890 · Decom team', '13d ago']
  ],
  '30d': [
    ['ADD', '890 devices and 210 racks verified across India data centers in Q3 discovery sweep', 'Discovery run #1,385', '2h ago'],
    ['FIX', '32 FortiGate security firewall interface drifts reconciled to approved baseline', 'Audit Engine', '2d ago'],
    ['SURVEY', '100% optical fibre cross-connect & ODF tray validation completed at MH-DC-001 & MH-DC-002', 'Field Survey Team', '5d ago'],
    ['UPD', 'Standard DCIM baseline applied to 1,120 cooling, PDU and CDU telemetry sensors', 'Facilities Engineering', '14d ago'],
    ['ADD', 'High-density AI compute hall commissioned with liquid cooling loops at MH-DC-001', 'Project Expansion', '20d ago'],
    ['DECOM', '46 legacy storage shelves retired across West region data centers', 'Asset Disposal', '27d ago']
  ],
  '90d': [
    ['ADD', '2,140 physical assets enrolled across 24 India data centers for compute expansion', 'DC Expansion Phase 2', '4d ago'],
    ['FIX', 'Automated reconciliation resolved 198 device serial number and rack position drifts', 'Recon Scheduler', '16d ago'],
    ['UPD', 'Network spine upgrade: 400G InfiniBand fabric migration completed at MH-DC-001', 'Network Architecture', '1.2mo ago'],
    ['SURVEY', 'ASHRAE thermal compliance and power efficiency PUE certification completed', 'Energy Audit Board', '1.8mo ago'],
    ['ADD', 'High-performance AI storage cluster expanded to 12 PB across Pune facilities', 'Data Platform Team', '2.2mo ago'],
    ['DECOM', '180 legacy compute blades and Gen9 servers decommissioned and recycled', 'E-Waste Program', '2.6mo ago']
  ],
  '12m': [
    ['ADD', 'Full-stack India Data Center inventory onboarding: 24 facilities, 2,900+ devices', 'Enterprise Deployment', '1.2mo ago'],
    ['SURVEY', '100% physical-to-digital DCIM twin reconciliation completed for all racks and rows', 'DCIM Modernization', '3.5mo ago'],
    ['UPD', 'Unified Inventory data model rolled out across all India data centers', 'Platform Architecture', '5.5mo ago'],
    ['FIX', 'Automated discovery & reconciliation engine connected to all out-of-band fabrics', 'Systems Engineering', '7.5mo ago'],
    ['ADD', 'InfiniBand NDR 400G and 800G optical telemetry monitoring integrated into pipeline', 'Fabric Engineering', '9.5mo ago'],
    ['DECOM', 'Legacy server halls decommissioned and consolidated across Western region', 'DC Consolidation', '11.5mo ago']
  ]
};

function buildDc() {
  const T = DC_TOTAL;
  const dev = T.devices;
  const powerUnits = T.feeds + T.ups + DC_SUM.length * 2;   // utility feeds, UPS, one DG set and one battery bank per data center
  const odfFrames = DC_SUM.filter(d => d.odf.total > 0).length;
  const passive = T.racks + powerUnits + T.coolingUnits + T.sensors + odfFrames + T.coresLit;
  const virtTotal = DC_VIRTUAL_RESOURCES.length; // 128
  const vms = DC_VIRTUAL_RESOURCES.filter(i => i.type === 'Virtual Machine').length; // 56
  const k8s = DC_VIRTUAL_RESOURCES.filter(i => i.type === 'K8s Pod').length; // 34
  const storage = DC_VIRTUAL_RESOURCES.filter(i => i.type === 'Datastore').length; // 20
  const net = DC_VIRTUAL_RESOURCES.filter(i => i.type === 'Virtual Network').length; // 18
  const virtRunning = DC_VIRTUAL_RESOURCES.filter(i => i.status === 'Running').length; // 114
  const virtWarning = DC_VIRTUAL_RESOURCES.filter(i => i.status === 'Warning' || i.status === 'Degraded').length; // 2
  const virtError = DC_VIRTUAL_RESOURCES.filter(i => i.status === 'Error').length; // 2
  const virtHealthPct = Math.round((virtRunning / virtTotal) * 100); // 89%

  const connTotal = DC_COUNTS.links;
  const servicesTotal = DC_COUNTS.services;
  const records = dev + passive + virtTotal + connTotal;
  const risks = { critical: DC_SUM.reduce((a, d) => a + d.risks.critical, 0) + virtError, major: DC_SUM.reduce((a, d) => a + d.risks.major, 0) + virtWarning, minor: DC_SUM.reduce((a, d) => a + d.risks.minor, 0) };
  const riskTotal = risks.critical + risks.major + risks.minor;
  const verifiedPct = dev ? Math.round((T.verified / dev) * 100) : 0;
  const roleRows: [string, string][] = [['Router', 'Routers'], ['Switch', 'Switches'], ['Server', 'Servers'], ['Storage', 'Storage arrays'], ['Firewall', 'Firewalls'], ['GPU', 'GPU servers'], ['DWDM', 'Optical & DWDM']];

  const TOTAL = eachRange(r => ({ totalDisplay: fn(records), totalRaw: records, sitesCount: fn(DC_SUM.length), managedElements: fn(dev), delta: '+0.0%', period: PERIOD[r],
    health: `${verifiedPct}%`, confirmed: pcs(T.discovered, dev, 1), stranded: pcs(T.notDiscovered, dev, 1), strandedVal: fn(T.notDiscovered) }));

  const PARENTS = eachRange(() => [
    { name: 'Physical inventory', desc: '', count: fn(dev + passive), delta: '+0.0%', health: `${verifiedPct}%`, children: [
      leaf('Active', fn(dev), verifiedPct, `${fn(dev)} managed elements in ${DC_SUM.length} data centers`, 'Discovered', pcs(T.discovered, dev, 1), risks.critical, risks.major, ACT),
      leaf('Passive', fn(passive), 100, 'racks, power plant, cooling, sensors, optical frames and cabling', 'Recorded', '100%', 0, 0, PAS)
    ] },
    { name: 'Connectivity & Virtual inventory', desc: '', count: fn(connTotal + virtTotal), delta: '+0.0%', health: `${virtHealthPct}%`, children: [
      leaf('Virtual', fn(virtTotal), virtHealthPct, `${virtTotal} virtual resources across ${DC_SUM.length} data centers`, 'Mapped to host', '100%', virtError, virtWarning, VIR),
      leaf('Connectivity', fn(connTotal), 100, `${fn(connTotal)} links & ${fn(servicesTotal)} services across ${DC_SUM.length} data centers`, 'Fabric path resolved', '100%', 0, 0, LOG)
    ] }
  ] as ParentCategory[]);

  const ISSUES = eachRange(r => ({ count: fn(riskTotal), change: '0%', periodLabel: ISSUE_PERIOD[r], crit: risks.critical, high: risks.major, med: 0, low: risks.minor,
    medianDays: 0, assigned: riskTotal }));

  const BUCKET = eachRange(() => ({ centerLabel: fn(records),
    summaryText: `Physical inventory represents ${pcs(dev + passive, records, 1)} of data center assets (Active ${pcs(dev, records, 1)}, Passive ${pcs(passive, records, 1)}); Connectivity fabric holds ${pcs(connTotal, records, 1)} (${fn(connTotal)} links & ${fn(servicesTotal)} customer services) and Virtual holds ${fn(virtTotal)} VMs, K8s pods, datastores & vSwitches across ${DC_SUM.length} facilities.`,
    rows: [['Active', fn(dev), dev, ACT], ['Passive', fn(passive), passive, PAS], ['Connectivity', fn(connTotal), connTotal, LOG], ['Virtual', fn(virtTotal), virtTotal, VIR]] as [string, string, number, string][] }));

  const planned = T.planned;
  const LIFECYCLE = eachRange(() => ({
    states: [{ name: 'In service', count: fn(dev - planned), color: GOOD }, { name: 'Planned', count: fn(planned), color: INFO }, { name: 'Faulty', count: '0', color: CRIT },
      { name: 'Maintenance', count: '0', color: WARN }, { name: 'Decommissioned', count: '0', color: GREY }],
    bars: [{ name: 'In service', count: fn(dev - planned), pct: pcs(dev - planned, dev), w: pcs(dev - planned, dev), color: GOOD }, { name: 'Planned', count: fn(planned), pct: pcs(planned, dev), w: pcs(planned, dev), color: INFO },
      { name: 'Faulty', count: '0', pct: '0%', w: '0%', color: CRIT }, { name: 'Under maintenance', count: '0', pct: '0%', w: '0%', color: WARN }, { name: 'Decommissioning', count: '0', pct: '0%', w: '0%', color: GREY }],
    faultsNote: 'The data center records carry no fault or maintenance state.',
    leadTimeNote: `${fn(planned)} planned devices are recorded but not yet in service.`
  }));

  const vendorTotals = new Map<string, number>();
  for (const d of DC_SUM) for (const [v, c] of Object.entries(d.vendors)) vendorTotals.set(v, (vendorTotals.get(v) ?? 0) + c);
  const topVendors = [...vendorTotals.entries()].sort((a, b) => b[1] - a[1]);
  const vcolor = [INFO, PURP, TEAL, WARN, '#0891B2'];
  const title = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();
  const modelsDistinct = new Set(DC_SUM.flatMap(d => d.models)).size;
  const VENDOR = eachRange(() => {
    const top = topVendors.slice(0, 5), rest = topVendors.slice(5).reduce((a, x) => a + x[1], 0);
    const rows: [string, number, string][] = top.map((x, i) => [title(x[0]), Math.round((x[1] / dev) * 100), vcolor[i]]);
    if (rest) rows.push(['Others', Math.round((rest / dev) * 100), GREY]);
    return { activeNEs: fn(dev), models: fn(modelsDistinct), unmapped: '0', rows };
  });

  const PANELS = eachRange(() => [
    { title: 'Active (Physical)', color: ACT, route: '/inventory/physical', desc: 'Physical routers, switches, servers, storage, firewalls and GPU servers in the data centers.',
      items: bars0(roleRows.map(([k, label]) => [label, fn(T.byRole(k as never)), T.byRole(k as never)] as [string, string, number])),
      facts: [
        { name: 'Reachable in last discovery', value: pcs(T.discovered, dev, 1), color: GOOD }, { name: 'Software version recorded', value: '100%', color: GOOD }, { name: 'Chassis serial verified', value: '100%', color: GOOD },
        { name: 'Dual PSU / power monitored', value: NONE, color: '#111827' }, { name: 'Complete · integrity · fresh', value: `100% · ${verifiedPct}% · ${pcs(T.discovered, dev)}`, color: '#111827' },
        { name: 'Duplicate · orphan records', value: NONE, color: '#111827' }, { name: 'Open defects (critical · high)', value: `${risks.critical} · ${risks.major}`, color: '#111827' },
        { name: 'Off approved OS baseline', value: fn(T.drifted), color: WARN }, { name: 'EOL / EOS exposed', value: '0', color: '#111827' },
        { name: 'Not reconfirmed 7+ days', value: fn(T.notDiscovered), color: '#111827' }, { name: 'Decommissioned · last 7 days', value: '0', color: '#111827' }
      ] },
    { title: 'Passive (Physical)', color: PAS, route: '/inventory/passive', desc: 'Racks, power plant, cooling, sensors, optical frames and cabling recorded for the data centers.',
      items: bars0([['Racks', fn(T.racks), T.racks], ['Power plant units', fn(powerUnits), powerUnits], ['Cooling units', fn(T.coolingUnits), T.coolingUnits], ['Environment sensors', fn(T.sensors), T.sensors],
        ['ODF frames', fn(odfFrames), odfFrames], ['Fibre cores in use', fn(T.coresLit), T.coresLit]]),
      facts: [{ name: 'Rack space used', value: pcs(T.uUsed, T.uTotal), color: '#111827' }, { name: 'Power capacity', value: `${(T.powerKw / 1000).toFixed(1)} MW`, color: '#111827' },
        { name: 'Cooling capacity', value: `${(T.coolingKw / 1000).toFixed(1)} MW`, color: '#111827' }, { name: 'Fibre cores lit', value: `${pcs(T.coresLit, T.cores)} of ${fn(T.cores)}`, color: '#111827' }] },
    {
      title: 'Virtual (Logical)',
      color: VIR,
      route: '/inventory/virtual',
      desc: `Virtual Machines, Kubernetes Pods, Datastores & SDN Fabrics across ${DC_SUM.length} Data Centers.`,
      items: bars0([
        ['Virtual Machines (VM)', fn(vms), vms],
        ['Kubernetes Pods & Nodes (K8s)', fn(k8s), k8s],
        ['Storage Datastores & Pools', fn(storage), storage],
        ['Virtual Networks & vSwitches', fn(net), net]
      ]),
      facts: [
        { name: 'Mapped to host / cluster', value: '100%', color: GOOD },
        { name: 'Data centers · clusters', value: `${DC_SUM.length} DCs · 128 entities`, color: '#111827' },
        { name: 'Active workloads running', value: `${virtRunning} running (${virtHealthPct}%)`, color: GOOD },
        { name: 'Platforms supported', value: 'vSphere · K8s · OpenStack · AHV', color: '#111827' }
      ]
    },
    {
      title: 'Connectivity (Logical & Services)',
      color: LOG,
      route: '/inventory/links',
      desc: `Spine-leaf fabric links, BGP EVPN routing sessions, DCI policy tunnels and provisioned compute & storage services across ${DC_SUM.length} Data Centers.`,
      items: bars0([
        ['InfiniBand AI cluster fabric (400G NDR)', fn(DC_COUNTS.linksByProtocol['InfiniBand'] || 9692), DC_COUNTS.linksByProtocol['InfiniBand'] || 9692],
        ['Ethernet spine-leaf fabric (100G/400G Clos)', fn(DC_COUNTS.linksByProtocol['Ethernet Fabric'] || 1084), DC_COUNTS.linksByProtocol['Ethernet Fabric'] || 1084],
        ['BGP EVPN & routing adjacencies', fn(DC_COUNTS.linksByProtocol['BGP / EVPN'] || 900), DC_COUNTS.linksByProtocol['BGP / EVPN'] || 900],
        ['Compute & storage host access (100G RoCE)', fn(DC_COUNTS.linksByProtocol['Compute & Storage'] || 7218), DC_COUNTS.linksByProtocol['Compute & Storage'] || 7218],
        ['Out-of-band management & telemetry (1G/10G)', fn(DC_COUNTS.linksByProtocol['Management (OOB)'] || 5884), DC_COUNTS.linksByProtocol['Management (OOB)'] || 5884],
        ['On-demand GPU workload services', fn(DC_COUNTS.servicesByType['On-demand GPUs']), DC_COUNTS.servicesByType['On-demand GPUs']],
        ['Cloud compute instance services (CPU)', fn(DC_COUNTS.servicesByType['CPU instances']), DC_COUNTS.servicesByType['CPU instances']],
        ['Storage volume & datastore attachments', fn(DC_COUNTS.servicesByType['Storage volume']), DC_COUNTS.servicesByType['Storage volume']]
      ]),
      facts: [
        { name: 'Mapped to active port / interface', value: '100%', color: GOOD },
        { name: 'A–Z circuit path continuity resolved', value: '100%', color: GOOD },
        { name: 'Protected / redundant fabric paths (MLAG / FRR)', value: '98.6%', color: GOOD },
        { name: 'Customer cloud services provisioned', value: `${fn(servicesTotal)} active`, color: '#111827' },
        { name: 'Orphan logical objects', value: '0', color: GOOD }
      ]
    }
  ] as PanelCategory[]);

  const DC_DECOM_DYNAMIC: Record<DayRangeOption, {
    periodLabel: string;
    marked: number;
    live: number;
    confirmed: number;
    note: string;
  }> = {
    '7d': {
      periodLabel: 'Last 7 days',
      marked: 12,
      live: 2,
      confirmed: 10,
      note: '2 decommissioned nodes still answer BMC/IPMI out-of-band discovery — scheduled for physical un-racking and cryptographic drive erasure this week.'
    },
    '14d': {
      periodLabel: 'Last 14 days',
      marked: 24,
      live: 4,
      confirmed: 20,
      note: '4 decommissioned compute blades still answer telemetry discovery; work orders dispatched for physical de-cabling and SAN un-mapping.'
    },
    '30d': {
      periodLabel: 'Last 30 days',
      marked: 48,
      live: 8,
      confirmed: 40,
      note: '8 decommissioned nodes still answer BMC/IPMI discovery — awaiting physical un-racking and cryptographic drive sanitization. Passive decommissions confirmed by DCIM audit.'
    },
    '90d': {
      periodLabel: 'Last 90 days',
      marked: 136,
      live: 21,
      confirmed: 115,
      note: '21 older generation servers marked for decommissioning were observed active in telemetry during the quarter; 15 have completed e-waste processing.'
    },
    '12m': {
      periodLabel: 'Last 12 months',
      marked: 512,
      live: 46,
      confirmed: 466,
      note: '466 legacy compute and fabric nodes completed lifecycle decommissioning and certified hardware disposition during the annual refresh cycle.'
    }
  };
  const DECOM = eachRange(r => DC_DECOM_DYNAMIC[r]);

  const DC_DECOM_BUCKET: Record<DayRangeOption, [string, number][]> = {
    '7d': [['Active', 8], ['Passive', 3], ['Logical', 1], ['Virtual', 0]],
    '14d': [['Active', 16], ['Passive', 6], ['Logical', 2], ['Virtual', 0]],
    '30d': [['Active', 32], ['Passive', 11], ['Logical', 4], ['Virtual', 1]],
    '90d': [['Active', 92], ['Passive', 31], ['Logical', 10], ['Virtual', 3]],
    '12m': [['Active', 348], ['Passive', 118], ['Logical', 36], ['Virtual', 10]]
  };
  const DECOM_BUCKET = eachRange(r => DC_DECOM_BUCKET[r]);

  const DC_EOL_DYNAMIC: Record<DayRangeOption, {
    total: string;
    note: string;
    rows: [string, number, number[]][];
  }> = {
    '7d': {
      total: '448',
      note: 'Active compute and fabric nodes account for 76% of exposure; older generation Nvidia A100 GPU nodes and Dell PowerEdge platforms are scheduled for H2 refresh.',
      rows: [
        ['Active', 340, [38, 26, 20, 8, 5, 3]],
        ['Passive', 64, [0, 0, 0, 0, 0, 100]],
        ['Logical', 28, [0, 0, 0, 60, 40, 0]],
        ['Virtual', 16, [0, 40, 0, 0, 0, 60]]
      ]
    },
    '14d': {
      total: '452',
      note: 'Active compute and fabric nodes account for 76% of exposure; older generation Nvidia A100 GPU nodes and Dell PowerEdge platforms are scheduled for H2 refresh.',
      rows: [
        ['Active', 344, [38, 26, 20, 8, 5, 3]],
        ['Passive', 64, [0, 0, 0, 0, 0, 100]],
        ['Logical', 28, [0, 0, 0, 60, 40, 0]],
        ['Virtual', 16, [0, 40, 0, 0, 0, 60]]
      ]
    },
    '30d': {
      total: '456',
      note: 'Active compute and fabric nodes account for 76% of exposure; older generation Nvidia A100 GPU nodes and Dell PowerEdge platforms are scheduled for H2 refresh.',
      rows: [
        ['Active', 348, [38, 26, 20, 8, 5, 3]],
        ['Passive', 64, [0, 0, 0, 0, 0, 100]],
        ['Logical', 28, [0, 0, 0, 60, 40, 0]],
        ['Virtual', 16, [0, 40, 0, 0, 0, 60]]
      ]
    },
    '90d': {
      total: '484',
      note: 'Active compute and fabric nodes account for 76% of exposure; 156 nodes approaching vendor end-of-support in the next two quarters.',
      rows: [
        ['Active', 370, [38, 26, 20, 8, 5, 3]],
        ['Passive', 68, [0, 0, 0, 0, 0, 100]],
        ['Logical', 30, [0, 0, 0, 60, 40, 0]],
        ['Virtual', 16, [0, 40, 0, 0, 0, 60]]
      ]
    },
    '12m': {
      total: '542',
      note: 'Active compute and fabric nodes account for 77% of annual exposure; 188 units retired or upgraded during the annual lifecycle window.',
      rows: [
        ['Active', 418, [38, 26, 20, 8, 5, 3]],
        ['Passive', 76, [0, 0, 0, 0, 0, 100]],
        ['Logical', 32, [0, 0, 0, 60, 40, 0]],
        ['Virtual', 16, [0, 40, 0, 0, 0, 60]]
      ]
    }
  };
  const EOL = eachRange(r => DC_EOL_DYNAMIC[r]);

  const driftTotals = new Map<string, number>();
  for (const d of DC_SUM) for (const [v, c] of Object.entries(d.driftByVendor)) driftTotals.set(v, (driftTotals.get(v) ?? 0) + c);
  const driftSorted = [...driftTotals.entries()].sort((a, b) => b[1] - a[1]);
  const DRIFT = eachRange(() => ({
    total: fn(T.drifted),
    activeWithVersion: fn(dev),
    cve: '18',
    noVersion: '0',
    note: T.drifted
      ? `${fn(T.drifted)} devices differ from their record; ${title(driftSorted[0][0])} has the most (${driftSorted[0][1]}). 18 nodes carry high-priority firmware advisories.`
      : 'No device differs from its record.',
    rows: [
      ...driftSorted.slice(0, 4).map(([v, c]) => [title(v), c] as [string, number]),
      ...(driftSorted.length > 4 ? [['Others', driftSorted.slice(4).reduce((a, x) => a + x[1], 0)] as [string, number]] : [])
    ]
  }));

  const DC_SPARES_DYNAMIC: Record<DayRangeOption, {
    titleCount: string;
    note: string;
    rows: [string, number, number][];
  }> = {
    '7d': {
      titleCount: '4',
      note: 'Four critical GPU server and high-speed InfiniBand switch models are holding under 2% depot spares; SXM module and switch PSU replenishments are on order.',
      rows: [
        ['Quantum-2 QM9700', 850, 14],
        ['PowerEdge XE8545 (8×A100)', 271, 4],
        ['SYS-821GE-TNHR (8×H100)', 408, 7],
        ['DGX A100', 285, 5]
      ]
    },
    '14d': {
      titleCount: '4',
      note: 'Four critical GPU server and high-speed InfiniBand switch models are holding under 2% depot spares; SXM module and switch PSU replenishments are on order.',
      rows: [
        ['Quantum-2 QM9700', 850, 14],
        ['PowerEdge XE8545 (8×A100)', 271, 4],
        ['SYS-821GE-TNHR (8×H100)', 408, 7],
        ['DGX A100', 285, 5]
      ]
    },
    '30d': {
      titleCount: '4',
      note: 'Four critical GPU server and high-speed InfiniBand switch models are holding under 2% depot spares; SXM module and switch PSU replenishments are on order.',
      rows: [
        ['Quantum-2 QM9700', 850, 14],
        ['PowerEdge XE8545 (8×A100)', 271, 4],
        ['SYS-821GE-TNHR (8×H100)', 408, 7],
        ['DGX A100', 285, 5]
      ]
    },
    '90d': {
      titleCount: '5',
      note: 'Five high-density GPU and spine switch models fell below safe spares threshold before emergency depot provisioning in Q3.',
      rows: [
        ['Quantum-2 QM9700', 850, 14],
        ['PowerEdge XE8545 (8×A100)', 271, 4],
        ['SYS-821GE-TNHR (8×H100)', 408, 7],
        ['DGX A100', 285, 5],
        ['AI400X2 High-Perf Storage', 209, 3]
      ]
    },
    '12m': {
      titleCount: '5',
      note: 'Annual spares coverage review identified 5 models with stock lead-time constraints; vendor SLA replenishment agreements signed.',
      rows: [
        ['Quantum-2 QM9700', 850, 14],
        ['PowerEdge XE8545 (8×A100)', 271, 4],
        ['SYS-821GE-TNHR (8×H100)', 408, 7],
        ['DGX A100', 285, 5],
        ['AI400X2 High-Perf Storage', 209, 3]
      ]
    }
  };
  const SPARES = eachRange(r => DC_SPARES_DYNAMIC[r]);

  const NOT_RECONF = eachRange(r => ({
    title: DEFAULT_NOT_RECONFIRMED_DYNAMIC[r].title,
    count: fn(T.notDiscovered),
    delta: '-12 vs prior period',
    stale30: fn(T.notDiscovered),
    items: [
      { name: 'Active · BMC / out-of-band telemetry not refreshed', count: '418' },
      { name: 'Virtual · Hypervisor VM & pod status unrefreshed', count: '28' },
      { name: 'Logical · LLDP / BGP fabric telemetry unconfirmed', count: '14' },
      { name: 'Passive · Rack PDU & smart sensor polling delay', count: '8' }
    ]
  }));
  const q = (name: string, color: string, v: string[]) => ({ name, color, v1: v[0], c1: v[0] === NONE ? GREY : hc(parseFloat(v[0])), v2: v[1], c2: v[1] === NONE ? GREY : hc(parseFloat(v[1])), v3: v[2], c3: v[2] === NONE ? GREY : hc(parseFloat(v[2])), v4: v[3], c4: GREY, v5: v[4], c5: GREY });
  const QUALITY = eachRange(() => [
    q('Active', ACT, ['100%', `${verifiedPct}%`, pcs(T.discovered, dev), NONE, NONE]),
    q('Passive', PAS, ['100%', '100%', '100%', NONE, NONE]),
    q('Virtual', VIR, ['100%', '98%', `${virtHealthPct}%`, '0.0%', '0.0%']),
    q('Logical', LOG, ['100%', '100%', '100%', '0.0%', '0.0%'])
  ] as QualityRow[]);
  const CROSS = eachRange(r => DEFAULT_CROSS_LINKS_DYNAMIC[r].map(c => {
    if (c.name.startsWith('Active element ↔ site')) return { ...c, name: 'Active element ↔ data center', value: '100%', color: GOOD };
    if (c.name.toLowerCase().includes('virtual')) return { ...c, value: '100%', color: GOOD };
    if (c.name.toLowerCase().includes('port') || c.name.toLowerCase().includes('link') || c.name.toLowerCase().includes('logical')) return { ...c, value: '100%', color: GOOD };
    return { ...c, value: '100%', color: GOOD };
  }));
  const RECON = eachRange(r => ({ invOnly: fn(T.notDiscovered), matched: fn(T.verified), netOnly: '0',
    gaps: DEFAULT_RECON_DYNAMIC[r].gaps.map(g => ({ name: g.name, value: g.name.startsWith('Software version') ? fn(T.drifted) : '0' })) }));
  const SUPPORT = eachRange(() => ({ eos: '0', war: NONE, spares: NONE, fibre: NONE, contracts: NONE, lic: NONE, age: NONE }));
  const NAV = eachRange(r => DEFAULT_BOTTOM_NAVIGATE_DYNAMIC[r].map((b, i) => {
    if (i === 2) {
      return { ...b, count: fn(virtTotal), name: 'Virtual resources', where: 'Resources › Virtual', color: VIR, route: '/inventory/virtual' };
    }
    if (i === 3) {
      return { ...b, count: fn(connTotal + servicesTotal), name: 'Fabric links & services', where: 'Connectivity · Links', color: LOG, route: '/inventory/links' };
    }
    if (i === 4) {
      return { ...b, count: fn(DC_SUM.length), name: 'Data centers', where: 'Location › Data centers', color: '#374151', route: '/inventory/location' };
    }
    return { ...b, count: [fn(dev), fn(passive), fn(virtTotal), fn(connTotal + servicesTotal), fn(DC_SUM.length)][i] };
  }));
  const issueCount = (d: DcSum) => d.risks.critical + d.risks.major + d.risks.minor;
  const sites = [...DC_SUM].sort((a, b) => issueCount(b) - issueCount(a) || b.devices - a.devices).slice(0, 7).map(d => {
    const h = d.devices ? Math.round((d.verified / d.devices) * 100) : 0;
    const st = h >= 90 ? 'Healthy' : h >= 80 ? 'Watch' : 'At risk';
    const pas = d.racks + d.feeds + d.ups + 2 + d.coolingUnits + d.sensors + (d.odf.total > 0 ? 1 : 0) + d.cores.lit;
    return { name: d.id, region: dcRegionLabel(d), kind: KIND(d), active: fn(d.devices), passive: fn(pas), health: `${h}%`, healthW: `${h}%`, healthColor: hc(h), issues: issueCount(d), status: st, badgeBg: statusBg(st), badgeFg: statusFg(st) } as SiteRow;
  });
  const SITES = eachRange(() => sites);
  const dcServicesList: ServiceRow[] = [
    { name: 'On-demand GPU instances', count: fn(DC_COUNTS.servicesByType['On-demand GPUs']), path: '100%', color: hc(100) },
    { name: 'Cloud CPU compute instances', count: fn(DC_COUNTS.servicesByType['CPU instances']), path: '100%', color: hc(100) },
    { name: 'Storage volume & datastores', count: fn(DC_COUNTS.servicesByType['Storage volume']), path: '100%', color: hc(100) },
    { name: 'Reserved AI & compute clusters', count: fn(DC_COUNTS.servicesByType['Reserved cluster']), path: '100%', color: hc(100) }
  ];
  const SERVICES = eachRange(() => ({ active: fn(servicesTotal), e2e: '100%', rows: dcServicesList }));
  const NET = eachRange(r => ({ label: DEFAULT_NET_RECORD_DYNAMIC[r].label, added: '+0', retired: '−0', net: '+0' }));
  const TREND = eachRange(r => DEFAULT_TREND_SERIES[r].map(([l]) => [l, 0] as [string, number]));

  const getDcActivity = () => {
    const isIndia = typeof window !== 'undefined' && currentGeo() === 'in';
    return isIndia ? DC_ACTIVITY_IN_BY_RANGE : DC_ACTIVITY_US_BY_RANGE;
  };
  const ACTIVITY = new Proxy({} as Record<DayRangeOption, [string, string, string, string][]>, {
    get(_target, prop: string) {
      const active = getDcActivity();
      return (active as Record<string, [string, string, string, string][]>)[prop] || active['30d'];
    },
    ownKeys() {
      return RANGES;
    },
    getOwnPropertyDescriptor(_target, prop) {
      const active = getDcActivity();
      return {
        enumerable: true,
        configurable: true,
        value: (active as Record<string, [string, string, string, string][]>)[prop as string] || active['30d']
      };
    }
  });

  return { TOTAL, PARENTS, ISSUES, BUCKET, LIFECYCLE, VENDOR, PANELS, DECOM, DECOM_BUCKET, EOL, DRIFT, SPARES, NOT_RECONF, QUALITY, CROSS, RECON, SUPPORT, NAV, SITES, SERVICES, NET, TREND, ACTIVITY };
}

let dcDataCache: ReturnType<typeof buildDc> | null = null;
export function getDcInsightsData() {
  if (!dcDataCache) {
    dcDataCache = buildDc();
  }
  return dcDataCache;
}

function dynamicExport<T extends object>(getDc: () => T, def: T): T {
  return new Proxy(def, {
    get(_target, prop: string | symbol) {
      const active = isDatacenter() ? getDc() : def;
      return (active as any)[prop];
    },
    ownKeys() {
      const active = isDatacenter() ? getDc() : def;
      return Reflect.ownKeys(active);
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      const active = isDatacenter() ? getDc() : def;
      return Reflect.getOwnPropertyDescriptor(active, prop);
    }
  });
}

export const TOTAL_RECORDS_DATA = dynamicExport(() => getDcInsightsData().TOTAL, DEFAULT_TOTAL_RECORDS_DATA);
export const PARENTS_DATA_DYNAMIC = dynamicExport(() => getDcInsightsData().PARENTS, DEFAULT_PARENTS_DATA_DYNAMIC);
export const ISSUES_DYNAMIC = dynamicExport(() => getDcInsightsData().ISSUES, DEFAULT_ISSUES_DYNAMIC);
export const BUCKET_SHARE_DATA = dynamicExport(() => getDcInsightsData().BUCKET, DEFAULT_BUCKET_SHARE_DATA);
export const LIFECYCLE_DYNAMIC = dynamicExport(() => getDcInsightsData().LIFECYCLE, DEFAULT_LIFECYCLE_DYNAMIC);
export const VENDOR_MIX_DATA = dynamicExport(() => getDcInsightsData().VENDOR, DEFAULT_VENDOR_MIX_DATA);
export const PANELS_DATA_DYNAMIC = dynamicExport(() => getDcInsightsData().PANELS, DEFAULT_PANELS_DATA_DYNAMIC);
export const DECOM_DYNAMIC = dynamicExport(() => getDcInsightsData().DECOM, DEFAULT_DECOM_DYNAMIC);
export const DECOM_BUCKET_DYNAMIC = dynamicExport(() => getDcInsightsData().DECOM_BUCKET, DEFAULT_DECOM_BUCKET_DYNAMIC);
export const EOL_DYNAMIC = dynamicExport(() => getDcInsightsData().EOL, DEFAULT_EOL_DYNAMIC);
export const DRIFT_DYNAMIC = dynamicExport(() => getDcInsightsData().DRIFT, DEFAULT_DRIFT_DYNAMIC);
export const SPARES_DYNAMIC = dynamicExport(() => getDcInsightsData().SPARES, DEFAULT_SPARES_DYNAMIC);
export const NOT_RECONFIRMED_DYNAMIC = dynamicExport(() => getDcInsightsData().NOT_RECONF, DEFAULT_NOT_RECONFIRMED_DYNAMIC);
export const QUALITY_ROWS_DYNAMIC = dynamicExport(() => getDcInsightsData().QUALITY, DEFAULT_QUALITY_ROWS_DYNAMIC);
export const CROSS_LINKS_DYNAMIC = dynamicExport(() => getDcInsightsData().CROSS, DEFAULT_CROSS_LINKS_DYNAMIC);
export const RECON_DYNAMIC = dynamicExport(() => getDcInsightsData().RECON, DEFAULT_RECON_DYNAMIC);
export const SUPPORT_DYNAMIC = dynamicExport(() => getDcInsightsData().SUPPORT, DEFAULT_SUPPORT_DYNAMIC);
export const BOTTOM_NAVIGATE_DYNAMIC = dynamicExport(() => getDcInsightsData().NAV, DEFAULT_BOTTOM_NAVIGATE_DYNAMIC);
export const SITES_DYNAMIC = dynamicExport(() => getDcInsightsData().SITES, DEFAULT_SITES_DYNAMIC);
export const SERVICES_DYNAMIC = dynamicExport(() => getDcInsightsData().SERVICES, DEFAULT_SERVICES_DYNAMIC);
export const NET_RECORD_DYNAMIC = dynamicExport(() => getDcInsightsData().NET, DEFAULT_NET_RECORD_DYNAMIC);
export const TREND_SERIES = dynamicExport(() => getDcInsightsData().TREND, DEFAULT_TREND_SERIES);
export const ACTIVITY_BY_RANGE = dynamicExport(() => getDcInsightsData().ACTIVITY, DEFAULT_ACTIVITY_BY_RANGE);
