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

function kebabCell(items, gid, i) {
  const open = KEBAB === `${gid}:${i}`;
  return `<td class="kb-td">
    <button class="kb${open ? ' is-on' : ''}" data-kebab="${gid}:${i}" aria-label="Row actions"
      aria-expanded="${open}">${IC_KEBAB}</button>
    ${open ? `<div class="kmenu">${items.map(it =>
      `<button class="kmenu-i${it.danger ? ' is-danger' : ''}"${it.d ? dA(it.d) : ''}>${kIcon(it.l)}<span>${it.l}</span></button>`).join('')}</div>` : ''}
  </td>`;
}

/* ── toolbar ───────────────────────────────────────────── */
function gridBar(showing, total, placeholder, spec, extra = '', acts = []) {
  return `<div class="grid-bar">
    <span class="vw-card-description grid-count">${showing === null
      ? `<span class="num">${total}</span> records` : `Showing ${showing} of ${total}`}</span>
    <span class="nst-input-shell grid-search"><span class="gs-ic">${IC_SEARCH}</span>
      <input class="nst-input" placeholder="${placeholder}" aria-label="Search"></span>
    ${extra}
    <span class="grow"></span>
    <div class="grid-tools">
      <button class="icon-btn" data-gridrefresh="1" aria-label="Refresh">${IC_REFRESH}</button>
      <button class="icon-btn${FILTER_OPEN ? ' is-on' : ''}" data-filteropen="1" aria-label="Filters"
        aria-expanded="${FILTER_OPEN}">${IC_FILTER}</button>
      <button class="icon-btn${GRIDMENU ? ' is-on' : ''}" data-gridmenu="1" aria-label="More actions"
        aria-expanded="${GRIDMENU}">${IC_KEBAB}</button>
      ${GRIDMENU ? `<div class="kmenu kmenu-r">
        ${acts.length ? acts.map(a => `<button class="kmenu-i${a.primary ? ' is-primary' : ''}"${a.d ? dA(a.d) : ''}${
          a.nav ? ` data-nav="${a.nav}"` : ''}>${kIcon(a.l)}<span>${a.l}</span></button>`).join('') + '<div class="kmenu-sep"></div>' : ''}
        ${['Export as CSV', 'Export as XLSX', 'Choose columns', 'Save this view', 'Print']
          .map(l => `<button class="kmenu-i">${kIcon(l)}<span>${l}</span></button>`).join('')}</div>` : ''}
      ${FILTER_OPEN ? filterPanel(spec) : ''}
    </div>
  </div>`;
}

