import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import geo from '../../data/geo.json';
import allLocations from '../../data/allLocations.json';

const GEO = geo as {
  W: number;
  H: number;
  LON0: number;
  K: number;
  Y0: number;
  KY: number;
  paths: Record<string, string>;
};

const mpx = (lon: number) => (lon - GEO.LON0) * GEO.K;
const mpy = (lat: number) => (GEO.Y0 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) * GEO.KY;
const fmt = (v: number) => v.toLocaleString('en-IN');

export interface CircleGeo {
  c: string;
  n: string;
  st: string;
  lat: number;
  lon: number;
  tot: number;
  live: number;
  build: number;
  fail: number;
}

export const LOC_GEO: CircleGeo[] = [
  // North Region (5)
  { c: 'PB', n: 'Punjab', st: 'Punjab', lat: 31.10, lon: 75.40, tot: 1297, live: 976, build: 305, fail: 16 },
  { c: 'HP', n: 'Himachal Pradesh', st: 'Himachal Pradesh', lat: 31.80, lon: 77.20, tot: 730, live: 552, build: 171, fail: 7 },
  { c: 'UP', n: 'Uttar Pradesh', st: 'Uttar Pradesh', lat: 26.85, lon: 80.95, tot: 554, live: 414, build: 69, fail: 11 },
  { c: 'HR', n: 'Haryana', st: 'Haryana', lat: 29.20, lon: 76.30, tot: 457, live: 338, build: 113, fail: 6 },
  { c: 'UK', n: 'Uttarakhand', st: 'Uttarakhand', lat: 30.10, lon: 79.20, tot: 413, live: 310, build: 99, fail: 4 },

  // West Region (6)
  { c: 'RJ', n: 'Rajasthan', st: 'Rajasthan', lat: 26.50, lon: 73.80, tot: 514, live: 386, build: 122, fail: 6 },
  { c: 'MP', n: 'Madhya Pradesh', st: 'Madhya Pradesh', lat: 23.47, lon: 77.95, tot: 508, live: 376, build: 126, fail: 6 },
  { c: 'CG', n: 'Chhattisgarh', st: 'Chhattisgarh', lat: 21.30, lon: 81.80, tot: 429, live: 313, build: 111, fail: 5 },
  { c: 'GA', n: 'Goa', st: 'Goa', lat: 15.35, lon: 74.05, tot: 386, live: 290, build: 92, fail: 4 },
  { c: 'MH', n: 'Maharashtra', st: 'Maharashtra', lat: 19.75, lon: 75.71, tot: 334, live: 234, build: 51, fail: 6 },
  { c: 'GJ', n: 'Gujarat', st: 'Gujarat', lat: 22.26, lon: 71.19, tot: 257, live: 179, build: 33, fail: 1 },

  // East Region (12)
  { c: 'WB', n: 'West Bengal', st: 'West Bengal', lat: 23.50, lon: 87.80, tot: 441, live: 326, build: 105, fail: 10 },
  { c: 'NL', n: 'Nagaland', st: 'Nagaland', lat: 25.67, lon: 94.12, tot: 405, live: 300, build: 100, fail: 5 },
  { c: 'MN', n: 'Manipur', st: 'Manipur', lat: 24.81, lon: 93.93, tot: 399, live: 291, build: 103, fail: 5 },
  { c: 'BR', n: 'Bihar', st: 'Bihar', lat: 25.60, lon: 85.50, tot: 396, live: 281, build: 105, fail: 10 },
  { c: 'TR', n: 'Tripura', st: 'Tripura', lat: 23.83, lon: 91.28, tot: 396, live: 297, build: 95, fail: 4 },
  { c: 'ML', n: 'Meghalaya', st: 'Meghalaya', lat: 25.57, lon: 91.88, tot: 393, live: 295, build: 94, fail: 4 },
  { c: 'MZ', n: 'Mizoram', st: 'Mizoram', lat: 23.73, lon: 92.71, tot: 393, live: 291, build: 98, fail: 4 },
  { c: 'JH', n: 'Jharkhand', st: 'Jharkhand', lat: 23.60, lon: 85.30, tot: 389, live: 292, build: 89, fail: 8 },
  { c: 'AR', n: 'Arunachal Pradesh', st: 'Arunachal Pradesh', lat: 27.10, lon: 93.60, tot: 386, live: 290, build: 92, fail: 4 },
  { c: 'OR', n: 'Odisha', st: 'Odisha', lat: 20.50, lon: 84.40, tot: 383, live: 276, build: 99, fail: 8 },
  { c: 'AS', n: 'Assam', st: 'Assam', lat: 26.20, lon: 92.90, tot: 379, live: 262, build: 107, fail: 10 },
  { c: 'SK', n: 'Sikkim', st: 'Sikkim', lat: 27.50, lon: 88.50, tot: 309, live: 241, build: 64, fail: 4 },

  // South Region (5)
  { c: 'KL', n: 'Kerala', st: 'Kerala', lat: 10.50, lon: 76.40, tot: 527, live: 400, build: 121, fail: 6 },
  { c: 'KA', n: 'Karnataka', st: 'Karnataka', lat: 15.32, lon: 75.71, tot: 299, live: 227, build: 36, fail: 4 },
  { c: 'TN', n: 'Tamil Nadu', st: 'Tamil Nadu', lat: 11.13, lon: 78.66, tot: 884, live: 652, build: 185, fail: 12 },
  { c: 'AP', n: 'Andhra Pradesh', st: 'Andhra Pradesh', lat: 15.91, lon: 79.74, tot: 198, live: 133, build: 25, fail: 1 },
  { c: 'TS', n: 'Telangana', st: 'Telangana', lat: 17.80, lon: 79.10, tot: 19, live: 16, build: 2, fail: 1 }
];

