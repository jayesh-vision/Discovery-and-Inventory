import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import '../styles/inventory-insights.css';
import {
  GOOD,
  WARN,
  CRIT,
  ACT,
  PAS,
  VIR,
  LOG,
  EOL_VENDORS,
  VERIFY_TREND,
  tagBg,
  tagFg
} from '../data/inventoryInsightsData';

import {
  DayRangeOption,
  DAY_RANGE_LABELS,
  TOTAL_RECORDS_DATA,
  PARENTS_DATA_DYNAMIC,
  ISSUES_DYNAMIC,
  BUCKET_SHARE_DATA,
  LIFECYCLE_DYNAMIC,
  VENDOR_MIX_DATA,
  PANELS_DATA_DYNAMIC,
  DECOM_DYNAMIC,
  DECOM_BUCKET_DYNAMIC,
  EOL_DYNAMIC,
  DRIFT_DYNAMIC,
  SPARES_DYNAMIC,
  NOT_RECONFIRMED_DYNAMIC,
  QUALITY_ROWS_DYNAMIC,
  BOTTOM_NAVIGATE_DYNAMIC,
  SITES_DYNAMIC,
  SERVICES_DYNAMIC,
  NET_RECORD_DYNAMIC,
  TREND_SERIES,
  ACTIVITY_BY_RANGE
} from '../data/inventoryInsightsDynamic';

export type { DayRangeOption };
export { DAY_RANGE_LABELS };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildInsightsCsv(range: DayRangeOption): string {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const rangeName = DAY_RANGE_LABELS[range];
  const rows: (string | number)[][] = [];

  const addSection = (title: string) => {
    rows.push([]);
    rows.push([`=== ${title} ===`]);
  };

  // 1. Report Metadata
  rows.push(['Report', 'Inventory Insights & Executive Summary']);
  rows.push(['Generated At', `${timestamp} IST`]);
  rows.push(['Time Window', rangeName]);
  rows.push(['Monitored Locations', `${TOTAL_RECORDS_DATA[range].sitesCount} sites`]);
  rows.push(['Managed Elements', TOTAL_RECORDS_DATA[range].managedElements]);

  // 2. High-Level Summary
  addSection('OVERVIEW & OVERALL METRICS');
  rows.push(['Metric', 'Count / Value', 'Benchmark / Health', 'Status']);
  rows.push(['Total Inventory Records', TOTAL_RECORDS_DATA[range].totalDisplay, `${TOTAL_RECORDS_DATA[range].delta} ${TOTAL_RECORDS_DATA[range].period}`, 'Active']);
  rows.push([
    'Physical Inventory',
    PARENTS_DATA_DYNAMIC[range][0].count,
    `${PARENTS_DATA_DYNAMIC[range][0].health} Health (${PARENTS_DATA_DYNAMIC[range][0].delta})`,
    `Active (${PARENTS_DATA_DYNAMIC[range][0].children[0].count}) + Passive (${PARENTS_DATA_DYNAMIC[range][0].children[1].count})`
  ]);
  rows.push([
    'Connectivity Inventory',
    PARENTS_DATA_DYNAMIC[range][1].count,
    `${PARENTS_DATA_DYNAMIC[range][1].health} Health (${PARENTS_DATA_DYNAMIC[range][1].delta})`,
    `Virtual (${PARENTS_DATA_DYNAMIC[range][1].children[0].count}) + Connectivity (${PARENTS_DATA_DYNAMIC[range][1].children[1].count})`
  ]);
  rows.push(['Overall Inventory Health', TOTAL_RECORDS_DATA[range].health, 'Target: >= 95%', 'Good']);
  rows.push(['Confirmed Against Source', TOTAL_RECORDS_DATA[range].confirmed, 'Target: >= 90%', 'Compliant']);
  rows.push(['Stranded / Unconfirmed Records', `${TOTAL_RECORDS_DATA[range].strandedVal} (${TOTAL_RECORDS_DATA[range].stranded})`, 'Under remediation', 'Warning']);
  rows.push(['Open Inventory Issues', ISSUES_DYNAMIC[range].count, `${ISSUES_DYNAMIC[range].crit} Crit, ${ISSUES_DYNAMIC[range].high} High, ${ISSUES_DYNAMIC[range].med} Med, ${ISSUES_DYNAMIC[range].low} Low`, 'Needs Attention']);

  // 3. Inventory Buckets (What Exists)
  addSection('INVENTORY BUCKET COMPOSITION (WHAT EXISTS)');
  rows.push(['Bucket', 'Category', 'Total Records', 'Discovered / Verified Coverage', 'Critical Issues', 'High Issues']);
  const bShare = BUCKET_SHARE_DATA[range].rows;
  const pData = PARENTS_DATA_DYNAMIC[range];
  rows.push(['Active', 'Physical', bShare[0][1], `${pData[0].children[0].coverage} Discovered`, pData[0].children[0].critical, pData[0].children[0].high]);
  rows.push(['Passive', 'Physical', bShare[1][1], `${pData[0].children[1].coverage} Survey verified`, pData[0].children[1].critical, pData[0].children[1].high]);
  rows.push(['Connectivity', 'Connectivity', bShare[2][1], `${pData[1].children[1].coverage} ${pData[1].children[1].covLabel}`, pData[1].children[1].critical, pData[1].children[1].high]);
  rows.push(['Virtual', 'Connectivity', bShare[3][1], `${pData[1].children[0].coverage} Mapped to host`, pData[1].children[0].critical, pData[1].children[0].high]);

  // 4. Component Hierarchy Detail
  addSection('COMPONENT HIERARCHY DETAIL');
  rows.push(['Bucket', 'Component / Element Type', 'Record Count']);
  PANELS_DATA_DYNAMIC[range].forEach(panel => {
    panel.items.forEach(item => {
      rows.push([panel.title, item.name, item.count]);
    });
  });

  // 5. Lifecycle Distribution
  addSection('ASSET LIFECYCLE DISTRIBUTION');
  rows.push(['Lifecycle State', 'Count', 'Share (%)', 'Operational Context']);
  LIFECYCLE_DYNAMIC[range].bars.forEach(lb => {
    rows.push([lb.name, lb.count, lb.pct, 'Operational lifecycle distribution']);
  });

  // 6. Vendor Mix
  addSection('VENDOR MIX (ACTIVE EQUIPMENT)');
  rows.push(['Vendor', 'Share (%)', 'Active NEs Basis']);
  VENDOR_MIX_DATA[range].rows.forEach(v => {
    rows.push([v[0], `${v[1]}%`, `${VENDOR_MIX_DATA[range].activeNEs} active NEs`]);
  });

  // 7. Net Record Change & Trend
  addSection(`NET RECORD CHANGE TREND (${rangeName.toUpperCase()})`);
  rows.push(['Period Window', 'Added', 'Retired', 'Net Change']);
  const s = NET_RECORD_DYNAMIC[range];
  rows.push([rangeName, s.added, s.retired, s.net]);
  rows.push([]);
  rows.push(['Time Interval', 'Change Volume']);
  const win = TREND_SERIES[range];
  win.forEach(([label, val]) => {
    rows.push([label, val]);
  });

  // 8. Decommission & Disposal Pipeline
  addSection(`DECOMMISSION & DISPOSAL PIPELINE (${DECOM_DYNAMIC[range].periodLabel.toUpperCase()})`);
  rows.push(['Stage', 'Asset Count', 'Status']);
  rows.push(['Marked decommissioned', DECOM_DYNAMIC[range].marked, 'Approved for decommissioning']);
  rows.push(['Still live in discovery', DECOM_DYNAMIC[range].live, 'Removal pending — active in network']);
  rows.push(['Confirmed removed', DECOM_DYNAMIC[range].confirmed, 'Site verified and purged']);

  // 9. Recent Activity
  addSection(`RECENT INVENTORY ACTIVITY (${rangeName.toUpperCase()})`);
  rows.push(['Type', 'Action / Description', 'Actor / Source', 'Timestamp']);
  ACTIVITY_BY_RANGE[range].forEach(act => {
    rows.push([act[0], act[1], act[2], act[3]]);
  });

  // 10. Sites Needing Attention
  addSection('SITES NEEDING ATTENTION');
  rows.push(['Site ID', 'Region', 'Site Type', 'Active Elements', 'Passive Assets', 'Health (%)', 'Issues Count', 'Status']);
  SITES_DYNAMIC[range].forEach(site => {
    rows.push([site.name, site.region, site.kind, site.active, site.passive, site.health, site.issues, site.status]);
  });

  // 11. Data Quality by Bucket
  addSection('DATA QUALITY BY BUCKET');
  rows.push(['Bucket', 'Completeness', 'Uniqueness', 'Validity', 'Stale Rate', 'Orphan Rate']);
  QUALITY_ROWS_DYNAMIC[range].forEach(q => {
    rows.push([q.name, q.v1, q.v2, q.v3, q.v4, q.v5]);
  });

  // 12. EOL / EOS Hardware
  addSection('EOL / EOS HARDWARE & SOFTWARE EXPOSURE');
  rows.push(['Bucket', 'Active In-Service', 'Vendor Share %']);
  EOL_DYNAMIC[range].rows.forEach(e => {
    rows.push([e[0], e[1], e[2].join(' / ')]);
  });

  // 13. OS Drift
  addSection('OPERATING SYSTEM DRIFT & FIRMWARE VULNERABILITY');
  rows.push(['Vendor', 'Off-Baseline Devices']);
  DRIFT_DYNAMIC[range].rows.forEach(d => {
    rows.push([d[0], d[1]]);
  });

  // 14. Spares Coverage
  addSection('CRITICAL SPARES COVERAGE RATIO');
  rows.push(['Card / Sub-assembly Family', 'In-service Population', 'Depot Spares', 'Coverage Ratio (%)', 'Status']);
  SPARES_DYNAMIC[range].rows.forEach(sp => {
    const ratio = ((sp[2] / sp[1]) * 100).toFixed(1);
    const status = (sp[2] / sp[1]) < 0.01 ? 'Critical Shortage' : 'Sub-optimal';
    rows.push([sp[0], sp[1], sp[2], `${ratio}%`, status]);
  });

  return '\uFEFF' + rows.map(r => r.map(cell => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',')).join('\r\n');
}

