import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, cv } from '../components/ui';
import { Donut, LineChart, SplitBar } from '../components/charts';
import { GeoMap } from '../components/GeoMap';
import { Against, KpiCard, Segments } from '../components/KpiCard';
import { legacyPath } from '../routes';
import {
  CYCLE, CYCLE_SLA_H, DISC_CLASSES, REGIONS, scopeDiscovery, successRate,
  type Region, type Scope
} from '../data/discovery';

const fmt = (v: number) => v.toLocaleString('en-IN');
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const isScope = (v: string | null): v is Scope => v === 'all' || REGIONS.some(r => r.region === v);

export default function Insights() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const scope: Scope = isScope(sp.get('region')) ? (sp.get('region') as Scope) : 'all';
  const setScope = (v: Scope) => { const n = new URLSearchParams(sp); if (v === 'all') n.delete('region'); else n.set('region', v); setSp(n, { replace: true }); };

  const [vendorView, setVendorView] = useState<'bars' | 'cards'>('bars');

  const S = useMemo(() => scopeDiscovery(scope), [scope]);
  const last = S.daily[S.daily.length - 1], prev = S.daily[S.daily.length - 2];
  const reasonTotal = S.reasons.reduce((a, r) => a + r.c, 0);
  const vendorMax = Math.max(...S.vendors.map(v => v.ok + v.fail));

  /** hands off to the legacy Scan targets screen with the matching lower-case
      filter key and a drill label, so it lands filtered and shows a way back */
  const toTargets = (q = '', label?: string) => {
    const sp = new URLSearchParams(q);
    if (label) { sp.set('from', 'Insights'); sp.set('back', 'insights'); }
    nav(legacyPath('targets', label ? { label, q: sp.toString() } : { q: sp.toString() }));
  };
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

  return (
    <div className="page ins2">
      <div className="ins2-main">
        <div className="page-bar" style={{ justifyContent: 'flex-start' }}>
          <span className="vw-card-description">Last cycle closed <span className="num">{CYCLE.closed}</span></span>
          <span className="grow" />
          <span className="nst-select-shell">
            <select className="nst-input" value={scope} aria-label="Scope" onChange={e => setScope(e.target.value as Scope)}>
              <option value="all">All circles</option>
              {REGIONS.map(r => <option key={r.region} value={r.region}>{r.region}</option>)}
            </select>
          </span>
        </div>

        <div className="kpi2-row">
          <KpiCard tone="blue"
            title="Devices polled"
            definition="Every gateway IP the discovery job tried to reach in this cycle. It grows when sites or seed ranges are added to scope."
            value={fmt(last.polled)} unit="devices" of="in scope for this cycle"
            delta={{ text: `${fmt(last.polled - prev.polled)} more than last cycle`, better: null }}
            action={{ label: 'Open scan targets', onClick: () => toDevices({}) }} />

          <KpiCard tone="emerald"
            title="Devices that answered"
            definition="Polled devices that responded to at least one collector. A full answer produced a complete record; a partial one produced a record with gaps; a failure produced no record; the failed count opens that list."
            value={pct(S.rate)} of={`${fmt(last.answered)} of ${fmt(last.polled)} polled`}
            visual={<Segments total={S.targets} parts={[
              { n: 'Full', c: S.runFull, hex: cv('emerald', 500) },
              { n: 'Partial', c: S.runPartial, hex: cv('amber', 400) },
              { n: 'Failed', c: S.runFail, hex: cv('red', 500) }]} />}
            delta={{ text: `${((last.answered / last.polled - prev.answered / prev.polled) * 100).toFixed(1)} pt better than last cycle`, better: true }}
            action={{ label: `See the ${fmt(S.runFail)} that failed`, onClick: () => toDevices({ status: 'Failed' }) }} />

          <KpiCard tone="purple"
            title="Seen for the first time"
            definition="Devices identified in this cycle that had no discovery record before. They are new to the network, newly reachable, or newly in scope — and are not yet in Inventory until reconciliation runs."
            value={fmt(last.fresh)} unit="devices" of="not in Inventory yet"
            delta={{ text: `${fmt(Math.abs(last.fresh - prev.fresh))} ${last.fresh >= prev.fresh ? 'more' : 'fewer'} than last cycle`, better: null }}
            action={{ label: 'Review new devices', onClick: () => toTargets('tgt=new', `${fmt(last.fresh)} seen for the first time this cycle`) }} />

          <KpiCard tone="amber"
            title="Time the cycle took"
            definition={`From the first poll to the last record written. The cycle must finish inside ${CYCLE_SLA_H} hours so reconciliation can run before the next one starts. Discovery runs as a single job across every circle at once, so this figure does not change with the circle filter above.`}
            value={CYCLE.durationH.toFixed(1)} unit="hours" of={`closed ${CYCLE.closed}`}
            visual={<Against value={CYCLE.durationH} limit={CYCLE_SLA_H} format={v => `${v} h`} hex={cv('amber', 400)} />}
            delta={{ text: `${(S.daily[S.daily.length - 2].hours - S.daily[S.daily.length - 1].hours).toFixed(1)} h faster than last cycle`, better: S.daily[S.daily.length - 2].hours >= S.daily[S.daily.length - 1].hours }}
            action={{ label: 'Open scan jobs', onClick: () => nav('/discovery/jobs') }} />
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
              <span className="seg"><button className={vendorView === 'bars' ? 'is-on' : ''} onClick={() => setVendorView('bars')}>Bars</button><button className={vendorView === 'cards' ? 'is-on' : ''} onClick={() => setVendorView('cards')}>Cards</button></span>
            </div>
            {vendorView === 'bars' ? (
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
            ) : (
              <div className="vcards">{S.vendors.map(v => (
                <button key={v.n} className="vcard" onClick={() => toDiscovered({ vendor: v.n })}>
                  <span className="vw-value">{v.n}</span><span className="kpi3-v num">{fmt(v.ok)}</span>
                  <span className="vw-card-description">{S.identified ? pct(v.ok / S.identified) : '—'} of fleet · <span role="button" tabIndex={0} style={{ color: cv('red', 600), textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); toDevices({ status: 'Failed', vendor: v.n }); }}>{v.fail} failed</span></span>
                </button>))}</div>
            )}
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

        {/* row D: one tile per region — narrows to the selected circle when scoped */}
        <div className="ins2-row ins2-3x4">
          {S.regions.map(r => (
            <div key={r.region} className="rtile" role="button" tabIndex={0} aria-label={`${r.region} region — ${fmt(r.total)} devices`}
              onClick={() => toRegionDevices(r.region)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toRegionDevices(r.region); } }}>
              <span className="rtile-h"><span className="vw-card-title-sm">{r.region}</span><span className="vw-card-description">{fmt(r.total)} devices</span></span>
              <span className="rtile-v num" style={{ color: cv('emerald', 700) }}>{pct(successRate(r))}</span>
              <span className="rtile-bar"><span style={{ width: `${(successRate(r) * 100).toFixed(1)}%`, background: cv('emerald', 500) }} /></span>
              <span className="rtile-f">
                <button className="num" style={{ color: cv('red', 600), background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={e => { e.stopPropagation(); toRegionDevices(r.region, { status: 'Failed' }); }}>{r.fail} failed</button>
                <span className="num" style={{ color: cv(r.trend >= 0 ? 'emerald' : 'red', 600) }}>{r.trend >= 0 ? '▲' : '▼'} {Math.abs(r.trend).toFixed(1)} pt vs last cycle</span>
              </span>
            </div>
          ))}
        </div>


        <Card>
          <div className="row vw-justify-between"><span className="vw-card-title">Discovered devices by state</span><span className="vw-card-description">identified devices · ring shows the class split</span></div>
          <div className="ins2-row ins2-7-5" style={{ marginTop: "var(--vw-space-md)" }}>
            <GeoMap legend={DISC_CLASSES.map(c => ({ n: c.n, hex: c.hex }))} region={scope === 'all' ? undefined : scope}
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
