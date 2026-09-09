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
        ${dA({ v:'targets', l:`Scan targets in ${c.n}`, q:'tgt=exceptions' })}>Scan targets</button>
    </div>
  </div>`;
}

const insHead = (t, d) =>
  `<div class="ins-head"><div class="vw-card-title-sm">${t}</div><div class="vw-card-description">${d}</div></div>`;

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
    ${pageBar(`<span class="vw-card-description grow">${pmeta().note}</span>
      <div class="seg">${PERIODS.map(p => `<button class="${PERIOD===p.k?'is-on':''}" data-period="${p.k}">${p.n}</button>`).join('')}</div>`)}

    <div class="vw-grid vw-grid-cols-4 vw-gap-md">
      ${kpi('Targets polled', n(DL.targets), `${n(DL.runFull)} clean · ${n(DL.runPartial)} partial · ${n(DL.runFail)} failed`, 'sky',
        { v:'targets', l:'All targets polled this cycle', q:'tgt=All' })}
      ${kpi('Devices discovered', n(DL.identified), `Router ${n(DL.discRouter)} · Switch ${n(DL.discSwitch)}`, 'emerald',
        { v:'targets', l:'Targets that answered discovery', q:'tgt=answered' })}
      ${kpi('Inventory records', n(DL.master), `${n(DL.matched)} verified against the network`, 'cyan',
        { v:'physical', l:'All inventory records' })}
      ${kpi('Open exceptions', n(DL.open), `${n(DL.rogue)} rogue · ${n(DL.missing)} missing · ${n(DL.drifted)} drifted`, 'red',
        { v:'reconcile', l:'Open exceptions', q:'ne=Open' })}
    </div>

    <div class="vw-grid vw-grid-cols-4 vw-gap-md ins-row">

      ${card(`${insHead('Reconciliation outcome', pmeta().recNote)}
        <div class="ins-viz">${donut(outSegs, DL.union, n(DL.exact), 'agree', 124)}</div>
        <div class="ins-legend lg2">${legendRows(outSegs)}</div>`, 'ins-card')}

      ${card(`${insHead('Discovery coverage', 'Share of the inventory a collector can actually reach')}
        <div class="ins-viz ins-viz-c">
          <span class="hero num">${(DL.discoverable / DL.master * 100).toFixed(1)}<i>%</i></span>
          <span class="hero-sub">${n(DL.discoverable)} of ${n(DL.master)} records</span>
          <div class="meter ins-meter">
            <span style="width:${(DL.discoverable / DL.master * 100).toFixed(2)}%;background:${cv('emerald',400)}"></span>
            <span style="width:${(DL.noCollector / DL.master * 100).toFixed(2)}%;background:${cv('red',400)}"></span>
          </div>
        </div>
        <div class="ins-legend">${legendRows(covSegs)}</div>`, 'ins-card')}

      ${card(`${insHead('Run outcome', pmeta().runNote)}
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

      ${card(`${insHead('What moved in this window', 'Regressions against recoveries. A snapshot cannot show this.')}
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
          ${headSm('Exceptions by circle', 'Select a circle to see its breakdown.')}
          ${chip(`${n(DL.open - DL.unclaimed)} placed · ${n(DL.unclaimed)} unplaceable`, 'neutral')}
        </div>
        <div class="carto-row">
          ${cartogram()}
          <div class="grow" id="circledetail">${circleDetail()}</div>
        </div>`, 'grow')}

    </div>

    ${card(`
      <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
        ${headSm('The six collector families', 'What each one asks the device, and what it writes to inventory.')}
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
        ${headSm('Why a target drops out', 'Every target that did not reach a written record, and the stage it stopped at.')}
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
        }).join('')}</div>
         ${running ? chip(`${n(running)} running`,'info') : ''}${errors ? chip(`${n(errors)} with errors`,'warning') : ''}`,
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

let TGT_FILTER = 'All';
const TGT_TESTS = {
  All:        () => true,
  answered:   t => t.out !== 'Missing',
  clean:      t => t.ch.every(c => c === 'ok' || c === 'na'),
  partial:    t => t.ch.includes('fail') && t.ch.includes('ok'),
  failed:     t => t.ch.includes('fail'),
  new:        t => !!t.isNew,
  exceptions: t => t.out !== 'Exact match',
  stale:      t => t.fresh > 168,
  fresh24:    t => t.fresh <= 24,
  fresh7:     t => t.fresh > 24   && t.fresh <= 168,
  age730:     t => t.fresh > 168  && t.fresh <= 720,
  age3090:    t => t.fresh > 720  && t.fresh <= 2160,
  age90:      t => t.fresh > 2160
};
const TGT_LABEL = { All:'All targets', answered:'Targets that answered', clean:'Runs where every step passed',
  partial:'Runs that partly failed', failed:'Runs with a failed collector', new: 'Seen for the first time this cycle',
  exceptions:'Targets with an exception', stale:'Past the freshness SLA', fresh24:'Verified in the last 24 hours' };
const TGT_REASON = { unreach: 'Host unreachable', timeout: 'SNMP timeout', auth: 'Authentication failed',
  adapter: 'No adapter for model', parse: 'Response parse error', dupip: 'Duplicate management IP' };
const TGT_REASON_CHIP = { unreach: 'purple', timeout: 'cyan', auth: 'pink', adapter: 'warning', parse: 'info', dupip: 'neutral' };

let TGT_REASON_FILTER = null;
function viewTargets() {
  const test = TGT_TESTS[TGT_FILTER] || TGT_TESTS.All;
  const rows = gridApply('targets', TARGETS.filter(test).filter(t => !TGT_REASON_FILTER || t.reason === TGT_REASON_FILTER));
  const segs = [['All','All'],['exceptions','Exceptions'],['failed','Failed'],['stale','Stale']];
  return `<div class="page">
    ${pageBar(`<div class="seg">${segs.map(([k,l]) => `<button class="${TGT_FILTER===k?'is-on':''}" data-tgt-filter="${k}">${l}</button>`).join('')}</div>`)}
    ${drillBar()}
    ${card(`
      ${gridBar(rows.length, n(DL.targets), 'Gateway IP, hostname, serial', FS.targets,
        `${chip(`${n(DL.runFail)} failed`,'error')}${chip(`${n(DL.runPartial)} partial`,'warning')}
         <button class="nst-btn nst-btn--filled nst-btn--sm js-ack">Run now</button>`, [], 'targets')}
      ${table(
        [{ t: 'Outcome' }, { t: 'Gateway IP' }, { t: 'Hostname · circle · job' }, { t: 'OEM · model' },
         { t: 'Last run' }, { t: 'Age' }, { t: 'Failure reason' }, { t: 'Collector chain' }],
        rows.map(t => [
          chip(t.out, t.chip),
          `<span class="mono">${t.ip}</span>`,
          `${t.host === '—' ? `<span style="color:${cv('gray',400)}">no sysName</span>` : `<span class="vw-value">${t.host}</span>`}
           <br><span class="vw-card-metric-label-sub">${t.circle} · <span class="mono">${t.job}</span></span>`,
          `<span class="vw-value">${t.oem}</span> <span class="vw-card-metric-label-sub mono">${t.model}</span>`,
          `<span class="num">${t.sync}</span>`,
          freshChip(t.fresh),
          t.reason ? chip(TGT_REASON[t.reason], TGT_REASON_CHIP[t.reason]) : `<span style="color:${cv('gray',300)}">—</span>`,
          chainOf(t.ch)
        ]), '',
        i => [A('Open run transcript', { v:'target', l:`Transcript · ${rows[i].host}` }),
              A('View in reconciliation', { v:'reconcile', l:`Reconciliation · ${rows[i].host}`, q:'ne=All' }),
              CP('Copy gateway IP', rows[i].ip)])}
      <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
        <div class="legend">
          <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',100)};border:1px solid ${cv('emerald',400)}"></span>passed</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('red',100)};border:1px solid ${cv('red',400)}"></span>failed</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('amber',100)};border:1px solid ${cv('amber',400)}"></span>skipped</span>
          <span class="legend-i"><span class="legend-sw" style="background:${cv('slate',100)};border:1px solid ${cv('slate',300)}"></span>not applicable</span>
        </div>
        <span class="vw-card-description">Chain order: Device · Hardware · LLDP · OSPF · BGP · Service</span>
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

function txBody() {
  const steps = txSteps();
  const maxMs = Math.max(...steps.map(s => s.ms), 1);
  const passed = steps.filter(s => s.state === 'ok').length;
  const bytes = steps.reduce((a, s) => a + s.bytes, 0);
  const ms = steps.reduce((a, s) => a + s.ms, 0);
  const dot = st => st === 'ok'
    ? `<span class="step-dot" style="background:${cv('emerald',100)};color:${cv('emerald',700)}">✓</span>`
    : st === 'fail'
      ? `<span class="step-dot" style="background:${cv('red',100)};color:${cv('red',700)}">!</span>`
      : `<span class="step-dot" style="background:${cv('amber',100)};color:${cv('amber',700)}">–</span>`;

  return `
    <div class="row vw-justify-between vw-items-center vw-wrap" style="gap:var(--vw-space-md);margin-bottom:var(--vw-space-lg)">
      <div class="row vw-gap-xl">
        ${[['Run', `#${TXRUN}`], ['Steps', `${passed} of 7 passed`], ['Elapsed', `${(ms/1000).toFixed(2)} s`],
           ['Payload', `${(bytes/1024).toFixed(1)} KB`], ['Collector', TRANSCRIPT.collector], ['Credential', TRANSCRIPT.cred]]
          .map(([k, v]) => `<div class="stack-x"><span class="vw-label">${k}</span><span class="vw-value num mono">${v}</span></div>`).join('')}
      </div>
      <div class="row vw-gap-xxs" style="align-items:flex-end;height:38px;min-width:220px">
        ${steps.map(s => `<div class="stack-x grow" style="gap:2px;align-items:center">
          <div style="width:100%;height:${Math.max(3, s.ms / maxMs * 28).toFixed(0)}px;border-radius:2px 2px 0 0;background:${cv(s.state === 'ok' ? 'sky' : s.state === 'fail' ? 'red' : 'amber', 300)}"></div>
          <span class="vw-card-metric-label-sub" style="font-size:.5rem">${s.n.slice(0, 3)}</span></div>`).join('')}
      </div>
    </div>
    <div class="steps">
      ${steps.map(s => `
        <div class="step">
          ${dot(s.state)}
          <div class="stack-s">
            <div class="tx-row">
              <div class="tx-meta">
                <div class="row" style="gap:var(--vw-space-xs)">
                  <span class="vw-card-activity-label">${s.n}</span>${chip(s.proto, 'neutral')}
                </div>
                <span class="vw-card-metric-label-sub num">${s.ms ? `${s.ms} ms · ${(s.bytes/1024).toFixed(1)} KB` : 'not attempted'}</span>
                ${s.reason ? `<div class="stack-x" style="margin-top:var(--vw-space-xs)">
                    <span class="vw-label">Reason</span>
                    <span class="vw-value mono" style="color:${cv('red',700)}">${s.reason}</span>
                    <span class="vw-card-description" style="white-space:normal;margin-top:4px">${s.action}</span>
                  </div>`
                  : `<div class="vw-card-child-shaded" style="margin-top:var(--vw-space-xs)">
                      <span class="eyebrow" style="color:${cv(s.wrote === 'nothing' || s.wrote.startsWith('nothing') ? 'gray' : 'emerald', 700)}">Wrote</span>
                      <div class="vw-card-description" style="white-space:normal">${s.wrote}</div></div>`}
              </div>
              ${s.req !== '—' ? `<div class="stack-x"><span class="eyebrow">Request</span>
                <pre class="payload mono"><span class="k">${esc(s.req)}</span></pre></div>`
                : `<div class="stack-x"><span class="eyebrow">Request</span>
                <div class="vw-card-child-shaded vw-card-description">Not sent.</div></div>`}
              <div class="stack-x"><span class="eyebrow">Response</span>
                <pre class="payload mono"><span class="${s.state === 'fail' ? 'r' : s.state === 'skip' ? '' : 'g'}">${esc(s.res)}</span></pre></div>
            </div>
          </div>
        </div>`).join('')}
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
      ${kpi('Last verified', '3 h ago', '01-Sep-2026 09:10 IST', 'sky')}
      ${kpi('Collectors passed', '7 of 7', 'Device · Hardware · LLDP · OSPF · BGP · Service', 'cyan')}
      ${kpi('Discovered objects', '49', '19 LLDP · 12 OSPF · 4 BGP · 14 L3VPN', 'purple')}
    </div>

    <div class="row-t" style="align-items:stretch">
      ${card(`${headSm('Run history', 'Last four runs of this target')}
        <div style="margin-top:var(--vw-space-md)">
        ${table([{ t: 'Run' }, { t: 'Started' }, { t: 'Elapsed' }, { t: 'Steps' }, { t: 'Outcome' }, { t: 'What changed' }, { t: '' }],
          RUN_HISTORY.map(r => [
            `<span class="mono">#${r.run}</span>`, `<span class="num">${r.at}</span>`, `<span class="num">${r.dur}</span>`,
            r.steps, chip(r.out, r.chip),
            `<span class="vw-card-description" style="white-space:normal">${r.note}</span>`,
            `<button class="nst-btn nst-btn--xs${r.run === TXRUN ? ' nst-btn--filled' : ''}" data-run="${r.run}">${r.run === TXRUN ? 'Viewing' : 'View'}</button>`
          ]))}
        </div>`, 'grow')}

      ${card(`${headSm('Objects discovered', 'Written to inventory on the current run')}
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
      <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-md)">
        ${head('Collector transcript')}
        <div class="seg">
          <button class="${TXRUN === 4412 ? 'is-on' : ''}" data-run="4412">Run #4412 · clean</button>
          <button class="${TXRUN === 4364 ? 'is-on' : ''}" data-run="4364">Run #4364 · partial</button>
        </div>
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
          ? [A('Open element', { v:'resource', l:r.ne })]
        : !r.inv
          ? [A('Open the run transcript', { v:'target', l:`Transcript · ${r.ne}` })]
        : !r.net
          ? [A('Open element', { v:'resource', l:r.ne })]
          : [A('Open element', { v:'resource', l:r.ne }),
             ...(recSerial(r) ? [CP('Copy serial number', recSerial(r))] : [])], 'rec', ri)}
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
    ${pageBar(`<span class="vw-card-description grow">${pmeta().recNote}</span>
      <div class="seg">${PERIODS.map(p => `<button class="${PERIOD===p.k?'is-on':''}" data-period="${p.k}">${p.n}</button>`).join('')}</div>`)}
    ${drillBar()}

    ${card(`
      ${headSm(PERIOD === 'today' ? 'How the cycle came out' : 'How the window came out')}
      <div style="margin-top:var(--vw-space-md)">${recOutcomes()}</div>`)}

    ${recTable()}

    <div class="row-t" style="align-items:stretch">
      ${card(`${headSm('Which attribute disagrees', `Across all ${n(DL.drifted)} differing elements — device-reported attributes only`)}
        <div class="stack-s" style="margin-top:var(--vw-space-md)">${bars(DRIFT_BY_FIELD, dMax)}</div>
        <div class="vw-card-footer-divider">
          <span class="vw-card-description">${n(DRIFT_BY_FIELD[0].c)} OEM conflicts resolve from <span class="mono">sysObjectID</span>.</span>
        </div>`, '', 'width:min(400px,100%);flex-shrink:0')}

      ${card(`${headSm('How a device is matched to a record', `Rules run in priority order; the first that resolves wins. ${n(ruleTotal)} devices resolved this cycle.`)}
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
        <div class="vw-card-footer-divider row vw-justify-between">
          <span class="vw-card-description">${n(DL.unclaimed)} devices matched no rule — no serial, no sysName, no neighbours.</span>
          <button class="nst-btn nst-btn--xs" data-ne-filter="Unidentified">Show them</button>
        </div>`, 'grow')}
    </div>

  </div>`;
}


let TAB = { phy: 'router', link: 'lldp', svc: 'l3vpn', inact: 'ne' };
let PHY_STOCK = new Set(['planned', 'instore', 'deployed', 'faulty']);
let INACT_CLS = 'router';
let PHY_OEM = null, PHY_SRC = null, PHY_VER = null;
let LOC_ST = null, LOC_CAT = null, LOC_STATE = null, LOC_REGION = null;
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

/* ── Home ─────────────────────────────────────────────── */
function viewHome() {
  const clsD = (nm, tab) => ({ v:'physical', l:`${nm} in inventory`, q:`tab=${tab}` });
  const mix = [
    { n:'Routers',  c:2148, tone:'sky',     d:clsD('Routers','router') },
    { n:'Switches', c:349,  tone:'emerald', d:clsD('Switches','switch') },
    { n:'Servers',  c:96,   tone:'cyan',    d:clsD('Servers','server') },
    { n:'DWDM',     c:78,   tone:'purple',  d:clsD('DWDM','dwdm') },
    { n:'eNodeB',   c:18,   tone:'amber',   d:clsD('eNodeB','enodeb') },
    { n:'gNodeB',   c:14,   tone:'orange',  d:clsD('gNodeB','gnodeb') }
  ];
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
        ${headSm('Recently discovered', 'Network elements written or updated by the last discovery cycle.')}
        <button class="nst-btn nst-btn--sm" data-nav="physical">Open Physical Resources</button>
      </div>
      ${table([{t:'Status'},{t:'Name'},{t:'IP address'},{t:'Model'},{t:'OEM'},{t:'Location'},{t:'Source'},{t:'Verified'}],
        PHY.router.slice(0,6).map(r => [
          rst(r.st), `<span class="vw-value">${r.name}</span>`, `<span class="mono">${r.ip}</span>`,
          `<span class="mono">${r.model}</span>`, r.oem, `<span class="mono">${r.loc}</span>`, src(r.s), ver(r.v)
        ]), '',
        i => [A('Node view', { v:'node', l:`Node view · ${PHY.router[i].name}` }),
              A('Open element', { v:'resource', l:PHY.router[i].name }),
              A('Open site', { v:'site', l:PHY.router[i].loc }),
              A('View in reconciliation', { v:'reconcile', l:PHY.router[i].name, q:'ne=All' }),
              CP('Copy serial number', PHY.router[i].sn)])}`)}
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
let LOC_VIEW = 'insights', LOC_SEL = 'MP', MAP_COLOR = 'onair';

