import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NetworkHierarchyTopology from '../components/topology/NetworkHierarchyTopology';
import SitesByGeography from '../components/location/SitesByGeography';
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

      {/* ── Sites by geography Map Card ─────────────────────────── */}
      <SitesByGeography />
    </div>
  );
}

/* ── Coverage Table Sub-Component ─────────────────────────────────────── */
const ALERT_ICONS: Record<string, React.ReactNode> = {
  'Power': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  ),
  'Lease / Property': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M9 12h6M9 15.5h6M9 8.5h3" />
    </svg>
  ),
  'Fiber Connectivity': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.8 4.7a4 4 0 0 1 5.6 5.6L16.6 12" />
      <path d="M13 17.5l-1.8 1.8a4 4 0 0 1-5.6-5.6L7.4 12" />
    </svg>
  ),
  'Civil / Infrastructure': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
      <path d="M12 21V6" />
      <path d="M7 10 12 5l5 5" />
      <path d="M4 21h16" />
      <path d="M9 21v-5M15 21v-5" />
    </svg>
  ),
  'Regulatory': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
      <path d="M12 3.5 19 6v6c0 5-3 7.8-7 8.5-4-.7-7-3.5-7-8.5V6Z" />
      <path d="m9.5 12 1.8 1.8 3.2-3.6" />
    </svg>
  ),
  'Supply Chain': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
      <rect x="2.5" y="7" width="11" height="9" rx="1" />
      <path d="M13.5 10h3.5l3 3v3h-6.5" />
      <circle cx="7" cy="18" r="1.7" />
      <circle cx="17.5" cy="18" r="1.7" />
    </svg>
  ),
  'Commissioning': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m9 13 2 2 4-4.5" />
    </svg>
  )
};

const ALERT_LABEL: Record<string, string> = {
  'Lease / Property': 'Lease issue',
  'Power': 'Power issue',
  'Fiber Connectivity': 'Fiber issue',
  'Civil / Infrastructure': 'Civil work issue',
  'Regulatory': 'Regulatory hold',
  'Supply Chain': 'Supply delay',
  'Commissioning': 'Commissioning hold'
};

const INV_ICONS = {
  active: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="4" y="4" width="16" height="6" rx="1.6" />
      <rect x="4" y="14" width="16" height="6" rx="1.6" />
      <circle cx="8" cy="7" r="1" />
      <circle cx="8" cy="17" r="1" />
    </svg>
  ),
  logical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M8 6h8M7.3 8 11 16M16.7 8 13 16" />
    </svg>
  ),
  passive: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M3 6c4 0 4 4 8 4s4-4 8-4M3 18c4 0 4-4 8-4s4 4 8 4" />
    </svg>
  )
};

