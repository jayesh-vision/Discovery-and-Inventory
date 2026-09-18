import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import {
  RECONCILE_JOBS, JOB_STATUS_TONE, DOMAIN_HEX, DOMAIN_LABEL, type ReconcileJob, type DomainKey
} from '../data/reconciliationOps';

const DOMAINS: DomainKey[] = ['RAN', 'Core', 'Transport', 'IPMPLS'];

const DomainDot = ({ domain }: { domain: DomainKey }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

export default function ReconciliationJobs() {
  const nav = useNavigate();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECONCILE_JOBS.filter(j => {
      if (q && !(j.id.toLowerCase().includes(q) || j.source.toLowerCase().includes(q) || j.target.toLowerCase().includes(q))) return false;
      if (filters.Domain && DOMAIN_LABEL[j.domain] !== filters.Domain) return false;
      if (filters.Status && j.status !== filters.Status) return false;
      return true;
    });
  }, [query, filters]);

  return (
    <div className="page">
      <Card>
        <DataGrid<ReconcileJob> chipWidth="xl"
          columns={[{ t: 'Job' }, { t: 'Domain' }, { t: 'Source · target' }, { t: 'Scan type' }, { t: 'Schedule' },
            { t: 'Last run · duration' }, { t: 'Next run' }, { t: 'Result' }]}
          rows={rows} total={rows.length} rowKey={j => j.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Job, source, target"
          filters={[{ n: 'Domain', o: DOMAINS.map(d => DOMAIN_LABEL[d]) }, { n: 'Status', o: ['Completed', 'Completed with errors', 'Running', 'Scheduled'] }]}
          onSearch={setQuery} onFilterChange={setFilters}
          onRowClick={j => nav(`/discovery/reconcile/rules/${j.ruleIds[0]}`)}
          rowActions={j => j.ruleIds.map(id => ({ l: `Open ${id}`, onClick: () => nav(`/discovery/reconcile/rules/${id}`) }))}
          renderRow={j => [
            <><span className="vw-value" style={{ fontWeight: 500 }}>{j.id}</span></>,
            <DomainDot domain={j.domain} />,
            <><span className="vw-value">{j.source}</span><div className="cell-sub">→ {j.target}</div></>,
            j.scanType,
            j.schedule,
            <><span className="num">{j.lastRun}</span><div className="cell-sub num">{j.duration}</div></>,
            <span className="cell-sub">{j.nextRun}</span>,
            <><Chip tone={JOB_STATUS_TONE[j.status]}>{j.status}</Chip><div className="cell-sub" style={{ marginTop: '4px' }}>{j.resultSummary}</div></>
          ]}
        />
      </Card>
    </div>
  );
}
