import { networkElements, trendLabels, ageMinsOf } from './data.js'

/**
 * The assurance twin for one element — the modelled half of the node view.
 *
 * nodeDetailFor() owns everything counted: the element's alerts, its flags,
 * its links and its inventory. This file owns the readings a live element
 * would stream and this demo cannot: sector load, channel OSNR, ONT receive
 * power, interface throughput. Every one is seeded from the element's name,
 * so it is stable across reloads, and every one is bent by the element's own
 * open alarms — only by the alarms that could cause each reading — so the
 * modelled half never contradicts the counted half. An element that has
 * stopped answering stops reporting here too.
 *
 * Four shapes, because a base station, a ROADM, an OLT and a router are not
 * the same machine and a single template drawn over all four is invention.
 */

const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0x7a11)
function rng(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const r0 = v => Math.round(v)
const r1 = v => Math.round(v * 10) / 10
const r2 = v => Math.round(v * 100) / 100
const fmt = (v, dec) => v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export const flavourOf = kind =>
  kind === 'eNodeB' || kind === 'gNodeB' ? 'ran'
    : kind === 'DWDM node' ? 'dwdm'
      : kind === 'OLT' ? 'pon' : 'ip'

export const HOURS = trendLabels                       // 24 labels, oldest first, last is now
const hourOfDay = i => (10 + i) % 24
/* Carried load over a day: a trough before dawn, a shoulder through office
   hours and a peak in the evening. Every traffic series rides this curve. */
const diurnal = i => {
  const h = hourOfDay(i)
  return 0.28 + 0.72 * Math.pow(0.5 - 0.5 * Math.cos(((h - 4) / 24) * 2 * Math.PI), 1.35)
}

/* The hour an open alarm landed in, as an index into HOURS. Readings after
   it carry the fault; readings before it do not. */
const hourIndexOf = mins => clamp(23 - Math.floor(mins / 60), 0, 23)

/* A reading the element could not report. Kept distinct from zero: an
   unreachable router carried unknown traffic, not none. */
export const STATE_NAMES = ['met', 'close', 'watch', 'degraded', 'breached', 'no data']
const toneOfScore = s => (s >= 85 ? 'green' : s >= 60 ? 'amber' : 'red')
const lastOf = series => { for (let i = series.length - 1; i >= 0; i--) if (series[i] != null) return i; return -1 }

/* Which alarms bear on which readings. A temperature alarm does not move
   Q-factor, and a licence warning does not move anything — so each headline
   reading is bent only by the families that could actually cause it. */
const FAMILY = {
  signal: ['Loss of Signal', 'Optical Power Low', 'Link Down', 'Card Failure'],
  routing: ['BGP Peer Down', 'OSPF Nbr State Change', 'Ospf Nbr State Change', 'ISIS Adjacency Change Down',
    'SNMP Trap OSPFNbrState', 'Mpls L3 Vpn Vrf Down'],
  load: ['CPU Utilisation High', 'Packet Discard Rate'],
  power: ['Power Supply Fault', 'Node Down'],
  thermal: ['High Temperature'],
  timing: ['Clock Drift'],
}
const SEV_WEIGHT = { Critical: 0.45, Major: 0.25, Minor: 0.1, Warning: 0.04, Info: 0 }

function pressureOf(rows) {
  if (!rows.length) return { stress: 0, from: 24, rows }
  return {
    stress: clamp(rows.reduce((a, x) => a + (SEV_WEIGHT[x.sev] || 0), 0), 0, 1),
    from: hourIndexOf(Math.max(...rows.map(ageMinsOf))),
    rows,
  }
}

/* A headline reading. Score is how far the value sits from its target, in
   units of `span` — derived from the value, never drawn beside it. `cause`
   names the open alarms that bend it, so the inference can say whether a
   shortfall has an explanation. */
function card({ key, label, unit, dec, series, target, dir, span, cause = [] }) {
  const li = lastOf(series)
  const value = li < 0 ? null : series[li]
  const prevI = (() => { for (let i = li - 4; i >= 0; i--) if (series[i] != null) return i; return -1 })()
  const prev = prevI < 0 ? value : series[prevI]
  const sign = dir === '≥' ? 1 : -1
  const margin = value == null ? 0 : (value - target) * sign
  const score = value == null ? 0 : clamp(r0(85 + (margin / span) * 15), 3, 99)
  const delta = value == null ? 0 : value - prev
  const flat = Math.abs(delta) < Math.pow(10, -dec) / 2
  const states = series.map(v => {
    if (v == null) return 5
    const m = (v - target) * sign
    return m >= span * 0.5 ? 0 : m >= span * 0.15 ? 1 : m >= 0 ? 2 : m >= -span * 0.5 ? 3 : 4
  })
  return {
    key, label, unit, dec, series, target, dir, cause,
    value, display: value == null ? '—' : fmt(value, dec), targetDisplay: fmt(target, dec),
    delta, deltaDisplay: flat ? 'no change' : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta), dec)}`,
    better: flat ? null : dir === '≥' ? delta >= 0 : delta <= 0,
    score, tone: value == null ? 'red' : toneOfScore(score), states,
  }
}

/* A value that walks around its base on the diurnal curve, then — from the
   hour the alarms bending it landed — moves by `hit`. */
function walk(rnd, base, amp, { diurnalAmp = 0, p = null, hit = 0, lo = -Infinity, hi = Infinity } = {}) {
  let drift = 0
  const from = p ? p.from : 24
  return Array.from({ length: 24 }, (_, i) => {
    drift = drift * 0.6 + (rnd() - 0.5) * amp
    const shaped = base + drift + diurnalAmp * (diurnal(i) - 0.55)
    const bent = i >= from ? shaped + hit * (0.6 + 0.4 * ((i - from + 1) / Math.max(1, 24 - from))) : shaped
    return clamp(bent, lo, hi)
  })
}

const PROBABLE = {
  'Loss of Signal': ['Receive path has gone dark', 'A fibre cut or a dirty connector on the receive side is the usual cause; the far end will be raising the mirror alarm.', 'Clean and inspect the connector, then OTDR the span'],
  'Node Down': ['The element has stopped answering', 'Management reachability is gone, so no performance data has been collected since. Power at the site or the in-band uplink are the two things to rule out first.', 'Check site power, then the primary uplink'],
  'Card Failure': ['A card has failed in the chassis', 'The hardware has taken itself out of service; traffic on its ports has moved to protection if protection exists.', 'Dispatch a spare card of the same part number'],
  'Power Supply Fault': ['Running on one power feed', 'A supply or its rectifier has failed. The element is still up on the other feed but has lost its redundancy.', 'Replace the PSU before the second feed is tested'],
  'Link Down': ['A link has dropped', 'The port is down at the physical layer. The far-end port or the transmission in between failed first.', 'Compare with the far-end port state'],
  'High Temperature': ['Running hot', 'Inlet temperature is above the threshold. A fan tray or the room cooling is the likely cause, not the load.', 'Check the fan tray and the site HVAC'],
  'BGP Peer Down': ['A routing peer has gone quiet', 'The session has reset. Transport underneath or a policy change are the usual causes.', 'Check the underlying interface and recent changes'],
  'Optical Power Low': ['Light is arriving weak', 'Received power has fallen towards sensitivity. Attenuation has grown somewhere on the span.', 'Measure span loss against the commissioning record'],
  'CPU Utilisation High': ['The control plane is busy', 'Sustained CPU on the route processor. A flap storm or a process leak drives this more often than traffic does.', 'Look for a flapping neighbour'],
  'Clock Drift': ['Timing is wandering', 'The element has lost its primary timing reference and is holding over.', 'Check the GNSS antenna and the PTP grandmaster'],
  'Packet Discard Rate': ['Packets are being dropped', 'Discards on an interface usually mean a queue is full — congestion, or a policer set below the traffic it is meant to carry.', 'Compare queue depth with the interface rate'],
  'ISIS Adjacency Change Down': ['An IGP adjacency has dropped', 'The IS-IS neighbour on this link has gone down; routes through it have been withdrawn.', 'Check the link and the neighbour\'s IS-IS state'],
}
const probableOf = name => PROBABLE[name] || [
  `${name} is open`, 'The element reported this condition directly; the alert text carries the detail.', 'Work the alert from its own description',
]

const bandLabel = kind => (kind === 'gNodeB' ? ['n78', 'n41', 'n28'] : ['L1800', 'L2300', 'L900'])
const SECTOR_NAMES = ['Alpha', 'Bravo', 'Charlie']
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`

