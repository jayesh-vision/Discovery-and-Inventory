/* ═══ OPEX ════════════════════════════════════════════════
   Capex is a one-off project spend measured against an
   approved AFE. Opex is a recurring run cost measured
   against a monthly budget, and it never stops. The two
   need different shapes, so this is not a copy of capex:
     · every line is normalised to a monthly run rate
     · a 12-month actual-against-budget trend
     · contract expiry, because a lapsed contract is a
       commercial exposure a capex table cannot show
   ═══════════════════════════════════════════════════════ */
const OPEX_CATS = [
  { k:'rent',   n:'Site rental',              tone:'slate' },
  { k:'power',  n:'Electricity',              tone:'amber' },
  { k:'diesel', n:'Diesel & DG running',      tone:'orange' },
  { k:'lease',  n:'Backhaul lease',           tone:'cyan' },
  { k:'amc',    n:'AMC & maintenance',        tone:'sky' },
  { k:'fiber',  n:'Fiber O&M',                tone:'teal' },
  { k:'secure', n:'Security & housekeeping',  tone:'purple' },
  { k:'stat',   n:'Municipal & statutory',    tone:'emerald' }
];
const OPEX_STATES = [
  { k:'paid',    n:'Paid',    chip:'success' },
  { k:'due',     n:'Due',     chip:'warning' },
  { k:'overdue', n:'Overdue', chip:'error' },
  { k:'accrued', n:'Accrued', chip:'neutral' }
];
const OPEX_FREQ = { Monthly:1, Quarterly:3, Annual:12 };
/* one line item's monthly run rate, whatever it is billed at */
const opexMonthly = r => r.amt / (OPEX_FREQ[r.f] || 1);

const OPEX = {
  'BGLK-277': {
    fy:'FY 2026-27', cc:'CC-4471 · Karnataka Access', owner:'Harish Kumar',
    budget: 1500000, updated:'28-Aug-2026 · Gaurav Shukla',
    items: [
      { d:'Site rental — tower and shelter', c:'rent',  v:'Bagalkot Infra Trust', ref:'LSE-KA-0188',
        f:'Monthly',   amt:185000,  s:'paid',    dt:'05-Sep-2026', end:'31-Mar-2029', esc:5 },
      { d:'Grid electricity — HT connection', c:'power', v:'HESCOM',              ref:'HESCOM-3341',
        f:'Monthly',   amt:412000,  s:'due',     dt:'10-Sep-2026', end:'—',           esc:0 },
      { d:'Diesel and DG running cost',       c:'diesel',v:'Sri Ganesh Fuels',    ref:'FUEL-KA-221',
        f:'Monthly',   amt:96500,   s:'paid',    dt:'03-Sep-2026', end:'31-Dec-2026', esc:8 },
      { d:'Backhaul lease — 2 × 10G',         c:'lease', v:'Tata Communications', ref:'BW-TCL-9920',
        f:'Monthly',   amt:340000,  s:'paid',    dt:'01-Sep-2026', end:'30-Jun-2027', esc:4 },
      { d:'AMC — DG, cooling and UPS',        c:'amc',   v:'Cummins · Blue Star', ref:'AMC-PWR-1152',
        f:'Quarterly', amt:268000,  s:'accrued', dt:'01-Oct-2026', end:'07-Feb-2027', esc:6 },
      { d:'AMC — routing and switching',      c:'amc',   v:'Juniper Networks',    ref:'AMC-JNPR-2211',
        f:'Annual',    amt:1860000, s:'paid',    dt:'04-Apr-2027', end:'03-Apr-2027', esc:5 },
      { d:'Fiber O&M — 4.2 km last mile',     c:'fiber', v:'Sterlite',            ref:'OM-OFC-1301',
        f:'Monthly',   amt:54000,   s:'paid',    dt:'07-Sep-2026', end:'30-Aug-2027', esc:5 },
      { d:'Security and housekeeping',        c:'secure',v:'SIS India',           ref:'SVC-SEC-771',
        f:'Monthly',   amt:78000,   s:'overdue', dt:'22-Aug-2026', end:'31-Aug-2026', esc:7 },
      { d:'Municipal tax and statutory dues', c:'stat',  v:'Bagalkot Municipal',  ref:'TAX-BGLK-24',
        f:'Annual',    amt:465000,  s:'due',     dt:'30-Sep-2026', end:'31-Mar-2027', esc:0 }
    ],
    /* 12 months to Aug-2026 — actual against budget */
    trend: [
      { m:'Sep 25', a:1382000, b:1450000 }, { m:'Oct 25', a:1401000, b:1450000 },
      { m:'Nov 25', a:1359000, b:1450000 }, { m:'Dec 25', a:1488000, b:1450000 },
      { m:'Jan 26', a:1421000, b:1500000 }, { m:'Feb 26', a:1396000, b:1500000 },
      { m:'Mar 26', a:1512000, b:1500000 }, { m:'Apr 26', a:1438000, b:1500000 },
      { m:'May 26', a:1547000, b:1500000 }, { m:'Jun 26', a:1591000, b:1500000 },
      { m:'Jul 26', a:1503000, b:1500000 }, { m:'Aug 26', a:1449000, b:1500000 }
    ]
  }
};

