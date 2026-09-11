import { ACTIVE_STATES, stockCount, type ActiveStock, type NeClass, type RecState, type Source, type StockState } from './ledger';
import type { Region } from './discovery';

export interface NeRow {
  st: RecState; name: string; ip: string; model: string; os: string; sn: string; oem: string;
  loc: string; s: Source; stock: StockState; v: number | null;
}

/* Hand-written seeds. The sample is grown below to the real population of
   each class × active stock state (PHY_MATRIX is still the source of truth
   for every count shown on screen) — so a grid actually has enough rows to
   scroll through instead of stopping after one page of generated filler. */
export const PHY_SEEDS: Record<NeClass, NeRow[]> = {
  router: [
    { st: 'ok', name: 'NDLS-J960-P_R1-T1-NR', ip: '172.31.33.100', model: 'MX960', os: '21.2R3-S8.5', sn: 'JN1236F87AFB', oem: 'JUNIPER', loc: 'DEL-279', s: 'd', stock: 'deployed', v: 3 },
    { st: 'ok', name: 'VZG-N540X-PE-T4-NR', ip: '172.31.53.186', model: 'NCS-540', os: '7.9.2', sn: 'FW488AS342W', oem: 'CISCO', loc: 'VJA-118', s: 'd', stock: 'deployed', v: 10 },
    { st: 'drift', name: 'CHE-J2.2K-PE-T4-ER', ip: '172.31.61.140', model: 'ACX2200', os: '21.2R3-S8.5', sn: 'PJ0215230255', oem: 'JUNIPER', loc: 'CHE-118', s: 'd', stock: 'deployed', v: 3 },
    { st: 'drift', name: 'ET-J960-P-T1-WR', ip: '172.31.31.97', model: 'MX960', os: '21.4R3-S5.5', sn: 'JN1234C25AFA', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 3 },
    { st: 'drift', name: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '172.31.86.61', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 3 },
    { st: 'stale', name: 'CHE-920-WIFI-R2', ip: '172.31.38.43', model: 'ASR920', os: '17.6.4', sn: 'CAT2034U1PP', oem: 'CISCO', loc: 'CHE-118', s: 'd', stock: 'deployed', v: 720 },
    { st: 'miss', name: 'MAS-N7750-BNG-R-T1-SR', ip: '172.31.33.130', model: '7750', os: '—', sn: 'JS123CC2EAFA', oem: 'NOKIA', loc: 'MAS-041', s: 'd', stock: 'faulty', v: 6264 },
    { st: 'none', name: 'ERS-N7750-SR7-T2-SR', ip: '192.168.1.14', model: '7750 SR-7', os: 'TiMOS-C-22.10.R1', sn: 'NSN7750ERS14A7X1', oem: 'NOKIA', loc: 'BGLK-277', s: 'p', stock: 'planned', v: null },
    { st: 'none', name: 'NDD-J2.2K-PE-T4-SR', ip: '192.168.1.11', model: 'EX4300-48P', os: '3.2.0.4', sn: 'QCT3048NDD11A01', oem: 'JUNIPER', loc: 'BGLK-277', s: 'p', stock: 'planned', v: null },
    { st: 'ok', name: 'WKR-J7024-PE-T4-WR', ip: '172.31.62.11', model: 'ACX7024', os: '23.2R1-S2.6', sn: 'FL2423AN0050', oem: 'JUNIPER', loc: 'WKR-204', s: 'd', stock: 'deployed', v: 5 },
    { st: 'ok', name: 'HYD-HUAWEI-NE40E-12', ip: '172.31.94.12', model: 'NE40E', os: 'V800R021C10', sn: 'HWNE40EHYD12', oem: 'HUAWEI', loc: 'HYD-093', s: 'd', stock: 'deployed', v: 4 }
  ],
  switch: [
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-01', ip: '172.31.31.201', model: 'L3-CORE-48P', os: '8.2.1', sn: 'HPE-SW-CH-2026-001', oem: 'CIENA', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-04', ip: '172.31.31.202', model: 'EX2200-24T', os: '15.1R7', sn: 'CHR-SN-808090', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'drift', name: 'KA-BGLK-277-T-CHR-08', ip: '172.31.31.204', model: 'C9300-48UXM', os: '17.9.4', sn: 'SW-CHR-CORE-4499', oem: 'CISCO', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'stale', name: 'BGLK-EX4300-T-CHR-07', ip: '172.31.31.2', model: 'EX4300-48P', os: '20.4R3', sn: 'SW-PRO-CHR-4545', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 7104 },
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-09', ip: '172.31.31.205', model: 'C9400-LC-48T', os: '17.9.4', sn: 'CHRSW-909090', oem: 'CISCO', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'ok', name: 'DEL-NOKIA-7250IXR-02', ip: '172.31.35.44', model: '7250 IXR-6', os: 'TiMOS-B-24.10.R6', sn: 'NOK7250DEL02', oem: 'NOKIA', loc: 'DEL-279', s: 'd', stock: 'deployed', v: 6 },
    { st: 'ok', name: 'MAS-HPE-ARUBA6300-03', ip: '172.31.41.55', model: '6300M', os: '10.11.1000', sn: 'HPEARUBAMAS03', oem: 'HPE', loc: 'MAS-041', s: 'd', stock: 'deployed', v: 6 }
  ],
  server: [
    { st: 'none', name: 'BGLK-CDC-SRV-01', ip: '172.31.70.11', model: 'DL380 Gen11', os: 'RHEL 9.4', sn: 'SGH2041XYZ', oem: 'HPE', loc: 'BGLK-277', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'BGLK-CDC-SRV-02', ip: '172.31.70.12', model: 'DL380 Gen11', os: 'RHEL 9.4', sn: 'SGH2041XZA', oem: 'HPE', loc: 'BGLK-277', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'DEL-EDC-SRV-07', ip: '172.31.71.07', model: 'PowerEdge R760', os: 'RHEL 9.2', sn: 'DPE7601144', oem: 'DELL', loc: 'DEL-279', s: 'm', stock: 'deployed', v: null }
  ],
  dwdm: [
    { st: 'none', name: 'WR-ADVA-FSP3000-01', ip: '172.31.47.144', model: 'FSP 3000', os: 'ONMSi 21.1', sn: 'ADV3000-8841', oem: 'ADVA', loc: 'MUM-011', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'WR-ADVA-FSP3000-02', ip: '172.31.47.145', model: 'FSP 3000', os: 'ONMSi 21.1', sn: 'ADV3000-8842', oem: 'ADVA', loc: 'PUN-014', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'HYD-CIENA-6500-01', ip: '172.31.93.12', model: '6500-T12', os: '11.5.0', sn: 'CIENA6500HYD01', oem: 'CIENA', loc: 'HYD-093', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'KOL-NOKIA-1830PSS-01', ip: '172.31.204.19', model: '1830 PSS-32', os: 'R21.6', sn: 'NOK1830KOL01', oem: 'NOKIA', loc: 'KOL-204', s: 'm', stock: 'deployed', v: null }
  ],
  enodeb: [
    { st: 'none', name: 'PUN-HNJW-C3-ENB-014', ip: '10.44.18.14', model: 'AirScale', os: '21B', sn: 'NOK-ENB-014', oem: 'NOKIA', loc: 'PUN-014', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'INDR-AREA-001-ENB-07', ip: '10.44.19.7', model: 'AirScale', os: '21B', sn: 'NOK-ENB-007', oem: 'NOKIA', loc: 'INDR-275', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'CHE-ERIC-ENB-031', ip: '10.44.22.31', model: 'Baseband 6630', os: 'L23B', sn: 'ERIC-ENB-031', oem: 'ERICSSON', loc: 'CHE-118', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'AHM-HUAWEI-ENB-045', ip: '10.44.24.45', model: 'BTS3900', os: 'V100R020C10', sn: 'HW-ENB-045', oem: 'HUAWEI', loc: 'AHM-131', s: 'e', stock: 'deployed', v: null }
  ],
  gnodeb: [
    { st: 'none', name: 'BLR-SOUTH-GNB-021', ip: '10.51.22.21', model: 'AirScale 5G', os: '23A', sn: 'NOK-GNB-021', oem: 'NOKIA', loc: 'BGLK-277', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'DEL-CENTRAL-GNB-009', ip: '10.51.23.9', model: 'AirScale 5G', os: '23A', sn: 'NOK-GNB-009', oem: 'NOKIA', loc: 'DEL-279', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'VJA-ERIC-GNB-018', ip: '10.51.26.18', model: 'AIR 6449', os: 'L23B', sn: 'ERIC-GNB-018', oem: 'ERICSSON', loc: 'VJA-118', s: 'e', stock: 'deployed', v: null },
    { st: 'none', name: 'PUN-HUAWEI-GNB-027', ip: '10.51.27.27', model: 'AAU5613', os: 'V100R020C10', sn: 'HW-GNB-027', oem: 'HUAWEI', loc: 'PUN-162', s: 'e', stock: 'deployed', v: null }
  ]
};