const locTabs = () => `<div class="seg">
  ${[['insights','Insights'],['list','Locations'],['map','Map']].map(([k,l]) =>
    `<button class="${LOC_VIEW===k?'is-on':''}" data-locview="${k}">${l}</button>`).join('')}</div>`;

/* ---- shared bits ---- */
const locStats = () => {
  const t = LOC_TIERS;
  return { live:t.reduce((a,x)=>a+x.live,0), build:t.reduce((a,x)=>a+x.building,0),
           plan:t.reduce((a,x)=>a+x.planned,0), fail:t.reduce((a,x)=>a+x.failed,0) };
};
const LOC_STATES = [
  { k:'live', n:'On-air', tone:'emerald' }, { k:'building', n:'In progress', tone:'amber' },
  { k:'planned', n:'Planned', tone:'sky' }, { k:'failed', n:'Failed', tone:'red' }
];

/* ---- view 1 · Insights ---- */
function locInsights() {
  const { live, build, plan, fail } = locStats();
  const cMax = Math.max(...LOC_CIRCLES.map(c=>c.c));
  return `
    <div class="row-t" style="align-items:stretch">
      ${card(`
        <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-lg)">
          ${headSm('Build status by tier', 'One scale, so the three tiers can actually be compared.')}
          <div class="legend">${LOC_STATES.map(st=>`<span class="legend-i">
            <span class="legend-sw" style="background:${cv(st.tone,400)}"></span>${st.n}</span>`).join('')}</div>
        </div>
        <div class="stack" style="gap:var(--vw-space-lg)">
          ${LOC_TIERS.map(t => `
            <div class="stack-s">
              <div class="row vw-justify-between vw-items-baseline">
                <button class="row is-drill tier-h" style="gap:var(--vw-space-sm);width:auto"
                  ${dA({ v:'location', l:`${t.n} sites`, q:`view=list&cat=${t.n}` })}>
                  <span class="vw-card-title-sm">${t.n}</span>
                  <span class="vw-card-metric-label-sub">${(t.live/t.c*100).toFixed(0)}% on-air</span>
                </button>
                <span class="vw-value num" style="font-weight:500">${n(t.c)} <span class="vw-card-metric-label-sub">sites</span></span>
              </div>
              <div class="meter" style="height:22px;border-radius:var(--vw-radius-xs)">
                ${LOC_STATES.map(st=>`<span style="width:${(t[st.k]/t.c*100).toFixed(2)}%;background:${cv(st.tone,400)}"
                  title="${st.n}: ${n(t[st.k])}"></span>`).join('')}
              </div>
              <div class="row vw-gap-lg vw-wrap">
                ${LOC_STATES.map(st=>`<span class="legend-i">
                  <span class="legend-sw" style="background:${cv(st.tone,400)}"></span>${st.n}
                  <strong class="num" style="color:var(--vw-color-gray-900)">${n(t[st.k])}</strong></span>`).join('')}
              </div>
            </div>`).join('')}
        </div>
        <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
          <span class="vw-card-description">Edge carries 74% of the estate and 68% of the failures.</span>
          <span class="row vw-gap-lg">
            ${LOC_STATES.map(st=>`<span class="stack-x t-right"><span class="vw-label">${st.n}</span>
              <span class="vw-value num">${n({live,building:build,planned:plan,failed:fail}[st.k])}</span></span>`).join('')}
          </span>
        </div>
        <div class="vw-card-footer-divider">
          <div style="margin-bottom:var(--vw-space-md)">
            ${headSm('Failed builds', `${n(fail)} sites, and what is blocking each group.`)}
          </div>
          ${table([{t:'Circle'},{t:'Sites',r:true},{t:'Blocking reason'}],
            LOC_FAILED.map(f=>[`<span class="vw-value">${f.n}</span>`,
              `<span style="color:${cv('red',700)};font-weight:500">${f.c}</span>`,
              `<span class="vw-card-description" style="white-space:normal">${f.why}</span>`]))}
        </div>`, 'grow')}

      ${card(`
        <div class="row vw-justify-between vw-items-start" style="margin-bottom:var(--vw-space-lg)">
          ${headSm('Sites by circle', 'On-air against total')}
          <div class="legend">
            <span class="legend-i"><span class="legend-sw" style="background:${cv('emerald',400)}"></span>on-air</span>
            <span class="legend-i"><span class="legend-sw" style="background:${cv('slate',200)}"></span>not yet</span>
          </div>
        </div>
        <div class="stack-s">
          ${LOC_CIRCLES.map(c=>`
            <button class="stack-x is-drill circ-row" style="gap:4px;width:100%"
              ${dA({ v:'location', l:`Sites in ${c.n}`, q:`view=list&state=${c.n}` })}>
              <div class="row vw-justify-between vw-items-baseline">
                <span class="vw-value">${c.n}</span>
                <span class="vw-card-metric-label-sub num">${n(c.live)} / ${n(c.c)}
                  <span style="color:${cv(c.live/c.c < .65 ? 'amber' : 'gray', 600)}">· ${(c.live/c.c*100).toFixed(0)}%</span></span>
              </div>
              <div class="hbar-track" style="height:9px">
                <div class="hbar-fill" style="width:${(c.c/cMax*100).toFixed(1)}%;background:${cv('slate',200)};position:relative">
                  <span style="position:absolute;inset:0 auto 0 0;width:${(c.live/c.c*100).toFixed(1)}%;background:${cv('emerald',400)};border-radius:var(--vw-radius-xs);display:block"></span>
                </div>
              </div>
            </button>`).join('')}
        </div>
        <div class="vw-card-footer-divider row vw-justify-between">
          <span class="vw-card-description">Bar length is total sites; fill is on-air.</span>
          <button class="nst-btn nst-btn--xs" data-locview="map">Open map</button>
        </div>`, '', 'width:min(360px,100%);flex-shrink:0')}
    </div>`;
}

