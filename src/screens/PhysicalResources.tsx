import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, DrillBar, Mono, Num, StatStrip, Sub, TabBar, cv } from '../components/ui';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import {
  ACTIVE_STATES, EST, IL, NE_CLASSES, PHY_TABS, RSTATE, SRC, STOCK_ST, classMeta, fmt,
  phyCount, stockCount, stockMeta, type NeClass, type StockState
} from '../data/ledger';
import { complianceOf, eosOf, isActive, PHY, phyRows, portsOf, type NeRow } from '../data/physical';

const FILTERS = [
  { n: 'Status', o: ['Verified', 'Drifted', 'Stale', 'Missing', 'Not discovered'] },
  { n: 'Stock state', o: STOCK_ST.filter(s => s.k !== 'decomm').map(s => s.n) },
  { n: 'Name' }, { n: 'IP address' }, { n: 'Model' }, { n: 'OEM', o: ['CISCO', 'JUNIPER', 'NOKIA', 'ADVA', 'HPE', 'DELL', 'CIENA'] },
  { n: 'OS version' }, { n: 'Location' }, { n: 'Source', o: ['Discovered', 'Planned · CIQ', 'Manual', 'EMS'] }
];

const verCell = (h: number | null) =>
  h === null ? <span style={{ color: cv('gray', 400) }}>never</span>
  : h < 24 ? <Chip tone="success">fresh</Chip>
  : h < 720 ? <Chip tone="warning">{Math.round(h / 24)} d</Chip>
  : <Chip tone="error">{Math.round(h / 720)} mo</Chip>;

const cmpChip = (model: string) => {
  const c = complianceOf(model);
  return c === 'ok' ? <Chip tone="success">Current</Chip> : c === 'behind' ? <Chip tone="warning">Behind</Chip> : <Chip tone="neutral">Unknown</Chip>;
};

