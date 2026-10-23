import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NetworkHierarchyTopology from '../components/topology/NetworkHierarchyTopology';
import SitesByGeography from '../components/location/SitesByGeography';
import { getLocStats, type CoverageCircle, type InvCardData, type Split } from '../data/locationStats';
import { SCOPED, dcSum, scope } from '../data/dc/scope';
import { isDatacenter, currentGeo, setGeo, withSolution, type DcGeo } from '../solution';
import LegacyView from '../legacy/LegacyView';
import '../styles/shell.css';
import '../styles/topology.css';

/* the Coverage-by-circle rows come from src/data/locationStats.ts: the estate's own in the default
   Inventory, the data centers' in the data center solution */

const STATE_ID_TO_CIRCLE: Record<string, string> = {
  punjab: 'PB',
  chandigarh: 'PB',
  jk: 'PB',
  haryana: 'HR',
  'up-west': 'UP',
  up: 'UP',
  'uttar-pradesh': 'UP',
  delhi: 'UP',
  uttarakhand: 'UK',
  himachal: 'HP',
  ladakh: 'HP',
  maharashtra: 'MH',
  gujarat: 'GJ',
  dnh: 'GJ',
  rajasthan: 'RJ',
  goa: 'GA',
  mp: 'MP',
  chhattisgarh: 'CG',
  'west-bengal': 'WB',
  bihar: 'BR',
  odisha: 'OR',
  jharkhand: 'JH',
  assam: 'AS',
  sikkim: 'SK',
  arunachal: 'AR',
  meghalaya: 'ML',
  nagaland: 'NL',
  manipur: 'MN',
  mizoram: 'MZ',
  tripura: 'TR',
  karnataka: 'KA',
  'tamil-nadu': 'TN',
  tamilnadu: 'TN',
  puducherry: 'TN',
  andaman: 'TN',
  telangana: 'TS',
  ap: 'AP',
  kerala: 'KL',
  lakshadweep: 'KL',
  // US states
  'us-virginia': 'US-VA',
  'us-texas': 'US-TX',
  'us-california': 'US-CA',
  'us-illinois': 'US-IL',
  'us-arizona': 'US-AZ',
  'us-georgia': 'US-GA',
  'us-new-jersey': 'US-NJ',
  'us-washington': 'US-WA',
  'us-oregon': 'US-OR',
  'us-colorado': 'US-CO',
  'us-ohio': 'US-OH',
  'us-florida': 'US-FL',
  'us-utah': 'US-UT',
  'us-north-carolina': 'US-NC'
};

const CIRCLE_TO_STATE_ID: Record<string, string> = {
  PB: 'punjab',
  HR: 'haryana',
  UP: 'up-west',
  UK: 'uttarakhand',
  HP: 'himachal',
  MH: 'maharashtra',
  GJ: 'gujarat',
  RJ: 'rajasthan',
  GA: 'goa',
  MP: 'mp',
  CG: 'chhattisgarh',
  WB: 'west-bengal',
  BR: 'bihar',
  OR: 'odisha',
  JH: 'jharkhand',
  AS: 'assam',
  SK: 'sikkim',
  AR: 'arunachal',
  ML: 'meghalaya',
  NL: 'nagaland',
  MN: 'manipur',
  MZ: 'mizoram',
  TR: 'tripura',
  KA: 'karnataka',
  TN: 'tamilnadu',
  TS: 'telangana',
  AP: 'ap',
  KL: 'kerala',
  // US circles (with or without US- prefix)
  'US-VA': 'us-virginia', VA: 'us-virginia',
  'US-TX': 'us-texas', TX: 'us-texas',
  'US-CA': 'us-california', CA: 'us-california',
  'US-IL': 'us-illinois', IL: 'us-illinois',
  'US-AZ': 'us-arizona', AZ: 'us-arizona',
  'US-GA': 'us-georgia',
  'US-NJ': 'us-new-jersey', NJ: 'us-new-jersey',
  'US-WA': 'us-washington', WA: 'us-washington',
  'US-OR': 'us-oregon',
  'US-CO': 'us-colorado', CO: 'us-colorado',
  'US-OH': 'us-ohio', OH: 'us-ohio',
  'US-FL': 'us-florida', FL: 'us-florida',
  'US-UT': 'us-utah', UT: 'us-utah',
  'US-NC': 'us-north-carolina', NC: 'us-north-carolina'
};

