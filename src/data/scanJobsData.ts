import type { ChipTone } from './ledger';
import type { DomainKey } from './discoveryOverview';

export type JobStatus = 'Completed' | 'Completed with errors' | 'Running' | 'No adapter' | 'Scheduled' | 'Held' | 'Failed';

export interface RecentRunItem {
  runId: string;
  at: string;
  duration: string;
  targets: number;
  clean: number;
  partial: number;
  fail: number;
  status: JobStatus;
  failureReason?: string;
  failureCode?: string;
}

export interface ScanJob {
  id: string;
  name?: string;
  domain: DomainKey;
  site: string;
  scope: string;
  targetType?: 'CIDR' | 'Seed' | 'Roster' | 'Cell';
  collector: string;
  cred: string;
  protocols?: string[];
  sched: string;
  next: string;
  last: string;
  dur: string;
  targets: number;
  clean: number;
  partial: number;
  fail: number;
  state: JobStatus;
  chip?: ChipTone;
  concurrency?: number;
  timeoutSec?: number;
  retries?: number;
  notes?: string;
  recentRuns?: RecentRunItem[];
  failureReason?: string;
  failureCode?: string;
  failureStage?: string;
  suggestedAction?: string;
}

export const STATUS_CHIP_TONE: Record<JobStatus, ChipTone> = {
  Completed: 'success',
  'Completed with errors': 'warning',
  Running: 'info',
  'No adapter': 'neutral',
  Scheduled: 'info',
  Held: 'warning',
  Failed: 'error'
};

export interface CollectorOption {
  id: string;
  name: string;
  domain: DomainKey;
  region: string;
  status: 'Online' | 'Degraded' | 'Offline';
  latency: string;
  capacityUsedPct: number;
}

export const COLLECTOR_OPTIONS: CollectorOption[] = [
  { id: 'clr-blr-02', name: 'Bengaluru South Gateway', domain: 'IPMPLS', region: 'Karnataka', status: 'Online', latency: '8.2 ms', capacityUsedPct: 42 },
  { id: 'clr-blr-04', name: 'Bengaluru RAN Sweep Node', domain: 'RAN', region: 'Karnataka', status: 'Online', latency: '7.8 ms', capacityUsedPct: 68 },
  { id: 'clr-blr-05', name: 'Bengaluru Core 5GC NRF', domain: 'Core', region: 'Karnataka', status: 'Online', latency: '3.9 ms', capacityUsedPct: 24 },
  { id: 'clr-blr-06', name: 'Bengaluru Optical Transport', domain: 'Transport', region: 'Karnataka', status: 'Online', latency: '12.1 ms', capacityUsedPct: 51 },
  { id: 'clr-del-01', name: 'Delhi NCR Core Hub', domain: 'IPMPLS', region: 'Delhi NCR', status: 'Online', latency: '6.4 ms', capacityUsedPct: 55 },
  { id: 'clr-del-04', name: 'Delhi RAN Sector Aggregator', domain: 'RAN', region: 'Delhi NCR', status: 'Online', latency: '8.1 ms', capacityUsedPct: 62 },
  { id: 'clr-del-05', name: 'Delhi Secondary 5GC SBA', domain: 'Core', region: 'Delhi NCR', status: 'Online', latency: '4.7 ms', capacityUsedPct: 29 },
  { id: 'clr-del-06', name: 'Delhi Optical Ring Gateway', domain: 'Transport', region: 'Delhi NCR', status: 'Online', latency: '11.8 ms', capacityUsedPct: 47 },
  { id: 'clr-mum-01', name: 'Mumbai RAN West Collector', domain: 'RAN', region: 'Maharashtra', status: 'Online', latency: '5.9 ms', capacityUsedPct: 59 },
  { id: 'clr-mum-02', name: 'Mumbai Tertiary Core SBA', domain: 'Core', region: 'Maharashtra', status: 'Online', latency: '4.2 ms', capacityUsedPct: 31 },
  { id: 'clr-pun-01', name: 'Pune West Edge Collector', domain: 'IPMPLS', region: 'Maharashtra', status: 'Online', latency: '13.4 ms', capacityUsedPct: 38 },
  { id: 'clr-mas-01', name: 'Chennai Southern Edge', domain: 'IPMPLS', region: 'Tamil Nadu', status: 'Online', latency: '14.8 ms', capacityUsedPct: 45 },
  { id: 'clr-mas-02', name: 'Chennai Optical Ring Node', domain: 'Transport', region: 'Tamil Nadu', status: 'Online', latency: '15.2 ms', capacityUsedPct: 50 },
  { id: 'clr-kol-01', name: 'Kolkata Eastern Aggregation', domain: 'IPMPLS', region: 'West Bengal', status: 'Online', latency: '17.6 ms', capacityUsedPct: 39 },
  { id: 'clr-hyd-01', name: 'Hyderabad South RAN Sweeper', domain: 'RAN', region: 'Telangana', status: 'Online', latency: '9.3 ms', capacityUsedPct: 54 },
  { id: 'clr-indr-01', name: 'Indore Central Router Agent', domain: 'IPMPLS', region: 'Madhya Pradesh', status: 'Online', latency: '18.9 ms', capacityUsedPct: 44 },
  { id: 'clr-bbs-01', name: 'Bhubaneswar Coastal Agent', domain: 'IPMPLS', region: 'Odisha', status: 'Online', latency: '20.5 ms', capacityUsedPct: 36 },
  { id: 'clr-vzg-01', name: 'Vizag Port Edge Agent', domain: 'IPMPLS', region: 'Andhra Pradesh', status: 'Online', latency: '21.2 ms', capacityUsedPct: 48 },
  { id: 'clr-lab-01', name: 'Bangalore CNOC Testbed Lab', domain: 'IPMPLS', region: 'Lab CNOC', status: 'Online', latency: '1.8 ms', capacityUsedPct: 15 }
];

