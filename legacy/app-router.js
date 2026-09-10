/* ═══ merged router ═══ */
const VIEWS = {
  /* Discovery and reconciliation */
  insights:  { mod:'Discovery and reconciliation', crumb:'Insights',      render:viewInsights },
  jobs:      { mod:'Discovery and reconciliation', crumb:'Scan jobs',     render:viewJobs },
  targets:   { mod:'Discovery and reconciliation', crumb:'Scan targets',  render:viewTargets },
  target:    { mod:'Discovery and reconciliation', crumb:'Scan targets · NDLS-J960-P_R1-T1-NR', render:viewTarget },
  reconcile: { mod:'Discovery and reconciliation', crumb:'Reconciliation',render:viewReconcile },
  /* Inventory */
  home:      { mod:'Inventory', crumb:'Home',                        render:viewHome },
  location:  { mod:'Inventory', crumb:'Location',                    render:viewLocation },
  site:      { mod:'Inventory', crumb:'Location · Site details',     render:viewSite },
  capex:     { mod:'Inventory', crumb:'Location · Site details · Capex', render:viewSite },
  opex:      { mod:'Inventory', crumb:'Location · Site details · Opex',  render:viewSite },
  capexForm: { mod:'Inventory', crumb:'Location · Site details · Capex edit', render:viewCapex },
  opexForm:  { mod:'Inventory', crumb:'Location · Site details · Opex edit',  render:viewOpex },
  virtual:   { mod:'Inventory', crumb:'Resources · Virtual Resources',  render:viewVirtual },
  vnflifecycle: { mod:'Inventory', crumb:'Resources · Virtual Resources · Lifecycle operation', render:viewVnfLifecycle },
  vnfdetails: { mod:'Inventory', crumb:'Resources · Virtual Resources · View', render:viewVnfDetails },
  cell4gdetails: { mod:'Inventory', crumb:'Resources · Virtual Resources · View · Cell 4G details', render:viewCell4gDetails },
  cell5gdetails: { mod:'Inventory', crumb:'Resources · Virtual Resources · View · Cell 5G details', render:viewCell5gDetails },
  physical:  { mod:'Inventory', crumb:'Resources · Physical Resources', render:viewPhysical },
  inactive:  { mod:'Inventory', crumb:'Inactive inventory', render:viewInactive },
  resource:  { mod:'Inventory', crumb:'Resources · Physical Resources · Element', render:viewResource },
  node:      { mod:'Inventory', crumb:'Location · Site details · Node view', render:viewNode },
  passive:   { mod:'Inventory', crumb:'Resources · Passive Infrastructure', render:viewPassive },
  links:     { mod:'Inventory', crumb:'Connectivity · Links',        render:viewLinks },
  services:  { mod:'Inventory', crumb:'Services',                    render:viewServices },
  reports:   { mod:'Inventory', crumb:'Reports',                     render:viewReports }
};
const RAIL_OF = { target: 'targets', site: 'location', capex: 'location', opex: 'location',
                  node: 'location', resource: 'physical', vnflifecycle: 'virtual', vnfdetails: 'virtual',
                  cell4gdetails: 'virtual', cell5gdetails: 'virtual' };

const viewEl = document.getElementById('view'),
      crumbEl = document.getElementById('crumb'),
      modEl  = document.getElementById('module');
let CURRENT = 'insights';

/* Reads whatever table the grid toolbar sits above and turns exactly what's
   on screen right now (search and filters already applied) into a real
   file, so "Export" produces the rows the reader is actually looking at. */
