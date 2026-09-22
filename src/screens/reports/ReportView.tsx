import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Card, Chip, InfoTip } from '../../components/ui';
import { DataGrid } from '../../components/grid/DataGrid';
import {
  type ReportModule, type Row, MODULE_LABEL, STATE_TONE, buildReport, cellText, fmtValue, reportDefById
} from '../../data/reports';
import {
  AUDIENCE_GLYPH, FindingCard, ReportKpi, TrendSpark, VisualCard, renderCell, useReportNav
} from './parts';

const PRIORITY_TONE = { P1: 'error', P2: 'warning', P3: 'neutral' } as const;
const PRIORITY_WHEN = { P1: 'This week', P2: 'This month', P3: 'This quarter' } as const;
const STATE_BANNER = { Stale: 'warning', Running: 'info', Failed: 'error' } as const;

/* One report read as a document — who it is for, the headline and its
   trend, the numbers that matter, what they mean, the evidence, what to do
   about it and the record-level detail, then how every figure was derived. */
export function ReportView({ module }: { module: ReportModule }) {
  const { id = '' } = useParams();
  const go = useReportNav();
  const def = reportDefById(id);
  const content = useMemo(() => (def ? buildReport(def) : null), [def]);
  if (!def || !content || def.module !== module) return <Navigate to={`/${module}/reports`} replace />;

  const h = content.headline;
  const t = content.table;
  const facetOptions = t.facet ? [...new Set(t.rows.map(r => cellText(r.cells[t.facet!], t.columns.find(c => c.key === t.facet)!)))] : [];

  return (
    <div className="page rpt-page">

      <div className="rpt-printhead">NetSingularity OSS · {MODULE_LABEL[def.module]} reports · {def.distribution}</div>

      <section className="vw-card-section rpt-doc rpt-block">
        <div className="rpt-doc-main">
          <div className="row" style={{ gap: 10 }}>
            <span className="eyebrow" style={{ color: 'var(--vw-color-blue-700)' }}>{MODULE_LABEL[def.module]}</span>
            <span className="rpt-aud"><span aria-hidden>{AUDIENCE_GLYPH[def.audience]}</span>{def.audience}</span>
            <span className="rpt-id mono">{def.id}</span>
          </div>
          <h1 className="rpt-doc-title">{def.name}</h1>
          <p className="rpt-doc-q">{def.question}</p>
          <dl className="rpt-meta">
            <div><dt>Status</dt><dd><Chip tone={STATE_TONE[def.state]}>{def.state}</Chip></dd></div>
            <div><dt>Data as of</dt><dd className="num">{def.lastRun}</dd></div>
            <div><dt>Schedule</dt><dd>{def.schedule}</dd></div>
            <div><dt>Snapshot</dt><dd className="mono">{def.snapshot}</dd></div>
            <div className="is-wide"><dt>Distribution</dt><dd>{def.distribution}</dd></div>
          </dl>
        </div>
        <div className="rpt-headline">
          <div className="eyebrow">Headline</div>
          <div className="rpt-headline-v num">{fmtValue(h.value, h.fmt)}</div>
          <div className="rpt-headline-l">{h.label}</div>
          {h.trend && <div style={{ marginTop: 10 }}><TrendSpark values={h.trend} better={h.better} /><div className="rpt-muted" style={{ fontSize: 11 }}>Last {h.trend.length} cycles</div></div>}
        </div>
      </section>

      {def.note && def.state !== 'Current' && (
        <div className="rpt-banner rpt-block" data-tone={STATE_BANNER[def.state]}>
          <Chip tone={STATE_BANNER[def.state]}>{def.state}</Chip><span>{def.note}</span>
        </div>
      )}

      <div className="rpt-kpis rpt-block">{content.kpis.map(k => <ReportKpi key={k.title} kpi={k} />)}</div>

      <Card className="rpt-block">
        <span className="vw-card-title-sm">Executive summary</span>
        <p className="rpt-summary">{content.summary}</p>
        <div className="rpt-findings">{content.findings.map(f => <FindingCard key={f.title} f={f} />)}</div>
      </Card>

      {content.visuals.length > 0 && (
        <>
          <div className="rpt-section">Analysis</div>
          <div className="rpt-visuals">{content.visuals.map(v => <VisualCard key={v.title} v={v} />)}</div>
        </>
      )}

      <Card className="rpt-block">
        <span className="vw-card-title-sm">Recommended actions<InfoTip text="Prioritised by exposure: P1 this week, P2 this month, P3 this quarter." /></span>
        <table className="mtbl rpt-actions">
          <thead><tr><th style={{ width: '7rem' }}>Priority</th><th>Action</th><th style={{ width: '16rem' }}>Owner</th><th style={{ width: '22rem' }}>Expected impact</th></tr></thead>
          <tbody>{content.actions.map((a, i) => (
            <tr key={i}>
              <td><Chip tone={PRIORITY_TONE[a.priority]} strong>{a.priority}</Chip><div className="rpt-muted" style={{ fontSize: 11, marginTop: 3 }}>{PRIORITY_WHEN[a.priority]}</div></td>
              <td className="rpt-td-wrap vw-value" style={{ fontWeight: 500 }}>{a.action}</td>
              <td className="rpt-td-wrap">{a.owner}</td>
              <td className="rpt-td-wrap rpt-muted">{a.impact}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>

      <Card className="rpt-detail">
        <span className="vw-card-title-sm">{t.title}</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: 2, marginBottom: 'var(--vw-space-sm)' }}>{t.sub} · {t.rows.length.toLocaleString('en-IN')} rows</div>
        <div className="rpt-noprint">
          <DataGrid<Row>
            columns={t.columns.map(c => ({ t: c.header, r: c.right }))}
            rows={t.rows} total={t.rows.length} rowKey={r => r.id}
            searchPlaceholder={`Search ${t.title.toLowerCase()}`}
            filters={t.facet ? [{ n: t.columns.find(c => c.key === t.facet)!.header, o: facetOptions }] : undefined}
            emptyText={t.empty}
            onRowClick={t.rows.some(r => r.link) ? r => { if (r.link) go(r.link); } : undefined}
            renderRow={r => t.columns.map(c => renderCell(r.cells[c.key], c))}
          />
        </div>
        <table className="rpt-print-table">
          <thead><tr>{t.columns.map(c => <th key={c.key} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.header}</th>)}</tr></thead>
          <tbody>{t.rows.slice(0, 60).map(r => (
            <tr key={r.id}>{t.columns.map(c => <td key={c.key} style={{ textAlign: c.right ? 'right' : 'left' }}>{cellText(r.cells[c.key], c)}</td>)}</tr>
          ))}</tbody>
        </table>
        {t.rows.length > 60 && <div className="rpt-print-note">First 60 of {t.rows.length.toLocaleString('en-IN')} rows — the full set is in the PDF, Excel and CSV downloads.</div>}
      </Card>

      <Card className="rpt-block">
        <span className="vw-card-title-sm">Methodology & definitions</span>
        <dl className="rpt-method">{content.methodology.map(m => (
          <div key={m.term}><dt>{m.term}</dt><dd>{m.definition}</dd></div>
        ))}</dl>
      </Card>
    </div>
  );
}

export const DiscoveryReportView = () => <ReportView module="discovery" />;
export const InventoryReportView = () => <ReportView module="inventory" />;
