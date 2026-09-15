import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, cv } from '../components/ui';
import { StackedBars, RampBars, Sparkline, MultiLineChart } from '../components/charts';
import {
  TRUST_METRICS, DISCOVERY_JOB_ROWS, OBJECTS_DAILY_DAYS, OBJECTS_DAILY_SERIES, OBJECTS_DAILY_VALUES,
  ADAPTER_ROWS, COLLECTOR_ROWS, ROOT_CAUSE_FAILURES, RECONCILE_CYCLE_ROWS, RECONCILE_NEXT,
  MATCH_OUTCOME, MATCH_TOTAL_NOTE, DISCREPANCY_TYPES, BACKLOG_DAYS, BACKLOG_DETECTED, BACKLOG_AUTORESOLVED,
  BACKLOG_AGE, DOMAIN_TRUST_ROWS, DOMAIN_TRUST_TOTAL, REGION_DISCREPANCY,
  DOMAIN_HEX, DOMAIN_LABEL, type DomainKey
} from '../data/discoveryOverview';
import { domainToUrl } from './DomainDevices';

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
function HeatPill({ v, max = REGION_HEAT_MAX }: { v: number; max?: number }) {
  const shade = heatShade(v, max);
  return (
    <td style={{ padding: '4px' }}>
      <div className="num" style={{
        padding: '13px 8px', borderRadius: '10px', textAlign: 'center', fontSize: '1rem',
        background: cv('blue', shade), color: shade >= 500 ? 'var(--vw-color-white)' : cv('blue', 900), fontWeight: 600
      }}>{v}</div>
    </td>
  );
}

