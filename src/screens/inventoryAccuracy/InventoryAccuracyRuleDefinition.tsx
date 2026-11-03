/* Create/edit an Inventory Assurance rule. A rule's condition is always one
   of engine.ts's closed predicate set — this form can only ever produce a
   safe, declarative condition, never an arbitrary expression string. */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui';
import { withSolution } from '../../solution';
import { Select } from './Select';
import { nextRuleId, ruleById, saveRule } from '../../inventoryAccuracy/rules';
import { schemaOf } from '../../inventoryAccuracy/schema';
import { ENTITY_LABEL, ENTITY_TYPES, RULE_CATEGORIES, RULE_CATEGORY_LABEL, RULE_SEVERITIES, type AccuracyEntityType, type Condition, type Operator, type Rule, type RuleCategory, type RuleSeverity } from '../../inventoryAccuracy/model';
import '../../styles/inventoryAccuracy.css';

const OPERATORS: { v: Operator; n: string; hint: string }[] = [
  { v: 'required', n: 'Required', hint: 'The field must have a value.' },
  { v: 'unique', n: 'Unique', hint: 'No two uploaded rows may share this value.' },
  { v: 'refExists', n: 'Reference exists', hint: 'The value must match an existing record.' },
  { v: 'range', n: 'Numeric range', hint: 'The value must fall within min/max.' },
  { v: 'regex', n: 'Pattern', hint: 'The value must match a regular expression.' },
  { v: 'oneOf', n: 'One of a list', hint: 'The value must be one of a fixed set of options.' },
  { v: 'equals', n: 'Equals', hint: 'The value must equal a fixed value.' },
  { v: 'notEquals', n: 'Not equals', hint: 'The value must not equal a fixed value.' }
];

const NOW = '30-Oct-2026';
const BY = 'Current user';

