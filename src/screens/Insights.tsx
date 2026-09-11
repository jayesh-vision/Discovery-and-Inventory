import { Card, Chip, cv } from '../components/ui';
import { StackedBars } from '../components/charts';
import {
  DISCOVERY_STATS, DISCOVERY_JOBS, DISCOVERY_ADAPTERS, SCAN_OUTCOME, FAILED_TARGETS,
  DISCOVERY_WEEK_DAYS, DISCOVERY_WEEK_SERIES, DISCOVERY_WEEK_VALUES,
  COLLECTOR_HEALTH, DISCOVERY_ACTIVITY, DOMAIN_HEX, DOMAIN_LABEL
} from '../data/discoveryOverview';

const STAT_CARD_CLASS = { plain: '', success: 'vw-card--success', info: 'vw-card--info', purple: 'vw-card--purple' } as const;
const STAT_VALUE_COLOR = {
  plain: 'var(--vw-color-slate-900)', success: 'var(--vw-color-emerald-700)',
  info: 'var(--vw-color-sky-700)', purple: 'var(--vw-color-purple-700)'
} as const;
const STAT_LABEL_COLOR = {
  plain: 'var(--vw-color-slate-500)', success: 'var(--vw-color-emerald-700)',
  info: 'var(--vw-color-sky-700)', purple: 'var(--vw-color-purple-700)'
} as const;
/* same top accent strip as the Scan outcome tiles below, so the two rows of
   small cards read as one consistent idiom rather than two different styles */
const STAT_ACCENT = {
  plain: 'var(--vw-color-slate-400)', success: 'var(--vw-color-emerald-500)',
  info: 'var(--vw-color-sky-500)', purple: 'var(--vw-color-purple-500)'
} as const;

const OUTCOME_CARD_CLASS = { success: 'vw-card--success', orange: 'vw-card--orange', error: 'vw-card--error', warning: 'vw-card--warning' } as const;
const OUTCOME_VALUE_COLOR = {
  success: 'var(--vw-color-emerald-700)', orange: 'var(--vw-color-orange-700)',
  error: 'var(--vw-color-red-700)', warning: 'var(--vw-color-amber-700)'
} as const;
/* the four tones here are all warm/pale at the -25/-200 tint the shared
   vw-card--* variants use (orange, red and amber read almost the same at
   that lightness) — a solid top strip in the saturated shade gives each
   tile its own color at a glance, on top of the tint rather than instead of it */
const OUTCOME_ACCENT = {
  success: 'var(--vw-color-emerald-500)', orange: 'var(--vw-color-orange-500)',
  error: 'var(--vw-color-red-500)', warning: 'var(--vw-color-amber-500)'
} as const;

