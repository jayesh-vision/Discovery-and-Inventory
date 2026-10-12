/* Minimal read-only .xlsx reader (no dependencies): unzips with the system `unzip`, parses the
   sheet XML. Returns { sheetName: [ {header: value, …}, … ] } using each sheet's first row as the
   header (a trailing " *" required-marker and " (calc)" are kept as written; use `col()` to match). */
import { execFileSync } from 'node:child_process';

const unzip = (file, entry) => execFileSync('unzip', ['-p', file, entry], { encoding: 'utf8', maxBuffer: 1 << 30 });
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const colIndex = ref => { let n = 0; for (const ch of ref.match(/^[A-Z]+/)[0]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const text = x => { let t = ''; for (const m of x.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += m[1]; return decode(t); };

export function readWorkbook(file) {
  const names = execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split('\n');
  const shared = names.includes('xl/sharedStrings.xml')
    ? [...unzip(file, 'xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => text(m[1])) : [];
  const wb = unzip(file, 'xl/workbook.xml');
  const rels = Object.fromEntries([...unzip(file, 'xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map(m => {
    const a = m[0]; return [a.match(/Id="([^"]+)"/)[1], a.match(/Target="([^"]+)"/)[1]];
  }));
  const out = {};
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decode(m[0].match(/name="([^"]+)"/)[1]);
    let target = rels[m[0].match(/r:id="([^"]+)"/)[1]].replace(/^\//, '');
    if (!target.startsWith('xl/')) target = 'xl/' + target;
    const xml = unzip(file, target);
    const rows = [];
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1], body = c[2] ?? '';
        const ref = attrs.match(/r="([A-Z]+\d+)"/)[1], t = (attrs.match(/\bt="(\w+)"/) ?? [])[1];
        const v = body.match(/<v>([\s\S]*?)<\/v>/);
        let val = null;
        if (t === 'inlineStr') val = text(body);
        else if (t === 's' && v) val = shared[+v[1]];
        else if (v) { val = decode(v[1]); if (t !== 'str' && t !== 'b' && t !== 'e') { const n = Number(val); if (val !== '' && !Number.isNaN(n)) val = n; } }
        if (val === '') val = null;
        cells[colIndex(ref)] = val;
      }
      if (cells.some(x => x != null)) rows.push(cells);
    }
    out[name] = rows;
  }
  return out;
}

/* rows → objects keyed by the header with the " *" / " (calc)" suffix dropped */
export function table(rows) {
  if (!rows?.length) return [];
  const head = rows[0].map(h => String(h ?? '').replace(/\s*\*$/, '').replace(/\s*\(calc\)$/, ''));
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? null])));
}
