import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NetworkHierarchyTopology from '../components/topology/NetworkHierarchyTopology';
import LegacyView from '../legacy/LegacyView';
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
  { code: 'MH', name: 'Maharashtra', dc: 28, pop: 86, sites: 220, total: 334, onAirPct: 70, failed: 6, severity: 'blocked' },
  { code: 'OTH', name: 'Other circles', dc: 33, pop: 82, sites: 216, total: 331, onAirPct: 67, failed: 4, severity: 'blocked' },
  { code: 'KA', name: 'Karnataka', dc: 26, pop: 75, sites: 198, total: 299, onAirPct: 76, failed: 4, severity: 'blocked' },
  { code: 'UP', name: 'Uttar Pradesh', dc: 25, pop: 72, sites: 196, total: 293, onAirPct: 71, failed: 8, severity: 'blocked' },
  { code: 'DL', name: 'Delhi', dc: 22, pop: 65, sites: 174, total: 261, onAirPct: 79, failed: 3, severity: 'blocked' },
  { code: 'GJ', name: 'Gujarat', dc: 20, pop: 60, sites: 162, total: 242, onAirPct: 68, failed: 1, severity: 'blocked' },
  { code: 'TN', name: 'Tamil Nadu', dc: 18, pop: 55, sites: 148, total: 221, onAirPct: 73, failed: 4, severity: 'blocked' },
  { code: 'MP', name: 'Madhya Pradesh', dc: 18, pop: 55, sites: 148, total: 221, onAirPct: 61, failed: 5, severity: 'blocked' },
  { code: 'AP', name: 'Andhra Pradesh', dc: 16, pop: 50, sites: 132, total: 198, onAirPct: 67, failed: 1, severity: 'blocked' },
];

