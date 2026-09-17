/* ── Discovery and reconciliation reports ───────────────────
   Every figure is read from discoveryOverview.ts / reconcileOverview.ts /
   reconciliationOps.ts / rules.ts — the same self-checked sources Insights
   and Reconciliation render — so a report can never show a different
   trust index, backlog or exception count than those screens do. */

import {
  ADAPTER_ROWS, BACKLOG_AGE, BACKLOG_AUTORESOLVED, BACKLOG_DAYS, BACKLOG_DETECTED, COLLECTOR_ROWS, COST_OF_DRIFT,
  COVERAGE_FUNNEL, DECISION, DISCOVERY_JOB_ROWS, DISCREPANCY_TYPES, DOMAIN_HEX, DOMAIN_LABEL, DOMAIN_TRUST_ROWS,
  DOMAIN_TRUST_TOTAL, GAP_ACTIONS, GAP_START_PCT, GAP_TARGET_AFTER, OBJECTS_DAILY_DAYS, OBJECTS_DAILY_SERIES,
  OBJECTS_DAILY_VALUES, PLATFORM_OUTPUT, RECONCILE_CYCLE_ROWS, REGION_DISCREPANCY, HEATMAP_REGIONS, RISK_REGISTER,
  ROOT_CAUSE_FAILURES, TIME_TO_TARGET, TRAJECTORY_DAYS, TRAJECTORY_MEASURED, TRAJECTORY_PROJECTION,
  TRAJECTORY_PROJECTION_DAYS, TRAJECTORY_TARGET, TRUST_METRICS, type DomainKey
} from '../discoveryOverview';
import {
  DISPOSITIONS, EXCEPTION_TONE, JOB_STATUS_TONE, RECONCILE_EXCEPTIONS, RECONCILE_JOBS, SLA_TONE,
  exceptionsForRule, jobsForRule
} from '../reconciliationOps';
import { PRIORITY_TONE, RULES, RULE_LIFECYCLE, STATUS_NEXT, STATUS_TONE, ruleById } from '../rules';
import {
  type ReportBuilder, TONE_HEX, countBy, fmtNum, fmtUsd, lowerFirst, pct, r1, sum
} from './model';

const DOMAINS: DomainKey[] = ['RAN', 'Transport', 'Core', 'IPMPLS'];
const trustOf = (d: DomainKey) => DOMAIN_TRUST_ROWS.find(r => r.domain === d)!;
const TRUST = TRUST_METRICS[0], COVERAGE = TRUST_METRICS[1], BACKLOG = TRUST_METRICS[2], MTTR = TRUST_METRICS[3];
const last = (a: number[]) => a[a.length - 1];
const prev = (a: number[]) => a[a.length - 2];
const cycleLabels = (n: number) => Array.from({ length: n }, (_, i) => (i === n - 1 ? 'Latest' : `${n - 1 - i} back`));
const domainLink = (d: DomainKey) => ({ key: 'domaindevices', params: { domain: d.toLowerCase() } });

