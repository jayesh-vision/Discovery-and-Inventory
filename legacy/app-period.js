/* ═══ reporting period ═══════════════════════════════════
   The Insights period switch is global to the discovery and
   reconciliation module: every figure below is rewritten in
   place when the period changes, so no two screens can ever
   disagree about which window they are describing.

   Today  = the position at the close of the last cycle.
   7 / 30 = every element the window touched, counted at its
            last comparison inside it. A wider window sees
            more of the estate — elements added, retired, or
            reached only by a weekly job all fall inside it —
            so every bucket grows as the window widens and
            none of them can shrink. That is what the counts
            below assert, and what checkPeriods() enforces.
   ═══════════════════════════════════════════════════════ */
const PERIODS = [
  { k:'today', n:'Today',   cycles:1,  range:'01-Sep-2026',
    note:'Position at the close of the 01-Sep-2026 cycle.',
    runNote:'Outcome of the last run of each target.',
    recNote:'State of each element at the close of the cycle.' },
  { k:'d7', n:'7 days', cycles:7, range:'26-Aug – 01-Sep-2026',
    note:'Seven discovery cycles, 26-Aug to 01-Sep-2026.',
    runNote:'Every target polled in 7 cycles, at its last run.',
    recNote:'Every element compared in 7 cycles, at its last comparison.' },
  { k:'d30', n:'30 days', cycles:30, range:'03-Aug – 01-Sep-2026',
    note:'Thirty discovery cycles, 03-Aug to 01-Sep-2026.',
    runNote:'Every target polled in 30 cycles, at its last run.',
    recNote:'Every element compared in 30 cycles, at its last comparison.' }
];
let PERIOD = 'today';
let NAT_RATE = 0;
const pmeta = () => PERIODS.find(p => p.k === PERIOD) || PERIODS[0];

/* Each block is a closed ledger:
     targets      = runFull + runPartial + runFail
     master       = noCollector + discoverable
     discoverable = matched + missing
     matched      = exact + drifted + stale
     identified   = matched + rogue + unclaimed                       */
const DLP = {
  today: { targets:2308, runFull:1842, runPartial:291, runFail:175,
           master:2703, noCollector:206, discoverable:2497,
           matched:2379, missing:118, exact:1829, drifted:392, stale:158,
           rogue:160, unclaimed:64, identified:2603, discRouter:2212, discSwitch:391 },
  d7:    { targets:2371, runFull:1861, runPartial:320, runFail:190,
           master:2784, noCollector:209, discoverable:2575,
           matched:2447, missing:128, exact:1846, drifted:425, stale:176,
           rogue:172, unclaimed:70, identified:2689, discRouter:2285, discSwitch:404 },
  d30:   { targets:2468, runFull:1902, runPartial:358, runFail:208,
           master:2931, noCollector:214, discoverable:2717,
           matched:2572, missing:145, exact:1878, drifted:486, stale:208,
           rogue:194, unclaimed:82, identified:2848, discRouter:2419, discSwitch:429 }
};

/* freshness buckets — sum to identified in every period */
const FRESH_P = {
  today: [1142, 786, 402, 189, 84],
  d7:    [1168, 806, 418, 197, 100],
  d30:   [1224, 848, 446, 212, 118]
};
/* discovered devices by OEM — sum to identified in every period */
const OEM_P = {
  today: [1612, 806, 98, 54, 21, 12],
  d7:    [1657, 838, 102, 57, 22, 13],
  d30:   [1748, 886, 108, 61, 25, 20]
};
const OEM_ROWS = [
  { n:'Juniper', tone:'sky' }, { n:'Cisco', tone:'cyan' }, { n:'Cisco SDN', tone:'indigo' },
  { n:'Nokia', tone:'purple' }, { n:'Adva', tone:'amber' }, { n:'Edgecore', tone:'slate' }
];
/* collector families — ok + fail + na sum to targets in every period */
const COLL_P = {
  today: [[2133,175,0],[2041,92,175],[2098,35,175],[1412,63,833],[604,21,1683],[1289,47,972]],
  d7:    [[2181,190,0],[2085,96,190],[2144,37,190],[1447,66,858],[619,23,1729],[1321,50,1000]],
  d30:   [[2260,208,0],[2159,101,208],[2221,39,208],[1502,70,896],[645,26,1797],[1375,53,1040]]
};

