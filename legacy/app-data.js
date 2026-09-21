/* ═══════════════════════════════════════════════════════════
   Discovery & Reconciliation — rebuilt console
   Every figure below resolves to one ledger. See screen 1.
   ═══════════════════════════════════════════════════════════ */

const DL = {
  targets: 2308,                       // gateway / seed IPs polled
  runFull: 1842, runPartial: 291, runFail: 175,

  identified: 2603,                    // devices that answered and were identified
  discRouter: 2212, discSwitch: 391,

  master: 2703,                        // inventory of record, all classes
  noCollector: 206,                    // classes discovery cannot reach at all
  discoverable: 2497,                  // master ∩ classes a collector exists for

  matched: 2379, missing: 118,         // over the 2,497 discoverable
  exact: 1829, drifted: 392, stale: 158,   // decomposition of matched
  rogue: 160, unclaimed: 64            // network-side, no inventory record
};
DL.union = DL.master + DL.rogue + DL.unclaimed;
DL.open = DL.drifted + DL.missing + DL.rogue + DL.unclaimed;

/* ── the six collector families, in run order ───────────── */
const COLLECTORS = [
  {
    k: 'device', n: 'Device', proto: 'SNMP v3', icon: 'chip',
    what: 'sysObjectID, sysDescr, sysName, uptime → identity and OEM',
    writes: 'Creates or matches the network-element record',
    ok: 2133, fail: 175, na: 0, order: 1
  },
  {
    k: 'hardware', n: 'Hardware', proto: 'NETCONF · CLI', icon: 'box',
    what: 'Chassis, slots, cards, SFPs, serial numbers, part codes',
    writes: 'Serial, model, card inventory, optical module list',
    ok: 2041, fail: 92, na: 175, order: 2
  },
  {
    k: 'lldp', n: 'LLDP', proto: 'SNMP LLDP-MIB', icon: 'link',
    what: 'Layer-2 neighbour table: local port ↔ remote chassis and port',
    writes: 'Physical adjacency links between two elements',
    ok: 2098, fail: 35, na: 175, order: 3
  },
  {
    k: 'ospf', n: 'OSPF', proto: 'SNMP OSPF-MIB', icon: 'route',
    what: 'IGP adjacencies, areas, router IDs, neighbour states',
    writes: 'Logical routing links, area membership',
    ok: 1412, fail: 63, na: 833, order: 4
  },
  {
    k: 'bgp', n: 'BGP', proto: 'SNMP BGP4-MIB', icon: 'globe',
    what: 'Peer table, local and remote AS, session state',
    writes: 'Logical peering links, AS topology',
    ok: 604, fail: 21, na: 1683, order: 5
  },
  {
    k: 'service', n: 'Service', proto: 'NETCONF', icon: 'layers',
    what: 'VRF, route distinguisher, route targets, attachment interfaces',
    writes: 'L3VPN / L2VPN service instances and their endpoints',
    ok: 1289, fail: 47, na: 972, order: 6
  }
];

/* ── the seven pipeline stages a target passes through ──── */
const STAGES = [
  { k: 'scope', n: 'Scope', sub: 'Seed and CIDR ranges resolved to gateway IPs', v: 2308, unit: 'targets', tone: 'slate' },
  { k: 'reach', n: 'Reachability', sub: 'ICMP echo, three attempts, 2 s timeout', v: 2240, unit: 'reachable', tone: 'sky' },
  { k: 'auth', n: 'Credential', sub: 'SNMP v3 / SSH profile bound to the circle', v: 2199, unit: 'authenticated', tone: 'cyan' },
  { k: 'collect', n: 'Collect', sub: 'Six collector families, run in dependency order', v: 2133, unit: 'identified', tone: 'purple' },
  { k: 'parse', n: 'Parse', sub: 'Vendor adapter turns the payload into facts', v: 2115, unit: 'parsed', tone: 'indigo' },
  { k: 'match', n: 'Identity', sub: 'Four match rules, applied in priority order', v: 2603, unit: 'resolved', tone: 'amber' },
  { k: 'store', n: 'Store', sub: 'Golden record written with per-field provenance', v: 2603, unit: 'written', tone: 'emerald' }
];

/* stage-drop reasons, in order — these sum to the losses above */
const DROPS = [
  { from: 'Scope', to: 'Reachability', n: 68, why: 'ICMP unreachable — ACL or gateway blocks the collector subnet' },
  { from: 'Reachability', to: 'Credential', n: 41, why: 'SNMP timeout — agent not running or timeout too tight' },
  { from: 'Credential', to: 'Collect', n: 33, why: 'Credential rejected — profile ro-inband-v3 expired 14-Jul-2026' },
  { from: 'Collect', to: 'Parse', n: 18, why: 'Unsupported sysObjectID — no adapter for 4 OEM / model pairs' },
  { from: 'Parse', to: 'Identity', n: 9, why: 'Response parse error — CLI banner breaks the fact parser' },
  { from: 'Identity', to: 'Store', n: 6, why: 'Duplicate management IP — two chassis answering on one address' }
];

/* ── identity resolution: how a payload becomes a record ── */
const MATCH_RULES = [
  {
    p: 1, rule: 'Chassis serial number', src: 'Hardware collector', conf: 'Exact',
    hits: 1912, note: 'The only globally unique key. Fails when the OEM does not expose it over SNMP.'
  },
  {
    p: 2, rule: 'Chassis MAC / base bridge address', src: 'Device collector', conf: 'Exact',
    hits: 341, note: 'Survives a hostname or IP change. Not available on chassis-less virtual routers.'
  },
  {
    p: 3, rule: 'sysName + circle', src: 'Device collector', conf: 'Strong',
    hits: 224, note: 'Naming convention is enforced per circle, so collisions are local, not global.'
  },
  {
    p: 4, rule: 'Management IP address', src: 'Scope', conf: 'Weak',
    hits: 62, note: 'Last resort. Re-addressing silently creates a duplicate — 6 seen this run.'
  }
];

/* ── reconciliation outcome ─────────────────────────────── */
const OUTCOME = [
  {
    k: 'exact', n: 'Exact match', c: DL.exact, chip: 'success', tone: 'emerald',
    d: 'Record and network agree on every governed attribute.'
  },
  {
    k: 'drifted', n: 'Drifted', c: DL.drifted, chip: 'warning', tone: 'amber',
    d: 'Matched, but one or more governed attributes differ.'
  },
  {
    k: 'stale', n: 'Stale', c: DL.stale, chip: 'orange', tone: 'orange',
    d: 'Matched, but last verified beyond the freshness SLA.'
  },
  {
    k: 'missing', n: 'Missing', c: DL.missing, chip: 'error', tone: 'red',
    d: 'In the master, did not answer the last three runs.'
  },
  {
    k: 'rogue', n: 'Rogue', c: DL.rogue, chip: 'pink', tone: 'fuchsia',
    d: 'Answering on the network, no record in the master.'
  },
  {
    k: 'unclaimed', n: 'Unclaimed', c: DL.unclaimed, chip: 'purple', tone: 'purple',
    d: 'Identified, but no match rule resolved it to a record.'
  }
];

/* ── what discovery can and cannot see ──────────────────── */
const TAXONOMY = [
  {
    cls: 'Router', axisA: 'Active', axisB: 'Physical', master: 2148, seen: 2114,
    coll: 'Device · Hardware · LLDP · OSPF · BGP · Service', cover: 'full'
  },
  {
    cls: 'Switch', axisA: 'Active', axisB: 'Physical', master: 349, seen: 283,
    coll: 'Device · Hardware · LLDP', cover: 'full'
  },
  {
    cls: 'Server', axisA: 'Active', axisB: 'Physical', master: 96, seen: 0,
    coll: 'none — no collector defined', cover: 'none'
  },
  {
    cls: 'DWDM / optical', axisA: 'Active', axisB: 'Physical', master: 78, seen: 0,
    coll: 'none — needs TL1 or vendor NMS northbound', cover: 'none'
  },
  {
    cls: 'eNodeB', axisA: 'Active', axisB: 'Physical', master: 18, seen: 0,
    coll: 'none — held in the EMS, never polled', cover: 'none'
  },
  {
    cls: 'gNodeB', axisA: 'Active', axisB: 'Physical', master: 14, seen: 0,
    coll: 'none — held in the EMS, never polled', cover: 'none'
  },
  {
    cls: 'VNF · vDU / CU-CP / CU-UP', axisA: 'Active', axisB: 'Virtual', master: 28, seen: 0,
    coll: 'none — USM / EMS integration, not SNMP', cover: 'none'
  },
  {
    cls: 'Links · LLDP / OSPF / BGP / ISIS', axisA: '—', axisB: 'Logical', master: 7846, seen: 7702,
    coll: 'LLDP · OSPF · BGP', cover: 'full'
  },
  {
    cls: 'Services · L3VPN / L2VPN', axisA: '—', axisB: 'Logical', master: 2457, seen: 2311,
    coll: 'Service', cover: 'full'
  },
  {
    cls: 'Fiber span · ODF · splice · rack', axisA: 'Passive', axisB: 'Physical', master: 5120, seen: 0,
    coll: 'none — no electronic source exists', cover: 'blind'
  }
];

/* ── scan-target rows ───────────────────────────────────── */
const CH = { ok: 'ok', fail: 'fail', na: 'na', run: 'run', wait: 'wait' };
const TARGETS = [
  {
    ip: '192.168.10.235', host: 'SP-CNOC-LAB-J204-PE-T3-NR1', oem: 'Juniper', model: 'MX204',
    circle: 'Karnataka', sync: '01-Sep-2026 09:19', fresh: 3, job: 'DSC-LAB-SEED', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'fail', 'na', 'na'], out: 'Drifted', chip: 'warning', reason: 'timeout'
  },
  {
    ip: '172.31.42.100', host: 'NDLS-J960-P_R1-T1-NR', oem: 'Juniper', model: 'MX960',
    circle: 'Delhi', sync: '01-Sep-2026 09:10', fresh: 3, job: 'DSC-DEL-EDGE', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '172.31.70.43', host: 'CHE-920-WIFI-R2', oem: 'Cisco', model: 'ASR920',
    circle: 'Tamil Nadu', sync: '03-Aug-2026 02:14', fresh: 720, job: 'DSC-TN-ACCESS', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'ok', 'na', 'ok'], out: 'Stale', chip: 'orange'
  },
  {
    ip: '172.31.51.84', host: '—', oem: '—', model: '—',
    circle: 'Andhra Pradesh', sync: '21-Jan-2025 03:02', fresh: 14400, job: 'DSC-AP-ACCESS', domain: 'IPMPLS',
    ch: ['fail', 'na', 'na', 'na', 'na', 'na'], out: 'Missing', chip: 'error', reason: 'unreach'
  },
  {
    ip: '172.31.31.212', host: 'BLR-ACX7024-UNREG-01', oem: 'Juniper', model: 'ACX7024',
    circle: 'Karnataka', sync: '01-Sep-2026 08:44', fresh: 4, job: 'DSC-SOUTH-CORE', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'ok', 'na', 'na'], out: 'Rogue', chip: 'pink', isNew: true
  },
  {
    ip: '172.31.50.88', host: '—', oem: 'Nokia', model: '7750 SR-7',
    circle: 'Andhra Pradesh', sync: '01-Sep-2026 02:31', fresh: 10, job: 'DSC-AP-ACCESS', domain: 'IPMPLS',
    ch: ['ok', 'fail', 'fail', 'na', 'na', 'na'], out: 'Unclaimed', chip: 'purple', reason: 'parse'
  },
  {
    ip: '172.31.61.10', host: 'ODI-ACX2200-PE-T4', oem: 'Juniper', model: 'ACX2200',
    circle: 'Odisha', sync: '31-Aug-2026 02:30', fresh: 31, job: 'DSC-ODI-ACCESS', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok', 'fail'], out: 'Drifted', chip: 'warning', reason: 'auth'
  },
  {
    ip: '172.31.39.144', host: 'INDR-C9300-TEMP', oem: 'Cisco', model: 'C9300-48UXM',
    circle: 'Madhya Pradesh', sync: '01-Sep-2026 02:00', fresh: 7, job: 'DSC-INDR-ACCESS', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'na', 'na', 'na'], out: 'Rogue', chip: 'pink', isNew: true
  },
  {
    ip: '172.31.75.144', host: 'WR-ADVA-FSP3000-01', oem: 'Adva', model: 'FSP 3000',
    circle: 'Maharashtra', sync: '19-Nov-2025 04:00', fresh: 6960, job: 'DSC-DWDM-RING', domain: 'Transport',
    ch: ['fail', 'na', 'na', 'na', 'na', 'na'], out: 'No adapter', chip: 'neutral', reason: 'adapter'
  },
  {
    ip: '172.31.93.12', host: 'HYD-CIENA-6500-01', oem: 'Ciena', model: '6500-T12',
    circle: 'Delhi', sync: '01-Sep-2026 01:30', fresh: 9, job: 'DSC-TRANSPORT-DEL', domain: 'Transport',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '172.31.53.186', host: 'VZG-N540X-PE-T4-NR', oem: 'Cisco', model: 'NCS-540',
    circle: 'Andhra Pradesh', sync: '01-Sep-2026 02:30', fresh: 10, job: 'DSC-AP-ACCESS', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '172.31.31.2', host: 'BGLK-EX4300-T-CHR-07', oem: 'Juniper', model: 'EX4300-48P',
    circle: 'Karnataka', sync: '11-Nov-2025 09:12', fresh: 7104, job: 'DSC-SOUTH-CORE', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'na', 'na', 'na'], out: 'Stale', chip: 'orange'
  },
  {
    ip: '172.31.42.207', host: 'DEL-N540X-SPARE', oem: 'Cisco', model: 'NCS-540',
    circle: 'Delhi', sync: '01-Sep-2026 03:00', fresh: 9, job: 'DSC-DEL-EDGE', domain: 'IPMPLS',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok', 'na'], out: 'Rogue', chip: 'pink'
  },
  {
    ip: '10.51.22.21', host: 'BLR-SOUTH-GNB-021', oem: 'Nokia', model: 'AirScale 5G',
    circle: 'Karnataka', sync: '01-Sep-2026 09:05', fresh: 4, job: 'DSC-RAN-BLR', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '172.31.70.12', host: 'BLR-GNB-T3800-014', oem: 'Nokia', model: 'AirScale gNB',
    circle: 'Karnataka', sync: '01-Sep-2026 09:05', fresh: 4, job: 'DSC-RAN-BLR', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.44.18.14', host: 'PUN-HNJW-C3-ENB-014', oem: 'Nokia', model: 'AirScale',
    circle: 'Karnataka', sync: '01-Sep-2026 09:05', fresh: 4, job: 'DSC-RAN-BLR', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.44.19.7', host: 'INDR-AREA-001-ENB-07', oem: 'Nokia', model: 'AirScale',
    circle: 'Karnataka', sync: '01-Sep-2026 09:05', fresh: 4, job: 'DSC-RAN-BLR', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.44.22.31', host: 'CHE-ERIC-ENB-031', oem: 'Ericsson', model: 'Baseband 6630',
    circle: 'Karnataka', sync: '01-Sep-2026 09:05', fresh: 4, job: 'DSC-RAN-BLR', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.51.23.9', host: 'DEL-CENTRAL-GNB-009', oem: 'Nokia', model: 'AirScale 5G',
    circle: 'Delhi', sync: '01-Sep-2026 09:04', fresh: 4, job: 'DSC-RAN-DEL', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.51.26.18', host: 'VJA-ERIC-GNB-018', oem: 'Ericsson', model: 'AIR 6449',
    circle: 'Telangana', sync: '01-Sep-2026 09:02', fresh: 4, job: 'DSC-RAN-HYD', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.51.27.27', host: 'PUN-HUAWEI-GNB-027', oem: 'Huawei', model: 'AAU5613',
    circle: 'Maharashtra', sync: '01-Sep-2026 09:03', fresh: 4, job: 'DSC-RAN-MUM', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.44.24.45', host: 'AHM-HUAWEI-ENB-045', oem: 'Huawei', model: 'BTS3900',
    circle: 'Maharashtra', sync: '01-Sep-2026 09:03', fresh: 4, job: 'DSC-RAN-MUM', domain: 'RAN',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  },
  {
    ip: '10.10.4.21', host: 'BLR-AMF-CORE-02', oem: 'Nokia', model: 'AMF-CN',
    circle: 'Karnataka', sync: '01-Sep-2026 09:02', fresh: 5, job: 'DSC-CORE-NRF', domain: 'Core',
    ch: ['ok', 'ok', 'ok', 'ok', 'ok'], out: 'Exact match', chip: 'success'
  }
];
/* each row's `sync` above was a hand-typed date that only agreed with its
   own `fresh` (hours-ago) the moment this file was written, then quietly
   fell further out of date every day after — the Scan Targets list's "Last
   sync" column and the Target detail page's "Last discovery" tile
   (viewTarget(), which reads a real TARGETS row's own .sync rather than the
   dynamic relativeTimestamp() fallback it uses for targets outside this
   sample) both showed that frozen date forever. Deriving sync from fresh
   with the same relativeTimestamp() helper that fallback already uses
   keeps the two permanently consistent and keeps "last sync" true
   whenever the page loads, the same fix already applied to VNF lifecycle
   and other "hardcoded ago" timestamps elsewhere in this app. */
TARGETS.forEach(t => { t.sync = relativeTimestamp(t.fresh); });

/* ── run transcript, one target, all six collectors ─────── */
const TRANSCRIPT = {
  ip: '172.31.33.100', host: 'NDLS-J960-P_R1-T1-NR', job: 'DSC-DEL-EDGE',
  started: '01-Sep-2026 09:10:02 IST', total: '6.42 s', collector: 'clr-del-01', cred: 'ro-inband-v3',
  steps: [
    {
      k: 'reach', n: 'Reachability', proto: 'ICMP', state: 'ok', ms: 34, bytes: 192,
      req: 'ping -c 3 -W 2 172.31.33.100',
      res: '3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max/mdev = 0.031/0.036/0.044/0.005 ms',
      wrote: 'reachable = true'
    },
    {
      k: 'device', n: 'Device', proto: 'SNMP v3', state: 'ok', ms: 212, bytes: 486,
      req: 'snmpget -v3 -l authPriv -u ro-inband-v3 172.31.33.100 \\\n  sysObjectID.0 sysDescr.0 sysName.0 sysUpTime.0',
      res: 'sysObjectID.0 = OID: .1.3.6.1.4.1.2636.1.1.1.2.57\nsysDescr.0   = "Juniper Networks, Inc. mx960 internet router, kernel JUNOS 21.2R3-S8.5"\nsysName.0    = "NDLS-J960-P_R1-T1-NR"\nsysUpTime.0  = 412834500  (47d 18h 12m)',
      wrote: 'oem = JUNIPER (derived from OID .2636) · model = MX960 · sysName · uptime'
    },
    {
      k: 'hardware', n: 'Hardware', proto: 'NETCONF', state: 'ok', ms: 1140, bytes: 24610,
      req: '<rpc><get-chassis-inventory/></rpc>',
      res: 'chassis            MX960              serial JN1236F87AFB\n  FPC 0            MPC7E-10G          serial ABCD1234\n  PIC 0/0          10x10GE SFPP       serial EFGH5678\n  Xcvr 0/0/1       SFP+-10G-LR        serial JKLM9012\n  ... 47 more components',
      wrote: 'serial JN1236F87AFB · 51 hardware components · 16 optical modules'
    },
    {
      k: 'lldp', n: 'LLDP', proto: 'SNMP LLDP-MIB', state: 'ok', ms: 640, bytes: 8842,
      req: 'snmpwalk -v3 -u ro-inband-v3 172.31.33.100 \\\n  1.0.8802.1.1.2.1.4.1.1  (lldpRemTable)',
      res: 'lldpRemSysName.1.5.1  = "PSA-C920-WIFI1-T4-ER"   port Gi0/0/1\nlldpRemSysName.1.9.1  = "PSA-C920-WIFI1-T4-ER"   port Te0/0/12.SI.612\n… 17 more neighbours',
      wrote: '19 adjacency links · 18 matched to existing links, 1 new'
    },
    {
      k: 'ospf', n: 'OSPF', proto: 'SNMP OSPF-MIB', state: 'ok', ms: 1980, bytes: 3204,
      req: 'snmpwalk -v3 -u ro-inband-v3 172.31.33.100 \\\n  1.3.6.1.2.1.14.10.1  (ospfNbrTable)',
      res: 'ospfNbrRtrId.172.31.33.101.0 = 172.31.33.101   state full(8)\nospfNbrRtrId.172.31.33.109.0 = 172.31.33.109   state full(8)\n… 10 more adjacencies, area 0.0.0.0',
      wrote: '12 logical routing links · area 0.0.0.0 membership'
    },
    {
      k: 'bgp', n: 'BGP', proto: 'SNMP BGP4-MIB', state: 'ok', ms: 1210, bytes: 1188,
      req: 'snmpwalk -v3 -u ro-inband-v3 172.31.33.100 \\\n  1.3.6.1.2.1.15.3.1  (bgpPeerTable)',
      res: 'bgpPeerState.172.31.53.252   = established(6)   remoteAs 24186\nbgpPeerState.172.31.53.249   = established(6)   remoteAs 24186\n… 2 more peers',
      wrote: '4 peering links · local AS 24186'
    },
    {
      k: 'service', n: 'Service', proto: 'NETCONF', state: 'ok', ms: 1206, bytes: 41208,
      req: '<rpc><get-configuration><configuration>\n  <routing-instances/></configuration></get-configuration></rpc>',
      res: 'instance CGDA           type vrf   rd 24186:1015707\n  interface FortyGigE0/0/0/28.100\n  vrf-target 24186:900287, 24186:888970\ninstance SAFE-CITY-SW-MGMT  type vrf  rd 24186:1016096\n… 12 more instances',
      wrote: '14 L3VPN instances · 14 attachment interfaces · 27 route targets'
    }
  ]
};

/* the failure variant, shown side by side */
const FAIL_STEP = {
  n: 'OSPF', proto: 'SNMP OSPF-MIB', ms: 3000,
  req: 'snmpwalk -v3 -u ro-inband-v3 172.31.51.84 1.3.6.1.2.1.14.10.1',
  res: 'Timeout: No Response from 172.31.51.84',
  reason: 'SNMP_TIMEOUT', action: 'Retry at 8000 ms on the next pass; escalate to the circle NOC after 3 consecutive timeouts.'
};

/* ── Collector transcript, driven by whichever target was actually
   clicked ── real IANA-assigned enterprise OIDs per OEM, and a firmware
   string in that vendor's own real naming convention, seeded off the
   target's own host/ip so it's stable across renders (same "sample but
   deterministic" technique used everywhere else in this app) rather than
   the single fixed Juniper/MX960 example every target used to show. */
const TX_OID = {
  Juniper: '.1.3.6.1.4.1.2636.1.1.1.2.57', Cisco: '.1.3.6.1.4.1.9.1.1745',
  Nokia: '.1.3.6.1.4.1.6527.1.3.3', Adva: '.1.3.6.1.4.1.2544.1.11.2'
};
function txSysDescr(oem, model, seed) {
  const m = model || 'router';
  if (oem === 'Juniper') return `Juniper Networks, Inc. ${m.toLowerCase()} internet router, kernel JUNOS ${nint(seed, 701, 17, 24)}.${nint(seed, 702, 1, 4)}R${nint(seed, 703, 1, 3)}-S${nint(seed, 704, 1, 9)}`;
  if (oem === 'Cisco') return `Cisco IOS XE Software, ${m}, Version ${nint(seed, 705, 16, 17)}.${nint(seed, 706, 1, 12)}.${nint(seed, 707, 1, 5)}`;
  if (oem === 'Nokia') return `Nokia ${m}, TiMOS-${String.fromCharCode(65 + nint(seed, 708, 0, 5))}-${nint(seed, 709, 20, 24)}.${nint(seed, 710, 1, 10)}.R${nint(seed, 711, 1, 9)}`;
  if (oem === 'Adva') return `ADVA Optical Networking, ${m}, Release ${nint(seed, 712, 10, 12)}.${nint(seed, 713, 1, 9)}`;
  return `${oem || 'Unknown vendor'} ${m}`.trim();
}
const txSerial = seed => `${String.fromCharCode(65 + nint(seed, 720, 0, 25))}${String.fromCharCode(65 + nint(seed, 721, 0, 25))}${nint(seed, 722, 10000000, 99999999)}`;

/* what actually failed, in the target's own words — reuses the same
   TGT_REASON vocabulary the Scan Targets list already shows on that row,
   so the reason named in the transcript always matches the reason chip
   the reader clicked through from. */
/* `proto` is optional and only ever passed for a non-Transport domain (see
   txStepsFor()) — every Transport call site still calls these with just
   `ip`, so Transport's own failure text is byte-for-byte what it always
   was. When a domain does pass its failing step's protocol, a non-SNMP one
   gets its own wording instead of borrowing SNMP's. */
const TX_FAIL = {
  unreach: ip => ({
    res: `Timeout: No Response from ${ip}\n0 of 3 ICMP echo replies received`,
    reason: 'HOST_UNREACHABLE', action: 'Confirm the gateway route and any ACL on the collector subnet; retry once the network path is confirmed.'
  }),
  timeout: (ip, proto) => ({
    res: (!proto || proto.toUpperCase().includes('SNMP')) ? `Timeout: No Response from ${ip}` : `Timeout: No response from ${ip} via ${proto}`,
    reason: 'SNMP_TIMEOUT', action: 'Retry at 8,000 ms on the next pass; escalate to the circle NOC after three consecutive timeouts.'
  }),
  auth: (ip, proto) => ({
    res: (!proto || proto.toUpperCase().includes('SNMP'))
      ? `snmpget: Authentication failure (incorrect password, community or key) for ${ip}`
      : `Authentication rejected for ${ip} via ${proto} — credential invalid or expired`,
    reason: 'AUTH_FAILED', action: 'Verify the credential profile is current and bound to this device; rotate it if expired.'
  }),
  parse: (ip, proto) => ({
    res: (!proto || proto.toUpperCase().includes('SNMP'))
      ? `Response received from ${ip}, but it did not match the expected MIB structure — an unsupported CLI banner or encoding broke the fact parser`
      : `Response received from ${ip}, but it did not match the expected ${proto} structure — an unsupported payload shape broke the fact parser`,
    reason: 'PARSE_ERROR', action: 'Capture the raw payload and add a parser rule for this response shape.'
  }),
  adapter: ip => ({
    res: `sysObjectID reported by ${ip} has no registered adapter`,
    reason: 'NO_ADAPTER', action: 'Add an adapter for this OEM / model pair, or leave unsupported until vendor coverage is prioritised.'
  }),
  dupip: ip => ({
    res: `More than one chassis answered on ${ip} — duplicate management IP`,
    reason: 'DUPLICATE_IP', action: 'Identify the second device on this address and reassign one of the two.'
  })
};

