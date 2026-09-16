/* ── Discovery & reconciliation overview (RAN, Core, Transport, IP/MPLS) ──
   Static data for the combined landing page at /discovery/insights: how much
   of the estate discovery actually reaches and trusts, and how well the
   reconciliation engine is keeping it that way. This is a different taxonomy
   from the router/switch discovery data in ./discovery.ts (which still backs
   the region/vendor drill-down screens) — kept as its own module so the two
   don't tangle. DOMAIN_HEX/DOMAIN_LABEL/DomainKey are shared with the
   Reconciliation page (./reconcileOverview.ts) so a domain reads the same
   color and name on both. */

import type { ColorTone } from './ledger';

export type DomainKey = 'RAN' | 'Core' | 'Transport' | 'IPMPLS';
/* purple+fuchsia read as near-identical at a glance, and orange doubles as
   a status color elsewhere on this page — reusing it for a plain domain
   label made a neutral category look like a warning. These four are spaced
   further apart on the wheel and stay off the red/orange/amber range the
   status tiles claim. The -400 shade (not -500) keeps them light, matching
   the pale, low-saturation tone the rest of this page's cards already use —
   solid -500 fills read as far more heavily "highlighted" than anything
   around them. */
export const DOMAIN_HEX: Record<DomainKey, string> = {
  RAN: 'var(--vw-color-blue-400)',
  Core: 'var(--vw-color-violet-400)',
  Transport: 'var(--vw-color-teal-400)',
  IPMPLS: 'var(--vw-color-pink-400)'
};
export const DOMAIN_LABEL: Record<DomainKey, string> = { RAN: 'RAN', Core: 'Core', Transport: 'Transport', IPMPLS: 'IP/MPLS' };

/* ── Inventory trust hero row ─────────────────────────────────────────── */
export interface TrustMetric { label: string; value: string; sub: string; trend: number[]; hero?: boolean; tone?: 'up' | 'down' }
export const TRUST_METRICS: TrustMetric[] = [
  { label: 'Inventory trust index', value: '98.23%', hero: true,
    sub: '▲ 0.41 pt vs 7 days ago · target 99.00%',
    trend: [96.9, 97.1, 97.4, 97.3, 97.6, 97.8, 97.9, 98.0, 98.1, 97.9, 98.1, 98.23] },
  { label: 'Discovery coverage', value: '99.44%',
    sub: '12,106 of 12,174 reached and classified today',
    trend: [98.6, 98.8, 98.9, 99.0, 99.1, 99.0, 99.2, 99.1, 99.3, 99.2, 99.3, 99.44] },
  { label: 'Open discrepancy backlog', value: '147',
    sub: '53 raised today · 94 carried from earlier cycles',
    trend: [210, 198, 190, 182, 175, 168, 160, 155, 150, 149, 150, 147] },
  { label: 'Mean time to reconcile', value: '9.6h',
    sub: 'Target 8.0h · Transport is the outlier at 19.4h',
    trend: [12.4, 12.0, 11.5, 11.1, 10.6, 10.2, 10.0, 9.8, 9.9, 9.7, 9.5, 9.6] }
];

/* ── Discovery jobs ───────────────────────────────────────────────────── */
export interface DiscoveryJobRow {
  domain: DomainKey; protocols: string; schedule: string; targets: number; coveragePct: number;
  status: 'Healthy' | 'Credential warning'; lastRun: string; nextRun: string;
}
export const DISCOVERY_JOB_ROWS: DiscoveryJobRow[] = [
  { domain: 'RAN', protocols: 'SNMP v2c/v3', schedule: 'Continuous · 6 min sweep',
    targets: 8450, coveragePct: 99.55, status: 'Healthy', lastRun: '6 min ago', nextRun: 'sweeping now' },
  { domain: 'Core', protocols: 'REST (NRF), NETCONF', schedule: 'Continuous · 2 min sweep',
    targets: 340, coveragePct: 100, status: 'Healthy', lastRun: '2 min ago', nextRun: 'sweeping now' },
  { domain: 'Transport', protocols: 'SNMP, LLDP, TL1', schedule: 'Nightly 01:00 + 12 min delta',
    targets: 2180, coveragePct: 98.62, status: 'Credential warning', lastRun: '32 min ago', nextRun: '01:00 · in 5h 49m' },
  { domain: 'IPMPLS', protocols: 'NETCONF/YANG, LLDP', schedule: 'Continuous · 60s delta',
    targets: 1284, coveragePct: 100, status: 'Healthy', lastRun: '48 sec ago', nextRun: 'sweeping now' }
];

