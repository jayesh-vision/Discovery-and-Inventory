/* ── Data Center Discovery & Reconciliation Overview ──────────────────────────
   Provides scoped Data Center discovery jobs, adapters, failure root causes,
   and trust metrics for the Discovery Insights dashboard (/discovery/insights)
   when solution=Datacenter.
─────────────────────────────────────────────────────────────────────────── */

import type { DcGeo } from '../solution';
import type {
  DiscoveryScanJob,
  AdapterRow,
  RootCauseFailure,
  TrustMetric
} from './discoveryOverview';

export const DC_US_TRUST_METRICS: TrustMetric[] = [
  {
    label: 'Inventory trust index',
    value: '99.28%',
    hero: true,
    sub: '▲ 0.35 pt vs 7 days ago · target 99.50%',
    trend: [98.4, 98.6, 98.7, 98.9, 99.0, 99.1, 99.1, 99.2, 99.2, 99.3, 99.2, 99.28]
  },
  {
    label: 'Discovery coverage',
    value: '99.82%',
    sub: '3,832 of 3,839 reached and verified across 24 US data centers',
    chip: 'US DC polled targets: 3,839 (3,802 full · 31 partial · 6 failed)',
    trend: [99.2, 99.3, 99.4, 99.5, 99.5, 99.6, 99.7, 99.7, 99.8, 99.7, 99.8, 99.82]
  },
  {
    label: 'Open discrepancy backlog',
    value: '37',
    sub: '12 raised today · 25 carried from earlier cycles',
    trend: [58, 54, 50, 48, 45, 43, 41, 40, 39, 38, 38, 37]
  },
  {
    label: 'Mean time to reconcile',
    value: '2.4h',
    sub: 'Target 3.0h · Storage arrays outlier at 4.2h',
    trend: [4.8, 4.5, 4.2, 3.8, 3.5, 3.2, 3.0, 2.8, 2.7, 2.6, 2.5, 2.4]
  }
];

export const DC_IN_TRUST_METRICS: TrustMetric[] = [
  {
    label: 'Inventory trust index',
    value: '99.15%',
    hero: true,
    sub: '▲ 0.28 pt vs 7 days ago · target 99.50%',
    trend: [98.2, 98.4, 98.5, 98.7, 98.8, 99.0, 99.0, 99.1, 99.1, 99.2, 99.1, 99.15]
  },
  {
    label: 'Discovery coverage',
    value: '99.78%',
    sub: '3,831 of 3,839 reached and verified across 24 India data centers',
    chip: 'India DC polled targets: 3,839 (3,798 full · 33 partial · 8 failed)',
    trend: [99.1, 99.2, 99.3, 99.4, 99.5, 99.5, 99.6, 99.6, 99.7, 99.7, 99.7, 99.78]
  },
  {
    label: 'Open discrepancy backlog',
    value: '41',
    sub: '14 raised today · 27 carried from earlier cycles',
    trend: [62, 58, 55, 52, 49, 47, 45, 43, 42, 42, 41, 41]
  },
  {
    label: 'Mean time to reconcile',
    value: '2.8h',
    sub: 'Target 3.0h · Legacy power sensors outlier at 5.1h',
    trend: [5.1, 4.8, 4.5, 4.1, 3.9, 3.6, 3.4, 3.1, 3.0, 2.9, 2.8, 2.8]
  }
];

