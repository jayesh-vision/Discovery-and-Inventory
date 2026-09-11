/* ═══ NODE VIEW · the screen ══════════════════════════════ */
/* one glyph per NE class, so the header thumbnail actually says what the
   element is rather than showing the same three bars for everything */
const NODE_ICON = {
  router: '<path d="M4 15h16M4 15l3-4M4 15l3 4M20 15l-3-4M20 15l-3 4"/><circle cx="12" cy="7" r="2.5"/><path d="M12 9.5V15"/>',
  switch: '<rect x="3" y="9" width="18" height="6" rx="1"/><path d="M6 9V6M10 9V6M14 9V6M18 9V6M6 15v3M10 15v3M14 15v3M18 15v3"/>',
  dwdm:   '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M2 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
  server: '<rect x="4" y="3" width="16" height="6" rx="1"/><rect x="4" y="11" width="16" height="6" rx="1"/><circle cx="8" cy="6" r="0.8" fill="currentColor"/><circle cx="8" cy="14" r="0.8" fill="currentColor"/>',
  enodeb: '<path d="M12 3v18M7 8a7 7 0 0 1 10 0M4.5 5.5a10.5 10.5 0 0 1 15 0"/><circle cx="12" cy="3" r="1.4" fill="currentColor"/>',
  gnodeb: '<path d="M12 3v18M7 8a7 7 0 0 1 10 0M4.5 5.5a10.5 10.5 0 0 1 15 0"/><circle cx="12" cy="3" r="1.4" fill="currentColor"/>'
};
function nodeThumb(cls) {
  const d = NODE_ICON[cls] || NODE_ICON.router;
  return `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function nodeHeaderSwitch(N) {
  const r = N.r;
  const stLabel = r.st === 'ok' ? 'Ready' : r.st === 'drift' ? 'Degraded' : r.st === 'stale' ? 'Stale' : r.st === 'miss' ? 'Missing' : N.ready;
  const stTone = stLabel === 'Ready' ? 'success' : stLabel === 'Degraded' || stLabel === 'Stale' ? 'warning' : 'error';
  const macAddr = r.mac || `A4:5E:60:${nint(N.name,62,10,99)}:8F:${nint(N.name,63,10,99)}`;
  const popId = r.pop || 'POP-1030620';
  const vendor = r.oem || 'CIENA';
  const osVer = r.os || 'IOS XE 17.9.4';
  const sn = r.sn || 'HPE-SW-CH-2026-001';
  const model = r.model || 'ASR 1006-X';
  const ip = r.ip || '192.168.1.1';
  const coords = r.lat && r.lon ? `${r.lat},${r.lon}` : '10.368535,77.99631';

  const cells = [
    ['Vendor', vendor],
    ['OS Version', osVer],
    ['Serial Number', sn],
    ['POP ID', popId],
    ['Model', model],
    ['IP address', ip],
    ['MAC address', macAddr]
  ];
  return card(`
    <div class="nv-head">
      <div class="nv-thumb" aria-hidden="true" style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:var(--vw-color-slate-100,#f1f5f9);border-radius:10px;padding:6px">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--vw-color-slate-700)">
          <rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="10" x2="7.01" y2="10"/><line x1="11" y1="10" x2="11.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="7" y1="14" x2="7.01" y2="14"/><line x1="11" y1="14" x2="11.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/>
        </svg>
      </div>
      <div class="stack-x grow" style="min-width:0">
        <div class="row" style="gap:var(--vw-space-sm);align-items:center">
          <span class="vw-card-title" style="font-size:1.25rem;font-weight:700">${N.name}</span>
          ${chip(stLabel, stTone)}
        </div>
        <span class="vw-card-metric-label-sub mono" style="display:inline-flex;align-items:center;gap:4px;color:var(--vw-color-slate-500);margin-top:2px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          ${r.loc || N.name}(${coords})
        </span>
      </div>
    </div>
    <div class="nv-meta" style="grid-template-columns:repeat(7, 1fr);gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0)">${cells.map(([k, v]) => `<div class="stack-x">
      <span class="nv-hk" style="font-size:0.75rem;color:var(--vw-color-slate-500);font-weight:500">${k}</span><span class="nv-mv mono" style="font-size:0.875rem;font-weight:600;color:var(--vw-color-slate-800);margin-top:2px">${v}</span></div>`).join('')}</div>`,
    '', 'padding:var(--vw-space-lg)');
}

function nodeOverviewSwitch(N) {
  const tiles = [
    nvTile('Device Health', '95.55%', 'CPU 5% · Mem 7% · Temp 17°C', 'emerald'),
    nvTile('Protocol Links', '168', 'LLDP 54', 'amber'),
    nvTile('VLANs', '58', '52 Active · 6 Reserved', 'amber'),
    nvTile('Interface Status', '372/384', '372 up · 12 down', 'sky'),
    nvTile('Active Alerts', '7', '1 critical · 2 major · 4 minor · 0 warning', 'red'),
    nvTile('System Uptime', '287 Days', 'Last reboot: Feb 12, 2026 05:30:00', 'purple')
  ];
  return card(`
    <div class="nv-tiles">${tiles.join('')}</div>

    <div class="nv-health-row" style="margin-top:var(--vw-space-md)">
      ${nvHealthCard('ICMP Health', 'Network Reachability',
        ['Healthy', 'success'],
        [['Packet Loss', '0.02%', '1200 sent'],
         ['Latency Avg', '7.62 ms', 'Min: 4.18'], ['Jitter', '1.24 ms', 'Max: 12.44'],
         ['Availability', '99.98%', 'Successful probes']],
        `Last Sync: Jun 30, 2026 14:26:00 · Probe Interval: 1 hr`)}
      ${nvHealthCard('NTP Sync', 'Time Synchronization', ['Synchronized', 'success'],
        [['Offset', '0.812 ms'], ['Delay', '2.74 ms'], ['Jitter', '0.153 ms'],
         ['Primary NTP', '10.10.10.10'], ['Secondary NTP', '10.10.10.11'], ['Stratum', '3']],
        `Last Sync: Jun 30, 2026 14:10:00`)}
      ${nvHealthCard('RADIUS Auth', 'AAA Authentication',
        ['Healthy', 'success'],
        [['Primary DNS', '10.20.20.5 • Reachable'], ['Secondary DNS', '10.20.20.6 • Reachable']],
        `Last Sync: Jun 30, 2026 14:05:00`)}
    </div>`);
}

function nodeHardwareSwitch(N) {
  const topIf = IFACES.slice(0, 8).map((i, x) => ({ ...i,
    inb: nint(N.name, 1800 + x, 22, 88), outb: nint(N.name, 1900 + x, 18, 84) }));

  const perfCard = card(`
    <div class="row vw-justify-between vw-items-start vw-wrap" style="gap:var(--vw-space-md)">
      ${headSm('Performance forecast')}
      <div class="row">
        <div class="nv-fcgroup">
          ${[['CPU forecast', N.perf.fCpu + '%', 'blue'],
             ['Memory forecast', N.perf.fMem + '%', 'orange'],
             ['Temp forecast', N.perf.fTemp + '°C', 'red']]
            .map(([k, v, t]) => `<span class="nv-fc">
              <span class="nv-fck">${k}</span>
              <span class="nv-fcv num" style="color:${cv(t,600)}">${v}</span></span>`).join('')}
        </div>
        <span class="nst-input-shell nv-per"><select class="nst-input" data-nperfsel>
          ${['24h','7 days'].map(p => `<option${NODE_PERF===p?' selected':''}>${p}</option>`).join('')}
        </select></span>
      </div>
    </div>
    <div style="margin-top:var(--vw-space-md)">${nvForecast(N.perf.fc, 340)}</div>
    <div class="row vw-justify-center vw-wrap vw-card-footer-divider" style="gap:var(--vw-space-md)">
      ${[['CPU','blue'],['Memory','orange'],['Temp','red']].flatMap(([k, t]) => [
        `<span class="legend-i"><span class="nv-lsw" style="background:${cv(t,500)}"></span>${k} (actual)</span>`,
        `<span class="legend-i"><span class="nv-lsw is-dash" style="--lc:${cv(t,500)}"></span>${k} (forecast)</span>`
      ]).join('')}
    </div>`, 'grow');

  const envCard = `<div class="vw-grid vw-grid-cols-3 vw-gap-md" style="margin-top:var(--vw-space-md)">
    ${[['Power supplies', `${N.env.psu[0]} / ${N.env.psu[1]}`, 'Healthy · redundant', 'sky'],
       ['Fans', `${N.env.fans[0]} / ${N.env.fans[1]}`, `Healthy · avg ${n(N.env.rpm)} RPM`, 'purple'],
       ['Temperature sensors', 'Normal', `Inlet ${N.env.tin}°C · ASIC ${N.env.tmax}°C · outlet ${N.env.tmin}°C`, 'emerald']]
      .map(([k, v, s, t]) => `<div class="vw-card-child nv-env" style="--nt:${cv(t,400)};--ntb:${cv(t,50)}">
        <span class="nv-hk">${k}</span><span class="nv-env-v num">${v}</span>
        <span class="vw-card-metric-label-sub">${s}</span></div>`).join('')}
  </div>`;

  const portLayout = `
    <div class="cx-panel">
      <div class="cx-panel-head"><span class="eyebrow">Physical port layout</span></div>
      ${nvChassis(N.chassis)}
    </div>`;

  const utilBand = v => v > 85 ? ['Critical','red'] : v > 70 ? ['Warning','orange']
                      : v > 50 ? ['Moderate','amber'] : ['Normal','emerald'];
  const utilList = `
    <div class="cx-panel">
      <div class="row vw-justify-between vw-items-baseline cx-panel-head">
        <span class="eyebrow">Interface utilisation</span>
        <button class="nst-btn nst-btn--xs"${dA({ v:'resource', l:`Interfaces · ${N.name}` })}>Open all</button>
      </div>
      <div class="stack-s" style="margin-top:var(--vw-space-sm)">
        ${topIf.slice(0, 7).map((i, x) => {
          const d = nint(N.name, 2200 + x, -6, 9);
          const [, tone] = utilBand(i.inb);
          return `<div class="nv-util">
            <div class="row vw-justify-between vw-items-baseline vw-wrap" style="gap:var(--vw-space-xs)">
              <span class="row" style="gap:var(--vw-space-xs);min-width:0">
                <span class="vw-value mono" title="${i.desc}">${i.n}</span>
                ${chip(i.oper === 'up' ? 'Up' : 'Degraded', i.oper === 'up' ? 'success' : 'warning')}
                <span class="vw-card-metric-label-sub mono">${i.sp}</span>
              </span>
              <span class="row" style="gap:var(--vw-space-sm)">
                <span class="nv-util-d" style="color:${cv(d >= 0 ? 'emerald' : 'gray', d >= 0 ? 700 : 500)}">${d >= 0 ? '+' : ''}${d}%</span>
                <span class="vw-value num" style="font-weight:500">${i.inb}%</span>
              </span>
            </div>
            <span class="hbar-track" style="height:8px;display:block"><span class="hbar-fill"
              style="display:block;width:${i.inb}%;background:${cv(tone,400)}"></span></span>
          </div>`;
        }).join('')}
      </div>
      <div class="vw-card-footer-divider nv-ulegend">
        ${[['Critical (>85%)','red'],['Warning (70–85%)','orange'],
           ['Moderate (50–70%)','amber'],['Normal (<50%)','emerald']]
          .map(([l, t]) => `<span class="legend-i"><span class="legend-sw" style="background:${cv(t,400)}"></span>${l}</span>`).join('')}
      </div>
    </div>`;

  return `
    ${perfCard}
    ${card(`
      ${envCard}
      <div class="nv-portsplit" style="margin-top:var(--vw-space-lg)">${portLayout}${utilList}</div>

      <div class="cx-panel-head row vw-justify-between vw-items-baseline" style="margin-top:var(--vw-space-xl)">
        <span class="eyebrow">Top interfaces by utilisation</span>
        <span class="vw-card-metric-label-sub">Real-time bandwidth consumption of ${N.ov.ifTotal} interfaces</span>
      </div>
      ${table([{t:'Name'},{t:'Description'},{t:'Media'},{t:'Admin status'},{t:'Operational status'},
               {t:'Inbound utilisation',r:true},{t:'Outbound utilisation',r:true}],
        topIf.map(i => [
          `<span class="vw-value mono">${i.n}</span>`,
          `<span class="vw-card-metric-label-sub">${i.desc}</span>`,
          `<span class="mono">${i.sp}</span>`,
          chip(i.admin, i.admin === 'up' ? 'success' : 'error'),
          chip(i.oper, i.oper === 'up' ? 'success' : 'error'),
          `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="hbar-track" style="width:4rem;height:7px">
            <span class="hbar-fill" style="display:block;width:${i.inb}%;background:${cv(i.inb>85?'red':i.inb>70?'amber':'emerald',400)}"></span></span>${i.inb}%</span>`,
          `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="hbar-track" style="width:4rem;height:7px">
            <span class="hbar-fill" style="display:block;width:${i.outb}%;background:${cv(i.outb>85?'red':i.outb>70?'amber':'emerald',400)}"></span></span>${i.outb}%</span>`
        ]), '',
        () => [])}

      <div class="cx-panel-head row vw-justify-between vw-items-baseline" style="margin-top:var(--vw-space-xl)">
        <span class="eyebrow">SFP module details</span>
        <span class="vw-card-metric-label-sub">Optical transceiver status and health for ${N.sfp.length} modules</span>
      </div>
      ${table([{t:'Port'},{t:'Type'},{t:'Status'},{t:'TX power',r:true},{t:'RX power',r:true},{t:'Temperature',r:true}],
        N.sfp.map(s => [
          `<span class="mono">${s.port}</span>`, `<span class="mono">${s.type}</span>`,
          chip(s.st, s.st === 'Active' ? 'success' : s.st === 'Standby' ? 'warning' : 'error'),
          `<span class="mono">${s.tx} dBm</span>`,
          `<span class="mono"${s.rx < -18 ? ` style="color:${cv('red',700)}"` : ''}>${s.rx} dBm</span>`,
          `${s.temp} °C`
        ]), '',
        () => [])}`)}`;
}

function nodeLinksSwitch(N) {
  const linksList = [
    { src: 'RTR-DEL-01', dstPort: 'TenGigE0/0/0/2', sip: '10.10.0.1', dip: '10.10.0.2' },
    { src: 'RTR-DEL-02', dstPort: 'TenGigE0/0/0/3', sip: '10.10.0.2', dip: '10.10.0.3' },
    { src: 'RTR-MUM-01', dstPort: 'HundredGigE0/0/0/2', sip: '10.20.0.1', dip: '10.20.0.2' },
    { src: 'RTR-MUM-02', dstPort: 'HundredGigE0/0/0/3', sip: '10.20.0.2', dip: '10.20.0.3' },
    { src: 'RTR-BLR-01', dstPort: 'TenGigE0/0/0/6', sip: '10.30.0.1', dip: '10.30.0.2' },
    { src: 'RTR-BLR-02', dstPort: 'TenGigE0/0/0/7', sip: '10.30.0.2', dip: '10.30.0.3' },
    { src: 'RTR-HYD-01', dstPort: 'FortyGigE0/0/1', sip: '10.40.0.1', dip: '10.40.0.2' },
    { src: 'RTR-HYD-02', dstPort: 'FortyGigE0/0/2', sip: '10.40.0.2', dip: '10.40.0.3' },
    { src: 'RTR-MAA-01', dstPort: 'TenGigE0/0/1/0', sip: '10.50.0.1', dip: '10.50.0.2' },
    { src: 'RTR-CCU-01', dstPort: 'TenGigE0/0/1/2', sip: '10.60.0.1', dip: '10.60.0.2' }
  ];

  return card(`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px">
      <div>
        <div style="font-size:1.125rem;font-weight:700;color:var(--vw-color-slate-900,#0f172a)">Link capacity dashboard</div>
        <div style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b);margin-top:2px">LLDP Protocol capacity analysis</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        ${chip('LLDP Protocol', 'info')}
        <span style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b)">Last sync : Jun 30, 2026 14:30:00</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:320px 1fr;gap:24px;align-items:start">
      <div style="border:1px solid var(--vw-color-slate-200,#e2e8f0);border-radius:12px;padding:16px;background:#ffffff">
        <div style="font-size:0.75rem;font-weight:600;color:var(--vw-color-slate-500,#64748b);margin-bottom:12px">10 Links in countdown · LLDP</div>
        <div class="stack-s" style="max-height:420px;overflow-y:auto;padding-right:4px">
          ${linksList.map((lk, idx) => `
            <div style="padding:12px;border-radius:8px;border:1px solid var(--vw-color-slate-200,#e2e8f0);background:${idx === 0 ? 'var(--vw-color-slate-50,#f8fafc)' : '#ffffff'};cursor:pointer">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span style="font-size:0.875rem;font-weight:700;color:var(--vw-color-sky-600,#0284c7);font-family:monospace">${lk.src}</span>
                <span style="font-size:0.75rem;color:var(--vw-color-slate-400);margin:0 4px">→</span>
                <span style="font-size:0.875rem;font-weight:600;color:var(--vw-color-slate-700);font-family:monospace">${lk.dstPort}</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.75rem">
                <div><span style="color:var(--vw-color-slate-400)">Source IP</span><br><span style="font-family:monospace;font-weight:500;color:var(--vw-color-slate-700)">${lk.sip}</span></div>
                <div><span style="color:var(--vw-color-slate-400)">Destination IP</span><br><span style="font-family:monospace;font-weight:500;color:var(--vw-color-slate-700)">${lk.dip}</span></div>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div style="border:1px solid var(--vw-color-slate-200,#e2e8f0);border-radius:12px;padding:20px;background:#ffffff">
        <div style="font-size:0.875rem;font-weight:700;color:var(--vw-color-slate-800,#1e293b);text-align:center;margin-bottom:16px">Link capacity trend</div>
        ${nvTrend(N.capTrend, [{ k:'a', tone:'sky' }, { k:'f', tone:'orange' }], 280)}
        <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-top:16px;font-size:0.75rem">
          <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--vw-color-sky-500,#0ea5e9)"></span>Delhi-Core-Link - Inbound Utilization</span>
          <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:var(--vw-color-orange-500,#f97316)"></span>Delhi-Core-Link - Outbound Utilization</span>
        </div>
      </div>
    </div>`);
}