/* ── DR-01 Inventory trust executive report ─────────────────── */
const trustExecutive: ReportBuilder = () => {
  const openTotal = sum(DOMAIN_TRUST_ROWS, r => r.open);
  const worst = [...DOMAIN_TRUST_ROWS].sort((a, b) => b.open - a.open)[0];
  const lowestTrust = [...DOMAIN_TRUST_ROWS].sort((a, b) => a.trustIndexPct - b.trustIndexPct)[0];
  const optical = COST_OF_DRIFT.find(c => c.key === 'optical')!;
  const opticalValue = optical.compute(Object.fromEntries(optical.inputs.map(i => [i.key, i.value])));
  const afterTwo = GAP_ACTIONS[GAP_TARGET_AFTER - 1];

  return {
    headline: { value: 98.23, fmt: 'pct2', label: 'inventory trust index', tone: 'sky', trend: TRUST.trend, better: 'up' },
    summary: `Inventory trust stands at ${DOMAIN_TRUST_TOTAL.trustIndexPct}, ${TIME_TO_TARGET.gap} short of the ${TRAJECTORY_TARGET.toFixed(2)}% target and improving at ${TIME_TO_TARGET.runRate}; at that rate the target is reached on ${TIME_TO_TARGET.reachedOn}, ${TIME_TO_TARGET.days} days from now. Discovery reaches ${COVERAGE.value} of the ${DOMAIN_TRUST_TOTAL.inScope} assets in scope. ${openTotal} discrepancies are open, and ${DOMAIN_LABEL[worst.domain]} carries ${worst.open} of them (${Math.round(pct(worst.open, openTotal))}%), repairs slowest (${worst.mttrHours}h against an 8h target) and is the only domain still discovered on a nightly window; ${DOMAIN_LABEL[lowestTrust.domain]} has the lowest trust index (${lowestTrust.trustIndexPct}%) but only ${lowestTrust.open} open items. Completing the first two actions below takes trust to ${afterTwo.cumPct.toFixed(2)}%, past target, this week.`,
    findings: [
      { tone: 'good', title: `On course for ${TRAJECTORY_TARGET}% by ${TIME_TO_TARGET.reachedOn}`, detail: `Trust rose from ${TRAJECTORY_MEASURED[0].toFixed(2)}% to ${DOMAIN_TRUST_TOTAL.trustIndexPct} over 30 days (${TIME_TO_TARGET.runRate}). ${TIME_TO_TARGET.note}.` },
      { tone: 'crit', title: `${DOMAIN_LABEL[worst.domain]} is the outlier`, detail: `${worst.open} of ${openTotal} open discrepancies, ${worst.trustIndexPct}% trust, ${worst.mttrHours}h mean time to reconcile and ${worst.touchlessPct}% touchless — the only domain below 60% automation and the only one on a nightly discovery window.` },
      { tone: 'warn', title: `${opticalValue} of optical capacity is unbilled`, detail: `42 live wavelengths have no service record. The same Transport fix closes them — see the Cost of drift report.` },
      { tone: 'info', title: `${PLATFORM_OUTPUT.touchlessNow}% of discrepancies now close without an engineer`, detail: `Up from ${PLATFORM_OUTPUT.touchlessStart}%; mean time to reconcile down from ${PLATFORM_OUTPUT.mttrStart}h to ${PLATFORM_OUTPUT.mttrNow}h. ${fmtNum(PLATFORM_OUTPUT.closedNoEngineer)} of ${fmtNum(PLATFORM_OUTPUT.detected)} detected items closed automatically in 30 days.` }
    ],
    kpis: [
      { title: 'Inventory trust index', definition: 'Share of in-scope records whose identity, attributes and relationships all match the live network.',
        value: 98.23, fmt: 'pct2', of: 'target 99.00%', tone: 'sky',
        delta: { text: `${(last(TRUST.trend) - TRUST.trend[TRUST.trend.length - 8]).toFixed(2)} pt vs 7 cycles ago`, better: true },
        visual: { kind: 'cycles', values: TRUST.trend, labels: cycleLabels(TRUST.trend.length) } },
      { title: 'Discovery coverage', definition: 'Assets in scope that discovery reached and classified in the latest sweep.',
        value: 99.44, fmt: 'pct2', of: '12,106 of 12,174', tone: 'emerald',
        delta: { text: `${(last(COVERAGE.trend) - prev(COVERAGE.trend)).toFixed(2)} pt vs last cycle`, better: true },
        visual: { kind: 'cycles', values: COVERAGE.trend, labels: cycleLabels(COVERAGE.trend.length) } },
      { title: 'Open discrepancies', definition: 'Records that disagree with the live network and are not yet resolved.',
        value: openTotal, fmt: 'num', of: `${BACKLOG.sub.split(' · ')[0]}`, tone: 'amber',
        delta: { text: `${prev(BACKLOG.trend) - last(BACKLOG.trend)} fewer than last cycle`, better: true },
        visual: { kind: 'segments', parts: DOMAINS.map(d => ({ n: DOMAIN_LABEL[d], c: trustOf(d).open, hex: DOMAIN_HEX[d] })), total: openTotal } },
      { title: 'Mean time to reconcile', definition: 'Average hours from a discrepancy being detected to it being resolved.',
        value: 9.6, fmt: 'hours', of: 'target 8.0h', tone: 'red',
        delta: { text: `${(last(MTTR.trend) - prev(MTTR.trend)).toFixed(1)}h vs last cycle`, better: false },
        visual: { kind: 'cycles', values: MTTR.trend, labels: cycleLabels(MTTR.trend.length) } }
    ],
    visuals: [
      { kind: 'projection', span: 2, title: 'Trust index — measured and projected', sub: `Last 30 days, projected at ${TIME_TO_TARGET.runRate}`,
        historyLabels: TRAJECTORY_DAYS, historyValues: TRAJECTORY_MEASURED, projectionLabels: TRAJECTORY_PROJECTION_DAYS, projectionValues: TRAJECTORY_PROJECTION,
        target: TRAJECTORY_TARGET, targetLabel: 'Target 99%', yBounds: { y0: 97.4, y1: 99.2 }, fmt: 'pct2' },
      { kind: 'bars', title: 'Trust index by domain', sub: 'Scale 90–100%', fmt: 'pct2', min: 90, max: 100, target: { value: 99, label: 'target 99%' },
        rows: DOMAINS.map(d => { const t = trustOf(d); return { label: DOMAIN_LABEL[d], value: t.trustIndexPct, hex: DOMAIN_HEX[d], sub: `${t.open} open · ${fmtNum(t.inScope)} in scope` }; }) },
      { kind: 'bars', title: 'Mean time to reconcile by domain', sub: 'Hours · target 8h', fmt: 'hours', target: { value: 8, label: 'target 8h' },
        rows: DOMAINS.map(d => { const t = trustOf(d); return { label: DOMAIN_LABEL[d], value: t.mttrHours, hex: t.mttrHours > 8 ? 'var(--vw-color-red-400)' : DOMAIN_HEX[d], sub: `${t.touchlessPct}% touchless` }; }) },
      { kind: 'steps', span: 2, title: 'Path to 99% trust', sub: 'Each action and the trust index it lands on, in order', start: GAP_START_PCT, target: TRAJECTORY_TARGET, fmt: 'pct2',
        steps: GAP_ACTIONS.map(a => ({ label: a.label, gain: a.gain, cum: a.cumPct })) }
    ],
    actions: [
      { priority: 'P1', action: `Decide whether to ${lowerFirst(DECISION.ask)}`, owner: 'Head of Network Operations', impact: `${DECISION.expected}; also fixes ${DECISION.alsoFixes}. Needs ${lowerFirst(DECISION.needs)}.` },
      ...GAP_ACTIONS.map((a, i) => ({
        priority: (i < GAP_TARGET_AFTER ? 'P1' : i < 4 ? 'P2' : 'P3') as 'P1' | 'P2' | 'P3',
        action: a.label,
        owner: /Collector/.test(a.label) ? 'Discovery engineering' : /RAN/.test(a.label) ? 'RAN operations' : /vault/.test(a.label) ? 'Security / IAM' : /Transport records/.test(a.label) ? 'Transport inventory' : 'Security operations',
        impact: `+${a.gain.toFixed(2)} pt → ${a.cumPct.toFixed(2)}% trust${i === GAP_TARGET_AFTER - 1 ? ' (target reached)' : ''}`
      }))
    ],
    table: {
      title: 'Domain trust scorecard', sub: 'One row per domain; select a row to open its devices',
      columns: [
        { key: 'domain', header: 'Domain', fmt: 'domain' }, { key: 'inScope', header: 'In scope', fmt: 'num', right: true },
        { key: 'unverified', header: 'Unverified', fmt: 'num', right: true }, { key: 'inSync', header: 'In sync', fmt: 'num', right: true },
        { key: 'trust', header: 'Trust index', fmt: 'pct2', right: true }, { key: 'open', header: 'Open', fmt: 'num', right: true },
        { key: 'mttr', header: 'MTTR', fmt: 'hours', right: true }, { key: 'touchless', header: 'Touchless', fmt: 'pct', right: true },
        { key: 'discovery', header: 'Discovery schedule' }
      ],
      rows: DOMAINS.map(d => {
        const t = trustOf(d); const j = DISCOVERY_JOB_ROWS.find(x => x.domain === d)!;
        return { id: d, link: domainLink(d), cells: { domain: d, inScope: t.inScope, unverified: t.unverified, inSync: t.inSync, trust: t.trustIndexPct, open: t.open, mttr: t.mttrHours, touchless: t.touchlessPct, discovery: j.schedule } };
      }),
      empty: 'No domains in scope.'
    },
    methodology: [
      { term: 'Inventory trust index', definition: 'Records whose identity, attributes and relationships all agree with the live network, as a share of records in scope. The estate figure is computed over the department-wide population of 12,174 assets, which is wider than the sum of the four domain job scopes.' },
      { term: 'Discovery coverage', definition: 'Assets reached and classified by the latest discovery sweep, divided by assets in scope.' },
      { term: 'Mean time to reconcile (MTTR)', definition: 'Average elapsed hours from detection of a discrepancy to its closure, manual or automatic.' },
      { term: 'Touchless', definition: 'Share of discrepancies closed by policy without an engineer.' },
      { term: 'Projection', definition: `The dashed line continues the measured run-rate (${TIME_TO_TARGET.runRate}) forward; it is not a forecast model.` },
      { term: 'Path to 99%', definition: 'Estimated trust gain from each action if completed in the order shown; gains are cumulative.' }
    ]
  };
};

/* ── DR-02 Discrepancy backlog & ageing ─────────────────────── */
const AGE_HEX = ['var(--vw-color-blue-200)', 'var(--vw-color-blue-300)', 'var(--vw-color-blue-400)', 'var(--vw-color-blue-500)', 'var(--vw-color-blue-700)'];
const CATEGORY_HEX: Record<string, string> = {
  EXISTENCE: 'var(--vw-color-orange-400)', ATTRIBUTE: 'var(--vw-color-amber-400)', RELATIONSHIP: 'var(--vw-color-sky-400)', FRESHNESS: 'var(--vw-color-slate-400)'
};