export default function Insights() {
  const nav = useNavigate();
  const openDomain = (d: DomainKey) => nav(`/discovery/insights/domain/${domainToUrl(d)}`);
  const [objRange, setObjRange] = useState<'7d' | '14d'>('14d');
  const [objView, setObjView] = useState<'chart' | 'table'>('chart');
  const [backlogView, setBacklogView] = useState<'chart' | 'table'>('chart');
  const objDays = objRange === '7d' ? OBJECTS_DAILY_DAYS.slice(-7) : OBJECTS_DAILY_DAYS;
  const objValues = objRange === '7d' ? OBJECTS_DAILY_VALUES.slice(-7) : OBJECTS_DAILY_VALUES;
  const objTotal = objValues.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  const objToday = OBJECTS_DAILY_VALUES[OBJECTS_DAILY_VALUES.length - 1].reduce((a, b) => a + b, 0);
  const backlogOlder = BACKLOG_AGE.slice(3).reduce((a, b) => a + b.count, 0);

  return (
    <div className="page">
      <SectionTitle>Inventory trust</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(240px, 21rem) minmax(0, 1fr)' }}>
        <Card style={{ borderLeft: '3px solid var(--vw-color-blue-500)', display: 'flex', flexDirection: 'column' }}>
          <div className="eyebrow">{TRUST_METRICS[0].label}</div>
          <div className="num" style={{ fontSize: '2.75rem', fontWeight: 700, marginTop: '6px', lineHeight: 1 }}>{TRUST_METRICS[0].value}</div>
          <div className="row vw-items-center" style={{ gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--vw-color-slate-100)' }}>
            <TrustDelta sub={TRUST_METRICS[0].sub} />
          </div>
        </Card>
        <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {TRUST_METRICS.slice(1).map(m => (
            <Card key={m.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="eyebrow">{m.label}</div>
              <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700, marginTop: '4px', lineHeight: 1.1 }}>{m.value}</div>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '4px' }}>{m.sub}</div>
              <div style={{ marginTop: 'auto', paddingTop: 'var(--vw-space-sm)' }}>
                <Sparkline values={m.trend} hex="var(--vw-color-blue-500)" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <ModuleDivider num="I" label="DISCOVERY" />

      <SectionTitle>Jobs and daily discovery</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' }}>
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
              <span className="vw-card-title-sm">New items discovered per day</span>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Last {objRange === '7d' ? '7' : '14'} days · {objTotal} items · {objToday} today</div>
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

      <SectionTitle>Adapters and collectors</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.28fr) minmax(0, 1fr)' }}>
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

      <SectionTitle>Scan failures</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Failures by root cause</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
          {ROOT_CAUSE_FAILURES.reduce((a, f) => a + f.targets, 0)} targets · {ROOT_CAUSE_FAILURES.length} root causes · one fix each
        </div>
        <div>
          {ROOT_CAUSE_FAILURES.map(f => {
            const extra = f.targets - f.examples.length;
            return (
              <div key={f.cause} className="row vw-items-center" style={{ gap: '12px', padding: '11px 0', borderTop: '1px solid var(--vw-color-slate-100)' }}>
                <span className="mono" style={{
                  width: 28, height: 28, borderRadius: '7px', flexShrink: 0, marginTop: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--vw-color-slate-100)', color: 'var(--vw-color-gray-600)',
                  fontSize: '0.625rem', fontWeight: 600
                }}>{f.tag}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="vw-value" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{f.cause}</div>
                  <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {f.examples.map(ex => <span key={ex} className="mono" style={{ fontSize: '0.6875rem', color: 'var(--vw-color-gray-600)', background: 'var(--vw-color-slate-100)', borderRadius: '4px', padding: '2px 7px' }}>{ex}</span>)}
                    {extra > 0 && <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--vw-color-gray-600)', background: 'var(--vw-color-slate-100)', borderRadius: '4px', padding: '2px 7px' }}>+{extra} more</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <Chip tone="neutral">{f.targets} targets</Chip>
                  <button className="nst-btn nst-btn--xs nst-btn--ghost">{f.action}</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <ModuleDivider num="II" label="RECONCILIATION" />

      <SectionTitle>Match outcome</SectionTitle>
      <Card>
        <span className="vw-card-title-sm">Match classes</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{MATCH_TOTAL_NOTE}</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '1px',
          background: 'var(--vw-color-slate-200)',
          borderTop: '1px solid var(--vw-color-slate-200)', marginTop: 'var(--vw-space-md)'
        }}>
          {MATCH_OUTCOME.slice(0, 5).map((t, i) => (
            <div key={t.label} style={{ background: i === 0 ? 'var(--vw-color-slate-50)' : 'var(--vw-color-white)', padding: '12px 18px' }}>
              <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700 }}>{t.value.toLocaleString('en-IN')}</div>
              <div className="vw-value" style={{ marginTop: '3px', fontWeight: 600 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>Trust by domain and region</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)' }}>
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">By domain</span>
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
          <span className="vw-card-title-sm">Open discrepancies by region</span>
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
                  {DOMAIN_KEYS.map(k => <HeatPill key={k} v={r.drift[k]} />)}
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
          <RampBars height={230}
            buckets={BACKLOG_AGE.map((b, i) => ({ label: b.bucket, count: b.count, hex: AGE_RAMP[i] }))} />
        </Card>
      </div>

      <SectionTitle>Discrepancy types and reconciliation cycles</SectionTitle>
      <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Card>
          <span className="vw-card-title-sm">Open items by type</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>All domains · {DISCREPANCY_TYPES.reduce((a, r) => a + r.count, 0)} open</div>
          <div className="row" style={{ gap: 'var(--vw-space-lg)', margin: 'var(--vw-space-sm) 0', flexWrap: 'wrap' }}>
            {DOMAIN_KEYS.map(d => (
              <span key={d} className="row vw-items-center vw-card-metric-label-sub" style={{ gap: '6px' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: DOMAIN_HEX[d] }} />{DOMAIN_LABEL[d]}
              </span>
            ))}
          </div>
          {DISCREPANCY_TYPES.map(r => (
            <div key={r.label} className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', padding: '6px 0' }}>
              <span className="row vw-items-center" style={{ gap: '7px', width: '13.5rem', flexShrink: 0, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[r.domain], flexShrink: 0 }} />
                <span className="vw-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
              </span>
              <span className="vw-card-metric-label-sub" style={{ width: '6rem', flexShrink: 0 }}>{r.category}</span>
              <span className="hbar-track grow" style={{ height: '0.75rem' }}>
                <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${(r.count / DISCREPANCY_TYPES[0].count * 100).toFixed(1)}%`, background: DOMAIN_HEX[r.domain] }} />
              </span>
              <span className="num" style={{ width: '2.5rem', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{r.count}</span>
            </div>
          ))}
        </Card>

        <Card>
          <span className="vw-card-title-sm">Reconciliation cycles</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Most recent cycle per domain, newest first</div>
          <div>
            {RECONCILE_CYCLE_ROWS.map((c, i) => (
              <div key={c.domain} style={{ display: 'grid', gridTemplateColumns: '4.5rem 20px 1fr auto', columnGap: 'var(--vw-space-sm)', alignItems: 'flex-start', padding: '11px 0' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '4.5rem 20px 1fr', columnGap: 'var(--vw-space-sm)', alignItems: 'flex-start', padding: '11px 0', borderTop: '1px dashed var(--vw-color-slate-200)' }}>
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
          </div>
        </Card>
      </div>
    </div>
  );
}
