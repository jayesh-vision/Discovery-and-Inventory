/* ═══ Resource detail · sub-resource hierarchy, interfaces, compliance ═══ */

/* Hardware tree: chassis → slot → card → port → transceiver */
const HW_TREE = [
  { d:0, k:'chassis', n:'MX960 chassis',        pid:'CHAS-BP-MX960-S', sn:'JN1236F87AFB', st:'ok',   info:'14 slots · 11 occupied' },
  { d:1, k:'re',      n:'RE0 · Routing engine', pid:'RE-S-2X00x6',     sn:'RE0884112',    st:'ok',   info:'master · 64 GB' },
  { d:1, k:'re',      n:'RE1 · Routing engine', pid:'RE-S-2X00x6',     sn:'RE0884113',    st:'ok',   info:'backup · 64 GB' },
  { d:1, k:'fpc',     n:'FPC 0',                pid:'MPC7E-10G',       sn:'ABCD1234',     st:'ok',   info:'2 PICs · 24.6 W' },
  { d:2, k:'pic',     n:'PIC 0/0',              pid:'10x10GE SFPP',    sn:'EFGH5678',     st:'ok',   info:'10 ports · 9 used' },
  { d:3, k:'port',    n:'xe-0/0/1',             pid:'SFP+-10G-LR',     sn:'JKLM9012',     st:'ok',   info:'Rx −4.2 dBm · Tx −2.1 dBm' },
  { d:3, k:'port',    n:'xe-0/0/4',             pid:'SFP+-10G-LR',     sn:'JKLM9044',     st:'warn', info:'Rx −9.8 dBm · drifting 0.4 dB/mo' },
  { d:3, k:'port',    n:'xe-0/0/7',             pid:'SFP+-10G-ER',     sn:'JKLM9077',     st:'ok',   info:'Rx −5.5 dBm · Tx −1.8 dBm' },
  { d:2, k:'pic',     n:'PIC 0/1',              pid:'4x40GE QSFPP',    sn:'EFGH5690',     st:'ok',   info:'4 ports · 2 used' },
  { d:3, k:'port',    n:'et-0/1/0',             pid:'QSFP+-40G-LR4',   sn:'QSFP40122',    st:'ok',   info:'Rx −3.1 dBm · Tx −1.2 dBm' },
  { d:1, k:'fpc',     n:'FPC 1',                pid:'MPC7E-10G',       sn:'ABCD1288',     st:'ok',   info:'2 PICs · 23.9 W' },
  { d:2, k:'pic',     n:'PIC 1/0',              pid:'10x10GE SFPP',    sn:'EFGH5701',     st:'ok',   info:'10 ports · 6 used' },
  { d:1, k:'fpc',     n:'FPC 2',                pid:'—',               sn:'—',            st:'empty',info:'slot empty · spare capacity' },
  { d:1, k:'pem',     n:'PEM 0',                pid:'PWR-MX960-4100',  sn:'PWR8841',      st:'ok',   info:'4100 W · 38% load' },
  { d:1, k:'pem',     n:'PEM 1',                pid:'PWR-MX960-4100',  sn:'PWR8842',      st:'fail', info:'no input · raised 3 d ago' },
  { d:1, k:'fan',     n:'Fan tray 0',           pid:'FFANTRAY-MX960',  sn:'FAN44201',     st:'ok',   info:'normal speed' }
];

