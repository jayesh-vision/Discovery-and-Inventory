import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, cv, InfoTip } from '../components/ui';
import { StackedBars, RampBars, Sparkline, MultiLineChart } from '../components/charts';
import { Drawer } from '../components/Drawer';
import {
  TRUST_METRICS, DISCOVERY_JOB_ROWS, OBJECTS_DAILY_DAYS, OBJECTS_DAILY_SERIES, OBJECTS_DAILY_VALUES,
  ADAPTER_ROWS, COLLECTOR_ROWS, ROOT_CAUSE_FAILURES, RECONCILE_CYCLE_ROWS, RECONCILE_NEXT,
  MATCH_OUTCOME, MATCH_TOTAL_NOTE, DISCREPANCY_TYPES, BACKLOG_DAYS, BACKLOG_DETECTED, BACKLOG_AUTORESOLVED,
  BACKLOG_AGE, DOMAIN_TRUST_ROWS, DOMAIN_TRUST_TOTAL, REGION_DISCREPANCY,
  DOMAIN_HEX, DOMAIN_LABEL, type DomainKey,
  type DiscoveryJobRow, type AdapterRow, type CollectorRow, type RootCauseFailure, type ReconcileCycleRow
} from '../data/discoveryOverview';
import { domainToUrl } from './DomainDevices';

/* one drawer, five possible row shapes — simpler than five parallel
   useState hooks for what is, on screen, always exactly one open panel */
type DrawerState =
  | { kind: 'job'; row: DiscoveryJobRow }
  | { kind: 'adapter'; row: AdapterRow }
  | { kind: 'collector'; row: CollectorRow }
  | { kind: 'failure'; row: RootCauseFailure }
  | { kind: 'cycle'; row: ReconcileCycleRow };

function drawerTitle(d: DrawerState): string {
  switch (d.kind) {
    case 'job': return `${DOMAIN_LABEL[d.row.domain]} discovery job`;
    case 'adapter': return d.row.adapter;
    case 'collector': return d.row.name;
    case 'failure': return d.row.cause;
    case 'cycle': return `${DOMAIN_LABEL[d.row.domain]} reconciliation cycle`;
  }
}
function drawerSub(d: DrawerState): string {
  return d.kind === 'adapter' ? d.row.domains.map(x => DOMAIN_LABEL[x]).join(' · ') : DOMAIN_LABEL[d.row.domain];
}

/* RAN, Transport, Core, IP/MPLS — the display order every legend and table
   on this page uses. DOMAIN_HEX itself keeps its own key order (it's
   shared with the Reconciliation page), so this is defined locally rather
   than read off Object.keys(DOMAIN_HEX). */
const DOMAIN_KEYS: DomainKey[] = ['RAN', 'Transport', 'Core', 'IPMPLS'];

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

/* one-sentence explanations for the eye icon beside a KPI or card title —
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
  'Collector health': 'The collector processes running each domain’s scans — how many targets they carry, how fast they respond, and when they last checked in.',
  'Failures by root cause': 'Scan attempts that failed, grouped by their underlying cause rather than by device, so one fix can clear many failures at once.',
  'Match classes': 'How reconciliation classified every compared record last cycle — matched, or one of the ways a record can disagree with the live network.',
  'By domain': 'Inventory trust broken down by domain — in-scope, in-sync, and the open backlog and repair time each domain is carrying.',
  'Open discrepancies by region': 'Where the open discrepancy backlog is concentrated geographically, one cell per region × domain.',
  'Detected vs auto-resolved, per day': 'New discrepancies found each day, and how many were closed automatically by policy without an engineer.',
  'Age of open discrepancies': 'How long the currently open discrepancies have sat unresolved — the older the bucket, the more attention it likely needs.',
  'Open items by type': 'The open backlog broken down by the specific kind of discrepancy, so the most common failure patterns stand out.',
  'Reconciliation cycles': 'The last few completed reconciliation runs for each domain, newest first, and what’s scheduled to run next.'
};

const DomainDot = ({ domain }: { domain: DomainKey }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

/* a compact multi-domain cell — one dot per domain, not a comma list, so
   the same colour coding used everywhere else on this page still reads at
   a glance in a dense table cell */