export default function InventoryAccuracyRuleDefinition() {
  const nav = useNavigate();
  const { id } = useParams();
  const existing = id ? ruleById(id) : undefined;

  const [entityType, setEntityType] = useState<AccuracyEntityType>(existing?.entityType ?? 'networkElement');
  const [field, setField] = useState(existing?.field ?? schemaOf(entityType).fields[0].key);
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [category, setCategory] = useState<RuleCategory>(existing?.category ?? 'mandatory');
  const [severity, setSeverity] = useState<RuleSeverity>(existing?.severity ?? 'medium');
  const [weight, setWeight] = useState(existing?.weight ?? 10);
  const [message, setMessage] = useState(existing?.message ?? '');
  const [active, setActive] = useState(existing?.active ?? true);
  const [vendor, setVendor] = useState(existing?.vendor ?? '');
  const [effectiveDate, setEffectiveDate] = useState(existing?.effectiveDate ?? '');
  const [condition, setCondition] = useState<Condition>(existing?.condition ?? { operator: 'required' });
  const [err, setErr] = useState<string | null>(null);

  const schema = schemaOf(entityType);

  const save = () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    if (!message.trim()) { setErr('Error message is required.'); return; }
    const rule: Rule = existing ?? {
      id: nextRuleId(entityType), name: '', description: '', entityType, field, category, condition,
      severity, weight, message, active, status: 'Draft', owner: BY, createdBy: BY, createdDate: NOW, lastUpdated: NOW,
      approvalHistory: [], activity: [], executions: []
    };
    const next: Rule = {
      ...rule, name, description, entityType, field, category, condition, severity, weight, message, active,
      vendor: vendor || undefined, effectiveDate: effectiveDate || undefined, lastUpdated: NOW,
      activity: [...rule.activity, { at: NOW, by: BY, event: existing ? 'Rule definition edited' : 'Rule created' }]
    };
    saveRule(next);
    nav(withSolution(`/inventory/rule-management/${next.id}`));
  };

  return (
    <div className="page ia-page">
      <Card>
        <h3 className="ia-card-title">{existing ? `Edit ${existing.id}` : 'Create a new rule'}</h3>
        {err && <p className="ia-empty" style={{ color: '#dc2626' }}>{err}</p>}

        <div className="ia-map-table" style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label className="nst-input-label">Name<input className="nst-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Resource ID is mandatory" /></label>
          <label className="nst-input-label">Entity type
            <Select
              value={entityType} disabled={!!existing} ariaLabel="Entity type"
              options={ENTITY_TYPES.map(t => ({ value: t, label: ENTITY_LABEL[t] }))}
              onChange={v => { const t = v as AccuracyEntityType; setEntityType(t); setField(schemaOf(t).fields[0].key); }}
            />
          </label>
          <label className="nst-input-label" style={{ gridColumn: '1 / -1' }}>Description<input className="nst-input" value={description} onChange={e => setDescription(e.target.value)} /></label>
          <label className="nst-input-label">Field
            <Select value={field} ariaLabel="Field" options={schema.fields.map(f => ({ value: f.key, label: f.col }))} onChange={setField} />
          </label>
          <label className="nst-input-label">Category
            <Select
              value={category} ariaLabel="Category"
              options={RULE_CATEGORIES.map(c => ({ value: c, label: RULE_CATEGORY_LABEL[c] }))}
              onChange={v => setCategory(v as RuleCategory)}
            />
          </label>

          <label className="nst-input-label">Condition
            <Select
              value={condition.operator} ariaLabel="Condition"
              options={OPERATORS.map(o => ({ value: o.v, label: o.n }))}
              onChange={v => setCondition({ operator: v as Operator })}
            />
            <span className="field-hint-text">{OPERATORS.find(o => o.v === condition.operator)?.hint}</span>
          </label>

          {(condition.operator === 'equals' || condition.operator === 'notEquals') && (
            <label className="nst-input-label">Value<input className="nst-input" value={condition.value ?? ''} onChange={e => setCondition({ ...condition, value: e.target.value })} /></label>
          )}
          {condition.operator === 'range' && (
            <label className="nst-input-label">Min / Max
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="nst-input" type="number" value={condition.min ?? ''} onChange={e => setCondition({ ...condition, min: Number(e.target.value) })} placeholder="min" />
                <input className="nst-input" type="number" value={condition.max ?? ''} onChange={e => setCondition({ ...condition, max: Number(e.target.value) })} placeholder="max" />
              </div>
            </label>
          )}
          {condition.operator === 'regex' && (
            <label className="nst-input-label">Pattern<input className="nst-input mono" value={condition.pattern ?? ''} onChange={e => setCondition({ ...condition, pattern: e.target.value })} placeholder="^[0-9]+$" /></label>
          )}
          {condition.operator === 'oneOf' && (
            <label className="nst-input-label">Options (comma separated)<input className="nst-input" value={(condition.options ?? []).join(', ')} onChange={e => setCondition({ ...condition, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label>
          )}
          {condition.operator === 'refExists' && (
            <label className="nst-input-label">References
              <Select
                value={condition.refEntity ?? 'site'} ariaLabel="References"
                options={[{ value: 'site', label: 'Sites' }]}
                onChange={v => setCondition({ ...condition, refEntity: v as AccuracyEntityType })}
              />
            </label>
          )}

          <label className="nst-input-label">Severity
            <Select
              value={severity} ariaLabel="Severity"
              options={RULE_SEVERITIES.map(s => ({ value: s, label: s }))}
              onChange={v => setSeverity(v as RuleSeverity)}
            />
          </label>
          <label className="nst-input-label">Weight (1–100)<input className="nst-input" type="number" min={1} max={100} value={weight} onChange={e => setWeight(Number(e.target.value))} /></label>
          <label className="nst-input-label" style={{ gridColumn: '1 / -1' }}>Error message<input className="nst-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Shown on every record this rule fails" /></label>
          <label className="nst-input-label">Applicable vendor (optional)<input className="nst-input" value={vendor} onChange={e => setVendor(e.target.value)} /></label>
          <label className="nst-input-label">Effective date (optional)<input className="nst-input" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} placeholder="e.g. 01-Nov-2026" /></label>
          <label className="nst-input-label"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
        </div>

        <div className="ia-foot">
          <button type="button" className="nst-btn nst-btn--ghost" onClick={() => nav(withSolution('/inventory/rule-management'))}>Cancel</button>
          <button type="button" className="nst-btn nst-btn--filled" onClick={save}>{existing ? 'Save changes' : 'Create rule'}</button>
        </div>
      </Card>
    </div>
  );
}
