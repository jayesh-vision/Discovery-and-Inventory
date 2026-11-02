/* ── Orchestration: one upload → one execution ────────────────────────────
   Ties parse → rule engine → reconciliation → scoring together into a
   single staged preview (nothing written yet), and a commit step that
   writes it to store.ts. This is the one place that assembles an
   AccuracyExecution; every screen reads the result rather than
   recomputing it. */
import type { MappedRow } from './parse';
import { schemaOf } from './schema';
import { activeRulesFor, loadRules, saveRule } from './rules';
import { runRules } from './engine';
import { reconcile, outcomeCounts } from './reconcile';
import { computeScore, classify } from './scoring';
import { accuracyStore } from './store';
import { LOCATIONS } from '../data/locations';
import type { AccuracyEntityType, AccuracyExecution, ImportMode, QualityIssue, ReconciliationRecord, RuleCategory, RuleResult } from './model';
import type { RuleEvalResult } from './engine';

export interface AccuracyPreview {
  execution: AccuracyExecution;
  reconciliation: ReconciliationRecord[];
  issues: QualityIssue[];
  ruleResults: RuleEvalResult[];
}

function distinctRowsIn(results: RuleEvalResult[], categories: RuleCategory[]): Set<number> {
  const rows = new Set<number>();
  for (const r of results) if (categories.includes(r.category)) for (const f of r.failures) rows.add(f.rowNumber);
  return rows;
}

const NAME_FIELD: Record<AccuracyEntityType, string> = { networkElement: 'deviceName', site: 'siteName', fiberCable: 'cableId' };

export function previewUpload(entityType: AccuracyEntityType, rows: MappedRow[], fileName: string, mode: ImportMode, uploadedBy: string): AccuracyPreview {
  const executionId = `EXEC-${Date.now().toString(36).toUpperCase()}`;
  const schema = schemaOf(entityType);
  const rules = activeRulesFor(entityType);
  const siteIds = new Set(LOCATIONS.map(l => l.id));
  const ruleResults = runRules(rules, entityType, rows, schema.idField, NAME_FIELD[entityType], { siteIds });

  const rowByNumber = new Map(rows.map(r => [r.rowNumber, r]));
  const siteField = entityType === 'networkElement' ? 'parentSiteId' : 'siteId';

  const issues: QualityIssue[] = [];
  const criticalFailRows = new Set<number>();
  const anyFailRows = new Set<number>();
  for (const res of ruleResults) {
    const rule = rules.find(r => r.id === res.ruleId)!;
    for (const f of res.failures) {
      anyFailRows.add(f.rowNumber);
      if (rule.severity === 'critical') criticalFailRows.add(f.rowNumber);
      const rowFields = rowByNumber.get(f.rowNumber)?.fields;
      const site = rowFields?.[siteField] ? LOCATIONS.find(l => l.id === rowFields[siteField]) : undefined;
      issues.push({
        id: `ISS-${executionId}-${issues.length + 1}`,
        executionId, entityType, resourceId: f.resourceId, resourceName: f.resourceName,
        ruleId: rule.id, ruleName: rule.name, category: rule.category, severity: rule.severity,
        description: f.message, uploadedValue: f.value,
        recommendation: `Fix "${f.field}" on ${f.resourceId} to satisfy "${rule.name}".`,
        vendor: rowFields?.vendor, geography: site ? `${site.city}, ${site.state}` : undefined,
        status: 'Open', createdAt: new Date().toISOString()
      });
    }
  }

  const reconciliation = reconcile(entityType, rows, criticalFailRows, mode);
  const reconciliationCounts = outcomeCounts(reconciliation);
  const score = computeScore(ruleResults as RuleResult[]);

  const execution: AccuracyExecution = {
    id: executionId, entityType, fileName, uploadedBy, uploadedAt: new Date().toISOString(), importMode: mode,
    ruleSetVersion: loadRules().length,
    totalRecords: rows.length,
    validRecords: rows.length - anyFailRows.size,
    invalidRecords: anyFailRows.size,
    duplicateRecords: reconciliationCounts.DUPLICATE,
    missingAttributeRecords: distinctRowsIn(ruleResults, ['mandatory']).size,
    relationshipMismatchRecords: distinctRowsIn(ruleResults, ['referential']).size,
    reconciliation: reconciliationCounts,
    ruleResults,
    score, classification: classify(score),
    committed: false
  };

  return { execution, reconciliation, issues, ruleResults };
}

export function commitExecution(preview: AccuracyPreview, by: string): AccuracyExecution {
  const execution: AccuracyExecution = { ...preview.execution, committed: true, committedAt: new Date().toISOString(), committedBy: by };
  accuracyStore.commitExecution(execution, preview.reconciliation, preview.issues);
  const at = new Date(execution.uploadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  for (const res of preview.ruleResults) {
    const rule = loadRules().find(r => r.id === res.ruleId);
    if (rule) saveRule({ ...rule, executions: [...rule.executions, { at, applicable: res.applicable, failed: res.failed, passPct: res.passPct }] });
  }
  return execution;
}

/** "Rerun validation" (PRD §8): a rule failure whose issue has since been
    Resolved, Accepted as an exception, or Rejected no longer counts against
    that rule's pass rate — the underlying uploaded data hasn't changed, but
    the organisation's handling of it has. Recomputes and persists the
    execution's rule results, score and classification; does not touch
    reconciliation rows. */
export function recalculateScore(executionId: string): AccuracyExecution | undefined {
  const exec = accuracyStore.execution(executionId);
  if (!exec) return undefined;
  const openByRule = new Map<string, number>();
  for (const i of accuracyStore.issues()) {
    if (i.executionId !== executionId) continue;
    if (i.status === 'Resolved' || i.status === 'Accepted Exception' || i.status === 'Rejected') continue;
    openByRule.set(i.ruleId, (openByRule.get(i.ruleId) ?? 0) + 1);
  }
  const ruleResults = exec.ruleResults.map(r => {
    const failed = openByRule.get(r.ruleId) ?? 0;
    const passPct = r.applicable ? Math.round(((r.applicable - failed) / r.applicable) * 1000) / 10 : 100;
    return { ...r, failed, passPct };
  });
  const score = computeScore(ruleResults);
  const updated: AccuracyExecution = { ...exec, ruleResults, score, classification: classify(score) };
  accuracyStore.updateExecution(updated);
  return updated;
}
