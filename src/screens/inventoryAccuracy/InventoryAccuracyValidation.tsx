/* Inventory › Accuracy › Validation Results — per-rule breakdown for one
   execution (picked via the `exec` query param, defaulting to the latest
   upload), with drill-down to the failing records it raised. Not in the
   main sidebar anymore (validation/reconciliation/issues are shown inline
   right after an upload now — see InventoryAccuracyUpload.tsx's "done"
   step) but this route stays live since Execution History still links
   here directly. */
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { withSolution } from '../../solution';
import { ENTITY_LABEL } from '../../inventoryAccuracy/model';
import { Select } from './Select';
import { ValidationPanel } from './panels';
import { fmtDate, useSelectedExecution } from './shared';
import '../../styles/inventoryAccuracy.css';

export default function InventoryAccuracyValidation() {
  const nav = useNavigate();
  const { executions, execution, setId } = useSelectedExecution();

  if (!executions.length) {
    return <div className="page ia-page"><Card><p className="ia-empty">No uploads yet. <button type="button" className="nst-btn" onClick={() => nav(withSolution('/inventory/accuracy/upload'))}>Go to Upload</button></p></Card></div>;
  }

  return (
    <div className="page ia-page">
      <Card>
        <div className="ia-card-head-row">
          <h3 className="ia-card-title">Validation results</h3>
          <div style={{ minWidth: 360 }}>
            <Select
              value={execution?.id ?? ''} ariaLabel="Execution"
              options={executions.map(e => ({ value: e.id, label: `${e.id} · ${ENTITY_LABEL[e.entityType]} · ${e.fileName} · ${fmtDate(e.uploadedAt)}` }))}
              onChange={setId}
            />
          </div>
        </div>
      </Card>

      {execution && <ValidationPanel execution={execution} onViewIssue={() => nav(withSolution(`/inventory/accuracy/issues?exec=${execution.id}`))} />}
    </div>
  );
}
