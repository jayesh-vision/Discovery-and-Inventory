import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, StatStrip } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { Drawer } from '../components/Drawer';
import { legacyPath } from '../routes';
import {
  DISCREPANCY_TYPES, DOMAIN_HEX, DOMAIN_LABEL, type DiscrepancyTypeRow, type DomainKey,
  type DiscrepancyCategory, type AgeBand
} from '../data/discoveryOverview';
import { domainToUrl } from './DomainDevices';

const DOMAINS: DomainKey[] = ['RAN', 'Transport', 'Core', 'IPMPLS'];
const CATEGORIES: DiscrepancyCategory[] = ['EXISTENCE', 'ATTRIBUTE', 'RELATIONSHIP', 'FRESHNESS'];
const AGE_BANDS: AgeBand[] = ['<1h', '1-24h', '1-7d', '7-30d', '>30d'];
const AGE_LABEL: Record<AgeBand, string> = { '<1h': '< 1h', '1-24h': '1–24h', '1-7d': '1–7d', '7-30d': '7–30d', '>30d': '> 30d' };

const isDomain = (v: string | null): v is DomainKey => !!v && (DOMAINS as string[]).includes(v);
const isCategory = (v: string | null): v is DiscrepancyCategory => !!v && (CATEGORIES as string[]).includes(v);
const isAgeBand = (v: string | null): v is AgeBand => !!v && (AGE_BANDS as string[]).includes(v);

const DomainDot = ({ domain }: { domain: DomainKey }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

export default function DiscrepancyDetails() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const urlDomain = isDomain(sp.get('domain')) ? sp.get('domain') as DomainKey : undefined;
  const urlCategory = isCategory(sp.get('category')) ? sp.get('category') as DiscrepancyCategory : undefined;
  const urlAge = isAgeBand(sp.get('age')) ? sp.get('age') as AgeBand : undefined;
  const urlQ = sp.get('q') ?? '';
  /* this screen's own crumb is hardcoded "Insights · Discrepancies" (it's
     normally only reached from Insights) — but it can also be reached
     from Reconciliation now, which names itself via ?from=. Carrying that
     same origin on to Domain devices below keeps a 3-hop chain
     (Reconciliation → Discrepancies → Domain devices) pointing back the
     way the reader actually came, the same inherited-origin idea the
     legacy drillTo() already uses for its own multi-hop jumps. */
  const from = sp.get('from');

  const [query, setQuery] = useState(urlQ);
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (urlDomain) f.Domain = DOMAIN_LABEL[urlDomain];
    if (urlCategory) f.Category = urlCategory;
    if (urlAge) f.Age = AGE_LABEL[urlAge];
    return f;
  });
  const [open, setOpen] = useState<DiscrepancyTypeRow | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DISCREPANCY_TYPES.filter(r => {
      if (q && !r.label.toLowerCase().includes(q)) return false;
      if (filters.Domain && DOMAIN_LABEL[r.domain] !== filters.Domain) return false;
      if (filters.Category && r.category !== filters.Category) return false;
      if (filters.Age && AGE_LABEL[r.ageBand] !== filters.Age) return false;
      return true;
    });
  }, [query, filters]);

  const total = DISCREPANCY_TYPES.reduce((a, r) => a + r.count, 0);
  const shown = rows.reduce((a, r) => a + r.count, 0);

  return (
    <div className="page">
      <StatStrip cells={[
        { k: 'Open discrepancies', v: String(total), s: 'across every domain', t: 'sky' },
        { k: 'Shown here', v: String(shown), s: `${rows.length} of ${DISCREPANCY_TYPES.length} discrepancy types`, t: 'purple' }
      ]} />
      <Card>
        <DataGrid<DiscrepancyTypeRow>
          columns={[{ t: 'Discrepancy type' }, { t: 'Domain' }, { t: 'Category' }, { t: 'Age' }, { t: 'Count', r: true }]}
          rows={rows} total={rows.reduce((a, r) => a + r.count, 0)} rowKey={r => r.label}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Discrepancy type"
          filters={[
            { n: 'Domain', o: DOMAINS.map(d => DOMAIN_LABEL[d]) },
            { n: 'Category', o: CATEGORIES },
            { n: 'Age', o: AGE_BANDS.map(a => AGE_LABEL[a]) }
          ]}
          onSearch={setQuery} searchValue={query} onFilterChange={setFilters}
          onRowClick={setOpen}
          renderRow={r => [
            <span className="vw-value">{r.label}</span>,
            <DomainDot domain={r.domain} />,
            <Chip tone="neutral">{r.category}</Chip>,
            <span className="vw-card-metric-label-sub">{AGE_LABEL[r.ageBand]}</span>,
            <span className="num" style={{ fontWeight: 600 }}>{r.count}</span>
          ]}
        />
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.label ?? ''}
        sub={open ? `${DOMAIN_LABEL[open.domain]} · ${open.category}` : undefined}>
        {open && (
          <>
            <div className="kv">
              <div><span className="k">Domain</span><span className="v"><DomainDot domain={open.domain} /></span></div>
              <div><span className="k">Category</span><span className="v">{open.category}</span></div>
              <div><span className="k">Age</span><span className="v">{AGE_LABEL[open.ageBand]}</span></div>
              <div><span className="k">Open count</span><span className="v">{open.count}</span></div>
            </div>
            <div style={{ marginTop: 'var(--vw-space-lg)' }}>
              <button className="nst-btn nst-btn--sm"
                onClick={() => nav(legacyPath('domaindevices', from ? { from } : null, { domain: domainToUrl(open.domain) }))}>
                View {DOMAIN_LABEL[open.domain]} devices
              </button>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
