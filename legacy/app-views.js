/* ══ 1 · INSIGHTS ═════════════════════════════════════════ */
let SEL_CIRCLE = 'MP';

function cartogram() {
  const max = Math.max(...CIRCLES.map(c => c.exc));
  const cells = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 7; x++) {
    const c = CIRCLES.find(z => z.x === x && z.y === y);
    if (!c) { cells.push(`<div></div>`); continue; }
    const a = c.exc === 0 ? 0.06 : 0.12 + 0.72 * Math.sqrt(c.exc / max);
    cells.push(`<button class="carto-tile${c.c === SEL_CIRCLE ? ' is-sel' : ''}" data-circle="${c.c}"
      style="background:color-mix(in srgb, ${cv('red',400)} ${(a*100).toFixed(0)}%, var(--vw-color-white));
             color:${a > .45 ? 'var(--vw-color-white)' : 'var(--vw-color-gray-800)'}"
      title="${c.n} — ${c.exc} exceptions">
      <span class="carto-code">${c.c}</span><span class="carto-n num">${c.exc}</span></button>`);
  }
  return `<div class="carto-wrap">
    <div class="carto">${cells.join('')}</div>
    <div class="carto-scale">
      <span class="carto-scale-k">fewer</span>
      <span class="carto-ramp"></span>
      <span class="carto-scale-k">more</span>
      <span class="carto-scale-m num">${n(max)} max</span>
    </div>
  </div>`;
}

function circleDetail() {
  const c = CIRCLES.find(z => z.c === SEL_CIRCLE) || CIRCLES[0];
  const worst = Math.max(...CIRCLES.map(z => z.rate), 1);
  const stat = (k, val, sub) => `<div class="cd-stat"><span class="cd-k">${k}</span>
    <span class="cd-v num">${val}</span><span class="cd-s">${sub}</span></div>`;
  return `<div class="cd">
    <div class="cd-top">
      <div class="row vw-justify-between vw-items-baseline" style="gap:var(--vw-space-sm)">
        <span class="vw-card-title-sm">${c.n}</span>
        <span class="vw-card-metric-label-sub mono">${c.job}</span>
      </div>
      <div class="cd-grid">
        ${stat('In inventory', n(c.master), `${n(c.sites)} sites`)}
        ${stat('Verified on the network', n(c.verified), `${(c.verified / Math.max(c.master,1) * 100).toFixed(0)}% of the circle`)}
        ${stat('Open exceptions', n(c.exc), `${(c.exc / Math.max(DL.open - DL.unclaimed, 1) * 100).toFixed(1)}% of the estate total`)}
        ${stat('Exception rate', c.rate.toFixed(1), `per 100 records · estate ${NAT_RATE.toFixed(1)}`)}
      </div>
    </div>

    <div class="cd-mid">
      <span class="eyebrow">Exceptions by result</span>
      ${[['Rogue', c.rogue, 'fuchsia', 'Only on network'], ['Missing', c.missing, 'red', 'Only in inventory'],
         ['Drifted', c.drift, 'amber', 'Differ']].map(([k, val, t, f]) => `
        <button class="hbar is-drill" style="grid-template-columns:4.5rem 1fr 2.5rem"
          ${dA({ v:'reconcile', l:`${k} in ${c.n}`, q:`ne=${f}&circle=${c.c}` })}>
          <span class="vw-label">${k}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${(val / Math.max(c.exc,1) * 100).toFixed(0)}%;background:${cv(t,400)}"></div></div>
          <span class="vw-value num t-right">${n(val)}</span>
        </button>`).join('')}
    </div>

    <div class="cd-mid">
      <span class="eyebrow">Exception rate against the rest of the estate</span>
      <div class="cd-rate">
        <span class="cd-rate-fill" style="width:${(c.rate / worst * 100).toFixed(1)}%;
          background:${cv(c.rate > NAT_RATE ? 'red' : 'emerald', 400)}"></span>
        <span class="cd-rate-avg" style="left:${(NAT_RATE / worst * 100).toFixed(1)}%"></span>
      </div>
      <span class="vw-card-description">${c.rate > NAT_RATE
        ? `Worse than the estate average of ${NAT_RATE.toFixed(1)} per 100.`
        : `Better than the estate average of ${NAT_RATE.toFixed(1)} per 100.`}</span>
    </div>

    <div class="cd-foot">
      <button class="nst-btn nst-btn--sm nst-btn--filled"
        ${dA({ v:'reconcile', l:`Open exceptions in ${c.n}`, q:`ne=Open&circle=${c.c}` })}>
        Open ${n(c.exc)} exceptions</button>
      <button class="nst-btn nst-btn--sm"
        ${dA({ v:'targets', l:`Scan targets in ${c.n}`, q:'tgt=All' })}>Scan targets</button>
    </div>
  </div>`;
}

const insHead = (t, d) =>
  `<div class="ins-head"><div class="vw-card-title-sm">${t}</div>${d ? `<div class="vw-card-description">${d}</div>` : ''}</div>`;

function viewInsights() {
  const OUT_TO_REC = { exact:'Agree', drifted:'Differ', stale:'Stale',
    missing:'Only in inventory', rogue:'Only on network', unclaimed:'Unidentified' };
  const outSegs = OUTCOME.map(o => ({ n: o.n, c: o.c, tone: o.tone,
    d: { v:'reconcile', l:o.n, q:`ne=${OUT_TO_REC[o.k]}` } }));
  const covSegs = [
    { n: 'Polled by a collector', c: DL.discoverable, tone: 'emerald',
      d: { v:'reconcile', l:'Records a collector can reach', q:'ne=All' } },
    { n: 'No collector', c: DL.noCollector, tone: 'red',
      d: { v:'physical', l:'Classes no collector reaches — Server, DWDM, eNodeB, gNodeB', q:'tab=server' } }
  ];
  const runSegs = [
    { n: 'All steps passed', c: DL.runFull, tone: 'emerald',
      d: { v:'targets', l:'Runs where every collector passed', q:'tgt=clean' } },
    { n: 'Partial', c: DL.runPartial, tone: 'amber',
      d: { v:'targets', l:'Runs that partly failed', q:'tgt=partial' } },
    { n: 'Failed', c: DL.runFail, tone: 'red',
      d: { v:'targets', l:'Runs with a failed collector', q:'tgt=failed' } }
  ];
  const typeSegs = [
    { n: 'Router', c: DL.discRouter, tone: 'sky',
      d: { v:'physical', l:'Discovered routers', q:'tab=router' } },
    { n: 'Switch', c: DL.discSwitch, tone: 'emerald',
      d: { v:'physical', l:'Discovered switches', q:'tab=switch' } }
  ];



  return `<div class="page">
    ${pageBar(`<div class="seg">${PERIODS.map(p => `<button class="${PERIOD===p.k?'is-on':''}" data-period="${p.k}">${p.n}</button>`).join('')}</div>`)}

    <div class="vw-grid vw-grid-cols-4 vw-gap-md" style="margin-bottom:var(--vw-space-lg)">
      <div class="vw-card" style="border-left:4px solid var(--vw-color-blue-500);border-radius:12px;padding:var(--vw-space-md) var(--vw-space-lg);background:#ffffff;box-shadow:0 1px 3px rgba(15,23,42,0.05)">
        <div style="font-size:0.875rem;font-weight:600;color:var(--vw-color-blue-600);margin-bottom:6px">North zone</div>
        <div class="row vw-items-baseline" style="gap:8px;margin-bottom:4px">
          <span class="num" style="font-size:1.75rem;font-weight:700;color:var(--vw-color-slate-900);line-height:1">681</span>
          <span class="mono" style="font-size:0.875rem;color:var(--vw-color-slate-500)">devices</span>
        </div>
        <div style="font-size:0.8125rem;color:var(--vw-color-slate-400);margin-bottom:8px">91.8% success · 56 failed</div>
        <div style="font-size:0.8125rem;font-weight:600;color:var(--vw-color-emerald-600)">▲ 7 new · 0.9 pt vs last cycle</div>
      </div>

      <div class="vw-card" style="border-left:4px solid var(--vw-color-teal-500);border-radius:12px;padding:var(--vw-space-md) var(--vw-space-lg);background:#ffffff;box-shadow:0 1px 3px rgba(15,23,42,0.05)">
        <div style="font-size:0.875rem;font-weight:600;color:var(--vw-color-teal-600);margin-bottom:6px">South zone</div>
        <div class="row vw-items-baseline" style="gap:8px;margin-bottom:4px">
          <span class="num" style="font-size:1.75rem;font-weight:700;color:var(--vw-color-slate-900);line-height:1">694</span>
          <span class="mono" style="font-size:0.875rem;color:var(--vw-color-slate-500)">devices</span>
        </div>
        <div style="font-size:0.8125rem;color:var(--vw-color-slate-400);margin-bottom:8px">92.9% success · 49 failed</div>
        <div style="font-size:0.8125rem;font-weight:600;color:var(--vw-color-emerald-600)">▲ 5 new · 2.4 pt vs last cycle</div>
      </div>

      <div class="vw-card" style="border-left:4px solid var(--vw-color-amber-500);border-radius:12px;padding:var(--vw-space-md) var(--vw-space-lg);background:#ffffff;box-shadow:0 1px 3px rgba(15,23,42,0.05)">
        <div style="font-size:0.875rem;font-weight:600;color:var(--vw-color-amber-600);margin-bottom:6px">East zone</div>
        <div class="row vw-items-baseline" style="gap:8px;margin-bottom:4px">
          <span class="num" style="font-size:1.75rem;font-weight:700;color:var(--vw-color-slate-900);line-height:1">609</span>
          <span class="mono" style="font-size:0.875rem;color:var(--vw-color-slate-500)">devices</span>
        </div>
        <div style="font-size:0.8125rem;color:var(--vw-color-slate-400);margin-bottom:8px">92.2% success · 48 failed</div>
        <div style="font-size:0.8125rem;font-weight:600;color:var(--vw-color-emerald-600)">▲ 4 new · 1.8 pt vs last cycle</div>
      </div>

      <div class="vw-card" style="border-left:4px solid var(--vw-color-purple-500);border-radius:12px;padding:var(--vw-space-md) var(--vw-space-lg);background:#ffffff;box-shadow:0 1px 3px rgba(15,23,42,0.05)">
        <div style="font-size:0.875rem;font-weight:600;color:var(--vw-color-purple-600);margin-bottom:6px">West zone</div>
        <div class="row vw-items-baseline" style="gap:8px;margin-bottom:4px">
          <span class="num" style="font-size:1.75rem;font-weight:700;color:var(--vw-color-slate-900);line-height:1">375</span>
          <span class="mono" style="font-size:0.875rem;color:var(--vw-color-slate-500)">devices</span>
        </div>
        <div style="font-size:0.8125rem;color:var(--vw-color-slate-400);margin-bottom:8px">93.6% success · 24 failed</div>
        <div style="font-size:0.8125rem;font-weight:600;color:var(--vw-color-emerald-600)">▲ 3 new · 2.7 pt vs last cycle</div>
      </div>
    </div>

    <div class="vw-grid vw-grid-cols-4 vw-gap-md ins-row">

      ${card(`${insHead('Reconciliation outcome')}
        <div class="ins-viz">${donut(outSegs, DL.union, n(DL.exact), 'agree', 124)}</div>
        <div class="ins-legend lg2">${legendRows(outSegs)}</div>`, 'ins-card')}

      ${card(`${insHead('Discovery coverage')}
        <div class="ins-viz ins-viz-c">
          <span class="hero num">${(DL.discoverable / DL.master * 100).toFixed(1)}<i>%</i></span>
          <span class="hero-sub">${n(DL.discoverable)} of ${n(DL.master)} records</span>
          <div class="meter ins-meter">
            <span style="width:${(DL.discoverable / DL.master * 100).toFixed(2)}%;background:${cv('emerald',400)}"></span>
            <span style="width:${(DL.noCollector / DL.master * 100).toFixed(2)}%;background:${cv('red',400)}"></span>
          </div>
        </div>
        <div class="ins-legend">${legendRows(covSegs)}</div>`, 'ins-card')}

      ${card(`${insHead('Run outcome')}
        <div class="ins-viz ins-viz-s">
          <div class="meter ins-meter" style="margin-bottom:var(--vw-space-xs)">
            ${runSegs.map(s => `<span style="width:${(s.c / DL.targets * 100).toFixed(2)}%;background:${cv(s.tone,400)}"></span>`).join('')}
          </div>
          ${runSegs.map(s => `
            <button class="sb-row is-drill"${dA(s.d)}>
              <span class="sb-k">${s.n.replace('All steps passed','Clean')}</span>
              <span class="sb-track"><i style="width:${(s.c / DL.targets * 100).toFixed(1)}%;background:${cv(s.tone,400)}"></i></span>
              <span class="sb-v num">${n(s.c)}</span>
              <span class="sb-p num">${(s.c / DL.targets * 100).toFixed(0)}%</span>
            </button>`).join('')}
        </div>
        <div class="ins-legend ins-foot">
          <span class="vw-card-description">${n(DL.targets)} targets in scope</span>
          <span class="vw-value num" style="font-weight:500;color:${cv(DL.runFail > DL.targets * 0.1 ? 'red' : 'emerald', 700)}">
            ${(DL.runFull / DL.targets * 100).toFixed(1)}% clean</span>
        </div>`, 'ins-card')}

      ${card(`${insHead('What moved in this window')}
        <div class="ins-viz ins-viz-s ins-viz-m">
          ${MOVE_P[PERIOD].map(m => `
            <div class="mv-row">
              <span class="mv-i" style="color:${cv(m.tone,600)}">${m.dir === 'good' || m.dir === 'up' ? '&#9650;' : m.dir === 'bad' ? '&#9660;' : '&#9679;'}</span>
              <span class="mv-k">${m.n}</span>
              <span class="mv-v num" style="color:${cv(m.tone,700)}">${n(m.v)}</span>
            </div>`).join('')}
        </div>
        <div class="ins-legend ins-foot">
          <span class="vw-card-description">Net drift</span>
          ${(() => { const M = MOVE_P[PERIOD], net = M[2].v - M[3].v;
            return `<span class="vw-value num" style="font-weight:500;color:${cv(net > 0 ? 'red' : 'emerald', 700)}">${net > 0 ? '+' : ''}${n(net)}</span>`; })()}
        </div>`, 'ins-card')}
    </div>

    <div class="row-t" style="align-items:stretch">
      ${card(`
        <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
          ${headSm('Exceptions by circle')}
          ${chip(`${n(DL.open - DL.unclaimed)} placed · ${n(DL.unclaimed)} unplaceable`, 'neutral')}
        </div>
        <div class="carto-row">
          ${cartogram()}
          <div class="grow" id="circledetail">${circleDetail()}</div>
        </div>`, 'grow')}

    </div>

    ${card(`
      <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
        ${headSm('The six collector families')}
        <div class="legend">
          <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',400)}"></span>passed</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('red',400)}"></span>failed</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('slate',200)}"></span>not applicable</span>
        </div>
      </div>
      <div class="coll-grid">
        ${COLLECTORS.map(c => `
          <button class="vw-card-child stack-s is-drill" style="padding:var(--vw-space-md);text-align:left"
            ${dA({ v:'jobs', l:`${c.n} collector · ${c.proto}` })}>
            <div class="row vw-justify-between vw-items-start">
              <div class="row" style="gap:var(--vw-space-xs)">
                <span class="rule-p">${c.order}</span>
                <div class="stack-x"><span class="vw-card-title-sm">${c.n}</span>
                  <span class="vw-card-metric-label-sub mono">${c.proto}</span></div>
              </div>
              <span class="vw-card-metric-sm num">${n(c.ok)}</span>
            </div>
            <div class="coll-bar">
              <i style="width:${(c.ok/DL.targets*100).toFixed(1)}%;background:${cv('emerald',400)}"></i>
              <i style="width:${(c.fail/DL.targets*100).toFixed(1)}%;background:${cv('red',400)}"></i>
              <i style="width:${(c.na/DL.targets*100).toFixed(1)}%;background:${cv('slate',200)}"></i>
            </div>
            <div class="stack-x" style="gap:3px">
              <span class="vw-card-metric-label-sub">Asks for</span>
              <span class="vw-card-description" style="white-space:normal">${c.what}</span>
            </div>
            <div class="stack-x" style="gap:3px">
              <span class="vw-card-metric-label-sub">Writes</span>
              <span class="vw-card-description" style="white-space:normal">${c.writes}</span>
            </div>
            <div class="row vw-justify-between vw-card-metric-label-sub num" style="border-top:1px dashed var(--vw-color-slate-200);padding-top:6px">
              <span>passed ${n(c.ok)}</span><span>failed ${n(c.fail)}</span><span>n/a ${n(c.na)}</span>
            </div>
          </button>`).join('')}
      </div>`)}

    ${card(`
      <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
        ${headSm('Why a target drops out')}
        ${chip(`${n(DL.runFail)} of ${n(DL.targets)} targets`, 'error')}
      </div>
      ${table([{ t: 'Stopped between' }, { t: 'Typed reason' }, { t: 'Targets', r: true }, { t: 'Share of failures', r: true },
               { t: 'Next action' }, { t: '' }],
        DROPS.map(d => [
          `<span class="vw-value">${d.from} <span style="color:${cv('gray',400)}">→</span> ${d.to}</span>`,
          `<span class="mono">${d.why.split(' — ')[0].replace(/ /g,'_').toUpperCase()}</span>`,
          n(d.n),
          `<span class="row vw-gap-sm vw-justify-end"><span class="hbar-track" style="width:5rem"><span class="hbar-fill" style="display:block;width:${(d.n/DL.runFail*100).toFixed(0)}%;background:${cv('red',300)}"></span></span>${(d.n/DL.runFail*100).toFixed(0)}%</span>`,
          `<span class="vw-card-description" style="white-space:normal">${d.why.split(' — ')[1] || '—'}</span>`,
          `<button class="nst-btn nst-btn--xs"${dA({ v:'targets', l:`Dropped: ${d.from} → ${d.to}`, q:'tgt=failed' })}>View</button>`
        ]))}`)}

  </div>`;
}

/* ══ 2 · SCAN JOBS ════════════════════════════════════════ */
/* Every figure on this screen is read off JOBS against one clock: the cycle
   that closed at 01-Sep-2026 09:19. Nothing here is a literal — a count that
   cannot be traced back to a row does not belong on the screen. */
const JOB_NOW = new Date(2026, 8, 1, 9, 19);
const jobAt = s => {
  const [d, t] = String(s).split(' '), [dd, mon, yy] = d.split('-'), [hh, mi] = (t || '00:00').split(':');
  return new Date(Number(yy), DK_MON.indexOf(mon), Number(dd), Number(hh), Number(mi));
};

/* Colour follows the state, so one status can never be drawn two ways. It used
   to be stored per row, and two jobs both "Completed with errors" came out in
   different colours — with the red one alone answering the Failed filter. */
const JOB_CHIP = {
  'Completed': 'success', 'Completed with errors': 'warning',
  'Running': 'info', 'No adapter': 'error', 'Failed': 'error', 'Held': 'warning'
};
const jobChip = j => JOB_CHIP[j.state] || 'neutral';

/* How often a job is meant to run, in hours — null when it only runs on demand */
function cadenceH(sched) {
  const every = /^Every\s+(\d+)\s*h/i.exec(sched);
  if (every) return Number(every[1]);
  if (/^Daily/i.test(sched))  return 24;
  if (/^Weekly/i.test(sched)) return 168;
  return null;
}
const JOB_GRACE_H = 6;   /* a run may slip this far before it counts as missed */

const jobHeld    = j => j.next === 'held';
const jobRunning = j => j.state === 'Running';
const jobFailed  = j => j.state === 'Failed';        /* the run did not complete */
const jobErrors  = j => j.state === 'Completed with errors';  /* it completed; some targets did not */
const jobNoAdapt = j => j.state === 'No adapter';
/* Overdue: a whole cadence plus the grace has passed with no run. On-demand
   jobs have no cadence, so they can never be overdue. */
const jobOverdue = j => {
  const c = cadenceH(j.sched);
  return c !== null && (JOB_NOW - jobAt(j.last)) / 36e5 > c + JOB_GRACE_H;
};

/* One reason per job, most serious first, so the reasons add up to the total
   rather than double-counting the job that is both held and erroring. */
const JOB_REASONS = [
  ['failed', jobFailed], ['no adapter', jobNoAdapt], ['held', jobHeld],
  ['with errors', jobErrors], ['overdue', jobOverdue]
];
const jobReason = j => (JOB_REASONS.find(([, test]) => test(j)) || [null])[0];
const jobAttention = j => jobReason(j) !== null;

/* Hours until a job is next due; null when nothing is scheduled — a held job
   and an on-demand job are both "no next run", and neither may win the card. */
function jobNextIn(j) {
  const s = j.next;
  if (!s || s === '—' || s === 'held') return null;
  const hm = /(\d{1,2}):(\d{2})/.exec(s);
  const mins = hm ? Number(hm[1]) * 60 + Number(hm[2]) : 0;
  const midnight = new Date(JOB_NOW.getFullYear(), JOB_NOW.getMonth(), JOB_NOW.getDate());
  let day;
  if (/^today/i.test(s)) day = 0;
  else if (/^tomorrow/i.test(s)) day = 1;
  else {
    const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(s.slice(0, 3));
    if (wd >= 0) day = ((wd - JOB_NOW.getDay()) + 7) % 7 || 7;
    else { const d = jobAt(s); return isNaN(d) ? null : (d - JOB_NOW) / 36e5; }
  }
  return (midnight.getTime() + day * 864e5 + mins * 6e4 - JOB_NOW) / 36e5;
}

/* targets carried per collector node, busiest first */
function collectorLoad() {
  const load = {};
  JOBS.forEach(j => { load[j.collector] = (load[j.collector] || 0) + j.targets; });
  return Object.entries(load).sort((a, b) => b[1] - a[1]);
}

let JOB_FILTER = 'All';
const JOB_TESTS = {
  All:       () => true,
  attention: jobAttention,
  errors:    jobErrors,
  held:      jobHeld,
  overdue:   jobOverdue
};

function viewJobs() {
  const test = JOB_TESTS[JOB_FILTER] || JOB_TESTS.All;
  const rows = gridApply('jobs', JOBS.filter(test));

  const onDemand = JOBS.filter(j => cadenceH(j.sched) === null).length;
  const weekly   = JOBS.filter(j => /^Weekly/i.test(j.sched)).length;
  const held     = JOBS.filter(jobHeld).length;
  const live     = JOBS.length - onDemand - held;      /* the three partition the whole */
  const running  = JOBS.filter(jobRunning).length;
  const errors   = JOBS.filter(jobErrors).length;
  const attention = JOBS.filter(jobAttention).length;
  /* named in the same order the reasons are ranked, so the parts sum to the card */
  const reasons = JOB_REASONS
    .map(([label, test]) => [label, JOBS.filter(j => jobReason(j) === label && test(j)).length])
    .filter(([, c]) => c > 0).map(([label, c]) => `${n(c)} ${label}`).join(' · ');

  const due = JOBS.map(j => ({ j, h: jobNextIn(j) })).filter(x => x.h !== null && x.h >= 0)
    .sort((a, b) => a.h - b.h)[0];
  const load = collectorLoad();

  const segs = [['All','All'], ['attention','Needs attention'], ['errors','With errors'],
                ['held','Held'], ['overdue','Overdue']];
  return `<div class="page">

    ${drillBar()}

    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${kpi('Total jobs', n(JOBS.length), `${n(live)} on a live schedule (${n(weekly)} weekly) · ${n(onDemand)} on demand · ${n(held)} held`, 'sky')}
      ${due
        ? kpi('Next run', /(\d{1,2}:\d{2})/.exec(due.j.next)[1] + ' IST',
            `${due.j.id} · ${due.j.next} · ${n(due.j.targets)} targets`, 'cyan')
        : kpi('Next run', '—', 'nothing scheduled — every job is held or on demand', 'cyan')}
      ${kpi('Jobs needing attention', n(attention), reasons || 'every job ran clean and on time', 'amber')}
      ${load.length
        ? kpi('Collector nodes in use', n(load.length), `${load[0][0]} carries ${n(load[0][1])} targets`, 'purple')
        : kpi('Collector nodes in use', '0', 'no job names a collector', 'purple')}
    </div>

    ${card(`
      ${gridBar(rows.length, JOBS.length, 'Job, scope, collector', FS.jobs,
        `<div class="seg">${segs.map(([k,l]) => {
          const c = JOBS.filter(JOB_TESTS[k]).length;
          return `<button class="${JOB_FILTER===k?'is-on':''}" data-job-filter="${k}">${l}</button>`;
        }).join('')}</div>`,
        [], 'jobs')}
      ${table(
        [{ t: 'Status' }, { t: 'Job · scope' }, { t: 'Collector · credential' }, { t: 'Schedule' },
         { t: 'Last run · duration' }, { t: 'Targets', r: true }, { t: 'Clean · partial · failed', r: true },
         { t: 'Next run' }],
        rows.map(j => [
          chip(j.state, jobChip(j)),
          `<span class="vw-value" style="font-weight:500">${j.id}</span><br>
           <span class="vw-card-metric-label-sub">${j.site} · <span class="mono">${j.scope}</span></span>`,
          `<span class="mono">${j.collector}</span><br><span class="vw-card-metric-label-sub mono">${j.cred}</span>`,
          j.sched,
          `<span class="num">${j.last}</span><br><span class="vw-card-metric-label-sub num">${j.dur}</span>`,
          n(j.targets),
          `<span class="vw-nowrap"><span style="color:${cv('emerald',700)}">${n(j.clean)}</span>
            <span style="color:${cv('gray',300)}">·</span>
            <span style="color:${cv(j.partial ? 'amber' : 'gray', j.partial ? 700 : 400)}">${n(j.partial)}</span>
            <span style="color:${cv('gray',300)}">·</span>
            <span style="color:${cv(j.fail ? 'red' : 'gray', j.fail ? 700 : 400)}">${n(j.fail)}</span></span>`,
          jobHeld(j) ? chip('Held', 'warning')
            : `<span class="vw-card-metric-label-sub">${j.next}</span>${
                jobOverdue(j) ? ' ' + chip('Overdue', 'warning') : ''}`,
        ]), 'job-table',
        i => [A('View targets', { v:'targets', l:`Targets in ${rows[i].id}`, q:'tgt=All' }),
              ])}`)}

  </div>`;
}

