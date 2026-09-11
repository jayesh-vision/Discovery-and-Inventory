/* ═══ grid chrome: row kebab menus, toolbar, filter panel ═══ */
const IC_SEARCH = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
const IC_FILTER = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>`;
const IC_KEBAB  = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>`;
const IC_REFRESH = `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8a6 6 0 1 1-1.9-4.4"/><path d="M14 2v3.6h-3.6"/></svg>`;
const IC_X      = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

let KEBAB = null;          /* "<gridId>:<rowIndex>" of the open row menu */
let GRIDMENU = false;      /* the toolbar's own overflow menu            */
let FILTER_OPEN = false;   /* the Filters panel                          */
let FILTER_FIELD = 0;
let GRID_N = 0;            /* reset each render so grid ids are stable   */

/* ── search + filters, per grid ───────────────────────────
   Keyed by the grid's own key (one per screen). A grid's search box and
   filter panel write into this; the view reads it back through gridApply()
   before it builds its rows, so both actually narrow what's on screen. */
let GRID_STATE = {};
const gridOf = key => GRID_STATE[key] || (GRID_STATE[key] = { search: '', filters: {} });
/* No per-grid field mapping to keep in sync: a row matches if the query (or
   every active filter value) appears anywhere in that row's own data. */
function getLegacyFieldValue(r, field) {
  if (!r || typeof r !== 'object') return '';
  const f = field.toLowerCase().trim();

  if (f === 'status' || f === 'state' || f === 'outcome' || f === 'result') {
    if (r.st) {
      if (typeof RSTATE !== 'undefined' && RSTATE[r.st]) return RSTATE[r.st][0];
      if (typeof lst !== 'undefined' && lst[r.st]) return lst[r.st][0];
      return String(r.st);
    }
    if (r.status) return String(r.status);
    if (r.outcome) return String(r.outcome);
    if (r.result) return String(r.result);
    if (r.res) return String(r.res);
  }

  if (f === 'stock state' || f === 'stock') {
    if (r.stock && typeof stockMeta !== 'undefined') return stockMeta(r.stock).n;
    if (r.stock) return String(r.stock);
  }

  if (f === 'source') {
    if (r.s && typeof SRC !== 'undefined' && SRC[r.s]) return SRC[r.s][0];
    if (r.source) return String(r.source);
  }

  for (const [k, v] of Object.entries(r)) {
    const kClean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fClean = f.replace(/[^a-z0-9]/g, '');
    if (kClean === fClean) return String(v);
  }

  return '';
}

function gridApply(key, rows) {
  const st = gridOf(key);
  const q = st.search.trim().toLowerCase();
  const need = Object.entries(st.filters).filter(([, v]) => v && String(v).trim() !== '');
  if (!q && !need.length) return rows;

  return rows.filter(r => {
    let text = JSON.stringify(r).toLowerCase();
    if (r && typeof r === 'object') {
      if (r.st) {
        if (typeof RSTATE !== 'undefined' && RSTATE[r.st]) text += ' ' + RSTATE[r.st][0].toLowerCase();
        if (typeof lst !== 'undefined' && lst[r.st]) text += ' ' + lst[r.st][0].toLowerCase();
      }
      if (r.stock && typeof stockMeta !== 'undefined') text += ' ' + stockMeta(r.stock).n.toLowerCase();
      if (r.s && typeof SRC !== 'undefined' && SRC[r.s]) text += ' ' + SRC[r.s][0].toLowerCase();
    }

    if (q && !text.includes(q)) return false;

    for (const [field, fVal] of need) {
      const v = String(fVal).trim().toLowerCase();
      if (!v) continue;
      const fieldVal = getLegacyFieldValue(r, field).toLowerCase();
      if (fieldVal) {
        if (!fieldVal.includes(v)) return false;
      } else {
        if (!text.includes(v)) return false;
      }
    }

    return true;
  });
}