/* Interfaces — first-class, estate-searchable */
const IFACES = [
  { n:'xe-0/0/1',  desc:'BB:NDLS-PSA 10G',       admin:'up',   oper:'up',   sp:'10G', mtu:9192, ip:'172.31.33.100/30', vlan:'—',    nb:'PSA-C920-WIFI1-T4-ER', util:62, chg:'47 d', rx:'−4.2' },
  { n:'xe-0/0/4',  desc:'BB:NDLS-Kalindi 10G',   admin:'up',   oper:'up',   sp:'10G', mtu:9192, ip:'172.31.33.104/30', vlan:'—',    nb:'Kalindi-J1.1K-DU-T4-NR', util:44, chg:'47 d', rx:'−9.8' },
  { n:'xe-0/0/7',  desc:'BB:NDLS-Janki 10G',     admin:'up',   oper:'up',   sp:'10G', mtu:9192, ip:'172.31.33.108/30', vlan:'—',    nb:'Janki-J1.1K-DU-T4-NR', util:71, chg:'47 d', rx:'−5.5' },
  { n:'xe-0/0/9',  desc:'CGDA customer handoff', admin:'up',   oper:'up',   sp:'10G', mtu:1514, ip:'—',                vlan:'100',  nb:'—',                    util:18, chg:'12 d', rx:'−4.9' },
  { n:'et-0/1/0',  desc:'BB:NDLS-Core 40G',      admin:'up',   oper:'up',   sp:'40G', mtu:9192, ip:'172.31.33.112/30', vlan:'—',    nb:'NDLS-CORE-P-T1-NR',    util:38, chg:'47 d', rx:'−3.1' },
  { n:'xe-0/0/2',  desc:'SAFE-CITY-SW-MGMT',     admin:'up',   oper:'down', sp:'10G', mtu:1514, ip:'—',                vlan:'10',   nb:'—',                    util:0,  chg:'2 d',  rx:'no signal' },
  { n:'xe-0/0/5',  desc:'VSS-RB-Connectivity',   admin:'up',   oper:'down', sp:'10G', mtu:1514, ip:'—',                vlan:'200',  nb:'—',                    util:0,  chg:'6 h',  rx:'−28.4' },
  { n:'xe-1/0/3',  desc:'Reserved · CR-8841',    admin:'down', oper:'down', sp:'10G', mtu:1514, ip:'—',                vlan:'—',    nb:'—',                    util:0,  chg:'119 d',rx:'—' },
  { n:'xe-1/0/6',  desc:'—',                     admin:'down', oper:'down', sp:'10G', mtu:1514, ip:'—',                vlan:'—',    nb:'—',                    util:0,  chg:'412 d',rx:'—' },
  { n:'ge-0/2/0',  desc:'OOB management',        admin:'up',   oper:'up',   sp:'1G',  mtu:1514, ip:'10.44.8.100/24',   vlan:'—',    nb:'DEL-OOB-SW-01',        util:3,  chg:'412 d',rx:'—' }
];
const IF_CAP = { total:36, up:22, adminDown:14, operDown:2, optical:16, opticalUsed:9, opticalFree:7,
                 forecast:'4 months to exhaustion at current fill rate' };

const NBR_TABS = [{k:'lldp',n:'LLDP',c:19},{k:'ospf',n:'OSPF',c:12},{k:'bgp',n:'BGP',c:4},{k:'isis',n:'ISIS',c:0}];
const NBRS = {
  lldp: [
    { local:'xe-0/0/1', remote:'PSA-C920-WIFI1-T4-ER', rport:'Gi0/0/1',        rip:'172.31.38.41',  st:'ok',  seen:'3 h' },
    { local:'xe-0/0/4', remote:'Kalindi-J1.1K-DU-T4-NR', rport:'ge-0/1/0',     rip:'172.31.35.151', st:'ok',  seen:'3 h' },
    { local:'xe-0/0/7', remote:'Janki-J1.1K-DU-T4-NR', rport:'ge-0/1/1',       rip:'172.31.35.152', st:'ok',  seen:'3 h' },
    { local:'et-0/1/0', remote:'NDLS-CORE-P-T1-NR',   rport:'et-0/0/3',        rip:'172.31.33.101', st:'new', seen:'3 h' },
    { local:'xe-0/0/5', remote:'CCRAS-JANAKPURI-N540X', rport:'TenGigE0/0/0/18',rip:'172.31.35.81', st:'gone',seen:'7 d' }
  ],
  ospf: [
    { local:'area 0.0.0.0', remote:'172.31.33.101', rport:'full(8)', rip:'172.31.33.101', st:'ok', seen:'3 h' },
    { local:'area 0.0.0.0', remote:'172.31.33.109', rport:'full(8)', rip:'172.31.33.109', st:'ok', seen:'3 h' },
    { local:'area 0.0.0.1', remote:'172.31.33.121', rport:'full(8)', rip:'172.31.33.121', st:'ok', seen:'3 h' }
  ],
  bgp: [
    { local:'AS 24186', remote:'172.31.53.252', rport:'established(6)', rip:'172.31.53.252', st:'ok', seen:'3 h' },
    { local:'AS 24186', remote:'172.31.53.249', rport:'established(6)', rip:'172.31.53.249', st:'ok', seen:'3 h' }
  ],
  isis: []
};

