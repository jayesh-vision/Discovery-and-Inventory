/* Writes the DCIM import workbooks to public/templates/ from the same schema
   and sample builder the app uses (src/dcim):
     public/templates/dcim-import-template.xlsx   blank template with field definitions and a few example rows
     public/templates/dcim-sample-acme.xlsx       the full acceptance-scenario client workbook
   Run: npm run gen:dcim-templates */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, cacheDir: join(root, 'tests', 'unit', '.vite-cache'), optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const sample = await server.ssrLoadModule('/src/dcim/sample.ts');
  const tmpl = await server.ssrLoadModule('/src/dcim/template.ts');
  const phy = await server.ssrLoadModule('/src/data/physical.ts');
  const ledger = await server.ssrLoadModule('/src/data/ledger.ts');
  const dd = await server.ssrLoadModule('/src/data/domainDevices.ts');
  /* same references the app's "Download sample workbook" uses */
  const refs = {
    inventory: ledger.NE_CLASSES.flatMap(c => phy.PHY[c]).filter(r => r.sn && r.ip).slice(0, 2).map(r => ({ sn: r.sn, ip: r.ip })),
    discovered: dd.DOMAIN_DEVICES.filter(d => d.ip).slice(0, 1).map(d => ({ ip: d.ip }))
  };
  const out = join(root, 'public', 'templates');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'dcim-import-template.xlsx'), Buffer.from(await tmpl.buildWorkbook(sample.buildSample('mini'))));
  writeFileSync(join(out, 'dcim-sample-acme.xlsx'), Buffer.from(await tmpl.buildWorkbook(sample.buildSample('full', refs))));
  const counts = sample.sampleCounts(sample.buildSample('full', refs));
  console.log('wrote public/templates/dcim-import-template.xlsx and dcim-sample-acme.xlsx');
  console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '));
} finally {
  await server.close();
}
