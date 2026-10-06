import { MASTER_NE, MASTER_STATES, MASTER_SUB, MASTER_TGT, type MasterNe } from './master';

/* ── Discovery ledger ─────────────────────────────────────
   The last daily cycle, closed at 01-Sep-2026 09:19. Every figure on the
   Insights screen is read from here; nothing is typed into a widget. */

const getPastDayLabel = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]}`;
};

const getClosedTime = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()} 09:19`;
};

export const CYCLE = { closed: getClosedTime(), durationH: 4.2 };

export const DL = {
  targets: 3162,                              /* gateway / seed IPs polled          */
  runFull: 2524, runPartial: 399, runFail: 239, /* = targets                        */
  identified: 3567,                           /* devices that answered and were identified */
  discRouter: 3032, discSwitch: 535,          /* = identified                       */
  newThisCycle: 93,                           /* identified, no record last cycle   */
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
  { day: getPastDayLabel(6), router: 2967, switch: 519, polled: 3037, answered: 2779, fresh: 71, hours: 5.1 },
  { day: getPastDayLabel(5), router: 2974, switch: 524, polled: 3056, answered: 2800, fresh: 56, hours: 5.4 },
  { day: getPastDayLabel(4), router: 2956, switch: 521, polled: 3069, answered: 2792, fresh: 49, hours: 5.6 },
  { day: getPastDayLabel(3), router: 3001, switch: 529, polled: 3099, answered: 2837, fresh: 79, hours: 5.0 },
  { day: getPastDayLabel(2), router: 2988, switch: 526, polled: 3115, answered: 2849, fresh: 64, hours: 5.2 },
  { day: getPastDayLabel(1), router: 3018, switch: 533, polled: 3136, answered: 2875, fresh: 90, hours: 5.3 },
  { day: getPastDayLabel(0), router: DL.discRouter, switch: DL.discSwitch, polled: DL.targets, answered: DL.runFull + DL.runPartial, fresh: DL.newThisCycle, hours: CYCLE.durationH }
];
export const CYCLE_SLA_H = 6;                    /* a cycle must close inside six hours */
export const LAST = DAILY[DAILY.length - 1], PREV = DAILY[DAILY.length - 2];

/* ── typed failure reasons — sum to runFail ───────────────── */
export interface Reason { k: string; n: string; c: number; stage: string; hex: string }
export const REASONS: Reason[] = [
  { k: 'unreach', n: 'Host unreachable',      c: 93, stage: 'Reachability', hex: 'var(--vw-color-blue-500)' },
  { k: 'timeout', n: 'SNMP timeout',          c: 56, stage: 'Reachability', hex: 'var(--vw-color-emerald-500)' },
  { k: 'auth',    n: 'Authentication failed', c: 45, stage: 'Credential',   hex: 'var(--vw-color-purple-500)' },
  { k: 'adapter', n: 'No adapter for model',  c: 25, stage: 'Collect',      hex: 'var(--vw-color-amber-500)' },
  { k: 'parse',   n: 'Response parse error',  c: 12, stage: 'Parse',        hex: 'var(--vw-color-pink-500)' },
  { k: 'dupip',   n: 'Duplicate management IP', c: 8, stage: 'Identity',    hex: 'var(--vw-color-slate-400)' }
];
export const REASON_CHIP: Record<string, 'pink' | 'purple' | 'info' | 'cyan' | 'warning' | 'neutral'> = {
  auth: 'pink', unreach: 'purple', timeout: 'cyan', adapter: 'warning', parse: 'info', dupip: 'neutral'
};

/* ── by vendor: identified + failed, identified sums to DL.identified ── */
export interface Vendor { n: string; ok: number; fail: number }
export const VENDORS: Vendor[] = [
  { n: 'Juniper',   ok: 2208, fail: 131 },
  { n: 'Cisco',     ok: 1104, fail: 71 },
  { n: 'Cisco SDN', ok: 134,  fail: 15 },
  { n: 'Nokia',     ok: 74,   fail: 11 },
  { n: 'Adva',      ok: 29,   fail: 7 },
  { n: 'Edgecore',  ok: 18,   fail: 4 }
];

/* ── by model: the models carrying the most failures ────────
   Declared here AND derived from the unified device repository below; the
   ledger self-check at the foot of the file fails if the two ever differ. */
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
  { region: 'North', total: 871, fail: 71, trend: -0.9 },
  { region: 'East',  total: 823, fail: 64, trend:  1.8 },
  { region: 'West',  total: 737, fail: 52, trend:  2.4 },
  { region: 'South', total: 731, fail: 52, trend:  1.2 }
];
export const successRate = (r: RegionRow) => 1 - r.fail / r.total;