const RES_SERVICES = [
  { st:'Up',   chip:'success', t:'L3VPN', name:'CGDA',              rd:'24186:1015707', ifc:'xe-0/0/9.100', erp:'1097', cust:'Karnataka Govt' },
  { st:'Down', chip:'error',   t:'L3VPN', name:'VSS-RB-Connectivity',rd:'24186:1019673',ifc:'xe-0/0/5.200', erp:'1099', cust:'VSS Retail' },
  { st:'Up',   chip:'success', t:'L3VPN', name:'NE-CAMERA',         rd:'24186:1016097', ifc:'xe-0/0/9.317', erp:'1101', cust:'Safe City' },
  { st:'Down', chip:'error',   t:'L3VPN', name:'SAFE-CITY-SW-MGMT', rd:'24186:1016096', ifc:'xe-0/0/2.10',  erp:'1102', cust:'Safe City' },
  { st:'Up',   chip:'success', t:'L2VPN', name:'VPWS-BGLK-INDR-01', rd:'24186:2001144', ifc:'xe-0/0/1.100', erp:'2041', cust:'Enterprise' }
];

const RES_ALARMS = [
  { sev:'Critical', chip:'error',   n:'Power supply failure',       src:'PEM 1',      raised:'29-Aug-2026 04:12', age:'3 d',  ack:'Unacked' },
  { sev:'Major',    chip:'warning', n:'Interface down',             src:'xe-0/0/2',   raised:'31-Aug-2026 18:40', age:'2 d',  ack:'Acked' },
  { sev:'Major',    chip:'warning', n:'Interface down',             src:'xe-0/0/5',   raised:'01-Sep-2026 03:22', age:'6 h',  ack:'Unacked' },
  { sev:'Minor',    chip:'info',    n:'Optical Rx below threshold', src:'xe-0/0/4',   raised:'24-Aug-2026 09:05', age:'8 d',  ack:'Acked' },
  { sev:'Minor',    chip:'info',    n:'Config changed outside CR',  src:'commit log', raised:'19-Aug-2026 22:14', age:'13 d', ack:'Acked' }
];

const RES_CONFIG = {
  running:'21.2R3-S8.5', golden:'21.4R3-S5.5', compliant:false, behindBy:'2 releases',
  lastBackup:'01-Sep-2026 09:20', backupSize:'412 KB', drift:[
    { p:'system/ntp/server',        want:'10.44.0.11, 10.44.0.12', got:'10.44.0.11',            sev:'Major' },
    { p:'snmp/v3/user',             want:'ro-inband-v3',           got:'ro-inband-v3, legacy-ro', sev:'Major' },
    { p:'system/syslog/host',       want:'10.44.2.30',             got:'—',                     sev:'Minor' },
    { p:'protocols/lldp/interface', want:'all',                    got:'all except xe-1/0/6',   sev:'Minor' }
  ]
};

