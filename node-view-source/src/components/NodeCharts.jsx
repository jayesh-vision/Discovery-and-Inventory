import { useState } from 'react'
import { HOURS, STATE_NAMES } from '../twin.js'

/**
 * The instruments around the twin. Every one is plain SVG sized by viewBox,
 * so it scales with its card rather than measuring it, and every one reads
 * the twin's own series — nothing here invents a number.
 */

const TONE = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--blue)', slate: 'var(--slate)' }
const SEV = { Critical: 'var(--red)', Major: 'var(--amber)', Minor: 'var(--blue)', Warning: 'var(--purple)', Info: 'var(--slate)' }

/* Two panels on one time axis: a stacked total above, per-series load below
   against its ceiling. Hovering either reads out the same hour in both. */
export function TrafficChart({ traffic }) {
  const [hover, setHover] = useState(null)
  const w = 640, top = 18, uh = 150, gap = 44, lh = 104, left = 44, right = 12
  const iw = w - left - right
  const x = i => left + (i / 23) * iw
  const up = traffic.upper.series
  /* Hours the element did not report are a gap, not a zero: the areas stop
     at the last reported hour and the rest is hatched as no data. */
  const reported = HOURS.map((_, i) => up.every(s => s.values[i] != null))
  const li = reported.lastIndexOf(true)
  const stack = HOURS.map((_, i) => up.reduce((acc, s) => { acc.push((acc[acc.length - 1] || 0) + (s.values[i] || 0)); return acc }, []))
  const umax = Math.max(...stack.filter((_, i) => reported[i]).map(s => s[s.length - 1]), 1) * 1.08
  const uy = v => top + uh - (v / umax) * uh
  const lo = traffic.lower
  const lvals = lo.series.flatMap(s => s.values).filter(v => v != null)
  const lmin = lo.floor ? Math.min(...lvals, lo.ceiling) * 0.85 : 0
  const lmax = Math.max(...lvals, lo.ceiling || 0) * 1.1
  const ly0 = top + uh + gap
  const ly = v => ly0 + lh - ((v - lmin) / (lmax - lmin || 1)) * lh
  const h = ly0 + lh + 26

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * w
    setHover(Math.max(0, Math.min(23, Math.round(((px - left) / iw) * 23))))
  }

  return (
    <div className="nk-traffic">
      <svg viewBox={`0 0 ${w} ${h}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
        aria-label={`${traffic.upper.title} and ${lo.title}, 24 hours`}>
        <text x={left} y={top - 6} className="nk-axis-t">{traffic.upper.title} ({traffic.upper.unit}) · {traffic.upper.note}</text>
        {[0, 0.5, 1].map(f => (
          <g key={f}>
            <line x1={left} x2={w - right} y1={uy(umax * f)} y2={uy(umax * f)} className="nk-grid" />
            <text x={left - 6} y={uy(umax * f) + 4} textAnchor="end" className="nk-tick">{Math.round(umax * f)}</text>
          </g>
        ))}
        <defs>
          <pattern id="nk-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" style={{ stroke: 'var(--border-strong)' }} strokeWidth="1.5" />
          </pattern>
        </defs>
        {li >= 0 && [...up].map((s, si) => {
          const upper = stack.slice(0, li + 1).map((st, i) => `${x(i).toFixed(1)},${uy(st[si]).toFixed(1)}`)
          const lower = stack.slice(0, li + 1).map((st, i) => `${x(i).toFixed(1)},${uy(si ? st[si - 1] : 0).toFixed(1)}`).reverse()
          return <path key={s.key} d={`M${upper.join(' L')} L${lower.join(' L')} Z`} style={{ fill: s.tone, fillOpacity: 0.82, stroke: s.tone }} strokeWidth="1" />
        }).reverse()}

        <text x={left} y={ly0 - 8} className="nk-axis-t">{lo.title} ({lo.unit}) · {lo.note}</text>
        {[lmin, (lmin + lmax) / 2, lmax].map((v, i) => (
          <g key={i}>
            <line x1={left} x2={w - right} y1={ly(v)} y2={ly(v)} className="nk-grid" />
            <text x={left - 6} y={ly(v) + 4} textAnchor="end" className="nk-tick">{Math.round(v)}</text>
          </g>
        ))}
        {lo.ceiling != null && <line x1={left} x2={w - right} y1={ly(lo.ceiling)} y2={ly(lo.ceiling)} className="nk-ceiling" />}
        {lo.series.map(s => (
          <path key={s.key} d={s.values.map((v, i) => (v == null ? '' : `${i && s.values[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${ly(v).toFixed(1)}`)).join(' ')}
            fill="none" style={{ stroke: s.tone }} strokeWidth="2" />
        ))}
        {li < 23 && (
          <g>
            <rect x={x(Math.max(0, li))} y={top} width={x(23) - x(Math.max(0, li))} height={ly0 + lh - top} className="nk-nodata" />
            <text x={x(Math.max(0, li)) - 6} y={top + 10} textAnchor="end" className="nk-nodata-t">No data →</text>
          </g>
        )}
        {HOURS.map((lbl, i) => i % 4 === 2 && <text key={i} x={x(i)} y={h - 6} textAnchor="middle" className="nk-tick">{lbl}</text>)}

        {hover != null && (
          <g className="nk-cross">
            <line x1={x(hover)} x2={x(hover)} y1={top} y2={ly0 + lh} />
            {lo.series.map(s => s.values[hover] != null && <circle key={s.key} cx={x(hover)} cy={ly(s.values[hover])} r="3.5" style={{ fill: s.tone }} />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="nk-tip" style={{ left: `${(x(hover) / w) * 100}%`, transform: hover > 16 ? 'translateX(-104%)' : 'translateX(4%)' }}>
          <b>{HOURS[hover]}</b>
          {up.map(s => <div key={s.key}><i style={{ background: s.tone }} />{s.label}<span>{s.values[hover] == null ? 'no data' : `${s.values[hover]} ${traffic.upper.unit}`}</span></div>)}
          <div className="nk-tip__sep" />
          {lo.series.map(s => <div key={s.key}><i style={{ background: s.tone }} />{s.label}<span>{s.values[hover] == null ? 'no data' : `${s.values[hover]} ${lo.unit}`}</span></div>)}
        </div>
      )}
      <div className="nk-legend">
        {up.map(s => <span key={s.key}><i style={{ background: s.tone }} />{s.label}</span>)}
      </div>
    </div>
  )
}

/* Five KPI families as rings, twenty-four hours round the clock. A ring that
   reddens for a stretch is a condition; a single red cell is an event. */
export function KpiWheel({ kpis }) {
  const [hover, setHover] = useState(null)
  const fam = kpis.slice(0, 5)
  const size = 380, c = size / 2, r0 = 52, ring = 20
  const seg = (ri, i) => {
    const a0 = ((i / 24) * 360 - 90 + 0.7) * Math.PI / 180, a1 = (((i + 1) / 24) * 360 - 90 - 0.7) * Math.PI / 180
    const ra = r0 + ri * (ring + 3), rb = ra + ring
    const p = (r, a) => `${(c + Math.cos(a) * r).toFixed(1)},${(c + Math.sin(a) * r).toFixed(1)}`
    return `M${p(ra, a0)} A${ra},${ra} 0 0 1 ${p(ra, a1)} L${p(rb, a1)} A${rb},${rb} 0 0 0 ${p(rb, a0)} Z`
  }
  const breached = HOURS.filter((_, i) => fam.some(k => k.states[i] === 4)).length
  const shownStates = STATE_NAMES.filter((_, i) => fam.some(k => k.states.includes(i)) || i < 5)
  const h = hover && fam[hover.ri]
  return (
    <div className="nk-wheel">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="24-hour KPI wheel" onMouseLeave={() => setHover(null)}>
        {fam.map((k, ri) => k.states.map((st, i) => (
          <path key={`${ri}-${i}`} d={seg(ri, i)} className={'nk-wheel__seg' + (hover && hover.ri === ri && hover.i === i ? ' is-on' : '')}
            style={{ fill: `var(--tw-st${st})` }} onMouseEnter={() => setHover({ ri, i })} />
        )))}
        {HOURS.map((lbl, i) => i % 3 === 0 && (() => {
          const a = ((i / 24) * 360 - 90 + 7.5) * Math.PI / 180, r = r0 + 5 * (ring + 3) + 10
          return <text key={i} x={c + Math.cos(a) * r} y={c + Math.sin(a) * r + 4} textAnchor="middle" className="nk-tick">{lbl.slice(0, 2)}</text>
        })())}
        <circle cx={c} cy={c} r={r0 - 6} className="nk-wheel__hub" />
        {h ? <>
          <text x={c} y={c - 12} textAnchor="middle" className="nk-wheel__k">{HOURS[hover.i]}</text>
          <text x={c} y={c + 6} textAnchor="middle" className="nk-wheel__v">{h.series[hover.i] == null ? '—' : h.series[hover.i].toFixed(h.dec)}</text>
          <text x={c} y={c + 22} textAnchor="middle" className="nk-wheel__k">{STATE_NAMES[h.states[hover.i]]}</text>
        </> : <>
          <text x={c} y={c + 8} textAnchor="middle" className="nk-wheel__big">{breached}</text>
          <text x={c} y={c + 24} textAnchor="middle" className="nk-wheel__k">breached hours</text>
        </>}
      </svg>
      <div className="nk-wheel__side">
        {/* The rings named, and what each one currently reads — a legend that
            only numbers them makes the reader go looking for the figures. */}
        <ol className="nk-wheel__rings">
          {fam.map((k, i) => (
            <li key={k.key} className={h === k ? 'is-on' : ''}>
              <b>{i + 1}</b>
              <span className="nk-wheel__nm">{k.label}</span>
              <span className={'nk-wheel__val is-' + k.tone}>
                {k.display}<small>{k.unit}</small>
              </span>
              <span className="nk-wheel__tgt">{k.dir} {k.targetDisplay}</span>
            </li>
          ))}
        </ol>
        <div className="nk-legend nk-legend--col">
          {shownStates.map(s => <span key={s}><i style={{ background: `var(--tw-st${STATE_NAMES.indexOf(s)})` }} />{s}</span>)}
        </div>
      </div>
    </div>
  )
}

export function AlarmTimeline({ timeline, onOpen }) {
  const { events, windowMins, label } = timeline
  if (!events.length) return <p className="muted nk-empty">Nothing was raised on this element in the last {label}.</p>
  const w = 1000, left = 150, right = 20, rowH = 22, top = 24
  const iw = w - left - right
  const x = mins => left + (1 - mins / windowMins) * iw
  const h = top + events.length * rowH + 30
  const ticks = windowMins === 1440 ? [1440, 1080, 720, 360, 0] : [10080, 8640, 7200, 5760, 4320, 2880, 1440, 0]
  const tickLbl = m => (m === 0 ? 'now' : windowMins === 1440 ? `−${m / 60} h` : `−${m / 1440} d`)
  return (
    <div className="nk-timeline">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Alarm timeline, ${label}`}>
        <text x={left} y="12" className="nk-axis-t">Arrow means still active · click a bar to inspect</text>
        {ticks.map(m => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={top - 4} y2={h - 24} className="nk-grid" />
            <text x={x(m)} y={h - 8} textAnchor="middle" className="nk-tick">{tickLbl(m)}</text>
          </g>
        ))}
        {events.map((e, i) => {
          const y = top + i * rowH
          const x0 = x(e.start), x1 = e.end == null ? w - right : x(e.end)
          const live = e.end == null
          return (
            <g key={e.id} className="nk-ev" onClick={() => onOpen(e.id)}>
              <text x={left - 10} y={y + 14} textAnchor="end" className="nk-ev__l">{e.name.length > 20 ? e.name.slice(0, 19) + '…' : e.name}</text>
              <rect x={left} y={y + 5} width={iw} height="12" rx="3" className="nk-ev__track" />
              <path d={live
                ? `M${x0},${y + 4} L${x1 - 8},${y + 4} L${x1},${y + 11} L${x1 - 8},${y + 18} L${x0},${y + 18} Z`
                : `M${x0},${y + 5} L${Math.max(x0 + 3, x1)},${y + 5} L${Math.max(x0 + 3, x1)},${y + 17} L${x0},${y + 17} Z`}
                style={{ fill: SEV[e.sev] || 'var(--slate)', opacity: live ? 1 : 0.4 }} />
            </g>
          )
        })}
      </svg>
      <div className="nk-legend">
        {['Critical', 'Major', 'Minor', 'Warning'].map(s => <span key={s}><i style={{ background: SEV[s] }} />{s}</span>)}
        <span className="muted">Faded bars have cleared.</span>
      </div>
    </div>
  )
}