/* ══ 3 · SCAN TARGETS ═════════════════════════════════════ */
const SEG_CLS = { ok: 's-ok', fail: 's-fail', na: 's-na', skip: 's-skip' };
function chainOf(arr) {
  let failed = false;
  return `<span class="chain">${arr.map((v, i) => {
    if (v === 'fail') failed = true;
    const eff = (v === 'na' && failed) ? 'skip' : v;
    const label = { ok: 'passed', fail: 'failed', skip: 'skipped', na: 'not applicable' }[eff];
    return `<span class="chain-seg ${SEG_CLS[eff]}" title="${COLLECTORS[i].n}: ${label}">${COLLECTORS[i].n.slice(0, 3)}</span>`;
  }).join('')}</span>`;
}
function freshChip(h) {
  if (h < 24)   return chip('fresh', 'success');
  if (h < 168)  return chip(`${Math.round(h / 24)} d`, 'success');
  if (h < 720)  return chip(`${Math.round(h / 24)} d`, 'warning');
  if (h < 2160) return chip(`${Math.round(h / 720)} mo`, 'orange');
  return chip(`${Math.round(h / 720)} mo`, 'error');
}

function getScanTargetStatus(t) {
  if (!t) return 'Unknown';
  const rawStatus = String(t.status || t.outcome || '').trim();
  const sUpper = rawStatus.toUpperCase();
  if (sUpper === 'SUCCESS' || sUpper === 'EXACT MATCH' || sUpper === 'PASSED' || sUpper === 'CLEAN') {
    return 'Success';
  }
  if (sUpper === 'PARTIAL') {
    return 'Partial';
  }
  if (sUpper === 'FAILED' || sUpper === 'FAIL' || sUpper === 'MISSING') {
    return 'Failed';
  }

  if (Array.isArray(t.ch) && t.ch.length > 0) {
    const hasFail = t.ch.includes('fail');
    const hasOk = t.ch.includes('ok');
    if (hasFail && hasOk) return 'Partial';
    if (hasFail && !hasOk) return 'Failed';
    if (!hasFail && hasOk) return 'Success';
  }

  if (t.out === 'Exact match') return 'Success';
  if (t.out === 'Missing' || t.out === 'No adapter' || (t.reason && (!t.ch || !t.ch.includes('ok')))) return 'Failed';
  if (t.reason) return 'Partial';

  return 'Success';
}

function getFailureReason(t) {
  if (!t) return '';
  if (Array.isArray(t.failure_reasons) && t.failure_reasons.length > 0) {
    return t.failure_reasons.map(r => TGT_REASON[r] || r).join(', ');
  }
  if (Array.isArray(t.reasons) && t.reasons.length > 0) {
    return t.reasons.map(r => TGT_REASON[r] || r).join(', ');
  }
  const rawReason = t.failure_reason || t.failureReason || t.reasonText || t.reason;
  if (rawReason) {
    if (Array.isArray(rawReason)) {
      return rawReason.map(r => TGT_REASON[r] || r).join(', ');
    }
    return TGT_REASON[rawReason] || rawReason;
  }
  if (t.out && t.out !== 'Exact match' && t.out !== 'Drifted' && t.out !== 'Stale' && t.out !== 'Rogue' && t.out !== 'Unclaimed') {
    return t.out;
  }
  return '';
}

let TGT_FILTER = 'All';
const TGT_TESTS = {
  All:        () => true,
  all:        () => true,
  ALL:        () => true,
  success:    t => getScanTargetStatus(t) === 'Success',
  Success:    t => getScanTargetStatus(t) === 'Success',
  SUCCESS:    t => getScanTargetStatus(t) === 'Success',
  clean:      t => getScanTargetStatus(t) === 'Success',
  partial:    t => getScanTargetStatus(t) === 'Partial',
  Partial:    t => getScanTargetStatus(t) === 'Partial',
  PARTIAL:    t => getScanTargetStatus(t) === 'Partial',
  failed:     t => getScanTargetStatus(t) === 'Failed',
  Failed:     t => getScanTargetStatus(t) === 'Failed',
  FAILED:     t => getScanTargetStatus(t) === 'Failed',

  answered:   t => t.out !== 'Missing',
  new:        t => !!t.isNew,
  stale:      t => t.fresh > 168,
  fresh24:    t => t.fresh <= 24,
  fresh7:     t => t.fresh > 24   && t.fresh <= 168,
  age730:     t => t.fresh > 168  && t.fresh <= 720,
  age3090:    t => t.fresh > 720  && t.fresh <= 2160,
  age90:      t => t.fresh > 2160
};
const TGT_LABEL = { All:'All targets', answered:'Targets that answered', clean:'Runs where every step passed',
  partial:'Runs that partly failed', failed:'Runs with a failed collector', new: 'Seen for the first time this cycle',
  stale:'Past the freshness SLA', fresh24:'Verified in the last 24 hours' };
const TGT_REASON = { unreach: 'Host unreachable', timeout: 'SNMP timeout', auth: 'Authentication failed',
  adapter: 'No adapter for model', parse: 'Response parse error', dupip: 'Duplicate management IP' };
const TGT_REASON_CHIP = { unreach: 'purple', timeout: 'cyan', auth: 'pink', adapter: 'warning', parse: 'info', dupip: 'neutral' };

let TGT_REASON_FILTER = null;
function viewTargets() {
  const normFilterKey = String(TGT_FILTER || 'All').trim();
  const test = TGT_TESTS[normFilterKey] || TGT_TESTS[normFilterKey.toLowerCase()] || TGT_TESTS.All;
  const filteredTargets = TARGETS.filter(test).filter(t => {
    if (!TGT_REASON_FILTER) return true;
    const r = getFailureReason(t);
    return t.reason === TGT_REASON_FILTER || r === TGT_REASON[TGT_REASON_FILTER] || r === TGT_REASON_FILTER;
  });
  const rows = gridApply('targets', filteredTargets);
  const segs = [['All','All'],['success','Success'],['partial','Partial'],['failed','Failed']];
  const activeKey = normFilterKey.toLowerCase();

  return `<div class="page">
    ${pageBar(`<div class="seg">${segs.map(([k,l]) => `<button class="${TGT_FILTER===k?'is-on':''}" data-tgt-filter="${k}">${l}</button>`).join('')}</div>`)}
    ${drillBar()}
    ${card(`
      ${gridBar(rows.length, n(DL.targets), 'Gateway IP, hostname, serial', FS.targets,
        `${chip(`${n(DL.runFail)} failed`,'error')}${chip(`${n(DL.runPartial)} partial`,'warning')}
         <button class="nst-btn nst-btn--filled nst-btn--sm js-ack">Run now</button>`, [], 'targets')}
      ${table(
        [{ t: 'Status' }, { t: 'Gateway IP' }, { t: 'Hostname · circle · job' }, { t: 'OEM · model' },
         { t: 'Last run' }, { t: 'Age' }, { t: 'Failure reason' }, { t: 'Collector chain' }],
        rows.map(t => {
          const stStatus = getScanTargetStatus(t);
          const stTone = stStatus === 'Success' ? 'success' : stStatus === 'Partial' ? 'warning' : 'error';
          const reasonText = getFailureReason(t);
          const displayReason = (stStatus === 'Failed' || stStatus === 'Partial') && reasonText
            ? chip(reasonText, TGT_REASON_CHIP[t.reason] || (stStatus === 'Failed' ? 'error' : 'warning'))
            : `<span style="color:${cv('gray',300)}">—</span>`;

          return [
            chip(stStatus, stTone),
            `<span class="mono">${t.ip}</span>`,
            `${t.host === '—' ? `<span style="color:${cv('gray',400)}">no sysName</span>` : `<span class="vw-value">${t.host}</span>`}
             <br><span class="vw-card-metric-label-sub">${t.circle} · <span class="mono">${t.job}</span></span>`,
            `<span class="vw-value">${t.oem}</span> <span class="vw-card-metric-label-sub mono">${t.model}</span>`,
            `<span class="num">${t.sync}</span>`,
            freshChip(t.fresh),
            displayReason,
            chainOf(t.ch)
          ];
        }), '',
        i => [A('Open run transcript', { v:'target', l:`Transcript · ${rows[i].host}` })])}
      <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
        <div class="legend">
          <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',100)};border:1px solid ${cv('emerald',400)}"></span>passed</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('red',100)};border:1px solid ${cv('red',400)}"></span>failed</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('amber',100)};border:1px solid ${cv('amber',400)}"></span>skipped</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('slate',100)};border:1px solid ${cv('slate',300)}"></span>not applicable</span>
        </div>
      </div>`)}

  </div>`;
}

/* ══ 4 · TARGET DETAIL ════════════════════════════════════ */
let TXRUN = 4412;

function txSteps() {
  const s = TRANSCRIPT.steps.map(x => ({ ...x }));
  if (TXRUN === 4364) {
    s[4] = { ...s[4], state: 'fail', ms: 3000, bytes: 0,
      res: 'Timeout: No Response from 172.31.33.100',
      wrote: 'nothing — previous routing data retained',
      reason: 'SNMP_TIMEOUT', action: 'Retry at 8,000 ms next pass; escalate to the circle NOC after three consecutive timeouts.' };
    s[5] = { ...s[5], state: 'skip', ms: 0, bytes: 0, req: '—', res: 'skipped — depends on OSPF', wrote: 'nothing' };
    s[6] = { ...s[6], state: 'skip', ms: 0, bytes: 0, req: '—', res: 'skipped — depends on OSPF or BGP', wrote: 'nothing' };
  }
  return s;
}

function formatAsJsonString(val) {
  if (val === undefined || val === null || val === '—') {
    return JSON.stringify("Not sent");
  }
  if (typeof val === 'object') {
    return JSON.stringify(val, null, 2);
  }
  try {
    const parsed = JSON.parse(val);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return JSON.stringify(val, null, 2);
  }
}

function txBody() {
  const steps = txSteps();
  const dot = st => st === 'ok'
    ? `<span class="step-dot" style="background:${cv('emerald',100)};color:${cv('emerald',700)}">✓</span>`
    : st === 'fail'
      ? `<span class="step-dot" style="background:${cv('red',100)};color:${cv('red',700)}">!</span>`
      : `<span class="step-dot" style="background:${cv('amber',100)};color:${cv('amber',700)}">–</span>`;

  return `
    <div class="steps" style="display:flex;flex-direction:column;gap:12px">
      ${steps.map(s => `
        <details class="vw-tx-panel">
          <summary class="vw-tx-panel-summary">
            <div class="vw-tx-panel-summary-left">
              ${dot(s.state)}
              <span class="vw-card-activity-label" style="font-weight:600;font-size:0.95rem;color:var(--vw-color-slate-800)">${s.n}</span>
              ${chip(s.proto, 'neutral')}
            </div>
            <div class="vw-tx-panel-summary-right">
              <span class="vw-card-metric-label-sub num">${s.ms ? `${s.ms} ms · ${(s.bytes/1024).toFixed(1)} KB` : 'not attempted'}</span>
              <svg class="vw-tx-chevron" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </summary>

          <div class="vw-tx-panel-content">
            ${s.reason ? `
              <div class="stack-x" style="margin-bottom:var(--vw-space-md);padding:var(--vw-space-sm) var(--vw-space-md);background:${cv('red',50)};border:1px solid ${cv('red',200)};border-radius:var(--vw-radius-md)">
                <span class="vw-label" style="color:${cv('red',800)}">Reason</span>
                <span class="vw-value mono" style="color:${cv('red',700)}">${s.reason}</span>
                <span class="vw-card-description" style="white-space:normal;margin-top:4px;color:${cv('red',900)}">${s.action}</span>
              </div>`
              : s.wrote ? `
              <div class="vw-card-child-shaded" style="margin-bottom:var(--vw-space-md)">
                <span class="eyebrow" style="color:${cv(s.wrote === 'nothing' || s.wrote.startsWith('nothing') ? 'gray' : 'emerald', 700)}">Wrote</span>
                <div class="vw-card-description" style="white-space:normal">${s.wrote}</div>
              </div>` : ''}

            <div class="vw-tx-subpanels">
              <details class="vw-tx-subpanel">
                <summary class="vw-tx-subpanel-summary">
                  <span class="vw-tx-subpanel-title">View Request</span>
                  <svg class="vw-tx-chevron" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </summary>
                <div class="vw-tx-subpanel-body">
                  <div class="vw-tx-box-label">Request</div>
                  <div class="vw-tx-json-box">
                    <pre class="vw-tx-json-code"><code>${esc(formatAsJsonString(s.req))}</code></pre>
                  </div>
                </div>
              </details>

              <details class="vw-tx-subpanel">
                <summary class="vw-tx-subpanel-summary">
                  <span class="vw-tx-subpanel-title">View Response</span>
                  <svg class="vw-tx-chevron" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </summary>
                <div class="vw-tx-subpanel-body">
                  <div class="vw-tx-box-label">Response</div>
                  <div class="vw-tx-json-box">
                    <pre class="vw-tx-json-code"><code>${esc(formatAsJsonString(s.res))}</code></pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </details>
      `).join('')}
    </div>`;
}


function viewTarget() {
  const T = TRANSCRIPT;
  const aMax = Math.max(...ADJACENCY.map(a => a.c));
  return `<div class="page">
    ${pageHead(`${T.host}`,
      `Gateway ${T.ip} · job ${T.job} · Delhi`,
      `<button class="nst-btn nst-btn--sm" data-txdownload="1">Download payload</button>`)}

    <div class="vw-grid vw-grid-cols-3 vw-gap-md">
      ${kpi('Last discovery', '3h ago', '01-Sep-2026 09:10 IST', 'sky')}
      ${kpi('Collectors passed', '7 of 7', 'Device · Hardware · LLDP · OSPF · BGP · Service', 'cyan')}
      ${kpi('Discovered objects', '49', '19 LLDP · 12 OSPF · 4 BGP · 14 L3VPN', 'purple')}
    </div>

    <div class="row-t" style="align-items:stretch">
      ${card(`${headSm('Run history')}
        <div style="margin-top:var(--vw-space-md)">
        ${table([{ t: 'Run' }, { t: 'Started' }, { t: 'Elapsed' }, { t: 'Steps' }, { t: 'Outcome' }, { t: 'What changed' }],
          RUN_HISTORY.map(r => [
            `<span class="mono">#${r.run}</span>`, `<span class="num">${r.at}</span>`, `<span class="num">${r.dur}</span>`,
            r.steps, chip(r.out, r.chip),
            `<span class="vw-card-description" style="white-space:normal">${r.note}</span>`
          ]))}
        </div>`, 'grow')}

      ${card(`${headSm('Objects discovered')}
        <div class="stack-s" style="margin-top:var(--vw-space-md)">
          ${ADJACENCY.map(a => `
            <div class="stack-x" style="gap:2px">
              <div class="hbar" style="grid-template-columns:4rem 1fr 2.5rem">
                <span class="vw-label">${a.proto}</span>
                <div class="hbar-track"><div class="hbar-fill" style="width:${(a.c/aMax*100).toFixed(0)}%;background:${cv(a.tone,400)}"></div></div>
                <span class="vw-value num t-right">${a.c}</span>
              </div>
              <span class="vw-card-metric-label-sub">${a.chg}</span>
            </div>`).join('')}
        </div>`, '', 'width:min(330px,100%);flex-shrink:0')}
    </div>

    ${card(`
      <div style="margin-bottom:var(--vw-space-md)">
        ${head('Collector transcript')}
      </div>
      <div id="txbody">${txBody()}</div>`)}
  </div>`;
}

/* ══ 4 · RECONCILIATION ═══════════════════════════════════ */
let SEL_NE = 'CHE-J2.2K-PE-T4-ER', NE_FILTER = 'All', REC_CIRCLE = null;
const REC_FIELDS = [['oem','OEM'],['model','Model'],['os','OS version'],['sn','Serial number']];
/* whichever side reported one — a row with neither has nothing to copy */
const recSerial = r => (r.inv && r.inv.sn) || (r.net && r.net.sn) || '';

function recOutcomes() {
  const B = REC_BANDS;
  const T = [
    { k:'Agree',              c:B.both.parts[0].c, tone:'emerald' },
    { k:'Differ',             c:B.both.parts[1].c, tone:'amber'   },
    { k:'Stale',              c:B.both.parts[2].c, tone:'orange'  },
    { k:'Only in inventory',  c:B.invOnly.c,       tone:'red'     },
    { k:'Only on network',    c:B.netOnly.parts[0].c, tone:'fuchsia' },
    { k:'Unidentified',       c:B.netOnly.parts[1].c, tone:'purple'  }
  ];
  const tile = t => `
    <button class="oc${NE_FILTER === t.k ? ' is-on' : ''}" data-ne-filter="${t.k}"
      style="--oc-a:${cv(t.tone,400)};--oc-b:${cv(t.tone,50)}">
      <span class="oc-v num" style="color:${cv(t.tone,700)}">${n(t.c)}</span>
      <span class="oc-k">${t.k}</span>
    </button>`;
  return `
    <div class="oc-row">${T.map(tile).join('')}</div>`;
}

function recTable() {
  const f = NE_FILTER;
  const rows = gridApply('reconcile', NE_RECON
    .filter(r => f === 'All' ? true
      : f === 'Open' ? (r.out !== 'Agree' && r.out !== 'Stale')
      : r.out === f)
    .filter(r => !REC_CIRCLE || r.circle === REC_CIRCLE));
  const cell = (r, key) => {
    if (r.inv && r.net && r.diff.includes(key))
      return `<span class="mono rec-was">${r.inv[key]}</span><span class="mono rec-now">${r.net[key]}</span>`;
    const v = r.inv ? r.inv[key] : r.net ? r.net[key] : null;
    return v ? `<span class="mono">${v}</span>` : `<span class="rec-void">—</span>`;
  };
  const body = rows.map((r, ri) => `
    <tr class="${r.ne === SEL_NE ? 'is-selected' : ''}">
      <td>${chip(r.out, r.chip)}<br><span class="vw-card-metric-label-sub">${r.inv && r.net ? `matched by ${r.rule}` : r.rule}</span></td>
      <td><span class="vw-value">${r.ne}</span><br><span class="vw-card-metric-label-sub"><span class="mono">${r.ip}</span> · ${r.circle}</span></td>
      ${REC_FIELDS.map(([k]) => `<td class="cmp">${cell(r, k)}</td>`).join('')}
      <td><span class="vw-card-metric-label-sub num">${r.ver}</span></td>
      ${kebabCell(
        r.inv && r.net && r.diff.length
          ? [A('View details', { v:'resource', l:r.ne })]
        : !r.inv
          ? [A('Open the run transcript', { v:'target', l:`Transcript · ${r.ne}` })]
        : !r.net
          ? [A('View details', { v:'resource', l:r.ne })]
          : [A('View details', { v:'resource', l:r.ne })], 'rec', ri)}
    </tr>`).join('');

  const chips = [['All','All results'],['Open','Open exceptions'],['Agree','Agree'],['Differ','Differ'],['Stale','Stale'],
                 ['Only in inventory','Only in inventory'],['Only on network','Only on network'],['Unidentified','Unidentified']];
  return card(`
    ${headSm('Which elements reconciled')}
    ${gridBar(rows.length, n(REC_BANDS.invOnly.c + REC_BANDS.both.c + REC_BANDS.netOnly.c), 'Element, IP, serial', FS.reconcile, '', [], 'reconcile')}
    <div class="stock-bar" style="border-bottom:0;padding-bottom:var(--vw-space-sm)">
      ${chips.map(([k,l]) => `<button class="stock-chip${NE_FILTER===k?' is-on':''}" data-ne-filter="${k}">${l}</button>`).join('')}
    </div>
    <div class="tbl-wrap"><table class="nst-table rec-table">
      <thead><tr>
        <th>Result</th><th>Network element</th>
        ${REC_FIELDS.map(([,l]) => `<th>${l}</th>`).join('')}
        <th>Verified</th><th class="kb-th"></th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
      <span class="vw-card-description">Showing ${rows.length} of ${rows.length} comparable elements.</span>
    </div>`);
}

function viewReconcile() {
  const dMax = Math.max(...DRIFT_BY_FIELD.map(d => d.c));
  const ruleTotal = MATCH_RULES.reduce((a, r) => a + r.hits, 0);
  return `<div class="page">
    ${pageBar(`<div class="seg">${PERIODS.map(p => `<button class="${PERIOD===p.k?'is-on':''}" data-period="${p.k}">${p.n}</button>`).join('')}</div>`)}
    ${drillBar()}

    ${card(`
      ${headSm(PERIOD === 'today' ? 'How the cycle came out' : 'How the window came out')}
      <div style="margin-top:var(--vw-space-md)">${recOutcomes()}</div>`)}

    ${recTable()}

    <div class="row-t" style="align-items:stretch">
      ${card(`${headSm('Which attribute disagrees')}
        <div class="stack-s" style="margin-top:var(--vw-space-md)">${bars(DRIFT_BY_FIELD, dMax)}</div>`, '', 'width:min(400px,100%);flex-shrink:0')}

      ${card(`${headSm('How a device is matched to a record')}
        <div style="margin-top:var(--vw-space-md)">
        ${MATCH_RULES.map(r => `
          <div class="rule">
            <span class="rule-p">${r.p}</span>
            <div class="stack-x">
              <span class="vw-value" style="font-weight:500">${r.rule}</span>
              <span class="vw-card-metric-label-sub">${r.note}</span>
            </div>
            <div class="t-right">${chip(r.conf, r.conf === 'Exact' ? 'success' : r.conf === 'Strong' ? 'info' : 'warning')}</div>
            <span class="vw-value num t-right" style="font-weight:500">${n(r.hits)}</span>
          </div>`).join('')}
        </div>
        <div class="vw-card-footer-divider row vw-justify-end">
          <button class="nst-btn nst-btn--xs" data-ne-filter="Unidentified">Show them</button>
        </div>`, 'grow')}
    </div>

  </div>`;
}


