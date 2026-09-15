import { useState, type ReactNode } from 'react';
import { Card, Chip, cv } from '../components/ui';
import { StackedBars, Sparkline, MultiLineChart, ProjectionChart } from '../components/charts';
import {
  TRUST_METRICS, DISCOVERY_JOB_ROWS, OBJECTS_DAILY_DAYS, OBJECTS_DAILY_SERIES, OBJECTS_DAILY_VALUES,
  COVERAGE_FUNNEL, ADAPTER_ROWS, COLLECTOR_ROWS, ROOT_CAUSE_FAILURES, RECONCILE_CYCLE_ROWS, RECONCILE_NEXT,
  MATCH_OUTCOME, MATCH_TOTAL_NOTE, DISCREPANCY_TYPES, BACKLOG_DAYS, BACKLOG_DETECTED, BACKLOG_AUTORESOLVED,
  BACKLOG_AGE, DOMAIN_TRUST_ROWS, DOMAIN_TRUST_TOTAL, REGION_DISCREPANCY,
  TRAJECTORY_DAYS, TRAJECTORY_MEASURED, TRAJECTORY_PROJECTION_DAYS, TRAJECTORY_PROJECTION, TRAJECTORY_TARGET, TIME_TO_TARGET,
  COST_OF_DRIFT, RISK_REGISTER, GAP_ACTIONS, GAP_TARGET_AFTER, PLATFORM_OUTPUT, DECISION,
  DOMAIN_HEX, DOMAIN_LABEL, type DomainKey
} from '../data/discoveryOverview';

/* RAN, Transport, Core, IP/MPLS — the display order every legend and table
   on this page uses. DOMAIN_HEX itself keeps its own key order (it's
   shared with the Reconciliation page), so this is defined locally rather
   than read off Object.keys(DOMAIN_HEX). */
const DOMAIN_KEYS: DomainKey[] = ['RAN', 'Transport', 'Core', 'IPMPLS'];

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

/* the eyebrow + rule that separates the two modules this page covers —
   there's nowhere for a reader to drill from either label, so it's plain
   text, not a link */
