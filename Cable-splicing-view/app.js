/**
 * config.js  —  URL query param parsing
 * 
 * Supported params:
 *   ?station_id=DEW001   Station / POP identifier
 *   ?theme=dark|light    UI theme  (default: light)
 *   ?token=xxx           Auth token (optional — Flutter can also inject via JavascriptChannel)
 *
 * Example URLs:
 *   /index.html?station_id=DEW001&theme=dark
 *   /index.html?station_id=UJN001&theme=light&token=abc123
 */
/** Apply light theme before first paint unless URL specifies theme */
(function bootThemeEarly() {
  try {
    const t = new URLSearchParams(window.location.search).get('theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.style.colorScheme = t;
      return;
    }
  } catch (_) { /* ignore */ }
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'light';
})();

/** Loader in #cv-body only — .topbar stays visible */
(function bootLoadingUi() {
  if (!document.getElementById('cv-boot-css')) {
    const s = document.createElement('style');
    s.id = 'cv-boot-css';
    s.textContent = [
      '.cv-body{position:relative;flex:1;min-height:200px;display:flex;flex-direction:column}',
      '.cv-body.cv-content-loading #sub-toolbar,.cv-body.cv-content-loading #seg-bar,',
      '.cv-body.cv-content-loading #main-wrap,.cv-body.cv-content-loading #fab,',
      '.cv-body.cv-content-loading #bottom-nav{visibility:hidden;pointer-events:none}',
      '#cv-loader{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;gap:14px;background:#f4f5f7}',
      'html[data-theme=dark] #cv-loader{background:#0d1117}',
      '#cv-loader[hidden]{display:none!important}',
      '.cv-loader-spin{width:42px;height:42px;border:3px solid #d0d5dd;border-top-color:#2563eb;',
      'border-radius:50%;animation:cv-spin .7s linear infinite}',
      '@keyframes cv-spin{to{transform:rotate(360deg)}}',
      '.cv-loader-text{margin:0;font-size:13px;font-weight:500;color:#64748b}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }
  const prime = () => {
    const body = document.getElementById('cv-body');
    if (body) body.classList.add('cv-content-loading');
  };
  if (document.body) prime();
  else document.addEventListener('DOMContentLoaded', prime, { once: true });
})();

/** Site metadata (id, lat/lng) — window.siteInfoById from Fiberneo */
let siteData = window.siteInfoById ?? null;

/**
 * Bundled cable view from parent — window.siteInfo
 * Shape: [{ name, address, equipments[], … }] or { equipments: [...] }
 */
let facilityCableData = window.siteInfo ?? null;

function getSiteData() {
  if (siteData != null && typeof siteData === 'object') return siteData;
  if (window.siteInfoById != null && typeof window.siteInfoById === 'object') {
    siteData = window.siteInfoById;
    return siteData;
  }
  return null;
}

/** Normalize injected siteInfo → single facility object (first array element or object) */
function getFacilityCablePayload() {
  const raw = facilityCableData ?? window.siteInfo;
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    const facility = raw.find(
      (item) => item && typeof item === 'object' && Array.isArray(item.equipments),
    ) || raw[0];
    return facility && typeof facility === 'object' ? facility : null;
  }

  if (typeof raw === 'object' && Array.isArray(raw.equipments)) return raw;
  return null;
}

function hasFacilityCableData() {
  return getFacilityCablePayload() != null;
}

function setFacilityCableData(data) {
  if (data == null) {
    facilityCableData = null;
    return;
  }
  facilityCableData = data;
  window.siteInfo = data;
  const payload = getFacilityCablePayload();
  if (payload?.id != null) setFacilityId(payload.id);
}

/** After GET /facilities/by-facility — keep same siteInfo shape (array or object) */
function ingestFacilityCableView(facility) {
  if (!facility || typeof facility !== 'object') return;
  const raw = facilityCableData ?? window.siteInfo;
  if (Array.isArray(raw)) {
    setFacilityCableData([facility]);
  } else {
    setFacilityCableData(facility);
  }
}

/** Resolved once from siteInfoById, URL, or facility payload — used for GET /facilities/by-facility */
let _cachedFacilityId = null;

function setFacilityId(id) {
  const s = id != null ? String(id).trim() : '';
  if (s) _cachedFacilityId = s;
}

function _facilityIdFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('facility_id') || p.get('facilityId') || p.get('pop_id') || null;
  } catch (_) {
    return null;
  }
}

function _isUuidLike(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(id || '').trim(),
  );
}

/** Facility / site id for equipment search + facility refresh API */
function getFacilityId() {
  if (_cachedFacilityId) return _cachedFacilityId;

  const sd = getSiteData();
  if (sd?.id != null) return String(sd.id);
  if (sd?.facilityId != null) {
    const f = sd.facilityId;
    if (typeof f === 'object' && f?.id != null) return String(f.id);
    if (typeof f === 'string' && f.trim()) return f.trim();
  }

  if (window.facilityId != null) {
    const s = String(window.facilityId).trim();
    if (s) return s;
  }

  const facility = getFacilityCablePayload();
  if (facility?.id != null) return String(facility.id);

  const ovId = State.overview?.station_id;
  if (ovId && _isUuidLike(ovId)) return String(ovId).trim();

  const cfgId = Config.stationId;
  if (cfgId && _isUuidLike(cfgId)) return String(cfgId).trim();

  const fromUrl = _facilityIdFromUrl();
  if (fromUrl) return fromUrl;

  return null;
}

/** Best-effort facility id for GET /facilities/by-facility after writes */
function resolveFacilityIdForRefresh() {
  const id = getFacilityId();
  if (id) {
    setFacilityId(id);
    return id;
  }
  return null;
}

/** GET /facilities/by-facility/{id} → update siteInfo + diagram state */
async function refreshFacilityCableViewFromApi(explicitFacilityId) {
  const facilityId = explicitFacilityId || getFacilityId();
  if (!facilityId) {
    throw new Error('Facility id is missing — set siteInfoById.id or ?facility_id=');
  }
  setFacilityId(facilityId);
  const facility = await API.getFacilityCableView(facilityId);
  ingestFacilityCableView(facility);
  if (facility?.id != null) setFacilityId(facility.id);
  App.applyFacilityCableView(facility);
  return facility;
}

/** Live Fiberneo writes — equipment-connectivity, not legacy /pop/{station}/connection */
function useFiberneoLive() {
  if (useMockApi()) return false;
  return hasFacilityCableData()
    || getFacilityId() != null
    || siteFieldsForEquipmentCreate() != null;
}

/** Mock cable-view ids (rly1, sw1, …) — not valid for Fiberneo DELETE */
function isMockEquipmentId(id) {
  return /^(rly|dwdm|sw|amp)\d*$/i.test(String(id));
}

/** Cached lat/lng/status for POST /equipments (from siteInfoById or GET /facilities/{id}) */
let _facilitySiteFieldsCache = null;
let _facilitySiteFieldsPromise = null;

function setFacilitySiteFields(fields) {
  if (!fields || typeof fields !== 'object') return;
  const lat = Number(fields.latitude);
  const lng = Number(fields.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  _facilitySiteFieldsCache = {
    latitude : lat,
    longitude: lng,
    status   : _trimStr(fields.status) || 'Assigned',
  };
}

/** Extract lat/lng/status from siteInfoById, facility row, or geo objects */
function ingestSiteFieldsFromObject(obj) {
  if (!obj || typeof obj !== 'object') return null;

  let lat = Number(obj.latitude ?? obj.lat);
  let lng = Number(obj.longitude ?? obj.lng ?? obj.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    for (const geo of [obj.primaryGeoL4, obj.primaryGeoL3, obj.primaryGeoL2, obj.primaryGeoL1]) {
      if (!geo || typeof geo !== 'object') continue;
      const glat = Number(geo.lat ?? geo.latitude);
      const glng = Number(geo.longitude ?? geo.lng ?? geo.lon);
      if (Number.isFinite(glat) && Number.isFinite(glng)) {
        lat = glat;
        lng = glng;
        break;
      }
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const facility = getFacilityCablePayload();
  const status =
    _trimStr(obj.status) ||
    _trimStr(obj.workflowStage) ||
    _trimStr(facility?.workflowStage) ||
    _trimStr(facility?.status) ||
    'Assigned';

  return { latitude: lat, longitude: lng, status };
}

/** latitude, longitude, status for equipment create — sync sources only */
function siteFieldsForEquipmentCreate() {
  if (_facilitySiteFieldsCache) return { ..._facilitySiteFieldsCache };

  const fromSite = ingestSiteFieldsFromObject(getSiteData());
  if (fromSite) {
    setFacilitySiteFields(fromSite);
    return fromSite;
  }

  if (window.siteMeta && typeof window.siteMeta === 'object') {
    const fromWin = ingestSiteFieldsFromObject(window.siteMeta);
    if (fromWin) {
      setFacilitySiteFields(fromWin);
      return fromWin;
    }
  }

  const fromFacility = ingestSiteFieldsFromObject(getFacilityCablePayload());
  if (fromFacility) {
    setFacilitySiteFields(fromFacility);
    return fromFacility;
  }

  try {
    const p = new URLSearchParams(window.location.search);
    const lat = Number(p.get('latitude') ?? p.get('lat'));
    const lng = Number(p.get('longitude') ?? p.get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const fields = {
        latitude : lat,
        longitude: lng,
        status   : p.get('status') || 'Assigned',
      };
      setFacilitySiteFields(fields);
      return fields;
    }
  } catch (_) { /* ignore */ }

  return null;
}

/** Load lat/lng via GET /facilities/{id} when only facility id + siteInfo are present */
async function ensureSiteFieldsForEquipmentCreate() {
  const existing = siteFieldsForEquipmentCreate();
  if (existing) return existing;

  const facilityId = getFacilityId();
  if (!facilityId || useMockApi()) return null;

  if (_facilitySiteFieldsPromise) return _facilitySiteFieldsPromise;

  _facilitySiteFieldsPromise = (async () => {
    try {
      const meta = await API.getFacilitySiteMeta(facilityId);
      const fields = ingestSiteFieldsFromObject(meta);
      if (fields) setFacilitySiteFields(fields);
      return fields;
    } finally {
      _facilitySiteFieldsPromise = null;
    }
  })();

  return _facilitySiteFieldsPromise;
}

function _trimStr(v) {
  return typeof v === 'string' ? v.trim().replace(/^\n+/, '') : '';
}

/** Maps Fiberneo site API object → overview fields used by the UI */
function overviewFromSiteData(sd) {
  if (!sd || typeof sd !== 'object') return null;

  const geoL3 = sd.primaryGeoL3?.prettyName || sd.primaryGeoL3?.geoName;
  const geoL2 = sd.primaryGeoL2?.prettyName || sd.primaryGeoL2?.geoName;
  const locationFromGeo = [geoL3, geoL2].filter(Boolean).join(', ');
  const address = _trimStr(sd.address);
  const location = address || locationFromGeo || _trimStr(sd.areaId?.name) || '';

  const totalCores = Number(sd.totalCores ?? sd.total_cores ?? sd.coreCount);
  const nextLink = Array.isArray(sd.links) && sd.links.length ? sd.links[0] : null;

  return {
    station_id     : String(sd.id ?? ''),
    station_name   : _trimStr(sd.name) || _trimStr(sd.userFriendlyName) || 'Site',
    location,
    address,
    pop_type       : _trimStr(sd.type) || _trimStr(sd.subType) || '',
    cable_type     : _trimStr(sd.technology) || _trimStr(sd.connectionStr) || '',
    total_cores    : Number.isFinite(totalCores) && totalCores > 0 ? totalCores : null,
    in_cable       : _trimStr(sd.code) || _trimStr(sd.nmsCode) || '',
    out_cable      : _trimStr(sd.locationCode) || '',
    next_station   : _trimStr(nextLink?.name) || _trimStr(sd.circuit?.name) || '',
    next_station_id: nextLink?.id != null ? String(nextLink.id) : '',
    workflow_stage : _trimStr(sd.workflowStage) || '',
    site_code      : _trimStr(sd.code),
    contact_name   : _trimStr(sd.contactPersonName) || '',
  };
}

function mergeOverview(apiOverview, siteOverview) {
  if (!siteOverview) return apiOverview;
  if (!apiOverview) return siteOverview;
  return {
    ...apiOverview,
    ...siteOverview,
    total_cores: siteOverview.total_cores ?? apiOverview.total_cores,
  };
}

function overviewSubtitle(ov) {
  if (!ov) return '';
  const parts = [];
  if (ov.address) parts.push(ov.address);
  else if (ov.location) parts.push(ov.location);
  if (ov.pop_type) parts.push(ov.pop_type);
  if (ov.workflow_stage) parts.push(ov.workflow_stage);
  if (ov.cable_type) {
    parts.push(ov.total_cores ? `${ov.cable_type} · ${ov.total_cores} Core` : ov.cable_type);
  } else if (ov.total_cores) {
    parts.push(`${ov.total_cores} Core`);
  }
  if (ov.site_code) parts.push(ov.site_code);
  return parts.join(' · ');
}

const Config = (() => {
  const params = new URLSearchParams(window.location.search);
  const sd = getSiteData();

  return {
    stationId : params.get('station_id')
      || (sd?.id != null ? String(sd.id) : null)
      || (window.self !== window.top ? null : 'DEW001'),
    theme     : params.get('theme') || 'light',
    token     : params.get('token') || '',
  };
})();

/** Fiberneo host (preview modal, iframe, or same-window embed) — siteInfo arrives async */
function isFiberneoHostedView() {
  try {
    if (window.self !== window.top) return true;
    const loc = (window.location.pathname + window.location.search + window.location.hash).toLowerCase();
    if (loc.includes('fiberneo') || loc.includes('generic-action-preview')) return true;
  } catch (_) {
    return true;
  }
  return false;
}

/** Mock demo data only when ?mock=1 (never in Fiberneo embed with siteInfo) */
function useMockApi() {
  if (hasFacilityCableData()) return false;
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get('mock') === '1') return true;
    if (p.get('mock') === '0') return false;
  } catch (_) { /* ignore */ }
  if (getSiteData()?.id != null) return false;
  if (window.self !== window.top) return false;
  return false;
}

/** A–X / synthetic Port-n slots only for local mock demo (not live equipment search) */
function useFdmsPortFallbacks() {
  return useMockApi() && !getFacilityId();
}

/** Synthetic IN n / OUT n labels only for local mock demo */
function useEquipmentPortFallbacks() {
  return useFdmsPortFallbacks();
}

function sortedPortSlotNumbers(labels) {
  return Object.keys(labels || {})
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);
}

/** ports[] from GET /equipments/search (supports common response field names) */
function portsFromEquipmentSearchItem(item) {
  if (!item || typeof item !== 'object') return [];
  const candidates = [
    item.ports,
    item.equipmentPorts,
    item.portList,
    item.portDetails,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
  }
  return Array.isArray(item.ports) ? item.ports : [];
}
/**
 * state.js  —  Application state + shared constants
 */

/* ── APP STATE ────────────────────────────────────────── */
const State = {
  loading    : true,
  connectivityLoading: false,
  error      : null,
  overview   : null,   // getOverview() response
  equipment  : [],     // getCableView().equipment
  connections: [],     // getCableView().connections (FDMS mock / legacy)
  equipmentConnectivity: {}, // eqId → { in, out, links, count } from Fiberneo API
  connectivityRecordIndex: [], // flat index of raw API rows for DELETE
  /** eqId → { in: { slot: priority }, out: { slot: priority } } — diagram picks latest 2 */
  diagramLatestEqPorts: {},
  /** Center equipment ids with diagram port area expanded (no inner scroll) */
  diagramExpandedEqIds: new Set(),
  /** Ports cleared by DELETE — form shows Free until a new crossLink appears */
  clearedEquipPorts: Object.create(null),
  /** Cross-link keys + port hints — survive API refresh so diagram lines drop */
  pendingRemovedCrossLinkKeys: [],
  pendingClearedEquipPorts: [],
  totalPorts : 24,
  activeTab  : 'ports',
};

/* ── PORT LABELS  (A–X = 24 ports) ───────────────────── */
const PORT_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');

/* ── STRAND COLOUR SYSTEM ─────────────────────────────── */
const STRANDS = [
  { name: 'Blue',   hex: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  { name: 'Orange', hex: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  { name: 'Green',  hex: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  { name: 'Brown',  hex: '#b45309', bg: 'rgba(180, 83, 9, 0.15)' },
  { name: 'Slate',  hex: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  { name: 'White',  hex: '#e5e7eb', bg: 'rgba(229, 231, 235, 0.12)' },
  { name: 'Red',    hex: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { name: 'Black',  hex: '#6b7280', bg: 'rgba(107, 114, 128, 0.2)' },
  { name: 'Yellow', hex: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { name: 'Violet', hex: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  { name: 'Rose',   hex: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' },
  { name: 'Aqua',   hex: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' },
];

/* ── EQUIPMENT METADATA ───────────────────────────────── */
const EQ_META = {
  rly  : { icon: '🚉', label: 'Railway Equipment' },
  dwdm : { icon: '🌊', label: 'DWDM' },
  sw   : { icon: '🔀', label: 'Switch' },
  router: { icon: '🛰️', label: 'Router' },
  amp  : { icon: '📡', label: 'Amplifier' },
  split: { icon: '⚌', label: 'Splitter' },
  odf  : { icon: '📦', label: 'ODF' },
};

/** `<select value="rly">` → POST /equipments `type` (never use EQ_META.label) */
const FIBERNEO_EQUIPMENT_TYPE = {
  rly  : 'Railway',
  dwdm : 'DWDM',
  sw   : 'Switch',
  router: 'Router',
  amp  : 'Amplifier',
  split: 'Splitter',
  odf  : 'ODF',
};

/** Form key or display string → Fiberneo API type */
function equipmentTypeForApi(typeKey) {
  const key = String(typeKey || '').trim();
  if (FIBERNEO_EQUIPMENT_TYPE[key]) return FIBERNEO_EQUIPMENT_TYPE[key];

  const lower = key.toLowerCase();
  if (lower.includes('railway')) return 'Railway';
  if (lower.includes('dwdm')) return 'DWDM';
  if (lower.includes('switch') && !lower.includes('splitter')) return 'Switch';
  if (lower.includes('router')) return 'Router';
  if (lower.includes('amplif') || lower.includes('edfa')) return 'Amplifier';
  if (lower.includes('split')) return 'Splitter';
  if (lower.includes('odf')) return 'ODF';

  return key.replace(/\s+equipment$/i, '').trim() || key;
}

/** Maps Fiberneo equipment type string → diagram CSS key */
function equipmentTypeKey(typeStr) {
  const t = (typeStr || '').toLowerCase();
  if (/\bin\s*[-_]?\s*fdms\b|\binfdms\b|\bfdms\s*[-_]?\s*in\b/.test(t)) return 'infdms';
  if (/\bout\s*[-_]?\s*fdms\b|\boutfdms\b|\bfdms\s*[-_]?\s*out\b/.test(t)) return 'outfdms';
  if (t.includes('fdms') && t.includes('in') && !t.includes('out')) return 'infdms';
  if (t.includes('fdms') && t.includes('out') && !t.includes('in')) return 'outfdms';
  if (t.includes('railway') || t.includes('rly')) return 'rly';
  if (t.includes('dwdm')) return 'dwdm';
  if (t.includes('router')) return 'sw';
  if (t.includes('switch') && !t.includes('splitter')) return 'sw';
  if (t.includes('amplif') || t.includes('edfa') || t.includes('amp')) return 'amp';
  if (t.includes('splitter') || /\bs[12]\b/.test(t)) return 'split';
  if (t.includes('odf') || t.includes('olt')) return 'odf';
  return 'sw';
}

/** Combined name / type / code blob for FDMS side detection */
function _equipmentIdentityBlob(eq) {
  return [
    eq?.type_label,
    eq?.name,
    eq?.code,
    eq?.type,
  ].filter(Boolean).join(' ').toUpperCase().replace(/_/g, '-');
}

/** 'in' | 'out' | null — which FDMS side column this equipment belongs in */
function _equipmentFdmsSide(eq) {
  if (!eq) return null;
  if (eq.type === 'infdms') return 'in';
  if (eq.type === 'outfdms') return 'out';

  const blob = _equipmentIdentityBlob(eq);
  if (/\bOUT[-\s]*FDMS\b|\bFDMS[-\s]*OUT\b|\bOUTFDMS\b/.test(blob)) return 'out';
  if (/\bIN[-\s]*FDMS\b|\bFDMS[-\s]*IN\b|\bINFDMS\b/.test(blob)) return 'in';

  if (/\bFDMS\b/.test(blob)) {
    const hasIn  = /\bIN\b/.test(blob);
    const hasOut = /\bOUT\b/.test(blob);
    if (hasIn && !hasOut) return 'in';
    if (hasOut && !hasIn) return 'out';
  }
  return null;
}

/** Middle-column diagram blocks (exclude IN/OUT-FDMS — those are side columns) */
function isDiagramCenterEquipment(eq) {
  return _equipmentFdmsSide(eq) == null;
}

/** Equipment tab list — same set as diagram center column (no FDMS side devices) */
function equipmentForListPanel() {
  return State.equipment.filter(isDiagramCenterEquipment);
}

function isInFdmsEquipment(eq) {
  return _equipmentFdmsSide(eq) === 'in';
}

function isOutFdmsEquipment(eq) {
  return _equipmentFdmsSide(eq) === 'out';
}

/** Tag equipment as IN/OUT-FDMS and ensure fdms_column_ports exist for API saves */
function _ensureFdmsEquipmentTagged(eq, side) {
  if (!eq) return null;
  const wantType = side === 'in' ? 'infdms' : 'outfdms';
  if (eq.type !== wantType) eq.type = wantType;
  if (eq.api_ports?.length && !eq.fdms_column_ports?.length) {
    eq.fdms_column_ports = extractFdmsColumnPorts({ ports: eq.api_ports });
  }
  return eq;
}

/** Score non-center equipment as likely IN-FDMS or OUT-FDMS from connectivity graph */
function _buildFdmsSideScores(excludeIds = []) {
  const scores = new Map();
  const exclude = new Set(excludeIds.map(String));

  const bump = (eqId, side, pts) => {
    if (!eqId || exclude.has(eqId)) return;
    const key = `${side}:${eqId}`;
    scores.set(key, (scores.get(key) || 0) + pts);
  };

  for (const eq of State.equipment) {
    if (isDiagramCenterEquipment(eq)) continue;
    const id = String(eq.id);
    const blob = _equipmentIdentityBlob(eq);

    if (/\bIN[-\s]*FDMS\b|\bFDMS[-\s]*IN\b|\bINFDMS\b/.test(blob)) {
      bump(id, 'in', 200);
    }
    if (/\bOUT[-\s]*FDMS\b|\bFDMS[-\s]*OUT\b|\bOUTFDMS\b/.test(blob)) {
      bump(id, 'out', 200);
    }
    if (/\bFDMS\b/.test(blob)) {
      if (/\bIN\b/.test(blob) && !/\bOUT\b/.test(blob)) bump(id, 'in', 80);
      if (/\bOUT\b/.test(blob) && !/\bIN\b/.test(blob)) bump(id, 'out', 80);
    }

    const portN = (eq.api_ports || []).length;
    if (portN >= 12) {
      bump(id, 'in', 3);
      bump(id, 'out', 3);
    }

    const pc = State.equipmentConnectivity[id];
    for (const rec of pc?.rawRecords || []) {
      const tgt = rec.targetEquipment;
      const tgtType = (rec.targetPort?.portType || '').toUpperCase();
      const center = tgt && findEquipmentById(tgt.id);
      if (!center || !isDiagramCenterEquipment(center)) continue;
      if (tgtType === 'IN') bump(id, 'in', 12);
      if (tgtType === 'OUT') bump(id, 'in', 4);
    }
  }

  for (const e of collectConnectivityEdges()) {
    const fromEq = findEquipmentById(e.fromEqId);
    const toEq   = findEquipmentById(e.toEqId);
    if (!fromEq || !toEq) continue;

    if (!isDiagramCenterEquipment(fromEq) && isDiagramCenterEquipment(toEq) && e.toType === 'IN') {
      bump(String(fromEq.id), 'in', 15);
    }
    if (isDiagramCenterEquipment(fromEq) && !isDiagramCenterEquipment(toEq) && e.fromType === 'OUT') {
      bump(String(toEq.id), 'out', 15);
    }
    if (!isDiagramCenterEquipment(fromEq) && !isDiagramCenterEquipment(toEq)) {
      if (e.toType === 'IN') bump(String(toEq.id), 'out', 6);
      if (e.fromType === 'OUT') bump(String(fromEq.id), 'out', 6);
    }
  }

  return scores;
}

function _pickFdmsByScores(side, scores) {
  let best = null;
  let bestScore = 0;
  for (const [key, pts] of scores) {
    if (!key.startsWith(`${side}:`)) continue;
    const eq = findEquipmentById(key.split(':')[1]);
    if (!eq || isDiagramCenterEquipment(eq)) continue;
    if (pts > bestScore) {
      bestScore = pts;
      best = eq;
    }
  }
  return best;
}

function _fallbackFdmsByPortProfile(side, excludeIds = []) {
  const exclude = new Set(excludeIds.map(String));
  const nonCenter = State.equipment
    .filter(eq => !isDiagramCenterEquipment(eq) && !exclude.has(String(eq.id)))
    .sort((a, b) => (b.api_ports?.length || 0) - (a.api_ports?.length || 0));

  if (!nonCenter.length) return null;

  if (side === 'in') {
    return nonCenter.find(eq => /\bIN\b/.test(_equipmentIdentityBlob(eq)))
      || nonCenter[0];
  }

  return nonCenter.find(eq => /\bOUT\b/.test(_equipmentIdentityBlob(eq)))
    || nonCenter.find(eq => String(eq.id) !== String(nonCenter[0]?.id))
    || nonCenter[0];
}

function findFdmsEquipmentBySide(side, excludeIds = []) {
  const exclude = new Set(excludeIds.map(String));
  const wantType = side === 'in' ? 'infdms' : 'outfdms';

  const typed = State.equipment.find(
    (eq) => !exclude.has(String(eq.id)) && eq.type === wantType,
  );
  if (typed) return _ensureFdmsEquipmentTagged(typed, side);

  const fromSide = State.equipment.filter(
    (eq) => !exclude.has(String(eq.id)) && _equipmentFdmsSide(eq) === side,
  );
  if (fromSide.length === 1) return _ensureFdmsEquipmentTagged(fromSide[0], side);
  if (fromSide.length > 1) {
    const cableRef = _trimStr(
      side === 'in' ? State.overview?.in_cable : State.overview?.out_cable,
    );
    if (cableRef) {
      const refUp = cableRef.toUpperCase();
      const byCable = fromSide.find((eq) => {
        const n = _trimStr(eq.name).toUpperCase();
        const c = _trimStr(eq.code).toUpperCase();
        return n === refUp || c === refUp || n.includes(refUp) || c.includes(refUp);
      });
      if (byCable) return _ensureFdmsEquipmentTagged(byCable, side);
    }
    return _ensureFdmsEquipmentTagged(fromSide[0], side);
  }

  const cableRef = _trimStr(
    side === 'in' ? State.overview?.in_cable : State.overview?.out_cable,
  );
  if (cableRef) {
    const refUp = cableRef.toUpperCase();
    const byCable = State.equipment.find((eq) => {
      if (_equipmentFdmsSide(eq) === (side === 'in' ? 'out' : 'in')) return false;
      const n = _trimStr(eq.name).toUpperCase();
      const c = _trimStr(eq.code).toUpperCase();
      return n === refUp || c === refUp || n.includes(refUp) || c.includes(refUp);
    });
    if (byCable) return _ensureFdmsEquipmentTagged(byCable, side);
  }

  const scores = _buildFdmsSideScores(excludeIds);
  const byGraph = _pickFdmsByScores(side, scores);
  if (byGraph) return _ensureFdmsEquipmentTagged(byGraph, side);

  const fallback = _fallbackFdmsByPortProfile(side, excludeIds);
  if (fallback) return _ensureFdmsEquipmentTagged(fallback, side);

  return null;
}

function findInFdmsEquipment() {
  return findFdmsEquipmentBySide('in');
}

function findOutFdmsEquipment() {
  const inEq = findFdmsEquipmentBySide('in');
  const exclude = inEq ? [String(inEq.id)] : [];
  return findFdmsEquipmentBySide('out', exclude);
}

/** 1-based slot from diagram portKey (in-A, in-3, out-B, …) */
function fdmsSlotFromPortKey(portKey) {
  const m = String(portKey || '').match(/^(?:in|out)-(.+)$/i);
  if (!m) return null;
  const tail = m[1];
  const num = parseInt(tail, 10);
  if (Number.isFinite(num) && num >= 1) return num;
  const letterIdx = PORT_LABELS.indexOf(tail.toUpperCase());
  if (letterIdx >= 0) return letterIdx + 1;
  return null;
}

/** Sort key for FDMS port codes: Port-1…n, then P1-x, then P2-x (numeric within each group). */
function fdmsPortCodeSortKey(code) {
  const s = _trimStr(code);
  const portM = s.match(/^Port-(\d+)$/i);
  if (portM) return [0, parseInt(portM[1], 10), 0, s];

  const pM = s.match(/^P(\d+)-(\d+)$/i);
  if (pM) return [1, parseInt(pM[1], 10), parseInt(pM[2], 10), s];

  const tail = s.match(/(\d+)\s*$/);
  return [2, 0, tail ? parseInt(tail[1], 10) : 99999, s];
}

function compareFdmsPortCodes(a, b) {
  const ka = fdmsPortCodeSortKey(a);
  const kb = fdmsPortCodeSortKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const va = ka[i];
    const vb = kb[i];
    if (typeof va === 'number' && typeof vb === 'number') {
      if (va !== vb) return va - vb;
    } else if (String(va) !== String(vb)) {
      return String(va).localeCompare(String(vb), undefined, { numeric: true });
    }
  }
  return 0;
}

/**
 * FDMS side-column ports — one UI row per API ports[] entry, sorted ascending by code.
 * Uses port code for display only; portNumber is ignored.
 */
function extractFdmsColumnPorts(item) {
  const list = Array.isArray(item?.ports)
    ? item.ports
    : portsFromEquipmentSearchItem(item);
  if (!list.length) {
    if (!useFdmsPortFallbacks()) return [];
    const n = Math.max(
      Number(item?.noInPorts ?? item?.no_in_ports) || 0,
      Number(item?.noOutPorts ?? item?.no_out_ports) || 0,
      24,
    );
    const rows = [];
    for (let i = 1; i <= n; i++) {
      rows.push({ slot: i, code: `Port-${i}`, apiPortId: '', portType: '' });
    }
    return rows;
  }

  const rows = list.map((p, idx) => ({
    slot      : idx + 1,
    code      : _trimStr(p.code) || `Port ${idx + 1}`,
    apiPortId : p.id != null ? String(p.id) : '',
    portType  : (p.portType || '').toUpperCase(),
  }));

  rows.sort((a, b) => compareFdmsPortCodes(a.code, b.code));
  return rows.map((r, idx) => ({ ...r, slot: idx + 1 }));
}

/** Rebuild fdms_column_ports from stored api_ports after equipment load */
function refreshFdmsColumnPortsOnEquipment() {
  State.equipment.forEach((eq) => {
    if (!isInFdmsEquipment(eq) && !isOutFdmsEquipment(eq)) return;
    if (eq.api_ports?.length) {
      eq.fdms_column_ports = extractFdmsColumnPorts({ ports: eq.api_ports });
    } else {
      eq.fdms_column_ports = [];
    }
  });
}

function getFdmsColumnRows(side) {
  const eq = side === 'in' ? findInFdmsEquipment() : findOutFdmsEquipment();
  if (!eq) return [];
  if (Array.isArray(eq.api_ports)) {
    const rows = eq.api_ports.length
      ? extractFdmsColumnPorts({ ports: eq.api_ports })
      : [];
    eq.fdms_column_ports = rows;
    return rows;
  }
  if (eq.fdms_column_ports?.length) return eq.fdms_column_ports;
  if (!useFdmsPortFallbacks()) return [];
  return [];
}

/** IN-FDMS column slots: { portKey, label, slot } */
function getFdmsInColumnSlots() {
  const rows = getFdmsColumnRows('in');
  if (rows.length) {
    return rows.map((p) => ({
      portKey: `in-${p.slot}`,
      label  : p.code,
      slot   : p.slot,
    }));
  }
  if (!useFdmsPortFallbacks()) return [];
  return PORT_LABELS.map((lbl, i) => ({
    portKey: `in-${lbl}`,
    label  : lbl,
    slot   : i + 1,
  }));
}

/** OUT-FDMS ports already painted on the diagram (fallback when API rows missing) */
function fdmsOutSlotsFromDiagramDom() {
  const slots = [];
  const seen = new Set();
  document.querySelectorAll('[id^="d-out"] .d-port-fdms, #d-out-fs .d-port-fdms').forEach((el) => {
    const portKey = el.getAttribute('data-out-port')
      || el.id?.split('__').pop();
    if (!portKey || !/^out-/i.test(portKey) || seen.has(portKey)) return;
    seen.add(portKey);
    slots.push({
      portKey,
      label: (el.textContent || '').trim() || portKey.replace(/^out-/i, ''),
      slot : fdmsSlotFromPortKey(portKey) || slots.length + 1,
    });
  });
  return slots;
}

/** Build OUT-FDMS column rows when OUT device exists but ports[] was empty */
function _synthesizeOutFdmsRowsFromIn() {
  const outEq = findOutFdmsEquipment();
  const inRows = getFdmsColumnRows('in');
  if (!outEq || !inRows.length) return [];

  const rows = inRows.map((r, idx) => {
    const code = r.code;
    const apiPortId = findApiPortIdOnEquipment(outEq, code, 'OUT')
      || findApiPortIdOnEquipment(outEq, code, null)
      || '';
    return {
      slot      : idx + 1,
      code,
      apiPortId : apiPortId ? String(apiPortId) : '',
      portType  : 'OUT',
    };
  });

  outEq.fdms_column_ports = rows;
  return rows;
}

/** OUT-FDMS column slots: { portKey, label, slot } — live API uses OUT equipment ports[] only */
function getFdmsOutColumnSlots() {
  let rows = getFdmsColumnRows('out');
  if (!rows.length && useFdmsPortFallbacks()) {
    rows = _synthesizeOutFdmsRowsFromIn();
  }

  if (rows.length) {
    return rows.map((p) => ({
      portKey: `out-${p.slot}`,
      label  : p.code,
      slot   : p.slot,
    }));
  }

  if (!useFdmsPortFallbacks()) return [];

  const fromDom = fdmsOutSlotsFromDiagramDom();
  if (fromDom.length) return fromDom;

  return PORT_LABELS.map((lbl, i) => ({
    portKey: `out-${lbl}`,
    label  : lbl,
    slot   : i + 1,
  }));
}

/** Unique OUT-FDMS slots by portKey (avoids duplicate grid buttons) */
function getFdmsOutColumnSlotsUnique() {
  const seen = new Set();
  return getFdmsOutColumnSlots().filter((s) => {
    if (seen.has(s.portKey)) return false;
    seen.add(s.portKey);
    return true;
  });
}

/** Unique IN-FDMS slots by portKey and label (avoids duplicate grid buttons) */
function getFdmsInColumnSlotsUnique() {
  const seenKeys = new Set();
  const seenLabels = new Set();
  return getFdmsInColumnSlots().filter((s) => {
    const label = _trimStr(s.label).toLowerCase();
    if (seenKeys.has(s.portKey) || (label && seenLabels.has(label))) return false;
    seenKeys.add(s.portKey);
    if (label) seenLabels.add(label);
    return true;
  });
}

function fdmsPortKeyForOutLabel(label) {
  const want = _trimStr(label);
  if (!want) return null;
  const slot = getFdmsOutColumnSlotsUnique().find((s) => s.label === want);
  return slot?.portKey || null;
}

function fdmsInLabelFromPortKey(portKey) {
  const slot = getFdmsInColumnSlots().find(s => s.portKey === portKey);
  return slot ? slot.label : (portKey || '').replace(/^in-/, '');
}

function fdmsOutLabelFromPortKey(portKey) {
  const slot = getFdmsOutColumnSlots().find(s => s.portKey === portKey);
  return slot ? slot.label : (portKey || '').replace(/^out-/, '');
}

/** Port-list badge size hint from code length */
function plbCodeSizeAttr(label) {
  const n = _trimStr(label).length;
  if (n > 7) return 'long';
  if (n > 5) return 'medium';
  return 'short';
}

function buildPortListPathHtml(conn, label, eq, cls) {
  const isOutLeg = conn.linkRole === 'fdms-out-to-eq-out';
  let pathEnd = '';
  if (conn.dst) {
    pathEnd = fdmsOutLabelFromPortKey(conn.dst);
  } else if (isOutLeg && conn.eq_out_code) {
    pathEnd = conn.eq_out_code;
  } else if (conn.eq_out_code) {
    pathEnd = conn.eq_out_code;
  } else if (conn.dst_fdms_code) {
    pathEnd = conn.dst_fdms_code;
  }

  const mid = eq
    ? `<span class="pci-via ${cls}">${escapeHtml(eq.name)}</span>`
    : `<span class="pci-via dir">Direct</span>`;
  const endPart = pathEnd
    ? `<span class="pci-arrow">→</span><span class="pci-path-end">${escapeHtml(pathEnd)}</span>`
    : '';

  return `<span class="pci-path-src">${escapeHtml(label)}</span>`
    + `<span class="pci-arrow">→</span>${mid}${endPart}`;
}

function buildPortListSubHtml(conn, strand) {
  const isOutLeg = conn.linkRole === 'fdms-out-to-eq-out';
  let ports = '';
  if (isOutLeg && conn.eq_out_code) {
    ports = conn.eq_out_port
      ? `${conn.eq_out_port.toUpperCase()} · ${conn.eq_out_code}`
      : `EQ OUT · ${conn.eq_out_code}`;
  } else if (conn.eq_in_code && conn.eq_out_code) {
    ports = `${conn.eq_in_code} → ${conn.eq_out_code}`;
  } else if (conn.eq_in_code) {
    ports = `EQ IN · ${conn.eq_in_code}`;
  } else if (conn.eq_in_port) {
    const out = conn.eq_out_port ? conn.eq_out_port.toUpperCase() : '—';
    ports = `${conn.eq_in_port.toUpperCase()} → ${out}`;
  }

  let sub = `<span class="sdot" style="background:${strand.hex}"></span>`
    + `<span>${strand.name} strand</span>`;
  if (ports) sub += `<span class="pci-dot">·</span><span>${escapeHtml(ports)}</span>`;
  return sub;
}

/** IN-FDMS port row → diagram connection (full path or OUT-leg only) */
function getInFdmsPortConnection(portKey) {
  return State.connections.find(c => c.src === portKey) || null;
}

/** OUT-FDMS port already has an equipment OUT hop */
function isOutFdmsPortTaken(portKey) {
  return State.connections.some(c => c.dst === portKey);
}

/** IN-FDMS → equipment IN hop (not eq-to-eq or OUT-leg only) */
function isInFdmsToEqInConnection(conn) {
  if (!conn?.src || !/^in-/i.test(String(conn.src))) return false;
  if (conn.linkRole === 'fdms-out-to-eq-out' || conn.linkRole === 'eq-out-to-fdms') return false;
  return true;
}

/** How many IN-FDMS links land on this equipment IN slot */
function countLinksToEqInPort(eqId, slot) {
  const portRef = `in${slot}`;
  const eq = findEquipmentById(eqId);
  const code = eq ? eqPortDisplayLabel(eq, 'in', slot) : null;
  return State.connections.filter((c) => {
    if (!isInFdmsToEqInConnection(c)) return false;
    if (String(c.equipment_id) !== String(eqId)) return false;
    if (c.eq_in_port && String(c.eq_in_port).toLowerCase() === portRef) return true;
    if (code && _trimStr(c.eq_in_code) === code) return true;
    return false;
  }).length;
}

/** DWDM only — other center equipment types allow 1 IN-FDMS link per IN port */
function isDwdmEquipment(eq) {
  if (!eq) return false;
  if (String(eq.type || '').toLowerCase() === 'dwdm') return true;
  if (String(eq.type_label || '').toLowerCase().includes('dwdm')) return true;
  return equipmentTypeKey(eq.type_label || eq.type || '') === 'dwdm';
}

function maxInFdmsLinksPerEqInPort(eq) {
  return isDwdmEquipment(eq) ? 2 : 1;
}

function eqInSlotFromPortRef(eqId, inPort, inCode) {
  const eq = findEquipmentById(eqId);
  const code = _trimStr(inCode);
  if (eq && code) {
    const hit = getAllCenterEquipmentPortSlots(eq).find((r) => r.code === code);
    if (hit) return hit.slot;
  }
  const ref = _trimStr(inPort);
  const m = ref.match(/^(?:in|out)(\d+)$/i);
  if (m) {
    const slot = Number(m[1]);
    if (Number.isFinite(slot) && slot >= 1) return slot;
  }
  if (code) {
    const byApi = findEqPortSlotByCode(eqId, code, null);
    if (byApi) return byApi;
    if (eq) {
      const want = code.toLowerCase();
      const match = getAllCenterEquipmentPortSlots(eq)
        .find((row) => _trimStr(row.label).toLowerCase() === want);
      if (match) return match.slot;
    }
  }
  return null;
}

function eqInPortInFdmsLinkCapacity(eqId, slot) {
  const eq = findEquipmentById(eqId);
  const max = maxInFdmsLinksPerEqInPort(eq);
  const current = Number.isFinite(slot) ? countLinksToEqInPort(eqId, slot) : 0;
  return { eq, max, current, allowed: current < max };
}

function inFdmsEqInCapacityToast(cap) {
  const name = cap.eq?.name || 'Equipment';
  if (cap.max <= 1) {
    const typeLbl = EQ_META[cap.eq?.type]?.label || cap.eq?.type_label || 'equipment';
    return `⚠️ ${name} (${typeLbl}) — only 1 IN-FDMS port per IN port`;
  }
  return `⚠️ ${name} (DWDM) — max ${cap.max} IN-FDMS ports per IN port`;
}

/** How many OUT-FDMS links leave this equipment OUT slot */
function countLinksFromEqOutPort(eqId, slot) {
  const portRef = `out${slot}`;
  const eq = findEquipmentById(eqId);
  const code = eq ? eqPortDisplayLabel(eq, 'out', slot) : null;
  const matchesOut = (c) => {
    if (String(c.equipment_id) !== String(eqId)) return false;
    if (!c.dst && c.linkRole !== 'eq-out-to-fdms') return false;
    if (c.eq_out_port === portRef) return true;
    if (code && _trimStr(c.eq_out_code) === code) return true;
    return false;
  };
  const seen = new Set();
  let n = 0;
  State.connections.forEach((c) => {
    if (!matchesOut(c)) return;
    const key = c.dst || c.dst_fdms_code || c.id || JSON.stringify(c);
    if (seen.has(key)) return;
    seen.add(key);
    n += 1;
  });
  return n;
}

function maxOutFdmsLinksPerEqOutPort(eq) {
  return isDwdmEquipment(eq) ? 2 : 1;
}

function eqOutSlotFromPortRef(eqId, outPort, outCode) {
  const eq = findEquipmentById(eqId);
  const code = _trimStr(outCode);
  if (eq && code) {
    const hit = getAllCenterEquipmentPortSlots(eq).find((r) => r.code === code);
    if (hit) return hit.slot;
  }
  const ref = _trimStr(outPort);
  const m = ref.match(/^(?:in|out)(\d+)$/i);
  if (m) {
    const slot = Number(m[1]);
    if (Number.isFinite(slot) && slot >= 1) return slot;
  }
  if (code) {
    const byApi = findEqPortSlotByCode(eqId, code, null);
    if (byApi) return byApi;
    if (eq) {
      const want = code.toLowerCase();
      const match = getAllCenterEquipmentPortSlots(eq)
        .find((row) => _trimStr(row.label).toLowerCase() === want);
      if (match) return match.slot;
    }
  }
  return null;
}

function eqOutPortOutFdmsLinkCapacity(eqId, slot) {
  const eq = findEquipmentById(eqId);
  const max = maxOutFdmsLinksPerEqOutPort(eq);
  const current = Number.isFinite(slot) ? countLinksFromEqOutPort(eqId, slot) : 0;
  return { eq, max, current, allowed: current < max };
}

function eqOutFdmsCapacityToast(cap) {
  const name = cap.eq?.name || 'Equipment';
  if (cap.max <= 1) {
    const typeLbl = EQ_META[cap.eq?.type]?.label || cap.eq?.type_label || 'equipment';
    return `⚠️ ${name} (${typeLbl}) — only 1 OUT-FDMS link per equipment port`;
  }
  return `⚠️ ${name} (DWDM) — max ${cap.max} OUT-FDMS links per equipment port`;
}

/** Human label for the far end of an IN-FDMS port path (OUT-FDMS or equipment OUT) */
function fdmsConnectionDestLabel(conn) {
  if (!conn) return '';
  if (conn.dst_fdms_code) return conn.dst_fdms_code;
  if (conn.dst) {
    const lbl = fdmsOutLabelFromPortKey(conn.dst);
    if (lbl && lbl !== conn.dst) return lbl;
  }
  if (conn.eq_out_code) {
    const eq = findEquipmentById(conn.equipment_id);
    return eq ? `${eq.name} · ${conn.eq_out_code}` : conn.eq_out_code;
  }
  return '';
}

function eqPortLabelFromConn(eq, side, conn) {
  if (!eq || !conn) return '—';
  const code = side === 'in' ? conn.eq_in_code : conn.eq_out_code;
  if (code) return code;
  const slot = parseInt(
    String(side === 'in' ? conn.eq_in_port : conn.eq_out_port || '').replace(/\D/g, ''),
    10,
  );
  return eqPortDisplayLabel(eq, side, Number.isFinite(slot) ? slot : 1);
}

function syncTotalPortsFromFdms() {
  const n = Math.max(getFdmsInColumnSlots().length, getFdmsOutColumnSlots().length);
  if (n > 0) State.totalPorts = n;
}

function shortEquipName(eq) {
  if (!eq) return 'Equipment';
  const n = fullEquipName(eq);
  return n.length > 24 ? `${n.slice(0, 22)}…` : n;
}

function fullEquipName(eq) {
  if (!eq) return 'Equipment';
  return _trimStr(eq.name) || _trimStr(eq.code) || 'Equipment';
}

/** Restore full equipment name when port label was shortened with an ellipsis */
function expandTruncatedPortLabel(displayLabel) {
  const text = _trimStr(displayLabel);
  if (!text || !text.includes('…')) return text;
  const m = text.match(/^([←→])\s*(.+?)…(.*)$/);
  if (!m) return text;
  const [, arrow, prefix, suffix] = m;
  const want = _trimStr(prefix);
  if (!want) return text;
  for (const e of State.equipment) {
    const full = fullEquipName(e);
    if (full.startsWith(want) && full.length > want.length) {
      return `${arrow} ${full}${suffix}`;
    }
  }
  return text;
}

function resolveEquipPortFullLabel(eq, side, slot, displayLabel) {
  const pc = getEqPortConnectivity(eq.id);
  const entry = side === 'in' ? pc.in[slot] : pc.out[slot];
  if (entry?.fullLabel) return entry.fullLabel;

  const code = eqPortDisplayLabel(eq, side, slot);
  const links = getAllConnectivityCrossLinks();
  const arrow = _trimStr(displayLabel).startsWith('→') ? '→' : '←';
  const portSuffixFromDisplay = _trimStr(displayLabel).match(/(\s\([^)]+\))\s*$/)?.[1] || '';

  if (side === 'in') {
    const lk = links.find((l) => (
      String(l.toEqId) === String(eq.id) && l.toSide === 'in'
      && (l.toCode === code || Number(l.toIndex) === Number(slot))
    ));
    if (lk) {
      const remote = findEquipmentById(lk.fromEqId);
      if (remote) {
        const portSuffix = lk.fromCode ? ` (${lk.fromCode})` : portSuffixFromDisplay;
        return `${arrow} ${fullEquipName(remote)}${portSuffix}`;
      }
    }
  } else {
    const lk = links.find((l) => (
      String(l.fromEqId) === String(eq.id) && l.fromSide === 'out'
      && (l.fromCode === code || Number(l.fromIndex) === Number(slot))
    ));
    if (lk) {
      const remote = findEquipmentById(lk.toEqId);
      if (remote) {
        const portSuffix = lk.toCode ? ` (${lk.toCode})` : portSuffixFromDisplay;
        return `${arrow} ${fullEquipName(remote)}${portSuffix}`;
      }
    }
  }

  return expandTruncatedPortLabel(displayLabel);
}

/** Decode HTML entities from attribute / DOM text (embed-safe) */
function decodeAttrValue(v) {
  const s = v != null ? String(v).trim() : '';
  if (!s) return '';
  if (!/[&<]/.test(s)) return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return (ta.value || s).trim();
}

/** Match equipment by id (string-safe, loose numeric / entity decode) */
function findEquipmentById(id) {
  if (id == null) return null;
  const sid = decodeAttrValue(id);
  if (!sid) return null;
  let eq = State.equipment.find((e) => String(e.id) === sid);
  if (eq) return eq;
  if (/^\d+$/.test(sid)) {
    const n = Number(sid);
    eq = State.equipment.find((e) => Number(e.id) === n || String(e.id) === sid);
    if (eq) return eq;
  }
  return null;
}

/** Equipment id from diagram port cell (embed may strip data-eq-id) */
function eqIdFromDiagramPortEl(el) {
  if (!el) return null;
  const direct = decodeAttrValue(el.getAttribute('data-eq-id'));
  if (direct) return direct;
  const parent = el.closest('.d-eq[data-eq-id]');
  if (parent) {
    const pid = decodeAttrValue(parent.getAttribute('data-eq-id'));
    if (pid) return pid;
  }
  const domId = el.id || parent?.id || '';
  const m = domId.match(/^(?:d-eq(?:-fs)?)__(.+)__out\d+$/i);
  return m ? decodeAttrValue(m[1]) : null;
}

/** Resolve equipment from diagram OUT port click (id, name, single center device) */
function findEquipmentForDiagramPort(portEl, rawId) {
  const sid = rawId != null ? decodeAttrValue(rawId) : '';
  if (sid) {
    const byId = findEquipmentById(sid);
    if (byId) return byId;
    const low = sid.toLowerCase();
    const byCode = State.equipment.find((e) => String(e.code || '').toLowerCase() === low);
    if (byCode) return byCode;
  }
  const card = portEl?.closest?.('.d-eq');
  if (card) {
    const fromCard = decodeAttrValue(card.getAttribute('data-eq-id'));
    if (fromCard) {
      const eq = findEquipmentById(fromCard);
      if (eq) return eq;
    }
    const cardDomId = card.id || '';
    const cm = cardDomId.match(/^(?:d-eq(?:-fs)?)__(.+)$/i);
    if (cm) {
      const eq = findEquipmentById(cm[1]);
      if (eq) return eq;
    }
    const name = card.querySelector('.d-eq-name')?.textContent?.trim();
    if (name) {
      const byName = State.equipment.filter(isDiagramCenterEquipment).find((e) => {
        const n = _trimStr(e.name);
        return n === name || n.toLowerCase() === name.toLowerCase();
      });
      if (byName) return byName;
    }
  }
  const center = State.equipment.filter(isDiagramCenterEquipment);
  if (center.length === 1) return center[0];
  return null;
}

/** Resolve equipment from connect picker port button (embed may strip data-eq-id) */
function findEquipmentForPickerPort(pickEl, rawId) {
  const fromDiagram = findEquipmentForDiagramPort(pickEl, rawId);
  if (fromDiagram) return fromDiagram;

  const sid = rawId != null ? decodeAttrValue(rawId) : '';
  if (sid) {
    const byId = findEquipmentById(sid);
    if (byId) return byId;
    const low = sid.toLowerCase();
    const byCode = State.equipment.find((e) => String(e.code || '').toLowerCase() === low);
    if (byCode) return byCode;
  }

  const group = pickEl?.closest?.('.eq-pick-group');
  if (group) {
    const groupDomId = group.id || '';
    const gm = groupDomId.match(/^eq-pick__(.+)$/i);
    if (gm) {
      const eq = findEquipmentById(decodeAttrValue(gm[1]));
      if (eq) return eq;
    }
    const gid = decodeAttrValue(group.getAttribute('data-eq-id'));
    if (gid) {
      const eq = findEquipmentById(gid);
      if (eq) return eq;
    }
    const pickId = decodeAttrValue(
      pickEl?.getAttribute?.('data-eq-out-pick')
      || pickEl?.getAttribute?.('data-eq-in-pick')
      || pickEl?.getAttribute?.('data-eq-hop-in-pick'),
    );
    if (pickId) {
      const eq = findEquipmentById(pickId);
      if (eq) return eq;
    }
    const name = group.querySelector('.eq-pick-name')?.textContent?.trim();
    if (name) {
      const byName = State.equipment.find((e) => {
        const n = _trimStr(e.name);
        return n === name || n.toLowerCase() === name.toLowerCase();
      });
      if (byName) return byName;
    }
  }

  return null;
}

/** Resolve equipment id — exact match, then by code fallback */
function resolveEquipmentId(rawId) {
  const eq = findEquipmentForDiagramPort(null, rawId);
  return eq ? String(eq.id) : (rawId != null ? decodeAttrValue(rawId) : null);
}

/** Defaults for POST /equipment-connectivity */
const FIBERNEO_CONNECTIVITY_DEFAULTS = {
  connectionType: 'FIBER',
  status        : 'Connected',
};

/** POST /equipment-connectivity — only the fields Fiberneo expects */
function buildConnectivityPayload(hop) {
  return {
    connectionType    : hop.connectionType || FIBERNEO_CONNECTIVITY_DEFAULTS.connectionType,
    status            : hop.status || FIBERNEO_CONNECTIVITY_DEFAULTS.status,
    sourceEquipmentId : String(hop.sourceEquipmentId),
    sourcePortId      : String(hop.sourcePortId),
    targetEquipmentId : String(hop.targetEquipmentId),
    targetPortId      : String(hop.targetPortId),
  };
}

function findApiPortById(eqId, portId) {
  const eq = findEquipmentById(eqId);
  if (!eq || portId == null) return null;
  const pid = String(portId);
  const fromList = (eq.api_ports || []).find((p) => String(p.id) === pid);
  if (fromList) return { ...fromList };
  for (const side of ['in', 'out']) {
    for (const row of Object.values(eq.ports_by_slot?.[side] || {})) {
      if (row && String(row.id) === pid) return { ...row };
    }
  }
  return null;
}

function _equipmentStubForRecord(eq) {
  if (!eq) return null;
  return {
    id  : String(eq.id),
    name: eq.name,
    code: eq.code,
    type: eq.type_label || eq.type,
  };
}

/** Build equipmentConnectivities row shape after a successful POST */
function buildConnectivityRecordFromHop(body, connectState, apiRes = {}) {
  const srcEq = findEquipmentById(body.sourceEquipmentId);
  const tgtEq = findEquipmentById(body.targetEquipmentId);
  const sourcePort = findApiPortById(body.sourceEquipmentId, body.sourcePortId);
  const targetPort = findApiPortById(body.targetEquipmentId, body.targetPortId);
  const mode = resolveConnectWizardMode(connectState);
  const outHop = mode === 'out-hop';
  const eqHop = mode === 'eq-hop';

  return {
    id: apiRes?.id || apiRes?.data?.id
      || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourcePort: sourcePort || {
      id       : body.sourcePortId,
      portType : (outHop || eqHop) ? 'OUT' : 'IN',
      code     : (outHop || eqHop)
        ? (connectState.eqOutCode || connectState.eqOutPort || '')
        : (connectState.srcPort ? fdmsInLabelFromPortKey(connectState.srcPort) : ''),
    },
    targetPort: targetPort || {
      id       : body.targetPortId,
      portType : outHop ? 'OUT' : 'IN',
      code     : outHop
        ? (connectState.dstLabel || fdmsOutLabelFromPortKey(connectState.dstPort) || '')
        : eqHop
          ? (connectState.eqInCode || connectState.eqInPort || '')
          : (connectState.eqInCode || connectState.eqInPort || ''),
    },
    sourceEquipment: _equipmentStubForRecord(srcEq),
    targetEquipment: {
      ..._equipmentStubForRecord(tgtEq),
      isDeleted: false,
    },
    connectionType: body.connectionType || 'FIBER',
    status        : body.status || 'Connected',
    isDeleted     : false,
    createdTime   : Date.now(),
    modifiedTime  : Date.now(),
  };
}

function patchFacilityEquipmentConnectivity(eqId, rec) {
  const facility = getFacilityCablePayload();
  if (!facility?.equipments) return;
  const raw = facility.equipments.find((e) => String(e.id) === String(eqId));
  if (!raw) return;
  if (!Array.isArray(raw.equipmentConnectivities)) raw.equipmentConnectivities = [];
  const rid = rec.id != null ? String(rec.id) : '';
  if (rid && raw.equipmentConnectivities.some((r) => String(r.id) === rid)) return;
  raw.equipmentConnectivities.push(rec);
}

/** Stable key for source OUT → target IN (etc.) — catches duplicate rows without shared id */
function connectivityRecordPairKey(rec) {
  if (!rec) return null;
  const srcId = rec.sourceEquipment?.id;
  const tgtId = rec.targetEquipment?.id;
  const srcCode = _portCode(rec.sourcePort);
  const tgtCode = _portCode(rec.targetPort);
  const srcType = (rec.sourcePort?.portType || '').toUpperCase();
  const tgtType = (rec.targetPort?.portType || '').toUpperCase();
  if (!srcId || !tgtId || !srcCode || !tgtCode) return null;
  return [String(srcId), srcType, srcCode, String(tgtId), tgtType, tgtCode].join('|');
}

/** Whether a connectivity row touches a specific equipment IN/OUT port */
function recordTouchesEquipPort(rec, eqId, side, slot, code) {
  if (!rec || eqId == null) return false;
  const sideType = side === 'in' ? 'IN' : 'OUT';
  const eq = findEquipmentById(eqId);
  const portCode = _trimStr(code) || (eq ? eqPortDisplayLabel(eq, side, slot) : '');
  const wantId = String(eqId);

  const srcId = rec.sourceEquipment?.id != null ? String(rec.sourceEquipment.id) : null;
  const tgtId = rec.targetEquipment?.id != null ? String(rec.targetEquipment.id) : null;
  const srcType = (rec.sourcePort?.portType || '').toUpperCase();
  const tgtType = (rec.targetPort?.portType || '').toUpperCase();
  const srcCode = _portCode(rec.sourcePort);
  const tgtCode = _portCode(rec.targetPort);

  if (srcId === wantId && (!srcType || srcType === sideType)) {
    if (portCode && srcCode === portCode) return true;
    const s = findEqPortSlotByCode(wantId, srcCode, sideType);
    if (s != null && Number(s) === Number(slot)) return true;
  }
  if (tgtId === wantId && (!tgtType || tgtType === sideType)) {
    if (portCode && tgtCode === portCode) return true;
    const s = findEqPortSlotByCode(wantId, tgtCode, sideType);
    if (s != null && Number(s) === Number(slot)) return true;
  }
  return false;
}

function equipPortClearKey(eqId, side, slot, code) {
  const eq = findEquipmentById(eqId);
  const portCode = _trimStr(code) || (eq ? eqPortDisplayLabel(eq, side, slot) : '');
  return `${eqId}|${side}|${slot}|${portCode}`;
}

function markEquipPortCleared(portHint) {
  if (!portHint?.eqId) return;
  const eq = findEquipmentById(portHint.eqId);
  const code = _trimStr(portHint.code) || (eq
    ? eqPortDisplayLabel(eq, portHint.side, portHint.slot)
    : '');
  State.clearedEquipPorts[equipPortClearKey(portHint.eqId, portHint.side, portHint.slot, code)] = Date.now();
}

function isEquipPortForceFree(eqId, side, slot, code) {
  const eq = findEquipmentById(eqId);
  const portCode = _trimStr(code) || (eq ? eqPortDisplayLabel(eq, side, slot) : '');
  const key = equipPortClearKey(eqId, side, slot, portCode);
  if (!State.clearedEquipPorts[key]) return false;
  const stillLive = getAllConnectivityCrossLinks().some(
    (lk) => equipPortMatchesCrossLink(lk, eqId, side, slot, portCode),
  );
  if (stillLive) {
    delete State.clearedEquipPorts[key];
    return false;
  }
  return true;
}

function clearEquipPortCellMaps(eqId, side, slot, code) {
  const pc = State.equipmentConnectivity[String(eqId)];
  if (!pc) return;
  const map = side === 'in' ? pc.in : pc.out;
  if (!map) return;
  const eq = findEquipmentById(eqId);
  const portCode = _trimStr(code) || (eq ? eqPortDisplayLabel(eq, side, slot) : '');
  delete map[slot];
  Object.keys(map).forEach((k) => {
    const cell = map[k];
    if (!cell) return;
    if (Number(k) === Number(slot)) {
      delete map[k];
      return;
    }
    if (portCode && (cell.code === portCode || _trimStr(cell.label || '').includes(portCode))) {
      delete map[k];
    }
  });
}

/** Strip cross-links / raw rows for one port from all equipments (post-delete) */
function purgeStateConnectivityForEquipPort(portHint) {
  if (!portHint?.eqId) return;
  const { eqId, side, slot, code, crossLink } = portHint;

  for (const eq of State.equipment) {
    const pc = State.equipmentConnectivity[String(eq.id)];
    if (!pc) continue;

    if (Array.isArray(pc.crossLinks)) {
      pc.crossLinks = pc.crossLinks.filter((lk) => {
        if (equipPortMatchesCrossLink(lk, eqId, side, slot, code)) return false;
        if (crossLink && crossLinkIdentityKey(lk) === crossLinkIdentityKey(crossLink)) return false;
        return true;
      });
    }

    if (String(eq.id) === String(eqId) && Array.isArray(pc.links)) {
      pc.links = pc.links.filter((link) => {
        if (side === 'in' && Number(link.in) === Number(slot)) return false;
        if (side === 'out' && Number(link.out) === Number(slot)) return false;
        return true;
      });
    }

    if (Array.isArray(pc.rawRecords)) {
      pc.rawRecords = pc.rawRecords.filter((rec) => {
        if (recordTouchesEquipPort(rec, eqId, side, slot, code)) return false;
        if (crossLink && recordMatchesCrossLink(rec, crossLink)) return false;
        return true;
      });
    }
  }

  clearEquipPortCellMaps(eqId, side, slot, code);

  const eq = findEquipmentById(eqId);
  const portCode = _trimStr(code) || (eq ? eqPortDisplayLabel(eq, side, slot) : '');
  State.connections = (State.connections || []).filter((c) => {
    if (String(c.equipment_id) !== String(eqId)) return true;
    if (side === 'in' && (c.eq_in_code === portCode || c.eq_in_port === `in${slot}`)) return false;
    if (side === 'out' && (c.eq_out_code === portCode || c.eq_out_port === `out${slot}`)) return false;
    return true;
  });
}

/** Match API row to a diagram cross-link (eq-hop, FDMS hop, etc.) */
function recordMatchesCrossLink(rec, lk) {
  if (!rec || !lk) return false;
  const srcId = rec.sourceEquipment?.id != null ? String(rec.sourceEquipment.id) : null;
  const tgtId = rec.targetEquipment?.id != null ? String(rec.targetEquipment.id) : null;
  if (!srcId || !tgtId) return false;
  if (srcId !== String(lk.fromEqId) || tgtId !== String(lk.toEqId)) return false;

  const srcType = (rec.sourcePort?.portType || '').toUpperCase();
  const tgtType = (rec.targetPort?.portType || '').toUpperCase();
  const srcCode = _portCode(rec.sourcePort);
  const tgtCode = _portCode(rec.targetPort);

  if (lk.fromSide === 'fdms' || lk.fromSide === 'fdms-out') {
    if (lk.fromCode && srcCode !== lk.fromCode) return false;
    if (lk.toSide === 'in' && tgtType !== 'IN') return false;
    if (lk.toSide === 'out' && tgtType !== 'OUT') return false;
    if (lk.toCode && tgtCode !== lk.toCode) return false;
    return true;
  }

  const wantSrcType = lk.fromSide === 'in' ? 'IN' : lk.fromSide === 'out' ? 'OUT' : null;
  const wantTgtType = lk.toSide === 'in' ? 'IN' : lk.toSide === 'out' ? 'OUT' : null;
  if (wantSrcType && srcType !== wantSrcType) return false;
  if (wantTgtType && tgtType !== wantTgtType) return false;
  if (lk.fromCode && srcCode !== lk.fromCode) return false;
  if (lk.toCode && tgtCode !== lk.toCode) return false;
  return true;
}

function equipPortMatchesCrossLink(lk, eqId, side, slot, code) {
  const wantId = String(eqId);
  const eq = findEquipmentById(eqId);
  const portCode = _trimStr(code) || (eq ? eqPortDisplayLabel(eq, side, slot) : '');
  const slotN = Number(slot);

  if (side === 'in' && String(lk.toEqId) === wantId && lk.toSide === 'in') {
    if (portCode && lk.toCode === portCode) return true;
    if (lk.toCode) {
      const mapped = findEqPortSlotByCode(wantId, lk.toCode, 'IN');
      if (mapped != null && Number(mapped) === slotN) return true;
    }
    if (lk.toIndex != null && Number(lk.toIndex) === slotN) return true;
  }
  if (side === 'out' && String(lk.fromEqId) === wantId && lk.fromSide === 'out') {
    if (portCode && lk.fromCode === portCode) return true;
    if (lk.fromCode) {
      const mapped = findEqPortSlotByCode(wantId, lk.fromCode, 'OUT');
      if (mapped != null && Number(mapped) === slotN) return true;
    }
    if (lk.fromIndex != null && Number(lk.fromIndex) === slotN) return true;
  }
  return false;
}

function crossLinkIdentityKey(lk) {
  if (!lk) return '';
  return [
    lk.fromEqId, lk.fromSide, lk.fromCode || '', lk.fromIndex,
    lk.toEqId, lk.toSide, lk.toCode || '', lk.toIndex,
  ].join('|');
}

function rememberRemovedCrossLink(lk) {
  if (!lk) return;
  const key = crossLinkIdentityKey(lk);
  if (!key) return;
  if (!State.pendingRemovedCrossLinkKeys.includes(key)) {
    State.pendingRemovedCrossLinkKeys.push(key);
  }
}

function rememberRemovedEquipPort(portHint) {
  if (!portHint?.eqId) return;
  const entry = {
    eqId: String(portHint.eqId),
    side: portHint.side,
    slot: portHint.slot,
    code: portHint.code,
    crossLink: portHint.crossLink || null,
  };
  const dup = State.pendingClearedEquipPorts.some((h) => (
    String(h.eqId) === entry.eqId
      && h.side === entry.side
      && Number(h.slot) === Number(entry.slot)
      && _trimStr(h.code) === _trimStr(entry.code)
  ));
  if (!dup) State.pendingClearedEquipPorts.push(entry);
}

function applyPendingCrossLinkRemovals() {
  const keys = State.pendingRemovedCrossLinkKeys;
  if (!keys?.length) return;
  const set = new Set(keys);
  for (const eq of State.equipment) {
    const pc = State.equipmentConnectivity[String(eq.id)];
    if (!pc?.crossLinks?.length) continue;
    pc.crossLinks = pc.crossLinks.filter((lk) => !set.has(crossLinkIdentityKey(lk)));
  }
}

function applyPendingEquipPortClears() {
  if (!State.pendingClearedEquipPorts?.length) return;
  for (const hint of State.pendingClearedEquipPorts) {
    purgeStateConnectivityForEquipPort(hint);
    if (hint.crossLink) rememberRemovedCrossLink(hint.crossLink);
  }
  applyPendingCrossLinkRemovals();
}

/** Remove connectivity rows from cached siteInfo (all equipments — same id may appear on both sides) */
function unpatchFacilityEquipmentConnectivity(apiRecords, portHint = null) {
  const list = (Array.isArray(apiRecords) ? apiRecords : [apiRecords]).filter(Boolean);
  const ids = new Set(
    list.map((rec) => (rec?.id != null ? String(rec.id) : '')).filter(Boolean),
  );
  const pairKeys = new Set(
    list.map((rec) => connectivityRecordPairKey(rec)).filter(Boolean),
  );
  if (!ids.size && !pairKeys.size && !portHint) return;

  const facility = getFacilityCablePayload();
  if (!facility?.equipments) return;

  for (const raw of facility.equipments) {
    if (!Array.isArray(raw.equipmentConnectivities)) continue;
    raw.equipmentConnectivities = raw.equipmentConnectivities.filter((r) => {
      if (r.id != null && ids.has(String(r.id))) return false;
      const key = connectivityRecordPairKey(r);
      if (key && pairKeys.has(key)) return false;
      if (portHint?.crossLink && recordMatchesCrossLink(r, portHint.crossLink)) return false;
      if (portHint && recordTouchesEquipPort(
        r,
        portHint.eqId,
        portHint.side,
        portHint.slot,
        portHint.code,
      )) return false;
      return true;
    });
  }
}

function rebuildEquipmentPortMapsFromFacility() {
  const facility = getFacilityCablePayload();
  if (!facility?.equipments) return;

  for (const raw of facility.equipments) {
    const eq = State.equipment.find((e) => String(e.id) === String(raw.id));
    if (!eq) continue;
    const enriched = inferEquipmentTypeFromFacilityItem(raw);
    const records = (enriched.equipmentConnectivities || [])
      .map((rec) => normalizeFacilityConnectivityRecord(rec, enriched))
      .filter(Boolean);
    const portMap = isInFdmsEquipment(eq) || isOutFdmsEquipment(eq)
      ? buildFdmsEquipmentPortMap(eq, records)
      : buildEquipmentPortMap(eq.id, records);
    portMap._fetched = true;
    portMap.rawRecords = records;
    State.equipmentConnectivity[eq.id] = portMap;
  }
}

function rebuildConnectivityDerivedState() {
  mergeInboundConnectivity();
  enrichFdmsPortMapsFromConnectivity();
  inferInternalPassthroughLinks();
  rebuildConnectivityRecordIndex();
  buildApiCableConnections();
  refreshFdmsColumnPortsOnEquipment();
  syncTotalPortsFromFdms();
}

function patchStateEquipmentConnectivity(eqId, rec) {
  const key = String(eqId);
  const eq = findEquipmentById(eqId);
  if (!State.equipmentConnectivity[key]) {
    State.equipmentConnectivity[key] = {
      in: {}, out: {}, links: [], crossLinks: [], count: 0, rawRecords: [],
    };
  }
  const pc = State.equipmentConnectivity[key];
  pc.rawRecords = pc.rawRecords || [];
  const rid = rec.id != null ? String(rec.id) : '';
  if (rid && pc.rawRecords.some((r) => String(r.id) === rid)) return;

  const owner = eq || { id: eqId, name: '', type: '' };
  const normalized = normalizeFacilityConnectivityRecord(
    { ...rec, sourceEquipment: rec.sourceEquipment || _equipmentStubForRecord(owner) },
    owner,
  );
  if (!normalized) return;

  pc.rawRecords.push(normalized);
}

/**
 * After DELETE — drop rows from siteInfo cache and rebuild port maps so equipment detail
 * stays in sync with the diagram (dialog must show Free immediately after remove).
 */
function applyConnectivityRemoveFromState(apiRecords, portHint = null) {
  const list = (Array.isArray(apiRecords) ? apiRecords : [apiRecords]).filter(Boolean);
  if (!list.length && !portHint) return;

  if (portHint) {
    if (portHint.crossLink) rememberRemovedCrossLink(portHint.crossLink);
    rememberRemovedEquipPort(portHint);
  }

  unpatchFacilityEquipmentConnectivity(list, portHint);
  rebuildEquipmentPortMapsFromFacility();
  applyPendingEquipPortClears();
  if (portHint) purgeStateConnectivityForEquipPort(portHint);
  applyPendingCrossLinkRemovals();
  rebuildConnectivityDerivedState();
  if (portHint) {
    clearEquipPortCellMaps(portHint.eqId, portHint.side, portHint.slot, portHint.code);
    markEquipPortCleared(portHint);
  }
  scheduleDiagramLinesRedraw();
}

/** DELETE → optimistic cache strip, API refresh, then strip again (stale GET may lag) */
async function finalizeConnectivityAfterDelete(apiRecords, portHint = null, onSynced = null) {
  applyConnectivityRemoveFromState(apiRecords, portHint);
  if (typeof onSynced === 'function') onSynced();

  const facilityId = resolveFacilityIdForRefresh();
  if (facilityId) {
    await refreshFacilityCableViewFromApi(facilityId);
  } else {
    await reloadEquipmentConnectivity({ bustCache: true });
  }

  applyConnectivityRemoveFromState(apiRecords, portHint);
  if (typeof onSynced === 'function') onSynced();
  scheduleDiagramLinesRedraw();
}

/**
 * Merge a just-created hop into siteInfo + State so diagram updates without re-fetch.
 * reloadEquipmentConnectivity() alone would wipe this — siteInfo is not auto-refreshed.
 */
function applyConnectivitySaveToState(bodies, connectState, apiHops = []) {
  (bodies || []).forEach((body, i) => {
    const rec = buildConnectivityRecordFromHop(body, connectState, apiHops[i]);
    patchFacilityEquipmentConnectivity(body.sourceEquipmentId, rec);
    patchFacilityEquipmentConnectivity(body.targetEquipmentId, rec);
    patchStateEquipmentConnectivity(body.sourceEquipmentId, rec);
  });

  rebuildEquipmentPortMapsFromFacility();
  rebuildConnectivityDerivedState();
}

/** Re-render diagram columns + SVG lines (main + fullscreen when open). */
function reloadCableDiagramFromConnectivity() {
  if (!renderDomReady()) return;
  Render.all();
  if (typeof App !== 'undefined' && App._fsOpen) {
    Render.diagramInto('d-in-fs', 'd-eq-fs', 'd-out-fs');
  }
  if (typeof App !== 'undefined' && App._syncDiagramScrollExtent) {
    const wrapId = App._fsOpen ? 'diag-wrap-fs' : 'diag-wrap';
    requestAnimationFrame(() => App._syncDiagramScrollExtent(wrapId));
  }
  scheduleDiagramLinesRedraw();
}

/**
 * POST save → optimistic merge, facility GET refresh, re-merge if GET lags, reload diagram.
 */
async function finalizeConnectivityAfterSave(bodies, connectState, apiHops = [], opts = {}) {
  applyConnectivitySaveToState(bodies, connectState, apiHops);

  const facilityId = resolveFacilityIdForRefresh();
  Render.setDiagramConnectivityLoader(true);
  try {
    if (facilityId) {
      try {
        await refreshFacilityCableViewFromApi(facilityId);
      } catch (refreshErr) {
        console.warn('[Cable view] Facility refresh after save:', refreshErr);
      }
    }
    applyConnectivitySaveToState(bodies, connectState, apiHops);
    if (typeof opts.onBeforeReload === 'function') opts.onBeforeReload();
  } finally {
    Render.setDiagramConnectivityLoader(false);
  }

  reloadCableDiagramFromConnectivity();
}

/** Resolve Fiberneo port UUID from equipment model + port code (prefers portType when duplicate codes) */
function findApiPortIdOnEquipment(eq, portCode, preferredType) {
  const want = _trimStr(portCode);
  if (!eq || !want) return null;

  const fromList = (eq.api_ports || []).filter((p) => _portCode(p) === want);
  if (fromList.length === 1 && fromList[0].id != null) return String(fromList[0].id);
  if (fromList.length > 1 && preferredType) {
    const pref = String(preferredType).toUpperCase();
    const hit = fromList.find((p) => (p.portType || '').toUpperCase() === pref);
    if (hit?.id != null) return String(hit.id);
  }
  if (fromList[0]?.id != null) return String(fromList[0].id);

  for (const row of eq.fdms_column_ports || []) {
    if (_trimStr(row.code) === want && row.apiPortId) return String(row.apiPortId);
  }

  const sideOrder = preferredType
    ? [String(preferredType).toLowerCase() === 'out' ? 'out' : 'in', 'in', 'out']
    : ['in', 'out'];
  for (const side of sideOrder) {
    const map = eq.ports_by_slot?.[side] || {};
    for (const row of Object.values(map)) {
      if (_portCode(row) === want && row.id != null) return String(row.id);
    }
  }

  return null;
}

function resolveEquipmentApiPortId(eqId, side, portRef) {
  const eq = findEquipmentById(eqId);
  if (!eq || portRef == null) return null;

  const refStr = String(portRef).trim();
  if (!refStr) return null;

  const byCode = findApiPortIdOnEquipment(eq, refStr, null);
  if (byCode) return byCode;

  const sideKey = side === 'OUT' || side === 'out' ? 'out' : (side === 'IN' || side === 'in' ? 'in' : null);
  if (sideKey) {
    const slot = parseInt(refStr.replace(/\D/g, ''), 10);
    if (Number.isFinite(slot)) {
      const fromSlot = eq.ports_by_slot?.[sideKey]?.[slot];
      if (fromSlot?.id != null) return String(fromSlot.id);
      const code = eqPortDisplayLabel(eq, sideKey, slot);
      const hit = findApiPortIdOnEquipment(eq, code, null);
      if (hit) return hit;
    }
  }

  return null;
}

function resolveFdmsPortApiId(side, portKey) {
  const eq = side === 'in' ? findInFdmsEquipment() : findOutFdmsEquipment();
  if (!eq || !portKey) return null;

  const preferType = side === 'in' ? 'IN' : 'OUT';
  const labelFn    = side === 'in' ? fdmsInLabelFromPortKey : fdmsOutLabelFromPortKey;
  const code       = labelFn(portKey);

  let id = findApiPortIdOnEquipment(eq, code, preferType)
    || findApiPortIdOnEquipment(eq, code, null);
  if (id) return id;

  const slot = fdmsSlotFromPortKey(portKey);
  if (slot) {
    const row = (eq.fdms_column_ports || []).find((p) => p.slot === slot)
      || eq.fdms_column_ports?.[slot - 1];
    if (row?.apiPortId) return String(row.apiPortId);

    const altCodes = [
      `Port-${slot}`,
      `P1-${slot}`,
      `P2-${slot}`,
      useFdmsPortFallbacks() ? PORT_LABELS[slot - 1] : null,
    ].filter(Boolean);
    for (const alt of altCodes) {
      id = findApiPortIdOnEquipment(eq, alt, preferType)
        || findApiPortIdOnEquipment(eq, alt, null);
      if (id) return id;
    }

    const fromSlot = eq.ports_by_slot?.[side]?.[slot];
    if (fromSlot?.id != null) return String(fromSlot.id);
  }

  return null;
}

function resolveInFdmsPortApiId(portKey) {
  return resolveFdmsPortApiId('in', portKey);
}

function resolveOutFdmsPortApiId(portKey) {
  return resolveFdmsPortApiId('out', portKey);
}

/** Wizard mode from explicit mode or hop fields (save must not default to in-hop) */
function resolveConnectWizardMode(cs) {
  if (!cs || typeof cs !== 'object') return 'in-hop';
  const m = cs.mode;
  const hasOutSource = !!(cs.eqId || cs.eqName)
    && !!(cs.eqOutPort || cs.eqOutCode);
  const hasOutDest = !!cs.dstPort;
  const hasEqLink = cs.dstEqId && (cs.eqOutPort || cs.eqOutCode);
  const hasInSource = cs.srcPort && cs.eqId && (cs.eqInPort || cs.eqInCode);

  if (hasEqLink && (cs.eqInPort || cs.eqInCode)) return 'eq-hop';
  if (m === 'eq-to-in-fdms' && cs.srcPort && cs.eqId
    && (cs.eqOutPort || cs.eqOutCode || cs.eqInPort || cs.eqInCode)) return 'eq-to-in-fdms';
  if (m === 'direct-fdms' && cs.srcPort && cs.dstPort) return 'direct-fdms';
  if (m === 'fdms-out-to-in' && cs.srcPort && cs.dstPort) return 'fdms-out-to-in';
  if (cs.srcPort && cs.dstPort && !cs.eqId && !cs.eqInPort && !cs.eqOutPort && !cs.dstEqId) {
    return m === 'fdms-out-to-in' ? 'fdms-out-to-in' : 'direct-fdms';
  }
  if (hasInSource) return 'in-hop';
  if (hasOutSource && hasOutDest) return 'out-hop';
  if (m === 'eq-hop' && hasEqLink) return 'eq-hop';
  if (m === 'in-hop' && (hasInSource || (cs.eqInPort || cs.eqInCode))) return 'in-hop';
  if (m === 'out-hop' && hasOutSource && hasOutDest) return 'out-hop';
  if (cs.eqOutPort || cs.eqOutCode) {
    return cs.dstEqId ? 'eq-hop' : (hasOutDest ? 'out-hop' : (hasInSource ? 'in-hop' : 'out-hop'));
  }
  return 'in-hop';
}

/** Resolve center equipment id from display name */
function resolveCenterEquipmentIdByName(name) {
  const want = _trimStr(name);
  if (!want) return null;
  const low = want.toLowerCase();
  const hit = State.equipment.filter(isDiagramCenterEquipment).find((e) => {
    const n = _trimStr(e.name);
    return n === want || n.toLowerCase() === low;
  });
  return hit ? String(hit.id) : null;
}

/**
 * Build ONE POST /equipment-connectivity body per save (incremental hops).
 *   in-hop  — IN-FDMS → center equipment IN
 *   out-hop — center equipment OUT → OUT-FDMS
 *   direct-fdms — IN-FDMS → OUT-FDMS (no equipment)
 *   fdms-out-to-in — OUT-FDMS → IN-FDMS (no equipment)
 */
function buildConnectHopsFromWizard(connectState) {
  const { srcPort, dstPort, eqId, eqInPort, eqOutPort, dstEqId } = connectState;
  const mode = resolveConnectWizardMode(connectState);
  const base = { ...FIBERNEO_CONNECTIVITY_DEFAULTS };

  if (mode === 'fdms-out-to-in') {
    const inFdms = findInFdmsEquipment();
    const outFdms = findOutFdmsEquipment();
    if (!inFdms) throw new Error('IN-FDMS equipment not found on this site');
    if (!outFdms) throw new Error('OUT-FDMS equipment not found on this site');
    if (!srcPort) throw new Error('IN-FDMS port is required');
    if (!dstPort) throw new Error('OUT-FDMS port is required');

    const outPortId = resolveOutFdmsPortApiId(dstPort);
    const inPortId = resolveInFdmsPortApiId(srcPort);
    if (!outPortId) {
      throw new Error(`OUT-FDMS port id not found for ${fdmsOutLabelFromPortKey(dstPort)}`);
    }
    if (!inPortId) {
      throw new Error(`IN-FDMS port id not found for ${fdmsInLabelFromPortKey(srcPort)}`);
    }

    return [buildConnectivityPayload({
      ...base,
      sourceEquipmentId: String(outFdms.id),
      sourcePortId      : outPortId,
      targetEquipmentId : String(inFdms.id),
      targetPortId      : inPortId,
    })];
  }

  if (mode === 'direct-fdms') {
    const inFdms = findInFdmsEquipment();
    const outFdms = findOutFdmsEquipment();
    if (!inFdms) throw new Error('IN-FDMS equipment not found on this site');
    if (!outFdms) throw new Error('OUT-FDMS equipment not found on this site');
    if (!srcPort) throw new Error('IN-FDMS port is required');
    if (!dstPort) throw new Error('OUT-FDMS port is required');

    const srcPortId = resolveInFdmsPortApiId(srcPort);
    const dstPortId = resolveOutFdmsPortApiId(dstPort);
    if (!srcPortId) {
      throw new Error(`IN-FDMS port id not found for ${fdmsInLabelFromPortKey(srcPort)}`);
    }
    if (!dstPortId) {
      throw new Error(`OUT-FDMS port id not found for ${fdmsOutLabelFromPortKey(dstPort)}`);
    }

    return [buildConnectivityPayload({
      ...base,
      sourceEquipmentId: String(inFdms.id),
      sourcePortId      : srcPortId,
      targetEquipmentId : String(outFdms.id),
      targetPortId      : dstPortId,
    })];
  }

  if (mode === 'eq-to-in-fdms') {
    const inFdms = findInFdmsEquipment();
    if (!inFdms) throw new Error('IN-FDMS equipment not found on this site');
    const eq = findEquipmentById(eqId);
    if (!eq) throw new Error('Equipment not found — pick the port again');
    if (!srcPort) throw new Error('IN-FDMS port is required');

    const srcSide = connectState.eqOutPortSide || connectState.eqPortSide || 'out';
    const portRef = connectState.eqOutCode || connectState.eqOutPort
      || connectState.eqInCode || connectState.eqInPort;
    if (!portRef) throw new Error('Equipment port is required');

    const eqPortId = resolveCenterEquipmentPortApiId(
      eq.id, srcSide, portRef, connectState.eqOutCode || connectState.eqInCode, connectState.eqPortApiId,
    );
    if (!eqPortId) throw new Error(`Equipment port id not found (${portRef})`);

    const inFdmsPortId = resolveInFdmsPortApiId(srcPort);
    if (!inFdmsPortId) {
      throw new Error(`IN-FDMS port id not found for ${fdmsInLabelFromPortKey(srcPort)}`);
    }

    return [buildConnectivityPayload({
      ...base,
      sourceEquipmentId: String(eq.id),
      sourcePortId      : eqPortId,
      targetEquipmentId : String(inFdms.id),
      targetPortId      : inFdmsPortId,
    })];
  }

  if (mode === 'eq-hop') {
    const srcEq = findEquipmentById(eqId);
    const tgtEq = findEquipmentById(dstEqId);
    const outPortRef = connectState.eqOutCode || eqOutPort;
    const inPortRef = connectState.eqInCode || eqInPort;
    const srcSide = connectState.eqOutPortSide || connectState.eqPortSide || 'out';
    const tgtSide = connectState.eqTargetPortSide || connectState.eqInPortSide || 'in';
    if (!srcEq) throw new Error('Source equipment not found — pick the port again');
    if (!tgtEq) throw new Error('Target equipment not found — pick the port again');
    if (String(srcEq.id) === String(tgtEq.id)) {
      throw new Error('Source and target equipment must be different');
    }
    if (!outPortRef) throw new Error('Source equipment port is required');
    if (!inPortRef) throw new Error('Target equipment port is required');

    const srcOutPortId = resolveCenterEquipmentPortApiId(
      srcEq.id, srcSide, outPortRef, connectState.eqOutCode, connectState.eqPortApiId,
    );
    if (!srcOutPortId) throw new Error('Source equipment port id not found');
    const tgtInPortId = resolveCenterEquipmentPortApiId(
      tgtEq.id, tgtSide, inPortRef, connectState.eqInCode, connectState.eqTargetPortApiId,
    );
    if (!tgtInPortId) throw new Error(`Target equipment port id not found (${inPortRef})`);

    return [buildConnectivityPayload({
      ...base,
      sourceEquipmentId: String(srcEq.id),
      sourcePortId      : srcOutPortId,
      targetEquipmentId : String(tgtEq.id),
      targetPortId      : tgtInPortId,
    })];
  }

  if (mode === 'out-hop') {
    const outFdms = findOutFdmsEquipment();
    if (!outFdms) throw new Error('OUT-FDMS equipment not found on this site');
    const eq = findEquipmentById(eqId);
    if (!eq) throw new Error('Equipment not found — pick the port again');
    if (!dstPort) throw new Error('OUT-FDMS port is required');

    const srcSide = connectState.eqOutPortSide || connectState.eqPortSide || 'out';
    const outRefs = [
      connectState.eqOutCode,
      eqOutPort,
      connectState.eqInCode,
      eqInPort,
      connectState.eqOutCode ? null : eqOutPort,
    ].filter(Boolean);
    if (!outRefs.length) throw new Error('Equipment port is required');

    const dstPortId = resolveOutFdmsPortApiId(dstPort);
    if (!dstPortId) {
      throw new Error(`OUT-FDMS port id not found for ${fdmsOutLabelFromPortKey(dstPort)}`);
    }
    let srcOutPortId = connectState.eqPortApiId || null;
    if (!srcOutPortId) {
      for (const ref of outRefs) {
        srcOutPortId = resolveCenterEquipmentPortApiId(
          eq.id, srcSide, ref, connectState.eqOutCode || connectState.eqInCode, connectState.eqPortApiId,
        );
        if (srcOutPortId) break;
        srcOutPortId = resolveCenterEquipmentPortApiId(
          eq.id, null, ref, connectState.eqOutCode || connectState.eqInCode, connectState.eqPortApiId,
        );
        if (srcOutPortId) break;
      }
    }
    if (!srcOutPortId) {
      throw new Error(`Source equipment port id not found (${outRefs[0]})`);
    }

    return [buildConnectivityPayload({
      ...base,
      sourceEquipmentId: String(eq.id),
      sourcePortId      : srcOutPortId,
      targetEquipmentId : String(outFdms.id),
      targetPortId      : dstPortId,
    })];
  }

  /* in-hop — IN-FDMS → equipment port (any side) */
  const inFdms = findInFdmsEquipment();
  if (!inFdms) throw new Error('IN-FDMS equipment not found on this site');
  if (!srcPort) throw new Error('IN-FDMS port is required');

  const eq = findEquipmentById(eqId);
  const tgtSide = connectState.eqPortSide || connectState.eqInPortSide || 'in';
  const inPortRef = connectState.eqInCode || eqInPort;
  if (!eq) throw new Error('Equipment not found — pick the equipment port again');
  if (!inPortRef) throw new Error('Equipment port is required');

  const srcPortId = resolveInFdmsPortApiId(srcPort);
  if (!srcPortId) {
    throw new Error(`IN-FDMS port id not found for ${fdmsInLabelFromPortKey(srcPort)}`);
  }
    let tgtPortId = resolveCenterEquipmentPortApiId(
      eq.id, tgtSide, inPortRef, connectState.eqInCode, connectState.eqPortApiId,
    );
    if (!tgtPortId) {
      tgtPortId = resolveCenterEquipmentPortApiId(
        eq.id, null, inPortRef, connectState.eqInCode, connectState.eqPortApiId,
      );
    }
  if (!tgtPortId) {
    throw new Error(`Target equipment port id not found (${inPortRef})`);
  }

  return [buildConnectivityPayload({
    ...base,
    sourceEquipmentId: String(inFdms.id),
    sourcePortId      : srcPortId,
    targetEquipmentId : String(eq.id),
    targetPortId      : tgtPortId,
  })];
}

/** Port UUID from connectivity row (id on port, or resolve via equipment + code) */
function resolvePortApiIdFromRecord(port, eqId) {
  if (!port) return null;
  if (port.id != null) return String(port.id);
  if (port.portId != null) return String(port.portId);

  const eq = findEquipmentById(eqId);
  const code = _portCode(port);
  const portType = (port.portType || '').toUpperCase() || null;
  if (eq && code) return findApiPortIdOnEquipment(eq, code, portType);
  return null;
}

/**
 * DELETE /equipment-connectivity expects:
 * { sourceEquipmentId, sourcePortId, targetEquipmentId, targetPortId }
 * (not the full GET row with nested equipment/port objects).
 */
function buildDeleteConnectivityPayload(rec, fallbackSourceEqId) {
  if (!rec) throw new Error('Missing connectivity record');

  const indexed = State.connectivityRecordIndex?.find(
    (row) => row.raw === rec || (rec.id != null && row.id === String(rec.id)),
  );

  const sourceEquipmentId = rec.sourceEquipment?.id != null
    ? String(rec.sourceEquipment.id)
    : (indexed?.sourceEquipmentId
      || (fallbackSourceEqId != null ? String(fallbackSourceEqId) : null));

  const targetEquipmentId = rec.targetEquipment?.id != null
    ? String(rec.targetEquipment.id)
    : (indexed?.targetEquipmentId || null);

  const sourcePortId = resolvePortApiIdFromRecord(rec.sourcePort, sourceEquipmentId)
    || indexed?.sourcePortId
    || null;
  const targetPortId = resolvePortApiIdFromRecord(rec.targetPort, targetEquipmentId)
    || indexed?.targetPortId
    || null;

  if (!sourceEquipmentId || !sourcePortId || !targetEquipmentId || !targetPortId) {
    throw new Error(
      'Cannot build delete payload — missing equipment or port ids for this connection',
    );
  }

  return {
    sourceEquipmentId,
    sourcePortId,
    targetEquipmentId,
    targetPortId,
  };
}

/** All raw API rows to remove for a diagram connection (may be multiple hops) */
function collectDeleteConnectivityRecords(conn) {
  const seen = new Set();
  const out  = [];

  const pushRaw = (rec) => {
    if (!rec) return;
    const key = rec.id != null ? String(rec.id) : JSON.stringify(rec);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(rec);
  };

  (conn.apiRecords || []).forEach(pushRaw);

  (conn.recordIds || []).forEach((rid) => {
    const row = State.connectivityRecordIndex.find(r => r.id === String(rid));
    if (row?.raw) pushRaw(row.raw);
  });

  findRecordsForDiagramConnection(conn).forEach((row) => pushRaw(row.raw));

  if (conn.linkRole === 'eq-out-to-fdms' && conn.equipment_id && conn.eq_out_code) {
    const eqId = String(conn.equipment_id);
    const outCode = _trimStr(conn.eq_out_code);
    State.connectivityRecordIndex
      .filter((row) => String(row.sourceEquipmentId) === eqId
        && _portCode(row.sourcePort) === outCode
        && (row.sourcePort?.portType || '').toUpperCase() === 'OUT')
      .forEach((row) => pushRaw(row.raw));
  }

  if (conn.src_fdms_code && conn.dst_fdms_code && conn.equipment_id && conn.dst) {
    const outFdms = findOutFdmsEquipment();
    if (outFdms) {
      State.connectivityRecordIndex
        .filter((row) => String(row.sourceEquipmentId) === String(conn.equipment_id)
          && String(row.targetEquipmentId) === String(outFdms.id)
          && _portCode(row.targetPort) === conn.dst_fdms_code)
        .forEach((row) => pushRaw(row.raw));
    }
  }

  if ((conn.linkRole === 'direct-fdms' || conn.linkRole === 'fdms-out-to-in')
    && !conn.equipment_id) {
    const inCode = _trimStr(conn.src_fdms_code)
      || fdmsInLabelFromPortKey(conn.src);
    const outCode = _trimStr(conn.dst_fdms_code)
      || fdmsOutLabelFromPortKey(conn.dst);
    collectDeleteRecordsForDirectFdms(inCode, outCode, null).forEach(pushRaw);
  }

  return out;
}

/** Loose port code / slot match for DELETE lookup (label vs API code) */
function portCodesMatchForDelete(eqId, sideKey, wantCode, wantIndex, apiPort) {
  const apiCode = _portCode(apiPort);
  const want = _trimStr(wantCode);
  const sideType = sideKey === 'in' ? 'IN' : 'OUT';
  if (want && apiCode === want) return true;
  if (want && apiCode) {
    const wantSlot = findEqPortSlotByCode(eqId, want, sideType);
    const apiSlot = findEqPortSlotByCode(eqId, apiCode, sideType);
    if (wantSlot != null && apiSlot != null && Number(wantSlot) === Number(apiSlot)) return true;
  }
  if (wantIndex != null && apiCode) {
    const apiSlot = findEqPortSlotByCode(eqId, apiCode, sideType);
    if (apiSlot != null && Number(apiSlot) === Number(wantIndex)) return true;
  }
  return false;
}

function crossLinkMatchesRecordLoose(lk, rec) {
  if (!lk || !rec) return false;
  if (recordMatchesCrossLink(rec, lk)) return true;

  const srcId = rec.sourceEquipment?.id != null ? String(rec.sourceEquipment.id) : null;
  const tgtId = rec.targetEquipment?.id != null ? String(rec.targetEquipment.id) : null;
  if (srcId !== String(lk.fromEqId) || tgtId !== String(lk.toEqId)) return false;

  const fromSide = lk.fromSide === 'in' ? 'in' : 'out';
  const toSide = lk.toSide === 'in' ? 'in' : 'out';
  if (lk.fromCode && !portCodesMatchForDelete(lk.fromEqId, fromSide, lk.fromCode, lk.fromIndex, rec.sourcePort)) {
    return false;
  }
  if (lk.toCode && !portCodesMatchForDelete(lk.toEqId, toSide, lk.toCode, lk.toIndex, rec.targetPort)) {
    return false;
  }
  return true;
}

/** Build DELETE body from diagram cross-link when cached API row is missing */
function buildSyntheticDeleteRecordFromCrossLink(lk) {
  if (!lk) return null;

  const fromEqId = String(lk.fromEqId);
  const toEqId = String(lk.toEqId);
  const fromEq = findEquipmentById(fromEqId);
  const toEq = findEquipmentById(toEqId);
  if (!fromEq || !toEq) return null;

  const fromSideKey = lk.fromSide === 'in' ? 'in' : 'out';
  const toSideKey = lk.toSide === 'in' ? 'in' : 'out';
  const fromType = fromSideKey === 'in' ? 'IN' : 'OUT';
  const toType = toSideKey === 'in' ? 'IN' : 'OUT';
  const fromCode = _trimStr(lk.fromCode)
    || eqPortDisplayLabel(fromEq, fromSideKey, lk.fromIndex)
    || (lk.fromIndex != null ? `${fromSideKey}${lk.fromIndex}` : '');
  const toCode = _trimStr(lk.toCode)
    || eqPortDisplayLabel(toEq, toSideKey, lk.toIndex)
    || (lk.toIndex != null ? `${toSideKey}${lk.toIndex}` : '');

  const sourcePortId = resolveEquipmentApiPortId(fromEqId, fromType, fromCode)
    || (lk.fromIndex != null ? resolveEquipmentApiPortId(fromEqId, fromType, `${fromSideKey}${lk.fromIndex}`) : null);
  const targetPortId = resolveEquipmentApiPortId(toEqId, toType, toCode)
    || (lk.toIndex != null ? resolveEquipmentApiPortId(toEqId, toType, `${toSideKey}${lk.toIndex}`) : null);

  if (!sourcePortId || !targetPortId) return null;

  return {
    sourceEquipment: { id: fromEqId },
    targetEquipment: { id: toEqId },
    sourcePort: { portType: fromType, code: fromCode, id: sourcePortId },
    targetPort: { portType: toType, code: toCode, id: targetPortId },
  };
}

function buildPortHintFromCrossLink(lk) {
  if (!lk) return null;
  if (lk.toSide === 'in') {
    const eq = findEquipmentById(lk.toEqId);
    const slot = lk.toIndex != null
      ? Number(lk.toIndex)
      : (findEqPortSlotByCode(lk.toEqId, lk.toCode, 'IN') || 1);
    const code = _trimStr(lk.toCode) || (eq ? eqPortDisplayLabel(eq, 'in', slot) : '');
    return { eqId: String(lk.toEqId), side: 'in', slot, code, crossLink: lk };
  }
  if (lk.fromSide === 'out') {
    const eq = findEquipmentById(lk.fromEqId);
    const slot = lk.fromIndex != null
      ? Number(lk.fromIndex)
      : (findEqPortSlotByCode(lk.fromEqId, lk.fromCode, 'OUT') || 1);
    const code = _trimStr(lk.fromCode) || (eq ? eqPortDisplayLabel(eq, 'out', slot) : '');
    return { eqId: String(lk.fromEqId), side: 'out', slot, code, crossLink: lk };
  }
  return {
    eqId: String(lk.fromEqId),
    side: lk.fromSide === 'in' ? 'in' : 'out',
    slot: lk.fromIndex != null ? Number(lk.fromIndex) : 1,
    code: lk.fromCode || '',
    crossLink: lk,
  };
}

/** API rows for equipment OUT → equipment IN (eq-hop) cross-link */
function collectDeleteRecordsForCrossLink(lk) {
  if (!lk) return [];
  const seen = new Set();
  const out = [];
  const pushRaw = (rec) => {
    if (!rec) return;
    const key = rec.id != null ? String(rec.id) : JSON.stringify(rec);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(rec);
  };

  const fromEqId = String(lk.fromEqId);
  const toEqId = String(lk.toEqId);
  const fromCode = _trimStr(lk.fromCode);
  const toCode = _trimStr(lk.toCode);
  const fromType = lk.fromSide === 'in' ? 'IN' : 'OUT';
  const toType = lk.toSide === 'in' ? 'IN' : 'OUT';

  State.connectivityRecordIndex.forEach((row) => {
    if (String(row.sourceEquipmentId) !== fromEqId) return;
    if (String(row.targetEquipmentId) !== toEqId) return;
    const st = (row.sourcePort?.portType || '').toUpperCase();
    const tt = (row.targetPort?.portType || '').toUpperCase();
    if (st && st !== fromType) return;
    if (tt && tt !== toType) return;
    if (fromCode && !portCodesMatchForDelete(fromEqId, lk.fromSide, fromCode, lk.fromIndex, row.sourcePort)) return;
    if (toCode && !portCodesMatchForDelete(toEqId, lk.toSide, toCode, lk.toIndex, row.targetPort)) return;
    pushRaw(row.raw);
  });

  for (const eq of State.equipment) {
    for (const rec of getEqPortConnectivity(eq.id).rawRecords || []) {
      if (crossLinkMatchesRecordLoose(lk, rec)) pushRaw(rec);
    }
  }

  if (!out.length) {
    const synthetic = buildSyntheticDeleteRecordFromCrossLink(lk);
    if (synthetic) pushRaw(synthetic);
  }

  return out;
}

/** API rows for IN-FDMS ↔ OUT-FDMS direct (either direction) */
function collectDeleteRecordsForDirectFdms(inCode, outCode, lk) {
  const inFdms = findInFdmsEquipment();
  const outFdms = findOutFdmsEquipment();
  const wantIn = _trimStr(inCode);
  const wantOut = _trimStr(outCode);
  if (!inFdms || !outFdms || !wantIn || !wantOut) return [];

  const seen = new Set();
  const out = [];
  const pushRaw = (rec) => {
    if (!rec) return;
    const key = rec.id != null ? String(rec.id) : JSON.stringify(rec);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(rec);
  };

  const matchRow = (row, srcEqId, tgtEqId, srcCode, tgtCode) => (
    String(row.sourceEquipmentId) === String(srcEqId)
    && String(row.targetEquipmentId) === String(tgtEqId)
    && _portCode(row.sourcePort) === srcCode
    && _portCode(row.targetPort) === tgtCode
  );

  State.connectivityRecordIndex.forEach((row) => {
    if (matchRow(row, inFdms.id, outFdms.id, wantIn, wantOut)
      || matchRow(row, outFdms.id, inFdms.id, wantOut, wantIn)) {
      pushRaw(row.raw);
    }
  });

  if (lk) {
    for (const eq of State.equipment) {
      for (const rec of getEqPortConnectivity(eq.id).rawRecords || []) {
        if (crossLinkMatchesRecordLoose(lk, rec)) pushRaw(rec);
      }
    }
    if (!out.length) {
      const synthetic = buildSyntheticDeleteRecordFromCrossLink(lk);
      if (synthetic) pushRaw(synthetic);
    }
  }

  return out;
}

/** API rows for equipment OUT → OUT-FDMS leg only (does not remove IN-FDMS path) */
function collectDeleteEqOutToOutFdmsRecords(fromEqId, fromOutCode, toOutFdmsCode) {
  const wantSrc = _trimStr(fromOutCode);
  const wantDst = _trimStr(toOutFdmsCode);
  const outFdms = findOutFdmsEquipment();
  if (!outFdms || !wantSrc || !wantDst) return [];

  const seen = new Set();
  const out = [];
  State.connectivityRecordIndex.forEach((row) => {
    if (String(row.sourceEquipmentId) !== String(fromEqId)) return;
    if (String(row.targetEquipmentId) !== String(outFdms.id)) return;
    if ((row.sourcePort?.portType || '').toUpperCase() !== 'OUT') return;
    if ((row.targetPort?.portType || '').toUpperCase() !== 'OUT') return;
    if (_portCode(row.sourcePort) !== wantSrc) return;
    if (_portCode(row.targetPort) !== wantDst) return;
    const key = row.id != null ? String(row.id) : JSON.stringify(row.raw);
    if (seen.has(key)) return;
    seen.add(key);
    if (row.raw) out.push(row.raw);
  });
  return out;
}

/** Parse API port code / portNumber → 1-based index */
function portIndexFromApi(port, maxPorts) {
  const max = maxPorts || 8;
  const n = Number(port?.portNumber);
  if (Number.isFinite(n) && n >= 1 && n <= max) return n;

  const code = _trimStr(port?.code);
  const pm = code.match(/^P(\d+)-(\d+)$/i);
  if (pm) {
    const a = parseInt(pm[1], 10);
    const b = parseInt(pm[2], 10);
    if (a >= 1 && a <= max) return a;
    if (b >= 1 && b <= max) return b;
  }
  const tail = code.match(/(\d+)$/);
  if (tail) {
    const v = parseInt(tail[1], 10);
    if (v >= 1 && v <= max) return v;
  }
  return null;
}

/** Sort API port rows and build 1-based index → code maps for diagram slots */
function buildPortLabelMapsFromApi(item) {
  const maxIn  = Math.max(0, Number(item?.noInPorts ?? item?.no_in_ports) || 0);
  const maxOut = Math.max(0, Number(item?.noOutPorts ?? item?.no_out_ports) || 0);
  const inLabels  = {};
  const outLabels = {};
  const inPorts   = {};
  const outPorts  = {};

  const list = portsFromEquipmentSearchItem(item);
  const sortBySlot = (arr, max) => [...arr].sort((a, b) => {
    const ia = portIndexFromApi(a, max) ?? 999;
    const ib = portIndexFromApi(b, max) ?? 999;
    if (ia !== ib) return ia - ib;
    return String(a.code || '').localeCompare(String(b.code || ''));
  });

  const assignPort = (p, side, slot) => {
    const code = _trimStr(p.code);
    if (!code && !useEquipmentPortFallbacks()) return false;
    const labels = side === 'out' ? outLabels : inLabels;
    const ports = side === 'out' ? outPorts : inPorts;
    let s = slot;
    while (labels[s]) s += 1;
    labels[s] = code || `${side === 'out' ? 'OUT' : 'IN'} ${s}`;
    ports[s] = p;
    return true;
  };

  const assigned = new WeakSet();
  const markAssigned = (p) => { if (p) assigned.add(p); };

  sortBySlot(
    list.filter((p) => (p.portType || '').toUpperCase() === 'IN'),
    maxIn || 999,
  ).forEach((p, idx) => {
    if (assignPort(p, 'in', portIndexFromApi(p, maxIn || 999) || idx + 1)) markAssigned(p);
  });

  sortBySlot(
    list.filter((p) => (p.portType || '').toUpperCase() === 'OUT'),
    maxOut || 999,
  ).forEach((p, idx) => {
    if (assignPort(p, 'out', portIndexFromApi(p, maxOut || 999) || idx + 1)) markAssigned(p);
  });

  // Any port not yet mapped (missing/other type) — still show in UI; ignore portType
  sortBySlot(
    list.filter((p) => !assigned.has(p)),
    Math.max(maxIn, maxOut, list.length, 1),
  ).forEach((p, idx) => {
    const preferOut = maxOut > 0 && idx >= maxIn;
    assignPort(p, preferOut ? 'out' : 'in', idx + 1);
    markAssigned(p);
  });

  if (useEquipmentPortFallbacks()) {
    for (let i = 1; i <= maxIn; i++) {
      if (!inLabels[i]) inLabels[i] = `IN ${i}`;
    }
    for (let i = 1; i <= maxOut; i++) {
      if (!outLabels[i]) outLabels[i] = `OUT ${i}`;
    }
  }

  return { in: inLabels, out: outLabels, inPorts, outPorts };
}

/** Center-column equipment ports for one side (from API ports[] only on live sites) */
function getCenterEquipmentPortSlots(eq, side) {
  if (!eq) return [];
  const labels = eq.port_labels?.[side] || {};
  const slots = sortedPortSlotNumbers(labels);
  if (slots.length) {
    return slots.map((slot) => ({
      slot,
      label: labels[slot],
      code : labels[slot],
    }));
  }
  if (useEquipmentPortFallbacks()) {
    const max = side === 'in' ? (eq.in_ports || 0) : (eq.out_ports || 0);
    const rows = [];
    for (let i = 1; i <= max; i++) {
      const label = eqPortDisplayLabel(eq, side, i);
      rows.push({ slot: i, label, code: label });
    }
    return rows;
  }
  return [];
}

/** All center equipment ports — every API port row (IN + OUT, same code allowed) */
function getAllCenterEquipmentPortSlots(eq) {
  if (!eq) return [];
  const rows = [];
  const seen = new Set();

  const pushRow = (side, slot, label, code, portId) => {
    const portCode = _trimStr(code) || _trimStr(label);
    const key = portId ? String(portId) : `${side}:${slot}`;
    if (seen.has(key)) return;
    if (!portCode && !portId) return;
    seen.add(key);
    rows.push({
      slot,
      label: label || portCode,
      code : portCode,
      side,
      portRef: `${side}${slot}`,
      portId : portId != null ? String(portId) : null,
    });
  };

  for (const side of ['in', 'out']) {
    getCenterEquipmentPortSlots(eq, side).forEach(({ slot, label, code }) => {
      const apiRow = eq.ports_by_slot?.[side]?.[slot];
      pushRow(side, slot, label, code, apiRow?.id);
    });
  }

  for (const p of eq.api_ports || []) {
    const portId = p.id != null ? String(p.id) : null;
    if (portId && seen.has(portId)) continue;
    const side = (p.portType || '').toUpperCase() === 'OUT' ? 'out' : 'in';
    const slot = portIndexFromApi(p, 999);
    if (!slot || slot < 1) continue;
    const code = _portCode(p);
    pushRow(side, slot, code, code, portId);
  }

  return rows.sort(
    (a, b) => compareFdmsPortCodes(a.label, b.label) || a.side.localeCompare(b.side) || a.slot - b.slot,
  );
}

/** Picker/detail label — disambiguate when the same port code exists on IN and OUT */
function equipmentPortPickerLabel(slots, row) {
  const code = _trimStr(row?.label);
  if (!code) return row?.label || '';
  const dup = slots.some((r) => r !== row && _trimStr(r.label) === code);
  return dup ? `${code} · ${String(row.side || '').toUpperCase()}` : code;
}

function findCenterEquipmentPortRow(eq, { portApiId, side, slot } = {}) {
  if (!eq) return null;
  const rows = getAllCenterEquipmentPortSlots(eq);
  if (portApiId) {
    const hit = rows.find((x) => x.portId === String(portApiId));
    if (hit) return hit;
  }
  if (side && slot) {
    return rows.find((x) => x.side === side && x.slot === slot) || null;
  }
  return null;
}

function eqSlotFromPortRef(eqId, side, portRef, portCode) {
  const eq = findEquipmentById(eqId);
  const code = _trimStr(portCode);
  if (eq && code) {
    for (const row of getAllCenterEquipmentPortSlots(eq)) {
      if (row.code === code && (!side || row.side === side)) return row.slot;
    }
  }
  if (side === 'out') return eqOutSlotFromPortRef(eqId, portRef, portCode);
  return eqInSlotFromPortRef(eqId, portRef, portCode);
}

function resolveCenterEquipmentPortApiId(eqId, side, portRef, portCode, portApiId) {
  if (portApiId != null && String(portApiId).trim()) return String(portApiId).trim();
  const ref = _trimStr(portCode) || _trimStr(portRef);
  if (!ref) return null;
  const eq = findEquipmentById(eqId);
  if (!eq) return null;
  const sideKey = side === 'OUT' || side === 'out' ? 'out' : (side === 'IN' || side === 'in' ? 'in' : null);
  const byCode = findApiPortIdOnEquipment(eq, ref, sideKey);
  if (byCode) return byCode;
  if (sideKey) {
    return resolveEquipmentApiPortId(eqId, sideKey, ref);
  }
  return resolveEquipmentApiPortId(eqId, null, ref);
}

/** IN-FDMS links landing on any equipment port (by slot + side) */
function countInFdmsLinksToEqPort(eqId, side, slot) {
  const eq = findEquipmentById(eqId);
  const code = eq ? eqPortDisplayLabel(eq, side, slot) : null;
  const portRef = `${side}${slot}`;
  return State.connections.filter((c) => {
    if (!isInFdmsToEqInConnection(c)) return false;
    if (String(c.equipment_id) !== String(eqId)) return false;
    if (c.eq_in_port && String(c.eq_in_port).toLowerCase() === portRef) return true;
    if (c.eq_out_port && String(c.eq_out_port).toLowerCase() === portRef) return true;
    if (code && (_trimStr(c.eq_in_code) === code || _trimStr(c.eq_out_code) === code)) return true;
    return false;
  }).length;
}

function eqPortInFdmsLinkCapacity(eqId, side, slot) {
  const eq = findEquipmentById(eqId);
  const max = maxInFdmsLinksPerEqInPort(eq);
  const current = Number.isFinite(slot) ? countInFdmsLinksToEqPort(eqId, side, slot) : 0;
  return { eq, max, current, allowed: current < max };
}

/** OUT-FDMS links leaving any equipment port (IN or OUT side) */
function countLinksFromEqPortToOutFdms(eqId, side, slot) {
  const eq = findEquipmentById(eqId);
  const code = eq ? eqPortDisplayLabel(eq, side, slot) : null;
  const portRef = `${side}${slot}`;
  const matches = (c) => {
    if (String(c.equipment_id) !== String(eqId)) return false;
    if (!c.dst && c.linkRole !== 'eq-out-to-fdms') return false;
    const srcSide = connectionEquipSourceSide(c);
    if (srcSide === side) {
      const ref = connectionEquipSourcePortRef(c);
      if (ref && String(ref).toLowerCase() === portRef) return true;
    }
    if (code && _trimStr(connectionEquipSourceCode(c)) === code) return true;
    return false;
  };
  const seen = new Set();
  let n = 0;
  State.connections.forEach((c) => {
    if (!matches(c)) return;
    const key = c.dst || c.dst_fdms_code || c.id || JSON.stringify(c);
    if (seen.has(key)) return;
    seen.add(key);
    n += 1;
  });
  return n;
}

function eqPortOutFdmsLinkCapacity(eqId, side, slot) {
  const eq = findEquipmentById(eqId);
  const max = maxOutFdmsLinksPerEqOutPort(eq);
  const current = Number.isFinite(slot) ? countLinksFromEqPortToOutFdms(eqId, side, slot) : 0;
  return { eq, max, current, allowed: current < max };
}

/** Monotonic priority so a just-saved port beats older API modifiedTime values */
let _diagramPortPrioritySeq = Date.now();

function _eqWizardPortSlot(portRef) {
  if (!portRef) return null;
  const m = String(portRef).match(/^(in|out)(\d+)$/i);
  return m ? Number(m[2]) : null;
}

/** After port-to-port save: show these equipment IN/OUT slots on the diagram first */
function noteDiagramLatestEquipmentPorts(eqId, eqInPort, eqOutPort) {
  if (!eqId) return;
  const key = String(eqId);
  const entry = State.diagramLatestEqPorts[key] || { in: {}, out: {} };

  const bump = (side, slot) => {
    if (!slot || slot < 1) return;
    _diagramPortPrioritySeq += 1;
    entry[side][slot] = _diagramPortPrioritySeq;
  };

  bump('in', _eqWizardPortSlot(eqInPort));
  bump('out', _eqWizardPortSlot(eqOutPort));
  State.diagramLatestEqPorts[key] = entry;
}

function _diagramLatestPortBoost(eqId) {
  return State.diagramLatestEqPorts?.[String(eqId)] || null;
}

function _connectivityRecordTime(rec) {
  return Number(rec?.modifiedTime ?? rec?.createdTime ?? 0) || 0;
}

/** Latest activity timestamp per 1-based IN/OUT slot (from equipment-connectivity rows) */
function _centerPortLatestActivity(eq) {
  const eqId = String(eq.id);
  const labelIn = Object.keys(eq.port_labels?.in || {}).map(Number).filter((n) => n >= 1);
  const labelOut = Object.keys(eq.port_labels?.out || {}).map(Number).filter((n) => n >= 1);
  const maxIn = Math.max(eq.in_ports || 0, labelIn.length ? Math.max(...labelIn) : 0, 8);
  const maxOut = Math.max(eq.out_ports || 0, labelOut.length ? Math.max(...labelOut) : 0, 8);

  const inT = {};
  const outT = {};
  const bump = (side, slot, t) => {
    if (!slot || slot < 1 || !t) return;
    const m = side === 'in' ? inT : outT;
    m[slot] = Math.max(m[slot] || 0, t);
  };

  const resolveSlot = (port, side) => {
    const code = _portCode(port);
    if (!code) return null;
    const max = side === 'in' ? maxIn : maxOut;
    return centerEquipmentPortSlot(eq, port, side)
      || equipPortSlotForCode(eq, code, side)
      || portIndexFromApi(port, max);
  };

  const records = getEqPortConnectivity(eqId).rawRecords || [];
  const n = records.length;
  records.forEach((rec, idx) => {
    const explicit = _connectivityRecordTime(rec);
    const t = explicit > 0 ? explicit : n - idx;

    const srcEqId = rec.sourceEquipment?.id != null
      ? String(rec.sourceEquipment.id)
      : eqId;
    const tgtEqId = rec.targetEquipment?.id != null
      ? String(rec.targetEquipment.id)
      : null;

    if (srcEqId === eqId && rec.sourcePort) {
      const st = (rec.sourcePort.portType || '').toUpperCase();
      if (st === 'IN') bump('in', resolveSlot(rec.sourcePort, 'in'), t);
      if (st === 'OUT') bump('out', resolveSlot(rec.sourcePort, 'out'), t);
    }
    if (tgtEqId === eqId && rec.targetPort) {
      const tt = (rec.targetPort.portType || '').toUpperCase();
      if (tt === 'IN') bump('in', resolveSlot(rec.targetPort, 'in'), t);
      if (tt === 'OUT') bump('out', resolveSlot(rec.targetPort, 'out'), t);
    }
  });

  const boost = _diagramLatestPortBoost(eqId);
  if (boost) {
    for (const [slot, t] of Object.entries(boost.in || {})) {
      bump('in', Number(slot), t);
    }
    for (const [slot, t] of Object.entries(boost.out || {})) {
      bump('out', Number(slot), t);
    }
  }

  return { in: inT, out: outT };
}

/**
 * Diagram-only port list: all connected IN or OUT ports for center equipment.
 * Sorted newest-first; unconnected physical ports are hidden on the diagram.
 * Equipment list, connect wizard, and port-detail sheets use getCenterEquipmentPortSlots().
 */
function getDiagramEquipmentPortSlots(eq, side) {
  const all = getCenterEquipmentPortSlots(eq, side);
  const activity = _centerPortLatestActivity(eq);
  const timeMap = side === 'in' ? activity.in : activity.out;
  const rowBySlot = new Map(all.map((row) => [row.slot, row]));
  const connected = [];
  const seenSlot = new Set();

  const addIfConnected = (slot) => {
    if (!slot || slot < 1 || seenSlot.has(slot)) return;
    if (!diagramEqPortCell(eq, side, slot)?.connected) return;
    seenSlot.add(slot);
    const base = rowBySlot.get(slot) || {
      slot,
      label: eqPortDisplayLabel(eq, side, slot),
      code : eqPortDisplayLabel(eq, side, slot),
    };
    connected.push({ ...base, _t: timeMap[slot] || 0 });
  };

  for (const row of all) addIfConnected(row.slot);

  const pc = getEqPortConnectivity(eq.id);
  const portMap = side === 'in' ? pc.in : pc.out;
  for (const slotStr of Object.keys(portMap)) addIfConnected(Number(slotStr));

  connected.sort((a, b) => b._t - a._t || compareFdmsPortCodes(a.label, b.label) || a.slot - b.slot);

  return connected.map(({ slot, label, code }) => ({ slot, label, code }));
}

/** Display label for equipment port slot (API code or fallback IN n / OUT n) */
function eqPortDisplayLabel(eq, side, index) {
  const slot = Number(index);
  const labels = eq?.port_labels;
  if (labels?.[side]?.[slot]) return labels[side][slot];
  const p = eq?.ports_by_slot?.[side]?.[slot];
  if (p && _trimStr(p.code)) return _trimStr(p.code);
  if (!useEquipmentPortFallbacks()) return '';
  const prefix = side === 'in' ? 'IN' : 'OUT';
  return `${prefix} ${slot}`;
}

/** Parse port ref (in3 / out2) → side */
function eqPortSideFromRef(portRef, fallbackSide = 'out') {
  const m = String(portRef || '').match(/^(in|out)(\d+)$/i);
  if (m) return m[1].toLowerCase();
  return fallbackSide || 'out';
}

/** Which equipment port side sources an equipment → OUT-FDMS hop */
function connectionEquipSourceSide(conn) {
  if (!conn) return 'out';
  if (conn.eq_source_side) return conn.eq_source_side;
  if (conn.eqOutPortSide) return conn.eqOutPortSide;
  if (conn.eq_out_port) return eqPortSideFromRef(conn.eq_out_port, 'out');
  return 'out';
}

function connectionEquipSourcePortRef(conn) {
  return conn?.eq_out_port || conn?.eq_in_port || null;
}

function connectionEquipSourceCode(conn) {
  return conn?.eq_out_code || conn?.eq_in_code || null;
}

/**
 * Build IN/OUT port maps from equipment-connectivity API records.
 * GET by-source-equipment/{eqId} → source is eqId; payload may be:
 *   (a) sourceEquipment + sourcePort + targetEquipment + targetPort
 *   (b) targetEquipment + targetPort only (source implied by URL)
 */
/** IN/OUT-FDMS: connectivity rows are sourcePort.code → targetEquipment.targetPort.code */
function buildFdmsEquipmentPortMap(eq, records) {
  const ownerId = String(eq.id);
  const isInFdms = isInFdmsEquipment(eq);
  const crossLinks = [];
  const inMap  = {};
  const outMap = {};

  for (const rec of records || []) {
    const srcCode = _portCode(rec.sourcePort);
    const tgtEq   = rec.targetEquipment;
    const tgtCode = _portCode(rec.targetPort);
    const tgtType = (rec.targetPort?.portType || '').toUpperCase();
    if (!srcCode || !tgtEq?.id || !tgtCode) continue;

    const tgtId = String(tgtEq.id);
    const center = findEquipmentById(tgtId);
    const isCenter = center && isDiagramCenterEquipment(center);
    const isOutFdmsTgt = isOutFdmsEquipment(tgtEq);
    const isInFdmsTgt = isInFdmsEquipment(tgtEq);
    if (!isCenter && !isOutFdmsTgt && !isInFdmsTgt) continue;

    const strandColor = rec.strand?.color || null;
    const tgtName = isOutFdmsTgt
      ? shortEquipName(tgtEq)
      : (isInFdmsTgt ? shortEquipName(tgtEq) : shortEquipName(center));
    const srcType = (rec.sourcePort?.portType || '').toUpperCase();
    const fdmsSide = srcType === 'OUT' ? 'out' : 'in';
    const fdmsSlot = equipPortSlotForCode(eq, srcCode, fdmsSide);
    const portLabel = `→ ${tgtName} (${tgtCode})`;
    const portEntry = {
      connected: true,
      label: portLabel,
      strandColor,
      code: srcCode,
      targetEqId: tgtId,
      targetPortCode: tgtCode,
    };
    if (fdmsSlot) {
      if (fdmsSide === 'in') inMap[fdmsSlot] = portEntry;
      else outMap[fdmsSlot] = portEntry;
    }

    if (isInFdms) {
      if (isOutFdmsTgt) {
        crossLinks.push({
          fromEqId: ownerId,
          fromSide: 'fdms',
          fromIndex: fdmsSlot || 0,
          fromCode: srcCode,
          toEqId: tgtId,
          toSide: 'out',
          toIndex: equipPortSlotForCode(tgtEq, tgtCode, 'out')
            || portIndexFromApi(rec.targetPort, getFdmsColumnRows('out').length) || 1,
          toCode: tgtCode,
          strandColor: rec.strand?.color || null,
          recordId: rec.id,
        });
      } else if (tgtType === 'IN') {
        crossLinks.push({
          fromEqId: ownerId,
          fromSide: 'fdms',
          fromIndex: 0,
          fromCode: srcCode,
          toEqId: tgtId,
          toSide: 'in',
          toIndex: findEqPortSlotByCode(tgtId, tgtCode, 'IN') || 1,
          toCode: tgtCode,
          strandColor: rec.strand?.color || null,
          recordId: rec.id,
        });
      } else if (tgtType === 'OUT') {
        /* e.g. IN-FDMS Port-1 (OUT) → EQUIPMENT-15 P1-1306 (OUT) — second API row */
        crossLinks.push({
          fromEqId: ownerId,
          fromSide: 'fdms',
          fromIndex: 0,
          fromCode: srcCode,
          toEqId: tgtId,
          toSide: 'out',
          toIndex: findEqPortSlotByCode(tgtId, tgtCode, 'OUT') || 1,
          toCode: tgtCode,
          strandColor: rec.strand?.color || null,
          recordId: rec.id,
        });
      }
    }

    if (isOutFdmsEquipment(eq) && isInFdmsTgt) {
      const tgtSlot = equipPortSlotForCode(tgtEq, tgtCode, 'in')
        || portIndexFromApi(rec.targetPort, getFdmsColumnRows('in').length) || 1;
      if (fdmsSlot) outMap[fdmsSlot] = portEntry;
      crossLinks.push({
        fromEqId: ownerId,
        fromSide: 'fdms-out',
        fromIndex: fdmsSlot || 0,
        fromCode: srcCode,
        toEqId: tgtId,
        toSide: 'fdms',
        toIndex: tgtSlot,
        toCode: tgtCode,
        strandColor: rec.strand?.color || null,
        recordId: rec.id,
      });
    }

    if (isOutFdmsEquipment(eq) && tgtType === 'IN' && isCenter) {
      crossLinks.push({
        fromEqId: ownerId,
        fromSide: 'fdms-out',
        fromIndex: 0,
        fromCode: srcCode,
        toEqId: tgtId,
        toSide: 'in',
        toIndex: findEqPortSlotByCode(tgtId, tgtCode, 'IN') || 1,
        toCode: tgtCode,
        strandColor: rec.strand?.color || null,
        recordId: rec.id,
      });
    }
  }

  return {
    in: inMap,
    out: outMap,
    links: [],
    crossLinks,
    count: (records || []).length,
    rawRecords: records || [],
  };
}

/** FDMS ports that are targets of center/other equipment (inbound edges) */
function enrichFdmsPortMapsFromConnectivity() {
  State.equipment.forEach((eq) => {
    if (!isInFdmsEquipment(eq) && !isOutFdmsEquipment(eq)) return;
    const key = String(eq.id);
    if (!State.equipmentConnectivity[key]) {
      State.equipmentConnectivity[key] = {
        in: {}, out: {}, links: [], crossLinks: [], count: 0, rawRecords: [],
      };
    }
    const pc = State.equipmentConnectivity[key];

    for (const e of collectConnectivityEdges()) {
      if (String(e.toEqId) !== key) continue;
      const side = e.toType === 'IN' ? 'in' : 'out';
      const slot = equipPortSlotForCode(eq, e.toCode, side);
      if (!slot) continue;

      const fromEq = findEquipmentById(e.fromEqId);
      const label = `← ${shortEquipName(fromEq)} (${e.fromCode})`;
      const map = side === 'in' ? pc.in : pc.out;
      map[slot] = {
        connected: true,
        label,
        strandColor: e.strandColor,
        code: e.toCode,
        sourceEqId: e.fromEqId,
        sourcePortCode: e.fromCode,
      };
    }
  });
}

/**
 * Diagram / wizard slot for center equipment (matches port_labels index, not raw portNumber).
 * e.g. Lalitpur-router "tap" stays on the same slot the user picked in the connect wizard.
 */
function centerEquipmentPortSlot(eq, port, side) {
  if (!eq || !port) return null;
  const sideKey = side === 'in' ? 'in' : 'out';
  const code = _portCode(port);

  if (code && eq.port_labels?.[sideKey]) {
    for (const [slotStr, label] of Object.entries(eq.port_labels[sideKey])) {
      if (_trimStr(label) === code) return Number(slotStr);
    }
  }

  const bySlot = eq.ports_by_slot?.[sideKey];
  if (bySlot) {
    if (port.id) {
      for (const [slotStr, row] of Object.entries(bySlot)) {
        if (row?.id === port.id) return Number(slotStr);
      }
    }
    if (code) {
      for (const [slotStr, row] of Object.entries(bySlot)) {
        if (_portCode(row) === code) return Number(slotStr);
      }
    }
  }

  const labelSlots = Object.keys(eq.port_labels?.[sideKey] || {})
    .map(Number)
    .filter((n) => n >= 1);
  const max = side === 'in'
    ? Math.max(eq.in_ports || 0, labelSlots.length ? Math.max(...labelSlots) : 0, 8)
    : Math.max(eq.out_ports || 0, labelSlots.length ? Math.max(...labelSlots) : 0, 8);
  const idx = portIndexFromApi(port, max);
  return idx && idx >= 1 ? idx : null;
}

function slotOnCenterEq(eq, port, side, seqFallback) {
  const hit = centerEquipmentPortSlot(eq, port, side);
  if (hit) return hit;
  return seqFallback ? seqFallback() : null;
}

function slotOnEquipment(eqOrId, port, side, seqFallback) {
  const eq = typeof eqOrId === 'object' ? eqOrId : findEquipmentById(eqOrId);
  if (eq && isDiagramCenterEquipment(eq)) {
    return slotOnCenterEq(eq, port, side, seqFallback);
  }
  const max = eq
    ? (side === 'in' ? (eq.in_ports || 8) : (eq.out_ports || 8))
    : 8;
  return portIndexFromApi(port, max) || (seqFallback ? seqFallback() : null);
}

/** Connectivity cell for diagram port box (label slot may differ from API portNumber index) */
function diagramEqPortCell(eq, side, slot) {
  const pc = getEqPortConnectivity(eq.id);
  const portMap = side === 'in' ? pc.in : pc.out;
  if (portMap[slot]?.connected) return portMap[slot];

  const code = eqPortDisplayLabel(eq, side, slot);
  if (!code) return portMap[slot];

  for (const [s, cell] of Object.entries(portMap)) {
    if (!cell?.connected) continue;
    if (cell.code === code) return cell;
    if (cell.label && cell.label.includes(`(${code})`)) return cell;
  }

  const altSlot = equipPortSlotForCode(eq, code, side);
  if (altSlot && portMap[altSlot]?.connected) return portMap[altSlot];
  return portMap[slot];
}

/** Find rendered diagram port by label code (data-eq-in-code / data-eq-out-code) */
function findDiagramEqPortElByCode(eqId, sideKey, wantCode, eqPfx) {
  const code = _trimStr(wantCode);
  if (!code) return null;
  const card = document.getElementById(`${eqPfx}__${eqId}`);
  if (!card) return null;
  const codeAttr = sideKey === 'in' ? 'data-eq-in-code' : 'data-eq-out-code';
  for (const el of card.querySelectorAll('.d-eq-port')) {
    if (_trimStr(el.getAttribute(codeAttr)) !== code) continue;
    if (_trimStr(el.getAttribute('data-eq-side')) !== sideKey) continue;
    return el;
  }
  return null;
}

/** Diagram DOM node for a center-equipment port (matches getDiagramEquipmentPortSlots ids) */
function findDiagramEqPortEl(eqId, side, opts = {}) {
  const eq = findEquipmentById(eqId);
  if (!eq) return null;
  const sideKey = (side === 'IN' || side === 'in') ? 'in' : 'out';
  const eqPfx = opts.eqPfx || 'd-eq';
  const wantCode = _trimStr(opts.code);

  if (wantCode) {
    const byAttr = findDiagramEqPortElByCode(eqId, sideKey, wantCode, eqPfx);
    if (byAttr) return byAttr;

    for (const row of getDiagramEquipmentPortSlots(eq, sideKey)) {
      if (_trimStr(row.code) === wantCode || _trimStr(row.label) === wantCode) {
        const el = findDiagramEqPortElByCode(eqId, sideKey, row.label, eqPfx)
          || findDiagramEqPortElByCode(eqId, sideKey, row.code, eqPfx)
          || document.getElementById(`${eqPfx}__${eqId}__${sideKey}${row.slot}`);
        if (el) return el;
      }
    }
    const resolved = equipPortSlotForCode(eq, wantCode, sideKey);
    if (resolved) {
      const el = document.getElementById(`${eqPfx}__${eqId}__${sideKey}${resolved}`);
      if (el) return el;
    }
  }

  const idx = Number(opts.slot);
  if (Number.isFinite(idx) && idx >= 1) {
    const card = document.getElementById(`${eqPfx}__${eqId}`);
    if (card) {
      const bySlot = card.querySelector(
        `.d-eq-port[data-eq-side="${sideKey}"][data-eq-slot="${idx}"]`,
      );
      if (bySlot) return bySlot;
    }
    return document.getElementById(`${eqPfx}__${eqId}__${sideKey}${idx}`);
  }
  return null;
}

function isDiagramEqExpanded(eqId) {
  return State.diagramExpandedEqIds?.has(String(eqId)) ?? false;
}

function syncDiagramEqExpandInDom(eqId) {
  const key = String(eqId);
  const expanded = isDiagramEqExpanded(key);
  document.querySelectorAll('.d-eq[data-eq-id]').forEach((el) => {
    if (String(el.getAttribute('data-eq-id')) !== key) return;
    el.classList.toggle('d-eq-expanded', expanded);
    const btn = el.querySelector('.d-eq-expand-btn');
    if (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.title = expanded ? 'Collapse' : 'Expand';
      btn.setAttribute('aria-label', expanded ? 'Collapse' : 'Expand');
      btn.textContent = expanded ? '▴' : '⤢';
    }
    if (!expanded) {
      el.querySelectorAll('.d-eq-ports').forEach((row) => { row.scrollTop = 0; });
    }
  });
}

function toggleDiagramEqExpanded(eqId) {
  const key = String(eqId);
  if (!key) return;
  if (!State.diagramExpandedEqIds) State.diagramExpandedEqIds = new Set();
  if (State.diagramExpandedEqIds.has(key)) State.diagramExpandedEqIds.delete(key);
  else State.diagramExpandedEqIds.add(key);
  syncDiagramEqExpandInDom(key);
  scheduleDiagramLinesRedraw();
  if (typeof App !== 'undefined' && App._syncDiagramScrollExtent) {
    requestAnimationFrame(() => {
      App._syncDiagramScrollExtent(App._fsOpen ? 'diag-wrap-fs' : 'diag-wrap');
    });
  }
}

/** True when port box intersects the equipment vertical scroll viewport */
function isDiagramEqPortVisibleInScroll(portEl) {
  if (!portEl) return false;
  if (portEl.closest('.d-eq')?.classList.contains('d-eq-expanded')) return true;
  const scrollEl = portEl.closest('.d-eq-ports');
  if (!scrollEl) return true;
  const portRect = portEl.getBoundingClientRect();
  const scrollRect = scrollEl.getBoundingClientRect();
  const m = 1;
  return portRect.bottom > scrollRect.top + m && portRect.top < scrollRect.bottom - m;
}

/**
 * Line anchor for equipment port.
 * Visible port → direct edge; scrolled-away port → IN/OUT box edge at clamped Y.
 */
function diagramEqPortLinePoint(portEl, edge, mapCtx) {
  const rect = portEl.getBoundingClientRect();
  const scrollEl = portEl.closest('.d-eq-ports');
  const sectionEl = portEl.closest('.d-eq-ports-section') || portEl.closest('.d-eq');
  const portCenterY = rect.top + rect.height / 2;
  let x;
  let y = portCenterY;

  if (isDiagramEqPortVisibleInScroll(portEl)) {
    x = edge === 'right' ? rect.right : rect.left;
  } else if (sectionEl && scrollEl) {
    const boxRect = sectionEl.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    x = edge === 'right' ? boxRect.right : boxRect.left;
    y = Math.max(scrollRect.top + 6, Math.min(portCenterY, scrollRect.bottom - 6));
  } else {
    x = edge === 'right' ? rect.right : rect.left;
  }

  const { cRect, scrollLeft, scrollTop } = mapCtx;
  return {
    x: x - cRect.left + scrollLeft,
    y: y - cRect.top + scrollTop,
  };
}

/** Anchor for eq→eq vertical link on port button edge (scroll-aware) */
function diagramEqPortVerticalAnchor(portEl, end, mapCtx) {
  const rect = portEl.getBoundingClientRect();
  const scrollEl = portEl.closest('.d-eq-ports');
  const x = rect.left + Math.min(4, Math.max(2, rect.width * 0.15));
  let y = end === 'source' ? rect.bottom : rect.top;

  if (scrollEl && !isDiagramEqPortVisibleInScroll(portEl)) {
    const scrollRect = scrollEl.getBoundingClientRect();
    const portMid = rect.top + rect.height / 2;
    if (end === 'target') {
      if (portMid < scrollRect.top) y = scrollRect.top + 1;
      else if (portMid > scrollRect.bottom) y = scrollRect.bottom - 1;
    } else if (portMid > scrollRect.bottom) {
      y = scrollRect.bottom - 1;
    } else if (portMid < scrollRect.top) {
      y = scrollRect.top + Math.min(rect.height, scrollRect.height - 2);
    }
  }

  const { cRect, scrollLeft, scrollTop } = mapCtx;
  return {
    x: x - cRect.left + scrollLeft,
    y: y - cRect.top + scrollTop,
  };
}

/** Vertical line between stacked center equipment (OUT port → IN port below/above) */
function diagramEqToEqVerticalPoints(fromOutEl, toInEl, mapCtx) {
  const a1 = diagramEqPortVerticalAnchor(fromOutEl, 'source', mapCtx);
  const a2 = diagramEqPortVerticalAnchor(toInEl, 'target', mapCtx);
  return { x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y };
}

function bindDiagramEqPortsScroll(wrap, redrawFn) {
  if (!wrap || typeof redrawFn !== 'function') return;
  let rafId = 0;
  const queueRedraw = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      redrawFn();
    });
  };
  wrap.querySelectorAll('.d-eq-ports').forEach((row) => {
    if (row._eqPortScrollFn) row.removeEventListener('scroll', row._eqPortScrollFn);
    row._eqPortScrollFn = queueRedraw;
    row.addEventListener('scroll', queueRedraw, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      row._eqPortResizeObs?.disconnect();
      const ro = new ResizeObserver(queueRedraw);
      ro.observe(row);
      row._eqPortResizeObs = ro;
    }
  });
  queueRedraw();
  requestAnimationFrame(() => requestAnimationFrame(queueRedraw));
}

/** Redraw diagram lines after layout / connectivity settles (default visible lines). */
function scheduleDiagramLinesRedraw(opts = {}) {
  const isFs = opts.fullscreen || false;
  const draw = () => {
    if (!isFs && typeof App !== 'undefined' && App._syncDiagramScrollExtent) {
      App._syncDiagramScrollExtent('diag-wrap');
    }
    if (isFs) Render.drawLinesIn('diag-wrap-fs', 'd-in-fs', 'd-eq-fs', 'd-out-fs');
    else Render.drawLines();
  };
  draw();
  requestAnimationFrame(() => requestAnimationFrame(draw));
  setTimeout(draw, 60);
  setTimeout(draw, 200);
  setTimeout(draw, 450);
}

/** Optimistic diagram hints right after a successful connect save */
function applyDiagramPortHintsAfterSave(connectState) {
  const { eqId, eqInPort, eqOutPort, srcPort, dstPort, mode } = connectState;
  const eq = findEquipmentById(eqId);
  if (!eq) return;

  const inSlot = _eqWizardPortSlot(eqInPort);
  const outHopSide = connectState.eqOutPortSide || eqPortSideFromRef(eqOutPort, 'out');
  const outHopSlot = _eqWizardPortSlot(eqOutPort);
  const outSlot = mode === 'out-hop' && outHopSide === 'in' ? null : outHopSlot;
  const outHopInSlot = mode === 'out-hop' && outHopSide === 'in' ? outHopSlot : null;
  if (!inSlot && !outSlot && !outHopInSlot) return;

  let pc = State.equipmentConnectivity[String(eqId)];
  if (!pc) {
    pc = { in: {}, out: {}, links: [], crossLinks: [], count: 0, rawRecords: [] };
    State.equipmentConnectivity[String(eqId)] = pc;
  }

  const inFdms = findInFdmsEquipment();
  const outFdms = findOutFdmsEquipment();
  const srcLbl = fdmsInLabelFromPortKey(srcPort);
  const dstLbl = fdmsOutLabelFromPortKey(dstPort);
  const fdmsOutLabel = outFdms
    ? `→ ${shortEquipName(outFdms)} (${dstLbl})`
    : `→ ${dstLbl}`;

  if (inSlot) {
    const inCode = eqPortDisplayLabel(eq, 'in', inSlot);
    pc.in[inSlot] = {
      connected: true,
      label: inFdms
        ? `← ${shortEquipName(inFdms)} (${srcLbl})`
        : `← ${srcLbl}`,
      code: inCode,
    };
  }
  if (outHopInSlot) {
    const portCode = eqPortDisplayLabel(eq, 'in', outHopInSlot);
    pc.in[outHopInSlot] = {
      connected: true,
      label: fdmsOutLabel,
      code: portCode,
    };
  }
  if (outSlot) {
    const outCode = eqPortDisplayLabel(eq, 'out', outSlot);
    pc.out[outSlot] = {
      connected: true,
      label: outFdms
        ? `→ ${shortEquipName(outFdms)} (${dstLbl})`
        : `→ ${dstLbl}`,
      code: outCode,
    };
  }
  if (inSlot && outSlot) {
    pc.links = (pc.links || []).filter(
      (lk) => !(lk.in === inSlot && lk.out === outSlot),
    );
    pc.links.push({
      in: inSlot,
      out: outSlot,
      inCode: pc.in[inSlot]?.code || null,
      outCode: pc.out[outSlot]?.code || null,
    });
  }
}

function buildEquipmentPortMap(eqId, records) {
  const eq = State.equipment.find(e => String(e.id) === String(eqId));
  if (eq && (isInFdmsEquipment(eq) || isOutFdmsEquipment(eq))) {
    return buildFdmsEquipmentPortMap(eq, records);
  }

  const labelInSlots = Object.keys(eq?.port_labels?.in || {})
    .map(Number)
    .filter((n) => n >= 1);
  const labelOutSlots = Object.keys(eq?.port_labels?.out || {})
    .map(Number)
    .filter((n) => n >= 1);
  const maxIn  = Math.max(eq?.in_ports || 0, labelInSlots.length ? Math.max(...labelInSlots) : 0, 8);
  const maxOut = Math.max(eq?.out_ports || 0, labelOutSlots.length ? Math.max(...labelOutSlots) : 0, 8);
  const inMap  = {};
  const outMap = {};
  const links  = [];
  const crossLinks = [];
  let inSeq  = 1;
  let outSeq = 1;

  const addCrossLink = (fromEqId, fromSide, fromIndex, toEqId, toSide, toIndex, strandColor, codes = {}) => {
    crossLinks.push({
      fromEqId   : String(fromEqId),
      fromSide,
      fromIndex,
      toEqId     : String(toEqId),
      toSide,
      toIndex,
      strandColor,
      fromCode   : codes.fromCode || null,
      toCode     : codes.toCode || null,
    });
  };

  for (const rec of records || []) {
    const srcPort = rec.sourcePort;
    const tgtPort = rec.targetPort;
    const tgtEq   = rec.targetEquipment;
    const tgtEqId = tgtEq?.id;
    const srcEq   = rec.sourceEquipment;
    const srcEqIdExplicit = srcEq?.id != null ? String(srcEq.id) : null;

    /* Inbound row: this device is target (e.g. by-target-equipment API) */
    if (
      tgtEqId != null
      && String(tgtEqId) === String(eqId)
      && srcEqIdExplicit
      && srcEqIdExplicit !== String(eqId)
      && srcPort
      && tgtPort
    ) {
      const strandColor = rec.strand?.color || null;
      const srcType = (srcPort.portType || '').toUpperCase();
      const tgtType = (tgtPort.portType || '').toUpperCase();
      const srcName = shortEquipName(srcEq);
      const code = tgtPort.code ? ` (${tgtPort.code})` : '';
      const srcEqObj = findEquipmentById(srcEqIdExplicit);

      if (tgtType === 'IN' && srcType === 'OUT') {
        const tgtIdx = slotOnCenterEq(eq, tgtPort, 'in', () => inSeq++);
        const srcIdx = slotOnEquipment(srcEqObj, srcPort, 'out', () => 1) || 1;
        const inCode = _portCode(tgtPort);
        const outCode = _portCode(srcPort);
        inMap[tgtIdx] = { connected: true, label: `← ${srcName}${code}`, strandColor };
        addCrossLink(srcEqIdExplicit, 'out', srcIdx, eqId, 'in', tgtIdx, strandColor, {
          fromCode: outCode,
          toCode: inCode,
        });
      } else if (tgtType === 'OUT' && srcType === 'IN') {
        const tgtIdx = slotOnCenterEq(eq, tgtPort, 'out', () => outSeq++);
        const srcIdx = slotOnEquipment(srcEqObj, srcPort, 'in', () => 1) || 1;
        outMap[tgtIdx] = { connected: true, label: `← ${srcName}${code}`, strandColor };
        addCrossLink(srcEqIdExplicit, 'in', srcIdx, eqId, 'out', tgtIdx, strandColor);
      } else if (tgtType === 'IN') {
        const tgtIdx = slotOnCenterEq(eq, tgtPort, 'in', () => inSeq++);
        const inCode = _portCode(tgtPort);
        const srcIdx = srcPort && srcType === 'OUT'
          ? (slotOnEquipment(srcEqObj, srcPort, 'out', () => 1) || 1)
          : 1;
        inMap[tgtIdx] = { connected: true, label: `← ${srcName}${code}`, strandColor };
        if (srcEqIdExplicit && srcType === 'OUT') {
          addCrossLink(srcEqIdExplicit, 'out', srcIdx, eqId, 'in', tgtIdx, strandColor, {
            fromCode: _portCode(srcPort),
            toCode: inCode,
          });
        }
      }
      continue;
    }

    const srcEqId = srcEqIdExplicit != null ? srcEqIdExplicit : String(eqId);
    if (srcEqId !== String(eqId)) continue;

    if (!tgtPort) continue;

    const strandColor = rec.strand?.color || null;
    const tgtType = (tgtPort.portType || '').toUpperCase();
    const tgtName = shortEquipName(tgtEq);
    const code    = tgtPort.code ? ` (${tgtPort.code})` : '';

    if (srcPort) {
      const srcType = (srcPort.portType || '').toUpperCase();

      if (srcType === 'IN') {
        const srcIdx = slotOnCenterEq(eq, srcPort, 'in', () => inSeq++);

        if (String(tgtEqId) === String(eqId) && tgtType === 'OUT') {
          const tgtIdx = slotOnCenterEq(eq, tgtPort, 'out', () => outSeq++);
          const inCode  = _portCode(srcPort);
          const outCode = _portCode(tgtPort);
          links.push({ in: srcIdx, out: tgtIdx, inCode, outCode, strandColor });
          inMap[srcIdx]  = {
            connected: true,
            label: outCode ? `→ ${outCode}` : `→ OUT ${tgtIdx}`,
            strandColor,
            code: inCode,
          };
          outMap[tgtIdx] = {
            connected: true,
            label: inCode ? `← ${inCode}` : `← IN ${srcIdx}`,
            strandColor,
            code: outCode,
          };
        } else if (String(tgtEqId) !== String(eqId) && tgtType === 'IN') {
          const tgtCode = _portCode(tgtPort);
          inMap[srcIdx] = {
            connected: true,
            label: tgtCode ? `→ ${tgtName} (${tgtCode})` : `→ ${tgtName}${code}`,
            strandColor,
            code: _portCode(srcPort),
          };
          const tgtIdx = slotOnEquipment(tgtEqId, tgtPort, 'in', () => 1) || 1;
          addCrossLink(eqId, 'in', srcIdx, tgtEqId, 'in', tgtIdx, strandColor);
        } else if (isOutFdmsEquipment(tgtEq)) {
          const tgtCode = _portCode(tgtPort);
          const srcCode = _portCode(srcPort);
          inMap[srcIdx] = {
            connected: true,
            label: tgtCode ? `→ ${shortEquipName(tgtEq)} (${tgtCode})` : `→ ${tgtName}${code}`,
            strandColor,
            code: srcCode,
          };
          const tgtSlot = equipPortSlotForCode(tgtEq, tgtCode, 'out')
            || portIndexFromApi(tgtPort, getFdmsColumnRows('out').length) || 1;
          addCrossLink(eqId, 'in', srcIdx, tgtEqId, 'out', tgtSlot, strandColor, {
            fromCode: srcCode,
            toCode: tgtCode,
          });
        } else if (String(tgtEqId) !== String(eqId) && tgtType === 'OUT') {
          const tgtCode = _portCode(tgtPort);
          inMap[srcIdx] = {
            connected: true,
            label: tgtCode ? `← ${tgtName} (${tgtCode})` : `← ${tgtName}${code}`,
            strandColor,
            code: _portCode(srcPort),
          };
          const tgtIdx = slotOnEquipment(tgtEqId, tgtPort, 'out', () => 1) || 1;
          addCrossLink(tgtEqId, 'out', tgtIdx, eqId, 'in', srcIdx, strandColor);
        } else {
          inMap[srcIdx] = {
            connected: true,
            label: `→ ${tgtName}${code}`,
            strandColor,
            code: _portCode(srcPort),
          };
        }
      } else if (srcType === 'OUT') {
        const srcIdx = slotOnCenterEq(eq, srcPort, 'out', () => outSeq++);

        if (String(tgtEqId) === String(eqId) && tgtType === 'IN') {
          const tgtIdx = slotOnCenterEq(eq, tgtPort, 'in', () => inSeq++);
          links.push({ in: tgtIdx, out: srcIdx, strandColor });
          inMap[tgtIdx]  = { connected: true, label: `← OUT ${srcIdx}`, strandColor };
          outMap[srcIdx] = { connected: true, label: `→ IN ${tgtIdx}`, strandColor };
        } else if (String(tgtEqId) !== String(eqId) && tgtType === 'IN') {
          outMap[srcIdx] = { connected: true, label: `→ ${tgtName}${code}`, strandColor };
          const tgtIdx = slotOnEquipment(tgtEqId, tgtPort, 'in', () => 1) || 1;
          addCrossLink(eqId, 'out', srcIdx, tgtEqId, 'in', tgtIdx, strandColor, {
            fromCode: _portCode(srcPort),
            toCode: _portCode(tgtPort),
          });
        } else if (tgtEq) {
          const tgtCode = _portCode(tgtPort);
          const srcCode = _portCode(srcPort);
          outMap[srcIdx] = {
            connected: true,
            label: tgtCode ? `→ ${shortEquipName(tgtEq)} (${tgtCode})` : `→ ${tgtName}${code}`,
            strandColor,
            code: srcCode,
          };
          if (isOutFdmsEquipment(tgtEq)) {
            const tgtSlot = equipPortSlotForCode(tgtEq, tgtCode, 'out')
              || portIndexFromApi(tgtPort, getFdmsColumnRows('out').length) || 1;
            addCrossLink(eqId, 'out', srcIdx, tgtEqId, 'out', tgtSlot, strandColor, {
              fromCode: srcCode,
              toCode: tgtCode,
            });
          } else if (isDiagramCenterEquipment(tgtEq) && tgtType === 'IN') {
            const tgtSlot = findEqPortSlotByCode(tgtEqId, tgtCode, 'IN')
              || slotOnEquipment(tgtEqId, tgtPort, 'in', () => 1) || 1;
            addCrossLink(eqId, 'out', srcIdx, tgtEqId, 'in', tgtSlot, strandColor, {
              fromCode: srcCode,
              toCode: tgtCode,
            });
          } else if (isDiagramCenterEquipment(tgtEq) && tgtType === 'OUT') {
            const tgtSlot = findEqPortSlotByCode(tgtEqId, tgtCode, 'OUT') || 1;
            addCrossLink(eqId, 'out', srcIdx, tgtEqId, 'out', tgtSlot, strandColor, {
              fromCode: srcCode,
              toCode: tgtCode,
            });
          }
        }
      }
      continue;
    }

    /* Shape (b): by-source-equipment — only target side in JSON */
    if (String(tgtEqId) === String(eqId)) {
      if (tgtType === 'OUT') {
        const outIdx = slotOnCenterEq(eq, tgtPort, 'out', () => outSeq++);
        const inIdx = inSeq++;
        links.push({ in: inIdx, out: outIdx, strandColor });
        inMap[inIdx]  = { connected: true, label: `→ OUT ${outIdx}`, strandColor };
        outMap[outIdx] = { connected: true, label: `← IN ${inIdx}`, strandColor };
      } else if (tgtType === 'IN') {
        const inIdx = slotOnCenterEq(eq, tgtPort, 'in', () => inSeq++);
        const outIdx = Math.min(inIdx, maxOut);
        links.push({ in: inIdx, out: outIdx, strandColor, inferred: true });
        inMap[inIdx]  = { connected: true, label: `→ OUT ${outIdx}`, strandColor };
        outMap[outIdx] = { connected: true, label: `← IN ${inIdx}`, strandColor };
      }
      continue;
    }

    const tgtOnDiagram = State.equipment.some(e => String(e.id) === String(tgtEqId));

    if (tgtType === 'IN') {
      let outIdx = outSeq++;
      if (outIdx > maxOut) outIdx = maxOut;
      outMap[outIdx] = { connected: true, label: `→ ${tgtName}${code}`, strandColor };
      if (tgtOnDiagram) {
        const tgtIdx = slotOnEquipment(tgtEqId, tgtPort, 'in', () => 1) || 1;
        addCrossLink(eqId, 'out', outIdx, tgtEqId, 'in', tgtIdx, strandColor);
      }
    } else if (tgtType === 'OUT') {
      const inIdx = inSeq++;
      inMap[inIdx] = { connected: true, label: `← ${tgtName}${code}`, strandColor };
      if (tgtOnDiagram) {
        const tgtIdx = slotOnEquipment(tgtEqId, tgtPort, 'out', () => 1) || 1;
        addCrossLink(eqId, 'in', inIdx, tgtEqId, 'out', tgtIdx, strandColor);
      }
    }
  }

  return {
    in: inMap,
    out: outMap,
    links,
    crossLinks,
    count: (records || []).length,
    rawRecords: records || [],
  };
}

/** All cross-equipment links for diagram SVG */
function getAllConnectivityCrossLinks() {
  const all = [];
  const seen = new Set();
  for (const eq of State.equipment) {
    const pc = getEqPortConnectivity(eq.id);
    (pc.crossLinks || []).forEach(lk => {
      const key = [
        lk.fromEqId, lk.fromSide, lk.fromCode || '', lk.fromIndex,
        lk.toEqId, lk.toSide, lk.toCode || '', lk.toIndex,
      ].join('|');
      if (seen.has(key)) return;
      seen.add(key);
      all.push(lk);
    });
  }
  return all;
}

function getEqPortConnectivity(eqId) {
  return State.equipmentConnectivity[eqId] || {
    in: {}, out: {}, links: [], crossLinks: [], count: 0, rawRecords: [],
  };
}

function equipmentConnectivityCount(eq) {
  const pc = getEqPortConnectivity(eq.id);
  if (pc.count > 0) return pc.count;
  return State.connections.filter(c => c.equipment_id === eq.id).length;
}

function strandHexFromColorName(colorName) {
  if (!colorName) return null;
  const s = STRANDS.find(x => x.name.toLowerCase() === String(colorName).toLowerCase());
  return s ? s.hex : null;
}

function strandDotHtml(colorName) {
  const hex = strandHexFromColorName(colorName);
  if (!hex) return '';
  return `<span class="sdot" style="background:${hex}" title="${escapeHtml(colorName)}"></span>`;
}

/**
 * Apply cross-links reported on source equipment onto target IN/OUT maps
 * (by-source API only returns outbound rows from each device).
 */
/** Center-equipment port index (1, 2, …) → FDMS column slot by position in ports[] */
function fdmsPortKeyFromEquipIndex(side, index) {
  const n = Math.max(1, Number(index) || 1);
  const ports = getFdmsColumnRows(side);
  const prefix = side === 'in' ? 'in' : 'out';
  const hit = ports.find(p => p.slot === n);
  if (hit) return `${prefix}-${hit.slot}`;
  if (useFdmsPortFallbacks()) {
    return `${prefix}-${PORT_LABELS[n - 1] || PORT_LABELS[0]}`;
  }
  return `${prefix}-${n}`;
}

function fdmsInPortKeyFromIndex(index) {
  return fdmsPortKeyFromEquipIndex('in', index);
}

function fdmsOutPortKeyFromIndex(index) {
  return fdmsPortKeyFromEquipIndex('out', index);
}

function _portCode(port) {
  return _trimStr(port?.code) || '';
}

/** Equipment list card: slot index for a port code (IN/OUT labels or api_ports) */
function equipPortSlotForCode(eq, portCode, preferredSide) {
  const want = _trimStr(portCode);
  if (!eq || !want) return null;

  const trySide = (side) => {
    for (const { slot, label } of getCenterEquipmentPortSlots(eq, side)) {
      if (_trimStr(label) === want) return slot;
    }
    const max = side === 'in' ? (eq.in_ports || 0) : (eq.out_ports || 0);
    const type = side === 'in' ? 'IN' : 'OUT';
    for (const p of eq.api_ports || []) {
      if (_portCode(p) !== want) continue;
      if ((p.portType || '').toUpperCase() !== type) continue;
      const slot = portIndexFromApi(p, max);
      if (slot >= 1 && slot <= max) return slot;
    }
    return null;
  };

  if (preferredSide === 'in' || preferredSide === 'out') {
    const hit = trySide(preferredSide);
    if (hit) return hit;
  }
  return trySide('in') || trySide('out');
}

/** Port cell label + used state for equipment list / detail (from connectivity API) */
/**
 * Live Fiberneo — same source of truth as diagram lines (crossLinks), not orphan rawRecords.
 */
function resolveEquipPortFromConnectivityEdges(eq, side, slot) {
  const code = eqPortDisplayLabel(eq, side, slot);
  const eqId = String(eq.id);

  for (const lk of getAllConnectivityCrossLinks()) {
    if (!equipPortMatchesCrossLink(lk, eqId, side, slot, code)) continue;

    if (side === 'in') {
      const fromEq = findEquipmentById(lk.fromEqId);
      const fromFdms = lk.fromSide === 'fdms' || isInFdmsEquipment(fromEq);
      const fromName = fromFdms
        ? (findInFdmsEquipment()?.name || 'IN-FDMS')
        : shortEquipName(fromEq);
      const fromSuffix = lk.fromCode ? ` (${lk.fromCode})` : '';
      const value = `← ${fromName}${fromSuffix}`;
      return {
        used: true,
        value,
        fullValue: resolveEquipPortFullLabel(eq, side, slot, value),
        strandColor: lk.strandColor || null,
      };
    }

    const toEq = findEquipmentById(lk.toEqId);
    const toFdms = lk.toSide === 'out' && isOutFdmsEquipment(toEq);
    const toName = toFdms
      ? (findOutFdmsEquipment()?.name || 'OUT-FDMS')
      : shortEquipName(toEq);
    const toSuffix = lk.toCode ? ` (${lk.toCode})` : '';
    const value = `→ ${toName}${toSuffix}`;
    return {
      used: true,
      value,
      fullValue: resolveEquipPortFullLabel(eq, side, slot, value),
      strandColor: lk.strandColor || null,
    };
  }

  const pc = getEqPortConnectivity(eq.id);
  for (const link of (pc.links || []).filter((l) => !l.inferred)) {
    if (side === 'in' && Number(link.in) === Number(slot)) {
      const outLbl = eqPortDisplayLabel(eq, 'out', link.out);
      const value = outLbl ? `→ ${outLbl}` : `→ OUT ${link.out}`;
      return {
        used: true,
        value,
        fullValue: resolveEquipPortFullLabel(eq, side, slot, value),
        strandColor: link.strandColor || null,
      };
    }
    if (side === 'out' && Number(link.out) === Number(slot)) {
      const inLbl = eqPortDisplayLabel(eq, 'in', link.in);
      const value = inLbl ? `← ${inLbl}` : `← IN ${link.in}`;
      return {
        used: true,
        value,
        fullValue: resolveEquipPortFullLabel(eq, side, slot, value),
        strandColor: link.strandColor || null,
      };
    }
  }

  return null;
}

function getEquipListPortCell(eq, side, slot) {
  const code = eqPortDisplayLabel(eq, side, slot);

  if (useFiberneoLive()) {
    if (isEquipPortForceFree(eq.id, side, slot, code)) {
      return { used: false, value: 'Free', strandColor: null };
    }

    const fromEdges = resolveEquipPortFromConnectivityEdges(eq, side, slot);
    if (fromEdges) return fromEdges;

    const conns = State.connections.filter(
      (c) => String(c.equipment_id) === String(eq.id),
    );
    const c = conns.find((conn) => (
      side === 'in'
        ? (conn.eq_in_code === code || conn.eq_in_port === `in${slot}`)
        : (conn.eq_out_code === code || conn.eq_out_port === `out${slot}`)
    ));

    if (c) {
      const value = side === 'in'
        ? `← ${fdmsInLabelFromPortKey(c.src)}`
        : `→ ${fdmsConnectionDestLabel(c) || fdmsOutLabelFromPortKey(c.dst) || c.eq_out_code || '—'}`;
      return {
        used: true,
        value,
        fullValue: resolveEquipPortFullLabel(eq, side, slot, value),
        strandColor: c.strandColor || null,
      };
    }

    return { used: false, value: 'Free', strandColor: null };
  }

  const pc = getEqPortConnectivity(eq.id);
  const entry = diagramEqPortCell(eq, side, slot);
  if (entry?.connected) {
    const value = entry.label;
    return {
      used: true,
      value,
      fullValue: resolveEquipPortFullLabel(eq, side, slot, value),
      strandColor: entry.strandColor || null,
    };
  }

  const conns = State.connections.filter(
    (c) => String(c.equipment_id) === String(eq.id),
  );
  const c = conns.find((conn) => (
    side === 'in'
      ? (conn.eq_in_code === code || conn.eq_in_port === `in${slot}`)
      : (conn.eq_out_code === code || conn.eq_out_port === `out${slot}`)
  ));

  if (c) {
    const value = side === 'in'
      ? `← ${fdmsInLabelFromPortKey(c.src)}`
      : `→ ${fdmsConnectionDestLabel(c) || fdmsOutLabelFromPortKey(c.dst) || c.eq_out_code || '—'}`;
    return {
      used: true,
      value,
      fullValue: resolveEquipPortFullLabel(eq, side, slot, value),
      strandColor: c.strandColor || null,
    };
  }

  return { used: false, value: 'Free', strandColor: null };
}

/** Remove payload for a single equipment IN/OUT port row (equipment detail sheet) */
function resolveEquipPortRemovePayload(eqId, side, slot, code) {
  const eq = findEquipmentById(eqId);
  if (!eq) return null;
  const portRef = side === 'in' ? `in${slot}` : `out${slot}`;
  const portCode = _trimStr(code) || eqPortDisplayLabel(eq, side, slot);

  if (side === 'in') {
    const conn = State.connections.find((c) => (
      String(c.equipment_id) === String(eqId)
        && c.src
        && (c.eq_in_code === portCode || c.eq_in_port === portRef)
    ));
    if (conn?.src) {
      return { kind: 'in-fdms', connId: conn.id, srcPort: conn.src };
    }
    const lkEq = getAllConnectivityCrossLinks().find((l) => (
      String(l.toEqId) === String(eqId) && l.toSide === 'in'
        && (l.toCode === portCode || l.toIndex === slot)
        && isDiagramCenterEquipment(findEquipmentById(l.fromEqId))
        && l.fromSide === 'out'
    ));
    if (lkEq) return { kind: 'eq-hop', lk: lkEq };

    const lkFdms = getAllConnectivityCrossLinks().find((l) => (
      String(l.toEqId) === String(eqId) && l.toSide === 'in'
        && (l.toCode === portCode || l.toIndex === slot)
        && isInFdmsEquipment(findEquipmentById(l.fromEqId))
    ));
    if (lkFdms) {
      const fk = lkFdms.fromCode
        ? fdmsPortKeyForCode('in', lkFdms.fromCode)
        : fdmsInPortKeyFromIndex(lkFdms.fromIndex);
      const conn2 = fk
        ? State.connections.find((c) => c.src === fk && String(c.equipment_id) === String(eqId))
        : null;
      return { kind: 'in-fdms', connId: conn2?.id, srcPort: fk };
    }
  }

  if (side === 'out') {
    const hop = State.connections.find((c) => (
      String(c.equipment_id) === String(eqId)
        && c.dst
        && (c.eq_out_code === portCode || c.eq_out_port === portRef)
    ));
    if (hop) {
      return {
        kind        : 'eq-out-fdms',
        fromEqId    : String(eqId),
        fromOutCode : hop.eq_out_code || portCode,
        toOutFdmsCode: hop.dst_fdms_code || fdmsOutLabelFromPortKey(hop.dst),
        hopConnId   : hop.id,
      };
    }
    const lkEq = getAllConnectivityCrossLinks().find((l) => (
      String(l.fromEqId) === String(eqId) && l.fromSide === 'out'
        && (l.fromCode === portCode || l.fromIndex === slot)
        && isDiagramCenterEquipment(findEquipmentById(l.toEqId))
        && l.toSide === 'in'
    ));
    if (lkEq) return { kind: 'eq-hop', lk: lkEq };

    const lkOut = getAllConnectivityCrossLinks().find((l) => (
      String(l.fromEqId) === String(eqId) && l.fromSide === 'out'
        && (l.fromCode === portCode || l.fromIndex === slot)
        && isOutFdmsEquipment(findEquipmentById(l.toEqId))
    ));
    if (lkOut) {
      return {
        kind         : 'eq-out-fdms',
        fromEqId     : String(eqId),
        fromOutCode  : lkOut.fromCode || portCode,
        toOutFdmsCode: lkOut.toCode,
        hopConnId    : null,
      };
    }
  }

  return null;
}

const EQ_DETAIL_DISCONNECT_ICON = '<svg class="eq-port-act-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

function buildEquipDetailPortRowHtml(eq, side, slot, label, displayLabel, portId) {
  const showLabel = displayLabel || label;
  const cell = getEquipListPortCell(eq, side, slot);
  const searchKey = [showLabel, label, side, cell.used ? cell.value : 'free'].join(' ').toLowerCase();
  const linkText = cell.used ? _trimStr(cell.value) : '';
  const fullLinkText = cell.used ? _trimStr(cell.fullValue || linkText) : '';
  const wrapTipAttr = cell.used && fullLinkText ? ` data-tip="${attrEsc(fullLinkText)}"` : '';
  const statusHtml = cell.used
    ? `<span class="eq-port-status eq-port-status--linked">${escapeHtml(linkText)}</span>${strandDotHtml(cell.strandColor)}`
    : '<span class="eq-port-status eq-port-status--free">Free</span>';

  let actionHtml = '';
  if (cell.used) {
    actionHtml = `<button type="button" class="eq-port-act-btn eq-port-act-btn--disconnect"
      data-action="eq-detail-disconnect"
      data-eq-id="${attrEsc(eq.id)}"
      data-eq-side="${side}"
      data-eq-slot="${slot}"
      data-eq-code="${attrEsc(label)}"
      data-eq-port-id="${attrEsc(portId || '')}"
      title="Remove connection" aria-label="Remove connection on ${attrEsc(showLabel)}">${EQ_DETAIL_DISCONNECT_ICON}</button>`;
  } else {
    actionHtml = `<button type="button" class="eq-port-act-btn eq-port-act-btn--connect"
      data-action="eq-detail-connect"
      data-eq-id="${attrEsc(eq.id)}"
      data-eq-side="${side}"
      data-eq-slot="${slot}"
      data-eq-code="${attrEsc(label)}"
      data-eq-port-id="${attrEsc(portId || '')}"
      title="Connect port" aria-label="Connect ${attrEsc(showLabel)}">🔗</button>`;
  }

  return `<div class="ir eq-port-row" data-eq-port-row data-search="${attrEsc(searchKey)}">
    <span class="eq-port-row-label il">${escapeHtml(showLabel)}</span>
    <div class="eq-port-row-status-wrap"${wrapTipAttr}>${statusHtml}</div>
    ${actionHtml}
  </div>`;
}

/** Truncation tooltip for centered connection labels in equipment detail */
function syncEquipDetailPortStatusTooltips() {
  const list = document.getElementById('eq-port-list');
  if (!list) return;
  list.querySelectorAll('.eq-port-row-status-wrap').forEach((wrap) => {
    const el = wrap.querySelector('.eq-port-status--linked');
    if (!el) {
      wrap.classList.remove('has-tip', 'is-truncated');
      wrap.removeAttribute('data-tip');
      wrap.removeAttribute('title');
      return;
    }
    const display = _trimStr(el.textContent);
    const full = _trimStr(wrap.getAttribute('data-tip') || '');
    const cssTruncated = el.scrollWidth > el.clientWidth + 1;
    const needsTip = !!full && (full !== display || cssTruncated || full.includes('…'));
    el.classList.toggle('is-truncated', cssTruncated);
    wrap.classList.toggle('has-tip', needsTip);
    wrap.classList.toggle('is-truncated', cssTruncated);
    if (needsTip) {
      wrap.setAttribute('data-tip', full);
      wrap.setAttribute('title', full);
    } else {
      wrap.removeAttribute('data-tip');
      wrap.removeAttribute('title');
    }
    el.removeAttribute('title');
  });
}

let _eqPortFloatTipEl = null;
let _eqPortFloatTipsBound = false;

function ensureEqPortFloatTipEl() {
  if (_eqPortFloatTipEl) return _eqPortFloatTipEl;
  _eqPortFloatTipEl = document.createElement('div');
  _eqPortFloatTipEl.className = 'eq-port-float-tip';
  _eqPortFloatTipEl.hidden = true;
  document.body.appendChild(_eqPortFloatTipEl);
  return _eqPortFloatTipEl;
}

function hideEqPortFloatTip() {
  if (_eqPortFloatTipEl) _eqPortFloatTipEl.hidden = true;
}

function showEqPortFloatTip(text, anchor) {
  const tip = ensureEqPortFloatTipEl();
  tip.textContent = text;
  tip.hidden = false;
  const rect = anchor.getBoundingClientRect();
  tip.style.left = `${rect.left + rect.width / 2}px`;
  tip.style.top = `${rect.top - 8}px`;
}

function bindEquipDetailPortFloatTips() {
  if (_eqPortFloatTipsBound) return;
  _eqPortFloatTipsBound = true;

  document.addEventListener('mouseover', (e) => {
    const list = document.getElementById('eq-port-list');
    if (!list || !document.getElementById('sh-eq-detail')?.classList.contains('show')) return;
    const wrap = e.target.closest('.eq-port-row-status-wrap.has-tip');
    if (!wrap || !list.contains(wrap)) return;
    const full = _trimStr(wrap.getAttribute('data-tip') || '');
    if (full) showEqPortFloatTip(full, wrap);
  });
  document.addEventListener('mouseout', (e) => {
    const wrap = e.target.closest('.eq-port-row-status-wrap.has-tip');
    if (!wrap) return;
    const to = e.relatedTarget;
    if (to && wrap.contains(to)) return;
    if (to?.closest?.('.eq-port-row-status-wrap.has-tip')) return;
    hideEqPortFloatTip();
  });
}

/** Match equipment port slot by API port code (e.g. P1-1305) — portType ignored */
function findEqPortSlotByCode(eqId, portCode, side) {
  const eq = findEquipmentById(eqId);
  if (!eq || !portCode) return null;
  const want = _trimStr(portCode);
  void side;

  for (const row of getAllCenterEquipmentPortSlots(eq)) {
    if (row.code === want) return row.slot;
  }

  for (const p of eq.api_ports || []) {
    if (_portCode(p) !== want) continue;
    const max = Math.max(eq.in_ports || 0, eq.out_ports || 0, 8);
    const slot = portIndexFromApi(p, max);
    if (slot) return slot;
  }

  for (const s of ['in', 'out']) {
    const labels = eq.port_labels?.[s] || {};
    for (const [slot, lbl] of Object.entries(labels)) {
      if (_trimStr(lbl) === want) return parseInt(slot, 10);
    }
  }

  return portIndexFromApi({ code: want }, Math.max(eq.in_ports || 0, eq.out_ports || 0, 8));
}

/** FDMS column portKey from port code (e.g. P1-11, Port-1) */
function fdmsPortKeyForCode(side, portCode) {
  const want = _trimStr(portCode);
  if (!want) return null;
  const rows = getFdmsColumnRows(side);
  const hit  = rows.find(r => _trimStr(r.code) === want);
  const prefix = side === 'in' ? 'in' : 'out';
  return hit ? `${prefix}-${hit.slot}` : null;
}

/** Normalized directed edges from all equipment-connectivity records */
function collectConnectivityEdges() {
  const edges = [];
  for (const eq of State.equipment) {
    const ownerId = String(eq.id);
    const pc = getEqPortConnectivity(eq.id);
    for (const rec of pc.rawRecords || []) {
      const fromEqId = rec.sourceEquipment?.id != null
        ? String(rec.sourceEquipment.id)
        : ownerId;
      const fromCode = _portCode(rec.sourcePort);
      const fromType = (rec.sourcePort?.portType || '').toUpperCase();
      const toEqId   = rec.targetEquipment?.id != null ? String(rec.targetEquipment.id) : null;
      const toCode   = _portCode(rec.targetPort);
      const toType   = (rec.targetPort?.portType || '').toUpperCase();
      if (!fromCode || !toEqId || !toCode) continue;
      edges.push({
        id         : rec.id,
        fromEqId,
        fromCode,
        fromType,
        toEqId,
        toCode,
        toType,
        strandColor: rec.strand?.color || null,
        raw        : rec,
      });
    }
  }
  return edges;
}

/**
 * Center equipment internal OUT for a given IN — only from this device's connectivity API
 * (same-equipment row: sourcePort IN → targetPort OUT). No IN-FDMS inference.
 */
function findCenterInternalOutFromApi(centerEqId, centerInCode) {
  const pc = getEqPortConnectivity(centerEqId);
  const wantIn = _trimStr(centerInCode);

  for (const rec of pc.rawRecords || []) {
    const src = _portCode(rec.sourcePort);
    const srcT = (rec.sourcePort?.portType || '').toUpperCase();
    const tgt = _portCode(rec.targetPort);
    const tgtT = (rec.targetPort?.portType || '').toUpperCase();
    const tgtEqId = rec.targetEquipment?.id;
    if (String(tgtEqId) !== String(centerEqId)) continue;
    if (src === wantIn && srcT === 'IN' && tgtT === 'OUT') return tgt;
  }

  for (const link of pc.links || []) {
    if (link.inferred) continue;
    if (link.inCode === wantIn && link.outCode) return link.outCode;
  }

  return null;
}

/** Center OUT port code → OUT-FDMS port code */
function findOutFdmsPortCodeForCenterOut(centerEqId, centerOutCode) {
  const outFdms = findOutFdmsEquipment();
  if (!outFdms) return null;

  for (const rec of getEqPortConnectivity(centerEqId).rawRecords || []) {
    const src = _portCode(rec.sourcePort);
    const srcT = (rec.sourcePort?.portType || '').toUpperCase();
    const tgtId = rec.targetEquipment?.id;
    const tgtCode = _portCode(rec.targetPort);
    if (src !== centerOutCode || srcT !== 'OUT') continue;
    if (String(tgtId) === String(outFdms.id)) return tgtCode;
  }

  for (const e of collectConnectivityEdges()) {
    if (String(e.fromEqId) === String(centerEqId)
        && e.fromCode === centerOutCode
        && outFdms
        && String(e.toEqId) === String(outFdms.id)
        && e.toType === 'OUT') {
      return e.toCode;
    }
  }

  return null;
}

/**
 * Mock-only: guess INn→OUTn when no explicit internal API row (disabled for live Fiberneo).
 */
function inferInternalPassthroughLinks() {
  if (useFiberneoLive()) return;

  State.equipment.filter(isDiagramCenterEquipment).forEach((eq) => {
    const key = String(eq.id);
    if (!State.equipmentConnectivity[key]) {
      State.equipmentConnectivity[key] = {
        in: {}, out: {}, links: [], crossLinks: [], count: 0,
      };
    }
    const pc = State.equipmentConnectivity[key];
    pc.links = pc.links || [];

    Object.keys(pc.in || {}).forEach((k) => {
      const inIdx = parseInt(k, 10);
      if (!Number.isFinite(inIdx) || !pc.in[inIdx]?.connected) return;

      const outIdx = Math.min(inIdx, eq.out_ports || 2);
      const hasLink = pc.links.some(l => l.in === inIdx);
      if (hasLink) return;

      const strandColor = pc.in[inIdx].strandColor;
      const inCode  = pc.in[inIdx].code || eqPortDisplayLabel(eq, 'in', inIdx);
      const outCode = eqPortDisplayLabel(eq, 'out', outIdx);
      pc.links.push({
        in: inIdx, out: outIdx, inCode, outCode, strandColor, inferred: true,
      });
      pc.out[outIdx] = {
        connected: true,
        label: `→ OUT ${outIdx}`,
        strandColor,
        ...(pc.out[outIdx] || {}),
      };
    });
  });
}

/**
 * Build diagram connections from IN-FDMS API rows:
 *   sourcePort.code → targetEquipment.targetPort.code (IN on center).
 * Continues to center OUT / OUT-FDMS only when equipment API has explicit internal IN→OUT.
 */
function buildApiCableConnections() {
  if (!State.equipment?.length) return;

  const inFdms  = findInFdmsEquipment();
  const outFdms = findOutFdmsEquipment();
  if (!inFdms) {
    State.connections = [];
    return;
  }

  const conns       = [];
  const usedInPath  = new Set();
  const usedOutLeg  = new Set();
  let strandIdx     = 0;
  const inFdmsRecs  = getEqPortConnectivity(inFdms.id).rawRecords || [];

  for (const rec of inFdmsRecs) {
    const fdmsSrcCode = _portCode(rec.sourcePort);
    const tgtEq       = rec.targetEquipment;
    const tgtCode     = _portCode(rec.targetPort);
    const tgtType     = (rec.targetPort?.portType || '').toUpperCase();

    if (!fdmsSrcCode || !tgtEq?.id || !tgtCode) continue;
    if (tgtType !== 'IN') continue;

    const center = findEquipmentById(tgtEq.id);
    if (!center || !isDiagramCenterEquipment(center)) continue;

    const srcKey = fdmsPortKeyForCode('in', fdmsSrcCode);
    if (!srcKey || usedInPath.has(srcKey)) continue;

    const centerEqId = String(tgtEq.id);
    const eqInCode   = tgtCode;
    const strandColor = rec.strand?.color || null;

    const eqOutCode = findCenterInternalOutFromApi(centerEqId, eqInCode);
    const outFdmsCode = eqOutCode
      ? findOutFdmsPortCodeForCenterOut(centerEqId, eqOutCode)
      : null;
    const dstKey = outFdmsCode ? fdmsPortKeyForCode('out', outFdmsCode) : null;

    const eqInSlot  = findEqPortSlotByCode(centerEqId, eqInCode, 'IN') || 1;
    const eqOutSlot = eqOutCode
      ? (findEqPortSlotByCode(centerEqId, eqOutCode, 'OUT') || 1)
      : null;

    const recordIds = rec.id != null ? [String(rec.id)] : [];

    usedInPath.add(srcKey);
    conns.push({
      id            : rec.id || `api-${centerEqId}-${fdmsSrcCode}`,
      src           : srcKey,
      dst           : dstKey || '',
      equipment_id  : centerEqId,
      eq_in_port    : `in${eqInSlot}`,
      eq_out_port   : eqOutSlot ? `out${eqOutSlot}` : null,
      eq_in_code    : eqInCode,
      eq_out_code   : eqOutCode || null,
      has_internal  : !!eqOutCode,
      src_fdms_code : fdmsSrcCode,
      dst_fdms_code : outFdmsCode || null,
      linkRole      : 'in-path',
      strand_index  : strandIdx++,
      strandColor,
      recordIds,
      apiRecords    : [rec],
    });
  }

  /* IN-FDMS port → center OUT (e.g. Port-1 → P1-1306) — own API row, not a full IN-path */
  for (const rec of inFdmsRecs) {
    const fdmsSrcCode = _portCode(rec.sourcePort);
    const tgtEq       = rec.targetEquipment;
    const tgtCode     = _portCode(rec.targetPort);
    const tgtType     = (rec.targetPort?.portType || '').toUpperCase();

    if (!fdmsSrcCode || !tgtEq?.id || !tgtCode) continue;
    if (tgtType !== 'OUT') continue;

    const center = findEquipmentById(tgtEq.id);
    if (!center || !isDiagramCenterEquipment(center)) continue;

    const srcKey = fdmsPortKeyForCode('in', fdmsSrcCode);
    if (!srcKey || usedInPath.has(srcKey) || usedOutLeg.has(srcKey)) continue;

    const centerEqId = String(tgtEq.id);
    const eqOutSlot  = findEqPortSlotByCode(centerEqId, tgtCode, 'OUT') || 1;
    const strandColor = rec.strand?.color || null;

    usedOutLeg.add(srcKey);
    conns.push({
      id            : rec.id || `api-outleg-${centerEqId}-${fdmsSrcCode}`,
      src           : srcKey,
      dst           : '',
      equipment_id  : centerEqId,
      eq_in_port    : null,
      eq_out_port   : `out${eqOutSlot}`,
      eq_in_code    : null,
      eq_out_code   : tgtCode,
      src_fdms_code : fdmsSrcCode,
      dst_fdms_code : null,
      linkRole      : 'fdms-out-to-eq-out',
      strand_index  : strandIdx++,
      strandColor,
      recordIds     : rec.id != null ? [String(rec.id)] : [],
      apiRecords    : [rec],
    });
  }

  /* Center equipment port → OUT-FDMS (by-source on DWDM, DWDM-02, etc.) */
  if (outFdms) {
    State.equipment.filter(isDiagramCenterEquipment).forEach((center) => {
      const centerId = String(center.id);
      const pc = getEqPortConnectivity(centerId);
      for (const rec of pc.rawRecords || []) {
        const srcCode = _portCode(rec.sourcePort);
        const srcT = (rec.sourcePort?.portType || '').toUpperCase();
        const tgtEq = rec.targetEquipment;
        const tgtCode = _portCode(rec.targetPort);
        if (!srcCode || !tgtEq?.id || !tgtCode) continue;
        if (!isOutFdmsEquipment(tgtEq)) continue;

        const portRow = getAllCenterEquipmentPortSlots(center).find((r) => r.code === srcCode);
        const srcSide = portRow?.side || (srcT === 'IN' ? 'in' : 'out');
        const eqPortSlot = portRow?.slot
          || findEqPortSlotByCode(centerId, srcCode, null)
          || 1;

        const dstKey = fdmsPortKeyForCode('out', tgtCode);
        if (!dstKey) continue;

        const strandColor = rec.strand?.color || null;
        const hop = {
          id            : rec.id || `api-eqout-${centerId}-${srcCode}`,
          src           : '',
          dst           : dstKey,
          equipment_id  : centerId,
          eq_in_port    : null,
          eq_out_port   : `${srcSide}${eqPortSlot}`,
          eq_in_code    : null,
          eq_out_code   : srcCode,
          eq_source_side: srcSide,
          dst_fdms_code : tgtCode,
          linkRole      : 'eq-out-to-fdms',
          strand_index  : strandIdx++,
          strandColor,
          recordIds     : rec.id != null ? [String(rec.id)] : [],
          apiRecords    : [rec],
        };

        const attachTo = conns.find(
          (c) => String(c.equipment_id) === centerId
            && (c.eq_out_code === srcCode || c.eq_out_port === `${srcSide}${eqPortSlot}`),
        );
        if (attachTo && !attachTo.dst) {
          attachTo.dst = dstKey;
          attachTo.dst_fdms_code = tgtCode;
          attachTo.eq_source_side = srcSide;
          if (rec.id) attachTo.recordIds = [...(attachTo.recordIds || []), String(rec.id)];
        } else if (!conns.some((c) => c.linkRole === 'eq-out-to-fdms' && c.dst === dstKey && c.eq_out_code === srcCode)) {
          conns.push(hop);
        }
      }
    });
  }

  /* IN-FDMS → OUT-FDMS direct (no center equipment) */
  if (outFdms) {
    for (const rec of inFdmsRecs) {
      const fdmsSrcCode = _portCode(rec.sourcePort);
      const tgtEq       = rec.targetEquipment;
      const tgtCode     = _portCode(rec.targetPort);
      if (!fdmsSrcCode || !tgtEq?.id || !tgtCode) continue;
      if (!isOutFdmsEquipment(tgtEq)) continue;

      const srcKey = fdmsPortKeyForCode('in', fdmsSrcCode);
      if (!srcKey || usedInPath.has(srcKey)) continue;

      const dstKey = fdmsPortKeyForCode('out', tgtCode);
      const strandColor = rec.strand?.color || null;

      usedInPath.add(srcKey);
      conns.push({
        id            : rec.id || `api-direct-${fdmsSrcCode}-${tgtCode}`,
        src           : srcKey,
        dst           : dstKey || '',
        equipment_id  : null,
        eq_in_port    : null,
        eq_out_port   : null,
        eq_in_code    : null,
        eq_out_code   : null,
        src_fdms_code : fdmsSrcCode,
        dst_fdms_code : tgtCode,
        linkRole      : 'direct-fdms',
        strand_index  : strandIdx++,
        strandColor,
        recordIds     : rec.id != null ? [String(rec.id)] : [],
        apiRecords    : [rec],
      });
    }

    const outFdmsRecs = getEqPortConnectivity(outFdms.id).rawRecords || [];
    const usedOutDirect = new Set();
    for (const rec of outFdmsRecs) {
      const fdmsSrcCode = _portCode(rec.sourcePort);
      const tgtEq       = rec.targetEquipment;
      const tgtCode     = _portCode(rec.targetPort);
      if (!fdmsSrcCode || !tgtEq?.id || !tgtCode) continue;
      if (!isInFdmsEquipment(tgtEq)) continue;

      const dstKey = fdmsPortKeyForCode('out', fdmsSrcCode);
      if (!dstKey || usedOutDirect.has(dstKey)) continue;

      const srcKey = fdmsPortKeyForCode('in', tgtCode);
      if (!srcKey || usedInPath.has(srcKey)) continue;

      const strandColor = rec.strand?.color || null;
      usedOutDirect.add(dstKey);
      usedInPath.add(srcKey);
      conns.push({
        id            : rec.id || `api-direct-rev-${fdmsSrcCode}-${tgtCode}`,
        src           : srcKey,
        dst           : dstKey,
        equipment_id  : null,
        eq_in_port    : null,
        eq_out_port   : null,
        eq_in_code    : null,
        eq_out_code   : null,
        src_fdms_code : tgtCode,
        dst_fdms_code : fdmsSrcCode,
        linkRole      : 'fdms-out-to-in',
        strand_index  : strandIdx++,
        strandColor,
        recordIds     : rec.id != null ? [String(rec.id)] : [],
        apiRecords    : [rec],
      });
    }
  }

  State.connections = conns;
}

/** Index raw connectivity rows (for DELETE /equipment-connectivity) */
function rebuildConnectivityRecordIndex() {
  const index = [];
  const seenIds = new Set();
  for (const eq of State.equipment) {
    const pc = State.equipmentConnectivity[eq.id];
    if (!pc?.rawRecords?.length) continue;
    for (const rec of pc.rawRecords) {
      if (rec.id == null) continue;
      const recKey = String(rec.id);
      if (seenIds.has(recKey)) continue;
      seenIds.add(recKey);
      const sourceEquipmentId = rec.sourceEquipment?.id != null
        ? String(rec.sourceEquipment.id)
        : String(eq.id);
      const targetEquipmentId = rec.targetEquipment?.id != null
        ? String(rec.targetEquipment.id)
        : null;
      index.push({
        id: String(rec.id),
        sourceEquipmentId,
        targetEquipmentId,
        sourcePortId: resolvePortApiIdFromRecord(rec.sourcePort, sourceEquipmentId),
        targetPortId: resolvePortApiIdFromRecord(rec.targetPort, targetEquipmentId),
        sourcePort: rec.sourcePort || null,
        targetPort: rec.targetPort || null,
        raw: rec,
      });
    }
  }
  State.connectivityRecordIndex = index;
}

/** Match diagram FDMS connection → API connectivity row(s) by port codes */
function findRecordsForDiagramConnection(conn) {
  if (!conn?.equipment_id) return [];
  const eqId    = String(conn.equipment_id);
  const inCode  = _trimStr(conn.eq_in_code);
  const outCode = _trimStr(conn.eq_out_code);
  const srcFdms = _trimStr(conn.src_fdms_code);

  if (conn.recordIds?.length) {
    const idSet = new Set(conn.recordIds.map(String));
    const fromIndex = State.connectivityRecordIndex.filter(r => idSet.has(String(r.id)));
    if (fromIndex.length) return fromIndex;
  }

  return State.connectivityRecordIndex.filter((row) => {
    if (inCode && String(row.targetEquipmentId) === eqId) {
      const t = (row.targetPort?.portType || '').toUpperCase();
      if (t === 'IN' && _portCode(row.targetPort) === inCode) return true;
    }
    if (srcFdms && _portCode(row.sourcePort) === srcFdms) return true;
    if (outCode && String(row.sourceEquipmentId) === eqId) {
      const t = (row.sourcePort?.portType || '').toUpperCase();
      if (t === 'OUT' && _portCode(row.sourcePort) === outCode) return true;
    }
    const inIdx = parseInt(String(conn.eq_in_port || '').replace(/\D/g, ''), 10);
    if (Number.isFinite(inIdx) && String(row.targetEquipmentId) === eqId) {
      const t = (row.targetPort?.portType || '').toUpperCase();
      if (t === 'IN' && portIndexFromApi(row.targetPort, 8) === inIdx) return true;
    }
    return false;
  });
}

function mergeInboundConnectivity() {
  getAllConnectivityCrossLinks().forEach(lk => {
    const toId = String(lk.toEqId);
    if (!State.equipmentConnectivity[toId]) {
      State.equipmentConnectivity[toId] = {
        in: {}, out: {}, links: [], crossLinks: [], count: 0,
      };
    }
    const toPc = State.equipmentConnectivity[toId];
    const fromEq = findEquipmentById(lk.fromEqId);
    const fromFdms = lk.fromSide === 'fdms';
    const fromName = fromFdms
      ? (findInFdmsEquipment()?.name || 'IN-FDMS')
      : shortEquipName(fromEq);
    const fromCode = lk.fromCode ? ` (${lk.fromCode})` : '';
    const label = `← ${fromName}${fromCode}`;
    const entry = {
      connected: true,
      label,
      strandColor: lk.strandColor,
      code: lk.toCode || null,
    };
    const toSlot = lk.toCode
      ? (findEqPortSlotByCode(toId, lk.toCode, lk.toSide === 'in' ? 'IN' : 'OUT') || lk.toIndex)
      : lk.toIndex;
    if (lk.toSide === 'in') {
      toPc.in[toSlot] = { ...toPc.in[toSlot], ...entry };
    } else if (lk.toSide === 'out') {
      toPc.out[toSlot] = { ...toPc.out[toSlot], ...entry };
    }
  });
}

let _connectivityReloadPromise = null;
const CONNECTIVITY_RELOAD_MAX_MS = 45000;

/** Refresh cable view — GET /facilities/by-facility/{id} when facility id known */
async function reloadEquipmentConnectivity({ bustCache = false } = {}) {
  void bustCache;
  const facilityId = resolveFacilityIdForRefresh();
  if (!facilityId && !getFacilityCablePayload()) {
    State.equipmentConnectivity = {};
    Render.setDiagramConnectivityLoader(false);
    return;
  }

  if (_connectivityReloadPromise) {
    Render.setDiagramConnectivityLoader(true);
    return _connectivityReloadPromise;
  }

  const run = async () => {
    if (facilityId) {
      await refreshFacilityCableViewFromApi(facilityId);
      return;
    }
    const facility = getFacilityCablePayload();
    if (facility) App.applyFacilityCableView(facility);
  };

  Render.setDiagramConnectivityLoader(true);

  _connectivityReloadPromise = Promise.race([
    run(),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Connectivity load timed out')),
        CONNECTIVITY_RELOAD_MAX_MS,
      );
    }),
  ]).catch((err) => {
    console.warn('[Cable view] Connectivity load:', err.message || err);
    if (!State.equipmentConnectivity || !Object.keys(State.equipmentConnectivity).length) {
      State.equipmentConnectivity = {};
    }
    try {
      mergeInboundConnectivity();
      enrichFdmsPortMapsFromConnectivity();
      rebuildConnectivityRecordIndex();
      buildApiCableConnections();
      refreshFdmsColumnPortsOnEquipment();
      syncTotalPortsFromFdms();
    } catch (mergeErr) {
      console.warn('[Cable view] Connectivity merge:', mergeErr);
    }
  }).finally(() => {
    _connectivityReloadPromise = null;
    Render.setDiagramConnectivityLoader(false);
  });

  return _connectivityReloadPromise;
}

/** Fiberneo equipment search row → display type string */
function equipmentTypeLabelFromApi(item) {
  return _trimStr(item.type)
    || _trimStr(item.equipmentType?.name)
    || _trimStr(item.equipmentType?.type)
    || _trimStr(item.equipmentTypeName)
    || _trimStr(item.category)
    || _trimStr(item.subType)
    || 'Equipment';
}

/** Normalizes Fiberneo equipment search item → app equipment model */
function mapEquipmentFromApi(item) {
  const typeLabel = equipmentTypeLabelFromApi(item);
  const typeKey   = equipmentTypeKey(typeLabel);
  const portMaps  = buildPortLabelMapsFromApi(item);
  const apiPorts = portsFromEquipmentSearchItem(item);
  let in_ports = sortedPortSlotNumbers(portMaps.in).length;
  let out_ports = sortedPortSlotNumbers(portMaps.out).length;
  if (!apiPorts.length && useEquipmentPortFallbacks()) {
    in_ports  = Math.max(0, Number(item.noInPorts ?? item.no_in_ports) || 0);
    out_ports = Math.max(0, Number(item.noOutPorts ?? item.no_out_ports) || 0);
  }
  const eqStub   = {
    type      : typeKey,
    type_label: typeLabel,
    name      : _trimStr(item.name),
    code      : _trimStr(item.code),
  };
  const fdmsColSide = _equipmentFdmsSide(eqStub);
  const resolvedType = fdmsColSide === 'in' ? 'infdms'
    : fdmsColSide === 'out' ? 'outfdms'
    : typeKey;
  const isFdmsEquip = fdmsColSide || typeKey === 'infdms' || typeKey === 'outfdms';
  const fdmsPorts = isFdmsEquip
    ? extractFdmsColumnPorts({ ports: apiPorts, ...item })
    : undefined;

  return {
    id           : String(item.id),
    name         : _trimStr(item.name) || _trimStr(item.code) || `Equipment ${item.id}`,
    type         : resolvedType,
    type_label   : typeLabel,
    in_ports,
    out_ports,
    port_labels  : { in: portMaps.in, out: portMaps.out },
    ports_by_slot: { in: portMaps.inPorts, out: portMaps.outPorts },
    api_ports    : apiPorts,
    fdms_column_ports: fdmsPorts,
    code         : _trimStr(item.code),
    status       : _trimStr(item.status),
    serial_number: _trimStr(item.serialNumber),
  };
}

/* ── EQUIPMENT DIAGRAM COLOURS ────────────────────────── */
const EQ_COLORS = {
  rly   : '#3b82f6',
  dwdm  : '#8b5cf6',
  sw    : '#14b8a6',
  amp   : '#fbbf24',
  split : '#8b5cf6',
  odf   : '#6366f1',
  dir   : '#9ca3af',   // direct / no equipment
};

/* ── HELPERS ──────────────────────────────────────────── */

/** Returns diagram hex colour for a given equipment ID */
function eqColorOf(eqId) {
  if (!eqId) return EQ_COLORS.dir;
  const eq = findEquipmentById(eqId);
  return eq ? (EQ_COLORS[eq.type] || EQ_COLORS.dir) : EQ_COLORS.dir;
}

/** Returns CSS class string for a given equipment ID */
function eqClassOf(eqId) {
  if (!eqId) return 'dir';
  const eq = findEquipmentById(eqId);
  return eq ? eq.type : 'dir';
}

/** Returns the lowest unused strand index */
function nextFreeStrand() {
  const used = State.connections.map(c => c.strand_index);
  let i = 0;
  while (used.includes(i) && i < 24) i++;
  return i;
}

/** Returns HTML for a strand colour badge */
function strandBadge(idx) {
  const s = STRANDS[idx % 12];
  return `<span class="sbadge" style="background:${s.bg};color:${s.hex};border-color:${s.hex}">● ${s.name}</span>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape for HTML attribute values (ids, port keys) */
function attrEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Shows a temporary toast notification */
function showToast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms);
}
/**
 * api.js  —  Fiberneo REST + mock cable-view fallback
 * Live load: window.siteInfo (initial) + GET /facilities/by-facility/{id} (refresh after writes)
 * Writes: POST/DELETE /equipments, /equipment-connectivity
 * Mock (?mock=1): legacy BASE_URL /pop/{stationId}/overview + /cable-view
 */

const API = (() => {

  /* ── CONFIGURATION ───────────────────────────────────────
     🔌 Replace these two lines when your backend is ready
  ──────────────────────────────────────────────────────── */
  const BASE_URL = 'https://api.fiberneo.com/v1'; // 🔌 Your API base URL
  const FIBERNEO_REST_BASE = 'https://qa.visionwaves.com/apim/fiberneo/1.0/rest';
  const USE_MOCK = false;                          // use useMockApi() per request; ?mock=1 for local demo
  const TIMEOUT  = 10000;                          // 10 s default request timeout
  const FACILITY_VIEW_TIMEOUT = 45000;           // bundled facility + equipment + connectivity
  const BASIC_AUTH =  'Basic YmFzaWMuYXV0aDpCYXNpY0AxMjM0NQ==';

  /* ── REQUEST HEADERS ─────────────────────────────────── */
  function _headers() {
    const h = {
      'Content-Type': 'application/json',
      Accept         : 'application/json',
      Authorization  : BASIC_AUTH,
    };
    if (Config.token) h.Authorization = `Bearer ${Config.token}`;
    return h;
  }

  function _fiberneoHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept         : 'application/json',
      Authorization  : BASIC_AUTH,
    };
  }

  /* ── Fiberneo REST (equipment search, etc.) ───────────── */
  async function _fiberneoGet(pathAndQuery, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? TIMEOUT;
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${FIBERNEO_REST_BASE}${pathAndQuery}`, {
        method  : 'GET',
        headers : _fiberneoHeaders(),
        signal  : ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json();
    } catch (err) {
      clearTimeout(tid);
      throw err;
    }
  }

  async function _fiberneoPost(path, body) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(`${FIBERNEO_REST_BASE}${path}`, {
        method  : 'POST',
        headers : _fiberneoHeaders(),
        signal  : ctrl.signal,
        body    : JSON.stringify(body),
      });
      clearTimeout(tid);
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const errBody = await res.json();
          detail = errBody.message || errBody.error || JSON.stringify(errBody);
        } catch (_) { /* ignore */ }
        throw new Error(`HTTP ${res.status} — ${detail}`);
      }
      const text = await res.text();
      if (!text) return { success: true, status: res.status };
      try {
        return JSON.parse(text);
      } catch (_) {
        return { success: true, status: res.status };
      }
    } catch (err) {
      clearTimeout(tid);
      throw err;
    }
  }

  async function _fiberneoDelete(path, body) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), TIMEOUT * 2);
    try {
      const res = await fetch(`${FIBERNEO_REST_BASE}${path}`, {
        method  : 'DELETE',
        headers : _fiberneoHeaders(),
        signal  : ctrl.signal,
        body    : body != null ? JSON.stringify(body) : undefined,
      });
      clearTimeout(tid);
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const errBody = await res.json();
          detail = errBody.message || errBody.error || JSON.stringify(errBody);
        } catch (_) { /* ignore */ }
        throw new Error(`HTTP ${res.status} — ${detail}`);
      }
      const text = await res.text();
      if (!text) return { success: true };
      try { return JSON.parse(text); } catch (_) { return { success: true }; }
    } catch (err) {
      clearTimeout(tid);
      throw err;
    }
  }

  /**
   * POST /equipments body — latitude, longitude, status from siteInfoById;
   * facilityId included when site id is available.
   */
  function buildCreateEquipmentBody({ name, typeKey, noInPorts, noOutPorts }, siteFieldsOverride) {
    const siteFields = siteFieldsOverride || siteFieldsForEquipmentCreate();
    if (!siteFields) {
      throw new Error('Site latitude and longitude are missing for this facility');
    }

    const apiType = FIBERNEO_EQUIPMENT_TYPE[String(typeKey).trim()]
      || equipmentTypeForApi(typeKey);

    const body = {
      name,
      type      : apiType,
      noInPorts : Number(noInPorts) || 0,
      noOutPorts: Number(noOutPorts) || 0,
      latitude  : siteFields.latitude,
      longitude : siteFields.longitude,
      status    : siteFields.status,
    };

    const facilityId = getFacilityId();
    if (facilityId) body.facilityId = { id: facilityId };

    return body;
  }

  /* ── FETCH WRAPPER (timeout + error handling) ─────────── */
  async function _request(method, path, body) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers : _headers(),
        signal  : ctrl.signal,
        body    : body ? JSON.stringify(body) : undefined,
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json();
    } catch (err) {
      clearTimeout(tid);
      throw err;
    }
  }

  /* ── MOCK HELPERS ────────────────────────────────────── */
  const _delay = (ms = 650) => new Promise(r => setTimeout(r, ms));

  /* ── MOCK DATA ───────────────────────────────────────────
     These objects mirror the exact API response shapes.
     Remove when USE_MOCK = false.
  ──────────────────────────────────────────────────────── */

  /**
   * Response shape for GET /api/pop/{stationId}/overview
   */
  const MOCK_OVERVIEW = {
    station_id    : 'DEW001',
    station_name  : 'Dewas Railway Station',
    location      : 'Dewas, Madhya Pradesh',
    pop_type      : 'Intermediate',
    cable_type    : 'G.652D Single Mode',
    total_cores   : 24,
    in_cable      : 'DEWAS-FDMS-IN-01',
    out_cable     : 'DEWAS-FDMS-OUT-01',
    next_station  : 'Ujain Railway Station',
    next_station_id: 'UJN001',
  };

  /**
   * Response shape for GET /api/pop/{stationId}/cable-view
   *
   * equipment item:
   *   { id, name, type, in_ports, out_ports }
   *   type: 'rly' | 'dwdm' | 'sw' | 'amp'
   *
   * connection item:
   *   { id, src, dst, equipment_id, eq_in_port, eq_out_port, strand_index }
   *   src / dst format:  "in-A"  /  "out-A"
   *   equipment_id: null for direct connections
   */
  const MOCK_CABLE_VIEW = {
    equipment: [
      { id: 'rly1',  name: 'Railway Eq.', type: 'rly',  in_ports: 4, out_ports: 4 },
      { id: 'dwdm1', name: 'DWDM-01',     type: 'dwdm', in_ports: 2, out_ports: 2 },
      { id: 'sw1',   name: 'SWITCH-01',   type: 'sw',   in_ports: 2, out_ports: 2 },
    ],
    connections: [
      { id: 'c1',  src: 'in-A', dst: 'out-A', equipment_id: 'rly1',  eq_in_port: 'in1',  eq_out_port: 'out1',  strand_index: 0 },
      { id: 'c2',  src: 'in-B', dst: 'out-B', equipment_id: 'rly1',  eq_in_port: 'in2',  eq_out_port: 'out2',  strand_index: 1 },
      { id: 'c3',  src: 'in-C', dst: 'out-C', equipment_id: 'rly1',  eq_in_port: 'in3',  eq_out_port: 'out3',  strand_index: 2 },
      { id: 'c4',  src: 'in-D', dst: 'out-D', equipment_id: 'rly1',  eq_in_port: 'in4',  eq_out_port: 'out4',  strand_index: 3 },
      { id: 'c5',  src: 'in-E', dst: 'out-E', equipment_id: 'dwdm1', eq_in_port: 'in1',  eq_out_port: 'out1',  strand_index: 4 },
      { id: 'c6',  src: 'in-F', dst: 'out-F', equipment_id: 'dwdm1', eq_in_port: 'in2',  eq_out_port: 'out2',  strand_index: 5 },
      { id: 'c7',  src: 'in-G', dst: 'out-G', equipment_id: 'sw1',   eq_in_port: 'in1',  eq_out_port: 'out1',  strand_index: 6 },
      { id: 'c8',  src: 'in-H', dst: 'out-H', equipment_id: 'sw1',   eq_in_port: 'in2',  eq_out_port: 'out2',  strand_index: 7 },
      { id: 'c9',  src: 'in-I', dst: 'out-I', equipment_id: null,    eq_in_port: null,   eq_out_port: null,    strand_index: 8 },
      { id: 'c10', src: 'in-J', dst: 'out-J', equipment_id: null,    eq_in_port: null,   eq_out_port: null,    strand_index: 9 },
      { id: 'c11', src: 'in-K', dst: 'out-K', equipment_id: null,    eq_in_port: null,   eq_out_port: null,    strand_index: 10 },
      { id: 'c12', src: 'in-L', dst: 'out-L', equipment_id: null,    eq_in_port: null,   eq_out_port: null,    strand_index: 11 },
    ],
    total_ports: 24,
  };

  /* ── PUBLIC METHODS ───────────────────────────────────── */
  return {

    /**
     * GET /api/pop/{stationId}/overview
     * Returns POP location metadata.
     */
    async getOverview(stationId) {
      if (useMockApi()) { await _delay(500); return MOCK_OVERVIEW; }
      return _request('GET', `/pop/${stationId}/overview`);
    },

    /**
     * GET /api/pop/{stationId}/cable-view
     * Returns equipment list + all connections in one payload.
     * Fire this alongside getOverview() using Promise.all() for speed.
     */
    async getCableView(stationId) {
      if (useMockApi()) { await _delay(700); return MOCK_CABLE_VIEW; }
      return _request('GET', `/pop/${stationId}/cable-view`);
    },

    /**
     * GET /facilities/by-facility/{facilityId}
     * Fresh site + equipments + equipmentConnectivities after create/delete.
     */
    async getFacilityCableView(facilityId) {
      const fid = facilityId != null ? String(facilityId) : getFacilityId();
      if (!fid) throw new Error('Facility id is missing');

      const enc  = encodeURIComponent(fid);
      const data = await _fiberneoGet(
        `/facilities/by-facility/${enc}`,
        { timeoutMs: FACILITY_VIEW_TIMEOUT },
      );

      const list = Array.isArray(data)
        ? data
        : (data?.content ?? data?.data ?? data?.results ?? []);
      const facility = Array.isArray(list) ? list[0] : data;
      if (!facility || typeof facility !== 'object') {
        throw new Error('Facility not found');
      }
      return facility;
    },

    /**
     * GET /facilities/{facilityId}
     * Site metadata (latitude, longitude, workflowStage) for equipment create.
     */
    async getFacilitySiteMeta(facilityId) {
      const fid = facilityId != null ? String(facilityId) : getFacilityId();
      if (!fid) throw new Error('Facility id is missing');
      const enc = encodeURIComponent(fid);
      return _fiberneoGet(`/facilities/${enc}`, { timeoutMs: FACILITY_VIEW_TIMEOUT });
    },

    clearConnectivityCache() {},

    /**
     * POST /equipments — Fiberneo create equipment
     * Body: { name, type, noInPorts, noOutPorts, latitude, longitude, status, facilityId }
     */
    async createEquipment(body) {
      const data = await _fiberneoPost('/equipments', body);
      if (!data || data.id == null) return { success: true, status: data?.status ?? 201 };
      return mapEquipmentFromApi(data);
    },

    /**
     * POST equipment — live Fiberneo when site id present, else mock
     * payload: { name, type, in_ports, out_ports }  (type = form key rly|dwdm|sw|amp)
     */
    async addEquipment(stationId, payload) {
      if (useFiberneoLive() || getFacilityId() || siteFieldsForEquipmentCreate()) {
        const siteFields = await ensureSiteFieldsForEquipmentCreate();
        if (!siteFields) {
          throw new Error(
            'Site latitude/longitude missing — set siteInfoById.latitude & .longitude or facility id',
          );
        }
        const body = buildCreateEquipmentBody({
          name      : payload.name,
          typeKey   : payload.type,
          noInPorts : payload.in_ports ?? payload.noInPorts,
          noOutPorts: payload.out_ports ?? payload.noOutPorts,
        }, siteFields);
        return this.createEquipment(body);
      }

      if (useMockApi()) {
        await _delay(400);
        return mapEquipmentFromApi({
          id         : String(Date.now()),
          name       : payload.name,
          type       : equipmentTypeForApi(payload.type),
          noInPorts  : payload.in_ports ?? payload.noInPorts ?? 2,
          noOutPorts : payload.out_ports ?? payload.noOutPorts ?? 2,
          status     : 'Proposed',
        });
      }
      return _request('POST', `/pop/${stationId}/equipment`, payload);
    },

    /**
     * DELETE /equipments/{equipmentId} — Fiberneo remove equipment
     */
    async deleteEquipmentFiberneo(equipmentId) {
      const id = encodeURIComponent(String(equipmentId));
      return _fiberneoDelete(`/equipments/${id}`);
    },

    /**
     * DELETE equipment — Fiberneo when site id present, else mock / legacy API
     */
    async deleteEquipment(stationId, equipmentId) {
      if (useFiberneoLive()) {
        return this.deleteEquipmentFiberneo(equipmentId);
      }
      if (useMockApi()) { await _delay(300); return { success: true }; }
      return _request('DELETE', `/pop/${stationId}/equipment/${equipmentId}`);
    },

    /**
     * POST /equipment-connectivity — single hop (IN-FDMS → equipment, etc.)
     * Body: { sourceEquipmentId, sourcePortId, targetEquipmentId, targetPortId,
     *         connectionType, status }
     */
    async createEquipmentConnectivity(body) {
      return _fiberneoPost('/equipment-connectivity', body);
    },

    /**
     * Connect wizard: one or more equipment-connectivity hops (live Fiberneo).
     */
    async saveConnectWizard(connectState) {
      const bodies = buildConnectHopsFromWizard(connectState);
      const created = [];
      for (const body of bodies) {
        const res = await this.createEquipmentConnectivity(body);
        created.push(res);
      }
      return { hops: created, bodies, count: created.length };
    },

    /**
     * POST /api/pop/{stationId}/connection (legacy mock / cable-view API)
     * Body   : { src, dst, equipment_id, eq_in_port, eq_out_port, strand_index }
     */
    async saveConnection(stationId, payload) {
      if (useFiberneoLive()) {
        return this.saveConnectWizard({
          mode      : payload.mode || 'in-hop',
          srcPort   : payload.src,
          dstPort   : payload.dst,
          eqId      : payload.equipment_id,
          dstEqId   : payload.dst_equipment_id,
          eqInPort  : payload.eq_in_port,
          eqInCode  : payload.eq_in_code,
          eqOutPort : payload.eq_out_port,
          eqOutCode : payload.eq_out_code,
        });
      }
      if (useMockApi()) {
        await _delay(400);
        return { ...payload, id: 'c' + Date.now() };
      }
      return _request('POST', `/pop/${stationId}/connection`, payload);
    },

    /**
     * DELETE /api/pop/{stationId}/connection/{connectionId}
     * Returns: { success: true }
     */
    async deleteConnection(stationId, connectionId) {
      if (useMockApi()) { await _delay(300); return { success: true }; }
      return _request('DELETE', `/pop/${stationId}/connection/${connectionId}`);
    },

    /**
     * DELETE /equipment-connectivity
     * Body: { sourceEquipmentId, sourcePortId, targetEquipmentId, targetPortId }
     * (one hop per request; multiple hops deleted sequentially)
     */
    async deleteEquipmentConnectivity(apiRecords) {
      const list = Array.isArray(apiRecords) ? apiRecords : [apiRecords];
      if (!list.length) throw new Error('No connectivity record to delete');

      const payloads = list.map((rec) => buildDeleteConnectivityPayload(rec));
      if (payloads.length === 1) {
        return _fiberneoDelete('/equipment-connectivity', payloads[0]);
      }

      const results = [];
      for (const payload of payloads) {
        results.push(await _fiberneoDelete('/equipment-connectivity', payload));
      }
      return results;
    },

  };

})();
/**
 * theme.js  —  Light / dark theme management
 *
 * Theme is driven by the  data-theme  attribute on <html>.
 * Loaded from Config.theme (URL query param ?theme=dark|light).
 * User can also toggle via the 🌙/☀️ button in the topbar.
 *
 * Flutter WebView integration:
 *   To force a theme from Flutter, call:
 *     webViewController.runJavascriptReturningResult('Theme.apply("light")');
 */

const Theme = {
  current   : 'light',
  _storageKey: 'cableview-theme-v2',

  /** URL ?theme= wins, then localStorage, else light default */
  _readInitial() {
    const fromUrl = new URLSearchParams(window.location.search).get('theme');
    if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) { /* private / iframe */ }
    return 'light';
  },

  /** Apply a theme: 'dark' or 'light' */
  apply(t) {
    if (t !== 'light' && t !== 'dark') return;
    this.current = t;
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
    try { localStorage.setItem(this._storageKey, t); } catch (_) {}

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.textContent = t === 'dark' ? '🌙' : '☀️';
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = t === 'dark' ? 'Light mode' : 'Dark mode';
    });
  },

  /** Toggle between dark and light */
  toggle() {
    this.apply(this.current === 'dark' ? 'light' : 'dark');
  },

  /** Call once on page load */
  init() {
    this.apply(this._readInitial());
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    });
  },
};

window.Theme = Theme;

/** Required markup roots before any Render.* innerHTML updates */
const RENDER_ROOT_IDS = ['tb-info', 'stat-strip', 'main-wrap', 'port-list'];

function renderDomReady() {
  return RENDER_ROOT_IDS.every((id) => document.getElementById(id));
}

function setInnerHtml(id, html) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.innerHTML = html;
  return true;
}

/** Wait until Fiberneo / Angular has injected the cable-view template */
function whenRenderDomReady(fn, attempts = 600) {
  const tick = (left) => {
    if (renderDomReady()) {
      fn();
      return;
    }
    if (left <= 0) {
      const missing = RENDER_ROOT_IDS.filter((id) => !document.getElementById(id));
      console.warn('[Cable view] DOM not ready yet — still waiting:', missing);
      State.loading = true;
      if (typeof Render !== 'undefined') Render.setLoader(true);
      requestAnimationFrame(() => tick(200));
      return;
    }
    requestAnimationFrame(() => tick(left - 1));
  };
  tick(attempts);
}

/** Build detail payload for diagram line click (shown in connection sheet) */
function diagramLineMetaInFdmsToEqIn(lk, toEq) {
  const fromCode = _trimStr(lk.fromCode);
  const fdmsKey = fromCode
    ? fdmsPortKeyForCode('in', fromCode)
    : fdmsInPortKeyFromIndex(lk.fromIndex);
  const fdmsLbl = fromCode || (fdmsKey ? fdmsInLabelFromPortKey(fdmsKey) : `IN ${lk.fromIndex}`);
  const toCode = _trimStr(lk.toCode) || eqPortDisplayLabel(toEq, 'in', lk.toIndex) || `IN ${lk.toIndex}`;
  const fullConn = fdmsKey ? getInFdmsPortConnection(fdmsKey) : null;
  const rows = [
    { label: 'Connection Type', value: 'IN-FDMS → Equipment IN' },
    { label: 'IN-FDMS Port', value: fdmsLbl },
    { label: 'Equipment', value: toEq.name },
    { label: 'Equipment IN Port', value: toCode },
  ];
  if (fullConn?.eq_out_code) {
    rows.push({ label: 'Equipment OUT Port', value: fullConn.eq_out_code });
  }
  if (fullConn?.dst) {
    rows.push({
      label: 'OUT-FDMS Port',
      value: fullConn.dst_fdms_code || fdmsOutLabelFromPortKey(fullConn.dst),
    });
  }
  if (lk.strandColor) rows.push({ label: 'Strand Color', value: lk.strandColor });
  else if (fullConn?.strand_index != null) {
    rows.push({ label: 'Strand', value: strandBadge(fullConn.strand_index), html: true });
  }
  return {
    type: 'in-fdms-to-eq-in',
    title: `${fdmsLbl} → ${toEq.name}`,
    subtitle: 'IN-FDMS → Equipment IN',
    chips: [
      { kind: 'src', text: fdmsLbl },
      { kind: 'via', text: toEq.name },
      { kind: 'dst', text: toCode },
    ],
    rows,
    removePayload: fullConn ? {
      kind: 'in-fdms',
      connId: fullConn.id,
      srcPort: fullConn.src,
    } : null,
  };
}

function diagramLineMetaEqOutToOutFdms(fromEq, lkOrConn) {
  const isConn = lkOrConn && lkOrConn.src != null;
  const outSlot = isConn
    ? parseInt(String(lkOrConn.eq_out_port || '').replace(/\D/g, ''), 10)
    : lkOrConn.fromIndex;
  const fromCode = _trimStr(isConn ? lkOrConn.eq_out_code : lkOrConn.fromCode)
    || (Number.isFinite(outSlot) ? eqPortDisplayLabel(fromEq, 'out', outSlot) : '');
  const outFdmsCode = isConn
    ? (lkOrConn.dst_fdms_code || fdmsOutLabelFromPortKey(lkOrConn.dst))
    : _trimStr(lkOrConn.toCode);
  const outFdmsLbl = outFdmsCode
    || (isConn && lkOrConn.dst ? fdmsOutLabelFromPortKey(lkOrConn.dst) : `OUT ${lkOrConn.toIndex || ''}`);
  const fullConn = isConn
    ? lkOrConn
    : (() => {
      const key = outFdmsCode ? fdmsPortKeyForCode('out', outFdmsCode) : null;
      if (!key) return null;
      return State.connections.find((c) => c.dst === key
        && String(c.equipment_id) === String(fromEq.id)) || null;
    })();
  const rows = [
    { label: 'Connection Type', value: 'Equipment OUT → OUT-FDMS' },
  ];
  if (fullConn?.src) {
    rows.push({ label: 'IN-FDMS Port', value: fdmsInLabelFromPortKey(fullConn.src) });
  }
  if (fullConn?.eq_in_code) {
    rows.push({ label: 'Equipment IN Port', value: fullConn.eq_in_code });
  }
  rows.push(
    { label: 'Equipment', value: fromEq.name },
    { label: 'Equipment OUT Port', value: fromCode || '—' },
    { label: 'OUT-FDMS Port', value: outFdmsLbl },
  );
  const strandColor = isConn ? null : lkOrConn.strandColor;
  if (strandColor) rows.push({ label: 'Strand Color', value: strandColor });
  else if (fullConn?.strand_index != null) {
    rows.push({ label: 'Strand', value: strandBadge(fullConn.strand_index), html: true });
  }
  const hopConn = State.connections.find((c) => c.linkRole === 'eq-out-to-fdms'
    && String(c.equipment_id) === String(fromEq.id)
    && _trimStr(c.eq_out_code) === fromCode
    && (!_trimStr(outFdmsLbl) || _trimStr(c.dst_fdms_code) === outFdmsLbl
      || fdmsOutLabelFromPortKey(c.dst) === outFdmsLbl));

  return {
    type: 'eq-out-to-out-fdms',
    title: `${fromEq.name} → ${outFdmsLbl}`,
    subtitle: 'Equipment OUT → OUT-FDMS',
    chips: [
      { kind: 'via', text: fromEq.name },
      { kind: 'dst', text: outFdmsLbl },
    ],
    rows,
    removePayload: (fromCode && outFdmsLbl) ? {
      kind: 'eq-out-fdms',
      fromEqId: String(fromEq.id),
      fromOutCode: fromCode,
      toOutFdmsCode: outFdmsCode || outFdmsLbl,
      hopConnId: hopConn?.id || null,
    } : null,
  };
}

function diagramLineMetaEqOutToEqIn(lk, fromEq, toEq) {
  const fromCode = _trimStr(lk.fromCode) || eqPortDisplayLabel(fromEq, 'out', lk.fromIndex) || `OUT ${lk.fromIndex}`;
  const toCode = _trimStr(lk.toCode) || eqPortDisplayLabel(toEq, 'in', lk.toIndex) || `IN ${lk.toIndex}`;
  const rows = [
    { label: 'Connection Type', value: 'Equipment OUT → Equipment IN' },
    { label: 'From Equipment', value: fromEq.name },
    { label: 'OUT Port', value: fromCode },
    { label: 'To Equipment', value: toEq.name },
    { label: 'IN Port', value: toCode },
  ];
  if (lk.strandColor) rows.push({ label: 'Strand Color', value: lk.strandColor });
  return {
    type: 'eq-out-to-eq-in',
    title: `${fromEq.name} → ${toEq.name}`,
    subtitle: 'Equipment OUT → Equipment IN',
    chips: [
      { kind: 'via', text: fromEq.name },
      { kind: 'dst', text: `${toEq.name} (${toCode})` },
    ],
    rows,
    removePayload: {
      kind: 'eq-hop',
      lk: {
        fromEqId: String(lk.fromEqId),
        toEqId: String(lk.toEqId),
        fromSide: lk.fromSide,
        toSide: lk.toSide,
        fromCode: lk.fromCode || fromCode,
        toCode: lk.toCode || toCode,
        fromIndex: lk.fromIndex,
        toIndex: lk.toIndex,
      },
    },
  };
}

function diagramLineMetaEqInToEqOut(eq, link) {
  const inCode = _trimStr(link.inCode) || eqPortDisplayLabel(eq, 'in', link.in) || `IN ${link.in}`;
  const outCode = _trimStr(link.outCode) || eqPortDisplayLabel(eq, 'out', link.out) || `OUT ${link.out}`;
  const rows = [
    { label: 'Connection Type', value: 'Equipment IN → Equipment OUT' },
    { label: 'Equipment', value: eq.name },
    { label: 'IN Port', value: inCode },
    { label: 'OUT Port', value: outCode },
  ];
  if (link.strandColor) rows.push({ label: 'Strand Color', value: link.strandColor });
  return {
    type: 'eq-in-to-eq-out',
    title: `${eq.name} internal`,
    subtitle: 'Equipment IN → OUT (same device)',
    chips: [
      { kind: 'via', text: eq.name },
      { kind: 'dst', text: `${inCode} → ${outCode}` },
    ],
    rows,
  };
}

function diagramLineMetaInFdmsToOutFdms(lk) {
  const fromCode = _trimStr(lk.fromCode);
  const toCode = _trimStr(lk.toCode);
  const fdmsKey = fromCode
    ? fdmsPortKeyForCode('in', fromCode)
    : fdmsInPortKeyFromIndex(lk.fromIndex);
  const fdmsLbl = fromCode || (fdmsKey ? fdmsInLabelFromPortKey(fdmsKey) : `IN ${lk.fromIndex}`);
  const outKey = toCode
    ? fdmsPortKeyForCode('out', toCode)
    : fdmsOutPortKeyFromIndex(lk.toIndex);
  const outLbl = toCode || (outKey ? fdmsOutLabelFromPortKey(outKey) : `OUT ${lk.toIndex}`);
  let fullConn = fdmsKey ? getInFdmsPortConnection(fdmsKey) : null;
  if (!fullConn && outKey) {
    fullConn = State.connections.find((c) => !c.equipment_id && c.dst === outKey
      && (c.linkRole === 'direct-fdms' || c.linkRole === 'fdms-out-to-in')) || null;
  }
  const rows = [
    { label: 'Connection Type', value: 'IN-FDMS → OUT-FDMS (direct)' },
    { label: 'IN-FDMS Port', value: fdmsLbl },
    { label: 'OUT-FDMS Port', value: outLbl },
  ];
  if (fullConn?.strand_index != null) {
    rows.push({ label: 'Strand', value: strandBadge(fullConn.strand_index), html: true });
  } else if (lk.strandColor) {
    rows.push({ label: 'Strand Color', value: lk.strandColor });
  }
  const inFdmsCode = fromCode || (fdmsKey ? fdmsInLabelFromPortKey(fdmsKey) : null);
  const outFdmsCode = toCode || (outKey ? fdmsOutLabelFromPortKey(outKey) : null);
  const removePayload = fullConn
    ? { kind: 'in-fdms', connId: fullConn.id, srcPort: fullConn.src }
    : (inFdmsCode && outFdmsCode ? {
      kind: 'direct-fdms',
      inCode: inFdmsCode,
      outCode: outFdmsCode,
      lk,
    } : null);
  return {
    type: 'in-fdms-to-out-fdms',
    title: `${fdmsLbl} → ${outLbl}`,
    subtitle: 'Direct pass-through',
    chips: [
      { kind: 'src', text: fdmsLbl },
      { kind: 'dst', text: outLbl },
    ],
    rows,
    connId: fullConn?.id,
    srcPort: fullConn?.src,
    removePayload,
  };
}

function bindDiagramLineClickContainer(container) {
  if (!container || container._diagLineClickBound) return;
  container._diagLineClickBound = true;
  container.addEventListener('click', (e) => {
    const hit = e.target.closest?.('.diag-conn-line-hit');
    if (!hit?._lineMeta) return;
    e.preventDefault();
    e.stopPropagation();
    Sheets.openLineDetail(hit._lineMeta);
  });
}

/**
 * render.js  —  All DOM rendering functions
 */

const Render = {

  /* ── TOPBAR ─────────────────────────────────────────── */
  topbar() {
    const ov = State.overview;
    if (!ov) return;
    const sub = overviewSubtitle(ov) || ov.location || '';
    const info = document.getElementById('tb-info');
    if (!info) return;
    info.innerHTML = `<h2>${escapeHtml(ov.station_name)}</h2>`;
    if (sub) {
      const p = document.createElement('p');
      p.className = 'tb-sub';
      p.textContent = sub;
      p.setAttribute('data-tip', sub);
      p.setAttribute('title', sub);
      p.setAttribute('aria-label', sub);
      const markTruncated = () => {
        const truncated = p.scrollWidth > p.clientWidth + 1;
        p.classList.toggle('is-truncated', truncated);
        if (!truncated) p.removeAttribute('title');
        else p.setAttribute('title', sub);
      };
      p.addEventListener('click', () => {
        if (window.innerWidth <= 1024 && p.classList.contains('is-truncated')) {
          showToast(sub, 3500);
        }
      });
      info.appendChild(p);
      requestAnimationFrame(markTruncated);
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(markTruncated);
        ro.observe(p);
        p._tbSubRo = ro;
      } else {
        window.addEventListener('resize', markTruncated, { passive: true });
      }
    }
    document.title = `${ov.station_name} — Fiberneo`;
  },

  /* ── STAT STRIP ─────────────────────────────────────── */
  stats() {
    const connected = State.connections.length;
    const direct    = State.connections.filter(c => !c.equipment_id).length;
    const free      = State.totalPorts - connected;
    if (!setInnerHtml('stat-strip', `
      <div class="stat-pill c-blue">  <span class="sv">${State.totalPorts}</span><span class="sl">Total</span></div>
      <div class="stat-pill c-green"> <span class="sv">${connected}</span>       <span class="sl">Connected</span></div>
      <div class="stat-pill c-red">   <span class="sv">${free}</span>            <span class="sl">Free</span></div>
      <div class="stat-pill c-purple"><span class="sv">${equipmentForListPanel().length}</span><span class="sl">Equipment</span></div>
      <div class="stat-pill c-yellow"><span class="sv">${direct}</span>          <span class="sl">Direct</span></div>`)) return;
  },

  /* ── PORT LIST ───────────────────────────────────────── */
  portList() {
    const slots = getFdmsInColumnSlots();
    const connected = [];
    const free = [];

    slots.forEach((slot) => {
      const conn = getInFdmsPortConnection(slot.portKey);
      (conn ? connected : free).push({ ...slot, conn });
    });

    connected.sort((a, b) => compareFdmsPortCodes(a.label, b.label));
    free.sort((a, b) => compareFdmsPortCodes(a.label, b.label));
    const ordered = [...connected, ...free];

    const el = document.getElementById('list-count');
    if (el) el.textContent = `${connected.length} / ${slots.length} used`;

    let html = '';
    ordered.forEach(({ portKey, label, conn }) => {
      if (conn) {
        const eq     = findEquipmentById(conn.equipment_id);
        const s      = STRANDS[conn.strand_index % 12];
        const cls    = eqClassOf(conn.equipment_id);
        const selCls = (Connect.state.active && Connect.state.mode === 'in-hop'
          && Connect.state.step === 1 && Connect.state.srcPort === portKey)
          ? 'sel-src' : '';
        html += `
          <div class="port-card connected ${selCls}" data-in-port="${portKey}">
            <div class="plb plb-code ${cls}" data-len="${plbCodeSizeAttr(label)}" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
            <div class="pci">
              <div class="pci-path">${buildPortListPathHtml(conn, label, eq, cls)}</div>
              <div class="pci-sub">${buildPortListSubHtml(conn, s)}</div>
            </div>
            <span class="pc-arrow" aria-hidden="true">›</span>
          </div>`;
      } else {
        const pickCls = (!Connect.directConnect && Connect.state.active
          && (Connect.state.mode === 'in-hop' || Connect.state.mode === 'unified')
          && Connect.state.step === 1) ? ' connect-pickable' : '';
        html += `
          <div class="port-card free${pickCls}" data-in-port="${portKey}">
            <div class="plb plb-code plb-free" data-len="${plbCodeSizeAttr(label)}" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
            <div class="pci">
              <div class="pci-path pci-path--muted">${escapeHtml(label)} — Not connected</div>
              <div class="pci-sub">Tap to connect</div>
            </div>
            <span class="free-badge">FREE</span>
          </div>`;
      }
    });
    if (!setInnerHtml('port-list', html)) return;

    const ov = State.overview;
    if (ov) {
      const ce = document.getElementById('cable-exit');
      if (ce) {
        if (ov.next_station) {
          const cores = ov.total_cores || State.totalPorts;
          document.getElementById('ce-title').textContent =
            `${cores} Core Cable → ${ov.next_station}`;
          ce.style.display = '';
        } else {
          ce.style.display = 'none';
        }
      }
    }
  },

  portTap(portId) {
    if (Connect.directConnect) {
      Connect._beginInHopFromPort(portId);
      return;
    }
    if (Connect.state.active
      && (Connect.state.mode === 'in-hop' || Connect.state.mode === 'unified')) {
      Connect.portTap(portId);
    } else if (getInFdmsPortConnection(portId)) {
      Sheets.openPortDetail(portId);
    } else {
      Connect._beginInHopFromPort(portId);
    }
  },

  outPortTap(portId) {
    if (!portId?.startsWith('out-')) return;
    if (Connect.state.active
      && Connect.state.mode === 'out-hop'
      && Connect.state.step === 2
      && Connect._outHopSourceReady()) {
      if (!isOutFdmsPortTaken(portId)) Connect._selectDst(portId);
      return;
    }
    if (Connect.directConnect) {
      Connect._beginOutFdmsHopFromPort(portId);
      return;
    }
    if (isOutFdmsPortTaken(portId)) {
      showToast('Port already connected — tap to view details');
      return;
    }
    Connect._beginOutFdmsHopFromPort(portId);
  },

  /* ── EQUIPMENT LIST ──────────────────────────────────── */
  equipList() {
    const listEq = equipmentForListPanel();
    const el = document.getElementById('equip-count');
    if (el) el.textContent = `${listEq.length} installed`;

    if (!listEq.length) {
      setInnerHtml('equip-list', `
        <div class="empty-state">
          <div class="esi">📭</div>
          <h3>No Equipment</h3>
          <p>No equipment installed at this POP yet.</p>
        </div>`);
      return;
    }

    let html = '';
    listEq.forEach(eq => {
      const meta  = EQ_META[eq.type] || EQ_META.sw;
      const typeLabel = eq.type_label || meta.label;
      const connCount = equipmentConnectivityCount(eq);
      let portsHtml = '';

      getAllCenterEquipmentPortSlots(eq).forEach(({ slot, label, side }) => {
        const cell = getEquipListPortCell(eq, side, slot);
        if (!cell.used) return;
        portsHtml += `<div class="eq-port-cell used">
            <span class="epc-lbl">${escapeHtml(label)}</span>
            <span class="epc-val">${escapeHtml(cell.value)}${strandDotHtml(cell.strandColor)}</span>
          </div>`;
      });
      html += `
        <div class="eq-card ${eq.type}" data-eq-id="${escapeHtml(eq.id)}" role="button" tabindex="0">
          <div class="eq-card-hdr">
            <div class="eq-icon ${eq.type}">${meta.icon}</div>
            <div>
              <h4>${escapeHtml(eq.name)}</h4>
              <p>${escapeHtml(typeLabel)} · ${getAllCenterEquipmentPortSlots(eq).length} · ${connCount} connection${connCount !== 1 ? 's' : ''}</p>
            </div>
            <span class="eq-chev">›</span>
          </div>
          ${portsHtml ? `<div class="eq-port-grid">${portsHtml}</div>` : ''}
        </div>`;
    });
    setInnerHtml('equip-list', html);
  },

  /* ── DIAGRAM (main) ──────────────────────────────────── */
  diagram() {
    this.diagramInto('d-in', 'd-eq', 'd-out');
    scheduleDiagramLinesRedraw();
  },

  /**
   * Renders port columns + equipment into given element IDs.
   * Used for main diagram and fullscreen overlay.
   * @param {string} inId   - id of IN-FDMS d-col-body element
   * @param {string} eqId   - id of d-eq-col element
   * @param {string} outId  - id of OUT-FDMS d-col-body element
   */
  diagramInto(inId, eqId, outId) {
    const inEl  = document.getElementById(inId);
    const eqEl  = document.getElementById(eqId);
    const outEl = document.getElementById(outId);
    if (!inEl || !eqEl || !outEl) return;

    inEl.innerHTML = ''; eqEl.innerHTML = ''; outEl.innerHTML = '';

    getFdmsInColumnSlots().forEach(({ portKey, label }) => {
      const conn    = getInFdmsPortConnection(portKey);
      const cls     = conn ? eqClassOf(conn.equipment_id) : '';
      const pickCls = (!Connect.directConnect && Connect.state.active
        && (Connect.state.mode === 'in-hop' || Connect.state.mode === 'unified')
        && Connect.state.step === 1 && !conn) ? ' pickable' : '';
      const lbl     = escapeHtml(label);
      inEl.innerHTML += `<div class="d-port d-port-fdms ${cls}${pickCls}" id="${inId}__${portKey}"
                               data-in-port="${portKey}" title="${lbl}">${lbl}</div>`;
    });

    const outHopStep2 = Connect.state.active
      && Connect.state.mode === 'out-hop'
      && Connect.state.step === 2;
    getFdmsOutColumnSlots().forEach(({ portKey, label }) => {
      const oconn   = State.connections.find(c => c.dst === portKey);
      const ocls    = oconn ? eqClassOf(oconn.equipment_id) : '';
      const outPick = (!Connect.directConnect && outHopStep2 && !oconn) ? ' pickable' : '';
      const lbl     = escapeHtml(label);
      outEl.innerHTML += `<div class="d-port d-port-fdms ${ocls}${outPick}" id="${outId}__${portKey}"
                               data-out-port="${portKey}" title="${lbl}">${lbl}</div>`;
    });

    State.equipment.filter(isDiagramCenterEquipment).forEach(eq => {
      const meta = EQ_META[eq.type] || EQ_META.sw;
      const eqTitle = escapeHtml(eq.name);
      const pc = getEqPortConnectivity(eq.id);
      let ips = '', ops = '';

      const srcEqId = Connect.state.eqId;
      const eqHopStep1 = Connect.state.active && Connect.state.mode === 'eq-hop' && Connect.state.step === 1;
      const eqHopStep2 = Connect.state.active && Connect.state.mode === 'eq-hop' && Connect.state.step === 2;
      const outHopStep1 = Connect.state.active
        && (Connect.state.mode === 'unified' || Connect.state.mode === 'out-hop' || Connect.state.mode === 'eq-hop')
        && Connect.state.step === 1;
      const eqHopTargetPick = eqHopStep2 && srcEqId && String(eq.id) !== String(srcEqId);

      getDiagramEquipmentPortSlots(eq, 'in').forEach(({ slot, label }) => {
        const p = diagramEqPortCell(eq, 'in', slot);
        const usedCls = p?.connected ? ' used' : '';
        const inPickCls = (!Connect.directConnect && (eqHopStep1 || eqHopTargetPick)) ? ' pickable' : '';
        const inLbl = escapeHtml(label);
        const tip = p?.connected ? escapeHtml(p.label) : inLbl;
        const portApiId = eq.ports_by_slot?.in?.[slot]?.id || '';
        ips += `<div class="d-eq-port${usedCls}${inPickCls}" id="${eqId}__${eq.id}__in${slot}"
                     data-eq-id="${attrEsc(eq.id)}" data-eq-side="in" data-eq-slot="${slot}"
                     data-eq-in-code="${attrEsc(label)}"
                     data-eq-port-id="${attrEsc(portApiId)}"
                     title="${tip}"><span class="d-eq-port-code">${inLbl}</span></div>`;
      });
      getDiagramEquipmentPortSlots(eq, 'out').forEach(({ slot, label }) => {
        const p = diagramEqPortCell(eq, 'out', slot);
        const usedCls = p?.connected ? ' used' : '';
        const outPickCls = (!Connect.directConnect && (outHopStep1 || eqHopTargetPick)) ? ' pickable' : '';
        const outLbl = escapeHtml(label);
        const tip = p?.connected ? escapeHtml(p.label) : outLbl;
        const portApiId = eq.ports_by_slot?.out?.[slot]?.id || '';
        ops += `<div class="d-eq-port${usedCls}${outPickCls}" id="${eqId}__${eq.id}__out${slot}"
                     data-eq-id="${attrEsc(eq.id)}" data-eq-side="out" data-eq-slot="${slot}"
                     data-eq-out-code="${attrEsc(label)}"
                     data-eq-port-id="${attrEsc(portApiId)}"
                     title="${tip}"><span class="d-eq-port-code">${outLbl}</span></div>`;
      });
      const portCount = (ips ? ips.match(/d-eq-port/g) : null)?.length || 0
        + ((ops ? ops.match(/d-eq-port/g) : null)?.length || 0);
      const expanded = isDiagramEqExpanded(eq.id);
      const expandCls = expanded ? ' d-eq-expanded' : '';
      const expandBtn = portCount > 0
        ? `<button type="button" class="d-eq-expand-btn" data-action="diagram-eq-expand"
             data-eq-id="${attrEsc(eq.id)}" aria-expanded="${expanded ? 'true' : 'false'}"
             aria-label="${expanded ? 'Collapse' : 'Expand'}"
             title="${expanded ? 'Collapse' : 'Expand'}">${expanded ? '▴' : '⤢'}</button>`
        : '';
      eqEl.innerHTML += `
        <div class="d-eq ${eq.type}${expandCls}" id="${eqId}__${eq.id}" data-eq-id="${attrEsc(eq.id)}" role="button" tabindex="0">
          <div class="d-eq-hdr">
            <div class="d-eq-icon">${meta.icon}</div>
            <div class="d-eq-name">${eqTitle}</div>
            ${expandBtn}
          </div>
          <div class="d-eq-ports-section d-eq-ports-in">
            <div class="d-eq-ports">${ips}</div>
          </div>
          <div class="d-eq-divider"></div>
          <div class="d-eq-ports-section d-eq-ports-out">
            <div class="d-eq-ports">${ops}</div>
          </div>
        </div>`;
    });

    const wrap = eqEl.closest('[id^="diag-wrap"]');
    const isFs = wrap?.id === 'diag-wrap-fs';
    const drawOnce = () => {
      if (isFs) Render.drawLinesIn('diag-wrap-fs', 'd-in-fs', 'd-eq-fs', 'd-out-fs');
      else Render.drawLines();
    };
    bindDiagramEqPortsScroll(wrap, drawOnce);
    if (typeof App !== 'undefined' && App._syncDiagramScrollExtent) {
      requestAnimationFrame(() => {
        App._syncDiagramScrollExtent(wrap?.id || 'diag-wrap');
      });
    }
  },

  /* ── DRAW SVG LINES (main diagram) ───────────────────── */
  drawLines() {
    this.drawLinesIn('diag-wrap', 'd-in', 'd-eq', 'd-out');
  },

  /**
   * Draw bezier curves for all connections.
   *
   * KEY DESIGN: The SVG overlay is placed in the PARENT of diag-wrap
   * (i.e. diag-scroll / fs-body), which is NEVER scaled. This means
   * getBoundingClientRect() coordinates (always in viewport space) can be
   * mapped directly to SVG space by subtracting the container's rect —
   * no division by zoom scale needed, and lines stay accurate at any zoom.
   *
   * @param {string} wrapId  - the .diag-wrap element id (the scaled element)
   * @param {string} inPfx   - ID prefix for IN-FDMS port elements
   * @param {string} eqPfx   - ID prefix for equipment elements
   * @param {string} outPfx  - ID prefix for OUT-FDMS port elements
   */
  drawLinesIn(wrapId, inPfx, eqPfx, outPfx) {
    inPfx  = inPfx  || 'd-in';
    eqPfx  = eqPfx  || 'd-eq';
    outPfx = outPfx || 'd-out';

    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    // SVG overlay lives in the scroll container (not inside zoomed wrap)
    const container = wrap.closest('.diag-scroll-inner, .diag-scroll, .fs-body');
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft || 0;
    const scrollTop  = container.scrollTop  || 0;

    // Create or reuse the SVG overlay (child of container, not wrap)
    let ov = document.getElementById(`ov__${wrapId}`);
    if (!ov) {
      ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ov.id = `ov__${wrapId}`;
      ov.style.cssText =
        'position:absolute;top:0;left:0;pointer-events:none;z-index:10;overflow:visible;';
      // container must be relatively positioned
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(ov);
    }
    // Size SVG to container's scroll area
    ov.setAttribute('width',  container.scrollWidth);
    ov.setAttribute('height', container.scrollHeight);
    ov.innerHTML = '';
    bindDiagramLineClickContainer(container);

    /**
     * Convert an element's viewport rect edge to SVG/container coordinates.
     * We add scrollLeft/scrollTop because the container may be scrolled.
     */
    const mapCtx = { cRect, scrollLeft, scrollTop };
    const toX = (rect, side) =>
      (side === 'right' ? rect.right : rect.left) - cRect.left + scrollLeft;
    const toY = (rect) =>
      rect.top - cRect.top + rect.height / 2 + scrollTop;

    const resolveEqPortEl = (eqId, conn) => {
      const srcSide = connectionEquipSourceSide(conn);
      const sideKey = srcSide === 'in' ? 'IN' : 'OUT';
      const portRef = connectionEquipSourcePortRef(conn);
      const code = connectionEquipSourceCode(conn);
      const slot = parseInt(String(portRef || '').replace(/\D/g, ''), 10);
      return findDiagramEqPortEl(eqId, sideKey, {
        code,
        slot: Number.isFinite(slot) ? slot : null,
        eqPfx,
      });
    };

    /* Center equipment port → OUT-FDMS (full path may also include IN-FDMS → center via crossLinks) */
    State.connections.forEach(conn => {
      if (!conn.dst || !conn.equipment_id || !connectionEquipSourcePortRef(conn)) return;
      if (conn.linkRole === 'fdms-out-to-eq-out') return;

      const outEl = document.getElementById(`${outPfx}__${conn.dst}`);
      if (!outEl) return;

      const outPEl = resolveEqPortEl(conn.equipment_id, conn);
      if (!outPEl) return;

      const oR  = outEl.getBoundingClientRect();
      const opPt = diagramEqPortLinePoint(outPEl, 'right', mapCtx);
      const x2  = toX(oR, 'left');
      const y2  = toY(oR);
      const col = eqColorOf(conn.equipment_id);
      const fromEq = findEquipmentById(conn.equipment_id);
      const lineMeta = fromEq ? diagramLineMetaEqOutToOutFdms(fromEq, conn) : null;
      this._path(ov, opPt.x, opPt.y, x2, y2, col, false, lineMeta);
    });

    const drawEqPortLine = (fromEl, toEl, color, dashed, meta) => {
      if (!fromEl || !toEl) return;
      const fromIsEq = fromEl.classList.contains('d-eq-port');
      const toIsEq   = toEl.classList.contains('d-eq-port');
      let x1; let y1; let x2; let y2;
      if (fromIsEq) {
        ({ x: x1, y: y1 } = diagramEqPortLinePoint(fromEl, 'right', mapCtx));
      } else {
        const fR = fromEl.getBoundingClientRect();
        x1 = toX(fR, 'right');
        y1 = toY(fR);
      }
      if (toIsEq) {
        ({ x: x2, y: y2 } = diagramEqPortLinePoint(toEl, 'left', mapCtx));
      } else {
        const tR = toEl.getBoundingClientRect();
        x2 = toX(tR, 'left');
        y2 = toY(tR);
      }
      this._path(ov, x1, y1, x2, y2, color, dashed, meta);
    };

    /* Internal IN → OUT only when equipment API returned an explicit pair */
    State.equipment.filter(isDiagramCenterEquipment).forEach(eq => {
      const pc = getEqPortConnectivity(eq.id);
      const col = eqColorOf(eq.id);
      (pc.links || []).forEach(link => {
        if (link.inferred) return;
        const inPEl = findDiagramEqPortEl(eq.id, 'IN', {
          code: link.inCode,
          slot: link.in,
          eqPfx,
        });
        const outPEl = findDiagramEqPortEl(eq.id, 'OUT', {
          code: link.outCode,
          slot: link.out,
          eqPfx,
        });
        if (!inPEl || !outPEl) return;
        const iPt = diagramEqPortLinePoint(inPEl, 'right', mapCtx);
        const oPt = diagramEqPortLinePoint(outPEl, 'right', mapCtx);
        const lineCol = strandHexFromColorName(link.strandColor) || col;
        const lineMeta = diagramLineMetaEqInToEqOut(eq, link);
        this._path(ov, iPt.x, iPt.y, oPt.x, oPt.y, lineCol, false, lineMeta);
      });
    });

    /* Connectivity cross-links: IN-FDMS → center, center → OUT-FDMS */
    const drawnCross = new Set();
    getAllConnectivityCrossLinks().forEach(lk => {
      const fromEq = findEquipmentById(lk.fromEqId);
      const toEq   = findEquipmentById(lk.toEqId);
      if (!fromEq || !toEq) return;

      const dedupeKey = [
        lk.fromEqId, lk.fromCode || lk.fromIndex,
        lk.toEqId, lk.toCode || '', lk.toSide,
      ].join('|');
      if (drawnCross.has(dedupeKey)) return;

      let fromEl = null;
      let toEl   = null;
      const lineCol = strandHexFromColorName(lk.strandColor)
        || eqColorOf(lk.toEqId)
        || eqColorOf(lk.fromEqId);

      if (fromEq && isInFdmsEquipment(fromEq) && isDiagramCenterEquipment(toEq)) {
        const fk = lk.fromCode
          ? fdmsPortKeyForCode('in', lk.fromCode)
          : fdmsInPortKeyFromIndex(lk.fromIndex);
        if (fk) fromEl = document.getElementById(`${inPfx}__${fk}`);
        toEl = findDiagramEqPortEl(lk.toEqId, lk.toSide === 'in' ? 'IN' : 'OUT', {
          code: lk.toCode,
          slot: lk.toIndex,
          eqPfx,
        });
      } else if (fromEq && isDiagramCenterEquipment(fromEq) && isOutFdmsEquipment(toEq)) {
        fromEl = findDiagramEqPortEl(lk.fromEqId, lk.fromSide === 'in' ? 'IN' : 'OUT', {
          code: lk.fromCode,
          slot: lk.fromIndex,
          eqPfx,
        });
        const fk = lk.toCode
          ? fdmsPortKeyForCode('out', lk.toCode)
          : fdmsOutPortKeyFromIndex(lk.toIndex);
        if (fk) toEl = document.getElementById(`${outPfx}__${fk}`);
      } else if (fromEq && isInFdmsEquipment(fromEq) && isOutFdmsEquipment(toEq)) {
        const fkIn = lk.fromCode
          ? fdmsPortKeyForCode('in', lk.fromCode)
          : fdmsInPortKeyFromIndex(lk.fromIndex);
        if (fkIn) fromEl = document.getElementById(`${inPfx}__${fkIn}`);
        const fkOut = lk.toCode
          ? fdmsPortKeyForCode('out', lk.toCode)
          : fdmsOutPortKeyFromIndex(lk.toIndex);
        if (fkOut) toEl = document.getElementById(`${outPfx}__${fkOut}`);
      } else if (fromEq && isOutFdmsEquipment(fromEq) && isInFdmsEquipment(toEq)) {
        const fkOut = lk.fromCode
          ? fdmsPortKeyForCode('out', lk.fromCode)
          : fdmsOutPortKeyFromIndex(lk.fromIndex);
        if (fkOut) fromEl = document.getElementById(`${outPfx}__${fkOut}`);
        const fkIn = lk.toCode
          ? fdmsPortKeyForCode('in', lk.toCode)
          : fdmsInPortKeyFromIndex(lk.toIndex);
        if (fkIn) toEl = document.getElementById(`${inPfx}__${fkIn}`);
      } else if (
        fromEq && toEq
        && isDiagramCenterEquipment(fromEq)
        && isDiagramCenterEquipment(toEq)
      ) {
        /* Equipment OUT → another equipment IN (eq-hop) */
        fromEl = findDiagramEqPortEl(lk.fromEqId, lk.fromSide === 'in' ? 'IN' : 'OUT', {
          code: lk.fromCode,
          slot: lk.fromIndex,
          eqPfx,
        });
        toEl = findDiagramEqPortEl(lk.toEqId, lk.toSide === 'in' ? 'IN' : 'OUT', {
          code: lk.toCode,
          slot: lk.toIndex,
          eqPfx,
        });
      }

      if (!fromEl || !toEl) return;

      drawnCross.add(dedupeKey);

      let lineMeta = null;
      if (fromEq && isInFdmsEquipment(fromEq) && isDiagramCenterEquipment(toEq) && lk.toSide === 'in') {
        lineMeta = diagramLineMetaInFdmsToEqIn(lk, toEq);
      } else if (fromEq && isDiagramCenterEquipment(fromEq) && isOutFdmsEquipment(toEq)) {
        lineMeta = diagramLineMetaEqOutToOutFdms(fromEq, lk);
      } else if (fromEq && isInFdmsEquipment(fromEq) && isOutFdmsEquipment(toEq)) {
        lineMeta = diagramLineMetaInFdmsToOutFdms(lk);
      } else if (fromEq && isOutFdmsEquipment(fromEq) && isInFdmsEquipment(toEq)) {
        lineMeta = diagramLineMetaInFdmsToOutFdms({
          fromCode: lk.toCode,
          toCode: lk.fromCode,
          fromIndex: lk.toIndex,
          toIndex: lk.fromIndex,
          strandColor: lk.strandColor,
        });
      } else if (
        isDiagramCenterEquipment(fromEq)
        && isDiagramCenterEquipment(toEq)
        && lk.fromSide === 'out'
        && lk.toSide === 'in'
      ) {
        lineMeta = diagramLineMetaEqOutToEqIn(lk, fromEq, toEq);
      }

      const eqToEqHop = isDiagramCenterEquipment(fromEq)
        && isDiagramCenterEquipment(toEq)
        && lk.fromSide === 'out'
        && lk.toSide === 'in';
      if (eqToEqHop) {
        const { x1, y1, x2, y2 } = diagramEqToEqVerticalPoints(fromEl, toEl, mapCtx);
        this._pathVertical(ov, x1, y1, x2, y2, lineCol, false, lineMeta);
      } else {
        drawEqPortLine(fromEl, toEl, lineCol, false, lineMeta);
      }
    });
  },

  _appendDiagramPath(svg, d, opts = {}) {
    const {
      color, dashed, strokeWidth = 1.8, opacity = 0.75, meta = null,
    } = opts;
    const NS = 'http://www.w3.org/2000/svg';

    if (!meta) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', String(strokeWidth));
      p.setAttribute('fill', 'none');
      p.setAttribute('opacity', String(opacity));
      if (dashed) p.setAttribute('stroke-dasharray', '4,3');
      svg.appendChild(p);
      return;
    }

    const g = document.createElementNS(NS, 'g');
    g.classList.add('diag-conn-line-g');

    const vis = document.createElementNS(NS, 'path');
    vis.setAttribute('d', d);
    vis.setAttribute('stroke', color);
    vis.setAttribute('stroke-width', String(strokeWidth));
    vis.setAttribute('fill', 'none');
    vis.setAttribute('opacity', String(opacity));
    vis.classList.add('diag-conn-line');
    vis.style.pointerEvents = 'none';
    if (dashed) vis.setAttribute('stroke-dasharray', '4,3');

    const hit = document.createElementNS(NS, 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '14');
    hit.setAttribute('fill', 'none');
    hit.classList.add('diag-conn-line-hit');
    hit.style.pointerEvents = 'stroke';
    hit.style.cursor = 'pointer';
    hit._lineMeta = meta;

    g.appendChild(vis);
    g.appendChild(hit);
    svg.appendChild(g);
  },

  _path(svg, x1, y1, x2, y2, color, dashed, meta) {
    const mx = (x1 + x2) / 2;
    const d = `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
    this._appendDiagramPath(svg, d, { color, dashed, strokeWidth: 1.8, opacity: 0.75, meta });
  },

  /** Straight / near-vertical link between stacked equipment ports */
  _pathVertical(svg, x1, y1, x2, y2, color, dashed, meta) {
    let d;
    if (Math.abs(x1 - x2) < 3) {
      d = `M${x1} ${y1} L${x2} ${y2}`;
    } else {
      const midY = (y1 + y2) / 2;
      d = `M${x1} ${y1} C${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`;
    }
    this._appendDiagramPath(svg, d, {
      color, dashed, strokeWidth: 2, opacity: 0.85, meta,
    });
  },

  /* ── SKELETON ────────────────────────────────────────── */
  skeletonPorts() {
    let h = '';
    for (let i = 0; i < 10; i++) {
      const w1 = 60  + (Math.random() * 120 | 0);
      const w2 = 40  + (Math.random() * 80  | 0);
      h += `<div class="sk-port">
              <div class="skeleton sk-plb"></div>
              <div class="sk-lines">
                <div class="skeleton sk-line" style="width:${w1}px"></div>
                <div class="skeleton sk-line" style="width:${w2}px"></div>
              </div>
            </div>`;
    }
    setInnerHtml('sk-ports', h);
  },

  setDiagramConnectivityLoader(show) {
    State.connectivityLoading = !!show;
    const el = document.getElementById('diag-connectivity-loader');
    const scroll = document.getElementById('diag-scroll');
    if (el) {
      el.hidden = !show;
      el.setAttribute('aria-busy', show ? 'true' : 'false');
    }
    scroll?.classList.toggle('connectivity-loading', !!show);
  },

  setLoader(show) {
    const body = document.getElementById('cv-body');
    let el = document.getElementById('cv-loader');
    if (!el && show && body) {
      el = document.createElement('div');
      el.id = 'cv-loader';
      el.className = 'cv-loader';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-busy', 'true');
      el.setAttribute('aria-label', 'Loading cable view');
      el.innerHTML =
        '<div class="cv-loader-spin" aria-hidden="true"></div>' +
        '<p class="cv-loader-text">Loading cable view…</p>';
      body.insertBefore(el, body.firstChild);
    }
    if (!el) return;
    el.hidden = !show;
    body?.classList.toggle('cv-content-loading', show);
    if (show) this.clearError();
  },

  clearError() {
    const el = document.getElementById('cv-load-error');
    if (el) {
      el.hidden = true;
      el.innerHTML = '';
    }
  },

  /* ── ERROR (overlay — keeps panels so Retry still works) ── */
  error(msg) {
    const wrap = document.getElementById('main-wrap');
    if (!wrap) return;
    let el = document.getElementById('cv-load-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cv-load-error';
      el.className = 'error-state cv-load-error';
      wrap.appendChild(el);
    }
    el.hidden = false;
    el.innerHTML = `
        <div class="ei">⚠️</div>
        <h3>Failed to load</h3>
        <p>${escapeHtml(msg || 'Unknown error')}<br>Check your connection and try again.</p>
        <button type="button" class="retry-btn" data-action="cv-retry">↻ Retry</button>`;
    el.querySelector('[data-action="cv-retry"]')?.addEventListener('click', () => App.load());
  },

  /* ── ALL ─────────────────────────────────────────────── */
  all() {
    if (!renderDomReady()) return;
    try {
      this.clearError();
      this.topbar();
      this.stats();
      this.portList();
      this.equipList();
      this.diagram();
    } catch (err) {
      console.error('[Cable view] Render failed:', err);
      this.error(err?.message || 'Failed to render cable view');
    }
  },
};
/**
 * connect.js  —  Incremental connectivity (one API hop per save)
 *
 * in-hop  → IN-FDMS port → equipment IN port → save
 * out-hop → equipment OUT port → OUT-FDMS port → save
 *
 * Many IN-FDMS ports may share one equipment IN port.
 * One equipment OUT port may fan out to multiple OUT-FDMS ports.
 */

const OUT_HOP_CTX_STORE_KEY = 'cv-out-hop-ctx';
const EQ_HOP_CTX_STORE_KEY = 'cv-eq-hop-ctx';

const Connect = {

  /** Click diagram / port list directly — no Connect button or pick highlights */
  directConnect: true,

  state: {
    active      : false,
    mode        : null,   // 'in-hop' | 'out-hop' | 'eq-hop'
    step        : 0,
    srcPort     : null,   // e.g. 'in-A'
    eqId        : null,   // source / target equipment id (mode-dependent)
    eqInPort    : null,   // e.g. 'in1'
    eqInCode    : null,   // API port code e.g. 1/1, Port-1
    eqOutPort   : null,   // e.g. 'out1'
    eqOutCode   : null,
    dstEqId     : null,   // eq-hop target equipment
    dstEqName   : null,
    dstPort     : null,   // e.g. 'out-A' (OUT-FDMS)
    pendingStrand: 0,
  },

  /** Frozen at confirm open — survives any state drift before save */
  _connectDraft: null,

  /** Stable hop context — equipment id/ports survive sheet open/close */
  _hopCtx: null,

  /** Immutable OUT-hop snapshot — confirm/save always read this first */
  _outHopSnapshot: null,

  /** DOM/sessionStorage backup — survives embed state loss between picker and confirm */
  _outHopPersist: null,

  /** Equipment OUT → Equipment IN snapshot */
  _eqHopSnapshot: null,
  _eqHopPersist: null,

  /** Locked at confirm open — save uses this directly (no re-resolve) */
  _confirmPayload: null,

  /** Equipment OUT picked in unified mode — awaiting destination type choice */
  _pendingEqOutCtx: null,

  /** True while unified "Select Equipment OUT Port" sheet is open */
  _unifiedEqOutPickerOpen: false,

  /** Equipment id when "Connect a Port" opened the unified port picker (for Back) */
  _equipConnectEqId: null,

  /** Blocks accidental click-through onto destination-type buttons */
  _outDestTypePickerReady: false,

  _countCenterEquipment() {
    return State.equipment.filter(isDiagramCenterEquipment).length;
  },

  _persistOutHopCtx(partial) {
    if (!partial || typeof partial !== 'object') return;
    this._outHopPersist = { mode: 'out-hop', ...this._outHopPersist, ...partial };
    try {
      sessionStorage.setItem(OUT_HOP_CTX_STORE_KEY, JSON.stringify(this._outHopPersist));
    } catch (_) { /* embed */ }
    try {
      const pickOv = document.getElementById('sh-pick-out');
      if (pickOv) pickOv.dataset.outHopCtx = JSON.stringify(this._outHopPersist);
    } catch (_) { /* embed */ }
  },

  _readPersistedOutHopCtx() {
    const mem = this._outHopPersist;
    if (mem && (mem.eqId || mem.eqOutPort || mem.eqName || mem.eqOutCode)) {
      return { ...mem };
    }
    try {
      const raw = document.getElementById('sh-pick-out')?.dataset.outHopCtx;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) { /* ignore */ }
    try {
      const raw = sessionStorage.getItem(OUT_HOP_CTX_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) { /* ignore */ }
    if (document.getElementById('sh-pick-out')?.classList.contains('show')) {
      const sub = document.getElementById('spo-sub')?.textContent?.trim() || '';
      const m = sub.match(/^From\s+(.+?)\s+·\s+(.+)$/i);
      if (m) {
        return { mode: 'out-hop', eqName: m[1].trim(), eqOutCode: m[2].trim() };
      }
    }
    return null;
  },

  _restoreOutHopFromPersist() {
    return this._syncOutHopSource();
  },

  /** Merge OUT-hop source (equipment OUT) from memory, sheet dataset, session, state */
  _syncOutHopSource() {
    const p = this._readPersistedOutHopCtx() || {};
    const snap = this._outHopSnapshot || {};
    const h = this._hopCtx || {};
    const s = this.state;

    const merged = {
      mode          : 'out-hop',
      eqId          : this._pickStr(snap.eqId, h.eqId, p.eqId, s.eqId),
      eqName        : this._pickStr(snap.eqName, h.eqName, p.eqName),
      eqOutPort     : this._pickStr(snap.eqOutPort, h.eqOutPort, p.eqOutPort, s.eqOutPort),
      eqOutCode     : this._pickStr(snap.eqOutCode, h.eqOutCode, p.eqOutCode, s.eqOutCode),
      eqOutPortSide : this._pickStr(snap.eqOutPortSide, h.eqOutPortSide, p.eqOutPortSide, s.eqOutPortSide)
        || eqPortSideFromRef(this._pickStr(snap.eqOutPort, h.eqOutPort, p.eqOutPort, s.eqOutPort), 'out'),
      eqPortApiId   : this._pickStr(snap.eqPortApiId, h.eqPortApiId, p.eqPortApiId, s.eqPortApiId),
      dstPort       : this._pickStr(snap.dstPort, h.dstPort, p.dstPort, s.dstPort),
      dstLabel      : this._pickStr(snap.dstLabel, h.dstLabel, p.dstLabel),
    };

    if (!merged.eqId && merged.eqName) {
      merged.eqId = resolveCenterEquipmentIdByName(merged.eqName);
    }
    if (!merged.eqName && merged.eqId) {
      const eq = findEquipmentById(merged.eqId);
      if (eq?.name) merged.eqName = _trimStr(eq.name);
    }
    if (merged.eqId && !merged.eqOutCode && merged.eqOutPort) {
      const eq = findEquipmentById(merged.eqId);
      const side = merged.eqOutPortSide || eqPortSideFromRef(merged.eqOutPort, 'out');
      const slot = _eqWizardPortSlot(merged.eqOutPort);
      const match = findCenterEquipmentPortRow(eq, {
        portApiId: merged.eqPortApiId, side, slot,
      });
      if (match?.label) merged.eqOutCode = match.label;
    }
    if (merged.dstPort && !merged.dstLabel) {
      merged.dstLabel = fdmsOutLabelFromPortKey(merged.dstPort);
    }

    const hasSource = !!(merged.eqId || merged.eqName)
      && !!(merged.eqOutPort || merged.eqOutCode);
    if (!hasSource && !merged.dstPort) return null;

    this._outHopSnapshot = { ...merged };
    this._hopCtx = { ...merged };
    this._persistOutHopCtx(merged);

    this.state.mode = 'out-hop';
    if (merged.eqId) this.state.eqId = merged.eqId;
    if (merged.eqOutPort) this.state.eqOutPort = merged.eqOutPort;
    if (merged.eqOutCode) this.state.eqOutCode = merged.eqOutCode;
    if (merged.eqOutPortSide) this.state.eqOutPortSide = merged.eqOutPortSide;
    if (merged.eqPortApiId) this.state.eqPortApiId = merged.eqPortApiId;
    if (merged.dstPort) this.state.dstPort = merged.dstPort;

    return merged;
  },

  _outHopSourceReady(merged) {
    const m = merged && (merged.eqId || merged.eqName || merged.eqOutPort || merged.eqOutCode)
      ? merged
      : this._syncOutHopSource();
    if (!m) return false;
    const eqId = m.eqId || resolveCenterEquipmentIdByName(m.eqName);
    return !!(eqId && findEquipmentById(eqId) && (m.eqOutPort || m.eqOutCode));
  },

  _persistEqHopCtx(partial) {
    if (!partial || typeof partial !== 'object') return;
    this._eqHopPersist = { mode: 'eq-hop', ...this._eqHopPersist, ...partial };
    try {
      sessionStorage.setItem(EQ_HOP_CTX_STORE_KEY, JSON.stringify(this._eqHopPersist));
    } catch (_) { /* embed */ }
    try {
      const pickSheet = document.getElementById('sh-pick-eq');
      if (pickSheet) pickSheet.dataset.eqHopCtx = JSON.stringify(this._eqHopPersist);
    } catch (_) { /* embed */ }
  },

  _readPersistedEqHopCtxFull() {
    const mem = this._eqHopPersist;
    if (mem && (mem.eqId || mem.dstEqId)) return { ...mem };
    try {
      const raw = document.getElementById('sh-pick-eq')?.dataset.eqHopCtx;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) { /* ignore */ }
    try {
      const raw = sessionStorage.getItem(EQ_HOP_CTX_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) { /* ignore */ }
    return null;
  },

  _syncEqHopSource() {
    const p = this._readPersistedEqHopCtxFull() || {};
    const snap = this._eqHopSnapshot || {};
    const h = this._hopCtx || {};
    const s = this.state;

    const merged = {
      mode     : 'eq-hop',
      eqId     : this._pickStr(snap.eqId, h.eqId, p.eqId, s.eqId),
      eqName   : this._pickStr(snap.eqName, h.eqName, p.eqName),
      eqOutPort: this._pickStr(snap.eqOutPort, h.eqOutPort, p.eqOutPort, s.eqOutPort),
      eqOutCode: this._pickStr(snap.eqOutCode, h.eqOutCode, p.eqOutCode, s.eqOutCode),
      dstEqId  : this._pickStr(snap.dstEqId, h.dstEqId, p.dstEqId, s.dstEqId),
      dstEqName: this._pickStr(snap.dstEqName, h.dstEqName, p.dstEqName),
      eqInPort : this._pickStr(snap.eqInPort, h.eqInPort, p.eqInPort, s.eqInPort),
      eqInCode : this._pickStr(snap.eqInCode, h.eqInCode, p.eqInCode, s.eqInCode),
    };

    if (!merged.eqId && merged.eqName) {
      merged.eqId = resolveCenterEquipmentIdByName(merged.eqName);
    }
    if (!merged.eqName && merged.eqId) {
      const eq = findEquipmentById(merged.eqId);
      if (eq?.name) merged.eqName = _trimStr(eq.name);
    }
    if (!merged.dstEqName && merged.dstEqId) {
      const eq = findEquipmentById(merged.dstEqId);
      if (eq?.name) merged.dstEqName = _trimStr(eq.name);
    }
    if (merged.eqId && !merged.eqOutCode && merged.eqOutPort) {
      const eq = findEquipmentById(merged.eqId);
      const side = merged.eqOutPortSide || eqPortSideFromRef(merged.eqOutPort, 'out');
      const slot = _eqWizardPortSlot(merged.eqOutPort);
      const match = findCenterEquipmentPortRow(eq, {
        portApiId: merged.eqPortApiId, side, slot,
      });
      if (match?.label) merged.eqOutCode = match.label;
    }
    if (merged.dstEqId && !merged.eqInCode && merged.eqInPort) {
      const eq = findEquipmentById(merged.dstEqId);
      const slot = String(merged.eqInPort).replace(/^in/i, '');
      const slots = eq ? getCenterEquipmentPortSlots(eq, 'in') : [];
      const match = slots.find((x) => String(x.slot) === slot);
      if (match?.label) merged.eqInCode = match.label;
    }

    const hasSource = !!(merged.eqId || merged.eqName)
      && !!(merged.eqOutPort || merged.eqOutCode);
    if (!hasSource && !merged.dstEqId) return null;

    this._eqHopSnapshot = { ...merged };
    this._hopCtx = { ...merged };
    this._persistEqHopCtx(merged);

    this.state.mode = 'eq-hop';
    if (merged.eqId) this.state.eqId = merged.eqId;
    if (merged.eqOutPort) this.state.eqOutPort = merged.eqOutPort;
    if (merged.eqOutCode) this.state.eqOutCode = merged.eqOutCode;
    if (merged.dstEqId) this.state.dstEqId = merged.dstEqId;
    if (merged.dstEqName) this.state.dstEqName = merged.dstEqName;
    if (merged.eqInPort) this.state.eqInPort = merged.eqInPort;
    if (merged.eqInCode) this.state.eqInCode = merged.eqInCode;

    return merged;
  },

  _eqHopSourceReady(merged) {
    const m = merged && (merged.eqId || merged.eqName || merged.eqOutPort || merged.eqOutCode)
      ? merged
      : this._syncEqHopSource();
    if (!m) return false;
    const eqId = m.eqId || resolveCenterEquipmentIdByName(m.eqName);
    return !!(eqId && findEquipmentById(eqId) && (m.eqOutPort || m.eqOutCode));
  },

  _eqHopTargetReady(merged) {
    const m = merged || this._syncEqHopSource();
    if (!m) return false;
    return !!(m.dstEqId && findEquipmentById(m.dstEqId) && (m.eqInPort || m.eqInCode));
  },

  _readPersistedEqHopCtx() {
    return this._readPersistedEqHopCtxFull();
  },

  _clearHopCtx() {
    this._hopCtx = null;
    this._outHopSnapshot = null;
    this._outHopPersist = null;
    this._eqHopSnapshot = null;
    this._eqHopPersist = null;
    try { sessionStorage.removeItem(OUT_HOP_CTX_STORE_KEY); } catch (_) { /* embed */ }
    try { sessionStorage.removeItem(EQ_HOP_CTX_STORE_KEY); } catch (_) { /* embed */ }
    try {
      const pickOv = document.getElementById('sh-pick-out');
      if (pickOv) delete pickOv.dataset.outHopCtx;
      const eqSheet = document.getElementById('sh-pick-eq');
      if (eqSheet) delete eqSheet.dataset.eqHopCtx;
    } catch (_) { /* embed */ }
  },

  _clearConfirmPayload() {
    this._confirmPayload = null;
    const el = document.getElementById('sh-confirm');
    if (el) delete el.dataset.connectPayload;
  },

  _lockConfirmPayload(draft) {
    const base = this._getConfirmMergedDraft(draft);
    this._confirmPayload = base;
    try {
      const el = document.getElementById('sh-confirm');
      if (el) el.dataset.connectPayload = JSON.stringify(base);
    } catch (_) { /* quota / embed */ }
    this._connectDraft = { ...base };
    return base;
  },

  _readConfirmPayload() {
    if (this._confirmPayload) return { ...this._confirmPayload };
    try {
      const raw = document.getElementById('sh-confirm')?.dataset.connectPayload;
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
  },

  _setInHopCtx(eqId, inPort, inCode, pickEl, portSide = 'in', portApiId = null) {
    const eq = pickEl
      ? findEquipmentForPickerPort(pickEl, eqId)
      : findEquipmentById(eqId);
    if (!eq) return false;
    const apiId = portApiId || pickEl?.getAttribute?.('data-eq-port-id') || null;
    this._hopCtx = {
      mode       : 'in-hop',
      eqId       : String(eq.id),
      eqName     : eq.name,
      eqInPort   : inPort,
      eqInCode   : inCode ? _trimStr(inCode) : null,
      eqPortSide : portSide || 'in',
      eqPortApiId: apiId ? String(apiId) : null,
    };
    return true;
  },

  _setOutHopCtx(eqId, outPort, outCode, portEl, portSide = 'out', mode = 'out-hop', portApiId = null) {
    const eq = findEquipmentForPickerPort(portEl, eqId)
      || findEquipmentForDiagramPort(portEl, eqId);
    if (!eq) return false;
    const snap = {
      mode          : mode,
      eqId          : String(eq.id),
      eqName        : eq.name,
      eqOutPort     : outPort,
      eqOutCode     : outCode ? _trimStr(outCode) : null,
      eqOutPortSide : portSide || 'out',
      eqPortApiId   : portApiId ? String(portApiId) : null,
      dstPort       : null,
      dstLabel      : null,
      srcPort       : null,
    };
    this._hopCtx = { ...snap };
    this._outHopSnapshot = { ...snap };
    this._persistOutHopCtx(snap);
    return true;
  },

  _setOutHopDst(dstPort, dstLabel) {
    const dstKey = dstPort ? String(dstPort) : null;
    const dstLbl = dstLabel ? _trimStr(dstLabel) : null;
    if (this._hopCtx?.mode === 'out-hop') {
      this._hopCtx.dstPort = dstKey;
      this._hopCtx.dstLabel = dstLbl;
    }
    if (this._outHopSnapshot) {
      this._outHopSnapshot.dstPort = dstKey;
      this._outHopSnapshot.dstLabel = dstLbl;
    }
    this._persistOutHopCtx({ dstPort: dstKey, dstLabel: dstLbl });
  },

  _setEqHopSourceCtx(eqId, outPort, outCode, portEl, portSide = 'out', portApiId = null) {
    const eq = findEquipmentForPickerPort(portEl, eqId)
      || findEquipmentForDiagramPort(portEl, eqId);
    if (!eq) return false;
    const apiId = portApiId || portEl?.getAttribute?.('data-eq-port-id') || null;
    const snap = {
      mode          : 'eq-hop',
      eqId          : String(eq.id),
      eqName        : eq.name,
      eqOutPort     : outPort,
      eqOutCode     : outCode ? _trimStr(outCode) : null,
      eqOutPortSide : portSide || 'out',
      eqPortApiId   : apiId ? String(apiId) : null,
      dstEqId       : null,
      dstEqName     : null,
      eqInPort      : null,
      eqInCode      : null,
    };
    this._hopCtx = { ...snap };
    this._eqHopSnapshot = { ...snap };
    this._persistEqHopCtx(snap);
    return true;
  },

  _setEqHopTarget(dstEqId, inPort, inCode, portEl, portSide = 'in', portApiId = null) {
    const eq = findEquipmentForPickerPort(portEl, dstEqId)
      || findEquipmentForDiagramPort(portEl, dstEqId);
    if (!eq) return false;
    const srcId = this._eqHopSnapshot?.eqId || this._hopCtx?.eqId || this.state.eqId;
    if (srcId && String(eq.id) === String(srcId)) return false;
    const apiId = portApiId || portEl?.getAttribute?.('data-eq-port-id') || null;
    const patch = {
      dstEqId           : String(eq.id),
      dstEqName         : eq.name,
      eqInPort          : inPort,
      eqInCode          : inCode ? _trimStr(inCode) : null,
      eqTargetPortSide  : portSide || 'in',
      eqTargetPortApiId : apiId ? String(apiId) : null,
    };
    if (this._hopCtx?.mode === 'eq-hop') Object.assign(this._hopCtx, patch);
    if (this._eqHopSnapshot) Object.assign(this._eqHopSnapshot, patch);
    this._persistEqHopCtx(patch);
    return true;
  },

  _pickStr(...vals) {
    for (const v of vals) {
      const s = v != null ? String(v).trim() : '';
      if (s) return s;
    }
    return null;
  },

  /** Human label for equipment port on confirm UI */
  _eqInDisplayLabel(draft, eqId) {
    if (!draft) return null;
    const code = this._pickStr(draft.eqInCode);
    if (code) return code;
    const eq = eqId ? findEquipmentById(eqId) : (draft.dstEqId ? findEquipmentById(draft.dstEqId) : null);
    const inPort = draft.eqInPort;
    if (eq && inPort) {
      const side = draft.eqTargetPortSide || draft.eqPortSide || 'in';
      const slot = String(inPort).replace(/^(in|out)/i, '');
      const match = getAllCenterEquipmentPortSlots(eq)
        .find((x) => String(x.slot) === slot && x.side === side)
        || getAllCenterEquipmentPortSlots(eq).find((x) => String(x.slot) === slot);
      if (match?.label) return match.label;
    }
    if (inPort) return String(inPort).toUpperCase();
    return null;
  },

  /** Human label for equipment OUT port on confirm UI */
  _eqOutDisplayLabel(draft) {
    if (!draft) return null;
    const code = this._pickStr(draft.eqOutCode);
    if (code) return code;
    const eq = draft.eqId ? findEquipmentById(draft.eqId) : null;
    const outPort = draft.eqOutPort;
    if (eq && outPort) {
      const side = draft.eqOutPortSide || draft.eqPortSide || 'out';
      const slot = Number(String(outPort).replace(/^(in|out)/i, ''));
      const match = findCenterEquipmentPortRow(eq, {
        portApiId: draft.eqPortApiId, side, slot,
      });
      if (match?.label) {
        return equipmentPortPickerLabel(getAllCenterEquipmentPortSlots(eq), match);
      }
    }
    if (outPort) return String(outPort).toUpperCase();
    return null;
  },

  /** Merge snapshot / hop context / state — same source for confirm UI and save */
  _getConfirmMergedDraft(draft) {
    const eqPersist = this._readPersistedEqHopCtx();
    const persist = this._readPersistedOutHopCtx();
    const eqSnap = this._eqHopSnapshot;
    const snap = this._outHopSnapshot;
    const h = this._hopCtx;
    const s = this.state;
    const base = draft && typeof draft === 'object' ? { ...draft } : {};
    const eqHopFlow = eqPersist?.mode === 'eq-hop'
      || eqSnap?.mode === 'eq-hop'
      || h?.mode === 'eq-hop'
      || base.mode === 'eq-hop'
      || s.mode === 'eq-hop';
    const outHasSource = !!(
      this._pickStr(persist?.eqId, snap?.eqId, h?.eqId, base.eqId, s.eqId)
      || this._pickStr(persist?.eqName, snap?.eqName, h?.eqName, base.eqName)
    ) && !!(
      this._pickStr(persist?.eqOutPort, snap?.eqOutPort, h?.eqOutPort, base.eqOutPort, s.eqOutPort)
      || this._pickStr(persist?.eqOutCode, snap?.eqOutCode, h?.eqOutCode, base.eqOutCode, s.eqOutCode)
    );
    const outHasDest = !!this._pickStr(
      persist?.dstPort, snap?.dstPort, h?.dstPort, base.dstPort, s.dstPort,
    );
    const activeInHop = (
      h?.mode === 'in-hop'
      || s.mode === 'in-hop'
      || base.mode === 'in-hop'
    ) && !!(
      h?.eqInPort || h?.eqInCode || s.eqInPort || s.eqInCode
      || base.eqInPort || base.eqInCode
    );
    const activeOutHop = (
      h?.mode === 'out-hop'
      || s.mode === 'out-hop'
      || snap?.mode === 'out-hop'
    ) && outHasSource;
    const eqToInFdmsFlow = h?.mode === 'eq-to-in-fdms'
      || snap?.mode === 'eq-to-in-fdms'
      || s.mode === 'eq-to-in-fdms'
      || base.mode === 'eq-to-in-fdms';
    const directFdmsFlow = !eqHopFlow && !eqToInFdmsFlow && (
      s.mode === 'direct-fdms'
      || base.mode === 'direct-fdms'
      || h?.mode === 'direct-fdms'
      || (
        !!(s.srcPort || base.srcPort || h?.srcPort)
        && !!(s.dstPort || base.dstPort || h?.dstPort)
        && !s.eqId && !base.eqId && !h?.eqId
        && !s.eqInPort && !base.eqInPort && !h?.eqInPort
        && !s.eqOutPort && !base.eqOutPort && !h?.eqOutPort
        && s.mode !== 'fdms-out-to-in' && base.mode !== 'fdms-out-to-in'
      )
    );
    const fdmsOutToInFlow = !eqHopFlow && !eqToInFdmsFlow && (
      s.mode === 'fdms-out-to-in'
      || base.mode === 'fdms-out-to-in'
      || h?.mode === 'fdms-out-to-in'
    );
    const outFlow = !eqHopFlow && !eqToInFdmsFlow && !directFdmsFlow && !fdmsOutToInFlow && !activeInHop && outHasSource && (
      outHasDest
      || activeOutHop
      || (persist?.mode === 'out-hop' && (outHasDest || s.mode === 'out-hop' || h?.mode === 'out-hop'))
    );
    const inFlow = !eqHopFlow && !eqToInFdmsFlow && !outFlow && !directFdmsFlow && !fdmsOutToInFlow && (
      activeInHop
      || h?.mode === 'in-hop'
      || base.mode === 'in-hop'
      || s.mode === 'in-hop'
      || !!(h?.eqInPort || h?.eqInCode || base.eqInPort || base.eqInCode
        || s.eqInPort || s.eqInCode || base.srcPort || s.srcPort)
    );
    const mode = eqHopFlow ? 'eq-hop'
      : eqToInFdmsFlow ? 'eq-to-in-fdms'
      : directFdmsFlow ? 'direct-fdms'
      : fdmsOutToInFlow ? 'fdms-out-to-in'
      : (outFlow ? 'out-hop' : (inFlow ? 'in-hop' : this._resolveConnectMode(s)));

    base.mode = resolveConnectWizardMode({ ...base, mode });
    base.pendingStrand = base.pendingStrand ?? s.pendingStrand ?? this._connectDraft?.pendingStrand ?? 0;
    base.eqPortSide = base.eqPortSide || h?.eqPortSide || s.eqPortSide || 'in';
    base.eqOutPortSide = base.eqOutPortSide || h?.eqOutPortSide || snap?.eqOutPortSide || s.eqOutPortSide || 'out';
    base.eqTargetPortSide = base.eqTargetPortSide || h?.eqTargetPortSide || s.eqTargetPortSide || 'in';

    if (mode === 'eq-hop') {
      base.srcPort = null;
      base.dstPort = null;
      base.eqId = this._pickStr(eqPersist?.eqId, eqSnap?.eqId, h?.eqId, base.eqId, s.eqId);
      base.eqName = this._pickStr(eqPersist?.eqName, eqSnap?.eqName, h?.eqName, base.eqName);
      base.eqOutPort = this._pickStr(
        eqPersist?.eqOutPort, eqSnap?.eqOutPort, h?.eqOutPort, base.eqOutPort, s.eqOutPort,
      );
      base.eqOutCode = this._pickStr(
        eqPersist?.eqOutCode, eqSnap?.eqOutCode, h?.eqOutCode, base.eqOutCode, s.eqOutCode,
      );
      base.dstEqId = this._pickStr(eqPersist?.dstEqId, eqSnap?.dstEqId, h?.dstEqId, base.dstEqId, s.dstEqId);
      base.dstEqName = this._pickStr(eqPersist?.dstEqName, eqSnap?.dstEqName, h?.dstEqName, base.dstEqName);
      base.eqInPort = this._pickStr(eqPersist?.eqInPort, eqSnap?.eqInPort, h?.eqInPort, base.eqInPort, s.eqInPort);
      base.eqInCode = this._pickStr(eqPersist?.eqInCode, eqSnap?.eqInCode, h?.eqInCode, base.eqInCode, s.eqInCode);
      base.eqOutPortSide = this._pickStr(
        eqPersist?.eqOutPortSide, eqSnap?.eqOutPortSide, h?.eqOutPortSide, base.eqOutPortSide, s.eqOutPortSide,
      ) || eqPortSideFromRef(base.eqOutPort, 'out');
      base.eqPortApiId = this._pickStr(
        eqPersist?.eqPortApiId, eqSnap?.eqPortApiId, h?.eqPortApiId, base.eqPortApiId, s.eqPortApiId,
      );
      base.eqTargetPortSide = this._pickStr(
        eqPersist?.eqTargetPortSide, eqSnap?.eqTargetPortSide, h?.eqTargetPortSide,
        base.eqTargetPortSide, s.eqTargetPortSide,
      ) || 'in';
      base.eqTargetPortApiId = this._pickStr(
        eqPersist?.eqTargetPortApiId, eqSnap?.eqTargetPortApiId, h?.eqTargetPortApiId,
        base.eqTargetPortApiId, s.eqTargetPortApiId,
      );
    } else if (mode === 'out-hop') {
      base.srcPort = null;
      base.eqId = this._pickStr(persist?.eqId, snap?.eqId, h?.eqId, base.eqId, s.eqId);
      base.eqName = this._pickStr(persist?.eqName, snap?.eqName, h?.eqName, base.eqName);
      base.eqOutPort = this._pickStr(
        persist?.eqOutPort, snap?.eqOutPort, h?.eqOutPort, base.eqOutPort, s.eqOutPort,
      );
      base.eqOutCode = this._pickStr(
        persist?.eqOutCode, snap?.eqOutCode, h?.eqOutCode, base.eqOutCode, s.eqOutCode,
      );
      base.eqOutPortSide = this._pickStr(
        persist?.eqOutPortSide, snap?.eqOutPortSide, h?.eqOutPortSide, base.eqOutPortSide, s.eqOutPortSide,
      ) || eqPortSideFromRef(base.eqOutPort, 'out');
      base.eqPortApiId = this._pickStr(
        persist?.eqPortApiId, snap?.eqPortApiId, h?.eqPortApiId, base.eqPortApiId, s.eqPortApiId,
      );
      base.dstPort = this._pickStr(
        persist?.dstPort, snap?.dstPort, h?.dstPort, base.dstPort, s.dstPort,
      );
      base.dstLabel = this._pickStr(
        persist?.dstLabel, snap?.dstLabel, h?.dstLabel, base.dstLabel,
        base.dstPort ? fdmsOutLabelFromPortKey(base.dstPort) : null,
      );
      base.eqInPort = null;
      base.eqInCode = null;
    } else if (mode === 'eq-to-in-fdms') {
      base.dstPort = null;
      base.eqId = this._pickStr(persist?.eqId, snap?.eqId, h?.eqId, base.eqId, s.eqId);
      base.eqName = this._pickStr(persist?.eqName, snap?.eqName, h?.eqName, base.eqName);
      base.eqOutPort = this._pickStr(
        persist?.eqOutPort, snap?.eqOutPort, h?.eqOutPort, base.eqOutPort, s.eqOutPort,
      );
      base.eqOutCode = this._pickStr(
        persist?.eqOutCode, snap?.eqOutCode, h?.eqOutCode, base.eqOutCode, s.eqOutCode,
      );
      base.srcPort = this._pickStr(persist?.srcPort, snap?.srcPort, h?.srcPort, base.srcPort, s.srcPort);
      base.eqInPort = null;
      base.eqInCode = null;
    } else if (mode === 'direct-fdms') {
      base.srcPort = this._pickStr(s.srcPort, h?.srcPort, base.srcPort);
      base.dstPort = this._pickStr(s.dstPort, h?.dstPort, base.dstPort);
      base.dstLabel = this._pickStr(
        base.dstLabel,
        base.dstPort ? fdmsOutLabelFromPortKey(base.dstPort) : null,
      );
      base.eqId = null;
      base.eqName = null;
      base.eqInPort = null;
      base.eqInCode = null;
      base.eqOutPort = null;
      base.eqOutCode = null;
      base.dstEqId = null;
      base.dstEqName = null;
    } else if (mode === 'fdms-out-to-in') {
      base.srcPort = this._pickStr(s.srcPort, h?.srcPort, base.srcPort);
      base.dstPort = this._pickStr(s.dstPort, h?.dstPort, base.dstPort);
      base.dstLabel = this._pickStr(
        base.dstLabel,
        base.dstPort ? fdmsOutLabelFromPortKey(base.dstPort) : null,
      );
      base.eqId = null;
      base.eqName = null;
      base.eqInPort = null;
      base.eqInCode = null;
      base.eqOutPort = null;
      base.eqOutCode = null;
      base.dstEqId = null;
      base.dstEqName = null;
    } else {
      base.eqId = this._pickStr(h?.eqId, base.eqId, s.eqId);
      base.eqName = this._pickStr(h?.eqName, base.eqName);
      base.eqInPort = this._pickStr(h?.eqInPort, base.eqInPort, s.eqInPort);
      base.eqInCode = this._pickStr(h?.eqInCode, base.eqInCode, s.eqInCode);
      base.srcPort = this._pickStr(s.srcPort, h?.srcPort, base.srcPort);
      base.eqOutPort = null;
      base.eqOutCode = null;
      base.dstPort = null;
      base.dstEqId = null;
      base.dstEqName = null;
    }

    if (!base.eqName && base.eqId) {
      const eq = findEquipmentById(base.eqId);
      if (eq?.name) base.eqName = _trimStr(eq.name);
    }
    if (!base.dstEqName && base.dstEqId) {
      const eq = findEquipmentById(base.dstEqId);
      if (eq?.name) base.dstEqName = _trimStr(eq.name);
    }
    if (!base.eqId && base.eqName) {
      const byNameId = resolveCenterEquipmentIdByName(base.eqName);
      if (byNameId) base.eqId = byNameId;
    }
    if (mode === 'out-hop' && base.eqOutCode && !base.eqOutPort && base.eqId) {
      const eq = findEquipmentById(base.eqId);
      const side = base.eqOutPortSide || 'out';
      const wantCode = _trimStr(base.eqOutCode).toLowerCase();
      const match = eq
        ? getAllCenterEquipmentPortSlots(eq).find((x) => (
          x.side === side && _trimStr(x.label).toLowerCase() === wantCode
        ))
        : null;
      if (match) base.eqOutPort = `${match.side}${match.slot}`;
    }
    if (mode === 'out-hop' && !base.eqOutCode && base.eqOutPort && base.eqId) {
      const eq = findEquipmentById(base.eqId);
      const side = base.eqOutPortSide || eqPortSideFromRef(base.eqOutPort, 'out');
      const slot = _eqWizardPortSlot(base.eqOutPort);
      const match = findCenterEquipmentPortRow(eq, {
        portApiId: base.eqPortApiId, side, slot,
      });
      if (match?.label) base.eqOutCode = match.label;
    }
    if (mode === 'eq-hop' && !base.eqInCode && base.eqInPort && base.dstEqId) {
      const eq = findEquipmentById(base.dstEqId);
      const slot = String(base.eqInPort).replace(/^in/i, '');
      const slots = eq ? getCenterEquipmentPortSlots(eq, 'in') : [];
      const match = slots.find((x) => String(x.slot) === slot);
      if (match?.label) base.eqInCode = match.label;
    }
    if (mode === 'in-hop' && base.eqId) {
      const eq = findEquipmentById(base.eqId);
      const slots = eq ? getCenterEquipmentPortSlots(eq, 'in') : [];
      if (base.eqInCode) {
        const wantCode = _trimStr(base.eqInCode).toLowerCase();
        const match = slots.find((x) => _trimStr(x.label).toLowerCase() === wantCode);
        if (match) {
          base.eqInPort = `in${match.slot}`;
          base.eqInCode = match.label;
        }
      } else if (base.eqInPort) {
        const slot = eqInSlotFromPortRef(base.eqId, base.eqInPort, null);
        const match = slots.find((x) => x.slot === slot);
        if (match?.label) base.eqInCode = match.label;
      }
    }

    return base;
  },

  _resolveConnectDraft() {
    const locked = this._readConfirmPayload();
    if (locked?.mode === 'eq-hop' && locked.eqId && locked.dstEqId) {
      return this._getConfirmMergedDraft(locked);
    }
    if (locked?.mode === 'out-hop' && locked.eqId && locked.dstPort) {
      return this._getConfirmMergedDraft(locked);
    }

    const eqSnap = this._eqHopSnapshot;
    if (eqSnap?.eqId) {
      const s = this.state;
      return this._getConfirmMergedDraft({
        mode         : 'eq-hop',
        srcPort      : null,
        dstPort      : null,
        eqId         : eqSnap.eqId,
        eqName       : eqSnap.eqName || null,
        eqOutPort    : eqSnap.eqOutPort,
        eqOutCode    : eqSnap.eqOutCode,
        dstEqId      : eqSnap.dstEqId || s.dstEqId || null,
        dstEqName    : eqSnap.dstEqName || s.dstEqName || null,
        eqInPort     : eqSnap.eqInPort || s.eqInPort || null,
        eqInCode     : eqSnap.eqInCode || s.eqInCode || null,
        pendingStrand: s.pendingStrand ?? this._connectDraft?.pendingStrand ?? 0,
      });
    }

    const snap = this._outHopSnapshot;
    if (snap?.eqId && snap.mode === 'eq-to-in-fdms') {
      const s = this.state;
      return this._getConfirmMergedDraft({
        mode         : 'eq-to-in-fdms',
        srcPort      : snap.srcPort || s.srcPort || this._hopCtx?.srcPort || null,
        dstPort      : null,
        eqId         : snap.eqId,
        eqName       : snap.eqName || null,
        eqInPort     : null,
        eqInCode     : null,
        eqOutPort    : snap.eqOutPort,
        eqOutCode    : snap.eqOutCode,
        eqOutPortSide: snap.eqOutPortSide || s.eqOutPortSide || 'out',
        eqPortApiId  : snap.eqPortApiId || s.eqPortApiId || null,
        pendingStrand: s.pendingStrand ?? this._connectDraft?.pendingStrand ?? 0,
      });
    }

    if (snap?.eqId && snap.mode === 'out-hop') {
      const s = this.state;
      return this._getConfirmMergedDraft({
        mode         : 'out-hop',
        srcPort      : null,
        dstPort      : snap.dstPort || s.dstPort || null,
        eqId         : snap.eqId,
        eqName       : snap.eqName || null,
        eqInPort     : null,
        eqInCode     : null,
        eqOutPort    : snap.eqOutPort,
        eqOutCode    : snap.eqOutCode,
        eqOutPortSide: snap.eqOutPortSide || s.eqOutPortSide || 'out',
        eqPortApiId  : snap.eqPortApiId || s.eqPortApiId || null,
        dstLabel     : snap.dstLabel || null,
        pendingStrand: s.pendingStrand ?? this._connectDraft?.pendingStrand ?? 0,
      });
    }

    this._applyHopCtxToState();
    const h = this._hopCtx;
    const s = this.state;
    const prev = this._connectDraft || {};
    const eqHopFlow = h?.mode === 'eq-hop' || s.mode === 'eq-hop';
    const eqToInFdmsFlow = h?.mode === 'eq-to-in-fdms' || s.mode === 'eq-to-in-fdms'
      || this._outHopSnapshot?.mode === 'eq-to-in-fdms';
    const activeInHop = (h?.mode === 'in-hop' || s.mode === 'in-hop')
      && !!(h?.eqInPort || h?.eqInCode || s.eqInPort || s.eqInCode);
    const outFlow = !eqHopFlow && !eqToInFdmsFlow && !activeInHop && (
      h?.mode === 'out-hop'
      || s.mode === 'out-hop'
      || !!(h?.eqOutPort || h?.eqOutCode || s.eqOutPort || s.eqOutCode)
    );
    const inFlow = !eqHopFlow && !eqToInFdmsFlow && !outFlow && (
      activeInHop
      || h?.mode === 'in-hop'
      || s.mode === 'in-hop'
      || !!(h?.eqInPort || h?.eqInCode || s.eqInPort || s.eqInCode || s.srcPort)
    );
    const mode = eqHopFlow ? 'eq-hop'
      : (eqToInFdmsFlow ? 'eq-to-in-fdms'
        : (outFlow ? 'out-hop' : (inFlow ? 'in-hop' : (h?.mode || this._resolveConnectMode(s)))));
    const draft = {
      mode,
      srcPort      : (mode === 'out-hop' || mode === 'eq-hop') ? null
        : this._pickStr(s.srcPort, h?.srcPort, prev.srcPort),
      dstPort      : (mode === 'in-hop' || mode === 'eq-hop' || mode === 'eq-to-in-fdms') ? null
        : this._pickStr(s.dstPort, h?.dstPort, prev.dstPort),
      eqId         : this._pickStr(s.eqId, h?.eqId, prev.eqId),
      eqInPort     : this._pickStr(s.eqInPort, h?.eqInPort, prev.eqInPort),
      eqInCode     : this._pickStr(s.eqInCode, h?.eqInCode, prev.eqInCode),
      eqOutPort    : this._pickStr(s.eqOutPort, h?.eqOutPort, prev.eqOutPort),
      eqOutCode    : this._pickStr(s.eqOutCode, h?.eqOutCode, prev.eqOutCode),
      eqPortApiId  : this._pickStr(
        s.eqPortApiId, h?.eqPortApiId, this._outHopSnapshot?.eqPortApiId,
        this._eqHopSnapshot?.eqPortApiId, prev.eqPortApiId,
      ),
      dstEqId      : this._pickStr(s.dstEqId, h?.dstEqId, prev.dstEqId),
      dstEqName    : this._pickStr(s.dstEqName, h?.dstEqName, prev.dstEqName),
      pendingStrand: s.pendingStrand ?? prev.pendingStrand ?? 0,
    };
    if (mode === 'eq-hop' && h) {
      draft.eqId = h.eqId;
      draft.eqOutPort = h.eqOutPort;
      draft.eqOutCode = h.eqOutCode;
      draft.eqOutPortSide = h.eqOutPortSide || 'out';
      draft.eqPortApiId = h.eqPortApiId || draft.eqPortApiId;
      draft.dstEqId = h.dstEqId;
      draft.dstEqName = h.dstEqName;
      draft.eqInPort = h.eqInPort;
      draft.eqInCode = h.eqInCode;
      draft.eqTargetPortSide = h.eqTargetPortSide || 'in';
      draft.eqTargetPortApiId = h.eqTargetPortApiId || null;
    } else if (mode === 'out-hop' && h) {
      draft.eqId = h.eqId;
      draft.eqOutPort = h.eqOutPort;
      draft.eqOutCode = h.eqOutCode;
      if (h.dstPort) draft.dstPort = h.dstPort;
    } else if (mode === 'eq-to-in-fdms' && h) {
      draft.eqId = h.eqId;
      draft.eqOutPort = h.eqOutPort;
      draft.eqOutCode = h.eqOutCode;
      draft.eqOutPortSide = h.eqOutPortSide || 'out';
      draft.srcPort = this._pickStr(h.srcPort, s.srcPort, prev.srcPort);
      draft.dstPort = null;
    } else if (mode === 'in-hop' && h) {
      draft.eqId = h.eqId;
      draft.eqInPort = h.eqInPort;
      draft.eqInCode = h.eqInCode;
    }
    return this._getConfirmMergedDraft(draft);
  },

  _applyHopCtxToState() {
    let h = this._hopCtx;
    if (
      this._outHopSnapshot?.mode === 'out-hop'
      && this.state.mode === 'out-hop'
      && h?.mode !== 'in-hop'
      && (!h || h.mode !== 'out-hop')
    ) {
      h = { ...this._outHopSnapshot };
      this._hopCtx = h;
    } else if (this._eqHopSnapshot?.mode === 'eq-hop' && (!h || h.mode !== 'eq-hop')) {
      h = { ...this._eqHopSnapshot };
      this._hopCtx = h;
    }
    if (!h) return;
    this.state.mode = h.mode;
    this.state.eqId = h.eqId;
    if (h.mode === 'in-hop') {
      this.state.eqInPort = h.eqInPort;
      this.state.eqInCode = h.eqInCode;
      this.state.eqPortSide = h.eqPortSide || 'in';
      if (h.eqPortApiId) this.state.eqPortApiId = h.eqPortApiId;
      this.state.srcPort = this.state.srcPort || null;
      if (!this._outHopSnapshot && !this._eqHopSnapshot) {
        this.state.dstPort = null;
        this.state.eqOutPort = null;
        this.state.eqOutCode = null;
        this.state.dstEqId = null;
        this.state.dstEqName = null;
      }
    } else if (h.mode === 'out-hop' || h.mode === 'eq-to-in-fdms') {
      this.state.eqOutPort = h.eqOutPort;
      this.state.eqOutCode = h.eqOutCode;
      this.state.eqOutPortSide = h.eqOutPortSide || 'out';
      this.state.srcPort = h.mode === 'eq-to-in-fdms' ? (h.srcPort || this.state.srcPort) : null;
      this.state.dstEqId = null;
      this.state.dstEqName = null;
      if (h.mode === 'eq-to-in-fdms') {
        this.state.mode = 'eq-to-in-fdms';
        this.state.dstPort = null;
        this.state.dstLabel = null;
      } else if (h.dstPort) {
        this.state.dstPort = h.dstPort;
      }
    } else if (h.mode === 'eq-hop') {
      this.state.eqOutPort = h.eqOutPort;
      this.state.eqOutCode = h.eqOutCode;
      this.state.eqOutPortSide = h.eqOutPortSide || 'out';
      if (h.eqPortApiId) this.state.eqPortApiId = h.eqPortApiId;
      this.state.eqTargetPortSide = h.eqTargetPortSide || 'in';
      this.state.srcPort = null;
      this.state.dstPort = null;
      this.state.dstEqId = h.dstEqId || null;
      this.state.dstEqName = h.dstEqName || null;
      this.state.eqInPort = h.eqInPort || null;
      this.state.eqInCode = h.eqInCode || null;
      if (h.eqTargetPortApiId) this.state.eqTargetPortApiId = h.eqTargetPortApiId;
    }
  },

  _resolveConnectMode(s = this.state) {
    if (s.mode === 'in-hop' || s.mode === 'out-hop' || s.mode === 'eq-hop' || s.mode === 'eq-to-in-fdms') {
      return s.mode;
    }
    if (s.dstEqId && (s.eqOutPort || s.eqOutCode)) return 'eq-hop';
    if (s.dstPort && (s.eqOutPort || s.eqOutCode)) return 'out-hop';
    if (s.srcPort && s.dstPort && !s.eqId && !s.eqInPort && !s.eqOutPort) {
      return s.mode === 'fdms-out-to-in' ? 'fdms-out-to-in' : 'direct-fdms';
    }
    if (s.srcPort && (s.eqInPort || s.eqInCode)) return 'in-hop';
    if (s.eqOutPort || s.eqOutCode) return 'out-hop';
    return 'in-hop';
  },

  _freezeConnectDraft() {
    this._connectDraft = this._resolveConnectDraft();
    return this._connectDraft;
  },

  _connectSheetOpen() {
    return document.getElementById('sh-pick-eq')?.classList.contains('show')
      || document.getElementById('sh-pick-out')?.classList.contains('show')
      || document.getElementById('sh-pick-in')?.classList.contains('show')
      || document.getElementById('sh-confirm')?.classList.contains('show');
  },

  _canStartNewDirectConnect() {
    return !this._connectSheetOpen();
  },

  _resetFlowState() {
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._clearHopCtx();
    this._pendingEqOutCtx = null;
    this._equipConnectEqId = null;
    this._unifiedEqOutPickerOpen = false;
    this._outDestTypePickerReady = false;
    const eqPicker = document.getElementById('eq-port-picker');
    if (eqPicker) delete eqPicker.dataset.picker;
  },

  _beginInHopFromPort(portId) {
    if (!portId?.startsWith('in-')) return;
    if (getInFdmsPortConnection(portId)) {
      showToast('Port already connected — tap to view details');
      Sheets.openPortDetail(portId);
      return;
    }
    if (!this._canStartNewDirectConnect()) return;
    this._resetFlowState();
    Object.assign(this.state, {
      active: true, mode: 'in-hop', step: 2,
      srcPort: portId, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, dstEqId: null, dstEqName: null, dstPort: null,
    });
    if (!this.directConnect) {
      this._setStep(2, `${escapeHtml(fdmsInLabelFromPortKey(portId))} ✓ · Pick <strong>equipment IN</strong> port`);
    }
    Render.portList();
    this._syncDiagramConnectMode();
    setTimeout(() => this._openEqInPicker(), 220);
  },

  _beginOutFdmsHopFromPort(portKey) {
    if (!portKey?.startsWith('out-')) return;
    if (isOutFdmsPortTaken(portKey)) {
      showToast('Port already connected — tap to view details');
      return;
    }
    if (!this._canStartNewDirectConnect()) return;
    this._resetFlowState();
    const dstLabel = fdmsOutLabelFromPortKey(portKey);
    Object.assign(this.state, {
      active: true, mode: 'out-fdms-hop', step: 2,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, dstEqId: null, dstEqName: null,
      dstPort: portKey, dstLabel,
    });
    Render.diagram();
    this._syncDiagramConnectMode();
    setTimeout(() => this._openOutFdmsDestPicker(), 220);
  },

  /** Equipment detail → connect IN port (pick IN-FDMS next) */
  _beginInHopToEqIn(eqId, inPort, inCode) {
    if (!eqId || !inPort) return;
    if (!this._canStartNewDirectConnect()) return;
    const inSlot = eqInSlotFromPortRef(eqId, inPort, inCode);
    if (inSlot != null) {
      const cap = eqInPortInFdmsLinkCapacity(eqId, inSlot);
      if (!cap.allowed) {
        showToast(inFdmsEqInCapacityToast(cap));
        return;
      }
    }
    this._resetFlowState();
    if (!this._setInHopCtx(eqId, inPort, inCode)) {
      showToast('⚠️ Equipment not found');
      return;
    }
    const eq = findEquipmentById(eqId);
    Object.assign(this.state, {
      active: true, mode: 'in-hop', step: 1,
      srcPort: null,
      eqId: String(eqId),
      eqInPort: inPort,
      eqInCode: inCode || null,
      eqOutPort: null, eqOutCode: null,
      dstEqId: null, dstEqName: null, dstPort: null,
    });
    if (!this.directConnect) {
      const inLbl = inCode || inPort;
      this._setStep(1, `${escapeHtml(eq?.name || 'Equipment')} · ${escapeHtml(inLbl)} · Pick <strong>IN-FDMS</strong> port`);
    }
    Sheets.close('sh-eq-detail');
    this._syncDiagramConnectMode();
    setTimeout(() => this._openInFdmsPicker(), 120);
  },

  _beginFromEquipDetailPort(eqId, side, slot, code, portApiId = null) {
    if (!eqId || !slot) return;
    const portRef = `${side}${slot}`;
    const eq = findEquipmentById(eqId);
    const apiId = portApiId
      || eq?.ports_by_slot?.[side]?.[slot]?.id
      || getAllCenterEquipmentPortSlots(eq).find((r) => r.side === side && r.slot === slot)?.portId
      || null;
    if (!this._canStartNewDirectConnect()) return;
    this._resetFlowState();
    Object.assign(this.state, {
      active: true, mode: 'out-hop', step: 1,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, eqOutPortSide: null, eqPortApiId: null,
      dstEqId: null, dstEqName: null, dstPort: null,
    });
    Sheets.close('sh-eq-detail');
    this._selectEqOut(eqId, portRef, code, null, side, apiId);
  },

  _beginFromDiagramEqOut(eqId, slot, code, portEl, portSide = 'out') {
    if (!eqId || !slot) return;
    if (!this._canStartNewDirectConnect()) return;
    const side = portSide || portEl?.getAttribute?.('data-eq-side') || 'out';
    this._resetFlowState();
    Object.assign(this.state, {
      active: true, mode: 'out-hop', step: 1,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, eqOutPortSide: null,
      dstEqId: null, dstEqName: null, dstPort: null,
    });
    this._selectEqOut(eqId, `${side}${slot}`, code, portEl, side);
  },

  /** Equipment detail → Connect a Port → all ports, then OUT-FDMS or other equipment */
  _startOutConnectFromEquip(eqId) {
    if (!eqId || !findEquipmentById(eqId)) {
      showToast('⚠️ Equipment not found');
      return;
    }
    if (!getAllCenterEquipmentPortSlots(findEquipmentById(eqId)).length) {
      showToast('⚠️ No ports on this equipment');
      return;
    }
    if (!this._canStartNewDirectConnect()) return;
    this._resetFlowState();
    this._equipConnectEqId = String(eqId);
    Object.assign(this.state, {
      active: true, mode: 'unified', step: 1,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, eqOutPortSide: null, eqPortApiId: null,
      dstEqId: null, dstEqName: null, dstPort: null,
    });
    this._openEqOutPickerForEq(eqId, { unified: true });
  },

  _syncConnectBodyClass() {
    if (this.directConnect) {
      document.body.classList.remove(
        'connect-mode', 'connect-mode-unified', 'connect-mode-in-hop',
        'connect-mode-out-hop', 'connect-mode-eq-hop',
        'connect-eq-hop-step-2', 'connect-out-hop-step-2',
      );
      return;
    }
    const { active, mode, step } = this.state;
    document.body.classList.toggle(
      'connect-mode-unified',
      active && mode === 'unified',
    );
    document.body.classList.toggle(
      'connect-mode-in-hop',
      active && (mode === 'in-hop' || mode === 'unified'),
    );
    document.body.classList.toggle(
      'connect-mode-out-hop',
      active && (mode === 'out-hop' || mode === 'unified'),
    );
    document.body.classList.toggle(
      'connect-mode-eq-hop',
      active && mode === 'eq-hop',
    );
    document.body.classList.toggle(
      'connect-eq-hop-step-2',
      active && mode === 'eq-hop' && step === 2,
    );
    document.body.classList.toggle(
      'connect-out-hop-step-2',
      active && mode === 'out-hop' && step === 2,
    );
  },

  _updateModeButtons() {
    document.querySelectorAll('[data-action="connect-mode-in"]').forEach((btn) => {
      btn.classList.toggle('active', this.state.active && this.state.mode === 'in-hop');
    });
    document.querySelectorAll('[data-action="connect-mode-eq"]').forEach((btn) => {
      btn.classList.toggle('active', this.state.active && this.state.mode === 'eq-hop');
    });
    document.querySelectorAll('[data-action="connect-mode-out"]').forEach((btn) => {
      btn.classList.toggle('active', this.state.active && this.state.mode === 'out-hop');
    });
  },

  _isDiagramEqOutPort(el) {
    if (!el?.classList?.contains('d-eq-port')) return false;
    if (el.getAttribute('data-eq-side') === 'out') return true;
    if (/__out\d+$/i.test(el.id || '')) return true;
    return el.closest('.d-eq-ports-section')?.classList.contains('d-eq-ports-out') ?? false;
  },

  _isDiagramEqInPort(el) {
    if (!el?.classList?.contains('d-eq-port')) return false;
    if (el.getAttribute('data-eq-side') === 'in') return true;
    if (/__in\d+$/i.test(el.id || '')) return true;
    return el.closest('.d-eq-ports-section')?.classList.contains('d-eq-ports-in') ?? false;
  },

  /** Highlight pickable ports on diagram + port list without full re-render */
  _syncDiagramConnectMode() {
    if (this.directConnect) {
      document.querySelectorAll('.pickable, .connect-pickable, .pickable-eq-connect').forEach((el) => {
        el.classList.remove('pickable', 'connect-pickable', 'pickable-eq-connect');
      });
      return;
    }
    const { active, mode, step } = this.state;
    const srcEqId = this._eqHopSnapshot?.eqId || this._hopCtx?.eqId || this.state.eqId;
    this._syncConnectBodyClass();
    this._updateModeButtons();

    document.querySelectorAll('.d-port-fdms[data-in-port]').forEach((el) => {
      const portKey = el.getAttribute('data-in-port');
      const conn = portKey ? getInFdmsPortConnection(portKey) : null;
      const pick = active && (mode === 'in-hop' || mode === 'unified') && step === 1 && portKey && !conn;
      el.classList.toggle('pickable', pick);
    });

    document.querySelectorAll('.d-port-fdms[data-out-port]').forEach((el) => {
      const portKey = el.getAttribute('data-out-port');
      const taken = portKey ? isOutFdmsPortTaken(portKey) : false;
      const pick = active && mode === 'out-hop' && step === 2 && portKey && !taken;
      el.classList.toggle('pickable', pick);
    });

    document.querySelectorAll('.d-eq-port').forEach((el) => {
      const side = el.getAttribute('data-eq-side')
        || (this._isDiagramEqOutPort(el) ? 'out' : (this._isDiagramEqInPort(el) ? 'in' : null));
      const cardEqId = eqIdFromDiagramPortEl(el);
      const pickUnified = active && step === 1
        && (mode === 'unified' || mode === 'out-hop' || mode === 'eq-hop');
      const pickEqHopTarget = active && mode === 'eq-hop' && step === 2
        && cardEqId && srcEqId && String(cardEqId) !== String(srcEqId);
      el.classList.toggle('pickable', !!(pickUnified || pickEqHopTarget));
    });

    document.querySelectorAll('#port-list .port-card.free').forEach((el) => {
      const portKey = el.getAttribute('data-in-port');
      const pick = active && (mode === 'in-hop' || mode === 'unified') && step === 1 && portKey;
      el.classList.toggle('connect-pickable', !!pick);
    });

    document.querySelectorAll('.d-eq[data-eq-id]').forEach((el) => {
      const eqId = el.getAttribute('data-eq-id');
      const eq = eqId ? findEquipmentById(eqId) : null;
      const hasPorts = eq && getAllCenterEquipmentPortSlots(eq).length > 0;
      const pick = active && step === 1
        && (mode === 'unified' || mode === 'out-hop' || mode === 'eq-hop')
        && hasPorts;
      el.classList.toggle('pickable-eq-connect', !!pick);
    });
  },

  _refreshConnectUi({ redrawDiagram = false } = {}) {
    refreshFdmsColumnPortsOnEquipment();
    Render.portList();
    const hasFdmsPorts = !!document.getElementById('d-in')?.querySelector('.d-port-fdms');
    if (redrawDiagram || !hasFdmsPorts) {
      Render.diagram();
    }
    this._syncDiagramConnectMode();
    scheduleDiagramLinesRedraw();
  },

  /* ── START ───────────────────────────────────────────── */
  start() {
    if (this.directConnect) return;
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._clearHopCtx();
    this._pendingEqOutCtx = null;
    this._equipConnectEqId = null;
    this._unifiedEqOutPickerOpen = false;
    this._outDestTypePickerReady = false;
    const eqPicker = document.getElementById('eq-port-picker');
    if (eqPicker) delete eqPicker.dataset.picker;
    Object.assign(this.state, {
      active: true, mode: 'unified', step: 1,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, dstEqId: null, dstEqName: null, dstPort: null,
    });

    document.body.classList.add('connect-mode');
    const wrap = document.getElementById('conn-prog-wrap');
    if (wrap) {
      wrap.classList.add('show');
      wrap.setAttribute('aria-hidden', 'false');
    }

    this._setStep(1, 'Pick an <strong>IN-FDMS</strong> port, a highlighted <strong>equipment OUT</strong> port, or tap an <strong>equipment</strong> box');

    if (App._isTabLayout()) App.switchTab('diagram');

    Sheets.close('sh-port');
    Sheets.close('sh-eq-detail');
    Sheets.close('sh-pick-eq');
    Sheets.close('sh-pick-out');
    Sheets.close('sh-pick-in');
    this._syncConnectBodyClass();
    this._updateModeButtons();
    this._refreshConnectUi({ redrawDiagram: true });
  },

    startInHop() {
    if (this.state.active && this.state.mode === 'in-hop' && this.state.step >= 1) return;
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._clearHopCtx();
    Sheets.close('sh-pick-out');
    Sheets.close('sh-pick-in');
    Sheets.close('sh-confirm');
    Object.assign(this.state, {
      active: true, mode: 'in-hop', step: 1,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, dstEqId: null, dstEqName: null, dstPort: null,
    });

    document.body.classList.add('connect-mode');
    const wrap = document.getElementById('conn-prog-wrap');
    if (wrap) {
      wrap.classList.add('show');
      wrap.setAttribute('aria-hidden', 'false');
    }
    this._setStep(1, 'Pick an <strong>IN-FDMS</strong> port from the list');

    if (App._isTabLayout()) App.switchTab('ports');
    else {
      const portsPanel = document.getElementById('panel-ports');
      if (portsPanel?.classList.contains('ports-hidden')) App.togglePortsPanel();
    }

    Sheets.close('sh-port');
    this._refreshConnectUi({ redrawDiagram: true });
  },

  startEqHop() {
    if (this._countCenterEquipment() < 2) {
      showToast('⚠️ At least 2 equipment are required for equipment-to-equipment links');
      return;
    }
    if (this.state.active && this.state.mode === 'eq-hop' && this.state.step >= 1) return;
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._clearHopCtx();
    Sheets.close('sh-pick-out');
    Sheets.close('sh-pick-in');
    Sheets.close('sh-confirm');
    Object.assign(this.state, {
      active: true, mode: 'eq-hop', step: 1,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, dstEqId: null, dstEqName: null, dstPort: null,
    });

    document.body.classList.add('connect-mode');
    const wrap = document.getElementById('conn-prog-wrap');
    if (wrap) {
      wrap.classList.add('show');
      wrap.setAttribute('aria-hidden', 'false');
    }
    this._setStep(1, 'Pick a highlighted <strong>equipment OUT</strong> port (source)');

    if (App._isTabLayout()) App.switchTab('diagram');

    Sheets.close('sh-port');
    this._refreshConnectUi({ redrawDiagram: true });
  },

  startOutHop() {
    if (this.state.active && this.state.mode === 'out-hop' && this.state.step >= 1) return;
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._clearHopCtx();
    Sheets.close('sh-pick-out');
    Sheets.close('sh-pick-in');
    Sheets.close('sh-confirm');
    Object.assign(this.state, {
      active: true, mode: 'out-hop', step: 1,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, dstEqId: null, dstEqName: null, dstPort: null,
    });

    document.body.classList.add('connect-mode');
    const wrap = document.getElementById('conn-prog-wrap');
    if (wrap) {
      wrap.classList.add('show');
      wrap.setAttribute('aria-hidden', 'false');
    }
    this._setStep(1, 'Pick a highlighted <strong>equipment OUT</strong> port on the diagram');

    if (App._isTabLayout()) App.switchTab('diagram');
    else {
      const diagramPanel = document.getElementById('panel-diagram');
      if (diagramPanel && !diagramPanel.classList.contains('active')) {
        /* desktop: diagram already visible in layout */
      }
    }

    Sheets.close('sh-port');
    this._refreshConnectUi({ redrawDiagram: true });
  },

  /* ── CANCEL ──────────────────────────────────────────── */
  cancel() {
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._clearHopCtx();
    this._pendingEqOutCtx = null;
    this._equipConnectEqId = null;
    this._unifiedEqOutPickerOpen = false;
    this._outDestTypePickerReady = false;
    const eqPicker = document.getElementById('eq-port-picker');
    if (eqPicker) delete eqPicker.dataset.picker;
    Object.assign(this.state, {
      active: false, mode: null, step: 0,
      srcPort: null, eqId: null, eqInPort: null, eqInCode: null,
      eqOutPort: null, eqOutCode: null, dstEqId: null, dstEqName: null, dstPort: null,
    });

    document.body.classList.remove('connect-mode');
    document.body.classList.remove(
      'connect-mode-unified', 'connect-mode-in-hop', 'connect-mode-out-hop', 'connect-mode-eq-hop',
      'connect-eq-hop-step-2', 'connect-out-hop-step-2',
    );
    const wrap = document.getElementById('conn-prog-wrap');
    if (wrap) {
      wrap.classList.remove('show');
      wrap.setAttribute('aria-hidden', 'true');
    }
    const prog = document.getElementById('conn-prog');
    if (prog) prog.classList.remove('connect-pick-type');
    const hintEl = document.getElementById('cp-hint');
    if (hintEl) hintEl.classList.remove('cp-hint-mode-picker');
    const stepsEl = document.querySelector('.cp-steps');
    if (stepsEl) stepsEl.style.display = '';
    Sheets.close('sh-pick-eq');
    Sheets.close('sh-pick-out');
    Sheets.close('sh-pick-in');
    Sheets.close('sh-confirm');
    Sheets.close('sh-port');
    this._refreshConnectUi();
  },

  bindUI() {
    document.querySelectorAll('[data-action="connect-start"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.start();
      });
    });

    document.querySelectorAll('[data-action="connect-cancel"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      });
    });

    document.querySelectorAll('[data-action="confirm-save"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Connect.confirm();
      });
    });

    if (this._uiBound) return;
    this._uiBound = true;

    document.getElementById('eq-port-picker')?.addEventListener('input', (e) => {
      const inInp = e.target.closest('[data-action="eq-in-pick-search"]');
      if (inInp) {
        const eqId = inInp.getAttribute('data-eq-id');
        if (eqId) this._filterEqInPickerPorts(eqId, inInp.value);
        return;
      }
      const outInp = e.target.closest('[data-action="eq-out-pick-search"]');
      if (outInp) {
        const eqId = outInp.getAttribute('data-eq-id');
        if (eqId) this._filterEqOutPickerPorts(eqId, outInp.value);
        return;
      }
      const outFdmsInHopInp = e.target.closest('[data-action="out-fdms-in-hop-pick-search"]');
      if (outFdmsInHopInp) {
        this._filterOutFdmsInHopPickerPorts(outFdmsInHopInp.value);
        return;
      }
      const outFdmsHopEqInp = e.target.closest('[data-action="out-fdms-hop-eq-search"]');
      if (outFdmsHopEqInp) {
        const eqId = outFdmsHopEqInp.getAttribute('data-eq-id');
        if (eqId) this._filterOutFdmsHopEqPickerPorts(eqId, outFdmsHopEqInp.value);
        return;
      }
      const inFdmsOutHopInp = e.target.closest('[data-action="in-fdms-out-hop-pick-search"]');
      if (inFdmsOutHopInp) {
        this._filterInFdmsOutHopPickerPorts(inFdmsOutHopInp.value);
      }
    });

    document.getElementById('out-picker')?.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-action="out-fdms-pick-search"]');
      if (!inp) return;
      this._filterOutFdmsPickerPorts(inp.value);
    });

    document.getElementById('in-picker')?.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-action="in-fdms-pick-search"]');
      if (!inp) return;
      this._filterInFdmsPickerPorts(inp.value);
    });

    document.addEventListener('click', (e) => {
      const confirmSave = e.target.closest('[data-action="confirm-save"]');
      if (confirmSave) {
        e.preventDefault();
        e.stopPropagation();
        Connect.confirm();
        return;
      }

      const modeIn = e.target.closest('[data-action="connect-mode-in"]');
      if (modeIn) {
        e.preventDefault();
        e.stopPropagation();
        Connect.startInHop();
        return;
      }
      const modeEq = e.target.closest('[data-action="connect-mode-eq"]');
      if (modeEq) {
        e.preventDefault();
        e.stopPropagation();
        Connect.startEqHop();
        return;
      }

      const modeOut = e.target.closest('[data-action="connect-mode-out"]');
      if (modeOut) {
        e.preventDefault();
        e.stopPropagation();
        Connect.startOutHop();
        return;
      }

      const outDestBack = e.target.closest('[data-action="connect-out-dest-back"]');
      if (outDestBack) {
        e.preventDefault();
        e.stopPropagation();
        const pickerPhase = document.getElementById('eq-port-picker')?.getAttribute('data-picker');
        if (Connect._unifiedEqOutPickerOpen || pickerPhase === 'unified-eq-out') {
          Connect._backFromUnifiedEqOutPicker();
        } else {
          Connect._backFromOutDestTypePicker();
        }
        return;
      }

      const outFdmsPick = e.target.closest('[data-out-fdms-pick]');
      if (outFdmsPick && !outFdmsPick.disabled
        && document.getElementById('sh-pick-out')?.classList.contains('show')) {
        e.preventDefault();
        e.stopPropagation();
        Connect._pickOutFdmsPort(outFdmsPick);
        return;
      }

      const inFdmsPick = e.target.closest('[data-in-fdms-pick]');
      if (inFdmsPick && !inFdmsPick.disabled
        && document.getElementById('sh-pick-in')?.classList.contains('show')) {
        e.preventDefault();
        e.stopPropagation();
        Connect._pickInFdmsPort(inFdmsPick);
        return;
      }

      const outFdmsDiagram = e.target.closest('.d-port-fdms[data-out-port]');
      if (outFdmsDiagram
        && Connect.state.active
        && Connect.state.mode === 'out-hop'
        && Connect.state.step === 2) {
        if (!Connect._outHopSourceReady()) {
          e.preventDefault();
          e.stopPropagation();
          showToast('⚠️ Pick an equipment port first');
          Connect.state.step = 1;
          Connect._setStep(1, 'Pick an <strong>equipment</strong> port on the diagram');
          Connect._syncDiagramConnectMode();
          return;
        }
        const portKey = outFdmsDiagram.getAttribute('data-out-port');
        if (portKey && !isOutFdmsPortTaken(portKey)) {
          e.preventDefault();
          e.stopPropagation();
          Connect._selectDst(portKey);
          return;
        }
      }

      const eqHopInPick = e.target.closest('[data-eq-hop-in-pick]');
      if (eqHopInPick && document.getElementById('sh-pick-eq')?.classList.contains('show')
        && Connect.state.mode === 'eq-hop') {
        e.preventDefault();
        e.stopPropagation();
        const group = eqHopInPick.closest('.eq-pick-group');
        const rawEqId = group?.getAttribute('data-eq-id')
          || eqHopInPick.getAttribute('data-eq-hop-in-pick');
        const eq = findEquipmentForPickerPort(eqHopInPick, rawEqId);
        const slot = eqHopInPick.getAttribute('data-eq-in-slot');
        const code = eqHopInPick.getAttribute('data-eq-in-code');
        const side = eqHopInPick.getAttribute('data-eq-port-side') || 'in';
        const portApiId = eqHopInPick.getAttribute('data-eq-port-id') || null;
        if (eq && slot) {
          Connect._selectEqHopTarget(String(eq.id), `${side}${slot}`, code, eqHopInPick, side, portApiId);
        } else if (!eq) showToast('⚠️ Equipment not found — pick the port again');
        return;
      }

      const outFdmsInHopPick = e.target.closest('[data-out-fdms-in-hop-pick]');
      if (outFdmsInHopPick && !outFdmsInHopPick.disabled
        && document.getElementById('sh-pick-eq')?.classList.contains('show')
        && Connect.state.mode === 'in-hop') {
        e.preventDefault();
        e.stopPropagation();
        const portKey = outFdmsInHopPick.getAttribute('data-out-fdms-in-hop-pick');
        const label = outFdmsInHopPick.getAttribute('data-out-fdms-label');
        Connect._selectDirectOutFdms(portKey, label);
        return;
      }

      const eqOutFdmsHopPick = e.target.closest('[data-eq-out-fdms-hop-pick]');
      if (eqOutFdmsHopPick && !eqOutFdmsHopPick.disabled
        && document.getElementById('sh-pick-eq')?.classList.contains('show')
        && Connect.state.mode === 'out-fdms-hop') {
        e.preventDefault();
        e.stopPropagation();
        const group = eqOutFdmsHopPick.closest('[data-eq-id]');
        const rawEqId = group?.getAttribute('data-eq-id')
          || eqOutFdmsHopPick.getAttribute('data-eq-out-fdms-hop-pick');
        const eq = findEquipmentForPickerPort(eqOutFdmsHopPick, rawEqId);
        const slot = eqOutFdmsHopPick.getAttribute('data-eq-out-fdms-slot');
        const code = eqOutFdmsHopPick.getAttribute('data-eq-out-fdms-code');
        const side = eqOutFdmsHopPick.getAttribute('data-eq-port-side') || 'out';
        const portApiId = eqOutFdmsHopPick.getAttribute('data-eq-port-id') || null;
        if (eq && slot) {
          Connect._selectOutFdmsHopEq(String(eq.id), `${side}${slot}`, code, side, portApiId);
        } else if (!eq) showToast('⚠️ Equipment not found — pick the port again');
        return;
      }

      const inFdmsOutHopPick = e.target.closest('[data-in-fdms-out-hop-pick]');
      if (inFdmsOutHopPick && !inFdmsOutHopPick.disabled
        && document.getElementById('sh-pick-eq')?.classList.contains('show')
        && Connect.state.mode === 'out-fdms-hop') {
        e.preventDefault();
        e.stopPropagation();
        const portKey = inFdmsOutHopPick.getAttribute('data-in-fdms-out-hop-pick');
        const label = inFdmsOutHopPick.getAttribute('data-in-fdms-label');
        Connect._selectOutFdmsHopInFdms(portKey, label);
        return;
      }

      const eqInPick = e.target.closest('[data-eq-in-pick]');
      if (eqInPick && document.getElementById('sh-pick-eq')?.classList.contains('show')
        && Connect.state.mode === 'in-hop') {
        e.preventDefault();
        e.stopPropagation();
        const group = eqInPick.closest('[data-eq-id]');
        const rawEqId = group?.getAttribute('data-eq-id')
          || eqInPick.getAttribute('data-eq-in-pick');
        const eq = findEquipmentForPickerPort(eqInPick, rawEqId);
        const slot = eqInPick.getAttribute('data-eq-in-slot');
        const code = eqInPick.getAttribute('data-eq-in-code');
        const side = eqInPick.getAttribute('data-eq-port-side') || 'in';
        const portApiId = eqInPick.getAttribute('data-eq-port-id') || null;
        if (eq && slot) Connect._selectEqIn(String(eq.id), `${side}${slot}`, code, side, portApiId);
        else if (!eq) showToast('⚠️ Equipment not found — pick the port again');
        return;
      }

      const eqOutPick = e.target.closest('[data-eq-out-pick]');
      if (eqOutPick && document.getElementById('sh-pick-eq')?.classList.contains('show')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const group = eqOutPick.closest('.eq-pick-group');
        const rawEqId = group?.getAttribute('data-eq-id')
          || eqOutPick.getAttribute('data-eq-out-pick');
        const eq = findEquipmentForPickerPort(eqOutPick, rawEqId);
        const eqId = eq ? String(eq.id) : rawEqId;
        const slot = eqOutPick.getAttribute('data-eq-out-slot');
        const code = eqOutPick.getAttribute('data-eq-out-code');
        const side = eqOutPick.getAttribute('data-eq-port-side') || 'out';
        const portApiId = eqOutPick.getAttribute('data-eq-port-id') || null;
        const picker = document.getElementById('eq-port-picker');
        const pickerPhase = picker?.getAttribute('data-picker') || '';
        const isUnifiedOutList = pickerPhase === 'unified-eq-out' || Connect._unifiedEqOutPickerOpen;
        if (!eq) {
          showToast('⚠️ Equipment not found — try again');
          return;
        }
        if (slot && isUnifiedOutList) {
          Connect._onUnifiedEqOutPick(eqId, `${side}${slot}`, code, eqOutPick, side, portApiId);
        } else if (slot && pickerPhase !== 'out-dest-type') {
          if (Connect.state.mode === 'out-hop') {
            Connect._selectEqOut(eqId, `${side}${slot}`, code, eqOutPick, side, portApiId);
          } else {
            Connect._onUnifiedEqOutPick(eqId, `${side}${slot}`, code, eqOutPick, side, portApiId);
          }
        }
        return;
      }

      const pickerPhase = document.getElementById('eq-port-picker')?.getAttribute('data-picker') || '';
      const outDestOutFdms = e.target.closest('[data-action="connect-out-dest-out-fdms"]');
      if (outDestOutFdms && pickerPhase === 'out-dest-type') {
        e.preventDefault();
        e.stopPropagation();
        Connect._confirmOutDestOutFdms();
        return;
      }

      const outDestEqIn = e.target.closest('[data-action="connect-out-dest-eq-in"]');
      if (outDestEqIn && pickerPhase === 'out-dest-type') {
        e.preventDefault();
        e.stopPropagation();
        Connect._confirmOutDestEqIn();
        return;
      }

      const outDestInFdms = e.target.closest('[data-action="connect-out-dest-in-fdms"]');
      if (outDestInFdms && pickerPhase === 'out-dest-type') {
        e.preventDefault();
        e.stopPropagation();
        Connect._confirmOutDestInFdms();
        return;
      }

      const eqDiagramPort = e.target.closest('.d-eq-port');
      const eqPortDirect = Connect.directConnect && eqDiagramPort
        && Connect._canStartNewDirectConnect();
      const eqPortLegacy = eqDiagramPort && Connect.state.active
        && Connect.state.step === 1
        && (Connect.state.mode === 'unified'
          || Connect.state.mode === 'out-hop'
          || Connect.state.mode === 'eq-hop');
      const eqHopTarget = eqDiagramPort && Connect.state.active
        && Connect.state.mode === 'eq-hop' && Connect.state.step === 2;
      if (eqPortDirect || eqPortLegacy || eqHopTarget) {
        e.preventDefault();
        e.stopPropagation();
        const eqId = eqIdFromDiagramPortEl(eqDiagramPort);
        let slot = eqDiagramPort.getAttribute('data-eq-slot');
        const side = eqDiagramPort.getAttribute('data-eq-side')
          || (Connect._isDiagramEqOutPort(eqDiagramPort) ? 'out' : 'in');
        if (!slot) {
          const sm = (eqDiagramPort.id || '').match(/__(?:in|out)(\d+)$/i);
          if (sm) slot = sm[1];
        }
        const code = eqDiagramPort.getAttribute(`data-eq-${side}-code`)
          || eqDiagramPort.getAttribute('data-eq-in-code')
          || eqDiagramPort.getAttribute('data-eq-out-code')
          || eqDiagramPort.querySelector('.d-eq-port-code')?.textContent?.trim()
          || eqDiagramPort.getAttribute('title');
        const portApiId = eqDiagramPort.getAttribute('data-eq-port-id') || null;
        if (!slot || !eqId) {
          showToast('⚠️ Could not read port — try again');
          return;
        }
        if (eqHopTarget) {
          Connect._selectEqHopTarget(eqId, `${side}${slot}`, code, eqDiagramPort, side, portApiId);
        } else if (Connect.state.mode === 'out-hop') {
          Connect._selectEqOut(eqId, `${side}${slot}`, code, eqDiagramPort, side, portApiId);
        } else {
          Connect._onUnifiedEqOutPick(eqId, `${side}${slot}`, code, eqDiagramPort, side, portApiId);
        }
        return;
      }

      const inPort = e.target.closest('[data-in-port]');
      if (inPort) {
        e.preventDefault();
        Render.portTap(inPort.dataset.inPort);
        return;
      }

      const outPort = e.target.closest('[data-out-port]');
      if (outPort) {
        e.preventDefault();
        Render.outPortTap(outPort.getAttribute('data-out-port'));
      }
    });
  },

  /* ── PORT TAP (step 1) ───────────────────────────────── */
  portTap(portId) {
    if (this.state.mode !== 'in-hop' && this.state.mode !== 'unified') return;
    if (!portId.startsWith('in-')) {
      showToast('⚠️ Please select an IN-FDMS port');
      return;
    }
    if (this.state.step !== 1) return;

    // Already connected?
    const existing = State.connections.find(c => c.src === portId);
    if (existing) {
      showToast('Port already connected — tap to view details');
      Sheets.openPortDetail(portId);
      return;
    }

    this.state.mode = 'in-hop';
    this.state.srcPort = portId;
    this.state.eqOutPort = null;
    this.state.eqOutCode = null;
    this.state.dstPort = null;
    this.state.dstEqId = null;
    this.state.dstEqName = null;
    if (this.state.eqId && (this.state.eqInPort || this.state.eqInCode)) {
      this._applyHopCtxToState();
      this.state.mode = 'in-hop';
      this.state.srcPort = portId;
      this.state.eqOutPort = null;
      this.state.eqOutCode = null;
      this.state.dstPort = null;
      if (this._hopCtx?.mode === 'in-hop') {
        this.state.eqId = this._hopCtx.eqId;
        this.state.eqInPort = this._hopCtx.eqInPort;
        this.state.eqInCode = this._hopCtx.eqInCode;
      }
      this.state.pendingStrand = nextFreeStrand();
      this._connectDraft = null;
      this._clearConfirmPayload();
      this._freezeConnectDraft();
      Sheets.close('sh-pick-in');
      this._openConfirm();
      Render.portList();
      this._syncDiagramConnectMode();
      return;
    }
    this.state.step    = 2;
    this._setStep(2, `${escapeHtml(fdmsInLabelFromPortKey(portId))} ✓ · Pick <strong>equipment</strong> or <strong>OUT-FDMS</strong> port`);
    Render.portList();
    this._syncDiagramConnectMode();
    setTimeout(() => this._openEqInPicker(), 220);
  },

  _setEqPickerChrome({ title, sub, showSkip, showBack, showCancel }) {
    const sheet = document.getElementById('sh-pick-eq');
    if (!sheet) return;
    const titleEl = sheet.querySelector('.sh-title');
    const subEl = sheet.querySelector('.sh-sub');
    if (titleEl && title) titleEl.textContent = title;
    if (subEl && sub) subEl.textContent = sub;
    const skipBtn = sheet.querySelector('[data-action="connect-skip-equip"]');
    if (skipBtn) skipBtn.style.display = showSkip ? '' : 'none';
    const backBtn = sheet.querySelector('[data-action="connect-out-dest-back"]');
    if (backBtn) backBtn.style.display = showBack ? '' : 'none';
    const cancelBtn = sheet.querySelector('[data-action="connect-cancel"]');
    if (cancelBtn) cancelBtn.style.display = showCancel === false ? 'none' : '';
  },

  _buildEqOutPickerGroupHtml(eq, { unified = false } = {}) {
    const meta = EQ_META[eq.type] || EQ_META.sw;
    const slots = getAllCenterEquipmentPortSlots(eq);
    if (!slots.length) return '';

    const maxOutFdms = maxOutFdmsLinksPerEqOutPort(eq);
    let btns = '';
    slots.forEach(({ slot, label, side, portRef, portId }) => {
      const linkN = countLinksFromEqPortToOutFdms(eq.id, side, slot);
      const atCapacity = linkN >= maxOutFdms;
      const displayLabel = label;
      const code = escapeHtml(displayLabel);
      const full = `${escapeHtml(eq.name)} — ${code}`;
      const badge = linkN > 0
        ? ` <span class="eq-pick-count">${linkN}/${maxOutFdms} out</span>`
        : '';
      const unifiedCls = unified ? ' unified-eq-out-pick-btn' : '';
      const btnCls = atCapacity ? 'used' : 'out-free';
      const searchKey = [eq.name, label, portRef, side, portId].join(' ').toLowerCase();
      btns += `<button type="button" class="out-grid-btn ${btnCls}${unifiedCls}" data-eq-out-pick-row
        data-search="${attrEsc(searchKey)}" data-eq-out-pick="${attrEsc(eq.id)}"
        data-eq-out-slot="${slot}" data-eq-out-code="${attrEsc(label)}"
        data-eq-port-side="${side}" data-eq-port-id="${attrEsc(portId || '')}"
        ${atCapacity ? 'disabled' : ''}
        title="${full}${linkN ? ` (${linkN}/${maxOutFdms} OUT-FDMS)` : ''}">${code}${badge}</button>`;
    });

    const showSearch = slots.length > 4;
    const searchHtml = showSearch ? `<div class="eq-pick-search-wrap eq-pick-search-wrap--group">
      <input type="search" class="fi eq-pick-search" data-action="eq-out-pick-search"
        data-eq-id="${attrEsc(eq.id)}" placeholder="Search ${escapeHtml(eq.name)} ports…"
        autocomplete="off" enterkeyhint="search"
        aria-label="Search ${escapeHtml(eq.name)} ports">
      <p class="eq-pick-search-meta" data-eq-out-pick-meta hidden></p>
    </div>` : '';
    const emptyHtml = showSearch
      ? '<p class="eq-pick-empty eq-pick-empty--group" data-eq-out-pick-empty hidden>No ports match your search</p>'
      : '';

    return `
      <div class="eq-pick-group" id="eq-pick__${attrEsc(eq.id)}" data-eq-id="${attrEsc(eq.id)}">
        <div class="eq-pick-hdr">
          <span class="eq-pick-icon">${meta.icon}</span>
          <strong class="eq-pick-name">${escapeHtml(eq.name)}</strong>
          <span class="eq-pick-type">${meta.label}</span>
        </div>
        ${searchHtml}
        <div class="out-grid">${btns}</div>
        ${emptyHtml}
      </div>`;
  },

  _filterEqOutPickerPorts(eqId, query) {
    const group = document.querySelector(
      `.eq-pick-group[data-eq-id="${CSS.escape(String(eqId))}"]`,
    );
    if (!group) return;

    const q = _trimStr(query).toLowerCase();
    const rows = group.querySelectorAll('[data-eq-out-pick-row]');
    const emptyEl = group.querySelector('[data-eq-out-pick-empty]');
    const metaEl = group.querySelector('[data-eq-out-pick-meta]');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
  },

  _buildEqOutPickerHtml({ unified = false, onlyEqId = null } = {}) {
    let html = '';
    State.equipment.filter(isDiagramCenterEquipment).forEach((eq) => {
      if (onlyEqId != null && String(eq.id) !== String(onlyEqId)) return;
      html += this._buildEqOutPickerGroupHtml(eq, { unified });
    });
    return html;
  },

  /** Unified step 1 — any diagram OUT tap opens full equipment OUT port list */
  _openUnifiedEqOutPicker(onlyEqId = null) {
    const centerEq = State.equipment.filter(isDiagramCenterEquipment);
    if (!centerEq.length) {
      showToast('⚠️ No equipment installed at this site');
      return;
    }

    const html = this._buildEqOutPickerHtml({ unified: true, onlyEqId });
    if (!html.trim()) {
      showToast('⚠️ No equipment ports available');
      return;
    }

    const picker = document.getElementById('eq-port-picker');
    picker.innerHTML = html;
    picker.dataset.picker = 'unified-eq-out';
    this._outDestTypePickerReady = false;
    this._unifiedEqOutPickerOpen = true;
    const eq = onlyEqId ? findEquipmentById(onlyEqId) : null;
    this._setEqPickerChrome({
      title: 'Select Equipment Port',
      sub: eq
        ? `${eq.name} · Choose port, then pick destination`
        : 'Choose equipment port, then pick a destination',
      showSkip: false,
      showBack: true,
      showCancel: false,
    });
    Sheets.close('sh-eq-detail');
    Sheets.open('sh-pick-eq');
  },

  /** Connect step 1 — tap equipment box (even with no visible diagram ports) */
  _openEqOutPickerForEq(eqId, { unified = false } = {}) {
    const eq = findEquipmentById(eqId);
    if (!eq || !isDiagramCenterEquipment(eq)) {
      showToast('⚠️ Equipment not found');
      return;
    }
    const slots = getAllCenterEquipmentPortSlots(eq);
    if (!slots.length) {
      showToast('⚠️ No ports on this equipment');
      return;
    }
    if (unified) {
      this._openUnifiedEqOutPicker(eqId);
      return;
    }
    const html = this._buildEqOutPickerHtml({ onlyEqId: eqId });
    const picker = document.getElementById('eq-port-picker');
    picker.innerHTML = html;
    picker.dataset.picker = 'eq-out-list';
    this._unifiedEqOutPickerOpen = false;
    this._outDestTypePickerReady = false;
    this._setEqPickerChrome({
      title: 'Select Equipment Port',
      sub: `${eq.name} · Pick source port`,
      showSkip: false,
      showBack: false,
      showCancel: false,
    });
    Sheets.close('sh-eq-detail');
    Sheets.open('sh-pick-eq');
  },

  _backFromUnifiedEqOutPicker() {
    this._unifiedEqOutPickerOpen = false;
    this._outDestTypePickerReady = false;
    const picker = document.getElementById('eq-port-picker');
    if (picker) delete picker.dataset.picker;
    Sheets.close('sh-pick-eq');
    if (this.state.active && this.state.mode === 'unified') {
      this._setStep(1, 'Pick an <strong>IN-FDMS</strong> port, a highlighted <strong>equipment OUT</strong> port, or tap an <strong>equipment</strong> box');
      this._syncDiagramConnectMode();
    }
  },

  /** Unified mode — equipment OUT picked; ask OUT-FDMS vs equipment IN */
  _onUnifiedEqOutPick(eqId, outPort, outCode, portEl, portSide = 'out', portApiId = null) {
    const eq = findEquipmentForPickerPort(portEl, eqId) || findEquipmentById(eqId);
    if (!eq) {
      showToast('⚠️ Equipment not found — try again');
      return;
    }
    const resolvedEqId = String(eq.id);
    const side = portSide || portEl?.getAttribute?.('data-eq-port-side') || 'out';
    const apiId = portApiId || portEl?.getAttribute?.('data-eq-port-id') || null;
    this._unifiedEqOutPickerOpen = false;
    this._outDestTypePickerReady = false;
    const picker = document.getElementById('eq-port-picker');
    if (picker) picker.dataset.picker = 'out-dest-type';
    this._pendingEqOutCtx = { eqId: resolvedEqId, outPort, outCode, portEl, portSide: side, portApiId: apiId };
    const portLbl = outCode || outPort.toUpperCase();
    const eqName = eq?.name || 'Equipment';
    this._openOutDestTypePicker(eqName, portLbl);
  },

  _openOutDestTypePicker(eqName, outLbl) {
    this._outDestTypePickerReady = false;
    const picker = document.getElementById('eq-port-picker');
    if (picker) picker.dataset.picker = 'out-dest-type';
    const eqInBtn = this._countCenterEquipment() >= 2
      ? `<button type="button" class="eq-dest-type-btn" data-action="connect-out-dest-eq-in">
          <strong>Equipment → Equipment</strong>
          <span>Link to another device port</span>
        </button>`
      : '';
    document.getElementById('eq-port-picker').innerHTML = `
      <div class="eq-dest-type-list">
        <button type="button" class="eq-dest-type-btn" data-action="connect-out-dest-out-fdms">
          <strong>Equipment → OUT-FDMS</strong>
          <span>Route to an OUT-FDMS port</span>
        </button>
        <button type="button" class="eq-dest-type-btn" data-action="connect-out-dest-in-fdms">
          <strong>Equipment → IN-FDMS</strong>
          <span>Route to an IN-FDMS port</span>
        </button>
        ${eqInBtn}
      </div>`;
    this._setEqPickerChrome({
      title: 'Choose connection type',
      sub: `${eqName} · ${outLbl}`,
      showSkip: false,
      showBack: true,
      showCancel: false,
    });
    Sheets.open('sh-pick-eq');
    window.setTimeout(() => {
      this._outDestTypePickerReady = true;
    }, 280);
  },

  _backFromOutDestTypePicker() {
    const restoreEqId = this._pendingEqOutCtx?.eqId || this._equipConnectEqId || null;
    this._pendingEqOutCtx = null;
    this._outDestTypePickerReady = false;
    const picker = document.getElementById('eq-port-picker');
    if (picker) delete picker.dataset.picker;
    Sheets.close('sh-pick-eq');
    if (restoreEqId) {
      this._openUnifiedEqOutPicker(restoreEqId);
    } else if (this.state.active && this.state.mode === 'unified') {
      this._openUnifiedEqOutPicker();
    }
  },

  _confirmOutDestOutFdms() {
    if (!this._outDestTypePickerReady) return;
    const ctx = this._pendingEqOutCtx;
    if (!ctx) {
      showToast('⚠️ Equipment port missing — pick again');
      return;
    }
    this._outDestTypePickerReady = false;
    this._pendingEqOutCtx = null;
    this.state.mode = 'out-hop';
    this.state.eqOutPortSide = ctx.portSide || 'out';
    this._selectEqOut(ctx.eqId, ctx.outPort, ctx.outCode, ctx.portEl, ctx.portSide, ctx.portApiId);
  },

  _confirmOutDestEqIn() {
    if (!this._outDestTypePickerReady) return;
    if (this._countCenterEquipment() < 2) {
      showToast('⚠️ At least 2 equipment are required for equipment-to-equipment links');
      return;
    }
    const ctx = this._pendingEqOutCtx;
    if (!ctx) {
      showToast('⚠️ Equipment port missing — pick again');
      return;
    }
    this._outDestTypePickerReady = false;
    this._pendingEqOutCtx = null;
    this.state.mode = 'eq-hop';
    this.state.eqOutPortSide = ctx.portSide || 'out';
    this._selectEqHopSource(ctx.eqId, ctx.outPort, ctx.outCode, ctx.portEl, ctx.portSide, ctx.portApiId);
  },

  _confirmOutDestInFdms() {
    if (!this._outDestTypePickerReady) return;
    const ctx = this._pendingEqOutCtx;
    if (!ctx) {
      showToast('⚠️ Equipment port missing — pick again');
      return;
    }
    this._outDestTypePickerReady = false;
    this._pendingEqOutCtx = null;
    this.state.mode = 'eq-to-in-fdms';
    this.state.eqOutPortSide = ctx.portSide || 'out';
    if (!this._setOutHopCtx(
      ctx.eqId, ctx.outPort, ctx.outCode, ctx.portEl, ctx.portSide, 'eq-to-in-fdms', ctx.portApiId,
    )) {
      showToast('⚠️ Equipment not found — pick the port again');
      return;
    }
    const eq = findEquipmentById(ctx.eqId);
    const portLbl = ctx.outCode || ctx.outPort?.toUpperCase() || 'Port';
    this.state.step = 2;
    this._setStep(2, `${escapeHtml(eq?.name || 'Equipment')} · ${escapeHtml(portLbl)} ✓ · Pick <strong>IN-FDMS</strong> port`);
    this._syncDiagramConnectMode();
    const picker = document.getElementById('eq-port-picker');
    if (picker) delete picker.dataset.picker;
    this._unifiedEqOutPickerOpen = false;
    Sheets.close('sh-pick-eq');
    this._openInFdmsPicker();
  },

  _buildEqInPickerGroupHtml(eq, { hopPick = false } = {}) {
    const meta = EQ_META[eq.type] || EQ_META.sw;
    const slots = getAllCenterEquipmentPortSlots(eq);
    if (!slots.length) return '';

    let btns = '';
    const maxInFdms = hopPick ? null : maxInFdmsLinksPerEqInPort(eq);
    slots.forEach(({ slot, label, side, portRef, portId }) => {
      const linkN = hopPick ? 0 : countInFdmsLinksToEqPort(eq.id, side, slot);
      const atCapacity = !hopPick && maxInFdms != null && linkN >= maxInFdms;
      const displayLabel = label;
      const code = escapeHtml(displayLabel);
      const full = `${escapeHtml(eq.name)} — ${code}`;
      const badge = linkN > 0
        ? ` <span class="eq-pick-count">${linkN}${maxInFdms != null ? `/${maxInFdms}` : ''} linked</span>`
        : '';
      const pickAttr = hopPick ? 'data-eq-hop-in-pick' : 'data-eq-in-pick';
      const btnCls = hopPick ? 'in-free' : (atCapacity ? 'used' : 'in-free');
      const searchKey = [eq.name, label, portRef, side, portId].join(' ').toLowerCase();
      btns += `<button type="button" class="out-grid-btn ${btnCls}" data-eq-in-pick-row
        data-search="${attrEsc(searchKey)}" ${pickAttr}="${attrEsc(eq.id)}"
        data-eq-in-slot="${slot}" data-eq-in-code="${attrEsc(label)}"
        data-eq-port-side="${side}" data-eq-port-id="${attrEsc(portId || '')}"
        ${atCapacity ? 'disabled' : ''}
        title="${full}${!hopPick && linkN ? ` (${linkN}/${maxInFdms} IN-FDMS)` : ''}">${code}${badge}</button>`;
    });

    const showSearch = slots.length > 4;
    const searchHtml = showSearch ? `<div class="eq-pick-search-wrap eq-pick-search-wrap--group">
      <input type="search" class="fi eq-pick-search" data-action="eq-in-pick-search"
        data-eq-id="${attrEsc(eq.id)}" placeholder="Search ${escapeHtml(eq.name)} ports…"
        autocomplete="off" enterkeyhint="search"
        aria-label="Search ${escapeHtml(eq.name)} ports">
      <p class="eq-pick-search-meta" data-eq-in-pick-meta hidden></p>
    </div>` : '';
    const emptyHtml = showSearch
      ? '<p class="eq-pick-empty eq-pick-empty--group" data-eq-in-pick-empty hidden>No ports match your search</p>'
      : '';

    return `
      <div class="eq-pick-group" id="eq-pick__${attrEsc(eq.id)}" data-eq-id="${attrEsc(eq.id)}">
        <div class="eq-pick-hdr">
          <span class="eq-pick-icon">${meta.icon}</span>
          <strong class="eq-pick-name">${escapeHtml(eq.name)}</strong>
          <span class="eq-pick-type">${meta.label}</span>
        </div>
        ${searchHtml}
        <div class="out-grid">${btns}</div>
        ${emptyHtml}
      </div>`;
  },

  _filterEqInPickerPorts(eqId, query) {
    const group = document.querySelector(
      `.eq-pick-group[data-eq-id="${CSS.escape(String(eqId))}"]`,
    );
    if (!group) return;

    const q = _trimStr(query).toLowerCase();
    const rows = group.querySelectorAll('[data-eq-in-pick-row]');
    const emptyEl = group.querySelector('[data-eq-in-pick-empty]');
    const metaEl = group.querySelector('[data-eq-in-pick-meta]');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
  },

  _buildOutFdmsInHopPickerGroupHtml() {
    const outFdms = findOutFdmsEquipment();
    if (!outFdms) return '';

    const slots = getFdmsOutColumnSlotsUnique();
    if (!slots.length) return '';

    let btns = '';
    slots.forEach(({ portKey, label }) => {
      const taken = isOutFdmsPortTaken(portKey);
      const searchKey = [outFdms.name, label, portKey, 'out-fdms'].join(' ').toLowerCase();
      btns += `<button type="button" class="out-grid-btn ${taken ? 'used' : 'out-free'}" data-out-fdms-in-hop-pick-row
        data-search="${attrEsc(searchKey)}" data-out-fdms-in-hop-pick="${attrEsc(portKey)}"
        data-out-fdms-label="${attrEsc(label)}" ${taken ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
    });

    const eqName = outFdms.name || 'OUT-FDMS';
    const showSearch = slots.length > 4;
    const searchHtml = showSearch ? `<div class="eq-pick-search-wrap eq-pick-search-wrap--group">
      <input type="search" class="fi eq-pick-search" data-action="out-fdms-in-hop-pick-search"
        placeholder="Search ${escapeHtml(eqName)} ports…"
        autocomplete="off" enterkeyhint="search"
        aria-label="Search ${escapeHtml(eqName)} ports">
      <p class="eq-pick-search-meta" data-out-fdms-in-hop-pick-meta hidden></p>
    </div>` : '';
    const emptyHtml = showSearch
      ? '<p class="eq-pick-empty eq-pick-empty--group" data-out-fdms-in-hop-pick-empty hidden>No ports match your search</p>'
      : '';

    return `
      <div class="eq-pick-group eq-pick-group--out-fdms" data-out-fdms-group>
        <div class="eq-pick-hdr">
          <span class="eq-pick-icon">📤</span>
          <strong class="eq-pick-name">${escapeHtml(eqName)}</strong>
          <span class="eq-pick-type">OUT-FDMS</span>
        </div>
        ${searchHtml}
        <div class="out-grid">${btns}</div>
        ${emptyHtml}
      </div>`;
  },

  _filterOutFdmsInHopPickerPorts(query) {
    const group = document.querySelector('[data-out-fdms-group]');
    if (!group) return;

    const q = _trimStr(query).toLowerCase();
    const rows = group.querySelectorAll('[data-out-fdms-in-hop-pick-row]');
    const emptyEl = group.querySelector('[data-out-fdms-in-hop-pick-empty]');
    const metaEl = group.querySelector('[data-out-fdms-in-hop-pick-meta]');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
  },

  /* ── IN-HOP: equipment IN picker (many IN-FDMS → one EQ IN allowed) ── */
  _openEqInPicker() {
    const centerEq = State.equipment.filter(isDiagramCenterEquipment);
    const outFdmsHtml = this._buildOutFdmsInHopPickerGroupHtml();
    if (!centerEq.length && !outFdmsHtml.trim()) {
      showToast('⚠️ No equipment or OUT-FDMS ports at this site');
      return;
    }

    let html = '';
    centerEq.forEach((eq) => {
      html += this._buildEqInPickerGroupHtml(eq);
    });
    html += outFdmsHtml;

    const picker = document.getElementById('eq-port-picker');
    picker.innerHTML = html;
    picker.dataset.picker = 'in-hop-dest';
    this._setEqPickerChrome({
      title: 'Select Equipment Port',
      sub: 'Pick equipment port or OUT-FDMS for direct pass-through',
      showSkip: false,
    });
    Sheets.open('sh-pick-eq');
  },

  _selectDirectOutFdms(dstPortKey, dstLabel) {
    if (!this.state.srcPort) {
      showToast('⚠️ IN-FDMS port missing — pick again');
      return;
    }
    if (isOutFdmsPortTaken(dstPortKey)) {
      showToast('⚠️ OUT-FDMS port already in use');
      return;
    }
    this._clearHopCtx();
    this.state.mode = 'direct-fdms';
    this.state.dstPort = dstPortKey;
    this.state.dstLabel = dstLabel || fdmsOutLabelFromPortKey(dstPortKey);
    this.state.eqId = null;
    this.state.eqInPort = null;
    this.state.eqInCode = null;
    this.state.eqOutPort = null;
    this.state.eqOutCode = null;
    this.state.dstEqId = null;
    this.state.dstEqName = null;
    this.state.pendingStrand = nextFreeStrand();
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._freezeConnectDraft();
    Sheets.close('sh-pick-eq');
    this._openConfirm();
  },

  _buildEqOutFdmsHopPickerGroupHtml(eq) {
    const meta = EQ_META[eq.type] || EQ_META.sw;
    const slots = getAllCenterEquipmentPortSlots(eq);
    if (!slots.length) return '';

    const maxOutFdms = maxOutFdmsLinksPerEqOutPort(eq);
    let btns = '';
    slots.forEach(({ slot, label, side, portRef, portId }) => {
      const linkN = countLinksFromEqPortToOutFdms(eq.id, side, slot);
      const atCapacity = linkN >= maxOutFdms;
      const code = escapeHtml(label);
      const full = `${escapeHtml(eq.name)} — ${code}`;
      const badge = linkN > 0
        ? ` <span class="eq-pick-count">${linkN}/${maxOutFdms} linked</span>`
        : '';
      const btnCls = atCapacity ? 'used' : 'out-free';
      const searchKey = [eq.name, label, portRef, side, portId].join(' ').toLowerCase();
      btns += `<button type="button" class="out-grid-btn ${btnCls}" data-eq-out-fdms-hop-pick-row
        data-search="${attrEsc(searchKey)}" data-eq-out-fdms-hop-pick="${attrEsc(eq.id)}"
        data-eq-out-fdms-slot="${slot}" data-eq-out-fdms-code="${attrEsc(label)}"
        data-eq-port-side="${side}" data-eq-port-id="${attrEsc(portId || '')}"
        ${atCapacity ? 'disabled' : ''}
        title="${full}${linkN ? ` (${linkN}/${maxOutFdms} OUT-FDMS)` : ''}">${code}${badge}</button>`;
    });

    const showSearch = slots.length > 4;
    const searchHtml = showSearch ? `<div class="eq-pick-search-wrap eq-pick-search-wrap--group">
      <input type="search" class="fi eq-pick-search" data-action="out-fdms-hop-eq-search"
        data-eq-id="${attrEsc(eq.id)}" placeholder="Search ${escapeHtml(eq.name)} ports…"
        autocomplete="off" enterkeyhint="search"
        aria-label="Search ${escapeHtml(eq.name)} ports">
      <p class="eq-pick-search-meta" data-out-fdms-hop-eq-meta hidden></p>
    </div>` : '';
    const emptyHtml = showSearch
      ? '<p class="eq-pick-empty eq-pick-empty--group" data-out-fdms-hop-eq-empty hidden>No ports match your search</p>'
      : '';

    return `
      <div class="eq-pick-group" id="eq-pick-outfdms__${attrEsc(eq.id)}" data-eq-id="${attrEsc(eq.id)}">
        <div class="eq-pick-hdr">
          <span class="eq-pick-icon">${meta.icon}</span>
          <strong class="eq-pick-name">${escapeHtml(eq.name)}</strong>
          <span class="eq-pick-type">${meta.label}</span>
        </div>
        ${searchHtml}
        <div class="out-grid">${btns}</div>
        ${emptyHtml}
      </div>`;
  },

  _buildInFdmsOutHopPickerGroupHtml() {
    const inFdms = findInFdmsEquipment();
    if (!inFdms) return '';

    const slots = getFdmsInColumnSlotsUnique();
    if (!slots.length) return '';

    let btns = '';
    slots.forEach(({ portKey, label }) => {
      const taken = !!getInFdmsPortConnection(portKey);
      const searchKey = [inFdms.name, label, portKey, 'in-fdms'].join(' ').toLowerCase();
      btns += `<button type="button" class="out-grid-btn ${taken ? 'used' : 'in-free'}" data-in-fdms-out-hop-pick-row
        data-search="${attrEsc(searchKey)}" data-in-fdms-out-hop-pick="${attrEsc(portKey)}"
        data-in-fdms-label="${attrEsc(label)}" ${taken ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
    });

    const eqName = inFdms.name || 'IN-FDMS';
    const showSearch = slots.length > 4;
    const searchHtml = showSearch ? `<div class="eq-pick-search-wrap eq-pick-search-wrap--group">
      <input type="search" class="fi eq-pick-search" data-action="in-fdms-out-hop-pick-search"
        placeholder="Search ${escapeHtml(eqName)} ports…"
        autocomplete="off" enterkeyhint="search"
        aria-label="Search ${escapeHtml(eqName)} ports">
      <p class="eq-pick-search-meta" data-in-fdms-out-hop-pick-meta hidden></p>
    </div>` : '';
    const emptyHtml = showSearch
      ? '<p class="eq-pick-empty eq-pick-empty--group" data-in-fdms-out-hop-pick-empty hidden>No ports match your search</p>'
      : '';

    return `
      <div class="eq-pick-group eq-pick-group--in-fdms" data-in-fdms-group>
        <div class="eq-pick-hdr">
          <span class="eq-pick-icon">📥</span>
          <strong class="eq-pick-name">${escapeHtml(eqName)}</strong>
          <span class="eq-pick-type">IN-FDMS</span>
        </div>
        ${searchHtml}
        <div class="out-grid">${btns}</div>
        ${emptyHtml}
      </div>`;
  },

  _filterOutFdmsHopEqPickerPorts(eqId, query) {
    const group = document.querySelector(
      `.eq-pick-group[data-eq-id="${CSS.escape(String(eqId))}"]`,
    );
    if (!group) return;

    const q = _trimStr(query).toLowerCase();
    const rows = group.querySelectorAll('[data-eq-out-fdms-hop-pick-row]');
    const emptyEl = group.querySelector('[data-out-fdms-hop-eq-empty]');
    const metaEl = group.querySelector('[data-out-fdms-hop-eq-meta]');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
  },

  _filterInFdmsOutHopPickerPorts(query) {
    const group = document.querySelector('[data-in-fdms-group]');
    if (!group) return;

    const q = _trimStr(query).toLowerCase();
    const rows = group.querySelectorAll('[data-in-fdms-out-hop-pick-row]');
    const emptyEl = group.querySelector('[data-in-fdms-out-hop-pick-empty]');
    const metaEl = group.querySelector('[data-in-fdms-out-hop-pick-meta]');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
  },

  _openOutFdmsDestPicker() {
    const centerEq = State.equipment.filter(isDiagramCenterEquipment);
    const inFdmsHtml = this._buildInFdmsOutHopPickerGroupHtml();
    if (!centerEq.length && !inFdmsHtml.trim()) {
      showToast('⚠️ No equipment or IN-FDMS ports at this site');
      return;
    }

    let html = '';
    centerEq.forEach((eq) => {
      html += this._buildEqOutFdmsHopPickerGroupHtml(eq);
    });
    html += inFdmsHtml;

    const picker = document.getElementById('eq-port-picker');
    picker.innerHTML = html;
    picker.dataset.picker = 'out-fdms-hop-dest';
    const outLbl = fdmsOutLabelFromPortKey(this.state.dstPort) || this.state.dstLabel || 'OUT-FDMS';
    this._setEqPickerChrome({
      title: 'Select Equipment Port',
      sub: `${outLbl} · Pick equipment port or IN-FDMS`,
      showSkip: false,
    });
    Sheets.open('sh-pick-eq');
  },

  _selectOutFdmsHopEq(eqId, portRef, code, portSide = 'out', portApiId = null) {
    const dstPort = this.state.dstPort;
    if (!dstPort) {
      showToast('⚠️ OUT-FDMS port missing — pick again');
      return;
    }
    const side = portSide || 'out';
    const slot = eqSlotFromPortRef(eqId, side, portRef, code);
    if (slot != null) {
      const cap = eqPortOutFdmsLinkCapacity(eqId, side, slot);
      if (!cap.allowed) {
        showToast(eqOutFdmsCapacityToast(cap));
        return;
      }
    }
    if (!this._setOutHopCtx(eqId, portRef, code, null, side, 'out-hop', portApiId)) {
      showToast('⚠️ Equipment not found — pick the port again');
      return;
    }
    const dstLabel = this.state.dstLabel || fdmsOutLabelFromPortKey(dstPort);
    this._setOutHopDst(dstPort, dstLabel);
    this._applyHopCtxToState();
    this.state.mode = 'out-hop';
    this.state.dstPort = dstPort;
    this.state.dstLabel = dstLabel;
    this.state.srcPort = null;
    this.state.pendingStrand = nextFreeStrand();
    this._freezeConnectDraft();
    Sheets.close('sh-pick-eq');
    this._openConfirm();
  },

  _selectOutFdmsHopInFdms(inPortKey, label) {
    const dstPort = this.state.dstPort;
    if (!dstPort) {
      showToast('⚠️ OUT-FDMS port missing — pick again');
      return;
    }
    if (getInFdmsPortConnection(inPortKey)) {
      showToast('⚠️ IN-FDMS port already in use');
      return;
    }
    this._clearHopCtx();
    this.state.mode = 'fdms-out-to-in';
    this.state.srcPort = inPortKey;
    this.state.dstPort = dstPort;
    this.state.dstLabel = this.state.dstLabel || fdmsOutLabelFromPortKey(dstPort);
    this.state.eqId = null;
    this.state.eqInPort = null;
    this.state.eqInCode = null;
    this.state.eqOutPort = null;
    this.state.eqOutCode = null;
    this.state.dstEqId = null;
    this.state.dstEqName = null;
    this.state.pendingStrand = nextFreeStrand();
    this._connectDraft = null;
    this._clearConfirmPayload();
    this._freezeConnectDraft();
    Sheets.close('sh-pick-eq');
    this._openConfirm();
  },

  _selectEqIn(eqId, inPort, inCode, portSide = 'in', portApiId = null) {
    const side = portSide || 'in';
    const slot = eqSlotFromPortRef(eqId, side, inPort, inCode);
    if (slot != null) {
      const cap = eqPortInFdmsLinkCapacity(eqId, side, slot);
      if (!cap.allowed) {
        showToast(inFdmsEqInCapacityToast(cap));
        return;
      }
    }
    if (!this._setInHopCtx(eqId, inPort, inCode, null, side, portApiId)) {
      showToast('⚠️ Equipment not found — pick the port again');
      return;
    }
    this._applyHopCtxToState();
    this.state.pendingStrand = nextFreeStrand();
    this._freezeConnectDraft();
    Sheets.close('sh-pick-eq');
    this._openConfirm();
  },

  /* ── OUT-HOP: equipment OUT picker (one EQ OUT → many OUT-FDMS allowed) ── */
  _openEqOutPicker() {
    const centerEq = State.equipment.filter(isDiagramCenterEquipment);
    if (!centerEq.length) {
      showToast('⚠️ No equipment installed at this site');
      return;
    }

    const picker = document.getElementById('eq-port-picker');
    picker.innerHTML = this._buildEqOutPickerHtml();
    delete picker.dataset.picker;
    this._unifiedEqOutPickerOpen = false;
    this._setEqPickerChrome({
      title: 'Select Equipment Port',
      sub: 'DWDM: up to 2 OUT-FDMS per port · Router, Switch, Railway Eq.: 1 per port',
      showSkip: false,
    });
    Sheets.open('sh-pick-eq');
  },

  _selectEqOut(eqId, outPort, outCode, portEl, portSide = 'out', portApiId = null) {
    if (this.state.mode === 'unified' && this._pendingEqOutCtx) {
      return;
    }
    const side = portSide || portEl?.getAttribute?.('data-eq-port-side') || 'out';
    const apiId = portApiId
      || portEl?.getAttribute?.('data-eq-port-id')
      || null;
    if (this.state.mode === 'eq-hop') {
      this._selectEqHopSource(eqId, outPort, outCode, portEl, side);
      return;
    }
    const outSlot = eqSlotFromPortRef(eqId, side, outPort, outCode);
    if (outSlot != null) {
      const cap = eqPortOutFdmsLinkCapacity(eqId, side, outSlot);
      if (!cap.allowed) {
        showToast(eqOutFdmsCapacityToast(cap));
        return;
      }
    }
    if (!this._setOutHopCtx(eqId, outPort, outCode, portEl, side, 'out-hop', apiId)) {
      showToast('⚠️ Equipment not found — pick the port again');
      return;
    }
    const snap = this._outHopSnapshot;
    const eq = findEquipmentById(snap.eqId);
    this.state.mode = 'out-hop';
    this.state.active = true;
    this.state.eqId = snap.eqId;
    this.state.eqOutPort = snap.eqOutPort;
    this.state.eqOutCode = snap.eqOutCode;
    this.state.eqOutPortSide = side;
    this.state.eqPortApiId = snap.eqPortApiId || apiId || null;
    this.state.srcPort = null;
    this.state.dstPort = null;
    this.state.dstEqId = null;
    this.state.dstEqName = null;
    this._syncOutHopSource();
    this._freezeConnectDraft();
    Sheets.close('sh-pick-eq');
    this.state.step = 2;
    const outLbl = snap.eqOutCode || outPort.toUpperCase();
    if (!this.directConnect) {
      this._setStep(2, `${escapeHtml(eq?.name || 'Equipment')} · ${escapeHtml(outLbl)} ✓ · Pick <strong>OUT-FDMS</strong> port`);
    }
    this._syncDiagramConnectMode();
    this._openOutPicker();
  },

  _selectEqHopSource(eqId, outPort, outCode, portEl, portSide = 'out', portApiId = null) {
    const side = portSide || portEl?.getAttribute?.('data-eq-port-side') || 'out';
    if (!this._setEqHopSourceCtx(eqId, outPort, outCode, portEl, side, portApiId)) {
      showToast('⚠️ Equipment not found — pick the port again');
      return;
    }
    const snap = this._eqHopSnapshot;
    const eq = findEquipmentById(snap.eqId);
    const outLbl = snap.eqOutCode || outPort.toUpperCase();
    this.state.mode = 'eq-hop';
    this.state.eqId = snap.eqId;
    this.state.eqOutPort = snap.eqOutPort;
    this.state.eqOutCode = snap.eqOutCode;
    this.state.eqPortApiId = snap.eqPortApiId || null;
    this.state.dstEqId = null;
    this.state.dstEqName = null;
    this.state.eqInPort = null;
    this.state.eqInCode = null;
    this.state.srcPort = null;
    this.state.dstPort = null;
    this._syncEqHopSource();
    this.state.step = 2;
    this._setStep(2, `${escapeHtml(eq?.name || 'Equipment')} · ${escapeHtml(outLbl)} ✓ · Pick <strong>equipment IN</strong> on another device`);
    this._syncDiagramConnectMode();
    this._openEqHopInPicker();
  },

  /** EQ-hop step 2: target equipment IN ports (all center devices except source) */
  _openEqHopInPicker() {
    const src = this._syncEqHopSource();
    if (!this._eqHopSourceReady(src)) {
      showToast('⚠️ Pick source equipment OUT port first');
      this.state.step = 1;
      this._setStep(1, 'Pick a highlighted <strong>equipment OUT</strong> port (source)');
      this._syncDiagramConnectMode();
      return;
    }

    const srcId = src.eqId;
    const srcEq = findEquipmentById(srcId);
    const srcName = srcEq?.name || src.eqName || 'Equipment';
    const outLbl = src.eqOutCode || src.eqOutPort?.toUpperCase() || 'OUT';

    const targets = State.equipment.filter(isDiagramCenterEquipment)
      .filter((eq) => String(eq.id) !== String(srcId));

    if (!targets.length) {
      showToast('⚠️ No other equipment — add another device to link equipment-to-equipment');
      return;
    }

    let html = '';
    targets.forEach((eq) => {
      html += this._buildEqInPickerGroupHtml(eq, { hopPick: true });
    });

    if (!html) {
      showToast('⚠️ No ports found on other equipment');
      return;
    }

    document.getElementById('eq-port-picker').innerHTML = html;
    this._setEqPickerChrome({
      title: 'Select Equipment Port',
      sub: `From ${srcName} · ${outLbl} → pick target port (IN or OUT)`,
      showSkip: false,
    });
    Sheets.open('sh-pick-eq');
  },

  _selectEqHopTarget(dstEqId, inPort, inCode, portEl, portSide = 'in', portApiId = null) {
    const side = portSide || portEl?.getAttribute?.('data-eq-port-side') || 'in';
    if (!this._eqHopSourceReady()) {
      showToast('⚠️ Source equipment port missing — pick port again');
      return;
    }
    if (!this._setEqHopTarget(dstEqId, inPort, inCode, portEl, side, portApiId)) {
      showToast('⚠️ Pick a port on a different equipment');
      return;
    }
    this._syncEqHopSource();
    this.state.mode = 'eq-hop';
    this.state.step = 2;
    this.state.pendingStrand = nextFreeStrand();
    this._freezeConnectDraft();
    Sheets.close('sh-pick-eq');
    this._openConfirm();
  },

  _filterInFdmsPickerPorts(query) {
    const wrap = document.getElementById('in-picker');
    if (!wrap) return;

    const q = _trimStr(query).toLowerCase();
    const rows = wrap.querySelectorAll('[data-in-fdms-pick-row]');
    if (!rows.length) return;

    const emptyEl = wrap.querySelector('[data-in-fdms-pick-empty]');
    const metaEl = wrap.querySelector('[data-in-fdms-pick-meta]');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
  },

  /* ── IN-HOP step 1 (reverse): IN-FDMS picker when equipment IN is pre-selected ── */
  _openInFdmsPicker() {
    refreshFdmsColumnPortsOnEquipment();

    const eq = findEquipmentById(this.state.eqId);
    const isEqToInFdms = this.state.mode === 'eq-to-in-fdms' || this._hopCtx?.mode === 'eq-to-in-fdms';
    const portLbl = isEqToInFdms
      ? (this.state.eqOutCode || this.state.eqOutPort?.toUpperCase() || 'Port')
      : (this.state.eqInCode || this.state.eqInPort?.toUpperCase() || 'IN');
    const spiSub = document.getElementById('spi-sub');
    if (spiSub) {
      spiSub.textContent = eq
        ? (isEqToInFdms ? `From ${eq.name} · ${portLbl}` : `To ${eq.name} · ${portLbl}`)
        : 'Choose IN-FDMS port';
    }

    const slots = getFdmsInColumnSlotsUnique();
    let btns = '';
    slots.forEach(({ portKey, label }) => {
      const taken = !!getInFdmsPortConnection(portKey);
      const searchKey = [label, portKey, 'in-fdms'].join(' ').toLowerCase();
      btns += `<button type="button" class="out-grid-btn ${taken ? 'used' : 'free'}" data-in-fdms-pick-row
        data-search="${attrEsc(searchKey)}" data-in-fdms-pick="${attrEsc(portKey)}"
        data-in-fdms-label="${attrEsc(label)}" ${taken ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
    });

    const pickerEl = document.getElementById('in-picker');
    if (pickerEl) {
      if (!btns) {
        pickerEl.className = 'out-grid';
        pickerEl.innerHTML = `<p class="in-picker-empty" style="padding:12px 4px;font-size:13px;color:var(--text2);line-height:1.5">
          No IN-FDMS ports found for this site. Check that IN-FDMS equipment is installed and has ports.</p>`;
      } else if (slots.length > 4) {
        pickerEl.className = 'in-fdms-picker';
        pickerEl.innerHTML = `<div class="eq-pick-search-wrap">
          <input type="search" class="fi eq-pick-search" data-action="in-fdms-pick-search"
            placeholder="Search IN-FDMS ports (e.g. Port-10)…" autocomplete="off" enterkeyhint="search"
            aria-label="Search IN-FDMS ports">
          <p class="eq-pick-search-meta" data-in-fdms-pick-meta hidden></p>
        </div>
        <div class="out-grid in-fdms-pick-grid">${btns}</div>
        <p class="eq-pick-empty eq-pick-empty--group" data-in-fdms-pick-empty hidden>No ports match your search</p>`;
        this._filterInFdmsPickerPorts('');
      } else {
        pickerEl.className = 'out-grid';
        pickerEl.innerHTML = btns;
      }
    }

    Sheets.open('sh-pick-in');
  },

  _pickInFdmsPort(btn) {
    if (!btn || btn.disabled) return;
    const portKey = btn.getAttribute('data-in-fdms-pick')
      || (btn.getAttribute('data-in-fdms-label')
        ? `in-${btn.getAttribute('data-in-fdms-label')}`
        : null);
    if (!portKey) {
      showToast('⚠️ Could not read IN-FDMS port — try again');
      return;
    }
    if (this.state.mode === 'eq-to-in-fdms' || this._hopCtx?.mode === 'eq-to-in-fdms') {
      const existing = getInFdmsPortConnection(portKey);
      if (existing) {
        showToast('IN-FDMS port already connected');
        return;
      }
      this.state.mode = 'eq-to-in-fdms';
      this.state.srcPort = portKey;
      this.state.dstPort = null;
      if (this._hopCtx?.mode === 'eq-to-in-fdms') {
        this._hopCtx.srcPort = portKey;
        this._hopCtx.dstPort = null;
        this._hopCtx.dstLabel = null;
      }
      if (this._outHopSnapshot?.mode === 'eq-to-in-fdms') {
        this._outHopSnapshot.srcPort = portKey;
        this._outHopSnapshot.dstPort = null;
        this._outHopSnapshot.dstLabel = null;
      }
      this._persistOutHopCtx({
        mode: 'eq-to-in-fdms',
        srcPort: portKey,
        dstPort: null,
        dstLabel: null,
      });
      this._applyHopCtxToState();
      this.state.pendingStrand = nextFreeStrand();
      this._freezeConnectDraft();
      Sheets.close('sh-pick-in');
      this._openConfirm();
      return;
    }
    this.portTap(portKey);
  },

  _filterOutFdmsPickerPorts(query) {
    const wrap = document.getElementById('out-picker');
    if (!wrap) return;

    const q = _trimStr(query).toLowerCase();
    const rows = wrap.querySelectorAll('[data-out-fdms-pick-row]');
    if (!rows.length) return;

    const emptyEl = wrap.querySelector('[data-out-fdms-pick-empty]');
    const metaEl = wrap.querySelector('[data-out-fdms-pick-meta]');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
  },

  /* ── OUT-HOP step 2: OUT-FDMS picker ─────────────────── */
  _openOutPicker() {
    refreshFdmsColumnPortsOnEquipment();
    this._applyHopCtxToState();

    const snap = this._outHopSnapshot;
    const eqId = snap?.eqId || this._hopCtx?.eqId || this.state.eqId;
    const eq = findEquipmentById(eqId) || (snap?.eqName ? { name: snap.eqName } : null);
    const outLbl = snap?.eqOutCode
      || this._hopCtx?.eqOutCode
      || this.state.eqOutCode
      || this.state.eqOutPort?.toUpperCase()
      || 'OUT';
    const spoSub = document.getElementById('spo-sub');
    const pickerEl = document.getElementById('out-picker');

    if (this.state.mode === 'out-hop') {
      if (spoSub) {
        spoSub.textContent = eq
          ? `From ${eq.name} · ${outLbl}`
          : 'Choose destination port';
      }
    } else if (spoSub) {
      spoSub.textContent = `From ${fdmsInLabelFromPortKey(this.state.srcPort)} via ${eq ? eq.name : 'Direct'}`;
    }

    const slots = getFdmsOutColumnSlotsUnique();
    let btns = '';
    slots.forEach(({ portKey, label }) => {
      const taken = isOutFdmsPortTaken(portKey);
      const searchKey = [label, portKey, 'out-fdms'].join(' ').toLowerCase();
      btns += `<button type="button" class="out-grid-btn ${taken ? 'used' : 'free'}" data-out-fdms-pick-row
        data-search="${attrEsc(searchKey)}" data-out-fdms-pick="${attrEsc(portKey)}"
        data-out-fdms-label="${attrEsc(label)}" ${taken ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
    });

    if (pickerEl) {
      if (!btns) {
        pickerEl.className = 'out-grid';
        pickerEl.innerHTML = `<p class="out-picker-empty" style="padding:12px 4px;font-size:13px;color:var(--text2);line-height:1.5">
          No OUT-FDMS ports found for this site. Check that OUT-FDMS equipment is installed and has ports.</p>`;
      } else if (slots.length > 4) {
        pickerEl.className = 'out-fdms-picker';
        pickerEl.innerHTML = `<div class="eq-pick-search-wrap">
          <input type="search" class="fi eq-pick-search" data-action="out-fdms-pick-search"
            placeholder="Search OUT-FDMS ports (e.g. Port-10)…" autocomplete="off" enterkeyhint="search"
            aria-label="Search OUT-FDMS ports">
          <p class="eq-pick-search-meta" data-out-fdms-pick-meta hidden></p>
        </div>
        <div class="out-grid out-fdms-pick-grid">${btns}</div>
        <p class="eq-pick-empty eq-pick-empty--group" data-out-fdms-pick-empty hidden>No ports match your search</p>`;
        this._filterOutFdmsPickerPorts('');
      } else {
        pickerEl.className = 'out-grid';
        pickerEl.innerHTML = btns;
      }
    }
    this._persistOutHopCtx({
      eqId     : eqId || snap?.eqId || this.state.eqId,
      eqName   : eq?.name || snap?.eqName,
      eqOutPort: snap?.eqOutPort || this.state.eqOutPort,
      eqOutCode: outLbl !== 'OUT' ? outLbl : (snap?.eqOutCode || this.state.eqOutCode),
    });
    Sheets.open('sh-pick-out');
  },

  _pickOutFdmsPort(btn) {
    if (!btn || btn.disabled) return;
    let dstKey = btn.getAttribute('data-out-fdms-pick')
      || fdmsPortKeyForOutLabel(btn.getAttribute('data-out-fdms-label'))
      || fdmsPortKeyForOutLabel(btn.textContent?.trim());
    if (!dstKey) {
      showToast('⚠️ Could not read OUT-FDMS port — try again');
      return;
    }
    this._selectDst(dstKey);
  },

  _selectDst(dstId) {
    if (!dstId) {
      showToast('⚠️ OUT-FDMS port is required');
      return;
    }
    const src = this._syncOutHopSource();
    if (!this._outHopSourceReady(src)) {
      showToast('⚠️ Pick an equipment port first');
      this.state.step = 1;
      this.state.mode = 'out-hop';
      this._setStep(1, 'Pick an <strong>equipment</strong> port');
      this._syncDiagramConnectMode();
      return;
    }
    const outSlot = eqSlotFromPortRef(
      src.eqId, src.eqOutPortSide || 'out', src.eqOutPort, src.eqOutCode,
    );
    if (outSlot != null) {
      const cap = eqPortOutFdmsLinkCapacity(src.eqId, src.eqOutPortSide || 'out', outSlot);
      if (!cap.allowed) {
        showToast(eqOutFdmsCapacityToast(cap));
        return;
      }
    }
    const dstKey = String(dstId);
    const dstLabel = fdmsOutLabelFromPortKey(dstKey);
    this._applyHopCtxToState();
    this.state.dstPort = dstKey;
    this.state.mode = 'out-hop';
    this.state.step = 2;
    this.state.pendingStrand = nextFreeStrand();
    this._setOutHopDst(dstKey, dstLabel);
    this._syncOutHopSource();
    this._freezeConnectDraft();
    Sheets.close('sh-pick-out');
    this._openConfirm();
  },

  /* ── CONFIRM SHEET ───────────────────────────────────── */
  _paintConfirmSheet(draft) {
    const confirmSheet = document.getElementById('sh-confirm');
    if (!confirmSheet || !draft) return;
    const $ = (sel) => confirmSheet.querySelector(sel);
    const mode = draft.mode;
    const eq = findEquipmentById(draft.eqId)
      || (draft.eqName ? { name: draft.eqName } : null);
    const eqDisplayName = eq?.name || draft.eqName || '—';
    const titleEl = confirmSheet.querySelector('.sh-title');
    const subEl = confirmSheet.querySelector('.sh-sub');
    const rowSrc = $('#cf-src')?.closest('.ir');
    const rowDst = $('#cf-dst')?.closest('.ir');
    const rowVia = $('#cf-via')?.closest('.ir');
    const rowIn  = $('#cf-eq-row-in');
    const rowOut = $('#cf-eq-row-out');

    let chips = '';
    if (mode === 'eq-hop') {
      const srcEq = findEquipmentById(draft.eqId) || (draft.eqName ? { name: draft.eqName } : null);
      const dstEq = findEquipmentById(draft.dstEqId) || (draft.dstEqName ? { name: draft.dstEqName } : null);
      const srcName = srcEq?.name || draft.eqName || '—';
      const dstName = dstEq?.name || draft.dstEqName || '—';
      const outLbl = this._eqOutDisplayLabel(draft) || '—';
      const inLbl = this._eqInDisplayLabel(draft, draft.dstEqId) || '—';
      if (titleEl) titleEl.textContent = 'Confirm Equipment Link';
      if (subEl) subEl.textContent = 'Equipment → Equipment (one hop)';
      chips = `<div class="pchip via">${escapeHtml(srcName)} · ${escapeHtml(outLbl)}</div>`
        + `<span class="parr">→</span>`
        + `<div class="pchip via">${escapeHtml(dstName)} · ${escapeHtml(inLbl)}</div>`;
      if (rowSrc) rowSrc.style.display = 'none';
      if (rowDst) rowDst.style.display = 'none';
      if (rowVia) rowVia.style.display = '';
      if (rowIn) rowIn.style.display = '';
      if (rowOut) rowOut.style.display = '';
      const cfVia = $('#cf-via');
      const cfEqin = $('#cf-eqin');
      const cfEqout = $('#cf-eqout');
      if (cfVia) cfVia.textContent = `${srcName} → ${dstName}`;
      if (cfEqin) cfEqin.textContent = inLbl;
      if (cfEqout) cfEqout.textContent = outLbl;
      const rowOutLabel = rowOut?.querySelector('.il');
      if (rowOutLabel) rowOutLabel.textContent = 'EQ OUT Port';
    } else if (mode === 'eq-to-in-fdms') {
      if (titleEl) titleEl.textContent = 'Confirm IN-FDMS Connection';
      if (subEl) subEl.textContent = 'Equipment port → IN-FDMS (one hop)';
      const eqPortLbl = this._eqOutDisplayLabel(draft) || '—';
      const inFdmsLbl = fdmsInLabelFromPortKey(draft.srcPort) || '—';
      chips = `<div class="pchip via">${escapeHtml(eqDisplayName)} · ${escapeHtml(eqPortLbl)}</div>`
        + `<span class="parr">→</span>`
        + `<div class="pchip src">${escapeHtml(inFdmsLbl)}</div>`;
      if (rowSrc) rowSrc.style.display = '';
      if (rowDst) rowDst.style.display = 'none';
      if (rowVia) rowVia.style.display = '';
      if (rowIn) rowIn.style.display = 'none';
      if (rowOut) rowOut.style.display = '';
      const cfSrc = $('#cf-src');
      const cfDst = $('#cf-dst');
      const cfVia = $('#cf-via');
      const cfEqout = $('#cf-eqout');
      const rowOutLabel = rowOut?.querySelector('.il');
      if (rowOutLabel) rowOutLabel.textContent = 'Equipment Port';
      if (cfSrc) cfSrc.textContent = inFdmsLbl;
      if (cfDst) cfDst.textContent = '—';
      if (cfVia) cfVia.textContent = eqDisplayName;
      if (cfEqout) cfEqout.textContent = eqPortLbl;
    } else if (mode === 'out-hop') {
      if (titleEl) titleEl.textContent = 'Confirm OUT Connection';
      if (subEl) subEl.textContent = 'Equipment port → OUT-FDMS (one hop)';
      const outLbl = this._eqOutDisplayLabel(draft) || '—';
      const dstLbl = draft.dstLabel || fdmsOutLabelFromPortKey(draft.dstPort) || '—';
      chips = `<div class="pchip via">${escapeHtml(eqDisplayName)} · ${escapeHtml(outLbl)}</div>`
        + `<span class="parr">→</span>`
        + `<div class="pchip dst">${escapeHtml(dstLbl)}</div>`;
       if (rowDst) rowDst.style.display = '';
      if (rowVia) rowVia.style.display = '';
      if (rowIn) rowIn.style.display = 'none';
      if (rowOut) rowOut.style.display = '';
      const rowOutLabel = rowOut?.querySelector('.il');
      if (rowOutLabel) rowOutLabel.textContent = 'Equipment Port';
      const cfSrc = $('#cf-src');
      const cfDst = $('#cf-dst');
      const cfVia = $('#cf-via');
      const cfEqin = $('#cf-eqin');
      const cfEqout = $('#cf-eqout');
      if (cfSrc) cfSrc.textContent = '—';
      if (cfDst) cfDst.textContent = dstLbl;
      if (cfVia) cfVia.textContent = eqDisplayName;
      if (cfEqin) cfEqin.textContent = '—';
      if (cfEqout) cfEqout.textContent = outLbl;
    } else if (mode === 'direct-fdms') {
      if (titleEl) titleEl.textContent = 'Confirm Direct Connection';
      if (subEl) subEl.textContent = 'IN-FDMS → OUT-FDMS (direct pass-through)';
      const srcLbl = fdmsInLabelFromPortKey(draft.srcPort) || draft.srcPort?.replace(/^in-/i, '') || '—';
      const dstLbl = draft.dstLabel || fdmsOutLabelFromPortKey(draft.dstPort) || '—';
      chips = `<div class="pchip src">${escapeHtml(srcLbl)}</div>`
        + `<span class="parr">→</span>`
        + `<div class="pchip dst">${escapeHtml(dstLbl)}</div>`;
      if (rowSrc) rowSrc.style.display = '';
      if (rowDst) rowDst.style.display = '';
      if (rowVia) rowVia.style.display = 'none';
      if (rowIn) rowIn.style.display = 'none';
      if (rowOut) rowOut.style.display = 'none';
      const cfSrc = $('#cf-src');
      const cfDst = $('#cf-dst');
      if (cfSrc) cfSrc.textContent = srcLbl;
      if (cfDst) cfDst.textContent = dstLbl;
    } else if (mode === 'fdms-out-to-in') {
      if (titleEl) titleEl.textContent = 'Confirm Direct Connection';
      if (subEl) subEl.textContent = 'OUT-FDMS → IN-FDMS (direct pass-through)';
      const outLbl = draft.dstLabel || fdmsOutLabelFromPortKey(draft.dstPort) || '—';
      const inLbl = fdmsInLabelFromPortKey(draft.srcPort) || draft.srcPort?.replace(/^in-/i, '') || '—';
      chips = `<div class="pchip dst">${escapeHtml(outLbl)}</div>`
        + `<span class="parr">→</span>`
        + `<div class="pchip src">${escapeHtml(inLbl)}</div>`;
      if (rowSrc) rowSrc.style.display = '';
      if (rowDst) rowDst.style.display = '';
      if (rowVia) rowVia.style.display = 'none';
      if (rowIn) rowIn.style.display = 'none';
      if (rowOut) rowOut.style.display = 'none';
      const cfSrc = $('#cf-src');
      const cfDst = $('#cf-dst');
      if (cfSrc) cfSrc.textContent = inLbl;
      if (cfDst) cfDst.textContent = outLbl;
    } else {
      if (titleEl) titleEl.textContent = 'Confirm IN Connection';
      if (subEl) subEl.textContent = 'IN-FDMS → Equipment port (one hop)';
      const srcLbl = fdmsInLabelFromPortKey(draft.srcPort) || draft.srcPort?.replace(/^in-/i, '') || '—';
      const inLbl = this._eqInDisplayLabel(draft, draft.eqId) || '—';
      chips = `<div class="pchip src">${escapeHtml(srcLbl)}</div>`
        + `<span class="parr">→</span>`
        + `<div class="pchip via">${escapeHtml(eqDisplayName)} · ${escapeHtml(inLbl)}</div>`;
      if (rowSrc) rowSrc.style.display = '';
      if (rowDst) rowDst.style.display = 'none';
      if (rowVia) rowVia.style.display = '';
      if (rowIn) rowIn.style.display = '';
      if (rowOut) rowOut.style.display = 'none';
      const rowOutLabel = rowOut?.querySelector('.il');
      if (rowOutLabel) rowOutLabel.textContent = 'EQ OUT Port';
      const cfSrc = $('#cf-src');
      const cfDst = $('#cf-dst');
      const cfVia = $('#cf-via');
      const cfEqin = $('#cf-eqin');
      const cfEqout = $('#cf-eqout');
      if (cfSrc) cfSrc.textContent = srcLbl;
      if (cfDst) cfDst.textContent = '—';
      if (cfVia) cfVia.textContent = eqDisplayName;
      if (cfEqin) cfEqin.textContent = inLbl;
      if (cfEqout) cfEqout.textContent = '—';
    }

    const cfPath = $('#cf-path');
    const cfStrand = $('#cf-strand');
    if (cfPath) cfPath.innerHTML = chips;
    if (cfStrand) cfStrand.innerHTML = strandBadge(draft.pendingStrand);
  },

  _openConfirm() {
    const inHopActive = this.state.mode === 'in-hop' || this._hopCtx?.mode === 'in-hop';
    if (!inHopActive && (this.state.mode === 'out-hop' || this._outHopSnapshot?.mode === 'out-hop')) {
      this._syncOutHopSource();
      if (!this._outHopSourceReady()) {
        showToast('⚠️ Pick equipment OUT port first');
        return;
      }
    }
    if (this.state.mode === 'eq-hop' || this._eqHopSnapshot?.mode === 'eq-hop') {
      this._syncEqHopSource();
      if (!this._eqHopSourceReady()) {
        showToast('⚠️ Pick source equipment OUT port first');
        return;
      }
      if (!this._eqHopTargetReady()) {
        showToast('⚠️ Pick target equipment IN port');
        return;
      }
    }
    const draft = this._getConfirmMergedDraft(this._freezeConnectDraft());
    if (resolveConnectWizardMode(draft) === 'out-hop' && !this._outHopSourceReady(draft)) {
      showToast('⚠️ Equipment OUT port missing — pick the OUT port again');
      return;
    }
    if (resolveConnectWizardMode(draft) === 'eq-hop') {
      if (!this._eqHopSourceReady(draft)) {
        showToast('⚠️ Source equipment OUT port missing — pick the OUT port again');
        return;
      }
      if (!draft.dstEqId || !findEquipmentById(draft.dstEqId)) {
        showToast('⚠️ Target equipment missing — pick the IN port again');
        return;
      }
      if (!draft.eqInPort && !draft.eqInCode) {
        showToast('⚠️ Target equipment IN port is required');
        return;
      }
    }
    if (resolveConnectWizardMode(draft) === 'direct-fdms') {
      if (!draft.srcPort) {
        showToast('⚠️ IN-FDMS port is required');
        return;
      }
      if (!draft.dstPort) {
        showToast('⚠️ OUT-FDMS port is required');
        return;
      }
      if (isOutFdmsPortTaken(draft.dstPort)) {
        showToast('⚠️ OUT-FDMS port already in use');
        return;
      }
    }
    if (resolveConnectWizardMode(draft) === 'fdms-out-to-in') {
      if (!draft.srcPort) {
        showToast('⚠️ IN-FDMS port is required');
        return;
      }
      if (!draft.dstPort) {
        showToast('⚠️ OUT-FDMS port is required');
        return;
      }
      if (getInFdmsPortConnection(draft.srcPort)) {
        showToast('⚠️ IN-FDMS port already in use');
        return;
      }
      if (isOutFdmsPortTaken(draft.dstPort)) {
        showToast('⚠️ OUT-FDMS port already in use');
        return;
      }
    }
    if (resolveConnectWizardMode(draft) === 'in-hop' && draft.eqId) {
      const side = draft.eqPortSide || 'in';
      const slot = eqSlotFromPortRef(draft.eqId, side, draft.eqInPort, draft.eqInCode);
      if (slot != null) {
        const cap = eqPortInFdmsLinkCapacity(draft.eqId, side, slot);
        if (!cap.allowed) {
          showToast(inFdmsEqInCapacityToast(cap));
          return;
        }
      }
    }
    this._lockConfirmPayload(draft);
    this._paintConfirmSheet(draft);
    Sheets.open('sh-confirm');
    requestAnimationFrame(() => {
      const fresh = this._getConfirmMergedDraft(
        this._readConfirmPayload() || this._connectDraft || draft,
      );
      this._paintConfirmSheet(fresh);
    });
  },

  _setConfirmSaveBusy(loading) {
    const saveBtn = document.querySelector('[data-action="confirm-save"]');
    const cancelBtn = document.querySelector('#sh-confirm [data-action="connect-cancel"]');
    if (loading) {
      Sheets._setSheetBusy('sh-confirm', true, 'Saving connection…');
      Sheets._setActBtnLoading(saveBtn, true, 'Saving…');
      if (cancelBtn) cancelBtn.disabled = true;
    } else {
      Sheets._setSheetBusy('sh-confirm', false);
      Sheets._setActBtnLoading(saveBtn, false);
      if (cancelBtn) cancelBtn.disabled = false;
    }
  },

  /* ── CONFIRM SAVE ────────────────────────────────────── */
  async confirm() {
    const saveBtn = document.querySelector('[data-action="confirm-save"]');
    const confirmBusy = document.getElementById('sh-confirm')?.querySelector('.sheet.is-sheet-busy');
    if (saveBtn?.classList.contains('is-loading') && confirmBusy) return;
    if (saveBtn?.classList.contains('is-loading')) this._setConfirmSaveBusy(false);

    const inHopActive = this.state.mode === 'in-hop' || this._hopCtx?.mode === 'in-hop';
    if (!inHopActive && (this.state.mode === 'out-hop' || this._outHopSnapshot?.mode === 'out-hop')) {
      this._syncOutHopSource();
    }
    if (this.state.mode === 'eq-hop' || this._eqHopSnapshot?.mode === 'eq-hop') {
      this._syncEqHopSource();
    }
    const draft = this._lockConfirmPayload(
      this._getConfirmMergedDraft(
        this._readConfirmPayload() || this._connectDraft || this._resolveConnectDraft(),
      ),
    );
    const mode = resolveConnectWizardMode(draft);
    draft.mode = mode;
    const srcPort = draft.srcPort;
    const dstPort = draft.dstPort;
    const eqInPort = draft.eqInPort;
    const eqOutPort = draft.eqOutPort;
    const pendingStrand = draft.pendingStrand;
    const eqId = draft.eqId;
    const payload = {
      mode,
      src                : srcPort,
      dst                : dstPort,
      equipment_id       : eqId      || null,
      dst_equipment_id   : draft.dstEqId || null,
      eq_in_port         : eqInPort  || null,
      eq_in_code         : draft.eqInCode || null,
      eq_out_port        : eqOutPort || null,
      eq_out_code        : draft.eqOutCode || null,
      strand_index       : pendingStrand,
    };

    if (mode === 'eq-hop') {
      if (!draft.eqId && draft.eqName) {
        draft.eqId = resolveCenterEquipmentIdByName(draft.eqName);
      }
      const resolvedSrcId = draft.eqId || eqId;
      if (!resolvedSrcId || !findEquipmentById(resolvedSrcId)) {
        showToast('⚠️ Source equipment missing — pick the OUT port again');
        return;
      }
      draft.eqId = String(resolvedSrcId);
      if (!draft.dstEqId || !findEquipmentById(draft.dstEqId)) {
        showToast('⚠️ Target equipment missing — pick the IN port again');
        return;
      }
      if (String(draft.eqId) === String(draft.dstEqId)) {
        showToast('⚠️ Source and target equipment must be different');
        return;
      }
      if (!eqOutPort && !draft.eqOutCode) {
        showToast('⚠️ Source equipment OUT port is required');
        return;
      }
      if (!eqInPort && !draft.eqInCode) {
        showToast('⚠️ Target equipment IN port is required');
        return;
      }
    } else if (mode === 'eq-to-in-fdms') {
      if (!draft.eqId && draft.eqName) {
        draft.eqId = resolveCenterEquipmentIdByName(draft.eqName);
      }
      const resolvedEqId = draft.eqId || eqId;
      if (!resolvedEqId || !findEquipmentById(resolvedEqId)) {
        showToast('⚠️ Equipment missing — pick the port again');
        return;
      }
      draft.eqId = String(resolvedEqId);
      if (!eqOutPort && !draft.eqOutCode && !eqInPort && !draft.eqInCode) {
        showToast('⚠️ Equipment port is required');
        return;
      }
      if (!srcPort) {
        showToast('⚠️ IN-FDMS port is required');
        return;
      }
    } else if (mode === 'out-hop') {
      if (!draft.eqId && draft.eqName) {
        draft.eqId = resolveCenterEquipmentIdByName(draft.eqName);
      }
      const resolvedEqId = draft.eqId || eqId;
      if (!resolvedEqId || !findEquipmentById(resolvedEqId)) {
        showToast('⚠️ Equipment missing — pick the port again');
        return;
      }
      draft.eqId = String(resolvedEqId);
      if (!eqOutPort && !draft.eqOutCode && !eqInPort && !draft.eqInCode) {
        showToast('⚠️ Equipment port is required');
        return;
      }
      if (!dstPort) {
        showToast('⚠️ OUT-FDMS port is required');
        return;
      }
      const side = draft.eqOutPortSide || draft.eqPortSide || 'out';
      const outSlot = eqSlotFromPortRef(resolvedEqId, side, eqOutPort || eqInPort, draft.eqOutCode || draft.eqInCode);
      if (outSlot != null) {
        const cap = eqPortOutFdmsLinkCapacity(resolvedEqId, side, outSlot);
        if (!cap.allowed) {
          showToast(eqOutFdmsCapacityToast(cap));
          return;
        }
      }
    } else if (mode === 'direct-fdms') {
      if (!srcPort) {
        showToast('⚠️ IN-FDMS port is required');
        return;
      }
      if (!dstPort) {
        showToast('⚠️ OUT-FDMS port is required');
        return;
      }
      if (isOutFdmsPortTaken(dstPort)) {
        showToast('⚠️ OUT-FDMS port already in use');
        return;
      }
    } else if (mode === 'fdms-out-to-in') {
      if (!srcPort) {
        showToast('⚠️ IN-FDMS port is required');
        return;
      }
      if (!dstPort) {
        showToast('⚠️ OUT-FDMS port is required');
        return;
      }
      if (getInFdmsPortConnection(srcPort)) {
        showToast('⚠️ IN-FDMS port already in use');
        return;
      }
      if (isOutFdmsPortTaken(dstPort)) {
        showToast('⚠️ OUT-FDMS port already in use');
        return;
      }
    } else {
      if (!eqId || !findEquipmentById(eqId)) {
        showToast('⚠️ Equipment missing — pick the port again');
        return;
      }
      if (!eqInPort && !draft.eqInCode) {
        showToast('⚠️ Equipment port is required');
        return;
      }
      const side = draft.eqPortSide || 'in';
      const inSlot = eqSlotFromPortRef(eqId, side, eqInPort, draft.eqInCode);
      if (inSlot != null) {
        const cap = eqPortInFdmsLinkCapacity(eqId, side, inSlot);
        if (!cap.allowed) {
          showToast(inFdmsEqInCapacityToast(cap));
          return;
        }
      }
    }

    this._setConfirmSaveBusy(true);

    try {
      if (useFiberneoLive()) {
        const result = await API.saveConnectWizard(draft);
        await finalizeConnectivityAfterSave(result.bodies, draft, result.hops, {
          onBeforeReload: () => {
            if (eqId) {
              if (mode === 'out-hop') {
                const srcSide = draft.eqOutPortSide || eqPortSideFromRef(eqOutPort, 'out');
                if (srcSide === 'in') {
                  noteDiagramLatestEquipmentPorts(eqId, eqOutPort, null);
                } else {
                  noteDiagramLatestEquipmentPorts(eqId, null, eqOutPort);
                }
              } else {
                noteDiagramLatestEquipmentPorts(
                  eqId,
                  mode === 'in-hop' ? eqInPort : null,
                  mode !== 'in-hop' ? eqOutPort : null,
                );
              }
              applyDiagramPortHintsAfterSave({ ...draft, mode });
            }
            if (mode === 'eq-hop' && draft.dstEqId) {
              noteDiagramLatestEquipmentPorts(draft.dstEqId, eqInPort, null);
            }
          },
        });
        Sheets.close('sh-confirm');
        Sheets.close('sh-port');
        this._clearConfirmPayload();
        this._outHopSnapshot = null;
        this._eqHopSnapshot = null;
        this.cancel();
        showToast('Connection created successfully.');
      } else {
        const saved = await API.saveConnection(Config.stationId, payload);
        let mockConn;
        if (mode === 'eq-hop') {
          mockConn = {
            ...saved,
            id: saved.id || `c-eq-${Date.now()}`,
            src: '',
            dst: '',
            equipment_id: eqId,
            dst_equipment_id: draft.dstEqId,
            eq_in_port: eqInPort,
            eq_out_port: eqOutPort,
            linkRole: 'eq-to-eq',
            strand_index: pendingStrand,
          };
        } else if (mode === 'out-hop') {
          const srcSide = draft.eqOutPortSide || eqPortSideFromRef(eqOutPort, 'out');
          mockConn = {
            ...saved,
            id: saved.id || `c-out-${Date.now()}`,
            src: '',
            dst: dstPort,
            equipment_id: eqId,
            eq_in_port: null,
            eq_out_port: eqOutPort,
            eq_source_side: srcSide,
            linkRole: 'eq-out-to-fdms',
            strand_index: pendingStrand,
          };
        } else if (mode === 'direct-fdms') {
          mockConn = {
            ...saved,
            id: saved.id || `c-direct-${Date.now()}`,
            src: srcPort,
            dst: dstPort,
            equipment_id: null,
            eq_in_port: null,
            eq_out_port: null,
            linkRole: 'direct-fdms',
            strand_index: pendingStrand,
          };
        } else if (mode === 'fdms-out-to-in') {
          mockConn = {
            ...saved,
            id: saved.id || `c-direct-rev-${Date.now()}`,
            src: srcPort,
            dst: dstPort,
            equipment_id: null,
            eq_in_port: null,
            eq_out_port: null,
            linkRole: 'fdms-out-to-in',
            strand_index: pendingStrand,
          };
        } else {
          mockConn = {
            ...saved,
            id: saved.id || `c-in-${Date.now()}`,
            src: srcPort,
            dst: '',
            equipment_id: eqId,
            eq_in_port: eqInPort,
            eq_out_port: null,
            linkRole: 'in-path',
            strand_index: pendingStrand,
          };
        }
        State.connections.push(mockConn);
        if (eqId) {
          noteDiagramLatestEquipmentPorts(eqId, eqInPort, eqOutPort);
          applyDiagramPortHintsAfterSave(this.state);
        }
        Sheets.close('sh-confirm');
        Sheets.close('sh-port');
        this.cancel();
        reloadCableDiagramFromConnectivity();
        showToast('✅ Connection created successfully.');
      }
    } catch (e) {
      showToast('❌ Failed to save — ' + e.message);
    } finally {
      this._setConfirmSaveBusy(false);
    }
  },

  /* ── PROGRESS PILL HELPER ────────────────────────────── */
  _setStep(step, hint) {
    if (this.directConnect) {
      const wrap = document.getElementById('conn-prog-wrap');
      if (wrap) {
        wrap.classList.remove('show');
        wrap.setAttribute('aria-hidden', 'true');
      }
      return;
    }
    const maxStep = step === 0 ? 0 : 2;
    const cps3 = document.getElementById('cps3');
    const cpl2 = document.getElementById('cpl2');
    if (cps3) cps3.style.display = maxStep >= 3 ? '' : 'none';
    if (cpl2) cpl2.style.display = maxStep >= 3 ? '' : 'none';

    const prog = document.getElementById('conn-prog');
    const stepsEl = document.querySelector('.cp-steps');
    if (stepsEl) stepsEl.style.display = step === 0 ? 'none' : '';

    if (step === 0) {
      ['cps1', 'cps2'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.className = 'cp-step';
      });
      if (cps3) cps3.className = 'cp-step';
      ['cpl1', 'cpl2'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.className = 'cp-line';
      });
      if (prog) prog.classList.add('connect-pick-type');
      const hintEl = document.getElementById('cp-hint');
      if (hintEl) {
        hintEl.classList.add('cp-hint-mode-picker');
        hintEl.innerHTML = hint;
      }
      this._syncConnectBodyClass();
      this._updateModeButtons();
      return;
    }

    if (prog) prog.classList.remove('connect-pick-type');

    ['cps1', 'cps2'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.className = 'cp-step' + (i + 1 < step ? ' done' : i + 1 === step ? ' active' : '');
      el.textContent = i + 1 < step ? '✓' : String(i + 1);
    });
    ['cpl1'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.className = 'cp-line' + (i + 1 < step ? ' done' : '');
    });
    const hintEl = document.getElementById('cp-hint');
    if (hintEl) {
      hintEl.classList.remove('cp-hint-mode-picker');
      hintEl.innerHTML = hint;
    }
    this._syncConnectBodyClass();
    this._syncDiagramConnectMode();
  },
};

window.Connect = Connect;

/**
 * sheets.js  —  Bottom sheet management + sheet content builders
 *
 * Sheets.open(id)          → show a sheet overlay
 * Sheets.close(id)         → hide a sheet overlay
 * Sheets.openPortDetail()  → IN-FDMS port detail / connection info
 * Sheets.openEquipDetail() → Equipment port map
 * Sheets.openAddEquip()    → Add new equipment form
 */

const Sheets = {
  _activeEquipId: null,

  open(id)  { document.getElementById(id)?.classList.add('show');    },
  close(id) {
    if (id === 'sh-eq-detail') this._activeEquipId = null;
    if (id === 'sh-add-eq') this._setAddEquipFormBusy(false);
    if (id === 'sh-confirm') Connect._setConfirmSaveBusy(false);
    if (id === 'sh-port') this._setPortDetailFormBusy(false);
    if (id === 'sh-line-detail') {
      this._setLineDetailFormBusy(false);
      this._activeLineMeta = null;
    }
    if (id === 'sh-eq-detail') {
      this._setEquipDetailFormBusy(false);
      hideEqPortFloatTip();
    }
    document.getElementById(id)?.classList.remove('show');
  },

  _setSheetBusy(sheetId, loading, message = 'Please wait…') {
    const sheetOv = document.getElementById(sheetId);
    if (!sheetOv) return;
    const sheet = sheetOv.querySelector('.sheet');
    if (!sheet) return;

    let overlay = sheet.querySelector('.sheet-busy');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sheet-busy';
      overlay.hidden = true;
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.setAttribute('aria-busy', 'false');
      overlay.innerHTML =
        '<div class="sheet-busy-panel">' +
        '<div class="cv-loader-spin" aria-hidden="true"></div>' +
        '<p class="cv-loader-text sheet-busy-text"></p>' +
        '</div>';
      sheet.appendChild(overlay);
    }

    const textEl = overlay.querySelector('.sheet-busy-text');
    if (textEl) textEl.textContent = message;
    overlay.hidden = !loading;
    overlay.setAttribute('aria-busy', loading ? 'true' : 'false');
    sheet.classList.toggle('is-sheet-busy', loading);
    const closeBtn = sheet.querySelector('.sh-close-btn');
    if (closeBtn) closeBtn.disabled = loading;
  },

  _initSheetCloseButtons() {
    if (this._sheetCloseInited) return;
    this._sheetCloseInited = true;

    document.querySelectorAll('.sheet-ov .sheet').forEach((sheet) => {
      if (sheet.querySelector('.sh-close-btn')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sh-close-btn';
      btn.setAttribute('data-action', 'sheet-close');
      btn.setAttribute('aria-label', 'Close');
      btn.innerHTML = '&times;';
      sheet.insertBefore(btn, sheet.firstChild);
    });
  },

  _setActBtnLoading(btn, loading, busyLabel) {
    if (!btn) return;
    if (loading) {
      if (!btn.dataset.defaultHtml) btn.dataset.defaultHtml = btn.innerHTML;
      btn.classList.add('is-loading');
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML =
        `<span class="act-btn-spin" aria-hidden="true"></span>${busyLabel}`;
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.innerHTML = btn.dataset.defaultHtml || btn.innerHTML;
    }
  },

  _setAddEquipFormBusy(loading) {
    const saveBtn = document.getElementById('btn-save-equip');
    const cancelBtn = document.getElementById('btn-cancel-add-eq');
    const form = document.getElementById('sh-add-eq');
    if (loading) {
      this._setSheetBusy('sh-add-eq', true, 'Adding equipment…');
      this._setActBtnLoading(saveBtn, true, 'Adding…');
      if (cancelBtn) cancelBtn.disabled = true;
      form?.querySelectorAll('input, select, button.act-btn').forEach(el => {
        if (el.id !== 'btn-save-equip') el.disabled = true;
      });
    } else {
      this._setSheetBusy('sh-add-eq', false);
      this._setActBtnLoading(saveBtn, false);
      if (cancelBtn) cancelBtn.disabled = false;
      form?.querySelectorAll('input, select').forEach(el => { el.disabled = false; });
    }
  },

  _setLineDetailFormBusy(loading) {
    const removeBtn = document.querySelector('#sh-line-detail [data-action="remove-line-conn"]');
    const closeBtn = document.querySelector('#sh-line-detail [data-action="close-line-detail"]');
    const viewBtn = document.querySelector('#sh-line-detail [data-action="open-in-fdms-port"]');
    if (loading) {
      this._setSheetBusy('sh-line-detail', true, 'Removing connection…');
      this._setActBtnLoading(removeBtn, true, 'Removing…');
      if (closeBtn) closeBtn.disabled = true;
      if (viewBtn) viewBtn.disabled = true;
    } else {
      this._setSheetBusy('sh-line-detail', false);
      this._setActBtnLoading(removeBtn, false);
      if (closeBtn) closeBtn.disabled = false;
      if (viewBtn) viewBtn.disabled = false;
    }
  },

  _setPortDetailFormBusy(loading) {
    const removeBtn = document.querySelector('#sh-port [data-action="remove-conn"]');
    const closeBtn = document.querySelector('#sh-port [data-action="close-port-detail"]');
    if (loading) {
      this._setSheetBusy('sh-port', true, 'Removing connection…');
      this._setActBtnLoading(removeBtn, true, 'Removing…');
      if (closeBtn) closeBtn.disabled = true;
    } else {
      this._setSheetBusy('sh-port', false);
      this._setActBtnLoading(removeBtn, false);
      if (closeBtn) closeBtn.disabled = false;
    }
  },

  _setEquipDetailFormBusy(loading) {
    const removeBtn = document.querySelector('#sh-eq-detail [data-action="remove-equip"]');
    const closeBtn = document.querySelector('#sh-eq-detail [data-action="close-eq-detail"]');
    if (loading) {
      this._setSheetBusy('sh-eq-detail', true, 'Removing equipment…');
      this._setActBtnLoading(removeBtn, true, 'Removing…');
      if (closeBtn) closeBtn.disabled = true;
    } else {
      this._setSheetBusy('sh-eq-detail', false);
      this._setActBtnLoading(removeBtn, false);
      if (closeBtn) closeBtn.disabled = false;
    }
  },

  /** Hide legacy 2×2 type cards; ensure dropdown field is present (Fiberneo templates) */
  _ensureAddEquipTypeDropdown() {
    const sheet = document.getElementById('sh-add-eq');
    if (!sheet) return;

    sheet.querySelectorAll('.et-grid').forEach((grid) => {
      grid.hidden = true;
      grid.setAttribute('aria-hidden', 'true');
    });

    let typeFg = sheet.querySelector('.eq-type-fg');
    let typeSel = document.getElementById('eq-type-select');

    if (!typeSel) {
      typeFg = document.createElement('div');
      typeFg.className = 'fg eq-type-fg';
      typeFg.innerHTML = `
        <label class="fl" for="eq-type-select">Equipment Type</label>
        <div class="fi-select-wrap">
          <select class="fi fi-select" id="eq-type-select">
            <option value="" selected disabled>Select type</option>
            <option value="rly">Railway Eq.</option>
            <option value="dwdm">DWDM</option>
            <option value="sw">Switch</option>
            <option value="router">Router</option>
          </select>
        </div>`;
      const anchor = sheet.querySelector('.sh-sub') || sheet.querySelector('.sh-in');
      anchor?.insertAdjacentElement('afterend', typeFg);
      typeSel = document.getElementById('eq-type-select');
    }

    if (typeFg) typeFg.hidden = false;
  },

  /** Wire buttons/dialog controls (works when inline onclick is stripped) */
  bindUI() {
    this._initSheetCloseButtons();

    document.getElementById('btn-save-equip')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveEquip();
    });

    document.getElementById('btn-cancel-add-eq')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close('sh-add-eq');
    });

    if (this._uiDelegated) return;
    this._uiDelegated = true;

    document.getElementById('eqd-body')?.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-action="eq-port-search"]');
      if (!inp) return;
      this._filterEquipDetailPorts(inp.value);
    });

    document.addEventListener('click', (e) => {
      const sheetClose = e.target.closest('[data-action="sheet-close"]');
      if (sheetClose) {
        e.preventDefault();
        const ov = sheetClose.closest('.sheet-ov');
        if (!ov) return;
        const sheet = ov.querySelector('.sheet');
        if (sheet?.classList.contains('is-sheet-busy')) return;
        const id = ov.id;
        if (id === 'sh-confirm' || id === 'sh-pick-out' || id === 'sh-pick-in' || id === 'sh-pick-eq') {
          Connect.cancel();
        } else if (id) {
          this.close(id);
        }
        return;
      }

      const closeEq = e.target.closest('[data-action="close-eq-detail"]');
      if (closeEq) {
        e.preventDefault();
        this.close('sh-eq-detail');
        return;
      }

      const closePort = e.target.closest('[data-action="close-port-detail"]');
      if (closePort) {
        e.preventDefault();
        this.close('sh-port');
        return;
      }

      const closeLine = e.target.closest('[data-action="close-line-detail"]');
      if (closeLine) {
        e.preventDefault();
        this.close('sh-line-detail');
        return;
      }

      const openInFdms = e.target.closest('[data-action="open-in-fdms-port"]');
      if (openInFdms?.dataset.portId) {
        e.preventDefault();
        this.close('sh-line-detail');
        this.openPortDetail(openInFdms.dataset.portId);
        return;
      }

      const removeEq = e.target.closest('[data-action="remove-equip"]');
      if (removeEq?.dataset.eqId) {
        e.preventDefault();
        this.removeEquip(removeEq.dataset.eqId);
        return;
      }

      const removeConn = e.target.closest('[data-action="remove-conn"]');
      if (removeConn?.dataset.connId) {
        e.preventDefault();
        this.removeConn(removeConn.dataset.connId, removeConn.dataset.srcPort);
        return;
      }

      const removeLineConn = e.target.closest('[data-action="remove-line-conn"]');
      if (removeLineConn) {
        e.preventDefault();
        this.removeLineConnection(this._activeLineMeta);
        return;
      }

      const connectPort = e.target.closest('[data-action="connect-port"]');
      if (connectPort?.dataset.portId) {
        e.preventDefault();
        this.close('sh-port');
        if (Connect.directConnect) {
          Connect._beginInHopFromPort(connectPort.dataset.portId);
        } else {
          Connect.startInHop();
          Connect.portTap(connectPort.dataset.portId);
        }
        return;
      }

      const connectEqPort = e.target.closest('[data-action="connect-eq-port"]');
      if (connectEqPort?.dataset.eqId) {
        e.preventDefault();
        this.close('sh-eq-detail');
        Connect._startOutConnectFromEquip(connectEqPort.dataset.eqId);
        return;
      }

      const eqDetailConnect = e.target.closest('[data-action="eq-detail-connect"]');
      if (eqDetailConnect?.dataset.eqId && eqDetailConnect.dataset.eqSide) {
        e.preventDefault();
        const slot = Number(eqDetailConnect.dataset.eqSlot);
        if (!Number.isFinite(slot)) return;
        Connect._beginFromEquipDetailPort(
          eqDetailConnect.dataset.eqId,
          eqDetailConnect.dataset.eqSide,
          slot,
          eqDetailConnect.dataset.eqCode || null,
          eqDetailConnect.dataset.eqPortId || null,
        );
        return;
      }

      const eqDetailDisconnect = e.target.closest('[data-action="eq-detail-disconnect"]');
      if (eqDetailDisconnect?.dataset.eqId && eqDetailDisconnect.dataset.eqSide) {
        e.preventDefault();
        const slot = Number(eqDetailDisconnect.dataset.eqSlot);
        if (!Number.isFinite(slot)) return;
        this.removeEquipPortConnection(
          eqDetailDisconnect.dataset.eqId,
          eqDetailDisconnect.dataset.eqSide,
          slot,
          eqDetailDisconnect.dataset.eqCode || null,
        );
        return;
      }

      const addEquip = e.target.closest('[data-action="add-equip"]');
      if (addEquip) {
        e.preventDefault();
        e.stopPropagation();
        this.openAddEquip();
        return;
      }

      const openEq = e.target.closest('.d-eq[data-eq-id], .eq-card[data-eq-id]');
      if (openEq) {
        if (e.target.closest('.d-eq-port')) return;
        if (e.target.closest('.d-eq-expand-btn')) return;
        if (Connect.state.active && !Connect.directConnect) return;
        e.preventDefault();
        const equipId = openEq.getAttribute('data-eq-id');
        if (equipId) this.openEquipDetail(equipId);
      }
    });
  },

  /* ── PORT DETAIL ─────────────────────────────────────── */
  openLineDetail(meta) {
    if (!meta) return;
    this._activeLineMeta = meta;

    document.getElementById('ld-title').textContent = meta.title || 'Connection';
    document.getElementById('ld-sub').textContent = meta.subtitle
      || `Cable diagram · ${State.overview?.station_name || ''}`;

    let html = '';
    if (meta.chips?.length) {
      html += '<div class="path-chips">';
      meta.chips.forEach((chip, i) => {
        if (i > 0) html += '<span class="parr">→</span>';
        const kind = chip.kind ? ` ${chip.kind}` : '';
        html += `<div class="pchip${kind}">${escapeHtml(chip.text)}</div>`;
      });
      html += '</div>';
    }

    html += '<div class="info-blk"><h4>Connection Details</h4>';
    for (const row of meta.rows || []) {
      const val = row.html ? row.value : escapeHtml(row.value);
      html += `<div class="ir"><span class="il">${escapeHtml(row.label)}</span>`
        + `<strong class="iv">${val}</strong></div>`;
    }
    html += '</div>';

    html += '<div class="act-row">';
    if (meta.removePayload?.kind === 'in-fdms' && meta.removePayload.srcPort) {
      html += `<button type="button" class="act-btn secondary" data-action="open-in-fdms-port" `
        + `data-port-id="${attrEsc(meta.removePayload.srcPort)}">View IN-FDMS Port</button>`;
    }
    if (meta.removePayload) {
      html += '<button type="button" class="act-btn danger" data-action="remove-line-conn">'
        + '🗑 Remove Connection</button>';
    }
    html += '<button type="button" class="act-btn secondary" data-action="close-line-detail">Close</button>';
    html += '</div>';

    document.getElementById('ld-body').innerHTML = html;
    this.open('sh-line-detail');
  },

  openPortDetail(portId) {
    const lbl  = fdmsInLabelFromPortKey(portId);
    const conn = getInFdmsPortConnection(portId);

    document.getElementById('pd-title').textContent = lbl;
    document.getElementById('pd-sub').textContent   =
      `IN-FDMS · ${State.overview?.station_name || ''}`;

    let html = '';

    if (conn) {
      const eq  = findEquipmentById(conn.equipment_id);
      const isOutLeg = conn.linkRole === 'fdms-out-to-eq-out';
      const destLbl = fdmsConnectionDestLabel(conn);
      const outFdmsLbl = conn.dst ? fdmsOutLabelFromPortKey(conn.dst) : '';

      let chips = `<div class="pchip src">${escapeHtml(fdmsInLabelFromPortKey(conn.src))}</div><span class="parr">→</span>`;
      if (eq) chips += `<div class="pchip via">${escapeHtml(eq.name)}</div>`;
      else    chips += `<div class="pchip" style="border-color:var(--c-dir);color:var(--c-dir)">Direct</div>`;
      if (destLbl) {
        chips += `<span class="parr">→</span><div class="pchip dst">${escapeHtml(destLbl)}</div>`;
      } else if (isOutLeg && conn.eq_out_code) {
        chips += `<span class="parr">→</span><div class="pchip dst">${escapeHtml(conn.eq_out_code)}</div>`;
      }

      const recordIdText = (conn.recordIds && conn.recordIds.length > 1)
        ? conn.recordIds.join(', ')
        : ((conn.recordIds && conn.recordIds[0]) || conn.id);

      html += `
        <div class="path-chips">${chips}</div>
        <div class="info-blk">
          <h4>Connection Info</h4>
          <div class="ir"><span class="il">IN-FDMS Port</span> <strong class="iv">${escapeHtml(fdmsInLabelFromPortKey(conn.src))}</strong></div>
          ${isOutLeg ? '' : `
          <div class="ir"><span class="il">OUT-FDMS Port</span>
            <strong class="iv">${escapeHtml(conn.dst_fdms_code || outFdmsLbl || '—')}</strong></div>
          ${!conn.dst_fdms_code && conn.eq_out_code ? `
          <div class="ir"><span class="il">Equipment OUT</span>
            <strong class="iv">${escapeHtml(conn.eq_out_code)}</strong></div>` : ''}`}
          <div class="ir"><span class="il">Via Equipment</span><strong class="iv">${eq ? escapeHtml(eq.name) : 'Direct pass-through'}</strong></div>
          ${eq && !isOutLeg ? `
          <div class="ir"><span class="il">EQ IN Port</span>  <strong class="iv">${escapeHtml(eqPortLabelFromConn(eq, 'in', conn))}</strong></div>
          <div class="ir"><span class="il">EQ OUT Port</span> <strong class="iv">${escapeHtml(eqPortLabelFromConn(eq, 'out', conn))}</strong></div>` : ''}
          ${eq && isOutLeg ? `
          <div class="ir"><span class="il">EQ OUT Port</span> <strong class="iv">${escapeHtml(eqPortLabelFromConn(eq, 'out', conn))}</strong></div>
          <div class="ir"><span class="il">Type</span>         <strong class="iv">IN-FDMS → equipment OUT</strong></div>` : ''}
          <div class="ir"><span class="il">Strand</span>      <strong class="iv">${strandBadge(conn.strand_index)}</strong></div>
          <div class="ir"><span class="il">Connection ID</span>
            <strong class="iv" style="color:var(--text3);font-size:11px;word-break:break-all">${escapeHtml(recordIdText)}</strong>
          </div>
        </div>
        <div class="act-row">
          <button type="button" class="act-btn danger" data-action="remove-conn"
            data-conn-id="${conn.id}" data-src-port="${conn.src}">🗑 Remove Connection</button>
          <button type="button" class="act-btn secondary" data-action="close-port-detail">Close</button>
        </div>`;
    } else {
      html += `
        <div class="info-blk" style="text-align:center;padding:32px 20px">
          <div style="font-size:42px;margin-bottom:10px">📭</div>
          <h3 style="font-size:16px;margin-bottom:6px">No Connection</h3>
          <p style="font-size:13px;color:var(--text2);line-height:1.6">Port ${lbl} is free. Use Connect mode to assign it.</p>
        </div>
        <div class="act-row">
          <button type="button" class="act-btn primary" data-action="connect-port" data-port-id="${portId}">🔗 Connect This Port</button>
          <button type="button" class="act-btn secondary" data-action="close-port-detail">Close</button>
        </div>`;
    }

    document.getElementById('pd-body').innerHTML = html;
    this.open('sh-port');
  },

  /* ── REMOVE DIAGRAM LINE CONNECTION ─────────────────── */
  async removeLineConnection(meta, {
    fromEquipDetail = false,
    equipId = null,
    equipPort = null,
  } = {}) {
    const payload = meta?.removePayload ?? (meta?.kind ? meta : null);
    if (!payload) {
      // showToast('⚠️ Cannot remove this connection');
      return;
    }

    const btn = document.querySelector('#sh-line-detail [data-action="remove-line-conn"]');
    if (btn?.classList.contains('is-loading')) return;

    if (!fromEquipDetail) this._setLineDetailFormBusy(true);

    try {
      if (payload.kind === 'in-fdms') {
        await this.removeConn(payload.connId, payload.srcPort, {
          fromLineDetail: true,
          fromEquipDetail,
          equipId,
          equipPort,
        });
        return;
      }

      if (payload.kind === 'direct-fdms') {
        if (payload.connId || payload.srcPort) {
          await this.removeConn(payload.connId, payload.srcPort, {
            fromLineDetail: true,
            fromEquipDetail,
            equipId,
            equipPort,
          });
          return;
        }

        let directRecords = [];
        if (useFiberneoLive()) {
          directRecords = collectDeleteRecordsForDirectFdms(
            payload.inCode, payload.outCode, payload.lk,
          );
          if (!directRecords.length) {
            showToast('⚠️ No API connectivity record found for this link');
            return;
          }
          await API.deleteEquipmentConnectivity(directRecords);
          await finalizeConnectivityAfterDelete(directRecords, null, () => {
            if (!fromEquipDetail || !equipId) return;
            const eq = findEquipmentById(equipId);
            if (!eq) return;
            this._renderEquipDetailBody(eq);
            this.open('sh-eq-detail');
          });
        } else {
          const srcKey = fdmsPortKeyForCode('in', payload.inCode);
          const conn = srcKey
            ? State.connections.find((c) => c.src === srcKey && !c.equipment_id)
            : null;
          if (conn) {
            await API.deleteConnection(Config.stationId, conn.id);
            State.connections = State.connections.filter((c) => c.id !== conn.id);
          }
        }

        this.close('sh-line-detail');
        Render.all();
        scheduleDiagramLinesRedraw();
        showToast('Connection removed successfully');
        return;
      }

      let apiRecords = [];
      if (useFiberneoLive()) {
        if (payload.kind === 'eq-hop') {
          apiRecords = collectDeleteRecordsForCrossLink(payload.lk);
        } else if (payload.kind === 'eq-out-fdms') {
          if (payload.hopConnId) {
            const hop = State.connections.find((c) => c.id === payload.hopConnId);
            if (hop) apiRecords = collectDeleteConnectivityRecords(hop);
          }
          if (!apiRecords.length) {
            apiRecords = collectDeleteEqOutToOutFdmsRecords(
              payload.fromEqId,
              payload.fromOutCode,
              payload.toOutFdmsCode,
            );
          }
        }
        if (!apiRecords.length) {
          showToast('⚠️ No API connectivity record found for this link');
          return;
        }
      }

      const portHint = equipPort && equipId != null
        ? {
          eqId: equipId,
          side: equipPort.side,
          slot: equipPort.slot,
          code: equipPort.code,
          crossLink: equipPort.crossLink
            || (payload.kind === 'eq-hop' ? payload.lk : null),
        }
        : (payload.kind === 'eq-hop' ? buildPortHintFromCrossLink(payload.lk) : null);

      const refreshEquipDetail = () => {
        if (!fromEquipDetail || !equipId) return;
        const eq = findEquipmentById(equipId);
        if (!eq) return;
        this._renderEquipDetailBody(eq);
        this.open('sh-eq-detail');
      };

      if (useFiberneoLive()) {
        await API.deleteEquipmentConnectivity(apiRecords);
        await finalizeConnectivityAfterDelete(apiRecords, portHint, refreshEquipDetail);
      } else if (payload.kind === 'eq-out-fdms' && payload.hopConnId) {
        const hop = State.connections.find((c) => c.id === payload.hopConnId);
        if (hop) {
          await API.deleteConnection(Config.stationId, hop.id);
          State.connections = State.connections.filter((c) => c.id !== hop.id);
        }
      } else if (payload.kind === 'eq-hop') {
        State.connections = State.connections.filter((c) => !(
          c.linkRole === 'eq-to-eq'
          && String(c.equipment_id) === String(payload.lk.fromEqId)
          && String(c.dst_equipment_id) === String(payload.lk.toEqId)
        ));
      }

      this.close('sh-line-detail');
      Render.all();
      refreshEquipDetail();
      scheduleDiagramLinesRedraw();
      showToast('Connection removed successfully');
    } catch (e) {
      showToast('❌ Failed — ' + e.message);
    } finally {
      if (!fromEquipDetail) this._setLineDetailFormBusy(false);
    }
  },

  async removeEquipPortConnection(eqId, side, slot, code) {
    const payload = resolveEquipPortRemovePayload(eqId, side, slot, code);
    if (!payload) {
      showToast('⚠️ Cannot remove this connection');
      return;
    }
    if (document.querySelector('#sh-eq-detail [data-action="eq-detail-disconnect"].is-loading')) {
      return;
    }

    const btnSel = [
      '#sh-eq-detail [data-action="eq-detail-disconnect"]',
      `[data-eq-id="${CSS.escape(String(eqId))}"]`,
      `[data-eq-side="${CSS.escape(String(side))}"]`,
      `[data-eq-slot="${slot}"]`,
    ].join('');
    const btn = document.querySelector(btnSel);

    const setBtnLoading = (loading) => {
      if (!btn) return;
      if (loading) {
        btn.classList.add('is-loading');
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = '<span class="eq-port-act-spin" aria-hidden="true"></span>';
      } else {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.innerHTML = EQ_DETAIL_DISCONNECT_ICON;
      }
    };

    setBtnLoading(true);
    document.querySelectorAll('#sh-eq-detail [data-action="eq-detail-disconnect"]').forEach((el) => {
      if (el !== btn) el.disabled = true;
    });
    document.querySelectorAll('#sh-eq-detail [data-action="eq-detail-connect"]').forEach((el) => {
      el.disabled = true;
    });

    const removedCrossLink = getAllConnectivityCrossLinks().find(
      (lk) => equipPortMatchesCrossLink(lk, eqId, side, slot, code),
    ) || (payload.kind === 'eq-hop' ? payload.lk : null);

    try {
      await this.removeLineConnection(
        { removePayload: payload },
        {
          fromEquipDetail: true,
          equipId: eqId,
          equipPort: { side, slot, code, crossLink: removedCrossLink },
        },
      );
    } finally {
      const eq = findEquipmentById(eqId);
      if (eq && document.getElementById('sh-eq-detail')?.classList.contains('show')) {
        this._renderEquipDetailBody(eq);
      }
      document.querySelectorAll('#sh-eq-detail [data-action="eq-detail-disconnect"], #sh-eq-detail [data-action="eq-detail-connect"]').forEach((el) => {
        el.classList.remove('is-loading');
        el.disabled = false;
        el.removeAttribute('aria-busy');
        if (el.getAttribute('data-action') === 'eq-detail-disconnect') {
          el.innerHTML = EQ_DETAIL_DISCONNECT_ICON;
        }
      });
    }
  },

  /* ── REMOVE CONNECTION ───────────────────────────────── */
  async removeConn(connId, srcPort, {
    fromLineDetail = false,
    fromEquipDetail = false,
    equipId = null,
    equipPort = null,
  } = {}) {
    const conn = State.connections.find(c => c.id === connId)
      || State.connections.find(c => c.src === srcPort);
    if (!conn) {
      showToast('⚠️ Connection not found');
      return;
    }

    const btn = fromLineDetail
      ? document.querySelector('#sh-line-detail [data-action="remove-line-conn"]')
      : document.querySelector(
        `[data-action="remove-conn"][data-conn-id="${CSS.escape(conn.id)}"]`,
      );
    if (!fromLineDetail && btn?.classList.contains('is-loading')) return;

    try {
      let apiRecords = null;
      if (useFiberneoLive()) {
        apiRecords = collectDeleteConnectivityRecords(conn);
        if (!apiRecords.length) {
          showToast('⚠️ No API connectivity record found for this port');
          return;
        }
      }

      if (!fromLineDetail) this._setPortDetailFormBusy(true);

      const portHint = equipPort && equipId != null
        ? {
          eqId: equipId,
          side: equipPort.side,
          slot: equipPort.slot,
          code: equipPort.code,
        }
        : null;

      const refreshEquipDetail = () => {
        if (!fromEquipDetail || !equipId) return;
        const eq = findEquipmentById(equipId);
        if (!eq) return;
        this._renderEquipDetailBody(eq);
        this.open('sh-eq-detail');
      };

      if (useFiberneoLive()) {
        await API.deleteEquipmentConnectivity(apiRecords);
        await finalizeConnectivityAfterDelete(apiRecords, portHint, refreshEquipDetail);
      } else {
        await API.deleteConnection(Config.stationId, conn.id);
        State.connections = State.connections.filter(c => c.id !== conn.id);
      }

      if (!fromLineDetail) this.close('sh-port');
      this.close('sh-line-detail');
      Render.all();
      refreshEquipDetail();
      showToast('Connection removed successfully');
    } catch (e) {
      showToast('❌ Failed — ' + e.message);
    } finally {
      if (!fromLineDetail) this._setPortDetailFormBusy(false);
    }
  },

  /* ── EQUIPMENT DETAIL ────────────────────────────────── */
  async openEquipDetail(eqId) {
    const eq = State.equipment.find(e => String(e.id) === String(eqId));
    if (!eq) return;

    if (useFiberneoLive() && getFacilityCablePayload()) {
      rebuildEquipmentPortMapsFromFacility();
      rebuildConnectivityDerivedState();
    }

    this._activeEquipId = String(eq.id);
    const meta  = EQ_META[eq.type] || EQ_META.sw;
    const typeLabel = eq.type_label || meta.label;

    document.getElementById('eqd-title').textContent = eq.name;
    this.open('sh-eq-detail');
    this._renderEquipDetailBody(eq);
  },

  _renderEquipDetailBody(eq) {
    const meta  = EQ_META[eq.type] || EQ_META.sw;
    const typeLabel = eq.type_label || meta.label;
    const pc    = getEqPortConnectivity(eq.id);
    const showRemove = !useFiberneoLive() || !isMockEquipmentId(eq.id);
    const connCount = equipmentConnectivityCount(eq);

    document.getElementById('eqd-sub').textContent   =
      `${typeLabel} · ${getAllCenterEquipmentPortSlots(eq).length} ports · ${connCount} connection${connCount !== 1 ? 's' : ''}`;

    let html = '';
    if (eq.code || eq.status || eq.serial_number) {
      html += '<div class="info-blk"><h4>Equipment Details</h4>';
      if (eq.code) html += `<div class="ir"><span class="il">Code</span><strong class="iv">${escapeHtml(eq.code)}</strong></div>`;
      if (eq.status) html += `<div class="ir"><span class="il">Status</span><strong class="iv">${escapeHtml(eq.status)}</strong></div>`;
      if (eq.serial_number) html += `<div class="ir"><span class="il">Serial</span><strong class="iv">${escapeHtml(eq.serial_number)}</strong></div>`;
      html += '</div>';
    }
    const allSlots = getAllCenterEquipmentPortSlots(eq);
    const apiInternalLinks = (pc.links || []).filter((lk) => !lk.inferred);
    const portRowCount = allSlots.length + apiInternalLinks.length;

    html += '<div class="info-blk eq-port-conn-blk"><h4>Port Connectivity</h4>';
    if (portRowCount > 0) {
      html += `<div class="eq-port-search-wrap">
        <input type="search" class="fi eq-port-search" data-action="eq-port-search"
          placeholder="Search ports (e.g. Port-5, fxp0)…" autocomplete="off" enterkeyhint="search"
          aria-label="Search equipment ports">
        <p class="eq-port-search-meta" id="eq-port-search-meta" hidden></p>
      </div>
      <div class="eq-port-list" id="eq-port-list">`;

      allSlots.forEach((row) => {
        const displayLabel = equipmentPortPickerLabel(allSlots, row);
        html += buildEquipDetailPortRowHtml(eq, row.side, row.slot, row.label, displayLabel, row.portId);
      });
      if (apiInternalLinks.length) {
        html += '<h4 class="eq-port-internal-hdr">IN → OUT pairs (equipment API)</h4>';
        apiInternalLinks.forEach((lk) => {
          const inLbl = eqPortDisplayLabel(eq, 'in', lk.in);
          const outLbl = eqPortDisplayLabel(eq, 'out', lk.out);
          const searchKey = [inLbl, outLbl, 'in out pair', lk.strandColor || ''].join(' ').toLowerCase();
          html += `<div class="ir eq-port-row" data-eq-port-row data-search="${attrEsc(searchKey)}">
            <span class="il">${escapeHtml(inLbl)} → ${escapeHtml(outLbl)}</span>
            <strong class="iv">${strandDotHtml(lk.strandColor)}${lk.strandColor ? ` ${escapeHtml(lk.strandColor)}` : ''}</strong>
          </div>`;
        });
      }
      html += `<p class="eq-port-empty" id="eq-port-search-empty" hidden>No ports match your search</p>`;
      html += '</div>';
    } else {
      html += '<p class="eq-port-empty">No ports on this equipment</p>';
    }
    html += '</div>';

    const hasPorts = getAllCenterEquipmentPortSlots(eq).length > 0;
    if (hasPorts && isDiagramCenterEquipment(eq)) {
      html += `<div class="act-row" style="margin-top:12px">
        <button type="button" class="act-btn primary" data-action="connect-eq-port"
          data-eq-id="${attrEsc(eq.id)}">⚡ Connect a Port</button>
      </div>`;
    }
    if (showRemove) {
      html += `<button type="button" class="act-btn danger" style="margin-top:10px"
        data-action="remove-equip" data-eq-id="${escapeHtml(eq.id)}">🗑 Remove Equipment</button>`;
    }

    document.getElementById('eqd-body').innerHTML = html;
    this._filterEquipDetailPorts('');
    requestAnimationFrame(() => syncEquipDetailPortStatusTooltips());
  },

  _filterEquipDetailPorts(query) {
    const list = document.getElementById('eq-port-list');
    if (!list) return;

    const q = _trimStr(query).toLowerCase();
    const rows = list.querySelectorAll('[data-eq-port-row]');
    const emptyEl = document.getElementById('eq-port-search-empty');
    const metaEl = document.getElementById('eq-port-search-meta');
    let visible = 0;

    rows.forEach((row) => {
      const hay = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
      const show = !q || hay.includes(q);
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (emptyEl) emptyEl.hidden = visible > 0 || !q;
    if (metaEl) {
      if (q) {
        metaEl.textContent = visible === 1
          ? '1 port'
          : `${visible} of ${rows.length} ports`;
        metaEl.hidden = false;
      } else {
        metaEl.hidden = true;
      }
    }
    requestAnimationFrame(() => syncEquipDetailPortStatusTooltips());
  },

  /* ── REMOVE EQUIPMENT ────────────────────────────────── */
  async removeEquip(eqId) {
    const btn = document.querySelector('#sh-eq-detail [data-action="remove-equip"]');
    const id  = btn?.getAttribute('data-eq-id')
      || this._activeEquipId
      || eqId;

    if (!id) {
      showToast('⚠️ Equipment id missing');
      return;
    }

    if (getFacilityId() && isMockEquipmentId(id)) {
      showToast('⚠️ Demo equipment cannot be deleted — open a live equipment item from the list');
      return;
    }

    const eq = State.equipment.find(e => String(e.id) === String(id));
    if (!eq) {
      showToast('⚠️ Equipment not found');
      return;
    }

    const equipId = String(eq.id);
    if (btn?.classList.contains('is-loading')) return;

    this._setEquipDetailFormBusy(true);

    try {
      await API.deleteEquipment(Config.stationId, equipId);

      const facilityId = getFacilityId();
      if (facilityId) {
        await reloadEquipmentConnectivity({ bustCache: true });
      } else {
        State.equipment = State.equipment.filter(e => String(e.id) !== String(eq.id));
        delete State.equipmentConnectivity[eq.id];
        State.connections = State.connections.filter(
          c => String(c.equipment_id) !== equipId,
        );
      }
      this._activeEquipId = null;

      this._setEquipDetailFormBusy(false);
      this.close('sh-eq-detail');
      Render.all();
      showToast(`🗑 ${eq.name} removed`);
    } catch (e) {
      showToast('❌ Failed — ' + e.message);
    } finally {
      this._setEquipDetailFormBusy(false);
    }
  },

  /* ── ADD EQUIPMENT ───────────────────────────────────── */
  openAddEquip() {
    this._ensureAddEquipTypeDropdown();

    const nameInp = document.getElementById('eq-name-inp');
    const typeSel = document.getElementById('eq-type-select');
    const inCnt   = document.getElementById('eq-in-cnt');
    const outCnt  = document.getElementById('eq-out-cnt');

    if (nameInp) nameInp.value = '';
    if (typeSel) typeSel.value = '';
    if (inCnt)   inCnt.value = '2';
    if (outCnt)  outCnt.value = '2';

    this._setAddEquipFormBusy(false);
    this.open('sh-add-eq');
    requestAnimationFrame(() => typeSel?.focus());
  },

  async saveEquip() {
    const name = document.getElementById('eq-name-inp').value.trim();
    const typeKey = document.getElementById('eq-type-select')?.value || '';
    if (!name)     { showToast('⚠️ Enter a name');          return; }
    if (!typeKey)  { showToast('⚠️ Select equipment type'); return; }

    const inPorts  = parseInt(document.getElementById('eq-in-cnt').value, 10);
    const outPorts = parseInt(document.getElementById('eq-out-cnt').value, 10);

    if (!getFacilityId() && !siteFieldsForEquipmentCreate() && !useMockApi()) {
      showToast('⚠️ Site data missing — set siteInfoById or facility id for equipment create');
      return;
    }

    const payload = {
      name,
      type      : typeKey,
      in_ports  : inPorts,
      out_ports : outPorts,
    };

    const saveBtn = document.getElementById('btn-save-equip');
    if (saveBtn?.classList.contains('is-loading')) return;

    this._setAddEquipFormBusy(true);

    try {
      const facilityId = getFacilityId();
      const created = await API.addEquipment(Config.stationId || facilityId, payload);

      document.getElementById('eq-name-inp').value = '';
      const typeSel = document.getElementById('eq-type-select');
      if (typeSel) typeSel.value = '';
      this.close('sh-add-eq');
      showToast(`✅ ${name} added`);

      if (facilityId) {
        try {
          await reloadEquipmentConnectivity({ bustCache: true });
        } catch (reloadErr) {
          showToast('⚠️ Added — list refresh failed: ' + reloadErr.message);
        }
      } else if (created?.id) {
        State.equipment.push(created);
      }

      Render.all();
    } catch (e) {
      showToast('❌ Failed — ' + e.message);
      this._setAddEquipFormBusy(false);
    }
  },
};

/* Close any sheet when tapping its overlay backdrop */
document.querySelectorAll('.sheet-ov').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target !== ov) return;
    if (ov.querySelector('.sheet.is-sheet-busy')) return;
    ov.classList.remove('show');
  });
});

window.Sheets = Sheets;

/** Maps injected siteInfo facility object → overview header fields */
function overviewFromFacilityData(facility) {
  if (!facility || typeof facility !== 'object') return null;

  let totalCores = Number(facility.totalCores ?? facility.total_cores ?? facility.coreCount);
  if (!Number.isFinite(totalCores) || totalCores <= 0) {
    for (const eq of facility.equipments || []) {
      const enriched = inferEquipmentTypeFromFacilityItem(eq);
      const typeKey = equipmentTypeKey(equipmentTypeLabelFromApi(enriched));
      if (typeKey !== 'infdms' && !isInFdmsEquipment({ type: typeKey, name: enriched.name })) continue;
      const ports = Array.isArray(enriched.ports) ? enriched.ports : [];
      const inCount = Number(enriched.noInPorts) || ports.filter(
        (p) => (p.portType || '').toUpperCase() === 'IN',
      ).length;
      if (inCount > 0) {
        totalCores = inCount;
        break;
      }
    }
  }

  const address = _trimStr(facility.address);
  const facilityId = facility.id != null ? String(facility.id) : getFacilityId();

  return {
    station_id     : facilityId || '',
    station_name   : _trimStr(facility.name) || 'Site',
    location       : address,
    address,
    pop_type       : _trimStr(facility.type) || '',
    cable_type     : _trimStr(facility.technology) || _trimStr(facility.connectionStr) || '',
    total_cores    : Number.isFinite(totalCores) && totalCores > 0 ? totalCores : null,
    workflow_stage : _trimStr(facility.workflowStage) || '',
    site_code      : _trimStr(facility.code) || '',
  };
}

/** Facility equipment rows may omit `type` — infer from name or embedded connectivity */
function inferEquipmentTypeFromFacilityItem(item) {
  if (!item || typeof item !== 'object') return item;
  if (_trimStr(item.type)) return item;

  const id = item.id != null ? String(item.id) : '';
  for (const rec of item.equipmentConnectivities || []) {
    if (rec.isDeleted) continue;
    if (id && String(rec.targetEquipment?.id) === id && rec.targetEquipment?.type) {
      return { ...item, type: rec.targetEquipment.type };
    }
    if (id && String(rec.sourceEquipment?.id) === id && rec.sourceEquipment?.type) {
      return { ...item, type: rec.sourceEquipment.type };
    }
  }

  const name = _trimStr(item.name).toUpperCase();
  if (/\bIN[-\s]*FDMS\b|\bINFDMS\b/.test(name)) return { ...item, type: 'IN-FDMS' };
  if (/\bOUT[-\s]*FDMS\b|\bOUTFDMS\b/.test(name)) return { ...item, type: 'OUT-FDMS' };
  return item;
}

function normalizeFacilityConnectivityRecord(rec, sourceEq) {
  if (!rec || rec.isDeleted) return null;
  const srcEq = rec.sourceEquipment || {
    id    : sourceEq.id,
    name  : sourceEq.name,
    type  : sourceEq.type,
    code  : sourceEq.code,
    status: sourceEq.status,
  };
  return { ...rec, sourceEquipment: srcEq };
}

/**
 * app.js  —  Application entry point
 *
 * Mobile + Tablet (≤1024px): tab switching via switchTab()
 * Desktop (≥1025px)         : 3-col layout, ports panel collapse via togglePortsPanel()
 *
 * URL: /index.html?station_id=DEW001&theme=dark
 *
 * Flutter WebView:
 *   - Pass URL params for station + theme
 *   - Call App.load() from Flutter to refresh
 *   - Register JavascriptChannel 'FlutterBridge' to receive back events
 */

/** Default / fit-to-screen zoom for the cable diagram */
const DIAGRAM_ZOOM_DEFAULT = 0.85;
/** Mobile — target zoom when diagram fits at this width (horizontal fit, scroll vertically) */
const DIAGRAM_ZOOM_MOBILE = 0.62;
/** Tablet tab layout — minimum zoom */
const DIAGRAM_ZOOM_TABLET_MIN = 0.45;
/** Diagram zoom limits (+ / − buttons) */
const DIAGRAM_ZOOM_MIN = 0.25;
const DIAGRAM_ZOOM_MAX = 1.5;

/** Viewports ≤ this width use tab layout (mobile + tablet); wider uses 3-column desktop */
const TAB_LAYOUT_MAX = 1024;

const App = {
  _activeTab       : 'diagram',
  _portsCollapsed  : false,
  _fsOpen          : false,
  _zoom            : DIAGRAM_ZOOM_DEFAULT,
  _wasTabLayout    : null,
  _isPhone         : () => window.innerWidth < 768,
  _isTabLayout     : () => window.innerWidth <= TAB_LAYOUT_MAX,
  /** @deprecated use _isTabLayout — kept for any external callers */
  _isMobile        : () => window.innerWidth <= TAB_LAYOUT_MAX,

  /** Populate State from injected siteInfo facility payload */
  applyFacilityCableView(facility) {
    if (!facility || typeof facility !== 'object') {
      throw new Error('Facility not found');
    }

    if (facility.id != null) setFacilityId(facility.id);

    const siteOverview = overviewFromFacilityData(facility);
    State.overview = siteOverview || {
      station_id  : getFacilityId() || '',
      station_name: 'Site',
    };

    const rawEquipments = facility.equipments || [];
    State.equipment = rawEquipments.map(
      (item) => mapEquipmentFromApi(inferEquipmentTypeFromFacilityItem(item)),
    );
    State.connections = [];
    State.equipmentConnectivity = {};

    refreshFdmsColumnPortsOnEquipment();
    syncTotalPortsFromFdms();

    for (const raw of rawEquipments) {
      const eq = State.equipment.find((e) => String(e.id) === String(raw.id));
      if (!eq) continue;
      const enriched = inferEquipmentTypeFromFacilityItem(raw);
      const records = (enriched.equipmentConnectivities || [])
        .map((rec) => normalizeFacilityConnectivityRecord(rec, enriched))
        .filter(Boolean);
      const portMap = buildEquipmentPortMap(eq.id, records);
      portMap._fetched = true;
      State.equipmentConnectivity[eq.id] = portMap;
    }

    applyPendingEquipPortClears();
    rebuildConnectivityDerivedState();
    scheduleDiagramLinesRedraw();

    if (!State.totalPorts && State.overview?.total_cores) {
      State.totalPorts = State.overview.total_cores;
    }
    if (State.overview && !State.overview.total_cores && State.totalPorts) {
      State.overview.total_cores = State.totalPorts;
    }
  },

  /* ── LOAD DATA ─────────────────────────────────────── */
  async load() {
    if (!renderDomReady()) {
      whenRenderDomReady(() => this.load());
      return;
    }
    State.loading = true;
    State.error   = null;
    Render.clearError();
    Render.setLoader(true);

    try {
      const siteOverview = overviewFromSiteData(getSiteData());
      let facility = getFacilityCablePayload();

      if (!facility && !useMockApi()) {
        const facilityId = getFacilityId();
        if (facilityId) {
          await refreshFacilityCableViewFromApi(facilityId);
          facility = getFacilityCablePayload();
        } else if (this._awaitingSiteData || isFiberneoHostedView()) {
          /* Parent still fetching siteInfo — keep loader, no Retry yet */
          this._awaitingSiteData = true;
          this._startSiteDataWatch();
          return;
        }
      }

      if (facility) {
        /* Fiberneo: bundled site + equipment + connectivity from window.siteInfo */
        if (window.siteInfoById?.id != null) setFacilityId(window.siteInfoById.id);
        else if (window.facilityId != null) setFacilityId(window.facilityId);
        const urlFacilityId = _facilityIdFromUrl();
        if (urlFacilityId) setFacilityId(urlFacilityId);
        this.applyFacilityCableView(facility);

        if (getFacilityId() && !siteFieldsForEquipmentCreate()) {
          void ensureSiteFieldsForEquipmentCreate().catch(() => { /* prefetch for Add Equipment */ });
        }

        State.loading = false;
        Render.setLoader(false);
        Render.all();
        scheduleDiagramLinesRedraw();
      } else if (useMockApi()) {
        const [overview, cableView] = await Promise.all([
          API.getOverview(Config.stationId),
          API.getCableView(Config.stationId),
        ]);
        State.overview    = mergeOverview(overview, siteOverview);
        State.equipment   = cableView.equipment || [];
        State.connections = cableView.connections || [];
        State.totalPorts  = cableView.total_ports
          || State.overview?.total_cores
          || 24;
        if (State.overview && !State.overview.total_cores) {
          State.overview.total_cores = State.totalPorts;
        }
        State.equipmentConnectivity = {};
        syncTotalPortsFromFdms();
      } else if (this._awaitingSiteData || isFiberneoHostedView()) {
        this._awaitingSiteData = true;
        this._startSiteDataWatch();
        return;
      } else {
        throw new Error('siteInfo is missing — inject window.siteInfo from Fiberneo or add ?mock=1 for local demo.');
      }

      this._awaitingSiteData = false;
      this._stopSiteDataWatch();

      State.loading = false;
      Render.setLoader(false);

      const skPorts = document.getElementById('sk-ports');
      if (skPorts) skPorts.innerHTML = '';
      if (!facility) Render.all();

      // Show UI controls now data is ready
      const btnAddEq = document.getElementById('btn-add-equip');
      if (btnAddEq) btnAddEq.style.display = '';

      const applyDefaultZoom = () => {
        if (this._isTabLayout()) this._applyDiagramFitZoom();
        else this._applyZoom(DIAGRAM_ZOOM_DEFAULT);
      };

      this._wasTabLayout = this._isTabLayout();
      this._applyLayoutMode();

      const redrawDiagram = () => {
        applyDefaultZoom();
        Render.drawLines();
      };
      if (this._isTabLayout()) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this._refreshDiagramScroll();
            redrawDiagram();
          });
        });
        setTimeout(() => {
          this._refreshDiagramScroll();
          redrawDiagram();
        }, 150);
        setTimeout(redrawDiagram, 400);
      } else {
        setTimeout(redrawDiagram, 200);
      }
      // Preview iframe: redraw after modal layout settles
      if (document.documentElement.classList.contains('is-embed')) {
        setTimeout(() => Render.drawLines(), 400);
        setTimeout(() => Render.drawLines(), 900);
      }
    } catch (e) {
      this._awaitingSiteData = false;
      this._stopSiteDataWatch();
      State.loading = false;
      Render.setLoader(false);
      State.error   = e.message;
      Render.error(e.message || 'Unknown error');
    }
  },

  /* ── TAB LAYOUT (mobile + tablet) vs desktop chrome ── */
  _applyLayoutMode() {
    const tabLayout = this._isTabLayout();
    const segBar     = document.getElementById('seg-bar');
    const mobZoom    = document.getElementById('mobile-zoom-bar');
    const btnConnect = document.getElementById('btn-connect');
    const btnFs      = document.getElementById('btn-fullscreen');
    const zoomCtrl   = document.getElementById('zoom-controls');

    const portsPanel = document.getElementById('panel-ports');
    const portsStrip = document.getElementById('ports-collapsed-strip');

    if (tabLayout) {
      if (segBar) segBar.style.display = '';
      if (mobZoom) {
        mobZoom.style.display = (this._activeTab === 'diagram') ? '' : 'none';
      }
      if (btnFs) btnFs.style.display = 'none';
      if (zoomCtrl) zoomCtrl.style.display = 'none';
      if (btnConnect) {
        btnConnect.style.display = this._isPhone() ? 'none' : '';
      }
      portsPanel?.classList.remove('ports-hidden', 'ports-collapsing');
      portsStrip?.classList.remove('is-visible');
      this.switchTab(this._activeTab);
    } else {
      if (segBar) segBar.style.display = 'none';
      if (mobZoom) mobZoom.style.display = 'none';
      if (btnConnect && !State.loading) btnConnect.style.display = '';
      if (btnFs && !State.loading) btnFs.style.display = '';
      if (zoomCtrl && !State.loading) zoomCtrl.style.display = '';
      portsPanel?.classList.remove('ports-collapsing');
      if (this._portsCollapsed) {
        portsPanel?.classList.add('ports-hidden');
        portsStrip?.classList.add('is-visible');
      } else {
        portsPanel?.classList.remove('ports-hidden');
        portsStrip?.classList.remove('is-visible');
      }
    }
  },

  /* ── MOBILE TAB SWITCHING ──────────────────────────── */
  switchTab(tab, segEl, navId) {
    if (!this._isTabLayout()) return;
    this._activeTab = tab;

    // Segment tabs — order: Diagram(0), Equipment(1), Ports(2)
    document.querySelectorAll('.seg-tab').forEach(t => t.classList.remove('active'));
    if (segEl) {
      segEl.classList.add('active');
    } else {
      const idx = { diagram: 0, equip: 1, ports: 2 }[tab];
      if (idx !== undefined) document.querySelectorAll('.seg-tab')[idx]?.classList.add('active');
    }

    // Panels (mobile: show only active)
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panelIds = { ports: 'panel-ports', equip: 'panel-equip', diagram: 'panel-diagram' };
    document.getElementById(panelIds[tab])?.classList.add('active');

    // Show mobile zoom bar only on diagram tab
    const mobZoom = document.getElementById('mobile-zoom-bar');
    if (mobZoom) mobZoom.style.display = (tab === 'diagram') ? '' : 'none';

    // Redraw diagram when switching to it (panel was display:none — needs layout + lines)
    if (tab === 'diagram') {
      this._refreshDiagramScroll();
      const redraw = () => {
        this._applyDiagramFitZoom();
        this._refreshDiagramScroll();
        Render.drawLines();
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(redraw);
      });
      setTimeout(redraw, 120);
      setTimeout(redraw, 350);
    }
  },

  /**
   * CSS zoom does not always expand scrollHeight on mobile/tablet WebKit.
   * Measure at zoom:1 and set the stage box so the scroll container can reach all content.
   */
  _syncDiagramScrollExtent(wrapId = 'diag-wrap') {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    const stage = wrap.parentElement?.classList?.contains('diag-zoom-stage')
      ? wrap.parentElement
      : null;
    const host  = stage || wrap;
    const inner = wrap.closest('.diag-scroll-inner');
    if (!inner) return;

    const z = this._zoom || 1;
    const prevZoom = wrap.style.zoom;
    wrap.style.zoom = '1';
    void wrap.offsetHeight;
    const baseH = wrap.offsetHeight;
    const baseW = wrap.offsetWidth;
    wrap.style.zoom = prevZoom || String(z);
    void wrap.offsetHeight;
    const laidOutH = wrap.offsetHeight;
    const laidOutW = wrap.offsetWidth;

    const extentH = Math.max(Math.ceil(baseH * z), laidOutH, baseH);
    const extentW = Math.max(Math.ceil(baseW * z), laidOutW, baseW);

    host.style.width     = `${extentW}px`;
    host.style.minHeight = `${extentH}px`;

    void inner.offsetHeight;
  },

  /** Recalculate diagram scroll area after tab/panel layout changes */
  _refreshDiagramScroll() {
    const scroll = document.getElementById('diag-scroll');
    const inner  = document.getElementById('diag-scroll-inner');
    const wrap   = document.getElementById('diag-wrap');
    if (!inner) return;
    if (scroll) void scroll.offsetHeight;
    if (wrap) this._syncDiagramScrollExtent('diag-wrap');
    void inner.offsetHeight;
    if (wrap) void wrap.offsetHeight;
  },

  /* ── DESKTOP: COLLAPSE/EXPAND PORTS PANEL ─────────── */
  togglePortsPanel() {
    this._portsCollapsed = !this._portsCollapsed;

    const panel = document.getElementById('panel-ports');
    const strip = document.getElementById('ports-collapsed-strip');
    const btn   = document.getElementById('collapse-ports-btn');
    if (!panel) return;

    if (this._portsCollapsed) {
      panel.classList.add('ports-collapsing');
      strip?.classList.add('is-visible');
      if (btn) {
        btn.textContent = '▶';
        btn.title = 'Expand ports panel';
      }
      if (strip) strip.title = 'Expand ports panel';

      panel.addEventListener('transitionend', () => {
        if (this._portsCollapsed) panel.classList.add('ports-hidden');
      }, { once: true });
    } else {
      panel.classList.remove('ports-hidden');
      strip?.classList.remove('is-visible');
      if (btn) {
        btn.textContent = '▶';
        btn.title = 'Collapse ports panel';
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.classList.remove('ports-collapsing');
        });
      });
    }

    setTimeout(() => Render.drawLines(), 380);
  },

  bindPortsPanelUI() {
    document.querySelectorAll('[data-action="toggle-ports-panel"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.togglePortsPanel();
      });
    });
  },

  /* ── ZOOM ──────────────────────────────────────────── */
  /** Horizontal fit for mobile/tablet — tall diagrams scroll vertically, not shrunk to 25% */
  _computeDiagramFitZoom(wrapId = 'diag-wrap') {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return DIAGRAM_ZOOM_DEFAULT;

    const scroll = wrap.closest('.diag-scroll') || document.getElementById('diag-scroll');
    const inner  = wrap.closest('.diag-scroll-inner') || scroll;
    const availW = (inner?.clientWidth || scroll?.clientWidth || 0) - 16;
    if (availW <= 0) {
      return this._isPhone() ? DIAGRAM_ZOOM_MOBILE : DIAGRAM_ZOOM_DEFAULT;
    }

    const prevZoom = wrap.style.zoom;
    wrap.style.zoom = '1';
    void wrap.offsetWidth;
    const naturalW = wrap.scrollWidth || wrap.offsetWidth;
    wrap.style.zoom = prevZoom || String(this._zoom || 1);

    if (!naturalW) {
      return this._isPhone() ? DIAGRAM_ZOOM_MOBILE : DIAGRAM_ZOOM_DEFAULT;
    }

    const scaleW = availW / naturalW;
    if (this._isPhone()) {
      if (naturalW * DIAGRAM_ZOOM_MOBILE <= availW) return DIAGRAM_ZOOM_MOBILE;
      return Math.max(0.25, Math.min(scaleW, 1));
    }

    let fit = scaleW;
    if (this._isTabLayout()) {
      fit = Math.max(DIAGRAM_ZOOM_TABLET_MIN, Math.min(fit, 1));
    } else {
      fit = Math.max(0.25, Math.min(fit, 1));
    }
    return fit;
  },

  _applyDiagramFitZoom(wrapId = 'diag-wrap') {
    if (!this._isTabLayout()) {
      this._applyZoom(DIAGRAM_ZOOM_DEFAULT);
      return;
    }
    this._applyZoom(this._computeDiagramFitZoom(wrapId));
  },

  _applyZoom(scale) {
    this._zoom = Math.max(DIAGRAM_ZOOM_MIN, Math.min(scale, DIAGRAM_ZOOM_MAX));

    // Use CSS `zoom` (not transform: scale) so layout space expands with the content,
    // allowing the scroll container to scroll to the full zoomed diagram.
    const wrapId = this._fsOpen ? 'diag-wrap-fs' : 'diag-wrap';
    const wrap   = document.getElementById(wrapId);
    if (wrap) {
      wrap.style.zoom      = this._zoom;
      wrap.style.transform = '';          // clear any leftover transform
    }

    // Sync all zoom % labels (desktop, mobile, fullscreen)
    const pct = Math.round(this._zoom * 100) + '%';
    document.querySelectorAll('.zoom-label').forEach(el => { el.textContent = pct; });

    // Redraw SVG lines — zoom is instant (no CSS transition), so a short delay
    // lets the browser reflow the zoomed layout before we measure positions.
    setTimeout(() => {
      if (!this._fsOpen) this._syncDiagramScrollExtent('diag-wrap');
      if (this._isTabLayout()) this._refreshDiagramScroll();
      if (this._fsOpen) Render.drawLinesIn('diag-wrap-fs', 'd-in-fs', 'd-eq-fs', 'd-out-fs');
      else              Render.drawLines();
    }, 60);
    if (this._isTabLayout()) {
      setTimeout(() => {
        this._syncDiagramScrollExtent('diag-wrap');
        Render.drawLines();
      }, 200);
    }
  },

  zoomIn()    { this._applyZoom(this._zoom + 0.15); },
  zoomOut()   { this._applyZoom(this._zoom - 0.15); },
  zoomReset() { this._applyZoom(1.0); },

  zoomFit() {
    this._applyDiagramFitZoom(this._fsOpen ? 'diag-wrap-fs' : 'diag-wrap');
  },

  _setFullscreenBtnText(text) {
    document.querySelectorAll('#btn-fullscreen, #btn-fullscreen-mob').forEach(btn => {
      btn.textContent = text;
    });
  },

  /* ── FULLSCREEN DIAGRAM ────────────────────────────── */
  openFullscreen() {
    if (this._fsOpen) return;

    const overlay = document.getElementById('fs-overlay');
    const fsBody  = document.getElementById('fs-body');
    const fsStn   = document.getElementById('fs-station');
    if (!overlay || !fsBody) return;

    if (fsStn && State.overview) {
      fsStn.textContent = `— ${State.overview.station_name}`;
    }

    fsBody.innerHTML = `
      <div class="diag-scroll-inner">
      <div class="diag-wrap" id="diag-wrap-fs" style="position:relative">
        <div class="d-col">
          <div class="d-col-hdr in">IN-FDMS</div>
          <div class="d-col-body" id="d-in-fs"></div>
        </div>
        <div class="d-wire-zone" style="position:relative">
          <svg style="position:absolute;top:0;left:0;width:100%;pointer-events:none;overflow:visible"></svg>
        </div>
        <div class="d-eq-col" id="d-eq-fs"></div>
        <div class="d-wire-zone" style="position:relative">
          <svg style="position:absolute;top:0;left:0;width:100%;pointer-events:none;overflow:visible"></svg>
        </div>
        <div class="d-col">
          <div class="d-col-hdr out">OUT-FDMS</div>
          <div class="d-col-body" id="d-out-fs"></div>
        </div>
      </div>
      </div>`;

    this._fsOpen = true;
    overlay.classList.add('show');
    document.body.classList.add('fs-active');
    this._setFullscreenBtnText('✕ Exit Fullscreen');

    Render.diagramInto('d-in-fs', 'd-eq-fs', 'd-out-fs');
    const fsWrap = document.getElementById('diag-wrap-fs');
    if (fsWrap) { fsWrap.style.zoom = 1; fsWrap.style.transform = ''; }

    setTimeout(() => {
      Render.drawLinesIn('diag-wrap-fs', 'd-in-fs', 'd-eq-fs', 'd-out-fs');
      this.zoomFit();
    }, 120);
  },

  closeFullscreen() {
    if (!this._fsOpen) return;

    const overlay = document.getElementById('fs-overlay');
    const fsBody  = document.getElementById('fs-body');

    this._fsOpen = false;
    overlay?.classList.remove('show');
    document.body.classList.remove('fs-active');
    if (fsBody) fsBody.innerHTML = '';
    this._setFullscreenBtnText('⛶ Fullscreen');

    this._applyZoom(this._zoom);
    setTimeout(() => Render.drawLines(), 100);
  },

  toggleFullscreen() {
    if (this._fsOpen) this.closeFullscreen();
    else              this.openFullscreen();
  },

  bindDiagramEqExpandUI() {
    if (this._diagramExpandBound) return;
    this._diagramExpandBound = true;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="diagram-eq-expand"]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const eqId = btn.getAttribute('data-eq-id');
      if (eqId) toggleDiagramEqExpanded(eqId);
    });
  },

  bindFullscreenUI() {
    document.querySelectorAll('[data-action="toggle-fullscreen"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleFullscreen();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._fsOpen) {
        e.preventDefault();
        this.closeFullscreen();
      }
    });
  },

  /* ── FAB (mobile) ──────────────────────────────────── */
  fabClick() {
    if (Connect.directConnect) return;
    if (Connect.state.active) Connect.cancel();
    else                       Connect.start();
  },

  /* ── BACK ──────────────────────────────────────────── */
  goBack() {
    if (window.FlutterBridge) FlutterBridge.postMessage('back');
    else                       history.back();
  },

  bindNavUI() {
    document.querySelectorAll('[data-action="go-back"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.goBack();
      });
    });
  },

  /* ── MOBILE SEGMENT TABS ───────────────────────────── */
  bindSegmentTabsUI() {
    const tabMap = ['diagram', 'equip', 'ports'];
    document.querySelectorAll('.seg-tab').forEach((tabEl, idx) => {
      const tab = tabMap[idx];
      if (!tab) return;

      tabEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.switchTab(tab, tabEl);
      });
    });
  },

  /** + / − / % / fit zoom controls (works without inline onclick) */
  bindZoomUI() {
    document.querySelectorAll('[data-action^="zoom-"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        switch (el.dataset.action) {
          case 'zoom-in':    this.zoomIn();    break;
          case 'zoom-out':   this.zoomOut();   break;
          case 'zoom-reset': this.zoomReset(); break;
          case 'zoom-fit':   this.zoomFit();   break;
        }
      });
    });
  },

  _stopSiteDataWatch() {
    if (this._siteInfoWatchId) {
      clearInterval(this._siteInfoWatchId);
      this._siteInfoWatchId = null;
    }
    if (this._siteInfoWatchTimeout) {
      clearTimeout(this._siteInfoWatchTimeout);
      this._siteInfoWatchTimeout = null;
    }
  },

  /** Poll until parent injects window.siteInfo / applySiteData (Fiberneo preview) */
  _startSiteDataWatch() {
    if (this._siteInfoWatchId) return;

    const tryLoad = () => {
      if (!this._awaitingSiteData) return;
      if (hasFacilityCableData() || getFacilityId()) {
        this._awaitingSiteData = false;
        this._stopSiteDataWatch();
        void this.load();
      }
    };

    this._siteInfoWatchId = setInterval(tryLoad, 50);
    tryLoad();

    if (!this._siteInfoWatchTimeout && !isFiberneoHostedView()) {
      this._siteInfoWatchTimeout = setTimeout(() => {
        if (!this._awaitingSiteData || hasFacilityCableData()) return;
        this._awaitingSiteData = false;
        this._stopSiteDataWatch();
        void this.load();
      }, 90000);
    }
  },

  /* ── INIT ──────────────────────────────────────────── */
  async applySiteData(data, facilityIdOrOpts) {
    const opts = typeof facilityIdOrOpts === 'object' && facilityIdOrOpts != null
      ? facilityIdOrOpts
      : (facilityIdOrOpts != null ? { facilityId: facilityIdOrOpts } : null);
    if (opts?.facilityId != null) setFacilityId(opts.facilityId);

    if (data != null) {
      const wrappedId = data.facilityId ?? data.facility_id;
      if (wrappedId != null) setFacilityId(wrappedId);

      const cablePayload = data.siteInfo ?? data.cableView ?? data.data ?? data;
      const isCableView = Array.isArray(cablePayload?.equipments)
        || (Array.isArray(cablePayload) && cablePayload.some((item) => item?.equipments));
      if (isCableView) {
        setFacilityCableData(cablePayload);
        if (window.siteInfoById?.id != null) setFacilityId(window.siteInfoById.id);
        else if (window.facilityId != null) setFacilityId(window.facilityId);
      } else {
        siteData = data;
        window.siteInfoById = data;
        if (data?.id != null) setFacilityId(data.id);
        const siteFields = ingestSiteFieldsFromObject(data);
        if (siteFields) setFacilitySiteFields(siteFields);
      }
    }
    return new Promise((resolve) => {
      whenRenderDomReady(async () => {
        try {
          App._stopSiteDataWatch();
          if (App._awaitingSiteData || hasFacilityCableData()) {
            App._awaitingSiteData = false;
            await App.load();
          } else {
            await App._applySiteDataImpl();
          }
        } finally {
          resolve();
        }
      });
    });
  },

  async _applySiteDataImpl() {
    const preview = overviewFromSiteData(getSiteData());
    if (preview) {
      State.overview = mergeOverview(State.overview, preview);
      Render.topbar();
      if (!State.loading) Render.portList();
    }
    if (!State.loading && hasFacilityCableData()) {
      Render.setLoader(true);
      try {
        await reloadEquipmentConnectivity({ bustCache: true });
        if (renderDomReady()) {
          Render.topbar();
          Render.stats();
          Render.equipList();
          Render.diagram();
          scheduleDiagramLinesRedraw();
        }
      } catch (e) {
        showToast('Failed to load cable view — ' + e.message);
      } finally {
        Render.setLoader(false);
      }
    }
  },

  init() {
    if (window.self !== window.top) {
      document.documentElement.classList.add('is-embed');
    }
    if (isFiberneoHostedView()) {
      document.documentElement.classList.add('is-hosted');
    }
    Theme.init();
    Connect.bindUI();
    Sheets.bindUI();
    bindEquipDetailPortFloatTips();
    this.bindNavUI();
    this.bindSegmentTabsUI();
    this.bindZoomUI();
    this.bindFullscreenUI();
    this.bindDiagramEqExpandUI();
    this.bindPortsPanelUI();

    if (window.siteInfoById?.id != null) setFacilityId(window.siteInfoById.id);
    if (window.facilityId != null) setFacilityId(window.facilityId);
    const urlFacilityId = _facilityIdFromUrl();
    if (urlFacilityId) setFacilityId(urlFacilityId);

    const early = overviewFromSiteData(getSiteData());
    if (early) {
      State.overview = early;
      if (early.station_id) setFacilityId(early.station_id);
      Render.topbar();
    }
    Render.setLoader(true);

    const needsParentData = !hasFacilityCableData() && !useMockApi();

    if (needsParentData) {
      /* Fiberneo preview injects siteInfo async — loader until applySiteData / window.siteInfo */
      this._awaitingSiteData = true;
      this._startSiteDataWatch();
      if (getFacilityId()) void this.load();
    } else {
      this.load();
    }

    this._wasTabLayout = this._isTabLayout();

    // Redraw SVG lines on window resize; swap layout mode when crossing breakpoint
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const nowTab = this._isTabLayout();
        if (this._wasTabLayout !== nowTab) {
          this._wasTabLayout = nowTab;
          this._applyLayoutMode();
        }
        if (this._fsOpen) Render.drawLinesIn('diag-wrap-fs', 'd-in-fs', 'd-eq-fs', 'd-out-fs');
        else if (nowTab && this._activeTab === 'diagram') {
          this._applyDiagramFitZoom();
          Render.drawLines();
        } else if (!nowTab) Render.drawLines();
      }, 120);
    });

    // Redraw lines when diagram scroll area moves (touch pan / wheel)
    const bindDiagramScroll = (el, drawFn) => {
      if (!el) return;
      let st;
      el.addEventListener('scroll', () => {
        clearTimeout(st);
        st = setTimeout(drawFn, 30);
      }, { passive: true });
    };
    bindDiagramScroll(document.getElementById('diag-scroll-inner'), () => Render.drawLines());

    if (typeof ResizeObserver !== 'undefined') {
      const diagViewport = document.getElementById('diag-scroll-inner') ||
        document.getElementById('diag-scroll');
      const diagWrap = document.getElementById('diag-wrap');
      const roDiagram = new ResizeObserver(() => {
        const showDiagram = !this._isTabLayout() || this._activeTab === 'diagram';
        if (!State.loading && State.overview && showDiagram) {
          clearTimeout(this._diagRoTimer);
          this._diagRoTimer = setTimeout(() => {
            this._syncDiagramScrollExtent('diag-wrap');
            Render.drawLines();
          }, 80);
        }
      });
      if (diagViewport) roDiagram.observe(diagViewport);
      if (diagWrap) roDiagram.observe(diagWrap);
    }

    // Redraw lines when fullscreen body is scrolled
    const fsBody = document.getElementById('fs-body');
    if (fsBody) {
      let fst;
      fsBody.addEventListener('scroll', () => {
        clearTimeout(fst);
        fst = setTimeout(() =>
          Render.drawLinesIn('diag-wrap-fs', 'd-in-fs', 'd-eq-fs', 'd-out-fs'), 30);
      }, { passive: true });
    }
  },
};

window.App = App;
window.getSiteData = getSiteData;
window.getFacilityId = getFacilityId;
window.setFacilityId = setFacilityId;
window.setFacilitySiteFields = setFacilitySiteFields;
window.refreshFacilityCableViewFromApi = refreshFacilityCableViewFromApi;
window.getFacilityCablePayload = getFacilityCablePayload;
window.hasFacilityCableData = hasFacilityCableData;
window.useFiberneoLive = useFiberneoLive;
window.applySiteData = (data, facilityId) => App.applySiteData(data, facilityId);
window.applyFacilityCableView = (facility) => App.applyFacilityCableView(facility);

function bootApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
}

bootApp();

/* Redraw diagram when preview iframe is resized (builder modal) */
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => {
    if (!State.loading && State.overview) {
      clearTimeout(bootApp._roTimer);
      bootApp._roTimer = setTimeout(() => Render.drawLines(), 80);
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('main-wrap');
    if (wrap) ro.observe(wrap);
  });
}

	