/* ── circles: exceptions plotted the way an ops team acts ── */
const CIRCLES = [
  { c: 'JK', n: 'Jammu & Kashmir', x: 2, y: 0, master: 41, rogue: 1, missing: 2, drift: 4 },
  { c: 'PB', n: 'Punjab', x: 2, y: 1, master: 88, rogue: 3, missing: 2, drift: 9 },
  { c: 'HR', n: 'Haryana', x: 3, y: 1, master: 74, rogue: 2, missing: 1, drift: 8 },
  { c: 'UK', n: 'Uttarakhand', x: 4, y: 1, master: 36, rogue: 1, missing: 1, drift: 3 },
  { c: 'DL', n: 'Delhi', x: 3, y: 2, master: 176, rogue: 16, missing: 8, drift: 31 },
  { c: 'UP', n: 'Uttar Pradesh', x: 4, y: 2, master: 221, rogue: 14, missing: 11, drift: 38 },
  { c: 'BR', n: 'Bihar', x: 5, y: 2, master: 112, rogue: 5, missing: 4, drift: 14 },
  { c: 'AS', n: 'Assam & NE', x: 6, y: 2, master: 68, rogue: 3, missing: 3, drift: 8 },
  { c: 'RJ', n: 'Rajasthan', x: 2, y: 3, master: 138, rogue: 9, missing: 7, drift: 21 },
  { c: 'MP', n: 'Madhya Pradesh', x: 3, y: 3, master: 194, rogue: 20, missing: 10, drift: 34 },
  { c: 'CG', n: 'Chhattisgarh', x: 4, y: 3, master: 61, rogue: 2, missing: 2, drift: 7 },
  { c: 'JH', n: 'Jharkhand', x: 5, y: 3, master: 54, rogue: 2, missing: 2, drift: 6 },
  { c: 'WB', n: 'West Bengal', x: 6, y: 3, master: 127, rogue: 6, missing: 5, drift: 19 },
  { c: 'GJ', n: 'Gujarat', x: 1, y: 4, master: 152, rogue: 10, missing: 7, drift: 23 },
  { c: 'MH', n: 'Maharashtra', x: 2, y: 4, master: 248, rogue: 13, missing: 11, drift: 31 },
  { c: 'OR', n: 'Odisha', x: 5, y: 4, master: 121, rogue: 11, missing: 16, drift: 18 },
  { c: 'TS', n: 'Telangana', x: 3, y: 5, master: 134, rogue: 6, missing: 4, drift: 17 },
  { c: 'AP', n: 'Andhra Pradesh', x: 4, y: 5, master: 143, rogue: 18, missing: 14, drift: 26 },
  { c: 'KA', n: 'Karnataka', x: 2, y: 6, master: 211, rogue: 14, missing: 6, drift: 36 },
  { c: 'TN', n: 'Tamil Nadu', x: 3, y: 7, master: 154, rogue: 3, missing: 1, drift: 27 },
  { c: 'KL', n: 'Kerala', x: 2, y: 7, master: 92, rogue: 1, missing: 1, drift: 12 },
  { c: 'NE', n: 'North East', x: 6, y: 1, master: 58, rogue: 0, missing: 0, drift: 0 }
];
CIRCLES.forEach(c => c.exc = c.rogue + c.missing + c.drift);

const FRESHNESS = [
  { n: 'Under 24 h', c: 1142, tone: 'emerald' },
  { n: '1 – 7 days', c: 786, tone: 'green' },
  { n: '7 – 30 days', c: 402, tone: 'amber' },
  { n: '30 – 90 days', c: 189, tone: 'orange' },
  { n: 'Over 90 days', c: 84, tone: 'red' }
];

const DRIFT_ROWS = [
  {
    asset: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '172.31.86.61', field: 'OEM name',
    master: 'QUANTA', network: 'JUNIPER', src: 'sysObjectID .2636', conf: 'Exact', age: '3 h'
  },
  {
    asset: 'CHE-J2.2K-PE-T4-ER', ip: '172.31.61.140', field: 'OEM name',
    master: 'HP', network: 'JUNIPER', src: 'model ACX2200', conf: 'Exact', age: '3 h'
  },
  {
    asset: 'KA-BGLK-277-T-CHR-08', ip: '172.31.31.204', field: 'OEM name',
    master: 'HP', network: 'CISCO', src: 'model C9300-48UXM', conf: 'Exact', age: '6 h'
  },
  {
    asset: 'ET-J960-P-T1-WR', ip: '172.31.31.97', field: 'OS version',
    master: '21.2R3-S9.21', network: '21.4R3-S5.5', src: 'sysDescr', conf: 'Exact', age: '3 h'
  },
  {
    asset: 'NDD-J2.2K-PE-T4-SR', ip: '192.168.1.11', field: 'Model name',
    master: 'QuantaMesh BMS T3048-LY9', network: 'EX4300-48P', src: 'chassis inventory', conf: 'Exact', age: '5 h'
  },
  {
    asset: 'ERS-J480-UP-T1-SR', ip: '172.31.31.141', field: 'Circle',
    master: 'Karnataka', network: 'Madhya Pradesh', src: 'LLDP neighbour set', conf: 'Strong', age: '3 h'
  },
  {
    asset: '5 routers at KA-BGLK-277', ip: 'various', field: 'Serial number',
    master: 'FW488AS342W ×5', network: '5 distinct serials', src: 'chassis inventory', conf: 'Exact', age: '3 h'
  }
];

/* Attributes the device itself reports, so a mismatch here is a real conflict
   between what the network says and what the record says. Circle/site is an
   assignment made in inventory, never reported by the device — it belongs to
   the location record, not a discovery collector, so it does not belong here. */
const DRIFT_BY_FIELD = [
  { n: 'OEM name', c: 118, tone: 'red' },
  { n: 'OS version', c: 104, tone: 'amber' },
  { n: 'Model name', c: 61, tone: 'amber' },
  { n: 'Serial number', c: 54, tone: 'red' },
  { n: 'Interface set', c: 22, tone: 'orange' }
];

const MISSING_ROWS = [
  {
    ip: '172.31.41.133', type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Andhra Pradesh',
    lat: '18.756756', lon: '84.423226', last: '21-Jan-2025', runs: 486, why: 'ICMP unreachable'
  },
  {
    ip: '172.31.41.134', type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Andhra Pradesh',
    lat: '18.756756', lon: '84.423226', last: '21-Jan-2025', runs: 486, why: 'ICMP unreachable'
  },
  {
    ip: '172.31.61.10', type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Odisha',
    lat: '20.143881', lon: '85.115634', last: '19-Nov-2025', runs: 287, why: 'ICMP unreachable'
  },
  {
    ip: '172.31.61.8', type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Odisha',
    lat: '19.621150', lon: '83.498749', last: '19-Nov-2025', runs: 287, why: 'ICMP unreachable'
  },
  {
    ip: '172.31.33.130', type: 'Router', oem: 'Nokia', model: '7750', circle: 'Tamil Nadu',
    lat: '13.082680', lon: '80.270721', last: '14-Dec-2025', runs: 261, why: 'SNMP timeout'
  },
  {
    ip: '172.31.47.106', type: 'Switch', oem: 'Ciena', model: 'L2-ACCESS-24P', circle: 'Maharashtra',
    lat: '19.075983', lon: '72.877655', last: '26-Jan-2025', runs: 481, why: 'Credential rejected'
  }
];

const ROGUE_ROWS = [
  {
    ip: '172.31.31.212', host: 'BLR-ACX7024-UNREG-01', oem: 'Juniper', model: 'ACX7024', circle: 'Karnataka',
    first: '18-Aug-2026', nb: 'BGLK-277-T-CHR-01 Gi0/0/4', why: 'Answers SNMP, no master record, no workorder', sev: 'error'
  },
  {
    ip: '172.31.39.144', host: 'INDR-C9300-TEMP', oem: 'Cisco', model: 'C9300-48UXM', circle: 'Madhya Pradesh',
    first: '22-Aug-2026', nb: 'MP-INDR-275-SW-02 Te1/1/1', why: 'Serial matches a record marked Faulty / RMA', sev: 'error'
  },
  {
    ip: '172.31.42.207', host: 'DEL-N540X-SPARE', oem: 'Cisco', model: 'NCS-540', circle: 'Delhi',
    first: '27-Aug-2026', nb: 'DEL-279-PE-T4-NR xe-0/3/1', why: 'Master says Decommissioned — still forwarding', sev: 'error'
  },
  {
    ip: '172.31.50.88', host: '—', oem: 'Nokia', model: '7750 SR-7', circle: 'Andhra Pradesh',
    first: '29-Aug-2026', nb: 'none returned', why: 'No sysName, no LLDP neighbours — cannot be placed', sev: 'warning'
  },
  {
    ip: '172.31.33.190', host: 'LAB-EX2200-24T', oem: 'Juniper', model: 'EX2200-24T', circle: 'Karnataka',
    first: '01-Sep-2026', nb: 'BGLK-277-T-CHR-04 ge-0/0/9', why: 'Lab device reachable from a production subnet', sev: 'warning'
  }
];

const EXCEPTIONS = [
  {
    id: 'RX-4501', state: 'Rogue', chip: 'pink', subj: 'BLR-ACX7024-UNREG-01', circle: 'Karnataka',
    detected: '18-Aug-2026', owner: 'Unassigned', age: 14, sla: 'Breached', next: 'Raise onboarding workorder'
  },
  {
    id: 'RX-4412', state: 'Drifted', chip: 'warning', subj: 'OEM name · 118 records', circle: 'All',
    detected: '23-Aug-2026', owner: 'Harish Kumar', age: 9, sla: 'Breached', next: 'Accept network as truth (bulk)'
  },
  {
    id: 'RX-4530', state: 'Missing', chip: 'error', subj: '172.31.41.133 / .134', circle: 'Andhra Pradesh',
    detected: '26-Aug-2026', owner: 'Anjali Verma', age: 6, sla: 'At risk', next: 'Field check, then retire or restore'
  },
  {
    id: 'RX-4552', state: 'Duplicate', chip: 'error', subj: 'Serial FW488AS342W ×5', circle: 'Karnataka',
    detected: '11-Aug-2026', owner: 'Unassigned', age: 21, sla: 'Breached', next: 'Re-run Hardware collector, split records'
  },
  {
    id: 'RX-4560', state: 'Unclaimed', chip: 'purple', subj: '172.31.50.88', circle: 'Andhra Pradesh',
    detected: '29-Aug-2026', owner: 'Unassigned', age: 3, sla: 'On track', next: 'Add match rule or enrich sysName'
  },
  {
    id: 'RX-4571', state: 'No adapter', chip: 'neutral', subj: 'Adva FSP 3000 · 78 units', circle: 'All',
    detected: '19-Nov-2025', owner: 'Architecture', age: 286, sla: 'Breached', next: 'Build TL1 collector, or drop from scope'
  }
];

const DISPOSITIONS = [
  { n: 'Accept network', d: 'The network is right. The master record is updated from discovered facts and the exception closes.', tone: 'emerald' },
  { n: 'Accept record', d: 'The master is right. The discovered value is quarantined and the asset is flagged for a field check.', tone: 'sky' },
  { n: 'Raise workorder', d: 'Neither is right yet. A change is needed on the network; the exception stays open, linked to the workorder.', tone: 'amber' },
  { n: 'Approve exception', d: 'Known and accepted — a lab device, a vendor trial. Requires an expiry date; reopens automatically.', tone: 'purple' }
];

const GAPS = [
  {
    n: 'Discovery has no job object', sev: 'Blocking',
    now: 'Rows are gateway IPs. There is no schedule, collector, credential profile or run history behind them, so “Last sync on” spanning Jan-2025 to Sep-2026 has no explanation.',
    fix: 'A scan job owns scope, collector, credentials and schedule. Every target result belongs to a run of a job.'
  },
  {
    n: 'The six statuses are not a chain', sev: 'Blocking',
    now: 'Device status is blank on rows where LLDP, OSPF and Service all read Completed. Four independent columns cannot express “skipped because the step before failed”.',
    fix: 'One dependency chain per target, with five states: passed, failed, skipped, not applicable, waiting.'
  },
  {
    n: '“Failed” carries no reason', sev: 'Blocking',
    now: 'A red chip and nothing else. Nobody can tell an ACL problem from an expired credential from a missing MIB.',
    fix: 'Six typed reasons, each with a next action and an owner.'
  },
  {
    n: 'Request/Response is a wall of accordions', sev: 'Major',
    now: 'Twelve panels of raw text with no timestamp, duration, size, or consequence. The same payload appears under several headings.',
    fix: 'A run timeline: one row per collector with timing, payload size, and what it wrote to inventory.'
  },
  {
    n: 'There is no reconciliation surface', sev: 'Blocking',
    now: 'The module is named Discovery and Reconciliation. Reconciliation is one donut — Discovered against Missing.',
    fix: 'Match rules, six outcome states, attribute-level drift, rogue and missing registers, and an exception queue with dispositions.'
  },
  {
    n: 'Coverage is never stated', sev: 'Major',
    now: 'Only Router and Switch are ever discovered. Server, DWDM, eNodeB, gNodeB, VNF and all passive plant have no collector, and nothing on screen says so.',
    fix: 'A coverage matrix on the overview: what discovery can see, what it cannot, and why.'
  },
  {
    n: 'The map shows everything, so it shows nothing', sev: 'Minor',
    now: 'One cluster pin reading 100 over central India. Zooming is the only interaction.',
    fix: 'Plot exceptions by circle, not devices — the unit an ops team is actually organised around.'
  },
  {
    n: 'Two totals for one quantity', sev: 'Major',
    now: 'On one screen: “Discovered devices by type 2609” and “Discovered devices by vendor 2603”. Both claim to be the discovered set.',
    fix: 'One ledger, rendered, with every derived total traced back to it.'
  }
];

/* ── scan jobs ──────────────────────────────────────────── */
const JOBS = [
  {
    id: 'DSC-SOUTH-CORE', domain: 'IPMPLS', site: 'Karnataka · south core', scope: '172.31.31.0/24 · 172.31.34.255/24',
    collector: 'clr-blr-02', cred: 'ro-inband-v3', sched: 'Every 6 h', next: 'today 15:00',
    last: '01-Sep-2026 09:10', dur: '13 m 44 s', targets: 412, clean: 355, partial: 43, fail: 14,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-INDR-ACCESS', domain: 'IPMPLS', site: 'Madhya Pradesh · Indore access', scope: '172.31.35.0/24 · 172.31.41.255/24',
    collector: 'clr-indr-01', cred: 'ro-inband-v3', sched: 'Daily 02:00', next: 'tomorrow 02:00',
    last: '01-Sep-2026 02:00', dur: '41 m 02 s', targets: 388, clean: 289, partial: 62, fail: 37,
    state: 'Completed with errors', chip: 'warning'
  },
  {
    id: 'DSC-DEL-EDGE', domain: 'IPMPLS', site: 'Delhi · edge', scope: '172.31.42.0/24 · 172.31.49.255/24',
    collector: 'clr-del-01', cred: 'ro-oob-v2', sched: 'Daily 03:00', next: 'tomorrow 03:00',
    last: '01-Sep-2026 03:00', dur: '22 m 18 s', targets: 341, clean: 305, partial: 32, fail: 4,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-AP-ACCESS', domain: 'IPMPLS', site: 'Andhra Pradesh · access', scope: '172.31.50.0/24 · 172.31.59.255/24',
    collector: 'clr-vzg-01', cred: 'ro-inband-v3', sched: 'Daily 02:30', next: 'held',
    last: '01-Sep-2026 02:30', dur: '58 m 11 s', targets: 356, clean: 241, partial: 44, fail: 71,
    state: 'Completed with errors', chip: 'error'
  },
  {
    id: 'DSC-ODI-ACCESS', domain: 'IPMPLS', site: 'Odisha · access', scope: '172.31.60.0/24 · 172.31.69.255/24',
    collector: 'clr-bbs-01', cred: 'ro-inband-v3', sched: 'Daily 02:30', next: 'tomorrow 02:30',
    last: '31-Aug-2026 02:30', dur: '19 m 46 s', targets: 264, clean: 214, partial: 33, fail: 17,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-TN-ACCESS', domain: 'IPMPLS', site: 'Tamil Nadu · access', scope: '172.31.70.0/24 · 172.31.74.255/24',
    collector: 'clr-mas-01', cred: 'ro-inband-v3', sched: 'Weekly Sun 02:00', next: 'Sun 02:00',
    last: '03-Aug-2026 02:14', dur: '24 m 09 s', targets: 285, clean: 246, partial: 30, fail: 9,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-DWDM-RING', domain: 'Transport', site: 'Maharashtra · transport ring', scope: '172.31.75.0/24 · 172.31.79.255/24',
    collector: 'clr-blr-02', cred: 'ro-optical-v3', sched: 'Weekly Sun 04:00', next: 'Sun 04:00',
    last: '19-Nov-2025 04:00', dur: '08 m 51 s', targets: 176, clean: 132, partial: 26, fail: 18,
    state: 'No adapter', chip: 'neutral'
  },
  {
    id: 'DSC-LAB-SEED', domain: 'IPMPLS', site: 'Lab · CNOC', scope: 'Seed 192.168.10.235 · depth 3',
    collector: 'clr-lab-01', cred: 'lab-rw-v2', sched: 'On demand', next: '—',
    last: '01-Sep-2026 09:19', dur: '02 m 07 s', targets: 86, clean: 60, partial: 21, fail: 5,
    state: 'Running', chip: 'info'
  }
];

/* grown to a twelve-row sample */
JOBS.push(...[
  ['DSC-WEST-EDGE', 'Maharashtra · west edge', '172.31.80.0/24 · 172.31.84.0/24', 'clr-pun-01', 'ro-inband-v3', 'Every 12 h', 'today 21:00', '01-Sep-2026 09:00', '9 m 12 s', 268, 231, 29, 8, 'Completed', 'success', 'IPMPLS'],
  ['DSC-EAST-AGG', 'West Bengal · aggregation', '172.31.85.0/24 · 172.31.89.0/24', 'clr-kol-01', 'ro-inband-v3', 'Daily', 'tomorrow 02:00', '01-Sep-2026 02:00', '11 m 40 s', 196, 164, 24, 8, 'Completed', 'success', 'IPMPLS'],
  ['DSC-NORTH-ACCESS', 'Delhi NCR · access', '172.31.90.0/24 · 172.31.95.255/24', 'clr-del-02', 'ro-oob-v3', 'Every 6 h', 'today 18:00', '01-Sep-2026 12:04', '7 m 02 s', 324, 289, 26, 9, 'Completed', 'success', 'IPMPLS'],
  ['DSC-DWDM-OPTICAL', 'All circles · optical layer', '172.31.96.0/24 · 172.31.105.255/24', 'clr-blr-03', 'netconf-optical', 'Weekly', '05-Sep-2026 01:00', '29-Aug-2026 01:00', '21 m 18 s', 78, 61, 12, 5, 'Completed', 'success', 'Transport']
].map(a => ({
  id: a[0], site: a[1], scope: a[2], collector: a[3], cred: a[4], sched: a[5], next: a[6],
  last: a[7], dur: a[8], targets: a[9], clean: a[10], partial: a[11], fail: a[12], state: a[13], chip: a[14], domain: a[15]
})));

/* RAN, Core and Transport each get a proper regional fleet of jobs here,
   not one token row apiece — the per-job target counts are sized so each
   domain's jobs sum exactly to that domain's real scan scope in
   src/data/discoveryOverview.ts's DISCOVERY_JOB_ROWS (RAN 8,450 · Core 340 ·
   Transport 2,180 already carried by the two pre-existing Transport rows
   plus these three), the same way the ten IPMPLS/router-switch rows above
   already read as a real regional fleet. This also naturally rebalances
   growTargets() below, which cycles through every JOBS row by index to
   assign each generated TARGETS row's domain — more non-IPMPLS jobs here
   means the generated sample stops skewing almost entirely IPMPLS. */
JOBS.push(
  {
    id: 'DSC-RAN-BLR', site: 'Karnataka · RAN cluster', scope: 'gNodeB/eNodeB · Bengaluru-East',
    collector: 'clr-blr-04', cred: 'ro-ran-v1', sched: 'Continuous · 6 min sweep', next: 'sweeping now', domain: 'RAN',
    last: '01-Sep-2026 09:05', dur: '5 m 51 s', targets: 2350, clean: 2309, partial: 30, fail: 11,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-RAN-DEL', site: 'Delhi NCR · RAN cluster', scope: 'gNodeB/eNodeB · Delhi-Central',
    collector: 'clr-del-04', cred: 'ro-ran-v1', sched: 'Continuous · 6 min sweep', next: 'sweeping now', domain: 'RAN',
    last: '01-Sep-2026 09:04', dur: '5 m 22 s', targets: 2200, clean: 2163, partial: 28, fail: 9,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-RAN-MUM', site: 'Maharashtra · RAN cluster', scope: 'gNodeB/eNodeB · Mumbai-West',
    collector: 'clr-mum-01', cred: 'ro-ran-v1', sched: 'Continuous · 6 min sweep', next: 'sweeping now', domain: 'RAN',
    last: '01-Sep-2026 09:03', dur: '4 m 58 s', targets: 2050, clean: 2016, partial: 26, fail: 8,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-RAN-HYD', site: 'Telangana · RAN cluster', scope: 'gNodeB/eNodeB · Hyderabad-South',
    collector: 'clr-hyd-01', cred: 'ro-ran-v1', sched: 'Continuous · 6 min sweep', next: 'sweeping now', domain: 'RAN',
    last: '01-Sep-2026 09:02', dur: '4 m 41 s', targets: 1850, clean: 1818, partial: 24, fail: 8,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-CORE-NRF', site: 'Karnataka · 5GC core', scope: 'AMF/UPF · NRF-registered NFs',
    collector: 'clr-blr-05', cred: 'ro-core-v1', sched: 'Continuous · 2 min sweep', next: 'sweeping now', domain: 'Core',
    last: '01-Sep-2026 09:02', dur: '1 m 40 s', targets: 130, clean: 130, partial: 0, fail: 0,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-CORE-DEL', site: 'Delhi · 5GC core (secondary)', scope: 'AMF/UPF · NRF-registered NFs',
    collector: 'clr-del-05', cred: 'ro-core-v1', sched: 'Continuous · 2 min sweep', next: 'sweeping now', domain: 'Core',
    last: '01-Sep-2026 09:01', dur: '1 m 22 s', targets: 115, clean: 114, partial: 1, fail: 0,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-CORE-MUM', site: 'Maharashtra · 5GC core (tertiary)', scope: 'AMF/UPF/SMF · NRF-registered NFs',
    collector: 'clr-mum-02', cred: 'ro-core-v1', sched: 'Continuous · 2 min sweep', next: 'sweeping now', domain: 'Core',
    last: '01-Sep-2026 08:58', dur: '1 m 15 s', targets: 95, clean: 94, partial: 1, fail: 0,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-TRANSPORT-BLR', site: 'Karnataka · transport ring', scope: '172.31.90.0/24 · 172.31.91.0/24',
    collector: 'clr-blr-06', cred: 'ro-optical-v3', sched: 'Nightly 01:00', next: 'tomorrow 01:00', domain: 'Transport',
    last: '01-Sep-2026 01:00', dur: '15 m 40 s', targets: 650, clean: 598, partial: 41, fail: 11,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-TRANSPORT-DEL', site: 'Delhi · transport ring', scope: '172.31.92.0/24 · 172.31.93.0/24',
    collector: 'clr-del-06', cred: 'ro-optical-v3', sched: 'Nightly 01:30', next: 'tomorrow 01:30', domain: 'Transport',
    last: '01-Sep-2026 01:30', dur: '13 m 58 s', targets: 600, clean: 561, partial: 30, fail: 9,
    state: 'Completed', chip: 'success'
  },
  {
    id: 'DSC-TRANSPORT-CHE', site: 'Tamil Nadu · transport ring', scope: '172.31.94.0/24 · 172.31.95.0/24',
    collector: 'clr-mas-02', cred: 'ro-optical-v3', sched: 'Nightly 02:00', next: 'tomorrow 02:00', domain: 'Transport',
    last: '01-Sep-2026 02:00', dur: '16 m 12 s', targets: 676, clean: 612, partial: 47, fail: 17,
    state: 'Completed', chip: 'success'
  }
);
/* every domain's job rows must foot exactly to its DISCOVERY_JOB_ROWS scope
   (src/data/discoveryOverview.ts) — the same invariant that file's own
   IIFEs already enforce for the React side, mirrored here so the legacy
   Scan Jobs list can never silently show a different total than Insights */
(() => {
  const want = { RAN: 8450, Core: 340, Transport: 2180 };
  Object.entries(want).forEach(([d, total]) => {
    const sum = JOBS.filter(j => j.domain === d).reduce((a, j) => a + j.targets, 0);
    if (sum !== total) throw new Error(`app-data: ${d} job targets sum to ${sum}, DISCOVERY_JOB_ROWS says ${total}`);
  });
})();

const RUN_HISTORY = [
  { run: 4412, at: '01-Sep-2026 09:10:02', dur: '6.42 s', steps: '7 of 7', out: 'Exact match', chip: 'success', note: 'No change' },
  { run: 4398, at: '31-Aug-2026 03:11:40', dur: '6.11 s', steps: '7 of 7', out: 'Exact match', chip: 'success', note: 'No change' },
  { run: 4381, at: '30-Aug-2026 03:09:18', dur: '9.87 s', steps: '6 of 7', out: 'Drifted', chip: 'warning', note: 'OS version 21.2R3-S8.4 → S8.5 · accepted network' },
  { run: 4364, at: '29-Aug-2026 03:08:55', dur: '3.02 s', steps: '4 of 7', out: 'Partial', chip: 'error', note: 'OSPF timed out · Service skipped' }
];

const ADJACENCY = [
  { proto: 'LLDP', c: 19, ok: 18, chg: '1 new neighbour', tone: 'sky' },
  { proto: 'OSPF', c: 12, ok: 12, chg: 'no change', tone: 'cyan' },
  { proto: 'BGP', c: 4, ok: 4, chg: 'no change', tone: 'purple' },
  { proto: 'L3VPN', c: 14, ok: 13, chg: '1 RT added', tone: 'emerald' }
];

/* ── domain-specific discovery flows ──────────────────────
   Transport's transcript (TRANSCRIPT.steps / COLLECTORS / ADJACENCY above)
   is the original, unchanged reference — a router/switch pipeline that
   walks LLDP → OSPF → BGP → L3VPN. RAN discovers radio/cell configuration,
   not routing; Core discovers NF registration and session state, not
   chassis hardware; IP/MPLS keeps a routing-protocol shape like Transport's
   but swaps physical/LLDP discovery for the label/VPN stack its own domain
   actually runs. Each domain therefore gets its own step COUNT too — RAN
   and Core have five collectors behind Reachability, Transport and IP/MPLS
   have six — not a forced seven everywhere. */
