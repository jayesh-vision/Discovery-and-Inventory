/* Unified device repository — one population, two views.
   Writes src/data/masterDevices.json, which BOTH Inventory (data/physical.ts,
   data/archive.ts) and Discovery (data/discovery.ts) are built from, so a device
   is the same device — same hostname, IP, serial, OEM, model, location id,
   city, state, region — wherever it is searched.

   Run: node scripts/generate-synced-devices.mjs        (deterministic; re-run after
   changing allLocations.json — locations are only ever READ, never changed)

   The population, and how every ledger figure is reached:

   ne[]      3,115 network elements = 2,703 active (IL.ne) + 412 decommissioned.
             Class × stock foots to PHY_MATRIX; IP-MPLS routers/switches (2,497) carry
             the reconciliation state: 2,379 discovered (s:'d') + 118 not discovered.
   sub[]     1,188 sub-elements (routing engines, logical systems, stack members) —
             "secondary" identified devices. They share their parent's management IP,
             location and OEM, so every identified router/switch resolves to an
             Inventory element:   2,379 matched elements + 1,188 sub-elements = 3,567
             (DL.identified). Inventory R/S (2,847 incl. decommissioned) is smaller than
             3,567, so sub-elements are the only way both ledgers can be true at once.
   tgt[]     3,162 polled targets (DL.targets) = one probe per active R/S element
             (2,497) + 665 loopback probes on dual-homed elements (ip2). 239 fail:
             the 118 non-discovered elements (unreachable / timeout) and 121 stale
             elements (timeout / auth / adapter / parse / duplicate IP).
   states[]  the 28 telecom circles, with the lat/lon Insights' map plots. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOC = JSON.parse(readFileSync(join(root, 'src/data/allLocations.json'), 'utf8'));

/* ── deterministic source ─────────────────────────────────── */
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rnd = mulberry32(20261006);
const pick = a => a[Math.floor(rnd() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const flat = mix => mix.flatMap(([k, c]) => Array(c).fill(k));
const sum = (a, f = x => x) => a.reduce((s, x) => s + f(x), 0);
const die = m => { throw new Error('generate-synced-devices: ' + m); };
const must = (c, m) => { if (!c) die(m); };

/* ── ground truth (mirrors data/ledger.ts and data/discovery.ts) ── */
const CLASSES = ['router', 'switch', 'server', 'dwdm', 'enodeb', 'gnodeb'];
const MATRIX = {
  router: { planned: 58, instore: 21, deployed: 2017, faulty: 52, decomm: 289 },
  switch: { planned: 14, instore: 8, deployed: 315, faulty: 12, decomm: 61 },
  server: { planned: 6, instore: 3, deployed: 82, faulty: 5, decomm: 34 },
  dwdm: { planned: 8, instore: 2, deployed: 65, faulty: 3, decomm: 19 },
  enodeb: { planned: 3, instore: 0, deployed: 14, faulty: 1, decomm: 5 },
  gnodeb: { planned: 3, instore: 0, deployed: 10, faulty: 1, decomm: 4 }
};
const DISC = { router: 2096, switch: 283 };           /* discovered primaries (IL.discovered = 2,379) */
const RS_REGION = { North: 688, East: 650, West: 582, South: 577 };      /* active R/S elements per region */
const TARGETS = { North: 871, East: 823, West: 737, South: 731 };        /* REGIONS.total */
const FAILS = { North: 71, East: 64, West: 52, South: 52 };              /* REGIONS.fail */

const REGION_STATES = {
  North: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Uttarakhand', 'Himachal Pradesh', 'Delhi', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh'],
  West: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa', 'Madhya Pradesh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu'],
  East: ['West Bengal', 'Bihar', 'Odisha', 'Jharkhand', 'Assam', 'Sikkim', 'Arunachal Pradesh', 'Meghalaya', 'Nagaland', 'Manipur', 'Mizoram', 'Tripura'],
  South: ['Karnataka', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala', 'Puducherry', 'Andaman and Nicobar Islands', 'Lakshadweep']
};
const REGION_OF = Object.fromEntries(Object.entries(REGION_STATES).flatMap(([r, s]) => s.map(x => [x, r])));
const REGIONS = ['North', 'East', 'West', 'South'];

/* ── locations: indexed once, never modified ──────────────── */
const TIER = { Central: 'dc', Regional: 'pop', Edge: 'site' };
const locs = LOC.map(l => ({ id: l.id, city: l.city, state: l.state, region: REGION_OF[l.state], tier: TIER[l.cat], st: l.st }));
locs.forEach(l => must(l.region && l.tier, 'unmapped location ' + l.id));
const LOCS_BY_ID = new Map(locs.map(l => [l.id, l]));
must(LOCS_BY_ID.size === 12475, 'locations changed shape');
const POOL = {};     /* region|tier|life → [loc] ; life: live (On-air) | pre (Planned / In progress) */
for (const l of locs) {
  const life = l.st === 'On-air' ? 'live' : (l.st === 'Planned' || l.st === 'In progress') ? 'pre' : 'bad';
  (POOL[`${l.region}|${l.tier}|${life}`] ||= []).push(l);
  (POOL[`${l.region}|${l.tier}|any`] ||= []).push(l);
}
const locWeight = Object.fromEntries(REGIONS.map(r => [r, locs.filter(l => l.region === r).length]));

/* where each class lives */
const TIER_MIX = {
  router: [['dc', 30], ['pop', 50], ['site', 20]], switch: [['dc', 45], ['pop', 35], ['site', 20]],
  server: [['dc', 100]], dwdm: [['dc', 35], ['pop', 65]], enodeb: [['site', 100]], gnodeb: [['site', 100]]
};
const tierFor = (cls, stock) => {
  if (stock === 'instore' && cls !== 'enodeb' && cls !== 'gnodeb') return 'dc';       /* stores sit in the data centre */
  const mix = TIER_MIX[cls], t = rnd() * sum(mix, m => m[1]);
  let a = 0; for (const [k, w] of mix) { a += w; if (t <= a) return k; } return mix[0][0];
};
function pickLoc(region, tier, stock, hint) {
  const life = stock === 'planned' ? 'pre' : 'live';
  const narrow = p => hint ? p.filter(l => l.city === hint.city && l.state === hint.state) : p;
  const tries = hint
    ? [[tier, life], [tier, 'any'], ['pop', life], ['dc', life], ['site', life], ['pop', 'any'], ['dc', 'any'], ['site', 'any']]
    : [[tier, life], [tier, 'any'], ['pop', life], ['dc', life], ['site', life], ['site', 'any']];
  for (const [t, lf] of tries) {
    const p = narrow(POOL[`${region}|${t}|${lf}`] || []);
    if (p.length) return pick(p);
  }
  if (hint) die(`no location in ${hint.city}, ${hint.state}`);
  die('no location for ' + region + ' ' + tier);
}
const regionByWeight = () => { let t = rnd() * sum(REGIONS, r => locWeight[r]); for (const r of REGIONS) { t -= locWeight[r]; if (t <= 0) return r; } return 'East'; };

/* ── model catalogue ──────────────────────────────────────── */
const OS_JUNOS = ['21.2R3-S8.5', '21.4R3-S5.5', '23.2R1-S2.6'];
const M = (cls, oem, vendor, slug, os) => ({ cls, oem, vendor, slug, os });
const MODELS = {
  'MX960': M('router', 'JUNIPER', 'Juniper', 'MX960', OS_JUNOS), 'MX204': M('router', 'JUNIPER', 'Juniper', 'MX204', OS_JUNOS),
  'ACX2200': M('router', 'JUNIPER', 'Juniper', 'ACX2200', OS_JUNOS), 'ACX7024': M('router', 'JUNIPER', 'Juniper', 'ACX7024', ['23.2R1-S2.6', '21.4R3-S5.5']),
  'ASR920': M('router', 'CISCO', 'Cisco', 'ASR920', ['17.6.4']), 'NCS-540': M('router', 'CISCO', 'Cisco', 'NCS540', ['7.9.2', '7.5.2']),
  'ASR9001': M('router', 'CISCO', 'Cisco', 'ASR9001', ['7.5.2', '7.9.2']),
  '7750': M('router', 'NOKIA', 'Nokia', '7750', ['TiMOS-B-24.10.R6']), '7750 SR-7': M('router', 'NOKIA', 'Nokia', '7750SR', ['TiMOS-B-24.10.R6', 'TiMOS-C-22.10.R1']),
  'FSP 3000': M('router', 'ADVA', 'Adva', 'FSP3000', ['ONMSi 21.1']),
  'EX2200-24T': M('switch', 'JUNIPER', 'Juniper', 'EX2200', ['15.1R7']), 'EX4300-48P': M('switch', 'JUNIPER', 'Juniper', 'EX4300', ['20.4R3', '21.4R3-S5.5']),
  'C9300-48UXM': M('switch', 'CISCO', 'Cisco', 'C9300', ['17.9.4']), 'N9K-C93180YC': M('switch', 'CISCO', 'Cisco SDN', 'N9K', ['10.3(4a)']),
  'AS7712-32X': M('switch', 'EDGECORE', 'Edgecore', 'AS7712', ['SONiC 202311']),
  'DL380 Gen11': M('server', 'HPE', 'HPE', 'DL380', ['RHEL 9.4', 'RHEL 9.2']),
  'AMF-CN': M('server', 'NOKIA', 'Nokia', 'AMFCN', ['24.1-NF']), 'UPF-CN': M('server', 'NOKIA', 'Nokia', 'UPFCN', ['24.1-NF']),
  'SMF-CN': M('server', 'NOKIA', 'Nokia', 'SMFCN', ['24.1-NF']), 'NRF-CN': M('server', 'NOKIA', 'Nokia', 'NRFCN', ['24.1-NF']),
  'Cloud Core': M('server', 'ERICSSON', 'Ericsson', 'CLOUDC', ['CGF 2.4']),
  'FSP 3000 DWDM': M('dwdm', 'ADVA', 'Adva', 'FSP3000', ['ONMSi 21.1']), '6500-T12': M('dwdm', 'CIENA', 'Ciena', '6500T12', ['11.5.0']),
  '1830 PSS-32': M('dwdm', 'NOKIA', 'Nokia', '1830PSS', ['R21.6']),
  'AirScale': M('enodeb', 'NOKIA', 'Nokia', 'AIRSCALE', ['21B', '23B']), 'Baseband 6630': M('enodeb', 'ERICSSON', 'Ericsson', 'BB6630', ['L23B']),
  'BTS3900': M('enodeb', 'HUAWEI', 'Huawei', 'BTS3900', ['V100R020C10']),
  'AirScale 5G': M('gnodeb', 'NOKIA', 'Nokia', 'AIRSC5G', ['23A', '23B']), 'AirScale gNB': M('gnodeb', 'NOKIA', 'Nokia', 'AIRGNB', ['23B']),
  'AIR 6449': M('gnodeb', 'ERICSSON', 'Ericsson', 'AIR6449', ['L23B']), 'AAU5613': M('gnodeb', 'HUAWEI', 'Huawei', 'AAU5613', ['V100R020C10'])
};
/* the DWDM FSP 3000 shares the discovery model name with the router-class one; keep the real model string on the row */
const modelName = k => k === 'FSP 3000 DWDM' ? 'FSP 3000' : k;

const NONRS_MODELS = {
  server: flat([['DL380 Gen11', 46], ['AMF-CN', 14], ['UPF-CN', 12], ['SMF-CN', 12], ['NRF-CN', 6], ['Cloud Core', 6]]),
  dwdm: flat([['FSP 3000 DWDM', 36], ['6500-T12', 24], ['1830 PSS-32', 18]]),
  enodeb: flat([['AirScale', 8], ['Baseband 6630', 5], ['BTS3900', 5]]),
  gnodeb: flat([['AirScale 5G', 5], ['AirScale gNB', 3], ['AIR 6449', 3], ['AAU5613', 3]])
};

/* identified (DL.identified) per model = discovered elements + sub-elements */
const IDENT = {
  router: { 'MX960': 412, 'MX204': 526, 'ACX2200': 640, 'ACX7024': 457, 'ASR920': 388, 'NCS-540': 297, 'ASR9001': 209, '7750': 40, '7750 SR-7': 34, 'FSP 3000': 29 },
  switch: { 'EX2200-24T': 143, 'EX4300-48P': 30, 'C9300-48UXM': 210, 'N9K-C93180YC': 134, 'AS7712-32X': 18 }
};
/* …of which this many are the elements themselves (the rest are sub-elements) */
const PRIM = {
  router: { 'MX960': 285, 'MX204': 364, 'ACX2200': 442, 'ACX7024': 316, 'ASR920': 268, 'NCS-540': 205, 'ASR9001': 145, '7750': 28, '7750 SR-7': 23, 'FSP 3000': 20 },
  switch: { 'EX2200-24T': 76, 'EX4300-48P': 16, 'C9300-48UXM': 111, 'N9K-C93180YC': 71, 'AS7712-32X': 9 }
};
must(sum(Object.values(IDENT.router)) === 3032 && sum(Object.values(IDENT.switch)) === 535, 'identified class totals');
must(sum(Object.values(PRIM.router)) === DISC.router && sum(Object.values(PRIM.switch)) === DISC.switch, 'primary class totals');

/* failing elements: model mix per class (vendor totals 131/71/15/11/7/4, named models 41/29/27/19/14/11) */
const FAIL_MODELS = {
  router: [['MX960', 41], ['MX204', 27], ['ASR920', 29], ['NCS-540', 14], ['ASR9001', 17], ['ACX2200', 12], ['ACX7024', 12], ['7750', 6], ['7750 SR-7', 5], ['FSP 3000', 7]],
  switch: [['EX2200-24T', 19], ['C9300-48UXM', 11], ['EX4300-48P', 20], ['N9K-C93180YC', 15], ['AS7712-32X', 4]]
};
/* group: nd = not discovered (118), st = stale discovered (121) */
const GROUP_CAP = { 'nd|router': 52, 'nd|switch': 66, 'st|router': 118, 'st|switch': 3 };
const REASON_POOL = { nd: [['unreach', 93], ['timeout', 25]], st: [['timeout', 31], ['auth', 45], ['adapter', 25], ['parse', 12], ['dupip', 8]] };

/* ── narrative devices: the named elements the screens, tests and legacy prototype refer to ── */
const NORTH_HOME = { city: 'Central Delhi', state: 'Uttar Pradesh' };
const FAIL_NARRATIVE = [
  { name: 'RTR-WEST-2045', ip: '172.31.84.45', model: 'ASR920', city: 'Indore', state: 'Madhya Pradesh', reason: 'auth', group: 'st', sn: 'CAT2084U1WR' },
  { name: 'SW-WEST-1120', ip: '172.31.124.20', model: 'C9300-48UXM', city: 'Pune', state: 'Maharashtra', reason: 'unreach', group: 'nd', sn: 'CAT2112U9SW' },
  { name: 'BGLK-EX4300-T-CHR-07', ip: '172.31.31.2', model: 'EX4300-48P', city: 'Bengaluru', state: 'Karnataka', reason: 'timeout', group: 'nd', sn: 'SW-PRO-CHR-4545' },
  { name: 'EDGE-RTR-012', ip: '172.31.88.10', model: 'MX204', city: 'Kolkata', state: 'West Bengal', reason: 'timeout', group: 'nd', sn: 'JN1288C12EDA' },
  { name: 'MAS-N7750-BNG-R-T1-SR', ip: '172.31.33.130', model: '7750', city: 'Chennai', state: 'Tamil Nadu', reason: 'adapter', group: 'st', sn: 'JS123CC2EAFA' },
  { name: 'DEL-C9300-ACC-07', ip: '172.31.35.61', model: 'C9300-48UXM', ...NORTH_HOME, reason: 'auth', group: 'st', sn: 'CAT2091U4KK' },
  { name: 'KOL-NCS540-AGG-91', ip: '172.31.145.215', model: 'NCS-540', city: 'Kolkata', state: 'West Bengal', reason: 'unreach', group: 'nd', sn: 'FOC2191AGG1' },
  { name: 'PUN-MX204-AGG-07', ip: '172.31.106.37', model: 'MX204', city: 'Pune', state: 'Maharashtra', reason: 'parse', group: 'st', sn: 'JN1106C07PUN' },
  { name: 'HYD-NCS540-PE-T4', ip: '172.31.132.7', model: 'NCS-540', city: 'Hyderabad', state: 'Telangana', reason: 'unreach', group: 'nd', sn: 'FOC2132PET4' },
  { name: 'JAI-MX204-PE-T2', ip: '172.31.101.115', model: 'MX204', city: 'Jaipur', state: 'Rajasthan', reason: 'auth', group: 'st', sn: 'JN1101C15JAI' },
  { name: 'CHE-920-WIFI-R2', ip: '172.31.70.43', model: 'ASR920', city: 'Chennai', state: 'Tamil Nadu', reason: 'timeout', group: 'st', sn: 'CAT2034U1PP' },
  { name: 'DEL-N540X-SPARE', ip: '172.31.42.207', model: 'NCS-540', ...NORTH_HOME, reason: 'dupip', group: 'st', sn: 'CISXSPARE2026' }
];
const OK_NARRATIVE = [   /* discovered, answering — pinned onto a matching element so the name keeps its model, region and city */
  { name: 'NDLS-J960-P_R1-T1-NR', ip: '172.31.42.100', model: 'MX960', ...NORTH_HOME, st: 'ok', sn: 'JN1236F87AFB' },
  { name: 'VZG-N540X-PE-T4-NR', ip: '172.31.53.186', model: 'NCS-540', city: 'Visakhapatnam', state: 'Andhra Pradesh', st: 'ok', sn: 'FW488AS342W' },
  { name: 'CHE-J2.2K-PE-T4-ER', ip: '172.31.61.140', model: 'ACX2200', city: 'Chennai', state: 'Tamil Nadu', st: 'drift', sn: 'PJ0215230255' },
  { name: 'ET-J960-P-T1-WR', ip: '172.31.31.97', model: 'MX960', city: 'Mumbai', state: 'Maharashtra', st: 'drift', sn: 'JN1234C25AFA' },
  { name: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '172.31.86.61', model: 'MX204', city: 'Bengaluru', state: 'Karnataka', st: 'drift', sn: 'JN1186C61SPA' },
  { name: 'ODI-ACX2200-PE-T4', ip: '172.31.61.10', model: 'ACX2200', city: 'Bhubaneswar', state: 'Odisha', st: 'drift', sn: 'JUNACX2200ODI' },
  { name: 'WKR-J7024-PE-T4-WR', ip: '172.31.62.11', model: 'ACX7024', city: 'Pune', state: 'Maharashtra', st: 'ok', sn: 'FL2423AN0050' },
  { name: 'BLR-ACX7024-UNREG-01', ip: '172.31.31.212', model: 'ACX7024', city: 'Bengaluru', state: 'Karnataka', st: 'drift', sn: 'JUNNREG012026' },
  { name: 'INDR-C9300-TEMP', ip: '172.31.39.144', model: 'C9300-48UXM', city: 'Indore', state: 'Madhya Pradesh', st: 'drift', sn: 'CIS00TEMP2026' }
];
const NONRS_NARRATIVE = [
  { cls: 'server', model: 'DL380 Gen11', name: 'BGLK-CDC-SRV-01', ip: '10.10.1.11', city: 'Bengaluru', state: 'Karnataka', sn: 'SGH2041XYZ' },
  { cls: 'server', model: 'DL380 Gen11', name: 'BGLK-CDC-SRV-02', ip: '10.10.1.14', city: 'Bengaluru', state: 'Karnataka', sn: 'SGH2041XZA' },
  { cls: 'server', model: 'DL380 Gen11', name: 'DEL-EDC-SRV-07', ip: '10.10.2.7', ...NORTH_HOME, sn: 'SGH7601144' },
  { cls: 'server', model: 'AMF-CN', name: 'BLR-AMF-CORE-02', ip: '10.10.4.21', city: 'Bengaluru', state: 'Karnataka', sn: 'NOKCORE022026' },
  { cls: 'dwdm', model: 'FSP 3000 DWDM', name: 'WR-ADVA-FSP3000-01', ip: '172.31.175.144', city: 'Mumbai', state: 'Maharashtra', sn: 'ADV3000-8841' },
  { cls: 'dwdm', model: 'FSP 3000 DWDM', name: 'WR-ADVA-FSP3000-02', ip: '172.31.175.145', city: 'Pune', state: 'Maharashtra', sn: 'ADV3000-8842' },
  { cls: 'dwdm', model: '6500-T12', name: 'HYD-CIENA-6500-01', ip: '172.31.193.12', city: 'Hyderabad', state: 'Telangana', sn: 'CIENA6500HYD01' },
  { cls: 'dwdm', model: '1830 PSS-32', name: 'KOL-NOKIA-1830PSS-01', ip: '172.31.184.19', city: 'Kolkata', state: 'West Bengal', sn: 'NOK1830KOL01' },
  { cls: 'enodeb', model: 'AirScale', name: 'PUN-HNJW-C3-ENB-014', ip: '10.44.18.14', city: 'Pune', state: 'Maharashtra', sn: 'NOK-ENB-014' },
  { cls: 'enodeb', model: 'AirScale', name: 'INDR-AREA-001-ENB-07', ip: '10.44.19.7', city: 'Indore', state: 'Madhya Pradesh', sn: 'NOK-ENB-007' },
  { cls: 'enodeb', model: 'Baseband 6630', name: 'CHE-ERIC-ENB-031', ip: '10.44.22.31', city: 'Chennai', state: 'Tamil Nadu', sn: 'ERIC-ENB-031' },
  { cls: 'enodeb', model: 'BTS3900', name: 'AHM-HUAWEI-ENB-045', ip: '10.44.24.45', city: 'Ahmedabad', state: 'Gujarat', sn: 'HW-ENB-045' },
  { cls: 'gnodeb', model: 'AirScale 5G', name: 'BLR-SOUTH-GNB-021', ip: '10.51.22.21', city: 'Bengaluru', state: 'Karnataka', sn: 'NOK-GNB-021' },
  { cls: 'gnodeb', model: 'AirScale gNB', name: 'BLR-GNB-T3800-014', ip: '10.51.20.14', city: 'Bengaluru', state: 'Karnataka', sn: 'NOK-GNB-3800' },
  { cls: 'gnodeb', model: 'AirScale 5G', name: 'DEL-CENTRAL-GNB-009', ip: '10.51.23.9', ...NORTH_HOME, sn: 'NOK-GNB-009' },
  { cls: 'gnodeb', model: 'AIR 6449', name: 'VJA-ERIC-GNB-018', ip: '10.51.26.18', city: 'Vijayawada', state: 'Andhra Pradesh', sn: 'ERIC-GNB-018' },
  { cls: 'gnodeb', model: 'AAU5613', name: 'PUN-HUAWEI-GNB-027', ip: '10.51.27.27', city: 'Pune', state: 'Maharashtra', sn: 'HW-GNB-027' }
];

const homeRegion = h => { const r = REGION_OF[h.state]; must(r, 'narrative state ' + h.state); return r; };
must(locs.some(l => l.city === NORTH_HOME.city && l.state === NORTH_HOME.state), 'North narrative city missing');
for (const n of [...FAIL_NARRATIVE, ...OK_NARRATIVE, ...NONRS_NARRATIVE])
  must(locs.some(l => l.city === n.city && l.state === n.state), `narrative city ${n.city}, ${n.state} not in allLocations`);

/* ═══ 1. failing elements (239) ═══════════════════════════════ */
const slots = [];                       /* every active R/S element: attributes first, identity later */
{
  const cap = { ...GROUP_CAP };
  const modelPool = { router: flat(FAIL_MODELS.router), switch: flat(FAIL_MODELS.switch) };
  const regionPool = flat(REGIONS.map(r => [r, FAILS[r]]));
  const reasonPool = { nd: flat(REASON_POOL.nd), st: flat(REASON_POOL.st) };
  const drop = (arr, v, what) => { const i = arr.indexOf(v); must(i >= 0, `failure pool exhausted: ${what} ${v}`); arr.splice(i, 1); };

  for (const n of FAIL_NARRATIVE) {
    const cls = MODELS[n.model].cls, region = homeRegion(n);
    cap[`${n.group}|${cls}`]--; must(cap[`${n.group}|${cls}`] >= 0, 'group capacity ' + n.name);
    drop(modelPool[cls], n.model, 'model'); drop(regionPool, region, 'region'); drop(reasonPool[n.group], n.reason, 'reason');
    slots.push({ kind: 'fail', group: n.group, cls, model: n.model, region, reason: n.reason, pin: n });
  }
  const open = [];
  for (const [k, c] of Object.entries(cap)) { const [group, cls] = k.split('|'); for (let i = 0; i < c; i++) open.push({ group, cls }); }
  must(open.length === modelPool.router.length + modelPool.switch.length && open.length === regionPool.length, 'open failure slots do not foot');
  shuffle(modelPool.router); shuffle(modelPool.switch); shuffle(regionPool); shuffle(reasonPool.nd); shuffle(reasonPool.st);
  for (const o of open)
    slots.push({ kind: 'fail', group: o.group, cls: o.cls, model: modelPool[o.cls].pop(), region: regionPool.pop(), reason: reasonPool[o.group].pop() });
  must(slots.length === 239, 'failure count');
}

/* ═══ 2. healthy discovered elements (2,258) ══════════════════ */
{
  const staleByModel = {};
  slots.filter(s => s.group === 'st').forEach(s => (staleByModel[s.model] = (staleByModel[s.model] || 0) + 1));
  const modelPool = { router: [], switch: [] };
  for (const cls of ['router', 'switch'])
    for (const [m, p] of Object.entries(PRIM[cls])) {
      const n = p - (staleByModel[m] || 0); must(n >= 0, 'more stale failures than discovered elements for ' + m);
      for (let i = 0; i < n; i++) modelPool[cls].push(m);
    }
  const failRegion = Object.fromEntries(REGIONS.map(r => [r, slots.filter(s => s.region === r).length]));
  const regionPool = flat(REGIONS.map(r => [r, RS_REGION[r] - failRegion[r]]));
  must(modelPool.router.length + modelPool.switch.length === regionPool.length, 'healthy pools do not foot');
  const drop = (arr, v, what) => { const i = arr.indexOf(v); must(i >= 0, `healthy pool exhausted: ${what} ${v}`); arr.splice(i, 1); };
  for (const n of OK_NARRATIVE) {
    const cls = MODELS[n.model].cls, region = homeRegion(n);
    drop(modelPool[cls], n.model, 'model'); drop(regionPool, region, 'region');
    slots.push({ kind: 'ok', cls, model: n.model, region, pin: n });
  }
  shuffle(modelPool.router); shuffle(modelPool.switch); shuffle(regionPool);
  for (const cls of ['router', 'switch']) while (modelPool[cls].length) slots.push({ kind: 'ok', cls, model: modelPool[cls].pop(), region: regionPool.pop() });
  must(slots.length === 2497 && !regionPool.length, 'R/S element count');
}

/* ═══ 3. stock, source and reconciliation state ═══════════════ */
/* discovered routers: planned 33 (staged, already on the network), faulty 46, rest deployed;
   not-discovered routers: instore 21, planned 25, faulty 6 · switches: planned 14, instore 8, faulty 12, deployed 32 */
const ND_STOCK = { router: flat([['instore', 21], ['planned', 25], ['faulty', 6]]), switch: flat([['planned', 14], ['instore', 8], ['faulty', 12], ['deployed', 32]]) };
shuffle(ND_STOCK.router); shuffle(ND_STOCK.switch);
const rsOk = { router: slots.filter(s => s.kind === 'ok' && s.cls === 'router' && !s.pin), switch: slots.filter(s => s.kind === 'ok' && s.cls === 'switch') };
const pinnedOk = slots.filter(s => s.pin && s.kind === 'ok');
const discStock = flat([['planned', 33], ['faulty', 46]]);
shuffle(rsOk.router);
for (const s of slots) {
  if (s.kind !== 'fail') continue;
  if (s.group === 'nd') {
    s.stock = ND_STOCK[s.cls].pop(); s.s = s.stock === 'planned' ? 'p' : 'm';
    s.st = (s.stock === 'planned' || s.stock === 'instore') ? 'none' : 'miss';
  } else { s.stock = 'deployed'; s.s = 'd'; s.st = 'stale'; }
}
/* stock for the healthy routers (pinned ones are deployed) */
for (const s of slots) if (s.kind === 'ok') { s.stock = 'deployed'; s.s = 'd'; }
rsOk.router.slice(0, discStock.length).forEach((s, i) => { s.stock = discStock[i]; });
/* reconciliation state of the 2,379 discovered elements: ok 1,829 · drift 392 · stale 158 */
{
  const staged = slots.filter(s => s.s === 'd' && s.stock === 'planned');         /* recorded as planned, answering on the network → drift */
  staged.forEach(s => (s.st = 'drift'));
  const free = slots.filter(s => s.kind === 'ok' && s.st === undefined && !s.pin);
  shuffle(free);
  const stale37 = free.splice(0, 37); stale37.forEach(s => (s.st = 'stale'));
  const drift = free.splice(0, 392 - staged.length - pinnedOk.filter(s => s.pin.st === 'drift').length); drift.forEach(s => (s.st = 'drift'));
  free.forEach(s => (s.st = 'ok'));
  pinnedOk.forEach(s => (s.st = s.pin.st));
  const cnt = k => slots.filter(s => s.s === 'd' && s.st === k).length;
  must(cnt('ok') === 1829 && cnt('drift') === 392 && cnt('stale') === 158, `reconciliation split ${cnt('ok')}/${cnt('drift')}/${cnt('stale')}`);
}
const V = { ok: [3, 5, 6, 10, 11], drift: [3, 5, 31], stale: [720, 960, 1440, 6264, 7104], miss: [6264], none: [null] };

/* ═══ 4. the rest of the active estate and the archive ════════ */
const nonRs = [];   /* active server / dwdm / enodeb / gnodeb */
for (const cls of ['server', 'dwdm', 'enodeb', 'gnodeb']) {
  const stocks = shuffle(flat(['planned', 'instore', 'deployed', 'faulty'].map(k => [k, MATRIX[cls][k]])));
  const models = shuffle(NONRS_MODELS[cls].slice());
  const total = stocks.length; must(models.length === total, `${cls} model mix ${models.length} ≠ ${total}`);
  const pins = NONRS_NARRATIVE.filter(n => n.cls === cls);
  for (const p of pins) { models.splice(models.indexOf(p.model), 1); stocks.splice(stocks.indexOf('deployed'), 1); nonRs.push({ cls, model: p.model, region: homeRegion(p), stock: 'deployed', pin: p }); }
  while (stocks.length) nonRs.push({ cls, model: models.pop(), region: regionByWeight(), stock: stocks.pop() });
}
const decomm = [];
for (const cls of CLASSES) {
  const models = cls === 'router' || cls === 'switch'
    ? flat(Object.entries(IDENT[cls]).map(([m, c]) => [m, c]))   /* same catalogue as the live estate */
    : NONRS_MODELS[cls];
  for (let i = 0; i < MATRIX[cls].decomm; i++) decomm.push({ cls, model: pick(models), region: regionByWeight(), stock: 'decomm' });
}

/* ═══ 5. identity: location, name, IP, serial ════════════════ */
const usedIp = new Set(), usedName = new Set(), usedSn = new Set();
for (const n of [...FAIL_NARRATIVE, ...OK_NARRATIVE, ...NONRS_NARRATIVE]) { usedIp.add(n.ip); usedName.add(n.name); usedSn.add(n.sn); }
const cityCode = c => { const w = c.replace(/[^A-Za-z]/g, '').toUpperCase(); const k = w[0] + w.slice(1).replace(/[AEIOU]/g, ''); return (k.length >= 3 ? k : w).slice(0, 4); };
const STATE_CODE = {}; LOC.forEach(l => (STATE_CODE[l.state] = l.id.split('-')[0]));
const nameSeq = {};
const mkName = (loc, model) => {
  const base = `${STATE_CODE[loc.state]}-${cityCode(loc.city)}-${MODELS[model].slug}`;
  for (;;) { const n = (nameSeq[base] = (nameSeq[base] || 0) + 1); const nm = `${base}-${String(n).padStart(2, '0')}`; if (!usedName.has(nm)) { usedName.add(nm); return nm; } }
};
const IP_BASE = { router: ['172.31', 100], switch: ['172.31', 120], dwdm: ['172.31', 160], server: ['10.10', 10], enodeb: ['10.44', 30], gnodeb: ['10.51', 30], decomm: ['172.30', 0], loop: ['10.255', 0] };
const ipCount = {};
const nextIp = kind => {
  const [pre, o3] = IP_BASE[kind];
  for (;;) { const n = (ipCount[kind] = (ipCount[kind] ?? -1) + 1); const ip = `${pre}.${o3 + Math.floor(n / 240)}.${10 + n % 240}`; if (!usedIp.has(ip)) { usedIp.add(ip); return ip; } }
};
const hex = n => Array.from({ length: n }, () => '0123456789ABCDEF'[Math.floor(rnd() * 16)]).join('');
const alnum = n => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'[Math.floor(rnd() * 34)]).join('');
const letters = n => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(rnd() * 24)]).join('');
const digits = n => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');
const SN = {
  JUNIPER: () => 'JN' + hex(10), CISCO: () => `${pick(['CAT', 'FOC', 'FCW'])}${digits(4)}U${digits(1)}${letters(2)}`, NOKIA: () => 'NS' + digits(8) + letters(2),
  ADVA: () => `ADV${digits(4)}-${digits(4)}`, EDGECORE: () => 'EC' + alnum(10), HPE: () => 'SGH' + alnum(7), CIENA: () => 'CN' + alnum(9),
  HUAWEI: () => '21' + digits(10) + letters(2), ERICSSON: () => 'ER' + alnum(9)
};
const mkSn = oem => { for (;;) { const s = SN[oem](); if (!usedSn.has(s)) { usedSn.add(s); return s; } } };

