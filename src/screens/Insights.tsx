import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cv, InfoTip } from '../components/ui';
import { StackedBars, RampBars, Sparkline, MultiLineChart } from '../components/charts';
import { Drawer } from '../components/Drawer';
import { Code, Delta, DomainTag, Ic, Meter, ModuleRule, Panel, Pill, SectionHeader, Seg, type Tone } from '../components/ops';
import { legacyPath } from '../routes';
import {
  TRUST_METRICS, DISCOVERY_JOB_ROWS, OBJECTS_DAILY_DAYS, OBJECTS_DAILY_SERIES, OBJECTS_DAILY_VALUES,
  ADAPTER_ROWS, ROOT_CAUSE_FAILURES, RECONCILE_CYCLE_ROWS, RECONCILE_NEXT,
  MATCH_OUTCOME, MATCH_TOTAL_NOTE, DISCREPANCY_TYPES, BACKLOG_DAYS, BACKLOG_DETECTED, BACKLOG_AUTORESOLVED,
  BACKLOG_AGE, DOMAIN_TRUST_ROWS, DOMAIN_TRUST_TOTAL, REGION_DISCREPANCY,
  DOMAIN_HEX, DOMAIN_LABEL, type DomainKey, type TrustMetric,
  type AdapterRow, type RootCauseFailure, type ReconcileCycleRow
} from '../data/discoveryOverview';
import { domainToUrl } from './DomainDevices';

/* one drawer, three possible row shapes — simpler than three parallel
   useState hooks for what is, on screen, always exactly one open panel */
type DrawerState =
  | { kind: 'adapter'; row: AdapterRow }
  | { kind: 'failure'; row: RootCauseFailure }
  | { kind: 'cycle'; row: ReconcileCycleRow };

function drawerTitle(d: DrawerState): string {
  switch (d.kind) {
    case 'adapter': return d.row.adapter;
    case 'failure': return d.row.cause;
    case 'cycle': return `${DOMAIN_LABEL[d.row.domain]} reconciliation cycle`;
  }
}
function drawerSub(d: DrawerState): string {
  return d.kind === 'adapter' ? d.row.domains.map(x => DOMAIN_LABEL[x]).join(' · ') : DOMAIN_LABEL[d.row.domain];
}

/* RAN, Transport, Core, IP/MPLS — the one display order every table, legend
   and heatmap on this page uses, so a reader never meets the four domains in
   a different sequence from one card to the next. DOMAIN_HEX keeps its own
   key order (it's shared with the Reconciliation page), so this is local. */
const DOMAIN_KEYS: DomainKey[] = ['RAN', 'Transport', 'Core', 'IPMPLS'];
const byDomain = <T extends { domain: DomainKey }>(rows: T[]) =>
  [...rows].sort((a, b) => DOMAIN_KEYS.indexOf(a.domain) - DOMAIN_KEYS.indexOf(b.domain));
const n = (v: number) => v.toLocaleString('en-IN');

const TONE_HEX: Record<Tone, string> = {
  success: cv('emerald', 500), warning: cv('amber', 500), critical: cv('red', 500), info: cv('blue', 500), neutral: cv('slate', 400)
};

/* Match outcome → the Discrepancy details screen's own category filter.
   "Matched" has nothing to drill into (it's the healthy population, not a
   discrepancy), so it's the one tile with no entry here and stays inert. */
const MATCH_OUTCOME_CATEGORY: Partial<Record<string, string>> = {
  'Attribute mismatch': 'ATTRIBUTE',
  'Extra — no record': 'EXISTENCE',
  'Relationship drift': 'RELATIONSHIP',
  'Missing — no live peer': 'EXISTENCE'
};
const MATCH_OUTCOME_DEF: Record<string, string> = {
  'Matched': 'The record’s identity, attributes and relationships all agree with the live network — no reconciliation action needed.',
  'Attribute mismatch': 'The record exists and its identity matches, but one or more attribute values differ from what the live network reports.',
  'Extra — no record': 'The live network reports an object that has no corresponding record in inventory.',
  'Relationship drift': 'The record exists but its relationships — neighbours, parent/child links — no longer match what the live network reports.',
  'Missing — no live peer': 'Inventory has a record for this object, but the live network no longer reports it.'
};

/* one-sentence explanations for the ⓘ beside a KPI or card title —
   plain language, never repeating the numbers already on screen */
