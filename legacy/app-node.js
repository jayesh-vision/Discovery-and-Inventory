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

/* deterministic pseudo-random so every element gets a stable, plausible node */
const nseed = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const nrand = (s, i, lo, hi) => lo + ((nseed(s) + i * 2654435761) % 100000) / 100000 * (hi - lo);
const nint = (s, i, lo, hi) => Math.round(nrand(s, i, lo, hi));

/* find the element wherever it lives in the estate */
function nodeRecord(name) {
  for (const k of Object.keys(PHY)) {
    const r = (PHY[k] || []).find(x => x.name === name);
    if (r) return { ...r, cls: k };
  }
  const r = PHY.router[0];
  return { ...r, cls: 'router' };
}

const NODE_CLASS = {
  router: { n:'Router', live:true,  hw:'chassis' },
  switch: { n:'Switch', live:true,  hw:'env' },
  dwdm:   { n:'DWDM',   live:true,  hw:'optical' },
  server: { n:'Server', live:false },
  enodeb: { n:'eNodeB', live:false }, gnodeb: { n:'gNodeB', live:false }
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
    { k:'ISIS', n:'Protocol Links', a:nint(s, 16, 0, 6), d:nint(s, 17, 0, 1), i:0, tone:'amber' }
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
  const capTrend = Array.from({ length: 7 }, (_, i) => ({
    m: ['Dec','Jan','Feb','Mar','Apr','May','Jun'][i],
    a: Math.round(nrand(s, 1000 + i, 28, 52) + i * 6),
    f: Math.round(nrand(s, 1100 + i, 44, 62) + i * 5.5)
  }));

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
    env: { psu:[2, 2], fans:[nint(s, 49, 4, 6), nint(s, 49, 4, 6)], rpm:nint(s, 50, 4200, 6800),
           tmin:nint(s, 51, 28, 34), tmax:nint(s, 52, 48, 56), tin:nint(s, 53, 38, 46) },
    sfp, protoRows, capRows, capTrend,
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

/* ── DWDM optical model ────────────────────────────────── */
function buildOptical(s, r) {
  /* A spare wavelength carries no service, so it has no launch power, no
     OSNR and no BER. Showing it as "Active" with live optics would be
     fabricated data — the row reads "unequipped" instead. */
  const SVC = ['Core NDLS–BLR','Core NDLS–MUM','Metro ring A','Metro ring B',
               'Enterprise wave','Spare','Core NDLS–CHE','Spare'];
  const chans = Array.from({ length: 8 }, (_, i) => {
    const spare = SVC[i] === 'Spare';
    const osnr = spare ? null : +(nrand(s, 4000 + i, 13.4, 24.8)).toFixed(1);
    return {
      ch: `C${21 + i * 3}`, lambda: (1558.98 - i * 0.8).toFixed(2), spare, svc: SVC[i],
      tx: spare ? null : +(nrand(s, 4100 + i, -3.2, 1.4)).toFixed(1),
      rx: spare ? null : +(nrand(s, 4200 + i, -22, -8)).toFixed(1),
      osnr, ber: spare ? null : osnr < 15 ? '1e-6' : osnr < 18 ? '1e-9' : '<1e-12',
      st: spare ? 'Unequipped' : osnr < 15 ? 'Degraded' : osnr < 18 ? 'Warning' : 'Active',
      rate: spare ? null : ['100G','100G','200G','100G','400G',null,'100G',null][i]
    };
  });
  return {
    chans,
    used: chans.filter(c => c.svc !== 'Spare').length,
    amps: [
      { n:'Pre-amp EDFA', gain:+(nrand(s, 4300, 16, 23)).toFixed(1), tilt:+(nrand(s, 4301, -1.2, 1.2)).toFixed(1), st:'Active' },
      { n:'Booster EDFA', gain:+(nrand(s, 4302, 12, 19)).toFixed(1), tilt:+(nrand(s, 4303, -1.2, 1.2)).toFixed(1), st:'Active' },
      { n:'Raman', gain:+(nrand(s, 4304, 8, 14)).toFixed(1), tilt:0, st: nint(s, 4305, 0, 10) > 7 ? 'Standby' : 'Active' }
    ],
    spans: Array.from({ length: 3 }, (_, i) => ({
      n: ['NDLS → Gurugram','Gurugram → Rewari','Rewari → Jaipur'][i],
      km: nint(s, 4400 + i, 42, 118), loss: +(nrand(s, 4500 + i, 9.4, 27.8)).toFixed(1),
      budget: nint(s, 4600 + i, 24, 32), pmd: +(nrand(s, 4700 + i, 0.4, 2.8)).toFixed(2)
    }))
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

const nvAI = (title, sub, tone, cards) => `
  <div class="nv-ai">
    <div class="nv-ai-head" style="background:${cv(tone,500)}">
      <span class="nv-ai-t">${title}</span><span class="nv-ai-s">${sub}</span>
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
