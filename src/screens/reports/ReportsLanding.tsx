import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, InfoTip, cv } from '../../components/ui';
import type { ColorTone } from '../../data/ledger';
import { DataGrid } from '../../components/grid/DataGrid';
import { IcSearch } from '../../components/grid/icons';
import {
  type Audience, type ReportDef, type ReportModule, AUDIENCES, MODULE_LABEL, STATE_TONE, buildReport, fmtValue, reportDefById, reportsFor
} from '../../data/reports';
import { REPORT_RUNS, RUN_STATUS_TONE, type ReportRun } from '../../data/reports/runs';
import { AUDIENCE_GLYPH, ExportMenu, TrendSpark, VisualCard, reportPath } from './parts';

const PURPOSE: Record<ReportModule, string> = {
  discovery: 'how far the inventory can be trusted, and every number drills down to the rule, exception or device behind it.',
  inventory: 'the network estate as an asset, and every number drills down to the element, site or record behind it.'
};

/* The headline of the reports that matter most for each module, as tiles.
   Values, trends and tones come from each report's own builder. */
interface TileSpec { id: string; title: string; sub?: string }
const TILES: Record<ReportModule, TileSpec[]> = {
  discovery: [
    { id: 'DR-01', title: 'Inventory trust index', sub: 'Target 99% · last 12 cycles' },
    { id: 'DR-02', title: 'Open discrepancies', sub: 'Backlog across all domains · last 12 cycles' },
    { id: 'DR-03', title: 'SLA breaches' },
    { id: 'DR-04', title: 'Discovery coverage', sub: 'Share of the estate discovery reaches · last 12 cycles' },
    { id: 'DR-05', title: 'Automation rate' },
    { id: 'DR-07', title: 'Cost of drift' }
  ],
  inventory: [
    { id: 'IN-01', title: 'Network elements' },
    { id: 'IN-02', title: 'Faulty elements' },
    { id: 'IN-03', title: 'Lifecycle risk' },
    { id: 'IN-04', title: 'Discovery verification' },
    { id: 'IN-05', title: 'Zombie assets' },
    { id: 'IN-07', title: 'Vendor concentration' }
  ]
};
const FEATURE: Record<ReportModule, { id: string; visual: string }> = {
  discovery: { id: 'DR-01', visual: 'Trust index — measured and projected' },
  inventory: { id: 'IN-01', visual: 'Active elements by class' }
};
/* 400, not 500 — every chart/bar/segment fill in src/data/reports/*.ts
   already uses cv(tone, 400); these tile accents were the one place in the
   whole feature still on the punchier 500 shade. */
const ACCENT: Partial<Record<ColorTone, string>> = { red: cv('red', 400), amber: cv('amber', 400) };

function HeadlineTile({ spec }: { spec: TileSpec }) {
  const nav = useNavigate();
  const def = reportDefById(spec.id)!;
  const h = useMemo(() => buildReport(def), [def]).headline;
  const open = () => nav(reportPath(def));
  const sub = spec.sub ?? h.label.charAt(0).toUpperCase() + h.label.slice(1);
  return (
    <article className="rpt-tile" role="link" tabIndex={0} onClick={open} onKeyDown={e => { if (e.key === 'Enter') open(); }}
      style={{ ['--rpt-accent' as string]: ACCENT[h.tone] ?? 'transparent' }} aria-label={`${spec.title}: ${fmtValue(h.value, h.fmt)}. Open ${def.name}`}>
      <div className="rpt-tile-top">
        <span className="rpt-tile-t">{spec.title}</span>
        {def.state !== 'Current' && <Chip tone={STATE_TONE[def.state]}>{def.state}</Chip>}
        <span onClick={e => e.stopPropagation()}><InfoTip text={`From “${def.name}” (${def.id}) · data as of ${def.lastRun}. Click the tile to open the report.`} /></span>
      </div>
      <div className="rpt-tile-v num">{fmtValue(h.value, h.fmt)}</div>
      <div className="rpt-tile-sub">{sub}</div>
      {h.trend && h.trend.length > 1 && <div className="rpt-tile-spark"><TrendSpark values={h.trend} better={h.better} /></div>}
    </article>
  );
}