let TAB = { phy: 'router', link: 'lldp', svc: 'l3vpn', inact: 'ne' };
let PHY_STOCK = new Set(['planned', 'instore', 'deployed', 'faulty']);
let INACT_CLS = 'router';
let PHY_OEM = null, PHY_SRC = null, PHY_VER = null;
let LOC_ST = null, LOC_CAT = null, LOC_STATE = null, LOC_REGION = null, LOC_TYPEGRP = null, LOC_GROUP = null;
/* state → operating region, the same grouping Insights uses */
const STATE_REGION = {
  'Maharashtra': 'West', 'Uttar Pradesh': 'North', 'Karnataka': 'South', 'Madhya Pradesh': 'East',
  'Delhi': 'North', 'Tamil Nadu': 'South', 'Gujarat': 'West', 'Andhra Pradesh': 'South',
  'Rajasthan': 'North', 'West Bengal': 'East', 'Odisha': 'East', 'Telangana': 'South',
  'Bihar': 'East', 'Punjab': 'North', 'Kerala': 'South', 'Haryana': 'North',
  'Chhattisgarh': 'East', 'Jharkhand': 'East', 'Assam': 'East', 'Jammu and Kashmir': 'North',
  'Uttarakhand': 'North'
};

const tabs = (list, cur, group) => `<div class="tabbar">${list.map(t =>
  `<button class="tab${t.k === cur ? ' is-on' : ''}" data-tab="${group}:${t.k}">${t.n}</button>`).join('')}</div>`;

/* physical estate by device class — one source for Home's mix and the
   Location dashboard's inventory breakdown; foots to IL.ne (2,703) */
const ACTIVE_MIX = [
  { n:'Routers',  c:2148, tone:'sky',     tab:'router' },
  { n:'Switches', c:349,  tone:'emerald', tab:'switch' },
  { n:'Servers',  c:96,   tone:'cyan',    tab:'server' },
  { n:'DWDM',     c:78,   tone:'purple',  tab:'dwdm' },
  { n:'eNodeB',   c:18,   tone:'amber',   tab:'enodeb' },
  { n:'gNodeB',   c:14,   tone:'orange',  tab:'gnodeb' }
];

/* ── Home ─────────────────────────────────────────────── */
function viewHome() {
  const clsD = (nm, tab) => ({ v:'physical', l:`${nm} in inventory`, q:`tab=${tab}` });
  const mix = ACTIVE_MIX.map(x => ({ ...x, d: clsD(x.n, x.tab) }));
  const srcD = (nm, k) => ({ v:'physical', l:`Source · ${nm}`, q:`src=${k}` });
  const srcSegs = [
    { n:'Discovered', c:2379, tone:'emerald', d:srcD('Discovered','d') },
    { n:'Planned · CIQ', c:118, tone:'sky',   d:srcD('Planned · CIQ','p') },
    { n:'Manual', c:174, tone:'slate',        d:srcD('Manual','m') },
    { n:'EMS', c:32, tone:'purple',           d:srcD('EMS','e') }
  ];
  const verD = (nm, k) => ({ v:'physical', l:`Verified · ${nm}`, q:`ver=${k}` });
  const verSegs = [
    { n:'Verified within 24 h', c:1142, tone:'emerald', d:verD('within 24 hours','fresh') },
    { n:'1 – 30 days', c:1188, tone:'amber',            d:verD('1 – 30 days','30') },
    { n:'Over 30 days', c:49, tone:'orange',            d:verD('over 30 days','old') },
    { n:'Never verified', c:324, tone:'red',            d:verD('never','never') }
  ];
  return `<div class="page">
    ${pageHead('Inventory', 'Network elements, connectivity and services across the estate.')}

    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${kpi('Locations', n(IL.locations), 'Central 118 · Regional 342 · Edge 1,294', 'amber',
        { v:'location', l:'All locations', q:'view=list' })}
      ${kpi('Network elements', n(IL.ne), `${n(IL.discovered)} verified on the network`, 'sky',
        { v:'physical', l:'All network elements' })}
      ${kpi('Links', n(IL.links), 'LLDP 5,549 · OSPF 1,382 · BGP 604 · ISIS 311', 'cyan',
        { v:'links', l:'All discovered links' })}
      ${kpi('Services', n(IL.services), 'L3VPN 1,815 · L2VPN 642', 'emerald',
        { v:'services', l:'All discovered services' })}
    </div>

    <div class="vw-grid vw-grid-cols-3 vw-gap-md">
      ${card(`${headSm('Where each record came from')}
        <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-md)">
          ${donut(srcSegs, IL.ne, n(IL.discovered), 'discovered')}${legendRows(srcSegs)}
        </div>`)}
      ${card(`${headSm('How recently it was verified')}
        <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-md)">
          ${donut(verSegs, IL.ne, '42%', 'within 24 h')}${legendRows(verSegs)}
        </div>`)}
      ${card(`${headSm('Network elements by class')}
        <div class="stack-s" style="margin-top:var(--vw-space-md)">${bars(mix, 2148)}</div>`)}
    </div>

    ${card(`
      <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
        ${headSm('Recently discovered')}
        <button class="nst-btn nst-btn--sm" data-nav="physical">Open Physical Resources</button>
      </div>
      ${table([{t:'Status'},{t:'Name'},{t:'IP address'},{t:'Model'},{t:'OEM'},{t:'Location'},{t:'Source'},{t:'Verified'}],
        PHY.router.slice(0,6).map(r => [
          rst(r.st), `<span class="vw-value">${r.name}</span>`, `<span class="mono">${r.ip}</span>`,
          `<span class="mono">${r.model}</span>`, r.oem, `<span class="mono">${r.loc}</span>`, src(r.s), ver(r.v)
        ]), '',
        i => [A('Node view', { v:'node', l:`Node view · ${PHY.router[i].name}`, q:`name=${encodeURIComponent(PHY.router[i].name)}` }),
              A('View details', { v:'resource', l:PHY.router[i].name }),
              siteA(PHY.router[i].loc)])}`)}
  </div>`;
}

/* compact stat strip — six figures in the height of one card */
const statStrip = cells => `<div class="stat-strip">${cells.map(c => {
  const inner = `<span class="stat-dot" style="background:${cv(c.t,400)}"></span>
    <span class="stat-k">${c.k}</span>
    <span class="stat-v num">${c.v}</span>
    <span class="stat-s">${c.s}</span>`;
  return c.go ? `<button class="stat-cell is-click" data-sitesection="${c.go}">${inner}</button>`
    : c.d ? `<button class="stat-cell is-click"${dA(c.d)}>${inner}</button>`
    : `<div class="stat-cell">${inner}</div>`;
}).join('')}</div>`;

/* ── Location ─────────────────────────────────────────── */
let LOC_VIEW = 'insights', LOC_SEL = null, MAP_COLOR = 'onair', HIER_EXPANDED = false, COV_EXPANDED = null;

/* ---- shared bits ---- */
const locStats = () => {
  const t = LOC_TIERS;
  return { live:t.reduce((a,x)=>a+x.live,0), build:t.reduce((a,x)=>a+x.building,0),
           plan:t.reduce((a,x)=>a+x.planned,0), fail:t.reduce((a,x)=>a+x.failed,0) };
};
/* ---- view 1 · Insights ---- */
/* Datacenters → PoPs → Sites, radial: one hub at the centre, a PoP node
   per circle on a middle ring, that circle's sites one ring further out —
   the shape the estate is actually wired in, not a chart of it. Colour
   is read off the type a node belongs to (purple hub, sky PoP, teal
   site) — never the Central/Regional/Edge tier, which this widget does
   not distinguish. Node size is location count (sqrt-scaled). Every node
   carries a real dA() drill into the Locations list. */
function hierarchySvg() {
  const W = 640, H = 640, cx = 320, cy = 320;
  const popR = 175, siteR = 275;
  const rows = LOC_HIER, N = rows.length;
  const popMax = Math.max(...rows.map(r => r.pop)), siteMax = Math.max(...rows.map(r => r.site));
  const dc = LOC_TYPES.find(t => t.k === 'dc');
  const dcNe = LOC_HIER.reduce((a,r) => a + r.neDc, 0);

  const links = [], pops = [], sites = [];
  rows.forEach((r, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const px = (cx + popR * Math.cos(a)).toFixed(1), py = (cy + popR * Math.sin(a)).toFixed(1);
    const sx = (cx + siteR * Math.cos(a)).toFixed(1), sy = (cy + siteR * Math.sin(a)).toFixed(1);
    const popRad = (11 + 10 * Math.sqrt(r.pop / popMax)).toFixed(1);
    const siteRad = (11 + 13 * Math.sqrt(r.site / siteMax)).toFixed(1);
    const onair = (r.live / r.tot * 100).toFixed(0);

    links.push(`<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" class="hier-link"/>`);
    links.push(`<line x1="${px}" y1="${py}" x2="${sx}" y2="${sy}" class="hier-link"/>`);

    /* "Other circles" is a rollup of the twelve states outside the top 8,
       not one state itself — group=other opens everything outside the
       named circles, rather than a state filter that could never match. */
    const stateQ = r.code === 'OTH' ? '&group=other' : `&state=${r.n}`;

    pops.push(`<g class="hier-node" tabindex="0" role="button"${dA({ v:'location', l:`${r.n} — PoP locations`, q:`view=list&type=pop${stateQ}` })}>
      <title>${r.n} · ${n(r.pop)} PoP locations · ${n(r.nePop)} network elements · ${onair}% on-air</title>
      <circle cx="${px}" cy="${py}" r="${popRad}" fill="${cv('sky',50)}" stroke="${cv('sky',500)}" stroke-width="2"/>
      <text x="${px}" y="${(+py+3).toFixed(1)}" text-anchor="middle" class="hier-n">${r.pop}</text>
      <text x="${px}" y="${(+py-popRad-7).toFixed(1)}" text-anchor="middle" class="hier-lab">${r.code}</text>
    </g>`);

    sites.push(`<g class="hier-node" tabindex="0" role="button"${dA({ v:'location', l:`${r.n} — Sites`, q:`view=list&type=site${stateQ}` })}>
      <title>${r.n} · ${n(r.site)} sites · ${n(r.neSite)} network elements · ${onair}% on-air</title>
      <circle cx="${sx}" cy="${sy}" r="${siteRad}" fill="${cv('teal',50)}" stroke="${cv('teal',500)}" stroke-width="2"/>
      <text x="${sx}" y="${(+sy+3).toFixed(1)}" text-anchor="middle" class="hier-n">${r.site}</text>
    </g>`);
  });

  const hub = `<g class="hier-node hier-hub" tabindex="0" role="button"${dA({ v:'location', l:'Datacenters — filtered list', q:'view=list&type=dc' })}>
    <title>Datacenters · ${n(dc.total)} locations · ${n(dcNe)} network elements · ${(dc.live/dc.total*100).toFixed(0)}% on-air</title>
    <circle cx="${cx}" cy="${cy}" r="52" fill="${cv('purple',50)}" stroke="${cv('purple',500)}" stroke-width="3"/>
    <text x="${cx}" y="${cy-3}" text-anchor="middle" class="hier-n" style="fill:${cv('purple',700)}">${dc.total}</text>
    <text x="${cx}" y="${cy+13}" text-anchor="middle" class="hier-lab" style="fill:${cv('purple',600)}">Datacenters</text>
  </g>`;

  return `<div class="hier-wrap${HIER_EXPANDED ? ' is-expanded' : ''}">
    <svg viewBox="0 0 ${W} ${H}" class="hier-svg hier-radial" role="img" aria-label="Network hierarchy: datacenters, PoP locations and sites, by top circles">
      ${links.join('')}${hub}${pops.join('')}${sites.join('')}
    </svg>
    <div class="hier-legend">
      <span class="legend-i"><span class="legend-sw" style="background:${cv('purple',500)}"></span>Datacenters</span>
      <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',500)}"></span>PoP locations, by circle</span>
      <span class="legend-i"><span class="legend-sw" style="background:${cv('teal',500)}"></span>Sites, by circle</span>
    </div>
  </div>`;
}

/* A KPI tile with its own progress bar and legend, built entirely from
   the app's existing type scale (vw-card-metric-*, .meter, .legend) so it
   reads as the same family as every other card on this page — the only
   thing new is the container, not the typography. Two shapes share it:
   the Total tile splits by location type, the three type tiles split by
   build status; both pass the same {c,hex,n} segment shape. */
/* The whole tile is the control — no separate "open list" link. */
const kpiProgress = (label, value, sub, segs, tone, d, on) => {
  const total = segs.reduce((a,s) => a + s.c, 0) || 1;
  const bar = segs.map(s => `<span style="width:${(s.c/total*100).toFixed(2)}%;background:${s.hex}" title="${s.n}: ${n(s.c)}"></span>`).join('');
  const legend = segs.map(s => `<span class="legend-i"><span class="legend-sw" style="background:${s.hex}"></span>${n(s.c)} ${s.n}</span>`).join('');
  const inner = `
    <div class="vw-card-metric-label kprog-label">${label}</div>
    <div class="row vw-items-baseline" style="gap:6px;margin-top:2px">
      <span class="vw-card-metric-xl num">${value}</span><span class="vw-card-metric-label-sub">locations</span>
    </div>
    <div class="vw-card-metric-label-sub" style="margin-top:2px">${sub}</div>
    <div class="meter" style="height:8px;margin-top:var(--vw-space-md)">${bar}</div>
    <div class="legend" style="margin-top:var(--vw-space-sm)">${legend}</div>`;
  const style = `border-color:${cv(tone,200)};--kpi-hover:${cv(tone,400)}`;
  return d
    ? `<button class="kpi-progress${on ? ' is-on' : ''}" style="${style}"${on === undefined ? '' : ` aria-pressed="${on}"`} aria-label="${esc(label)}: ${esc(value)} locations, ${esc(sub)}"${dA(d)}>${inner}</button>`
    : `<div class="kpi-progress" style="${style}">${inner}</div>`;
};

/* the location-pin used in the Coverage row's icon column — same
   hand-drawn stroke style as the sidebar rail (see sideIcons.ts). */
const COV_CIRCLE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

/* ── alert icons — one per blocker category, hand-drawn in the same
   stroke style. A risk flag (a site that's on-air but has something
   worth watching) maps onto the same category set, so one icon set
   covers both. */
const ALERT_ICON = {
  'Lease / Property': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 15.5h6M9 8.5h3"/></svg>`,
  'Power': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>`,
  'Fiber Connectivity': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 12.8 4.7a4 4 0 0 1 5.6 5.6L16.6 12"/><path d="M13 17.5l-1.8 1.8a4 4 0 0 1-5.6-5.6L7.4 12"/></svg>`,
  'Civil / Infrastructure': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V6"/><path d="M7 10 12 5l5 5"/><path d="M4 21h16"/><path d="M9 21v-5M15 21v-5"/></svg>`,
  'Regulatory': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 19 6v6c0 5-3 7.8-7 8.5-4-.7-7-3.5-7-8.5V6Z"/><path d="m9.5 12 1.8 1.8 3.2-3.6"/></svg>`,
  'Supply Chain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="11" height="9" rx="1"/><path d="M13.5 10h3.5l3 3v3h-6.5"/><circle cx="7" cy="18" r="1.7"/><circle cx="17.5" cy="18" r="1.7"/></svg>`,
  'Commissioning': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="m9 13 2 2 4-4.5"/></svg>`
};
const ALERT_LABEL = { 'Lease / Property':'Lease issue', 'Power':'Power issue', 'Fiber Connectivity':'Fiber issue',
  'Civil / Infrastructure':'Civil work issue', 'Regulatory':'Regulatory hold', 'Supply Chain':'Supply delay', 'Commissioning':'Commissioning hold' };
/* a risk flag on an on-air site isn't one of the seven blocker
   categories itself, but it clearly belongs to one — folding it in
   means one Alert Summary covers both "down" and "not down yet". */
const RISK_CAT = {
  'Lease expires within 30 days': 'Lease / Property',
  'Repeated landlord access restrictions': 'Lease / Property',
  'Frequent power outages reported': 'Power',
  'Battery backup below threshold': 'Power',
  'Temporary fiber diversion in use': 'Fiber Connectivity',
  'High utilization requiring capacity expansion': 'Civil / Infrastructure'
};
/* the concrete follow-up a field team would actually take per blocker
   category — feeds the "Recommended next steps" list on the site page */
const NEXT_STEP = {
  'Lease / Property': 'Engage the landlord and legal team on lease renewal and site access',
  'Power': 'Escalate power restoration with the utility and verify DG / battery availability',
  'Fiber Connectivity': 'Expedite OFC splicing and backhaul provisioning with the transport team',
  'Civil / Infrastructure': 'Chase the civil contractor for completion and clearance certificate',
  'Regulatory': 'Follow up with the authority on the pending clearance',
  'Supply Chain': 'Re-confirm delivery dates and stage the equipment with the vendor',
  'Commissioning': 'Schedule the ATP visit and close the acceptance punch points'
};
const INV_ICON = {
  active: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="6" rx="1.6"/><rect x="4" y="14" width="16" height="6" rx="1.6"/><circle cx="8" cy="7" r="1"/><circle cx="8" cy="17" r="1"/></svg>`,
  logical: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8 6h8M7.3 8 11 16M16.7 8 13 16"/></svg>`,
  passive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6c4 0 4 4 8 4s4-4 8-4M3 18c4 0 4-4 8-4s4 4 8 4"/></svg>`
};

/* ── Coverage by circle · site-ops detail ──────────────────
   Everything a circle row shows — the collapsed row's alert badge and
   the expanded panel both read this, computed once per row straight off
   the real LOCATIONS roster. Datacenters and PoPs are excluded
   throughout: this widget is about site rollout, not inventory. */
function circleOps(c) {
  const inCircle = l => c.code === 'OTH' ? !TOP8_STATES.has(l.state) : l.state === c.n;
  const sites = LOCATIONS.filter(l => inCircle(l) && l.type !== 'Datacenter' && l.type !== 'POP');

  const onAir = sites.filter(l => l.st === 'On-air');
  const atRisk = onAir.filter(l => l.risk);
  const blocked = sites.filter(l => l.st === 'Failed');
  const delayed = sites.filter(l => l.st === 'In progress' && l.issue);
  const pending = sites.filter(l => l.st === 'In progress' || l.st === 'Planned');

  const overview = { total: sites.length, onAir: onAir.length - atRisk.length, pending: pending.length, blocked: blocked.length, atRisk: atRisk.length };

  const stages = ['Commissioned', 'Under Deployment', 'ATP Pending', 'Integration Pending', 'Blocked']
    .map(k => ({ k, c: sites.filter(l => l.stage === k).length }));

  /* one alert bucket per category, folding blocked + delayed (issue) and
     at-risk (risk) sites together — severity is the worst thing in the
     bucket, so a category with even one Blocked site reads as red. */
  const bucket = {};
  const bump = (cat, reasonText, sev) => {
    const b = bucket[cat] || (bucket[cat] = { cat, count: 0, sev: 'risk', reasons: {} });
    b.count++; b.reasons[reasonText] = (b.reasons[reasonText] || 0) + 1;
    if (sev === 'blocked' || (sev === 'delayed' && b.sev === 'risk')) b.sev = sev;
  };
  blocked.forEach(l => bump(l.issue.cat, l.issue.reason, 'blocked'));
  delayed.forEach(l => bump(l.issue.cat, l.issue.reason, 'delayed'));
  atRisk.forEach(l => bump(RISK_CAT[l.risk] || 'Power', l.risk, 'risk'));
  const alerts = Object.values(bucket).map(b => ({
    cat: b.cat, count: b.count, sev: b.sev,
    topReason: Object.entries(b.reasons).sort((x,y) => y[1] - x[1])[0][0]
  })).sort((a,b) => (b.sev === 'blocked') - (a.sev === 'blocked') || b.count - a.count);
  const alertSeverity = alerts.some(a => a.sev === 'blocked') ? 'blocked' : alerts.some(a => a.sev === 'delayed') ? 'delayed' : alerts.length ? 'risk' : null;

  const critical = [
    ...blocked.map(l => ({ l, status:'Blocked', tone:'red' })),
    ...delayed.map(l => ({ l, status:'Delayed', tone:'amber' })),
    ...atRisk.map(l => ({ l, status:'At Risk', tone:'sky' }))
  ].slice(0, 3).map(x => ({
    id: x.l.id, status: x.status, tone: x.tone,
    cat: x.l.issue ? x.l.issue.cat : (RISK_CAT[x.l.risk] || 'Power'),
    reason: x.l.issue ? x.l.issue.reason : x.l.risk,
    impact: x.l.issue ? SITE_BLOCKER_IMPACT[x.l.issue.cat] : 'Potential service interruption if not resolved before it lapses'
  }));

  /* summary-only, proportional to this circle's real share of the
     module-wide totals (LOC_HIER.ne, IL.links/services, PASSIVE_TABS) —
     scaled, not fabricated independently, so a reader who checks the
     Inventory-across-the-estate card against nine of these finds them
     footing back to the same totals. */
  const neR = Math.round(c.ne * 0.55), neS = Math.round(c.ne * 0.14), neO = Math.round(c.ne * 0.08), neC = Math.round(c.ne * 0.11);
  const neA = Math.max(0, c.ne - neR - neS - neO - neC);
  const linkShare = c.ne / (IL.ne || 1), siteShare = sites.length / (LOC_TYPES.find(t => t.k === 'site').total || 1);
  const circleLinks = Math.round(IL.links * linkShare);
  const lldp = Math.round(circleLinks * 0.45), ospf = Math.round(circleLinks * 0.25), bgp = Math.round(circleLinks * 0.15);
  const isis = Math.max(0, circleLinks - lldp - ospf - bgp);
  const circleSvc = Math.round(IL.services * linkShare), l3vpn = Math.round(circleSvc * 0.74), l2vpn = Math.max(0, circleSvc - l3vpn);
  const passiveC = k => PASSIVE_TABS.find(t => t.k === k).c;
  const passive = [
    ['Fiber routes', Math.round(passiveC('fiber') * siteShare)],
    ['Fiber segments', Math.round(passiveC('fiber') * 3 * siteShare)],
    ['ODF ports', Math.round(passiveC('odf') * 8 * siteShare)],
    ['Patch panels', Math.round(passiveC('cord') * siteShare)],
    ['Splice closures', Math.round(passiveC('splice') * siteShare)]
  ];

  return {
    sites, overview, stages, alerts, alertSeverity, critical,
    inventory: {
      active: neR + neS + neO + neC + neA,
      logicalTotal: lldp + ospf + bgp + isis + l3vpn + l2vpn,
      passiveTotal: passive.reduce((a,[,v]) => a + v, 0),
      ne: [['Routers', neR], ['Switches', neS], ['OLT', neO], ['Core devices', neC], ['Access devices', neA]],
      logical: [['LLDP', lldp], ['OSPF', ospf], ['BGP', bgp], ['ISIS', isis], ['L3VPN', l3vpn], ['L2VPN', l2vpn]],
      passive
    }
  };
}

const COV_STAGE_TONE = { 'Commissioned':'emerald', 'Under Deployment':'sky', 'ATP Pending':'cyan', 'Integration Pending':'amber', 'Blocked':'red' };

