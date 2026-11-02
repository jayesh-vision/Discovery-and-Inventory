/* ── Upload parsing: file → raw rows → mapped rows ────────────────────────
   Pure functions, no UI and no storage. Excel goes through ExcelJS (already
   a dependency, loaded on demand, same idiom as src/dcim/parse.ts); CSV
   through a small RFC-4180 reader. Every issue carries the spreadsheet row
   and column so the preview/review step can point at the exact cell. */
import type { EntitySchema, FieldDef } from './schema';
import { autoMapping, detectEntityType, schemaOf } from './schema';
import type { AccuracyEntityType } from './model';

export type Severity = 'error' | 'warning';
export interface StructuralIssue {
  severity: Severity;
  code: string;
  row: number; /* spreadsheet row number; header = 1, 0 = file-level */
  col?: string;
  resourceId?: string;
  message: string;
}

export interface RawTable {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  rowNumbers: number[];
}

export interface MappedRow {
  rowNumber: number;
  /** field key -> raw text, after applying the column mapping (unmapped columns dropped) */
  fields: Record<string, string>;
}

export interface UploadPlan {
  entityType: AccuracyEntityType;
  schema: EntitySchema;
  raw: RawTable;
  /** source header -> field key ('' = ignore) */
  mapping: Record<string, string>;
  rows: MappedRow[];
  issues: StructuralIssue[];
}

/* ---------- reading ---------- */

type CellValue = unknown;
function cellText(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; result?: unknown; text?: string; error?: string };
    if (o.richText) return o.richText.map(r => r.text).join('');
    if ('result' in o) return cellText(o.result);
    if (typeof o.text === 'string') return o.text;
    if (o.error) return '';
    return '';
  }
  return String(v).trim();
}

function fromGrid(fileName: string, grid: string[][]): RawTable {
  const hi = grid.findIndex(r => r && r.some(c => c !== ''));
  if (hi < 0) return { fileName, headers: [], rows: [], rowNumbers: [] };
  const headers = grid[hi].map((h, i) => h || `Column ${i + 1}`);
  const rows: Record<string, string>[] = [];
  const rowNumbers: number[] = [];
  for (let r = hi + 1; r < grid.length; r++) {
    const g = grid[r];
    if (!g || !g.some(c => c !== '')) continue;
    rows.push(Object.fromEntries(headers.map((h, i) => [h, g[i] ?? ''])));
    rowNumbers.push(r + 1);
  }
  return { fileName, headers, rows, rowNumbers };
}

/** RFC 4180: quoted fields, doubled quotes, CRLF or LF, comma or semicolon */
export function readCsv(text: string, fileName: string): RawTable {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const grid: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); grid.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell.trim()); grid.push(row); }
  return fromGrid(fileName, grid);
}

export async function readWorkbook(data: ArrayBuffer, fileName: string): Promise<RawTable> {
  const mod = await import('exceljs');
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets[0];
  if (!ws) return { fileName, headers: [], rows: [], rowNumbers: [] };
  const grid: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, rn) => {
    const vals: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, cn) => { vals[cn - 1] = cellText(cell.value); });
    grid[rn - 1] = Array.from({ length: vals.length }, (_, i) => vals[i] ?? '');
  });
  return fromGrid(fileName, grid);
}

export async function readFile(file: File): Promise<RawTable> {
  if (/\.csv$/i.test(file.name)) return readCsv(await file.text(), file.name);
  return readWorkbook(await file.arrayBuffer(), file.name);
}

/* ---------- mapping + coercion ---------- */

export function planUpload(raw: RawTable, forced?: AccuracyEntityType): UploadPlan {
  const entityType = forced ?? detectEntityType(raw.headers) ?? 'networkElement';
  const schema = schemaOf(entityType);
  const mapping = autoMapping(schema, raw.headers);
  return buildPlan(raw, entityType, schema, mapping);
}

export function remapUpload(plan: UploadPlan, entityType: AccuracyEntityType): UploadPlan {
  const schema = schemaOf(entityType);
  return buildPlan(plan.raw, entityType, schema, autoMapping(schema, plan.raw.headers));
}

export function remapColumn(plan: UploadPlan, header: string, key: string): UploadPlan {
  return buildPlan(plan.raw, plan.entityType, plan.schema, { ...plan.mapping, [header]: key });
}

export function unmappedRequired(plan: UploadPlan): FieldDef[] {
  const mapped = new Set(Object.values(plan.mapping).filter(Boolean));
  return plan.schema.fields.filter(f => f.required && !mapped.has(f.key));
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*$/;

function coerce(f: FieldDef, text: string): { v?: string; err?: string } {
  const t = text.trim();
  if (t === '') return {};
  switch (f.type) {
    case 'id': case 'string': return { v: t };
    case 'ip': {
      if (IPV4.test(t)) {
        const ok = t.split('.').every(o => Number(o) >= 0 && Number(o) <= 255);
        return ok ? { v: t } : { err: `"${t}" is not a valid IPv4 address` };
      }
      if (IPV6.test(t) && t.includes(':')) return { v: t };
      return { err: `"${t}" is not a valid IPv4/IPv6 address` };
    }
    case 'number': case 'int': {
      const n = Number(t.replace(/,/g, ''));
      if (!Number.isFinite(n)) return { err: `"${t}" is not a number` };
      if (f.type === 'int' && !Number.isInteger(n)) return { err: `"${t}" must be a whole number` };
      if (f.min !== undefined && n < f.min) return { err: `${n} is below the minimum ${f.min}` };
      if (f.max !== undefined && n > f.max) return { err: `${n} is above the maximum ${f.max}` };
      return { v: t };
    }
    case 'enum': {
      const hit = f.options!.find(o => o.toLowerCase() === t.toLowerCase());
      return hit ? { v: hit } : { err: `"${t}" is not one of ${f.options!.join(', ')}` };
    }
  }
}

function buildPlan(raw: RawTable, entityType: AccuracyEntityType, schema: EntitySchema, mapping: Record<string, string>): UploadPlan {
  const issues: StructuralIssue[] = [];
  for (const f of schema.fields) {
    if (f.required && !Object.values(mapping).includes(f.key)) {
      issues.push({ severity: 'error', code: 'column-missing', row: 0, col: f.col, message: `Required column ${f.col} is not mapped.` });
    }
  }
  const fieldOf = new Map(Object.entries(mapping).filter(([, k]) => k).map(([h, k]) => [h, schema.fields.find(f => f.key === k)!]));
  const seenIds = new Map<string, number>();
  const rows: MappedRow[] = raw.rows.map((cells, i) => {
    const rowNumber = raw.rowNumbers[i];
    const fields: Record<string, string> = {};
    for (const [h, f] of fieldOf) {
      const { v, err } = coerce(f, cells[h] ?? '');
      if (err) issues.push({ severity: 'error', code: 'bad-value', row: rowNumber, col: f.col, message: `${f.col}: ${err}.` });
      else if (v !== undefined) fields[f.key] = v;
    }
    const id = fields[schema.idField];
    if (id) {
      if (seenIds.has(id)) {
        issues.push({ severity: 'warning', code: 'duplicate-in-file', row: rowNumber, col: schema.fields[0].col, resourceId: id, message: `${schema.idField} "${id}" appears more than once in this file (first at row ${seenIds.get(id)}).` });
      } else seenIds.set(id, rowNumber);
    }
    return { rowNumber, fields };
  });
  return { entityType, schema, raw, mapping, rows, issues };
}
