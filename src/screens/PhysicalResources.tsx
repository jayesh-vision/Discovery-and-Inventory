import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, Sub, TabBar, cv } from '../components/ui';
import { DcDeviceDrawer, REC_OF_DISCOVERY, uRange } from '../components/dc/DcDeviceDrawer';
import {
  DC_COUNTS, DC_ROLE_BY_TAB, dcShort, dcTabCount, loadDevices, loadFacilities, useLoaded,
  type DcDevice, type DcFacility, type DcGpuNode, type DcTab
} from '../data/dc';
import '../styles/dc-inventory.css';
import { isDatacenter, currentGeo, withSolution, type DcGeo } from '../solution';
import { SCOPED, dcRegionLabel, dcRegionLabels, dcSumList } from '../data/dc/scope';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import {
  ACTIVE_STATES, NE_CLASSES, PHY_TABS, RSTATE, fmt, hasNodeView, nodeClassName,
  phyCount, stockCount, type NeClass, type StockState
} from '../data/ledger';
import { isActive, PHY, phyRows, portsOf, regionOf, sysDescrOf, type NeRow } from '../data/physical';
import type { Region } from '../data/discovery';
import { legacyPath } from '../routes';
import { loadLegacy } from '../legacy/LegacyView';

/* region and sysDescr are derived, not stored on the ledger row — the grid's
   search/filter only ever looks at literal row properties, so both are baked
   onto each row (see `rows` below) rather than computed inline in renderRow,
   or they'd display but never be findable.
   A data center device (src/data/dc) is shown as a row of the same shape, with
   its own record attached as `dc`; the network estate rows have no `dc`. */
type Row = NeRow & { region: Region; sysDescr: string; dc?: { dev: DcDevice; fac: DcFacility; node?: DcGpuNode } };

/* Two modes (src/solution.ts). Default: the network estate's six classes, exactly as before.
   ?solution=datacenter: the data centers' records from src/data/dc in their classes:
   Router, Switch, Server, Firewall, Storage. eNodeB and gNodeB stay as tabs; the data centers
   hold none, so they are empty. */
type PhyTab = NeClass | DcTab;
const DEFAULT_TABS: PhyTab[] = ['router', 'switch', 'server', 'dwdm', 'enodeb', 'gnodeb'];
const DC_TABS: PhyTab[] = ['router', 'switch', 'server', 'firewall', 'storage'];
const NEW_NAME: Partial<Record<PhyTab, string>> = { firewall: 'Firewall', storage: 'Storage' };
const isNe = (c: PhyTab): c is NeClass => (NE_CLASSES as string[]).includes(c);
const isDcTab = (c: PhyTab): c is DcTab => c in DC_ROLE_BY_TAB;

