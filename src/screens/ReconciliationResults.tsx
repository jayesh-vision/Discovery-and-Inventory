import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, Mono } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import {
  RECONCILE_RESULTS, OUTCOME_TONE, DOMAIN_HEX, DOMAIN_LABEL, type ReconcileResult, type DomainKey
} from '../data/reconciliationOps';
import { ruleById } from '../data/rules';

const DOMAINS: DomainKey[] = ['RAN', 'Core', 'Transport', 'IPMPLS'];
const OUTCOMES = ['Matched', 'Attribute mismatch', 'Stale', 'Missing entity', 'Extra entity'];

const DomainDot = ({ domain }: { domain: DomainKey }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

const isDomain = (v: string | null): v is DomainKey => !!v && (['RAN', 'Core', 'Transport', 'IPMPLS'] as string[]).includes(v);

export default function ReconciliationResults() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const urlDomain = isDomain(sp.get('domain')) ? sp.get('domain') as DomainKey : undefined;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (urlDomain) f.Domain = DOMAIN_LABEL[urlDomain];
    return f;
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECONCILE_RESULTS.filter(r => {
      if (q && !r.element.toLowerCase().includes(q)) return false;
      if (filters.Domain && DOMAIN_LABEL[r.domain] !== filters.Domain) return false;
      if (filters.Outcome && r.outcome !== filters.Outcome) return false;
      return true;
    });
  }, [query, filters]);

  return (
    <div className="page">
      <Card>
        <DataGrid<ReconcileResult>
          columns={[{ t: 'Network element' }, { t: 'Domain' }, { t: 'Outcome' }, { t: 'Mismatched fields' }, { t: 'Verified' }, { t: 'Rule' }]}
          rows={rows} total={rows.length} rowKey={r => r.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Network element"
          filters={[{ n: 'Domain', o: DOMAINS.map(d => DOMAIN_LABEL[d]) }, { n: 'Outcome', o: OUTCOMES }]}
          onSearch={setQuery} onFilterChange={setFilters}
          onRowClick={r => nav(`/discovery/reconcile/rules/${r.ruleId}`)}
          renderRow={r => {
            const rule = ruleById(r.ruleId);
            return [
              <span className="vw-value">{r.element}</span>,
              <DomainDot domain={r.domain} />,
              <Chip tone={OUTCOME_TONE[r.outcome]}>{r.outcome}</Chip>,
              r.mismatchedFields.length ? <span className="vw-card-metric-label-sub">{r.mismatchedFields.join(', ')}</span> : <span style={{ color: 'var(--vw-color-gray-300)' }}>—</span>,
              <span className="num">{r.verified}</span>,
              <Mono>{rule?.name ?? r.ruleId}</Mono>
            ];
          }}
        />
      </Card>
    </div>
  );
}