let NODE_SW_SVC_TAB = 'L2VPN';

function nodeServicesSwitch(N) {
  const svcType = NODE_SW_SVC_TAB || 'L2VPN';
  const l2rows = [
    { n: 'DELHI-CAMPUS-L2VPN-01', t: 'L2VPN', st: 'Active', ifc: 'GigabitEthernet0/0/0/1', bw: '1 Gbps' },
    { n: 'LIBRARY-BLOCK-L2VPN', t: 'L2VPN', st: 'Active', ifc: 'GigabitEthernet0/0/0/3', bw: '500 Mbps' },
    { n: 'ADMIN-BLOCK-BACKUP-L2VPN', t: 'L2VPN', st: 'Disable', ifc: 'GigabitEthernet0/0/0/8', bw: '200 Mbps' },
    { n: 'MUMBAI-DC-L2VPN', t: 'L2VPN', st: 'Active', ifc: 'TenGigabitEthernet0/0/0/1/0', bw: '10 Gbps' },
    { n: 'BANGALORE-CAMPUS-L2VPN', t: 'L2VPN', st: 'Active', ifc: 'GigabitEthernet0/0/2/1', bw: '2 Gbps' },
    { n: 'HYDERABAD-METRO-L2VPN', t: 'L2VPN', st: 'Active', ifc: 'TenGigabitEthernet0/0/0/3/2', bw: '5 Gbps' },
    { n: 'CHENNAI-HQ-L2VPN', t: 'L2VPN', st: 'Active', ifc: 'GigabitEthernet0/0/4/0', bw: '1 Gbps' },
    { n: 'PUNE-BRANCH-L2VPN', t: 'L2VPN', st: 'Active', ifc: 'GigabitEthernet0/0/5/1', bw: '500 Mbps' },
    { n: 'KOLKATA-OFFICE-L2VPN', t: 'L2VPN', st: 'Active', ifc: 'GigabitEthernet0/0/6/2', bw: '1 Gbps' }
  ];

  const l3rows = [
    { n: 'DELHI-HQ-L3VPN-01', t: 'L3VPN', st: 'Active', ifc: 'GigabitEthernet0/0/0/2', bw: '2 Gbps' },
    { n: 'MUMBAI-BRANCH-L3VPN', t: 'L3VPN', st: 'Active', ifc: 'TenGigabitEthernet0/0/0/2/0', bw: '10 Gbps' },
    { n: 'BANGALORE-DC-L3VPN', t: 'L3VPN', st: 'Active', ifc: 'GigabitEthernet0/0/3/1', bw: '5 Gbps' },
    { n: 'HYDERABAD-HQ-L3VPN', t: 'L3VPN', st: 'Active', ifc: 'GigabitEthernet0/0/4/1', bw: '1 Gbps' }
  ];

  const rows = svcType === 'L3VPN' ? l3rows : l2rows;
  const activeCount = rows.filter(r => r.st === 'Active').length;
  const disableCount = rows.filter(r => r.st === 'Disable').length;

  return card(`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;background:var(--vw-color-slate-100,#f1f5f9);padding:4px;border-radius:10px;width:fit-content">
      <button class="nst-btn${svcType === 'L2VPN' ? ' is-on' : ''}" data-nswsvctab="L2VPN"
        style="padding:6px 16px;border:0;border-radius:8px;font-size:0.875rem;font-weight:${svcType === 'L2VPN' ? '600' : '500'};color:${svcType === 'L2VPN' ? 'var(--vw-color-slate-900)' : 'var(--vw-color-slate-600)'};background:${svcType === 'L2VPN' ? '#ffffff' : 'transparent'};box-shadow:${svcType === 'L2VPN' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};cursor:pointer">
        L2VPN
      </button>
      <button class="nst-btn${svcType === 'L3VPN' ? ' is-on' : ''}" data-nswsvctab="L3VPN"
        style="padding:6px 16px;border:0;border-radius:8px;font-size:0.875rem;font-weight:${svcType === 'L3VPN' ? '600' : '500'};color:${svcType === 'L3VPN' ? 'var(--vw-color-slate-900)' : 'var(--vw-color-slate-600)'};background:${svcType === 'L3VPN' ? '#ffffff' : 'transparent'};box-shadow:${svcType === 'L3VPN' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};cursor:pointer">
        L3VPN
      </button>
    </div>

    <div style="border:1px solid var(--vw-color-slate-200,#e2e8f0);border-radius:12px;padding:20px;background:#ffffff">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:1rem;font-weight:700;color:var(--vw-color-slate-900,#0f172a)">${svcType} Service instances</div>
          <div style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b);margin-top:2px">${rows.length} Services Of type ${svcType}</div>
        </div>
        <select class="nst-input nst-input--sm" style="height:34px;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
          <option>All status</option>
          <option>Active</option>
          <option>Disable</option>
        </select>
      </div>

      ${table([{t:'Service name'},{t:'Site type'},{t:'Status'},{t:'Source interface'},{t:'Bandwidth'}],
        rows.map(r => [
          `<span style="font-weight:600;color:var(--vw-color-slate-800);font-size:0.875rem">${r.n}</span>`,
          `<span style="display:inline-flex;padding:3px 10px;border-radius:12px;background:#f3e8ff;color:#7e22ce;font-size:0.75rem;font-weight:600">${r.t}</span>`,
          chip(r.st, r.st === 'Active' ? 'success' : 'error'),
          `<span class="mono" style="color:var(--vw-color-slate-700);font-size:0.8125rem">${r.ifc}</span>`,
          `<span style="font-weight:500;color:var(--vw-color-slate-800);font-size:0.8125rem">${r.bw}</span>`
        ]), '',
        () => [])}

      <div style="display:flex;align-items:center;gap:16px;margin-top:16px;padding-top:12px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0);font-size:0.8125rem;color:var(--vw-color-slate-600)">
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-emerald-500,#10b981)"></span><strong>${activeCount}</strong> Active</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-rose-500,#f43f5e)"></span><strong>${disableCount}</strong> Disable</span>
        <span style="margin-left:auto;font-weight:600;color:var(--vw-color-slate-800)">${rows.length} Total</span>
      </div>
    </div>`);
}

