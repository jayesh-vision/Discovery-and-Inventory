import { useState, type ReactNode } from 'react';

/* ── shared tooltip ─────────────────────────────────────── */
export function Tip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <div className="ch-tip" style={{ left: x, top: y }}>{children}</div>;
}

const fmt = (v: number) => v.toLocaleString('en-IN');

/* ── stacked daily bars ─────────────────────────────────── */
export interface Series { k: string; n: string; hex: string }
export function StackedBars({ days, series, values, height = 240 }: {
  days: string[]; series: Series[]; values: number[][]; height?: number;
}) {
  const [hov, setHov] = useState<{ i: number; x: number; y: number } | null>(null);
  const W = 1000, H = height, padL = 44, padB = 34, padT = 12;
  const totals = values.map(v => v.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals);
  /* a "nice" step sized to roughly 4 ticks over the actual max, rather than
     a fixed 100/500/1000 ladder — a small-count series (single digits to
     tens) got stuck against a 100-unit step, so its bars sat in a sliver at
     the bottom of the chart with the rest of the height empty */
  const rawStep = Math.max(1, max / 4);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const slot = (W - padL) / days.length, bw = Math.min(40, slot * 0.34);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  return (
    <div className="ch-wrap" onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ch-svg" role="img" aria-label="Discovered devices per day">
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="ch-grid" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="ch-axis">{t >= 1000 ? `${t / 1000}k` : t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          let acc = 0;
          return (
            <g key={d} onMouseEnter={e => setHov({ i, x: e.clientX, y: e.clientY })} onMouseMove={e => setHov({ i, x: e.clientX, y: e.clientY })}>
              <rect x={cx - slot / 2} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
              {series.map((s, si) => {
                const v = values[i][si]; const y0 = y(acc + v), y1 = y(acc); acc += v;
                const h = Math.max(0, y1 - y0 - 2);
                return <rect key={s.k} x={cx - bw / 2} y={y0} width={bw} height={h} rx={si === series.length - 1 ? 4 : 0}
                  fill={s.hex} opacity={hov && hov.i !== i ? 0.45 : 1} />;
              })}
              <text x={cx} y={H - 10} textAnchor="middle" className="ch-axis">{d}</text>
            </g>
          );
        })}
      </svg>
      {hov && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-h">{days[hov.i]}</div>
          {series.map((s, si) => (
            <div key={s.k} className="ch-tip-r"><span className="ch-dot" style={{ background: s.hex }} />{s.n}<span className="grow" /><span className="num">{fmt(values[hov.i][si])}</span></div>
          ))}
          <div className="ch-tip-r ch-tip-t">Total<span className="grow" /><span className="num">{fmt(totals[hov.i])}</span></div>
        </Tip>
      )}
      <div className="ch-legend">
        {series.map(s => <span key={s.k} className="ch-leg"><span className="ch-dot" style={{ background: s.hex }} />{s.n}</span>)}
      </div>
    </div>
  );
}

/* ── ramp-coloured bars ───────────────────────────────────
   One bar per bucket, each its own colour (a severity ramp — an age
   histogram's oldest bucket is the one that matters, not "which series is
   this"), rather than StackedBars' one-hex-per-series-across-every-x-value. */