export const DC_US_SCAN_JOBS: DiscoveryScanJob[] = [
  {
    id: 'DSC-US-VA-FABRIC',
    domain: 'Transport',
    site: 'VA-DC-001 · Loudoun Tech Center',
    scope: '10.100.0.0/16 · 400G NDR Clos Fabric',
    collector: 'clr-iad-01',
    cred: 'dc-netconf-admin',
    schedule: 'Every 4 h',
    nextRun: 'today 14:00',
    lastRun: '19-Oct-2026 10:00',
    duration: '08 m 12 s',
    targets: 486,
    clean: 479,
    partial: 6,
    fail: 1,
    status: 'Completed'
  },
  {
    id: 'DSC-US-VA-OOB',
    domain: 'Core',
    site: 'VA-DC-002 · Beaumeade Circle',
    scope: '10.102.0.0/20 · Redfish IPMI BMC',
    collector: 'clr-iad-02',
    cred: 'bmc-redfish-v2',
    schedule: 'Continuous · 2 hrs sweep',
    nextRun: 'sweeping now',
    lastRun: '19-Oct-2026 11:30',
    duration: '06 m 44 s',
    targets: 512,
    clean: 508,
    partial: 3,
    fail: 1,
    status: 'Completed'
  },
  {
    id: 'DSC-US-TX-IB',
    domain: 'Transport',
    site: 'TX-DC-005 · Infomart Dallas',
    scope: '10.120.0.0/16 · InfiniBand NDR 800G',
    collector: 'clr-dfw-01',
    cred: 'ib-opensm-telemetry',
    schedule: 'Every 6 h',
    nextRun: 'today 16:00',
    lastRun: '19-Oct-2026 10:15',
    duration: '11 m 05 s',
    targets: 448,
    clean: 442,
    partial: 5,
    fail: 1,
    status: 'Completed'
  },
  {
    id: 'DSC-US-TX-COMPUTE',
    domain: 'Core',
    site: 'TX-DC-006 · Westover Hills',
    scope: '10.124.0.0/18 · High-Density Compute',
    collector: 'clr-dfw-02',
    cred: 'dc-ssh-key',
    schedule: 'Daily 02:00',
    nextRun: 'tomorrow 02:00',
    lastRun: '19-Oct-2026 02:00',
    duration: '24 m 18 s',
    targets: 394,
    clean: 382,
    partial: 9,
    fail: 3,
    status: 'Completed with errors'
  },
  {
    id: 'DSC-US-CA-GPU',
    domain: 'Core',
    site: 'CA-DC-008 · Great America Pkwy',
    scope: '10.140.0.0/16 · DGX & Superpod AI Nodes',
    collector: 'clr-sv-01',
    cred: 'nv-dcgm-telemetry',
    schedule: 'Every 2 h',
    nextRun: 'today 13:00',
    lastRun: '19-Oct-2026 11:00',
    duration: '04 m 52 s',
    targets: 388,
    clean: 386,
    partial: 2,
    fail: 0,
    status: 'Completed'
  },
  {
    id: 'DSC-US-IL-EVPN',
    domain: 'IPMPLS',
    site: 'IL-DC-009 · Franklin St Exchange',
    scope: '10.150.0.0/20 · BGP EVPN Spine Routers',
    collector: 'clr-ord-01',
    cred: 'bgp-grpc-telemetry',
    schedule: 'Continuous · 60s delta',
    nextRun: 'sweeping now',
    lastRun: '19-Oct-2026 11:42',
    duration: '01 m 18 s',
    targets: 356,
    clean: 352,
    partial: 4,
    fail: 0,
    status: 'Completed'
  },
  {
    id: 'DSC-US-WA-STORAGE',
    domain: 'Core',
    site: 'WA-DC-013 · Westlake Center',
    scope: '10.160.0.0/22 · NVMe-oF SAN Storage',
    collector: 'clr-sea-01',
    cred: 'storage-rest-api',
    schedule: 'Daily 03:00',
    nextRun: 'tomorrow 03:00',
    lastRun: '19-Oct-2026 03:00',
    duration: '14 m 22 s',
    targets: 278,
    clean: 274,
    partial: 4,
    fail: 0,
    status: 'Completed'
  },
  {
    id: 'DSC-US-GA-LEAFS',
    domain: 'IPMPLS',
    site: 'GA-DC-011 · Peachtree Exchange',
    scope: '10.170.0.0/20 · Top-of-Rack Leaf Switches',
    collector: 'clr-atl-01',
    cred: 'dc-netconf-admin',
    schedule: 'Every 6 h',
    nextRun: 'today 17:00',
    lastRun: '19-Oct-2026 11:00',
    duration: '09 m 35 s',
    targets: 364,
    clean: 358,
    partial: 5,
    fail: 1,
    status: 'Completed'
  },
  {
    id: 'DSC-US-NJ-DWDM',
    domain: 'Transport',
    site: 'NJ-DC-012 · Secaucus DCI',
    scope: '10.180.0.0/24 · Metro Interconnect DWDM',
    collector: 'clr-sec-01',
    cred: 'dwdm-netconf',
    schedule: 'Weekly Sun 01:00',
    nextRun: 'Sun 01:00',
    lastRun: '18-Oct-2026 01:00',
    duration: '18 m 40 s',
    targets: 218,
    clean: 214,
    partial: 3,
    fail: 1,
    status: 'Completed'
  },
  {
    id: 'DSC-US-CO-K8S',
    domain: 'RAN',
    site: 'CO-DC-015 · Denver Tech Center',
    scope: '10.190.0.0/22 · Kubernetes Edge Nodes',
    collector: 'clr-ord-01',
    cred: 'k8s-kubeconfig',
    schedule: 'On demand',
    nextRun: '—',
    lastRun: '19-Oct-2026 11:20',
    duration: '03 m 15 s',
    targets: 165,
    clean: 160,
    partial: 4,
    fail: 1,
    status: 'Running'
  }
];

