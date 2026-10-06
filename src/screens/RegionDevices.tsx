import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip, Sub, cv } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { fmt } from '../data/ledger';
import { DL, REASONS, REGIONS, STATE_DEVICES, VENDORS, filterRegionDevices, type DeviceStatus, type Region, type RegionDevice } from '../data/discovery';

const isRegion = (v: string | null | undefined): v is Region => !!v && REGIONS.some(r => r.region === v);
const isStatus = (v: string | null): v is DeviceStatus => v === 'Answered' || v === 'Failed';

/* Every device the region's tile counts, failures included — the tile says
   "636 devices · 52 failed" and this is those 636 rows; with no region (the
   /discovery/insights/devices route) it is every one of the 3,162 polled
   targets network-wide. status/vendor/model/reason in the URL arrive
   pre-applied — the same query a dashboard count was computed with — so the
   number that was clicked and the rows behind it are never two different
   answers. filterRegionDevices is the same predicate scopeDiscovery uses to
   build those counts. */
export default function RegionDevices() {
  const nav = useNavigate();
  const { region: regionParam } = useParams();
  const [sp] = useSearchParams();
  const region = isRegion(regionParam) ? regionParam : undefined;
  const urlStatus = isStatus(sp.get('status')) ? sp.get('status') as DeviceStatus : undefined;
  const urlVendor = sp.get('vendor') ?? undefined;
  const urlModel = sp.get('model') ?? undefined;
  const urlReasonKey = sp.get('reason') ?? undefined;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (urlStatus) f.Status = urlStatus;
    if (urlVendor) f.Vendor = urlVendor;
    if (urlModel) f.Model = urlModel;
    if (urlReasonKey) { const r = REASONS.find(x => x.k === urlReasonKey); if (r) f['Failure reason'] = r.n; }
    return f;
  });

  /* Refresh re-derives rows from the region's current device store without
     touching search or filters — clearing those is the drill bar's job, not
     this one's. */
  const [refreshKey, setRefreshKey] = useState(0);
  const base = useMemo(() => filterRegionDevices({ region }), [region, refreshKey]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(d => {
      if (q && !(d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.model.toLowerCase().includes(q) ||
        d.sn.toLowerCase().includes(q) || d.loc.toLowerCase().includes(q) || d.city.toLowerCase().includes(q))) return false;
      if (filters.Status && d.status !== filters.Status) return false;
      if (filters.State && d.state !== filters.State) return false;
      if (filters.Vendor && d.vendor !== filters.Vendor) return false;
      if (filters.Model && !d.model.toLowerCase().includes(filters.Model.toLowerCase())) return false;
      if (filters['Failure reason'] && d.reason !== filters['Failure reason']) return false;
      return true;
    });
  }, [base, query, filters]);

  const title = region ? `${region} region` : 'All circles';

  return (
    <div className="page">
      {/* the four regions' polled targets, the same figures the region tiles quote — one click opens that region */}
      {!region && (
        <StatStrip cells={[
          ...REGIONS.map((r, i) => ({
            k: `${r.region} region`, v: fmt(r.total), s: `${fmt(r.fail)} failed`,
            t: (['sky', 'emerald', 'amber', 'purple'] as const)[i],
            onClick: () => nav(`/discovery/insights/region/${r.region}`)
          })),
          { k: 'Total targets', v: fmt(DL.targets), s: `${fmt(DL.runFull + DL.runPartial)} answered · ${fmt(DL.runFail)} failed`, t: 'slate' as const }
        ]} />
      )}
      <Card>
        <DataGrid<RegionDevice> chipWidth="auto"
          columns={[{ t: 'Status', plain: true }, { t: 'Device name' }, { t: 'IP address' }, { t: 'Serial number' }, { t: 'Location' }, { t: 'Region' }, { t: 'State' },
            { t: 'Vendor' }, { t: 'Model' }, { t: 'Failure reason' }, { t: 'Last attempt' }]}
          rows={rows} total={rows.length} rowKey={(d, i) => `${d.name}-${i}`}
          resetKey={`${region ?? ''}|${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Hostname, IP, serial, location"
          filters={[
            { n: 'Status', o: ['Answered', 'Failed'] },
            { n: 'State', o: (region ? STATE_DEVICES.filter(s => s.region === region) : STATE_DEVICES).map(s => s.st) },
            { n: 'Vendor', o: VENDORS.map(v => v.n) },
            { n: 'Model' },
            { n: 'Failure reason', o: REASONS.map(r => r.n), h: 'Answered devices have no failure reason.' }
          ]}
          onSearch={setQuery} searchValue={query} onFilterChange={setFilters} onRefresh={() => setRefreshKey(k => k + 1)}
          renderRow={d => [
            <Chip tone={d.status === 'Failed' ? 'error' : 'success'}>{d.status}</Chip>,
            <span className="vw-value">{d.name}</span>,
            <Mono>{d.ip}</Mono>,
            <Mono>{d.sn}</Mono>,
            <Mono>{d.loc}</Mono>,
            d.region,
            d.state,
            d.vendor,
            <Mono>{d.model}</Mono>,
            d.reason ? <span style={{ color: cv('red', 600) }}>{d.reason}</span> : <Sub>—</Sub>,
            <span className="num">{d.last}</span>
          ]}
          emptyText={`No ${title.toLowerCase()} devices match the current search and filters.`}
        />
      </Card>
    </div>
  );
}