const RAN_COLLECTORS = [
  {
    k: 'device', n: 'Device', proto: 'SNMP v2c', icon: 'chip',
    what: 'sysObjectID, sysDescr, sysName, sector count → gNodeB/eNodeB identity',
    writes: 'Creates or matches the RAN network-element record', ok: 1980, fail: 42, na: 0, order: 1
  },
  {
    k: 'radio', n: 'Radio/Cell', proto: 'NETCONF', icon: 'box',
    what: 'PCI, TAC, band, bandwidth and tx power per cell/sector',
    writes: 'Cell configuration records, one per sector', ok: 1904, fail: 58, na: 18, order: 2
  },
  {
    k: 'neighbours', n: 'Neighbours', proto: 'X2/Xn ANR', icon: 'link',
    what: 'Automatic neighbour relations and PCI collision check',
    writes: 'Neighbour-cell relationship records', ok: 1822, fail: 61, na: 97, order: 3
  },
  {
    k: 'config', n: 'Configuration', proto: 'NETCONF', icon: 'route',
    what: 'Antenna azimuth, tilt and RRC parameters per sector',
    writes: 'Antenna/RRC configuration attributes', ok: 1740, fail: 38, na: 202, order: 4
  },
  {
    k: 'service', n: 'Service', proto: 'NETCONF', icon: 'layers',
    what: 'Active RRC-connected UE contexts and cell service state',
    writes: 'Cell service state and active-session count', ok: 1611, fail: 22, na: 367, order: 5
  }
];
const CORE_COLLECTORS = [
  {
    k: 'device', n: 'Device', proto: 'REST (NRF)', icon: 'chip',
    what: 'nfInstanceId, nfType, nfStatus → network-function identity',
    writes: 'Creates or matches the NF record', ok: 336, fail: 4, na: 0, order: 1
  },
  {
    k: 'registration', n: 'NF Registration', proto: 'REST (NRF)', icon: 'link',
    what: 'Heartbeat timer, registration age, active NRF subscriptions',
    writes: 'Registration and subscription attributes', ok: 330, fail: 6, na: 4, order: 2
  },
  {
    k: 'interfaces', n: 'Interfaces', proto: 'NETCONF', icon: 'box',
    what: 'N2/N3/N4 reference-point interface status',
    writes: 'Interface up/down state per reference point', ok: 322, fail: 8, na: 10, order: 3
  },
  {
    k: 'session', n: 'Session/Service', proto: 'REST', icon: 'route',
    what: 'Active PDU sessions and service profiles',
    writes: 'PDU-session and service-profile counts', ok: 318, fail: 5, na: 17, order: 4
  },
  {
    k: 'dependencies', n: 'Dependencies', proto: 'REST (NRF)', icon: 'globe',
    what: 'The other NFs this one depends on (AMF → SMF → UPF, say)',
    writes: 'NF-to-NF dependency links', ok: 305, fail: 3, na: 32, order: 5
  }
];
const IPMPLS_COLLECTORS = [
  {
    k: 'device', n: 'Device', proto: 'SNMP v2c', icon: 'chip',
    what: 'sysObjectID, sysDescr, sysName, uptime → identity and OEM',
    writes: 'Creates or matches the network-element record', ok: 1198, fail: 65, na: 0, order: 1
  },
  {
    k: 'interfaces', n: 'Interfaces', proto: 'SNMP IF-MIB', icon: 'box',
    what: 'Interface table: admin/oper status, IP addressing',
    writes: 'Interface inventory and IP address records', ok: 1140, fail: 40, na: 21, order: 2
  },
  {
    k: 'routing', n: 'Routing', proto: 'SNMP OSPF-MIB', icon: 'route',
    what: 'IGP adjacencies, areas, router IDs, neighbour states',
    writes: 'Logical routing links, area membership', ok: 1052, fail: 33, na: 106, order: 3
  },
  {
    k: 'mpls', n: 'MPLS/LDP', proto: 'SNMP MPLS-LDP-MIB', icon: 'link',
    what: 'LDP peer sessions and label bindings',
    writes: 'LDP peer and label-binding records', ok: 968, fail: 28, na: 198, order: 4
  },
  {
    k: 'bgp', n: 'BGP', proto: 'SNMP BGP4-MIB', icon: 'globe',
    what: 'Peer table, local and remote AS, session state',
    writes: 'Logical peering links, AS topology', ok: 604, fail: 21, na: 458, order: 5
  },
  {
    k: 'vpn', n: 'VPN/Service', proto: 'NETCONF', icon: 'layers',
    what: 'VRF, route distinguisher, route targets, attachment interfaces',
    writes: 'L3VPN / L2VPN service instances and their endpoints', ok: 1102, fail: 31, na: 151, order: 6
  }
];
const COLLECTORS_BY_DOMAIN = { Transport: COLLECTORS, RAN: RAN_COLLECTORS, Core: CORE_COLLECTORS, IPMPLS: IPMPLS_COLLECTORS };
/* how long a target row's own ch[] must be for its domain — RAN/Core run
   5 collectors behind Reachability, Transport/IP/MPLS run 6 */
const CH_LEN_BY_DOMAIN = { Transport: COLLECTORS.length, RAN: RAN_COLLECTORS.length, Core: CORE_COLLECTORS.length, IPMPLS: IPMPLS_COLLECTORS.length };
/* truncates a 6-slot ch[] pattern down to a shorter domain's own length —
   'fail' always leads and 'na' always trails in every pattern already used
   in this file, so dropping slots off the end never changes what the
   pattern means, just how many collectors it covers */
const chForDomain = (arr, domain) => arr.slice(0, CH_LEN_BY_DOMAIN[domain] || arr.length);

/* Reachability + that domain's own collectors, in the same {k,n,proto,
   state,ms,bytes,req,res,wrote} shape TRANSCRIPT.steps already uses —
   {{ip}}/{{host}}/{{oem}}/{{model}} are filled in by txStepsFor() per
   target, the same idea as Transport's own literal-IP substitution but
   generalised so it isn't tied to one hardcoded demo address. */
const TRANSCRIPT_BY_DOMAIN = {
  Transport: TRANSCRIPT.steps,
  RAN: [
    {
      k: 'reach', n: 'Reachability', proto: 'ICMP', state: 'ok', ms: 30, bytes: 168,
      req: 'ping -c 3 -W 2 {{ip}}',
      res: '3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max/mdev = 0.028/0.033/0.041/0.004 ms',
      wrote: 'reachable = true'
    },
    {
      k: 'device', n: 'Device', proto: 'SNMP v2c', state: 'ok', ms: 180, bytes: 320,
      req: 'snmpget -v2c -c ro-ran-v1 {{ip}} sysObjectID.0 sysDescr.0 sysName.0',
      res: 'sysObjectID.0 = OID: .1.3.6.1.4.1.94.1.21.1.3 (RAN gNodeB)\nsysDescr.0   = "5G gNodeB, 3 sectors, band n78"\nsysName.0    = "{{host}}"',
      wrote: 'oem = {{oem}} (derived) · model = {{model}} · sector count = 3'
    },
    {
      k: 'radio', n: 'Radio/Cell', proto: 'NETCONF', state: 'ok', ms: 460, bytes: 2140,
      req: '<rpc><get><filter><cell-config/></filter></get></rpc>',
      res: 'Cell 1: PCI=312, TAC=10234, band=n78, bandwidth=100MHz, txPower=43dBm\nCell 2: PCI=487, TAC=10234, band=n78, bandwidth=100MHz, txPower=43dBm\nCell 3: PCI=126, TAC=10234, band=n78, bandwidth=100MHz, txPower=43dBm',
      wrote: '3 cells configured · PCI 312/487/126 · band n78'
    },
    {
      k: 'neighbours', n: 'Neighbours', proto: 'X2/Xn ANR', state: 'ok', ms: 610, bytes: 1480,
      req: 'get-neighbor-relations --cell-group={{host}}',
      res: '14 neighbour relations reported · 12 confirmed via ANR · 2 pending measurement',
      wrote: '14 neighbour relations · no PCI collision detected'
    },
    {
      k: 'config', n: 'Configuration', proto: 'NETCONF', state: 'ok', ms: 390, bytes: 960,
      req: '<rpc><get-config><antenna-config/></get-config></rpc>',
      res: 'Sector 1: azimuth=45°, tilt=6°\nSector 2: azimuth=165°, tilt=4°\nSector 3: azimuth=285°, tilt=5°',
      wrote: 'Antenna azimuth/tilt recorded for 3 sectors'
    },
    {
      k: 'service', n: 'Service', proto: 'NETCONF', state: 'ok', ms: 340, bytes: 780,
      req: '<rpc><get><filter><active-ue-sessions/></filter></get></rpc>',
      res: '142 active UE contexts · 128 RRC-connected · 14 idle',
      wrote: '142 active sessions · cell service state = in-service'
    }
  ],
  Core: [
    {
      k: 'reach', n: 'Reachability', proto: 'ICMP', state: 'ok', ms: 28, bytes: 168,
      req: 'ping -c 3 -W 2 {{ip}}',
      res: '3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max/mdev = 0.022/0.027/0.035/0.004 ms',
      wrote: 'reachable = true'
    },
    {
      k: 'device', n: 'Device', proto: 'REST (NRF)', state: 'ok', ms: 90, bytes: 410,
      req: 'GET /nnrf-disc/v1/nf-instances?nf-type=AMF&target-nf-instance-id={{host}}',
      res: '{"nfInstanceId":"{{host}}","nfType":"AMF","nfStatus":"REGISTERED","plmnList":[{"mcc":"404","mnc":"10"}]}',
      wrote: 'nfType = AMF · nfStatus = REGISTERED'
    },
    {
      k: 'registration', n: 'NF Registration', proto: 'REST (NRF)', state: 'ok', ms: 75, bytes: 260,
      req: 'GET /nnrf-nfm/v1/nf-instances/{{host}}',
      res: 'heartBeatTimer=30 · registeredSince=2026-08-01T04:12:00Z · nrfSubscriptions=4',
      wrote: '4 active NRF subscriptions'
    },
    {
      k: 'interfaces', n: 'Interfaces', proto: 'NETCONF', state: 'ok', ms: 210, bytes: 540,
      req: '<rpc><get><filter><interfaces/></filter></get></rpc>',
      res: 'N2 (to gNodeB): up\nN3 (to UPF): up\nN4 (to SMF): up',
      wrote: '3 core reference-point interfaces verified (N2/N3/N4)'
    },
    {
      k: 'session', n: 'Session/Service', proto: 'REST', state: 'ok', ms: 160, bytes: 980,
      req: 'GET /nsmf-pdusession/v1/pdu-sessions?supi={{host}}',
      res: '1,204 active PDU sessions · avg throughput 3.2 Gbps',
      wrote: '1,204 active PDU sessions'
    },
    {
      k: 'dependencies', n: 'Dependencies', proto: 'REST (NRF)', state: 'ok', ms: 130, bytes: 320,
      req: 'GET /nnrf-disc/v1/nf-instances?requester-nf-instance-id={{host}}',
      res: 'Depends on: UPF-01, UPF-02, SMF-01',
      wrote: '3 dependent network functions mapped'
    }
  ],
  IPMPLS: [
    {
      k: 'reach', n: 'Reachability', proto: 'ICMP', state: 'ok', ms: 32, bytes: 192,
      req: 'ping -c 3 -W 2 {{ip}}',
      res: '3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max/mdev = 0.029/0.034/0.042/0.005 ms',
      wrote: 'reachable = true'
    },
    {
      k: 'device', n: 'Device', proto: 'SNMP v2c', state: 'ok', ms: 198, bytes: 452,
      req: 'snmpget -v2c -c ro-inband-v3 {{ip}} sysObjectID.0 sysDescr.0 sysName.0 sysUpTime.0',
      res: 'sysObjectID.0 = OID: {{oid}}\nsysDescr.0   = "{{sysdescr}}"\nsysName.0    = "{{host}}"\nsysUpTime.0  = 298114400  (34d 12h 6m)',
      wrote: 'oem = {{oem}} (derived from OID) · model = {{model}} · sysName · uptime'
    },
    {
      k: 'interfaces', n: 'Interfaces', proto: 'SNMP IF-MIB', state: 'ok', ms: 380, bytes: 5240,
      req: 'snmpwalk -v2c -c ro-inband-v3 {{ip}} 1.3.6.1.2.1.2.2.1  (ifTable)',
      res: 'ifDescr.1 = "ge-0/0/0"  ifOperStatus.1 = up(1)\nifDescr.2 = "ge-0/0/1"  ifOperStatus.2 = up(1)\n… 16 more interfaces',
      wrote: '18 interfaces · 16 up, 2 admin-down'
    },
    {
      k: 'routing', n: 'Routing', proto: 'SNMP OSPF-MIB', state: 'ok', ms: 920, bytes: 1840,
      req: 'snmpwalk -v2c -c ro-inband-v3 {{ip}} 1.3.6.1.2.1.14.10.1  (ospfNbrTable)',
      res: 'ospfNbrRtrId.10.255.0.1.0 = 10.255.0.1   state full(8)\n… 7 more adjacencies, area 0.0.0.10',
      wrote: '8 IGP adjacencies · area 0.0.0.10 membership'
    },
    {
      k: 'mpls', n: 'MPLS/LDP', proto: 'SNMP MPLS-LDP-MIB', state: 'ok', ms: 760, bytes: 2260,
      req: 'snmpwalk -v2c -c ro-inband-v3 {{ip}} 1.3.6.1.2.1.10.166.4  (mplsLdpPeerTable)',
      res: 'mplsLdpPeerLabelDistMethod.1 = downstreamUnsolicited(2)\n… 6 LDP peer sessions, 420 label bindings',
      wrote: '6 LDP peers · 420 label bindings'
    },
    {
      k: 'bgp', n: 'BGP', proto: 'SNMP BGP4-MIB', state: 'ok', ms: 640, bytes: 980,
      req: 'snmpwalk -v2c -c ro-inband-v3 {{ip}} 1.3.6.1.2.1.15.3.1  (bgpPeerTable)',
      res: 'bgpPeerState.10.255.1.2 = established(6)   remoteAs 24186\n… 2 more peers',
      wrote: '3 peering links · local AS 24186'
    },
    {
      k: 'vpn', n: 'VPN/Service', proto: 'NETCONF', state: 'ok', ms: 880, bytes: 18400,
      req: '<rpc><get-configuration><configuration><routing-instances/></configuration></get-configuration></rpc>',
      res: 'instance MPLS-CORE-VRF1   type vrf   rd 24186:2001\n  interface ge-0/0/2.100\ninstance L2CKT-RING4      type l2vpn  rd 24186:3004\n… 11 more instances',
      wrote: '9 L3VPN + 4 L2VPN instances · 13 total'
    }
  ]
};

/* "Objects discovered" categories per domain — Transport's stays ADJACENCY,
   unchanged; the others name what that domain's own collectors above
   actually write, so the widget never shows LLDP/OSPF/BGP/L3VPN for a
   domain that doesn't run those protocols. */
const OBJECTS_BY_DOMAIN = {
  Transport: ADJACENCY,
  RAN: [
    { proto: 'Cells', c: 3, ok: 3, chg: 'no change', tone: 'sky' },
    { proto: 'Neighbours', c: 14, ok: 12, chg: '2 pending ANR', tone: 'cyan' },
    { proto: 'Antenna sectors', c: 3, ok: 3, chg: 'no change', tone: 'purple' },
    { proto: 'Active sessions', c: 142, ok: 142, chg: '8 more than last run', tone: 'emerald' }
  ],
  Core: [
    { proto: 'NRF subscriptions', c: 4, ok: 4, chg: 'no change', tone: 'sky' },
    { proto: 'Interfaces', c: 3, ok: 3, chg: 'no change', tone: 'cyan' },
    { proto: 'PDU sessions', c: 1204, ok: 1198, chg: '6 draining', tone: 'purple' },
    { proto: 'Dependent NFs', c: 3, ok: 3, chg: 'no change', tone: 'emerald' }
  ],
  IPMPLS: [
    { proto: 'Interfaces', c: 18, ok: 16, chg: '2 admin-down', tone: 'sky' },
    { proto: 'IGP adjacencies', c: 8, ok: 8, chg: 'no change', tone: 'cyan' },
    { proto: 'LDP peers', c: 6, ok: 6, chg: 'no change', tone: 'indigo' },
    { proto: 'BGP peers', c: 3, ok: 3, chg: 'no change', tone: 'purple' },
    { proto: 'VPN instances', c: 13, ok: 13, chg: '1 added', tone: 'emerald' }
  ]
};
/* Transport's is its exact original sentence ("19 LLDP neighbours · 12 OSPF
   adjacencies · ..."), preserved word-for-word rather than derived generically
   from OBJECTS_BY_DOMAIN.Transport's short labels; the other three read
   naturally in the same style. */
const OBJECTS_SUB_BY_DOMAIN = {
  Transport: '19 LLDP neighbours · 12 OSPF adjacencies · 4 BGP peers · 14 L3VPN instances',
  RAN: '3 cells · 14 neighbour relations · 3 antenna sectors · 142 active sessions',
  Core: '4 NRF subscriptions · 3 core interfaces · 1,204 PDU sessions · 3 dependent NFs',
  IPMPLS: '18 interfaces · 8 IGP adjacencies · 6 LDP peers · 3 BGP peers · 13 VPN instances'
};

/* ── field provenance for the sample record ─────────────── */
const PROV = [
  { f: 'Management IP', v: '172.31.33.100', src: 'Scope', when: 'this run', ok: true },
  { f: 'Vendor', v: 'JUNIPER', src: 'Derived · sysObjectID', when: '3h ago', ok: true },
  { f: 'Model', v: 'MX960', src: 'Device collector', when: '3h ago', ok: true },
  { f: 'Serial number', v: 'JN1236F87AFB', src: 'Hardware collector', when: '3h ago', ok: true },
  { f: 'OS version', v: '21.2R3-S8.5', src: 'Device collector', when: '3h ago', ok: true },
  { f: 'Uptime', v: '47 d 18 h', src: 'Device collector', when: '3h ago', ok: true },
  { f: 'Adjacencies', v: '19 LLDP · 12 OSPF · 4 BGP', src: 'LLDP · OSPF · BGP', when: '3h ago', ok: true },
  { f: 'Services', v: '14 L3VPN instances', src: 'Service collector', when: '3h ago', ok: true },
  { f: 'Circle · site', v: 'Delhi · DEL-279', src: 'Manual', when: '21-Jul-2026', ok: true },
  { f: 'Stock state', v: 'Deployed', src: 'Workorder WO-2291', when: '02-Mar-2024', ok: true },
  { f: 'Warranty ends', v: 'Not linked', src: 'ERP · not integrated', when: '—', ok: false }
];

