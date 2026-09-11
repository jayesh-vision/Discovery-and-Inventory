/* ═══ NODE VIEW ═══════════════════════════════════════════
   One network element, seen live. Read the source note on the
   screen: almost nothing here comes from the discovery
   collectors. Discovery writes identity and topology once a
   cycle; device health, ICMP/NTP/RADIUS probes, 24-hour
   availability, CPU and temperature series and active alarms
   are an assurance feed polled continuously. The screen says
   so, because a reader who assumes this is inventory data
   will draw the wrong conclusion about how fresh it is.
   ═══════════════════════════════════════════════════════ */
let NODE_ID = 'NDLS-J960-P_R1-T1-NR';
let NODE_PERF = '24h';
let NODE_ALERT_TAB = 'alerts';
let NODE_SVC_TAB = 'l3vpn';
let NODE_LINK_PROTO = 'LLDP'; /* which protocol card is selected in the Links section */
let NODE_LINK_SEL = 0; /* index into capRows — which link's own trend the capacity chart plots */
let NODE_HW_SEL = 'bbu'; /* which hardware hierarchy item is selected on eNodeB's Hardware & components tab */
let NODE_ENB_LINK_TAB = 'backhaul'; /* which sub-tab is selected on eNodeB's Network links tab */

/* deterministic pseudo-random so every element gets a stable, plausible node */
const nseed = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const nrand = (s, i, lo, hi) => lo + ((nseed(s) + i * 2654435761) % 100000) / 100000 * (hi - lo);
const nint = (s, i, lo, hi) => Math.round(nrand(s, i, lo, hi));

/* find the element wherever it lives in the estate */
function nodeRecord(name) {
  if (!name) name = NODE_ID;
  const rawName = String(name);
  const clean = decodeURIComponent(rawName).trim().toUpperCase();

  if (typeof PHY !== 'undefined' && PHY) {
    for (const k of Object.keys(PHY)) {
      const found = (PHY[k] || []).find(x => x.name && String(x.name).trim().toUpperCase() === clean);
      if (found) return { ...found, cls: k };
    }
  }

  if (typeof LOCATIONS !== 'undefined' && Array.isArray(LOCATIONS)) {
    for (const loc of LOCATIONS) {
      if (typeof siteNE === 'function') {
        const neObj = siteNE(loc.id, loc.ne, loc.disc);
        for (const k of Object.keys(neObj)) {
          const found = (neObj[k] || []).find(x => x.name && String(x.name).trim().toUpperCase() === clean);
          if (found) return { ...found, cls: k === 'dwdm' ? 'dwdm' : k === 'switch' ? 'switch' : 'router', loc: loc.id };
        }
      }
    }
  }

  if (typeof REC_ROWS !== 'undefined' && Array.isArray(REC_ROWS)) {
    const found = REC_ROWS.find(x => (x.name && String(x.name).trim().toUpperCase() === clean) ||
      (x.inv && x.inv.name && String(x.inv.name).trim().toUpperCase() === clean) ||
      (x.net && x.net.name && String(x.net.name).trim().toUpperCase() === clean));
    if (found) {
      const rec = found.inv || found.net || found;
      return {
        name: rec.name || rawName,
        ip: rec.ip || '172.31.33.100',
        oem: rec.oem || 'JUNIPER',
        model: rec.model || 'MX960',
        os: rec.os || '21.2R3-S8.5',
        sn: rec.sn || 'JN1236F87AFB',
        loc: rec.loc || 'DEL-279',
        cls: (rec.cls || 'router').toLowerCase(),
        st: rec.st || 'ok'
      };
    }
  }

  if (typeof TRANSCRIPT !== 'undefined' && TRANSCRIPT && TRANSCRIPT.host && String(TRANSCRIPT.host).trim().toUpperCase() === clean) {
    return {
      name: TRANSCRIPT.host,
      ip: TRANSCRIPT.ip,
      oem: 'JUNIPER',
      model: 'MX960',
      os: '21.2R3-S8.5',
      sn: 'JN1236F87AFB',
      loc: 'DEL-279',
      cls: 'router',
      st: 'ok'
    };
  }

  let urlCls = null;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('q') || '';
      const mCls = q.match(/cls=([^&]+)/) || q.match(/tab=([^&]+)/);
      urlCls = sp.get('cls') || sp.get('type') || sp.get('tab') || (mCls ? mCls[1] : null);
      if (urlCls) urlCls = urlCls.toLowerCase();
    }
  } catch (err) {}

  const isSw = urlCls === 'switch' || clean.includes('SW') || clean.includes('SWITCH') || clean.includes('CHR') || clean.includes('ACC') || clean.includes('DIST');
  const isServer = urlCls === 'server' || clean.includes('SERVER') || clean.includes('SRV') || clean.includes('HOST');
  const isDwdm = urlCls === 'dwdm' || clean.includes('DWDM') || clean.includes('OPT');
  const isRouter = urlCls === 'router' || clean.includes('ROUTER') || clean.includes('RTR') || clean.includes('MX') || clean.includes('ACX') || clean.includes('J960') || clean.includes('N540');
  const cls = isSw ? 'switch' : isServer ? 'server' : isDwdm ? 'dwdm' : isRouter ? 'router' : (urlCls || 'router');

  const oem = clean.startsWith('C') || clean.includes('CISCO') || clean.includes('N540') || clean.includes('ASR') ? 'CISCO'
    : clean.startsWith('N') || clean.includes('NOKIA') || clean.includes('7750') ? 'NOKIA'
    : clean.includes('HPE') || clean.includes('DELL') ? 'HPE'
    : 'JUNIPER';
  const model = oem === 'CISCO' ? (clean.includes('540') ? 'NCS-540' : 'ASR920')
    : oem === 'NOKIA' ? '7750'
    : clean.includes('204') ? 'MX204' : clean.includes('2200') ? 'ACX2200' : 'MX960';
  const os = oem === 'CISCO' ? '17.9.4' : oem === 'NOKIA' ? 'TiMOS-C-22.10' : '21.2R3-S8.5';
  const ip = `172.31.${nint(rawName, 1, 10, 99)}.${nint(rawName, 2, 10, 250)}`;
  const sn = `${oem.slice(0,2)}${nint(rawName, 3, 100000, 999999)}AFB`;
  const loc = `${clean.slice(0,3)}-${nint(rawName, 4, 100, 400)}`;

  return { name: rawName, ip, oem, model, os, sn, loc, cls, st: 'ok', stock: 'deployed', v: 3 };
}

const NODE_CLASS = {
  router: { n:'Router', live:true,  hw:'chassis' },
  switch: { n:'Switch', live:true,  hw:'env' },
  dwdm:   { n:'DWDM',   live:true,  hw:'optical' },
  server: { n:'Server', live:false },
  enodeb: { n:'eNodeB', live:true,  hw:'radio' }, gnodeb: { n:'gNodeB', live:false }
};

