import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/inventory-insights.css';
import {
  ACCENT,
  WARN,
  CRIT,
  INFO,
  PURP,
  TEAL,
  GREY,
  ACT,
  PAS,
  VIR,
  LOG,
  PARENTS_DATA,
  PANELS_DATA,
  QUALITY_ROWS_DATA,
  CROSS_LINKS_DATA,
  GAP_ROWS_DATA,
  LIFECYCLE_STATES_DATA,
  LIFECYCLE_BARS_DATA,
  SITES_RAW,
  SERVICES_RAW,
  ACTIVITY_RAW,
  DECOM_RAW,
  EOL_VENDORS,
  EOL_RAW,
  DRIFT_RAW,
  SPARES_RAW,
  STALE_ITEMS,
  VERIFY_TREND,
  WINDOWS_TREND,
  BOTTOM_NAVIGATE_DATA,
  hc,
  statusBg,
  statusFg,
  tagBg,
  tagFg
} from '../data/inventoryInsightsData';

export default function InventoryInsights() {
  const navigate = useNavigate();

  // ── State & Filters ──
  const [vendor, setVendor] = useState<string>('all');
  const [toast, setToast] = useState<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const resetFilters = () => {
    setVendor('all');
  };

  const filtersActive = vendor !== 'all';
  const filterSummary = `Vendor: ${vendor}`;

  const handleExport = () => {
    const venText = vendor !== 'all' ? ` (${vendor})` : '';
    say(`Export queued: Inventory Insights${venText} will be emailed as CSV + PDF in a few minutes.`);
  };

  const handleRunRecon = () => {
    say(
      'Reconciliation run queued across all four buckets: 778 inventory-only and 224 network-only records will be re-matched. Results land in Discovery & Reconciliation.'
    );
  };

  // ── Donut Calculations ──
  const circ = 2 * Math.PI * 40;

  const bucketShare = useMemo(() => {
    const raw: [string, string, number, string][] = [
      ['Active', '1.48M', 1482600, ACT],
      ['Passive', '69,730', 69730, PAS],
      ['Logical', '57,010', 57010, LOG],
      ['Virtual', '2,860', 2860, VIR]
    ];
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
  }, [circ]);

  const vendorMix = useMemo(() => {
    const raw: [string, number, string][] = [
      ['Nokia', 29, INFO],
      ['Ericsson', 24, PURP],
      ['Cisco', 19, TEAL],
      ['Huawei', 11, WARN],
      ['Ciena', 7, '#0284C7'],
      ['Others', 10, GREY]
    ];
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
  }, [circ]);

  // ── Decommission by Bucket ──
  const decomByBucket = useMemo(() => {
    const maxVal = DECOM_RAW[0][1];
    const bkc: Record<string, string> = { Active: ACT, Passive: PAS, Logical: LOG, Virtual: VIR };
    return DECOM_RAW.map(d => ({
      name: d[0],
      count: d[1],
      w: `${Math.round((d[1] / maxVal) * 100)}%`,
      color: bkc[d[0]]
    }));
  }, []);

  // ── EOL / EOS Rows ──
  const eolRows = useMemo(() => {
    const maxVal = EOL_RAW[0][1];
    return EOL_RAW.map(r => ({
      name: r[0],
      count: r[1].toLocaleString('en-IN'),
      w: `${Math.round((r[1] / maxVal) * 100)}%`,
      segs: r[2]
        .map((p, i) => {
          const ven = EOL_VENDORS[i];
          const isHighlighted =
            vendor === 'all' ||
            ven.name === vendor ||
            (ven.name === 'Others' && vendor === 'Juniper');
          return {
            w: `${p}%`,
            color: isHighlighted ? ven.color : '#E2E8F0'
          };
        })
        .filter(s => s.w !== '0%')
    }));
  }, [vendor]);

  // ── Drift Rows ──
  const driftRows = useMemo(() => {
    const driftVis = DRIFT_RAW.filter(
      d => vendor === 'all' || d[0] === vendor || (d[0] === 'Others' && ['Ericsson', 'Ciena'].includes(vendor))
    );
    const activeList = driftVis.length ? driftVis : DRIFT_RAW;
    const maxVal = DRIFT_RAW[0][1];
    return activeList.map(d => ({
      name: d[0],
      count: d[1],
      w: `${Math.round((d[1] / maxVal) * 100)}%`
    }));
  }, [vendor]);

  // ── Spares Risk Table ──
  const sparesList = useMemo(() => {
    return SPARES_RAW.filter(
      s => vendor === 'all' || s[0].startsWith(vendor)
    ).map(s => {
      const r = (s[2] / s[1]) * 100;
      return {
        model: s[0],
        deployed: s[1].toLocaleString('en-IN'),
        spares: `${s[2]}${s[2] === 1 ? ' spare' : ' spares'}`,
        ratio: `${r.toFixed(1)}%`,
        color: r < 1 ? CRIT : WARN
      };
    });
  }, [vendor]);

  // ── Operational Trend Chart ──
  const trendPoints = useMemo(() => {
    const win = WINDOWS_TREND['30d'];
    const maxVal = Math.max(...win.map(w => w[1]));
    return win.map((w, i) => ({
      label: w[0],
      h: `${Math.max(Math.round((w[1] / maxVal) * 96), 4)}px`,
      color: i === win.length - 1 ? ACCENT : '#CBD5E1'
    }));
  }, []);

  // ── Sites Needing Attention ──
  const sitesList = useMemo(() => {
    return SITES_RAW.map(s => ({
      name: s[0],
      region: s[1],
      kind: s[2],
      active: s[3],
      passive: s[4],
      health: `${s[5]}%`,
      healthW: `${s[5]}%`,
      healthColor: hc(s[5]),
      issues: s[6],
      status: s[7],
      badgeBg: statusBg(s[7]),
      badgeFg: statusFg(s[7])
    }));
  }, []);

  // ── Services ──
  const servicesList = useMemo(() => {
    return SERVICES_RAW.map(s => ({
      name: s[0],
      count: s[1],
      path: `${s[2]}%`,
      color: hc(s[2])
    }));
  }, []);

  // ── Activity ──
  const activityList = useMemo(() => {
    return ACTIVITY_RAW.map(e => ({
      tag: e[0],
      what: e[1],
      who: e[2],
      when: e[3],
      tagBg: tagBg(e[0]),
      tagFg: tagFg(e[0])
    }));
  }, []);

  return (
    <div className="ii-container">
      <main id="top" className="ii-main">
        {/* ── Top Bar ── */}
        <header className="ii-header">
          <h1 className="ii-title">Inventory Insights</h1>

          <div className="ii-controls">
            <select
              aria-label="Vendor"
              value={vendor}
              onChange={e => setVendor(e.target.value)}
              className="ii-select"
            >
              <option value="all">All vendors</option>
              <option value="Nokia">Nokia</option>
              <option value="Ericsson">Ericsson</option>
              <option value="Cisco">Cisco</option>
              <option value="Huawei">Huawei</option>
              <option value="Ciena">Ciena</option>
              <option value="Juniper">Juniper</option>
            </select>

            <button type="button" onClick={handleExport} className="ii-btn-primary">
              Export
            </button>
          </div>
        </header>

        {/* ── Active Filters Notification Banner ── */}
        {filtersActive && (
          <div className="ii-filter-banner">
            <span style={{ fontWeight: 600 }}>Filters:</span>
            <span>{filterSummary}</span>
            <span style={{ color: '#4B5563' }}>
              · tables, vendor breakdowns and the change window below reflect this selection; aggregate tiles are network-wide
            </span>
            <button type="button" onClick={resetFilters} className="ii-btn-reset">
              Reset
            </button>
          </div>
        )}

        {/* ── Tier 1: Key Metrics (4 cards) ── */}
        <section aria-label="Key metrics" className="ii-kpi-grid">
          {/* Tile 1: Dark summary tile */}
          <div className="ii-card-dark">
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Total inventory records</span>
            <div className="ii-metric-huge">1.61M</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              <span style={{ color: '#4ADE80', fontWeight: 600 }}>+3.8%</span> vs last month · 2,400 locations · 65,680 managed elements
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #334155', paddingTop: 8, marginTop: 2 }}>
              <span style={{ color: '#94A3B8' }}>Overall inventory health</span>
              <span className="ii-mono" style={{ fontWeight: 600, color: '#4ADE80' }}>90%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Confirmed against source</span>
              <span className="ii-mono" style={{ fontWeight: 600, color: '#4ADE80' }}>92.4%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Stranded or unconfirmed</span>
              <span className="ii-mono" style={{ fontWeight: 600, color: '#FBBF24' }}>7.6% · 123k</span>
            </div>
          </div>

          {/* Tile 2 & 3: Physical & Logical Category KPI cards */}
          {PARENTS_DATA.map(p => (
            <div key={p.name} className="ii-card" style={{ gap: 8, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: '#4B5563' }}>{p.desc}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="ii-mono" style={{ fontSize: 26, fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
                  {p.count}
                </span>
                <span style={{ fontSize: 12, color: '#4B5563' }}>
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>{p.delta}</span> · {p.health} health
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid #EEF1F5', paddingTop: 8 }}>
                {p.children.map(k => (
                  <div key={k.name} style={{ borderLeft: `3px solid ${k.color}`, paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{k.name}</span>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: k.badgeBg, color: k.badgeFg, fontWeight: 600 }}>
                        {k.health}
                      </span>
                    </div>
                    <div className="ii-mono" style={{ fontSize: 18, fontWeight: 600 }}>{k.count}</div>
                    <div style={{ fontSize: 11, color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k.scope}>
                      {k.scope}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4B5563' }}>
                      <span>{k.covLabel}</span>
                      <span className="ii-mono">{k.coverage}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#EEF1F5', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: k.coverage, background: k.color }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#4B5563' }}>
                      <strong style={{ color: '#DC2626' }}>{k.critical}</strong> crit · <strong style={{ color: '#D97706' }}>{k.high}</strong> high
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tile 4: Open inventory issues */}
          <div className="ii-card" style={{ borderTop: '3px solid #DC2626', gap: 6, padding: '14px 16px' }}>
            <span style={{ fontSize: 12, color: '#111827', fontWeight: 600 }}>Open inventory issues</span>
            <div className="ii-mono" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em' }}>1,184</div>
            <div style={{ fontSize: 12, color: '#4B5563' }}>
              <span style={{ color: '#16A34A', fontWeight: 600 }}>−7%</span> · this week
            </div>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginTop: 2 }}>
              <div style={{ width: '9%', background: '#DC2626' }} />
              <div style={{ width: '27%', background: '#D97706' }} />
              <div style={{ width: '38%', background: '#3B82F6' }} />
              <div style={{ width: '26%', background: '#94A3B8' }} />
            </div>
            <div style={{ fontSize: 11, color: '#4B5563', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span><strong style={{ color: '#DC2626' }}>104</strong> crit</span>
              <span><strong style={{ color: '#D97706' }}>318</strong> high</span>
              <span><strong style={{ color: '#3B82F6' }}>452</strong> med</span>
              <span><strong style={{ color: '#475569' }}>310</strong> low</span>
            </div>
            <div style={{ fontSize: 11, color: '#4B5563' }}>Median age 6 days · 38 assigned</div>
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
                <circle cx="50" cy="50" r="40" fill="none" stroke="#EEF1F5" strokeWidth="14" />
                {bucketShare.map(b => (
                  <circle
                    key={b.name}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={b.color}
                    strokeWidth="14"
                    strokeDasharray={b.dash}
                    strokeDashoffset={b.offset}
                    transform="rotate(-90 50 50)"
                  />
                ))}
                <text x="50" y="47" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600" fill="#111827">
                  1.61M
                </text>
                <text x="50" y="60" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="7" fill="#4B5563">
                  records
                </text>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
                {bucketShare.map(b => (
                  <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                    <span style={{ flexGrow: 1 }}>{b.name}</span>
                    <span className="ii-mono" style={{ fontWeight: 600 }}>{b.count}</span>
                    <span className="ii-mono" style={{ color: '#4B5563', width: 36, textAlign: 'right' }}>{b.pctLabel}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#4B5563' }}>
              Physical inventory is 96% of records (Active 92%, Passive 4%) because every port, card and shelf is its own record; Logical holds 3.5% and Virtual 0.2%.
            </div>
          </div>

          {/* Panel 2: Lifecycle */}
          <div className="ii-card" style={{ gap: 12 }}>
            <div className="ii-card-title">Lifecycle</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
              {LIFECYCLE_STATES_DATA.map(l => (
                <div key={l.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 4, borderRadius: 2, background: l.color }} />
                  <div className="ii-mono" style={{ fontSize: 18, fontWeight: 600, color: l.color }}>{l.count}</div>
                  <div style={{ fontSize: 11, color: '#4B5563' }}>{l.name}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
              {LIFECYCLE_BARS_DATA.map(l => (
                <div key={l.name} style={{ width: l.w, background: l.color }} title={`${l.name}: ${l.count} (${l.pct})`} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#4B5563' }}>
              Faults concentrate in Active records (8,800) — 94% of all faulty records; Passive faults are splice and duct damage found on survey.
            </div>
            <div style={{ fontSize: 12, color: '#4B5563' }}>
              Planned records take a median 54 days before going in service, gated mainly by passive field verification — 61% of the wait is survey, not installation.
            </div>
          </div>

          {/* Donut 3: Vendor mix (active equipment) */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Vendor mix (active equipment)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="116" height="116" viewBox="0 0 100 100" role="img" aria-label="Vendor share donut">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#EEF1F5" strokeWidth="14" />
                {vendorMix.map(v => (
                  <circle
                    key={v.name}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={v.color}
                    strokeWidth="14"
                    strokeDasharray={v.dash}
                    strokeDashoffset={v.offset}
                    transform="rotate(-90 50 50)"
                  />
                ))}
                <text x="50" y="47" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600" fill="#111827">
                  65.7k
                </text>
                <text x="50" y="60" textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="7" fill="#4B5563">
                  active NEs
                </text>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexGrow: 1 }}>
                {vendorMix.map(v => (
                  <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: v.color, flexShrink: 0 }} />
                    <span style={{ flexGrow: 1 }}>{v.name}</span>
                    <span className="ii-mono" style={{ color: '#4B5563' }}>{v.pctLabel}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #EEF1F5', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Vendor models catalogued</span>
                <span className="ii-mono" style={{ fontWeight: 600 }}>1,284</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Unknown / unmapped models</span>
                <span className="ii-mono" style={{ fontWeight: 600, color: '#D97706' }}>37</span>
              </div>
            </div>
          </div>
        </section>

        {/* Row 2 of What exists: The 4 Detailed Inventory Panels */}
        <section aria-label="Inventory by type" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          {PANELS_DATA.map(p => (
            <div key={p.title} className="ii-card" style={{ gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                <div style={{ fontWeight: 600, fontSize: 14, flexGrow: 1 }}>{p.title}</div>
                <button type="button" onClick={() => navigate(p.route)} className="ii-link-btn">
                  Open
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#4B5563', marginTop: -6 }}>{p.desc}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.items.map(t => (
                  <div key={t.name} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </span>
                      <span className="ii-mono" style={{ flexShrink: 0 }}>{t.count}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#EEF1F5', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: t.w, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #EEF1F5', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                {p.facts.map(f => (
                  <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#4B5563' }}>{f.name}</span>
                    <span className="ii-mono" style={{ fontWeight: 600, color: f.color }}>{f.value}</span>
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
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: -6 }}>This month</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr 14px 1fr', gap: 6, alignItems: 'center' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div className="ii-mono" style={{ fontSize: 22, fontWeight: 600, color: '#1E293B' }}>412</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Marked decommissioned</div>
              </div>
              <div style={{ textAlign: 'center', color: '#94A3B8' }}>→</div>
              <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div className="ii-mono" style={{ fontSize: 22, fontWeight: 600, color: '#D97706' }}>63</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Still live in discovery — removal pending</div>
              </div>
              <div style={{ textAlign: 'center', color: '#94A3B8' }}>→</div>
              <div style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div className="ii-mono" style={{ fontSize: 22, fontWeight: 600, color: '#16A34A' }}>349</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Confirmed removed</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#4B5563' }}>Decommissions by bucket</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 14px' }}>
              {decomByBucket.map(d => (
                <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{d.name}</span>
                    <span className="ii-mono">{d.count}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: '#EEF1F5', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: d.w, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="ii-note-box">
              63 active elements marked decommissioned are still answering discovery — awaiting physical removal; 41 are older than 30 days. Passive decommissions are confirmed by survey, not discovery.
            </div>
          </div>

          {/* EOL/EOS exposure */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">EOL/EOS exposure — 3,870 assets, by bucket and vendor</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: -4 }}>
              Each bar is a leaf bucket (Active and Passive under Physical; Virtual and Logical under Logical); the colour split shows whose hardware is behind it.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
              {eolRows.map(r => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 48px', gap: 10, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ textAlign: 'right', color: '#374151' }}>{r.name}</span>
                  <div style={{ width: r.w, height: 14, display: 'flex', gap: 1, borderRadius: 3, overflow: 'hidden' }}>
                    {r.segs.map((s, idx) => (
                      <div key={idx} style={{ width: s.w, background: s.color }} />
                    ))}
                  </div>
                  <span className="ii-mono" style={{ color: '#4B5563' }}>{r.count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#374151', marginTop: 2 }}>
              {EOL_VENDORS.map(v => (
                <span key={v.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: v.color }} />
                  {v.name}
                </span>
              ))}
            </div>
            <div className="ii-note-box">
              Active equipment and its cards carry 80% of the exposure, mostly Ericsson and Nokia legacy generations with Cisco and Ciena line cards; Passive exposure is almost all third-party plant. 1,240 of these assets go end-of-support within 6 months.
            </div>
          </div>

          {/* OS / firmware drift */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">OS / firmware drift — 2,140 off baseline</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: -4 }}>
              2,140 of the 61,740 active elements with a recorded version are off the approved baseline (3.5%); the drift below is by vendor. Version coverage is tracked separately beneath.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
              {driftRows.map(d => (
                <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 44px', gap: 10, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ textAlign: 'right', color: '#374151' }}>{d.name}</span>
                  <div style={{ height: 14, borderRadius: 3, background: '#EEF1F5', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: d.w, background: '#DC2626' }} />
                  </div>
                  <span className="ii-mono" style={{ color: '#4B5563' }}>{d.count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, borderTop: '1px solid #EEF1F5', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Of the 2,140: on a version with published CVEs</span>
                <span className="ii-mono" style={{ fontWeight: 600, color: '#DC2626' }}>612</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Outside the 2,140: no version recorded (of 65,680 active)</span>
                <span className="ii-mono" style={{ fontWeight: 600, color: '#D97706' }}>3,940</span>
              </div>
            </div>
            <div className="ii-note-box">
              Most common single offender: Cisco IOS XR 7.3.2 on cell-site routers — itself vendor-EoL — 486 devices. CVE exposure is shown here as inventory risk context only; vulnerability management lives in the security module.
            </div>
          </div>
        </section>

        {/* Row 2 of Tier 2: Spares Risk & Not Reconfirmed */}
        <section aria-label="Spares and staleness" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Spares coverage risk */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Spares coverage risk — 6 models below safe threshold</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: -4 }}>
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
                    <tr key={s.model}>
                      <td style={{ fontWeight: 500 }}>{s.model}</td>
                      <td className="ii-mono" style={{ textAlign: 'right' }}>{s.deployed}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 600, color: s.color }}>{s.spares}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', color: s.color }}>{s.ratio}</td>
                    </tr>
                  ))}
                  {sparesList.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '14px 8px', color: '#4B5563', textAlign: 'center' }}>
                        No at-risk models for this vendor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="ii-note-box">
              Two of the six are also on the EOL list (ASR 920, Radio 4480), so replacement rather than restocking is the likely fix.
            </div>
          </div>

          {/* Not reconfirmed */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Not reconfirmed in 7+ days</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: -4 }}>
              Records not reconfirmed by their source within SLA — discovery for Active, NFVO for Virtual, mapping for Logical, survey for Passive.
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="ii-mono" style={{ fontSize: 30, fontWeight: 600, color: '#D97706' }}>2,840</span>
              <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>↓180 vs last week</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              {STALE_ITEMS.map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EEF1F5', paddingTop: 6 }}>
                  <span>{s.name}</span>
                  <span className="ii-mono" style={{ fontWeight: 600 }}>{s.count}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, borderTop: '1px solid #EEF1F5', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Active / Virtual / Logical not reconfirmed 30+ days</span>
                <span className="ii-mono" style={{ fontWeight: 600, color: '#DC2626' }}>612</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #EEF1F5', paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: '#374151', width: 150, flexShrink: 0 }}>
                <div style={{ fontWeight: 500 }}>Passive field-verified share</div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>last 6 months</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48, flexGrow: 1 }}>
                {VERIFY_TREND.map(v => (
                  <div key={v.label} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 2 }}>
                    <span className="ii-mono" style={{ fontSize: 10, color: '#4B5563' }}>{v.label}</span>
                    <div style={{ width: '100%', height: v.h, borderRadius: '3px 3px 0 0', background: v.color }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#4B5563' }}>
              Verification climbed from 58% to 72% in 6 months; at that rate the survey backlog clears in roughly 12 more months.
            </div>
            <div className="ii-note-box">
              Most stale Active records sit under two EMS instances that missed the last three sync windows — a collector issue, not missing hardware.
            </div>
          </div>
        </section>

        {/* ── Tier 4: Trust in the data ── */}
        <div className="ii-section-eyebrow">Trust in the data</div>

        <section aria-label="Quality and integrity" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
          {/* Quality table */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="ii-card-title">Inventory quality by bucket</div>
              <span style={{ fontSize: 12, color: '#4B5563' }}>Target ≥ 90% · dup/orphan ≤ 1%</span>
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
                  {QUALITY_ROWS_DATA.map(q => (
                    <tr key={q.name}>
                      <td style={{ fontWeight: 500 }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: q.color, marginRight: 6 }} />
                        {q.name}
                      </td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 600, color: q.c1 }}>{q.v1}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 600, color: q.c2 }}>{q.v2}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 600, color: q.c3 }}>{q.v3}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 600, color: q.c4 }}>{q.v4}</td>
                      <td className="ii-mono" style={{ textAlign: 'right', fontWeight: 600, color: q.c5 }}>{q.v5}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: '#4B5563' }}>
              Complete = mandatory attributes filled · Integrity = parent/child and A–Z relationships resolved · Fresh = updated by discovery, NFVO, mapping or survey within SLA (24 h active/virtual/logical, 90 d passive).
            </div>
          </div>

          {/* Cross-inventory integrity */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Cross-inventory integrity</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: -4 }}>
              How well the four inventories are linked to each other.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {CROSS_LINKS_DATA.map(l => (
                <div key={l.name} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
                    <span>{l.name}</span>
                    <span className="ii-mono" style={{ fontWeight: 600, color: l.color }}>{l.value}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#EEF1F5', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: l.value, background: l.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tier 5: Operational trend ── */}
        <div className="ii-section-eyebrow">Operational trend</div>

        <section aria-label="Discovery, support and trend" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          {/* Discovery & reconciliation */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Discovery &amp; reconciliation</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: -4 }}>
              Active via EMS/NMS and NETCONF/SNMP · Virtual via NFVO and K8s API · Logical via mapping to active ports · Passive via GIS and field survey
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
              <div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>Inventory only</div>
                <div className="ii-mono" style={{ fontSize: 18, fontWeight: 600, color: '#D97706' }}>778</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>Matched</div>
                <div className="ii-mono" style={{ fontSize: 18, fontWeight: 600, color: '#16A34A' }}>119,840</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>Network only</div>
                <div className="ii-mono" style={{ fontSize: 18, fontWeight: 600, color: '#DC2626' }}>224</div>
              </div>
            </div>
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
              <div style={{ width: '3%', background: '#D97706' }} />
              <div style={{ width: '95%', background: '#16A34A' }} />
              <div style={{ width: '2%', background: '#DC2626' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              {GAP_ROWS_DATA.map(g => (
                <div key={g.name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EEF1F5', paddingTop: 5 }}>
                  <span>{g.name}</span>
                  <span className="ii-mono" style={{ color: '#4B5563' }}>{g.value}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={handleRunRecon} className="ii-link-btn" style={{ fontWeight: 600 }}>
              Run reconciliation →
            </button>
          </div>

          {/* Support & ageing */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div className="ii-card-title">Support &amp; ageing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>End-of-support within 12 mo</span>
                <span className="ii-mono" style={{ fontWeight: 600, color: '#D97706' }}>3,870</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Warranty expiring (90 d)</span>
                <span className="ii-mono" style={{ fontWeight: 600 }}>1,240</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Spares in stock</span>
                <span className="ii-mono" style={{ fontWeight: 600 }}>6,112</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Fibre cable age &gt; 15 yrs</span>
                <span className="ii-mono" style={{ fontWeight: 600, color: '#D97706' }}>1,860 km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Maintenance contracts ending (12 mo)</span>
                <span className="ii-mono" style={{ fontWeight: 600 }}>214</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Licences expiring (90 d)</span>
                <span className="ii-mono" style={{ fontWeight: 600, color: '#D97706' }}>1,380</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Average active-equipment age</span>
                <span className="ii-mono" style={{ fontWeight: 600 }}>5.8 yrs</span>
              </div>
            </div>
            <div className="ii-note-box" style={{ fontSize: 11.5 }}>
              Warranty, licence and contract dates come from the asset's commercial record; 11% of active elements have no purchase or warranty date filled.
            </div>
          </div>

          {/* Net record change */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="ii-card-title">Net record change</div>
              <span style={{ fontSize: 12, color: '#4B5563' }}>Last 30 days, weekly</span>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>Added</div>
                <div className="ii-mono" style={{ fontSize: 17, fontWeight: 600, color: '#16A34A' }}>+41,200</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>Retired</div>
                <div className="ii-mono" style={{ fontSize: 17, fontWeight: 600, color: '#DC2626' }}>−12,640</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4B5563' }}>Net</div>
                <div className="ii-mono" style={{ fontSize: 17, fontWeight: 600 }}>+28,560</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 96, marginTop: 4 }}>
              {trendPoints.map((m, idx) => (
                <div key={idx} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', height: m.h, borderRadius: '3px 3px 0 0', background: m.color }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {trendPoints.map((m, idx) => (
                <div key={idx} style={{ flexGrow: 1, textAlign: 'center', fontSize: 10, color: '#4B5563' }}>
                  {m.label}
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #EEF1F5', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Fastest growing</span>
                <span style={{ fontWeight: 500 }}>Cells, cell-site routers</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4B5563' }}>Largest retirement</span>
                <span style={{ fontWeight: 500 }}>SDH nodes, copper pairs</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tier 6: Drill-down ── */}
        <div className="ii-section-eyebrow">Drill-down</div>

        {/* 5 Navigation Tiles */}
        <section aria-label="Navigate" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14 }}>
          {BOTTOM_NAVIGATE_DATA.map(n => (
            <button
              key={n.name}
              type="button"
              onClick={() => navigate(n.route)}
              className="ii-nav-tile"
              style={{ borderLeft: `4px solid ${n.color}` }}
            >
              <span className="ii-mono" style={{ fontSize: 22, fontWeight: 600 }}>{n.count}</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{n.name}</span>
              <span style={{ fontSize: 11, color: '#4B5563' }}>{n.where}</span>
            </button>
          ))}
        </section>

        <section aria-label="Sites, services and activity" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
          {/* Sites needing attention */}
          <div className="ii-card" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="ii-card-title">Sites needing attention</div>
              <button type="button" onClick={() => navigate('/inventory/location')} className="ii-link-btn">
                All 2,400 locations
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
                      <td className="ii-mono" style={{ padding: '7px 4px', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '7px 4px' }}>{s.region}</td>
                      <td style={{ padding: '7px 4px' }}>{s.kind}</td>
                      <td className="ii-mono" style={{ padding: '7px 4px', textAlign: 'right' }}>{s.active}</td>
                      <td className="ii-mono" style={{ padding: '7px 4px', textAlign: 'right' }}>{s.passive}</td>
                      <td style={{ padding: '7px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 36, height: 6, borderRadius: 3, background: '#EEF1F5', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: s.healthW, background: s.healthColor }} />
                          </div>
                          <span className="ii-mono" style={{ fontSize: 11.5 }}>{s.health}</span>
                        </div>
                      </td>
                      <td className="ii-mono" style={{ padding: '7px 4px', textAlign: 'right' }}>{s.issues}</td>
                      <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                        <span className="ii-pill" style={{ background: s.badgeBg, color: s.badgeFg, fontSize: 10.5, padding: '2px 7px' }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sitesList.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '14px 8px', color: '#4B5563', textAlign: 'center' }}>
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
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, color: '#4B5563' }}>Active services</div>
                <div className="ii-mono" style={{ fontSize: 18, fontWeight: 600 }}>18,420</div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, color: '#4B5563' }}>With full E2E path</div>
                <div className="ii-mono" style={{ fontSize: 18, fontWeight: 600, color: '#16A34A' }}>86%</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {servicesList.map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EEF1F5', paddingTop: 6, gap: 8 }}>
                  <span>{s.name}</span>
                  <span style={{ display: 'flex', gap: 10 }}>
                    <span className="ii-mono">{s.count}</span>
                    <span className="ii-mono" style={{ color: s.color, width: 34, textAlign: 'right' }}>{s.path}</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#4B5563' }}>
              Right column = share of services with a complete physical + logical path recorded.
            </div>
          </div>

          {/* Recent inventory activity */}
          <div className="ii-card" style={{ gap: 6 }}>
            <div className="ii-card-title">Recent inventory activity</div>
            {activityList.map((e, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid #EEF1F5' }}>
                <span className="ii-tag" style={{ background: e.tagBg, color: e.tagFg }}>
                  {e.tag}
                </span>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{e.what}</div>
                  <div style={{ fontSize: 11, color: '#4B5563' }}>{e.who} · {e.when}</div>
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
    </div>
  );
}