/* Critical findings first, then warnings, across every report in the module. */
const IcAlert = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>;
const IcFlag = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>;
function NeedsAttention({ reports }: { reports: ReportDef[] }) {
  const nav = useNavigate();
  const [more, setMore] = useState(false);
  const items = useMemo(() => {
    const all = reports.flatMap(def => buildReport(def).findings.filter(f => f.tone === 'crit' || f.tone === 'warn').map(f => ({ def, f })));
    const seen = new Set<string>();
    return [...all.filter(x => x.f.tone === 'crit'), ...all.filter(x => x.f.tone === 'warn')]
      .filter(x => !seen.has(x.f.title) && !!seen.add(x.f.title));
  }, [reports]);
  const LIMIT = 5;
  const shown = more ? items : items.slice(0, LIMIT);
  return (
    <section className="vw-card-section rpt-attn">
      <span className="vw-card-title-sm">Needs attention</span>
      <div className="vw-card-metric-label-sub" style={{ marginTop: 2 }}>The findings most likely to need a decision · {items.length} across {reports.length} reports</div>
      <ul className="rpt-attn-list">
        {shown.map(({ def, f }) => (
          <li key={`${def.id}-${f.title}`}>
            <button className="rpt-attn-row" onClick={() => nav(reportPath(def))}>
              <span className="rpt-attn-ic" data-tone={f.tone} aria-hidden>{f.tone === 'crit' ? <IcAlert /> : <IcFlag />}</span>
              <span className="rpt-attn-main">
                <span className="rpt-attn-t">{f.title}</span>
                <span className="rpt-attn-d"><span className="rpt-attn-link">{def.name}</span> · {f.detail}</span>
              </span>
              <span className="rpt-attn-chev" aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>
      {items.length > LIMIT && (
        <button className="nst-btn nst-btn--xs nst-btn--ghost rpt-attn-more" onClick={() => setMore(m => !m)}>
          {more ? 'Show less' : `Show ${items.length - LIMIT} more`}
        </button>
      )}
    </section>
  );
}

function ReportCard({ def }: { def: ReportDef }) {
  const nav = useNavigate();
  const c = useMemo(() => buildReport(def), [def]);
  const open = () => nav(reportPath(def));
  return (
    <article className="rpt-card" role="link" tabIndex={0} onClick={open}
      onKeyDown={e => { if (e.key === 'Enter') open(); }} aria-label={`${def.name}. ${fmtValue(c.headline.value, c.headline.fmt)} ${c.headline.label}. Open report`}>
      <div className="rpt-card-top">
        <span className="rpt-aud"><span aria-hidden>{AUDIENCE_GLYPH[def.audience]}</span>{def.audience}</span>
        <span className="rpt-id mono">{def.id}</span>
      </div>
      <h3 className="rpt-card-name">{def.name}</h3>
      <p className="rpt-card-q">{def.question}</p>
      <div className="rpt-card-metric">
        <div style={{ minWidth: 0 }}>
          <div className="rpt-card-v num">{fmtValue(c.headline.value, c.headline.fmt)}</div>
          <div className="rpt-card-l">{c.headline.label}</div>
        </div>
        <div className="rpt-card-spark"><TrendSpark values={c.headline.trend} better={c.headline.better} /></div>
      </div>
      <div className="rpt-card-foot">
        <Chip tone={STATE_TONE[def.state]}>{def.state}</Chip>
        <span className="rpt-card-meta">{def.cadence} · {def.lastRun.split(' ')[0]}</span>
        <span className="grow" />
        <ExportMenu def={def} content={c} label="Download" />
      </div>
    </article>
  );
}

export function ReportsLanding({ module }: { module: ReportModule }) {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const all = reportsFor(module);
  const audienceParam = sp.get('audience') as Audience | null;
  const audience: Audience | 'All' = audienceParam && AUDIENCES.includes(audienceParam) ? audienceParam : 'All';
  const setAudience = (a: Audience | 'All') => {
    const next = new URLSearchParams(sp);
    if (a === 'All') next.delete('audience'); else next.set('audience', a);
    setSp(next, { replace: true });
  };
  const needle = q.trim().toLowerCase();
  const shown = all.filter(r => (audience === 'All' || r.audience === audience)
    && (!needle || `${r.name} ${r.question} ${r.audience} ${r.id}`.toLowerCase().includes(needle)));
  const audiences = AUDIENCES.map(a => ({ a, n: all.filter(r => r.audience === a).length })).filter(x => x.n);
  const runs = REPORT_RUNS.filter(r => r.module === module);
  const attention = all.filter(r => r.state !== 'Current').length;
  const latest = all.map(r => r.lastRun.split(' ')[0]).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  const featureDef = reportDefById(FEATURE[module].id);
  const feature = useMemo(() => (featureDef ? buildReport(featureDef).visuals.find(v => v.title === FEATURE[module].visual) : undefined), [featureDef, module]);

  return (
    <div className="page">
      <header className="rpt-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="rpt-head-title">{MODULE_LABEL[module]} reports</h1>
          <p className="rpt-head-p">{all.length} reports for {audiences.map(x => x.a.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')} teams — {PURPOSE[module]}</p>
        </div>
        <dl className="rpt-head-meta">
          <div><dt>Latest data</dt><dd className="num">{latest}</dd></div>
          <div><dt>Report status</dt><dd>
            <Chip tone="success">{all.length - attention} current</Chip>
            {attention > 0 && <Chip tone="warning">{attention} {attention === 1 ? 'needs' : 'need'} attention</Chip>}
          </dd></div>
        </dl>
      </header>

      <div className="rpt-tiles">{TILES[module].map(t => <HeadlineTile key={t.id} spec={t} />)}</div>

      <div className="rpt-overview">
        <NeedsAttention reports={all} />
        {feature && <VisualCard v={feature} />}
      </div>

      <div className="rpt-lib-head">
        <div>
          <div className="eyebrow">Report library</div>
          <h2 className="rpt-h2">Choose a report for your role<InfoTip text="Each report answers one decision for one audience. Every figure is computed from the same data the Insights, Reconciliation and Inventory screens show, and every report downloads as PDF, Excel, CSV, Word, HTML or JSON." /></h2>
        </div>
        <div className="nst-input-shell grid-search rpt-search">
          <span className="gs-ic" aria-hidden><IcSearch /></span>
          <input className="nst-input" placeholder="Search reports" value={q} onChange={e => setQ(e.target.value)} aria-label="Search reports" />
        </div>
      </div>
      <div className="rpt-filters" role="group" aria-label="Filter by audience">
        <button className={`rpt-filter${audience === 'All' ? ' is-on' : ''}`} onClick={() => setAudience('All')}>All audiences <span className="num">{all.length}</span></button>
        {audiences.map(({ a, n }) => (
          <button key={a} className={`rpt-filter${audience === a ? ' is-on' : ''}`} onClick={() => setAudience(audience === a ? 'All' : a)}>
            <span aria-hidden>{AUDIENCE_GLYPH[a]}</span>{a} <span className="num">{n}</span>
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="rpt-grid">{shown.map(d => <ReportCard key={d.id} def={d} />)}</div>
      ) : (
        <Card><div className="tbl-empty">No reports match. <button className="nst-btn nst-btn--xs" onClick={() => { setQ(''); setAudience('All'); }}>Show all</button></div></Card>
      )}

      <Card>
        <span className="vw-card-title-sm">Recent report runs<InfoTip text="Report files generated for this module — scheduled, automated and ad hoc — with their status." /></span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: 2, marginBottom: 'var(--vw-space-sm)' }}>Generated files for {MODULE_LABEL[module].toLowerCase()}</div>
        <DataGrid<ReportRun> chipWidth="auto"
          columns={[{ t: 'Status', w: '12%', plain: true }, { t: 'Report name', w: '28%' }, { t: 'Type' }, { t: 'Generated' }, { t: 'Frequency' }, { t: 'Creator' }, { t: 'Created on' }, { t: 'Size', r: true }]}
          rows={runs} total={runs.length} rowKey={r => r.name} searchPlaceholder="Report name, type, creator"
          filters={[{ n: 'Status', o: ['Completed', 'Failed', 'Pending'] }, { n: 'Type', o: [...new Set(runs.map(r => r.type))] }, { n: 'Frequency', o: [...new Set(runs.map(r => r.frequency))] }]}
          renderRow={r => [
            <Chip tone={RUN_STATUS_TONE[r.status]}>{r.status}</Chip>, <span className="vw-value">{r.name}</span>, r.type, r.generated, r.frequency, r.creator,
            <span className="num">{r.createdOn}</span>, <span className="num">{r.size}</span>
          ]}
        />
      </Card>
    </div>
  );
}

export const DiscoveryReports = () => <ReportsLanding module="discovery" />;
export const InventoryReports = () => <ReportsLanding module="inventory" />;
