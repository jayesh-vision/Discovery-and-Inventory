/* ═══ Resource detail ═══ */
let RES_ID = 'NDLS-J960-P_R1-T1-NR', RES_TAB = 'overview', IF_FILTER = 'all', NBR_TAB = 'lldp', RES_HIST_FILTER = 'All';
let RES_ENB_TAB = 'cell'; /* which tab is open on an eNodeB's own View details page — see viewEnodebResource() */
let RES_SW_TAB = 'hardware'; /* which tab is open on a Switch's own View details page — see viewSwitchResource() */
let RES_DW_TAB = 'hardware'; /* which tab is open on a DWDM's own View details page — see viewDwdmResource() */
let ODF_ID = null; /* which ODF frame is open on its own View details page — see viewOdfDetail() */
let RACK_ID = null, POWER_ID = null, SPLICE_ID = null, CORD_ID = null, DUCT_ID = null, FIBER_ID = null;
/* which record of each other Passive Infrastructure tab is open on its own
   View details page — see viewRackDetail(), viewPowerDetail(), etc. below */
let FIBER_TAB = 'overview'; /* which sub-tab is open on a Fiber span's own View details page */
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
      ${table([{t:'Field'},{t:'Value'},{t:'Source'}], PROV.map(p => [
        `<span class="vw-label">${p.f}</span>`,
        `<span class="vw-value mono"${p.ok?'':` style="color:${cv('gray',400)}"`}>${p.v}</span>`,
        chip(p.src, p.src.startsWith('Derived')?'cyan':p.src.includes('collector')?'success'
          :p.src.startsWith('Workorder')?'purple':p.src.startsWith('Manual')?'neutral'
          :p.src.startsWith('Scope')?'info':'error')]), '',
        i => [])}
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
        i => [])}`);
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
        i => [])}`);
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
        i => [])}
        </div>
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

/* ═══ eNodeB — View details ═══
   A radio site isn't chassis/FPC/PIC-shaped, so it doesn't belong on the
   router-only page below (that page ignores RES_ID entirely and always
   shows a router — see the fallback branch — so eNodeB needs its own).
   Reuses N.enb (see buildEnodebSite() in app-node.js), the same data the
   live Node View dashboard is built from, just read at inventory-page
   granularity: one row per cell instead of a live dashboard. */