function nodeAlertsSwitch(N) {
  const alertTab = NODE_ALERT_TAB || 'alerts';
  const swAlarms = [
    {
      sev: 'Critical',
      badge: 'GE0/0/0',
      t: 'Interface Flapping Detected',
      d: 'Interface state changed 8 times in 20 minutes',
      src: 'Interface',
      at: 'Interface',
      when: '30-Jun-2026 13:30:00',
      code: 'ALM-1000',
      tone: 'red'
    },
    {
      sev: 'Major',
      badge: 'CPU',
      t: 'High CPU Utilization',
      d: 'CPU sustained above 75% for 45 minutes',
      src: 'Cpu',
      at: 'CPU',
      when: '30-Jun-2026 12:45:00',
      code: 'ALM-1001',
      tone: 'orange'
    },
    {
      sev: 'Major',
      badge: 'GE0/0/3',
      t: 'Link Degradation',
      d: 'Latency increased to 12.8ms, packet loss detected',
      src: 'Link',
      at: 'Link',
      when: '30-Jun-2026 12:00:00',
      code: 'ALM-1002',
      tone: 'orange'
    },
    {
      sev: 'Minor',
      badge: 'SFP 0/0/0/1',
      t: 'Temperature Warning',
      d: 'Optical receiver power temperature threshold crossed',
      src: 'SFP',
      at: 'Temperature',
      when: '30-Jun-2026 11:15:00',
      code: 'ALM-1003',
      tone: 'amber'
    }
  ];

  return card(`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;background:var(--vw-color-slate-100,#f1f5f9);padding:4px;border-radius:10px;width:fit-content">
      <button class="nst-btn${alertTab === 'alerts' ? ' is-on' : ''}" data-nalert="alerts"
        style="padding:6px 16px;border:0;border-radius:8px;font-size:0.875rem;font-weight:${alertTab === 'alerts' ? '600' : '500'};color:${alertTab === 'alerts' ? 'var(--vw-color-slate-900)' : 'var(--vw-color-slate-600)'};background:${alertTab === 'alerts' ? '#ffffff' : 'transparent'};box-shadow:${alertTab === 'alerts' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};cursor:pointer">
        Alerts
      </button>
      <button class="nst-btn${alertTab === 'incidents' ? ' is-on' : ''}" data-nalert="incidents"
        style="padding:6px 16px;border:0;border-radius:8px;font-size:0.875rem;font-weight:${alertTab === 'incidents' ? '600' : '500'};color:${alertTab === 'incidents' ? 'var(--vw-color-slate-900)' : 'var(--vw-color-slate-600)'};background:${alertTab === 'incidents' ? '#ffffff' : 'transparent'};box-shadow:${alertTab === 'incidents' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};cursor:pointer">
        Incidents
      </button>
    </div>

    <div style="border:1px solid var(--vw-color-slate-200,#e2e8f0);border-radius:12px;padding:20px;background:#ffffff">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:8px;background:${cv('red',50)};color:${cv('red',600)};display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <div style="font-size:1rem;font-weight:700;color:var(--vw-color-slate-900,#0f172a)">Active alerts & events</div>
            <div style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b);margin-top:2px">Real-time monitoring across all network resources</div>
          </div>
        </div>
        <select class="nst-input nst-input--sm" style="height:34px;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
          <option>All severity</option>
          <option>Critical</option>
          <option>Major</option>
          <option>Minor</option>
        </select>
      </div>

      <div class="stack-s">
        ${swAlarms.map(a => `
          <div style="border:1px solid var(--vw-color-slate-200,#e2e8f0);border-radius:8px;padding:16px;background:${a.tone === 'red' ? '#fff5f5' : a.tone === 'orange' ? '#fffaf0' : '#fffff0'}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  ${chip(a.sev, a.tone === 'red' ? 'error' : a.tone === 'orange' ? 'warning' : 'neutral')}
                  <span style="font-size:0.75rem;padding:2px 8px;border-radius:4px;background:#fee2e2;color:#dc2626;font-weight:600">Open</span>
                  <span style="font-size:0.75rem;padding:2px 8px;border-radius:4px;background:#f1f5f9;color:#475569;font-weight:600">${a.badge}</span>
                </div>
                <div style="font-size:0.9375rem;font-weight:700;color:var(--vw-color-slate-900);margin-top:4px">${a.t}</div>
                <div style="font-size:0.8125rem;color:var(--vw-color-slate-600);margin-top:2px">${a.d}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.06);font-size:0.75rem">
              <div><span style="color:var(--vw-color-slate-500)">Source</span><br><span style="font-weight:600;color:var(--vw-color-slate-800)">${a.src}</span></div>
              <div><span style="color:var(--vw-color-slate-500)">Alert type</span><br><span style="font-weight:600;color:var(--vw-color-slate-800)">${a.at}</span></div>
              <div><span style="color:var(--vw-color-slate-500)">Event start time</span><br><span style="font-weight:600;color:var(--vw-color-slate-800);font-family:monospace">${a.when}</span></div>
              <div><span style="color:var(--vw-color-slate-500)">Alert code</span><br><span style="font-weight:600;color:var(--vw-color-slate-800);font-family:monospace">${a.code}</span></div>
            </div>
          </div>`).join('')}
      </div>

      <div style="display:flex;align-items:center;gap:16px;margin-top:20px;padding-top:12px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0);font-size:0.8125rem;color:var(--vw-color-slate-600)">
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-rose-500,#f43f5e)"></span><strong>1</strong> Critical</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-amber-500,#f59e0b)"></span><strong>2</strong> Major</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-yellow-500,#eab308)"></span><strong>1</strong> Minor</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-slate-400,#94a3b8)"></span><strong>0</strong> Warning</span>
        <span style="margin-left:auto;font-weight:600;color:var(--vw-color-slate-800)">4 Total</span>
      </div>
    </div>`);
}


