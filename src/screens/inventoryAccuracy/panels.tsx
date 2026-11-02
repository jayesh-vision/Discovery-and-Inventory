/* ── Execution-scoped result panels ───────────────────────────────────────
   The per-rule validation table, the reconciliation outcome table, and a
   per-execution issues list — extracted so the same markup/logic backs
   both the standalone Validation/Reconciliation routes (still reachable
   from Execution History, unchanged) and the combined results view shown
   right after an upload completes (InventoryAccuracyUpload.tsx's "done"
   step), without duplicating the table/drawer code twice. */
import { useMemo, useState } from 'react';
import { Card, Chip, Mono } from '../../components/ui';
import { DataGrid, type Action } from '../../components/grid/DataGrid';
import { Drawer } from '../../components/Drawer';
import { accuracyStore } from '../../inventoryAccuracy/store';
import { recalculateScore } from '../../inventoryAccuracy/run';
import type { AccuracyExecution, QualityIssue, ReconciliationRecord } from '../../inventoryAccuracy/model';
import { RECONCILIATION_OUTCOMES } from '../../inventoryAccuracy/model';
import { ISSUE_STATUS_TONE, OUTCOME_TONE, SEVERITY_TONE, fmtDate, fmtPct } from './shared';

const DECIDED_BY = 'Current user';