/* one action: A('Label') or A('Label', {v,l,q}) or A('Label', null, true) for danger */
/* Row actions carry a leading icon, as the platform grids do. The icon is
   inferred from the verb so no call site has to name one. */
const KI = {
  view:  '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z"/><circle cx="8" cy="8" r="2"/>',
  life:  '<path d="M2 4h5M11 4h3M2 8h9M13 8h1M2 12h3M8 12h6"/><circle cx="9" cy="4" r="1.6"/><circle cx="12.4" cy="8" r="1.6"/><circle cx="6" cy="12" r="1.6"/>',
  jobs:  '<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M5 6h6M5 9h6M5 11.5h3"/>',
  open:  '<path d="M9 2h5v5M14 2 7.5 8.5"/><path d="M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5"/>',
  run:   '<path d="M14 8a6 6 0 1 1-1.8-4.3"/><path d="M14 2v3.5h-3.5"/>',
  copy:  '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/>',
  down:  '<path d="M8 2v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11"/>',
  undo:  '<path d="M3 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2 2.5V6h3.5"/>',
  del:   '<path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9"/>',
  add:   '<path d="M8 3v10M3 8h10"/>',
  print: '<path d="M4.5 6V2.5h7V6M4.5 12.5h7V10h-7Z"/><rect x="2" y="6" width="12" height="4.5" rx="1"/>',
  cal:   '<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5.5 2v2M10.5 2v2"/>',
  cols:  '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M6.5 3v10M10 3v10"/>',
  opts:  '<path d="M2 4.5h7M12 4.5h2M2 8h2M7 8h7M2 11.5h9"/><circle cx="10.5" cy="4.5" r="1.6"/><circle cx="5.5" cy="8" r="1.6"/><circle cx="12.5" cy="11.5" r="1.6"/>',
  save:  '<path d="M3 2.5h8L13.5 5v8.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"/><path d="M5 2.5v4h6"/>',
  node:  '<rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M6.5 1.5v2.5M9.5 1.5v2.5M6.5 12v2.5M9.5 12v2.5M1.5 6.5H4M1.5 9.5H4M12 6.5h2.5M12 9.5h2.5"/>',
  file:  '<path d="M9 2H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5.5Z"/><path d="M9 2v3.5h3.5"/>',
  pin:   '<path d="M8 14s5-4.4 5-8A5 5 0 0 0 3 6c0 3.6 5 8 5 8Z"/><circle cx="8" cy="6" r="1.8"/>'
};
const kiFor = l => {
  const t = String(l).toLowerCase();
  if (/node view|hardware/.test(t)) return KI.node;
  if (/life ?cycle|change|edit|rename|assign|stock state/.test(t)) return KI.life;
  if (/job|history|log|audit|workorder/.test(t)) return KI.jobs;
  if (/purge|delete|retire|remove/.test(t)) return KI.del;
  if (/re-?run|re-?reconcile|refresh|survey|test/.test(t)) return KI.run;
  if (/copy/.test(t)) return KI.copy;
  if (/download|export|report/.test(t)) return KI.down;
  if (/restore|recover|revert/.test(t)) return KI.undo;
  if (/create|new |add|instantiate|generate/.test(t)) return KI.add;
  if (/print|label/.test(t)) return KI.print;
  if (/schedule/.test(t)) return KI.cal;
  if (/table option|setting|preference/.test(t)) return KI.opts;
  if (/column/.test(t)) return KI.cols;
  if (/save/.test(t)) return KI.save;
  if (/site|location/.test(t)) return KI.pin;
  if (/import|attach|credential|collector/.test(t)) return KI.file;
  if (/open|go to|topology|reconcil/.test(t)) return KI.open;
  return KI.view;
};
const kIcon = l => `<svg class="kmi" viewBox="0 0 16 16" width="15" height="15" fill="none"
  stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${kiFor(l)}</svg>`;
