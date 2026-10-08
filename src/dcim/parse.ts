/* ── Import parsing: file → raw sheets → typed records ───────────────────
   Pure functions, no UI and no storage. Excel goes through ExcelJS (already
   a dependency, loaded on demand); CSV through a small RFC-4180 reader.
   Every issue carries sheet, spreadsheet row and column so the preview can
   point at the exact cell. */
import { SHEETS, autoMapping, matchField, norm, sheetByName, type FieldDef, type SheetDef } from './schema';
import { emptyEntities, type Entities, type EntityKey } from './model';

export type Severity = 'error' | 'warning';
export interface Issue {
  severity: Severity;
  code: string;
  sheet: string;
  /** spreadsheet row number (header = 1); 0 = sheet-level */
  row: number;
  col?: string;
  id?: string;
  message: string;
}

export interface RawSheet {
  name: string;
  headers: string[];
  /** cell text by header; blank cells are '' */
  rows: Record<string, string>[];
  /** spreadsheet row number of each data row */
  rowNumbers: number[];
}

export interface SheetPlan {
  raw: RawSheet;
  def: SheetDef | null;
  /** how the sheet was recognised */
  detectedBy: 'name' | 'headers' | 'manual' | 'none';
  /** source header → field key ('' = ignore) */
  mapping: Record<string, string>;
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

/** sheets the template carries for people, not data */
const DOC_SHEETS = new Set(['readme', 'fields', 'fielddefinitions', 'instructions']);

export async function readWorkbook(data: ArrayBuffer): Promise<RawSheet[]> {
  const mod = await import('exceljs');
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const out: RawSheet[] = [];
  wb.eachSheet(ws => {
    if (DOC_SHEETS.has(norm(ws.name))) return;
    const grid: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      const vals: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, cn) => { vals[cn - 1] = cellText(cell.value); });
      grid[rn - 1] = Array.from({ length: vals.length }, (_, i) => vals[i] ?? '');
    });
    out.push(fromGrid(ws.name, grid));
  });
  return out;
}

/** RFC 4180: quoted fields, doubled quotes, CRLF or LF, comma or semicolon */
export function readCsv(text: string, name: string): RawSheet {
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
  return fromGrid(name.replace(/\.[^.]+$/, ''), grid);
}

function fromGrid(name: string, grid: string[][]): RawSheet {
  const hi = grid.findIndex(r => r && r.some(c => c !== ''));
  if (hi < 0) return { name, headers: [], rows: [], rowNumbers: [] };
  const headers = grid[hi].map((h, i) => h || `Column ${i + 1}`);
  const rows: Record<string, string>[] = [];
  const rowNumbers: number[] = [];
  for (let r = hi + 1; r < grid.length; r++) {
    const g = grid[r];
    if (!g || !g.some(c => c !== '')) continue;
    rows.push(Object.fromEntries(headers.map((h, i) => [h, g[i] ?? ''])));
    rowNumbers.push(r + 1);
  }
  return { name, headers, rows, rowNumbers };
}

/* ---------- schema detection ---------- */

/** which template sheet a raw sheet holds: by name first, else by the best header overlap */
export function detectSheet(raw: RawSheet): { def: SheetDef | null; by: SheetPlan['detectedBy'] } {
  const byName = sheetByName(raw.name);
  if (byName) return { def: byName, by: 'name' };
  let best: SheetDef | null = null, bestScore = 0;
  for (const def of SHEETS) {
    const hits = raw.headers.filter(h => matchField(def, h)).length;
    const idHit = raw.headers.some(h => matchField(def, h)?.type === 'id');
    const score = idHit ? hits / def.fields.length + hits * 0.01 : 0;
    if (score > bestScore) { bestScore = score; best = def; }
  }
  return bestScore >= 0.25 ? { def: best, by: 'headers' } : { def: null, by: 'none' };
}

export function planSheets(raws: RawSheet[]): SheetPlan[] {
  return raws.map(raw => {
    const { def, by } = detectSheet(raw);
    return { raw, def, detectedBy: by, mapping: def ? autoMapping(def, raw.headers) : {} };
  });
}

/** required fields no source column is mapped to */
export function unmappedRequired(plan: SheetPlan): FieldDef[] {
  if (!plan.def) return [];
  const mapped = new Set(Object.values(plan.mapping).filter(Boolean));
  return plan.def.fields.filter(f => f.required && !mapped.has(f.key) && f.dflt === undefined);
}

/* ---------- coercion ---------- */

const TRUE = new Set(['y', 'yes', 'true', '1']);
const FALSE = new Set(['n', 'no', 'false', '0']);