function covCircleDetail(c, ops) {
  const o = ops.overview;
  const overviewSegs = [
    { n:'On-air', c:o.onAir, tone:'emerald' }, { n:'Pending', c:o.pending, tone:'sky' },
    { n:'Blocked', c:o.blocked, tone:'red' }, { n:'At-risk', c:o.atRisk, tone:'amber' }
  ];
  const stTotal = ops.stages.reduce((a,s) => a + s.c, 0) || 1;
  const chipRow = pairs => `<div class="cov-chip-row">${pairs.map(([k,v]) => `<span class="cov-chip">${k} <b class="num">${n(v)}</b></span>`).join('')}</div>`;

  return `<div class="cov-detail">
    <div class="cov-sec cov-sec--wide">
      ${headSm('Alert Summary', ops.alerts.length ? 'across blocked, delayed and at-risk sites in this circle' : undefined)}
      ${ops.alerts.length ? `<div class="cov-alert-grid">${ops.alerts.map(a => `
          <div class="cov-alert-card cov-alert-card--${a.sev}">
            <span class="cov-alert-icon cov-alert-icon--${a.sev}">${ALERT_ICON[a.cat]}</span>
            <div class="cov-alert-body">
              <div class="row vw-justify-between vw-items-baseline"><span class="cov-alert-label">${ALERT_LABEL[a.cat]}</span><span class="cov-alert-n num">${n(a.count)}</span></div>
              <div class="cov-alert-reason">${a.topReason}</div>
            </div>
          </div>`).join('')}</div>`
        : `<div class="cov-clear"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${cv('emerald',600)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>No active alerts — every site in this circle is clean.</div>`}
    </div>

    <div class="cov-sec cov-sec--wide">
      ${headSm('Aggregated Inventory', 'total across every site, PoP and datacenter in this circle · summary only')}
      <div class="cov-inv-row">
        <div class="cov-inv-tile cov-inv-tile--sky"><span class="cov-inv-icon">${INV_ICON.active}</span><span class="cov-inv-v num">${n(ops.inventory.active)}</span><span class="cov-inv-l">Active devices</span></div>
        <div class="cov-inv-tile cov-inv-tile--purple"><span class="cov-inv-icon">${INV_ICON.logical}</span><span class="cov-inv-v num">${n(ops.inventory.logicalTotal)}</span><span class="cov-inv-l">Logical — links &amp; services</span></div>
        <div class="cov-inv-tile cov-inv-tile--orange"><span class="cov-inv-icon">${INV_ICON.passive}</span><span class="cov-inv-v num">${n(ops.inventory.passiveTotal)}</span><span class="cov-inv-l">Passive infrastructure</span></div>
      </div>
      ${chipRow(ops.inventory.ne)}
      ${chipRow(ops.inventory.logical)}
      ${chipRow(ops.inventory.passive)}
    </div>

    <div class="cov-sec">
      ${headSm('Site Overview')}
      <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-sm)">
        ${donut(overviewSegs, o.total, n(o.total), 'sites', 108)}${legendRows(overviewSegs)}
      </div>
    </div>

    <div class="cov-sec">
      ${headSm('Deployment Progress')}
      <div class="meter" style="height:10px;margin-top:var(--vw-space-sm)">${ops.stages.map(s => `<span style="width:${(s.c/stTotal*100).toFixed(2)}%;background:${cv(COV_STAGE_TONE[s.k],400)}" title="${s.k}: ${n(s.c)}"></span>`).join('')}</div>
      <div class="stack-s" style="margin-top:var(--vw-space-sm)">
        ${ops.stages.map(s => `<div class="row vw-justify-between">
          <span class="legend-i"><span class="legend-sw" style="background:${cv(COV_STAGE_TONE[s.k],400)}"></span>${s.k}</span>
          <span class="num vw-value">${n(s.c)} <span class="vw-card-metric-label-sub">· ${(s.c/stTotal*100).toFixed(0)}%</span></span>
        </div>`).join('')}
      </div>
    </div>

    <div class="cov-sec cov-sec--wide">
      ${headSm('Critical Sites', 'highest-impact sites needing attention')}
      ${ops.critical.length ? `<div class="cov-crit-grid">${ops.critical.map(x => {
          const sev = x.tone === 'red' ? 'blocked' : x.tone === 'amber' ? 'delayed' : 'risk';
          return `<div class="cov-crit-card" role="button" tabindex="0" data-site="${x.id}" aria-label="Open ${x.id}">
            <div class="row vw-justify-between vw-items-center">
              <span class="row vw-gap-sm vw-items-center" style="min-width:0">
                <span class="cov-alert-icon cov-alert-icon--${sev}" style="width:26px;height:26px;flex-shrink:0">${ALERT_ICON[x.cat]}</span>
                <span class="mono vw-value">${x.id}</span>
              </span>
              <span class="vw-chip vw-chip--${x.tone === 'red' ? 'error' : x.tone === 'amber' ? 'warning' : 'info'}">${x.status}</span>
            </div>
            <div class="cov-crit-reason">${x.reason}</div>
            <div class="cov-crit-impact">${x.impact}</div>
          </div>`;
        }).join('')}</div>`
        : `<div class="vw-card-description">No critical sites flagged in this circle.</div>`}
    </div>
  </div>`;
}

function locInsights() {
  const { live } = locStats();
  const totalLoc = LOC_TYPES.reduce((a,t) => a + t.total, 0);
  const totalSegs = LOC_TYPES.map(t => ({ c: t.total, hex: cv(t.tone,500), n: t.n.toLowerCase() }));
  const statusSegs = t => LOC_STATES.map(st => ({ c: t[st.k], hex: cv(st.tone,500), n: st.n.toLowerCase() }));
  /* hand-built, not table(): an expanded circle needs an extra <tr> of
     its own right after that circle's row, which table()'s flat
     rows-array shape has no room for. */
  const covRows = [...LOC_HIER].sort((a,b) => b.tot - a.tot).map(c => {
    const q = c.code === 'OTH' ? 'group=other' : `state=${c.n}`;
    const open = COV_EXPANDED === c.code;
    const detailId = `cov-detail-${c.code}`;
    /* Failed = locations in this circle whose BUILD failed (status "Failed"),
       across all three types — not an equipment fault count. The tooltip
       carries the type split, because the expanded panel's Blocked figure
       covers sites only and can legitimately read one or two lower. */
    const fRows = (c.code === 'OTH' ? LOCATIONS.filter(l => !TOP8_STATES.has(l.state)) : LOCATIONS.filter(l => l.state === c.n))
      .filter(l => l.st === 'Failed');
    const fBits = [
      [fRows.filter(l => l.type === 'Datacenter').length, 'DC'],
      [fRows.filter(l => l.type === 'POP').length, 'PoP'],
      [fRows.filter(l => l.type !== 'Datacenter' && l.type !== 'POP').length, 'sites']
    ].filter(([v]) => v).map(([v, t]) => `${v} ${t}`).join(' · ');
    const fTitle = c.failed ? `${n(c.failed)} failed builds — ${fBits}. Deployment did not complete; sites among them carry a named blocker.` : 'No failed builds in this circle';
    /* computed once per row (not just the open one) so a reader can see
       which circles need attention without expanding any of them */
    const ops = circleOps(c);
    const dotSev = ops.alertSeverity || 'clean';
    const dotTitle = ops.alertSeverity
      ? `${n(ops.alerts.reduce((a,x) => a + x.count, 0))} sites flagged across ${ops.alerts.length} alert ${ops.alerts.length === 1 ? 'category' : 'categories'}`
      : 'No active site alerts';
    /* the whole row is the expand trigger — data-covexpand on the <tr>
       itself, not just one cell, so a click anywhere on it (a count, the
       dot, empty space) expands. The one exception is the ↗ button
       below: [data-drill] is matched earlier in the click chain than
       [data-covexpand], so it keeps its own action. */
    /* chevron + dot + icon + name live in ONE cell as a flex row, sized
       by their own fixed pixel boxes — not four separate percentage
       table columns. Splitting them into their own <th> columns was
       what made every one of them too narrow to hold even one glyph,
       which is why they were rendering as truncated "…". */
    const row = `<tr class="${open ? 'is-open' : ''}" id="cov-row-${c.code}" data-covexpand="${c.code}">
      <td class="cov-td-identity">
        <span class="cov-identity-inner">
          <span class="cov-chevron-btn" role="button" tabindex="0" aria-expanded="${open}" aria-controls="${detailId}" aria-label="${open ? 'Collapse' : 'Expand'} ${c.n}"><span class="cov-chevron">${open ? '▾' : '▸'}</span></span>
          <span class="cov-dot cov-dot--${dotSev}" title="${dotTitle}"></span>
          <span class="cov-row-icon">${COV_CIRCLE_ICON}</span>
          <span class="cov-td-name">${c.n}</span>
        </span>
      </td>
      <td class="t-right num">${n(c.dc)}</td>
      <td class="t-right num">${n(c.pop)}</td>
      <td class="t-right num">${n(c.site)}</td>
      <td class="t-right num">${n(c.tot)}</td>
      <td><span class="row vw-gap-sm vw-items-center" style="min-width:6.5rem">
        <span class="hbar-track" style="width:3.5rem;height:8px"><span class="hbar-fill" style="display:block;width:${(c.live/c.tot*100).toFixed(0)}%;background:${cv('emerald',400)}"></span></span>
        <span class="num" style="color:${cv('gray',700)}">${(c.live/c.tot*100).toFixed(0)}%</span></span></td>
      <td class="t-right num" style="color:${c.failed ? cv('red',700) : cv('gray',400)}" title="${fTitle}">${n(c.failed)}</td>
      <td class="cov-td-action"><button class="nst-btn nst-btn--xs nst-btn--ghost is-drill" title="Open ${c.n} in the Locations list"${dA({ v:'location', l:`Locations in ${c.n}`, q:`view=list&${q}` })}>↗</button></td>
    </tr>`;
    const detail = open ? `<tr class="cov-detail-row" id="${detailId}"><td colspan="8">${covCircleDetail(c, ops)}</td></tr>` : '';
    return row + detail;
  }).join('');

  /* table-layout:fixed pins the column widths to the header row and
     never lets the (much wider) expanded detail content stretch the
     table itself — without it, the browser sizes columns from every
     row's content, including the colspan detail row, and the whole
     table grows past the card, forcing the horizontal scroll this is
     built specifically to avoid. */
  const coverageTable = `<div class="tbl-wrap"><table class="nst-table cov-table">
    <thead><tr>
      <th style="width:34%">Circle</th>
      <th class="t-right" style="width:8%">DC</th><th class="t-right" style="width:8%">PoP</th><th class="t-right" style="width:9%">Sites</th>
      <th class="t-right" style="width:9%">Total</th><th style="width:18%">On-air</th><th class="t-right" style="width:8%" title="Locations whose build failed — deployment blocked, not an equipment fault">Failed</th><th style="width:6%"></th>
    </tr></thead>
    <tbody>${covRows}</tbody>
  </table></div>`;

  /* Network hierarchy and Coverage by circle stay side by side always —
     opening a circle row must not itself change that layout (it did,
     briefly; that was wrong). Only the hierarchy's own explicit Expand
     button switches to the full-width stack; a row's detail panel gets
     its room a different way, by scrolling within itself — see
     .cov-detail's own max-height in shell.css, not this layout.
     'grow' only means something inside that row-t flex row — as a
     direct child of .page (a column flex) it would stretch the card to
     fill the page's height instead, so the stacked layout must not
     carry it. */
  const expanded = HIER_EXPANDED;
  const rowCls = expanded ? '' : 'grow';

  const hierCard = card(`
    <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-lg)">
      ${headSm('Network hierarchy')}
      <button class="nst-btn nst-btn--xs" data-hierexpand="1">${HIER_EXPANDED ? '⤡ Collapse' : '⤢ Expand'}</button>
    </div>
    ${hierarchySvg()}`, rowCls, 'display:flex;flex-direction:column');

  const coverageCard = card(`
    <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-lg)">
      ${headSm('Coverage by circle', 'ranked by total · click a circle for rollout detail')}
    </div>
    <div class="cov-scroll">${coverageTable}</div>`, rowCls, 'display:flex;flex-direction:column');

  const passiveTotal = PASSIVE_TABS.reduce((a,t) => a + t.c, 0);

  /* the three estate cards, broken down by type the way the rest of the
     dashboard does it: icon + headline, a share meter, then one chip per
     class. The whole card is still the drill — chips are labels, and the
     per-class drills live on the target screen's own tabs. */
  const invCard = (title, icon, tone, total, sub, segs, d) => {
    const tSum = segs.reduce((a,s) => a + s.c, 0) || 1;
    return `<button class="kpi-progress" style="border-color:${cv(tone,200)};--kpi-hover:${cv(tone,400)}"
      aria-label="${esc(title)}: ${esc(total)}, ${esc(sub)}"${dA(d)}>
      <div class="row vw-gap-sm vw-items-center">
        <span class="cov-alert-icon" style="background:${cv(tone,50)};color:${cv(tone,600)}">${icon}</span>
        <div class="stack-x" style="gap:0">
          <span class="vw-card-metric-label">${title}</span>
          <span class="vw-card-metric-xl num">${total}</span>
        </div>
      </div>
      <div class="vw-card-metric-label-sub" style="margin-top:var(--vw-space-xs)">${sub}</div>
      <div class="meter" style="height:8px;margin-top:var(--vw-space-md)">
        ${segs.map(s => `<span style="width:${(s.c/tSum*100).toFixed(2)}%;background:${cv(s.tone,500)}" title="${s.n}: ${n(s.c)}"></span>`).join('')}</div>
      <div class="cov-chip-row">${segs.map(s =>
        `<span class="cov-chip inv-chip"><span class="legend-sw" style="background:${cv(s.tone,500)}"></span>${s.n} <b class="num">${n(s.c)}</b></span>`).join('')}</div>
    </button>`;
  };
  const logicalSegs = [
    { n:'LLDP links', c: Math.round(IL.links*0.45), tone:'purple' },
    { n:'OSPF', c: Math.round(IL.links*0.25), tone:'sky' },
    { n:'BGP', c: Math.round(IL.links*0.15), tone:'cyan' },
    { n:'ISIS', c: IL.links - Math.round(IL.links*0.45) - Math.round(IL.links*0.25) - Math.round(IL.links*0.15), tone:'slate' },
    { n:'L3VPN', c: Math.round(IL.services*0.74), tone:'teal' },
    { n:'L2VPN', c: IL.services - Math.round(IL.services*0.74), tone:'emerald' }
  ];
  const PASSIVE_TONE = { fiber:'cyan', odf:'sky', rack:'slate', power:'amber', splice:'purple', cord:'teal', duct:'orange' };
  const passiveSegs = PASSIVE_TABS.map(t => ({ n: t.n, c: t.c, tone: PASSIVE_TONE[t.k] || 'slate' }));

  return `
    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${kpiProgress('Total locations', n(totalLoc), `${n(live)} on-air`, totalSegs, 'slate',
        { v:'location', l:'All locations', q:'view=list' })}
      ${LOC_TYPES.map(t => kpiProgress(t.n, n(t.total),
        `${(t.live/t.total*100).toFixed(0)}% on-air · ${n(t.failed)} failed`, statusSegs(t), t.tone,
        { v:'location', l:`${t.n} — filtered list`, q:`view=list&type=${t.k}` })).join('')}
    </div>

    ${expanded ? `${hierCard}${coverageCard}` : `<div class="row-t hier-cov-row">${hierCard}${coverageCard}</div>`}

    ${card(`
      <div style="margin-bottom:var(--vw-space-lg)">
        ${headSm('Inventory across the estate', 'everything this module tracks against these locations — active, logical and passive')}
      </div>
      <div class="vw-grid vw-grid-cols-3 vw-gap-md">
        ${invCard('Active inventory', INV_ICON.active, 'sky', n(IL.ne),
          `Physical elements across the estate · ${n(IL.discovered)} verified on the network`,
          ACTIVE_MIX, { v:'physical', l:'All network elements' })}
        ${invCard('Logical inventory', INV_ICON.logical, 'purple', n(IL.links + IL.services),
          `${n(IL.links)} links and ${n(IL.services)} provisioned services · plus ${n(IL.vnf)} VNFs`,
          logicalSegs, { v:'virtual', l:'All virtual resources' })}
        ${invCard('Passive inventory', INV_ICON.passive, 'orange', n(passiveTotal),
          `Physical plant across ${n(PASSIVE_TABS.length)} categories`,
          passiveSegs, { v:'passive', l:'All passive infrastructure' })}
      </div>`)}

    ${locMap()}`;
}

/* ---- view 2 · Locations list ---- */
function locRows() {
  return gridApply('location', LOCATIONS
    .filter(l => !LOC_ST || l.st === LOC_ST)
    .filter(l => !LOC_CAT || l.cat === LOC_CAT)
    .filter(l => !LOC_STATE || l.state === LOC_STATE)
    .filter(l => !LOC_REGION || STATE_REGION[l.state] === LOC_REGION)
    .filter(l => !LOC_TYPEGRP || typeGroupOf(l.type) === LOC_TYPEGRP)
    .filter(l => LOC_GROUP !== 'other' || !TOP8_STATES.has(l.state)));
}
function locList() {
  const shown = locRows();
  /* Four region facet cards above the list. Their population is the list's
     current drill filters minus the region facet itself, so all four stay
     side by side and comparable — the standard facet pattern. Clicking one
     narrows the table to that region while keeping every other filter. */
  const base = LOCATIONS
    .filter(l => !LOC_ST || l.st === LOC_ST)
    .filter(l => !LOC_CAT || l.cat === LOC_CAT)
    .filter(l => !LOC_STATE || l.state === LOC_STATE)
    .filter(l => !LOC_TYPEGRP || typeGroupOf(l.type) === LOC_TYPEGRP)
    .filter(l => LOC_GROUP !== 'other' || !TOP8_STATES.has(l.state));
  const carry = [
    LOC_TYPEGRP ? `type=${LOC_TYPEGRP}` : '', LOC_ST ? `st=${LOC_ST}` : '',
    LOC_CAT ? `cat=${LOC_CAT}` : '', LOC_STATE ? `state=${LOC_STATE}` : '',
    LOC_GROUP ? `group=${LOC_GROUP}` : ''
  ].filter(Boolean).join('&');
  const REGION_TONE = { North:'sky', East:'purple', West:'orange', South:'teal' };
  const regionCards = ['North','East','West','South'].map(r => {
    const rows = base.filter(l => STATE_REGION[l.state] === r);
    const c = k => rows.filter(l => l.st === k).length;
    const segs = LOC_STATES.map(st => ({ c: c(st.n), hex: cv(st.tone,500), n: st.n.toLowerCase() }));
    const tot = rows.length, live = c('On-air'), failed = c('Failed');
    return kpiProgress(`${r} region`, n(tot),
      tot ? `${(live/tot*100).toFixed(0)}% on-air · ${n(failed)} failed` : 'no locations here',
      segs, REGION_TONE[r],
      { v:'location', l:`Locations in ${r} region`, q:`view=list&region=${r}${carry ? '&' + carry : ''}` },
      LOC_REGION === r);
  }).join('');
  return `<div class="vw-grid vw-grid-cols-4 vw-gap-md" style="margin-bottom:var(--vw-space-md)">${regionCards}</div>
    ${card(`
      ${gridBar(shown.length, n(IL.locations), 'Name, Location ID', FS.location,
        '',
        [], 'location')}

      ${table([{t:'Status'},{t:'Name'},{t:'Category'},{t:'Site type'},{t:'Location ID'},{t:'Address'},{t:'City'},{t:'State'},
               {t:'NE',r:true},{t:'Discovered',r:true},{t:'Coverage'}],
        locRows().map(l => {
          const pct = l.ne ? Math.round(l.disc / l.ne * 100) : 0;
          const tone = pct === 100 ? 'emerald' : pct === 0 ? 'red' : 'amber';
          return [
            chip(l.st, l.chip),
            `<button class="nst-btn nst-btn--xs nst-btn--ghost" data-site="${l.id}" style="padding:0;font-weight:500">${l.name}</button>`,
            chip(l.cat, l.ct === 'amber' ? 'warning' : l.ct === 'sky' ? 'info' : 'success'),
            l.type, `<span class="mono">${l.id}</span>`, l.addr, l.city, l.state, n(l.ne),
            l.disc === 0 ? `<span style="color:${cv('gray',400)}">0</span>` : n(l.disc),
            `<span class="row vw-gap-sm vw-justify-end" style="min-width:6.5rem">
              <span class="hbar-track" style="width:3.5rem;height:8px"><span class="hbar-fill" style="display:block;width:${pct}%;background:${cv(tone,400)}"></span></span>
              <span class="num" style="color:${cv(tone,700)};width:2.5rem;text-align:right">${l.st === 'Planned' ? '—' : pct + '%'}</span></span>`
          ];
        }), '',
        i => [A('View details', { v:'site', l:locRows()[i].name, q:`id=${locRows()[i].id}` })])}`)}`;
}

/* ---- view 3 · Map ---- */
let MAP_LAYER = 'sites';
const MAP_MODES = [{k:'onair',n:'On-air rate'},{k:'build',n:'Sites in build'},{k:'fail',n:'Failed builds'}];
const mpx = lon => (lon - GEO.LON0) * GEO.K;
const mpy = lat => (GEO.Y0 - Math.log(Math.tan(Math.PI/4 + lat*Math.PI/360))) * GEO.KY;

function stateFill(g) {
  if (!g) return 'var(--vw-color-slate-100)';
  if (MAP_COLOR === 'onair') { const p = g.live/g.tot;
    return p >= .78 ? cv('emerald',500) : p >= .72 ? cv('emerald',300) : p >= .65 ? cv('amber',300) : cv('orange',400); }
  if (MAP_COLOR === 'fail')  return g.fail === 0 ? cv('slate',100) : g.fail >= 6 ? cv('red',500) : g.fail >= 3 ? cv('red',300) : cv('red',100);
  const b = g.build; return b >= 30 ? cv('amber',500) : b >= 15 ? cv('amber',300) : b >= 5 ? cv('amber',100) : cv('slate',100);
}
const STATUS_PIN = { 'On-air':'emerald', 'In progress':'amber', 'Planned':'sky', 'Failed':'red' };

function mapSvg() {
  const shapes = Object.entries(GEO.paths).map(([st, dPath]) => {
    const g = STATE_CIRCLE[st], sel = g && g.c === LOC_SEL;
    return `<path d="${dPath}" class="st${g ? ' has-c' : ''}${sel ? ' is-sel' : ''}"${g ? ` data-circle="${g.c}"` : ''}
      fill="${stateFill(g)}" stroke="${sel ? 'var(--vw-color-gray-900)' : 'var(--vw-color-white)'}"
      stroke-width="${sel ? 2.4 : 0.9}"><title>${st}${g ? ` — ${n(g.tot)} sites, ${n(g.live)} on-air, ${g.fail} failed` : ' — no sites'}</title></path>`;
  }).join('');

  const labels = LOC_GEO.filter(g => g.tot >= 14).map(g => {
    const x = mpx(g.lon), y = mpy(g.lat);
    return `<g class="st-lab" pointer-events="none">
      <text x="${x.toFixed(1)}" y="${(y-2).toFixed(1)}" text-anchor="middle" font-size="15" font-weight="600"
        fill="var(--vw-color-gray-900)" stroke="var(--vw-color-white)" stroke-width="3" paint-order="stroke"
        font-family="Poppins,sans-serif">${g.c}</text>
      <text x="${x.toFixed(1)}" y="${(y+13).toFixed(1)}" text-anchor="middle" font-size="12"
        fill="var(--vw-color-gray-600)" stroke="var(--vw-color-white)" stroke-width="3" paint-order="stroke"
        font-family="Poppins,sans-serif">${n(g.tot)}</text></g>`;
  }).join('');

  let pins = '';
  if (MAP_LAYER === 'sites') {
    const grid = 16 / Math.max(1, MZ.k), buckets = new Map();
    LOCATIONS.filter(l => l.lat).forEach(l => {
      const x = mpx(l.lon), y = mpy(l.lat);
      const key = `${Math.round(x/grid)}:${Math.round(y/grid)}`;
      if (!buckets.has(key)) buckets.set(key, { x, y, items: [] });
      buckets.get(key).items.push(l);
    });
    pins = [...buckets.values()].map(b => {
      const k = 1 / MZ.k;
      if (b.items.length === 1) {
        const l = b.items[0], t = STATUS_PIN[l.st] || 'slate';
        return `<g class="pin" data-site="${l.id}" transform="translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${k.toFixed(3)})">
          <title>${l.name} — ${l.st}, ${l.disc}/${l.ne} NE discovered</title>
          <circle r="10" fill="var(--vw-color-white)" fill-opacity=".92"/>
          <circle r="6" fill="${cv(t,500)}" stroke="var(--vw-color-white)" stroke-width="1.8"/></g>`;
      }
      const ids = b.items.map(i => i.id).join(',');
      return `<g class="pin is-cluster" data-cluster="${ids}" transform="translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${k.toFixed(3)})">
        <title>${b.items.length} sites here — ${b.items.map(i=>i.name).join(', ')}</title>
        <circle r="13" fill="var(--vw-color-slate-800)" fill-opacity=".18"/>
        <circle r="9.5" fill="var(--vw-color-slate-800)" stroke="var(--vw-color-white)" stroke-width="1.8"/>
        <text y="3.4" text-anchor="middle" font-size="10" font-weight="600" fill="#fff" font-family="Poppins,sans-serif">${b.items.length}</text></g>`;
    }).join('');
  }

  return `<svg viewBox="0 0 ${GEO.W} ${GEO.H}" class="map-svg" id="mapsvg" role="img" aria-label="Sites across India by state">
    <rect width="${GEO.W}" height="${GEO.H}" fill="var(--vw-color-slate-25)"/>
    <g id="mapzoom">${shapes}${labels}${pins}</g></svg>`;
}

let PIN_GROUP = null;
function mapPanel() {
  /* the same filter the map's boundary click drives — pick a state here or
     on the map, either way the panel, the outline and this control agree */
  const picker = `<span class="nst-input-shell"><select class="nst-input" data-mapstate aria-label="Filter panel by state">
    <option value=""${LOC_SEL ? '' : ' selected'}>All India — every circle</option>
    ${[...LOC_GEO].sort((a,b) => a.n.localeCompare(b.n)).map(x =>
      `<option value="${x.c}"${x.c === LOC_SEL ? ' selected' : ''}>${x.n}</option>`).join('')}
  </select></span>`;
  if (PIN_GROUP) {
    const items = PIN_GROUP.map(id => LOCATIONS.find(l => l.id === id)).filter(Boolean);
    return `<div class="stack">
      ${picker}
      <div class="row vw-justify-between vw-items-start">
        <div class="stack-x"><span class="vw-card-title-sm">${items.length} sites at this point</span>
          <span class="vw-card-description">${items[0].city}, ${items[0].state}</span></div>
        <button class="nst-btn nst-btn--xs" data-clusterclear="1">Clear</button>
      </div>
      ${items.map(l=>`<button class="site-row" data-site="${l.id}">
        <span class="row" style="gap:var(--vw-space-xs)">${chip(l.st,l.chip)}<span class="vw-value">${l.name}</span></span>
        <span class="vw-card-metric-label-sub num">${l.disc}/${l.ne} NE</span></button>`).join('')}
    </div>`;
  }
  if (!LOC_SEL) {
    const tot = LOC_GEO.reduce((a,x) => a + x.tot, 0), live = LOC_GEO.reduce((a,x) => a + x.live, 0),
          build = LOC_GEO.reduce((a,x) => a + x.build, 0), fail = LOC_GEO.reduce((a,x) => a + x.fail, 0);
    const plan = tot - live - build - fail;
    const rows = [['On-air',live,'emerald'],['In progress',build,'amber'],['Planned',plan,'sky'],['Failed',fail,'red']];
    return `<div class="stack">
      ${picker}
      <div class="stack-x">
        <div class="row vw-justify-between vw-items-baseline">
          <span class="vw-card-title-sm">All India</span>
          <span class="vw-card-metric-label-sub">${LOC_GEO.length} circles</span>
        </div>
        <div class="row vw-items-baseline" style="gap:var(--vw-space-sm)">
          <span class="vw-card-metric-lg num">${n(tot)}</span>
          <span class="vw-card-metric-label-sub">sites · ${(live/tot*100).toFixed(0)}% on-air</span>
        </div>
      </div>
      <div class="meter" style="height:18px;border-radius:var(--vw-radius-xs)">
        ${rows.map(([,v,t])=>`<span style="width:${(v/tot*100).toFixed(2)}%;background:${cv(t,400)}"></span>`).join('')}
      </div>
      <div class="vw-grid vw-grid-cols-2 vw-gap-sm">
        ${rows.map(([k,v,t])=>`<div class="vw-card-child row vw-justify-between" style="padding:var(--vw-space-sm)">
          <span class="legend-i"><span class="legend-sw" style="background:${cv(t,400)}"></span>${k}</span>
          <span class="vw-value num">${n(v)}</span></div>`).join('')}
      </div>
      <div class="vw-card-child-shaded vw-card-description">Click a state on the map — or pick one above — to see its detail.</div>
    </div>`;
  }
  const g = LOC_GEO.find(x => x.c === LOC_SEL) || LOC_GEO[0];
  const plan = g.tot - g.live - g.build - g.fail;
  const rows = [['On-air',g.live,'emerald'],['In progress',g.build,'amber'],['Planned',plan,'sky'],['Failed',g.fail,'red']];
  const sites = LOCATIONS.filter(l => l.state === g.st);
  return `<div class="stack">
    ${picker}
    <div class="stack-x">
      <div class="row vw-justify-between vw-items-baseline">
        <span class="vw-card-title-sm">${g.n}</span>
        <span class="vw-card-metric-label-sub num">${g.lat.toFixed(2)}°N ${g.lon.toFixed(2)}°E</span>
      </div>
      <div class="row vw-items-baseline" style="gap:var(--vw-space-sm)">
        <span class="vw-card-metric-lg num">${n(g.tot)}</span>
        <span class="vw-card-metric-label-sub">sites · ${(g.live/g.tot*100).toFixed(0)}% on-air</span>
      </div>
    </div>
    <div class="meter" style="height:18px;border-radius:var(--vw-radius-xs)">
      ${rows.map(([,v,t])=>`<span style="width:${(v/g.tot*100).toFixed(2)}%;background:${cv(t,400)}"></span>`).join('')}
    </div>
    <div class="vw-grid vw-grid-cols-2 vw-gap-sm">
      ${rows.map(([k,v,t])=>`<div class="vw-card-child row vw-justify-between" style="padding:var(--vw-space-sm)">
        <span class="legend-i"><span class="legend-sw" style="background:${cv(t,400)}"></span>${k}</span>
        <span class="vw-value num">${n(v)}</span></div>`).join('')}
    </div>
    ${sites.length ? `<div class="stack-x" style="margin-top:var(--vw-space-xs)">
      <span class="eyebrow">Sites on record here</span>
      ${sites.slice(0, 8).map(l=>`<button class="site-row" data-site="${l.id}">
        <span class="row" style="gap:var(--vw-space-xs)">${chip(l.st,l.chip)}<span class="vw-value">${l.name}</span></span>
        <span class="vw-card-metric-label-sub num">${l.disc}/${l.ne} NE</span></button>`).join('')}
      ${sites.length > 8 ? `<span class="vw-card-metric-label-sub">+ ${n(sites.length - 8)} more — open the list for all of them</span>` : ''}
    </div>` : `<div class="vw-card-child-shaded vw-card-description">No sample sites loaded for this circle.</div>`}
    <button class="nst-btn nst-btn--sm nst-btn--filled is-drill" style="align-self:flex-start"${dA({ v:'location', l:`Sites in ${g.n}`, q:`view=list&state=${g.st}` })}>Open ${n(g.tot)} sites</button>
  </div>`;
}

function locMap() {
  const noSite = Object.keys(GEO.paths).filter(st => !STATE_CIRCLE[st]).length;
  const legend = MAP_COLOR === 'onair'
    ? [['≥ 78%','emerald',500],['72 – 77%','emerald',300],['65 – 71%','amber',300],['< 65%','orange',400],['no sites','slate',100]]
    : MAP_COLOR === 'fail'
    ? [['6+ failed','red',500],['3 – 5','red',300],['1 – 2','red',100],['none','slate',100]]
    : [['30+ in build','amber',500],['15 – 29','amber',300],['5 – 14','amber',100],['< 5','slate',100]];
  return `${card(`
    <div class="row vw-justify-between vw-items-start vw-wrap" style="margin-bottom:var(--vw-space-md);gap:var(--vw-space-md)">
      ${headSm('Sites by geography')}
      <div class="row vw-wrap">
        <span class="vw-card-metric-label-sub">Colour by</span>
        <div class="seg">${MAP_MODES.map(m=>`<button class="${MAP_COLOR===m.k?'is-on':''}" data-mapcolor="${m.k}">${m.n}</button>`).join('')}</div>
        <div class="seg"><button class="${MAP_LAYER==='sites'?'is-on':''}" data-maplayer="sites">Site pins</button>
          <button class="${MAP_LAYER==='off'?'is-on':''}" data-maplayer="off">Hide pins</button></div>
      </div>
    </div>
    <div class="map-row">
      <div class="map-wrap">
        ${mapSvg()}
        <div class="map-ctl">
          <button class="nst-icon-btn" data-zoom="in" aria-label="Zoom in">+</button>
          <button class="nst-icon-btn" data-zoom="out" aria-label="Zoom out">−</button>
          <button class="nst-icon-btn" data-zoom="reset" aria-label="Reset view">⌂</button>
        </div>
        <div class="map-legend">
          ${legend.map(([l,t,sh])=>`<span class="legend-i"><span class="legend-sw" style="background:${cv(t,sh)};border:1px solid var(--vw-color-slate-300)"></span>${l}</span>`).join('')}
          ${MAP_LAYER==='sites' ? Object.entries(STATUS_PIN).map(([k,t])=>
            `<span class="legend-i"><span class="legend-sw" style="background:${cv(t,500)};border-radius:50%"></span>${k}</span>`).join('') : ''}
        </div>
      </div>
      <div class="map-side" id="mappanel">${mapPanel()}</div>
    </div>
    <div class="vw-card-footer-divider row vw-justify-end vw-wrap">
      <span class="row vw-gap-lg">
        <span class="stack-x t-right"><span class="vw-label">Circles</span><span class="vw-value num">${LOC_GEO.length}</span></span>
        <span class="stack-x t-right"><span class="vw-label">Sites</span><span class="vw-value num">${n(IL.locations)}</span></span>
      </span>
    </div>`)}`;
}

/* ---- view 4 · site drill-down ---- */
let SITE_ID = 'BGLK-277', SITE_TAB = 'router', SITE_SECTION = 'attention';
let SITE_META_OPEN = (() => { try { return localStorage.getItem('nst-sitemeta') === '1'; } catch (e) { return false; } })();
function viewSite() {
  const l = resolveSite(SITE_ID) || LOCATIONS[0];
  const ne = siteNE(l.id, l.ne, l.disc);
  const counts = SITE_TABS.map(t => ({ ...t, c: (ne[t.k]||[]).length }));
  const rows = gridApply('site', ne[SITE_TAB] || []);
  const tot = counts.reduce((a,c)=>a+c.c,0);
  const drift = Object.values(ne).flat().filter(r => r.st === 'drift' || r.st === 'dup').length;
  const notDisc = Object.values(ne).flat().filter(r => r.st === 'none').length;
  const cxData = capexOf(l.id, l.ne), cxTotal = capexTotal(cxData.items), cxA = cxData.approved;
  const oxRun = opexRun(opexOf(l.id, l.ne).items);
  const meta = [['Name', l.name], ['Site type', l.type], ['Location ID', l.id], ['Address', l.addr],
                ['Zone', l.state === 'Karnataka' || l.state === 'Tamil Nadu' || l.state === 'Andhra Pradesh' ? 'South' : l.state === 'Delhi' ? 'North' : 'West'],
                ['State', l.state], ['City', l.city], ['Coordinates', l.lat ? `${l.lat}°N ${l.lon}°E` : '—']];

  const cols = SITE_TAB === 'switch'
    ? [{t:'Status'},{t:'Name'},{t:'IP address'},{t:'Model'},{t:'MAC address'},{t:'Serial number'},{t:'Template'},{t:'OEM'},{t:'Source · verified'}]
    : SITE_TAB === 'dwdm'
    ? [{t:'Status'},{t:'Name'},{t:'IP address'},{t:'Type'},{t:'OEM'},{t:'Software version'},{t:'Shelf · slot'},{t:'Source · verified'}]
    : [{t:'Status'},{t:'Name'},{t:'IP address'},{t:'Model'},{t:'OS version'},{t:'Serial number'},{t:'OEM'},{t:'Rack · U'},{t:'Source · verified'}];

  const cell = r => SITE_TAB === 'switch'
    ? [rst(r.st === 'dup' ? 'drift' : r.st), `<span class="vw-value">${r.name}</span>`, `<span class="mono">${r.ip}</span>`,
       `<span class="mono">${r.model}</span>`, `<span class="mono">${r.mac}</span>`, `<span class="mono">${r.sn}</span>`,
       `<span class="mono">${r.tmpl}</span>`, r.oem, `<span class="row vw-nowrap" style="gap:var(--vw-space-xxs)">${src(r.s)}${ver(r.v)}</span>`]
    : SITE_TAB === 'dwdm'
    ? [rst(r.st), `<span class="vw-value">${r.name}</span>`, `<span class="mono">${r.ip}</span>`, chip(r.type,'info'),
       r.oem, `<span class="mono">${r.sw}</span>`, `<span class="mono">${r.shelf}</span>`,
       `<span class="row vw-nowrap" style="gap:var(--vw-space-xxs)">${src(r.s)}${ver(r.v)}</span>`]
    : [r.st === 'dup' ? chip('Duplicate serial','error') : rst(r.st), `<span class="vw-value">${r.name}</span>`,
       `<span class="mono">${r.ip}</span>`, `<span class="mono">${r.model}</span>`, `<span class="mono">${r.os}</span>`,
       `<span class="mono"${r.st==='dup'?` style="color:${cv('red',700)}"`:''}>${r.sn}</span>`, r.oem,
       `<span class="mono">${r.rack}</span>`, `<span class="row vw-nowrap" style="gap:var(--vw-space-xxs)">${src(r.s)}${ver(r.v)}</span>`];

  /* ---- Attention: this site's alert summary, same card idiom as the
     Coverage-by-circle detail — rollout blocker and risk flag straight
     off the site record, reconciliation gaps off the live NE roster ---- */
  const GAP_ICON = {
    notdisc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M8.5 11h5"/></svg>`,
    drift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7v10a4 4 0 0 0 4 4h2"/><circle cx="7" cy="5" r="2"/><circle cx="17" cy="19" r="2"/><path d="M13 5h8"/><path d="m18 2 3 3-3 3"/></svg>`
  };
  const attn = [];
  if (l.issue) attn.push({ icon: ALERT_ICON[l.issue.cat], sev: l.st === 'Failed' ? 'blocked' : 'delayed',
    label: ALERT_LABEL[l.issue.cat], reason: l.issue.reason, impact: SITE_BLOCKER_IMPACT[l.issue.cat] });
  if (l.risk) attn.push({ icon: ALERT_ICON[RISK_CAT[l.risk] || 'Power'], sev: 'risk',
    label: ALERT_LABEL[RISK_CAT[l.risk] || 'Power'], reason: l.risk,
    impact: 'Potential service interruption if not resolved before it lapses' });
  if (notDisc) attn.push({ icon: GAP_ICON.notdisc, sev: l.disc === 0 ? 'blocked' : 'delayed',
    label: 'Not discovered', reason: `${n(notDisc)} NE on record never seen by discovery`,
    impact: 'Planned or no collector — reconcile to close the record gap',
    d: { v:'reconcile', l:`Not discovered at ${l.name}`, q:'ne=Only in inventory' } });
  if (drift) attn.push({ icon: GAP_ICON.drift, sev: 'delayed',
    label: 'Configuration drift', reason: `${n(drift)} NE differ from the inventory record`,
    impact: 'Includes duplicate serials — verify and update the record',
    d: { v:'reconcile', l:`Drift at ${l.name}`, q:'ne=Differ' } });
  const attnBits = [
    l.issue ? 'a rollout blocker' : '', l.risk ? 'an operational risk flag' : '',
    notDisc ? `${n(notDisc)} NE not discovered` : '', drift ? `${n(drift)} NE drifted` : ''
  ].filter(Boolean);
  const attentionSection = () => {
    const rec = [
      { n:'Verified', c: Object.values(ne).flat().filter(r => r.st === 'ok').length, tone:'emerald',
        d:{ v:'reconcile', l:`Verified at ${l.name}`, q:'ne=Agree' } },
      { n:'Drifted', c: drift, tone:'amber', d:{ v:'reconcile', l:`Drift at ${l.name}`, q:'ne=Differ' } },
      { n:'Not discovered', c: notDisc, tone:'red', d:{ v:'reconcile', l:`Not discovered at ${l.name}`, q:'ne=Only in inventory' } }
    ];
    const steps = [
      ...(l.issue ? [[NEXT_STEP[l.issue.cat], null]] : []),
      ...(l.risk ? [['Plan mitigation before the risk flag becomes an incident', null]] : []),
      ...(notDisc ? [['Run discovery or assign a collector, then reconcile the record',
        { v:'reconcile', l:`Not discovered at ${l.name}`, q:'ne=Only in inventory' }]] : []),
      ...(drift ? [['Verify the drifted attributes and update the inventory record',
        { v:'reconcile', l:`Drift at ${l.name}`, q:'ne=Differ' }]] : [])
    ];
    const cxPct = cxA ? Math.min(100, cxTotal / cxA * 100) : 0;
    const exposureNote = l.st === 'Failed'
      ? `${inrShort(cxTotal)} is committed while the build is blocked — each idle month adds ${inrShort(oxRun)} in recurring cost with no traffic carried.`
      : l.st === 'In progress' && l.issue
      ? `${inrShort(cxTotal)} is committed against a delayed build — the longer the slip, the longer this capital sits idle.`
      : '';
    return card(`
    ${headSm('Alert Summary', 'rollout blockers, risk flags and reconciliation gaps at this site')}
    ${attn.length ? `
      <div class="vw-card-child-shaded vw-card-description" style="margin-top:var(--vw-space-sm)">
        ${l.type} · <b>${l.st}</b>${l.stage ? ` at stage <b>${l.stage}</b>` : ''} — ${attnBits.join(', ')}.</div>
      <div class="cov-alert-grid attn-alerts">${attn.map(a => `
        <div class="cov-alert-card cov-alert-card--${a.sev}"${a.d ? ` role="button" tabindex="0" style="cursor:pointer" aria-label="${esc(a.label)}: open reconciliation"${dA(a.d)}` : ''}>
          <span class="cov-alert-icon cov-alert-icon--${a.sev}">${a.icon}</span>
          <div class="cov-alert-body">
            <div class="cov-alert-label">${a.label}</div>
            <div class="cov-alert-reason">${a.reason}</div>
            <div class="cov-crit-impact">${a.impact}</div>
          </div>
        </div>`).join('')}</div>`
      : `<div class="cov-clear"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${cv('emerald',600)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>Nothing needs attention — the build is clean and the record reconciled.</div>`}

    <div class="vw-grid vw-grid-cols-2 vw-gap-md" style="margin-top:var(--vw-space-lg)">
      <div class="vw-card-child" style="padding:var(--vw-space-md)">
        ${headSm('Record vs network', 'where each NE on record stands against discovery')}
        <div class="row vw-gap-md vw-items-center" style="margin-top:var(--vw-space-sm)">
          ${donut(rec, tot || 1, n(tot), 'NE', 108)}${legendRows(rec)}
        </div>
      </div>
      <div class="vw-card-child" style="padding:var(--vw-space-md)">
        ${headSm('Financial exposure', 'money committed against this build')}
        <div class="stack-s" style="margin-top:var(--vw-space-sm)">
          <div class="row vw-justify-between vw-items-baseline"><span class="vw-label">Capex committed</span>
            <span class="vw-value num">${inrShort(cxTotal)} <span class="vw-card-metric-label-sub">of ${inrShort(cxA)} approved</span></span></div>
          <div class="meter" style="height:8px"><span style="width:${cxPct.toFixed(0)}%;background:${cv('cyan',400)}"></span></div>
          <div class="row vw-justify-between vw-items-baseline"><span class="vw-label">Opex run rate</span>
            <span class="vw-value num">${inrShort(oxRun)} / mo <span class="vw-card-metric-label-sub">· ${inrShort(oxRun*12)} a year</span></span></div>
          ${exposureNote ? `<div class="vw-card-child-shaded vw-card-description">${exposureNote}</div>` : ''}
        </div>
      </div>
    </div>

    ${steps.length ? `
    <div style="margin-top:var(--vw-space-lg)">
      ${headSm('Recommended next steps', 'in the order a field team would take them')}
      <div class="stack-s" style="margin-top:var(--vw-space-sm)">
        ${steps.map(([txt], i) => `<div class="vw-card-child row vw-items-center" style="padding:var(--vw-space-sm) var(--vw-space-md)">
          <span class="row vw-gap-sm vw-items-center" style="min-width:0"><span class="attn-step-n num">${i+1}</span><span class="vw-value" style="font-weight:400">${txt}</span></span>
        </div>`).join('')}
      </div>
    </div>` : ''}`);
  };

  return `<div class="page">
    ${pageHead(l.name, `${l.type} · ${l.id} · ${l.city}, ${l.state}`)}

    ${card(`
      <div class="meta-bar">
        <button class="meta-toggle" data-metatoggle="1" aria-expanded="${SITE_META_OPEN}"
          aria-label="${SITE_META_OPEN ? 'Hide' : 'Show'} site details">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${SITE_META_OPEN ? 0 : -90}deg);transition:transform .15s ease">
            <path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="chip-row">${chip(l.st, l.chip, true)}${chip(l.cat, l.ct==='amber'?'warning':l.ct==='sky'?'info':'success')}
          ${l.disc === l.ne ? chip('Fully reconciled','success') : l.disc === 0 ? chip('Nothing discovered','error') : chip(`${l.ne - l.disc} not discovered`,'warning')}</div>
        ${SITE_META_OPEN ? '' : `<span class="meta-summary">${l.type} · ${l.id} · ${l.city}, ${l.state}
          · <span class="mono">${l.lat ? `${l.lat}°N ${l.lon}°E` : '—'}</span></span>`}
      </div>
      ${SITE_META_OPEN ? `<div class="site-meta">
        ${meta.map(([k,v])=>`<div class="meta-cell"><span class="vw-label">${k}</span><span class="vw-value">${v}</span></div>`).join('')}
      </div>` : ''}`, '', 'padding:var(--vw-space-md) var(--vw-space-lg)')}

    ${statStrip([
      { k:'Network elements', v:n(tot),  s:counts.map(c=>`${c.n} ${c.c}`).join(' · '), t:'sky' },
      { k:'Discovered',       v:n(l.disc), s:`${((l.disc/Math.max(l.ne,1))*100).toFixed(0)}% of record`, t:'emerald' },
      { k:'Drifted',          v:n(drift), s:'incl. duplicate serials', t:'amber' },
      { k:'Not discovered',   v:n(notDisc), s:'planned or no collector', t:'red' },
      { k:'Links terminating',v:l.disc ? n(l.disc*4+7) : '0', s:'LLDP · OSPF · BGP', t:'purple' },
      { k:'Capex committed',  v:inrShort(cxTotal), s:`one-off · ${(cxTotal/cxA*100).toFixed(0)}% of ${inrShort(cxA)}`, t:'cyan' },
      { k:'Opex run rate',    v:inrShort(oxRun) + ' / mo', s:`recurring · ${inrShort(oxRun*12)} a year`, t:'teal' }
    ])}

    <div class="section-tabs">
      <button class="stab${SITE_SECTION==='attention'?' is-on':''}" data-sitesection="attention">Attention <span class="tab-n num">${attn.length}</span></button>
      <button class="stab${SITE_SECTION==='ne'?' is-on':''}" data-sitesection="ne">Network elements <span class="tab-n num">${tot}</span></button>
      <button class="stab${SITE_SECTION==='capex'?' is-on':''}" data-sitesection="capex">Capex <span class="tab-n num">${inrShort(cxTotal)}</span></button>
      <button class="stab${SITE_SECTION==='opex'?' is-on':''}" data-sitesection="opex">Opex <span class="tab-n num">${inrShort(oxRun)}/mo</span></button>
      <button class="stab" data-nav="sitedetails">Site details</button>
      <button class="stab" data-nav="siteequipment">Site equipment</button>
    </div>

    ${SITE_SECTION === 'attention' ? attentionSection()
      : SITE_SECTION === 'capex' ? capexSection(l, tot)
      : SITE_SECTION === 'opex' ? opexSection(l, tot) : card(`
      <div class="tabbar">${counts.map(t=>`<button class="tab${t.k===SITE_TAB?' is-on':''}" data-sitetab="${t.k}">${t.n} <span class="tab-n num">${t.c}</span></button>`).join('')}</div>
      ${gridBar(rows.length, rows.length, 'Name, IP address, serial', FS.site, '', [], 'site')}
      ${rows.length ? table(cols, rows.map(cell), '',
        i => [
          ...(hasNodeView(rows[i].type || SITE_TAB) ? [A('Node view', { v:'node', l:`Node view · ${rows[i].name}`, q:`name=${encodeURIComponent(rows[i].name)}` })] : []),
          A('View details', { v:'resource', l:rows[i].name }),
          A('Open site', { v:'site', l:l.name, q:'id=' + l.id })
        ])
        : `<div class="vw-card-child-shaded vw-card-description" style="padding:var(--vw-space-lg);text-align:center">
             No ${SITE_TABS.find(t=>t.k===SITE_TAB).n.toLowerCase()} elements recorded at this site.</div>`}
      ${rows.length ? `<div class="vw-card-footer-divider legend">
        <span class="legend-i">${rst('ok')} record and network agree</span>
        <span class="legend-i">${rst('drift')} an attribute differs</span>
        <span class="legend-i">${rst('stale')} past the verification SLA</span>
        <span class="legend-i">${rst('none')} not discovered</span>
      </div>` : ''}`)}
  </div>`;
}

/* The NE sample rosters tag rows with city-coded locations (DEL-279,
   BGLK-277) that predate the generated LOCATIONS roster. Every "Open site"
   goes through here: an exact id/name wins, a known city code resolves
   deterministically (by its number) to a real site in that city, and only
   then does the first row remain as the last resort — so a site URL always
   opens the site its label names. */
const SITE_CODE_GEO = {
  DEL: { state: 'Delhi' }, NDLS: { state: 'Delhi' }, NDD: { state: 'Delhi' },
  BGLK: { city: 'Bagalkot' }, CHE: { city: 'Chennai' }, MAS: { city: 'Chennai' },
  VJA: { city: 'Vijayawada' }, VZG: { city: 'Visakhapatnam' }, KOL: { city: 'Kolkata' },
  PUN: { city: 'Pune' }, AHM: { city: 'Ahmedabad' }, MUM: { city: 'Mumbai' },
  BLR: { city: 'Bengaluru' }, INDR: { city: 'Indore' }, DND: { city: 'Dindigul' }
};
function resolveSite(ref) {
  if (!ref) return null;
  const exact = LOCATIONS.find(x => x.id === ref || x.name === ref);
  if (exact) return exact;
  const m = String(ref).match(/^([A-Za-z]+)[-_]?(\d+)?/);
  const g = m && SITE_CODE_GEO[m[1].toUpperCase()];
  const pool = g ? LOCATIONS.filter(x => g.city ? x.city === g.city : x.state === g.state) : [];
  const rows = pool.length ? pool : LOCATIONS;
  return rows[(m && m[2] ? +m[2] : 0) % rows.length];
}
/* a row action that opens the resolved site — label and URL carry the real
   id, so the breadcrumb, the header and the page can never disagree */
function siteA(ref) {
  const s = resolveSite(ref);
  return A('Open site', { v: 'site', l: s.name, q: 'id=' + s.id });
}

/* Everything the site page's header shows, as plain data. The React-owned
   Site details / Site equipment tabs draw the same header from this, so the
   header never disappears or drifts from viewSite when those tabs are open. */
function siteHeadData(id) {
  const l = resolveSite(id) || LOCATIONS[0];
  const ne = siteNE(l.id, l.ne, l.disc);
  const counts = SITE_TABS.map(t => ({ n: t.n, c: (ne[t.k] || []).length }));
  const tot = counts.reduce((a, c) => a + c.c, 0);
  const flat = Object.values(ne).flat();
  const drift = flat.filter(r => r.st === 'drift' || r.st === 'dup').length;
  const notDisc = flat.filter(r => r.st === 'none').length;
  const cxData = capexOf(l.id, l.ne), cxTotal = capexTotal(cxData.items), cxA = cxData.approved;
  const oxRun = opexRun(opexOf(l.id, l.ne).items);
  const attn = (l.issue ? 1 : 0) + (l.risk ? 1 : 0) + (notDisc ? 1 : 0) + (drift ? 1 : 0);
  return {
    id: l.id, name: l.name, type: l.type, city: l.city, state: l.state,
    addr: l.addr, lat: l.lat, lon: l.lon, ne: tot, disc: l.disc,
    sub: `${l.type} · ${l.id} · ${l.city}, ${l.state}`,
    coords: l.lat ? `${l.lat}°N ${l.lon}°E` : '—',
    chips: [
      { t: l.st, tone: l.chip, strong: true },
      { t: l.cat, tone: l.ct === 'amber' ? 'warning' : l.ct === 'sky' ? 'info' : 'success' },
      l.disc === l.ne ? { t: 'Fully reconciled', tone: 'success' }
        : l.disc === 0 ? { t: 'Nothing discovered', tone: 'error' }
        : { t: `${l.ne - l.disc} not discovered`, tone: 'warning' }
    ],
    meta: [['Name', l.name], ['Site type', l.type], ['Location ID', l.id], ['Address', l.addr],
      ['Zone', l.state === 'Karnataka' || l.state === 'Tamil Nadu' || l.state === 'Andhra Pradesh' ? 'South' : l.state === 'Delhi' ? 'North' : 'West'],
      ['State', l.state], ['City', l.city], ['Coordinates', l.lat ? `${l.lat}°N ${l.lon}°E` : '—']],
    cells: [
      { k: 'Network elements', v: n(tot), s: counts.map(c => `${c.n} ${c.c}`).join(' · '), t: 'sky', section: 'ne' },
      { k: 'Discovered', v: n(l.disc), s: `${((l.disc / Math.max(l.ne, 1)) * 100).toFixed(0)}% of record`, t: 'emerald',
        drill: { v: 'reconcile', l: `Verified at ${l.name}`, q: 'ne=Agree' } },
      { k: 'Drifted', v: n(drift), s: 'incl. duplicate serials', t: 'amber',
        drill: { v: 'reconcile', l: `Drift at ${l.name}`, q: 'ne=Differ' } },
      { k: 'Not discovered', v: n(notDisc), s: 'planned or no collector', t: 'red',
        drill: { v: 'reconcile', l: `Not discovered at ${l.name}`, q: 'ne=Only in inventory' } },
      { k: 'Links terminating', v: l.disc ? n(l.disc * 4 + 7) : '0', s: 'LLDP · OSPF · BGP', t: 'purple',
        drill: { v: 'links', l: `Links terminating at ${l.name}`, q: '' } },
      { k: 'Capex committed', v: inrShort(cxTotal), s: `one-off · ${(cxTotal / cxA * 100).toFixed(0)}% of ${inrShort(cxA)}`, t: 'cyan', section: 'capex' },
      { k: 'Opex run rate', v: inrShort(oxRun) + ' / mo', s: `recurring · ${inrShort(oxRun * 12)} a year`, t: 'teal', section: 'opex' }
    ],
    tabs: { attn, ne: n(tot), capex: inrShort(cxTotal), opex: inrShort(oxRun) + '/mo' }
  };
}

/* ---- capex on the site screen ---- */
const CX_TONE = { paid:['emerald',400], invoiced:['sky',400], po:['amber',400], planned:['slate',300] };
const CAT_SHORT = { 'Installation & commissioning':'Installation', 'Fiber & transport':'Fiber & transport' };

function cxBreakRow(label, full, amount, total, tone, shade) {
  return `<div class="cx-row">
    <span class="vw-label" title="${full}">${label}</span>
    <span class="hbar-track"><span class="hbar-fill" style="display:block;width:${(amount/total*100).toFixed(1)}%;background:${cv(tone, shade)}"></span></span>
    <span class="vw-value num t-right">${inrShort(amount)}</span>
    <span class="vw-card-metric-label-sub num t-right">${(amount/total*100).toFixed(1)}%</span>
  </div>`;
}

function capexSection(l, neCount) {
  const cx = capexOf(l.id, l.ne);
  const total = capexTotal(cx.items), variance = cx.approved - total;
  const states = capexByState(cx.items), cats = capexByCat(cx.items);
  const spent = states.find(s => s.k === 'paid').c;
  const util = Math.min(100, total / cx.approved * 100);
  const paidPct = spent / cx.approved * 100;

  const tiles = [
    { k:'Approved budget', v:inrShort(cx.approved), s:`${cx.fy} · ${cx.afe}`, t:'slate' },
    { k:'Committed',       v:inrShort(total),       s:`${util.toFixed(1)}% of approved`, t:'sky' },
    { k:'Paid to date',    v:inrShort(spent),       s:`${(spent/total*100).toFixed(0)}% of committed`, t:'emerald' },
    { k:variance >= 0 ? 'Under budget' : 'Over budget', v:inrShort(Math.abs(variance)),
      s:`${(Math.abs(variance)/cx.approved*100).toFixed(1)}% ${variance >= 0 ? 'unspent' : 'overrun'}`,
      t:variance >= 0 ? 'emerald' : 'red' },
    { k:'Cost per element', v:inrShort(total / Math.max(neCount,1)), s:`across ${neCount} network elements`, t:'purple' }
  ];

  return card(`
    <div class="stack-x">
      <span class="vw-card-title">Capex</span>
    </div>

    <div style="margin-top:var(--vw-space-lg)">${statStrip(tiles)}</div>

    <div class="cx-util">
      <div class="row vw-justify-between vw-items-baseline" style="margin-bottom:6px">
        <span class="eyebrow">Budget utilisation</span>
        <span class="vw-card-metric-label-sub num">${inr(total)} committed of ${inr(cx.approved)} approved</span>
      </div>
      <div class="cx-util-track">
        <span class="cx-util-fill" style="width:${paidPct.toFixed(2)}%;background:${cv('emerald',400)}"></span>
        <span class="cx-util-fill" style="width:${(util-paidPct).toFixed(2)}%;background:${cv('sky',300)}"></span>
      </div>
      <div class="row vw-justify-between" style="margin-top:6px">
        <span class="legend">
          <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',400)}"></span>paid ${paidPct.toFixed(0)}%</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('sky',300)}"></span>committed, not paid ${(util-paidPct).toFixed(0)}%</span>
          <span class="legend-i"><span class="legend-sw" style="background:var(--vw-color-slate-100);border:1px solid var(--vw-color-slate-300)"></span>headroom ${(100-util).toFixed(0)}%</span>
        </span>
        <span class="vw-card-metric-label-sub">${variance >= 0 ? inrShort(variance) + ' headroom' : inrShort(-variance) + ' over'}</span>
      </div>
    </div>

    <div class="cx-split">
      <div class="cx-panel">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">Commitment stage</span>
          <span class="vw-card-metric-label-sub">${cx.items.length} line items</span>
        </div>
        ${states.map(st => cxBreakRow(st.n, st.n, st.c, total, CX_TONE[st.k][0], CX_TONE[st.k][1])).join('')}
      </div>
      <div class="cx-panel">
        <div class="row vw-justify-between vw-items-baseline cx-panel-head">
          <span class="eyebrow">By category</span>
          <span class="vw-card-metric-label-sub">${cats.length} categories</span>
        </div>
        ${cats.map(c => cxBreakRow(CAT_SHORT[c.n] || c.n, c.n, c.c, total, c.tone, 400)).join('')}
      </div>
    </div>

    <div class="cx-panel-head row vw-justify-between vw-items-baseline" style="margin-top:var(--vw-space-xl)">
      <span class="eyebrow">Line items</span>
    </div>
    ${table([{t:'Line item'},{t:'Category'},{t:'Vendor · PO'},{t:'Qty',r:true},{t:'Unit cost',r:true},
             {t:'Amount',r:true},{t:'Stage'},{t:'Linked elements'}],
      cx.items.map(r => {
        const st = CAPEX_STATES.find(x => x.k === r.s), cat = CAPEX_CATS.find(x => x.k === r.c);
        return [
          `<span class="vw-value">${r.d}</span>`,
          `<span class="legend-i"><span class="legend-sw" style="background:${cv(cat.tone,400)}"></span>${CAT_SHORT[cat.n] || cat.n}</span>`,
          `<span class="vw-value">${r.v}</span><br><span class="vw-card-metric-label-sub mono">${r.po}</span>`,
          n(r.q), inr(r.u),
          `<span style="font-weight:500">${inr(r.q * r.u)}</span>`,
          `${chip(st.n, st.chip)}<br><span class="vw-card-metric-label-sub num">${r.dt}</span>`,
          r.ne === '—' ? `<span style="color:${cv('gray',400)}">—</span>` : `<span class="vw-card-metric-label-sub">${r.ne}</span>`
        ];
      }))}
    <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
      <span class="vw-card-description">Last updated ${cx.updated}.</span>
      <span class="row vw-gap-xl">
        <span class="stack-x t-right"><span class="vw-label">Approved</span><span class="vw-value num">${inr(cx.approved)}</span></span>
        <span class="stack-x t-right"><span class="vw-label">Committed</span><span class="vw-value num" style="font-weight:500">${inr(total)}</span></span>
        <span class="stack-x t-right"><span class="vw-label">${variance >= 0 ? 'Remaining' : 'Overrun'}</span>
          <span class="vw-value num" style="font-weight:500;color:${cv(variance >= 0 ? 'emerald' : 'red', 700)}">${inr(Math.abs(variance))}</span></span>
      </span>
    </div>`);
}

/* ---- capex editor ---- */
let CAPEX_ID = 'BGLK-277', CAPEX_DRAFT = null, CAPEX_SAVED = false;
function capexDraft() {
  if (!CAPEX_DRAFT) {
    const l = LOCATIONS.find(x => x.id === CAPEX_ID) || LOCATIONS[0];
    const cx = capexOf(l.id, l.ne);
    CAPEX_DRAFT = { fy: cx.fy, afe: cx.afe, cc: cx.cc, owner: cx.owner, approved: cx.approved,
                    items: cx.items.map(r => ({ ...r })) };
  }
  return CAPEX_DRAFT;
}
function capexTotalsHtml() {
  const d = capexDraft(), total = capexTotal(d.items), variance = d.approved - total;
  return `<div class="row vw-justify-between vw-wrap" style="gap:var(--vw-space-lg)">
    <span class="vw-card-description">${d.items.length} line items</span>
    <span class="row vw-gap-xl">
      <span class="stack-x t-right"><span class="vw-label">Approved</span><span class="vw-value num">${inr(d.approved)}</span></span>
      <span class="stack-x t-right"><span class="vw-label">Committed</span><span class="vw-value num" style="font-weight:500">${inr(total)}</span></span>
      <span class="stack-x t-right"><span class="vw-label">${variance >= 0 ? 'Remaining' : 'Overrun'}</span>
        <span class="vw-value num" style="font-weight:500;color:${cv(variance >= 0 ? 'emerald' : 'red', 700)}">${inr(Math.abs(variance))}</span></span>
    </span></div>`;
}
function capexRowsHtml() {
  const d = capexDraft();
  return d.items.map((r, i) => `
    <tr>
      <td><input class="nst-input cx-in" data-i="${i}" data-f="d" value="${r.d}" style="min-width:14rem"></td>
      <td><select class="nst-input cx-in" data-i="${i}" data-f="c">
        ${CAPEX_CATS.map(c => `<option value="${c.k}"${c.k === r.c ? ' selected' : ''}>${c.n}</option>`).join('')}</select></td>
      <td><input class="nst-input cx-in" data-i="${i}" data-f="v" value="${r.v}" style="width:8rem"></td>
      <td><input class="nst-input cx-in mono" data-i="${i}" data-f="po" value="${r.po}" style="width:9rem"></td>
      <td><input class="nst-input cx-in num t-right" data-i="${i}" data-f="q" type="number" min="0" value="${r.q}" style="width:4.5rem"></td>
      <td><input class="nst-input cx-in num t-right" data-i="${i}" data-f="u" type="number" min="0" step="1000" value="${r.u}" style="width:8rem"></td>
      <td class="t-right num" style="font-weight:500" id="cxamt${i}">${inr(r.q * r.u)}</td>
      <td><select class="nst-input cx-in" data-i="${i}" data-f="s">
        ${CAPEX_STATES.map(c => `<option value="${c.k}"${c.k === r.s ? ' selected' : ''}>${c.n}</option>`).join('')}</select></td>
      <td><input class="nst-input cx-in" data-i="${i}" data-f="dt" value="${r.dt}" style="width:7.5rem"></td>
      <td><button class="nst-btn nst-btn--xs nst-btn--danger-subtle" data-cxdel="${i}">Remove</button></td>
    </tr>`).join('');
}
function viewCapex() {
  const l = LOCATIONS.find(x => x.id === CAPEX_ID) || LOCATIONS[0];
  const d = capexDraft();
  return `<div class="page">
    ${pageHead(`Capex · ${l.name}`, `${l.type} · ${l.id} · ${l.city}, ${l.state}`,
      `<button class="nst-btn nst-btn--sm" data-site="${l.id}">Cancel</button>
       <button class="nst-btn nst-btn--filled nst-btn--sm" data-cxsave="1">Save changes</button>`)}

    ${CAPEX_SAVED ? `<div class="vw-card-section vw-card--success row vw-justify-between">
        <span class="vw-value">Capex updated for ${l.name}. ${d.items.length} line items, ${inr(capexTotal(d.items))} committed.</span>
        <button class="nst-btn nst-btn--xs" data-site="${l.id}">Back to site</button></div>` : ''}

    ${card(`
      ${headSm('Budget header')}
      <div class="capex-form" style="margin-top:var(--vw-space-md)">
        <div class="stack-x"><label class="nst-input-label" for="cxfy">Financial year</label>
          <select class="nst-input cx-hd" id="cxfy" data-f="fy">
            ${['FY 2023-24','FY 2024-25','FY 2025-26','FY 2026-27'].map(v=>`<option${v===d.fy?' selected':''}>${v}</option>`).join('')}</select></div>
        <div class="stack-x"><label class="nst-input-label" for="cxafe">AFE / CR number</label>
          <input class="nst-input cx-hd mono" id="cxafe" data-f="afe" value="${d.afe}"></div>
        <div class="stack-x"><label class="nst-input-label" for="cxcc">Cost centre</label>
          <input class="nst-input cx-hd" id="cxcc" data-f="cc" value="${d.cc}"></div>
        <div class="stack-x"><label class="nst-input-label" for="cxown">Budget owner</label>
          <input class="nst-input cx-hd" id="cxown" data-f="owner" value="${d.owner}"></div>
        <div class="stack-x"><label class="nst-input-label" for="cxapp">Approved budget (₹)</label>
          <input class="nst-input cx-hd num" id="cxapp" data-f="approved" type="number" step="100000" value="${d.approved}"></div>
      </div>`)}

    ${card(`
      <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
        ${headSm('Line items')}
        <button class="nst-btn nst-btn--sm" data-cxadd="1">Add line item</button>
      </div>
      <div class="tbl-wrap"><table class="nst-table">
        <thead><tr>${['Line item','Category','Vendor','PO number','Qty','Unit cost','Amount','Stage','Date','']
          .map((t,i)=>`<th${i===4||i===5||i===6?' class="t-right"':''}>${t}</th>`).join('')}</tr></thead>
        <tbody id="cxbody">${capexRowsHtml()}</tbody>
      </table></div>
      <div class="vw-card-footer-divider" id="cxtotals">${capexTotalsHtml()}</div>`)}
  </div>`;
}

/* Insights is the landing page; Locations is reached only by drilling
   into it (a KPI tile, a hierarchy node, a coverage row) — there is no
   tab to switch views by hand any more, so LOC_VIEW only ever flips to
   'list' via a real dA() drill, and back via the explicit control in
   locList()'s own toolbar. Map is not a separate view at all now — it's
   the last section of the dashboard, see locInsights(). */
function viewLocation() {
  const body = LOC_VIEW === 'list' ? locList() : locInsights();
  return `<div class="page">
    ${drillBar()}
    ${body}
  </div>`;
}

/* ── Physical Resources ───────────────────────────────── */
function viewPhysical() {
  const t = TAB.phy, meta = PHY_TABS.find(x => x.k === t);
  PHY_STOCK = new Set([...PHY_STOCK].filter(k => k !== 'decomm'));
  if (!PHY_STOCK.size) PHY_STOCK = new Set(ACTIVE_STATES);
  const all = PHY_OEM ? Object.values(PHY).flat() : (PHY[t] || []);
  const verBand = h => h === null || h === undefined ? 'never' : h < 24 ? 'fresh' : h < 720 ? '30' : 'old';
  const rows = all.filter(r => PHY_STOCK.has(r.stock || 'deployed'))
    .filter(r => !PHY_OEM || (r.oem || '').toUpperCase().startsWith(PHY_OEM.toUpperCase()))
    .filter(r => !PHY_SRC || r.s === PHY_SRC)
    .filter(r => !PHY_VER || verBand(r.v) === PHY_VER);
  const zombies = all.filter(r => r.zombie).length;
  const compliance = { 'MX960':'behind', 'NCS-540':'ok', 'ACX2200':'ok', 'MX204':'behind',
                       'ASR920':'behind', '7750':'unknown', '7750 SR-7':'unknown', 'EX4300-48P':'ok',
                       'ACX7024':'ok', 'C9300-48UXM':'ok', 'EX2200-24T':'behind', 'L3-CORE-48P':'ok',
                       'C9400-LC-48T':'ok', 'L2-ACCESS-24P':'ok' };
  const eos = { 'MX960':['30-Jun-2025','past'], 'MX204':['31-Dec-2027','soon'], 'ASR920':['30-Sep-2026','soon'],
                'EX2200-24T':['31-Mar-2024','past'], 'EX4300-48P':['31-Dec-2029','safe'], 'NCS-540':['31-Dec-2030','safe'],
                'ACX2200':['30-Jun-2030','safe'], 'ACX7024':['31-Dec-2032','safe'], '7750':['—','unknown'],
                '7750 SR-7':['—','unknown'], 'C9300-48UXM':['31-Oct-2029','safe'], 'C9400-LC-48T':['30-Apr-2030','safe'],
                'L3-CORE-48P':['31-Dec-2028','safe'], 'L2-ACCESS-24P':['31-Dec-2028','safe'] };
  const portsOf = (name, i) => t === 'router' ? [36, 22 - (i % 5)] : t === 'switch' ? [48, 30 + (i % 9)] : [0, 0];
  const cmpChip = m => ({ ok:chip('Current','success'), behind:chip('Behind','warning'),
                          unknown:chip('Unknown','neutral') })[compliance[m] || 'unknown'];
  const eosChip = m => { const e = eos[m] || ['—','unknown'];
    return e[1] === 'past' ? `<span style="color:${cv('red',700)}">${e[0]}</span>`
      : e[1] === 'soon' ? `<span style="color:${cv('amber',700)}">${e[0]}</span>`
      : e[1] === 'safe' ? `<span class="num">${e[0]}</span>` : `<span style="color:${cv('gray',400)}">—</span>`; };
  const E = EST;

  return `<div class="page">

    ${drillBar()}

    ${statStrip([
      { k:'Network elements', v:n(IL.ne), s:'Router 2,148 · Switch 349 · other 206', t:'sky',
        d:{ v:'physical', l:'All network elements' } },
      { k:'Ports used',   v:`${(E.ports.used/E.ports.total*100).toFixed(0)}%`, s:`${n(E.ports.free)} free of ${n(E.ports.total)}`, t:'emerald',
        d:{ v:'resource', l:'Interfaces and port utilisation' } },
      { k:'Past end of sale', v:n(E.eol.past), s:`${n(E.eol.within12)} within 12 months`, t:'red',
        d:{ v:'physical', l:'Elements past end of sale' } },
      { k:'Spares in store',  v:n(E.spares.instore), s:`${n(E.spares.rma)} at RMA · ${n(E.spares.intransit)} in transit`, t:'purple',
        d:{ v:'physical', l:'Spares in store', q:'stock=instore' } }
    ])}

    ${card(`
      <div class="tabbar">${PHY_TABS.map(x => `
        <button class="tab${x.k === t ? ' is-on' : ''}" data-tab="phy:${x.k}"
          title="${n(phyCount(x.k, PHY_STOCK))} of ${n(x.c + stockCount(x.k, 'decomm'))} ${x.n.toLowerCase()} records in the selected stock states${
            x.disc ? ` · ${n(x.disc)} discovered` : ' · no collector reaches this class'}">
          ${x.n}</button>`).join('')}
      </div>

      ${gridBar(total, PHY_OEM ? `${n(IL.ne)} across every class`
          : n(phyCount(t, PHY_STOCK)),
        'Name, IP address, serial', FS.physical,
        `<div class="stock-chips">
          ${STOCK_ST.filter(sk => sk.k !== 'decomm').map(sk => `
            <button class="stock-chip${PHY_STOCK.has(sk.k) ? ' is-on' : ''}" data-stock="${sk.k}"
              style="${PHY_STOCK.has(sk.k) ? `border-color:${cv(sk.tone,400)};background:${cv(sk.tone,50)}` : ''}"
              title="${n(stockCount(t, sk.k))} ${meta.n.toLowerCase()} records · ${n(sk.c)} across the whole estate">
              <span class="legend-sw" style="background:${cv(sk.tone,400)}"></span>${sk.n}</button>`).join('')}
        </div>${meta.disc === 0 ? '' : chip(`${n(meta.c - meta.disc)} of ${n(meta.c)} not verified`, 'warning')}`,
        [])}
      ${table(
        [{t:'Status'},{t:'Stock state'},{t:'Name / IP'},{t:'Model / OEM'},{t:'OS version'},
         {t:'Ports',r:true},{t:'End of sale'},{t:'Location'},{t:'Source · verified'}],
        rows.map((r, i) => {
          const sk = STOCK_OF[r.stock || 'deployed'];
          const ro = false;
          const nameCell = (t === 'router')
            ? `<button class="nst-btn nst-btn--xs nst-btn--ghost" data-res="${r.name}" style="padding:0;font-weight:500">${r.name}</button>`
            : `<span class="vw-value">${r.name}</span>`;
          const [tot, used] = portsOf(r.name, i);
          return [
            r.zombie ? chip('Zombie', 'error') : rst(r.st),
            chip(sk.n, sk.chip),
            `${nameCell}<span class="cell-sub mono">${r.ip}</span>`,
            `<span class="mono">${r.model}</span><span class="cell-sub">${r.oem}</span>`,
            `<span class="mono">${r.os}</span>`,
            tot && !ro ? `<span class="row vw-gap-sm vw-justify-end vw-nowrap"><span class="hbar-track" style="width:3rem;height:7px">
              <span class="hbar-fill" style="display:block;width:${(used/tot*100).toFixed(0)}%;background:${cv(used/tot>0.85?'red':used/tot>0.7?'amber':'emerald',400)}"></span></span>${used}/${tot}</span>` : '—',
            eosChip(r.model), `<span class="mono">${r.loc}</span>`,
            `<span class="row vw-nowrap" style="gap:var(--vw-space-xxs)">${src(r.s)}${ver(r.v)}</span>`
          ];
        }), '',
        i => rows[i].stock === 'decomm'
          ? []
          : [...(hasNodeView(t) ? [A('Node view', { v:'node', l:`Node view · ${rows[i].name}`, q:`name=${encodeURIComponent(rows[i].name)}` })] : []),
             A('View details', { v:'resource', l:rows[i].name }),
             siteA(rows[i].loc)])}
      <div class="vw-card-footer-divider legend">
        <span class="legend-i">${rst('ok')} record and network agree</span>
        <span class="legend-i">${rst('drift')} an attribute differs</span>
        <span class="legend-i">${rst('stale')} past the verification SLA</span>
        <span class="legend-i">${rst('miss')} did not answer</span>
        <span class="legend-i">${rst('none')} no collector reaches this class</span>
      </div>`)}
  </div>`;
}

/* ── VNF lifecycle operation ──────────────────────────── */
let VNF_LC_ID = null, VNF_LC_STAGE = 'day0';
/* task drawer: which step is open, and which of its two accordion
   sections are expanded — reset whenever the drawer opens on a new step */
let VNF_LC_DRAWER = null; /* { stage, step } | null */
let VNF_LC_DRAWER_OPEN = { req: true, res: true };
const IC_EYE = `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${KI.view}</svg>`;

function lcDot(st, small) {
  const [label, tone, glyph] = LC_STATUS[st];
  const size = small ? '0.75rem' : '1.375rem', fs = small ? '0.5rem' : '0.625rem';
  return `<span class="step-dot" style="width:${size};height:${size};min-width:${size};font-size:${fs};background:${cv(tone,100)};color:${cv(tone,700)}" title="${label}">${glyph}</span>`;
}

/* A step's status is never stored on the step itself — it depends on the NF
   it belongs to, so it's derived here, once, from the NF's own status:
     Ready       → every step completed
     Failed      → completed up to a real failure point, nothing after it
                    has run yet (not "everything after also failed")
     In progress → completed up to the current step, the rest still pending
     anything else (Planned) → the caller never reaches this; see viewVnfLifecycle
   The failure/current point is derived the same deterministic-seed way every
   other sample figure in this file is — stable per NF, not random per render. */
function vnfLifecycleStages(vnf) {
  const flat = VNF_LC_STAGES.flatMap(s => s.steps);
  const total = flat.length;
  const failAt = vnf.st === 'Failed' ? nint(vnf.nf, 999, 1, Math.max(1, total - 2)) : -1;
  const curAt = vnf.st === 'In progress' ? nint(vnf.nf, 998, 0, total - 1) : -1;
  let i = -1;
  return VNF_LC_STAGES.map(s => ({
    ...s,
    steps: s.steps.map(step => {
      i++;
      let st;
      if (vnf.st === 'Ready') st = 'done';
      else if (vnf.st === 'Failed') st = i < failAt ? 'done' : i === failAt ? 'failed' : 'notstarted';
      else if (vnf.st === 'In progress') st = i < curAt ? 'done' : i === curAt ? 'progress' : 'pending';
      else st = 'notstarted';
      return { ...step, st };
    })
  }));
}
/* request/response only exists for a step that has actually run */
const vnfStepHasPayload = st => st === 'done' || st === 'failed' || st === 'progress';

/* One collector call per step, shaped by what the step actually does — the
   same request/response contract every other task in this workflow uses,
   just addressed and payloaded for that step's own job. A failed step gets
   an actual error response, not a rebadged success one. */
function vnfStepPayload(stepName, nf, status) {
  const host = 'https://reach.c4.ocloud.visionwaves.com:9443';
  const now = new Date().toISOString();
  const req = /subcloud/i.test(stepName)
    ? { request: `${host}/subclouds/verify`, payload: { sc: { name: 'bglkct01cl', addr: '2001:56b:f10:f011:301:7000:2080:1' } } }
    : /generate|values\.yaml|package list/i.test(stepName)
    ? { request: `${host}/nf/${encodeURIComponent(nf)}/values/generate`, payload: { nf, template: 'vdu-default-v2', step: stepName } }
    : /push/i.test(stepName)
    ? { request: `${host}/nf/${encodeURIComponent(nf)}/config/push`, payload: { nf, file: stepName.replace(/^Push /, '') } }
    : /deploy|publish/i.test(stepName)
    ? { request: `${host}/nf/${encodeURIComponent(nf)}/deploy`, payload: { nf, action: stepName } }
    : /check|status|verify capacity/i.test(stepName)
    ? { request: `${host}/nf/${encodeURIComponent(nf)}/status`, payload: { nf } }
    : { request: `${host}/nf/${encodeURIComponent(nf)}/task`, payload: { nf, task: stepName } };
  if (status === 'failed') return { req, res: { result: {
    Status: 'failed', Process: stepName,
    Error: 'Timed out waiting for acknowledgement from target host',
    Update: now
  } } };
  if (status === 'progress') return { req, res: { result: { Status: 'in_progress', Process: stepName, Update: now } } };
  return { req, res: { result: { Status: 'completed', Process: stepName, Update: now } } };
}

/* pretty JSON with the platform's existing (until now unused) payload
   syntax colours — keys in .k, string values in .g */
function jsonView(obj) {
  const json = esc(JSON.stringify(obj, null, 2))
    .replace(/"([^"]+)":/g, '<span class="k">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="g">"$1"</span>');
  return `<pre class="payload" style="max-height:16rem;overflow:auto">${json}</pre>`;
}