function nodeOf(name) {
  const r = nodeRecord(name), cls = r.cls, meta = NODE_CLASS[cls] || NODE_CLASS.router;
  const s = name, sw = cls === 'switch';
  const ifTotal = sw ? nint(s, 1, 336, 384) : nint(s, 1, 24, 48);
  const ifUp    = Math.round(ifTotal * nrand(s, 2, 0.6, 0.97));
  const health  = +(nrand(s, 3, sw ? 92 : 84, 99.4)).toFixed(2);
  const cpu = nint(s, 4, 38, 74), mem = nint(s, 5, 45, 78), temp = nint(s, 6, 41, 62);

  /* 24 hourly availability samples per probe — the odd bad hour is the point */
  const strip = (k, badAt) => Array.from({ length: 24 }, (_, h) =>
    h === badAt ? nint(s, 40 + h + k, 62, 88) : (nint(s, 60 + h + k, 0, 100) > 96 ? 99 : 100));

  /* Performance forecast: 7 points, first 4 measured, last 4 predicted.
     Index 3 belongs to both so the dashed line starts where the solid ends. */
  const FCPTS = 7, SPLIT = 3;
  const labels = NODE_PERF === '24h'
    ? ['00:00','04:00','08:00','12:00','16:00','20:00','24:00']
    : ['Apr 3','Apr 4','Apr 5','Apr 6','Apr 7','Apr 8','Apr 9'];
  const mkSeries = (base, drift, jit, key) => {
    const vals = Array.from({ length: FCPTS }, (_, i) => {
      const w = i / (FCPTS - 1);
      return Math.max(4, Math.min(99, Math.round(base * (0.86 + w * drift) + nrand(s, key + i, -jit, jit))));
    });
    return { a: vals.map((v, i) => i <= SPLIT ? v : null),
             f: vals.map((v, i) => i >= SPLIT ? v : null), vals };
  };
  const fc = {
    labels,
    cpu:  { ...mkSeries(cpu,  0.30, 3, 100), tone:'blue',   n:'CPU',    thr:80, thrN:'CPU 80%' },
    mem:  { ...mkSeries(mem,  0.24, 2, 200), tone:'orange', n:'Memory', thr:85, thrN:'Mem 85%' },
    temp: { ...mkSeries(temp, 0.26, 2, 300), tone:'red',    n:'Temp',   thr:70, thrN:'Temp 70°C' }
  };
  const series = labels.map((t, i) => ({ t, cpu:fc.cpu.vals[i], mem:fc.mem.vals[i], temp:fc.temp.vals[i] }));

  const sfpTypes = sw ? ['1000BASE-LX','1000BASE-SX','10GE SFP+ LR','10GBASE-LR','10G SFP+ ER','QSFP28 LR4','25G SR']
                      : ['SFP+-10G-LR','SFP+-10G-ER','QSFP+-40G-LR4','SFP-1G-LX'];
  const sfp = Array.from({ length: sw ? 8 : 10 }, (_, i) => {
    const tx = +(nrand(s, 400 + i, -6.2, 1.8)).toFixed(1);
    const rx = +(nrand(s, 500 + i, -24, -1.5)).toFixed(1);
    return {
      port: sw ? `TenGigE0/0/${i}` : `xe-0/0/${i}`,
      type: sfpTypes[i % sfpTypes.length],
      st: rx < -18 ? 'Faulty' : rx < -12 ? 'Standby' : 'Active',
      tx, rx, temp: nint(s, 600 + i, 33, 52)
    };
  });

  const protoRows = [
    { k:'LLDP', n:'Protocol Links', a:nint(s, 7, 4, 24), d:nint(s, 8, 0, 3), i:nint(s, 9, 0, 2), tone:'sky' },
    { k:'BGP',  n:'Protocol Links', a:nint(s, 10, 1, 8), d:nint(s, 11, 0, 2), i:nint(s, 12, 0, 1), tone:'purple' },
    { k:'OSPF', n:'Protocol Links', a:nint(s, 13, 2, 14), d:nint(s, 14, 0, 2), i:nint(s, 15, 0, 2), tone:'emerald' },
    { k:'ISIS', n:'Protocol Links', a:nint(s, 16, 0, 6), d:nint(s, 17, 0, 1), i:0, tone:'amber' },
    { k:'LSP',  n:'Protocol Links', a:nint(s, 18, 1, 10), d:nint(s, 19, 0, 2), i:nint(s, 20, 0, 1), tone:'rose' }
  ];

  const capRows = Array.from({ length: 5 }, (_, i) => {
    const util = nint(s, 700 + i, 46, 94);
    return {
      n: sw ? `RTR-${['DEL','DEL','MUM','MUM','BLR'][i]}-0${i + 1}` : `BB-T4 Akashvani-IC${i + 1}`,
      peer: sw ? `TenGigE0/${i}/0/2` : `${['Akashvani','Vivekanand','Karolbagh','Rohini','Dwarka'][i]}-Shpantal`,
      sip: `10.${10 + i}.0.${i + 1}`, dip: `10.${10 + i}.0.${i + 2}`,
      util, sess: nint(s, 800 + i, 4000, 9400),
      fc: ['Jan 2026','Apr 2026','May 2026','Aug 2026','Nov 2026'][i],
      growth: +(nrand(s, 900 + i, 2.4, 9.8)).toFixed(1),
      tone: util > 85 ? 'red' : util > 70 ? 'amber' : 'emerald'
    };
  });
  /* one capacity trend per protocol card — same deterministic-seed technique
     as everything else here, just offset per protocol so LLDP/BGP/OSPF/ISIS
     each get their own stable, plausible curve instead of sharing one */
  const PROTO_SEED_OFF = { LLDP: 0, BGP: 200, OSPF: 400, ISIS: 600, LSP: 800 };
  const capTrendFor = proto => {
    const off = PROTO_SEED_OFF[proto] || 0;
    return Array.from({ length: 7 }, (_, i) => ({
      m: ['Dec','Jan','Feb','Mar','Apr','May','Jun'][i],
      a: Math.round(nrand(s, 1000 + off + i, 28, 52) + i * 6),
      f: Math.round(nrand(s, 1100 + off + i, 44, 62) + i * 5.5)
    }));
  };
  const capTrendByProto = { LLDP: capTrendFor('LLDP'), BGP: capTrendFor('BGP'), OSPF: capTrendFor('OSPF'), ISIS: capTrendFor('ISIS'), LSP: capTrendFor('LSP') };
  const capTrend = capTrendByProto.LLDP;

  /* a specific link's own 7-point capacity trend, derived from the two real
     numbers its row already shows (current utilisation and monthly growth
     rate) rather than a fresh unrelated seed — "Mar" (index 3) is pinned to
     the link's actual displayed utilisation, months before it are backed
     out by the same growth rate and months after project forward with it,
     so the curve is a real extrapolation of that link's own stated trend */
  const linkTrend = row => {
    const g = 1 + row.growth / 100;
    const vals = [0, 0, 0, row.util, 0, 0, 0];
    for (let i = 2; i >= 0; i--) vals[i] = +(vals[i + 1] / g).toFixed(1);
    for (let i = 4; i <= 6; i++) vals[i] = +(vals[i - 1] * g).toFixed(1);
    const months = ['Dec','Jan','Feb','Mar','Apr','May','Jun'];
    return vals.map((v, i) => ({ m: months[i], a: i <= 3 ? v : null, f: i >= 3 ? v : null }));
  };

  /* the switch Links panel plots a week of inbound vs outbound utilisation
     for one link, not an actual/forecast split — both series run the full
     week, each seeded off the link's own name + its real utilisation so a
     link showing 91% util plots a visibly busier week than one at 46% */
  const linkTrendDaily = row => {
    const days = ['23 Jun','24 Jun','25 Jun','26 Jun','27 Jun','28 Jun','29 Jun'];
    return days.map((d, i) => ({
      m: d,
      a: Math.max(4, Math.min(100, Math.round(row.util + nrand(row.n, 2000 + i, -24, 24)))),
      f: Math.max(4, Math.min(100, Math.round(row.util + nrand(row.n, 2100 + i, -24, 24))))
    }));
  };

  const svcTypes = [
    { n:'IRV',         c:nint(s, 20, 1, 4),  a:nint(s, 21, 1, 3), deg:0, dn:0, sla:99.9 },
    { n:'Leased Line', c:nint(s, 22, 1, 5),  a:nint(s, 23, 1, 4), deg:nint(s, 24, 0, 1), dn:0, sla:99.9 },
    { n:'L2VPN',       c:nint(s, 25, 1, 4),  a:nint(s, 26, 1, 3), deg:0, dn:0, sla:99.9 },
    { n:'L3VPN',       c:nint(s, 27, 2, 6),  a:nint(s, 28, 2, 5), deg:nint(s, 29, 0, 1), dn:0, sla:100 },
    { n:'Others',      c:nint(s, 30, 1, 3),  a:nint(s, 31, 1, 2), deg:0, dn:0, sla:99.9 }
  ];
  const svcTotal = svcTypes.reduce((a, t) => a + t.c, 0);
  const CUST = ['Enterprise Corp','Telecom Provider','Finance Group','Media Corporation','Logistics Partners',
                'Retail Chain','Education Institute','Health Network'];
  const instances = Array.from({ length: 8 }, (_, i) => {
    const util = nint(s, 1200 + i, 34, 96);
    return {
      id: `SVC-${(sw ? 'L3' : 'L2')}-${1000 + nint(s, 1300 + i, 100, 999)}`,
      type: ['L3VPN','L2VPN','Leased Line','L3VPN','IRV','L3VPN','L2VPN','L3VPN'][i],
      cust: CUST[i], st: util > 92 ? 'Degraded' : i === 3 ? 'Disable' : 'Active',
      bw: ['1 Gbps','500 Mbps','200 Mbps','1 Gbps','2 Gbps','500 Mbps','1 Gbps','10 Gbps'][i],
      util, sla: [99.9, 99.5, 99.9, 99.99, 99.9, 99.5, 99.9, 99.99][i],
      up: +(nrand(s, 1400 + i, 99.1, 99.99)).toFixed(2),
      ifc: sw ? `GigabitEthernet0/0/${i}` : `xe-0/0/${i}`
    };
  });

  const ALARM = [
    { sev:'Critical', t:'Interface Flapping Detected', d:'Interface state changed 8 times in 20 minutes',
      src:'Interface', at:'Interface', code:'ALM-1930', when:'30-Jun-2026 12:30:00' },
    { sev:'Major', t:'High CPU Utilization', d:'CPU sustained above 77% for 45 minutes',
      src:'CPU', at:'CPU', code:'ALM-1831', when:'30-Jun-2026 14:05:00' },
    { sev:'Major', t:'Link Degradation', d:'Latency increased to 12.4 ms, packet loss detected',
      src:'Link', at:'Link', code:'ALM-1774', when:'30-Jun-2026 09:12:00' },
    { sev:'Minor', t:'Temperature Warning', d:'Temperature elevated to 58°C in slot 3',
      src:'Environment', at:'Thermal', code:'ALM-1610', when:'29-Jun-2026 22:41:00' },
    { sev:'Warning', t:'Optical Rx drifting', d:'SFP on xe-0/0/4 down 0.4 dB per month',
      src:'Optics', at:'Optical', code:'ALM-1502', when:'28-Jun-2026 06:20:00' }
  ];

  return {
    r, cls, meta, live: meta.live, name,
    ready: health > 95 ? 'Ready' : 'Degraded',
    ov: { health, proto: protoRows.reduce((a, p) => a + p.a, 0),
          arp: sw ? nint(s, 32, 40, 120) : null,
          ifUp, ifTotal, alarms: nint(s, 33, 2, 9),
          uptime: sw ? `${nint(s, 34, 120, 420)} Days` : `${nint(s, 34, 12, 340)}d ${nint(s, 35, 0, 23)}h`,
          since: '10-Feb-2026' },
    icmp: { loss:+(nrand(s, 36, 0, 0.6)).toFixed(2), lat:+(nrand(s, 37, 0.7, 2.9)).toFixed(2),
            jit:+(nrand(s, 38, 0.1, 1.4)).toFixed(2), avail:+(nrand(s, 39, 98.4, 100)).toFixed(2),
            checked:'1 min ago', probe:'1:1' },
    ntp:  { off:+(nrand(s, 41, -1.4, 1.9)).toFixed(2), delay:+(nrand(s, 42, 0.4, 0.9)).toFixed(3),
            jit:+(nrand(s, 43, 0.1, 4.8)).toFixed(3), primary:'10.16.16.10', secondary:'10.16.16.11',
            stratum:nint(s, 44, 2, 4), sync:'30-Jun-2026 11:10:00' },
    rad:  { primary:'10.25.25.5', secondary:'10.25.25.6', ok:+(nrand(s, 45, 96.2, 99.9)).toFixed(1),
            fails:nint(s, 46, 0, 6), last:'30-Jun-2026 11:47:00' },
    avail: { icmp: strip(1, nint(s, 47, 3, 21)), ntp: strip(2, nint(s, 48, 3, 21)) },
    perf: { cpu, mem, temp, series, fc,
            fCpu: fc.cpu.vals[6], fMem: fc.mem.vals[6], fTemp: fc.temp.vals[6] },
    chassis: buildChassis(s, r, cls),
    optical: cls === 'dwdm' ? buildOptical(s, r) : null,
    enb: cls === 'enodeb' ? buildEnodebSite(s, r) : null,
    env: { psu:[2, 2], fans:[nint(s, 49, 4, 6), nint(s, 49, 4, 6)], rpm:nint(s, 50, 4200, 6800),
           tmin:nint(s, 51, 28, 34), tmax:nint(s, 52, 48, 56), tin:nint(s, 53, 38, 46) },
    sfp, protoRows, capRows, capTrend, capTrendByProto, linkTrend, linkTrendDaily,
    svcTypes, svcTotal, instances,
    sla: +(nrand(s, 54, 99.2, 99.98)).toFixed(2),
    customers: nint(s, 55, 6, 18), atRisk: nint(s, 56, 1, 6),
    alarmsList: ALARM.slice(0, nint(s, 57, 3, 5)),
    vlans: sw ? Array.from({ length: 7 }, (_, i) => ({
      id: [10, 20, 30, 40, 50, 60, 99][i],
      n: ['USERS','SERVERS','WIFI','PRINTERS','VOICE','GUEST','MGMT'][i],
      t: ['Data','Server','Wireless','Data','Voice','Guest','Management'][i],
      mac: [1600, 124, 5430, 12, 89, 312, 4][i],
      tr: nint(s, 1500 + i, 2, 26), acc: nint(s, 1600 + i, 0, 30),
      bw: ['420 Mbps','1600 Mbps','980 Mbps','4 Mbps','38 Mbps','38 Mbps','2 Mbps'][i],
      pct: nint(s, 1700 + i, 8, 82), stp:'Forward…', st:'Active'
    })) : null
  };
}

