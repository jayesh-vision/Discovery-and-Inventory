/* ═══ Resource detail ═══ */
let RES_ID = 'NDLS-J960-P_R1-T1-NR', RES_TAB = 'overview', IF_FILTER = 'all', NBR_TAB = 'lldp', RES_HIST_FILTER = 'All';
const RES_TABS = [
  { k:'overview',  n:'Overview' },   { k:'hardware', n:'Hardware',  c:()=>HW_TREE.length },
  { k:'ifaces',    n:'Interfaces', c:()=>IF_CAP.total },
  { k:'nbrs',      n:'Neighbours', c:()=>NBR_TABS.reduce((a,t)=>a+t.c,0) },
  { k:'svcs',      n:'Services',   c:()=>RES_SERVICES.length },
  { k:'alarms',    n:'Alarms',     c:()=>RES_ALARMS.length },
  { k:'config',    n:'Configuration' }, { k:'history', n:'History', c:()=>RES_HISTORY.length }
];
const HW_ST = { ok:['Online','success'], warn:['Degrading','warning'], fail:['Failed','error'], empty:['Empty','neutral'] };
const HW_ICON = { chassis:'▤', re:'◧', fpc:'▥', pic:'▦', port:'▪', pem:'⏻', fan:'❋' };

function resOverview() {
  const svcDown = RES_SERVICES.filter(s => s.st === 'Down').length;
  return `
  <div class="row-t" style="align-items:stretch">
    ${card(`${headSm('Identity and provenance')}
      <div style="margin-top:var(--vw-space-md)">
      ${table([{t:'Field'},{t:'Value'},{t:'Source'},{t:'Verified'}], PROV.map(p => [
        `<span class="vw-label">${p.f}</span>`,
        `<span class="vw-value mono"${p.ok?'':` style="color:${cv('gray',400)}"`}>${p.v}</span>`,
        chip(p.src, p.src.startsWith('Derived')?'cyan':p.src.includes('collector')?'success'
          :p.src.startsWith('Workorder')?'purple':p.src.startsWith('Manual')?'neutral'
          :p.src.startsWith('Scope')?'info':'error'), p.when]), '',
        i => [CP('Copy value', PROV[i].v)])}
      </div>`, 'grow')}
    <div class="stack" style="width:min(400px,100%);flex-shrink:0">
      ${card(`${headSm('Support position')}
        <div class="stack-s" style="margin-top:var(--vw-space-md)">
          ${[['End of sale','30-Jun-2025','past','red'],['End of support','31-Dec-2028','2 y 4 mo away','amber'],
             ['Warranty / AMC','31-Mar-2027','7 mo away','amber'],['Purchased','12-Mar-2024','PO-2024-1188','slate']]
            .map(([k,v,s,t])=>`<div class="cx-row" style="grid-template-columns:8rem 1fr auto">
              <span class="vw-label">${k}</span><span class="vw-value mono">${v}</span>
              ${chip(s, t==='red'?'error':t==='amber'?'warning':'neutral')}</div>`).join('')}
        </div>`)}
      ${card(`${headSm('Impact if this element fails')}
        <div class="stack-s" style="margin-top:var(--vw-space-md)">
          ${[['Directly attached elements','19','LLDP neighbours','sky'],
             ['Downstream sites isolated','3','no alternate path','red'],
             ['Services carried','16','4 currently down','amber'],
             ['Customers affected','11','2 premium SLA','purple']]
            .map(([k,v,s,t])=>`<div class="cx-row" style="grid-template-columns:1fr auto 8rem">
              <span class="vw-label">${k}</span>
              <span class="vw-value num" style="font-weight:500;color:${cv(t,700)}">${v}</span>
              <span class="vw-card-metric-label-sub t-right">${s}</span></div>`).join('')}
        </div>`)}
    </div>
  </div>`;
}