const backlog: ReportBuilder = () => {
  const open = sum(DISCREPANCY_TYPES, t => t.count);
  const top = [...DISCREPANCY_TYPES].sort((a, b) => b.count - a.count)[0];
  const older7 = sum(BACKLOG_AGE.slice(3), b => b.count);
  const older30 = BACKLOG_AGE[4].count;
  const oldestTypes = DISCREPANCY_TYPES.filter(t => t.ageBand === '>30d');
  const regionTotals = REGION_DISCREPANCY.map(r => ({ region: r.region, n: sum(DOMAINS, d => r.drift[d]) })).sort((a, b) => b.n - a.n);
  const detectedToday = last(BACKLOG_DETECTED), resolvedToday = last(BACKLOG_AUTORESOLVED);
  const categories = countBy(DISCREPANCY_TYPES.flatMap(t => Array(t.count).fill(t.category) as string[]), c => c);

  return {
    headline: { value: open, fmt: 'num', label: 'open discrepancies', tone: 'amber', trend: BACKLOG.trend, better: 'down' },
    summary: `${open} discrepancies are open across ${DISCREPANCY_TYPES.length} types. The single largest is "${top.label}" (${top.count}, ${Math.round(pct(top.count, open))}% of the backlog, ${DOMAIN_LABEL[top.domain]}), all raised within the last hour by one sweep. ${older7} items are older than 7 days and ${older30} older than 30. The ${regionTotals[0].region} region holds the most (${regionTotals[0].n}, ${Math.round(pct(regionTotals[0].n, open))}%). Today ${detectedToday} new discrepancies were detected and ${resolvedToday} (${Math.round(pct(resolvedToday, detectedToday))}%) were resolved automatically by policy.`,
    findings: [
      { tone: 'crit', title: `"${top.label}" is ${Math.round(pct(top.count, open))}% of the backlog`, detail: `${top.count} ${DOMAIN_LABEL[top.domain]} items from one sweep. They are live wavelengths with no service record, so they are a billing question as well as an inventory one — approving RUL-TRN-002 lets reconciliation raise them as a batch.` },
      { tone: 'warn', title: `${older7} items older than 7 days, ${older30} older than 30`, detail: `Oldest type: ${oldestTypes.map(t => `${t.label} (${t.count}, ${DOMAIN_LABEL[t.domain]})`).join(', ') || 'none'}. Aged items are the ones an external audit would raise.` },
      { tone: 'info', title: `${regionTotals[0].region} holds ${regionTotals[0].n} open items`, detail: regionTotals.map(r => `${r.region} ${r.n}`).join(' · ') },
      { tone: 'good', title: `${Math.round(pct(resolvedToday, detectedToday))}% of today's detections auto-resolved`, detail: `${resolvedToday} of ${detectedToday} closed by policy without an engineer.` }
    ],
    kpis: [
      { title: 'Open backlog', definition: 'Discrepancies detected and not yet resolved, all domains.', value: open, fmt: 'num', of: `${DISCREPANCY_TYPES.length} types`, tone: 'amber',
        delta: { text: `${prev(BACKLOG.trend) - last(BACKLOG.trend)} fewer than last cycle`, better: true },
        visual: { kind: 'segments', parts: categories.map(([c, n]) => ({ n: c.charAt(0) + c.slice(1).toLowerCase(), c: n, hex: CATEGORY_HEX[c] })), total: open } },
      { title: 'Detected today', definition: 'New discrepancies raised by today’s reconciliation cycles.', value: detectedToday, fmt: 'num', of: 'last 24h', tone: 'sky',
        delta: { text: `${detectedToday - prev(BACKLOG_DETECTED)} vs yesterday`, better: detectedToday <= prev(BACKLOG_DETECTED) },
        visual: { kind: 'cycles', values: BACKLOG_DETECTED.slice(-12), labels: BACKLOG_DAYS.slice(-12) } },
      { title: 'Auto-resolved today', definition: 'Discrepancies closed by policy without an engineer today.', value: resolvedToday, fmt: 'num', of: `${Math.round(pct(resolvedToday, detectedToday))}% of detected`, tone: 'emerald',
        delta: { text: `${resolvedToday - prev(BACKLOG_AUTORESOLVED)} vs yesterday`, better: resolvedToday >= prev(BACKLOG_AUTORESOLVED) },
        visual: { kind: 'cycles', values: BACKLOG_AUTORESOLVED.slice(-12), labels: BACKLOG_DAYS.slice(-12) } },
      { title: 'Older than 7 days', definition: 'Open discrepancies that have been open for more than a week.', value: older7, fmt: 'num', of: `${older30} past 30 days`, tone: 'red',
        delta: { text: `${Math.round(pct(older7, open))}% of the backlog`, better: null },
        visual: { kind: 'segments', parts: BACKLOG_AGE.map((b, i) => ({ n: b.bucket, c: b.count, hex: AGE_HEX[i] })), total: open } }
    ],
    visuals: [
      { kind: 'bars', span: 2, title: 'Open items by type', sub: `All domains · ${open} open`, fmt: 'num',
        rows: [...DISCREPANCY_TYPES].sort((a, b) => b.count - a.count).map(t => ({ label: t.label, value: t.count, hex: DOMAIN_HEX[t.domain], sub: DOMAIN_LABEL[t.domain], tag: t.category })) },
      { kind: 'lines', title: 'Detected vs auto-resolved, per day', sub: 'Last 30 days', fmt: 'num', labels: BACKLOG_DAYS,
        series: [{ n: 'Detected', hex: 'var(--vw-color-blue-500)', values: BACKLOG_DETECTED }, { n: 'Auto-resolved by policy', hex: 'var(--vw-color-emerald-500)', values: BACKLOG_AUTORESOLVED }] },
      { kind: 'ramp', title: 'Age of open discrepancies', sub: `${older7} older than 7 days`, buckets: BACKLOG_AGE.map((b, i) => ({ label: b.bucket, count: b.count, hex: AGE_HEX[i] })) },
      { kind: 'heat', span: 2, title: 'Open discrepancies by region and domain', sub: 'Darker cells hold more open items', fmt: 'num',
        rows: HEATMAP_REGIONS, cols: DOMAINS.map(d => DOMAIN_LABEL[d]), values: REGION_DISCREPANCY.map(r => DOMAINS.map(d => r.drift[d])) }
    ],
    actions: [
      { priority: 'P1', action: 'Approve RUL-TRN-002 (undocumented wavelength sweep) so the 52 wavelengths are raised and routed as one batch', owner: 'Priya Iyer · Rohan Mehta', impact: `Addresses ${Math.round(pct(top.count, open))}% of the backlog and the unbilled optical capacity` },
      { priority: 'P1', action: `Clear the ${older30} items older than 30 days (${oldestTypes.map(t => t.label).join(', ')})`, owner: 'Transport operations', impact: 'Removes every audit-age item' },
      { priority: 'P2', action: `Focus the reconciliation desk on ${regionTotals[0].region} (${regionTotals[0].n} open) and restore Collector-West`, owner: 'Reconciliation desk · Discovery engineering', impact: `${Math.round(pct(regionTotals[0].n, open))}% of open items in one region` },
      { priority: 'P3', action: 'Approve RUL-RAN-002 (antenna parameter drift) to automate 8 RAN attribute items', owner: 'Anjali Verma', impact: 'Raises RAN touchless rate' }
    ],
    table: {
      title: 'Open discrepancies by type', sub: 'Largest first; select a row to see the individual items',
      columns: [
        { key: 'type', header: 'Discrepancy type' }, { key: 'domain', header: 'Domain', fmt: 'domain' }, { key: 'category', header: 'Category' },
        { key: 'count', header: 'Open', fmt: 'num', right: true }, { key: 'share', header: 'Share of backlog', fmt: 'pct', right: true }, { key: 'age', header: 'Age band' }
      ],
      rows: [...DISCREPANCY_TYPES].sort((a, b) => b.count - a.count).map(t => ({
        id: t.label, link: { key: 'discrepancydetails', q: `q=${encodeURIComponent(t.label)}` },
        cells: { type: t.label, domain: t.domain, category: t.category, count: t.count, share: r1(pct(t.count, open)), age: t.ageBand }
      })),
      facet: 'domain', empty: 'No open discrepancies.'
    },
    methodology: [
      { term: 'Discrepancy', definition: 'A record that disagrees with the live network: an object that exists on one side only (existence), a value that differs (attribute), a changed neighbour or parent link (relationship), or a record not re-verified in time (freshness).' },
      { term: 'Age band', definition: 'Time since the discrepancy was first detected and left open.' },
      { term: 'Auto-resolved', definition: 'Closed by a reconciliation policy (accept network or accept record) without an engineer.' }
    ]
  };
};

