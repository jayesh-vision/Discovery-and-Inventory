import { useState, type CSSProperties } from 'react';
import { Card, Chip, cv } from '../components/ui';
import { Tip } from '../components/charts';
import type { ColorTone } from '../data/ledger';
import {
  CYCLE_OUTCOME, DOMAIN_COVERAGE, DISCREPANCY_BY_DOMAIN, REGION_HEALTH, REGION_DOMAINS,
  DISTRIBUTION, DISTRIBUTION_TOTAL, CYCLE_ACTIVITY,
  DOMAIN_HEX, DOMAIN_LABEL, RANGE_OPTIONS, type RangeOption, type DomainKey
} from '../data/reconcileOverview';

const OUTCOME_TONE_COLOR = {
  success: 'emerald', warning: 'amber', orange: 'orange', error: 'red', purple: 'purple'
} as const;

/* health-score direction: higher is better, so red sits below the low
   threshold rather than above a usage-ratio's high one */
const healthTone = (pct: number): 'red' | 'amber' | 'emerald' => (pct < 90 ? 'red' : pct < 95 ? 'amber' : 'emerald');

const DomainDot = ({ domain }: { domain: DomainKey }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

/* label / proportional bar / value — a ranking list, not a usage meter, so
   the fill is sized against the list's own max rather than a fixed total */
function RankBar({ label, count, max, hex, labelWidth = '8.5rem' }: {
  label: string; count: number; max: number; hex: string; labelWidth?: string;
}) {
  return (
    <div className="hbar" style={{ gridTemplateColumns: `${labelWidth} 1fr 3rem` }}>
      <span className="vw-value">{label}</span>
      <span className="hbar-track" style={{ height: '0.625rem' }}>
        <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${(count / max * 100).toFixed(1)}%`, background: hex }} />
      </span>
      <span className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{count}</span>
    </div>
  );
}

/* thin inline meter for a table cell, scaled down so it can sit beside a
   number without dominating the row */
function MiniBar({ pct, hex }: { pct: number; hex: string }) {
  return (
    <span className="hbar-track" style={{ display: 'inline-block', width: '4.5rem', height: '5px', verticalAlign: 'middle', marginLeft: '8px' }}>
      <span className="hbar-fill" style={{ display: 'block', height: '100%', width: `${pct}%`, background: hex }} />
    </span>
  );
}

/* a full pie (no hole), with the share written on any wedge wide enough to
   hold it, so the picture reads without a legend lookup */
interface PieSlice { k: string; n: string; c: number; hex: string }
function Pie({ slices, total, size = 180 }: { slices: PieSlice[]; total: number; size?: number }) {
  const [hov, setHov] = useState<{ k: string; x: number; y: number } | null>(null);
  const R = 100, C = 110;
  let a = -Math.PI / 2;
  const P = (rad: number, t: number) => [C + rad * Math.cos(t), C + rad * Math.sin(t)];
  const arcs = slices.map(s => {
    const span = (s.c / total) * Math.PI * 2, a0 = a, a1 = a + span; a = a1;
    const [x0, y0] = P(R, a0), [x1, y1] = P(R, a1), [lx, ly] = P(R * 0.62, (a0 + a1) / 2);
    const pct = s.c / total * 100;
    return { ...s, pct, lx, ly, d: `M${C} ${C}L${x0} ${y0}A${R} ${R} 0 ${span > Math.PI ? 1 : 0} 1 ${x1} ${y1}Z` };
  });
  const cur = hov ? arcs.find(x => x.k === hov.k) : null;
  return (
    <div className="ch-donut" style={{ flexShrink: 0 }} onMouseLeave={() => setHov(null)}>
      <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label="Open discrepancies by domain">
        {arcs.map(s => (
          <g key={s.k} onMouseEnter={e => setHov({ k: s.k, x: e.clientX, y: e.clientY })} onMouseMove={e => setHov({ k: s.k, x: e.clientX, y: e.clientY })}>
            <path d={s.d} fill={s.hex} stroke="var(--vw-color-white)" strokeWidth="2" opacity={hov && hov.k !== s.k ? 0.4 : 1} />
            {s.pct >= 8 && (
              <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central"
                style={{ fill: 'var(--vw-color-white)', fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>{Math.round(s.pct)}%</text>
            )}
          </g>
        ))}
      </svg>
      {hov && cur && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-r"><span className="ch-dot" style={{ background: cur.hex }} />{cur.n}<span className="grow" /><span className="num">{cur.c} · {cur.pct.toFixed(0)}%</span></div>
        </Tip>
      )}
    </div>
  );
}

/* heat tint for a region × domain drift cell, scaled to the hottest cell */
const heatStyle = (v: number, max: number): CSSProperties => {
  const r = v / max;
  const shade = r > 0.75 ? 300 : r > 0.5 ? 200 : r > 0.25 ? 100 : r > 0 ? 50 : 0;
  return {
    background: shade ? cv('red', shade) : 'var(--vw-color-slate-50)',
    color: shade >= 200 ? cv('red', 900) : 'var(--vw-color-gray-800)',
    fontWeight: shade >= 200 ? 600 : 400, textAlign: 'center', borderRadius: 'var(--vw-radius-xs)'
  };
};

function OutcomeIcon({ icon, tone }: { icon: string; tone: string }) {
  return (
    <span style={{
      width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: cv(tone, 50), color: cv(tone, 600), fontSize: '1rem', flexShrink: 0
    }}>{icon}</span>
  );
}

const DISCREPANCY_TOTAL = DISCREPANCY_BY_DOMAIN.reduce((a, d) => a + d.count, 0);
const COVERAGE_SUM = DOMAIN_COVERAGE.reduce(
  (a, d) => ({ inScope: a.inScope + d.inScope, scanned: a.scanned + d.scanned, inSync: a.inSync + d.inSync, drifted: a.drifted + d.drifted }),
  { inScope: 0, scanned: 0, inSync: 0, drifted: 0 });
const REGION_HEAT_MAX = Math.max(...REGION_HEALTH.flatMap(r => REGION_DOMAINS.map(k => r.drift[k])));
/* 500-weight swatches read pale as text; the same hue one step darker */
const DOMAIN_TONE: Record<DomainKey, ColorTone> = { RAN: 'purple', Core: 'fuchsia', Transport: 'orange', IPMPLS: 'sky' };

export default function Reconcile() {
  const [range, setRange] = useState<RangeOption>('Today');

  return (
    <div className="page">
      <div className="page-head">
        <div className="stack-x" style={{ maxWidth: '70ch' }}>
          <h1 className="vw-page-title" style={{ margin: 0 }}>Discovery and reconciliation</h1>
          <p className="vw-page-description" style={{ margin: 0 }}>PAN network overview · RAN, Core, Transport, IP/MPLS</p>
        </div>
        <div className="seg">
          {RANGE_OPTIONS.map(r => (
            <button key={r} className={r === range ? 'is-on' : ''} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="vw-card-title-sm" style={{ marginBottom: 'var(--vw-space-sm)' }}>How the cycle came out</div>
        <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {CYCLE_OUTCOME.map(t => {
            const tone = OUTCOME_TONE_COLOR[t.tone];
            return (
              <div key={t.label} className={`vw-card-section vw-card--accent vw-card--${t.tone}`}
                style={{ paddingTop: 'calc(var(--vw-space-lg) + 3px)' }}>
                <div className="vw-card-accent" style={{ background: cv(tone, 500) }} />
                <div className="row vw-items-center" style={{ gap: '10px', marginBottom: '6px' }}>
                  <OutcomeIcon icon={t.icon} tone={tone} />
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700, color: cv(tone, 700), lineHeight: 1.1 }}>{t.value}</div>
                </div>
                <div className="vw-value" style={{ fontWeight: 600 }}>{t.label}</div>
                <div className="vw-card-metric-label-sub" style={{ marginTop: '3px' }}>{t.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="vw-grid vw-grid-cols-2 vw-gap-md">
      <Card style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="vw-card-title-sm">Coverage by domain</span>
        <table className="mtbl">
          <thead><tr><th>Domain</th><th>In scope</th><th>Scanned</th><th>In sync</th><th>Drifted</th><th>Last scan</th><th>Next scan</th></tr></thead>
          <tbody>{DOMAIN_COVERAGE.map(d => (
            <tr key={d.domain}>
              <td><DomainDot domain={d.domain} /></td>
              <td className="num">{d.inScope.toLocaleString('en-IN')}</td>
              <td className="num">
                {d.scanned.toLocaleString('en-IN')} ({d.scannedPct})
                <MiniBar pct={d.scanned / d.inScope * 100} hex={DOMAIN_HEX[d.domain]} />
              </td>
              <td className="num">{d.inSync.toLocaleString('en-IN')}</td>
              <td className="num" style={{ color: cv('red', 600), fontWeight: 600 }}>{d.drifted}</td>
              <td>{d.lastScan}</td>
              <td>{d.nextScan}</td>
            </tr>))}
          </tbody>
        </table>
        <div className="vw-card-metric-label-sub" style={{ marginTop: 'auto', paddingTop: 'var(--vw-space-sm)' }}>
          All domains · {COVERAGE_SUM.inScope.toLocaleString('en-IN')} in scope · {COVERAGE_SUM.scanned.toLocaleString('en-IN')} scanned
          ({(COVERAGE_SUM.scanned / COVERAGE_SUM.inScope * 100).toFixed(1)}%) · {COVERAGE_SUM.inSync.toLocaleString('en-IN')} in sync · {COVERAGE_SUM.drifted} drifted
        </div>
      </Card>

      <Card style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="vw-card-title-sm">Distribution, all use cases · {DISTRIBUTION_TOTAL} open</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Bar colour is the domain — see legend</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: 'var(--vw-space-sm)' }}>
          {DISTRIBUTION.map(u => (
            <RankBar key={u.label} label={u.label} count={u.count} max={DISTRIBUTION[0].count} hex={DOMAIN_HEX[u.domain]} labelWidth="13rem" />
          ))}
        </div>
        <div className="row" style={{ gap: 'var(--vw-space-lg)', marginTop: 'var(--vw-space-sm)', flexWrap: 'wrap' }}>
          {DISCREPANCY_BY_DOMAIN.map(d => (
            <span key={d.domain} className="row vw-items-center vw-card-metric-label-sub" style={{ gap: '6px' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: DOMAIN_HEX[d.domain] }} />
              {DOMAIN_LABEL[d.domain]} · {d.count}
            </span>
          ))}
        </div>
      </Card>
      </div>

      <div className="vw-grid vw-grid-cols-2 vw-gap-md">
        {/* the row's height comes from the heat table on the right, so this
            card stretches its content to meet it: the pie centres vertically
            and the legend rows spread down the full column */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-title-sm">Open discrepancies by domain · {DISCREPANCY_TOTAL} open</span>
          <div className="row vw-items-center" style={{ gap: 'var(--vw-space-xl)', marginTop: 'var(--vw-space-sm)', flex: 1 }}>
            <Pie size={240} total={DISCREPANCY_TOTAL}
              slices={DISCREPANCY_BY_DOMAIN.map(d => ({ k: d.domain, n: DOMAIN_LABEL[d.domain], c: d.count, hex: DOMAIN_HEX[d.domain] }))} />
            <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignSelf: 'stretch' }}>
              {DISCREPANCY_BY_DOMAIN.map(d => {
                /* DISTRIBUTION is sorted by count, so the first row in this
                   domain is its biggest single cause */
                const top = DISTRIBUTION.find(u => u.domain === d.domain);
                const cycle = CYCLE_ACTIVITY.find(c => c.domain === d.domain)!;
                return (
                  <div key={d.domain} style={{ padding: '10px 0', borderTop: '1px solid var(--vw-color-slate-100)' }}>
                    <div className="row vw-items-center" style={{ gap: '8px' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: DOMAIN_HEX[d.domain], flexShrink: 0 }} />
                      <span className="vw-value grow" style={{ fontWeight: 600 }}>{DOMAIN_LABEL[d.domain]}</span>
                      <span className="num" style={{ fontWeight: 700 }}>{d.count}</span>
                      <span className="vw-card-metric-label-sub" style={{ width: '2.75rem', textAlign: 'right' }}>{Math.round(d.count / DISCREPANCY_TOTAL * 100)}%</span>
                    </div>
                    <div className="vw-card-metric-label-sub" style={{ marginLeft: '17px', marginTop: '2px' }}>
                      Top cause: {top?.label} ({top?.count}) · {cycle.resolved} resolved this cycle
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <span className="vw-card-title-sm">Region health, all 4 domains</span>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Open discrepancies per region and domain — darker is more drift</div>
          <table className="mtbl" style={{ marginTop: 'var(--vw-space-sm)' }}>
            <thead>
              <tr>
                <th>Region</th><th>Health</th>
                {REGION_DOMAINS.map(k => <th key={k} style={{ textAlign: 'center' }}>{DOMAIN_LABEL[k]}</th>)}
                <th style={{ textAlign: 'right' }}>Open</th>
              </tr>
            </thead>
            <tbody>{REGION_HEALTH.map(r => {
              const open = REGION_DOMAINS.reduce((a, k) => a + r.drift[k], 0);
              const t = healthTone(r.pct);
              return (
                <tr key={r.region}>
                  <td className="vw-value" style={{ fontWeight: 500 }}>{r.region}</td>
                  <td><Chip tone={t === 'red' ? 'error' : t === 'amber' ? 'warning' : 'success'} strong>{r.pct.toFixed(1)}%</Chip></td>
                  {REGION_DOMAINS.map(k => <td key={k} className="num" style={heatStyle(r.drift[k], REGION_HEAT_MAX)}>{r.drift[k]}</td>)}
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{open}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      </div>

      <Card>
        <span className="vw-card-title-sm">Reconciliation cycle activity</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Most recent cycle per domain, newest first</div>
        {/* a timeline, not cards: each cycle is an event with a time, and the
            spine puts the four domains in the order they actually ran */}
        <div style={{ marginTop: 'var(--vw-space-sm)' }}>
          {CYCLE_ACTIVITY.map(c => {
            const open = c.found - c.resolved, rate = Math.round(c.resolved / c.found * 100);
            const when = DOMAIN_COVERAGE.find(d => d.domain === c.domain)!.lastScan;
            return (
              <div key={c.domain} style={{ display: 'grid', gridTemplateColumns: '6.5rem 26px 1fr auto', columnGap: 'var(--vw-space-sm)', alignItems: 'start', padding: '12px 0' }}>
                <span className="mono vw-card-metric-label-sub" style={{ paddingTop: '3px' }}>{when}</span>
                <span style={{ position: 'relative', alignSelf: 'stretch' }}>
                  <span style={{ position: 'absolute', left: 6, top: 4, width: 12, height: 12, borderRadius: '50%', background: DOMAIN_HEX[c.domain], boxShadow: '0 0 0 2px var(--vw-color-white)' }} />
                  <span style={{ position: 'absolute', left: 11, top: 18, bottom: -24, width: 2, background: 'var(--vw-color-slate-200)' }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="vw-value">
                    <b style={{ color: cv(DOMAIN_TONE[c.domain], 700) }}>{DOMAIN_LABEL[c.domain]}</b> reconciliation cycle completed
                    <span className="vw-card-metric-label-sub"> · {c.scanned.toLocaleString('en-IN')} records scanned, {c.found} drifted from inventory</span>
                  </div>
                  <div className="row" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <Chip tone="warning">{c.found} drifted</Chip>
                    <Chip tone="success">{c.resolved} auto-resolved</Chip>
                    <Chip tone={open ? 'orange' : 'neutral'}>{open} still open</Chip>
                  </div>
                </div>
                <div style={{ textAlign: 'right', paddingLeft: 'var(--vw-space-md)' }}>
                  <div className="num" style={{ fontSize: 'var(--vw-font-value-md)', fontWeight: 700, color: cv(rate >= 60 ? 'emerald' : 'amber', 700), lineHeight: 1.1 }}>{rate}%</div>
                  <div className="vw-card-metric-label-sub">resolved</div>
                </div>
              </div>
            );
          })}
          {/* the one scheduled (not continuous) domain closes the timeline
              with what happens next */}
          {DOMAIN_COVERAGE.filter(d => d.nextScan !== 'Continuous').map(d => (
            <div key={d.domain} style={{ display: 'grid', gridTemplateColumns: '6.5rem 26px 1fr', columnGap: 'var(--vw-space-sm)', alignItems: 'start', padding: '12px 0', borderTop: '1px dashed var(--vw-color-slate-200)' }}>
              <span className="mono vw-card-metric-label-sub" style={{ paddingTop: '3px' }}>{d.nextScan}</span>
              <span style={{ position: 'relative', alignSelf: 'stretch' }}>
                <span style={{ position: 'absolute', left: 6, top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--vw-color-white)', border: `2px solid ${DOMAIN_HEX[d.domain]}`, boxSizing: 'border-box' }} />
              </span>
              <div className="vw-card-metric-label-sub" style={{ paddingTop: '3px' }}>
                Next: <b style={{ color: 'var(--vw-color-gray-800)' }}>{DOMAIN_LABEL[d.domain]}</b> nightly scan — {d.inScope - d.scanned} unscanned assets will be retried
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