function build(slot, extra = {}) {
  const def = MODELS[slot.model], pin = slot.pin;
  const loc = pickLoc(slot.region, tierFor(slot.cls, slot.stock), slot.stock, pin ?? null);
  must(loc.region === slot.region, `region drift for ${pin?.name ?? slot.model}`);
  const ipKind = slot.stock === 'decomm' ? 'decomm' : slot.cls;
  const row = {
    name: pin ? pin.name : mkName(loc, slot.model),
    ip: pin ? pin.ip : nextIp(ipKind),
    sn: pin ? pin.sn : mkSn(def.oem),
    oem: def.oem, vendor: def.vendor, model: modelName(slot.model), os: pick(def.os),
    cls: slot.cls, stock: slot.stock, s: slot.s, st: slot.st,
    loc: loc.id, city: loc.city, state: loc.state, region: loc.region
  };
  row.v = pick(V[row.st] ?? [null]);
  return Object.assign(row, extra);
}

/* R/S elements */
const ne = [];
const rsElems = slots.map(s => ({ slot: s, row: build(s) }));
/* non-R/S: no collector — EMS / manual records */
for (const s of nonRs) {
  s.s = s.cls === 'enodeb' || s.cls === 'gnodeb' ? 'e' : 'm';
  s.st = s.stock === 'planned' || s.cls === 'server' ? 'none' : 'ok';
}
const nonRsElems = nonRs.map(s => ({ slot: s, row: build(s) }));