/* ── physical chassis model ────────────────────────────────
   Every port here is counted in the tally under the diagram,
   so the legend total is the diagram, not a separate number. */
function buildChassis(s, r, cls) {
  const pick = (i, upTo) => { const v = nint(s, 3000 + i, 0, 100);
    return v < upTo ? 'up' : v < upTo + 10 ? 'warn' : v < upTo + 24 ? 'down' : 'empty'; };
  const mgmt = [{ n:'MGMT', st:'up' }, { n:'CONSOLE', st:'up' }];
  const slotN = cls === 'switch' ? 24 : 6;
  const slots = [{ n:'SLOT 0', badge: cls === 'switch' ? '1G ETH ×24' : '1G ETH',
                   ports: Array.from({ length: slotN }, (_, i) => ({ i, st: pick(i, 62) })) }];
  const mods  = [{ n:'MODULE 1', badge:'10G SFP+',
                   ports: Array.from({ length: 4 }, (_, i) => ({ i, st: i < 2 ? pick(50 + i, 82) : 'empty' })) }];
  const all = [...mgmt, ...slots[0].ports, ...mods[0].ports];
  const tally = { up:0, warn:0, down:0, empty:0 };
  all.forEach(p => tally[p.st === 'warn' ? 'warn' : p.st]++);
  return {
    oem: r.oem, model: r.model, sn: r.sn, mgmt, slots, mods,
    leds: [['PWR','ok'], ['SYS','ok'], ['FAN', nint(s, 3100, 0, 10) > 8 ? 'warn' : 'ok']],
    re:  [{ n:'RE-0', st:'Active', temp: nint(s, 3200, 38, 48) },
          ...(cls === 'router' ? [{ n:'RE-1', st:'Backup', temp: nint(s, 3201, 36, 45) }] : [])],
    psu: [{ n:'PSU-1', st:'Active',  w: cls === 'switch' ? 350 : 750 },
          { n:'PSU-2', st:'Standby', w: cls === 'switch' ? 350 : 750 }],
    fans: Array.from({ length: 3 }, (_, i) => ({ n:`FAN${i + 1}`, rpm: nint(s, 3300 + i, 3100, 3900) })),
    tally, total: all.length
  };
}

