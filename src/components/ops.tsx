import type { CSSProperties, ReactNode } from 'react';
import { InfoTip } from './ui';

/* ── Operational UI primitives ─────────────────────────────
   The building blocks of the Insights dashboard: section headers, panels,
   domain tags, status pills, inline meters and a small stroke-icon set.
   Styled by src/styles/insights.css (.ix-*); every piece is data-agnostic
   so the Reconciliation screens can adopt the same language later. */

export type Tone = 'success' | 'warning' | 'critical' | 'info' | 'neutral';

/* one icon family: 24-box, 1.6 stroke, round joins — the same construction
   as the sidebar's icons, so nothing on the page reads as a different set */
const svg = (paths: string, size = 15) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths }} />
);
export const Ic = {
  layers:   (s?: number) => svg('<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>', s),
  clock:    (s?: number) => svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>', s),
  calendar: (s?: number) => svg('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', s),
  alert:    (s?: number) => svg('<path d="M12 4 3 19h18L12 4z"/><path d="M12 10v4M12 16.5h.01"/>', s),
  key:      (s?: number) => svg('<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8M16 6l2 2M14 8l2 2"/>', s),
  offline:  (s?: number) => svg('<path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5.5 12a10 10 0 0 1 13 0"/><path d="M9 15.5a5 5 0 0 1 6 0"/><path d="M12 19h.01"/><path d="M4 4l16 16"/>', s),
  finger:   (s?: number) => svg('<path d="M7 8a5 5 0 0 1 10 0v2"/><path d="M5 11a7 7 0 0 1 14 0v3"/><path d="M9 11a3 3 0 0 1 6 0v5"/><path d="M12 11v9"/><path d="M6 15c0 2 1 4 2 5"/>', s),
  check:    (s?: number) => svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', s),
  chevron:  (s?: number) => svg('<path d="m9 6 6 6-6 6"/>', s),
  trendUp:  (s?: number) => svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', s),
  trendDown:(s?: number) => svg('<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>', s)
};

/* ── section header: title, one-line description, optional right slot ─ */
export function SectionHeader({ title, description, right }: { title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="ix-sh">
      <div>
        <div className="ix-sh-t">{title}</div>
        {description && <div className="ix-sh-d">{description}</div>}
      </div>
      {right && <div className="ix-sh-r">{right}</div>}
    </div>
  );
}

/* ── numbered module rule: "I · DISCOVERY ─────── meta" ─────────────── */
export function ModuleRule({ num, label, meta }: { num: string; label: string; meta?: ReactNode }) {
  return (
    <div className="ix-module" role="separator" aria-label={label}>
      <span className="ix-module-n">{num}</span>
      <span className="ix-module-l">{label}</span>
      <span className="ix-module-rule" />
      {meta && <span className="ix-module-meta">{meta}</span>}
    </div>
  );
}

/* ── panel: a section of the page, with a standard header ─────────────
   `flush` lets a table run edge to edge; the header keeps its inset. */
export function Panel({ title, description, info, infoLabel, right, flush, tall, className = '', style, children }: {
  title: string; description?: ReactNode; info?: string; infoLabel?: string; right?: ReactNode;
  flush?: boolean; tall?: boolean; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <section className={`ix-panel${tall ? ' is-tall' : ''} ${className}`} style={style}>
      <div className="ix-panel-h">
        <div className="ix-panel-hl">
          <div className="ix-panel-t">{title}{info && <InfoTip text={info} label={infoLabel ?? `What ${title.toLowerCase()} shows`} />}</div>
          {description && <div className="ix-panel-d">{description}</div>}
        </div>
        {right && <div className="ix-panel-r">{right}</div>}
      </div>
      <div className={`ix-panel-b${flush ? ' is-flush' : ''}`}>{children}</div>
    </section>
  );
}

/* ── domain identity: a colour dot and the name, never the colour alone ─ */
export function DomainTag({ hex, label, parent, sm, muted }: { hex: string; label: string; parent?: string; sm?: boolean; muted?: boolean }) {
  return (
    <span className={`ix-dom${sm ? ' is-sm' : ''}${muted ? ' is-muted' : ''}`}>
      <i style={{ background: hex }} />{parent && <span className="ix-dom-p">{parent} · </span>}{label}
    </span>
  );
}

/* ── status pill: tone + text (+ a leading dot), compact by default ──── */
export function Pill({ tone, children, icon, dot = true }: { tone: Tone; children: ReactNode; icon?: ReactNode; dot?: boolean }) {
  return <span className={`ix-pill is-${tone}`}>{icon ?? (dot && <i />)}{children}</span>;
}

/* ── inline meter: the figure and a short bar. `min` rescales the bar so a
   98.9 vs 95.7 comparison actually shows a difference (a 0–100 bar makes
   every high-90s value look full). */
export function Meter({ pct, hex, min = 0, decimals }: { pct: number; hex: string; min?: number; decimals?: number }) {
  const w = Math.max(0, Math.min(100, (pct - min) / (100 - min) * 100));
  const text = decimals !== undefined ? pct.toFixed(decimals) : (pct % 1 === 0 ? String(pct) : pct.toFixed(2));
  return (
    <span className="ix-meter" title={min ? `${text}% on a ${min}–100% scale` : `${text}%`}>
      <span className="ix-meter-v num">{text}%</span>
      <span className="ix-meter-t"><span className="ix-meter-f" style={{ width: `${w}%`, background: hex }} /></span>
    </span>
  );
}

/* ── trend delta: direction + whether that direction is good ──────────── */
export function Delta({ dir, good, children }: { dir: 'up' | 'down' | 'flat'; good: boolean | null; children: ReactNode }) {
  const cls = good === null ? 'is-flat' : good ? 'is-good' : 'is-bad';
  return (
    <span className={`ix-delta ${cls}`}>
      {dir === 'up' ? Ic.trendUp(12) : dir === 'down' ? Ic.trendDown(12) : null}{children}
    </span>
  );
}

/* ── segmented control ────────────────────────────────────────────────── */
export function Seg<K extends string>({ options, value, onChange, label }: {
  options: { k: K; n: string }[]; value: K; onChange: (k: K) => void; label: string;
}) {
  return (
    <div className="ix-seg" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.k} type="button" className={o.k === value ? 'is-on' : undefined} aria-pressed={o.k === value}
          onClick={() => onChange(o.k)}>{o.n}</button>
      ))}
    </div>
  );
}

/* ── monospace identifier chip (hostnames, IPs) ───────────────────────── */
export const Code = ({ children }: { children: ReactNode }) => <span className="ix-code">{children}</span>;