/* the archive */
const WHY = ['Replaced under change request', 'End of life', 'End of support', 'Faulty, returned to OEM', 'Site consolidation', 'Capacity migration', 'Hardware refresh', 'Written off after survey', 'Lease expired, returned', 'Rationalised in ring re-design'];
const BY = ['Anjali Verma', 'Gaurav Shukla', 'Amit Sharma', 'Sai Krishna', 'Harish Kumar', 'Ronit Dulani', 'Meera Nair', 'Vikram Rao'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY = new Date(2026, 8, 3);
const decommElems = decomm.map((s, i) => {
  s.s = 'm'; s.st = 'none';
  const d0 = new Date(TODAY); d0.setDate(d0.getDate() - (20 + Math.floor(rnd() * 2520)));
  return { slot: s, row: build(s, {
    why: pick(WHY), on: `${String(d0.getDate()).padStart(2, '0')}-${MON[d0.getMonth()]}-${d0.getFullYear()}`, by: pick(BY),
    wo: `WO-${d0.getFullYear()}-${1000 + ((i * 313) % 8999)}`, zombie: i === 4 || i === 57 || i === 311
  }) };
});

/* final order: the named elements first, then each class in turn, archive last */
const ordered = [...rsElems.filter(e => e.slot.pin), ...nonRsElems.filter(e => e.slot.pin),
  ...rsElems.filter(e => !e.slot.pin), ...nonRsElems.filter(e => !e.slot.pin), ...decommElems];
ordered.forEach((e, i) => { e.row.id = `NE-${String(i + 1).padStart(5, '0')}`; ne.push(e.row); e.idx = i; });

/* ═══ 6. sub-elements, loopback probes and targets ═══════════ */
const rsByModel = {};
rsElems.filter(e => e.row.s === 'd').forEach(e => (rsByModel[e.row.model + '|' + e.slot.cls] ||= []).push(e));
const sub = [];
const subTags = { router: ['RE1', 'RE0', 'LS1', 'LS2', 'VR1', 'LC1'], switch: ['STK2', 'STK3', 'SM1', 'SM2'] };
const subCount = {};
for (const cls of ['router', 'switch']) {
  for (const [m, tot] of Object.entries(IDENT[cls])) {
    const parents = shuffle((rsByModel[modelName(m) + '|' + cls] || []).slice());
    const n = tot - PRIM[cls][m];
    must(parents.length === PRIM[cls][m], `primary count for ${m}: ${parents.length}`);
    for (let i = 0; i < n; i++) {
      const p = parents[i % parents.length];
      const k = (subCount[p.idx] = (subCount[p.idx] || 0) + 1);
      sub.push({ name: `${p.row.name}-${subTags[cls][(k - 1) % subTags[cls].length]}${k > subTags[cls].length ? k : ''}`, parent: p.idx });
    }
  }
}
must(sub.length === 1188, 'sub-element count ' + sub.length);
must(new Set(sub.map(s => s.name)).size === sub.length, 'sub-element names not unique');
sub.forEach((s, i) => (s.id = `SE-${String(i + 1).padStart(5, '0')}`));

/* loopback probes: n_r + e_r = TARGETS[r]; e_r from healthy discovered elements of that region */
const loop = [];
for (const r of REGIONS) {
  const want = TARGETS[r] - RS_REGION[r];
  const pool = shuffle(rsElems.filter(e => e.slot.kind === 'ok' && e.row.region === r));
  must(pool.length >= want, 'not enough elements for loopback probes in ' + r);
  pool.slice(0, want).forEach(e => { e.row.ip2 = nextIp('loop'); loop.push(e); });
}
must(loop.length === 665, 'loopback probes ' + loop.length);

const tgt = [];
let probeI = 0;
const stamp = () => { probeI++; return { h: 2 + (probeI * 3) % 10, m: (probeI * 11) % 60 }; };
for (const e of rsElems) tgt.push({ ne: e.idx, ip: e.row.ip, ok: e.slot.kind !== 'fail', rk: e.slot.kind === 'fail' ? e.slot.reason : null, ...stamp() });
for (const e of loop) tgt.push({ ne: e.idx, ip: e.row.ip2, ok: true, rk: null, ...stamp() });
{ /* 399 partial of the 2,923 that answered */
  const answered = shuffle(tgt.filter(t => t.ok)); answered.slice(0, 399).forEach(t => (t.partial = true));
}
/* failures lead the list, named narrative first (the order the attention table reads in) */
tgt.sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));
tgt.sort((a, b) => (+!!(ne[b.ne] && FAIL_NARRATIVE.some(n => n.name === ne[b.ne].name)) - +!!(ne[a.ne] && FAIL_NARRATIVE.some(n => n.name === ne[a.ne].name))) || 0);

