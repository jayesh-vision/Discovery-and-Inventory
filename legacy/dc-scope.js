/* ═══ Data center solution (?solution=datacenter) ═══════════════════════════════
   The React shell sets window.__nsSolution, window.__dcSum (the per-data-center summary) and
   window.__dcScope (facilities, devices, GPU servers; see src/data/dc/scope.ts) before this script
   runs. In the default Inventory none of that exists and every helper here hands its argument back
   untouched, so the estate's own data is exactly what it always was.
   In the data center solution the same screens draw from the data centers' records: the roster,
   the location counts, each site's real devices, capex/opex and open risks. What the data center
   records do not hold (VNFs, the passive plant of the estate) is empty rather than borrowed from the estate. */
const DC_ON = typeof window !== 'undefined' && window.__nsSolution === 'datacenter' && !!window.__dcSum && !!window.__dcScope;
const dcSumOf = id => DC_ON ? window.__dcSum.find(d => d.id === id) : null;
const dcFacOf = id => DC_ON ? window.__dcScope.facOf(id) : null;

/* the currency of the site whose page is open: a US site's capex and opex are in dollars. Rupees everywhere else. */
function dcCur() {
  if (!DC_ON) return 'INR';
  const m = location.pathname.match(/\/site\/([^/]+)/);
  return (m && dcSumOf(decodeURIComponent(m[1])) || {}).currency || 'INR';
}

/* ── location roster and counts ── */
const dcSplitOf = rows => ({ total: rows.length, live: rows.filter(d => d.status === 'on-air').length, building: rows.filter(d => d.status === 'in-progress').length,
  planned: rows.filter(d => d.status === 'planned').length, failed: rows.filter(d => d.status === 'failed').length });
function dcRoster(def) { return DC_ON ? window.__dcSum.map(d => d.location) : def; }
function dcIL(def) {
  if (!DC_ON) return def;
  const S = window.__dcSum, sum = f => S.reduce((a, d) => a + f(d), 0);
  return { locations: S.length, central: S.length, regional: 0, edge: 0, ne: sum(d => d.devices), discovered: sum(d => d.discovered), links: sum(d => d.links), services: sum(d => d.services), vnf: 0, inactive: 0, reports: 0 };
}
function dcLocTiers(def) {
  if (!DC_ON) return def;
  const s = dcSplitOf(window.__dcSum), none = { c: 0, planned: 0, building: 0, live: 0, failed: 0 };
  return [{ ...def[0], c: s.total, planned: s.planned, building: s.building, live: s.live, failed: s.failed }, { ...def[1], ...none }, { ...def[2], ...none }];
}
function dcLocTypes(def) {
  if (!DC_ON) return def;
  const s = dcSplitOf(window.__dcSum), none = { total: 0, live: 0, building: 0, planned: 0, failed: 0 };
  return [{ ...def[0], ...s }, { ...def[1], ...none }, { ...def[2], ...none }];
}
function dcLocGeo(def) {
  if (!DC_ON) return def;
  return def.filter(g => window.__dcSum.some(d => d.circleId === g.c)).map(g => {
    const ds = window.__dcSum.filter(d => d.circleId === g.c), s = dcSplitOf(ds);
    return { ...g, tot: s.total, live: s.live, build: s.building, fail: s.failed };
  });
}
function dcLocHier() {
  const by = new Map();
  window.__dcSum.forEach(d => { const k = d.circleId; (by.get(k) || by.set(k, []).get(k)).push(d); });
  return [...by.entries()].map(([code, ds]) => ({ code, n: ds[0].state, dc: ds.length, pop: 0, site: 0, tot: ds.length, live: ds.filter(d => d.status === 'on-air').length }));
}

/* the macro regions (West, North, South, East) consolidating all geographies (India, USA, and future countries) */
const dcRegionOf = d => {
  const r = String(d && d.regionId || '').toLowerCase();
  if (r.includes('west')) return 'West';
  if (r.includes('north')) return 'North';
  if (r.includes('south')) return 'South';
  return 'East';
};
function dcRegionList() { return ['North', 'South', 'West', 'East']; }

