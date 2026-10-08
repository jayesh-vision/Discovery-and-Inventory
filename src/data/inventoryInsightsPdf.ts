/* PDF for Inventory Insights, built from the same row set as the CSV export so
   the two can never disagree. Rows follow one convention: a "=== TITLE ==="
   row opens a section; the first row of each blank-separated block is its
   header. jspdf is loaded on demand — it is only needed when the reader exports. */

export type InsightRow = (string | number)[];

/* jsPDF's built-in fonts cover Windows-1252 only; swap the few symbols this
   data uses for plain equivalents */
const pdfText = (s: string | number | undefined | null) =>
  String(s ?? '')
    .replace(/→/g, '->').replace(/≠/g, '!=').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/−/g, '-').replace(/[↓]/g, '-').replace(/[↑]/g, '+')
    .replace(/[–—]/g, '-').replace(/·/g, '|').replace(/﻿/g, '');

interface Section { title: string; blocks: InsightRow[][] }

function toSections(rows: InsightRow[]): { meta: InsightRow[]; sections: Section[] } {
  const meta: InsightRow[] = [];
  const sections: Section[] = [];
  let cur: Section | null = null;
  let block: InsightRow[] = [];
  const flush = () => { if (cur && block.length) cur.blocks.push(block); block = []; };
  for (const r of rows) {
    const first = String(r[0] ?? '');
    if (first.startsWith('=== ') && first.endsWith(' ===') && r.length === 1) {
      flush();
      cur = { title: first.slice(4, -4), blocks: [] };
      sections.push(cur);
    } else if (!r.length) {
      flush();
    } else if (cur) {
      block.push(r);
    } else {
      meta.push(r);
    }
  }
  flush();
  return { meta, sections };
}

export async function buildInsightsPdf(rows: InsightRow[], title: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const M = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ink: [number, number, number] = [15, 23, 42];
  const muted: [number, number, number] = [100, 116, 139];
  const brand: [number, number, number] = [28, 129, 239];
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
  const { meta, sections } = toSections(rows);

  // header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...ink);
  doc.text(pdfText(title), M, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...muted);
  let y = 24;
  meta.forEach(r => { doc.text(pdfText(`${r[0]}: ${r.slice(1).join(' ')}`), M, y); y += 4.6; });
  doc.setDrawColor(...brand); doc.setLineWidth(0.6); doc.line(M, y, pageW - M, y);
  y += 5;

  for (const sec of sections) {
    if (y > pageH - 40) { doc.addPage(); y = 16; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink);
    doc.text(pdfText(sec.title), M, y);
    y += 2.5;
    for (const blk of sec.blocks) {
      const [head, ...body] = blk;
      autoTable(doc, {
        startY: y,
        head: [head.map(pdfText)],
        body: body.map(r => r.map(pdfText)),
        theme: 'striped',
        margin: { left: M, right: M, bottom: 14 },
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, textColor: ink, overflow: 'linebreak' },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 251, 252] }
      });
      y = lastY() + 4;
    }
    y += 3;
  }

  // footer: page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted);
    doc.text(`Page ${i} of ${pages}`, pageW - M, pageH - 6, { align: 'right' });
    doc.text(pdfText(title), M, pageH - 6);
  }
  return doc.output('blob');
}
