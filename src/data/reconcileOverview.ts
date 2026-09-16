/* ── Reconciliation dashboard (RAN, Core, Transport, IP/MPLS) ────────────
   Static overview data for the network vs. inventory reconciliation summary
   at /discovery/reconcile. Domain colours/labels are shared with the
   Discovery landing page (./discoveryOverview) so a domain reads the same
   colour everywhere.

   Every domain-level number below is DERIVED from ./discoveryOverview.ts —
   the Insights page's own canonical, self-cross-checked figures (see the
   assertion IIFEs at the bottom of that file) — rather than re-typed here.
   This file used to carry its own independent copies of the same real-world
   counts (a second "Matched" total, a second per-domain open-discrepancy
   count, ...), and they had already drifted out of sync with Insights'
   numbers by the time this comment was written. Deriving them means the
   Reconciliation overview and the Insights dashboard can never again show
   two different answers to "how many discrepancies are open in Transport." */

import {
  DOMAIN_HEX, DOMAIN_LABEL, type DomainKey,
  MATCH_OUTCOME, DOMAIN_TRUST_ROWS, RECONCILE_CYCLE_ROWS, DISCOVERY_JOB_ROWS, DISCREPANCY_TYPES
} from './discoveryOverview';
import { RULES } from './rules';
export { DOMAIN_HEX, DOMAIN_LABEL };
export type { DomainKey };

export type OutcomeTone = 'success' | 'warning' | 'orange' | 'error' | 'purple';
const OUTCOME_TONE_BY_LABEL: Record<string, OutcomeTone> = {
  'Matched': 'success', 'Attribute mismatch': 'warning', 'Extra — no record': 'purple',
  'Relationship drift': 'warning', 'Missing — no live peer': 'error', 'Unresolved match': 'purple', 'Stale': 'orange'
};
const OUTCOME_ICON_BY_LABEL: Record<string, string> = {
  'Matched': '✓', 'Attribute mismatch': '⚠', 'Extra — no record': '⊕',
  'Relationship drift': '⇄', 'Missing — no live peer': '⊘', 'Unresolved match': '?', 'Stale': '⏱'
};
const OUTCOME_DESC_BY_LABEL: Record<string, string> = {
  'Matched': 'Network and inventory agree exactly',
  'Attribute mismatch': "Same device, a value doesn't match — e.g. OS version, serial",
  'Extra — no record': 'Found live, not recorded in inventory',
  'Relationship drift': 'The record exists, but its neighbours or parent/child links no longer match the live network',
  'Missing — no live peer': 'Recorded in inventory, not found on the live network',
  'Unresolved match': 'A candidate match exists but isn’t confident enough to auto-resolve',
  'Stale': 'Hasn’t been re-checked within the expected scan window'
};

/* one tile per MATCH_OUTCOME row — same 7 categories, same numbers, same
   order as the Insights "Match classes" card, just re-labelled with this
   page's own icon/tone/description conventions. */
export interface CycleOutcome { count: number; value: string; label: string; description: string; tone: OutcomeTone; icon: string }
export const CYCLE_OUTCOME: CycleOutcome[] = MATCH_OUTCOME.map(m => ({
  count: m.value, value: m.value.toLocaleString('en-IN'), label: m.label,
  description: OUTCOME_DESC_BY_LABEL[m.label], tone: OUTCOME_TONE_BY_LABEL[m.label], icon: OUTCOME_ICON_BY_LABEL[m.label]
}));
export const CYCLE_OUTCOME_TOTAL = CYCLE_OUTCOME.reduce((a, o) => a + o.count, 0);

export interface DomainCoverage {
  domain: DomainKey; inScope: number; scanned: number; scannedPct: string;
  inSync: number; drifted: number; lastScan: string; nextScan: string;
}
/* display order kept identical to the array this replaced */
const COVERAGE_ORDER: DomainKey[] = ['RAN', 'Core', 'Transport', 'IPMPLS'];
export const DOMAIN_COVERAGE: DomainCoverage[] = COVERAGE_ORDER.map(domain => {
  const trust = DOMAIN_TRUST_ROWS.find(r => r.domain === domain)!;
  const cycle = RECONCILE_CYCLE_ROWS.find(r => r.domain === domain)!;
  const job = DISCOVERY_JOB_ROWS.find(r => r.domain === domain)!;
  return {
    domain, inScope: trust.inScope, scanned: cycle.scanned,
    scannedPct: `${(cycle.scanned / trust.inScope * 100).toFixed(1)}%`,
    inSync: trust.inSync, drifted: trust.open, lastScan: job.lastRun, nextScan: job.nextRun
  };
});

export interface DomainBar { domain: DomainKey; count: number }
/* sorted by open count, descending, same visual order as before */
export const DISCREPANCY_BY_DOMAIN: DomainBar[] = [...DOMAIN_TRUST_ROWS]
  .sort((a, b) => b.open - a.open)
  .map(r => ({ domain: r.domain, count: r.open }));

/* `drift` is the region's open discrepancies per domain; each domain column
   sums to that domain's DISCREPANCY_BY_DOMAIN count, so the region view and
   the domain view are two cuts of the same 135 open items */