/* ── New objects discovered per day, last 14 days ────────────────────── */
export const OBJECTS_DAILY_DAYS = Array.from({ length: 14 }, (_, i) => (i === 13 ? 'Today' : `-${13 - i}d`));
export const OBJECTS_DAILY_SERIES = [
  { k: 'ran', n: 'RAN', hex: DOMAIN_HEX.RAN },
  { k: 'transport', n: 'Transport', hex: DOMAIN_HEX.Transport },
  { k: 'core', n: 'Core', hex: DOMAIN_HEX.Core },
  { k: 'ipmpls', n: 'IP/MPLS', hex: DOMAIN_HEX.IPMPLS }
];
/* one row per day, values ordered [ran, transport, core, ipmpls] */
export const OBJECTS_DAILY_VALUES: number[][] = [
  [7, 4, 2, 2], [9, 5, 3, 2], [6, 3, 2, 1], [11, 6, 4, 3], [8, 4, 3, 2], [10, 5, 3, 3], [13, 7, 4, 3],
  [9, 5, 3, 2], [12, 6, 4, 3], [8, 4, 2, 2], [14, 8, 5, 4], [10, 5, 3, 3], [6, 3, 2, 1], [9, 4, 3, 2]
];

/* ── Coverage funnel ──────────────────────────────────────────────────── */
export interface FunnelStat { label: string; value: string; sub?: string }
export const COVERAGE_FUNNEL: FunnelStat[] = [
  { label: 'Assets in scope', value: '12,174' },
  { label: 'Reached & classified', value: '12,106', sub: '99.44%' },
  { label: 'Never verified', value: '68' },
  { label: 'Answered, unidentified', value: '8' },
  { label: 'Live with no record', value: '44' }
];

/* ── Discovery adapters ───────────────────────────────────────────────── */
export interface AdapterRow { adapter: string; proto: string; domains: DomainKey[]; endpoints: string; successPct: number; status: 'Healthy' | 'Credential warning' }
export const ADAPTER_ROWS: AdapterRow[] = [
  { adapter: 'SNMP v2c/v3', proto: 'UDP 161', domains: ['RAN', 'Transport'], endpoints: '8,742', successPct: 99.5, status: 'Healthy' },
  { adapter: 'NETCONF/YANG', proto: 'TCP 830', domains: ['IPMPLS', 'Core'], endpoints: '1,544', successPct: 99.9, status: 'Healthy' },
  { adapter: 'LLDP / CDP', proto: 'Link-layer', domains: ['Transport', 'IPMPLS'], endpoints: '3,354', successPct: 99.8, status: 'Healthy' },
  { adapter: 'REST (NRF)', proto: 'HTTPS', domains: ['Core'], endpoints: '340 NFs', successPct: 100, status: 'Healthy' },
  { adapter: 'TL1 (legacy)', proto: 'TCP 3083', domains: ['Transport'], endpoints: '68', successPct: 73.5, status: 'Credential warning' }
];

/* ── Collector health ─────────────────────────────────────────────────── */
export interface CollectorRow { name: string; domain: DomainKey; targets: number; p95: string; checkin: string; status: 'Online' | 'High latency' }
export const COLLECTOR_ROWS: CollectorRow[] = [
  { name: 'Collector-West', domain: 'RAN', targets: 3204, p95: '8.88s', checkin: '12s ago', status: 'High latency' },
  { name: 'Collector-East', domain: 'Core', targets: 2898, p95: '4.81s', checkin: '8s ago', status: 'Online' },
  { name: 'Collector-Central', domain: 'IPMPLS', targets: 3418, p95: '8.94s', checkin: '15s ago', status: 'Online' },
  { name: 'Collector-Transport', domain: 'Transport', targets: 2678, p95: '1.02s', checkin: '22s ago', status: 'Online' }
];

