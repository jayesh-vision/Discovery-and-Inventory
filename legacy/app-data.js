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
DL.open  = DL.drifted + DL.missing + DL.rogue + DL.unclaimed;

/* ── the six collector families, in run order ───────────── */
const COLLECTORS = [
  { k: 'device',   n: 'Device',   proto: 'SNMP v3',        icon: 'chip',
    what: 'sysObjectID, sysDescr, sysName, uptime → identity and OEM',
    writes: 'Creates or matches the network-element record',
    ok: 2133, fail: 175, na: 0, order: 1 },
  { k: 'hardware', n: 'Hardware', proto: 'NETCONF · CLI',  icon: 'box',
    what: 'Chassis, slots, cards, SFPs, serial numbers, part codes',
    writes: 'Serial, model, card inventory, optical module list',
    ok: 2041, fail: 92, na: 175, order: 2 },
  { k: 'lldp',     n: 'LLDP',     proto: 'SNMP LLDP-MIB',  icon: 'link',
    what: 'Layer-2 neighbour table: local port ↔ remote chassis and port',
    writes: 'Physical adjacency links between two elements',
    ok: 2098, fail: 35, na: 175, order: 3 },
  { k: 'ospf',     n: 'OSPF',     proto: 'SNMP OSPF-MIB',  icon: 'route',
    what: 'IGP adjacencies, areas, router IDs, neighbour states',
    writes: 'Logical routing links, area membership',
    ok: 1412, fail: 63, na: 833, order: 4 },
  { k: 'bgp',      n: 'BGP',      proto: 'SNMP BGP4-MIB',  icon: 'globe',
    what: 'Peer table, local and remote AS, session state',
    writes: 'Logical peering links, AS topology',
    ok: 604, fail: 21, na: 1683, order: 5 },
  { k: 'service',  n: 'Service',  proto: 'NETCONF',        icon: 'layers',
    what: 'VRF, route distinguisher, route targets, attachment interfaces',
    writes: 'L3VPN / L2VPN service instances and their endpoints',
    ok: 1289, fail: 47, na: 972, order: 6 }
];

/* ── the seven pipeline stages a target passes through ──── */
const STAGES = [
  { k: 'scope',   n: 'Scope',        sub: 'Seed and CIDR ranges resolved to gateway IPs', v: 2308, unit: 'targets', tone: 'slate' },
  { k: 'reach',   n: 'Reachability', sub: 'ICMP echo, three attempts, 2 s timeout',        v: 2240, unit: 'reachable', tone: 'sky' },
  { k: 'auth',    n: 'Credential',   sub: 'SNMP v3 / SSH profile bound to the circle',     v: 2199, unit: 'authenticated', tone: 'cyan' },
  { k: 'collect', n: 'Collect',      sub: 'Six collector families, run in dependency order', v: 2133, unit: 'identified', tone: 'purple' },
  { k: 'parse',   n: 'Parse',        sub: 'Vendor adapter turns the payload into facts',   v: 2115, unit: 'parsed', tone: 'indigo' },
  { k: 'match',   n: 'Identity',     sub: 'Four match rules, applied in priority order',   v: 2603, unit: 'resolved', tone: 'amber' },
  { k: 'store',   n: 'Store',        sub: 'Golden record written with per-field provenance', v: 2603, unit: 'written', tone: 'emerald' }
];

/* stage-drop reasons, in order — these sum to the losses above */
const DROPS = [
  { from: 'Scope', to: 'Reachability', n: 68,  why: 'ICMP unreachable — ACL or gateway blocks the collector subnet' },
  { from: 'Reachability', to: 'Credential', n: 41, why: 'SNMP timeout — agent not running or timeout too tight' },
  { from: 'Credential', to: 'Collect', n: 33, why: 'Credential rejected — profile ro-inband-v3 expired 14-Jul-2026' },
  { from: 'Collect', to: 'Parse', n: 18,  why: 'Unsupported sysObjectID — no adapter for 4 OEM / model pairs' },
  { from: 'Parse', to: 'Identity', n: 9,   why: 'Response parse error — CLI banner breaks the fact parser' },
  { from: 'Identity', to: 'Store', n: 6,   why: 'Duplicate management IP — two chassis answering on one address' }
];

/* ── identity resolution: how a payload becomes a record ── */
const MATCH_RULES = [
  { p: 1, rule: 'Chassis serial number', src: 'Hardware collector', conf: 'Exact',
    hits: 1912, note: 'The only globally unique key. Fails when the OEM does not expose it over SNMP.' },
  { p: 2, rule: 'Chassis MAC / base bridge address', src: 'Device collector', conf: 'Exact',
    hits: 341, note: 'Survives a hostname or IP change. Not available on chassis-less virtual routers.' },
  { p: 3, rule: 'sysName + circle', src: 'Device collector', conf: 'Strong',
    hits: 224, note: 'Naming convention is enforced per circle, so collisions are local, not global.' },
  { p: 4, rule: 'Management IP address', src: 'Scope', conf: 'Weak',
    hits: 62, note: 'Last resort. Re-addressing silently creates a duplicate — 6 seen this run.' }
];

/* ── reconciliation outcome ─────────────────────────────── */
const OUTCOME = [
  { k: 'exact',    n: 'Exact match', c: DL.exact,   chip: 'success', tone: 'emerald',
    d: 'Record and network agree on every governed attribute.' },
  { k: 'drifted',  n: 'Drifted',     c: DL.drifted, chip: 'warning', tone: 'amber',
    d: 'Matched, but one or more governed attributes differ.' },
  { k: 'stale',    n: 'Stale',       c: DL.stale,   chip: 'orange',  tone: 'orange',
    d: 'Matched, but last verified beyond the freshness SLA.' },
  { k: 'missing',  n: 'Missing',     c: DL.missing, chip: 'error',   tone: 'red',
    d: 'In the master, did not answer the last three runs.' },
  { k: 'rogue',    n: 'Rogue',       c: DL.rogue,   chip: 'pink',    tone: 'fuchsia',
    d: 'Answering on the network, no record in the master.' },
  { k: 'unclaimed',n: 'Unclaimed',   c: DL.unclaimed, chip: 'purple',tone: 'purple',
    d: 'Identified, but no match rule resolved it to a record.' }
];

/* ── what discovery can and cannot see ──────────────────── */
const TAXONOMY = [
  { cls: 'Router',   axisA: 'Active',  axisB: 'Physical', master: 2148, seen: 2114,
    coll: 'Device · Hardware · LLDP · OSPF · BGP · Service', cover: 'full' },
  { cls: 'Switch',   axisA: 'Active',  axisB: 'Physical', master: 349, seen: 283,
    coll: 'Device · Hardware · LLDP', cover: 'full' },
  { cls: 'Server',   axisA: 'Active',  axisB: 'Physical', master: 96, seen: 0,
    coll: 'none — no collector defined', cover: 'none' },
  { cls: 'DWDM / optical', axisA: 'Active', axisB: 'Physical', master: 78, seen: 0,
    coll: 'none — needs TL1 or vendor NMS northbound', cover: 'none' },
  { cls: 'eNodeB',   axisA: 'Active',  axisB: 'Physical', master: 18, seen: 0,
    coll: 'none — held in the EMS, never polled', cover: 'none' },
  { cls: 'gNodeB',   axisA: 'Active',  axisB: 'Physical', master: 14, seen: 0,
    coll: 'none — held in the EMS, never polled', cover: 'none' },
  { cls: 'VNF · vDU / CU-CP / CU-UP', axisA: 'Active', axisB: 'Virtual', master: 28, seen: 0,
    coll: 'none — USM / EMS integration, not SNMP', cover: 'none' },
  { cls: 'Links · LLDP / OSPF / BGP / ISIS', axisA: '—', axisB: 'Logical', master: 7846, seen: 7702,
    coll: 'LLDP · OSPF · BGP', cover: 'full' },
  { cls: 'Services · L3VPN / L2VPN', axisA: '—', axisB: 'Logical', master: 2457, seen: 2311,
    coll: 'Service', cover: 'full' },
  { cls: 'Fiber span · ODF · splice · rack', axisA: 'Passive', axisB: 'Physical', master: 5120, seen: 0,
    coll: 'none — no electronic source exists', cover: 'blind' }
];

/* ── scan-target rows ───────────────────────────────────── */
const CH = { ok: 'ok', fail: 'fail', na: 'na', run: 'run', wait: 'wait' };
const TARGETS = [
  { ip: '192.168.10.235', host: 'SP-CNOC-LAB-J204-PE-T3-NR1', oem: 'Juniper', model: 'MX204',
    circle: 'Karnataka', sync: '01-Sep-2026 09:19', fresh: 3, job: 'DSC-LAB-SEED',
    ch: ['ok','ok','ok','fail','na','na'], out: 'Drifted', chip: 'warning', reason: 'timeout' },
  { ip: '172.31.33.100', host: 'NDLS-J960-P_R1-T1-NR', oem: 'Juniper', model: 'MX960',
    circle: 'Delhi', sync: '01-Sep-2026 09:10', fresh: 3, job: 'DSC-DEL-EDGE',
    ch: ['ok','ok','ok','ok','ok','ok'], out: 'Exact match', chip: 'success' },
  { ip: '172.31.34.0', host: 'CHE-920-WIFI-R2', oem: 'Cisco', model: 'ASR920',
    circle: 'Tamil Nadu', sync: '03-Aug-2026 02:14', fresh: 720, job: 'DSC-TN-ACCESS',
    ch: ['ok','ok','ok','ok','na','ok'], out: 'Stale', chip: 'orange' },
  { ip: '172.31.41.84', host: '—', oem: '—', model: '—',
    circle: 'Andhra Pradesh', sync: '21-Jan-2025 03:02', fresh: 14400, job: 'DSC-AP-ACCESS',
    ch: ['fail','na','na','na','na','na'], out: 'Missing', chip: 'error', reason: 'unreach' },
  { ip: '172.31.41.212', host: 'BLR-ACX7024-UNREG-01', oem: 'Juniper', model: 'ACX7024',
    circle: 'Karnataka', sync: '01-Sep-2026 08:44', fresh: 4, job: 'DSC-SOUTH-CORE',
    ch: ['ok','ok','ok','ok','na','na'], out: 'Rogue', chip: 'pink', isNew: true },
  { ip: '172.31.49.88', host: '—', oem: 'Nokia', model: '7750 SR-7',
    circle: 'Andhra Pradesh', sync: '01-Sep-2026 02:31', fresh: 10, job: 'DSC-AP-ACCESS',
    ch: ['ok','fail','fail','na','na','na'], out: 'Unclaimed', chip: 'purple', reason: 'parse' },
  { ip: '172.31.61.10', host: 'ODI-ACX2200-PE-T4', oem: 'Juniper', model: 'ACX2200',
    circle: 'Odisha', sync: '31-Aug-2026 02:30', fresh: 31, job: 'DSC-ODI-ACCESS',
    ch: ['ok','ok','ok','ok','ok','fail'], out: 'Drifted', chip: 'warning', reason: 'auth' },
  { ip: '172.31.39.144', host: 'INDR-C9300-TEMP', oem: 'Cisco', model: 'C9300-48UXM',
    circle: 'Madhya Pradesh', sync: '01-Sep-2026 02:00', fresh: 7, job: 'DSC-INDR-ACCESS',
    ch: ['ok','ok','ok','na','na','na'], out: 'Rogue', chip: 'pink', isNew: true },
  { ip: '172.31.47.144', host: 'WR-ADVA-FSP3000-01', oem: 'Adva', model: 'FSP 3000',
    circle: 'Maharashtra', sync: '19-Nov-2025 04:00', fresh: 6960, job: 'DSC-DWDM-RING',
    ch: ['fail','na','na','na','na','na'], out: 'No adapter', chip: 'neutral', reason: 'adapter' },
  { ip: '172.31.53.186', host: 'VZG-N540X-PE-T4-NR', oem: 'Cisco', model: 'NCS-540',
    circle: 'Andhra Pradesh', sync: '01-Sep-2026 02:30', fresh: 10, job: 'DSC-AP-ACCESS',
    ch: ['ok','ok','ok','ok','ok','ok'], out: 'Exact match', chip: 'success' },
  { ip: '172.31.31.2', host: 'BGLK-EX4300-T-CHR-07', oem: 'Juniper', model: 'EX4300-48P',
    circle: 'Karnataka', sync: '11-Nov-2025 09:12', fresh: 7104, job: 'DSC-SOUTH-CORE',
    ch: ['ok','ok','ok','na','na','na'], out: 'Stale', chip: 'orange' },
  { ip: '172.31.35.207', host: 'DEL-N540X-SPARE', oem: 'Cisco', model: 'NCS-540',
    circle: 'Delhi', sync: '01-Sep-2026 03:00', fresh: 9, job: 'DSC-DEL-EDGE',
    ch: ['ok','ok','ok','ok','ok','na'], out: 'Rogue', chip: 'pink' }
];

/* ── run transcript, one target, all six collectors ─────── */
const TRANSCRIPT = {
  ip: '172.31.33.100', host: 'NDLS-J960-P_R1-T1-NR', job: 'DSC-DEL-EDGE',
  started: '01-Sep-2026 09:10:02 IST', total: '6.42 s', collector: 'clr-del-01', cred: 'ro-inband-v3',
  steps: [
    { k: 'reach', n: 'Reachability', proto: 'ICMP', state: 'ok', ms: 34, bytes: 192,
      req: 'ping -c 3 -W 2 172.31.33.100',
      res: '3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max/mdev = 0.031/0.036/0.044/0.005 ms',
      wrote: 'reachable = true' },
    { k: 'device', n: 'Device', proto: 'SNMP v3', state: 'ok', ms: 212, bytes: 486,
      req: 'snmpget -v3 -l authPriv -u ro-inband-v3 172.31.33.100 \\\n  sysObjectID.0 sysDescr.0 sysName.0 sysUpTime.0',
      res: 'sysObjectID.0 = OID: .1.3.6.1.4.1.2636.1.1.1.2.57\nsysDescr.0   = "Juniper Networks, Inc. mx960 internet router, kernel JUNOS 21.2R3-S8.5"\nsysName.0    = "NDLS-J960-P_R1-T1-NR"\nsysUpTime.0  = 412834500  (47d 18h 12m)',
      wrote: 'oem = JUNIPER (derived from OID .2636) · model = MX960 · sysName · uptime' },
    { k: 'hardware', n: 'Hardware', proto: 'NETCONF', state: 'ok', ms: 1140, bytes: 24610,
      req: '<rpc><get-chassis-inventory/></rpc>',
      res: 'chassis            MX960              serial JN1236F87AFB\n  FPC 0            MPC7E-10G          serial ABCD1234\n  PIC 0/0          10x10GE SFPP       serial EFGH5678\n  Xcvr 0/0/1       SFP+-10G-LR        serial JKLM9012\n  ... 47 more components',
      wrote: 'serial JN1236F87AFB · 51 hardware components · 16 optical modules' },
    { k: 'lldp', n: 'LLDP', proto: 'SNMP LLDP-MIB', state: 'ok', ms: 640, bytes: 8842,
      req: 'snmpwalk -v3 -u ro-inband-v3 172.31.33.100 \\\n  1.0.8802.1.1.2.1.4.1.1  (lldpRemTable)',
      res: 'lldpRemSysName.1.5.1  = "PSA-C920-WIFI1-T4-ER"   port Gi0/0/1\nlldpRemSysName.1.9.1  = "PSA-C920-WIFI1-T4-ER"   port Te0/0/12.SI.612\n… 17 more neighbours',
      wrote: '19 adjacency links · 18 matched to existing links, 1 new' },
    { k: 'ospf', n: 'OSPF', proto: 'SNMP OSPF-MIB', state: 'ok', ms: 1980, bytes: 3204,
      req: 'snmpwalk -v3 -u ro-inband-v3 172.31.33.100 \\\n  1.3.6.1.2.1.14.10.1  (ospfNbrTable)',
      res: 'ospfNbrRtrId.172.31.33.101.0 = 172.31.33.101   state full(8)\nospfNbrRtrId.172.31.33.109.0 = 172.31.33.109   state full(8)\n… 10 more adjacencies, area 0.0.0.0',
      wrote: '12 logical routing links · area 0.0.0.0 membership' },
    { k: 'bgp', n: 'BGP', proto: 'SNMP BGP4-MIB', state: 'ok', ms: 1210, bytes: 1188,
      req: 'snmpwalk -v3 -u ro-inband-v3 172.31.33.100 \\\n  1.3.6.1.2.1.15.3.1  (bgpPeerTable)',
      res: 'bgpPeerState.172.31.53.252   = established(6)   remoteAs 24186\nbgpPeerState.172.31.53.249   = established(6)   remoteAs 24186\n… 2 more peers',
      wrote: '4 peering links · local AS 24186' },
    { k: 'service', n: 'Service', proto: 'NETCONF', state: 'ok', ms: 1206, bytes: 41208,
      req: '<rpc><get-configuration><configuration>\n  <routing-instances/></configuration></get-configuration></rpc>',
      res: 'instance CGDA           type vrf   rd 24186:1015707\n  interface FortyGigE0/0/0/28.100\n  vrf-target 24186:900287, 24186:888970\ninstance SAFE-CITY-SW-MGMT  type vrf  rd 24186:1016096\n… 12 more instances',
      wrote: '14 L3VPN instances · 14 attachment interfaces · 27 route targets' }
  ]
};

