import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, StatStrip, cv } from '../../components/ui';
import { withSolution } from '../../solution';
import { accuracyStore } from '../../inventoryAccuracy/store';
import { accuracyByCategory, accuracyByGeography, accuracyByUploadedField, accuracyTrend, overallKpis, type GroupAccuracy } from '../../inventoryAccuracy/aggregate';
import { loadThresholds, classify } from '../../inventoryAccuracy/scoring';
import { ENTITY_TYPES, type AccuracyEntityType } from '../../inventoryAccuracy/model';
import { CLASSIFICATION_CHIP, fmtPct, useStoreVersion } from './shared';
import '../../styles/inventoryAccuracy.css';

function BarRow({ label, group }: { label: string; group: GroupAccuracy }) {
  const thresholds = loadThresholds();
  const tone = CLASSIFICATION_CHIP[classify(group.score, thresholds)];
  const toneColor = tone === 'success' ? cv('emerald', 500) : tone === 'info' ? cv('sky', 500) : tone === 'warning' ? cv('amber', 500) : cv('red', 500);
  return (
    <div className="ia-bar-row">
      <div className="ia-bar-label" title={label}>{label}</div>
      <div className="ia-bar-track">
        <div className="ia-bar-fill" style={{ width: `${Math.max(2, group.score)}%`, background: toneColor }} />
      </div>
      <div className="ia-bar-value num">{fmtPct(group.score)}</div>
      <div className="ia-bar-count">{group.total - group.failed}/{group.total}</div>
    </div>
  );
}

function BarList({ title, groups, emptyText }: { title: string; groups: GroupAccuracy[]; emptyText: string }) {
  return (
    <Card>
      <h3 className="ia-card-title">{title}</h3>
      {groups.length === 0
        ? <p className="ia-empty">{emptyText}</p>
        : <div className="ia-bar-list">{groups.slice(0, 8).map(g => <BarRow key={g.group} label={g.group} group={g} />)}</div>}
    </Card>
  );
}

