import { useNavigate } from 'react-router-dom';
import { withSolution } from '../../solution';
import type { TipHandlers } from './types';

export interface StaleItem { name: string; count: string }
export interface VerifyPoint { label: string; h: string; color: string }

/* Items are named "<Bucket> · <what is stale>"; the bucket picks the dot. */
const split = (name: string) => {
  const i = name.indexOf(' · ');
  return i < 0 ? { bucket: '', what: name } : { bucket: name.slice(0, i), what: name.slice(i + 3) };
};

export default function StaleRecordsCard({
  title,
  subtitle,
  count,
  delta,
  items,
  stale30Label,
  stale30,
  trend,
  trendCaption,
  note,
  bucketColors,
  tip: _tip
}: {
  title: string;
  subtitle: string;
  count: string;
  delta: string;
  items: StaleItem[];
  stale30Label: string;
  stale30: string;
  trend: VerifyPoint[];
  trendCaption: string;
  note: string;
  bucketColors: Record<string, string>;
  tip?: TipHandlers;
}) {
  const navigate = useNavigate();
  const drillRoute = withSolution('/inventory/telemetry?stale_days_gte=30&from=Inventory%20insights');
  /* "↓" is an improvement here (fewer stale records), "↑" is a regression */
  const worse = delta.trim().startsWith('↑');
  return (
    <div className="ii-card">
      <div className="ii-card-header">
        <div className="ii-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span className="ii-card-dot" style={{ background: 'var(--vw-color-blue-600, #2563eb)' }} />
            <div className="ii-card-title">{title}</div>
          </div>
          <button
            type="button"
            onClick={() => navigate(drillRoute)}
            className="ii-link-btn"
            aria-label="Open Stale Telemetry Records"
            title="Drill down to stale telemetry records (234)"
          >
            <span>Open Telemetry →</span>
          </button>
        </div>
        <p className="ii-card-sub">{subtitle}</p>
      </div>

      <div
        className="ii-kpi-value-row is-clickable"
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0 6px' }}
        onClick={() => navigate(drillRoute)}
        title="Drill down to records stale 30+ days"
      >
        <span className="ii-mono ii-big-value" style={{ fontSize: '1.75rem', fontWeight: 800 }}>{count}</span>
        <span className={`ii-delta-chip${worse ? ' is-bad' : ''}`}>{delta}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-500, #64748b)' }}>unconfirmed records</span>
      </div>

      <div className="ii-stale">
        <div className="ii-stale-split">
          <section aria-label="Stale records by source">
            <h3 className="ii-mini-title">By source</h3>
            <ul className="ii-dot-list">
              {items.map(s => {
                const { bucket, what } = split(s.name);
                return (
                  <li
                    key={s.name}
                    className="ii-dot-item is-clickable"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(drillRoute)}
                    title={`Drill down to stale ${bucket || 'telemetry'} records (${s.count})`}
                  >
                    <span className="ii-dot-ind" style={{ background: bucketColors[bucket] ?? 'var(--vw-color-slate-400, #94a3b8)' }} aria-hidden="true" />
                    <span className="ii-dot-text">
                      {bucket && <strong>{bucket}</strong>}
                      {bucket ? ` · ${what}` : what}
                    </span>
                    <span className="ii-mono ii-dot-count">{s.count}</span>
                  </li>
                );
              })}
            </ul>
            <div className="ii-stat-list has-divider">
              <div
                className="ii-stat-row is-clickable"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(drillRoute)}
                title="Drill down to records stale 30+ days"
              >
                <span style={{ color: 'var(--vw-color-slate-600, #475569)', fontWeight: 500 }}>{stale30Label}</span>
                <span className="ii-mono" style={{ fontWeight: 700, color: 'var(--vw-color-slate-900, #0f172a)' }}>{stale30}</span>
              </div>
            </div>
          </section>

          <section aria-label="Passive field-verified share">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <h3 className="ii-mini-title">Passive field-verified share</h3>
              <span className="ii-period-tag" style={{ fontSize: '0.625rem', padding: '1px 6px' }}>6 months</span>
            </div>
            <p className="ii-mini-sub">Audit progression over time</p>
            <div className="ii-trend-chart ii-trend-chart--tall" role="img" aria-label={`Field-verified share over the last 6 months, from ${trend[0]?.label} to ${trend[trend.length - 1]?.label}`}>
              {trend.map(v => (
                <div
                  key={v.label}
                  className="ii-trend-bar-col"
                  title={`${v.label} Survey Audit: ${parseInt(v.h, 10)}% field-verified`}
                >
                  <span className="ii-mono ii-trend-label-sm">{v.label}</span>
                  <div className="ii-trend-bar-fill" style={{ height: v.h, background: v.color }} />
                </div>
              ))}
            </div>
            <p className="ii-foot">{trendCaption}</p>
          </section>
        </div>
      </div>

      <div className="ii-note-box">
        <span className="ii-note-icon" aria-hidden="true">ℹ</span>
        <span>{note}</span>
      </div>
    </div>
  );
}