/* the failure variant, shown side by side */
const FAIL_STEP = {
  n: 'OSPF', proto: 'SNMP OSPF-MIB', ms: 3000,
  req: 'snmpwalk -v3 -u ro-inband-v3 172.31.41.84 1.3.6.1.2.1.14.10.1',
  res: 'Timeout: No Response from 172.31.41.84',
  reason: 'SNMP_TIMEOUT', action: 'Retry at 8000 ms on the next pass; escalate to the circle NOC after 3 consecutive timeouts.'
};

/* ── circles: exceptions plotted the way an ops team acts ── */
const CIRCLES = [
  { c: 'JK', n: 'Jammu & Kashmir', x: 2, y: 0, master: 41,  rogue: 1,  missing: 2,  drift: 4 },
  { c: 'PB', n: 'Punjab',          x: 2, y: 1, master: 88,  rogue: 3,  missing: 2,  drift: 9 },
  { c: 'HR', n: 'Haryana',         x: 3, y: 1, master: 74,  rogue: 2,  missing: 1,  drift: 8 },
  { c: 'UK', n: 'Uttarakhand',     x: 4, y: 1, master: 36,  rogue: 1,  missing: 1,  drift: 3 },
  { c: 'DL', n: 'Delhi',           x: 3, y: 2, master: 176, rogue: 16, missing: 8,  drift: 31 },
  { c: 'UP', n: 'Uttar Pradesh',   x: 4, y: 2, master: 221, rogue: 14, missing: 11,  drift: 38 },
  { c: 'BR', n: 'Bihar',           x: 5, y: 2, master: 112, rogue: 5,  missing: 4,  drift: 14 },
  { c: 'AS', n: 'Assam & NE',      x: 6, y: 2, master: 68,  rogue: 3,  missing: 3,  drift: 8 },
  { c: 'RJ', n: 'Rajasthan',       x: 2, y: 3, master: 138, rogue: 9,  missing: 7,  drift: 21 },
  { c: 'MP', n: 'Madhya Pradesh',  x: 3, y: 3, master: 194, rogue: 20, missing: 10,  drift: 34 },
  { c: 'CG', n: 'Chhattisgarh',    x: 4, y: 3, master: 61,  rogue: 2,  missing: 2,  drift: 7 },
  { c: 'JH', n: 'Jharkhand',       x: 5, y: 3, master: 54,  rogue: 2,  missing: 2,  drift: 6 },
  { c: 'WB', n: 'West Bengal',     x: 6, y: 3, master: 127, rogue: 6,  missing: 5,  drift: 19 },
  { c: 'GJ', n: 'Gujarat',         x: 1, y: 4, master: 152, rogue: 10,  missing: 7,  drift: 23 },
  { c: 'MH', n: 'Maharashtra',     x: 2, y: 4, master: 248, rogue: 13, missing: 11,  drift: 31 },
  { c: 'OR', n: 'Odisha',          x: 5, y: 4, master: 121, rogue: 11,  missing: 16, drift: 18 },
  { c: 'TS', n: 'Telangana',       x: 3, y: 5, master: 134, rogue: 6,  missing: 4,  drift: 17 },
  { c: 'AP', n: 'Andhra Pradesh',  x: 4, y: 5, master: 143, rogue: 18, missing: 14, drift: 26 },
  { c: 'KA', n: 'Karnataka',       x: 2, y: 6, master: 211, rogue: 14, missing: 6,  drift: 36 },
  { c: 'TN', n: 'Tamil Nadu',      x: 3, y: 7, master: 154, rogue: 3,  missing: 1,  drift: 27 },
  { c: 'KL', n: 'Kerala',          x: 2, y: 7, master: 92,  rogue: 1,  missing: 1,  drift: 12 },
  { c: 'NE', n: 'North East',      x: 6, y: 1, master: 58,  rogue: 0,  missing: 0,  drift: 0 }
];
CIRCLES.forEach(c => c.exc = c.rogue + c.missing + c.drift);

const FRESHNESS = [
  { n: 'Under 24 h',   c: 1142, tone: 'emerald' },
  { n: '1 – 7 days',   c: 786,  tone: 'green' },
  { n: '7 – 30 days',  c: 402,  tone: 'amber' },
  { n: '30 – 90 days', c: 189,  tone: 'orange' },
  { n: 'Over 90 days', c: 84,   tone: 'red' }
];

const DRIFT_ROWS = [
  { asset: 'SP-CNOC-LAB-J204-PE-T3-NR1', ip: '172.31.86.61', field: 'OEM name',
    master: 'QUANTA', network: 'JUNIPER', src: 'sysObjectID .2636', conf: 'Exact', age: '3 h' },
  { asset: 'CHE-J2.2K-PE-T4-ER', ip: '172.31.61.140', field: 'OEM name',
    master: 'HP', network: 'JUNIPER', src: 'model ACX2200', conf: 'Exact', age: '3 h' },
  { asset: 'KA-BGLK-277-T-CHR-08', ip: '172.31.31.204', field: 'OEM name',
    master: 'HP', network: 'CISCO', src: 'model C9300-48UXM', conf: 'Exact', age: '6 h' },
  { asset: 'ET-J960-P-T1-WR', ip: '172.31.31.97', field: 'OS version',
    master: '21.2R3-S9.21', network: '21.4R3-S5.5', src: 'sysDescr', conf: 'Exact', age: '3 h' },
  { asset: 'NDD-J2.2K-PE-T4-SR', ip: '192.168.1.11', field: 'Model name',
    master: 'QuantaMesh BMS T3048-LY9', network: 'EX4300-48P', src: 'chassis inventory', conf: 'Exact', age: '5 h' },
  { asset: 'ERS-J480-UP-T1-SR', ip: '172.31.31.141', field: 'Circle',
    master: 'Karnataka', network: 'Madhya Pradesh', src: 'LLDP neighbour set', conf: 'Strong', age: '3 h' },
  { asset: '5 routers at KA-BGLK-277', ip: 'various', field: 'Serial number',
    master: 'FW488AS342W ×5', network: '5 distinct serials', src: 'chassis inventory', conf: 'Exact', age: '3 h' }
];

/* Attributes the device itself reports, so a mismatch here is a real conflict
   between what the network says and what the record says. Circle/site is an
   assignment made in inventory, never reported by the device — it belongs to
   the location record, not a discovery collector, so it does not belong here. */
const DRIFT_BY_FIELD = [
  { n: 'OEM name',      c: 118, tone: 'red' },
  { n: 'OS version',    c: 104, tone: 'amber' },
  { n: 'Model name',    c: 61,  tone: 'amber' },
  { n: 'Serial number', c: 54,  tone: 'red' },
  { n: 'Interface set', c: 22,  tone: 'orange' }
];

const MISSING_ROWS = [
  { ip: '172.31.41.133', type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Andhra Pradesh',
    lat: '18.756756', lon: '84.423226', last: '21-Jan-2025', runs: 486, why: 'ICMP unreachable' },
  { ip: '172.31.41.134', type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Andhra Pradesh',
    lat: '18.756756', lon: '84.423226', last: '21-Jan-2025', runs: 486, why: 'ICMP unreachable' },
  { ip: '172.31.61.10',  type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Odisha',
    lat: '20.143881', lon: '85.115634', last: '19-Nov-2025', runs: 287, why: 'ICMP unreachable' },
  { ip: '172.31.61.8',   type: 'Router', oem: 'Juniper', model: 'ACX2200', circle: 'Odisha',
    lat: '19.621150', lon: '83.498749', last: '19-Nov-2025', runs: 287, why: 'ICMP unreachable' },
  { ip: '172.31.33.130', type: 'Router', oem: 'Nokia',   model: '7750',    circle: 'Tamil Nadu',
    lat: '13.082680', lon: '80.270721', last: '14-Dec-2025', runs: 261, why: 'SNMP timeout' },
  { ip: '172.31.47.106', type: 'Switch', oem: 'Ciena',   model: 'L2-ACCESS-24P', circle: 'Maharashtra',
    lat: '19.075983', lon: '72.877655', last: '26-Jan-2025', runs: 481, why: 'Credential rejected' }
];

const ROGUE_ROWS = [
  { ip: '172.31.41.212', host: 'BLR-ACX7024-UNREG-01', oem: 'Juniper', model: 'ACX7024', circle: 'Karnataka',
    first: '18-Aug-2026', nb: 'BGLK-277-T-CHR-01 Gi0/0/4', why: 'Answers SNMP, no master record, no workorder', sev: 'error' },
  { ip: '172.31.39.144', host: 'INDR-C9300-TEMP', oem: 'Cisco', model: 'C9300-48UXM', circle: 'Madhya Pradesh',
    first: '22-Aug-2026', nb: 'MP-INDR-275-SW-02 Te1/1/1', why: 'Serial matches a record marked Faulty / RMA', sev: 'error' },
  { ip: '172.31.35.207', host: 'DEL-N540X-SPARE', oem: 'Cisco', model: 'NCS-540', circle: 'Delhi',
    first: '27-Aug-2026', nb: 'DEL-279-PE-T4-NR xe-0/3/1', why: 'Master says Decommissioned — still forwarding', sev: 'error' },
  { ip: '172.31.49.88', host: '—', oem: 'Nokia', model: '7750 SR-7', circle: 'Andhra Pradesh',
    first: '29-Aug-2026', nb: 'none returned', why: 'No sysName, no LLDP neighbours — cannot be placed', sev: 'warning' },
  { ip: '172.31.33.190', host: 'LAB-EX2200-24T', oem: 'Juniper', model: 'EX2200-24T', circle: 'Karnataka',
    first: '01-Sep-2026', nb: 'BGLK-277-T-CHR-04 ge-0/0/9', why: 'Lab device reachable from a production subnet', sev: 'warning' }
];

const EXCEPTIONS = [
  { id: 'RX-4501', state: 'Rogue',     chip: 'pink',    subj: 'BLR-ACX7024-UNREG-01', circle: 'Karnataka',
    detected: '18-Aug-2026', owner: 'Unassigned', age: 14, sla: 'Breached', next: 'Raise onboarding workorder' },
  { id: 'RX-4412', state: 'Drifted',   chip: 'warning', subj: 'OEM name · 118 records', circle: 'All',
    detected: '23-Aug-2026', owner: 'Harish Kumar', age: 9,  sla: 'Breached', next: 'Accept network as truth (bulk)' },
  { id: 'RX-4530', state: 'Missing',   chip: 'error',   subj: '172.31.41.133 / .134', circle: 'Andhra Pradesh',
    detected: '26-Aug-2026', owner: 'Anjali Verma', age: 6,  sla: 'At risk',  next: 'Field check, then retire or restore' },
  { id: 'RX-4552', state: 'Duplicate', chip: 'error',   subj: 'Serial FW488AS342W ×5', circle: 'Karnataka',
    detected: '11-Aug-2026', owner: 'Unassigned', age: 21, sla: 'Breached', next: 'Re-run Hardware collector, split records' },
  { id: 'RX-4560', state: 'Unclaimed', chip: 'purple',  subj: '172.31.49.88', circle: 'Andhra Pradesh',
    detected: '29-Aug-2026', owner: 'Unassigned', age: 3,  sla: 'On track', next: 'Add match rule or enrich sysName' },
  { id: 'RX-4571', state: 'No adapter',chip: 'neutral', subj: 'Adva FSP 3000 · 78 units', circle: 'All',
    detected: '19-Nov-2025', owner: 'Architecture', age: 286, sla: 'Breached', next: 'Build TL1 collector, or drop from scope' }
];

const DISPOSITIONS = [
  { n: 'Accept network', d: 'The network is right. The master record is updated from discovered facts and the exception closes.', tone: 'emerald' },
  { n: 'Accept record',  d: 'The master is right. The discovered value is quarantined and the asset is flagged for a field check.', tone: 'sky' },
  { n: 'Raise workorder',d: 'Neither is right yet. A change is needed on the network; the exception stays open, linked to the workorder.', tone: 'amber' },
  { n: 'Approve exception', d: 'Known and accepted — a lab device, a vendor trial. Requires an expiry date; reopens automatically.', tone: 'purple' }
];

