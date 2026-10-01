import { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  getCityById,
  getFacilitiesForCity,
  getNetworkElementsForFacility,
  type FacilityItem,
  type NetworkElementRow
} from '../data/geographicHierarchy';
import '../styles/topology.css';

type FacilityType = 'dc' | 'pop' | 'site';
type DeviceCategory = 'All' | 'Router' | 'Switch' | 'DWDM' | 'eNodeB' | 'gNodeB';

export default function CityDetails() {
  const { cityId } = useParams<{ cityId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Look up city details
  const cityInfo = useMemo(() => {
    return getCityById(cityId || 'delhi-central');
  }, [cityId]);

  const { city } = cityInfo || {
    city: { id: 'delhi-central', name: 'Central Delhi', count: 340, stateId: 'delhi', dcCount: 14, popCount: 42, siteCount: 284 }
  };

  // ── 3 Summary Cards Active Selection (dc | pop | site) ─────────────
  // Default is 'dc' (Data Centers) as requested, or driven by URL param ?facility=
  const facilityParam = searchParams.get('facility');
  const initialFacility: FacilityType =
    facilityParam === 'pop' || facilityParam === 'site' || facilityParam === 'dc' ? facilityParam : 'dc';

  const [selectedFacility, setSelectedFacility] = useState<FacilityType>(initialFacility);

  // ── Selected Individual Facility Item (drilldown view) ─────────────
  const [selectedFacilityItem, setSelectedFacilityItem] = useState<FacilityItem | null>(null);

  // ── Facility Listing Search & Filter ────────────────────────────────
  const [facilitySearch, setFacilitySearch] = useState('');
  const [facilityStatusFilter, setFacilityStatusFilter] = useState<string>('all');

  // ── Network Elements Filter State (when drilled down) ──────────────
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory>('All');
  const [elementSearch, setElementSearch] = useState('');
  const [elementStatusFilter, setElementStatusFilter] = useState<string>('all');

  // Fetch lists for all 3 facility types to calculate rich summary telemetry
  const dcList = useMemo(() => getFacilitiesForCity(city.id, 'dc'), [city.id]);
  const popList = useMemo(() => getFacilitiesForCity(city.id, 'pop'), [city.id]);
  const siteList = useMemo(() => getFacilitiesForCity(city.id, 'site'), [city.id]);

  // Current active facilities list
  const facilities = useMemo(() => {
    return selectedFacility === 'dc' ? dcList : selectedFacility === 'pop' ? popList : siteList;
  }, [selectedFacility, dcList, popList, siteList]);

  // ── Calculate Clean Insights for Each Facility Type ──────────────────
  const dcStats = useMemo(() => {
    const total = dcList.length || city.dcCount || 10;
    const verified = dcList.filter(f => f.status === 'Verified').length;
    const inProgress = dcList.filter(f => f.status === 'Drifted').length;
    const planned = dcList.filter(f => f.status === 'Stale').length;
    const failed = Math.max(0, total - verified - inProgress - planned);
    const onAirPct = Math.round((verified / total) * 100);
    const racksUsed = dcList.reduce((acc, f) => acc + (f.racksUsed || 0), 0) || total * 24;
    const racksTotal = dcList.reduce((acc, f) => acc + (f.racksTotal || 0), 0) || total * 32;
    const rackPct = racksTotal > 0 ? Math.round((racksUsed / racksTotal) * 100) : 75;
    const powerMW = (dcList.reduce((acc, f) => acc + parseFloat(f.powerOrUplink || '1.4'), 0) || total * 1.5).toFixed(1);
    return { total, verified, inProgress, planned, failed, onAirPct, racksUsed, racksTotal, rackPct, powerMW };
  }, [dcList, city.dcCount]);

  const popStats = useMemo(() => {
    const total = popList.length || city.popCount || 38;
    const verified = popList.filter(f => f.status === 'Verified').length;
    const inProgress = popList.filter(f => f.status === 'Drifted').length;
    const planned = popList.filter(f => f.status === 'Stale').length;
    const failed = Math.max(0, total - verified - inProgress - planned);
    const onAirPct = Math.round((verified / total) * 100);
    const homedElements = popList.reduce((acc, f) => acc + (f.deviceCount || 10), 0);
    const metroHubs = popList.filter(f => f.tierOrClassification?.includes('Core') || f.subType?.includes('Core')).length || Math.round(total * 0.35);
    const transitNodes = total - metroHubs;
    return { total, verified, inProgress, planned, failed, onAirPct, homedElements, metroHubs, transitNodes };
  }, [popList, city.popCount]);

  const siteStats = useMemo(() => {
    const total = siteList.length || city.siteCount || 262;
    const verified = siteList.filter(f => f.status === 'Verified').length;
    const inProgress = siteList.filter(f => f.status === 'Drifted').length;
    const planned = Math.max(0, Math.round(total * 0.03));
    const failed = Math.max(0, total - verified - inProgress - planned);
    const onAirPct = Math.round((verified / total) * 100);
    const macroCount = Math.round(total * 0.65);
    const rooftopCount = Math.round(total * 0.22);
    const smallCellCount = total - macroCount - rooftopCount;
    return { total, verified, inProgress, planned, failed, onAirPct, macroCount, rooftopCount, smallCellCount };
  }, [siteList, city.siteCount]);

  useEffect(() => {
    const f = searchParams.get('facility');
    if (f === 'dc' || f === 'pop' || f === 'site') {
      setSelectedFacility(f);
    }
    const fId = searchParams.get('facilityId');
    if (fId) {
      const match = facilities.find(item => item.code === fId || item.id === fId);
      if (match) {
        setSelectedFacilityItem(match);
      }
    } else {
      setSelectedFacilityItem(null);
    }
  }, [searchParams, facilities]);

  // Filter facilities based on search & status
  const filteredFacilities = useMemo(() => {
    let list = facilities;
    if (facilityStatusFilter !== 'all') {
      list = list.filter(f => f.status.toLowerCase() === facilityStatusFilter.toLowerCase());
    }
    const q = facilitySearch.trim().toLowerCase();
    if (q) {
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q) ||
        f.tierOrClassification.toLowerCase().includes(q) ||
        f.subType.toLowerCase().includes(q)
      );
    }
    return list;
  }, [facilities, facilitySearch, facilityStatusFilter]);

  // Fetch network elements for the selected individual facility
  const facilityElements = useMemo(() => {
    if (!selectedFacilityItem) return [];
    return getNetworkElementsForFacility(city.id, selectedFacilityItem);
  }, [city.id, selectedFacilityItem]);

  // Filter network elements by category, search, and status
  const filteredElements = useMemo(() => {
    let list = facilityElements;
    if (selectedCategory !== 'All') {
      list = list.filter(el => el.category === selectedCategory);
    }
    if (elementStatusFilter !== 'all') {
      list = list.filter(el => el.status.toLowerCase() === elementStatusFilter.toLowerCase());
    }
    const q = elementSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(el =>
        el.name.toLowerCase().includes(q) ||
        el.ip.toLowerCase().includes(q) ||
        el.serialNumber.toLowerCase().includes(q) ||
        el.model.toLowerCase().includes(q) ||
        el.vendor.toLowerCase().includes(q) ||
        el.locationCode.toLowerCase().includes(q) ||
        el.systemDescription.toLowerCase().includes(q)
      );
    }
    return list;
  }, [facilityElements, selectedCategory, elementStatusFilter, elementSearch]);

  // Card click handler
  const handleCardClick = (type: FacilityType) => {
    setSelectedFacility(type);
    setSelectedFacilityItem(null); // Return to facility listing of the new card
    setFacilitySearch('');
    setFacilityStatusFilter('all');
    setSearchParams({ facility: type }, { replace: true });
  };

  // Facility row click handler
  const handleSelectFacility = (fac: FacilityItem) => {
    setSelectedFacilityItem(fac);
    setSelectedCategory('All');
    setElementSearch('');
    setElementStatusFilter('all');
    setSearchParams({ facility: selectedFacility, facilityId: fac.code }, { replace: true });
  };

  const handleBackToFacilityList = () => {
    setSelectedFacilityItem(null);
    setSearchParams({ facility: selectedFacility }, { replace: true });
  };

  // Status badge style helper
  const renderStatusBadge = (status: NetworkElementRow['status'] | FacilityItem['status']) => {
    switch (status) {
      case 'Verified':
        return <span className="net-status-badge is-verified">Verified</span>;
      case 'Drifted':
        return <span className="net-status-badge is-drifted">Drifted</span>;
      case 'Stale':
        return <span className="net-status-badge is-stale">Stale</span>;
      case 'Missing':
        return <span className="net-status-badge is-missing">Missing</span>;
      default:
        return <span className="net-status-badge">{status}</span>;
    }
  };

  // Port usage visual bar
  const renderPortBar = (used: number, total: number) => {
    const pct = Math.min(100, Math.round((used / total) * 100));
    return (
      <div className="net-port-cell">
        <div className="net-port-track">
          <div className="net-port-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="net-port-text">{used}/{total}</span>
      </div>
    );
  };

  // Rack usage visual bar for Data Centers
  const renderRackBar = (used?: number, total?: number) => {
    if (!total || !used) return <span className="net-text-muted">—</span>;
    const pct = Math.min(100, Math.round((used / total) * 100));
    return (
      <div className="net-port-cell" title={`${pct}% rack space occupied`}>
        <div className="net-port-track" style={{ width: '48px' }}>
          <div className="net-port-fill" style={{ width: `${pct}%`, background: pct > 85 ? '#f59e0b' : '#3b82f6' }} />
        </div>
        <span className="net-port-text">{used}/{total} Racks ({pct}%)</span>
      </div>
    );
  };

  // Dynamic categories based on facility type
  const availableCategories: DeviceCategory[] = useMemo(() => {
    if (!selectedFacilityItem) return ['All', 'Router', 'Switch', 'DWDM'];
    if (selectedFacilityItem.facilityType === 'site') {
      return ['All', 'gNodeB', 'eNodeB', 'Router', 'Switch'];
    }
    return ['All', 'Router', 'Switch', 'DWDM'];
  }, [selectedFacilityItem]);

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ── 3 Top Summary Cards (Data Centers | PoP Locations | Sites) ── */}
      <section className="city-three-cards-grid" style={{ marginBottom: '24px' }}>
        
        {/* Card 1: Data Centers */}
        <div
          className={`city-summary-card top-bar-yellow${selectedFacility === 'dc' ? ' is-active' : ''}`}
          onClick={() => handleCardClick('dc')}
          role="button"
          tabIndex={0}
          title="Click to view listing of all Data Centers in this city"
        >
          <div className="row vw-justify-between vw-items-center" style={{ marginBottom: '6px' }}>
            <span className="city-card-title">Data Centers</span>
            {selectedFacility === 'dc' && (
              <span className="nst-badge nst-badge--xs" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>
                Active view
              </span>
            )}
          </div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginBottom: '2px' }}>
            <span className="vw-card-metric-xl num" style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{dcStats.total}</span>
            <span className="vw-card-metric-label-sub" style={{ fontSize: '12.5px', color: '#64748b' }}>locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
            {dcStats.onAirPct}% on-air · {dcStats.failed} failed
          </div>

          {/* Meter progress bar */}
          <div className="meter" style={{ height: '7px', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
            <span style={{ width: `${(dcStats.verified / dcStats.total) * 100}%`, background: '#10b981' }} title={`On-air: ${dcStats.verified}`} />
            <span style={{ width: `${(dcStats.inProgress / dcStats.total) * 100}%`, background: '#f59e0b' }} title={`In progress: ${dcStats.inProgress}`} />
            {dcStats.planned > 0 && <span style={{ width: `${(dcStats.planned / dcStats.total) * 100}%`, background: '#0ea5e9' }} title={`Planned: ${dcStats.planned}`} />}
            {dcStats.failed > 0 && <span style={{ width: `${(dcStats.failed / dcStats.total) * 100}%`, background: '#ef4444' }} title={`Failed: ${dcStats.failed}`} />}
          </div>

          {/* Dot Legend */}
          <div className="legend" style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11.5px', color: '#475569' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981', width: '8px', height: '8px', borderRadius: '50%' }} />{dcStats.verified} on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%' }} />{dcStats.inProgress} in progress</span>
            {dcStats.planned > 0 && <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9', width: '8px', height: '8px', borderRadius: '50%' }} />{dcStats.planned} planned</span>}
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444', width: '8px', height: '8px', borderRadius: '50%' }} />{dcStats.failed} failed</span>
          </div>

          {/* Clean secondary capacity insight */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Racks: <strong style={{ color: '#1e293b' }}>{dcStats.racksUsed}/{dcStats.racksTotal}</strong> ({dcStats.rackPct}%)</span>
            <span>Power: <strong style={{ color: '#1e293b' }}>{dcStats.powerMW} MW</strong></span>
          </div>
        </div>

        {/* Card 2: PoP Locations */}
        <div
          className={`city-summary-card top-bar-blue${selectedFacility === 'pop' ? ' is-active' : ''}`}
          onClick={() => handleCardClick('pop')}
          role="button"
          tabIndex={0}
          title="Click to view listing of all PoP Locations in this city"
        >
          <div className="row vw-justify-between vw-items-center" style={{ marginBottom: '6px' }}>
            <span className="city-card-title">PoP Locations</span>
            {selectedFacility === 'pop' && (
              <span className="nst-badge nst-badge--xs" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>
                Active view
              </span>
            )}
          </div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginBottom: '2px' }}>
            <span className="vw-card-metric-xl num" style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{popStats.total}</span>
            <span className="vw-card-metric-label-sub" style={{ fontSize: '12.5px', color: '#64748b' }}>locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
            {popStats.onAirPct}% on-air · {popStats.failed} failed
          </div>

          {/* Meter progress bar */}
          <div className="meter" style={{ height: '7px', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
            <span style={{ width: `${(popStats.verified / popStats.total) * 100}%`, background: '#10b981' }} title={`On-air: ${popStats.verified}`} />
            <span style={{ width: `${(popStats.inProgress / popStats.total) * 100}%`, background: '#f59e0b' }} title={`In progress: ${popStats.inProgress}`} />
            {popStats.planned > 0 && <span style={{ width: `${(popStats.planned / popStats.total) * 100}%`, background: '#0ea5e9' }} title={`Planned: ${popStats.planned}`} />}
            {popStats.failed > 0 && <span style={{ width: `${(popStats.failed / popStats.total) * 100}%`, background: '#ef4444' }} title={`Failed: ${popStats.failed}`} />}
          </div>

          {/* Dot Legend */}
          <div className="legend" style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11.5px', color: '#475569' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981', width: '8px', height: '8px', borderRadius: '50%' }} />{popStats.verified} on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%' }} />{popStats.inProgress} in progress</span>
            {popStats.planned > 0 && <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9', width: '8px', height: '8px', borderRadius: '50%' }} />{popStats.planned} planned</span>}
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444', width: '8px', height: '8px', borderRadius: '50%' }} />{popStats.failed} failed</span>
          </div>

          {/* Clean secondary connectivity insight */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Homed NEs: <strong style={{ color: '#1e293b' }}>{popStats.homedElements}</strong></span>
            <span>Tiers: <strong style={{ color: '#1e293b' }}>{popStats.metroHubs} Hub · {popStats.transitNodes} Transit</strong></span>
          </div>
        </div>

        {/* Card 3: Sites */}
        <div
          className={`city-summary-card top-bar-cyan${selectedFacility === 'site' ? ' is-active' : ''}`}
          onClick={() => handleCardClick('site')}
          role="button"
          tabIndex={0}
          title="Click to view listing of all Sites in this city"
        >
          <div className="row vw-justify-between vw-items-center" style={{ marginBottom: '6px' }}>
            <span className="city-card-title">Sites</span>
            {selectedFacility === 'site' && (
              <span className="nst-badge nst-badge--xs" style={{ background: '#ccfbf1', color: '#0f766e', fontWeight: 600, fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>
                Active view
              </span>
            )}
          </div>
          <div className="row vw-items-baseline" style={{ gap: '6px', marginBottom: '2px' }}>
            <span className="vw-card-metric-xl num" style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{siteStats.total}</span>
            <span className="vw-card-metric-label-sub" style={{ fontSize: '12.5px', color: '#64748b' }}>locations</span>
          </div>
          <div className="vw-card-metric-label-sub" style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
            {siteStats.onAirPct}% on-air · {siteStats.failed} failed
          </div>

          {/* Meter progress bar */}
          <div className="meter" style={{ height: '7px', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
            <span style={{ width: `${(siteStats.verified / siteStats.total) * 100}%`, background: '#10b981' }} title={`On-air: ${siteStats.verified}`} />
            <span style={{ width: `${(siteStats.inProgress / siteStats.total) * 100}%`, background: '#f59e0b' }} title={`In progress: ${siteStats.inProgress}`} />
            {siteStats.planned > 0 && <span style={{ width: `${(siteStats.planned / siteStats.total) * 100}%`, background: '#0ea5e9' }} title={`Planned: ${siteStats.planned}`} />}
            {siteStats.failed > 0 && <span style={{ width: `${(siteStats.failed / siteStats.total) * 100}%`, background: '#ef4444' }} title={`Failed: ${siteStats.failed}`} />}
          </div>

          {/* Dot Legend */}
          <div className="legend" style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11.5px', color: '#475569' }}>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981', width: '8px', height: '8px', borderRadius: '50%' }} />{siteStats.verified} on-air</span>
            <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%' }} />{siteStats.inProgress} in build</span>
            {siteStats.planned > 0 && <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9', width: '8px', height: '8px', borderRadius: '50%' }} />{siteStats.planned} planned</span>}
            <span className="legend-i"><span className="legend-sw" style={{ background: '#ef4444', width: '8px', height: '8px', borderRadius: '50%' }} />{siteStats.failed} failed</span>
          </div>

          {/* Clean secondary structure insight */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Types: <strong style={{ color: '#1e293b' }}>{siteStats.macroCount} Macro · {siteStats.rooftopCount} Rooftop</strong></span>
            <span>Small cell: <strong style={{ color: '#1e293b' }}>{siteStats.smallCellCount}</strong></span>
          </div>
        </div>

      </section>

      {/* ── Main Content Section: Facility Listing OR Facility Elements ── */}
      <section className="vw-card-section" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--vw-color-slate-200)', padding: '20px' }}>
        
        {/* ── VIEW 1: Listing of Facilities (Data Centers, PoPs, Sites) ──── */}
        {!selectedFacilityItem && (
          <div>
            {/* Header & Subtitle */}
            <div className="row vw-justify-between vw-items-center" style={{ marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedFacility === 'dc'
                    ? `Data Centers in ${city.name} (${filteredFacilities.length})`
                    : selectedFacility === 'pop'
                    ? `PoP Locations in ${city.name} (${filteredFacilities.length})`
                    : `Sites in ${city.name} (${filteredFacilities.length})`}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  {selectedFacility === 'dc'
                    ? `Click any Data Center to view its homed routers, switches, and DWDM equipment`
                    : selectedFacility === 'pop'
                    ? `Click any Point of Presence to view its aggregation and transit network elements`
                    : `Click any Site to view its cell towers, eNodeB/gNodeB, and access switches`}
                </p>
              </div>
            </div>

            {/* Search, Filter Toolbar */}
            <div className="net-table-toolbar">
              <span className="net-showing-count">
                Showing {filteredFacilities.length} of {facilities.length} {selectedFacility === 'dc' ? 'Data Centers' : selectedFacility === 'pop' ? 'PoP Locations' : 'Sites'}
              </span>

              <div className="net-toolbar-actions">
                <div className="net-search-input-box">
                  <span className="net-search-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder={`Search ${selectedFacility === 'dc' ? 'data centers' : selectedFacility === 'pop' ? 'PoPs' : 'sites'}...`}
                    value={facilitySearch}
                    onChange={e => setFacilitySearch(e.target.value)}
                    className="net-search-input"
                  />
                  {facilitySearch && (
                    <button
                      type="button"
                      className="net-search-clear"
                      onClick={() => setFacilitySearch('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="net-tool-btn"
                  title="Filter status (All / Verified / Drifted)"
                  onClick={() => {
                    const next = facilityStatusFilter === 'all' ? 'verified' : facilityStatusFilter === 'verified' ? 'drifted' : 'all';
                    setFacilityStatusFilter(next);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Facilities Table */}
            <div className="net-table-container">
              <table className="net-elements-table facility-table">
                <thead>
                  <tr>
                    <th style={{ width: '95px', minWidth: '95px' }}>Status</th>
                    <th style={{ width: '270px', minWidth: '250px' }}>
                      {selectedFacility === 'dc' ? 'Data Center Name' : selectedFacility === 'pop' ? 'PoP Name' : 'Site Name'}
                    </th>
                    <th style={{ width: '140px', minWidth: '130px' }}>
                      {selectedFacility === 'dc' ? 'Data Center Code' : selectedFacility === 'pop' ? 'PoP Code' : 'Site Code'}
                    </th>
                    <th style={{ width: '180px', minWidth: '170px' }}>
                      {selectedFacility === 'dc' ? 'Tier / Classification' : selectedFacility === 'pop' ? 'PoP Type' : 'Structure / Type'}
                    </th>
                    <th style={{ width: '360px', minWidth: '320px' }}>Address / Location</th>
                    <th style={{ width: '170px', minWidth: '160px' }}>
                      {selectedFacility === 'dc' ? 'Rack Capacity' : selectedFacility === 'pop' ? 'Rack Space' : 'Equipment Mount'}
                    </th>
                    <th style={{ width: '140px', minWidth: '130px' }}>
                      {selectedFacility === 'dc' ? 'Power' : selectedFacility === 'pop' ? 'Uplink' : 'Power Backup'}
                    </th>
                    <th style={{ width: '140px', minWidth: '130px' }}>Network Elements</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacilities.map(fac => (
                    <tr
                      key={fac.id}
                      className="net-table-row facility-table-row"
                      onClick={() => handleSelectFacility(fac)}
                      title={`Click to view network elements in ${fac.name}`}
                    >
                      <td>{renderStatusBadge(fac.status)}</td>
                      <td>
                        <span className="net-name-primary facility-name-primary">{fac.name}</span>
                      </td>
                      <td>
                        <span className="facility-code-pill facility-code-standalone">{fac.code}</span>
                      </td>
                      <td>
                        <span className="facility-badge-sub">{fac.tierOrClassification}</span>
                      </td>
                      <td className="facility-address-cell" title={fac.address}>
                        {fac.address}
                      </td>
                      <td>
                        {selectedFacility === 'dc' ? (
                          renderRackBar(fac.racksUsed, fac.racksTotal)
                        ) : (
                          <span className="net-text-muted">{fac.rackOrCapacity}</span>
                        )}
                      </td>
                      <td>
                        <span className="net-text-muted" style={{ fontWeight: 500 }}>{fac.powerOrUplink}</span>
                      </td>
                      <td>
                        <span className="facility-chip-count">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <rect x="2" y="2" width="20" height="8" rx="2" />
                            <rect x="2" y="14" width="20" height="8" rx="2" />
                            <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2.5" />
                            <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="2.5" />
                          </svg>
                          {fac.deviceCount} Devices
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredFacilities.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '13px' }}>
                        No {selectedFacility === 'dc' ? 'data centers' : selectedFacility === 'pop' ? 'PoPs' : 'sites'} match the search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VIEW 2: Network Element Listing for Selected Facility ─────── */}
        {selectedFacilityItem && (
          <div>
            {/* Facility Header Drilldown Banner */}
            <div className="facility-drilldown-banner">
              <div className="row vw-items-center" style={{ gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="facility-back-btn"
                  onClick={handleBackToFacilityList}
                  title={`Return to ${selectedFacility === 'dc' ? 'Data Centers' : selectedFacility === 'pop' ? 'PoP Locations' : 'Sites'} listing`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back to {selectedFacility === 'dc' ? 'Data Centers' : selectedFacility === 'pop' ? 'PoP Locations' : 'Sites'}
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedFacilityItem.code} — {selectedFacilityItem.name}
                  </h3>
                  <div style={{ margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748b' }}>
                    <span>{selectedFacilityItem.tierOrClassification}</span>
                    <span>·</span>
                    <span>{selectedFacilityItem.address}</span>
                    <span>·</span>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>{selectedFacilityItem.powerOrUplink}</span>
                  </div>
                </div>
              </div>
              <div className="row vw-items-center" style={{ gap: '8px' }}>
                {renderStatusBadge(selectedFacilityItem.status)}
                <span className="facility-chip-count">
                  {facilityElements.length} Network Elements
                </span>
              </div>
            </div>

            {/* Device Category Tabs */}
            <div className="net-category-tabs">
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`net-cat-tab${selectedCategory === cat ? ' is-active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'All' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            {/* Search, Filter & Stats Bar */}
            <div className="net-table-toolbar">
              <span className="net-showing-count">
                Showing {filteredElements.length} of {facilityElements.length} elements in {selectedFacilityItem.code}
              </span>

              <div className="net-toolbar-actions">
                <div className="net-search-input-box">
                  <span className="net-search-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Name, IP address, serial..."
                    value={elementSearch}
                    onChange={e => setElementSearch(e.target.value)}
                    className="net-search-input"
                  />
                  {elementSearch && (
                    <button
                      type="button"
                      className="net-search-clear"
                      onClick={() => setElementSearch('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="net-tool-btn"
                  title="Filter status"
                  onClick={() => {
                    const next = elementStatusFilter === 'all' ? 'verified' : elementStatusFilter === 'verified' ? 'drifted' : 'all';
                    setElementStatusFilter(next);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Network Element Table */}
            <div className="net-table-container">
              <table className="net-elements-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Status</th>
                    <th style={{ width: '220px' }}>Name / IP</th>
                    <th style={{ width: '140px' }}>Model / Vendor</th>
                    <th style={{ width: '110px' }}>OS version</th>
                    <th style={{ width: '130px' }}>Serial number</th>
                    <th style={{ width: '90px' }}>Region</th>
                    <th style={{ width: '100px' }}>Ports</th>
                    <th style={{ width: '110px' }}>Location Code</th>
                    <th>System description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredElements.map(el => (
                    <tr key={el.id} className="net-table-row">
                      <td>{renderStatusBadge(el.status)}</td>
                      <td>
                        <div className="net-name-cell">
                          <span className="net-name-primary">{el.name}</span>
                          <span className="net-ip-secondary">{el.ip}</span>
                        </div>
                      </td>
                      <td>
                        <div className="net-model-cell">
                          <span className="net-model-primary">{el.model}</span>
                          <span className="net-vendor-secondary">{el.vendor}</span>
                        </div>
                      </td>
                      <td className="net-text-muted">{el.osVersion}</td>
                      <td className="net-text-mono">{el.serialNumber}</td>
                      <td className="net-text-muted">{el.region}</td>
                      <td>{renderPortBar(el.portsUsed, el.portsTotal)}</td>
                      <td className="net-text-mono">{el.locationCode}</td>
                      <td className="net-text-desc" title={el.systemDescription}>
                        {el.systemDescription}
                      </td>
                    </tr>
                  ))}
                  {filteredElements.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '13px' }}>
                        No network elements match the selected category and search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </section>

    </div>
  );
}