export const PATH_TO_CIRCLE_CODE: Record<string, string> = {
  'Jammu and Kashmir': 'PB',
  'Ladakh': 'HP',
  'Himachal Pradesh': 'HP',
  'Punjab': 'PB',
  'Chandigarh': 'PB',
  'Uttarakhand': 'UK',
  'Haryana': 'HR',
  'Delhi': 'UP',
  'Rajasthan': 'RJ',
  'Uttar Pradesh': 'UP',
  'Bihar': 'BR',
  'Jharkhand': 'JH',
  'West Bengal': 'WB',
  'Sikkim': 'SK',
  'Assam': 'AS',
  'Arunachal Pradesh': 'AR',
  'Nagaland': 'NL',
  'Manipur': 'MN',
  'Mizoram': 'MZ',
  'Tripura': 'TR',
  'Meghalaya': 'ML',
  'Madhya Pradesh': 'MP',
  'Chhattisgarh': 'CG',
  'Odisha': 'OR',
  'Gujarat': 'GJ',
  'Maharashtra': 'MH',
  'Goa': 'GA',
  'Karnataka': 'KA',
  'Andhra Pradesh': 'AP',
  'Telangana': 'TS',
  'Kerala': 'KL',
  'Lakshadweep': 'KL',
  'Tamil Nadu': 'TN',
  'Puducherry': 'TN',
  'Dadra and Nagar Haveli and Daman and Diu': 'GJ',
  'Andaman and Nicobar Islands': 'TN'
};

const CIRCLE_BY_CODE: Record<string, CircleGeo> = Object.fromEntries(LOC_GEO.map(g => [g.c, g]));

const MAP_MODES = [
  { k: 'onair', n: 'On-air rate' },
  { k: 'build', n: 'Sites in build' },
  { k: 'fail', n: 'Failed builds' }
] as const;

type MapMode = (typeof MAP_MODES)[number]['k'];

const STATUS_PIN: Record<string, string> = {
  'On-air': 'emerald',
  'In progress': 'amber',
  'Planned': 'sky',
  'Failed': 'red'
};