/* ── filter panel ──────────────────────────────────────── */
function filterPanel(spec) {
  const fields = spec && spec.length ? spec : [{ n: 'Status', o: ['On-air', 'Planned'] }];
  const f = fields[Math.min(FILTER_FIELD, fields.length - 1)];
  return `<div class="fpanel" role="dialog" aria-label="Filters">
    <div class="fpanel-head">
      <span class="vw-card-title-sm">Filters</span>
      <button class="fp-x" data-filterclose="1" aria-label="Close">${IC_X}</button>
    </div>
    <div class="fpanel-body">
      <div class="fpanel-nav">
        ${fields.map((x, i) => `<button class="fp-f${i === FILTER_FIELD ? ' is-on' : ''}"
          data-filterfield="${i}">${x.n}</button>`).join('')}
      </div>
      <div class="fpanel-ctl">
        <span class="fp-label">${f.n}</span>
        ${f.o
          ? `<span class="nst-select-shell"><select class="nst-input fp-sel">
               <option value=""></option>
               ${f.o.map(o => `<option>${o}</option>`).join('')}</select></span>`
          : `<span class="nst-input-shell"><input class="nst-input" placeholder="Contains…"></span>`}
        ${f.h ? `<span class="fp-hint">${f.h}</span>` : ''}
      </div>
    </div>
    <div class="fpanel-foot">
      <button class="nst-btn nst-btn--sm">Advance</button>
      <span class="grow"></span>
      <button class="nst-btn nst-btn--sm" data-filterclose="1">Reset to default</button>
      <button class="nst-btn nst-btn--sm nst-btn--filled" data-filterclose="1">Apply filters</button>
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
  jobs:     [{ n:'Status', o:['Completed','Completed with errors','Running','No adapter','Held'] },
             { n:'Job' }, { n:'Scope' }, { n:'Collector node' }, { n:'Credential profile' },
             { n:'Schedule', o:['Every 6 h','Daily','Weekly','On demand'] }],
  reconcile:[{ n:'Result', o:['Agree','Differ','Stale','Only in inventory','Only on network','Unidentified'] },
             { n:'Network element' }, { n:'IP address' }, { n:'Circle' },
             { n:'Matched by', o:['Serial','Chassis MAC','sysName + circle','Management IP'] },
             { n:'Differing attribute', o:['OEM','Model','OS version','Serial number'] }, { n:'Verified' }],
  virtual:  [{ n:'Status', o:['Ready','In progress','Failed'] }, { n:'NF name' },
             { n:'Type', o:['vDU','CU-CP','CU-UP'] }, { n:'Parent RAN node' }, { n:'Subcloud' }, { n:'Host' }],
  links:    [{ n:'State', o:['Confirmed','New this cycle','No longer seen'] }, { n:'Source NE' },
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

/* ── pagination ────────────────────────────────────────── */
let PAGE = {};          /* key -> 1-based page   */
let PAGE_SIZE = {};     /* key -> rows per page  */
const PG_SIZES = [20, 50, 100];
const pgSize = k => PAGE_SIZE[k] || 20;
const pgNo   = (k, total) => Math.min(PAGE[k] || 1, Math.max(1, Math.ceil(total / pgSize(k))));
const pgSlice = (rows, k) => {
  const p = pgNo(k, rows.length), s = pgSize(k);
  return rows.slice((p - 1) * s, p * s);
};
const IC_PREV = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>`;
const IC_NEXT = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>`;

/* windowed page numbers with ellipses, so 15 pages never becomes 15 buttons */
function pgWindow(cur, last) {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const out = [1];
  let a = Math.max(2, cur - 1), b = Math.min(last - 1, cur + 1);
  if (cur <= 3) { a = 2; b = 4; }
  if (cur >= last - 2) { a = last - 3; b = last - 1; }
  if (a > 2) out.push('…');
  for (let i = a; i <= b; i++) out.push(i);
  if (b < last - 1) out.push('…');
  out.push(last);
  return out;
}

function pager(total, k, note = '') {
  const size = pgSize(k), last = Math.max(1, Math.ceil(total / size)), cur = pgNo(k, total);
  const from = total ? (cur - 1) * size + 1 : 0, to = Math.min(total, cur * size);
  return `<div class="pgr">
    <span class="vw-card-description pgr-note">${total
      ? `Showing <span class="num">${n(from)}–${n(to)}</span> of <span class="num">${n(total)}</span>${note ? ' ' + note : ''}`
      : 'No records'}</span>
    <span class="grow"></span>
    <span class="pgr-size">
      <span class="vw-card-description">Rows</span>
      <select class="nst-input pgr-sel" data-pgsize="${k}" aria-label="Rows per page">
        ${PG_SIZES.map(s => `<option value="${s}"${s === size ? ' selected' : ''}>${s}</option>`).join('')}
      </select>
    </span>
    <span class="pgr-nav">
      <button class="pgr-b" data-pg="${k}" data-pgn="${cur - 1}"${cur === 1 ? ' disabled' : ''}
        aria-label="Previous page">${IC_PREV}</button>
      ${pgWindow(cur, last).map(v => v === '…'
        ? `<span class="pgr-gap">…</span>`
        : `<button class="pgr-b pgr-num${v === cur ? ' is-on' : ''}" data-pg="${k}" data-pgn="${v}"
             ${v === cur ? 'aria-current="page"' : ''}>${v}</button>`).join('')}
      <button class="pgr-b" data-pg="${k}" data-pgn="${cur + 1}"${cur === last ? ' disabled' : ''}
        aria-label="Next page">${IC_NEXT}</button>
    </span>
  </div>`;
}
