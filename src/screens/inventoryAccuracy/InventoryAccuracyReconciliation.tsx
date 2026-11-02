/* Inventory › Accuracy › Reconciliation Results — the 7-outcome table for
   one execution, with row actions that record a decision (accept/retain/
   resolve/ignore/approve/reject) in store.ts. MISSING records are never
   auto-deleted — the only action available for them is "mark reviewed".
   Not in the main sidebar anymore (shown inline right after an upload —
   see InventoryAccuracyUpload.tsx's "done" step) but this route stays
   live since Execution History still links here directly. */
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { withSolution } from '../../solution';
import { ENTITY_LABEL } from '../../inventoryAccuracy/model';
import { Select } from './Select';
import { ReconciliationPanel } from './panels';
import { fmtDate, useSelectedExecution } from './shared';
import '../../styles/inventoryAccuracy.css';

export default function InventoryAccuracyReconciliation() {
  const nav = useNavigate();
  const { executions, execution, setId } = useSelectedExecution();

  if (!executions.length) {
    return <div className="page ia-page"><Card><p className="ia-empty">No uploads yet. <button type="button" className="nst-btn" onClick={() => nav(withSolution('/inventory/accuracy/upload'))}>Go to Upload</button></p></Card></div>;
  }

  return (
    <div className="page ia-page">
      <Card>
        <div className="ia-card-head-row">
          <h3 className="ia-card-title">Reconciliation results</h3>
          <div style={{ minWidth: 360 }}>
            <Select
              value={execution?.id ?? ''} ariaLabel="Execution"
              options={executions.map(e => ({ value: e.id, label: `${e.id} · ${ENTITY_LABEL[e.entityType]} · ${e.fileName} · ${fmtDate(e.uploadedAt)}` }))}
              onChange={setId}
            />
          </div>
        </div>
      </Card>

      {execution && <ReconciliationPanel execution={execution} />}
    </div>
  );
}
