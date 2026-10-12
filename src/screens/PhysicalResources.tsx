import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, Sub, TabBar, cv } from '../components/ui';
import { DcDeviceDrawer, REC_OF_DISCOVERY, uRange } from '../components/dc/DcDeviceDrawer';
import { GpuOverview } from '../components/dc/GpuOverview';
import {
  DC_COUNTS, DC_ROLE_BY_TAB, GPU_STATE, dcShort, dcTabCount, loadDevices, loadFacilities, loadGpu, useLoaded,
  type DcDevice, type DcFacility, type DcGpuData, type DcGpuNode, type DcTab
} from '../data/dc';
import '../styles/dc-inventory.css';
import { isDatacenter } from '../solution';
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
   ?solution=datacenter: only the data centers' records from src/data/dc, in their seven classes
   (Firewall, Storage and GPU exist only there). eNodeB and gNodeB stay as tabs; the data centers
   hold none, so they are empty. */
type PhyTab = NeClass | DcTab;
const DEFAULT_TABS: PhyTab[] = ['router', 'switch', 'server', 'dwdm', 'enodeb', 'gnodeb'];
const DC_TABS: PhyTab[] = ['router', 'switch', 'server', 'dwdm', 'firewall', 'storage', 'gpu', 'enodeb', 'gnodeb'];
const NEW_NAME: Partial<Record<PhyTab, string>> = { firewall: 'Firewall', storage: 'Storage', gpu: 'GPU' };
const isNe = (c: PhyTab): c is NeClass => (NE_CLASSES as string[]).includes(c);
const isDcTab = (c: PhyTab): c is DcTab => c in DC_ROLE_BY_TAB;

const STOCK_OF: Record<DcDevice['lifecycle'], StockState> = { Ready: 'deployed', Planned: 'planned', Maintenance: 'faulty', Decommissioning: 'deployed' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const gpuModelOf = (d: DcDevice) => d.model.match(/\(8×([^)]+)\)/)?.[1] ?? '—';
const loadNone = () => Promise.resolve<DcGpuData | null>(null);
const loadNoFacilities = () => Promise.resolve<DcFacility[] | null>(null);
const loadNoDevices = () => Promise.resolve<DcDevice[] | null>(null);

function dcRow(dev: DcDevice, fac: DcFacility, node?: DcGpuNode): Row {
  return {
    st: REC_OF_DISCOVERY[dev.discovery], name: dev.name, ip: dev.ip, model: dev.model, os: dev.os, sn: dev.serial, oem: dev.vendor, loc: dev.dcId,
    s: 'd', stock: STOCK_OF[dev.lifecycle], v: null, city: fac.city, state: fac.state, region: cap(fac.regionId) as Region,
    sysDescr: `${dcShort(dev.rackId, dev.dcId)} · ${uRange(dev)} · ${dev.os}`, dc: { dev, fac, node }
  };
}