/* ── network elements: both sides of the comparison, row by row ─── */
/* inv = what the inventory record says · net = what discovery found */
const NE_RECON = [
  {
    ne: 'NDLS-J960-P_R1-T1-NR', ip: '172.31.42.100', circle: 'Delhi', rule: 'Serial', out: 'Agree', chip: 'success', ver: '3h ago',
    inv: { oem: 'JUNIPER', model: 'MX960', os: '21.2R3-S8.5', sn: 'JN1236F87AFB' },
    net: { oem: 'JUNIPER', model: 'MX960', os: '21.2R3-S8.5', sn: 'JN1236F87AFB' }, diff: []
  },
  {
    ne: 'VZG-N540X-PE-T4-NR', ip: '172.31.53.186', circle: 'Andhra Pradesh', rule: 'Serial', out: 'Agree', chip: 'success', ver: '10 h ago',
    inv: { oem: 'CISCO', model: 'NCS-540', os: '7.9.2', sn: 'FW488AS342W' },
    net: { oem: 'CISCO', model: 'NCS-540', os: '7.9.2', sn: 'FW488AS342W' }, diff: []
  },
  {
    ne: 'DND-ART-98-PE-T4-NR', ip: '172.31.44.18', circle: 'Tamil Nadu', rule: 'Chassis MAC', out: 'Agree', chip: 'success', ver: '5 h ago',
    inv: { oem: 'JUNIPER', model: 'ACX7024', os: '23.2R1-S2.6', sn: 'FL2423AN0050' },
    net: { oem: 'JUNIPER', model: 'ACX7024', os: '23.2R1-S2.6', sn: 'FL2423AN0050' }, diff: []
  },
  {
    ne: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '172.31.86.61', circle: 'Karnataka', rule: 'Serial', out: 'Differ', chip: 'warning', ver: '3h ago',
    inv: { oem: 'QUANTA', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W' },
    net: { oem: 'JUNIPER', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W' }, diff: ['oem']
  },
  {
    ne: 'CHE-J2.2K-PE-T4-ER', ip: '172.31.61.140', circle: 'Tamil Nadu', rule: 'Serial', out: 'Differ', chip: 'warning', ver: '3h ago',
    inv: { oem: 'HP', model: 'ACX2200', os: '21.2R3-S8.5', sn: 'PJ0215230255' },
    net: { oem: 'JUNIPER', model: 'ACX2200', os: '21.4R3-S5.5', sn: 'PJ0215230255' }, diff: ['oem', 'os']
  },
  {
    ne: 'KA-BGLK-277-T-CHR-08', ip: '172.31.31.204', circle: 'Karnataka', rule: 'Chassis MAC', out: 'Differ', chip: 'warning', ver: '6 h ago',
    inv: { oem: 'HP', model: 'C9300-48UXM', os: '17.9.4', sn: 'SW-CHR-CORE-4499' },
    net: { oem: 'CISCO', model: 'C9300-48UXM', os: '17.9.4', sn: 'SW-CHR-CORE-4499' }, diff: ['oem']
  },
  {
    ne: 'ET-J960-P-T1-WR', ip: '172.31.31.97', circle: 'Karnataka', rule: 'Serial', out: 'Differ', chip: 'warning', ver: '3h ago',
    inv: { oem: 'JUNIPER', model: 'MX960', os: '21.2R3-S9.21', sn: 'JN1234C25AFA' },
    net: { oem: 'JUNIPER', model: 'MX960', os: '21.4R3-S5.5', sn: 'JN1234C25AFA' }, diff: ['os']
  },
  {
    ne: 'NDD-J2.2K-PE-T4-SR', ip: '192.168.1.11', circle: 'Karnataka', rule: 'Serial', out: 'Differ', chip: 'warning', ver: '5 h ago',
    inv: { oem: 'JUNIPER', model: 'QuantaMesh T3048-LY9', os: '3.2.0.4', sn: 'QCT3048NDD11A01' },
    net: { oem: 'JUNIPER', model: 'EX4300-48P', os: '3.2.0.4', sn: 'QCT3048NDD11A01' }, diff: ['model']
  },
  {
    ne: 'CHE-920-WIFI-R2', ip: '172.31.70.43', circle: 'Tamil Nadu', rule: 'Serial', out: 'Stale', chip: 'orange', ver: '30 d ago',
    inv: { oem: 'CISCO', model: 'ASR920', os: '17.6.4', sn: 'CAT2034U1PP' },
    net: { oem: 'CISCO', model: 'ASR920', os: '17.6.4', sn: 'CAT2034U1PP' }, diff: []
  },
  {
    ne: 'BGLK-EX4300-T-CHR-07', ip: '172.31.31.2', circle: 'Karnataka', rule: 'Chassis MAC', out: 'Stale', chip: 'orange', ver: '10 mo ago',
    inv: { oem: 'JUNIPER', model: 'EX4300-48P', os: '20.4R3', sn: 'SW-PRO-CHR-4545' },
    net: { oem: 'JUNIPER', model: 'EX4300-48P', os: '20.4R3', sn: 'SW-PRO-CHR-4545' }, diff: []
  },
  {
    ne: 'MAS-N7750-BNG-R-T1-SR', ip: '172.31.33.130', circle: 'Tamil Nadu', rule: 'no device answered', out: 'Only in inventory', chip: 'error', ver: '261 runs ago',
    inv: { oem: 'NOKIA', model: '7750', os: 'TiMOS-C-21.5', sn: 'JS123CC2EAFA' }, net: null, diff: []
  },
  {
    ne: 'ODI-ACX2200-PE-T4', ip: '172.31.61.10', circle: 'Odisha', rule: 'no device answered', out: 'Only in inventory', chip: 'error', ver: '287 runs ago',
    inv: { oem: 'JUNIPER', model: 'ACX2200', os: '21.2R3-S8.5', sn: 'PJ0215230412' }, net: null, diff: []
  },
  {
    ne: 'BLR-ACX7024-UNREG-01', ip: '172.31.31.212', circle: 'Karnataka', rule: 'no record matched', out: 'Only on network', chip: 'pink', ver: '4 h ago',
    inv: null, net: { oem: 'JUNIPER', model: 'ACX7024', os: '23.2R1-S2.6', sn: 'FL2423AN0918' }, diff: []
  },
  {
    ne: 'INDR-C9300-TEMP', ip: '172.31.39.144', circle: 'Madhya Pradesh', rule: 'no record matched', out: 'Only on network', chip: 'pink', ver: '7 h ago',
    inv: null, net: { oem: 'CISCO', model: 'C9300-48UXM', os: '17.9.4', sn: 'SW-CHR-CORE-4499' }, diff: []
  },
  {
    ne: '— unidentified —', ip: '172.31.50.88', circle: 'Andhra Pradesh', rule: 'no rule resolved', out: 'Unidentified', chip: 'purple', ver: '10 h ago',
    inv: null, net: { oem: 'NOKIA', model: '7750 SR-7', os: '—', sn: '—' }, diff: []
  }
];

const REC_BANDS = {
  invOnly: {
    n: 'Only in inventory', c: 118, chip: 'error', tone: 'red',
    q: 'On record, did not answer the last three discovery runs.'
  },
  both: {
    n: 'Found on both sides', c: 2379, tone: 'emerald', parts: [
      { k: 'Agree', n: 'Every governed attribute agrees', c: 1829, tone: 'emerald', chip: 'success' },
      { k: 'Differ', n: 'At least one attribute differs', c: 392, tone: 'amber', chip: 'warning' },
      { k: 'Stale', n: 'Agrees, but verified too long ago', c: 158, tone: 'orange', chip: 'orange' }]
  },
  netOnly: {
    n: 'Only on the network', c: 224, tone: 'fuchsia', parts: [
      { k: 'Only on network', n: 'Identified, but no inventory record', c: 160, tone: 'fuchsia', chip: 'pink' },
      { k: 'Unidentified', n: 'Answered, but no rule could place it', c: 64, tone: 'purple', chip: 'purple' }]
  },
  notComparable: {
    n: 'Cannot be compared', c: 206, tone: 'slate',
    q: 'Server, DWDM, eNodeB and gNodeB — no collector reaches these classes, so they are excluded from the comparison rather than counted as missing.'
  }
};

/* ── source, the bridge from Discovery ───────────────────── */
const SRC = { d: ['Discovered', 'success'], p: ['Planned · CIQ', 'info'], m: ['Manual', 'neutral'], e: ['EMS', 'purple'] };
const src = k => chip(SRC[k][0], SRC[k][1]);
const RSTATE = {
  ok: ['Verified', 'success'], drift: ['Drifted', 'warning'], stale: ['Stale', 'orange'],
  miss: ['Missing', 'error'], none: ['Not discovered', 'neutral']
};
const rst = k => chip(RSTATE[k][0], RSTATE[k][1]);

const IL = {
  locations: 1754, central: 118, regional: 342, edge: 1294,
  ne: 2703, discovered: 2379, links: 7846, services: 2457, vnf: 28, inactive: 412, reports: 22
};

const LOC_TIERS = [
  { n: 'Central', c: 118, planned: 9, building: 14, live: 92, failed: 3, tone: 'amber' },
  { n: 'Regional', c: 342, planned: 31, building: 44, live: 259, failed: 8, tone: 'sky' },
  { n: 'Edge', c: 1294, planned: 212, building: 178, live: 881, failed: 23, tone: 'emerald' }
];
const LOC_HEALTH = [
  { n: 'Sites where discovery found fewer NE than inventory holds', c: 214, tone: 'amber', act: 'Reconcile' },
  { n: 'Sites on-air with no NE discovered at all', c: 43, tone: 'red', act: 'Investigate' },
  { n: 'Sites with no NE record against them', c: 87, tone: 'slate', act: 'Review' },
  { n: 'Sites in build for more than 90 days', c: 61, tone: 'orange', act: 'Escalate' }
];

/* ── geography: circle centroids, site counts, build state ── */
const LOC_GEO = [
  { c: 'MH', n: 'Maharashtra', st: 'Maharashtra', lat: 19.75, lon: 75.71, tot: 248, live: 174, build: 37, fail: 4 },
  { c: 'UP', n: 'Uttar Pradesh', st: 'Uttar Pradesh', lat: 26.85, lon: 80.95, tot: 221, live: 158, build: 31, fail: 4 },
  { c: 'KA', n: 'Karnataka', st: 'Karnataka', lat: 15.32, lon: 75.71, tot: 211, live: 161, build: 25, fail: 2 },
  { c: 'MP', n: 'Madhya Pradesh', st: 'Madhya Pradesh', lat: 23.47, lon: 77.95, tot: 194, live: 118, build: 35, fail: 8 },
  { c: 'DL', n: 'Delhi', st: 'Delhi', lat: 28.61, lon: 77.21, tot: 176, live: 139, build: 19, fail: 2 },
  { c: 'TN', n: 'Tamil Nadu', st: 'Tamil Nadu', lat: 11.13, lon: 78.66, tot: 154, live: 112, build: 18, fail: 1 },
  { c: 'GJ', n: 'Gujarat', st: 'Gujarat', lat: 22.26, lon: 71.19, tot: 152, live: 104, build: 20, fail: 2 },
  { c: 'AP', n: 'Andhra Pradesh', st: 'Andhra Pradesh', lat: 15.91, lon: 79.74, tot: 143, live: 96, build: 18, fail: 6 },
  { c: 'RJ', n: 'Rajasthan', st: 'Rajasthan', lat: 27.02, lon: 74.22, tot: 46, live: 30, build: 6, fail: 1 },
  { c: 'WB', n: 'West Bengal', st: 'West Bengal', lat: 22.99, lon: 87.86, tot: 38, live: 26, build: 4, fail: 0 },
  { c: 'OR', n: 'Odisha', st: 'Odisha', lat: 20.95, lon: 85.10, tot: 33, live: 22, build: 6, fail: 3 },
  { c: 'PB', n: 'Punjab', st: 'Punjab', lat: 31.15, lon: 75.34, tot: 27, live: 18, build: 3, fail: 0 },
  { c: 'KL', n: 'Kerala', st: 'Kerala', lat: 10.85, lon: 76.27, tot: 24, live: 17, build: 3, fail: 0 },
  { c: 'TS', n: 'Telangana', st: 'Telangana', lat: 17.12, lon: 79.02, tot: 20, live: 14, build: 2, fail: 0 },
  { c: 'HR', n: 'Haryana', st: 'Haryana', lat: 29.06, lon: 76.09, tot: 18, live: 12, build: 2, fail: 0 },
  { c: 'CG', n: 'Chhattisgarh', st: 'Chhattisgarh', lat: 21.28, lon: 81.87, tot: 14, live: 9, build: 2, fail: 1 },
  { c: 'BR', n: 'Bihar', st: 'Bihar', lat: 25.10, lon: 85.31, tot: 12, live: 8, build: 1, fail: 0 },
  { c: 'AS', n: 'Assam', st: 'Assam', lat: 26.20, lon: 92.94, tot: 9, live: 5, build: 2, fail: 0 },
  { c: 'JH', n: 'Jharkhand', st: 'Jharkhand', lat: 23.61, lon: 85.28, tot: 8, live: 5, build: 1, fail: 0 },
  { c: 'UK', n: 'Uttarakhand', st: 'Uttarakhand', lat: 30.07, lon: 79.09, tot: 6, live: 4, build: 1, fail: 0 }
];
const STATE_CIRCLE = Object.fromEntries(LOC_GEO.map(g => [g.st, g]));


/* simplified India outline, clockwise from the north-west — schematic, not survey-accurate */
const INDIA = [[77.0, 35.5], [75.9, 34.7], [74.2, 34.3], [73.9, 32.6], [74.6, 31.3], [73.3, 29.6], [71.6, 27.8], [70.2, 25.7], [68.9, 24.3], [69.1, 22.5], [72.6, 21.5],
[72.8, 19.1], [73.3, 16.0], [74.8, 13.0], [75.2, 11.5], [76.5, 8.4], [77.5, 8.1], [79.8, 10.3], [80.3, 13.1],
[80.2, 15.9], [82.3, 17.0], [84.8, 19.3], [87.0, 21.5], [88.9, 21.7], [88.1, 24.5], [91.5, 24.0], [92.3, 22.0],
[93.4, 23.0], [94.6, 24.0], [97.3, 24.5], [96.2, 27.2], [97.4, 28.2], [95.0, 27.2], [92.0, 27.6], [89.9, 26.9],
[88.2, 26.5], [85.0, 27.0], [81.0, 30.3], [79.0, 31.4], [78.7, 32.6], [79.2, 34.5]];

const LOC_CIRCLES_OLD = [
  { n: 'Maharashtra', c: 248, live: 174 }, { n: 'Uttar Pradesh', c: 221, live: 158 },
  { n: 'Karnataka', c: 211, live: 161 }, { n: 'Madhya Pradesh', c: 194, live: 118 },
  { n: 'Delhi', c: 176, live: 139 }, { n: 'Tamil Nadu', c: 154, live: 112 },
  { n: 'Gujarat', c: 152, live: 104 }, { n: 'Andhra Pradesh', c: 143, live: 96 },
  { n: 'Other circles', c: 255, live: 170 }
];
const LOC_AGING = [
  { n: 'Under 30 days', c: 96, tone: 'emerald' }, { n: '30 – 90 days', c: 79, tone: 'amber' },
  { n: '90 – 180 days', c: 41, tone: 'orange' }, { n: 'Over 180 days', c: 20, tone: 'red' }
];

/* ── location hierarchy: every site type groups into one of three tiers
   the estate is actually built from — a Datacenter core, PoP locations
   that anchor a circle, and the sites (macro/micro/cell) hanging off
   them. Insights' hierarchy widget and its drill-downs read this grouping,
   not the raw `type` field, so a new site type only needs one line here. */
const TYPE_GROUP = { 'Datacenter': 'dc', 'POP': 'pop', 'Macro-O': 'site', 'Micro-CO': 'site', 'Cell Site': 'site' };
const typeGroupOf = t => TYPE_GROUP[t] || 'site';

const LOC_TYPES = [
  { k: 'dc', n: 'Datacenters', tone: 'purple', total: 24, live: 21, building: 2, planned: 1, failed: 0 },
  { k: 'pop', n: 'PoP locations', tone: 'sky', total: 210, live: 165, building: 27, planned: 15, failed: 3 },
  { k: 'site', n: 'Sites', tone: 'teal', total: 1520, live: 1046, building: 207, planned: 236, failed: 31 }
];

/* per-circle DC/PoP/Site split — derived from LOC_GEO so the three counts
   always foot to LOC_TYPES; only the DC/PoP seed for the top circles is
   hand-set, sites and the "other circles" remainder are the difference. */
const LOC_HIER = (() => {
  const seed = {
    MH: { dc: 4, pop: 32 }, UP: { dc: 3, pop: 27 }, KA: { dc: 3, pop: 26 }, MP: { dc: 2, pop: 24 },
    DL: { dc: 3, pop: 22 }, TN: { dc: 2, pop: 19 }, GJ: { dc: 2, pop: 18 }, AP: { dc: 2, pop: 17 }
  };
  const top = LOC_GEO.slice(0, 8).map(g => {
    const s = seed[g.c] || { dc: 0, pop: 0 };
    return { code: g.c, n: g.n, dc: s.dc, pop: s.pop, site: g.tot - s.dc - s.pop, tot: g.tot, live: g.live };
  });
  const rest = LOC_GEO.slice(8);
  const restTot = rest.reduce((a, g) => a + g.tot, 0), restLive = rest.reduce((a, g) => a + g.live, 0);
  const dcTotal = LOC_TYPES.find(t => t.k === 'dc').total, popTotal = LOC_TYPES.find(t => t.k === 'pop').total;
  const restDc = dcTotal - top.reduce((a, c) => a + c.dc, 0), restPop = popTotal - top.reduce((a, c) => a + c.pop, 0);
  top.push({ code: 'OTH', n: 'Other circles', dc: restDc, pop: restPop, site: restTot - restDc - restPop, tot: restTot, live: restLive });
  return top;
})();

const LOC_STATES = [
  { k: 'live', n: 'On-air', tone: 'emerald' }, { k: 'building', n: 'In progress', tone: 'amber' },
  { k: 'planned', n: 'Planned', tone: 'sky' }, { k: 'failed', n: 'Failed', tone: 'red' }
];

/* Sites split into the same three build classes the estate is actually
   built from; counts foot to LOC_TYPES' site total (1,520). */
const SITE_SUBTYPES = [
  { n: 'Macro-O', c: 641 }, { n: 'Micro-CO', c: 512 }, { n: 'Cell Site', c: 367 }
];

/* the eight named circles the hierarchy widget and the coverage table
   draw individually; everything else rolls into "Other circles" */
const TOP8_STATES = new Set(LOC_HIER.filter(r => r.code !== 'OTH').map(r => r.n));

const LOC_CITIES = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur', 'Thane', 'Solapur'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Noida', 'Gorakhpur', 'Meerut', 'Prayagraj'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Bagalkot', 'Davangere'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  'Delhi': ['Connaught Place', 'Dwarka', 'Rohini', 'Okhla', 'Janakpuri', 'Saket'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Dindigul'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  'Andhra Pradesh': ['Vijayawada', 'Visakhapatnam', 'Guntur', 'Tirupati', 'Nellore'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'West Bengal': ['Kolkata', 'Siliguri', 'Durgapur', 'Asansol'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Mohali'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Haldwani']
};

/* ── the full location roster ────────────────────────────────
   Generated, not hand-typed: every KPI, hierarchy node and coverage row
   on Insights reads a count out of LOC_HIER / LOC_TYPES, so the roster a
   drill-down lands on has to foot to those same numbers exactly, circle
   by circle and status by status — a hand-picked sample of ten can't do
   that. Deterministic (fixed seed), so the roster is stable across
   reloads rather than reshuffling. */
/* ── site rollout blockers ───────────────────────────────────
   Every category a real rollout program actually tracks, each with the
   specific reasons a NOC/deployment lead would recognise — not "mixed,
   see exception queue". A Blocked (Failed) site always carries one of
   these; a Delayed (In progress, stuck) site sometimes does too. */
const SITE_BLOCKERS = [
  {
    cat: 'Lease / Property', reasons: [
      'Lease agreement expired', 'Lease renewal pending approval', 'Landlord denied site access',
      'Building management denied access', 'Site ownership dispute', 'Legal clearance pending']
  },
  {
    cat: 'Power', reasons: [
      'Commercial power connection unavailable', 'Power handover pending from utility provider',
      'DG backup installation pending', 'Battery bank not commissioned', 'Power panel installation incomplete',
      'Electrical safety audit failed', 'Frequent power outages affecting commissioning']
  },
  {
    cat: 'Fiber Connectivity', reasons: [
      'Fiber route not handed over', 'Fiber cut on feeder route', 'Fiber splicing pending',
      'ROW approval pending', 'ODF installation incomplete', 'Backhaul connectivity unavailable']
  },
  {
    cat: 'Civil / Infrastructure', reasons: [
      'Tower foundation construction delayed', 'Equipment shelter installation pending', 'Civil work not completed',
      'Rack installation pending', 'HVAC installation pending', 'Structural audit failed', 'Site access road unavailable']
  },
  {
    cat: 'Regulatory', reasons: [
      'Municipal approval pending', 'Tower installation permit expired', 'Environmental clearance pending',
      'Local authority approval pending']
  },
  {
    cat: 'Supply Chain', reasons: [
      'Equipment delivery delayed', 'Material shortage at site', 'Vendor deployment delayed',
      'Acceptance testing pending vendor sign-off']
  },
  {
    cat: 'Commissioning', reasons: [
      'ATP pending', 'ATP failed due to power instability', 'Site integration pending NOC approval',
      'Site acceptance testing incomplete', 'Commissioning engineer visit pending']
  }
];
/* one business-impact line per category — reused across every reason in
   that category, since the operational consequence is the same shape */
const SITE_BLOCKER_IMPACT = {
  'Lease / Property': 'Site inaccessible for deployment and maintenance activities',
  'Power': 'Equipment commissioning cannot begin without stable power',
  'Fiber Connectivity': 'Backhaul unavailable — site cannot carry live traffic',
  'Civil / Infrastructure': 'Equipment installation blocked until civil work clears',
  'Regulatory': 'Tower and equipment installation cannot proceed without clearance',
  'Supply Chain': 'Commissioning delayed pending equipment and vendor readiness',
  'Commissioning': 'Site held at final acceptance — traffic cutover is blocked'
};
/* operational risk flags for sites that are on-air but not clean —
   distinct from a blocker: nothing is down, but something needs attention
   before it becomes an incident */
const SITE_RISKS = [
  'Lease expires within 30 days', 'Frequent power outages reported', 'Temporary fiber diversion in use',
  'Repeated landlord access restrictions', 'Battery backup below threshold',
  'High utilization requiring capacity expansion'
];

const LOCATIONS = (() => {
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const blockerPool = SITE_BLOCKERS.flatMap(b => b.reasons.map(reason => ({ cat: b.cat, reason })));
  const pickBlocker = () => pick(blockerPool);

  /* Commissioned/Blocked read straight off the existing status; the
     rollout sub-stages only apply to sites still in flight. */
  const stageFor = (k) => k === 'live' ? 'Commissioned' : k === 'failed' ? 'Blocked'
    : k === 'planned' ? 'Under Deployment' : pick(['Under Deployment', 'ATP Pending', 'Integration Pending']);

  /* one shuffled status per row of a type, sized exactly to LOC_TYPES —
     however the rows get diced up by circle afterward, the type totals
     still foot exactly */
  const poolFor = t => shuffle(LOC_STATES.flatMap(st => Array(t[st.k]).fill(st)));
  const pools = {
    Datacenter: poolFor(LOC_TYPES.find(t => t.k === 'dc')),
    POP: poolFor(LOC_TYPES.find(t => t.k === 'pop')),
    site: poolFor(LOC_TYPES.find(t => t.k === 'site'))
  };
  const siteTypes = shuffle(SITE_SUBTYPES.flatMap(s => Array(s.c).fill(s.n)));
  let dcN = 0, popN = 0, siteN = 0;

  const catFor = type => type === 'Datacenter' ? 'Central'
    : type === 'POP' ? (rnd() < .45 ? 'Central' : 'Regional')
      : (rnd() < .15 ? 'Regional' : 'Edge');
  const chipFor = k => ({ live: 'success', building: 'warning', planned: 'info', failed: 'error' }[k]);
  const ctFor = cat => cat === 'Central' ? 'amber' : cat === 'Regional' ? 'sky' : 'emerald';
  const abbrFor = type => type === 'Datacenter' ? 'DC' : type === 'POP' ? 'POP' : type === 'Macro-O' ? 'MAC' : type === 'Micro-CO' ? 'MIC' : 'CEL';

  const row = (code, stateName, city, lat, lon, type) => {
    const status = type === 'Datacenter' ? pools.Datacenter[dcN++] : type === 'POP' ? pools.POP[popN++] : pools.site[siteN++];
    const cat = catFor(type), abbr = abbrFor(type);
    const idx = type === 'Datacenter' ? dcN : type === 'POP' ? popN : siteN;
    const id = `${code}-${abbr}-${String(idx).padStart(3, '0')}`;
    const ne = type === 'Datacenter' ? 40 + Math.floor(rnd() * 180) : type === 'POP' ? 10 + Math.floor(rnd() * 25) : 2 + Math.floor(rnd() * 14);
    const disc = status.k === 'live' ? ne : status.k === 'building' ? Math.round(ne * (0.3 + rnd() * 0.5)) : 0;

    /* rollout stage, blocker and risk only apply to sites — a datacenter
       or PoP going down is an inventory event, not a site rollout one,
       and this dashboard's site-ops sections stay scoped to sites only */
    const isSite = type !== 'Datacenter' && type !== 'POP';
    const stage = isSite ? stageFor(status.k) : null;
    let issue = null, risk = null;
    if (isSite) {
      if (status.k === 'failed') issue = pickBlocker();
      else if (status.k === 'building' && rnd() < 0.4) issue = pickBlocker();
      else if (status.k === 'live' && rnd() < 0.08) risk = pick(SITE_RISKS);
    }

    return {
      st: status.n, chip: chipFor(status.k), name: id, cat, ct: ctFor(cat), type, id,
      addr: `${city} ${type === 'Datacenter' ? 'Data Park' : type === 'POP' ? 'PoP' : 'Site'}`,
      city, state: stateName, ne, disc, stage, issue, risk,
      lat: +(lat + (rnd() - 0.5) * 1.2).toFixed(3), lon: +(lon + (rnd() - 0.5) * 1.2).toFixed(3)
    };
  };

  const out = [];
  const restStates = LOC_GEO.slice(8), restW = restStates.reduce((a, g) => a + g.tot, 0);
  /* split a total across weighted buckets so the parts always sum back to it */
  const split = (total, weights, sumW) => {
    const parts = weights.map(w => Math.floor(total * w / sumW));
    let left = total - parts.reduce((a, b) => a + b, 0);
    for (let i = 0; left > 0; i = (i + 1) % parts.length, left--) parts[i]++;
    return parts;
  };

  LOC_HIER.forEach(r => {
    if (r.code === 'OTH') {
      /* "Other circles" isn't one place — its dc/pop/site totals ride on
         the twelve states LOC_HIER folded into it, weighted by size */
      const w = restStates.map(g => g.tot);
      const dcParts = split(r.dc, w, restW), popParts = split(r.pop, w, restW), siteParts = split(r.site, w, restW);
      restStates.forEach((g, gi) => {
        const cities = LOC_CITIES[g.st] || [g.st];
        for (let i = 0; i < dcParts[gi]; i++) out.push(row(g.c, g.st, pick(cities), g.lat, g.lon, 'Datacenter'));
        for (let i = 0; i < popParts[gi]; i++) out.push(row(g.c, g.st, pick(cities), g.lat, g.lon, 'POP'));
        for (let i = 0; i < siteParts[gi]; i++) out.push(row(g.c, g.st, pick(cities), g.lat, g.lon, siteTypes[siteN]));
      });
      return;
    }
    const g = LOC_GEO.find(x => x.c === r.code), cities = LOC_CITIES[r.n] || [r.n];
    for (let i = 0; i < r.dc; i++) out.push(row(r.code, r.n, pick(cities), g.lat, g.lon, 'Datacenter'));
    for (let i = 0; i < r.pop; i++) out.push(row(r.code, r.n, pick(cities), g.lat, g.lon, 'POP'));
    for (let i = 0; i < r.site; i++) out.push(row(r.code, r.n, pick(cities), g.lat, g.lon, siteTypes[siteN]));
  });
  return out;
})();

/* fold real network-element and failed-build counts back onto LOC_HIER,
   read straight off the roster that was just built from it — the
   hierarchy widget and the coverage table both read these, so a reader
   who hovers a node and then checks the table sees the same number. */
LOC_HIER.forEach(r => {
  const rows = r.code === 'OTH' ? LOCATIONS.filter(l => !TOP8_STATES.has(l.state)) : LOCATIONS.filter(l => l.state === r.n);
  r.neDc = rows.filter(l => l.type === 'Datacenter').reduce((a, l) => a + l.ne, 0);
  r.nePop = rows.filter(l => l.type === 'POP').reduce((a, l) => a + l.ne, 0);
  r.ne = rows.reduce((a, l) => a + l.ne, 0);
  r.neSite = r.ne - r.neDc - r.nePop;
  r.failed = rows.filter(l => l.st === 'Failed').length;
});

/* LOC_GEO's live/build/fail were hand-typed narrative numbers, disconnected
   from the roster once LOCATIONS became real generated data — the Map
   tab's right-hand panel (state build-status, "on-air" colouring) read
   those stale numbers, so selecting a different state could show figures
   that didn't match Coverage by circle or the hierarchy widget for the
   same place. Recompute all three from the same LOCATIONS rows every
   other widget uses, so every state selected on the map is live, not a
   fixed sample. */
LOC_GEO.forEach(g => {
  const rows = LOCATIONS.filter(l => l.state === g.st);
  g.tot = rows.length;
  g.live = rows.filter(l => l.st === 'On-air').length;
  g.build = rows.filter(l => l.st === 'In progress').length;
  g.fail = rows.filter(l => l.st === 'Failed').length;
});

const STOCK_ST = [
  { k: 'planned', n: 'Planned', c: 92, chip: 'info', tone: 'sky' },
  { k: 'instore', n: 'In store', c: 34, chip: 'cyan', tone: 'cyan' },
  { k: 'deployed', n: 'Deployed', c: 2503, chip: 'success', tone: 'emerald' },
  { k: 'faulty', n: 'Faulty / RMA', c: 74, chip: 'warning', tone: 'amber' },
  { k: 'decomm', n: 'Decommissioned', c: 412, chip: 'neutral', tone: 'slate' }
];
const STOCK_OF = Object.fromEntries(STOCK_ST.map(s => [s.k, s]));

/* ── class × stock cross-tab ───────────────────────────────
   A class total and a stock-state total are two views of the
   same population, so neither can be a standalone figure.
   Every count on Physical Resources is read out of this
   matrix: rows sum to the class totals in PHY_TABS (over the
   four active states), columns sum to STOCK_ST.            */
const PHY_MATRIX = {
  router: { planned: 58, instore: 21, deployed: 2017, faulty: 52, decomm: 289 },
  switch: { planned: 14, instore: 8, deployed: 315, faulty: 12, decomm: 61 },
  server: { planned: 6, instore: 3, deployed: 82, faulty: 5, decomm: 34 },
  dwdm: { planned: 8, instore: 2, deployed: 65, faulty: 3, decomm: 19 },
  enodeb: { planned: 3, instore: 0, deployed: 14, faulty: 1, decomm: 5 },
  gnodeb: { planned: 3, instore: 0, deployed: 10, faulty: 1, decomm: 4 }
};
const ACTIVE_STATES = ['planned', 'instore', 'deployed', 'faulty'];
/* how many elements of this class sit in these stock states */
const phyCount = (cls, states) =>
  [...states].reduce((a, s) => a + ((PHY_MATRIX[cls] || {})[s] || 0), 0);
/* how many elements of this class sit in one stock state */
const stockCount = (cls, s) => (PHY_MATRIX[cls] || {})[s] || 0;
/* the whole estate in one stock state, across every class */
const stockTotal = s => Object.keys(PHY_MATRIX).reduce((a, c) => a + stockCount(c, s), 0);

const PHY_TABS = [
  { k: 'router', n: 'Router', c: 2148, disc: 2114 }, { k: 'switch', n: 'Switch', c: 349, disc: 283 },
  { k: 'server', n: 'Server', c: 96, disc: 0 }, { k: 'dwdm', n: 'DWDM', c: 78, disc: 0 },
  { k: 'enodeb', n: 'eNodeB', c: 18, disc: 0 }, { k: 'gnodeb', n: 'gNodeB', c: 14, disc: 0 }
];
/* Classes that have a Node view destination. Server has no node-level page —
   nothing to view — so it's the one class left out; every other class opens
   Node view, even where the page itself has no live assurance feed to show. */
const NODE_VIEW_CLASSES = ['router', 'switch', 'dwdm', 'enodeb'];
const hasNodeView = k => NODE_VIEW_CLASSES.includes(k);

/* Node view is a genuinely different screen per class (see app-node2.js —
   separate header/overview/hardware per class, not one template branching
   on cls). The breadcrumb and page title should say which one a reader is
   actually looking at, instead of the same generic "Node view" for all four. */
const NODE_VIEW_LABEL = { router: 'Router node view', switch: 'Switch node view', dwdm: 'DWDM node view', enodeb: 'eNodeB node view' };
const nodeViewLabel = k => NODE_VIEW_LABEL[k] || 'Node view';
/* the short form, for spots (like the breadcrumb's drill segment) that sit
   right after something that already said "Node view" once */
const NODE_CLASS_NAME = { router: 'Router', switch: 'Switch', dwdm: 'DWDM', enodeb: 'eNodeB' };
const nodeClassName = k => NODE_CLASS_NAME[k] || 'Node';
const PHY = {
  router: [
    { st: 'ok', name: 'NDLS-J960-P_R1-T1-NR', ip: '172.31.42.100', model: 'MX960', os: '21.2R3-S8.5', sn: 'JN1236F87AFB', oem: 'JUNIPER', loc: 'DEL-279', s: 'd', stock: 'deployed', v: 3 },
    { st: 'ok', name: 'VZG-N540X-PE-T4-NR', ip: '172.31.53.186', model: 'NCS-540', os: '7.9.2', sn: 'FW488AS342W', oem: 'CISCO', loc: 'VJA-118', s: 'd', stock: 'deployed', v: 10 },
    { st: 'drift', name: 'CHE-J2.2K-PE-T4-ER', ip: '172.31.61.140', model: 'ACX2200', os: '21.2R3-S8.5', sn: 'PJ0215230255', oem: 'JUNIPER', loc: 'CHE-118', s: 'd', stock: 'deployed', v: 3 },
    { st: 'drift', name: 'ET-J960-P-T1-WR', ip: '172.31.31.97', model: 'MX960', os: '21.4R3-S5.5', sn: 'JN1234C25AFA', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 3 },
    { st: 'drift', name: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '172.31.86.61', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 3 },
    { st: 'stale', name: 'CHE-920-WIFI-R2', ip: '172.31.70.43', model: 'ASR920', os: '17.6.4', sn: 'CAT2034U1PP', oem: 'CISCO', loc: 'CHE-118', s: 'd', stock: 'deployed', v: 720 },
    { st: 'miss', name: 'MAS-N7750-BNG-R-T1-SR', ip: '172.31.33.130', model: '7750', os: '—', sn: 'JS123CC2EAFA', oem: 'NOKIA', loc: 'MAS-041', s: 'd', stock: 'faulty', v: 6264 },
    { st: 'none', name: 'ERS-N7750-SR7-T2-SR', ip: '192.168.1.14', model: '7750 SR-7', os: 'TiMOS-C-22.10.R1', sn: 'NSN7750ERS14A7X1', oem: 'NOKIA', loc: 'BGLK-277', s: 'p', stock: 'planned', v: null },
    { st: 'none', name: 'NDD-J2.2K-PE-T4-SR', ip: '192.168.1.11', model: 'EX4300-48P', os: '3.2.0.4', sn: 'QCT3048NDD11A01', oem: 'JUNIPER', loc: 'BGLK-277', s: 'p', stock: 'planned', v: null },
    { st: 'ok', name: 'WKR-J7024-PE-T4-WR', ip: '172.31.62.11', model: 'ACX7024', os: '23.2R1-S2.6', sn: 'FL2423AN0050', oem: 'JUNIPER', loc: 'WKR-204', s: 'd', stock: 'deployed', v: 5 },
    {
      st: 'none', name: 'MAS-J960-P-R2-T1-SR', ip: '172.31.31.140', model: 'MX960', os: '21.2R3-S8.4', sn: 'JN1231A55AFB', oem: 'JUNIPER', loc: 'MAS-041', s: 'm', stock: 'decomm', v: null,
      dOn: '14-Jun-2026', dWhy: 'Replaced under CR-8802', dBy: 'Anjali Verma', dWo: 'WO-3312', zombie: false
    },
    {
      st: 'none', name: 'DEL-N540X-SPARE', ip: '172.31.42.207', model: 'NCS-540', os: '7.9.2', sn: 'CAT2077U1XX', oem: 'CISCO', loc: 'DEL-279', s: 'm', stock: 'decomm', v: null,
      dOn: '02-May-2026', dWhy: 'End of life', dBy: 'Gaurav Shukla', dWo: 'WO-3188', zombie: true
    },
    {
      st: 'none', name: 'INDR-ASR920-R7', ip: '172.31.38.77', model: 'ASR920', os: '17.6.2', sn: 'CAT2034U7RR', oem: 'CISCO', loc: 'INDR-275', s: 'm', stock: 'decomm', v: null,
      dOn: '11-Feb-2026', dWhy: 'Faulty, returned to OEM', dBy: 'Amit Sharma', dWo: 'WO-2944', zombie: false
    },
    {
      st: 'none', name: 'VZG-7750-BNG-02', ip: '172.31.49.202', model: '7750', os: 'TiMOS-C-21.5', sn: 'NSN7750VZG022', oem: 'NOKIA', loc: 'VJA-118', s: 'm', stock: 'decomm', v: null,
      dOn: '08-Jan-2026', dWhy: 'Capacity migration', dBy: 'Sai Krishna', dWo: 'WO-2861', zombie: true
    }
  ],
  switch: [
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-01', ip: '172.31.31.201', model: 'L3-CORE-48P', os: '8.2.1', sn: 'HPE-SW-CH-2026-001', oem: 'CIENA', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-04', ip: '172.31.31.202', model: 'EX2200-24T', os: '15.1R7', sn: 'CHR-SN-808090', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'drift', name: 'KA-BGLK-277-T-CHR-08', ip: '172.31.31.204', model: 'C9300-48UXM', os: '17.9.4', sn: 'SW-CHR-CORE-4499', oem: 'CISCO', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    { st: 'stale', name: 'BGLK-EX4300-T-CHR-07', ip: '172.31.31.2', model: 'EX4300-48P', os: '20.4R3', sn: 'SW-PRO-CHR-4545', oem: 'JUNIPER', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 7104 },
    { st: 'ok', name: 'KA-BGLK-277-T-CHR-09', ip: '172.31.31.205', model: 'C9400-LC-48T', os: '17.9.4', sn: 'CHRSW-909090', oem: 'CISCO', loc: 'BGLK-277', s: 'd', stock: 'deployed', v: 6 },
    {
      st: 'none', name: 'BGLK-EX2200-OLD-03', ip: '172.31.31.44', model: 'EX2200-24T', os: '15.1R7', sn: 'CHR-SN-441122', oem: 'JUNIPER', loc: 'BGLK-277', s: 'm', stock: 'decomm', v: null,
      dOn: '19-Mar-2026', dWhy: 'Site consolidation', dBy: 'Harish Kumar', dWo: 'WO-3021', zombie: false
    }
  ],
  server: [
    { st: 'none', name: 'BGLK-CDC-SRV-01', ip: '172.31.70.11', model: 'DL380 Gen11', os: 'RHEL 9.4', sn: 'SGH2041XYZ', oem: 'HPE', loc: 'BGLK-277', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'BGLK-CDC-SRV-02', ip: '172.31.70.14', model: 'DL380 Gen11', os: 'RHEL 9.4', sn: 'SGH2041XZA', oem: 'HPE', loc: 'BGLK-277', s: 'm', stock: 'deployed', v: null },
    { st: 'none', name: 'DEL-EDC-SRV-07', ip: '172.31.71.07', model: 'PowerEdge R760', os: 'RHEL 9.2', sn: 'DPE7601144', oem: 'DELL', loc: 'DEL-279', s: 'm', stock: 'deployed', v: null }
  ],
  dwdm: [
    { st: 'ok', name: 'WR-ADVA-FSP3000-01', ip: '172.31.75.144', model: 'FSP 3000', os: 'ONMSi 21.1', sn: 'ADV3000-8841', oem: 'ADVA', loc: 'MUM-011', s: 'm', stock: 'deployed', v: null },
    { st: 'ok', name: 'WR-ADVA-FSP3000-02', ip: '172.31.75.145', model: 'FSP 3000', os: 'ONMSi 21.1', sn: 'ADV3000-8842', oem: 'ADVA', loc: 'PUN-014', s: 'm', stock: 'deployed', v: null },
    { st: 'ok', name: 'HYD-CIENA-6500-01', ip: '172.31.93.12', model: '6500-T12', os: 'SAOS 10.9', sn: 'CIE6500-2214', oem: 'CIENA', loc: 'HYD-093', s: 'm', stock: 'deployed', v: null }
  ],
  enodeb: [
    { st: 'ok', name: 'PUN-HNJW-C3-ENB-014', ip: '10.44.18.14', model: 'AirScale', os: '21B', sn: 'NOK-ENB-014', oem: 'NOKIA', loc: 'PUN-014', s: 'e', stock: 'deployed', v: null },
    { st: 'ok', name: 'INDR-AREA-001-ENB-07', ip: '10.44.19.7', model: 'AirScale', os: '21B', sn: 'NOK-ENB-007', oem: 'NOKIA', loc: 'INDR-275', s: 'e', stock: 'deployed', v: null }
  ],
  gnodeb: [
    { st: 'ok', name: 'BLR-SOUTH-GNB-021', ip: '10.51.22.21', model: 'AirScale 5G', os: '23A', sn: 'NOK-GNB-021', oem: 'NOKIA', loc: 'BGLK-277', s: 'e', stock: 'deployed', v: null },
    { st: 'ok', name: 'BLR-GNB-T3800-014', ip: '172.31.70.12', model: 'AirScale gNB', os: '23B', sn: 'NOK-GNB-3800', oem: 'NOKIA', loc: 'BGLK-277', s: 'e', stock: 'deployed', v: null },
    { st: 'ok', name: 'DEL-CENTRAL-GNB-009', ip: '10.51.23.9', model: 'AirScale 5G', os: '23A', sn: 'NOK-GNB-009', oem: 'NOKIA', loc: 'DEL-279', s: 'e', stock: 'deployed', v: null }
  ]
};

/* Ten rows minimum per class, spread across the active stock states, so a
   class tab or a stock chip never lands on a two-row list. Counts still come
   from PHY_MATRIX — these rows are the sample, not the population. */
const PHY_LOC = ['BGLK-277', 'DEL-279', 'INDR-275', 'VJA-118', 'CHE-118', 'MAS-041', 'PUN-162', 'HYD-093', 'KOL-204', 'AHM-131'];
const PHY_ST = ['ok', 'ok', 'drift', 'ok', 'stale', 'ok', 'drift', 'ok', 'none', 'ok'];
const PHY_STK = ['deployed', 'deployed', 'deployed', 'instore', 'deployed', 'planned', 'deployed', 'faulty', 'planned', 'deployed'];
const LEGACY_CLASS_ROLES = {
  router: ['P', 'PE', 'AGG', 'ACC', 'ER'],
  switch: ['SW', 'ACC-SW', 'AGG-SW', 'CORE-SW', 'DIST'],
  server: ['SRV', 'NFV', 'K8S', 'HOST', 'COMPUTE'],
  dwdm: ['ROADM', 'DWDM', 'OTN', 'MUX', 'AMP'],
  enodeb: ['ENB', '4G-CELL', 'LTE', 'BBU', 'NODE'],
  gnodeb: ['GNB', '5G-NR', 'gNodeB', 'AAU', 'DU']
};
const legacyUsedIps = new Set();
Object.keys(PHY).forEach(c => PHY[c].forEach(s => legacyUsedIps.add(s.ip)));
function legacyNextIp(c, idx, isPlanned) {
  let offset = idx;
  while (true) {
    let candidate = '';
    if (isPlanned) {
      const subnets = { router: 11, switch: 12, server: 13, dwdm: 14, enodeb: 15, gnodeb: 16 };
      const sub = subnets[c] || 11;
      const o3 = Math.floor(offset / 240);
      const o4 = 10 + (offset % 240);
      candidate = '192.168.' + (sub + o3) + '.' + o4;
    } else {
      if (c === 'enodeb') {
        candidate = '10.44.' + (30 + Math.floor(offset / 240)) + '.' + (10 + (offset % 240));
      } else if (c === 'gnodeb') {
        candidate = '10.51.' + (30 + Math.floor(offset / 240)) + '.' + (10 + (offset % 240));
      } else if (c === 'server') {
        candidate = '10.10.' + (10 + Math.floor(offset / 240)) + '.' + (10 + (offset % 240));
      } else if (c === 'dwdm') {
        candidate = '172.31.' + (160 + Math.floor(offset / 240)) + '.' + (10 + (offset % 240));
      } else if (c === 'switch') {
        candidate = '172.31.' + (120 + Math.floor(offset / 240)) + '.' + (10 + (offset % 240));
      } else {
        candidate = '172.31.' + (100 + Math.floor(offset / 240)) + '.' + (10 + (offset % 240));
      }
    }
    if (!legacyUsedIps.has(candidate)) {
      legacyUsedIps.add(candidate);
      return candidate;
    }
    offset++;
  }
}
Object.keys(PHY).forEach(cls => {
  const live = PHY[cls].filter(r => r.stock !== 'decomm');
  const arch = PHY[cls].filter(r => r.stock === 'decomm');
  const out = live.slice();
  const roles = LEGACY_CLASS_ROLES[cls] || ['NODE'];
  for (let i = 0; out.length < 12; i++) {
    const base = live[i % live.length], k = out.length;
    const stock = PHY_STK[k % PHY_STK.length];
    const planned = stock === 'planned';
    out.push({
      ...base,
      st: planned ? 'none' : PHY_ST[k % PHY_ST.length],
      name: `${PHY_LOC[k % PHY_LOC.length].split('-')[0]}-${base.model.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase()}-${roles[k % roles.length]}-${String(20 + k)}`,
      ip: legacyNextIp(cls, k, planned),
      sn: base.sn.replace(/[0-9]{3}$/, String(200 + k * 7)) + String.fromCharCode(65 + k % 26),
      loc: PHY_LOC[k % PHY_LOC.length],
      stock,
      v: planned ? null : [3, 6, 11, 640][k % 4]
    });
  }
  PHY[cls] = out.concat(arch);
});


const VNF_TYPES = [
  { n: 'vDU', c: 9, planned: 4, prog: 0, ready: 4, failed: 1, tone: 'sky' },
  { n: 'CU-CP', c: 10, planned: 1, prog: 0, ready: 9, failed: 0, tone: 'purple' },
  { n: 'CU-UP', c: 4, planned: 0, prog: 1, ready: 3, failed: 0, tone: 'cyan' },
  { n: 'Others', c: 5, planned: 0, prog: 0, ready: 4, failed: 1, tone: 'amber' }
];
const VNFS = [
  // vDU (9)
  { st: 'Ready', chip: 'success', nf: 'NTSON3435004', type: 'vDU', svc: 'NTSAB1400413', sub: 'KA-BGLK-277-CL-04', tech: '5G', host: 'blr-cl-04-w02', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'NetroundsTA1001', type: 'vDU', svc: 'NTSAB1400413', sub: 'CDC-SUB-1002', tech: '4G+5G', host: 'blr-cl-02-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'OTSLB1002750013', type: 'vDU', svc: 'NTSAB1400431', sub: 'INDR-275-SE-13-CL', tech: '5G', host: 'indr-se13-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'NTSON3435061', type: 'vDU', svc: 'NTSAB1400602', sub: 'HYD-093-SE-11-CL', tech: '5G', host: 'hyd-se11-w03', s: 'e' },
  { st: 'Planned', chip: 'info', nf: 'NTSON3435040', type: 'vDU', svc: 'NTSAB1400566', sub: 'DEL-279-SE-40-CL', tech: '5G', host: '—', s: 'p' },
  { st: 'Planned', chip: 'info', nf: 'NTSON3435090', type: 'vDU', svc: 'NTSAB1400711', sub: 'JAI-058-SE-04-CL', tech: '5G', host: '—', s: 'p' },
  { st: 'Planned', chip: 'info', nf: 'NTSON3435091', type: 'vDU', svc: 'NTSAB1400712', sub: 'LKO-217-SE-02-CL', tech: '5G', host: '—', s: 'p' },
  { st: 'Planned', chip: 'info', nf: 'NTSON3435092', type: 'vDU', svc: 'NTSAB1400713', sub: 'AHM-131-SE-05-CL', tech: '5G', host: '—', s: 'p' },
  { st: 'Failed', chip: 'error', nf: 'NTSON3435037', type: 'vDU', svc: 'NTSAB1400566', sub: 'DEL-279-SE-37-CL', tech: '5G', host: 'del-se37-w02', s: 'e' },

  // CU-CP (10)
  { st: 'Ready', chip: 'success', nf: 'NTSLB400130', type: 'CU-CP', svc: 'NTSLB400130', sub: 'NTSLB400130', tech: '5G', host: 'del-cl-01-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-BGLK-0101', type: 'CU-CP', svc: 'NTSLB400131', sub: 'KA-BGLK-277-CL-01', tech: '5G', host: 'blr-cl-01-w02', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-DEL-0202', type: 'CU-CP', svc: 'NTSLB400132', sub: 'DEL-279-CL-02', tech: '5G', host: 'del-cl-02-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-MAS-0303', type: 'CU-CP', svc: 'NTSLB400133', sub: 'MAS-041-CL-01', tech: '5G', host: 'mas-cl-01-w03', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-CHE-0404', type: 'CU-CP', svc: 'NTSLB400134', sub: 'CHE-118-CL-03', tech: '5G', host: 'che-cl-03-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-PUN-0505', type: 'CU-CP', svc: 'NTSLB400135', sub: 'PUN-162-CL-01', tech: '5G', host: 'pun-cl-01-w02', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-HYD-0606', type: 'CU-CP', svc: 'NTSLB400136', sub: 'HYD-093-CL-02', tech: '5G', host: 'hyd-cl-02-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-KOL-0707', type: 'CU-CP', svc: 'NTSLB400137', sub: 'KOL-204-CL-01', tech: '5G', host: 'kol-cl-01-w04', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUCP-INDR-0808', type: 'CU-CP', svc: 'NTSLB400138', sub: 'INDR-275-CL-02', tech: '5G', host: 'indr-cl-02-w02', s: 'e' },
  { st: 'Planned', chip: 'info', nf: 'NTSON3435048', type: 'CU-CP', svc: 'NTSAB1400602', sub: 'CHE-118-CL-02', tech: '5G', host: '—', s: 'p' },

  // CU-UP (4)
  { st: 'Ready', chip: 'success', nf: 'NTSON3435052', type: 'CU-UP', svc: 'NTSAB1400602', sub: 'PUN-162-CL-02', tech: '5G', host: 'pun-cl-02-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUUP-DEL-0102', type: 'CU-UP', svc: 'NTSAB1400603', sub: 'DEL-279-CL-01', tech: '5G', host: 'del-cl-01-w03', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'CUUP-MAS-0203', type: 'CU-UP', svc: 'NTSAB1400604', sub: 'MAS-041-CL-02', tech: '5G', host: 'mas-cl-02-w02', s: 'e' },
  { st: 'In progress', chip: 'warning', nf: 'NTSON3435044', type: 'CU-UP', svc: 'NTSAB1400602', sub: 'MAS-041-CL-03', tech: '5G', host: 'mas-cl-03-w01', s: 'e' },

  // Others (5)
  { st: 'Ready', chip: 'success', nf: 'F5 Firewall', type: 'Others', svc: 'NTSAB1400413', sub: 'CDC-SUB-1001', tech: '—', host: 'blr-cl-01-w03', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'vEPC-CORE-0114', type: 'Others', svc: 'NTSAB1400118', sub: 'CDC-SUB-1003', tech: '4G', host: 'kol-cl-03-w02', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'vDNS-SERVER-02', type: 'Others', svc: 'NTSAB1400119', sub: 'DEL-CDC-01', tech: '—', host: 'del-cdc-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'vAAA-RADIUS-04', type: 'Others', svc: 'NTSAB1400120', sub: 'MAS-CDC-02', tech: '—', host: 'mas-cdc-w02', s: 'e' },
  { st: 'Failed', chip: 'error', nf: 'NTSON3435050', type: 'Others', svc: 'NTSAB1400711', sub: 'VJA-118-CL-01', tech: '—', host: 'vja-cl-01-w02', s: 'e' }
];

/* ── VNF lifecycle (Day 0 / Grow / Events / GPL) ──────────
   One representative RAN ZTP workflow — the stage/step shape a lifecycle
   operation actually has — reused for whichever NF the reader opens; the
   NF name is substituted into each stage's title. */
const LC_STATUS = {
  notstarted: ['Not started', 'amber', '…'],
  pending: ['Pending', 'slate', '–'],
  progress: ['In progress', 'sky', '▶'],
  done: ['Completed', 'emerald', '✓'],
  failed: ['Failed', 'red', '✕'],
  skipped: ['Skipped', 'purple', '»']
};
/* step status is NOT baked in here — it depends on the NF's own status
   (Ready/Failed/Planned), computed by vnfLifecycleStages() at render time.
   Every stage's start/end and every step's "Modified date" used to be the
   same one hardcoded literal ('02-Aug-26 09:05:30 PM') copy-pasted
   everywhere — offset from "now" instead, 12-hour clock to match this
   screen's own display convention. Stages used to be pushed days/months
   apart (each stage's own huge, independent minsAgo), which scattered the
   timeline across unrelated calendar dates — one continuous run should
   stay on one date. Now every step across every stage ticks forward from
   a single shared timeline, 5 minutes after the previous one (Day 0's
   first step is the oldest, GPL's last step the most recent), so only the
   time of day advances and the whole lifecycle reads as the same date. */
const agoStamp12 = minsAgo => {
  const d = new Date(Date.now() - minsAgo * 60000);
  const h = d.getHours();
  return `${pad2(d.getDate())}-${MONTHS_SHORT[d.getMonth()]}-${d.getFullYear()} ${pad2(h % 12 || 12)}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${h >= 12 ? 'PM' : 'AM'}`;
};
const VNF_LC_STEP_NAMES = [
  ['Verify subcloud', 'Generate vDU values.yaml', 'Push adpf-pre-values.yaml',
    'Push adpf-values.yaml', 'Deploy CNF', 'Check deployment status'],
  ['Scale vDU replicas', 'Verify capacity'],
  ['Collect fault events', 'Acknowledge events'],
  ['Generate golden package list', 'Publish GPL']
];
const VNF_LC_STEP_GAP_MIN = 5;
const VNF_LC_TOTAL_STEPS = VNF_LC_STEP_NAMES.reduce((n, s) => n + s.length, 0);
let vnfLcStepIdx = 0;
const VNF_LC_STAGES = [['day0', 'Day 0'], ['grow', 'Grow'], ['events', 'Events'], ['gpl', 'GPL']]
  .map(([k, n], si) => {
    const steps = VNF_LC_STEP_NAMES[si].map(name => {
      const at = agoStamp12(VNF_LC_STEP_GAP_MIN * (VNF_LC_TOTAL_STEPS - vnfLcStepIdx));
      vnfLcStepIdx++;
      return { n: name, at };
    });
    return { k, n, start: steps[0].at, end: steps[steps.length - 1].at, steps };
  });

const LINK_TABS = [
  { k: 'lldp', n: 'LLDP', c: 5549 }, { k: 'ospf', n: 'OSPF', c: 1382 },
  { k: 'bgp', n: 'BGP', c: 604 }, { k: 'isis', n: 'ISIS', c: 311 }
];
/* every link — whichever protocol reported it — names both ends the same
   way: a real NE hostname (sne/dne) and that NE's own IP (sip/dip). OSPF,
   BGP and ISIS used to leave dne holding the peer's IP with no hostname at
   all; that's fixed below by naming the peer NE and moving its IP to dip. */
const LINKS = {
  lldp: [
    {
      st: 'up', sip: '172.31.47.96', sne: 'OFB-HQ-J7020-PE-T3-ER', sif: 'et-0/0/5',
      dne: 'HWH_NKG-J960-PE-R1-T1-ER', sAlias: 'BB:T4:10G:HWH_NKG-J960(1)', dif: 'xe-7/2/0',
      name: 'BB:T4:10G:HWH_NKG-J960', dip: '172.31.31.56', linkId: 'LLDP:140499201790', v: 3
    },
    {
      st: 'up', sip: '172.31.31.56', sne: 'HWH_NKG-J960-PE-R1-T1-ER', sif: 'xe-7/2/0',
      dne: 'OFB-HQ-J7020-PE-T3-ER', sAlias: 'BB:T4:10G:HWH_NKG-J960(2)', dif: 'et-0/0/5',
      name: 'BB:T4:10G:HWH_NKG-J960', dip: '172.31.47.96', linkId: 'LLDP:140499201790', v: 3
    },
    {
      st: 'up', sip: '172.31.41.42', sne: 'NCR-DIV-AGC-J1.1K-R2-T4', sif: 'ge-0/1/0',
      dne: 'AGC-N540-T1-NR', sAlias: 'BB:Railnet Upgradation-1G', dif: 'GigabitEthernet0/0/0/15',
      name: 'BB:T4:1G:AGC-C540-NR', dip: '172.31.46.243', linkId: 'LLDP:11251788244003', v: 5
    },
    {
      st: 'up', sip: '172.31.49.104', sne: 'VM-J7024-PE-T3-SR', sif: 'et-0/0/1:1',
      dne: 'CGL-N540-T3-SR', sAlias: 'BB:Bundle link for ae2(1)', dif: 'Bundle-Ether2',
      name: 'BB:T3:40G:CGL-C540-SR', dip: '172.31.47.198', linkId: 'LLDP:167448839210', v: 3
    },
    {
      st: 'up', sip: '172.31.53.174', sne: 'JU-J7024-PE-T4-NR', sif: 'et-0/0/18',
      dne: 'MJ-NCS-540-PE-T3-NR', sAlias: 'BB:Bundle link for ae2(2)', dif: 'Bundle-Ether1',
      name: 'BB:T3:20G:MJ-C540-NR', dip: '172.31.32.221', linkId: 'LLDP:198273645012', v: 4
    },
    {
      st: 'up', sip: '172.31.33.47', sne: 'ROK-BNG-J204-PE-T3-NR', sif: 'xe-0/1/4',
      dne: 'JHL-N540-T3-NR', sAlias: 'BB: ROK Tejas DWDM(1)', dif: 'TenGigE0/0/0/1',
      name: 'BB: ROK Tejas DWDM 10G', dip: '172.31.47.202', linkId: 'LLDP:892019485710', v: 3
    },
    {
      st: 'up', sip: '172.31.41.154', sne: 'NCR-HQ-ALD-J2.2K-R2-T4', sif: 'xe-0/3/1',
      dne: 'NCR-HQ-PRYJ-J2.2K-R1-T4', sAlias: 'BB:Railnet Upgradation-10G', dif: 'xe-0/3/0',
      name: 'BB:Railnet Upgradation', dip: '172.31.41.155', linkId: 'LLDP:918237465019', v: 3
    },
    {
      st: 'up', sip: '172.31.41.154', sne: 'NCR-HQ-ALD-J2.2K-R2-T4', sif: 'xe-0/3/0',
      dne: 'ALD-J104-P-T3-NR', sAlias: 'BB:NCR-HQ-ALD-ACX(1)', dif: 'xe-2/0/0',
      name: 'BB:ALD-J104 10G', dip: '172.31.34.88', linkId: 'LLDP:928374650192', v: 3
    },
    {
      st: 'up', sip: '172.31.42.100', sne: 'NDLS-J960-P_R1-T1-NR', sif: 'Gi0/0/1',
      dne: 'PSA-C920-WIFI1-T4-ER', sAlias: 'BB:NDLS-PSA-WIFI', dif: 'Gi0/0/1',
      name: 'BB:NDLS-PSA 1G', dip: '172.31.42.101', linkId: 'LLDP:140499201880', v: 3
    },
    {
      st: 'up', sip: '172.31.42.100', sne: 'NDLS-J960-P_R1-T1-NR', sif: 'Te0/0/12',
      dne: 'PSA-C920-WIFI1-T4-ER', sAlias: 'BB:NDLS-PSA-10G-Trunk', dif: 'Te0/0/12.SI.612',
      name: 'BB:NDLS-PSA 10G', dip: '172.31.42.102', linkId: 'LLDP:140499201881', v: 3
    },
    {
      st: 'up', sip: '172.31.35.151', sne: 'Kalindi-J1.1K-DU-T4-NR', sif: 'ge-0/1/1',
      dne: 'Janki-J1.1K-DU-T4-NR', sAlias: 'BB:Kalindi-Janki-Access', dif: 'ge-0/1/0',
      name: 'BB:to Kalindi', dip: '172.31.35.152', linkId: 'LLDP:11251788299101', v: 5
    },
    {
      st: 'down', sip: '172.31.35.81', sne: 'SBI_JANAKPURI-J2.2K-PE-T4', sif: 'xe-0/3/1',
      dne: 'CCRAS-JANAKPURI-N540X', sAlias: 'BB:Janakpuri-Interconnect', dif: 'TenGigE0/0/0/18',
      name: 'BB:Janakpuri-CCRAS 10G', dip: '172.31.35.82', linkId: 'LLDP:167448839955', v: 168,
      reason: 'Physical layer down — no light detected on optic, since 6d ago'
    }
  ],
  ospf: [
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/5.90',
      sOspfIp: '172.31.234.250', sIfIndex: 972, sSpeed: '1 Gbps', sAlias: 'BB:NDLS-RPF_Panchkuiya',
      dip: '172.31.46.156', dne: 'RPF_PANCHKUIYA-J1.1K-PE-T4', dif: 'ge-0/1/2.90',
      dOspfIp: '172.31.234.251', dSpeed: '1 Gbps', linkId: 'OSPF:85321538511', areaId: '0.0.6.153',
      name: 'BB:NDLS-RPF 1G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/4.0',
      sOspfIp: '172.31.237.28', sIfIndex: 49940, sSpeed: '10 Gbps', sAlias: 'BB:T4:10G:NDLS-J204-NR(1)',
      dip: '172.31.53.150', dne: 'DSC-IP-Estate-N540X-PE-T3', dif: 'TenGigE0/0/0/20',
      dOspfIp: '172.31.237.29', dSpeed: '10 Gbps', linkId: 'OSPF:167246339259', areaId: '0.0.6.53',
      name: 'BB:NDLS-DSC 10G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/5.99',
      sOspfIp: '172.31.241.244', sIfIndex: 763, sSpeed: '10 Gbps', sAlias: 'BB:T3:10G:NDLS-J204-NR(2)',
      dip: '172.31.53.8', dne: 'GGN-N540-T3-NR', dif: 'TenGigE0/0/0/1',
      dOspfIp: '172.31.241.245', dSpeed: '10 Gbps', linkId: 'OSPF:90913048666', areaId: '0.0.0.0',
      name: 'BB:NDLS-GGN 10G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/3.699',
      sOspfIp: '172.31.128.239', sIfIndex: 944, sSpeed: '10 Gbps', sAlias: 'BB:T3:10G:NDLS-J204-NR(3)',
      dip: '172.31.53.122', dne: 'OLD-DLI-N540L-PE-T3-NR', dif: 'TenGigE0/0/0/11.699',
      dOspfIp: '172.31.128.238', dSpeed: '10 Gbps', linkId: 'OSPF:89726377572', areaId: '0.0.0.0',
      name: 'BB:NDLS-OLDDLI 10G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/7.174',
      sOspfIp: '172.31.70.235', sIfIndex: 884, sSpeed: '10 Gbps', sAlias: 'BB:T4:10G:NDLS-J204-NR(4)',
      dip: '172.31.35.15', dne: 'Satyawati-J1.1K-DU-T4-NR', dif: 'ge-0/1/1.0',
      dOspfIp: '172.31.70.234', dSpeed: '10 Gbps', linkId: 'OSPF:86971776684', areaId: '0.0.6.92',
      name: 'BB:NDLS-SATYA 10G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/7.173',
      sOspfIp: '172.31.70.232', sIfIndex: 883, sSpeed: '1 Gbps', sAlias: 'BB:T4:1G:NDLS-J204-NR(3)',
      dip: '172.31.35.25', dne: 'LAXMI_BAI-J1.1K-DU-T4-NR', dif: 'ge-0/1/1.0',
      dOspfIp: '172.31.70.233', dSpeed: '1 Gbps', linkId: 'OSPF:121767499126', areaId: '0.0.6.92',
      name: 'BB:NDLS-LAXMI 1G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/5.299',
      sOspfIp: '172.31.191.178', sIfIndex: 774, sSpeed: '1 Gbps', sAlias: 'BB:T4:1G:NDLS-J204-NR(2)',
      dip: '172.31.46.121', dne: 'RLDA-J2.2K-T4-NR', dif: 'ge-0/1/0.0',
      dOspfIp: '172.31.191.179', dSpeed: '1 Gbps', linkId: 'OSPF:85320848662', areaId: '0.0.4.106',
      name: 'BB:NDLS-RLDA 1G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'ae8.0',
      sOspfIp: '172.31.191.171', sIfIndex: 624, sSpeed: '20 Gbps', sAlias: 'BB:LC:20G:NDLS-J204-NR',
      dip: '172.31.31.2', dne: 'NDLS-J960-P_R1-T1-NR', dif: 'ae8.0',
      dOspfIp: '172.31.191.170', dSpeed: '20 Gbps', linkId: 'OSPF:86968573685', areaId: '0.0.0.0',
      name: 'BB:NDLS-LAG 20G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/7.988',
      sOspfIp: '172.31.138.161', sIfIndex: 908, sSpeed: '1 Gbps', sAlias: 'BB:T4:1G:NDLS-J204-NR(1)',
      dip: '172.31.46.143', dne: 'OFMR-J2.2K-PE-T4-NR', dif: 'ge-0/2/1.0',
      dOspfIp: '172.31.138.160', dSpeed: '1 Gbps', linkId: 'OSPF:86632353703', areaId: '0.0.4.51',
      name: 'BB:NDLS-OFMR 1G', v: 3
    },
    {
      st: 'up', sip: '172.31.31.209', sne: 'NDLS-J204-T3-NR', sif: 'xe-0/1/0.99',
      sOspfIp: '172.31.245.118', sIfIndex: 1629, sSpeed: '10 Gbps', sAlias: 'BB:T4:10G:NDLS-J204-NR(5)',
      dip: '172.31.53.250', dne: 'BGLK-ASR9010-PE-T1', dif: 'TenGigE0/0/0/4',
      dOspfIp: '172.31.245.119', dSpeed: '10 Gbps', linkId: 'OSPF:86632490114', areaId: '0.0.0.0',
      name: 'BB:NDLS-BGLK 10G', v: 3
    },
    {
      st: 'up', sip: '172.31.42.100', sne: 'NDLS-J960-P_R1-T1-NR', sif: 'xe-0/2/1.10',
      sOspfIp: '172.31.140.210', sIfIndex: 1042, sSpeed: '10 Gbps', sAlias: 'BB:T1:10G:NDLS-VZG',
      dip: '172.31.53.186', dne: 'VZG-N540X-PE-T4-NR', dif: 'TenGigE0/1/0/1',
      dOspfIp: '172.31.140.211', dSpeed: '10 Gbps', linkId: 'OSPF:87102451001', areaId: '0.0.0.0',
      name: 'BB:NDLS-VZG 10G', v: 3
    },
    {
      st: 'down', sip: '172.31.33.130', sne: 'MAS-N7750-BNG-R-T1-SR', sif: 'xe-1/1/2.0',
      sOspfIp: '172.31.142.15', sIfIndex: 1108, sSpeed: '10 Gbps', sAlias: 'BB:T1:10G:MAS-CHE',
      dip: '172.31.61.140', dne: 'CHE-J2.2K-PE-T4-ER', dif: 'ge-0/1/1.0',
      dOspfIp: '172.31.142.16', dSpeed: '10 Gbps', linkId: 'OSPF:87102451009', areaId: '0.0.0.1',
      name: 'BB:MAS-CHE 10G', v: 6264,
      reason: 'Neighbor adjacency lost — dead timer expired, since 9h ago'
    }
  ],
  bgp: [
    { st: 'established', sne: 'NDLS-J960-P_R1-T1-NR', sip: '172.31.42.100', sif: 'AS 24186', dne: 'BGLK-ASR9010-PE-T1', dip: '172.31.53.252', dif: 'established(6)', name: 'iBGP RR', v: 3 },
    { st: 'established', sne: 'NDLS-J960-P_R1-T1-NR', sip: '172.31.42.100', sif: 'AS 24186', dne: 'BGLK-NCS540-PE-T3', dip: '172.31.53.249', dif: 'established(6)', name: 'iBGP RR', v: 3 }
  ],
  isis: [
    { st: 'up', sne: 'VZG-N540X-PE-T4-NR', sip: '172.31.53.186', sif: 'L2', dne: 'VZG-N540X-PE-T4-SR', dip: '172.31.53.187', dif: 'up', name: 'ISIS L2', v: 10 }
  ]
};

const SVC_TABS = [{ k: 'l3vpn', n: 'L3VPN', c: 1815 }, { k: 'l2vpn', n: 'L2VPN', c: 642 }];
/* Services used to be IP/MPLS-only (L3VPN/L2VPN). These round it out to
   the same domain vocabulary the app already uses elsewhere (Discovery's
   own Domain filter — see FS.targets/FS.jobs: RAN, Core, Transport,
   IP/MPLS) so "domain" means the same thing on every screen. L3VPN/L2VPN
   themselves are untouched — they just become the IP/MPLS domain's own
   two tabs instead of the page's only two tabs. */
const RAN_SVC_TABS = [{ k: 's1ng', n: 'S1/NG', c: 412 }, { k: 'x2xn', n: 'X2/Xn', c: 268 }];
const TRANSPORT_SVC_TABS = [{ k: 'wave', n: 'Wavelength', c: 186 }, { k: 'otn', n: 'OTN', c: 94 }, { k: 'trunk', n: 'Trunk', c: 112 }];
const CORE_SVC_TABS = [{ k: 'apn', n: 'APN', c: 38 }, { k: 'nif', n: 'N-Interface', c: 126 }];
const SVC_DOMAINS = [
  { k: 'ran', n: 'RAN', tone: 'purple', tabs: RAN_SVC_TABS },
  { k: 'transport', n: 'Transport', tone: 'amber', tabs: TRANSPORT_SVC_TABS },
  { k: 'core', n: 'Core', tone: 'emerald', tabs: CORE_SVC_TABS },
  { k: 'ipmpls', n: 'IP/MPLS', tone: 'sky', tabs: SVC_TABS }
];
const SVC_TABS_BY_DOMAIN = Object.fromEntries(SVC_DOMAINS.map(d => [d.k, d.tabs]));
const domainForSvcTab = k => (SVC_DOMAINS.find(d => d.tabs.some(x => x.k === k)) || {}).k || 'ipmpls';
/* column labels for the seven new (non-IP/MPLS) service types — every
   one of them shares L2VPN's own point-to-point shape (src/dst NE, IP,
   interface), so one generic table (svcP2PTable, app-views.js) renders
   all seven; only the labels change per type. */
const SVC_P2P_COLS = {
  s1ng: { title: 'S1/NG interface', name: 'Interface', ref: 'Bearer ID' },
  x2xn: { title: 'X2/Xn link', name: 'Link name', ref: 'Interface ID' },
  wave: { title: 'Wavelength', name: 'Circuit name', ref: 'Wavelength (nm)' },
  otn: { title: 'OTN circuit', name: 'Circuit name', ref: 'Circuit ID' },
  trunk: { title: 'Transport trunk', name: 'Trunk name', ref: 'Circuit ID' },
  apn: { title: 'APN', name: 'APN name', ref: 'APN ID' },
  nif: { title: 'N-Interface', name: 'Interface', ref: 'Session ID' }
};
const SERVICES = {
  l3vpn: [
    { st: 'Up', chip: 'success', name: 'CGDA', ip: '172.31.53.252', rd: '24186:1015707', rt: '24186:900287, 24186:888970', erp: '1097', ifc: 'FortyGigE0/0/0/28.100', ne: 'BGLK-ASR9010-PE-T1', v: 3 },
    { st: 'Down', chip: 'error', name: 'E-24678', ip: '172.31.53.252', rd: '24186:1001487', rt: '24186:899142, 24186:899138', erp: '1098', ifc: 'FortyGigE0/0/0/28.17', ne: 'BGLK-ASR9010-PE-T1', v: 3 },
    { st: 'Down', chip: 'error', name: 'VSS-RB-Connectivity', ip: '172.31.53.252', rd: '24186:1019673', rt: '24186:900172, 24186:900174', erp: '1099', ifc: 'TenGigE0/0/0/2.200', ne: 'BGLK-ASR9010-PE-T1', v: 3 },
    { st: 'Up', chip: 'success', name: 'NE-CAMERA', ip: '172.31.53.249', rd: '24186:1016097', rt: '24186:900476, 24186:900478', erp: '1101', ifc: 'GigabitEthernet0/0/0/10.3177', ne: 'BGLK-NCS540-PE-T3', v: 3 },
    { st: 'Up', chip: 'success', name: 'SAFE-CITY-SW-MGMT', ip: '172.31.53.249', rd: '24186:1016096', rt: '24186:900477, 24186:900479', erp: '1102', ifc: 'GigabitEthernet0/0/0/10.10', ne: 'BGLK-NCS540-PE-T3', v: 3 },
    { st: 'Up', chip: 'success', name: 'SC-DU', ip: '172.31.53.24', rd: '24186:1016064', rt: '24186:901', erp: '1105', ifc: 'BD6', ne: 'BGLK-MX204-AGG-02', v: 10 }
  ],
  l2vpn: [
    { st: 'Up', chip: 'success', name: 'VPWS-BGLK-INDR-01', ip: '172.31.31.189', rd: '24186:2001144', rt: '24186:700114', erp: '2041', ifc: 'xe-0/0/2.100', ne: 'INDR-ASR920-PE-T3', dstIp: '172.31.31.17', dstNe: 'BGLK-NCS540-PE-T3', dstIfc: 'ge-0/0/1.100', v: 3 },
    { st: 'Up', chip: 'success', name: 'VPLS-SAFE-CITY', ip: '172.31.53.249', rd: '24186:2001188', rt: '24186:700118', erp: '2042', ifc: 'ge-0/0/5.0', ne: 'BGLK-NCS540-PE-T3', dstIp: '172.31.53.17', dstNe: 'BGLK-ASR9010-PE-T1', dstIfc: 'TenGigE0/0/0/2.200', v: 3 },
    { st: 'Down', chip: 'error', name: 'VPWS-CHE-MAS-04', ip: '172.31.61.140', rd: '24186:2001202', rt: '24186:700120', erp: '2043', ifc: 'xe-0/3/0.200', ne: 'CHE-J2.2K-PE-T4-ER', dstIp: '172.31.61.17', dstNe: 'CHE-J2.2K-PE-T4-WR', dstIfc: 'xe-0/1/0.200', v: 30 }
  ]
};

/* ── sample depth ──────────────────────────────────────────
   A grid showing five rows of a 5,549-row population reads as
   "this is all there is". Every list below is grown to at least
   ten rows from its own hand-written seeds, so the sample looks
   like a sample. Totals still come from the ledger, never from
   the length of these arrays. */
const PAD_NE = ['NDLS-J960-P_R1-T1-NR', 'VZG-N540X-PE-T4-NR', 'CHE-J2.2K-PE-T4-ER', 'ET-J960-P-T1-WR',
  'MAS-N7750-BNG-R-T1-SR', 'BGLK-C9300-ACC-11', 'INDR-ASR920-PE-T3', 'PUN-MX204-AGG-07',
  'HYD-NCS540-PE-T4', 'KOL-J960-P-R2-T1', 'AHM-ASR920-ER-05', 'JAI-MX204-PE-T2'];
const PAD_IF = ['ge-0/0/3', 'xe-0/1/2', 'Te0/0/8', 'Gi0/0/4', 'TenGigE0/0/0/6', 'ge-0/2/1', 'xe-0/3/3', 'Te0/1/12'];
const PAD_IP = i => `172.31.${40 + (i * 3) % 40}.${11 + (i * 17) % 240}`;
const padList = (rows, target, tweak) => {
  const out = rows.slice();
  for (let i = 0; out.length < target; i++) out.push(tweak({ ...rows[i % rows.length] }, out.length, i));
  return out;
};

const VNF_PAD = [
  { st: 'Ready', chip: 'success', nf: 'NTSON3435052', type: 'CU-UP', svc: 'NTSAB1400602', sub: 'PUN-162-CL-02', tech: '5G', host: 'pun-cl-02-w01', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'NTSON3435061', type: 'vDU', svc: 'NTSAB1400602', sub: 'HYD-093-SE-11-CL', tech: '5G', host: 'hyd-se11-w03', s: 'e' },
  { st: 'Ready', chip: 'success', nf: 'vEPC-CORE-0114', type: 'Others', svc: 'NTSAB1400118', sub: 'CDC-SUB-1003', tech: '4G', host: 'kol-cl-03-w02', s: 'e' },
  { st: 'Failed', chip: 'error', nf: 'NTSON3435077', type: 'CU-CP', svc: 'NTSAB1400566', sub: 'AHM-131-CL-01', tech: '5G', host: 'ahm-cl-01-w01', s: 'e' },
  { st: 'Planned', chip: 'info', nf: 'NTSON3435090', type: 'vDU', svc: 'NTSAB1400711', sub: 'JAI-058-SE-04-CL', tech: '5G', host: '—', s: 'p' }
];
VNFS.push(...VNF_PAD);

/* Node linking's dialog shows *why* a down/non-established link is down —
   only ever set when the row's own st isn't a healthy one, so an Up/
   Established row's dialog just omits the field (isFilled) rather than
   showing a reason for something that isn't actually failing. */
const LLDP_DOWN_REASONS = ['Physical layer down — no light detected on optic', 'Interface administratively down at the remote end',
  'Cable fault — link flapping detected', 'SFP module fault — diagnostics failed'];
const OSPF_DOWN_REASONS = ['Neighbor adjacency lost — dead timer expired', 'Area ID mismatch with neighbor',
  'MTU mismatch — adjacency stuck in ExStart', 'Authentication failure with neighbor'];
const ISIS_DOWN_REASONS = ['Adjacency down — hello timer expired', 'Level mismatch with neighbor (L1 vs L2)', 'Interface down at the remote end'];
const BGP_DOWN_REASONS = { idle: 'Session administratively shut down', active: 'TCP connection failed — peer unreachable',
  connect: 'Waiting for TCP handshake — peer not responding' };

LINKS.lldp = padList(LINKS.lldp, 16, (r, i) => ({
  ...r,
  sAlias: r.sAlias || `BB:T4:10G:${(r.sne || PAD_NE[i % PAD_NE.length]).slice(0, 10)}`,
  linkId: r.linkId || `LLDP:${140499201000 + i * 192837}`
}));
LINKS.ospf = padList(LINKS.ospf, 16, (r, i) => ({
  ...r,
  sIfIndex: r.sIfIndex || (700 + i * 37),
  sSpeed: r.sSpeed || (i % 2 === 0 ? '10 Gbps' : '1 Gbps'),
  dSpeed: r.dSpeed || (i % 2 === 0 ? '10 Gbps' : '1 Gbps'),
  linkId: r.linkId || `OSPF:${85320000000 + i * 1049283}`,
  areaId: r.areaId || (i % 3 === 0 ? '0.0.0.0' : `0.0.6.${100 + i * 7}`)
}));
LINKS.bgp = padList(LINKS.bgp, 10, (r, i) => {
  const st = ['established', 'established', 'established', 'established', 'established', 'idle', 'active', 'connect'][i % 8];
  return {
    ...r, st,
    sne: PAD_NE[i % PAD_NE.length], sip: PAD_IP(i), sif: `AS ${24186 + (i % 2 ? 0 : 9498)}`,
    dne: PAD_NE[(i + 11) % PAD_NE.length], dip: PAD_IP(i + 11), dif: `${st}(${st === 'established' ? 6 : 1})`,
    name: i % 2 ? 'iBGP RR' : 'eBGP peer', v: [3, 4, 9][i % 3],
    reason: BGP_DOWN_REASONS[st]
  };
});
LINKS.isis = padList(LINKS.isis, 10, (r, i) => ({
  ...r, st: i % 6 === 5 ? 'down' : 'up',
  sne: PAD_NE[i % PAD_NE.length], sip: PAD_IP(i), sif: i % 3 ? 'L2' : 'L1L2',
  dne: PAD_NE[(i + 4) % PAD_NE.length], dip: PAD_IP(i + 4), dif: 'up', name: i % 3 ? 'ISIS L2' : 'ISIS L1L2', v: [10, 12, 21][i % 3],
  reason: i % 6 === 5 ? ISIS_DOWN_REASONS[i % ISIS_DOWN_REASONS.length] : undefined
}));

SERVICES.l3vpn = padList(SERVICES.l3vpn, 12, (r, i) => ({
  ...r,
  st: i % 5 === 3 ? 'Down' : 'Up', chip: i % 5 === 3 ? 'error' : 'success',
  name: ['SAFE-CITY-CAM', 'NIC-WAN-LINK', 'BSNL-TRANSIT', 'GOV-SECRETARIAT', 'METRO-RAIL-OPS',
    'POLICE-NET', 'HEALTH-DEPT-VPN', 'UNIV-CAMPUS-NET'][i % 8] + `-${String(12 + i).padStart(2, '0')}`,
  ip: PAD_IP(i), rd: `24186:10${16100 + i * 7}`, rt: `24186:9004${70 + i}`,
  erp: String(1110 + i), ifc: `${['TenGigE0/0/0/', 'GigabitEthernet0/0/0/', 'FortyGigE0/0/0/'][i % 3]}${i % 12}.${100 + i}`,
  ne: PAD_NE[i % PAD_NE.length], v: [3, 6, 14][i % 3]
}));
SERVICES.l2vpn = padList(SERVICES.l2vpn, 10, (r, i) => ({
  ...r,
  st: i % 4 === 2 ? 'Down' : 'Up', chip: i % 4 === 2 ? 'error' : 'success',
  name: `${i % 2 ? 'VPWS' : 'VPLS'}-${['BGLK', 'DEL', 'CHE', 'PUN', 'HYD', 'KOL'][i % 6]}-${String(5 + i).padStart(2, '0')}`,
  ip: PAD_IP(i + 2), rd: `24186:20${1210 + i * 3}`, rt: `24186:7001${20 + i}`,
  erp: String(2050 + i), ifc: `${i % 2 ? 'xe' : 'ge'}-0/${i % 4}/${i % 3}.${100 + i}`,
  ne: PAD_NE[(i + 3) % PAD_NE.length],
  dstIp: PAD_IP(i + 9), dstNe: PAD_NE[(i + 7) % PAD_NE.length], dstIfc: `${i % 2 ? 'ge' : 'xe'}-0/${(i + 1) % 4}/${(i + 2) % 3}.${200 + i}`,
  v: [3, 7, 30][i % 3]
}));

/* ── RAN, Transport and Core domain services ────────────────
   Every one of these six new types shares L2VPN's own point-to-point
   shape (st, chip, name, srcNe/srcIp/srcIfc, dstNe/dstIp/dstIfc, erp, v)
   so svcP2PTable() in app-views.js can render all of them with one
   function instead of six bespoke tables.

   Node names and NF types below follow the same domain model the
   Discovery/Reconciliation pages already established (src/data/
   discoveryOverview.ts, rules.ts, reconciliationOps.ts) rather than
   inventing a separate one: Core is 5GC NF instances (AMF/UPF, matched
   by NF instance ID via NRF — 'RUL-CORE-001'), Transport is ROADM/DWDM
   wavelength circuits ('RUL-TRN-001' ROADM wavelength match), RAN is
   cell-level (gNodeB/eNodeB). BLR-AMF-CORE-02, BLR-UPF-CORE-05 and
   MUM-ROADM-RING-03 are the exact element names those pages already
   use, reused here rather than re-invented so the same element reads
   as the same element on every screen. */
const CORE_NF_NODES = ['BLR-AMF-CORE-02', 'DEL-AMF-CORE-01', 'PUN-AMF-CORE-01',
  'BLR-UPF-CORE-05', 'DEL-UPF-CORE-01', 'PUN-UPF-CORE-01',
  'BLR-SMF-CORE-01', 'DEL-SMF-CORE-01'];
const RAN_ENB = ['PUN-HNJW-C3-ENB-014', 'INDR-AREA-001-ENB-07', 'BLR-SOUTH-GNB-021', 'DEL-CENTRAL-GNB-009'];

/* S1 (4G eNodeB · EPC) and NG (5G gNodeB · 5GC) are the same backhaul
   role for each generation — one tab covers both since PHY carries both
   eNodeB and gNodeB samples. */
SERVICES.s1ng = [
  { st: 'Up', chip: 'success', name: 'S1-MME', srcNe: 'PUN-HNJW-C3-ENB-014', srcIp: '10.44.18.14', srcIfc: 's1-mme0', dstNe: 'DEL-AMF-CORE-01', dstIp: '10.60.10.5', dstIfc: 'gtp-c0', erp: 'S1-4021', v: 3 },
  { st: 'Up', chip: 'success', name: 'S1-U', srcNe: 'PUN-HNJW-C3-ENB-014', srcIp: '10.44.18.14', srcIfc: 's1-u0', dstNe: 'DEL-UPF-CORE-01', dstIp: '10.60.11.5', dstIfc: 'gtp-u0', erp: 'S1-4022', v: 3 },
  { st: 'Up', chip: 'success', name: 'N2', srcNe: 'BLR-SOUTH-GNB-021', srcIp: '10.51.22.21', srcIfc: 'n2-0', dstNe: 'BLR-AMF-CORE-02', dstIp: '10.61.10.5', dstIfc: 'ngap0', erp: 'N2-5031', v: 5 },
  { st: 'Down', chip: 'error', name: 'N3', srcNe: 'BLR-SOUTH-GNB-021', srcIp: '10.51.22.21', srcIfc: 'n3-0', dstNe: 'BLR-UPF-CORE-05', dstIp: '10.61.11.5', dstIfc: 'gtp-u0', erp: 'N3-5032', v: 5 }
];
SERVICES.s1ng = padList(SERVICES.s1ng, 10, (r, i) => ({
  ...r,
  st: i % 5 === 3 ? 'Down' : 'Up', chip: i % 5 === 3 ? 'error' : 'success',
  srcNe: RAN_ENB[i % RAN_ENB.length], srcIp: `10.4${i % 5}.${18 + i}.${14 + i}`,
  dstNe: CORE_NF_NODES[i % 6], dstIp: `10.6${i % 3}.1${i % 2}.${5 + i}`,
  erp: `${r.name}-${4020 + i}`, v: [3, 5, 8][i % 3]
}));

/* X2 (eNodeB-eNodeB, 4G) / Xn (gNodeB-gNodeB, 5G) — the neighbour
   relation that 'RUL-RAN-002'/'Neighbour relation drift' already tracks
   for these same cells. */
SERVICES.x2xn = [
  { st: 'Up', chip: 'success', name: 'X2:PUN-INDR', srcNe: 'PUN-HNJW-C3-ENB-014', srcIp: '10.44.18.14', srcIfc: 'x2-0', dstNe: 'INDR-AREA-001-ENB-07', dstIp: '10.44.19.7', dstIfc: 'x2-0', erp: 'X2-3011', v: 3 },
  { st: 'Up', chip: 'success', name: 'Xn:BLR-DEL', srcNe: 'BLR-SOUTH-GNB-021', srcIp: '10.51.22.21', srcIfc: 'xn-0', dstNe: 'DEL-CENTRAL-GNB-009', dstIp: '10.51.23.9', dstIfc: 'xn-0', erp: 'XN-3012', v: 5 }
];
SERVICES.x2xn = padList(SERVICES.x2xn, 10, (r, i) => ({
  ...r,
  st: i % 6 === 5 ? 'Down' : 'Up', chip: i % 6 === 5 ? 'error' : 'success',
  srcNe: RAN_ENB[i % RAN_ENB.length], srcIp: `10.4${i % 5}.${18 + i}.${14 + i}`,
  dstNe: RAN_ENB[(i + 2) % RAN_ENB.length], dstIp: `10.4${(i + 2) % 5}.${18 + i}.${7 + i}`,
  name: `${i % 2 ? 'X2' : 'Xn'}:${RAN_ENB[i % RAN_ENB.length].slice(0, 3)}-${RAN_ENB[(i + 2) % RAN_ENB.length].slice(0, 3)}`,
  /* +1, not +i alone: the first padded row lands at i = the 2 hand-written
     seeds' own length, so a bare 3010+i recomputes the seed's own X2-3011/
     XN-3012 verbatim — a real, user-facing duplicate-ID bug (confirmed via
     a full-table audit), not a hypothetical one. The same fix pattern
     applies to otn/trunk just below. */
  erp: `${i % 2 ? 'X2' : 'XN'}-${3011 + i}`, v: [3, 5, 8][i % 3]
}));

/* Wavelength — a provisioned circuit on a live ROADM/DWDM shelf, the
   exact thing 'RUL-TRN-001' (ROADM wavelength match) and the 42
   "no service record" wavelengths in the cost-of-drift figures are
   about. MUM-ROADM-RING-03 is the same rogue element reconciliation
   already flags; WR-ADVA-FSP3000-01/02 are PHY's own DWDM pair. */
const ROADM_NODES = ['WR-ADVA-FSP3000-01', 'WR-ADVA-FSP3000-02', 'MUM-ROADM-RING-03', 'PUN-ROADM-RING-01'];
SERVICES.wave = [
  { st: 'Up', chip: 'success', name: 'WAVE-MUM-PUN-1550.12', srcNe: 'WR-ADVA-FSP3000-01', srcIp: '172.31.75.144', srcIfc: 'OT-1/1', dstNe: 'MUM-ROADM-RING-03', dstIp: '172.31.48.10', dstIfc: 'deg-1', erp: '1550.12nm', v: 10 },
  { st: 'Down', chip: 'error', name: 'WAVE-MUM-PUN-1551.72', srcNe: 'WR-ADVA-FSP3000-01', srcIp: '172.31.75.144', srcIfc: 'OT-1/2', dstNe: 'MUM-ROADM-RING-03', dstIp: '172.31.48.10', dstIfc: 'deg-2', erp: '1551.72nm', v: 10 }
];
SERVICES.wave = padList(SERVICES.wave, 10, (r, i) => ({
  ...r,
  st: i % 6 === 5 ? 'Down' : 'Up', chip: i % 6 === 5 ? 'error' : 'success',
  srcNe: ROADM_NODES[i % ROADM_NODES.length], srcIfc: `OT-1/${1 + i}`,
  dstNe: ROADM_NODES[(i + 1) % ROADM_NODES.length], dstIfc: `deg-${1 + (i % 4)}`,
  name: `WAVE-MUM-PUN-${(1550.12 + (i + 2) * 0.8).toFixed(2)}`, erp: `${(1550.12 + (i + 2) * 0.8).toFixed(2)}nm`, v: [10, 14][i % 2]
}));

SERVICES.otn = [
  { st: 'Up', chip: 'success', name: 'OTN-MUM-PUN-W12', srcNe: 'WR-ADVA-FSP3000-01', srcIp: '172.31.75.144', srcIfc: 'OT-1/1', dstNe: 'WR-ADVA-FSP3000-02', dstIp: '172.31.75.145', dstIfc: 'OT-1/1', erp: 'OTN-7001', v: 10 },
  { st: 'Down', chip: 'error', name: 'OTN-MUM-PUN-W13', srcNe: 'WR-ADVA-FSP3000-01', srcIp: '172.31.75.144', srcIfc: 'OT-1/2', dstNe: 'WR-ADVA-FSP3000-02', dstIp: '172.31.75.145', dstIfc: 'OT-1/2', erp: 'OTN-7002', v: 10 }
];
SERVICES.otn = padList(SERVICES.otn, 10, (r, i) => ({
  ...r,
  st: i % 5 === 4 ? 'Down' : 'Up', chip: i % 5 === 4 ? 'error' : 'success',
  srcIfc: `OT-1/${1 + i}`, dstIfc: `OT-1/${1 + i}`, name: `OTN-MUM-PUN-W${12 + i}`,
  erp: `OTN-${7001 + i}`, v: [10, 14][i % 2]
}));

/* Trunk — Transport's third element type in the domain device roster
   (src/data/domainDevices.ts: Transport: ['ROADM','OTN','PE-TRK']), the
   one Wavelength/OTN don't cover: a packet-transport trunk aggregating
   RAN backhaul and O&M traffic across the transport network (the same
   'RAN backhaul'/'Transport OAM' service labels a fiber span's own live
   strands already carry — see SERVICE_TYPES in fiberCoresTab()). */
const PE_TRK_NODES = ['BLR-PE-TRK-01', 'BLR-PE-TRK-02', 'DEL-PE-TRK-01', 'PUN-PE-TRK-01'];
SERVICES.trunk = [
  { st: 'Up', chip: 'success', name: 'TRUNK-BLR-01-02', srcNe: 'BLR-PE-TRK-01', srcIp: '172.31.95.11', srcIfc: 'trk0', dstNe: 'BLR-PE-TRK-02', dstIp: '172.31.95.12', dstIfc: 'trk0', erp: 'TRK-8001', v: 5 },
  { st: 'Up', chip: 'success', name: 'TRUNK-DEL-PUN', srcNe: 'DEL-PE-TRK-01', srcIp: '172.31.96.11', srcIfc: 'trk0', dstNe: 'PUN-PE-TRK-01', dstIp: '172.31.96.12', dstIfc: 'trk0', erp: 'TRK-8002', v: 5 }
];
/* the first padded row lands at i = 2 (the 2 hand-written seeds' own
   length) — PE_TRK_NODES[2 % 4]/[3 % 4] is exactly DEL-PE-TRK-01/
   PUN-PE-TRK-01, i.e. seed row 2's own pairing, so a bare i/(i+1) here
   reproduced that whole seed row (name, NE pair and erp alike) verbatim.
   Confirmed via a full-table audit; +1 on every index below is the fix,
   matching x2xn/otn just above. */
SERVICES.trunk = padList(SERVICES.trunk, 10, (r, i) => ({
  ...r,
  st: i % 6 === 5 ? 'Down' : 'Up', chip: i % 6 === 5 ? 'error' : 'success',
  srcNe: PE_TRK_NODES[(i + 1) % PE_TRK_NODES.length], srcIp: `172.31.9${5 + ((i + 1) % 2)}.${11 + i}`,
  dstNe: PE_TRK_NODES[(i + 2) % PE_TRK_NODES.length], dstIp: `172.31.9${5 + ((i + 2) % 2)}.${12 + i}`,
  name: `TRUNK-${PE_TRK_NODES[(i + 1) % PE_TRK_NODES.length].split('-PE-TRK-')[0]}-${PE_TRK_NODES[(i + 2) % PE_TRK_NODES.length].split('-PE-TRK-')[0]}`,
  erp: `TRK-${8001 + i}`, v: [3, 5, 9][i % 3]
}));

/* APN/DNN — the subscriber session terminating at UPF's N6 boundary
   (the same UPF instances 'RUL-CORE-001' reconciles). */
const CORE_APN_NAMES = ['internet', 'ims', 'volte', 'mms', 'ent-vpn', 'iot'];
SERVICES.apn = [
  { st: 'Up', chip: 'success', name: 'internet', srcNe: 'BLR-UPF-CORE-05', srcIp: '10.61.11.5', srcIfc: 'n6-0', dstNe: 'IGW-BLR-01', dstIp: '172.31.200.1', dstIfc: 'n6-peer', erp: 'APN-1', v: 5 },
  { st: 'Up', chip: 'success', name: 'ims', srcNe: 'DEL-UPF-CORE-01', srcIp: '10.61.11.6', srcIfc: 'n6-0', dstNe: 'IMS-DEL-01', dstIp: '172.31.201.1', dstIfc: 'sgi0', erp: 'APN-2', v: 5 }
];
SERVICES.apn = padList(SERVICES.apn, 10, (r, i) => ({
  ...r,
  st: i % 6 === 5 ? 'Down' : 'Up', chip: i % 6 === 5 ? 'error' : 'success',
  name: CORE_APN_NAMES[i % CORE_APN_NAMES.length], srcNe: CORE_NF_NODES[3 + (i % 3)],
  srcIp: `10.61.1${i % 2}.${5 + i}`, dstIp: `172.31.20${i % 3}.${1 + i}`, erp: `APN-${1 + i}`, v: [3, 5][i % 2]
}));

/* N-Interface — the 5G service-based interfaces between the same NF
   instances Core discovery/reconciliation already tracks: N11
   (AMF-SMF) and N4 (SMF-UPF). Not Diameter/4G-EPC signalling — this
   app's Core domain is NRF/REST-registered 5GC NFs end to end
   ('RUL-CORE-001': "every AMF/UPF instance the network reports"), so
   the second Core tab stays on that same 5G service-based-interface
   model rather than a different, older protocol family. */
SERVICES.nif = [
  { st: 'Up', chip: 'success', name: 'N11', srcNe: 'BLR-AMF-CORE-02', srcIp: '10.61.10.5', srcIfc: 'sbi0', dstNe: 'BLR-SMF-CORE-01', dstIp: '10.61.12.5', dstIfc: 'sbi0', erp: 'N11-1', v: 3 },
  { st: 'Up', chip: 'success', name: 'N4', srcNe: 'BLR-SMF-CORE-01', srcIp: '10.61.12.5', srcIfc: 'pfcp0', dstNe: 'BLR-UPF-CORE-05', dstIp: '10.61.11.5', dstIfc: 'pfcp0', erp: 'N4-1', v: 3 }
];
SERVICES.nif = padList(SERVICES.nif, 10, (r, i) => ({
  ...r,
  st: i % 6 === 5 ? 'Down' : 'Up', chip: i % 6 === 5 ? 'error' : 'success',
  name: ['N11', 'N4', 'N8', 'N10'][i % 4], srcIp: `10.61.1${i % 3}.${4 + i}`, dstIp: `10.61.1${(i + 1) % 3}.${5 + i}`,
  erp: `${['N11', 'N4', 'N8', 'N10'][i % 4]}-${1 + Math.floor(i / 4)}`, v: [3, 5][i % 2]
}));


const INACT_TABS = [
  { k: 'ne', n: 'Network elements', c: 412 }, { k: 'links', n: 'Links', c: 1188 }, { k: 'svc', n: 'Services', c: 264 }
];
/* ── the decommissioned archive, by class ──────────────────
   Every class in PHY_MATRIX has records here, so no filter
   combination lands on an empty list. Exactly two rows carry
   zombie:true, matching the "2 still answering" figure on
   the stat strip and the reconciliation exception count.  */
const DECOMM = {
  router: [
    {
      name: 'MAS-J960-P-R2-T1-SR', ip: '172.31.31.140', model: 'MX960', sn: 'JN1231A55AFB', oem: 'JUNIPER', loc: 'MAS-041',
      why: 'Replaced under CR-8802', on: '14-Jun-2026', by: 'Anjali Verma', wo: 'WO-2026-4412', zombie: false
    },
    {
      name: 'DEL-N540X-SPARE', ip: '172.31.42.207', model: 'NCS-540', sn: 'CAT2077U1XX', oem: 'CISCO', loc: 'DEL-279',
      why: 'End of life', on: '02-May-2026', by: 'Gaurav Shukla', wo: 'WO-2026-4188', zombie: true
    },
    {
      name: 'INDR-ASR920-R7', ip: '172.31.38.77', model: 'ASR920', sn: 'CAT2034U7RR', oem: 'CISCO', loc: 'INDR-275',
      why: 'Faulty, returned to OEM', on: '11-Feb-2026', by: 'Amit Sharma', wo: 'WO-2026-3901', zombie: false
    },
    {
      name: 'VZG-7750-BNG-02', ip: '172.31.49.202', model: '7750', sn: 'NSN7750VZG022', oem: 'NOKIA', loc: 'VJA-118',
      why: 'Capacity migration', on: '08-Jan-2026', by: 'Sai Krishna', wo: 'WO-2026-3644', zombie: true
    },
    {
      name: 'CHE-MX204-EDGE-11', ip: '172.31.61.88', model: 'MX204', sn: 'JN1188C21DDA', oem: 'JUNIPER', loc: 'CHE-118',
      why: 'Site consolidation', on: '22-Nov-2025', by: 'Harish Kumar', wo: 'WO-2025-9120', zombie: false
    }
  ],
  switch: [
    {
      name: 'BGLK-EX2200-OLD-03', ip: '172.31.31.44', model: 'EX2200-24T', sn: 'CHR-SN-441122', oem: 'JUNIPER', loc: 'BGLK-277',
      why: 'Site consolidation', on: '19-Mar-2026', by: 'Harish Kumar', wo: 'WO-2026-4021', zombie: false
    },
    {
      name: 'DEL-C9300-ACC-07', ip: '172.31.35.61', model: 'C9300-48UXM', sn: 'CAT2091U4KK', oem: 'CISCO', loc: 'DEL-279',
      why: 'End of support', on: '05-Feb-2026', by: 'Anjali Verma', wo: 'WO-2026-3877', zombie: false
    },
    {
      name: 'MAS-EX4300-DIST-02', ip: '172.31.33.19', model: 'EX4300-48P', sn: 'SW-PRO-CHR-1188', oem: 'JUNIPER', loc: 'MAS-041',
      why: 'Replaced under CR-8640', on: '12-Dec-2025', by: 'Sai Krishna', wo: 'WO-2025-9366', zombie: false
    },
    {
      name: 'INDR-EX2200-ACC-14', ip: '172.31.39.203', model: 'EX2200-24T', sn: 'CHR-SN-338710', oem: 'JUNIPER', loc: 'INDR-275',
      why: 'Water ingress, written off', on: '30-Aug-2025', by: 'Amit Sharma', wo: 'WO-2025-8455', zombie: false
    }
  ],
  server: [
    {
      name: 'BGLK-CDC-SRV-04', ip: '172.31.31.211', model: 'DL380 Gen10', sn: 'HPE380BG0441', oem: 'HPE', loc: 'BGLK-277',
      why: 'Hardware refresh', on: '28-Apr-2026', by: 'Gaurav Shukla', wo: 'WO-2026-4155', zombie: false
    },
    {
      name: 'DEL-CDC-SRV-09', ip: '172.31.35.118', model: 'R740xd', sn: 'DELLR740D9022', oem: 'DELL', loc: 'DEL-279',
      why: 'Workload migrated to cloud', on: '17-Jan-2026', by: 'Anjali Verma', wo: 'WO-2026-3702', zombie: false
    },
    {
      name: 'MAS-CDC-SRV-02', ip: '172.31.33.88', model: 'DL360 Gen9', sn: 'HPE360MA1129', oem: 'HPE', loc: 'MAS-041',
      why: 'End of support', on: '09-Oct-2025', by: 'Amit Sharma', wo: 'WO-2025-8811', zombie: false
    },
    {
      name: 'VJA-CDC-SRV-01', ip: '172.31.53.44', model: 'R640', sn: 'DELLR640V4410', oem: 'DELL', loc: 'VJA-118',
      why: 'Site consolidation', on: '21-Jul-2025', by: 'Sai Krishna', wo: 'WO-2025-8102', zombie: false
    }
  ],
  dwdm: [
    {
      name: 'WR-ADVA-FSP3000-04', ip: '172.31.47.150', model: 'FSP 3000', sn: 'ADV3000WR0417', oem: 'ADVA', loc: 'DEL-279',
      why: 'Ring re-engineered', on: '06-Mar-2026', by: 'Harish Kumar', wo: 'WO-2026-3988', zombie: false
    },
    {
      name: 'BGLK-OADM-100-02', ip: '172.31.31.164', model: 'FSP 3000', sn: 'ADV3000BG1002', oem: 'ADVA', loc: 'BGLK-277',
      why: 'Capacity migration to C-band', on: '14-Nov-2025', by: 'Gaurav Shukla', wo: 'WO-2025-9044', zombie: false
    },
    {
      name: 'CHE-OADM-100-01', ip: '172.31.61.201', model: 'FSP 3000', sn: 'ADV3000CH1001', oem: 'ADVA', loc: 'CHE-118',
      why: 'End of support', on: '02-Jun-2025', by: 'Amit Sharma', wo: 'WO-2025-7660', zombie: false
    }
  ],
  enodeb: [
    {
      name: 'MP-INDR-ENB-118', ip: '172.31.39.118', model: 'BBU 3900', sn: 'ENB3900IN0118', oem: 'NOKIA', loc: 'INDR-275',
      why: '4G to 5G upgrade', on: '25-May-2026', by: 'Sai Krishna', wo: 'WO-2026-4260', zombie: false
    },
    {
      name: 'KA-BGLK-ENB-041', ip: '172.31.31.241', model: 'BBU 3900', sn: 'ENB3900BG0041', oem: 'NOKIA', loc: 'BGLK-277',
      why: 'Site decommissioned', on: '11-Jan-2026', by: 'Anjali Verma', wo: 'WO-2026-3688', zombie: false
    },
    {
      name: 'TN-CHE-ENB-207', ip: '172.31.61.207', model: 'BBU 3900', sn: 'ENB3900CH0207', oem: 'NOKIA', loc: 'CHE-118',
      why: '4G to 5G upgrade', on: '18-Sep-2025', by: 'Harish Kumar', wo: 'WO-2025-8702', zombie: false
    }
  ],
  gnodeb: [
    {
      name: 'BLR-SOUTH-GNB-014', ip: '172.31.41.114', model: 'AirScale', sn: 'GNB5GBL00014', oem: 'NOKIA', loc: 'BGLK-277',
      why: 'Replaced under CR-9014', on: '02-Jun-2026', by: 'Gaurav Shukla', wo: 'WO-2026-4318', zombie: false
    },
    {
      name: 'DEL-CENTRAL-GNB-003', ip: '172.31.35.203', model: 'AirScale', sn: 'GNB5GDL00003', oem: 'NOKIA', loc: 'DEL-279',
      why: 'Antenna re-siting', on: '19-Feb-2026', by: 'Amit Sharma', wo: 'WO-2026-3844', zombie: false
    },
    {
      name: 'MAS-NORTH-GNB-008', ip: '172.31.33.208', model: 'AirScale', sn: 'GNB5GMA00008', oem: 'NOKIA', loc: 'MAS-041',
      why: 'Site consolidation', on: '07-Dec-2025', by: 'Anjali Verma', wo: 'WO-2025-9288', zombie: false
    }
  ],
  l2vpn: [
    { name: 'L2VPN-MAS-DEL-E-LINE-01', ip: '172.31.31.240', model: 'E-Line / VPWS', sn: 'VC-L2-990412', oem: 'JUNIPER', loc: 'MAS-041', why: 'Service decommissioned by customer request', on: '14-May-2026', by: 'Anjali Verma', wo: 'WO-2026-9412', zombie: false },
    { name: 'L2VPN-BLR-CHE-VPLS-04', ip: '172.31.41.118', model: 'E-LAN / VPLS', sn: 'VC-L2-884102', oem: 'CISCO', loc: 'BGLK-277', why: 'Migrated to EVPN-VPWS', on: '22-Mar-2026', by: 'Gaurav Shukla', wo: 'WO-2026-8841', zombie: false },
    { name: 'L2VPN-INDR-DEL-PSEUDOWIRE-09', ip: '172.31.38.99', model: 'PW-E1', sn: 'VC-L2-771904', oem: 'NOKIA', loc: 'INDR-275', why: 'Circuit retired', on: '11-Jan-2026', by: 'Amit Sharma', wo: 'WO-2026-7719', zombie: false },
    { name: 'L2VPN-PUN-HYD-EVPN-12', ip: '172.31.52.88', model: 'EVPN-VPWS', sn: 'VC-L2-663201', oem: 'JUNIPER', loc: 'PUN-162', why: 'Capacity migration', on: '04-Dec-2025', by: 'Sai Krishna', wo: 'WO-2025-6632', zombie: false }
  ],
  l3vpn: [
    { name: 'L3VPN-ENT-CORP-DEL-01', ip: '172.31.35.101', model: 'MPLS L3VPN / VRF', sn: 'VRF-L3-550119', oem: 'CISCO', loc: 'DEL-279', why: 'Contract expired, service terminated', on: '18-Jun-2026', by: 'Harish Kumar', wo: 'WO-2026-5501', zombie: false },
    { name: 'L3VPN-BANK-HQ-MAS-02', ip: '172.31.33.204', model: 'IP-VPN / BGP-MPLS', sn: 'VRF-L3-441028', oem: 'JUNIPER', loc: 'MAS-041', why: 'Site migration', on: '04-Apr-2026', by: 'Sai Krishna', wo: 'WO-2026-4410', zombie: false },
    { name: 'L3VPN-GOVT-SECURE-BGLK-07', ip: '172.31.31.199', model: 'MPLS L3VPN / VRF', sn: 'VRF-L3-339104', oem: 'NOKIA', loc: 'BGLK-277', why: 'Upgraded to SD-WAN overlay', on: '29-Nov-2025', by: 'Anjali Verma', wo: 'WO-2025-3391', zombie: false },
    { name: 'L3VPN-RETAIL-CHAIN-KOL-15', ip: '172.31.67.142', model: 'BGP-MPLS L3VPN', sn: 'VRF-L3-228109', oem: 'CISCO', loc: 'KOL-204', why: 'Hardware refresh', on: '15-Aug-2025', by: 'Amit Sharma', wo: 'WO-2025-2281', zombie: false }
  ]
};
/* The seeds above are hand-written. The archive holds the full decommissioned
   population (289/61/34/19/5/4 = 412), so it is expanded deterministically to
   the counts the ledger declares — every page of every class tab has records. */
const DK_SITES = [
  { p: 'DEL', loc: 'DEL-279' }, { p: 'MAS', loc: 'MAS-041' }, { p: 'BGLK', loc: 'BGLK-277' },
  { p: 'INDR', loc: 'INDR-275' }, { p: 'CHE', loc: 'CHE-118' }, { p: 'VZG', loc: 'VJA-118' },
  { p: 'PUN', loc: 'PUN-162' }, { p: 'HYD', loc: 'HYD-093' }, { p: 'KOL', loc: 'KOL-204' },
  { p: 'AHM', loc: 'AHM-131' }, { p: 'JAI', loc: 'JAI-058' }, { p: 'LKO', loc: 'LKO-217' }
];
const DK_WHY = ['Replaced under change request', 'End of life', 'End of support', 'Faulty, returned to OEM',
  'Site consolidation', 'Capacity migration', 'Hardware refresh', 'Written off after survey',
  'Lease expired, returned', 'Rationalised in ring re-design'];
const DK_BY = ['Anjali Verma', 'Gaurav Shukla', 'Amit Sharma', 'Sai Krishna', 'Harish Kumar',
  'Ronit Dulani', 'Meera Nair', 'Vikram Rao'];
const DK_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DK_ROLE = {
  router: ['P', 'PE', 'BNG', 'EDGE', 'AGG'], switch: ['ACC', 'DIST', 'CORE', 'TOR'],
  server: ['SRV', 'CDC', 'APP', 'DB'], dwdm: ['OADM', 'ROADM', 'MUX', 'ILA'],
  enodeb: ['ENB'], gnodeb: ['GNB'],
  l2vpn: ['LINE', 'VPLS', 'PW'], l3vpn: ['VRF', 'VPN', 'MPLS']
};

/* one small deterministic generator so a rebuild never reshuffles the archive */
function dkRand(seed) { let x = seed; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }

function dkExpand(cls, seeds, total) {
  const out = seeds.slice(), r = dkRand(cls.length * 7919 + total);
  const pick = a => a[Math.floor(r() * a.length)];
  const roles = DK_ROLE[cls] || ['NE'];
  while (out.length < total) {
    const i = out.length, base = seeds[i % seeds.length], site = pick(DK_SITES);
    /* decommission dates are always in the past — spread over the 7-year retention window */
    const back = 20 + Math.floor(r() * 2520);          /* 20 days .. ~7 years ago */
    const d0 = new Date(2026, 8, 3); d0.setDate(d0.getDate() - back);
    const yr = d0.getFullYear(), mo = d0.getMonth(), dy = d0.getDate();
    out.push({
      name: `${site.p}-${base.model.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}-${pick(roles)}-${String(10 + i % 89)}`,
      ip: `172.31.${64 + (i % 96)}.${1 + ((i * 37) % 253)}`,
      model: base.model, oem: base.oem,
      sn: base.sn.replace(/[0-9]{4}$/, String(1000 + ((i * 461) % 8999))) + String.fromCharCode(65 + (i % 26)),
      loc: site.loc,
      why: pick(DK_WHY),
      on: `${String(dy).padStart(2, '0')}-${DK_MON[mo]}-${yr}`,
      by: pick(DK_BY),
      wo: `WO-${yr}-${1000 + ((i * 313) % 8999)}`,
      zombie: false
    });
  }
  /* newest first, as the seeds are */
  const ord = s => { const [d, m, y] = s.split('-'); return Number(y) * 10000 + (DK_MON.indexOf(m) + 1) * 100 + Number(d); };
  return out.sort((a, b) => ord(b.on) - ord(a.on));
}
Object.keys(DECOMM).forEach(k => {
  const count = (typeof stockCount === 'function' && stockCount(k, 'decomm')) || 18;
  DECOMM[k] = dkExpand(k, DECOMM[k], count);
});

const decommRows = cls => DECOMM[cls] || [];
const DK_ORD = s => { const [d, m, y] = s.split('-'); return new Date(Number(y), DK_MON.indexOf(m), Number(d)); };
const DECOMM_OLDEST = (() => {
  const dates = Object.values(DECOMM).flat().map(r => DK_ORD(r.on)).sort((a, b) => a - b);
  const mo = Math.round((new Date(2026, 8, 3) - dates[0]) / 2629800000);
  return `${Math.floor(mo / 12)}y ${mo % 12}mo`;
})();
const DECOMM_ZOMBIES = Object.values(DECOMM).flat().filter(r => r.zombie).length;
const INACTIVE = DECOMM.router;

const REPORTS = [
  { st: 'Completed', chip: 'success', name: 'RJ-MPLS-ROUTER-CLUSTER-REPORT', type: 'Cluster', gen: 'Scheduled', freq: 'Weekly', by: 'Harish Kumar', on: '15-Jul-2026', size: '2.4 MB' },
  { st: 'Completed', chip: 'success', name: 'PUN-HNJW-C3-ENODEB-CLUSTER', type: 'Cluster', gen: 'Scheduled', freq: 'Daily', by: 'Anjali Verma', on: '14-Jul-2026', size: '1.1 MB' },
  { st: 'Completed', chip: 'success', name: 'BGLK-277-ORR-WIFI-CLUSTER', type: 'Cluster', gen: 'Scheduled', freq: 'Weekly', by: 'Ronit Dulani', on: '14-Jul-2026', size: '860 KB' },
  { st: 'Completed', chip: 'success', name: 'NETWORK-DISCOVERY-SUMMARY', type: 'Discovery', gen: 'Automated', freq: 'Daily', by: 'scheduler', on: '01-Sep-2026', size: '4.2 MB' },
  { st: 'Completed', chip: 'success', name: 'RECONCILIATION-EXCEPTIONS', type: 'Discovery', gen: 'Automated', freq: 'Daily', by: 'scheduler', on: '01-Sep-2026', size: '1.8 MB' },
  { st: 'Failed', chip: 'error', name: 'LUCKNOW-AREA-005-BBU-HARDWARE', type: 'Site', gen: 'Adhoc', freq: 'Once', by: 'Nitin Gupta', on: '14-Jul-2026', size: '—' },
  { st: 'Pending', chip: 'warning', name: 'SURAT-AREA-014-RRU-POWER', type: 'Site', gen: 'Scheduled', freq: 'Daily', by: 'Rohan Mehta', on: '14-Jul-2026', size: '—' }
];

/* ── network elements at a site ─────────────────────────── */
const SITE_TABS = [{ k: 'router', n: 'Router' }, { k: 'switch', n: 'Switch' }, { k: 'dwdm', n: 'DWDM' }];
const SITE_NE = {
  'BGLK-277': {
    router: [
      { st: 'ok', name: 'NDLS-J960-P_R1-T1-NR', ip: '172.31.31.189', model: 'MX960', os: '21.2R3-S8.5', sn: 'JN1236F87AFB', oem: 'JUNIPER', rack: 'A · U42-43', s: 'd', v: 3 },
      { st: 'ok', name: 'PSA-C920-WIFI1-T4-ER', ip: '172.31.38.41', model: 'ASR920', os: '17.6.3', sn: 'CAT2034U1SR', oem: 'CISCO', rack: 'A · U18', s: 'd', v: 3 },
      { st: 'drift', name: 'ET-J960-P-T1-WR', ip: '172.31.31.97', model: 'MX960', os: '21.4R3-S5.5', sn: 'JN1234C25AFA', oem: 'JUNIPER', rack: 'B · U30-31', s: 'd', v: 3 },
      { st: 'none', name: 'ERS-N7750-SR7-T2-SR', ip: '192.168.1.14', model: '7750 SR-7', os: 'TiMOS-C-22.10.R1', sn: 'NSN7750ERS14A7X1', oem: 'NOKIA', rack: 'C · U12', s: 'p', v: null },
      { st: 'none', name: 'NDD-J2.2K-PE-T4-SR', ip: '192.168.1.11', model: 'EX4300-48P', os: '3.2.0.4', sn: 'QCT3048NDD11A01', oem: 'JUNIPER', rack: 'C · U16', s: 'p', v: null },
      { st: 'dup', name: 'SP-CNOC-LAB-J204-PE-T3-NRIZIW', ip: '172.31.63.20', model: 'NCS-540', os: '7.9.2', sn: 'FW488AS342W', oem: 'CISCO', rack: 'D · U04', s: 'd', v: 3 },
      { st: 'dup', name: 'SP-CNOC-LAB-J204-PE-T3-NRIZ', ip: '172.31.86.61', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W', oem: 'JUNIPER', rack: 'D · U06', s: 'd', v: 3 },
      { st: 'dup', name: '2SP-CNOC-LAB-J204-PE-T3-NR', ip: '192.168.10.56', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W', oem: 'JUNIPER', rack: 'D · U08', s: 'd', v: 3 },
      { st: 'dup', name: 'SP-CNOC-LAB-J204-PE-T3-NR11', ip: '192.168.11.169', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W', oem: 'JUNIPER', rack: 'D · U10', s: 'd', v: 3 },
      { st: 'dup', name: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '192.168.11.142', model: 'MX204', os: '21.4R3-S5.5', sn: 'FW488AS342W', oem: 'JUNIPER', rack: 'D · U12', s: 'd', v: 3 },
      { st: 'ok', name: 'BGLK-J7024-PE-T4-WR', ip: '172.31.62.11', model: 'ACX7024', os: '23.2R1-S2.6', sn: 'FL2423AN0050', oem: 'JUNIPER', rack: 'B · U08', s: 'd', v: 5 },
      { st: 'stale', name: 'BGLK-C920-WIFI2-T4-ER', ip: '172.31.38.44', model: 'ASR920', os: '17.6.4', sn: 'CAT2034U1PQ', oem: 'CISCO', rack: 'A · U20', s: 'd', v: 864 }
    ],
    switch: [
      { st: 'ok', name: 'KA-BGLK-277-T-CHR-01', ip: '172.31.31.201', model: 'L3-CORE-48P', mac: 'F0:9F:C2:77:88:99', sn: 'HPE-SW-CH-2026-001', tmpl: '24A-NE-ZTP - 1.0', oem: 'CIENA', s: 'd', v: 6 },
      { st: 'ok', name: 'KA-BGLK-277-T-CHR-02', ip: '172.31.31.202', model: 'L2-ACCESS-24P', mac: 'A4:5E:60:12:34:56', sn: 'SN-SW-CHR-6590496', tmpl: '24A-NE-ZTP - 1.0', oem: 'CIENA', s: 'd', v: 6 },
      { st: 'ok', name: 'KA-BGLK-277-T-CHR-03', ip: '172.31.31.203', model: 'DC-SW-48PORT', mac: 'D8:9E:F3:10:20:30', sn: 'SWITCH-CHR-99001', tmpl: '24A-NE-ZTP - 1.0', oem: 'CIENA', s: 'd', v: 6 },
      { st: 'ok', name: 'KA-BGLK-277-T-CHR-04', ip: '172.31.31.204', model: 'EX2200-24T', mac: 'D8:AE:F3:AB:CD:6F', sn: 'CHR-SN-808090', tmpl: '24A-NE-ZTP - 1.0', oem: 'JUNIPER', s: 'd', v: 6 },
      { st: 'drift', name: 'KA-BGLK-277-T-CHR-07', ip: '172.31.31.207', model: 'EX4300-48P', mac: 'D8:9E:F3:AB:CD:EF', sn: 'SW-PRO-CHR-4545', tmpl: '24A-NE-ZTP - 1.0', oem: 'JUNIPER', s: 'd', v: 6 },
      { st: 'drift', name: 'KA-BGLK-277-T-CHR-08', ip: '172.31.31.208', model: 'C9300-48UXM', mac: 'AC:DE:48:44:55:66', sn: 'SW-CHR-CORE-4499', tmpl: '24A-NE-ZTP - 1.0', oem: 'CISCO', s: 'd', v: 6 },
      { st: 'ok', name: 'KA-BGLK-277-T-CHR-09', ip: '172.31.31.209', model: 'C9400-LC-48T', mac: 'A4:B1:C2:D3:E4:F5', sn: 'CHRSW-909090', tmpl: '24A-NE-ZTP - 1.0', oem: 'CISCO', s: 'd', v: 6 }
    ],
    dwdm: [
      { st: 'none', name: 'BGLK-KA-OADM-100', ip: '172.31.31.148', type: 'OADM', oem: 'JUNIPER', sw: '21.5.1', shelf: 'OT-1 · slot 4', sn: 'ADV277100', s: 'm', v: null },
      { st: 'none', name: 'BGLK-KA-ILA-101', ip: '100.64.32.27', type: 'ILA', oem: 'ADVA', sw: '21.5.1', shelf: 'OT-1 · slot 6', sn: 'ADV277101', s: 'm', v: null },
      { st: 'none', name: 'BGLK-KA-GNE-202', ip: '172.31.41.202', type: 'GNE', oem: 'ADVA', sw: '21.5.1', shelf: 'OT-2 · slot 1', sn: 'ADV277202', s: 'm', v: null },
      { st: 'none', name: 'BGLK-KA-OADM-201', ip: '172.31.41.201', type: 'OADM', oem: 'JUNIPER', sw: '21.5.1', shelf: 'OT-2 · slot 3', sn: 'ADV277201', s: 'm', v: null },
      { st: 'none', name: 'BGLK-KA-ILA-203', ip: '192.168.1.1', type: 'ILA', oem: 'JUNIPER', sw: '16.3.2', shelf: 'OT-2 · slot 5', sn: 'ADV277203', s: 'm', v: null },
      { st: 'none', name: 'BGLK-KA-ILA-204', ip: '172.16.0.5', type: 'ILA', oem: 'JUNIPER', sw: '21.1.1', shelf: 'OT-2 · slot 7', sn: 'ADV277204', s: 'm', v: null }
    ]
  }
};
/* deterministic filler for the other sample sites */
function siteNE(id, ne, disc) {
  if (SITE_NE[id]) return SITE_NE[id];
  const models = [['MX204', 'JUNIPER', '21.4R3-S5.5'], ['NCS-540', 'CISCO', '7.9.2'], ['ACX2200', 'JUNIPER', '21.2R3-S8.5'], ['ASR920', 'CISCO', '17.6.4']];
  const sw = [['EX2200-24T', 'JUNIPER'], ['C9300-48UXM', 'CISCO'], ['L2-ACCESS-24P', 'CIENA']];
  const nR = Math.max(1, Math.round(ne * 0.6)), nS = Math.max(0, ne - nR);
  const seen = disc;
  const mk = (i) => {
    const m = models[i % models.length];
    return {
      st: i < seen ? (i % 5 === 2 ? 'drift' : 'ok') : 'none',
      name: `${id}-PE-T4-${String(i + 1).padStart(2, '0')}`, ip: `172.31.${40 + (i % 9)}.${20 + i * 3}`,
      model: m[0], os: m[2], sn: `${m[1].slice(0, 2)}${id.replace(/[^0-9]/g, '').slice(0, 4)}${1000 + i * 7}`,
      oem: m[1], rack: `A · U${10 + i * 2}`, s: i < seen ? 'd' : 'p', v: i < seen ? 3 + (i % 12) : null
    };
  };
  const mkS = (i) => {
    const m = sw[i % sw.length];
    return {
      st: (nR + i) < seen ? 'ok' : 'none', name: `${id}-T-CHR-${String(i + 1).padStart(2, '0')}`,
      ip: `172.31.${52 + (i % 5)}.${60 + i * 4}`, model: m[0], mac: `D8:9E:F3:${(16 + i).toString(16).toUpperCase()}:20:30`,
      sn: `SW-${id}-${4400 + i * 11}`, tmpl: '24A-NE-ZTP - 1.0', oem: m[1],
      s: (nR + i) < seen ? 'd' : 'p', v: (nR + i) < seen ? 4 + i : null
    };
  };
  /* DWDM optical transport isn't at every site — realistically it's the
     larger aggregation/core/datacenter sites that carry it, not a small
     edge site with a couple of access routers. Same 'none'/manual-source
     convention the hand-authored BGLK-277 dwdm rows above already use
     (this class isn't reconciled through the router/switch discovery
     feed in this sample), not a fresh invented status split. */
  const DWDM_TYPES = ['OADM', 'ILA', 'GNE'];
  const mkD = (i) => ({
    st: 'none', name: `${id}-OADM-${String(100 + i * 20)}`,
    ip: `172.31.${90 + (i % 9)}.${20 + i * 7}`,
    type: DWDM_TYPES[i % DWDM_TYPES.length], oem: i % 2 ? 'ADVA' : 'JUNIPER', sw: '21.5.1',
    shelf: `OT-${i + 1} · slot ${3 + i * 2}`, sn: `ADV${id.replace(/[^0-9]/g, '').padStart(3, '0')}${100 + i * 20}`,
    s: 'm', v: null
  });
  const nD = ne >= 20 ? 2 : ne >= 6 ? 1 : 0;
  return {
    router: Array.from({ length: nR }, (_, i) => mk(i)), switch: Array.from({ length: nS }, (_, i) => mkS(i)),
    dwdm: Array.from({ length: nD }, (_, i) => mkD(i))
  };
}

/* ── capex ──────────────────────────────────────────────── */
const CAPEX_CATS = [
  { k: 'equip', n: 'Equipment', tone: 'sky' },
  { k: 'civil', n: 'Civil works', tone: 'slate' },
  { k: 'power', n: 'Power & cooling', tone: 'amber' },
  { k: 'fiber', n: 'Fiber & transport', tone: 'cyan' },
  { k: 'instal', n: 'Installation & commissioning', tone: 'purple' },
  { k: 'lic', n: 'Software licence', tone: 'emerald' }
];
const CAPEX_STATES = [
  { k: 'paid', n: 'Paid', chip: 'success' },
  { k: 'invoiced', n: 'Invoiced', chip: 'info' },
  { k: 'po', n: 'PO raised', chip: 'warning' },
  { k: 'planned', n: 'Planned', chip: 'neutral' }
];
const CAPEX = {
  'BGLK-277': {
    fy: 'FY 2024-25', afe: 'AFE-KA-2024-0188', cc: 'CC-4471 · Karnataka Access', owner: 'Harish Kumar',
    approved: 52000000, updated: '21-Jul-2026 · Gaurav Shukla',
    items: [
      { d: 'Core router MX960', c: 'equip', v: 'Juniper', po: 'PO-2024-1188', q: 2, u: 8250000, s: 'paid', dt: '12-Mar-2024', ne: 'NDLS-J960-P_R1-T1-NR +1' },
      { d: 'Aggregation router MX204', c: 'equip', v: 'Juniper', po: 'PO-2024-1190', q: 5, u: 1420000, s: 'paid', dt: '12-Mar-2024', ne: 'SP-CNOC-LAB-J204 ×5' },
      { d: 'Access switch 48-port', c: 'equip', v: 'Ciena', po: 'PO-2024-1204', q: 7, u: 385000, s: 'paid', dt: '28-Mar-2024', ne: 'KA-BGLK-277-T-CHR-01…09' },
      { d: 'DWDM shelf and line cards', c: 'equip', v: 'Adva', po: 'PO-2024-1266', q: 1, u: 6840000, s: 'invoiced', dt: '14-Jun-2024', ne: 'BGLK-KA-OADM-100 +5' },
      { d: 'Racks, cabling and earthing', c: 'civil', v: 'L&T', po: 'PO-2024-1150', q: 1, u: 3120000, s: 'paid', dt: '02-Feb-2024', ne: '—' },
      { d: 'DG set 250 kVA with AMF panel', c: 'power', v: 'Cummins', po: 'PO-2024-1152', q: 1, u: 2450000, s: 'paid', dt: '08-Feb-2024', ne: '—' },
      { d: 'Precision cooling 11 TR', c: 'power', v: 'Blue Star', po: 'PO-2024-1153', q: 2, u: 1180000, s: 'paid', dt: '08-Feb-2024', ne: '—' },
      { d: 'Battery bank and rectifier', c: 'power', v: 'Exide', po: 'PO-2024-1155', q: 1, u: 1760000, s: 'paid', dt: '19-Feb-2024', ne: '—' },
      { d: 'OFC last mile, 4.2 km', c: 'fiber', v: 'Sterlite', po: 'PO-2024-1301', q: 1, u: 882000, s: 'invoiced', dt: '30-Aug-2024', ne: '—' },
      { d: 'Installation and commissioning', c: 'instal', v: 'Tata Comm', po: 'PO-2024-1310', q: 1, u: 1640000, s: 'invoiced', dt: '12-Sep-2024', ne: '—' },
      { d: 'Router OS subscription, 3 yr', c: 'lic', v: 'Juniper', po: 'PO-2025-0042', q: 7, u: 265000, s: 'po', dt: '04-Apr-2025', ne: 'All routers' },
      { d: 'Spare line cards and SFPs', c: 'equip', v: 'Multiple', po: '—', q: 1, u: 1250000, s: 'planned', dt: '—', ne: '—' }
    ]
  }
};
/* only the actual network equipment rows carry a linked-element value —
   civil, power, installation and spares have none in BGLK-277's own
   hand-authored data either, so the generated sites stay consistent with
   that rather than inventing links for line items that aren't a device */
const CAPEX_NE_BY_BASE_ROW = {
  0: (id, q) => `${id}-MX960-CORE-01${q > 1 ? ` +${q - 1}` : ''}`,
  1: (id, q) => `${id}-MX204-AGG-01${q > 1 ? ` ×${q}` : ''}`,
  2: (id, q) => `${id}-ACC-SW-01${q > 1 ? `…${String(q).padStart(2, '0')}` : ''}`
};
function capexOf(id, ne) {
  if (CAPEX[id]) return CAPEX[id];
  const scale = Math.max(0.25, ne / 25), base = CAPEX['BGLK-277'], pick = [0, 1, 2, 4, 5, 7, 9, 11];
  const items = pick.map((i, j) => {
    const b = base.items[i], q = Math.max(1, Math.round(b.q * scale * 0.5));
    const neGen = CAPEX_NE_BY_BASE_ROW[i];
    return {
      ...b, q,
      u: Math.round(b.u * (0.55 + (j % 4) * 0.12) / 1000) * 1000,
      po: b.po === '—' ? '—' : `PO-2024-${1200 + j * 13}`,
      ne: neGen ? neGen(id, q) : '—'
    };
  });
  const committed = items.reduce((a, r) => a + r.q * r.u, 0);
  return {
    fy: 'FY 2024-25', afe: `AFE-${id.slice(0, 4)}-2024-0${(id.length * 7) % 9 + 1}00`,
    cc: `CC-${4400 + (id.length * 13) % 90} · Circle access`, owner: 'Anjali Verma',
    approved: Math.ceil(committed * 1.09 / 100000) * 100000,
    updated: '14-Jun-2026 · Amit Sharma', items
  };
}
const capexTotal = items => items.reduce((a, r) => a + r.q * r.u, 0);
const capexByState = items => CAPEX_STATES.map(s =>
  ({ ...s, c: items.filter(r => r.s === s.k).reduce((a, r) => a + r.q * r.u, 0) }));
const capexByCat = items => CAPEX_CATS.map(c =>
  ({ ...c, c: items.filter(r => r.c === c.k).reduce((a, r) => a + r.q * r.u, 0) }))
  .filter(x => x.c > 0).sort((a, b) => b.c - a.c);

/* grown after its own declaration */
REPORTS.push(
  { st: 'Completed', chip: 'success', name: 'HYD-093-DWDM-CHANNEL-FILL', type: 'Cluster', gen: 'Scheduled', freq: 'Weekly', by: 'Meera Nair', on: '29-Aug-2026', size: '1.6 MB' },
  { st: 'Completed', chip: 'success', name: 'PASSIVE-FIBER-OTDR-SUMMARY', type: 'Site', gen: 'Scheduled', freq: 'Monthly', by: 'Vikram Rao', on: '28-Aug-2026', size: '3.1 MB' },
  { st: 'Completed', chip: 'success', name: 'SPARE-STOCK-AGEING', type: 'Cluster', gen: 'Adhoc', freq: 'Once', by: 'Gaurav Shukla', on: '26-Aug-2026', size: '640 KB' },
  { st: 'Completed', chip: 'success', name: 'COLLECTOR-CREDENTIAL-FAILURES', type: 'Discovery', gen: 'Automated', freq: 'Daily', by: 'scheduler', on: '01-Sep-2026', size: '910 KB' },
  { st: 'Pending', chip: 'warning', name: 'KOL-204-RRU-POWER-AUDIT', type: 'Site', gen: 'Scheduled', freq: 'Weekly', by: 'Rohan Mehta', on: '01-Sep-2026', size: '—' }
);

/* grown after its own declaration — the eleven hand-written rows above stay
   for their narrative detail; the rest of "the 175 that failed" and "68 seen
   for the first time" (both quoted on Insights) are filled in here so the
   count on Scan targets is something you can actually open and read, in the
   exact reason mix the Insights donut and DROPS already state. */
(function growTargets() {
  let seed = 7919;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const pad2 = v => String(v).padStart(2, '0');
  const flatten = mix => mix.flatMap(([k, c]) => Array(c).fill(k));

  const MODELS_BY_DOMAIN = {
    RAN: {
      Nokia: ['AirScale 5G', 'AirScale', 'AirScale gNB'],
      Ericsson: ['AIR 6449', 'Baseband 6630'],
      Huawei: ['AAU5613', 'BTS3900']
    },
    Core: {
      Nokia: ['AMF-CN', 'UPF-CN', 'SMF-CN', 'NRF-CN'],
      Ericsson: ['Cloud Core']
    },
    Transport: {
      Adva: ['FSP 3000'],
      Ciena: ['6500-T12'],
      Nokia: ['1830 PSS-32']
    },
    IPMPLS: {
      Juniper: ['MX960', 'MX204', 'ACX2200', 'ACX7024', 'EX4300-48P', 'EX2200-24T'],
      Cisco: ['ASR920', 'NCS-540', 'C9300-48UXM', 'C9400-LC-48T'],
      Nokia: ['7750', '7750 SR-7'],
      Adva: ['FSP 3000'],
      Edgecore: ['AS7712-32X']
    }
  };
  const ROLE_BY_DOMAIN = {
    RAN: ['GNB', 'ENB', 'BBU', 'RRU'],
    Core: ['AMF', 'UPF', 'SMF', 'NRF'],
    Transport: ['DWDM', 'ROADM', 'OTN', 'MUX'],
    IPMPLS: ['PE', 'AGG', 'ACC', 'CORE', 'EDGE', 'BNG']
  };

  /* Transport/IPMPLS jobs' scope is a real IP range ("172.31.75.0/24 ·
     172.31.79.255/24", i.e. the 3rd octet spans 75–79) or a seed address
     ("Seed 192.168.10.235 · depth 3") — a generated target assigned to one
     of these jobs has to land inside it, the same way a real scan would
     never report a device outside the range it was told to sweep. RAN/Core
     scope reads as a technology + site label ("gNodeB/eNodeB · Bengaluru-
     East"), not an address range, so neither pattern matches there and this
     returns null — the caller's own original formula runs unchanged, which
     is what keeps RAN/Core generation byte-for-byte untouched. */
  const scopeIpFor = (jobRow, i) => {
    const scope = jobRow.scope || '';
    const range = scope.match(/172\.31\.(\d+)\.\d+\/24\s*·\s*172\.31\.(\d+)\.\d+\/24/);
    if (range) {
      const lo = +range[1], hi = +range[2];
      return `172.31.${lo + (i % (hi - lo + 1))}.${10 + (i * 17) % 240}`;
    }
    const seed = scope.match(/Seed\s+(\d+)\.(\d+)\.(\d+)\.\d+/);
    if (seed) return `${seed[1]}.${seed[2]}.${seed[3]}.${10 + (i * 13) % 240}`;
    return null;
  };

  /* one row per unit of runFail, split across reasons exactly as DROPS states;
     the 5 hand-written failures above already carry one of each but dupip, so
     the generated share is trimmed by one apiece to land on 175 in total */
  const reasons = flatten([['unreach', 67], ['timeout', 40], ['auth', 32], ['adapter', 17], ['parse', 8], ['dupip', 6]]);

  reasons.forEach((reason, i) => {
    const circle = CIRCLES[i % CIRCLES.length];
    const jobRow = JOBS[i % JOBS.length];
    const job = jobRow.id;
    const dom = jobRow.domain || 'IPMPLS';
    const domModels = MODELS_BY_DOMAIN[dom] || MODELS_BY_DOMAIN.IPMPLS;
    const domOems = Object.keys(domModels);
    const oem = pick(domOems);
    const model = pick(domModels[oem]);
    const role = pick(ROLE_BY_DOMAIN[dom] || ROLE_BY_DOMAIN.IPMPLS);
    const known = reason !== 'unreach' && reason !== 'timeout';
    const host = known ? `${circle.c}-${model.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${role}-${pad2(10 + i % 88)}` : '—';
    TARGETS.push({
      ip: scopeIpFor(jobRow, i) || `172.31.${100 + (i * 7) % 140}.${20 + (i * 13) % 230}`,
      host, oem: known ? oem : '—', model: known ? model : '—',
      circle: circle.n, sync: getLiveDateSync(2 + i % 7, (i * 11) % 60),
      fresh: 1 + i % 18, job, domain: jobRow.domain,
      ch: chForDomain(['fail', 'na', 'na', 'na', 'na', 'na'], jobRow.domain), out: 'Missing', chip: 'error', reason
    });
  });

  /* devices seen for the first time this cycle: identified, not yet in
     Inventory — the two hand-written rows above are Rogue outcomes of the
     same shape, so the rest follow suit */
  for (let i = 0; i < 66; i++) {
    const circle = CIRCLES[(i + 5) % CIRCLES.length];
    const jobRow = JOBS[(i + 3) % JOBS.length];
    const job = jobRow.id;
    const dom = jobRow.domain || 'IPMPLS';
    const domModels = MODELS_BY_DOMAIN[dom] || MODELS_BY_DOMAIN.IPMPLS;
    const domOems = Object.keys(domModels);
    const oem = pick(domOems);
    const model = pick(domModels[oem]);
    const role = dom === 'RAN' ? (i % 2 === 0 ? 'GNB' : 'ENB') : 'NEW';
    TARGETS.push({
      ip: scopeIpFor(jobRow, i) || `172.31.${140 + (i * 9) % 110}.${30 + (i * 17) % 210}`,
      host: `${circle.c}-${model.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${role}-${pad2(50 + i % 48)}`,
      oem, model, circle: circle.n,
      sync: getLiveDateSync(1 + i % 8, (i * 19) % 60),
      fresh: 1 + i % 12, job, domain: jobRow.domain,
      ch: chForDomain(i % 3 === 0 ? ['ok', 'ok', 'ok', 'na', 'na', 'na'] : ['ok', 'ok', 'ok', 'ok', 'na', 'na'], jobRow.domain),
      out: 'Rogue', chip: 'pink', isNew: true
    });
  }
})();