function buildInsightsJson(range: DayRangeOption): string {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    report: 'Inventory Insights',
    generatedAt: timestamp,
    selectedTimeWindow: DAY_RANGE_LABELS[range],
    metrics: {
      totalRecords: TOTAL_RECORDS_DATA[range].totalDisplay,
      totalRecordsRaw: TOTAL_RECORDS_DATA[range].totalRaw,
      delta: TOTAL_RECORDS_DATA[range].delta,
      period: TOTAL_RECORDS_DATA[range].period,
      health: TOTAL_RECORDS_DATA[range].health,
      confirmed: TOTAL_RECORDS_DATA[range].confirmed,
      stranded: TOTAL_RECORDS_DATA[range].stranded,
      strandedCount: TOTAL_RECORDS_DATA[range].strandedVal,
      openIssues: ISSUES_DYNAMIC[range].count
    },
    decommissionPipeline: DECOM_DYNAMIC[range],
    netChange: {
      ...NET_RECORD_DYNAMIC[range],
      trend: TREND_SERIES[range]
    },
    activity: ACTIVITY_BY_RANGE[range],
    buckets: BUCKET_SHARE_DATA[range].rows.map(r => ({
      name: r[0],
      count: r[1],
      rawCount: r[2]
    })),
    lifecycle: LIFECYCLE_DYNAMIC[range],
    vendorMix: VENDOR_MIX_DATA[range],
    panels: PANELS_DATA_DYNAMIC[range],
    qualityGaps: QUALITY_ROWS_DYNAMIC[range],
    eolExposure: EOL_DYNAMIC[range],
    osDrift: DRIFT_DYNAMIC[range],
    sparesCoverage: SPARES_DYNAMIC[range],
    sitesNeedingAttention: SITES_DYNAMIC[range],
    services: SERVICES_DYNAMIC[range]
  }, null, 2);
}

const LOGICAL_CONNECTIVITY_META: Record<string, { layer: string; protocol: string; underlying: string; note: string }> = {
  '4G / 5G radio cells & sector carriers': {
    layer: 'Radio Access Network (3GPP RAN)',
    protocol: '5G NR / 4G LTE Carrier Aggregation & Sector Cells',
    underlying: 'gNodeB DU/CU, eNodeB Basebands & Antennas',
    note: 'Software-defined cells mapped to physical sector antennas, baseband channel cards, and tracking areas.'
  },
  'SRv6 & SR-MPLS policy tunnels (LSPs)': {
    layer: 'IP/MPLS & Segment Routing Transport',
    protocol: 'SRv6, SR-MPLS, RSVP-TE, LDP & TI-LFA Fast Reroute',
    underlying: 'Cell-Site Routers (CSR), Metro Aggregation & Core PEs',
    note: 'Traffic-engineered transport tunnels providing deterministic QoS and low-latency backhaul paths.'
  },
  'L3VPN VRFs & 5G network slices': {
    layer: 'Layer 3 VPN & Multi-Tenant Slicing',
    protocol: 'MP-BGP, 5G S-NSSAI Network Slices, VRF-Lite',
    underlying: 'PE Routers, Core Gateways & Telco Cloud UPFs',
    note: 'Isolated routing domains for enterprise customers, IMS voice, and 5G network slice tenants.'
  },
  'EVPN-VPWS & E-Line / E-LAN services': {
    layer: 'Carrier Ethernet & Metro Layer 2',
    protocol: 'BGP EVPN (RFC 7432), VPWS, VPLS, QinQ S-VLAN',
    underlying: 'Carrier Ethernet Switches, Metro Aggregation Nodes',
    note: 'Point-to-point (E-Line) and multipoint (E-LAN) layer 2 circuits over packet transport.'
  },
  'Optical channels & OTN trails (DWDM/OCh)': {
    layer: 'Photonic & Coherent Optical Transport',
    protocol: 'ITU-T G.709 OTN, ODU4 / ODU2e, 100G–400G Coherent OCh',
    underlying: 'DWDM ROADMs, Transponders & Coherent Pluggables',
    note: 'End-to-end optical wavelength paths carrying packet client signals over physical fibre spans.'
  },
  'BGP peering & routing adjacency sessions': {
    layer: 'Routing Protocols & Peering Fabric',
    protocol: 'eBGP, iBGP Route Reflectors, BFD Fast-Convergence',
    underlying: 'Internet Gateways, Peering Routers & Core Spine',
    note: 'Logical routing control plane sessions between autonomous systems and internal network fabrics.'
  },
  'IP subnets & interface address pools': {
    layer: 'IP Address Management (IPAM)',
    protocol: 'IPv4 / IPv6 Subnet Allocation, Loopbacks, /31 P2P',
    underlying: 'Router Loopback0s, Point-to-Point Interfaces, SVIs',
    note: 'Logical IP prefixes mapped to physical router interfaces, sub-interfaces, and subscriber pools.'
  },
  'Broadband subscriber sessions (PPPoE/PON)': {
    layer: 'Fixed Access & Broadband Core',
    protocol: 'PPPoE, IPoE, GPON GEM Ports, T-CONT Alloc-IDs',
    underlying: 'Broadband Network Gateways (BNG) & GPON OLTs',
    note: 'Logical subscriber access sessions terminating residential and enterprise FTTH connectivity.'
  }
};

