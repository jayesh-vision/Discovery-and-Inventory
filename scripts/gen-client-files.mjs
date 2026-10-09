/* Client-wise example upload files: one complete file set per client, with
   all of that client's data centers in it, built from src/dcim/siteSample.ts
   (each site's own network elements in racks, with power, cooling, cabling,
   sensors). Every set is validated with the app's importer, then all clients
   are loaded into one store to prove they stay separate.
     public/templates/clients/<CLIENT-ID>/<Sheet>.csv            (16 files)
     public/templates/clients/<CLIENT-ID>/<CLIENT-ID>-inventory.xlsx
   Run: npm run gen:client-files */
import { createServer } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENTS = [
  { id: 'TELCO-NORTH', name: 'Northern Telco Ltd', industry: 'Telecom', sites: ['PB-DC-002', 'PB-DC-003'] },
  { id: 'CLOUD-SOUTH', name: 'Southern Cloud Services', industry: 'Cloud hosting', sites: ['KA-DC-001', 'KA-DC-077'] },
  { id: 'COLO-WEST', name: 'Western Colocation Pvt Ltd', industry: 'Colocation', sites: ['MH-DC-005', 'MH-DC-006'] }
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = JSON.parse(readFileSync(join(root, 'src/data/allLocations.json'), 'utf8'));
const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, cacheDir: join(root, 'tests', 'unit', '.vite-cache'), optimizeDeps: { noDiscovery: true, include: [] } });
let bad = 0;
try {
  const gen = await server.ssrLoadModule('/src/dcim/siteSample.ts');
  const tmpl = await server.ssrLoadModule('/src/dcim/template.ts');
  const schema = await server.ssrLoadModule('/src/dcim/schema.ts');
  const parse = await server.ssrLoadModule('/src/dcim/parse.ts');
  const rec = await server.ssrLoadModule('/src/dcim/reconcile.ts');
  const { DcimStore } = await server.ssrLoadModule('/src/dcim/store.ts');
  const m = new Map();
  const st = new DcimStore({ getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) });
  const lines = [];
  for (const c of CLIENTS) {
    /* one client = the rows of each of its sites, one Clients row */
    const rows = {};
    for (const id of c.sites) {
      const l = all.find(x => x.id === id);
      if (!l) throw new Error(`${id} is not in src/data/allLocations.json`);
      const r = gen.buildSiteSample({ id: l.id, name: l.name, city: l.city, state: l.state, addr: l.addr, lat: l.lat, lon: l.lon, ne: l.ne, disc: l.disc }, c.id, c.name);
      for (const [sheet, list] of Object.entries(r)) rows[sheet] = [...(rows[sheet] ?? []), ...list];
    }
    rows.Clients = [{ ClientId: c.id, Name: c.name, Industry: c.industry, ContactEmail: `noc@${c.id.toLowerCase()}.example.com` }];
    const out = join(root, 'public', 'templates', 'clients', c.id);
    mkdirSync(out, { recursive: true });
    const raws = [];
    for (const def of schema.SHEETS) {
      const csv = tmpl.sheetCsv(def.sheet, rows);
      writeFileSync(join(out, `${def.sheet}.csv`), csv);
      raws.push(parse.readCsv(csv, `${def.sheet}.csv`));
    }
    writeFileSync(join(out, `${c.id}-inventory.xlsx`), Buffer.from(await tmpl.buildWorkbook(rows)));
    st.upsertClient({ id: c.id, name: c.name });
    const s = rec.stageImport({ clientId: c.id, clientName: c.name, fileName: `${c.id} CSV`, plans: parse.planSheets(raws), existing: st.data(c.id) });
    console.log(`${c.id}: ${s.totals.errors} errors, ${s.totals.warnings} warnings — ${c.sites.join(', ')} · ${rows.Racks.length} racks · ${rows.Devices.length} devices · ${rows.Connections.length} connections · ${rows.PowerEquipment.length} power units`);
    for (const i of s.issues.slice(0, 5)) console.log(`  ${i.severity} ${i.sheet} row ${i.row} ${i.col ?? ''}: ${i.message}`);
    if (!s.ok) { bad++; continue; }
    st.commit(s);
    lines.push(`| ${c.id} | ${c.name} | ${c.sites.join(', ')} | ${rows.Racks.length} | ${rows.Devices.length} | \`${c.id}/\` |`);
  }
  /* separation: every client sees only its own data centers */
  for (const c of CLIENTS) {
    const dcs = st.data(c.id)?.entities.dataCenters.map(d => d.id).sort().join(',');
    if (dcs !== [...c.sites].sort().join(',')) { console.error(`separation check failed for ${c.id}: ${dcs}`); bad++; }
  }
  if (!bad) console.log('separation check: each client holds only its own data centers');
  writeFileSync(join(root, 'public', 'templates', 'clients', 'README.md'), `# Client-wise upload files

One folder per client. Each folder is a complete upload for that client: 16 CSV files (one per sheet) and the same data as one Excel workbook. Upload either the 16 CSVs together or the .xlsx — not both.

| Client ID | Name | Data centers (LocationId) | Racks | Devices | Folder |
|---|---|---|---|---|---|
${lines.join('\n')}

How to upload (Inventory › Data centers › Upload inventory):
1. Client step: choose **New client** and enter the Client ID and Name from the table — they must match the \`ClientId\` in DataCenters.csv, or the review blocks the upload.
2. File step: select all 16 CSV files of that client's folder (or its .xlsx).
3. Validate, then Upload. Repeat for the next client.

Each data center's \`LocationId\` is a real Inventory › Location site, so after upload the inventory also shows on that site's **Infrastructure** tab.
The devices are each site's own network elements (same names, IPs, models and serials as the site's Network elements tab).
Regenerate with \`npm run gen:client-files\`.
`);
} finally { await server.close(); }
process.exit(bad ? 1 : 0);
