/* ── Staging and reconciliation ───────────────────────────────────────────
   An import never touches the active dataset until it is confirmed:
     plans → coerce → stage (client scoping) → merge onto a COPY → validate
     → diff (created / updated / unchanged / kept-not-in-file) → preview.
   applyStaged() is the only function that produces the next ClientData, and
   it refuses a staged import with errors. Re-importing never deletes: a
   record missing from the file is kept and reported as "not in file". */
import { ENTITY_KEYS, emptyEntities, type ClientData, type Entities, type EntityKey, type ImportBatch } from './model';
import { coerceAll, type Issue, type SheetPlan } from './parse';
import { validate } from './validate';

export interface FieldChange { key: string; before: unknown; after: unknown }
export interface EntityDiff {
  created: string[];
  updated: { id: string; changes: FieldChange[] }[];
  unchanged: string[];
  /** in the store, not in this file — kept as they are */
  keptNotInFile: string[];
}
export interface StagedImport {
  clientId: string;
  clientName?: string;
  fileName: string;
  staged: Entities;
  merged: Entities;
  issues: Issue[];
  diff: Record<EntityKey, EntityDiff>;
  totals: { created: number; updated: number; unchanged: number; keptNotInFile: number; errors: number; warnings: number };
  ok: boolean;
}

const clean = (r: object) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).sort(([a], [b]) => a.localeCompare(b)));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function diffRecords(before: Record<string, unknown> | undefined, after: Record<string, unknown>): FieldChange[] {
  const b = before ? clean(before) : {}, a = clean(after);
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  return keys.filter(k => !same(b[k], a[k])).map(k => ({ key: k, before: b[k], after: a[k] }));
}

/** existing records overlaid with staged ones (staged wins field-by-field: a blank cell keeps the stored value) */
export function mergeEntities(existing: Entities, staged: Entities): Entities {
  const out = emptyEntities();
  for (const k of ENTITY_KEYS) {
    const map = new Map<string, Record<string, unknown>>((existing[k] as unknown as Record<string, unknown>[]).map(r => [r.id as string, { ...r }]));
    for (const r of staged[k] as unknown as Record<string, unknown>[]) {
      const prev = map.get(r.id as string);
      map.set(r.id as string, prev ? { ...prev, ...clean(r) } : { ...r });
    }
    (out as unknown as Record<string, unknown[]>)[k] = [...map.values()];
  }
  return out;
}

export function stageImport(args: { clientId: string; clientName?: string; fileName: string; plans: SheetPlan[]; existing?: ClientData }): StagedImport {
  const { clientId, plans } = args;
  const co = coerceAll(plans);
  const issues = [...co.issues];
  const staged = co.entities;

  /* client scoping: the Clients sheet may only describe the chosen client */
  const own = staged.clients.find(c => c.id === clientId);
  for (const c of staged.clients) if (c.id !== clientId) {
    const o = co.origin.get(`clients:${c.id}`);
    issues.push({ severity: 'warning', code: 'other-client', sheet: o?.sheet ?? 'Clients', row: o?.row ?? 0, id: c.id, message: `Client ${c.id} is not the client being imported (${clientId}); row ignored. Import each client separately.` });
  }
  staged.clients = own ? [own] : [];
  for (const dc of staged.dataCenters) if (!dc.clientId) dc.clientId = clientId;

  const existing = args.existing?.entities ?? emptyEntities();
  const merged = mergeEntities(existing, staged);
  const stagedIds = Object.fromEntries(ENTITY_KEYS.map(k => [k, new Set((staged[k] as { id: string }[]).map(r => r.id))])) as Record<EntityKey, Set<string>>;
  issues.push(...validate(merged, { clientId, staged: stagedIds, origin: co.origin }));

  const diff = {} as Record<EntityKey, EntityDiff>;
  const totals = { created: 0, updated: 0, unchanged: 0, keptNotInFile: 0, errors: 0, warnings: 0 };
  for (const k of ENTITY_KEYS) {
    const old = new Map((existing[k] as unknown as Record<string, unknown>[]).map(r => [r.id as string, r]));
    const m = new Map((merged[k] as unknown as Record<string, unknown>[]).map(r => [r.id as string, r]));
    const d: EntityDiff = { created: [], updated: [], unchanged: [], keptNotInFile: [] };
    for (const id of stagedIds[k]) {
      const before = old.get(id);
      if (!before) { d.created.push(id); continue; }
      const ch = diffRecords(before, m.get(id)!);
      if (ch.length) d.updated.push({ id, changes: ch }); else d.unchanged.push(id);
    }
    for (const id of old.keys()) if (!stagedIds[k].has(id)) d.keptNotInFile.push(id);
    diff[k] = d;
    totals.created += d.created.length; totals.updated += d.updated.length;
    totals.unchanged += d.unchanged.length; totals.keptNotInFile += d.keptNotInFile.length;
  }
  totals.errors = issues.filter(i => i.severity === 'error').length;
  totals.warnings = issues.length - totals.errors;
  return { clientId, clientName: args.clientName, fileName: args.fileName, staged, merged, issues, diff, totals, ok: totals.errors === 0 };
}

/** the next ClientData after confirming a staged import; throws if it has errors */
export function applyStaged(s: StagedImport, existing: ClientData | undefined, batchId: string, at: number): { data: ClientData; batch: ImportBatch } {
  if (!s.ok) throw new Error(`Import has ${s.totals.errors} error(s); fix them before importing.`);
  const lastBatch = { ...(existing?.lastBatch ?? {}) };
  for (const k of ENTITY_KEYS) {
    for (const id of s.diff[k].created) lastBatch[`${k}:${id}`] = batchId;
    for (const u of s.diff[k].updated) lastBatch[`${k}:${u.id}`] = batchId;
  }
  const data: ClientData = {
    clientId: s.clientId,
    entities: s.merged,
    links: existing?.links ?? [],
    lastBatch,
    updatedAt: at
  };
  const batch: ImportBatch = {
    id: batchId, clientId: s.clientId, fileName: s.fileName, at,
    created: s.totals.created, updated: s.totals.updated, unchanged: s.totals.unchanged,
    keptNotInFile: s.totals.keptNotInFile, warnings: s.totals.warnings
  };
  return { data, batch };
}