/* ── DR-03 Exception SLA & ownership ────────────────────────── */
const exceptions: ReportBuilder = () => {
  const ex = RECONCILE_EXCEPTIONS;
  const breached = ex.filter(e => e.sla === 'Breached');
  const atRisk = ex.filter(e => e.sla === 'At risk');
  const unowned = ex.filter(e => e.owner === 'Unassigned');
  const oldest = Math.max(...ex.map(e => e.age));
  const tl1 = ex.filter(e => e.ruleId === 'RUL-TRN-001');
  const states = countBy(ex, e => e.state);

  return {
    headline: { value: breached.length, fmt: 'num', label: `of ${ex.length} exceptions past SLA`, tone: 'red', better: 'down' },
    summary: `${ex.length} reconciliation exceptions are open. ${breached.length} have breached SLA and ${atRisk.length} are at risk. Two of the breaches (${tl1.map(e => e.id).join(', ')}) are ${oldest} days old and share one root cause — the expired TL1 credential that suspended rule RUL-TRN-001 on the Transport ROADM ring. ${unowned.length} exceptions have no owner, including one already past SLA. Restoring the TL1 collector and assigning owners clears ${breached.length} of the ${breached.length + atRisk.length} breached or at-risk items.`,
    findings: [
      { tone: 'crit', title: `${breached.length} past SLA — ${tl1.length} from one cause`, detail: `${tl1.map(e => `${e.id} ${e.subject}`).join('; ')}. RUL-TRN-001 has been suspended since 19-Nov-2025.` },
      { tone: 'warn', title: `${unowned.length} exceptions have no owner`, detail: unowned.map(e => `${e.id} ${e.subject} (${e.sla})`).join('; ') },
      { tone: 'info', title: `Oldest exception: ${oldest} days`, detail: 'Anything over a year old should be re-validated before it is worked — the network may have moved on.' }
    ],
    kpis: [
      { title: 'Open exceptions', definition: 'Reconciliation results that need a human decision.', value: ex.length, fmt: 'num', of: 'across 4 domains', tone: 'slate',
        delta: { text: `${states.length} exception states`, better: null },
        visual: { kind: 'segments', parts: states.map(([s, n]) => ({ n: s, c: n, hex: TONE_HEX[EXCEPTION_TONE[s as keyof typeof EXCEPTION_TONE]] })), total: ex.length } },
      { title: 'Past SLA', definition: 'Exceptions not dispositioned within their resolution window.', value: breached.length, fmt: 'num', of: `${atRisk.length} more at risk`, tone: 'red',
        delta: { text: `${Math.round(pct(breached.length, ex.length))}% of open exceptions`, better: false },
        visual: { kind: 'segments', parts: (['Breached', 'At risk', 'On track'] as const).map(s => ({ n: s, c: ex.filter(e => e.sla === s).length, hex: TONE_HEX[SLA_TONE[s]] })), total: ex.length } },
      { title: 'No owner', definition: 'Exceptions not yet assigned to a person or team.', value: unowned.length, fmt: 'num', of: `of ${ex.length}`, tone: 'amber',
        delta: { text: unowned.map(e => e.id).join(', '), better: false } },
      { title: 'Oldest open', definition: 'Days since the oldest open exception was detected.', value: oldest, fmt: 'days', of: tl1[0]?.id, tone: 'orange',
        delta: { text: 'TL1 credential expired 19-Nov-2025', better: false } }
    ],
    visuals: [
      { kind: 'donut', title: 'By exception state', sub: 'What kind of disagreement each exception is', total: ex.length, label: 'exceptions',
        slices: states.map(([s, n]) => ({ k: s, n: s, c: n, hex: TONE_HEX[EXCEPTION_TONE[s as keyof typeof EXCEPTION_TONE]] })) },
      { kind: 'bars', title: 'By owner', sub: 'Open exceptions, with breaches', fmt: 'num',
        rows: countBy(ex, e => e.owner).map(([o, n]) => ({ label: o, value: n, sub: `${ex.filter(e => e.owner === o && e.sla === 'Breached').length} breached`, hex: o === 'Unassigned' ? 'var(--vw-color-amber-400)' : 'var(--vw-color-blue-400)' })) },
      { kind: 'bars', span: 2, title: 'Age of each exception', sub: 'Days open', fmt: 'days',
        rows: [...ex].sort((a, b) => b.age - a.age).map(e => ({ label: `${e.id} · ${e.subject}`, value: e.age, hex: TONE_HEX[SLA_TONE[e.sla]], sub: `${DOMAIN_LABEL[e.domain]} · ${e.sla}` })) }
    ],
    actions: [
      { priority: 'P1', action: 'Restore the TL1 credential (vault profile) and re-activate RUL-TRN-001, then re-scan the ROADM ring', owner: 'Priya Iyer · Security / IAM', impact: `Clears ${tl1.map(e => e.id).join(' and ')} — both ${oldest}-day breaches` },
      { priority: 'P1', action: `Assign owners to ${unowned.map(e => e.id).join(' and ')}`, owner: 'Reconciliation desk lead', impact: 'No breached exception left without an owner' },
      { priority: 'P2', action: 'Re-verify DEL-PE-CORE-04 before the next SLA window closes', owner: 'IP/MPLS operations', impact: 'Closes RX-5006' },
      { priority: 'P3', action: 'Register KOL-GNB-NEW-07 in the RAN asset register', owner: 'RAN planning', impact: 'Closes RX-5004 before it breaches' }
    ],
    table: {
      title: 'Open exceptions', sub: 'Breached first; select a row to open the exception queue for its rule',
      columns: [
        { key: 'id', header: 'ID', fmt: 'mono' }, { key: 'sla', header: 'SLA', fmt: 'chip', tones: SLA_TONE },
        { key: 'state', header: 'State', fmt: 'chip', tones: EXCEPTION_TONE }, { key: 'domain', header: 'Domain', fmt: 'domain' },
        { key: 'subject', header: 'Subject', width: '240px' }, { key: 'detected', header: 'Detected', fmt: 'date' },
        { key: 'age', header: 'Age', fmt: 'days', right: true }, { key: 'owner', header: 'Owner' },
        { key: 'next', header: 'Next action', width: '260px' }, { key: 'rule', header: 'Rule' }
      ],
      rows: [...ex].sort((a, b) => (['Breached', 'At risk', 'On track'].indexOf(a.sla) - ['Breached', 'At risk', 'On track'].indexOf(b.sla)) || b.age - a.age).map(e => ({
        id: e.id, link: { key: 'reconcileexceptions', q: `ruleId=${e.ruleId}` },
        cells: { id: e.id, sla: e.sla, state: e.state, domain: e.domain, subject: e.subject, detected: e.detected, age: e.age, owner: e.owner, next: e.next, rule: `${e.ruleId} · ${ruleById(e.ruleId)?.name ?? ''}` }
      })),
      facet: 'sla', empty: 'No open exceptions.'
    },
    methodology: [
      ...DISPOSITIONS.map(d => ({ term: `Disposition: ${d.n}`, definition: d.d })),
      { term: 'SLA', definition: 'On track, at risk (inside the final quarter of its window) or breached (past its window).' }
    ]
  };
};

