import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, Num, StatStrip, Sub, TabBar } from '../components/ui';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import { INACTIVE_TABS, DC_INACTIVE_TABS, fmt, stockMeta, type InactiveTab } from '../data/ledger';
import { DECOMM_OLDEST, DECOMM_ZOMBIES, decommRows, type ArchiveRow } from '../data/archive';
import { currentGeo, type DcGeo } from '../solution';
import { isScoped } from '../data/dc/scope';

type InactiveTabKey = InactiveTab | 'all';

const DC_REASONS = [
  'Hardware refresh: upgraded to Sapphire Rapids',
  'Upgraded fabric to 400G Quantum-2 NDR',
  'End of 3-year hardware lease, returned to OEM',
  'Storage pool evacuated to NVMe-oF FlashArray//X',
  'Border gateway migration to 400G PTX10001',
  'Perimeter firewall upgraded to PA-5450',
  'Upgraded metro DCI transponder to 800G Waveserver 5',
  'Motherboard failure / RMA exchange complete',
  'Consolidated into high-density liquid-cooled rack'
];

const FILTERS = [
  { n: 'Name' }, { n: 'Serial number' }, { n: 'Model' },
  { n: 'Vendor', o: ['CISCO', 'JUNIPER', 'NOKIA', 'HPE', 'DELL', 'NVIDIA', 'ARISTA', 'PURE STORAGE', 'PALO ALTO', 'SUPERMICRO', 'LENOVO'] },
  { n: 'Reason', o: ['End of life', 'End of support', 'Faulty, returned to OEM', 'Site consolidation', 'Capacity migration', 'Hardware refresh'] },
  { n: 'Decommissioned after' }, { n: 'Workorder' },
  { n: 'Discovery', o: ['Silent', 'Still answering'], h: 'A decommissioned unit that still answers is a reconciliation exception.' }
];

const DC_FILTERS = [
  { n: 'Name' }, { n: 'Serial number' }, { n: 'Model' },
  { n: 'Vendor', o: ['CISCO', 'JUNIPER', 'NOKIA', 'HPE', 'DELL', 'NVIDIA', 'ARISTA', 'PURE STORAGE', 'PALO ALTO', 'SUPERMICRO', 'LENOVO'] },
  { n: 'Reason', o: DC_REASONS },
  { n: 'Decommissioned after' }, { n: 'Workorder' },
  { n: 'Discovery', o: ['Silent', 'Still answering'], h: 'A decommissioned unit that still answers is a reconciliation exception.' }
];

