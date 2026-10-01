import { useState, useEffect, useMemo } from 'react'
import { nodeDetailFor, elementTopology, NOW } from '../data.js'
import { twinFor } from '../twin.js'
import NodeTwin from './NodeTwin.jsx'
import IncidentMap from './IncidentMap.jsx'
import { IcMap } from './Icons.jsx'
import { TrafficChart, KpiWheel, AlarmTimeline, PathChain, Heatmap, Inspector } from './NodeCharts.jsx'
import { IcRack, IcConn, IcPulse, IcDevice } from './Icons.jsx'

/**
 * One network element, as an assurance twin.
 *
 * Built after the reference twins: a live identity strip, a drawing of the machine
 * itself that can be clicked into, the day's load and KPI posture, the alarm
 * timeline, the service path through the element, and a fault view that says
 * what is broken and what probably caused it.
 *
 * The drawing follows the machine. A base station is its sectors and the
 * relations around them; a ROADM is its spectrum and degrees; an OLT is the
 * tree from port to home; a router is its line cards and peers. Counted
 * figures come from nodeDetailFor(); modelled ones from twinFor(), and every
 * panel carrying a modelled reading says so on its face.
 */

const sevClass = { Critical: 'critical', Major: 'major', Minor: 'minor', Warning: 'warning', Info: 'warning' }
const statusPill = { Open: 'red', Reopen: 'amber', Closed: 'green', Acknowledged: 'blue', Resolved: 'green' }
const entityPill = { Down: 'red', Watch: 'amber', Monitor: 'blue', Healthy: 'green', Normal: 'green' }
const SEV_TONE = { Critical: 'var(--red)', Major: 'var(--amber)', Minor: 'var(--blue)', Warning: 'var(--purple)', Info: 'var(--slate)' }
const readyTone = r => r === 'Ready' ? 'green' : r === 'Unreachable' ? 'red' : r === 'Degraded' ? 'amber' : 'blue'

const SHAPE = {
  ran: { noun: 'site', l1: 'The shape of the site', intro: 'Sectors from the live cell set — lobe size follows PRB load; neighbours sit at their real bearing and distance.', icon: IcConn },
  dwdm: { noun: 'line system', l1: 'The spectrum and the line it rides', intro: 'Every lit C-band wavelength with its OSNR, and the ROADM degrees, amplifiers and spans it leaves on.', icon: IcPulse },
  pon: { noun: 'access tree', l1: 'From the OLT to every home', intro: 'Each PON port, its feeder, the 1:32 splitter and one dot per home — a whole row red is a feeder fault.', icon: IcDevice },
  ip: { noun: 'chassis', l1: 'The chassis and what it carries', intro: 'Line cards with a LED per port, the fabric, and every link out — width follows throughput.', icon: IcRack },
}

function Sec({ tag, title, intro, right, children }) {
  return (
    <section className="nv-sec">
      <div className="nv-sec__h">
        <span className="nv-sec__tag">{tag}</span>
        <div className="nv-sec__txt">
          <h3>{title}</h3>
          {intro && <p title={typeof intro === 'string' ? intro : undefined}>{intro}</p>}
        </div>
        {right && <div className="nv-sec__r">{right}</div>}
      </div>
      {children}
    </section>
  )
}

function Panel({ title, sub, span = 12, prov, flush, children }) {
  return (
    <div className={'nv-panel nv-span' + span + (flush ? ' is-flush' : '')}>
      <div className="nv-panel__h">
        <h4>{title}</h4>
        {sub && <span className="nv-panel__sub">{sub}</span>}
        {prov && <span className={'nv-prov' + (prov === 'counted' ? '' : ' nv-prov--model')}>{prov}</span>}
      </div>
      <div className="nv-panel__b">{children}</div>
    </div>
  )
}