function resHardware() {
  return card(`
    <div class="row vw-justify-between vw-items-start vw-wrap" style="margin-bottom:var(--vw-space-md)">
      ${headSm('Hardware')}
      <div class="chip-row">${chip('1 failed','error')}${chip('1 degrading','warning')}${chip('1 slot free','info')}</div>
    </div>
    ${table([{t:'Component'},{t:'Part number'},{t:'Serial number'},{t:'State'},{t:'Detail'}],
      HW_TREE.map(h => [
        `<span class="hw-node" style="padding-left:${h.d*1.25}rem">
           <span class="hw-ic">${HW_ICON[h.k]}</span><span class="vw-value">${h.n}</span></span>`,
        `<span class="mono">${h.pid}</span>`, `<span class="mono">${h.sn}</span>`,
        chip(HW_ST[h.st][0], HW_ST[h.st][1]),
        `<span class="vw-card-description">${h.info}</span>`]), '',
        i => [CP('Copy part number', HW_TREE[i].pid), CP('Copy serial number', HW_TREE[i].sn)])}`);
}

function resIfaces() {
  const rows = gridApply('interfaces', IFACES.filter(i => IF_FILTER === 'all' ? true
    : IF_FILTER === 'down' ? (i.oper === 'down' && i.admin === 'up')
    : IF_FILTER === 'free' ? i.admin === 'down' : i.oper === 'up'));
  const st = i => i.admin === 'down' ? chip('Free','neutral')
    : i.oper === 'down' ? chip('Down','error') : chip('Up','success');
  const pct = (a,b) => (a/b*100).toFixed(0);
  return `
  ${card(`
    <div class="row vw-justify-between vw-items-start vw-wrap" style="margin-bottom:var(--vw-space-lg)">
      ${headSm('Port capacity')}
      ${chip(IF_CAP.forecast, 'warning')}
    </div>
    <div class="cx-util">
      <div class="row vw-justify-between vw-items-baseline" style="margin-bottom:6px">
        <span class="eyebrow">Physical ports</span>
        <span class="vw-card-metric-label-sub num">${IF_CAP.up} of ${IF_CAP.total} in use</span>
      </div>
      <div class="cx-util-track">
        <span class="cx-util-fill" style="width:${pct(IF_CAP.up,IF_CAP.total)}%;background:${cv('emerald',400)}"></span>
        <span class="cx-util-fill" style="width:${pct(IF_CAP.operDown,IF_CAP.total)}%;background:${cv('red',400)}"></span>
      </div>
      <div class="legend" style="margin-top:6px">
        <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',400)}"></span>up ${IF_CAP.up}</span>
        <span class="legend-i"><span class="legend-sw" style="background:${cv('red',400)}"></span>down ${IF_CAP.operDown}</span>
        <span class="legend-i"><span class="legend-sw" style="background:var(--vw-color-slate-100);border:1px solid var(--vw-color-slate-300)"></span>free ${IF_CAP.adminDown - IF_CAP.operDown}</span>
      </div>
    </div>
    <div class="stat-strip" style="margin-top:var(--vw-space-lg)">
      ${[['Optical ports','16','9 used · 7 free','cyan'],['10G free','5','across FPC 0 and 1','emerald'],
         ['40G free','2','PIC 0/1','sky'],['Slot headroom','1','FPC 2 empty · +10 ports','purple'],
         ['Exhaustion','4 mo','at current fill rate','amber']]
        .map(([k,v,s,t])=>`<div class="stat-cell"><span class="stat-dot" style="background:${cv(t,400)}"></span>
          <span class="stat-k">${k}</span><span class="stat-v num">${v}</span><span class="stat-s">${s}</span></div>`).join('')}
    </div>`)}

  ${card(`
    <div class="grid-bar">
      <span class="vw-card-description grid-count">Showing ${rows.length} of ${IF_CAP.total}</span>
      <span class="nst-input-shell grid-search"><span class="gs-ic">${IC_SEARCH}</span>
        <input class="nst-input" placeholder="Name, description, IP" aria-label="Search interfaces"
          data-gridsearch="interfaces" value="${esc(gridOf('interfaces').search)}"></span>
      <span class="grow"></span>
      <div class="seg">
        ${[['all','All'],['up','Up'],['down','Down'],['free','Free']].map(([k,n2])=>
          `<button class="${IF_FILTER===k?'is-on':''}" data-iffilter="${k}">${n2}</button>`).join('')}
      </div>
    </div>
    ${rows.length ? table([{t:'Status'},{t:'Interface'},{t:'Description'},{t:'Speed'},{t:'IP / VLAN'},
             {t:'Utilisation',r:true},{t:'Optical Rx'},{t:'Neighbour'},{t:'Last change'}],
      rows.map(i => [
        st(i), `<span class="vw-value mono">${i.n}</span>`,
        i.desc === '—' ? `<span style="color:${cv('gray',400)}">unlabelled</span>` : i.desc,
        i.sp, `<span class="mono">${i.ip !== '—' ? i.ip : 'VLAN ' + i.vlan}</span>`,
        i.util ? `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="hbar-track" style="width:3rem;height:7px">
          <span class="hbar-fill" style="display:block;width:${i.util}%;background:${cv(i.util>70?'amber':'emerald',400)}"></span></span>${i.util}%</span>` : '—',
        i.rx === '—' ? '—' : `<span class="mono"${(parseFloat(i.rx) < -9 || i.rx === 'no signal') ? ' style="color:' + cv('red',700) + '"' : ''}>${i.rx}${i.rx==='no signal'?'':' dBm'}</span>`,
        i.nb === '—' ? `<span style="color:${cv('gray',400)}">—</span>` : `<span class="vw-card-metric-label-sub">${i.nb}</span>`,
        i.chg]))
      : `<div class="vw-card-child-shaded vw-card-description" style="padding:var(--vw-space-lg);text-align:center">No interfaces match this filter.</div>`}`)}`;
}

