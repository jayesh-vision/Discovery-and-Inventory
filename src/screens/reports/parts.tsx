import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip, InfoTip, cv, DomainDot as UiDomainDot } from '../../components/ui';
import { Against, Cycles, KpiCard, Segments } from '../../components/KpiCard';
import { Donut, MultiLineChart, ProjectionChart, RampBars, Sparkline, StackedBars } from '../../components/charts';
import { legacyPath } from '../../routes';
import { isDomainKey } from '../../data/discoveryOverview';
import {
  type CellValue, type Column, type Finding, type Kpi, type Link, type ReportContent, type ReportDef, type Visual,
  AUDIENCES, cellText, fmtValue, sum
} from '../../data/reports';
import { EXPORT_FORMATS, type ExportFormat, exportReport } from '../../data/reports/export';

/* ── navigation ─────────────────────────────────────────────
   A report row links into the screen that owns the record. The jump
   carries this module's Reports crumb as its origin, so the destination's
   breadcrumb leads back here instead of to its nominal parent. */
export const REPORTS_CRUMB = 'Reports';
export function useReportNav() {
  const nav = useNavigate();
  return (link: Link) => nav(legacyPath(link.key, { from: REPORTS_CRUMB, q: link.q ?? '' }, link.params ?? {}));
}
export const reportPath = (d: ReportDef) => `/${d.module}/reports/${d.id}`;

/* ── atoms ── */
/* a known domain renders the shared tag (sub-domains show their parent:
   "Transport · IP/MPLS"); anything else falls back to a plain grey dot */
export const DomainDot = ({ domain }: { domain: string }) => isDomainKey(domain)
  ? <UiDomainDot domain={domain} />
  : (
    <span className="row vw-items-center vw-nowrap" style={{ gap: 8 }}>
      <span className="rpt-dot" style={{ background: cv('slate', 400) }} />{domain}
    </span>
  );

export const AUDIENCE_GLYPH: Record<(typeof AUDIENCES)[number], string> = {
  Leadership: '◆', Operations: '◎', Finance: '$', Planning: '▦', Engineering: '⚙', Governance: '⚖'
};

export function renderCell(v: CellValue, col: Column): ReactNode {
  if (v === null || v === undefined || v === '') return <span className="rpt-muted">—</span>;
  if (col.fmt === 'domain') return <DomainDot domain={String(v)} />;
  if (col.fmt === 'chip') return <Chip tone={col.tones?.[String(v)] ?? 'neutral'}>{v}</Chip>;
  if (col.fmt === 'mono') return <span className="mono">{v}</span>;
  if (col.width) return <span className="rpt-wrap" style={{ maxWidth: col.width }}>{cellText(v, col)}</span>;
  return cellText(v, col);
}