export default function InventoryInsights() {
  const navigate = useNavigate();

  // ── State & Filters ──
  const [dayRange, setDayRange] = useState<DayRangeOption>('30d');
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chart Hover & Tooltip State ──
  const [tooltip, setTooltip] = useState<{
    title: string;
    badge?: string | number;
    badgeColor?: string;
    dotColor?: string;
    rows?: Array<{ label: string; value: string }>;
    note?: string;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);
  const [hoveredVendor, setHoveredVendor] = useState<string | null>(null);
  const [hoveredLifecycle, setHoveredLifecycle] = useState<string | null>(null);
  const [hoveredPanelItemKey, setHoveredPanelItemKey] = useState<string | null>(null);

  const showTip = (payload: {
    title: string;
    badge?: string | number;
    badgeColor?: string;
    dotColor?: string;
    rows?: Array<{ label: string; value: string }>;
    note?: string;
  }, e: React.MouseEvent) => {
    setTooltip({ ...payload, x: e.clientX, y: e.clientY });
  };

  const moveTip = (e: React.MouseEvent) => {
    setTooltip(prev => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  };

  const hideTip = () => {
    setTooltip(null);
  };

  const say = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 4200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Close export dropdown on outside click or Escape
  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportOpen]);

  const resetFilters = () => {
    setDayRange('30d');
  };

  const filtersActive = dayRange !== '30d';
  const filterSummary = `Time period: ${DAY_RANGE_LABELS[dayRange]}`;

  const handleExportCsv = () => {
    setExportOpen(false);
    const csv = buildInsightsCsv(dayRange);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `inventory_insights_${dayRange}_${dateStr}.csv`;
    downloadBlob(blob, filename);
    say(`Export complete: ${filename} downloaded successfully (${DAY_RANGE_LABELS[dayRange]})`);
  };

  const handleExportJson = () => {
    setExportOpen(false);
    const json = buildInsightsJson(dayRange);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `inventory_insights_${dayRange}_${dateStr}.json`;
    downloadBlob(blob, filename);
    say(`Export complete: ${filename} downloaded successfully (${DAY_RANGE_LABELS[dayRange]})`);
  };

  const handlePrint = () => {
    setExportOpen(false);
    say('Opening print preview for Inventory Insights…');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // ── Donut Calculations ──
  const circ = 2 * Math.PI * 40;

  const bucketShare = useMemo(() => {
    const raw = BUCKET_SHARE_DATA[dayRange].rows;
    const total = raw.reduce((t, b) => t + b[2], 0);
    let acc = 0;
    return raw.map(b => {
      const pct = (b[2] / total) * 100;
      const len = (pct / 100) * circ;
      const obj = {
        name: b[0],
        count: b[1],
        pctLabel: `${pct.toFixed(1)}%`,
        color: b[3],
        dash: `${len.toFixed(2)} ${circ.toFixed(2)}`,
        offset: (-acc).toFixed(2)
      };
      acc += len;
      return obj;
    });
  }, [circ, dayRange]);

  const vendorMix = useMemo(() => {
    const raw = VENDOR_MIX_DATA[dayRange].rows;
    let acc = 0;
    return raw.map(v => {
      const len = (v[1] / 100) * circ;
      const out = {
        name: v[0],
        pctLabel: `${v[1]}%`,
        color: v[2],
        dash: `${len.toFixed(2)} ${circ.toFixed(2)}`,
        offset: (-acc).toFixed(2)
      };
      acc += len;
      return out;
    });
  }, [circ, dayRange]);

  // ── Decommission by Bucket ──
  const decomByBucket = useMemo(() => {
    const raw = DECOM_BUCKET_DYNAMIC[dayRange];
    const maxVal = Math.max(...raw.map(d => d[1]), 1);
    const bkc: Record<string, string> = { Active: ACT, Passive: PAS, Logical: LOG, Connectivity: LOG, Virtual: VIR };
    return raw.map(d => ({
      name: d[0],
      count: d[1],
      w: `${Math.round((d[1] / maxVal) * 100)}%`,
      color: bkc[d[0]] || ACT
    }));
  }, [dayRange]);

  // ── EOL / EOS Rows ──
  const eolRows = useMemo(() => {
    const raw = EOL_DYNAMIC[dayRange].rows;
    const maxVal = Math.max(...raw.map(r => r[1]), 1);
    return raw.map(r => ({
      name: r[0],
      count: r[1].toLocaleString('en-IN'),
      w: `${Math.round((r[1] / maxVal) * 100)}%`,
      segs: r[2]
        .map((p, i) => {
          const ven = EOL_VENDORS[i];
          return {
            w: `${p}%`,
            color: ven.color
          };
        })
        .filter(s => s.w !== '0%')
    }));
  }, [dayRange]);

  // ── Drift Rows ──
  const driftRows = useMemo(() => {
    const raw = DRIFT_DYNAMIC[dayRange].rows;
    const maxVal = Math.max(...raw.map(d => d[1]), 1);
    return raw.map(d => ({
      name: d[0],
      count: d[1],
      w: `${Math.round((d[1] / maxVal) * 100)}%`
    }));
  }, [dayRange]);

  // ── Spares Risk Table ──
  const sparesList = useMemo(() => {
    return SPARES_DYNAMIC[dayRange].rows.map(s => {
      const r = (s[2] / s[1]) * 100;
      return {
        model: s[0],
        deployed: s[1].toLocaleString('en-IN'),
        spares: `${s[2]}${s[2] === 1 ? ' spare' : ' spares'}`,
        ratio: `${r.toFixed(1)}%`,
        color: r < 1 ? CRIT : WARN
      };
    });
  }, [dayRange]);

  // ── Sites Needing Attention ──
  const sitesList = useMemo(() => {
    return SITES_DYNAMIC[dayRange];
  }, [dayRange]);

  // ── Services ──
  const servicesList = useMemo(() => {
    return SERVICES_DYNAMIC[dayRange].rows;
  }, [dayRange]);

  // ── Activity ──
  const activityList = useMemo(() => {
    const items = ACTIVITY_BY_RANGE[dayRange] || ACTIVITY_BY_RANGE['30d'];
    return items.map(e => ({
      tag: e[0],
      what: e[1],
      who: e[2],
      when: e[3],
      tagBg: tagBg(e[0]),
      tagFg: tagFg(e[0])
    }));
  }, [dayRange]);

  return (
    <div className="ii-container">
      <main id="top" className="ii-main">
        {/* ── Top Bar Controls ── */}
        <header className="ii-header">
          <div className="ii-controls">
            <select
              aria-label="Time period"
              value={dayRange}
              onChange={e => setDayRange(e.target.value as DayRangeOption)}
              className="ii-select"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
            </select>

            <div className="ii-export-wrap" ref={exportRef}>
              <button
                type="button"
                onClick={handleExportCsv}
                className="ii-btn-primary"
                title="Export Inventory Insights as CSV"
                style={{ borderRadius: '8px 0 0 8px', borderRight: '1px solid rgba(255,255,255,0.25)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={() => setExportOpen(v => !v)}
                className="ii-btn-primary"
                aria-label="Export options"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                style={{ borderRadius: '0 8px 8px 0', padding: '0 9px' }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: exportOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {exportOpen && (
                <div className="ii-export-dropdown" role="menu">
                  <button
                    type="button"
                    className="ii-export-item"
                    onClick={handleExportCsv}
                    role="menuitem"
                  >
                    <span className="ii-export-ext">CSV</span>
                    <div className="ii-export-col">
                      <span className="ii-export-name">CSV Spreadsheet (.csv)</span>
                      <span className="ii-export-desc">Full snapshot of inventory records & quality gaps</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="ii-export-item"
                    onClick={handleExportJson}
                    role="menuitem"
                  >
                    <span className="ii-export-ext">JSON</span>
                    <div className="ii-export-col">
                      <span className="ii-export-name">JSON Data (.json)</span>
                      <span className="ii-export-desc">Structured machine-readable inventory payload</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="ii-export-item"
                    onClick={handlePrint}
                    role="menuitem"
                  >
                    <span className="ii-export-ext">PRINT</span>
                    <div className="ii-export-col">
                      <span className="ii-export-name">Print / Save as PDF</span>
                      <span className="ii-export-desc">Formatted browser print view</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Active Filters Notification Banner ── */}
        {filtersActive && (
          <div className="ii-filter-banner">
            <span style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>Active Filter:</span>
            <span style={{ color: 'var(--ii-text-body)' }}>{filterSummary}</span>
            <span style={{ color: 'var(--ii-text-muted)' }}>
              · all metrics, change trends, and activity logs reflect this window; inventory base counts are network-wide
            </span>
            <button type="button" onClick={resetFilters} className="ii-btn-reset">
              Reset to 30 days
            </button>
          </div>
        )}

        {/* ── Tier 1: Key Metrics (4 cards) ── */}
        <section aria-label="Key metrics" className="ii-kpi-grid">
          {/* Tile 1: Light blue summary KPI tile */}
          <div className="ii-card-blue">
            <span style={{ fontSize: 12, color: '#1E40AF', fontWeight: 600, letterSpacing: '0.01em' }}>
              Total inventory records
            </span>
            <div className="ii-metric-huge" style={{ fontSize: 24, fontWeight: 500, color: 'var(--ii-text-heading)', letterSpacing: '-0.02em' }}>
              {TOTAL_RECORDS_DATA[dayRange].totalDisplay}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ background: '#DCFCE7', color: '#15803D', fontWeight: 600, padding: '1px 6px', borderRadius: 4, border: '1px solid #BBF7D0' }}>
                {TOTAL_RECORDS_DATA[dayRange].delta}
              </span>
              <span>
                {TOTAL_RECORDS_DATA[dayRange].period} · {TOTAL_RECORDS_DATA[dayRange].sitesCount} sites · {TOTAL_RECORDS_DATA[dayRange].managedElements} managed elements
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #DBEAFE', paddingTop: 8, marginTop: 2 }}>
              <span style={{ color: 'var(--ii-text-muted)' }}>Overall inventory health</span>
              <span className="ii-mono" style={{ fontWeight: 600, color: '#15803D' }}>{TOTAL_RECORDS_DATA[dayRange].health}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ii-text-muted)' }}>Confirmed against source</span>
              <span className="ii-mono" style={{ fontWeight: 600, color: 'var(--ii-text-heading)' }}>{TOTAL_RECORDS_DATA[dayRange].confirmed}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ii-text-muted)' }}>Stranded or unconfirmed</span>
              <span className="ii-mono" style={{ fontWeight: 600, color: '#B45309' }}>{TOTAL_RECORDS_DATA[dayRange].stranded} · {TOTAL_RECORDS_DATA[dayRange].strandedVal}</span>
            </div>
          </div>

          {/* Tile 2 & 3: Physical & Logical Category KPI cards */}
          {PARENTS_DATA_DYNAMIC[dayRange].map(p => (
            <div key={p.name} className="ii-card" style={{ gap: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13.5, color: 'var(--ii-text-heading)', fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--ii-text-muted)' }}>{p.desc}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="ii-mono" style={{ fontSize: 24, fontWeight: 500, color: 'var(--ii-text-heading)', letterSpacing: '-0.02em' }}>
                  {p.count}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ii-text-muted)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--ii-text-body)' }}>{p.delta}</span> · {p.health} health
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid var(--ii-border-light)', paddingTop: 8 }}>
                {p.children.map(k => (
                  <div
                    key={k.name}
                    style={{ borderLeft: `2.5px solid ${k.color}`, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      showTip({
                        title: `${k.name} Coverage & Health`,
                        dotColor: k.color,
                        badge: k.health,
                        rows: [
                          { label: 'Category volume', value: k.count },
                          { label: k.covLabel, value: k.coverage },
                          { label: 'Open defects', value: `${k.critical} critical · ${k.high} high` }
                        ],
                        note: k.scope
                      }, e);
                    }}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{k.name}</span>
                      <span style={{ fontSize: 10.5, padding: '1.5px 6px', borderRadius: 999, background: 'var(--ii-bg-subtle)', color: 'var(--ii-text-body)', border: '1px solid var(--ii-border)', fontWeight: 500 }}>
                        {k.health}
                      </span>
                    </div>
                    <div className="ii-mono" style={{ fontSize: 17, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{k.count}</div>
                    <div style={{ fontSize: 11, color: 'var(--ii-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k.scope}>
                      {k.scope}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ii-text-muted)' }}>
                      <span>{k.covLabel}</span>
                      <span className="ii-mono" style={{ color: 'var(--ii-text-body)' }}>{k.coverage}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--ii-border-light)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: k.coverage, background: k.color }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>
                      {k.critical} crit · {k.high} high
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tile 4: Open inventory issues */}
          <div className="ii-card" style={{ gap: 6, padding: '14px 16px' }}>
            <span style={{ fontSize: 12, color: 'var(--ii-text-heading)', fontWeight: 500 }}>Open inventory issues</span>
            <div className="ii-mono" style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ii-text-heading)' }}>{ISSUES_DYNAMIC[dayRange].count}</div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)' }}>
              <span style={{ fontWeight: 500, color: 'var(--ii-text-body)' }}>{ISSUES_DYNAMIC[dayRange].change}</span> · {ISSUES_DYNAMIC[dayRange].periodLabel}
            </div>
            {(() => {
              const iss = ISSUES_DYNAMIC[dayRange];
              const tot = Math.max(iss.crit + iss.high + iss.med + iss.low, 1);
              return (
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginTop: 2 }}>
                  <div
                    className="ii-severity-seg"
                    style={{ width: `${((iss.crit / tot) * 100).toFixed(1)}%`, background: 'var(--ii-danger)' }}
                    onMouseEnter={(e) => {
                      showTip({
                        title: 'Critical Open Issues',
                        dotColor: 'var(--ii-danger)',
                        badge: `${iss.crit}`,
                        rows: [
                          { label: 'Count', value: `${iss.crit} defects` },
                          { label: 'Backlog share', value: `${((iss.crit / tot) * 100).toFixed(1)}%` },
                          { label: 'Median resolution', value: `${iss.medianDays} days` }
                        ],
                        note: 'Immediate risk to network availability, redundant link loss, or customer traffic.'
                      }, e);
                    }}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                  <div
                    className="ii-severity-seg"
                    style={{ width: `${((iss.high / tot) * 100).toFixed(1)}%`, background: 'var(--ii-warning)' }}
                    onMouseEnter={(e) => {
                      showTip({
                        title: 'High Severity Issues',
                        dotColor: 'var(--ii-warning)',
                        badge: `${iss.high}`,
                        rows: [
                          { label: 'Count', value: `${iss.high} defects` },
                          { label: 'Backlog share', value: `${((iss.high / tot) * 100).toFixed(1)}%` }
                        ],
                        note: 'High impact: unmapped topology link, missing card slot, or unconfirmed route.'
                      }, e);
                    }}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                  <div
                    className="ii-severity-seg"
                    style={{ width: `${((iss.med / tot) * 100).toFixed(1)}%`, background: 'var(--ii-primary)' }}
                    onMouseEnter={(e) => {
                      showTip({
                        title: 'Medium Severity Issues',
                        dotColor: 'var(--ii-primary)',
                        badge: `${iss.med}`,
                        rows: [
                          { label: 'Count', value: `${iss.med} defects` },
                          { label: 'Backlog share', value: `${((iss.med / tot) * 100).toFixed(1)}%` }
                        ],
                        note: 'Medium impact: version drift or missing administrative attributes.'
                      }, e);
                    }}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                  <div
                    className="ii-severity-seg"
                    style={{ width: `${((iss.low / tot) * 100).toFixed(1)}%`, background: 'var(--ii-text-faint)' }}
                    onMouseEnter={(e) => {
                      showTip({
                        title: 'Low Severity Issues',
                        dotColor: 'var(--ii-text-faint)',
                        badge: `${iss.low}`,
                        rows: [
                          { label: 'Count', value: `${iss.low} defects` },
                          { label: 'Backlog share', value: `${((iss.low / tot) * 100).toFixed(1)}%` }
                        ],
                        note: 'Low impact: non-critical naming conventions or minor catalog gaps.'
                      }, e);
                    }}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                </div>
              );
            })()}
            <div style={{ fontSize: 11, color: 'var(--ii-text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span><span style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{ISSUES_DYNAMIC[dayRange].crit}</span> crit</span>
              <span><span style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{ISSUES_DYNAMIC[dayRange].high}</span> high</span>
              <span><span style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{ISSUES_DYNAMIC[dayRange].med}</span> med</span>
              <span><span style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{ISSUES_DYNAMIC[dayRange].low}</span> low</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>Median age {ISSUES_DYNAMIC[dayRange].medianDays} days · {ISSUES_DYNAMIC[dayRange].assigned} assigned</div>
          </div>
        </section>

        {/* ── What exists ── */}
        <div className="ii-section-eyebrow">What exists</div>

        {/* Row 1: Donut & Lifecycle Panels */}
        <section aria-label="Composition" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          {/* Donut 1: Inventory by bucket */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Inventory by bucket</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="116" height="116" viewBox="0 0 100 100" role="img" aria-label="Bucket share donut">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ii-border-light, #f1f5f9)" strokeWidth="14" pointerEvents="none" />
                <g transform="rotate(-90 50 50)">
                  {bucketShare.map(b => {
                    const isHov = hoveredBucket === b.name;
                    const isDimmed = hoveredBucket !== null && !isHov;
                    return (
                      <circle
                        key={b.name}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={b.color}
                        strokeWidth={isHov ? 16 : 14}
                        strokeDasharray={b.dash}
                        strokeDashoffset={b.offset}
                        className={`ii-donut-segment ${isHov ? 'is-active' : ''}`}
                        style={{
                          opacity: isDimmed ? 0.35 : 1,
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          setHoveredBucket(b.name);
                          showTip({
                            title: `${b.name} Inventory`,
                            dotColor: b.color,
                            badge: b.pctLabel,
                            rows: [
                              { label: 'Domain', value: b.name === 'Active' || b.name === 'Passive' ? 'Physical Layer' : 'Connectivity Layer' },
                              { label: 'Total count', value: b.count },
                              { label: 'Share of total', value: b.pctLabel }
                            ],
                            note: b.name === 'Active'
                              ? 'Physical routers, switches, RAN, optical nodes & hardware components.'
                              : b.name === 'Passive'
                              ? 'OSP/ISP plant: fibre spans, ducts, closures, ODFs & towers.'
                              : b.name === 'Virtual'
                              ? 'VNFs and CNFs deployed across Telco Cloud Kubernetes & NFVI.'
                              : 'End-to-end transport paths: SRv6/MPLS tunnels, L3VPN VRFs, EVPN E-Line/E-LAN, radio cells, and optical DWDM wavelengths.'
                          }, e);
                        }}
                        onMouseMove={moveTip}
                        onMouseLeave={() => {
                          setHoveredBucket(null);
                          hideTip();
                        }}
                      />
                    );
                  })}
                </g>
                {(() => {
                  const actB = bucketShare.find(b => b.name === hoveredBucket);
                  return (
                    <g className="ii-donut-center-group" pointerEvents="none">
                      <text x="50" y="47" textAnchor="middle" style={{ fontFamily: 'var(--ii-font-mono, ui-monospace, monospace)', fontSize: actB ? 11 : 12, fontWeight: 500, fill: 'var(--ii-text-heading, #1e293b)' }}>
                        {actB ? actB.count : BUCKET_SHARE_DATA[dayRange].centerLabel}
                      </text>
                      <text x="50" y="60" textAnchor="middle" style={{ fontFamily: 'var(--ii-font-sans, Inter, sans-serif)', fontSize: 7, fill: 'var(--ii-text-muted, #64748b)' }}>
                        {actB ? `${actB.pctLabel} ${actB.name}` : 'records'}
                      </text>
                    </g>
                  );
                })()}
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
                {bucketShare.map(b => (
                  <div
                    key={b.name}
                    className={`ii-donut-legend-row ${hoveredBucket === b.name ? 'is-active' : ''}`}
                    onMouseEnter={(e) => {
                      setHoveredBucket(b.name);
                      showTip({
                        title: `${b.name} Inventory`,
                        dotColor: b.color,
                        badge: b.pctLabel,
                        rows: [
                          { label: 'Domain', value: b.name === 'Active' || b.name === 'Passive' ? 'Physical Layer' : 'Connectivity Layer' },
                          { label: 'Total count', value: b.count },
                          { label: 'Share of total', value: b.pctLabel }
                        ],
                        note: b.name === 'Active'
                          ? 'Physical routers, switches, RAN, optical nodes & hardware components.'
                          : b.name === 'Passive'
                          ? 'OSP/ISP plant: fibre spans, ducts, closures, ODFs & towers.'
                          : b.name === 'Virtual'
                          ? 'VNFs and CNFs deployed across Telco Cloud Kubernetes & NFVI.'
                          : 'End-to-end transport paths: SRv6/MPLS tunnels, L3VPN VRFs, EVPN E-Line/E-LAN, radio cells, and optical DWDM wavelengths.'
                      }, e);
                    }}
                    onMouseMove={moveTip}
                    onMouseLeave={() => {
                      setHoveredBucket(null);
                      hideTip();
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                    <span style={{ flexGrow: 1, color: 'var(--ii-text-body)' }}>{b.name}</span>
                    <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{b.count}</span>
                    <span className="ii-mono" style={{ color: 'var(--ii-text-muted, #64748b)', width: 36, textAlign: 'right' }}>{b.pctLabel}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted, #64748b)' }}>
              {BUCKET_SHARE_DATA[dayRange].summaryText}
            </div>
          </div>

          {/* Panel 2: Lifecycle */}
          <div className="ii-card" style={{ gap: 12 }}>
            <div className="ii-card-title">Lifecycle</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
              {LIFECYCLE_DYNAMIC[dayRange].states.map(l => (
                <div
                  key={l.name}
                  className={`ii-lifecycle-card ${hoveredLifecycle === l.name ? 'is-active' : ''}`}
                  onMouseEnter={(e) => {
                    setHoveredLifecycle(l.name);
                    showTip({
                      title: `${l.name} State`,
                      dotColor: l.color,
                      badge: l.count,
                      rows: [
                        { label: 'Volume', value: `${l.count} assets` },
                        { label: 'Lifecycle phase', value: l.name }
                      ],
                      note: l.name === 'Faulty'
                        ? LIFECYCLE_DYNAMIC[dayRange].faultsNote
                        : l.name === 'Planned'
                        ? LIFECYCLE_DYNAMIC[dayRange].leadTimeNote
                        : 'Tracked continuously across active discovery and manual work orders.'
                    }, e);
                  }}
                  onMouseMove={moveTip}
                  onMouseLeave={() => {
                    setHoveredLifecycle(null);
                    hideTip();
                  }}
                >
                  <div style={{ height: 4, borderRadius: 2, background: l.color }} />
                  <div className="ii-mono" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{l.count}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ii-text-muted, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
              {LIFECYCLE_DYNAMIC[dayRange].bars.map(l => (
                <div
                  key={l.name}
                  className={`ii-lifecycle-seg ${hoveredLifecycle === l.name ? 'is-active' : ''}`}
                  style={{ width: l.w, background: l.color }}
                  onMouseEnter={(e) => {
                    setHoveredLifecycle(l.name);
                    showTip({
                      title: `${l.name} State`,
                      dotColor: l.color,
                      badge: l.pct,
                      rows: [
                        { label: 'Asset count', value: l.count },
                        { label: 'Fleet proportion', value: l.pct }
                      ],
                      note: l.name === 'Faulty'
                        ? LIFECYCLE_DYNAMIC[dayRange].faultsNote
                        : l.name === 'Planned'
                        ? LIFECYCLE_DYNAMIC[dayRange].leadTimeNote
                        : 'Network element status synchronized via EMS / NMS telemetry.'
                    }, e);
                  }}
                  onMouseMove={moveTip}
                  onMouseLeave={() => {
                    setHoveredLifecycle(null);
                    hideTip();
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted, #64748b)' }}>
              {LIFECYCLE_DYNAMIC[dayRange].faultsNote}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted, #64748b)' }}>
              {LIFECYCLE_DYNAMIC[dayRange].leadTimeNote}
            </div>
          </div>

          {/* Donut 3: Vendor mix (active equipment) */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Vendor mix (active equipment)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="116" height="116" viewBox="0 0 100 100" role="img" aria-label="Vendor share donut">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ii-border-light, #f1f5f9)" strokeWidth="14" pointerEvents="none" />
                <g transform="rotate(-90 50 50)">
                  {vendorMix.map(v => {
                    const isHov = hoveredVendor === v.name;
                    const isDimmed = hoveredVendor !== null && !isHov;
                    return (
                      <circle
                        key={v.name}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={v.color}
                        strokeWidth={isHov ? 16 : 14}
                        strokeDasharray={v.dash}
                        strokeDashoffset={v.offset}
                        className={`ii-donut-segment ${isHov ? 'is-active' : ''}`}
                        style={{
                          opacity: isDimmed ? 0.35 : 1,
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          setHoveredVendor(v.name);
                          showTip({
                            title: `${v.name} Hardware`,
                            dotColor: v.color,
                            badge: v.pctLabel,
                            rows: [
                              { label: 'Vendor share', value: v.pctLabel },
                              { label: 'Catalogued models', value: `${VENDOR_MIX_DATA[dayRange].models} models` },
                              { label: 'Active NE baseline', value: 'Approved manufacturer' }
                            ],
                            note: 'Vendor mix calculated across managed physical and virtual network elements.'
                          }, e);
                        }}
                        onMouseMove={moveTip}
                        onMouseLeave={() => {
                          setHoveredVendor(null);
                          hideTip();
                        }}
                      />
                    );
                  })}
                </g>
                {(() => {
                  const actV = vendorMix.find(v => v.name === hoveredVendor);
                  return (
                    <g className="ii-donut-center-group" pointerEvents="none">
                      <text x="50" y="47" textAnchor="middle" style={{ fontFamily: 'var(--ii-font-mono, ui-monospace, monospace)', fontSize: actV ? 14 : 12, fontWeight: 500, fill: 'var(--ii-text-heading, #1e293b)' }}>
                        {actV ? actV.pctLabel : VENDOR_MIX_DATA[dayRange].activeNEs}
                      </text>
                      <text x="50" y="60" textAnchor="middle" style={{ fontFamily: 'var(--ii-font-sans, Inter, sans-serif)', fontSize: 7, fill: 'var(--ii-text-muted, #64748b)' }}>
                        {actV ? actV.name : 'active NEs'}
                      </text>
                    </g>
                  );
                })()}
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexGrow: 1 }}>
                {vendorMix.map(v => (
                  <div
                    key={v.name}
                    className={`ii-donut-legend-row ${hoveredVendor === v.name ? 'is-active' : ''}`}
                    onMouseEnter={(e) => {
                      setHoveredVendor(v.name);
                      showTip({
                        title: `${v.name} Hardware`,
                        dotColor: v.color,
                        badge: v.pctLabel,
                        rows: [
                          { label: 'Vendor share', value: v.pctLabel },
                          { label: 'Catalogued models', value: `${VENDOR_MIX_DATA[dayRange].models} models` },
                          { label: 'Active NE baseline', value: 'Approved manufacturer' }
                        ],
                        note: 'Vendor mix calculated across managed physical and virtual network elements.'
                      }, e);
                    }}
                    onMouseMove={moveTip}
                    onMouseLeave={() => {
                      setHoveredVendor(null);
                      hideTip();
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: v.color, flexShrink: 0 }} />
                    <span style={{ flexGrow: 1, color: 'var(--ii-text-body)' }}>{v.name}</span>
                    <span className="ii-mono" style={{ color: 'var(--ii-text-muted)' }}>{v.pctLabel}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--ii-border-light)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ii-text-muted)' }}>Vendor models catalogued</span>
                <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{VENDOR_MIX_DATA[dayRange].models}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ii-text-muted)' }}>Unknown / unmapped models</span>
                <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{VENDOR_MIX_DATA[dayRange].unmapped}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Row 2 of What exists: The 4 Detailed Inventory Panels */}
        <section aria-label="Inventory by type" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          {PANELS_DATA_DYNAMIC[dayRange].map(p => (
            <div key={p.title} className="ii-card" style={{ gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                <div style={{ fontWeight: 500, fontSize: 13.5, flexGrow: 1, color: 'var(--ii-text-heading)' }}>{p.title}</div>
                <button type="button" onClick={() => navigate(p.route)} className="ii-link-btn">
                  Open
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ii-text-muted)', marginTop: -6 }}>{p.desc}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.items.map(t => {
                  const itemKey = `${p.title}-${t.name}`;
                  const isHov = hoveredPanelItemKey === itemKey;
                  const meta = LOGICAL_CONNECTIVITY_META[t.name];
                  return (
                    <div
                      key={t.name}
                      className={`ii-panel-bar-row ${isHov ? 'is-active' : ''}`}
                      onMouseEnter={(e) => {
                        setHoveredPanelItemKey(itemKey);
                        showTip({
                          title: t.name,
                          dotColor: p.color,
                          badge: t.count,
                          rows: meta ? [
                            { label: 'Network layer', value: meta.layer },
                            { label: 'Protocols & standards', value: meta.protocol },
                            { label: 'Underlying assets', value: meta.underlying },
                            { label: 'Configured instances', value: `${t.count} active` },
                            { label: 'Category proportion', value: t.w }
                          ] : [
                            { label: 'Category', value: p.title },
                            { label: 'Installed units', value: `${t.count} items` },
                            { label: 'Category proportion', value: t.w }
                          ],
                          note: meta ? meta.note : p.desc
                        }, e);
                      }}
                      onMouseMove={moveTip}
                      onMouseLeave={() => {
                        setHoveredPanelItemKey(null);
                        hideTip();
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ii-text-body)' }}>
                          {t.name}
                        </span>
                        <span className="ii-mono" style={{ flexShrink: 0, color: 'var(--ii-text-muted)' }}>{t.count}</span>
                      </div>
                      <div className="ii-panel-bar-track">
                        <div className="ii-panel-bar-fill" style={{ width: t.w, background: p.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: '1px solid var(--ii-border-light)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                {p.facts.map(f => (
                  <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: 'var(--ii-text-muted)' }}>{f.name}</span>
                    <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── Needs action now ── */}
        <div className="ii-section-eyebrow">Needs action now</div>

        <section aria-label="Decommissioning, end-of-life and software drift" style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: 16 }}>
          {/* Decommission pipeline */}
          <div className="ii-card" style={{ gap: 12 }}>
            <div className="ii-card-title">Decommission &amp; disposal pipeline</div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)', marginTop: -6 }}>{DECOM_DYNAMIC[dayRange].periodLabel}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr 14px 1fr', gap: 6, alignItems: 'center' }}>
              <div
                style={{ background: 'var(--ii-bg-subtle)', border: '1px solid var(--ii-border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) => showTip({
                  title: 'Marked Decommissioned',
                  badge: DECOM_DYNAMIC[dayRange].marked,
                  rows: [
                    { label: 'Pipeline state', value: 'Phase 1: Staged for removal' },
                    { label: 'Queued records', value: `${DECOM_DYNAMIC[dayRange].marked} elements` }
                  ],
                  note: 'Service deprovisioned; work orders dispatched for physical decoupling.'
                }, e)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              >
                <div className="ii-mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{DECOM_DYNAMIC[dayRange].marked}</div>
                <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>Marked decommissioned</div>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--ii-text-faint)' }}>→</div>
              <div
                style={{ background: 'var(--ii-bg-subtle)', border: '1px solid var(--ii-border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) => showTip({
                  title: 'Still Live in Discovery',
                  badge: DECOM_DYNAMIC[dayRange].live,
                  badgeColor: 'var(--ii-warning)',
                  rows: [
                    { label: 'Pipeline state', value: 'Phase 2: Ghost presence' },
                    { label: 'Active in EMS', value: `${DECOM_DYNAMIC[dayRange].live} elements` }
                  ],
                  note: 'Power/links remain connected in field despite formal decommissioning.'
                }, e)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              >
                <div className="ii-mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{DECOM_DYNAMIC[dayRange].live}</div>
                <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>Still live in discovery — removal pending</div>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--ii-text-faint)' }}>→</div>
              <div
                style={{ background: 'var(--ii-bg-subtle)', border: '1px solid var(--ii-border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) => showTip({
                  title: 'Confirmed Removed',
                  badge: DECOM_DYNAMIC[dayRange].confirmed,
                  badgeColor: 'var(--ii-success)',
                  rows: [
                    { label: 'Pipeline state', value: 'Phase 3: Fully retired' },
                    { label: 'Recovered hardware', value: `${DECOM_DYNAMIC[dayRange].confirmed} elements` }
                  ],
                  note: 'Verified absent in network and decommission records archived.'
                }, e)}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              >
                <div className="ii-mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{DECOM_DYNAMIC[dayRange].confirmed}</div>
                <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>Confirmed removed</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)' }}>Decommissions by bucket</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 14px' }}>
              {decomByBucket.map(d => (
                <div
                  key={d.name}
                  className="ii-panel-bar-row"
                  onMouseEnter={(e) => showTip({
                    title: `${d.name} Decommissions`,
                    dotColor: d.color,
                    badge: `${d.count}`,
                    rows: [
                      { label: 'Bucket', value: d.name },
                      { label: 'Decommission count', value: `${d.count} elements` },
                      { label: 'Relative pipeline share', value: d.w }
                    ],
                    note: 'Decommission volume tracked during current analysis window.'
                  }, e)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ii-text-body)' }}>{d.name}</span>
                    <span className="ii-mono" style={{ color: 'var(--ii-text-muted)' }}>{d.count}</span>
                  </div>
                  <div className="ii-panel-bar-track">
                    <div className="ii-panel-bar-fill" style={{ width: d.w, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="ii-note-box">
              {DECOM_DYNAMIC[dayRange].note}
            </div>
          </div>

          {/* EOL/EOS exposure */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">EOL/EOS exposure — {EOL_DYNAMIC[dayRange].total} assets, by bucket and vendor</div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)', marginTop: -4 }}>
              Each bar is a leaf bucket (Active and Passive under Physical; Virtual and Connectivity under Connectivity); the colour split shows whose hardware is behind it.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
              {eolRows.map(r => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 48px', gap: 10, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ textAlign: 'right', color: 'var(--ii-text-body)' }}>{r.name}</span>
                  <div style={{ width: r.w, height: 12, display: 'flex', gap: 1, borderRadius: 3, overflow: 'hidden' }}>
                    {r.segs.map((s, idx) => (
                      <div
                        key={idx}
                        className="ii-eol-seg"
                        style={{ width: s.w, background: s.color }}
                        onMouseEnter={(e) => showTip({
                          title: `${r.name} · ${EOL_VENDORS[idx]?.name || 'Vendor'}`,
                          dotColor: s.color,
                          badge: s.w,
                          rows: [
                            { label: 'Category', value: r.name },
                            { label: 'Vendor proportion', value: s.w },
                            { label: 'Category total exposed', value: r.count }
                          ],
                          note: 'Hardware models reaching vendor End-of-Life / End-of-Support milestone.'
                        }, e)}
                        onMouseMove={moveTip}
                        onMouseLeave={hideTip}
                      />
                    ))}
                  </div>
                  <span className="ii-mono" style={{ color: 'var(--ii-text-muted)' }}>{r.count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--ii-text-body)', marginTop: 2 }}>
              {EOL_VENDORS.map(v => (
                <span
                  key={v.name}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                  onMouseEnter={(e) => showTip({
                    title: `${v.name} Lifecycle Exposure`,
                    dotColor: v.color,
                    rows: [
                      { label: 'Vendor', value: v.name },
                      { label: 'Lifecycle status', value: 'Active EOL milestones catalogued' }
                    ],
                    note: 'Filtered across vendor hardware platforms.'
                  }, e)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: v.color }} />
                  {v.name}
                </span>
              ))}
            </div>
            <div className="ii-note-box">
              {EOL_DYNAMIC[dayRange].note}
            </div>
          </div>

          {/* OS / firmware drift */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">OS / firmware drift — {DRIFT_DYNAMIC[dayRange].total} off baseline</div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)', marginTop: -4 }}>
              {DRIFT_DYNAMIC[dayRange].total} of the {DRIFT_DYNAMIC[dayRange].activeWithVersion} active elements with a recorded version are off the approved baseline; the drift below is by vendor. Version coverage is tracked separately beneath.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
              {driftRows.map(d => (
                <div
                  key={d.name}
                  className="ii-drift-row"
                  onMouseEnter={(e) => showTip({
                    title: `${d.name} Firmware Drift`,
                    badge: d.w,
                    rows: [
                      { label: 'Vendor', value: d.name },
                      { label: 'Off-baseline elements', value: `${d.count} units` },
                      { label: 'Proportion of total drift', value: d.w }
                    ],
                    note: 'Active OS build differs from network architecture golden baseline.'
                  }, e)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  <span style={{ textAlign: 'right', color: 'var(--ii-text-body)' }}>{d.name}</span>
                  <div style={{ height: 12, borderRadius: 3, background: 'var(--ii-border-light)', overflow: 'hidden' }}>
                    <div className="ii-drift-bar-fill" style={{ height: '100%', width: d.w, background: 'var(--ii-border-hover)', transition: 'background-color 0.2s ease, width 0.3s ease' }} />
                  </div>
                  <span className="ii-mono" style={{ color: 'var(--ii-text-muted)' }}>{d.count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, borderTop: '1px solid var(--ii-border-light)', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ii-text-muted)' }}>Of the {DRIFT_DYNAMIC[dayRange].total}: on a version with published CVEs</span>
                <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{DRIFT_DYNAMIC[dayRange].cve}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ii-text-muted)' }}>Outside the {DRIFT_DYNAMIC[dayRange].total}: no version recorded (of {TOTAL_RECORDS_DATA[dayRange].managedElements} active)</span>
                <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{DRIFT_DYNAMIC[dayRange].noVersion}</span>
              </div>
            </div>
            <div className="ii-note-box">
              {DRIFT_DYNAMIC[dayRange].note}
            </div>
          </div>
        </section>

        {/* Row 2 of Tier 2: Spares Risk & Not Reconfirmed */}
        <section aria-label="Spares and staleness" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Spares coverage risk */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Spares coverage risk — {SPARES_DYNAMIC[dayRange].titleCount} models below safe threshold</div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)', marginTop: -4 }}>
              Heavily deployed models holding under 2% spares against deployed count.
            </div>
            <div className="ii-table-wrap">
              <table className="ii-table">
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th>Model</th>
                    <th style={{ textAlign: 'right' }}>Deployed</th>
                    <th style={{ textAlign: 'right' }}>Spares</th>
                    <th style={{ textAlign: 'right' }}>Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {sparesList.map(s => (
                    <tr
                      key={s.model}
                      className="ii-spares-row"
                      onMouseEnter={(e) => showTip({
                        title: s.model,
                        dotColor: s.color,
                        badge: s.ratio,
                        rows: [
                          { label: 'Deployed in network', value: s.deployed },
                          { label: 'Spares in stock', value: s.spares },
                          { label: 'Coverage ratio', value: s.ratio },
                          { label: 'Safe threshold', value: '≥ 2.0%' }
                        ],
                        note: s.color === CRIT
                          ? 'Critical spare parts shortage (< 1.0% buffer). Immediate order required.'
                          : 'Below recommended 2% buffer threshold. Review warehouse lead time.'
                      }, e)}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}
                    >
                      <td style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{s.model}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', color: 'var(--ii-text-muted)' }}>{s.deployed}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 500, color: 'var(--ii-text-heading)' }}>{s.spares}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 500, color: s.color }}>{s.ratio}</td>
                    </tr>
                  ))}
                  {sparesList.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '14px 8px', color: 'var(--ii-text-muted)', textAlign: 'center' }}>
                        No at-risk models for this vendor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="ii-note-box">
              {SPARES_DYNAMIC[dayRange].note}
            </div>
          </div>

          {/* Not reconfirmed */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">{NOT_RECONFIRMED_DYNAMIC[dayRange].title}</div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)', marginTop: -4 }}>
              Records not reconfirmed by their source within SLA — discovery for Active, NFVO for Virtual, mapping for Connectivity, survey for Passive.
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="ii-mono" style={{ fontSize: 24, fontWeight: 500, color: 'var(--ii-text-heading)', letterSpacing: '-0.02em' }}>{NOT_RECONFIRMED_DYNAMIC[dayRange].count}</span>
              <span style={{ fontSize: 12, color: 'var(--ii-text-muted)', fontWeight: 500 }}>{NOT_RECONFIRMED_DYNAMIC[dayRange].delta}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              {NOT_RECONFIRMED_DYNAMIC[dayRange].items.map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ii-border-light)', paddingTop: 6 }}>
                  <span style={{ color: 'var(--ii-text-body)' }}>{s.name}</span>
                  <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{s.count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, borderTop: '1px solid var(--ii-border-light)', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ii-text-muted)' }}>Active / Virtual / Connectivity not reconfirmed 30+ days</span>
                <span className="ii-mono" style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>{NOT_RECONFIRMED_DYNAMIC[dayRange].stale30}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--ii-border-light)', paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--ii-text-body)', width: 150, flexShrink: 0 }}>
                <div style={{ fontWeight: 500 }}>Passive field-verified share</div>
                <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>last 6 months</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48, flexGrow: 1 }}>
                {VERIFY_TREND.map(v => (
                  <div
                    key={v.label}
                    className="ii-trend-bar-col"
                    onMouseEnter={(e) => showTip({
                      title: `${v.label} Survey Audit`,
                      dotColor: v.color,
                      badge: `${parseInt(v.h, 10)}%`,
                      rows: [
                        { label: 'Field-verified share', value: `${parseInt(v.h, 10)}%` },
                        { label: 'Unverified backlog', value: `${100 - parseInt(v.h, 10)}%` }
                      ],
                      note: 'Audited by physical OSP survey teams and reconciled into GIS.'
                    }, e)}
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  >
                    <span className="ii-mono" style={{ fontSize: 10, color: 'var(--ii-text-muted)' }}>{v.label}</span>
                    <div className="ii-trend-bar-fill" style={{ height: v.h, background: v.color }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ii-text-muted)' }}>
              Verification climbed from 58% to 72% in 6 months; at that rate the survey backlog clears in roughly 12 more months.
            </div>
            <div className="ii-note-box">
              Most stale Active records sit under two EMS instances that missed the last three sync windows — a collector issue, not missing hardware.
            </div>
          </div>
        </section>

        {/* ── Tier 4: Trust in the data ── */}
        <div className="ii-section-eyebrow">Trust in the data</div>

        <section aria-label="Quality" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* Quality table */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="ii-card-title">Inventory quality by bucket</div>
              <span style={{ fontSize: 12, color: 'var(--ii-text-muted)' }}>Target ≥ 90% · dup/orphan ≤ 1%</span>
            </div>
            <div className="ii-table-wrap">
              <table className="ii-table">
                <thead>
                  <tr style={{ textAlign: 'right' }}>
                    <th style={{ textAlign: 'left' }}>Inventory</th>
                    <th>Complete</th>
                    <th>Integrity</th>
                    <th>Fresh</th>
                    <th>Dup.</th>
                    <th>Orphan</th>
                  </tr>
                </thead>
                <tbody>
                  {QUALITY_ROWS_DYNAMIC[dayRange].map(q => {
                    const cellStyle = (c: string) => ({
                      textAlign: 'right' as const,
                      fontWeight: c !== GOOD ? 500 : 400,
                      color: c !== GOOD ? c : 'var(--ii-text-body)'
                    });
                    return (
                      <tr key={q.name}>
                        <td style={{ fontWeight: 500, color: 'var(--ii-text-heading)' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: q.color, marginRight: 6 }} />
                          {q.name}
                        </td>
                        <td className="ii-mono" style={cellStyle(q.c1)}>{q.v1}</td>
                        <td className="ii-mono" style={cellStyle(q.c2)}>{q.v2}</td>
                        <td className="ii-mono" style={cellStyle(q.c3)}>{q.v3}</td>
                        <td className="ii-mono" style={cellStyle(q.c4)}>{q.v4}</td>
                        <td className="ii-mono" style={cellStyle(q.c5)}>{q.v5}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>
              Complete = mandatory attributes filled · Integrity = parent/child and A–Z relationships resolved · Fresh = updated by discovery, NFVO, mapping or survey within SLA (24 h active/virtual/logical, 90 d passive).
            </div>
          </div>
        </section>

        {/* ── Tier 5: Drill-down ── */}
        <div className="ii-section-eyebrow">Drill-down</div>

        {/* 5 Navigation Tiles */}
        <section aria-label="Navigate" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14 }}>
          {BOTTOM_NAVIGATE_DYNAMIC[dayRange].map(n => (
            <button
              key={n.name}
              type="button"
              onClick={() => navigate(n.route)}
              className="ii-nav-tile"
              style={{ borderLeft: `3px solid ${n.color}` }}
            >
              <span className="ii-mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{n.count}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ii-text-title)' }}>{n.name}</span>
              <span style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>{n.where}</span>
            </button>
          ))}
        </section>

        <section aria-label="Sites, services and activity" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
          {/* Sites needing attention */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="ii-card-title">Sites needing attention</div>
              <button type="button" onClick={() => navigate('/inventory/location')} className="ii-link-btn">
                All {TOTAL_RECORDS_DATA[dayRange].sitesCount} sites
              </button>
            </div>
            <div className="ii-table-wrap">
              <table className="ii-table">
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '6px 4px' }}>Site</th>
                    <th style={{ padding: '6px 4px' }}>Region</th>
                    <th style={{ padding: '6px 4px' }}>Site type</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Active</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Passive</th>
                    <th style={{ padding: '6px 4px' }}>Health</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Issues</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sitesList.map(s => (
                    <tr key={s.name}>
                      <td className="ii-mono" style={{ padding: '7px 4px', fontWeight: 500, color: 'var(--ii-text-heading)' }}>{s.name}</td>
                      <td style={{ padding: '7px 4px', color: 'var(--ii-text-body)' }}>{s.region}</td>
                      <td style={{ padding: '7px 4px', color: 'var(--ii-text-body)' }}>{s.kind}</td>
                      <td className="ii-mono" style={{ padding: '7px 4px', textAlign: 'right', color: 'var(--ii-text-heading)' }}>{s.active}</td>
                      <td className="ii-mono" style={{ padding: '7px 4px', textAlign: 'right', color: 'var(--ii-text-heading)' }}>{s.passive}</td>
                      <td style={{ padding: '7px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 36, height: 5, borderRadius: 2.5, background: 'var(--ii-border-light)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: s.healthW, background: s.healthColor }} />
                          </div>
                          <span className="ii-mono" style={{ fontSize: 11.5, color: 'var(--ii-text-body)' }}>{s.health}</span>
                        </div>
                      </td>
                      <td className="ii-mono" style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 500, color: 'var(--ii-text-heading)' }}>{s.issues}</td>
                      <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                        <span className="ii-pill" style={{ background: s.badgeBg, color: s.badgeFg, fontSize: 10.5, padding: '2px 7px' }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sitesList.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '14px 8px', color: 'var(--ii-text-muted)', textAlign: 'center' }}>
                        No sites needing attention at this time.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Services on inventory */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="ii-card-title">Services on inventory</div>
              <button type="button" onClick={() => navigate('/inventory/services')} className="ii-link-btn">
                View all
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <div style={{ background: 'var(--ii-bg-subtle)', border: '1px solid var(--ii-border-light)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>Active services</div>
                <div className="ii-mono" style={{ fontSize: 17, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{SERVICES_DYNAMIC[dayRange].active}</div>
              </div>
              <div style={{ background: 'var(--ii-bg-subtle)', border: '1px solid var(--ii-border-light)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>With full E2E path</div>
                <div className="ii-mono" style={{ fontSize: 17, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{SERVICES_DYNAMIC[dayRange].e2e}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {servicesList.map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ii-border-light)', paddingTop: 6, gap: 8 }}>
                  <span style={{ color: 'var(--ii-text-body)' }}>{s.name}</span>
                  <span style={{ display: 'flex', gap: 10 }}>
                    <span className="ii-mono" style={{ color: 'var(--ii-text-heading)' }}>{s.count}</span>
                    <span className="ii-mono" style={{ color: s.color, width: 34, textAlign: 'right', fontWeight: 500 }}>{s.path}</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>
              Right column = share of services with a complete physical + logical path recorded.
            </div>
          </div>

          {/* Recent inventory activity */}
          <div className="ii-card" style={{ gap: 6 }}>
            <div className="ii-card-title">Recent inventory activity</div>
            {activityList.map((e, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid var(--ii-border-light)' }}>
                <span className="ii-tag" style={{ background: e.tagBg, color: e.tagFg }}>
                  {e.tag}
                </span>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ii-text-heading)' }}>{e.what}</div>
                  <div style={{ fontSize: 11, color: 'var(--ii-text-muted)' }}>{e.who} · {e.when}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Toast notification ── */}
      {toast && (
        <div role="status" aria-live="polite" className="ii-toast">
          <span style={{ flexGrow: 1 }}>{toast}</span>
          <button type="button" onClick={() => setToast('')} aria-label="Dismiss" className="ii-toast-dismiss">
            ×
          </button>
        </div>
      )}

      {/* ── Interactive Chart Floating Tooltip Portal ── */}
      {tooltip && createPortal(
        <div
          className="ii-chart-tooltip"
          style={{
            left: Math.min(window.innerWidth - 300, Math.max(16, tooltip.x + 14)),
            top: Math.min(window.innerHeight - 160, Math.max(16, tooltip.y - 45))
          }}
        >
          <div className="ii-chart-tooltip-head">
            <div className="ii-chart-tooltip-title">
              {tooltip.dotColor && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: tooltip.dotColor, flexShrink: 0 }} />
              )}
              <span>{tooltip.title}</span>
            </div>
            {tooltip.badge && (
              <span className="ii-chart-tooltip-badge" style={tooltip.badgeColor ? { color: tooltip.badgeColor } : undefined}>
                {tooltip.badge}
              </span>
            )}
          </div>
          {tooltip.rows && tooltip.rows.map(r => (
            <div key={r.label} className="ii-chart-tooltip-row">
              <span className="ii-chart-tooltip-label">{r.label}</span>
              <span className="ii-chart-tooltip-val">{r.value}</span>
            </div>
          ))}
          {tooltip.note && (
            <div className="ii-chart-tooltip-note">{tooltip.note}</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
