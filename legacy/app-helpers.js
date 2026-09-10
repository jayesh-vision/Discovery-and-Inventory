/* ── helpers ─────────────────────────────────────────────── */
const n   = v => v.toLocaleString('en-IN');
const esc = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cv  = (t, s) => `var(--vw-color-${t}-${s})`;
const pad2 = v => String(v).padStart(2, '0');
function getLiveDateSync(h = 9, m = 10) {
  const d = new Date();
  const day = pad2(d.getDate());
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  return `${day}-${month}-${d.getFullYear()} ${pad2(h)}:${pad2(m)}`;
}
const chip = (t, v, strong) => `<span class="vw-chip vw-chip--${v}${strong?' is-strong':''}">${t}</span>`;
const card = (inner, cls = '', style = '') =>
  `<section class="vw-card-section ${cls}"${style?` style="${style}"`:''}>${inner}</section>`;
const head = (t, d) =>
  `<div class="stack-x"><div class="vw-card-title">${t}</div>${d?`<div class="vw-card-description">${d}</div>`:''}</div>`;
const headSm = (t, d) =>
  `<div class="stack-x"><div class="vw-card-title-sm">${t}</div>${d?`<div class="vw-card-description">${d}</div>`:''}</div>`;
/* Screens named by the breadcrumb carry no title block; anything that used to
   sit beside the title becomes a control row, or moves into the grid's own menu. */
const pageBar = (controls) => `<div class="page-bar">${controls}</div>`;
const pageHead = (t, d, right = '') =>
  `<div class="page-head"><div class="stack-x" style="max-width:70ch">
     <h1 class="vw-page-title" style="margin:0">${t}</h1>
     <p class="vw-page-description" style="margin:0">${d}</p></div><div class="row">${right}</div></div>`;

/* A first column called Status or State gets the platform's full-width state
   pill rather than a chip that hugs its text. */
const STATUS_COL = /^(status|state|outcome|result|stock state)$/i;

/* acts: a function (rowIndex) => [A(...)], or an array of arrays, or null for no kebab */
const table = (cols, rows, cls = '', acts = null) => {
  const gid = 'g' + (GRID_N++);
  const menu = acts ? (typeof acts === 'function' ? acts : i => acts[i]) : null;
  const span = cols.length + (menu ? 1 : 0);
  return `<div class="tbl-wrap"><table class="nst-table ${cls}">
    <thead><tr>${cols.map(c=>`<th${c.r?' class="t-right"':''}>${c.t}</th>`).join('')}${menu?'<th class="kb-th"></th>':''}</tr></thead>
    <tbody>${rows.length
      ? rows.map((r,ri)=>`<tr>${r.map((c,i)=>{
          const kls = [cols[i].r ? 't-right num' : '', i === 0 && STATUS_COL.test(cols[i].t) ? 'st-td' : ''].filter(Boolean).join(' ');
          return `<td${kls?` class="${kls}"`:''}>${c}</td>`; }).join('')}${menu?kebabCell(menu(ri)||[],gid,ri):''}</tr>`).join('')
      : `<tr><td colspan="${span}" class="tbl-empty">No records match the current filter.</td></tr>`}</tbody>
  </table></div>`;
};

const bars = (rows, max, tone) => rows.map(r => {
  const inner = `<span class="vw-label">${r.n}</span>
    <div class="hbar-track"><div class="hbar-fill" style="width:${(r.c/max*100).toFixed(1)}%;background:${cv(tone||r.tone,400)}"></div></div>
    <span class="vw-value num t-right">${n(r.c)}</span>`;
  return r.d ? `<button class="hbar is-drill"${dA(r.d)}>${inner}</button>`
             : `<div class="hbar">${inner}</div>`;
}).join('');

const kpi = (label, value, sub, tone, d) => {
  const inner = `<div class="vw-card-accent" style="background:${cv(tone,400)}"></div>
    <div class="vw-card-metric-label">${label}</div>
    <div class="vw-card-metric-xl num">${value}</div>
    <div class="vw-card-metric-label-sub">${sub}</div>`;
  const st = 'padding-top:calc(var(--vw-space-lg) + 3px);gap:var(--vw-space-xs)';
  return d
    ? `<button class="vw-card-section vw-card--accent stack-x is-drill"${dA(d)} style="${st}">${inner}</button>`
    : `<div class="vw-card-section vw-card--accent stack-x" style="${st}">${inner}</div>`;
};