/* what moved inside the window — regressions against recoveries */
const MOVE_P = {
  today: [
    { n:'Records added',        v:14,  dir:'up',   tone:'sky' },
    { n:'Records retired',      v:6,   dir:'down', tone:'slate' },
    { n:'Newly drifted',        v:38,  dir:'bad',  tone:'amber' },
    { n:'Drift resolved',       v:51,  dir:'good', tone:'emerald' },
    { n:'Stopped answering',    v:9,   dir:'bad',  tone:'red' },
    { n:'Answered again',       v:4,   dir:'good', tone:'emerald' }
  ],
  d7: [
    { n:'Records added',        v:63,  dir:'up',   tone:'sky' },
    { n:'Records retired',      v:25,  dir:'down', tone:'slate' },
    { n:'Newly drifted',        v:187, dir:'bad',  tone:'amber' },
    { n:'Drift resolved',       v:154, dir:'good', tone:'emerald' },
    { n:'Stopped answering',    v:41,  dir:'bad',  tone:'red' },
    { n:'Answered again',       v:18,  dir:'good', tone:'emerald' }
  ],
  d30: [
    { n:'Records added',        v:148, dir:'up',   tone:'sky' },
    { n:'Records retired',      v:45,  dir:'down', tone:'slate' },
    { n:'Newly drifted',        v:612, dir:'bad',  tone:'amber' },
    { n:'Drift resolved',       v:498, dir:'good', tone:'emerald' },
    { n:'Stopped answering',    v:129, dir:'bad',  tone:'red' },
    { n:'Answered again',       v:44,  dir:'good', tone:'emerald' }
  ]
};

/* ── proportional rescale that always closes on the total ── */
const SNAP = {
  circles: CIRCLES.map(c => ({ master:c.master, rogue:c.rogue, missing:c.missing, drift:c.drift })),
  drops:   DROPS.map(d => d.n),
  rules:   MATCH_RULES.map(r => r.hits),
  seen:    TAXONOMY.map(t => t.seen),
  drift:   DRIFT_BY_FIELD.map(d => d.c)
};
function spread(src, total) {
  const cur = src.reduce((a, b) => a + b, 0);
  if (!cur || !total) return src.map(() => 0);
  const out = src.map(v => Math.round(v / cur * total));
  let diff = total - out.reduce((a, b) => a + b, 0);
  if (diff) { let bi = 0; out.forEach((v, i) => { if (v > out[bi]) bi = i; }); out[bi] += diff; }
  return out;
}

/* Four parallel number tables kept by hand is exactly how a window ends up
   claiming fewer records than a narrower one. Each is a closed ledger, and
   widening the window may only ever add — so both are asserted here rather
   than trusted. */
function checkPeriods() {
  const order = ['today', 'd7', 'd30'];
  const sum = a => a.reduce((x, y) => x + y, 0);
  const bad = m => { throw new Error('period ledger: ' + m); };

  order.forEach(k => {
    const d = DLP[k];
    if (d.runFull + d.runPartial + d.runFail !== d.targets) bad(`${k} run outcomes ≠ targets`);
    if (d.exact + d.drifted + d.stale !== d.matched)        bad(`${k} match states ≠ matched`);
    if (d.matched + d.missing !== d.discoverable)           bad(`${k} matched + missing ≠ discoverable`);
    if (d.noCollector + d.discoverable !== d.master)        bad(`${k} discoverable + no-collector ≠ master`);
    if (d.matched + d.rogue + d.unclaimed !== d.identified) bad(`${k} matched + rogue + unclaimed ≠ identified`);
    if (d.discRouter + d.discSwitch !== d.identified)       bad(`${k} classes ≠ identified`);
    if (sum(FRESH_P[k]) !== d.identified)                   bad(`${k} freshness ≠ identified`);
    if (sum(OEM_P[k]) !== d.identified)                     bad(`${k} OEM split ≠ identified`);
    COLL_P[k].forEach((row, i) => { if (sum(row) !== d.targets) bad(`${k} collector ${i} ≠ targets`); });
  });

  /* nothing a window counts may fall as the window widens */
  const rises = (label, of) => order.slice(1).forEach((k, i) => {
    const prev = of(order[i]), now = of(k);
    if (now < prev) bad(`${label} falls from ${order[i]} (${prev}) to ${k} (${now})`);
  });
  Object.keys(DLP.today).forEach(f => rises(f, k => DLP[k][f]));
  FRESH_P.today.forEach((_, i) => rises(`freshness[${i}]`, k => FRESH_P[k][i]));
  OEM_P.today.forEach((_, i) => rises(`oem[${i}]`, k => OEM_P[k][i]));
  COLL_P.today.forEach((_, i) => {
    rises(`collector[${i}].ok`, k => COLL_P[k][i][0]);
    rises(`collector[${i}].fail`, k => COLL_P[k][i][1]);
  });
  MOVE_P.today.forEach((m, i) => rises(`moved · ${m.n}`, k => MOVE_P[k][i].v));
}