function vnfLcAccordion(key, title, obj) {
  const open = VNF_LC_DRAWER_OPEN[key];
  return `<div class="vw-card-section" style="padding:0;overflow:hidden">
    <button class="row vw-justify-between vw-items-center drawer-acc-h" data-vnflcaccordion="${key}" aria-expanded="${open}">
      <span class="vw-card-title-sm">${title}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        style="transform:rotate(${open ? 0 : 180}deg);transition:transform .15s ease;flex-shrink:0"><path d="m6 15 6-6 6 6"/></svg>
    </button>
    ${open ? `<div style="padding:0 var(--vw-space-lg) var(--vw-space-lg)">
      <div class="row vw-justify-end" style="margin-bottom:6px">
        <button class="nst-btn nst-btn--xs nst-btn--ghost" data-copy="${esc(JSON.stringify(obj, null, 2))}">${kIcon('Copy')}<span>Copy</span></button>
      </div>
      ${jsonView(obj)}
    </div>` : ''}
  </div>`;
}

function vnfLcDrawer(nf, stages) {
  if (!VNF_LC_DRAWER) return '';
  const stageObj = stages.find(s => s.k === VNF_LC_DRAWER.stage);
  const step = stageObj && stageObj.steps[VNF_LC_DRAWER.step];
  if (!step || !vnfStepHasPayload(step.st)) return '';
  const [label, tone] = LC_STATUS[step.st];
  const { req, res } = vnfStepPayload(step.n, nf, step.st);
  return `
    <div class="drawer-overlay" data-vnflcclose="1"></div>
    <div class="drawer-panel" role="dialog" aria-label="${esc(step.n)} details">
      <div class="row" style="padding:var(--vw-space-lg) var(--vw-space-lg) 0">
        <button class="fp-x" data-vnflcclose="1" aria-label="Close">${IC_X}</button>
      </div>
      <div class="row vw-justify-between vw-items-center" style="padding:var(--vw-space-md) var(--vw-space-lg) var(--vw-space-lg)">
        <span class="vw-card-title">${step.n}</span>
        ${chip(label, tone)}
      </div>
      <div class="stack-s" style="padding-bottom:var(--vw-space-lg)">
        ${vnfLcAccordion('req', 'View Requests', req)}
        ${vnfLcAccordion('res', 'View Response', res)}
      </div>
    </div>`;
}