function viewEnodebResource(N) {
  const r = N.r, E = N.enb;
  const stLabel = r.st === 'ok' ? 'Ready' : r.st === 'drift' ? 'Degraded' : r.st === 'stale' ? 'Stale' : r.st === 'miss' ? 'Missing' : N.ready;
  const stTone = stLabel === 'Ready' ? 'success' : stLabel === 'Degraded' || stLabel === 'Stale' ? 'warning' : 'error';
  const TABS = [['cell', 'Cell'], ['links', 'Network links'], ['config', 'Configuration']];
  const tab = TABS.some(([k]) => k === RES_ENB_TAB) ? RES_ENB_TAB : 'cell';

  const allLinks = [
    ...E.links.backhaul.map(x => ({ ...x, type: 'Backhaul' })),
    ...E.links.x2.map(x => ({ ...x, type: 'X2 interface' })),
    ...E.links.s1.map(x => ({ ...x, type: 'S1 interface' }))
  ];
  const linkTone = t => t === 'Backhaul' ? 'warning' : t === 'X2 interface' ? 'info' : 'purple';

  const body = tab === 'links'
    ? card(table([{ t: 'Link types' }, { t: 'Name' }, { t: 'Protocol' }, { t: 'Utilization', r: true }, { t: 'Active users', r: true }, { t: 'Growth rate' }, { t: 'Created on' }, { t: 'Modified on' }],
        allLinks.map(x => [chip(x.type, linkTone(x.type)), `<span class="vw-value mono">${esc(x.n)}</span>`, x.proto, `${x.util}%`, n(x.users), x.growth, x.created, x.modified]),
        '', () => []))
    : tab === 'config'
    ? card(table([{ t: 'Compliance' }, { t: 'Category' }, { t: 'Parameter' }, { t: 'Expected(db)' }, { t: 'Actual(db)' }, { t: 'Deviation' }, { t: 'Created on' }, { t: 'Updated on' }],
        E.config.map(c => [chip(c.compliant ? 'Compliant' : 'Non-Compliant', c.compliant ? 'success' : 'error'), c.cat, c.p, String(c.exp), String(c.act), String(c.dev), '12-May-2026', '12-May-2026']),
        '', () => []))
    : card(table([{ t: 'Status' }, { t: 'Band' }, { t: 'Health(%)' }, { t: 'Alarms' }, { t: 'Users' }, { t: 'PRB DL/UL(%)' }, { t: 'Throughput DL/UL(Mbps)' }, { t: 'SINR(db)' }],
        E.cellDetails.map(c => [chip(c.status, c.status === 'Good' ? 'success' : c.status === 'Degraded' ? 'warning' : 'error'),
          `B${c.band}`, String(c.health), String(c.alarms), String(c.users), `${c.prb}%`, c.bw, String(c.sinr)]),
        '', () => []));

  return `<div class="page">
    ${pageHead(N.name, `eNodeB · ${r.loc} · ${E.siteType}`)}

    ${card(`
      <div class="nv-head">
        <div class="nv-thumb" aria-hidden="true" style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:var(--vw-color-emerald-50,#ecfdf5);border-radius:10px;padding:6px">
          <span style="color:var(--vw-color-emerald-600,#059669)">${nodeThumb('enodeb')}</span>
        </div>
        <div class="stack-x grow" style="min-width:0">
          <div class="row" style="gap:var(--vw-space-sm);align-items:center">
            <span class="vw-card-title" style="font-size:1.25rem;font-weight:500">${N.name}</span>
            ${chip(stLabel, stTone)}${chip(r.oem || 'eNodeB', 'info')}
          </div>
          <span class="vw-card-metric-label-sub mono" style="display:inline-flex;align-items:center;gap:4px;color:var(--vw-color-slate-500);margin-top:2px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            eNodeB · ${r.loc || N.name}
          </span>
        </div>
        <div class="stack-x" style="text-align:right;flex-shrink:0;max-width:32ch">
          <span class="nv-hk">Description</span>
          <span class="vw-value">${E.siteType} · ${r.loc || N.name} · ${E.sectors} sectors, ${E.cells} cells</span>
        </div>
      </div>
      <div class="nv-meta" style="grid-template-columns:repeat(5, 1fr);gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0)">${[
        ['Serial number', r.sn || '—'], ['IP address', r.ip || '—'], ['Software version', E.swVersion],
        ['Longitude', r.lon || '—'], ['Latitude', r.lat || '—']
      ].map(([k, v]) => `<div class="stack-x">
        <span class="nv-hk" style="font-size:0.75rem;color:var(--vw-color-slate-500);font-weight:500">${k}</span><span class="nv-mv mono" style="font-size:0.875rem;font-weight:400;color:var(--vw-color-slate-800);margin-top:2px">${v}</span></div>`).join('')}</div>`,
      '', 'padding:var(--vw-space-lg)')}

    <div class="section-tabs">${TABS.map(([k, l]) => `<button class="stab${tab === k ? ' is-on' : ''}" data-resenbtab="${k}">${l}</button>`).join('')}</div>

    ${body}
  </div>`;
}

/* ═══ Switch — View details ═══
   Real EX4650-style component/interface conventions: CPU/PSU/FAN/
   Backplane/Chassis/FPC-PIC modules, GE-numbered physical interfaces, and
   an LLDP table to one MLAG peer (several parallel GE links to the same
   neighbour — a real leaf/MLAG topology, not a coincidence). Same
   deterministic nrand/nint sample convention as everything else. */
function buildSwitchResourceDetail(s, r) {
  const oemTag = (r.oem || 'JNPR').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
  const hardware = [
    { n: 'RE0', t: 'CPU', model: 'RE-EX4650' },
    { n: 'PSU0', t: 'Power supply', model: 'JPSU-650W-AC' },
    { n: 'PSU1', t: 'Power supply', model: 'JPSU-650W-AC' },
    { n: 'FAN0', t: 'Fan', model: 'FAN-EX4650' },
    { n: 'FAN1', t: 'Fan', model: 'FAN-EX4650' },
    { n: 'Backplane', t: 'Backplane', model: 'EX4650-BP' },
    { n: 'Chassis', t: 'Chassis', model: r.model || 'EX4650-48Y' },
    { n: 'FPC0', t: 'Module', model: 'EX4650-FPC' },
    { n: 'PIC0', t: 'Module', model: 'EX4650-PIC' }
  ].map((h, i) => ({ ...h, sn: `${oemTag}-${h.n.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${nint(s, 7200 + i, 10, 99)}`, mfr: `${r.oem || 'Juniper'} Networks` }));

  const slug = String(r.name || s).toLowerCase();
  const IF_COUNT = 10;
  const interfaces = Array.from({ length: IF_COUNT }, (_, i) => {
    const down = nint(s, 7300 + i, 0, 4) === 0;
    const SPEEDS = ['1 Gbps', '10 Gbps', '100 Gbps'];
    const speed = SPEEDS[nint(s, 7310 + i, 0, SPEEDS.length - 1)];
    return {
      name: `GE0/1/${i}`, down,
      admin: down ? 'down(2)' : 'up(1)',
      oper: down ? (nint(s, 7320 + i, 0, 1) ? 'down(2)' : 'lowerLayerDown(7)') : 'up(1)',
      bw: speed, cap: speed, ifalias: `${slug}-ge0-1-${i}`
    };
  });

  /* the MLAG peer's name/IP — the same switch identity one step along its
     own numbering, not an unrelated random name */
  const bump = (numStr, off) => String(((parseInt(numStr, 10) - 1 + off) % 99) + 1).padStart(numStr.length, '0');
  const nameM = String(r.name || '').match(/^(.*?)(\d+)$/);
  const peerName = nameM ? `${nameM[1]}${bump(nameM[2], nint(s, 7400, 1, 8))}` : `${r.name}-PEER`;
  const ipM = String(r.ip || '').match(/^(\d+\.\d+\.\d+\.)(\d+)$/);
  const peerIp = ipM ? `${ipM[1]}${((parseInt(ipM[2], 10) - 1 + nint(s, 7410, 1, 8)) % 254) + 1}` : '192.168.1.4';
  const lldp = interfaces.map((iface, i) => ({
    srcNe: r.name, srcIp: r.ip || '192.168.1.1', srcIf: iface.name,
    dstIp: peerIp, dstNe: peerName, dstIf: iface.name,
    link: `BB:T4 ${r.name}-${peerName}`, ifalias: iface.ifalias
  }));

  return {
    hardware, interfaces, lldp,
    description: `${r.name} ${r.model || ''} leaf — ${r.loc || ''} MLAG peer-A`.replace(/\s+/g, ' ').trim()
  };
}

function viewSwitchResource(N) {
  const r = N.r;
  const D = buildSwitchResourceDetail(N.name, r);
  const stLabel = r.st === 'ok' ? 'Ready' : r.st === 'drift' ? 'Degraded' : r.st === 'stale' ? 'Stale' : r.st === 'miss' ? 'Missing' : N.ready;
  const stTone = stLabel === 'Ready' ? 'success' : stLabel === 'Degraded' || stLabel === 'Stale' ? 'warning' : 'error';
  const TABS = [['hardware', 'Hardware details'], ['ifall', 'Interface all'], ['ifdown', 'Interface down'], ['lldp', 'LLDP']];
  const tab = TABS.some(([k]) => k === RES_SW_TAB) ? RES_SW_TAB : 'hardware';
  const stChip = st => chip(st, st.startsWith('up') ? 'success' : 'error');
  const downIf = D.interfaces.filter(i => i.down);

  const body = tab === 'ifall'
    ? card(table([{ t: 'Name' }, { t: 'Admin status' }, { t: 'Operational status' }, { t: 'Bandwidth' }, { t: 'Capacity' }, { t: 'Ifalias' }],
        D.interfaces.map(i => [i.name, stChip(i.admin), stChip(i.oper), i.bw, i.cap, `<span class="mono">${i.ifalias}</span>`]),
        '', () => []))
    : tab === 'ifdown'
    ? card(table([{ t: 'Name' }, { t: 'Admin status' }, { t: 'Operational status' }, { t: 'Ifspeed' }, { t: 'Ifalias' }, { t: 'Ifhighspeed' }],
        downIf.map(i => [i.name, stChip(i.admin), stChip(i.oper), i.bw, `<span class="mono">${i.ifalias}</span>`, i.bw]),
        '', () => []))
    : tab === 'lldp'
    ? card(table([{ t: 'Source NE' }, { t: 'Source IP address' }, { t: 'Source interface' }, { t: 'Destination IP address' }, { t: 'Destination NE' }, { t: 'Destination interface' }, { t: 'Link name' }, { t: 'Ifalias' }],
        D.lldp.map(l => [l.srcNe, `<span class="mono">${l.srcIp}</span>`, l.srcIf, `<span class="mono">${l.dstIp}</span>`, l.dstNe, l.dstIf, l.link, `<span class="mono">${l.ifalias}</span>`]),
        '', () => []))
    : card(table([{ t: 'Name' }, { t: 'Type' }, { t: 'Model' }, { t: 'Serial number' }, { t: 'Manufacturer name' }],
        D.hardware.map(h => [h.n, h.t, `<span class="mono">${h.model}</span>`, `<span class="mono">${h.sn}</span>`, h.mfr]),
        '', () => []));

  return `<div class="page">
    ${pageHead(N.name, `Switch · ${r.loc || '—'} · ${r.model || ''}`)}

    ${card(`
      <div class="nv-head">
        <div class="nv-thumb" aria-hidden="true" style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:var(--vw-color-sky-50,#f0f9ff);border-radius:10px;padding:6px">
          <span style="color:var(--vw-color-sky-600,#0284c7)">${nodeThumb('switch')}</span>
        </div>
        <div class="stack-x grow" style="min-width:0">
          <div class="row" style="gap:var(--vw-space-sm);align-items:center">
            <span class="vw-card-title" style="font-size:1.25rem;font-weight:500">${N.name}</span>
            ${chip(stLabel, stTone)}${chip(r.oem || 'Switch', 'info')}
          </div>
          <span class="vw-card-metric-label-sub mono" style="display:inline-flex;align-items:center;gap:4px;color:var(--vw-color-slate-500);margin-top:2px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            Switch · ${r.loc || N.name}
          </span>
        </div>
        <div class="stack-x" style="text-align:right;flex-shrink:0;max-width:36ch">
          <span class="nv-hk">Description</span>
          <span class="vw-value">${esc(D.description)}</span>
        </div>
      </div>
      <div class="nv-meta" style="grid-template-columns:repeat(5, 1fr);gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0)">${[
        ['Serial number', r.sn || '—'], ['IP address', r.ip || '—'], ['Software version', r.os || '—'],
        ['Longitude', r.lon || '—'], ['Latitude', r.lat || '—']
      ].map(([k, v]) => `<div class="stack-x">
        <span class="nv-hk" style="font-size:0.75rem;color:var(--vw-color-slate-500);font-weight:500">${k}</span><span class="nv-mv mono" style="font-size:0.875rem;font-weight:400;color:var(--vw-color-slate-800);margin-top:2px">${v}</span></div>`).join('')}</div>`,
      '', 'padding:var(--vw-space-lg)')}

    <div class="section-tabs">${TABS.map(([k, l]) => `<button class="stab${tab === k ? ' is-on' : ''}" data-ressw="${k}">${l}</button>`).join('')}</div>

    ${body}
  </div>`;
}

/* ═══ DWDM — View details ═══
   An optical shelf's slot inventory and physical port count are both a
   different shape and a different scale from a switch's: a ROADM chassis
   carries many more physical ports (line + client optics across several
   shelves) than a leaf switch's handful of GE ports, and it doesn't run
   LLDP the way a switch does — so this gets its own 3 tabs (no LLDP)
   instead of reusing Switch's 4. Same deterministic nrand/nint sample
   convention as everything else; module naming follows the same DWDM
   part-number vocabulary the Node View's Hardware & shelves tab already
   uses (EDFA-C-D20, OSCM-PN, WCC-PCN, …). */
function buildDwdmResourceDetail(s, r) {
  const hardware = [
    { n: 'MOD-1-1_PSU/7HU-DC-HP', t: 'Module', model: 'N13A' },
    { n: 'MOD-1-3_OSCM-PN', t: 'Control Board Slot', model: 'N14A' },
    { n: 'MOD-1-4_OSFM-10G', t: 'PEM Slot', model: 'N15A' },
    { n: 'MOD-1-5_EDFA-C-S20', t: 'FPC Slot', model: 'N16A' },
    { n: 'MOD-1-6_EDFA-C-D20-VGC', t: 'Chassis Frame', model: 'N17A' },
    { n: 'MOD-1-10_4WCC-PCN-10G', t: 'Backplane', model: 'N18A' },
    { n: 'MOD-1-16_EDFA-C-D20', t: 'Chassis', model: 'N19A' },
    { n: 'MOD-1-17_EDFA-C-S20-GCB', t: 'Port', model: 'N20A' },
    { n: 'MOD-1-18_OSFM-4TG', t: 'Container', model: 'N21A' },
    { n: 'MOD-1-19_WCC-PCN-100G', t: 'Module', model: 'N22A' },
    { n: 'MOD-1-20_EDFA-C-S20-VLGC', t: 'FPC Slot', model: 'N23A' },
    { n: 'MOD-1-21_OSCM-PN', t: 'Control Board Slot', model: 'N24A' }
  ].map((h, i) => ({ ...h, sn: `FA${nint(s, 7500 + i, 700000000, 799999999)}`, mfr: 'OEM' }));

  const IFALIAS_POOL = [
    'BB:Bundle link for ae10 SRR-PGT Link-1',
    'BB:MAQ-SRR 100G MAQ-J7024(4-15-C) to SRR',
    'BB:ED-SRR 100G ED-J480-RRR-T2-SR(DWDM)',
    'BB:Bundle link for ae1 SRR-4-6-C to CLT-2-6-C',
    'BB:Bundle link for ae45 100G SRR MX-480 To CLT',
    'BB:SRR-MX480 to SRR-MX204 100G',
    'BB: FPC 2 is Faulty,Pls do not configure',
    'Railwire Service for SRR-CLT Ring',
    null, null
  ];
  const slug = String(r.name || s).toLowerCase();
  /* a ROADM shelf carries far more physical ports than a leaf switch —
     line + client optics across several shelves, not a handful of GE
     ports — so this runs to ~100 rather than ~10 */
  const IF_COUNT = 105;
  const interfaces = Array.from({ length: IF_COUNT }, (_, i) => {
    const kind = ['et', 'xe'][nint(s, 7600 + i, 0, 1)];
    /* shelf/slot/port is a function of the port's own index, not a fresh
       random draw each time — a real chassis has one fixed physical port
       layout, so two ports on the same device never collide on a name */
    const shelf = 1 + (Math.floor(i / 24) % 5), slot = Math.floor(i / 6) % 4, port = i % 6;
    const down = nint(s, 7640 + i, 0, 3) === 0;
    const capacity = kind === 'et' ? [0.1, 9.77, 97.66][nint(s, 7650 + i, 0, 2)] : [0.01, 0.1, 9.77][nint(s, 7650 + i, 0, 2)];
    const bw = down ? 0 : +(nrand(s, 7660 + i, 0, capacity)).toFixed(2);
    const alias = IFALIAS_POOL[nint(s, 7670 + i, 0, IFALIAS_POOL.length - 1)];
    return {
      name: `${kind}-${shelf}/${slot}/${port}`, down,
      admin: 'up(1)',
      oper: down ? (nint(s, 7680 + i, 0, 1) ? 'down(2)' : 'lowerLayerDown(7)') : 'up(1)',
      bw: `${bw} Gbps`, cap: `${capacity} Gbps`,
      ifalias: alias ? `${alias.slice(0, 44)}${alias.length > 44 ? '…' : ''}` : '-',
      ifhigh: `${[9.77, 39.06, 97.66][nint(s, 7690 + i, 0, 2)]} Gbps`
    };
  });

  return {
    hardware, interfaces,
    description: `Hardware Model:${r.model || '—'}, Software version: ${r.os || '—'}`
  };
}

function viewDwdmResource(N) {
  const r = N.r;
  const D = buildDwdmResourceDetail(N.name, r);
  const stLabel = r.st === 'ok' ? 'Ready' : r.st === 'drift' ? 'Degraded' : r.st === 'stale' ? 'Stale' : r.st === 'miss' ? 'Missing' : N.ready;
  const stTone = stLabel === 'Ready' ? 'success' : stLabel === 'Degraded' || stLabel === 'Stale' ? 'warning' : 'error';
  const TABS = [['hardware', 'Hardware details'], ['ifall', 'Interface all'], ['ifdown', 'Interface down']];
  const tab = TABS.some(([k]) => k === RES_DW_TAB) ? RES_DW_TAB : 'hardware';
  const stChip = st => chip(st, st.startsWith('up') ? 'success' : 'error');
  const downIf = D.interfaces.filter(i => i.down);

  const body = tab === 'ifall'
    ? card(table([{ t: 'Name' }, { t: 'Admin status' }, { t: 'Operational status' }, { t: 'Bandwidth' }, { t: 'Capacity' }, { t: 'Ifalias' }],
        D.interfaces.map(i => [i.name, stChip(i.admin), stChip(i.oper), i.bw, i.cap, i.ifalias === '-' ? '-' : `<span class="mono">${esc(i.ifalias)}</span>`]),
        '', () => []))
    : tab === 'ifdown'
    ? card(table([{ t: 'Name' }, { t: 'Admin status' }, { t: 'Operational status' }, { t: 'Ifspeed' }, { t: 'Ifalias' }, { t: 'Ifhighspeed' }],
        downIf.map(i => [i.name, stChip(i.admin), stChip(i.oper), i.cap, i.ifalias === '-' ? '-' : `<span class="mono">${esc(i.ifalias)}</span>`, i.ifhigh]),
        '', () => []))
    : card(table([{ t: 'Name' }, { t: 'Type' }, { t: 'Model' }, { t: 'Serial number' }, { t: 'Manufacturer name' }],
        D.hardware.map(h => [h.n, h.t, `<span class="mono">${h.model}</span>`, `<span class="mono">${h.sn}</span>`, h.mfr]),
        '', () => []));

  return `<div class="page">
    ${pageHead(N.name, `DWDM · ${r.loc || '—'} · ${r.model || ''}`)}

    ${card(`
      <div class="nv-head">
        <div class="nv-thumb" aria-hidden="true" style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:var(--vw-color-violet-50,#f5f3ff);border-radius:10px;padding:6px">
          <span style="color:var(--vw-color-violet-600,#7c3aed)">${nodeThumb('dwdm')}</span>
        </div>
        <div class="stack-x grow" style="min-width:0">
          <div class="row" style="gap:var(--vw-space-sm);align-items:center">
            <span class="vw-card-title" style="font-size:1.25rem;font-weight:500">${N.name}</span>
            ${chip(stLabel, stTone)}${chip(r.oem || 'DWDM', 'info')}
          </div>
          <span class="vw-card-metric-label-sub mono" style="display:inline-flex;align-items:center;gap:4px;color:var(--vw-color-slate-500);margin-top:2px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            DWDM · ${r.loc || N.name}
          </span>
        </div>
        <div class="stack-x" style="text-align:right;flex-shrink:0;max-width:36ch">
          <span class="nv-hk">Description</span>
          <span class="vw-value">${esc(D.description)}</span>
        </div>
      </div>
      <div class="nv-meta" style="grid-template-columns:repeat(5, 1fr);gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--vw-color-slate-200,#e2e8f0)">${[
        ['Serial number', r.sn || '—'], ['IP address', r.ip || '—'], ['Software version', r.os || '—'],
        ['Longitude', r.lon || '—'], ['Latitude', r.lat || '—']
      ].map(([k, v]) => `<div class="stack-x">
        <span class="nv-hk" style="font-size:0.75rem;color:var(--vw-color-slate-500);font-weight:500">${k}</span><span class="nv-mv mono" style="font-size:0.875rem;font-weight:400;color:var(--vw-color-slate-800);margin-top:2px">${v}</span></div>`).join('')}</div>`,
      '', 'padding:var(--vw-space-lg)')}

    <div class="section-tabs">${TABS.map(([k, l]) => `<button class="stab${tab === k ? ' is-on' : ''}" data-resdw="${k}">${l}</button>`).join('')}</div>

    ${body}
  </div>`;
}

function viewResource() {
  /* eNodeB, Switch and DWDM aren't router-chassis-shaped — resolve RES_ID's
     real class first and hand it to its own page rather than falling into
     the router-only rendering below (which never actually reads RES_ID at
     all: every other class still falls back to a random router's data,
     unchanged here — only these three classes get a page that reads their
     own record) */
  const resCls = nodeRecord(RES_ID).cls;
  if (resCls === 'enodeb') return viewEnodebResource(nodeOf(RES_ID));
  if (resCls === 'switch') return viewSwitchResource(nodeOf(RES_ID));
  if (resCls === 'dwdm') return viewDwdmResource(nodeOf(RES_ID));

  const r = PHY.router.find(x => x.name === RES_ID) || PHY.router[0];
  const body = { overview:resOverview, hardware:resHardware, ifaces:resIfaces, nbrs:resNbrs,
                 svcs:resSvcs, alarms:resAlarms, config:resConfig, history:resHistory }[RES_TAB]();
  return `<div class="page">
    ${pageHead(r.name, `Router · ${r.model} · ${r.oem} · ${r.loc}`)}

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
        /* every passive tab key (t) doubles as its own View details view
           key — viewOdfDetail/viewRackDetail/… below, one per PASSIVE_TABS
           entry — so no per-tab mapping table is needed here */
        i => [A('View details', { v:t, l:rows[i].n, q:'id=' + encodeURIComponent(rows[i].n) }), siteA(rows[i].site || rows[i].n)])
        : `<div class="vw-card-child-shaded vw-card-description" style="padding:var(--vw-space-2xl);text-align:center">
             <strong>${meta.n}</strong> holds ${n(meta.c)} records.</div>`}
      ${t === 'rack' ? `<div class="vw-card-footer-divider legend">
        <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',300)}"></span>router</span>
        <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',300)}"></span>switch</span>
        <span class="legend-i"><span class="legend-sw" style="background:${cv('purple',300)}"></span>ODF / panel</span>
        <span class="legend-i"><span class="legend-sw" style="background:var(--vw-color-slate-100);border:1px solid var(--vw-color-slate-300)"></span>free U</span>
      </div>` : ''}`)}
  </div>`;
}

/* ═══ ODF — View details ═══
   The passive sample rows (viewPassive's PASSIVE.odf) carry only what the
   list needs; everything else on this page (manufacturer, serial number,
   install date, photos, …) is deterministic off the frame's own name, the
   same nint/nrand convention buildSwitchResourceDetail() etc. use, so a
   given frame always renders the same detail. Coordinates and address come
   straight off the frame's real site record rather than being invented
   again, so they never disagree with the Site info page for the same site. */
const ODF_MFR = ['Nokia', 'Corning', 'CommScope', 'Huawei', 'STL'];
const ODF_STAFF = ['Rohit Sharma', 'Ananya Iyer', 'Vikram Shetty', 'Priya Menon', 'Suresh Rao'];
function buildOdfDetail(r, site) {
  const s = r.n;
  const mfr = ODF_MFR[nint(s, 1, 0, ODF_MFR.length - 1)];
  const wallMount = /wall/i.test(r.type);
  const installPct = r.st === 'Planned' ? 0 : 100;
  const day = nint(s, 2, 1, 27), month = MONTHS_SHORT[nint(s, 3, 0, 11)], year = 2023 + nint(s, 4, 0, 2);
  const stamp = `${pad2(day)}-${month}-${year}`;
  return {
    id: `odf-${nseed(s).toString(16).padStart(8, '0')}-${nint(s, 5, 1000, 9999)}`,
    manufacturer: mfr,
    model: `FIST-ODF-${r.cap}`,
    serialNumber: `ODF-${year}-${String(nint(s, 6, 100, 999)).padStart(3, '0')}`,
    installPct,
    installDate: installPct ? stamp : '—',
    createdBy: ODF_STAFF[nint(s, 7, 0, ODF_STAFF.length - 1)],
    remarks: `Main ODF for ${site.name}`,
    vendor: mfr,
    frameType: wallMount ? 'Wall mounted' : 'Rack mounted',
    cabinetRackNo: r.rack && r.rack !== '—' ? r.rack.split(' · ')[0] : '—',
    height: wallMount ? '—' : `${[42, 45, 47][nint(s, 8, 0, 2)]}U`,
    powerRequired: 'No',
    environment: nint(s, 9, 0, 4) === 0 ? 'Outdoor' : 'Indoor (AC)',
    photos: [
      { n: 'Front view', at: `${stamp} 10:24` },
      { n: 'Port close-up', at: `${stamp} 10:26` },
      { n: 'Cable management', at: `${stamp} 10:28` },
      { n: 'Labeling', at: `${stamp} 10:30` }
    ]
  };
}
const ODF_PIN_ICON = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

/* ── shared field-photo illustrations, every Passive Infrastructure detail
   page's Photos card ── the app has no photo library anywhere, so these are
   drawn (line art, not stock imagery) rather than pointing at images that
   don't exist. mediaTile() (defined with the rest of the Fiber span page
   below) wraps whichever of these an illustration fits into one tile. */
function mediaIllustrationPanel() {
  const ports = Array.from({ length: 16 }, (_, i) => {
    const x = 10 + (i % 8) * 22, y = i < 8 ? 30 : 62, lit = i % 5 !== 0;
    return `<rect x="${x}" y="${y}" width="14" height="14" rx="2" fill="${lit?'#334155':'#0f172a'}" stroke="#475569" stroke-width="1"/>${lit ? `<circle cx="${x+11}" cy="${y+3}" r="1.4" fill="#22c55e"/>` : ''}`;
  }).join('');
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block"><rect width="200" height="120" fill="#1e293b"/>${ports}</svg>`;
}
function mediaIllustrationCableBundle() {
  const paths = ['#facc15','#f97316','#22c55e','#3b82f6','#a855f7','#ef4444','#94a3b8','#e2e8f0'].map((hue, i) => {
    const y0 = 10 + i * 3;
    return `<path d="M0 ${y0} C60 ${40+i*4} 140 ${40+i*4} 200 ${y0+70}" stroke="${hue}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block"><rect width="200" height="120" fill="#0f172a"/>${paths}</svg>`;
}
function mediaIllustrationLabelTag() {
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block">
    <rect width="200" height="120" fill="#e2e8f0"/>
    <rect x="30" y="30" width="140" height="60" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/>
    <rect x="42" y="42" width="80" height="6" rx="3" fill="#334155"/>
    <rect x="42" y="54" width="60" height="5" rx="2.5" fill="#94a3b8"/>
    <rect x="42" y="64" width="50" height="5" rx="2.5" fill="#94a3b8"/>
    ${Array.from({ length:14 }, (_, i) => `<rect x="${130+i*2.2}" y="42" width="${i%3===0?1.8:1}" height="30" fill="#1e293b"/>`).join('')}
  </svg>`;
}
function mediaIllustrationPowerUnit() {
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block">
    <rect width="200" height="120" fill="#1e293b"/>
    <rect x="50" y="35" width="100" height="60" rx="4" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
    <rect x="60" y="45" width="20" height="14" rx="2" fill="#0f172a"/>
    <rect x="60" y="65" width="70" height="6" rx="3" fill="#475569"/>
    <path d="M110 20 L98 55 L112 55 L96 90" stroke="#facc15" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function mediaIllustrationConnectorEnd() {
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block">
    <rect width="200" height="120" fill="#0b1220"/>
    <circle cx="100" cy="60" r="34" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <circle cx="100" cy="60" r="18" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
    <circle cx="100" cy="60" r="4" fill="#38bdf8"/>
  </svg>`;
}
function mediaIllustrationRackFront() {
  const slots = Array.from({ length: 6 }, (_, i) => {
    const y = 12 + i * 16;
    return `<rect x="30" y="${y}" width="140" height="12" rx="2" fill="#334155" stroke="#475569" stroke-width="1"/><circle cx="160" cy="${y+6}" r="2" fill="${i%4===0?'#ef4444':'#22c55e'}"/>`;
  }).join('');
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block"><rect width="200" height="120" fill="#0f172a"/>${slots}</svg>`;
}
const odfDetailRows = fields => fields.map(([k, v]) => `<div class="cx-row" style="grid-template-columns:11rem 1fr">
    <span class="vw-label">${esc(k)}</span><span class="vw-value">${esc(v)}</span>
  </div>`).join('');

function viewOdfDetail() {
  const rows = PASSIVE.odf;
  const r = rows.find(x => x.n === ODF_ID) || rows[0];
  const site = resolveSite(r.site) || LOCATIONS[0];
  const d = buildOdfDetail(r, site);
  const free = r.cap - r.used;
  const fillPct = r.cap ? Math.round(r.used / r.cap * 100) : 0;
  const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(site.lat)},${encodeURIComponent(site.lon)}`;

  const odfDetailsCard = card(`${headSm('ODF details')}
    <div style="margin-top:var(--vw-space-md)">
      ${odfDetailRows([
        ['ID', d.id], ['Type', 'ODF'], ['Name / Code', r.n],
        ['Site / Location', site.name], ['Manufacturer', d.manufacturer], ['Model', d.model],
        ['Serial number', d.serialNumber], ['Number of ports', String(r.cap)],
        ['Installation completed', `${d.installPct > 0 ? 'Yes' : 'No'} (${d.installPct}%)`],
        ['Installation date', d.installDate], ['Created by', d.createdBy], ['Remarks', d.remarks]
      ])}
    </div>`, 'grow');

  const portUtilCard = card(`${headSm('Port utilisation')}
    <div class="row vw-gap-lg vw-items-center" style="margin-top:var(--vw-space-md)">
      ${donut([{ n:'In use', c:r.used, tone:'emerald' }, { n:'Free', c:free, tone:'sky' }], r.cap, `${fillPct}%`, 'used', 96)}
      <div class="stack-s grow">
        <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',400)}"></span>In use <span class="vw-value num">${r.used}</span></span>
        <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',300)}"></span>Free <span class="vw-value num">${free}</span></span>
        <div class="hbar-track" style="height:8px;margin-top:4px">
          <span class="hbar-fill" style="display:block;width:${fillPct}%;background:${cv(fillPct>85?'red':fillPct>70?'amber':'emerald',400)}"></span>
        </div>
      </div>
    </div>`);

  const ODF_PHOTO_ILLUSTRATIONS = [mediaIllustrationPanel, mediaIllustrationConnectorEnd, mediaIllustrationCableBundle, mediaIllustrationLabelTag];
  const photosCard = card(`
    <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
      ${headSm('Photos')}
      <button class="nst-btn nst-btn--xs nst-btn--ghost js-ack">View all (${d.photos.length})</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--vw-space-md)">
      ${d.photos.map((p, i) => mediaTile(ODF_PHOTO_ILLUSTRATIONS[i % ODF_PHOTO_ILLUSTRATIONS.length](), p.n, p.at, false)).join('')}
    </div>`);

  const locationCard = card(`${headSm('Location')}
    <div class="row-t" style="margin-top:var(--vw-space-md);align-items:stretch">
      <div style="flex:0 0 200px;border-radius:var(--vw-radius-md);background:${cv('sky',50)};border:1px solid ${cv('slate',200)};display:flex;align-items:center;justify-content:center;color:${cv('sky',400)}">
        ${ODF_PIN_ICON}
      </div>
      <div class="stack-s grow" style="justify-content:center">
        <div class="row vw-gap-sm"><span class="vw-label" style="width:6rem">Latitude</span><span class="vw-value mono">${esc(site.lat)}</span></div>
        <div class="row vw-gap-sm"><span class="vw-label" style="width:6rem">Longitude</span><span class="vw-value mono">${esc(site.lon)}</span></div>
        <div class="row vw-gap-sm"><span class="vw-label" style="width:6rem">Address</span><span class="vw-value">${esc(site.addr)}</span></div>
        <a class="nst-btn nst-btn--sm" style="align-self:flex-start;margin-top:4px" href="${esc(mapsUrl)}" target="_blank" rel="noopener">View on map</a>
      </div>
    </div>`, 'grow');

  const additionalInfoCard = card(`${headSm('Additional information')}
    <div style="margin-top:var(--vw-space-md)">
      ${odfDetailRows([
        ['Vendor', d.vendor], ['Frame type', d.frameType], ['Cabinet/Rack no.', d.cabinetRackNo],
        ['Height (U)', d.height], ['Power required', d.powerRequired], ['Environment', d.environment]
      ])}
    </div>`, 'grow');

  /* The real, visible breadcrumb is React's Topbar — it reads this screen's
     crumb chain off src/routes.ts ('Resources · Passive Infrastructure · ODF
     · Element') and swaps the static "Element" leaf for the row action's own
     drill label (this ODF's name), the same convention every other legacy
     detail screen (resource, node, site, …) already relies on. Back lives
     there alone — no second, hand-rolled "Back" button here. */

  return `<div class="page">
    <div class="page-head">
      <div class="stack-x" style="max-width:70ch">
        <div class="row vw-items-center" style="gap:var(--vw-space-sm)">
          <h1 class="vw-page-title" style="margin:0">${esc(r.n)}</h1>
          ${chip('ODF', 'info', true)}
        </div>
        <p class="vw-page-description" style="margin:0">ODF · ${esc(site.name)}</p>
      </div>
      <div class="row"><button class="nst-btn nst-btn--filled nst-btn--sm js-ack">Edit</button></div>
    </div>

    ${statStrip([
      { k:'Status',        v:r.st,                                   s:'', t:r.chip==='success'?'emerald':r.chip==='info'?'sky':'amber' },
      { k:'Total ports',   v:String(r.cap),                          s:'', t:'sky' },
      { k:'Used / Free',   v:`${r.used} / ${free}`,                  s:'', t:'purple' },
      { k:'Lat / Long',    v:`${parseFloat(site.lat).toFixed(4)}, ${parseFloat(site.lon).toFixed(4)}`, s:'', t:'cyan' },
      { k:'Serial number', v:d.serialNumber,                         s:'', t:'slate' },
      { k:'Installation',  v:`${d.installPct}%`,                     s:'', t:d.installPct===100?'emerald':'amber' }
    ])}

    <div class="section-tabs"><button class="stab is-on">Overview</button></div>

    <div class="row-t" style="align-items:stretch">
      ${odfDetailsCard}
      <div class="stack" style="width:min(400px,100%);flex-shrink:0">
        ${portUtilCard}
        ${photosCard}
      </div>
    </div>

    <div class="row-t" style="align-items:stretch;margin-top:var(--vw-space-lg)">
      ${locationCard}
      ${additionalInfoCard}
    </div>
  </div>`;
}

/* ═══ the other six Passive Infrastructure tabs — View details ═══
   Each gets its own body shaped around what actually makes that class of
   record distinct (a rack's elevation, a splice closure's fibre map, an
   OTDR trace for a span, …) rather than reusing the ODF page's card set —
   only the outer chrome (back, header, stat strip, Overview tab) is shared,
   via passiveDetailChrome() below, so every tab still reads as one product. */
/* Back lives in the breadcrumb alone (src/shell/Topbar.tsx already links
   every ancestor of this screen's own crumb chain) — a second "Back" button
   here would just be two controls doing the same thing, so this only ever
   renders the record header, the stat strip and the tab bar. */
function passiveDetailChrome({ name, kind, sub, cells, tabsHtml, dot, badges }) {
  return `<div class="page-head">
      <div class="stack-x" style="max-width:70ch">
        <div class="row vw-items-center" style="gap:var(--vw-space-sm)">
          ${dot ? `<span style="width:9px;height:9px;border-radius:3px;background:${cv(dot,500)};flex-shrink:0"></span>` : ''}
          <h1 class="vw-page-title" style="margin:0">${esc(name)}</h1>
          ${badges ? badges.map(b => chip(b.label, b.tone, true)).join('') : chip(kind, 'info', true)}
        </div>
        <p class="vw-page-description" style="margin:0">${esc(sub)}</p>
      </div>
      <div class="row"><button class="nst-btn nst-btn--filled nst-btn--sm js-ack">Edit</button></div>
    </div>
    ${statStrip(cells)}
    ${tabsHtml || `<div class="section-tabs"><button class="stab is-on">Overview</button></div>`}`;
}

/* ── Rack — View details: an elevation diagram + an occupants table ── */
const RACK_MOUNT = ['19" 4-post open rack', '19" enclosed cabinet', '23" telco rack'];
function buildRackDetail(r, site) {
  const s = r.n;
  const day = nint(s, 2, 1, 27), month = MONTHS_SHORT[nint(s, 3, 0, 11)], year = 2021 + nint(s, 4, 0, 4);
  return {
    id: `rack-${nseed(s).toString(16).padStart(8, '0')}-${nint(s, 5, 1000, 9999)}`,
    mountType: RACK_MOUNT[nint(s, 6, 0, RACK_MOUNT.length - 1)],
    installDate: `${pad2(day)}-${month}-${year}`,
    createdBy: ODF_STAFF[nint(s, 7, 0, ODF_STAFF.length - 1)],
    remarks: `Primary rack at ${site.name}`
  };
}
function rackElevationDetail(r) {
  const rows = [];
  for (let u = r.h; u >= 1; u--) {
    const occ = r.occ.find(o => u >= o[0] && u <= o[1]);
    const isTop = occ && u === occ[1];
    const tone = occ ? (occ[3] === 'rtr' ? 'sky' : occ[3] === 'sw' ? 'emerald' : 'purple') : null;
    rows.push(`<div class="row vw-items-center vw-gap-sm" style="height:22px;border-bottom:1px solid ${cv('slate',100)}">
      <span class="mono" style="width:2.75rem;font-size:0.6875rem;color:${cv('gray',400)};text-align:right;flex-shrink:0">U${u}</span>
      <div style="flex:1;height:16px;border-radius:3px;display:flex;align-items:center;padding:0 8px;min-width:0;
        ${occ ? `background:${cv(tone,100)};border:1px solid ${cv(tone,300)}` : `background:${cv('slate',50)}`}">
        ${isTop ? `<span class="vw-value" style="font-size:0.75rem;color:${cv(tone,700)};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(occ[2])}</span>` : ''}
      </div>
    </div>`);
  }
  return `<div style="max-height:420px;overflow-y:auto;border:1px solid ${cv('slate',200)};border-radius:var(--vw-radius-md);padding:4px 8px">${rows.join('')}</div>`;
}
function viewRackDetail() {
  const rows = PASSIVE.rack;
  const r = rows.find(x => x.n === RACK_ID) || rows[0];
  const site = resolveSite(r.site) || LOCATIONS[0];
  const d = buildRackDetail(r, site);
  const free = r.h - r.used;
  const [kwUsed, kwTotal] = r.kw.split('/').map(x => parseFloat(x));
  const kwPct = kwTotal ? Math.round(kwUsed / kwTotal * 100) : 0;

  const detailsCard = card(`${headSm('Rack details')}
    <div style="margin-top:var(--vw-space-md)">
      ${odfDetailRows([
        ['ID', d.id], ['Type', 'Rack'], ['Name / Code', r.n], ['Site / Location', site.name],
        ['Mount type', d.mountType], ['Height', `${r.h}U`], ['U used', String(r.used)], ['U free', String(free)],
        ['Cooling', r.cool], ['Installed', d.installDate], ['Created by', d.createdBy], ['Remarks', d.remarks]
      ])}
    </div>`, 'grow');

  const elevationCard = card(`${headSm('Rack elevation')}
    <div style="margin-top:var(--vw-space-md)">${rackElevationDetail(r)}</div>
    <div class="legend" style="margin-top:var(--vw-space-sm)">
      <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',300)}"></span>Router</span>
      <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',300)}"></span>Switch</span>
      <span class="legend-i"><span class="legend-sw" style="background:${cv('purple',300)}"></span>ODF / panel</span>
      <span class="legend-i"><span class="legend-sw" style="background:${cv('slate',50)};border:1px solid ${cv('slate',300)}"></span>Free U</span>
    </div>`, 'grow');

  const occupantsCard = card(`${headSm('Occupants')}
    <div style="margin-top:var(--vw-space-md)">
      ${table([{t:'Position'},{t:'Device'},{t:'Type'}],
        r.occ.map(o => [`<span class="mono">U${o[0]}${o[1]>o[0]?'-'+o[1]:''}</span>`, `<span class="vw-value">${esc(o[2])}</span>`,
          chip(o[3]==='rtr'?'Router':o[3]==='sw'?'Switch':'ODF / panel', o[3]==='rtr'?'info':o[3]==='sw'?'success':'purple')]), '', () => [])}
    </div>`, 'grow');

  const powerCard = card(`${headSm('Power draw')}
    <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-md)">
      ${donut([{ n:'Used', c:kwUsed, tone:'amber' }, { n:'Headroom', c:Math.max(0, kwTotal - kwUsed), tone:'slate' }], kwTotal || 1, `${kwPct}%`, 'of rating', 88)}
      <div class="stack-s grow">
        <span class="vw-card-metric-label-sub num">${r.kw} kW</span>
        <div class="hbar-track" style="height:8px;margin-top:2px">
          <span class="hbar-fill" style="display:block;width:${kwPct}%;background:${cv(kwPct>85?'red':kwPct>70?'amber':'emerald',400)}"></span>
        </div>
      </div>
    </div>`);

  const RACK_PHOTOS = [
    ['Rack front view', mediaIllustrationRackFront], ['Asset / rack tag', mediaIllustrationLabelTag]
  ];
  const photosCard = card(`${headSm('Photos')}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--vw-space-md);margin-top:var(--vw-space-md)">
      ${RACK_PHOTOS.map(([n, fn]) => mediaTile(fn(), n, d.installDate, false)).join('')}
    </div>`);

  return `<div class="page">
    ${passiveDetailChrome({ name:r.n, kind:'Rack', sub:`Rack · ${site.name}`,
      cells: [
        { k:'Status', v:r.st, s:'', t:r.chip==='success'?'emerald':r.chip==='error'?'red':'amber' },
        { k:'Height', v:`${r.h}U`, s:'', t:'sky' },
        { k:'U used / free', v:`${r.used} / ${free}`, s:'', t:'purple' },
        { k:'Power', v:`${r.kw} kW`, s:'', t:'amber' },
        { k:'Cooling', v:r.cool, s:'', t:'cyan' },
        { k:'Site', v:site.name, s:'', t:'slate' }
      ]})}
    <div class="row-t" style="align-items:stretch">
      ${detailsCard}
      ${elevationCard}
    </div>
    <div class="row-t" style="align-items:stretch;margin-top:var(--vw-space-lg)">
      ${occupantsCard}
      <div class="stack" style="width:min(360px,100%);flex-shrink:0">
        ${powerCard}
        ${photosCard}
      </div>
    </div>
  </div>`;
}

/* ── Power plant — View details: a test-history table, not a photo grid ── */
function buildPowerDetail(r, site) {
  const s = r.n;
  const day = nint(s, 2, 1, 27), month = MONTHS_SHORT[nint(s, 3, 0, 11)], year = 2021 + nint(s, 4, 0, 4);
  const tests = Array.from({ length: 4 }, (_, i) => {
    const d2 = nint(s, 20 + i, 1, 27), m2 = MONTHS_SHORT[nint(s, 30 + i, 0, 11)], y2 = 2024 + Math.floor(i / 2);
    const marginal = i === 3 && r.chip !== 'success';
    return {
      date: `${pad2(d2)}-${m2}-${y2}`, result: marginal ? 'Marginal' : 'Pass',
      load: `${nint(s, 50 + i, 40, 85)}%`, duration: `${nint(s, 60 + i, 20, 90)} min`,
      by: ODF_STAFF[nint(s, 70 + i, 0, ODF_STAFF.length - 1)]
    };
  });
  return {
    id: `pwr-${nseed(s).toString(16).padStart(8, '0')}-${nint(s, 5, 1000, 9999)}`,
    installDate: `${pad2(day)}-${month}-${year}`,
    createdBy: ODF_STAFF[nint(s, 7, 0, ODF_STAFF.length - 1)],
    nextTest: `${pad2(nint(s, 80, 1, 27))}-${MONTHS_SHORT[nint(s, 81, 0, 11)]}-2027`,
    remarks: `${r.type} serving ${site.name}`,
    tests
  };
}
function viewPowerDetail() {
  const rows = PASSIVE.power;
  const r = rows.find(x => x.n === POWER_ID) || rows[0];
  const site = resolveSite(r.site) || LOCATIONS[0];
  const d = buildPowerDetail(r, site);

  const detailsCard = card(`${headSm('Power unit details')}
    <div style="margin-top:var(--vw-space-md)">
      ${odfDetailRows([
        ['ID', d.id], ['Type', r.type], ['Name / Code', r.n], ['Site / Location', site.name],
        ['Rating', r.rating], ['Runtime', r.runtime], ['Vendor', r.vendor], ['Last tested', r.tested],
        ['Next test due', d.nextTest], ['Installed', d.installDate], ['Created by', d.createdBy], ['Remarks', d.remarks]
      ])}
    </div>`, 'grow');

  const historyCard = card(`${headSm('Test history')}
    <div style="margin-top:var(--vw-space-md)">
      ${table([{t:'Date'},{t:'Result'},{t:'Load'},{t:'Duration'},{t:'Tested by'}],
        d.tests.map(t2 => [`<span class="num">${t2.date}</span>`, chip(t2.result, t2.result==='Pass'?'success':'warning'),
          `<span class="num">${t2.load}</span>`, t2.duration, t2.by]), '', () => [])}
    </div>`, 'grow');

  const lastLoad = parseInt(d.tests[d.tests.length - 1].load, 10) || 0;
  const loadCard = card(`${headSm('Load & capacity')}
    <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-md)">
      ${donut([{ n:'Load', c:lastLoad, tone: lastLoad>85?'red':lastLoad>70?'amber':'emerald' }, { n:'Headroom', c:Math.max(0,100-lastLoad), tone:'slate' }], 100, `${lastLoad}%`, 'last test', 96)}
      <div class="stack-s grow">
        <span class="legend-i"><span class="legend-sw" style="background:${cv(lastLoad>85?'red':lastLoad>70?'amber':'emerald',400)}"></span>Load <span class="vw-value num">${lastLoad}%</span></span>
        <span class="vw-card-metric-label-sub">Rated ${r.rating}</span>
        <span class="vw-card-metric-label-sub">Runtime ${r.runtime}</span>
      </div>
    </div>`, 'grow');

  const POWER_PHOTOS = [[`${r.type} unit`, mediaIllustrationPowerUnit], ['Nameplate / rating label', mediaIllustrationLabelTag]];
  const photosCard = card(`${headSm('Photos')}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--vw-space-md);margin-top:var(--vw-space-md)">
      ${POWER_PHOTOS.map(([n, fn]) => mediaTile(fn(), n, r.tested, false)).join('')}
    </div>`, 'grow');

  return `<div class="page">
    ${passiveDetailChrome({ name:r.n, kind:r.type, sub:`${r.type} · ${site.name}`,
      cells: [
        { k:'Status', v:r.st, s:'', t:r.chip==='success'?'emerald':r.chip==='error'?'red':'amber' },
        { k:'Type', v:r.type, s:'', t:'sky' },
        { k:'Rating', v:r.rating, s:'', t:'purple' },
        { k:'Runtime', v:r.runtime, s:'', t:'cyan' },
        { k:'Last tested', v:r.tested, s:'', t:'emerald' },
        { k:'Vendor', v:r.vendor, s:'', t:'slate' }
      ]})}
    <div class="row-t" style="align-items:stretch">
      ${detailsCard}
      ${historyCard}
    </div>
    <div class="row-t" style="align-items:stretch;margin-top:var(--vw-space-lg)">
      ${loadCard}
      ${photosCard}
    </div>
  </div>`;
}

/* ── Splice closure — View details: a fibre splice map, EIA/TIA-598 colours ── */
const FIBER_COLORS = [
  ['Blue','#2563eb'], ['Orange','#f97316'], ['Green','#16a34a'], ['Brown','#92400e'],
  ['Slate','#64748b'], ['White','#e5e7eb'], ['Red','#dc2626'], ['Black','#111827'],
  ['Yellow','#eab308'], ['Violet','#7c3aed'], ['Rose','#e11d48'], ['Aqua','#06b6d4']
];
function spliceFiberMap(used, total) {
  const cells = [];
  for (let i = 0; i < total; i++) {
    const [fname, hex] = FIBER_COLORS[i % FIBER_COLORS.length];
    const on = i < used;
    cells.push(`<span title="Fibre ${i+1} · ${fname} · ${on?'spliced':'unspliced'}"
      style="display:inline-block;width:14px;height:14px;border-radius:50%;margin:3px;
      background:${on?hex:'transparent'};border:2px solid ${hex}"></span>`);
  }
  return `<div style="display:flex;flex-wrap:wrap;max-width:100%">${cells.join('')}</div>`;
}
function buildSpliceDetail(r, site) {
  const s = r.n;
  const parts = r.fibers.split('/').map(x => parseInt(x, 10));
  const day = nint(s, 2, 1, 27), month = MONTHS_SHORT[nint(s, 3, 0, 11)], year = 2021 + nint(s, 4, 0, 4);
  return {
    id: `spc-${nseed(s).toString(16).padStart(8, '0')}-${nint(s, 5, 1000, 9999)}`,
    used: parts[0], total: parts[1],
    installDate: `${pad2(day)}-${month}-${year}`,
    createdBy: ODF_STAFF[nint(s, 7, 0, ODF_STAFF.length - 1)],
    remarks: `Splice point on ${r.span}`
  };
}
function viewSpliceDetail() {
  const rows = PASSIVE.splice;
  const r = rows.find(x => x.n === SPLICE_ID) || rows[0];
  const site = resolveSite(r.site) || LOCATIONS[0];
  const d = buildSpliceDetail(r, site);

  const detailsCard = card(`${headSm('Splice closure details')}
    <div style="margin-top:var(--vw-space-md)">
      ${odfDetailRows([
        ['ID', d.id], ['Type', r.type], ['Name / Code', r.n], ['Site / Location', site.name],
        ['On span', r.span], ['Housing', r.housing], ['Fibres spliced', r.fibers],
        ['Mean splice loss', r.loss], ['Last surveyed', r.surveyed],
        ['Installed', d.installDate], ['Created by', d.createdBy], ['Remarks', d.remarks]
      ])}
    </div>`, 'grow');

  const mapCard = card(`${headSm('Fibre splice map')}
    <div class="row vw-gap-lg vw-items-start" style="margin-top:var(--vw-space-md)">
      ${donut([{ n:'Spliced', c:d.used, tone:'emerald' }, { n:'Free', c:Math.max(0,d.total-d.used), tone:'slate' }], d.total, `${Math.round(d.used/d.total*100)}%`, 'spliced', 88)}
      <div class="grow">${spliceFiberMap(d.used, d.total)}</div>
    </div>
    <p class="vw-card-metric-label-sub" style="margin-top:var(--vw-space-sm)">${d.used} of ${d.total} fibres spliced — filled = spliced, outline = free, coloured to the EIA/TIA-598 fibre code</p>`, 'grow');

  const SPLICE_PHOTOS = [['Splice tray', mediaIllustrationSpliceTray], ['Closure housing', mediaIllustrationCableBundle], ['Closure label', mediaIllustrationLabelTag]];
  const photosCard = card(`${headSm('Photos')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--vw-space-md);margin-top:var(--vw-space-md)">
      ${SPLICE_PHOTOS.map(([n, fn]) => mediaTile(fn(), n, r.surveyed, false)).join('')}
    </div>`);

  return `<div class="page">
    ${passiveDetailChrome({ name:r.n, kind:'Splice closure', sub:`Splice closure · ${site.name} · on ${r.span}`,
      cells: [
        { k:'Status', v:r.st, s:'', t:r.chip==='success'?'emerald':r.chip==='error'?'red':'amber' },
        { k:'Type', v:r.type, s:'', t:'sky' },
        { k:'Fibres spliced', v:r.fibers, s:'', t:'purple' },
        { k:'Mean splice loss', v:r.loss, s:'', t:'cyan' },
        { k:'Housing', v:r.housing, s:'', t:'amber' },
        { k:'Last surveyed', v:r.surveyed, s:'', t:'slate' }
      ]})}
    <div class="row-t" style="align-items:stretch">
      ${detailsCard}
      ${mapCard}
    </div>
    <div style="margin-top:var(--vw-space-lg)">${photosCard}</div>
  </div>`;
}