function resNbrs() {
  const rows = NBRS[NBR_TAB] || [];
  const lst = { ok:['Confirmed','success'], new:['New this cycle','info'], gone:['No longer seen','error'] };
  return card(`
    <div class="tabbar">${NBR_TABS.map(t=>`<button class="tab${t.k===NBR_TAB?' is-on':''}" data-nbrtab="${t.k}">${t.n}</button>`).join('')}</div>
    <div class="nst-table-toolbar row vw-justify-between" style="margin:var(--vw-space-md) 0">
      <span class="vw-card-description">Showing ${rows.length} of ${NBR_TABS.find(t=>t.k===NBR_TAB).c}</span>
      <div class="row">${chip('1 new','info')}${chip('1 no longer seen','error')}</div>
    </div>
    ${rows.length ? table([{t:'State'},{t:NBR_TAB==='lldp'?'Local port':'Local'},{t:'Remote element'},
             {t:NBR_TAB==='lldp'?'Remote port':'Session'},{t:'Remote IP'},{t:'Last seen'}],
      rows.map(r => [chip(lst[r.st][0], lst[r.st][1]), `<span class="mono">${r.local}</span>`,
        `<span class="vw-value">${r.remote}</span>`, `<span class="mono">${r.rport}</span>`,
        `<span class="mono">${r.rip}</span>`, r.seen]))
      : `<div class="vw-card-child-shaded vw-card-description" style="padding:var(--vw-space-lg);text-align:center">
           No ${NBR_TAB.toUpperCase()} adjacency on this element.</div>`}`);
}

function resSvcs() {
  return card(`
    <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
      ${headSm('Services')}
      <div class="chip-row">${chip('4 L3VPN','info')}${chip('1 L2VPN','cyan')}${chip('2 down','error')}</div>
    </div>
    ${table([{t:'Status'},{t:'Type'},{t:'Service name'},{t:'VRF — RD'},{t:'Attachment interface'},{t:'ERP number'},{t:'Customer'}],
      RES_SERVICES.map(s => [chip(s.st, s.chip), chip(s.t, s.t==='L3VPN'?'info':'cyan'),
        `<span class="vw-value">${s.name}</span>`, `<span class="mono">${s.rd}</span>`,
        `<span class="mono">${s.ifc}</span>`, s.erp, s.cust]), '',
        i => [CP('Copy ERP number', RES_SERVICES[i].erp)])}`);
}

function resAlarms() {
  return card(`
    <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
      ${headSm('Alarms')}
      <div class="chip-row">${chip('1 critical','error')}${chip('2 major','warning')}${chip('2 minor','info')}${chip('2 unacked','error')}</div>
    </div>
    ${table([{t:'Severity'},{t:'Alarm'},{t:'Source component'},{t:'Raised'},{t:'Age',r:true},{t:'Acknowledged'}],
      RES_ALARMS.map(a => [chip(a.sev, a.chip), `<span class="vw-value">${a.n}</span>`,
        `<span class="mono">${a.src}</span>`, `<span class="num">${a.raised}</span>`, a.age,
        a.ack === 'Unacked' ? `<span style="color:${cv('red',700)}">${a.ack}</span>` : a.ack]), '',
        () => [])}`);
}