const toRad = x => (x * Math.PI) / 180
function bearingKm(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng)
  const brg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return { bearing: brg, km: 6371 * 2 * Math.asin(Math.sqrt(h)) }
}

// =========================================================================

export function twinFor(d) {
  const { ne } = d
  const flavour = flavourOf(ne.kind)
  const rnd = rng(hash(`${ne.name}:twin`))
  const open = d.alerts
  const fam = {}
  Object.entries(FAMILY).forEach(([k, names]) => { fam[k] = pressureOf(open.filter(a => names.includes(a.name))) })
  fam.outage = pressureOf(open.filter(a => a.cls === 'Outage' || a.service === 'Yes'))

  /* Unreachable means unpolled. Readings stop in the hour management was
     lost; availability, which the poller measures from outside, does not. */
  const nodeDown = open.find(a => a.name === 'Node Down')
  const staleFrom = nodeDown ? hourIndexOf(ageMinsOf(nodeDown)) : null
  const lastPmMins = nodeDown ? Math.ceil(ageMinsOf(nodeDown) / 15) * 15 : 0

  const build = { ran, dwdm, pon, ip }[flavour]
  const t = build({ d, rnd, fam, open, env: d.env, id: d.identity })

  if (staleFrom != null) {
    const cut = v => v.map((x, i) => (i >= staleFrom ? null : x))
    t.kpis = t.kpis.map(k => (k.poller ? k : card({ ...k.def, series: cut(k.def.series) })))
    ;[t.traffic.upper, t.traffic.lower].forEach(panel => panel.series.forEach(s => { s.values = cut(s.values) }))
  }

  // --- Alarm timeline, off the element's own rows -----------------------
  const events = [
    ...open.map(a => ({ a, start: ageMinsOf(a), end: null })),
    ...d.history.map(a => ({ a, start: ageMinsOf(a), end: Math.max(0, ageMinsOf(a) - (a.durationMins || 5)) })),
  ].sort((x, y) => x.start - y.start)
  const in24 = events.filter(e => e.start <= 1440 || e.end === null)
  const windowMins = in24.length >= 3 ? 1440 : 10080
  const timeline = {
    windowMins,
    label: windowMins === 1440 ? '24 h' : '7 days',
    events: events.filter(e => e.start <= windowMins || e.end === null).slice(0, 14).map(e => ({
      id: e.a.id, code: e.a.code, name: e.a.name, sev: e.a.sev,
      start: Math.min(e.start, windowMins), end: e.end, clipped: e.start > windowMins,
    })),
  }

  // --- Root-cause inference, from what is actually open -----------------
  const inference = []
  const worst = open[0]
  if (worst) {
    const [title, body, action] = probableOf(worst.name)
    /* A symptom is an alarm correlated into the same incident, not merely
       any other alarm on the element — a licence warning is not a symptom
       of a node going down. */
    const related = worst.incident && worst.incident !== '-'
      ? open.filter(a => a !== worst && a.incident === worst.incident) : []
    inference.push({
      tone: worst.sev === 'Critical' ? 'red' : worst.sev === 'Major' ? 'amber' : 'blue',
      title: related.length
        ? `${worst.name} explains ${plural(related.length, 'other alarm')} in ${worst.incident}`
        : title,
      body: `${body} ${worst.desc || ''}`.trim(),
      action,
      evidence: `alert ${worst.code} · raised ${worst.start} · ${plural(worst.occ || 1, 'occurrence')}`
        + (related.length ? ` · correlated with ${related.map(a => a.name).join(', ')}` : ''),
      confidence: r2(clamp(0.6 + (SEV_WEIGHT[worst.sev] || 0) * 0.5 + related.length * 0.05, 0, 0.95)),
    })
  }
  const measured = t.kpis.filter(k => k.value != null && !k.poller)
  const sick = [...measured].sort((a, b) => a.score - b.score)[0]
  if (sick && sick.score < 85) {
    const causes = sick.cause.map(c => c.name)
    inference.push(causes.length ? {
      tone: 'amber',
      title: `${sick.label} should recover once ${causes[0]} clears`,
      body: `${sick.label} reads ${sick.display} ${sick.unit} against a ${sick.dir} ${sick.targetDisplay} target. The shortfall starts in the hour ${causes.join(' and ')} was raised, so it is a symptom rather than a separate problem; a parameter change now would mask the recovery.`,
      action: 'Hold configuration changes until the alarm clears',
      evidence: `${sick.states.filter(x => x === 3 || x === 4).length} of 24 hours degraded or breached`,
      confidence: r2(clamp(0.55 + sick.cause.reduce((a, c) => a + (SEV_WEIGHT[c.sev] || 0), 0) * 0.4, 0, 0.9)),
    } : {
      tone: 'blue',
      title: `${sick.label} is off target with no alarm to explain it`,
      body: `${sick.label} reads ${sick.display} ${sick.unit} against a ${sick.dir} ${sick.targetDisplay} target, and nothing open on this element accounts for it. That points at demand or configuration rather than a fault.`,
      action: 'Review load and recent configuration changes',
      evidence: `${sick.states.filter(x => x === 3 || x === 4).length} of 24 hours degraded or breached`,
      confidence: null,
    })
  }
  if (!inference.length) {
    inference.push({
      tone: 'green', title: 'Nothing on this element needs a theory',
      body: 'No alarm is open and every headline reading is inside its target. The twin keeps modelling the element so a change shows up against a quiet baseline.',
      action: 'No action', evidence: `${plural(d.history.length, 'cleared alert')} on record`, confidence: null,
    })
  }

  return { flavour, ...t, timeline, inference, stale: staleFrom != null ? { from: staleFrom, lastPmMins } : null }
}

/* Every card keeps the arguments it was built from, so a stale element can
   rebuild it with the unreported hours removed. `poller` marks a reading
   taken from outside the element, which survives it going quiet. */
const kpi = (def, poller = false) => ({ ...card(def), def, poller })

// =========================================================================
//  RAN — a three-sector site, its cells, and the relations around it
// =========================================================================

