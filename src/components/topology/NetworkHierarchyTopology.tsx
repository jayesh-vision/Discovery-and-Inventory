import { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import {
  ESTATE_HIERARCHY,
  type CircleHierarchy,
  type PopLocation,
  type NetworkElement
} from '../../data/networkHierarchy';
import '../../styles/topology.css';

interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TooltipState {
  title: string;
  x: number;
  y: number;
  placement: 'top' | 'bottom';
}

interface NetworkHierarchyTopologyProps {
  isExpanded?: boolean;
  onNavigateToSite?: (siteId: string) => void;
}

export default function NetworkHierarchyTopology({
  isExpanded = false,
  onNavigateToSite
}: NetworkHierarchyTopologyProps) {
  // Top bar filters
  const [selectedCircleFilter, setSelectedCircleFilter] = useState<string>('all');
  const [popSearch, setPopSearch] = useState('');
  const [nodeSearch, setNodeSearch] = useState('');

  // Floating hover tooltip state
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLElement>,
    title: string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isNearTop = rect.top < 80;
    setTooltip({
      title,
      x: rect.left + rect.width / 2,
      y: isNearTop ? rect.bottom + 6 : rect.top - 6,
      placement: isNearTop ? 'bottom' : 'top'
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  useEffect(() => {
    const handleScroll = () => setTooltip(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  // Multi-column cascading selection state
  const estate = ESTATE_HIERARCHY;
  const [selectedCircleId, setSelectedCircleId] = useState<string>('circle-mh');
  const [selectedPopId, setSelectedPopId] = useState<string>('mum-dc1-pop');
  const [selectedElementId, setSelectedElementId] = useState<string>('mum-cr01');
  const [selectedInterfaceId, setSelectedInterfaceId] = useState<string>('');

  // In-column instant search queries
  const [elementSearch, setElementSearch] = useState('');
  const [interfaceSearch, setInterfaceSearch] = useState('');

  // Filtered circles based on top bar circle filter
  const visibleCircles = useMemo(() => {
    if (selectedCircleFilter === 'all') return estate.circles;
    return estate.circles.filter(c => c.code.toLowerCase() === selectedCircleFilter.toLowerCase() || c.id === selectedCircleFilter);
  }, [estate.circles, selectedCircleFilter]);

  // Current selections
  const currentCircle = useMemo(() => {
    return estate.circles.find(c => c.id === selectedCircleId) || visibleCircles[0] || estate.circles[0];
  }, [estate.circles, visibleCircles, selectedCircleId]);

  const visiblePops = useMemo(() => {
    if (!currentCircle) return [];
    if (!popSearch.trim()) return currentCircle.pops;
    const q = popSearch.toLowerCase();
    return currentCircle.pops.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
    );
  }, [currentCircle, popSearch]);

  const currentPop = useMemo(() => {
    if (!currentCircle) return null;
    return visiblePops.find(p => p.id === selectedPopId) || visiblePops[0] || null;
  }, [currentCircle, visiblePops, selectedPopId]);

  const filteredElements = useMemo(() => {
    if (!currentPop) return [];
    let list = currentPop.elements;
    const q = (elementSearch || nodeSearch).trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.model.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.ip.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentPop, elementSearch, nodeSearch]);

  const currentElement = useMemo(() => {
    if (!currentPop) return null;
    return filteredElements.find(e => e.id === selectedElementId) || filteredElements[0] || null;
  }, [currentPop, filteredElements, selectedElementId]);

  const filteredInterfaces = useMemo(() => {
    if (!currentElement) return [];
    if (!interfaceSearch.trim()) return currentElement.interfaces;
    const q = interfaceSearch.toLowerCase();
    return currentElement.interfaces.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.linkId.toLowerCase().includes(q) ||
      (i.peer && i.peer.toLowerCase().includes(q))
    );
  }, [currentElement, interfaceSearch]);

  // When circle changes, cascade select first PoP & element
  const handleSelectCircle = (circle: CircleHierarchy) => {
    setSelectedCircleId(circle.id);
    const firstPop = circle.pops[0];
    if (firstPop) {
      setSelectedPopId(firstPop.id);
      const firstEl = firstPop.elements[0];
      if (firstEl) {
        setSelectedElementId(firstEl.id);
        setSelectedInterfaceId(firstEl.interfaces[0]?.id || '');
      }
    }
  };

  // When PoP changes, cascade select first element & interface
  const handleSelectPop = (pop: PopLocation) => {
    setSelectedPopId(pop.id);
    const firstEl = pop.elements[0];
    if (firstEl) {
      setSelectedElementId(firstEl.id);
      setSelectedInterfaceId(firstEl.interfaces[0]?.id || '');
    } else {
      setSelectedElementId('');
      setSelectedInterfaceId('');
    }
  };

  // When element changes, cascade select first interface
  const handleSelectElement = (el: NetworkElement) => {
    setSelectedElementId(el.id);
    setSelectedInterfaceId(el.interfaces[0]?.id || '');
  };

  // ── SVG Bezier curve connector coordinates calculation ─────────────
  const canvasRef = useRef<HTMLDivElement>(null);
  const rootCardRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const popRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const elementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const interfaceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [lines, setLines] = useState<{
    rootToCircle: ConnectorLine | null;
    circleToPop: ConnectorLine | null;
    popToElement: ConnectorLine | null;
    elementToInterface: ConnectorLine | null;
  }>({
    rootToCircle: null,
    circleToPop: null,
    popToElement: null,
    elementToInterface: null
  });

  const updateConnectors = () => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft;
    const scrollTop = canvasRef.current.scrollTop;

    const getRightCenter = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.right - canvasRect.left + scrollLeft,
        y: rect.top + rect.height / 2 - canvasRect.top + scrollTop
      };
    };

    const getLeftCenter = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left - canvasRect.left + scrollLeft,
        y: rect.top + rect.height / 2 - canvasRect.top + scrollTop
      };
    };

    let rootToCirc: ConnectorLine | null = null;
    let circToPop: ConnectorLine | null = null;
    let popToEl: ConnectorLine | null = null;
    let elToIf: ConnectorLine | null = null;

    if (rootCardRef.current && circleRefs.current[selectedCircleId]) {
      const p1 = getRightCenter(rootCardRef.current);
      const p2 = getLeftCenter(circleRefs.current[selectedCircleId]!);
      rootToCirc = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }

    if (circleRefs.current[selectedCircleId] && popRefs.current[selectedPopId]) {
      const p1 = getRightCenter(circleRefs.current[selectedCircleId]!);
      const p2 = getLeftCenter(popRefs.current[selectedPopId]!);
      circToPop = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }

    if (popRefs.current[selectedPopId] && elementRefs.current[selectedElementId]) {
      const p1 = getRightCenter(popRefs.current[selectedPopId]!);
      const p2 = getLeftCenter(elementRefs.current[selectedElementId]!);
      popToEl = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }

    const firstIfId = selectedInterfaceId || filteredInterfaces[0]?.id;
    if (firstIfId && elementRefs.current[selectedElementId] && interfaceRefs.current[firstIfId]) {
      const p1 = getRightCenter(elementRefs.current[selectedElementId]!);
      const p2 = getLeftCenter(interfaceRefs.current[firstIfId]!);
      elToIf = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }

    setLines({
      rootToCircle: rootToCirc,
      circleToPop: circToPop,
      popToElement: popToEl,
      elementToInterface: elToIf
    });
  };

  useLayoutEffect(() => {
    updateConnectors();
    const handleResize = () => updateConnectors();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [
    selectedCircleId,
    selectedPopId,
    selectedElementId,
    selectedInterfaceId,
    elementSearch,
    interfaceSearch,
    popSearch,
    nodeSearch,
    isExpanded
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleScroll = () => updateConnectors();
    canvas.addEventListener('scroll', handleScroll, { passive: true });
    return () => canvas.removeEventListener('scroll', handleScroll);
  }, []);

  const renderBezier = (l: ConnectorLine | null, key: string, strokeColor = '#3b82f6') => {
    if (!l) return null;
    const dx = Math.max(30, Math.abs(l.x2 - l.x1) * 0.45);
    const d = `M ${l.x1} ${l.y1} C ${l.x1 + dx} ${l.y1}, ${l.x2 - dx} ${l.y2}, ${l.x2} ${l.y2}`;
    return (
      <path
        key={key}
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className="topo-explorer" aria-label="Network hierarchy cascading topology">
      {/* ── Top Header & Filter Controls ────────────────────────────── */}
      <div className="topo-control-bar">
        <div className="topo-control-left">
          {/* Circle selector */}
          <div className="topo-select-group">
            <label className="topo-select-label">Circle</label>
            <select
              className="topo-select-control"
              value={selectedCircleFilter}
              onChange={e => {
                setSelectedCircleFilter(e.target.value);
                if (e.target.value !== 'all') {
                  const target = estate.circles.find(c => c.code.toLowerCase() === e.target.value.toLowerCase() || c.id === e.target.value);
                  if (target) handleSelectCircle(target);
                }
              }}
            >
              <option value="all">All Circles (9)</option>
              {estate.circles.map(c => (
                <option key={c.id} value={c.code}>{c.name} ({c.popCount} PoPs)</option>
              ))}
            </select>
          </div>

          {/* PoP / Site search */}
          <div className="topo-search-input-group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="topo-text-input"
              placeholder="Search PoP or site..."
              value={popSearch}
              onChange={e => setPopSearch(e.target.value)}
            />
            {popSearch && (
              <button type="button" className="topo-input-clear" onClick={() => setPopSearch('')}>✕</button>
            )}
          </div>

          {/* Node search */}
          <div className="topo-search-input-group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
            </svg>
            <input
              type="text"
              className="topo-text-input"
              placeholder="Search node / IP..."
              value={nodeSearch}
              onChange={e => setNodeSearch(e.target.value)}
            />
            {nodeSearch && (
              <button type="button" className="topo-input-clear" onClick={() => setNodeSearch('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Canvas with Miller Columns ──────────────────────────── */}
      <div className="topo-canvas-container" ref={canvasRef}>
        {/* SVG Connector lines overlay */}
        <svg className="topo-svg-layer" width="2400" height="700">
          {renderBezier(lines.rootToCircle, 'r-to-circ', '#a855f7')}
          {renderBezier(lines.circleToPop, 'circ-to-pop', '#0284c7')}
          {renderBezier(lines.popToElement, 'pop-to-el', '#0d9488')}
          {renderBezier(lines.elementToInterface, 'el-to-if', '#3b82f6')}
        </svg>

        <div className="topo-columns-flow">
          {/* Level 0: Central Hub / Root Datacenters Card */}
          <div className="topo-root-node-wrap">
            <div
              className="topo-root-card"
              ref={rootCardRef}
              onMouseEnter={e => handleMouseEnter(e, 'Datacenters Core Hub')}
              onMouseLeave={handleMouseLeave}
              title="Datacenters Core Hub"
            >
              <div className="topo-root-icon">
                {/* Purple Datacenter Server Rack icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2.5" />
                  <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="2.5" />
                </svg>
              </div>
              <div className="topo-root-title">Datacenters</div>
              <div className="topo-root-badge">24 Datacenters</div>
              <div className="topo-root-meta">
                <div><b>230</b> PoP</div>
                <div><b>1,520</b> Sites</div>
              </div>
            </div>
          </div>

          {/* Column 1: Circles (PoPs & Sites by Circle) */}
          <div className="topo-col topo-col-regions">
            <div className="topo-col-header">
              <span className="topo-col-title">Circles</span>
              <span className="topo-col-count">{visibleCircles.length}</span>
            </div>
            <div className="topo-card-list" onScroll={handleMouseLeave}>
              {visibleCircles.map(circle => {
                const isSelected = circle.id === selectedCircleId;
                return (
                  <div
                    key={circle.id}
                    ref={el => { circleRefs.current[circle.id] = el; }}
                    className={`topo-item-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => handleSelectCircle(circle)}
                    onMouseEnter={e => handleMouseEnter(e, circle.name)}
                    onMouseLeave={handleMouseLeave}
                    role="button"
                    tabIndex={0}
                    title={circle.name}
                    aria-label={`Circle ${circle.name}`}
                  >
                    <div className="topo-item-main">
                      <span className="topo-badge-circle">{circle.code}</span>
                      <div className="topo-item-text">
                        <span className="topo-item-name">{circle.name}</span>
                        <span className="topo-item-sub">{circle.popCount} PoPs · {circle.siteCount} Sites</span>
                      </div>
                    </div>
                    {circle.alerts > 0 && (
                      <span className="topo-alert-badge" title={`${circle.alerts} failed / alerts`}>
                        {circle.alerts}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: PoP Locations */}
          <div className="topo-col topo-col-territories">
            <div className="topo-col-header">
              <span className="topo-col-title">
                PoPs {currentCircle ? `— ${currentCircle.name}` : ''}
              </span>
              <span className="topo-col-count">
                {visiblePops.length}
              </span>
            </div>
            <div className="topo-card-list" onScroll={handleMouseLeave}>
              {visiblePops.map(pop => {
                const isSelected = pop.id === selectedPopId;
                return (
                  <div
                    key={pop.id}
                    ref={el => { popRefs.current[pop.id] = el; }}
                    className={`topo-item-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => handleSelectPop(pop)}
                    onMouseEnter={e => handleMouseEnter(e, pop.name)}
                    onMouseLeave={handleMouseLeave}
                    role="button"
                    tabIndex={0}
                    title={pop.name}
                    aria-label={`PoP ${pop.name}`}
                  >
                    <div className="topo-item-main">
                      <span className="topo-badge-circle" style={{ background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}>
                        {pop.badge}
                      </span>
                      <div className="topo-item-text">
                        <span className="topo-item-name">{pop.name}</span>
                        <span className="topo-item-sub">{pop.siteCount} Sites · {pop.elementCount} Elements</span>
                      </div>
                    </div>
                    {pop.alerts > 0 && (
                      <span className="topo-alert-badge" title={`${pop.alerts} failed / alerts`}>
                        {pop.alerts}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: Network Elements */}
          <div className="topo-col topo-col-elements">
            <div className="topo-col-header">
              <span className="topo-col-title">
                Network elements {currentPop ? `— ${currentPop.name}` : ''}
              </span>
              <span className="topo-col-count">
                {currentPop ? currentPop.elements.length : 0}
              </span>
            </div>
            <div className="topo-search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search network element"
                value={elementSearch}
                onChange={e => setElementSearch(e.target.value)}
              />
              {elementSearch && (
                <button type="button" className="topo-input-clear" onClick={() => setElementSearch('')}>✕</button>
              )}
            </div>
            <div className="topo-card-list" onScroll={handleMouseLeave}>
              {filteredElements.map(el => {
                const isSelected = el.id === selectedElementId;
                return (
                  <div
                    key={el.id}
                    ref={elem => { elementRefs.current[el.id] = elem; }}
                    className={`topo-item-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => handleSelectElement(el)}
                    onMouseEnter={e => handleMouseEnter(e, `${el.name} (${el.model})`)}
                    onMouseLeave={handleMouseLeave}
                    role="button"
                    tabIndex={0}
                    title={`${el.name} (${el.model})`}
                    aria-label={`Element ${el.name}`}
                  >
                    <div className="topo-item-main">
                      <div className={`topo-device-icon${el.status === 'alert' ? ' is-alert' : ''}`}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="7" rx="8" ry="3.5" />
                          <path d="M4 7v10c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5V7" />
                          <path d="M7 13.5l5 2 5-2" />
                        </svg>
                      </div>
                      <div className="topo-item-text">
                        <span className="topo-item-name">{el.name}</span>
                        <span className="topo-item-sub">{el.interfaceCount} Interfaces · {el.model}</span>
                      </div>
                    </div>
                    {el.alerts > 0 && (
                      <span className="topo-alert-badge" title={`${el.alerts} alerts`}>
                        {el.alerts}
                      </span>
                    )}
                    {onNavigateToSite && (
                      <button
                        type="button"
                        className="topo-input-clear"
                        title={`View Site details for ${el.name}`}
                        style={{ marginLeft: '6px', fontSize: '14px', color: 'var(--vw-color-gray-400)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToSite(el.id);
                        }}
                      >
                        ↗
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredElements.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--vw-color-gray-400)', fontSize: '12px' }}>
                  No network elements match search
                </div>
              )}
            </div>
          </div>

          {/* Column 4: Interfaces */}
          <div className="topo-col topo-col-interfaces">
            <div className="topo-col-header">
              <span className="topo-col-title">
                Interfaces {currentElement ? `— ${currentElement.name}` : ''}
              </span>
              <span className="topo-col-count">
                {currentElement ? currentElement.interfaces.length : 0}
              </span>
            </div>
            <div className="topo-search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search interface"
                value={interfaceSearch}
                onChange={e => setInterfaceSearch(e.target.value)}
              />
              {interfaceSearch && (
                <button type="button" className="topo-input-clear" onClick={() => setInterfaceSearch('')}>✕</button>
              )}
            </div>
            <div className="topo-card-list" onScroll={handleMouseLeave}>
              {filteredInterfaces.map(iface => {
                const isSelected = iface.id === selectedInterfaceId;
                return (
                  <div
                    key={iface.id}
                    ref={el => { interfaceRefs.current[iface.id] = el; }}
                    className={`topo-if-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedInterfaceId(iface.id)}
                    onMouseEnter={e => handleMouseEnter(e, iface.peer ? `${iface.name} ➔ ${iface.peer}` : iface.name)}
                    onMouseLeave={handleMouseLeave}
                    role="button"
                    tabIndex={0}
                    title={iface.name}
                    aria-label={`Interface ${iface.name}`}
                  >
                    <div className="topo-if-head">
                      <div className="topo-if-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="2" width="20" height="8" rx="2" />
                          <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2.5" />
                        </svg>
                      </div>
                      <span className="topo-if-name">{iface.name}</span>
                    </div>
                    <div className="topo-if-meta-grid">
                      <div className="topo-if-meta-row">
                        <span className="topo-if-meta-key">Admin:</span>
                        <span className={`topo-if-status-val is-${iface.adminStatus.includes('up') ? 'up' : 'down'}`}>
                          {iface.adminStatus}
                        </span>
                        <span className="topo-if-meta-key" style={{ marginLeft: '12px' }}>Oper:</span>
                        <span className={`topo-if-status-val is-${iface.operStatus.includes('up') ? 'up' : 'down'}`}>
                          {iface.operStatus}
                        </span>
                      </div>
                      <div className="topo-if-meta-row">
                        <span className="topo-if-meta-key">Speed:</span>
                        <span className="topo-if-meta-val">{iface.speed}</span>
                        {iface.peer && (
                          <>
                            <span className="topo-if-meta-key" style={{ marginLeft: '10px' }}>Peer:</span>
                            <span className="topo-if-meta-val">{iface.peer}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredInterfaces.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--vw-color-gray-400)', fontSize: '12px' }}>
                  No interfaces match search
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Hover Tooltip (Clean Minimal Micro-Chip) ───────── */}
      {tooltip && (
        <div
          className={`topo-floating-tooltip is-${tooltip.placement}`}
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: tooltip.placement === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 99999
          }}
        >
          <div className="topo-floating-tooltip-inner">
            {tooltip.title}
          </div>
        </div>
      )}
    </div>
  );
}
