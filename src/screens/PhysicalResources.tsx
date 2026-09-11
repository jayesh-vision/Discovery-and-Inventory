import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, Sub, TabBar, cv } from '../components/ui';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import {
  ACTIVE_STATES, EST, IL, NE_CLASSES, PHY_TABS, RSTATE, fmt, hasNodeView, nodeClassName,
  phyCount, stockCount, type NeClass, type StockState
} from '../data/ledger';
import { isActive, PHY, phyRows, portsOf, regionOf, sysDescrOf, type NeRow } from '../data/physical';
import type { Region } from '../data/discovery';
import { legacyPath } from '../routes';
import { loadLegacy } from '../legacy/LegacyView';

/* region and sysDescr are derived, not stored on the ledger row — the grid's
   search/filter only ever looks at literal row properties, so both are baked
   onto each row (see `rows` below) rather than computed inline in renderRow,
   or they'd display but never be findable. */
type Row = NeRow & { region: Region; sysDescr: string };

const FILTERS = [
  { n: 'Status', o: ['Verified', 'Drifted', 'Stale', 'Missing', 'Not discovered'] },
  { n: 'Name' }, { n: 'IP address' }, { n: 'Model' }, { n: 'OEM', o: ['CISCO', 'JUNIPER', 'NOKIA', 'ERICSSON', 'HUAWEI', 'ADVA', 'CIENA', 'HPE'] },
  { n: 'OS version' }, { n: 'Serial number' }, { n: 'Location' }, { n: 'Region', o: ['North', 'East', 'West', 'South'] }
];

const isClass = (v: string | null): v is NeClass => !!v && (NE_CLASSES as string[]).includes(v);