function ModuleDivider({ label }: { label: string }) {
  return (
    <div className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', margin: 'var(--vw-space-xs) 0' }}>
      <span className="eyebrow row vw-items-center" style={{ gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.6rem' }}>▾</span>{label}
      </span>
      <span className="divider grow" />
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--vw-color-gray-900)' }}>{children}</div>;
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

/* region × domain drift cell — a solid pill on the shared blue intensity
   scale the legend below the table spells out, rather than a per-domain
   hue: the thing being compared across a row is severity, not which
   domain it is (that's already the column header) */
const REGION_HEAT_MAX = Math.max(...REGION_DISCREPANCY.flatMap(r => Object.values(r.drift)));
function HeatPill({ v, max = REGION_HEAT_MAX }: { v: number; max?: number }) {
  const r = v / max;
  const shade = r > 0.75 ? 700 : r > 0.55 ? 500 : r > 0.3 ? 300 : r > 0 ? 150 : 50;
  return (
    <td style={{ textAlign: 'center', padding: '8px 6px' }}>
      <span className="num" style={{
        display: 'inline-block', minWidth: '2.25rem', padding: '3px 10px', borderRadius: '999px',
        background: cv('blue', shade), color: shade >= 500 ? 'var(--vw-color-white)' : cv('blue', 900), fontWeight: 600
      }}>{v}</span>
    </td>
  );
}

/* the top toolbar's domain filter — a solid pill in the domain's own
   colour when active, an outline when not, so the active one reads at a
   glance against the other three */
function DomainFilterChip({ d, active, onClick }: { d: DomainKey; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="row vw-items-center" style={{
      gap: '6px', padding: '5px 12px', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 500,
      border: `1px solid ${active ? DOMAIN_HEX[d] : 'var(--vw-color-slate-200)'}`,
      background: active ? DOMAIN_HEX[d] : 'var(--vw-color-white)',
      color: active ? 'var(--vw-color-white)' : 'var(--vw-color-gray-700)', cursor: 'pointer'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--vw-color-white)' : DOMAIN_HEX[d] }} />
      {DOMAIN_LABEL[d]}
    </button>
  );
}

/* "Closing the gap to 99%" — each action's point gain as a segment of one
   bar, ranked widest-first, with a marker where the cumulative total
   crosses the target. Darker segments are the higher-leverage actions. */
function GapBar({ actions, targetAfter }: { actions: typeof GAP_ACTIONS; targetAfter: number }) {
  const total = actions.reduce((a, b) => a + b.gain, 0);
  const shades = [700, 500, 400, 300, 200];
  const targetAt = actions.slice(0, targetAfter).reduce((a, b) => a + b.gain, 0) / total * 100;
  return (
    <div style={{ position: 'relative', marginTop: 'var(--vw-space-sm)' }}>
      <div className="row" style={{ height: '28px', borderRadius: '6px', overflow: 'hidden', gap: 0 }}>
        {actions.map((a, i) => {
          const w = a.gain / total * 100;
          return <div key={a.label} title={`${a.label} · +${a.gain.toFixed(2)}`} style={{ width: `${w}%`, height: '100%', background: cv('blue', shades[i] ?? 200) }} />;
        })}
      </div>
      <div style={{ position: 'absolute', left: `${targetAt}%`, top: -4, bottom: -4, width: '2px', background: 'var(--vw-color-emerald-600)' }} />
      <div className="vw-card-metric-label-sub" style={{ position: 'absolute', left: `${targetAt}%`, top: '32px', transform: targetAt > 70 ? 'translateX(-100%)' : undefined, whiteSpace: 'nowrap' }}>
        99.00% target reached here — after two actions
      </div>
    </div>
  );
}

export default function Insights() {
  const [view, setView] = useState<'full' | 'executive'>('full');
  const [domain, setDomain] = useState<DomainKey | null>(null);
  const [objRange, setObjRange] = useState<'7d' | '14d'>('14d');
  const [objView, setObjView] = useState<'chart' | 'table'>('chart');
  const [backlogView, setBacklogView] = useState<'chart' | 'table'>('chart');
  const [costInputs, setCostInputs] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    COST_OF_DRIFT.forEach(c => c.inputs.forEach(inp => { init[`${c.key}.${inp.key}`] = inp.value; }));
    return init;
  });
  const objDays = objRange === '7d' ? OBJECTS_DAILY_DAYS.slice(-7) : OBJECTS_DAILY_DAYS;
  const objValues = objRange === '7d' ? OBJECTS_DAILY_VALUES.slice(-7) : OBJECTS_DAILY_VALUES;
  const objTotal = objValues.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  const objToday = OBJECTS_DAILY_VALUES[OBJECTS_DAILY_VALUES.length - 1].reduce((a, b) => a + b, 0);
  const backlogOlder = BACKLOG_AGE.slice(3).reduce((a, b) => a + b.count, 0);

  /* domain filter only narrows the two sections the toolbar's own subtitle
     scopes it to — discrepancy types and the region table. Jobs, adapters,
     scan failures and match outcome stay whole so a reader filtering to one
     domain doesn't lose the cross-domain picture those give. */
  const discrepancyRows = domain ? DISCREPANCY_TYPES.filter(r => r.domain === domain) : DISCREPANCY_TYPES;
  const discrepancyMax = discrepancyRows[0]?.count ?? 1;
  const discrepancyTotal = discrepancyRows.reduce((a, r) => a + r.count, 0);
  const regionMax = domain ? Math.max(...REGION_DISCREPANCY.map(r => r.drift[domain])) : REGION_HEAT_MAX;
  const regionTotal = REGION_DISCREPANCY.reduce((a, r) => a + (domain ? r.drift[domain] : Object.values(r.drift).reduce((x, y) => x + y, 0)), 0);

  return (
    <div className="page">
      <div className="row vw-justify-between vw-items-center" style={{ paddingBottom: 'var(--vw-space-md)', borderBottom: '1px solid var(--vw-color-slate-200)', marginBottom: 'var(--vw-space-xs)' }}>
        <div className="row vw-items-center" style={{ gap: 'var(--vw-space-md)' }}>
          <span className="eyebrow">VIEW</span>
          <div className="tabbar" style={{ marginBottom: 0 }}>
            <button className={`tab${view === 'full' ? ' is-on' : ''}`} onClick={() => setView('full')}>Full</button>
            <button className={`tab${view === 'executive' ? ' is-on' : ''}`} onClick={() => setView('executive')}>Executive</button>
          </div>
          <span className="vw-card-metric-label-sub">
            {view === 'full' ? 'Jobs, adapters, discrepancies and region detail' : 'Money, risk and one decision — no device detail'}
          </span>
        </div>
        {view === 'full' && (
          <div className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)' }}>
            <span className="eyebrow">DOMAIN</span>
            {DOMAIN_KEYS.map(d => (
              <DomainFilterChip key={d} d={d} active={domain === d} onClick={() => setDomain(domain === d ? null : d)} />
            ))}
          </div>
        )}
      </div>

      <SectionTitle>Inventory trust</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {TRUST_METRICS.map(m => (
          <Card key={m.label} style={m.hero ? { border: '1.5px solid var(--vw-color-blue-200)', background: 'var(--vw-color-blue-25)' } : undefined}>
            <div className="eyebrow">{m.label}</div>
            <div className="num" style={{ fontSize: m.hero ? 'var(--vw-font-value-xxl)' : 'var(--vw-font-value-lg)', fontWeight: 700, marginTop: '4px', lineHeight: 1.1 }}>{m.value}</div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '4px' }}>{m.sub}</div>
            <div style={{ marginTop: 'var(--vw-space-sm)' }}>
              <Sparkline values={m.trend} hex={m.hero ? 'var(--vw-color-blue-500)' : m.tone === 'up' ? 'var(--vw-color-emerald-500)' : 'var(--vw-color-slate-400)'} />
            </div>
          </Card>
        ))}
      </div>

      {view === 'full' && (<>
      <ModuleDivider label="DISCOVERY" />

      <SectionTitle>Jobs and daily discovery</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' }}>
        <Card>
          <span className="vw-card-title-sm">Discovery jobs</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Schedule, coverage and adapters per domain</div>
          <table className="mtbl">
            <thead><tr><th>Domain · adapters</th><th>Schedule</th><th style={{ textAlign: 'right' }}>Targets</th><th style={{ textAlign: 'right' }}>Coverage</th><th>Last → next run</th></tr></thead>
            <tbody>{DISCOVERY_JOB_ROWS.map(j => (
              <tr key={j.domain}>
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

        <Card>
          <div className="row vw-justify-between vw-items-start">
            <div>
              <span className="vw-card-title-sm">New objects discovered per day</span>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last {objRange === '7d' ? '7' : '14'} days · {objTotal} objects · {objToday} today</div>
            </div>
            <div className="tabbar" style={{ marginBottom: 0, flexShrink: 0 }}>
              <button className={`tab${objRange === '7d' && objView === 'chart' ? ' is-on' : ''}`} onClick={() => { setObjRange('7d'); setObjView('chart'); }}>7d</button>
              <button className={`tab${objRange === '14d' && objView === 'chart' ? ' is-on' : ''}`} onClick={() => { setObjRange('14d'); setObjView('chart'); }}>14d</button>
              <button className={`tab${objView === 'table' ? ' is-on' : ''}`} onClick={() => setObjView('table')}>Table</button>
            </div>
          </div>
          {objView === 'chart' ? (
            <StackedBars days={objDays} series={OBJECTS_DAILY_SERIES} values={objValues} height={230} />
          ) : (
            <table className="mtbl" style={{ marginTop: 'var(--vw-space-sm)' }}>
              <thead><tr><th>Day</th>{OBJECTS_DAILY_SERIES.map(s => <th key={s.k} style={{ textAlign: 'right' }}>{s.n}</th>)}<th style={{ textAlign: 'right' }}>Total</th></tr></thead>
              <tbody>{objDays.map((d, i) => (
                <tr key={d}>
                  <td>{d}</td>
                  {objValues[i].map((v, si) => <td key={si} className="num" style={{ textAlign: 'right' }}>{v}</td>)}
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{objValues[i].reduce((a, b) => a + b, 0)}</td>
                </tr>))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <SectionTitle>Coverage</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Discovery funnel</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{COVERAGE_FUNNEL[0].value} in scope · {COVERAGE_FUNNEL[1].value} reached · {COVERAGE_FUNNEL[2].value} never verified</div>
        <div className="vw-grid vw-grid-cols-5 vw-gap-md" style={{ marginTop: 'var(--vw-space-md)' }}>
          {COVERAGE_FUNNEL.map(f => (
            <div key={f.label}>
              <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700 }}>{f.value}</div>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{f.label}{f.sub ? ` · ${f.sub}` : ''}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>Adapters and collectors</SectionTitle>
      <div className="vw-grid vw-grid-cols-2 vw-gap-md">
        <Card>
          <span className="vw-card-title-sm">Discovery adapters</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Endpoint counts and per-adapter success</div>
          <table className="mtbl">
            <thead><tr><th>Adapter</th><th>Domains</th><th style={{ textAlign: 'right' }}>Endpoints</th><th style={{ textAlign: 'right' }}>Success</th><th>Status</th></tr></thead>
            <tbody>{ADAPTER_ROWS.map(a => (
              <tr key={a.adapter}>
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
          <span className="vw-card-title-sm">Collector health</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Targets, p95 poll latency and check-in</div>
          <table className="mtbl">
            <thead><tr><th>Collector</th><th style={{ textAlign: 'right' }}>Targets</th><th style={{ textAlign: 'right' }}>p95 latency</th><th>Check-in</th><th>Status</th></tr></thead>
            <tbody>{COLLECTOR_ROWS.map(c => (
              <tr key={c.name}>
                <td className="vw-value">{c.name}</td>
                <td className="num" style={{ textAlign: 'right' }}>{c.targets.toLocaleString('en-IN')}</td>
                <td className="num" style={{ textAlign: 'right', color: c.status === 'High latency' ? cv('amber', 700) : undefined, fontWeight: c.status === 'High latency' ? 600 : undefined }}>{c.p95}</td>
                <td className="cell-sub">{c.checkin}</td>
                <td><Chip tone={c.status === 'Online' ? 'success' : 'warning'}>{c.status}</Chip></td>
              </tr>))}
            </tbody>
          </table>
        </Card>
      </div>

      <SectionTitle>Scan failures and reconciliation cycles</SectionTitle>
      <div className="vw-grid vw-grid-cols-2 vw-gap-md">
        <Card>
          <span className="vw-card-title-sm">Failures by root cause</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
            {ROOT_CAUSE_FAILURES.reduce((a, f) => a + f.targets, 0)} targets · {ROOT_CAUSE_FAILURES.length} root causes · one fix each
          </div>
          <div>
            {ROOT_CAUSE_FAILURES.map(f => {
              const extra = f.targets - f.examples.length;
              return (
                <div key={f.cause} style={{ padding: '12px 0', borderTop: '1px solid var(--vw-color-slate-100)' }}>
                  <div className="row vw-justify-between vw-items-center" style={{ gap: 'var(--vw-space-sm)' }}>
                    <div className="row vw-items-center" style={{ gap: '8px', minWidth: 0 }}>
                      <Chip tone="neutral" strong>{f.tag}</Chip>
                      <span className="vw-value" style={{ fontWeight: 600 }}>{f.cause}</span>
                    </div>
                    <Chip tone="error">{f.targets} targets</Chip>
                  </div>
                  <div className="row vw-justify-between vw-items-center" style={{ marginTop: '6px' }}>
                    <div className="vw-card-metric-label-sub mono">
                      {f.examples.join('  ·  ')}{extra > 0 ? `  ·  +${extra} more` : ''}
                    </div>
                    <button className="nst-btn nst-btn--xs nst-btn--ghost" style={{ flexShrink: 0 }}>{f.action}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <span className="vw-card-title-sm">Reconciliation cycles</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Most recent cycle per domain, newest first</div>
          <div>
            {RECONCILE_CYCLE_ROWS.map(c => (
              <div key={c.domain} className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', padding: '10px 0', borderTop: '1px solid var(--vw-color-slate-100)' }}>
                <span className="mono vw-card-metric-label-sub" style={{ width: '4.5rem', flexShrink: 0 }}>{c.when}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="vw-value"><b style={{ color: cv('gray', 800) }}>{DOMAIN_LABEL[c.domain]}</b> cycle complete · {c.scanned.toLocaleString('en-IN')} records scanned</div>
                  <div className="row vw-card-metric-label-sub" style={{ gap: '10px', marginTop: '2px' }}>
                    <span>{c.drifted} drifted</span><span>{c.autoResolved} auto-resolved</span><span>{c.queue} to queue</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-md)', fontWeight: 700, color: cv(c.touchlessPct >= 60 ? 'emerald' : 'amber', 700) }}>{c.touchlessPct}%</div>
                  <div className="vw-card-metric-label-sub">touchless</div>
                </div>
              </div>
            ))}
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: 'var(--vw-space-sm)', paddingTop: 'var(--vw-space-sm)', borderTop: '1px dashed var(--vw-color-slate-200)' }}>
            {RECONCILE_NEXT.at} ○ Next: <b style={{ color: 'var(--vw-color-gray-800)' }}>{DOMAIN_LABEL[RECONCILE_NEXT.domain]}</b> {RECONCILE_NEXT.note}
            · {RECONCILE_NEXT.unverified} unverified retried · {RECONCILE_NEXT.inScope.toLocaleString('en-IN')} in scope · in {RECONCILE_NEXT.eta}
          </div>
        </Card>
      </div>

      <ModuleDivider label="RECONCILIATION" />

      <SectionTitle>Match outcome</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Match classes</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{MATCH_TOTAL_NOTE}</div>
        <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginTop: 'var(--vw-space-sm)' }}>
          {MATCH_OUTCOME.map(t => (
            <div key={t.label}>
              <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700, color: cv(t.tone, 700) }}>{t.value.toLocaleString('en-IN')}</div>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{t.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>Discrepancy types</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Open items by type</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{domain ? DOMAIN_LABEL[domain] : 'All domains'} · {discrepancyTotal} open</div>
        <div className="row" style={{ gap: 'var(--vw-space-lg)', margin: 'var(--vw-space-sm) 0', flexWrap: 'wrap' }}>
          {(domain ? [domain] : DOMAIN_KEYS).map(d => (
            <span key={d} className="row vw-items-center vw-card-metric-label-sub" style={{ gap: '6px' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: DOMAIN_HEX[d] }} />{DOMAIN_LABEL[d]}
            </span>
          ))}
        </div>
        {discrepancyRows.map(r => (
          <div key={r.label} className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', padding: '6px 0' }}>
            <span className="vw-value" style={{ width: '15rem', flexShrink: 0 }}>{r.label}</span>
            <span className="vw-card-metric-label-sub" style={{ width: '6.5rem', flexShrink: 0 }}>{r.category}</span>
            <span className="hbar-track grow" style={{ height: '0.75rem' }}>
              <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${(r.count / discrepancyMax * 100).toFixed(1)}%`, background: DOMAIN_HEX[r.domain] }} />
            </span>
            <span className="num" style={{ width: '2.5rem', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{r.count}</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Backlog</SectionTitle>
      <div className="vw-grid vw-grid-cols-2 vw-gap-md">
        <Card>
          <div className="row vw-justify-between vw-items-start">
            <div>
              <span className="vw-card-title-sm">Detected vs auto-resolved, per day</span>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last 30 days</div>
            </div>
            <button className="nst-btn nst-btn--xs nst-btn--ghost" style={{ flexShrink: 0 }}
              onClick={() => setBacklogView(v => v === 'chart' ? 'table' : 'chart')}>{backlogView === 'chart' ? 'Table' : 'Chart'}</button>
          </div>
          {backlogView === 'chart' ? (
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
          ) : (
            <div className="scroll-x" style={{ maxHeight: 230, overflowY: 'auto', marginTop: 'var(--vw-space-sm)' }}>
              <table className="mtbl">
                <thead><tr><th>Day</th><th style={{ textAlign: 'right' }}>Detected</th><th style={{ textAlign: 'right' }}>Auto-resolved</th><th style={{ textAlign: 'right' }}>Automation rate</th></tr></thead>
                <tbody>{BACKLOG_DAYS.map((d, i) => (
                  <tr key={d}>
                    <td>{d}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{BACKLOG_DETECTED[i]}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{BACKLOG_AUTORESOLVED[i]}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{(BACKLOG_AUTORESOLVED[i] / BACKLOG_DETECTED[i] * 100).toFixed(1)}%</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <span className="vw-card-title-sm">Age of open discrepancies</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
            {BACKLOG_AGE.reduce((a, b) => a + b.count, 0)} open · {backlogOlder} older than 7d · oldest 41d
          </div>
          <StackedBars days={BACKLOG_AGE.map(b => b.bucket)} height={230}
            series={[{ k: 'open', n: 'Open discrepancies', hex: 'var(--vw-color-blue-400)' }]}
            values={BACKLOG_AGE.map(b => [b.count])} />
        </Card>
      </div>

      <SectionTitle>Trust by domain and region</SectionTitle>
      <div className="vw-grid vw-grid-cols-2 vw-gap-md">
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">By domain</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Trust index scale 90–100%</div>
          <table className="mtbl">
            <thead><tr><th>Domain</th><th style={{ textAlign: 'right' }}>In scope</th><th style={{ textAlign: 'right' }}>Unverified</th><th style={{ textAlign: 'right' }}>In sync</th><th style={{ textAlign: 'right' }}>Trust index</th><th style={{ textAlign: 'right' }}>Open</th><th style={{ textAlign: 'right' }}>MTTR</th><th style={{ textAlign: 'right' }}>Touchless</th></tr></thead>
            <tbody>{DOMAIN_TRUST_ROWS.map(d => (
              <tr key={d.domain}>
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
          <span className="vw-card-title-sm">Open discrepancies by region</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{domain ? DOMAIN_LABEL[domain] : 'All domains'} · {regionTotal} open</div>
          <table className="mtbl" style={{ marginTop: 'var(--vw-space-sm)' }}>
            <thead>
              <tr>
                <th>Region</th>
                {(domain ? [domain] : DOMAIN_KEYS).map(k => <th key={k} style={{ textAlign: 'center' }}>{DOMAIN_LABEL[k]}</th>)}
                <th style={{ textAlign: 'right' }}>Open</th>
              </tr>
            </thead>
            <tbody>{REGION_DISCREPANCY.map(r => {
              const open = domain ? r.drift[domain] : Object.values(r.drift).reduce((a, b) => a + b, 0);
              return (
                <tr key={r.region}>
                  <td className="vw-value" style={{ fontWeight: 500 }}>{r.region}</td>
                  {(domain ? [domain] : DOMAIN_KEYS).map(k => <HeatPill key={k} v={r.drift[k]} max={regionMax} />)}
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{open}</td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="row vw-items-center" style={{ gap: '10px', marginTop: 'auto', paddingTop: 'var(--vw-space-md)' }}>
            <span className="vw-card-metric-label-sub">0</span>
            <span className="grow" style={{ height: '8px', borderRadius: '999px', background: `linear-gradient(90deg, ${cv('blue', 50)}, ${cv('blue', 700)})` }} />
            <span className="vw-card-metric-label-sub">{regionMax}+ open</span>
          </div>
        </Card>
      </div>
      </>)}

      {view === 'executive' && (<>
      <div className="stack" style={{ gap: 'var(--vw-space-lg)' }}>
        <div>
          <div className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', margin: 'var(--vw-space-xs) 0' }}>
            <span className="eyebrow" style={{ flexShrink: 0 }}>A&nbsp;&nbsp;TRAJECTORY</span>
            <span className="divider grow" />
          </div>
          <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
            <Card>
              <span className="vw-card-title-sm">Inventory trust, 30 days and projected</span>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Scale 97.0–99.2% · dashed = run-rate projection</div>
              <ProjectionChart
                historyLabels={TRAJECTORY_DAYS} historyValues={TRAJECTORY_MEASURED}
                projectionLabels={TRAJECTORY_PROJECTION_DAYS} projectionValues={TRAJECTORY_PROJECTION}
                target={TRAJECTORY_TARGET} targetLabel="99.00% target" yBounds={{ y0: 97.0, y1: 99.2 }}
                height={260} format={v => `${v.toFixed(1)}%`} />
            </Card>
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="vw-card-title-sm">Time to target</span>
              <div className="num" style={{ fontSize: 'var(--vw-font-value-xxl)', fontWeight: 700, marginTop: '4px' }}>{TIME_TO_TARGET.days} <span style={{ fontSize: 'var(--vw-font-value-md)', fontWeight: 500, color: 'var(--vw-color-gray-500)' }}>days</span></div>
              <div className="stack-s" style={{ marginTop: 'var(--vw-space-md)' }}>
                <div className="row vw-justify-between"><span className="vw-card-metric-label-sub">Run-rate</span><span className="num vw-value">{TIME_TO_TARGET.runRate}</span></div>
                <div className="row vw-justify-between"><span className="vw-card-metric-label-sub">Gap to 99.00%</span><span className="num vw-value">{TIME_TO_TARGET.gap}</span></div>
                <div className="row vw-justify-between"><span className="vw-card-metric-label-sub">Reached on</span><span className="num vw-value">{TIME_TO_TARGET.reachedOn}</span></div>
                <div className="row vw-justify-between"><span className="vw-card-metric-label-sub">With top two actions</span><span className="num vw-value">{TIME_TO_TARGET.withTopTwo}</span></div>
              </div>
              <div className="vw-card-metric-label-sub" style={{ marginTop: 'auto', paddingTop: 'var(--vw-space-md)' }}>{TIME_TO_TARGET.note}</div>
            </Card>
          </div>
        </div>

        <div>
          <div className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', margin: 'var(--vw-space-xs) 0' }}>
            <span className="eyebrow" style={{ flexShrink: 0 }}>B&nbsp;&nbsp;EXPOSURE</span>
            <span className="divider grow" />
          </div>
          <SectionTitle>Cost of drift</SectionTitle>
          <div className="vw-grid vw-grid-cols-4 vw-gap-md" style={{ marginTop: 'var(--vw-space-sm)' }}>
            {COST_OF_DRIFT.map(c => {
              const values = Object.fromEntries(c.inputs.map(inp => [inp.key, costInputs[`${c.key}.${inp.key}`]]));
              return (
                <Card key={c.key}>
                  <div className="eyebrow">{c.label}</div>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700, marginTop: '4px' }}>{c.compute(values)}</div>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '4px' }}>{c.sub}{c.note ? ` · ${c.note}` : ''}</div>
                  {c.inputs.length > 0 && (
                    <div className="stack-s" style={{ marginTop: 'var(--vw-space-sm)', paddingTop: 'var(--vw-space-sm)', borderTop: '1px solid var(--vw-color-slate-100)' }}>
                      {c.inputs.map(inp => (
                        <div key={inp.key} className="row vw-items-center vw-card-metric-label-sub" style={{ gap: '6px' }}>
                          {inp.label}
                          <input type="number" value={costInputs[`${c.key}.${inp.key}`]}
                            onChange={e => setCostInputs(s => ({ ...s, [`${c.key}.${inp.key}`]: Number(e.target.value) }))}
                            style={{ width: '4rem', padding: '2px 6px', border: '1px solid var(--vw-color-slate-200)', borderRadius: 'var(--vw-radius-xs)', font: 'inherit' }} />
                          {inp.suffix}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card style={{ marginTop: 'var(--vw-space-md)' }}>
            <span className="vw-card-title-sm">Risk register</span>
            <table className="mtbl">
              <thead><tr><th>Risk</th><th>Exposure</th><th>Accountable</th><th>Direction</th><th>Closes with</th></tr></thead>
              <tbody>{RISK_REGISTER.map(r => (
                <tr key={r.risk}>
                  <td className="vw-value">{r.risk}</td>
                  <td className="cell-sub">{r.exposure}</td>
                  <td>{r.accountable}</td>
                  <td style={{ color: r.direction === 'up' ? cv('red', 600) : r.direction === 'now' ? cv('amber', 700) : 'var(--vw-color-gray-500)' }}>
                    {r.direction === 'up' ? '▲ Rising' : r.direction === 'now' ? '● Now this week' : '– Flat'}
                  </td>
                  <td style={{ color: cv('blue', 600) }}>{r.closesWith}</td>
                </tr>))}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <div className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', margin: 'var(--vw-space-xs) 0' }}>
            <span className="eyebrow" style={{ flexShrink: 0 }}>C&nbsp;&nbsp;DECISION</span>
            <span className="divider grow" />
          </div>
          <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' }}>
            <Card>
              <span className="vw-card-title-sm">Closing the gap to 99%</span>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Points per remediation action, ranked by gain per hour</div>
              <GapBar actions={GAP_ACTIONS} targetAfter={GAP_TARGET_AFTER} />
              <div style={{ marginTop: 'var(--vw-space-lg)' }}>
                {GAP_ACTIONS.map((a, i) => (
                  <div key={a.label} className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', padding: '6px 0', borderTop: '1px solid var(--vw-color-slate-100)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: cv('blue', [700, 500, 400, 300, 200][i] ?? 200), flexShrink: 0 }} />
                    <span className="grow" style={{ minWidth: 0 }}>{a.label}</span>
                    <span className="num" style={{ color: cv('emerald', 700), fontWeight: 600, width: '3.5rem', textAlign: 'right' }}>+{a.gain.toFixed(2)}</span>
                    <span className="num" style={{ width: '4rem', textAlign: 'right' }}>{a.cumPct.toFixed(2)}%</span>
                  </div>
                ))}
                <div className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', padding: '8px 0', borderTop: '1px solid var(--vw-color-slate-300)', fontWeight: 700 }}>
                  <span className="grow">All five complete</span>
                  <span className="num" style={{ color: cv('emerald', 700), width: '3.5rem', textAlign: 'right' }}>+{GAP_ACTIONS.reduce((a, b) => a + b.gain, 0).toFixed(2)}</span>
                  <span className="num" style={{ width: '4rem', textAlign: 'right' }}>{GAP_ACTIONS[GAP_ACTIONS.length - 1].cumPct.toFixed(2)}%</span>
                </div>
              </div>
            </Card>

            <Card>
              <span className="vw-card-title-sm">30 days of platform output</span>
              <div className="vw-grid vw-grid-cols-2 vw-gap-md" style={{ marginTop: 'var(--vw-space-sm)' }}>
                <div>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700 }}>{PLATFORM_OUTPUT.detected.toLocaleString('en-IN')}</div>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>discrepancies detected</div>
                </div>
                <div>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700 }}>{PLATFORM_OUTPUT.closedNoEngineer.toLocaleString('en-IN')}</div>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>closed with no engineer</div>
                </div>
              </div>
              <div className="vw-grid vw-grid-cols-2 vw-gap-md" style={{ marginTop: 'var(--vw-space-lg)' }}>
                <div>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-md)', fontWeight: 700 }}>{PLATFORM_OUTPUT.touchlessStart}% → {PLATFORM_OUTPUT.touchlessNow}%</div>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>touchless rate, start to now</div>
                </div>
                <div>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-md)', fontWeight: 700 }}>{PLATFORM_OUTPUT.mttrStart}h → {PLATFORM_OUTPUT.mttrNow}h</div>
                  <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>mean time to reconcile</div>
                </div>
              </div>
            </Card>
          </div>

          <Card style={{ marginTop: 'var(--vw-space-md)' }}>
            <span className="vw-card-title-sm">{DECISION.title}</span>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{DECISION.note}</div>
            <div className="vw-grid vw-grid-cols-4 vw-gap-md" style={{ marginTop: 'var(--vw-space-md)' }}>
              <div><div className="eyebrow">The ask</div><div className="vw-value" style={{ marginTop: '4px' }}>{DECISION.ask}</div></div>
              <div><div className="eyebrow">Needs</div><div className="vw-value" style={{ marginTop: '4px' }}>{DECISION.needs}</div></div>
              <div><div className="eyebrow">Expected</div><div className="vw-value" style={{ marginTop: '4px' }}>{DECISION.expected}</div></div>
              <div><div className="eyebrow">Also fixes</div><div className="vw-value" style={{ marginTop: '4px' }}>{DECISION.alsoFixes}</div></div>
            </div>
          </Card>
        </div>
      </div>
      </>)}
    </div>
  );
}