const DomainDots = ({ domains }: { domains: DomainKey[] }) => (
  <span className="row vw-items-center" style={{ gap: '10px', flexWrap: 'nowrap' }}>
    {domains.map(d => (
      <span key={d} className="row vw-items-center" style={{ gap: '5px', flexWrap: 'nowrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOMAIN_HEX[d], flexShrink: 0 }} />
        {DOMAIN_LABEL[d]}
      </span>
    ))}
  </span>
);

/* the numbered rule that separates the two modules this page covers — a
   roman numeral, the module name, then a hairline running to the card's
   right edge. Nowhere for a reader to drill from either label, so it's
   plain text, not a link. */
function ModuleDivider({ num, label }: { num: string; label: string }) {
  return (
    <div className="row vw-items-center" style={{ gap: 'var(--vw-space-md)', margin: 'var(--vw-space-md) 0 var(--vw-space-xs)' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '.14em', color: 'var(--vw-color-blue-600)', flexShrink: 0 }}>{num}</span>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '.11em', textTransform: 'uppercase', color: 'var(--vw-color-gray-900)', flexShrink: 0 }}>{label}</span>
      <span className="divider grow" />
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--vw-color-gray-900)' }}>{children}</div>;
}

/* the hero card's own delta reads "▲ 0.41 pt vs 7 days ago · target 99.00%" —
   split off the leading arrow + figure and color it by direction (▲ green,
   ▼ red), leaving the rest of the sentence in the page's usual muted tone */
function TrustDelta({ sub }: { sub: string }) {
  const m = /^([▲▼])\s*([^\s]+(?:\s+[a-z.]+)?)\s*(.*)$/.exec(sub);
  if (!m) return <span className="vw-card-metric-label-sub">{sub}</span>;
  const [, arrow, figure, rest] = m;
  const up = arrow === '▲';
  return (
    <span className="vw-card-metric-label-sub">
      <span style={{ color: up ? cv('emerald', 600) : cv('red', 600), fontWeight: 600 }}>{arrow} {figure}</span>{' '}{rest}
    </span>
  );
}

/* inline mini meter beside a percentage — used for adapter success rate,
   job coverage and trust index, the same idiom the Reconciliation page
   uses for scan % */