function viewVnfLifecycle() {
  const nf = VNF_LC_ID || (VNFS[0] && VNFS[0].nf) || '—';
  const vnf = VNFS.find(v => v.nf === nf) || VNFS[0];

  /* Planned means execution has not started — there is no real flow to
     show yet, so don't draw one; an empty/fabricated timeline would lie
     about what's actually happened on this NF */
  if (vnf.st === 'Planned') {
    return `<div class="page">
      ${pageHead('Lifecycle operation', `RAN ZTP NEW 1 · ${nf}`)}
      ${drillBar()}
      ${card(`
        <div class="vw-card-child-shaded stack-s" style="padding:var(--vw-space-2xl);text-align:center">
          ${chip('Planned', 'info')}
          <span class="vw-card-title" style="margin-top:var(--vw-space-sm)">This operation has not started yet</span>
          <span class="vw-card-description" style="max-width:48ch;margin:0 auto">
            <strong>${esc(nf)}</strong> is on the provisioning schedule. Day 0, Grow, Events and GPL will appear here
            once execution begins — there is nothing to show before then.
          </span>
        </div>`)}
    </div>`;
  }

  const stages = vnfLifecycleStages(vnf);
  const stage = stages.find(s => s.k === VNF_LC_STAGE) || stages[0];
  const stageStatus = s => s.steps.some(x => x.st === 'failed') ? 'failed'
    : s.steps.every(x => x.st === 'done') ? 'done'
    : s.steps.some(x => x.st === 'progress') ? 'progress' : 'pending';
  return `<div class="page">
    ${pageHead('Lifecycle operation', `RAN ZTP NEW 1 · ${nf}`)}
    ${drillBar()}
    <div class="row-t" style="align-items:flex-start">
      <div class="stack-s" style="width:min(320px,100%);flex-shrink:0">
        ${stages.map(s => `
          <div class="step">
            ${lcDot(stageStatus(s))}
            <button class="vw-card-section stack-x${s.k === VNF_LC_STAGE ? ' is-sel' : ''}" data-vnflcstage="${s.k}"
              style="width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit">
              <div class="row vw-justify-between vw-items-center">
                <span class="vw-card-title-sm">${s.n} (${nf})</span>
                <span class="vw-card-metric-label-sub">›</span>
              </div>
              <div class="row vw-gap-xxs" style="margin:4px 0">${s.steps.map(x => lcDot(x.st, true)).join('')}</div>
              <span class="vw-card-metric-label-sub">Start date: ${s.start}</span>
              <span class="vw-card-metric-label-sub">End date: ${s.end}</span>
            </button>
          </div>`).join('')}
      </div>
      <div class="grow">
        ${card(`
          <div class="row vw-justify-between vw-items-center vw-wrap" style="margin-bottom:var(--vw-space-lg);gap:var(--vw-space-md)">
            <span class="vw-card-title">${stage.n} (${nf})</span>
            <div class="row vw-gap-md vw-wrap" style="row-gap:var(--vw-space-xs)">
              ${Object.entries(LC_STATUS).map(([k, [label]]) =>
                `<span class="legend-i">${lcDot(k, true)}<span style="margin-left:4px">${label}</span></span>`).join('')}
              <button class="nst-btn nst-btn--sm nst-btn--icon" data-vnflcrefresh="1" aria-label="Refresh">${IC_REFRESH}</button>
            </div>
          </div>
          <div class="steps">
            ${stage.steps.map((st, i) => `
              <div class="step">
                ${lcDot(st.st)}
                <div class="row vw-justify-between vw-items-start vw-wrap" style="gap:var(--vw-space-md)">
                  <div class="stack-x">
                    <span class="vw-value" style="font-weight:500">${st.n}</span>
                    <span class="vw-card-metric-label-sub" style="color:${cv(LC_STATUS[st.st][1],700)}">${LC_STATUS[st.st][0]}</span>
                  </div>
                  <span class="row vw-gap-sm vw-items-center">
                    <span class="vw-card-metric-label-sub num t-right">${st.at}<br>Modified date</span>
                    ${vnfStepHasPayload(st.st)
                      ? `<button class="nst-btn nst-btn--xs nst-btn--icon nst-btn--ghost" data-vnflceye="${stage.k}:${i}"
                           aria-label="View request/response for ${esc(st.n)}" title="View request/response">${IC_EYE}</button>`
                      : ''}
                  </span>
                </div>
              </div>`).join('')}
          </div>`)}
      </div>
    </div>
    ${vnfLcDrawer(nf, stages)}
  </div>`;
}

