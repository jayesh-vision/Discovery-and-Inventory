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
          <span class="vw-card-title" style="font-size:1.25rem;font-weight:500">${N.name}</span>
          ${chip(stLabel, stTone)}
        </div>
        <span class="vw-card-metric-label-sub mono" style="display:inline-flex;align-items:center;gap:4px;color:var(--vw-color-slate-500);margin-top:2px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          ${r.loc || N.name}(${coords})
        </span>
      </div>
    </div>
    <div class="nv-meta" style="grid-template-columns:repeat(7, 1fr);gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0)">${cells.map(([k, v]) => `<div class="stack-x">
      <span class="nv-hk" style="font-size:0.75rem;color:var(--vw-color-slate-500);font-weight:500">${k}</span><span class="nv-mv mono" style="font-size:0.875rem;font-weight:400;color:var(--vw-color-slate-800);margin-top:2px">${v}</span></div>`).join('')}</div>`,
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
  return card(`
    <div class="row vw-justify-between vw-items-center" style="gap:var(--vw-space-md);margin-bottom:var(--vw-space-lg);padding-bottom:var(--vw-space-md);border-bottom:1px solid var(--vw-color-slate-200)">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);border:1px solid #7dd3fc;display:flex;align-items:center;justify-content:center;color:#0284c7;box-shadow:0 2px 6px rgba(2,132,199,0.15);flex-shrink:0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </div>
        <div>
          <div style="font-size:1.1875rem;font-weight:600;color:var(--vw-color-slate-900);letter-spacing:-0.01em">Link capacity dashboard</div>
          <div style="font-size:0.8125rem;color:var(--vw-color-slate-500);margin-top:2px;display:flex;align-items:center;gap:8px">
            <span>LLDP Protocol capacity analysis</span>
            <span style="display:inline-flex;align-items:center;gap:4px;color:#059669;font-weight:500;font-size:0.75rem">
              <span style="width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981"></span>Live assurance
            </span>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:var(--vw-space-md)">
        ${chip('LLDP Protocol', 'info')}
        <span class="vw-card-metric-label-sub" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--vw-color-slate-100);border-radius:8px">
          Last sync : Jun 30, 2026 14:30:00
        </span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:330px 1fr;gap:var(--vw-space-xl);align-items:start">
      <div class="cx-panel" style="padding:16px;border-radius:14px;background:#ffffff;border:1px solid var(--vw-color-slate-200);box-shadow:0 2px 8px rgba(15,23,42,0.03)">
        <div class="row vw-justify-between vw-items-center" style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--vw-color-slate-100)">
          <span style="font-size:0.75rem;font-weight:600;color:var(--vw-color-slate-600);text-transform:uppercase;letter-spacing:0.04em">${N.capRows.length} Links in countdown · LLDP</span>
          <span style="font-size:0.6875rem;font-weight:600;padding:2px 8px;border-radius:10px;background:#e0f2fe;color:#0369a1">${N.capRows.length} Active</span>
        </div>
        <div class="stack-s" style="max-height:460px;overflow-y:auto;padding-right:4px">
          ${N.capRows.map((lk, idx) => `
            <button data-nlinksel="${idx}" aria-pressed="${idx === NODE_LINK_SEL}" style="width:100%;text-align:left;padding:12px 14px;border-radius:10px;border:1.5px solid ${idx === NODE_LINK_SEL ? '#0284c7' : 'var(--vw-color-slate-200)'};background:${idx === NODE_LINK_SEL ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#ffffff'};border-left:${idx === NODE_LINK_SEL ? '4px solid #0284c7' : '3px solid transparent'};box-shadow:${idx === NODE_LINK_SEL ? '0 4px 12px rgba(2,132,199,0.15)' : '0 1px 3px rgba(0,0,0,0.02)'};cursor:pointer;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);margin-bottom:8px">
              <div class="row vw-justify-between vw-items-center" style="margin-bottom:6px">
                <span class="mono" style="font-size:0.875rem;font-weight:600;color:${idx === NODE_LINK_SEL ? '#0369a1' : '#0284c7'}">${lk.n}</span>
                <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${idx === NODE_LINK_SEL ? '#bae6fd' : '#f1f5f9'};color:${idx === NODE_LINK_SEL ? '#0284c7' : '#94a3b8'};font-size:0.75rem">→</span>
                <span class="mono" style="font-size:0.8125rem;font-weight:600;color:var(--vw-color-slate-800)">${lk.peer}</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.75rem">
                <div><span class="nv-hk" style="font-size:0.6875rem;color:#64748b">Source IP</span><br><span class="mono" style="font-weight:600;color:${idx === NODE_LINK_SEL ? '#0369a1' : '#334155'}">${lk.sip}</span></div>
                <div><span class="nv-hk" style="font-size:0.6875rem;color:#64748b">Destination IP</span><br><span class="mono" style="font-weight:600;color:var(--vw-color-slate-700)">${lk.dip}</span></div>
              </div>
            </button>`).join('')}
        </div>
      </div>

      ${(() => {
        const sel = N.capRows[NODE_LINK_SEL] || N.capRows[0];
        const trendData = N.linkTrendDaily(sel);
        const peak = Math.max(...trendData.map(t => Math.max(t.a, t.f)));
        const growth = +(((trendData[6].a + trendData[6].f) / 2 - (trendData[0].a + trendData[0].f) / 2) / 6).toFixed(1);
        return `
      <div class="cx-panel" style="padding:24px;border-radius:14px;background:#ffffff;border:1px solid var(--vw-color-slate-200);box-shadow:0 2px 8px rgba(15,23,42,0.03)">
        <div class="row vw-justify-between vw-items-center" style="margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--vw-color-slate-100)">
          <div style="font-size:0.9375rem;font-weight:600;color:var(--vw-color-slate-900)">Link capacity trend · ${esc(sel.n)}</div>
          <div style="display:flex;align-items:center;gap:12px;font-size:0.75rem">
            <span style="padding:3px 10px;border-radius:12px;background:#f0f9ff;color:#0369a1;font-weight:600">Peak: ${peak}%</span>
            <span style="padding:3px 10px;border-radius:12px;background:#fff7ed;color:#c2410c;font-weight:600">${growth >= 0 ? '+' : ''}${growth}%/day</span>
          </div>
        </div>
        ${nvTrend(trendData, [{ k:'a', tone:'sky' }, { k:'f', tone:'orange' }], 280)}
        <div class="row vw-justify-center" style="gap:24px;margin-top:20px;font-size:0.75rem">
          <span style="display:inline-flex;align-items:center;gap:8px;padding:4px 14px;background:#f0f9ff;border:1px solid #e0f2fe;border-radius:16px">
            <span style="width:8px;height:8px;border-radius:50%;background:#0ea5e9;box-shadow:0 0 6px rgba(14,165,233,0.5)"></span>
            <span style="font-weight:600;color:#0369a1">${esc(sel.n)} - Inbound Utilization</span>
          </span>
          <span style="display:inline-flex;align-items:center;gap:8px;padding:4px 14px;background:#fff7ed;border:1px solid #ffedd5;border-radius:16px">
            <span style="width:8px;height:8px;border-radius:50%;background:#f97316;box-shadow:0 0 6px rgba(249,115,22,0.5)"></span>
            <span style="font-weight:600;color:#c2410c">${esc(sel.n)} - Outbound Utilization</span>
          </span>
        </div>
      </div>`;
      })()}
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
          <div style="font-size:1rem;font-weight:600;color:var(--vw-color-slate-900,#0f172a)">${svcType} Service instances</div>
          <div style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b);margin-top:2px">${rows.length} Services Of type ${svcType}</div>
        </div>
        <select class="nst-input nst-input--sm" style="height:34px;width:auto;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
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
            <div style="font-size:1rem;font-weight:600;color:var(--vw-color-slate-900,#0f172a)">Active alerts & events</div>
            <div style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b);margin-top:2px">Real-time monitoring across all network resources</div>
          </div>
        </div>
        <select class="nst-input nst-input--sm" style="height:34px;width:auto;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
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
                  <span style="font-size:0.75rem;padding:2px 8px;border-radius:4px;background:#fee2e2;color:#dc2626;font-weight:500">Open</span>
                  <span style="font-size:0.75rem;padding:2px 8px;border-radius:4px;background:#f1f5f9;color:#475569;font-weight:500">${a.badge}</span>
                </div>
                <div class="vw-card-activity-label" style="margin-top:4px">${a.t}</div>
                <div style="font-size:0.8125rem;color:var(--vw-color-slate-600);margin-top:2px">${a.d}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.06)">
              <div><span class="nv-hk">Source</span><br><span class="vw-value">${a.src}</span></div>
              <div><span class="nv-hk">Alert type</span><br><span class="vw-value">${a.at}</span></div>
              <div><span class="nv-hk">Event start time</span><br><span class="vw-value num">${a.when}</span></div>
              <div><span class="nv-hk">Alert code</span><br><span class="vw-value mono">${a.code}</span></div>
            </div>
          </div>`).join('')}
      </div>

      <div style="display:flex;align-items:center;gap:16px;margin-top:20px;padding-top:12px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0);font-size:0.8125rem;color:var(--vw-color-slate-600)">
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-rose-500,#f43f5e)"></span><span style="font-weight:600">1</span> Critical</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-amber-500,#f59e0b)"></span><span style="font-weight:600">2</span> Major</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-yellow-500,#eab308)"></span><span style="font-weight:600">1</span> Minor</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--vw-color-slate-400,#94a3b8)"></span><span style="font-weight:600">0</span> Warning</span>
        <span style="margin-left:auto;font-weight:500;color:var(--vw-color-slate-800)">4 Total</span>
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

/* one link's own capacity trend (see nodeOf()'s linkTrend — derived from
   that link's real utilisation + growth rate, not a shared protocol
   sample) plotted against the two operational thresholds every capacity
   chart in this app already uses (85% warning, 95% critical), with both
   series labelled directly on their own line instead of a legend row */
function renderLinkCapacityChart(row, linkTrendFn, protoLabel) {
  const trend = linkTrendFn(row);
  const W = 900, H = 260, PADL = 44, PADB = 28, PADT = 20, PADR = 60;
  const months = trend.map(t => t.m);
  const lo = Math.min(row.util, ...trend.map(t => t.a ?? Infinity), ...trend.map(t => t.f ?? Infinity));
  const hi = Math.max(98, row.util, ...trend.map(t => t.a ?? -Infinity), ...trend.map(t => t.f ?? -Infinity));
  const floor = Math.max(0, Math.floor((lo - 8) / 5) * 5);
  const ceil = Math.min(100, Math.ceil((hi + 4) / 5) * 5);

  const x = i => PADL + (i / (months.length - 1)) * (W - PADL - PADR);
  const y = v => PADT + (1 - (v - floor) / (ceil - floor)) * (H - PADT - PADB);

  const line = (key, tone) => {
    const pts = trend.map((t, i) => t[key] == null ? null : `${x(i).toFixed(1)},${y(t[key]).toFixed(1)}`).filter(Boolean);
    return pts.length > 1 ? `<path d="M ${pts.join(' L ')}" fill="none" stroke="${tone}" stroke-width="2.4"
      stroke-linejoin="round" stroke-linecap="round"${key === 'f' ? ' stroke-dasharray="7 5"' : ''}/>` : '';
  };
  const dots = (key, tone) => trend.map((t, i) => t[key] == null ? '' :
    `<circle cx="${x(i)}" cy="${y(t[key])}" r="4" fill="${tone}" stroke="#ffffff" stroke-width="1.5" style="cursor:pointer"><title>${t.m} · ${key === 'a' ? 'Actual' : 'Forecast'} ${t[key]}%</title></circle>`).join('');
  /* last actual point and first forecast point share index 3 — label each
     series near its own midpoint so "actual"/"forecast" never overlap */
  const aMidI = 1, fMidI = 5;

  return `
    <div class="row vw-justify-between vw-items-center" style="margin-bottom:14px">
      <span style="font-size:0.9375rem;font-weight:600;color:var(--vw-color-slate-900)">Link capacity forecast – ${esc(row.n)}</span>
      ${chip(`${protoLabel} Protocol`, 'info')}
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="nv-chart" style="width:100%;height:auto;overflow:visible">
      ${[0, 0.25, 0.5, 0.75, 1].map(f => Math.round(floor + (ceil - floor) * f)).map(v => `
        <line x1="${PADL}" x2="${W - PADR}" y1="${y(v)}" y2="${y(v)}" stroke="#f1f5f9" stroke-width="1.2"/>
        <text x="${PADL - 10}" y="${y(v) + 4}" text-anchor="end" font-size="10" font-weight="500" fill="#94a3b8" font-family="system-ui">${v}%</text>
      `).join('')}

      ${ceil >= 85 && floor <= 85 ? `<line x1="${PADL}" x2="${W - PADR}" y1="${y(85)}" y2="${y(85)}" stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="6 4"/>
        <text x="${W - PADR + 6}" y="${y(85) + 4}" font-size="10" font-weight="600" fill="#b45309" font-family="system-ui">Warning 85%</text>` : ''}
      ${ceil >= 95 && floor <= 95 ? `<line x1="${PADL}" x2="${W - PADR}" y1="${y(95)}" y2="${y(95)}" stroke="#dc2626" stroke-width="1.4" stroke-dasharray="6 4"/>
        <text x="${W - PADR + 6}" y="${y(95) + 4}" font-size="10" font-weight="600" fill="#b91c1c" font-family="system-ui">Critical 95%</text>` : ''}

      ${line('a', '#2563eb')}${dots('a', '#2563eb')}
      ${line('f', '#f59e0b')}${dots('f', '#f59e0b')}

      <text x="${x(aMidI)}" y="${y(trend[aMidI].a) - 12}" text-anchor="middle" font-size="11" font-weight="600" fill="#1d4ed8"
        stroke="#ffffff" stroke-width="3" paint-order="stroke" font-family="system-ui">Bandwidth (actual)</text>
      <text x="${x(fMidI)}" y="${y(trend[fMidI].f) - 12}" text-anchor="middle" font-size="11" font-weight="600" fill="#b45309"
        stroke="#ffffff" stroke-width="3" paint-order="stroke" font-family="system-ui">Bandwidth (forecast)</text>

      ${months.map((m, i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10" font-weight="500" fill="#64748b" font-family="system-ui">${m}</text>`).join('')}
    </svg>`;
}

function nodeLinksRouter(N) {
  const sel = N.protoRows.find(p => p.k === NODE_LINK_PROTO) || N.protoRows[0];

  /* each protocol has its own vocabulary for what the same three counters
     (protoRows' a/d/i) mean — an OSPF link isn't "up", it's "Active"; an
     LSP isn't "down", it's "Down LSP". Labelling them generically as
     Active/Down/Init the way the cards used to is technically true but
     reads as a template that was never finished for anything but LLDP. */
  const PROTO_META = {
    OSPF: { labels: ['Active Links', 'Down Links', 'Init State'], tone: 'emerald', iconCol: '#16a34a', iconBg: '#dcfce7',
      icon: `<circle cx="12" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="18" r="3"></circle><line x1="12" y1="9" x2="6" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line>` },
    BGP:  { labels: ['Established', 'Idle', 'Active'], tone: 'purple', iconCol: '#9333ea', iconBg: '#f3e8ff',
      icon: `<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>` },
    LLDP: { labels: ['Neighbors Up', 'Neighbors Down', 'Unknown'], tone: 'sky', iconCol: '#0284c7', iconBg: '#e0f2fe',
      icon: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>` },
    LSP:  { labels: ['Active LSP', 'Standby LSP', 'Down LSP'], tone: 'rose', iconCol: '#e11d48', iconBg: '#ffe4e6',
      icon: `<path d="M4 12h4l2-6 4 12 2-6h4"></path>` },
    ISIS: { labels: ['Up Links', 'Down Links', 'Init State'], tone: 'amber', iconCol: '#d97706', iconBg: '#fef3c7',
      icon: `<polygon points="12 2 2 22 22 22 12 2"></polygon>` }
  };
  const protoCardsConfig = ['OSPF', 'BGP', 'LLDP', 'LSP', 'ISIS'].map(k => {
    const row = N.protoRows.find(p => p.k === k) || { a: 0, d: 0, i: 0 };
    const m = PROTO_META[k];
    return { k, labels: m.labels, vals: [row.a, row.d, row.i], iconCol: m.iconCol, iconBg: m.iconBg,
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m.icon}</svg>` };
  });

  return card(`
    ${headSm('Links')}
    
    <!-- Protocol cards: each protocol's own three-state breakdown, not a
         single generic count — see PROTO_META above -->
    <div class="vw-grid vw-grid-cols-5 vw-gap-md" style="margin-top:var(--vw-space-md);margin-bottom:var(--vw-space-xl)">
      ${protoCardsConfig.map(p => `
        <button class="vw-card-section vw-card--clickable${p.k === sel.k ? ' is-on' : ''}"
          data-nlink="${p.k}" aria-pressed="${p.k === sel.k}"
          style="padding:14px;border-radius:14px;background:#ffffff;border:1.5px solid ${p.k === sel.k ? p.iconCol : 'var(--vw-color-slate-200)'};box-shadow:${p.k === sel.k ? '0 4px 14px rgba(2,132,199,0.12)' : '0 1px 3px rgba(0,0,0,0.02)'};cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:10px;transition:all 0.2s ease">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:${p.iconBg};color:${p.iconCol};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${p.icon}
            </div>
            <div>
              <div style="font-size:0.9375rem;font-weight:600;color:var(--vw-color-slate-900)">${p.k}</div>
              <div style="font-size:0.6875rem;color:var(--vw-color-slate-500)">Protocol links</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${p.labels.map((label, li) => `<div class="row vw-justify-between vw-items-center" style="font-size:0.75rem">
              <span style="color:var(--vw-color-slate-500)">${label}</span>
              <span class="num" style="font-weight:600;color:${li === 0 ? p.iconCol : p.vals[li] > 0 ? 'var(--vw-color-red-600)' : 'var(--vw-color-slate-400)'}">${p.vals[li]}</span>
            </div>`).join('')}
          </div>
        </button>`).join('')}
    </div>

    <!-- Link capacity forecasting dashboard: a link list (left) driving a
         chart of that one link's own trend (right) — clicking a link in the
         list re-renders the chart from its own util/growth, not a
         protocol-wide sample shared by every link -->
    ${card(`
      <div class="row vw-justify-between vw-items-center" style="gap:var(--vw-space-md);margin-bottom:var(--vw-space-lg);padding-bottom:var(--vw-space-md);border-bottom:1px solid var(--vw-color-slate-200)">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);border:1px solid #7dd3fc;display:flex;align-items:center;justify-content:center;color:#0284c7;flex-shrink:0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div>
            <div style="font-size:1.0625rem;font-weight:600;color:var(--vw-color-slate-900)">Link capacity forecasting dashboard</div>
            <div style="font-size:0.8125rem;color:var(--vw-color-slate-500);margin-top:2px">${sel.k} protocol capacity analysis</div>
          </div>
        </div>
        ${chip(`${sel.k} Protocol`, 'info')}
      </div>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:var(--vw-space-xl);align-items:start">
        <div class="cx-panel" style="padding:14px;border-radius:14px;background:#ffffff;border:1px solid var(--vw-color-slate-200)">
          <div class="row vw-justify-between vw-items-center" style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--vw-color-slate-100)">
            <span style="font-size:0.6875rem;font-weight:600;color:var(--vw-color-slate-600);text-transform:uppercase;letter-spacing:0.04em">${N.capRows.length} Links in countdown · ${sel.k}</span>
          </div>
          <div class="stack-s" style="max-height:460px;overflow-y:auto;padding-right:2px">
            ${N.capRows.map((r, i) => `
              <button data-nlinksel="${i}" aria-pressed="${i === NODE_LINK_SEL}" style="width:100%;text-align:left;padding:10px 12px;border-radius:10px;
                border:1.5px solid ${i === NODE_LINK_SEL ? '#0284c7' : 'var(--vw-color-slate-200)'};
                background:${i === NODE_LINK_SEL ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#ffffff'};
                margin-bottom:6px;cursor:pointer;transition:all .15s ease">
                <div class="row vw-justify-between vw-items-baseline" style="margin-bottom:4px">
                  <span class="mono" style="font-size:0.8125rem;font-weight:600;color:${i === NODE_LINK_SEL ? '#0369a1' : 'var(--vw-color-slate-800)'}">${r.n}</span>
                  ${chip(r.util > 85 ? 'Backhaul' : 'Healthy', r.util > 85 ? 'error' : 'success')}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:0.6875rem">
                  <span style="color:var(--vw-color-slate-500)">Bandwidth utilisation</span>
                  <span class="mono" style="text-align:right;font-weight:600;color:${cv(r.tone,700)}">${r.util}%</span>
                  <span style="color:var(--vw-color-slate-500)">Active sessions</span>
                  <span class="mono num" style="text-align:right">${n(r.sess)}</span>
                  <span style="color:var(--vw-color-slate-500)">Forecast date</span>
                  <span class="mono" style="text-align:right">${r.fc}</span>
                  <span style="color:var(--vw-color-slate-500)">Growth rate</span>
                  <span class="mono num" style="text-align:right">+${r.growth}%/mo</span>
                </div>
              </button>`).join('')}
          </div>
        </div>

        <div class="cx-panel" style="padding:20px;border-radius:14px;background:#ffffff;border:1px solid var(--vw-color-slate-200)">
          ${renderLinkCapacityChart(N.capRows[NODE_LINK_SEL] || N.capRows[0], N.linkTrend, sel.k)}
        </div>
      </div>`, '', 'padding:var(--vw-space-lg) var(--vw-space-xl)')}`);
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
              <div style="font-size:1rem;font-weight:600;color:var(--vw-color-slate-800,#1e293b);line-height:1.2">${alertTab === 'alerts' ? 'Active alerts & events' : 'Open incidents'}</div>
              <div style="font-size:0.8125rem;color:var(--vw-color-slate-500,#64748b);margin-top:2px">Real-time monitoring across all network resources</div>
            </div>
          </div>
          ${alertTab === 'alerts' ? `
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <select class="nst-input nst-input--sm" style="height:34px;width:auto;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
                <option>All severity</option>
                <option>Critical</option>
                <option>Major</option>
                <option>Minor</option>
              </select>
              <select class="nst-input nst-input--sm" style="height:34px;width:auto;font-size:0.8125rem;font-weight:500;padding:4px 24px 4px 10px;border-radius:6px;border:1px solid var(--vw-color-slate-300,#cbd5e1);background:#ffffff;color:var(--vw-color-slate-700);cursor:pointer">
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
   DWDM — optical transport. This class's inventory record is the same
   generic NE shape as router/switch (name/ip/model/os/sn/oem/loc), so the
   header re-uses that shared metadata grid; what makes it DWDM-specific is
   the overview and hardware tabs, built around the one genuinely optical
   dataset already computed for every node — N.sfp (transceiver port/type/
   TX·RX power/temperature) — read as the node's live wavelength channels
   instead of as router/switch "interfaces". A channel's ITU-T C-band
   wavelength is derived from its 100GHz-spaced position in the grid
   (1550.12nm reference, 0.8nm step) — a real DWDM channel-plan convention,
   not a fabricated number.
   ═══════════════════════════════════════════════════════════ */
function nodeHeaderDwdm(N) {
  const r = N.r;
  const stLabel = r.st === 'ok' ? 'Ready' : r.st === 'drift' ? 'Degraded' : r.st === 'stale' ? 'Stale' : r.st === 'miss' ? 'Missing' : N.ready;
  const stTone = stLabel === 'Ready' ? 'success' : stLabel === 'Degraded' || stLabel === 'Stale' ? 'warning' : 'error';
  const macAddr = r.mac || `A4:5E:60:${nint(N.name,62,10,99)}:8F:${nint(N.name,63,10,99)}`;
  const coords = r.lat && r.lon ? `${r.lat},${r.lon}` : '10.368535,77.99631';
  const cells = [
    ['Vendor', r.oem || 'ADVA'], ['OS Version', r.os || 'ONMSi 21.1'], ['Serial Number', r.sn || '—'],
    ['Model', r.model || 'FSP 3000'], ['IP address', r.ip || '—'], ['MAC address', macAddr]
  ];
  return card(`
    <div class="nv-head">
      <div class="nv-thumb" aria-hidden="true" style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:var(--vw-color-violet-50,#f5f3ff);border-radius:10px;padding:6px">
        <span style="color:var(--vw-color-violet-600,#7c3aed)">${nodeThumb('dwdm')}</span>
      </div>
      <div class="stack-x grow" style="min-width:0">
        <div class="row" style="gap:var(--vw-space-sm);align-items:center">
          <span class="vw-card-title" style="font-size:1.25rem;font-weight:600">${N.name}</span>
          ${chip(stLabel, stTone)}${chip('DWDM', 'purple')}
        </div>
        <span class="vw-card-metric-label-sub mono" style="display:inline-flex;align-items:center;gap:4px;color:var(--vw-color-slate-500);margin-top:2px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          ${r.loc || N.name}(${coords})
        </span>
      </div>
    </div>
    <div class="nv-meta" style="grid-template-columns:repeat(6, 1fr);gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0)">${cells.map(([k, v]) => `<div class="stack-x">
      <span class="nv-hk" style="font-size:0.75rem;color:var(--vw-color-slate-500);font-weight:500">${k}</span><span class="nv-mv mono" style="font-size:0.875rem;font-weight:600;color:var(--vw-color-slate-800);margin-top:2px">${v}</span></div>`).join('')}</div>`,
    '', 'padding:var(--vw-space-lg)');
}

function nodeOverviewDwdm(N) {
  const O = N.optical;
  const live = O.chans.filter(c => !c.spare);
  const avgOsnr = (live.reduce((a, c) => a + c.osnr, 0) / live.length).toFixed(1);
  const ampsUp = O.amps.filter(a => a.st === 'Active').length;
  const worstSpan = O.spans.reduce((w, s) => s.loss > w.loss ? s : w, O.spans[0]);
  const tiles = [
    nvTile('Wavelengths In Use', `${O.used}/${O.chans.length}`, `${O.chans.length - O.used} unequipped`, 'purple'),
    nvTile('Avg OSNR', `${avgOsnr} dB`, avgOsnr < 18 ? 'Approaching floor' : 'Healthy margin', avgOsnr < 18 ? 'amber' : 'emerald'),
    nvTile('Amplifiers', `${ampsUp}/${O.amps.length}`, 'Pre-amp · Booster · Raman', ampsUp === O.amps.length ? 'emerald' : 'amber'),
    nvTile('Worst Span Loss', `${worstSpan.loss} dB`, worstSpan.n, worstSpan.loss > worstSpan.budget * 0.85 ? 'red' : 'sky'),
    nvTile('Active Alerts', String(N.ov.alarms), 'Across this element', N.ov.alarms > 5 ? 'red' : 'amber'),
    nvTile('System Uptime', N.ov.uptime, `Last reboot tracked`, 'slate')
  ];
  return card(`
    <div class="nv-tiles">${tiles.join('')}</div>
    <div class="nv-health-row" style="margin-top:var(--vw-space-md)">
      ${nvHealthCard('Optical line health', 'Amplifier & span reachability', [N.ov.health >= 96 ? 'Healthy' : N.ov.health >= 88 ? 'Degraded' : 'Critical', N.ov.health >= 96 ? 'success' : N.ov.health >= 88 ? 'warning' : 'error'],
        [['Line health', `${N.ov.health}%`], ['Wavelengths active', `${O.used}/${O.chans.length}`], ['Avg OSNR', `${avgOsnr} dB`], ['Amplifiers up', `${ampsUp}/${O.amps.length}`]],
        `Last sync: Jun 30, 2026 14:25:00`)}
      ${nvHealthCard('NTP Sync', 'Time Synchronization', ['Synchronized', 'success'],
        [['Offset', `${N.ntp.off} ms`], ['Primary NTP', N.ntp.primary], ['Secondary NTP', N.ntp.secondary], ['Stratum', String(N.ntp.stratum)]],
        `Last Sync: ${N.ntp.sync}`)}
    </div>`);
}

function nodeHardwareDwdm(N) {
  const O = N.optical;
  return `${card(`
    <div class="cx-panel-head row vw-justify-between vw-items-baseline">
      <span class="eyebrow">Wavelength channels</span>
      <span class="vw-card-metric-label-sub">${O.used} of ${O.chans.length} equipped · ITU-T 100GHz grid</span>
    </div>
    ${table([{t:'Channel'},{t:'Wavelength'},{t:'Service'},{t:'Status'},{t:'TX power',r:true},{t:'RX power',r:true},{t:'OSNR',r:true},{t:'BER',r:true},{t:'Rate'}],
      O.chans.map(c => [
        `<span class="mono">${c.ch}</span>`,
        `<span class="mono">${c.lambda} nm</span>`,
        c.spare ? `<span style="color:${cv('gray',400)}">—</span>` : c.svc,
        chip(c.st, c.st === 'Active' ? 'success' : c.st === 'Warning' ? 'warning' : c.st === 'Degraded' ? 'error' : 'neutral'),
        c.tx == null ? `<span style="color:${cv('gray',400)}">—</span>` : `<span class="mono">${c.tx} dBm</span>`,
        c.rx == null ? `<span style="color:${cv('gray',400)}">—</span>` : `<span class="mono">${c.rx} dBm</span>`,
        c.osnr == null ? `<span style="color:${cv('gray',400)}">—</span>` : `<span class="mono"${c.osnr < 15 ? ` style="color:${cv('red',700)}"` : ''}>${c.osnr} dB</span>`,
        c.ber == null ? `<span style="color:${cv('gray',400)}">—</span>` : `<span class="mono">${c.ber}</span>`,
        c.rate || `<span style="color:${cv('gray',400)}">—</span>`
      ]), '', () => [])}`)}
    <div class="vw-grid vw-grid-cols-2 vw-gap-md" style="margin-top:var(--vw-space-md)">
      ${card(`
        <div class="cx-panel-head"><span class="eyebrow">Amplifiers</span></div>
        ${table([{t:'Stage'},{t:'Gain',r:true},{t:'Tilt',r:true},{t:'Status'}],
          O.amps.map(a => [a.n, `<span class="mono">${a.gain} dB</span>`, `<span class="mono">${a.tilt} dB</span>`,
            chip(a.st, a.st === 'Active' ? 'success' : 'warning')]), '', () => [])}`)}
      ${card(`
        <div class="cx-panel-head"><span class="eyebrow">Fiber spans</span></div>
        ${table([{t:'Span'},{t:'Distance',r:true},{t:'Loss',r:true},{t:'Budget',r:true},{t:'PMD',r:true}],
          O.spans.map(sp => [sp.n, `<span class="mono">${sp.km} km</span>`,
            `<span class="mono"${sp.loss > sp.budget * 0.85 ? ` style="color:${cv('red',700)}"` : ''}>${sp.loss} dB</span>`,
            `<span class="mono">${sp.budget} dB</span>`, `<span class="mono">${sp.pmd} ps</span>`]), '', () => [])}`)}
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   eNodeB — this class has no assurance feed (NODE_CLASS.enodeb.live is
   false: no collector polls it for CPU/interface/alarm data), so unlike
   Router/Switch/DWDM there is no live dashboard to build honestly. What
   IS real is the inventory record itself; this renders that as grouped
   identity/location/hardware fields — reusing the same detailField/
   detailSection helpers the Virtual Resources screens use — rather than
   the bare paragraph the generic fallback showed before.
   ═══════════════════════════════════════════════════════════ */
function nodeHeaderEnodeb(N) {
  const r = N.r;
  /* the reconciliation status (RSTATE) is the one real status this record
     carries — N.ready would read as "Ready"/"Degraded" from the seeded
     health score computed for the live-assurance dashboard, which is
     exactly the fabricated data this class's page says it won't show */
  const [stLabel, stTone] = RSTATE[r.st] || RSTATE.none;
  const coords = r.lat && r.lon ? `${r.lat},${r.lon}` : '';
  return card(`
    <div class="nv-head">
      <div class="nv-thumb" aria-hidden="true" style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:var(--vw-color-emerald-50,#ecfdf5);border-radius:10px;padding:6px">
        <span style="color:var(--vw-color-emerald-600,#059669)">${nodeThumb('enodeb')}</span>
      </div>
      <div class="stack-x grow" style="min-width:0">
        <div class="row" style="gap:var(--vw-space-sm);align-items:center">
          <span class="vw-card-title" style="font-size:1.25rem;font-weight:600">${N.name}</span>
          ${chip(stLabel, stTone)}${chip('eNodeB', 'success')}
        </div>
        <span class="vw-card-metric-label-sub mono" style="display:inline-flex;align-items:center;gap:4px;color:var(--vw-color-slate-500);margin-top:2px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          ${r.loc || N.name}${coords ? `(${coords})` : ''}
        </span>
      </div>
    </div>`,
    '', 'padding:var(--vw-space-lg)');
}
function nodeInventoryEnodeb(N) {
  const r = N.r;
  const sections = [
    { title: 'Identity', fields: [['Name', N.name], ['Status', (RSTATE[r.st] || RSTATE.none)[0]], ['Stock state', r.stock || '-']] },
    { title: 'Location', fields: [['Site', r.loc || '-'], ['Latitude', r.lat || '-'], ['Longitude', r.lon || '-']] },
    { title: 'Hardware', fields: [['Vendor', r.oem || '-'], ['Model', r.model || '-'], ['OS version', r.os || '-'], ['Serial number', r.sn || '-'], ['IP address', r.ip || '-']] }
  ];
  return renderSectionedGrid(sections.map(s => ({ title: s.title, fields: s.fields })));
}

/* ═══════════════════════════════════════════════════════════
   DISPATCHERS — one lookup keyed by the node's real class (N.cls, sourced
   from which PHY[] bucket the record was found in — see nodeRecord() —
   never guessed from the node's name), not a chain of per-call ternaries.
   DWDM has its own header/overview/hardware; Links/Services/Alerts are
   already class-agnostic (their data — protoRows, service instances,
   alarms — is computed the same way for every class in nodeOf()), so DWDM
   reuses the Router versions rather than duplicating them for no reason.
   eNodeB never reaches these — see the !N.live branch in viewNode(). Any
   class this map doesn't name falls back to Router's view instead of
   breaking the page.
   ═══════════════════════════════════════════════════════════ */
const NODE_VIEW = {
  router: { header: nodeHeaderRouter, overview: nodeOverviewRouter, hardware: nodeHardwareRouter, links: nodeLinksRouter, services: nodeServicesRouter, alerts: nodeAlertsRouter },
  switch: { header: nodeHeaderSwitch, overview: nodeOverviewSwitch, hardware: nodeHardwareSwitch, links: nodeLinksSwitch, services: nodeServicesSwitch, alerts: nodeAlertsSwitch },
  dwdm:   { header: nodeHeaderDwdm,   overview: nodeOverviewDwdm,   hardware: nodeHardwareDwdm,   links: nodeLinksRouter, services: null,              alerts: nodeAlertsRouter }
};
const nodeViewFor = cls => NODE_VIEW[cls] || NODE_VIEW.router;

function nodeHeader(N)   { return nodeViewFor(N.cls).header(N); }
function nodeOverview(N) { return nodeViewFor(N.cls).overview(N); }
function nodeHardware(N) { return nodeViewFor(N.cls).hardware(N); }
function nodeLinks(N)    { return nodeViewFor(N.cls).links(N); }
function nodeServices(N) { return nodeViewFor(N.cls).services ? nodeViewFor(N.cls).services(N) : nodeServicesRouter(N); }
function nodeAlerts(N)   { return nodeViewFor(N.cls).alerts(N); }

let NODE_TAB = 'overview';

/* per-class tab list — DWDM has no network-services concept (L2VPN/L3VPN
   provisioning doesn't apply to optical transport), so it gets 4 tabs
   instead of 5 rather than a tab with nothing meaningful behind it */
const NODE_TABS = {
  router: [['overview','Overview'],['hardware','Hardware & interfaces'],['links','Links'],['services','Network services'],['alerts','Alerts & diagnostics']],
  switch: [['overview','Overview'],['hardware','Hardware & interfaces'],['links','Links'],['services','Network services'],['alerts','Alerts & diagnostics']],
  dwdm:   [['overview','Overview'],['hardware','Optical'],['links','Links'],['alerts','Alerts & diagnostics']]
};

function viewNode() {
  const N = nodeOf(NODE_ID);
  if (!N.live) {
    /* the only NODE_VIEW_CLASSES member with no assurance feed today is
       eNodeB — this stays honest about that (nothing below is fabricated
       to fill a dashboard the platform has no data for) while still
       showing everything the inventory record actually has, grouped
       instead of dumped flat */
    return `<div class="page">
      ${pageHead(`${nodeViewLabel(N.cls)} · ${N.name}`, `${N.meta.n} · ${N.r.ip} · ${N.r.loc}`)}
      ${drillBar()}
      ${N.cls === 'enodeb' ? nodeHeaderEnodeb(N) : nodeHeader(N)}
      ${N.cls === 'enodeb' ? nodeInventoryEnodeb(N) : ''}
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

  const tabs = NODE_TABS[N.cls] || NODE_TABS.router;
  const activeTab = tabs.some(([k]) => k === (NODE_TAB || '').toLowerCase()) ? NODE_TAB.toLowerCase() : 'overview';

  let tabContent = '';
  if (activeTab === 'hardware') {
    /* nodeVlans() self-guards on N.vlans, so it only ever renders for a
       class the sample data actually gives VLANs to (switch) */
    tabContent = `${nodeHardware(N)}${nodeVlans(N)}`;
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
    ${pageHead(`${nodeViewLabel(N.cls)} · ${N.name}`, `${N.meta.n} · ${N.r.ip} · ${N.r.loc} · live assurance view`)}
    ${drillBar()}
    ${nodeHeader(N)}

    <div class="tabbar" style="margin-top:var(--vw-space-sm);margin-bottom:var(--vw-space-md)">
      ${tabs.map(([k, l]) => `<button class="tab${activeTab === k ? ' is-on' : ''}" data-nodetab="${k}">${l}</button>`).join('')}
    </div>

    ${tabContent}
  </div>`;
}

