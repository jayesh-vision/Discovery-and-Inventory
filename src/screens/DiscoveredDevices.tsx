import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Mono } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { REGIONS, STATE_DEVICES, VENDORS, filterIdentified, type IdentifiedDevice, type Region } from '../data/discovery';

const isRegion = (v: string | null): v is Region => !!v && REGIONS.some(r => r.region === v);

/* The wider identified estate (2,603 devices) behind the state map and the
   vendor table — a separate, larger population than the 2,308 targets this
   cycle polled (identification also comes from topology). state/vendor/model
   in the URL are the same filter scopeDiscovery and this list both run
   through filterIdentified, so "Maharashtra — 233" and this grid's row count
   are never two different numbers. */
export default function DiscoveredDevices() {
  const [sp] = useSearchParams();
  const urlState = sp.get('state') ?? undefined;
  const urlVendor = sp.get('vendor') ?? undefined;
  const urlModel = sp.get('model') ?? undefined;
  const urlRegion = isRegion(sp.get('region')) ? sp.get('region') as Region : undefined;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (urlState) f.State = urlState;
    if (urlVendor) f.Vendor = urlVendor;
    if (urlModel) f.Model = urlModel;
    return f;
  });
  /* Refresh re-derives rows from the identified-devices store as it stands
     right now, without touching the reader's search or filters — clearing
     those is what "Clear filter" (the drill bar) is for, not this. */
  const [refreshKey, setRefreshKey] = useState(0);

  const base = useMemo(() => filterIdentified({ state: urlState, vendor: urlVendor, model: urlModel, region: urlRegion }), [urlState, urlVendor, urlModel, urlRegion, refreshKey]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(d => {
      if (q && !(d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.model.toLowerCase().includes(q))) return false;
      if (filters.State && d.state !== filters.State) return false;
      if (filters.Vendor && d.vendor !== filters.Vendor) return false;
      if (filters.Model && !d.model.toLowerCase().includes(filters.Model.toLowerCase())) return false;
      if (filters.Class && d.cls !== filters.Class.toLowerCase()) return false;
      return true;
    });
  }, [base, query, filters]);

  return (
    <div className="page">
      <Card>
        <DataGrid<IdentifiedDevice>
          columns={[{ t: 'Device name' }, { t: 'IP address' }, { t: 'State' }, { t: 'Region' }, { t: 'Class' }, { t: 'Vendor' }, { t: 'Model' }]}
          rows={rows} total={rows.length} rowKey={(d, i) => `${d.name}-${i}`}
          resetKey={`${urlState ?? ''}|${urlVendor ?? ''}|${urlModel ?? ''}|${urlRegion ?? ''}|${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Device, IP, model"
          filters={[
            { n: 'State', o: (urlRegion ? STATE_DEVICES.filter(s => s.region === urlRegion) : STATE_DEVICES).map(s => s.st) },
            { n: 'Vendor', o: VENDORS.map(v => v.n) },
            { n: 'Model' },
            { n: 'Class', o: ['Router', 'Switch'] }
          ]}
          onSearch={setQuery} searchValue={query} onFilterChange={setFilters} onRefresh={() => setRefreshKey(k => k + 1)}
          renderRow={d => [
            <span className="vw-value">{d.name}</span>, <Mono>{d.ip}</Mono>, d.state, d.region,
            d.cls === 'router' ? 'Router' : 'Switch', d.vendor, <Mono>{d.model}</Mono>
          ]}
          emptyText="No identified devices match the current search and filters."
        />
      </Card>
    </div>
  );
}