function resConfig() {
  const c = RES_CONFIG;
  return `
  <div class="row-t" style="align-items:stretch">
    ${card(`${headSm('Configuration drift')}
      <div style="margin-top:var(--vw-space-md)">
        ${table([{t:'Path'},{t:'Template expects'},{t:'Device has'},{t:'Severity'}],
          c.drift.map(d => [`<span class="mono">${d.p}</span>`,
            `<span class="mono" style="color:${cv('emerald',700)}">${d.want}</span>`,
            `<span class="mono" style="color:${cv('red',700)}">${d.got}</span>`,
            chip(d.sev, d.sev === 'Major' ? 'warning' : 'info')]), '',
        i => [CP('Copy expected value', c.drift[i].want)])}
        </div>
      </div>
      <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
        <span class="vw-card-description">Last backup ${c.lastBackup} · ${c.backupSize}.</span>
      </div>`, 'grow')}
  </div>`;
}

function resHistory() {
  const histTest = { All: () => true, Discovery: h => h.src.includes('collector'),
    Manual: h => h.src.startsWith('Manual'), Workorder: h => h.src.startsWith('Workorder') };
  const hist = RES_HISTORY.filter(histTest[RES_HIST_FILTER] || histTest.All);
  return card(`
    <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
      ${headSm('History')}
      <div class="seg">${['All', 'Discovery', 'Manual', 'Workorder'].map(k =>
        `<button class="${RES_HIST_FILTER === k ? 'is-on' : ''}" data-histfilter="${k}">${k}</button>`).join('')}</div>
    </div>
    ${table([{t:'When'},{t:'Changed by'},{t:'Field'},{t:'From'},{t:'To'},{t:'Source'}],
      hist.map(h => [`<span class="num">${h.at}</span>`,
        h.who === 'discovery' || h.who === 'fault mgmt' || h.who === 'CIQ import'
          ? `<span class="mono" style="color:${cv('gray',500)}">${h.who}</span>` : `<span class="vw-value">${h.who}</span>`,
        h.f, `<span class="mono" style="color:${cv('gray',500)}">${h.from}</span>`,
        `<span class="mono">${h.to}</span>`,
        chip(h.src, h.src.includes('collector')?'success':h.src.startsWith('Manual')?'neutral'
          :h.src.startsWith('Workorder')?'purple':h.src.startsWith('Fault')?'warning':'info')]), '',
        () => [])}`);
}

function viewResource() {
  const r = PHY.router.find(x => x.name === RES_ID) || PHY.router[0];
  const body = { overview:resOverview, hardware:resHardware, ifaces:resIfaces, nbrs:resNbrs,
                 svcs:resSvcs, alarms:resAlarms, config:resConfig, history:resHistory }[RES_TAB]();
  return `<div class="page">
    ${pageHead(r.name, `Router · ${r.model} · ${r.oem} · ${r.loc}`,
      `<button class="nst-btn nst-btn--sm" data-nav="physical">Back to list</button>
       <button class="nst-btn nst-btn--sm" data-site="BGLK-277">Site</button>`)}

    ${card(`<div class="meta-bar">
      <div class="chip-row">${rst(r.st)}${chip('Active · Physical','neutral')}${chip('Deployed','success')}
        ${chip('Past end of sale','error')}</div>
      <span class="meta-summary mono">${r.ip} · ${r.sn} · ${r.os} · rack ${r.rack || 'A · U42-43'}</span>
    </div>`, '', 'padding:var(--vw-space-md) var(--vw-space-lg)')}

    ${statStrip([
      { k:'Ports used',      v:`${IF_CAP.up} / ${IF_CAP.total}`, s:`${IF_CAP.adminDown - IF_CAP.operDown} free · 4 mo headroom`, t:'sky' },
      { k:'Components',      v:'51', s:'1 failed · 1 degrading', t:'amber' },
      { k:'Adjacencies',     v:'35', s:'LLDP 19 · OSPF 12 · BGP 4', t:'purple' },
      { k:'Services',        v:'16', s:'4 currently down', t:'emerald' },
      { k:'Open alarms',     v:'5',  s:'1 critical · 2 unacked', t:'red' }
    ])}

    <div class="section-tabs">${RES_TABS.map(t=>`<button class="stab${t.k===RES_TAB?' is-on':''}" data-restab="${t.k}">${t.n}</button>`).join('')}</div>

    ${body}
  </div>`;
}