export default function PhysicalResources() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();

  /* screen state lives in the URL, so drill-downs and reloads land on the same view */
  const oem = sp.get('oem');
  const model = sp.get('model');
  /* a discovery drill (by vendor or model) only ever concerns Router and Switch —
     the other classes have no collector and never appear in that breakdown */
  const discoveryScoped = !!(oem || model);
  const modelClass = model && (['router', 'switch'] as const).find(k => PHY[k].some(r => r.model === model));
  const urlClass = sp.get('cls') || sp.get('tab');
  const rawCls: NeClass = isClass(urlClass) ? (urlClass as NeClass) : modelClass || PHY_TABS[0].k;
  const cls: NeClass = discoveryScoped && rawCls !== 'router' && rawCls !== 'switch' ? 'router' : rawCls;
  /* Server has no meaningful drill-down here (no Node view, and its "View
     details" is already dropped below for showing the wrong element) — its
     records still exist in the ledger for the Network elements KPI, just
     not as a tab a reader can land on from this screen. */
  const tabs = (discoveryScoped ? PHY_TABS.filter(t => t.k === 'router' || t.k === 'switch') : PHY_TABS)
    .filter(t => t.k !== 'server');
  const stockParam = sp.get('stock');
  const stock = useMemo<Set<StockState>>(() => {
    const req = (stockParam ? stockParam.split(',') : []).filter(isActive);
    return new Set(req.length ? req : ACTIVE_STATES);
  }, [stockParam]);
  const [refreshKey, setRefreshKey] = useState(0);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp);
    if (v === null) next.delete(k); else next.set(k, v);
    setSp(next, { replace: true });
  };

  const rows: Row[] = useMemo(() => {
    let r = phyRows(cls, stock);
    if (oem) r = r.filter(x => x.oem.toUpperCase() === oem.toUpperCase());
    if (model) r = r.filter(x => x.model === model);
    return r.map(x => ({ ...x, region: regionOf(x.loc), sysDescr: sysDescrOf(x) }));
  }, [cls, stock, oem, model, refreshKey]);
  const total = phyCount(cls, stock);

  /* every row on screen belongs to the active class tab, so cls alone decides
     whether Node view belongs in the menu — server has no node-level page.
     Node view and Site info leave this section, so they carry their origin —
     the breadcrumb then reads Resources > Physical Resources > … instead of
     jumping to the Location chain. */
  const FROM = 'Resources · Physical Resources';
  const openSite = (loc: string) => {
    /* the row's location tag is a sample city code — resolve it to the real
       roster site first, so the URL, breadcrumb and page all name one site */
    void loadLegacy().then(() => {
      const s = window.__nsLegacy?.resolveSite?.(loc) ?? null;
      nav(legacyPath('site', { label: s?.name ?? loc, q: s ? `id=${s.id}` : '', from: FROM }, { id: s?.id ?? loc }));
    });
  };
  /* View details' legacy page (see viewResource() in app-res.js) only knows
     how to render Router/Switch/DWDM/eNodeB — a Server row falls through
     to its router-only default and shows an unrelated router's record, not
     the server that was clicked. Server keeps Site info (that one resolves
     the row's own location correctly for every class) but not a link that
     opens the wrong element. */
  const rowActions = (r: Row): Action[] => [
    ...(hasNodeView(cls) ? [{ l: 'Node view', onClick: () => nav(legacyPath('node', { label: `${nodeClassName(cls)} · ${r.name}`, from: FROM }, { name: r.name })) }] : []),
    ...(cls === 'server' ? [] : [{ l: 'View details', onClick: () => nav(`/inventory/resource/${encodeURIComponent(r.name)}`) }]),
    { l: 'Site info', onClick: () => openSite(r.loc) }
  ];

  const selectTabClass = (targetClass: NeClass) => {
    const next = new URLSearchParams(sp);
    next.delete('tab');
    next.delete('drill');
    next.delete('from');
    next.delete('oem');
    next.delete('model');
    next.set('cls', targetClass);
    setSp(next, { replace: true });
  };

  return (
    <div className="page">
      <StatStrip cells={[
        { k: 'Network elements', v: fmt(IL.ne), s: 'Router 2,148 · Switch 349 · other 206', t: 'sky' },
        { k: 'Ports used', v: `${(EST.ports.used / EST.ports.total * 100).toFixed(0)}%`, s: `${fmt(EST.ports.free)} free of ${fmt(EST.ports.total)}`, t: 'emerald' },
        { k: 'Spares in store', v: fmt(EST.spares.instore), s: `${fmt(EST.spares.rma)} at RMA · ${fmt(EST.spares.intransit)} in transit`, t: 'purple',
          onClick: () => { set('stock', 'instore'); } }
      ]} />

      <Card>
        <TabBar
          tabs={tabs.map(x => ({
            k: x.k, n: x.n, count: phyCount(x.k, stock),
            title: `${fmt(phyCount(x.k, stock))} of ${fmt(x.c + stockCount(x.k, 'decomm'))} ${x.n.toLowerCase()} records in the selected stock states${
              x.disc ? ` · ${fmt(x.disc)} discovered` : ''}`
          }))}
          active={cls} onChange={selectTabClass} />

        {/* Ports is right-aligned (numeric), so any width beyond its own content
            collects as empty space before it, not after — a wide column here
            reads as a gap before Ports, not real spacing next to Location.
            Sized close to its actual content (bar + "NN/NN") keeps that gap
            from swallowing the boundary with Location. System description is
            a real SNMP sysDescr-length banner (see sysDescrOf) — capped to a
            fixed width and ellipsis-truncated (full text on hover) so it
            can't force the whole table to scroll horizontally. */}
        <DataGrid<Row>
          columns={[{ t: 'Status', w: '9%' }, { t: 'Name / IP', w: '16%' }, { t: 'Model / OEM', w: '12%' }, { t: 'OS version', w: '8%' },
            { t: 'Serial number', w: '10%' }, { t: 'Region', w: '6%' }, { t: 'Ports', r: true, w: '7%' }, { t: 'Location', w: '11%' },
            { t: 'System description', w: '20%' }]}
          rows={rows} total={total} rowKey={r => r.name}
          resetKey={`${cls}|${[...stock].sort().join(',')}|${oem ?? ''}|${model ?? ''}`}
          searchPlaceholder="Name, IP address, serial" filters={FILTERS}
          onRefresh={() => setRefreshKey(k => k + 1)}
          rowActions={rowActions}
          renderRow={(r, i) => {
            const [tot, used] = portsOf(cls, i);
            const [label, tone] = RSTATE[r.st];
            return [
              <Chip tone={tone}>{label}</Chip>,
              <>{cls === 'router'
                ? <button className="nst-btn nst-btn--xs nst-btn--ghost" style={{ padding: 0, fontWeight: 500 }}
                    onClick={() => nav(`/inventory/resource/${encodeURIComponent(r.name)}`)}>{r.name}</button>
                : <span className="vw-value">{r.name}</span>}<Sub mono>{r.ip}</Sub></>,
              <><Mono>{r.model}</Mono><Sub>{r.oem}</Sub></>,
              <Mono>{r.os}</Mono>,
              <Mono>{r.sn}</Mono>,
              r.region,
              tot ? <span className="row vw-gap-sm vw-justify-end vw-nowrap">
                      <span className="hbar-track" style={{ width: '3rem', height: 7 }}>
                        <span className="hbar-fill" style={{ display: 'block', width: `${(used / tot * 100).toFixed(0)}%`,
                          background: cv(used / tot > 0.85 ? 'red' : used / tot > 0.7 ? 'amber' : 'emerald', 400) }} />
                      </span>{used}/{tot}</span> : '—',
              <Mono>{r.loc}</Mono>,
              <Sub mono>
                {/* a percentage column width only caps this cell while the
                    table's own layout stays within the viewport — other
                    nowrap cells (e.g. long device names) can still force
                    table-layout:auto to grow the whole table, and this
                    column with it. A pixel maxWidth on the text itself is
                    the only thing that reliably truncates regardless. */}
                <span style={{ display: 'block', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.sysDescr}>
                  {r.sysDescr}
                </span>
              </Sub>
            ];
          }}
        />
      </Card>
    </div>
  );
}
