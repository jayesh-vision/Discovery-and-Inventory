import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, cv } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { Donut, LineChart, SplitBar } from '../components/charts';
import { GeoMap } from '../components/GeoMap';
import { Against, KpiCard, Segments } from '../components/KpiCard';
import {
  ATTENTION, CYCLE, CYCLE_SLA_H, DAILY, DISC_CLASSES, DL, LAST, MODELS, PREV, REASONS, REASON_CHIP, REGIONS, STATE_DEVICES, VENDORS,
  discoveryRate, successRate, type AttentionRow
} from '../data/discovery';

const fmt = (v: number) => v.toLocaleString('en-IN');
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

/* ── the Synopsis side panel ───────────────────────────── */
function Synopsis({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<string | null>('context');
  const sec = (k: string, title: string, body: React.ReactNode) => (
    <div className={`syn-sec${open === k ? ' is-open' : ''}`}>
      <button className="syn-h" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}>{title}</button>
      {open === k && <div className="syn-b">{body}</div>}
    </div>
  );
  return (
    <aside className="syn" aria-label="Synopsis">
      <div className="syn-top"><span className="vw-card-title">Synopsis</span><span className="grow" /><button className="fp-x" onClick={onClose} aria-label="Close">×</button></div>
      {sec('context', 'Context & purpose', <>
        <p>Every gateway IP in scope is polled once per cycle. This page shows what the last cycle found, what it could not reach, and why.</p>
        <div className="syn-note"><strong>Primarily used for</strong>
          <ul><li>Confirming the estate answers discovery before reconciliation runs</li><li>Finding the reasons a device dropped out — reachability, credential, adapter</li><li>Spotting a vendor, model or region whose failure rate is moving</li></ul></div>
      </>)}
      {sec('read', 'How to read this page', <p>The four tiles are the cycle in one line. The daily chart shows whether the estate is growing or dropping out. Everything below breaks the {fmt(DL.runFail)} failures down by reason, vendor, model and region, and the grid lists them by device.</p>)}
      {sec('status', 'Status interpretation', <p><em>Discovery rate</em> counts devices that answered at all, partially or fully. A partial answer still produces a record — a failed one does not, and appears in the attention grid.</p>)}
      {sec('classes', 'Which classes appear', <p>Only Router and Switch have a collector. Server, DWDM, eNodeB and gNodeB are inventory-only and never appear in discovery figures; Inventory shows them under <em>no collector</em>.</p>)}
    </aside>
  );
}