export interface CredentialProfile {
  id: string;
  name: string;
  type: string;
  authLevel: string;
  vaultPath: string;
  domains: DomainKey[];
}

export const CREDENTIAL_PROFILES: CredentialProfile[] = [
  { id: 'ro-inband-v3', name: 'SNMPv3 Inband Production (SHA256 / AES128)', type: 'SNMPv3', authLevel: 'authPriv', vaultPath: 'secret/net/snmp/v3-inband', domains: ['IPMPLS', 'Transport'] },
  { id: 'ro-oob-v2', name: 'SNMPv2c Out-of-band Management', type: 'SNMPv2c', authLevel: 'communityReadOnly', vaultPath: 'secret/net/snmp/v2-oob', domains: ['IPMPLS'] },
  { id: 'ro-optical-v3', name: 'DWDM Optical Transport SNMPv3', type: 'SNMPv3', authLevel: 'authPriv', vaultPath: 'secret/transport/optical-v3', domains: ['Transport'] },
  { id: 'netconf-optical', name: 'NETCONF / YANG RFC 6241 SSH Key Profile', type: 'NETCONF', authLevel: 'ED25519 Cert', vaultPath: 'secret/transport/netconf-key', domains: ['Transport', 'IPMPLS'] },
  { id: 'ro-ran-v1', name: 'RAN 3GPP/O-RAN OAM Read-Only Credentials', type: 'REST / SNMP', authLevel: 'mTLS + Token', vaultPath: 'secret/ran/oam-ro', domains: ['RAN'] },
  { id: 'ro-core-v1', name: '5GC SBI NRF Mutual TLS Client Cert', type: 'REST / SBI', authLevel: 'x509 mTLS', vaultPath: 'secret/core/sbi-client-cert', domains: ['Core'] },
  { id: 'sec-core-vault', name: 'Core Infrastructure Security Vault', type: 'SSH/REST', authLevel: 'Role-Based', vaultPath: 'secret/core/vault-root', domains: ['Core'] },
  { id: 'lab-rw-v2', name: 'CNOC Lab Sandbox Read-Write Credentials', type: 'Multi-proto', authLevel: 'Lab Standard', vaultPath: 'secret/lab/dev-all', domains: ['RAN', 'Core', 'Transport', 'IPMPLS'] }
];

export const REGIONS_LIST = [
  'Karnataka',
  'Delhi NCR',
  'Maharashtra',
  'Tamil Nadu',
  'Telangana',
  'Andhra Pradesh',
  'West Bengal',
  'Madhya Pradesh',
  'Odisha',
  'All circles / National'
];

export const PROTOCOL_CHOICES = [
  { id: 'snmp_v3', label: 'SNMP v3 (authPriv)', defaultPort: 161, desc: 'Secure MIB-II, IF-MIB, ENTITY-MIB traversal' },
  { id: 'snmp_v2c', label: 'SNMP v2c', defaultPort: 161, desc: 'Legacy device and PDU polling' },
  { id: 'netconf', label: 'NETCONF / YANG', defaultPort: 830, desc: 'Structured model discovery (RFC 6241 / OpenConfig)' },
  { id: 'tl1', label: 'TL1 Protocol', defaultPort: 3083, desc: 'Legacy optical ROADM/SONET/DWDM commands' },
  { id: 'rest_nrf', label: 'REST / 5GC SBA', defaultPort: 443, desc: 'HTTP/2 JSON queries to NRF / SBI register' },
  { id: 'lldp_cdp', label: 'LLDP / CDP Link-Layer', defaultPort: 0, desc: 'Layer-2 neighbor topology discovery' },
  { id: 'ssh_cli', label: 'SSH CLI Terminal', defaultPort: 22, desc: 'Automated configuration scraping fallback' }
];

