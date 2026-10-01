import { useState, useMemo, createContext, useContext } from 'react'

/**
 * The twin stage — one drawing per kind of machine.
 *
 * A base station is drawn from above, as sectors and the relations around
 * them; a ROADM as the C-band it carries and the degrees it leaves on; an OLT
 * as the tree from port to home; a router as its line cards and the links
 * they feed. Each is clickable, and a click hands an id to the inspector
 * beside it — the stage never states a reading the inspector cannot back.
 *
 * The stage is dark in both themes, like the reference twins: it is an
 * instrument face, and luminous signal reads best on a dark ground.
 */

export const TW = { green: 'var(--tw-ok)', amber: 'var(--tw-warn)', red: 'var(--tw-bad)', blue: 'var(--tw-cyan)', slate: 'var(--tw-faint)' }
/* An element that has stopped answering reports nothing, so nothing on its
   twin moves: the particles stand for measured flow, and there is none. */
const StaleCtx = createContext(null)
const pmAt = mins => new Date(Date.UTC(2026, 7, 20, 9, 0, 0) - mins * 60000).toISOString().slice(11, 16)
const reduced = typeof window !== 'undefined' && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const W = 1000, H = 520
const polar = (cx, cy, deg, r) => [cx + Math.sin((deg * Math.PI) / 180) * r, cy - Math.cos((deg * Math.PI) / 180) * r]

/* A dot that travels a path, looping. Particles are the one piece of motion
   that carries meaning — their rate follows the load on the path. */
function Packets({ d, n = 2, dur = 3, tone, r = 2.6, reverse = false }) {
  const stale = useContext(StaleCtx)
  if (reduced || stale) return null
  return Array.from({ length: n }, (_, i) => (
    <circle key={i} r={r} style={{ fill: tone }} className="tw-pkt">
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${(-dur * i) / n}s`} path={d}
        keyPoints={reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
    </circle>
  ))
}

function Frame({ title, note, layers, on, toggle, legend, hud, height = H, children }) {
  const stale = useContext(StaleCtx)
  return (
    <div className="tw-stage">
      <div className="tw-bar">
        <div className="tw-hud__t"><b>{title}</b>{stale
          ? <span className="tw-live is-stale"><i />No PM since {pmAt(stale.lastPmMins)}</span>
          : <><span className="tw-live"><i />Live</span><span>15-min PM window</span></>}</div>
        {hud}
        {layers && (
          <div className="tw-layers">
            {layers.map(l => (
              <button key={l} className={on[l] ? 'on' : ''} onClick={() => toggle(l)} aria-pressed={!!on[l]}>{l}</button>
            ))}
          </div>
        )}
      </div>
      <svg className="tw-svg" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={title}>
        <defs>
          <pattern id="tw-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" style={{ fill: 'var(--tw-grid)' }} />
          </pattern>
          <filter id="tw-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {[0, 1, 2, 3].map(i => (
            <radialGradient key={i} id={`tw-lobe-${i}`} cx="0" cy="0" r="1" gradientUnits="objectBoundingBox">
              <stop offset="0" style={{ stopColor: `var(--tw-s${i})`, stopOpacity: 0.75 }} />
              <stop offset="1" style={{ stopColor: `var(--tw-s${i})`, stopOpacity: 0.12 }} />
            </radialGradient>
          ))}
          {[0, 1, 2, 3].map(i => (
            <linearGradient key={i} id={`tw-peak-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: `var(--tw-s${i})`, stopOpacity: 0.95 }} />
              <stop offset="1" style={{ stopColor: `var(--tw-s${i})`, stopOpacity: 0.05 }} />
            </linearGradient>
          ))}
          <linearGradient id="tw-peak-warn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--tw-warn)', stopOpacity: 1 }} />
            <stop offset="1" style={{ stopColor: 'var(--tw-warn)', stopOpacity: 0.08 }} />
          </linearGradient>
          <pattern id="tw-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: 'var(--tw-bad)', strokeOpacity: 0.28 }} strokeWidth="2" />
          </pattern>
          <linearGradient id="tw-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--tw-cyan)', stopOpacity: 0 }} />
            <stop offset="1" style={{ stopColor: 'var(--tw-cyan)', stopOpacity: 0.22 }} />
          </linearGradient>
        </defs>
        <rect width={W} height={height} style={{ fill: 'url(#tw-dots)' }} />
        {children}
      </svg>
      <div className="tw-foot">
        <div className="tw-legend">{legend}</div>
        <span>{note}</span>
      </div>
    </div>
  )
}

