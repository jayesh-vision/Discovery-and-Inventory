import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Chip, DomainDot, Mono } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import { RECONCILE_RESULTS, OUTCOME_TONE, type ReconcileResult } from '../data/reconciliationOps';
import { DOMAIN_LABEL, DOMAIN_OPTIONS, domainFilterMatches, parseDomainKey } from '../data/discoveryOverview';
import { ruleById } from '../data/rules';

const OUTCOMES = ['Matched', 'Attribute mismatch', 'Stale', 'Missing entity', 'Extra entity'];

export default function ReconciliationResults() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  /* ?domain= accepts the key, either label or the URL slug (see parseDomainKey) */
  const urlDomain = parseDomainKey(sp.get('domain'));
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
      if (!domainFilterMatches(r.domain, filters.Domain)) return false;
      if (filters.Outcome && r.outcome !== filters.Outcome) return false;
      return true;
    });
  }, [query, filters]);

  return (
    <div className="page">
      <Card>
        <DataGrid<ReconcileResult> chipWidth="xl"
          columns={[{ t: 'Network element' }, { t: 'Domain' }, { t: 'Outcome' }, { t: 'Mismatched fields' }, { t: 'Verified' }, { t: 'Rule' }]}
          rows={rows} total={rows.length} rowKey={r => r.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Network element"
          filters={[{ n: 'Domain', o: DOMAIN_OPTIONS }, { n: 'Outcome', o: OUTCOMES }]}
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
