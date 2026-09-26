import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NetworkHierarchyTopology from '../components/topology/NetworkHierarchyTopology';
import '../styles/shell.css';
import '../styles/topology.css';

/* ── Coverage by circle dataset ───────────────────────────────────────── */
interface CoverageCircle {
  code: string;
  name: string;
  dc: number;
  pop: number;
  sites: number;
  total: number;
  onAirPct: number;
  failed: number;
  severity: 'blocked' | 'delayed' | 'risk' | 'clean';
}

const COVERAGE_CIRCLES: CoverageCircle[] = [
  { code: 'OTH', name: 'Other circles', dc: 3, pop: 25, sites: 227, total: 255, onAirPct: 67, failed: 3, severity: 'blocked' },
  { code: 'MH',  name: 'Maharashtra',   dc: 4, pop: 32, sites: 212, total: 248, onAirPct: 70, failed: 5, severity: 'blocked' },
  { code: 'UP',  name: 'Uttar Pradesh', dc: 3, pop: 27, sites: 191, total: 221, onAirPct: 71, failed: 7, severity: 'blocked' },
  { code: 'KA',  name: 'Karnataka',     dc: 3, pop: 26, sites: 182, total: 211, onAirPct: 76, failed: 3, severity: 'blocked' },
  { code: 'MP',  name: 'Madhya Pradesh',dc: 2, pop: 24, sites: 168, total: 194, onAirPct: 61, failed: 5, severity: 'blocked' },
  { code: 'DL',  name: 'Delhi',         dc: 3, pop: 22, sites: 151, total: 176, onAirPct: 79, failed: 3, severity: 'blocked' },
  { code: 'TN',  name: 'Tamil Nadu',    dc: 2, pop: 19, sites: 133, total: 154, onAirPct: 73, failed: 4, severity: 'blocked' },
  { code: 'GJ',  name: 'Gujarat',       dc: 2, pop: 18, sites: 132, total: 152, onAirPct: 68, failed: 1, severity: 'blocked' },
  { code: 'AP',  name: 'Andhra Pradesh',dc: 2, pop: 17, sites: 124, total: 143, onAirPct: 67, failed: 3, severity: 'blocked' },
];

