import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { ChipTone, ColorTone } from '../data/ledger';

/* design-system colour ramp, read from the CSS variables the bundle defines */
export const cv = (tone: ColorTone | string, shade: number) => `var(--vw-color-${tone}-${shade})`;

export function Chip({ tone, strong, children }: { tone: ChipTone; strong?: boolean; children: ReactNode }) {
  return <span className={`vw-chip vw-chip--${tone}${strong ? ' is-strong' : ''}`}>{children}</span>;
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <section className={`vw-card-section ${className}`} style={style}>{children}</section>;
}

export interface StatCell {
  k: string; v: string; s: string; t: ColorTone;
  onClick?: () => void;
}
export function StatStrip({ cells }: { cells: StatCell[] }) {
  return (
    <div className="stat-strip">
      {cells.map(c => {
        const inner = (
          <>
            <span className="stat-dot" style={{ background: cv(c.t, 400) }} />
            <span className="stat-k">{c.k}</span>
            <span className="stat-v num">{c.v}</span>
            <span className="stat-s">{c.s}</span>
          </>
        );
        return c.onClick
          ? <button key={c.k} className="stat-cell is-click" onClick={c.onClick}>{inner}</button>
          : <div key={c.k} className="stat-cell">{inner}</div>;
      })}
    </div>
  );
}

export interface Tab<K extends string> { k: K; n: string; count: number; dot?: string; title?: string }
export function TabBar<K extends string>({ tabs, active, onChange }: { tabs: Tab<K>[]; active: K; onChange: (k: K) => void }) {
  return (
    <div className="tabbar">
      {tabs.map(t => (
        <button key={t.k} className={`tab${t.k === active ? ' is-on' : ''}`} title={t.title} onClick={() => onChange(t.k)}>
          {t.n}
        </button>
      ))}
    </div>
  );
}

/* the banner that names an active drill-down and lets the user clear it */
export function DrillBar({ from, label, onBack, onClear }: { from: string; label: string; onBack: () => void; onClear?: () => void }) {
  return (
    <div className="drill-bar">
      <span className="drill-back" role="link" tabIndex={0} onClick={onBack}>← {from}</span>
      <span className="drill-sep">/</span>
      <span className="drill-label">{label}</span>
      {onClear && (
        <>
          <span className="grow" />
          <button className="nst-btn nst-btn--xs" onClick={onClear}>Clear filter</button>
        </>
      )}
    </div>
  );
}

/* an "i" info button that reveals a one-sentence explanation of the
   card/metric beside it — hover or focus for a peek, click to pin it open.
   Drawn as a dot-and-stem SVG rather than an italic "i" character: at
   16px an italic serif "i" (KpiCard's original glyph) reads as a "?" to
   readers, so this one is shape-drawn to never be ambiguous. */
export function InfoTip({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const defRef = useRef<HTMLSpanElement>(null);
  /* the definition box is a fixed-width absolute box anchored to the icon's
     left edge — fine near the left of a card, but an icon sitting near the
     RIGHT edge (the last of several tiles in a row, say) pushes that box
     straight past the viewport edge, spilling outside the page rather than
     wrapping back over the card it's describing. Rather than hand-tune a
     position per call site (there are 20+), measure the box against the
     viewport every time it opens and nudge it back in — the one fix covers
     every InfoTip in the app at once. */
  const [shiftPx, setShiftPx] = useState(0);
  useLayoutEffect(() => {
    if (!open) { setShiftPx(0); return; }
    const el = defRef.current;
    if (!el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();
    let dx = 0;
    if (rect.right > window.innerWidth - margin) dx = (window.innerWidth - margin) - rect.right;
    if (rect.left + dx < margin) dx = margin - rect.left;
    setShiftPx(dx);
  }, [open]);
  /* a real <button> here would sit nested inside the KPI card / outcome
     tile's own <button> at several call sites — invalid HTML (a button
     can't contain a button) that also confuses which element a click or a
     Tab stop actually lands on. A span with the button role/keyboard
     handling gets the same behavior without ever nesting interactive
     elements. */
  return (
    <span className="info-tip">
      <span role="button" tabIndex={0} className="info-tip-btn" aria-label={label ?? 'What this shows'} aria-expanded={open}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }
        }}>
        <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="4" r="1.4" />
          <rect x="6.8" y="6.8" width="2.4" height="6.2" rx="1.1" />
        </svg>
      </span>
      {open && (
        <span ref={defRef} className="info-tip-def" role="tooltip"
          style={shiftPx ? { transform: `translateX(${shiftPx}px)` } : undefined}>
          {text}
        </span>
      )}
    </span>
  );
}

/* secondary value under a primary one, inside a table cell */
export const Sub = ({ mono, children }: { mono?: boolean; children: ReactNode }) =>
  <span className={`cell-sub${mono ? ' mono' : ''}`}>{children}</span>;
export const Mono = ({ children }: { children: ReactNode }) => <span className="mono">{children}</span>;
export const Num = ({ children }: { children: ReactNode }) => <span className="num">{children}</span>;
