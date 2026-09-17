/* ── Reports: exports ───────────────────────────────────────
   Seven ways out of a report, all rendered from the same ReportContent the
   page shows: a designed PDF document, an Excel workbook, CSV, a Word
   document, a standalone HTML file, JSON, and the browser's own print
   (handled by the page). The PDF and Excel libraries are loaded only when
   someone asks for that format, so they never weigh on the app itself. */

import {
  type Column, type Finding, type ReportContent, type ReportDef, type Visual, MODULE_LABEL, cellText, fmtValue, sum, visualData
} from './model';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'doc' | 'html' | 'json';
export const EXPORT_FORMATS: { k: ExportFormat; n: string; ext: string; hint: string }[] = [
  { k: 'pdf', n: 'PDF document', ext: 'PDF', hint: 'Designed report, ready to share' },
  { k: 'xlsx', n: 'Excel workbook', ext: 'XLSX', hint: 'Summary, detail, chart data and methodology sheets' },
  { k: 'csv', n: 'CSV', ext: 'CSV', hint: 'Plain data for any tool' },
  { k: 'doc', n: 'Word document', ext: 'DOC', hint: 'Editable report' },
  { k: 'html', n: 'Web page', ext: 'HTML', hint: 'Standalone file for email or archive' },
  { k: 'json', n: 'JSON', ext: 'JSON', hint: 'Structured data for integrations' }
];

const TODAY_TEXT = () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fileStem = (d: ReportDef) => `${d.id}_${d.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}_${d.snapshot}`;
const FINDING_LABEL: Record<Finding['tone'], string> = { crit: 'Critical', warn: 'Warning', good: 'Positive', info: 'Note' };

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function meta(d: ReportDef): [string, string][] {
  return [
    ['Report', `${d.name} (${d.id})`], ['Module', MODULE_LABEL[d.module]], ['Audience', d.audience],
    ['Question', d.question], ['Status', d.state], ['Data as of', d.lastRun], ['Snapshot', d.snapshot],
    ['Schedule', d.schedule], ['Distribution', d.distribution], ...(d.note ? [['Note', d.note] as [string, string]] : [])
  ];
}

