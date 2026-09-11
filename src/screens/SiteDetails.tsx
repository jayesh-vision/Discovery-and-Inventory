import { useNavigate, useParams } from 'react-router-dom';
import { Card, Chip, cv } from '../components/ui';
import { KpiCard, Segments } from '../components/KpiCard';
import { Donut, LineChart } from '../components/charts';
import { SiteHeader, SiteTabs, useSiteLocation } from './SiteTabs';
import { facilityOf, portTotals, totalLoad, uTotals } from '../data/facility';

const fmt = (v: number, d = 0) => v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (a: number, b: number) => b ? `${(a / b * 100).toFixed(0)}%` : '—';
const tone = (r: number) => r > 0.85 ? 'red' : r > 0.7 ? 'amber' : 'emerald';
const stChip = (s: string) => s === 'Normal' || s === 'Active' ? 'success' : s === 'High' || s === 'Degraded' || s === 'Planned' ? 'warning' : 'error';

function Fill({ used, total, label }: { used: number; total: number; label?: string }) {
  const r = total ? used / total : 0;
  return (
    <span className="fill" title={`${fmt(used)} of ${fmt(total)}`}>
      <span className="fill-track"><span className="fill-bar" style={{ width: `${(r * 100).toFixed(1)}%`, background: cv(tone(r), 500) }} /></span>
      <span className="num fill-l">{label ?? pct(used, total)}</span>
    </span>
  );
}