/* ── Patch cord — View details: an A-end/B-end connection diagram ── */
function buildCordDetail(r) {
  const s = r.n;
  const day = nint(s, 2, 1, 27), month = MONTHS_SHORT[nint(s, 3, 0, 11)], year = 2022 + nint(s, 4, 0, 3);
  return {
    id: `pc-${nseed(s).toString(16).padStart(8, '0')}-${nint(s, 5, 1000, 9999)}`,
    installDate: `${pad2(day)}-${month}-${year}`,
    createdBy: ODF_STAFF[nint(s, 7, 0, ODF_STAFF.length - 1)],
    remarks: `${r.type} jumper, ${r.a} to ${r.b}`
  };
}
function cordConnectionDiagram(r) {
  const lossNum = parseFloat(r.loss);
  const tone = isNaN(lossNum) ? 'slate' : lossNum <= 0.3 ? 'emerald' : 'amber';
  return `<div class="row vw-items-center" style="margin-top:var(--vw-space-md)">
    <div class="vw-card-child grow" style="padding:var(--vw-space-md);text-align:center">
      <span class="vw-label">A end</span><br><span class="vw-value mono">${esc(r.a)}</span>
    </div>
    <div style="flex:0 0 auto;padding:0 14px;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="width:56px;height:2px;background:${cv(tone,400)}"></div>
      <span class="vw-card-metric-label-sub num" style="color:${cv(tone,700)}">${r.loss}</span>
    </div>
    <div class="vw-card-child grow" style="padding:var(--vw-space-md);text-align:center">
      <span class="vw-label">B end</span><br><span class="vw-value mono">${esc(r.b)}</span>
    </div>
  </div>`;
}
function viewCordDetail() {
  const rows = PASSIVE.cord;
  const r = rows.find(x => x.n === CORD_ID) || rows[0];
  const site = resolveSite(r.site) || LOCATIONS[0];
  const d = buildCordDetail(r);

  const detailsCard = card(`${headSm('Patch cord details')}
    <div style="margin-top:var(--vw-space-md)">
      ${odfDetailRows([
        ['ID', d.id], ['Type', r.type], ['Name / Code', r.n], ['Site / Location', site.name],
        ['A end', r.a], ['B end', r.b], ['Length', r.len], ['Insertion loss', r.loss],
        ['Last surveyed', r.surveyed], ['Installed', d.installDate], ['Created by', d.createdBy], ['Remarks', d.remarks]
      ])}
    </div>`, 'grow');

  const lossNum = parseFloat(r.loss);
  const lossBudget = 0.3;
  const lossPct = isNaN(lossNum) ? 0 : Math.min(100, Math.round(lossNum / lossBudget * 100));
  const lossTone = lossPct > 90 ? 'red' : lossPct > 70 ? 'amber' : 'emerald';
  const diagramCard = card(`${headSm('Connection')}
    ${cordConnectionDiagram(r)}
    <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-lg);padding-top:var(--vw-space-md);border-top:1px solid ${cv('slate',100)}">
      ${donut([{ n:'Used', c:lossPct, tone:lossTone }, { n:'Headroom', c:Math.max(0,100-lossPct), tone:'slate' }], 100, `${lossPct}%`, 'of 0.30 dB', 88)}
      <div class="stack-s grow">
        <span class="vw-label">Loss budget</span>
        <span class="vw-card-metric-label-sub num">${isNaN(lossNum) ? '—' : lossNum.toFixed(2)} dB of 0.30 dB</span>
      </div>
    </div>`, 'grow');

  const CORD_PHOTOS = [['Connector close-up', mediaIllustrationConnectorEnd], ['Cable label', mediaIllustrationLabelTag]];
  const photosCard = card(`${headSm('Photos')}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--vw-space-md);margin-top:var(--vw-space-md)">
      ${CORD_PHOTOS.map(([n, fn]) => mediaTile(fn(), n, r.surveyed, false)).join('')}
    </div>`);

  return `<div class="page">
    ${passiveDetailChrome({ name:r.n, kind:r.type, sub:`Patch cord · ${site.name}`,
      cells: [
        { k:'Status', v:r.st, s:'', t:r.chip==='success'?'emerald':r.chip==='error'?'red':r.chip==='info'?'sky':'amber' },
        { k:'Connector', v:r.type, s:'', t:'sky' },
        { k:'Length', v:r.len, s:'', t:'purple' },
        { k:'Insertion loss', v:r.loss, s:'', t:'cyan' },
        { k:'Last surveyed', v:r.surveyed, s:'', t:'emerald' },
        { k:'Site', v:site.name, s:'', t:'slate' }
      ]})}
    <div class="row-t" style="align-items:stretch">
      ${detailsCard}
      ${diagramCard}
    </div>
    <div style="margin-top:var(--vw-space-lg)">${photosCard}</div>
  </div>`;
}