function ran({ d, rnd, fam, env, id }) {
  const nr = d.ne.kind === 'gNodeB'
  const bands = bandLabel(d.ne.kind)
  const sectors = SECTOR_NAMES.map((name, i) => {
    const cells = d.entities.filter((_, j) => j % 3 === i)
    const off = cells.filter(c => c.status === 'Down')
    const flag = (cells.find(c => c.flag) || {}).flag || null
    /* A sector is off air only when every cell on it is; one cell down of
       two halves what it can carry. */
    const down = off.length === cells.length
    const share = 1 - off.length / Math.max(1, cells.length)
    const nominal = r1(clamp(38 + rnd() * 50 + (flag && !down ? 8 : 0), 5, 97))
    const prb = down ? 0 : nominal
    const sinr = down ? null : r1(4 + rnd() * 9 - (flag ? 3 : 0))
    return {
      id: `sec-${i}`, name, band: bands[i], cells, off,
      azimuth: [30, 150, 270][i] + r0((rnd() - 0.5) * 24),
      tilt: `${2 + Math.floor(rnd() * 4)}° + ${2 + Math.floor(rnd() * 5)}°e`,
      beam: 60 + Math.floor(rnd() * 3) * 5,
      prb, nominal, ulPrb: down ? 0 : r1(prb * (0.35 + rnd() * 0.2)),
      rrc: down ? 0 : r0(((nr ? 180 : 260) + rnd() * 380 + prb * 3) * share),
      sinr, rtwp: r1(-104 + rnd() * 8 + (flag ? 5 : 0)),
      power: r1(40 + rnd() * 6), mimo: nr ? '8T8R' : '4T4R',
      pci: 10 + Math.floor(rnd() * 480),
      dlMbps: down ? 0 : r1((nr ? 180 : 28) + rnd() * (nr ? 160 : 22) - (flag ? (nr ? 60 : 8) : 0)),
      setup: down ? null : r2(clamp(99.6 - (flag ? 1.8 : 0) - rnd() * 0.6, 90, 99.99)),
      flag, down, share,
      state: down ? 'Off air' : off.length ? 'Partly off air' : flag ? 'Degraded' : prb > 85 ? 'Congested' : 'On air',
    }
  })

  /* Neighbours are the RAN elements actually nearest this one, at their real
     bearing and distance. Handovers leave from the nearest sector that is on
     air — an off-air sector hands nothing over. */
  const onAir = sectors.filter(s => !s.down)
  const peers = networkElements
    .filter(n => n.name !== d.ne.name && (n.kind === 'eNodeB' || n.kind === 'gNodeB'))
    .map(n => ({ n, ...bearingKm(d.ne, n) }))
    .sort((a, b) => a.km - b.km).slice(0, 6)
  const neighbours = peers.map((p, i) => {
    const from = onAir.reduce((best, s) => {
      const offDeg = Math.abs(((p.bearing - s.azimuth + 540) % 360) - 180)
      return offDeg < best.off ? { s, off: offDeg } : best
    }, { s: null, off: 999 }).s
    if (!from) {
      return { id: `nbr-${i}`, name: p.n.name, kind: p.n.kind, bearing: r0(p.bearing), km: r1(Math.max(0.3, p.km)),
        from: null, band: '—', success: null, attempts: 0, failures: 0, pingPong: 0, tone: 'slate' }
    }
    const success = r1(clamp(99.2 - rnd() * 2.4 - (from.flag ? 5 + rnd() * 4 : 0), 70, 99.9))
    const attempts = r0((300 + rnd() * 1900) * from.share)
    return {
      id: `nbr-${i}`, name: p.n.name, kind: p.n.kind, bearing: r0(p.bearing), km: r1(Math.max(0.3, p.km)),
      from: from.name, band: from.band, success, attempts,
      failures: r0(attempts * (100 - success) / 100), pingPong: r1(1 + rnd() * 6),
      tone: success >= 98 ? 'green' : success >= 95 ? 'amber' : 'red',
    }
  })

  const radio = pressureOf([...fam.signal.rows, ...fam.power.rows])
  const mobilityCause = pressureOf([...radio.rows, ...fam.timing.rows])
  const cellAvail = d.entities.map(e => parseFloat(e.m1)).filter(v => !Number.isNaN(v))
  const availNow = cellAvail.length ? cellAvail.reduce((a, b) => a + b, 0) / cellAvail.length : 99.9
  const availCause = pressureOf(fam.outage.rows)
  const kpis = [
    kpi({ key: 'acc', label: 'Accessibility', unit: '%', dec: 2, target: 99, dir: '≥', span: 0.8, cause: radio.rows,
      series: walk(rnd, 99.45, 0.18, { p: radio, hit: -radio.stress * 1.6, hi: 99.99 }) }),
    kpi({ key: 'ret', label: 'Retainability', unit: '% drop', dec: 2, target: 0.5, dir: '≤', span: 0.35, cause: radio.rows,
      series: walk(rnd, 0.34, 0.06, { p: radio, hit: radio.stress * 0.5, lo: 0.05 }) }),
    kpi({ key: 'mob', label: 'Mobility', unit: '%', dec: 2, target: 98, dir: '≥', span: 1.5, cause: mobilityCause.rows,
      series: walk(rnd, 98.8, 0.4, { p: mobilityCause, hit: -mobilityCause.stress * 2.6, hi: 99.9 }) }),
    kpi({ key: 'int', label: 'Integrity', unit: 'Mbps', dec: 1, target: nr ? 150 : 30, dir: '≥', span: nr ? 50 : 8, cause: [...radio.rows, ...fam.load.rows],
      series: walk(rnd, nr ? 215 : 39, nr ? 18 : 3, { diurnalAmp: nr ? -60 : -10, p: radio, hit: -radio.stress * (nr ? 60 : 10), lo: 1 }) }),
    /* Availability is the cells' own, counted off the cell table — the last
       hour is that figure, and the hours before the outage sit near target. */
    kpi({ key: 'ava', label: 'Cell availability', unit: '%', dec: 2, target: 99.9, dir: '≥', span: 0.15, cause: availCause.rows,
      series: walk(rnd, 99.97, 0.02, { p: availCause, hit: availNow - 99.97, hi: 100, lo: 0 }).map((v, i) => (i === 23 ? r2(availNow) : v)) }, true),
    kpi({ key: 'eff', label: 'Energy efficiency', unit: 'kWh/GB', dec: 2, target: 0.5, dir: '≤', span: 0.15,
      series: walk(rnd, 0.42, 0.03, { diurnalAmp: -0.18, lo: 0.2 }) }),
  ]
  const offFrom = availCause.from
  const traffic = {
    upper: { title: 'DL throughput', unit: 'Mbps', note: 'stacked to site total',
      series: sectors.map((s, i) => ({ key: s.name, label: `${s.name} · ${s.band}`, tone: `var(--tw-s${i})`,
        values: HOURS.map((_, h) => r1((nr ? 380 : 62) * diurnal(h) * (0.7 + rnd() * 0.25) * (s.nominal / 70 + 0.3) * (h >= offFrom ? s.share : 1))) })) },
    lower: { title: 'DL PRB utilisation', unit: '%', note: 'per sector · 85 % planning ceiling', ceiling: 85,
      series: sectors.map((s, i) => ({ key: s.name, label: s.name, tone: `var(--tw-s${i})`,
        values: HOURS.map((_, h) => (s.down && h >= offFrom ? 0 : r1(clamp(s.nominal * (0.45 + diurnal(h) * 0.7) + (rnd() - 0.5) * 6, 2, 99)))) })) },
  }

  const uePop = sectors.reduce((a, s) => a + s.rrc, 0)
  const upLinks = d.links.filter(l => l.status === 'Active')
  const carrier = upLinks[0] || d.links[0]
  const bh = upLinks.length
    ? r1(clamp(8 + traffic.upper.series.reduce((a, s) => a + (s.values[23] || 0), 0) / (nr ? 250 : 100), 2, 96)) : 0
  const path = {
    title: 'From the air interface to the core',
    hops: [
      { name: 'UE population', sub: `${uePop.toLocaleString('en-IN')} RRC connected`, used: uePop, cap: nr ? 3600 : 1800, unit: 'licence' },
      { name: 'Radio units', sub: `3 × ${sectors[0].mimo} · ${bands.join(' / ')}`, used: r0(onAir.reduce((a, s) => a + s.prb, 0) / Math.max(1, onAir.length)), cap: 100, unit: '% PRB, on-air sectors' },
      { name: 'Baseband', sub: id.model, used: d.env.cpu, cap: 100, unit: '% CPU' },
      { name: `Backhaul ${carrier ? carrier.portA : ''}`,
        sub: `${upLinks.length} of ${d.links.length} up${carrier ? ` · ${carrier.role.toLowerCase()} to ${carrier.nodeZ}` : ''}`,
        used: bh, cap: 100, unit: '% of line rate' },
      { name: nr ? '5GC · UPF' : 'EPC · S-GW', sub: nr ? 'N3 · GTP-U' : 'S1-U · GTP-U', used: r0(20 + rnd() * 30), cap: 100, unit: '% session' },
    ],
    edges: [nr ? 'NR air' : 'LTE air', 'CPRI / eCPRI', nr ? 'N3' : 'S1-U', 'GTP-U'],
    budget: { unit: 'ms', target: nr ? 10 : 20, parts: [
      { label: 'Air + HARQ', v: r1(nr ? 3.2 + rnd() : 6 + rnd() * 1.5), tone: 'var(--tw-s0)' },
      { label: 'Baseband', v: r1(0.8 + rnd() * 0.6), tone: 'var(--tw-s1)' },
      { label: 'Backhaul', v: r1(1.8 + rnd() * 2 + (upLinks.length < d.links.length ? 1.2 : 0)), tone: 'var(--tw-s2)' },
      { label: 'Core', v: r1(0.9 + rnd() * 0.8), tone: 'var(--tw-s3)' },
    ] },
  }

  const worst = sectors.find(s => s.down) || sectors.find(s => s.off.length) || sectors.find(s => s.flag)
    || [...sectors].sort((a, b) => b.prb - a.prb)[0]
  const inspect = {}
  sectors.forEach(s => {
    const tone = s.down ? 'red' : s.off.length || s.flag || s.prb > 85 ? 'amber' : 'green'
    inspect[s.id] = {
      kind: 'Sector', title: s.name, code: s.cells.map(c => c.id).join(' · '), state: s.state, tone,
      summary: s.down ? `Every cell on ${s.name} is off air${s.flag ? `; ${s.flag.label} is the alarm that names them` : ''}.`
        : s.off.length ? `${s.off.map(c => c.id).join(', ')} is off air${s.flag ? ` (${s.flag.label})` : ''}; the rest of ${s.name} carries on at ${s.prb} % PRB.`
          : s.flag ? `${s.flag.label} is open on this sector. Load is ${s.prb} % PRB and setup success ${s.setup} %.`
            : s.prb > 85 ? 'Downlink PRB is above the 85 % planning ceiling; this is capacity, not coverage.'
              : `Carrying ${s.dlMbps} Mbps per user at ${s.prb} % PRB. Nothing on this sector needs attention.`,
      rows: [['Band', s.band], ['Cells on air', `${s.cells.length - s.off.length} of ${s.cells.length}`], ['Azimuth / tilt', `${s.azimuth}° · ${s.tilt}`], ['Beamwidth', `${s.beam}°`], ['PCI', s.pci],
        ['Tx power / MIMO', `${s.power} dBm · ${s.mimo}`], ['RRC connected', s.rrc], ['SINR p50', s.sinr == null ? '—' : `${s.sinr} dB`], ['RTWP', `${s.rtwp} dBm`]],
      bars: [
        { label: 'DL PRB utilisation', v: s.prb, max: 100, display: s.down ? '—' : `${s.prb} %`, tone: s.prb > 85 ? 'amber' : 'blue' },
        { label: 'UL PRB utilisation', v: s.ulPrb, max: 100, display: s.down ? '—' : `${s.ulPrb} %`, tone: 'blue' },
        { label: 'RRC setup success', v: s.setup || 0, max: 100, display: s.setup == null ? '—' : `${s.setup} %`, tone: s.setup != null && s.setup < 99 ? 'red' : 'green' },
      ],
    }
  })
  neighbours.forEach(n => {
    inspect[n.id] = n.from == null ? {
      kind: 'Relation', title: n.name, code: n.kind, state: 'No attempts', tone: 'slate',
      summary: `No sector on this site is on air, so nothing is handing over to ${n.name}.`,
      rows: [['Bearing / distance', `${n.bearing}° · ${n.km} km`]], bars: [],
    } : {
      kind: 'Relation', title: n.name, code: `${n.kind} · from ${n.from}`,
      state: `${n.success} % success`, tone: n.tone,
      summary: n.tone === 'green' ? `A healthy relation — ${n.attempts} handovers in 24 h, ${n.failures} failed.`
        : `${n.failures} of ${n.attempts} handovers to ${n.name} failed in 24 h.${n.tone === 'red' ? ' Worth a neighbour-list audit.' : ''}`,
      rows: [['Bearing / distance', `${n.bearing}° · ${n.km} km`], ['Source sector', `${n.from} · ${n.band}`], ['Attempts, 24 h', n.attempts], ['Failures', n.failures], ['Ping-pong rate', `${n.pingPong} %`]],
      bars: [
        { label: 'Handover success', v: n.success, max: 100, display: `${n.success} %`, tone: n.tone },
        { label: 'Ping-pong', v: n.pingPong, max: 10, display: `${n.pingPong} %`, tone: 'amber' },
      ],
    }
  })

  const unitsHead = ['Sector', 'Band', 'Cells on air', 'DL PRB', 'Users', 'DL Mbps', 'Setup success', 'State']
  const units = sectors.map(s => ({ id: s.id, cells: [s.name, s.band, `${s.cells.length - s.off.length} of ${s.cells.length}`, s.down ? '—' : `${s.prb} %`, s.rrc, s.down ? '—' : s.dlMbps, s.setup == null ? '—' : `${s.setup} %`], state: s.state, tone: inspect[s.id].tone }))

  return {
    kpis, traffic, path, inspect, units, unitsHead, stage: { sectors, neighbours },
    defaultPick: worst.id, unitNoun: 'Sector',
    tabTitle: 'Radio & mobility',
    stageTitle: `${d.ne.name} ${d.ne.kind === 'eNodeB' ? '4G LTE site' : (d.ne.kind === 'gNodeB' ? '5G NR site' : 'site')} twin`,
    stageNote: 'lobe = modelled −20 dB envelope · size follows PRB load',
    heatTitle: 'Busy-hour profile', heatUnit: 'mean DL PRB %',
    heat: heatOf(rnd, 30 + radio.stress * 20),
  }
}