function opexOf(id, ne) {
  if (OPEX[id]) return OPEX[id];
  const base = OPEX['BGLK-277'], scale = Math.max(0.22, ne / 25);
  const seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const items = base.items.map((b, j) => ({
    ...b,
    amt: Math.round(b.amt * scale * (0.78 + ((seed + j * 7) % 40) / 100) / 500) * 500,
    ref: b.ref.replace(/\d+$/, m => String(Number(m) + (seed % 60))),
    s: ['paid', 'paid', 'due', 'paid', 'accrued', 'paid', 'paid', 'paid', 'due'][j]
  }));
  const run = items.reduce((a, r) => a + opexMonthly(r), 0);
  const trend = base.trend.map((t, j) => ({
    m: t.m,
    a: Math.round(run * (0.93 + ((seed + j * 11) % 16) / 100) / 1000) * 1000,
    b: Math.round(run * 1.04 / 1000) * 1000
  }));
  return {
    fy:'FY 2026-27', cc:`CC-${4400 + (id.length * 13) % 90} · Circle access`,
    owner:'Anjali Verma', budget: Math.ceil(run * 1.04 / 10000) * 10000,
    updated:'26-Aug-2026 · Amit Sharma', items, trend
  };
}
const opexRun    = items => items.reduce((a, r) => a + opexMonthly(r), 0);
const opexByCat  = items => OPEX_CATS.map(c =>
  ({ ...c, c: items.filter(r => r.c === c.k).reduce((a, r) => a + opexMonthly(r), 0) }))
  .filter(x => x.c > 0).sort((a, b) => b.c - a.c);
const opexByState = items => OPEX_STATES.map(s =>
  ({ ...s, c: items.filter(r => r.s === s.k).reduce((a, r) => a + opexMonthly(r), 0) }))
  .filter(x => x.c > 0);
