import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Chip, DomainDot, StatStrip, Sub } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import {
  DISCREPANCY_TYPES, DOMAIN_LABEL, DOMAIN_OPTIONS, domainFilterMatches, parseDomainKey,
  type DiscrepancyCategory, type AgeBand
} from '../data/discoveryOverview';
import { DOMAIN_DEVICES, type DomainDevice } from '../data/domainDevices';

const CATEGORIES: DiscrepancyCategory[] = ['EXISTENCE', 'ATTRIBUTE', 'RELATIONSHIP', 'FRESHNESS'];
const AGE_BANDS: AgeBand[] = ['<1h', '1-24h', '1-7d', '7-30d', '>30d'];
const AGE_LABEL: Record<AgeBand, string> = { '<1h': '< 1h', '1-24h': '1–24h', '1-7d': '1–7d', '7-30d': '7–30d', '>30d': '> 30d' };

const isCategory = (v: string | null): v is DiscrepancyCategory => !!v && (CATEGORIES as string[]).includes(v);
const isAgeBand = (v: string | null): v is AgeBand => !!v && (AGE_BANDS as string[]).includes(v);
const normAge = (s?: string) => (s ?? '').replace(/[–—\s]/g, '-').toLowerCase();

interface DiscrepancyDeviceRow extends DomainDevice {
  category: DiscrepancyCategory;
  ageBand: AgeBand;
}

const typeByLabel = new Map(DISCREPANCY_TYPES.map(t => [t.label, t]));

export default function DiscrepancyDetails() {
  const [sp] = useSearchParams();
  /* ?domain= accepts the key, either label or the URL slug (see parseDomainKey) */
  const urlDomain = parseDomainKey(sp.get('domain'));
  const urlCategory = isCategory(sp.get('category')) ? sp.get('category') as DiscrepancyCategory : undefined;
  const urlAge = isAgeBand(sp.get('age')) ? sp.get('age') as AgeBand : undefined;
  const urlQ = sp.get('q') ?? '';

  const defaultFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (urlDomain) f.Domain = DOMAIN_LABEL[urlDomain];
    if (urlCategory) f.Category = urlCategory;
    if (urlAge) f.Age = AGE_LABEL[urlAge];
    return f;
  }, [urlDomain, urlCategory, urlAge]);

  const [query, setQuery] = useState(urlQ);
  const [filters, setFilters] = useState<Record<string, string>>(defaultFilters);

  /* Whenever the URL params change (or when navigating to the screen), reset filters & query */
  useEffect(() => {
    setFilters(defaultFilters);
    setQuery(urlQ);
  }, [defaultFilters, urlQ]);

  const handleFilterChange = (newFilters: Record<string, string>) => {
    if (!newFilters || Object.keys(newFilters).length === 0) {
      setFilters(defaultFilters);
    } else {
      setFilters(newFilters);
    }
  };

  const allOpenDevices = useMemo<DiscrepancyDeviceRow[]>(() => {
    return DOMAIN_DEVICES
      .filter(d => d.status === 'Open')
      .map(d => {
        const t = typeByLabel.get(d.issue);
        return {
          ...d,
          category: t?.category ?? 'EXISTENCE',
          ageBand: t?.ageBand ?? '<1h'
        };
      });
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOpenDevices.filter(d => {
      if (q && !(d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.issue.toLowerCase().includes(q) || d.region.toLowerCase().includes(q))) return false;
      if (!domainFilterMatches(d.domain, filters.Domain)) return false;
      if (filters.Category && d.category !== filters.Category) return false;
      if (filters.Age && normAge(AGE_LABEL[d.ageBand]) !== normAge(filters.Age) && normAge(d.ageBand) !== normAge(filters.Age)) return false;
      return true;
    });
  }, [allOpenDevices, query, filters]);

  const total = allOpenDevices.length;
  const shown = rows.length;

  return (
    <div className="page">
      <StatStrip cells={[
        { k: 'Open discrepancies', v: String(total), s: 'across every domain', t: 'sky' },
        { k: 'Shown here', v: String(shown), s: `${shown} of ${total} open discrepancies`, t: 'purple' }
      ]} />
      <Card>
        <DataGrid<DiscrepancyDeviceRow> chipWidth="auto"
          columns={[
            { t: 'Device' },
            { t: 'Discrepancy type' },
            { t: 'Domain' },
            { t: 'Category' },
            { t: 'Age' },
            { t: 'Last scan' }
          ]}
          rows={rows} total={rows.length} rowKey={d => d.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Device, IP, discrepancy type..."
          filters={[
            { n: 'Domain', o: DOMAIN_OPTIONS },
            { n: 'Category', o: CATEGORIES },
            { n: 'Age', o: AGE_BANDS.map(a => AGE_LABEL[a]) }
          ]}
          onSearch={setQuery} searchValue={query} onFilterChange={handleFilterChange}
          renderRow={d => [
            <><span className="vw-value">{d.name}</span><Sub mono>{d.ip}</Sub></>,
            <span className="vw-value">{d.issue}</span>,
            <DomainDot domain={d.domain} />,
            <Chip tone="neutral">{d.category}</Chip>,
            <span className="vw-card-metric-label-sub">{AGE_LABEL[d.ageBand]}</span>,
            <span className="num">{d.lastScan}</span>
          ]}
        />
      </Card>
    </div>
  );
}