const GAPS = [
  { n: 'Discovery has no job object', sev: 'Blocking',
    now: 'Rows are gateway IPs. There is no schedule, collector, credential profile or run history behind them, so “Last sync on” spanning Jan-2025 to Sep-2026 has no explanation.',
    fix: 'A scan job owns scope, collector, credentials and schedule. Every target result belongs to a run of a job.' },
  { n: 'The six statuses are not a chain', sev: 'Blocking',
    now: 'Device status is blank on rows where LLDP, OSPF and Service all read Completed. Four independent columns cannot express “skipped because the step before failed”.',
    fix: 'One dependency chain per target, with five states: passed, failed, skipped, not applicable, waiting.' },
  { n: '“Failed” carries no reason', sev: 'Blocking',
    now: 'A red chip and nothing else. Nobody can tell an ACL problem from an expired credential from a missing MIB.',
    fix: 'Six typed reasons, each with a next action and an owner.' },
  { n: 'Request/Response is a wall of accordions', sev: 'Major',
    now: 'Twelve panels of raw text with no timestamp, duration, size, or consequence. The same payload appears under several headings.',
    fix: 'A run timeline: one row per collector with timing, payload size, and what it wrote to inventory.' },
  { n: 'There is no reconciliation surface', sev: 'Blocking',
    now: 'The module is named Discovery and Reconciliation. Reconciliation is one donut — Discovered against Missing.',
    fix: 'Match rules, six outcome states, attribute-level drift, rogue and missing registers, and an exception queue with dispositions.' },
  { n: 'Coverage is never stated', sev: 'Major',
    now: 'Only Router and Switch are ever discovered. Server, DWDM, eNodeB, gNodeB, VNF and all passive plant have no collector, and nothing on screen says so.',
    fix: 'A coverage matrix on the overview: what discovery can see, what it cannot, and why.' },
  { n: 'The map shows everything, so it shows nothing', sev: 'Minor',
    now: 'One cluster pin reading 100 over central India. Zooming is the only interaction.',
    fix: 'Plot exceptions by circle, not devices — the unit an ops team is actually organised around.' },
  { n: 'Two totals for one quantity', sev: 'Major',
    now: 'On one screen: “Discovered devices by type 2609” and “Discovered devices by vendor 2603”. Both claim to be the discovered set.',
    fix: 'One ledger, rendered, with every derived total traced back to it.' }
];

/* ── scan jobs ──────────────────────────────────────────── */
const JOBS = [
  { id: 'DSC-SOUTH-CORE', site: 'Karnataka · south core', scope: '172.31.31.0/24 · 172.31.33.0/24',
    collector: 'clr-blr-02', cred: 'ro-inband-v3', sched: 'Every 6 h', next: 'today 15:00',
    last: '01-Sep-2026 09:10', dur: '13 m 44 s', targets: 412, clean: 355, partial: 43, fail: 14,
    state: 'Completed', chip: 'success' },
  { id: 'DSC-INDR-ACCESS', site: 'Madhya Pradesh · Indore access', scope: '172.31.39.0/24 · 172.31.41.0/24',
    collector: 'clr-indr-01', cred: 'ro-inband-v3', sched: 'Daily 02:00', next: 'tomorrow 02:00',
    last: '01-Sep-2026 02:00', dur: '41 m 02 s', targets: 388, clean: 289, partial: 62, fail: 37,
    state: 'Completed with errors', chip: 'warning' },
  { id: 'DSC-DEL-EDGE', site: 'Delhi · edge', scope: '172.31.35.0/24',
    collector: 'clr-del-01', cred: 'ro-oob-v2', sched: 'Daily 03:00', next: 'tomorrow 03:00',
    last: '01-Sep-2026 03:00', dur: '22 m 18 s', targets: 341, clean: 305, partial: 32, fail: 4,
    state: 'Completed', chip: 'success' },
  { id: 'DSC-AP-ACCESS', site: 'Andhra Pradesh · access', scope: '172.31.49.0/24 · 172.31.53.0/24',
    collector: 'clr-vzg-01', cred: 'ro-inband-v3', sched: 'Daily 02:30', next: 'held',
    last: '01-Sep-2026 02:30', dur: '58 m 11 s', targets: 356, clean: 241, partial: 44, fail: 71,
    state: 'Completed with errors', chip: 'error' },
  { id: 'DSC-ODI-ACCESS', site: 'Odisha · access', scope: '172.31.61.0/24',
    collector: 'clr-bbs-01', cred: 'ro-inband-v3', sched: 'Daily 02:30', next: 'tomorrow 02:30',
    last: '31-Aug-2026 02:30', dur: '19 m 46 s', targets: 264, clean: 214, partial: 33, fail: 17,
    state: 'Completed', chip: 'success' },
  { id: 'DSC-TN-ACCESS', site: 'Tamil Nadu · access', scope: '172.31.34.0/24 · 172.31.38.0/24',
    collector: 'clr-mas-01', cred: 'ro-inband-v3', sched: 'Weekly Sun 02:00', next: 'Sun 02:00',
    last: '03-Aug-2026 02:14', dur: '24 m 09 s', targets: 285, clean: 246, partial: 30, fail: 9,
    state: 'Completed', chip: 'success' },
  { id: 'DSC-DWDM-RING', site: 'Maharashtra · transport ring', scope: '172.31.47.0/24 · 172.31.48.0/24',
    collector: 'clr-blr-02', cred: 'ro-optical-v3', sched: 'Weekly Sun 04:00', next: 'Sun 04:00',
    last: '19-Nov-2025 04:00', dur: '08 m 51 s', targets: 176, clean: 132, partial: 26, fail: 18,
    state: 'No adapter', chip: 'neutral' },
  { id: 'DSC-LAB-SEED', site: 'Lab · CNOC', scope: 'Seed 192.168.10.235 · depth 3',
    collector: 'clr-lab-01', cred: 'lab-rw-v2', sched: 'On demand', next: '—',
    last: '01-Sep-2026 09:19', dur: '02 m 07 s', targets: 86, clean: 60, partial: 21, fail: 5,
    state: 'Running', chip: 'info' }
];

/* grown to a twelve-row sample */
JOBS.push(...[
  ['DSC-WEST-EDGE','Maharashtra · west edge','172.31.41.0/24','clr-pun-01','ro-inband-v3','Every 12 h','today 21:00','01-Sep-2026 09:00','9 m 12 s',268,231,29,8,'Completed','success'],
  ['DSC-EAST-AGG','West Bengal · aggregation','172.31.87.0/24','clr-kol-01','ro-inband-v3','Daily','tomorrow 02:00','01-Sep-2026 02:00','11 m 40 s',196,164,24,8,'Completed','success'],
  ['DSC-NORTH-ACCESS','Delhi NCR · access','172.31.35.0/24','clr-del-02','ro-oob-v3','Every 6 h','today 18:00','01-Sep-2026 12:04','7 m 02 s',324,289,26,9,'Completed','success'],
  ['DSC-DWDM-OPTICAL','All circles · optical layer','172.31.47.0/24','clr-blr-03','netconf-optical','Weekly','05-Sep-2026 01:00','29-Aug-2026 01:00','21 m 18 s',78,61,12,5,'Completed','success']
].map(a => ({ id:a[0], site:a[1], scope:a[2], collector:a[3], cred:a[4], sched:a[5], next:a[6],
  last:a[7], dur:a[8], targets:a[9], clean:a[10], partial:a[11], fail:a[12], state:a[13], chip:a[14] })));

const RUN_HISTORY = [
  { run: 4412, at: '01-Sep-2026 09:10:02', dur: '6.42 s', steps: '7 of 7', out: 'Exact match', chip: 'success', note: 'No change' },
  { run: 4398, at: '31-Aug-2026 03:11:40', dur: '6.11 s', steps: '7 of 7', out: 'Exact match', chip: 'success', note: 'No change' },
  { run: 4381, at: '30-Aug-2026 03:09:18', dur: '9.87 s', steps: '6 of 7', out: 'Drifted', chip: 'warning', note: 'OS version 21.2R3-S8.4 → S8.5 · accepted network' },
  { run: 4364, at: '29-Aug-2026 03:08:55', dur: '3.02 s', steps: '4 of 7', out: 'Partial', chip: 'error', note: 'OSPF timed out · Service skipped' }
];

const ADJACENCY = [
  { proto: 'LLDP', c: 19, ok: 18, chg: '1 new neighbour', tone: 'sky' },
  { proto: 'OSPF', c: 12, ok: 12, chg: 'no change', tone: 'cyan' },
  { proto: 'BGP',  c: 4,  ok: 4,  chg: 'no change', tone: 'purple' },
  { proto: 'L3VPN', c: 14, ok: 13, chg: '1 RT added', tone: 'emerald' }
];

/* ── field provenance for the sample record ─────────────── */
const PROV = [
  { f: 'Management IP', v: '172.31.33.100',   src: 'Scope',                when: 'this run',   ok: true },
  { f: 'Vendor',        v: 'JUNIPER',         src: 'Derived · sysObjectID', when: '3h ago',    ok: true },
  { f: 'Model',         v: 'MX960',           src: 'Device collector',     when: '3h ago',     ok: true },
  { f: 'Serial number', v: 'JN1236F87AFB',    src: 'Hardware collector',   when: '3h ago',     ok: true },
  { f: 'OS version',    v: '21.2R3-S8.5',     src: 'Device collector',     when: '3h ago',     ok: true },
  { f: 'Uptime',        v: '47 d 18 h',       src: 'Device collector',     when: '3h ago',     ok: true },
  { f: 'Adjacencies',   v: '19 LLDP · 12 OSPF · 4 BGP', src: 'LLDP · OSPF · BGP', when: '3h ago',  ok: true },
  { f: 'Services',      v: '14 L3VPN instances', src: 'Service collector', when: '3h ago',     ok: true },
  { f: 'Circle · site', v: 'Delhi · DEL-279',  src: 'Manual',              when: '21-Jul-2026', ok: true },
  { f: 'Stock state',   v: 'Deployed',         src: 'Workorder WO-2291',   when: '02-Mar-2024', ok: true },
  { f: 'Warranty ends', v: 'Not linked',       src: 'ERP · not integrated', when: '—',         ok: false }
];

/* ── network elements: both sides of the comparison, row by row ─── */
/* inv = what the inventory record says · net = what discovery found */
const NE_RECON = [
  { ne:'NDLS-J960-P_R1-T1-NR', ip:'172.31.33.100', circle:'Delhi', rule:'Serial', out:'Agree', chip:'success', ver:'3h ago',
    inv:{oem:'JUNIPER', model:'MX960', os:'21.2R3-S8.5', sn:'JN1236F87AFB'},
    net:{oem:'JUNIPER', model:'MX960', os:'21.2R3-S8.5', sn:'JN1236F87AFB'}, diff:[] },
  { ne:'VZG-N540X-PE-T4-NR', ip:'172.31.53.186', circle:'Andhra Pradesh', rule:'Serial', out:'Agree', chip:'success', ver:'10 h ago',
    inv:{oem:'CISCO', model:'NCS-540', os:'7.9.2', sn:'FW488AS342W'},
    net:{oem:'CISCO', model:'NCS-540', os:'7.9.2', sn:'FW488AS342W'}, diff:[] },
  { ne:'DND-ART-98-PE-T4-NR', ip:'172.31.44.18', circle:'Tamil Nadu', rule:'Chassis MAC', out:'Agree', chip:'success', ver:'5 h ago',
    inv:{oem:'JUNIPER', model:'ACX7024', os:'23.2R1-S2.6', sn:'FL2423AN0050'},
    net:{oem:'JUNIPER', model:'ACX7024', os:'23.2R1-S2.6', sn:'FL2423AN0050'}, diff:[] },
  { ne:'SP-CNOC-LAB-J204-PE-T3-NR1', ip:'172.31.86.61', circle:'Karnataka', rule:'Serial', out:'Differ', chip:'warning', ver:'3h ago',
    inv:{oem:'QUANTA', model:'MX204', os:'21.4R3-S5.5', sn:'FW488AS342W'},
    net:{oem:'JUNIPER', model:'MX204', os:'21.4R3-S5.5', sn:'FW488AS342W'}, diff:['oem'] },
  { ne:'CHE-J2.2K-PE-T4-ER', ip:'172.31.61.140', circle:'Tamil Nadu', rule:'Serial', out:'Differ', chip:'warning', ver:'3h ago',
    inv:{oem:'HP', model:'ACX2200', os:'21.2R3-S8.5', sn:'PJ0215230255'},
    net:{oem:'JUNIPER', model:'ACX2200', os:'21.4R3-S5.5', sn:'PJ0215230255'}, diff:['oem','os'] },
  { ne:'KA-BGLK-277-T-CHR-08', ip:'172.31.31.204', circle:'Karnataka', rule:'Chassis MAC', out:'Differ', chip:'warning', ver:'6 h ago',
    inv:{oem:'HP', model:'C9300-48UXM', os:'17.9.4', sn:'SW-CHR-CORE-4499'},
    net:{oem:'CISCO', model:'C9300-48UXM', os:'17.9.4', sn:'SW-CHR-CORE-4499'}, diff:['oem'] },
  { ne:'ET-J960-P-T1-WR', ip:'172.31.31.97', circle:'Karnataka', rule:'Serial', out:'Differ', chip:'warning', ver:'3h ago',
    inv:{oem:'JUNIPER', model:'MX960', os:'21.2R3-S9.21', sn:'JN1234C25AFA'},
    net:{oem:'JUNIPER', model:'MX960', os:'21.4R3-S5.5', sn:'JN1234C25AFA'}, diff:['os'] },
  { ne:'NDD-J2.2K-PE-T4-SR', ip:'192.168.1.11', circle:'Karnataka', rule:'Serial', out:'Differ', chip:'warning', ver:'5 h ago',
    inv:{oem:'JUNIPER', model:'QuantaMesh T3048-LY9', os:'3.2.0.4', sn:'QCT3048NDD11A01'},
    net:{oem:'JUNIPER', model:'EX4300-48P', os:'3.2.0.4', sn:'QCT3048NDD11A01'}, diff:['model'] },
  { ne:'CHE-920-WIFI-R2', ip:'172.31.34.0', circle:'Tamil Nadu', rule:'Serial', out:'Stale', chip:'orange', ver:'30 d ago',
    inv:{oem:'CISCO', model:'ASR920', os:'17.6.4', sn:'CAT2034U1PP'},
    net:{oem:'CISCO', model:'ASR920', os:'17.6.4', sn:'CAT2034U1PP'}, diff:[] },
  { ne:'BGLK-EX4300-T-CHR-07', ip:'172.31.31.2', circle:'Karnataka', rule:'Chassis MAC', out:'Stale', chip:'orange', ver:'10 mo ago',
    inv:{oem:'JUNIPER', model:'EX4300-48P', os:'20.4R3', sn:'SW-PRO-CHR-4545'},
    net:{oem:'JUNIPER', model:'EX4300-48P', os:'20.4R3', sn:'SW-PRO-CHR-4545'}, diff:[] },
  { ne:'MAS-N7750-BNG-R-T1-SR', ip:'172.31.33.130', circle:'Tamil Nadu', rule:'no device answered', out:'Only in inventory', chip:'error', ver:'261 runs ago',
    inv:{oem:'NOKIA', model:'7750', os:'TiMOS-C-21.5', sn:'JS123CC2EAFA'}, net:null, diff:[] },
  { ne:'ODI-ACX2200-PE-T4', ip:'172.31.61.10', circle:'Odisha', rule:'no device answered', out:'Only in inventory', chip:'error', ver:'287 runs ago',
    inv:{oem:'JUNIPER', model:'ACX2200', os:'21.2R3-S8.5', sn:'PJ0215230412'}, net:null, diff:[] },
  { ne:'BLR-ACX7024-UNREG-01', ip:'172.31.41.212', circle:'Karnataka', rule:'no record matched', out:'Only on network', chip:'pink', ver:'4 h ago',
    inv:null, net:{oem:'JUNIPER', model:'ACX7024', os:'23.2R1-S2.6', sn:'FL2423AN0918'}, diff:[] },
  { ne:'INDR-C9300-TEMP', ip:'172.31.39.144', circle:'Madhya Pradesh', rule:'no record matched', out:'Only on network', chip:'pink', ver:'7 h ago',
    inv:null, net:{oem:'CISCO', model:'C9300-48UXM', os:'17.9.4', sn:'SW-CHR-CORE-4499'}, diff:[] },
  { ne:'— unidentified —', ip:'172.31.49.88', circle:'Andhra Pradesh', rule:'no rule resolved', out:'Unidentified', chip:'purple', ver:'10 h ago',
    inv:null, net:{oem:'NOKIA', model:'7750 SR-7', os:'—', sn:'—'}, diff:[] }
];