export default function Insights() {
  const nav = useNavigate();
  const [syn, setSyn] = useState(false);
  const [vendorView, setVendorView] = useState<'bars' | 'cards'>('bars');
  const rate = discoveryRate();
  const reasonTotal = REASONS.reduce((a, r) => a + r.c, 0);
  const vendorMax = Math.max(...VENDORS.map(v => v.ok + v.fail));
  const reasonOf = (k: string) => REASONS.find(r => r.k === k)!;
  const toTargets = (q = '') => nav(`/discovery/targets${q ? '?' + q : ''}`);

  return (
    <div className={`page ins2${syn ? ' has-syn' : ''}`}>
      <div className="ins2-main">
        <div className="page-bar" style={{ justifyContent: 'flex-start' }}>
          <span className="vw-card-description">Last cycle closed <span className="num">{CYCLE.closed}</span></span>
          <span className="grow" />
          <span className="nst-select-shell"><select className="nst-input" defaultValue="all" aria-label="Scope"><option value="all">All circles</option><option>North</option><option>East</option><option>West</option><option>South</option></select></span>
          <button className="nst-btn nst-btn--sm">Export</button>
          <button className={`nst-btn nst-btn--sm${syn ? ' nst-btn--filled' : ''}`} onClick={() => setSyn(s => !s)} aria-pressed={syn}>Synopsis</button>
        </div>

        <div className="kpi2-row">
          <KpiCard tone="blue"
            title="Devices polled"
            definition="Every gateway IP the discovery job tried to reach in this cycle. It grows when sites or seed ranges are added to scope."
            value={fmt(LAST.polled)} unit="devices" of="in scope for this cycle"
            delta={{ text: `${fmt(LAST.polled - PREV.polled)} more than last cycle`, better: null }}
            action={{ label: 'Open scan targets', onClick: () => toTargets() }} />

          <KpiCard tone="emerald"
            title="Devices that answered"
            definition="Polled devices that responded to at least one collector. A full answer produced a complete record; a partial one produced a record with gaps; a failure produced no record and is listed under Devices needing attention."
            value={pct(rate)} of={`${fmt(LAST.answered)} of ${fmt(LAST.polled)} polled`}
            visual={<Segments total={DL.targets} parts={[
              { n: 'Full', c: DL.runFull, hex: cv('emerald', 500) },
              { n: 'Partial', c: DL.runPartial, hex: cv('amber', 400) },
              { n: 'Failed', c: DL.runFail, hex: cv('red', 500) }]} />}
            delta={{ text: `${((LAST.answered / LAST.polled - PREV.answered / PREV.polled) * 100).toFixed(1)} pt better than last cycle`, better: true }}
            action={{ label: `See the ${fmt(DL.runFail)} that failed`, onClick: () => toTargets('tgt=Failed') }} />

          <KpiCard tone="purple"
            title="Seen for the first time"
            definition="Devices identified in this cycle that had no discovery record before. They are new to the network, newly reachable, or newly in scope — and are not yet in Inventory until reconciliation runs."
            value={fmt(LAST.fresh)} unit="devices" of="not in Inventory yet"
            delta={{ text: `${fmt(Math.abs(LAST.fresh - PREV.fresh))} ${LAST.fresh >= PREV.fresh ? 'more' : 'fewer'} than last cycle`, better: null }}
            action={{ label: 'Review new devices', onClick: () => toTargets('tgt=New') }} />

          <KpiCard tone="amber"
            title="Time the cycle took"
            definition={`From the first poll to the last record written. The cycle must finish inside ${CYCLE_SLA_H} hours so reconciliation can run before the next one starts.`}
            value={CYCLE.durationH.toFixed(1)} unit="hours" of={`closed ${CYCLE.closed}`}
            visual={<Against value={CYCLE.durationH} limit={CYCLE_SLA_H} format={v => `${v} h`} hex={cv('amber', 400)} />}
            delta={{ text: `${(PREV.hours - LAST.hours).toFixed(1)} h faster than last cycle`, better: PREV.hours >= LAST.hours }}
            action={{ label: 'Open scan jobs', onClick: () => nav('/discovery/jobs') }} />
        </div>

        {/* row B: the trend beside the failure breakdown, equal height */}
        <div className="ins2-row ins2-8-4">
          <Card className="ins2-fill">
            <div className="row vw-justify-between"><span className="vw-card-title">Devices identified per cycle</span><span className="vw-card-description">last 7 daily cycles</span></div>
            <LineChart height={385} labels={DAILY.map(d => d.day)} values={DAILY.map(d => d.router + d.switch)} format={fmt}
              detail={i => <>
                <div className="ch-tip-r"><span className="ch-dot" style={{ background: DISC_CLASSES[0].hex }} />Router<span className="grow" /><span className="num">{fmt(DAILY[i].router)}</span></div>
                <div className="ch-tip-r"><span className="ch-dot" style={{ background: DISC_CLASSES[1].hex }} />Switch<span className="grow" /><span className="num">{fmt(DAILY[i].switch)}</span></div>
                <div className="ch-tip-r ch-tip-t">Identified<span className="grow" /><span className="num">{fmt(DAILY[i].router + DAILY[i].switch)}</span></div>
                <div className="ch-tip-r"><span className="ch-tip-dim">of {fmt(DAILY[i].polled)} polled · {fmt(DAILY[i].fresh)} new</span></div>
              </>} />
            <div className="ins2-foot vw-card-description">
              <span><span className="ch-dot" style={{ background: DISC_CLASSES[0].hex }} /> Router {fmt(DL.discRouter)}</span>
              <span><span className="ch-dot" style={{ background: DISC_CLASSES[1].hex }} /> Switch {fmt(DL.discSwitch)}</span>
              <span className="grow" />
              <span>axis starts at {fmt(Math.floor((Math.min(...DAILY.map(d => d.router + d.switch)) - 60) / 10) * 10)}, not zero — hover a point for the split</span>
            </div>
          </Card>
          <Card className="ins2-fill">
            <div className="row vw-justify-between"><span className="vw-card-title">Failure reasons</span><span className="vw-card-description">{fmt(reasonTotal)} of {fmt(DL.targets)} polled</span></div>
            <div className="ins2-donut">
              <Donut slices={REASONS.map(r => ({ k: r.k, n: r.n, c: r.c, hex: r.hex }))} total={reasonTotal} label="Total failures" size={168} />
              <div className="ins2-donut-l">{REASONS.map(r => (
                <button key={r.k} className="ins2-reason" onClick={() => toTargets(`reason=${r.k}`)}>
                  <span className="ch-dot" style={{ background: r.hex }} /><span className="grow">{r.n}</span><span className="num">{r.c}</span><span className="vw-card-metric-label-sub num">{pct(r.c / reasonTotal, 0)}</span>
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
                <tbody>{VENDORS.map(v => (
                  <tr key={v.n} className="is-click" onClick={() => nav(`/inventory/physical?oem=${encodeURIComponent(v.n.toUpperCase())}`)}>
                    <td className="vw-value">{v.n}</td>
                    <td className="vtbl-bar"><SplitBar ok={v.ok} fail={v.fail} max={vendorMax} /></td>
                    <td className="t-right num">{fmt(v.ok)}</td>
                    <td className="t-right num">{pct(v.ok / DL.identified, v.ok / DL.identified < 0.01 ? 2 : 1)}</td>
                    <td className="t-right num" style={{ color: cv('red', 600) }}>{v.fail}</td>
                  </tr>))}
                </tbody>
              </table>
            ) : (
              <div className="vcards">{VENDORS.map(v => (
                <button key={v.n} className="vcard" onClick={() => nav(`/inventory/physical?oem=${encodeURIComponent(v.n.toUpperCase())}`)}>
                  <span className="vw-value">{v.n}</span><span className="kpi3-v num">{fmt(v.ok)}</span>
                  <span className="vw-card-description">{pct(v.ok / DL.identified)} of fleet · <span style={{ color: cv('red', 600) }}>{v.fail} failed</span></span>
                </button>))}</div>
            )}
          </Card>
          <Card className="ins2-fill">
            <div className="row vw-justify-between"><span className="vw-card-title">Failure rate by model</span><span className="vw-card-description">models carrying the most failures</span></div>
            <table className="mtbl"><thead><tr><th>Model</th><th>Vendor</th><th className="t-right">Devices</th><th className="t-right">Failed</th><th className="t-right">Failure rate</th></tr></thead>
              <tbody>{[...MODELS].sort((a, b) => b.fail / b.total - a.fail / a.total).map(m => (
                <tr key={m.model} className="is-click" onClick={() => nav(`/inventory/physical?model=${encodeURIComponent(m.model)}`)}>
                  <td><span className="vw-value mono">{m.model}</span></td>
                  <td>{m.oem}</td>
                  <td className="t-right num">{fmt(m.total)}</td>
                  <td className="t-right num" style={{ color: cv('red', 600) }}>{m.fail}</td>
                  <td className="t-right num" style={{ color: cv(m.fail / m.total > 0.08 ? 'red' : 'amber', 700) }}>{pct(m.fail / m.total)}</td>
                </tr>))}</tbody></table>
          </Card>
        </div>

        {/* row D: one tile per region — four rows of a table were mostly empty card */}
        <div className="ins2-row ins2-3x4">
          {REGIONS.map(r => (
            <button key={r.region} className="rtile" onClick={() => nav(`/inventory/location?region=${r.region}`)}>
              <span className="rtile-h"><span className="vw-card-title-sm">{r.region}</span><span className="vw-card-description">{fmt(r.total)} devices</span></span>
              <span className="rtile-v num" style={{ color: cv('emerald', 700) }}>{pct(successRate(r))}</span>
              <span className="rtile-bar"><span style={{ width: `${(successRate(r) * 100).toFixed(1)}%`, background: cv('emerald', 500) }} /></span>
              <span className="rtile-f">
                <span className="num" style={{ color: cv('red', 600) }}>{r.fail} failed</span>
                <span className="num" style={{ color: cv(r.trend >= 0 ? 'emerald' : 'red', 600) }}>{r.trend >= 0 ? '▲' : '▼'} {Math.abs(r.trend).toFixed(1)} pt vs last cycle</span>
              </span>
            </button>
          ))}
        </div>

        <Card>
          <div className="row vw-justify-between"><span className="vw-card-title">Devices needing attention</span><span className="vw-card-description">failed in the last cycle · no record produced</span></div>
          <DataGrid<AttentionRow>
            columns={[{ t: 'Device name' }, { t: 'IP address' }, { t: 'Region' }, { t: 'Vendor' }, { t: 'Model' }, { t: 'Failure reason' }, { t: 'Last attempt' }]}
            rows={ATTENTION} total={DL.runFail} rowKey={r => r.name}
            searchPlaceholder="Device, IP, model" filters={[{ n: 'Region', o: ['North', 'East', 'West', 'South'] }, { n: 'Vendor', o: VENDORS.map(v => v.n) }, { n: 'Failure reason', o: REASONS.map(r => r.n) }]}
            gridActions={[{ l: 'Re-run discovery for all', primary: true }, { l: 'Download report' }]}
            rowActions={r => [
              { l: 'View target', onClick: () => nav(`/discovery/targets/${encodeURIComponent(r.name)}`) },
              { l: 'Open element', onClick: () => nav(`/inventory/resource/${encodeURIComponent(r.name)}`) },
              { l: 'Re-run discovery for this IP' }, { l: 'Change credential profile' }, { l: 'Copy IP address' }
            ]}
            renderRow={r => [
              <span className="vw-value">{r.name}</span>, <span className="mono">{r.ip}</span>, r.region, r.vendor, <span className="mono">{r.model}</span>,
              <Chip tone={REASON_CHIP[r.reason]}>{reasonOf(r.reason).n}</Chip>, <span className="num">{r.last}</span>
            ]}
          />
        </Card>

        <Card>
          <div className="row vw-justify-between"><span className="vw-card-title">Discovered devices by state</span><span className="vw-card-description">identified devices · ring shows the class split</span></div>
          <div className="ins2-row ins2-7-5" style={{ marginTop: "var(--vw-space-md)" }}>
            <GeoMap legend={DISC_CLASSES.map(c => ({ n: c.n, hex: c.hex }))}
              bubbles={STATE_DEVICES.map(s => ({ st: s.st, c: s.c, region: s.region, lat: s.lat, lon: s.lon,
                parts: [{ n: 'Routers', c: s.router, hex: DISC_CLASSES[0].hex }, { n: 'Switches', c: s.switch, hex: DISC_CLASSES[1].hex }] }))} />
            <table className="mtbl ins2-states"><thead><tr><th>State</th><th>Region</th><th className="t-right">Routers</th><th className="t-right">Switches</th><th className="t-right">Total</th></tr></thead>
              <tbody>{[...STATE_DEVICES].sort((a, b) => (b.router + b.switch) - (a.router + a.switch)).map(s => (
                <tr key={s.c} className="is-click" onClick={() => nav(`/inventory/location?state=${encodeURIComponent(s.st)}`)}>
                  <td className="vw-value">{s.st}</td><td>{s.region}</td>
                  <td className="t-right num">{fmt(s.router)}</td><td className="t-right num">{fmt(s.switch)}</td>
                  <td className="t-right num">{fmt(s.router + s.switch)}</td>
                </tr>))}</tbody>
              <tfoot><tr><td className="vw-value">All states</td><td /><td className="t-right num">{fmt(DL.discRouter)}</td><td className="t-right num">{fmt(DL.discSwitch)}</td><td className="t-right num">{fmt(DL.identified)}</td></tr></tfoot>
            </table>
          </div>
        </Card>
      </div>
      {syn && <Synopsis onClose={() => setSyn(false)} />}
    </div>
  );
}