const eosCell = (model: string) => {
  const [d, band] = eosOf(model);
  return band === 'past' ? <span style={{ color: cv('red', 700) }}>{d}</span>
    : band === 'soon' ? <span style={{ color: cv('amber', 700) }}>{d}</span>
    : band === 'safe' ? <Num>{d}</Num> : <span style={{ color: cv('gray', 400) }}>—</span>;
};

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
  /* a model belongs to exactly one class — land on it instead of defaulting
     to Router, or a switch model's drill would open to an empty grid */
  const modelClass = model && (['router', 'switch'] as const).find(k => PHY[k].some(r => r.model === model));
  const rawCls: NeClass = isClass(sp.get('cls')) ? (sp.get('cls') as NeClass) : modelClass || 'router';
  const cls: NeClass = discoveryScoped && rawCls !== 'router' && rawCls !== 'switch' ? 'router' : rawCls;
  const tabs = discoveryScoped ? PHY_TABS.filter(t => t.k === 'router' || t.k === 'switch') : PHY_TABS;
  const stockParam = sp.get('stock');
  const stock = useMemo<Set<StockState>>(() => {
    const req = (stockParam ? stockParam.split(',') : []).filter(isActive);
    return new Set(req.length ? req : ACTIVE_STATES);
  }, [stockParam]);
  const drill = sp.get('drill');
  const [refreshKey, setRefreshKey] = useState(0);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp);
    if (v === null) next.delete(k); else next.set(k, v);
    setSp(next, { replace: true });
  };
  const toggleStock = (k: StockState) => {
    const next = new Set(stock);
    if (next.has(k)) { if (next.size > 1) next.delete(k); } else next.add(k);
    set('stock', [...next].join(','));
  };

  const meta = classMeta(cls);
  const rows: NeRow[] = useMemo(() => {
    let r = phyRows(cls, stock);
    if (oem) r = r.filter(x => x.oem.toUpperCase() === oem.toUpperCase());
    if (model) r = r.filter(x => x.model === model);
    return r;
  }, [cls, stock, oem, model, refreshKey]);
  const total = phyCount(cls, stock);
  const notVerified = meta.c - meta.disc;

  const rowActions = (r: NeRow): Action[] => [
    { l: 'Node view', onClick: () => nav(`/inventory/node/${encodeURIComponent(r.name)}`) },
    { l: 'Open element', onClick: () => nav(`/inventory/resource/${encodeURIComponent(r.name)}`) },
    { l: 'Open site', onClick: () => nav(`/inventory/location/site/${r.loc}`) },
    { l: 'View in reconciliation', onClick: () => nav(`/discovery/reconcile?ne=${encodeURIComponent(r.name)}`) },
    { l: 'Copy serial number', onClick: () => { navigator.clipboard?.writeText(r.sn); } }
  ];

  const clearDrill = () => {
    const next = new URLSearchParams(sp);
    next.delete('drill'); next.delete('from'); next.delete('oem'); next.delete('model');
    setSp(next, { replace: true });
  };

  return (
    <div className="page">
      {drill && <DrillBar from={sp.get('from') ?? 'Inventory'} label={drill} onBack={() => nav(-1)} onClear={clearDrill} />}

      <StatStrip cells={[
        { k: 'Network elements', v: fmt(IL.ne), s: 'Router 2,148 · Switch 349 · other 206', t: 'sky' },
        { k: 'Ports used', v: `${(EST.ports.used / EST.ports.total * 100).toFixed(0)}%`, s: `${fmt(EST.ports.free)} free of ${fmt(EST.ports.total)}`, t: 'emerald' },
        { k: 'Behind golden OS', v: fmt(EST.compliance.behind), s: `${fmt(EST.compliance.compliant)} current · ${fmt(EST.compliance.unknown)} unknown`, t: 'amber' },
        { k: 'Past end of sale', v: fmt(EST.eol.past), s: `${fmt(EST.eol.within12)} within 12 months`, t: 'red' },
        { k: 'Spares in store', v: fmt(EST.spares.instore), s: `${fmt(EST.spares.rma)} at RMA · ${fmt(EST.spares.intransit)} in transit`, t: 'purple',
          onClick: () => { set('stock', 'instore'); } },
        { k: 'Decommissioned', v: fmt(stockMeta('decomm').c), s: 'read-only · 2 still answering', t: 'slate',
          onClick: () => nav('/inventory/inactive') }
      ]} />

      <Card>
        <TabBar
          tabs={tabs.map(x => ({
            k: x.k, n: x.n, count: phyCount(x.k, stock), dot: cv(x.disc ? 'emerald' : 'red', 400),
            title: `${fmt(phyCount(x.k, stock))} of ${fmt(x.c + stockCount(x.k, 'decomm'))} ${x.n.toLowerCase()} records in the selected stock states${
              x.disc ? ` · ${fmt(x.disc)} discovered` : ' · no collector reaches this class'}`
          }))}
          active={cls} onChange={k => set('cls', k)} />

        <div className="stock-bar">
          <span className="eyebrow">Stock state</span>
          <div className="stock-chips">
            {STOCK_ST.filter(s => s.k !== 'decomm').map(s => {
              const on = stock.has(s.k);
              return (
                <button key={s.k} className={`stock-chip${on ? ' is-on' : ''}`} onClick={() => toggleStock(s.k)}
                  style={on ? { borderColor: cv(s.tone, 400), background: cv(s.tone, 50) } : undefined}
                  title={`${fmt(stockCount(cls, s.k))} ${meta.n.toLowerCase()} records · ${fmt(s.c)} across the whole estate`}>
                  <span className="legend-sw" style={{ background: cv(s.tone, 400) }} />{s.n}
                  <span className="tab-n num">{fmt(stockCount(cls, s.k))}</span>
                </button>
              );
            })}
          </div>
          <span className="grow" />
          <div className="stock-presets row">
            <button className="nst-btn nst-btn--xs" onClick={() => set('stock', null)}>Select all</button>
            <button className="nst-btn nst-btn--xs" onClick={() => nav(`/inventory/inactive?cls=${cls}`)}>
              {fmt(stockCount(cls, 'decomm'))} decommissioned →
            </button>
          </div>
        </div>

        <DataGrid<NeRow>
          columns={[{ t: 'Status' }, { t: 'Stock state' }, { t: 'Name / IP' }, { t: 'Model / OEM' }, { t: 'OS version' },
            { t: 'Ports', r: true }, { t: 'End of sale' }, { t: 'Location' }, { t: 'Source · verified' }]}
          rows={rows} total={total} rowKey={r => r.name}
          searchPlaceholder="Name, IP address, serial" filters={FILTERS}
          extra={meta.disc === 0
            ? <Chip tone="error">No collector defined for this class</Chip>
            : <Chip tone="warning">{fmt(notVerified)} of {fmt(meta.c)} not verified</Chip>}
          gridActions={[
            { l: 'View decommissioned', onClick: () => nav(`/inventory/inactive?cls=${cls}`) }
          ]}
          onRefresh={() => setRefreshKey(k => k + 1)}
          rowActions={rowActions}
          renderRow={(r, i) => {
            const sk = stockMeta(r.stock);
            const [tot, used] = portsOf(cls, i);
            const [label, tone] = RSTATE[r.st];
            const [srcLabel, srcTone] = SRC[r.s];
            return [
              <Chip tone={tone}>{label}</Chip>,
              <Chip tone={sk.chip}>{sk.n}</Chip>,
              <>{cls === 'router'
                ? <button className="nst-btn nst-btn--xs nst-btn--ghost" style={{ padding: 0, fontWeight: 500 }}
                    onClick={() => nav(`/inventory/resource/${encodeURIComponent(r.name)}`)}>{r.name}</button>
                : <span className="vw-value">{r.name}</span>}<Sub mono>{r.ip}</Sub></>,
              <><Mono>{r.model}</Mono><Sub>{r.oem}</Sub></>,
              <><Mono>{r.os}</Mono><Sub>{cmpChip(r.model)}</Sub></>,
              tot ? <span className="row vw-gap-sm vw-justify-end vw-nowrap">
                      <span className="hbar-track" style={{ width: '3rem', height: 7 }}>
                        <span className="hbar-fill" style={{ display: 'block', width: `${(used / tot * 100).toFixed(0)}%`,
                          background: cv(used / tot > 0.85 ? 'red' : used / tot > 0.7 ? 'amber' : 'emerald', 400) }} />
                      </span>{used}/{tot}</span> : '—',
              eosCell(r.model),
              <Mono>{r.loc}</Mono>,
              <span className="row vw-nowrap" style={{ gap: 'var(--vw-space-xxs)' }}>
                <Chip tone={srcTone}>{srcLabel}</Chip>{verCell(r.v)}
              </span>
            ];
          }}
        />
      </Card>
    </div>
  );
}
