/* ── Discovery landing page (RAN, Core, Transport, IP/MPLS) ──────────────
   Static overview data for the scan-engine status dashboard at
   /discovery/insights. This is a different taxonomy from the router/switch
   discovery data in ./discovery.ts (which still backs the region/vendor
   drill-down screens) — kept as its own module so the two don't tangle. */

export interface OverviewStat { value: string; label: string; tone: 'plain' | 'success' | 'info' | 'purple' }
export const DISCOVERY_STATS: OverviewStat[] = [
  { value: '12,174', label: 'assets in scope', tone: 'plain' },
  { value: '99.4%', label: 'scan success rate', tone: 'success' },
  { value: '4', label: 'active jobs — 3 continuous, 1 scheduled', tone: 'info' },
  { value: '9', label: 'new objects found today', tone: 'purple' }
];

export type DomainKey = 'RAN' | 'Core' | 'Transport' | 'IPMPLS';
export const DOMAIN_HEX: Record<DomainKey, string> = {
  RAN: 'var(--vw-color-purple-500)',
  Core: 'var(--vw-color-fuchsia-500)',
  Transport: 'var(--vw-color-orange-500)',
  IPMPLS: 'var(--vw-color-sky-500)'
};
export const DOMAIN_LABEL: Record<DomainKey, string> = { RAN: 'RAN', Core: 'Core', Transport: 'Transport', IPMPLS: 'IP/MPLS' };

export interface DiscoveryJob {
  domain: DomainKey; schedule: string; status: 'Healthy' | 'Degraded';
  coverage: string; lastRun: string; nextRun: string;
}
export const DISCOVERY_JOBS: DiscoveryJob[] = [
  { domain: 'RAN',       schedule: 'Continuous',        status: 'Healthy', coverage: '99.6%', lastRun: '6 min ago', nextRun: '—' },
  { domain: 'Core',      schedule: 'Continuous',        status: 'Healthy', coverage: '100%',  lastRun: '2 min ago', nextRun: '—' },
  { domain: 'Transport', schedule: 'Nightly, 1:00 AM',  status: 'Healthy', coverage: '98.6%', lastRun: 'Yesterday', nextRun: 'Tonight, 1:00 AM' },
  { domain: 'IPMPLS',    schedule: 'Continuous',        status: 'Healthy', coverage: '100%',  lastRun: '40 sec ago', nextRun: '—' }
];

export interface AdapterRow { adapter: string; domains: string; endpoints: string; status: string; warn?: boolean }
export const DISCOVERY_ADAPTERS: AdapterRow[] = [
  { adapter: 'SNMP v2c/v3',      domains: 'RAN, Transport',       endpoints: '8,742',      status: 'Healthy' },
  { adapter: 'NETCONF/YANG',     domains: 'IP/MPLS, Core',        endpoints: '1,544',      status: 'Healthy' },
  { adapter: 'LLDP / CDP',       domains: 'Transport, IP/MPLS',   endpoints: '3,354 links', status: 'Healthy' },
  { adapter: 'REST (NRF query)', domains: 'Core',                 endpoints: '340 NFs',    status: 'Healthy' },
  { adapter: 'TL1 (legacy)',     domains: 'Transport',            endpoints: '68',         status: '1 credential warning', warn: true }
];

export interface OutcomeTile { value: string; label: string; tone: 'success' | 'orange' | 'error' | 'warning' }
export const SCAN_OUTCOME: { attempted: string; tiles: OutcomeTile[] } = {
  attempted: '12,174',
  tiles: [
    { value: '12,106', label: 'Reachable & classified', tone: 'success' },
    { value: '42',     label: 'Unreachable (network)',  tone: 'orange' },
    { value: '18',     label: 'Credential failed',      tone: 'error' },
    { value: '8',      label: 'Responded, not classified', tone: 'warning' }
  ]
};

export interface FailedTarget { target: string; domain: DomainKey; adapter: string; reason: string }
export const FAILED_TARGETS: FailedTarget[] = [
  { target: '10.44.12.87',            domain: 'RAN',       adapter: 'SNMP',    reason: 'Timeout, 3 consecutive attempts' },
  { target: 'TL1-Transport-Legacy-04', domain: 'Transport', adapter: 'TL1',     reason: 'Authentication failed' },
  { target: '10.212.6.140',           domain: 'Transport', adapter: 'SNMP',    reason: 'Port unreachable' },
  { target: 'gNB-Legacy-889',         domain: 'RAN',       adapter: 'SNMP',    reason: "Responded, couldn't be classified" },
  { target: 'PE-Core-Backup-02',      domain: 'Core',      adapter: 'NETCONF', reason: 'Authentication failed' }
];

export const DISCOVERY_WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DISCOVERY_WEEK_SERIES = [
  { k: 'ran',       n: 'RAN',       hex: DOMAIN_HEX.RAN },
  { k: 'transport', n: 'Transport', hex: DOMAIN_HEX.Transport },
  { k: 'core',      n: 'Core',      hex: DOMAIN_HEX.Core },
  { k: 'ipmpls',    n: 'IP/MPLS',   hex: DOMAIN_HEX.IPMPLS }
];
/* one row per day, values ordered [ran, transport, core, ipmpls] */
export const DISCOVERY_WEEK_VALUES: number[][] = [
  [5, 3, 2, 1],
  [7, 4, 3, 2],
  [4, 2, 2, 1],
  [8, 5, 3, 3],
  [6, 3, 2, 2],
  [9, 5, 4, 3],
  [7, 4, 3, 2]
];

export interface CollectorHealth { name: string; targets: number; checkin: string; status: string; degraded?: boolean }
export const COLLECTOR_HEALTH: CollectorHealth[] = [
  { name: 'Collector-East',       targets: 3204, checkin: '12s ago', status: 'Online' },
  { name: 'Collector-West',       targets: 2890, checkin: '8s ago',  status: 'Degraded, high latency', degraded: true },
  { name: 'Collector-Central',    targets: 3410, checkin: '15s ago', status: 'Online' },
  { name: 'Collector-Transport',  targets: 2180, checkin: '22s ago', status: 'Online' }
];

export interface ActivityItem { text: string; time: string; warn?: boolean }
export const DISCOVERY_ACTIVITY: ActivityItem[] = [
  { text: 'IP/MPLS delta scan completed — 1,204 touched, 0 errors', time: '40s' },
  { text: 'Core discovery cycle completed — 340 NFs, 0 errors', time: '2m' },
  { text: 'RAN discovery cycle completed — 8,412 cells, 0 errors', time: '6m' },
  { text: 'TL1 credential warning on Transport-Legacy-04', time: '1h', warn: true },
  { text: 'Transport nightly scan completed — 2,150 assets, 3 timeouts', time: 'Yesterday, 1:02 AM' }
];