export const DC_IN_SCAN_JOBS: DiscoveryScanJob[] = [
  {
    id: 'DSC-IN-MH-FABRIC',
    domain: 'Transport',
    site: 'MH-DC-001 · Mumbai Central Gateway',
    scope: '10.200.0.0/16 · 400G NDR Clos Fabric',
    collector: 'clr-bom-01',
    cred: 'dc-netconf-admin',
    schedule: 'Every 4 h',
    nextRun: 'today 14:00',
    lastRun: '19-Oct-2026 10:00',
    duration: '08 m 45 s',
    targets: 490,
    clean: 481,
    partial: 7,
    fail: 2,
    status: 'Completed'
  },
  {
    id: 'DSC-IN-KA-OOB',
    domain: 'Core',
    site: 'KA-DC-002 · Whitefield Tech Park',
    scope: '10.210.0.0/20 · Redfish IPMI BMC',
    collector: 'clr-blr-01',
    cred: 'bmc-redfish-v2',
    schedule: 'Continuous · 2 hrs sweep',
    nextRun: 'sweeping now',
    lastRun: '19-Oct-2026 11:30',
    duration: '07 m 10 s',
    targets: 508,
    clean: 502,
    partial: 4,
    fail: 2,
    status: 'Completed'
  },
  {
    id: 'DSC-IN-TN-IB',
    domain: 'Transport',
    site: 'TN-DC-003 · Chennai AI Hub',
    scope: '10.220.0.0/16 · InfiniBand NDR 800G',
    collector: 'clr-maa-01',
    cred: 'ib-opensm-telemetry',
    schedule: 'Every 6 h',
    nextRun: 'today 16:00',
    lastRun: '19-Oct-2026 10:15',
    duration: '10 m 50 s',
    targets: 442,
    clean: 435,
    partial: 6,
    fail: 1,
    status: 'Completed'
  },
  {
    id: 'DSC-IN-DL-EVPN',
    domain: 'IPMPLS',
    site: 'DL-DC-009 · Noida Core Facility',
    scope: '10.230.0.0/20 · BGP EVPN Spine Routers',
    collector: 'clr-del-01',
    cred: 'bgp-grpc-telemetry',
    schedule: 'Continuous · 60s delta',
    nextRun: 'sweeping now',
    lastRun: '19-Oct-2026 11:42',
    duration: '01 m 25 s',
    targets: 360,
    clean: 354,
    partial: 5,
    fail: 1,
    status: 'Completed'
  }
];

export const DC_US_ADAPTERS: AdapterRow[] = [
  { adapter: 'Redfish / IPMI (BMC)', proto: 'UDP 623 / HTTPS', domains: ['Core', 'Transport'], endpoints: '1,420 blades', successPct: 99.8, status: 'Healthy' },
  { adapter: 'NETCONF / YANG', proto: 'TCP 830', domains: ['Transport', 'IPMPLS'], endpoints: '1,280 switches', successPct: 99.9, status: 'Healthy' },
  { adapter: 'InfiniBand Subnet Mgr', proto: 'MAD (In-band)', domains: ['Transport'], endpoints: '584 switches', successPct: 99.7, status: 'Healthy' },
  { adapter: 'gNMI / Streaming Telemetry', proto: 'gRPC 57400', domains: ['IPMPLS', 'Core'], endpoints: '460 routers', successPct: 100, status: 'Healthy' },
  { adapter: 'Kubernetes / vSphere API', proto: 'HTTPS 443', domains: ['RAN', 'Core'], endpoints: '95 clusters', successPct: 99.5, status: 'Healthy' }
];

export const DC_US_ROOT_CAUSES: RootCauseFailure[] = [
  {
    cause: 'BMC out-of-band timeout during BMC firmware maintenance',
    domain: 'Core',
    targets: 3,
    examples: ['VA-DC-002-BLD-14', 'TX-DC-006-SRV-09'],
    action: 'Retry BMC handshake',
    tag: 'AUTH'
  },
  {
    cause: 'InfiniBand optical telemetry warning threshold on 800G NDR port',
    domain: 'Transport',
    targets: 2,
    examples: ['TX-DC-005-QM9700-02', 'VA-DC-001-QM9700-04'],
    action: 'Inspect optical transceiver',
    tag: 'NET'
  },
  {
    cause: 'vSwitch VLAN tag mismatch on host secondary vNIC',
    domain: 'Core',
    targets: 1,
    examples: ['CO-DC-015-K8S-W02'],
    action: 'Sync cluster portgroup',
    tag: 'FGP'
  }
];

export const DC_US_DAILY_VALUES: number[][] = [
  [3, 2, 4, 1], [4, 3, 3, 2], [2, 1, 2, 1], [5, 3, 4, 2], [3, 2, 3, 1], [4, 3, 4, 2], [6, 4, 5, 2],
  [4, 2, 3, 1], [5, 3, 4, 2], [3, 2, 3, 1], [6, 4, 5, 3], [4, 2, 4, 2], [3, 1, 2, 1], [4, 2, 3, 2]
];

export function getDcDiscoveryData(geo?: DcGeo | null) {
  const isIndia = geo === 'in';
  return {
    trustMetrics: isIndia ? DC_IN_TRUST_METRICS : DC_US_TRUST_METRICS,
    scanJobs: isIndia ? DC_IN_SCAN_JOBS : DC_US_SCAN_JOBS,
    adapters: DC_US_ADAPTERS,
    rootCauses: DC_US_ROOT_CAUSES,
    dailyValues: DC_US_DAILY_VALUES
  };
}
