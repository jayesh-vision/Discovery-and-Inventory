/* ── Discovery ledger ─────────────────────────────────────
   The last daily cycle, closed at 01-Sep-2026 09:19. Every figure on the
   Insights screen is read from here; nothing is typed into a widget. */

export const CYCLE = { closed: '01-Sep-2026 09:19', durationH: 4.2 };

export const DL = {
  targets: 2308,                              /* gateway / seed IPs polled          */
  runFull: 1842, runPartial: 291, runFail: 175, /* = targets                        */
  identified: 2603,                           /* devices that answered and were identified */
  discRouter: 2212, discSwitch: 391,          /* = identified                       */
  newThisCycle: 68,                           /* identified, no record last cycle   */
} as const;

export const discoveryRate = () => (DL.runFull + DL.runPartial) / DL.targets;   /* answered at all */

/* ── classes a collector reaches ───────────────────────────
   Only Router and Switch have a collector; Server, DWDM, eNodeB and gNodeB
   are inventory-only and never appear in discovery series. */
export const DISC_CLASSES = [
  { k: 'router', n: 'Router', hex: 'var(--vw-color-blue-500)' },
  { k: 'switch', n: 'Switch', hex: 'var(--vw-color-emerald-500)' }
] as const;
export type DiscClass = typeof DISC_CLASSES[number]['k'];

/* seven daily cycles ending with the one above; the last day is the ledger.
   polled = targets, answered = full + partial, fresh = identified for the first time */
export interface Cycle { day: string; router: number; switch: number; polled: number; answered: number; fresh: number; hours: number }
export const DAILY: Cycle[] = [
  { day: '26 Aug', router: 2166, switch: 379, polled: 2217, answered: 2029, fresh: 52, hours: 5.1 },
  { day: '27 Aug', router: 2171, switch: 383, polled: 2231, answered: 2044, fresh: 41, hours: 5.4 },
  { day: '28 Aug', router: 2158, switch: 380, polled: 2240, answered: 2038, fresh: 36, hours: 5.6 },
  { day: '29 Aug', router: 2190, switch: 386, polled: 2262, answered: 2071, fresh: 58, hours: 5.0 },
  { day: '30 Aug', router: 2181, switch: 384, polled: 2274, answered: 2079, fresh: 47, hours: 5.2 },
  { day: '31 Aug', router: 2203, switch: 389, polled: 2289, answered: 2098, fresh: 66, hours: 5.3 },
  { day: '01 Sep', router: DL.discRouter, switch: DL.discSwitch, polled: DL.targets, answered: DL.runFull + DL.runPartial, fresh: DL.newThisCycle, hours: CYCLE.durationH }
];
export const CYCLE_SLA_H = 6;                    /* a cycle must close inside six hours */
export const LAST = DAILY[DAILY.length - 1], PREV = DAILY[DAILY.length - 2];

/* ── typed failure reasons — sum to runFail ───────────────── */
export interface Reason { k: string; n: string; c: number; stage: string; hex: string }
export const REASONS: Reason[] = [
  { k: 'unreach', n: 'Host unreachable',      c: 68, stage: 'Reachability', hex: 'var(--vw-color-blue-500)' },
  { k: 'timeout', n: 'SNMP timeout',          c: 41, stage: 'Reachability', hex: 'var(--vw-color-emerald-500)' },
  { k: 'auth',    n: 'Authentication failed', c: 33, stage: 'Credential',   hex: 'var(--vw-color-purple-500)' },
  { k: 'adapter', n: 'No adapter for model',  c: 18, stage: 'Collect',      hex: 'var(--vw-color-amber-500)' },
  { k: 'parse',   n: 'Response parse error',  c: 9,  stage: 'Parse',        hex: 'var(--vw-color-pink-500)' },
  { k: 'dupip',   n: 'Duplicate management IP', c: 6, stage: 'Identity',    hex: 'var(--vw-color-slate-400)' }
];
export const REASON_CHIP: Record<string, 'pink' | 'purple' | 'info' | 'cyan' | 'warning' | 'neutral'> = {
  auth: 'pink', unreach: 'purple', timeout: 'cyan', adapter: 'warning', parse: 'info', dupip: 'neutral'
};