function stateFill(g?: CircleGeo, mapColor: MapMode = 'onair') {
  if (!g) return 'var(--vw-color-slate-100)';
  if (mapColor === 'onair') {
    const p = g.live / g.tot;
    return p >= 0.78
      ? 'var(--vw-color-emerald-500)'
      : p >= 0.72
      ? 'var(--vw-color-emerald-300)'
      : p >= 0.65
      ? 'var(--vw-color-amber-300)'
      : 'var(--vw-color-orange-400)';
  }
  if (mapColor === 'fail') {
    return g.fail === 0
      ? 'var(--vw-color-slate-100)'
      : g.fail >= 6
      ? 'var(--vw-color-red-500)'
      : g.fail >= 3
      ? 'var(--vw-color-red-300)'
      : 'var(--vw-color-red-100)';
  }
  const b = g.build;
  return b >= 30
    ? 'var(--vw-color-amber-500)'
    : b >= 15
    ? 'var(--vw-color-amber-300)'
    : b >= 5
    ? 'var(--vw-color-amber-100)'
    : 'var(--vw-color-slate-100)';
}

export interface SitesByGeographyProps {
  selectedCircle?: string | null;
  onSelectCircle?: (circleCode: string | null) => void;
}

export default function SitesByGeography({
  selectedCircle: propSelectedCircle,
  onSelectCircle
}: SitesByGeographyProps = {}) {
  const nav = useNavigate();
  const [mapColor, setMapColor] = useState<MapMode>('onair');
  const [mapLayer, setMapLayer] = useState<'sites' | 'off'>('sites');
  const [internalSelectedCircle, setInternalSelectedCircle] = useState<string | null>(null);
  const selectedCircle = propSelectedCircle !== undefined ? propSelectedCircle : internalSelectedCircle;
  const setSelectedCircle = (val: string | null | ((prev: string | null) => string | null)) => {
    const next = typeof val === 'function' ? val(selectedCircle) : val;
    setInternalSelectedCircle(next);
    onSelectCircle?.(next);
  };
  const [pinGroup, setPinGroup] = useState<string[] | null>(null);
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 });

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const clamp = (x: number, y: number, k: number) => {
    const sx = GEO.W * 0.4;
    const sy = GEO.H * 0.4;
    return {
      x: Math.min(GEO.W - sx, Math.max(sx - GEO.W * k, x)),
      y: Math.min(GEO.H - sy, Math.max(sy - GEO.H * k, y))
    };
  };

  const handleZoom = (dir: 'in' | 'out' | 'reset') => {
    if (dir === 'reset') {
      setZoom({ k: 1, x: 0, y: 0 });
      return;
    }
    const f = dir === 'in' ? 1.35 : 1 / 1.35;
    setZoom(v => {
      const k2 = Math.min(8, Math.max(1, v.k * f));
      const cx = GEO.W / 2;
      const cy = GEO.H / 2;
      const x = cx - (cx - v.x) * (k2 / v.k);
      const y = cy - (cy - v.y) * (k2 / v.k);
      const clamped = clamp(x, y, k2);
      return { k: k2, ...clamped };
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: zoom.x,
      origY: zoom.y,
      moved: false
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
    }
    const clamped = clamp(dragRef.current.origX + dx, dragRef.current.origY + dy, zoom.k);
    setZoom(v => ({ ...v, ...clamped }));
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const legend =
    mapColor === 'onair'
      ? [
          ['≥ 78%', 'var(--vw-color-emerald-500)'],
          ['72 – 77%', 'var(--vw-color-emerald-300)'],
          ['65 – 71%', 'var(--vw-color-amber-300)'],
          ['< 65%', 'var(--vw-color-orange-400)'],
          ['no sites', 'var(--vw-color-slate-100)']
        ]
      : mapColor === 'fail'
      ? [
          ['6+ failed', 'var(--vw-color-red-500)'],
          ['3 – 5', 'var(--vw-color-red-300)'],
          ['1 – 2', 'var(--vw-color-red-100)'],
          ['none', 'var(--vw-color-slate-100)']
        ]
      : [
          ['30+ in build', 'var(--vw-color-amber-500)'],
          ['15 – 29', 'var(--vw-color-amber-300)'],
          ['5 – 14', 'var(--vw-color-amber-100)'],
          ['< 5', 'var(--vw-color-slate-100)']
        ];

  // Pin clustering
  const pinBuckets = useMemo(() => {
    if (mapLayer !== 'sites') return [];
    const grid = 16 / Math.max(1, zoom.k);
    const buckets = new Map<string, { x: number; y: number; items: typeof allLocations }>();
    allLocations.forEach(l => {
      if (!l.lat || !l.lon) return;
      const x = mpx(l.lon);
      const y = mpy(l.lat);
      const key = `${Math.round(x / grid)}:${Math.round(y / grid)}`;
      if (!buckets.has(key)) buckets.set(key, { x, y, items: [] });
      buckets.get(key)!.items.push(l);
    });
    return Array.from(buckets.values());
  }, [mapLayer, zoom.k]);

  // Overall totals
  const totalSites = LOC_GEO.reduce((a, x) => a + x.tot, 0); // 2,400
  const liveSites = LOC_GEO.reduce((a, x) => a + x.live, 0); // 1,755
  const buildSites = LOC_GEO.reduce((a, x) => a + x.build, 0); // 311
  const failSites = LOC_GEO.reduce((a, x) => a + x.fail, 0); // 36
  const planSites = totalSites - liveSites - buildSites - failSites; // 298

  const activeGeo = selectedCircle ? LOC_GEO.find(x => x.c === selectedCircle) : null;
  const activeSites = useMemo(() => {
    if (!activeGeo) return [];
    return allLocations.filter(
      l =>
        l.state === activeGeo.st ||
        l.state === activeGeo.n ||
        (activeGeo.c === 'PB' && (l.state === 'Punjab' || l.state === 'Chandigarh' || l.state === 'Jammu & Kashmir' || l.state === 'Jammu and Kashmir')) ||
        (activeGeo.c === 'HP' && (l.state === 'Himachal Pradesh' || l.state === 'Ladakh')) ||
        (activeGeo.c === 'UP' && (l.state === 'Uttar Pradesh' || l.state.includes('Uttar Pradesh') || l.state === 'Delhi')) ||
        (activeGeo.c === 'GJ' && (l.state === 'Gujarat' || l.state === 'Dadra & Nagar Haveli' || l.state.includes('Dadra'))) ||
        (activeGeo.c === 'TN' && (l.state === 'Tamil Nadu' || l.state === 'Puducherry' || l.state === 'Andaman & Nicobar' || l.state.includes('Andaman'))) ||
        (activeGeo.c === 'KL' && (l.state === 'Kerala' || l.state === 'Lakshadweep'))
    );
  }, [activeGeo]);

  const pinGroupItems = useMemo(() => {
    if (!pinGroup) return [];
    return pinGroup.map(id => allLocations.find(l => l.id === id)).filter(Boolean);
  }, [pinGroup]);

  return (
    <section className="vw-card-section" style={{ marginTop: '24px', background: '#fff' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="row vw-justify-between vw-items-start vw-wrap" style={{ marginBottom: 'var(--vw-space-md)', gap: 'var(--vw-space-md)' }}>
        <span className="vw-card-title-sm">Sites by geography</span>
        <div className="row vw-wrap" style={{ gap: 'var(--vw-space-md)', alignItems: 'center' }}>
          <span className="vw-card-metric-label-sub">Colour by</span>
          <div className="seg">
            {MAP_MODES.map(m => (
              <button
                key={m.k}
                type="button"
                className={mapColor === m.k ? 'is-on' : ''}
                onClick={() => setMapColor(m.k)}
              >
                {m.n}
              </button>
            ))}
          </div>
          <div className="seg">
            <button
              type="button"
              className={mapLayer === 'sites' ? 'is-on' : ''}
              onClick={() => setMapLayer('sites')}
            >
              Site pins
            </button>
            <button
              type="button"
              className={mapLayer === 'off' ? 'is-on' : ''}
              onClick={() => setMapLayer('off')}
            >
              Hide pins
            </button>
          </div>
        </div>
      </div>

      {/* ── Map + Side Panel Row ────────────────────────────── */}
      <div className="map-row">
        {/* Left: Map */}
        <div className="map-wrap">
          <svg
            viewBox={`0 0 ${GEO.W} ${GEO.H}`}
            className="map-svg"
            id="mapsvg"
            role="img"
            aria-label="Sites across India by state"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <rect width={GEO.W} height={GEO.H} fill="var(--vw-color-slate-25, #f8fafc)" />
            <g id="mapzoom" transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.k})`}>
              {/* State Shapes */}
              {Object.entries(GEO.paths)
                .filter(([st]) => st !== 'Andaman and Nicobar Islands' && st !== 'Lakshadweep')
                .map(([st, dPath]) => {
                const code = PATH_TO_CIRCLE_CODE[st];
                const g = code ? CIRCLE_BY_CODE[code] : undefined;
                const isSel = g && g.c === selectedCircle;
                return (
                  <path
                    key={st}
                    d={dPath}
                    className={`st${g ? ' has-c' : ''}${isSel ? ' is-sel' : ''}`}
                    fill={stateFill(g, mapColor)}
                    stroke={isSel ? 'var(--vw-color-gray-900)' : 'var(--vw-color-white)'}
                    strokeWidth={isSel ? 2.4 : 0.9}
                    onClick={() => {
                      if (!dragRef.current?.moved && g) {
                        setSelectedCircle(prev => (prev === g.c ? null : g.c));
                        setPinGroup(null);
                      }
                    }}
                  >
                    <title>
                      {g?.n || st}
                      {g ? ` — ${fmt(g.tot)} sites, ${fmt(g.live)} on-air, ${g.fail} failed` : ' — no sites'}
                    </title>
                  </path>
                );
              })}

              {/* State Labels */}
              {LOC_GEO.filter(g => g.c !== 'AN').map(g => {
                const x = mpx(g.lon);
                const y = mpy(g.lat);
                const isSel = g.c === selectedCircle;
                const isTiny = g.c === 'GA' || g.c === 'SK' || g.c === 'TS';
                return (
                  <g key={g.c} className="st-lab" pointerEvents="none">
                    <text
                      x={x.toFixed(1)}
                      y={(y - 2).toFixed(1)}
                      textAnchor="middle"
                      fontSize={isTiny ? '12' : '15'}
                      fontWeight={isSel ? '700' : '600'}
                      fill={isSel ? 'var(--vw-color-blue-700, #1d4ed8)' : 'var(--vw-color-gray-900)'}
                      stroke="var(--vw-color-white)"
                      strokeWidth="3.2"
                      paintOrder="stroke"
                      fontFamily="Inter, sans-serif"
                    >
                      {g.c}
                    </text>
                    <text
                      x={x.toFixed(1)}
                      y={(y + (isTiny ? 10 : 13)).toFixed(1)}
                      textAnchor="middle"
                      fontSize={isTiny ? '10' : '12'}
                      fontWeight={isSel ? '600' : '400'}
                      fill={isSel ? 'var(--vw-color-blue-700, #1d4ed8)' : 'var(--vw-color-gray-600)'}
                      stroke="var(--vw-color-white)"
                      strokeWidth="3"
                      paintOrder="stroke"
                      fontFamily="Inter, sans-serif"
                    >
                      {fmt(g.tot)}
                    </text>
                  </g>
                );
              })}

              {/* Site Pins */}
              {pinBuckets.map((b, idx) => {
                const k = 1 / zoom.k;
                if (b.items.length === 1) {
                  const l = b.items[0];
                  const t = STATUS_PIN[l.st] || 'slate';
                  return (
                    <g
                      key={l.id || idx}
                      className="pin"
                      transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${k.toFixed(3)})`}
                      onClick={e => {
                        e.stopPropagation();
                        if (!dragRef.current?.moved) {
                          nav(`/inventory/location/site/${l.id}`);
                        }
                      }}
                    >
                      <title>{`${l.name} — ${l.st}, ${l.disc}/${l.ne} NE discovered`}</title>
                      <circle r="10" fill="var(--vw-color-white)" fillOpacity="0.92" />
                      <circle r="6" fill={`var(--vw-color-${t}-500)`} stroke="var(--vw-color-white)" strokeWidth="1.8" />
                    </g>
                  );
                }
                const ids = b.items.map(i => i.id);
                return (
                  <g
                    key={ids.join(',') || idx}
                    className="pin is-cluster"
                    transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${k.toFixed(3)})`}
                    onClick={e => {
                      e.stopPropagation();
                      if (!dragRef.current?.moved) {
                        setPinGroup(ids);
                      }
                    }}
                  >
                    <title>{`${b.items.length} sites here — ${b.items.map(i => i.name).join(', ')}`}</title>
                    <circle r="13" fill="var(--vw-color-slate-800)" fillOpacity="0.18" />
                    <circle r="9.5" fill="var(--vw-color-slate-800)" stroke="var(--vw-color-white)" strokeWidth="1.8" />
                    <text y="3.4" textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff" fontFamily="Inter, sans-serif">
                      {b.items.length}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Zoom controls */}
          <div className="map-ctl">
            <button type="button" className="nst-icon-btn" onClick={() => handleZoom('in')} aria-label="Zoom in">
              +
            </button>
            <button type="button" className="nst-icon-btn" onClick={() => handleZoom('out')} aria-label="Zoom out">
              −
            </button>
            <button type="button" className="nst-icon-btn" onClick={() => handleZoom('reset')} aria-label="Reset view">
              ⌂
            </button>
          </div>

          {/* Map Legend */}
          <div className="map-legend">
            {legend.map(([l, hex]) => (
              <span key={l} className="legend-i">
                <span className="legend-sw" style={{ background: hex, border: '1px solid var(--vw-color-slate-300)' }} />
                {l}
              </span>
            ))}
            {mapLayer === 'sites' &&
              Object.entries(STATUS_PIN).map(([k, t]) => (
                <span key={k} className="legend-i">
                  <span className="legend-sw" style={{ background: `var(--vw-color-${t}-500)`, borderRadius: '50%' }} />
                  {k}
                </span>
              ))}
          </div>
        </div>

        {/* Right: Side Panel */}
        <div className="map-side" id="mappanel">
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vw-space-sm)', height: '100%' }}>
            {/* Circle Select Dropdown */}
            <span className="nst-input-shell" style={{ width: '100%' }}>
              <select
                className="nst-input"
                value={selectedCircle || ''}
                onChange={e => {
                  setSelectedCircle(e.target.value || null);
                  setPinGroup(null);
                }}
                aria-label="Filter panel by state"
              >
                <option value="">All India — every circle</option>
                {[...LOC_GEO]
                  .sort((a, b) => a.n.localeCompare(b.n))
                  .map(x => (
                    <option key={x.c} value={x.c}>
                      {x.n}
                    </option>
                  ))}
              </select>
            </span>

            {/* Pin Group Detail */}
            {pinGroup && pinGroupItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vw-space-sm)', flex: 1, minHeight: 0 }}>
                <div className="row vw-justify-between vw-items-start">
                  <div className="stack-x">
                    <span className="vw-card-title-sm">{pinGroupItems.length} sites at this point</span>
                    <span className="vw-card-description">
                      {pinGroupItems[0]?.city}, {pinGroupItems[0]?.state}
                    </span>
                  </div>
                  <button type="button" className="nst-btn nst-btn--xs" onClick={() => setPinGroup(null)}>
                    Clear
                  </button>
                </div>
                <div className="map-side-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {pinGroupItems.map(l => (
                    <button
                      key={l!.id}
                      type="button"
                      className="site-row"
                      onClick={() => nav(`/inventory/location/site/${l!.id}`)}
                    >
                      <span className="row" style={{ gap: 'var(--vw-space-xs)', alignItems: 'center' }}>
                        <span className={`vw-chip vw-chip--${l!.chip === 'warning' ? 'warning' : l!.chip === 'error' ? 'error' : l!.chip === 'info' ? 'info' : 'success'}`}>
                          {l!.st}
                        </span>
                        <span className="vw-value">{l!.name}</span>
                      </span>
                      <span className="vw-card-metric-label-sub num">
                        {l!.disc}/{l!.ne} NE
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : !selectedCircle ? (
              /* All India Summary */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vw-space-sm)', flex: 1 }}>
                <div className="stack-x" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div className="row vw-justify-between vw-items-baseline">
                    <span className="vw-card-title-sm" style={{ fontWeight: 600 }}>All India</span>
                    <span className="vw-card-metric-label-sub">{LOC_GEO.length} circles</span>
                  </div>
                  <div className="row vw-items-baseline" style={{ gap: 'var(--vw-space-sm)' }}>
                    <span className="vw-card-metric-lg num" style={{ fontSize: '1.75rem', fontWeight: 600 }}>{fmt(totalSites)}</span>
                    <span className="vw-card-metric-label-sub">
                      sites · {((liveSites / totalSites) * 100).toFixed(0)}% on-air
                    </span>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="meter" style={{ height: '18px', borderRadius: 'var(--vw-radius-xs)', display: 'flex', overflow: 'hidden' }}>
                  <span style={{ width: `${(liveSites / totalSites) * 100}%`, background: 'var(--vw-color-emerald-400, #34d399)' }} title={`On-air: ${liveSites}`} />
                  <span style={{ width: `${(buildSites / totalSites) * 100}%`, background: 'var(--vw-color-amber-400, #fbbf24)' }} title={`In progress: ${buildSites}`} />
                  <span style={{ width: `${(planSites / totalSites) * 100}%`, background: 'var(--vw-color-sky-400, #38bdf8)' }} title={`Planned: ${planSites}`} />
                  <span style={{ width: `${(failSites / totalSites) * 100}%`, background: 'var(--vw-color-red-400, #f87171)' }} title={`Failed: ${failSites}`} />
                </div>

                {/* 2x2 Grid */}
                <div className="vw-grid vw-grid-cols-2 vw-gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="vw-card-child row vw-justify-between" style={{ padding: 'var(--vw-space-sm)', background: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="legend-i"><span className="legend-sw" style={{ background: 'var(--vw-color-emerald-400, #34d399)' }} />On-air</span>
                    <span className="vw-value num" style={{ fontWeight: 600 }}>{fmt(liveSites)}</span>
                  </div>
                  <div className="vw-card-child row vw-justify-between" style={{ padding: 'var(--vw-space-sm)', background: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="legend-i"><span className="legend-sw" style={{ background: 'var(--vw-color-amber-400, #fbbf24)' }} />In progress</span>
                    <span className="vw-value num" style={{ fontWeight: 600 }}>{fmt(buildSites)}</span>
                  </div>
                  <div className="vw-card-child row vw-justify-between" style={{ padding: 'var(--vw-space-sm)', background: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="legend-i"><span className="legend-sw" style={{ background: 'var(--vw-color-sky-400, #38bdf8)' }} />Planned</span>
                    <span className="vw-value num" style={{ fontWeight: 600 }}>{fmt(planSites)}</span>
                  </div>
                  <div className="vw-card-child row vw-justify-between" style={{ padding: 'var(--vw-space-sm)', background: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="legend-i"><span className="legend-sw" style={{ background: 'var(--vw-color-red-400, #f87171)' }} />Failed</span>
                    <span className="vw-value num" style={{ fontWeight: 600 }}>{fmt(failSites)}</span>
                  </div>
                </div>

                <div className="vw-card-child-shaded vw-card-description" style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', color: '#64748b', fontSize: '13px' }}>
                  Click a state on the map — or pick one above — to see its detail.
                </div>
              </div>
            ) : activeGeo ? (
              /* Specific State Detail */
              (() => {
                const plan = activeGeo.tot - activeGeo.live - activeGeo.build - activeGeo.fail;
                const rows = [
                  ['On-air', activeGeo.live, 'var(--vw-color-emerald-400, #34d399)'],
                  ['In progress', activeGeo.build, 'var(--vw-color-amber-400, #fbbf24)'],
                  ['Planned', plan, 'var(--vw-color-sky-400, #38bdf8)'],
                  ['Failed', activeGeo.fail, 'var(--vw-color-red-400, #f87171)']
                ] as const;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vw-space-sm)', flex: 1, minHeight: 0 }}>
                    <div className="stack-x" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div className="row vw-justify-between vw-items-baseline">
                        <span className="vw-card-title-sm" style={{ fontWeight: 600 }}>{activeGeo.n}</span>
                        <span className="vw-card-metric-label-sub num">
                          {activeGeo.lat.toFixed(2)}°N {activeGeo.lon.toFixed(2)}°E
                        </span>
                      </div>
                      <div className="row vw-items-baseline" style={{ gap: 'var(--vw-space-sm)' }}>
                        <span className="vw-card-metric-lg num" style={{ fontSize: '1.75rem', fontWeight: 600 }}>{fmt(activeGeo.tot)}</span>
                        <span className="vw-card-metric-label-sub">
                          sites · {((activeGeo.live / activeGeo.tot) * 100).toFixed(0)}% on-air
                        </span>
                      </div>
                    </div>

                    {/* Progress Meter */}
                    <div className="meter" style={{ height: '18px', borderRadius: 'var(--vw-radius-xs)', display: 'flex', overflow: 'hidden' }}>
                      {rows.map(([, v, color], i) => (
                        <span
                          key={i}
                          style={{
                            width: `${activeGeo.tot > 0 ? (v / activeGeo.tot) * 100 : 0}%`,
                            background: color
                          }}
                        />
                      ))}
                    </div>

                    {/* 2x2 Grid */}
                    <div className="vw-grid vw-grid-cols-2 vw-gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {rows.map(([k, v, color]) => (
                        <div key={k} className="vw-card-child row vw-justify-between" style={{ padding: 'var(--vw-space-sm)', background: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="legend-i"><span className="legend-sw" style={{ background: color }} />{k}</span>
                          <span className="vw-value num" style={{ fontWeight: 600 }}>{fmt(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Sites on record here */}
                    <div className="map-side-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                      {activeSites.length > 0 ? (
                        <div className="stack-x" style={{ marginTop: 'var(--vw-space-xs)' }}>
                          <span className="eyebrow" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Sites on record here</span>
                          {activeSites.slice(0, 8).map(l => (
                            <button
                              key={l.id}
                              type="button"
                              className="site-row"
                              onClick={() => nav(`/inventory/location/site/${l.id}`)}
                            >
                              <span className="row" style={{ gap: 'var(--vw-space-xs)', alignItems: 'center' }}>
                                <span className={`vw-chip vw-chip--${l.chip === 'warning' ? 'warning' : l.chip === 'error' ? 'error' : l.chip === 'info' ? 'info' : 'success'}`}>
                                  {l.st}
                                </span>
                                <span className="vw-value">{l.name}</span>
                              </span>
                              <span className="vw-card-metric-label-sub num">
                                {l.disc}/{l.ne} NE
                              </span>
                            </button>
                          ))}
                          {activeSites.length > 8 && (
                            <span className="vw-card-metric-label-sub" style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                              + {fmt(activeSites.length - 8)} more — open the list for all of them
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="vw-card-child-shaded vw-card-description" style={{ padding: '8px', background: '#f1f5f9', borderRadius: '6px' }}>
                          No sample sites loaded for this circle.
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="nst-btn nst-btn--sm nst-btn--filled is-drill"
                      style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
                      onClick={() => nav(`/inventory/location?view=list&state=${encodeURIComponent(activeGeo.st)}`)}
                    >
                      Open {fmt(activeGeo.tot)} sites
                    </button>
                  </div>
                );
              })()
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="vw-card-footer-divider row vw-justify-end vw-wrap" style={{ borderTop: '1px solid var(--vw-color-slate-100)', marginTop: 'var(--vw-space-md)', paddingTop: 'var(--vw-space-md)' }}>
        <span className="row vw-gap-lg" style={{ display: 'flex', gap: '24px' }}>
          <span className="stack-x t-right" style={{ textAlign: 'right' }}>
            <span className="vw-label" style={{ fontSize: '11px', color: '#64748b' }}>Circles</span>
            <span className="vw-value num" style={{ fontWeight: 600, display: 'block' }}>{LOC_GEO.length}</span>
          </span>
          <span className="stack-x t-right" style={{ textAlign: 'right' }}>
            <span className="vw-label" style={{ fontSize: '11px', color: '#64748b' }}>Sites</span>
            <span className="vw-value num" style={{ fontWeight: 600, display: 'block' }}>{fmt(totalSites)}</span>
          </span>
        </span>
      </div>
    </section>
  );
}
