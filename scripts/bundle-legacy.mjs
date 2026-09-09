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
  /* React owns some screens now: hand those over with the pending drill */
  if (window.__nsBridge && window.__nsBridge.owns(k)) {
    const d = DRILL_PENDING; DRILL_PENDING = null;
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

/* 2c. the Site details tab is a React screen */
patch(`      <button class="stab\${SITE_SECTION==='opex'?' is-on':''}" data-sitesection="opex">Opex
        <span class="tab-n num">\${inrShort(oxRun)}/mo</span></button>
    </div>`, `      <button class="stab\${SITE_SECTION==='opex'?' is-on':''}" data-sitesection="opex">Opex
        <span class="tab-n num">\${inrShort(oxRun)}/mo</span></button>
      <button class="stab" data-nav="sitedetails">Site details</button>
      <button class="stab" data-nav="siteequipment">Site equipment</button>
    </div>`, 'site details tab');

/* 2d. the transcript has no breadcrumb to go back by — give it a button */
patch(`      \`<button class="nst-btn nst-btn--sm" data-txdownload="1">Download payload</button>\`)}`,
`      \`<button class="nst-btn nst-btn--sm" data-nav="targets">Back to targets</button>
       <button class="nst-btn nst-btn--sm" data-txdownload="1">Download payload</button>\`)}`, 'transcript back button');

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
        \`<div class="seg">\${segs.map(([k,l]) => \`<button class="\${TGT_FILTER===k?'is-on':''}" data-tgt-filter="\${k}">\${l}</button>\`).join('')}</div>
         \${chip(\`\${n(DL.runFail)} failed\`,'error')}\${chip(\`\${n(DL.runPartial)} partial\`,'warning')}\`,
        [], 'targets')}`, 'targets quick filter in grid bar');
patch(`  if (/re-?run|re-?reconcile|refresh|survey|test/.test(t)) return KI.run;`,
      `  if (/re-?run|run now|re-?reconcile|refresh|survey|test/.test(t)) return KI.run;`, 'run-now icon');

/* 3. after an in-place render, tell React so the URL follows the screen */
patch(`    if (window.ResizeObserver) new ResizeObserver(mark).observe(w);
  });
  lazyGrids();
}
`, `    if (window.ResizeObserver) new ResizeObserver(mark).observe(w);
  });
  lazyGrids();
  if (window.__nsBridge && window.__nsBridge.sync) window.__nsBridge.sync(CURRENT, __legacyParams(CURRENT));
}
function __legacyParams(k) {
  return k === 'site' ? { id: SITE_ID } : k === 'capex' ? { id: CAPEX_ID } : k === 'opex' ? { id: OPEX_ID }
    : k === 'resource' ? { name: RES_ID } : k === 'node' ? { name: NODE_ID }
    : k === 'sitedetails' || k === 'siteequipment' ? { id: SITE_ID }
    : k === 'target' ? { host: 'NDLS-J960-P_R1-T1-NR' } : {};
}
`, 'sync after render');

/* 4. no self-boot; React mounts a view and asks for it */
patch(/\ngo\('insights'\);\s*$/, '\n', 'boot call');

/* 5. what the bridge needs */
src += `
/* ── bridge surface for the React shell ─────────────────── */
window.__nsLegacy = {
  go, drillTo, applyDrillQuery, VIEWS,
  current: () => CURRENT,
  setDrill: d => { DRILL_PENDING = d; },
  /* deep links into detail screens set the id the view reads */
  setParams: (k, p) => {
    if (k === 'site'  && p.id)   { SITE_ID = p.id; SITE_TAB = 'router'; SITE_SECTION = 'ne'; }
    if (k === 'capex' && p.id)   { CAPEX_ID = p.id; SITE_ID = p.id; SITE_SECTION = 'capex'; }
    if (k === 'opex'  && p.id)   { OPEX_ID = p.id; SITE_ID = p.id; SITE_SECTION = 'opex'; }
    if (k === 'resource' && p.name) { RES_ID = p.name; RES_TAB = 'overview'; }
    if (k === 'node'  && p.name) { NODE_ID = p.name; NODE_PERF = '24h'; NODE_ALERT_TAB = 'alerts'; NODE_LINK_PROTO = 'LLDP'; }
  },
  /* React's sidebar collapse drives the same class the prototype's CSS keys on */
  setCollapsed
};
`;

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'legacy.js'), src);
console.log('public/legacy.js', src.length, 'bytes');