const FILTERS = [
  { n: 'Status', o: ['Verified', 'Drifted', 'Stale', 'Missing', 'Not discovered'] },
  { n: 'Name' }, { n: 'IP address' }, { n: 'Model' }, { n: 'Vendor', o: ['CISCO', 'JUNIPER', 'NOKIA', 'ERICSSON', 'HUAWEI', 'ADVA', 'CIENA', 'HPE', 'DELL', 'SUPERMICRO', 'PURE', 'NETAPP', 'FORTINET', 'NVIDIA', 'INTEL', 'ARISTA'] },
  { n: 'OS version' }, { n: 'Serial number' }, { n: 'Location' }, { n: 'Region', o: ['North', 'East', 'West', 'South'] }
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
  const gpu = useLoaded<DcGpuData | null>(scoped && cls === 'gpu' ? loadGpu : loadNone);
  const setParam = (k: string, v: string) => { const next = new URLSearchParams(sp); if (v) next.set(k, v); else next.delete(k); setSp(next, { replace: true }); };
  const [openName, setOpenName] = useState<string | null>(null);
  const stockParam = sp.get('stock');
  const stock = useMemo<Set<StockState>>(() => {
    const req = (stockParam ? stockParam.split(',') : []).filter(isActive);
    return new Set(req.length ? req : ACTIVE_STATES);
  }, [stockParam]);
  const [refreshKey, setRefreshKey] = useState(0);

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
    const node = new Map((gpu?.nodes ?? []).map(n => [n.neId, n]));
    return devices.filter(d => d.role === role && (!dcId || d.dcId === dcId) && stock.has(STOCK_OF[d.lifecycle]))
      .map(d => dcRow(d, fac.get(d.dcId)!, node.get(d.id)));
  }, [scoped, devices, facilities, gpu, cls, dcId, stock]);
  const dcRows = dcAll;

  const rows = useMemo(() => [...netRows, ...dcRows], [netRows, dcRows]);
  /* default: the ledger's own count. data center solution: the records in scope (the manifest's
     count until they have loaded) */
  const netCount = scoped || !isNe(cls) ? 0 : oem || model ? netRows.length : phyCount(cls, stock);
  const dcWait = scoped && isDcTab(cls) && !(devices && facilities);
  const dcCount = dcWait ? (dcId ? 0 : dcTabCount(cls)) : dcAll.length;
  const total = netCount + dcCount;
  const open = openName ? rows.find(r => r.name === openName) ?? null : null;

  /* every row on screen belongs to the active class tab, so cls alone decides
     whether Node view belongs in the menu — server has no node-level page.
     Node view and Site info leave this section, so they carry their origin —
     the breadcrumb then reads Resources > Physical Resources > … instead of
     jumping to the Location chain. */
  const FROM = `Resources · Physical Resources?cls=${cls}`;
  const openRack = (r: Row) => r.dc && nav(`/inventory/passive?tab=rack&dc=${encodeURIComponent(r.loc)}&rack=${encodeURIComponent(dcShort(r.dc.dev.rackId, r.loc))}`);
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
    { l: r.dc.dev.role === 'GPU' ? 'GPU details' : 'Device details', onClick: () => setOpenName(r.name) },
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
    next.delete('tab');
    next.delete('drill');
    next.delete('from');
    next.delete('oem');
    next.delete('model');
    next.set('cls', targetClass);
    setSp(next, { replace: true });
  };

  /* GPU servers in scope: the data center picked, or all of them */
  const gpuScope = useMemo(() => {
    if (!gpu) return null;
    const nodes = gpu.nodes.filter(n => !dcId || n.dcId === dcId);
    return { nodes, clusters: gpu.clusters.filter(c => !dcId || c.dcId === dcId) };
  }, [gpu, dcId]);
  const gpuStats = useMemo(() => {
    if (!gpuScope || !devices) return null;
    const n = gpuScope.nodes, st = (k: string) => n.filter(x => x.state === k).length;
    const onRecord = devices.filter(d => d.role === 'GPU' && (!dcId || d.dcId === dcId)).length;
    return [
      { k: 'GPU servers', v: fmt(n.length), s: `${fmt(onRecord)} on record · ${fmt(onRecord - n.length)} planned`, t: 'cyan' as const },
      { k: 'GPUs', v: fmt(n.reduce((a, x) => a + x.gpus.length, 0)), s: '8 per server', t: 'emerald' as const },
      { k: 'In a job', v: fmt(st('in-job')), s: `${fmt(st('idle'))} idle spare`, t: 'sky' as const },
      { k: 'Drained or failed', v: fmt(st('drained') + st('failed')), s: `${fmt(st('failed'))} awaiting RMA`, t: 'red' as const },
      { k: 'Burn-in', v: fmt(st('burn-in')), s: 'new or repaired', t: 'amber' as const },
      { k: 'Liquid-cooled', v: fmt(n.filter(x => x.cooling === 'liquid').length), s: `${fmt(n.filter(x => x.cooling === 'air').length)} air-cooled`, t: 'purple' as const }
    ];
  }, [gpuScope, devices, dcId]);

  /* the data center solution narrows to one data center from a picker; the default view has no such control */
  const sourceControls = scoped ? (
    <span className="dc-filters">
      <span className="nst-select-shell">
        <select className="nst-input" aria-label="Data center" value={dcId} onChange={e => setParam('dc', e.target.value)}>
          <option value="">All data centers ({DC_COUNTS.datacenters})</option>
          {(facilities ?? []).map(f => <option key={f.id} value={f.id}>{f.id} · {f.city}</option>)}
        </select>
      </span>
    </span>
  ) : null;

  const gpuCols = [{ t: 'Status', w: '9%', plain: true }, { t: 'GPU server / IP', w: '16%' }, { t: 'Server model / Vendor', w: '14%' }, { t: 'GPU model', w: '12%' },
    { t: 'Cluster / Cooling', w: '12%' }, { t: 'Rack · U', w: '10%' }, { t: 'Health', w: '8%', plain: true }, { t: 'Power / IB rails', w: '9%' }, { t: 'Location', w: '10%' }];
  const stdCols = [{ t: 'Status', w: '9%', plain: true }, { t: 'Name / IP', w: '16%' }, { t: 'Model / Vendor', w: '12%' }, { t: 'OS version', w: '8%' },
    { t: 'Serial number', w: '10%' }, { t: 'Region', w: '6%' }, { t: 'Ports', r: true, w: '7%' }, { t: 'Location', w: '11%' },
    { t: 'System description', w: '20%' }];
  const rowClick = (r: Row) => { if (r.dc) setOpenName(r.name); else rowActions(r)[0]?.onClick?.(); };

  return (
    <div className="page">
      {cls === 'gpu' && gpuStats && <StatStrip cells={gpuStats} />}
      <Card>
        <TabBar
          tabs={tabs.map(k => {
            const meta = tabMeta(k);
            if (scoped) {
              const n = dcTabCount(k as DcTab), name = meta?.n ?? NEW_NAME[k] ?? k;
              return { k, n: name, count: n, title: `${fmt(n)} ${name.toLowerCase()} records across ${DC_COUNTS.datacenters} data centers` };
            }
            const x = meta!;
            return {
              k, n: x.n, count: phyCount(k as NeClass, stock),
              title: `${fmt(phyCount(k as NeClass, stock))} of ${fmt(x.c + stockCount(k as NeClass, 'decomm'))} ${x.n.toLowerCase()} records in the selected stock states${
                x.disc ? ` · ${fmt(x.disc)} discovered` : ''}`
            };
          })}
          active={cls} onChange={selectTabClass} />

        {cls === 'gpu' && gpuScope && <GpuOverview nodes={gpuScope.nodes} clusters={gpuScope.clusters} scoped={!!dcId} />}

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
          columns={cls === 'gpu' ? gpuCols : stdCols}
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
            if (r.dc && cls === 'gpu') {
              const { dev, node } = r.dc;
              const [sl, st] = node ? GPU_STATE[node.state] : ['Planned', 'info' as const];
              return [
                <Chip tone={st}>{sl}</Chip>,
                <><span className="vw-value">{r.name}</span><Sub mono>{r.ip}</Sub></>,
                <><Mono>{node?.server ?? dev.model}</Mono><Sub>{dev.vendor}</Sub></>,
                <Mono>{node?.model ?? gpuModelOf(dev)}</Mono>,
                node ? <>{node.clusterId.replace(`${node.dcId}-`, '').replace('POD', 'AI-POD')}<Sub>{node.cooling === 'liquid' ? 'Liquid-cooled' : 'Air-cooled'}</Sub></> : '—',
                <Mono>{dcShort(dev.rackId, dev.dcId).replace('RACK-', '')} · {uRange(dev)}</Mono>,
                node ? <Chip tone={node.health === 'healthy' ? 'success' : node.health === 'degraded' ? 'warning' : 'error'}>{cap(node.health)}</Chip> : '—',
                node ? <>{node.powerKw} kW<Sub>{node.ib.filter(x => x.state === 'up').length}/{node.ib.length} up</Sub></> : '—',
                <><Mono>{r.loc}</Mono><Sub>Data center · {r.city}</Sub></>
              ];
            }
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
