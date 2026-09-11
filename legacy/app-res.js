/* ═══ Resource detail ═══ */
let RES_ID = 'NDLS-J960-P_R1-T1-NR', RES_TAB = 'overview', IF_FILTER = 'all', NBR_TAB = 'lldp', RES_HIST_FILTER = 'All';
let RES_ENB_TAB = 'cell'; /* which tab is open on an eNodeB's own View details page — see viewEnodebResource() */
let RES_SW_TAB = 'hardware'; /* which tab is open on a Switch's own View details page — see viewSwitchResource() */
let RES_DW_TAB = 'hardware'; /* which tab is open on a DWDM's own View details page — see viewDwdmResource() */
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
        i => [siteA(rows[i].site || rows[i].n)])
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