export default function SiteDetails() {
  const nav = useNavigate();
  const { id = 'BGLK-277' } = useParams();
  const { l, head } = useSiteLocation(id);
  const f = facilityOf(l.id, l.ne);
  const load = totalLoad(f), u = uTotals(f), p = portTotals(f);
  const ac = f.power.feeds.filter(x => x.kind === 'AC').reduce((a, x) => a + x.loadKw, 0);
  const dc = load - ac;
  const rooms = f.floors.reduce((a, x) => a + x.rooms.length, 0);

  return (
    <div className="page">
      <SiteHeader l={l} head={head} />
      <SiteTabs l={l} head={head} active="details" />

      <div className="kpi2-row">
        <KpiCard tone="amber" title="Power in use" definition="Load on all feeds now, against the site's rated capacity. Peak is the highest 15-minute reading in the last 24 hours."
          value={fmt(load, 1)} unit="kW" of={`of ${fmt(f.power.capacityKw)} kW capacity · ${pct(load, f.power.capacityKw)}`}
          visual={<Segments total={f.power.capacityKw} parts={[{ n: 'AC', c: +ac.toFixed(1), hex: cv('amber', 500) }, { n: 'DC', c: +dc.toFixed(1), hex: cv('sky', 500) }]} />}
          delta={{ text: `${fmt(f.power.capacityKw - load, 1)} kW headroom · peak ${fmt(f.power.peak24Kw, 1)} kW`, better: load / f.power.capacityKw < 0.8 }} />
        <KpiCard tone="emerald" title="Rack space" definition="Rack units occupied across every rack at the site."
          value={fmt(u.used)} unit="U" of={`of ${fmt(u.u)} U in ${f.racks.length} racks · ${pct(u.used, u.u)}`}
          visual={<Segments total={u.u} parts={[{ n: 'Used', c: u.used, hex: cv('emerald', 500) }, { n: 'Free', c: u.u - u.used, hex: cv('slate', 200) }]} />}
          delta={{ text: `${fmt(u.u - u.used)} U free`, better: null }} />
        <KpiCard tone="blue" title="Ports" definition="Physical ports on installed equipment and ODF terminations, all classes."
          value={fmt(p.used)} unit="in use" of={`of ${fmt(p.total)} ports · ${pct(p.used, p.total)}`}
          visual={<Segments total={p.total} parts={[{ n: 'Used', c: p.used, hex: cv('blue', 500) }, { n: 'Free', c: p.total - p.used, hex: cv('slate', 200) }]} />}
          delta={{ text: `${fmt(p.total - p.used)} ports free`, better: null }} />
        <KpiCard tone="purple" title="Building" definition="Floors, rooms and racks recorded for this site."
          value={String(f.racks.length)} unit="racks" of={`${f.floors.length} floors · ${rooms} rooms`}
          delta={{ text: `${f.power.backups.length} power backup units · PUE ${f.power.pue}`, better: null }} />
      </div>

      {/* power */}
      <div className="ins2-row ins2-8-4">
        <Card className="ins2-fill">
          <div className="row vw-justify-between"><span className="vw-card-title">Power</span><span className="vw-card-description">{f.power.supply}</span></div>
          <table className="mtbl"><thead><tr><th>Feed</th><th>Type</th><th>Source</th><th>Rating</th><th className="t-right">Load</th><th style={{ width: '22%' }}>Utilisation</th><th>Status</th></tr></thead>
            <tbody>{f.power.feeds.map(x => (
              <tr key={x.id}>
                <td className="vw-value mono">{x.id}</td>
                <td><Chip tone={x.kind === 'AC' ? 'warning' : 'info'}>{x.kind}</Chip></td>
                <td>{x.source}</td><td className="mono">{x.rating}</td>
                <td className="t-right num">{fmt(x.loadKw, 1)} kW</td>
                <td><Fill used={x.loadKw} total={x.ratingKw} /></td>
                <td><Chip tone={stChip(x.status)}>{x.status}</Chip></td>
              </tr>))}
              <tr className="mtbl-total"><td colSpan={4} className="vw-value">All feeds</td><td className="t-right num">{fmt(load, 1)} kW</td><td><Fill used={load} total={f.power.capacityKw} /></td><td /></tr>
            </tbody></table>
          <div className="row vw-justify-between" style={{ marginTop: 'var(--vw-space-md)' }}><span className="vw-card-title-sm">Load, last 24 hours</span><span className="vw-card-description">hourly · peak {fmt(f.power.peak24Kw, 1)} kW · capacity {fmt(f.power.capacityKw)} kW</span></div>
          <LineChart height={205} labels={f.power.load24.map((_, h) => h % 4 === 0 || h === 23 ? (h === 23 ? 'now' : `${String(h).padStart(2, '0')}:00`) : '')} values={f.power.load24} format={v => `${fmt(v, 1)} kW`} />
        </Card>
        <Card className="ins2-fill">
          <div className="row vw-justify-between"><span className="vw-card-title">Where the power goes</span><span className="vw-card-description">now</span></div>
          <div className="ins2-donut">
            <Donut slices={f.power.byUse.map((x, i) => ({ k: x.n, n: x.n, c: x.kw, hex: [cv('blue', 500), cv('cyan', 500), cv('slate', 400)][i] }))} total={load} label="kW in use" size={160} />
            <div className="ins2-donut-l">{f.power.byUse.map((x, i) => (
              <div key={x.n} className="ins2-reason"><span className="ch-dot" style={{ background: [cv('blue', 500), cv('cyan', 500), cv('slate', 400)][i] }} /><span className="grow">{x.n}</span><span className="num">{fmt(x.kw, 1)} kW</span><span className="vw-card-metric-label-sub num">{pct(x.kw, load)}</span></div>))}</div>
          </div>
          <div className="row vw-justify-between" style={{ marginTop: 'var(--vw-space-md)' }}><span className="vw-card-title-sm">Backup</span><span className="vw-card-description">if a feed drops</span></div>
          <table className="mtbl"><tbody>{f.power.backups.map(b => (
            <tr key={b.unit} title={`${b.unit} · ${b.rating} · tested ${b.lastTest}`}>
              <td><span className="vw-value">{b.kind}</span><span className="cell-sub mono">{b.rating}</span></td>
              <td className="num">{b.autonomy}</td>
              <td className="t-right"><Chip tone={stChip(b.status)}>{b.status}</Chip></td>
            </tr>))}</tbody></table>
          <div className="ins2-foot vw-card-description"><span>PUE <b className="num">{f.power.pue}</b></span><span className="grow" /><span>AC {fmt(ac, 1)} kW · DC {fmt(dc, 1)} kW</span></div>
        </Card>
      </div>

      {/* space + ports */}
      <div className="ins2-row ins2-6-6">
        <Card className="ins2-fill">
          <div className="row vw-justify-between"><span className="vw-card-title">Floors, rooms and racks</span><span className="vw-card-description">{f.floors.length} floors · {rooms} rooms · {f.racks.length} racks</span></div>
          <table className="mtbl"><thead><tr><th>Rack</th><th>Floor · room</th><th>Role</th><th className="t-right">Height</th><th className="t-right">Used</th><th style={{ width: '22%' }}>U-space</th><th className="t-right">Draw</th></tr></thead>
            <tbody>{f.racks.map(r => (
              <tr key={r.id} className="is-click" onClick={() => nav('/inventory/passive?tab=rack')}>
                <td className="vw-value mono">{r.id}</td><td>{r.floor} · {r.room}</td><td>{r.role}</td>
                <td className="t-right num">{r.u} U</td><td className="t-right num">{r.used} U</td>
                <td><Fill used={r.used} total={r.u} /></td>
                <td className="t-right num">{fmt(r.kw, 1)} kW</td>
              </tr>))}
              <tr className="mtbl-total"><td colSpan={3} className="vw-value">All racks</td><td className="t-right num">{u.u} U</td><td className="t-right num">{u.used} U</td><td><Fill used={u.used} total={u.u} /></td><td className="t-right num">{fmt(f.racks.reduce((a, r) => a + r.kw, 0), 1)} kW</td></tr>
            </tbody></table>
          <div className="row vw-justify-between" style={{ marginTop: 'var(--vw-space-md)' }}><span className="vw-card-title-sm">By floor</span></div>
          <div className="floors">
            {f.floors.map(fl => {
              const rs = f.racks.filter(r => r.floor === fl.n);
              const fu = rs.reduce((a, r) => a + r.u, 0), fused = rs.reduce((a, r) => a + r.used, 0);
              return (
                <div key={fl.n} className="floor">
                  <div className="row vw-justify-between"><span className="vw-value">{fl.n}</span><span className="vw-card-description">{fl.rooms.length} rooms · {rs.length} racks</span></div>
                  <div className="vw-card-description">{fl.rooms.join(' · ')}</div>
                  <Fill used={fused} total={fu} label={`${fused} / ${fu} U`} />
                  <div className="vw-card-metric-label-sub">{fmt(rs.reduce((a, r) => a + r.kw, 0), 1)} kW draw</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="ins2-fill">
          <div className="row vw-justify-between"><span className="vw-card-title">Ports</span><span className="vw-card-description">{fmt(p.total - p.used)} free of {fmt(p.total)}</span></div>
          <table className="mtbl"><thead><tr><th>Port class</th><th className="t-right">Total</th><th className="t-right">Used</th><th className="t-right">Free</th><th style={{ width: '30%' }}>Fill</th></tr></thead>
            <tbody>{f.portClasses.map(x => (
              <tr key={x.n}><td className="vw-value">{x.n}</td><td className="t-right num">{fmt(x.total)}</td><td className="t-right num">{fmt(x.used)}</td><td className="t-right num">{fmt(x.total - x.used)}</td><td><Fill used={x.used} total={x.total} /></td></tr>))}
            </tbody></table>
          <div className="row vw-justify-between" style={{ marginTop: 'var(--vw-space-md)' }}><span className="vw-card-title-sm">By rack</span></div>
          <table className="mtbl"><thead><tr><th>Rack</th><th className="t-right">Ports</th><th className="t-right">Used</th><th style={{ width: '30%' }}>Fill</th></tr></thead>
            <tbody>{f.racks.filter(r => r.ports).map(r => (
              <tr key={r.id}><td className="vw-value mono">{r.id}</td><td className="t-right num">{fmt(r.ports)}</td><td className="t-right num">{fmt(r.portsUsed)}</td><td><Fill used={r.portsUsed} total={r.ports} /></td></tr>))}
            </tbody></table>
        </Card>
      </div>

    </div>
  );
}