function DonutChart({
  segments,
  total,
  topLabel,
  subLabel,
  size = 108
}: {
  segments: { name: string; count: number; color: string }[];
  total: number;
  topLabel: string | number;
  subLabel: string;
  size?: number;
}) {
  const sw = Math.max(7, Math.round(size * 0.1));
  const r = size / 2 - sw / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const fTop = Math.max(13, Math.round(size * 0.145));
  const fSub = Math.max(10, Math.round(size * 0.08));

  let off = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ height: `${size}px`, width: `${size}px`, flexShrink: 0, display: 'block' }} role="img" aria-label={`${topLabel} ${subLabel}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--vw-color-slate-100)" strokeWidth={sw} />
      {segments.map((s, idx) => {
        const len = total > 0 ? (s.count / total) * C : 0;
        const currentOff = off;
        off += len;
        return (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={sw}
            strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
            strokeDashoffset={(-currentOff).toFixed(2)}
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`${s.name}: ${s.count}`}</title>
          </circle>
        );
      })}
      <text x={cx} y={cy + (subLabel ? 0 : fTop * 0.35)} textAnchor="middle" fontSize={fTop} fontWeight={500} fill="var(--vw-color-slate-800, #1e293b)" fontFamily="Inter, sans-serif">
        {topLabel}
      </text>
      {subLabel && (
        <text x={cx} y={cy + fTop * 0.78} textAnchor="middle" fontSize={fSub} fill="var(--vw-color-slate-500, #64748b)" fontFamily="Inter, sans-serif">
          {subLabel}
        </text>
      )}
    </svg>
  );
}

function getCircleRolloutDetails(c: CoverageCircle) {
  const onAirSites = Math.round(c.sites * (c.onAirPct / 100));
  const atRiskSites = c.failed > 0 ? Math.max(1, Math.round(c.sites * 0.04)) : 0;
  const cleanOnAir = Math.max(0, onAirSites - atRiskSites);
  const blockedSites = c.failed;
  const pendingSites = Math.max(0, c.sites - onAirSites - blockedSites);

  const overview = {
    total: c.sites,
    onAir: cleanOnAir,
    pending: pendingSites,
    blocked: blockedSites,
    atRisk: atRiskSites
  };

  const stTotal = c.sites || 1;
  const underDeploy = Math.round(pendingSites * 0.45);
  const atpPending = Math.round(pendingSites * 0.30);
  const integrationPending = Math.max(0, pendingSites - underDeploy - atpPending);

  const stages = [
    { k: 'Commissioned', c: cleanOnAir, color: '#10b981' },
    { k: 'Under Deployment', c: underDeploy, color: '#0284c7' },
    { k: 'ATP Pending', c: atpPending, color: '#06b6d4' },
    { k: 'Integration Pending', c: integrationPending, color: '#f59e0b' },
    { k: 'Blocked', c: blockedSites, color: '#ef4444' }
  ];

  // Specific alerts based on state
  const alertsByCircle: Record<string, { cat: string; count: number; sev: 'blocked' | 'delayed' | 'risk'; topReason: string }[]> = {
    'MH': [
      { cat: 'Power', count: 3, sev: 'blocked', topReason: 'Grid power supply delayed by local utility' },
      { cat: 'Lease / Property', count: 2, sev: 'blocked', topReason: 'Repeated landlord access restrictions' },
      { cat: 'Fiber Connectivity', count: 4, sev: 'delayed', topReason: 'Temporary fiber diversion in use' }
    ],
    'DL': [
      { cat: 'Regulatory', count: 2, sev: 'blocked', topReason: 'Municipal corporation tower clearance pending' },
      { cat: 'Civil / Infrastructure', count: 1, sev: 'blocked', topReason: 'Roof reinforcement structural certificate delayed' },
      { cat: 'Lease / Property', count: 3, sev: 'delayed', topReason: 'Lease expires within 30 days' }
    ],
    'KA': [
      { cat: 'Fiber Connectivity', count: 2, sev: 'blocked', topReason: 'OFC backhaul cut due to road widening' },
      { cat: 'Power', count: 1, sev: 'blocked', topReason: 'Transformer capacity upgrade pending' },
      { cat: 'Supply Chain', count: 3, sev: 'delayed', topReason: 'Equipment delivery delayed by vendor' }
    ],
    'UP': [
      { cat: 'Power', count: 4, sev: 'blocked', topReason: 'Frequent rural grid outages requiring DG install' },
      { cat: 'Civil / Infrastructure', count: 3, sev: 'blocked', topReason: 'GBT foundation curing inspection hold' },
      { cat: 'Commissioning', count: 5, sev: 'delayed', topReason: 'ATP pending site acceptance sign-off' }
    ],
    'GJ': [
      { cat: 'Lease / Property', count: 1, sev: 'blocked', topReason: 'Commercial agreement renewal dispute' },
      { cat: 'Power', count: 2, sev: 'delayed', topReason: 'Battery backup below threshold' }
    ],
    'TN': [
      { cat: 'Civil / Infrastructure', count: 2, sev: 'blocked', topReason: 'Coastal humidity corrosion proofing pending' },
      { cat: 'Commissioning', count: 2, sev: 'blocked', topReason: 'ATP visit scheduling hold' }
    ],
    'MP': [
      { cat: 'Fiber Connectivity', count: 3, sev: 'blocked', topReason: 'Last-mile trenching permission hold' },
      { cat: 'Power', count: 2, sev: 'blocked', topReason: 'Substation connection fee dispute' }
    ],
    'AP': [
      { cat: 'Power', count: 2, sev: 'blocked', topReason: 'High-tension power line proximity clearance' },
      { cat: 'Supply Chain', count: 1, sev: 'blocked', topReason: 'Antenna mount bracket shortage' }
    ],
    'OTH': [
      { cat: 'Lease / Property', count: 2, sev: 'blocked', topReason: 'Property owner lease negotiation hold' },
      { cat: 'Regulatory', count: 1, sev: 'blocked', topReason: 'Local cantonment board clearance pending' }
    ]
  };

  const alerts = alertsByCircle[c.code] || [
    { cat: 'Power', count: Math.max(1, c.failed), sev: 'blocked', topReason: 'Power restoration escalated with utility' }
  ];

  // Specific critical sites
  const criticalByCircle: Record<string, { id: string; status: 'Blocked' | 'Delayed' | 'At Risk'; tone: 'red' | 'amber' | 'sky'; cat: string; reason: string; impact: string }[]> = {
    'MH': [
      { id: 'MH-MAC-113', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Grid power supply delayed by local utility', impact: 'Equipment commissioning cannot begin without stable power' },
      { id: 'MH-BOM-042', status: 'Delayed', tone: 'amber', cat: 'Fiber Connectivity', reason: 'Temporary fiber diversion in use', impact: 'Backhaul unavailable — site cannot carry live traffic' },
      { id: 'MH-PUN-089', status: 'At Risk', tone: 'sky', cat: 'Lease / Property', reason: 'Lease expires within 30 days', impact: 'Site inaccessible for deployment and maintenance activities' }
    ],
    'DL': [
      { id: 'DEL-279', status: 'Blocked', tone: 'red', cat: 'Regulatory', reason: 'Municipal corporation tower clearance pending', impact: 'Tower and equipment installation cannot proceed without clearance' },
      { id: 'DEL-NDLS-014', status: 'Blocked', tone: 'red', cat: 'Civil / Infrastructure', reason: 'Roof reinforcement structural certificate delayed', impact: 'Equipment installation blocked until civil work clears' },
      { id: 'DEL-CP-008', status: 'Delayed', tone: 'amber', cat: 'Lease / Property', reason: 'Lease expires within 30 days', impact: 'Site inaccessible for deployment and maintenance activities' }
    ],
    'KA': [
      { id: 'KA-BGLK-277', status: 'Blocked', tone: 'red', cat: 'Fiber Connectivity', reason: 'OFC backhaul cut due to road widening', impact: 'Backhaul unavailable — site cannot carry live traffic' },
      { id: 'KA-BLR-104', status: 'Delayed', tone: 'amber', cat: 'Supply Chain', reason: 'Equipment delivery delayed by vendor', impact: 'Commissioning delayed pending equipment and vendor readiness' }
    ],
    'UP': [
      { id: 'UP-LKN-031', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Frequent rural grid outages requiring DG install', impact: 'Equipment commissioning cannot begin without stable power' },
      { id: 'UP-NOI-092', status: 'Delayed', tone: 'amber', cat: 'Commissioning', reason: 'ATP pending site acceptance sign-off', impact: 'Site held at final acceptance — traffic cutover is blocked' }
    ],
    'GJ': [
      { id: 'GJ-AHM-055', status: 'Blocked', tone: 'red', cat: 'Lease / Property', reason: 'Commercial agreement renewal dispute', impact: 'Site inaccessible for deployment and maintenance activities' },
      { id: 'GJ-SUR-112', status: 'At Risk', tone: 'sky', cat: 'Power', reason: 'Battery backup below threshold', impact: 'Potential service interruption if power grid drops' }
    ],
    'TN': [
      { id: 'TN-CHN-071', status: 'Blocked', tone: 'red', cat: 'Civil / Infrastructure', reason: 'Coastal humidity corrosion proofing pending', impact: 'Equipment installation blocked until civil work clears' },
      { id: 'TN-CBE-044', status: 'Delayed', tone: 'amber', cat: 'Commissioning', reason: 'ATP visit scheduling hold', impact: 'Site held at final acceptance — traffic cutover is blocked' }
    ],
    'MP': [
      { id: 'MP-INDR-275', status: 'Blocked', tone: 'red', cat: 'Fiber Connectivity', reason: 'Last-mile trenching permission hold', impact: 'Backhaul unavailable — site cannot carry live traffic' },
      { id: 'MP-BPL-082', status: 'Delayed', tone: 'amber', cat: 'Power', reason: 'Substation connection fee dispute', impact: 'Equipment commissioning cannot begin without stable power' }
    ],
    'AP': [
      { id: 'AP-VJA-118', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'High-tension power line proximity clearance', impact: 'Equipment commissioning cannot begin without stable power' },
      { id: 'AP-VSK-067', status: 'Delayed', tone: 'amber', cat: 'Supply Chain', reason: 'Antenna mount bracket shortage', impact: 'Commissioning delayed pending equipment and vendor readiness' }
    ],
    'OTH': [
      { id: 'OTH-SIT-019', status: 'Blocked', tone: 'red', cat: 'Lease / Property', reason: 'Property owner lease negotiation hold', impact: 'Site inaccessible for deployment and maintenance activities' },
      { id: 'OTH-SIT-043', status: 'Delayed', tone: 'amber', cat: 'Regulatory', reason: 'Local cantonment board clearance pending', impact: 'Tower and equipment installation cannot proceed without clearance' }
    ]
  };

  const critical = criticalByCircle[c.code] || [
    { id: `${c.code}-STE-001`, status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Power grid delayed by local utility', impact: 'Equipment commissioning cannot begin without stable power' }
  ];

  // Inventory breakdown
  const activeNe = c.total * 9 + 42;
  const logicalTot = Math.round(c.total * 6.5);
  const passiveTot = Math.round(c.total * 5.2);

  const inventory = {
    active: activeNe,
    logicalTotal: logicalTot,
    passiveTotal: passiveTot,
    ne: [
      ['Routers', Math.round(activeNe * 0.42)],
      ['Switches', Math.round(activeNe * 0.28)],
      ['gNodeB', Math.round(activeNe * 0.18)],
      ['DWDM', Math.round(activeNe * 0.12)]
    ] as [string, number][],
    logical: [
      ['LLDP', Math.round(logicalTot * 0.40)],
      ['OSPF', Math.round(logicalTot * 0.28)],
      ['BGP', Math.round(logicalTot * 0.18)],
      ['L3VPN', Math.round(logicalTot * 0.14)]
    ] as [string, number][],
    passive: [
      ['Fiber routes', Math.round(passiveTot * 0.35)],
      ['ODF ports', Math.round(passiveTot * 0.28)],
      ['Racks', Math.round(passiveTot * 0.22)],
      ['Splice closures', Math.round(passiveTot * 0.15)]
    ] as [string, number][]
  };

  return { overview, stages, stTotal, alerts, critical, inventory };
}

function CoverageCircleDetail({
  circle,
  onOpenSite
}: {
  circle: CoverageCircle;
  onOpenSite: (siteId: string) => void;
}) {
  const ops = getCircleRolloutDetails(circle);
  const o = ops.overview;

  const overviewSegs = [
    { name: 'On-air', count: o.onAir, color: '#10b981' },
    { name: 'Pending', count: o.pending, color: '#0284c7' },
    { name: 'Blocked', count: o.blocked, color: '#ef4444' },
    { name: 'At-risk', count: o.atRisk, color: '#f59e0b' }
  ];

  return (
    <div className="cov-detail" style={{ maxHeight: 'none', overflowY: 'visible' }}>
      {/* 1. Alert Summary */}
      <div className="cov-sec cov-sec--wide">
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
            Alert Summary
          </div>
          <div style={{ fontSize: '12px', color: 'var(--vw-color-gray-500)', marginTop: '2px' }}>
            across blocked, delayed and at-risk sites in this circle
          </div>
        </div>
        {ops.alerts.length > 0 ? (
          <div className="cov-alert-grid">
            {ops.alerts.map((a, idx) => (
              <div key={idx} className={`cov-alert-card cov-alert-card--${a.sev}`}>
                <span className={`cov-alert-icon cov-alert-icon--${a.sev}`}>
                  {ALERT_ICONS[a.cat] || ALERT_ICONS['Power']}
                </span>
                <div className="cov-alert-body">
                  <div className="row vw-justify-between vw-items-baseline">
                    <span className="cov-alert-label">{ALERT_LABEL[a.cat] || a.cat}</span>
                    <span className="cov-alert-n num">{a.count}</span>
                  </div>
                  <div className="cov-alert-reason" title={a.topReason}>{a.topReason}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cov-clear">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12.5 2.5 2.5 5-5" />
            </svg>
            No active alerts — every site in this circle is clean.
          </div>
        )}
      </div>

      {/* 2. Aggregated Inventory */}
      <div className="cov-sec cov-sec--wide">
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
            Aggregated Inventory
          </div>
          <div style={{ fontSize: '12px', color: 'var(--vw-color-gray-500)', marginTop: '2px' }}>
            total across every site, PoP and datacenter in this circle · summary only
          </div>
        </div>
        <div className="cov-inv-row">
          <div className="cov-inv-tile cov-inv-tile--sky">
            <span className="cov-inv-icon">{INV_ICONS.active}</span>
            <span className="cov-inv-v num">{ops.inventory.active.toLocaleString()}</span>
            <span className="cov-inv-l">Active devices</span>
          </div>
          <div className="cov-inv-tile cov-inv-tile--purple">
            <span className="cov-inv-icon">{INV_ICONS.logical}</span>
            <span className="cov-inv-v num">{ops.inventory.logicalTotal.toLocaleString()}</span>
            <span className="cov-inv-l">Logical — links &amp; services</span>
          </div>
          <div className="cov-inv-tile cov-inv-tile--orange">
            <span className="cov-inv-icon">{INV_ICONS.passive}</span>
            <span className="cov-inv-v num">{ops.inventory.passiveTotal.toLocaleString()}</span>
            <span className="cov-inv-l">Passive infrastructure</span>
          </div>
        </div>
        <div className="cov-chip-row">
          {ops.inventory.ne.map(([k, v], idx) => (
            <span key={idx} className="cov-chip">{k} <b className="num">{v.toLocaleString()}</b></span>
          ))}
        </div>
        <div className="cov-chip-row">
          {ops.inventory.logical.map(([k, v], idx) => (
            <span key={idx} className="cov-chip">{k} <b className="num">{v.toLocaleString()}</b></span>
          ))}
        </div>
        <div className="cov-chip-row">
          {ops.inventory.passive.map(([k, v], idx) => (
            <span key={idx} className="cov-chip">{k} <b className="num">{v.toLocaleString()}</b></span>
          ))}
        </div>
      </div>

      {/* 3. Site Overview */}
      <div className="cov-sec">
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vw-color-gray-900)', marginBottom: '8px' }}>
          Site Overview
        </div>
        <div className="row vw-gap-md vw-items-center" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <DonutChart
            segments={overviewSegs}
            total={o.total}
            topLabel={o.total.toLocaleString()}
            subLabel="sites"
            size={108}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '120px' }}>
            {overviewSegs.map((s, idx) => (
              <div key={idx} className="row vw-justify-between" style={{ gap: 'var(--vw-space-sm)', fontSize: '12px' }}>
                <span className="legend-i">
                  <span className="legend-sw" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="vw-value num" style={{ fontWeight: 600, color: '#1e293b' }}>
                  {s.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Deployment Progress */}
      <div className="cov-sec">
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vw-color-gray-900)', marginBottom: '8px' }}>
          Deployment Progress
        </div>
        <div className="meter" style={{ height: '10px', marginTop: 'var(--vw-space-sm)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
          {ops.stages.map((s, idx) => (
            <span
              key={idx}
              style={{
                width: `${ops.stTotal > 0 ? (s.c / ops.stTotal * 100).toFixed(2) : 0}%`,
                background: s.color
              }}
              title={`${s.k}: ${s.c}`}
            />
          ))}
        </div>
        <div className="stack-s" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {ops.stages.map((s, idx) => (
            <div key={idx} className="row vw-justify-between" style={{ fontSize: '12px' }}>
              <span className="legend-i">
                <span className="legend-sw" style={{ background: s.color }} />
                {s.k}
              </span>
              <span className="num vw-value" style={{ fontWeight: 500, color: '#334155' }}>
                {s.c} <span className="vw-card-metric-label-sub" style={{ fontSize: '11px', color: '#64748b' }}>· {ops.stTotal > 0 ? (s.c / ops.stTotal * 100).toFixed(0) : 0}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Critical Sites */}
      <div className="cov-sec cov-sec--wide">
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
            Critical Sites
          </div>
          <div style={{ fontSize: '12px', color: 'var(--vw-color-gray-500)', marginTop: '2px' }}>
            highest-impact sites needing attention
          </div>
        </div>
        {ops.critical.length > 0 ? (
          <div className="cov-crit-grid">
            {ops.critical.map((x, idx) => {
              const sev = x.tone === 'red' ? 'blocked' : x.tone === 'amber' ? 'delayed' : 'risk';
              return (
                <div
                  key={idx}
                  className="cov-crit-card"
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    onOpenSite(x.id);
                  }}
                  aria-label={`Open ${x.id}`}
                >
                  <div className="row vw-justify-between vw-items-center">
                    <span className="row vw-gap-sm vw-items-center" style={{ minWidth: 0, gap: '6px' }}>
                      <span className={`cov-alert-icon cov-alert-icon--${sev}`} style={{ width: '26px', height: '26px', flexShrink: 0 }}>
                        {ALERT_ICONS[x.cat] || ALERT_ICONS['Power']}
                      </span>
                      <span className="mono vw-value" style={{ fontWeight: 600, color: '#1e293b' }}>{x.id}</span>
                    </span>
                    <span className={`vw-chip vw-chip--${x.tone === 'red' ? 'error' : x.tone === 'amber' ? 'warning' : 'info'}`}>
                      {x.status}
                    </span>
                  </div>
                  <div className="cov-crit-reason">{x.reason}</div>
                  <div className="cov-crit-impact">{x.impact}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="vw-card-description">No critical sites flagged in this circle.</div>
        )}
      </div>
    </div>
  );
}

function CoverageTable({
  circles,
  expandedCircle,
  onToggleCircle
}: {
  circles: CoverageCircle[];
  expandedCircle: string | null;
  onToggleCircle: (code: string) => void;
}) {
  const nav = useNavigate();

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
              <React.Fragment key={c.code}>
                <tr
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
                {isOpen && (
                  <tr className="cov-detail-row" id={`cov-detail-${c.code}`}>
                    <td colSpan={7}>
                      <CoverageCircleDetail circle={c} onOpenSite={(siteId) => nav(`/inventory/location/site/${siteId}`)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