/* ── one site: its real devices, capex, opex and open risks ── */
const DC_ST = { verified: 'ok', drifted: 'drift', 'not-discovered': 'none' };
const DC_TAB_OF = { Router: 'router', Switch: 'switch', DWDM: 'dwdm', Firewall: 'firewall', Server: 'server', Storage: 'storage', GPU: 'gpu' };
const DC_EXTRA_TABS = [{ k: 'firewall', n: 'Firewall' }, { k: 'server', n: 'Server' }, { k: 'storage', n: 'Storage' }, { k: 'gpu', n: 'GPU' }];
function dcSiteNE(id) {
  const out = { router: [], switch: [], dwdm: [], firewall: [], server: [], storage: [], gpu: [] };
  const pre = id + '-';
  for (const d of window.__dcScope.devicesOf(id)) {
    const tab = DC_TAB_OF[d.role]; if (!tab) continue;
    const rack = d.rackId.startsWith(pre) ? d.rackId.slice(pre.length) : d.rackId;
    const pos = `${rack.replace('RACK-', '')} · U${d.u}${(d.uSize || 1) > 1 ? `–${d.u + d.uSize - 1}` : ''}`;
    const base = { st: DC_ST[d.discovery] || 'none', name: d.name, ip: d.ip, sn: d.serial, oem: d.vendor, s: d.lifecycle === 'Planned' ? 'p' : 'd', v: d.discovery === 'not-discovered' ? null : 3 };
    out[tab].push(tab === 'switch' ? { ...base, model: d.model, mac: d.mac, tmpl: '—' }
      : tab === 'dwdm' ? { ...base, type: d.model, sw: d.os, shelf: pos }
      : { ...base, model: d.model, os: d.os, rack: pos });
  }
  return out;
}
const DC_CAPEX_CAT = [[/civil|build|fit-?out|shell/i, 'civil'], [/fib|cabl/i, 'fiber'], [/licen|software/i, 'lic'], [/install|commission/i, 'instal'], [/power|ups|generator|battery|cool/i, 'power']];
function dcCapex(id) {
  const f = dcFacOf(id), sum = dcSumOf(id);
  const paid = sum.capex.committed ? sum.capex.spent / sum.capex.committed : 0;
  /* the reference records spend per data center, not per line: every line carries the data center's overall state */
  const state = paid >= 0.9 ? 'paid' : paid >= 0.6 ? 'invoiced' : 'po';
  const items = f.capex.lines.map(l => ({ d: l.item, c: (DC_CAPEX_CAT.find(([re]) => re.test(l.item)) || [0, 'equip'])[1], v: '—', po: '—', q: 1, u: l.committed, s: state, dt: '—', ne: '—' }));
  return { fy: 'FY 2026-27', afe: `AFE-${id}`, cc: `CC · ${sum.city}`, owner: '—', approved: f.capex.approved, updated: '—', items };
}
const DC_OPEX_CAT = [[/electric|power/i, 'power'], [/lease|rent/i, 'rent'], [/amc|support|maint/i, 'amc'], [/bandwidth|network|transit|backhaul/i, 'lease'], [/secur|house|facilit/i, 'secure'], [/tax|statutory|municipal/i, 'stat']];
function dcOpex(id) {
  const f = dcFacOf(id), sum = dcSumOf(id);
  const items = f.opex.drivers.map(x => ({ d: x.item, c: (DC_OPEX_CAT.find(([re]) => re.test(x.item)) || [0, 'stat'])[1], v: '—', ref: '—', f: 'Monthly', amt: x.monthly, s: 'paid', dt: '—', end: '—', esc: 0 }));
  const run = f.opex.monthly;
  const trend = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map(m => ({ m, a: run, b: run }));
  return { fy: 'FY 2026-27', cc: `CC · ${sum.city}`, owner: '—', budget: run, updated: '—', items, trend };
}
/* open risks become the Attention tab's cards; "Inventory" risks already show as not-discovered / drift */
const DC_RISK_CAT = { Facility: 'Power', Network: 'Fiber Connectivity', Supplier: 'Supply Chain', Commissioning: 'Commissioning', Security: 'Regulatory' };
function dcRisks(id) {
  const f = dcFacOf(id); if (!f) return [];
  return f.risks.filter(r => DC_RISK_CAT[r.domain]).map(r => ({ cat: DC_RISK_CAT[r.domain], sev: r.severity === 'critical' ? 'blocked' : r.severity === 'major' ? 'delayed' : 'risk', title: r.title, detail: r.detail }));
}