/* ── Discovery is a view of the unified device repository ────
   masterDevices.json holds the one population Inventory registers and Discovery
   polls (see scripts/generate-synced-devices.mjs). Nothing below invents a
   device: the 3,162 polled targets, the 239 failures, the 3,567 identified
   devices and the state map are all read from it, so a hostname, IP, serial or
   location id searched here finds the identical element in Inventory. */
const elem = (i: number): MasterNe => MASTER_NE[i];

export const getLiveDateStr = (hh: number, mm: number) => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${yy}, ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/* ── devices needing attention: the failed targets ─────────── */
export interface AttentionRow {
  name: string; ip: string; region: Region; vendor: string; model: string; reason: string; last: string;
  sn: string; loc: string; city: string; state: string;
}
export const ATTENTION: AttentionRow[] = MASTER_TGT.filter(t => !t.ok).map(t => {
  const n = elem(t.ne);
  return { name: n.name, ip: t.ip, region: n.region, vendor: n.vendor, model: n.model, reason: t.rk ?? '', last: getLiveDateStr(t.h, t.m),
    sn: n.sn, loc: n.loc, city: n.city, state: n.state };
});

/* ── the estate, device by device, by region ────────────────
   Each region tile quotes two numbers — "871 devices, 71 failed" — and this
   roster gives every one of the 3,162 polled targets a row. A target is an
   address: an element's management IP, or the loopback of a dual-homed one, so
   a dual-homed element appears once per address it was polled on. The failures
   in it *are* the ATTENTION rows, so a region's grid holds exactly the devices
   its tile counts, failures included and marked. */
export type DeviceStatus = 'Answered' | 'Failed';
export interface RegionDevice {
  name: string; ip: string; region: Region; state: string;
  vendor: string; model: string; status: DeviceStatus; reason: string | null; reasonKey: string | null; last: string;
  sn: string; loc: string; city: string;
}
export const REGION_DEVICES: RegionDevice[] = MASTER_TGT.map((t): RegionDevice => {
  const n = elem(t.ne);
  return {
    name: n.name, ip: t.ip, region: n.region, state: n.state, vendor: n.vendor, model: n.model,
    status: t.ok ? 'Answered' : 'Failed',
    reason: t.rk ? REASONS.find(r => r.k === t.rk)?.n ?? t.rk : null, reasonKey: t.rk ?? null,
    last: getLiveDateStr(t.h, t.m), sn: n.sn, loc: n.loc, city: n.city
  };
});
/* ordered as an estate roster — by state, then by name — rather than failures
   first, which would open a 91.8%-healthy region on a page of nothing but red.
   The Status filter and the toolbar's failed count are how you get to them. */
REGION_DEVICES.sort((a, c) => a.state.localeCompare(c.state) || a.name.localeCompare(c.name) || a.ip.localeCompare(c.ip));
export const devicesIn = (region: Region) => REGION_DEVICES.filter(d => d.region === region);

/** the one filter predicate every screen that reads REGION_DEVICES uses —
    Insights' own counts and the drill-down list both call this, so a count
    on the dashboard and the rows behind its link can never drift apart. */
export interface DeviceFilter { region?: Region; status?: DeviceStatus; vendor?: string; model?: string; reasonKey?: string }
export function filterRegionDevices(f: DeviceFilter): RegionDevice[] {
  return REGION_DEVICES.filter(d =>
    (!f.region || d.region === f.region) && (!f.status || d.status === f.status) &&
    (!f.vendor || d.vendor === f.vendor) && (!f.model || d.model === f.model) &&
    (!f.reasonKey || d.reasonKey === f.reasonKey));
}

/* ── the wider estate: every identified device ──────────────
   3,567 identified = the 2,379 discovered network elements (the very records
   Inventory registers) + 1,188 sub-elements Discovery finds under them —
   routing engines, logical systems, stack members. A sub-element answers on its
   parent's management IP and sits at its parent's location, so every identified
   router and switch resolves to an Inventory element by IP and location id. */
export interface IdentifiedDevice {
  name: string; ip: string; state: string; region: Region; cls: DiscClass; vendor: string; model: string;
  sn: string; loc: string; city: string; kind: 'element' | 'sub'; parent?: string;
}
export const IDENTIFIED_DEVICES: IdentifiedDevice[] = [];
export const filterIdentified = (f: { state?: string; region?: Region; vendor?: string; model?: string }) =>
  IDENTIFIED_DEVICES.filter(d => (!f.state || d.state === f.state) && (!f.region || d.region === f.region) &&
    (!f.vendor || d.vendor === f.vendor) && (!f.model || d.model === f.model));