const RES_HISTORY = [
  { at:'01-Sep-2026 09:19', who:'discovery', f:'Interface xe-0/0/5', from:'up',           to:'down',            src:'Device collector' },
  { at:'30-Aug-2026 03:09', who:'discovery', f:'OS version',         from:'21.2R3-S8.4',  to:'21.2R3-S8.5',     src:'Device collector' },
  { at:'29-Aug-2026 04:12', who:'fault mgmt',f:'Alarm',              from:'—',            to:'PEM 1 failure',   src:'Fault management' },
  { at:'21-Jul-2026 11:02', who:'Gaurav Shukla', f:'Rack position',  from:'A · U40-41',   to:'A · U42-43',      src:'Manual' },
  { at:'14-Jun-2026 16:44', who:'Harish Kumar',  f:'Stock state',    from:'In stock',     to:'Deployed',        src:'Workorder WO-2291' },
  { at:'02-Mar-2024 10:15', who:'CIQ import',    f:'Record created', from:'—',            to:'Planned',         src:'Planned · CIQ' }
];

/* Estate-level figures the list screen was missing */
const EST = {
  ports: { total: 48216, used: 31840, free: 13122, faulty: 3254 },
  compliance: { compliant: 1612, behind: 807, ahead: 44, unknown: 240 },
  eol: { past: 118, within12: 341, within36: 622, safe: 1622 },
  spares: { instore: 34, rma: 41, intransit: 12 }
};