const REC_BANDS = {
  invOnly: { n:'Only in inventory', c:118, chip:'error', tone:'red',
    q:'On record, did not answer the last three discovery runs.' },
  both: { n:'Found on both sides', c:2379, tone:'emerald', parts:[
    { k:'Agree',  n:'Every governed attribute agrees',   c:1829, tone:'emerald', chip:'success' },
    { k:'Differ', n:'At least one attribute differs',    c:392,  tone:'amber',   chip:'warning' },
    { k:'Stale',  n:'Agrees, but verified too long ago', c:158,  tone:'orange',  chip:'orange' } ] },
  netOnly: { n:'Only on the network', c:224, tone:'fuchsia', parts:[
    { k:'Only on network', n:'Identified, but no inventory record', c:160, tone:'fuchsia', chip:'pink' },
    { k:'Unidentified',    n:'Answered, but no rule could place it', c:64, tone:'purple',  chip:'purple' } ] },
  notComparable: { n:'Cannot be compared', c:206, tone:'slate',
    q:'Server, DWDM, eNodeB and gNodeB — no collector reaches these classes, so they are excluded from the comparison rather than counted as missing.' }
};

/* ── source + verification, the bridge from Discovery ───── */
const SRC = { d: ['Discovered','success'], p: ['Planned · CIQ','info'], m: ['Manual','neutral'], e: ['EMS','purple'] };
const src = k => chip(SRC[k][0], SRC[k][1]);
const ver = h => h === null ? `<span style="color:${cv('gray',400)}">never</span>`
  : h < 24 ? chip('fresh','success') : h < 720 ? chip(`${Math.round(h/24)} d`,'warning')
  : chip(`${Math.round(h/720)} mo`,'error');
const RSTATE = { ok:['Verified','success'], drift:['Drifted','warning'], stale:['Stale','orange'],
                 miss:['Missing','error'], none:['Not discovered','neutral'] };
const rst = k => chip(RSTATE[k][0], RSTATE[k][1]);

const IL = {
  locations: 1754, central: 118, regional: 342, edge: 1294,
  ne: 2703, discovered: 2379, links: 7846, services: 2457, vnf: 28, inactive: 412, reports: 22
};

const LOC_TIERS = [
  { n:'Central',  c:118,  planned:9,  building:14, live:92,  failed:3,  tone:'amber' },
  { n:'Regional', c:342,  planned:31, building:44, live:259, failed:8,  tone:'sky' },
  { n:'Edge',     c:1294, planned:212,building:178,live:881, failed:23, tone:'emerald' }
];
const LOC_HEALTH = [
  { n:'Sites where discovery found fewer NE than inventory holds', c:214, tone:'amber', act:'Reconcile' },
  { n:'Sites on-air with no NE discovered at all',                 c:43,  tone:'red',   act:'Investigate' },
  { n:'Sites with no NE record against them',                      c:87,  tone:'slate', act:'Review' },
  { n:'Sites in build for more than 90 days',                      c:61,  tone:'orange',act:'Escalate' }
];

/* ── geography: circle centroids, site counts, build state ── */
const LOC_GEO = [
  { c:'MH', n:'Maharashtra',    st:'Maharashtra',    lat:19.75, lon:75.71, tot:248, live:174, build:37, fail:4 },
  { c:'UP', n:'Uttar Pradesh',  st:'Uttar Pradesh',  lat:26.85, lon:80.95, tot:221, live:158, build:31, fail:4 },
  { c:'KA', n:'Karnataka',      st:'Karnataka',      lat:15.32, lon:75.71, tot:211, live:161, build:25, fail:2 },
  { c:'MP', n:'Madhya Pradesh', st:'Madhya Pradesh', lat:23.47, lon:77.95, tot:194, live:118, build:35, fail:8 },
  { c:'DL', n:'Delhi',          st:'Delhi',          lat:28.61, lon:77.21, tot:176, live:139, build:19, fail:2 },
  { c:'TN', n:'Tamil Nadu',     st:'Tamil Nadu',     lat:11.13, lon:78.66, tot:154, live:112, build:18, fail:1 },
  { c:'GJ', n:'Gujarat',        st:'Gujarat',        lat:22.26, lon:71.19, tot:152, live:104, build:20, fail:2 },
  { c:'AP', n:'Andhra Pradesh', st:'Andhra Pradesh', lat:15.91, lon:79.74, tot:143, live:96,  build:18, fail:6 },
  { c:'RJ', n:'Rajasthan',      st:'Rajasthan',      lat:27.02, lon:74.22, tot:46,  live:30,  build:6,  fail:1 },
  { c:'WB', n:'West Bengal',    st:'West Bengal',    lat:22.99, lon:87.86, tot:38,  live:26,  build:4,  fail:0 },
  { c:'OR', n:'Odisha',         st:'Odisha',         lat:20.95, lon:85.10, tot:33,  live:22,  build:6,  fail:3 },
  { c:'PB', n:'Punjab',         st:'Punjab',         lat:31.15, lon:75.34, tot:27,  live:18,  build:3,  fail:0 },
  { c:'KL', n:'Kerala',         st:'Kerala',         lat:10.85, lon:76.27, tot:24,  live:17,  build:3,  fail:0 },
  { c:'TS', n:'Telangana',      st:'Telangana',      lat:17.12, lon:79.02, tot:20,  live:14,  build:2,  fail:0 },
  { c:'HR', n:'Haryana',        st:'Haryana',        lat:29.06, lon:76.09, tot:18,  live:12,  build:2,  fail:0 },
  { c:'CG', n:'Chhattisgarh',   st:'Chhattisgarh',   lat:21.28, lon:81.87, tot:14,  live:9,   build:2,  fail:1 },
  { c:'BR', n:'Bihar',          st:'Bihar',          lat:25.10, lon:85.31, tot:12,  live:8,   build:1,  fail:0 },
  { c:'AS', n:'Assam',          st:'Assam',          lat:26.20, lon:92.94, tot:9,   live:5,   build:2,  fail:0 },
  { c:'JH', n:'Jharkhand',      st:'Jharkhand',      lat:23.61, lon:85.28, tot:8,   live:5,   build:1,  fail:0 },
  { c:'UK', n:'Uttarakhand',    st:'Uttarakhand',    lat:30.07, lon:79.09, tot:6,   live:4,   build:1,  fail:0 }
];
const STATE_CIRCLE = Object.fromEntries(LOC_GEO.map(g => [g.st, g]));


/* simplified India outline, clockwise from the north-west — schematic, not survey-accurate */
const INDIA = [[77.0,35.5],[75.9,34.7],[74.2,34.3],[73.9,32.6],[74.6,31.3],[73.3,29.6],[71.6,27.8],[70.2,25.7],[68.9,24.3],[69.1,22.5],[72.6,21.5],
  [72.8,19.1],[73.3,16.0],[74.8,13.0],[75.2,11.5],[76.5,8.4],[77.5,8.1],[79.8,10.3],[80.3,13.1],
  [80.2,15.9],[82.3,17.0],[84.8,19.3],[87.0,21.5],[88.9,21.7],[88.1,24.5],[91.5,24.0],[92.3,22.0],
  [93.4,23.0],[94.6,24.0],[97.3,24.5],[96.2,27.2],[97.4,28.2],[95.0,27.2],[92.0,27.6],[89.9,26.9],
  [88.2,26.5],[85.0,27.0],[81.0,30.3],[79.0,31.4],[78.7,32.6],[79.2,34.5]];

const LOC_CIRCLES_OLD = [
  { n:'Maharashtra', c:248, live:174 }, { n:'Uttar Pradesh', c:221, live:158 },
  { n:'Karnataka',   c:211, live:161 }, { n:'Madhya Pradesh',c:194, live:118 },
  { n:'Delhi',       c:176, live:139 }, { n:'Tamil Nadu',    c:154, live:112 },
  { n:'Gujarat',     c:152, live:104 }, { n:'Andhra Pradesh',c:143, live:96 },
  { n:'Other circles',c:255,live:170 }
];
const LOC_AGING = [
  { n:'Under 30 days', c:96,  tone:'emerald' }, { n:'30 – 90 days', c:79, tone:'amber' },
  { n:'90 – 180 days', c:41,  tone:'orange' },  { n:'Over 180 days', c:20, tone:'red' }
];

/* ── location hierarchy: every site type groups into one of three tiers
   the estate is actually built from — a Datacenter core, PoP locations
   that anchor a circle, and the sites (macro/micro/cell) hanging off
   them. Insights' hierarchy widget and its drill-downs read this grouping,
   not the raw `type` field, so a new site type only needs one line here. */
const TYPE_GROUP = { 'Datacenter':'dc', 'POP':'pop', 'Macro-O':'site', 'Micro-CO':'site', 'Cell Site':'site' };
const typeGroupOf = t => TYPE_GROUP[t] || 'site';

const LOC_TYPES = [
  { k:'dc',   n:'Datacenters',   tone:'purple', total:24,   live:21,   building:2,   planned:1,   failed:0 },
  { k:'pop',  n:'PoP locations', tone:'sky',    total:210,  live:165,  building:27,  planned:15,  failed:3 },
  { k:'site', n:'Sites',         tone:'teal',   total:1520, live:1046, building:207, planned:236, failed:31 }
];

/* per-circle DC/PoP/Site split — derived from LOC_GEO so the three counts
   always foot to LOC_TYPES; only the DC/PoP seed for the top circles is
   hand-set, sites and the "other circles" remainder are the difference. */
const LOC_HIER = (() => {
  const seed = { MH:{dc:4,pop:32}, UP:{dc:3,pop:27}, KA:{dc:3,pop:26}, MP:{dc:2,pop:24},
                 DL:{dc:3,pop:22}, TN:{dc:2,pop:19}, GJ:{dc:2,pop:18}, AP:{dc:2,pop:17} };
  const top = LOC_GEO.slice(0, 8).map(g => {
    const s = seed[g.c] || { dc:0, pop:0 };
    return { code:g.c, n:g.n, dc:s.dc, pop:s.pop, site:g.tot-s.dc-s.pop, tot:g.tot, live:g.live };
  });
  const rest = LOC_GEO.slice(8);
  const restTot = rest.reduce((a,g)=>a+g.tot,0), restLive = rest.reduce((a,g)=>a+g.live,0);
  const dcTotal = LOC_TYPES.find(t=>t.k==='dc').total, popTotal = LOC_TYPES.find(t=>t.k==='pop').total;
  const restDc = dcTotal - top.reduce((a,c)=>a+c.dc,0), restPop = popTotal - top.reduce((a,c)=>a+c.pop,0);
  top.push({ code:'OTH', n:'Other circles', dc:restDc, pop:restPop, site:restTot-restDc-restPop, tot:restTot, live:restLive });
  return top;
})();

const LOC_STATES = [
  { k:'live', n:'On-air', tone:'emerald' }, { k:'building', n:'In progress', tone:'amber' },
  { k:'planned', n:'Planned', tone:'sky' }, { k:'failed', n:'Failed', tone:'red' }
];

/* Sites split into the same three build classes the estate is actually
   built from; counts foot to LOC_TYPES' site total (1,520). */
const SITE_SUBTYPES = [
  { n:'Macro-O', c:641 }, { n:'Micro-CO', c:512 }, { n:'Cell Site', c:367 }
];

/* the eight named circles the hierarchy widget and the coverage table
   draw individually; everything else rolls into "Other circles" */
const TOP8_STATES = new Set(LOC_HIER.filter(r => r.code !== 'OTH').map(r => r.n));

const LOC_CITIES = {
  'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Kolhapur','Thane','Solapur'],
  'Uttar Pradesh': ['Lucknow','Kanpur','Varanasi','Agra','Noida','Gorakhpur','Meerut','Prayagraj'],
  'Karnataka': ['Bengaluru','Mysuru','Hubballi','Mangaluru','Belagavi','Bagalkot','Davangere'],
  'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar'],
  'Delhi': ['Connaught Place','Dwarka','Rohini','Okhla','Janakpuri','Saket'],
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Dindigul'],
  'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Gandhinagar'],
  'Andhra Pradesh': ['Vijayawada','Visakhapatnam','Guntur','Tirupati','Nellore'],
  'Rajasthan': ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer'],
  'West Bengal': ['Kolkata','Siliguri','Durgapur','Asansol'],
  'Odisha': ['Bhubaneswar','Cuttack','Rourkela','Sambalpur'],
  'Punjab': ['Ludhiana','Amritsar','Jalandhar','Mohali'],
  'Kerala': ['Kochi','Thiruvananthapuram','Kozhikode','Thrissur'],
  'Telangana': ['Hyderabad','Warangal','Nizamabad','Karimnagar'],
  'Haryana': ['Gurugram','Faridabad','Panipat','Ambala'],
  'Chhattisgarh': ['Raipur','Bhilai','Bilaspur'],
  'Bihar': ['Patna','Gaya','Muzaffarpur'],
  'Assam': ['Guwahati','Dibrugarh','Silchar'],
  'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad'],
  'Uttarakhand': ['Dehradun','Haridwar','Haldwani']
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
  { cat:'Lease / Property', reasons:[
    'Lease agreement expired', 'Lease renewal pending approval', 'Landlord denied site access',
    'Building management denied access', 'Site ownership dispute', 'Legal clearance pending' ] },
  { cat:'Power', reasons:[
    'Commercial power connection unavailable', 'Power handover pending from utility provider',
    'DG backup installation pending', 'Battery bank not commissioned', 'Power panel installation incomplete',
    'Electrical safety audit failed', 'Frequent power outages affecting commissioning' ] },
  { cat:'Fiber Connectivity', reasons:[
    'Fiber route not handed over', 'Fiber cut on feeder route', 'Fiber splicing pending',
    'ROW approval pending', 'ODF installation incomplete', 'Backhaul connectivity unavailable' ] },
  { cat:'Civil / Infrastructure', reasons:[
    'Tower foundation construction delayed', 'Equipment shelter installation pending', 'Civil work not completed',
    'Rack installation pending', 'HVAC installation pending', 'Structural audit failed', 'Site access road unavailable' ] },
  { cat:'Regulatory', reasons:[
    'Municipal approval pending', 'Tower installation permit expired', 'Environmental clearance pending',
    'Local authority approval pending' ] },
  { cat:'Supply Chain', reasons:[
    'Equipment delivery delayed', 'Material shortage at site', 'Vendor deployment delayed',
    'Acceptance testing pending vendor sign-off' ] },
  { cat:'Commissioning', reasons:[
    'ATP pending', 'ATP failed due to power instability', 'Site integration pending NOC approval',
    'Site acceptance testing incomplete', 'Commissioning engineer visit pending' ] }
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
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
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
  const chipFor = k => ({ live:'success', building:'warning', planned:'info', failed:'error' }[k]);
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

    return { st: status.n, chip: chipFor(status.k), name: id, cat, ct: ctFor(cat), type, id,
      addr: `${city} ${type === 'Datacenter' ? 'Data Park' : type === 'POP' ? 'PoP' : 'Site'}`,
      city, state: stateName, ne, disc, stage, issue, risk,
      lat: +(lat + (rnd() - 0.5) * 1.2).toFixed(3), lon: +(lon + (rnd() - 0.5) * 1.2).toFixed(3) };
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
  r.neDc = rows.filter(l => l.type === 'Datacenter').reduce((a,l) => a + l.ne, 0);
  r.nePop = rows.filter(l => l.type === 'POP').reduce((a,l) => a + l.ne, 0);
  r.ne = rows.reduce((a,l) => a + l.ne, 0);
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
  { k:'planned',  n:'Planned',        c:92,   chip:'info',    tone:'sky' },
  { k:'instore',  n:'In store',       c:34,   chip:'cyan',    tone:'cyan' },
  { k:'deployed', n:'Deployed',       c:2503, chip:'success', tone:'emerald' },
  { k:'faulty',   n:'Faulty / RMA',   c:74,   chip:'warning', tone:'amber' },
  { k:'decomm',   n:'Decommissioned', c:412,  chip:'neutral', tone:'slate' }
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
  switch: { planned: 14, instore:  8, deployed:  315, faulty: 12, decomm:  61 },
  server: { planned:  6, instore:  3, deployed:   82, faulty:  5, decomm:  34 },
  dwdm:   { planned:  8, instore:  2, deployed:   65, faulty:  3, decomm:  19 },
  enodeb: { planned:  3, instore:  0, deployed:   14, faulty:  1, decomm:   5 },
  gnodeb: { planned:  3, instore:  0, deployed:   10, faulty:  1, decomm:   4 }
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
  { k:'router', n:'Router', c:2148, disc:2114 }, { k:'switch', n:'Switch', c:349, disc:283 },
  { k:'server', n:'Server', c:96,  disc:0 },     { k:'dwdm',   n:'DWDM',   c:78,  disc:0 },
  { k:'enodeb', n:'eNodeB', c:18,  disc:0 },     { k:'gnodeb', n:'gNodeB', c:14,  disc:0 }
];
/* Classes that have a Node view destination. Server has no node-level page —
   nothing to view — so it's the one class left out; every other class opens
   Node view, even where the page itself has no live assurance feed to show. */