const KPI_DEF: Record<string, string> = {
  'Inventory trust index': 'Share of in-scope inventory where discovery and reconciliation agree with the live network — the single top-line trust signal for this page.',
  'Discovery coverage': 'Share of known inventory that a discovery scan has actually reached and answered at least once.',
  'Open discrepancy backlog': 'Records where discovery or reconciliation disagrees with the live network and the difference hasn’t been resolved yet.',
  'Mean time to reconcile': 'Average time from a discrepancy being detected to it being resolved, whether closed automatically or by an engineer.'
};
const CARD_DEF: Record<string, string> = {
  'Discovery jobs': 'Scheduled discovery scans, one row per domain, with the adapters they use and how much of that domain’s inventory they currently cover.',
  'New items discovered per day': 'New assets discovery has found for the first time each day, split out by domain.',
  'Discovery adapters': 'The protocols discovery uses to reach devices, and how reliably each one succeeds across the domains it covers.',
  'Failures by root cause': 'Scan attempts that failed, grouped by their underlying cause rather than by device, so one fix can clear many failures at once.',
  'Match classes': 'How reconciliation classified every compared record last cycle — matched, or one of the ways a record can disagree with the live network.',
  'By domain': 'Inventory trust broken down by domain — in-scope, in-sync, and the open backlog and repair time each domain is carrying.',
  'Open discrepancies by region': 'Where the open discrepancy backlog is concentrated geographically, one cell per region × domain.',
  'Detected vs auto-resolved, per day': 'New discrepancies found each day, and how many were closed automatically by policy without an engineer.',
  'Age of open discrepancies': 'How long the currently open discrepancies have sat unresolved — the older the bucket, the more attention it likely needs.',
  'Open items by type': 'The open backlog broken down by the specific kind of discrepancy, so the most common failure patterns stand out.',
  'Reconciliation cycles': 'Each domain’s last 3 completed reconciliation runs, trended oldest to newest, plus what’s scheduled to run next.'
};

/* the failure tag → how it reads to an operator: what class of problem it
   is, how urgent the tone should be, and an icon that says the same thing */
const FAIL_CAT: Record<RootCauseFailure['tag'], { label: string; tone: Tone; icon: ReactNode }> = {
  AUTH: { label: 'Credentials', tone: 'warning', icon: Ic.key(17) },
  NET: { label: 'Reachability', tone: 'critical', icon: Ic.offline(17) },
  FGP: { label: 'Fingerprint', tone: 'info', icon: Ic.finger(17) }
};

const Dom = ({ domain, sm, muted }: { domain: DomainKey; sm?: boolean; muted?: boolean }) =>
  <DomainTag hex={DOMAIN_HEX[domain]} label={DOMAIN_LABEL[domain]} sm={sm} muted={muted} />;

/* ── KPI hero cards ────────────────────────────────────────────────────
   Everything shown is read off TRUST_METRICS: the value, its trend, and the
   target the `sub` line already names. What's derived here is only the
   reading of those numbers — above or below target, rising or falling — so
   the card can say it in a status pill instead of leaving it to the reader. */
const numOf = (s: string) => parseFloat(s.replace(/[^\d.]/g, ''));
interface KpiRead {
  value: number; unit: string; target: number | null; tone: Tone; status: string; higherIsBetter: boolean;
  delta?: number; deltaUnit?: string; scaleMin?: number; scaleMax?: number;
}
function kpiRead(m: TrustMetric): KpiRead {
  const value = numOf(m.value);
  const unit = m.value.replace(/[\d.,\s]/g, '');
  const first = m.trend[0], last = m.trend[m.trend.length - 1];
  const targetM = /target\s+([\d.]+)/i.exec(m.sub);
  const target = targetM ? parseFloat(targetM[1]) : null;
  switch (m.label) {
    case 'Inventory trust index': {
      const gap = target !== null ? target - value : 0;
      return { value, unit, target, tone: (gap > 0 ? 'warning' : 'success') as Tone,
        status: gap > 0 ? `${gap.toFixed(2)} pt below target` : 'On target', higherIsBetter: true, scaleMin: 95, scaleMax: 100 };
    }
    case 'Discovery coverage':
      return { value, unit, target: null, tone: (value >= 99 ? 'success' : 'warning') as Tone,
        status: value >= 99 ? 'Healthy' : 'Below 99%', higherIsBetter: true, delta: last - first, deltaUnit: ' pt' };
    case 'Open discrepancy backlog':
      return { value, unit, target: null, tone: (last <= first ? 'info' : 'warning') as Tone,
        status: last < first ? 'Falling' : last > first ? 'Rising' : 'Flat', higherIsBetter: false, delta: last - first, deltaUnit: '' };
    default: { /* Mean time to reconcile */
      const over = target !== null ? value - target : 0;
      return { value, unit, target, tone: (over > 0 ? 'warning' : 'success') as Tone,
        status: over > 0 ? `${over.toFixed(1)}h above target` : 'Within target', higherIsBetter: false,
        delta: last - first, deltaUnit: 'h', scaleMin: 0, scaleMax: Math.ceil(Math.max(value, target ?? 0) * 1.25) };
    }
  }
}

/* the hero's own `sub` reads "▲ 0.41 pt vs 7 days ago · target 99.00%":
   the arrow + figure become a Delta, the period stays as text, the target
   is drawn as a bar instead of repeated in words */
function splitHeroSub(sub: string) {
  const m = /^([▲▼])\s*([^\s]+(?:\s+[a-z.]+)?)\s*(.*)$/.exec(sub);
  if (!m) return { delta: null, rest: sub };
  return { delta: { up: m[1] === '▲', figure: m[2] }, rest: m[3].split(' · ')[0] };
}