function Bars({ rows, unit = '' }) {
  const max = Math.max(...rows.map(r => r.value || 0), 1)
  return (
    <div className="nv-bars">
      {rows.map(r => {
        const isDown = r.sub && (r.sub.toLowerCase().includes('down') || r.sub.toLowerCase().includes('loss') || r.sub.toLowerCase().includes('fail'));
        const isWarn = r.sub && (r.sub.toLowerCase().includes('warn') || r.sub.toLowerCase().includes('deg'));
        const subTone = isDown ? 'red' : isWarn ? 'amber' : 'green';
        return (
          <div className="nv-bars__r" key={r.label} title={r.title || `${r.label}: ${r.value}${unit}`}>
            <span className="nv-bars__l">{r.label}</span>
            <span className="nv-bars__t">
              <i style={{ width: `${Math.round(((r.value || 0) / max) * 100)}%`, background: r.tone || 'var(--blue)' }} />
            </span>
            <span className="nv-bars__v">{r.display ?? r.value}{unit}</span>
            {r.sub && <span className={`nv-bars__s nv-bars__s--${subTone}`}>{r.sub}</span>}
          </div>
        )
      })}
    </div>
  )
}

/* Lower-case a noun for running text, but leave an acronym (PON port) alone. */
const nounOf = k => (/^[A-Z]{2}/.test(k) ? k : k.charAt(0).toLowerCase() + k.slice(1))

function resolveNodeTab(activeTab, t) {
  if (!activeTab) return 'Overview';
  const k = String(activeTab).toLowerCase().trim();
  if (k === 'overview') return 'Overview';
  if (k === 'hardware') return 'Hardware';
  if (k === 'links' || k === 'topology' || k === 'service path' || k === 'path' || k === 'network links') return 'Service path';
  if (k === 'services' || k === 'channels' || k === 'config' || k === 'configurations' || k === 'peers' || k === 'ports' || k === 'mobility' || k === 'sectors' || k === 'units' || (t && k === t.tabTitle.toLowerCase())) {
    return t ? t.tabTitle : 'Overview';
  }
  if (k === 'alerts' || k === 'faults' || k === 'alarms' || k === 'faults & diagnostics' || k === 'alarms & incidents' || k === 'alerts & diagnostics') {
    return 'Alerts';
  }
  if (k === 'performance' || k === 'perf') return 'Performance';
  if (k === 'amplifiers') return 'Hardware';
  return 'Overview';
}