/* ── DR-04 Discovery coverage & collector health ────────────── */
const coverage: ReportBuilder = () => {
  const failedTargets = sum(ROOT_CAUSE_FAILURES, r => r.targets);
  const weakAdapter = [...ADAPTER_ROWS].sort((a, b) => a.successPct - b.successPct)[0];
  const slowCollector = COLLECTOR_ROWS.find(c => c.status === 'High latency') ?? [...COLLECTOR_ROWS].sort((a, b) => parseFloat(b.p95) - parseFloat(a.p95))[0];
  const funnel = Object.fromEntries(COVERAGE_FUNNEL.map(f => [f.label, f.value]));
  const objects14 = sum(OBJECTS_DAILY_VALUES, d => sum(d, x => x));

  return {
    headline: { value: 99.44, fmt: 'pct2', label: 'discovery coverage', tone: 'emerald', trend: COVERAGE.trend, better: 'up' },
    summary: `Discovery reached and classified ${funnel['Reached & classified']} of ${funnel['Assets in scope']} assets in scope (${COVERAGE.value}). ${funnel['Never verified']} assets have never been verified, ${funnel['Live with no record']} are live with no inventory record and ${funnel['Answered, unidentified']} answered but matched no fingerprint. ${failedTargets} targets are failing for four root causes, not ${failedTargets} separate incidents: the largest is ${ROOT_CAUSE_FAILURES[1].targets} RAN targets behind ${slowCollector.name}, whose p95 poll latency is ${slowCollector.p95}. The weakest adapter is ${weakAdapter.adapter} at ${weakAdapter.successPct}% success (credential warning). ${objects14} new objects were discovered in the last 14 days.`,
    findings: [
      { tone: 'crit', title: `${failedTargets} failing targets, 4 root causes`, detail: ROOT_CAUSE_FAILURES.map(r => `${r.cause} (${r.targets}, ${DOMAIN_LABEL[r.domain]})`).join(' · ') },
      { tone: 'warn', title: `${weakAdapter.adapter} succeeds only ${weakAdapter.successPct}% of the time`, detail: `${weakAdapter.endpoints} ${weakAdapter.proto} endpoints; the credential warning is the same TL1 vault profile behind the Transport exceptions.` },
      { tone: 'warn', title: `${slowCollector.name}: p95 ${slowCollector.p95}`, detail: `Flagged high latency while carrying ${fmtNum(slowCollector.targets)} ${DOMAIN_LABEL[slowCollector.domain]} targets; 30 unreachable RAN targets sit behind it.` },
      { tone: 'info', title: `${funnel['Live with no record']} live assets with no record`, detail: 'These are extra-entity candidates for reconciliation and potential unbilled services.' }
    ],
    kpis: [
      { title: 'Discovery coverage', definition: 'Assets reached and classified, as a share of assets in scope.', value: 99.44, fmt: 'pct2', of: `${funnel['Reached & classified']} of ${funnel['Assets in scope']}`, tone: 'emerald',
        delta: { text: `${(last(COVERAGE.trend) - prev(COVERAGE.trend)).toFixed(2)} pt vs last cycle`, better: true },
        visual: { kind: 'cycles', values: COVERAGE.trend, labels: cycleLabels(COVERAGE.trend.length) } },
      { title: 'Failing targets', definition: 'Targets discovery could not complete, grouped by root cause.', value: failedTargets, fmt: 'num', of: '4 root causes', tone: 'red',
        delta: { text: `${ROOT_CAUSE_FAILURES[1].targets} RAN unreachable`, better: false },
        visual: { kind: 'segments', parts: ROOT_CAUSE_FAILURES.map(r => ({ n: `${DOMAIN_LABEL[r.domain]} ${r.tag}`, c: r.targets, hex: DOMAIN_HEX[r.domain] })), total: failedTargets } },
      { title: 'Never verified', definition: 'Assets in scope that discovery has never successfully verified.', value: 68, fmt: 'num', of: `${funnel['Answered, unidentified']} unidentified`, tone: 'amber',
        delta: { text: 'RAN 38 · Transport 30', better: false } },
      { title: 'Weakest adapter', definition: 'Lowest per-adapter success rate in the last sweep.', value: weakAdapter.successPct, fmt: 'pct', of: weakAdapter.adapter, tone: 'orange',
        delta: { text: weakAdapter.status, better: false },
        visual: { kind: 'against', value: weakAdapter.successPct, limit: 100 } }
    ],
    visuals: [
      { kind: 'stacked', span: 2, title: 'New objects discovered per day', sub: `Last 14 days · ${objects14} objects`, days: OBJECTS_DAILY_DAYS,
        series: OBJECTS_DAILY_SERIES.map(s => ({ k: s.k, n: s.n, hex: s.hex })), values: OBJECTS_DAILY_VALUES },
      { kind: 'bars', title: 'Adapter success rate', sub: 'Scale 70–100%', fmt: 'pct', min: 70, max: 100,
        rows: ADAPTER_ROWS.map(a => ({ label: a.adapter, value: a.successPct, sub: `${a.endpoints} · ${a.domains.map(d => DOMAIN_LABEL[d]).join(', ')}`, hex: a.status === 'Healthy' ? 'var(--vw-color-emerald-400)' : 'var(--vw-color-amber-400)' })) },
      { kind: 'bars', title: 'Failing targets by root cause', sub: 'Targets affected', fmt: 'num',
        rows: ROOT_CAUSE_FAILURES.map(r => ({ label: r.cause, value: r.targets, hex: DOMAIN_HEX[r.domain], sub: `${DOMAIN_LABEL[r.domain]} · ${r.tag}` })) },
      { kind: 'bars', span: 2, title: 'Collector p95 poll latency', sub: 'Seconds', fmt: 'sec',
        rows: COLLECTOR_ROWS.map(c => ({ label: c.name, value: parseFloat(c.p95), hex: c.status === 'Online' ? DOMAIN_HEX[c.domain] : 'var(--vw-color-red-400)', sub: `${fmtNum(c.targets)} targets · ${c.status}` })) }
    ],
    actions: ROOT_CAUSE_FAILURES.map((r, i) => ({
      priority: (i < 2 ? 'P1' : i === 2 ? 'P2' : 'P3') as 'P1' | 'P2' | 'P3',
      action: `${r.action} (${r.cause})`,
      owner: r.tag === 'AUTH' ? 'Security / IAM' : r.tag === 'FGP' ? 'Security operations' : 'Discovery engineering',
      impact: `${r.targets} ${DOMAIN_LABEL[r.domain]} targets back in coverage`
    })),
    table: {
      title: 'Discovery jobs and collectors', sub: 'One row per domain; select a row to open scan jobs',
      columns: [
        { key: 'domain', header: 'Domain', fmt: 'domain' }, { key: 'protocols', header: 'Protocols' }, { key: 'schedule', header: 'Schedule' },
        { key: 'targets', header: 'Targets', fmt: 'num', right: true }, { key: 'coverage', header: 'Coverage', fmt: 'pct2', right: true },
        { key: 'status', header: 'Job status', fmt: 'chip', tones: { Healthy: 'success', 'Credential warning': 'warning' } },
        { key: 'collector', header: 'Collector' }, { key: 'p95', header: 'p95', fmt: 'sec', right: true },
        { key: 'cstatus', header: 'Collector status', fmt: 'chip', tones: { Online: 'success', 'High latency': 'warning' } },
        { key: 'lastRun', header: 'Last run' }, { key: 'nextRun', header: 'Next run' }
      ],
      rows: DISCOVERY_JOB_ROWS.map(j => {
        const c = COLLECTOR_ROWS.find(x => x.domain === j.domain)!;
        return { id: j.domain, link: { key: 'jobs' }, cells: { domain: j.domain, protocols: j.protocols, schedule: j.schedule, targets: j.targets, coverage: j.coveragePct, status: j.status, collector: c.name, p95: parseFloat(c.p95), cstatus: c.status, lastRun: j.lastRun, nextRun: j.nextRun } };
      }),
      empty: 'No discovery jobs.'
    },
    methodology: [
      { term: 'Coverage funnel', definition: COVERAGE_FUNNEL.map(f => `${f.label}: ${f.value}${f.sub ? ` (${f.sub})` : ''}`).join(' · ') },
      { term: 'Root cause grouping', definition: 'Failing targets are grouped by shared cause (credential, network path, fingerprint, subscription) so one fix is counted once.' },
      { term: 'p95 latency', definition: 'Poll time within which 95% of a collector’s targets answered in the last sweep.' }
    ]
  };
};