const NODE_VIEW_CLASSES = ['router', 'switch', 'dwdm', 'enodeb'];
const hasNodeView = k => NODE_VIEW_CLASSES.includes(k);
const PHY = {
  router: [
    { st:'ok',   name:'NDLS-J960-P_R1-T1-NR', ip:'172.31.33.100', model:'MX960',   os:'21.2R3-S8.5', sn:'JN1236F87AFB', oem:'JUNIPER', loc:'DEL-279',  s:'d', stock:'deployed', v:3 },
    { st:'ok',   name:'VZG-N540X-PE-T4-NR',   ip:'172.31.53.186', model:'NCS-540', os:'7.9.2',       sn:'FW488AS342W', oem:'CISCO',   loc:'VJA-118',  s:'d', stock:'deployed', v:10 },
    { st:'drift',name:'CHE-J2.2K-PE-T4-ER',   ip:'172.31.61.140', model:'ACX2200', os:'21.2R3-S8.5', sn:'PJ0215230255',oem:'JUNIPER', loc:'CHE-118',  s:'d', stock:'deployed', v:3 },
    { st:'drift',name:'ET-J960-P-T1-WR',      ip:'172.31.31.97',  model:'MX960',   os:'21.4R3-S5.5', sn:'JN1234C25AFA',oem:'JUNIPER', loc:'BGLK-277', s:'d', stock:'deployed', v:3 },
    { st:'drift',name:'SP-CNOC-LAB-J204-PE-T3-NR1', ip:'172.31.86.61', model:'MX204', os:'21.4R3-S5.5', sn:'FW488AS342W', oem:'JUNIPER', loc:'BGLK-277', s:'d', stock:'deployed', v:3 },
    { st:'stale',name:'CHE-920-WIFI-R2',      ip:'172.31.38.43',  model:'ASR920',  os:'17.6.4',      sn:'CAT2034U1PP', oem:'CISCO',   loc:'CHE-118',  s:'d', stock:'deployed', v:720 },
    { st:'miss', name:'MAS-N7750-BNG-R-T1-SR',ip:'172.31.33.130', model:'7750',    os:'—',           sn:'JS123CC2EAFA',oem:'NOKIA',   loc:'MAS-041',  s:'d', stock:'faulty', v:6264 },
    { st:'none', name:'ERS-N7750-SR7-T2-SR',  ip:'192.168.1.14',  model:'7750 SR-7',os:'TiMOS-C-22.10.R1', sn:'NSN7750ERS14A7X1', oem:'NOKIA', loc:'BGLK-277', s:'p', stock:'planned', v:null },
    { st:'none', name:'NDD-J2.2K-PE-T4-SR',   ip:'192.168.1.11',  model:'EX4300-48P',os:'3.2.0.4',   sn:'QCT3048NDD11A01', oem:'JUNIPER', loc:'BGLK-277', s:'p', stock:'planned', v:null },
    { st:'ok',   name:'WKR-J7024-PE-T4-WR',   ip:'172.31.62.11',  model:'ACX7024', os:'23.2R1-S2.6', sn:'FL2423AN0050',oem:'JUNIPER', loc:'WKR-204',  s:'d', stock:'deployed', v:5 },
    { st:'none', name:'MAS-J960-P-R2-T1-SR',   ip:'172.31.31.140', model:'MX960',   os:'21.2R3-S8.4', sn:'JN1231A55AFB',oem:'JUNIPER', loc:'MAS-041',  s:'m', stock:'decomm', v:null,
      dOn:'14-Jun-2026', dWhy:'Replaced under CR-8802',  dBy:'Anjali Verma',  dWo:'WO-3312', zombie:false },
    { st:'none', name:'DEL-N540X-SPARE',       ip:'172.31.35.207', model:'NCS-540', os:'7.9.2',       sn:'CAT2077U1XX', oem:'CISCO',   loc:'DEL-279',  s:'m', stock:'decomm', v:null,
      dOn:'02-May-2026', dWhy:'End of life',             dBy:'Gaurav Shukla', dWo:'WO-3188', zombie:true },
    { st:'none', name:'INDR-ASR920-R7',        ip:'172.31.38.77',  model:'ASR920',  os:'17.6.2',      sn:'CAT2034U7RR', oem:'CISCO',   loc:'INDR-275', s:'m', stock:'decomm', v:null,
      dOn:'11-Feb-2026', dWhy:'Faulty, returned to OEM', dBy:'Amit Sharma',   dWo:'WO-2944', zombie:false },
    { st:'none', name:'VZG-7750-BNG-02',       ip:'172.31.49.202', model:'7750',    os:'TiMOS-C-21.5',sn:'NSN7750VZG022',oem:'NOKIA',  loc:'VJA-118',  s:'m', stock:'decomm', v:null,
      dOn:'08-Jan-2026', dWhy:'Capacity migration',      dBy:'Sai Krishna',   dWo:'WO-2861', zombie:true }
  ],
  switch: [
    { st:'ok',   name:'KA-BGLK-277-T-CHR-01', ip:'172.31.31.201', model:'L3-CORE-48P',  os:'8.2.1', sn:'HPE-SW-CH-2026-001', oem:'CIENA',   loc:'BGLK-277', s:'d', stock:'deployed', v:6 },
    { st:'ok',   name:'KA-BGLK-277-T-CHR-04', ip:'172.31.31.202', model:'EX2200-24T',   os:'15.1R7', sn:'CHR-SN-808090',      oem:'JUNIPER', loc:'BGLK-277', s:'d', stock:'deployed', v:6 },
    { st:'drift',name:'KA-BGLK-277-T-CHR-08', ip:'172.31.31.204', model:'C9300-48UXM',  os:'17.9.4', sn:'SW-CHR-CORE-4499',   oem:'CISCO',   loc:'BGLK-277', s:'d', stock:'deployed', v:6 },
    { st:'stale',name:'BGLK-EX4300-T-CHR-07', ip:'172.31.31.2',   model:'EX4300-48P',   os:'20.4R3', sn:'SW-PRO-CHR-4545',    oem:'JUNIPER', loc:'BGLK-277', s:'d', stock:'deployed', v:7104 },
    { st:'ok',   name:'KA-BGLK-277-T-CHR-09', ip:'172.31.31.205', model:'C9400-LC-48T', os:'17.9.4', sn:'CHRSW-909090',       oem:'CISCO',   loc:'BGLK-277', s:'d', stock:'deployed', v:6 },
    { st:'none', name:'BGLK-EX2200-OLD-03',    ip:'172.31.31.44',  model:'EX2200-24T',   os:'15.1R7', sn:'CHR-SN-441122',      oem:'JUNIPER', loc:'BGLK-277', s:'m', stock:'decomm', v:null,
      dOn:'19-Mar-2026', dWhy:'Site consolidation', dBy:'Harish Kumar', dWo:'WO-3021', zombie:false }
  ],
  server: [
    { st:'none', name:'BGLK-CDC-SRV-01', ip:'172.31.70.11', model:'DL380 Gen11', os:'RHEL 9.4', sn:'SGH2041XYZ', oem:'HPE',    loc:'BGLK-277', s:'m', stock:'deployed', v:null },
    { st:'none', name:'BGLK-CDC-SRV-02', ip:'172.31.70.12', model:'DL380 Gen11', os:'RHEL 9.4', sn:'SGH2041XZA', oem:'HPE',    loc:'BGLK-277', s:'m', stock:'deployed', v:null },
    { st:'none', name:'DEL-EDC-SRV-07',  ip:'172.31.71.07', model:'PowerEdge R760', os:'RHEL 9.2', sn:'DPE7601144', oem:'DELL', loc:'DEL-279',  s:'m', stock:'deployed', v:null }
  ],
  dwdm: [
    { st:'none', name:'WR-ADVA-FSP3000-01', ip:'172.31.47.144', model:'FSP 3000', os:'ONMSi 21.1', sn:'ADV3000-8841', oem:'ADVA', loc:'MUM-011', s:'m', stock:'deployed', v:null },
    { st:'none', name:'WR-ADVA-FSP3000-02', ip:'172.31.47.145', model:'FSP 3000', os:'ONMSi 21.1', sn:'ADV3000-8842', oem:'ADVA', loc:'PUN-014', s:'m', stock:'deployed', v:null }
  ],
  enodeb: [
    { st:'none', name:'PUN-HNJW-C3-ENB-014', ip:'10.44.18.14', model:'AirScale', os:'21B', sn:'NOK-ENB-014', oem:'NOKIA', loc:'PUN-014', s:'e', stock:'deployed', v:null },
    { st:'none', name:'INDR-AREA-001-ENB-07', ip:'10.44.19.7', model:'AirScale', os:'21B', sn:'NOK-ENB-007', oem:'NOKIA', loc:'INDR-275', s:'e', stock:'deployed', v:null }
  ],
  gnodeb: [
    { st:'none', name:'BLR-SOUTH-GNB-021', ip:'10.51.22.21', model:'AirScale 5G', os:'23A', sn:'NOK-GNB-021', oem:'NOKIA', loc:'BGLK-277', s:'e', stock:'deployed', v:null },
    { st:'none', name:'DEL-CENTRAL-GNB-009', ip:'10.51.23.9', model:'AirScale 5G', os:'23A', sn:'NOK-GNB-009', oem:'NOKIA', loc:'DEL-279', s:'e', stock:'deployed', v:null }
  ]
};

/* Ten rows minimum per class, spread across the active stock states, so a
   class tab or a stock chip never lands on a two-row list. Counts still come
   from PHY_MATRIX — these rows are the sample, not the population. */
const PHY_LOC = ['BGLK-277','DEL-279','INDR-275','VJA-118','CHE-118','MAS-041','PUN-162','HYD-093','KOL-204','AHM-131'];
const PHY_ST  = ['ok','ok','drift','ok','stale','ok','drift','ok','none','ok'];
const PHY_STK = ['deployed','deployed','deployed','instore','deployed','planned','deployed','faulty','planned','deployed'];
Object.keys(PHY).forEach(cls => {
  const live = PHY[cls].filter(r => r.stock !== 'decomm');
  const arch = PHY[cls].filter(r => r.stock === 'decomm');
  const out = live.slice();
  for (let i = 0; out.length < 12; i++) {
    const base = live[i % live.length], k = out.length;
    const stock = PHY_STK[k % PHY_STK.length];
    const planned = stock === 'planned';
    out.push({ ...base,
      st: planned ? 'none' : PHY_ST[k % PHY_ST.length],
      name: `${PHY_LOC[k % PHY_LOC.length].split('-')[0]}-${base.model.replace(/[^A-Za-z0-9]/g,'').slice(0,7).toUpperCase()}-${['P','PE','AGG','ACC','ER'][k % 5]}-${String(20 + k)}`,
      ip: planned ? `192.168.${20 + k % 9}.${11 + k}` : `172.31.${64 + (k * 5) % 60}.${12 + (k * 23) % 240}`,
      sn: base.sn.replace(/[0-9]{3}$/, String(200 + k * 7)) + String.fromCharCode(65 + k % 26),
      loc: PHY_LOC[k % PHY_LOC.length],
      stock,
      v: planned ? null : [3, 6, 11, 640][k % 4] });
  }
  PHY[cls] = out.concat(arch);
});


const VNF_TYPES = [
  { n:'vDU',   c:9,  planned:4, prog:0, ready:4, failed:1, tone:'sky' },
  { n:'CU-CP', c:10, planned:1, prog:0, ready:9, failed:0, tone:'purple' },
  { n:'CU-UP', c:4,  planned:0, prog:1, ready:3, failed:0, tone:'cyan' },
  { n:'Others',c:5,  planned:0, prog:0, ready:4, failed:1, tone:'amber' }
];
const VNFS = [
  { st:'Ready',  chip:'success', nf:'NTSON3435004', type:'vDU',   svc:'NTSAB1400413', sub:'KA-BGLK-277-CL-04', tech:'5G',    host:'blr-cl-04-w02', s:'e' },
  { st:'Ready',  chip:'success', nf:'NetroundsTA1001', type:'vDU',svc:'NTSAB1400413', sub:'CDC-SUB-1002',      tech:'4G+5G', host:'blr-cl-02-w01', s:'e' },
  { st:'Ready',  chip:'success', nf:'OTSLB1002750013',type:'vDU',  svc:'NTSAB1400431', sub:'INDR-275-SE-13-CL', tech:'5G',    host:'indr-se13-w01', s:'e' },
  { st:'Ready',  chip:'success', nf:'F5 Firewall',    type:'Others',svc:'NTSAB1400413',sub:'CDC-SUB-1001',      tech:'—',     host:'blr-cl-01-w03', s:'e' },
  { st:'Ready',  chip:'success', nf:'NTSLB400130',    type:'CU-CP', svc:'NTSLB400130', sub:'NTSLB400130',       tech:'5G',    host:'del-cl-01-w01', s:'e' },
  { st:'Failed', chip:'error',   nf:'NTSON3435037',   type:'vDU',   svc:'NTSAB1400566',sub:'DEL-279-SE-37-CL',  tech:'5G',    host:'del-se37-w02', s:'e' },
  { st:'Planned',chip:'info',    nf:'NTSON3435040',   type:'vDU',   svc:'NTSAB1400566',sub:'DEL-279-SE-40-CL',  tech:'5G',    host:'—',            s:'p' }
];