// =========================================================================
//  DWDM — the C-band, what is lit on it, and the degrees it leaves on
// =========================================================================

function dwdm({ d, rnd, fam, id }) {
  const fill = 0.38 + rnd() * 0.3
  const slots = Array.from({ length: 96 }, (_, i) => i)
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]] }
  const litIdx = slots.slice(0, Math.round(96 * fill)).sort((a, b) => a - b)
  const degreeNames = ['West', 'East', 'Add/drop']
  /* West and East leave on the first two links; add/drop terminates here on
     client ports, so its far end is local, not a third site. */
  const farEndOf = deg => deg === 'Add/drop' ? 'Local client' : (d.links[deg === 'West' ? 0 : 1] || {}).nodeZ || '—'
  const rates = ['100G · OTU4', '200G · 16QAM', '400G · ZR+', '100G · OTU4', '10G · OTU2']
  const channels = litIdx.map((slot, k) => {
    const thz = r2(196.1 - slot * 0.05)
    const degree = degreeNames[k % 3]
    return {
      id: `ch-${slot + 1}`, n: slot + 1, thz, nm: r2(299792.458 / thz),
      power: r1(-1.4 + rnd() * 2.2), osnr: r1(20 + rnd() * 6.5),
      degree, rate: rates[Math.floor(rnd() * rates.length)],
      entity: null, flag: null, dark: false, farEnd: farEndOf(degree),
    }
  })
  /* A degree whose line is down carries no light at all, so every channel
     routed over it is dark. The counted channels are the ones still being
     measured, so they land on degrees that are up, spread across the band,
     and carry their own margin through to the spectrum. */
  const cut = new Set(d.links.slice(0, 2).map((l, i) => (l.status !== 'Active' ? degreeNames[i] : null)).filter(Boolean))
  channels.forEach(c => { if (cut.has(c.degree)) { c.dark = true; c.power = -24; c.osnr = 0 } })
  const measurable = channels.filter(c => !cut.has(c.degree))
  d.entities.forEach((e, i) => {
    const c = measurable[Math.floor((i + 0.5) * measurable.length / d.entities.length)]
    if (!c) return
    c.entity = e.id
    c.flag = e.flag
    const margin = parseFloat(e.m1)
    if (Number.isNaN(margin)) { c.dark = true; c.power = -24; c.osnr = 0 }
    else c.osnr = r1(11 + margin * 0.8)
  })

  const degrees = [0, 1].map(i => {
    const l = d.links[i] || {}
    const pre = d.amps[i * 2] || {}, boost = d.amps[i * 2 + 1] || {}
    const spanKm = r0(38 + rnd() * 70)
    const bad = Boolean(l.status && l.status !== 'Active')
    const loss = r1(spanKm * 0.22 + 1.5 + rnd() + (bad ? 3 : 0))
    return {
      id: `deg-${i}`, name: degreeNames[i], nbr: l.nodeZ || '—', port: l.portA || `OL-${i + 1}`,
      spanKm, loss, pre, boost, bad, status: l.status || 'Active',
      lit: channels.filter(c => c.degree === degreeNames[i] && !c.dark).length,
      tilt: r1(0.2 + rnd() * 0.8 + (bad ? 1.2 : 0)),
    }
  })

  const lit = channels.filter(c => !c.dark)
  const margins = d.entities.map(e => parseFloat(e.m1)).filter(v => !Number.isNaN(v))
  const minMargin = margins.length ? Math.min(...margins) : null
  const optical = fam.signal
  const kpis = [
    kpi({ key: 'mar', label: 'Worst signal margin', unit: 'dB', dec: 1, target: 6, dir: '≥', span: 5, cause: optical.rows,
      series: minMargin == null ? Array(24).fill(null)
        : walk(rnd, minMargin + 0.6, 0.25, { p: optical, hit: -0.6, lo: 0 }).map((v, i) => (i === 23 ? minMargin : v)) }),
    kpi({ key: 'q', label: 'Q-factor', unit: 'dB', dec: 1, target: 8.5, dir: '≥', span: 2.5, cause: optical.rows,
      series: walk(rnd, 11.4, 0.25, { p: optical, hit: -optical.stress * 3, lo: 4 }) }),
    kpi({ key: 'ava', label: 'Service availability', unit: '%', dec: 3, target: 99.99, dir: '≥', span: 0.01, cause: fam.outage.rows,
      series: walk(rnd, 99.998, 0.001, { p: fam.outage, hit: -fam.outage.stress * 0.03, hi: 100 }) }, true),
    kpi({ key: 'tilt', label: 'Amplifier gain tilt', unit: 'dB', dec: 1, target: 1.5, dir: '≤', span: 1, cause: optical.rows,
      series: walk(rnd, Math.max(...degrees.map(g => g.tilt)), 0.12, { lo: 0 }).map((v, i) => (i === 23 ? Math.max(...degrees.map(g => g.tilt)) : v)) }),
    kpi({ key: 'loss', label: 'Worst span loss', unit: 'dB', dec: 1, target: 28, dir: '≤', span: 4, cause: optical.rows,
      series: walk(rnd, Math.max(...degrees.map(g => g.loss)), 0.15, { lo: 5 }).map((v, i) => (i === 23 ? Math.max(...degrees.map(g => g.loss)) : v)) }),
    kpi({ key: 'fill', label: 'Spectrum fill', unit: `% · ${lit.length} of 96 lit`, dec: 0, target: 85, dir: '≤', span: 25,
      series: Array.from({ length: 24 }, () => r0((lit.length / 96) * 100)) }),
  ]

  const traffic = {
    upper: { title: 'Client traffic', unit: 'Gbps', note: 'stacked per degree',
      series: degreeNames.map((n, i) => ({ key: n, label: n, tone: `var(--tw-s${i})`,
        values: HOURS.map((_, h) => r0(channels.filter(c => c.degree === n && !c.dark).length * 60 * (0.55 + diurnal(h) * 0.45) * (0.85 + rnd() * 0.15))) })) },
    lower: { title: 'Mean OSNR', unit: 'dB', note: 'per degree · 16 dB floor', ceiling: 16, floor: true,
      series: degreeNames.map((n, i) => {
        const mine = channels.filter(c => c.degree === n && !c.dark)
        const now = mine.length ? mine.reduce((a, c) => a + c.osnr, 0) / mine.length : 23
        return { key: n, label: n, tone: `var(--tw-s${i})`,
          values: HOURS.map((_, h) => (h === 23 ? r1(now) : r1(clamp(now + (rnd() - 0.5) * 1.2, 8, 30)))) }
      }) },
  }

  const path = {
    title: 'From client port to the far-end degree',
    hops: [
      { name: 'Client ports', sub: `${d.ports.length} pluggables in inventory`, used: channels.filter(c => c.degree === 'Add/drop' && !c.dark).length, cap: 32, unit: 'add/drop services' },
      { name: 'Transponders', sub: 'coherent line · tunable', used: lit.length, cap: 96, unit: 'wavelengths lit' },
      { name: 'ROADM · WSS', sub: `${id.model} · CDC`, used: lit.length, cap: 96, unit: 'of 96 channels' },
      { name: `${degrees[0].name} booster`, sub: degrees[0].boost.type || 'EDFA', used: r1(parseFloat(degrees[0].boost.power) || 17), cap: 23, unit: 'dBm of +23' },
      { name: `Span to ${degrees[0].nbr}`, sub: `${degrees[0].spanKm} km G.652 · ${degrees[0].status}`, used: degrees[0].loss, cap: 30, unit: 'dB of 30 budget' },
    ],
    edges: ['grey optics', 'tunable λ', 'mux', 'line'],
    budget: { unit: 'dB', target: 30, parts: [
      { label: 'WSS + mux', v: r1(6 + rnd()), tone: 'var(--tw-s0)' },
      { label: 'Span', v: degrees[0].loss, tone: 'var(--tw-s1)' },
      { label: 'Connectors', v: r1(1 + rnd()), tone: 'var(--tw-s2)' },
    ] },
  }

  const inspect = {}
  channels.forEach(c => {
    const tone = c.dark ? 'red' : c.flag ? 'amber' : c.osnr < 18 ? 'amber' : 'green'
    inspect[c.id] = {
      kind: 'Channel', title: `CH ${c.n} · ${c.nm} nm`, code: c.entity || `${c.thz} THz`,
      state: c.dark ? 'No signal' : c.flag ? c.flag.label : 'Carrying', tone,
      summary: c.dark ? (cut.has(c.degree) ? `The ${c.degree.toLowerCase()} line is down, so nothing routed over it carries light.` : `No light on this wavelength.${c.flag ? ` ${c.flag.label} names it.` : ''}`)
        : c.flag ? `${c.flag.label} is open on this channel; OSNR is ${c.osnr} dB, ${r1(c.osnr - 16)} dB ${c.osnr >= 16 ? 'above' : 'below'} the floor.`
          : `${c.rate} on the ${c.degree.toLowerCase()} ${c.degree === 'Add/drop' ? 'ports, terminating locally' : `degree towards ${c.farEnd}`}, ${r1(c.osnr - 16)} dB above the OSNR floor.`,
      rows: [['Frequency', `${c.thz} THz`], ['Wavelength', `${c.nm} nm`], ['Service', c.rate], ['Degree', c.degree], ['Far end', c.farEnd], ['Launch power', `${c.power} dBm`]],
      bars: [
        { label: 'OSNR', v: c.osnr, max: 30, display: c.dark ? '—' : `${c.osnr} dB`, tone },
        { label: 'Launch power', v: clamp(c.power + 5, 0, 8), max: 8, display: `${c.power} dBm`, tone: 'blue' },
      ],
    }
  })
  degrees.forEach(g => {
    inspect[g.id] = {
      kind: 'Degree', title: `${g.name} degree`, code: `${g.port} → ${g.nbr}`,
      state: g.bad ? g.status : 'In service', tone: g.bad ? 'red' : g.tilt > 1.5 ? 'amber' : 'green',
      summary: g.bad ? `The line towards ${g.nbr} is alarming (${g.status}); ${g.lit} channels ride it.`
        : `${g.lit} channels leave towards ${g.nbr} over ${g.spanKm} km, ${g.loss} dB of loss.`,
      rows: [['Far end', g.nbr], ['Span', `${g.spanKm} km · ${g.loss} dB`], ['Pre-amp gain', g.pre.gain || '—'], ['Booster output', g.boost.power || '—'], ['Booster pump', g.boost.pump || '—'], ['Gain tilt', `${g.tilt} dB`]],
      bars: [
        { label: 'Span loss of budget', v: g.loss, max: 30, display: `${g.loss} dB`, tone: g.loss > 26 ? 'amber' : 'blue' },
        { label: 'Channels lit', v: g.lit, max: 48, display: `${g.lit}`, tone: 'blue' },
      ],
    }
  })

  const worst = (cut.size ? degrees.find(g => g.bad) : null) || channels.find(c => c.dark) || channels.find(c => c.flag) || [...channels].sort((a, b) => a.osnr - b.osnr)[0]
  const unitsHead = ['Channel', 'Wavelength', 'Degree', 'Service', 'Power', 'OSNR', 'Far end', 'State']
  /* The monitored channels first, then the weakest of the rest. */
  const shown = [...channels.filter(c => c.entity), ...channels.filter(c => !c.entity).sort((a, b) => a.osnr - b.osnr)].slice(0, 14)
  const units = shown.map(c => ({
    id: c.id, cells: [`CH ${c.n}`, `${c.nm} nm`, c.degree, c.rate, `${c.power} dBm`, c.dark ? '—' : `${c.osnr} dB`, c.farEnd],
    state: inspect[c.id].state, tone: inspect[c.id].tone,
  }))

  return {
    kpis, traffic, path, inspect, units, unitsHead, stage: { channels, degrees, lit: lit.length },
    defaultPick: worst.id, unitNoun: 'Channel',
    tabTitle: 'Spectrum & channels',
    stageTitle: `${d.ne.name} optical DWDM twin`,
    stageNote: 'C-band 50 GHz grid · peak height is launch power · bar beneath is OSNR',
    heatTitle: 'Busy-hour profile', heatUnit: 'client traffic % of lit capacity',
    heat: heatOf(rnd, 40),
  }
}

