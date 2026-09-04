/* ═══ reporting period ═══════════════════════════════════
   The Insights period switch is global to the discovery and
   reconciliation module: every figure below is rewritten in
   place when the period changes, so no two screens can ever
   disagree about which window they are describing.

   Today  = the position at the close of the last cycle.
   7 / 30 = the WORST state each element reached across the
            window. An element that drifted on Thursday and
            was corrected on Friday counts as Drifted here,
            which is the point — a snapshot hides flapping.
   ═══════════════════════════════════════════════════════ */
const PERIODS = [
  { k:'today', n:'Today',   cycles:1,  range:'01-Sep-2026',
    note:'Position at the close of the 01-Sep-2026 cycle.',
    runNote:'Outcome of the last run of each target.',
    recNote:'State of each element at the close of the cycle.' },
  { k:'d7', n:'7 days', cycles:7, range:'26-Aug – 01-Sep-2026',
    note:'Seven discovery cycles, 26-Aug to 01-Sep-2026.',
    runNote:'Worst run outcome each target reached in 7 cycles.',
    recNote:'Worst state each element reached across 7 cycles.' },
  { k:'d30', n:'30 days', cycles:30, range:'03-Aug – 01-Sep-2026',
    note:'Thirty discovery cycles, 03-Aug to 01-Sep-2026.',
    runNote:'Worst run outcome each target reached in 30 cycles.',
    recNote:'Worst state each element reached across 30 cycles.' }
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
  d7:    { targets:2371, runFull:1689, runPartial:402, runFail:280,
           master:2741, noCollector:206, discoverable:2535,
           matched:2394, missing:141, exact:1604, drifted:561, stale:229,
           rogue:198, unclaimed:81, identified:2673, discRouter:2270, discSwitch:403 },
  d30:   { targets:2468, runFull:1502, runPartial:508, runFail:458,
           master:2806, noCollector:214, discoverable:2592,
           matched:2389, missing:203, exact:1318, drifted:742, stale:329,
           rogue:271, unclaimed:112, identified:2772, discRouter:2351, discSwitch:421 }
};

/* freshness buckets — sum to identified in every period */
const FRESH_P = {
  today: [1142, 786, 402, 189, 84],
  d7:    [1096, 812, 447, 216, 102],
  d30:   [1041, 838, 496, 268, 129]
};
/* discovered devices by OEM — sum to identified in every period */
const OEM_P = {
  today: [1612, 806, 98, 54, 21, 12],
  d7:    [1648, 832, 101, 56, 22, 14],
  d30:   [1704, 866, 105, 59, 23, 15]
};
const OEM_ROWS = [
  { n:'Juniper', tone:'sky' }, { n:'Cisco', tone:'cyan' }, { n:'Cisco SDN', tone:'indigo' },
  { n:'Nokia', tone:'purple' }, { n:'Adva', tone:'amber' }, { n:'Edgecore', tone:'slate' }
];
/* collector families — ok + fail + na sum to targets in every period */
const COLL_P = {
  today: [[2133,175,0],[2041,92,175],[2098,35,175],[1412,63,833],[604,21,1683],[1289,47,972]],
  d7:    [[2130,241,0],[2032,98,241],[2094,36,241],[1441,68,862],[617,24,1730],[1316,52,1003]],
  d30:   [[2110,358,0],[2001,109,358],[2071,39,358],[1479,74,915],[641,28,1799],[1358,61,1049]]
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
applyPeriod();
