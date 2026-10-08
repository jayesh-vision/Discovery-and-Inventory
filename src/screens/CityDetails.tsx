import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getCityById,
  getFacilitiesForCity,
  getNetworkElementsForFacility,
  type FacilityItem,
  type NetworkElementRow
} from '../data/geographicHierarchy';
import { legacyPath } from '../routes';
import { ActionIcon, IcKebab } from '../components/grid/icons';
import '../styles/topology.css';

type FacilityType = 'dc' | 'pop' | 'site';
type DeviceCategory = 'All' | 'Router' | 'Switch' | 'DWDM' | 'eNodeB' | 'gNodeB';

export interface SiteFilterState {
  status: string;
  name: string;
  code: string;
  type: string;
  structure: string;
}

export const DEFAULT_SITE_FILTERS: SiteFilterState = {
  status: 'all',
  name: '',
  code: '',
  type: 'all',
  structure: 'all'
};

export interface DcFilterState {
  status: string;
  name: string;
  code: string;
  classification: string;
  rackCapacity: string;
  power: string;
}

export const DEFAULT_DC_FILTERS: DcFilterState = {
  status: 'all',
  name: '',
  code: '',
  classification: 'all',
  rackCapacity: 'all',
  power: 'all'
};

export interface PopFilterState {
  status: string;
  name: string;
  code: string;
  popType: string;
  uplink: string;
}

export const DEFAULT_POP_FILTERS: PopFilterState = {
  status: 'all',
  name: '',
  code: '',
  popType: 'all',
  uplink: 'all'
};

export interface ElementFilterState {
  status: string;
  category: string;
  nameOrIp: string;
  vendor: string;
  osVersion: string;
  locationCode: string;
}

export const DEFAULT_ELEMENT_FILTERS: ElementFilterState = {
  status: 'all',
  category: 'All',
  nameOrIp: '',
  vendor: 'all',
  osVersion: '',
  locationCode: ''
};

export function getSiteAttributes(fac: FacilityItem): { type: string; structure: string } {
  if (fac.siteType && fac.siteStructure) {
    return { type: fac.siteType, structure: fac.siteStructure };
  }
  const raw = fac.tierOrClassification || fac.subType || '';
  if (raw.includes('Macro')) return { type: 'Macro Tower', structure: '40m GBT' };
  if (raw.includes('Rooftop')) return { type: 'Rooftop 5G', structure: '25m RTT' };
  if (raw.includes('Small Cell')) return { type: 'Small Cell', structure: 'Street Pole' };
  if (raw.includes('IBS')) return { type: 'IBS In-Building Hub', structure: 'In-Building Hub' };
  return { type: 'Macro Tower', structure: '40m GBT' };
}

/* a DWDM element's location code is "<facility code>-<shelf> · slot <n>" */
const dwdmShelfSlot = (code: string) => {
  const m = code.match(/(OT-\d+ · slot \d+)$/);
  return m ? { shelfSlot: m[1], facility: code.slice(0, m.index).replace(/-$/, '') } : { shelfSlot: code, facility: code };
};

function getElementCls(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('router')) return 'router';
  if (c.includes('switch')) return 'switch';
  if (c.includes('dwdm') || c.includes('optical')) return 'dwdm';
  if (c.includes('gnodeb') || c.includes('5g')) return 'gnodeb';
  if (c.includes('enodeb') || c.includes('4g')) return 'enodeb';
  return 'router';
}

function ElementRowMenu({
  open,
  onToggle,
  onClose,
  onOpenNode,
  onOpenDetails
}: {
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  onOpenNode: () => void;
  onOpenDetails: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current, m = menuRef.current;
      if (!b || !m) return;
      const r = b.getBoundingClientRect(), h = m.offsetHeight, w = m.offsetWidth, gap = 4;
      const below = r.bottom + gap + h <= window.innerHeight;
      m.style.top = `${below ? r.bottom + gap : Math.max(gap, r.top - gap - h)}px`;
      m.style.left = `${Math.max(gap, Math.min(r.right - w, window.innerWidth - w - gap))}px`;
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  return (
    <td
      className="kb-td"
      onClick={e => e.stopPropagation()}
      style={{ width: '44px', minWidth: '44px', textAlign: 'center', position: 'relative' }}
    >
      <button
        ref={btnRef}
        type="button"
        className={`kb${open ? ' is-on' : ''}`}
        onClick={onToggle}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
      >
        <IcKebab />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="kmenu kmenu--fixed"
          role="menu"
          style={{ zIndex: 9999, minWidth: '150px', padding: '4px' }}
        >
          <button
            type="button"
            className="kmenu-i"
            onClick={e => {
              e.stopPropagation();
              onClose();
              onOpenNode();
            }}
          >
            <ActionIcon label="Node view" />
            <span style={{ fontSize: '13px' }}>Node view</span>
          </button>
          <button
            type="button"
            className="kmenu-i"
            onClick={e => {
              e.stopPropagation();
              onClose();
              onOpenDetails();
            }}
          >
            <ActionIcon label="View details" />
            <span style={{ fontSize: '13px' }}>View details</span>
          </button>
        </div>
      )}
    </td>
  );
}