/* ── Duct — View details: a way-by-way cross-section, not a progress bar ── */
function buildDuctDetail(r) {
  const s = r.n;
  const parts = r.ways.split('/').map(x => parseInt(x, 10));
  const day = nint(s, 2, 1, 27), month = MONTHS_SHORT[nint(s, 3, 0, 11)], year = 2020 + nint(s, 4, 0, 5);
  return {
    id: `dct-${nseed(s).toString(16).padStart(8, '0')}-${nint(s, 5, 1000, 9999)}`,
    used: parts[0], total: parts[1],
    installDate: `${pad2(day)}-${month}-${year}`,
    createdBy: ODF_STAFF[nint(s, 7, 0, ODF_STAFF.length - 1)],
    remarks: `Duct route between ${r.a} and ${r.b}`
  };
}
function ductCrossSection(used, total) {
  const cells = [];
  for (let i = 0; i < total; i++) {
    const on = i < used;
    cells.push(`<div title="Way ${i+1} · ${on?'occupied':'free'}" style="width:34px;height:34px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;margin:4px;font-size:0.6875rem;
      background:${on?cv('purple',100):cv('slate',50)};border:2px solid ${on?cv('purple',400):cv('slate',300)};
      color:${on?cv('purple',700):cv('gray',400)}">${i+1}</div>`);
  }
  return `<div style="display:flex;flex-wrap:wrap">${cells.join('')}</div>`;
}
function viewDuctDetail() {
  const rows = PASSIVE.duct;
  const r = rows.find(x => x.n === DUCT_ID) || rows[0];
  const d = buildDuctDetail(r);

  const detailsCard = card(`${headSm('Duct details')}
    <div style="margin-top:var(--vw-space-md)">
      ${odfDetailRows([
        ['ID', d.id], ['Type', 'Duct'], ['Name / Code', r.n], ['A end', r.a], ['B end', r.b],
        ['Length', r.len], ['Bore', r.bore], ['Ownership', r.own], ['Last surveyed', r.surveyed],
        ['Installed', d.installDate], ['Created by', d.createdBy], ['Remarks', d.remarks]
      ])}
    </div>`, 'grow');

  const crossSectionCard = card(`${headSm('Duct cross-section')}
    <div style="margin-top:var(--vw-space-md)">${ductCrossSection(d.used, d.total)}</div>
    <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-lg);padding-top:var(--vw-space-md);border-top:1px solid ${cv('slate',100)}">
      ${donut([{ n:'Occupied', c:d.used, tone:'purple' }, { n:'Free', c:Math.max(0,d.total-d.used), tone:'slate' }], d.total, `${Math.round(d.used/d.total*100)}%`, 'occupied', 88)}
      <span class="vw-card-metric-label-sub grow">${d.used} of ${d.total} ways occupied — ${r.bore}</span>
    </div>`, 'grow');

  const DUCT_PHOTOS = [['Duct route (trench)', mediaIllustrationTrench], ['Cable entry / gland', mediaIllustrationCableBundle]];
  const photosCard = card(`${headSm('Photos')}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--vw-space-md);margin-top:var(--vw-space-md)">
      ${DUCT_PHOTOS.map(([n, fn]) => mediaTile(fn(), n, r.surveyed, false)).join('')}
    </div>`);

  return `<div class="page">
    ${passiveDetailChrome({ name:r.n, kind:'Duct', sub:`Duct · ${r.a} ↔ ${r.b}`,
      cells: [
        { k:'Status', v:r.st, s:'', t:r.chip==='success'?'emerald':r.chip==='error'?'red':r.chip==='info'?'sky':'amber' },
        { k:'Length', v:r.len, s:'', t:'sky' },
        { k:'Ways used / free', v:r.ways, s:'', t:'purple' },
        { k:'Bore', v:r.bore, s:'', t:'cyan' },
        { k:'Ownership', v:r.own, s:'', t:'emerald' },
        { k:'Last surveyed', v:r.surveyed, s:'', t:'slate' }
      ]})}
    <div class="row-t" style="align-items:stretch">
      ${detailsCard}
      ${crossSectionCard}
    </div>
    <div style="margin-top:var(--vw-space-lg)">${photosCard}</div>
  </div>`;
}