(() => {
  const subsOf = new Map<number, typeof MASTER_SUB>();
  MASTER_SUB.forEach(sb => subsOf.set(sb.parent, [...(subsOf.get(sb.parent) ?? []), sb]));
  MASTER_NE.forEach((n, i) => {
    if (n.stock === 'decomm' || n.s !== 'd' || (n.cls !== 'router' && n.cls !== 'switch')) return;
    const base = { ip: n.ip, state: n.state, region: n.region, cls: n.cls as DiscClass, vendor: n.vendor, model: n.model, loc: n.loc, city: n.city };
    IDENTIFIED_DEVICES.push({ ...base, name: n.name, sn: n.sn, kind: 'element' });
    for (const sb of subsOf.get(i) ?? [])
      IDENTIFIED_DEVICES.push({ ...base, name: sb.name, sn: `${n.sn}-${sb.name.slice(n.name.length + 1)}`, kind: 'sub', parent: n.name });
  });
})();

/* ── geo: identified devices per state, split by class ───────
   The 28 telecom circles, counted off the identified roster itself. */
export interface StateDot { st: string; c: string; region: Region; lat: number; lon: number; router: number; switch: number }
export const STATE_DEVICES: StateDot[] = MASTER_STATES.map(s => ({
  st: s.st, c: s.c, region: s.region, lat: s.lat, lon: s.lon,
  router: IDENTIFIED_DEVICES.filter(d => d.state === s.st && d.cls === 'router').length,
  switch: IDENTIFIED_DEVICES.filter(d => d.state === s.st && d.cls === 'switch').length
})).filter(s => s.router + s.switch > 0).sort((a, b) => (b.router + b.switch) - (a.router + a.switch) || a.st.localeCompare(b.st));

/* ── scoping the whole page to one circle/region ───────────
   Only REGIONS (totals + failures) and STATE_DEVICES (identified, split by
   class) are tracked per region in the ledger; everything else on the
   Insights screen is a network-wide figure. A region view is built by taking
   the real per-region numbers where they exist (region totals, region
   failures, per-state router/switch counts, and every dimension already on
   the failed-device rows) and, only where the ledger has no regional split at
   all (the 7-day trend, "seen for the first time", vendor/model volumes),
   allocating the network-wide figure across regions in proportion to that
   region's real share of identified devices — so every card and chart moves
   together and the parts still sum back to the network-wide total. The one
   exception is cycle timing: discovery runs as a single job across every
   circle at once, so "time the cycle took" has no per-region meaning and
   stays the same regardless of scope. */
export type Scope = Region | 'all';

export interface DiscoveryScope {
  scope: Scope;
  targets: number; runFull: number; runPartial: number; runFail: number;
  identified: number; discRouter: number; discSwitch: number; newThisCycle: number;
  rate: number;
  daily: Cycle[];
  reasons: Reason[];
  vendors: Vendor[];
  models: ModelRow[];
  attention: AttentionRow[];
  states: StateDot[];
  regions: RegionRow[];
}