/* ── links and services, from the Links and Services sheets of the backups ──
   The Links screen gets one tab per protocol the sheet holds (LLDP, BGP, OSPF, ISIS, LSP), the Services screen one
   tab per service type (on-demand GPUs, CPU instances, storage volumes, reserved clusters). Both are drawn by
   dcViewLinks / dcViewServices below, which use the same page frame as the default screens. */
const DC_LINK_PROTO = [['lldp', 'LLDP', 'LLDP', 'sky'], ['ospf', 'OSPF', 'OSPF', 'emerald'], ['bgp', 'BGP', 'BGP', 'purple'], ['isis', 'ISIS', 'ISIS', 'amber'], ['lsp', 'LSP', 'LSP', 'cyan']];
const DC_SVC_TYPE = [['gpu', 'On-demand GPUs', 'On-demand GPUs', 'sky'], ['cpu', 'CPU instances', 'CPU instances', 'indigo'], ['storage', 'Storage volume', 'Storage volume', 'emerald'], ['reserved', 'Reserved cluster', 'Reserved cluster', 'purple']];
const DC_PAGE = 1000;   /* rows put on the page at once; the grid then reveals them 25 at a time as the reader scrolls (app-grid.js) */
const DC_SHOWN = {};
const dcNum = v => Number(v).toLocaleString('en-US');
const dcMoney = (v, cur) => cur === 'USD' ? '$' + Math.round(v).toLocaleString('en-US') : '₹' + Math.round(v).toLocaleString('en-IN');
const dcRate = mbps => mbps >= 1e6 ? `${+(mbps / 1e6).toFixed(2)} Tbps` : mbps >= 1000 ? `${+(mbps / 1000).toFixed(1)} Gbps` : `${mbps} Mbps`;
function dcLoadLogical() {
  const sc = window.__dcScope, ip = new Map(sc.devices.map(d => [d.id, d.ip]));
  LINK_ST.standby = ['Standby', 'info'];
  LINK_ST_OPTS.lldp = ['up', 'down']; LINK_ST_OPTS.ospf = ['up', 'down']; LINK_ST_OPTS.isis = ['up', 'down'];
  LINK_ST_OPTS.bgp = ['established', 'idle']; LINK_ST_OPTS.lsp = ['up', 'down', 'standby'];
  for (const k of Object.keys(LINKS)) delete LINKS[k];
  const validDcs = window.__dcSum ? new Set(window.__dcSum.map(d => d.id)) : null;
  LINK_TABS.length = 0;
  for (const [k, n_, p, tone] of DC_LINK_PROTO) {
    const rows = sc.links.filter(l => l.p === p && (!validDcs || validDcs.has(l.dc))).map((l, i) => ({
      _i: i, st: p === 'BGP' ? (l.st === 'up' ? 'established' : l.st) : l.st, sne: l.a, sif: l.ai, sip: ip.get(l.a) || '—', dne: l.z, dif: l.zi, dip: ip.get(l.z) || '—',
      name: l.id, linkId: l.id, site: l.dc, role: l.role, cap: l.cap, cable: l.cable || '', strand: l.strand || '', ap: l.ap || '', zp: l.zp || '',
      extra: [['Site', l.dc], ['Role', l.role], ['Capacity', dcRate(l.cap)], ...(l.cable ? [['Cable', l.cable], ['Strand', l.strand], ['Source patch port', l.ap], ['Destination patch port', l.zp]] : [])]
    }));
    LINKS[k] = rows;
    LINK_TABS.push({ k, n: n_, c: rows.length, tone });
  }
  const cust = new Map(sc.customers.map(c => [c.id, c]));
  for (const k of Object.keys(SERVICES)) delete SERVICES[k];
  SVC_TABS.length = 0;
  for (const [k, n_, type, tone] of DC_SVC_TYPE) {
    const rows = sc.services.filter(x => x.type === type && (!validDcs || validDcs.has(x.dc))).map((x, i) => {
      const c = cust.get(x.cust) || {};
      return { _i: i, status: x.status, id: x.id, name: x.id, cust: c.name || x.cust, segment: c.segment || '', plan: c.plan || '', geo: c.geo, site: x.dc, ne: x.ne, ifc: x.ifc, qty: x.qty, unit: x.unit, bw: x.bw,
        sla: x.sla, uptime: x.uptime, rev: x.rev, cur: x.cur, crit: x.crit, path: x.path, links: x.links };
    });
    SERVICES[k] = rows;
    const down = rows.filter(r => r.status === 'Down').length, deg = rows.filter(r => r.status === 'Degraded').length;
    SVC_TABS.push({ k, n: n_, c: rows.length, tone, s: `${rows.length - down - deg} active · ${deg} degraded · ${down} down` });
  }
  for (const k of Object.keys(SVC_TABS_BY_DOMAIN)) delete SVC_TABS_BY_DOMAIN[k];
  SVC_TABS_BY_DOMAIN.services = SVC_TABS;
  TAB.link = LINK_TABS.some(x => x.k === TAB.link) ? TAB.link : (LINK_TABS[0]?.k || 'lldp');
  TAB.svc = SVC_TABS.some(x => x.k === TAB.svc) ? TAB.svc : (SVC_TABS[0]?.k || 'gpu');
}
/* the grid counts the rows it was given; tell it how many the result set really holds */
const dcTotal = (html, total) => html.replace('<table class="nst-table', `<table data-dctotal="${total}" class="nst-table`);
const dcMoreBtn = (key, shown, total) => total > shown
  ? `<div class="row vw-items-center vw-justify-between" style="padding:var(--vw-space-md) var(--vw-space-lg)"><span class="vw-card-description">${dcNum(shown)} of ${dcNum(total)} rows loaded — search or filter to narrow, or</span>
      <button class="nst-btn nst-btn--sm" data-dcmore="${key}">Show ${dcNum(Math.min(DC_PAGE, total - shown))} more</button></div>` : '';
