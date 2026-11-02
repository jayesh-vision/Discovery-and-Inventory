/* ── Reconciliation ────────────────────────────────────────────────────────
   Matches uploaded rows against the real, existing Telecom-estate inventory
   — src/data/physical.ts (NeRow), src/data/locations.ts (Location) and
   src/data/facility.ts (each site's cabling ledger) — and classifies every
   uploaded row plus every unmatched existing record into one of the PRD's
   seven outcomes. Read-only against those three modules: nothing here ever
   mutates PHY/LOCATIONS/facility data (there is no write path for them in
   this codebase, and this feature does not add one). */
import { PHY } from '../data/physical';
import { LOCATIONS } from '../data/locations';
import { facilityOf } from '../data/facility';
import type { MappedRow } from './parse';
import { schemaOf, TELECOM_NE_CLASSES } from './schema';
import type { AccuracyEntityType, FieldChange, ImportMode, ReconciliationOutcome, ReconciliationRecord } from './model';

type Row = Record<string, string>;

function existingNetworkElements(): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const cls of TELECOM_NE_CLASSES) {
    for (const r of PHY[cls] ?? []) {
      m.set(r.name, {
        resourceId: r.name, deviceName: r.name, neClass: cls, vendor: r.oem, model: r.model,
        managementIp: r.ip, serialNumber: r.sn, operatingSystem: r.os, parentSiteId: r.loc, stockState: r.stock
      });
    }
  }
  return m;
}

function existingSites(): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const l of LOCATIONS) {
    m.set(l.id, {
      siteId: l.id, siteName: l.name, siteType: l.type, category: l.cat, status: l.st,
      city: l.city, state: l.state, address: l.addr, latitude: String(l.lat), longitude: String(l.lon)
    });
  }
  return m;
}

function existingFiberCables(siteIds: Iterable<string>): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const siteId of new Set(siteIds)) {
    const loc = LOCATIONS.find(l => l.id === siteId);
    if (!loc) continue;
    const facility = facilityOf(loc.id, loc.ne);
    for (const c of facility.cables) {
      m.set(`${siteId}:${c.id}`, { cableId: c.id, siteId, coreNumber: String(c.core), cableKind: c.kind, cableState: c.state, strand: c.strand ?? '' });
    }
  }
  return m;
}

export function existingIndexFor(entityType: AccuracyEntityType, rows: MappedRow[]): Map<string, Row> {
  if (entityType === 'networkElement') return existingNetworkElements();
  if (entityType === 'site') return existingSites();
  return existingFiberCables(rows.map(r => r.fields.siteId).filter(Boolean));
}

function keyFor(entityType: AccuracyEntityType, fields: Row): string {
  if (entityType === 'fiberCable') return fields.cableId ? `${fields.siteId ?? ''}:${fields.cableId}` : '';
  return fields[schemaOf(entityType).idField] ?? '';
}

const nameOf = (entityType: AccuracyEntityType, fields: Row, resourceId: string) =>
  (entityType === 'networkElement' ? fields.deviceName : entityType === 'site' ? fields.siteName : fields.cableId) || resourceId;

export function reconcile(entityType: AccuracyEntityType, rows: MappedRow[], invalidRowNumbers: Set<number>, mode: ImportMode): ReconciliationRecord[] {
  const schema = schemaOf(entityType);
  const existingIndex = existingIndexFor(entityType, rows);
  const out: ReconciliationRecord[] = [];
  const countInFile = new Map<string, number>();
  for (const r of rows) {
    const key = keyFor(entityType, r.fields);
    if (key) countInFile.set(key, (countInFile.get(key) ?? 0) + 1);
  }
  const matchedKeys = new Set<string>();

  for (const r of rows) {
    const key = keyFor(entityType, r.fields);
    const resourceId = r.fields[schema.idField] ?? '—';
    const resourceName = nameOf(entityType, r.fields, resourceId);

    if (invalidRowNumbers.has(r.rowNumber)) {
      out.push({ key: `invalid:${r.rowNumber}`, entityType, resourceId, resourceName, outcome: 'INVALID', changes: [], uploaded: r.fields,
        recommendation: 'Fix the validation errors on this row before it can be reconciled.' });
      continue;
    }
    if (!key || (countInFile.get(key) ?? 0) > 1) {
      out.push({ key: `duplicate:${key || 'blank'}:${r.rowNumber}`, entityType, resourceId, resourceName, outcome: 'DUPLICATE', changes: [], uploaded: r.fields,
        recommendation: 'Multiple rows in this file represent the same record — keep one and ignore the rest.' });
      continue;
    }
    matchedKeys.add(key);
    const existing = existingIndex.get(key);
    if (!existing) {
      out.push({ key, entityType, resourceId, resourceName, outcome: 'NEW', changes: [], uploaded: r.fields,
        recommendation: mode === 'update' ? 'Not found in existing inventory; import mode is update-only, so this row will be skipped unless you switch to upsert.' : 'Approve to add this record to inventory.' });
      continue;
    }
    const changes: FieldChange[] = [];
    for (const f of schema.fields) {
      const a = existing[f.key] ?? '', b = r.fields[f.key] ?? '';
      if (b && a !== b) changes.push({ field: f.key, existing: a, uploaded: b });
    }
    if (!changes.length) {
      out.push({ key, entityType, resourceId, resourceName, outcome: 'MATCHED', changes, existing, uploaded: r.fields, recommendation: 'Matches the existing record — no action needed.' });
    } else if (mode === 'new') {
      out.push({ key, entityType, resourceId, resourceName, outcome: 'CONFLICT', changes, existing, uploaded: r.fields,
        recommendation: 'Import mode is new-records-only, but this record already exists with different values. Switch to update/upsert, or reject this row.' });
    } else {
      out.push({ key, entityType, resourceId, resourceName, outcome: 'MODIFIED', changes, existing, uploaded: r.fields,
        recommendation: 'Review the changed attributes and accept or retain each.' });
    }
  }

  for (const [key, existing] of existingIndex) {
    if (matchedKeys.has(key)) continue;
    const resourceId = existing[schema.idField] ?? key;
    out.push({ key: `missing:${key}`, entityType, resourceId, resourceName: nameOf(entityType, existing, resourceId), outcome: 'MISSING', changes: [], existing,
      recommendation: 'Present in inventory but absent from this upload. Kept as-is — mark for investigation if this is unexpected.' });
  }
  return out;
}

export const outcomeCounts = (records: ReconciliationRecord[]): Record<ReconciliationOutcome, number> => {
  const out: Record<ReconciliationOutcome, number> = { NEW: 0, MATCHED: 0, MODIFIED: 0, MISSING: 0, DUPLICATE: 0, CONFLICT: 0, INVALID: 0 };
  for (const r of records) out[r.outcome]++;
  return out;
};