/* ── Failures by root cause ───────────────────────────────────────────── */
export interface RootCauseFailure { cause: string; domain: DomainKey; targets: number; examples: string[]; action: string; tag: 'AUTH' | 'NET' | 'FGP' }
export const ROOT_CAUSE_FAILURES: RootCauseFailure[] = [
  { cause: 'One credential rotation, not 18 incidents', domain: 'Transport', targets: 18,
    examples: ['TL1-Transport-Legacy-04', 'PE-Core-Backup-02'], action: 'Re-sync vault profile', tag: 'AUTH' },
  { cause: 'Unreachable — 30 behind a degraded collector', domain: 'RAN', targets: 42,
    examples: ['10.44.12.87', '10.212.6.140'], action: 'Health-check Collector-West', tag: 'NET' },
  { cause: 'Answered SNMP, matched no fingerprint', domain: 'RAN', targets: 8,
    examples: ['gNB-Legacy-889'], action: 'Send to fingerprint review', tag: 'FGP' },
  { cause: 'NRF heartbeat gap, subscription not renewed', domain: 'Core', targets: 6,
    examples: ['BLR-UPF-CORE-05', 'BLR-AMF-CORE-02'], action: 'Restart NRF subscription', tag: 'NET' }
];

/* ── Reconciliation cycles, most recent per domain ───────────────────── */
export interface ReconcileCycleRow { domain: DomainKey; when: string; scanned: number; touchlessPct: number; drifted: number; autoResolved: number; queue: number }
export const RECONCILE_CYCLE_ROWS: ReconcileCycleRow[] = [
  { domain: 'IPMPLS', when: '10:31:28', scanned: 1204, touchlessPct: 75, drifted: 12, autoResolved: 9, queue: 3 },
  { domain: 'Core', when: '10:30:08', scanned: 340, touchlessPct: 61, drifted: 18, autoResolved: 11, queue: 7 },
  { domain: 'RAN', when: '10:26:00', scanned: 8412, touchlessPct: 65, drifted: 52, autoResolved: 40, queue: 18 },
  { domain: 'Transport', when: '10:20:00', scanned: 2150, touchlessPct: 53, drifted: 53, autoResolved: 28, queue: 25 }
];
export const RECONCILE_NEXT = { domain: 'Transport' as DomainKey, note: 'nightly full window', unverified: 30, inScope: 2180, eta: '6h 28m', at: '01:00' };

/* ── Match outcome ────────────────────────────────────────────────────── */
export interface MatchTile { label: string; value: number; tone: ColorTone }
export const MATCH_OUTCOME: MatchTile[] = [
  { label: 'Matched', value: 11959, tone: 'emerald' },
  { label: 'Attribute mismatch', value: 53, tone: 'amber' },
  { label: 'Extra — no record', value: 44, tone: 'orange' },
  { label: 'Relationship drift', value: 18, tone: 'sky' },
  { label: 'Missing — no live peer', value: 16, tone: 'red' },
  { label: 'Unresolved match', value: 12, tone: 'purple' },
  { label: 'Stale', value: 4, tone: 'gray' }
];
export const MATCH_TOTAL_NOTE = '11,959 matched · 147 open across six classes';

/* ── Discrepancy types ────────────────────────────────────────────────── */
export type DiscrepancyCategory = 'EXISTENCE' | 'ATTRIBUTE' | 'RELATIONSHIP' | 'FRESHNESS';
export type AgeBand = '<1h' | '1-24h' | '1-7d' | '7-30d' | '>30d';
export interface DiscrepancyTypeRow { label: string; category: DiscrepancyCategory; domain: DomainKey; count: number; ageBand: AgeBand }
export const DISCREPANCY_TYPES: DiscrepancyTypeRow[] = [
  { label: 'Undocumented wavelength', category: 'EXISTENCE', domain: 'Transport', count: 52, ageBand: '<1h' },
  { label: 'PCI value ≠ record', category: 'ATTRIBUTE', domain: 'RAN', count: 18, ageBand: '1-7d' },
  { label: 'New / unregistered cell', category: 'EXISTENCE', domain: 'RAN', count: 14, ageBand: '1-7d' },
  { label: 'Neighbour relation drift', category: 'RELATIONSHIP', domain: 'RAN', count: 12, ageBand: '1-24h' },
  { label: 'NE registration mismatch', category: 'ATTRIBUTE', domain: 'Core', count: 12, ageBand: '1-24h' },
  { label: 'Decommissioned record on file', category: 'EXISTENCE', domain: 'IPMPLS', count: 2, ageBand: '1-24h' },
  { label: 'Antenna parameter drift', category: 'ATTRIBUTE', domain: 'RAN', count: 8, ageBand: '7-30d' },
  { label: 'ROADM setpoint drift', category: 'ATTRIBUTE', domain: 'Transport', count: 6, ageBand: '>30d' },
  { label: 'Interface admin state ≠ record', category: 'ATTRIBUTE', domain: 'IPMPLS', count: 5, ageBand: '7-30d' },
  { label: 'Record with no live peer', category: 'EXISTENCE', domain: 'Core', count: 4, ageBand: '1-24h' },
  { label: 'Core config drift', category: 'ATTRIBUTE', domain: 'Core', count: 4, ageBand: '1-24h' },
  { label: 'Topology gap (LLDP)', category: 'RELATIONSHIP', domain: 'Transport', count: 4, ageBand: '1-24h' },
  { label: 'Stale, past re-verify window', category: 'FRESHNESS', domain: 'IPMPLS', count: 4, ageBand: '1-24h' },
  { label: 'VLAN/LAG membership', category: 'RELATIONSHIP', domain: 'Transport', count: 2, ageBand: '7-30d' }
];

