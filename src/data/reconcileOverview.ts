/* ── Reconciliation dashboard (RAN, Core, Transport, IP/MPLS) ────────────
   Static overview data for the network vs. inventory reconciliation summary
   at /discovery/reconcile. Domain colours/labels are shared with the
   Discovery landing page (./discoveryOverview) so a domain reads the same
   colour everywhere. */

import { DOMAIN_HEX, DOMAIN_LABEL, type DomainKey } from './discoveryOverview';
export { DOMAIN_HEX, DOMAIN_LABEL };
export type { DomainKey };

export type OutcomeTone = 'success' | 'warning' | 'orange' | 'error' | 'purple';

export interface CycleOutcome { count: number; value: string; label: string; description: string; tone: OutcomeTone; icon: string }
export const CYCLE_OUTCOME: CycleOutcome[] = [
  { count: 11971, value: '11,971', label: 'Matched', description: 'Network and inventory agree exactly', tone: 'success', icon: '✓' },
  { count: 64, value: '64', label: 'Attribute mismatch', description: "Same device, a value doesn't match — e.g. OS version, serial", tone: 'warning', icon: '⚠' },
  { count: 12, value: '12', label: 'Stale', description: 'Hasn’t been re-checked within the expected scan window', tone: 'orange', icon: '⏱' },
  { count: 22, value: '22', label: 'Missing entity', description: 'Recorded in inventory, not found on the live network', tone: 'error', icon: '⊘' },
  { count: 37, value: '37', label: 'Extra entity', description: 'Found live, not recorded in inventory — includes unresolved matches', tone: 'purple', icon: '⊕' }
];
export const CYCLE_OUTCOME_TOTAL = CYCLE_OUTCOME.reduce((a, o) => a + o.count, 0);

export interface DomainCoverage {
  domain: DomainKey; inScope: number; scanned: number; scannedPct: string;
  inSync: number; drifted: number; lastScan: string; nextScan: string;
}
export const DOMAIN_COVERAGE: DomainCoverage[] = [
  { domain: 'RAN',       inScope: 8450, scanned: 8412, scannedPct: '99.6%', inSync: 8360, drifted: 52, lastScan: '6 min ago',  nextScan: 'Continuous' },
  { domain: 'Core',      inScope: 340,  scanned: 340,  scannedPct: '100%',  inSync: 322,  drifted: 18, lastScan: '2 min ago',  nextScan: 'Continuous' },
  { domain: 'Transport', inScope: 2180, scanned: 2150, scannedPct: '98.6%', inSync: 2097, drifted: 53, lastScan: '12 min ago', nextScan: 'Tonight, 1:00 AM' },
  { domain: 'IPMPLS',    inScope: 1204, scanned: 1204, scannedPct: '100%',  inSync: 1192, drifted: 12, lastScan: '40 sec ago', nextScan: 'Continuous' }
];

export interface DomainBar { domain: DomainKey; count: number }
export const DISCREPANCY_BY_DOMAIN: DomainBar[] = [
  { domain: 'Transport', count: 53 },
  { domain: 'RAN',       count: 52 },
  { domain: 'Core',      count: 18 },
  { domain: 'IPMPLS',    count: 12 }
];

/* `drift` is the region's open discrepancies per domain; each domain column
   sums to that domain's DISCREPANCY_BY_DOMAIN count, so the region view and
   the domain view are two cuts of the same 135 open items */
export interface RegionHealth { region: string; pct: number; drift: Record<DomainKey, number> }
export const REGION_HEALTH: RegionHealth[] = [
  { region: 'West',      pct: 89.7, drift: { RAN: 19, Core: 7, Transport: 21, IPMPLS: 5 } },
  { region: 'Southeast', pct: 93.4, drift: { RAN: 13, Core: 5, Transport: 14, IPMPLS: 3 } },
  { region: 'Northeast', pct: 96.8, drift: { RAN: 9,  Core: 3, Transport: 9,  IPMPLS: 2 } },
  { region: 'Midwest',   pct: 97.1, drift: { RAN: 7,  Core: 2, Transport: 6,  IPMPLS: 1 } },
  { region: 'Mountain',  pct: 98.2, drift: { RAN: 4,  Core: 1, Transport: 3,  IPMPLS: 1 } }
];
export const REGION_DOMAINS: DomainKey[] = ['RAN', 'Core', 'Transport', 'IPMPLS'];

export interface UseCaseRow { label: string; domain: DomainKey; count: number }
export const DISTRIBUTION: UseCaseRow[] = [
  { label: 'Undocumented wavelength',      domain: 'Transport', count: 47 },
  { label: 'PCI collision',                domain: 'RAN',       count: 18 },
  { label: 'New/unregistered cell',        domain: 'RAN',       count: 14 },
  { label: 'NF registration mismatch',     domain: 'Core',      count: 14 },
  { label: 'Neighbor relation drift',      domain: 'RAN',       count: 12 },
  { label: 'Antenna parameter drift',      domain: 'RAN',       count: 8 },
  { label: 'ROADM/amplifier drift',        domain: 'Transport', count: 6 },
  { label: 'Interface admin/oper state',   domain: 'IPMPLS',    count: 5 },
  { label: 'Core config drift',            domain: 'Core',      count: 4 },
  { label: 'Topology gap (LLDP)',          domain: 'IPMPLS',    count: 4 },
  { label: 'VLAN/LAG membership',          domain: 'IPMPLS',    count: 3 }
];
export const DISTRIBUTION_TOTAL = DISTRIBUTION.reduce((a, r) => a + r.count, 0);

export interface CycleActivity { domain: DomainKey; scanned: number; found: number; resolved: number }
export const CYCLE_ACTIVITY: CycleActivity[] = [
  { domain: 'IPMPLS',    scanned: 1204, found: 12, resolved: 9 },
  { domain: 'Core',      scanned: 340,  found: 18, resolved: 11 },
  { domain: 'RAN',       scanned: 8412, found: 52, resolved: 34 },
  { domain: 'Transport', scanned: 2150, found: 53, resolved: 28 }
];

export interface QuickLink { title: string; sub: string; icon: 'workbench' | 'scan' | 'rules' }
export const QUICK_LINKS: QuickLink[] = [
  { title: 'Workbench',       sub: '135 open',                    icon: 'workbench' },
  { title: 'Scan management', sub: '3 continuous, 1 scheduled',   icon: 'scan' },
  { title: 'Rules',           sub: '14 active',                   icon: 'rules' }
];

export const RANGE_OPTIONS = ['Today', '7 days', '30 days'] as const;
export type RangeOption = typeof RANGE_OPTIONS[number];