/* ── VNF lifecycle (Day 0 / Grow / Events / GPL) ──────────
   One representative RAN ZTP workflow — the stage/step shape a lifecycle
   operation actually has — reused for whichever NF the reader opens; the
   NF name is substituted into each stage's title. */
const LC_STATUS = {
  notstarted: ['Not started', 'amber',   '…'],
  pending:    ['Pending',     'slate',   '–'],
  progress:   ['In progress', 'sky',     '▶'],
  done:       ['Completed',   'emerald', '✓'],
  failed:     ['Failed',      'red',     '✕'],
  skipped:    ['Skipped',     'purple',  '»']
};
/* step status is NOT baked in here — it depends on the NF's own status
   (Ready/Failed/Planned), computed by vnfLifecycleStages() at render time */
const vnfLcSteps = names => names.map(n => ({ n, at: '02-Aug-26 09:05:30 PM' }));
const VNF_LC_STAGES = [
  { k: 'day0',   n: 'Day 0',   start: '29-Aug-25 05:33:26 AM', end: '02-Aug-26 09:05:30 PM',
    steps: vnfLcSteps(['Verify subcloud', 'Generate vDU values.yaml', 'Push adpf-pre-values.yaml',
      'Push adpf-values.yaml', 'Deploy CNF', 'Check deployment status']) },
  { k: 'grow',   n: 'Grow',   start: '02-Aug-26 09:05:30 PM', end: '02-Aug-26 09:05:30 PM',
    steps: vnfLcSteps(['Scale vDU replicas', 'Verify capacity']) },
  { k: 'events', n: 'Events', start: '02-Aug-26 09:05:30 PM', end: '02-Aug-26 09:05:30 PM',
    steps: vnfLcSteps(['Collect fault events', 'Acknowledge events']) },
  { k: 'gpl',    n: 'GPL',    start: '02-Aug-26 09:05:30 PM', end: '02-Aug-26 09:05:30 PM',
    steps: vnfLcSteps(['Generate golden package list', 'Publish GPL']) }
];

const LINK_TABS = [
  { k:'lldp', n:'LLDP', c:5549 }, { k:'ospf', n:'OSPF', c:1382 },
  { k:'bgp',  n:'BGP',  c:604 },  { k:'isis', n:'ISIS', c:311 }
];
const LINKS = {
  lldp: [
    { st:'ok', sne:'NDLS-J960-P_R1-T1-NR', sip:'172.31.33.100', sif:'Gi0/0/1',      dne:'PSA-C920-WIFI1-T4-ER', dif:'Gi0/0/1',        name:'BB:NDLS-PSA 1G', v:3 },
    { st:'ok', sne:'NDLS-J960-P_R1-T1-NR', sip:'172.31.33.100', sif:'Te0/0/12',     dne:'PSA-C920-WIFI1-T4-ER', dif:'Te0/0/12.SI.612',name:'BB:NDLS-PSA 10G',v:3 },
    { st:'new',sne:'NDLS-J960-P_R1-T1-NR', sip:'172.31.33.100', sif:'Gi0/0/0.SI.14',dne:'PSA-C920-WIFI1-T4-ER', dif:'Gi0/0/10',       name:'—',              v:3 },
    { st:'ok', sne:'Kalindi-J1.1K-DU-T4-NR',sip:'172.31.35.151',sif:'ge-0/1/1',     dne:'Janki-J1.1K-DU-T4-NR', dif:'ge-0/1/0',       name:'BB:to Kalindi', v:5 },
    { st:'gone',sne:'SBI_JANAKPURI-J2.2K-PE-T4',sip:'172.31.35.81',sif:'xe-0/3/1',  dne:'CCRAS-JANAKPURI-N540X',dif:'TenGigE0/0/0/18',name:'—',             v:168 }
  ],
  ospf: [
    { st:'ok', sne:'NDLS-J960-P_R1-T1-NR', sip:'172.31.33.100', sif:'area 0.0.0.0', dne:'172.31.33.101', dif:'full(8)', name:'IGP backbone', v:3 },
    { st:'ok', sne:'NDLS-J960-P_R1-T1-NR', sip:'172.31.33.100', sif:'area 0.0.0.0', dne:'172.31.33.109', dif:'full(8)', name:'IGP backbone', v:3 },
    { st:'gone',sne:'MAS-N7750-BNG-R-T1-SR',sip:'172.31.33.130',sif:'area 0.0.0.1', dne:'172.31.33.131', dif:'down(1)', name:'IGP south',    v:6264 }
  ],
  bgp: [
    { st:'ok', sne:'NDLS-J960-P_R1-T1-NR', sip:'172.31.33.100', sif:'AS 24186', dne:'172.31.53.252', dif:'established(6)', name:'iBGP RR', v:3 },
    { st:'ok', sne:'NDLS-J960-P_R1-T1-NR', sip:'172.31.33.100', sif:'AS 24186', dne:'172.31.53.249', dif:'established(6)', name:'iBGP RR', v:3 }
  ],
  isis: [
    { st:'ok', sne:'VZG-N540X-PE-T4-NR', sip:'172.31.53.186', sif:'L2', dne:'172.31.53.187', dif:'up', name:'ISIS L2', v:10 }
  ]
};

const SVC_TABS = [{ k:'l3vpn', n:'L3VPN', c:1815 }, { k:'l2vpn', n:'L2VPN', c:642 }];
const SERVICES = {
  l3vpn: [
    { st:'Up',   chip:'success', name:'CGDA',                ip:'172.31.53.252', rd:'24186:1015707', rt:'24186:900287, 24186:888970', erp:'1097', ifc:'FortyGigE0/0/0/28.100', v:3 },
    { st:'Down', chip:'error',   name:'E-24678',             ip:'172.31.53.252', rd:'24186:1001487', rt:'24186:899142, 24186:899138', erp:'1098', ifc:'FortyGigE0/0/0/28.17',  v:3 },
    { st:'Down', chip:'error',   name:'VSS-RB-Connectivity', ip:'172.31.53.252', rd:'24186:1019673', rt:'24186:900172, 24186:900174', erp:'1099', ifc:'TenGigE0/0/0/2.200',    v:3 },
    { st:'Up',   chip:'success', name:'NE-CAMERA',           ip:'172.31.53.249', rd:'24186:1016097', rt:'24186:900476, 24186:900478', erp:'1101', ifc:'GigabitEthernet0/0/0/10.3177', v:3 },
    { st:'Up',   chip:'success', name:'SAFE-CITY-SW-MGMT',   ip:'172.31.53.249', rd:'24186:1016096', rt:'24186:900477, 24186:900479', erp:'1102', ifc:'GigabitEthernet0/0/0/10.10',   v:3 },
    { st:'Up',   chip:'success', name:'SC-DU',               ip:'172.31.53.24',  rd:'24186:1016064', rt:'24186:901',                  erp:'1105', ifc:'BD6',                   v:10 }
  ],
  l2vpn: [
    { st:'Up',   chip:'success', name:'VPWS-BGLK-INDR-01', ip:'172.31.31.189', rd:'24186:2001144', rt:'24186:700114', erp:'2041', ifc:'xe-0/0/2.100', v:3 },
    { st:'Up',   chip:'success', name:'VPLS-SAFE-CITY',    ip:'172.31.53.249', rd:'24186:2001188', rt:'24186:700118', erp:'2042', ifc:'ge-0/0/5.0',   v:3 },
    { st:'Down', chip:'error',   name:'VPWS-CHE-MAS-04',   ip:'172.31.61.140', rd:'24186:2001202', rt:'24186:700120', erp:'2043', ifc:'xe-0/3/0.200', v:30 }
  ]
};

/* ── sample depth ──────────────────────────────────────────
   A grid showing five rows of a 5,549-row population reads as
   "this is all there is". Every list below is grown to at least
   ten rows from its own hand-written seeds, so the sample looks
   like a sample. Totals still come from the ledger, never from
   the length of these arrays. */
const PAD_NE = ['NDLS-J960-P_R1-T1-NR','VZG-N540X-PE-T4-NR','CHE-J2.2K-PE-T4-ER','ET-J960-P-T1-WR',
  'MAS-N7750-BNG-R-T1-SR','BGLK-C9300-ACC-11','INDR-ASR920-PE-T3','PUN-MX204-AGG-07',
  'HYD-NCS540-PE-T4','KOL-J960-P-R2-T1','AHM-ASR920-ER-05','JAI-MX204-PE-T2'];
const PAD_IF = ['ge-0/0/3','xe-0/1/2','Te0/0/8','Gi0/0/4','TenGigE0/0/0/6','ge-0/2/1','xe-0/3/3','Te0/1/12'];
const PAD_IP = i => `172.31.${40 + (i * 3) % 40}.${11 + (i * 17) % 240}`;
const padList = (rows, target, tweak) => {
  const out = rows.slice();
  for (let i = 0; out.length < target; i++) out.push(tweak({ ...rows[i % rows.length] }, out.length, i));
  return out;
};

const VNF_PAD = [
  { st:'Ready',  chip:'success', nf:'NTSON3435052',   type:'CU-UP', svc:'NTSAB1400602', sub:'PUN-162-CL-02',     tech:'5G',    host:'pun-cl-02-w01', s:'e' },
  { st:'Ready',  chip:'success', nf:'NTSON3435061',   type:'vDU',   svc:'NTSAB1400602', sub:'HYD-093-SE-11-CL',  tech:'5G',    host:'hyd-se11-w03', s:'e' },
  { st:'Ready',  chip:'success', nf:'vEPC-CORE-0114', type:'Others',svc:'NTSAB1400118', sub:'CDC-SUB-1003',      tech:'4G',    host:'kol-cl-03-w02', s:'e' },
  { st:'Failed', chip:'error',   nf:'NTSON3435077',   type:'CU-CP', svc:'NTSAB1400566', sub:'AHM-131-CL-01',     tech:'5G',    host:'ahm-cl-01-w01', s:'e' },
  { st:'Planned',chip:'info',    nf:'NTSON3435090',   type:'vDU',   svc:'NTSAB1400711', sub:'JAI-058-SE-04-CL',  tech:'5G',    host:'—',            s:'p' }
];
VNFS.push(...VNF_PAD);

LINKS.lldp = padList(LINKS.lldp, 12, (r, i) => ({ ...r, st: i % 5 === 4 ? 'new' : 'ok',
  sne: PAD_NE[i % PAD_NE.length], sip: PAD_IP(i), sif: PAD_IF[i % PAD_IF.length],
  dne: PAD_NE[(i + 5) % PAD_NE.length], dif: PAD_IF[(i + 3) % PAD_IF.length],
  name: `BB:${PAD_NE[i % PAD_NE.length].slice(0, 4)}-${PAD_NE[(i + 5) % PAD_NE.length].slice(0, 4)}`,
  v: [3, 5, 8, 26][i % 4] }));
LINKS.ospf = padList(LINKS.ospf, 10, (r, i) => ({ ...r, st: i % 6 === 5 ? 'gone' : 'ok',
  sne: PAD_NE[i % PAD_NE.length], sip: PAD_IP(i), sif: `area 0.0.0.${i % 3}`,
  dne: PAD_IP(i + 7), dif: i % 6 === 5 ? 'down(1)' : 'full(8)',
  name: i % 3 === 0 ? 'IGP backbone' : 'IGP south', v: [3, 6, 11][i % 3] }));
LINKS.bgp = padList(LINKS.bgp, 10, (r, i) => ({ ...r, st: i % 7 === 6 ? 'gone' : 'ok',
  sne: PAD_NE[i % PAD_NE.length], sip: PAD_IP(i), sif: `AS ${24186 + (i % 2 ? 0 : 9498)}`,
  dne: PAD_IP(i + 11), dif: i % 7 === 6 ? 'idle(1)' : 'established(6)',
  name: i % 2 ? 'iBGP RR' : 'eBGP peer', v: [3, 4, 9][i % 3] }));
LINKS.isis = padList(LINKS.isis, 10, (r, i) => ({ ...r, st: 'ok',
  sne: PAD_NE[i % PAD_NE.length], sip: PAD_IP(i), sif: i % 3 ? 'L2' : 'L1L2',
  dne: PAD_IP(i + 4), dif: 'up', name: i % 3 ? 'ISIS L2' : 'ISIS L1L2', v: [10, 12, 21][i % 3] }));

SERVICES.l3vpn = padList(SERVICES.l3vpn, 12, (r, i) => ({ ...r,
  st: i % 5 === 3 ? 'Down' : 'Up', chip: i % 5 === 3 ? 'error' : 'success',
  name: ['SAFE-CITY-CAM', 'NIC-WAN-LINK', 'BSNL-TRANSIT', 'GOV-SECRETARIAT', 'METRO-RAIL-OPS',
         'POLICE-NET', 'HEALTH-DEPT-VPN', 'UNIV-CAMPUS-NET'][i % 8] + `-${String(12 + i).padStart(2, '0')}`,
  ip: PAD_IP(i), rd: `24186:10${16100 + i * 7}`, rt: `24186:9004${70 + i}`,
  erp: String(1110 + i), ifc: `${['TenGigE0/0/0/', 'GigabitEthernet0/0/0/', 'FortyGigE0/0/0/'][i % 3]}${i % 12}.${100 + i}`,
  v: [3, 6, 14][i % 3] }));
SERVICES.l2vpn = padList(SERVICES.l2vpn, 10, (r, i) => ({ ...r,
  st: i % 4 === 2 ? 'Down' : 'Up', chip: i % 4 === 2 ? 'error' : 'success',
  name: `${i % 2 ? 'VPWS' : 'VPLS'}-${['BGLK', 'DEL', 'CHE', 'PUN', 'HYD', 'KOL'][i % 6]}-${String(5 + i).padStart(2, '0')}`,
  ip: PAD_IP(i + 2), rd: `24186:20${1210 + i * 3}`, rt: `24186:7001${20 + i}`,
  erp: String(2050 + i), ifc: `${i % 2 ? 'xe' : 'ge'}-0/${i % 4}/${i % 3}.${100 + i}`, v: [3, 7, 30][i % 3] }));


const INACT_TABS = [
  { k:'ne', n:'Network elements', c:412 }, { k:'links', n:'Links', c:1188 }, { k:'svc', n:'Services', c:264 }
];
/* ── the decommissioned archive, by class ──────────────────
   Every class in PHY_MATRIX has records here, so no filter
   combination lands on an empty list. Exactly two rows carry
   zombie:true, matching the "2 still answering" figure on
   the stat strip and the reconciliation exception count.  */