const A = (l, d, danger) => ({ l, d, danger });
/* A row action that copies one of the row's own values. Every menu item on a
   screen either goes somewhere or does something — nothing is listed that only
   closes the menu again. */
const CP = (l, v) => ({ l, copy: v });

function kebabCell(items, gid, i) {
  const open = KEBAB === `${gid}:${i}`;
  if (!items.length) return '<td class="kb-td"></td>';
  return `<td class="kb-td">
    <button class="kb${open ? ' is-on' : ''}" data-kebab="${gid}:${i}" aria-label="Row actions"
      aria-expanded="${open}">${IC_KEBAB}</button>
    ${open ? `<div class="kmenu">${items.map(it =>
      `<button class="kmenu-i${it.danger ? ' is-danger' : ''}"${it.d ? dA(it.d) : ''}${
        it.copy ? ` data-copy="${esc(String(it.copy))}"` : ''}${
        it.linkview ? ` data-linkview="${esc(it.linkview)}"` : ''}>${kIcon(it.l)}<span>${it.l}</span></button>`).join('')}</div>` : ''}
  </td>`;
}

/* ── toolbar ───────────────────────────────────────────── */
function gridBar(showing, total, placeholder, spec, extra = '', acts = [], key = '') {
  const st = gridOf(key);
  const activeFilters = Object.values(st.filters).filter(Boolean).length;
  return `<div class="grid-bar">
    <span class="vw-card-description grid-count">${showing === null
      ? `<span class="num">${total}</span> records` : `Showing ${showing} of ${total}`}</span>
    <span class="nst-input-shell grid-search"><span class="gs-ic">${IC_SEARCH}</span>
      <input class="nst-input" placeholder="${placeholder}" aria-label="Search" data-gridsearch="${key}" value="${esc(st.search)}"></span>
    ${extra}
    <span class="grow"></span>
    <div class="grid-tools">
      <button class="icon-btn${FILTER_OPEN ? ' is-on' : ''}${activeFilters ? ' has-value' : ''}" data-filteropen="${key}" aria-label="Filters"
        aria-expanded="${FILTER_OPEN}">${IC_FILTER}</button>
      <button class="icon-btn${GRIDMENU ? ' is-on' : ''}" data-gridmenu="1" aria-label="More actions"
        aria-expanded="${GRIDMENU}">${IC_KEBAB}</button>
      ${GRIDMENU ? `<div class="kmenu kmenu-r">
        ${acts.length ? acts.map(a => `<button class="kmenu-i${a.primary ? ' is-primary' : ''}${(a.d || a.nav) ? '' : ' js-ack'}"${a.d ? dA(a.d) : ''}${
          a.nav ? ` data-nav="${a.nav}"` : ''}>${kIcon(a.l)}<span>${a.l}</span></button>`).join('') + '<div class="kmenu-sep"></div>' : ''}
        <button class="kmenu-i" data-gridrefresh="1">${kIcon('Refresh')}<span>Refresh</span></button>
        <button class="kmenu-i" data-gridexport="${key}|csv">${kIcon('Export as CSV')}<span>Export as CSV</span></button>
        <button class="kmenu-i" data-gridexport="${key}|xlsx">${kIcon('Export as XLSX')}<span>Export as XLSX</span></button></div>` : ''}
      ${FILTER_OPEN ? filterPanel(spec, key) : ''}
    </div>
  </div>`;
}