export function scopeDiscovery(scope: Scope): DiscoveryScope {
  if (scope === 'all') {
    return {
      scope, targets: DL.targets, runFull: DL.runFull, runPartial: DL.runPartial, runFail: DL.runFail,
      identified: DL.identified, discRouter: DL.discRouter, discSwitch: DL.discSwitch, newThisCycle: DL.newThisCycle,
      rate: discoveryRate(), daily: DAILY, reasons: REASONS, vendors: VENDORS, models: MODELS,
      attention: ATTENTION, states: STATE_DEVICES, regions: REGIONS
    };
  }

  /* two independent populations, exactly as at network level: "answered"
     (runFull + runPartial) always sums with runFail to the region's targets;
     "identified" (router + switch catalogued) is a separate, larger count
     that is not bounded by targets — real per-region figures for both come
     straight from the ledger (REGIONS and STATE_DEVICES), never from each other. */
  const rr = REGIONS.find(r => r.region === scope)!;
  const states = STATE_DEVICES.filter(s => s.region === scope);
  const discRouter = states.reduce((a, s) => a + s.router, 0);
  const discSwitch = states.reduce((a, s) => a + s.switch, 0);
  const identified = discRouter + discSwitch;
  const targets = rr.total, runFail = rr.fail, answered = targets - runFail;
  const fullShare = DL.runFull / (DL.runFull + DL.runPartial);
  const runFull = Math.round(answered * fullShare), runPartial = answered - runFull;
  const identifiedShare = identified / DL.identified;
  const newThisCycle = Math.round(DL.newThisCycle * identifiedShare);

  const attention = ATTENTION.filter(a => a.region === scope);
  const reasons = REASONS.map(r => ({ ...r, c: attention.filter(a => a.reason === r.k).length }));

  /* real per-region counts, not an estimate: IDENTIFIED_DEVICES already
     carries a region on every row, so filtering it is exact — the same
     query the vendor/model drill-down list runs. */
  const vendors = VENDORS.map(v => ({ n: v.n, ok: filterIdentified({ region: scope, vendor: v.n }).length, fail: attention.filter(a => a.vendor === v.n).length }));
  const models = MODELS.map(m => ({ model: m.model, oem: m.oem, total: filterIdentified({ region: scope, model: m.model }).length, fail: attention.filter(a => a.model === m.model).length }));

  const routerShare = discRouter / DL.discRouter, switchShare = discSwitch / DL.discSwitch;
  const targetsShare = targets / DL.targets;
  const daily: Cycle[] = DAILY.map((d, i) => {
    if (i === DAILY.length - 1) return { day: d.day, router: discRouter, switch: discSwitch, polled: targets, answered, fresh: newThisCycle, hours: d.hours };
    return {
      day: d.day, router: Math.round(d.router * routerShare), switch: Math.round(d.switch * switchShare),
      polled: Math.round(d.polled * targetsShare), answered: Math.round(d.answered * targetsShare),
      fresh: Math.round(d.fresh * identifiedShare), hours: d.hours
    };
  });

  return {
    scope, targets, runFull, runPartial, runFail, identified, discRouter, discSwitch, newThisCycle,
    rate: answered / targets, daily, reasons, vendors, models, attention, states, regions: [rr]
  };
}


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
  /* the polled outcomes in the repository are the ledger's outcomes */
  chk(REGION_DEVICES.length === DL.targets, 'region roster ≠ targets');
  chk(MASTER_TGT.filter(t => t.ok && t.partial).length === DL.runPartial, 'partial targets ≠ runPartial');
  chk(MASTER_TGT.filter(t => t.ok && !t.partial).length === DL.runFull, 'full targets ≠ runFull');
  REASONS.forEach(r => chk(ATTENTION.filter(a => a.reason === r.k).length === r.c, `${r.n} rows ≠ its failure count`));
  VENDORS.forEach(v => chk(ATTENTION.filter(a => a.vendor === v.n).length === v.fail, `${v.n} failures ≠ its failure count`));
  /* the region grids must hold exactly what the region tiles count */
  REGIONS.forEach(r => {
    const d = devicesIn(r.region);
    chk(d.length === r.total, `${r.region} roster ≠ its device count`);
    chk(d.filter(x => x.status === 'Failed').length === r.fail, `${r.region} failures ≠ its failure count`);
  });
  /* the identified roster must reproduce, exactly, every marginal the state
     map, the vendor table and the model table quote — a click on any of them
     must land on precisely that many rows */
  chk(IDENTIFIED_DEVICES.length === DL.identified, 'identified roster ≠ identified');
  chk(IDENTIFIED_DEVICES.filter(d => d.cls === 'router').length === DL.discRouter, 'identified routers ≠ discRouter');
  chk(IDENTIFIED_DEVICES.filter(d => d.kind === 'element').length === 2379, 'discovered elements ≠ 2,379');
  STATE_DEVICES.forEach(s => {
    const d = filterIdentified({ state: s.st });
    chk(d.length === s.router + s.switch, `${s.st} roster ≠ its device count`);
  });
  VENDORS.forEach(v => chk(filterIdentified({ vendor: v.n }).length === v.ok, `${v.n} identified roster ≠ its identified count`));
  /* the declared model table is the roster's own count, not a second opinion */
  MODELS.forEach(m => {
    chk(filterIdentified({ model: m.model }).length === m.total, `${m.model} identified roster ≠ its declared total ${m.total}`);
    chk(ATTENTION.filter(a => a.model === m.model).length === m.fail, `${m.model} failures ≠ its declared fail count ${m.fail}`);
  });
  /* every polled address resolves to an Inventory element */
  MASTER_TGT.forEach(t => {
    const n = MASTER_NE[t.ne];
    chk(!!n && (n.ip === t.ip || n.ip2 === t.ip) && n.stock !== 'decomm', `target ${t.ip} has no Inventory element`);
  });
})();