const Key = ({ tone, children, hollow }) => (
  <span className="tw-key"><i style={hollow ? { borderColor: tone } : { background: tone }} className={hollow ? 'is-hollow' : ''} />{children}</span>
)

function useLayers(init) {
  const [on, set] = useState(init)
  return [on, l => set(s => ({ ...s, [l]: !s[l] }))]
}

// =========================================================================

function RanStage({ t, pick, onPick }) {
  const { sectors, neighbours } = t.stage
  const [on, toggle] = useLayers({ Neighbours: true, 'Range rings': true, Sweep: true })
  const cx = 500, cy = 268
  const maxKm = Math.max(...neighbours.map(n => n.km), 1)
  const place = km => 90 + (km / maxKm) * 150
  const sel = sectors.find(s => s.id === pick) || sectors.find(s => neighbours.find(n => n.id === pick)?.from === s.name)

  /* Neighbours sit at their real bearing, which puts several of them on top
     of each other whenever a cluster lies the same way. The markers stay
     where they belong; the labels are pushed apart down each side so no two
     overlap, and a leader line keeps each one tied to its node. */
  const placed = useMemo(() => {
    const rows = neighbours.map(n => {
      const [x, y] = polar(cx, cy, n.bearing, place(n.km))
      const left = x < cx
      return { ...n, x, y, left, labelX: left ? x - 17 : x + 17, labelY: y - 9, path: `M${cx},${cy} L${x.toFixed(1)},${y.toFixed(1)}` }
    })
    const GAP = 36
    ;[true, false].forEach(side => {
      const col = rows.filter(r => r.left === side).sort((a, b) => a.labelY - b.labelY)
      col.forEach((r, i) => { if (i && r.labelY - col[i - 1].labelY < GAP) r.labelY = col[i - 1].labelY + GAP })
      /* If pushing down ran the last one off the stage, lift the whole column
         back up by the overshoot. */
      const over = col.length ? col[col.length - 1].labelY - (H - 26) : 0
      if (over > 0) col.forEach(r => { r.labelY -= over })
    })
    return rows
  }, [neighbours, cx, cy])

  const lobe = s => {
    const R = 92 + (s.down ? s.nominal : s.prb) * 1.45
    const span = s.beam * 0.95
    const pts = []
    for (let k = 0; k <= 36; k++) {
      const off = -span + (2 * span * k) / 36
      const g = Math.pow(Math.cos((off / span) * (Math.PI / 2)), 1.25)
      pts.push(polar(cx, cy, s.azimuth + off, R * (0.12 + 0.88 * g)))
    }
    return { R, d: `M${cx},${cy} ` + pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z' }
  }

  return (
    <Frame title={t.stageTitle} note={t.stageNote} layers={Object.keys(on)} on={on} toggle={toggle}
      hud={sel && (
        <dl className="tw-read">
          <div><dt>Sector</dt><dd style={{ color: `var(--tw-s${sectors.indexOf(sel)})` }}>{sel.name}</dd></div>
          <div><dt>AZ · tilt</dt><dd>{sel.azimuth}° · {sel.tilt}</dd></div>
          <div><dt>PRB · RRC</dt><dd>{sel.prb} % · {sel.rrc}</dd></div>
          <div><dt>SINR p50</dt><dd>{sel.sinr == null ? '—' : `${sel.sinr} dB`}</dd></div>
        </dl>
      )}
      legend={<>
        {sectors.map((s, i) => <Key key={s.id} tone={`var(--tw-s${i})`}>{s.name} · {s.band} · {s.down ? 'off air' : `${s.prb} % PRB`}</Key>)}
        <Key tone={TW.green}>≥ 98 % HO</Key><Key tone={TW.amber}>95–98 %</Key><Key tone={TW.red}>&lt; 95 %</Key>
      </>}>
      {on['Range rings'] && [1, 2, 3, 4].map(k => (
        <g key={k}>
          <circle cx={cx} cy={cy} r={k * 60} className="tw-ring" />
          <text x={polar(cx, cy, 200, k * 60)[0] + 4} y={polar(cx, cy, 200, k * 60)[1] + 12} className="tw-tick">{(((k * 60 - 90) / 150) * maxKm).toFixed(1) > 0 ? `${(((k * 60 - 90) / 150) * maxKm).toFixed(1)} km` : ''}</text>
        </g>
      ))}
      {on['Range rings'] && [0, 90, 180, 270].map(a => {
        const [x, y] = polar(cx, cy, a, 250)
        return <text key={a} x={x} y={y + 4} className="tw-compass" textAnchor="middle">{['N', 'E', 'S', 'W'][a / 90]}</text>
      })}

      {on.Sweep && !reduced && (
        <g className="tw-sweep" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path d={`M${cx},${cy} L${cx},${cy - 240} A240,240 0 0 1 ${polar(cx, cy, 38, 240).join(',')} Z`} style={{ fill: 'url(#tw-sweep)' }} />
        </g>
      )}

      {/* Lines and markers first, then every label on top of them — a label
          drawn beside one neighbour must not end up under the next one's
          marker. */}
      {on.Neighbours && placed.map(n => (
        <g key={n.id} className={'tw-hit' + (pick === n.id ? ' is-picked' : '')} onClick={() => onPick(n.id)}>
          <path d={n.path} className={'tw-rel' + (n.tone === 'red' ? ' is-bad' : '')}
            style={{ stroke: TW[n.tone], strokeWidth: 1 + n.attempts / 900 }} />
          {n.attempts > 0 && <Packets d={n.path} n={n.tone === 'red' ? 1 : 2} dur={Math.max(1.4, 4.2 - n.attempts / 700)} tone={TW[n.tone]} />}
          <circle cx={n.x} cy={n.y} r={pick === n.id ? 10 : 7} style={{ fill: 'var(--tw-bg)', stroke: TW[n.tone] }} strokeWidth="2.5" />
          <circle cx={n.x} cy={n.y} r="3" style={{ fill: TW[n.tone] }} />
        </g>
      ))}

      {sectors.map((s, i) => {
        const { R, d } = lobe(s)
        const picked = pick === s.id
        const [lx, ly] = polar(cx, cy, s.azimuth, Math.max(70, R * 0.62))
        return (
          <g key={s.id} className={'tw-hit' + (picked ? ' is-picked' : '')} onClick={() => onPick(s.id)}>
            <path d={d} className={'tw-lobe' + (s.down ? ' is-down' : '') + (s.flag && !s.down ? ' is-flag' : '')}
              style={{ fill: s.down ? 'url(#tw-hatch)' : `url(#tw-lobe-${i})`, stroke: s.down ? TW.red : `var(--tw-s${i})` }}
              filter={picked ? 'url(#tw-glow)' : undefined} />
            <g transform={`translate(${lx},${ly})`} className="tw-tag">
              <rect x="-50" y="-17" width="100" height="34" rx="6" />
              <text y="-2" textAnchor="middle" className="tw-lbl">{s.name} · {s.band}</text>
              <text y="12" textAnchor="middle" className="tw-lbl tw-lbl--dim">{s.down ? 'off air' : `PRB ${s.prb} %`}</text>
            </g>
          </g>
        )
      })}

      {on.Neighbours && placed.map(n => (
        <g key={`lbl-${n.id}`} className="tw-hit" onClick={() => onPick(n.id)}>
          {Math.abs(n.labelY - (n.y - 9)) > 2 && (
            <path d={`M${n.x + (n.left ? -9 : 9)},${n.y} L${n.labelX},${n.labelY - 4}`} className="tw-leader" style={{ stroke: TW[n.tone] }} />
          )}
          <g transform={`translate(${n.labelX},${n.labelY})`}>
            <text className="tw-lbl" textAnchor={n.left ? 'end' : 'start'}>{n.name}</text>
            <text className="tw-lbl tw-lbl--dim" y="14" textAnchor={n.left ? 'end' : 'start'}>
              {n.success == null ? 'no attempts' : `${n.success} %`} · {n.km} km
            </text>
          </g>
        </g>
      ))}

      <g className="tw-mast">
        {!reduced && <circle cx={cx} cy={cy} r="12" className="tw-pulse" />}
        <circle cx={cx} cy={cy} r="11" style={{ fill: 'var(--tw-bg-2)', stroke: 'var(--tw-cyan)' }} strokeWidth="2" />
        <path d={`M${cx},${cy - 7} L${cx - 5},${cy + 6} M${cx},${cy - 7} L${cx + 5},${cy + 6} M${cx - 3},${cy + 1} L${cx + 3},${cy + 1}`} style={{ stroke: 'var(--tw-cyan)' }} strokeWidth="1.6" fill="none" />
      </g>
    </Frame>
  )
}

// =========================================================================

function DwdmStage({ t, pick, onPick }) {
  const { channels, degrees } = t.stage
  const [on, toggle] = useLayers({ 'OSNR strip': true, 'Noise floor': true, 'Light flow': true })
  const x0 = 70, x1 = 950, yb = 238, yt = 44
  const slotW = (x1 - x0) / 96
  const xOf = n => x0 + (n - 0.5) * slotW
  const yOf = p => yb - ((p + 26) / 30) * (yb - yt)
  const deg = { West: 0, East: 1, 'Add/drop': 2 }
  const sel = channels.find(c => c.id === pick)

  const peak = c => {
    const x = xOf(c.n), top = yOf(c.power), s = slotW * 0.34
    const pts = []
    for (let k = -10; k <= 10; k++) {
      const dx = (k / 10) * s * 2.6
      pts.push(`${(x + dx).toFixed(1)},${(yb - (yb - top) * Math.exp(-(dx * dx) / (2 * s * s))).toFixed(1)}`)
    }
    return `M${pts[0]} L${pts.join(' L')} Z`
  }
  const floor = useMemo(() => {
    const pts = []
    for (let k = 0; k <= 88; k++) {
      const x = x0 + (k / 88) * (x1 - x0)
      pts.push(`${x.toFixed(1)},${(yOf(-21.5 + (k / 88) * 1.6 + Math.sin(k * 1.7) * 0.5)).toFixed(1)}`)
    }
    return `M${pts.join(' L')}`
  }, [])

  const sy = 262, sh = 40
  const roadm = { x: 410, y: 356, w: 180, h: 104 }
  const lineY = roadm.y + 38

  return (
    <Frame title={t.stageTitle} note={t.stageNote} layers={Object.keys(on)} on={on} toggle={toggle}
      hud={sel && (
        <dl className="tw-read">
          <div><dt>Channel</dt><dd style={{ color: sel.flag || sel.dark ? TW.amber : `var(--tw-s${deg[sel.degree]})` }}>CH {sel.n}</dd></div>
          <div><dt>λ · f</dt><dd>{sel.nm} nm · {sel.thz} THz</dd></div>
          <div><dt>Power · OSNR</dt><dd>{sel.power} dBm · {sel.dark ? '—' : `${sel.osnr} dB`}</dd></div>
          <div><dt>Service</dt><dd>{sel.rate}</dd></div>
        </dl>
      )}
      legend={<>
        <Key tone="var(--tw-s0)">West</Key><Key tone="var(--tw-s1)">East</Key><Key tone="var(--tw-s2)">Add/drop</Key>
        <Key tone={TW.amber}>alarmed</Key><Key tone={TW.red}>no signal</Key>
      </>}>
      {[0, -6, -12, -18, -24].map(p => (
        <g key={p}>
          <line x1={x0} x2={x1} y1={yOf(p)} y2={yOf(p)} className="tw-gridline" />
          <text x={x0 - 8} y={yOf(p) + 4} textAnchor="end" className="tw-tick">{p} dBm</text>
        </g>
      ))}
      {[1530, 1540, 1550, 1560].map(nm => {
        const n = (196.1 - 299792.458 / nm) / 0.05 + 1
        return <text key={nm} x={xOf(n)} y={yb + 14} textAnchor="middle" className="tw-tick">{nm} nm</text>
      })}
      {on['Noise floor'] && <path d={floor} className="tw-ase" />}

      {sel && <rect x={xOf(sel.n) - slotW * 0.9} y={yt - 10} width={slotW * 1.8} height={yb - yt + 10} className="tw-selband" />}
      {channels.map(c => {
        const picked = pick === c.id
        const i = deg[c.degree]
        return (
          <g key={c.id} className={'tw-hit' + (picked ? ' is-picked' : '')} onClick={() => onPick(c.id)}>
            <rect x={xOf(c.n) - slotW / 2} y={yt} width={slotW} height={sh + (yb - yt) + 30} fill="transparent" />
            {c.dark
              ? <path d={`M${xOf(c.n) - 4},${yb - 12} l8,8 M${xOf(c.n) + 4},${yb - 12} l-8,8`} style={{ stroke: TW.red }} strokeWidth="2" />
              : <path d={peak(c)} style={{ fill: c.flag ? 'url(#tw-peak-warn)' : `url(#tw-peak-${i})`, stroke: c.flag ? TW.amber : `var(--tw-s${i})` }}
                strokeWidth={picked ? 1.8 : 0.8} filter={picked || c.flag ? 'url(#tw-glow)' : undefined} />}
          </g>
        )
      })}
      <line x1={x0} x2={x1} y1={yb} y2={yb} className="tw-axis" />

      {on['OSNR strip'] && (
        <g>
          <text x={x0 - 8} y={sy + 16} textAnchor="end" className="tw-tick">OSNR</text>
          <line x1={x0} x2={x1} y1={sy + sh - (16 / 30) * sh} y2={sy + sh - (16 / 30) * sh} className="tw-floor" />
          {channels.map(c => {
            const h = Math.max(1.5, (c.osnr / 30) * sh)
            const tone = c.dark ? TW.red : c.osnr < 18 ? TW.amber : TW.green
            return <rect key={c.id} x={xOf(c.n) - slotW * 0.32} y={sy + sh - h} width={slotW * 0.64} height={h} rx="1"
              style={{ fill: tone, opacity: pick === c.id ? 1 : 0.7 }} onClick={() => onPick(c.id)} className="tw-hit" />
          })}
        </g>
      )}

      {/* Degrees: the line system either side of the ROADM. */}
      {degrees.map((g, i) => {
        const left = i === 0
        const edge = left ? roadm.x : roadm.x + roadm.w
        const far = left ? 70 : 930
        const tone = g.bad ? TW.red : `var(--tw-s${i})`
        const ampX = left ? roadm.x - 90 : roadm.x + roadm.w + 90
        const line = `M${edge},${lineY} L${far},${lineY}`
        const picked = pick === g.id
        return (
          <g key={g.id} className={'tw-hit' + (picked ? ' is-picked' : '')} onClick={() => onPick(g.id)}>
            <path d={line} className={'tw-fibre' + (g.bad ? ' is-bad' : '')} style={{ stroke: tone }} />
            <path d={`M${edge},${lineY + 26} L${far},${lineY + 26}`} className="tw-fibre tw-fibre--rx" style={{ stroke: tone }} />
            {on['Light flow'] && !g.bad && <>
              <Packets d={line} n={4} dur={3.2} tone={`var(--tw-s${i})`} r={2.4} />
              <Packets d={`M${far},${lineY + 26} L${edge},${lineY + 26}`} n={3} dur={3.6} tone={`var(--tw-s${(i + 2) % 3})`} r={2} />
            </>}
            {g.bad && <path d={`M${(edge + far) / 2 - 7},${lineY - 7} l14,14 M${(edge + far) / 2 + 7},${lineY - 7} l-14,14`} style={{ stroke: TW.red }} strokeWidth="2.5" />}
            {/* Booster on the way out, pre-amp on the way in. */}
            <path d={left ? `M${ampX + 16},${lineY - 11} L${ampX - 10},${lineY} L${ampX + 16},${lineY + 11} Z` : `M${ampX - 16},${lineY - 11} L${ampX + 10},${lineY} L${ampX - 16},${lineY + 11} Z`} className="tw-amp" style={{ stroke: tone }} />
            <path d={left ? `M${ampX - 10},${lineY + 15} L${ampX + 16},${lineY + 26} L${ampX - 10},${lineY + 37} Z` : `M${ampX + 10},${lineY + 15} L${ampX - 16},${lineY + 26} L${ampX + 10},${lineY + 37} Z`} className="tw-amp" style={{ stroke: tone }} />
            <text x={ampX} y={lineY - 18} textAnchor="middle" className="tw-lbl tw-lbl--dim">{g.boost.power || ''} · {g.pre.gain || ''}</text>
            <text x={(ampX + far) / 2} y={lineY + 52} textAnchor="middle" className="tw-lbl tw-lbl--dim">{g.spanKm} km · {g.loss} dB</text>
            <g transform={`translate(${far},${lineY + 13})`}>
              <circle r={picked ? 16 : 13} style={{ fill: 'var(--tw-bg)', stroke: tone }} strokeWidth="2.5" />
              <text y="4" textAnchor="middle" className="tw-lbl">{g.name[0]}</text>
            </g>
            <text x={far} y={lineY + 50} textAnchor={left ? 'start' : 'end'} dx={left ? -12 : 12} className="tw-lbl">{g.nbr}</text>
            <text x={far} y={lineY + 64} textAnchor={left ? 'start' : 'end'} dx={left ? -12 : 12} className="tw-lbl tw-lbl--dim">{g.name} · {g.lit} λ</text>
          </g>
        )
      })}
      <g>
        <rect x={roadm.x} y={roadm.y} width={roadm.w} height={roadm.h} rx="10" className="tw-box" />
        <text x={roadm.x + roadm.w / 2} y={roadm.y + 24} textAnchor="middle" className="tw-lbl">ROADM · CDC WSS</text>
        {Array.from({ length: 12 }, (_, k) => (
          <rect key={k} x={roadm.x + 18 + k * 12.4} y={roadm.y + 46} width="8" height="22" rx="2"
            style={{ fill: `var(--tw-s${k % 3})`, opacity: 0.35 + ((k * 37) % 60) / 100 }} />
        ))}
        <text x={roadm.x + roadm.w / 2} y={roadm.y + 90} textAnchor="middle" className="tw-lbl tw-lbl--dim">{t.stage.lit} of 96 lit</text>
        {[0, 1, 2, 3, 4, 5].map(k => (
          <line key={k} x1={roadm.x + 30 + k * 24} x2={roadm.x + 30 + k * 24} y1={roadm.y + roadm.h} y2={roadm.y + roadm.h + 22} className="tw-drop" />
        ))}
        <text x={roadm.x + roadm.w / 2} y={roadm.y + roadm.h + 36} textAnchor="middle" className="tw-lbl tw-lbl--dim">add / drop · client</text>
      </g>
      {sel && !sel.dark && (() => {
        const i = deg[sel.degree]
        const tx = i === 0 ? roadm.x + 20 : i === 1 ? roadm.x + roadm.w - 20 : roadm.x + roadm.w / 2
        return <path d={`M${xOf(sel.n)},${yb} C${xOf(sel.n)},${sy + sh + 20} ${tx},${roadm.y - 30} ${tx},${roadm.y}`} className="tw-trace" style={{ stroke: sel.flag ? TW.amber : `var(--tw-s${i})` }} />
      })()}
    </Frame>
  )
}

// =========================================================================

function PonStage({ t, pick, onPick }) {
  const { ports, uplinks, tech } = t.stage
  const [on, toggle] = useLayers({ 'Light flow': true, 'Offline only': false })
  const rowY = i => 74 + i * 55
  const olt = { x: 190, y: 44, w: 120, h: 444 }
  const spX = 490, dotX = 540, pitch = 13

  return (
    <Frame title={t.stageTitle} note={t.stageNote} layers={Object.keys(on)} on={on} toggle={toggle}
      hud={(() => {
        const p = ports.find(x => x.id === pick)
        return p && (
          <dl className="tw-read">
            <div><dt>Port</dt><dd>{p.name}</dd></div>
            <div><dt>Homes</dt><dd>{p.online} / {p.provisioned} online</dd></div>
            <div><dt>Receive</dt><dd>{p.rx == null ? '—' : `${p.rx} dBm`}</dd></div>
            <div><dt>Down · up</dt><dd>{p.down} % · {p.up} %</dd></div>
          </dl>
        )
      })()}
      legend={<>
        <Key tone={TW.green}>online</Key><Key tone={TW.amber} hollow>offline</Key><Key tone={TW.red}>loss of signal</Key>
        <Key tone="var(--tw-cyan)">downstream</Key><Key tone="var(--tw-s2)">upstream</Key>
      </>}>
      {uplinks.map((u, i) => {
        const y = 150 + i * 220
        const d = `M${olt.x},${y} L70,${y}`
        const bad = u.status !== 'Active'
        return (
          <g key={i}>
            <path d={d} className={'tw-fibre' + (bad ? ' is-bad' : '')} style={{ stroke: bad ? TW.red : 'var(--tw-s3)' }} />
            {on['Light flow'] && !bad && <Packets d={d} n={3} dur={2.4} tone="var(--tw-s3)" reverse />}
            <circle cx="56" cy={y} r="13" style={{ fill: 'var(--tw-bg)', stroke: bad ? TW.red : 'var(--tw-s3)' }} strokeWidth="2.5" />
            <text x="56" y={y + 32} textAnchor="middle" className="tw-lbl">{u.nodeZ}</text>
            <text x="56" y={y + 46} textAnchor="middle" className="tw-lbl tw-lbl--dim">{u.portA} · {i ? '10' : '100'} GE</text>
          </g>
        )
      })}
      <rect x={olt.x} y={olt.y} width={olt.w} height={olt.h} rx="10" className="tw-box" />
      <text x={olt.x + olt.w / 2} y={olt.y - 14} textAnchor="middle" className="tw-lbl">OLT · {tech}</text>

      {ports.map((p, i) => {
        const y = rowY(i)
        const picked = pick === p.id
        const tone = p.los ? TW.red : p.flag ? TW.amber : TW.green
        const feeder = `M${olt.x + olt.w},${y} C${olt.x + olt.w + 90},${y} ${spX - 90},${y} ${spX - 12},${y}`
        const shown = on['Offline only'] ? p.onts.map(s => (s === 'on' ? 'dim' : s)) : p.onts
        return (
          <g key={p.id} className={'tw-hit' + (picked ? ' is-picked' : '')} onClick={() => onPick(p.id)}>
            <rect x={olt.x - 6} y={y - 24} width={W - olt.x - 10} height="48" rx="8" className="tw-rowhit" />
            <circle cx={olt.x + olt.w - 16} cy={y} r="5" style={{ fill: tone }} className={p.los || p.flag ? 'tw-blink' : ''} />
            <text x={olt.x + 14} y={y + 4} className="tw-lbl">{p.name}</text>
            <path d={feeder} className={'tw-fibre' + (p.los ? ' is-bad' : '')} style={{ stroke: p.los ? TW.red : 'var(--tw-line-hi)' }} />
            {p.los && <path d={`M${(olt.x + olt.w + spX) / 2 - 6},${y - 6} l12,12 M${(olt.x + olt.w + spX) / 2 + 6},${y - 6} l-12,12`} style={{ stroke: TW.red }} strokeWidth="2.5" />}
            {on['Light flow'] && !p.los && <>
              <Packets d={feeder} n={Math.max(1, Math.round(p.down / 25))} dur={2.6} tone="var(--tw-cyan)" r={2.2} />
              <Packets d={feeder} n={Math.max(1, Math.round(p.up / 30))} dur={3.4} tone="var(--tw-s2)" r={1.8} reverse />
            </>}
            <path d={`M${spX - 12},${y} L${spX + 10},${y - 11} L${spX + 10},${y + 11} Z`} className="tw-amp" style={{ stroke: p.los ? TW.red : 'var(--tw-dim)' }} />
            <text x={spX} y={y - 16} textAnchor="middle" className="tw-tick">1:32</text>
            {shown.map((s, k) => {
              if (s === 'empty') return <circle key={k} cx={dotX + (k % 16) * pitch} cy={y - 7 + Math.floor(k / 16) * 14} r="2" className="tw-ont-empty" />
              const cxk = dotX + (k % 16) * pitch, cyk = y - 7 + Math.floor(k / 16) * 14
              return s === 'on' ? <circle key={k} cx={cxk} cy={cyk} r="4" style={{ fill: TW.green }} className="tw-ont" />
                : s === 'dim' ? <circle key={k} cx={cxk} cy={cyk} r="3" style={{ fill: 'var(--tw-faint)' }} />
                  : s === 'los' ? <circle key={k} cx={cxk} cy={cyk} r="4" style={{ fill: TW.red }} className="tw-blink" />
                    : <circle key={k} cx={cxk} cy={cyk} r="3.4" style={{ fill: 'none', stroke: TW.amber }} strokeWidth="1.6" />
            })}
            <g transform={`translate(${dotX + 16 * pitch + 22},${y})`}>
              <text y="-3" className="tw-lbl">{p.online}/{p.provisioned} homes</text>
              <text y="12" className="tw-lbl tw-lbl--dim">{p.los ? 'feeder LOS' : `${p.rx} dBm · ${p.distKm} km`}</text>
              <rect x="112" y="-7" width="70" height="8" rx="4" className="tw-meter" />
              <rect x="112" y="-7" width={Math.max(2, (p.down / 100) * 70)} height="8" rx="4" style={{ fill: 'var(--tw-cyan)' }} />
              <text x="188" y="1" className="tw-tick">{p.down} %</text>
            </g>
          </g>
        )
      })}
    </Frame>
  )
}

// =========================================================================

function IpStage({ t, pick, onPick }) {
  const { cards, peers } = t.stage
  const [on, toggle] = useLayers({ Flows: true, 'Idle ports': true })
  const stageH = 360
  const cx0 = 40, cw = 470, rowH = Math.min(52, 280 / Math.max(1, cards.length))
  const fab = { x: 640, y: 180 }
  const peerY = i => 50 + i * (260 / Math.max(1, peers.length - 1 || 1))

  return (
    <Frame height={stageH} title={t.stageTitle} note={t.stageNote} layers={Object.keys(on)} on={on} toggle={toggle}
      hud={(() => {
        const p = peers.find(x => x.id === pick)
        return p && (
          <dl className="tw-read">
            <div><dt>Link</dt><dd>{p.port}</dd></div>
            <div><dt>Far end</dt><dd>{p.name}</dd></div>
            <div><dt>Load</dt><dd>{p.gbps} G of {p.cap} G</dd></div>
            <div><dt>Latency</dt><dd>{p.latency}</dd></div>
          </dl>
        )
      })()}
      legend={<>
        <Key tone={TW.green}>up</Key><Key tone={TW.amber}>alarmed</Key><Key tone={TW.red}>down</Key><Key tone="var(--tw-faint)">idle</Key>
      </>}>
      <rect x={cx0 - 12} y={20} width={cw + 24} height={cards.length * rowH + 16} rx="12" className="tw-box" />
      {cards.map((c, ci) => {
        const y = 28 + ci * rowH
        const picked = pick === c.id
        const cols = 8
        return (
          <g key={c.id} className={'tw-hit' + (picked ? ' is-picked' : '')} onClick={() => onPick(c.id)}>
            <rect x={cx0} y={y} width={cw} height={rowH - 6} rx="6" className={'tw-card' + (c.flag ? ' is-flag' : '')} />
            <text x={cx0 + 12} y={y + 17} className="tw-lbl">{c.slot}</text>
            <text x={cx0 + 12} y={y + 31} className="tw-lbl tw-lbl--dim">{c.type.length > 22 ? c.type.slice(0, 21) + '…' : c.type}</text>
            {!c.line && (
              <text x={cx0 + 190} y={y + 24} className={'tw-lbl ' + (c.flag ? '' : 'tw-lbl--dim')} style={c.flag ? { fill: TW.red } : undefined}>
                {c.flag ? c.flag.label : 'common equipment · no traffic ports'}
              </text>
            )}
            {c.ports.map((p, k) => {
              if (p.state === 'idle' && !on['Idle ports']) return null
              const px = cx0 + 190 + (k % cols) * 34, py = y + 7 + Math.floor(k / cols) * ((rowH - 18) / 2)
              const tone = p.state === 'up' ? TW.green : p.state === 'warn' ? TW.amber : p.state === 'down' ? TW.red : 'var(--tw-faint)'
              return (
                <g key={k}>
                  <rect x={px} y={py} width="26" height={(rowH - 20) / 2} rx="2" className="tw-port" />
                  <rect x={px + 3} y={py + 3} width="6" height="4" rx="1"
                    className={p.state === 'up' ? (reduced || t.stale ? '' : 'tw-led') : p.state !== 'idle' ? 'tw-blink' : ''}
                    style={p.state === 'up'
                      ? { fill: tone, animationDelay: `${(k * 0.37 + ci * 0.21) % 2}s`, animationDuration: `${(0.6 + (100 - p.util) / 60).toFixed(2)}s` }
                      : { fill: tone }} />
                </g>
              )
            })}
          </g>
        )
      })}

      {/* Backplane into the fabric, fabric out to every peer. */}
      <path d={`M${cx0 + cw + 12},${fab.y} L${fab.x - 26},${fab.y}`} className="tw-bus" />
      {on.Flows && <Packets d={`M${cx0 + cw + 12},${fab.y} L${fab.x - 26},${fab.y}`} n={4} dur={1.6} tone="var(--tw-cyan)" />}
      <g>
        {!reduced && <circle cx={fab.x} cy={fab.y} r="26" className="tw-pulse" />}
        <circle cx={fab.x} cy={fab.y} r="26" className="tw-box" />
        <text x={fab.x} y={fab.y - 2} textAnchor="middle" className="tw-lbl">Fabric</text>
        <text x={fab.x} y={fab.y + 11} textAnchor="middle" className="tw-lbl tw-lbl--dim">{cards.filter(c => c.line).length} line cards</text>
      </g>
      {peers.map((p, i) => {
        const y = peerY(i)
        const d = `M${fab.x + 26},${fab.y} C${fab.x + 110},${fab.y} ${780},${y} ${838},${y}`
        const tone = TW[p.tone]
        const picked = pick === p.id
        return (
          <g key={p.id} className={'tw-hit' + (picked ? ' is-picked' : '')} onClick={() => onPick(p.id)}>
            <path d={d} className={'tw-link' + (p.bad ? ' is-bad' : '')} style={{ stroke: tone, strokeWidth: p.bad ? 2 : 1.5 + Math.log2(1 + p.gbps) * 1.4 }} />
            {on.Flows && !p.bad && <Packets d={d} n={Math.max(1, Math.round(p.util / 22))} dur={Math.max(1, 3 - p.util / 50)} tone={tone} r={2.4} />}
            <rect x="840" y={y - 22} width="140" height="44" rx="8" className={'tw-peer' + (picked ? ' is-picked' : '')} style={{ stroke: tone }} />
            <text x="852" y={y - 6} className="tw-lbl">{p.name}</text>
            <text x="852" y={y + 8} className="tw-lbl tw-lbl--dim">{p.role.replace(' — ', ' · ')}</text>
            <rect x="852" y={y + 13} width="116" height="4" rx="2" className="tw-meter" />
            <rect x="852" y={y + 13} width={Math.max(2, (p.util / 100) * 116)} height="4" rx="2" style={{ fill: tone }} />
          </g>
        )
      })}
    </Frame>
  )
}

export default function NodeTwin(props) {
  const Stage = { ran: RanStage, dwdm: DwdmStage, pon: PonStage, ip: IpStage }[props.t.flavour]
  return <StaleCtx.Provider value={props.t.stale}><Stage {...props} /></StaleCtx.Provider>
}