/* ── Fiber span — View details: a full OSP build/ops record, 9 tabs ──
   Deep enough to need its own tab strip rather than the single-card body
   the other five passive tabs get: a build-lifecycle stepper, per-tube
   fibre-core allocation, a chainage/route diagram, cross-references to the
   splice closures actually logged against this span (PASSIVE.splice rows
   share the same `span` naming as these rows' own `n`), OTDR results, field
   media and documents. passiveDetailChrome() is extended with optional
   `badges` / `dot` / `extraButtons` / `tabsHtml` — all opt-in, so the other
   five tabs' pages (which never pass them) render byte-identical to before. */
const TONE_COLOR = { success:'emerald', error:'red', warning:'amber', info:'sky', neutral:'slate' };
const FIBER_MFR = ['Sterlite', 'Prysmian', 'Corning', 'HFCL', 'Finolex'];
const FIBER_INSTALL = ['Buried (direct/duct)', 'Aerial (ADSS)', 'Underground (duct)'];
const CABLE_TYPES = ['G.652D', 'G.654E', 'G.657A1'];
const FIBER_TABS = [
  { k:'overview', n:'Overview' }, { k:'physical', n:'Physical' }, { k:'cores', n:'Fibre cores' },
  { k:'location', n:'Location & GIS' }, { k:'connectivity', n:'Connectivity' }, { k:'tests', n:'Tests (OTDR)' },
  { k:'media', n:'Media' }, { k:'documents', n:'Documents' }, { k:'history', n:'History' }
];