export function RampBars({ buckets, height = 240, onBucketClick }: {
  buckets: { label: string; count: number; hex: string; hint?: string }[]; height?: number; onBucketClick?: (i: number) => void;
}) {
  const [hov, setHov] = useState<{ i: number; x: number; y: number } | null>(null);
  const W = 1000, H = height, padL = 12, padB = 34, padT = 26;
  const max = Math.max(1, ...buckets.map(b => b.count));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const slot = (W - padL) / buckets.length, bw = Math.min(64, slot * 0.5);
  const total = buckets.reduce((a, b) => a + b.count, 0);
  return (
    <div className="ch-wrap" onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ch-svg" role="img" aria-label="Age of open discrepancies">
        {buckets.map((b, i) => {
          const cx = padL + slot * i + slot / 2, y0 = y(b.count), h = Math.max(2, H - padB - y0);
          return (
            <g key={b.label} onMouseMove={e => setHov({ i, x: e.clientX, y: e.clientY })}
              onClick={onBucketClick ? () => onBucketClick(i) : undefined} style={onBucketClick ? { cursor: 'pointer' } : undefined}>
              <rect x={cx - slot / 2} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
              <rect x={cx - bw / 2} y={y0} width={bw} height={h} rx={4} fill={b.hex} opacity={hov && hov.i !== i ? 0.55 : 1} />
              <text x={cx} y={y0 - 8} textAnchor="middle" className="ch-axis num" style={{ fontWeight: 600 }}>{b.count}</text>
              <text x={cx} y={H - 10} textAnchor="middle" className="ch-axis">{b.label}</text>
            </g>
          );
        })}
        <line x1={padL} x2={W} y1={H - padB} y2={H - padB} className="ch-grid" />
      </svg>
      {hov && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-h">{buckets[hov.i].label}</div>
          <div className="ch-tip-r"><span className="ch-dot" style={{ background: buckets[hov.i].hex }} />Open items<span className="grow" /><span className="num">{buckets[hov.i].count}</span></div>
          <div className="ch-tip-r">Share of backlog<span className="grow" /><span className="num">{(buckets[hov.i].count / total * 100).toFixed(0)}%</span></div>
          {buckets[hov.i].hint && <div className="ch-tip-r ch-tip-t">{buckets[hov.i].hint}</div>}
        </Tip>
      )}
    </div>
  );
}

/* ── donut ──────────────────────────────────────────────── */
export interface Slice { k: string; n: string; c: number; hex: string }
export function Donut({ slices, total, label, size = 220, onSliceClick }: { slices: Slice[]; total: number; label: string; size?: number; onSliceClick?: (k: string) => void }) {
  const [hov, setHov] = useState<{ k: string; x: number; y: number } | null>(null);
  const R = 100, r = 62, C = 110, gap = 0.028;
  let a = -Math.PI / 2;
  const arcs = slices.map(s => {
    const span = (s.c / total) * Math.PI * 2, a0 = a + gap / 2, a1 = a + span - gap / 2; a += span;
    const P = (rad: number, t: number) => [C + rad * Math.cos(t), C + rad * Math.sin(t)];
    const [x0, y0] = P(R, a0), [x1, y1] = P(R, a1), [x2, y2] = P(r, a1), [x3, y3] = P(r, a0);
    const big = a1 - a0 > Math.PI ? 1 : 0;
    return { ...s, d: `M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z` };
  });
  const cur = hov ? arcs.find(x => x.k === hov.k) : null;
  return (
    <div className="ch-donut" onMouseLeave={() => setHov(null)}>
      <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label={label}>
        {arcs.map(s => <path key={s.k} d={s.d} fill={s.hex} opacity={hov && hov.k !== s.k ? 0.4 : 1}
          style={onSliceClick ? { cursor: 'pointer' } : undefined} onClick={onSliceClick ? () => onSliceClick(s.k) : undefined}
          onMouseEnter={e => setHov({ k: s.k, x: e.clientX, y: e.clientY })} onMouseMove={e => setHov({ k: s.k, x: e.clientX, y: e.clientY })} />)}
        <text x={C} y={C - 4} textAnchor="middle" className="ch-hero">{fmt(cur ? cur.c : total)}</text>
        <text x={C} y={C + 18} textAnchor="middle" className="ch-hero-s">{cur ? cur.n : label}</text>
      </svg>
      {hov && cur && <Tip x={hov.x} y={hov.y}><div className="ch-tip-r"><span className="ch-dot" style={{ background: cur.hex }} />{cur.n}<span className="grow" /><span className="num">{fmt(cur.c)} · {(cur.c / total * 100).toFixed(0)}%</span></div></Tip>}
    </div>
  );
}