export default function CityDetails() {
  const navigate = useNavigate();
  const { cityId } = useParams<{ cityId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  const openNodeView = (el: NetworkElementRow) => {
    const cls = getElementCls(el.category);
    const facilityCode = selectedFacilityItem?.code || el.name.split('-').slice(0, 3).join('-');
    const target = legacyPath(
      'node',
      { label: `${el.category} · ${el.name}`, from: 'Location · City details' },
      {
        name: el.name,
        ip: el.ip,
        cls: cls,
        site: facilityCode,
        facilityId: facilityCode,
        cityId: city.id,
        facility: selectedFacility
      }
    );
    navigate(target);
  };

  const openResourceDetails = (el: NetworkElementRow) => {
    const cls = getElementCls(el.category);
    const facilityCode = selectedFacilityItem?.code || el.name.split('-').slice(0, 3).join('-');
    const target = legacyPath(
      'resource',
      { label: `${el.category} · ${el.name}`, from: 'Location · City details' },
      {
        name: el.name,
        ip: el.ip,
        cls: cls,
        site: facilityCode,
        facilityId: facilityCode,
        cityId: city.id,
        facility: selectedFacility
      }
    );
    navigate(target);
  };

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

  // ── Site Column Filters Modal State ────────
  const [appliedSiteFilters, setAppliedSiteFilters] = useState<SiteFilterState>(DEFAULT_SITE_FILTERS);
  const [draftSiteFilters, setDraftSiteFilters] = useState<SiteFilterState>(DEFAULT_SITE_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'status' | 'name' | 'code' | 'type' | 'structure'>('status');

  const activeSiteFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSiteFilters.status !== 'all') count++;
    if (appliedSiteFilters.name.trim() !== '') count++;
    if (appliedSiteFilters.code.trim() !== '') count++;
    if (appliedSiteFilters.type !== 'all') count++;
    if (appliedSiteFilters.structure !== 'all') count++;
    return count;
  }, [appliedSiteFilters]);

  // ── DC Column Filters Modal State ────────────────────────────────────
  const [appliedDcFilters, setAppliedDcFilters] = useState<DcFilterState>(DEFAULT_DC_FILTERS);
  const [draftDcFilters, setDraftDcFilters] = useState<DcFilterState>(DEFAULT_DC_FILTERS);
  const [isDcFilterModalOpen, setIsDcFilterModalOpen] = useState(false);
  const [activeDcFilterTab, setActiveDcFilterTab] = useState<'status' | 'name' | 'code' | 'classification' | 'rackCapacity' | 'power'>('status');

  const activeDcFilterCount = useMemo(() => {
    let count = 0;
    if (appliedDcFilters.status !== 'all') count++;
    if (appliedDcFilters.name.trim() !== '') count++;
    if (appliedDcFilters.code.trim() !== '') count++;
    if (appliedDcFilters.classification !== 'all') count++;
    if (appliedDcFilters.rackCapacity !== 'all') count++;
    if (appliedDcFilters.power !== 'all') count++;
    return count;
  }, [appliedDcFilters]);

  // ── PoP Column Filters Modal State ───────────────────────────────────
  const [appliedPopFilters, setAppliedPopFilters] = useState<PopFilterState>(DEFAULT_POP_FILTERS);
  const [draftPopFilters, setDraftPopFilters] = useState<PopFilterState>(DEFAULT_POP_FILTERS);
  const [isPopFilterModalOpen, setIsPopFilterModalOpen] = useState(false);
  const [activePopFilterTab, setActivePopFilterTab] = useState<'status' | 'name' | 'code' | 'popType' | 'uplink'>('status');

  const activePopFilterCount = useMemo(() => {
    let count = 0;
    if (appliedPopFilters.status !== 'all') count++;
    if (appliedPopFilters.name.trim() !== '') count++;
    if (appliedPopFilters.code.trim() !== '') count++;
    if (appliedPopFilters.popType !== 'all') count++;
    if (appliedPopFilters.uplink !== 'all') count++;
    return count;
  }, [appliedPopFilters]);

  // ── Network Elements Filter State (when drilled down) ──────────────
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory>('All');
  const [elementSearch, setElementSearch] = useState('');
  const [appliedElementFilters, setAppliedElementFilters] = useState<ElementFilterState>(DEFAULT_ELEMENT_FILTERS);
  const [draftElementFilters, setDraftElementFilters] = useState<ElementFilterState>(DEFAULT_ELEMENT_FILTERS);
  const [isElementFilterModalOpen, setIsElementFilterModalOpen] = useState(false);
  const [activeElementFilterTab, setActiveElementFilterTab] = useState<'status' | 'category' | 'nameOrIp' | 'vendor' | 'osVersion' | 'locationCode'>('status');

  const activeElementFilterCount = useMemo(() => {
    let count = 0;
    if (appliedElementFilters.status !== 'all') count++;
    if (appliedElementFilters.category !== 'All') count++;
    if (appliedElementFilters.nameOrIp.trim() !== '') count++;
    if (appliedElementFilters.vendor !== 'all') count++;
    if (appliedElementFilters.osVersion.trim() !== '') count++;
    if (appliedElementFilters.locationCode.trim() !== '') count++;
    return count;
  }, [appliedElementFilters]);

  const activeCurrentFacilityFilterCount = useMemo(() => {
    if (selectedFacility === 'dc') return activeDcFilterCount;
    if (selectedFacility === 'pop') return activePopFilterCount;
    return activeSiteFilterCount;
  }, [selectedFacility, activeDcFilterCount, activePopFilterCount, activeSiteFilterCount]);

  // Draft filter update helpers (updates draft ONLY; does not filter table until "Apply filters" is clicked)
  const updateDraftSiteFilter = (patch: Partial<SiteFilterState>) => {
    setDraftSiteFilters(prev => ({ ...prev, ...patch }));
  };

  const updateDraftDcFilter = (patch: Partial<DcFilterState>) => {
    setDraftDcFilters(prev => ({ ...prev, ...patch }));
  };

  const updateDraftPopFilter = (patch: Partial<PopFilterState>) => {
    setDraftPopFilters(prev => ({ ...prev, ...patch }));
  };

  const updateDraftElementFilter = (patch: Partial<ElementFilterState>) => {
    setDraftElementFilters(prev => ({ ...prev, ...patch }));
  };

  // Switching tab on the left panel resets filter to default (matching DataGrid pattern)
  const handleSwitchSiteTab = (tab: 'status' | 'name' | 'code' | 'type' | 'structure') => {
    setActiveFilterTab(tab);
    setDraftSiteFilters(DEFAULT_SITE_FILTERS);
    setAppliedSiteFilters(DEFAULT_SITE_FILTERS);
  };

  const handleSwitchDcTab = (tab: 'status' | 'name' | 'code' | 'classification' | 'rackCapacity' | 'power') => {
    setActiveDcFilterTab(tab);
    setDraftDcFilters(DEFAULT_DC_FILTERS);
    setAppliedDcFilters(DEFAULT_DC_FILTERS);
  };

  const handleSwitchPopTab = (tab: 'status' | 'name' | 'code' | 'popType' | 'uplink') => {
    setActivePopFilterTab(tab);
    setDraftPopFilters(DEFAULT_POP_FILTERS);
    setAppliedPopFilters(DEFAULT_POP_FILTERS);
  };

  const handleSwitchElementTab = (tab: 'status' | 'category' | 'nameOrIp' | 'vendor' | 'osVersion' | 'locationCode') => {
    setActiveElementFilterTab(tab);
    setDraftElementFilters(DEFAULT_ELEMENT_FILTERS);
    setAppliedElementFilters(DEFAULT_ELEMENT_FILTERS);
  };

  // Applying filters: updates applied state to filter the table and closes modal
  const handleApplySiteFilters = () => {
    setAppliedSiteFilters(draftSiteFilters);
    setIsFilterModalOpen(false);
  };

  const handleApplyDcFilters = () => {
    setAppliedDcFilters(draftDcFilters);
    setIsDcFilterModalOpen(false);
  };

  const handleApplyPopFilters = () => {
    setAppliedPopFilters(draftPopFilters);
    setIsPopFilterModalOpen(false);
  };

  const handleApplyElementFilters = () => {
    setAppliedElementFilters(draftElementFilters);
    setIsElementFilterModalOpen(false);
  };

  // Opening the filter again resets it to default
  const handleToggleFacilityFilter = () => {
    if (selectedFacility === 'site') {
      const willOpen = !isFilterModalOpen;
      if (willOpen) {
        setDraftSiteFilters(DEFAULT_SITE_FILTERS);
        setAppliedSiteFilters(DEFAULT_SITE_FILTERS);
        setActiveFilterTab('status');
      }
      setIsFilterModalOpen(willOpen);
      setIsDcFilterModalOpen(false);
      setIsPopFilterModalOpen(false);
    } else if (selectedFacility === 'dc') {
      const willOpen = !isDcFilterModalOpen;
      if (willOpen) {
        setDraftDcFilters(DEFAULT_DC_FILTERS);
        setAppliedDcFilters(DEFAULT_DC_FILTERS);
        setActiveDcFilterTab('status');
      }
      setIsDcFilterModalOpen(willOpen);
      setIsFilterModalOpen(false);
      setIsPopFilterModalOpen(false);
    } else if (selectedFacility === 'pop') {
      const willOpen = !isPopFilterModalOpen;
      if (willOpen) {
        setDraftPopFilters(DEFAULT_POP_FILTERS);
        setAppliedPopFilters(DEFAULT_POP_FILTERS);
        setActivePopFilterTab('status');
      }
      setIsPopFilterModalOpen(willOpen);
      setIsFilterModalOpen(false);
      setIsDcFilterModalOpen(false);
    }
  };

  const handleToggleElementFilter = () => {
    const willOpen = !isElementFilterModalOpen;
    if (willOpen) {
      setDraftElementFilters(DEFAULT_ELEMENT_FILTERS);
      setAppliedElementFilters(DEFAULT_ELEMENT_FILTERS);
      setActiveElementFilterTab('status');
    }
    setIsElementFilterModalOpen(willOpen);
  };

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
    const total = dcList.length;
    const verified = dcList.filter(f => f.status === 'Verified').length;
    const inProgress = dcList.filter(f => f.status === 'Drifted').length;
    const planned = dcList.filter(f => f.status === 'Stale').length;
    const failed = Math.max(0, total - verified - inProgress - planned);
    const onAirPct = total ? Math.round((verified / total) * 100) : 0;
    const racksUsed = dcList.reduce((acc, f) => acc + (f.racksUsed || 0), 0);
    const racksTotal = dcList.reduce((acc, f) => acc + (f.racksTotal || 0), 0);
    const rackPct = racksTotal > 0 ? Math.round((racksUsed / racksTotal) * 100) : 0;
    const powerMW = dcList.reduce((acc, f) => acc + parseFloat(f.powerOrUplink || '0'), 0).toFixed(1);
    return { total, verified, inProgress, planned, failed, onAirPct, racksUsed, racksTotal, rackPct, powerMW };
  }, [dcList, city.dcCount]);

  const popStats = useMemo(() => {
    const total = popList.length;
    const verified = popList.filter(f => f.status === 'Verified').length;
    const inProgress = popList.filter(f => f.status === 'Drifted').length;
    const planned = popList.filter(f => f.status === 'Stale').length;
    const failed = Math.max(0, total - verified - inProgress - planned);
    const onAirPct = total ? Math.round((verified / total) * 100) : 0;
    const homedElements = popList.reduce((acc, f) => acc + f.deviceCount, 0);
    const metroHubs = popList.filter(f => f.tierOrClassification?.includes('Core') || f.subType?.includes('Core')).length;
    const transitNodes = total - metroHubs;
    return { total, verified, inProgress, planned, failed, onAirPct, homedElements, metroHubs, transitNodes };
  }, [popList, city.popCount]);

  const siteStats = useMemo(() => {
    const total = siteList.length;
    const verified = siteList.filter(f => f.status === 'Verified').length;
    const inProgress = siteList.filter(f => f.status === 'Drifted').length;
    const planned = Math.max(0, Math.min(Math.round(total * 0.03), total - verified - inProgress));
    const failed = Math.max(0, total - verified - inProgress - planned);
    const onAirPct = total ? Math.round((verified / total) * 100) : 0;
    const macroCount = Math.round(total * 0.65);
    const rooftopCount = Math.round(total * 0.22);
    const smallCellCount = total - macroCount - rooftopCount;
    return { total, verified, inProgress, planned, failed, onAirPct, macroCount, rooftopCount, smallCellCount };
  }, [siteList, city.siteCount]);

  useEffect(() => {
    const f = searchParams.get('facility');
    if (f === 'dc' || f === 'pop' || f === 'site') {
      setSelectedFacility(f);
      // Switching facility view resets all filters to default
      setAppliedSiteFilters(DEFAULT_SITE_FILTERS);
      setDraftSiteFilters(DEFAULT_SITE_FILTERS);
      setAppliedDcFilters(DEFAULT_DC_FILTERS);
      setDraftDcFilters(DEFAULT_DC_FILTERS);
      setAppliedPopFilters(DEFAULT_POP_FILTERS);
      setDraftPopFilters(DEFAULT_POP_FILTERS);
    }
    const fId = searchParams.get('facilityId');
    if (fId) {
      const match = facilities.find(item => item.code === fId || item.id === fId);
      if (match) {
        setSelectedFacilityItem(match);
        setSelectedCategory(prev => {
          if (prev !== 'All') return prev;
          return match.facilityType === 'site' ? 'gNodeB' : 'Router';
        });
      }
    } else {
      setSelectedFacilityItem(null);
    }
  }, [searchParams, facilities]);

  // Filter facilities based on search & column filters
  const filteredFacilities = useMemo(() => {
    let list = facilities;

    // Apply Site filters
    if (selectedFacility === 'site') {
      if (appliedSiteFilters.status !== 'all') {
        list = list.filter(f => f.status.toLowerCase() === appliedSiteFilters.status.toLowerCase());
      }
      if (appliedSiteFilters.name.trim() !== '') {
        const qName = appliedSiteFilters.name.trim().toLowerCase();
        list = list.filter(f => f.name.toLowerCase().includes(qName));
      }
      if (appliedSiteFilters.code.trim() !== '') {
        const qCode = appliedSiteFilters.code.trim().toLowerCase();
        list = list.filter(f => f.code.toLowerCase().includes(qCode));
      }
      if (appliedSiteFilters.type !== 'all') {
        list = list.filter(f => getSiteAttributes(f).type === appliedSiteFilters.type);
      }
      if (appliedSiteFilters.structure !== 'all') {
        list = list.filter(f => getSiteAttributes(f).structure === appliedSiteFilters.structure);
      }
    } else if (selectedFacility === 'dc') {
      // Apply DC filters
      if (appliedDcFilters.status !== 'all') {
        list = list.filter(f => f.status.toLowerCase() === appliedDcFilters.status.toLowerCase());
      }
      if (appliedDcFilters.name.trim() !== '') {
        const qName = appliedDcFilters.name.trim().toLowerCase();
        list = list.filter(f => f.name.toLowerCase().includes(qName));
      }
      if (appliedDcFilters.code.trim() !== '') {
        const qCode = appliedDcFilters.code.trim().toLowerCase();
        list = list.filter(f => f.code.toLowerCase().includes(qCode));
      }
      if (appliedDcFilters.classification !== 'all') {
        list = list.filter(f => f.tierOrClassification.includes(appliedDcFilters.classification));
      }
      if (appliedDcFilters.rackCapacity !== 'all') {
        list = list.filter(f => {
          const pct = f.racksTotal ? (f.racksUsed || 0) / f.racksTotal : 0.75;
          if (appliedDcFilters.rackCapacity === 'high') return pct >= 0.8;
          if (appliedDcFilters.rackCapacity === 'normal') return pct >= 0.6 && pct < 0.8;
          if (appliedDcFilters.rackCapacity === 'low') return pct < 0.6;
          return true;
        });
      }
      if (appliedDcFilters.power !== 'all') {
        list = list.filter(f => {
          const pVal = parseFloat(f.powerOrUplink || '2.0');
          if (appliedDcFilters.power === 'high') return pVal >= 3.0;
          if (appliedDcFilters.power === 'mid') return pVal >= 1.5 && pVal < 3.0;
          if (appliedDcFilters.power === 'low') return pVal < 1.5;
          return true;
        });
      }
    } else if (selectedFacility === 'pop') {
      // Apply PoP filters
      if (appliedPopFilters.status !== 'all') {
        list = list.filter(f => f.status.toLowerCase() === appliedPopFilters.status.toLowerCase());
      }
      if (appliedPopFilters.name.trim() !== '') {
        const qName = appliedPopFilters.name.trim().toLowerCase();
        list = list.filter(f => f.name.toLowerCase().includes(qName));
      }
      if (appliedPopFilters.code.trim() !== '') {
        const qCode = appliedPopFilters.code.trim().toLowerCase();
        list = list.filter(f => f.code.toLowerCase().includes(qCode));
      }
      if (appliedPopFilters.popType !== 'all') {
        list = list.filter(f => f.tierOrClassification.toLowerCase().includes(appliedPopFilters.popType.toLowerCase()) || f.subType.toLowerCase().includes(appliedPopFilters.popType.toLowerCase()));
      }
      if (appliedPopFilters.uplink !== 'all') {
        list = list.filter(f => f.powerOrUplink.toLowerCase().includes(appliedPopFilters.uplink.toLowerCase()));
      }
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
  }, [facilities, selectedFacility, appliedSiteFilters, appliedDcFilters, appliedPopFilters, facilitySearch]);

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
    if (appliedElementFilters.status !== 'all') {
      list = list.filter(el => el.status.toLowerCase() === appliedElementFilters.status.toLowerCase());
    }
    if (appliedElementFilters.category !== 'All') {
      list = list.filter(el => el.category === appliedElementFilters.category);
    }
    if (appliedElementFilters.nameOrIp.trim() !== '') {
      const q = appliedElementFilters.nameOrIp.trim().toLowerCase();
      list = list.filter(el => el.name.toLowerCase().includes(q) || el.ip.toLowerCase().includes(q));
    }
    if (appliedElementFilters.vendor !== 'all') {
      list = list.filter(el => el.vendor.toLowerCase() === appliedElementFilters.vendor.toLowerCase());
    }
    if (appliedElementFilters.osVersion.trim() !== '') {
      const q = appliedElementFilters.osVersion.trim().toLowerCase();
      list = list.filter(el => el.osVersion.toLowerCase().includes(q));
    }
    if (appliedElementFilters.locationCode.trim() !== '') {
      const q = appliedElementFilters.locationCode.trim().toLowerCase();
      list = list.filter(el => el.locationCode.toLowerCase().includes(q));
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
  }, [facilityElements, selectedCategory, appliedElementFilters, elementSearch]);

  // Card click handler
  const handleCardClick = (type: FacilityType) => {
    setSelectedFacility(type);
    setSelectedFacilityItem(null); // Return to facility listing of the new card
    setFacilitySearch('');
    // Switching facility views resets all filters to default
    setAppliedSiteFilters(DEFAULT_SITE_FILTERS);
    setDraftSiteFilters(DEFAULT_SITE_FILTERS);
    setAppliedDcFilters(DEFAULT_DC_FILTERS);
    setDraftDcFilters(DEFAULT_DC_FILTERS);
    setAppliedPopFilters(DEFAULT_POP_FILTERS);
    setDraftPopFilters(DEFAULT_POP_FILTERS);
    setActiveFilterTab('status');
    setActiveDcFilterTab('status');
    setActivePopFilterTab('status');
    setIsFilterModalOpen(false);
    setIsDcFilterModalOpen(false);
    setIsPopFilterModalOpen(false);
    setIsElementFilterModalOpen(false);
    setSearchParams({ facility: type }, { replace: true });
  };

  // Facility row click handler
  const handleSelectFacility = (fac: FacilityItem) => {
    setSelectedFacilityItem(fac);
    setSelectedCategory(fac.facilityType === 'site' ? 'gNodeB' : 'Router');
    setElementSearch('');
    setAppliedElementFilters(DEFAULT_ELEMENT_FILTERS);
    setDraftElementFilters(DEFAULT_ELEMENT_FILTERS);
    setActiveElementFilterTab('status');
    setIsFilterModalOpen(false);
    setIsDcFilterModalOpen(false);
    setIsPopFilterModalOpen(false);
    setIsElementFilterModalOpen(false);
    setSearchParams({ facility: selectedFacility, facilityId: fac.code }, { replace: true });
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
      <div className="net-port-cell">
        <div className="net-port-track">
          <div className="net-port-fill" style={{ width: `${pct}%`, background: '#f59e0b' }} />
        </div>
        <span className="net-port-text">{used}/{total}</span>
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

  // Clean device tabs for facility view (matching Router, Switch, DWDM tabbar style)
  const deviceTabs: { key: DeviceCategory; label: string }[] = useMemo(() => {
    if (!selectedFacilityItem) return [];
    if (selectedFacilityItem.facilityType === 'site') {
      return [
        { key: 'gNodeB', label: 'gNodeB' },
        { key: 'eNodeB', label: 'eNodeB' },
        { key: 'Router', label: 'Router' },
        { key: 'Switch', label: 'Switch' }
      ];
    }
    return [
      { key: 'Router', label: 'Router' },
      { key: 'Switch', label: 'Switch' },
      { key: 'DWDM', label: 'DWDM' }
    ];
  }, [selectedFacilityItem]);

  // Category-specific statistics for the currently selected facility
  const deviceCategoryCards = useMemo(() => {
    if (!selectedFacilityItem) return [];

    const categories: { cat: DeviceCategory; title: string; subtitle: string; colorClass: string }[] =
      selectedFacilityItem.facilityType === 'site'
        ? [
          { cat: 'gNodeB', title: '5G gNodeB', subtitle: '5G NR Radio Baseband', colorClass: 'top-bar-emerald' },
          { cat: 'eNodeB', title: '4G eNodeB', subtitle: 'LTE Radio Baseband', colorClass: 'top-bar-cyan' },
          { cat: 'Router', title: 'Cell Site Routers', subtitle: 'Backhaul / CSR', colorClass: 'top-bar-blue' },
          { cat: 'Switch', title: 'Site Access Switches', subtitle: 'Access / Aggregation', colorClass: 'top-bar-purple' }
        ]
        : selectedFacilityItem.facilityType === 'dc'
          ? [
            { cat: 'Router', title: 'Core Routers', subtitle: 'Core & Edge Transit', colorClass: 'top-bar-blue' },
            { cat: 'Switch', title: 'Fabric Switches', subtitle: 'Spine & Leaf Mesh', colorClass: 'top-bar-purple' },
            { cat: 'DWDM', title: 'Optical / DWDM', subtitle: 'Photonic Transport', colorClass: 'top-bar-yellow' }
          ]
          : [
            { cat: 'Router', title: 'Metro Routers', subtitle: 'Aggregation & Transit', colorClass: 'top-bar-blue' },
            { cat: 'Switch', title: 'Distribution Switches', subtitle: 'Metro Distribution', colorClass: 'top-bar-purple' },
            { cat: 'DWDM', title: 'Optical Transport', subtitle: 'WDM Transponders', colorClass: 'top-bar-yellow' }
          ];

    return categories.map(item => {
      const catElements = facilityElements.filter(el => el.category === item.cat);
      const total = catElements.length;
      const verified = catElements.filter(el => el.status === 'Verified').length;
      const drifted = catElements.filter(el => el.status === 'Drifted').length;
      const stale = catElements.filter(el => el.status === 'Stale').length;
      const missing = catElements.filter(el => el.status === 'Missing').length;
      const portsUsed = catElements.reduce((acc, el) => acc + (el.portsUsed || 0), 0);
      const portsTotal = catElements.reduce((acc, el) => acc + (el.portsTotal || 0), 0);
      const portPct = portsTotal > 0 ? Math.round((portsUsed / portsTotal) * 100) : 0;
      const models = Array.from(new Set(catElements.map(el => el.model))).slice(0, 2).join(' · ');

      return {
        ...item,
        total,
        verified,
        drifted,
        stale,
        missing,
        portsUsed,
        portsTotal,
        portPct,
        models: models || '—'
      };
    });
  }, [selectedFacilityItem, facilityElements]);

  return (
    <div className="page" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ── Top Summary Cards (City-Level Facilities OR Facility-Level Devices) ── */}
      <section
        className="city-three-cards-grid"
        style={{
          marginBottom: '24px',
          ...(selectedFacilityItem && deviceCategoryCards.length > 3
            ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }
            : {})
        }}
      >
        {!selectedFacilityItem ? (
          <>
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
                <span style={{ width: `${(dcStats.verified / (dcStats.total || 1)) * 100}%`, background: '#10b981' }} title={`On-air: ${dcStats.verified}`} />
                <span style={{ width: `${(dcStats.inProgress / (dcStats.total || 1)) * 100}%`, background: '#f59e0b' }} title={`In progress: ${dcStats.inProgress}`} />
                {dcStats.planned > 0 && <span style={{ width: `${(dcStats.planned / (dcStats.total || 1)) * 100}%`, background: '#0ea5e9' }} title={`Planned: ${dcStats.planned}`} />}
                {dcStats.failed > 0 && <span style={{ width: `${(dcStats.failed / (dcStats.total || 1)) * 100}%`, background: '#ef4444' }} title={`Failed: ${dcStats.failed}`} />}
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
                <span style={{ width: `${(popStats.verified / (popStats.total || 1)) * 100}%`, background: '#10b981' }} title={`On-air: ${popStats.verified}`} />
                <span style={{ width: `${(popStats.inProgress / (popStats.total || 1)) * 100}%`, background: '#f59e0b' }} title={`In progress: ${popStats.inProgress}`} />
                {popStats.planned > 0 && <span style={{ width: `${(popStats.planned / (popStats.total || 1)) * 100}%`, background: '#0ea5e9' }} title={`Planned: ${popStats.planned}`} />}
                {popStats.failed > 0 && <span style={{ width: `${(popStats.failed / (popStats.total || 1)) * 100}%`, background: '#ef4444' }} title={`Failed: ${popStats.failed}`} />}
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
                <span style={{ width: `${(siteStats.verified / (siteStats.total || 1)) * 100}%`, background: '#10b981' }} title={`On-air: ${siteStats.verified}`} />
                <span style={{ width: `${(siteStats.inProgress / (siteStats.total || 1)) * 100}%`, background: '#f59e0b' }} title={`In build: ${siteStats.inProgress}`} />
                {siteStats.planned > 0 && <span style={{ width: `${(siteStats.planned / (siteStats.total || 1)) * 100}%`, background: '#0ea5e9' }} title={`Planned: ${siteStats.planned}`} />}
                {siteStats.failed > 0 && <span style={{ width: `${(siteStats.failed / (siteStats.total || 1)) * 100}%`, background: '#ef4444' }} title={`Failed: ${siteStats.failed}`} />}
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
          </>
        ) : (
          deviceCategoryCards.map(card => (
            <div
              key={card.cat}
              className={`city-summary-card ${card.colorClass}${selectedCategory === card.cat ? ' is-active' : ''}`}
              onClick={() => setSelectedCategory(card.cat)}
              role="button"
              tabIndex={0}
              title={`Click to filter elements by ${card.title}`}
            >
              <div className="row vw-justify-between vw-items-center" style={{ marginBottom: '6px' }}>
                <span className="city-card-title">{card.title}</span>
                {selectedCategory === card.cat ? (
                  <span className="nst-badge nst-badge--xs" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 600, fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>
                    Active view
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {card.subtitle}
                  </span>
                )}
              </div>
              <div className="row vw-items-baseline" style={{ gap: '6px', marginBottom: '2px' }}>
                <span className="vw-card-metric-xl num" style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{card.total}</span>
                <span className="vw-card-metric-label-sub" style={{ fontSize: '12.5px', color: '#64748b' }}>devices</span>
              </div>
              <div className="vw-card-metric-label-sub" style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                {card.verified} verified{card.drifted > 0 ? ` · ${card.drifted} drifted` : ''}
              </div>

              {/* Meter progress bar */}
              <div className="meter" style={{ height: '7px', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9' }}>
                <span style={{ width: `${(card.verified / (card.total || 1)) * 100}%`, background: '#10b981' }} title={`Verified: ${card.verified}`} />
                {card.drifted > 0 && <span style={{ width: `${(card.drifted / (card.total || 1)) * 100}%`, background: '#f59e0b' }} title={`Drifted: ${card.drifted}`} />}
                {card.stale > 0 && <span style={{ width: `${(card.stale / (card.total || 1)) * 100}%`, background: '#0ea5e9' }} title={`Stale: ${card.stale}`} />}
                {card.missing > 0 && <span style={{ width: `${(card.missing / (card.total || 1)) * 100}%`, background: '#ef4444' }} title={`Missing: ${card.missing}`} />}
              </div>

              {/* Dot Legend */}
              <div className="legend" style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11.5px', color: '#475569' }}>
                <span className="legend-i"><span className="legend-sw" style={{ background: '#10b981', width: '8px', height: '8px', borderRadius: '50%' }} />{card.verified} verified</span>
                {card.drifted > 0 && (
                  <span className="legend-i"><span className="legend-sw" style={{ background: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%' }} />{card.drifted} drifted</span>
                )}
                {card.stale > 0 && (
                  <span className="legend-i"><span className="legend-sw" style={{ background: '#0ea5e9', width: '8px', height: '8px', borderRadius: '50%' }} />{card.stale} planned</span>
                )}
              </div>

              {/* Clean secondary telemetry insight */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Ports: <strong style={{ color: '#1e293b' }}>{card.portsUsed}/{card.portsTotal}</strong> ({card.portPct}%)</span>
                <span style={{ maxWidth: '52%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#475569', fontWeight: 500 }} title={card.models}>
                  {card.models}
                </span>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ── Main Content Section: Facility Listing OR Facility Elements ── */}
      <section className="vw-card-section city-table-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>

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
                {/* <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  {selectedFacility === 'dc'
                    ? `Click any Data Center to view its homed routers, switches, and DWDM equipment`
                    : selectedFacility === 'pop'
                    ? `Click any Point of Presence to view its aggregation and transit network elements`
                    : `Click any Site to view its cell towers, eNodeB/gNodeB, and access switches`}
                </p> */}
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

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`net-tool-btn${activeCurrentFacilityFilterCount > 0 ? ' is-active' : ''}`}
                    title={`Open ${selectedFacility === 'dc' ? 'data center' : selectedFacility === 'pop' ? 'PoP' : 'site'} column filters`}
                    onClick={handleToggleFacilityFilter}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                  </button>

                  {/* ── Two-Column Filter Modal for Sites (Exact Match to Reference Image 4) ── */}
                  {selectedFacility === 'site' && isFilterModalOpen && (
                    <>
                      <div
                        className="column-filter-backdrop"
                        onClick={() => setIsFilterModalOpen(false)}
                      />
                      <div className="column-filter-popover" role="dialog" aria-label="Filters">
                        {/* Header */}
                        <div className="column-filter-header">
                          <span className="column-filter-title">Filters</span>
                          <button
                            type="button"
                            className="column-filter-close-btn"
                            onClick={() => setIsFilterModalOpen(false)}
                            aria-label="Close filters"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Two-Column Body */}
                        <div className="column-filter-body">
                          {/* Left Panel: Category Tabs */}
                          <div className="column-filter-tabs">
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeFilterTab === 'status' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchSiteTab('status')}
                            >
                              <span>Status</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeFilterTab === 'name' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchSiteTab('name')}
                            >
                              <span>Site Name</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeFilterTab === 'code' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchSiteTab('code')}
                            >
                              <span>Site Code</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeFilterTab === 'type' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchSiteTab('type')}
                            >
                              <span>Type</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeFilterTab === 'structure' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchSiteTab('structure')}
                            >
                              <span>Structure</span>
                            </button>
                          </div>

                          {/* Right Panel: Controls for Selected Tab */}
                          <div className="column-filter-pane">
                            {activeFilterTab === 'status' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Status</label>
                                <select
                                  className="column-filter-select"
                                  value={draftSiteFilters.status}
                                  onChange={e => updateDraftSiteFilter({ status: e.target.value })}
                                >
                                  <option value="all">Status (All)</option>
                                  <option value="Verified">Verified</option>
                                  <option value="Drifted">Drifted</option>
                                  <option value="Stale">Stale</option>
                                </select>
                              </div>
                            )}

                            {activeFilterTab === 'name' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Site Name</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="Filter by site name..."
                                    value={draftSiteFilters.name}
                                    onChange={e => updateDraftSiteFilter({ name: e.target.value })}
                                    autoFocus
                                  />
                                  {draftSiteFilters.name && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftSiteFilter({ name: '' })}
                                      className="net-search-clear"
                                      title="Clear site name"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeFilterTab === 'code' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Site Code</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="e.g. CEN-STE-001..."
                                    value={draftSiteFilters.code}
                                    onChange={e => updateDraftSiteFilter({ code: e.target.value })}
                                    autoFocus
                                  />
                                  {draftSiteFilters.code && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftSiteFilter({ code: '' })}
                                      className="net-search-clear"
                                      title="Clear site code"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeFilterTab === 'type' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Site Type</label>
                                <select
                                  className="column-filter-select"
                                  value={draftSiteFilters.type}
                                  onChange={e => updateDraftSiteFilter({ type: e.target.value })}
                                >
                                  <option value="all">Type (All)</option>
                                  <option value="Macro Tower">Macro Tower</option>
                                  <option value="Rooftop 5G">Rooftop 5G</option>
                                  <option value="Small Cell">Small Cell</option>
                                  <option value="IBS In-Building Hub">IBS In-Building Hub</option>
                                </select>
                              </div>
                            )}

                            {activeFilterTab === 'structure' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Structure</label>
                                <select
                                  className="column-filter-select"
                                  value={draftSiteFilters.structure}
                                  onChange={e => updateDraftSiteFilter({ structure: e.target.value })}
                                >
                                  <option value="all">Structure (All)</option>
                                  <option value="40m GBT">40m GBT (Ground Based Tower)</option>
                                  <option value="25m RTT">25m RTT (Rooftop Tower)</option>
                                  <option value="Street Pole">Street Pole</option>
                                  <option value="In-Building Hub">In-Building Hub</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="column-filter-footer">
                          <button
                            type="button"
                            className="column-filter-apply-btn"
                            onClick={handleApplySiteFilters}
                          >
                            Apply filters
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Two-Column Filter Modal for Data Centers ── */}
                  {selectedFacility === 'dc' && isDcFilterModalOpen && (
                    <>
                      <div
                        className="column-filter-backdrop"
                        onClick={() => setIsDcFilterModalOpen(false)}
                      />
                      <div className="column-filter-popover" role="dialog" aria-label="Filters">
                        {/* Header */}
                        <div className="column-filter-header">
                          <span className="column-filter-title">Filters</span>
                          <button
                            type="button"
                            className="column-filter-close-btn"
                            onClick={() => setIsDcFilterModalOpen(false)}
                            aria-label="Close filters"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Two-Column Body */}
                        <div className="column-filter-body">
                          {/* Left Panel: Category Tabs */}
                          <div className="column-filter-tabs">
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeDcFilterTab === 'status' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchDcTab('status')}
                            >
                              <span>Status</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeDcFilterTab === 'name' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchDcTab('name')}
                            >
                              <span>DC Name</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeDcFilterTab === 'code' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchDcTab('code')}
                            >
                              <span>DC Code</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeDcFilterTab === 'classification' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchDcTab('classification')}
                            >
                              <span>Classification</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeDcFilterTab === 'rackCapacity' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchDcTab('rackCapacity')}
                            >
                              <span>Rack Space</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeDcFilterTab === 'power' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchDcTab('power')}
                            >
                              <span>Power Spec</span>
                            </button>
                          </div>

                          {/* Right Panel: Controls */}
                          <div className="column-filter-pane">
                            {activeDcFilterTab === 'status' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Status</label>
                                <select
                                  className="column-filter-select"
                                  value={draftDcFilters.status}
                                  onChange={e => updateDraftDcFilter({ status: e.target.value })}
                                >
                                  <option value="all">Status (All)</option>
                                  <option value="Verified">Verified</option>
                                  <option value="Drifted">Drifted</option>
                                  <option value="Stale">Stale</option>
                                </select>
                              </div>
                            )}

                            {activeDcFilterTab === 'name' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Data Center Name</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="Filter by DC name..."
                                    value={draftDcFilters.name}
                                    onChange={e => updateDraftDcFilter({ name: e.target.value })}
                                    autoFocus
                                  />
                                  {draftDcFilters.name && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftDcFilter({ name: '' })}
                                      className="net-search-clear"
                                      title="Clear DC name"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeDcFilterTab === 'code' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">DC Code</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="e.g. DEL-DC-001..."
                                    value={draftDcFilters.code}
                                    onChange={e => updateDraftDcFilter({ code: e.target.value })}
                                    autoFocus
                                  />
                                  {draftDcFilters.code && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftDcFilter({ code: '' })}
                                      className="net-search-clear"
                                      title="Clear DC code"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeDcFilterTab === 'classification' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Tier / Classification</label>
                                <select
                                  className="column-filter-select"
                                  value={draftDcFilters.classification}
                                  onChange={e => updateDraftDcFilter({ classification: e.target.value })}
                                >
                                  <option value="all">Classification (All)</option>
                                  <option value="Tier-4 Hyperscale">Tier-4 Hyperscale</option>
                                  <option value="Tier-3 Edge">Tier-3 Edge</option>
                                  <option value="Regional Core">Regional Core</option>
                                  <option value="Modular Edge">Modular Edge</option>
                                </select>
                              </div>
                            )}

                            {activeDcFilterTab === 'rackCapacity' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Rack Utilization</label>
                                <select
                                  className="column-filter-select"
                                  value={draftDcFilters.rackCapacity}
                                  onChange={e => updateDraftDcFilter({ rackCapacity: e.target.value })}
                                >
                                  <option value="all">Rack Space (All)</option>
                                  <option value="high">High Usage (≥ 80%)</option>
                                  <option value="normal">Normal (60% - 80%)</option>
                                  <option value="low">Low (&lt; 60%)</option>
                                </select>
                              </div>
                            )}

                            {activeDcFilterTab === 'power' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Power Specification</label>
                                <select
                                  className="column-filter-select"
                                  value={draftDcFilters.power}
                                  onChange={e => updateDraftDcFilter({ power: e.target.value })}
                                >
                                  <option value="all">Power Spec (All)</option>
                                  <option value="high">High (&gt; 3.0 MW)</option>
                                  <option value="mid">Medium (1.5 - 3.0 MW)</option>
                                  <option value="low">Low (&lt; 1.5 MW)</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="column-filter-footer">
                          <button
                            type="button"
                            className="column-filter-apply-btn"
                            onClick={handleApplyDcFilters}
                          >
                            Apply filters
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Two-Column Filter Modal for PoP Locations ── */}
                  {selectedFacility === 'pop' && isPopFilterModalOpen && (
                    <>
                      <div
                        className="column-filter-backdrop"
                        onClick={() => setIsPopFilterModalOpen(false)}
                      />
                      <div className="column-filter-popover" role="dialog" aria-label="Filters">
                        {/* Header */}
                        <div className="column-filter-header">
                          <span className="column-filter-title">Filters</span>
                          <button
                            type="button"
                            className="column-filter-close-btn"
                            onClick={() => setIsPopFilterModalOpen(false)}
                            aria-label="Close filters"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Two-Column Body */}
                        <div className="column-filter-body">
                          {/* Left Panel: Category Tabs */}
                          <div className="column-filter-tabs">
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activePopFilterTab === 'status' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchPopTab('status')}
                            >
                              <span>Status</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activePopFilterTab === 'name' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchPopTab('name')}
                            >
                              <span>PoP Name</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activePopFilterTab === 'code' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchPopTab('code')}
                            >
                              <span>PoP Code</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activePopFilterTab === 'popType' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchPopTab('popType')}
                            >
                              <span>PoP Type</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activePopFilterTab === 'uplink' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchPopTab('uplink')}
                            >
                              <span>Uplink</span>
                            </button>
                          </div>

                          {/* Right Panel: Controls */}
                          <div className="column-filter-pane">
                            {activePopFilterTab === 'status' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Status</label>
                                <select
                                  className="column-filter-select"
                                  value={draftPopFilters.status}
                                  onChange={e => updateDraftPopFilter({ status: e.target.value })}
                                >
                                  <option value="all">Status (All)</option>
                                  <option value="Verified">Verified</option>
                                  <option value="Drifted">Drifted</option>
                                  <option value="Stale">Stale</option>
                                </select>
                              </div>
                            )}

                            {activePopFilterTab === 'name' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">PoP Name</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="Filter by PoP name..."
                                    value={draftPopFilters.name}
                                    onChange={e => updateDraftPopFilter({ name: e.target.value })}
                                    autoFocus
                                  />
                                  {draftPopFilters.name && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftPopFilter({ name: '' })}
                                      className="net-search-clear"
                                      title="Clear PoP name"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activePopFilterTab === 'code' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">PoP Code</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="e.g. DEL-POP-001..."
                                    value={draftPopFilters.code}
                                    onChange={e => updateDraftPopFilter({ code: e.target.value })}
                                    autoFocus
                                  />
                                  {draftPopFilters.code && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftPopFilter({ code: '' })}
                                      className="net-search-clear"
                                      title="Clear PoP code"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activePopFilterTab === 'popType' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">PoP Type / Classification</label>
                                <select
                                  className="column-filter-select"
                                  value={draftPopFilters.popType}
                                  onChange={e => updateDraftPopFilter({ popType: e.target.value })}
                                >
                                  <option value="all">PoP Type (All)</option>
                                  <option value="Metro Core">Metro Core</option>
                                  <option value="Transit Hub">Transit Hub</option>
                                  <option value="Edge Gateway">Edge Gateway</option>
                                  <option value="Colocation Facility">Colocation Facility</option>
                                </select>
                              </div>
                            )}

                            {activePopFilterTab === 'uplink' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Uplink Capacity</label>
                                <select
                                  className="column-filter-select"
                                  value={draftPopFilters.uplink}
                                  onChange={e => updateDraftPopFilter({ uplink: e.target.value })}
                                >
                                  <option value="all">Uplink (All)</option>
                                  <option value="400G">400G Uplink</option>
                                  <option value="100G">100G Uplink</option>
                                  <option value="40G">40G Uplink</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="column-filter-footer">
                          <button
                            type="button"
                            className="column-filter-apply-btn"
                            onClick={handleApplyPopFilters}
                          >
                            Apply filters
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
                    {selectedFacility === 'site' ? (
                      <>
                        <th style={{ width: '160px', minWidth: '150px' }}>Type</th>
                        <th style={{ width: '150px', minWidth: '140px' }}>Structure</th>
                      </>
                    ) : (
                      <th style={{ width: '180px', minWidth: '170px' }}>
                        {selectedFacility === 'dc' ? 'Tier / Classification' : 'PoP Type'}
                      </th>
                    )}
                    <th style={{ width: '340px', minWidth: '300px' }}>Address / Location</th>
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
                      {selectedFacility === 'site' ? (
                        <>
                          <td>
                            <span className="facility-badge-sub" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                              {getSiteAttributes(fac).type}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#475569', fontWeight: 500, fontSize: '12.5px' }}>
                              {getSiteAttributes(fac).structure}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td>
                          <span className="facility-badge-sub">{fac.tierOrClassification}</span>
                        </td>
                      )}
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
                      <td colSpan={selectedFacility === 'site' ? 9 : 8} style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '13px' }}>
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
            {/* Device Category Tabs Bar (Router, Switch, DWDM, etc.) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                borderBottom: '1px solid var(--vw-color-slate-200)',
                marginBottom: '16px'
              }}
            >
              <div className="tabbar" style={{ borderBottom: 'none', padding: 0 }}>
                {deviceTabs.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`tab${selectedCategory === tab.key ? ' is-on' : ''}`}
                    onClick={() => setSelectedCategory(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search, Filter & Stats Bar */}
            <div className="net-table-toolbar">
              <span className="net-showing-count">
                Showing {filteredElements.length} of {facilityElements.length} elements in {selectedFacilityItem.code}
              </span>

              <div className="net-toolbar-actions">
                {selectedFacilityItem.facilityType === 'dc' && (
                  <button
                    type="button"
                    className="nst-btn nst-btn--sm"
                    onClick={() => navigate(`/inventory/datacenter/${encodeURIComponent(selectedFacilityItem.code)}?cityId=${encodeURIComponent(city.id)}`)}
                  >
                    Open data center view
                  </button>
                )}
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

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`net-tool-btn${activeElementFilterCount > 0 ? ' is-active' : ''}`}
                    title="Open network element column filters"
                    onClick={handleToggleElementFilter}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                  </button>

                  {/* ── Two-Column Filter Modal for Network Elements ── */}
                  {isElementFilterModalOpen && (
                    <>
                      <div
                        className="column-filter-backdrop"
                        onClick={() => setIsElementFilterModalOpen(false)}
                      />
                      <div className="column-filter-popover" role="dialog" aria-label="Filters">
                        {/* Header */}
                        <div className="column-filter-header">
                          <span className="column-filter-title">Filters</span>
                          <button
                            type="button"
                            className="column-filter-close-btn"
                            onClick={() => setIsElementFilterModalOpen(false)}
                            aria-label="Close filters"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Two-Column Body */}
                        <div className="column-filter-body">
                          {/* Left Panel: Category Tabs */}
                          <div className="column-filter-tabs">
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeElementFilterTab === 'status' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchElementTab('status')}
                            >
                              <span>Status</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeElementFilterTab === 'category' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchElementTab('category')}
                            >
                              <span>Category</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeElementFilterTab === 'nameOrIp' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchElementTab('nameOrIp')}
                            >
                              <span>Name / IP</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeElementFilterTab === 'vendor' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchElementTab('vendor')}
                            >
                              <span>Vendor</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeElementFilterTab === 'osVersion' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchElementTab('osVersion')}
                            >
                              <span>OS Version</span>
                            </button>
                            <button
                              type="button"
                              className={`column-filter-tab-btn${activeElementFilterTab === 'locationCode' ? ' is-active' : ''}`}
                              onClick={() => handleSwitchElementTab('locationCode')}
                            >
                              <span>Location Code</span>
                            </button>
                          </div>

                          {/* Right Panel: Controls */}
                          <div className="column-filter-pane">
                            {activeElementFilterTab === 'status' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Status</label>
                                <select
                                  className="column-filter-select"
                                  value={draftElementFilters.status}
                                  onChange={e => updateDraftElementFilter({ status: e.target.value })}
                                >
                                  <option value="all">Status (All)</option>
                                  <option value="Verified">Verified</option>
                                  <option value="Drifted">Drifted</option>
                                  <option value="Stale">Stale</option>
                                  <option value="Missing">Missing</option>
                                  <option value="Not discovered">Not discovered</option>
                                </select>
                              </div>
                            )}

                            {activeElementFilterTab === 'category' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Device Category</label>
                                <select
                                  className="column-filter-select"
                                  value={draftElementFilters.category}
                                  onChange={e => updateDraftElementFilter({ category: e.target.value as DeviceCategory })}
                                >
                                  {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>
                                      {cat === 'All' ? 'Category (All)' : cat}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {activeElementFilterTab === 'nameOrIp' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Name or IP Address</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="e.g. DEL-CR-01 or 10.42..."
                                    value={draftElementFilters.nameOrIp}
                                    onChange={e => updateDraftElementFilter({ nameOrIp: e.target.value })}
                                    autoFocus
                                  />
                                  {draftElementFilters.nameOrIp && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftElementFilter({ nameOrIp: '' })}
                                      className="net-search-clear"
                                      title="Clear name or IP"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeElementFilterTab === 'vendor' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Equipment Vendor</label>
                                <select
                                  className="column-filter-select"
                                  value={draftElementFilters.vendor}
                                  onChange={e => updateDraftElementFilter({ vendor: e.target.value })}
                                >
                                  <option value="all">Vendor (All)</option>
                                  <option value="Cisco">Cisco</option>
                                  <option value="Juniper">Juniper</option>
                                  <option value="Nokia">Nokia</option>
                                  <option value="Huawei">Huawei</option>
                                </select>
                              </div>
                            )}

                            {activeElementFilterTab === 'osVersion' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Operating System / Firmware</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="e.g. IOS-XR 7.3, Junos 21.4..."
                                    value={draftElementFilters.osVersion}
                                    onChange={e => updateDraftElementFilter({ osVersion: e.target.value })}
                                    autoFocus
                                  />
                                  {draftElementFilters.osVersion && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftElementFilter({ osVersion: '' })}
                                      className="net-search-clear"
                                      title="Clear OS version"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeElementFilterTab === 'locationCode' && (
                              <div className="filter-field-group">
                                <label className="column-filter-field-label">Location / Rack Position</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    className="column-filter-input"
                                    placeholder="e.g. RK-A01, POD-1..."
                                    value={draftElementFilters.locationCode}
                                    onChange={e => updateDraftElementFilter({ locationCode: e.target.value })}
                                    autoFocus
                                  />
                                  {draftElementFilters.locationCode && (
                                    <button
                                      type="button"
                                      onClick={() => updateDraftElementFilter({ locationCode: '' })}
                                      className="net-search-clear"
                                      title="Clear location code"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="column-filter-footer">
                          <button
                            type="button"
                            className="column-filter-apply-btn"
                            onClick={handleApplyElementFilters}
                          >
                            Apply filters
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Network Element Table */}
            <div className="net-table-container">
              <table className="net-elements-table">
                <thead>
                  {selectedCategory !== 'DWDM' ? (
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
                      <th style={{ width: '44px', minWidth: '44px', textAlign: 'center' }} className="kb-th"></th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: '110px' }}>Status</th>
                      <th style={{ width: '220px' }}>Name / IP</th>
                      <th style={{ width: '120px' }}>Type</th>
                      <th style={{ width: '90px' }}>Vendor</th>
                      <th style={{ width: '130px' }}>Software version</th>
                      <th style={{ width: '130px' }}>Serial number</th>
                      <th style={{ width: '120px' }}>Shelf · Slot</th>
                      <th style={{ width: '130px' }}>Location Code</th>
                      <th>Source</th>
                      <th style={{ width: '44px', minWidth: '44px', textAlign: 'center' }} className="kb-th"></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredElements.map(el => (
                    selectedCategory === 'DWDM' ? (
                      <tr
                        key={el.id}
                        className="net-table-row is-clickable"
                        onClick={() => openNodeView(el)}
                        title={`Click to open Node view for ${el.name}`}
                      >
                        <td>{renderStatusBadge(el.status)}</td>
                        <td>
                          <div className="net-name-cell">
                            <span className="net-name-primary">{el.name}</span>
                            <span className="net-ip-secondary">{el.ip}</span>
                          </div>
                        </td>
                        <td className="net-model-primary">{el.model}</td>
                        <td className="net-text-muted">{el.vendor}</td>
                        <td className="net-text-muted">{el.osVersion}</td>
                        <td className="net-text-mono">{el.serialNumber}</td>
                        <td className="net-text-mono">{dwdmShelfSlot(el.locationCode).shelfSlot}</td>
                        <td className="net-text-mono">{dwdmShelfSlot(el.locationCode).facility}</td>
                        <td className="net-text-muted">{el.status === 'Verified' || el.status === 'Drifted' ? 'Discovered' : 'Manual'}</td>
                        <ElementRowMenu
                          open={openRowMenuId === el.id}
                          onToggle={(e) => {
                            e.stopPropagation();
                            setOpenRowMenuId(prev => prev === el.id ? null : el.id);
                          }}
                          onClose={() => setOpenRowMenuId(null)}
                          onOpenNode={() => openNodeView(el)}
                          onOpenDetails={() => openResourceDetails(el)}
                        />
                      </tr>
                    ) : (
                      <tr
                        key={el.id}
                        className="net-table-row is-clickable"
                        onClick={() => openNodeView(el)}
                        title={`Click to open Node view for ${el.name}`}
                      >
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
                        <ElementRowMenu
                          open={openRowMenuId === el.id}
                          onToggle={(e) => {
                            e.stopPropagation();
                            setOpenRowMenuId(prev => prev === el.id ? null : el.id);
                          }}
                          onClose={() => setOpenRowMenuId(null)}
                          onOpenNode={() => openNodeView(el)}
                          onOpenDetails={() => openResourceDetails(el)}
                        />
                      </tr>
                    )
                  ))}
                  {filteredElements.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '13px' }}>
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