/* ── colour: CSS variable → hex, for files that can't read the stylesheet ── */
const FALLBACK: Record<string, string> = {
  'blue-200': '#bfdbfe', 'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-700': '#1d4ed8',
  'teal-300': '#5eead4', 'teal-400': '#2dd4bf', 'violet-400': '#a78bfa', 'pink-400': '#f472b6', 'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7', 'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669', 'sky-400': '#38bdf8',
  'amber-400': '#fbbf24', 'red-400': '#f87171', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1', 'slate-400': '#94a3b8',
  'slate-500': '#64748b', 'slate-600': '#475569', 'cyan-400': '#22d3ee', 'orange-400': '#fb923c'
};
export function hexOf(css: string | undefined, fallback = '#60a5fa'): string {
  if (!css) return fallback;
  const m = css.match(/--vw-color-([a-z]+-\d+)/);
  if (!m) return css.startsWith('#') ? css : fallback;
  if (typeof document !== 'undefined') {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--vw-color-${m[1]}`).trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  }
  return FALLBACK[m[1]] ?? fallback;
}
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/* ── CSV ───────────────────────────────────────────────── */
const csvCell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRow = (cells: (string | number | null | undefined)[]) => cells.map(csvCell).join(',');

export function reportCsv(d: ReportDef, c: ReportContent): string {
  const out: string[] = [];
  meta(d).forEach(([k, v]) => out.push(csvRow([k, v])));
  out.push('', csvRow(['HEADLINE']), csvRow([fmtValue(c.headline.value, c.headline.fmt), c.headline.label]));
  out.push('', csvRow(['EXECUTIVE SUMMARY']), csvRow([c.summary]));
  out.push('', csvRow(['KEY METRICS']), csvRow(['Metric', 'Value', 'Formatted', 'Context', 'Change', 'Definition']));
  c.kpis.forEach(k => out.push(csvRow([k.title, k.value, fmtValue(k.value, k.fmt), k.of, k.delta.text, k.definition])));
  out.push('', csvRow(['FINDINGS']), csvRow(['Severity', 'Finding', 'Detail']));
  c.findings.forEach(f => out.push(csvRow([FINDING_LABEL[f.tone], f.title, f.detail])));
  out.push('', csvRow(['RECOMMENDED ACTIONS']), csvRow(['Priority', 'Action', 'Owner', 'Impact']));
  c.actions.forEach(a => out.push(csvRow([a.priority, a.action, a.owner, a.impact])));
  out.push('', csvRow([`DETAIL — ${c.table.title.toUpperCase()} (${c.table.rows.length} rows)`]), csvRow(c.table.columns.map(col => col.header)));
  c.table.rows.forEach(r => out.push(csvRow(c.table.columns.map(col => r.cells[col.key]))));
  c.visuals.forEach(v => {
    const data = visualData(v);
    out.push('', csvRow([`CHART DATA — ${v.title.toUpperCase()}`]), csvRow(data.head));
    data.rows.forEach(row => out.push(csvRow(row)));
  });
  out.push('', csvRow(['METHODOLOGY']));
  c.methodology.forEach(m => out.push(csvRow([m.term, m.definition])));
  return `﻿${out.join('\r\n')}`;
}

/* ── JSON ──────────────────────────────────────────────── */
export const reportJson = (d: ReportDef, c: ReportContent) =>
  JSON.stringify({ report: d, generatedAt: new Date().toISOString(), content: c }, null, 2);

/* ── HTML / Word ───────────────────────────────────────── */
const esc = (s: string | number) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FINDING_HEX: Record<Finding['tone'], string> = { crit: '#dc2626', warn: '#d97706', good: '#059669', info: '#2563eb' };

function visualHtml(v: Visual): string {
  const bar = (label: string, value: number, max: number, hex: string, text: string, sub?: string) => `
    <tr><td style="padding:4px 10px 4px 0;font-size:12px;color:#334155;width:34%">${esc(label)}${sub ? `<div style="font-size:10.5px;color:#64748b">${esc(sub)}</div>` : ''}</td>
    <td style="padding:4px 0;width:52%"><div style="background:#f1f5f9;height:12px;border-radius:3px"><div style="width:${Math.max(1, Math.min(100, (value / (max || 1)) * 100)).toFixed(1)}%;height:12px;border-radius:3px;background:${hexOf(hex)}"></div></div></td>
    <td style="padding:4px 0 4px 10px;font-size:12px;font-weight:600;text-align:right;color:#0f172a;white-space:nowrap">${esc(text)}</td></tr>`;
  let body = '';
  if (v.kind === 'bars') {
    const lo = v.min ?? 0, max = (v.max ?? Math.max(...v.rows.map(r => r.value))) - lo;
    body = `<table style="width:100%;border-collapse:collapse">${v.rows.map(r => bar(r.label, r.value - lo, max, r.hex ?? '#60a5fa', fmtValue(r.value, v.fmt), r.sub)).join('')}</table>`;
  } else if (v.kind === 'composition' || v.kind === 'donut') {
    const parts = v.kind === 'composition' ? v.parts : v.slices;
    const t = sum(parts, p => p.c);
    body = `<div style="display:flex;height:16px;border-radius:4px;overflow:hidden;margin:6px 0">${parts.map(p => `<div style="width:${(p.c / t * 100).toFixed(2)}%;background:${hexOf(p.hex)}"></div>`).join('')}</div>
      <div style="font-size:11.5px;color:#334155">${parts.map(p => `<span style="margin-right:14px"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${hexOf(p.hex)};margin-right:5px"></span><b>${p.c.toLocaleString('en-IN')}</b> ${esc(p.n)} (${(p.c / t * 100).toFixed(1)}%)</span>`).join('')}</div>`;
  } else if (v.kind === 'ramp') {
    const max = Math.max(...v.buckets.map(b => b.count));
    body = `<table style="width:100%;border-collapse:collapse">${v.buckets.map(b => bar(b.label, b.count, max, b.hex, String(b.count))).join('')}</table>`;
  } else {
    const data = visualData(v);
    const rows = data.rows.length > 16 ? [...data.rows.slice(0, 8), ...data.rows.slice(-8)] : data.rows;
    body = `<table style="width:100%;border-collapse:collapse;font-size:11px">
      <tr>${data.head.map(h => `<th style="text-align:left;padding:4px 6px;border-bottom:1px solid #cbd5e1;color:#64748b">${esc(h)}</th>`).join('')}</tr>
      ${rows.map(r => `<tr>${r.map(x => `<td style="padding:3px 6px;border-bottom:1px solid #f1f5f9">${esc(typeof x === 'number' ? x.toLocaleString('en-IN') : x)}</td>`).join('')}</tr>`).join('')}</table>
      ${data.rows.length > 16 ? `<div style="font-size:10.5px;color:#64748b;margin-top:4px">First and last 8 of ${data.rows.length} points.</div>` : ''}`;
  }
  return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 12px;page-break-inside:avoid">
    <div style="font-size:13px;font-weight:700;color:#0f172a">${esc(v.title)}</div>${v.sub ? `<div style="font-size:11px;color:#64748b;margin-bottom:6px">${esc(v.sub)}</div>` : ''}${body}</div>`;
}

export function reportHtml(d: ReportDef, c: ReportContent, forWord = false): string {
  const th = (h: string) => `<th style="text-align:left;padding:7px 8px;background:#f1f5f9;border-bottom:1px solid #cbd5e1;font-size:11px;color:#475569">${esc(h)}</th>`;
  const td = (v: string, right = false) => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11.5px;vertical-align:top;${right ? 'text-align:right;' : ''}">${esc(v)}</td>`;
  const h2 = (t: string) => `<h2 style="font-size:15px;color:#0f172a;margin:26px 0 10px;padding-bottom:6px;border-bottom:2px solid #1d4ed8">${esc(t)}</h2>`;
  const table = (head: string[], rows: string[][], right: boolean[] = []) =>
    `<table style="width:100%;border-collapse:collapse">${`<tr>${head.map(th).join('')}</tr>`}${rows.map(r => `<tr>${r.map((x, i) => td(x, right[i])).join('')}</tr>`).join('')}</table>`;
  const cols: Column[] = c.table.columns;
  const inner = `
  <div style="font-size:11px;color:#64748b;letter-spacing:.06em;text-transform:uppercase">NetSingularity OSS · ${esc(MODULE_LABEL[d.module])} reports</div>
  <h1 style="font-size:24px;color:#0f172a;margin:6px 0 4px">${esc(d.name)}</h1>
  <div style="font-size:13px;color:#475569;margin-bottom:12px">${esc(d.question)}</div>
  <table style="border-collapse:collapse;font-size:11.5px;margin-bottom:14px">${meta(d).filter(([k]) => !['Report', 'Question'].includes(k)).map(([k, v]) => `<tr><td style="padding:2px 14px 2px 0;color:#64748b">${esc(k)}</td><td style="padding:2px 0;color:#0f172a">${esc(v)}</td></tr>`).join('')}</table>
  <div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:12px 16px;border-radius:6px">
    <div style="font-size:26px;font-weight:700;color:#0f172a">${esc(fmtValue(c.headline.value, c.headline.fmt))}</div>
    <div style="font-size:12.5px;color:#334155">${esc(c.headline.label)}</div>
  </div>
  ${h2('Executive summary')}<p style="font-size:13px;line-height:1.65;color:#1e293b;margin:0">${esc(c.summary)}</p>
  ${h2('Key metrics')}${table(['Metric', 'Value', 'Context', 'Change'], c.kpis.map(k => [k.title, fmtValue(k.value, k.fmt), k.of ?? '', k.delta.text]), [false, true])}
  ${h2('Findings')}${c.findings.map(f => `<div style="border-left:4px solid ${FINDING_HEX[f.tone]};padding:8px 12px;margin-bottom:8px;background:#f8fafc;page-break-inside:avoid"><div style="font-size:12.5px;font-weight:700;color:#0f172a">${esc(FINDING_LABEL[f.tone])} · ${esc(f.title)}</div><div style="font-size:12px;color:#334155;margin-top:2px">${esc(f.detail)}</div></div>`).join('')}
  ${c.visuals.length ? `${h2('Analysis')}${c.visuals.map(visualHtml).join('')}` : ''}
  ${h2('Recommended actions')}${table(['Priority', 'Action', 'Owner', 'Impact'], c.actions.map(a => [a.priority, a.action, a.owner, a.impact]))}
  ${h2(`${c.table.title} (${c.table.rows.length} rows)`)}<div style="font-size:11px;color:#64748b;margin-bottom:6px">${esc(c.table.sub)}</div>
  ${table(cols.map(col => col.header), c.table.rows.map(r => cols.map(col => cellText(r.cells[col.key], col))), cols.map(col => !!col.right))}
  ${h2('Methodology & definitions')}${table(['Term', 'Definition'], c.methodology.map(m => [m.term, m.definition]))}
  <div style="margin-top:22px;font-size:10.5px;color:#94a3b8">${esc(d.id)} · snapshot ${esc(d.snapshot)} · generated ${esc(TODAY_TEXT())} by NetSingularity OSS</div>`;

  if (forWord) {
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(d.name)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>@page { size: 21cm 29.7cm; margin: 1.8cm; } body { font-family: Calibri, Arial, sans-serif; }</style></head>
<body>${inner}</body></html>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.name)} · ${esc(d.snapshot)}</title>
<style>body{margin:0;background:#f8fafc;font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif}main{max-width:960px;margin:24px auto;background:#fff;padding:36px 44px;border-radius:14px;border:1px solid #e2e8f0}@media print{body{background:#fff}main{border:0;margin:0;padding:0}}</style>
</head><body><main>${inner}</main></body></html>`;
}

/* ── Excel ─────────────────────────────────────────────── */
const XLSX_FMT: Record<string, string> = {
  num: '#,##0', pct: '0.0"%"', pct2: '0.00"%"', hours: '0.0"h"', days: '#,##0" d"', usd: '"$"#,##0', sec: '0.00"s"', kw: '0.0" kW"', ratio: '0.00"×"'
};
const argb = (hex: string) => `FF${hexOf(hex).slice(1).toUpperCase()}`;

async function reportXlsx(d: ReportDef, c: ReportContent): Promise<Blob> {
  /* exceljs is CommonJS; bundlers hand it back either as the namespace or under .default */
  const mod = await import('exceljs');
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NetSingularity OSS'; wb.created = new Date(); wb.title = d.name;
  const BRAND = 'FF1D4ED8', HEAD = 'FFEFF6FF';

  const ws = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 28 }, { width: 22 }, { width: 24 }, { width: 70 }];
  const merged = (text: string, style: Partial<{ size: number; bold: boolean; italic: boolean; color: string }>) => {
    const r = ws.addRow([text]); ws.mergeCells(r.number, 1, r.number, 4);
    r.font = { size: style.size, bold: style.bold, italic: style.italic, color: { argb: style.color ?? 'FF0F172A' } };
    r.alignment = { wrapText: true, vertical: 'top' };
    return r;
  };
  merged(`NetSingularity OSS · ${MODULE_LABEL[d.module]} reports`, { size: 9, color: 'FF64748B' });
  merged(d.name, { size: 18, bold: true });
  merged(d.question, { italic: true, color: 'FF475569' }).height = 30;
  ws.addRow([]);
  meta(d).filter(([k]) => !['Report', 'Question'].includes(k)).forEach(([k, v]) => {
    const r = ws.addRow([k, v]); ws.mergeCells(r.number, 2, r.number, 4);
    r.getCell(1).font = { bold: true, color: { argb: 'FF475569' } };
  });
  const section = (t: string) => {
    ws.addRow([]);
    const r = merged(t, { size: 12, bold: true, color: BRAND });
    r.getCell(1).border = { bottom: { style: 'thin', color: { argb: BRAND } } };
  };
  const header = (cells: string[]) => {
    const r = ws.addRow(cells);
    r.eachCell(cell => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }; });
  };
  section('Headline');
  const hl = ws.addRow([c.headline.label, c.headline.value]);
  hl.getCell(2).numFmt = XLSX_FMT[c.headline.fmt]; hl.getCell(2).font = { size: 16, bold: true };
  section('Executive summary');
  merged(c.summary, {}).height = Math.max(48, Math.ceil(c.summary.length / 115) * 15);
  section('Key metrics');
  header(['Metric', 'Value', 'Context', 'Change']);
  c.kpis.forEach(k => { const r = ws.addRow([k.title, k.value, k.of ?? '', k.delta.text]); r.getCell(2).numFmt = XLSX_FMT[k.fmt]; });
  section('Findings');
  header(['Severity', 'Finding', '', 'Detail']);
  c.findings.forEach(f => {
    const r = ws.addRow([FINDING_LABEL[f.tone], f.title, '', f.detail]);
    ws.mergeCells(r.number, 2, r.number, 3);
    r.alignment = { wrapText: true, vertical: 'top' };
    r.getCell(1).font = { bold: true, color: { argb: `FF${FINDING_HEX[f.tone].slice(1).toUpperCase()}` } };
  });
  section('Recommended actions');
  header(['Priority', 'Owner', 'Impact', 'Action']);
  c.actions.forEach(a => { ws.addRow([a.priority, a.owner, a.impact, a.action]).alignment = { wrapText: true, vertical: 'top' }; });

  const cols = c.table.columns;
  const dt = wb.addWorksheet('Detail', { views: [{ state: 'frozen', ySplit: 1 }] });
  dt.columns = cols.map(col => ({
    header: col.header, key: col.key,
    width: Math.min(46, Math.max(12, col.header.length + 3, col.width ? parseInt(col.width, 10) / 7 : 0)),
    style: col.fmt && XLSX_FMT[col.fmt] ? { numFmt: XLSX_FMT[col.fmt] } : {}
  }));
  const head = dt.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  c.table.rows.forEach(r => dt.addRow(Object.fromEntries(cols.map(col => {
    const v = r.cells[col.key];
    return [col.key, col.fmt === 'domain' ? cellText(v, col) : v ?? ''];
  }))));
  if (cols.length) dt.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  if (c.visuals.length) {
    const cd = wb.addWorksheet('Chart data');
    cd.getColumn(1).width = 44;
    for (let i = 2; i <= 14; i++) cd.getColumn(i).width = 16;
    c.visuals.forEach(v => {
      const data = visualData(v);
      cd.addRow([v.title]).font = { bold: true, size: 12, color: { argb: BRAND } };
      if (v.sub) cd.addRow([v.sub]).font = { italic: true, color: { argb: 'FF64748B' } };
      const h = cd.addRow(data.head);
      h.eachCell(cell => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }; });
      data.rows.forEach(row => cd.addRow(row));
      if (v.kind === 'bars') v.rows.forEach((row, i) => {
        if (row.hex) cd.getRow(h.number + 1 + i).getCell(1).border = { left: { style: 'thick', color: { argb: argb(row.hex) } } };
      });
      cd.addRow([]);
    });
  }

  const md = wb.addWorksheet('Methodology');
  md.columns = [{ header: 'Term', key: 't', width: 32 }, { header: 'Definition', key: 'd', width: 110 }];
  md.getRow(1).font = { bold: true };
  c.methodology.forEach(m => { md.addRow({ t: m.term, d: m.definition }).alignment = { wrapText: true, vertical: 'top' }; });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ── PDF ───────────────────────────────────────────────── */
/* jsPDF's built-in fonts cover Windows-1252 only; swap the handful of
   symbols this app's data uses for their plain equivalents */
const pdfText = (s: string | number) => String(s)
  .replace(/→/g, '->').replace(/≠/g, '!=').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/−/g, '-')
  .replace(/[▲]/g, '+').replace(/[▼]/g, '-').replace(/[⊕⊘⇄⏱✓⚠]/g, '').replace(/ /g, ' ');

async function reportPdf(d: ReportDef, c: ReportContent): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14, CW = W - M * 2;
  const ink: [number, number, number] = [15, 23, 42], muted: [number, number, number] = [100, 116, 139], brand: [number, number, number] = [29, 78, 216];
  let y = 0;
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  const ensure = (h: number) => { if (y + h > 297 - 18) { doc.addPage(); y = 18; } };
  const para = (text: string, size = 10, color = ink, gap = 1.5) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(pdfText(text), CW) as string[];
    const lh = size * 0.42;
    lines.forEach(line => { ensure(lh); doc.text(line, M, y); y += lh; });
    y += gap;
  };
  const h2 = (t: string) => {
    ensure(16); y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...ink); doc.text(pdfText(t), M, y);
    doc.setDrawColor(...brand); doc.setLineWidth(0.6); doc.line(M, y + 2, M + CW, y + 2);
    y += 8;
  };
  const table = (head: string[], body: string[][], opts: { right?: boolean[]; colWidths?: number[]; fontSize?: number } = {}) => {
    autoTable(doc, {
      startY: y, margin: { left: M, right: M, top: 18, bottom: 18 }, head: [head.map(pdfText)], body: body.map(r => r.map(pdfText)),
      theme: 'grid', styles: { fontSize: opts.fontSize ?? 8.5, cellPadding: 1.8, textColor: ink, lineColor: [226, 232, 240], lineWidth: 0.2, overflow: 'linebreak' },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
      columnStyles: Object.fromEntries(head.map((_, i) => [i, { halign: opts.right?.[i] ? 'right' : 'left', ...(opts.colWidths?.[i] ? { cellWidth: opts.colWidths[i] } : {}) }]))
    });
    y = lastY() + 5;
  };

  /* cover block */
  doc.setFillColor(...brand); doc.rect(0, 0, W, 3, 'F');
  y = 14;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...muted);
  doc.text(pdfText(`NETSINGULARITY OSS · ${MODULE_LABEL[d.module].toUpperCase()} REPORTS`), M, y);
  doc.text(pdfText(`${d.id} · ${d.audience} report`), W - M, y, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...ink);
  (doc.splitTextToSize(pdfText(d.name), CW) as string[]).forEach(l => { doc.text(l, M, y); y += 8; });
  para(d.question, 10.5, muted, 3);
  autoTable(doc, {
    startY: y, margin: { left: M, right: M }, theme: 'plain', styles: { fontSize: 8.5, cellPadding: 0.8, textColor: ink },
    columnStyles: { 0: { textColor: muted, cellWidth: 26 }, 2: { textColor: muted, cellWidth: 22 } },
    body: [
      ['Status', d.state, 'Data as of', d.lastRun], ['Schedule', d.schedule, 'Snapshot', d.snapshot],
      ['Distribution', { content: d.distribution, colSpan: 3 } as unknown as string]
    ].map(r => r.map(x => (typeof x === 'string' ? pdfText(x) : x)))
  });
  y = lastY() + 5;
  if (d.note) { doc.setFillColor(254, 243, 199); doc.roundedRect(M, y, CW, 10, 1.5, 1.5, 'F'); doc.setFontSize(8.5); doc.setTextColor(146, 64, 14); doc.text(doc.splitTextToSize(pdfText(d.note), CW - 6) as string[], M + 3, y + 4); y += 14; }

  /* headline */
  doc.setFillColor(239, 246, 255); doc.roundedRect(M, y, CW, 22, 2, 2, 'F');
  doc.setFillColor(...brand); doc.rect(M, y, 1.4, 22, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...ink);
  doc.text(pdfText(fmtValue(c.headline.value, c.headline.fmt)), M + 6, y + 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
  doc.text(doc.splitTextToSize(pdfText(c.headline.label), CW - 12) as string[], M + 6, y + 17.5);
  y += 28;

  /* KPI tiles */
  const tw = (CW - 3 * 4) / 4;
  ensure(26);
  c.kpis.slice(0, 4).forEach((k, i) => {
    const x = M + i * (tw + 4);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.roundedRect(x, y, tw, 24, 1.5, 1.5, 'S');
    doc.setFillColor(...rgb(hexOf(`var(--vw-color-${k.tone}-400)`, '#94a3b8'))); doc.rect(x, y, tw, 1.1, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
    doc.text(doc.splitTextToSize(pdfText(k.title), tw - 4)[0], x + 2.5, y + 5.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...ink);
    doc.text(pdfText(fmtValue(k.value, k.fmt)), x + 2.5, y + 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...muted);
    doc.text((doc.splitTextToSize(pdfText(k.of ?? ''), tw - 4) as string[])[0] ?? '', x + 2.5, y + 17.5);
    const dc: [number, number, number] = k.delta.better === null ? muted : k.delta.better ? [4, 120, 87] : [185, 28, 28];
    doc.setTextColor(...dc);
    doc.text((doc.splitTextToSize(pdfText(k.delta.text), tw - 4) as string[])[0] ?? '', x + 2.5, y + 21.5);
  });
  y += 30;

  h2('Executive summary');
  para(c.summary, 10, ink, 2);
  c.findings.forEach(f => {
    const lines = doc.splitTextToSize(pdfText(f.detail), CW - 8) as string[];
    const h = 7 + lines.length * 3.8;
    ensure(h + 2);
    doc.setFillColor(248, 250, 252); doc.rect(M, y, CW, h, 'F');
    doc.setFillColor(...rgb(FINDING_HEX[f.tone])); doc.rect(M, y, 1.2, h, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ink);
    doc.text(pdfText(`${FINDING_LABEL[f.tone]} · ${f.title}`), M + 4, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    doc.text(lines, M + 4, y + 9.2);
    y += h + 2;
  });

  if (c.visuals.length) {
    h2('Analysis');
    c.visuals.forEach(v => {
      /* reserve the whole chart (title included) so a chart never splits from its title */
      const est = v.kind === 'bars' ? 12 + v.rows.length * 5.6 : v.kind === 'ramp' ? 12 + v.buckets.length * 5.6
        : v.kind === 'lines' || v.kind === 'projection' ? 76 : v.kind === 'stacked' ? 70 : v.kind === 'heat' ? 18 + (v.rows.length + 1) * 7.5
          : v.kind === 'composition' || v.kind === 'donut' ? 28 : 30;
      ensure(Math.min(est, 240));
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...ink); doc.text(pdfText(v.title), M, y);
      if (v.sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted); doc.text(pdfText(v.sub), M, y + 4); y += 4; }
      y += 4;
      const barRows = v.kind === 'bars' ? v.rows.map(r => ({ label: r.label, value: r.value, hex: r.hex, text: fmtValue(r.value, v.fmt), lo: v.min ?? 0, hi: v.max }))
        : v.kind === 'ramp' ? v.buckets.map(b => ({ label: b.label, value: b.count, hex: b.hex, text: String(b.count), lo: 0, hi: undefined }))
          : null;
      if (barRows) {
        const hi = Math.max(...barRows.map(r => r.hi ?? r.value)), lo = barRows[0].lo;
        barRows.forEach(r => {
          ensure(6);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(51, 65, 85);
          doc.text((doc.splitTextToSize(pdfText(r.label), 62) as string[])[0], M, y + 3.4);
          doc.setFillColor(241, 245, 249); doc.rect(M + 64, y + 0.6, CW - 90, 3.8, 'F');
          doc.setFillColor(...rgb(hexOf(r.hex)));
          doc.rect(M + 64, y + 0.6, Math.max(0.6, (CW - 90) * Math.max(0, Math.min(1, (r.value - lo) / ((hi - lo) || 1)))), 3.8, 'F');
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...ink); doc.text(pdfText(r.text), W - M, y + 3.4, { align: 'right' });
          y += 5.6;
        });
        y += 3;
      } else if (v.kind === 'composition' || v.kind === 'donut') {
        const parts = v.kind === 'composition' ? v.parts : v.slices;
        const t = sum(parts, p => p.c);
        ensure(14);
        let x = M;
        parts.forEach(p => { const w = CW * p.c / t; doc.setFillColor(...rgb(hexOf(p.hex))); doc.rect(x, y, Math.max(0.3, w - 0.4), 5, 'F'); x += w; });
        y += 9;
        para(parts.map(p => `${p.n}: ${p.c.toLocaleString('en-IN')} (${(p.c / t * 100).toFixed(1)}%)`).join('   ·   '), 8, [51, 65, 85], 3);
      } else if (v.kind === 'lines' || v.kind === 'projection') {
        const H = 46, x0 = M + 14, x1 = W - M - 16;
        ensure(H + 16);
        const bottom = y + 2 + H;
        const series = v.kind === 'lines'
          ? v.series.map(sr => ({ name: sr.n, hex: hexOf(sr.hex), values: sr.values as (number | null)[], dash: false }))
          : [
            { name: 'Measured', hex: '#3b82f6', values: [...v.historyValues, ...v.projectionLabels.slice(1).map(() => null)] as (number | null)[], dash: false },
            { name: 'Projected', hex: '#60a5fa', values: [...v.historyValues.slice(0, -1).map(() => null), ...v.projectionValues] as (number | null)[], dash: true }
          ];
        const labels = v.kind === 'lines' ? v.labels : [...v.historyLabels, ...v.projectionLabels.slice(1)];
        const all = series.flatMap(sr => sr.values.filter((x): x is number => x !== null));
        let lo = v.kind === 'projection' ? v.yBounds.y0 : Math.min(...all), hi = v.kind === 'projection' ? v.yBounds.y1 : Math.max(...all);
        if (v.kind === 'lines') { const pad = (hi - lo) * 0.15 || 1; lo = Math.max(0, lo - pad); hi += pad; }
        const fx = (i: number) => x0 + (x1 - x0) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
        const fy = (val: number) => bottom - (H * (val - lo)) / ((hi - lo) || 1);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...muted); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
        [lo, (lo + hi) / 2, hi].forEach(t => { doc.line(x0, fy(t), x1, fy(t)); doc.text(pdfText(fmtValue(t, v.fmt)), x0 - 2, fy(t) + 1, { align: 'right' }); });
        const step = Math.max(1, Math.ceil(labels.length / 7));
        labels.forEach((l, i) => { if (i % step === 0 || i === labels.length - 1) doc.text(pdfText(l), fx(i), bottom + 4, { align: 'center' }); });
        if (v.kind === 'projection') {
          doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.4); doc.setLineDashPattern([1, 1], 0);
          doc.line(x0, fy(v.target), x1, fy(v.target)); doc.setLineDashPattern([], 0);
          doc.setTextColor(5, 150, 105); doc.text(pdfText(v.targetLabel), x1 + 1, fy(v.target) + 3.5);
        }
        series.forEach(sr => {
          doc.setDrawColor(...rgb(sr.hex)); doc.setLineWidth(0.6); doc.setLineDashPattern(sr.dash ? [1.6, 1] : [], 0);
          let prevPt: [number, number] | null = null;
          sr.values.forEach((val, i) => {
            if (val === null) { prevPt = null; return; }
            const pt: [number, number] = [fx(i), fy(val)];
            if (prevPt) doc.line(prevPt[0], prevPt[1], pt[0], pt[1]);
            prevPt = pt;
          });
          doc.setLineDashPattern([], 0);
          const lastIdx = sr.values.map((x, i) => (x === null ? -1 : i)).filter(i => i >= 0).pop()!;
          doc.setFillColor(...rgb(sr.hex)); doc.circle(fx(lastIdx), fy(sr.values[lastIdx]!), 0.8, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...ink);
          doc.text(pdfText(fmtValue(sr.values[lastIdx]!, v.fmt)), fx(lastIdx) + 1.5, fy(sr.values[lastIdx]!) - 1.5);
        });
        y = bottom + 8;
        let lx = x0;
        series.forEach(sr => {
          doc.setFillColor(...rgb(sr.hex)); doc.rect(lx, y - 2.2, 2.5, 2.5, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(51, 65, 85); doc.text(pdfText(sr.name), lx + 3.5, y);
          lx += 6 + doc.getTextWidth(pdfText(sr.name));
        });
        y += 6;
      } else if (v.kind === 'stacked') {
        const H = 40, x0 = M + 10, x1 = W - M;
        ensure(H + 16);
        const bottom = y + 2 + H;
        const totals = v.values.map(r => sum(r, x => x)); const max = Math.max(...totals) || 1;
        const slot = (x1 - x0) / v.days.length, bw = Math.min(10, slot * 0.5);
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(x0, bottom, x1, bottom);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        v.days.forEach((dname, i) => {
          let acc = 0; const cx = x0 + slot * i + slot / 2;
          v.series.forEach((sr, si) => {
            const val = v.values[i][si]; const h = (H * val) / max;
            doc.setFillColor(...rgb(hexOf(sr.hex))); doc.rect(cx - bw / 2, bottom - acc - h, bw, Math.max(0, h - 0.2), 'F'); acc += h;
          });
          doc.setTextColor(...ink); doc.text(String(totals[i]), cx, bottom - acc - 1.2, { align: 'center' });
          doc.setTextColor(...muted); doc.text(pdfText(dname), cx, bottom + 4, { align: 'center' });
        });
        y = bottom + 9;
        let lx = x0;
        v.series.forEach(sr => {
          doc.setFillColor(...rgb(hexOf(sr.hex))); doc.rect(lx, y - 2.2, 2.5, 2.5, 'F');
          doc.setFontSize(7.5); doc.setTextColor(51, 65, 85); doc.text(pdfText(sr.n), lx + 3.5, y); lx += 6 + doc.getTextWidth(pdfText(sr.n));
        });
        y += 6;
      } else if (v.kind === 'heat') {
        const max = Math.max(1, ...v.values.flat());
        const ramp = ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'];
        autoTable(doc, {
          startY: y, margin: { left: M, right: M, top: 18, bottom: 18 }, theme: 'plain',
          head: [['', ...v.cols].map(pdfText)], body: v.rows.map((r, i) => [pdfText(r), ...v.values[i].map(x => pdfText(fmtValue(x, v.fmt)))]),
          styles: { fontSize: 8, halign: 'center', cellPadding: 2.2, lineColor: [255, 255, 255], lineWidth: 0.6 },
          headStyles: { textColor: [100, 116, 139], fontStyle: 'bold' },
          columnStyles: { 0: { halign: 'left', fontStyle: 'bold', textColor: [51, 65, 85] } },
          didParseCell: data => {
            if (data.section !== 'body' || data.column.index === 0) return;
            const val = v.values[data.row.index][data.column.index - 1];
            const shade = val ? Math.min(ramp.length - 1, Math.ceil((val / max) * (ramp.length - 1))) : 0;
            data.cell.styles.fillColor = rgb(val ? ramp[shade] : '#f8fafc');
            data.cell.styles.textColor = shade >= 5 ? [255, 255, 255] : [30, 58, 138];
            data.cell.styles.fontStyle = 'bold';
          }
        });
        y = lastY() + 5;
      } else {
        const data = visualData(v);
        table(data.head, data.rows.map(r => r.map(x => (typeof x === 'number' ? x.toLocaleString('en-IN') : String(x)))), { fontSize: 7.5 });
      }
    });
  }

  h2('Recommended actions');
  table(['Priority', 'Action', 'Owner', 'Impact'], c.actions.map(a => [a.priority, a.action, a.owner, a.impact]), { colWidths: [16, 72, 40, 54] });

  /* detail: landscape when the table is wide */
  const cols = c.table.columns;
  const wide = cols.length > 7;
  if (wide) doc.addPage('a4', 'landscape'); else h2(c.table.title);
  if (wide) {
    y = 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...ink); doc.text(pdfText(c.table.title), M, y);
    y += 7;
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted);
  doc.text(pdfText(`${c.table.sub} · ${c.table.rows.length} rows`), M, y); y += 4;
  table(cols.map(col => col.header), c.table.rows.map(r => cols.map(col => cellText(r.cells[col.key], col))), { right: cols.map(col => !!col.right), fontSize: wide ? 7 : 7.8 });
  if (wide) { doc.addPage('a4', 'portrait'); y = 18; }

  h2('Methodology & definitions');
  table(['Term', 'Definition'], c.methodology.map(m => [m.term, m.definition]), { colWidths: [44, CW - 44] });

  /* footer on every page */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(M, ph - 11, pw - M, ph - 11);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
    doc.text(pdfText(`${d.id} · ${d.name} · snapshot ${d.snapshot}`), M, ph - 6.5);
    doc.text(`Generated ${pdfText(TODAY_TEXT())} · Internal · Page ${i} of ${pages}`, pw - M, ph - 6.5, { align: 'right' });
  }
  return doc.output('blob');
}

/* ── entry point ───────────────────────────────────────── */
export async function exportReport(d: ReportDef, c: ReportContent, format: ExportFormat): Promise<void> {
  const stem = fileStem(d);
  switch (format) {
    case 'csv': return save(new Blob([reportCsv(d, c)], { type: 'text/csv;charset=utf-8' }), `${stem}.csv`);
    case 'json': return save(new Blob([reportJson(d, c)], { type: 'application/json' }), `${stem}.json`);
    case 'html': return save(new Blob([reportHtml(d, c)], { type: 'text/html;charset=utf-8' }), `${stem}.html`);
    case 'doc': return save(new Blob(['﻿', reportHtml(d, c, true)], { type: 'application/msword' }), `${stem}.doc`);
    case 'xlsx': return save(await reportXlsx(d, c), `${stem}.xlsx`);
    case 'pdf': return save(await reportPdf(d, c), `${stem}.pdf`);
  }
}

export { reportPdf, reportXlsx };
