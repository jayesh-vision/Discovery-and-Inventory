/* ── Dashboard aggregation ─────────────────────────────────────────────────
   Pure functions over what's actually persisted (store.ts's executions,
   reconciliation rows and issues) — nothing here is a hardcoded number.
   If there are no executions yet, every aggregate reports an honest empty
   state rather than a placeholder percentage. */
import { accuracyStore } from './store';
import { LOCATIONS } from '../data/locations';
import type { AccuracyEntityType, AccuracyExecution } from './model';
import { ENTITY_LABEL, ENTITY_TYPES } from './model';

export interface OverallKpis {
  total: number; valid: number; invalid: number; duplicate: number; missingAttribute: number; relationshipMismatch: number; accuracy: number | null;
}

export function overallKpis(executions: AccuracyExecution[]): OverallKpis {
  if (!executions.length) return { total: 0, valid: 0, invalid: 0, duplicate: 0, missingAttribute: 0, relationshipMismatch: 0, accuracy: null };
  const total = executions.reduce((a, e) => a + e.totalRecords, 0);
  const weighted = executions.reduce((a, e) => a + e.score * e.totalRecords, 0);
  return {
    total,
    valid: executions.reduce((a, e) => a + e.validRecords, 0),
    invalid: executions.reduce((a, e) => a + e.invalidRecords, 0),
    duplicate: executions.reduce((a, e) => a + e.duplicateRecords, 0),
    missingAttribute: executions.reduce((a, e) => a + e.missingAttributeRecords, 0),
    relationshipMismatch: executions.reduce((a, e) => a + e.relationshipMismatchRecords, 0),
    accuracy: total ? Math.round((weighted / total) * 10) / 10 : null
  };
}

export interface CategoryAccuracy { entityType: AccuracyEntityType; label: string; score: number | null; executions: number; lastUploadedAt: string | null }

export function accuracyByCategory(executions: AccuracyExecution[]): CategoryAccuracy[] {
  return ENTITY_TYPES.map(entityType => {
    const forType = executions.filter(e => e.entityType === entityType).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    return { entityType, label: ENTITY_LABEL[entityType], score: forType[0]?.score ?? null, executions: forType.length, lastUploadedAt: forType[0]?.uploadedAt ?? null };
  });
}

export interface GroupAccuracy { group: string; total: number; failed: number; score: number }

/** groups the latest execution's uploaded rows by a field (vendor, neClass, ...)
    and scores each group by how many of its rows raised at least one issue. */
export function accuracyByUploadedField(entityType: AccuracyEntityType, field: string): GroupAccuracy[] {
  const latest = accuracyStore.executions().filter(e => e.entityType === entityType).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  if (!latest) return [];
  const rows = accuracyStore.reconciliationFor(latest.id).filter(r => r.uploaded);
  const issues = accuracyStore.issues().filter(i => i.executionId === latest.id);
  const failedIds = new Set(issues.map(i => i.resourceId));
  const groups = new Map<string, { total: number; failed: number }>();
  for (const r of rows) {
    const g = r.uploaded?.[field] || 'Unspecified';
    const cur = groups.get(g) ?? { total: 0, failed: 0 };
    cur.total++;
    if (failedIds.has(r.resourceId)) cur.failed++;
    groups.set(g, cur);
  }
  return [...groups.entries()]
    .map(([group, v]) => ({ group, total: v.total, failed: v.failed, score: v.total ? Math.round(((v.total - v.failed) / v.total) * 1000) / 10 : 100 }))
    .sort((a, b) => b.total - a.total);
}

export function accuracyByGeography(entityType: AccuracyEntityType): GroupAccuracy[] {
  const latest = accuracyStore.executions().filter(e => e.entityType === entityType).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  if (!latest) return [];
  const rows = accuracyStore.reconciliationFor(latest.id).filter(r => r.uploaded);
  const issues = accuracyStore.issues().filter(i => i.executionId === latest.id);
  const failedIds = new Set(issues.map(i => i.resourceId));
  const siteField = entityType === 'networkElement' ? 'parentSiteId' : entityType === 'fiberCable' ? 'siteId' : 'siteId';
  const groups = new Map<string, { total: number; failed: number }>();
  for (const r of rows) {
    const siteId = r.uploaded?.[siteField];
    const loc = siteId ? LOCATIONS.find(l => l.id === siteId) : undefined;
    const g = loc ? `${loc.city}, ${loc.state}` : 'Unknown site';
    const cur = groups.get(g) ?? { total: 0, failed: 0 };
    cur.total++;
    if (failedIds.has(r.resourceId)) cur.failed++;
    groups.set(g, cur);
  }
  return [...groups.entries()]
    .map(([group, v]) => ({ group, total: v.total, failed: v.failed, score: v.total ? Math.round(((v.total - v.failed) / v.total) * 1000) / 10 : 100 }))
    .sort((a, b) => b.total - a.total);
}

export interface TrendPoint { date: string; score: number; executions: number }

export function accuracyTrend(executions: AccuracyExecution[], days: number): TrendPoint[] {
  const now = Date.now();
  const byDay = new Map<string, { weighted: number; records: number; count: number }>();
  for (const e of executions) {
    const t = new Date(e.uploadedAt).getTime();
    if (now - t > days * 86400000) continue;
    const day = e.uploadedAt.slice(0, 10);
    const cur = byDay.get(day) ?? { weighted: 0, records: 0, count: 0 };
    cur.weighted += e.score * e.totalRecords; cur.records += e.totalRecords; cur.count++;
    byDay.set(day, cur);
  }
  return [...byDay.entries()]
    .map(([date, v]) => ({ date, score: v.records ? Math.round((v.weighted / v.records) * 10) / 10 : 100, executions: v.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