export default function Location() {
  const nav = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCircle, setExpandedCircle] = useState<string | null>(null);

  const toggleCircle = (code: string) => {
    setExpandedCircle(c => c === code ? null : code);
  };

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ── Top 4 KPI Progress Cards ─────────────────────────────── */}
      <section className="vw-grid vw-grid-cols-4 vw-gap-md" style={{ marginBottom: '24px' }}>
        {/* Total locations */}
        <div className="kpi-progress" style={{ borderColor: 'var(--vw-color-slate-200)', background: '#fff' }}>
          <div className="vw-card-metric-label kprog-label">Total locations</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">1,754</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>1,232 on-air</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '1.37%', background: '#a855f7' }} title="Datacenters: 24" />
            <span style={{ width: '11.97%', background: '#0284c7' }} title="PoP locations: 210" />
            <span style={{ width: '86.66%', background: '#0d9488' }} title="Sites: 1,520" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#a855f7' }} />24 datacenters</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0284c7' }} />210 pop locations</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0d9488' }} />1,520 sites</span>
          </div>
        </div>

        {/* Datacenters */}
        <div className="kpi-progress" style={{ borderColor: 'var(--vw-color-purple-200)', background: '#fff' }}>
          <div className="vw-card-metric-label kprog-label">Datacenters</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">24</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>88% on-air · 0 failed</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '87.5%', background: '#10b981' }} title="On-air: 21" />
            <span style={{ width: '8.33%', background: '#f59e0b' }} title="In progress: 2" />
            <span style={{ width: '4.17%', background: '#0ea5e9' }} title="Planned: 1" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981' }} />21 on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b' }} />2 in progress</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9' }} />1 planned</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444' }} />0 failed</span>
          </div>
        </div>

        {/* PoP locations */}
        <div className="kpi-progress" style={{ borderColor: 'var(--vw-color-sky-200)', background: '#fff' }}>
          <div className="vw-card-metric-label kprog-label">PoP locations</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">210</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>79% on-air · 3 failed</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '78.57%', background: '#10b981' }} title="On-air: 165" />
            <span style={{ width: '12.86%', background: '#f59e0b' }} title="In progress: 27" />
            <span style={{ width: '7.14%', background: '#0ea5e9' }} title="Planned: 15" />
            <span style={{ width: '1.43%', background: '#ef4444' }} title="Failed: 3" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981' }} />165 on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b' }} />27 in progress</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9' }} />15 planned</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444' }} />3 failed</span>
          </div>
        </div>

        {/* Sites */}
        <div className="kpi-progress" style={{ borderColor: 'var(--vw-color-teal-200)', background: '#fff' }}>
          <div className="vw-card-metric-label kprog-label">Sites</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">1,520</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>69% on-air · 31 failed</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '68.82%', background: '#10b981' }} title="On-air: 1,046" />
            <span style={{ width: '13.62%', background: '#f59e0b' }} title="In progress: 207" />
            <span style={{ width: '15.53%', background: '#0ea5e9' }} title="Planned: 236" />
            <span style={{ width: '2.03%', background: '#ef4444' }} title="Failed: 31" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981' }} />1,046 on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b' }} />207 in progress</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9' }} />236 planned</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444' }} />31 failed</span>
          </div>
        </div>
      </section>

      {/* ── Network Hierarchy & Coverage By Circle ──────────────── */}
      <section style={{ marginBottom: '24px' }}>
        {isExpanded ? (
          /* Full width layout when expanded */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid var(--vw-color-slate-200)' }}>
              <div className="row vw-justify-between vw-items-start" style={{ marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
                    Network hierarchy
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--vw-color-gray-500)' }}>
                    Interactive service topology drill-down · Regions, Territories, Network Elements &amp; Interfaces
                  </p>
                </div>
                <button
                  type="button"
                  className="nst-btn nst-btn--xs"
                  onClick={() => setIsExpanded(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  ⤡ Collapse
                </button>
              </div>
              <NetworkHierarchyTopology
                isExpanded={true}
                onNavigateToSite={id => nav(`/inventory/location/site/${id}/details`)}
              />
            </div>

            {/* Coverage by circle below it */}
            <div className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid var(--vw-color-slate-200)' }}>
              <div className="row vw-justify-between vw-items-start" style={{ marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
                    Coverage by circle
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--vw-color-gray-500)' }}>
                    ranked by total · click a circle for rollout detail
                  </p>
                </div>
              </div>
              <CoverageTable circles={COVERAGE_CIRCLES} expandedCircle={expandedCircle} onToggleCircle={toggleCircle} />
            </div>
          </div>
        ) : (
          /* Side by side layout when collapsed */
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '20px', alignItems: 'stretch' }}>
            {/* Left Card: Network Hierarchy */}
            <div className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid var(--vw-color-slate-200)', display: 'flex', flexDirection: 'column' }}>
              <div className="row vw-justify-between vw-items-start" style={{ marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
                    Network hierarchy
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--vw-color-gray-500)' }}>
                  </p>
                </div>
                <button
                  type="button"
                  className="nst-btn nst-btn--xs"
                  onClick={() => setIsExpanded(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  ⤢ Expand
                </button>
              </div>
              <div style={{ flex: '1 1 auto', minHeight: 0 }}>
                <NetworkHierarchyTopology
                  isExpanded={false}
                  onNavigateToSite={id => nav(`/inventory/location/site/${id}/details`)}
                />
              </div>
            </div>

            {/* Right Card: Coverage by circle */}
            <div className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid var(--vw-color-slate-200)', display: 'flex', flexDirection: 'column' }}>
              <div className="row vw-justify-between vw-items-start" style={{ marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
                    Coverage by circle
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--vw-color-gray-500)' }}>
                    ranked by total · click a circle for rollout detail
                  </p>
                </div>
              </div>
              <div className="cov-scroll" style={{ flex: '1 1 auto', overflowY: 'auto' }}>
                <CoverageTable circles={COVERAGE_CIRCLES} expandedCircle={expandedCircle} onToggleCircle={toggleCircle} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Inventory Across The Estate ──────────────────────────── */}
      <section className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid var(--vw-color-slate-200)', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
            Inventory across the estate
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--vw-color-gray-500)' }}>
            everything this module tracks against these locations — active, logical and passive
          </p>
        </div>

        <div className="vw-grid vw-grid-cols-3 vw-gap-md">
          {/* Active inventory */}
          <div className="kpi-progress" style={{ borderColor: 'var(--vw-color-sky-200)' }}>
            <div className="row vw-gap-sm vw-items-center">
              <span className="cov-alert-icon" style={{ background: 'var(--vw-color-sky-50)', color: 'var(--vw-color-sky-600)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vw-card-metric-label">Active inventory</span>
                <span className="vw-card-metric-xl num">2,497</span>
              </div>
            </div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>
              Physical elements across the estate · 2,603 verified on the network
            </div>
            <div className="meter" style={{ height: '8px', marginTop: '12px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <span style={{ width: '86%', background: '#0284c7' }} title="Router: 2,148" />
              <span style={{ width: '14%', background: '#0ea5e9' }} title="Switch: 349" />
            </div>
            <div className="cov-chip-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>Router <b>2,148</b></span>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>Switch <b>349</b></span>
            </div>
          </div>

          {/* Logical inventory */}
          <div className="kpi-progress" style={{ borderColor: 'var(--vw-color-purple-200)' }}>
            <div className="row vw-gap-sm vw-items-center">
              <span className="cov-alert-icon" style={{ background: 'var(--vw-color-purple-50)', color: 'var(--vw-color-purple-600)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vw-card-metric-label">Logical inventory</span>
                <span className="vw-card-metric-xl num">6,732</span>
              </div>
            </div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>
              4,892 links and 1,840 provisioned services · plus 312 VNFs
            </div>
            <div className="meter" style={{ height: '8px', marginTop: '12px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <span style={{ width: '45%', background: '#a855f7' }} title="LLDP: 2,201" />
              <span style={{ width: '25%', background: '#0284c7' }} title="OSPF: 1,223" />
              <span style={{ width: '15%', background: '#06b6d4' }} title="BGP: 734" />
              <span style={{ width: '15%', background: '#0d9488' }} title="L3VPN: 1,361" />
            </div>
            <div className="cov-chip-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>LLDP <b>2,201</b></span>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>OSPF <b>1,223</b></span>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>L3VPN <b>1,361</b></span>
            </div>
          </div>

          {/* Passive inventory */}
          <div className="kpi-progress" style={{ borderColor: 'var(--vw-color-amber-200)' }}>
            <div className="row vw-gap-sm vw-items-center">
              <span className="cov-alert-icon" style={{ background: 'var(--vw-color-amber-50)', color: 'var(--vw-color-amber-600)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vw-card-metric-label">Passive inventory</span>
                <span className="vw-card-metric-xl num">1,420</span>
              </div>
            </div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>
              Physical plant across 7 categories
            </div>
            <div className="meter" style={{ height: '8px', marginTop: '12px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <span style={{ width: '35%', background: '#f59e0b' }} title="ODF: 497" />
              <span style={{ width: '30%', background: '#64748b' }} title="Racks: 426" />
              <span style={{ width: '20%', background: '#06b6d4' }} title="Fiber spans: 284" />
              <span style={{ width: '15%', background: '#a855f7' }} title="Splice closures: 213" />
            </div>
            <div className="cov-chip-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>ODF <b>497</b></span>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>Racks <b>426</b></span>
              <span className="cov-chip inv-chip" style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>Fiber <b>284</b></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Coverage Table Sub-Component ─────────────────────────────────────── */
function CoverageTable({
  circles,
  expandedCircle,
  onToggleCircle
}: {
  circles: CoverageCircle[];
  expandedCircle: string | null;
  onToggleCircle: (code: string) => void;
}) {
  return (
    <div className="tbl-wrap">
      <table className="nst-table cov-table" style={{ width: '100%', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--vw-color-slate-200)', color: 'var(--vw-color-gray-500)', textAlign: 'left' }}>
            <th style={{ width: '34%', padding: '10px 12px' }}>Circle</th>
            <th className="t-right" style={{ width: '9%', padding: '10px 8px', textAlign: 'right' }}>DC</th>
            <th className="t-right" style={{ width: '9%', padding: '10px 8px', textAlign: 'right' }}>PoP</th>
            <th className="t-right" style={{ width: '10%', padding: '10px 8px', textAlign: 'right' }}>Sites</th>
            <th className="t-right" style={{ width: '10%', padding: '10px 8px', textAlign: 'right' }}>Total</th>
            <th style={{ width: '18%', padding: '10px 12px' }}>On-air</th>
            <th className="t-right" style={{ width: '10%', padding: '10px 8px', textAlign: 'right' }}>Failed</th>
          </tr>
        </thead>
        <tbody>
          {circles.map(c => {
            const isOpen = expandedCircle === c.code;
            return (
              <tr
                key={c.code}
                className={isOpen ? 'is-open' : ''}
                onClick={() => onToggleCircle(c.code)}
                style={{ cursor: 'pointer', borderBottom: '1px solid var(--vw-color-slate-100)' }}
              >
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--vw-color-gray-400)' }}>{isOpen ? '▼' : '▶'}</span>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: c.failed > 0 ? '#ef4444' : '#10b981',
                        flexShrink: 0
                      }}
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--vw-color-gray-400)' }}>
                      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span style={{ fontWeight: 500, color: 'var(--vw-color-gray-900)' }}>{c.name}</span>
                  </span>
                </td>
                <td className="t-right num" style={{ padding: '10px 8px', textAlign: 'right' }}>{c.dc}</td>
                <td className="t-right num" style={{ padding: '10px 8px', textAlign: 'right' }}>{c.pop}</td>
                <td className="t-right num" style={{ padding: '10px 8px', textAlign: 'right' }}>{c.sites}</td>
                <td className="t-right num" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{c.total}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '56px', height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${c.onAirPct}%`, height: '100%', background: '#10b981', borderRadius: '999px' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--vw-color-gray-700)' }}>{c.onAirPct}%</span>
                  </div>
                </td>
                <td className="t-right num" style={{ padding: '10px 8px', textAlign: 'right', color: c.failed > 0 ? '#ef4444' : 'var(--vw-color-gray-400)', fontWeight: c.failed > 0 ? 600 : 400 }}>
                  {c.failed}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
