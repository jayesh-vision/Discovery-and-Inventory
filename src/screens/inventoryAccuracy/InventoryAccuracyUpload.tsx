/* Inventory › Accuracy › Upload — category → file → columns → mode → review → done.
   Nothing is written to the store until "Submit" on a review with no
   blocking errors; the staged preview (run.ts's previewUpload) is held in
   this screen's state only. Mirrors src/screens/DcimImport.tsx's step
   machine and drop-zone, generalized to the three Telecom-estate entities
   this feature validates/reconciles against. */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, TabBar } from '../../components/ui';
import { withSolution } from '../../solution';
import { ENTITY_LABEL, ENTITY_TYPES, type AccuracyEntityType, type AccuracyExecution, type ImportMode } from '../../inventoryAccuracy/model';
import { readFile, planUpload, remapColumn, unmappedRequired, type UploadPlan } from '../../inventoryAccuracy/parse';
import { demoFileFor, downloadText, templateCsvFor, toCsv } from '../../inventoryAccuracy/sample';
import { previewUpload, commitExecution, type AccuracyPreview } from '../../inventoryAccuracy/run';
import { Select } from './Select';
import { ValidationPanel, ReconciliationPanel, IssuesPanel } from './panels';
import { OUTCOME_TONE, SEVERITY_TONE, CLASSIFICATION_CHIP, fmtPct } from './shared';
import '../../styles/inventoryAccuracy.css';

type Step = 'category' | 'file' | 'columns' | 'mode' | 'review' | 'done';
const STEPS: { k: Step; n: string }[] = [
  { k: 'category', n: '1 · Category' }, { k: 'file', n: '2 · File' }, { k: 'columns', n: '3 · Columns' },
  { k: 'mode', n: '4 · Import mode' }, { k: 'review', n: '5 · Review' }, { k: 'done', n: '6 · Results' }
];

type ResultTab = 'validation' | 'reconciliation' | 'issues';

const ENTITY_DESC: Record<AccuracyEntityType, string> = {
  networkElement: 'Routers, switches, servers, DWDM, eNodeB, gNodeB — the Physical Resources register.',
  site: 'POPs, cell sites, central offices — the Location roster.',
  fiberCable: "A site's incoming cable-tray ledger."
};

const MODE_DESC: Record<ImportMode, string> = {
  new: 'Only add records that do not already exist. Matches against an existing record are flagged CONFLICT, not applied.',
  update: 'Only update records that already exist. Rows with no existing match are skipped.',
  upsert: 'Add new records and update matching ones. The safest default for most uploads.'
};

const UPLOADED_BY = 'Current user';

