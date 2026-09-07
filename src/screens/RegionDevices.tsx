import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Chip, DrillBar, Mono, Sub, cv } from '../components/ui';
import { DataGrid, type Action } from '../components/grid/DataGrid';
import { REASONS, REGIONS, STATE_DEVICES, VENDORS, devicesIn, type Region, type RegionDevice } from '../data/discovery';

const fmt = (v: number) => v.toLocaleString('en-IN');
const isRegion = (v: string | undefined): v is Region => !!v && REGIONS.some(r => r.region === v);

/* Every device the region's tile counts, failures included — the tile says
   "636 devices · 52 failed" and this is those 636 rows. Nothing else on the
   screen: the reader came here for the list. */
export default function RegionDevices() {
  const nav = useNavigate();
  const { region } = useParams();
  const [sp] = useSearchParams();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const all = useMemo(() => (isRegion(region) ? devicesIn(region) : []), [region]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(d => {
      if (q && !(d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.model.toLowerCase().includes(q))) return false;
      if (filters.Status && d.status !== filters.Status) return false;
      if (filters.State && d.state !== filters.State) return false;
      if (filters.Vendor && d.vendor !== filters.Vendor) return false;
      if (filters.Model && !d.model.toLowerCase().includes(filters.Model.toLowerCase())) return false;
      if (filters['Failure reason'] && d.reason !== filters['Failure reason']) return false;
      return true;
    });
  }, [all, query, filters]);

  /* an unknown region in the URL is not an error worth a screen of its own */
  if (!isRegion(region)) return <Navigate to="/discovery/insights" replace />;

  const meta = REGIONS.find(r => r.region === region)!;
  const failed = rows.filter(d => d.status === 'Failed').length;
  const reset = () => { setQuery(''); setFilters({}); };

  const rowActions = (d: RegionDevice): Action[] => [
    { l: 'View target', onClick: () => nav(`/discovery/targets/${encodeURIComponent(d.name)}`) },
    { l: 'Open element', onClick: () => nav(`/inventory/resource/${encodeURIComponent(d.name)}`) },
    { l: 'Re-run discovery for this IP', onClick: () => alert(`Discovery re-run queued for ${d.ip}.`) },
    { l: 'Change credential profile' },
    { l: 'Copy IP address', onClick: () => { navigator.clipboard?.writeText(d.ip); } }
  ];

  return (
    <div className="page">
      <DrillBar from={sp.get('from') ?? 'Insights'} label={`${region} region`}
        onBack={() => nav('/discovery/insights')} onClear={reset} />

      <Card>
        <DataGrid<RegionDevice>
          columns={[{ t: 'Status' }, { t: 'Device name' }, { t: 'IP address' }, { t: 'State' },
            { t: 'Vendor' }, { t: 'Model' }, { t: 'Failure reason' }, { t: 'Last attempt' }]}
          rows={rows} total={rows.length} rowKey={(d, i) => `${d.name}-${i}`}
          searchPlaceholder="Device, IP, model"
          filters={[
            { n: 'Status', o: ['Answered', 'Failed'] },
            { n: 'State', o: STATE_DEVICES.filter(s => s.region === region).map(s => s.st) },
            { n: 'Vendor', o: VENDORS.map(v => v.n) },
            { n: 'Model' },
            { n: 'Failure reason', o: REASONS.map(r => r.n), h: 'Answered devices have no failure reason.' }
          ]}
          extra={<Chip tone={failed ? 'error' : 'success'}>{fmt(failed)} of {fmt(meta.total)} failed this cycle</Chip>}
          onSearch={setQuery} searchValue={query} onFilterChange={setFilters} onRefresh={reset}
          gridActions={[
            { l: 'Re-run discovery for this region', primary: true, onClick: () => alert(`Discovery re-run queued for ${fmt(meta.total)} ${region} targets.`) },
            { l: 'Download report', onClick: () => alert(`Preparing the ${region} device report for download…`) }
          ]}
          rowActions={rowActions}
          renderRow={d => [
            <Chip tone={d.status === 'Failed' ? 'error' : 'success'}>{d.status}</Chip>,
            <span className="vw-value">{d.name}</span>,
            <Mono>{d.ip}</Mono>,
            d.state,
            d.vendor,
            <Mono>{d.model}</Mono>,
            d.reason ? <span style={{ color: cv('red', 600) }}>{d.reason}</span> : <Sub>—</Sub>,
            <span className="num">{d.last}</span>
          ]}
          emptyText={`No ${region} devices match the current search and filters.`}
        />
      </Card>
    </div>
  );
}