/* ═══ 7. states table (the 28 circles), then verify everything ═══ */
const states = [...new Set(LOC.map(l => l.state))].map(st => {
  const rows = LOC.filter(l => l.state === st);
  return { st, c: STATE_CODE[st], region: REGION_OF[st], lat: +(sum(rows, l => l.lat) / rows.length).toFixed(2), lon: +(sum(rows, l => l.lon) / rows.length).toFixed(2) };
});

/* ── self-check: every ledger figure, before anything is written ── */
{
  const act = ne.filter(n => n.stock !== 'decomm');
  must(ne.length === 3115 && act.length === 2703, 'element totals');
  for (const cls of CLASSES) for (const [k, c] of Object.entries(MATRIX[cls]))
    must(ne.filter(n => n.cls === cls && n.stock === k).length === c, `PHY_MATRIX ${cls}/${k}`);
  for (const k of ['name', 'ip', 'sn']) must(new Set(ne.map(n => n[k])).size === ne.length, `${k} not unique`);
  must(new Set(ne.filter(n => n.ip2).map(n => n.ip2)).size === 665 && ne.filter(n => n.ip2).every(n => !usedIpCollision(n.ip2)), 'loopback ips');
  for (const n of ne) {
    const l = LOCS_BY_ID.get(n.loc);
    must(l && l.city === n.city && l.state === n.state && REGION_OF[l.state] === n.region, `location ${n.name} → ${n.loc}`);
    must(MODELS[n.model] || n.model === 'FSP 3000', 'model ' + n.model);
  }
  const rs = ne.filter(n => (n.cls === 'router' || n.cls === 'switch') && n.stock !== 'decomm');
  must(rs.length === 2497 && rs.filter(n => n.s === 'd').length === 2379, 'R/S discovered');
  must(rs.filter(n => n.cls === 'router' && n.s === 'd').length === 2096 && rs.filter(n => n.cls === 'switch' && n.s === 'd').length === 283, 'R/S discovered by class');
  for (const r of REGIONS) must(rs.filter(n => n.region === r).length === RS_REGION[r], 'R/S by region ' + r);
  /* targets */
  must(tgt.length === 3162 && tgt.filter(t => t.ok).length === 2923 && tgt.filter(t => !t.ok).length === 239 && tgt.filter(t => t.partial).length === 399, 'targets');
  for (const r of REGIONS) {
    must(tgt.filter(t => ne[t.ne].region === r).length === TARGETS[r], 'targets in ' + r);
    must(tgt.filter(t => !t.ok && ne[t.ne].region === r).length === FAILS[r], 'failures in ' + r);
  }
  const failN = tgt.filter(t => !t.ok);
  const reasons = {}; failN.forEach(t => (reasons[t.rk] = (reasons[t.rk] || 0) + 1));
  must(JSON.stringify([reasons.unreach, reasons.timeout, reasons.auth, reasons.adapter, reasons.parse, reasons.dupip]) === '[93,56,45,25,12,8]', 'failure reasons ' + JSON.stringify(reasons));
  const vend = {}; failN.forEach(t => (vend[ne[t.ne].vendor] = (vend[ne[t.ne].vendor] || 0) + 1));
  must(JSON.stringify([vend.Juniper, vend.Cisco, vend['Cisco SDN'], vend.Nokia, vend.Adva, vend.Edgecore]) === '[131,71,15,11,7,4]', 'failure vendors ' + JSON.stringify(vend));
  const mf = m => failN.filter(t => ne[t.ne].model === m).length;
  must(JSON.stringify(['MX960', 'ASR920', 'MX204', 'EX2200-24T', 'NCS-540', 'C9300-48UXM'].map(mf)) === '[41,29,27,19,14,11]', 'failure models');
  /* identified */
  const ident = [...rs.filter(n => n.s === 'd'), ...sub.map(s => ne[s.parent])];
  must(ident.length === 3567, 'identified ' + ident.length);
  const iv = {}; ident.forEach(n => (iv[n.vendor] = (iv[n.vendor] || 0) + 1));
  must(JSON.stringify([iv.Juniper, iv.Cisco, iv['Cisco SDN'], iv.Nokia, iv.Adva, iv.Edgecore]) === '[2208,1104,134,74,29,18]', 'identified vendors ' + JSON.stringify(iv));
  must(ident.filter(n => n.cls === 'router').length === 3032 && ident.filter(n => n.cls === 'switch').length === 535, 'identified classes');
  const im = m => ident.filter(n => n.model === m).length;
  must(JSON.stringify(['MX960', 'ASR920', 'MX204', 'EX2200-24T', 'NCS-540', 'C9300-48UXM'].map(im)) === '[412,388,526,143,297,210]', 'identified models');
  must(sub.every(s => ne[s.parent].s === 'd' && ne[s.parent].stock !== 'decomm'), 'sub-element parents');
}
function usedIpCollision(ip) { return ne.some(n => n.ip === ip); }