/* ---- view 2 · Locations list ---- */
function locRows() {
  return gridApply('location', LOCATIONS
    .filter(l => !LOC_ST || l.st === LOC_ST)
    .filter(l => !LOC_CAT || l.cat === LOC_CAT)
    .filter(l => !LOC_STATE || l.state === LOC_STATE)
    .filter(l => !LOC_REGION || STATE_REGION[l.state] === LOC_REGION));
}
function locList() {
  const shown = locRows();
  return `${card(`
      ${gridBar(shown.length, n(IL.locations), 'Name, Location ID', FS.location,
        `${chip('214 not reconciled','warning')}${chip('34 failed','error')}`,
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
        i => [A('View site details', { v:'site', l:locRows()[i].name }),
              A('Show on map', { v:'location', l:`${locRows()[i].name} on the map`, q:'view=map' }),
              A('Open capex', { v:'capex', l:`Capex · ${locRows()[i].name}` }),
              A('Open opex', { v:'opex', l:`Opex · ${locRows()[i].name}` }),
              A('Reconcile this site', { v:'reconcile', l:`Reconciliation · ${locRows()[i].name}`, q:'ne=Open' }),
              CP('Copy location ID', locRows()[i].id)])}`)}`;
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
  if (PIN_GROUP) {
    const items = PIN_GROUP.map(id => LOCATIONS.find(l => l.id === id)).filter(Boolean);
    return `<div class="stack">
      <div class="row vw-justify-between vw-items-start">
        <div class="stack-x"><span class="vw-card-title-sm">${items.length} sites at this point</span>
          <span class="vw-card-description">${items[0].city}, ${items[0].state}</span></div>
        <button class="nst-btn nst-btn--xs" data-clusterclear="1">Clear</button>
      </div>
      ${items.map(l=>`<button class="site-row" data-site="${l.id}">
        <span class="row" style="gap:var(--vw-space-xs)">${chip(l.st,l.chip)}<span class="vw-value">${l.name}</span></span>
        <span class="vw-card-metric-label-sub num">${l.disc}/${l.ne} NE</span></button>`).join('')}
      <span class="vw-card-description">Zoom in to separate these pins on the map.</span>
    </div>`;
  }
  const g = LOC_GEO.find(x => x.c === LOC_SEL) || LOC_GEO[0];
  const plan = g.tot - g.live - g.build - g.fail;
  const rows = [['On-air',g.live,'emerald'],['In progress',g.build,'amber'],['Planned',plan,'sky'],['Failed',g.fail,'red']];
  const sites = LOCATIONS.filter(l => l.state === g.st);
  return `<div class="stack">
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
      ${sites.map(l=>`<button class="site-row" data-site="${l.id}">
        <span class="row" style="gap:var(--vw-space-xs)">${chip(l.st,l.chip)}<span class="vw-value">${l.name}</span></span>
        <span class="vw-card-metric-label-sub num">${l.disc}/${l.ne} NE</span></button>`).join('')}
    </div>` : `<div class="vw-card-child-shaded vw-card-description">No sample sites loaded for this circle.</div>`}
    <button class="nst-btn nst-btn--sm nst-btn--filled" data-locview="list" style="align-self:flex-start">Open ${n(g.tot)} sites</button>
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
      ${headSm('Sites by geography', 'State boundaries, Web Mercator. Click a state or a site pin.')}
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
    <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
      <span class="vw-card-description">Drag to pan, scroll or use the controls to zoom. ${noSite} states carry no sites on record.</span>
      <span class="row vw-gap-lg">
        <span class="stack-x t-right"><span class="vw-label">Circles</span><span class="vw-value num">${LOC_GEO.length}</span></span>
        <span class="stack-x t-right"><span class="vw-label">Sites</span><span class="vw-value num">${n(IL.locations)}</span></span>
      </span>
    </div>`)}`;
}

