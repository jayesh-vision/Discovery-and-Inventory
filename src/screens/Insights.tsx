import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, cv } from '../components/ui';
import { Donut, LineChart, SplitBar } from '../components/charts';
import { GeoMap } from '../components/GeoMap';
import {
  CYCLE, DISC_CLASSES, REGIONS, scopeDiscovery,
  type Region, type Scope
} from '../data/discovery';

const fmt = (v: number) => v.toLocaleString('en-IN');
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const isScope = (v: string | null): v is Scope => v === 'all' || REGIONS.some(r => r.region === v);

export default function Insights() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const scope: Scope = isScope(sp.get('region')) ? (sp.get('region') as Scope) : 'all';

  const S = useMemo(() => scopeDiscovery(scope), [scope]);
  const reasonTotal = S.reasons.reduce((a, r) => a + r.c, 0);
  const vendorMax = Math.max(...S.vendors.map(v => v.ok + v.fail));
  /** A region tile counts devices, so it opens the devices — every target the
      region polled, the failed ones among them — not the sites they sit in. */
  const toRegionDevices = (region: Region, extra: Record<string, string> = {}) => {
    const sp = new URLSearchParams(extra);
    sp.set('from', 'Insights');
    nav(`/discovery/insights/region/${encodeURIComponent(region)}?${sp.toString()}`);
  };
  /** Every count on this page that names a status, a reason, a vendor or a
      model is read straight off the region roster (scopeDiscovery filters
      the very same array); handing that filter to the same roster's list
      screen, in whatever circle is currently selected, is what keeps the
      number on screen and the rows behind it the same number. */
  const toDevices = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    sp.set('from', 'Insights');
    const path = scope === 'all' ? '/discovery/insights/devices' : `/discovery/insights/region/${encodeURIComponent(scope)}`;
    nav(`${path}?${sp.toString()}`);
  };
  /** The wider identified estate (state map, vendor/model volumes) is a
      separate, larger population from the targets above — its own list,
      filtered the same way, keeps those counts just as exact. */
  const toDiscovered = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    if (scope !== 'all') sp.set('region', scope);
    sp.set('from', 'Insights');
    nav(`/discovery/insights/discovered?${sp.toString()}`);
  };

  const ZONE_CARDS = [
    {
      title: 'North zone',
      color: 'var(--vw-color-blue-600, #2563eb)',
      border: 'var(--vw-color-blue-500, #3b82f6)',
      devices: 681,
      successPct: '91.8%',
      failed: 56,
      trend: '▲ 7 new · 0.9 pt vs last cycle',
      region: 'North' as const
    },
    {
      title: 'South zone',
      color: 'var(--vw-color-teal-600, #0d9488)',
      border: 'var(--vw-color-teal-500, #14b8a6)',
      devices: 694,
      successPct: '92.9%',
      failed: 49,
      trend: '▲ 5 new · 2.4 pt vs last cycle',
      region: 'South' as const
    },
    {
      title: 'East zone',
      color: 'var(--vw-color-amber-600, #d97706)',
      border: 'var(--vw-color-amber-500, #f59e0b)',
      devices: 609,
      successPct: '92.2%',
      failed: 48,
      trend: '▲ 4 new · 1.8 pt vs last cycle',
      region: 'East' as const
    },
    {
      title: 'West zone',
      color: 'var(--vw-color-purple-600, #7c3aed)',
      border: 'var(--vw-color-purple-500, #8b5cf6)',
      devices: 375,
      successPct: '93.6%',
      failed: 24,
      trend: '▲ 3 new · 2.7 pt vs last cycle',
      region: 'West' as const
    }
  ];

  return (
    <div className="page ins2">
      <div className="ins2-main">
        <div className="page-bar" style={{ justifyContent: 'flex-start' }}>
          <span className="vw-card-description">Last cycle closed <span className="num">{CYCLE.closed}</span></span>
        </div>

        <div className="vw-grid vw-grid-cols-4 vw-gap-md" style={{ marginBottom: 'var(--vw-space-lg)' }}>
          {ZONE_CARDS.map(z => (
            <div key={z.title} className="vw-card" style={{
              borderLeft: `4px solid ${z.border}`,
              borderRadius: 'var(--vw-radius-lg, 12px)',
              padding: 'var(--vw-space-md) var(--vw-space-lg)',
              background: 'var(--vw-color-white, #ffffff)',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              cursor: 'pointer'
            }} onClick={() => toRegionDevices(z.region)}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: z.color, marginBottom: '6px' }}>{z.title}</div>
              <div className="row vw-items-baseline" style={{ gap: '8px', marginBottom: '4px' }}>
                <span className="num" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--vw-color-slate-900, #0f172a)', lineHeight: 1 }}>{z.devices}</span>
                <span className="mono" style={{ fontSize: '0.875rem', color: 'var(--vw-color-slate-500, #64748b)' }}>devices</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--vw-color-slate-400, #94a3b8)', marginBottom: '8px' }}>
                {z.successPct} success · {z.failed} failed
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--vw-color-emerald-600, #16a34a)' }}>
                {z.trend}
              </div>
            </div>
          ))}
        </div>

        {/* row B: the trend beside the failure breakdown, equal height */}
        <div className="ins2-row ins2-8-4">
          <Card className="ins2-fill">
            <div className="row vw-justify-between"><span className="vw-card-title">Devices identified per cycle</span><span className="vw-card-description">last 7 daily cycles</span></div>
            <LineChart height={385} labels={S.daily.map(d => d.day)} values={S.daily.map(d => d.router + d.switch)} format={fmt}
              detail={i => <>
                <div className="ch-tip-r"><span className="ch-dot" style={{ background: DISC_CLASSES[0].hex }} />Router<span className="grow" /><span className="num">{fmt(S.daily[i].router)}</span></div>
                <div className="ch-tip-r"><span className="ch-dot" style={{ background: DISC_CLASSES[1].hex }} />Switch<span className="grow" /><span className="num">{fmt(S.daily[i].switch)}</span></div>
                <div className="ch-tip-r ch-tip-t">Identified<span className="grow" /><span className="num">{fmt(S.daily[i].router + S.daily[i].switch)}</span></div>
                <div className="ch-tip-r"><span className="ch-tip-dim">of {fmt(S.daily[i].polled)} polled · {fmt(S.daily[i].fresh)} new</span></div>
              </>} />
            <div className="ins2-foot vw-card-description">
              <span><span className="ch-dot" style={{ background: DISC_CLASSES[0].hex }} /> Router {fmt(S.discRouter)}</span>
              <span><span className="ch-dot" style={{ background: DISC_CLASSES[1].hex }} /> Switch {fmt(S.discSwitch)}</span>
              <span className="grow" />
              <span>hover a point for the split</span>
            </div>
          </Card>
          <Card className="ins2-fill">
            <div className="row vw-justify-between"><span className="vw-card-title">Failure reasons</span><span className="vw-card-description">{fmt(reasonTotal)} of {fmt(S.targets)} polled</span></div>
            <div className="ins2-donut">
              <Donut slices={S.reasons.map(r => ({ k: r.k, n: r.n, c: r.c, hex: r.hex }))} total={reasonTotal} label="Total failures" size={168}
                onSliceClick={k => toDevices({ status: 'Failed', reason: k })} />
              <div className="ins2-donut-l">{S.reasons.map(r => (
                <button key={r.k} className="ins2-reason" onClick={() => toDevices({ status: 'Failed', reason: r.k })}>
                  <span className="ch-dot" style={{ background: r.hex }} /><span className="grow">{r.n}</span><span className="num">{r.c}</span><span className="vw-card-metric-label-sub num">{reasonTotal ? pct(r.c / reasonTotal, 0) : '0%'}</span>
                </button>))}</div>
            </div>
          </Card>
        </div>

        {/* row C: two six-row tables, equal height */}
        <div className="ins2-row ins2-6-6">
          <Card className="ins2-fill">
            <div className="row vw-justify-between">
              <span className="vw-card-title">Discovered devices by vendor</span>
            </div>
            <table className="mtbl">
              <thead><tr><th>Vendor</th><th className="vtbl-bar">Identified <span className="ch-dot" style={{ background: cv('emerald', 500), marginLeft: 6 }} /> · failed <span className="ch-dot" style={{ background: cv('red', 500) }} /></th><th className="t-right">Identified</th><th className="t-right">Share</th><th className="t-right">Failed</th></tr></thead>
              <tbody>{S.vendors.map(v => (
                <tr key={v.n} className="is-click" onClick={() => toDiscovered({ vendor: v.n })}>
                  <td className="vw-value">{v.n}</td>
                  <td className="vtbl-bar"><SplitBar ok={v.ok} fail={v.fail} max={vendorMax} /></td>
                  <td className="t-right num">{fmt(v.ok)}</td>
                  <td className="t-right num">{S.identified ? pct(v.ok / S.identified, v.ok / S.identified < 0.01 ? 2 : 1) : '—'}</td>
                  <td className="t-right num" style={{ color: cv('red', 600) }}>
                    <button className="nst-btn nst-btn--xs nst-btn--ghost" style={{ color: cv('red', 600) }}
                      onClick={e => { e.stopPropagation(); toDevices({ status: 'Failed', vendor: v.n }); }}>{v.fail}</button>
                  </td>
                </tr>))}
              </tbody>
            </table>
          </Card>
          <Card className="ins2-fill">
            <div className="row vw-justify-between"><span className="vw-card-title">Failure rate by model</span><span className="vw-card-description">models carrying the most failures</span></div>
            <table className="mtbl"><thead><tr><th>Model</th><th>Vendor</th><th className="t-right">Devices</th><th className="t-right">Failed</th><th className="t-right">Failure rate</th></tr></thead>
              <tbody>{[...S.models].sort((a, b) => b.fail / b.total - a.fail / a.total).map(m => (
                <tr key={m.model} className="is-click" onClick={() => toDiscovered({ model: m.model })}>
                  <td><span className="vw-value mono">{m.model}</span></td>
                  <td>{m.oem}</td>
                  <td className="t-right num">{fmt(m.total)}</td>
                  <td className="t-right num" style={{ color: cv('red', 600) }}>
                    <button className="nst-btn nst-btn--xs nst-btn--ghost" style={{ color: cv('red', 600) }}
                      onClick={e => { e.stopPropagation(); toDevices({ status: 'Failed', model: m.model }); }}>{m.fail}</button>
                  </td>
                  <td className="t-right num" style={{ color: cv(m.fail / m.total > 0.08 ? 'red' : 'amber', 700) }}>{pct(m.fail / m.total)}</td>
                </tr>))}</tbody></table>
          </Card>
        </div>




        <Card>
          <div className="row vw-justify-between"><span className="vw-card-title">Discovered devices by state</span><span className="vw-card-description">identified devices</span></div>
          <div className="ins2-row ins2-7-5" style={{ marginTop: "var(--vw-space-md)" }}>
            <GeoMap region={scope === 'all' ? undefined : scope}
              onStateOpen={st => toDiscovered({ state: st })}
              bubbles={S.states.map(s => ({ st: s.st, c: s.c, region: s.region, lat: s.lat, lon: s.lon,
                parts: [{ n: 'Routers', c: s.router, hex: DISC_CLASSES[0].hex }, { n: 'Switches', c: s.switch, hex: DISC_CLASSES[1].hex }] }))} />
            <table className="mtbl ins2-states"><thead><tr><th>State</th><th>Region</th><th className="t-right">Routers</th><th className="t-right">Switches</th><th className="t-right">Total</th></tr></thead>
              <tbody>{[...S.states].sort((a, b) => (b.router + b.switch) - (a.router + a.switch)).map(s => (
                <tr key={s.c} className="is-click" onClick={() => toDiscovered({ state: s.st })}>
                  <td className="vw-value">{s.st}</td><td>{s.region}</td>
                  <td className="t-right num">{fmt(s.router)}</td><td className="t-right num">{fmt(s.switch)}</td>
                  <td className="t-right num">{fmt(s.router + s.switch)}</td>
                </tr>))}</tbody>
              <tfoot><tr><td className="vw-value">All states</td><td /><td className="t-right num">{fmt(S.discRouter)}</td><td className="t-right num">{fmt(S.discSwitch)}</td><td className="t-right num">{fmt(S.identified)}</td></tr></tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