export default function NodeDetails({ node, external = null, onClose, isDirectPage = false, isEmbedded = false, activeTab = null }) {
  const d = useMemo(() => nodeDetailFor(node, external), [node, external])
  const t = useMemo(() => (d ? twinFor(d) : null), [d])
  const [tab, setTab] = useState(() => resolveNodeTab(activeTab, t) || 'Overview')
  const [pick, setPick] = useState(null)
  const [alertId, setAlertId] = useState(null)
  /* The twin says what the element is; the map says where it is. */
  const [onMap, setOnMap] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (activeTab) {
      const resolved = resolveNodeTab(activeTab, t);
      if (resolved) setTab(resolved);
    }
  }, [activeTab, t]);

  useEffect(() => {
    if (isEmbedded) {
      const iv = setInterval(() => setTick(n => n + 1), 1000)
      return () => clearInterval(iv)
    }
    /* Opened from inside a drawer or a dialog, Escape closes this view and
       leaves the one beneath it open — so it listens first and stops there. */
    const onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose && onClose() } }
    window.addEventListener('keydown', onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const iv = setInterval(() => setTick(n => n + 1), 1000)
    return () => { window.removeEventListener('keydown', onKey, true); document.body.style.overflow = prevOverflow; clearInterval(iv) }
  }, [onClose, isEmbedded])

  if (!d || !t) return null
  const { identity: id, counts, facts, env, adjacency } = d
  const shape = useMemo(() => {
    if (t.flavour === 'dwdm') {
      return {
        noun: 'line system',
        l1: 'DWDM optical spectrum & ROADM line system',
        intro: 'Every lit C-band wavelength with its OSNR, and ROADM CDC degrees, amplifiers, and optical spans.',
        icon: IcPulse
      }
    }
    if (t.flavour === 'ran') {
      const is5g = d.ne.kind === 'gNodeB'
      return {
        noun: is5g ? '5G site' : '4G site',
        l1: is5g ? '5G NR cell sectors and beamforming' : '4G LTE cell sectors and RF coverage',
        intro: is5g
          ? '5G NR massive-MIMO carriers (n78, n41, n28) — lobe size follows PRB load; active beamforming and neighbouring cells.'
          : 'LTE sectors (L1800, L2300, L900) — lobe size follows PRB load; active MIMO antennas and neighbouring towers.',
        icon: IcConn
      }
    }
    if (t.flavour === 'ip') {
      const isSwitch = d.ne.kind === 'Aggregation SW'
      return {
        noun: isSwitch ? 'switch' : 'router',
        l1: isSwitch ? 'Switch chassis and port fabric' : 'Core router chassis and routing peers',
        intro: isSwitch
          ? 'Switching modules with active port LEDs, switch fabric, and uplinks — width follows throughput.'
          : 'Line cards with active port LEDs, switch fabric, and core peering links — width follows throughput.',
        icon: IcRack
      }
    }
    return SHAPE[t.flavour] || SHAPE.ip
  }, [t.flavour, d.ne.kind])
  const Glyph = shape.icon
  const picked = pick && t.inspect[pick] ? pick : t.defaultPick
  const allRows = [...d.alerts, ...d.history.slice(0, 12)]
  const focus = allRows.find(a => a.id === alertId) || d.alerts[0] || d.history[0]
  const openAlert = aid => { setAlertId(aid); setTab('Alerts') }

  /* What each tab holds is stated inside it, so the strip stays a list of
     places to go rather than a row of numbers. */
  const tabs = ['Overview', t.tabTitle, 'Hardware', 'Service path', 'Alerts', 'Performance']
  /* Families breaching in the last hour they reported — the wheel's outer
     edge, said in words. */
  const breaching = t.kpis.slice(0, 5).filter(k => { const i = k.states.map(x => x !== 5).lastIndexOf(true); return i >= 0 && k.states[i] === 4 })
  const shownCleared = Math.min(12, d.history.length)
  const staleNote = t.stale
    ? `Readings as of the last PM at ${clockOf(NOW - t.stale.lastPmMins * 60000).slice(0, 5)} — the element has not answered since.` : null
  const sevLine = ['Critical', 'Major', 'Minor', 'Warning', 'Info']
    .map(k => [k, d.alerts.filter(a => a.sev === k).length])
    .filter(([k, n]) => n || k !== 'Info')
    .map(([k, n]) => `${n} ${k.toLowerCase()}`).join(' · ')

  const topo = useMemo(() => {
    const base = elementTopology(typeof node === 'string' ? node : node?.name || id.name)
    if (base && base.affected && base.affected.length) return base

    const affectedNode = {
      name: id.name,
      lat: id.lat || 28.6139,
      lng: id.lng || 77.2090,
      city: id.city || 'Unknown',
      region: id.region || 'North',
      kind: id.equipType || id.kind || 'Device',
      domain: id.domain || 'Transport',
      vendor: id.vendor || 'Cisco',
      role: 'affected',
      incidentAlerts: counts?.active || 0,
      incidentSev: counts?.Critical ? 'Critical' : counts?.Major ? 'Major' : 'Info',
      openAlerts: counts?.active || 0,
      sev: counts?.Critical ? 'Critical' : counts?.Major ? 'Major' : 'Info',
      service: false
    }

    const nodes = [affectedNode]
    const neighbours = []
    const topoLinks = []

    const linkList = d.links || []
    linkList.forEach((l, idx) => {
      const zName = l.nodeZ || `NE-${idx + 1}`
      const nNode = {
        name: zName,
        lat: (id.lat || 28.6139) + Math.sin(idx + 1.2) * 0.45,
        lng: (id.lng || 77.2090) + Math.cos(idx + 1.2) * 0.45,
        city: id.city || 'Unknown',
        region: id.region || 'North',
        kind: 'Neighbour',
        domain: id.domain || 'Transport',
        vendor: 'Network',
        role: 'neighbour',
        openAlerts: 0,
        sev: null
      }
      nodes.push(nNode)
      neighbours.push(nNode)
      topoLinks.push({
        a: id.name,
        b: nNode.name,
        role: l.role || 'uplink',
        port: l.portA || 'Eth1',
        down: l.status !== 'Active'
      })
    })

    return {
      nodes,
      links: topoLinks,
      affected: [affectedNode],
      neighbours,
      neighboursAlerting: 0,
      sites: [{ id: 'site-1', name: id.city, count: 1, lat: id.lat, lng: id.lng }]
    }
  }, [node, id, counts, d])

  return (
    <>
      {!isDirectPage && !isEmbedded && <div className="scrim nv-scrim" onClick={onClose} />}
      <div
        className={`nodal nv ${isDirectPage ? 'is-direct-page' : ''} ${isEmbedded ? 'is-embedded' : ''}`}
        role={isDirectPage || isEmbedded ? 'region' : 'dialog'}
        aria-label={`Node view for ${node}`}
        data-theme={isEmbedded ? "light" : "dark"}
      >
        {!isEmbedded && (
          <div className="nodal__h">
            <nav className="nv-crumb" aria-label="Breadcrumb">
              <span>Inventory</span><span>{id.domain}</span><span>{id.region}</span><span>{id.city}</span><b>{id.name}</b>
            </nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isDirectPage && (
                <button
                  type="button"
                  className="chip-btn nv-direct-back-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)'
                  }}
                  onClick={onClose}
                  title="Back to previous screen"
                >
                  ← Back
                </button>
              )}
              {onClose && <button className="d-close" onClick={onClose} aria-label="Close">×</button>}
            </div>
          </div>
        )}

        <div className="nodal__b">
          {!isEmbedded && (
            <>
              <header className="nv-id">
                <div className="nv-id__main">
                  <span className={'nv-id__i nv-id__i--' + t.flavour}><Glyph size={22} /></span>
                  <div className="nv-id__txt">
                    <h3>{id.name} <span>· {id.city} {id.equipType}</span></h3>
                    <div className="nv-id__meta mono">
                      {id.lat.toFixed(4)} N, {id.lng.toFixed(4)} E · {id.model} · {id.mgmtIp} · {id.tech} · {id.ems}
                    </div>
                  </div>
                </div>
                <div className="nv-id__live">
                  {t.stale
                    ? <span className="nv-live is-stale"><i />No PM since {clockOf(NOW - t.stale.lastPmMins * 60000).slice(0, 5)}</span>
                    : <span className="nv-live"><i />PM 15 min · {clockOf(NOW + tick * 1000)}</span>}
                  <span className={'pill ' + readyTone(id.ready)}>{id.ready === 'Ready' ? 'In service' : id.ready}</span>
                  <span className={'pill ' + (counts.active ? (counts.Critical ? 'red' : 'amber') : 'green')}>
                    {counts.active ? `${counts.active} alarm${counts.active === 1 ? '' : 's'}` : 'No alarms'}
                  </span>
                  <span className="tag mono">{id.software}</span>
                </div>
                <dl className="nv-facts">
                  <div><dt>Vendor</dt><dd>{id.vendor}</dd></div>
                  <div><dt>Serial</dt><dd className="mono">{facts.serial}</dd></div>
                  <div><dt>Position</dt><dd>{facts.rack}</dd></div>
                  <div><dt>Uptime</dt><dd>{facts.uptime}</dd></div>
                  <div><dt>Comms</dt><dd className={facts.comms === 'Available' ? '' : 'vw-text-error'}>{facts.comms}</dd></div>
                  <div><dt>NTP</dt><dd className={facts.ntp === 'In sync' ? '' : 'vw-text-error'}>{facts.ntp}</dd></div>
                  <div><dt>Last reboot</dt><dd>{facts.lastReboot}</dd></div>
                  <div><dt>Maintenance</dt><dd>{facts.window}</dd></div>
                </dl>
              </header>

              <div className="nv-tabs" role="tablist">
                {tabs.map(x => (
                  <button key={x} role="tab" aria-selected={tab === x}
                    className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>{x}</button>
                ))}
              </div>
            </>
          )}

          {/* ── Overview ─────────────────────────────────────────────────── */}
          {tab === 'Overview' && (<>
            <Sec tag="Twin" title={shape.l1} intro={shape.intro}
              right={(
                <button
                  type="button"
                  className={'inc-mapbtn' + (onMap ? ' is-on' : '')}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOnMap(v => !v);
                  }}
                >
                  <IcMap size={16} />{onMap ? 'Back to the twin' : 'Show on map'}
                </button>
              )}>
              {onMap ? (
                <IncidentMap id={id.name} topo={topo}
                  summary={`${id.equipType} · ${id.city}${counts.active ? ` · ${counts.active} alarm${counts.active === 1 ? '' : 's'} open` : ' · nothing open'}`} />
              ) : (
                <div className="nv-grid">
                  <div className="nv-span8"><NodeTwin t={t} pick={picked} onPick={setPick} /></div>
                  <Panel span={4} title="Inspector" sub={t.inspect[picked] ? t.inspect[picked].kind.toLowerCase() : ''} prov="modelled">
                    <Inspector item={t.inspect[picked]} note={staleNote} />
                  </Panel>
                </div>
              )}
            </Sec>
          </>)}

          {/* ── Flavour tab ──────────────────────────────────────────────── */}
          {tab === t.tabTitle && (<>
            <Sec tag="Units" title={t.tabTitle} intro={`Every ${nounOf(t.unitNoun)} the twin draws, as a table — select a row to inspect it.`}>
              <div className="nv-grid">
                <Panel span={8} title={`${t.unitNoun}s`} sub={`${t.units.length} shown`} prov="modelled" flush>
                  <div className="table-wrap">
                    <table className="tbl tbl--plain">
                      <thead><tr>{t.unitsHead.map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {t.units.map(u => (
                          <tr key={u.id} className={u.id === picked ? 'is-picked' : ''} style={{ cursor: 'pointer' }} onClick={() => setPick(u.id)}>
                            {u.cells.map((c, i) => <td key={i} className={i === 0 ? 'name' : ''}>{c}</td>)}
                            <td><span className={'pill ' + u.tone}>{u.state}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <Panel span={4} title="Inspector" prov="modelled"><Inspector item={t.inspect[picked]} note={staleNote} /></Panel>
              </div>
            </Sec>
            <Sec tag="Readings" title={`What each ${nounOf(t.unitNoun)} reports`} intro="The element's own readings, as it reports them — a flagged row is one an open alarm names.">
              <div className="nv-grid">
                <Panel span={t.countedDuplicate ? 12 : 5} title={`Monitored ${nounOf(d.entityTitle)}`} sub={d.entityHead[2]} prov="counted">
                  {/* An entity with no reading stays on the chart as an empty
                      bar — dropping it would hide the one that is down. */}
                  <Bars rows={d.entities.map(e => ({
                    label: e.id, value: Number.isNaN(parseFloat(e.m1)) ? 0 : parseFloat(e.m1), display: e.m1 === '—' ? 'no reading' : e.m1,
                    tone: e.flag ? SEV_TONE[e.flag.sev] : 'var(--blue)',
                    sub: e.flag ? `${e.flag.label} · ${e.status}` : e.status,
                  }))} />
                </Panel>
                {!t.countedDuplicate && <Panel span={7} title={d.entityTitle} sub="as the element reports them" prov="counted" flush>
                  <div className="table-wrap">
                    <table className="tbl tbl--plain">
                      <thead><tr>{d.entityHead.map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {d.entities.map(e => (
                          <tr key={e.id}>
                            <td className="name">{e.id}</td><td>{e.slot}</td>
                            <td>{e.m1}</td><td>{e.m2}</td><td>{e.m3}</td><td>{e.m4}</td>
                            <td><span className={'pill ' + (entityPill[e.status] || 'slate')}>{e.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>}
              </div>
            </Sec>
          </>)}

          {/* ── Hardware ─────────────────────────────────────────────────── */}
          {tab === 'Hardware' && (<>
            <Sec tag="Hardware" title={`${id.groupNoun} and what is in them`}
              intro="The card fitted in each slot — a tinted slot is one an open alarm on this element names.">
              <div className="nv-grid">
                <Panel span={8} title="Digital twin" sub={`${d.modules.length} cards · ${d.footer.flagged} flagged`} prov="modelled layout · flags counted">
                  <div className="nv-shelves">
                    {d.groups.map(g => (
                      <div className="nv-shelf" key={g.title}>
                        <div className="nv-shelf__h">{g.title}</div>
                        <div className="nv-shelf__slots">
                          {g.rows.map(r => (
                            <div key={r.id} className={'nv-slot' + (r.flag ? ' is-flagged' : '')}
                              style={r.flag ? { '--slot-tone': SEV_TONE[r.flag.sev] } : undefined}
                              title={r.flag ? `${r.id} · ${r.type} · ${r.flag.label}` : `${r.id} · ${r.type}`}>
                              <span className="nv-slot__led" />
                              <span className="nv-slot__id mono">{r.id}</span>
                              <span className="nv-slot__t">{r.type}</span>
                              {r.flag && <span className="nv-slot__f">{r.flag.label}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel span={4} title="Power, cooling and load" sub={`${env.temp} °C`} prov="modelled · except temperature">
                  <Bars rows={[
                    { label: 'CPU', value: env.cpu, display: `${env.cpu} %`, tone: env.cpu > 85 ? 'var(--red)' : 'var(--blue)' },
                    { label: 'Memory', value: env.mem, display: `${env.mem} %`, tone: env.mem > 85 ? 'var(--red)' : 'var(--blue)' },
                    { label: 'Temperature', value: env.temp, display: `${env.temp} °C`, tone: env.temp > env.tempCap ? 'var(--red)' : 'var(--green)' },
                    ...env.psu.map(p => ({ label: p.id, value: p.load, display: p.state === 'Failed' ? 'failed' : `${p.load} %`, tone: p.state === 'Failed' ? 'var(--red)' : 'var(--green)' })),
                  ]} />
                  <div className="nv-fans">
                    {env.fans.map(f => (
                      <div key={f.id} className="nv-fan" title={`${f.id} · ${f.rpm} rpm`}>
                        <svg viewBox="0 0 24 24" width="26" height="26" style={{ animationDuration: `${(8000 / f.rpm).toFixed(2)}s` }}>
                          <circle cx="12" cy="12" r="10.5" fill="none" style={{ stroke: 'var(--border-strong)' }} />
                          {[0, 120, 240].map(a => <path key={a} d="M12 12 C 13 6, 17 5, 18 8 C 17 10, 14 11, 12 12Z" transform={`rotate(${a} 12 12)`} style={{ fill: 'var(--blue)' }} />)}
                        </svg>
                        <span>{f.id}</span><b>{f.rpm}</b>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel span={d.amps.length ? 7 : 12} title="Pluggable optics" sub={`${d.ports.length} in service`} prov="counted" flush>
                  <div className="table-wrap">
                    <table className="tbl tbl--plain">
                      <thead><tr><th>Port</th><th>Optic</th><th>Wavelength / rate</th><th>Serial</th><th>Installed</th></tr></thead>
                      <tbody>
                        {d.ports.map(p => (
                          <tr key={p.port}><td className="name">{p.port}</td><td>{p.optic}</td><td>{p.wavelength}</td><td className="mono">{p.serial}</td><td>{p.installed}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                {d.amps.length > 0 && (
                  <Panel span={5} title="Amplifiers" sub="line system" prov="modelled" flush>
                    <div className="table-wrap">
                      <table className="tbl tbl--plain">
                        <thead><tr><th>Stage</th><th>Gain</th><th>Output</th><th>Pump</th></tr></thead>
                        <tbody>
                          {d.amps.map(a => (
                            <tr key={a.label}><td className="name">{a.label}<div className="sub">{a.type}</div></td><td>{a.gain}</td><td>{a.power}</td><td>{a.pump}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                )}
              </div>
            </Sec>
          </>)}

          {/* ── Service path ─────────────────────────────────────────────── */}
          {tab === 'Service path' && (<>
            <Sec tag="Path" title={t.path.title}
              intro="Every hop the service crosses and its headroom — particles follow load; the strip splits the budget.">
              <Panel title="Service chain" sub="live · 15 min" prov="modelled"><PathChain path={t.path} /></Panel>
            </Sec>
            <Sec tag="Topology" title="What sits next to this element"
              intro="Links out of the element and the neighbours behind them, ranked by how much rides on each.">
              <div className="nv-grid">
                <Panel span={7} title="Links" sub={`${d.links.filter(l => l.status === 'Active').length} of ${d.links.length} active`} prov="counted" flush>
                  <div className="table-wrap">
                    <table className="tbl tbl--plain">
                      <thead><tr><th>Role</th><th>Local port</th><th>Far-end element</th><th>Far-end port</th><th>Site</th><th>State</th></tr></thead>
                      <tbody>
                        {d.links.map((l, i) => (
                          <tr key={i}>
                            <td>{l.role}</td><td className="mono">{l.portA}</td><td className="name">{l.nodeZ}</td><td className="mono">{l.portZ}</td><td>{l.site}</td>
                            <td>{l.status === 'Active' ? <span className="pill green">Active</span> : <span className={'sev ' + (sevClass[l.status] || 'warning')}>{l.status}</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <Panel span={5} title="Adjacency" sub="circuits per neighbour" prov="modelled">
                  <Bars rows={adjacency.map(a => ({
                    label: a.name, value: a.circuits, display: a.circuits,
                    tone: a.down ? 'var(--red)' : 'var(--blue)',
                    sub: a.down ? `${a.down} not up · ${a.role}` : `all up · ${a.role}`,
                  }))} />
                </Panel>
                <Panel span={12} title="Incidents naming this element" sub={`${d.incidents.length}`} prov="counted" flush>
                  {d.incidents.length === 0
                    ? <p className="muted nk-empty">This element is not named in any incident.</p>
                    : (
                      <div className="table-wrap">
                        <table className="tbl tbl--plain">
                          <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Title</th><th>On this element</th><th>Owner</th><th>Raised</th></tr></thead>
                          <tbody>
                            {d.incidents.map(i => (
                              <tr key={i.id}>
                                <td className="mono">{i.id}</td>
                                <td><span className={'sev ' + (sevClass[i.sev] || 'warning')}>{i.sev}</span></td>
                                <td><span className={'pill ' + (statusPill[i.status] || 'slate')}>{i.status}</span></td>
                                <td>{i.title}</td><td>{i.onNode} of {i.total}</td><td>{i.owner}</td><td>{i.created}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </Panel>
              </div>
            </Sec>
          </>)}

          {/* ── Performance ──────────────────────────────────────────────── */}
          {tab === 'Performance' && (<>
            <Sec tag="Load" title="Where the traffic went"
              intro="Twenty-four hours on one axis — the element total stacked above, each series against its ceiling below.">
              <div className="nv-grid">
                <Panel span={7} title={`${t.traffic.upper.title} · ${t.traffic.lower.title}`} sub="24 h · hourly" prov="modelled">
                  <TrafficChart traffic={t.traffic} />
                </Panel>
                <Panel span={5} title="24-hour KPI wheel" sub="5 families × 24 h" prov="modelled">
                  <KpiWheel kpis={t.kpis} />
                </Panel>
              </div>
            </Sec>

            <Sec tag="Pattern" title="When the element is busy" intro="Four weeks folded onto one week — a column lit every day is demand; a single hot cell is an event.">
              <Panel title={t.heatTitle} sub={t.heatUnit} prov="modelled"><Heatmap heat={t.heat} unit={t.heatUnit} /></Panel>
            </Sec>

          </>)}

          {/* ── Faults ───────────────────────────────────────────────────── */}
          {(tab === 'Alerts' || tab === 'Faults & diagnostics') && (<>
            <Sec tag="Fault" title="What is broken, and what caused it"
              intro={counts.active
                ? `${counts.active + d.history.length} events on record here and ${counts.active} still stand. ${t.inference[0].title}.`
                : 'Nothing is open. The events below are what this element raised and cleared.'}
>
              <div className="nv-grid">
                <Panel span={7} title="Active alerts & events" sub={`${counts.active} active · ${shownCleared} most recent cleared`} prov="counted">
                  {allRows.length === 0
                    ? <p className="muted nk-empty">Nothing raised on this element.</p>
                    : (
                      <ul className="nf-list">
                        {allRows.map(a => {
                          const live = a.status !== 'Closed'
                          return (
                            <li key={a.id}>
                              <button className={'nf-row' + (focus && focus.id === a.id ? ' is-on' : '') + (live ? '' : ' is-cleared')}
                                style={{ '--nf-tone': SEV_TONE[a.sev] }} onClick={() => setAlertId(a.id)}>
                                <span className="nf-row__main">
                                  <b>{a.name}</b>
                                  <span className="mono">{a.code} · {a.location}</span>
                                </span>
                                <span className="nf-row__r">
                                  {live ? <span className={'sev ' + (sevClass[a.sev] || 'warning')}>{a.sev}</span> : <span className="pill slate">Cleared</span>}
                                  <span className="mono">{live ? a.aging : a.close}</span>
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                </Panel>
                <div className="nv-span5 nv-stack">
                  {focus && (
                    <Panel title="Event detail" sub={`${focus.code} · raised ${focus.start.slice(-5)}`} prov="counted">
                      <div className="nf-detail">
                        <div className="nf-detail__h">
                          <h4>{focus.name}</h4>
                          {focus.status !== 'Closed'
                            ? <span className={'sev ' + (sevClass[focus.sev] || 'warning')}>{focus.sev}</span>
                            : <span className="pill slate">Cleared</span>}
                        </div>
                        <div className="mono nf-detail__c">{focus.equip} · {focus.location}</div>
                        {focus.desc && <p>{focus.desc}</p>}
                        <dl className="nk-insp__rows">
                          <div><dt>Impact</dt><dd>{focus.cls}{focus.service === 'Yes' ? ' · service affecting' : ''}</dd></div>
                          <div><dt>Raised</dt><dd>{focus.start}</dd></div>
                          <div><dt>{focus.status === 'Closed' ? 'Cleared' : 'Open for'}</dt><dd>{focus.status === 'Closed' ? focus.close : focus.aging}</dd></div>
                          <div><dt>Occurrences</dt><dd>{focus.occ}</dd></div>
                          <div><dt>Incident</dt><dd className="mono">{focus.incident && focus.incident !== '-' ? focus.incident : '—'}</dd></div>
                          {focus.cause && <div><dt>Probable cause</dt><dd>{focus.cause}</dd></div>}
                        </dl>
                      </div>
                    </Panel>
                  )}
                  <Panel title="Root-cause inference" sub="model-derived · not a measurement" prov="modelled">
                    <div className="nf-inf">
                      {t.inference.map(x => (
                        <article key={x.title} className={'nf-inf__c nf-inf__c--' + x.tone}>
                          <h5>{x.title}</h5>
                          <p>{x.body}</p>
                          <div className="nf-inf__a"><b>Next step</b> {x.action}</div>
                          <div className="nf-inf__e mono">
                            {x.confidence != null && <span className="nf-conf"><i style={{ width: `${x.confidence * 100}%` }} /></span>}
                            {x.confidence != null ? `confidence ${x.confidence.toFixed(2)} · ` : ''}{x.evidence}
                          </div>
                        </article>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            </Sec>
            <Sec tag="State" title="What is open right now"
              intro={counts.active
                ? `${counts.active} alarm${counts.active === 1 ? '' : 's'} stand${counts.active === 1 ? 's' : ''} on this element${breaching.length ? `, and ${breaching.map(k => k.label.toLowerCase()).join(', ')} ${breaching.length === 1 ? 'is' : 'are'} breaching target` : ''}. ${t.inference[0].title}.`
                : 'Nothing is open on this element. The timeline below is what it raised and cleared.'}
              right={<span className="nv-sec__count">{sevLine}</span>}>
              <Panel title="Alarm timeline" sub={`every event raised in the last ${t.timeline.label}, by severity`} prov="counted">
                <AlarmTimeline timeline={t.timeline} onOpen={openAlert} />
              </Panel>
            </Sec>

          </>)}
        </div>
      </div>
    </>
  )
}
