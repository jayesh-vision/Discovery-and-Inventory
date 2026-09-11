import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, Num, StatStrip, Sub, TabBar } from '../components/ui';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import { INACTIVE_TABS, fmt, stockMeta, type InactiveTab } from '../data/ledger';
import { DECOMM_OLDEST, DECOMM_ZOMBIES, decommRows, type ArchiveRow } from '../data/archive';

const FILTERS = [
  { n: 'Name' }, { n: 'Serial number' }, { n: 'Model' },
  { n: 'Vendor', o: ['CISCO', 'JUNIPER', 'NOKIA', 'ADVA', 'HPE', 'DELL'] },
  { n: 'Reason', o: ['End of life', 'End of support', 'Faulty, returned to OEM', 'Site consolidation', 'Capacity migration', 'Hardware refresh'] },
  { n: 'Decommissioned after' }, { n: 'Workorder' },
  { n: 'Discovery', o: ['Silent', 'Still answering'], h: 'A decommissioned unit that still answers is a reconciliation exception.' }
];

const isTab = (v: string | null): v is InactiveTab => !!v && INACTIVE_TABS.some(t => t.k === v);

export default function InactiveInventory() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const rawCls = sp.get('cls');
  const cls: InactiveTab = isTab(rawCls) ? rawCls : 'router';

  /* Refresh has no server round-trip to make in this build (no backend), so
     "reload" means re-deriving rows from the archive's current in-memory
     state — the same store any restore/purge action already writes to —
     without touching cls, search or filters. */
  const [refreshKey, setRefreshKey] = useState(0);
  const rows = useMemo(() => decommRows(cls), [cls, refreshKey]);
  const total = rows.length;

  const setCls = (k: InactiveTab) => { const n = new URLSearchParams(sp); n.set('cls', k); setSp(n, { replace: true }); };
  const toExceptions = () => nav(`/discovery/reconcile?ne=${encodeURIComponent('Only on network')}`);

  const rowActions = (r: ArchiveRow): Action[] =>
    r.zombie ? [{ l: 'Open reconciliation exception', onClick: toExceptions }] : [];

  return (
    <div className="page">
      <StatStrip cells={[
        { k: 'Decommissioned NE', v: fmt(stockMeta('decomm').c), s: 'removed from active estate', t: 'slate' },
        { k: 'Still answering discovery', v: String(DECOMM_ZOMBIES), s: 'written off, yet on network', t: 'red' },
        { k: 'Retired links', v: fmt(1188), s: 'adjacency no longer seen', t: 'amber' },
        { k: 'Retired services', v: fmt(264), s: 'no longer provisioned', t: 'purple' },
        { k: 'Oldest record', v: DECOMM_OLDEST, s: 'archived record', t: 'cyan' },
        { k: 'Recovered to store', v: fmt(38), s: 'restored in last 12 months', t: 'emerald' }
      ]} />

      <Card>
        <TabBar
          tabs={INACTIVE_TABS.map(x => ({ k: x.k, n: x.n, count: 0, title: `Decommissioned ${x.n.toLowerCase()} records` }))}
          active={cls} onChange={setCls} />

        <DataGrid<ArchiveRow>
          columns={[{ t: 'Name' }, { t: 'Model / Vendor' }, { t: 'Serial number' }, { t: 'Last IP / location' },
            { t: 'Decommissioned' }, { t: 'Reason' }, { t: 'Authorised by' }, { t: 'Discovery' }]}
          rows={rows} total={total} rowKey={r => r.sn} resetKey={cls}
          searchPlaceholder="Name, serial number, workorder, Vendor" filters={FILTERS}
          onRefresh={() => setRefreshKey(k => k + 1)}
          rowActions={rowActions}
          renderRow={r => [
            <><span className="vw-value">{r.name}</span> <span className="ro-lock" title="Read-only">🔒</span></>,
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
