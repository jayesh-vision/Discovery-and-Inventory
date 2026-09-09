import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import geo from '../data/geo.json';
import sitesJson from '../data/sites.json';
import { LOCATIONS, type Location } from '../data/locations';

const GEO = geo as { W: number; H: number; LON0: number; K: number; Y0: number; KY: number; paths: Record<string, string> };
const mpx = (lon: number) => (lon - GEO.LON0) * GEO.K;
const mpy = (lat: number) => (GEO.Y0 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) * GEO.KY;

const invMpx = (x: number) => (x / GEO.K) + GEO.LON0;
const invMpy = (y: number) => {
  const val = GEO.Y0 - (y / GEO.KY);
  return (Math.atan(Math.exp(val)) - Math.PI / 4) * 360 / Math.PI;
};

export interface SiteRef { id: string; name: string; city: string; st: string; c: string; region: string; type: string; x: number; y: number }
const SITES = (sitesJson as { sites: SiteRef[]; bboxes: Record<string, number[]> }).sites;
const BBOXES = (sitesJson as { sites: SiteRef[]; bboxes: Record<string, number[]> }).bboxes;

export const STATE_REGION: Record<string, string> = {
  'Maharashtra': 'West', 'Gujarat': 'West', 'Goa': 'West', 'Dadra and Nagar Haveli and Daman and Diu': 'West',
  'Uttar Pradesh': 'North', 'Delhi': 'North', 'Rajasthan': 'North', 'Punjab': 'North', 'Haryana': 'North',
  'Jammu and Kashmir': 'North', 'Uttarakhand': 'North', 'Himachal Pradesh': 'North', 'Ladakh': 'North', 'Chandigarh': 'North',
  'Karnataka': 'South', 'Tamil Nadu': 'South', 'Andhra Pradesh': 'South', 'Telangana': 'South', 'Kerala': 'South',
  'Puducherry': 'South', 'Lakshadweep': 'South',
  'Madhya Pradesh': 'East', 'West Bengal': 'East', 'Odisha': 'East', 'Bihar': 'East', 'Chhattisgarh': 'East',
  'Jharkhand': 'East', 'Andaman and Nicobar Islands': 'East',
  'Assam': 'North-East', 'Sikkim': 'North-East', 'Meghalaya': 'North-East', 'Tripura': 'North-East',
  'Arunachal Pradesh': 'North-East', 'Nagaland': 'North-East', 'Manipur': 'North-East', 'Mizoram': 'North-East'
};

const LOC_TYPES = ['POP', 'Cell Site', 'Macro-O', 'Micro-CO', 'Data centre'];
const COVERAGE_TYPES = ['Outdoor', 'Indoor', 'Macro-cell', 'Micro-cell', 'Rural', 'Urban', 'Highway'];

/* Major city map annotations matching satellite map reference */
const MAP_CITIES = [
  { n: 'Mumbai / मुंबई', x: 280, y: 720 },
  { n: 'Pune / पुणे', x: 235, y: 710 },
  { n: 'Surat / सूरत', x: 138, y: 560 },
  { n: 'Jaipur / जयपुर', x: 145, y: 417 },
  { n: 'Lucknow / लखनऊ', x: 519, y: 413 },
  { n: 'Patna / पटना', x: 630, y: 454 },
  { n: 'Nagpur / नागपुर', x: 369, y: 642 },
  { n: 'Bengaluru / बेंगलूरू', x: 277, y: 891 },
  { n: 'Chennai / चेन्नई', x: 344, y: 1028 },
  { n: 'Hyderabad / हैदराबाद', x: 422, y: 750 },
  { n: 'Kolkata / कोलकाता', x: 685, y: 440 },
  { n: 'Delhi / दिल्ली', x: 321, y: 334 }
];