// =========================================================================
//  PON — an OLT, its PON ports, the splitters and the homes behind them
// =========================================================================

function pon({ d, rnd, fam, id }) {
  /* The ports are the counted ones — the same rows the port table lists —
     so the tree, the table and the headline agree home for home. */
  const ports = d.entities.map((e, i) => {
    const los = e.status === 'Down'
    const provisioned = e.provisioned
    const online = e.online
    const offline = provisioned - online
    const onts = Array.from({ length: 32 }, (_, k) => (k >= provisioned ? 'empty' : los ? 'los' : k < offline ? 'off' : 'on'))
    for (let k = provisioned - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [onts[k], onts[j]] = [onts[j], onts[k]] }
    const rx = parseFloat(e.m2)
    const up = parseFloat(e.m3) || 0
    return {
      id: `pon-${i}`, name: e.id, card: e.slot, tech: e.tech, entity: e.id,
      provisioned, online, onts, flag: e.flag, los,
      rx: Number.isNaN(rx) ? null : rx,
      down: online ? r0(clamp(up * 1.6 + rnd() * 20, 5, 95)) : 0, up: online ? up : 0,
      distKm: r1(1.5 + rnd() * 16), bip: Number(e.m4) || 0,
      state: los ? 'LOS' : e.flag ? 'Degraded' : 'In service',
    }
  })
  const tech = (ports[0] || {}).tech || 'GPON'
  const xgs = tech === 'XGS-PON'
  const totalProv = ports.reduce((a, p) => a + p.provisioned, 0)
  const totalOn = ports.reduce((a, p) => a + p.online, 0)
  const rxs = ports.filter(p => p.rx != null).map(p => p.rx)
  const meanRx = rxs.length ? rxs.reduce((a, b) => a + b, 0) / rxs.length : null
  const optical = fam.signal
  const onlinePct = totalProv ? (totalOn / totalProv) * 100 : 100

  const kpis = [
    kpi({ key: 'ont', label: 'Homes online', unit: `% · ${totalOn} of ${totalProv}`, dec: 1, target: 90, dir: '≥', span: 5, cause: optical.rows,
      series: walk(rnd, Math.min(99.6, onlinePct + 2), 0.3, { p: optical, hit: onlinePct - Math.min(99.6, onlinePct + 2), hi: 100 }).map((v, i) => (i === 23 ? r1(onlinePct) : v)) }),
    kpi({ key: 'rx', label: 'Mean ONT receive', unit: 'dBm', dec: 1, target: -27, dir: '≥', span: 4, cause: optical.rows,
      series: meanRx == null ? Array(24).fill(null) : walk(rnd, meanRx + 0.4, 0.2, { p: optical, hit: -0.4 }).map((v, i) => (i === 23 ? meanRx : v)) }),
    kpi({ key: 'up', label: 'Busiest upstream', unit: '%', dec: 0, target: 70, dir: '≤', span: 20, cause: fam.load.rows,
      series: walk(rnd, Math.max(...ports.map(p => p.up)), 4, { diurnalAmp: 20, lo: 1, hi: 99 }).map((v, i) => (i === 23 ? Math.max(...ports.map(p => p.up)) : v)) }),
    kpi({ key: 'bip', label: 'Worst BIP errors', unit: '/ 15 min', dec: 0, target: 100, dir: '≤', span: 80, cause: optical.rows,
      series: walk(rnd, Math.max(...ports.map(p => p.bip)), 6, { lo: 0 }).map((v, i) => (i < optical.from ? clamp(v, 0, 40) : i === 23 ? Math.max(...ports.map(p => p.bip)) : v)) }),
    kpi({ key: 'ava', label: 'Service availability', unit: '%', dec: 2, target: 99.9, dir: '≥', span: 0.2, cause: fam.outage.rows,
      series: walk(rnd, 99.96, 0.02, { p: fam.outage, hit: -fam.outage.stress * 0.8, hi: 100 }) }, true),
    kpi({ key: 'flap', label: 'ONT flaps', unit: '/ h', dec: 0, target: 6, dir: '≤', span: 5, cause: optical.rows,
      series: walk(rnd, 1.5, 1, { p: optical, hit: optical.stress * 9, lo: 0 }) }),
  ]

  const groups = [ports.slice(0, 4), ports.slice(4, 8)].filter(g => g.length)
  const capGbps = xgs ? 10 : 2.5
  const traffic = {
    upper: { title: 'Downstream', unit: 'Gbps', note: 'stacked per line card',
      series: groups.map((g, i) => ({ key: `grp-${i}`, label: `${g[0].card} · ${g.length} ports`, tone: `var(--tw-s${i})`,
        values: HOURS.map((_, h) => r2(g.reduce((a, p) => a + (p.los && h >= optical.from ? 0 : p.down || 30), 0) / 100 * capGbps * diurnal(h) * (0.85 + rnd() * 0.15))) })) },
    lower: { title: 'Upstream utilisation', unit: '%', note: 'busiest port per card · 70 % ceiling', ceiling: 70,
      series: groups.map((g, i) => ({ key: `grp-${i}`, label: g[0].card, tone: `var(--tw-s${i})`,
        values: HOURS.map((_, h) => r0(clamp(Math.max(...g.map(p => p.up || 20)) * (0.4 + diurnal(h) * 0.8) + (rnd() - 0.5) * 5, 1, 99))) })) },
  }

  const upLinks = d.links.filter(l => l.status === 'Active')
  const up0 = upLinks[0] || d.links[0] || {}
  const path = {
    title: 'From the home to the broadband gateway',
    hops: [
      { name: 'Homes', sub: `${totalProv} ONTs provisioned`, used: totalOn, cap: ports.length * 32, unit: `online of ${ports.length * 32} splits` },
      { name: 'Splitters', sub: `${ports.length} × 1:32 · up to ${Math.max(...ports.map(p => p.distKm))} km`, used: totalProv, cap: ports.length * 32, unit: 'splits used' },
      { name: `${tech} ports`, sub: id.model, used: Math.max(...ports.map(p => p.down)), cap: 100, unit: '% busiest downstream' },
      { name: `Uplink ${up0.portA || ''}`, sub: `${upLinks.length} of ${d.links.length} up · to ${up0.nodeZ || 'aggregation'}`, used: upLinks.length ? r0(20 + rnd() * 40) : 0, cap: 100, unit: '% of 100 GE' },
      { name: 'BNG', sub: 'PPPoE / IPoE sessions', used: totalOn, cap: 4000, unit: 'sessions' },
    ],
    edges: ['drop fibre', 'distribution', 'feeder', 'Ethernet'],
    budget: { unit: 'dB', target: xgs ? 29 : 32, parts: [
      { label: 'Fibre', v: r1(Math.max(...ports.map(p => p.distKm)) * 0.35), tone: 'var(--tw-s0)' },
      { label: 'Splitter 1:32', v: 17.5, tone: 'var(--tw-s1)' },
      { label: 'Connectors', v: r1(1.5 + rnd()), tone: 'var(--tw-s2)' },
    ] },
  }

  const inspect = {}
  ports.forEach(p => {
    const tone = p.los ? 'red' : p.flag || p.online < p.provisioned * 0.9 ? 'amber' : 'green'
    inspect[p.id] = {
      kind: 'PON port', title: p.name, code: `${p.tech} · ${p.card} · split 1:32`,
      state: p.state, tone,
      summary: p.los ? `Every home on ${p.name} has lost signal at once — a feeder fault, not ${p.provisioned} separate faults.${p.flag ? ` ${p.flag.label} names it.` : ''}`
        : p.flag ? `${p.flag.label} is open. ${p.provisioned - p.online} of ${p.provisioned} homes are offline and BIP errors are ${p.bip} per 15 min.`
          : `${p.online} of ${p.provisioned} homes online, ${p.rx} dBm mean receive, farthest ONT ${p.distKm} km away.`,
      rows: [['Technology', p.tech], ['Line card', p.card], ['Homes online', `${p.online} / ${p.provisioned}`], ['Mean receive', p.rx == null ? '—' : `${p.rx} dBm`], ['Farthest ONT', `${p.distKm} km`], ['BIP errors', `${p.bip} / 15 min`]],
      bars: [
        { label: 'Homes online', v: p.online, max: Math.max(1, p.provisioned), display: `${p.online} / ${p.provisioned}`, tone },
        { label: 'Downstream', v: p.down, max: 100, display: p.los ? '—' : `${p.down} %`, tone: 'blue' },
        { label: 'Upstream', v: p.up, max: 100, display: p.los ? '—' : `${p.up} %`, tone: p.up > 70 ? 'amber' : 'blue' },
      ],
    }
  })
  const worst = ports.find(p => p.los) || ports.find(p => p.flag) || [...ports].sort((a, b) => a.online / a.provisioned - b.online / b.provisioned)[0]
  const unitsHead = ['Port', 'Line card', 'Homes online', 'Receive', 'Downstream', 'Upstream', 'BIP / 15 min', 'State']
  const units = ports.map(p => ({ id: p.id, cells: [p.name, p.card, `${p.online} / ${p.provisioned}`, p.rx == null ? '—' : `${p.rx} dBm`, p.los ? '—' : `${p.down} %`, p.los ? '—' : `${p.up} %`, p.bip], state: p.state, tone: inspect[p.id].tone }))

  return {
    kpis, traffic, path, inspect, units, unitsHead, stage: { ports, uplinks: d.links.slice(0, 2), tech },
    defaultPick: worst.id, unitNoun: 'PON port', countedDuplicate: true,
    tabTitle: 'PON & subscribers',
    stageTitle: `${d.ne.name} access twin`,
    stageNote: 'each dot is one home · lit online · hollow offline · red loss of signal',
    heatTitle: 'Busy-hour profile', heatUnit: 'downstream % of PON capacity',
    heat: heatOf(rnd, 35),
  }
}