function buildFiberSpanDetail(r) {
  const s = r.n;
  const [usedC, totalC] = r.cores.split('/').map(x => parseInt(x, 10));
  const tubes = Math.max(1, Math.round(totalC / 12) || 1);
  const lenM = String(r.len).match(/[\d,]+/);
  const lenKm = lenM ? parseFloat(lenM[0].replace(/,/g, '')) / 1000 : 0;
  const rag = r.chip === 'error' ? 'Red' : r.chip === 'warning' ? 'Amber' : r.chip === 'info' ? 'Blue' : 'Green';
  const ragTone = rag === 'Red' ? 'error' : rag === 'Amber' ? 'warning' : rag === 'Blue' ? 'info' : 'success';
  /* a span still under active remediation (Degraded/Cut) reads as still-Build
     rather than Live — same thing the reference design's one example showed
     (a Build-phase span that also happens to carry a red RAG flag) — while a
     clean In service span with no length yet (a data gap, not a real state)
     falls back to Build too rather than claiming to be fully live */
  const phase = r.st === 'Planned' ? 'Plan' : (r.chip === 'warning' || r.chip === 'error' || !lenKm) ? 'Build' : 'Live';
  const phaseTone = phase === 'Plan' ? 'info' : phase === 'Build' ? 'warning' : 'success';

  const closures = PASSIVE.splice.filter(sp => sp.span === r.n);
  const closureLoss = closures.map(c => parseFloat(c.loss)).filter(v => !isNaN(v));
  const attNum = parseFloat(r.att);
  const hasLoss = closureLoss.length > 0 || !isNaN(attNum);
  const worstLoss = closureLoss.length ? Math.max(...closureLoss) : (isNaN(attNum) ? 0 : attNum);
  const avgSpliceLoss = closureLoss.length ? closureLoss.reduce((a, b) => a + b, 0) / closureLoss.length : 0;
  const otdrPass = phase !== 'Live' ? 0 : r.chip === 'error' ? 0 : r.chip === 'warning' ? nint(s, 15, 55, 90) : 100;

  const day = nint(s, 2, 1, 27), month = nint(s, 13, 1, 11);
  const year = 2022 + nint(s, 4, 0, 3);
  const buriedPct = nint(s, 6, 80, 99);
  const installMethod = FIBER_INSTALL[nint(s, 60, 0, FIBER_INSTALL.length - 1)];

  return {
    id: `fbr-${nseed(s).toString(16).padStart(8, '0')}-${nint(s, 5, 1000, 9999)}`,
    usedC, totalC, tubes, lenKm, rag, ragTone, phase, phaseTone,
    closures, avgSpliceLoss, worstLoss, worstLossLabel: hasLoss ? `${worstLoss.toFixed(2)} dB` : '—', otdrPass,
    cableType: CABLE_TYPES[nint(s, 8, 0, CABLE_TYPES.length - 1)],
    sheath: nint(s, 9, 0, 1) ? 'LSZH' : 'Armoured HDPE',
    installMethod, buriedPct,
    manufacturer: FIBER_MFR[nint(s, 10, 0, FIBER_MFR.length - 1)],
    drumNo: `DR-${nint(s, 11, 1000, 9999)}`,
    bendRadius: `${[15, 20, 25][nint(s, 12, 0, 2)]} mm`,
    installDate: `${year}-${pad2(month)}-${pad2(day)}`,
    warranty: `${[15, 20, 25][nint(s, 14, 0, 2)]} yr`,
    createdBy: ODF_STAFF[nint(s, 7, 0, ODF_STAFF.length - 1)]
  };
}

function fiberStages(r, d) {
  const survey = { status:'DONE', tone:'success' };
  const permitBad = d.rag === 'Red' || d.rag === 'Amber';
  const permit = { status: permitBad ? 'WARN' : 'DONE', tone: permitBad ? 'error' : 'success' };
  const civil = { status: d.phase === 'Plan' ? 'PENDING' : d.phase === 'Build' ? 'ACTIVE' : 'DONE',
    tone: d.phase === 'Plan' ? 'neutral' : d.phase === 'Build' ? 'info' : 'success' };
  const splicingBad = d.closures.length > 0 && d.worstLoss > 0.15;
  const splicing = { status: d.closures.length === 0 ? 'PENDING' : splicingBad ? 'WARN' : 'DONE',
    tone: d.closures.length === 0 ? 'neutral' : splicingBad ? 'error' : 'success' };
  const otdrStage = { status: d.phase === 'Live' ? 'DONE' : 'PENDING', tone: d.phase === 'Live' ? 'success' : 'neutral' };
  const turnup = { status: d.phase === 'Live' && r.st === 'In service' ? 'DONE' : 'PENDING',
    tone: d.phase === 'Live' && r.st === 'In service' ? 'success' : 'neutral' };
  const leadDays = nint(r.n, 17, 20, 70);
  const chambers = nint(r.n, 18, 2, 4);

  return [
    { key:'survey', n:'Feasibility & route survey', sub:`RAN backhaul · ${r.len}`, by:'Survey · GIS team',
      when:`${d.installDate} 09:30`, quote:'Route surveyed, chainage fixed & design approved', ...survey,
      data:[['Route length', r.len], ['Fibre count', `${d.totalC}F`], ['Install method', d.installMethod], ['Buried %', `${d.buriedPct}%`]],
      checks:['Field / drone route walk', 'Chainage & BoQ fixed', 'Design (HLD/LLD) approved'], checked:[true, true, true] },
    { key:'permit', n:'RoW / wayleave permits', sub:'Municipal Corp', by:'RoW / liaison', when:`${d.installDate} 16:40`,
      quote: permit.status === 'WARN' ? `At risk — ${leadDays}d lead past on-air` : 'Permit cleared on schedule', ...permit,
      data:[['Authority', 'Municipal Corp'], ['Permit', `ROW-${String(nint(r.n, 16, 1, 99999)).padStart(5, '0')}`],
        ['Status', permit.status === 'WARN' ? 'Under review' : 'Cleared'], ['Lead time', `${leadDays}d`]],
      checks:['Application filed', 'Fees paid & clearance', 'Reinstatement bond lodged'], checked:[true, true, true] },
    { key:'civil', n:'Civil — trenching / duct / cable pull', sub:d.installMethod,
      by: civil.status === 'PENDING' ? '—' : 'Civil contractor',
      when: civil.status === 'ACTIVE' ? 'in progress' : civil.status === 'DONE' ? `${d.installDate} 12:00` : 'not started',
      quote: civil.status === 'ACTIVE' ? 'Trenching under way' : civil.status === 'DONE' ? 'Cable pulled and as-built captured' : 'Awaiting permit clearance',
      ...civil, data:[['Method', d.installMethod], ['Buried %', `${d.buriedPct}%`], ['Chambers / MH', String(chambers)], ['Cable', d.cableType]],
      checks:['Trench depth / cover ≥ 1.0 m', 'Duct integrity (mandrel)', 'Cable pulled & as-built'],
      checked: civil.status === 'DONE' ? [true, true, true] : civil.status === 'ACTIVE' ? [true, true, false] : [false, false, false] },
    { key:'splicing', n:'Splicing & closure sealing', sub:`${d.closures.length} closure(s)`,
      by: d.closures.length ? ODF_STAFF[nint(r.n, 19, 0, ODF_STAFF.length - 1)] : '—',
      when: d.closures.length ? `${d.installDate} 12:00` : 'pending civil',
      quote: splicing.status === 'WARN' ? `${d.closures.length} closure(s) over 0.15 dB — re-splice`
        : splicing.status === 'DONE' ? 'All closures within loss budget' : 'No closures logged yet', ...splicing,
      data:[['Closures', String(d.closures.length)], ['Avg splice loss', d.closures.length ? `${d.avgSpliceLoss.toFixed(2)} dB` : '—'],
        ['Worst splice loss', d.worstLossLabel], ['Budget', 'over 0.15 dB']],
      checks:['Splice loss < 0.15 dB', 'Tray dressing & bend radius', 'Closure pressure-sealed'],
      checked: splicing.status === 'DONE' ? [true, true, true] : [false, false, false] },
    { key:'otdr', n:'OTDR / ATP acceptance', sub: d.phase === 'Live' ? 'accepted' : 'pending test window',
      by: d.phase === 'Live' ? ODF_STAFF[nint(r.n, 20, 0, ODF_STAFF.length - 1)] : '—',
      when: d.phase === 'Live' ? r.otdr : 'pending',
      quote: d.phase === 'Live' ? 'Both directions within loss budget' : 'Awaiting splicing completion', ...otdrStage,
      data:[['Traces', d.phase === 'Live' ? String(d.totalC * 2) : '0'], ['Pass rate', `${d.otdrPass}%`],
        ['Worst dB/km', r.att], ['Wavelengths', '1310 / 1550 nm']],
      checks:['Both directions captured', 'Within link-loss budget', 'No failing events'],
      checked: otdrStage.status === 'DONE' ? [true, true, true] : [false, false, false] },
    { key:'turnup', n:'Service turn-up (RFS)', sub: turnup.status === 'DONE' ? 'live' : 'pending turn-up',
      by: turnup.status === 'DONE' ? ODF_STAFF[nint(r.n, 21, 0, ODF_STAFF.length - 1)] : '—',
      when: turnup.status === 'DONE' ? r.otdr : 'pending',
      quote: turnup.status === 'DONE' ? 'All gates green — handed over' : 'Awaiting OTDR acceptance', ...turnup,
      data:[['State', turnup.status === 'DONE' ? 'Live' : 'Pending'], ['Cores live', `${d.usedC}/${d.totalC}`],
        ['RFS', turnup.status === 'DONE' ? r.otdr : '—'], ['Handover pack', turnup.status === 'DONE' ? 'Signed' : '—']],
      checks:['All gates green', 'NMS / assurance onboarded', 'Handover pack signed'],
      checked: turnup.status === 'DONE' ? [true, true, true] : [false, false, false] }
  ];
}