/* ── drill-down plumbing ──────────────────────────────── */
let DRILL = null;                 /* { view, label, from } set by the router  */
/* d = { v:targetView, l:'human label', q:'key=value&key=value' } */
const dA = d => ` data-drill="${d.v}" data-dlabel="${esc(d.l)}"${d.q ? ` data-dq="${esc(d.q)}"` : ''}`;

/* Navigation is the topbar breadcrumb alone now — the in-page drill banner
   is retired. The function stays so every view's \${drillBar()} call keeps
   working; DRILL itself still drives filters and the URL's drill label. */
function drillBar() {
  return '';
}


/* funnel: [{n,v,sub,tone}] */
function funnel(rows, max) {
  return `<div class="stack-s">${rows.map((r,i) => {
    const w = (r.v/max*100);
    return `<div class="stack-x" style="gap:3px">
      <div class="row vw-justify-between" style="gap:var(--vw-space-sm)">
        <span class="vw-value" style="font-weight:500">${r.n}</span>
        <span class="vw-value num">${n(r.v)} <span class="vw-card-metric-label-sub">${r.unit}</span></span>
      </div>
      <div class="hbar-track" style="height:1.375rem">
        <div class="hbar-fill" style="width:${w.toFixed(1)}%;background:${cv(r.tone,300)}"></div>
      </div>
      <span class="vw-card-metric-label-sub">${r.sub}</span>
    </div>`;
  }).join('')}</div>`;
}

const ARROW = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

function donut(segs,total,top,sub,size=150){
  const sw=Math.max(7,Math.round(size*0.10)), r=size/2-sw/2-2, cx=size/2, cy=size/2, C=2*Math.PI*r;
  const fTop=Math.max(11,Math.round(size*0.145)), fSub=Math.max(7,Math.round(size*0.062));
  let off=0;
  const arcs=segs.map(s=>{const len=(s.c/total)*C;
    const el=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cv(s.tone,400)}" stroke-width="${sw}"
      stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"><title>${s.n}: ${n(s.c)}</title></circle>`; off+=len; return el;}).join('');
  return `<svg viewBox="0 0 ${size} ${size}" style="height:${size}px;width:${size}px;flex-shrink:0;display:block" role="img" aria-label="${top} ${sub}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--vw-color-slate-100)" stroke-width="${sw}"/>${arcs}
    <text x="${cx}" y="${cy + (sub ? 0 : fTop*0.35)}" text-anchor="middle" font-size="${fTop}" font-weight="300" fill="var(--vw-color-gray-900)" font-family="Poppins,sans-serif">${top}</text>
    ${sub ? `<text x="${cx}" y="${cy + fTop*0.78}" text-anchor="middle" font-size="${fSub}" fill="var(--vw-color-gray-500)" font-family="Poppins,sans-serif">${sub}</text>` : ''}</svg>`;
}

const legendRows = segs => `<div class="stack-x grow" style="gap:5px">${segs.map(s => {
  const inner = `<span class="legend-i"><span class="legend-sw" style="background:${cv(s.tone,400)}"></span>${s.n}</span>
    <span class="vw-value num">${n(s.c)}</span>`;
  return s.d ? `<button class="row vw-justify-between is-drill lg-row"${dA(s.d)} style="gap:var(--vw-space-sm)">${inner}</button>`
             : `<div class="row vw-justify-between" style="gap:var(--vw-space-sm)">${inner}</div>`;
}).join('')}</div>`;



/* ── copy-to-clipboard, with a fallback and visible confirmation ──
   navigator.clipboard.writeText() can reject silently (no document focus, no
   secure context, a permissions policy that blocks it) — the row action then
   looked broken because nothing ever told the reader it had failed. */
function copyFallback(value) {
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.left = '0'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch (err) { /* nothing left to try */ }
  document.body.removeChild(ta);
}
function copyToClipboard(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value).catch(() => copyFallback(value));
  }
  copyFallback(value);
  return Promise.resolve();
}
function showCopyToast(x, y, text) {
  const el = document.createElement('div');
  el.className = 'copy-toast';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 200);
  }, 1000);
}

/* ── currency ─────────────────────────────────────────── */
const inr = v => '₹' + Math.round(v).toLocaleString('en-IN');
const inrShort = v => v >= 1e7 ? '₹' + (v/1e7).toFixed(2) + ' Cr'
  : v >= 1e5 ? '₹' + (v/1e5).toFixed(2) + ' L' : '₹' + Math.round(v).toLocaleString('en-IN');