export default function Location() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const isDc = isDatacenter();
  const activeGeo: DcGeo = isDc ? currentGeo() : 'in';
  const S = React.useMemo(() => getLocStats(activeGeo), [activeGeo]);
  const COVERAGE_CIRCLES: CoverageCircle[] = S.circles;
  const [expandedCircle, setExpandedCircle] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);

  const siteParam = searchParams.get('site');
  React.useEffect(() => {
    const fromParam = searchParams.get('from');
    if (typeof sessionStorage !== 'undefined') {
      if (fromParam && fromParam.toLowerCase().includes('insight')) {
        sessionStorage.setItem('ns_dc_from_insights', 'true');
      } else if (!fromParam) {
        sessionStorage.removeItem('ns_dc_from_insights');
      }
    }
    if (siteParam) {
      const target = `/inventory/location/site/${encodeURIComponent(siteParam)}${fromParam ? `?from=${encodeURIComponent(fromParam)}` : ''}`;
      nav(withSolution(target), { replace: true });
    }
  }, [siteParam, searchParams, nav]);

  const isListView = searchParams.get('view') === 'list';

  if (isListView) {
    return <LegacyView legacyKey="location" />;
  }

  const handleCountryChange = (c: DcGeo | null) => {
    setGeo(c);
    const params = new URLSearchParams(searchParams);
    if (c) params.set('geo', c);
    else params.set('geo', isDc ? currentGeo() : 'in');
    params.delete('country');
    nav(withSolution(`/inventory/location?${params.toString()}`));
  };

  const handleCardClick = (type?: string, label?: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', 'list');
    if (activeGeo) {
      params.set('geo', activeGeo);
    }
    if (type) {
      params.set('type', type);
    }
    if (label) {
      params.set('drill', label);
    }
    nav(withSolution(`/inventory/location?${params.toString()}`));
  };

  const toggleCircle = (code: string) => {
    setExpandedCircle(c => c === code ? null : code);
  };

  return (
    <div className="page" style={{ padding: '16px 32px 24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Top 4 KPI Progress Cards ─────────────────────────────── */}
      <section className="vw-grid vw-grid-cols-4 vw-gap-md">
        <KpiCard label="Total locations" border="var(--vw-color-sky-200)" hover="var(--vw-color-sky-400)" tone="sky"
          onClick={() => handleCardClick(undefined, "All locations")}
          aria={`Total locations: ${en(S.all.total)} locations, ${en(S.all.live)} on-air`}
          sub={`${en(S.all.live)} on-air`}
          total={S.all.total}
          meter={[{ n: S.dc.total, color: "#a855f7", title: `Datacenters: ${en(S.dc.total)}` }, { n: S.pop.total, color: "#0284c7", title: `PoP locations: ${en(S.pop.total)}` }, { n: S.site.total, color: "#0d9488", title: `Sites: ${en(S.site.total)}` }]}
          legend={[{ color: "#a855f7", text: `${en(S.dc.total)} datacenters` }, { color: "#0284c7", text: `${en(S.pop.total)} pop locations` }, { color: "#0d9488", text: `${en(S.site.total)} sites` }]} />
        <SplitCard label="Datacenters" border="var(--vw-color-purple-200)" hover="var(--vw-color-purple-400)" tone="purple" split={S.dc} minFail
          onClick={() => handleCardClick("dc", "Datacenters — filtered list")} />
        <SplitCard label="PoP locations" border="var(--vw-color-sky-200)" hover="var(--vw-color-sky-400)" tone="sky" split={S.pop}
          onClick={() => handleCardClick("pop", "PoP locations — filtered list")} />
        <SplitCard label="Sites" border="var(--vw-color-teal-200)" hover="var(--vw-color-teal-400)" tone="teal" split={S.site}
          onClick={() => handleCardClick("site", "Sites — filtered list")} />
      </section>

      {/* ── Network Hierarchy (Full Width) ───────────────────────── */}
      <section className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid var(--vw-color-slate-200)' }}>
        <NetworkHierarchyTopology
          isExpanded={true}
          activeGeo={activeGeo}
          selectedStateId={selectedCircle ? CIRCLE_TO_STATE_ID[selectedCircle] : undefined}
          onSelectState={(stateId) => setSelectedCircle(STATE_ID_TO_CIRCLE[stateId] || null)}
          onNavigateToCity={(id: string, facility?: 'dc' | 'pop' | 'site') => {
            const fromParam = searchParams.get('from');
            nav(withSolution(`/inventory/location/city/${id}${facility ? `?facility=${facility}` : ''}${fromParam ? `${facility ? '&' : '?'}from=${encodeURIComponent(fromParam)}` : ''}`));
          }}
        />
      </section>

      {/* ── Coverage by circle ────────────────────────────────────── */}
      <section className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid var(--vw-color-slate-200)' }}>
        <div className="row vw-justify-between vw-items-start" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
                Coverage by circle
              </h3>
              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontWeight: 500 }}>
                {COVERAGE_CIRCLES.length} circles
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--vw-color-gray-500)' }}>
              ranked by total · click a circle for rollout detail
            </p>
          </div>
        </div>
        <CoverageTable circles={COVERAGE_CIRCLES} expandedCircle={expandedCircle} onToggleCircle={toggleCircle} />
      </section>

      {/* ── Inventory Across The Estate ──────────────────────────── */}
      <section className="vw-card-section" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid var(--vw-color-slate-200)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--vw-color-gray-900)' }}>
            Inventory across the estate
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--vw-color-gray-500)' }}>
            everything this module tracks against these locations — active, logical and passive
          </p>
        </div>

        <div className="vw-grid vw-grid-cols-3 vw-gap-md">
          <InvCard tone="sky" title="Active inventory" data={S.active} to="/inventory/physical" ariaSub="Physical elements across the estate" icon={INV_ICON_PATHS.active} />
          <InvCard tone="purple" title="Logical inventory" data={S.logical} to="/inventory/virtual" ariaSub="Virtual resources and services" icon={INV_ICON_PATHS.logical} />
          <InvCard tone="amber" title="Passive inventory" data={S.passive} to="/inventory/passive" ariaSub="Physical plant across 7 categories" icon={INV_ICON_PATHS.passive} />
        </div>
      </section>

      {/* ── Sites by geography Map Card ─────────────────────────── */}
      <SitesByGeography
        selectedCircle={selectedCircle}
        onSelectCircle={setSelectedCircle}
        activeCountry={activeGeo}
        onSelectCountry={handleCountryChange}
      />
    </div>
  );
}