/* ═══ Passive infrastructure ═══ */
const PASSIVE_TABS = [
  { k:'fiber',  n:'Fiber spans',     c:1204 }, { k:'odf',   n:'ODF',            c:486 },
  { k:'rack',   n:'Racks',           c:918 },  { k:'power', n:'Power plant',    c:314 },
  { k:'splice', n:'Splice closures', c:372 },  { k:'cord',  n:'Patch cords',    c:1626 },
  { k:'duct',   n:'Ducts',           c:200 }
];
const PASSIVE = {
  fiber: [
    { st:'In service', chip:'success', n:'FS-BGLK-277-INDR-275', a:'BGLK-277 ODF-01', b:'INDR-275 ODF-02', len:'42,180 m', cores:'24 / 96', splices:14, otdr:'12-Jun-2026', att:'0.21 dB/km', own:'Own' },
    { st:'In service', chip:'success', n:'FS-BGLK-277-VJA-118',  a:'BGLK-277 ODF-01', b:'VJA-118 ODF-01',  len:'88,640 m', cores:'12 / 48', splices:31, otdr:'04-Mar-2026', att:'0.24 dB/km', own:'Leased' },
    { st:'Degraded',   chip:'warning', n:'FS-DEL-279-NDLS-CORE', a:'DEL-279 ODF-03',  b:'NDLS-CORE ODF-01',len:'6,420 m',  cores:'36 / 96', splices:4,  otdr:'28-Aug-2026', att:'0.42 dB/km', own:'Own' },
    { st:'Cut',        chip:'error',   n:'FS-INDR-275-INDR-401', a:'INDR-275 ODF-02', b:'INDR-401 ODF-01', len:'11,900 m', cores:'0 / 48',  splices:9,  otdr:'01-Sep-2026', att:'—',          own:'Own' },
    { st:'Planned',    chip:'info',    n:'FS-VJA-118-MAS-041',   a:'VJA-118 ODF-01',  b:'MAS-041 ODF-01',  len:'—',        cores:'0 / 96',  splices:0,  otdr:'—',           att:'—',          own:'Own' }
  ],
  odf: [
    { st:'In service', chip:'success', n:'BGLK-277-ODF-01', site:'KA-BGLK-277', type:'Rack mount 96F', cap:96, used:60, rack:'A · U01-04', term:'SC/APC' },
    { st:'In service', chip:'success', n:'BGLK-277-ODF-02', site:'KA-BGLK-277', type:'Rack mount 48F', cap:48, used:22, rack:'B · U01-02', term:'LC/UPC' },
    { st:'In service', chip:'success', n:'DEL-279-ODF-03',  site:'DEL-279',     type:'Wall mount 24F', cap:24, used:23, rack:'—',          term:'SC/APC' },
    { st:'In service', chip:'success', n:'INDR-275-ODF-02', site:'MP-INDR-275', type:'Rack mount 48F', cap:48, used:18, rack:'A · U02-03', term:'SC/APC' },
    { st:'Planned',    chip:'info',    n:'VJA-118-ODF-02',  site:'Vijayawada',  type:'Rack mount 96F', cap:96, used:0,  rack:'—',          term:'SC/APC' }
  ],
  rack: [
    { st:'In service', chip:'success', n:'BGLK-277-RACK-A', site:'KA-BGLK-277', h:45, used:31, kw:'4.2 / 6.0', cool:'Front-to-back', occ:[[1,4,'ODF-01','odf'],[8,9,'Patch panel','odf'],[12,13,'CHR-01','sw'],[14,15,'CHR-04','sw'],[18,18,'PSA-C920','rtr'],[20,20,'CHR-08','sw'],[30,31,'ET-J960','rtr'],[42,43,'NDLS-J960','rtr']] },
    { st:'In service', chip:'success', n:'BGLK-277-RACK-B', site:'KA-BGLK-277', h:45, used:18, kw:'2.1 / 6.0', cool:'Front-to-back', occ:[[1,2,'ODF-02','odf'],[8,8,'BGLK-J7024','rtr'],[30,31,'ET-J960-2','rtr']] },
    { st:'In service', chip:'success', n:'DEL-279-RACK-A',  site:'DEL-279',     h:42, used:26, kw:'3.4 / 5.0', cool:'Front-to-back', occ:[[10,10,'PE-T4-01','rtr'],[12,12,'PE-T4-02','rtr'],[14,14,'PE-T4-03','rtr']] },
    { st:'Full',       chip:'error',   n:'INDR-275-RACK-A', site:'MP-INDR-275', h:42, used:42, kw:'4.9 / 5.0', cool:'Front-to-back', occ:[[1,42,'Fully populated','rtr']] }
  ],
  power: [
    { st:'In service', chip:'success', n:'BGLK-277-DG-01',   site:'KA-BGLK-277', type:'DG set',    rating:'250 kVA', runtime:'18 h @ 60%', tested:'12-Aug-2026', vendor:'Cummins' },
    { st:'In service', chip:'success', n:'BGLK-277-RECT-01', site:'KA-BGLK-277', type:'Rectifier', rating:'48 V 600 A', runtime:'—',      tested:'12-Aug-2026', vendor:'Delta' },
    { st:'Degraded',   chip:'warning', n:'BGLK-277-BATT-01', site:'KA-BGLK-277', type:'Battery',   rating:'48 V 800 Ah', runtime:'2.4 h (was 4.0 h)', tested:'19-Jul-2026', vendor:'Exide' },
    { st:'In service', chip:'success', n:'DEL-279-RECT-01',  site:'DEL-279',     type:'Rectifier', rating:'48 V 400 A', runtime:'—',      tested:'02-Aug-2026', vendor:'Delta' },
    { st:'Failed',     chip:'error',   n:'INDR-275-DG-01',   site:'MP-INDR-275', type:'DG set',    rating:'125 kVA', runtime:'0 h',       tested:'14-Feb-2026', vendor:'Kirloskar' }
  ]
};
/* grown to a ten-row sample from the seeds above */
const PV_SITE = [['KA-BGLK-277','BGLK-277'],['DEL-279','DEL-279'],['MP-INDR-275','INDR-275'],
  ['Vijayawada','VJA-118'],['CHE-118','CHE-118'],['PUN-162','PUN-162'],['HYD-093','HYD-093'],
  ['KOL-204','KOL-204'],['AHM-131','AHM-131'],['JAI-058','JAI-058']];