/* ── split horizontal bar: ok vs failed, on a shared scale ─ */
export function SplitBar({ ok, fail, max }: { ok: number; fail: number; max: number }) {
  const w = (v: number) => `${(v / max * 100).toFixed(2)}%`;
  return (
    <span className="ch-split" title={`${fmt(ok)} identified · ${fmt(fail)} failed`}>
      <span className="ch-split-ok" style={{ width: w(ok) }} />
      <span className="ch-split-fail" style={{ width: w(fail) }} />
    </span>
  );
}

/* ── sparkline ──────────────────────────────────────────────
   A trend line with no axes, ticks or hover — decoration on a KPI card, not
   a chart to read values off. Scaled to its own min/max, not zero-based, so
   a tight 12-point run (98.0 → 98.2) still shows visible movement. */
export function Sparkline({ values, height = 32, hex = 'var(--vw-color-blue-500)' }: { values: number[]; height?: number; hex?: string }) {
  const W = 200, H = height, pad = 3;
  const hi = Math.max(...values), lo = Math.min(...values), span = hi - lo || 1;
  const x = (i: number) => pad + (W - pad * 2) * (values.length === 1 ? 0.5 : i / (values.length - 1));
  const y = (v: number) => pad + (H - pad * 2) * (1 - (v - lo) / span);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${d} L${x(values.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-hidden="true">
      <path d={area} fill={hex} opacity=".1" />
      <path d={d} fill="none" stroke={hex} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.6" fill={hex} />
    </svg>
  );
}

/* ── two-series line, zero-based ─────────────────────────────
   Same shape as LineChart, but overlays a second series with its own
   legend swatch (detected vs auto-resolved), rather than stacking or
   sharing an axis with a single line drawn twice. */
export interface LineSeries { n: string; hex: string; values: number[] }
export function MultiLineChart({ labels, series, height = 220, format, detail }: {
  labels: string[]; series: LineSeries[]; height?: number; format: (v: number) => string; detail?: (i: number) => ReactNode;
}) {
  const [hov, setHov] = useState<{ i: number; x: number; y: number } | null>(null);
  const W = 1000, H = height, padL = 46, padR = 16, padT = 18, padB = 32;
  const all = series.flatMap(s => s.values);
  const { y0, y1 } = lineAxisBounds(all);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - y0) / (y1 - y0));
  const n = labels.length;
  const x = (i: number) => padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1));
  const ticks = [y0, (y0 + y1) / 2, y1];
  const step = Math.max(1, Math.round(n / 8));
  return (
    <div className="ch-wrap" onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ch-svg" role="img" aria-label="Detected vs auto-resolved discrepancies per day">
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="ch-grid" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="ch-axis">{format(t)}</text>
          </g>
        ))}
        {series.map(s => {
          const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
          return <path key={s.n} d={d} fill="none" stroke={s.hex} strokeWidth="2" strokeLinejoin="round" />;
        })}
        {labels.map((lab, i) => (i % step !== 0 && i !== n - 1) ? null : (
          <g key={i} onMouseEnter={e => setHov({ i, x: e.clientX, y: e.clientY })} onMouseMove={e => setHov({ i, x: e.clientX, y: e.clientY })}>
            <rect x={x(i) - (W - padL - padR) / n / 2} y={padT} width={(W - padL - padR) / n} height={H - padT - padB} fill="transparent" />
            <text x={x(i)} y={H - 10} textAnchor="middle" className="ch-axis">{lab}</text>
          </g>
        ))}
        {series.map(s => s.values.map((v, i) => (
          <circle key={`${s.n}-${i}`} cx={x(i)} cy={y(v)} r={hov?.i === i ? 4 : 0} fill={s.hex}
            style={{ pointerEvents: 'none', transition: 'r .1s' }} />
        )))}
      </svg>
      {hov && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-h">{labels[hov.i]}</div>
          {detail ? detail(hov.i) : series.map(s => (
            <div key={s.n} className="ch-tip-r"><span className="ch-dot" style={{ background: s.hex }} />{s.n}<span className="grow" /><span className="num">{format(s.values[hov.i])}</span></div>
          ))}
        </Tip>
      )}
      <div className="ch-legend">
        {series.map(s => <span key={s.n} className="ch-leg"><span className="ch-dot" style={{ background: s.hex }} />{s.n}</span>)}
      </div>
    </div>
  );
}