/* ── DWDM optical model ────────────────────────────────────
   Real-world OADM/ROADM conventions the shape below draws on: 100GHz
   ITU-T C-band grid (96 channels), OL-/MOD-/PL- port and slot naming,
   Pre-amp/Booster EDFA + Raman gain stages, pre-FEC BER and uncorrectable
   error counters. Every number is the deterministic nrand/nint sample
   convention used everywhere else in this file — stable per node name,
   plausible, never a live measurement. The degree peers, shelves, channels,
   amplifiers and alarms below are cross-linked (an alarm names the exact
   channel/optic/amp shown flagged on its own tab), not four independent
   random tables. */
const SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻' };
const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
const sci = (mantissa, exp) => `${mantissa.toFixed(2)}×10${sup(exp)}`;

function buildOptical(s, r) {
  const DEGREES = ['Jalgaon-100G','Bhusawal-100G','Nashik-100G','Surat-100G','Vadodara-100G','Indore-100G','Nagpur-100G','Solapur-100G'];
  const d0 = nint(s, 5000, 0, DEGREES.length - 1);
  const westPeer = DEGREES[d0];
  const eastPeer = DEGREES[(d0 + 3) % DEGREES.length];
  const buildPeer = DEGREES[(d0 + 5) % DEGREES.length];
  const sparePeer = DEGREES[(d0 + 7) % DEGREES.length];

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const commYear = nint(s, 5800, 2012, 2021);
  const commissioned = `${nint(s, 5801, 1, 28)} ${MONTHS[nint(s, 5802, 0, 11)]} ${commYear}`;

  const shelves = [
    { id: 1, title: `West Degree (${westPeer})`, modules: [
        { slot: `MOD-1-${nint(s, 5400, 3, 6)}`, desc: '8ROADM-C80/0/OPM' },
        { slot: `MOD-1-${nint(s, 5401, 7, 8)}/${nint(s, 5402, 9, 10)}`, desc: 'EDFA-C-D20-VLGC-DM' },
        { slot: 'MOD-1-3', desc: 'OSCM-PN — supervisory, 1510nm' }
      ] },
    { id: 2, title: `East Degree (${eastPeer})`, modules: [
        { slot: 'MOD-2-3/4', desc: `2PM/SM — client circuit A` },
        { slot: 'MOD-2-15', desc: `2PM/SM — client circuit B` },
        { slot: 'MOD-2-16', desc: 'EDFA-C-D20-VGC-DM' },
        { slot: 'PL-2-9-C10', desc: 'SFP — client pluggable', flag: 'Outage', tone: 'error' }
      ] },
    { id: 3, title: 'Legacy OTU2 Clients', modules: [
        { slot: 'MOD-3-8', desc: '4TCC OTU2 — client circuit', flag: 'down', tone: 'error' },
        { slot: 'MOD-3-18', desc: 'EDFA-C-D20-VGC-DM' }
      ] },
    { id: 4, title: `New 100G Build (${buildPeer})`, modules: [
        { slot: 'MOD-4-7', desc: `8ROADM — towards ${buildPeer}` },
        { slot: 'MOD-4-17', desc: 'WCC-PCN-100GB', flag: 'watch', tone: 'warning' }
      ] }
  ];

  const opticsInventory = [
    { port: 'PL-1-3-NE/NW', type: 'SFP/FE/C1510V/SM/LC', wl: '1510nm (OSC)',
      serial: `FA${nint(s, 5500, 70000000, 79999999)}`, installed: String(commYear), status: 'Normal' },
    { port: 'PL-1-10-C1..C10', type: 'SFP+/11GU/1310S/SM/LC', wl: '1310nm grey',
      serial: 'multiple', installed: `${commYear}–${commYear + 7}`, status: 'Normal' },
    { port: 'PL-2-9-C10', type: 'SFP', wl: '—', serial: 'N/A — no serial', installed: '—', status: 'Outage' },
    { port: 'PL-4-3-C', type: 'CFP/112G/LR4/SM/LC', wl: '1310nm (LR4 grey)',
      serial: `FA${nint(s, 5501, 100000, 999999)}`, installed: '2024', status: 'Normal' },
    { port: 'PL-4-10-N', type: 'CFP/112G/#DCTC/SM/LC', wl: 'Tunable DWDM line',
      serial: `FA${nint(s, 5502, 100000, 999999)}`, installed: '2024', status: 'Normal' },
    { port: 'PL-4-17-N', type: 'CFP/112G/#DCTCA/SM/LC', wl: 'Tunable DWDM line',
      serial: `FA${nint(s, 5503, 100000, 999999)}`, installed: '2024', status: 'CH-4-17-N watch' }
  ];

  const ringTopology = [
    { a: r.name || s, portA: 'OL-2', z: westPeer, portZ: 'OL-1', status: 'Active — West degree', tone: 'success' },
    { a: eastPeer, portA: 'OL-1', z: r.name || s, portZ: 'OL-2', status: 'Active — East degree', tone: 'success' },
    { a: r.name || s, portA: 'MOD-4-7', z: `${buildPeer} — separate node/platform`, portZ: '—', status: 'New build — watch channel', tone: 'warning' },
    { a: 'Spare', portA: '—', z: sparePeer, portZ: '—', status: 'FCU free', tone: 'neutral' }
  ];

  /* GRID_CHANNELS: the real ITU-T C-band 100GHz grid width (96 channels);
     these 6 are the ones actually being monitored on this element. */
  const GRID_CHANNELS = 96;
  const CH_DEF = [
    { ch: 'CH-1-10-N', shelf: 'Shelf-1/10' }, { ch: 'CH-2-9-N', shelf: 'Shelf-2/9' },
    { ch: 'CH-3-8-N', shelf: 'Shelf-3/8', down: true }, { ch: 'CH-4-3-N', shelf: 'Shelf-4/3' },
    { ch: 'CH-4-12-N', shelf: 'Shelf-4/12' }, { ch: 'CH-4-17-N', shelf: 'Shelf-4/17', watch: true }
  ];
  const channels = CH_DEF.map((c, i) => {
    if (c.down) return { ...c, margin: null, ber: null, corrected: null, ube: null, st: 'DOWN', tone: 'error' };
    const margin = +(nrand(s, 5100 + i, c.watch ? 10.8 : 12.4, c.watch ? 12.6 : 16.2)).toFixed(1);
    const exp = margin < 12 ? -5 : margin < 14 ? -6 : -7;
    const ber = sci(+(nrand(s, 5200 + i, 1.2, 9.8)).toFixed(2), exp);
    const showCorrected = nint(s, 5300 + i, 0, 1) === 1;
    const corrected = showCorrected ? sci(+(nrand(s, 5310 + i, 1.1, 9.8)).toFixed(2), margin < 12 ? 9 : 8) : null;
    const st = margin < 12 ? 'Watch' : margin < 14 ? 'Monitor' : 'Healthy';
    return { ...c, margin, ber, corrected, ube: 0, st, tone: st === 'Watch' ? 'error' : st === 'Monitor' ? 'warning' : 'success' };
  });
  const liveChannels = channels.filter(c => !c.down);
  const worst = liveChannels.reduce((w, c) => c.margin < w.margin ? c : w, liveChannels[0]);

  const amplifiers = [
    { n: 'West Pre-Amp', model: 'EDFA-C-D20-VLGC-DM', gain: +(nrand(s, 5600, 16, 20)).toFixed(1),
      out: +(nrand(s, 5601, 14, 18)).toFixed(1), pump: nint(s, 5602, 120, 160), st: 'Healthy' },
    { n: 'West Booster', model: 'EDFA-C-S20-GCB-DM', gain: +(nrand(s, 5610, 19, 23)).toFixed(1),
      out: +(nrand(s, 5611, 16, 20)).toFixed(1), pump: nint(s, 5612, 170, 210), st: 'Healthy' },
    { n: 'East Pre-Amp', model: 'EDFA-C-D20-VGC-DM', gain: +(nrand(s, 5620, 16, 19)).toFixed(1),
      out: +(nrand(s, 5621, 14, 17)).toFixed(1), pump: nint(s, 5622, 120, 150), st: 'Healthy' },
    { n: 'Shelf-3 Inline', model: 'EDFA-C-D20-VGC-DM', standalone: true,
      st: 'Stable — not implicated in CH-3-8-N outage' }
  ];

  const tilt = +(nrand(s, 5710, 0.3, 0.9)).toFixed(1);
  const alarms = [
    { sev: 'Major', entity: 'CH-3-8-N', evidence: `UAS=${nint(s, 5700, 600, 1200)}s, 3 consecutive bins`, tab: 'channels', open: true },
    { sev: 'Major', entity: 'PL-2-9-C10', evidence: 'OperState=Outage, no serial', tab: 'hardware', open: true },
    { sev: 'Minor', entity: 'CH-4-17-N', evidence: `Margin ${worst.margin} dB, lowest of ${liveChannels.length}`, tab: 'channels', open: false },
    { sev: 'Critical', entity: 'Amp-1-NW', evidence: `Gain tilt +${tilt} dB over 24h`, tab: 'amplifiers', open: false }
  ];

  const openAlarms = alarms.filter(a => a.open).length;
  const healthScore = Math.max(60, Math.min(96, 96 - openAlarms * 6
    - (alarms.some(a => a.sev === 'Critical') ? 8 : 0) - (worst.margin < 12 ? 8 : worst.margin < 14 ? 4 : 0)));

  return {
    westPeer, eastPeer, buildPeer, sparePeer, commissioned, commYear,
    shelves, opticsInventory, ringTopology, channels, worst, GRID_CHANNELS,
    amplifiers, alarms, healthScore,
    critical: alarms.filter(a => a.sev === 'Critical').length,
    major: alarms.filter(a => a.sev === 'Major').length,
    minor: alarms.filter(a => a.sev === 'Minor').length,
    openAlarms, ackAlarms: alarms.length - openAlarms
  };
}

