/**
 * Universal table exporter for Discovery & Inventory.
 * Converts rendered HTML tables into:
 *  - Genuine .xlsx files (using ExcelJS with formatted headers, auto-filter, and column widths)
 *  - Proper .csv files (with UTF-8 BOM \uFEFF for seamless Excel/Numbers display without mojibake)
 */

export interface ExtractedTableData {
  headers: string[];
  rows: string[][];
}

/**
 * Extracts clean, human-readable tabular data from any rendered HTML table.
 * Strips out action buttons, kebab menus, and formats multi-line cells and chips cleanly.
 */
export function extractTableData(table: HTMLTableElement): ExtractedTableData {
  const allTrs = Array.from(table.querySelectorAll('tr'));
  if (allTrs.length === 0) return { headers: [], rows: [] };

  // Identify column indices that should be excluded (e.g. kebab menu columns)
  const sampleCells = Array.from(allTrs[0].children);
  const excludedIndices = new Set<number>();

  sampleCells.forEach((cell, idx) => {
    if (
      cell.classList.contains('kb-th') ||
      cell.classList.contains('kb-td') ||
      cell.querySelector('.kmenu-trigger, [data-kmenu]')
    ) {
      excludedIndices.add(idx);
    }
  });

  const cleanCellText = (cell: Element): string => {
    const clone = cell.cloneNode(true) as HTMLElement;

    // Remove kebab menus, action buttons, SVGs, screen-reader text, scripts, styles
    clone
      .querySelectorAll('button, .kmenu, .kmenu-trigger, [aria-hidden="true"], svg, script, style, .sr-only')
      .forEach(el => el.remove());

    // Replace <br> tags with a unique marker so only explicit <br> becomes a newline
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\uE000'));

    // In elements with sibling badges, pills, or spans, insert spaces between them
    clone.querySelectorAll('span, div, p, strong, em, b, i, a, td, th').forEach(el => {
      if (el.textContent && !el.textContent.endsWith(' ') && !el.textContent.endsWith('\n')) {
        el.after(document.createTextNode(' '));
      }
    });

    const raw = clone.textContent ?? '';
    // Collapse whitespace per segment (HTML formatting/newlines) into single space, preserving <br>
    const lines = raw
      .split('\uE000')
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    return lines.join('\n');
  };

  const parsedMatrix: string[][] = [];

  for (const tr of allTrs) {
    if (tr.classList.contains('grid-empty-tr')) continue;

    const rowCells = Array.from(tr.children);
    // Skip empty state rows that span all columns
    if (rowCells.length === 1 && (rowCells[0] as HTMLTableCellElement).colSpan > 1) {
      continue;
    }

    const rowData: string[] = [];
    rowCells.forEach((c, idx) => {
      if (excludedIndices.has(idx) || c.classList.contains('kb-th') || c.classList.contains('kb-td')) return;
      rowData.push(cleanCellText(c));
    });

    if (rowData.length > 0) {
      parsedMatrix.push(rowData);
    }
  }

  if (parsedMatrix.length === 0) return { headers: [], rows: [] };

  const headers = parsedMatrix[0];
  const rows = parsedMatrix.slice(1);

  return { headers, rows };
}

function saveBlob(blob: Blob, fullFilename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports an HTML table to a genuine .xlsx file.
 */
export async function exportTableToXlsx(table: HTMLTableElement, stemName: string): Promise<void> {
  const { headers, rows } = extractTableData(table);
  if (headers.length === 0 && rows.length === 0) {
    alert('Nothing to export — this grid has no rows yet.');
    return;
  }

  const mod = await import('exceljs');
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NetSingularity OSS';
  wb.created = new Date();

  const sheetName = (stemName.replace(/-export/i, '') || 'Data').slice(0, 31);
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // Header row styling
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate-800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
    };
  });

  // Add data rows
  rows.forEach(row => {
    const rowValues = row.map(v => {
      const trimmed = v.trim();
      const numCandidate = trimmed.replace(/,/g, '');
      // If it is a whole number (and not a serial/phone like '0123')
      if (/^-?\d+$/.test(numCandidate) && !(trimmed.length > 1 && trimmed.startsWith('0'))) {
        const parsed = parseInt(numCandidate, 10);
        if (!isNaN(parsed) && Math.abs(parsed) < Number.MAX_SAFE_INTEGER) {
          return parsed;
        }
      }
      return v;
    });

    const r = ws.addRow(rowValues);
    r.eachCell(cell => {
      cell.alignment = { vertical: 'top', wrapText: true };
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  });

  // Auto-fit column widths
  ws.columns = headers.map((h, i) => {
    let maxLen = h.length;
    for (const r of rows) {
      const cellVal = r[i] ?? '';
      const longestLine = cellVal.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
      if (longestLine > maxLen) maxLen = longestLine;
    }
    return {
      width: Math.min(50, Math.max(14, maxLen + 3))
    };
  });

  // Auto-filter
  if (headers.length > 0) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    };
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveBlob(blob, `${stemName}.xlsx`);
}

/**
 * Exports an HTML table to a clean RFC-4180 .csv file with UTF-8 BOM.
 */
export function exportTableToCsv(table: HTMLTableElement, stemName: string): void {
  const { headers, rows } = extractTableData(table);
  if (headers.length === 0 && rows.length === 0) {
    alert('Nothing to export — this grid has no rows yet.');
    return;
  }

  const escapeCsv = (val: string): string => {
    if (/[",\r\n]/.test(val)) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines: string[] = [];
  if (headers.length > 0) {
    csvLines.push(headers.map(escapeCsv).join(','));
  }
  for (const r of rows) {
    csvLines.push(r.map(escapeCsv).join(','));
  }

  // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows & macOS opens it correctly as UTF-8
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveBlob(blob, `${stemName}.csv`);
}

/**
 * Universal export function used by both React DataGrid and Legacy bridge.
 */
export async function exportTable(
  table: HTMLTableElement | null | undefined,
  kind: 'csv' | 'xlsx',
  stemName = 'export'
): Promise<void> {
  if (!table) {
    alert('Nothing to export — this grid has no rows yet.');
    return;
  }

  if (kind === 'xlsx') {
    await exportTableToXlsx(table, stemName);
  } else {
    exportTableToCsv(table, stemName);
  }
}
