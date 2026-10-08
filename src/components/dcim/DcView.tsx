/* Data center inventory view — everything a client uploaded for one data
   center, as inventory: locations, racks and rack units, devices, cabling,
   the power plant and its feeds, cooling, sensors, findings and the import
   log. Every number is counted from the uploaded records; there are no
   readings and no drawn layouts. Updates arrive by uploading a file
   (Upload update), and the current records can be downloaded in the same
   template to edit and re-upload. */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, Sub } from '../ui';
import { DataGrid } from '../grid/DataGrid';
import { Drawer } from '../Drawer';
import { Bar, Empty, Head, KV, Seg, fmt, human } from './common';
import RackElevation from './RackElevation';
import { candidatesFor, confirmLink, downloadInventory, importHistory, removeLink } from '../../dcim/api';
import { counts, dcScope, deviceLinks, downstream, freePorts, rackOccupancy, rackPower, redundancyGroups, type DcScope } from '../../dcim/derive';
import { findings, pathOf, worst, type Finding } from '../../dcim/findings';
import { WHITE_SPACE, type ClientData, type Device, type PowerEquipment, type Rack } from '../../dcim/model';
import '../../styles/dcim.css';

export type DcSource = { clientId: string; clientName?: string };
type TabK = 'overview' | 'locations' | 'racks' | 'devices' | 'connectivity' | 'power' | 'cooling' | 'sensors' | 'findings' | 'imports' | 'links';
const SEV_TONE = { critical: 'error', major: 'warning', minor: 'neutral' } as const;
const SEV_WORD = { critical: 'Critical', major: 'Major', minor: 'Minor' } as const;