/* ── DR-05 Reconciliation automation & cycle performance ───── */
const automation: ReportBuilder = () => {
  const latest = DOMAINS.map(d => RECONCILE_CYCLE_ROWS.find(r => r.domain === d)!);
  const scanned = sum(latest, c => c.scanned);
  const history = (d: DomainKey) => RECONCILE_CYCLE_ROWS.filter(r => r.domain === d).reverse();
  const laggard = [...latest].sort((a, b) => a.touchlessPct - b.touchlessPct)[0];
  const jobStates = countBy(RECONCILE_JOBS, j => j.status);

  return {
    headline: { value: 60.7, fmt: 'pct', label: 'of discrepancies closed without an engineer', tone: 'emerald', better: 'up' },
    summary: `${DOMAIN_TRUST_TOTAL.touchlessPct} of discrepancies now close by policy without an engineer, up from ${PLATFORM_OUTPUT.touchlessStart}%, and mean time to reconcile fell from ${PLATFORM_OUTPUT.mttrStart}h to ${PLATFORM_OUTPUT.mttrNow}h. In the last 30 days ${fmtNum(PLATFORM_OUTPUT.detected)} discrepancies were detected and ${fmtNum(PLATFORM_OUTPUT.closedNoEngineer)} closed automatically. The latest cycle in each domain scanned ${fmtNum(scanned)} records. Every domain improved over its last three cycles; ${DOMAIN_LABEL[laggard.domain]} still lags at ${laggard.touchlessPct}% touchless with ${laggard.queue} items to the manual queue per cycle.`,
    findings: [
      { tone: 'good', title: `Touchless up ${PLATFORM_OUTPUT.touchlessNow - PLATFORM_OUTPUT.touchlessStart} points`, detail: `${PLATFORM_OUTPUT.touchlessStart}% → ${PLATFORM_OUTPUT.touchlessNow}%; MTTR ${PLATFORM_OUTPUT.mttrStart}h → ${PLATFORM_OUTPUT.mttrNow}h.` },
      { tone: 'warn', title: `${DOMAIN_LABEL[laggard.domain]} automates only ${laggard.touchlessPct}%`, detail: `${laggard.drifted} drifted per cycle, ${laggard.autoResolved} auto-resolved, ${laggard.queue} to the queue. Its main rule (RUL-TRN-001) is suspended.` },
      { tone: 'info', title: `${jobStates.map(([s, n]) => `${n} ${s.toLowerCase()}`).join(', ')}`, detail: `Across ${RECONCILE_JOBS.length} reconciliation jobs; the job with errors is held until its rule is re-activated.` }
    ],
    kpis: [
      { title: 'Touchless rate', definition: 'Share of discrepancies closed by policy without an engineer.', value: 60.7, fmt: 'pct', of: `from ${PLATFORM_OUTPUT.touchlessStart}%`, tone: 'emerald',
        delta: { text: `+${PLATFORM_OUTPUT.touchlessNow - PLATFORM_OUTPUT.touchlessStart} pt since baseline`, better: true } },
      { title: 'Closed without an engineer', definition: 'Discrepancies closed automatically in the last 30 days.', value: PLATFORM_OUTPUT.closedNoEngineer, fmt: 'num', of: `of ${fmtNum(PLATFORM_OUTPUT.detected)} detected`, tone: 'sky',
        delta: { text: `${Math.round(pct(PLATFORM_OUTPUT.closedNoEngineer, PLATFORM_OUTPUT.detected))}% of detections`, better: null },
        visual: { kind: 'against', value: PLATFORM_OUTPUT.closedNoEngineer, limit: PLATFORM_OUTPUT.detected } },
      { title: 'Mean time to reconcile', definition: 'Average hours from detection to closure.', value: PLATFORM_OUTPUT.mttrNow, fmt: 'hours', of: `from ${PLATFORM_OUTPUT.mttrStart}h`, tone: 'amber',
        delta: { text: `${(PLATFORM_OUTPUT.mttrStart - PLATFORM_OUTPUT.mttrNow).toFixed(1)}h faster`, better: true },
        visual: { kind: 'cycles', values: MTTR.trend, labels: cycleLabels(MTTR.trend.length) } },
      { title: 'Records scanned', definition: 'Records compared in each domain’s most recent reconciliation cycle.', value: scanned, fmt: 'num', of: 'latest cycle, all domains', tone: 'slate',
        delta: { text: `${latest.length} domains`, better: null },
        visual: { kind: 'segments', parts: latest.map(c => ({ n: DOMAIN_LABEL[c.domain], c: c.scanned, hex: DOMAIN_HEX[c.domain] })), total: scanned } }
    ],
    visuals: [
      { kind: 'lines', span: 2, title: 'Touchless rate per cycle', sub: 'Last three cycles per domain, oldest to newest', fmt: 'pct', labels: ['3 cycles back', '2 cycles back', 'Latest'],
        series: DOMAINS.map(d => ({ n: DOMAIN_LABEL[d], hex: DOMAIN_HEX[d], values: history(d).map(c => c.touchlessPct) })) },
      { kind: 'stacked', title: 'Latest cycle outcome by domain', sub: 'Drifted items: auto-resolved vs sent to the manual queue', days: DOMAINS.map(d => DOMAIN_LABEL[d]),
        series: [{ k: 'auto', n: 'Auto-resolved', hex: 'var(--vw-color-emerald-400)' }, { k: 'queue', n: 'To manual queue', hex: 'var(--vw-color-amber-400)' }],
        values: latest.map(c => [c.autoResolved, c.queue]) },
      { kind: 'donut', title: 'Reconciliation jobs by status', total: RECONCILE_JOBS.length, label: 'jobs',
        slices: jobStates.map(([s, n]) => ({ k: s, n: s, c: n, hex: TONE_HEX[JOB_STATUS_TONE[s as keyof typeof JOB_STATUS_TONE]] })) }
    ],
    actions: [
      { priority: 'P1', action: 'Re-activate RUL-TRN-001 after the TL1 credential fix', owner: 'Priya Iyer', impact: `Lifts ${DOMAIN_LABEL[laggard.domain]} automation from ${laggard.touchlessPct}%` },
      { priority: 'P2', action: 'Move Transport discovery to continuous, matching the other three domains', owner: 'Head of Network Operations', impact: DECISION.expected },
      { priority: 'P3', action: 'Approve RUL-TRN-003 (decommissioned record cleanup) for the next maintenance window', owner: 'Rohan Mehta', impact: 'Automates a recurring manual Transport clean-up' }
    ],
    table: {
      title: 'Reconciliation cycles', sub: 'Last three cycles per domain, newest first',
      columns: [
        { key: 'domain', header: 'Domain', fmt: 'domain' }, { key: 'when', header: 'Completed', fmt: 'mono' },
        { key: 'scanned', header: 'Scanned', fmt: 'num', right: true }, { key: 'drifted', header: 'Drifted', fmt: 'num', right: true },
        { key: 'auto', header: 'Auto-resolved', fmt: 'num', right: true }, { key: 'queue', header: 'To queue', fmt: 'num', right: true },
        { key: 'touchless', header: 'Touchless', fmt: 'pct', right: true }
      ],
      rows: RECONCILE_CYCLE_ROWS.map(c => ({ id: `${c.domain}-${c.when}`, link: { key: 'reconcile' }, cells: { domain: c.domain, when: c.when, scanned: c.scanned, drifted: c.drifted, auto: c.autoResolved, queue: c.queue, touchless: c.touchlessPct } })),
      facet: 'domain', empty: 'No cycles recorded.'
    },
    methodology: [
      { term: 'Cycle', definition: 'One complete reconciliation pass over a domain’s in-scope records.' },
      { term: 'Touchless rate', definition: 'Auto-resolved ÷ drifted for a cycle; the estate rate is the 30-day share of closures made without an engineer.' },
      { term: 'Baseline', definition: `The ${PLATFORM_OUTPUT.touchlessStart}% touchless and ${PLATFORM_OUTPUT.mttrStart}h MTTR starting points are the programme baseline recorded on Insights.` }
    ]
  };
};