function fiberStageCard(stage, idx) {
  const tone = TONE_COLOR[stage.tone] || 'slate';
  return `<div style="padding:var(--vw-space-lg) 0;${idx > 0 ? `border-top:1px solid ${cv('slate',100)}` : ''}">
    <div class="row vw-justify-between vw-items-start" style="gap:var(--vw-space-md)">
      <div class="row vw-gap-md vw-items-start" style="min-width:0">
        <span style="flex-shrink:0;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          background:${stage.status==='PENDING'?cv('slate',100):cv(tone,500)};color:${stage.status==='PENDING'?cv('gray',500):'white'};font-size:0.75rem;font-weight:600">${stage.status==='DONE'?'✓':idx+1}</span>
        <div style="min-width:0">
          <div class="vw-value" style="font-weight:600">${esc(stage.n)}</div>
          <div class="vw-card-metric-label-sub">${esc(stage.sub)}</div>
          <div class="vw-card-metric-label-sub" style="margin-top:2px">by ${esc(stage.by)} · ${esc(stage.when)}</div>
          <div class="vw-card-description" style="font-style:italic;margin-top:4px">"${esc(stage.quote)}"</div>
        </div>
      </div>
      ${chip(stage.status, stage.tone)}
    </div>
    <div class="vw-card-child-shaded" style="margin-top:var(--vw-space-md);padding:var(--vw-space-sm) var(--vw-space-md)">
      ${stage.data.map(([k, v]) => `<div class="row vw-justify-between" style="padding:3px 0">
        <span class="vw-label">${esc(k)}</span><span class="vw-value">${esc(v)}</span></div>`).join('')}
    </div>
    <div class="stack-s" style="margin-top:var(--vw-space-sm)">
      ${stage.checks.map((c, i) => `<div class="row vw-gap-sm vw-items-center">
        <span style="width:14px;height:14px;border:1.5px solid ${stage.checked[i]?cv('emerald',500):cv('slate',300)};border-radius:3px;
          background:${stage.checked[i]?cv('emerald',500):'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${stage.checked[i] ? '<span style="color:white;font-size:10px;line-height:1">✓</span>' : ''}</span>
        <span class="vw-card-description">${esc(c)}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function fiberPhysicalTab(r, d) {
  const detailsCard = card(`${headSm('Cable & construction')}
    <div class="site-meta" style="grid-template-columns:1fr 1fr;margin-top:var(--vw-space-lg)">
      ${[['Cable type', d.cableType], ['Fibre count', `${d.totalC}F (${d.tubes} × 12-fibre tubes)`],
         ['Sheath / armour', d.sheath], ['Install method', d.installMethod],
         ['Buried %', `${d.buriedPct}%`], ['Route length', r.len],
         ['Manufacturer', d.manufacturer], ['Drum / reel no.', d.drumNo],
         ['Bend radius', d.bendRadius], ['Installed', d.installDate],
         ['Warranty', d.warranty], ['Owner / O&M', r.own === 'Own' ? 'Self-owned' : `Leased — ${d.manufacturer}`]]
        .map(([k, v]) => `<div class="meta-cell" style="padding:10px 0;border-top:1px solid ${cv('slate',100)}">
          <span class="vw-label">${esc(k)}</span><span class="vw-value" style="margin-top:2px">${esc(v)}</span></div>`).join('')}
    </div>`, 'grow');

  const fillPct = d.totalC ? Math.round(d.usedC / d.totalC * 100) : 0;
  const utilCard = card(`${headSm('Core utilisation')}
    <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-md)">
      ${donut([{ n:'Live', c:d.usedC, tone:'sky' }, { n:'Spare', c:Math.max(0,d.totalC-d.usedC), tone:'slate' }], d.totalC, `${fillPct}%`, 'live', 96)}
      <div class="stack-s grow">
        <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',400)}"></span>Live <span class="vw-value num">${d.usedC}</span></span>
        <span class="legend-i"><span class="legend-sw" style="background:${cv('slate',300)}"></span>Spare <span class="vw-value num">${Math.max(0,d.totalC-d.usedC)}</span></span>
      </div>
    </div>`);

  const photoCard = card(`${headSm('Photos')}
    <div style="margin-top:var(--vw-space-md)">${mediaTile(mediaIllustrationCableBundle(), 'Cable cross-section', d.installDate, false)}</div>`);

  return `<div class="row-t" style="align-items:stretch">
    ${detailsCard}
    <div class="stack" style="width:min(320px,100%);flex-shrink:0">
      ${utilCard}
      ${photoCard}
    </div>
  </div>`;
}

function fiberCoresTab(r, d) {
  const total = d.totalC, liveCount = Math.min(d.usedC, total);
  const reservedCount = Math.min(total - liveCount, nint(r.n, 25, 0, 2));
  const faultyCount = r.chip === 'error' ? Math.min(total - liveCount - reservedCount, 1) : 0;
  const spareCount = Math.max(0, total - liveCount - reservedCount - faultyCount);
  const CORE_TONE = { Live:'#2563eb', Reserved:'#f59e0b', Spare:'#cbd5e1', Faulty:'#dc2626' };
  const statusFor = i => i < liveCount ? 'Live' : i < liveCount + reservedCount ? 'Reserved'
    : i < liveCount + reservedCount + faultyCount ? 'Faulty' : 'Spare';
  const tubeRows = [];
  for (let t = 0; t < d.tubes; t++) {
    const cells = [];
    for (let i = 0; i < 12; i++) {
      const idx = t * 12 + i;
      if (idx >= total) break;
      const st = statusFor(idx);
      const [fname, hex] = FIBER_COLORS[i % FIBER_COLORS.length];
      cells.push(`<span title="F${idx+1} · ${fname} · ${st}" style="display:inline-flex;align-items:center;justify-content:center;
        width:34px;height:26px;margin:3px;border-radius:5px;font-size:0.625rem;font-weight:600;
        background:${st==='Spare'?'#fff':hex+'1f'};border:2px solid ${CORE_TONE[st]};color:${st==='Spare'?cv('gray',400):hex}">F${idx+1}</span>`);
    }
    tubeRows.push(`<div class="row vw-items-center vw-gap-sm" style="margin-top:10px">
      <span class="vw-label" style="width:4rem;flex-shrink:0">Tube ${t+1}</span>
      <div style="display:flex;flex-wrap:wrap">${cells.join('')}</div>
    </div>`);
  }
  return card(`${headSm('Fibre-core allocation')}
    <p class="vw-card-description" style="margin-top:2px">Per-strand status, service assignment and splice loss — the planner's spare-capacity view</p>
    <div class="legend" style="margin-top:var(--vw-space-md)">
      <span class="legend-i"><span class="legend-sw" style="background:${CORE_TONE.Live}"></span>Live · ${liveCount}</span>
      <span class="legend-i"><span class="legend-sw" style="background:${CORE_TONE.Reserved}"></span>Reserved · ${reservedCount}</span>
      <span class="legend-i"><span class="legend-sw" style="background:${CORE_TONE.Spare}"></span>Spare · ${spareCount}</span>
      <span class="legend-i"><span class="legend-sw" style="background:${CORE_TONE.Faulty}"></span>Faulty · ${faultyCount}</span>
    </div>
    ${tubeRows.join('')}`);
}

function fiberLocationTab(r, d) {
  if (!d.lenKm) {
    return card(`${headSm('Chainage schedule')}
      <div class="vw-card-child-shaded vw-card-description" style="margin-top:var(--vw-space-md);padding:var(--vw-space-lg);text-align:center">
        Route not yet surveyed to chainage — this span is still ${d.phase === 'Plan' ? 'planned' : 'in build'}.</div>`);
  }
  const chamberCount = nint(r.n, 18, 2, 3);
  const siteCode = r.a.split(/[- ]/)[0];
  const slots = chamberCount + d.closures.length + 1;
  const waypoints = [{ km:0, label:r.a, sub:'End A', tag:'TERMINATED', tone:'purple', above:false }];
  for (let i = 0; i < chamberCount; i++) {
    waypoints.push({ km:+(d.lenKm * (i + 1) / slots).toFixed(2), label:`MH-${siteCode}-${i+1}`, sub:'Chamber', tag:'OK', tone:'success', above: i % 2 === 0 });
  }
  d.closures.forEach((c, i) => {
    const bad = parseFloat(c.loss) > 0.15;
    waypoints.push({ km:+(d.lenKm * (chamberCount + i + 1) / slots).toFixed(2), label:c.n, sub:'Closure',
      tag: bad ? 'OVER BUDGET' : 'OK', tone: bad ? 'error' : 'success', above:true });
  });
  waypoints.push({ km:d.lenKm, label:r.b, sub:'End B', tag:'TERMINATED', tone:'purple', above:false });
  waypoints.sort((a, b) => a.km - b.km);

  const diagram = `<div style="position:relative;height:100px;margin:28px 20px 12px">
    <div style="position:absolute;top:50px;left:0;right:0;height:3px;background:${cv('emerald',400)}"></div>
    ${waypoints.map(w => {
      const pct = Math.min(100, Math.max(0, w.km / d.lenKm * 100));
      return `<div style="position:absolute;top:0;bottom:0;left:${pct}%;transform:translateX(-50%);width:120px;text-align:center">
        ${w.above ? `<div style="font-size:0.6875rem;color:${cv('gray',500)};position:absolute;top:0;left:0;right:0">${w.km} km<br>${esc(w.label)}</div>` : ''}
        <span style="position:absolute;top:44px;left:50%;transform:translateX(-50%);width:12px;height:12px;border-radius:50%;
          background:${cv(w.tone,500)};border:2px solid white;box-shadow:0 0 0 1.5px ${cv(w.tone,300)}"></span>
        ${!w.above ? `<div style="font-size:0.6875rem;color:${cv('gray',500)};position:absolute;top:62px;left:0;right:0">${esc(w.label)}<br>${w.km} km</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
  const region = /delhi|ndls/i.test(r.a + r.b) ? 'North' : /chennai|mas|vja|indr|hyd/i.test(r.a + r.b) ? 'South' : 'West';

  return `${card(`${headSm('Chainage schedule')}
    <p class="vw-card-description" style="margin-top:2px">Closures, chambers and terminations along the route</p>
    ${diagram}
    <div style="margin-top:var(--vw-space-md)">
      ${waypoints.map(w => `<div class="row vw-justify-between vw-items-center" style="padding:8px 0;border-top:1px solid ${cv('slate',100)}">
        <span class="mono" style="width:5rem;flex-shrink:0;color:${cv('gray',500)}">${w.km} km</span>
        <span class="vw-label" style="width:6rem;flex-shrink:0">${w.sub}</span>
        <span class="vw-value grow">${esc(w.label)}</span>
        <span style="font-size:0.75rem;font-weight:600;color:${cv(w.tone,700)}">${w.tag}</span>
      </div>`).join('')}
    </div>`)}
  ${card(`${headSm('Geographic')}
    <div class="site-meta" style="grid-template-columns:1fr 1fr;margin-top:var(--vw-space-lg)">
      ${[['Region', region], ['City / area', r.a], ['End A', r.a], ['End B', r.b],
         ['POP / anchor', `POP-${region.slice(0,3).toUpperCase()}-${String(nint(r.n,26,1,20)).padStart(2,'0')}`], ['Route length', r.len]]
        .map(([k, v]) => `<div class="meta-cell" style="padding:10px 0;border-top:1px solid ${cv('slate',100)}">
          <span class="vw-label">${esc(k)}</span><span class="vw-value" style="margin-top:2px">${esc(v)}</span></div>`).join('')}
    </div>`)}`;
}

function fiberConnectivityTab(r, d) {
  return `${card(`${headSm(`Splice closures · ${d.closures.length}`)}
    <p class="vw-card-description" style="margin-top:2px">Passive joints on this span</p>
    ${d.closures.length ? d.closures.map(c => `<div class="row vw-justify-between vw-items-center" style="padding:var(--vw-space-md) 0;border-top:1px solid ${cv('slate',100)}">
        <div style="min-width:0">
          <div class="vw-value" style="font-weight:600">${esc(c.n)} · ${esc(c.type.split(' ')[0])}</div>
          <div class="vw-card-metric-label-sub">${esc(c.fibers)}F · avg ${esc(c.loss)} · splicer ${esc(ODF_STAFF[nint(c.n,1,0,ODF_STAFF.length-1)])}</div>
        </div>
        <span style="font-weight:600;flex-shrink:0;color:${cv(parseFloat(c.loss)>0.15?'red':'emerald',700)}">max ${esc(c.loss)}</span>
      </div>`).join('')
      : `<div class="vw-card-child-shaded vw-card-description" style="margin-top:var(--vw-space-md);padding:var(--vw-space-lg);text-align:center">No splice closures logged on this span yet.</div>`}`)}
  ${card(`${headSm('Cross-domain references')}
    <p class="vw-card-description" style="margin-top:2px">This RAN-backhaul span feeds a gNB</p>
    <div class="stack-s" style="margin-top:var(--vw-space-md)">
      <div class="vw-card-child row vw-justify-between vw-items-center" style="padding:var(--vw-space-md)">
        <span class="vw-value">Golden thread · DMD-${2020+nint(r.n,27,4,6)}-${String(nint(r.n,28,10000,99999))}</span>
        <span style="color:${cv('gray',400)}">→</span>
      </div>
      <div class="vw-card-child row vw-justify-between vw-items-center" style="padding:var(--vw-space-md)">
        <span class="vw-value">Open site in RAN</span>
        <span style="color:${cv('gray',400)}">→</span>
      </div>
    </div>`)}`;
}

function fiberTestsTab(r, d) {
  if (d.phase !== 'Live') {
    return card(`${headSm('OTDR / ATP results · 0')}
      <p class="vw-card-description" style="margin-top:2px">Per-fibre acceptance measurements</p>
      <div class="vw-card-child-shaded vw-card-description" style="margin-top:var(--vw-space-md);padding:var(--vw-space-lg);text-align:center">
        No OTDR tests recorded yet — attaches once the span reaches Test/Accept.</div>`);
  }
  const rows = Array.from({ length: Math.min(6, d.usedC || 1) }, (_, i) => {
    const loss = +(0.05 + nint(r.n, 40 + i, 0, 20) / 100).toFixed(2);
    return { fibre:`F${i+1}`, dir: i % 2 ? 'B → A' : 'A → B', loss, result: loss <= 0.3 ? 'Pass' : 'Fail' };
  });
  return card(`${headSm(`OTDR / ATP results · ${rows.length}`)}
    <p class="vw-card-description" style="margin-top:2px">Per-fibre acceptance measurements</p>
    <div style="margin-top:var(--vw-space-md)">
      ${table([{t:'Fibre'},{t:'Direction'},{t:'Length'},{t:'Loss'},{t:'Result'}],
        rows.map(t2 => [`<span class="mono">${t2.fibre}</span>`, t2.dir, r.len, `<span class="num">${t2.loss} dB</span>`,
          chip(t2.result, t2.result==='Pass'?'success':'error')]), '', () => [])}
    </div>`);
}

/* Custom line-art illustrations stand in for field photography here — the
   app has no photo library anywhere, so these are drawn, not sourced. */
function mediaIllustrationTrench() {
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block">
    <rect width="200" height="120" fill="#c99a5b"/><rect y="72" width="200" height="48" fill="#8a6d3b"/>
    <path d="M0 80 L88 80 L112 96 L200 96" stroke="#3f2f1a" stroke-width="9" fill="none"/>
    <rect x="58" y="36" width="42" height="30" rx="3" fill="#facc15"/><rect x="72" y="16" width="6" height="24" fill="#facc15"/>
    <circle cx="60" cy="67" r="8" fill="#1f2937"/><circle cx="98" cy="67" r="8" fill="#1f2937"/>
  </svg>`;
}
function mediaIllustrationSpliceTray() {
  const lines = Array.from({ length: 12 }, (_, i) => {
    const [, hex] = FIBER_COLORS[i % FIBER_COLORS.length], y = 8 + i * 8;
    return `<path d="M0 ${y} Q100 ${58+i*3} 200 ${y-18+i*2}" stroke="${hex}" stroke-width="1.6" fill="none" opacity="0.9"/>`;
  }).join('');
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block"><rect width="200" height="120" fill="#0b1220"/>${lines}</svg>`;
}
function mediaIllustrationTower() {
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block">
    <defs><linearGradient id="fbrSky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>
    <rect width="200" height="120" fill="url(#fbrSky1)"/>
    <path d="M100 15 L80 110 L120 110 Z" fill="none" stroke="#334155" stroke-width="2.5"/>
    <path d="M88 75 L112 75 M84 92 L116 92" stroke="#334155" stroke-width="2"/><circle cx="100" cy="10" r="3" fill="#ef4444"/>
  </svg>`;
}
function mediaIllustrationDrone() {
  return `<svg viewBox="0 0 200 120" style="width:100%;height:100%;display:block">
    <defs><linearGradient id="fbrSky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#bae6fd"/></linearGradient></defs>
    <rect width="200" height="120" fill="url(#fbrSky2)"/>
    <path d="M60 20 L44 110 L76 110 Z" fill="none" stroke="#1e293b" stroke-width="2"/>
    <path d="M150 30 L136 110 L164 110 Z" fill="none" stroke="#1e293b" stroke-width="2"/>
    <path d="M76 108 L136 108" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="3 3"/>
  </svg>`;
}
function mediaTile(illustrationHtml, title, meta, isVideo) {
  return `<div class="stack-x">
    <div style="position:relative;aspect-ratio:4/3;border-radius:var(--vw-radius-md);overflow:hidden">
      ${illustrationHtml}
      <span style="position:absolute;top:8px;left:8px;background:rgba(15,23,42,0.75);color:#fff;font-size:0.625rem;
        font-weight:600;letter-spacing:0.04em;padding:2px 8px;border-radius:4px;text-transform:uppercase">${isVideo?'Video':'Photo'}</span>
      ${isVideo ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
        <span style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#0f172a"><path d="M8 5v14l11-7z"/></svg></span></span>` : ''}
    </div>
    <span class="vw-value" style="font-size:0.8125rem;font-weight:500">${esc(title)}</span>
    <span class="vw-card-metric-label-sub">${esc(meta)}</span>
  </div>`;
}
function fiberMediaTab(r, d) {
  const items = [
    mediaTile(mediaIllustrationTrench(), 'Route trench — chainage 0.4 km', `Field · ${ODF_STAFF[nint(r.n,30,0,ODF_STAFF.length-1)]} · ${nint(r.n,31,2,6)}d ago`, false),
    mediaTile(mediaIllustrationSpliceTray(), d.closures.length ? `Splice tray — ${d.closures[0].n}` : 'Splice tray', `Splicer · ${ODF_STAFF[nint(r.n,32,0,ODF_STAFF.length-1)]} · ${nint(r.n,33,2,6)}d ago`, false),
    mediaTile(mediaIllustrationTower(), 'Cable label / drum tag', `QA · ${ODF_STAFF[nint(r.n,34,0,ODF_STAFF.length-1)]} · ${nint(r.n,35,2,6)}d ago`, false),
    mediaTile(mediaIllustrationDrone(), 'Route walk (drone) — full span', `Survey · GIS team · ${nint(r.n,36,4,8)}d ago`, true)
  ];
  return card(`${headSm('Photos & videos')}
    <p class="vw-card-description" style="margin-top:2px">Geo-tagged field capture — route, splice trays, labels, drone walk</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--vw-space-md);margin-top:var(--vw-space-md)">
      ${items.join('')}
    </div>`);
}

function fiberDocumentsTab(r, d) {
  const ICON_TONE = { DWG:'cyan', PDF:'red', CERT:'amber' };
  const docs = [
    { icon:'DWG', name:`As-built route drawing — ${r.n}`, meta:`DWG · 3.4 MB · ${d.installDate}`, status:'Approved' },
    { icon:'PDF', name:`Cable datasheet (${d.cableType})`, meta:`PDF · 820 KB · ${d.installDate}`, status:'Approved' },
    { icon:'CERT', name:`RoW permit — ROW-${String(nint(r.n,16,1,99999)).padStart(5,'0')}`, meta:`CERT · 1.1 MB · ${d.installDate}`,
      status: d.rag === 'Red' ? 'Pending' : 'Approved' }
  ];
  return card(`${headSm('Associated documents')}
    <p class="vw-card-description" style="margin-top:2px">As-builts, OTDR traces, permits, certificates, handover</p>
    <div style="margin-top:var(--vw-space-md)">
      ${docs.map(doc => `<div class="row vw-justify-between vw-items-center" style="padding:var(--vw-space-md) 0;border-top:1px solid ${cv('slate',100)}">
        <div class="row vw-gap-sm vw-items-center" style="min-width:0">
          <span style="width:28px;height:28px;border-radius:6px;background:${cv(ICON_TONE[doc.icon],100)};color:${cv(ICON_TONE[doc.icon],700)};
            display:flex;align-items:center;justify-content:center;font-size:0.5625rem;font-weight:700;flex-shrink:0">${doc.icon}</span>
          <div style="min-width:0">
            <div class="vw-value" style="font-weight:500">${esc(doc.name)}</div>
            <div class="vw-card-metric-label-sub">${esc(doc.meta)}</div>
          </div>
        </div>
        <div class="row vw-gap-sm vw-items-center" style="flex-shrink:0">
          ${chip(doc.status.toUpperCase(), doc.status==='Approved'?'success':'warning')}
          <button class="nst-btn nst-btn--xs js-ack">Open</button>
        </div>
      </div>`).join('')}
    </div>`);
}

function fiberHistoryTab(stages) {
  const STATUS_ICON = { DONE:'✓', WARN:'!', ACTIVE:'●', PENDING:'○' };
  return card(`${headSm('Build lifecycle')}
    <p class="vw-card-description" style="margin-top:2px">Stage transitions from survey to service turn-up</p>
    <div style="margin-top:var(--vw-space-lg)">
      ${stages.map((st, i) => {
        const tone = TONE_COLOR[st.tone] || 'slate';
        const ago = st.status === 'PENDING' ? '—' : st.status === 'ACTIVE' ? 'in progress' : `${6-i}w ago`;
        return `<div class="row vw-justify-between vw-items-start" style="padding:var(--vw-space-md) 0;${i>0?`border-top:1px solid ${cv('slate',100)}`:''}">
          <div class="row vw-gap-sm vw-items-start" style="min-width:0">
            <span style="width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
              background:${st.status==='PENDING'?cv('slate',100):cv(tone,500)};color:${st.status==='PENDING'?cv('gray',400):'white'};font-size:0.625rem">${STATUS_ICON[st.status]}</span>
            <div style="min-width:0">
              <div class="vw-value" style="font-weight:500">${esc(st.n)}</div>
              ${st.status==='ACTIVE' ? `<div class="vw-card-metric-label-sub">in progress</div>` : ''}
              ${st.status==='WARN' ? `<div class="vw-card-metric-label-sub" style="color:${cv('red',600)}">⚠ ${esc(st.quote)}</div>` : ''}
            </div>
          </div>
          <span class="vw-card-metric-label-sub" style="flex-shrink:0">${ago}</span>
        </div>`;
      }).join('')}
    </div>`);
}

function viewFiberDetail() {
  const rows = PASSIVE.fiber;
  const r = rows.find(x => x.n === FIBER_ID) || rows[0];
  const d = buildFiberSpanDetail(r);
  const stages = fiberStages(r, d);
  const tab = FIBER_TABS.some(t => t.k === FIBER_TAB) ? FIBER_TAB : 'overview';
  const tabLabel = { cores:`Fibre cores · ${d.totalC}F`, media:'Media · 4', documents:'Documents · 3' };
  const tabsHtml = `<div class="section-tabs">${FIBER_TABS.map(t =>
    `<button class="stab${t.k===tab?' is-on':''}" data-fibertab="${t.k}">${tabLabel[t.k] || t.n}</button>`).join('')}</div>`;

  const body = tab === 'overview'
    ? card(`${headSm('OSP build lifecycle')}
        <p class="vw-card-description" style="margin-top:2px">The whole span-requested → RFS journey in one view — stage, owner, date, remark + captured evidence</p>
        <div style="margin-top:var(--vw-space-md)">${stages.map((st, i) => fiberStageCard(st, i)).join('')}</div>`)
    : tab === 'physical' ? fiberPhysicalTab(r, d)
    : tab === 'cores' ? fiberCoresTab(r, d)
    : tab === 'location' ? fiberLocationTab(r, d)
    : tab === 'connectivity' ? fiberConnectivityTab(r, d)
    : tab === 'tests' ? fiberTestsTab(r, d)
    : tab === 'media' ? fiberMediaTab(r, d)
    : tab === 'documents' ? fiberDocumentsTab(r, d)
    : fiberHistoryTab(stages);

  return `<div class="page">
    ${passiveDetailChrome({ name:r.n, kind:d.phase, sub:`OFC span · RAN backhaul · ${r.a} → ${r.b} · ${r.len}`,
      dot: TONE_COLOR[d.ragTone], badges:[{ label:d.phase, tone:d.phaseTone }, { label:`RAG · ${d.rag}`, tone:d.ragTone }],
      cells: [
        { k:'Fibres', v:`${d.totalC}F`, s:'', t:'sky' },
        { k:'Live / Spare', v:`${d.usedC} / ${d.totalC-d.usedC}`, s:'', t:'purple' },
        { k:'Closures', v:String(d.closures.length), s:'', t:'cyan' },
        { k:'Worst loss', v:d.worstLossLabel, s:'', t:d.worstLoss>0.15?'red':'emerald' },
        { k:'OTDR pass', v:`${d.otdrPass}%`, s:'', t:d.otdrPass===100?'emerald':'amber' }
      ], tabsHtml })}
    ${body}
  </div>`;
}