/* ── Backlog, last 30 days ────────────────────────────────────────────── */
export const BACKLOG_DAYS = Array.from({ length: 30 }, (_, i) => (i === 29 ? 'Today' : `${29 - i} days ago`));
const wave = (i: number, base: number, amp: number, period: number, trend: number) =>
  Math.round(base + amp * Math.sin(i / period) + trend * i);
export const BACKLOG_DETECTED = Array.from({ length: 30 }, (_, i) => wave(i, 116, 9, 3.2, 0.18));
export const BACKLOG_AUTORESOLVED = Array.from({ length: 30 }, (_, i) => wave(i, 68, 7, 3.4, 0.15));
/* the two figures the card calls out are today's actual detected/resolved
   counts, not points the sine wave happens to land on */
BACKLOG_DETECTED[29] = 135;
BACKLOG_AUTORESOLVED[29] = 82;

export interface AgeBucket { bucket: string; band: AgeBand; count: number }
export const BACKLOG_AGE: AgeBucket[] = [
  { bucket: '< 1h', band: '<1h', count: 52 },
  { bucket: '1–24h', band: '1-24h', count: 42 },
  { bucket: '1–7d', band: '1-7d', count: 32 },
  { bucket: '7–30d', band: '7-30d', count: 15 },
  { bucket: '> 30d', band: '>30d', count: 6 }
];
/* every one of the 147 DISCREPANCY_TYPES units is aged into exactly one of
   these five buckets, so "click an age bucket, see its items" shows real,
   matching rows rather than a filter with nothing behind it */
(() => {
  BACKLOG_AGE.forEach(b => {
    const sum = DISCREPANCY_TYPES.filter(t => t.ageBand === b.band).reduce((a, t) => a + t.count, 0);
    if (sum !== b.count) throw new Error(`discoveryOverview: age band ${b.band} sums to ${sum}, BACKLOG_AGE says ${b.count}`);
  });
})();

/* ── Trust by domain and region ──────────────────────────────────────── */
export interface DomainTrustRow { domain: DomainKey; inScope: number; unverified: number | null; inSync: number; trustIndexPct: number; open: number; mttrHours: number; touchlessPct: number }
export const DOMAIN_TRUST_ROWS: DomainTrustRow[] = [
  { domain: 'RAN', inScope: 8450, unverified: 38, inSync: 8360, trustIndexPct: 98.93, open: 52, mttrHours: 4.2, touchlessPct: 65 },
  { domain: 'Transport', inScope: 2180, unverified: 30, inSync: 2086, trustIndexPct: 95.69, open: 64, mttrHours: 19.4, touchlessPct: 53 },
  { domain: 'Core', inScope: 340, unverified: null, inSync: 320, trustIndexPct: 94.12, open: 20, mttrHours: 6.8, touchlessPct: 61 },
  { domain: 'IPMPLS', inScope: 1284, unverified: null, inSync: 1193, trustIndexPct: 99.09, open: 11, mttrHours: 2.1, touchlessPct: 75 }
];
/* the footer row restates the page-level hero KPIs, not re-derived from the
   four visible domains above. `open` (147) is the one figure that IS an
   exact sum of the domain rows (52+64+20+11) — it's also the same 147 the
   hero KPI, DISCREPANCY_TYPES and REGION_DISCREPANCY all foot to, checked
   below. `inScope` (12,174) does NOT sum from the domain rows (12,254) —
   that's a wider, department-level population (includes assets no single
   domain job scope claims) the trust index and touchless figures were never
   computed over, so it's kept as its own constant rather than forced to
   match a sum it was never meant to equal. */
