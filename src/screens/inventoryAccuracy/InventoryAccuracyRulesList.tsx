import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, StatStrip } from '../../components/ui';
import { DataGrid } from '../../components/grid/DataGrid';
import { withSolution } from '../../solution';
import { loadRules } from '../../inventoryAccuracy/rules';
import { ENTITY_LABEL, ENTITY_TYPES, RULE_CATEGORIES, RULE_CATEGORY_LABEL, RULE_LIFECYCLE, RULE_SEVERITIES, type Rule } from '../../inventoryAccuracy/model';
import { RULE_STATUS_TONE, SEVERITY_TONE, useStoreVersion } from './shared';
import '../../styles/inventoryAccuracy.css';

export default function InventoryAccuracyRulesList() {
  useStoreVersion();
  const nav = useNavigate();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const rules = loadRules();
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter(r => {
      if (q && !(r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))) return false;
      if (filters['Entity type'] && ENTITY_LABEL[r.entityType] !== filters['Entity type']) return false;
      if (filters.Category && RULE_CATEGORY_LABEL[r.category] !== filters.Category) return false;
      if (filters.Severity && r.severity !== filters.Severity) return false;
      if (filters.Status && r.status !== filters.Status) return false;
      return true;
    });
  }, [rules, query, filters]);

  const active = rules.filter(r => r.status === 'Active').length;

  return (
    <div className="page ia-page">
      <StatStrip cells={[
        { k: 'Rules', v: String(rules.length), s: 'across every entity type', t: 'slate' },
        { k: 'Active', v: String(active), s: 'enforced on the next upload', t: 'emerald' },
        { k: 'Categories covered', v: `${new Set(rules.map(r => r.category)).size} of ${RULE_CATEGORIES.length}`, s: RULE_CATEGORIES.map(c => RULE_CATEGORY_LABEL[c]).join(' · '), t: 'purple' }
      ]} />

      <Card>
        <DataGrid<Rule>
          columns={[{ t: 'Rule', w: '24%' }, { t: 'Entity type', w: '14%' }, { t: 'Category', w: '14%' }, { t: 'Severity', w: '9%' }, { t: 'Weight', r: true, w: '7%' }, { t: 'Status', plain: true, w: '10%' }, { t: 'Last updated', w: '10%' }]}
          rows={rows} total={rows.length} rowKey={r => r.id}
          resetKey={`${query}|${JSON.stringify(filters)}`}
          searchPlaceholder="Rule name, ID, description"
          filters={[
            { n: 'Entity type', o: ENTITY_TYPES.map(t => ENTITY_LABEL[t]) },
            { n: 'Category', o: RULE_CATEGORIES.map(c => RULE_CATEGORY_LABEL[c]) },
            { n: 'Severity', o: [...RULE_SEVERITIES] },
            { n: 'Status', o: [...RULE_LIFECYCLE] }
          ]}
          onSearch={setQuery} onFilterChange={setFilters}
          gridActions={[{ l: 'Create rule', primary: true, onClick: () => nav(withSolution('/inventory/rule-management/new')) }]}
          onRowClick={r => nav(withSolution(`/inventory/rule-management/${r.id}`))}
          rowActions={r => [
            { l: 'View details', primary: true, onClick: () => nav(withSolution(`/inventory/rule-management/${r.id}`)) },
            { l: 'Edit rule', onClick: () => nav(withSolution(`/inventory/rule-management/${r.id}/edit`)) }
          ]}
          renderRow={r => [
            <><span className="vw-value" style={{ fontWeight: 500 }}>{r.name}</span><div className="cell-sub mono">{r.id}</div></>,
            ENTITY_LABEL[r.entityType],
            RULE_CATEGORY_LABEL[r.category],
            <Chip tone={SEVERITY_TONE[r.severity]}>{r.severity}</Chip>,
            <span className="num">{r.weight}</span>,
            <Chip tone={RULE_STATUS_TONE[r.status]}>{r.status}</Chip>,
            <span className="num">{r.lastUpdated}</span>
          ]}
        />
      </Card>
    </div>
  );
}