export default function InventoryAccuracyUpload() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('category');
  const [entityType, setEntityType] = useState<AccuracyEntityType>('site');
  const [fileName, setFileName] = useState('');
  const [plan, setPlan] = useState<UploadPlan | null>(null);
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [preview, setPreview] = useState<AccuracyPreview | null>(null);
  const [committed, setCommitted] = useState<AccuracyExecution | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('validation');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const at = STEPS.findIndex(s => s.k === step);

  const load = async (file: File) => {
    setErr(null);
    if (!/\.(csv|xlsx)$/i.test(file.name)) { setErr('Choose a CSV or Excel (.xlsx) file.'); return; }
    setBusy(true);
    try {
      const raw = await readFile(file);
      if (!raw.rows.length) throw new Error('No data rows were found in this file.');
      const p = planUpload(raw, entityType);
      setFileName(file.name);
      setPlan(p);
      setStep('columns');
    } catch (e) { setErr(`Could not read the file: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  const runPreview = () => {
    if (!plan) return;
    const prev = previewUpload(entityType, plan.rows, fileName, mode, UPLOADED_BY);
    setPreview(prev);
    setStep('review');
  };

  const submit = () => {
    if (!preview) return;
    const exec = commitExecution(preview, UPLOADED_BY);
    setCommitted(exec);
    setResultTab('validation');
    setStep('done');
  };

  const restart = () => { setPlan(null); setPreview(null); setCommitted(null); setFileName(''); setErr(null); setStep('file'); };

  const blocked = plan ? unmappedRequired(plan).length : 0;

  return (
    <div className="page ia-page">
      <Card>
        <div className="ia-wizard-steps">
          {STEPS.map((s, i) => (
            <span key={s.k} className={`ia-wizard-step${i === at ? ' is-on' : i < at ? ' is-done' : ''}`}>{s.n}</span>
          ))}
        </div>

        {err && <p className="ia-empty" style={{ color: '#dc2626' }}>{err}</p>}

        {step === 'category' && (
          <>
            <h3 className="ia-card-title">What are you uploading?</h3>
            <div className="ia-category-grid">
              {ENTITY_TYPES.map(t => (
                <button key={t} type="button" className={`ia-category-card${entityType === t ? ' is-on' : ''}`} onClick={() => setEntityType(t)}>
                  <strong>{ENTITY_LABEL[t]}</strong>
                  <span>{ENTITY_DESC[t]}</span>
                </button>
              ))}
            </div>
            <div className="ia-foot">
              <button type="button" className="nst-btn nst-btn--filled" onClick={() => setStep('file')}>Continue</button>
            </div>
          </>
        )}

        {step === 'file' && (
          <>
            <h3 className="ia-card-title">Upload {ENTITY_LABEL[entityType]}</h3>
            <div className={`ia-drop${over ? ' is-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) load(f); }}
              onClick={() => fileRef.current?.click()}
              role="button" tabIndex={0}>
              <strong>Drag and drop your file here, or click to browse</strong>
              <span className="ia-drop-sub">CSV or Excel (.xlsx) · Nothing is committed until you submit on the review step</span>
              <input ref={fileRef} type="file" accept=".csv,.xlsx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ''; }} />
            </div>
            <div className="ia-foot">
              <button type="button" className="nst-btn nst-btn--ghost" onClick={() => setStep('category')} disabled={busy}>Back</button>
              <button type="button" className="nst-btn" onClick={() => downloadText(`${entityType}-template.csv`, templateCsvFor(entityType))}>Download template</button>
              <button type="button" className="nst-btn" onClick={() => load(demoFileFor(entityType))} disabled={busy}>Try sample file</button>
              {busy && <span className="ia-empty">Reading file…</span>}
            </div>
          </>
        )}

        {step === 'columns' && plan && (
          <>
            <h3 className="ia-card-title">Check the column mapping</h3>
            <p className="ia-empty">{fileName} · {plan.rows.length} row{plan.rows.length === 1 ? '' : 's'} · {plan.raw.headers.length} columns</p>
            <table className="ia-map-table">
              <thead><tr><th>Column in file</th><th>Maps to</th><th>Example</th></tr></thead>
              <tbody>
                {plan.raw.headers.map(h => (
                  <tr key={h}>
                    <td><span className="mono">{h}</span></td>
                    <td style={{ minWidth: 220 }}>
                      <Select
                        value={plan.mapping[h] ?? ''} ariaLabel={`Map column ${h}`}
                        options={[{ value: '', label: '— ignore —' }, ...plan.schema.fields.map(f => ({ value: f.key, label: `${f.col}${f.required ? ' *' : ''}` }))]}
                        onChange={v => setPlan(remapColumn(plan, h, v))}
                      />
                    </td>
                    <td className="ia-empty-inline">{plan.raw.rows[0]?.[h] ? `e.g. ${plan.raw.rows[0][h]}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plan.issues.length > 0 && (
              <p className="ia-empty" style={{ color: '#dc2626', marginTop: 8 }}>
                {plan.issues.filter(i => i.severity === 'error').length} structural error(s), {plan.issues.filter(i => i.severity === 'warning').length} warning(s) in this file — fix required-column mapping before continuing.
              </p>
            )}
            <div className="ia-foot">
              <button type="button" className="nst-btn nst-btn--ghost" onClick={restart}>Choose another file</button>
              <span style={{ flex: 1 }} />
              {blocked > 0 && <span className="ia-empty" style={{ color: '#dc2626' }}>{blocked} required column{blocked > 1 ? 's' : ''} not mapped</span>}
              <button type="button" className="nst-btn nst-btn--filled" onClick={() => setStep('mode')} disabled={blocked > 0}>Continue</button>
            </div>
          </>
        )}

        {step === 'mode' && (
          <>
            <h3 className="ia-card-title">Import mode</h3>
            <div className="ia-mode-grid">
              {(['new', 'update', 'upsert'] as ImportMode[]).map(m => (
                <button key={m} type="button" className={`ia-category-card${mode === m ? ' is-on' : ''}`} onClick={() => setMode(m)}>
                  <strong>{m === 'new' ? 'New records only' : m === 'update' ? 'Update existing records' : 'Upsert (insert + update)'}</strong>
                  <span>{MODE_DESC[m]}</span>
                </button>
              ))}
            </div>
            <div className="ia-foot">
              <button type="button" className="nst-btn nst-btn--ghost" onClick={() => setStep('columns')}>Back</button>
              <button type="button" className="nst-btn nst-btn--filled" onClick={runPreview}>Validate &amp; reconcile</button>
            </div>
          </>
        )}

        {step === 'review' && preview && (
          <>
            <h3 className="ia-card-title">Review before submitting</h3>
            <div className="ia-score-hero">
              <div className="ia-score-num">{fmtPct(preview.execution.score)}</div>
              <div>
                <Chip tone={CLASSIFICATION_CHIP[preview.execution.classification]}>{preview.execution.classification}</Chip>
                <div className="ia-score-sub">{preview.execution.validRecords} valid of {preview.execution.totalRecords} records · nothing is written to inventory yet</div>
              </div>
            </div>

            <h4 className="ia-card-title" style={{ marginTop: 16 }}>Validation — by rule</h4>
            <table className="ia-map-table">
              <thead><tr><th>Rule</th><th>Category</th><th>Severity</th><th>Weight</th><th>Applicable</th><th>Failed</th><th>Excluded</th><th>Pass %</th></tr></thead>
              <tbody>
                {preview.ruleResults.map(r => (
                  <tr key={r.ruleId}>
                    <td>{r.ruleName}</td><td>{r.category}</td>
                    <td><Chip tone={SEVERITY_TONE[r.severity]}>{r.severity}</Chip></td>
                    <td className="num">{r.weight}</td><td className="num">{r.applicable}</td>
                    <td className="num">{r.failed}</td><td className="num">{r.excluded}</td>
                    <td className="num">{fmtPct(r.passPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="ia-card-title" style={{ marginTop: 16 }}>Reconciliation — by outcome</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(preview.execution.reconciliation).map(([k, v]) => (
                <Chip key={k} tone={OUTCOME_TONE[k as keyof typeof OUTCOME_TONE]}>{k}: {v}</Chip>
              ))}
            </div>

            {preview.issues.length > 0 && (
              <div className="ia-foot" style={{ marginTop: 12 }}>
                <button type="button" className="nst-btn"
                  onClick={() => downloadText(`${entityType}-issues.csv`, toCsv(
                    ['IssueId', 'ResourceId', 'Rule', 'Severity', 'Description'],
                    preview.issues.map(i => [i.id, i.resourceId, i.ruleName, i.severity, i.description])
                  ))}>
                  Download error report ({preview.issues.length})
                </button>
              </div>
            )}

            <div className="ia-foot">
              <button type="button" className="nst-btn nst-btn--ghost" onClick={() => setStep('mode')}>Back</button>
              <span style={{ flex: 1 }} />
              <button type="button" className="nst-btn nst-btn--filled" onClick={submit}>Submit upload</button>
            </div>
          </>
        )}

        {step === 'done' && committed && (
          <>
            <div className="ia-score-hero">
              <div className="ia-score-num">{fmtPct(committed.score)}</div>
              <div>
                <Chip tone={CLASSIFICATION_CHIP[committed.classification]}>{committed.classification}</Chip>
                <div className="ia-score-sub">
                  {ENTITY_LABEL[entityType]} upload <span className="mono">{committed.id}</span> is recorded — {committed.validRecords} valid of {committed.totalRecords} records.
                </div>
              </div>
            </div>
            <div className="ia-foot">
              <button type="button" className="nst-btn" onClick={restart}>Upload another file</button>
              <button type="button" className="nst-btn nst-btn--filled" onClick={() => nav(withSolution('/inventory/quality-dashboard'))}>Go to dashboard</button>
            </div>
          </>
        )}
      </Card>

      {step === 'done' && committed && (
        <>
          <Card>
            <TabBar<ResultTab>
              tabs={[
                { k: 'validation', n: 'Validation Results', count: committed.invalidRecords },
                { k: 'reconciliation', n: 'Reconciliation Results', count: committed.totalRecords },
                { k: 'issues', n: 'Issues & Exceptions', count: preview?.issues.length ?? 0 }
              ]}
              active={resultTab} onChange={setResultTab}
            />
          </Card>
          {resultTab === 'validation' && <ValidationPanel execution={committed} onViewIssue={() => setResultTab('issues')} />}
          {resultTab === 'reconciliation' && <ReconciliationPanel execution={committed} />}
          {resultTab === 'issues' && <IssuesPanel executionId={committed.id} />}
        </>
      )}
    </div>
  );
}