function PctBar({ pct, hex }: { pct: number; hex: string }) {
  return (
    <span className="num row vw-items-center" style={{ gap: '8px', justifyContent: 'flex-end' }}>
      {pct % 1 === 0 ? pct : pct.toFixed(2)}%
      <span className="hbar-track" style={{ width: '3.5rem', height: '6px' }}>
        <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${pct}%`, background: hex }} />
      </span>
    </span>
  );
}

/* region × domain drift cell — a solid block on the shared blue intensity
   scale the legend below the table spells out, rather than a per-domain
   hue: the thing being compared across a row is severity, not which
   domain it is (that's already the column header). Fills most of the
   column, not a small centered pill, so the shade is the thing a reader's
   eye actually lands on scanning down a column. */
/* age histogram bars — one shade per bucket, oldest run the darkest: the
   thing a reader should notice first is how far right the color deepens,
   not a flat single-hue bar chart */
const AGE_RAMP = [cv('blue', 200), cv('blue', 300), cv('blue', 400), cv('blue', 500), cv('blue', 700)];

const REGION_HEAT_STEPS = [50, 100, 200, 300, 400, 500, 600] as const;
const REGION_HEAT_MAX = Math.max(...REGION_DISCREPANCY.flatMap(r => Object.values(r.drift)));
function heatShade(v: number, max: number) {
  const r = v / max;
  return r > 0.9 ? 600 : r > 0.7 ? 500 : r > 0.5 ? 400 : r > 0.3 ? 300 : r > 0.15 ? 200 : r > 0.05 ? 100 : 50;
}
function HeatPill({ v, region, domain, onOpen, max = REGION_HEAT_MAX }: {
  v: number; region: string; domain: DomainKey; onOpen: (d: DomainKey, region?: string) => void; max?: number;
}) {
  const shade = heatShade(v, max);
  return (
    <td style={{ padding: '4px' }}>
      <button className="num is-drill" title={`${region} · ${DOMAIN_LABEL[domain]} · ${v} open — view ${DOMAIN_LABEL[domain]} devices in ${region}`}
        onClick={() => onOpen(domain, region)}
        style={{
          display: 'block', width: '100%', padding: '13px 8px', borderRadius: '10px', textAlign: 'center', fontSize: '1rem', border: 0,
          background: cv('blue', shade), color: shade >= 500 ? 'var(--vw-color-white)' : cv('blue', 900), fontWeight: 600, cursor: 'pointer'
        }}>{v}</button>
    </td>
  );
}

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

  return (
    <div className="page">
      <SectionTitle>Inventory trust</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {TRUST_METRICS.map(m => {
          const to = KPI_TARGET[m.label];
          const Wrap = to ? 'button' : 'div';
          return (
            <Wrap key={m.label} className={`vw-card-section${to ? ' is-drill' : ''}`}
              style={{ borderLeft: '3px solid var(--vw-color-blue-500)', display: 'flex', flexDirection: 'column', textAlign: 'left' }}
              {...(to ? { onClick: to, title: KPI_HINT[m.label] } : {})}>
              <div className="eyebrow">{m.label}
                {KPI_DEF[m.label] && <InfoTip text={KPI_DEF[m.label]} label={`What ${m.label.toLowerCase()} means`} />}
              </div>
              <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700, marginTop: '4px', lineHeight: 1.1 }}>{m.value}</div>
              {m.hero ? <TrustDelta sub={m.sub} /> : <div className="vw-card-metric-label-sub" style={{ marginTop: '4px' }}>{m.sub}</div>}
              <div style={{ marginTop: 'auto', paddingTop: 'var(--vw-space-sm)' }}>
                <Sparkline values={m.trend} hex="var(--vw-color-blue-500)" />
              </div>
            </Wrap>
          );
        })}
      </div>

      <ModuleDivider num="I" label="DISCOVERY" />

      <SectionTitle>Jobs and daily discovery</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' }}>
        <Card>
          <span className="vw-card-title-sm">Discovery jobs<InfoTip text={CARD_DEF['Discovery jobs']} label="What discovery jobs shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Schedule, coverage and adapters per domain</div>
          <table className="mtbl">
            <thead><tr><th>Domain · adapters</th><th>Schedule</th><th style={{ textAlign: 'right' }}>Targets</th><th style={{ textAlign: 'right' }}>Coverage</th><th>Last → next run</th></tr></thead>
            <tbody>{DISCOVERY_JOB_ROWS.map(j => (
              <tr key={j.domain} className="is-click" tabIndex={0} onClick={() => setDrawer({ kind: 'job', row: j })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawer({ kind: 'job', row: j }); } }}
                aria-label={`View ${DOMAIN_LABEL[j.domain]} discovery job details`}>
                <td>
                  <DomainDot domain={j.domain} />
                  <div className="cell-sub">{j.protocols}</div>
                </td>
                <td>
                  {j.schedule}
                  <div className="cell-sub" style={{ color: j.status === 'Healthy' ? cv('emerald', 600) : cv('amber', 700) }}>
                    {j.status === 'Healthy' ? '✓' : '⚠'} {j.status}
                  </div>
                </td>
                <td className="num" style={{ textAlign: 'right' }}>{j.targets.toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}><PctBar pct={j.coveragePct} hex={DOMAIN_HEX[j.domain]} /></td>
                <td>
                  {j.lastRun}
                  <div className="cell-sub">● {j.nextRun}</div>
                </td>
              </tr>))}
            </tbody>
          </table>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="row vw-justify-between vw-items-start">
            <div>
              <span className="vw-card-title-sm">New items discovered per day<InfoTip text={CARD_DEF['New items discovered per day']} label="What this chart shows" /></span>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last {objRange === '7d' ? '7' : '14'} days · {objTotal} items · {objToday} today</div>
            </div>
            <div className="tabbar" style={{ marginBottom: 0, flexShrink: 0 }}>
              <button className={`tab${objRange === '7d' ? ' is-on' : ''}`} onClick={() => setObjRange('7d')}>7d</button>
              <button className={`tab${objRange === '14d' ? ' is-on' : ''}`} onClick={() => setObjRange('14d')}>14d</button>
            </div>
          </div>
          <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <StackedBars days={objDays} series={OBJECTS_DAILY_SERIES} values={objValues} height={230} />
          </div>
        </Card>
      </div>

      <SectionTitle>Adapters and collectors</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.28fr) minmax(0, 1fr)' }}>
        <Card>
          <span className="vw-card-title-sm">Discovery adapters<InfoTip text={CARD_DEF['Discovery adapters']} label="What discovery adapters shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Endpoint counts and per-adapter success</div>
          <table className="mtbl">
            <thead><tr><th>Adapter</th><th>Domains</th><th style={{ textAlign: 'right' }}>Endpoints</th><th style={{ textAlign: 'right' }}>Success</th><th>Status</th></tr></thead>
            <tbody>{ADAPTER_ROWS.map(a => (
              <tr key={a.adapter} className="is-click" tabIndex={0} onClick={() => setDrawer({ kind: 'adapter', row: a })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawer({ kind: 'adapter', row: a }); } }}
                aria-label={`View ${a.adapter} adapter details`}>
                <td>
                  <span className="vw-value">{a.adapter}</span>
                  <div className="cell-sub">{a.proto}</div>
                </td>
                <td><DomainDots domains={a.domains} /></td>
                <td className="num" style={{ textAlign: 'right' }}>{a.endpoints}</td>
                <td style={{ textAlign: 'right' }}><PctBar pct={a.successPct} hex={DOMAIN_HEX[a.domains[0]]} /></td>
                <td><Chip tone={a.status === 'Healthy' ? 'success' : 'warning'}>{a.status}</Chip></td>
              </tr>))}
            </tbody>
          </table>
        </Card>

        <Card>
          <span className="vw-card-title-sm">Collector health<InfoTip text={CARD_DEF['Collector health']} label="What collector health shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Targets, p95 poll latency and check-in</div>
          <table className="mtbl">
            <thead><tr><th>Collector</th><th>Domain</th><th style={{ textAlign: 'right' }}>Targets</th><th style={{ textAlign: 'right' }}>p95 latency</th><th>Check-in</th><th>Status</th></tr></thead>
            <tbody>{COLLECTOR_ROWS.map(c => (
              <tr key={c.name} className="is-click" tabIndex={0} onClick={() => setDrawer({ kind: 'collector', row: c })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawer({ kind: 'collector', row: c }); } }}
                aria-label={`View ${c.name} collector details`}>
                <td className="vw-value">{c.name}</td>
                <td><DomainDot domain={c.domain} /></td>
                <td className="num" style={{ textAlign: 'right' }}>{c.targets.toLocaleString('en-IN')}</td>
                <td className="num" style={{ textAlign: 'right', color: c.status === 'High latency' ? cv('amber', 700) : undefined, fontWeight: c.status === 'High latency' ? 600 : undefined }}>{c.p95}</td>
                <td className="cell-sub">{c.checkin}</td>
                <td><Chip tone={c.status === 'Online' ? 'success' : 'warning'}>{c.status}</Chip></td>
              </tr>))}
            </tbody>
          </table>
        </Card>
      </div>

      <SectionTitle>Scan failures</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Failures by root cause<InfoTip text={CARD_DEF['Failures by root cause']} label="What this list shows" /></span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
          {ROOT_CAUSE_FAILURES.reduce((a, f) => a + f.targets, 0)} targets · {ROOT_CAUSE_FAILURES.length} root causes · one fix each
        </div>
        <div>
          {ROOT_CAUSE_FAILURES.map(f => {
            const extra = f.targets - f.examples.length;
            const acted = !!requested[f.cause];
            return (
              <div key={f.cause} className="row vw-items-center is-click" tabIndex={0}
                style={{ gap: '12px', padding: '11px 0', borderTop: '1px solid var(--vw-color-slate-100)', cursor: 'pointer' }}
                onClick={() => setDrawer({ kind: 'failure', row: f })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawer({ kind: 'failure', row: f }); } }}
                aria-label={`View details for ${f.cause}`}>
                <span className="mono" style={{
                  width: 28, height: 28, borderRadius: '7px', flexShrink: 0, marginTop: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--vw-color-slate-100)', color: 'var(--vw-color-gray-600)',
                  fontSize: '0.625rem', fontWeight: 600
                }}>{f.tag}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row vw-items-center" style={{ gap: '8px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[f.domain], flexShrink: 0 }} />
                    <div className="vw-value" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{f.cause}</div>
                  </div>
                  <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {f.examples.map(ex => <span key={ex} className="mono" style={{ fontSize: '0.6875rem', color: 'var(--vw-color-gray-600)', background: 'var(--vw-color-slate-100)', borderRadius: '4px', padding: '2px 7px' }}>{ex}</span>)}
                    {extra > 0 && <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--vw-color-gray-600)', background: 'var(--vw-color-slate-100)', borderRadius: '4px', padding: '2px 7px' }}>+{extra} more</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <Chip tone="neutral">{f.targets} targets</Chip>
                  <button className={`nst-btn nst-btn--xs${acted ? '' : ' nst-btn--ghost'}`} disabled={acted}
                    onClick={e => { e.stopPropagation(); setRequested(r => ({ ...r, [f.cause]: true })); }}>
                    {acted ? '✓ Requested' : f.action}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ModuleDivider num="II" label="RECONCILIATION" />

      <SectionTitle>Match outcome</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Match classes<InfoTip text={CARD_DEF['Match classes']} label="What match classes shows" /></span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{MATCH_TOTAL_NOTE}</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '1px',
          background: 'var(--vw-color-slate-200)',
          borderTop: '1px solid var(--vw-color-slate-200)', marginTop: 'var(--vw-space-md)'
        }}>
          {MATCH_OUTCOME.slice(0, 5).map((t, i) => {
            const category = MATCH_OUTCOME_CATEGORY[t.label];
            const Tile = category ? 'button' : 'div';
            return (
              <Tile key={t.label} className={category ? 'is-drill' : undefined}
                style={{ background: i === 0 ? 'var(--vw-color-slate-50)' : 'var(--vw-color-white)', padding: '12px 18px', textAlign: 'left', display: 'block', width: '100%', border: 0 }}
                {...(category ? { onClick: () => toDiscrepancies({ category }), title: `View ${t.label.toLowerCase()} discrepancies` } : {})}>
                <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700 }}>{t.value.toLocaleString('en-IN')}</div>
                <div className="vw-value" style={{ marginTop: '3px', fontWeight: 600 }}>
                  {t.label}
                  {MATCH_OUTCOME_DEF[t.label] && <InfoTip text={MATCH_OUTCOME_DEF[t.label]} label={`What ${t.label.toLowerCase()} means`} />}
                </div>
              </Tile>
            );
          })}
        </div>
      </Card>

      <SectionTitle>Trust by domain and region</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)' }}>
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">By domain<InfoTip text={CARD_DEF['By domain']} label="What this table shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Trust index scale 90–100%</div>
          <table className="mtbl">
            <thead><tr><th>Domain</th><th style={{ textAlign: 'right' }}>In scope</th><th style={{ textAlign: 'right' }}>Unverified</th><th style={{ textAlign: 'right' }}>In sync</th><th style={{ textAlign: 'right' }}>Trust index</th><th style={{ textAlign: 'right' }}>Open</th><th style={{ textAlign: 'right' }}>MTTR</th><th style={{ textAlign: 'right' }}>Automated</th></tr></thead>
            <tbody>{DOMAIN_TRUST_ROWS.map(d => (
              <tr key={d.domain} className="is-click" tabIndex={0} onClick={() => openDomain(d.domain)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDomain(d.domain); } }}
                aria-label={`View ${DOMAIN_LABEL[d.domain]} domain devices`}>
                <td><DomainDot domain={d.domain} /></td>
                <td className="num" style={{ textAlign: 'right' }}>{d.inScope.toLocaleString('en-IN')}</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.unverified ?? '–'}</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.inSync.toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}><PctBar pct={d.trustIndexPct} hex={DOMAIN_HEX[d.domain]} /></td>
                <td className="num" style={{ textAlign: 'right', color: cv('red', 600), fontWeight: 600 }}>{d.open}</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.mttrHours}h</td>
                <td className="num" style={{ textAlign: 'right' }}>{d.touchlessPct}%</td>
              </tr>))}
            </tbody>
            <tfoot><tr>
              <td className="vw-value" style={{ fontWeight: 600 }}>All domains</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.inScope}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.unverified}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.inSync}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.trustIndexPct} <span className="vw-card-metric-label-sub">target 99%</span></td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600, color: cv('red', 600) }}>{DOMAIN_TRUST_TOTAL.open}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.mttrHours}</td>
              <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{DOMAIN_TRUST_TOTAL.touchlessPct}</td>
            </tr></tfoot>
          </table>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">Open discrepancies by region<InfoTip text={CARD_DEF['Open discrepancies by region']} label="What this heatmap shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>All domains · {REGION_DISCREPANCY.reduce((a, r) => a + Object.values(r.drift).reduce((x, y) => x + y, 0), 0)} open</div>
          <table className="mtbl" style={{ marginTop: 'var(--vw-space-sm)' }}>
            <thead>
              <tr>
                <th className="eyebrow">Region</th>
                {DOMAIN_KEYS.map(k => <th key={k} className="eyebrow" style={{ textAlign: 'center' }}>{DOMAIN_LABEL[k]}</th>)}
                <th className="eyebrow" style={{ textAlign: 'right' }}>Open</th>
              </tr>
            </thead>
            <tbody>{REGION_DISCREPANCY.map(r => {
              const open = Object.values(r.drift).reduce((a, b) => a + b, 0);
              return (
                <tr key={r.region}>
                  <td className="vw-value" style={{ fontWeight: 600 }}>{r.region}</td>
                  {DOMAIN_KEYS.map(k => <HeatPill key={k} v={r.drift[k]} region={r.region} domain={k} onOpen={openDomain} />)}
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{open}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="row vw-items-center" style={{ gap: '8px', marginTop: 'auto', paddingTop: 'var(--vw-space-md)' }}>
            <span className="vw-card-metric-label-sub">0</span>
            <div className="row" style={{ gap: '3px' }}>
              {REGION_HEAT_STEPS.map(s => <span key={s} style={{ width: '20px', height: '14px', borderRadius: '3px', background: cv('blue', s), flexShrink: 0 }} />)}
            </div>
            <span className="vw-card-metric-label-sub">{REGION_HEAT_MAX}+ open</span>
          </div>
        </Card>
      </div>

      <SectionTitle>Backlog</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)' }}>
        <Card>
          <span className="vw-card-title-sm">Detected vs auto-resolved, per day<InfoTip text={CARD_DEF['Detected vs auto-resolved, per day']} label="What this chart shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last 30 days</div>
          <MultiLineChart labels={BACKLOG_DAYS} height={230} format={v => v.toLocaleString('en-IN')}
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
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">Age of open discrepancies<InfoTip text={CARD_DEF['Age of open discrepancies']} label="What this chart shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
            {BACKLOG_AGE.reduce((a, b) => a + b.count, 0)} open · {backlogOlder} older than 7d · oldest 41d
          </div>
          <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <RampBars height={230}
              buckets={BACKLOG_AGE.map((b, i) => ({ label: b.bucket, count: b.count, hex: AGE_RAMP[i], hint: 'Click to view these items' }))}
              onBucketClick={i => toDiscrepancies({ age: BACKLOG_AGE[i].band })} />
          </div>
        </Card>
      </div>

      <SectionTitle>Discrepancy types and reconciliation cycles</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
          <span className="vw-card-title-sm">Open items by type<InfoTip text={CARD_DEF['Open items by type']} label="What this list shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>All domains · {DISCREPANCY_TYPES.reduce((a, r) => a + r.count, 0)} open</div>
          <div className="row" style={{ gap: 'var(--vw-space-lg)', margin: 'var(--vw-space-sm) 0', flexWrap: 'wrap', flexShrink: 0 }}>
            {DOMAIN_KEYS.map(d => (
              <span key={d} className="row vw-items-center vw-card-metric-label-sub" style={{ gap: '6px' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: DOMAIN_HEX[d] }} />{DOMAIN_LABEL[d]}
              </span>
            ))}
          </div>
          {/* the two cards in this row hold very differently-sized real
              content (a fixed 14-row type list vs. a growing cycle history) —
              a shared fixed card height with this list scrolling internally,
              same idiom as the Location map's site-list panel, keeps both
              card borders aligned regardless of how either side's data grows */}
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {DISCREPANCY_TYPES.map(r => (
              <button key={r.label} className="row vw-items-center is-drill" style={{ gap: 'var(--vw-space-sm)', padding: '6px 0', width: '100%', textAlign: 'left', border: 0, background: 'none' }}
                title={`View ${r.label} (${DOMAIN_LABEL[r.domain]})`}
                onClick={() => toDiscrepancies({ q: r.label })}>
                <span className="row vw-items-center" style={{ gap: '7px', width: '13.5rem', flexShrink: 0, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[r.domain], flexShrink: 0 }} />
                  <span className="vw-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                </span>
                <span className="vw-card-metric-label-sub" style={{ width: '6rem', flexShrink: 0 }}>{r.category}</span>
                <span className="hbar-track grow" style={{ height: '0.75rem' }}>
                  <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${(r.count / DISCREPANCY_TYPES[0].count * 100).toFixed(1)}%`, background: DOMAIN_HEX[r.domain] }} />
                </span>
                <span className="num" style={{ width: '2.5rem', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{r.count}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
          <span className="vw-card-title-sm">Reconciliation cycles<InfoTip text={CARD_DEF['Reconciliation cycles']} label="What this timeline shows" /></span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last 3 cycles per domain, newest first</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            {RECONCILE_CYCLE_ROWS.map((c, i) => (
              <div key={`${c.domain}-${c.when}`} className="is-click" tabIndex={0} onClick={() => setDrawer({ kind: 'cycle', row: c })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawer({ kind: 'cycle', row: c }); } }}
                aria-label={`View ${DOMAIN_LABEL[c.domain]} cycle details`}
                style={{ display: 'grid', gridTemplateColumns: '4.5rem 20px 1fr auto', columnGap: 'var(--vw-space-sm)', alignItems: 'flex-start', padding: '11px 0' }}>
                <span className="mono vw-card-metric-label-sub" style={{ paddingTop: '2px' }}>{c.when}</span>
                <span style={{ position: 'relative', alignSelf: 'stretch' }}>
                  <span style={{ position: 'absolute', left: 6, top: 4, width: 9, height: 9, borderRadius: '50%', background: DOMAIN_HEX[c.domain], boxShadow: '0 0 0 3px var(--vw-color-white)' }} />
                  {i < RECONCILE_CYCLE_ROWS.length - 1 && <span style={{ position: 'absolute', left: 10, top: 16, bottom: -22, width: 1, background: 'var(--vw-color-slate-200)' }} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="vw-value"><b style={{ color: cv('gray', 800) }}>{DOMAIN_LABEL[c.domain]}</b> cycle complete · {c.scanned.toLocaleString('en-IN')} records scanned</div>
                  <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <Chip tone="neutral">{c.drifted} drifted</Chip>
                    <Chip tone="neutral">{c.autoResolved} auto-resolved</Chip>
                    <Chip tone="neutral">{c.queue} to queue</Chip>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-md)', fontWeight: 700, color: cv(c.touchlessPct >= 60 ? 'emerald' : 'amber', 700), lineHeight: 1.1 }}>{c.touchlessPct}%</div>
                  <div className="vw-card-metric-label-sub">automated</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '4.5rem 20px 1fr', columnGap: 'var(--vw-space-sm)', alignItems: 'flex-start', padding: '11px 0', borderTop: '1px dashed var(--vw-color-slate-200)', flexShrink: 0 }}>
            <span className="mono vw-card-metric-label-sub" style={{ paddingTop: '2px' }}>{RECONCILE_NEXT.at}</span>
            <span style={{ position: 'relative', alignSelf: 'stretch' }}>
              <span style={{
                position: 'absolute', left: 6, top: 4, width: 9, height: 9, borderRadius: '50%',
                background: 'var(--vw-color-white)', border: `2px solid ${DOMAIN_HEX[RECONCILE_NEXT.domain]}`, boxSizing: 'border-box'
              }} />
            </span>
            <div className="vw-card-metric-label-sub" style={{ paddingTop: '2px' }}>
              Next: <b style={{ color: 'var(--vw-color-gray-800)' }}>{DOMAIN_LABEL[RECONCILE_NEXT.domain]}</b> {RECONCILE_NEXT.note}
              · {RECONCILE_NEXT.unverified} unverified retried · {RECONCILE_NEXT.inScope.toLocaleString('en-IN')} in scope · in {RECONCILE_NEXT.eta}
            </div>
          </div>
        </Card>
      </div>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer ? drawerTitle(drawer) : ''}
        sub={drawer ? drawerSub(drawer) : undefined}>
        {drawer?.kind === 'job' && (
          <div className="kv">
            <div><span className="k">Adapters</span><span className="v">{drawer.row.protocols}</span></div>
            <div><span className="k">Schedule</span><span className="v">{drawer.row.schedule}</span></div>
            <div><span className="k">Targets</span><span className="v">{drawer.row.targets.toLocaleString('en-IN')}</span></div>
            <div><span className="k">Coverage</span><span className="v">{drawer.row.coveragePct}%</span></div>
            <div><span className="k">Status</span><span className="v">{drawer.row.status}</span></div>
            <div><span className="k">Last run</span><span className="v">{drawer.row.lastRun}</span></div>
            <div><span className="k">Next run</span><span className="v">{drawer.row.nextRun}</span></div>
          </div>
        )}
        {drawer?.kind === 'adapter' && (
          <div className="kv">
            <div><span className="k">Protocol</span><span className="v">{drawer.row.proto}</span></div>
            <div><span className="k">Domains</span><span className="v">{drawer.row.domains.map(d => DOMAIN_LABEL[d]).join(', ')}</span></div>
            <div><span className="k">Endpoints</span><span className="v">{drawer.row.endpoints}</span></div>
            <div><span className="k">Success rate</span><span className="v">{drawer.row.successPct}%</span></div>
            <div><span className="k">Status</span><span className="v">{drawer.row.status}</span></div>
          </div>
        )}
        {drawer?.kind === 'collector' && (
          <div className="kv">
            <div><span className="k">Domain</span><span className="v">{DOMAIN_LABEL[drawer.row.domain]}</span></div>
            <div><span className="k">Targets</span><span className="v">{drawer.row.targets.toLocaleString('en-IN')}</span></div>
            <div><span className="k">p95 latency</span><span className="v">{drawer.row.p95}</span></div>
            <div><span className="k">Check-in</span><span className="v">{drawer.row.checkin}</span></div>
            <div><span className="k">Status</span><span className="v">{drawer.row.status}</span></div>
          </div>
        )}
        {drawer?.kind === 'failure' && (
          <>
            <div className="kv">
              <div><span className="k">Domain</span><span className="v">{DOMAIN_LABEL[drawer.row.domain]}</span></div>
              <div><span className="k">Affected targets</span><span className="v">{drawer.row.targets}</span></div>
              <div><span className="k">Root cause</span><span className="v">{drawer.row.tag}</span></div>
            </div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: 'var(--vw-space-md)' }}>Examples</div>
            <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {drawer.row.examples.map(ex => <span key={ex} className="mono" style={{ fontSize: '0.75rem', color: 'var(--vw-color-gray-600)', background: 'var(--vw-color-slate-100)', borderRadius: '4px', padding: '2px 8px' }}>{ex}</span>)}
            </div>
            <div className="row" style={{ gap: '8px', marginTop: 'var(--vw-space-lg)' }}>
              <button className="nst-btn nst-btn--sm" onClick={() => openDomain(drawer.row.domain)}>View {DOMAIN_LABEL[drawer.row.domain]} devices</button>
              <button className={`nst-btn nst-btn--sm${requested[drawer.row.cause] ? '' : ' nst-btn--ghost'}`} disabled={!!requested[drawer.row.cause]}
                onClick={() => setRequested(r => ({ ...r, [drawer.row.cause]: true }))}>
                {requested[drawer.row.cause] ? '✓ Requested' : drawer.row.action}
              </button>
            </div>
          </>
        )}
        {drawer?.kind === 'cycle' && (
          <div className="kv">
            <div><span className="k">Domain</span><span className="v">{DOMAIN_LABEL[drawer.row.domain]}</span></div>
            <div><span className="k">Completed</span><span className="v">{drawer.row.when}</span></div>
            <div><span className="k">Records scanned</span><span className="v">{drawer.row.scanned.toLocaleString('en-IN')}</span></div>
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