// =========================================================================
//  IP — the chassis, its line cards and ports, and the peers it carries
// =========================================================================

const IS_LINE_CARD = /line card|MPC|ASR9K|FPC|GE/i

function ip({ d, rnd, fam, env, id }) {
  /* Only line cards carry ports. A route engine, a fabric card or a power
     unit is drawn in its slot with no port LEDs, because it has none. */
  const flaggedEnt = d.entities.filter(e => e.flag)
  let placed = 0
  const cards = d.modules.slice(0, 6).map((m, ci) => {
    const line = IS_LINE_CARD.test(m.type)
    /* As many LEDs as the card has ports, up to the sixteen a row can draw. */
    const fitted = Number((/(\d+)[x×]/i.exec(m.type) || [0, 16])[1])
    const ports = !line ? [] : Array.from({ length: Math.min(16, fitted) }, (_, k) => {
      const ent = k === 0 && placed < flaggedEnt.length ? flaggedEnt[placed++] : null
      const state = ent ? (ent.status === 'Down' ? 'down' : 'warn') : m.flag ? (k % 4 === 0 ? 'down' : 'up') : rnd() > 0.82 ? 'idle' : 'up'
      return { k, state, util: state === 'up' ? r0(10 + rnd() * 75) : 0, entity: ent ? ent.id : null }
    })
    return { id: `card-${ci}`, slot: m.id, type: m.type, flag: m.flag, line, ports }
  })

  const peers = d.links.map((l, i) => {
    const ent = d.entities.find(e => e.id === l.portA) || null
    const util = ent && !Number.isNaN(parseFloat(ent.m1)) ? parseFloat(ent.m1) : r0(20 + rnd() * 40)
    const cap = l.portA.startsWith('FH') ? 400 : l.portA.startsWith('Hu') ? 100 : l.portA.startsWith('Te') ? 10 : 1
    const bad = l.status !== 'Active' || Boolean(ent && ent.status === 'Down')
    return {
      id: `peer-${i}`, name: l.nodeZ, role: l.role, port: l.portA, farPort: l.portZ,
      cap, util: bad ? 0 : util, gbps: bad ? 0 : r1(cap * util / 100),
      latency: ent ? ent.m4 : `${r1(0.3 + rnd() * 2)} ms`, errors: ent ? ent.m2 : '0', flag: ent && ent.flag, bad,
      tone: bad ? 'red' : (ent && ent.flag) || util > 80 ? 'amber' : 'green',
    }
  })
  const extra = d.adjacency.filter(a => !peers.some(p => p.name === a.name)).slice(0, 2).map((a, i) => {
    const util = r0(15 + rnd() * 40)
    return {
      id: `peer-${peers.length + i}`, name: a.name, role: 'Adjacency', port: `Te0/${4 + i}/0`, farPort: `Te0/0/${i + 4}`,
      cap: 10, util, gbps: r1(10 * util / 100), latency: `${r1(0.4 + rnd() * 2)} ms`, errors: '0', flag: null, bad: false, tone: 'green',
    }
  })
  const allPeers = [...peers, ...extra]

  /* Two sessions per neighbour (IGP and BGP). Each open routing alarm is a
     session down, so the headline cannot read 100 % beside one. */
  const sessions = allPeers.length * 2
  const sessionsDown = Math.min(sessions, fam.routing.rows.length + peers.filter(p => p.bad).length)
  const sessionsPct = ((sessions - sessionsDown) / Math.max(1, sessions)) * 100
  const utils = d.entities.map(e => parseFloat(e.m1)).filter(v => !Number.isNaN(v))
  const peak = utils.length ? Math.max(...utils) : 30
  const congestion = pressureOf([...fam.load.rows, ...fam.signal.rows])
  const kpis = [
    kpi({ key: 'util', label: 'Peak port utilisation', unit: '%', dec: 0, target: 80, dir: '≤', span: 20, cause: fam.load.rows,
      series: walk(rnd, peak - 8, 4, { diurnalAmp: 22, lo: 1, hi: 99 }).map((v, i) => (i === 23 ? peak : v)) }),
    kpi({ key: 'lat', label: 'Transit latency', unit: 'ms', dec: 2, target: 5, dir: '≤', span: 3, cause: congestion.rows,
      series: walk(rnd, 1.6, 0.25, { diurnalAmp: 0.8, p: congestion, hit: congestion.stress * 4, lo: 0.2 }) }),
    kpi({ key: 'loss', label: 'Packet loss', unit: '%', dec: 3, target: 0.1, dir: '≤', span: 0.08, cause: congestion.rows,
      series: walk(rnd, 0.012, 0.006, { p: congestion, hit: congestion.stress * 0.25, lo: 0 }) }),
    kpi({ key: 'sess', label: d.ne.kind === 'Aggregation SW' ? 'Trunk / L2 sessions up' : 'Routing sessions up', unit: `% · ${sessions - sessionsDown} of ${sessions}`, dec: 1, target: 100, dir: '≥', span: 8, cause: fam.routing.rows,
      series: Array.from({ length: 24 }, (_, i) => (i >= fam.routing.from ? sessionsPct : 100)) }),
    kpi({ key: 'ava', label: 'Reachability', unit: '%', dec: 2, target: 99.9, dir: '≥', span: 0.2, cause: fam.power.rows,
      series: Array.from({ length: 24 }, (_, i) => (i === 23 ? d.kpis.availability : 100)) }, true),
    kpi({ key: 'cpu', label: d.ne.kind === 'Aggregation SW' ? 'Switch supervisor CPU' : 'Route processor CPU', unit: '%', dec: 0, target: 80, dir: '≤', span: 25, cause: fam.load.rows,
      series: walk(rnd, env.cpu, 4, { diurnalAmp: 10, lo: 3, hi: 99 }).map((v, i) => (i === 23 ? env.cpu : v)) }),
  ]

  const traffic = {
    upper: { title: 'Traffic', unit: 'Gbps', note: 'stacked per link',
      series: allPeers.slice(0, 4).map((p, i) => ({ key: p.id, label: `${p.role} · ${p.name}`, tone: `var(--tw-s${i})`,
        values: HOURS.map((_, h) => (p.bad && h >= fam.signal.from ? 0 : r1(Math.max(0.2, p.cap * (p.util || 30) / 100) * (0.45 + diurnal(h) * 0.7) * (0.85 + rnd() * 0.15)))) })) },
    lower: { title: 'Utilisation', unit: '%', note: 'per link · 80 % ceiling', ceiling: 80,
      series: allPeers.slice(0, 4).map((p, i) => ({ key: p.id, label: p.name, tone: `var(--tw-s${i})`,
        values: HOURS.map((_, h) => (p.bad && h >= fam.signal.from ? 0 : r0(clamp((p.util || 30) * (0.45 + diurnal(h) * 0.7) + (rnd() - 0.5) * 6, 1, 99)))) })) },
  }

  const upLinks = peers.filter(p => !p.bad)
  const up = upLinks[0] || peers[0] || {}
  const lineCards = cards.filter(c => c.line)
  const path = {
    title: 'From ingress to the next hop',
    hops: [
      { name: 'Ingress', sub: `${d.entities.length} monitored interfaces`, used: utils.length ? r0(utils.reduce((a, b) => a + b, 0) / utils.length) : 0, cap: 100, unit: '% mean util' },
      { name: 'Line cards', sub: `${lineCards.length} cards · ${lineCards.reduce((a, c) => a + c.ports.length, 0)} ports`, used: r0(30 + rnd() * 40), cap: 100, unit: '% NPU' },
      { name: 'Switch fabric', sub: id.model, used: r0(20 + rnd() * 30), cap: 100, unit: '% fabric' },
      { name: `Uplink ${up.port || ''}`, sub: `${upLinks.length} of ${peers.length} up · ${up.role || 'uplink'}`, used: up.util || 0, cap: 100, unit: '% of line rate' },
      { name: up.name || 'Next hop', sub: up.farPort || '', used: r0(20 + rnd() * 30), cap: 100, unit: '% far-end' },
    ],
    edges: ['L2 / L3', 'backplane', 'egress', 'fibre'],
    budget: { unit: 'ms', target: 5, parts: [
      { label: 'Ingress queue', v: r2(0.1 + rnd() * 0.3), tone: 'var(--tw-s0)' },
      { label: 'Forwarding', v: r2(0.05 + rnd() * 0.1), tone: 'var(--tw-s1)' },
      { label: 'Egress queue', v: r2(0.2 + rnd() * 0.5 + congestion.stress), tone: 'var(--tw-s2)' },
      { label: 'Propagation', v: r2(0.5 + rnd() * 1.2), tone: 'var(--tw-s3)' },
    ] },
  }

  const inspect = {}
  allPeers.forEach(p => {
    inspect[p.id] = {
      kind: 'Link', title: `${p.port} → ${p.name}`, code: p.role,
      state: p.bad ? 'Down' : p.flag ? p.flag.label : `${p.util} % utilised`, tone: p.tone,
      summary: p.bad ? `The ${p.role.toLowerCase()} to ${p.name} is down and carries nothing.`
        : p.flag ? `${p.flag.label} is open on ${p.port}. Utilisation is ${p.util} % with ${p.errors} input errors.`
          : `${p.gbps} Gbps of ${p.cap} G towards ${p.name}, ${p.latency} across.`,
      rows: [['Local port', p.port], ['Far-end port', p.farPort], ['Role', p.role], ['Capacity', `${p.cap} GE`], ['Latency', p.latency], ['Input errors', p.errors]],
      bars: [
        { label: 'Utilisation', v: p.util, max: 100, display: p.bad ? '—' : `${p.util} %`, tone: p.util > 80 ? 'amber' : 'blue' },
        { label: 'Throughput', v: p.gbps, max: p.cap, display: p.bad ? '—' : `${p.gbps} G`, tone: 'blue' },
      ],
    }
  })
  cards.forEach(c => {
    const upN = c.ports.filter(p => p.state === 'up').length
    const downN = c.ports.filter(p => p.state === 'down').length
    const warnN = c.ports.filter(p => p.state === 'warn').length
    inspect[c.id] = {
      kind: c.line ? 'Line card' : 'Module', title: c.slot, code: c.type,
      state: c.flag ? c.flag.label : downN ? `${downN} port${downN === 1 ? '' : 's'} down` : 'In service',
      tone: c.flag || downN ? 'red' : warnN ? 'amber' : 'green',
      summary: c.flag ? `${c.flag.label} names this ${c.line ? 'card' : 'module'}.`
        : c.line ? `${upN} of ${c.ports.length} ports carrying traffic.` : 'A common-equipment module; it carries no traffic ports.',
      rows: c.line
        ? [['Slot', c.slot], ['Card', c.type], ['Ports up', `${upN} / ${c.ports.length}`], ['Ports alarming', warnN + downN]]
        : [['Slot', c.slot], ['Module', c.type]],
      bars: c.line ? [{ label: 'Ports in use', v: upN, max: c.ports.length, display: `${upN} / ${c.ports.length}`, tone: 'blue' }] : [],
    }
  })

  const worst = allPeers.find(p => p.bad) || allPeers.find(p => p.flag) || cards.find(c => c.flag) || allPeers[0] || cards[0]
  const unitsHead = ['Link', 'Far end', 'Role', 'Capacity', 'Utilisation', 'Throughput', 'Latency', 'State']
  const units = allPeers.map(p => ({ id: p.id, cells: [p.port, p.name, p.role, `${p.cap} GE`, p.bad ? '—' : `${p.util} %`, p.bad ? '—' : `${p.gbps} G`, p.latency], state: inspect[p.id].state, tone: p.tone }))

  return {
    kpis, traffic, path, inspect, units, unitsHead, stage: { cards, peers: allPeers },
    defaultPick: worst ? worst.id : null, unitNoun: 'Link',
    tabTitle: d.ne.kind === 'Aggregation SW' ? 'Interfaces & ports' : 'Interfaces & peers',
    stageTitle: `${d.ne.name} ${d.ne.kind === 'Aggregation SW' ? 'switch twin' : 'router chassis twin'}`,
    stageNote: d.ne.kind === 'Aggregation SW' ? 'LED per port · uplink width follows throughput' : 'LED per port · link width follows throughput',
    heatTitle: 'Busy-hour profile', heatUnit: 'peak port utilisation %',
    heat: heatOf(rnd, 35 + congestion.stress * 15),
  }
}

/* Four weeks of busy hours folded onto one week: weekday × hour-of-day. */
function heatOf(rnd, base) {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
    day,
    values: Array.from({ length: 24 }, (_, h) => {
      const i = (h + 14) % 24                            // hour-of-day h → HOURS index
      const weekend = ['Sat', 'Sun'].includes(day) ? 0.82 : 1
      return r0(clamp(base * 0.35 + diurnal(i) * base * 1.25 * weekend + (rnd() - 0.5) * 10, 2, 99))
    }),
  }))
}
