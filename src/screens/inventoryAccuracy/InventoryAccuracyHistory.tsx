/* Inventory › Accuracy › Execution History — every upload ever committed,
   plus a two-run comparison (pick any two rows) to see whether accuracy
   improved or regressed between them. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip } from '../../components/ui';
import { DataGrid } from '../../components/grid/DataGrid';
import { withSolution } from '../../solution';
import { accuracyStore } from '../../inventoryAccuracy/store';
import { ENTITY_LABEL, type AccuracyExecution } from '../../inventoryAccuracy/model';
import { CLASSIFICATION_CHIP, fmtDate, fmtPct, useStoreVersion } from './shared';
import '../../styles/inventoryAccuracy.css';

export default function InventoryAccuracyHistory() {
  useStoreVersion();
  const nav = useNavigate();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const executions = accuracyStore.executions();

  const toggleCompare = (id: string) => setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]);
  const compared = useMemo(() => compareIds.map(id => executions.find(e => e.id === id)).filter(Boolean) as AccuracyExecution[], [compareIds, executions]);

  if (!executions.length) {
    return <div className="page ia-page"><Card><p className="ia-empty">No uploads yet. <button type="button" className="nst-btn" onClick={() => nav(withSolution('/inventory/accuracy/upload'))}>Go to Upload</button></p></Card></div>;
  }

  return (
    <div className="page ia-page">
      <Card>
        <h3 className="ia-card-title">Execution history</h3>
        <p className="ia-empty">Select up to two rows' checkboxes below to compare them.</p>
        <DataGrid<AccuracyExecution>
          columns={[{ t: '', w: '2.5rem' }, { t: 'Execution', w: '14%' }, { t: 'Entity type', w: '14%' }, { t: 'File', w: '16%' }, { t: 'Uploaded', w: '14%' }, { t: 'Mode', w: '8%' }, { t: 'Records', r: true, w: '8%' }, { t: 'Score', r: true, w: '8%' }, { t: 'Classification', plain: true, w: '12%' }]}
          rows={executions} total={executions.length} rowKey={e => e.id}
          searchPlaceholder="Execution id, file name"
          onRowClick={e => nav(withSolution(`/inventory/accuracy/validation?exec=${e.id}`))}
          rowActions={e => [
            { l: 'View validation results', primary: true, onClick: () => nav(withSolution(`/inventory/accuracy/validation?exec=${e.id}`)) },
            { l: 'View reconciliation results', onClick: () => nav(withSolution(`/inventory/accuracy/reconciliation?exec=${e.id}`)) },
            { l: compareIds.includes(e.id) ? 'Remove from comparison' : 'Add to comparison', onClick: () => toggleCompare(e.id) }
          ]}
          renderRow={e => [
            <input type="checkbox" checked={compareIds.includes(e.id)} onChange={() => toggleCompare(e.id)} onClick={ev => ev.stopPropagation()} aria-label={`Compare ${e.id}`} />,
            <span className="mono">{e.id}</span>,
            ENTITY_LABEL[e.entityType],
            e.fileName,
            <span className="num">{fmtDate(e.uploadedAt)}</span>,
            e.importMode,
            <span className="num">{e.totalRecords}</span>,
            <span className="num">{fmtPct(e.score)}</span>,
            <Chip tone={CLASSIFICATION_CHIP[e.classification]}>{e.classification}</Chip>
          ]}
        />
      </Card>

      {compared.length === 2 && (
        <Card>
          <h3 className="ia-card-title">Comparing {compared[0].id} → {compared[1].id}</h3>
          <table className="ia-map-table">
            <thead><tr><th></th><th>{compared[0].id}</th><th>{compared[1].id}</th><th>Δ</th></tr></thead>
            <tbody>
              <tr><td>Uploaded</td><td>{fmtDate(compared[0].uploadedAt)}</td><td>{fmtDate(compared[1].uploadedAt)}</td><td></td></tr>
              <tr><td>Total records</td><td className="num">{compared[0].totalRecords}</td><td className="num">{compared[1].totalRecords}</td><td className="num">{compared[1].totalRecords - compared[0].totalRecords}</td></tr>
              <tr><td>Valid records</td><td className="num">{compared[0].validRecords}</td><td className="num">{compared[1].validRecords}</td><td className="num">{compared[1].validRecords - compared[0].validRecords}</td></tr>
              <tr><td>Accuracy score</td><td className="num">{fmtPct(compared[0].score)}</td><td className="num">{fmtPct(compared[1].score)}</td>
                <td className="num" style={{ color: compared[1].score >= compared[0].score ? '#047857' : '#dc2626', fontWeight: 700 }}>
                  {compared[1].score >= compared[0].score ? '▲' : '▼'} {Math.abs(Math.round((compared[1].score - compared[0].score) * 10) / 10)}
                </td>
              </tr>
              <tr><td>Classification</td><td><Chip tone={CLASSIFICATION_CHIP[compared[0].classification]}>{compared[0].classification}</Chip></td><td><Chip tone={CLASSIFICATION_CHIP[compared[1].classification]}>{compared[1].classification}</Chip></td><td></td></tr>
            </tbody>
          </table>

          <h4 className="ia-card-title" style={{ marginTop: 16 }}>Rule pass rate</h4>
          <table className="ia-map-table">
            <thead><tr><th>Rule</th><th>{compared[0].id}</th><th>{compared[1].id}</th></tr></thead>
            <tbody>
              {compared[0].ruleResults.map(r0 => {
                const r1 = compared[1].ruleResults.find(r => r.ruleId === r0.ruleId);
                return <tr key={r0.ruleId}><td>{r0.ruleName}</td><td className="num">{fmtPct(r0.passPct)}</td><td className="num">{r1 ? fmtPct(r1.passPct) : '—'}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