const PAD_LOC = ['BGLK-277','DEL-279','INDR-275','VJA-118','CHE-118','MAS-041','PUN-162','HYD-093','KOL-204','AHM-131'];
const PAD_ST: RecState[] = ['ok','ok','drift','ok','stale','ok','drift','ok','none','ok'];

/* one small deterministic generator so a rebuild never reshuffles the grid */
const lcg = (seed: number) => { let x = seed; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };

function grow(cls: NeClass, seeds: NeRow[]): NeRow[] {
  const out = seeds.slice();
  const r = lcg(cls.length * 7919 + seeds.length);
  for (const stock of ACTIVE_STATES) {
    const target = stockCount(cls, stock);
    const planned = stock === 'planned';
    let have = out.reduce((a, x) => a + (x.stock === stock ? 1 : 0), 0);
    while (have < target) {
      const k = out.length;
      const base = seeds[Math.floor(r() * seeds.length)];
      out.push({ ...base,
        st: planned ? 'none' : PAD_ST[k % PAD_ST.length],
        name: `${PAD_LOC[k % PAD_LOC.length].split('-')[0]}-${base.model.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase()}-${['P','PE','AGG','ACC','ER'][k % 5]}-${String(20 + k)}`,
        ip: planned ? `192.168.${20 + k % 9}.${11 + k}` : `172.31.${64 + (k * 5) % 60}.${12 + (k * 23) % 240}`,
        sn: base.sn.replace(/[0-9]{3}$/, String(200 + k * 7)) + String.fromCharCode(65 + k % 26),
        loc: PAD_LOC[k % PAD_LOC.length],
        stock,
        v: planned ? null : [3, 6, 11, 640][k % 4] });
      have++;
    }
  }
  return out;
}