/* ── filter panel ──────────────────────────────────────── */
function filterPanel(spec, key = '') {
  const fields = spec && spec.length ? spec : [{ n: 'Status', o: ['On-air', 'Planned'] }];
  const f = fields[Math.min(FILTER_FIELD, fields.length - 1)];
  const val = gridOf(key).filters[f.n] || '';
  return `<div class="fpanel" role="dialog" aria-label="Filters">
    <div class="fpanel-head">
      <span class="vw-card-title-sm">Filters</span>
      <button class="fp-x" data-filterclose="1" aria-label="Close">${IC_X}</button>
    </div>
    <div class="fpanel-body">
      <div class="fpanel-nav">
        ${fields.map((x, i) => `<button class="fp-f${i === FILTER_FIELD ? ' is-on' : ''}${gridOf(key).filters[x.n] ? ' has-value' : ''}"
          data-filterfield="${i}">${x.n}</button>`).join('')}
      </div>
      <div class="fpanel-ctl">
        <span class="fp-label">${f.n}</span>
        ${f.o
          ? `<span class="nst-select-shell"><select class="nst-input fp-sel" data-filterval="${key}|${esc(f.n)}">
               <option value=""${val ? '' : ' selected'}></option>
               ${f.o.map(o => `<option${o === val ? ' selected' : ''}>${o}</option>`).join('')}</select></span>`
          : `<span class="nst-input-shell"><input class="nst-input" placeholder="Contains…" data-filterval="${key}|${esc(f.n)}" value="${esc(val)}"></span>`}
        ${f.h ? `<span class="fp-hint">${f.h}</span>` : ''}
      </div>
    </div>
    <div class="fpanel-foot">
      <span class="grow"></span>
      <button class="nst-btn nst-btn--sm" data-filterreset="${key}">Reset to default</button>
      <button class="nst-btn nst-btn--sm fp-apply" data-filterapply="${key}">Apply filters</button>
    </div>
  </div>`;
}

/* ── per-grid filter field specs ───────────────────────── */
const FS = {
  location: [{ n:'Status', o:['On-air','Planned','Building','Failed'] }, { n:'Name' },
             { n:'Category', o:['Central','Regional','Edge'] }, { n:'Location ID' },
             { n:'Site type', o:['POP','Cell Site','Macro-O','Micro-CO','Data centre'] },
             { n:'Zone', o:['North','South','East','West'] },
             { n:'State', o:['Karnataka','Delhi','Madhya Pradesh','Tamil Nadu','Andhra Pradesh','Odisha'] },
             { n:'District' }, { n:'Landlord' }, { n:'On-air date' }],
  physical: [{ n:'Status', o:['Agree','Differs','Stale','Never answered'] }, { n:'Stock state', o:['Planned','In store','Deployed','Faulty / RMA','Decommissioned'] },
             { n:'Name' }, { n:'IP address' }, { n:'OEM', o:['Juniper','Cisco','Nokia','Adva','Edgecore'] },
             { n:'Model' }, { n:'OS version' }, { n:'Location ID' },
             { n:'Software', o:['Current','Behind','Unknown'] }, { n:'End of sale' }],
  targets:  [{ n:'Outcome', o:['Exact match','Drifted','Stale','Missing','Rogue','Unclaimed','No adapter'] },
             { n:'Gateway IP' }, { n:'Hostname' }, { n:'Circle' }, { n:'Job' },
             { n:'Collector', o:['Device','Hardware','LLDP','OSPF','BGP','Service'] },
             { n:'Age', o:['Under 24 h','1 – 7 days','7 – 30 days','Over 30 days'] }],
  /* Status lists run states only — "held" describes the schedule, not the run,
     and lives in its own field */
  jobs:     [{ n:'Status', o:['Completed','Completed with errors','Running','No adapter'] },
             { n:'Schedule state', o:['held'], h:'A held job keeps its cadence but will not run until released.' },
             { n:'Job' }, { n:'Scope' }, { n:'Collector node' }, { n:'Credential profile' },
             { n:'Schedule', o:['Every 6 h','Daily','Weekly','On demand'] }],
  reconcile:[{ n:'Result', o:['Agree','Differ','Stale','Only in inventory','Only on network','Unidentified'] },
             { n:'Network element' }, { n:'IP address' }, { n:'Circle' }],
  virtual:  [{ n:'Status', o:['Ready','In progress','Failed'] }, { n:'NF name' },
             { n:'Type', o:['vDU','CU-CP','CU-UP'] }, { n:'Parent RAN node' }, { n:'Subcloud' }, { n:'Host' }],
  links:    [{ n:'Status', o:['Up','Down','Established','Idle','Active','Connect'] }, { n:'Source NE' },
             { n:'Source IP' }, { n:'Destination NE' }, { n:'Protocol', o:['LLDP','OSPF','BGP','ISIS'] }],
  services: [{ n:'Status', o:['Up','Down'] }, { n:'Service name' }, { n:'VRF — RD' },
             { n:'ERP number' }, { n:'Source IP' }],
  inactive: [{ n:'Name' }, { n:'Serial number' }, { n:'OEM' }, { n:'Reason' },
             { n:'Decommissioned' }, { n:'Workorder' }],
  reports:  [{ n:'Status', o:['Completed','Running','Failed'] }, { n:'Report name' },
             { n:'Type', o:['Discovery','Inventory','Capex','Compliance'] },
             { n:'Frequency', o:['Daily','Weekly','Monthly','On demand'] }, { n:'Creator' }],
  site:     [{ n:'Status' }, { n:'Name' }, { n:'IP address' }, { n:'Model' }, { n:'OEM' }, { n:'Stock state' }],
  passive:  [{ n:'Class' }, { n:'Identifier' }, { n:'Site' }, { n:'State' }, { n:'Owner' }],
  vlan:     [{ n:'VLAN ID' }, { n:'Name' }, { n:'Type', o:['Data','Server','Wireless','Voice','Guest','Management'] },
             { n:'STP state', o:['Forwarding','Blocking','Learning'] }, { n:'Status', o:['Active','Suspended'] },
             { n:'Trunk port' }, { n:'Access port' }]
};