/* ── measured history + dashed run-rate projection ─────────────
   A solid line for what happened, a dashed continuation of the same slope
   for where it's headed, and a horizontal target line to show when (if
   ever) the dashed line crosses it. The two series share one x-axis built
   by concatenating historyLabels with projectionLabels (skipping its first
   point — "today" — since that's the same point history already drew). */
export function ProjectionChart({ historyLabels, historyValues, projectionLabels, projectionValues, target, targetLabel, yBounds, height = 260, format }: {
  historyLabels: string[]; historyValues: number[]; projectionLabels: string[]; projectionValues: number[];
  target: number; targetLabel: string; yBounds: { y0: number; y1: number }; height?: number; format: (v: number) => string;
}) {
  const [hov, setHov] = useState<{ i: number; x: number; y: number; label: string; value: number; kind: 'measured' | 'projected' } | null>(null);
  const W = 1000, H = height, padL = 50, padR = 60, padT = 20, padB = 32;
  const { y0, y1 } = yBounds;
  const labels = [...historyLabels, ...projectionLabels.slice(1)];
  const n = labels.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - y0) / (y1 - y0));
  const x = (i: number) => padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1));
  const ticks = [y0, (y0 + y1) / 2, y1];
  const hi = historyValues.length;
  const dHist = historyValues.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  const dProj = projectionValues.map((v, i) => `${i ? 'L' : 'M'}${x(hi - 1 + i)} ${y(v)}`).join(' ');
  const step = Math.max(1, Math.round(n / 10));
  return (
    <div className="ch-wrap" onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ch-svg" role="img" aria-label="Inventory trust index, measured and projected">
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="ch-grid" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="ch-axis">{format(t)}</text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke="var(--vw-color-emerald-500)" strokeWidth="1.5" strokeDasharray="2 4" />
        <text x={W - padR + 6} y={y(target) - 6} className="ch-axis" style={{ fill: 'var(--vw-color-emerald-600)' }}>{targetLabel}</text>
        <path d={dHist} fill="none" stroke="var(--vw-color-blue-500)" strokeWidth="2" strokeLinejoin="round" />
        <path d={dProj} fill="none" stroke="var(--vw-color-blue-400)" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
        <circle cx={x(hi - 1)} cy={y(historyValues[hi - 1])} r="4" fill="var(--vw-color-blue-600)" />
        <text x={x(hi - 1)} y={y(historyValues[hi - 1]) - 12} textAnchor="middle" className="ch-lab">{format(historyValues[hi - 1])}</text>
        <circle cx={x(n - 1)} cy={y(projectionValues[projectionValues.length - 1])} r="4" fill="var(--vw-color-emerald-600)" />
        <text x={x(n - 1)} y={y(projectionValues[projectionValues.length - 1]) - 12} textAnchor="middle" className="ch-lab">{format(projectionValues[projectionValues.length - 1])}</text>
        {labels.map((lab, i) => (i % step !== 0 && i !== n - 1 && i !== hi - 1) ? null : (
          <g key={i} onMouseEnter={e => {
            const kind: 'measured' | 'projected' = i < hi ? 'measured' : 'projected';
            const value = i < hi ? historyValues[i] : projectionValues[i - hi + 1];
            setHov({ i, x: e.clientX, y: e.clientY, label: lab, value, kind });
          }} onMouseMove={e => setHov(h => h && { ...h, x: e.clientX, y: e.clientY })}>
            <rect x={x(i) - (W - padL - padR) / n / 2} y={padT} width={(W - padL - padR) / n} height={H - padT - padB} fill="transparent" />
            <text x={x(i)} y={H - 10} textAnchor="middle" className="ch-axis">{lab}</text>
          </g>
        ))}
      </svg>
      {hov && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-h">{hov.label}</div>
          <div className="ch-tip-r">{hov.kind === 'measured' ? 'Measured' : 'Projected'}<span className="grow" /><span className="num">{format(hov.value)}</span></div>
        </Tip>
      )}
      <div className="ch-legend">
        <span className="ch-leg"><span className="ch-dot" style={{ background: 'var(--vw-color-blue-500)' }} />Measured</span>
        <span className="ch-leg"><span className="ch-dot" style={{ background: 'var(--vw-color-blue-400)' }} />Projection at current rate</span>
        <span className="ch-leg"><span className="ch-dot" style={{ background: 'var(--vw-color-emerald-500)' }} />{targetLabel}</span>
      </div>
    </div>
  );
}