export const PHY: Record<NeClass, NeRow[]> = Object.fromEntries(
  (Object.keys(PHY_SEEDS) as NeClass[]).map(k => [k, grow(k, PHY_SEEDS[k])])
) as Record<NeClass, NeRow[]>;

export const phyRows = (cls: NeClass, states: ReadonlySet<StockState>): NeRow[] =>
  PHY[cls].filter(r => states.has(r.stock));

export const isActive = (s: string): s is ActiveStock => (ACTIVE_STATES as string[]).includes(s);

/* per-row derived attributes the prototype computes rather than stores.
   eNodeB/gNodeB ports are the radio's fronthaul/backhaul SFPs, not a
   switching fabric — far fewer than a router or switch, but real counts
   rather than the '—' a zeroed-out class reads as "not applicable". DWDM's
   count is a ROADM shelf's line + client optics — more than a radio unit,
   fewer than a switch's dense copper/fibre fabric. Server is the one class
   that genuinely has no countable network ports here, so it's the only
   one still left at [0, 0]. */
export const portsOf = (cls: NeClass, i: number): [number, number] =>
  cls === 'router' ? [36, 22 - (i % 5)] : cls === 'switch' ? [48, 30 + (i % 9)]
  : cls === 'enodeb' ? [6, 4 + (i % 3)] : cls === 'gnodeb' ? [8, 5 + (i % 4)]
  : cls === 'dwdm' ? [24, 14 + (i % 8)] : [0, 0];

