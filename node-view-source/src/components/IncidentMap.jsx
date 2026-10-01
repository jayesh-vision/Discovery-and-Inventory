import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { incidentTopology } from '../data.js'
import { useNodeView } from '../nodeView.jsx'
import { IcHome } from './Icons.jsx'

/**
 * One incident on the geography.
 *
 * The dialog's lists say which elements an incident names and which alarms
 * sit on them; this says where they are and what they are wired to. The
 * elements the incident names are pinned at their own coordinates and
 * coloured by the worst severity it put on them; the far ends of their links
 * are drawn too, because the question after "what is down" is "what is next
 * to it". A neighbour already carrying something of its own is coloured by
 * that, so a fault spreading along a chain is visible as a chain.
 *
 * Nothing here is placed by hand: coordinates, links and severities all come
 * off the same estate the rest of the module reads.
 */

const SEV_CLASS = { Critical: 'crit', Major: 'major', Minor: 'minor', Warning: 'warn', Info: 'info' }
const TONE = {
  Critical: 'var(--red)', Major: 'var(--amber)', Minor: 'var(--blue)',
  Warning: 'var(--purple)', Info: 'var(--slate)',
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/* Drawn for an incident (the elements it names) or for one element (itself
   and what it is wired to) — the same map either way. */
export default function IncidentMap({ id, rows, topo: given, summary }) {
  const topo = useMemo(() => given || incidentTopology(rows), [given, rows])
  const host = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const fit = useRef(() => {})
  const openNode = useNodeView()
  const [zoom, setZoom] = useState(null)
  const [show, setShow] = useState({ Neighbours: true, Links: true, Labels: true })
  const toggle = k => setShow(s => ({ ...s, [k]: !s[k] }))

  // --- The map itself, made once -----------------------------------------
  useEffect(() => {
    if (!host.current || map.current) return
    const m = L.map(host.current, { zoomControl: false, attributionControl: true, minZoom: 3, maxZoom: 16 })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    const Home = L.Control.extend({
      onAdd() {
        const b = L.DomUtil.create('button', 'gis-home gis-home--icon leaflet-bar')
        b.type = 'button'
        b.title = 'Fit the incident'
        b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/></svg>'
        L.DomEvent.disableClickPropagation(b)
        L.DomEvent.on(b, 'click', () => fit.current())
        return b
      },
    })
    new Home({ position: 'bottomright' }).addTo(m)
    m.attributionControl.setPosition('bottomleft')
    m.on('zoomend', () => setZoom(m.getZoom()))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    /* The dialog animates in, so the map is measured after it has settled. */
    const t = setTimeout(() => m.invalidateSize(), 80)
    return () => { clearTimeout(t); m.remove(); map.current = null }
  }, [])

  // --- What is on it ------------------------------------------------------
  useEffect(() => {
    const m = map.current
    if (!m || !layer.current) return
    layer.current.clearLayers()
    const at = n => [n.lat, n.lng]
    const byName = new Map(topo.nodes.map(n => [n.name, n]))

    if (show.Links) {
      topo.links.forEach(l => {
        const a = byName.get(l.a), b = byName.get(l.b)
        if (!a || !b) return
        if (!show.Neighbours && (a.role === 'neighbour' || b.role === 'neighbour')) return
        /* A link either end of which is alarming is drawn as the path the
           fault can travel; everything else is context. */
        const hot = l.down || a.role === 'affected'
        L.polyline([at(a), at(b)], {
          className: 'imap-link' + (l.down ? ' is-down' : hot ? ' is-hot' : ''),
          weight: l.down ? 3 : hot ? 2.5 : 1.6,
          interactive: true,
        }).addTo(layer.current)
          .bindTooltip(`${esc(l.a)} → ${esc(l.b)}<br>${esc(l.role)} · ${esc(l.port)}${l.down ? ' · not active' : ''}`,
            { direction: 'top', sticky: true })
      })
    }

    if (show.Neighbours) {
      topo.neighbours.forEach(n => {
        const cls = n.sev ? SEV_CLASS[n.sev] : 'clean'
        L.marker(at(n), {
          icon: L.divIcon({
            className: '', iconSize: [14, 14], iconAnchor: [7, 7],
            html: `<span class="imap-dot imap-dot--${cls}"></span>`,
          }),
          riseOnHover: true, keyboard: false,
        }).addTo(layer.current)
          .bindTooltip(`<b>${esc(n.name)}</b><br>${esc(n.kind)} · ${esc(n.vendor)} · ${esc(n.city)}<br>`
            + (n.sev ? `${esc(n.sev)} · ${n.openAlerts} open` : 'neighbour · nothing open'),
          { direction: 'top', offset: [0, -8] })
          .on('click', () => openNode(n.name))
      })
    }

    topo.affected.forEach(n => {
      const cls = n.incidentSev ? SEV_CLASS[n.incidentSev] : 'clean'
      L.marker(at(n), {
        icon: L.divIcon({
          className: '', iconSize: [18, 18], iconAnchor: [9, 9],
          html: `<span class="imap-pin imap-pin--${cls}">`
            + `<i></i>${show.Labels ? `<em>${esc(n.name)}</em>` : ''}</span>`,
        }),
        riseOnHover: true, keyboard: false, zIndexOffset: 500,
      }).addTo(layer.current)
        .bindTooltip(`<b>${esc(n.name)}</b><br>${esc(n.kind)} · ${esc(n.vendor)} · ${esc(n.city)}<br>`
          + (n.incidentSev
            ? `${esc(n.incidentSev)} · ${n.incidentAlerts} alert${n.incidentAlerts === 1 ? '' : 's'}${n.service ? ' · service-affecting' : ''}`
            : 'nothing open on it'),
        { direction: 'top', offset: [0, -10] })
        .on('click', () => openNode(n.name))
    })

    fit.current = () => {
      const pts = (show.Neighbours ? topo.nodes : topo.affected).map(at)
      if (!pts.length) return
      m.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 12, animate: false })
    }
    fit.current()
    setZoom(m.getZoom())
  }, [topo, show, openNode])

  if (!topo.affected.length) {
    return <p className="muted imap-empty">Nothing here carries coordinates, so it cannot be mapped.</p>
  }

  return (
    <div className="imap">
      <div className="imap__bar">
        <span className="imap__t">
          <b>{id}</b> · {summary || `${topo.affected.length} element${topo.affected.length === 1 ? '' : 's'} affected`}
          {' · '}{topo.neighbours.length} neighbour{topo.neighbours.length === 1 ? '' : 's'}
          {topo.neighboursAlerting > 0 && ` (${topo.neighboursAlerting} alarming)`}
          {' · '}{topo.sites.length} site{topo.sites.length === 1 ? '' : 's'}
        </span>
        <span className="imap__layers">
          {Object.keys(show).map(k => (
            <button key={k} type="button" className={show[k] ? 'on' : ''} aria-pressed={show[k]}
              onClick={() => toggle(k)}>{k}</button>
          ))}
        </span>
      </div>
      <div className="imap__canvas">
        <div ref={host} className="imap__leaflet" />
        {zoom != null && <span className="imap__zoom">Zoom level : {zoom}</span>}
      </div>
      <div className="imap__legend">
        {['Critical', 'Major', 'Minor', 'Warning'].map(s => (
          <span key={s}><i className="imap-key" style={{ background: TONE[s] }} />{s}</span>
        ))}
        <span><i className="imap-key imap-key--clean" />Neighbour, nothing open</span>
        <span><i className="imap-key imap-key--line" />Link</span>
        <span><i className="imap-key imap-key--down" />Link not active</span>
        <span className="muted">Click a marker to open its node view.</span>
      </div>
    </div>
  )
}
