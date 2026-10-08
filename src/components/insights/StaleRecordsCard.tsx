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
  tip
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
  tip: TipHandlers;
}) {
  /* "↓" is an improvement here (fewer stale records), "↑" is a regression */
  const worse = delta.trim().startsWith('↑');
  return (
    <div className="ii-card">
      <div className="ii-card-header">
        <div className="ii-card-head"><div className="ii-card-title">{title}</div></div>
        <p className="ii-card-sub">{subtitle}</p>
      </div>

      <div className="ii-kpi-value-row">
        <span className="ii-mono ii-big-value">{count}</span>
        <span className={`ii-delta-chip${worse ? ' is-bad' : ''}`}>{delta}</span>
      </div>

      <div className="ii-stale">
        <div className="ii-stale-split">
          <section aria-label="Stale records by source">
            <h3 className="ii-mini-title">By source</h3>
            <ul className="ii-dot-list">
              {items.map(s => {
                const { bucket, what } = split(s.name);
                return (
                  <li key={s.name} className="ii-dot-item">
                    <span className="ii-dot-ind" style={{ background: bucketColors[bucket] ?? 'var(--ii-text-faint)' }} aria-hidden="true" />
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
              <div className="ii-stat-row">
                <span>{stale30Label}</span>
                <span className="ii-mono">{stale30}</span>
              </div>
            </div>
          </section>

          <section aria-label="Passive field-verified share">
            <h3 className="ii-mini-title">Passive field-verified share</h3>
            <p className="ii-mini-sub">last 6 months</p>
            <div className="ii-trend-chart ii-trend-chart--tall" role="img" aria-label={`Field-verified share over the last 6 months, from ${trend[0]?.label} to ${trend[trend.length - 1]?.label}`}>
              {trend.map(v => (
                <div
                  key={v.label}
                  className="ii-trend-bar-col"
                  onMouseEnter={e =>
                    tip.showTip(
                      {
                        title: `${v.label} Survey Audit`,
                        dotColor: v.color,
                        badge: `${parseInt(v.h, 10)}%`,
                        rows: [
                          { label: 'Field-verified share', value: `${parseInt(v.h, 10)}%` },
                          { label: 'Unverified backlog', value: `${100 - parseInt(v.h, 10)}%` }
                        ],
                        note: 'Audited by physical OSP survey teams and reconciled into GIS.'
                      },
                      e
                    )
                  }
                  onMouseMove={tip.moveTip}
                  onMouseLeave={tip.hideTip}
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

      <div className="ii-note-box">{note}</div>
    </div>
  );
}
