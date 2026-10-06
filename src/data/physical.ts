import { ACTIVE_STATES, NE_CLASSES, PHY_TABS, stockCount, type ActiveStock, type NeClass, type RecState, type Source, type StockState } from './ledger';
import { MASTER_NE, type MasterRegion } from './master';
import type { Region } from './discovery';

/* One row of the Inventory register. Every row is a record of the unified
   device repository (masterDevices.json) — the same element Discovery lists,
   with the same hostname, IP, serial and location id — so a search by any of
   them lands on one device in both products. */
export interface NeRow {
  st: RecState; name: string; ip: string; ip2?: string; model: string; os: string; sn: string; oem: string;
  loc: string; s: Source; stock: StockState; v: number | null;
  city: string; state: string; region: MasterRegion;
}

/* Active estate by class. phyRows / PHY_MATRIX stay the contract every screen
   counts against; the self-check below fails loudly if the register ever stops
   footing to it. */
export const PHY: Record<NeClass, NeRow[]> = Object.fromEntries(NE_CLASSES.map(k => [k,
  MASTER_NE.filter(n => n.cls === k && n.stock !== 'decomm').map(n => ({
    st: n.st, name: n.name, ip: n.ip, ...(n.ip2 ? { ip2: n.ip2 } : {}), model: n.model, os: n.os, sn: n.sn, oem: n.oem, loc: n.loc,
    s: n.s, stock: n.stock, v: n.v, city: n.city, state: n.state, region: n.region
  }))])) as Record<NeClass, NeRow[]>;

(() => {
  for (const cls of NE_CLASSES) for (const st of ACTIVE_STATES) {
    const have = PHY[cls].filter(r => r.stock === st).length;
    if (have !== stockCount(cls, st)) throw new Error(`physical: ${cls}/${st} has ${have} rows, PHY_MATRIX says ${stockCount(cls, st)}`);
  }
  for (const t of PHY_TABS) {
    const disc = PHY[t.k].filter(r => r.s === 'd').length;
    if (disc !== t.disc) throw new Error(`physical: ${t.k} has ${disc} discovered rows, PHY_TABS says ${t.disc}`);
  }
})();

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
  'C9400-LC-48T': 'ok', 'L2-ACCESS-24P': 'ok', 'AirScale': 'ok', 'AirScale 5G': 'ok',
  'ASR9001': 'ok', 'N9K-C93180YC': 'ok', 'AS7712-32X': 'ok', 'FSP 3000': 'ok'
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
  'FSP 3000': ['31-Dec-2031', 'safe'], 'ASR9001': ['31-Oct-2027', 'soon'], 'N9K-C93180YC': ['31-Dec-2031', 'safe'],
  'AS7712-32X': ['31-Dec-2030', 'safe']
};
export const eosOf = (model: string): [string, EosBand] => EOS[model] ?? ['—', 'unknown'];

/* Region — the same four-way North/East/West/South split RegionDevices and
   DiscoveredDevices use, read off the real state the element's location id sits
   in (the location, not a second taxonomy invented for this grid). */
const LOC_REGION = new Map<string, Region>(MASTER_NE.map(n => [n.loc, n.region]));
export const regionOf = (loc: string): Region => LOC_REGION.get(loc) ?? 'West';

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