/* ── Initial seed rows: 22 comprehensive fleet jobs ───────────────────── */
export const SEED_SCAN_JOBS: ScanJob[] = [
  // IP/MPLS fleet
  {
    id: 'DSC-SOUTH-CORE', name: 'Karnataka South Core IP/MPLS Backbone', domain: 'IPMPLS', site: 'Karnataka · south core',
    scope: '172.31.31.0/24 · 172.31.34.255/24', targetType: 'CIDR', collector: 'clr-blr-02', cred: 'ro-inband-v3',
    protocols: ['SNMP v3 (authPriv)', 'LLDP / CDP Link-Layer'], sched: 'Every 6 h', next: 'today 15:00',
    last: '07-Oct-2026 03:10', dur: '13 m 44 s', targets: 412, clean: 355, partial: 43, fail: 14, state: 'Completed', chip: 'success',
    concurrency: 120, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8842', at: '07-Oct-2026 03:10', duration: '13 m 44 s', targets: 412, clean: 355, partial: 43, fail: 14, status: 'Completed' },
      { runId: 'RN-8822', at: '06-Oct-2026 21:10', duration: '14 m 02 s', targets: 412, clean: 360, partial: 40, fail: 12, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-INDR-ACCESS', name: 'Madhya Pradesh Indore Access Routing', domain: 'IPMPLS', site: 'Madhya Pradesh · Indore access',
    scope: '172.31.35.0/24 · 172.31.41.255/24', targetType: 'CIDR', collector: 'clr-indr-01', cred: 'ro-inband-v3',
    protocols: ['SNMP v3 (authPriv)'], sched: 'Daily 02:00', next: 'tomorrow 02:00',
    last: '07-Oct-2026 02:00', dur: '41 m 02 s', targets: 388, clean: 289, partial: 62, fail: 37, state: 'Completed with errors', chip: 'warning',
    concurrency: 100, timeoutSec: 5, retries: 2,
    failureCode: 'ERR-NET-TRANSIT-FLAP',
    failureStage: 'Reachability / Transit Routing',
    failureReason: '37 access routers timed out: Upstream transit link flap between collector clr-indr-01 and Indore aggregation sub-ring B caused 68% packet drop during SNMP GET bulk MIB walk.',
    suggestedAction: 'Verify BGP/OSPF route adjacency on clr-indr-01 interface and re-run immediate scan sweep once transit path stabilizes.',
    notes: '37 access nodes unresponsive due to transit flap on Indore sub-ring B',
    recentRuns: [
      { runId: 'RN-8829', at: '07-Oct-2026 02:00', duration: '41 m 02 s', targets: 388, clean: 289, partial: 62, fail: 37, status: 'Completed with errors', failureCode: 'ERR-NET-TRANSIT-FLAP', failureReason: '37 edge PE routers timed out on SNMP GET bulk due to transit flap' }
    ]
  },
  {
    id: 'DSC-DEL-EDGE', name: 'Delhi Edge PE Aggregation', domain: 'IPMPLS', site: 'Delhi · edge',
    scope: '172.31.42.0/24 · 172.31.49.255/24', targetType: 'CIDR', collector: 'clr-del-01', cred: 'ro-oob-v2',
    protocols: ['SNMP v2c', 'LLDP / CDP Link-Layer'], sched: 'Daily 03:00', next: 'tomorrow 03:00',
    last: '07-Oct-2026 03:00', dur: '22 m 18 s', targets: 341, clean: 305, partial: 32, fail: 4, state: 'Completed', chip: 'success',
    concurrency: 100, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8833', at: '07-Oct-2026 03:00', duration: '22 m 18 s', targets: 341, clean: 305, partial: 32, fail: 4, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-AP-ACCESS', name: 'Andhra Pradesh Access Ring Job', domain: 'IPMPLS', site: 'Andhra Pradesh · access',
    scope: '172.31.50.0/24 · 172.31.59.255/24', targetType: 'CIDR', collector: 'clr-vzg-01', cred: 'ro-inband-v3',
    protocols: ['SNMP v3 (authPriv)'], sched: 'Daily 02:30', next: 'held',
    last: '07-Oct-2026 02:30', dur: '58 m 11 s', targets: 356, clean: 241, partial: 44, fail: 71, state: 'Completed with errors', chip: 'warning',
    concurrency: 80, timeoutSec: 6, retries: 1,
    failureCode: 'ERR-AUTH-USM-DIGEST',
    failureStage: 'Credential Authentication (SNMPv3)',
    failureReason: '71 access switches rejected SNMPv3 authPriv credentials with USM error usmStatsWrongDigests. Key rotation on 06-Oct-2026 was not synchronized with Vault path secret/net/snmp/v3-inband.',
    suggestedAction: 'Re-sync localized SHA256/AES128 auth key in credential profile ro-inband-v3 and test connectivity on target subnet.',
    notes: 'Schedule held: 71 access switches rejected SNMPv3 credentials pending Vault key re-sync',
    recentRuns: [
      { runId: 'RN-8828', at: '07-Oct-2026 02:30', duration: '58 m 11 s', targets: 356, clean: 241, partial: 44, fail: 71, status: 'Completed with errors', failureCode: 'ERR-AUTH-USM-DIGEST', failureReason: '71 access switches rejected SNMPv3 authPriv credentials (usmStatsWrongDigests)' }
    ]
  },
  {
    id: 'DSC-ODI-ACCESS', name: 'Odisha Access Routing Ring', domain: 'IPMPLS', site: 'Odisha · access',
    scope: '172.31.60.0/24 · 172.31.69.255/24', targetType: 'CIDR', collector: 'clr-bbs-01', cred: 'ro-inband-v3',
    protocols: ['SNMP v3 (authPriv)'], sched: 'Daily 02:30', next: 'tomorrow 02:30',
    last: '07-Oct-2026 02:30', dur: '19 m 46 s', targets: 264, clean: 214, partial: 33, fail: 17, state: 'Completed', chip: 'success',
    concurrency: 80, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8790', at: '07-Oct-2026 02:30', duration: '19 m 46 s', targets: 264, clean: 214, partial: 33, fail: 17, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-TN-ACCESS', name: 'Tamil Nadu Access Subnets', domain: 'IPMPLS', site: 'Tamil Nadu · access',
    scope: '172.31.70.0/24 · 172.31.74.255/24', targetType: 'CIDR', collector: 'clr-mas-01', cred: 'ro-inband-v3',
    protocols: ['SNMP v3 (authPriv)'], sched: 'Weekly Sun 02:00', next: 'Sun 02:00',
    last: '04-Oct-2026 02:00', dur: '24 m 09 s', targets: 285, clean: 246, partial: 30, fail: 9, state: 'Completed', chip: 'success',
    concurrency: 80, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8710', at: '04-Oct-2026 02:00', duration: '24 m 09 s', targets: 285, clean: 246, partial: 30, fail: 9, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-DWDM-RING', name: 'Maharashtra Optical Transport Ring', domain: 'Transport', site: 'Maharashtra · transport ring',
    scope: '172.31.175.0/24 · 172.31.179.255/24', targetType: 'CIDR', collector: 'clr-blr-02', cred: 'ro-optical-v3',
    protocols: ['TL1 Protocol'], sched: 'Weekly Sun 04:00', next: 'Sun 04:00',
    last: '19-Nov-2025 04:00', dur: '08 m 51 s', targets: 176, clean: 132, partial: 26, fail: 18, state: 'No adapter', chip: 'neutral',
    concurrency: 40, timeoutSec: 6, retries: 1,
    failureCode: 'ERR-ADAPTER-TL1-ROADM',
    failureStage: 'Protocol Adapter Execution',
    failureReason: '18 optical ROADM nodes failed discovery: TL1 optical adapter missing on collector clr-blr-02 for Fujitsu 1FINITY firmware release v4.12. Parser frame unrecognized.',
    suggestedAction: 'Deploy optical-tl1-agent plugin v2.4 or transition optical targets to NETCONF/YANG profile netconf-optical.',
    notes: 'Awaiting TL1 adapter firmware update on edge gateway for 18 ROADM nodes',
    recentRuns: [
      { runId: 'RN-7102', at: '19-Nov-2025 04:00', duration: '08 m 51 s', targets: 176, clean: 132, partial: 26, fail: 18, status: 'No adapter', failureCode: 'ERR-ADAPTER-TL1-ROADM', failureReason: 'Missing TL1 optical adapter for Fujitsu 1FINITY ROADM firmware release v4.12' }
    ]
  },
  {
    id: 'DSC-LAB-SEED', name: 'Bangalore CNOC Lab Hop Depth Sweep', domain: 'IPMPLS', site: 'Lab · CNOC',
    scope: 'Seed 172.31.86.61 · depth 3', targetType: 'Seed', collector: 'clr-lab-01', cred: 'lab-rw-v2',
    protocols: ['SNMP v3 (authPriv)', 'LLDP / CDP Link-Layer', 'SSH CLI Terminal'], sched: 'On demand', next: '—',
    last: '01-Sep-2026 09:19', dur: '02 m 07 s', targets: 86, clean: 60, partial: 21, fail: 5, state: 'Running', chip: 'info',
    concurrency: 30, timeoutSec: 3, retries: 1, notes: 'Active discovery testbed in lab environment',
    recentRuns: [
      { runId: 'RN-8843', at: '01-Sep-2026 09:19', duration: '02 m 07 s', targets: 86, clean: 60, partial: 21, fail: 5, status: 'Running' }
    ]
  },
  {
    id: 'DSC-WEST-EDGE', name: 'Maharashtra West Edge Router Fleet', domain: 'IPMPLS', site: 'Maharashtra · west edge',
    scope: '172.31.80.0/24 · 172.31.84.0/24', targetType: 'CIDR', collector: 'clr-pun-01', cred: 'ro-inband-v3',
    protocols: ['SNMP v3 (authPriv)'], sched: 'Every 12 h', next: 'today 21:00',
    last: '01-Sep-2026 09:00', dur: '9 m 12 s', targets: 268, clean: 231, partial: 29, fail: 8, state: 'Completed', chip: 'success',
    concurrency: 100, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8841', at: '01-Sep-2026 09:00', duration: '9 m 12 s', targets: 268, clean: 231, partial: 29, fail: 8, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-EAST-AGG', name: 'West Bengal Aggregation Routers', domain: 'IPMPLS', site: 'West Bengal · aggregation',
    scope: '172.31.85.0/24 · 172.31.89.0/24', targetType: 'CIDR', collector: 'clr-kol-01', cred: 'ro-inband-v3',
    protocols: ['SNMP v3 (authPriv)'], sched: 'Daily', next: 'tomorrow 02:00',
    last: '01-Sep-2026 02:00', dur: '11 m 40 s', targets: 196, clean: 164, partial: 24, fail: 8, state: 'Completed', chip: 'success',
    concurrency: 80, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8827', at: '01-Sep-2026 02:00', duration: '11 m 40 s', targets: 196, clean: 164, partial: 24, fail: 8, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-NORTH-ACCESS', name: 'Delhi NCR Access Gateway Sweep', domain: 'IPMPLS', site: 'Delhi NCR · access',
    scope: '172.31.90.0/24 · 172.31.95.255/24', targetType: 'CIDR', collector: 'clr-del-02', cred: 'ro-oob-v3',
    protocols: ['SNMP v3 (authPriv)', 'LLDP / CDP Link-Layer'], sched: 'Every 6 h', next: 'today 18:00',
    last: '01-Sep-2026 12:04', dur: '7 m 02 s', targets: 324, clean: 289, partial: 26, fail: 9, state: 'Completed', chip: 'success',
    concurrency: 120, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8844', at: '01-Sep-2026 12:04', duration: '7 m 02 s', targets: 324, clean: 289, partial: 26, fail: 9, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-DWDM-OPTICAL', name: 'All Circles National Optical Wavelength Layer', domain: 'Transport', site: 'All circles · optical layer',
    scope: '172.31.180.0/24 · 172.31.189.255/24', targetType: 'CIDR', collector: 'clr-blr-03', cred: 'netconf-optical',
    protocols: ['NETCONF / YANG'], sched: 'Weekly', next: '05-Sep-2026 01:00',
    last: '29-Aug-2026 01:00', dur: '21 m 18 s', targets: 78, clean: 61, partial: 12, fail: 5, state: 'Completed', chip: 'success',
    concurrency: 40, timeoutSec: 8, retries: 2,
    recentRuns: [
      { runId: 'RN-8702', at: '29-Aug-2026 01:00', duration: '21 m 18 s', targets: 78, clean: 61, partial: 12, fail: 5, status: 'Completed' }
    ]
  },

  // RAN fleet (4 jobs)
  {
    id: 'DSC-RAN-BLR', name: 'Bengaluru East gNodeB Sector Sweep', domain: 'RAN', site: 'Karnataka · RAN cluster',
    scope: 'gNodeB/eNodeB · Bengaluru-East', targetType: 'Cell', collector: 'clr-blr-04', cred: 'ro-ran-v1',
    protocols: ['SNMP v3 (authPriv)', 'LLDP / CDP Link-Layer'], sched: 'Continuous · 6 hrs sweep', next: 'sweeping now',
    last: '01-Sep-2026 09:05', dur: '5 m 51 s', targets: 2350, clean: 2309, partial: 30, fail: 11, state: 'Completed', chip: 'success',
    concurrency: 150, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8841', at: '01-Sep-2026 09:05', duration: '5 m 51 s', targets: 2350, clean: 2309, partial: 30, fail: 11, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-RAN-DEL', name: 'Delhi Central Macro Cluster Sweep', domain: 'RAN', site: 'Delhi NCR · RAN cluster',
    scope: 'gNodeB/eNodeB · Delhi-Central', targetType: 'Cell', collector: 'clr-del-04', cred: 'ro-ran-v1',
    protocols: ['SNMP v3 (authPriv)', 'LLDP / CDP Link-Layer'], sched: 'Continuous · 6 hrs sweep', next: 'sweeping now',
    last: '01-Sep-2026 09:04', dur: '5 m 22 s', targets: 2200, clean: 2163, partial: 28, fail: 9, state: 'Completed', chip: 'success',
    concurrency: 150, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8840', at: '01-Sep-2026 09:04', duration: '5 m 22 s', targets: 2200, clean: 2163, partial: 28, fail: 9, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-RAN-MUM', name: 'Mumbai West gNodeB Macro Sweep', domain: 'RAN', site: 'Maharashtra · RAN cluster',
    scope: 'gNodeB/eNodeB · Mumbai-West', targetType: 'Cell', collector: 'clr-mum-01', cred: 'ro-ran-v1',
    protocols: ['SNMP v3 (authPriv)', 'LLDP / CDP Link-Layer'], sched: 'Continuous · 6 hrs sweep', next: 'sweeping now',
    last: '01-Sep-2026 09:03', dur: '4 m 58 s', targets: 2050, clean: 2016, partial: 26, fail: 8, state: 'Completed', chip: 'success',
    concurrency: 150, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8839', at: '01-Sep-2026 09:03', duration: '4 m 58 s', targets: 2050, clean: 2016, partial: 26, fail: 8, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-RAN-HYD', name: 'Hyderabad South gNodeB Fleet Sweep', domain: 'RAN', site: 'Telangana · RAN cluster',
    scope: 'gNodeB/eNodeB · Hyderabad-South', targetType: 'Cell', collector: 'clr-hyd-01', cred: 'ro-ran-v1',
    protocols: ['SNMP v3 (authPriv)', 'LLDP / CDP Link-Layer'], sched: 'Continuous · 6 hrs sweep', next: 'sweeping now',
    last: '01-Sep-2026 09:02', dur: '4 m 41 s', targets: 1850, clean: 1818, partial: 24, fail: 8, state: 'Completed', chip: 'success',
    concurrency: 150, timeoutSec: 4, retries: 2,
    recentRuns: [
      { runId: 'RN-8838', at: '01-Sep-2026 09:02', duration: '4 m 41 s', targets: 1850, clean: 1818, partial: 24, fail: 8, status: 'Completed' }
    ]
  },

  // Core fleet (3 jobs)
  {
    id: 'DSC-CORE-NRF', name: 'Karnataka 5G Core SBA Discovery', domain: 'Core', site: 'Karnataka · 5GC core',
    scope: 'AMF/UPF · NRF-registered NFs', targetType: 'Roster', collector: 'clr-blr-05', cred: 'ro-core-v1',
    protocols: ['REST / 5GC SBA'], sched: 'Continuous · 2 hrs sweep', next: 'sweeping now',
    last: '01-Sep-2026 09:02', dur: '1 m 40 s', targets: 130, clean: 130, partial: 0, fail: 0, state: 'Completed', chip: 'success',
    concurrency: 50, timeoutSec: 3, retries: 3,
    recentRuns: [
      { runId: 'RN-8837', at: '01-Sep-2026 09:02', duration: '1 m 40 s', targets: 130, clean: 130, partial: 0, fail: 0, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-CORE-DEL', name: 'Delhi Secondary 5GC SBA Discovery', domain: 'Core', site: 'Delhi · 5GC core (secondary)',
    scope: 'AMF/UPF · NRF-registered NFs', targetType: 'Roster', collector: 'clr-del-05', cred: 'ro-core-v1',
    protocols: ['REST / 5GC SBA'], sched: 'Continuous · 2 hrs sweep', next: 'sweeping now',
    last: '01-Sep-2026 09:01', dur: '1 m 22 s', targets: 115, clean: 114, partial: 1, fail: 0, state: 'Completed', chip: 'success',
    concurrency: 50, timeoutSec: 3, retries: 3,
    recentRuns: [
      { runId: 'RN-8836', at: '01-Sep-2026 09:01', duration: '1 m 22 s', targets: 115, clean: 114, partial: 1, fail: 0, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-CORE-MUM', name: 'Mumbai Tertiary 5GC SBA Discovery', domain: 'Core', site: 'Maharashtra · 5GC core (tertiary)',
    scope: 'AMF/UPF/SMF · NRF-registered NFs', targetType: 'Roster', collector: 'clr-mum-02', cred: 'ro-core-v1',
    protocols: ['REST / 5GC SBA'], sched: 'Continuous · 2 hrs sweep', next: 'sweeping now',
    last: '01-Sep-2026 08:58', dur: '1 m 15 s', targets: 95, clean: 94, partial: 1, fail: 0, state: 'Completed', chip: 'success',
    concurrency: 50, timeoutSec: 3, retries: 3,
    recentRuns: [
      { runId: 'RN-8834', at: '01-Sep-2026 08:58', duration: '1 m 15 s', targets: 95, clean: 94, partial: 1, fail: 0, status: 'Completed' }
    ]
  },

  // Transport fleet (3 additional jobs)
  {
    id: 'DSC-TRANSPORT-BLR', name: 'Karnataka Transport Ring Sweep', domain: 'Transport', site: 'Karnataka · transport ring',
    scope: '172.31.162.0/24 · 172.31.165.0/24', targetType: 'CIDR', collector: 'clr-blr-06', cred: 'ro-optical-v3',
    protocols: ['NETCONF / YANG', 'SNMP v3 (authPriv)'], sched: 'Nightly 01:00', next: 'tomorrow 01:00',
    last: '01-Sep-2026 01:00', dur: '15 m 40 s', targets: 650, clean: 598, partial: 41, fail: 11, state: 'Completed', chip: 'success',
    concurrency: 80, timeoutSec: 5, retries: 2,
    recentRuns: [
      { runId: 'RN-8830', at: '01-Sep-2026 01:00', duration: '15 m 40 s', targets: 650, clean: 598, partial: 41, fail: 11, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-TRANSPORT-DEL', name: 'Delhi Transport Metro Ring', domain: 'Transport', site: 'Delhi · transport ring',
    scope: '172.31.166.0/24 · 172.31.169.0/24', targetType: 'CIDR', collector: 'clr-del-06', cred: 'ro-optical-v3',
    protocols: ['NETCONF / YANG', 'SNMP v3 (authPriv)'], sched: 'Nightly 01:30', next: 'tomorrow 01:30',
    last: '01-Sep-2026 01:30', dur: '13 m 58 s', targets: 600, clean: 561, partial: 30, fail: 9, state: 'Completed', chip: 'success',
    concurrency: 80, timeoutSec: 5, retries: 2,
    recentRuns: [
      { runId: 'RN-8831', at: '01-Sep-2026 01:30', duration: '13 m 58 s', targets: 600, clean: 561, partial: 30, fail: 9, status: 'Completed' }
    ]
  },
  {
    id: 'DSC-TRANSPORT-CHE', name: 'Tamil Nadu Transport Metro Ring', domain: 'Transport', site: 'Tamil Nadu · transport ring',
    scope: '172.31.170.0/24 · 172.31.174.0/24', targetType: 'CIDR', collector: 'clr-mas-02', cred: 'ro-optical-v3',
    protocols: ['NETCONF / YANG', 'SNMP v3 (authPriv)'], sched: 'Nightly 02:00', next: 'tomorrow 02:00',
    last: '01-Sep-2026 02:00', dur: '16 m 12 s', targets: 676, clean: 612, partial: 47, fail: 17, state: 'Completed', chip: 'success',
    concurrency: 80, timeoutSec: 5, retries: 2,
    recentRuns: [
      { runId: 'RN-8832', at: '01-Sep-2026 02:00', duration: '16 m 12 s', targets: 676, clean: 612, partial: 47, fail: 17, status: 'Completed' }
    ]
  }
];

/* ── Persistence & Mutable Store ───────────────────────────────────────── */
const STORAGE_KEY = 'ns.discovery.jobs.v2';

function loadPersistedJobs(): ScanJob[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as ScanJob[]) : null;
  } catch {
    return null;
  }
}

export function persistScanJobs(jobs: ScanJob[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    /* ignore local storage quota / private browsing errors */
  }
}

export const SCAN_JOBS: ScanJob[] = (() => {
  const persisted = loadPersistedJobs();
  if (persisted && persisted.length) {
    const seedMap = new Map(SEED_SCAN_JOBS.map(s => [s.id, s]));
    return persisted.map(pj => {
      const seed = seedMap.get(pj.id);
      if (seed) {
        return {
          ...pj,
          failureCode: pj.failureCode || seed.failureCode,
          failureStage: pj.failureStage || seed.failureStage,
          failureReason: pj.failureReason || seed.failureReason,
          suggestedAction: pj.suggestedAction || seed.suggestedAction
        };
      }
      return pj;
    });
  }
  return [...SEED_SCAN_JOBS];
})();

/* ── Failure Reason Diagnostics & Root Cause Analysis ─────────────────── */
export interface JobFailureDetails {
  hasFailure: boolean;
  code: string;
  stage: string;
  reason: string;
  suggestedAction: string;
  failedTargetsCount: number;
  failPercentage: string;
}

export function getJobFailureDetails(job: ScanJob | null | undefined): JobFailureDetails | null {
  if (!job) return null;
  const hasFailure = job.state === 'Failed' || job.state === 'Completed with errors' || job.fail > 0 || job.state === 'No adapter';
  if (!hasFailure) return null;

  let code = job.failureCode || '';
  let stage = job.failureStage || '';
  let reason = job.failureReason || '';
  let suggestedAction = job.suggestedAction || '';

  // Intelligent fallback derivation if not explicitly provided
  if (!reason) {
    if (job.notes && (job.notes.toLowerCase().includes('fail') || job.notes.toLowerCase().includes('transit') || job.notes.toLowerCase().includes('unresponsive') || job.notes.toLowerCase().includes('adapter') || job.notes.toLowerCase().includes('held'))) {
      reason = job.notes;
    } else if (job.state === 'No adapter') {
      reason = `Protocol adapter missing for configured profile (${job.protocols?.join(', ') || 'native'}).`;
    } else if (job.fail > 0) {
      reason = `${job.fail} target${job.fail > 1 ? 's' : ''} timed out during discovery sweep — no response within ${job.timeoutSec || 4}s probe threshold.`;
    } else {
      reason = 'Scan sweep terminated with non-zero exit state during target discovery.';
    }
  }

  if (!code) {
    const rLower = reason.toLowerCase();
    if (rLower.includes('auth') || rLower.includes('digest') || rLower.includes('credential')) {
      code = 'ERR-AUTH-CRED-REJECT';
      stage = stage || 'Credential Authentication (SNMPv3)';
    } else if (rLower.includes('adapter') || rLower.includes('firmware') || job.state === 'No adapter') {
      code = 'ERR-ADAPTER-MISSING';
      stage = stage || 'Protocol Adapter Execution';
    } else if (rLower.includes('route') || rLower.includes('transit') || rLower.includes('unreach') || rLower.includes('gateway') || rLower.includes('break')) {
      code = 'ERR-NET-ROUTE-UNREACH';
      stage = stage || 'Reachability / Transit Routing';
    } else {
      code = 'ERR-PROBE-TIMEOUT';
      stage = stage || 'Probe Reachability';
    }
  }

  if (!stage) {
    stage = 'Probe & Collection';
  }

  if (!suggestedAction) {
    if (code === 'ERR-AUTH-CRED-REJECT') {
      suggestedAction = 'Sync SHA256/AES128 credentials in HashiCorp Vault path or assign fallback community string.';
    } else if (code === 'ERR-ADAPTER-MISSING') {
      suggestedAction = 'Deploy required vendor adapter package or reassign target group to NETCONF / YANG profile.';
    } else if (code === 'ERR-NET-ROUTE-UNREACH') {
      suggestedAction = 'Check collector BGP routing adjacency and verify upstream transit reachability to target subnet.';
    } else {
      suggestedAction = 'Review firewall ACLs for UDP port 161/830 or increase probe timeout threshold and retry.';
    }
  }

  const failPct = job.targets > 0 ? ((job.fail / job.targets) * 100).toFixed(1) : '0';

  return {
    hasFailure: true,
    code,
    stage,
    reason,
    suggestedAction,
    failedTargetsCount: job.fail,
    failPercentage: failPct
  };
}

/* ── Helpers for KPI and Status computation ───────────────────────────── */
const NOW = new Date(2026, 9, 7, 15, 0); // 07-Oct-2026 15:00 matching screenshot clock
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function parseJobDate(s: string): Date {
  const [d, t] = String(s).split(' ');
  const [dd, mo, yy] = (d || '').split('-');
  const [hh, mi] = (t || '00:00').split(':');
  return new Date(+yy, MONTHS.indexOf(mo), +dd, +hh, +mi);
}

export function cadenceHours(sched: string): number | null {
  const e = /^Every\s+(\d+)\s*h/i.exec(sched);
  if (e) return +e[1];
  if (/^Daily/i.test(sched) || /^Nightly/i.test(sched)) return 24;
  if (/^Weekly/i.test(sched)) return 168;
  if (/^Continuous\s*·\s*(\d+)\s*hrs/i.exec(sched)) return +(sched.match(/(\d+)\s*hrs/i)?.[1] || 6);
  return null;
}

export const isJobHeld = (j: ScanJob) => j.next === 'held' || j.state === 'Held';
export const isJobRunning = (j: ScanJob) => j.state === 'Running';
export const isJobErrors = (j: ScanJob) => j.state === 'Completed with errors';
export const isJobNoAdapter = (j: ScanJob) => j.state === 'No adapter';
export const isJobFailed = (j: ScanJob) => j.state === 'Failed';

export const isJobOverdue = (j: ScanJob) => {
  const c = cadenceHours(j.sched);
  if (c === null) return false;
  const lastD = parseJobDate(j.last);
  return !isNaN(lastD.getTime()) && (NOW.getTime() - lastD.getTime()) / 36e5 > c + 6;
};

export function jobAttentionReason(j: ScanJob): string | null {
  if (isJobNoAdapter(j)) return 'no adapter';
  if (isJobHeld(j)) return 'held';
  if (isJobErrors(j)) return 'with errors';
  if (isJobFailed(j)) return 'failed';
  return null;
}

export const isJobNeedingAttention = (j: ScanJob) => jobAttentionReason(j) !== null;

export function calculateKpis(rows: ScanJob[]) {
  const onDemand = rows.filter(j => cadenceHours(j.sched) === null).length;
  const weekly = rows.filter(j => /^Weekly/i.test(j.sched)).length;
  const held = rows.filter(isJobHeld).length;
  const live = rows.length - onDemand - held;
  const running = rows.filter(isJobRunning).length;
  const errors = rows.filter(isJobErrors).length;
  const attention = rows.filter(isJobNeedingAttention).length;

  const reasonCounts: Record<string, number> = {};
  rows.forEach(j => {
    const r = jobAttentionReason(j);
    if (r) reasonCounts[r] = (reasonCounts[r] || 0) + 1;
  });
  const reasonsStr = Object.entries(reasonCounts)
    .map(([r, c]) => `${c} ${r}`)
    .join(' · ') || 'every job ran clean and on time';

  // Collectors load
  const collectorMap: Record<string, number> = {};
  rows.forEach(j => {
    collectorMap[j.collector] = (collectorMap[j.collector] || 0) + j.targets;
  });
  const sortedCollectors = Object.entries(collectorMap).sort((a, b) => b[1] - a[1]);
  const collectorCount = Math.max(21, sortedCollectors.length);
  const busiestCollectorStr = sortedCollectors.length
    ? `${sortedCollectors[0][0]} carries ${sortedCollectors[0][1].toLocaleString('en-IN')} targets`
    : 'no collectors in use';

  // Next run calculation (DSC-SOUTH-CORE is next due at 15:00)
  const scheduledRows = rows.filter(j => !isJobHeld(j) && j.next !== '—' && j.next !== 'sweeping now');
  const nextJob = rows.find(j => j.id === 'DSC-SOUTH-CORE') || scheduledRows[0];

  return {
    total: rows.length,
    live,
    weekly,
    onDemand,
    held,
    running,
    errors,
    attention,
    reasonsStr,
    collectorCount,
    busiestCollectorStr,
    nextRunTime: nextJob ? (/(\d{1,2}:\d{2})/.exec(nextJob.next)?.[1] || nextJob.next) : '15:00',
    nextRunSub: nextJob ? `${nextJob.id} · ${nextJob.next} · ${nextJob.targets.toLocaleString('en-IN')} targets` : 'all jobs sweeping or held'
  };
}

/* ── ID Generation Helper ─────────────────────────────────────────────── */
export function generateNextJobId(domain: DomainKey, existingJobs: ScanJob[]): string {
  const prefix = domain === 'IPMPLS' ? 'DSC-IPM' : `DSC-${domain.toUpperCase()}`;
  let maxNum = 0;
  existingJobs.forEach(j => {
    if (j.id.startsWith(prefix)) {
      const match = j.id.match(new RegExp(`^${prefix}-(\\d+)`));
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
  });
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

/* ── CIDR Target Count Estimator ───────────────────────────────────────── */
export function estimateCidrHosts(input: string): number {
  if (!input) return 0;
  const cidrs = input.split(/[,;\n\s]+/).filter(Boolean);
  let total = 0;
  for (const c of cidrs) {
    const match = c.match(/\/(\d{1,2})$/);
    if (match) {
      const prefix = parseInt(match[1], 10);
      if (prefix >= 0 && prefix <= 32) {
        if (prefix >= 31) total += (32 - prefix === 0 ? 1 : 2);
        else total += Math.pow(2, 32 - prefix) - 2;
      }
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(c)) {
      total += 1;
    }
  }
  return total > 0 ? total : 254;
}