export const DOMAIN_TRUST_TOTAL = { inScope: '12,174', unverified: '68', inSync: '11,959', trustIndexPct: '98.23%', open: '147', mttrHours: '9.6h', touchlessPct: '60.7%' };
(() => {
  const openSum = DOMAIN_TRUST_ROWS.reduce((a, d) => a + d.open, 0);
  if (openSum !== 147) throw new Error(`discoveryOverview: domain open counts sum to ${openSum}, not 147`);
})();
/* every widget on this page that claims a per-domain slice of the 147 open
   backlog — this table, DISCREPANCY_TYPES, and the region heatmap — must
   foot to the same four numbers, or "click a domain, see its items"
   silently shows the wrong count */
(() => {
  const byDomain: Record<DomainKey, number> = { RAN: 0, Core: 0, Transport: 0, IPMPLS: 0 };
  DISCREPANCY_TYPES.forEach(t => { byDomain[t.domain] += t.count; });
  (['RAN', 'Core', 'Transport', 'IPMPLS'] as DomainKey[]).forEach(d => {
    const want = DOMAIN_TRUST_ROWS.find(r => r.domain === d)!.open;
    if (byDomain[d] !== want) throw new Error(`discoveryOverview: DISCREPANCY_TYPES ${d} sums to ${byDomain[d]}, domain trust says ${want}`);
  });
})();

/* ── Executive view ───────────────────────────────────────────────────── */

/* Inventory trust index, last 30 days, ending at today's 98.23% — a longer
   run than the hero card's own 12-point trend, since the projection below
   needs a real run-rate to extrapolate from, not just a shape. */
export const TRAJECTORY_DAYS = Array.from({ length: 30 }, (_, i) => (i === 29 ? 'today' : `${-(29 - i)}d`));
export const TRAJECTORY_MEASURED = [
  97.62, 97.58, 97.71, 97.65, 97.80, 97.74, 97.88, 97.85, 97.95, 97.90,
  98.02, 97.97, 98.08, 98.04, 98.12, 98.07, 98.15, 98.10, 98.18, 98.14,
  98.20, 98.16, 98.22, 98.17, 98.21, 98.19, 98.23, 98.20, 98.23, 98.23
];
/* the dashed continuation, at the same +0.41 pt/week run-rate, out to the
   day it crosses the 99.00% target */
export const TRAJECTORY_PROJECTION_DAYS = Array.from({ length: 14 }, (_, i) => (i === 0 ? 'today' : `+${i}d`));
export const TRAJECTORY_PROJECTION = Array.from({ length: 14 }, (_, i) => +(98.23 + 0.41 / 7 * i).toFixed(2));
export const TRAJECTORY_TARGET = 99.00;
export const TIME_TO_TARGET = {
  days: 13, runRate: '+0.41 pt/week', gap: '0.77 pt', reachedOn: '27 September',
  withTopTwo: 'This week', note: 'Run-rate measured over the last 7 days'
};

/* ── Cost of drift ────────────────────────────────────────────────────── */
export interface CostCard {
  key: string; label: string; sub: string;
  inputs: { key: string; label: string; value: number; suffix: string }[];
  compute: (inputs: Record<string, number>) => string;
  note?: string;
}
export const COST_OF_DRIFT: CostCard[] = [
  { key: 'optical', label: 'Unbilled optical capacity', sub: '42 wavelengths live with no service record',
    inputs: [{ key: 'rate', label: 'Assumed managed rate', value: 3800, suffix: 'per wavelength / month' }],
    compute: i => `$${(42 * i.rate * 12 / 1_000_000).toFixed(2)}M /yr` },
  { key: 'engineer', label: 'Engineer time reclaimed', sub: '2,169 touchless closed in 30 days',
    inputs: [
      { key: 'minutes', label: 'At', value: 25, suffix: 'min each' },
      { key: 'loaded', label: 'loaded rate $', value: 65, suffix: '/h' }
    ],
    compute: i => `${Math.round(2169 * i.minutes / 60)} h/mo`,
    note: '$705k a year' },
  { key: 'dispatch', label: 'Field dispatches avoided', sub: '34 West Transport findings traced to a degraded collector',
    inputs: [{ key: 'rate', label: 'Assumed $', value: 340, suffix: 'per Transport field visit' }],
    compute: i => `$${(34 * i.rate).toLocaleString('en-IN')}` },
  { key: 'audit', label: 'Audit exposure', sub: '6 open past 30d · 16 with no peer · 8 unidentified',
    inputs: [], compute: () => '30 records', note: 'Direct count, no assumption' }
];