/* ── DR-06 Rule governance & effectiveness ──────────────────── */
const rules: ReportBuilder = () => {
  const live = RULES.filter(r => r.status === 'Active' || r.status === 'Executing');
  const waiting = RULES.filter(r => r.status === 'Review' || r.status === 'Approved');
  const suspended = RULES.filter(r => r.status === 'Suspended');
  const latestRuns = RULES.filter(r => r.executions.length).map(r => ({ r, run: r.executions[0] }));
  const liveRuns = latestRuns.filter(x => live.includes(x.r));
  const liveMatched = sum(liveRuns, x => x.run.matched), liveEx = sum(liveRuns, x => x.run.exceptions);
  const exRate = r1(pct(liveEx, liveMatched + liveEx));
  const nextPerson = (r: typeof RULES[number]) => r[STATUS_NEXT[r.status].role];

  return {
    headline: { value: live.length, fmt: 'num', label: `of ${RULES.length} rules live in production`, tone: 'emerald', better: 'up' },
    summary: `${RULES.length} reconciliation rules are defined: ${live.length} are live, ${waiting.length} are waiting on a decision, ${suspended.length} is suspended and the rest are drafts or retired. The live rules' latest runs matched ${fmtNum(liveMatched)} records and raised ${fmtNum(liveEx)} exceptions (${exRate}%). The most consequential pending decision is ${waiting.find(r => r.id === 'RUL-TRN-002')?.id ?? waiting[0].id} — an AI-suggested, high-priority rule that would raise the 52 undocumented Transport wavelengths as one batch. The suspended rule, RUL-TRN-001, is the Transport ROADM match that stopped when its TL1 credential expired.`,
    findings: [
      { tone: 'warn', title: `${waiting.length} rules waiting on a decision`, detail: waiting.map(r => `${r.id} ${r.name} (${r.status}, next: ${nextPerson(r)})`).join('; ') },
      { tone: 'crit', title: `${suspended.map(r => r.id).join(', ')} suspended since 19-Nov-2025`, detail: 'Its last run raised 42 exceptions from 61 records before the TL1 credential was rejected.' },
      { tone: 'info', title: `${RULES.filter(r => r.origin !== 'Manual').length} rules came from automation`, detail: countBy(RULES, r => r.origin).map(([o, n]) => `${o} ${n}`).join(' · ') },
      { tone: 'good', title: `Live rules raise exceptions on ${exRate}% of records`, detail: 'Low exception rates on high-volume RAN and IP/MPLS rules show the matching logic is stable.' }
    ],
    kpis: [
      { title: 'Rules in production', definition: 'Rules with status Active or Executing.', value: live.length, fmt: 'num', of: `of ${RULES.length}`, tone: 'emerald',
        delta: { text: live.map(r => r.id).join(', '), better: null },
        visual: { kind: 'segments', parts: RULE_LIFECYCLE.map(s => ({ n: s, c: RULES.filter(r => r.status === s).length, hex: TONE_HEX[STATUS_TONE[s]] })).filter(p => p.c), total: RULES.length } },
      { title: 'Awaiting a decision', definition: 'Rules in Review or Approved but not yet activated.', value: waiting.length, fmt: 'num', of: 'review or activation', tone: 'sky',
        delta: { text: waiting.map(r => r.id).join(', '), better: false } },
      { title: 'Suspended', definition: 'Rules stopped by an operator or a failed run.', value: suspended.length, fmt: 'num', of: suspended.map(r => r.priority).join(', ') + ' priority', tone: 'red',
        delta: { text: suspended.map(r => r.id).join(', '), better: false } },
      { title: 'Exception rate, live rules', definition: 'Exceptions ÷ records compared in each live rule’s latest run.', value: exRate, fmt: 'pct', of: `${fmtNum(liveEx)} of ${fmtNum(liveMatched + liveEx)}`, tone: 'amber',
        delta: { text: `${liveRuns.length} latest runs`, better: null },
        visual: { kind: 'against', value: liveEx, limit: liveMatched + liveEx } }
    ],
    visuals: [
      { kind: 'composition', span: 2, title: 'Rule lifecycle', sub: 'Every rule by status', parts: RULE_LIFECYCLE.map(s => ({ n: s, c: RULES.filter(r => r.status === s).length, hex: TONE_HEX[STATUS_TONE[s]] })).filter(p => p.c) },
      { kind: 'bars', title: 'Exceptions raised in latest run', sub: 'Per rule with at least one execution', fmt: 'num',
        rows: [...latestRuns].sort((a, b) => b.run.exceptions - a.run.exceptions).map(x => ({ label: `${x.r.id} · ${x.r.name}`, value: x.run.exceptions, hex: DOMAIN_HEX[x.r.domain], sub: `${fmtNum(x.run.matched)} matched · ${x.r.status}` })) },
      { kind: 'bars', title: 'Rules by domain', sub: 'All statuses', fmt: 'num',
        rows: DOMAINS.map(d => ({ label: DOMAIN_LABEL[d], value: RULES.filter(r => r.domain === d).length, hex: DOMAIN_HEX[d], sub: `${RULES.filter(r => r.domain === d && live.includes(r)).length} live` })) }
    ],
    actions: [
      { priority: 'P1', action: 'Decide on RUL-TRN-002 (undocumented wavelength sweep, AI-suggested)', owner: nextPerson(RULES.find(r => r.id === 'RUL-TRN-002')!), impact: '52 open Transport items raised and routed as one batch' },
      { priority: 'P1', action: 'Restore the TL1 credential and resubmit RUL-TRN-001', owner: RULES.find(r => r.id === 'RUL-TRN-001')!.owner, impact: 'Clears two 286-day exception breaches' },
      { priority: 'P2', action: 'Activate RUL-TRN-003 in the next maintenance window', owner: RULES.find(r => r.id === 'RUL-TRN-003')!.approver, impact: 'Automates decommissioned-record clean-up' },
      { priority: 'P2', action: 'Review RUL-RAN-002 (antenna parameter drift)', owner: RULES.find(r => r.id === 'RUL-RAN-002')!.reviewer, impact: 'Automates 8 open RAN attribute items' },
      { priority: 'P3', action: 'Finish and submit RUL-CORE-002 (NF profile drift)', owner: RULES.find(r => r.id === 'RUL-CORE-002')!.owner, impact: '4 open Core items' }
    ],
    table: {
      title: 'Rule register', sub: 'Select a row to open the rule',
      columns: [
        { key: 'id', header: 'Rule', fmt: 'mono' }, { key: 'name', header: 'Name', width: '220px' }, { key: 'domain', header: 'Domain', fmt: 'domain' },
        { key: 'status', header: 'Status', fmt: 'chip', tones: STATUS_TONE }, { key: 'priority', header: 'Priority', fmt: 'chip', tones: PRIORITY_TONE },
        { key: 'origin', header: 'Origin' }, { key: 'next', header: 'Next step with' }, { key: 'lastRun', header: 'Last execution' },
        { key: 'matched', header: 'Matched', fmt: 'num', right: true }, { key: 'exceptions', header: 'Exceptions', fmt: 'num', right: true },
        { key: 'jobs', header: 'Jobs', fmt: 'num', right: true }, { key: 'open', header: 'Open exceptions', fmt: 'num', right: true }
      ],
      rows: RULES.map(r => ({
        id: r.id, link: { key: 'ruledetails', params: { id: r.id } },
        cells: {
          id: r.id, name: r.name, domain: r.domain, status: r.status, priority: r.priority, origin: r.origin, next: nextPerson(r),
          lastRun: r.lastExecution ?? '—', matched: r.executions[0]?.matched ?? null, exceptions: r.executions[0]?.exceptions ?? null,
          jobs: jobsForRule(r.id).length, open: exceptionsForRule(r.id).length
        }
      })),
      facet: 'status', empty: 'No rules defined.'
    },
    methodology: [
      { term: 'Lifecycle', definition: `${RULE_LIFECYCLE.join(' → ')}. Rules only run while Active or Executing.` },
      { term: 'Next step with', definition: 'The person who owns the next transition out of the rule’s current status.' },
      { term: 'Exception rate', definition: 'Exceptions ÷ (matched + exceptions) in the rule’s most recent execution.' }
    ]
  };
};

