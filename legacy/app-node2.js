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
function nodeHeader(N) {
  const r = N.r, sw = N.cls === 'switch';
  const cells = [
    ['Vendor', r.oem], ['OS version', r.os], ['Serial number', r.sn],
    [sw ? 'POP ID' : 'Rack location', sw ? `POP-${r.loc}` : `Rack A · U${nint(N.name, 60, 10, 44)}-${nint(N.name, 61, 45, 48)}`],
    ['Model', r.model], ['IP address', r.ip],
    ['MAC address', `A4:5E:60:${nint(N.name,62,10,99)}:8F:${nint(N.name,63,10,99)}`]
  ];
  return card(`
    <div class="nv-head">
      <div class="nv-thumb" aria-hidden="true">
        ${nodeThumb(N.cls)}
      </div>
      <div class="stack-x grow" style="min-width:0">
        <div class="row" style="gap:var(--vw-space-sm)">
          <span class="vw-card-title">${N.name}</span>
          ${chip(N.ready, N.ready === 'Ready' ? 'success' : 'warning')}
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

function nodeOverview(N) {
  const sw = N.cls === 'switch';
  const tiles = [
    nvTile('Device health', `${N.ov.health}%`, `CPU ${N.perf.cpu}% · Mem ${N.perf.mem}% · ${N.perf.temp}°C`, 'emerald'),
    nvTile('Physical links', n(N.ov.proto), `LLDP · OSPF · BGP · ISIS`, 'sky'),
    ...(sw ? [nvTile('In ARP', n(N.ov.arp), 'MAC addresses learned', 'cyan')] : []),
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

function nodeAvailability(N) {
  const pct = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  return card(`
    ${headSm('24-hour service availability')}
    <div style="margin-top:var(--vw-space-md)">
      ${nvStrip(N.avail.icmp, 'ICMP health', pct(N.avail.icmp))}
      ${nvStrip(N.avail.ntp, 'NTP sync', pct(N.avail.ntp))}
    </div>
    <div class="vw-card-footer-divider row vw-justify-between">
      <span class="vw-card-description">Green is a clean hour; amber and red are degraded probes. Hover a cell for the hour and its score.</span>
      <span class="vw-card-metric-label-sub">Last 24 hours · updated 1 min ago</span>
    </div>`);
}

function nodeHardware(N) {
  const sw = N.cls === 'switch';
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

  const envCard = `<div class="vw-grid vw-grid-cols-3 vw-gap-md" style="margin-top:var(--vw-space-md)">
    ${[['Power supplies', `${N.env.psu[0]} / ${N.env.psu[1]}`, 'Healthy · redundant', 'sky'],
       ['Fans', `${N.env.fans[0]} / ${N.env.fans[1]}`, `Healthy · avg ${n(N.env.rpm)} RPM`, 'purple'],
       ['Temperature sensors', 'Normal', `Inlet ${N.env.tin}°C · ASIC ${N.env.tmax}°C · outlet ${N.env.tmin}°C`, 'emerald']]
      .map(([k, v, s, t]) => `<div class="vw-card-child nv-env" style="--nt:${cv(t,400)};--ntb:${cv(t,50)}">
        <span class="nv-hk">${k}</span><span class="nv-env-v num">${v}</span>
        <span class="vw-card-metric-label-sub">${s}</span></div>`).join('')}
  </div>`;

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
      <span class="vw-card-description">Real-time bandwidth usage · last 24 hours</span>
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
        <span class="vw-card-description">Gain tilt held within ±1.2 dB across the band.</span>
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
        <span class="vw-card-description">${N.optical.spans.map(sp => `${sp.n.split(' → ')[0]} ${sp.km} km, PMD ${sp.pmd} ps`).join(' · ')}.</span>
      </div>
    </div>` : '';

  return `
    ${card(`${headSm('Hardware & interfaces')}`, '', 'padding:var(--vw-space-md) var(--vw-space-lg)')}
    <div class="row-t nv-hw" style="align-items:stretch">
      ${perfCard}
      ${aiHw}
    </div>
    ${card(`
      ${N.meta.hw === 'optical' ? opticalBlock
        : sw ? `${envCard}<div class="nv-portsplit" style="margin-top:var(--vw-space-lg)">${portLayout}${utilList}</div>`
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

function nodeVlans(N) {
  if (!N.vlans) return '';
  const tot = N.vlans.reduce((a, v) => a + v.mac, 0);
  const big = N.vlans.reduce((a, v) => a.mac > v.mac ? a : v);
  const hi  = N.vlans.reduce((a, v) => a.pct > v.pct ? a : v);
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
    <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
      <span class="vw-card-description">Largest VLAN is <strong>${big.n} (${big.id})</strong> with ${n(big.mac)} learned MACs.
        Highest utilisation is <strong>${hi.n} (${hi.id})</strong> at ${hi.pct}%.</span>
      <span class="vw-card-metric-label-sub num">${n(tot)} MAC addresses learned</span>
    </div>`);
}

function nodeLinks(N) {
  /* the protocol selected here drives the capacity dashboard below it, on
     this same page — it never navigates, so it's a plain in-page selection
     like NODE_SVC_TAB, not a drill */
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
        <span class="vw-card-description">Forecast is a straight-line projection of the last six months of
          inbound utilisation on ${sel.k} links. It crosses the 90% engineering threshold in
          <strong>${(N.capRows[N.protoRows.findIndex(p => p.k === sel.k)] || N.capRows[0]).fc}</strong>.</span>
      </div>

      <div class="cx-panel">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">Link capacity dashboard</span>
          ${chip(`${sel.k} protocol`, 'info')}
          <span class="vw-card-metric-label-sub">${sel.a} active · ${sel.d} down · ${sel.i} init</span>
          <span class="grow"></span>
          <span class="vw-card-description">${N.capRows.filter(r => r.util > 70).length} links in countdown to capacity</span>
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

function nodeServices(N) {
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

function nodeAlerts(N) {
  const SEV = { Critical:'error', Major:'warning', Minor:'orange', Warning:'neutral' };
  return card(`
    <div class="row vw-justify-between vw-items-start vw-wrap" style="gap:var(--vw-space-md)">
      ${headSm('Alerts & diagnostics')}
      <div class="tabbar" style="margin:0">
        ${[['alerts','Alerts',N.alarmsList.length],['incidents','Incidents',2]].map(([k, l]) =>
          `<button class="tab${NODE_ALERT_TAB===k?' is-on':''}" data-nalert="${k}">${l}</button>`).join('')}
      </div>
    </div>

    <div class="nv-svc-split" style="margin-top:var(--vw-space-md)">
      <div class="cx-panel grow">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">${NODE_ALERT_TAB === 'alerts' ? 'Active alerts and events' : 'Open incidents'}</span>
          <span class="vw-card-metric-label-sub">Real-time monitoring across all network resources</span>
        </div>
        ${NODE_ALERT_TAB === 'alerts' ? `
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

function viewNode() {
  const N = nodeOf(NODE_ID);
  if (!N.live) {
    return `<div class="page">
      ${pageHead(`Node view · ${N.name}`, `${N.meta.n} · ${N.r.ip} · ${N.r.loc}`,
        `<button class="nst-btn nst-btn--sm" data-nav="physical">Back to list</button>`)}
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
  return `<div class="page">
    ${pageHead(`Node view · ${N.name}`, `${N.meta.n} · ${N.r.ip} · ${N.r.loc} · live assurance view`,
      `<button class="nst-btn nst-btn--sm" data-site="${N.r.loc}">Back to site</button>`)}
    ${drillBar()}
    ${nodeHeader(N)}
    ${nodeOverview(N)}
    ${nodeAvailability(N)}
    ${nodeHardware(N)}
    ${nodeVlans(N)}
    ${nodeLinks(N)}
    ${nodeServices(N)}
    ${nodeAlerts(N)}
  </div>`;
}