const pvPad = (rows, target, tweak) => {
  const out = rows.slice();
  for (let i = 0; out.length < target; i++) out.push(tweak({ ...rows[i % rows.length] }, i));
  return out;
};
PASSIVE.fiber = pvPad(PASSIVE.fiber, 12, (r, i) => {
  const a = PV_SITE[i % PV_SITE.length], b = PV_SITE[(i + 3) % PV_SITE.length];
  const bad = i % 6 === 4, deg = i % 6 === 2;
  return { ...r, st: bad ? 'Cut' : deg ? 'Degraded' : 'In service',
    chip: bad ? 'error' : deg ? 'warning' : 'success',
    n: `FS-${a[1]}-${b[1]}`, a: `${a[1]} ODF-0${1 + i % 3}`, b: `${b[1]} ODF-0${1 + (i + 1) % 3}`,
    len: `${(4 + i * 7).toLocaleString('en-IN')},${String(100 + i * 13).slice(0, 3)} m`,
    cores: `${bad ? 0 : 8 + (i * 5) % 40} / ${[48, 96, 144][i % 3]}`,
    splices: 3 + (i * 4) % 28, otdr: `${String(2 + i % 26).padStart(2, '0')}-${['Feb','Apr','Jun','Jul','Aug'][i % 5]}-2026`,
    att: bad ? '—' : `0.${19 + (i * 3) % 24} dB/km`, own: i % 4 === 1 ? 'Leased' : 'Own' };
});
PASSIVE.odf = pvPad(PASSIVE.odf, 10, (r, i) => {
  const a = PV_SITE[i % PV_SITE.length], cap = [24, 48, 96][i % 3];
  return { ...r, st: i % 7 === 5 ? 'Planned' : 'In service', chip: i % 7 === 5 ? 'info' : 'success',
    n: `${a[1]}-ODF-0${1 + i % 4}`, site: a[0],
    type: `${cap === 24 ? 'Wall' : 'Rack'} mount ${cap}F`, cap,
    used: i % 7 === 5 ? 0 : Math.min(cap, 8 + (i * 9) % cap),
    rack: i % 7 === 5 ? '—' : `${'ABCD'[i % 4]} · U0${1 + i % 6}-0${2 + i % 6}`,
    term: i % 2 ? 'LC/UPC' : 'SC/APC' };
});
PASSIVE.rack = pvPad(PASSIVE.rack, 10, (r, i) => {
  const a = PV_SITE[i % PV_SITE.length], h = [42, 45, 47][i % 3], used = 12 + (i * 7) % (h - 12);
  const full = used >= h - 2;
  return { ...r, st: full ? 'Full' : 'In service', chip: full ? 'error' : 'success',
    n: `${a[1]}-RACK-${'ABCD'[i % 4]}`, site: a[0], h, used,
    kw: `${(1.4 + (i % 9) * 0.4).toFixed(1)} / ${[5.0, 6.0, 8.0][i % 3].toFixed(1)}`,
    cool: 'Front-to-back',
    occ: [[1, 2, 'ODF-0' + (1 + i % 3), 'odf'], [6 + i % 4, 6 + i % 4, 'SW-' + (10 + i), 'sw'],
          [20 + i % 6, 21 + i % 6, 'RTR-' + (20 + i), 'rtr']] };
});
PASSIVE.power = pvPad(PASSIVE.power, 10, (r, i) => {
  const a = PV_SITE[i % PV_SITE.length], kinds = ['DG set', 'Rectifier', 'Battery', 'SMPS'];
  const kind = kinds[i % 4], bad = i % 8 === 6, deg = i % 8 === 3;
  return { ...r, st: bad ? 'Failed' : deg ? 'Degraded' : 'In service',
    chip: bad ? 'error' : deg ? 'warning' : 'success',
    n: `${a[1]}-${['DG', 'RECT', 'BATT', 'SMPS'][i % 4]}-0${1 + i % 3}`, site: a[0], type: kind,
    rating: kind === 'DG set' ? `${[125, 180, 250, 320][i % 4]} kVA`
      : kind === 'Battery' ? `48 V ${[400, 600, 800][i % 3]} Ah` : `48 V ${[200, 400, 600][i % 3]} A`,
    runtime: kind === 'DG set' ? (bad ? '0 h' : `${8 + i % 14} h @ 60%`)
      : kind === 'Battery' ? `${(1.6 + (i % 5) * 0.6).toFixed(1)} h` : '—',
    tested: `${String(3 + i % 25).padStart(2, '0')}-${['Feb','May','Jul','Aug'][i % 4]}-2026`,
    vendor: ['Cummins', 'Delta', 'Exide', 'Kirloskar', 'Amara Raja'][i % 5] };
});