/* ═══════════════════════════════════════════════════════════
   ROUTER & OTHER NODE VIEWS (Original, 100% untouched implementation)
   ═══════════════════════════════════════════════════════════ */

function nodeHeaderRouter(N) {
  const r = N.r;
  const stLabel = r.st === 'ok' ? 'Ready' : r.st === 'drift' ? 'Degraded' : r.st === 'stale' ? 'Stale' : r.st === 'miss' ? 'Missing' : N.ready;
  const stTone = stLabel === 'Ready' ? 'success' : stLabel === 'Degraded' || stLabel === 'Stale' ? 'warning' : 'error';
  const macAddr = r.mac || `A4:5E:60:${nint(N.name,62,10,99)}:8F:${nint(N.name,63,10,99)}`;
  const rackLoc = r.rack ? `Rack ${r.rack}` : `Rack A · U${nint(N.name, 60, 10, 44)}-${nint(N.name, 61, 45, 48)}`;

  const cells = [
    ['Vendor', r.oem || '—'],
    ['OS version', r.os || '—'],
    ['Serial number', r.sn || '—'],
    ['Rack location', rackLoc],
    ['Model', r.model || '—'],
    ['IP address', r.ip || '—'],
    ['MAC address', macAddr]
  ];
  return card(`
    <div class="nv-head">
      <div class="nv-thumb" aria-hidden="true">
        ${nodeThumb(N.cls)}
      </div>
      <div class="stack-x grow" style="min-width:0">
        <div class="row" style="gap:var(--vw-space-sm)">
          <span class="vw-card-title">${N.name}</span>
          ${chip(stLabel, stTone)}
          ${chip(N.meta.n, 'neutral')}
        </div>
        <span class="vw-card-metric-label-sub mono">${r.loc} · ${r.ip} · ${r.sn}</span>
      </div>
      <div class="row" style="flex-shrink:0">
        <button class="nst-btn nst-btn--sm"${dA({ v:'resource', l:`Node resources · ${N.name}` })}>Node resources</button>
      </div>
    </div>
    <div class="nv-meta">${cells.map(([k, v]) => `<div class="stack-x">
      <span class="nv-hk">${k}</span><span class="nv-mv mono">${v}</span></div>`).join('')}</div>`,
    '', 'padding:var(--vw-space-lg)');
}

function nodeOverviewRouter(N) {
  const tiles = [
    nvTile('Device health', `${N.ov.health}%`, `CPU ${N.perf.cpu}% · Mem ${N.perf.mem}% · ${N.perf.temp}°C`, 'emerald'),
    nvTile('Physical links', n(N.ov.proto), `LLDP · OSPF · BGP · ISIS`, 'sky'),
    nvTile('Interface status', `${n(N.ov.ifUp)}/${n(N.ov.ifTotal)}`, `${n(N.ov.ifTotal - N.ov.ifUp)} down or reserved`, 'amber'),
    nvTile('Active alarms', String(N.ov.alarms), `1 critical · 2 major · ${Math.max(0, N.ov.alarms - 3)} minor`, 'red'),
    nvTile('System uptime', N.ov.uptime, `last reboot ${N.ov.since}`, 'purple')
  ];
  return card(`
    ${headSm('Overview')}
    <div class="nv-tiles" style="margin-top:var(--vw-space-md)">${tiles.join('')}</div>

    <div class="nv-health-row">
      ${nvHealthCard('ICMP health', 'Network reachability',
        [N.icmp.loss < 0.3 ? 'Healthy' : 'Degraded', N.icmp.loss < 0.3 ? 'success' : 'warning'],
        [['Packet loss', `${N.icmp.loss}%`, N.icmp.loss > 0.3 ? 'red' : null],
         ['Latency avg', `${N.icmp.lat} ms`], ['Jitter', `${N.icmp.jit} ms`],
         ['Availability', `${N.icmp.avail}%`, 'emerald']],
        `Last checked ${N.icmp.checked} · probe interval ${N.icmp.probe}`)}
      ${nvHealthCard('NTP sync', 'Time synchronisation', ['Synchronised', 'success'],
        [['Offset', `${N.ntp.off} ms`], ['Delay', `${N.ntp.delay} ms`], ['Jitter', `${N.ntp.jit} ms`],
         ['Stratum', N.ntp.stratum]],
        `Primary <span class="mono">${N.ntp.primary}</span> · secondary <span class="mono">${N.ntp.secondary}</span> · last sync ${N.ntp.sync}`)}
      ${nvHealthCard('RADIUS auth', 'AAA authentication',
        [N.rad.fails > 3 ? 'Degraded' : 'Healthy', N.rad.fails > 3 ? 'warning' : 'success'],
        [['Success rate', `${N.rad.ok}%`, 'emerald'], ['Failures 24 h', N.rad.fails, N.rad.fails ? 'amber' : null],
         ['Primary', 'Reachable', 'emerald'], ['Secondary', 'Reachable', 'emerald']],
        `Primary <span class="mono">${N.rad.primary}</span> · secondary <span class="mono">${N.rad.secondary}</span> · last auth ${N.rad.last}`)}
    </div>`);
}

