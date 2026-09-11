/* Concatenates the prototype's renderer into public/legacy.js and patches its
   router so React owns the shell. Screens not yet ported render through it;
   each port deletes its view function here. Run: npm run legacy:bundle */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['geo-data.js', 'app-helpers.js', 'app-data.js', 'app-period.js', 'app-grid.js', 'res-data.js',
  'app-views.js', 'app-res.js', 'app-opex.js', 'app-node.js', 'app-node2.js', 'app-router.js'];

let src = ORDER.map(f => readFileSync(join(root, 'legacy', f), 'utf8')).join('\n');

const patch = (from, to, label) => {
  if (!(from instanceof RegExp ? from.test(src) : src.includes(from))) throw new Error('legacy patch failed: ' + label);
  src = src.replace(from, to);
};

/* 1. the shell elements are React's; look them up when needed, never at load */
patch(`const viewEl = document.getElementById('view'),
      crumbEl = document.getElementById('crumb'),
      modEl  = document.getElementById('module');`,
`const _el = id => document.getElementById(id) || document.createElement('div');
let viewEl, crumbEl, modEl;`, 'lazy shell elements');

patch(`function go(k) {
  const v = VIEWS[k] || VIEWS.insights;`,
`function go(k) {
  /* React owns some screens now: hand those over with the pending drill.
     This is a real navigation away, same as the isNav branch below, so it
     must clear the same transient UI state and move CURRENT off the old
     legacy view — otherwise a stray click on the React screen (e.g. one
     that lands outside where a now-gone kebab menu used to be) is still
     seen by this document-level listener, which closes-the-menu by calling
     go(CURRENT) against a view the reader already left, and that view's own
     URL sync then shoves the browser back to it. */
  if (window.__nsBridge && window.__nsBridge.owns(k)) {
    let d = DRILL_PENDING; DRILL_PENDING = null;
    /* the site's React tabs stay inside the same site: hand the active drill
       context (label + origin) over so the breadcrumb keeps naming the path
       the reader actually took */
    if (!d && DRILL && DRILL.view === CURRENT && (k === 'sitedetails' || k === 'siteequipment'))
      d = { label: DRILL.label, q: '', from: DRILL.from };
    KEBAB = null; GRIDMENU = false; FILTER_OPEN = false; FILTER_FIELD = 0;
    CURRENT = k;
    window.__nsBridge.navigate(k, d, __legacyParams(k));
    return;
  }
  viewEl = _el('view'); crumbEl = _el('crumb'); modEl = _el('module');
  const v = VIEWS[k] || VIEWS.insights;`, 'bridge in go()');

/* 2. the sidebar is React's too */
patch(`const appEl = document.querySelector('.app');`, `const appEl = document.querySelector('.app') || document.createElement('div');`, 'appEl');
patch(`document.getElementById('sidetoggle').addEventListener('click', e => {
  e.stopPropagation(); setCollapsed(!appEl.classList.contains('is-collapsed'));
});
document.querySelector('.side-chevron').addEventListener('click', e => {
  e.stopPropagation(); setCollapsed(!appEl.classList.contains('is-collapsed'));
});`, `/* sidebar collapse is handled by the React shell */`, 'sidebar listeners');
patch(`function setCollapsed(on) {
  appEl.classList.toggle('is-collapsed', on);
  const t = document.getElementById('sidetoggle');`,
`function setCollapsed(on) {
  appEl.classList.toggle('is-collapsed', on);
  const t = document.getElementById('sidetoggle'); if (!t) return;`, 'setCollapsed guard');

/* 2b. the rail highlight is React's; the prototype must not touch it */
patch(`  document.querySelectorAll('.side-item').forEach(b => b.classList.toggle('is-active',
    CURRENT === 'inactive' ? b.hasAttribute('data-inactive') : b.dataset.nav === active));`,
`  void active; /* rail highlight is owned by the React sidebar */`, 'rail highlight');



/* 2e. scan targets: the quick filter sits in the grid bar, Run now in its kebab */
patch(`    \${pageBar(\`<div class="seg">\${segs.map(([k,l]) => \`<button class="\${TGT_FILTER===k?'is-on':''}" data-tgt-filter="\${k}">\${l}</button>\`).join('')}</div>\`)}
    \${drillBar()}
    \${card(\`
      \${gridBar(rows.length, n(DL.targets), 'Gateway IP, hostname, serial', FS.targets,
        \`\${chip(\`\${n(DL.runFail)} failed\`,'error')}\${chip(\`\${n(DL.runPartial)} partial\`,'warning')}
         <button class="nst-btn nst-btn--filled nst-btn--sm js-ack">Run now</button>\`, [], 'targets')}`,
`    \${drillBar()}
    \${card(\`
      \${gridBar(rows.length, n(DL.targets), 'Gateway IP, hostname, serial', FS.targets,
        \`<div class="seg">\${segs.map(([k,l]) => \`<button class="\${activeKey === k.toLowerCase()?'is-on':''}" data-tgt-filter="\${k}">\${l}</button>\`).join('')}</div>\`,
        [], 'targets')}`, 'targets quick filter in grid bar');
