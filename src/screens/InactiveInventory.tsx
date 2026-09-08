import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, Num, StatStrip, Sub, TabBar, cv } from '../components/ui';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import { NE_CLASSES, PHY_TABS, classMeta, fmt, stockCount, stockMeta, type NeClass } from '../data/ledger';
import { DECOMM_OLDEST, DECOMM_ZOMBIES, decommRows, type ArchiveRow } from '../data/archive';

const FILTERS = [
  { n: 'Name' }, { n: 'Serial number' }, { n: 'Model' },
  { n: 'OEM', o: ['CISCO', 'JUNIPER', 'NOKIA', 'ADVA', 'HPE', 'DELL'] },
  { n: 'Reason', o: ['End of life', 'End of support', 'Faulty, returned to OEM', 'Site consolidation', 'Capacity migration', 'Hardware refresh'] },
  { n: 'Decommissioned after' }, { n: 'Workorder' },
  { n: 'Discovery', o: ['Silent', 'Still answering'], h: 'A decommissioned unit that still answers is a reconciliation exception.' }
];

const plural = (n: string) => n.toLowerCase() + (/(ch|sh|s|x|z)$/.test(n.toLowerCase()) ? 'es' : 's');
const isClass = (v: string | null): v is NeClass => !!v && (NE_CLASSES as string[]).includes(v);

export default function InactiveInventory() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const cls: NeClass = isClass(sp.get('cls')) ? (sp.get('cls') as NeClass) : 'router';
  const meta = classMeta(cls);

  const rows = useMemo(() => decommRows(cls), [cls]);
  const total = rows.length;
  const zombies = rows.filter(r => r.zombie).length;

  const setCls = (k: NeClass) => { const n = new URLSearchParams(sp); n.set('cls', k); setSp(n, { replace: true }); };
  const toExceptions = () => nav(`/discovery/reconcile?ne=${encodeURIComponent('Only on network')}`);

  const rowActions = (r: ArchiveRow): Action[] => [
    { l: 'Copy serial number', onClick: () => { navigator.clipboard?.writeText(r.sn); } },
    ...(r.zombie ? [{ l: 'Open reconciliation exception', onClick: toExceptions }] : [])
  ];

  return (
    <div className="page">
      <StatStrip cells={[
        { k: 'Decommissioned NE', v: fmt(stockMeta('decomm').c), s: 'removed from the active estate', t: 'slate' },
        { k: 'Still answering discovery', v: String(DECOMM_ZOMBIES), s: 'written off, yet on the network', t: 'red', onClick: toExceptions },
        { k: 'Retired links', v: fmt(1188), s: 'adjacency no longer seen', t: 'amber', onClick: () => nav('/inventory/links') },
        { k: 'Retired services', v: fmt(264), s: 'no longer provisioned', t: 'purple', onClick: () => nav('/inventory/services') },
        { k: 'Oldest record', v: DECOMM_OLDEST, s: 'retention policy 7 years', t: 'cyan' },
        { k: 'Recovered to store', v: fmt(38), s: 'restored in the last 12 months', t: 'emerald' }
      ]} />

      <Card>
        <TabBar
          tabs={PHY_TABS.map(x => ({ k: x.k, n: x.n, count: stockCount(x.k, 'decomm'), dot: cv('slate', 400),
            title: `${fmt(stockCount(x.k, 'decomm'))} decommissioned ${x.n.toLowerCase()} records` }))}
          active={cls} onChange={setCls} />

        <div className="vw-card-child-shaded row vw-justify-between vw-wrap"
          style={{ marginTop: 'var(--vw-space-lg)', padding: 'var(--vw-space-md)', gap: 'var(--vw-space-md)' }}>
          <span className="vw-card-description">
            <strong>Read-only archive.</strong> {fmt(total)} of the {fmt(stockMeta('decomm').c)} decommissioned records are{' '}
            {plural(meta.n)}. They keep their serial, last IP and last location so a serial search finds a
            written-off unit as easily as a live one.
            {zombies > 0 && <> <strong style={{ color: cv('red', 700) }}>{zombies} still answer discovery</strong> — raised as reconciliation exceptions, not filed away.</>}
          </span>
          {zombies > 0 && <button className="nst-btn nst-btn--xs nst-btn--danger-subtle" style={{ flexShrink: 0 }} onClick={toExceptions}>Open exceptions</button>}
        </div>

        <DataGrid<ArchiveRow>
          columns={[{ t: 'Name' }, { t: 'Model / OEM' }, { t: 'Serial number' }, { t: 'Last IP / location' },
            { t: 'Decommissioned' }, { t: 'Reason' }, { t: 'Authorised by' }, { t: 'Discovery' }]}
          rows={rows} total={total} rowKey={r => r.sn}
          searchPlaceholder="Name, serial number, workorder, OEM" filters={FILTERS}
          extra={<Chip tone="neutral">Archive · read-only</Chip>}
          gridActions={[{ l: 'Go to active inventory', primary: true, onClick: () => nav('/inventory/physical') }]}
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
        <div className="vw-card-footer-divider row vw-justify-between vw-wrap">
          <span className="vw-card-description">Archive is read-only. Restoring a unit to store reopens it in active inventory.</span>
          <span className="vw-card-metric-label-sub">Retention 7 years · purge requires a second approval</span>
        </div>
      </Card>
    </div>
  );
}