function nodeHardwareRouter(N) {
  const perfKeys = [{ k:'cpu', tone:'sky' }, { k:'mem', tone:'amber' }, { k:'temp', tone:'red' }];
  const topIf = IFACES.slice(0, 8).map((i, x) => ({ ...i,
    inb: nint(N.name, 1800 + x, 22, 88), outb: nint(N.name, 1900 + x, 18, 84) }));

  const perfCard = card(`
    <div class="row vw-justify-between vw-items-start vw-wrap" style="gap:var(--vw-space-md)">
      ${headSm('Performance forecast')}
      <div class="row">
        <div class="nv-fcgroup">
          ${[['CPU forecast', N.perf.fCpu + '%', 'blue'],
             ['Memory forecast', N.perf.fMem + '%', 'orange'],
             ['Temp forecast', N.perf.fTemp + '°C', 'red']]
            .map(([k, v, t]) => `<span class="nv-fc">
              <span class="nv-fck">${k}</span>
              <span class="nv-fcv num" style="color:${cv(t,600)}">${v}</span></span>`).join('')}
        </div>
        <span class="nst-input-shell nv-per"><select class="nst-input" data-nperfsel>
          ${['24h','7 days'].map(p => `<option${NODE_PERF===p?' selected':''}>${p}</option>`).join('')}
        </select></span>
      </div>
    </div>
    <div style="margin-top:var(--vw-space-md)">${nvForecast(N.perf.fc, 340)}</div>
    <div class="row vw-justify-center vw-wrap vw-card-footer-divider" style="gap:var(--vw-space-md)">
      ${[['CPU','blue'],['Memory','orange'],['Temp','red']].flatMap(([k, t]) => [
        `<span class="legend-i"><span class="nv-lsw" style="background:${cv(t,500)}"></span>${k} (actual)</span>`,
        `<span class="legend-i"><span class="nv-lsw is-dash" style="--lc:${cv(t,500)}"></span>${k} (forecast)</span>`
      ]).join('')}
    </div>`, 'grow');

  const aiHw = nvAI('AI hardware analysis', 'Predictive maintenance and failure detection', 'orange', [
    { t:'Port capacity', s:'Utilisation forecast', big:`~${nint(N.name, 70, 3, 9)} months`, tone:'orange',
      d:`Port exhaustion predicted at the current growth rate of +${nint(N.name, 71, 3, 9)}.${nint(N.name, 72, 0, 9)}% a month.`,
      bar: nint(N.name, 73, 78, 94) },
    { t:'Failure prediction', s:'Component analysis', chip:['Low','success'],
      d:`Fan module wear — predicted cyclic growth in RPM degradation, 2.3% over 30 days. No action required yet.` },
    { t:'Optical degradation', s:'SFP power drift', chip:['Medium','warning'],
      d:`SFP on ${N.sfp[3].port} is drifting ${(0.2 + nrand(N.name, 74, 0, 0.5)).toFixed(1)} dB a month. Replace before it crosses the receiver floor.` },
    { t:'Thermal analysis', s:'Temperature monitoring', chip:['Normal','success'],
      d:`Chassis temperatures are within acceptable range. Sensor status green across all zones.` },
    { t:'Optimisation tip', s:'Suggested action', chip:['Informational','info'],
      d:`Schedule the optical clean during off-peak hours. Consider adjusting the alerting threshold to 78%.` }
  ]);

  const portLayout = `
    <div class="cx-panel">
      <div class="cx-panel-head"><span class="eyebrow">Physical port layout</span></div>
      ${nvChassis(N.chassis)}
    </div>`;

  const utilBand = v => v > 85 ? ['Critical','red'] : v > 70 ? ['Warning','orange']
                      : v > 50 ? ['Moderate','amber'] : ['Normal','emerald'];
  const utilList = `
    <div class="cx-panel">
      <div class="row vw-justify-between vw-items-baseline cx-panel-head">
        <span class="eyebrow">Interface utilisation</span>
        <button class="nst-btn nst-btn--xs"${dA({ v:'resource', l:`Interfaces · ${N.name}` })}>Open all</button>
      </div>
      <div class="stack-s" style="margin-top:var(--vw-space-sm)">
        ${topIf.slice(0, 7).map((i, x) => {
          const d = nint(N.name, 2200 + x, -6, 9);
          const [, tone] = utilBand(i.inb);
          return `<div class="nv-util">
            <div class="row vw-justify-between vw-items-baseline vw-wrap" style="gap:var(--vw-space-xs)">
              <span class="row" style="gap:var(--vw-space-xs);min-width:0">
                <span class="vw-value mono" title="${i.desc}">${i.n}</span>
                ${chip(i.oper === 'up' ? 'Up' : 'Degraded', i.oper === 'up' ? 'success' : 'warning')}
                <span class="vw-card-metric-label-sub mono">${i.sp}</span>
              </span>
              <span class="row" style="gap:var(--vw-space-sm)">
                <span class="nv-util-d" style="color:${cv(d >= 0 ? 'emerald' : 'gray', d >= 0 ? 700 : 500)}">${d >= 0 ? '+' : ''}${d}%</span>
                <span class="vw-value num" style="font-weight:500">${i.inb}%</span>
              </span>
            </div>
            <span class="hbar-track" style="height:8px;display:block"><span class="hbar-fill"
              style="display:block;width:${i.inb}%;background:${cv(tone,400)}"></span></span>
          </div>`;
        }).join('')}
      </div>
      <div class="vw-card-footer-divider nv-ulegend">
        ${[['Critical (>85%)','red'],['Warning (70–85%)','orange'],
           ['Moderate (50–70%)','amber'],['Normal (<50%)','emerald']]
          .map(([l, t]) => `<span class="legend-i"><span class="legend-sw" style="background:${cv(t,400)}"></span>${l}</span>`).join('')}
      </div>
    </div>`;

  const opticalBlock = N.optical ? `
    <div class="vw-grid vw-grid-cols-4 vw-gap-md" style="margin-top:var(--vw-space-md)">
      ${kpi('Channels in service', `${N.optical.used} / ${N.optical.chans.length}`,
        `${N.optical.chans.length - N.optical.used} spare wavelengths`, 'cyan')}
      ${kpi('Worst OSNR', `${Math.min(...N.optical.chans.filter(c => !c.spare).map(c => c.osnr))} dB`,
        'margin to the 12 dB FEC floor', 'amber')}
      ${kpi('Amplifiers', `${N.optical.amps.filter(a => a.st === 'Active').length} / ${N.optical.amps.length}`,
        N.optical.amps.map(a => a.n.split(' ')[0]).join(' · '), 'purple')}
      ${kpi('Spans', String(N.optical.spans.length),
        `${N.optical.spans.reduce((a, s) => a + s.km, 0)} km total`, 'sky')}
    </div>

    <div class="cx-panel-head row vw-justify-between vw-items-baseline" style="margin-top:var(--vw-space-lg)">
      <span class="eyebrow">Wavelength plan</span>
      <span class="vw-card-metric-label-sub">Per-channel optical power, OSNR and pre-FEC BER</span>
    </div>
    ${table([{t:'Channel'},{t:'Wavelength'},{t:'Service'},{t:'Line rate'},{t:'Status'},
             {t:'TX power',r:true},{t:'RX power',r:true},{t:'OSNR',r:true},{t:'Pre-FEC BER',r:true}],
      N.optical.chans.map(c => [
        `<span class="mono">${c.ch}</span>`, `<span class="mono">${c.lambda} nm</span>`,
        c.spare ? `<span style="color:${cv('gray',400)}">spare wavelength</span>` : `<span class="vw-value">${c.svc}</span>`,
        c.rate ? `<span class="mono">${c.rate}</span>` : `<span style="color:${cv('gray',300)}">—</span>`,
        chip(c.st, c.st === 'Active' ? 'success' : c.st === 'Warning' ? 'warning'
          : c.st === 'Unequipped' ? 'neutral' : 'error'),
        c.tx === null ? `<span style="color:${cv('gray',300)}">—</span>` : `<span class="mono">${c.tx} dBm</span>`,
        c.rx === null ? `<span style="color:${cv('gray',300)}">—</span>` : `<span class="mono">${c.rx} dBm</span>`,
        c.osnr === null ? `<span style="color:${cv('gray',300)}">—</span>`
          : `<span class="mono"${c.osnr < 15 ? ` style="color:${cv('red',700)}"` : ''}>${c.osnr} dB</span>`,
        c.ber === null ? `<span style="color:${cv('gray',300)}">—</span>` : `<span class="mono">${c.ber}</span>`
      ]), '',
      () => [])}

    <div class="nv-portsplit" style="margin-top:var(--vw-space-lg)">
      <div class="cx-panel">
        <div class="cx-panel-head"><span class="eyebrow">Amplifier chain</span></div>
        ${N.optical.amps.map(a => `
          <div class="cx-row">
            <span class="vw-label">${a.n}</span>
            <span class="hbar-track"><span class="hbar-fill" style="display:block;width:${(a.gain / 25 * 100).toFixed(0)}%;
              background:${cv(a.st === 'Active' ? 'emerald' : 'slate', a.st === 'Active' ? 400 : 300)}"></span></span>
            <span class="vw-value num t-right">${a.gain} dB</span>
          </div>`).join('')}
      </div>
      <div class="cx-panel">
        <div class="cx-panel-head"><span class="eyebrow">Span loss against budget</span></div>
        ${N.optical.spans.map(sp => {
          const pct = Math.min(100, sp.loss / sp.budget * 100);
          return `<div class="cx-row">
            <span class="vw-label" title="${sp.n}">${sp.n}</span>
            <span class="hbar-track"><span class="hbar-fill" style="display:block;width:${pct.toFixed(0)}%;
              background:${cv(pct > 88 ? 'red' : pct > 70 ? 'amber' : 'emerald', 400)}"></span></span>
            <span class="vw-value num t-right">${sp.loss} / ${sp.budget} dB</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  return `
    <div class="row-t nv-hw" style="align-items:stretch">
      ${perfCard}
      ${aiHw}
    </div>
    ${card(`
      ${N.meta.hw === 'optical' ? opticalBlock
        : `<div class="nv-portsplit">${portLayout}${utilList}</div>`}

      <div class="cx-panel-head row vw-justify-between vw-items-baseline" style="margin-top:var(--vw-space-xl)">
        <span class="eyebrow">Top interfaces by utilisation</span>
        <span class="vw-card-metric-label-sub">Real-time bandwidth consumption of ${N.ov.ifTotal} interfaces</span>
      </div>
      ${table([{t:'Name'},{t:'Description'},{t:'Media'},{t:'Admin status'},{t:'Operational status'},
               {t:'Inbound utilisation',r:true},{t:'Outbound utilisation',r:true}],
        topIf.map(i => [
          `<span class="vw-value mono">${i.n}</span>`,
          `<span class="vw-card-metric-label-sub">${i.desc}</span>`,
          `<span class="mono">${i.sp}</span>`,
          chip(i.admin, i.admin === 'up' ? 'success' : 'error'),
          chip(i.oper, i.oper === 'up' ? 'success' : 'error'),
          `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="hbar-track" style="width:4rem;height:7px">
            <span class="hbar-fill" style="display:block;width:${i.inb}%;background:${cv(i.inb>85?'red':i.inb>70?'amber':'emerald',400)}"></span></span>${i.inb}%</span>`,
          `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="hbar-track" style="width:4rem;height:7px">
            <span class="hbar-fill" style="display:block;width:${i.outb}%;background:${cv(i.outb>85?'red':i.outb>70?'amber':'emerald',400)}"></span></span>${i.outb}%</span>`
        ]), '',
        () => [])}

      <div class="cx-panel-head row vw-justify-between vw-items-baseline" style="margin-top:var(--vw-space-xl)">
        <span class="eyebrow">SFP module details</span>
        <span class="vw-card-metric-label-sub">Optical transceiver status and health for ${N.sfp.length} modules</span>
      </div>
      ${table([{t:'Port'},{t:'Type'},{t:'Status'},{t:'TX power',r:true},{t:'RX power',r:true},{t:'Temperature',r:true}],
        N.sfp.map(s => [
          `<span class="mono">${s.port}</span>`, `<span class="mono">${s.type}</span>`,
          chip(s.st, s.st === 'Active' ? 'success' : s.st === 'Standby' ? 'warning' : 'error'),
          `<span class="mono">${s.tx} dBm</span>`,
          `<span class="mono"${s.rx < -18 ? ` style="color:${cv('red',700)}"` : ''}>${s.rx} dBm</span>`,
          `${s.temp} °C`
        ]), '',
        () => [])}`)}`;
}