export interface RiskRow { risk: string; exposure: string; accountable: string; direction: 'up' | 'flat' | 'now'; closesWith: string }
export const RISK_REGISTER: RiskRow[] = [
  { risk: 'Unbilled optical capacity', exposure: '42 live wavelengths with no service record', accountable: 'Revenue Assurance / Transport Eng', direction: 'up', closesWith: 'Wavelength record reconciliation' },
  { risk: 'External inventory audit findings', exposure: '30 records would be raised today', accountable: 'Network Governance', direction: 'flat', closesWith: 'Clearing items open past 30 days' },
  { risk: 'Unidentified hardware, mgmt network', exposure: '8 devices reachable, no fingerprint match', accountable: 'Security Operations', direction: 'now', closesWith: 'Fingerprint review' },
  { risk: 'RAN capacity licence exposure', exposure: '14 cells live outside the licence count', accountable: 'RAN Planning', direction: 'flat', closesWith: 'Cell registration catch-up' }
];

/* ── Closing the gap to 99% ──────────────────────────────────────────── */
export interface GapAction { label: string; gain: number; cumPct: number }
export const GAP_START_PCT = 98.23;
export const GAP_ACTIONS: GapAction[] = [
  { label: 'Restore Collector-West, re-scan Transport', gain: 0.53, cumPct: 98.76 },
  { label: 'Retry the 38 unverified RAN targets', gain: 0.31, cumPct: 99.07 },
  { label: 'Re-sync vault profile netsvc-legacy-ro', gain: 0.15, cumPct: 99.22 },
  { label: 'Close 12 decommissioned Transport records', gain: 0.10, cumPct: 99.32 },
  { label: 'Fingerprint the 8 unclassified responders', gain: 0.07, cumPct: 99.39 }
];
/* the target sits between action 2 and action 3 — 99.07% (after two) is
   already past 99.00% */
export const GAP_TARGET_AFTER = 2;

export const PLATFORM_OUTPUT = { detected: 4354, closedNoEngineer: 2169, touchlessStart: 42, touchlessNow: 61, mttrStart: 14.8, mttrNow: 9.6 };

export const DECISION = {
  title: 'Decision: move Transport to continuous discovery',
  note: '95.69% trust · 64 of 147 open · MTTR 19.4h vs 8h target · only domain on a nightly window',
  ask: 'Move Transport to continuous discovery',
  needs: 'Collector capacity + TL1 adapter uplift',
  expected: 'MTTR 19.4h → under 8h',
  alsoFixes: '42 wavelength records, $1.92M/yr exposure'
};

export const HEATMAP_REGIONS = ['West', 'Southeast', 'Northeast', 'Midwest'];
export interface RegionHeatRow { region: string; drift: Record<DomainKey, number> }
export const REGION_DISCREPANCY: RegionHeatRow[] = [
  { region: 'West', drift: { RAN: 19, Transport: 25, Core: 8, IPMPLS: 5 } },
  { region: 'Southeast', drift: { RAN: 13, Transport: 17, Core: 5, IPMPLS: 3 } },
  { region: 'Northeast', drift: { RAN: 9, Transport: 11, Core: 4, IPMPLS: 2 } },
  { region: 'Midwest', drift: { RAN: 11, Transport: 11, Core: 3, IPMPLS: 1 } }
];
(() => {
  (['RAN', 'Core', 'Transport', 'IPMPLS'] as DomainKey[]).forEach(d => {
    const sum = REGION_DISCREPANCY.reduce((a, r) => a + r.drift[d], 0);
    const want = DOMAIN_TRUST_ROWS.find(r => r.domain === d)!.open;
    if (sum !== want) throw new Error(`discoveryOverview: REGION_DISCREPANCY ${d} sums to ${sum}, domain trust says ${want}`);
  });
})();