/* a contract that has already lapsed is the finding, not a footnote */
const OPEX_TODAY = new Date('2026-09-01');
function contractDays(end) {
  if (!end || end === '—') return null;
  const d = new Date(end.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3'));
  return isNaN(d) ? null : Math.round((d - OPEX_TODAY) / 86400000);
}

const OX_TONE = { paid:['emerald',400], due:['amber',400], overdue:['red',400], accrued:['slate',300] };

/* ── the Opex section on Site details ──────────────────── */
function opexSection(l, neCount) {
  const ox = opexOf(l.id, l.ne);
  const run = opexRun(ox.items), annual = run * 12;
  const variance = ox.budget - run;
  const cats = opexByCat(ox.items), states = opexByState(ox.items);
  const energy = ox.items.filter(r => r.c === 'power' || r.c === 'diesel')
    .reduce((a, r) => a + opexMonthly(r), 0);
  const lapsed = ox.items.filter(r => { const d = contractDays(r.end); return d !== null && d < 0; });
  const soon   = ox.items.filter(r => { const d = contractDays(r.end); return d !== null && d >= 0 && d <= 120; });
  const overdue = ox.items.filter(r => r.s === 'overdue');
  const tMax = Math.max(...ox.trend.map(t => Math.max(t.a, t.b)));

  const tiles = [
    { k:'Monthly run rate', v:inrShort(run), s:`budget ${inrShort(ox.budget)} · ${ox.fy}`, t:'sky' },
    { k:'Annualised', v:inrShort(annual), s:'12 × current run rate', t:'slate' },
    { k:variance >= 0 ? 'Under budget' : 'Over budget', v:inrShort(Math.abs(variance)) + ' / mo',
      s:`${(Math.abs(variance) / ox.budget * 100).toFixed(1)}% ${variance >= 0 ? 'headroom' : 'overrun'}`,
      t:variance >= 0 ? 'emerald' : 'red' },
    { k:'Energy share', v:`${(energy / run * 100).toFixed(0)}%`,
      s:`${inrShort(energy)} grid and diesel`, t:'amber',
      d:{ v:'passive', l:`Power at ${l.name}`, q:'tab=power' } },
    { k:'Cost per element', v:inrShort(run / Math.max(neCount, 1)) + ' / mo',
      s:`across ${neCount} network elements`, t:'purple' },
    { k:'Contracts at risk', v:String(lapsed.length + soon.length),
      s:`${lapsed.length} lapsed · ${soon.length} within 120 days`,
      t:lapsed.length ? 'red' : 'orange' }
  ];

  const brk = (label, amount, tone, shade) => `<div class="cx-row">
    <span class="vw-label" title="${label}">${label}</span>
    <span class="hbar-track"><span class="hbar-fill" style="display:block;width:${(amount / run * 100).toFixed(1)}%;background:${cv(tone, shade)}"></span></span>
    <span class="vw-value num t-right">${inrShort(amount)}</span>
  </div>`;

  return card(`
    <div class="row vw-justify-between vw-items-start vw-wrap" style="gap:var(--vw-space-md)">
      <div class="stack-x">
        <span class="vw-card-title">Opex</span>
      </div>
      <div class="row">
        <button class="nst-btn nst-btn--filled nst-btn--sm" data-opex="${l.id}">Update opex</button>
      </div>
    </div>

    ${lapsed.length || overdue.length ? `
      <div class="vw-card-child-shaded row vw-justify-between vw-wrap"
        style="margin-top:var(--vw-space-lg);padding:var(--vw-space-md);gap:var(--vw-space-md);
               border-left:3px solid ${cv('red',400)}">
        <span class="vw-card-description">
          ${lapsed.length ? `<strong style="color:${cv('red',700)}">${lapsed.length} contract${lapsed.length > 1 ? 's have' : ' has'} lapsed</strong>
            — ${lapsed.map(r => `${r.v} (${r.ref}, ended ${r.end})`).join('; ')}. The service is still being consumed and billed.` : ''}
          ${overdue.length ? ` ${overdue.length} payment${overdue.length > 1 ? 's are' : ' is'} overdue.` : ''}
        </span>
      </div>` : ''}

    <div style="margin-top:var(--vw-space-lg)">${statStrip(tiles)}</div>

    <div class="ox-trend">
      <div class="row vw-justify-between vw-items-baseline" style="margin-bottom:var(--vw-space-sm)">
        <span class="eyebrow">Actual against budget, last 12 months</span>
        <span class="legend">
          <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',400)}"></span>actual</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('red',400)}"></span>over budget</span>
          <span class="legend-i"><span class="ox-blegend"></span>budget</span>
        </span>
      </div>
      <div class="ox-bars">
        ${ox.trend.map(t => `
          <div class="ox-col" title="${t.m} — actual ${inr(t.a)}, budget ${inr(t.b)}">
            <div class="ox-col-track">
              <span class="ox-col-fill" style="height:${(t.a / tMax * 100).toFixed(1)}%;
                background:${cv(t.a > t.b ? 'red' : 'sky', 400)}"></span>
              <span class="ox-col-budget" style="bottom:${(t.b / tMax * 100).toFixed(1)}%"></span>
            </div>
            <span class="ox-col-m">${t.m}</span>
          </div>`).join('')}
      </div>
      <div class="row vw-justify-between" style="margin-top:var(--vw-space-sm)">
        <span class="vw-card-description">${ox.trend.filter(t => t.a > t.b).length} of 12 months ran over budget.</span>
        <span class="vw-card-metric-label-sub num">12-month actual ${inrShort(ox.trend.reduce((a, t) => a + t.a, 0))}</span>
      </div>
    </div>

    <div class="cx-split">
      <div class="cx-panel">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">Where the money goes, per month</span>
          <span class="vw-card-metric-label-sub">${cats.length} categories</span>
        </div>
        ${cats.map(c => brk(c.n, c.c, c.tone, 400)).join('')}
      </div>
      <div class="cx-panel">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">Payment state</span>
          <span class="vw-card-metric-label-sub">${ox.items.length} contracts</span>
        </div>
        ${states.map(s => brk(s.n, s.c, OX_TONE[s.k][0], OX_TONE[s.k][1])).join('')}
      </div>
    </div>

    <div class="cx-panel-head row vw-justify-between vw-items-baseline" style="margin-top:var(--vw-space-xl)">
      <span class="eyebrow">Recurring line items</span>
      <span class="vw-card-metric-label-sub">Every amount normalised to a monthly run rate</span>
    </div>
    ${table([{t:'Line item'},{t:'Category'},{t:'Vendor · contract'},{t:'Billed · escalation'},
             {t:'Billed amount',r:true},{t:'Per month',r:true},{t:'Payment'},{t:'Contract ends'}],
      ox.items.map(r => {
        const st = OPEX_STATES.find(x => x.k === r.s), cat = OPEX_CATS.find(x => x.k === r.c);
        const days = contractDays(r.end);
        return [
          `<span class="vw-value">${r.d}</span>`,
          `<span class="legend-i"><span class="legend-sw" style="background:${cv(cat.tone,400)}"></span>${cat.n}</span>`,
          `<span class="vw-value">${r.v}</span><br><span class="vw-card-metric-label-sub mono">${r.ref}</span>`,
          `${r.f}<br><span class="vw-card-metric-label-sub">${r.esc ? `+${r.esc}% p.a.` : 'no escalation'}</span>`,
          inr(r.amt),
          `<span style="font-weight:500">${inr(Math.round(opexMonthly(r)))}</span>`,
          `${chip(st.n, st.chip)}<br><span class="vw-card-metric-label-sub num">due ${r.dt}</span>`,
          days === null ? `<span style="color:${cv('gray',400)}">open ended</span>`
            : days < 0 ? `<span style="color:${cv('red',700)};font-weight:500">${r.end}</span><br><span class="vw-card-metric-label-sub" style="color:${cv('red',700)}">lapsed ${-days} d ago</span>`
            : days <= 120 ? `<span style="color:${cv('amber',700)}">${r.end}</span><br><span class="vw-card-metric-label-sub">${days} d left</span>`
            : `<span class="num">${r.end}</span>`
        ];
      }), '',
      () => [])}
    <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
      <span class="vw-card-description">Last updated ${ox.updated}. Escalations apply on the contract anniversary.</span>
      <span class="row vw-gap-xl">
        <span class="stack-x t-right"><span class="vw-label">Budget / month</span><span class="vw-value num">${inr(ox.budget)}</span></span>
        <span class="stack-x t-right"><span class="vw-label">Run rate / month</span><span class="vw-value num" style="font-weight:500">${inr(Math.round(run))}</span></span>
        <span class="stack-x t-right"><span class="vw-label">${variance >= 0 ? 'Headroom' : 'Overrun'}</span>
          <span class="vw-value num" style="font-weight:500;color:${cv(variance >= 0 ? 'emerald' : 'red', 700)}">${inr(Math.abs(Math.round(variance)))}</span></span>
        <span class="stack-x t-right"><span class="vw-label">Annualised</span><span class="vw-value num" style="font-weight:500">${inr(Math.round(annual))}</span></span>
      </span>
    </div>`);
}

/* ── opex editor ───────────────────────────────────────── */
let OPEX_ID = 'BGLK-277', OPEX_DRAFT = null, OPEX_SAVED = false;
function opexDraft() {
  if (!OPEX_DRAFT) {
    const l = LOCATIONS.find(x => x.id === OPEX_ID) || LOCATIONS[0];
    const ox = opexOf(l.id, l.ne);
    OPEX_DRAFT = { fy: ox.fy, cc: ox.cc, owner: ox.owner, budget: ox.budget,
                   items: ox.items.map(r => ({ ...r })), trend: ox.trend };
  }
  return OPEX_DRAFT;
}
function opexTotalsHtml() {
  const d = opexDraft(), run = opexRun(d.items), variance = d.budget - run;
  return `<div class="row vw-justify-between vw-wrap" style="gap:var(--vw-space-lg)">
    <span class="vw-card-description">${d.items.length} recurring contracts</span>
    <span class="row vw-gap-xl">
      <span class="stack-x t-right"><span class="vw-label">Budget / month</span><span class="vw-value num">${inr(d.budget)}</span></span>
      <span class="stack-x t-right"><span class="vw-label">Run rate / month</span><span class="vw-value num" style="font-weight:500">${inr(Math.round(run))}</span></span>
      <span class="stack-x t-right"><span class="vw-label">${variance >= 0 ? 'Headroom' : 'Overrun'}</span>
        <span class="vw-value num" style="font-weight:500;color:${cv(variance >= 0 ? 'emerald' : 'red', 700)}">${inr(Math.abs(Math.round(variance)))}</span></span>
      <span class="stack-x t-right"><span class="vw-label">Annualised</span><span class="vw-value num" style="font-weight:500">${inr(Math.round(run * 12))}</span></span>
    </span></div>`;
}
function opexRowsHtml() {
  const d = opexDraft();
  return d.items.map((r, i) => `
    <tr>
      <td><input class="nst-input ox-in" data-i="${i}" data-f="d" value="${r.d}" style="min-width:14rem"></td>
      <td><select class="nst-input ox-in" data-i="${i}" data-f="c">
        ${OPEX_CATS.map(c => `<option value="${c.k}"${c.k === r.c ? ' selected' : ''}>${c.n}</option>`).join('')}</select></td>
      <td><input class="nst-input ox-in" data-i="${i}" data-f="v" value="${r.v}" style="width:9rem"></td>
      <td><input class="nst-input ox-in mono" data-i="${i}" data-f="ref" value="${r.ref}" style="width:9rem"></td>
      <td><select class="nst-input ox-in" data-i="${i}" data-f="f">
        ${Object.keys(OPEX_FREQ).map(f => `<option${f === r.f ? ' selected' : ''}>${f}</option>`).join('')}</select></td>
      <td><input class="nst-input ox-in num t-right" data-i="${i}" data-f="amt" type="number" min="0" step="500" value="${r.amt}" style="width:8rem"></td>
      <td class="t-right num" style="font-weight:500" id="oxamt${i}">${inr(Math.round(opexMonthly(r)))}</td>
      <td><select class="nst-input ox-in" data-i="${i}" data-f="s">
        ${OPEX_STATES.map(c => `<option value="${c.k}"${c.k === r.s ? ' selected' : ''}>${c.n}</option>`).join('')}</select></td>
      <td><input class="nst-input ox-in" data-i="${i}" data-f="end" value="${r.end}" style="width:7.5rem"></td>
      <td><button class="nst-btn nst-btn--xs nst-btn--danger-subtle" data-oxdel="${i}">Remove</button></td>
    </tr>`).join('');
}
function viewOpex() {
  const l = LOCATIONS.find(x => x.id === OPEX_ID) || LOCATIONS[0];
  const d = opexDraft();
  return `<div class="page">
    ${pageHead(`Opex · ${l.name}`, `${l.type} · ${l.id} · ${l.city}, ${l.state}`,
      `<button class="nst-btn nst-btn--sm" data-site="${l.id}">Cancel</button>
       <button class="nst-btn nst-btn--filled nst-btn--sm" data-oxsave="1">Save changes</button>`)}

    ${OPEX_SAVED ? `<div class="vw-card-section vw-card--success row vw-justify-between">
        <span class="vw-value">Opex updated for ${l.name}. ${d.items.length} contracts, ${inr(Math.round(opexRun(d.items)))} per month.</span>
        <button class="nst-btn nst-btn--xs" data-site="${l.id}">Back to site</button></div>` : ''}

    ${card(`
      ${headSm('Budget header')}
      <div class="capex-form" style="margin-top:var(--vw-space-md)">
        <div class="stack-x"><label class="nst-input-label" for="oxfy">Financial year</label>
          <select class="nst-input ox-hd" id="oxfy" data-f="fy">
            ${['FY 2024-25','FY 2025-26','FY 2026-27','FY 2027-28'].map(v=>`<option${v===d.fy?' selected':''}>${v}</option>`).join('')}</select></div>
        <div class="stack-x"><label class="nst-input-label" for="oxcc">Cost centre</label>
          <input class="nst-input ox-hd" id="oxcc" data-f="cc" value="${d.cc}"></div>
        <div class="stack-x"><label class="nst-input-label" for="oxown">Budget owner</label>
          <input class="nst-input ox-hd" id="oxown" data-f="owner" value="${d.owner}"></div>
        <div class="stack-x"><label class="nst-input-label" for="oxbud">Monthly budget (₹)</label>
          <input class="nst-input ox-hd num" id="oxbud" data-f="budget" type="number" step="10000" value="${d.budget}"></div>
      </div>`)}

    ${card(`
      <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
        ${headSm('Recurring contracts')}
        <button class="nst-btn nst-btn--sm" data-oxadd="1">Add contract</button>
      </div>
      <div class="tbl-wrap"><table class="nst-table">
        <thead><tr>${['Line item','Category','Vendor','Contract','Billed','Billed amount','Per month','Payment','Contract ends','']
          .map((t,i)=>`<th${i===5||i===6?' class="t-right"':''}>${t}</th>`).join('')}</tr></thead>
        <tbody id="oxbody">${opexRowsHtml()}</tbody>
      </table></div>
      <div class="vw-card-footer-divider" id="oxtotals">${opexTotalsHtml()}</div>`)}
  </div>`;
}