export function DcView({ data, dcId, source }: { data: ClientData; dcId: string; source: DcSource }) {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const s = useMemo(() => dcScope(data.entities, dcId), [data, dcId]);
  const fs = useMemo(() => s ? findings(data.entities, dcId) : [], [data, dcId, s]);
  const [rackId, setRackId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!s) return <Card><Empty title={`Data center ${dcId} not found`} /></Card>;
  const c = counts(s);
  const tab = (sp.get('dtab') as TabK) || 'overview';
  const setTab = (k: TabK) => { const n = new URLSearchParams(sp); n.set('dtab', k); setSp(n, { replace: true }); };
  const w = worst(fs);
  const batches = importHistory(source.clientId);
  const upload = () => nav(`/inventory/dcim/import?client=${encodeURIComponent(source.clientId)}${s.dc.locationId ? `&location=${encodeURIComponent(s.dc.locationId)}` : ''}`);
  const download = async () => { setBusy(true); try { await downloadInventory(source.clientId, dcId); } finally { setBusy(false); } };
  const TABS: { k: TabK; n: string; count?: number }[] = [
    { k: 'overview', n: 'Overview' }, { k: 'locations', n: 'Locations', count: c.rooms }, { k: 'racks', n: 'Racks', count: c.racks },
    { k: 'devices', n: 'Devices', count: c.devices }, { k: 'connectivity', n: 'Connectivity', count: c.physical + c.logical },
    { k: 'power', n: 'Power', count: s.power.length }, { k: 'cooling', n: 'Cooling', count: c.cooling }, { k: 'sensors', n: 'Sensors', count: c.sensors },
    { k: 'findings', n: 'Findings', count: fs.length }, { k: 'imports', n: 'Import history', count: batches.length },
    { k: 'links', n: 'Discovery links', count: data.links.length }
  ];

  return (
    <div className="stack dcim">
      <Card className="dc-head">
        <div className="dc-head-row">
          <span className="dc-icon" aria-hidden>▦</span>
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <strong className="dc-name">{s.dc.name}</strong>
              <Chip tone={s.dc.status === 'ACTIVE' ? 'success' : 'neutral'}>{s.dc.status === 'ACTIVE' ? 'Active' : human(s.dc.status)}</Chip>
              {s.dc.tier && <Chip tone="info">Tier {s.dc.tier}</Chip>}
              {w ? <span className={`dc-sev dc-sev--${w}`}>● {fs.length} finding{fs.length === 1 ? '' : 's'} to review</span> : <span className="dc-sev dc-sev--ok">● No findings</span>}
            </div>
            <Sub mono>{s.dc.id}{s.dc.locationId ? ` · location ${s.dc.locationId}` : ''}{s.dc.city ? ` · ${s.dc.city}` : ''} · {source.clientName ?? source.clientId}{batches[0] ? ` · last upload ${new Date(batches[0].at).toLocaleString()}` : ''}</Sub>
          </div>
          <span className="grow" />
          <button type="button" className="nst-btn nst-btn--sm nst-btn--ghost" onClick={download} disabled={busy}>{busy ? 'Preparing…' : 'Download current inventory'}</button>
          <button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={upload}>Upload update</button>
        </div>
      </Card>
      <StatStrip cells={[
        { k: 'Locations', v: `${fmt(c.buildings)} · ${fmt(c.floors)} · ${fmt(c.rooms)}`, s: 'buildings · floors · rooms', t: 'sky' },
        { k: 'Racks', v: fmt(c.racks), s: `${fmt(c.uUsed)} of ${fmt(c.uTotal)} U used`, t: 'cyan' },
        { k: 'Devices', v: fmt(c.devices), s: `${fmt(c.mounted)} mounted · ${fmt(c.unplaced)} without U`, t: 'emerald' },
        { k: 'Power plant', v: fmt(s.power.length), s: `${c.power.GENERATOR} gen · ${c.power.UPS} UPS · ${fmt(c.pdus)} PDUs`, t: 'amber' },
        { k: 'Cooling', v: fmt(c.cooling), s: `${fmt(c.coolingKw)} kW · ${fmt(c.sensors)} sensors`, t: 'purple' },
        { k: 'Cabling', v: fmt(c.physical), s: `cables · ${fmt(c.ports)} ports`, t: 'slate' }
      ]} />
      <div className="pills" role="tablist" aria-label="Inventory sections">
        {TABS.map(x => (
          <button key={x.k} type="button" role="tab" aria-selected={tab === x.k} className={tab === x.k ? 'is-on' : ''} onClick={() => setTab(x.k)}>
            {x.n}{x.count !== undefined && x.count > 0 && <span className="pill-n">{fmt(x.count)}</span>}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview s={s} data={data} fs={fs} onRack={setRackId} go={setTab} />}
      {tab === 'locations' && <Card><LocationsTab s={s} /></Card>}
      {tab === 'racks' && <Card><RacksTab s={s} data={data} onRack={setRackId} /></Card>}
      {tab === 'devices' && <Card><DevicesTab s={s} data={data} onRack={setRackId} /></Card>}
      {tab === 'connectivity' && <Card><ConnectivityTab s={s} data={data} /></Card>}
      {tab === 'power' && <PowerTab s={s} data={data} onRack={setRackId} />}
      {tab === 'cooling' && <Card><CoolingTab s={s} /></Card>}
      {tab === 'sensors' && <Card><SensorsTab s={s} /></Card>}
      {tab === 'findings' && <Card><FindingsTab s={s} fs={fs} onRack={setRackId} /></Card>}
      {tab === 'imports' && <Card><ImportsTab batches={batches} onUpload={upload} /></Card>}
      {tab === 'links' && <Card><LinksTab s={s} data={data} /></Card>}
      <RackDrawer s={s} data={data} rackId={rackId} onClose={() => setRackId(null)} />
    </div>
  );
}

/* ── overview: one card per part of the facility ── */
function Overview({ s, data, fs, onRack, go }: { s: DcScope; data: ClientData; fs: Finding[]; onRack: (id: string) => void; go: (k: TabK) => void }) {
  const e = data.entities;
  const c = counts(s);
  const feeds = s.racks.map(r => rackPower(e, r).redundancy);
  const byFeed = (k: string) => feeds.filter(x => x === k).length;
  const coolByType = new Map<string, number>(); for (const u of s.cooling) coolByType.set(u.type, (coolByType.get(u.type) ?? 0) + 1);
  const sensByKind = new Map<string, number>(); for (const x of s.sensors) sensByKind.set(x.kind, (sensByKind.get(x.kind) ?? 0) + 1);
  const halls = s.rooms.filter(r => WHITE_SPACE.includes(r.type) && s.racks.some(k => k.roomId === r.id));
  const sizes = new Map<string, number>(); for (const r of s.racks) { const k = `${r.widthMm}×${r.depthMm} · ${r.heightU}U`; sizes.set(k, (sizes.get(k) ?? 0) + 1); }
  const order = ['UTILITY', 'TRANSFORMER', 'GENERATOR', 'ATS', 'SWITCHGEAR', 'UPS', 'RECTIFIER', 'BATTERY', 'PDU', 'RPP', 'RACK_PDU', 'CIRCUIT'];
  const plant = order.map(t => ({ t, list: s.power.filter(p => p.type === t) })).filter(x => x.list.length);
  return (
    <div className="ov-grid">
      <Card className="ov-card ov-wide">
        <Head title="Locations" sub="Buildings, floors and rooms with what each holds" right={<button type="button" className="link-btn" onClick={() => go('locations')}>All rooms ›</button>} />
        <div className="tree">
          {s.buildings.map(b => (
            <details key={b.id} open>
              <summary><strong>{b.name}</strong><span className="muted small">{b.lengthM && b.widthM ? `${b.lengthM} × ${b.widthM} m · ` : ''}{s.floors.filter(f => f.buildingId === b.id).length} floors</span></summary>
              {s.floors.filter(f => f.buildingId === b.id).map(f => (
                <div key={f.id} className="tree-floor">
                  <div className="tree-floor-h"><span>{f.name}</span><span className="muted small">level {f.level}</span></div>
                  <div className="tree-rooms">
                    {s.rooms.filter(r => r.floorId === f.id).map(r => {
                      const rk = s.racks.filter(k => k.roomId === r.id);
                      return (
                        <div key={r.id} className="tree-room">
                          <span className="tree-room-n">{r.name}</span>
                          <span className="muted small">{human(r.type)}{rk.length ? ` · ${rk.length} racks · ${fmt(s.devices.filter(d => rk.some(k => k.id === d.rackId)).length)} devices` : ''}{s.cooling.some(u => u.roomId === r.id) ? ` · ${s.cooling.filter(u => u.roomId === r.id).length} cooling` : ''}{s.power.some(p => p.roomId === r.id && !p.rackId) ? ` · ${s.power.filter(p => p.roomId === r.id && !p.rackId).length} power units` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </details>
          ))}
        </div>
      </Card>

      <Card className="ov-card">
        <Head title="Power plant" count={s.power.length} right={<button type="button" className="link-btn" onClick={() => go('power')}>Power path ›</button>} />
        {plant.length ? <table className="plain"><tbody>
          {plant.map(x => (
            <tr key={x.t}><td>{human(x.t)}</td><td className="num">{fmt(x.list.length)}</td>
              <td className="num muted">{x.list.some(p => p.ratingKw) ? `${fmt(x.list.reduce((a, p) => a + (p.ratingKw ?? 0), 0))} kW` : x.list.some(p => p.ratingKva) ? `${fmt(x.list.reduce((a, p) => a + (p.ratingKva ?? 0), 0))} kVA` : ''}</td></tr>
          ))}
        </tbody></table> : <p className="muted small">No power equipment uploaded.</p>}
        <div className="side-k" style={{ marginTop: 10 }}>Rack feeds</div>
        <div className="feed-row">
          <span className="feed feed--ok">{byFeed('A+B')} A + B</span>
          <span className="feed feed--warn">{byFeed('A only') + byFeed('B only') + byFeed('single feed')} single</span>
          <span className="feed">{byFeed('no feed recorded')} none recorded</span>
        </div>
        {redundancyGroups(s.power).length > 0 && <p className="muted small" style={{ margin: '8px 0 0' }}>Redundancy groups: {redundancyGroups(s.power).map(g => `${g.name} (${g.units.length})`).join(' · ')}</p>}
      </Card>

      <Card className="ov-card">
        <Head title="Cooling" count={s.cooling.length} right={<button type="button" className="link-btn" onClick={() => go('cooling')}>All units ›</button>} />
        {s.cooling.length ? <>
          <KV items={[...coolByType.entries()].map(([k, v]) => [human(k), `${v} · ${fmt(s.cooling.filter(u => u.type === k).reduce((a, u) => a + u.capacityKw, 0))} kW`] as [string, string])} />
          <p className="muted small" style={{ margin: '8px 0 0' }}>{halls.filter(h => s.cooling.some(u => u.roomId === h.id)).length} of {halls.length} rooms with racks have a cooling unit recorded.</p>
        </> : <p className="muted small">No cooling equipment uploaded.</p>}
      </Card>

      <Card className="ov-card">
        <Head title="Space" right={<button type="button" className="link-btn" onClick={() => go('racks')}>All racks ›</button>} />
        <div className="row" style={{ gap: 10 }}><Bar pct={c.uTotal ? c.uUsed / c.uTotal * 100 : 0} /><span className="small">{fmt(c.uUsed)} of {fmt(c.uTotal)} U used ({c.uTotal ? Math.round(c.uUsed / c.uTotal * 100) : 0}%)</span></div>
        <div className="side-k" style={{ marginTop: 10 }}>Rack types</div>
        <KV items={[...sizes.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, `${v} racks`] as [string, string])} />
        <p className="muted small" style={{ margin: '8px 0 0' }}>Nameplate power of mounted equipment: {fmt(c.nameplateKw, 1)} kW{s.dc.designKw ? ` · design ${fmt(s.dc.designKw)} kW` : ''}.</p>
      </Card>

      <Card className="ov-card">
        <Head title="Connectivity" right={<button type="button" className="link-btn" onClick={() => go('connectivity')}>All cables ›</button>} />
        <KV items={[['Cables (physical)', fmt(c.physical)], ['Logical adjacencies', fmt(c.logical)], ['Ports recorded', fmt(c.ports)], ['Ports without a cable', fmt(freePorts(s).length)],
          ['Patch panels / ODFs', fmt(s.devices.filter(d => d.type === 'PATCH_PANEL' || d.type === 'ODF').length)]]} />
      </Card>

      <Card className="ov-card">
        <Head title="Environmental sensors" count={s.sensors.length} right={<button type="button" className="link-btn" onClick={() => go('sensors')}>All sensors ›</button>} />
        {s.sensors.length ? <>
          <KV items={[...sensByKind.entries()].map(([k, v]) => [human(k), fmt(v)] as [string, string])} />
          <p className="muted small" style={{ margin: '8px 0 0' }}>{halls.filter(h => s.sensors.some(x => x.roomId === h.id)).length} of {halls.length} rooms with racks have sensors recorded.</p>
        </> : <p className="muted small">No sensors uploaded.</p>}
      </Card>

      <Card className={`ov-card ov-wide${fs.some(f => f.severity !== 'minor') ? ' side-card--alert' : ''}`}>
        <Head title="Findings" count={fs.length} sub="Read from the uploaded records" right={fs.length > 5 ? <button type="button" className="link-btn" onClick={() => go('findings')}>Show all ›</button> : undefined} />
        {fs.length ? <div className="attn-list">
          {fs.slice(0, 5).map(f => (
            <button key={f.id} type="button" className={`attn attn--${f.severity}`} onClick={() => f.rackId ? onRack(f.rackId) : go('findings')}>
              <span className="attn-t">{f.title}</span>
              <span className="attn-p">{pathOf(s, f) || s.dc.name}{f.detail ? ` · ${f.detail}` : ''}</span>
              <Chip tone={SEV_TONE[f.severity]}>{SEV_WORD[f.severity]}</Chip>
            </button>
          ))}
        </div> : <p className="muted small">Nothing to review — the uploaded records are consistent.</p>}
      </Card>
    </div>
  );
}

/* ── rack drawer: elevation, devices and feeds of one rack ── */
function RackDrawer({ s, data, rackId, onClose }: { s: DcScope; data: ClientData; rackId: string | null; onClose: () => void }) {
  const [dev, setDev] = useState<string | null>(null);
  const rack = s.racks.find(r => r.id === rackId);
  if (!rack) return null;
  const e = data.entities;
  const occ = rackOccupancy(rack, e.devices);
  const rp = rackPower(e, rack);
  const room = s.rooms.find(r => r.id === rack.roomId); const floor = s.floors.find(f => f.id === room?.floorId);
  const device = dev ? s.devices.find(d => d.id === dev) : undefined;
  return (
    <Drawer open title={`Rack ${rack.name}`} sub={`${floor?.name ?? ''} › ${room?.name ?? ''}${rack.rowId ? ` › row ${s.rows.find(x => x.id === rack.rowId)?.name}` : ''}`} onClose={() => { setDev(null); onClose(); }}>
      <div className="stack dcim">
        <KV items={[['Size', `${rack.widthMm} × ${rack.depthMm} mm · ${rack.heightU}U`], ['Space', <span className="row" style={{ gap: 8 }}>{occ.usedU}/{rack.heightU} U<Bar pct={occ.usedU / rack.heightU * 100} /></span>],
          ['Largest free run', occ.freeRuns.length ? `${Math.max(...occ.freeRuns.map(f => f.to - f.from + 1))}U` : 'full'],
          ['Nameplate', `${fmt(occ.nameplateKw, 1)} kW${rack.maxKw ? ` of ${fmt(rack.maxKw, 1)} kW budget` : ''}`], ['Power feeds', <Chip tone={rp.redundancy === 'A+B' ? 'success' : rp.redundancy === 'no feed recorded' ? 'neutral' : 'warning'}>{rp.redundancy}</Chip>]]} />
        {occ.problems.length > 0 && <p className="issue-error small">{occ.problems.map(p => p.message).join(' ')}</p>}
        <RackElevation occ={occ} devices={e.devices} pdus={e.powerEquipment.filter(p => p.rackId === rack.id && p.type === 'RACK_PDU')} selected={dev} onDevice={setDev} />
        {occ.unplaced.length > 0 && <p className="small"><strong>In this rack without a U position:</strong> {occ.unplaced.map(d => d.name).join(', ')}</p>}
        {device && <DeviceCard s={s} data={data} device={device} />}
        <Head title="Power path" />
        {rp.paths.length ? rp.paths.map((p, i) => <div key={i}><div className="small muted">Side {p.side}</div><PowerChain chain={p.chain} /></div>) : <p className="muted small">No rack PDU or power connection recorded for this rack.</p>}
      </div>
    </Drawer>
  );
}

function DeviceCard({ s, data, device }: { s: DcScope; data: ClientData; device: Device }) {
  const e = data.entities;
  const links = deviceLinks(s, e.ports, e.devices, device.id);
  const ports = e.ports.filter(p => p.deviceId === device.id);
  const lk = data.links.filter(l => l.deviceId === device.id);
  return (
    <div className="dev-card">
      <Head title={device.name} sub={`${human(device.type)}${device.model ? ` · ${device.vendor ?? ''} ${device.model}` : ''}`} />
      <KV items={[['Serial', device.serial ? <Mono>{device.serial}</Mono> : '—'], ['Management IP', device.mgmtIp ? <Mono>{device.mgmtIp}</Mono> : '—'],
        ['Position', device.uStart ? `U${device.uStart}${device.uHeight > 1 ? `–U${device.uStart + device.uHeight - 1}` : ''} · ${human(device.face)}${device.fullDepth ? ' · full depth' : ''}` : 'no U recorded'],
        ['Nameplate', device.powerW ? `${fmt(device.powerW)} W · ${device.psuCount ?? '?'} PSU` : '—'], ['Status', human(device.status)],
        ['Linked records', lk.length ? lk.map(l => `${l.target === 'inventory' ? 'Inventory' : 'Discovery'} ${l.ref}`).join(', ') : 'none']]} />
      {ports.length > 0 && <table className="plain" style={{ marginTop: 8 }}><thead><tr><th>Port</th><th>Connected to</th></tr></thead><tbody>
        {ports.map(p => { const l = links.filter(x => x.port.id === p.id); return <tr key={p.id}><td><Mono>{p.name}</Mono><Sub>{p.speedGbps ? `${p.speedGbps}G ` : ''}{p.media ?? ''}</Sub></td>
          <td>{l.length ? l.map(x => <div key={x.connection.id}>{x.farDevice?.name ?? '?'} <Mono>{x.far.name}</Mono> <span className="muted small">{x.connection.kind === 'LOGICAL' ? 'logical' : x.connection.media ?? 'cable'}</span></div>) : <span className="muted">free</span>}</td></tr>; })}
      </tbody></table>}
    </div>
  );
}

function PowerChain({ chain }: { chain: PowerEquipment[] }) {
  return <div className="chain">{chain.map((p, i) => <span key={p.id} className="row" style={{ gap: 4 }}>{i > 0 && <span className="arrow">←</span>}<span className="hop" title={human(p.type)}>{p.name}</span></span>)}</div>;
}

/* ── tabs ── */
function LocationsTab({ s }: { s: DcScope }) {
  const rows = s.rooms.map(r => {
    const f = s.floors.find(x => x.id === r.floorId)!; const b = s.buildings.find(x => x.id === f.buildingId)!;
    const rk = s.racks.filter(k => k.roomId === r.id);
    return { r, f, b, racks: rk.length, devices: s.devices.filter(d => rk.some(k => k.id === d.rackId) || d.roomId === r.id).length,
      rows: s.rows.filter(x => x.roomId === r.id).length, cooling: s.cooling.filter(c => c.roomId === r.id).length, sensors: s.sensors.filter(x => x.roomId === r.id).length,
      power: s.power.filter(p => p.roomId === r.id && !p.rackId).length };
  });
  return (
    <DataGrid<typeof rows[number]> columns={[{ t: 'Room' }, { t: 'Building · floor' }, { t: 'Type' }, { t: 'Size' }, { t: 'Design load', r: true }, { t: 'Rows', r: true }, { t: 'Racks', r: true }, { t: 'Devices', r: true }, { t: 'Power units', r: true }, { t: 'Cooling', r: true }, { t: 'Sensors', r: true }]}
      rows={rows} total={rows.length} rowKey={x => x.r.id} searchPlaceholder="Room, floor, building"
      renderRow={x => [
        <><span className="vw-value">{x.r.name}</span><Sub mono>{x.r.id}</Sub></>, <>{x.b.name}<Sub>{x.f.name} · level {x.f.level}</Sub></>, human(x.r.type),
        x.r.lengthM && x.r.widthM ? `${x.r.lengthM} × ${x.r.widthM} m` : <span className="muted">—</span>, x.r.designKw ? `${fmt(x.r.designKw)} kW` : '—',
        fmt(x.rows), fmt(x.racks), fmt(x.devices), fmt(x.power), fmt(x.cooling), fmt(x.sensors)
      ]} />
  );
}

function RacksTab({ s, data, onRack }: { s: DcScope; data: ClientData; onRack: (id: string) => void }) {
  const rows = useMemo(() => s.racks.map(r => ({ r, o: rackOccupancy(r, data.entities.devices), p: rackPower(data.entities, r) })), [s, data]);
  return (
    <DataGrid<typeof rows[number]> columns={[{ t: 'Rack' }, { t: 'Room · row' }, { t: 'Size' }, { t: 'U used' }, { t: 'Devices', r: true }, { t: 'Nameplate / budget' }, { t: 'Feeds' }, { t: 'Problems' }]}
      rows={rows} total={rows.length} rowKey={x => x.r.id} searchPlaceholder="Rack, room, row"
      rowActions={x => [{ l: 'Open rack', onClick: () => onRack(x.r.id) }]}
      renderRow={x => [
        <><span className="vw-value">{x.r.name}</span><Sub mono>{x.r.id}</Sub></>,
        <>{s.rooms.find(r => r.id === x.r.roomId)?.name}<Sub>{x.r.rowId ? `row ${s.rows.find(r => r.id === x.r.rowId)?.name} · position ${x.r.position ?? '—'}` : 'no row'}</Sub></>,
        <span className="small">{x.r.widthMm} × {x.r.depthMm} mm · {x.r.heightU}U</span>,
        <span className="row" style={{ gap: 8 }}>{x.o.usedU}/{x.r.heightU}<Bar pct={x.o.usedU / x.r.heightU * 100} /></span>,
        fmt(x.o.placed.length + x.o.unplaced.length),
        <span className="small">{fmt(x.o.nameplateKw, 1)} / {x.r.maxKw ? fmt(x.r.maxKw, 1) : '—'} kW</span>,
        <Chip tone={x.p.redundancy === 'A+B' ? 'success' : x.p.redundancy === 'no feed recorded' ? 'neutral' : 'warning'}>{x.p.redundancy}</Chip>,
        x.o.problems.length ? <span className="issue-error small">{x.o.problems.length} placement</span> : x.o.unplaced.length ? <span className="issue-warning small">{x.o.unplaced.length} without U</span> : <span className="muted">—</span>
      ]} />
  );
}

function DevicesTab({ s, data, onRack }: { s: DcScope; data: ClientData; onRack: (id: string) => void }) {
  const linked = new Map(data.links.map(l => [l.deviceId, l]));
  return (
    <DataGrid<Device> columns={[{ t: 'Device' }, { t: 'Type' }, { t: 'Vendor / model' }, { t: 'Serial' }, { t: 'Rack · U' }, { t: 'Mgmt IP' }, { t: 'Nameplate', r: true }, { t: 'Status' }, { t: 'Linked' }]}
      rows={s.devices} total={s.devices.length} rowKey={d => d.id} searchPlaceholder="Name, serial, IP, model"
      rowActions={d => d.rackId ? [{ l: 'Show in rack', onClick: () => onRack(d.rackId!) }] : []}
      renderRow={d => [
        <><span className="vw-value">{d.name}</span><Sub mono>{d.id}</Sub></>, human(d.type), <>{d.model ?? '—'}<Sub>{d.vendor ?? ''}</Sub></>,
        d.serial ? <Mono>{d.serial}</Mono> : '—',
        d.rackId ? <>{s.racks.find(r => r.id === d.rackId)?.name}<Sub>{d.uStart ? `U${d.uStart}${d.uHeight > 1 ? `–${d.uStart + d.uHeight - 1}` : ''}` : 'no U'}</Sub></> : <span className="muted">free-standing</span>,
        d.mgmtIp ? <Mono>{d.mgmtIp}</Mono> : '—', d.powerW ? `${fmt(d.powerW)} W` : '—',
        <Chip tone={d.status === 'ACTIVE' ? 'success' : d.status === 'PLANNED' ? 'info' : 'neutral'}>{human(d.status)}</Chip>,
        linked.has(d.id) ? <Chip tone="success">{linked.get(d.id)!.target}</Chip> : <span className="muted">—</span>
      ]} />
  );
}

function ConnectivityTab({ s, data }: { s: DcScope; data: ClientData }) {
  const [kind, setKind] = useState<'PHYSICAL' | 'LOGICAL'>('PHYSICAL');
  const e = data.entities;
  const portById = useMemo(() => new Map(e.ports.map(p => [p.id, p])), [e]);
  const devById = useMemo(() => new Map(e.devices.map(d => [d.id, d])), [e]);
  const list = s.connections.filter(c => c.kind === kind);
  const groups = new Map<string, number>();
  for (const c of list) if (c.redundancyGroup) groups.set(c.redundancyGroup, (groups.get(c.redundancyGroup) ?? 0) + 1);
  const single = [...groups.values()].filter(n => n < 2).length;
  const end = (pid: string) => { const p = portById.get(pid); const d = p && devById.get(p.deviceId); return <>{d?.name ?? '?'} <Mono>{p?.name ?? pid}</Mono></>; };
  return (
    <div className="stack">
      <div className="toolbar">
        <Seg label="Connection kind" value={kind} onChange={setKind} options={[{ k: 'PHYSICAL', n: 'Physical cabling' }, { k: 'LOGICAL', n: 'Logical adjacencies' }]} />
        <span className="muted small">{fmt(list.length)} {kind === 'PHYSICAL' ? 'cables' : 'adjacencies'} · {fmt(freePorts(s).length)} ports without a cable{kind === 'PHYSICAL' && groups.size ? ` · ${fmt(groups.size)} redundancy groups${single ? `, ${single} with one member` : ''}` : ''}</span>
      </div>
      {kind === 'LOGICAL' && <p className="vw-card-description small" style={{ margin: 0 }}>Only adjacencies stated in the upload (Kind = LOGICAL); none are inferred from cabling.</p>}
      <DataGrid<typeof list[number]> columns={[{ t: 'Connection' }, { t: 'A end' }, { t: 'B end' }, { t: 'Media · length' }, { t: 'Role' }, { t: 'Redundancy' }, { t: 'Status' }]}
        rows={list} total={list.length} rowKey={c => c.id} searchPlaceholder="Connection, cable"
        renderRow={c => [<Mono>{c.cableId ?? c.id}</Mono>, end(c.aPortId), end(c.bPortId), <span className="small">{c.media ?? '—'}{c.lengthM ? ` · ${c.lengthM} m` : ''}</span>, human(c.role) || '—', c.redundancyGroup ?? '—', human(c.status)]} />
    </div>
  );
}

function PowerTab({ s, data, onRack }: { s: DcScope; data: ClientData; onRack: (id: string) => void }) {
  const e = data.entities;
  const ids = new Set(s.power.map(p => p.id));
  const parents = new Map<string, string[]>();
  for (const pc of e.powerConnections) if (ids.has(pc.toId)) parents.set(pc.toId, [...(parents.get(pc.toId) ?? []), pc.fromId]);
  const primary = (id: string) => parents.get(id)?.[0];
  const children = (id: string) => s.power.filter(p => primary(p.id) === id && p.type !== 'RACK_PDU');
  const roots = s.power.filter(p => !primary(p.id) && p.type !== 'BATTERY' && p.type !== 'RACK_PDU');
  const node = (p: PowerEquipment, depth: number) => {
    const ds = downstream(e, p.id); const also = (parents.get(p.id) ?? []).slice(1);
    return (
      <li key={p.id}>
        <span className="node">
          <strong>{p.name}</strong>
          <span className="muted small">{human(p.type)}{p.side !== 'N' ? ` · side ${p.side}` : ''}{p.ratingKw ? ` · ${fmt(p.ratingKw)} kW` : p.ratingKva ? ` · ${fmt(p.ratingKva)} kVA` : ''}{p.autonomyMin ? ` · ${p.autonomyMin} min` : ''}</span>
          {p.redundancyGroup && <span className="badge">{p.redundancyGroup}</span>}
          {ds.racks.size > 0 && <span className="muted small">feeds {ds.racks.size} racks</span>}
          {also.length > 0 && <span className="muted small">also fed by {also.map(a => e.powerEquipment.find(x => x.id === a)?.name ?? a).join(', ')}</span>}
        </span>
        {depth < 8 && children(p.id).length > 0 && <ul>{children(p.id).map(c => node(c, depth + 1))}</ul>}
      </li>
    );
  };
  const rackRows = s.racks.map(r => { const rp = rackPower(e, r); return { r, rp, a: rp.rackPdus.find(p => p.side === 'A'), b: rp.rackPdus.find(p => p.side === 'B') }; });
  return (
    <>
      <div className="grid-2">
        <Card>
          <Head title="Power path" sub="Built from PowerConnections in the upload; rack PDUs are listed per rack below" />
          {roots.length ? <ul className="ptree">{roots.map(r => node(r, 0))}</ul> : <Empty title="No power equipment uploaded" />}
        </Card>
        <Card>
          <Head title="Equipment" count={s.power.length} />
          <DataGrid<PowerEquipment> columns={[{ t: 'Name' }, { t: 'Type' }, { t: 'Side' }, { t: 'Rating', r: true }, { t: 'Location' }, { t: 'Group' }]}
            rows={s.power.filter(p => p.type !== 'RACK_PDU')} total={s.power.filter(p => p.type !== 'RACK_PDU').length} rowKey={p => p.id} searchPlaceholder="Name, type"
            renderRow={p => [<><span className="vw-value">{p.name}</span><Sub mono>{p.id}</Sub></>, human(p.type), p.side,
              p.ratingKw ? `${fmt(p.ratingKw)} kW` : p.ratingKva ? `${fmt(p.ratingKva)} kVA` : '—', s.rooms.find(r => r.id === p.roomId)?.name ?? '—', p.redundancyGroup ?? '—']} />
        </Card>
      </div>
      <Card>
        <Head title="Rack feeds" count={rackRows.length} sub="Rack PDUs and their upstream equipment, per rack" />
        <DataGrid<typeof rackRows[number]> columns={[{ t: 'Rack' }, { t: 'Room' }, { t: 'PDU A' }, { t: 'PDU B' }, { t: 'Redundancy' }, { t: 'Upstream (side A)' }]}
          rows={rackRows} total={rackRows.length} rowKey={x => x.r.id} searchPlaceholder="Rack, PDU"
          rowActions={x => [{ l: 'Open rack', onClick: () => onRack(x.r.id) }]}
          renderRow={x => [<span className="vw-value">{x.r.name}</span>, s.rooms.find(r => r.id === x.r.roomId)?.name ?? '—',
            x.a ? <>{x.a.name}<Sub>{x.a.ratingKw ? `${x.a.ratingKw} kW` : ''}</Sub></> : <span className="muted">—</span>,
            x.b ? <>{x.b.name}<Sub>{x.b.ratingKw ? `${x.b.ratingKw} kW` : ''}</Sub></> : <span className="muted">—</span>,
            <Chip tone={x.rp.redundancy === 'A+B' ? 'success' : x.rp.redundancy === 'no feed recorded' ? 'neutral' : 'warning'}>{x.rp.redundancy}</Chip>,
            <span className="small muted">{x.rp.paths.find(p => p.side === 'A')?.chain.slice(1, 4).map(p => p.name).join(' ← ') || '—'}</span>]} />
      </Card>
    </>
  );
}

function CoolingTab({ s }: { s: DcScope }) {
  return (
    <DataGrid<typeof s.cooling[number]> columns={[{ t: 'Cooling unit' }, { t: 'Type' }, { t: 'Room' }, { t: 'Capacity', r: true }, { t: 'Serves' }, { t: 'Group' }, { t: 'Status' }]}
      rows={s.cooling} total={s.cooling.length} rowKey={c => c.id} searchPlaceholder="Cooling unit, room" emptyText="No cooling equipment uploaded."
      renderRow={c => [<><span className="vw-value">{c.name}</span><Sub mono>{c.id}</Sub></>, human(c.type), s.rooms.find(r => r.id === c.roomId)?.name ?? '—', `${fmt(c.capacityKw)} kW`,
        c.servesRowIds.length ? c.servesRowIds.map(id => `row ${s.rows.find(r => r.id === id)?.name ?? id}`).join(', ') : 'whole room', c.redundancyGroup ?? '—', human(c.status)]} />
  );
}

function SensorsTab({ s }: { s: DcScope }) {
  return (
    <DataGrid<typeof s.sensors[number]> columns={[{ t: 'Sensor' }, { t: 'Kind' }, { t: 'Room' }, { t: 'Row · rack' }, { t: 'Position' }, { t: 'Thresholds' }, { t: 'Status' }]}
      rows={s.sensors} total={s.sensors.length} rowKey={x => x.id} searchPlaceholder="Sensor, room, rack" emptyText="No sensors uploaded."
      renderRow={x => [<><span className="vw-value">{x.name}</span><Sub mono>{x.id}</Sub></>, human(x.kind), s.rooms.find(r => r.id === x.roomId)?.name ?? '—',
        [x.rowId && `row ${s.rows.find(r => r.id === x.rowId)?.name}`, x.rackId && `rack ${s.racks.find(r => r.id === x.rackId)?.name}`].filter(Boolean).join(' · ') || '—',
        human(x.position), x.lowThreshold !== undefined || x.highThreshold !== undefined ? `${x.lowThreshold ?? '—'} – ${x.highThreshold ?? '—'}` : '—', human(x.status)]} />
  );
}

function FindingsTab({ s, fs, onRack }: { s: DcScope; fs: Finding[]; onRack: (id: string) => void }) {
  return (
    <DataGrid<Finding> columns={[{ t: 'Severity' }, { t: 'Finding' }, { t: 'Where' }]}
      rows={fs} total={fs.length} rowKey={f => f.id} searchPlaceholder="Finding, rack, room" emptyText="No findings — the uploaded records are consistent."
      rowActions={f => f.rackId ? [{ l: 'Open rack', onClick: () => onRack(f.rackId!) }] : []}
      renderRow={f => [<Chip tone={SEV_TONE[f.severity]}>{SEV_WORD[f.severity]}</Chip>, <><span className="vw-value">{f.title}</span>{f.detail && <Sub>{f.detail}</Sub>}</>, pathOf(s, f) || '—']} />
  );
}

function ImportsTab({ batches, onUpload }: { batches: ReturnType<typeof importHistory>; onUpload: () => void }) {
  return batches.length ? (
    <div className="stack">
      <Head title="Import history" sub="Each upload is applied as one batch; records missing from a file are kept, never deleted" right={<button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={onUpload}>Upload update</button>} />
      <table className="plain"><thead><tr><th>When</th><th>Batch</th><th>File</th><th className="num">Created</th><th className="num">Updated</th><th className="num">Unchanged</th><th className="num">Kept (not in file)</th><th className="num">Warnings</th></tr></thead><tbody>
        {batches.map(b => <tr key={b.id}><td>{new Date(b.at).toLocaleString()}</td><td><Mono>{b.id}</Mono></td><td>{b.fileName}</td><td className="num">{fmt(b.created)}</td><td className="num">{fmt(b.updated)}</td><td className="num">{fmt(b.unchanged)}</td><td className="num">{fmt(b.keptNotInFile)}</td><td className="num">{fmt(b.warnings)}</td></tr>)}
      </tbody></table>
    </div>
  ) : <Empty title="No uploads logged" actions={<button type="button" className="nst-btn nst-btn--sm nst-btn--filled" onClick={onUpload}>Upload inventory</button>} />;
}

function LinksTab({ s, data }: { s: DcScope; data: ClientData }) {
  const ids = new Set(s.devices.map(d => d.id));
  const cands = useMemo(() => candidatesFor(data.clientId).filter(c => ids.has(c.deviceId)), [data, s]); // eslint-disable-line react-hooks/exhaustive-deps
  const linked = data.links.filter(l => ids.has(l.deviceId));
  const isLinked = (deviceId: string, target: string, ref: string) => linked.some(l => l.deviceId === deviceId && l.target === target && l.ref === ref);
  const devName = (id: string) => s.devices.find(d => d.id === id)?.name ?? id;
  return (
    <div className="stack">
      <p className="vw-card-description small" style={{ margin: 0 }}>
        Uploaded devices are matched to existing Inventory › Physical Resources records by serial number or management IP, and to Discovery's devices by management IP.
        A match is only a suggestion until you link it; names alone never match, and nothing in Inventory or Discovery is changed.
      </p>
      <Head title="Suggested matches" count={cands.length} />
      {cands.length ? (
        <table className="plain"><thead><tr><th>Uploaded device</th><th>Existing record</th><th>Matched on</th><th></th></tr></thead><tbody>
          {cands.map(c => {
            const on = isLinked(c.deviceId, c.target, c.ref);
            return <tr key={`${c.deviceId}${c.target}${c.ref}`}>
              <td>{devName(c.deviceId)}<Sub mono>{c.deviceId}</Sub></td>
              <td>{c.target === 'inventory' ? 'Inventory' : 'Discovery'} · <strong>{c.label}</strong><Sub>{c.detail}</Sub></td>
              <td>{c.matchedOn === 'serial' ? 'serial number' : 'management IP'}{c.ambiguous && <span className="issue-warning small"> · several records match</span>}</td>
              <td>{on
                ? <button type="button" className="nst-btn nst-btn--xs nst-btn--ghost" onClick={() => removeLink(data.clientId, c.deviceId, c.target)}>Unlink</button>
                : <button type="button" className="nst-btn nst-btn--xs" onClick={() => confirmLink(data.clientId, { deviceId: c.deviceId, target: c.target, ref: c.ref, matchedOn: c.matchedOn, linkedAt: Date.now() })}>Link</button>}</td>
            </tr>;
          })}
        </tbody></table>
      ) : <p className="muted small">No uploaded device shares a serial number or management IP with an existing record.</p>}
      <Head title="Linked" count={linked.length} />
      {linked.length ? <KV items={linked.map(l => [devName(l.deviceId), `${l.target === 'inventory' ? 'Inventory' : 'Discovery'} ${l.ref} (by ${l.matchedOn === 'serial' ? 'serial' : 'IP'})`] as [string, string])} /> : <p className="muted small">No links yet.</p>}
    </div>
  );
}

export type { Rack };
