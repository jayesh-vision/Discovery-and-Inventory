/* Small shared pieces for the DCIM inventory screens. */
import type { ReactNode } from 'react';

export function Bar({ pct }: { pct: number }) {
  const c = pct > 90 ? 'bad' : pct > 75 ? 'warn' : '';
  return <div className="bar" title={`${pct.toFixed(0)}%`}><i className={c} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>;
}

export function Empty({ title, children, actions, icon }: { title: string; children?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return <div className="empty">{icon && <div className="empty-ic" aria-hidden>{icon}</div>}<h3>{title}</h3>{children && <p>{children}</p>}{actions && <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>{actions}</div>}</div>;
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return <dl className="kv">{items.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

export function Seg<K extends string>({ value, options, onChange, label }: { value: K; options: { k: K; n: string }[]; onChange: (k: K) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => <button key={o.k} type="button" className={o.k === value ? 'is-on' : ''} aria-pressed={o.k === value} onClick={() => onChange(o.k)}>{o.n}</button>)}
    </div>
  );
}

/** a section title with an optional count and actions on the right */
export function Head({ title, count, sub, right }: { title: string; count?: number; sub?: string; right?: ReactNode }) {
  return (
    <div className="sec-head">
      <div><h3 className="vw-card-title">{title}{count !== undefined && <span className="pill-n">{count.toLocaleString('en-IN')}</span>}</h3>{sub && <p className="vw-card-description small">{sub}</p>}</div>
      {right && <div className="row">{right}</div>}
    </div>
  );
}

/** human label for an enum value: DATA_HALL → data hall */
export const human = (v?: string) => (v ?? '').toLowerCase().replace(/_/g, ' ');
export const fmt = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
