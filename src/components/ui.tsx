import type { ReactNode } from 'react';
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

/* secondary value under a primary one, inside a table cell */
export const Sub = ({ mono, children }: { mono?: boolean; children: ReactNode }) =>
  <span className={`cell-sub${mono ? ' mono' : ''}`}>{children}</span>;
export const Mono = ({ children }: { children: ReactNode }) => <span className="mono">{children}</span>;
export const Num = ({ children }: { children: ReactNode }) => <span className="num">{children}</span>;
