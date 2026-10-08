/* ── Downloadable import workbook ─────────────────────────────────────────
   Built from schema.ts, so the template, the parser and the validation can
   never drift apart. Sheets: README (how to fill it in), Fields (every
   column with type, unit, allowed values, reference and description), then
   one sheet per entity with its header row, drop-down lists on enumerated
   columns and example rows. */
import { SHEETS, type FieldDef } from './schema';
import type { SheetRows } from './sample';

const README: string[][] = [
  ['Infrastructure import workbook — Discovery & Inventory · Data centers'],
  [''],
  ['How to use'],
  ['1. Fill one row per record in each sheet. Leave sheets you do not need empty; delete the example rows.'],
  ['2. IDs (first column of every sheet) are your stable identifiers. Re-importing the same ID updates that record; a new ID creates one.'],
  ['3. A re-import never deletes: records missing from the file are kept and listed as "not in file" in the preview.'],
  ['4. References (…Id columns) must point at an ID in this file or already imported for the same client.'],
  ['5. Units are in the Fields sheet: building/floor/room sizes and positions in metres, rack and equipment sizes in millimetres, power in kW (device nameplate in W).'],
  ['6. Rack units: UStart is the lowest U occupied (1 = bottom), UHeight the number of U. Devices may not overlap on the same face; FullDepth = Y blocks both faces.'],
  ['7. Layout: X/Y on a rack (or room/row) places it exactly. Without X/Y, racks with a RowId are laid out by row and Position; racks with neither are placed on an approximate grid — the views label estimated positions as such.'],
  ['8. Power: list every utility feed, generator, UPS, PDU and rack PDU in PowerEquipment, and what feeds what in PowerConnections (Side A/B gives redundancy). Totals are counted from these rows, never estimated.'],
  ['9. Connections: one row per cable (PHYSICAL) between two ports; patch panels are devices with ports. LOGICAL rows record adjacencies you know (LLDP, LAG) and are drawn separately.'],
  ['10. MonitoringMappings hold references only (point names, OIDs, object ids). Never put passwords, SNMP communities or tokens in this workbook — the importer rejects them.'],
  ['11. CSV: each sheet can also be uploaded as its own .csv file named after the sheet (Racks.csv …) with the same headers.']
];

function rangeText(f: FieldDef) {
  if (f.options) return f.options.join(', ');
  const parts: string[] = [];
  if (f.min !== undefined) parts.push(`≥ ${f.min}`);
  if (f.max !== undefined) parts.push(`≤ ${f.max}`);
  if (f.type === 'bool') parts.push('Y / N');
  if (f.type === 'list') parts.push('IDs separated by ;');
  return parts.join(' · ');
}

export async function buildWorkbook(samples: SheetRows): Promise<ArrayBuffer> {
  const mod = await import('exceljs');
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NetSingularity OSS · Discovery & Inventory';
  wb.created = new Date(0);

  const rd = wb.addWorksheet('README');
  README.forEach(r => rd.addRow(r));
  rd.getColumn(1).width = 140;
  rd.getRow(1).font = { bold: true, size: 14 };
  rd.getRow(3).font = { bold: true };

  const fl = wb.addWorksheet('Fields', { views: [{ state: 'frozen', ySplit: 1 }] });
  fl.addRow(['Sheet', 'Column', 'Required', 'Type', 'Unit', 'Allowed values / range', 'References', 'Default', 'Description']).font = { bold: true };
  for (const s of SHEETS) {
    fl.addRow([s.sheet, '', '', '', '', '', '', '', s.desc]).font = { italic: true };
    for (const f of s.fields) {
      const ref = f.ref ? (Array.isArray(f.ref) ? f.ref : [f.ref]).map(r => SHEETS.find(x => x.entity === r)!.sheet).join(' / ') : '';
      fl.addRow([s.sheet, f.col, f.required ? 'Yes' : '', f.type, f.unit ?? '', rangeText(f), ref, f.dflt === undefined ? '' : String(f.dflt === true ? 'Y' : f.dflt), f.desc]);
    }
  }
  [12, 18, 9, 8, 8, 44, 30, 9, 70].forEach((w, i) => { fl.getColumn(i + 1).width = w; });

  for (const s of SHEETS) {
    const ws = wb.addWorksheet(s.sheet, { views: [{ state: 'frozen', ySplit: 1 }] });
    const head = ws.addRow(s.fields.map(f => f.col));
    head.font = { bold: true };
    s.fields.forEach((f, i) => {
      const c = head.getCell(i + 1);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f.required ? 'FFFDE68A' : 'FFE5E7EB' } };
      c.note = `${f.desc}${f.unit ? ` (${f.unit})` : ''}${f.required ? ' — required' : ''}`;
      ws.getColumn(i + 1).width = Math.max(10, Math.min(28, f.col.length + 4));
    });
    for (const r of samples[s.sheet] ?? []) ws.addRow(s.fields.map(f => {
      const v = r[f.col];
      return v === undefined ? null : typeof v === 'boolean' ? (v ? 'Y' : 'N') : v;
    }));
    /* drop-downs for enumerated columns, down to row 5000 */
    s.fields.forEach((f, i) => {
      if (!f.options && f.type !== 'bool') return;
      const list = f.type === 'bool' ? ['Y', 'N'] : [...f.options!];
      const col = ws.getColumn(i + 1).letter;
      (ws as unknown as { dataValidations: { add(ref: string, v: object): void } }).dataValidations.add(`${col}2:${col}5000`, {
        type: 'list', allowBlank: !f.required, formulae: [`"${list.join(',')}"`],
        showErrorMessage: true, errorTitle: f.col, error: `Choose one of: ${list.join(', ')}`
      });
    });
  }
  return await wb.xlsx.writeBuffer() as ArrayBuffer;
}