function Trend({ days }: { days: number }) {
  const points = accuracyTrend(accuracyStore.executions(), days);
  if (!points.length) return <p className="ia-empty">No uploads in the last {days} days.</p>;
  const w = 560, h = 120, pad = 24;
  const xs = points.map((_, i) => points.length > 1 ? pad + (i / (points.length - 1)) * (w - pad * 2) : w / 2);
  const y = (score: number) => pad + (1 - score / 100) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i]},${y(p.score)}`).join(' ');
  const refLine = (score: number, label: string) => (
    <g>
      <line x1={pad} x2={w - pad} y1={y(score)} y2={y(score)} stroke={cv('gray', 200)} strokeWidth={1} strokeDasharray="3,3" />
      <text x={w - pad} y={y(score) - 3} textAnchor="end" fontSize={9} fill={cv('gray', 300)}>{label}</text>
    </g>
  );
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={`Accuracy trend over the last ${days} days`}>
        {refLine(95, 'Excellent')}
        {refLine(85, 'Good')}
        {refLine(70, 'Needs improvement')}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.date} cx={xs[i]} cy={y(p.score)} r={4} fill="var(--color-primary)">
            <title>{`${p.date} — ${fmtPct(p.score)} across ${p.executions} upload${p.executions === 1 ? '' : 's'}`}</title>
          </circle>
        ))}
      </svg>
      <table className="ia-trend-table">
        <thead><tr><th>Date</th><th>Accuracy</th><th>Uploads</th></tr></thead>
        <tbody>{points.map(p => <tr key={p.date}><td>{p.date}</td><td className="num">{fmtPct(p.score)}</td><td className="num">{p.executions}</td></tr>)}</tbody>
      </table>
    </>
  );
}

export default function InventoryAccuracyDashboard() {
  useStoreVersion();
  const nav = useNavigate();
  const [entityFilter, setEntityFilter] = useState<AccuracyEntityType>('site');
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  const executions = accuracyStore.executions();
  const kpis = useMemo(() => overallKpis(executions), [executions]);
  const categories = useMemo(() => accuracyByCategory(executions), [executions]);
  const vendorGroups = useMemo(() => accuracyByUploadedField(entityFilter, entityFilter === 'networkElement' ? 'vendor' : 'siteType'), [entityFilter, executions]);
  const typeGroups = useMemo(() => accuracyByUploadedField(entityFilter, entityFilter === 'networkElement' ? 'neClass' : entityFilter === 'fiberCable' ? 'cableKind' : 'category'), [entityFilter, executions]);
  const geoGroups = useMemo(() => accuracyByGeography(entityFilter), [entityFilter, executions]);

  if (!executions.length) {
    return (
      <div className="page ia-page">
        <Card>
          <h3 className="ia-card-title">No uploads yet</h3>
          <p className="ia-empty">Upload an inventory file to calculate an accuracy score — nothing here is hardcoded; every KPI below is computed from your uploads.</p>
          <button type="button" className="nst-btn nst-btn--filled" onClick={() => nav(withSolution('/inventory/upload'))}>Go to Upload</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="page ia-page">
      <StatStrip cells={[
        { k: 'Total records', v: String(kpis.total), s: 'across all uploads', t: 'slate' },
        { k: 'Valid records', v: String(kpis.valid), s: 'passed every applicable rule', t: 'emerald' },
        { k: 'Invalid records', v: String(kpis.invalid), s: 'failed at least one rule', t: 'red' },
        { k: 'Duplicate records', v: String(kpis.duplicate), s: 'same record uploaded twice', t: 'orange' },
        { k: 'Missing attributes', v: String(kpis.missingAttribute), s: 'mandatory-field failures', t: 'amber' },
        { k: 'Relationship mismatches', v: String(kpis.relationshipMismatch), s: 'referential-integrity failures', t: 'purple' },
        { k: 'Overall accuracy', v: kpis.accuracy !== null ? fmtPct(kpis.accuracy) : '—', s: 'weighted by rule importance', t: 'sky' }
      ]} />

      <Card>
        <h3 className="ia-card-title">Accuracy by inventory category</h3>
        <div className="ia-bar-list">
          {categories.map(c => (
            <div key={c.entityType} className="ia-bar-row">
              <div className="ia-bar-label">{c.label}</div>
              <div className="ia-bar-track">
                {c.score !== null && <div className="ia-bar-fill" style={{ width: `${Math.max(2, c.score)}%`, background: 'var(--color-primary)' }} />}
              </div>
              <div className="ia-bar-value num">{c.score !== null ? fmtPct(c.score) : '—'}</div>
              {c.score !== null
                ? <Chip tone={CLASSIFICATION_CHIP[classify(c.score)]}>{classify(c.score)}</Chip>
                : <span className="ia-empty-inline">no uploads</span>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="ia-card-head-row">
          <h3 className="ia-card-title">Breakdown — latest upload</h3>
          <div className="ia-seg">
            {ENTITY_TYPES.map(t => (
              <button key={t} type="button" className={`ia-seg-btn${entityFilter === t ? ' is-on' : ''}`} onClick={() => setEntityFilter(t)}>
                {t === 'networkElement' ? 'Network Elements' : t === 'site' ? 'Sites' : 'Fiber Cabling'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="ia-grid-3">
        <BarList title={entityFilter === 'networkElement' ? 'Accuracy by vendor' : 'Accuracy by site type'} groups={vendorGroups} emptyText="No uploads for this category yet." />
        <BarList title={entityFilter === 'networkElement' ? 'Accuracy by resource type' : entityFilter === 'fiberCable' ? 'Accuracy by cable kind' : 'Accuracy by category'} groups={typeGroups} emptyText="No uploads for this category yet." />
        <BarList title="Accuracy by geography" groups={geoGroups} emptyText="No uploads for this category yet." />
      </div>

      <Card>
        <div className="ia-card-head-row">
          <h3 className="ia-card-title">Accuracy trend</h3>
          <div className="ia-seg">
            <button type="button" className={`ia-seg-btn${trendDays === 7 ? ' is-on' : ''}`} onClick={() => setTrendDays(7)}>7 days</button>
            <button type="button" className={`ia-seg-btn${trendDays === 30 ? ' is-on' : ''}`} onClick={() => setTrendDays(30)}>30 days</button>
          </div>
        </div>
        <Trend days={trendDays} />
      </Card>
    </div>
  );
}