export default function Location() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [expandedCircle, setExpandedCircle] = useState<string | null>(null);

  const isListView = searchParams.get('view') === 'list';

  if (isListView) {
    return <LegacyView legacyKey="location" />;
  }

  const handleCardClick = (type?: string, label?: string) => {
    const params = new URLSearchParams();
    params.set('view', 'list');
    if (type) {
      params.set('type', type);
    }
    if (label) {
      params.set('drill', label);
    }
    nav(`/inventory/location?${params.toString()}`);
  };

  const toggleCircle = (code: string) => {
    setExpandedCircle(c => c === code ? null : code);
  };

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ── Top 4 KPI Progress Cards ─────────────────────────────── */}
      <section className="vw-grid vw-grid-cols-4 vw-gap-md" style={{ marginBottom: '0' }}>
        {/* Total locations */}
        <button
          type="button"
          className="kpi-progress is-clickable"
          style={{ borderColor: 'var(--vw-color-slate-200)', '--kpi-hover': 'var(--vw-color-slate-400)', background: '#fff' } as React.CSSProperties}
          onClick={() => handleCardClick(undefined, 'All locations')}
          aria-label="Total locations: 2,400 locations, 1,755 on-air"
        >
          <div className="vw-card-metric-label kprog-label">Total locations</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">2,400</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>1,755 on-air</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '8.58%', background: '#a855f7' }} title="Datacenters: 206" />
            <span style={{ width: '25%', background: '#0284c7' }} title="PoP locations: 600" />
            <span style={{ width: '66.42%', background: '#0d9488' }} title="Sites: 1,594" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#a855f7' }} />206 datacenters</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0284c7' }} />600 pop locations</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0d9488' }} />1,594 sites</span>
          </div>
        </button>

        {/* Datacenters */}
        <button
          type="button"
          className="kpi-progress is-clickable"
          style={{ borderColor: 'var(--vw-color-purple-200)', '--kpi-hover': 'var(--vw-color-purple-400)', background: '#fff' } as React.CSSProperties}
          onClick={() => handleCardClick('dc', 'Datacenters — filtered list')}
          aria-label="Datacenters: 206 locations, 88% on-air · 0 failed"
        >
          <div className="vw-card-metric-label kprog-label">Datacenters</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">206</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>88% on-air · 0 failed</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '87.86%', background: '#10b981' }} title="On-air: 181" />
            <span style={{ width: '8.25%', background: '#f59e0b' }} title="In progress: 17" />
            <span style={{ width: '3.88%', background: '#0ea5e9' }} title="Planned: 8" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981' }} />181 on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b' }} />17 in progress</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9' }} />8 planned</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444' }} />0 failed</span>
          </div>
        </button>

        {/* PoP locations */}
        <button
          type="button"
          className="kpi-progress is-clickable"
          style={{ borderColor: 'var(--vw-color-sky-200)', '--kpi-hover': 'var(--vw-color-sky-400)', background: '#fff' } as React.CSSProperties}
          onClick={() => handleCardClick('pop', 'PoP locations — filtered list')}
          aria-label="PoP locations: 600 locations, 79% on-air · 8 failed"
        >
          <div className="vw-card-metric-label kprog-label">PoP locations</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">600</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>79% on-air · 8 failed</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '79%', background: '#10b981' }} title="On-air: 474" />
            <span style={{ width: '12.83%', background: '#f59e0b' }} title="In progress: 77" />
            <span style={{ width: '6.83%', background: '#0ea5e9' }} title="Planned: 41" />
            <span style={{ width: '1.33%', background: '#ef4444' }} title="Failed: 8" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981' }} />474 on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b' }} />77 in progress</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9' }} />41 planned</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444' }} />8 failed</span>
          </div>
        </button>

        {/* Sites */}
        <button
          type="button"
          className="kpi-progress is-clickable"
          style={{ borderColor: 'var(--vw-color-teal-200)', '--kpi-hover': 'var(--vw-color-teal-400)', background: '#fff' } as React.CSSProperties}
          onClick={() => handleCardClick('site', 'Sites — filtered list')}
          aria-label="Sites: 1,594 locations, 69% on-air · 28 failed"
        >
          <div className="vw-card-metric-label kprog-label">Sites</div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
            <span className="vw-card-metric-xl num">1,594</span>
            <span className="vw-card-metric-label-sub">locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>69% on-air · 28 failed</div>
          <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ width: '69.01%', background: '#10b981' }} title="On-air: 1,100" />
            <span style={{ width: '13.61%', background: '#f59e0b' }} title="In progress: 217" />
            <span style={{ width: '15.62%', background: '#0ea5e9' }} title="Planned: 249" />
            <span style={{ width: '1.76%', background: '#ef4444' }} title="Failed: 28" />
          </div>
          <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981' }} />1,100 on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b' }} />217 in progress</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9' }} />249 planned</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444' }} />28 failed</span>
          </div>
        </button>
      </section>

      {/* ── Network Hierarchy & Coverage By Circle ──────────────── */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Network Hierarchy (Full Width) */}
          <div className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--vw-color-slate-200)' }}>
            <NetworkHierarchyTopology
              isExpanded={true}
              onNavigateToCity={(id: string, facility?: 'dc' | 'pop' | 'site') =>
                nav(`/inventory/location/city/${id}${facility ? `?facility=${facility}` : ''}`)
              }
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
          <div
            className="kpi-progress is-clickable"
            role="button"
            tabIndex={0}
            style={{ borderColor: 'var(--vw-color-sky-200)', '--kpi-hover': 'var(--vw-color-sky-400)' } as React.CSSProperties}
            onClick={() => nav('/inventory/physical')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav('/inventory/physical'); } }}
            aria-label="Active inventory: 3,421. Physical elements across the estate"
          >
            <div className="row vw-gap-sm vw-items-center">
              <span className="cov-alert-icon" style={{ background: 'var(--vw-color-sky-50)', color: 'var(--vw-color-sky-600)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vw-card-metric-label">Active inventory</span>
                <span className="vw-card-metric-xl num">3,421</span>
              </div>
            </div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>
              Physical elements across the estate · 3,567 verified on the network
            </div>
            <div className="meter" style={{ height: '8px', marginTop: '12px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <span style={{ width: '86%', background: '#0284c7' }} title="Router: 2,943" />
              <span style={{ width: '14%', background: '#0ea5e9' }} title="Switch: 478" />
            </div>
            <div className="cov-chip-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/physical?tab=router'); }}
                title="View Routers in inventory"
              >
                Router <b>2,943</b>
              </button>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/physical?tab=switch'); }}
                title="View Switches in inventory"
              >
                Switch <b>478</b>
              </button>
            </div>
          </div>

          {/* Logical inventory */}
          <div
            className="kpi-progress is-clickable"
            role="button"
            tabIndex={0}
            style={{ borderColor: 'var(--vw-color-purple-200)', '--kpi-hover': 'var(--vw-color-purple-400)' } as React.CSSProperties}
            onClick={() => nav('/inventory/virtual')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav('/inventory/virtual'); } }}
            aria-label="Logical inventory: 9,222. Virtual resources and services"
          >
            <div className="row vw-gap-sm vw-items-center">
              <span className="cov-alert-icon" style={{ background: 'var(--vw-color-purple-50)', color: 'var(--vw-color-purple-600)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vw-card-metric-label">Logical inventory</span>
                <span className="vw-card-metric-xl num">9,222</span>
              </div>
            </div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>
              6,705 links and 2,517 provisioned services · plus 428 VNFs
            </div>
            <div className="meter" style={{ height: '8px', marginTop: '12px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <span style={{ width: '40%', background: '#a855f7' }} title="LLDP: 3,015" />
              <span style={{ width: '22%', background: '#0284c7' }} title="OSPF: 1,675" />
              <span style={{ width: '13%', background: '#06b6d4' }} title="BGP: 1,006" />
              <span style={{ width: '18%', background: '#0d9488' }} title="L3VPN: 1,865" />
              <span style={{ width: '7%', background: '#7c3aed' }} title="L2VPN: 661" />
            </div>
            <div className="cov-chip-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/links?tab=lldp'); }}
                title="View LLDP links"
              >
                LLDP <b>3,015</b>
              </button>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/links?tab=ospf'); }}
                title="View OSPF links"
              >
                OSPF <b>1,675</b>
              </button>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/services?tab=l3vpn'); }}
                title="View L3VPN services"
              >
                L3VPN <b>1,865</b>
              </button>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/services?tab=l2vpn'); }}
                title="View L2VPN services"
              >
                L2VPN <b>661</b>
              </button>
            </div>
          </div>

          {/* Passive inventory */}
          <div
            className="kpi-progress is-clickable"
            role="button"
            tabIndex={0}
            style={{ borderColor: 'var(--vw-color-amber-200)', '--kpi-hover': 'var(--vw-color-amber-400)' } as React.CSSProperties}
            onClick={() => nav('/inventory/passive')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav('/inventory/passive'); } }}
            aria-label="Passive inventory: 1,945. Physical plant across 7 categories"
          >
            <div className="row vw-gap-sm vw-items-center">
              <span className="cov-alert-icon" style={{ background: 'var(--vw-color-amber-50)', color: 'var(--vw-color-amber-600)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vw-card-metric-label">Passive inventory</span>
                <span className="vw-card-metric-xl num">1,945</span>
              </div>
            </div>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>
              Physical plant across 7 categories
            </div>
            <div className="meter" style={{ height: '8px', marginTop: '12px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
              <span style={{ width: '35%', background: '#f59e0b' }} title="ODF: 680" />
              <span style={{ width: '30%', background: '#64748b' }} title="Racks: 584" />
              <span style={{ width: '20%', background: '#06b6d4' }} title="Fiber spans: 389" />
              <span style={{ width: '15%', background: '#a855f7' }} title="Splice closures: 292" />
            </div>
            <div className="cov-chip-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/passive?tab=odf'); }}
                title="View ODF in passive infrastructure"
              >
                ODF <b>680</b>
              </button>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/passive?tab=rack'); }}
                title="View Racks in passive infrastructure"
              >
                Racks <b>584</b>
              </button>
              <button
                type="button"
                className="cov-chip inv-chip is-clickable"
                style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                onClick={e => { e.stopPropagation(); nav('/inventory/passive?tab=fiber'); }}
                title="View Fiber spans in passive infrastructure"
              >
                Fiber <b>389</b>
              </button>
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