function TargetBar({ value, target, min, max, hex, higherIsBetter, format }: {
  value: number; target: number; min: number; max: number; hex: string; higherIsBetter: boolean; format: (v: number) => string;
}) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, (v - min) / (max - min) * 100)).toFixed(1)}%`;
  return (
    <div className="ix-target" role="img" aria-label={`${format(value)} against a ${format(target)} target`}>
      <span>{format(min)}</span>
      <span className="ix-target-t">
        <span className="ix-target-f" style={{ width: pos(value), background: hex }} />
        <span className="ix-target-m" style={{ left: pos(target) }} title={`target ${format(target)}`} />
      </span>
      <span>target <b>{format(target)}</b>{higherIsBetter ? '' : ' or less'}</span>
    </div>
  );
}

/* region × domain drift cell — a solid block on one blue intensity scale:
   the thing compared across a row is severity, not which domain it is */
const REGION_HEAT_STEPS = [50, 100, 200, 300, 400, 500, 600] as const;
const REGION_HEAT_MAX = Math.max(...REGION_DISCREPANCY.flatMap(r => Object.values(r.drift)));
function heatShade(v: number, max: number) {
  const r = v / max;
  return r > 0.9 ? 600 : r > 0.7 ? 500 : r > 0.5 ? 400 : r > 0.3 ? 300 : r > 0.15 ? 200 : r > 0.05 ? 100 : 50;
}
/* age histogram — one shade per bucket, oldest the darkest */
const AGE_RAMP = [cv('blue', 200), cv('blue', 300), cv('blue', 400), cv('blue', 500), cv('blue', 700)];

/* reconciliation-run bars share one scale across every domain (a 53% run is
   visibly shorter than a 75% one), floored just under the lowest run so a
   3-point move within a domain still shows */
const CYCLE_PCTS = RECONCILE_CYCLE_ROWS.map(c => c.touchlessPct);
const CYCLE_LO = Math.min(...CYCLE_PCTS) - 6, CYCLE_HI = Math.max(...CYCLE_PCTS) + 2;
const cycleBarPx = (pct: number) => Math.round(8 + (pct - CYCLE_LO) / (CYCLE_HI - CYCLE_LO) * 40);

export default function Insights() {
  const nav = useNavigate();
  const openDomain = (d: DomainKey, region?: string) =>
    nav(`/discovery/insights/domain/${domainToUrl(d)}${region ? `?region=${encodeURIComponent(region)}` : ''}`);
  const [objRange, setObjRange] = useState<'7d' | '14d'>('14d');
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  /* the row's own fix action is a real local acknowledgement, not a fake
     network round-trip — the button records that it was requested and
     disables, the same honest "no backend" idiom used everywhere else in
     this app rather than a toast claiming a system it did something */
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const toDiscrepancies = (params: Record<string, string> = {}) => {
    const p = new URLSearchParams(params);
    nav(`/discovery/insights/discrepancies${p.toString() ? '?' + p.toString() : ''}`);
  };
  /* opens Scan jobs filtered to this domain's fleet. Scan jobs' own crumb
     has no Insights parent, so this names its origin via drill/from so the
     reader gets a real "Insights > {domain}" trail back. */
  const toJobs = (d: DomainKey) => {
    const domainLabel = DOMAIN_LABEL[d];
    nav(legacyPath('jobs', { label: domainLabel, from: 'Insights', q: `domain=${domainLabel}` }));
  };
  /* the 3 non-hero KPI tiles each have one real, meaningful destination;
     "Inventory trust index" itself stays a plain figure — there's no single
     drill-down it names the way the other three do */
  const KPI_TARGET: Partial<Record<string, () => void>> = {
    'Discovery coverage': () => nav('/discovery/targets'),
    'Open discrepancy backlog': () => toDiscrepancies(),
    'Mean time to reconcile': () => openDomain('Transport')
  };
  const KPI_HINT: Record<string, string> = {
    'Discovery coverage': 'View Scan targets',
    'Open discrepancy backlog': 'View all open discrepancies',
    'Mean time to reconcile': 'View Transport, the current outlier'
  };
  const objDays = objRange === '7d' ? OBJECTS_DAILY_DAYS.slice(-7) : OBJECTS_DAILY_DAYS;
  const objValues = objRange === '7d' ? OBJECTS_DAILY_VALUES.slice(-7) : OBJECTS_DAILY_VALUES;
  const objTotal = objValues.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  const objToday = OBJECTS_DAILY_VALUES[OBJECTS_DAILY_VALUES.length - 1].reduce((a, b) => a + b, 0);
  const backlogOlder = BACKLOG_AGE.slice(3).reduce((a, b) => a + b.count, 0);
  const failedTargets = ROOT_CAUSE_FAILURES.reduce((a, f) => a + f.targets, 0);
  const openTotal = DISCREPANCY_TYPES.reduce((a, r) => a + r.count, 0);
  const lastCycle = RECONCILE_CYCLE_ROWS[0];
  const mttrMax = Math.max(...DOMAIN_TRUST_ROWS.map(d => d.mttrHours));
  const onKey = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  };

  return (
    <div className="page ix">
      {/* ── page header ─────────────────────────────────────────── */}
      <div className="ix-head">
        <div>
          <div className="ix-eyebrow">Discovery and reconciliation</div>
          <h1 className="ix-title">Insights</h1>
          <div className="ix-desc">
            How much of the estate discovery reaches, how much of it reconciliation trusts, and what stands between today’s figure and the target.
          </div>
        </div>
        <div className="ix-context" aria-label="Page context">
          <span className="ix-ctx">{Ic.layers(14)}<b>{DOMAIN_KEYS.length}</b> domains · <b>{DOMAIN_TRUST_TOTAL.inScope}</b> assets in scope</span>
          <span className="ix-ctx">{Ic.clock(14)}Last cycle <b>{lastCycle.when}</b> · {DOMAIN_LABEL[lastCycle.domain]}</span>
          <span className="ix-ctx">{Ic.calendar(14)}Next <b>{DOMAIN_LABEL[RECONCILE_NEXT.domain]}</b> at {RECONCILE_NEXT.at} · in {RECONCILE_NEXT.eta}</span>
          <span className="ix-ctx ix-ctx-domains" aria-label="Domain colour key">
            {DOMAIN_KEYS.map(d => <Dom key={d} domain={d} sm />)}
          </span>
        </div>
      </div>

      {/* ── inventory trust: the four headline figures ───────────── */}
      <section className="ix-section" aria-labelledby="ix-trust">
        <SectionHeader title="Inventory trust" description="The headline figures — where the estate stands today, which way each is moving, and how far it is from target." />
        <div className="ix-kpis">
          {TRUST_METRICS.map(m => {
            const r = kpiRead(m);
            const to = KPI_TARGET[m.label];
            const Wrap = to ? 'button' : 'div';
            const hero = splitHeroSub(m.sub);
            const hex = TONE_HEX[r.tone];
            const fmt = (v: number) => `${n(+v.toFixed(2))}${r.unit}`;
            return (
              <Wrap key={m.label} className={`ix-kpi${m.hero ? ' is-hero' : ''}`}
                style={{ ['--ix-accent' as string]: hex }}
                {...(to ? { onClick: to, title: KPI_HINT[m.label] } : {})}>
                <div className="ix-kpi-top">
                  <span className="ix-kpi-l">{m.label}
                    {KPI_DEF[m.label] && <InfoTip text={KPI_DEF[m.label]} label={`What ${m.label.toLowerCase()} means`} />}
                  </span>
                  <Pill tone={r.tone}>{r.status}</Pill>
                </div>
                <div className="ix-kpi-row">
                  <span className="ix-kpi-v">{n(r.value)}<span className="ix-kpi-u">{r.unit}</span></span>
                  {m.hero && hero.delta && <Delta dir={hero.delta.up ? 'up' : 'down'} good={hero.delta.up}>{hero.delta.figure}</Delta>}
                  {!m.hero && r.delta !== undefined && r.delta !== 0 && (
                    <Delta dir={r.delta > 0 ? 'up' : 'down'} good={r.higherIsBetter ? r.delta > 0 : r.delta < 0}>
                      {n(+Math.abs(r.delta).toFixed(2))}{r.deltaUnit} vs trend start
                    </Delta>
                  )}
                </div>
                <div className="ix-kpi-sub">{m.hero ? hero.rest : m.sub}</div>
                <div className="ix-kpi-foot">
                  {r.target !== null && r.scaleMin !== undefined && (
                    <TargetBar value={r.value} target={r.target} min={r.scaleMin} max={r.scaleMax!} hex={hex}
                      higherIsBetter={r.higherIsBetter} format={fmt} />
                  )}
                  <Sparkline values={m.trend} height={30} hex={hex} />
                </div>
              </Wrap>
            );
          })}
        </div>
      </section>

      <ModuleRule num="I" label="Discovery" meta={<>
        <b>{DISCOVERY_JOB_ROWS.length}</b> jobs · <b>{ADAPTER_ROWS.length}</b> adapters · <b>{ROOT_CAUSE_FAILURES.length}</b> root causes · <b>{failedTargets}</b> failed targets
      </>} />

      {/* ── jobs + daily discovery ───────────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Jobs and daily discovery" description="What each domain’s scan covers, on what schedule, and how many new assets it has been turning up." />
        <div className="ix-grid is-wide" style={{ ['--cols' as string]: 'minmax(0, 1.35fr) minmax(0, 1fr)' }}>
          <Panel title="Discovery jobs" info={CARD_DEF['Discovery jobs']} description="Schedule, coverage and adapters per domain · click a row to open its scan jobs" flush>
            <table className="ix-table">
              <thead><tr>
                <th>Domain · adapters</th><th>Schedule</th><th className="t-r">Targets</th><th className="t-r">Coverage</th>
                <th>Last → next run</th><th>Health</th>
              </tr></thead>
              <tbody>{byDomain(DISCOVERY_JOB_ROWS).map(j => (
                <tr key={j.domain} className="is-click" tabIndex={0} onClick={() => toJobs(j.domain)} onKeyDown={onKey(() => toJobs(j.domain))}
                  aria-label={`View ${DOMAIN_LABEL[j.domain]} scan jobs`}>
                  <td><Dom domain={j.domain} /><span className="ix-secondary">{j.protocols}</span></td>
                  <td>{j.schedule}</td>
                  <td className="t-r num">{n(j.targets)}</td>
                  <td className="t-r"><Meter pct={j.coveragePct} hex={DOMAIN_HEX[j.domain]} /></td>
                  <td><span className="ix-primary">{j.lastRun}</span><span className={`ix-secondary${j.nextRun === 'sweeping now' ? ' ix-good' : ''}`} style={{ fontWeight: 500 }}>→ {j.nextRun}</span></td>
                  <td>
                    <Pill tone={j.status === 'Healthy' ? 'success' : 'warning'} icon={j.status === 'Healthy' ? Ic.check(11) : Ic.alert(11)}>{j.status}</Pill>
                  </td>
                </tr>))}
              </tbody>
            </table>
          </Panel>

          <Panel title="New items discovered per day" info={CARD_DEF['New items discovered per day']} className="ix-chart"
            description={<span className="ix-stats"><span>Last {objRange === '7d' ? 7 : 14} days</span><span><b>{objTotal}</b> new items</span><span><b>{objToday}</b> today</span><span>avg <b>{(objTotal / objDays.length).toFixed(1)}</b>/day</span></span>}
            right={<Seg label="Range" value={objRange} onChange={setObjRange} options={[{ k: '7d', n: '7d' }, { k: '14d', n: '14d' }]} />}>
            <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <StackedBars days={objDays} series={OBJECTS_DAILY_SERIES} values={objValues} height={236} />
            </div>
          </Panel>
        </div>
      </section>

      {/* ── adapters + scan failures ─────────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Adapters and scan failures" description="The protocols discovery speaks, how reliably each one gets through — and the failed attempts grouped by root cause, one fix per row." />
        <div className="ix-grid" style={{ ['--cols' as string]: 'minmax(0, 1fr) minmax(0, 1.2fr)' }}>
          <Panel title="Discovery adapters" info={CARD_DEF['Discovery adapters']} description="Endpoint counts and per-adapter success" flush>
            <table className="ix-table">
              <thead><tr><th>Adapter</th><th>Domains</th><th className="t-r">Endpoints</th><th className="t-r">Success</th><th>Status</th></tr></thead>
              <tbody>{ADAPTER_ROWS.map(a => (
                <tr key={a.adapter} className="is-click" tabIndex={0} onClick={() => setDrawer({ kind: 'adapter', row: a })}
                  onKeyDown={onKey(() => setDrawer({ kind: 'adapter', row: a }))} aria-label={`View ${a.adapter} adapter details`}>
                  <td><span className="ix-primary">{a.adapter}</span><span className="ix-secondary mono">{a.proto}</span></td>
                  <td><span className="ix-doms">{a.domains.map(d => <Dom key={d} domain={d} sm />)}</span></td>
                  <td className="t-r num">{a.endpoints}</td>
                  <td className="t-r"><Meter pct={a.successPct} hex={a.successPct < 90 ? cv('amber', 500) : DOMAIN_HEX[a.domains[0]]} decimals={1} /></td>
                  <td><Pill tone={a.status === 'Healthy' ? 'success' : 'warning'}>{a.status}</Pill></td>
                </tr>))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Failures by root cause" info={CARD_DEF['Failures by root cause']}
            description={<><b>{failedTargets}</b> targets · <b>{ROOT_CAUSE_FAILURES.length}</b> root causes · one fix each</>} flush>
            <div>
            {ROOT_CAUSE_FAILURES.map(f => {
              const extra = f.targets - f.examples.length;
              const acted = !!requested[f.cause];
              const cat = FAIL_CAT[f.tag];
              return (
                <div key={f.cause} className="ix-fail" role="button" tabIndex={0}
                  onClick={() => setDrawer({ kind: 'failure', row: f })} onKeyDown={onKey(() => setDrawer({ kind: 'failure', row: f }))}
                  aria-label={`View details for ${f.cause}`}>
                  <span className={`ix-sev is-${cat.tone}`} title={cat.label}>{cat.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ix-fail-t">{f.cause}<Dom domain={f.domain} sm muted /></div>
                    <div className="ix-fail-m">
                      <span className="ix-fail-cat">{cat.label}</span>
                      {f.examples.map(ex => <Code key={ex}>{ex}</Code>)}
                      {extra > 0 && <Code>+{extra} more</Code>}
                    </div>
                  </div>
                  <div className="ix-fail-r">
                    <span className="ix-fail-n num">{f.targets}<small>TARGETS</small></span>
                    <button type="button" className="ix-act" disabled={acted}
                      onClick={e => { e.stopPropagation(); setRequested(r => ({ ...r, [f.cause]: true })); }}>
                      {acted ? <>{Ic.check(12)}Requested</> : <>{f.action}{Ic.chevron(12)}</>}
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </Panel>
        </div>
      </section>

      <ModuleRule num="II" label="Reconciliation" meta={<>
        <b>{n(MATCH_OUTCOME[0].value)}</b> matched · <b>{openTotal}</b> open · <b>{RECONCILE_CYCLE_ROWS.length}</b> cycles logged
      </>} />

      {/* ── match outcome ────────────────────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Match outcome" description="How the last reconciliation pass classified every compared record." />
        <Panel title="Match classes" info={CARD_DEF['Match classes']} description={MATCH_TOTAL_NOTE} flush>
          <div className="ix-tiles">
            {MATCH_OUTCOME.slice(0, 5).map((t, i) => {
              const category = MATCH_OUTCOME_CATEGORY[t.label];
              const Tile = category ? 'button' : 'div';
              return (
                <Tile key={t.label} className={`ix-tile${i === 0 ? ' is-hero' : ''}`}
                  {...(category ? { onClick: () => toDiscrepancies({ category }), title: `View ${t.label.toLowerCase()} discrepancies` } : {})}>
                  <span className="ix-tile-v num">{n(t.value)}</span>
                  <span className="ix-tile-l">{t.label}
                    {MATCH_OUTCOME_DEF[t.label] && <InfoTip text={MATCH_OUTCOME_DEF[t.label]} label={`What ${t.label.toLowerCase()} means`} />}
                  </span>
                  <span className="ix-tile-s">{i === 0 ? 'no action needed' : category ? 'open · click to view' : ''}</span>
                </Tile>
              );
            })}
          </div>
        </Panel>
      </section>

      {/* ── trust by domain and region ───────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Trust by domain and region" description="Which domain and which region is carrying the open backlog — and how long each takes to repair it." />
        <div className="ix-grid is-wide" style={{ ['--cols' as string]: 'minmax(0, 1.35fr) minmax(0, 1fr)' }}>
          <Panel title="By domain" info={CARD_DEF['By domain']} description="Trust index drawn on a 90–100% scale · click a domain to see its devices" flush>
            <table className="ix-table">
              <thead><tr>
                <th>Domain</th><th className="t-r">In scope</th><th className="t-r">Unverified</th><th className="t-r">In sync</th>
                <th className="t-r">Trust index</th><th className="t-r">Open</th><th className="t-r">MTTR</th><th className="t-r">Automated</th>
              </tr></thead>
              <tbody>{DOMAIN_TRUST_ROWS.map(d => (
                <tr key={d.domain} className="is-click" tabIndex={0} onClick={() => openDomain(d.domain)} onKeyDown={onKey(() => openDomain(d.domain))}
                  aria-label={`View ${DOMAIN_LABEL[d.domain]} domain devices`}>
                  <td><Dom domain={d.domain} /></td>
                  <td className="t-r num">{n(d.inScope)}</td>
                  <td className="t-r num">{d.unverified ?? <span className="is-dim" title="Not tracked for this domain">–</span>}</td>
                  <td className="t-r num">{n(d.inSync)}</td>
                  <td className="t-r"><Meter pct={d.trustIndexPct} hex={DOMAIN_HEX[d.domain]} min={90} decimals={2} /></td>
                  <td className="t-r num is-strong">{d.open}</td>
                  <td className="t-r num">{d.mttrHours === mttrMax ? <><span className="ix-warn">{d.mttrHours}h</span><span className="ix-mark">outlier</span></> : `${d.mttrHours}h`}</td>
                  <td className="t-r num">{d.touchlessPct}%</td>
                </tr>))}
              </tbody>
              <tfoot><tr>
                <td>All domains</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.inScope}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.unverified}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.inSync}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.trustIndexPct} <span className="is-dim" style={{ fontWeight: 400 }}>· target 99%</span></td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.open}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.mttrHours}</td>
                <td className="t-r num">{DOMAIN_TRUST_TOTAL.touchlessPct}</td>
              </tr></tfoot>
            </table>
          </Panel>

          <Panel title="Open discrepancies by region" info={CARD_DEF['Open discrepancies by region']}
            description={<>All domains · <b>{REGION_DISCREPANCY.reduce((a, r) => a + Object.values(r.drift).reduce((x, y) => x + y, 0), 0)}</b> open · click a cell for its devices</>} flush>
            <table className="ix-table">
              <thead><tr>
                <th>Region</th>
                {DOMAIN_KEYS.map(k => <th key={k} className="t-c">{DOMAIN_LABEL[k]}</th>)}
                <th className="t-r">Open</th>
              </tr></thead>
              <tbody>{REGION_DISCREPANCY.map(r => {
                const open = Object.values(r.drift).reduce((a, b) => a + b, 0);
                return (
                  <tr key={r.region}>
                    <td className="is-strong">{r.region}</td>
                    {DOMAIN_KEYS.map(k => {
                      const v = r.drift[k], shade = heatShade(v, REGION_HEAT_MAX);
                      return (
                        <td key={k} style={{ padding: '4px 6px' }}>
                          <button type="button" className="ix-heat num" onClick={() => openDomain(k, r.region)}
                            title={`${r.region} · ${DOMAIN_LABEL[k]} · ${v} open — view ${DOMAIN_LABEL[k]} devices in ${r.region}`}
                            style={{ background: cv('blue', shade), color: shade >= 500 ? 'var(--vw-color-white)' : cv('blue', 900) }}>{v}</button>
                        </td>
                      );
                    })}
                    <td className="t-r num is-strong">{open}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            <div className="ix-legend-ramp" style={{ padding: `var(--vw-space-md) var(--vw-space-lg) var(--vw-space-lg)` }}>
              <span>0</span>
              <div>{REGION_HEAT_STEPS.map(s => <span key={s} style={{ background: cv('blue', s) }} />)}</div>
              <span>{REGION_HEAT_MAX}+ open</span>
            </div>
          </Panel>
        </div>
      </section>

      {/* ── backlog ──────────────────────────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Backlog" description="Whether the platform is closing discrepancies faster than the network raises them — and how old what’s left has become." />
        <div className="ix-grid" style={{ ['--cols' as string]: 'minmax(0, 1.55fr) minmax(0, 1fr)' }}>
          <Panel title="Detected vs auto-resolved, per day" info={CARD_DEF['Detected vs auto-resolved, per day']} className="ix-chart"
            description={<span className="ix-stats"><span>Last 30 days</span><span>today <b>{BACKLOG_DETECTED[29]}</b> detected</span><span><b>{BACKLOG_AUTORESOLVED[29]}</b> auto-resolved</span><span><b>{(BACKLOG_AUTORESOLVED[29] / BACKLOG_DETECTED[29] * 100).toFixed(0)}%</b> automation</span></span>}>
            <MultiLineChart labels={BACKLOG_DAYS} height={230} format={v => n(v)}
              series={[
                { n: 'Discrepancies detected', hex: 'var(--vw-color-blue-500)', values: BACKLOG_DETECTED },
                { n: 'Auto-resolved by policy', hex: 'var(--vw-color-emerald-500)', values: BACKLOG_AUTORESOLVED }
              ]}
              detail={i => {
                const det = BACKLOG_DETECTED[i], auto = BACKLOG_AUTORESOLVED[i], eng = det - auto;
                const rate = det ? (auto / det * 100).toFixed(1) : '0.0';
                return (
                  <>
                    <div className="ch-tip-r"><span className="ch-dot" style={{ background: 'var(--vw-color-blue-500)' }} />Detected<span className="grow" /><span className="num">{det}</span></div>
                    <div className="ch-tip-r"><span className="ch-dot" style={{ background: 'var(--vw-color-emerald-500)' }} />Auto-resolved<span className="grow" /><span className="num">{auto}</span></div>
                    <div className="ch-tip-r">To engineers<span className="grow" /><span className="num">{eng}</span></div>
                    <div className="ch-tip-r ch-tip-t">Automation rate<span className="grow" /><span className="num">{rate}%</span></div>
                  </>
                );
              }} />
          </Panel>

          <Panel title="Age of open discrepancies" info={CARD_DEF['Age of open discrepancies']} className="ix-chart is-plain"
            description={<><b>{BACKLOG_AGE.reduce((a, b) => a + b.count, 0)}</b> open · <b>{backlogOlder}</b> older than 7d · oldest 41d · click a bar to view its items</>}>
            <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <RampBars height={230}
                buckets={BACKLOG_AGE.map((b, i) => ({ label: b.bucket, count: b.count, hex: AGE_RAMP[i], hint: 'Click to view these items' }))}
                onBucketClick={i => toDiscrepancies({ age: BACKLOG_AGE[i].band })} />
            </div>
          </Panel>
        </div>
      </section>

      {/* ── discrepancy types + cycles ───────────────────────────── */}
      <section className="ix-section">
        <SectionHeader title="Discrepancy types and reconciliation cycles" description="The specific kinds of drift in the backlog, and how each domain’s recent reconciliation runs have been going." />
        <div className="ix-grid" style={{ ['--cols' as string]: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <Panel title="Open items by type" info={CARD_DEF['Open items by type']} tall
            description={<>All domains · <b>{openTotal}</b> open · ranked by count</>}
            right={<span className="ix-doms">{DOMAIN_KEYS.map(d => <Dom key={d} domain={d} sm muted />)}</span>}>
            {/* the two panels in this row hold very differently-sized content
                (a fixed 14-row list vs. four domain blocks) — a shared fixed
                height with this list scrolling internally keeps both panel
                edges aligned regardless of how either side's data grows */}
            <div className="ix-bars" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
              {DISCREPANCY_TYPES.map(r => (
                <button key={r.label} type="button" className="ix-bar" title={`View ${r.label} (${DOMAIN_LABEL[r.domain]})`}
                  onClick={() => toDiscrepancies({ q: r.label })}>
                  <span className="ix-bar-l"><i style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[r.domain], flexShrink: 0 }} /><span>{r.label}</span></span>
                  <span className="ix-bar-c">{r.category}</span>
                  <span className="ix-bar-t"><span className="ix-bar-f" style={{ width: `${(r.count / DISCREPANCY_TYPES[0].count * 100).toFixed(1)}%`, background: DOMAIN_HEX[r.domain] }} /></span>
                  <span className="ix-bar-n num">{r.count}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Reconciliation cycles" info={CARD_DEF['Reconciliation cycles']} tall
            description="Latest cycle per domain · trend across its last 3 runs · click a run for detail">
            {/* RECONCILE_CYCLE_ROWS is one global feed sorted newest-first
               across all domains — grouping by domain here (rather than
               leaving the reader to pick this domain's 3 rows out of the 12
               interleaved ones by eye) is what makes "last 3 cycles per
               domain" verifiable at a glance. space-between spreads the
               panel's spare height between the four blocks as breathing
               room instead of one gap above the footer. */}
            <div className="ix-cycles">
              {DOMAIN_KEYS.map(d => {
                const cycles = RECONCILE_CYCLE_ROWS.filter(c => c.domain === d); // newest → oldest
                const latest = cycles[0];
                const oldestToNewest = [...cycles].reverse();
                const delta = latest.touchlessPct - oldestToNewest[0].touchlessPct;
                const ok = latest.touchlessPct >= 60;
                return (
                  <div key={d} className="ix-cycle">
                    <div>
                      <Dom domain={d} />
                      <span className="ix-secondary">latest {latest.when}</span>
                    </div>
                    {/* the three runs as bars on one shared scale, each labelled
                        with its own figure — history you can read, not a
                        sparkline to squint at; the newest run is the solid bar */}
                    <div className="ix-runs" role="group" aria-label={`${DOMAIN_LABEL[d]} — automated share of the last 3 runs`}>
                      {oldestToNewest.map((c, i) => {
                        const isLatest = i === oldestToNewest.length - 1;
                        return (
                          <button key={c.when} type="button" className={`ix-runbar${isLatest ? ' is-cur' : ''}`}
                            onClick={() => setDrawer({ kind: 'cycle', row: c })} title={`View ${DOMAIN_LABEL[d]} cycle detail · ${c.when}`}>
                            <span className="ix-runbar-v num">{c.touchlessPct}%</span>
                            <span className="ix-runbar-b" style={{ height: cycleBarPx(c.touchlessPct), background: DOMAIN_HEX[d] }} />
                            <span className="ix-runbar-t">{c.when.slice(0, 5)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="ix-cycle-stats">
                      <span className="ix-stat"><span className="ix-stat-k">Scanned</span><span className="ix-stat-v num">{n(latest.scanned)}</span></span>
                      <span className="ix-stat"><span className="ix-stat-k">Drifted</span><span className="ix-stat-v num">{latest.drifted}</span></span>
                      <span className="ix-stat"><span className="ix-stat-k">Auto-resolved</span><span className="ix-stat-v num">{latest.autoResolved}</span></span>
                      <span className="ix-stat"><span className="ix-stat-k">To queue</span><span className="ix-stat-v num">{latest.queue}</span></span>
                    </div>
                    <div className="ix-cycle-pct">
                      <span className={`ix-cycle-v num ${ok ? 'ix-good' : 'ix-warn'}`}>{latest.touchlessPct}%</span>
                      <span className="ix-cycle-pl">automated{delta !== 0 && <> · <Delta dir={delta > 0 ? 'up' : 'down'} good={delta > 0}>{Math.abs(delta)}pt</Delta></>}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ix-next" style={{ ['--ix-next-hex' as string]: DOMAIN_HEX[RECONCILE_NEXT.domain] }}>
              <span className="mono" style={{ fontSize: '11px' }}>{RECONCILE_NEXT.at}</span>
              <i />
              <span>Next: <b>{DOMAIN_LABEL[RECONCILE_NEXT.domain]}</b> {RECONCILE_NEXT.note} · {RECONCILE_NEXT.unverified} unverified retried · {n(RECONCILE_NEXT.inScope)} in scope · in {RECONCILE_NEXT.eta}</span>
            </div>
          </Panel>
        </div>
      </section>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer ? drawerTitle(drawer) : ''}
        sub={drawer ? drawerSub(drawer) : undefined}>
        {drawer?.kind === 'adapter' && (
          <div className="kv">
            <div><span className="k">Protocol</span><span className="v">{drawer.row.proto}</span></div>
            <div><span className="k">Domains</span><span className="v">{drawer.row.domains.map(d => DOMAIN_LABEL[d]).join(', ')}</span></div>
            <div><span className="k">Endpoints</span><span className="v">{drawer.row.endpoints}</span></div>
            <div><span className="k">Success rate</span><span className="v">{drawer.row.successPct}%</span></div>
            <div><span className="k">Status</span><span className="v"><Pill tone={drawer.row.status === 'Healthy' ? 'success' : 'warning'}>{drawer.row.status}</Pill></span></div>
          </div>
        )}
        {drawer?.kind === 'failure' && (
          <>
            <div className="kv">
              <div><span className="k">Domain</span><span className="v">{DOMAIN_LABEL[drawer.row.domain]}</span></div>
              <div><span className="k">Affected targets</span><span className="v">{drawer.row.targets}</span></div>
              <div><span className="k">Root cause</span><span className="v">{FAIL_CAT[drawer.row.tag].label} · {drawer.row.tag}</span></div>
            </div>
            <div className="ix-eyebrow" style={{ marginTop: 'var(--vw-space-lg)' }}>Examples</div>
            <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {drawer.row.examples.map(ex => <Code key={ex}>{ex}</Code>)}
            </div>
            <div className="ix-drawer-actions">
              <button type="button" className="ix-act is-ghost" onClick={() => openDomain(drawer.row.domain)}>View {DOMAIN_LABEL[drawer.row.domain]} devices{Ic.chevron(12)}</button>
              <button type="button" className="ix-act" disabled={!!requested[drawer.row.cause]}
                onClick={() => setRequested(r => ({ ...r, [drawer.row.cause]: true }))}>
                {requested[drawer.row.cause] ? <>{Ic.check(12)}Requested</> : drawer.row.action}
              </button>
            </div>
          </>
        )}
        {drawer?.kind === 'cycle' && (
          <div className="kv">
            <div><span className="k">Domain</span><span className="v">{DOMAIN_LABEL[drawer.row.domain]}</span></div>
            <div><span className="k">Completed</span><span className="v">{drawer.row.when}</span></div>
            <div><span className="k">Records scanned</span><span className="v">{n(drawer.row.scanned)}</span></div>
            <div><span className="k">Drifted</span><span className="v">{drawer.row.drifted}</span></div>
            <div><span className="k">Auto-resolved</span><span className="v">{drawer.row.autoResolved}</span></div>
            <div><span className="k">To queue</span><span className="v">{drawer.row.queue}</span></div>
            <div><span className="k">Automated</span><span className="v">{drawer.row.touchlessPct}%</span></div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