/* ── by vendor: identified + failed, identified sums to DL.identified ── */
export interface Vendor { n: string; ok: number; fail: number }
export const VENDORS: Vendor[] = [
  { n: 'Juniper',   ok: 1612, fail: 96 },
  { n: 'Cisco',     ok: 806,  fail: 52 },
  { n: 'Cisco SDN', ok: 98,   fail: 11 },
  { n: 'Nokia',     ok: 54,   fail: 8 },
  { n: 'Adva',      ok: 21,   fail: 5 },
  { n: 'Edgecore',  ok: 12,   fail: 3 }
];

/* ── by model: the models carrying the most failures ──────── */
export interface ModelRow { model: string; oem: string; total: number; fail: number }
export const MODELS: ModelRow[] = [
  { model: 'MX960',   oem: 'Juniper', total: 412, fail: 41 },
  { model: 'ASR920',  oem: 'Cisco',   total: 388, fail: 29 },
  { model: 'MX204',   oem: 'Juniper', total: 526, fail: 27 },
  { model: 'EX2200-24T', oem: 'Juniper', total: 143, fail: 19 },
  { model: 'NCS-540', oem: 'Cisco',   total: 297, fail: 14 },
  { model: 'C9300-48UXM', oem: 'Cisco', total: 210, fail: 11 }
];

/* ── by region: circles rolled up to the four operating regions ── */
export type Region = 'North' | 'East' | 'West' | 'South';
export interface RegionRow { region: Region; total: number; fail: number; trend: number }
export const REGIONS: RegionRow[] = [
  { region: 'North', total: 636, fail: 52, trend: -0.9 },
  { region: 'East',  total: 601, fail: 47, trend:  1.8 },
  { region: 'West',  total: 538, fail: 38, trend:  2.4 },
  { region: 'South', total: 533, fail: 38, trend:  1.2 }
];
export const successRate = (r: RegionRow) => 1 - r.fail / r.total;

/* ── devices needing attention: the failed targets ─────────── */
export interface AttentionRow {
  name: string; ip: string; region: Region; vendor: string; model: string; reason: string; last: string;
}
export const ATTENTION: AttentionRow[] = [
  { name: 'RTR-WEST-2045', ip: '10.20.34.45',  region: 'West',  vendor: 'Cisco',   model: 'ASR920',     reason: 'auth',    last: '01 Sep 26, 09:12' },
  { name: 'SW-WEST-1120',  ip: '10.20.11.20',  region: 'West',  vendor: 'Cisco',   model: 'C9300-48UXM',reason: 'unreach', last: '01 Sep 26, 09:08' },
  { name: 'BGLK-EX4300-T-CHR-07', ip: '172.31.31.2', region: 'South', vendor: 'Juniper', model: 'EX4300-48P', reason: 'timeout', last: '01 Sep 26, 09:05' },
  { name: 'EDGE-RTR-012',  ip: '10.100.2.10',  region: 'East',  vendor: 'Juniper', model: 'MX204',      reason: 'timeout', last: '01 Sep 26, 08:58' },
  { name: 'MAS-N7750-BNG-R-T1-SR', ip: '172.31.33.130', region: 'South', vendor: 'Nokia', model: '7750', reason: 'adapter', last: '01 Sep 26, 08:51' },
  { name: 'DEL-C9300-ACC-07', ip: '172.31.35.61', region: 'North', vendor: 'Cisco', model: 'C9300-48UXM', reason: 'auth', last: '01 Sep 26, 08:47' },
  { name: 'KOL-NCS540-AGG-91', ip: '172.31.145.215', region: 'East', vendor: 'Cisco', model: 'NCS-540', reason: 'unreach', last: '01 Sep 26, 08:44' },
  { name: 'PUN-MX204-AGG-07', ip: '172.31.106.37', region: 'West', vendor: 'Juniper', model: 'MX204', reason: 'parse', last: '01 Sep 26, 08:40' },
  { name: 'HYD-NCS540-PE-T4', ip: '172.31.132.7', region: 'South', vendor: 'Cisco', model: 'NCS-540', reason: 'unreach', last: '01 Sep 26, 08:36' },
  { name: 'JAI-MX204-PE-T2', ip: '172.31.101.115', region: 'North', vendor: 'Juniper', model: 'MX204', reason: 'auth', last: '01 Sep 26, 08:31' },
  { name: 'CHE-920-WIFI-R2', ip: '172.31.38.43', region: 'South', vendor: 'Cisco', model: 'ASR920', reason: 'timeout', last: '01 Sep 26, 08:27' },
  { name: 'DEL-N540X-SPARE', ip: '172.31.35.207', region: 'North', vendor: 'Cisco', model: 'NCS-540', reason: 'dupip', last: '01 Sep 26, 08:22' }
];