const DECOMM = {
  router: [
    { name:'MAS-J960-P-R2-T1-SR', ip:'172.31.31.140', model:'MX960',   sn:'JN1231A55AFB', oem:'JUNIPER', loc:'MAS-041',
      why:'Replaced under CR-8802',   on:'14-Jun-2026', by:'Anjali Verma',  wo:'WO-2026-4412', zombie:false },
    { name:'DEL-N540X-SPARE',     ip:'172.31.35.207', model:'NCS-540', sn:'CAT2077U1XX',  oem:'CISCO',   loc:'DEL-279',
      why:'End of life',              on:'02-May-2026', by:'Gaurav Shukla', wo:'WO-2026-4188', zombie:true  },
    { name:'INDR-ASR920-R7',      ip:'172.31.38.77',  model:'ASR920',  sn:'CAT2034U7RR',  oem:'CISCO',   loc:'INDR-275',
      why:'Faulty, returned to OEM',  on:'11-Feb-2026', by:'Amit Sharma',   wo:'WO-2026-3901', zombie:false },
    { name:'VZG-7750-BNG-02',     ip:'172.31.49.202', model:'7750',    sn:'NSN7750VZG022',oem:'NOKIA',   loc:'VJA-118',
      why:'Capacity migration',       on:'08-Jan-2026', by:'Sai Krishna',   wo:'WO-2026-3644', zombie:true  },
    { name:'CHE-MX204-EDGE-11',   ip:'172.31.61.88',  model:'MX204',   sn:'JN1188C21DDA', oem:'JUNIPER', loc:'CHE-118',
      why:'Site consolidation',       on:'22-Nov-2025', by:'Harish Kumar',  wo:'WO-2025-9120', zombie:false }
  ],
  switch: [
    { name:'BGLK-EX2200-OLD-03',  ip:'172.31.31.44',  model:'EX2200-24T', sn:'CHR-SN-441122', oem:'JUNIPER', loc:'BGLK-277',
      why:'Site consolidation',       on:'19-Mar-2026', by:'Harish Kumar',  wo:'WO-2026-4021', zombie:false },
    { name:'DEL-C9300-ACC-07',    ip:'172.31.35.61',  model:'C9300-48UXM',sn:'CAT2091U4KK',   oem:'CISCO',   loc:'DEL-279',
      why:'End of support',           on:'05-Feb-2026', by:'Anjali Verma',  wo:'WO-2026-3877', zombie:false },
    { name:'MAS-EX4300-DIST-02',  ip:'172.31.33.19',  model:'EX4300-48P', sn:'SW-PRO-CHR-1188',oem:'JUNIPER',loc:'MAS-041',
      why:'Replaced under CR-8640',   on:'12-Dec-2025', by:'Sai Krishna',   wo:'WO-2025-9366', zombie:false },
    { name:'INDR-EX2200-ACC-14',  ip:'172.31.39.203', model:'EX2200-24T', sn:'CHR-SN-338710', oem:'JUNIPER', loc:'INDR-275',
      why:'Water ingress, written off',on:'30-Aug-2025',by:'Amit Sharma',   wo:'WO-2025-8455', zombie:false }
  ],
  server: [
    { name:'BGLK-CDC-SRV-04',     ip:'172.31.31.211', model:'DL380 Gen10',sn:'HPE380BG0441',  oem:'HPE',     loc:'BGLK-277',
      why:'Hardware refresh',         on:'28-Apr-2026', by:'Gaurav Shukla', wo:'WO-2026-4155', zombie:false },
    { name:'DEL-CDC-SRV-09',      ip:'172.31.35.118', model:'R740xd',     sn:'DELLR740D9022', oem:'DELL',    loc:'DEL-279',
      why:'Workload migrated to cloud',on:'17-Jan-2026',by:'Anjali Verma',  wo:'WO-2026-3702', zombie:false },
    { name:'MAS-CDC-SRV-02',      ip:'172.31.33.88',  model:'DL360 Gen9', sn:'HPE360MA1129',  oem:'HPE',     loc:'MAS-041',
      why:'End of support',           on:'09-Oct-2025', by:'Amit Sharma',   wo:'WO-2025-8811', zombie:false },
    { name:'VJA-CDC-SRV-01',      ip:'172.31.53.44',  model:'R640',       sn:'DELLR640V4410', oem:'DELL',    loc:'VJA-118',
      why:'Site consolidation',       on:'21-Jul-2025', by:'Sai Krishna',   wo:'WO-2025-8102', zombie:false }
  ],
  dwdm: [
    { name:'WR-ADVA-FSP3000-04',  ip:'172.31.47.150', model:'FSP 3000',   sn:'ADV3000WR0417', oem:'ADVA',    loc:'DEL-279',
      why:'Ring re-engineered',       on:'06-Mar-2026', by:'Harish Kumar',  wo:'WO-2026-3988', zombie:false },
    { name:'BGLK-OADM-100-02',    ip:'172.31.31.164', model:'FSP 3000',   sn:'ADV3000BG1002', oem:'ADVA',    loc:'BGLK-277',
      why:'Capacity migration to C-band',on:'14-Nov-2025',by:'Gaurav Shukla',wo:'WO-2025-9044',zombie:false },
    { name:'CHE-OADM-100-01',     ip:'172.31.61.201', model:'FSP 3000',   sn:'ADV3000CH1001', oem:'ADVA',    loc:'CHE-118',
      why:'End of support',           on:'02-Jun-2025', by:'Amit Sharma',   wo:'WO-2025-7660', zombie:false }
  ],
  enodeb: [
    { name:'MP-INDR-ENB-118',     ip:'172.31.39.118', model:'BBU 3900',   sn:'ENB3900IN0118', oem:'NOKIA',   loc:'INDR-275',
      why:'4G to 5G upgrade',         on:'25-May-2026', by:'Sai Krishna',   wo:'WO-2026-4260', zombie:false },
    { name:'KA-BGLK-ENB-041',     ip:'172.31.31.241', model:'BBU 3900',   sn:'ENB3900BG0041', oem:'NOKIA',   loc:'BGLK-277',
      why:'Site decommissioned',      on:'11-Jan-2026', by:'Anjali Verma',  wo:'WO-2026-3688', zombie:false },
    { name:'TN-CHE-ENB-207',      ip:'172.31.61.207', model:'BBU 3900',   sn:'ENB3900CH0207', oem:'NOKIA',   loc:'CHE-118',
      why:'4G to 5G upgrade',         on:'18-Sep-2025', by:'Harish Kumar',  wo:'WO-2025-8702', zombie:false }
  ],
  gnodeb: [
    { name:'BLR-SOUTH-GNB-014',   ip:'172.31.41.114', model:'AirScale',   sn:'GNB5GBL00014',  oem:'NOKIA',   loc:'BGLK-277',
      why:'Replaced under CR-9014',   on:'02-Jun-2026', by:'Gaurav Shukla', wo:'WO-2026-4318', zombie:false },
    { name:'DEL-CENTRAL-GNB-003', ip:'172.31.35.203', model:'AirScale',   sn:'GNB5GDL00003',  oem:'NOKIA',   loc:'DEL-279',
      why:'Antenna re-siting',        on:'19-Feb-2026', by:'Amit Sharma',   wo:'WO-2026-3844', zombie:false },
    { name:'MAS-NORTH-GNB-008',   ip:'172.31.33.208', model:'AirScale',   sn:'GNB5GMA00008',  oem:'NOKIA',   loc:'MAS-041',
      why:'Site consolidation',       on:'07-Dec-2025', by:'Anjali Verma',  wo:'WO-2025-9288', zombie:false }
  ]
};
/* The seeds above are hand-written. The archive holds the full decommissioned
   population (289/61/34/19/5/4 = 412), so it is expanded deterministically to
   the counts the ledger declares — every page of every class tab has records. */
const DK_SITES = [
  { p:'DEL',  loc:'DEL-279'  }, { p:'MAS',  loc:'MAS-041'  }, { p:'BGLK', loc:'BGLK-277' },
  { p:'INDR', loc:'INDR-275' }, { p:'CHE',  loc:'CHE-118'  }, { p:'VZG',  loc:'VJA-118'  },
  { p:'PUN',  loc:'PUN-162'  }, { p:'HYD',  loc:'HYD-093'  }, { p:'KOL',  loc:'KOL-204'  },
  { p:'AHM',  loc:'AHM-131'  }, { p:'JAI',  loc:'JAI-058'  }, { p:'LKO',  loc:'LKO-217'  }
];
const DK_WHY = ['Replaced under change request', 'End of life', 'End of support', 'Faulty, returned to OEM',
  'Site consolidation', 'Capacity migration', 'Hardware refresh', 'Written off after survey',
  'Lease expired, returned', 'Rationalised in ring re-design'];
const DK_BY = ['Anjali Verma', 'Gaurav Shukla', 'Amit Sharma', 'Sai Krishna', 'Harish Kumar',
  'Ronit Dulani', 'Meera Nair', 'Vikram Rao'];
const DK_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DK_ROLE = { router:['P','PE','BNG','EDGE','AGG'], switch:['ACC','DIST','CORE','TOR'],
  server:['SRV','CDC','APP','DB'], dwdm:['OADM','ROADM','MUX','ILA'],
  enodeb:['ENB'], gnodeb:['GNB'] };

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
Object.keys(DECOMM).forEach(k => { DECOMM[k] = dkExpand(k, DECOMM[k], stockCount(k, 'decomm')); });

const decommRows = cls => DECOMM[cls] || [];
const DK_ORD = s => { const [d, m, y] = s.split('-'); return new Date(Number(y), DK_MON.indexOf(m), Number(d)); };
const DECOMM_OLDEST = (() => {
  const dates = Object.values(DECOMM).flat().map(r => DK_ORD(r.on)).sort((a, b) => a - b);
  const mo = Math.round((new Date(2026, 8, 3) - dates[0]) / 2629800000);
  return `${Math.floor(mo / 12)} y ${mo % 12} mo`;
})();
const DECOMM_ZOMBIES = Object.values(DECOMM).flat().filter(r => r.zombie).length;
const INACTIVE = DECOMM.router;

const REPORTS = [
  { st:'Completed', chip:'success', name:'RJ-MPLS-ROUTER-CLUSTER-REPORT', type:'Cluster', gen:'Scheduled', freq:'Weekly',  by:'Harish Kumar', on:'15-Jul-2026', size:'2.4 MB' },
  { st:'Completed', chip:'success', name:'PUN-HNJW-C3-ENODEB-CLUSTER',    type:'Cluster', gen:'Scheduled', freq:'Daily',   by:'Anjali Verma', on:'14-Jul-2026', size:'1.1 MB' },
  { st:'Completed', chip:'success', name:'BGLK-277-ORR-WIFI-CLUSTER',     type:'Cluster', gen:'Scheduled', freq:'Weekly',  by:'Ronit Dulani', on:'14-Jul-2026', size:'860 KB' },
  { st:'Completed', chip:'success', name:'NETWORK-DISCOVERY-SUMMARY',     type:'Discovery',gen:'Automated', freq:'Daily',  by:'scheduler',    on:'01-Sep-2026', size:'4.2 MB' },
  { st:'Completed', chip:'success', name:'RECONCILIATION-EXCEPTIONS',     type:'Discovery',gen:'Automated', freq:'Daily',  by:'scheduler',    on:'01-Sep-2026', size:'1.8 MB' },
  { st:'Failed',    chip:'error',   name:'LUCKNOW-AREA-005-BBU-HARDWARE', type:'Site',    gen:'Adhoc',     freq:'Once',    by:'Nitin Gupta',  on:'14-Jul-2026', size:'—' },
  { st:'Pending',   chip:'warning', name:'SURAT-AREA-014-RRU-POWER',      type:'Site',    gen:'Scheduled', freq:'Daily',   by:'Rohan Mehta',  on:'14-Jul-2026', size:'—' }
];