/* The service path as a chain of hops. Particle density on each edge follows
   the load on the hop it feeds, so a hot hop is visibly busier. */
export function PathChain({ path }) {
  const total = path.budget.parts.reduce((a, p) => a + p.v, 0)
  return (
    <div className="nk-path">
      <div className="nk-path__row">
        {path.hops.map((hop, i) => {
          const pct = Math.min(100, Math.round((hop.used / hop.cap) * 100))
          const tone = pct > 85 ? 'red' : pct > 70 ? 'amber' : 'blue'
          return (
            <div key={hop.name} className="nk-path__cell">
              <div className={'nk-hop nk-hop--' + tone}>
                <b>{hop.name}</b>
                <span className="nk-hop__sub">{hop.sub}</span>
                <span className="nk-hop__bar"><i style={{ width: `${pct}%` }} /></span>
                <span className="nk-hop__u">{typeof hop.used === 'number' ? hop.used.toLocaleString('en-IN') : hop.used} {hop.unit.startsWith('%') ? hop.unit : `· ${hop.unit}`}</span>
              </div>
              {i < path.hops.length - 1 && (
                <div className="nk-edge">
                  <span className="nk-edge__l">{path.edges[i]}</span>
                  <span className="nk-edge__wire">
                    {(() => {
                      const next = path.hops[i + 1]
                      const n = Math.max(2, Math.round(Math.min(100, (next.used / next.cap) * 100) / 12))
                      return Array.from({ length: n }, (_, k) => <i key={k} style={{ animationDelay: `${(-k * 1.8) / n}s` }} />)
                    })()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="nk-budget">
        <div className="nk-budget__h">
          {path.budget.unit === 'ms' ? 'Round-trip budget' : 'Optical budget'} · {Math.round(total * 10) / 10} {path.budget.unit} used of {path.budget.target} {path.budget.unit}
        </div>
        <div className="nk-budget__bar">
          {path.budget.parts.map(p => (
            <span key={p.label} style={{ width: `${(p.v / Math.max(total, path.budget.target)) * 100}%`, background: p.tone }} title={`${p.label} ${p.v} ${path.budget.unit}`}>
              {p.label} {p.v} {path.budget.unit}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Heatmap({ heat, unit }) {
  const [hover, setHover] = useState(null)
  return (
    <div className="nk-heat" onMouseLeave={() => setHover(null)}>
      <div className="nk-heat__grid">
        {heat.map((row, di) => (
          <div key={row.day} className="nk-heat__row">
            <span className="nk-heat__d">{row.day}</span>
            {row.values.map((v, h) => (
              <i key={h} style={{ '--heat-a': `${Math.round(8 + v * 0.9)}%` }}
                className={hover && hover.di === di && hover.h === h ? 'is-on' : ''}
                onMouseEnter={() => setHover({ di, h, v })} />
            ))}
          </div>
        ))}
        <div className="nk-heat__row nk-heat__ax">
          <span />
          {Array.from({ length: 24 }, (_, h) => <em key={h}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</em>)}
        </div>
      </div>
      <div className="nk-heat__foot">
        {hover ? <span><b>{heat[hover.di].day} {String(hover.h).padStart(2, '0')}:00</b> · {hover.v} {unit}</span> : <span>{unit} · hover a cell</span>}
        <span className="nk-heat__scale"><i />low → high</span>
      </div>
    </div>
  )
}

export function Inspector({ item, note }) {
  if (!item) return <p className="muted">Click anything on the twin to inspect it.</p>
  return (
    <div className="nk-insp">
      <div className="nk-insp__h">
        <div>
          <div className="nk-insp__k">{item.kind}</div>
          <h4>{item.title}</h4>
          <div className="nk-insp__c mono">{item.code}</div>
        </div>
        <span className={'pill ' + item.tone}>{item.state}</span>
      </div>
      {note && <div className="nk-insp__note">{note}</div>}
      <p className="nk-insp__s">{item.summary}</p>
      <dl className="nk-insp__rows">
        {item.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <div className="nk-insp__bars">
        {item.bars.map(b => (
          <div key={b.label}>
            <div className="nk-insp__bl"><span>{b.label}</span><b>{b.display}</b></div>
            <span className="nk-insp__bt"><i style={{ width: `${Math.max(1, Math.min(100, (b.v / b.max) * 100))}%`, background: TONE[b.tone] || TONE.blue }} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}