/* ── infinite scroll ───────────────────────────────────────
   A view renders every row it has; the DOM shows the first LAZY_STEP of
   each grid and reveals the next LAZY_STEP whenever the reader reaches the
   end of the list. It runs over the rendered table rather than each view's
   row array, so every grid on every screen gets it without a call site.

   Reveal counts survive an in-place re-render (a kebab, a tab, a chip) by
   being keyed on the view and the grid's position in it; a changed row
   count — a search, a filter — means a new result set, so it restarts. */
const LAZY_STEP = 25;
const GRID_GAP = 72;  /* card padding and footer below the grid */
const GRID_MIN = 320; /* never squeezed below ~6 rows            */
let LAZY = {};        /* "<view>:<grid index>" -> { n, total, top } */
let LAZY_IO = [];     /* observers of the render now on screen      */
let LAZY_BOUND = false;

const grids = () => {
  const view = document.getElementById('view');
  return view ? Array.from(view.querySelectorAll('.tbl-wrap > table.nst-table')) : [];
};

/* A grid is as tall as its page of 25 rows, and never taller than the room left
   on screen below where it starts — so a screen whose grid is the content fills
   the window, while a grid under KPI cards takes the space it has. Measured,
   because a row carrying a second line is half again as tall as a plain one. */
function sizeGrid(tbl) {
  const wrap = tbl.parentNode, row = tbl.tBodies[0] && tbl.tBodies[0].rows[0];
  if (!row) return;
  const head = tbl.tHead ? tbl.tHead.offsetHeight : 0;
  const page = head + row.offsetHeight * LAZY_STEP;
  let avail = window.innerHeight - Math.max(0, wrap.getBoundingClientRect().top) - GRID_GAP;
  /* below the fold (a dashboard): a screenful, which is what it gets once
     the reader scrolls down to it */
  if (avail < GRID_MIN) avail = window.innerHeight - GRID_GAP;
  wrap.style.setProperty('--grid-h', Math.min(page, Math.max(GRID_MIN, avail)) + 'px');
}

/* the reader's place in each grid, kept across the re-render that a kebab, a
   tab or a chip triggers — the wrapper is a new element every time */
