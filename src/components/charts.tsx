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
  const step = max > 2000 ? 1000 : max > 500 ? 500 : 100;
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
