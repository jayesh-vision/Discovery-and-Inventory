/* ═══ Data center solution (?solution=datacenter) ═══════════════════════════════
   The React shell sets window.__nsSolution, window.__dcSum (the per-data-center summary) and
   window.__dcScope (facilities, devices, GPU servers; see src/data/dc/scope.ts) before this script
   runs. In the default Inventory none of that exists and every helper here hands its argument back
   untouched, so the estate's own data is exactly what it always was.
   In the data center solution the same screens draw from the data centers' records: the roster,
   the location counts, each site's real devices, capex/opex and open risks. What the data center
   records do not hold (VNFs, links, services) is empty rather than borrowed from the estate. */
const DC_ON = typeof window !== 'undefined' && window.__nsSolution === 'datacenter' && !!window.__dcSum && !!window.__dcScope;
const dcSumOf = id => DC_ON ? window.__dcSum.find(d => d.id === id) : null;
const dcFacOf = id => DC_ON ? window.__dcScope.facOf(id) : null;

/* ── location roster and counts ── */
const dcSplitOf = rows => ({ total: rows.length, live: rows.filter(d => d.status === 'on-air').length, building: rows.filter(d => d.status === 'in-progress').length,
  planned: rows.filter(d => d.status === 'planned').length, failed: rows.filter(d => d.status === 'failed').length });
function dcRoster(def) { return DC_ON ? window.__dcSum.map(d => d.location) : def; }
function dcIL(def) {
  if (!DC_ON) return def;
  const S = window.__dcSum, sum = f => S.reduce((a, d) => a + f(d), 0);
  return { locations: S.length, central: S.length, regional: 0, edge: 0, ne: sum(d => d.devices), discovered: sum(d => d.discovered), links: 0, services: 0, vnf: 0, inactive: 0, reports: 0 };
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

/* ── what the data center records do not hold stays empty ── */
function dcScopeLegacy() {
  if (!DC_ON) return;
  SITE_TABS.push(...DC_EXTRA_TABS);
  PASS_TAB = 'rack';   /* open Passive infrastructure on the first tab the data centers have records for */
  VNFS.length = 0;
  Object.values(LINKS).forEach(a => { a.length = 0; });
  Object.values(SERVICES).forEach(a => { a.length = 0; });
  LINK_TABS.forEach(t => { t.c = 0; });
  SVC_TABS.forEach(t => { t.c = 0; t.s = '0 active · 0 down'; });
  /* detail pages for records the data centers do not hold (VNFs, cells, passive plant of the estate): the same
     page frame, empty, instead of a sample record */
  const empty = what => () => `<div class="page">${drillBar()}${card(`<div class="vw-card-child-shaded vw-card-description" style="padding:var(--vw-space-2xl);text-align:center">
    <strong>No ${what} record</strong> in the data center solution. The data centers hold no such record.</div>`)}</div>`;
  const NONE = { vnflifecycle: 'VNF', vnfdetails: 'VNF', cell4gdetails: '4G cell', cell5gdetails: '5G cell', odf: 'ODF frame', rack: 'rack', power: 'power unit',
    splice: 'splice closure', cord: 'patch cord', duct: 'duct', fiber: 'fibre span' };
  Object.entries(NONE).forEach(([k, what]) => { if (VIEWS[k]) VIEWS[k].render = empty(what); });
  Object.keys(STATE_CIRCLE).forEach(k => delete STATE_CIRCLE[k]);
  LOC_GEO.forEach(g => { STATE_CIRCLE[g.st] = g; });
}