/* ── geo: identified devices per state, split by class ─────── */
export interface StateDot { st: string; c: string; region: Region; lat: number; lon: number; router: number; switch: number }
export const STATE_DEVICES: StateDot[] = [
  { st: 'Maharashtra',    c: 'MH', region: 'West',  lat: 19.75, lon: 75.71, router: 196, switch: 37 },
  { st: 'Uttar Pradesh',  c: 'UP', region: 'North', lat: 26.85, lon: 80.95, router: 174, switch: 33 },
  { st: 'Karnataka',      c: 'KA', region: 'South', lat: 15.32, lon: 75.71, router: 180, switch: 31 },
  { st: 'Madhya Pradesh', c: 'MP', region: 'East',  lat: 23.47, lon: 77.95, router: 155, switch: 26 },
  { st: 'Delhi',          c: 'DL', region: 'North', lat: 28.61, lon: 77.21, router: 150, switch: 26 },
  { st: 'Tamil Nadu',     c: 'TN', region: 'South', lat: 11.13, lon: 78.66, router: 131, switch: 23 },
  { st: 'Gujarat',        c: 'GJ', region: 'West',  lat: 22.26, lon: 71.19, router: 129, switch: 23 },
  { st: 'Andhra Pradesh', c: 'AP', region: 'South', lat: 15.91, lon: 79.74, router: 122, switch: 21 },
  { st: 'Rajasthan',      c: 'RJ', region: 'North', lat: 27.02, lon: 74.22, router: 117, switch: 21 },
  { st: 'West Bengal',    c: 'WB', region: 'East',  lat: 22.99, lon: 87.86, router: 108, switch: 19 },
  { st: 'Odisha',         c: 'OR', region: 'East',  lat: 20.95, lon: 85.10, router: 103, switch: 18 },
  { st: 'Telangana',      c: 'TS', region: 'South', lat: 17.12, lon: 79.02, router: 114, switch: 20 },
  { st: 'Bihar',          c: 'BR', region: 'East',  lat: 25.10, lon: 85.31, router: 95,  switch: 17 },
  { st: 'Punjab',         c: 'PB', region: 'North', lat: 31.15, lon: 75.34, router: 75,  switch: 13 },
  { st: 'Kerala',         c: 'KL', region: 'South', lat: 10.85, lon: 76.27, router: 78,  switch: 14 },
  { st: 'Haryana',        c: 'HR', region: 'North', lat: 29.06, lon: 76.09, router: 63,  switch: 11 },
  { st: 'Chhattisgarh',   c: 'CG', region: 'East',  lat: 21.28, lon: 81.87, router: 52,  switch: 9 },
  { st: 'Jharkhand',      c: 'JH', region: 'East',  lat: 23.61, lon: 85.28, router: 46,  switch: 8 },
  { st: 'Assam',          c: 'AS', region: 'East',  lat: 26.20, lon: 92.94, router: 58,  switch: 10 },
  { st: 'Jammu and Kashmir', c: 'JK', region: 'North', lat: 33.78, lon: 76.58, router: 35, switch: 6 },
  { st: 'Uttarakhand',    c: 'UK', region: 'North', lat: 30.07, lon: 79.09, router: 31,  switch: 5 }
];