function saveGridScroll() {
  grids().forEach((tbl, i) => {
    const st = LAZY[CURRENT + ':' + i];
    if (st) st.top = tbl.parentNode.scrollTop;
  });
}

/* A row menu is anchored inside the grid's scroll box, which would clip it;
   place it against the button's position on screen instead. */
function placeMenus() {
  document.querySelectorAll('#view .kb-td .kmenu').forEach(m => {
    const b = m.previousElementSibling;
    if (!b) return;
    m.classList.add('kmenu--fixed');
    const r = b.getBoundingClientRect(), gap = 4;
    const below = r.bottom + gap + m.offsetHeight <= window.innerHeight;
    m.style.top = (below ? r.bottom + gap : Math.max(gap, r.top - gap - m.offsetHeight)) + 'px';
    m.style.left = Math.max(gap, Math.min(r.right - m.offsetWidth, window.innerWidth - m.offsetWidth - gap)) + 'px';
  });
}

function lazyGrids() {
  LAZY_IO.forEach(io => io.disconnect());
  LAZY_IO = [];
  if (!LAZY_BOUND) {
    LAZY_BOUND = true;
    window.addEventListener('resize', () => { grids().forEach(sizeGrid); placeMenus(); });
  }
  grids().forEach((tbl, i) => {
    const body = tbl.tBodies[0];
    if (!body) return;
    /* the "no records" placeholder is not a record */
    const rows = Array.from(body.rows).filter(r => !(r.cells[0] && r.cells[0].classList.contains('tbl-empty')));
    const key = CURRENT + ':' + i;
    const st = LAZY[key] && LAZY[key].total === rows.length ? LAZY[key] : (LAZY[key] = { n: LAZY_STEP, total: rows.length, top: 0 });
    sizeGrid(tbl);
    /* an open menu follows its row while the grid scrolls under it */
    tbl.parentNode.addEventListener('scroll', placeMenus, { passive: true });
    const restore = () => { tbl.parentNode.scrollTop = st.top || 0; };

    /* The grid bar sits just above the table. It counts the rows on screen out
       of the rows this result set holds — not the estate-wide population, which
       would read as though nothing had been paginated: a filter down to 175
       failed targets shows "25 of 175", never "175 of 2,308". */
    let bar = tbl.parentNode.previousElementSibling;
    while (bar && !bar.classList.contains('grid-bar')) bar = bar.previousElementSibling;
    const label = bar && bar.querySelector('.grid-count');
    const setLabel = shown => {
      if (label) label.textContent = `Showing ${n(shown)} of ${n(rows.length)}`;
    };
    if (rows.length <= LAZY_STEP) { setLabel(rows.length); restore(); return; }

    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'tbl-more';
    tbl.parentNode.appendChild(more);
    const paint = () => {
      rows.forEach((r, x) => { r.hidden = x >= st.n; });
      const left = rows.length - st.n;
      more.hidden = left <= 0;
      more.innerHTML = left > 0
        ? `Load the next ${n(Math.min(LAZY_STEP, left))}
           <span class="tbl-more-of">· ${n(st.n)} of ${n(rows.length)} loaded</span>` : '';
      setLabel(st.n);
    };
    paint();
    restore();
    more.addEventListener('click', () => {
      st.n = Math.min(st.n + LAZY_STEP, rows.length);
      paint();
    });
    if (typeof IntersectionObserver === 'undefined') { st.n = rows.length; paint(); return; }

    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting) || st.n >= rows.length) return;
      st.n = Math.min(st.n + LAZY_STEP, rows.length);
      paint();
      /* re-observe so the next block reveals itself when 25 more rows
         still do not fill the grid */
      if (st.n >= rows.length) io.disconnect();
      else { io.unobserve(more); io.observe(more); }
    }, { root: tbl.parentNode, rootMargin: '200px' });
    io.observe(more);
    LAZY_IO.push(io);
  });
  placeMenus();
}
