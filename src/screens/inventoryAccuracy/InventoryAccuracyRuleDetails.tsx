/* Rule details — lifecycle transitions, approval/activity log, execution
   history (appended for real by run.ts's commitExecution on every upload),
   and a "test against sample records" dry run that never writes anything:
   it evaluates this one rule against the demo sample file for its entity
   type, in memory, and discards the result once the panel closes. */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Chip } from '../../components/ui';
import { withSolution } from '../../solution';
import { RULE_STATUS_NEXT, ruleById, transitionRule } from '../../inventoryAccuracy/rules';
import { evaluateRule, type RuleEvalResult } from '../../inventoryAccuracy/engine';
import { readCsv, planUpload } from '../../inventoryAccuracy/parse';
import { demoCsvFor } from '../../inventoryAccuracy/sample';
import { schemaOf } from '../../inventoryAccuracy/schema';
import { LOCATIONS } from '../../data/locations';
import { ENTITY_LABEL } from '../../inventoryAccuracy/model';
import { RULE_STATUS_TONE, SEVERITY_TONE, fmtPct, useStoreVersion } from './shared';
import '../../styles/inventoryAccuracy.css';

const BY = 'Current user';
const NAME_FIELD: Record<string, string> = { networkElement: 'deviceName', site: 'siteName', fiberCable: 'cableId' };

export default function InventoryAccuracyRuleDetails() {
  useStoreVersion();
  const nav = useNavigate();
  const { id } = useParams();
  const [note, setNote] = useState('');
  const [testResult, setTestResult] = useState<RuleEvalResult | null>(null);
  const rule = id ? ruleById(id) : undefined;

  if (!rule) return <div className="page ia-page"><Card><p className="ia-empty">Rule not found.</p></Card></div>;
  const schema = schemaOf(rule.entityType);
  const next = RULE_STATUS_NEXT[rule.status];

  const doTransition = () => {
    if (!next) return;
    transitionRule(rule.id, next.to, next.action, BY, note || undefined);
    setNote('');
  };

  const testAgainstSample = () => {
    const raw = readCsv(demoCsvFor(rule.entityType), 'sample.csv');
    const plan = planUpload(raw, rule.entityType);
    const siteIds = new Set(LOCATIONS.map(l => l.id));
    setTestResult(evaluateRule(rule, plan.rows, schema.idField, NAME_FIELD[rule.entityType], { siteIds }));
  };

  return (
    <div className="page ia-page">
      <Card>
        <div className="ia-card-head-row">
          <div>
            <h3 className="ia-card-title">{rule.name}</h3>
            <p className="ia-empty">{rule.id} · {ENTITY_LABEL[rule.entityType]} · field <span className="mono">{rule.field}</span></p>
          </div>
          <Chip tone={RULE_STATUS_TONE[rule.status]}>{rule.status}</Chip>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#334155' }}>{rule.description}</p>
        <table className="ia-map-table">
          <tbody>
            <tr><td>Category</td><td>{rule.category}</td></tr>
            <tr><td>Severity</td><td><Chip tone={SEVERITY_TONE[rule.severity]}>{rule.severity}</Chip></td></tr>
            <tr><td>Weight</td><td className="num">{rule.weight}</td></tr>
            <tr><td>Condition</td><td><span className="ia-rule-cond">{JSON.stringify(rule.condition)}</span></td></tr>
            <tr><td>Message</td><td>{rule.message}</td></tr>
            <tr><td>Applicable vendor</td><td>{rule.vendor ?? 'All vendors'}</td></tr>
            <tr><td>Effective date</td><td>{rule.effectiveDate ?? '—'}</td></tr>
            <tr><td>Owner</td><td>{rule.owner}</td></tr>
          </tbody>
        </table>

        <div className="ia-foot">
          <button type="button" className="nst-btn" onClick={() => nav(withSolution(`/inventory/rule-management/${rule.id}/edit`))}>Edit rule</button>
          <button type="button" className="nst-btn" onClick={testAgainstSample}>Test against sample records</button>
          {next && (
            <>
              <input className="nst-input" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} style={{ maxWidth: 220 }} />
              <button type="button" className="nst-btn nst-btn--filled" onClick={doTransition}>{next.action}</button>
            </>
          )}
        </div>

        {testResult && (
          <div className="ia-map-table" style={{ marginTop: 12 }}>
            <p className="ia-empty">Dry run against the sample file (nothing written): {testResult.applicable} applicable, {testResult.failed} failed, {testResult.excluded} excluded, pass rate {fmtPct(testResult.passPct)}.</p>
            {testResult.failures.length > 0 && (
              <table className="ia-map-table">
                <thead><tr><th>Resource</th><th>Value</th></tr></thead>
                <tbody>{testResult.failures.map(f => <tr key={f.resourceId + f.rowNumber}><td className="mono">{f.resourceId}</td><td>{f.value ?? '—'}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="ia-card-title">Execution history</h3>
        {rule.executions.length === 0
          ? <p className="ia-empty">This rule has not run against a real upload yet.</p>
          : (
            <table className="ia-map-table">
              <thead><tr><th>When</th><th>Applicable</th><th>Failed</th><th>Pass %</th></tr></thead>
              <tbody>{rule.executions.slice().reverse().map((e, i) => <tr key={i}><td>{e.at}</td><td className="num">{e.applicable}</td><td className="num">{e.failed}</td><td className="num">{fmtPct(e.passPct)}</td></tr>)}</tbody>
            </table>
          )}
      </Card>

      <Card>
        <h3 className="ia-card-title">Approval history</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8125rem', color: '#334155' }}>
          {rule.approvalHistory.slice().reverse().map((a, i) => <li key={i}>{a.at} — {a.by} {a.action}{a.note ? `: ${a.note}` : ''}</li>)}
        </ul>
      </Card>
    </div>
  );
}