/** one sheet as CSV (header + example rows), for clients who work sheet by sheet */
export function sheetCsv(sheet: string, samples: SheetRows): string {
  const def = SHEETS.find(s => s.sheet === sheet)!;
  const esc = (v: unknown) => {
    const t = v === undefined || v === null ? '' : typeof v === 'boolean' ? (v ? 'Y' : 'N') : String(v);
    return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [def.fields.map(f => f.col).join(','), ...(samples[sheet] ?? []).map(r => def.fields.map(f => esc(r[f.col])).join(','))].join('\r\n') + '\r\n';
}

/** a data center's current records as template rows (Excel round trip: download, edit, re-upload) */
export function exportRows(e: import('./model').Entities, dcId: string): SheetRows {
  const dc = e.dataCenters.find(d => d.id === dcId);
  if (!dc) return {};
  const b = e.buildings.filter(x => x.dcId === dcId); const bId = new Set(b.map(x => x.id));
  const f = e.floors.filter(x => bId.has(x.buildingId)); const fId = new Set(f.map(x => x.id));
  const r = e.rooms.filter(x => fId.has(x.floorId)); const rId = new Set(r.map(x => x.id));
  const rk = e.racks.filter(x => rId.has(x.roomId)); const kId = new Set(rk.map(x => x.id));
  const dv = e.devices.filter(x => (x.rackId && kId.has(x.rackId)) || (!x.rackId && x.roomId && rId.has(x.roomId))); const dId = new Set(dv.map(x => x.id));
  const pt = e.ports.filter(x => dId.has(x.deviceId)); const pId = new Set(pt.map(x => x.id));
  const pe = e.powerEquipment.filter(x => x.dcId === dcId); const peId = new Set(pe.map(x => x.id));
  const pick: Record<string, unknown[]> = {
    clients: e.clients.filter(c => c.id === dc.clientId), dataCenters: [dc], buildings: b, floors: f, rooms: r,
    zones: e.zones.filter(x => rId.has(x.roomId)), rows: e.rows.filter(x => rId.has(x.roomId)), racks: rk, devices: dv, ports: pt,
    connections: e.connections.filter(x => pId.has(x.aPortId) || pId.has(x.bPortId)), powerEquipment: pe,
    powerConnections: e.powerConnections.filter(x => peId.has(x.fromId) || peId.has(x.toId)),
    coolingEquipment: e.coolingEquipment.filter(x => x.dcId === dcId), sensors: e.sensors.filter(x => rId.has(x.roomId)),
    monitoringMappings: e.monitoringMappings.filter(x => peId.has(x.entityId) || dId.has(x.entityId) || kId.has(x.entityId) || e.sensors.some(s => s.id === x.entityId && rId.has(s.roomId)) || e.coolingEquipment.some(c => c.id === x.entityId && c.dcId === dcId))
  };
  const out: SheetRows = {};
  for (const s of SHEETS) out[s.sheet] = (pick[s.entity] ?? []).map(rec => {
    const o = rec as Record<string, unknown>; const row: Record<string, string | number | boolean> = {};
    for (const fd of s.fields) {
      const v = o[fd.key];
      if (v === undefined || v === null || v === '') continue;
      row[fd.col] = Array.isArray(v) ? v.join(';') : typeof v === 'boolean' ? (v ? 'Y' : 'N') : v as string | number;
    }
    return row;
  });
  return out;
}
