import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNodeView, NodeLink } from '../nodeView.jsx'
import {
  networkElements,
  domains,
  regions,
} from '../data.js'
import { IcRack, IcConn, IcPulse, IcDevice } from './Icons.jsx'

export default function NocDashboard({ currentNode = '' } = {}) {
  const openNode = useNodeView()
  const [search, setSearch] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('All')
  const [selectedSev, setSelectedSev] = useState('All')
  const [selectedRegion, setSelectedRegion] = useState('All')
  const [page, setPage] = useState(1)

  const pageSize = 15

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = networkElements.length
    const crit = networkElements.filter(n => n.sev === 'Critical').length
    const major = networkElements.filter(n => n.sev === 'Major').length
    const minor = networkElements.filter(n => n.sev === 'Minor').length
    const warn = networkElements.filter(n => n.sev === 'Warning').length
    const clear = networkElements.filter(n => n.sev === 'Clear' || !n.alerting).length
    return { total, crit, major, minor, warn, clear }
  }, [])

  // Filtered Network Elements
  const filteredElements = useMemo(() => {
    return networkElements.filter(n => {
      if (selectedDomain !== 'All' && n.domain !== selectedDomain) return false
      if (selectedSev !== 'All') {
        if (selectedSev === 'Clear' && n.alerting) return false
        if (selectedSev !== 'Clear' && n.sev !== selectedSev) return false
      }
      if (selectedRegion !== 'All' && n.region !== selectedRegion) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = n.name.toLowerCase().includes(q)
        const matchCity = n.city.toLowerCase().includes(q)
        const matchVendor = n.vendor.toLowerCase().includes(q)
        const matchKind = n.kind.toLowerCase().includes(q)
        return matchName || matchCity || matchVendor || matchKind
      }
      return true
    })
  }, [selectedDomain, selectedSev, selectedRegion, search])

  // Paginated Slice
  const totalPages = Math.ceil(filteredElements.length / pageSize) || 1
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredElements.slice(start, start + pageSize)
  }, [filteredElements, page])

  const sevToneClass = s => {
    if (s === 'Critical') return 'pill red'
    if (s === 'Major') return 'pill amber'
    if (s === 'Minor') return 'pill blue'
    if (s === 'Warning') return 'pill purple'
    return 'pill green'
  }

  return (
    <div className="noc-app">
      {/* Main Content Area */}
      <main className="noc-content">

        {/* Hero Section: 4 Digital Twin Domains */}
        <section className="noc-hero-sec">
          <div className="noc-sec-header">
            <div>
              <h2>Assurance Digital Twins · Domain Showcase</h2>
              <p>
                Each equipment architecture renders a domain-tailored interactive twin with live hardware telemetry, KPIs, alarm timeline &amp; GIS topology.
              </p>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3, #71717a)', fontFamily: 'JetBrains Mono' }}>
              4 DOMAINS MONITORED
            </span>
          </div>

          <div className="noc-twin-cards">
            {/* Card 1: RAN Site Twin */}
            <div className="noc-twin-card noc-twin-card--ran">
              <div className="noc-twin-card__glow" />
              <div className="noc-twin-card__head">
                <div className="noc-twin-card__icon">
                  <IcConn size={24} />
                </div>
                <span className="noc-twin-card__domain">RAN Domain</span>
              </div>
              <div className="noc-twin-card__body">
                <h3>Radio Access Twin</h3>
                <p>
                  Sectors from live cells, antenna lobe geometry with PRB traffic load, bearing angles, and neighbour handovers.
                </p>
                <div className="noc-twin-card__sample">
                  <span className="noc-sample-node">DEL-GNB-004</span>
                  <span className="noc-sample-loc">Delhi · Huawei gNodeB</span>
                </div>
              </div>
              <div className="noc-twin-card__foot">
                <button
                  type="button"
                  className="noc-btn noc-btn--primary"
                  onClick={() => openNode('DEL-GNB-004')}
                >
                  Inspect Twin
                </button>
                <button
                  type="button"
                  className="noc-btn"
                  onClick={() => openNode('DEL-GNB-004')}
                  title="Inspect node twin in popup"
                >
                  Direct Page
                </button>
              </div>
            </div>

            {/* Card 2: DWDM Optical Line System */}
            <div className="noc-twin-card noc-twin-card--dwdm">
              <div className="noc-twin-card__glow" />
              <div className="noc-twin-card__head">
                <div className="noc-twin-card__icon">
                  <IcPulse size={24} />
                </div>
                <span className="noc-twin-card__domain">Optical DWDM</span>
              </div>
              <div className="noc-twin-card__body">
                <h3>DWDM Line System</h3>
                <p>
                  Every lit C-band wavelength with its OSNR, ROADM degrees, optical amplifiers, and span attenuations.
                </p>
                <div className="noc-twin-card__sample">
                  <span className="noc-sample-node">DEL-DWM-010</span>
                  <span className="noc-sample-loc">Delhi · ACME ROADM</span>
                </div>
              </div>
              <div className="noc-twin-card__foot">
                <button
                  type="button"
                  className="noc-btn noc-btn--primary"
                  onClick={() => openNode('DEL-DWM-010')}
                >
                  Inspect Twin
                </button>
                <button
                  type="button"
                  className="noc-btn"
                  onClick={() => openNode('DEL-DWM-010')}
                  title="Inspect node twin in popup"
                >
                  Direct Page
                </button>
              </div>
            </div>

            {/* Card 3: PON Access Tree */}
            <div className="noc-twin-card noc-twin-card--pon">
              <div className="noc-twin-card__glow" />
              <div className="noc-twin-card__head">
                <div className="noc-twin-card__icon">
                  <IcDevice size={24} />
                </div>
                <span className="noc-twin-card__domain">FTTH Access</span>
              </div>
              <div className="noc-twin-card__body">
                <h3>PON Access Tree</h3>
                <p>
                  Each OLT PON port, optical feeder, 1:32 optical splitters, and subscriber subscriber drop lines.
                </p>
                <div className="noc-twin-card__sample">
                  <span className="noc-sample-node">DEL-OLT-001</span>
                  <span className="noc-sample-loc">Delhi · ACME OLT</span>
                </div>
              </div>
              <div className="noc-twin-card__foot">
                <button
                  type="button"
                  className="noc-btn noc-btn--primary"
                  onClick={() => openNode('DEL-OLT-001')}
                >
                  Inspect Twin
                </button>
                <button
                  type="button"
                  className="noc-btn"
                  onClick={() => openNode('DEL-OLT-001')}
                  title="Inspect node twin in popup"
                >
                  Direct Page
                </button>
              </div>
            </div>

            {/* Card 4: IP Chassis */}
            <div className="noc-twin-card noc-twin-card--ip">
              <div className="noc-twin-card__glow" />
              <div className="noc-twin-card__head">
                <div className="noc-twin-card__icon">
                  <IcRack size={24} />
                </div>
                <span className="noc-twin-card__domain">IP Transport</span>
              </div>
              <div className="noc-twin-card__body">
                <h3>Packet Chassis Twin</h3>
                <p>
                  Modular line cards, active port LEDs, switch fabric, and egress throughput heat across core links.
                </p>
                <div className="noc-twin-card__sample">
                  <span className="noc-sample-node">KOL-CRT-008</span>
                  <span className="noc-sample-loc">Kolkata · OKI Router</span>
                </div>
              </div>
              <div className="noc-twin-card__foot">
                <button
                  type="button"
                  className="noc-btn noc-btn--primary"
                  onClick={() => openNode('KOL-CRT-008')}
                >
                  Inspect Twin
                </button>
                <button
                  type="button"
                  className="noc-btn"
                  onClick={() => openNode('KOL-CRT-008')}
                  title="Inspect node twin in popup"
                >
                  Direct Page
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Live Metrics Strip */}
        <div className="noc-stats-strip">
          <div className="noc-stat-box">
            <span className="noc-stat-box__label">Total Elements</span>
            <span className="noc-stat-box__val">{stats.total.toLocaleString()}</span>
            <span className="noc-stat-box__sub">Across North, South, East, West</span>
          </div>

          <div className="noc-stat-box">
            <span className="noc-stat-box__label" style={{ color: 'var(--red, #f43f5e)' }}>Critical Alarms</span>
            <span className="noc-stat-box__val" style={{ color: 'var(--red, #f43f5e)' }}>{stats.crit}</span>
            <span className="noc-stat-box__sub">Service impacting outages</span>
          </div>

          <div className="noc-stat-box">
            <span className="noc-stat-box__label" style={{ color: 'var(--amber, #f59e0b)' }}>Major Degradations</span>
            <span className="noc-stat-box__val" style={{ color: 'var(--amber, #f59e0b)' }}>{stats.major}</span>
            <span className="noc-stat-box__sub">High priority investigation</span>
          </div>

          <div className="noc-stat-box">
            <span className="noc-stat-box__label" style={{ color: 'var(--blue, #3b82f6)' }}>Minor &amp; Warnings</span>
            <span className="noc-stat-box__val" style={{ color: 'var(--blue, #3b82f6)' }}>{stats.minor + stats.warn}</span>
            <span className="noc-stat-box__sub">Advisory threshold breaches</span>
          </div>

          <div className="noc-stat-box">
            <span className="noc-stat-box__label" style={{ color: 'var(--green, #10b981)' }}>Clear &amp; Normal</span>
            <span className="noc-stat-box__val" style={{ color: 'var(--green, #10b981)' }}>{stats.clear.toLocaleString()}</span>
            <span className="noc-stat-box__sub">Healthy operational state</span>
          </div>
        </div>

        {/* Inventory Explorer */}
        <section className="noc-explorer">
          {/* Toolbar */}
          <div className="noc-explorer__toolbar">
            <div className="noc-search-box">
              <svg className="noc-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by Node ID, City, Vendor, Kind (e.g. KOL-CRT, Delhi, Nokia)..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <div className="noc-filters">
              {/* Domain Chips */}
              <div className="noc-filter-group">
                <button
                  type="button"
                  className={'noc-filter-chip ' + (selectedDomain === 'All' ? 'is-active' : '')}
                  onClick={() => { setSelectedDomain('All'); setPage(1); }}
                >
                  All Domains
                </button>
                {['Transport', 'RAN', 'Core', 'Fiber'].map(d => (
                  <button
                    key={d}
                    type="button"
                    className={'noc-filter-chip ' + (selectedDomain === d ? 'is-active' : '')}
                    onClick={() => { setSelectedDomain(d); setPage(1); }}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Severity Select */}
              <select
                className="noc-select"
                value={selectedSev}
                onChange={e => { setSelectedSev(e.target.value); setPage(1); }}
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
                <option value="Warning">Warning</option>
                <option value="Clear">Clear</option>
              </select>

              {/* Region Select */}
              <select
                className="noc-select"
                value={selectedRegion}
                onChange={e => { setSelectedRegion(e.target.value); setPage(1); }}
              >
                <option value="All">All Regions</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="noc-table-wrap">
            <table className="noc-table">
              <thead>
                <tr>
                  <th>Element ID</th>
                  <th>Kind &amp; Domain</th>
                  <th>Location</th>
                  <th>Vendor</th>
                  <th>Health Status</th>
                  <th>Condition / Alarm</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3, #71717a)' }}>
                      No network elements match the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <NodeLink name={item.name} className="noc-node-btn" style={{ color: '#0284c7' }} />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="noc-tag-kind">{item.kind}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-3, #71717a)' }}>{item.domain}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{item.city}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3, #71717a)', marginLeft: 6 }}>
                          {item.region} ({item.lat.toFixed(2)}, {item.lng.toFixed(2)})
                        </span>
                      </td>
                      <td>
                        <span>{item.vendor}</span>
                      </td>
                      <td>
                        <span className={sevToneClass(item.sev)}>
                          {item.sev}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: item.alerting ? 'var(--text, #0f172a)' : 'var(--text-3, #64748b)' }}>
                          {item.condition || '— Nominal operations —'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="noc-btn"
                            style={{ padding: '4px 10px', fontSize: 11.5 }}
                            onClick={() => openNode(item.name)}
                          >
                            Inspect Twin
                          </button>
                          <Link
                            to={`/node/${item.name}`}
                            className="noc-btn"
                            style={{ padding: '4px 8px', fontSize: 11.5 }}
                            title="Direct permalink route"
                          >
                            ↗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="noc-table-pagination">
            <span>
              Showing {filteredElements.length === 0 ? 0 : (page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filteredElements.length)} of {filteredElements.length} elements
            </span>
            <div className="noc-pagination-controls">
              <button
                type="button"
                className="noc-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="noc-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