const STOCK_OF: Record<DcDevice['lifecycle'], StockState> = { Ready: 'deployed', Planned: 'planned', Maintenance: 'faulty', Decommissioning: 'deployed' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const loadNoFacilities = () => Promise.resolve<DcFacility[] | null>(null);
const loadNoDevices = () => Promise.resolve<DcDevice[] | null>(null);

function dcRow(dev: DcDevice, fac: DcFacility, node?: DcGpuNode): Row {
  return {
    st: REC_OF_DISCOVERY[dev.discovery], name: dev.name, ip: dev.ip, model: dev.model, os: dev.os, sn: dev.serial, oem: dev.vendor, loc: dev.dcId,
    s: 'd', stock: STOCK_OF[dev.lifecycle], v: null, city: fac.city, state: fac.state, region: dcRegionLabel(fac) as Region,
    sysDescr: `${dcShort(dev.rackId, dev.dcId)} · ${uRange(dev)} · ${dev.os}`, dc: { dev, fac, node }
  };
}

const FILTERS = [
  { n: 'Status', o: ['Verified', 'Drifted', 'Stale', 'Missing', 'Not discovered'] },
  { n: 'Name' }, { n: 'IP address' }, { n: 'Model' }, { n: 'Vendor', o: ['CISCO', 'JUNIPER', 'NOKIA', 'ERICSSON', 'HUAWEI', 'ADVA', 'CIENA', 'HPE', 'DELL', 'SUPERMICRO', 'PURE', 'NETAPP', 'FORTINET', 'NVIDIA', 'INTEL', 'ARISTA'] },
  { n: 'OS version' }, { n: 'Serial number' }, { n: 'Location' }, { n: 'Region', o: SCOPED ? dcRegionLabels() : ['North', 'East', 'West', 'South'] }
];

const isClassIn = (tabs: PhyTab[], v: string | null): v is PhyTab => !!v && (tabs as string[]).includes(v);

export default function PhysicalResources() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const scoped = isDatacenter();
  const TAB_ORDER = scoped ? DC_TABS : DEFAULT_TABS;
  const isClass = (v: string | null): v is PhyTab => isClassIn(TAB_ORDER, v);

  /* screen state lives in the URL, so drill-downs and reloads land on the same view */
  const oem = sp.get('oem');
  const model = sp.get('model');
  const activeGeo: DcGeo | null = scoped ? currentGeo() : null;
  /* a discovery drill (by vendor or model) only ever concerns Router and Switch —
     the other classes have no collector and never appear in that breakdown */
  const discoveryScoped = !scoped && !!(oem || model);
  const modelClass = model && (['router', 'switch'] as const).find(k => PHY[k].some(r => r.model === model));
  const urlClass = sp.get('cls') || sp.get('tab');
  const savedClass = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ns_phy_tab') : null) as PhyTab | null;
  const rawCls: PhyTab = isClass(urlClass)
    ? urlClass
    : (modelClass || (isClass(savedClass) ? savedClass : PHY_TABS[0].k));
  const cls: PhyTab = discoveryScoped && rawCls !== 'router' && rawCls !== 'switch' ? 'router' : rawCls;

  useEffect(() => {
    if (cls && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ns_phy_tab', cls);
    }
  }, [cls]);

  useEffect(() => {
    if (!urlClass && !discoveryScoped && !modelClass && isClass(savedClass) && savedClass !== 'router') {
      const next = new URLSearchParams(sp);
      next.set('cls', savedClass);
      setSp(next, { replace: true });
    }
  }, [urlClass, discoveryScoped, modelClass, savedClass, setSp, sp]);

  /* Every class is a tab. Server has no node-level digital twin, so its Node
     view stays in the row menu, disabled, rather than the whole class being
     hidden — its elements are real records (96 of them) and searchable here. */
  const tabMeta = (k: PhyTab) => PHY_TABS.find(t => t.k === k);
  const tabs = (discoveryScoped ? TAB_ORDER.filter(k => k === 'router' || k === 'switch') : TAB_ORDER);

  /* data center records: which ones, from where. Source and data center live in
     the URL like the rest of the screen state. */
  const dcId = scoped ? sp.get('dc') ?? '' : '';
  const facilities = useLoaded(scoped ? loadFacilities : loadNoFacilities);
  const devices = useLoaded(scoped ? loadDevices : loadNoDevices);
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (scoped && !next.has('solution')) next.set('solution', 'Datacenter');
    if (activeGeo && !next.has('geo')) next.set('geo', activeGeo);
    if (v) next.set(k, v); else next.delete(k);
    setSp(next, { replace: true });
  };
  const [openName, setOpenName] = useState<string | null>(null);
  const stockParam = sp.get('stock');
  const stock = useMemo<Set<StockState>>(() => {
    const req = (stockParam ? stockParam.split(',') : []).filter(isActive);
    return new Set(req.length ? req : ACTIVE_STATES);
  }, [stockParam]);
  const [refreshKey, setRefreshKey] = useState(0);

  const geoFacs = useMemo(() => {
    if (!facilities) return null;
    return activeGeo ? facilities.filter(f => f.geo === activeGeo) : facilities;
  }, [facilities, activeGeo]);
  const validFacIds = useMemo(() => {
    return geoFacs ? new Set(geoFacs.map(f => f.id)) : null;
  }, [geoFacs]);

  const netRows: Row[] = useMemo(() => {
    if (scoped || !isNe(cls)) return [];
    let r = phyRows(cls, stock);
    if (oem) r = r.filter(x => x.oem.toUpperCase() === oem.toUpperCase());
    if (model) r = r.filter(x => x.model === model);
    return r.map(x => ({ ...x, region: regionOf(x.loc), sysDescr: sysDescrOf(x) }));
  }, [scoped, cls, stock, oem, model, refreshKey]);

  /* every data center row of this class in scope, whatever the Source filter says, so the filter can show its counts */
  const dcAll: Row[] = useMemo(() => {
    if (!scoped || !devices || !facilities || !isDcTab(cls)) return [];
    const role = DC_ROLE_BY_TAB[cls];
    const fac = new Map(facilities.map(f => [f.id, f]));
    return devices.filter(d => d.role === role && (!dcId || d.dcId === dcId) && (!validFacIds || validFacIds.has(d.dcId)) && stock.has(STOCK_OF[d.lifecycle]))
      .map(d => dcRow(d, fac.get(d.dcId)!));
  }, [scoped, devices, facilities, cls, dcId, validFacIds, stock]);
  const dcRows = dcAll;

  const rows = useMemo(() => [...netRows, ...dcRows], [netRows, dcRows]);
  /* default: the ledger's own count. data center solution: the records in scope (the manifest's
     count until they have loaded) */
  const netCount = scoped || !isNe(cls) ? 0 : oem || model ? netRows.length : phyCount(cls, stock);
  const dcExpectedCount = useMemo(() => {
    if (!isDcTab(cls)) return 0;
    if (!activeGeo) return dcTabCount(cls);
    const role = DC_ROLE_BY_TAB[cls];
    return dcSumList(activeGeo).reduce((a, d) => a + (d.byRole[role] ?? 0), 0);
  }, [activeGeo, cls]);
  const dcWait = scoped && isDcTab(cls) && !(devices && facilities);
  const dcCount = dcWait ? (dcId ? 0 : dcExpectedCount) : dcAll.length;
  const total = netCount + dcCount;
  const open = openName ? rows.find(r => r.name === openName) ?? null : null;

  /* every row on screen belongs to the active class tab, so cls alone decides
     whether Node view belongs in the menu — server has no node-level page.
     Node view and Site info leave this section, so they carry their origin —
     the breadcrumb then reads Resources > Physical Resources > … instead of
     jumping to the Location chain. */
  const FROM = `Resources · Physical Resources?cls=${cls}`;
  const openRack = (r: Row) => r.dc && nav(withSolution(`/inventory/passive?tab=rack&dc=${encodeURIComponent(r.loc)}&rack=${encodeURIComponent(dcShort(r.dc.dev.rackId, r.loc))}`));
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
  const rowActions = (r: Row): Action[] => r.dc ? [
    { l: 'Device details', onClick: () => setOpenName(r.name) },
    { l: 'View rack', onClick: () => openRack(r) },
    { l: 'Site info', onClick: () => openSite(r.loc) }
  ] : [
    ...(isNe(cls) && hasNodeView(cls) ? [{ l: 'Node view', onClick: () => nav(legacyPath('node', { label: `${nodeClassName(cls)} · ${r.name}`, from: FROM }, { name: r.name, ip: r.ip })) }] : []),
    ...(cls === 'server' || !isNe(cls) ? [] : [{ l: 'View details', onClick: () => nav(`/inventory/resource/${encodeURIComponent(r.name)}?ip=${encodeURIComponent(r.ip)}&from=${encodeURIComponent(FROM)}`) }]),
    { l: 'Site info', onClick: () => openSite(r.loc) },
    ...(isNe(cls) && hasNodeView(cls) ? [] : [{ l: 'Node view', disabled: true, hint: 'This class has no node-level digital twin' }])
  ];

  const selectTabClass = (targetClass: PhyTab) => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ns_phy_tab', targetClass);
    }
    const next = new URLSearchParams(sp);
    if (scoped && !next.has('solution')) next.set('solution', 'Datacenter');
    if (activeGeo && !next.has('geo')) next.set('geo', activeGeo);
    next.delete('tab');
    next.delete('drill');
    next.delete('oem');
    next.delete('model');
    next.set('cls', targetClass);
    setSp(next, { replace: true });
  };

  /* the data center solution narrows to one data center from a picker; the default view has no such control */
  const totalDcs = geoFacs ? geoFacs.length : (activeGeo ? 24 : DC_COUNTS.datacenters);
  const sourceControls = scoped ? (
    <span className="dc-filters">
      <span className="nst-select-shell">
        <select className="nst-input" aria-label="Data center" value={dcId} onChange={e => setParam('dc', e.target.value)}>
          <option value="">All data centers ({totalDcs})</option>
          {(geoFacs ?? []).map(f => <option key={f.id} value={f.id}>{f.id} · {f.city}</option>)}
        </select>
      </span>
    </span>
  ) : null;

  /* Headline figures for the active class in scope */
  const kpiStats = useMemo(() => {
    const tabName = tabMeta(cls)?.n ?? NEW_NAME[cls] ?? cap(cls);
    if (scoped) {
      if (!devices || !facilities) return null;
      const totalInScope = dcAll.length;
      const ready = dcAll.filter(d => d.stock === 'deployed').length;
      const planned = dcAll.filter(d => d.stock === 'planned').length;
      const maint = dcAll.filter(d => d.stock === 'faulty').length;
      const dcsCount = new Set(dcAll.map(d => d.loc)).size;
      return [
        { k: `${tabName}s`, v: fmt(totalInScope), s: `${fmt(totalInScope)} across ${dcsCount || totalDcs} data centers`, t: 'cyan' as const },
        { k: 'Ready / Active', v: fmt(ready), s: `${fmt(ready)} in service`, t: 'emerald' as const },
        { k: 'Planned', v: fmt(planned), s: `${fmt(planned)} awaiting deployment`, t: 'sky' as const },
        { k: 'Maintenance', v: fmt(maint), s: maint ? `${fmt(maint)} under repair` : '0 under maintenance', t: maint > 0 ? 'amber' as const : 'slate' as const },
        { k: 'Data centers', v: fmt(dcsCount || totalDcs), s: `${activeGeo ? activeGeo.toUpperCase() : 'All'} regions in scope`, t: 'purple' as const },
      ];
    }
    const meta = tabMeta(cls);
    const dep = stockCount(cls as NeClass, 'deployed');
    const ins = stockCount(cls as NeClass, 'instore');
    const pln = stockCount(cls as NeClass, 'planned');
    const flt = stockCount(cls as NeClass, 'faulty');
    const totalRec = phyCount(cls as NeClass, stock);
    return [
      { k: `${tabName}s`, v: fmt(totalRec), s: `${fmt(meta?.c ?? totalRec)} on record`, t: 'cyan' as const },
      { k: 'Deployed', v: fmt(dep), s: 'In active service', t: 'emerald' as const },
      { k: 'In store', v: fmt(ins), s: 'Available spares', t: 'sky' as const },
      { k: 'Planned', v: fmt(pln), s: 'Pending rollout', t: 'purple' as const },
      { k: 'Faulty', v: fmt(flt), s: flt ? `${fmt(flt)} require RMA` : 'No faulty units', t: flt > 0 ? 'red' as const : 'slate' as const },
    ];
  }, [cls, scoped, dcAll, totalDcs, activeGeo, stock, devices, facilities]);

  const stdCols = [{ t: 'Status', w: '9%', plain: true }, { t: 'Name / IP', w: '16%' }, { t: 'Model / Vendor', w: '12%' }, { t: 'OS version', w: '8%' },
    { t: 'Serial number', w: '10%' }, { t: 'Region', w: '6%' }, { t: 'Ports', r: true, w: '7%' }, { t: 'Location', w: '11%' },
    { t: 'System description', w: '20%' }];
  const rowClick = (r: Row) => { if (r.dc) setOpenName(r.name); else rowActions(r)[0]?.onClick?.(); };

  return (
    <div className="page">
      {kpiStats && <StatStrip cells={kpiStats} />}
      <Card>
        <TabBar
          tabs={tabs.map(k => {
            const meta = tabMeta(k);
            if (scoped) {
              const n = dcTabCount(k as DcTab, activeGeo), name = meta?.n ?? NEW_NAME[k] ?? k;
              return { k, n: name, count: n, title: `${fmt(n)} ${name.toLowerCase()} records across ${totalDcs} data centers` };
            }
            const x = meta!;
            return {
              k, n: x.n, count: phyCount(k as NeClass, stock),
              title: `${fmt(phyCount(k as NeClass, stock))} of ${fmt(x.c + stockCount(k as NeClass, 'decomm'))} ${x.n.toLowerCase()} records in the selected stock states${
                x.disc ? ` · ${fmt(x.disc)} discovered` : ''}`
            };
          })}
          active={cls} onChange={selectTabClass} />

        {/* Ports is right-aligned (numeric), so any width beyond its own content
            collects as empty space before it, not after — a wide column here
            reads as a gap before Ports, not real spacing next to Location.
            Sized close to its actual content (bar + "NN/NN") keeps that gap
            from swallowing the boundary with Location. System description is
            a real SNMP sysDescr-length banner (see sysDescrOf) — capped to a
            fixed width and ellipsis-truncated (full text on hover) so it
            can't force the whole table to scroll horizontally. */}
        <DataGrid<Row> chipWidth="auto"
          key={cls}
          columns={stdCols}
          rows={rows} total={total} rowKey={r => r.name}
          resetKey={`${cls}|${[...stock].sort().join(',')}|${oem ?? ''}|${model ?? ''}|${scoped}|${dcId}`}
          searchPlaceholder="Name, IP address, serial" filters={FILTERS} extra={sourceControls}
          emptyText={dcWait ? 'Loading data center records…' : undefined}
          onRowClick={cls === 'gnodeb' ? undefined : rowClick}
          onRefresh={() => setRefreshKey(k => k + 1)}
          /* gNodeB rows carry no actions at all — "View details" and "Site
             info" both apply to every other class, so the whole action
             column (not just its contents) is dropped for this one tab. */
          rowActions={cls === 'gnodeb' ? undefined : rowActions}
          renderRow={(r, i) => {
            const [tot, used] = !isNe(cls) || r.dc ? [0, 0] : portsOf(cls, i);
            const [label, tone] = RSTATE[r.st];
            return [
              <Chip tone={tone}>{label}</Chip>,
              <>{cls === 'router' && !r.dc
                ? <button className="nst-btn nst-btn--xs nst-btn--ghost" style={{ padding: 0, fontWeight: 500 }}
                    onClick={() => nav(`/inventory/resource/${encodeURIComponent(r.name)}?ip=${encodeURIComponent(r.ip)}&from=${encodeURIComponent(FROM)}`)}>{r.name}</button>
                : <span className="vw-value">{r.name}</span>}<Sub mono>{r.ip}{r.ip2 ? ` · ${r.ip2}` : ''}</Sub></>,
              <><Mono>{r.model}</Mono><Sub>{r.oem}</Sub></>,
              <Mono>{r.os}</Mono>,
              <Mono>{r.sn}</Mono>,
              r.region,
              tot ? <span className="row vw-gap-sm vw-justify-end vw-nowrap">
                      <span className="hbar-track" style={{ width: '3rem', height: 7 }}>
                        <span className="hbar-fill" style={{ display: 'block', width: `${(used / tot * 100).toFixed(0)}%`,
                          background: cv(used / tot > 0.85 ? 'red' : used / tot > 0.7 ? 'amber' : 'emerald', 400) }} />
                      </span>{used}/{tot}</span> : '—',
              <>{<Mono>{r.loc}</Mono>}{r.dc && <Sub>Data center · {r.city}</Sub>}</>,
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
      <DcDeviceDrawer device={open?.dc?.dev ?? null} fac={open?.dc?.fac ?? null} node={open?.dc?.node} onClose={() => setOpenName(null)}
        onRack={() => open && openRack(open)} onSite={() => open && openSite(open.loc)} />
    </div>
  );
}