/* ── Virtual Resources ────────────────────────────────── */
function viewVirtual() {
  const rows = gridApply('virtual', VNFS);
  return `<div class="page">

    ${drillBar()}

    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${VNF_TYPES.map(v => {
        const segs = [{n:'Ready',c:v.ready,tone:'emerald'},{n:'In progress',c:v.prog,tone:'amber'},
                      {n:'Planned',c:v.planned,tone:'sky'},{n:'Failed',c:v.failed,tone:'red'}];
        return card(`
          <div class="row vw-justify-between vw-items-center">
            <span class="vw-card-title-sm">${v.n}</span>${donut(segs, v.c, n(v.c), 'NFs', 76)}
          </div>
          <div class="vw-grid vw-grid-cols-2 vw-gap-sm" style="margin-top:var(--vw-space-sm)">
            ${segs.map(s => `<button class="row vw-justify-between is-drill lg-row"
              ${dA({ v:'virtual', l:`${v.n} · ${s.n}` })}>
              <span class="legend-i"><span class="legend-sw" style="background:${cv(s.tone,400)}"></span>${s.n}</span>
              <span class="vw-value num">${s.c}</span></button>`).join('')}
          </div>`);
      }).join('')}
    </div>

    ${card(`
      ${gridBar(rows.length, n(IL.vnf), 'NF name, subcloud, host', FS.virtual,
        '',
        [], 'virtual')}
      ${table([{t:'Status'},{t:'NF name'},{t:'Type'},{t:'Parent RAN node'},{t:'Network service'},{t:'Subcloud'},{t:'Technology'},{t:'Host'},{t:'Source'}],
        rows.map((v, i) => [
          chip(v.st, v.chip), `<span class="vw-value">${v.nf}</span>`, `<span class="mono">${v.type}</span>`,
          v.type === 'Others'
            ? `<span style="color:${cv('gray',400)}">not RAN</span>`
            : `<button class="nst-btn nst-btn--xs nst-btn--ghost"${dA({ v:'physical', l:'RAN detail view', q:'from=Virtual' })} style="padding:0">${['BLR-SOUTH-GNB-021','DEL-CENTRAL-GNB-009'][i % 2]}</button>`,
          `<span class="mono">${v.svc}</span>`, `<span class="mono">${v.sub}</span>`, v.tech,
          v.host === '—' ? `<span style="color:${cv('gray',400)}">—</span>` : `<span class="mono">${v.host}</span>`, src(v.s)
        ]), '',
        i => [A('Lifecycle operation', { v:'vnflifecycle', l:`Lifecycle operation · ${rows[i].nf}`, q:`nf=${encodeURIComponent(rows[i].nf)}` }),
              A('View details', { v:'vnfdetails', l:`Virtual element details · ${rows[i].nf}`, q:`name=${encodeURIComponent(rows[i].nf)}` })])}`)}
  </div>`;
}

/* ── shared resource-detail UI ────────────────────────────
   Virtual element details, Cell 4G details and Cell 5G details are all the
   same shape underneath — one resource, a status, and a pile of read-only
   fields the raw prototype used to dump into a single flat grid with their
   machine-case key as the label. This block gives all three a common,
   properly-structured treatment: a real header with a dynamic status badge,
   a compact summary of the fields that actually matter, fields grouped into
   named sections, humanised labels, a technical/business type distinction,
   an honest "Not available" for missing data, and truncation-with-tooltip
   plus copy-to-clipboard for the identifiers a reader would want to grab. */

const LABEL_ACRONYMS = new Set(['id','ip','mac','tac','pci','ne','du','ru','bts','dl','ul','rf',
  'mcc','mnc','rsi','crs','ssb','gscn','ric','oss','nr','earfcn','vlan','sfp','cdu','prach','zczc']);
function humanizeLabel(key) {
  return String(key).split('/').map(seg => {
    const words = seg
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[\s_-]+/).filter(Boolean);
    return words.map(w => LABEL_ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }).join(' / ');
}
/* identifiers a reader would copy/paste rather than read as prose — these
   get the monospace treatment and a copy button; everything else stays in
   the page's normal proportional type, per "don't mono the whole page" */
const TECH_FIELD_RE = /id|mac|serial|reference|material|host|enodeb|earfcn|pci|tac|imei|imsi|cell(name|identity|number)|^ne(name|id)$/i;

function statusTone(s) {
  const t = String(s || '').toLowerCase();
  if (/fail|error|down|critical/.test(t)) return 'error';
  if (/warn|degrad|drift/.test(t)) return 'warning';
  if (/ready|active|running|verified|on-air|deployed|complete/.test(t)) return 'success';
  if (/pending|progress|build|plan/.test(t)) return 'info';
  return 'neutral';
}
const statusBadge = s => `<span class="vw-chip vw-chip--${statusTone(s)} status-badge"><span class="status-dot"></span>${esc(s || 'Unknown')}</span>`;

/* a small, consistent colour per information category — lets the reader
   spot "this is the Hardware block" or "this is Location" from the corner
   of the eye while scrolling, instead of every section reading identically */
function sectionTone(title) {
  const t = title.toLowerCase();
  if (/location|general|site/.test(t)) return 'sky';
  if (/identity|identifier/.test(t)) return 'indigo';
  if (/technology|coverage|radio|frequency|carrier|prach/.test(t)) return 'purple';
  if (/hardware|equipment/.test(t)) return 'orange';
  if (/vendor/.test(t)) return 'teal';
  if (/network|interface|power/.test(t)) return 'cyan';
  if (/configuration/.test(t)) return 'emerald';
  return 'slate';
}

const detailField = ([k, v]) => {
  const empty = v === '-' || v === '' || v == null;
  const label = humanizeLabel(k);
  const technical = TECH_FIELD_RE.test(k);
  return `<div class="meta-cell detail-field">
    <span class="vw-label">${esc(label)}</span>
    <span class="row detail-field-vrow">
      <span class="vw-value${technical && !empty ? ' mono' : ''}${empty ? ' is-empty' : ''}"${!empty ? ` title="${esc(v)}"` : ''}>${empty ? 'Not available' : esc(v)}</span>
      ${!empty && technical ? `<button class="detail-field-copy" data-copy="${esc(v)}" aria-label="Copy ${esc(label)}" title="Copy ${esc(label)}">${kIcon('Copy')}</button>` : ''}
    </span>
  </div>`;
};
const detailFieldGrid = fields => `<div class="site-meta detail-field-grid">${fields.map(detailField).join('')}</div>`;
const isFilled = ([, v]) => v !== '-' && v !== '' && v != null;

/* a section leads with what's actually there; fields the record simply
   doesn't carry sit behind a closed disclosure instead of padding the page
   out with rows of "Not available" — the count badge is the section's own
   completeness signal at a glance, and every field is still one click away,
   never dropped */
const detailSection = (title, fields) => {
  const populated = fields.filter(isFilled);
  const empty = fields.filter(f => !isFilled(f));
  return `<div class="card detail-section" style="border-top:3px solid ${cv(sectionTone(title), 400)}">
  <div class="detail-section-head">
    <span class="detail-section-accent" style="background:${cv(sectionTone(title), 500)}"></span>
    <span class="vw-card-title-sm">${esc(title)}</span>
    ${fields.length ? `<span class="detail-section-count">${populated.length}/${fields.length}</span>` : ''}
  </div>
  ${populated.length ? detailFieldGrid(populated)
    : `<div class="detail-section-empty">No configuration data available for this section yet.</div>`}
  ${empty.length ? `<details class="detail-more">
    <summary>+${empty.length} more field${empty.length === 1 ? '' : 's'} · not configured</summary>
    ${detailFieldGrid(empty)}
  </details>` : ''}
</div>`;
};
/* flows the section cards into a responsive 2-up column set instead of one
   full-width card per section — most sections here are short enough that a
   single column just leaves the other half of a wide page empty */
const renderSectionedGrid = sections => {
  const cards = sections.filter(s => s.fields.length).map(sec => detailSection(sec.title, sec.fields)).join('');
  return `<div class="detail-sections-grid">${cards}</div>`;
};

function completenessOf(fields) {
  const total = fields.length;
  const filled = fields.filter(isFilled).length;
  return { total, filled, pct: total ? Math.round(filled / total * 100) : 0 };
}

/* fills each named section from the field list by key (case-insensitive);
   a field the schema doesn't name still surfaces under "Other" instead of
   silently vanishing if the data model ever grows past this list */
function groupFieldsBySchema(fields, schema) {
  const map = new Map(fields.map(([k, v]) => [k.toLowerCase(), [k, v]]));
  const used = new Set();
  const sections = schema.map(sec => ({
    title: sec.title,
    fields: sec.keys.map(k => { const hit = map.get(k.toLowerCase()); if (hit) used.add(hit[0].toLowerCase()); return hit; }).filter(Boolean)
  }));
  const leftover = fields.filter(([k]) => !used.has(k.toLowerCase()));
  if (leftover.length) sections.push({ title: 'Other', fields: leftover });
  return sections;
}
const pickFields = (fields, keys) => {
  const map = new Map(fields.map(([k, v]) => [k.toLowerCase(), [k, v]]));
  return keys.map(k => map.get(k.toLowerCase())).filter(Boolean);
};

/* one header for every resource-detail screen: the resource's own name and
   kind, a dynamic status badge, and a compact meta row — replaces each
   screen's own one-off "Status / Name / ..." row. Going back up the chain
   is the topbar breadcrumb's job alone (Resources > Virtual Resources >
   View > ...) — it already links every prefix that names a real screen, so
   a second, redundant "Back to X" button here would just be two controls
   doing the same thing. */
function resourceHead({ kind, name, status, meta, completeness }) {
  const bar = completeness ? `<div class="resdetail-completeness">
      <div class="row vw-justify-between"><span class="vw-label">Configuration completeness</span>
        <span class="vw-value" style="font-size:0.8125rem">${completeness.filled} of ${completeness.total} fields · ${completeness.pct}%</span></div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${completeness.pct}%;background:${
        cv(completeness.pct >= 70 ? 'emerald' : completeness.pct >= 40 ? 'amber' : 'red', 400)}"></div></div>
    </div>` : '';
  return `<div class="card resdetail-head" style="border-left:3px solid ${cv('sky', 400)}">
      <div class="row vw-justify-between" style="align-items:flex-start;gap:var(--vw-space-lg);flex-wrap:wrap">
        <div>
          <span class="resdetail-kind">${esc(kind)}</span>
          <h1 class="resdetail-name">${esc(name)}</h1>
        </div>
        ${statusBadge(status)}
      </div>
      <div class="resdetail-meta-row">
        ${meta.map(([k, v]) => `<div class="meta-cell"><span class="vw-label">${esc(k)}</span><span class="vw-value">${esc(v)}</span></div>`).join('')}
      </div>
      ${bar}
    </div>`;
}
/* the handful of fields worth seeing before scrolling to the grouped detail
   below — never invented, always a subset of the screen's own field list */