function nodeLinksRouter(N) {
  const sel = N.protoRows.find(p => p.k === NODE_LINK_PROTO) || N.protoRows[0];
  return card(`
    ${headSm('Links')}
    <div class="vw-grid vw-grid-cols-4 vw-gap-md" style="margin-top:var(--vw-space-md)">
      ${N.protoRows.map(p => `
        <button class="vw-card-section vw-card--clickable vw-card--accent stack-x${p.k === sel.k ? ' is-on' : ''}"
          data-nlink="${p.k}" aria-pressed="${p.k === sel.k}"
          style="padding-top:calc(var(--vw-space-lg) + 3px);gap:var(--vw-space-xs);--oc-a:${cv(p.tone,500)}">
          <div class="vw-card-accent" style="background:${cv(p.tone,400)}"></div>
          <div class="row vw-justify-between vw-items-baseline">
            <span class="vw-card-metric-label">${p.k}</span>
            <span class="vw-card-metric-lg num">${p.a}</span>
          </div>
          <span class="vw-card-metric-label-sub">${p.n} · ${p.d} down · ${p.i} init</span>
        </button>`).join('')}
    </div>

    <div class="nv-cap">
      <div class="cx-panel">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">Link capacity forecast — ${sel.k}</span>
          <span class="legend">
            <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',500)}"></span>actual</span>
            <span class="legend-i"><span class="legend-sw" style="background:${cv('orange',500)}"></span>forecast</span>
          </span>
        </div>
        ${nvTrend(N.capTrendByProto[sel.k] || N.capTrend, [{ k:'a', tone:'sky' }, { k:'f', tone:'orange', dash:true }], 190)}
      </div>

      <div class="cx-panel">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">Link capacity dashboard</span>
          ${chip(`${sel.k} protocol`, 'info')}
          <span class="vw-card-metric-label-sub">${sel.a} active · ${sel.d} down · ${sel.i} init</span>
        </div>
        <div class="nv-linkgrid">
          ${N.capRows.map(r => `
            <button class="nv-link is-drill"${dA({ v:'links', l:`${r.n} capacity`, q:'tab=lldp' })}>
              <div class="row vw-justify-between vw-items-baseline">
                <span class="vw-value">${r.n}</span>
                ${chip(r.util > 85 ? 'Backhaul' : 'Healthy', r.util > 85 ? 'error' : 'success')}
              </div>
              <div class="nv-link-g">
                <span class="nv-hk">Source IP</span><span class="mono">${r.sip}</span>
                <span class="nv-hk">Destination IP</span><span class="mono">${r.dip}</span>
                <span class="nv-hk">Bandwidth utilisation</span>
                <span class="num" style="color:${cv(r.tone,700)};font-weight:500">${r.util}%</span>
                <span class="nv-hk">Active sessions</span><span class="num">${n(r.sess)}</span>
                <span class="nv-hk">Forecast date</span><span class="num">${r.fc}</span>
                <span class="nv-hk">Growth rate</span><span class="num">+${r.growth}% / mo</span>
              </div>
            </button>`).join('')}
        </div>
      </div>
    </div>`);
}