/* ── KPI cards ──────────────────────────────────────────────────────────── */
const en = (n: number) => n.toLocaleString('en-US');
const pct2 = (n: number, of: number) => `${of > 0 ? ((n / of) * 100).toFixed(2) : '0.00'}%`;

function KpiCard({ label, border, hover, tone, onClick, aria, sub, total, meter, legend }: {
  label: string; border: string; hover: string; tone?: string; onClick: () => void; aria: string; sub: string; total: number;
  meter: { n: number; color: string; title: string; minWidth?: string }[]; legend: { color: string; text: string }[];
}) {
  const of = meter.reduce((a, m) => a + m.n, 0);
  return (
    <button type="button" className="kpi-progress is-clickable"
      data-tone={tone}
      style={{ borderColor: border, '--kpi-hover': hover, background: '#fff' } as React.CSSProperties}
      onClick={onClick} aria-label={aria}>
      <div className="vw-card-metric-label kprog-label">{label}</div>
      <div className="row vw-items-baseline" style={{ gap: '6px', marginTop: '2px' }}>
        <span className={`vw-card-metric-xl num${tone ? ` stat-v--${tone}` : ''}`} style={tone ? { color: `var(--vw-color-${tone}-700)` } : undefined}>{en(total)}</span>
        <span className="vw-card-metric-label-sub">locations</span>
      </div>
      <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{sub}</div>
      <div className="meter" style={{ height: '8px', marginTop: 'var(--vw-space-md)', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
        {meter.map(m => <span key={m.title} style={{ width: pct2(m.n, of), ...(m.minWidth ? { minWidth: m.minWidth } : {}), background: m.color }} title={m.title} />)}
      </div>
      <div className="legend" style={{ marginTop: 'var(--vw-space-sm)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {legend.map(l => <span key={l.text} className="legend-i"><span className="legend-sw" style={{ background: l.color }} />{l.text}</span>)}
      </div>
    </button>
  );
}

/* a location type split by rollout status: on-air, in progress, planned, failed */
function SplitCard({ label, border, hover, tone, split, onClick, minFail }: { label: string; border: string; hover: string; tone?: string; split: Split; onClick: () => void; minFail?: boolean }) {
  const on = split.total > 0 ? Math.round((split.live / split.total) * 100) : 0;
  return (
    <KpiCard label={label} border={border} hover={hover} tone={tone} onClick={onClick} total={split.total}
      aria={`${label}: ${en(split.total)} locations, ${on}% on-air · ${en(split.fail)} failed`}
      sub={`${on}% on-air · ${en(split.fail)} failed`}
      meter={[{ n: split.live, color: '#10b981', title: `On-air: ${en(split.live)}` }, { n: split.build, color: '#f59e0b', title: `In progress: ${en(split.build)}` },
        { n: split.plan, color: '#0ea5e9', title: `Planned: ${en(split.plan)}` }, { n: split.fail, color: '#ef4444', title: `Failed: ${en(split.fail)}`, ...(minFail ? { minWidth: '4px' } : {}) }]}
      legend={[{ color: '#10b981', text: `${en(split.live)} on-air` }, { color: '#f59e0b', text: `${en(split.build)} in progress` },
        { color: '#0ea5e9', text: `${en(split.plan)} planned` }, { color: '#ef4444', text: `${en(split.fail)} failed` }]} />
  );
}

/* the Active / Logical / Passive inventory cards */
const INV_ICON_PATHS = {
  active: <><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /></>,
  logical: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  passive: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>
};
function InvCard({ tone, title, data, to, ariaSub, icon }: { tone: 'sky' | 'purple' | 'amber'; title: string; data: InvCardData; to: string; ariaSub: string; icon: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="kpi-progress is-clickable" role="button" tabIndex={0} data-tone={tone}
      style={{ borderColor: `var(--vw-color-${tone}-200)`, '--kpi-hover': `var(--vw-color-${tone}-400)` } as React.CSSProperties}
      onClick={() => nav(to)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(to); } }}
      aria-label={`${title}: ${en(data.total)}. ${ariaSub}`}>
      <div className="row vw-gap-sm vw-items-center">
        <span className="cov-alert-icon" style={{ background: `var(--vw-color-${tone}-50)`, color: `var(--vw-color-${tone}-600)`, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="vw-card-metric-label">{title}</span>
          <span className={`vw-card-metric-xl num stat-v--${tone}`} style={{ color: `var(--vw-color-${tone}-700)` }}>{en(data.total)}</span>
        </div>
      </div>
      <div className="vw-card-metric-label-sub" style={{ marginTop: '8px' }}>{data.sub}</div>
      <div className="meter" style={{ height: '8px', marginTop: '12px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
        {data.segs.map(g => <span key={g.title} style={{ width: `${g.w}%`, background: g.color }} title={g.title} />)}
      </div>
      <div className="cov-chip-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {data.chips.map(c => (
          <button key={c.label} type="button" className="cov-chip inv-chip is-clickable"
            style={{ fontSize: '12px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            onClick={e => { e.stopPropagation(); nav(c.to); }} title={c.title}>
            {c.label} <b>{en(c.n)}</b>
          </button>
        ))}
      </div>
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

ALERT_ICONS.Facility = ALERT_ICONS['Power'];
ALERT_ICONS.Network = ALERT_ICONS['Fiber Connectivity'];
ALERT_ICONS.Security = ALERT_ICONS['Regulatory'];
ALERT_ICONS.Supplier = ALERT_ICONS['Supply Chain'];
ALERT_ICONS.Inventory = ALERT_ICONS['Commissioning'];

const ALERT_LABEL: Record<string, string> = {
  'Facility': 'Facility issue',
  'Network': 'Network issue',
  'Inventory': 'Inventory gap',
  'Security': 'Security issue',
  'Supplier': 'Supplier delay',
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

/* The data center solution's rollout detail, counted from its own records: statuses from the data centers
   of the circle, alerts and critical sites from their open risks (Datacenter-Ideation's `risks`),
   inventory from their device, rack and port counts. */
const RISK_SEV: Record<string, 'blocked' | 'delayed' | 'risk'> = { critical: 'blocked', major: 'delayed', minor: 'risk', warning: 'risk' };
const RISK_RANK: Record<string, number> = { critical: 0, major: 1, minor: 2, warning: 3 };
function getScopedRolloutDetails(c: CoverageCircle) {
  const ds = (c.dcIds ?? []).map(id => dcSum(id)!).filter(Boolean);
  const risks = (c.dcIds ?? []).flatMap(id => (scope().facOf(id)?.risks ?? []).map(r => ({ ...r, dc: id })));
  const live = ds.filter(d => d.status === 'on-air').length, build = ds.filter(d => d.status === 'in-progress').length;
  const plan = ds.filter(d => d.status === 'planned').length, failed = ds.filter(d => d.status === 'failed').length;
  const atRisk = ds.filter(d => d.status === 'on-air' && risks.some(r => r.dc === d.id && r.severity === 'critical')).length;
  const total = ds.length;
  const overview = { total, onAir: live - atRisk, pending: build + plan, blocked: failed, atRisk };
  const stages = [
    { k: 'Commissioned', c: live - atRisk, color: '#10b981' }, { k: 'Under Deployment', c: build, color: '#0284c7' }, { k: 'ATP Pending', c: 0, color: '#06b6d4' },
    { k: 'Integration Pending', c: plan, color: '#f59e0b' }, { k: 'Blocked', c: failed, color: '#ef4444' }
  ];
  const byDomain = new Map<string, typeof risks>();
  for (const r of risks) (byDomain.get(r.domain) ?? byDomain.set(r.domain, []).get(r.domain)!).push(r);
  const alerts = [...byDomain.entries()].map(([cat, rs]) => {
    const worst = [...rs].sort((a, b) => (RISK_RANK[a.severity] ?? 9) - (RISK_RANK[b.severity] ?? 9))[0];
    return { cat, count: rs.length, sev: RISK_SEV[worst.severity] ?? 'risk', topReason: worst.title };
  }).sort((a, b) => b.count - a.count);
  const critical = [...risks].sort((a, b) => (RISK_RANK[a.severity] ?? 9) - (RISK_RANK[b.severity] ?? 9)).slice(0, 8).map(r => ({
    id: r.dc, status: (r.severity === 'critical' ? 'Blocked' : r.severity === 'major' ? 'Delayed' : 'At Risk') as 'Blocked' | 'Delayed' | 'At Risk',
    tone: (r.severity === 'critical' ? 'red' : r.severity === 'major' ? 'amber' : 'sky') as 'red' | 'amber' | 'sky', cat: r.domain, reason: r.title, impact: r.detail
  }));
  const sum = (f: (d: typeof ds[number]) => number) => ds.reduce((a, d) => a + f(d), 0);
  const role = (r: string) => sum(d => (d.byRole as Record<string, number>)[r] ?? 0);
  const activeNe = sum(d => d.devices);
  const odf = ds.filter(d => d.odf.total > 0).length;
  const racks = sum(d => d.racks);
  return {
    overview, stages, stTotal: total || 1, alerts, critical,
    inventory: {
      active: activeNe, logicalTotal: 0, passiveTotal: odf + racks,
      ne: [['Routers', role('Router')], ['Switches', role('Switch')], ['Servers', role('Server')], ['Storage', role('Storage')], ['GPU servers', role('GPU')], ['DWDM', role('DWDM')]] as [string, number][],
      logical: [['LLDP', 0], ['OSPF', 0], ['BGP', 0], ['L3VPN', 0]] as [string, number][],
      passive: [['Fiber routes', 0], ['ODF ports', sum(d => d.odf.total)], ['Racks', racks], ['Splice closures', 0]] as [string, number][]
    }
  };
}

function getCircleRolloutDetails(c: CoverageCircle) {
  if (SCOPED && c.dcIds) return getScopedRolloutDetails(c);
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
    'PB': [
      { cat: 'Power', count: 5, sev: 'blocked', topReason: 'Substation connection fee dispute & rural grid stability' },
      { cat: 'Fiber Connectivity', count: 4, sev: 'delayed', topReason: 'Highway widening OFC diversion pending' },
      { cat: 'Regulatory', count: 3, sev: 'delayed', topReason: 'Cantonment board tower clearance pending' }
    ],
    'MH': [
      { cat: 'Power', count: 3, sev: 'blocked', topReason: 'Grid power supply delayed by local utility' },
      { cat: 'Lease / Property', count: 2, sev: 'blocked', topReason: 'Repeated landlord access restrictions' },
      { cat: 'Fiber Connectivity', count: 4, sev: 'delayed', topReason: 'Temporary fiber diversion in use' }
    ],
    'KA': [
      { cat: 'Fiber Connectivity', count: 2, sev: 'blocked', topReason: 'OFC backhaul cut due to road widening' },
      { cat: 'Power', count: 1, sev: 'blocked', topReason: 'Transformer capacity upgrade pending' },
      { cat: 'Supply Chain', count: 3, sev: 'delayed', topReason: 'Equipment delivery delayed by vendor' }
    ],
    'UP': [
      { cat: 'Power', count: 4, sev: 'blocked', topReason: 'Frequent rural grid outages requiring DG install' },
      { cat: 'Regulatory', count: 3, sev: 'blocked', topReason: 'Municipal corporation tower clearance pending' },
      { cat: 'Civil / Infrastructure', count: 3, sev: 'blocked', topReason: 'GBT foundation curing inspection hold' },
      { cat: 'Commissioning', count: 5, sev: 'delayed', topReason: 'ATP pending site acceptance sign-off' }
    ],
    'GJ': [
      { cat: 'Lease / Property', count: 1, sev: 'blocked', topReason: 'Commercial agreement renewal dispute' },
      { cat: 'Power', count: 2, sev: 'delayed', topReason: 'Battery backup below threshold' }
    ],
    'TN': [
      { cat: 'Power', count: 3, sev: 'blocked', topReason: 'Substation HT transformer failure at Core DC facility' },
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
    'PB': [
      { id: 'PB-LDH-019', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Substation connection fee dispute', impact: 'Equipment commissioning cannot begin without stable power' },
      { id: 'PB-ASR-044', status: 'Delayed', tone: 'amber', cat: 'Fiber Connectivity', reason: 'Highway widening OFC diversion pending', impact: 'Backhaul unavailable — site cannot carry live traffic' },
      { id: 'PB-CHD-008', status: 'At Risk', tone: 'sky', cat: 'Regulatory', reason: 'Cantonment clearance renewal pending', impact: 'Site held at final acceptance' }
    ],
    'MH': [
      { id: 'MH-MAC-113', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Grid power supply delayed by local utility', impact: 'Equipment commissioning cannot begin without stable power' },
      { id: 'MH-BOM-042', status: 'Delayed', tone: 'amber', cat: 'Fiber Connectivity', reason: 'Temporary fiber diversion in use', impact: 'Backhaul unavailable — site cannot carry live traffic' },
      { id: 'MH-PUN-089', status: 'At Risk', tone: 'sky', cat: 'Lease / Property', reason: 'Lease expires within 30 days', impact: 'Site inaccessible for deployment and maintenance activities' }
    ],
    'KA': [
      { id: 'KA-BGLK-277', status: 'Blocked', tone: 'red', cat: 'Fiber Connectivity', reason: 'OFC backhaul cut due to road widening', impact: 'Backhaul unavailable — site cannot carry live traffic' },
      { id: 'KA-BLR-104', status: 'Delayed', tone: 'amber', cat: 'Supply Chain', reason: 'Equipment delivery delayed by vendor', impact: 'Commissioning delayed pending equipment and vendor readiness' }
    ],
    'UP': [
      { id: 'DEL-279', status: 'Blocked', tone: 'red', cat: 'Regulatory', reason: 'Municipal corporation tower clearance pending', impact: 'Tower and equipment installation cannot proceed without clearance' },
      { id: 'UP-LKN-031', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Frequent rural grid outages requiring DG install', impact: 'Equipment commissioning cannot begin without stable power' },
      { id: 'UP-NOI-092', status: 'Delayed', tone: 'amber', cat: 'Commissioning', reason: 'ATP pending site acceptance sign-off', impact: 'Site held at final acceptance — traffic cutover is blocked' }
    ],
    'GJ': [
      { id: 'GJ-AHM-055', status: 'Blocked', tone: 'red', cat: 'Lease / Property', reason: 'Commercial agreement renewal dispute', impact: 'Site inaccessible for deployment and maintenance activities' },
      { id: 'GJ-SUR-112', status: 'At Risk', tone: 'sky', cat: 'Power', reason: 'Battery backup below threshold', impact: 'Potential service interruption if power grid drops' }
    ],
    'TN': [
      { id: 'CHE-DC-06', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Substation HT transformer failure & utility feeder fault', impact: 'Core Data Center on emergency DG backup — commissioning halted' },
      { id: 'CBE-DC-04', status: 'Blocked', tone: 'red', cat: 'Power', reason: 'Chiller plant HVAC dual compressor breakdown', impact: 'Equipment rack powering blocked pending thermal cooling resolution' },
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
    <div
      className="tbl-wrap"
      style={{
        maxHeight: '480px',
        overflowY: 'auto',
        borderRadius: '8px',
        border: '1px solid var(--vw-color-slate-200)',
        position: 'relative'
      }}
    >
      <table className="nst-table cov-table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}>
          <tr style={{ borderBottom: '1px solid var(--vw-color-slate-200)', color: 'var(--vw-color-gray-500)', textAlign: 'left', background: '#f8fafc' }}>
            <th style={{ width: '34%', padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid var(--vw-color-slate-200)' }}>Circle</th>
            <th className="t-right" style={{ width: '9%', padding: '10px 8px', textAlign: 'right', background: '#f8fafc', borderBottom: '1px solid var(--vw-color-slate-200)' }}>DC</th>
            <th className="t-right" style={{ width: '9%', padding: '10px 8px', textAlign: 'right', background: '#f8fafc', borderBottom: '1px solid var(--vw-color-slate-200)' }}>PoP</th>
            <th className="t-right" style={{ width: '10%', padding: '10px 8px', textAlign: 'right', background: '#f8fafc', borderBottom: '1px solid var(--vw-color-slate-200)' }}>Sites</th>
            <th className="t-right" style={{ width: '10%', padding: '10px 8px', textAlign: 'right', background: '#f8fafc', borderBottom: '1px solid var(--vw-color-slate-200)' }}>Total</th>
            <th style={{ width: '18%', padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid var(--vw-color-slate-200)' }}>On-air</th>
            <th className="t-right" style={{ width: '10%', padding: '10px 8px', textAlign: 'right', background: '#f8fafc', borderBottom: '1px solid var(--vw-color-slate-200)' }}>Failed</th>
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
                      <CoverageCircleDetail circle={c} onOpenSite={(siteId) => nav(withSolution(`/inventory/location/site/${siteId}`))} />
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
