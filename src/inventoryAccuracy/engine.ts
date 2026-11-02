/* ── Validation engine ─────────────────────────────────────────────────────
   Runs a rule set against a row collection and reports, per rule: how many
   rows it applied to, how many of those failed, and how many were excluded
   because the field simply doesn't apply to that row (PRD: "do not count
   missing or inapplicable values as passed records"). Conditions are
   evaluated through a small closed set of predicates — never eval() or
   new Function() on the rule's configured text, so a user-authored rule
   can never run arbitrary code. */
import type { MappedRow } from './parse';
import type { AccuracyEntityType, Rule, RuleResult } from './model';

export interface RuleFailure { resourceId: string; resourceName: string; rowNumber: number; field: string; value?: string; message: string }
export interface RuleEvalResult extends RuleResult { failures: RuleFailure[] }

export interface RefSets {
  /** ids that exist today in src/data/locations.ts, keyed by entity type they are referenced as */
  siteIds: Set<string>;
}

function matchesPredicate(rule: Rule, raw: string | undefined): { applicable: boolean; pass: boolean } {
  const c = rule.condition;
  if (c.operator === 'required') return { applicable: true, pass: !!raw && raw.trim() !== '' };
  if (raw === undefined || raw === '') return { applicable: false, pass: true };
  switch (c.operator) {
    case 'equals': return { applicable: true, pass: raw === c.value };
    case 'notEquals': return { applicable: true, pass: raw !== c.value };
    case 'oneOf': return { applicable: true, pass: (c.options ?? []).includes(raw) };
    case 'regex': {
      try { return { applicable: true, pass: new RegExp(c.pattern ?? '.*').test(raw) }; }
      catch { return { applicable: true, pass: true }; }
    }
    case 'range': case 'geoLat': case 'geoLon': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { applicable: true, pass: false };
      const min = c.min ?? (c.operator === 'geoLat' ? -90 : c.operator === 'geoLon' ? -180 : -Infinity);
      const max = c.max ?? (c.operator === 'geoLat' ? 90 : c.operator === 'geoLon' ? 180 : Infinity);
      return { applicable: true, pass: n >= min && n <= max };
    }
    case 'refExists': return { applicable: true, pass: false }; /* resolved by caller via refs */
    case 'unique': return { applicable: true, pass: true }; /* resolved by caller via a full pass over rows */
  }
}

export function evaluateRule(rule: Rule, rows: MappedRow[], idField: string, nameField: string, refs: RefSets): RuleEvalResult {
  const failures: RuleFailure[] = [];
  let applicable = 0, failed = 0, excluded = 0;

  if (rule.condition.operator === 'unique') {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const v = r.fields[rule.field];
      if (!v) { excluded++; continue; }
      seen.set(v, (seen.get(v) ?? 0) + 1);
    }
    for (const r of rows) {
      const v = r.fields[rule.field];
      if (!v) continue;
      applicable++;
      if ((seen.get(v) ?? 0) > 1) {
        failed++;
        failures.push({ resourceId: r.fields[idField] ?? '—', resourceName: r.fields[nameField] ?? r.fields[idField] ?? '—', rowNumber: r.rowNumber, field: rule.field, value: v, message: rule.message });
      }
    }
  } else {
    for (const r of rows) {
      const v = r.fields[rule.field];
      if (rule.condition.operator === 'refExists') {
        if (!v) { excluded++; continue; }
        applicable++;
        const hit = refs.siteIds.has(v);
        if (!hit) {
          failed++;
          failures.push({ resourceId: r.fields[idField] ?? '—', resourceName: r.fields[nameField] ?? r.fields[idField] ?? '—', rowNumber: r.rowNumber, field: rule.field, value: v, message: rule.message });
        }
        continue;
      }
      const { applicable: ap, pass } = matchesPredicate(rule, v);
      if (!ap) { excluded++; continue; }
      applicable++;
      if (!pass) {
        failed++;
        failures.push({ resourceId: r.fields[idField] ?? '—', resourceName: r.fields[nameField] ?? r.fields[idField] ?? '—', rowNumber: r.rowNumber, field: rule.field, value: v, message: rule.message });
      }
    }
  }

  const passPct = applicable ? Math.round(((applicable - failed) / applicable) * 1000) / 10 : 100;
  return { ruleId: rule.id, ruleName: rule.name, category: rule.category, severity: rule.severity, weight: rule.weight, applicable, failed, excluded, passPct, failures };
}

export function runRules(rules: Rule[], entityType: AccuracyEntityType, rows: MappedRow[], idField: string, nameField: string, refs: RefSets): RuleEvalResult[] {
  return rules.filter(r => r.active && r.status === 'Active' && r.entityType === entityType).map(r => evaluateRule(r, rows, idField, nameField, refs));
}
