/* Inventory › Accuracy › Issues & Exceptions — every quality issue raised
   by every upload, filterable and bulk-actionable. "Rerun validation"
   recomputes the affected execution's score, crediting any issue that is
   now Resolved/Accepted Exception/Rejected (run.ts's recalculateScore) —
   it does not re-read the original file. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, Mono, StatStrip } from '../../components/ui';
import { DataGrid, type Action } from '../../components/grid/DataGrid';
import { Drawer } from '../../components/Drawer';
import { withSolution } from '../../solution';
import { accuracyStore } from '../../inventoryAccuracy/store';
import { recalculateScore } from '../../inventoryAccuracy/run';
import { ENTITY_LABEL, ENTITY_TYPES, ISSUE_STATUSES, RULE_SEVERITIES, type IssueStatus, type QualityIssue } from '../../inventoryAccuracy/model';
import { ISSUE_STATUS_TONE, SEVERITY_TONE, fmtDate, fmtPct, useStoreVersion } from './shared';
import '../../styles/inventoryAccuracy.css';

export default function InventoryAccuracyIssues() {
  useStoreVersion();
  const nav = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<QualityIssue | null>(null);
  const [recalc, setRecalc] = useState<string | null>(null);

  const all = accuracyStore.issues();
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(i => {
      if (q && !(i.resourceId.toLowerCase().includes(q) || i.resourceName.toLowerCase().includes(q) || i.ruleName.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))) return false;
      if (filters.Severity && i.severity !== filters.Severity) return false;
      if (filters['Entity type'] && ENTITY_LABEL[i.entityType] !== filters['Entity type']) return false;
      if (filters.Status && i.status !== filters.Status) return false;
      if (filters.Rule && i.ruleName !== filters.Rule) return false;
      if (filters.Vendor && i.vendor !== filters.Vendor) return false;
      if (filters.Geography && i.geography !== filters.Geography) return false;
      return true;
    });
  }, [all, query, filters]);

  const open = all.filter(i => i.status === 'Open').length;
  const critical = all.filter(i => i.severity === 'critical' && i.status === 'Open').length;
  const resolved = all.filter(i => i.status === 'Resolved').length;

  const setStatus = (ids: Set<string>, status: IssueStatus) => {
    accuracyStore.updateIssues(ids, { status, resolvedAt: (status === 'Resolved' || status === 'Accepted Exception' || status === 'Rejected') ? new Date().toISOString() : undefined });
    setSelected(new Set());
  };

  const rerun = (executionId: string) => {
    const updated = recalculateScore(executionId);
    if (updated) setRecalc(`${executionId} recalculated — accuracy now ${fmtPct(updated.score)} (${updated.classification}).`);
  };

  const affectedExecutions = new Set(rows.filter(r => selected.has(r.id)).map(r => r.executionId));

  const ruleNames = [...new Set(all.map(i => i.ruleName))];
  const vendors = [...new Set(all.map(i => i.vendor).filter(Boolean))] as string[];
  const geographies = [...new Set(all.map(i => i.geography).filter(Boolean))] as string[];

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="page ia-page">
      <StatStrip cells={[
        { k: 'Open issues', v: String(open), s: 'need action', t: 'red' },
        { k: 'Critical, open', v: String(critical), s: 'blocking records', t: 'red' },
        { k: 'Resolved', v: String(resolved), s: 'fixed and verified', t: 'emerald' },
        { k: 'Total issues', v: String(all.length), s: 'across every upload', t: 'slate' }
      ]} />

      {recalc && <Card><p className="ia-empty">{recalc} <button type="button" className="link-btn" onClick={() => setRecalc(null)}>Dismiss</button></p></Card>}

      <Card>
        {selected.size > 0 && (
          <div className="ia-foot" style={{ marginBottom: 12 }}>
            <span className="ia-empty">{selected.size} selected</span>
            <button type="button" className="nst-btn" onClick={() => setStatus(selected, 'Assigned')}>Assign</button>
            <button type="button" className="nst-btn" onClick={() => setStatus(selected, 'In Progress')}>In progress</button>
            <button type="button" className="nst-btn" onClick={() => setStatus(selected, 'Resolved')}>Mark resolved</button>
            <button type="button" className="nst-btn" onClick={() => setStatus(selected, 'Accepted Exception')}>Accept exception</button>
            <button type="button" className="nst-btn" onClick={() => setStatus(selected, 'Rejected')}>Reject</button>
            <span style={{ flex: 1 }} />
            {[...affectedExecutions].map(id => <button key={id} type="button" className="nst-btn nst-btn--filled" onClick={() => rerun(id)}>Rerun validation ({id})</button>)}
          </div>
        )}

        <DataGrid<QualityIssue>
          columns={[{ t: '', w: '2.5rem' }, { t: 'Resource', w: '16%' }, { t: 'Rule', w: '20%' }, { t: 'Severity', w: '8%' }, { t: 'Vendor / Geography', w: '16%' }, { t: 'Status', plain: true, w: '12%' }, { t: 'Created', w: '10%' }]}
          rows={rows} total={rows.length} rowKey={i => i.id}
          searchPlaceholder="Resource id, rule, description"
          onSearch={setQuery}
          filters={[
            { n: 'Severity', o: [...RULE_SEVERITIES] },
            { n: 'Entity type', o: ENTITY_TYPES.map(t => ENTITY_LABEL[t]) },
            { n: 'Status', o: [...ISSUE_STATUSES] },
            { n: 'Rule', o: ruleNames },
            { n: 'Vendor', o: vendors },
            { n: 'Geography', o: geographies }
          ]}
          onFilterChange={setFilters}
          onRowClick={i => setDrawer(i)}
          rowActions={(i): Action[] => [
            { l: 'View details', primary: true, onClick: () => setDrawer(i) },
            { l: 'Mark resolved', onClick: () => setStatus(new Set([i.id]), 'Resolved') },
            { l: 'Accept exception', onClick: () => setStatus(new Set([i.id]), 'Accepted Exception') },
            { l: 'Reject', onClick: () => setStatus(new Set([i.id]), 'Rejected') },
            { l: `Rerun validation (${i.executionId})`, onClick: () => rerun(i.executionId) }
          ]}
          renderRow={i => [
            <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} onClick={e => e.stopPropagation()} aria-label={`Select ${i.id}`} />,
            <><span className="mono">{i.resourceId}</span><div className="cell-sub">{i.resourceName}</div></>,
            <><span>{i.ruleName}</span><div className="cell-sub">{i.category}</div></>,
            <Chip tone={SEVERITY_TONE[i.severity]}>{i.severity}</Chip>,
            <span className="ia-empty-inline">{[i.vendor, i.geography].filter(Boolean).join(' · ') || '—'}</span>,
            <Chip tone={ISSUE_STATUS_TONE[i.status]}>{i.status}</Chip>,
            <span className="num">{fmtDate(i.createdAt)}</span>
          ]}
        />
      </Card>

      <Drawer open={!!drawer} title={drawer ? <Mono>{drawer.id}</Mono> : ''} sub={drawer?.description} onClose={() => setDrawer(null)}>
        {drawer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip tone={SEVERITY_TONE[drawer.severity]}>{drawer.severity}</Chip>
              <Chip tone={ISSUE_STATUS_TONE[drawer.status]}>{drawer.status}</Chip>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#334155' }}>{drawer.recommendation}</p>
            <table className="ia-map-table">
              <tbody>
                <tr><td>Rule</td><td>{drawer.ruleName}</td></tr>
                <tr><td>Resource</td><td className="mono">{drawer.resourceId}</td></tr>
                <tr><td>Uploaded value</td><td>{drawer.uploadedValue ?? '—'}</td></tr>
                <tr><td>Vendor</td><td>{drawer.vendor ?? '—'}</td></tr>
                <tr><td>Geography</td><td>{drawer.geography ?? '—'}</td></tr>
                <tr><td>Created</td><td>{fmtDate(drawer.createdAt)}</td></tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="nst-btn nst-btn--filled" onClick={() => { setStatus(new Set([drawer.id]), 'Resolved'); setDrawer(null); }}>Mark resolved</button>
              <button type="button" className="nst-btn" onClick={() => { setStatus(new Set([drawer.id]), 'Accepted Exception'); setDrawer(null); }}>Accept as exception</button>
              <button type="button" className="nst-btn" onClick={() => nav(withSolution(`/inventory/accuracy/validation?exec=${drawer.executionId}`))}>View in Validation Results</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