/* Splice closures, patch cords and ducts, modelled to the same depth as the
   other four so no passive tab lands on an empty list. */
PASSIVE.splice = Array.from({ length: 10 }, (_, i) => {
  const a = PV_SITE[i % PV_SITE.length], b = PV_SITE[(i + 3) % PV_SITE.length];
  const bad = i === 4, deg = i === 7;
  return { st: bad ? 'Faulty' : deg ? 'Degraded' : 'In service',
    chip: bad ? 'error' : deg ? 'warning' : 'success',
    n: `SC-${a[1]}-${String(11 + i * 3).padStart(3, '0')}`,
    site: a[0], span: `FS-${a[1]}-${b[1]}`,
    type: ['Dome 48F', 'Inline 24F', 'Dome 96F'][i % 3],
    fibers: (cap => `${Math.min(cap, 6 + (i * 7) % cap)} / ${cap}`)([48, 24, 96][i % 3]),
    loss: bad ? '—' : `${(0.04 + (i % 7) * 0.03).toFixed(2)} dB`,
    housing: i % 4 === 1 ? 'Aerial' : i % 4 === 2 ? 'Manhole' : 'Buried',
    surveyed: `${String(4 + i * 2).padStart(2, '0')}-${['Jan','Mar','May','Jul','Aug'][i % 5]}-2026` };
});
PASSIVE.cord = Array.from({ length: 10 }, (_, i) => {
  const a = PV_SITE[i % PV_SITE.length];
  const bad = i === 6;
  return { st: bad ? 'Faulty' : i === 3 ? 'Spare' : 'In service',
    chip: bad ? 'error' : i === 3 ? 'info' : 'success',
    n: `PC-${a[1]}-${String(101 + i * 7)}`, site: a[0],
    a: `ODF-0${1 + i % 3} port ${12 + i * 3}`,
    b: `${['RTR', 'SW', 'DWDM'][i % 3]}-${20 + i} port ${1 + i % 8}`,
    type: i % 2 ? 'LC-LC duplex' : 'SC-LC duplex',
    len: `${[1, 2, 3, 5, 10][i % 5]} m`,
    loss: bad ? '—' : `${(0.11 + (i % 6) * 0.04).toFixed(2)} dB`,
    surveyed: `${String(6 + i * 2).padStart(2, '0')}-${['Feb','Apr','Jun','Aug'][i % 4]}-2026` };
});
PASSIVE.duct = Array.from({ length: 10 }, (_, i) => {
  const a = PV_SITE[i % PV_SITE.length], b = PV_SITE[(i + 4) % PV_SITE.length];
  const blocked = i === 5;
  return { st: blocked ? 'Blocked' : i === 8 ? 'Planned' : 'In service',
    chip: blocked ? 'error' : i === 8 ? 'info' : 'success',
    n: `DT-${a[1]}-${b[1]}`, a: a[0], b: b[0],
    len: `${(1.2 + i * 0.8).toFixed(1)} km`,
    ways: `${1 + i % 4} / ${[4, 6, 8][i % 3]}`,
    bore: `${[40, 50, 63][i % 3]} mm HDPE`,
    own: i % 3 === 1 ? 'Leased' : 'Own',
    surveyed: `${String(9 + i).padStart(2, '0')}-${['Jan','Apr','Jun','Aug'][i % 4]}-2026` };
});

const PASSIVE_STATS = {
  coreFill: 62, spansCut: 3, spansDegraded: 11, odfFill: 58,
  rackFill: 64, racksFull: 41, powerOverdue: 87, surveyStale: 1440
};