const COMPLIANCE: Record<string, 'ok' | 'behind' | 'unknown'> = {
  'MX960': 'behind', 'NCS-540': 'ok', 'ACX2200': 'ok', 'MX204': 'behind',
  'ASR920': 'behind', '7750': 'unknown', '7750 SR-7': 'unknown', 'EX4300-48P': 'ok',
  'ACX7024': 'ok', 'C9300-48UXM': 'ok', 'EX2200-24T': 'behind', 'L3-CORE-48P': 'ok',
  'C9400-LC-48T': 'ok', 'L2-ACCESS-24P': 'ok', 'AirScale': 'ok', 'AirScale 5G': 'ok'
};
export const complianceOf = (model: string) => COMPLIANCE[model] ?? 'unknown';

export type EosBand = 'past' | 'soon' | 'safe' | 'unknown';
const EOS: Record<string, [string, EosBand]> = {
  'MX960': ['30-Jun-2025', 'past'], 'MX204': ['31-Dec-2027', 'soon'], 'ASR920': ['30-Sep-2026', 'soon'],
  'EX2200-24T': ['31-Mar-2024', 'past'], 'EX4300-48P': ['31-Dec-2029', 'safe'], 'NCS-540': ['31-Dec-2030', 'safe'],
  'ACX2200': ['30-Jun-2030', 'safe'], 'ACX7024': ['31-Dec-2032', 'safe'], '7750': ['—', 'unknown'],
  '7750 SR-7': ['—', 'unknown'], 'C9300-48UXM': ['31-Oct-2029', 'safe'], 'C9400-LC-48T': ['30-Apr-2030', 'safe'],
  'L3-CORE-48P': ['31-Dec-2028', 'safe'], 'L2-ACCESS-24P': ['31-Dec-2028', 'safe'],
  'AirScale': ['31-Dec-2031', 'safe'], 'AirScale 5G': ['31-Dec-2033', 'safe'],
  'FSP 3000': ['31-Dec-2031', 'safe']
};
export const eosOf = (model: string): [string, EosBand] => EOS[model] ?? ['—', 'unknown'];

/* Region — the same four-way North/East/West/South split RegionDevices and
   DiscoveredDevices already use (see STATE_DEVICES in data/discovery.ts),
   read off the real state each sample location code sits in rather than a
   second, different taxonomy invented just for this grid. Every loc value
   PHY rows carry (seeds and grow()'s padding alike) is one of these ten
   codes, so the lookup is exhaustive, not a fallback-heavy guess. */
const LOC_REGION: Record<string, Region> = {
  BGLK: 'South', DEL: 'North', INDR: 'East', VJA: 'South', CHE: 'South',
  MAS: 'South', PUN: 'West', HYD: 'South', KOL: 'East', AHM: 'West'
};
export const regionOf = (loc: string): Region => LOC_REGION[loc.split('-')[0]] ?? 'West';

/* System description — the SNMP sysDescr / "show version" banner every real
   NMS surfaces verbatim from the device. Built from the row's own oem/os/
   model rather than invented text: Nokia's os field is already a TiMOS (or
   AirScale) build string read straight through, the way the OEM's own CLI
   would print it; other vendors get their own real banner shape populated
   with that same os/model. The build timestamp is deterministic per row
   name, not re-rolled on every render. */
