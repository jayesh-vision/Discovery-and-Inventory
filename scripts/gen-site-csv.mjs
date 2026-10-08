/* Example infrastructure inventory for Inventory › Location sites, as the
   16 upload CSV files plus one Excel workbook, from src/dcim/siteSample.ts:
     public/templates/sites/<SITE>/<Sheet>.csv
     public/templates/sites/<SITE>/<SITE>-example-inventory.xlsx
   Each set is validated with the app's own importer before it is written.
   Run: npm run gen:site-csv -- PB-DC-001 [MORE-SITE-IDS…] */
import { createServer } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['PB-DC-001'];
const all = JSON.parse(readFileSync(join(root, 'src/data/allLocations.json'), 'utf8'));
const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, cacheDir: join(root, 'tests', 'unit', '.vite-cache'), optimizeDeps: { noDiscovery: true, include: [] } });
let bad = 0;
try {
  const gen = await server.ssrLoadModule('/src/dcim/siteSample.ts');
  const tmpl = await server.ssrLoadModule('/src/dcim/template.ts');
  const schema = await server.ssrLoadModule('/src/dcim/schema.ts');
  const parse = await server.ssrLoadModule('/src/dcim/parse.ts');
  const rec = await server.ssrLoadModule('/src/dcim/reconcile.ts');
  for (const id of ids) {
    const l = all.find(x => x.id === id);
    if (!l) { console.error(`${id}: not in src/data/allLocations.json`); bad++; continue; }
    const rows = gen.buildSiteSample({ id: l.id, name: l.name, city: l.city, state: l.state, addr: l.addr, lat: l.lat, lon: l.lon, ne: l.ne, disc: l.disc });
    const out = join(root, 'public', 'templates', 'sites', id);
    mkdirSync(out, { recursive: true });
    const raws = [];
    for (const def of schema.SHEETS) {
      const csv = tmpl.sheetCsv(def.sheet, rows);
      writeFileSync(join(out, `${def.sheet}.csv`), csv);
      raws.push(parse.readCsv(csv, `${def.sheet}.csv`));
    }
    writeFileSync(join(out, `${id}-example-inventory.xlsx`), Buffer.from(await tmpl.buildWorkbook(rows)));
    const s = rec.stageImport({ clientId: 'DEMO-TELCO', fileName: 'csv', plans: parse.planSheets(raws) });
    const counts = Object.entries(rows).map(([k, v]) => `${k} ${v.length}`).join(' · ');
    console.log(`${id}: ${s.totals.errors} errors, ${s.totals.warnings} warnings — ${counts}`);
    for (const i of s.issues.slice(0, 5)) console.log(`  ${i.severity} ${i.sheet} row ${i.row} ${i.col ?? ''}: ${i.message}`);
    if (s.totals.errors) bad++;
  }
} finally { await server.close(); }
process.exit(bad ? 1 : 0);