/* ---- view 4 · site drill-down ---- */
let SITE_ID = 'BGLK-277', SITE_TAB = 'router', SITE_SECTION = 'ne';
let SITE_META_OPEN = (() => { try { return localStorage.getItem('nst-sitemeta') === '1'; } catch (e) { return false; } })();
function viewSite() {
  const l = LOCATIONS.find(x => x.id === SITE_ID) || LOCATIONS[0];
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

  return `<div class="page">
    ${pageHead(l.name, `${l.type} · ${l.id} · ${l.city}, ${l.state}`,
      `<button class="nst-btn nst-btn--sm" data-locview="list" data-nav="location">Back to list</button>`)}

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
      { k:'Network elements', v:n(tot),  s:counts.map(c=>`${c.n} ${c.c}`).join(' · '), t:'sky', go:'ne' },
      { k:'Discovered',       v:n(l.disc), s:`${((l.disc/Math.max(l.ne,1))*100).toFixed(0)}% of record`, t:'emerald',
        d:{ v:'reconcile', l:`Verified at ${l.name}`, q:'ne=Agree' } },
      { k:'Drifted',          v:n(drift), s:'incl. duplicate serials', t:'amber',
        d:{ v:'reconcile', l:`Drift at ${l.name}`, q:'ne=Differ' } },
      { k:'Not discovered',   v:n(notDisc), s:'planned or no collector', t:'red',
        d:{ v:'reconcile', l:`Not discovered at ${l.name}`, q:'ne=Only in inventory' } },
      { k:'Links terminating',v:l.disc ? n(l.disc*4+7) : '0', s:'LLDP · OSPF · BGP', t:'purple',
        d:{ v:'links', l:`Links terminating at ${l.name}` } },
      { k:'Capex committed',  v:inrShort(cxTotal), s:`one-off · ${(cxTotal/cxA*100).toFixed(0)}% of ${inrShort(cxA)}`, t:'cyan', go:'capex' },
      { k:'Opex run rate',    v:inrShort(oxRun) + ' / mo', s:`recurring · ${inrShort(oxRun*12)} a year`, t:'teal', go:'opex' }
    ])}

    <div class="section-tabs">
      <button class="stab${SITE_SECTION==='ne'?' is-on':''}" data-sitesection="ne">Network elements</button>
      <button class="stab${SITE_SECTION==='capex'?' is-on':''}" data-sitesection="capex">Capex</button>
      <button class="stab${SITE_SECTION==='opex'?' is-on':''}" data-sitesection="opex">Opex</button>
    </div>

    ${SITE_SECTION === 'capex' ? capexSection(l, tot)
      : SITE_SECTION === 'opex' ? opexSection(l, tot) : card(`
      <div class="tabbar">${counts.map(t=>`<button class="tab${t.k===SITE_TAB?' is-on':''}" data-sitetab="${t.k}">${t.n}</button>`).join('')}</div>
      ${gridBar(rows.length, rows.length, 'Name, IP address, serial', FS.site, '', [], 'site')}
      ${rows.length ? table(cols, rows.map(cell), '',
        i => [A('Node view', { v:'node', l:`Node view · ${rows[i].name}` }),
              A('Open element', { v:'resource', l:rows[i].name }),
              A('View in reconciliation', { v:'reconcile', l:rows[i].name, q:'ne=All' }),
              A('Open capex line', { v:'capex', l:`Capex · ${SITE_ID}` }),
              A('Open opex contracts', { v:'opex', l:`Opex · ${SITE_ID}` }),
              CP('Copy serial number', rows[i].sn)])
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
    <div class="row vw-justify-between vw-items-start vw-wrap" style="gap:var(--vw-space-md)">
      <div class="stack-x">
        <span class="vw-card-title">Capex</span>
      </div>
      <div class="row">
        <button class="nst-btn nst-btn--filled nst-btn--sm" data-capex="${l.id}">Update capex</button>
      </div>
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
      <span class="vw-card-metric-label-sub">Amounts are ex-GST and exclude recurring opex</span>
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
      ${headSm('Budget header', 'Applies to every line item on this site.')}
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
        ${headSm('Line items', 'Amount is quantity × unit cost and recalculates as you type.')}
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

function viewLocation() {
  const body = LOC_VIEW === 'list' ? locList() : LOC_VIEW === 'map' ? locMap() : locInsights();
  const sub = { insights:'Build progress and reconciliation across the estate.',
                list:'Every site on record, with what discovery found there.',
                map:'Where the estate sits, by telecom circle.' }[LOC_VIEW];
  return `<div class="page">
    ${pageBar(`<span class="vw-card-description grow">${sub}</span>${locTabs()}`)}
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
          <span class="tab-dot" style="background:${cv(x.disc ? 'emerald' : 'red', 400)}"></span>${x.n}</button>`).join('')}
      </div>
      <div class="stock-bar">
        <span class="eyebrow">Stock state</span>
        <div class="stock-chips">
          ${STOCK_ST.filter(sk => sk.k !== 'decomm').map(sk => `
            <button class="stock-chip${PHY_STOCK.has(sk.k) ? ' is-on' : ''}" data-stock="${sk.k}"
              style="${PHY_STOCK.has(sk.k) ? `border-color:${cv(sk.tone,400)};background:${cv(sk.tone,50)}` : ''}"
              title="${n(stockCount(t, sk.k))} ${meta.n.toLowerCase()} records · ${n(sk.c)} across the whole estate">
              <span class="legend-sw" style="background:${cv(sk.tone,400)}"></span>${sk.n}</button>`).join('')}
        </div>
      </div>

      ${gridBar(rows.length, PHY_OEM ? `${n(IL.ne)} across every class`
          : n(phyCount(t, PHY_STOCK)),
        'Name, IP address, serial', FS.physical,
        meta.disc === 0 ? chip('No collector defined for this class', 'error')
          : chip(`${n(meta.c - meta.disc)} of ${n(meta.c)} not verified`, 'warning'),
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
          ? [CP('Copy serial number', rows[i].sn)]
          : [...(hasNodeView(t) ? [A('Node view', { v:'node', l:`Node view · ${rows[i].name}` })] : []),
             A('Open element', { v:'resource', l:rows[i].name }),
             A('Open site', { v:'site', l:rows[i].loc }),
             A('View in reconciliation', { v:'reconcile', l:rows[i].name, q:'ne=All' }),
             CP('Copy serial number', rows[i].sn)])}
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
      ${pageHead('Lifecycle operation', `RAN ZTP NEW 1 · ${nf}`,
        `<button class="nst-btn nst-btn--sm" data-nav="virtual">Back to list</button>`)}
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
    ${pageHead('Lifecycle operation', `RAN ZTP NEW 1 · ${nf}`,
      `<button class="nst-btn nst-btn--sm" data-nav="virtual">Back to list</button>`)}
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
              A('View parent RAN node', { v:'physical', l:'RAN detail view', q:'from=Virtual' })])}`)}
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
              A('Open destination element', { v:'resource', l:rows[i].dne }),
              CP('Copy link name', rows[i].name)])}
      <div class="vw-card-footer-divider row vw-justify-between vw-wrap">
        <span class="vw-card-description">
          A link that stops appearing is not deleted — it is marked <strong>no longer seen</strong> and raised as an exception.
        </span>
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
      ${kpi('L3VPN', '1,815', '1,684 up · 131 down', 'emerald', { v:'services', l:'L3VPN services', q:'tab=l3vpn' })}
      ${kpi('L2VPN', '642', '598 up · 44 down', 'cyan', { v:'services', l:'L2VPN services', q:'tab=l2vpn' })}
      ${kpi('Service endpoints', '4,912', 'attachment interfaces discovered', 'sky',
        { v:'resource', l:'Attachment interfaces' })}
      ${kpi('Not in inventory', '146', 'found on device, no service record', 'red',
        { v:'reconcile', l:'Services found with no record', q:'ne=Only on network' })}
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
        ]), '',
        i => [A('Open attachment element', { v:'resource', l:rows[i].name }),
              CP('Copy ERP number', rows[i].erp)])}`)}
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
      { k:'Still answering discovery', v:String(DECOMM_ZOMBIES), s:'written off, yet on network', t:'red',
        d:{ v:'reconcile', l:'Decommissioned but still answering', q:'ne=Only on network' } },
      { k:'Retired links', v:n(1188), s:'adjacency no longer seen', t:'amber',
        d:{ v:'links', l:'Retired adjacency' } },
      { k:'Retired services', v:n(264), s:'no longer provisioned', t:'purple',
        d:{ v:'services', l:'Retired services' } },
      { k:'Oldest record', v:DECOMM_OLDEST, s:'archived record', t:'cyan' },
      { k:'Recovered to store', v:n(38), s:'restored in last 12 months', t:'emerald' }
    ])}

    ${card(`
      <div class="tabbar">${PHY_TABS.map(x => `
        <button class="tab${x.k === t ? ' is-on' : ''}" data-inactcls="${x.k}"
          title="${n(stockCount(x.k, 'decomm'))} decommissioned ${x.n.toLowerCase()} records">
          <span class="tab-dot" style="background:${cv('slate',400)}"></span>${x.n}</button>`).join('')}
      </div>

      ${zomb ? `<div class="row vw-justify-end" style="margin-top:var(--vw-space-md)">
        <button class="nst-btn nst-btn--xs nst-btn--danger-subtle"
          ${dA({ v:'reconcile', l:`Still answering · ${meta.n}`, q:'ne=Only on network' })}>Open exceptions (${zomb} still answering)</button>
      </div>` : ''}

      ${gridBar(total, n(total), 'Name, serial number, workorder, OEM', FS.inactive,
        chip('Archive · read-only', 'neutral'),
        [{ l:'Go to active inventory', nav:'physical', primary:true }])}
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
        i => [CP('Copy serial number', rows[i].sn),
              ...(rows[i].zombie ? [A('Open reconciliation exception',
                  { v:'reconcile', l:`Still answering · ${rows[i].name}`, q:'ne=Only on network' })] : []),
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