const hash = (s: string): number => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const buildStamp = (seed: string) => {
  const h = hash(seed);
  const day = 1 + (h % 28), dow = DOW[(h >>> 5) % 7], mon = MON[(h >>> 9) % 12];
  const hh = String((h >>> 13) % 24).padStart(2, '0'), mm = String((h >>> 17) % 60).padStart(2, '0'), ss = String((h >>> 21) % 60).padStart(2, '0');
  const year = 2024 + (h % 3);
  return { text: `${dow} ${mon} ${String(day).padStart(2, '0')} ${hh}:${mm}:${ss} UTC ${year}`, year };
};

export const sysDescrOf = (r: { name: string; oem: string; os: string; model: string }): string => {
  const { name, oem, os, model } = r;
  /* a handful of rows carry a genuinely unknown OS version (os === '—',
     the same placeholder the OS version column itself shows) — the banner
     stays honest about that instead of splicing the placeholder into a
     vendor string that would otherwise read as real data */
  if (!os || os === '—') return '—';
  const { text: built, year } = buildStamp(name);
  const oemU = oem.toUpperCase();
  if (oemU === 'NOKIA' && /^TiMOS/.test(os)) {
    const arch = hash(name) % 2 ? 'both/x86_64' : 'both/armv8hf';
    /* TiMOS-B-24.10.R6 -> 2410B/R6/panos, the same build-path shape SR OS
       itself prints (version digits + release letter, then the R-number) */
    const m = os.match(/^TiMOS-([A-Z])-(\d+)\.(\d+)\.(R\d+)$/);
    const buildPath = m ? `${m[2]}${m[3]}${m[1]}/${m[4]}/panos` : os.replace(/^TiMOS-[A-Z]-/, '');
    return `${os} ${arch} Nokia ${model} Copyright (c) 2000-${year} Nokia. All rights reserved. All use subject to applicable license agreements. Built on ${built} by builder in /builds/${buildPath}`;
  }
  if (oemU === 'NOKIA') { // AirScale radio units carry a SW release code, not a TiMOS string
    return `Nokia ${model}, AirScale SW Release ${os}, Copyright (c) ${year} Nokia. All rights reserved.`;
  }
  if (oemU === 'JUNIPER') {
    return `Juniper Networks, Inc. ${model.toLowerCase()} internet router, kernel JUNOS ${os} Build date: ${built} Copyright (c) 1996-${year}, Juniper Networks, Inc. All rights reserved.`;
  }
  if (oemU === 'CISCO') {
    return `Cisco IOS Software, ${model} Software (${model.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-UNIVERSALK9-M), Version ${os}, RELEASE SOFTWARE (fc${1 + hash(name) % 4}) Copyright (c) 1986-${year} by Cisco Systems, Inc. Compiled ${built}`;
  }
  if (oemU === 'ADVA') {
    return `ADVA Optical Networking, ${model}, Software Release ${os}, Copyright (c) ${year} ADVA Optical Networking SE. All rights reserved. Built ${built}`;
  }
  if (oemU === 'CIENA') {
    return `Ciena Corporation, ${model}, SAOS ${os}, Copyright (c) ${year} Ciena Corporation. All rights reserved. Built ${built}`;
  }
  if (oemU === 'ERICSSON') {
    return `Ericsson AB, ${model}, RAN Software Release ${os}, Copyright (c) ${year} Telefonaktiebolaget LM Ericsson. All rights reserved.`;
  }
  if (oemU === 'HUAWEI') {
    return `Huawei Technologies Co., Ltd., ${model}, VRP (R) Software, Version ${os}, Copyright (c) ${year} Huawei Technologies Co., Ltd. All rights reserved.`;
  }
  return `${oem} ${model}, ${os}, Copyright (c) ${year} ${oem}. All rights reserved. Built ${built}`;
};