export default function InactiveInventory() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const dcMode = isScoped();
  const activeGeo: DcGeo = (sp.get('geo') as DcGeo) || (dcMode ? (currentGeo() || 'us') : 'in');

  const tabsList: { k: InactiveTabKey; n: string }[] = useMemo(() => {
    return dcMode
      ? [{ k: 'all' as InactiveTabKey, n: 'All' }, ...DC_INACTIVE_TABS]
      : INACTIVE_TABS;
  }, [dcMode]);

  const isTab = (v: string | null): v is InactiveTabKey => !!v && tabsList.some(t => t.k === v);
  const rawCls = sp.get('cls');
  const cls: InactiveTabKey = isTab(rawCls) ? rawCls : tabsList[0].k;

  /* Refresh has no server round-trip to make in this build (no backend), so
     "reload" means re-deriving rows from the archive's current in-memory
     state — the same store any restore/purge action already writes to —
     without touching cls, search or filters. */
  const [refreshKey, setRefreshKey] = useState(0);
  const rows = useMemo(() => decommRows(cls, activeGeo), [cls, refreshKey, dcMode, activeGeo]);
  const total = rows.length;

  const urlSearch = sp.get('search') || sp.get('q') || '';
  const [search, setSearch] = useState(() => urlSearch);

  useEffect(() => {
    const q = sp.get('search') || sp.get('q') || '';
    if (q !== search) {
      setSearch(q);
    }
  }, [sp]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.sn && r.sn.toLowerCase().includes(q)) ||
      (r.model && r.model.toLowerCase().includes(q)) ||
      (r.oem && r.oem.toLowerCase().includes(q)) ||
      (r.loc && r.loc.toLowerCase().includes(q)) ||
      (r.why && r.why.toLowerCase().includes(q)) ||
      (r.wo && r.wo.toLowerCase().includes(q)) ||
      (r.neType && r.neType.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const tabCounts = useMemo(() => {
    return Object.fromEntries(tabsList.map(t => [t.k, decommRows(t.k, activeGeo).length]));
  }, [tabsList, refreshKey, dcMode, activeGeo]);

  const setCls = (k: InactiveTabKey) => {
    const n = new URLSearchParams(sp);
    n.set('cls', k);
    setSp(n, { replace: true });
  };
  const toExceptions = () => nav(`/discovery/reconcile/exceptions?state=${encodeURIComponent('Rogue')}`);

  const rowActions = (r: ArchiveRow): Action[] =>
    r.zombie ? [{ l: 'Open reconciliation exception', onClick: toExceptions }] : [];

  const columns = useMemo(() => {
    if (cls === 'all') {
      return [
        { t: 'Name' },
        { t: 'NE Type' },
        { t: 'Model / Vendor' },
        { t: 'Serial number' },
        { t: 'Last IP / location' },
        { t: 'Decommissioned' },
        { t: 'Reason' },
        { t: 'Authorised by' },
        { t: 'Discovery' }
      ];
    }
    return [
      { t: 'Name' },
      { t: 'Model / Vendor' },
      { t: 'Serial number' },
      { t: 'Last IP / location' },
      { t: 'Decommissioned' },
      { t: 'Reason' },
      { t: 'Authorised by' },
      { t: 'Discovery' }
    ];
  }, [cls]);

  return (
    <div className="page">
      <StatStrip cells={[
        { k: 'Decommissioned NE', v: fmt(dcMode ? 106 : stockMeta('decomm').c), s: 'removed from active estate', t: 'slate' },
        { k: 'Still answering discovery', v: String(dcMode ? 2 : DECOMM_ZOMBIES), s: 'written off, yet on network', t: 'red' },
        { k: 'Retired links', v: fmt(dcMode ? 16 : 1188), s: 'adjacency no longer seen', t: 'amber' },
        { k: 'Retired services', v: fmt(dcMode ? 14 : 264), s: 'no longer provisioned', t: 'purple' },
        { k: 'Oldest record', v: dcMode ? '3y 8mo' : DECOMM_OLDEST, s: 'archived record', t: 'cyan' },
        { k: 'Recovered to store', v: fmt(dcMode ? (activeGeo === 'in' ? 20 : 24) : 38), s: 'restored in last 12 months', t: 'emerald' }
      ]} />

      <Card>
        <TabBar
          tabs={tabsList.map(x => ({ k: x.k, n: x.n, count: tabCounts[x.k] || 0, title: `Decommissioned ${x.n.toLowerCase()} records` }))}
          active={cls} onChange={setCls as any} />

        <DataGrid<ArchiveRow> chipWidth="auto"
          key={cls}
          columns={columns}
          rows={filteredRows} total={total} rowKey={r => r.sn || r.name} resetKey={cls}
          searchValue={search}
          onSearch={setSearch}
          searchPlaceholder="Name, serial number, workorder, Vendor"
          filters={dcMode ? DC_FILTERS : FILTERS}
          onRefresh={() => setRefreshKey(k => k + 1)}
          rowActions={rowActions}
          autoResetFilter
          renderRow={r => cls === 'all' ? [
            <><span className="vw-value">{r.name}</span><span className="ro-lock" style={{ display: 'none' }} /></>,
            <span className="mono" style={{ fontWeight: 600, color: 'var(--vw-color-slate-700)' }}>{r.neType || (r.cls ? r.cls.toUpperCase() : 'NE')}</span>,
            <><Mono>{r.model}</Mono><Sub>{r.oem}</Sub></>,
            <Mono>{r.sn}</Mono>,
            <><Mono>{r.ip}</Mono><Sub mono>{r.loc}</Sub></>,
            <><Num>{r.on}</Num><Sub mono>{r.wo}</Sub></>,
            <span className="vw-card-description">{r.why}</span>,
            r.by,
            r.zombie ? <Chip tone="error">Still answering</Chip> : <Chip tone="neutral">Silent</Chip>
          ] : [
            <><span className="vw-value">{r.name}</span><span className="ro-lock" style={{ display: 'none' }} /></>,
            <><Mono>{r.model}</Mono><Sub>{r.oem}</Sub></>,
            <Mono>{r.sn}</Mono>,
            <><Mono>{r.ip}</Mono><Sub mono>{r.loc}</Sub></>,
            <><Num>{r.on}</Num><Sub mono>{r.wo}</Sub></>,
            <span className="vw-card-description">{r.why}</span>,
            r.by,
            r.zombie ? <Chip tone="error">Still answering</Chip> : <Chip tone="neutral">Silent</Chip>
          ]}
        />
      </Card>
    </div>
  );
}
