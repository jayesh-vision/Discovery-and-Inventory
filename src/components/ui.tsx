import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ChipTone, ColorTone } from '../data/ledger';
import { DOMAIN_HEX, DOMAIN_LABEL, domainParentLabel, type DomainKey } from '../data/discoveryOverview';

/* design-system colour ramp, read from the CSS variables the bundle defines */
export const cv = (tone: ColorTone | string, shade: number) => `var(--vw-color-${tone}-${shade})`;

/* ── domain identity: colour dot + name ─────────────────────────────────
   The one domain tag every Discovery & Reconciliation grid/drawer uses. A
   sub-domain renders its parent muted in front of it ("Transport · IP/MPLS")
   so the hierarchy is visible in any row, filtered list or drawer — not
   only when the parent row happens to sit directly above. `short` drops the
   parent for places where position already shows it. */
export function DomainDot({ domain, short, size = 8 }: { domain: DomainKey; short?: boolean; size?: number }) {
  const parent = short ? undefined : domainParentLabel(domain);
  return (
    <span className="row vw-items-center vw-nowrap" style={{ gap: '8px' }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
      <span>{parent && <span className="dom-parent">{parent} · </span>}{DOMAIN_LABEL[domain]}</span>
    </span>
  );
}

export function Chip({ tone, strong, children }: { tone: ChipTone; strong?: boolean; children: ReactNode }) {
  /* grid chips are now sized to a per-column tier, not to their own text
     (see the .tbl-wrap chip-width rules in shell.css) — a label longer
     than its tier's longest expected value ellipsis-truncates instead of
     stretching the box, so the native title tooltip is the fallback that
     keeps the full text reachable on hover. Only set for plain-string
     labels; a chip built from JSX children skips it rather than stringify
     something that isn't text. */
  return (
    <span className={`vw-chip vw-chip--${tone}${strong ? ' is-strong' : ''}`} title={typeof children === 'string' ? children : undefined}>
      {children}
    </span>
  );
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

/* ── Section header for views structured as stacked panels ────────────── */
export function SectionHeader({ title, description, right }: { title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="ix-sec-head">
      <div>
        <h2 className="ix-sec-t">{title}</h2>
        {description && <p className="ix-sec-d">{description}</p>}
      </div>
      {right && <div className="ix-sec-r">{right}</div>}
    </div>
  );
}

/* an "i" info button that reveals a one-sentence explanation of the
   card/metric beside it — hover or focus for a peek, click to pin it open.
   Renders via createPortal directly into document.body to prevent clipping
   by overflow:hidden on ancestor containers and to avoid overlapping underlying text. */
export function InfoTip({ text, label, align }: { text: string; label?: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const btnRef = useRef<HTMLSpanElement>(null);
  const defRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; place: 'top' | 'bottom'; arrowLeft: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }

    const updatePos = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const tooltipWidth = defRef.current ? defRef.current.offsetWidth : Math.min(280, window.innerWidth - 24);
      const tooltipHeight = defRef.current ? defRef.current.offsetHeight : 64;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeTop = spaceAbove >= tooltipHeight + 12 || spaceAbove > spaceBelow;

      const top = placeTop
        ? Math.max(8, rect.top - tooltipHeight - 8)
        : Math.min(window.innerHeight - tooltipHeight - 8, rect.bottom + 8);

      let left = align === 'right'
        ? rect.right - tooltipWidth
        : rect.left + rect.width / 2 - tooltipWidth / 2;

      left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));
      const arrowLeft = Math.max(12, Math.min(tooltipWidth - 12, rect.left + rect.width / 2 - left));

      setPos({ top, left, place: placeTop ? 'top' : 'bottom', arrowLeft });
    };

    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);

    const onDocClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setPinned(false);
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinned(false);
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, align]);

  return (
    <span className="info-tip" title="">
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        className="info-tip-btn"
        aria-label={label ?? 'What this shows'}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => { if (!pinned) setOpen(false); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!pinned) setOpen(false); }}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setPinned(p => {
            const next = !p;
            setOpen(next);
            return next;
          });
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setPinned(p => {
              const next = !p;
              setOpen(next);
              return next;
            });
          }
        }}
      >
        <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="4" r="1.4" />
          <rect x="6.8" y="6.8" width="2.4" height="6.2" rx="1.1" />
        </svg>
      </span>
      {open && typeof document !== 'undefined' && createPortal(
        <span
          ref={defRef}
          className={`info-tip-portal is-${pos?.place ?? 'top'}`}
          role="tooltip"
          style={{
            top: pos ? `${pos.top}px` : '-9999px',
            left: pos ? `${pos.left}px` : '-9999px',
            visibility: pos ? 'visible' : 'hidden',
            ['--arrow-left' as string]: `${pos?.arrowLeft ?? 140}px`
          }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
}

/* secondary value under a primary one, inside a table cell */
export const Sub = ({ mono, children }: { mono?: boolean; children: ReactNode }) =>
  <span className={`cell-sub${mono ? ' mono' : ''}`}>{children}</span>;
export const Mono = ({ children }: { children: ReactNode }) => <span className="mono">{children}</span>;
export const Num = ({ children }: { children: ReactNode }) => <span className="num">{children}</span>;
