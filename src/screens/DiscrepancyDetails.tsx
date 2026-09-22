import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Chip, DomainDot, StatStrip, Sub } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import {
  DISCREPANCY_TYPES, DOMAIN_LABEL, DOMAIN_OPTIONS, domainFilterMatches, parseDomainKey,
  MATCH_CLASSES, ISSUE_MATCH_CLASS, type MatchClass, type DiscrepancyCategory, type AgeBand
} from '../data/discoveryOverview';
import { DOMAIN_DEVICES, type DomainDevice } from '../data/domainDevices';

const AGE_BANDS: AgeBand[] = ['<1h', '1-24h', '1-7d', '7-30d', '>30d'];
const AGE_LABEL: Record<AgeBand, string> = { '<1h': '< 1h', '1-24h': '1–24h', '1-7d': '1–7d', '7-30d': '7–30d', '>30d': '> 30d' };

const isAgeBand = (v: string | null): v is AgeBand => !!v && (AGE_BANDS as string[]).includes(v);
const normAge = (s?: string) => (s ?? '').replace(/[–—\s]/g, '-').toLowerCase();

interface DiscrepancyDeviceRow extends DomainDevice {
  category: DiscrepancyCategory;
  matchClass: MatchClass;
  ageBand: AgeBand;
}

const typeByLabel = new Map(DISCREPANCY_TYPES.map(t => [t.label, t]));

export default function DiscrepancyDetails() {
  const [sp] = useSearchParams();
  /* ?domain= accepts the key, either label or the URL slug (see parseDomainKey) */
  const urlDomain = parseDomainKey(sp.get('domain'));
  const urlAge = isAgeBand(sp.get('age')) ? sp.get('age') as AgeBand : undefined;

  const rawMatchClass = sp.get('matchClass') ?? '';
  const urlMatchClass = MATCH_CLASSES.find(c => c.toLowerCase() === rawMatchClass.trim().toLowerCase());
  const rawCategory = sp.get('category') ?? '';

  const rawType = sp.get('type') ?? '';
  const rawQ = sp.get('q') ?? '';
  const matchedType = DISCREPANCY_TYPES.find(t =>
    t.label.toLowerCase() === rawType.trim().toLowerCase() ||
    t.label.toLowerCase() === rawQ.trim().toLowerCase()
  );
  const urlType = matchedType ? matchedType.label : (rawType ? rawType : undefined);
  /* Search box must be empty when navigating to a specific discrepancy type or match class */
  const urlQ = matchedType || urlMatchClass ? '' : rawQ;

  const defaultFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (urlType) f['Discrepancy type'] = urlType;
    if (urlDomain) f.Domain = DOMAIN_LABEL[urlDomain];
    if (urlMatchClass) {
      f['Match class'] = urlMatchClass;
    } else if (rawCategory) {
      if (rawCategory.toUpperCase() === 'ATTRIBUTE') f['Match class'] = 'Attribute mismatch';
      else if (rawCategory.toUpperCase() === 'RELATIONSHIP') f['Match class'] = 'Relationship drift';
    }
    if (urlAge) f.Age = AGE_LABEL[urlAge];
    return f;
  }, [urlType, urlDomain, urlMatchClass, rawCategory, urlAge]);

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
          matchClass: ISSUE_MATCH_CLASS[d.issue] ?? 'Attribute mismatch',
          ageBand: t?.ageBand ?? '<1h'
        };
      });
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOpenDevices.filter(d => {
      if (filters['Discrepancy type'] && d.issue !== filters['Discrepancy type']) return false;
      if (filters['Match class'] && d.matchClass !== filters['Match class']) return false;
      if (q && !(d.name.toLowerCase().includes(q) || d.ip.includes(q) || d.issue.toLowerCase().includes(q) || d.region.toLowerCase().includes(q))) return false;
      if (!domainFilterMatches(d.domain, filters.Domain)) return false;
      if (filters.Age && normAge(AGE_LABEL[d.ageBand]) !== normAge(filters.Age) && normAge(d.ageBand) !== normAge(filters.Age)) return false;
      return true;
    });
  }, [allOpenDevices, query, filters]);

  const activeType = filters['Discrepancy type'];
  const activeTypeMeta = activeType ? DISCREPANCY_TYPES.find(t => t.label === activeType) : undefined;
  const activeMatchClass = filters['Match class'];

  const baseCount = useMemo(() => {
    if (activeType) return allOpenDevices.filter(d => d.issue === activeType).length;
    if (activeMatchClass) return allOpenDevices.filter(d => d.matchClass === activeMatchClass).length;
    return allOpenDevices.length;
  }, [allOpenDevices, activeType, activeMatchClass]);

  const shown = rows.length;

  return (
    <div className="page">
      <StatStrip cells={[
        activeType ? {
          k: 'Discrepancy type',
          v: String(baseCount),
          s: `${activeType}${activeTypeMeta ? ` · ${DOMAIN_LABEL[activeTypeMeta.domain]}` : ''}`,
          t: 'sky'
        } : activeMatchClass ? {
          k: 'Match class',
          v: String(baseCount),
          s: `${activeMatchClass} · across active domains`,
          t: 'sky'
        } : {
          k: 'Open discrepancies',
          v: String(allOpenDevices.length),
          s: 'across every domain',
          t: 'sky'
        },
        {
          k: 'Shown here',
          v: String(shown),
          s: `${shown} of ${baseCount} items`,
          t: 'purple'
        }
      ]} />
      <Card>
        <DataGrid<DiscrepancyDeviceRow> chipWidth="auto"
          columns={[
            { t: 'Device' },
            { t: 'Discrepancy type' },
            { t: 'Domain' },
            { t: 'Match class' },
            { t: 'Age' },
            { t: 'Last scan' }
          ]}
          rows={rows} total={rows.length} rowKey={d => d.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Device, IP, discrepancy type..."
          filters={[
            { n: 'Discrepancy type', o: DISCREPANCY_TYPES.map(t => t.label) },
            { n: 'Match class', o: [...MATCH_CLASSES] },
            { n: 'Domain', o: DOMAIN_OPTIONS },
            { n: 'Age', o: AGE_BANDS.map(a => AGE_LABEL[a]) }
          ]}
          onSearch={setQuery} searchValue={query} onFilterChange={handleFilterChange}
          renderRow={d => [
            <><span className="vw-value">{d.name}</span><Sub mono>{d.ip}</Sub></>,
            <span className="vw-value">{d.issue}</span>,
            <DomainDot domain={d.domain} />,
            <Chip tone={
              d.matchClass === 'Attribute mismatch' ? 'warning' :
              d.matchClass === 'Extra — no record' ? 'purple' :
              d.matchClass === 'Relationship drift' ? 'info' : 'error'
            }>{d.matchClass}</Chip>,
            <span className="vw-card-metric-label-sub">{AGE_LABEL[d.ageBand]}</span>,
            <span className="num">{d.lastScan}</span>
          ]}
        />
      </Card>
    </div>
  );
}

