import { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GEOGRAPHIC_HIERARCHY,
  type RegionItem,
  type StateItem,
  type CityItem
} from '../../data/geographicHierarchy';
import '../../styles/topology.css';

interface ConnectorLine {
  path: string;
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
}

// Generates a stepped orthogonal connector with smooth rounded fillets, or a cubic bezier when dragged
function buildConnectorPath(x1: number, y1: number, x2: number, y2: number): string {
  // If cards are dragged very close or inverted horizontally, draw a smooth cubic bezier S-curve
  if (x2 <= x1 + 10) {
    const cp = Math.max(30, Math.abs(x1 - x2) * 0.6);
    return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;
  }

  // If vertically aligned (e.g. same row like Maharashtra to Mumbai)
  if (Math.abs(y1 - y2) <= 3) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const midX = (x1 + x2) / 2;
  const dy = y2 - y1;
  const dx = x2 - x1;
  const maxR = 10;
  const r = Math.max(2, Math.min(maxR, Math.abs(dx) / 3, Math.abs(dy) / 2));

  if (dy > 0) {
    // Stepping downwards (y1 < y2)
    return `M ${x1} ${y1} L ${midX - r} ${y1} A ${r} ${r} 0 0 1 ${midX} ${y1 + r} L ${midX} ${y2 - r} A ${r} ${r} 0 0 0 ${midX + r} ${y2} L ${x2} ${y2}`;
  } else {
    // Stepping upwards (y1 > y2, e.g. West Region row 2 to Maharashtra row 1)
    return `M ${x1} ${y1} L ${midX - r} ${y1} A ${r} ${r} 0 0 0 ${midX} ${y1 - r} L ${midX} ${y2 + r} A ${r} ${r} 0 0 1 ${midX + r} ${y2} L ${x2} ${y2}`;
  }
}

// Generates SVG donut arc path between start and end angles in degrees (0 = 12 o'clock)
function describeDonutArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const diff = Math.min(359.99, Math.max(0.1, endAngleDeg - startAngleDeg));
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const sRad = toRad(startAngleDeg);
  const eRad = toRad(startAngleDeg + diff);

  const x1 = cx + rOuter * Math.cos(sRad);
  const y1 = cy + rOuter * Math.sin(sRad);
  const x2 = cx + rOuter * Math.cos(eRad);
  const y2 = cy + rOuter * Math.sin(eRad);

  const x3 = cx + rInner * Math.cos(eRad);
  const y3 = cy + rInner * Math.sin(eRad);
  const x4 = cx + rInner * Math.cos(sRad);
  const y4 = cy + rInner * Math.sin(sRad);

  const largeArcFlag = diff > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
    'Z'
  ].join(' ');
}

interface NetworkHierarchyTopologyProps {
  isExpanded?: boolean;
  onNavigateToCity?: (cityId: string, facility?: 'dc' | 'pop' | 'site') => void;
  onNavigateToSite?: (siteId: string) => void;
  selectedStateId?: string;
  onSelectState?: (stateId: string, stateName: string) => void;
}