/** one cell → typed value; returns an error message when it can't */
export function coerce(f: FieldDef, text: string): { v?: unknown; err?: string } {
  const t = text.trim();
  if (t === '') return f.dflt !== undefined ? { v: f.dflt } : {};
  switch (f.type) {
    case 'id': case 'string': case 'ref':
      return { v: t };
    case 'list':
      return { v: t.split(/[;|,]/).map(s => s.trim()).filter(Boolean) };
    case 'number': case 'int': {
      const n = Number(t.replace(/,/g, ''));
      if (!Number.isFinite(n)) return { err: `"${t}" is not a number` };
      if (f.type === 'int' && !Number.isInteger(n)) return { err: `"${t}" must be a whole number` };
      if (f.min !== undefined && n < f.min) return { err: `${n}${f.unit ? ' ' + f.unit : ''} is below the minimum ${f.min}` };
      if (f.max !== undefined && n > f.max) return { err: `${n}${f.unit ? ' ' + f.unit : ''} is above the maximum ${f.max}` };
      return { v: n };
    }
    case 'bool': {
      const l = t.toLowerCase();
      if (TRUE.has(l)) return { v: true };
      if (FALSE.has(l)) return { v: false };
      return { err: `"${t}" is not Y or N` };
    }
    case 'enum': {
      const u = t.toUpperCase().replace(/[\s-]+/g, '_');
      const hit = f.options!.find(o => o === u);
      return hit ? { v: hit } : { err: `"${t}" is not one of ${f.options!.join(', ')}` };
    }
  }
}

export interface Coerced {
  entities: Entities;
  /** record id → spreadsheet location, for pointing issues at cells */
  origin: Map<string, { sheet: string; row: number }>;
  issues: Issue[];
}

/** typed records from mapped sheets. Several sheets may feed one entity (CSV files). */
export function coerceAll(plans: SheetPlan[]): Coerced {
  const entities = emptyEntities();
  const origin = new Map<string, { sheet: string; row: number }>();
  const issues: Issue[] = [];
  for (const p of plans) {
    if (!p.def) {
      if (p.raw.rows.length) issues.push({ severity: 'warning', code: 'sheet-unknown', sheet: p.raw.name, row: 0, message: `Sheet "${p.raw.name}" was not recognised and is ignored. Rename it after a template sheet or map it manually.` });
      continue;
    }
    const def = p.def;
    for (const f of unmappedRequired(p)) {
      issues.push({ severity: 'error', code: 'column-missing', sheet: p.raw.name, row: 0, col: f.col, message: `Required column ${f.col} is not mapped.` });
    }
    const fieldOf = new Map(Object.entries(p.mapping).filter(([, k]) => k).map(([h, k]) => [h, def.fields.find(f => f.key === k)!]));
    const mappedKeys = new Set([...fieldOf.values()].map(f => f.key));
    p.raw.rows.forEach((cells, i) => {
      const rowNo = p.raw.rowNumbers[i];
      const rec: Record<string, unknown> = {};
      for (const [h, f] of fieldOf) {
        const { v, err } = coerce(f, cells[h] ?? '');
        if (err) issues.push({ severity: 'error', code: 'bad-value', sheet: p.raw.name, row: rowNo, col: f.col, message: `${f.col}: ${err}.` });
        else if (v !== undefined) rec[f.key] = v;
      }
      /* defaults for fields with no source column at all */
      for (const f of def.fields) if (!mappedKeys.has(f.key) && f.dflt !== undefined) rec[f.key] = f.dflt;
      for (const f of def.fields) {
        if (f.required && (rec[f.key] === undefined || rec[f.key] === '') && mappedKeys.has(f.key)) {
          issues.push({ severity: 'error', code: 'required', sheet: p.raw.name, row: rowNo, col: f.col, id: rec.id as string | undefined, message: `${f.col} is required.` });
        }
      }
      if (def.entity === 'coolingEquipment' && !rec.servesRowIds) rec.servesRowIds = [];
      if (typeof rec.id !== 'string' || !rec.id) return;
      const list = entities[def.entity] as unknown as Record<string, unknown>[];
      const key = `${def.entity}:${rec.id}`;
      if (origin.has(key)) {
        issues.push({ severity: 'error', code: 'duplicate-id', sheet: p.raw.name, row: rowNo, col: def.fields[0].col, id: rec.id, message: `${def.fields[0].col} ${rec.id} appears more than once (first at row ${origin.get(key)!.row}).` });
        return;
      }
      origin.set(key, { sheet: p.raw.name, row: rowNo });
      list.push(rec);
    });
  }
  return { entities, origin, issues };
}

export const entityCount = (e: Entities) =>
  (Object.keys(e) as EntityKey[]).reduce((a, k) => a + e[k].length, 0);