/* the regional split has no canonical per-region source (Insights' own
   REGION_DISCREPANCY uses a different 4-region set with no "Mountain"), so
   the relative shape below is still hand-authored — but each domain COLUMN
   is rescaled at load time to sum to that domain's real, canonical open
   count (the same DOMAIN_TRUST_ROWS.open used everywhere else), so this
   table and the "Open discrepancies by domain" chart next to it can never
   silently disagree on the domain total. */
const REGION_HEALTH_SHAPE: { region: string; pct: number; drift: Record<DomainKey, number> }[] = [
  { region: 'West',      pct: 89.7, drift: { RAN: 19, Core: 7, Transport: 21, IPMPLS: 5 } },
  { region: 'Southeast', pct: 93.4, drift: { RAN: 13, Core: 5, Transport: 14, IPMPLS: 3 } },
  { region: 'Northeast', pct: 96.8, drift: { RAN: 9,  Core: 3, Transport: 9,  IPMPLS: 2 } },
  { region: 'Midwest',   pct: 97.1, drift: { RAN: 7,  Core: 2, Transport: 6,  IPMPLS: 1 } },
  { region: 'Mountain',  pct: 98.2, drift: { RAN: 4,  Core: 1, Transport: 3,  IPMPLS: 1 } }
];
function rescaleColumn(domain: DomainKey): number[] {
  const target = DOMAIN_TRUST_ROWS.find(r => r.domain === domain)!.open;
  const raw = REGION_HEALTH_SHAPE.map(r => r.drift[domain]);
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map(v => Math.round(v * target / rawSum));
  scaled[scaled.length - 1] += target - scaled.reduce((a, b) => a + b, 0);
  return scaled;
}
export interface RegionHealth { region: string; pct: number; drift: Record<DomainKey, number> }
export const REGION_HEALTH: RegionHealth[] = (() => {
  const cols: Record<DomainKey, number[]> = {
    RAN: rescaleColumn('RAN'), Core: rescaleColumn('Core'), Transport: rescaleColumn('Transport'), IPMPLS: rescaleColumn('IPMPLS')
  };
  return REGION_HEALTH_SHAPE.map((r, i) => ({
    region: r.region, pct: r.pct,
    drift: { RAN: cols.RAN[i], Core: cols.Core[i], Transport: cols.Transport[i], IPMPLS: cols.IPMPLS[i] }
  }));
})();
export const REGION_DOMAINS: DomainKey[] = ['RAN', 'Core', 'Transport', 'IPMPLS'];
(() => {
  REGION_DOMAINS.forEach(d => {
    const sum = REGION_HEALTH.reduce((a, r) => a + r.drift[d], 0);
    const want = DOMAIN_TRUST_ROWS.find(r => r.domain === d)!.open;
    if (sum !== want) throw new Error(`reconcileOverview: REGION_HEALTH ${d} sums to ${sum}, domain trust says ${want}`);
  });
})();

/* the exact same 14 discrepancy-type rows Insights' "Open items by type"
   card renders — this page used to keep its own hand-typed 11-row summary
   of the same real-world backlog, with different labels and different
   counts than the canonical list. */
export interface UseCaseRow { label: string; domain: DomainKey; count: number }
export const DISTRIBUTION: UseCaseRow[] = DISCREPANCY_TYPES.map(t => ({ label: t.label, domain: t.domain, count: t.count }));
export const DISTRIBUTION_TOTAL = DISTRIBUTION.reduce((a, r) => a + r.count, 0);

/* same event as Insights' RECONCILE_CYCLE_ROWS — "found"/"resolved" are that
   row's drifted/autoResolved fields under this page's own naming. Insights
   now keeps 2 older cycles behind each domain's latest as real history, so
   this can't map the whole array 1:1 any more — .find() picks each domain's
   first (i.e. newest, since the array is sorted newest-first) row only. */
export interface CycleActivity { domain: DomainKey; scanned: number; found: number; resolved: number }
const CYCLE_ACTIVITY_ORDER: DomainKey[] = ['IPMPLS', 'Core', 'RAN', 'Transport'];
export const CYCLE_ACTIVITY: CycleActivity[] = CYCLE_ACTIVITY_ORDER.map(domain => {
  const c = RECONCILE_CYCLE_ROWS.find(r => r.domain === domain)!;
  return { domain, scanned: c.scanned, found: c.drifted, resolved: c.autoResolved };
});

export interface QuickLink { title: string; sub: string; icon: 'workbench' | 'scan' | 'rules' }
const ACTIVE_RULE_COUNT = RULES.filter(r => r.status === 'Active' || r.status === 'Executing').length;
const CONTINUOUS_JOB_COUNT = DISCOVERY_JOB_ROWS.filter(j => j.schedule.startsWith('Continuous')).length;
const SCHEDULED_JOB_COUNT = DISCOVERY_JOB_ROWS.length - CONTINUOUS_JOB_COUNT;
export const QUICK_LINKS: QuickLink[] = [
  { title: 'Workbench',       sub: `${DISCREPANCY_BY_DOMAIN.reduce((a, r) => a + r.count, 0)} open`, icon: 'workbench' },
  { title: 'Scan management', sub: `${CONTINUOUS_JOB_COUNT} continuous, ${SCHEDULED_JOB_COUNT} scheduled`, icon: 'scan' },
  { title: 'Rules',           sub: `${ACTIVE_RULE_COUNT} active`, icon: 'rules' }
];

export const RANGE_OPTIONS = ['Today', '7 days', '30 days'] as const;
export type RangeOption = typeof RANGE_OPTIONS[number];