function applyPeriod() {
  Object.assign(DL, DLP[PERIOD]);
  DL.union = DL.master + DL.rogue + DL.unclaimed;
  DL.open  = DL.drifted + DL.missing + DL.rogue + DL.unclaimed;

  FRESH_P[PERIOD].forEach((c, i) => { FRESHNESS[i].c = c; });
  COLL_P[PERIOD].forEach(([ok, fail, na], i) =>
    Object.assign(COLLECTORS[i], { ok, fail, na }));

  spread(SNAP.drops, DL.runFail).forEach((v, i) => { DROPS[i].n = v; });
  spread(SNAP.rules, DL.identified - DL.unclaimed).forEach((v, i) => { MATCH_RULES[i].hits = v; });
  spread(SNAP.drift, DL.drifted).forEach((v, i) => { DRIFT_BY_FIELD[i].c = v; });

  /* circle exceptions must add up to the placed (identifiable) open items */
  const placed = DL.open - DL.unclaimed;
  const wt = SNAP.circles.map(c => c.rogue + c.missing + c.drift);
  const each = spread(wt, placed);
  CIRCLES.forEach((c, i) => {
    const s = SNAP.circles[i], w = s.rogue + s.missing + s.drift || 1;
    c.master  = Math.round(s.master * DL.master / DLP.today.master);
    c.rogue   = Math.round(each[i] * s.rogue / w);
    c.missing = Math.round(each[i] * s.missing / w);
    c.drift   = each[i] - c.rogue - c.missing;
    c.exc     = c.rogue + c.missing + c.drift;
    c.sites   = Math.max(1, Math.round(c.master * IL.locations / DLP.today.master));
    c.verified= Math.max(0, c.master - c.missing);
    c.rate    = c.master ? c.exc / c.master * 100 : 0;
    c.job     = `DSC-${c.c}-EDGE`;
  });
  NAT_RATE = DL.master ? (DL.open - DL.unclaimed) / DL.master * 100 : 0;

  /* what each class was seen on the network at least once in the window */
  const r = DL.identified / DLP.today.identified;
  TAXONOMY.forEach((t, i) => { t.seen = SNAP.seen[i] ? Math.min(t.master, Math.round(SNAP.seen[i] * r)) : 0; });

  /* the six outcome rows are the same ledger, re-cut */
  OUTCOME.forEach(o => { o.c = DL[o.k]; });

  /* reconciliation bands are the same ledger, re-cut */
  REC_BANDS.invOnly.c = DL.missing;
  REC_BANDS.both.c    = DL.matched;
  REC_BANDS.both.parts[0].c = DL.exact;
  REC_BANDS.both.parts[1].c = DL.drifted;
  REC_BANDS.both.parts[2].c = DL.stale;
  REC_BANDS.netOnly.c = DL.rogue + DL.unclaimed;
  REC_BANDS.netOnly.parts[0].c = DL.rogue;
  REC_BANDS.netOnly.parts[1].c = DL.unclaimed;
  REC_BANDS.notComparable.c = DL.noCollector;
}
checkPeriods();
applyPeriod();