const SUMMARY_PALETTE = ['sky', 'purple', 'teal', 'orange', 'indigo', 'cyan'];
const resourceSummary = fields => fields.length ? `<div class="resdetail-summary">
    ${fields.map(([k, v], i) => {
      const empty = v === '-' || v === '' || v == null;
      return `<div class="resdetail-summary-item" style="border-top:2px solid ${cv(SUMMARY_PALETTE[i % SUMMARY_PALETTE.length], 400)}">
        <span class="vw-label">${esc(humanizeLabel(k))}</span><span class="vw-value${empty ? ' is-empty' : ''}">${empty ? 'Not available' : esc(v)}</span></div>`;
    }).join('')}
  </div>` : '';

/* ── Virtual Element Details (View) ─────────────────────── */
let VNF_DETAIL_ID = null;
let VNF_DETAIL_TAB = 'vdu4g';

function viewVnfDetails() {
  const nf = VNF_DETAIL_ID || 'NTSON3435004';
  const tab = VNF_DETAIL_TAB || 'vdu4g';

  const tabs = [
    { k: 'vdu4g', n: 'vDU-4G' },
    { k: 'cell4g', n: 'Cell-4G' },
    { k: 'vdu5g', n: 'vDU-5G' },
    { k: 'cell5g', n: 'Cell-5G' }
  ];

  const vdu4gFields = [
    ['HostSiteId', 'BGLK-277'],
    ['HostSiteName', nf],
    ['Latitude', '45.808083'],
    ['Longitude', '-74.039527'],

    ['PlanId', '2024'],
    ['ReferenceId', '360298'],
    ['WorkType', '-'],
    ['Technology', 'LTE'],

    ['Region', 'Eastern'],
    ['Province', 'QC'],
    ['CoverageType', 'Macro-O'],
    ['Strategy', 'NEE-LTE-VU-ORAN-MACRO-23A...'],

    ['Status', 'Ready For Configuration'],
    ['Vendor', 'Samsung ORAN'],
    ['Toycell', 'N'],
    ['BuildStatus', '-'],

    ['HardwareConfig', 'HPE ProLiant Standard'],
    ['BtsModel', 'HPE-DL110 Gen11'],
    ['MaterialId', '2419280'],
    ['VendorName', 'Samsung ORAN'],

    ['Interface1Type', 'FIBER'],
    ['Interface1Speed', '25Gbps'],
    ['Interface2Type', '-'],
    ['Interface2Speed', '-'],

    ['MaterialDescription', 'HPE DL110-Gen11 Multi-por...'],
    ['NeName', 'NTSON3435016'],
    ['DuElementId/UserLabel', 'O-BGLK-277-03'],
    ['DuElementAlias', 'NTSON3435016'],

    ['SerialNumber', '-'],
    ['MacAddress1', '-'],
    ['MacAddress2', '-'],
    ['PassCode', '-']
  ];

  const vdu5gFields = [
    ['HostSiteId', 'BGLK-277'],
    ['HostSiteName', nf],
    ['Latitude', '43.77725'],
    ['Longitude', '-79.25134'],

    ['PlanId', '-'],
    ['ReferenceId', '-'],
    ['WorkType', 'Build'],
    ['Technology', '5G NR'],

    ['Region', 'Central'],
    ['Province', 'ON'],
    ['CoverageType', 'Micro-CO'],
    ['Strategy', '-'],

    ['Status', 'Build'],
    ['Vendor', 'Samsung ORAN'],
    ['Toycell', 'N'],
    ['BuildStatus', 'CIQ_Ready'],

    ['HardwareConfig', 'vDU_LTE_NR'],
    ['BtsModel', 'HPE1004'],
    ['MaterialId', '100024'],
    ['VendorName', 'HPE'],

    ['Interface1Type', '-'],
    ['Interface1Speed', '-'],
    ['Interface2Type', '-'],
    ['Interface2Speed', '-'],

    ['MaterialDescription', 'vDU Server'],
    ['NeName', 'OTSLB2000002002'],
    ['DuElementId', 'O-LB0002-BTS-02'],
    ['DuElementAlias', '-'],

    ['SerialNumber', '-'],
    ['MacAddress1', '-'],
    ['MacAddress2', '-'],
    ['PassCode', '-']
  ];

  const cell4gRows = [
    ['BGLK-277', nf, '26114816', 'LTSQC0102011-000-2100-1-000-OMACC', '1'],
    ['BGLK-277', nf, '26114816', 'LTSQC0102011-000-2100-1-000-OMACC', '1'],
    ['BGLK-277', nf, '26114816', 'LTSQC0102011-000-2100-1-000-OMACC', '1']
  ];

  const cell5gRows = [
    ['BGLK-277', 'NTSON34350044', '4096', 'NTSLB1436091-OTSLB100275001-OMACC', '0'],
    ['BGLK-277', 'NTSON34350044', '4096', 'NTSLB1436091-OTSLB100275001-OMACC', '0'],
    ['BGLK-277', nf, '4096', 'NTSLB1436091-00-04096-00600-01-001-OMACC', '0']
  ];

  /* the raw fields carry a machine-case key that already tells us which
     group they belong to — analysing the actual vdu4g/vdu5g field set (both
     share the same 32 keys) gives this grouping, not an arbitrary guess */
  const VDU_SECTIONS = [
    { title: 'Identity', keys: ['HostSiteId', 'HostSiteName', 'ReferenceId', 'NeName', 'DuElementId/UserLabel', 'DuElementId', 'DuElementAlias'] },
    { title: 'Location', keys: ['Latitude', 'Longitude', 'Region', 'Province'] },
    { title: 'Technology & Coverage', keys: ['Technology', 'CoverageType', 'WorkType', 'Strategy', 'PlanId', 'Toycell'] },
    { title: 'Hardware', keys: ['HardwareConfig', 'BtsModel', 'MaterialId', 'MaterialDescription', 'SerialNumber'] },
    { title: 'Vendor', keys: ['Vendor', 'VendorName'] },
    { title: 'Network & Interface', keys: ['Interface1Type', 'Interface1Speed', 'Interface2Type', 'Interface2Speed', 'MacAddress1', 'MacAddress2', 'PassCode'] },
    { title: 'Configuration', keys: ['Status', 'BuildStatus'] }
  ];
  const VDU_SUMMARY_KEYS = ['Technology', 'Vendor', 'Region', 'Province', 'CoverageType', 'Status'];
  const renderVdu = fields => `${resourceSummary(pickFields(fields, VDU_SUMMARY_KEYS))}
    ${renderSectionedGrid(groupFieldsBySchema(fields, VDU_SECTIONS))}`;

  const renderCellTable = (rows, key) => card(`
    ${gridBar(rows.length, rows.length, '', FS[key] || [], '', [], key)}
    ${table([{t:'Host site'},{t:'Coverage site'},{t:'Cell identity'},{t:'Cell name'},{t:'Cell number'}],
      rows.map(r => [
        `<span class="vw-value">${r[0]}</span>`,
        `<span class="vw-value">${r[1]}</span>`,
        `<span class="mono">${r[2]}</span>`,
        `<span class="mono">${r[3]}</span>`,
        `<span class="num">${r[4]}</span>`
      ]), '',
      /* the drill label names the specific cell, not just the screen kind —
         the crumb chain already ends in "Cell 4G/5G details", so echoing
         that same text as the label duplicated the last breadcrumb segment */
      i => [A('View details', { v: key === 'cell4g' ? 'cell4gdetails' : 'cell5gdetails',
        l: `${key === 'cell4g' ? 'Cell 4G' : 'Cell 5G'} details · ${rows[i][3]}`, q: `cell=${encodeURIComponent(rows[i][3])}` })])}
  `);

  /* the header describes the VNF as a whole; vDU-4G and vDU-5G are its two
     separate deployment tracks and can genuinely carry different statuses
     (e.g. 4G ready while 5G is still building), so the badge follows
     whichever of those two the reader is actually looking at — the cell
     tabs are a list of records, not a single status, so they keep the
     vDU-4G status as the resource's baseline */
  const statusFields = tab === 'vdu5g' ? vdu5gFields : vdu4gFields;
  const status = (pickFields(statusFields, ['Status'])[0] || [])[1];

  return `<div class="page" style="display:flex;flex-direction:column;gap:var(--vw-space-md)">
    ${drillBar()}

    ${resourceHead({
      kind: 'Virtual Resource · VDU', name: nf, status,
      meta: [['Site type', 'VDU'], ['Created', '13-Feb-2024'], ['Last modified', '22-Feb-2026']],
      completeness: completenessOf(statusFields)
    })}

    <div class="tabbar tabbar--detail">
      ${tabs.map(t => `<button class="tab${tab === t.k ? ' is-on' : ''}" data-vnfdetailtab="${t.k}">${t.n}</button>`).join('')}
    </div>

    ${tab === 'vdu4g' ? renderVdu(vdu4gFields)
      : tab === 'cell4g' ? renderCellTable(cell4gRows, 'cell4g')
      : tab === 'vdu5g' ? renderVdu(vdu5gFields)
      : renderCellTable(cell5gRows, 'cell5g')}
  </div>`;
}

/* ── Cell 4G & 5G Details Views ───────────────────────── */
let CELL_4G_NAME = null;
let CELL_5G_NAME = null;

function viewCell4gDetails() {
  const cellName = CELL_4G_NAME || 'LTSQC0102011-000-2100-1-000-OMACC';
  const sections = [
    {
      title: 'General & Site Information',
      fields: [
        ['hostSiteID', 'BGLK-277'],
        ['coverageSiteId', 'NTSON3435004'],
        ['neId', '1000829004'],
        ['neName', 'NTSON1000829004'],
        ['neType', 'Macro'],
        ['latitude', '45.808083'],
        ['longitude', '-74.039527'],
        ['height', '44']
      ]
    },
    {
      title: 'Cell & eNodeB Identifiers',
      fields: [
        ['enodebId', '102011'],
        ['enodebName', 'LTSQC0102011'],
        ['cellNumber', '1'],
        ['cellName', cellName],
        ['sector', '1137'],
        ['pci', '0'],
        ['cduConfig', '-']
      ]
    },
    {
      title: 'Radio Frequency & Carrier Parameters',
      fields: [
        ['bandName', '4'],
        ['cellBandCarrier', '2100mhz_band4'],
        ['earfcnDl', '2325'],
        ['earfcnUl', '20325'],
        ['txrxMode', '4T4R'],
        ['dlOnly', 'N'],
        ['numberOfRfBranchesUL', 'n4-rx-antenna-count'],
        ['bandwidth', '-'],
        ['bandwidth2', '-'],
        ['crs', 'n4']
      ]
    },
    {
      title: 'Power & Network Configuration',
      fields: [
        ['mcc1', '302'],
        ['mnc1', '220'],
        ['mcc2', '302'],
        ['mnc2', '610'],
        ['mcc3', '-'],
        ['mnc3', '-'],
        ['tac', '2D87'],
        ['MaxTransmitPower(0.1)PerPort', '-'],
        ['referenceSignalPower', '152'],
        ['powerBoost3dB', 'N'],
        ['PrachConfig(ZCZC)', '11'],
        ['cellRadius', '12200'],
        ['preambleFormat', '1'],
        ['rsi', '0']
      ]
    },
    {
      title: 'Hardware & Vendor Equipment',
      fields: [
        ['hardwareConfig', 'Juniper CHR'],
        ['ruModel', 'ORU6229'],
        ['materialId', '2416683'],
        ['vendorName', 'Samsung ORAN']
      ]
    }
  ];

  /* this data model has no lifecycle-status field of its own (a carrier
     record inherits readiness from its parent vDU rather than tracking
     one) — the badge stays a stable "Ready" rather than fabricating a
     derived status the schema doesn't actually carry; band/site context
     goes into the summary instead, pulled from real fields below */
  const flatFields = sections.flatMap(s => s.fields);

  return `<div class="page" style="display:flex;flex-direction:column;gap:var(--vw-space-md)">
    ${drillBar()}

    ${resourceHead({
      kind: 'LTE cell · 4G', name: cellName, status: 'Ready',
      meta: [['Sector', pickFields(flatFields, ['sector'])[0]?.[1] ?? 'Not available'],
        ['Band', pickFields(flatFields, ['bandName'])[0]?.[1] ?? 'Not available']],
      completeness: completenessOf(flatFields)
    })}

    ${resourceSummary(pickFields(flatFields, ['coverageSiteId', 'neType', 'cellBandCarrier', 'txrxMode']))}

    ${renderSectionedGrid(sections)}
  </div>`;
}

function viewCell5gDetails() {
  const cellName = CELL_5G_NAME || 'NTSLB1436091-OTSLB100275001-OMACC';
  const sections = [
    {
      title: 'General & Site Information',
      fields: [
        ['hostSite', 'BGLK-277'],
        ['coverageSite', 'NTSON34350044'],
        ['neId', '100275001'],
        ['neName', 'OTSLB100275001'],
        ['latitude', '43.77725'],
        ['longitude', '-79.25134']
      ]
    },
    {
      title: '5G NR Cell & DU Identifiers',
      fields: [
        ['duld', '1436091'],
        ['cellIdentity', '4096'],
        ['cellNumber', '0'],
        ['cellName', cellName]
      ]
    },
    {
      title: '5G Radio Frequency & Carrier Parameters',
      fields: [
        ['nrPci', '191'],
        ['nrEarfcnDl', '126400'],
        ['nrEarfcnUl', '135600'],
        ['nrBandName', '71'],
        ['nrBandwidth', '10'],
        ['numberOfRfBranchesDL', 'dl-antenna-count-4tx'],
        ['numberOfRfBranchesUL', 'ul-antenna-count-4rx'],
        ['numberOfRxPathsPerRU', '4']
      ]
    },
    {
      title: 'PRACH & Network Configuration',
      fields: [
        ['prachRsi', '191'],
        ['prachZczc', '12'],
        ['prachConfigurationIndex', '18'],
        ['nrCellRadius', '10000'],
        ['prachSsbPerRo', 'ssb-per-ro-one-choice'],
        ['numberOfTxSsb', '1'],
        ['dlMaxTxPower', '430'],
        ['ssbBlock', '1580'],
        ['Period', '20ms'],
        ['gscnOffset', '0'],
        ['coreset0Index', '8'],
        ['tac1', '0091B7'],
        ['tac2', '-'],
        ['tac3', '-']
      ]
    },
    {
      title: 'Hardware & Equipment Configuration',
      fields: [
        ['HardwareConfig', '-'],
        ['ruModel', '-'],
        ['materialId', '-'],
        ['vendorName', '-'],
        ['materialDescription', '-'],
        ['ruName', 'LB0009-RU-0001'],
        ['ruld', '1'],
        ['druElementId', '-'],
        ['druElementAlias', '-'],
        ['retModel', '-'],
        ['antennaVendor', '-'],
        ['antennaModel', '-'],
        ['electricalTilt', '-'],
        ['mechanicalTilt', '-'],
        ['Azimuth', '-'],
        ['retName', '-']
      ]
    }
  ];

  /* same reasoning as Cell 4G details: no per-cell status field in this
     data model, so the badge stays a stable "Ready" and band/site context
     moves into the summary, pulled from real fields */
  const flatFields = sections.flatMap(s => s.fields);

  return `<div class="page" style="display:flex;flex-direction:column;gap:var(--vw-space-md)">
    ${drillBar()}

    ${resourceHead({
      kind: '5G NR cell', name: cellName, status: 'Ready',
      meta: [['NR band', pickFields(flatFields, ['nrBandName'])[0]?.[1] ?? 'Not available'],
        ['NR PCI', pickFields(flatFields, ['nrPci'])[0]?.[1] ?? 'Not available']],
      completeness: completenessOf(flatFields)
    })}

    ${resourceSummary(pickFields(flatFields, ['coverageSite', 'nrBandwidth', 'cellIdentity', 'numberOfRxPathsPerRU']))}

    ${renderSectionedGrid(sections)}
  </div>`;
}

/* ── Links ────────────────────────────────────────────── */
let LINK_NE_FILTER = null;
function viewLinks() {
  const t = TAB.link, meta = LINK_TABS.find(x => x.k === t);
  const rows = gridApply('links', (LINKS[t] || []).filter(r => !LINK_NE_FILTER || r.sne === LINK_NE_FILTER || r.dne === LINK_NE_FILTER));
  const lst = { ok:['Confirmed','success'], new:['New this cycle','info'], gone:['No longer seen','error'] };
  return `<div class="page">

    ${drillBar()}

    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${LINK_TABS.map(x => {
        /* arriving scoped to one element's links must not show the whole
           estate's count on the tile — that reads as "all links", not "its links" */
        const c = LINK_NE_FILTER
          ? (LINKS[x.k] || []).filter(r => r.sne === LINK_NE_FILTER || r.dne === LINK_NE_FILTER).length
          : x.c;
        return `
        <button class="vw-card-section vw-card--clickable vw-card--accent stack-x" data-tab="link:${x.k}"
          style="padding-top:calc(var(--vw-space-lg) + 3px);text-align:left;font:inherit;color:inherit;gap:2px">
          <div class="vw-card-accent" style="background:${cv('cyan',400)}"></div>
          <span class="vw-card-metric-label">${x.n}</span>
          <span class="vw-card-metric-lg num">${n(c)}</span>
          <span class="vw-card-metric-label-sub">${LINK_NE_FILTER ? 'links for this element' : 'discovered links'}</span>
        </button>`;
      }).join('')}
    </div>

    ${card(`
      ${tabs(LINK_TABS, t, 'link')}
      ${gridBar(rows.length, n(meta.c), 'Source IP, source NE, destination NE', FS.links,
        `${chip('44 new this cycle','info')}${chip('18 no longer seen','error')}`,
        [], 'links')}
      ${table([{t:'State'},{t:'Source NE'},{t:'Source IP'},{t:t==='lldp'?'Source interface':'Local'},
               {t:'Destination NE'},{t:t==='lldp'?'Destination interface':'Session'},{t:'Link name'},{t:'Verified'}],
        rows.map(r => [
          chip(lst[r.st][0], lst[r.st][1]),
          `<span class="vw-value">${r.sne}</span>`, `<span class="mono">${r.sip}</span>`, `<span class="mono">${r.sif}</span>`,
          `<span class="vw-value">${r.dne}</span>`, `<span class="mono">${r.dif}</span>`,
          r.name === '—' ? `<span style="color:${cv('gray',400)}">unnamed</span>` : r.name, ver(r.v)
        ]), '',
        i => [A('Open source element', { v:'resource', l:rows[i].sne }),
              A('Open destination element', { v:'resource', l:rows[i].dne })])}
      <div class="vw-card-footer-divider row vw-justify-end vw-wrap">
        <div class="row">
          <button class="nst-btn nst-btn--xs"${dA({ v:'reconcile', l:'Links no longer seen', q:'ne=Only in inventory' })}>Open exceptions</button>
          <button class="nst-btn nst-btn--xs"${dA({ v:'physical', l:'Elements carrying these links', q:'tab=router' })}>Open elements</button>
        </div>
      </div>`)}
  </div>`;
}

/* ── Services ─────────────────────────────────────────── */
function viewServices() {
  const t = TAB.svc, rows = gridApply('services', SERVICES[t] || []), meta = SVC_TABS.find(x => x.k === t);
  return `<div class="page">

    ${drillBar()}

    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${kpi('L3VPN', '1,815', '1,684 up · 131 down', 'emerald')}
      ${kpi('L2VPN', '642', '598 up · 44 down', 'cyan')}
      ${kpi('Service endpoints', '4,912', 'attachment interfaces discovered', 'sky')}
      ${kpi('Not in inventory', '146', 'found on device, no service record', 'red')}
    </div>

    ${card(`
      ${tabs(SVC_TABS, t, 'svc')}
      ${gridBar(rows.length, n(meta.c), 'Service name, VRF, ERP number', FS.services, '',
        [], 'services')}
      ${table([{t:'Status'},{t:'Name'},{t:'Source IP'},{t:'VRF — RD'},{t:'VRF — RT'},{t:'ERP number'},{t:'Source interface'},{t:'Verified'}],
        rows.map(s => [
          chip(s.st, s.chip), `<span class="vw-value">${s.name}</span>`, `<span class="mono">${s.ip}</span>`,
          `<span class="mono">${s.rd}</span>`, `<span class="mono">${s.rt}</span>`, s.erp,
          `<span class="mono">${s.ifc}</span>`, ver(s.v)
        ]))}`)}
  </div>`;
}

/* ── Inactive inventory ───────────────────────────────── */
function viewInactive() {
  const t = INACT_CLS, meta = PHY_TABS.find(x => x.k === t);
  const rows = decommRows(t), total = rows.length;
  const zomb = rows.filter(r => r.zombie).length;
  return `<div class="page">

    ${drillBar()}

    ${statStrip([
      { k:'Decommissioned NE', v:n(STOCK_OF.decomm.c), s:'removed from active estate', t:'slate' },
      { k:'Still answering discovery', v:String(DECOMM_ZOMBIES), s:'written off, yet on network', t:'red' },
      { k:'Retired links', v:n(1188), s:'adjacency no longer seen', t:'amber' },
      { k:'Retired services', v:n(264), s:'no longer provisioned', t:'purple' },
      { k:'Oldest record', v:DECOMM_OLDEST, s:'archived record', t:'cyan' },
      { k:'Recovered to store', v:n(38), s:'restored in last 12 months', t:'emerald' }
    ])}

    ${card(`
      <div class="tabbar">${PHY_TABS.map(x => `
        <button class="tab${x.k === t ? ' is-on' : ''}" data-inactcls="${x.k}"
          title="${n(stockCount(x.k, 'decomm'))} decommissioned ${x.n.toLowerCase()} records">
          ${x.n}</button>`).join('')}
      </div>

      ${gridBar(total, n(total), 'Name, serial number, workorder, OEM', FS.inactive,
        chip('Archive · read-only', 'neutral'), [])}
      ${table([{t:'Name'},{t:'Model / OEM'},{t:'Serial number'},{t:'Last IP / location'},
               {t:'Decommissioned'},{t:'Reason'},{t:'Authorised by'},{t:'Discovery'}],
        rows.map(r => [
          `<span class="vw-value">${r.name}</span> <span class="ro-lock" title="Read-only">&#128274;</span>`,
          `<span class="mono">${r.model}</span><span class="cell-sub">${r.oem}</span>`,
          `<span class="mono">${r.sn}</span>`,
          `<span class="mono">${r.ip}</span><span class="cell-sub mono">${r.loc}</span>`,
          `<span class="num">${r.on}</span><span class="cell-sub mono">${r.wo}</span>`,
          `<span class="vw-card-description">${r.why}</span>`, r.by,
          r.zombie ? chip('Still answering', 'error') : chip('Silent', 'neutral')
        ]), '',
        i => [
              ...(rows[i].zombie ? [A('Open reconciliation exception',
                  { v:'reconcile', l:`Still answering · ${rows[i].name}`, q:'ne=Only on network' })] : [])
              ])}`)}
  </div>`;
}

/* ── Reports ──────────────────────────────────────────── */
function viewReports() {
  const rows = gridApply('reports', REPORTS);
  return `<div class="page">

    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${kpi('Reports', n(IL.reports), '5 scheduled · 2 on demand', 'sky', { v:'reports', l:'All reports' })}
      ${kpi('Discovery reports', '9', 'targets, drop-out and collector health', 'emerald',
        { v:'targets', l:'Discovery source data', q:'tgt=All' })}
      ${kpi('Inventory reports', '8', 'elements, links, services and sites', 'cyan',
        { v:'physical', l:'Inventory source data' })}
      ${kpi('Reconciliation reports', '5', 'exceptions and attribute drift', 'amber',
        { v:'reconcile', l:'Reconciliation source data', q:'ne=Open' })}
    </div>

    ${card(`
      ${gridBar(rows.length, IL.reports, 'Report name, type, creator', FS.reports,
        `${chip('1 failed','error')}${chip('1 pending','warning')}`,
        [], 'reports')}
      ${table([{t:'Status'},{t:'Report name'},{t:'Type'},{t:'Generated'},{t:'Frequency'},{t:'Creator'},{t:'Created on'},{t:'Size'}],
        rows.map(r => [
          chip(r.st, r.chip), `<span class="vw-value">${r.name}</span>`, r.type, r.gen, r.freq, r.by,
          `<span class="num">${r.on}</span>`, `<span class="num">${r.size}</span>`
        ]), '',
        () => [])}`)}
  </div>`;
}