export default function NetworkHierarchyTopology({
  onNavigateToCity,
  selectedStateId: propSelectedStateId,
  onSelectState
}: NetworkHierarchyTopologyProps) {
  const nav = useNavigate();

  // ── Hierarchy Selection State (Defaults matching reference design) ──
  const [selectedRegionId, setSelectedRegionId] = useState<string>('north');
  const [selectedStateId, setSelectedStateId] = useState<string>(() => propSelectedStateId || 'punjab');
  const [selectedCityId, setSelectedCityId] = useState<string>('pb-ludhiana');

  const prevPropSelectedStateId = useRef<string | undefined>(propSelectedStateId);

  useEffect(() => {
    if (propSelectedStateId && propSelectedStateId !== selectedStateId) {
      for (const r of GEOGRAPHIC_HIERARCHY) {
        const found = r.states.find(s => s.id === propSelectedStateId);
        if (found) {
          setSelectedRegionId(r.id);
          setSelectedStateId(found.id);
          setSelectedCityId(found.cities[0]?.id || '');
          break;
        }
      }
    } else if (prevPropSelectedStateId.current && !propSelectedStateId) {
      // Circle selection cleared -> restore default North -> Punjab -> Ludhiana
      setSelectedRegionId('north');
      setSelectedStateId('punjab');
      setSelectedCityId('pb-ludhiana');
    }
    prevPropSelectedStateId.current = propSelectedStateId;
  }, [propSelectedStateId, selectedStateId]);

  // ── Hovered facility state on the donut chart (dc | pop | site) ─────
  const [hoveredFacility, setHoveredFacility] = useState<'dc' | 'pop' | 'site' | null>(null);

  // ── In-column Instant Search Queries ───────────────────────────────
  const [regionSearch, setRegionSearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // ── Drag Offset State for the 4 Cards (2D: X and Y) ─────────────────
  const [colOffsets, setColOffsets] = useState<{
    region: { x: number; y: number };
    state: { x: number; y: number };
    city: { x: number; y: number };
    overview: { x: number; y: number };
  }>({
    region: { x: 0, y: 0 },
    state: { x: 0, y: 0 },
    city: { x: 0, y: 0 },
    overview: { x: 0, y: 0 }
  });

  const [activeDragCol, setActiveDragCol] = useState<'region' | 'state' | 'city' | 'overview' | null>(null);

  // ── Canvas Zoom State & Handlers ────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(1.4, +(prev + 0.1).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.7, +(prev - 0.1).toFixed(2)));
  };

  const handleResetAlignment = () => {
    setColOffsets({
      region: { x: 0, y: 0 },
      state: { x: 0, y: 0 },
      city: { x: 0, y: 0 },
      overview: { x: 0, y: 0 }
    });
    setZoomLevel(1);
  };

  const isModified =
    colOffsets.region.x !== 0 || colOffsets.region.y !== 0 ||
    colOffsets.state.x !== 0 || colOffsets.state.y !== 0 ||
    colOffsets.city.x !== 0 || colOffsets.city.y !== 0 ||
    colOffsets.overview.x !== 0 || colOffsets.overview.y !== 0 ||
    zoomLevel !== 1;

  const dragSessionRef = useRef<{
    col: 'region' | 'state' | 'city' | 'overview' | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    col: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });

  const handleDragStart = (col: 'region' | 'state' | 'city' | 'overview', e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('input, button, .geo-search-box, .geo-items-list')) return;

    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { }

    dragSessionRef.current = {
      col,
      startX: e.clientX,
      startY: e.clientY,
      initialX: colOffsets[col].x,
      initialY: colOffsets[col].y
    };
    setActiveDragCol(col);

    const onPointerMove = (me: PointerEvent) => {
      if (!dragSessionRef.current.col) return;
      const dx = (me.clientX - dragSessionRef.current.startX) / zoomLevel;
      const dy = (me.clientY - dragSessionRef.current.startY) / zoomLevel;
      const nextX = Math.round(dragSessionRef.current.initialX + dx);
      const nextY = Math.round(dragSessionRef.current.initialY + dy);

      setColOffsets(prev => {
        if (prev[col].x === nextX && prev[col].y === nextY) return prev;
        return {
          ...prev,
          [col]: { x: nextX, y: nextY }
        };
      });

      updateConnectors();
    };

    const onPointerUp = (ue: PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(ue.pointerId);
      } catch { }
      dragSessionRef.current.col = null;
      setActiveDragCol(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      updateConnectors();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // ── DOM References for Connectors & Scroll Containers ───────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const regionListRef = useRef<HTMLDivElement>(null);
  const stateListRef = useRef<HTMLDivElement>(null);
  const cityListRef = useRef<HTMLDivElement>(null);
  const overviewCardRef = useRef<HTMLDivElement>(null);
  const pieBoxRef = useRef<HTMLDivElement>(null);

  const regionItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stateItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cityItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Derived Selected Objects ───────────────────────────────────────
  const currentRegion = useMemo<RegionItem>(() => {
    return GEOGRAPHIC_HIERARCHY.find(r => r.id === selectedRegionId) || GEOGRAPHIC_HIERARCHY[0];
  }, [selectedRegionId]);

  const currentState = useMemo<StateItem>(() => {
    return currentRegion.states.find(s => s.id === selectedStateId) || currentRegion.states[0];
  }, [currentRegion, selectedStateId]);

  const selectedCity = useMemo<CityItem>(() => {
    if (currentState && currentState.cities.length > 0) {
      const match = currentState.cities.find(c => c.id === selectedCityId);
      if (match) return match;
      return currentState.cities[0];
    }
    return {
      id: 'pb-ludhiana',
      name: 'Ludhiana',
      count: 140,
      stateId: 'punjab',
      dcCount: 6,
      popCount: 18,
      siteCount: 48
    };
  }, [currentState, selectedCityId]);

  // ── Aggregated DC, PoP, and Site Counts for Regions & States ─────────
  const regionCountsMap = useMemo(() => {
    const map: Record<string, { dc: number; pop: number; site: number }> = {};
    for (const r of GEOGRAPHIC_HIERARCHY) {
      let dc = 0, pop = 0, site = 0;
      for (const s of r.states) {
        for (const c of s.cities) {
          dc += c.dcCount || 0;
          pop += c.popCount || 0;
          site += c.siteCount || 0;
        }
      }
      map[r.id] = { dc, pop, site };
    }
    return map;
  }, []);

  const stateCountsMap = useMemo(() => {
    const map: Record<string, { dc: number; pop: number; site: number }> = {};
    for (const r of GEOGRAPHIC_HIERARCHY) {
      for (const s of r.states) {
        let dc = 0, pop = 0, site = 0;
        for (const c of s.cities) {
          dc += c.dcCount || 0;
          pop += c.popCount || 0;
          site += c.siteCount || 0;
        }
        map[s.id] = { dc, pop, site };
      }
    }
    return map;
  }, []);

  // ── Filtered Lists based on In-Column Search ────────────────────────
  const filteredRegions = useMemo(() => {
    const q = regionSearch.trim().toLowerCase();
    if (!q) return GEOGRAPHIC_HIERARCHY;
    return GEOGRAPHIC_HIERARCHY.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.states.some(s => s.name.toLowerCase().includes(q))
    );
  }, [regionSearch]);

  const filteredStates = useMemo(() => {
    if (!currentRegion) return [];
    const q = stateSearch.trim().toLowerCase();
    if (!q) return currentRegion.states;
    return currentRegion.states.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.cities.some(c => c.name.toLowerCase().includes(q))
    );
  }, [currentRegion, stateSearch]);

  const filteredCities = useMemo(() => {
    if (!currentState) return [];
    const q = citySearch.trim().toLowerCase();
    if (!q) return currentState.cities;
    return currentState.cities.filter(c =>
      c.name.toLowerCase().includes(q)
    );
  }, [currentState, citySearch]);

  // ── Selection Handlers ─────────────────────────────────────────────
  const handleSelectRegion = (region: RegionItem) => {
    if (selectedRegionId === region.id) return;
    setSelectedRegionId(region.id);
    const firstState = region.states[0];
    if (firstState) {
      setSelectedStateId(firstState.id);
      setSelectedCityId(firstState.cities[0]?.id || '');
      onSelectState?.(firstState.id, firstState.name);
    } else {
      setSelectedStateId('');
      setSelectedCityId('');
    }
    setStateSearch('');
    setCitySearch('');
    if (cityListRef.current) {
      cityListRef.current.scrollTop = 0;
    }
    if (stateListRef.current) {
      stateListRef.current.scrollTop = 0;
    }
  };

  const handleSelectState = (state: StateItem) => {
    if (selectedStateId === state.id) return;
    setSelectedStateId(state.id);
    setSelectedCityId(state.cities[0]?.id || '');
    setCitySearch('');
    if (cityListRef.current) {
      cityListRef.current.scrollTop = 0;
    }
    onSelectState?.(state.id, state.name);
  };

  const handleSelectCity = (city: CityItem, facility?: 'dc' | 'pop' | 'site') => {
    setSelectedCityId(city.id);
    if (onNavigateToCity) {
      onNavigateToCity(city.id, facility);
    } else {
      nav(`/inventory/location/city/${city.id}${facility ? `?facility=${facility}` : ''}`);
    }
  };

  const handleCityRowClick = (city: CityItem) => {
    if (selectedCityId !== city.id) {
      setSelectedCityId(city.id);
    } else {
      handleSelectCity(city);
    }
  };

  // Hovering on city name instantly aligns the connector thread to that city
  const handleCityHover = (city: CityItem) => {
    if (selectedCityId === city.id) return;
    setSelectedCityId(city.id);
  };

  const handleDrillCity = (city: CityItem, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectCity(city);
  };

  // ── Helper to find the first visible city in the scrolled list ────
  const getFirstVisibleCity = (): CityItem | null => {
    const listEl = cityListRef.current;
    if (!listEl || filteredCities.length === 0) return null;
    const listRect = listEl.getBoundingClientRect();

    for (const city of filteredCities) {
      const el = cityItemRefs.current[city.id];
      if (!el) continue;
      const eRect = el.getBoundingClientRect();
      // If at least 16px of this row is visible below the list top
      // and it hasn't scrolled completely past the bottom
      if (eRect.bottom >= listRect.top + 16 && eRect.top < listRect.bottom - 10) {
        return city;
      }
    }
    return filteredCities[0] || null;
  };

  // ── Dotted Stepped Connector Lines (Region -> State -> City -> Overview) ──
  const [connectors, setConnectors] = useState<{
    regionToState: ConnectorLine | null;
    stateToCity: ConnectorLine | null;
    cityToOverview: ConnectorLine | null;
  }>({
    regionToState: null,
    stateToCity: null,
    cityToOverview: null
  });

  const updateConnectors = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    if (cRect.width === 0 || cRect.height === 0) {
      requestAnimationFrame(updateConnectors);
      return;
    }

    // Direct ref lookup with fallback to data-id and is-selected DOM queries
    const regEl =
      regionItemRefs.current[selectedRegionId] ||
      (container.querySelector(`.geo-region-row[data-id="${selectedRegionId}"]`) as HTMLElement | null) ||
      (container.querySelector('.geo-region-row.is-selected') as HTMLElement | null);

    const effectiveStateId =
      (selectedStateId && stateItemRefs.current[selectedStateId])
        ? selectedStateId
        : currentState?.id;

    const stEl =
      (effectiveStateId ? stateItemRefs.current[effectiveStateId] : null) ||
      (effectiveStateId ? (container.querySelector(`.geo-state-row[data-id="${effectiveStateId}"]`) as HTMLElement | null) : null) ||
      (container.querySelector('.geo-state-row.is-selected') as HTMLElement | null);

    let line1: ConnectorLine | null = null;
    let line2: ConnectorLine | null = null;
    let line3: ConnectorLine | null = null;

    const clampYToList = (y: number, listEl: HTMLElement | null): number => {
      if (!listEl) return y;
      const lR = listEl.getBoundingClientRect();
      if (lR.height === 0) return y;
      const minY = (lR.top - cRect.top + 8) / zoomLevel;
      const maxY = (lR.bottom - cRect.top - 8) / zoomLevel;
      return Math.max(minY, Math.min(maxY, y));
    };

    if (regEl && stEl) {
      const rRect = regEl.getBoundingClientRect();
      const sRect = stEl.getBoundingClientRect();

      const x1 = (rRect.right - cRect.left) / zoomLevel;
      const rawY1 = (rRect.top + rRect.height / 2 - cRect.top) / zoomLevel;
      const y1 = clampYToList(rawY1, regionListRef.current);

      const x2 = (sRect.left - cRect.left) / zoomLevel;
      const rawY2 = (sRect.top + sRect.height / 2 - cRect.top) / zoomLevel;
      const y2 = clampYToList(rawY2, stateListRef.current);

      line1 = {
        path: buildConnectorPath(x1, y1, x2, y2),
        startX: x1,
        startY: y1,
        endX: x2,
        endY: y2
      };
    }

    if (stEl) {
      // Determine the city element to connect to
      let activeCityId = selectedCityId;
      let ctEl =
        (activeCityId ? cityItemRefs.current[activeCityId] : null) ||
        (activeCityId ? (container.querySelector(`.geo-city-row[data-id="${activeCityId}"]`) as HTMLElement | null) : null) ||
        (container.querySelector('.geo-city-row.is-selected') as HTMLElement | null);

      // If active city element is not present or scrolled out of view,
      // fallback to the first visible city in the scrolled list so thread never disappears!
      const listEl = cityListRef.current;
      const isVisibleInList = (el: HTMLElement): boolean => {
        if (!listEl) return true;
        const eR = el.getBoundingClientRect();
        const lR = listEl.getBoundingClientRect();
        if (lR.height === 0 || eR.height === 0) return true;
        const midY = eR.top + eR.height / 2;
        return midY >= lR.top - 2 && midY <= lR.bottom + 2;
      };

      if (!ctEl || !isVisibleInList(ctEl)) {
        const firstVis = getFirstVisibleCity();
        if (firstVis) {
          activeCityId = firstVis.id;
          ctEl =
            cityItemRefs.current[firstVis.id] ||
            (container.querySelector(`.geo-city-row[data-id="${firstVis.id}"]`) as HTMLElement | null) ||
            null;
        }
      }

      if (ctEl) {
        const sRect = stEl.getBoundingClientRect();
        const ctRect = ctEl.getBoundingClientRect();

        const x1 = (sRect.right - cRect.left) / zoomLevel;
        const rawY1 = (sRect.top + sRect.height / 2 - cRect.top) / zoomLevel;
        const y1 = clampYToList(rawY1, stateListRef.current);

        const x2 = (ctRect.left - cRect.left) / zoomLevel;
        const rawY2 = (ctRect.top + ctRect.height / 2 - cRect.top) / zoomLevel;
        const y2 = clampYToList(rawY2, cityListRef.current);

        line2 = {
          path: buildConnectorPath(x1, y1, x2, y2),
          startX: x1,
          startY: y1,
          endX: x2,
          endY: y2
        };

        // Line 3: City -> Square Border Box around Pie Chart in Overview card
        const pEl = pieBoxRef.current || (container.querySelector('.geo-pie-card-box') as HTMLElement | null);
        if (pEl) {
          const pRect = pEl.getBoundingClientRect();
          const ox1 = (ctRect.right - cRect.left) / zoomLevel;
          const oy1 = y2;
          const ox2 = (pRect.left - cRect.left) / zoomLevel;
          const oy2 = (pRect.top + pRect.height / 2 - cRect.top) / zoomLevel;

          line3 = {
            path: buildConnectorPath(ox1, oy1, ox2, oy2),
            startX: ox1,
            startY: oy1,
            endX: ox2,
            endY: oy2
          };
        }
      }
    }

    setConnectors({ regionToState: line1, stateToCity: line2, cityToOverview: line3 });
  };

  useLayoutEffect(() => {
    updateConnectors();
    const t1 = setTimeout(updateConnectors, 20);
    const t2 = setTimeout(updateConnectors, 80);
    const t3 = setTimeout(updateConnectors, 200);
    const t4 = setTimeout(updateConnectors, 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [
    selectedRegionId,
    selectedStateId,
    selectedCityId,
    regionSearch,
    stateSearch,
    citySearch,
    colOffsets,
    zoomLevel
  ]);

  // Recalculate connectors smoothly on window resize, observer notifications, or scroll
  useEffect(() => {
    let rafId: number;
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateConnectors();
      });
    };

    // ResizeObserver watches containers and lists when dimensions settle
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      scheduleUpdate();
    }) : null;

    if (containerRef.current) ro?.observe(containerRef.current);
    if (wrapperRef.current) ro?.observe(wrapperRef.current);
    if (regionListRef.current) ro?.observe(regionListRef.current);
    if (stateListRef.current) ro?.observe(stateListRef.current);
    if (cityListRef.current) ro?.observe(cityListRef.current);
    if (pieBoxRef.current) ro?.observe(pieBoxRef.current);

    // Also trigger when fonts finish loading (critical for text-driven row heights)
    if (document.fonts) {
      document.fonts.ready.then(scheduleUpdate).catch(() => {});
    }

    const handleScrollOrResize = () => {
      scheduleUpdate();
    };

    const handleCityListScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // If current hovered/selected city is still inside the visible viewport, maintain it!
        const currentEl = selectedCityId ? cityItemRefs.current[selectedCityId] : null;
        const listEl = cityListRef.current;
        const isCurrentVisible = (el: HTMLElement | null): boolean => {
          if (!el || !listEl) return false;
          const eR = el.getBoundingClientRect();
          const lR = listEl.getBoundingClientRect();
          const midY = eR.top + eR.height / 2;
          return midY >= lR.top - 2 && midY <= lR.bottom + 2;
        };

        // Fallback to the top visible item only if the current one has scrolled out of view
        if (!isCurrentVisible(currentEl)) {
          const firstVis = getFirstVisibleCity();
          if (firstVis && firstVis.id !== selectedCityId) {
            setSelectedCityId(firstVis.id);
          }
        }
        updateConnectors();
      });
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    const rList = regionListRef.current;
    const sList = stateListRef.current;
    const cList = cityListRef.current;
    const wrapper = wrapperRef.current;

    wrapper?.addEventListener('scroll', handleScrollOrResize, { passive: true });
    rList?.addEventListener('scroll', handleScrollOrResize, { passive: true });
    sList?.addEventListener('scroll', handleScrollOrResize, { passive: true });
    cList?.addEventListener('scroll', handleCityListScroll, { passive: true });

    // Initial mount staggered timers
    const initialT1 = setTimeout(scheduleUpdate, 50);
    const initialT2 = setTimeout(scheduleUpdate, 150);
    const initialT3 = setTimeout(scheduleUpdate, 350);
    const initialT4 = setTimeout(scheduleUpdate, 700);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      clearTimeout(initialT1);
      clearTimeout(initialT2);
      clearTimeout(initialT3);
      clearTimeout(initialT4);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      wrapper?.removeEventListener('scroll', handleScrollOrResize);
      rList?.removeEventListener('scroll', handleScrollOrResize);
      sList?.removeEventListener('scroll', handleScrollOrResize);
      cList?.removeEventListener('scroll', handleCityListScroll);
    };
  }, [selectedRegionId, selectedStateId, selectedCityId, filteredCities]);

  // ── Selected City Distribution Stats for Pie Chart (Column 4) ─────
  const totalElements = (selectedCity.dcCount + selectedCity.popCount + selectedCity.siteCount) || selectedCity.count || 1;
  const dcVal = selectedCity.dcCount || 0;
  const popVal = selectedCity.popCount || 0;
  const siteVal = selectedCity.siteCount || 0;

  const dcPct = (dcVal / totalElements) * 100;
  const popPct = (popVal / totalElements) * 100;
  const sitePct = (siteVal / totalElements) * 100;

  const formatPct = (val: number) => {
    if (val === 0) return '0%';
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + '%';
  };

  const dcAngle = (dcVal / totalElements) * 360;
  const popAngle = (popVal / totalElements) * 360;

  const hasMultiple = [dcVal, popVal, siteVal].filter(v => v > 0).length > 1;
  const sliceGap = hasMultiple ? 2.5 : 0;

  const dcStart = sliceGap / 2;
  const dcEnd = Math.max(dcStart + 0.1, dcAngle - sliceGap / 2);

  const popStart = dcAngle + sliceGap / 2;
  const popEnd = Math.max(popStart + 0.1, dcAngle + popAngle - sliceGap / 2);

  const siteStart = dcAngle + popAngle + sliceGap / 2;
  const siteEnd = Math.max(siteStart + 0.1, 360 - sliceGap / 2);

  const baseOuterR = 82;
  const hoverOuterR = 88;
  const innerR = 50;

  const dcPath = describeDonutArc(105, 105, hoveredFacility === 'dc' ? hoverOuterR : baseOuterR, innerR, dcStart, dcEnd);
  const popPath = describeDonutArc(105, 105, hoveredFacility === 'pop' ? hoverOuterR : baseOuterR, innerR, popStart, popEnd);
  const sitePath = describeDonutArc(105, 105, hoveredFacility === 'site' ? hoverOuterR : baseOuterR, innerR, siteStart, siteEnd);

  const centerInfo = (() => {
    if (hoveredFacility === 'dc') {
      return {
        main: dcVal,
        color: '#15803d',
        sub: `${formatPct(dcPct)} DC`,
        subColor: '#16a34a'
      };
    }
    if (hoveredFacility === 'pop') {
      return {
        main: popVal,
        color: '#c2410c',
        sub: `${formatPct(popPct)} PoP`,
        subColor: '#ea580c'
      };
    }
    if (hoveredFacility === 'site') {
      return {
        main: siteVal,
        color: '#7e22ce',
        sub: `${formatPct(sitePct)} Sites`,
        subColor: '#9333ea'
      };
    }
    return {
      main: totalElements,
      color: '#0f172a',
      sub: 'Total Locations',
      subColor: '#64748b'
    };
  })();

  return (
    <div className="geo-topology-root">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <div className="geo-top-header" style={{ marginBottom: '18px' }}>
        <div className="geo-top-left">
          <h2 className="geo-main-title">Network hierarchy</h2>
        </div>

        <div className="geo-top-right">
          {/* ── Top Legend: DC, PoP Locations, Sites ────────────────── */}
          <div className="geo-top-legend" role="note" aria-label="Network infrastructure types legend">
            <span className="geo-top-legend-item geo-chip-dc">
              <span className="geo-legend-dot geo-dot-dc" />
              <span>Data Centers</span>
            </span>
            <span className="geo-top-legend-item geo-chip-pop">
              <span className="geo-legend-dot geo-dot-pop" />
              <span>PoP Locations</span>
            </span>
            <span className="geo-top-legend-item geo-chip-site">
              <span className="geo-legend-dot geo-dot-site" />
              <span>Sites</span>
            </span>
          </div>

          {/* ── Action Toolbar: Reset Alignment, Zoom In, Zoom Out (Image 2 & 3) ── */}
          <div className="geo-canvas-controls" role="toolbar" aria-label="Hierarchy canvas controls">
            <button
              type="button"
              className={`geo-icon-btn geo-btn-reset${isModified ? ' is-active' : ''}`}
              onClick={handleResetAlignment}
              data-tooltip="Reset alignment"
              title="Reset alignment"
              aria-label="Reset alignment"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-3.1-6.8L21 8" />
                <polyline points="21 3 21 8 16 8" />
              </svg>
            </button>

            <button
              type="button"
              className="geo-icon-btn geo-btn-zoom-in"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 1.4}
              data-tooltip="Zoom in"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <button
              type="button"
              className="geo-icon-btn geo-btn-zoom-out"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.7}
              data-tooltip="Zoom out"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Zoomable Canvas Viewport ─────────────────────────────────── */}
      <div
        className="geo-canvas-viewport"
        ref={containerRef}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          position: 'relative',
          width: '100%',
          overflow: 'visible'
        }}
      >
        {/* ── Dynamic Dotted SVG Connector Layer ───────────────────────── */}
        <svg className="geo-connector-svg">
          <defs>
            <filter id="threadGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#2563eb" floodOpacity="0.5" />
            </filter>
          </defs>
          {connectors.regionToState && (
            <g>
              {/* Background guide thread for depth */}
              <path
                d={connectors.regionToState.path}
                stroke="#bfdbfe"
                strokeWidth="1.5"
                fill="none"
                opacity="0.4"
              />
              {/* Animated data-streaming thread */}
              <path
                className="geo-animated-thread"
                d={connectors.regionToState.path}
                stroke="#2563eb"
                strokeWidth="2.2"
                fill="none"
                filter="url(#threadGlow)"
              />
              {/* Pulsing anchor halo ping */}
              <circle
                className="geo-anchor-glow"
                cx={connectors.regionToState.startX}
                cy={connectors.regionToState.startY}
                r="4"
                fill="#3b82f6"
              />
              {/* Main anchor dot */}
              <circle
                className="geo-animated-anchor"
                cx={connectors.regionToState.startX}
                cy={connectors.regionToState.startY}
                r="3.8"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              {/* End anchor dot on selected State row */}
              {connectors.regionToState.endX !== undefined && (
                <>
                  <circle
                    className="geo-anchor-glow"
                    cx={connectors.regionToState.endX}
                    cy={connectors.regionToState.endY}
                    r="4"
                    fill="#3b82f6"
                  />
                  <circle
                    className="geo-animated-anchor"
                    cx={connectors.regionToState.endX}
                    cy={connectors.regionToState.endY}
                    r="3.8"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                  />
                </>
              )}
            </g>
          )}
          {connectors.stateToCity && (
            <g>
              {/* Background guide thread for depth */}
              <path
                d={connectors.stateToCity.path}
                stroke="#bfdbfe"
                strokeWidth="1.5"
                fill="none"
                opacity="0.4"
              />
              {/* Animated data-streaming thread */}
              <path
                className="geo-animated-thread"
                d={connectors.stateToCity.path}
                stroke="#2563eb"
                strokeWidth="2.2"
                fill="none"
                filter="url(#threadGlow)"
              />
              {/* Pulsing anchor halo ping */}
              <circle
                className="geo-anchor-glow"
                cx={connectors.stateToCity.startX}
                cy={connectors.stateToCity.startY}
                r="4"
                fill="#3b82f6"
              />
              {/* Main anchor dot */}
              <circle
                className="geo-animated-anchor"
                cx={connectors.stateToCity.startX}
                cy={connectors.stateToCity.startY}
                r="3.8"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              {/* End anchor dot on selected City row */}
              {connectors.stateToCity.endX !== undefined && (
                <>
                  <circle
                    className="geo-anchor-glow"
                    cx={connectors.stateToCity.endX}
                    cy={connectors.stateToCity.endY}
                    r="4"
                    fill="#3b82f6"
                  />
                  <circle
                    className="geo-animated-anchor"
                    cx={connectors.stateToCity.endX}
                    cy={connectors.stateToCity.endY}
                    r="3.8"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                  />
                </>
              )}
            </g>
          )}
          {connectors.cityToOverview && (
            <g>
              {/* Background guide thread for depth */}
              <path
                d={connectors.cityToOverview.path}
                stroke="#bfdbfe"
                strokeWidth="1.5"
                fill="none"
                opacity="0.4"
              />
              {/* Animated data-streaming thread */}
              <path
                className="geo-animated-thread"
                d={connectors.cityToOverview.path}
                stroke="#2563eb"
                strokeWidth="2.2"
                fill="none"
                filter="url(#threadGlow)"
              />
              {/* Pulsing anchor halo ping */}
              <circle
                className="geo-anchor-glow"
                cx={connectors.cityToOverview.startX}
                cy={connectors.cityToOverview.startY}
                r="4"
                fill="#3b82f6"
              />
              {/* Main anchor dot */}
              <circle
                className="geo-animated-anchor"
                cx={connectors.cityToOverview.startX}
                cy={connectors.cityToOverview.startY}
                r="3.8"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              {/* End anchor dot on Pie square border box */}
              {connectors.cityToOverview.endX !== undefined && (
                <>
                  <circle
                    className="geo-anchor-glow"
                    cx={connectors.cityToOverview.endX}
                    cy={connectors.cityToOverview.endY}
                    r="4"
                    fill="#3b82f6"
                  />
                  <circle
                    className="geo-animated-anchor"
                    cx={connectors.cityToOverview.endX}
                    cy={connectors.cityToOverview.endY}
                    r="3.8"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                  />
                </>
              )}
            </g>
          )}
        </svg>

        {/* ── 3-Column Layout: Regions -> States -> Cities ─────────────── */}
        <div className="geo-columns-wrapper" ref={wrapperRef}>
          <div className="geo-columns-grid">

            {/* ── Column 1: Regions ────────────────────────────────────── */}
            <div
              className={`geo-col-card geo-region-col${activeDragCol === 'region' ? ' is-dragging' : ''}`}
              style={{ transform: `translate3d(${colOffsets.region.x}px, ${colOffsets.region.y}px, 0)` }}
            >
              <div
                className="geo-col-header geo-drag-handle"
                onPointerDown={e => handleDragStart('region', e)}
                title="Drag card freely in any direction (left, right, up, down)"
              >
                <span className="geo-col-title">Regions ({GEOGRAPHIC_HIERARCHY.length})</span>
                <span className="geo-drag-icon" title="Drag to reposition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.7" />
                    <circle cx="9" cy="12" r="1.7" />
                    <circle cx="9" cy="19" r="1.7" />
                    <circle cx="15" cy="5" r="1.7" />
                    <circle cx="15" cy="12" r="1.7" />
                    <circle cx="15" cy="19" r="1.7" />
                  </svg>
                </span>
              </div>

              <div className="geo-search-box">
                <span className="geo-search-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="geo-search-input"
                  placeholder="Search region"
                  value={regionSearch}
                  onChange={e => setRegionSearch(e.target.value)}
                />
                {regionSearch && (
                  <button
                    type="button"
                    className="geo-search-clear"
                    onClick={() => setRegionSearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="geo-items-list geo-region-list" ref={regionListRef}>
                {filteredRegions.map(region => {
                  const isSelected = region.id === selectedRegionId;
                  const rCounts = regionCountsMap[region.id] || { dc: 0, pop: 0, site: 0 };
                  return (
                    <div
                      key={region.id}
                      data-id={region.id}
                      ref={el => {
                        regionItemRefs.current[region.id] = el;
                      }}
                      className={`geo-card-row geo-region-row${isSelected ? ' is-selected' : ''}`}
                      onClick={() => handleSelectRegion(region)}
                      onMouseEnter={() => handleSelectRegion(region)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="geo-card-text">
                        <span className="geo-card-title geo-region-title">{region.name}</span>
                        <span className="geo-card-sub geo-region-sub">
                          {region.states.length} States · {region.states.reduce((acc, s) => acc + s.cities.length, 0)} Cities
                        </span>
                        <div className="geo-card-sub geo-chips-sub">
                          <span
                            className="geo-chip geo-chip-dc"
                            title={`${rCounts.dc.toLocaleString()} Data Centers`}
                          >
                            {rCounts.dc.toLocaleString()}
                          </span>
                          <span
                            className="geo-chip geo-chip-pop"
                            title={`${rCounts.pop.toLocaleString()} PoP Locations`}
                          >
                            {rCounts.pop.toLocaleString()}
                          </span>
                          <span
                            className="geo-chip geo-chip-site"
                            title={`${rCounts.site.toLocaleString()} Sites`}
                          >
                            {rCounts.site.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="geo-card-chevron geo-region-chevron">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </div>
                  );
                })}
                {filteredRegions.length === 0 && (
                  <div className="geo-empty-state">No regions found</div>
                )}
              </div>
            </div>

            {/* ── Column 2: States in Selected Region ───────────────────── */}
            <div
              className={`geo-col-card geo-state-col${activeDragCol === 'state' ? ' is-dragging' : ''}`}
              style={{ transform: `translate3d(${colOffsets.state.x}px, ${colOffsets.state.y}px, 0)` }}
            >
              <div
                className="geo-col-header geo-drag-handle"
                onPointerDown={e => handleDragStart('state', e)}
                title="Drag card freely in any direction (left, right, up, down)"
              >
                <span className="geo-col-title">
                  States in {currentRegion.name} ({currentRegion.states.length})
                </span>
                <span className="geo-drag-icon" title="Drag to reposition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.7" />
                    <circle cx="9" cy="12" r="1.7" />
                    <circle cx="9" cy="19" r="1.7" />
                    <circle cx="15" cy="5" r="1.7" />
                    <circle cx="15" cy="12" r="1.7" />
                    <circle cx="15" cy="19" r="1.7" />
                  </svg>
                </span>
              </div>

              <div className="geo-search-box">
                <span className="geo-search-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="geo-search-input"
                  placeholder="Search state"
                  value={stateSearch}
                  onChange={e => setStateSearch(e.target.value)}
                />
                {stateSearch && (
                  <button
                    type="button"
                    className="geo-search-clear"
                    onClick={() => setStateSearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="geo-items-list geo-state-list" ref={stateListRef}>
                {filteredStates.map(state => {
                  const isSelected = state.id === selectedStateId;
                  const sCounts = stateCountsMap[state.id] || { dc: 0, pop: 0, site: 0 };
                  return (
                    <div
                      key={state.id}
                      data-id={state.id}
                      ref={el => {
                        stateItemRefs.current[state.id] = el;
                      }}
                      className={`geo-card-row geo-state-row${isSelected ? ' is-selected' : ''}`}
                      onClick={() => handleSelectState(state)}
                      onMouseEnter={() => handleSelectState(state)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="geo-card-text">
                        <span className="geo-card-title">{state.name}</span>
                        <div className="geo-card-sub geo-chips-sub">
                          <span
                            className="geo-chip geo-chip-city"
                            title={`${state.cities.length} ${state.cities.length === 1 ? 'City' : 'Cities'} in ${state.name}`}
                          >
                            {state.cities.length} {state.cities.length === 1 ? 'City' : 'Cities'}
                          </span>
                          <span
                            className="geo-chip geo-chip-dc"
                            title={`${sCounts.dc.toLocaleString()} Data Centers`}
                          >
                            {sCounts.dc.toLocaleString()}
                          </span>
                          <span
                            className="geo-chip geo-chip-pop"
                            title={`${sCounts.pop.toLocaleString()} PoP Locations`}
                          >
                            {sCounts.pop.toLocaleString()}
                          </span>
                          <span
                            className="geo-chip geo-chip-site"
                            title={`${sCounts.site.toLocaleString()} Sites`}
                          >
                            {sCounts.site.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="geo-card-chevron">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </div>
                  );
                })}
                {filteredStates.length === 0 && (
                  <div className="geo-empty-state">No states found</div>
                )}
              </div>
            </div>

            {/* ── Column 3: Cities in Selected State ────────────────────── */}
            <div
              className={`geo-col-card geo-city-col${activeDragCol === 'city' ? ' is-dragging' : ''}`}
              style={{ transform: `translate3d(${colOffsets.city.x}px, ${colOffsets.city.y}px, 0)` }}
            >
              <div
                className="geo-col-header geo-drag-handle"
                onPointerDown={e => handleDragStart('city', e)}
                title="Drag card freely in any direction (left, right, up, down)"
              >
                <span className="geo-col-title">
                  Cities in {currentState?.name || 'Selected State'} ({currentState?.cities.length || 0})
                </span>
                <span className="geo-drag-icon" title="Drag to reposition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.7" />
                    <circle cx="9" cy="12" r="1.7" />
                    <circle cx="9" cy="19" r="1.7" />
                    <circle cx="15" cy="5" r="1.7" />
                    <circle cx="15" cy="12" r="1.7" />
                    <circle cx="15" cy="19" r="1.7" />
                  </svg>
                </span>
              </div>

              <div className="geo-search-box">
                <span className="geo-search-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="geo-search-input"
                  placeholder="Search city"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                />
                {citySearch && (
                  <button
                    type="button"
                    className="geo-search-clear"
                    onClick={() => setCitySearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="geo-items-list" ref={cityListRef}>
                {filteredCities.map(city => {
                  const isSelected = city.id === selectedCityId;
                  return (
                    <div
                      key={city.id}
                      data-id={city.id}
                      ref={el => {
                        cityItemRefs.current[city.id] = el;
                      }}
                      className={`geo-card-row geo-city-row${isSelected ? ' is-selected' : ''}`}
                      onClick={() => handleCityRowClick(city)}
                      onMouseEnter={() => handleCityHover(city)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="geo-card-text">
                        <span className="geo-card-title geo-city-title">{city.name}</span>
                        <div className="geo-card-sub geo-city-sub">
                          <button
                            type="button"
                            className="geo-chip geo-chip-dc"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCity(city, 'dc');
                            }}
                            title={`${city.dcCount || 0} Data Centers`}
                          >
                            {city.dcCount || 0}
                          </button>
                          <button
                            type="button"
                            className="geo-chip geo-chip-pop"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCity(city, 'pop');
                            }}
                            title={`${city.popCount || 0} PoP Locations`}
                          >
                            {city.popCount || 0}
                          </button>
                          <button
                            type="button"
                            className="geo-chip geo-chip-site"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCity(city, 'site');
                            }}
                            title={`${city.siteCount || 0} Sites`}
                          >
                            {city.siteCount || 0}
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="geo-card-chevron"
                        title={`View locations in ${city.name}`}
                        onClick={e => handleDrillCity(city, e)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {filteredCities.length === 0 && (
                  <div className="geo-empty-state">No cities found</div>
                )}
              </div>
            </div>

            {/* ── Column 4: Selected City Infrastructure Distribution (Pie Chart) ── */}
            <div
              ref={overviewCardRef}
              className={`geo-col-card geo-overview-col${activeDragCol === 'overview' ? ' is-dragging' : ''}`}
              style={{ transform: `translate3d(${colOffsets.overview.x}px, ${colOffsets.overview.y}px, 0)` }}
            >
              <div
                className="geo-col-header geo-drag-handle"
                onPointerDown={e => handleDragStart('overview', e)}
                title="Drag card freely in any direction"
              >
                <div className="geo-overview-title-wrap">
                  <span className="geo-col-title geo-overview-title">
                    {selectedCity.name}
                  </span>
                  <span className="geo-overview-subtitle">
                    Distribution ({totalElements} Locations)
                  </span>
                </div>
                <span className="geo-drag-icon" title="Drag to reposition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.7" />
                    <circle cx="9" cy="12" r="1.7" />
                    <circle cx="9" cy="19" r="1.7" />
                    <circle cx="15" cy="5" r="1.7" />
                    <circle cx="15" cy="12" r="1.7" />
                    <circle cx="15" cy="19" r="1.7" />
                  </svg>
                </span>
              </div>

              {/* ── Square Box Around Donut / Pie Chart ─────────────────── */}
              <div className="geo-pie-card-box" ref={pieBoxRef}>
                <div className="geo-pie-container">
                  <svg
                    className="geo-pie-svg"
                    viewBox="0 0 210 210"
                    width="210"
                    height="210"
                    role="img"
                    aria-label={`Location distribution for ${selectedCity.name}`}
                  >
                    <defs>
                      <filter id="pieHoverGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.35" />
                      </filter>
                    </defs>

                    {/* Slices */}
                    <g className="geo-pie-slices">
                      {/* Data Centers Slice (Green) */}
                      {dcVal > 0 && (
                        <path
                          d={dcPath}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className={`geo-pie-slice geo-pie-slice-dc${hoveredFacility === 'dc' ? ' is-active' : ''}`}
                          onClick={() => handleSelectCity(selectedCity, 'dc')}
                          onMouseEnter={() => setHoveredFacility('dc')}
                          onMouseLeave={() => setHoveredFacility(null)}
                        >
                          <title>{`Data Centers: ${dcVal} (${formatPct(dcPct)}) · Click to view listing`}</title>
                        </path>
                      )}

                      {/* PoP Slice (Orange) */}
                      {popVal > 0 && (
                        <path
                          d={popPath}
                          fill="#f97316"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className={`geo-pie-slice geo-pie-slice-pop${hoveredFacility === 'pop' ? ' is-active' : ''}`}
                          onClick={() => handleSelectCity(selectedCity, 'pop')}
                          onMouseEnter={() => setHoveredFacility('pop')}
                          onMouseLeave={() => setHoveredFacility(null)}
                        >
                          <title>{`PoP Locations: ${popVal} (${formatPct(popPct)}) · Click to view listing`}</title>
                        </path>
                      )}

                      {/* Sites Slice (Purple) */}
                      {siteVal > 0 && (
                        <path
                          d={sitePath}
                          fill="#a855f7"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className={`geo-pie-slice geo-pie-slice-site${hoveredFacility === 'site' ? ' is-active' : ''}`}
                          onClick={() => handleSelectCity(selectedCity, 'site')}
                          onMouseEnter={() => setHoveredFacility('site')}
                          onMouseLeave={() => setHoveredFacility(null)}
                        >
                          <title>{`Sites: ${siteVal} (${formatPct(sitePct)}) · Click to view listing`}</title>
                        </path>
                      )}
                    </g>

                    {/* Center Metric Text */}
                    <g className="geo-pie-center-text" pointerEvents="none">
                      <text
                        x="105"
                        y="100"
                        textAnchor="middle"
                        fill={centerInfo.color}
                        fontSize="26"
                        fontWeight="700"
                        letterSpacing="-0.02em"
                      >
                        {centerInfo.main}
                      </text>
                      <text
                        x="105"
                        y="120"
                        textAnchor="middle"
                        fill={centerInfo.subColor}
                        fontSize="11.5"
                        fontWeight="600"
                        letterSpacing="-0.01em"
                      >
                        {centerInfo.sub}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* ── Interactive Category Percentage Legend Cards ──────── */}
              <div className="geo-pie-legend">
                {/* Data Centers */}
                <button
                  type="button"
                  className={`geo-pie-legend-item geo-pie-legend-dc${hoveredFacility === 'dc' ? ' is-hovered' : ''}`}
                  onClick={() => handleSelectCity(selectedCity, 'dc')}
                  onMouseEnter={() => setHoveredFacility('dc')}
                  onMouseLeave={() => setHoveredFacility(null)}
                  title={`Click to view all ${dcVal} Data Centers in ${selectedCity.name}`}
                >
                  <div className="geo-pie-legend-left">
                    <span className="geo-pie-dot geo-pie-dot-dc" />
                    <span className="geo-pie-legend-label">Data Centers</span>
                  </div>
                  <div className="geo-pie-legend-right">
                    <span className="geo-pie-legend-count">{dcVal}</span>
                    <span className="geo-pie-pct-badge geo-pie-pct-dc">{formatPct(dcPct)}</span>
                    <svg className="geo-pie-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>

                {/* PoP Locations */}
                <button
                  type="button"
                  className={`geo-pie-legend-item geo-pie-legend-pop${hoveredFacility === 'pop' ? ' is-hovered' : ''}`}
                  onClick={() => handleSelectCity(selectedCity, 'pop')}
                  onMouseEnter={() => setHoveredFacility('pop')}
                  onMouseLeave={() => setHoveredFacility(null)}
                  title={`Click to view all ${popVal} PoP Locations in ${selectedCity.name}`}
                >
                  <div className="geo-pie-legend-left">
                    <span className="geo-pie-dot geo-pie-dot-pop" />
                    <span className="geo-pie-legend-label">PoP Locations</span>
                  </div>
                  <div className="geo-pie-legend-right">
                    <span className="geo-pie-legend-count">{popVal}</span>
                    <span className="geo-pie-pct-badge geo-pie-pct-pop">{formatPct(popPct)}</span>
                    <svg className="geo-pie-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>

                {/* Sites */}
                <button
                  type="button"
                  className={`geo-pie-legend-item geo-pie-legend-site${hoveredFacility === 'site' ? ' is-hovered' : ''}`}
                  onClick={() => handleSelectCity(selectedCity, 'site')}
                  onMouseEnter={() => setHoveredFacility('site')}
                  onMouseLeave={() => setHoveredFacility(null)}
                  title={`Click to view all ${siteVal} Sites in ${selectedCity.name}`}
                >
                  <div className="geo-pie-legend-left">
                    <span className="geo-pie-dot geo-pie-dot-site" />
                    <span className="geo-pie-legend-label">Sites</span>
                  </div>
                  <div className="geo-pie-legend-right">
                    <span className="geo-pie-legend-count">{siteVal}</span>
                    <span className="geo-pie-pct-badge geo-pie-pct-site">{formatPct(sitePct)}</span>
                    <svg className="geo-pie-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              </div>

              {/* ── View All Infrastructure Footer Button ────────────── */}
              <button
                type="button"
                className="geo-pie-view-all-btn"
                onClick={() => handleSelectCity(selectedCity)}
                title={`Open complete network inventory for ${selectedCity.name}`}
              >
                <span>View all in {selectedCity.name}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