/* Grown after ATTENTION's own declaration — the twelve hand-written rows there
   stay for their narrative detail; the rest of the runFail figure (175, quoted
   throughout Insights) is filled in here so the grid is something you can
   actually open, search and filter, not just a number. Region, vendor and
   reason are each distributed to close exactly on REGIONS.fail, VENDORS.fail
   and REASONS.c once the twelve hand-written rows are accounted for. */
(() => {
  let seed = 34811;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const flatten = <K extends string>(mix: [K, number][]) => mix.flatMap(([k, c]) => Array(c).fill(k)) as K[];
  const pad2 = (v: number) => String(v).padStart(2, '0');

  const MODELS_BY_VENDOR: Record<string, string[]> = {
    Juniper: ['MX960', 'MX204', 'ACX2200', 'ACX7024', 'EX4300-48P', 'EX2200-24T'],
    Cisco: ['ASR920', 'NCS-540', 'C9300-48UXM', 'C9400-LC-48T'],
    'Cisco SDN': ['N9K-C93180YC'],
    Nokia: ['7750', '7750 SR-7'],
    Adva: ['FSP 3000'],
    Edgecore: ['AS7712-32X']
  };
  const ROLE = ['PE', 'AGG', 'ACC', 'CORE', 'EDGE', 'BNG'];

  /* remaining share once the twelve hand-written rows above are subtracted */
  const regions = flatten<Region>([['North', 49], ['East', 45], ['West', 35], ['South', 34]]);
  const vendors = flatten([['Juniper', 92], ['Cisco', 45], ['Cisco SDN', 11], ['Nokia', 7], ['Adva', 5], ['Edgecore', 3]]);
  const reasons = flatten([['unreach', 65], ['timeout', 38], ['auth', 30], ['adapter', 17], ['parse', 8], ['dupip', 5]]);

  regions.forEach((region, i) => {
    const vendor = vendors[i % vendors.length];
    const model = pick(MODELS_BY_VENDOR[vendor]);
    const reason = reasons[i % reasons.length];
    const st = STATE_DEVICES.filter(s => s.region === region);
    const code = st.length ? st[i % st.length].c : region.slice(0, 2).toUpperCase();
    const h = 9 - Math.floor(i / 12), m = 59 - (i * 7) % 60;
    ATTENTION.push({
      name: `${code}-${model.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${pick(ROLE)}-${pad2(10 + i % 88)}`,
      ip: `172.31.${100 + (i * 7) % 140}.${20 + (i * 13) % 230}`,
      region, vendor, model, reason,
      last: `01 Sep 26, ${pad2(Math.max(0, h))}:${pad2(m)}`
    });
  });
})();

/* ledger self-check */
(() => {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const chk = (ok: boolean, m: string) => { if (!ok) throw new Error('discovery ledger: ' + m); };
  chk(DL.runFull + DL.runPartial + DL.runFail === DL.targets, 'run outcomes ≠ targets');
  chk(DL.discRouter + DL.discSwitch === DL.identified, 'classes ≠ identified');
  chk(sum(REASONS.map(r => r.c)) === DL.runFail, 'reasons ≠ failures');
  chk(sum(VENDORS.map(v => v.ok)) === DL.identified, 'vendors ≠ identified');
  chk(sum(VENDORS.map(v => v.fail)) === DL.runFail, 'vendor failures ≠ failures');
  chk(sum(REGIONS.map(r => r.fail)) === DL.runFail, 'region failures ≠ failures');
  chk(sum(REGIONS.map(r => r.total)) === DL.targets, 'region totals ≠ targets');
  chk(sum(STATE_DEVICES.map(s => s.router)) === DL.discRouter && sum(STATE_DEVICES.map(s => s.switch)) === DL.discSwitch, 'states ≠ classes');
  chk(sum(MODELS.map(m => m.fail)) <= DL.runFail, 'model failures exceed failures');
  chk(ATTENTION.length === DL.runFail, 'attention rows ≠ failures');
})();