/* ── network elements at a site ─────────────────────────── */
const SITE_TABS = [{ k:'router', n:'Router' }, { k:'switch', n:'Switch' }, { k:'dwdm', n:'DWDM' }];
const SITE_NE = {
  'BGLK-277': {
    router: [
      { st:'ok',   name:'NDLS-J960-P_R1-T1-NR',        ip:'172.31.31.189', model:'MX960',              os:'21.2R3-S8.5',      sn:'JN1236F87AFB',      oem:'JUNIPER', rack:'A · U42-43', s:'d', v:3 },
      { st:'ok',   name:'PSA-C920-WIFI1-T4-ER',        ip:'172.31.38.41',  model:'ASR920',             os:'17.6.3',           sn:'CAT2034U1SR',       oem:'CISCO',   rack:'A · U18',    s:'d', v:3 },
      { st:'drift',name:'ET-J960-P-T1-WR',             ip:'172.31.31.97',  model:'MX960',              os:'21.4R3-S5.5',      sn:'JN1234C25AFA',      oem:'JUNIPER', rack:'B · U30-31', s:'d', v:3 },
      { st:'none', name:'ERS-N7750-SR7-T2-SR',         ip:'192.168.1.14',  model:'7750 SR-7',          os:'TiMOS-C-22.10.R1', sn:'NSN7750ERS14A7X1',  oem:'NOKIA',   rack:'C · U12',    s:'p', v:null },
      { st:'none', name:'NDD-J2.2K-PE-T4-SR',          ip:'192.168.1.11',  model:'EX4300-48P',         os:'3.2.0.4',          sn:'QCT3048NDD11A01',   oem:'JUNIPER', rack:'C · U16',    s:'p', v:null },
      { st:'dup',  name:'SP-CNOC-LAB-J204-PE-T3-NRIZIW',ip:'172.31.63.20', model:'NCS-540',            os:'7.9.2',            sn:'FW488AS342W',       oem:'CISCO',   rack:'D · U04',    s:'d', v:3 },
      { st:'dup',  name:'SP-CNOC-LAB-J204-PE-T3-NRIZ', ip:'172.31.86.61',  model:'MX204',              os:'21.4R3-S5.5',      sn:'FW488AS342W',       oem:'JUNIPER', rack:'D · U06',    s:'d', v:3 },
      { st:'dup',  name:'2SP-CNOC-LAB-J204-PE-T3-NR',  ip:'192.168.10.56', model:'MX204',              os:'21.4R3-S5.5',      sn:'FW488AS342W',       oem:'JUNIPER', rack:'D · U08',    s:'d', v:3 },
      { st:'dup',  name:'SP-CNOC-LAB-J204-PE-T3-NR11', ip:'192.168.11.169',model:'MX204',              os:'21.4R3-S5.5',      sn:'FW488AS342W',       oem:'JUNIPER', rack:'D · U10',    s:'d', v:3 },
      { st:'dup',  name:'SP-CNOC-LAB-J204-PE-T3-NR1',  ip:'192.168.11.142',model:'MX204',              os:'21.4R3-S5.5',      sn:'FW488AS342W',       oem:'JUNIPER', rack:'D · U12',    s:'d', v:3 },
      { st:'ok',   name:'BGLK-J7024-PE-T4-WR',         ip:'172.31.62.11',  model:'ACX7024',            os:'23.2R1-S2.6',      sn:'FL2423AN0050',      oem:'JUNIPER', rack:'B · U08',    s:'d', v:5 },
      { st:'stale',name:'BGLK-C920-WIFI2-T4-ER',       ip:'172.31.38.44',  model:'ASR920',             os:'17.6.4',           sn:'CAT2034U1PQ',       oem:'CISCO',   rack:'A · U20',    s:'d', v:864 }
    ],
    switch: [
      { st:'ok',   name:'KA-BGLK-277-T-CHR-01', ip:'172.31.31.201', model:'L3-CORE-48P',  mac:'F0:9F:C2:77:88:99', sn:'HPE-SW-CH-2026-001', tmpl:'24A-NE-ZTP - 1.0', oem:'CIENA',   s:'d', v:6 },
      { st:'ok',   name:'KA-BGLK-277-T-CHR-02', ip:'172.31.31.202', model:'L2-ACCESS-24P',mac:'A4:5E:60:12:34:56', sn:'SN-SW-CHR-6590496',  tmpl:'24A-NE-ZTP - 1.0', oem:'CIENA',   s:'d', v:6 },
      { st:'ok',   name:'KA-BGLK-277-T-CHR-03', ip:'172.31.31.203', model:'DC-SW-48PORT', mac:'D8:9E:F3:10:20:30', sn:'SWITCH-CHR-99001',   tmpl:'24A-NE-ZTP - 1.0', oem:'CIENA',   s:'d', v:6 },
      { st:'ok',   name:'KA-BGLK-277-T-CHR-04', ip:'172.31.31.204', model:'EX2200-24T',   mac:'D8:AE:F3:AB:CD:6F', sn:'CHR-SN-808090',      tmpl:'24A-NE-ZTP - 1.0', oem:'JUNIPER', s:'d', v:6 },
      { st:'drift',name:'KA-BGLK-277-T-CHR-07', ip:'172.31.31.207', model:'EX4300-48P',   mac:'D8:9E:F3:AB:CD:EF', sn:'SW-PRO-CHR-4545',    tmpl:'24A-NE-ZTP - 1.0', oem:'JUNIPER', s:'d', v:6 },
      { st:'drift',name:'KA-BGLK-277-T-CHR-08', ip:'172.31.31.208', model:'C9300-48UXM',  mac:'AC:DE:48:44:55:66', sn:'SW-CHR-CORE-4499',   tmpl:'24A-NE-ZTP - 1.0', oem:'CISCO',   s:'d', v:6 },
      { st:'ok',   name:'KA-BGLK-277-T-CHR-09', ip:'172.31.31.209', model:'C9400-LC-48T', mac:'A4:B1:C2:D3:E4:F5', sn:'CHRSW-909090',       tmpl:'24A-NE-ZTP - 1.0', oem:'CISCO',   s:'d', v:6 }
    ],
    dwdm: [
      { st:'none', name:'BGLK-KA-OADM-100',     ip:'172.31.31.148', type:'OADM', oem:'JUNIPER', sw:'21.5.1', shelf:'OT-1 · slot 4', s:'m', v:null },
      { st:'none', name:'BGLK-KA-ILA-101',      ip:'100.64.32.27',  type:'ILA',  oem:'ADVA',    sw:'21.5.1', shelf:'OT-1 · slot 6', s:'m', v:null },
      { st:'none', name:'BGLK-KA-GNE-202',      ip:'172.31.41.202', type:'GNE',  oem:'ADVA',    sw:'21.5.1', shelf:'OT-2 · slot 1', s:'m', v:null },
      { st:'none', name:'BGLK-KA-OADM-201',     ip:'172.31.41.201', type:'OADM', oem:'JUNIPER', sw:'21.5.1', shelf:'OT-2 · slot 3', s:'m', v:null },
      { st:'none', name:'BGLK-KA-ILA-203',      ip:'192.168.1.1',   type:'ILA',  oem:'JUNIPER', sw:'16.3.2', shelf:'OT-2 · slot 5', s:'m', v:null },
      { st:'none', name:'BGLK-KA-ILA-204',      ip:'172.16.0.5',    type:'ILA',  oem:'JUNIPER', sw:'21.1.1', shelf:'OT-2 · slot 7', s:'m', v:null }
    ]
  }
};
/* deterministic filler for the other sample sites */
function siteNE(id, ne, disc) {
  if (SITE_NE[id]) return SITE_NE[id];
  const models = [['MX204','JUNIPER','21.4R3-S5.5'],['NCS-540','CISCO','7.9.2'],['ACX2200','JUNIPER','21.2R3-S8.5'],['ASR920','CISCO','17.6.4']];
  const sw = [['EX2200-24T','JUNIPER'],['C9300-48UXM','CISCO'],['L2-ACCESS-24P','CIENA']];
  const nR = Math.max(1, Math.round(ne * 0.6)), nS = Math.max(0, ne - nR);
  const seen = disc;
  const mk = (i) => {
    const m = models[i % models.length];
    return { st: i < seen ? (i % 5 === 2 ? 'drift' : 'ok') : 'none',
      name: `${id}-PE-T4-${String(i+1).padStart(2,'0')}`, ip: `172.31.${40 + (i%9)}.${20 + i*3}`,
      model: m[0], os: m[2], sn: `${m[1].slice(0,2)}${id.replace(/[^0-9]/g,'').slice(0,4)}${1000+i*7}`,
      oem: m[1], rack: `A · U${10 + i*2}`, s: i < seen ? 'd' : 'p', v: i < seen ? 3 + (i % 12) : null };
  };
  const mkS = (i) => {
    const m = sw[i % sw.length];
    return { st: (nR + i) < seen ? 'ok' : 'none', name: `${id}-T-CHR-${String(i+1).padStart(2,'0')}`,
      ip: `172.31.${52 + (i%5)}.${60 + i*4}`, model: m[0], mac: `D8:9E:F3:${(16+i).toString(16).toUpperCase()}:20:30`,
      sn: `SW-${id}-${4400 + i*11}`, tmpl: '24A-NE-ZTP - 1.0', oem: m[1],
      s: (nR + i) < seen ? 'd' : 'p', v: (nR + i) < seen ? 4 + i : null };
  };
  return { router: Array.from({length:nR}, (_,i)=>mk(i)), switch: Array.from({length:nS}, (_,i)=>mkS(i)), dwdm: [] };
}

/* ── capex ──────────────────────────────────────────────── */
const CAPEX_CATS = [
  { k:'equip',  n:'Equipment',                   tone:'sky' },
  { k:'civil',  n:'Civil works',                  tone:'slate' },
  { k:'power',  n:'Power & cooling',              tone:'amber' },
  { k:'fiber',  n:'Fiber & transport',            tone:'cyan' },
  { k:'instal', n:'Installation & commissioning', tone:'purple' },
  { k:'lic',    n:'Software licence',             tone:'emerald' }
];
const CAPEX_STATES = [
  { k:'paid',     n:'Paid',      chip:'success' },
  { k:'invoiced', n:'Invoiced',  chip:'info' },
  { k:'po',       n:'PO raised', chip:'warning' },
  { k:'planned',  n:'Planned',   chip:'neutral' }
];
const CAPEX = {
  'BGLK-277': {
    fy:'FY 2024-25', afe:'AFE-KA-2024-0188', cc:'CC-4471 · Karnataka Access', owner:'Harish Kumar',
    approved: 52000000, updated:'21-Jul-2026 · Gaurav Shukla',
    items: [
      { d:'Core router MX960',              c:'equip', v:'Juniper',   po:'PO-2024-1188', q:2,   u:8250000, s:'paid',     dt:'12-Mar-2024', ne:'NDLS-J960-P_R1-T1-NR +1' },
      { d:'Aggregation router MX204',       c:'equip', v:'Juniper',   po:'PO-2024-1190', q:5,   u:1420000, s:'paid',     dt:'12-Mar-2024', ne:'SP-CNOC-LAB-J204 ×5' },
      { d:'Access switch 48-port',          c:'equip', v:'Ciena',     po:'PO-2024-1204', q:7,   u:385000,  s:'paid',     dt:'28-Mar-2024', ne:'KA-BGLK-277-T-CHR-01…09' },
      { d:'DWDM shelf and line cards',      c:'equip', v:'Adva',      po:'PO-2024-1266', q:1,   u:6840000, s:'invoiced', dt:'14-Jun-2024', ne:'BGLK-KA-OADM-100 +5' },
      { d:'Racks, cabling and earthing',    c:'civil', v:'L&T',       po:'PO-2024-1150', q:1,   u:3120000, s:'paid',     dt:'02-Feb-2024', ne:'—' },
      { d:'DG set 250 kVA with AMF panel',  c:'power', v:'Cummins',   po:'PO-2024-1152', q:1,   u:2450000, s:'paid',     dt:'08-Feb-2024', ne:'—' },
      { d:'Precision cooling 11 TR',        c:'power', v:'Blue Star', po:'PO-2024-1153', q:2,   u:1180000, s:'paid',     dt:'08-Feb-2024', ne:'—' },
      { d:'Battery bank and rectifier',     c:'power', v:'Exide',     po:'PO-2024-1155', q:1,   u:1760000, s:'paid',     dt:'19-Feb-2024', ne:'—' },
      { d:'OFC last mile, 4.2 km',          c:'fiber', v:'Sterlite',  po:'PO-2024-1301', q:1,   u:882000,  s:'invoiced', dt:'30-Aug-2024', ne:'—' },
      { d:'Installation and commissioning', c:'instal',v:'Tata Comm', po:'PO-2024-1310', q:1,   u:1640000, s:'invoiced', dt:'12-Sep-2024', ne:'—' },
      { d:'Router OS subscription, 3 yr',   c:'lic',   v:'Juniper',   po:'PO-2025-0042', q:7,   u:265000,  s:'po',       dt:'04-Apr-2025', ne:'All routers' },
      { d:'Spare line cards and SFPs',      c:'equip', v:'Multiple',  po:'—',            q:1,   u:1250000, s:'planned',  dt:'—',           ne:'—' }
    ]
  }
};
function capexOf(id, ne) {
  if (CAPEX[id]) return CAPEX[id];
  const scale = Math.max(0.25, ne / 25), base = CAPEX['BGLK-277'], pick = [0,1,2,4,5,7,9,11];
  const items = pick.map((i, j) => {
    const b = base.items[i];
    return { ...b, q: Math.max(1, Math.round(b.q * scale * 0.5)),
      u: Math.round(b.u * (0.55 + (j % 4) * 0.12) / 1000) * 1000,
      po: b.po === '—' ? '—' : `PO-2024-${1200 + j * 13}`, ne: '—' };
  });
  const committed = items.reduce((a, r) => a + r.q * r.u, 0);
  return {
    fy:'FY 2024-25', afe:`AFE-${id.slice(0,4)}-2024-0${(id.length*7)%9+1}00`,
    cc:`CC-${4400 + (id.length*13)%90} · Circle access`, owner:'Anjali Verma',
    approved: Math.ceil(committed * 1.09 / 100000) * 100000,
    updated:'14-Jun-2026 · Amit Sharma', items
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
  { st:'Completed', chip:'success', name:'HYD-093-DWDM-CHANNEL-FILL',      type:'Cluster',  gen:'Scheduled', freq:'Weekly',  by:'Meera Nair',   on:'29-Aug-2026', size:'1.6 MB' },
  { st:'Completed', chip:'success', name:'PASSIVE-FIBER-OTDR-SUMMARY',     type:'Site',     gen:'Scheduled', freq:'Monthly', by:'Vikram Rao',   on:'28-Aug-2026', size:'3.1 MB' },
  { st:'Completed', chip:'success', name:'SPARE-STOCK-AGEING',             type:'Cluster',  gen:'Adhoc',     freq:'Once',    by:'Gaurav Shukla',on:'26-Aug-2026', size:'640 KB' },
  { st:'Completed', chip:'success', name:'COLLECTOR-CREDENTIAL-FAILURES',  type:'Discovery',gen:'Automated', freq:'Daily',   by:'scheduler',    on:'01-Sep-2026', size:'910 KB' },
  { st:'Pending',   chip:'warning', name:'KOL-204-RRU-POWER-AUDIT',        type:'Site',     gen:'Scheduled', freq:'Weekly',  by:'Rohan Mehta',  on:'01-Sep-2026', size:'—' }
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

  const MODELS_BY_OEM = {
    Juniper:  ['MX960', 'MX204', 'ACX2200', 'ACX7024', 'EX4300-48P', 'EX2200-24T'],
    Cisco:    ['ASR920', 'NCS-540', 'C9300-48UXM', 'C9400-LC-48T'],
    Nokia:    ['7750', '7750 SR-7'],
    Adva:     ['FSP 3000'],
    Edgecore: ['AS7712-32X']
  };
  const ROLE = ['PE', 'AGG', 'ACC', 'CORE', 'EDGE', 'BNG'];

  /* one row per unit of runFail, split across reasons exactly as DROPS states;
     the 5 hand-written failures above already carry one of each but dupip, so
     the generated share is trimmed by one apiece to land on 175 in total */
  const reasons = flatten([['unreach', 67], ['timeout', 40], ['auth', 32], ['adapter', 17], ['parse', 8], ['dupip', 6]]);
  const oems = flatten([['Juniper', 96], ['Cisco', 63], ['Nokia', 8], ['Adva', 5], ['Edgecore', 3]]);

  reasons.forEach((reason, i) => {
    const oem = oems[i % oems.length];
    const model = pick(MODELS_BY_OEM[oem]);
    const circle = CIRCLES[i % CIRCLES.length];
    const job = JOBS[i % JOBS.length].id;
    /* unreachable / timed-out targets never got far enough to answer the
       device collector, so nothing about them is known yet */
    const known = reason !== 'unreach' && reason !== 'timeout';
    const host = known ? `${circle.c}-${model.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${pick(ROLE)}-${pad2(10 + i % 88)}` : '—';
    TARGETS.push({
      ip: `172.31.${100 + (i * 7) % 140}.${20 + (i * 13) % 230}`,
      host, oem: known ? oem : '—', model: known ? model : '—',
      circle: circle.n, sync: getLiveDateSync(2 + i % 7, (i * 11) % 60),
      fresh: 1 + i % 18, job,
      ch: ['fail', 'na', 'na', 'na', 'na', 'na'], out: 'Missing', chip: 'error', reason
    });
  });

  /* devices seen for the first time this cycle: identified, not yet in
     Inventory — the two hand-written rows above are Rogue outcomes of the
     same shape, so the rest follow suit */
  for (let i = 0; i < 66; i++) {
    const circle = CIRCLES[(i + 5) % CIRCLES.length];
    const oem = pick(['Juniper', 'Juniper', 'Cisco', 'Cisco', 'Nokia']);
    const model = pick(MODELS_BY_OEM[oem]);
    const job = JOBS[(i + 3) % JOBS.length].id;
    TARGETS.push({
      ip: `172.31.${140 + (i * 9) % 110}.${30 + (i * 17) % 210}`,
      host: `${circle.c}-${model.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-NEW-${pad2(50 + i % 48)}`,
      oem, model, circle: circle.n,
      sync: getLiveDateSync(1 + i % 8, (i * 19) % 60),
      fresh: 1 + i % 12, job,
      ch: i % 3 === 0 ? ['ok', 'ok', 'ok', 'na', 'na', 'na'] : ['ok', 'ok', 'ok', 'ok', 'na', 'na'],
      out: 'Rogue', chip: 'pink', isNew: true
    });
  }
})();

