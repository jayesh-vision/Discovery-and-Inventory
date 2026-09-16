import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, StatStrip } from '../components/ui';
import { DataGrid } from '../components/grid/DataGrid';
import {
  RULES, RULE_LIFECYCLE, STATUS_TONE, PRIORITY_TONE, DOMAIN_HEX, DOMAIN_LABEL,
  type Rule, type DomainKey
} from '../data/rules';

const DOMAINS: DomainKey[] = ['RAN', 'Core', 'Transport', 'IPMPLS'];

const DomainDot = ({ domain }: { domain: DomainKey }) => (
  <span className="row vw-items-center" style={{ gap: '8px' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOMAIN_HEX[domain], flexShrink: 0 }} />
    {DOMAIN_LABEL[domain]}
  </span>
);

const ORIGIN_LABEL: Record<Rule['origin'], string> = { Manual: 'Manual', 'Auto-generated': 'Auto-generated', 'AI-suggested': 'AI-suggested' };

export default function RulesList() {
  const nav = useNavigate();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RULES.filter(r => {
      if (q && !(r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.source.toLowerCase().includes(q) || r.target.toLowerCase().includes(q))) return false;
      if (filters.Domain && DOMAIN_LABEL[r.domain] !== filters.Domain) return false;
      if (filters.Status && r.status !== filters.Status) return false;
      if (filters.Priority && r.priority !== filters.Priority) return false;
      return true;
    });
  }, [query, filters]);

  const active = RULES.filter(r => r.status === 'Active' || r.status === 'Executing').length;
  const awaitingReview = RULES.filter(r => r.status === 'Review').length;

  return (
    <div className="page">
      <StatStrip cells={[
        { k: 'Rules', v: String(RULES.length), s: 'across every domain', t: 'sky' },
        { k: 'Active', v: String(active), s: 'active or currently executing', t: 'emerald' },
        { k: 'Awaiting review', v: String(awaitingReview), s: awaitingReview ? 'need a reviewer’s decision' : 'nothing waiting', t: 'amber' },
        { k: 'Domains covered', v: `${new Set(RULES.map(r => r.domain)).size} of 4`, s: 'RAN · Core · Transport · IP/MPLS', t: 'purple' }
      ]} />

      <Card>
        <DataGrid<Rule>
          columns={[{ t: 'Rule' }, { t: 'Domain' }, { t: 'Source · target' }, { t: 'Type' }, { t: 'Status' },
            { t: 'Owner · reviewer' }, { t: 'Last updated' }, { t: 'Last execution' }, { t: 'Priority' }]}
          rows={rows} total={rows.length} rowKey={r => r.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Rule name, ID, source, target"
          filters={[
            { n: 'Domain', o: DOMAINS.map(d => DOMAIN_LABEL[d]) },
            { n: 'Status', o: [...RULE_LIFECYCLE] },
            { n: 'Priority', o: ['High', 'Medium', 'Low'] }
          ]}
          onSearch={setQuery} onFilterChange={setFilters}
          gridActions={[{ l: 'Create rule', primary: true, onClick: () => nav('/discovery/reconcile/rules/new') }]}
          onRowClick={r => nav(`/discovery/reconcile/rules/${r.id}`)}
          rowActions={r => [
            { l: 'Edit rule', onClick: () => nav(`/discovery/reconcile/rules/${r.id}/edit`) },
            ...(r.status === 'Review' ? [{ l: 'Review rule', onClick: () => nav(`/discovery/reconcile/rules/${r.id}`) }] : [])
          ]}
          renderRow={r => [
            <><span className="vw-value" style={{ fontWeight: 500 }}>{r.name}</span><div className="cell-sub mono">{r.id} · {ORIGIN_LABEL[r.origin]}</div></>,
            <DomainDot domain={r.domain} />,
            <><span className="vw-value">{r.source}</span><div className="cell-sub">→ {r.target}</div></>,
            r.ruleType,
            <Chip tone={STATUS_TONE[r.status]}>{r.status}</Chip>,
            <><span className="vw-value">{r.owner}</span><div className="cell-sub">reviewer {r.reviewer}</div></>,
            <span className="num">{r.lastUpdated}</span>,
            r.lastExecution ? <span className="num">{r.lastExecution}</span> : <span style={{ color: 'var(--vw-color-gray-300)' }}>never</span>,
            <Chip tone={PRIORITY_TONE[r.priority]}>{r.priority}</Chip>
          ]}
        />
      </Card>
    </div>
  );
}