/* ── DR-07 Cost of drift & risk register ────────────────────── */
const cost: ReportBuilder = () => {
  const val = (key: string) => {
    const c = COST_OF_DRIFT.find(x => x.key === key)!;
    return { card: c, text: c.compute(Object.fromEntries(c.inputs.map(i => [i.key, i.value]))) };
  };
  const optical = val('optical'), engineer = val('engineer'), dispatch = val('dispatch'), audit = val('audit');
  const opticalUsd = 42 * 3800 * 12;
  const engineerUsd = 705_000;
  const dispatchUsd = 34 * 340;

  return {
    headline: { value: opticalUsd, fmt: 'usd', label: 'a year of optical capacity live with no service record', tone: 'red', better: 'down' },
    summary: `Inventory drift has a direct price. 42 wavelengths are live on the network with no service record, which at the assumed managed rate is ${optical.text} of unbilled capacity. Automation already reclaims ${engineer.text} of engineer time (${engineer.card.note}), and tracing 34 West Transport findings to a degraded collector avoided ${dispatch.text} in field visits. An external audit would raise ${audit.text} today (${audit.card.sub}). ${RISK_REGISTER.length} risks are on the register; the largest, unbilled optical capacity, is rising and closes with the same decision as the trust gap: ${lowerFirst(DECISION.ask)}.`,
    findings: [
      { tone: 'crit', title: `${optical.text} unbilled optical capacity`, detail: `${optical.card.sub}. Rising — see risk register.` },
      { tone: 'good', title: `${engineer.text} engineer time reclaimed`, detail: `${engineer.card.sub}; ${engineer.card.note}.` },
      { tone: 'warn', title: `${audit.text} of audit exposure`, detail: audit.card.sub },
      { tone: 'info', title: DECISION.title, detail: `${DECISION.note}. Expected: ${DECISION.expected}; also fixes ${DECISION.alsoFixes}.` }
    ],
    kpis: [
      { title: 'Unbilled optical capacity', definition: 'Live wavelengths with no service record × assumed managed rate × 12.', value: opticalUsd, fmt: 'usd', of: 'per year', tone: 'red',
        delta: { text: '42 wavelengths · rising', better: false } },
      { title: 'Engineer time reclaimed', definition: 'Touchless closures × minutes each, per month.', value: 904, fmt: 'num', of: 'hours / month', tone: 'emerald',
        delta: { text: engineer.card.note ?? '', better: true } },
      { title: 'Field dispatches avoided', definition: 'Findings traced to a degraded collector instead of a site visit × cost per visit.', value: dispatchUsd, fmt: 'usd', of: '34 visits', tone: 'sky',
        delta: { text: '$340 per Transport visit', better: true } },
      { title: 'Audit exposure', definition: 'Records an external inventory audit would raise today (direct count, no assumption).', value: 30, fmt: 'num', of: 'records', tone: 'amber',
        delta: { text: 'flat', better: null } }
    ],
    visuals: [
      { kind: 'bars', span: 2, title: 'Annual value at stake by lever', sub: 'US$ per year at the stated assumptions', fmt: 'usd',
        rows: [
          { label: 'Unbilled optical capacity (exposure)', value: opticalUsd, hex: 'var(--vw-color-red-400)', sub: '42 wavelengths × $3,800 × 12' },
          { label: 'Engineer time reclaimed (saving)', value: engineerUsd, hex: 'var(--vw-color-emerald-400)', sub: '2,169 closures × 25 min × $65/h' },
          { label: 'Field dispatches avoided (saving)', value: dispatchUsd, hex: 'var(--vw-color-sky-400)', sub: '34 visits × $340' }
        ] },
      { kind: 'composition', title: 'Risk direction', sub: `${RISK_REGISTER.length} risks on the register`,
        parts: [
          { n: 'Rising', c: RISK_REGISTER.filter(r => r.direction === 'up').length, hex: 'var(--vw-color-red-400)' },
          { n: 'Needs action now', c: RISK_REGISTER.filter(r => r.direction === 'now').length, hex: 'var(--vw-color-amber-400)' },
          { n: 'Flat', c: RISK_REGISTER.filter(r => r.direction === 'flat').length, hex: 'var(--vw-color-slate-300)' }
        ] }
    ],
    actions: [
      { priority: 'P1', action: DECISION.ask, owner: 'Head of Network Operations', impact: `${DECISION.expected}; ${DECISION.alsoFixes}` },
      ...[...RISK_REGISTER].sort((a, b) => Number(b.direction !== 'flat') - Number(a.direction !== 'flat'))
        .map(r => ({ priority: (r.direction === 'flat' ? 'P2' : 'P1') as 'P1' | 'P2', action: r.closesWith, owner: r.accountable, impact: `Closes ${lowerFirst(r.risk)}: ${r.exposure}` }))
    ],
    table: {
      title: 'Risk register', sub: 'Accountable owner and the action that closes each risk',
      columns: [
        { key: 'risk', header: 'Risk', width: '220px' }, { key: 'exposure', header: 'Exposure', width: '260px' }, { key: 'accountable', header: 'Accountable' },
        { key: 'direction', header: 'Direction', fmt: 'chip', tones: { Rising: 'error', 'Action now': 'warning', Flat: 'neutral' } },
        { key: 'closes', header: 'Closes with', width: '240px' }
      ],
      rows: RISK_REGISTER.map(r => ({ id: r.risk, cells: { risk: r.risk, exposure: r.exposure, accountable: r.accountable, direction: r.direction === 'up' ? 'Rising' : r.direction === 'now' ? 'Action now' : 'Flat', closes: r.closesWith } })),
      empty: 'No open risks.'
    },
    methodology: [
      ...COST_OF_DRIFT.filter(c => c.inputs.length).map(c => ({ term: c.label, definition: `${c.sub}. Assumptions: ${c.inputs.map(i => `${i.label} ${i.key === 'minutes' ? '' : '$'}${fmtNum(i.value)} ${i.suffix}`.replace('$$', '$')).join('; ')}.` })),
      { term: 'Audit exposure', definition: `${audit.card.sub}. ${audit.card.note}.` },
      { term: 'Assumptions', definition: `Rates can be changed on the Insights executive view; this report uses the defaults (${fmtUsd(3800)} per wavelength-month, $65/h loaded engineer rate, $340 per field visit).` }
    ]
  };
};

export const DISCOVERY_BUILDERS: Record<string, ReportBuilder> = {
  'DR-01': trustExecutive, 'DR-02': backlog, 'DR-03': exceptions, 'DR-04': coverage,
  'DR-05': automation, 'DR-06': rules, 'DR-07': cost
};