/* ── single-series line, zero-based ──────────────────────────
   One series, so no legend. */
/** The floor/ceiling a LineChart draws its axis to — exported so callers can
    read the same bounds the chart actually draws. Floor is always zero. */
export function lineAxisBounds(values: number[]) {
  const hi = Math.max(...values), lo = Math.min(...values), pad = Math.max(1, (hi - lo) * 0.35);
  return { y0: 0, y1: Math.ceil((hi + pad) / 10) * 10 };
}

export function LineChart({ labels, values, detail, height = 210, format }: {
  labels: string[]; values: number[]; detail?: (i: number) => ReactNode; height?: number; format: (v: number) => string;
}) {
  const [hov, setHov] = useState<{ i: number; x: number; y: number } | null>(null);
  const W = 1000, H = height, padL = 54, padR = 24, padT = 18, padB = 32;
  const { y0, y1 } = lineAxisBounds(values);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - y0) / (y1 - y0));
  const x = (i: number) => padL + (W - padL - padR) * (values.length === 1 ? 0.5 : i / (values.length - 1));
  const ticks = [y0, (y0 + y1) / 2, y1];
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  const area = `${d} L${x(values.length - 1)} ${y(y0)} L${x(0)} ${y(y0)} Z`;
  return (
    <div className="ch-wrap" onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="ch-svg" role="img" aria-label="Devices identified per cycle">
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="ch-grid" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="ch-axis">{format(t)}</text>
          </g>
        ))}
        <path d={area} fill="var(--vw-color-blue-500)" opacity=".08" />
        <path d={d} fill="none" stroke="var(--vw-color-blue-500)" strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => (
          <g key={i} onMouseEnter={e => setHov({ i, x: e.clientX, y: e.clientY })} onMouseMove={e => setHov({ i, x: e.clientX, y: e.clientY })}>
            <rect x={x(i) - (W - padL - padR) / values.length / 2} y={padT} width={(W - padL - padR) / values.length} height={H - padT - padB} fill="transparent" />
            <circle cx={x(i)} cy={y(v)} r={hov?.i === i ? 6 : 4} fill="var(--vw-color-white)" stroke="var(--vw-color-blue-500)" strokeWidth="2" />
            {i === values.length - 1 && <text x={x(i)} y={y(v) - 12} textAnchor="middle" className="ch-lab">{format(v)}</text>}
            <text x={x(i)} y={H - 10} textAnchor="middle" className="ch-axis">{labels[i]}</text>
          </g>
        ))}
      </svg>
      {hov && (
        <Tip x={hov.x} y={hov.y}>
          <div className="ch-tip-h">{labels[hov.i]}</div>
          {detail ? detail(hov.i) : <div className="ch-tip-r">{format(values[hov.i])}</div>}
        </Tip>
      )}
    </div>
  );
}