const out = {
  meta: { note: 'Generated by scripts/generate-synced-devices.mjs — do not edit by hand.', elements: ne.length, active: ne.filter(n => n.stock !== 'decomm').length, decommissioned: 412, subElements: sub.length, targets: tgt.length },
  states,
  ne: ne.map(({ id, name, ip, ip2, sn, oem, vendor, model, os, cls, stock, s, st, v, loc, city, state, region, why, on, by, wo, zombie }) =>
    ({ id, name, ip, ...(ip2 ? { ip2 } : {}), sn, oem, vendor, model, os, cls, stock, s, st, v, loc, city, state, region,
       ...(stock === 'decomm' ? { why, on, by, wo, zombie } : {}) })),
  sub: sub.map(({ id, name, parent }) => ({ id, name, parent })),
  tgt: tgt.map(({ ne: i, ip, ok, rk, h, m, partial }) => ({ ne: i, ip, ok, ...(rk ? { rk } : {}), ...(partial ? { partial: true } : {}), h, m }))
};
writeFileSync(join(root, 'src/data/masterDevices.json'), JSON.stringify(out));
console.log(`masterDevices.json  ${ne.length} elements (${out.meta.active} active) · ${sub.length} sub-elements · ${tgt.length} targets (${tgt.filter(t => !t.ok).length} failed) · ${states.length} circles`);