patch(`  if (/re-?run|re-?reconcile|refresh|survey|test/.test(t)) return KI.run;`,
      `  if (/re-?run|run now|re-?reconcile|refresh|survey|test/.test(t)) return KI.run;`, 'run-now icon');

/* 3. after an in-place render, tell React so the URL follows the screen */
patch(`    if (window.ResizeObserver) new ResizeObserver(mark).observe(w);
  });
  lazyGrids();
  layoutStockChips();
}
`, `    if (window.ResizeObserver) new ResizeObserver(mark).observe(w);
  });
  lazyGrids();
  layoutStockChips();
  if (window.__nsBridge && window.__nsBridge.sync)
    window.__nsBridge.sync(CURRENT, __legacyParams(CURRENT),
      DRILL && DRILL.view === CURRENT ? { label: DRILL.label, q: DRILL.q, from: DRILL.from } : null);
}
function __legacyParams(k) {
  return k === 'site' ? { id: SITE_ID } : k === 'capex' ? { id: CAPEX_ID } : k === 'opex' ? { id: OPEX_ID }
    : k === 'resource' ? { name: RES_ID } : k === 'node' ? { name: NODE_ID } : k === 'vnfdetails' ? { name: VNF_DETAIL_ID }
    : k === 'cell4gdetails' ? { cell: CELL_4G_NAME } : k === 'cell5gdetails' ? { cell: CELL_5G_NAME }
    : k === 'sitedetails' || k === 'siteequipment' ? { id: SITE_ID }
    : k === 'target' ? { host: TARGET_ID } : {};
}
`, 'sync after render');

/* 4. no self-boot; React mounts a view and asks for it */
patch(/\ngo\('insights'\);\s*$/, '\n', 'boot call');

/* 5. what the bridge needs */
src += `
/* ── bridge surface for the React shell ─────────────────── */
/* one-shot: a React screen names which site section the next visit lands on
   (e.g. its "Network elements" tab), instead of the default Attention */
let __siteSectionPending = null;
window.__nsLegacy = {
  go, drillTo, applyDrillQuery, VIEWS,
  current: () => CURRENT,
  /* the site header, as data — the React Site details / Site equipment
     screens render the same header viewSite draws */
  siteHead: siteHeadData,
  setSection: s => { __siteSectionPending = s; },
  /* map any location tag (sample city codes included) to the real roster row */
  resolveSite: ref => { const r = resolveSite(ref); return r ? { id: r.id, name: r.name } : null; },
  /* URL-driven only (the LegacyView effect). A null here means the URL has
     no drill — the live DRILL must clear too, or go()'s refresh path keeps
     the stale one and sync() shoves the old drill URL back on top of a
     browser-back navigation, which reads as "back doesn't work". */
  setDrill: d => { DRILL_PENDING = d; if (!d) DRILL = null; },
  /* deep links into detail screens set the id the view reads */
  setParams: (k, p) => {
    if (k === 'site'  && p.id)   { SITE_ID = p.id; SITE_TAB = 'router';
      SITE_SECTION = __siteSectionPending || 'attention'; __siteSectionPending = null; }
    if (k === 'capex' && p.id)   { CAPEX_ID = p.id; SITE_ID = p.id; SITE_SECTION = 'capex'; }
    if (k === 'opex'  && p.id)   { OPEX_ID = p.id; SITE_ID = p.id; SITE_SECTION = 'opex'; }
    if (k === 'resource' && p.name) { RES_ID = p.name; RES_TAB = 'overview'; }
    if (k === 'node'  && p.name) { NODE_ID = p.name; NODE_TAB = 'overview'; NODE_PERF = '24h'; NODE_ALERT_TAB = 'alerts'; NODE_LINK_PROTO = 'LLDP'; }
    if (k === 'vnfdetails' && p.name) { VNF_DETAIL_ID = p.name; VNF_DETAIL_TAB = 'vdu4g'; }
    if (k === 'cell4gdetails' && p.cell) { CELL_4G_NAME = p.cell; }
    if (k === 'cell5gdetails' && p.cell) { CELL_5G_NAME = p.cell; }
    if (k === 'target' && p.host) {
      const decoded = decodeURIComponent(p.host);
      if (decoded !== TARGET_ID) { TARGET_ID = decoded; TXRUN = 4412; TXSTEP = 0; }
    }
  },
  /* React's sidebar collapse drives the same class the prototype's CSS keys on */
  setCollapsed
};
`;

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'legacy.js'), src);
console.log('public/legacy.js', src.length, 'bytes');