export default function LocationCreate() {
  const nav = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);

  /* Form State matching screenshot inputs */
  const [formData, setFormData] = useState({
    type: '',
    parent: '',
    id: '',
    name: '',
    zone: '',
    state: '',
    district: '',
    city: '',
    lat: '',
    lon: '',
    coverage: '',
    addr: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zoomLevel, setZoomLevel] = useState(5);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });

  /* Compute marker coordinates from form lat/lon if valid */
  const markerPos = useMemo(() => {
    const latNum = parseFloat(formData.lat);
    const lonNum = parseFloat(formData.lon);
    if (!isNaN(latNum) && !isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
      return { x: mpx(lonNum), y: mpy(latNum), lat: latNum, lon: lonNum };
    }
    return null;
  }, [formData.lat, formData.lon]);

  /* Find state from (x, y) */
  const getStateFromCoords = useCallback((x: number, y: number) => {
    for (const [st, bb] of Object.entries(BBOXES)) {
      if (x >= bb[0] && y >= bb[1] && x <= bb[2] && y <= bb[3]) {
        return st;
      }
    }
    let minD = Infinity;
    let closestSt = formData.state || 'Karnataka';
    for (const s of SITES) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < minD) {
        minD = d;
        closestSt = s.st;
      }
    }
    return closestSt;
  }, [formData.state]);

  /* Find nearest city & district from coordinates */
  const getGeoDetailsFromCoords = useCallback((x: number, y: number, stateName: string) => {
    const lat = invMpy(y);
    const lon = invMpx(x);

    const candidates = SITES.filter(s => s.st === stateName);
    const pool = candidates.length > 0 ? candidates : SITES;

    let nearest = pool[0];
    let minD = Infinity;

    for (const s of pool) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < minD) {
        minD = d;
        nearest = s;
      }
    }

    const zone = STATE_REGION[stateName] || nearest?.region || 'Central';
    const city = nearest?.city || stateName;
    const district = `${city} District`;

    return {
      state: stateName,
      zone: `${zone} Zone`,
      city,
      district,
      lat: lat.toFixed(4),
      lon: lon.toFixed(4)
    };
  }, []);

  /* Map click handler */
  const handleMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
    const scale = GEO.W / rect.width;
    const clickPx = (e.clientX - rect.left) * scale;
    const clickPy = (e.clientY - rect.top) * scale;

    const x = (clickPx - view.x) / view.k;
    const y = (clickPy - view.y) / view.k;

    const detectedState = getStateFromCoords(x, y);
    const geoDetails = getGeoDetailsFromCoords(x, y, detectedState);

    setFormData(prev => ({
      ...prev,
      state: geoDetails.state,
      zone: geoDetails.zone,
      city: geoDetails.city,
      district: geoDetails.district,
      lat: geoDetails.lat,
      lon: geoDetails.lon
    }));

    setErrors(prev => {
      const next = { ...prev };
      delete next.lat;
      delete next.lon;
      delete next.state;
      delete next.city;
      delete next.zone;
      delete next.district;
      return next;
    });
  }, [view, getStateFromCoords, getGeoDetailsFromCoords]);

  /* Handle form inputs */
  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'state' && STATE_REGION[value]) {
        next.zone = `${STATE_REGION[value]} Zone`;
      }
      return next;
    });

    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  /* Validation */
  const validate = () => {
    const errs: Record<string, string> = {};
    const id = formData.id.trim();

    if (!formData.type) errs.type = 'Type is required.';
    if (!id) errs.id = 'Location ID is required.';
    else if (LOCATIONS.some(l => l.id.toLowerCase() === id.toLowerCase())) errs.id = `Location ID "${id}" already exists.`;

    if (!formData.name.trim()) errs.name = 'Name is required.';
    if (!formData.state.trim()) errs.state = 'State is required.';
    if (!formData.city.trim()) errs.city = 'City is required.';
    if (!formData.addr.trim()) errs.addr = 'Address is required.';

    const latNum = parseFloat(formData.lat);
    if (formData.lat === '' || isNaN(latNum)) errs.lat = 'Enter valid latitude.';

    const lonNum = parseFloat(formData.lon);
    if (formData.lon === '' || isNaN(lonNum)) errs.lon = 'Enter valid longitude.';

    return errs;
  };

  /* Form submission */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    const newLoc: Location = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      type: formData.type || 'POP',
      cat: 'Central',
      st: 'Planned',
      city: formData.city.trim(),
      state: formData.state,
      addr: formData.addr.trim(),
      ne: 0,
      disc: 0,
      lat: parseFloat(formData.lat),
      lon: parseFloat(formData.lon)
    };

    LOCATIONS.unshift(newLoc);
    nav('/inventory/location?view=list');
  };

  /* Zoom controls */
  const handleZoomIn = () => {
    setZoomLevel(z => Math.min(10, z + 1));
    setView(v => ({ ...v, k: Math.min(6, v.k * 1.3) }));
  };

  const handleZoomOut = () => {
    setZoomLevel(z => Math.max(1, z - 1));
    setView(v => ({ ...v, k: Math.max(1, v.k / 1.3) }));
  };

  const handleReset = () => {
    setZoomLevel(5);
    setView({ k: 1, x: 0, y: 0 });
  };

  return (
    <div style={{ padding: '24px 32px', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* Page Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0, color: '#334155' }}>
          Location create
        </h1>
      </div>

      {/* Main 2-Column Split Layout matching screenshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: Form Controls */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          
          {/* Row 1: Type & Parent */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.type}
                  onChange={e => handleChange('type', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem', borderRadius: '8px', border: errors.type ? '1px solid #ef4444' : '1px solid #cbd5e1', appearance: 'none', background: '#fff', color: formData.type ? '#1e293b' : '#94a3b8' }}
                >
                  <option value="" disabled>Select</option>
                  {LOC_TYPES.map(t => <option key={t} value={t} style={{ color: '#1e293b' }}>{t}</option>)}
                </select>
                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>
              {errors.type && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.type}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Parent <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  value={formData.parent}
                  onChange={e => handleChange('parent', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Location ID & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Location ID <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                value={formData.id}
                onChange={e => handleChange('id', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem', borderRadius: '8px', border: errors.id ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
              {errors.id && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.id}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem', borderRadius: '8px', border: errors.name ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
              {errors.name && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
            </div>
          </div>

          {/* Row 3: Zone & State */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Zone <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  value={formData.zone}
                  onChange={e => handleChange('zone', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                State <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  value={formData.state}
                  onChange={e => handleChange('state', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '0.875rem', borderRadius: '8px', border: errors.state ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
              {errors.state && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.state}</span>}
            </div>
          </div>

          {/* Row 4: District & City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                District <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  value={formData.district}
                  onChange={e => handleChange('district', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                City <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                  value={formData.city}
                  onChange={e => handleChange('city', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '0.875rem', borderRadius: '8px', border: errors.city ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
              {errors.city && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.city}</span>}
            </div>
          </div>

          {/* Row 5: Latitude & Longitude */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Latitude <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={e => handleChange('lat', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem', borderRadius: '8px', border: errors.lat ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
              {errors.lat && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.lat}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Longitude <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                value={formData.lon}
                onChange={e => handleChange('lon', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem', borderRadius: '8px', border: errors.lon ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
              {errors.lon && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.lon}</span>}
            </div>
          </div>

          {/* Row 6: Coverage type & Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Coverage type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.coverage}
                  onChange={e => handleChange('coverage', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid #cbd5e1', appearance: 'none', background: '#fff', color: formData.coverage ? '#1e293b' : '#94a3b8' }}
                >
                  <option value="" disabled>Select</option>
                  {COVERAGE_TYPES.map(c => <option key={c} value={c} style={{ color: '#1e293b' }}>{c}</option>)}
                </select>
                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                value={formData.addr}
                onChange={e => handleChange('addr', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.875rem', borderRadius: '8px', border: errors.addr ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
              {errors.addr && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.addr}</span>}
            </div>
          </div>

        </form>

        {/* Right Column: Satellite GIS Map Container matching screenshot */}
        <div style={{ position: 'relative', width: '100%', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          
          <div ref={wrap} style={{ position: 'relative', width: '100%', height: '460px', background: '#3b4a32' }}>
            <svg
              viewBox={`0 0 ${GEO.W} ${GEO.H}`}
              className="map-svg"
              onClick={handleMapClick}
              style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
            >
              <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
                
                {/* Terrain ocean background */}
                <rect width={GEO.W} height={GEO.H} fill="#273847" />

                {/* State Polygons with Terrain Shading */}
                {Object.entries(GEO.paths).map(([stName, pathD]) => {
                  const isSelected = formData.state === stName;
                  return (
                    <path
                      key={stName}
                      d={pathD}
                      fill={isSelected ? '#5a7346' : '#3d4d35'}
                      stroke={isSelected ? '#facc15' : '#57674e'}
                      strokeWidth={isSelected ? 2 : 0.9}
                      style={{ transition: 'fill 0.15s ease' }}
                    >
                      <title>{stName}</title>
                    </path>
                  );
                })}

                {/* State Name & City Labels matching satellite reference */}
                {MAP_CITIES.map(c => (
                  <g key={c.n} transform={`translate(${c.x}, ${c.y})`} style={{ pointerEvents: 'none' }}>
                    <circle r={2.5} fill="#f8fafc" />
                    <text x={4} y={3} fill="#e2e8f0" fontSize="11" fontWeight="500" fontFamily="sans-serif" stroke="#1e293b" strokeWidth="0.4">
                      {c.n}
                    </text>
                  </g>
                ))}

                {/* Map Watermark Text matching reference image */}
                <text x="300" y="420" fill="rgba(255,255,255,0.4)" fontSize="13" fontFamily="sans-serif">
                  For development purposes only
                </text>
                <text x="700" y="420" fill="rgba(255,255,255,0.4)" fontSize="13" fontFamily="sans-serif">
                  For development purposes only
                </text>
                <text x="300" y="720" fill="rgba(255,255,255,0.4)" fontSize="13" fontFamily="sans-serif">
                  For development purposes only
                </text>

                {/* Clicked Marker Pin */}
                {markerPos && (
                  <g transform={`translate(${markerPos.x}, ${markerPos.y})`} style={{ pointerEvents: 'none' }}>
                    <circle r={12} fill="#ef4444" opacity={0.35}>
                      <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <path d="M 0 -18 C -6 -18 -10 -14 -10 -8 C -10 0 0 10 0 10 C 0 10 10 0 10 -8 C 10 -14 6 -18 0 -18 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="0" cy="-8" r="3.5" fill="#ffffff" />
                  </g>
                )}

              </g>
            </svg>

            {/* Top Left Map Action Buttons matching screenshot (Home & Search) */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleReset}
                title="Home"
                style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </button>
              <button
                type="button"
                onClick={() => { const input = document.querySelector('input') as HTMLInputElement; input?.focus(); }}
                title="Search"
                style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </button>
            </div>

            {/* Bottom Right Zoom Control Panel matching screenshot (+ 5 -) */}
            <div style={{ position: 'absolute', bottom: '24px', right: '16px', width: '36px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              <button
                type="button"
                onClick={handleZoomIn}
                style={{ width: '100%', height: '36px', border: 'none', background: 'transparent', fontSize: '1.125rem', fontWeight: 600, color: '#475569', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
              >
                +
              </button>
              <div style={{ padding: '6px 0', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                {zoomLevel}
              </div>
              <button
                type="button"
                onClick={handleZoomOut}
                style={{ width: '100%', height: '36px', border: 'none', background: 'transparent', fontSize: '1.125rem', fontWeight: 600, color: '#475569', cursor: 'pointer', borderTop: '1px solid #f1f5f9' }}
              >
                −
              </button>
            </div>

            {/* Bottom Left Google Watermark Logo */}
            <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.8)', pointerEvents: 'none', fontFamily: 'Product Sans, Roboto, sans-serif' }}>
              Google
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Footer Action Bar matching screenshot */}
      <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          onClick={() => nav('/inventory/location')}
          style={{ padding: '10px 24px', fontSize: '0.875rem', fontWeight: 500, borderRadius: '20px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{ padding: '10px 28px', fontSize: '0.875rem', fontWeight: 500, borderRadius: '20px', border: 'none', background: '#000000', color: '#ffffff', cursor: 'pointer' }}
        >
          Create
        </button>
      </div>

    </div>
  );
}
