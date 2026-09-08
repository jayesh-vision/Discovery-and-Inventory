import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Chip, DrillBar, Mono, Sub, cv } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { REASONS, REGIONS, STATE_DEVICES, VENDORS, filterRegionDevices, type DeviceStatus, type Region, type RegionDevice } from '../data/discovery';

const fmt = (v: number) => v.toLocaleString('en-IN');
const isRegion = (v: string | null | undefined): v is Region => !!v && REGIONS.some(r => r.region === v);
const isStatus = (v: string | null): v is DeviceStatus => v === 'Answered' || v === 'Failed';

/* Every device the region's tile counts, failures included — the tile says
   "636 devices · 52 failed" and this is those 636 rows; with no region (the
   /discovery/insights/devices route) it is every one of the 2,308 polled
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

  const base = useMemo(() => filterRegionDevices({ region }), [region]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(d => {
      if (q && !(d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.model.toLowerCase().includes(q))) return false;
      if (filters.Status && d.status !== filters.Status) return false;
      if (filters.State && d.state !== filters.State) return false;
      if (filters.Vendor && d.vendor !== filters.Vendor) return false;
      if (filters.Model && !d.model.toLowerCase().includes(filters.Model.toLowerCase())) return false;
      if (filters['Failure reason'] && d.reason !== filters['Failure reason']) return false;
      return true;
    });
  }, [base, query, filters]);

  const meta = region ? REGIONS.find(r => r.region === region)! : { total: base.length, fail: base.filter(d => d.status === 'Failed').length };
  const failed = rows.filter(d => d.status === 'Failed').length;
  const reset = () => { setQuery(''); setFilters({}); };
  const title = region ? `${region} region` : 'All circles';


  return (
    <div className="page">
      <DrillBar from={sp.get('from') ?? 'Insights'} label={title}
        onBack={() => nav('/discovery/insights')} onClear={reset} />

      <Card>
        <DataGrid<RegionDevice>
          columns={[{ t: 'Status' }, { t: 'Device name' }, { t: 'IP address' }, { t: 'Region' }, { t: 'State' },
            { t: 'Vendor' }, { t: 'Model' }, { t: 'Failure reason' }, { t: 'Last attempt' }]}
          rows={rows} total={rows.length} rowKey={(d, i) => `${d.name}-${i}`}
          searchPlaceholder="Device, IP, model"
          filters={[
            { n: 'Status', o: ['Answered', 'Failed'] },
            { n: 'State', o: (region ? STATE_DEVICES.filter(s => s.region === region) : STATE_DEVICES).map(s => s.st) },
            { n: 'Vendor', o: VENDORS.map(v => v.n) },
            { n: 'Model' },
            { n: 'Failure reason', o: REASONS.map(r => r.n), h: 'Answered devices have no failure reason.' }
          ]}
          extra={<Chip tone={failed ? 'error' : 'success'}>{fmt(failed)} of {fmt(meta.total)} failed this cycle</Chip>}
          onSearch={setQuery} searchValue={query} onFilterChange={setFilters} onRefresh={reset}
          renderRow={d => [
            <Chip tone={d.status === 'Failed' ? 'error' : 'success'}>{d.status}</Chip>,
            <span className="vw-value">{d.name}</span>,
            <Mono>{d.ip}</Mono>,
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