function dcViewLinks() {
  const t = LINK_TABS.some(x => x.k === TAB.link) ? TAB.link : LINK_TABS[0].k, meta = LINK_TABS.find(x => x.k === t);
  const mine = r => !LINK_NE_FILTER || r.sne === LINK_NE_FILTER || r.dne === LINK_NE_FILTER;
  const all = (LINKS[t] || []).filter(mine);
  const rows = gridApply('links', all);
  const shown = Math.min(DC_SHOWN['l' + t] || DC_PAGE, rows.length), page = rows.slice(0, shown);
  const spec = [{ n: 'Status', o: (LINK_ST_OPTS[t] || []).map(k => LINK_ST[k][0]) }, { n: 'Source NE' }, { n: 'Destination NE' }, { n: 'Site' },
    { n: 'Role', o: ['Fabric', 'Access', 'Uplink', 'Peering', 'Backhaul'] }, { n: 'Cable' }];
  const cols = [{ t: 'Status', plain: true }, { t: 'Source NE' }, { t: 'Source interface' }, { t: 'Destination NE' }, { t: 'Destination interface' }, { t: 'Role' }, { t: 'Capacity' },
    { t: 'Cable' }, { t: 'Strand' }, { t: 'Source patch port' }, { t: 'Destination patch port' }, { t: 'Link ID' }];
  const body = page.map(r => [chip(LINK_ST[r.st][0], LINK_ST[r.st][1]), `<span class="vw-value">${esc(r.sne)}</span>`, `<span class="mono">${esc(r.sif)}</span>`,
    `<span class="vw-value">${esc(r.dne)}</span>`, `<span class="mono">${esc(r.dif)}</span>`, esc(r.role), dcRate(r.cap),
    r.cable ? `<span class="mono">${esc(r.cable)}</span>` : '—', r.strand ? esc(r.strand) : '—', r.ap ? `<span class="mono">${esc(r.ap)}</span>` : '—', r.zp ? `<span class="mono">${esc(r.zp)}</span>` : '—',
    `<span class="mono">${esc(r.linkId)}</span>`]);
  return `<div class="page">
    ${drillBar()}
    <div class="vw-grid vw-gap-md" style="grid-template-columns:repeat(${LINK_TABS.length},minmax(0,1fr))">
      ${LINK_TABS.map(x => {
        const c = LINK_NE_FILTER ? (LINKS[x.k] || []).filter(mine).length : x.c, isSel = x.k === t;
        return `
        <button class="vw-card-section vw-card--clickable vw-card--accent stack-x${isSel ? ' is-selected' : ''}" data-tab="link:${x.k}" data-tone="${x.tone}"${isSel ? ' data-selected="true" aria-current="true"' : ''}
          style="padding-top:calc(var(--vw-space-lg) + 3px);text-align:left;font:inherit;color:inherit;gap:var(--vw-space-xs)">
          <div class="vw-card-accent" style="background:${cv(x.tone, 400)}"></div>
          <span class="vw-card-metric-label">${x.n}</span>
          <span class="vw-card-metric-xl num stat-v--${x.tone}" style="color:${cv(x.tone, 700)};font-weight:500">${n(c)}</span>
          <span class="vw-card-metric-label-sub">${LINK_NE_FILTER ? 'links for this element' : 'discovered links'}</span>
        </button>`; }).join('')}
    </div>
    ${card(`
      ${tabs(LINK_TABS, t, 'link')}
      ${gridBar(rows.length, n(all.length), 'Source NE, destination NE, interface, cable, link ID', spec, '', [], 'links')}
      ${dcTotal(table(cols, body, 'chip-auto', i => [{ l: 'View link', linkview: `${t}:${page[i]._i}` }], i => ({ class: 'is-click', 'data-linkview': `${t}:${page[i]._i}` })), rows.length)}
      ${dcMoreBtn('l' + t, shown, rows.length)}`)}
    ${linkViewDialog()}
  </div>`;
}
function dcSvcDialog() {
  if (!SVC_VIEW) return '';
  const r = (SERVICES[SVC_VIEW.tab] || [])[SVC_VIEW.i];
  if (!r) return '';
  const node = name => `<button class="linkdiagram-node"${dA({ v: 'resource', l: name, q: `name=${encodeURIComponent(name)}` })} title="View ${esc(name)}">
      <span class="linkdiagram-icon">${nodeThumb('router')}</span><span class="linkdiagram-label" title="${esc(name)}">${esc(name)}</span></button>`;
  const far = r.path[r.path.length - 1] || r.ne;
  const tone = r.status === 'Active' ? 'success' : r.status === 'Degraded' ? 'warning' : 'error';
  return `
    <div class="drawer-overlay" data-svcclose="1"></div>
    <div class="linkview-panel" role="dialog" aria-label="Service ${esc(r.id)}">
      <div class="linkview-head"><span class="vw-card-title-sm">Service</span><button class="fp-x" data-svcclose="1" aria-label="Close">${IC_X}</button></div>
      <div class="linkview-body">
        <div class="row vw-justify-between vw-items-center vw-wrap" style="margin-bottom:var(--vw-space-md)"><span class="vw-card-description">${esc(r.id)} · ${esc(r.cust)}</span>${chip(r.status, tone)}</div>
        ${far !== r.ne ? `<div class="linkdiagram-canvas">${node(r.ne)}<span class="linkdiagram-wire is-static"><span class="linkdiagram-wire-badge">${esc(r.ifc)}</span></span>${node(far)}</div>` : ''}
        ${detailFieldGrid([
          ['Customer', r.cust], ['Segment', r.segment], ['Plan', r.plan], ['Site', r.site], ['Device', r.ne], ['Interface', r.ifc],
          ['Quantity', `${dcNum(r.qty)} ${r.unit}`], ['Bandwidth', dcRate(r.bw)], ['SLA target', `${r.sla}%`], ['Uptime (30 days)', `${r.uptime}%`],
          ['Monthly revenue', dcMoney(r.rev, r.cur)], ['Critical', r.crit ? 'Yes' : 'No'], ['Path', r.path.join(' → ')], ['Links', r.links.join(', ') || '—']
        ])}
      </div>
    </div>`;
}
function dcViewServices() {
  const t = SVC_TABS.some(x => x.k === TAB.svc) ? TAB.svc : SVC_TABS[0].k, meta = SVC_TABS.find(x => x.k === t);
  const all = SERVICES[t] || [], rows = gridApply('services', all);
  const shown = Math.min(DC_SHOWN['s' + t] || DC_PAGE, rows.length), page = rows.slice(0, shown);
  const spec = [{ n: 'Status', o: ['Active', 'Degraded', 'Down'] }, { n: 'Service ID' }, { n: 'Customer' }, { n: 'Site' }, { n: 'Device' }];
  const TONE = { Active: 'success', Degraded: 'warning', Down: 'error' };
  const cols = [{ t: 'Status', plain: true }, { t: 'Service ID' }, { t: 'Customer' }, { t: 'Site' }, { t: 'Device' }, { t: 'Interface' }, { t: 'Quantity', r: true }, { t: 'Bandwidth' },
    { t: 'SLA target', r: true }, { t: 'Uptime (30 days)', r: true }, { t: 'Monthly revenue', r: true }, { t: 'Critical' }];
  const body = page.map(r => [chip(r.status, TONE[r.status] || 'neutral'), `<span class="mono">${esc(r.id)}</span>`, `<span class="vw-value">${esc(r.cust)}</span>`, `<span class="mono">${esc(r.site)}</span>`,
    `<span class="mono">${esc(r.ne)}</span>`, `<span class="mono">${esc(r.ifc)}</span>`, `${dcNum(r.qty)} ${esc(r.unit)}`, dcRate(r.bw), `${r.sla}%`, `${r.uptime}%`, dcMoney(r.rev, r.cur), r.crit ? 'Yes' : 'No']);
  return `<div class="page">
    ${drillBar()}
    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${SVC_TABS.map(tab => kpi(tab.n, n(tab.c), tab.s, tab.tone, { v: 'services', l: `${tab.n} services`, q: `tab=${tab.k}` }, tab.k === t)).join('')}
    </div>
    ${card(`
      <div class="tabbar" role="tablist" aria-label="Services">${SVC_TABS.map(x => `<button class="tab${x.k === t ? ' is-on' : ''}" role="tab" aria-selected="${x.k === t}" data-tab="svc:${x.k}">${x.n}</button>`).join('')}</div>
      ${gridBar(rows.length, n(meta.c), 'Service ID, customer, site, device', spec, '', [], 'services')}
      ${dcTotal(table(cols, body, 'chip-auto', i => [{ l: 'View', svcview: `${t}:${page[i]._i}` }], i => ({ class: 'is-click', 'data-svcview': `${t}:${page[i]._i}` })), rows.length)}
      ${dcMoreBtn('s' + t, shown, rows.length)}`)}
    ${dcSvcDialog()}
  </div>`;
}