/* ── export menu ────────────────────────────────────────── */
export function ExportMenu({ def, content, withPrint, label = 'Export' }: { def: ReportDef; content: ReportContent; withPrint?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3200); return () => clearTimeout(t); }, [note]);

  const run = async (f: ExportFormat) => {
    setOpen(false); setBusy(f);
    try {
      await exportReport(def, content, f);
      setNote(`${EXPORT_FORMATS.find(x => x.k === f)!.ext} downloaded`);
    } catch {
      setNote('Export failed — try again');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rpt-menu" ref={ref} onClick={e => e.stopPropagation()}>
      <button className="nst-btn nst-btn--sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)} disabled={!!busy}>
        {busy ? `Preparing ${EXPORT_FORMATS.find(x => x.k === busy)!.ext}…` : `${label} ▾`}
      </button>
      {note && <span className="rpt-menu-note" role="status">{note}</span>}
      {open && (
        <div className="kmenu kmenu-r" role="menu">
          {EXPORT_FORMATS.map(f => (
            <button key={f.k} className="kmenu-i rpt-menu-i" role="menuitem" onClick={() => void run(f.k)}>
              <span className="rpt-ext">{f.ext}</span>
              <span className="stack-x" style={{ gap: 0 }}><span>{f.n}</span><span className="rpt-menu-hint">{f.hint}</span></span>
            </button>
          ))}
          {withPrint && (
            <button className="kmenu-i rpt-menu-i" role="menuitem" onClick={() => { setOpen(false); setTimeout(() => window.print(), 50); }}>
              <span className="rpt-ext">PRINT</span>
              <span className="stack-x" style={{ gap: 0 }}><span>Print</span><span className="rpt-menu-hint">Browser print or save as PDF</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── KPI: the app's own KpiCard, fed from report data ─────── */
export function ReportKpi({ kpi }: { kpi: Kpi }) {
  const v = kpi.visual;
  const visual = !v ? undefined
    : v.kind === 'segments' ? <Segments parts={v.parts} total={v.total} />
      : v.kind === 'cycles' ? <Cycles values={v.values} labels={v.labels} format={x => fmtValue(x, kpi.fmt)} />
        : <Against value={v.value} limit={v.limit} format={x => fmtNumShort(x)} hex={cv(kpi.tone, 400)} />;
  return <KpiCard title={kpi.title} definition={kpi.definition} value={fmtValue(kpi.value, kpi.fmt)} of={kpi.of} tone={kpi.tone} delta={kpi.delta} visual={visual} />;
}
const fmtNumShort = (x: number) => (x >= 10000 ? `${(x / 1000).toFixed(1)}k` : x.toLocaleString('en-IN'));

/* ── findings ── */
/* 400, matching every chart/bar/segment fill elsewhere in this feature
   (src/data/reports/*.ts) rather than the punchier 500 this accent stripe
   used to be the one place still on. */
const FINDING_META: Record<Finding['tone'], { label: string; tone: 'error' | 'warning' | 'success' | 'info'; hex: string }> = {
  crit: { label: 'Critical', tone: 'error', hex: cv('red', 400) },
  warn: { label: 'Warning', tone: 'warning', hex: cv('amber', 400) },
  good: { label: 'Positive', tone: 'success', hex: cv('emerald', 400) },
  info: { label: 'Note', tone: 'info', hex: cv('sky', 400) }
};
export function FindingCard({ f }: { f: Finding }) {
  const m = FINDING_META[f.tone];
  return (
    <div className="rpt-finding" style={{ ['--rpt-accent' as string]: m.hex }}>
      <div className="row" style={{ gap: 8 }}><Chip tone={m.tone}>{m.label}</Chip><span className="rpt-finding-t">{f.title}</span></div>
      <div className="rpt-finding-d">{f.detail}</div>
    </div>
  );
}

/* ── charts not already in components/charts ─────────────── */
function HBars({ v }: { v: Extract<Visual, { kind: 'bars' }> }) {
  const lo = v.min ?? 0;
  const hi = v.max ?? Math.max(...v.rows.map(r => r.value), v.target?.value ?? 0);
  const w = (x: number) => `${Math.max(0.8, Math.min(100, ((x - lo) / ((hi - lo) || 1)) * 100)).toFixed(2)}%`;
  return (
    <div className="rpt-bars">
      {v.rows.map(r => (
        <div key={r.label} className="rpt-bar" title={`${r.label}: ${fmtValue(r.value, v.fmt)}${r.sub ? ` · ${r.sub}` : ''}`}>
          <div className="rpt-bar-l">
            <span className="rpt-bar-name">{r.label}</span>
            {(r.sub || r.tag) && <span className="rpt-bar-sub">{[r.sub, r.tag].filter(Boolean).join(' · ')}</span>}
          </div>
          <div className="rpt-bar-track">
            <span className="rpt-bar-fill" style={{ width: w(r.value), background: r.hex ?? cv('blue', 400) }} />
            {v.target && <span className="rpt-bar-target" style={{ left: w(v.target.value) }} title={v.target.label} />}
          </div>
          <span className="rpt-bar-v num">{fmtValue(r.value, v.fmt)}</span>
        </div>
      ))}
      {v.target && <div className="rpt-bar-legend"><span className="rpt-bar-target is-legend" />{v.target.label}</div>}
    </div>
  );
}

const HEAT_STEPS = [50, 100, 200, 300, 400, 500, 600, 700] as const;
function Heat({ v }: { v: Extract<Visual, { kind: 'heat' }> }) {
  const max = Math.max(1, ...v.values.flat());
  const shade = (x: number) => HEAT_STEPS[Math.min(HEAT_STEPS.length - 1, Math.ceil((x / max) * (HEAT_STEPS.length - 1)))];
  return (
    <div className="scroll-x">
      <table className="mtbl rpt-heat">
        <thead><tr><th />{v.cols.map(c => <th key={c} className="eyebrow" style={{ textAlign: 'center' }}>{c}</th>)}<th className="eyebrow" style={{ textAlign: 'right' }}>Total</th></tr></thead>
        <tbody>{v.rows.map((r, ri) => (
          <tr key={r}>
            <td className="vw-value" style={{ fontWeight: 500 }}>{r}</td>
            {v.cols.map((c, ci) => {
              const x = v.values[ri][ci]; const s = shade(x);
              return (
                <td key={c} style={{ padding: 3 }}>
                  <span className="rpt-heat-cell num" title={`${r} · ${c}: ${fmtValue(x, v.fmt)}`}
                    style={{ background: x ? cv('blue', s) : cv('slate', 50), color: !x ? cv('slate', 400) : s >= 500 ? 'var(--vw-color-white)' : cv('blue', 900) }}>
                    {x ? fmtValue(x, v.fmt) : '—'}
                  </span>
                </td>
              );
            })}
            <td className="num" style={{ textAlign: 'right', fontWeight: 500 }}>{fmtValue(sum(v.values[ri], y => y), v.fmt)}</td>
          </tr>
        ))}</tbody>
      </table>
      <div className="row" style={{ gap: 8, marginTop: 'var(--vw-space-sm)' }}>
        <span className="vw-card-metric-label-sub">Fewer</span>
        <span className="row" style={{ gap: 3 }}>{HEAT_STEPS.map(s => <span key={s} className="rpt-heat-key" style={{ background: cv('blue', s) }} />)}</span>
        <span className="vw-card-metric-label-sub">More</span>
      </div>
    </div>
  );
}

function Composition({ parts }: { parts: { n: string; c: number; hex: string }[] }) {
  const t = sum(parts, p => p.c) || 1;
  return (
    <div className="stack-s">
      <div className="rpt-comp" role="img" aria-label={parts.map(p => `${p.n} ${p.c}`).join(', ')}>
        {parts.map(p => <span key={p.n} title={`${p.n}: ${p.c.toLocaleString('en-IN')}`} style={{ width: `${(p.c / t * 100).toFixed(2)}%`, background: p.hex }} />)}
      </div>
      <div className="rpt-comp-legend">
        {parts.map(p => (
          <div key={p.n} className="rpt-comp-row">
            <span className="rpt-dot is-sq" style={{ background: p.hex }} />
            <span className="grow">{p.n}</span>
            <b className="num">{p.c.toLocaleString('en-IN')}</b>
            <span className="rpt-muted num" style={{ width: '3.5rem', textAlign: 'right' }}>{(p.c / t * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Steps({ v }: { v: Extract<Visual, { kind: 'steps' }> }) {
  const lo = v.start, hi = Math.max(v.target, v.steps[v.steps.length - 1].cum);
  const at = (x: number) => `${(((x - lo) / ((hi - lo) || 1)) * 100).toFixed(2)}%`;
  return (
    <div className="rpt-steps">
      <div className="rpt-steps-head">
        <span>Start <b className="num">{fmtValue(v.start, v.fmt)}</b></span>
        <span style={{ color: cv('emerald', 700) }}>Target <b className="num">{fmtValue(v.target, v.fmt)}</b></span>
      </div>
      {v.steps.map((s, i) => {
        const prev = i === 0 ? v.start : v.steps[i - 1].cum;
        const reached = s.cum >= v.target;
        return (
          <div key={s.label} className="rpt-step">
            <span className={`rpt-step-n${reached ? ' is-done' : ''}`}>{i + 1}</span>
            <span className="rpt-step-l">{s.label}</span>
            <span className="rpt-step-track">
              <span className="rpt-step-base" style={{ width: at(prev) }} />
              <span className="rpt-step-gain" style={{ left: at(prev), width: `calc(${at(s.cum)} - ${at(prev)})`, background: reached ? cv('emerald', 400) : cv('blue', 400) }} />
              <span className="rpt-step-target" style={{ left: at(v.target) }} />
            </span>
            <span className="rpt-step-v num">+{s.gain.toFixed(2)} → <span style={{ fontWeight: 500, color: 'var(--vw-color-gray-900)' }}>{fmtValue(s.cum, v.fmt)}</span></span>
          </div>
        );
      })}
    </div>
  );
}

export function VisualCard({ v }: { v: Visual }) {
  let body: ReactNode;
  switch (v.kind) {
    case 'bars': body = <HBars v={v} />; break;
    case 'ramp': body = <RampBars buckets={v.buckets} height={220} />; break;
    case 'donut': body = (
      <div className="rpt-donut">
        <Donut slices={v.slices} total={v.total} label={v.label} size={160} />
        <Composition parts={v.slices.map(s => ({ n: s.n, c: s.c, hex: s.hex }))} />
      </div>
    ); break;
    case 'stacked': body = <StackedBars days={v.days} series={v.series} values={v.values} height={230} />; break;
    case 'lines': body = <MultiLineChart labels={v.labels} series={v.series} height={230} format={x => fmtValue(x, v.fmt)} />; break;
    case 'projection': body = (
      <ProjectionChart historyLabels={v.historyLabels} historyValues={v.historyValues} projectionLabels={v.projectionLabels}
        projectionValues={v.projectionValues} target={v.target} targetLabel={v.targetLabel} yBounds={v.yBounds} height={260} format={x => fmtValue(x, v.fmt)} />
    ); break;
    case 'heat': body = <Heat v={v} />; break;
    case 'composition': body = <Composition parts={v.parts} />; break;
    case 'steps': body = <Steps v={v} />; break;
  }
  return (
    <section className={`vw-card-section rpt-block rpt-visual${v.span === 2 ? ' is-wide' : ''}`}>
      <span className="vw-card-title-sm">{v.title}{v.definition && <InfoTip text={v.definition} />}</span>
      {v.sub && <div className="vw-card-metric-label-sub" style={{ marginTop: 2 }}>{v.sub}</div>}
      <div className="rpt-visual-body">{body}</div>
    </section>
  );
}

export const TrendSpark = ({ values, better }: { values?: number[]; better?: 'up' | 'down' }) => {
  if (!values || values.length < 2) return null;
  const up = values[values.length - 1] >= values[0];
  const good = better ? (better === 'up') === up : null;
  return <Sparkline values={values} height={20} hex={good === null ? cv('blue', 500) : good ? cv('emerald', 500) : cv('red', 500)} />;
};
