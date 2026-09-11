import { useState, type ReactNode } from 'react';
import { cv } from './ui';

/* A KPI an operator can read without a legend:
   - a plain-language title and a one-sentence definition behind ⓘ
   - the number with its unit, and the denominator it is a part of
   - a small visual of the same fact (segments of a whole, or the last cycles)
   - what changed since the last cycle, with the direction spelled out as
     better / worse, never a bare arrow
   - one action, named by what it opens */

export interface Delta { text: string; better: boolean | null }   /* null = neutral */

export function KpiCard({ title, definition, value, unit, of, visual, delta, action, tone = 'slate' }: {
  title: string; definition: string; value: string; unit?: string; of?: string;
  visual?: ReactNode; delta: Delta; action?: { label: string; onClick: () => void }; tone?: string;
}) {
  const [info, setInfo] = useState(false);
  const dTone = delta.better === null ? 'gray' : delta.better ? 'emerald' : 'red';
  return (
    <div className="kpi3" style={{ ['--kpi-accent' as string]: cv(tone, 500) }}>
      <div className="kpi3-head">
        <span className="kpi3-title">{title}</span>
        <button className="kpi3-info" aria-label={`What ${title.toLowerCase()} means`} aria-expanded={info}
          onMouseEnter={() => setInfo(true)} onMouseLeave={() => setInfo(false)}
          onFocus={() => setInfo(true)} onBlur={() => setInfo(false)}
          onClick={() => setInfo(v => !v)}>i</button>
        {info && <div className="kpi3-def" role="tooltip">{definition}</div>}
      </div>
      <div className="kpi3-num">
        <span className="kpi3-v num">{value}</span>{unit && <span className="kpi3-u">{unit}</span>}
        {of && <span className="kpi3-of">{of}</span>}
      </div>
      {visual && <div className="kpi3-vis">{visual}</div>}
      <div className="kpi3-delta" style={{ color: cv(dTone, delta.better === null ? 500 : 700) }}>
        {delta.better === null ? '' : delta.better ? '▲ ' : '▼ '}{delta.text}
      </div>
      {action && <button className="kpi3-act" onClick={action.onClick}>{action.label} →</button>}
    </div>
  );
}

/* segments of one whole, with the split written underneath */
export function Segments({ parts, total }: { parts: { n: string; c: number; hex: string }[]; total: number }) {
  return (
    <>
      <div className="kpi3-seg" role="img" aria-label={parts.map(p => `${p.n} ${p.c}`).join(', ')}>
        {parts.map(p => <span key={p.n} style={{ width: `${(p.c / total * 100).toFixed(2)}%`, background: p.hex }} />)}
      </div>
      <div className="kpi3-seg-l">
        {parts.map((p, i) => <span key={p.n}>{i > 0 && <span className="kpi3-sep">·</span>}<i style={{ background: p.hex }} /><b className="num">{p.c.toLocaleString('en-IN')}</b> {p.n.toLowerCase()}</span>)}
      </div>
    </>
  );
}

/* the last cycles, oldest to newest; the current one is the solid bar */
export function Cycles({ values, labels, format }: { values: number[]; labels: string[]; format: (v: number) => string }) {
  const max = Math.max(...values), min = Math.min(...values);
  const span = Math.max(1e-9, max - min);
  const [hov, setHov] = useState<number | null>(null);
  return (
    <div className="kpi3-cyc" onMouseLeave={() => setHov(null)}>
      {values.map((v, i) => {
        const h = 22 + Math.round(((v - min) / span) * 26);
        const last = i === values.length - 1;
        return (
          <span key={i} className={`kpi3-cyc-b${last ? ' is-cur' : ''}${hov === i ? ' is-hov' : ''}`} style={{ height: h }}
            onMouseEnter={() => setHov(i)} title={`${labels[i]} · ${format(v)}`} />
        );
      })}
      <span className="kpi3-cyc-l">{hov === null ? `last ${values.length} cycles` : `${labels[hov]} · ${format(values[hov])}`}</span>
    </div>
  );
}

/* a value against a limit */
export function Against({ value, limit, format, hex }: { value: number; limit: number; format: (v: number) => string; hex: string }) {
  const pctV = Math.min(100, value / limit * 100);
  return (
    <>
      <div className="kpi3-seg" role="img" aria-label={`${format(value)} of a ${format(limit)} limit`}>
        <span style={{ width: `${pctV.toFixed(1)}%`, background: hex }} />
      </div>
      <div className="kpi3-seg-l"><span><b className="num">{pctV.toFixed(0)}%</b> of the {format(limit)} window</span></div>
    </>
  );
}