function nodeServicesRouter(N) {
  const rows = N.instances;
  return card(`
    ${headSm('Network services')}
    <div class="vw-grid vw-grid-cols-5 vw-gap-md" style="margin-top:var(--vw-space-md)">
      ${N.svcTypes.map(t => `
        <div class="vw-card-child stack-x" style="padding:var(--vw-space-md);gap:2px">
          <div class="row vw-justify-between vw-items-baseline">
            <span class="vw-card-title-sm">${t.n}</span>
            <span class="vw-card-metric-md num">${t.c}</span>
          </div>
          <span class="vw-card-metric-label-sub">${t.c} service${t.c > 1 ? 's' : ''}</span>
          <div class="nv-svc-g">
            <span class="nv-hk">Active</span><span class="num">${t.a}</span>
            <span class="nv-hk">Degraded</span><span class="num"${t.deg ? ` style="color:${cv('amber',700)}"` : ''}>${t.deg}</span>
            <span class="nv-hk">Down</span><span class="num"${t.dn ? ` style="color:${cv('red',700)}"` : ''}>${t.dn}</span>
            <span class="nv-hk">SLA target</span><span class="num">${t.sla}%</span>
          </div>
        </div>`).join('')}
    </div>

    <div class="vw-grid vw-grid-cols-4 vw-gap-md" style="margin-top:var(--vw-space-md)">
      ${kpi('Total service instances', String(N.svcTotal), 'across five service families', 'sky',
        { v:'services', l:`Services on ${N.name}` })}
      ${kpi('Average SLA compliance', `${N.sla}%`, 'rolling 30 days', 'emerald')}
      ${kpi('Active customers', String(N.customers), 'with at least one live service', 'purple')}
      ${kpi('Services at risk', String(N.atRisk), 'degraded or above 90% utilisation', 'red')}
    </div>

    <div class="nv-svc-split">
      <div class="cx-panel grow">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">All service instances</span>
          <span class="vw-card-metric-label-sub">${rows.length} instances</span>
        </div>
        ${table([{t:'Service ID'},{t:'Type'},{t:'Customer'},{t:'Status'},{t:'Bandwidth'},
                 {t:'Utilisation',r:true},{t:'SLA target',r:true},{t:'Uptime',r:true}],
          rows.map(r => [
            `<span class="mono">${r.id}</span>`,
            chip(r.type, r.type === 'L3VPN' ? 'info' : r.type === 'L2VPN' ? 'purple' : 'neutral'),
            `<span class="vw-value">${r.cust}</span><br><span class="vw-card-metric-label-sub mono">${r.ifc}</span>`,
            chip(r.st, r.st === 'Active' ? 'success' : r.st === 'Degraded' ? 'warning' : 'error'),
            `<span class="mono">${r.bw}</span>`,
            `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="hbar-track" style="width:3.5rem;height:7px">
              <span class="hbar-fill" style="display:block;width:${r.util}%;background:${cv(r.util>90?'red':r.util>75?'amber':'emerald',400)}"></span></span>${r.util}%</span>`,
            `${r.sla}%`, `${r.up}%`
          ]), '',
          () => [])}
      </div>
      ${nvAI('AI service analytics', 'Intelligent service optimisation', 'red', [
        { t:'Top 5 premium customers', s:'Highest committed bandwidth on this node',
          d: N.instances.slice(0, 5).map((r, i) =>
              `${i + 1} · <strong>${r.cust}</strong> — ${r.bw}, ${r.util}% utilised, ${r.type}`).join('<br>') },
        { t:'SLA risk alert', s:'Predictive analysis', chip:['Risk','error'],
          d:`${rows.filter(r => r.util > 88).length} services are running above 88% utilisation. At the current growth rate the 99.9% SLA is at risk within the quarter.` },
        { t:'Growth forecast', s:'Next 30 days', chip:['+18%','info'],
          d:`L3VPN traffic is growing faster than the estate average. Provision headroom on the attachment interfaces before the next cycle.` },
        { t:'Capacity insight', s:'Bandwidth optimisation', chip:['+24%','warning'],
          d:`Peak bandwidth on the top two customers is concentrated inside a four-hour window. Shaping would recover measurable headroom.` },
        { t:'Top revenue contribution', s:'Customer analytics', chip:['High priority','error'],
          d:`The top three customers on this node account for a disproportionate share of committed bandwidth. Any outage here is commercially material.` },
        { t:'Churn risk detection', s:'Behavioural signal',
          d:`One customer has recorded repeated degradation events in the last 30 days. Worth a proactive review before renewal.` }
      ])}
    </div>`);
}

function nodeAlertsRouter(N) {
  const alertTab = NODE_ALERT_TAB || 'alerts';
  const SEV = { Critical:'error', Major:'warning', Minor:'orange', Warning:'neutral' };
  return card(`
    <div class="row vw-justify-between vw-items-center" style="margin-bottom:var(--vw-space-md)">
      <div style="display:inline-flex;align-items:center;background:var(--vw-color-slate-100, #f1f5f9);padding:4px;border-radius:10px;gap:4px">
        <button class="nst-btn${alertTab === 'alerts' ? ' is-on' : ''}" data-nalert="alerts"
          style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border:0;border-radius:8px;font-size:0.875rem;font-weight:${alertTab === 'alerts' ? '600' : '500'};color:${alertTab === 'alerts' ? 'var(--vw-color-slate-900)' : 'var(--vw-color-slate-600)'};background:${alertTab === 'alerts' ? '#ffffff' : 'transparent'};box-shadow:${alertTab === 'alerts' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};cursor:pointer;transition:all 0.15s ease">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          Alerts
        </button>
        <button class="nst-btn${alertTab === 'incidents' ? ' is-on' : ''}" data-nalert="incidents"
          style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border:0;border-radius:8px;font-size:0.875rem;font-weight:${alertTab === 'incidents' ? '600' : '500'};color:${alertTab === 'incidents' ? 'var(--vw-color-slate-900)' : 'var(--vw-color-slate-600)'};background:${alertTab === 'incidents' ? '#ffffff' : 'transparent'};box-shadow:${alertTab === 'incidents' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};cursor:pointer;transition:all 0.15s ease">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Incidents
        </button>
      </div>
    </div>

    <div class="nv-svc-split">
      <div class="cx-panel grow">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid var(--vw-color-slate-200,#e2e8f0);flex-wrap:nowrap">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;border-radius:8px;background:${cv('red',50)};color:${cv('red',600)};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <div style="font-size:1rem;font-weight:700;color:var(--vw-color-slate-800,#1e293b);line-height:1.2">${alertTab === 'alerts' ? 'Active alerts & events' : 'Open incidents'}</div>
              <div style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b);margin-top:2px">Real-time monitoring across all network resources</div>
            </div>
          </div>
          ${alertTab === 'alerts' ? `
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <select class="nst-input nst-input--sm" style="height:34px;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
                <option>All severity</option>
                <option>Critical</option>
                <option>Major</option>
                <option>Minor</option>
              </select>
              <select class="nst-input nst-input--sm" style="height:34px;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
                <option>All sources</option>
                <option>Interface</option>
                <option>CPU</option>
                <option>Memory</option>
              </select>
            </div>` : ''}
        </div>
        ${alertTab === 'alerts' ? `
          <div class="stack-s">
            ${N.alarmsList.map(a => `
              <div class="nv-alarm" style="--nt:${cv(SEV[a.sev] === 'error' ? 'red' : SEV[a.sev] === 'warning' ? 'amber' : 'orange', 400)}">
                <div class="row vw-justify-between vw-items-start vw-wrap" style="gap:var(--vw-space-sm)">
                  <div class="stack-x grow" style="min-width:0">
                    <div class="row" style="gap:var(--vw-space-xs)">
                      ${chip(a.sev, SEV[a.sev])}<span class="vw-card-activity-label">${a.t}</span>
                    </div>
                    <span class="vw-card-description" style="white-space:normal">${a.d}</span>
                  </div>
                  ${chip('Active', 'error')}
                </div>
                <div class="nv-alarm-g">
                  <span class="nv-hk">Source</span><span class="vw-value">${a.src}</span>
                  <span class="nv-hk">Alert type</span><span class="vw-value">${a.at}</span>
                  <span class="nv-hk">Event start time</span><span class="vw-value num">${a.when}</span>
                  <span class="nv-hk">Alert code</span><span class="vw-value mono">${a.code}</span>
                </div>
              </div>`).join('')}
          </div>
          <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
            <span class="legend">
              ${[['Critical','red'],['Major','amber'],['Minor','orange'],['Warning','slate']].map(([l, t]) =>
                `<span class="legend-i"><span class="legend-sw" style="background:${cv(t, t === 'slate' ? 300 : 400)}"></span>${l}</span>`).join('')}
            </span>
          </div>`
        : table([{t:'Incident'},{t:'Severity'},{t:'Opened'},{t:'Owner'},{t:'SLA'},{t:'Next action'}],
            [['INC-4471','Critical','30-Jun-2026 12:34','Anjali Verma','Breached','Replace SFP on ' + N.sfp[3].port],
             ['INC-4468','Major','29-Jun-2026 22:48','Harish Kumar','At risk','Raise CPU threshold, schedule review']]
            .map(r => [`<span class="mono">${r[0]}</span>`, chip(r[1], r[1] === 'Critical' ? 'error' : 'warning'),
                       `<span class="num">${r[2]}</span>`, r[3],
                       chip(r[4], r[4] === 'Breached' ? 'error' : 'warning'),
                       `<span class="vw-card-description">${r[5]}</span>`]), '',
            () => [])}
      </div>

      ${nvAI('AI diagnostics', 'Intelligent root cause analysis', 'red', [
        { t:'Root cause', s:'Most likely cause', chip:['92%','error'],
          d:`Physical layer issue on ${N.sfp[3].port}. Flapping events suggest cable or optical degradation rather than a control-plane fault.`,
          bar: 92 },
        { t:'Impact assessment', s:'Customer: Enterprise Corp',
          d:`${N.atRisk} services traverse the affected path. One premium customer is exposed; SLA headroom for the month is thin.`,
          chip:['High','warning'] },
        { t:'Action plan', s:'Priority order',
          d:`1 · Replace SFP on ${N.sfp[3].port} · 2 · Follow with a 15-minute BER test · 3 · Reset counters and watch for 24 hours · 4 · Close the incident if clean.` },
        { t:'Similar events', s:'Estate correlation', chip:['4 nodes','info'],
          d:`Four other nodes on the same optical vendor batch show the same drift signature. Worth a batch-level RMA rather than four separate ones.` }
      ])}
    </div>`);
}