/* ── eNodeB radio site model ──────────────────────────────
   Real LTE/4G conventions this draws on: sector/carrier cell counts, RRC
   accessibility / drop call rate / handover success / radio latency as the
   standard radio KPI set, S1 (eNodeB↔EPC) and X2 (eNodeB↔eNodeB) as the
   real 3GPP interface names, BBU/RRH/sector as the real site hardware
   roles. Every number is the same deterministic nrand/nint sample
   convention used everywhere else in this file — stable per node name,
   plausible, never a live measurement. Alarms, hardware and links are
   cross-linked (an AI insight names the actual hottest/busiest hardware
   item, not a canned example). */
function buildEnodebSite(s, r) {
  const MORPH = ['Dense urban', 'Urban', 'Suburban', 'Rural'];
  const TOWER = ['Rooftop', 'Monopole', 'Lattice', 'Stealth'];
  const SITE_TYPE = ['Cell Site', 'Rooftop Site', 'Indoor Site', 'Small Cell'];
  const morphology = MORPH[nint(s, 6000, 0, MORPH.length - 1)];
  const towerType = TOWER[nint(s, 6001, 0, TOWER.length - 1)];
  const siteType = SITE_TYPE[nint(s, 6002, 0, SITE_TYPE.length - 1)];
  const sectors = nint(s, 6003, 2, 2) + 1;
  const carriersPerSector = nint(s, 6004, 2, 3);
  const cells = sectors * carriersPerSector;
  const cellsDown = nint(s, 6005, 0, 1);
  const cellsDegraded = nint(s, 6006, 0, 2);
  const cellsActive = cells - cellsDown;
  const siteId = `${(r.loc || 'SITE').split('-')[0]}-CP-${String(nint(s, 6007, 1, 999)).padStart(3, '0')}`;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const onAir = `${nint(s, 6009, 1, 28)} ${MONTHS[nint(s, 6010, 0, 11)]} ${nint(s, 6008, 2018, 2026)}`;
  const uptimeStr = `${nint(s, 6011, 5, 400)}d ${nint(s, 6012, 0, 23)}h ${nint(s, 6013, 0, 59)}m`;
  const swVersion = `LTE_R15_v${nint(s, 6014, 1, 9)}.${nint(s, 6015, 0, 9)}.${nint(s, 6016, 0, 9)}`;

  const healthScore = nint(s, 6020, 78, 97);
  const healthTrend = +(nrand(s, 6021, -1.5, 3.5)).toFixed(1);
  const connectedUsers = nint(s, 6022, 400, 1800);
  const peakUsers = connectedUsers + nint(s, 6023, 200, 900);
  const totalParams = nint(s, 6024, 150, 220);
  const nonCompliantCount = nint(s, 6025, 2, 6);
  const configCompliance = +((totalParams - nonCompliantCount) / totalParams * 100).toFixed(2);
  const availability = +(nrand(s, 6026, 99.4, 99.99)).toFixed(2);
  const rrc = +(nrand(s, 6030, 96.5, 99.4)).toFixed(2);
  const dropCall = +(nrand(s, 6031, 0.2, 1.4)).toFixed(2);
  const handover = +(nrand(s, 6032, 93, 98.9)).toFixed(2);
  const latency = nint(s, 6033, 8, 22);

  const freqBands = [1800, 2100, 2300];
  const ALARM_DEF = [
    { sev: 'Major', t: 'High PRB utilization', d: 'Physical resource block utilization exceeds 85% threshold',
      src: 'Cell', srcDetail: `Cell-${nint(s, 6040, 0, sectors - 1)}-FDD-${freqBands[nint(s, 6041, 0, 2)]}`, impact: 'Medium', open: true },
    { sev: 'Minor', t: 'RRH temperature warning', d: 'RRH temperature trending above normal operating range',
      src: 'Hardware', srcDetail: `RRH Unit ${nint(s, 6042, 1, 3)} (Sector ${String.fromCharCode(65 + nint(s, 6043, 0, sectors - 1))})`, impact: 'Low', open: false },
    { sev: 'Major', t: 'Handover failure rate high', d: 'Handover failure rate exceeded 5% threshold',
      src: 'Cell', srcDetail: `Cell-${nint(s, 6044, 0, sectors - 1)}-FDD-${freqBands[nint(s, 6045, 0, 2)]}`, impact: 'Medium', open: true },
    { sev: 'Minor', t: 'Backhaul link quality variation', d: 'Microwave backhaul signal quality showing variations',
      src: 'Link', srcDetail: 'Primary backhaul (BH-MW-001)', impact: 'Low', open: false }
  ];
  const alarms = ALARM_DEF.map((a, i) => ({ ...a, when: `${nint(s, 6050 + i, 20, 240)}m ago` }));

  const HW_DEF = [
    { id: 'bbu', label: 'BBU (Baseband unit)', model: 'Ericsson RBS 6601' },
    { id: 'power', label: 'Power systems', model: 'Eltek Flatpack2 HE' },
    ...Array.from({ length: sectors }, (_, i) => ({ id: `sector${String.fromCharCode(65 + i)}`, label: `Sector ${String.fromCharCode(65 + i)}`, model: 'CommScope NNVV-65C-R2B' })),
    { id: 'infra', label: 'Infrastructure', model: 'Site infrastructure' }
  ];
  const HOURS = Array.from({ length: 24 }, (_, i) => `${String((19 + i) % 24).padStart(2, '0')}:00`);
  const hardware = HW_DEF.map((h, i) => {
    const health = nint(s, 6100 + i, 90, 100);
    const cpuBase = nint(s, 6110 + i, 18, 52), memBase = nint(s, 6120 + i, 28, 58), tempBase = nint(s, 6130 + i, 30, 46);
    const trend = HOURS.map((m, k) => ({
      m,
      cpu: Math.max(4, Math.min(100, Math.round(cpuBase + nrand(s, 6200 + i * 30 + k, -8, 8)))),
      mem: Math.max(4, Math.min(100, Math.round(memBase + nrand(s, 6300 + i * 30 + k, -6, 6)))),
      temp: Math.max(4, Math.min(100, Math.round(tempBase + nrand(s, 6400 + i * 30 + k, -3, 3))))
    }));
    const last = trend[23];
    return { ...h, health, cpu: last.cpu, mem: last.mem, temp: last.temp, trend,
      firmware: `L${nint(s, 6140 + i, 18, 22)}B v${nint(s, 6141 + i, 1, 9)}.${nint(s, 6142 + i, 0, 9)}.${nint(s, 6143 + i, 0, 9)}`,
      uptime: uptimeStr, status: health >= 97 ? 'Active' : health >= 90 ? 'Degraded' : 'Warning' };
  });
  const hottest = hardware.reduce((w, h) => h.temp > w.temp ? h : w, hardware[0]);
  const busiest = hardware.reduce((w, h) => h.cpu > w.cpu ? h : w, hardware[0]);
  const avgHwHealth = +(hardware.reduce((a, h) => a + h.health, 0) / hardware.length).toFixed(1);
  const hwInsights = [
    { t: 'Capacity trend alert', s: 'Thermal trend', d: `${hottest.label} temperature trending upward (${hottest.temp}°C). AI predicts potential thermal issue in ${nint(s, 6500, 5, 10)}-${nint(s, 6501, 10, 14)} days.`, chip: ['Action required', 'warning'] },
    { t: 'Performance optimization', s: 'CPU utilization', d: `${busiest.label} CPU peaks detected during 9-11 AM (avg ${busiest.cpu}%). AI suggests load balancing or capacity upgrade.`, chip: ['Recommended', 'info'] },
    { t: 'Overall health excellent', s: 'Antenna systems', d: 'All antenna systems operating at peak efficiency. VSWR values optimal (<1.5:1). No action required.', chip: [`Health: ${avgHwHealth}%`, 'success'] }
  ];
  const hwRecommendation = `Based on 90-day performance analysis, AI recommends scheduling preventive maintenance for BBU and RRH systems within the next 2 weeks. Historical data shows optimal uptime when maintenance occurs during current weather conditions. Estimated downtime: ${nint(s, 6510, 2, 4)}-${nint(s, 6511, 5, 8)} hours.`;

  const siteCode = r.loc || 'BGLK-277';
  const peerSites = ['BGLK-277', 'DEL-279', 'INDR-275', 'VJA-118', 'CHE-118', 'MAS-041', 'PUN-162', 'HYD-093'].filter(x => x !== siteCode);
  const GROWTH = ['100 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps'];
  const mkLink = (n, proto, i, off) => ({
    n, proto, util: nint(s, off + i, 6, 92), users: nint(s, off + 100 + i, 2000, 15000),
    growth: GROWTH[nint(s, off + 200 + i, 0, GROWTH.length - 1)], created: '12-May-2026', modified: '12-May-2026'
  });
  const links = {
    backhaul: [
      mkLink(`BH-${siteCode}-P1`, 'Fiber GPON', 0, 6600),
      mkLink(`BH-${siteCode}-B1`, 'Microwave 256QAM', 1, 6600),
      mkLink(`OAM-${siteCode}`, 'Fiber (shared VLAN 413)', 2, 6600)
    ],
    x2: peerSites.slice(0, 3).map((p, i) => mkLink(`X2-${p}`, 'X2AP/SCTP', i, 6700)),
    s1: [mkLink('S1-MME-Primary', 'S1AP/SCTP', 0, 6800), mkLink('S1-U-SGW-Primary', 'GTP-U', 1, 6800)]
  };
  const linkKpi = rows => ({
    total: rows.length,
    avgUtil: rows.length ? Math.round(rows.reduce((a, x) => a + x.util, 0) / rows.length) : 0,
    avgLatency: +(nrand(s, 6900, 4, 12)).toFixed(2),
    packetLoss: +(nrand(s, 6901, 0.001, 0.08)).toFixed(2)
  });
  const primaryBh = links.backhaul[0];
  const linkInsights = [
    { t: 'Capacity trend alert', s: 'Backhaul growth', d: `${primaryBh.n} utilization has climbed to ${primaryBh.util}% over 7 days. At this growth rate the 80% planning threshold is reached in about ${nint(s, 6910, 5, 14)}-${nint(s, 6911, 14, 20)} days.`, chip: ['Recommended', 'info'] },
    { t: 'Root cause identified', s: 'X2 handover', d: 'X2 handover success to a peer site dropped over 48h. Correlation engine links this to a transmission alarm on the peer node.', chip: ['All clear', 'success'] },
    { t: 'Ping-pong handover pattern', s: 'Mobility', d: `${nint(s, 6920, 4, 12)}% of handovers between adjacent cells reverse within 5 seconds. AI suggests raising the A3 offset from 3dB to 6dB on this pair.`, chip: ['Monitor', 'warning'] }
  ];

  const CFG_DEF = [
    { cat: 'Handover', p: 'Handover Margin', exp: 3, tol: 0 },
    { cat: 'Handover', p: 'Time-to-Trigger (TTT)', exp: 320, tol: 0 },
    { cat: 'Admission Control', p: 'PRB Threshold', exp: 85, tol: 8 },
    { cat: 'Power Control', p: 'Tx Power', exp: 46, tol: 4 },
    { cat: 'Admission Control', p: 'Max UEs per Cell', exp: 250, tol: 0 },
    { cat: 'Power Control', p: 'RSRP Target', exp: 100, tol: 0 },
    { cat: 'Scheduling', p: 'PRB Utilization Target', exp: 80, tol: 6 },
    { cat: 'Scheduling', p: 'MCS Adaptation', exp: 'Enabled', tol: 0 },
    { cat: 'Handover', p: 'Hysteresis', exp: 2, tol: 0 },
    { cat: 'Admission Control', p: 'RACH Preamble Power', exp: 52, tol: 0 }
  ];
  const config = CFG_DEF.map((c, i) => {
    if (typeof c.exp === 'string') return { ...c, act: c.exp, dev: 0, compliant: true };
    const drift = c.tol && nint(s, 6950 + i, 0, 2) === 0 ? +(nrand(s, 6960 + i, c.tol * 0.6, c.tol * 1.3)).toFixed(1) : 0;
    const act = c.exp + (nint(s, 6970 + i, 0, 1) ? drift : -drift);
    return { ...c, act, dev: Math.abs(+(act - c.exp).toFixed(1)), compliant: Math.abs(act - c.exp) <= c.tol };
  });
  const compliantCount = config.filter(c => c.compliant).length;
  const cfgInsights = [
    { t: 'Configuration drift detected', s: 'Reference design', d: 'Key parameters have drifted from the approved reference design. Antenna tilt and PCI assignment show the largest delta.', chip: ['Action required', 'warning'] },
    { t: 'Parameter optimization', s: 'Handover tuning', d: 'AI suggests tuning A3 offset and TTT in dense urban cells to improve handover success without increasing drops.', chip: ['Recommended', 'info'] },
    { t: 'Compliance verified', s: 'Security baseline', d: 'Security profile, encryption policy, and golden baseline are aligned. No unauthorized change events detected recently.', chip: ['Compliant', 'success'] }
  ];
  const cfgRemediation = 'A validated remediation template is ready to realign drifted parameters across affected cells, with an automatic rollback if KPIs regress beyond the safety envelope.';

  /* per-cell radio detail — one row per cell (sectors × carriers), the
     granularity a field engineer actually works at, distinct from the
     per-hardware-item view on the Hardware & components tab */
  const BANDS = [2100, 1800, 900, 700, 2300, 850];
  const cellDetails = Array.from({ length: cells }, (_, i) => {
    const down = i < cellsDown;
    const health = down ? 0 : nint(s, 7000 + i, 72, 98);
    return {
      status: down ? 'Down' : health < 82 ? 'Degraded' : 'Good',
      band: BANDS[nint(s, 7010 + i, 0, BANDS.length - 1)],
      health, alarms: down ? 0 : nint(s, 7020 + i, 0, 3),
      users: down ? 0 : nint(s, 7030 + i, 80, 160),
      prb: down ? 0 : nint(s, 7040 + i, 40, 90),
      bw: ['10 MHz', '20 MHz'][nint(s, 7050 + i, 0, 1)],
      sinr: down ? 0 : nint(s, 7060 + i, 128, 168)
    };
  });

  return {
    siteId, morphology, towerType, siteType, sectors, cells, cellsActive, cellsDegraded, cellsDown,
    onAir, uptimeStr, swVersion, healthScore, healthTrend, connectedUsers, peakUsers,
    totalParams, nonCompliantCount, configCompliance, availability, rrc, dropCall, handover, latency,
    alarms, critical: alarms.filter(a => a.sev === 'Critical').length, major: alarms.filter(a => a.sev === 'Major').length,
    minor: alarms.filter(a => a.sev === 'Minor').length, openAlarms: alarms.filter(a => a.open).length,
    ackAlarms: alarms.length - alarms.filter(a => a.open).length,
    hardware, hwInsights, hwRecommendation,
    links, linkKpi, linkInsights, cellDetails,
    config, compliantCount, cfgInsights, cfgRemediation
  };
}