/* ── Validation ── */
export function ValidationPanel({ execution, onViewIssue }: { execution: AccuracyExecution; onViewIssue?: (issue: QualityIssue) => void }) {
  const [ruleFilter, setRuleFilter] = useState<string | null>(null);
  const issues = useMemo(() => accuracyStore.issues().filter(i => i.executionId === execution.id), [execution.id]);
  const rows = ruleFilter ? issues.filter(i => i.ruleId === ruleFilter) : issues;

  return (
    <>
      <Card>
        <p className="ia-empty">
          {execution.totalRecords} records · accuracy {fmtPct(execution.score)} ({execution.classification}) · rule set v{execution.ruleSetVersion}
        </p>
        <table className="ia-map-table">
          <thead><tr><th>Rule</th><th>Category</th><th>Severity</th><th>Weight</th><th>Applicable</th><th>Failed</th><th>Excluded</th><th>Pass %</th><th></th></tr></thead>
          <tbody>
            {execution.ruleResults.map(r => (
              <tr key={r.ruleId} className={ruleFilter === r.ruleId ? 'is-open' : ''}>
                <td>{r.ruleName}</td><td>{r.category}</td>
                <td><Chip tone={SEVERITY_TONE[r.severity]}>{r.severity}</Chip></td>
                <td className="num">{r.weight}</td><td className="num">{r.applicable}</td>
                <td className="num">{r.failed}</td><td className="num">{r.excluded}</td>
                <td className="num">{fmtPct(r.passPct)}</td>
                <td>{r.failed > 0 && <button type="button" className="link-btn" onClick={() => setRuleFilter(ruleFilter === r.ruleId ? null : r.ruleId)}>{ruleFilter === r.ruleId ? 'Clear' : 'View failures'}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 className="ia-card-title">{ruleFilter ? 'Failing records for this rule' : 'All failing records'}</h3>
        <DataGrid<QualityIssue>
          columns={[{ t: 'Resource', w: '16%' }, { t: 'Rule', w: '22%' }, { t: 'Severity', w: '10%' }, { t: 'Description', w: '32%' }, { t: 'Status', plain: true, w: '12%' }]}
          rows={rows} total={rows.length} rowKey={i => i.id}
          searchPlaceholder="Resource id, rule, description"
          onRowClick={i => onViewIssue?.(i)}
          renderRow={i => [
            <><span className="mono">{i.resourceId}</span><div className="cell-sub">{i.resourceName}</div></>,
            i.ruleName,
            <Chip tone={SEVERITY_TONE[i.severity]}>{i.severity}</Chip>,
            i.description,
            <Chip tone={ISSUE_STATUS_TONE[i.status]}>{i.status}</Chip>
          ]}
        />
      </Card>
    </>
  );
}

/* ── Reconciliation ── */
const ACTIONS_FOR: Record<ReconciliationRecord['outcome'], { label: string; decision: NonNullable<ReconciliationRecord['decision']> }[]> = {
  NEW: [{ label: 'Approve new record', decision: 'approved' }, { label: 'Reject uploaded record', decision: 'rejected' }],
  MODIFIED: [{ label: 'Accept uploaded changes', decision: 'accept' }, { label: 'Retain existing value', decision: 'retain' }],
  CONFLICT: [{ label: 'Manually resolve conflict', decision: 'resolved' }, { label: 'Reject uploaded record', decision: 'rejected' }],
  DUPLICATE: [{ label: 'Ignore record', decision: 'ignored' }],
  MISSING: [{ label: 'Mark reviewed', decision: 'ignored' }],
  INVALID: [{ label: 'Reject uploaded record', decision: 'rejected' }],
  MATCHED: []
};

export function ReconciliationPanel({ execution }: { execution: AccuracyExecution }) {
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReconciliationRecord | null>(null);
  const [, setVersion] = useState(0);

  const records = useMemo(() => accuracyStore.reconciliationFor(execution.id), [execution.id]);
  const rows = outcomeFilter ? records.filter(r => r.outcome === outcomeFilter) : records;

  const decide = (r: ReconciliationRecord, decision: NonNullable<ReconciliationRecord['decision']>) => {
    accuracyStore.updateReconciliationDecision(execution.id, r.key, decision, DECIDED_BY);
    setSelected(null);
    setVersion(v => v + 1);
  };

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {RECONCILIATION_OUTCOMES.map(o => {
            const n = records.filter(r => r.outcome === o).length;
            return (
              <button key={o} type="button" className="ia-seg-btn" style={{ borderRadius: 999, border: '1px solid #e2e8f0' }}
                onClick={() => setOutcomeFilter(outcomeFilter === o ? null : o)}>
                <Chip tone={OUTCOME_TONE[o]}>{o}: {n}</Chip>
              </button>
            );
          })}
        </div>

        <DataGrid<ReconciliationRecord>
          columns={[{ t: 'Resource', w: '18%' }, { t: 'Outcome', w: '10%' }, { t: 'Changed attributes', w: '20%' }, { t: 'Recommendation', w: '32%' }, { t: 'Decision', plain: true, w: '12%' }]}
          rows={rows} total={rows.length} rowKey={r => r.key}
          searchPlaceholder="Resource id or name"
          onRowClick={r => setSelected(r)}
          rowActions={(r): Action[] => [
            { l: 'View details', primary: true, onClick: () => setSelected(r) },
            ...ACTIONS_FOR[r.outcome].map(a => ({ l: a.label, onClick: () => decide(r, a.decision) }))
          ]}
          renderRow={r => [
            <><span className="mono">{r.resourceId}</span><div className="cell-sub">{r.resourceName}</div></>,
            <Chip tone={OUTCOME_TONE[r.outcome]}>{r.outcome}</Chip>,
            r.changes.length ? `${r.changes.length} field${r.changes.length > 1 ? 's' : ''}` : '—',
            r.recommendation,
            r.decision ? <Chip tone="info">{r.decision}</Chip> : <span className="ia-empty-inline">pending</span>
          ]}
        />
      </Card>

      <Drawer open={!!selected} title={selected ? <Mono>{selected.resourceId}</Mono> : ''} sub={selected?.resourceName} onClose={() => setSelected(null)}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><Chip tone={OUTCOME_TONE[selected.outcome]}>{selected.outcome}</Chip></div>
            <p style={{ fontSize: '0.85rem', color: '#334155' }}>{selected.recommendation}</p>
            {selected.changes.length > 0 && (
              <table className="ia-map-table">
                <thead><tr><th>Field</th><th>Existing</th><th>Uploaded</th></tr></thead>
                <tbody>
                  {selected.changes.map(c => (
                    <tr key={c.field}><td>{c.field}</td><td className="ia-diff-old">{c.existing || '—'}</td><td className="ia-diff-new">{c.uploaded || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {ACTIONS_FOR[selected.outcome].length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ACTIONS_FOR[selected.outcome].map(a => (
                  <button key={a.decision} type="button" className="nst-btn nst-btn--filled" onClick={() => decide(selected, a.decision)}>{a.label}</button>
                ))}
              </div>
            )}
            {selected.decision && <p className="ia-empty">Decision recorded: <strong>{selected.decision}</strong> by {selected.decidedBy} at {selected.decidedAt ? fmtDate(selected.decidedAt) : ''}</p>}
          </div>
        )}
      </Drawer>
    </>
  );
}

/* ── Issues & Exceptions, scoped to one execution ── */
export function IssuesPanel({ executionId }: { executionId: string }) {
  const [, setVersion] = useState(0);
  const [selected, setSelected] = useState<QualityIssue | null>(null);
  const [recalc, setRecalc] = useState<string | null>(null);
  const issues = accuracyStore.issues().filter(i => i.executionId === executionId);

  const setStatus = (ids: Set<string>, status: QualityIssue['status']) => {
    accuracyStore.updateIssues(ids, { status, resolvedAt: (status === 'Resolved' || status === 'Accepted Exception' || status === 'Rejected') ? new Date().toISOString() : undefined });
    setSelected(null);
    setVersion(v => v + 1);
  };

  const rerun = () => {
    const updated = recalculateScore(executionId);
    if (updated) setRecalc(`Recalculated — accuracy now ${fmtPct(updated.score)} (${updated.classification}).`);
    setVersion(v => v + 1);
  };

  if (!issues.length) {
    return <Card><p className="ia-empty">This upload raised no quality issues.</p></Card>;
  }

  return (
    <>
      {recalc && <Card><p className="ia-empty">{recalc} <button type="button" className="link-btn" onClick={() => setRecalc(null)}>Dismiss</button></p></Card>}
      <Card>
        <div className="ia-foot" style={{ marginBottom: 12 }}>
          <span className="ia-empty">{issues.filter(i => i.status === 'Open').length} open of {issues.length}</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="nst-btn nst-btn--filled" onClick={rerun}>Rerun validation</button>
        </div>
        <DataGrid<QualityIssue>
          columns={[{ t: 'Resource', w: '16%' }, { t: 'Rule', w: '20%' }, { t: 'Severity', w: '8%' }, { t: 'Description', w: '34%' }, { t: 'Status', plain: true, w: '12%' }]}
          rows={issues} total={issues.length} rowKey={i => i.id}
          searchPlaceholder="Resource id, rule, description"
          onRowClick={i => setSelected(i)}
          rowActions={(i): Action[] => [
            { l: 'View details', primary: true, onClick: () => setSelected(i) },
            { l: 'Mark resolved', onClick: () => setStatus(new Set([i.id]), 'Resolved') },
            { l: 'Accept exception', onClick: () => setStatus(new Set([i.id]), 'Accepted Exception') },
            { l: 'Reject', onClick: () => setStatus(new Set([i.id]), 'Rejected') }
          ]}
          renderRow={i => [
            <><span className="mono">{i.resourceId}</span><div className="cell-sub">{i.resourceName}</div></>,
            <><span>{i.ruleName}</span><div className="cell-sub">{i.category}</div></>,
            <Chip tone={SEVERITY_TONE[i.severity]}>{i.severity}</Chip>,
            i.description,
            <Chip tone={ISSUE_STATUS_TONE[i.status]}>{i.status}</Chip>
          ]}
        />
      </Card>

      <Drawer open={!!selected} title={selected ? <Mono>{selected.id}</Mono> : ''} sub={selected?.description} onClose={() => setSelected(null)}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip tone={SEVERITY_TONE[selected.severity]}>{selected.severity}</Chip>
              <Chip tone={ISSUE_STATUS_TONE[selected.status]}>{selected.status}</Chip>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#334155' }}>{selected.recommendation}</p>
            <table className="ia-map-table">
              <tbody>
                <tr><td>Rule</td><td>{selected.ruleName}</td></tr>
                <tr><td>Resource</td><td className="mono">{selected.resourceId}</td></tr>
                <tr><td>Uploaded value</td><td>{selected.uploadedValue ?? '—'}</td></tr>
                <tr><td>Created</td><td>{fmtDate(selected.createdAt)}</td></tr>
              </tbody>
            </table>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="nst-btn nst-btn--filled" onClick={() => setStatus(new Set([selected.id]), 'Resolved')}>Mark resolved</button>
              <button type="button" className="nst-btn" onClick={() => setStatus(new Set([selected.id]), 'Accepted Exception')}>Accept as exception</button>
              <button type="button" className="nst-btn" onClick={() => setStatus(new Set([selected.id]), 'Rejected')}>Reject</button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