function nodeVlans(N) {
  if (!N.vlans) return '';
  const tot = N.vlans.reduce((a, v) => a + v.mac, 0);
  return card(`
    ${headSm('VLAN dashboard')}
    <div class="vw-grid vw-grid-cols-4 vw-gap-md" style="margin-top:var(--vw-space-md)">
      ${kpi('Configured VLANs', String(N.vlans.length + 51), 'maximum supported 4,094', 'sky')}
      ${kpi('Active VLANs', String(N.vlans.length + 45), 'carrying traffic this hour', 'emerald')}
      ${kpi('Trunk ports', String(N.vlans.reduce((a, v) => a + v.tr, 0)), 'carrying tagged traffic', 'amber')}
      ${kpi('Access ports', String(N.vlans.reduce((a, v) => a + v.acc, 0)), 'untagged, one VLAN each', 'purple')}
    </div>
    ${gridBar(gridApply('vlan:' + N.name, N.vlans).length, N.vlans.length + 51, 'VLAN ID, name, type', FS.vlan, '', [], 'vlan:' + N.name)}
    ${table([{t:'VLAN ID'},{t:'Name'},{t:'Type'},{t:'Trunk ports',r:true},{t:'Access ports',r:true},
             {t:'STP state'},{t:'Status'},{t:'Learned MAC',r:true},{t:'Traffic utilisation',r:true}],
      gridApply('vlan:' + N.name, N.vlans).map(v => [
        `<span class="mono">${v.id}</span>`, `<span class="vw-value">${v.n}</span>`,
        chip(v.t, { Data:'info', Server:'success', Wireless:'purple', Voice:'warning', Guest:'neutral', Management:'error' }[v.t] || 'neutral'),
        v.tr, v.acc, chip(v.stp, 'success'), chip(v.st, 'success'), n(v.mac),
        `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="vw-card-metric-label-sub">${v.bw}</span>
          <span class="hbar-track" style="width:3.5rem;height:7px"><span class="hbar-fill"
            style="display:block;width:${v.pct}%;background:${cv(v.pct>75?'red':v.pct>50?'amber':'emerald',400)}"></span></span>${v.pct}%</span>`
      ]), '',
      () => [])}
    <div class="vw-card-footer-divider row vw-justify-end vw-wrap">
      <span class="vw-card-metric-label-sub num">${n(tot)} MAC addresses learned</span>
    </div>`);
}

function nodeAvailability(N) {
  const pct = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  return card(`
    ${headSm('24-hour service availability')}
    <div style="margin-top:var(--vw-space-md)">
      ${nvStrip(N.avail.icmp, 'ICMP health', pct(N.avail.icmp))}
      ${nvStrip(N.avail.ntp, 'NTP sync', pct(N.avail.ntp))}
    </div>
    <div class="vw-card-footer-divider row vw-justify-end">
      <span class="vw-card-metric-label-sub">Last 24 hours · updated 1 min ago</span>
    </div>`);
}

/* ═══════════════════════════════════════════════════════════
   DISPATCHERS (Delegates to Switch or Router implementation)
   ═══════════════════════════════════════════════════════════ */

function nodeHeader(N) {
  return N.cls === 'switch' ? nodeHeaderSwitch(N) : nodeHeaderRouter(N);
}

function nodeOverview(N) {
  return N.cls === 'switch' ? nodeOverviewSwitch(N) : nodeOverviewRouter(N);
}

function nodeHardware(N) {
  return N.cls === 'switch' ? nodeHardwareSwitch(N) : nodeHardwareRouter(N);
}

function nodeLinks(N) {
  return N.cls === 'switch' ? nodeLinksSwitch(N) : nodeLinksRouter(N);
}

function nodeServices(N) {
  return N.cls === 'switch' ? nodeServicesSwitch(N) : nodeServicesRouter(N);
}

function nodeAlerts(N) {
  return N.cls === 'switch' ? nodeAlertsSwitch(N) : nodeAlertsRouter(N);
}

let NODE_TAB = 'overview';

function viewNode() {
  const N = nodeOf(NODE_ID);
  if (!N.live) {
    return `<div class="page">
      ${pageHead(`Node view · ${N.name}`, `${N.meta.n} · ${N.r.ip} · ${N.r.loc}`)}
      ${drillBar()}
      ${nodeHeader(N)}
      ${card(`
        <div class="vw-card-child-shaded stack-s" style="padding:var(--vw-space-xl);text-align:center">
          <span class="vw-card-title">No live feed for this class</span>
          <span class="vw-card-description" style="white-space:normal;max-width:60ch;margin:0 auto">
            Node view is built from an assurance feed — ICMP and NTP probes, CPU and temperature series, interface
            counters and alarms. <strong>${N.meta.n}</strong> has no collector and no assurance integration, so none of
            that exists for this element. What you see above is the inventory record, and it is the whole of what the
            platform knows. Everything below would be fabricated.
          </span>
          <div class="row vw-justify-center" style="margin-top:var(--vw-space-md)">
          </div>
        </div>`)}
    </div>`;
  }

  const tabs = [
    ['overview', 'Overview'],
    ['hardware', 'Hardware & interfaces'],
    ['links', 'Links'],
    ['services', 'Network services'],
    ['alerts', 'Alerts & diagnostics']
  ];

  const activeTab = (NODE_TAB || 'overview').toLowerCase();

  let tabContent = '';
  if (activeTab === 'hardware') {
    tabContent = N.cls === 'switch' ? `${nodeHardware(N)}${nodeVlans(N)}` : `${nodeHardware(N)}${nodeVlans(N)}`;
  } else if (activeTab === 'links') {
    tabContent = `${nodeLinks(N)}`;
  } else if (activeTab === 'services') {
    tabContent = `${nodeServices(N)}`;
  } else if (activeTab === 'alerts') {
    tabContent = `${nodeAlerts(N)}`;
  } else {
    /* overview default */
    tabContent = `${nodeOverview(N)}${nodeAvailability(N)}`;
  }

  return `<div class="page">
    ${pageHead(`Node view · ${N.name}`, `${N.meta.n} · ${N.r.ip} · ${N.r.loc} · live assurance view`,
      `<button class="nst-btn nst-btn--sm" data-site="${N.r.loc}">Back to site</button>`)}
    ${drillBar()}
    ${nodeHeader(N)}

    <div class="tabbar" style="margin-top:var(--vw-space-sm);margin-bottom:var(--vw-space-md)">
      ${tabs.map(([k, l]) => `<button class="tab${activeTab === k ? ' is-on' : ''}" data-nodetab="${k}">${l}</button>`).join('')}
    </div>

    ${tabContent}
  </div>`;
}