function exportNearestTable(btn, kind) {
  const table = btn.closest('.vw-card-section, .card, section')?.querySelector('table');
  if (!table) { alert('Nothing to export — this grid has no rows yet.'); return; }
  const cell = td => `"${td.textContent.replace(/\s+/g, ' ').trim().replace(/"/g, '""')}"`;
  const lines = [...table.querySelectorAll('tr')].map(tr =>
    [...tr.children].filter(c => !c.classList.contains('kb-th') && !c.classList.contains('kb-td')).map(cell).join(','));
  const ext = kind === 'xlsx' ? 'xls' : 'csv';
  const blob = new Blob([lines.join('\r\n')], { type: kind === 'xlsx' ? 'application/vnd.ms-excel' : 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${CURRENT}-export.${ext}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── drill-down ───────────────────────────────────────── */
let DRILL_PENDING = null;
function drillTo(view, label, q) {
  if (!VIEWS[view]) return;
  const fromName = CURRENT === 'virtual' ? 'Virtual' : ((VIEWS[CURRENT] || {}).crumb || '');
  DRILL_PENDING = { view, label, q, from: fromName, back: CURRENT };
  applyDrillQuery(view, q, label);
  go(view);
}
function applyDrillQuery(view, q, label) {
  const p = {};
  (q || '').split('&').filter(Boolean).forEach(kv => { const i = kv.indexOf('='); p[kv.slice(0, i)] = kv.slice(i + 1); });
  if (view === 'reconcile') { NE_FILTER = p.ne || 'All'; REC_CIRCLE = p.circle || null; }
  if (view === 'targets')   { TGT_FILTER = p.tgt || 'All'; TGT_REASON_FILTER = p.reason || null; }
  if (view === 'jobs')      { JOB_FILTER = p.filter || 'All'; }
  if (view === 'physical')  {
    if (p.cls && PHY_TABS.some(x => x.k === p.cls)) TAB.phy = p.cls;
    else if (p.tab && PHY_TABS.some(x => x.k === p.tab)) TAB.phy = p.tab;
    else if (!TAB.phy) TAB.phy = 'router';
    PHY_OEM = p.oem || null;
    PHY_SRC = p.src || null;
    PHY_VER = p.ver || null;
    PHY_STOCK = new Set(p.stock ? p.stock.split(',') : ['planned','instore','deployed','faulty']);
  }
  if (view === 'inactive') { if (p.cls) INACT_CLS = p.cls; }
  if (view === 'location') {
    /* the URL is the source of truth: a plain /inventory/location is the
       dashboard, so the breadcrumb's "Location" always lands there */
    LOC_VIEW = p.view || 'insights';
    LOC_ST = p.st || null; LOC_CAT = p.cat || null; LOC_STATE = p.state || null; LOC_REGION = p.region || null;
    LOC_TYPEGRP = p.type || null;
    LOC_GROUP = p.group || null;
  }
  if (view === 'site')     { if (p.id) { SITE_ID = p.id; SITE_TAB = 'router'; SITE_SECTION = 'attention'; } }
  if (view === 'passive')  { if (p.tab) PASS_TAB = p.tab; }
  if (view === 'links')    { if (p.tab) TAB.link = p.tab; LINK_NE_FILTER = p.ne || null; }
  if (view === 'services') { if (p.tab) TAB.svc  = p.tab; }
  if (view === 'node')     {
    if (p.tab) NODE_TAB = p.tab;
    const targetNode = p.name || p.node || p.ne || (label ? label.replace(/^Node view\s*·?\s*/i, '').trim() : null);
    if (targetNode) {
      NODE_ID = decodeURIComponent(targetNode).trim();
      NODE_PERF = '24h';
      NODE_ALERT_TAB = 'alerts';
      NODE_LINK_PROTO = 'LLDP';
    }
  }
  if (view === 'vnflifecycle') { VNF_LC_ID = p.nf || null; VNF_LC_STAGE = 'day0'; VNF_LC_DRAWER = null; }
  if (view === 'vnfdetails') { if (p.name) VNF_DETAIL_ID = decodeURIComponent(p.name); if (p.tab) VNF_DETAIL_TAB = p.tab; }
  if (view === 'cell4gdetails') { if (p.cell) CELL_4G_NAME = decodeURIComponent(p.cell); }
  if (view === 'cell5gdetails') { if (p.cell) CELL_5G_NAME = decodeURIComponent(p.cell); }
}
function clearDrill() {
  const d = DRILL; DRILL = null;
  if (!d) return;
  if (d.view === 'reconcile') { NE_FILTER = 'All'; REC_CIRCLE = null; }
  if (d.view === 'targets')   { TGT_FILTER = 'All'; TGT_REASON_FILTER = null; }
  if (d.view === 'jobs')      { JOB_FILTER = 'All'; }
  if (d.view === 'physical')  { PHY_OEM = null; PHY_SRC = null; PHY_VER = null; }
  if (d.view === 'location')  { LOC_ST = null; LOC_CAT = null; LOC_STATE = null; LOC_REGION = null; LOC_TYPEGRP = null; LOC_GROUP = null; }
  if (d.view === 'links')     { LINK_NE_FILTER = null; }
  go(d.view);
}

function go(k) {
  const v = VIEWS[k] || VIEWS.insights;
  const isNav = k !== CURRENT;              // false when a control just refreshes the view it's already on
  /* an in-place refresh (a filter, a chip, a search keystroke) that does not
     set its own DRILL_PENDING must not silently drop the drill/back context —
     only a real navigation is allowed to leave it behind */
  DRILL = isNav ? DRILL_PENDING : (DRILL_PENDING || DRILL);
  DRILL_PENDING = null;
  GRID_N = 0;
  /* the render below throws away every grid element, so note where the reader
     was in each one first — a row action must not fling the list back to row 1 */
  if (!isNav) saveGridScroll();
  if (isNav) { KEBAB = null; GRIDMENU = false; FILTER_OPEN = false; FILTER_FIELD = 0; LAZY = {}; }
  CURRENT = VIEWS[k] ? k : 'insights';
  modEl.textContent = v.mod;
  crumbEl.textContent = v.crumb;
  viewEl.innerHTML = v.render();
  const active = RAIL_OF[CURRENT] || CURRENT;
  document.querySelectorAll('.side-item').forEach(b => b.classList.toggle('is-active',
    CURRENT === 'inactive' ? b.hasAttribute('data-inactive') : b.dataset.nav === active));
  /* only a real navigation jumps the reader to the top; an in-place refresh
     (a tab, a run switch, a filter) must not fling the scroll position around */
  if (isNav) window.scrollTo({ top: 0, behavior: 'instant' });
  bindMap();
  document.querySelectorAll('.tbl-wrap').forEach(w => {
    const mark = () => {
      const over = w.scrollWidth - w.clientWidth;
      w.classList.toggle('is-scrollable', over > 24);
      w.classList.toggle('is-end', w.scrollLeft >= over - 1);
    };
    mark(); w.addEventListener('scroll', mark, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(mark).observe(w);
  });
  lazyGrids();
}

/* keyboard activation for custom [role="button"] controls (the coverage
   row's expand trigger, the hierarchy diagram's nodes) — real <button>s
   get this for free, these don't, so Enter/Space is wired to replay the
   same click the pointer path already handles rather than duplicating
   the expand/drill logic here. */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target.closest('[role="button"]');
  if (!t) return;
  e.preventDefault();
  t.click();
});

document.addEventListener('click', e => {
  const kbBtn = e.target.closest('[data-kebab]');
  if (kbBtn) { const k = kbBtn.dataset.kebab; KEBAB = (KEBAB === k) ? null : k;
    GRIDMENU = false; FILTER_OPEN = false; go(CURRENT); return; }
  const gm = e.target.closest('[data-gridmenu]');
  if (gm) { GRIDMENU = !GRIDMENU; KEBAB = null; FILTER_OPEN = false; go(CURRENT); return; }
  const gr = e.target.closest('[data-gridrefresh]');
  /* Refresh re-derives every grid's rows from the underlying data arrays —
     go() always rebuilds the view fresh, never from a cached render — while
     leaving search, filters, tab and pagination exactly as the reader left
     them. It must not double-fire: go() is synchronous, and closing the menu
     here means a second click can't land on the same button mid-refresh.
     Nothing here has real latency to show a spinner for, but with static
     sample data the reload is otherwise invisible — a small confirmation
     is the honest way to prove the click did something. */
  if (gr) {
    const r = gr.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('ns-refresh'));
    const wrap = gr.closest('.grid-bar')?.nextElementSibling || document.querySelector('.tbl-wrap');
    let overlay = null;
    if (wrap && wrap.classList.contains('tbl-wrap') && !wrap.querySelector('.grid-loader-overlay')) {
      overlay = document.createElement('div');
      overlay.className = 'grid-loader-overlay';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-label', 'Refreshing data');
      overlay.innerHTML = '<div class="grid-spinner"></div><span class="grid-loader-text">Refreshing data…</span>';
      wrap.appendChild(overlay);
    }
    KEBAB = null; GRIDMENU = false; DRILL_PENDING = DRILL;
    setTimeout(() => {
      if (overlay) overlay.remove();
      go(CURRENT);
      showCopyToast(r.left, r.top, 'Refreshed');
    }, 450);
    return;
  }
  const vlcs = e.target.closest('[data-vnflcstage]');
  /* a step index only means anything within the stage it belongs to, so
     switching stages closes any open task drawer rather than carry it over */
  if (vlcs) { VNF_LC_STAGE = vlcs.dataset.vnflcstage; VNF_LC_DRAWER = null; KEBAB = null; DRILL_PENDING = DRILL; go(CURRENT); return; }
  const vlcr = e.target.closest('[data-vnflcrefresh]');
  if (vlcr) {
    const r = vlcr.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('ns-refresh'));
    const cardEl = vlcr.closest('.vw-card') || document.querySelector('#view');
    let overlay = null;
    if (cardEl && !cardEl.querySelector('.grid-loader-overlay')) {
      overlay = document.createElement('div');
      overlay.className = 'grid-loader-overlay';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-label', 'Refreshing data');
      overlay.innerHTML = '<div class="grid-spinner"></div><span class="grid-loader-text">Refreshing data…</span>';
      cardEl.appendChild(overlay);
    }
    DRILL_PENDING = DRILL;
    setTimeout(() => {
      if (overlay) overlay.remove();
      go(CURRENT);
      showCopyToast(r.left, r.top, 'Refreshed');
    }, 450);
    return;
  }
  const vlce = e.target.closest('[data-vnflceye]');
  if (vlce) {
    const [stage, step] = vlce.dataset.vnflceye.split(':');
    VNF_LC_DRAWER = { stage, step: Number(step) };
    VNF_LC_DRAWER_OPEN = { req: true, res: true };
    KEBAB = null;
    DRILL_PENDING = DRILL; go(CURRENT); return;
  }
  const vlcx = e.target.closest('[data-vnflcclose]');
  if (vlcx) { VNF_LC_DRAWER = null; DRILL_PENDING = DRILL; go(CURRENT); return; }
  const vdt = e.target.closest('[data-vnfdetailtab]');
  if (vdt) { VNF_DETAIL_TAB = vdt.dataset.vnfdetailtab; go('vnfdetails'); return; }
  const vlca = e.target.closest('[data-vnflcaccordion]');
  if (vlca) { const k = vlca.dataset.vnflcaccordion; VNF_LC_DRAWER_OPEN[k] = !VNF_LC_DRAWER_OPEN[k]; DRILL_PENDING = DRILL; go(CURRENT); return; }
  const fo = e.target.closest('[data-filteropen]');
  if (fo) { FILTER_OPEN = !FILTER_OPEN; FILTER_FIELD = 0; KEBAB = null; GRIDMENU = false; go(CURRENT); return; }
  const fc = e.target.closest('[data-filterclose]');
  if (fc) { FILTER_OPEN = false; go(CURRENT); return; }
  const fr = e.target.closest('[data-filterreset]');
  if (fr) { gridOf(fr.dataset.filterreset).filters = {}; FILTER_OPEN = false; go(CURRENT); return; }
  const fa = e.target.closest('[data-filterapply]');
  if (fa) { FILTER_OPEN = false; DRILL_PENDING = DRILL; go(CURRENT); return; }
  const ff = e.target.closest('[data-filterfield]');
  if (ff) { FILTER_FIELD = Number(ff.dataset.filterfield); go(CURRENT); return; }
  const gx = e.target.closest('[data-gridexport]');
  if (gx) { const [, kind] = gx.dataset.gridexport.split('|'); exportNearestTable(gx, kind); return; }
  const gp = e.target.closest('[data-gridprint]');
  if (gp) { window.print(); return; }
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    const r = cp.getBoundingClientRect(), value = cp.dataset.copy;
    copyToClipboard(value).then(() => showCopyToast(r.left, r.top, 'Copied'));
    if (KEBAB || GRIDMENU) { KEBAB = null; GRIDMENU = false; go(CURRENT); }
    return;
  }
  const ack = e.target.closest('.js-ack');
  if (ack) { KEBAB = null; GRIDMENU = false; go(CURRENT); return; }
  if ((KEBAB || GRIDMENU) && !e.target.closest('.kmenu')) { KEBAB = null; GRIDMENU = false; go(CURRENT); return; }
  if (FILTER_OPEN && !e.target.closest('.fpanel') && !e.target.closest('[data-filteropen]')) {
    FILTER_OPEN = false; go(CURRENT); return; }

  const bn = e.target.closest('[data-back-nav]');
  if (bn) { go(bn.dataset.backNav); return; }
  const dcl = e.target.closest('[data-drillclear]');
  if (dcl) { clearDrill(); return; }
  const dr = e.target.closest('[data-drill]');
  if (dr) { drillTo(dr.dataset.drill, dr.dataset.dlabel, dr.dataset.dq || ''); return; }
  const grp = e.target.closest('[data-group]');
  if (grp) {
    grp.classList.toggle('is-closed');
    document.querySelectorAll(`[data-child="${grp.dataset.group}"]`)
      .forEach(c => c.hidden = grp.classList.contains('is-closed'));
    return;
  }
  const cx = e.target.closest('[data-capex]');
  if (cx) { CAPEX_ID = cx.dataset.capex; CAPEX_DRAFT = null; CAPEX_SAVED = false; go('capexForm'); return; }
  const ox = e.target.closest('[data-opex]');
  if (ox) { OPEX_ID = ox.dataset.opex; OPEX_DRAFT = null; OPEX_SAVED = false; go('opexForm'); return; }
  const oxa = e.target.closest('[data-oxadd]');
  if (oxa) {
    opexDraft().items.push({ d:'New recurring contract', c:'amc', v:'', ref:'—', f:'Monthly',
      amt:0, s:'accrued', dt:'—', end:'—', esc:0 });
    OPEX_SAVED = false; refreshOpex(); return;
  }
  const oxd = e.target.closest('[data-oxdel]');
  if (oxd) { opexDraft().items.splice(Number(oxd.dataset.oxdel), 1); OPEX_SAVED = false; refreshOpex(); return; }
  const oxs = e.target.closest('[data-oxsave]');
  if (oxs) {
    const d = opexDraft();
    OPEX[OPEX_ID] = { ...opexOf(OPEX_ID, 25), fy:d.fy, cc:d.cc, owner:d.owner,
      budget:Number(d.budget) || 0, items:d.items.map(x => ({ ...x })), trend:d.trend,
      updated:'01-Sep-2026 · Jayesh Verma' };
    OPEX_SAVED = true; SITE_SECTION = 'opex'; go('site'); return;
  }
  const cxa = e.target.closest('[data-cxadd]');
  if (cxa) {
    capexDraft().items.push({ d:'New line item', c:'equip', v:'', po:'—', q:1, u:0, s:'planned', dt:'—', ne:'—' });
    CAPEX_SAVED = false; refreshCapex(); return;
  }
  const cxd = e.target.closest('[data-cxdel]');
  if (cxd) { capexDraft().items.splice(Number(cxd.dataset.cxdel), 1); CAPEX_SAVED = false; refreshCapex(); return; }
  const cxs = e.target.closest('[data-cxsave]');
  if (cxs) {
    const d = capexDraft();
    CAPEX[CAPEX_ID] = { ...capexOf(CAPEX_ID, 25), fy:d.fy, afe:d.afe, cc:d.cc, owner:d.owner,
      approved:Number(d.approved) || 0, items:d.items.map(x => ({ ...x })),
      updated:'01-Sep-2026 · Jayesh Verma' };
    CAPEX_SAVED = true; go('capex'); return;
  }
  const cl = e.target.closest('[data-cluster]');
  if (cl) {
    const ids = cl.dataset.cluster.split(',');
    /* the cluster sits on top of its state's shape and usually wins the
       hit-test, so a click here must keep the state selection (and its
       highlighted outline) in sync — otherwise the panel is left showing
       whichever state was selected last, not the one under the pointer */
    const first = LOCATIONS.find(x => x.id === ids[0]);
    const g = first && STATE_CIRCLE[first.state];
    if (g) LOC_SEL = g.c;
    syncMapSel();
    PIN_GROUP = ids;
    const p = document.getElementById('mappanel');
    if (p) p.innerHTML = mapPanel(); return;
  }
  const cc = e.target.closest('[data-clusterclear]');
  if (cc) { PIN_GROUP = null; const p = document.getElementById('mappanel');
    if (p) p.innerHTML = mapPanel(); return; }
  const site = e.target.closest('[data-site]');
  if (site) { SITE_ID = site.dataset.site; SITE_TAB = 'router'; SITE_SECTION = 'attention'; go('site'); return; }
  const sc = e.target.closest('[data-stock]');
  if (sc) { const k = sc.dataset.stock;
    if (PHY_STOCK.has(k)) { if (PHY_STOCK.size > 1) PHY_STOCK.delete(k); } else PHY_STOCK.add(k);
    go('physical'); return; }
  const ss = e.target.closest('[data-stockset]');
  if (ss) { PHY_STOCK = new Set(ACTIVE_STATES); go('physical'); return; }
  const inact = e.target.closest('[data-inactive]');
  if (inact) { go('inactive'); return; }
  const icl = e.target.closest('[data-inactcls]');
  if (icl) { INACT_CLS = icl.dataset.inactcls; go('inactive'); return; }
  const res = e.target.closest('[data-res]');
  if (res) { RES_ID = res.dataset.res; RES_TAB = 'overview'; go('resource'); return; }
  const nd = e.target.closest('[data-node]');
  if (nd) { NODE_ID = nd.dataset.node; NODE_TAB = 'overview'; NODE_PERF = '24h'; NODE_ALERT_TAB = 'alerts'; NODE_LINK_PROTO = 'LLDP'; go('node'); return; }
  const ntab = e.target.closest('[data-nodetab]');
  if (ntab) { NODE_TAB = ntab.dataset.nodetab; go('node'); return; }
  const npf = e.target.closest('[data-nperf]');
  if (npf) { NODE_PERF = npf.dataset.nperf; go('node'); return; }
  const nal = e.target.closest('[data-nalert]');
  if (nal) { NODE_ALERT_TAB = nal.dataset.nalert; go('node'); return; }
  const nlk = e.target.closest('[data-nlink]');
  if (nlk) { NODE_LINK_PROTO = nlk.dataset.nlink; go('node'); return; }
  const rtab = e.target.closest('[data-restab]');
  if (rtab) { RES_TAB = rtab.dataset.restab; go('resource'); return; }
  const iff = e.target.closest('[data-iffilter]');
  if (iff) { IF_FILTER = iff.dataset.iffilter; go('resource'); return; }
  const hf = e.target.closest('[data-histfilter]');
  if (hf) { RES_HIST_FILTER = hf.dataset.histfilter; go('resource'); return; }
  const nbt = e.target.closest('[data-nbrtab]');
  if (nbt) { NBR_TAB = nbt.dataset.nbrtab; go('resource'); return; }
  const pst = e.target.closest('[data-passtab]');
  if (pst) { PASS_TAB = pst.dataset.passtab; go('passive'); return; }
  const mt = e.target.closest('[data-metatoggle]');
  if (mt) { SITE_META_OPEN = !SITE_META_OPEN;
    try { localStorage.setItem('nst-sitemeta', SITE_META_OPEN ? '1' : '0'); } catch (err) {}
    go('site'); return; }
  const ssec = e.target.closest('[data-sitesection]');
  if (ssec) {
    if (ssec.dataset.sitesection === 'passive') { PASS_TAB = 'rack'; go('passive'); return; }
    SITE_SECTION = ssec.dataset.sitesection; go('site'); return;
  }
  const stab = e.target.closest('[data-sitetab]');
  if (stab) { SITE_TAB = stab.dataset.sitetab; go('site'); return; }
  const ml = e.target.closest('[data-maplayer]');
  if (ml) { MAP_LAYER = ml.dataset.maplayer; go('location'); return; }
  const zb = e.target.closest('[data-zoom]');
  if (zb) { mapZoom(zb.dataset.zoom); return; }
  const lv = e.target.closest('[data-locview]');
  if (lv) { LOC_VIEW = lv.dataset.locview; go('location'); return; }
  const hx = e.target.closest('[data-hierexpand]');
  if (hx) { HIER_EXPANDED = !HIER_EXPANDED; go('location'); return; }
  const covx = e.target.closest('[data-covexpand]');
  if (covx) {
    const k = covx.dataset.covexpand;
    COV_EXPANDED = COV_EXPANDED === k ? null : k;
    go('location');
    /* go() just rebuilt the table, so the row the reader clicked is a
       brand-new element at the same position — bring it back into view
       inside its own scroll box rather than leaving it wherever the
       (now taller, or shorter) table happens to have scrolled to */
    const row = document.getElementById('cov-row-' + k);
    if (row) row.scrollIntoView({ block: 'nearest' });
    return;
  }
  const mc = e.target.closest('[data-mapcolor]');
  if (mc) { MAP_COLOR = mc.dataset.mapcolor; go('location'); return; }
  const mb = e.target.closest('path.st[data-circle]');
  if (mb) { selectMapState(mb.dataset.circle); return; }
  const tb = e.target.closest('[data-tab]');
  if (tb) {
    const [g, k] = tb.dataset.tab.split(':');
    TAB[g] = k;
    if (g === 'phy') {
      go('physical', { label: `${k} in inventory`, q: `cls=${k}` });
      return;
    }
    if (g === 'link') {
      go('links', { label: `${k} links`, q: `tab=${k}` });
      return;
    }
    if (g === 'pas') {
      go('passive', { label: `${k} passive`, q: `tab=${k}` });
      return;
    }
    if (g === 'svc') {
      go('services', { label: `${k} services`, q: `tab=${k}` });
      return;
    }
    go(CURRENT);
    return;
  }

  const nef = e.target.closest('[data-ne-filter]');
  if (nef) { NE_FILTER = nef.dataset.neFilter; go('reconcile'); return; }

  const tgf = e.target.closest('[data-tgt-filter]');
  if (tgf) { TGT_FILTER = tgf.dataset.tgtFilter; go('targets'); return; }

  const jbf = e.target.closest('[data-job-filter]');
  if (jbf) { JOB_FILTER = jbf.dataset.jobFilter; go('jobs'); return; }

  const run = e.target.closest('[data-run]');
  if (run) { TXRUN = Number(run.dataset.run); go('target'); return; }

  const txdl = e.target.closest('[data-txdownload]');
  if (txdl) {
    const blob = new Blob([JSON.stringify({ run: TXRUN, target: TRANSCRIPT, steps: txSteps() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `run-${TXRUN}-${TRANSCRIPT.host}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const nav = e.target.closest('[data-nav]');
  if (nav) { go(nav.dataset.nav); return; }

  const tile = e.target.closest('[data-circle]');
  if (tile) {
    SEL_CIRCLE = tile.dataset.circle;
    document.querySelectorAll('.carto-tile').forEach(t => t.classList.toggle('is-sel', t.dataset.circle === SEL_CIRCLE));
    const d = document.getElementById('circledetail');
    if (d) d.innerHTML = circleDetail();
    return;
  }
  const per = e.target.closest('[data-period]');
  if (per) { PERIOD = per.dataset.period; applyPeriod(); go(CURRENT); return; }

  const seg = e.target.closest('.seg > button');
  if (seg) seg.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b === seg));
});

/* ── sidebar collapse ─────────────────────────────────── */
const appEl = document.querySelector('.app');
document.querySelectorAll('.side-item').forEach(b => {
  const label = b.querySelector('.grow');
  if (label) b.dataset.label = label.textContent.trim();
});
function setCollapsed(on) {
  appEl.classList.toggle('is-collapsed', on);
  const t = document.getElementById('sidetoggle');
  t.setAttribute('aria-expanded', String(!on));
  t.setAttribute('aria-label', on ? 'Expand menu' : 'Collapse menu');
  t.title = on ? 'Expand menu' : 'Collapse menu';
  try { localStorage.setItem('nst-side', on ? '1' : '0'); } catch (e) {}
}
try { if (localStorage.getItem('nst-side') === '1') setCollapsed(true); } catch (e) {}
document.getElementById('sidetoggle').addEventListener('click', e => {
  e.stopPropagation(); setCollapsed(!appEl.classList.contains('is-collapsed'));
});
document.querySelector('.side-chevron').addEventListener('click', e => {
  e.stopPropagation(); setCollapsed(!appEl.classList.contains('is-collapsed'));
});

/* ── capex editor ─────────────────────────────────────── */
function refreshCapex() {
  const b = document.getElementById('cxbody');
  if (b) b.innerHTML = capexRowsHtml();
  const t = document.getElementById('cxtotals');
  if (t) t.innerHTML = capexTotalsHtml();
}
function refreshOpex() {
  const b = document.getElementById('oxbody');
  if (b) b.innerHTML = opexRowsHtml();
  const t = document.getElementById('oxtotals');
  if (t) t.innerHTML = opexTotalsHtml();
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.classList && el.classList.contains('cx-hd')) {
    const d = capexDraft();
    d[el.dataset.f] = el.dataset.f === 'approved' ? Number(el.value) || 0 : el.value;
    CAPEX_SAVED = false;
    const t = document.getElementById('cxtotals'); if (t) t.innerHTML = capexTotalsHtml();
    return;
  }
  if (el.classList && el.classList.contains('cx-in')) {
    const d = capexDraft(), i = Number(el.dataset.i), f = el.dataset.f;
    d.items[i][f] = (f === 'q' || f === 'u') ? Number(el.value) || 0 : el.value;
    CAPEX_SAVED = false;
    const amt = document.getElementById('cxamt' + i);
    if (amt) amt.textContent = inr(d.items[i].q * d.items[i].u);
    const t = document.getElementById('cxtotals'); if (t) t.innerHTML = capexTotalsHtml();
    return;
  }
  if (el.hasAttribute && el.hasAttribute('data-nperfsel')) {
    NODE_PERF = el.value; go('node'); return;
  }
  if (el.hasAttribute && el.hasAttribute('data-gridsearch')) {
    const key = el.dataset.gridsearch, pos = el.selectionStart;
    gridOf(key).search = el.value;
    /* go() rebuilds the DOM, which would drop focus mid-word — put it back */
    DRILL_PENDING = DRILL; go(CURRENT);
    const again = document.querySelector(`[data-gridsearch="${CSS.escape(key)}"]`);
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
    return;
  }
  if (el.hasAttribute && el.hasAttribute('data-filterval')) {
    const [key, field] = el.dataset.filterval.split('|');
    gridOf(key).filters[field] = el.value;
    return; /* applied on "Apply filters", not per keystroke */
  }
  if (el.classList && el.classList.contains('ox-hd')) {
    const d = opexDraft();
    d[el.dataset.f] = el.dataset.f === 'budget' ? Number(el.value) || 0 : el.value;
    OPEX_SAVED = false;
    const t = document.getElementById('oxtotals'); if (t) t.innerHTML = opexTotalsHtml();
    return;
  }
  if (el.classList && el.classList.contains('ox-in')) {
    const d = opexDraft(), i = Number(el.dataset.i), f = el.dataset.f;
    d.items[i][f] = (f === 'amt' || f === 'esc') ? Number(el.value) || 0 : el.value;
    OPEX_SAVED = false;
    const amt = document.getElementById('oxamt' + i);
    if (amt) amt.textContent = inr(Math.round(opexMonthly(d.items[i])));
    const t = document.getElementById('oxtotals'); if (t) t.innerHTML = opexTotalsHtml();
  }
});
document.addEventListener('change', e => {
  if (e.target.hasAttribute && e.target.hasAttribute('data-mapstate')) {
    selectMapState(e.target.value); return;
  }
  if (e.target.hasAttribute && e.target.hasAttribute('data-filterval')) {
    const [key, field] = e.target.dataset.filterval.split('|');
    gridOf(key).filters[field] = e.target.value;
    return;
  }
  const c = e.target.classList;
  if (c && (c.contains('cx-in') || c.contains('cx-hd') || c.contains('ox-in') || c.contains('ox-hd')))
    e.target.dispatchEvent(new Event('input', { bubbles: true }));
});

/* ── map state selection ──────────────────────────────── */
/* One path for every way a state can be chosen — boundary click, cluster
   pin, dropdown — so the outline, the panel and the filter can't drift
   apart. code = circle code, or null/'' for the all-India rollup. */
function syncMapSel() {
  document.querySelectorAll('path.st').forEach(x => {
    const on = !!LOC_SEL && x.dataset.circle === LOC_SEL;
    x.classList.toggle('is-sel', on);
    x.setAttribute('stroke', on ? 'var(--vw-color-gray-900)' : 'var(--vw-color-white)');
    x.setAttribute('stroke-width', on ? 2.4 : 0.9);
  });
}
function selectMapState(code) {
  LOC_SEL = code || null;
  PIN_GROUP = null;
  syncMapSel();
  const p = document.getElementById('mappanel');
  if (p) p.innerHTML = mapPanel();
}

/* ── map pan / zoom ───────────────────────────────────── */
let MZ = { k: 1, x: 0, y: 0 };
/* Unbounded pan/zoom can carry the whole map off-canvas and leave it looking
   blank with nothing left to click back to. Keep a slice always on screen. */
function clampMZ() {
  const sx = GEO.W * 0.4, sy = GEO.H * 0.4;
  MZ.x = Math.min(GEO.W - sx, Math.max(sx - GEO.W * MZ.k, MZ.x));
  MZ.y = Math.min(GEO.H - sy, Math.max(sy - GEO.H * MZ.k, MZ.y));
}
function applyMZ() {
  const g = document.getElementById('mapzoom');
  if (g) g.setAttribute('transform', `translate(${MZ.x} ${MZ.y}) scale(${MZ.k})`);
}
function mapZoom(dir) {
  const svg = document.getElementById('mapsvg'); if (!svg) return;
  if (dir === 'reset') { MZ = { k:1, x:0, y:0 }; return applyMZ(); }
  const f = dir === 'in' ? 1.35 : 1/1.35, k2 = Math.min(8, Math.max(1, MZ.k * f));
  const cx = GEO.W/2, cy = GEO.H/2;
  MZ.x = cx - (cx - MZ.x) * (k2 / MZ.k);
  MZ.y = cy - (cy - MZ.y) * (k2 / MZ.k);
  MZ.k = k2; clampMZ(); applyMZ(); repin();
}
function repin() {
  const g = document.getElementById('mapzoom'); if (!g || CURRENT !== 'location' || LOC_VIEW !== 'map') return;
  const svg = document.getElementById('mapsvg');
  const t = g.getAttribute('transform');
  svg.outerHTML = mapSvg();
  const g2 = document.getElementById('mapzoom'); if (g2) g2.setAttribute('transform', t);
  const s2 = document.getElementById('mapsvg'); if (s2) { s2.dataset.bound = ''; bindMap(); }
}
function bindMap() {
  const svg = document.getElementById('mapsvg'); if (!svg || svg.dataset.bound) return;
  svg.dataset.bound = '1';
  let drag = null;
  /* Capture only once a real drag starts. Capturing already on pointerdown
     makes the browser retarget pointerup to the svg, and the compatibility
     click event then fires on the svg instead of the state path under the
     pointer — which silently kills state selection. A small movement
     threshold is what separates a click from a pan. */
  svg.addEventListener('pointerdown', e => { drag = { x:e.clientX, y:e.clientY, ox:MZ.x, oy:MZ.y, id:e.pointerId, live:false }; });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.live) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 5) return;
      drag.live = true; svg.setPointerCapture(drag.id);
    }
    const r = svg.getBoundingClientRect(), s = GEO.W / r.width;
    MZ.x = drag.ox + (e.clientX - drag.x) * s; MZ.y = drag.oy + (e.clientY - drag.y) * s; clampMZ(); applyMZ();
  });
  const stop = () => { drag = null; };
  svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop); svg.addEventListener('pointerleave', stop);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect(), s = GEO.W / r.width;
    const mx = (e.clientX - r.left) * s, my = (e.clientY - r.top) * s;
    const f = e.deltaY < 0 ? 1.18 : 1/1.18, k2 = Math.min(8, Math.max(1, MZ.k * f));
    MZ.x = mx - (mx - MZ.x) * (k2 / MZ.k); MZ.y = my - (my - MZ.y) * (k2 / MZ.k); MZ.k = k2; clampMZ(); applyMZ();
    clearTimeout(window.__rp); window.__rp = setTimeout(repin, 160);
  }, { passive: false });
  applyMZ();
}

go('insights');