/* ── small chart primitives ────────────────────────────── */
/* Performance forecast — solid actual, dashed prediction, one
   threshold line per metric, series labelled on the plot itself. */
function nvForecast(fc, h = 330) {
  const W = 1000, H = h, L = 62, R = 96, T = 16, B = 34;
  const x = i => L + i / (fc.labels.length - 1) * (W - L - R);
  const y = v => T + (1 - v / 100) * (H - T - B);
  const M = [fc.cpu, fc.mem, fc.temp];
  const line = (arr, tone, dash) => {
    const pts = arr.map((v, i) => v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean);
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${cv(tone,500)}" stroke-width="2.2"
      stroke-linejoin="round" stroke-linecap="round"${dash ? ' stroke-dasharray="7 5"' : ''}/>`;
  };
  const dots = (arr, tone) => arr.map((v, i) => v === null ? '' :
    `<circle cx="${x(i)}" cy="${y(v)}" r="3.4" fill="${cv(tone,500)}"/>`).join('');
  /* Labels are placed explicitly, not derived — three curves that run close
     together will otherwise stack their labels on top of one another. */
  const PLACE = {
    Memory: { ax:1, ady:-14, fx:4, fdy:-14 },
    Temp:   { ax:2, ady: 26, fx:5, fdy: 26 },
    CPU:    { ax:3, ady:-14, fx:4, fdy: 30 }
  };
  const label = (m, dash) => {
    const P = PLACE[m.n], i = dash ? P.fx : P.ax, v = dash ? m.f[i] : m.a[i];
    if (v === null || v === undefined) return '';
    return `<text x="${x(i)}" y="${(y(v) + (dash ? P.fdy : P.ady)).toFixed(1)}" text-anchor="middle"
      font-size="13" font-weight="600" fill="${cv(m.tone,600)}"
      stroke="var(--vw-color-white)" stroke-width="3" paint-order="stroke"
      >${m.n} (${dash ? 'forecast' : 'actual'})</text>`;
  };
  return `<svg viewBox="0 0 ${W} ${H}" class="nv-chart" role="img"
      aria-label="CPU, memory and temperature, measured and forecast">
    <rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="none" stroke="var(--vw-color-slate-200)"/>
    ${[0,25,50,75,100].map(g => `
      <line x1="${L}" x2="${W-R}" y1="${y(g)}" y2="${y(g)}" stroke="var(--vw-color-slate-100)"/>
      <text x="${L-10}" y="${y(g)+4}" text-anchor="end" font-size="11" fill="var(--vw-color-gray-500)">${g}</text>`).join('')}
    <text x="18" y="${(H-B+T)/2}" text-anchor="middle" font-size="11" fill="var(--vw-color-gray-500)"
      transform="rotate(-90 18 ${(H-B+T)/2})">Usage (%)</text>
    ${M.map(m => `
      <line x1="${L}" x2="${W-R}" y1="${y(m.thr)}" y2="${y(m.thr)}" stroke="${cv(m.tone,400)}"
        stroke-width="1.4" stroke-dasharray="6 4"/>
      <text x="${W-R+6}" y="${y(m.thr)+4}" font-size="11" fill="${cv(m.tone,600)}">${m.thrN}</text>`).join('')}
    ${M.map(m => line(m.a, m.tone, false) + line(m.f, m.tone, true)).join('')}
    ${M.map(m => dots(m.a, m.tone) + dots(m.f, m.tone)).join('')}
    ${M.map(m => label(m, false) + label(m, true)).join('')}
    ${fc.labels.map((t, i) => `<text x="${x(i)}" y="${H-12}" text-anchor="middle" font-size="12"
      fill="var(--vw-color-gray-600)">${t}</text>`).join('')}
  </svg>`;
}

/* the dark chassis drawing, matching the platform's node view */
function nvChassis(C) {
  const port = p => `<span class="nvp is-${p.st}" title="Port ${p.i} — ${p.st}">
    <i class="nvp-led"></i></span>`;
  const sfp = p => `<span class="nvs is-${p.st}" title="SFP+ ${p.i} — ${p.st}">
    ${p.st === 'empty' ? '' : '<i class="nvs-bar"></i>'}</span>`;
  const back = (icon, title, st, sub, dot) => `
    <div class="nvb">
      <div class="row vw-justify-between vw-items-start">
        <div class="stack-x"><span class="nvb-t">${icon} ${title}</span>
          <span class="nvb-st">${st}</span>${sub ? `<span class="nvb-sub">${sub}</span>` : ''}</div>
        <span class="nvb-dot is-${dot}"></span>
      </div>
    </div>`;
  return `
  <div class="nvc">
    <div class="nvc-head">
      <span class="nvc-oem">${C.oem}</span>
      <span class="nvc-model">${C.model}</span>
      <span class="nvc-sn mono">S/N: ${C.sn}</span>
      <span class="grow"></span>
      ${C.leds.map(([l, s]) => `<span class="nvc-led"><i class="is-${s}"></i>${l}</span>`).join('')}
    </div>
    <div class="nvc-body">
      <div class="nvc-col">
        <div class="nvc-block">
          <span class="nvc-bt">MGMT / CONSOLE</span>
          <div class="nvc-mgmt">${C.mgmt.map(m => `<div class="stack-x vw-items-center">
            <span class="nvp is-${m.st}"><i class="nvp-led"></i></span>
            <span class="nvc-pl">${m.n}</span></div>`).join('')}</div>
        </div>
        ${C.slots.map(s => `
          <div class="nvc-block">
            <span class="nvc-bt">${s.n} <em class="nvc-badge">${s.badge}</em></span>
            <div class="nvc-row">${s.ports.map(p => `<div class="stack-x vw-items-center">
              ${port(p)}<span class="nvc-pn">${p.i}</span></div>`).join('')}</div>
          </div>`).join('')}
        ${C.mods.map(m => `
          <div class="nvc-block">
            <span class="nvc-bt">${m.n} <em class="nvc-badge is-sfp">${m.badge}</em></span>
            <div class="nvc-row">${m.ports.map(p => `<div class="stack-x vw-items-center">
              ${sfp(p)}<span class="nvc-pn">${p.i}</span></div>`).join('')}</div>
          </div>`).join('')}
      </div>
      <div class="nvc-col">
        <span class="nvc-bt nvc-back">BACK PANEL</span>
        ${C.re.map(r => back('▣', r.n, r.st, `${r.temp}°C`, r.st === 'Active' ? 'ok' : 'idle')).join('')}
        ${C.psu.map(p => back('⏻', p.n, p.st, `${p.w} W`, p.st === 'Active' ? 'ok' : 'idle')).join('')}
        <div class="nvc-fans">${C.fans.map(f => `
          <div class="nvb nvb-fan">
            <span class="nvb-dot is-ok"></span>
            <span class="nvb-t">✳ ${f.n}</span>
            <span class="nvb-sub num">${n(f.rpm)}</span>
          </div>`).join('')}</div>
      </div>
    </div>
  </div>
  <div class="row vw-justify-between vw-wrap nvc-foot">
    <span class="legend">
      ${[['Up','emerald',C.tally.up],['Degraded','amber',C.tally.warn],
         ['Down','red',C.tally.down],['Empty','slate',C.tally.empty]]
        .map(([l, t]) => `<span class="legend-i"><span class="legend-sw"
          style="background:${cv(t, t === 'slate' ? 400 : 400)}"></span>${l}</span>`).join('')}
    </span>
    <span class="vw-card-metric-label-sub">Total ${C.total}
      ${[['emerald',C.tally.up],['amber',C.tally.warn],['red',C.tally.down],['slate',C.tally.empty]]
        .map(([t, v]) => `<span class="nvc-cnt"><i style="background:${cv(t,400)}"></i>${v}</span>`).join('')}</span>
  </div>`;
}

function nvLine(series, keys, h = 200) {
  const W = 1000, H = h, PADL = 34, PADB = 22, PADT = 10;
  const max = 100, x = i => PADL + i / (series.length - 1) * (W - PADL - 8);
  const y = v => PADT + (1 - v / max) * (H - PADT - PADB);
  const path = k => series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="nv-chart" role="img" aria-label="Performance over time">
    ${[0, 25, 50, 75, 100].map(g => `<line x1="${PADL}" x2="${W - 8}" y1="${y(g)}" y2="${y(g)}"
      stroke="var(--vw-color-slate-100)" stroke-width="1"/>
      <text x="${PADL - 6}" y="${y(g) + 3}" text-anchor="end" font-size="9" fill="var(--vw-color-gray-400)">${g}</text>`).join('')}
    ${[['Temp 70°C', 70, 'red'], ['CPU 85%', 85, 'orange']].map(([lb, v, t]) =>
      `<line x1="${PADL}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="${cv(t,300)}" stroke-width="1" stroke-dasharray="4 3"/>
       <text x="${W - 10}" y="${y(v) - 4}" text-anchor="end" font-size="8" fill="${cv(t,600)}">${lb}</text>`).join('')}
    ${keys.map(k => `<path d="${path(k.k)}" fill="none" stroke="${cv(k.tone,500)}" stroke-width="2"
      stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
    ${series.map((p, i) => i % 2 ? '' : `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="9"
      fill="var(--vw-color-gray-400)">${p.t}</text>`).join('')}
  </svg>`;
}

function nvTrend(rows, keys, h = 200) {
  const W = 1000, H = h, PADL = 30, PADB = 22, PADT = 10;
  const all = rows.flatMap(r => keys.map(k => r[k.k]));
  const max = Math.max(...all) * 1.15;
  const x = i => PADL + i / (rows.length - 1) * (W - PADL - 12);
  const y = v => PADT + (1 - v / max) * (H - PADT - PADB);
  return `<svg viewBox="0 0 ${W} ${H}" class="nv-chart" role="img" aria-label="Capacity trend">
    ${[0, 0.25, 0.5, 0.75, 1].map(g => `<line x1="${PADL}" x2="${W - 12}" y1="${y(max*g)}" y2="${y(max*g)}"
      stroke="var(--vw-color-slate-100)"/><text x="${PADL - 5}" y="${y(max*g)+3}" text-anchor="end" font-size="9"
      fill="var(--vw-color-gray-400)">${Math.round(max*g)}</text>`).join('')}
    ${keys.map(k => `
      <path d="${rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k.k]).toFixed(1)}`).join(' ')}"
        fill="none" stroke="${cv(k.tone,500)}" stroke-width="2" ${k.dash ? 'stroke-dasharray="6 4"' : ''}
        stroke-linejoin="round"/>
      ${rows.map((r, i) => `<circle cx="${x(i)}" cy="${y(r[k.k])}" r="3" fill="${cv(k.tone,500)}"/>`).join('')}`).join('')}
    ${rows.map((r, i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="9"
      fill="var(--vw-color-gray-400)">${r.m}</text>`).join('')}
  </svg>`;
}

const nvStrip = (arr, label, pct) => `
  <div class="nv-strip-row">
    <div class="row vw-justify-between vw-items-baseline" style="margin-bottom:4px">
      <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',400)}"></span>${label}</span>
      <span class="vw-card-metric-label-sub num">${pct}%</span>
    </div>
    <div class="nv-strip">${arr.map((v, i) => `<span class="nv-seg"
      style="background:${cv(v === 100 ? 'emerald' : v >= 96 ? 'emerald' : v >= 90 ? 'amber' : 'red', v === 100 ? 400 : 400)}"
      title="${String(i).padStart(2,'0')}:00 — ${v}%"></span>`).join('')}</div>
  </div>`;

const nvTile = (k, v, s, tone, extra = '') => `
  <div class="nv-tile" style="--nt:${cv(tone,400)};--ntb:${cv(tone,50)}">
    <span class="nv-tile-k">${k}</span>
    <span class="nv-tile-v num">${v}</span>
    <span class="nv-tile-s">${s}</span>${extra}</div>`;

const nvHealthCard = (title, sub, state, rows, foot) => `
  <div class="vw-card-child nv-health">
    <div class="row vw-justify-between vw-items-start">
      <div class="stack-x"><span class="vw-card-title-sm">${title}</span>
        <span class="vw-card-metric-label-sub">${sub}</span></div>
      ${chip(state[0], state[1])}
    </div>
    <div class="nv-hgrid">${rows.map(([k, v, t]) => `<div class="stack-x">
      <span class="nv-hk">${k}</span>
      <span class="nv-hv num"${t ? ` style="color:${cv(t,700)}"` : ''}>${v}</span></div>`).join('')}</div>
    <div class="nv-hfoot">${foot}</div>
  </div>`;

const nvAI = (title, sub, tone, cards, extraStyle = '') => {
  const bg = tone === 'orange' ? 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' : tone === 'red' ? 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
  const border = tone === 'orange' ? '#fdba74' : tone === 'red' ? '#f87171' : '#cbd5e1';
  const textCol = tone === 'orange' ? '#9a3412' : tone === 'red' ? '#7f1d1d' : '#0f172a';
  const subCol = tone === 'orange' ? '#c2410c' : tone === 'red' ? '#991b1b' : '#475569';

  return `
  <div class="nv-ai"${extraStyle ? ` style="${extraStyle}"` : ''}>
    <div class="nv-ai-head" style="background:${bg};border-bottom:1px solid ${border};padding:12px 16px">
      <span class="nv-ai-t" style="color:${textCol};font-weight:700;font-size:0.875rem">${title}</span>
      <span class="nv-ai-s" style="color:${subCol};font-size:0.75rem;margin-top:2px">${sub}</span>
    </div>
    <div class="nv-ai-body">
      ${cards.map(c => `<div class="nv-ai-card">
        <div class="row vw-justify-between vw-items-start">
          <div class="stack-x"><span class="vw-card-activity-label">${c.t}</span>
            <span class="vw-card-metric-label-sub">${c.s}</span></div>
          ${c.chip ? chip(c.chip[0], c.chip[1]) : ''}
        </div>
        ${c.big ? `<span class="nv-ai-big" style="color:${cv(c.tone || tone,700)}">${c.big}</span>` : ''}
        <span class="vw-card-description" style="white-space:normal">${c.d}</span>
        ${c.bar !== undefined ? `<div class="meter" style="margin-top:6px">
          <span style="width:${c.bar}%;background:${cv(c.tone || tone,400)}"></span></div>
          <span class="vw-card-metric-label-sub num">${c.bar}% confidence</span>` : ''}
      </div>`).join('')}
    </div>
  </div>`;
};
