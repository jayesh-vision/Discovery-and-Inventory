/* ── Inventory Assurance store: execution/issue persistence ───────────────
   This app has no backend, so every upload's execution record, its
   reconciliation outcomes and the quality issues it raised live in browser
   storage — the same injectable-KV/in-memory-fallback shape as
   src/dcim/store.ts, namespaced so it never collides with DCIM's or
   Reconciliation's own localStorage keys:

     inventoryAccuracy.v1.executions        AccuracyExecution[]
     inventoryAccuracy.v1.issues            QualityIssue[]
     inventoryAccuracy.v1.reconcile.<execId> ReconciliationRecord[]

   A write that fails (quota exceeded, storage blocked) throws from the
   underlying KV; callers see the previous state stay in place. */
import type { AccuracyExecution, QualityIssue, ReconciliationRecord } from './model';

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }

const PREFIX = 'inventoryAccuracy.v1.';
const EXEC_KEY = PREFIX + 'executions';
const ISSUE_KEY = PREFIX + 'issues';
const reconKey = (execId: string) => `${PREFIX}reconcile.${execId}`;

function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
}
function browserKV(): KV {
  try {
    const t = '__ia_probe__';
    window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t);
    return window.localStorage;
  } catch { return memoryKV(); }
}

class AccuracyStore {
  private kv: KV;
  private listeners = new Set<() => void>();
  readonly volatile: boolean;

  constructor(kv?: KV) {
    if (kv) { this.kv = kv; this.volatile = false; }
    else if (typeof window !== 'undefined') { this.kv = browserKV(); this.volatile = this.kv !== window.localStorage; }
    else { this.kv = memoryKV(); this.volatile = true; }
  }

  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private changed() { this.listeners.forEach(f => f()); }

  private readList<T>(key: string): T[] {
    try { const raw = this.kv.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; }
    catch { return []; }
  }
  private writeList<T>(key: string, list: T[]) { this.kv.setItem(key, JSON.stringify(list)); }

  executions(): AccuracyExecution[] {
    return this.readList<AccuracyExecution>(EXEC_KEY).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }
  execution(id: string): AccuracyExecution | undefined {
    return this.executions().find(e => e.id === id);
  }

  reconciliationFor(executionId: string): ReconciliationRecord[] {
    return this.readList<ReconciliationRecord>(reconKey(executionId));
  }

  /** persist a completed upload: the execution summary, its reconciliation
      rows and the quality issues it raised, in one call. */
  commitExecution(exec: AccuracyExecution, reconciliation: ReconciliationRecord[], issues: QualityIssue[]) {
    const execs = this.readList<AccuracyExecution>(EXEC_KEY).filter(e => e.id !== exec.id);
    this.writeList(EXEC_KEY, [...execs, exec]);
    this.writeList(reconKey(exec.id), reconciliation);
    const existingIssues = this.readList<QualityIssue>(ISSUE_KEY);
    this.writeList(ISSUE_KEY, [...existingIssues, ...issues]);
    this.changed();
  }

  updateReconciliationDecision(executionId: string, key: string, decision: ReconciliationRecord['decision'], by: string) {
    const rows = this.reconciliationFor(executionId).map(r => r.key !== key ? r : { ...r, decision, decidedAt: new Date().toISOString(), decidedBy: by });
    this.writeList(reconKey(executionId), rows);
    this.changed();
  }

  issues(): QualityIssue[] {
    return this.readList<QualityIssue>(ISSUE_KEY).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateIssue(id: string, patch: Partial<QualityIssue>) {
    const next = this.readList<QualityIssue>(ISSUE_KEY).map(i => i.id === id ? { ...i, ...patch } : i);
    this.writeList(ISSUE_KEY, next);
    this.changed();
  }

  updateIssues(ids: Set<string>, patch: Partial<QualityIssue>) {
    const next = this.readList<QualityIssue>(ISSUE_KEY).map(i => ids.has(i.id) ? { ...i, ...patch } : i);
    this.writeList(ISSUE_KEY, next);
    this.changed();
  }

  /** overwrite one execution's summary in place — used only by run.ts's
      recalculateScore after an issue is resolved/excepted/rejected. */
  updateExecution(exec: AccuracyExecution) {
    const next = this.readList<AccuracyExecution>(EXEC_KEY).map(e => e.id === exec.id ? exec : e);
    this.writeList(EXEC_KEY, next);
    this.changed();
  }
}

export const accuracyStore = new AccuracyStore();