let LOC_GEO_FILTER = typeof window !== 'undefined' && window.__dcGeo ? window.__dcGeo : 'us';

function dcApplyScope(geo) {
  if (!DC_ON) return;
  LOC_GEO_FILTER = geo === 'in' ? 'in' : 'us';
  const fullList = window.__dcSumAll || (window.__dcSumAll = [...(window.__dcSum || [])]);
  const list = fullList.filter(d => d.geo === LOC_GEO_FILTER);
  window.__dcSum = list;
  if (typeof LOCATIONS !== 'undefined' && Array.isArray(LOCATIONS)) {
    LOCATIONS.length = 0;
    LOCATIONS.push(...list.map(d => d.location));
  }
  Object.keys(STATE_REGION).forEach(k => delete STATE_REGION[k]);
  list.forEach(d => { STATE_REGION[d.state] = dcRegionOf(d); });
  Object.keys(STATE_CIRCLE).forEach(k => delete STATE_CIRCLE[k]);
  LOC_GEO.forEach(g => { STATE_CIRCLE[g.st] = g; });
  if (typeof IL !== 'undefined') {
    Object.assign(IL, dcIL(IL));
  }
  if (typeof dcLoadLogical === 'function') {
    dcLoadLogical();
  }
}

/* ── what the data center records do not hold stays empty ── */
function dcScopeLegacy() {
  if (!DC_ON) return;
  SITE_TABS.push(...DC_EXTRA_TABS);
  PASS_TAB = 'rack';   /* open Passive infrastructure on the first tab the data centers have records for */
  VNFS.length = 0;
  window.__dcSumAll = [...(window.__dcSum || [])];
  dcApplyScope(window.__dcGeo || 'us');
  /* detail pages for records the data centers do not hold (VNFs, cells, passive plant of the estate): the same
     page frame, empty, instead of a sample record */
  const empty = what => () => `<div class="page">${drillBar()}${card(`<div class="vw-card-child-shaded vw-card-description" style="padding:var(--vw-space-2xl);text-align:center">
    <strong>No ${what} record</strong> in the data center solution. The data centers hold no such record.</div>`)}</div>`;
  const NONE = { vnflifecycle: 'VNF', vnfdetails: 'VNF', cell4gdetails: '4G cell', cell5gdetails: '5G cell', odf: 'ODF frame', rack: 'rack', power: 'power unit',
    splice: 'splice closure', cord: 'patch cord', duct: 'duct', fiber: 'fibre span' };
  Object.entries(NONE).forEach(([k, what]) => { if (VIEWS[k]) VIEWS[k].render = empty(what); });
}