/* ═══ Passive infrastructure ═══ */
let PASS_TAB = 'fiber';
function rackStrip(r) {
  const cells = [];
  for (let u = r.h; u >= 1; u--) {
    const occ = r.occ.find(o => u >= o[0] && u <= o[1]);
    const tone = occ ? (occ[3]==='rtr'?'sky':occ[3]==='sw'?'emerald':'purple') : null;
    cells.push(`<span class="ru${occ?' is-occ':''}" title="U${u}${occ?' · '+occ[2]:' · free'}"
      style="${occ?`background:${cv(tone,300)}`:''}"></span>`);
  }
  return `<div class="rack-el">${cells.join('')}</div>`;
}
function viewPassive() {
  const t = PASS_TAB, meta = PASSIVE_TABS.find(x => x.k === t), rows = gridApply('passive', PASSIVE[t] || []);
  const P = PASSIVE_STATS;
  const cols = { fiber:[{t:'Status'},{t:'Span'},{t:'A end'},{t:'B end'},{t:'Length',r:true},{t:'Cores used'},{t:'Splices',r:true},{t:'Last OTDR'},{t:'Attenuation'},{t:'Ownership'}],
                 odf:[{t:'Status'},{t:'ODF'},{t:'Site'},{t:'Type'},{t:'Capacity',r:true},{t:'Used',r:true},{t:'Free',r:true},{t:'Fill'},{t:'Rack position'},{t:'Termination'}],
                 rack:[{t:'Status'},{t:'Rack'},{t:'Site'},{t:'Height',r:true},{t:'U used',r:true},{t:'U free',r:true},{t:'Elevation'},{t:'Power'},{t:'Cooling'}],
                 power:[{t:'Status'},{t:'Unit'},{t:'Site'},{t:'Type'},{t:'Rating'},{t:'Autonomy'},{t:'Last tested'},{t:'Vendor'}],
                 splice:[{t:'Status'},{t:'Closure'},{t:'Site'},{t:'On span'},{t:'Type'},{t:'Fibers spliced'},{t:'Mean splice loss'},{t:'Housing'},{t:'Last surveyed'}],
                 cord:[{t:'Status'},{t:'Patch cord'},{t:'Site'},{t:'A end'},{t:'B end'},{t:'Connector'},{t:'Length',r:true},{t:'Insertion loss'},{t:'Last surveyed'}],
                 duct:[{t:'Status'},{t:'Duct'},{t:'A end'},{t:'B end'},{t:'Length',r:true},{t:'Ways used'},{t:'Bore'},{t:'Ownership'},{t:'Last surveyed'}] }[t];
  const cell = r => t === 'fiber'
    ? [chip(r.st,r.chip), `<span class="vw-value">${r.n}</span>`, `<span class="mono">${r.a}</span>`, `<span class="mono">${r.b}</span>`,
       `<span class="num">${r.len}</span>`, `<span class="mono">${r.cores}</span>`, r.splices, r.otdr,
       r.att === '—' ? '—' : `<span class="mono"${parseFloat(r.att) > 0.35 ? ` style="color:${cv('red',700)}"` : ''}>${r.att}</span>`,
       chip(r.own, r.own === 'Own' ? 'neutral' : 'info')]
    : t === 'odf'
    ? [chip(r.st,r.chip), `<span class="vw-value">${r.n}</span>`, `<span class="mono">${r.site}</span>`, r.type,
       r.cap, r.used, r.cap - r.used,
       `<span class="row vw-gap-sm vw-nowrap"><span class="hbar-track" style="width:3.5rem;height:8px">
         <span class="hbar-fill" style="display:block;width:${(r.used/r.cap*100).toFixed(0)}%;background:${cv(r.used/r.cap>0.85?'red':r.used/r.cap>0.7?'amber':'emerald',400)}"></span></span>
         ${(r.used/r.cap*100).toFixed(0)}%</span>`,
       `<span class="mono">${r.rack}</span>`, r.term]
    : t === 'rack'
    ? [chip(r.st,r.chip), `<span class="vw-value">${r.n}</span>`, `<span class="mono">${r.site}</span>`,
       `${r.h}U`, r.used, r.h - r.used, rackStrip(r), `<span class="mono">${r.kw}</span>`, r.cool]
    : t === 'power'
    ? [chip(r.st,r.chip), `<span class="vw-value">${r.n}</span>`, `<span class="mono">${r.site}</span>`,
       chip(r.type, r.type==='DG set'?'warning':r.type==='Battery'?'purple':'info'), `<span class="mono">${r.rating}</span>`,
       r.runtime, `<span class="num">${r.tested}</span>`, r.vendor]
    : t === 'splice'
    ? [chip(r.st,r.chip), `<span class="vw-value">${r.n}</span>`, `<span class="mono">${r.site}</span>`,
       `<span class="mono">${r.span}</span>`, r.type, `<span class="mono">${r.fibers}</span>`,
       `<span class="mono">${r.loss}</span>`, chip(r.housing, 'neutral'), `<span class="num">${r.surveyed}</span>`]
    : t === 'cord'
    ? [chip(r.st,r.chip), `<span class="vw-value">${r.n}</span>`, `<span class="mono">${r.site}</span>`,
       `<span class="mono">${r.a}</span>`, `<span class="mono">${r.b}</span>`, r.type,
       `<span class="num">${r.len}</span>`, `<span class="mono">${r.loss}</span>`, `<span class="num">${r.surveyed}</span>`]
    : [chip(r.st,r.chip), `<span class="vw-value">${r.n}</span>`, `<span class="mono">${r.a}</span>`,
       `<span class="mono">${r.b}</span>`, `<span class="num">${r.len}</span>`, `<span class="mono">${r.ways}</span>`,
       r.bore, chip(r.own, r.own === 'Own' ? 'neutral' : 'info'), `<span class="num">${r.surveyed}</span>`];

  return `<div class="page">

    ${drillBar()}

    ${statStrip([
      { k:'Passive records', v:n(5120), s:'7 classes · 0 discovered', t:'cyan',
        d:{ v:'passive', l:'All passive records', q:'tab=fiber' } },
      { k:'Fiber core fill', v:`${P.coreFill}%`, s:'across 1,204 spans', t:'emerald',
        d:{ v:'passive', l:'Fiber spans', q:'tab=fiber' } },
      { k:'Spans impaired',  v:`${P.spansCut + P.spansDegraded}`, s:`${P.spansCut} cut · ${P.spansDegraded} degraded`, t:'red',
        d:{ v:'passive', l:'Impaired fiber spans', q:'tab=fiber' } },
      { k:'ODF fill',        v:`${P.odfFill}%`, s:'486 frames', t:'sky',
        d:{ v:'passive', l:'ODF frames', q:'tab=odf' } },
      { k:'Rack fill',       v:`${P.rackFill}%`, s:`${P.racksFull} racks full`, t:'amber',
        d:{ v:'passive', l:'Racks', q:'tab=rack' } },
      { k:'Power tests due', v:n(P.powerOverdue), s:'overdue beyond 90 days', t:'orange',
        d:{ v:'passive', l:'Power units overdue for test', q:'tab=power' } }
    ])}

    ${card(`
      <div class="tabbar" style="margin-top:var(--vw-space-lg)">${PASSIVE_TABS.map(x=>`
        <button class="tab${x.k===t?' is-on':''}" data-passtab="${x.k}">${x.n}</button>`).join('')}</div>
      ${gridBar(rows.length, n(meta.c), 'Name, site, A/B end', FS.passive, '',
        [], 'passive')}
      ${rows.length ? table(cols, rows.map(cell), '',
        i => [A('Open site', { v:'site', l:rows[i].site || rows[i].n })])
        : `<div class="vw-card-child-shaded vw-card-description" style="padding:var(--vw-space-2xl);text-align:center">
             <strong>${meta.n}</strong> holds ${n(meta.c)} records.</div>`}
      ${t === 'rack' ? `<div class="vw-card-footer-divider legend">
        <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',300)}"></span>router</span>
        <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',300)}"></span>switch</span>
        <span class="legend-i"><span class="legend-sw" style="background:${cv('purple',300)}"></span>ODF / panel</span>
        <span class="legend-i"><span class="legend-sw" style="background:var(--vw-color-slate-100);border:1px solid var(--vw-color-slate-300)"></span>free U</span>
        <span class="vw-card-description">Elevation runs U1 at the left to the top of the rack at the right. Hover a unit for what occupies it.</span>
      </div>` : ''}`)}
  </div>`;
}