const DomainDot = ({ domain }: { domain: keyof typeof DOMAIN_HEX }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

export default function Insights() {
  return (
    <div className="page">
      <div className="page-head">
        <div className="stack-x" style={{ maxWidth: '70ch' }}>
          <h1 className="vw-page-title" style={{ margin: 0 }}>Discovery</h1>
          <p className="vw-page-description" style={{ margin: 0 }}>Scan engine status · RAN, Core, Transport, IP/MPLS</p>
        </div>
      </div>

      <div className="vw-grid vw-grid-cols-4 vw-gap-md" style={{ marginBottom: 'var(--vw-space-lg)' }}>
        {DISCOVERY_STATS.map(s => (
          <div key={s.label} className={`vw-card-section vw-card--accent ${STAT_CARD_CLASS[s.tone]}`}
            style={{ paddingTop: 'calc(var(--vw-space-lg) + 3px)' }}>
            <div className="vw-card-accent" style={{ background: STAT_ACCENT[s.tone] }} />
            <div className="num" style={{ fontSize: 'var(--vw-font-value-xl)', fontWeight: 700, color: STAT_VALUE_COLOR[s.tone], lineHeight: 1.15 }}>{s.value}</div>
            <div className="vw-card-metric-label-sub" style={{ color: STAT_LABEL_COLOR[s.tone], marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <span className="vw-card-title-sm">Discovery jobs</span>
        <table className="mtbl">
          <thead><tr><th>Domain</th><th>Schedule</th><th>Status</th><th>Coverage</th><th>Last run</th><th>Next run</th></tr></thead>
          <tbody>{DISCOVERY_JOBS.map(j => (
            <tr key={j.domain}>
              <td><DomainDot domain={j.domain} /></td>
              <td>{j.schedule}</td>
              <td><Chip tone="success">{j.status}</Chip></td>
              <td className="num">{j.coverage}</td>
              <td>{j.lastRun}</td>
              <td>{j.nextRun}</td>
            </tr>))}
          </tbody>
        </table>
      </Card>

      <Card>
        <span className="vw-card-title-sm">Discovery sources &amp; adapters</span>
        <table className="mtbl">
          <thead><tr><th>Adapter</th><th>Domains</th><th>Endpoints</th><th>Status</th></tr></thead>
          <tbody>{DISCOVERY_ADAPTERS.map(a => (
            <tr key={a.adapter}>
              <td className="vw-value">{a.adapter}</td>
              <td>{a.domains}</td>
              <td className="num">{a.endpoints}</td>
              <td><Chip tone={a.warn ? 'warning' : 'success'}>{a.status}</Chip></td>
            </tr>))}
          </tbody>
        </table>
      </Card>

      <Card>
        <span className="vw-card-title-sm">Scan outcome, today · {SCAN_OUTCOME.attempted} attempted</span>
        <div className="vw-grid vw-grid-cols-4 vw-gap-md" style={{ marginTop: 'var(--vw-space-md)' }}>
          {SCAN_OUTCOME.tiles.map(t => (
            <div key={t.label} className={`vw-card-section vw-card--accent ${OUTCOME_CARD_CLASS[t.tone]}`}
              style={{ paddingTop: 'calc(var(--vw-space-lg) + 3px)' }}>
              <div className="vw-card-accent" style={{ background: OUTCOME_ACCENT[t.tone] }} />
              <div className="num" style={{ fontSize: 'var(--vw-font-value-lg)', fontWeight: 700, color: OUTCOME_VALUE_COLOR[t.tone] }}>{t.value}</div>
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{t.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <span className="vw-card-title-sm">Failed discovery targets</span>
        <table className="mtbl">
          <thead><tr><th>Target</th><th>Domain</th><th>Adapter</th><th>Reason</th></tr></thead>
          <tbody>{FAILED_TARGETS.map(f => (
            <tr key={f.target}>
              <td className="mono">{f.target}</td>
              <td style={{ color: DOMAIN_HEX[f.domain] }}>{DOMAIN_LABEL[f.domain]}</td>
              <td>{f.adapter}</td>
              <td style={{ color: cv('red', 600) }}>{f.reason}</td>
            </tr>))}
          </tbody>
        </table>
      </Card>

      <Card>
        <span className="vw-card-title-sm">New objects discovered, by domain · last 7 days</span>
        <StackedBars days={DISCOVERY_WEEK_DAYS} series={DISCOVERY_WEEK_SERIES} values={DISCOVERY_WEEK_VALUES} height={260} />
      </Card>

      <Card>
        <span className="vw-card-title-sm">Collector health</span>
        <div className="stack-s" style={{ marginTop: 'var(--vw-space-md)' }}>
          {COLLECTOR_HEALTH.map(c => (
            <div key={c.name} className="row vw-justify-between vw-items-center" style={{ padding: 'var(--vw-space-sm) 0', borderTop: '1px solid var(--vw-color-slate-100)' }}>
              <div>
                <div className="vw-value">{c.name}</div>
                <div className="vw-card-metric-label-sub">{c.targets.toLocaleString('en-IN')} targets assigned · last check-in {c.checkin}</div>
              </div>
              <Chip tone={c.degraded ? 'warning' : 'success'}>{c.status}</Chip>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <span className="vw-card-title-sm">Discovery activity</span>
        <div className="stack-s" style={{ marginTop: 'var(--vw-space-md)' }}>
          {DISCOVERY_ACTIVITY.map((a, i) => (
            <div key={i} className="row vw-items-center" style={{ gap: 'var(--vw-space-sm)', padding: '7px 0', borderTop: '1px solid var(--vw-color-slate-100)' }}>
              <span style={{ color: a.warn ? cv('amber', 600) : cv('emerald', 600), flexShrink: 0 }}>{a.warn ? '⚠' : '✓'}</span>
              <span className="grow">{a.text}</span>
              <span className="vw-card-metric-label-sub" style={{ flexShrink: 0 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
