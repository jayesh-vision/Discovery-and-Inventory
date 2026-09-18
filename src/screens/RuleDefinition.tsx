import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui';
import {
  RULES, MOCK_USERS, OPERATORS, ruleById, persistRules,
  type Condition, type DomainKey, type Operator, type Rule, type RulePriority
} from '../data/rules';
import { DOMAIN_OPTIONS } from '../data/discoveryOverview';

const newId = (domain: DomainKey) => {
  const prefix = domain === 'IPMPLS' ? 'IPM' : domain.slice(0, 3).toUpperCase();
  const n = RULES.filter(r => r.id.startsWith(`RUL-${prefix}-`)).length + 1;
  return `RUL-${prefix}-${String(n).padStart(3, '0')}`;
};
const newCondId = () => `c${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="stack-s" style={{ gap: '4px' }}>
    <label className="nst-input-label">{label}</label>
    {children}
  </div>
);
const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <span className="nst-select-shell"><select className="nst-input" {...p} /></span>
);
const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <span className="nst-input-shell"><input className="nst-input" {...p} /></span>
);

export default function RuleDefinition() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = id ? ruleById(id) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [domain, setDomain] = useState<DomainKey>(editing?.domain ?? 'RAN');
  const [source, setSource] = useState(editing?.source ?? '');
  const [target, setTarget] = useState(editing?.target ?? '');
  const [ruleType, setRuleType] = useState(editing?.ruleType ?? 'Identity match');
  const [priority, setPriority] = useState<RulePriority>(editing?.priority ?? 'Medium');
  const [owner, setOwner] = useState(editing?.owner ?? MOCK_USERS[0]);
  const [reviewer, setReviewer] = useState(editing?.reviewer ?? MOCK_USERS[1]);
  const [approver, setApprover] = useState(editing?.approver ?? MOCK_USERS[2]);
  const [executor, setExecutor] = useState(editing?.executor ?? MOCK_USERS[0]);
  const [exceptionReviewer, setExceptionReviewer] = useState(editing?.exceptionReviewer ?? MOCK_USERS[1]);
  const [conditions, setConditions] = useState<Condition[]>(
    editing?.conditions.map(c => ({ ...c })) ?? [{ id: newCondId(), sourceField: '', operator: 'Equals' as Operator, targetField: '' }]
  );

  const addCondition = () => setConditions(cs => [...cs.map((c, i) => i === cs.length - 1 ? { ...c, connector: 'AND' as const } : c),
    { id: newCondId(), sourceField: '', operator: 'Equals', targetField: '' }]);
  const removeCondition = (cid: string) => setConditions(cs => {
    const next = cs.filter(c => c.id !== cid);
    if (next.length) next[next.length - 1] = { ...next[next.length - 1], connector: undefined };
    return next;
  });
  const updateCondition = (cid: string, patch: Partial<Condition>) =>
    setConditions(cs => cs.map(c => c.id === cid ? { ...c, ...patch } : c));

  const canSave = name.trim().length > 0 && source.trim().length > 0 && target.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (editing) {
      Object.assign(editing, {
        name, description, domain, source, target, ruleType, priority,
        owner, reviewer, approver, executor, exceptionReviewer,
        conditions, lastUpdated: `${today()} ${new Date().toTimeString().slice(0, 5)}`
      });
      editing.activity.unshift({ at: `${today()} ${new Date().toTimeString().slice(0, 5)}`, by: owner, event: 'Rule definition edited' });
      persistRules();
      nav(`/discovery/reconcile/rules/${editing.id}`);
    } else {
      const newRule: Rule = {
        id: newId(domain), name, description, domain, source, target, ruleType, priority,
        status: 'Draft', origin: 'Manual',
        owner, reviewer, approver, executor, exceptionReviewer,
        createdBy: owner, createdDate: today(), lastUpdated: today(), lastExecution: null,
        conditions, expectedImpact: description || 'Not yet estimated.',
        approvalHistory: [], activity: [{ at: today(), by: owner, event: 'Rule created' }], executions: []
      };
      RULES.push(newRule);
      persistRules();
      nav(`/discovery/reconcile/rules/${newRule.id}`);
    }
  };

  return (
    <div className="page">
      <Card>
        <span className="vw-card-title-sm">Basic information</span>
        <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 'var(--vw-space-md)' }}>
          <Field label="Rule name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. gNodeB identity match" /></Field>
          <Field label="Domain">
            <Select value={domain} onChange={e => setDomain(e.target.value as DomainKey)}>
              {/* the domain tree: a sub-domain is indented under its parent */}
              {DOMAIN_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.l}</option>)}
            </Select>
          </Field>
          <Field label="Source"><Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Network · SNMP v2c/v3" /></Field>
          <Field label="Target"><Input value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. Inventory · RAN asset register" /></Field>
          <Field label="Rule type"><Input value={ruleType} onChange={e => setRuleType(e.target.value)} placeholder="e.g. Identity match" /></Field>
          <Field label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value as RulePriority)}>
              <option>High</option><option>Medium</option><option>Low</option>
            </Select>
          </Field>
        </div>
        <div style={{ marginTop: 'var(--vw-space-md)' }}>
          <Field label="Description">
            <textarea className="nst-input" style={{ minHeight: '5rem', resize: 'vertical' }} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="What this rule matches and why it exists" />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="row vw-justify-between vw-items-start">
          <div>
            <span className="vw-card-title-sm">Matching conditions</span>
            <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Source field → operator → target field, joined by AND/OR</div>
          </div>
          <button className="nst-btn nst-btn--sm" onClick={addCondition}>Add condition</button>
        </div>
        <div className="tbl-wrap" style={{ marginTop: 'var(--vw-space-md)' }}>
          <table className="nst-table">
            <thead><tr><th>Source field</th><th>Operator</th><th>Target field</th><th></th><th className="kb-th"></th></tr></thead>
            <tbody>
              {conditions.map((c, i) => (
                <tr key={c.id}>
                  <td><Input value={c.sourceField} onChange={e => updateCondition(c.id, { sourceField: e.target.value })} placeholder="e.g. Cell ID" /></td>
                  <td>
                    <Select value={c.operator} onChange={e => updateCondition(c.id, { operator: e.target.value as Operator })}>
                      {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                    </Select>
                  </td>
                  <td><Input value={c.targetField} onChange={e => updateCondition(c.id, { targetField: e.target.value })} placeholder="e.g. Cell ID" /></td>
                  <td>
                    {i < conditions.length - 1 && (
                      <Select value={c.connector ?? 'AND'} onChange={e => updateCondition(c.id, { connector: e.target.value as 'AND' | 'OR' })}>
                        <option value="AND">AND</option><option value="OR">OR</option>
                      </Select>
                    )}
                  </td>
                  <td>
                    <button className="nst-btn nst-btn--xs nst-btn--danger-subtle" onClick={() => removeCondition(c.id)} disabled={conditions.length <= 1}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <span className="vw-card-title-sm">Responsibilities</span>
        <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>Who owns, reviews, approves and executes this rule</div>
        <div className="vw-grid vw-gap-md" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 'var(--vw-space-md)' }}>
          <Field label="Owner"><Select value={owner} onChange={e => setOwner(e.target.value)}>{MOCK_USERS.map(u => <option key={u}>{u}</option>)}</Select></Field>
          <Field label="Reviewer"><Select value={reviewer} onChange={e => setReviewer(e.target.value)}>{MOCK_USERS.map(u => <option key={u}>{u}</option>)}</Select></Field>
          <Field label="Approver"><Select value={approver} onChange={e => setApprover(e.target.value)}>{MOCK_USERS.map(u => <option key={u}>{u}</option>)}</Select></Field>
          <Field label="Executor"><Select value={executor} onChange={e => setExecutor(e.target.value)}>{MOCK_USERS.map(u => <option key={u}>{u}</option>)}</Select></Field>
          <Field label="Exception reviewer"><Select value={exceptionReviewer} onChange={e => setExceptionReviewer(e.target.value)}>{MOCK_USERS.map(u => <option key={u}>{u}</option>)}</Select></Field>
        </div>
      </Card>

      <div className="row" style={{ gap: '8px', justifyContent: 'flex-end' }}>
        <button className="nst-btn nst-btn--sm nst-btn--ghost" onClick={() => nav(-1)}>Cancel</button>
        <button className="nst-btn nst-btn--sm nst-btn--filled" disabled={!canSave} onClick={save}>
          {editing ? 'Save changes' : 'Create rule (Draft)'}
        </button>
      </div>
    </div>
  );
}
