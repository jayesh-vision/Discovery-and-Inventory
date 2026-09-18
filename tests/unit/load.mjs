/* Loads the app's TypeScript data modules for node --test without adding a
   test runner: Vite (already a dev dependency) transpiles and resolves the
   extensionless imports the way the app itself does. The cache dir is
   local to this folder so a root-owned node_modules/.vite never blocks it. */
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
let server;
export async function loadModule(path) {
  server ??= await createServer({
    root, configFile: false, logLevel: 'silent', server: { middlewareMode: true },
    cacheDir: join(here, '.vite-cache'), optimizeDeps: { noDiscovery: true, include: [] }
  });
  return server.ssrLoadModule(path);
}
export async function closeLoader() { await server?.close(); server = undefined; }

/* the legacy prototype's helpers are a plain script (no exports); evaluate
   it in a sandbox and read the globals it defines */
export function loadLegacyHelpers() {
  const src = readFileSync(join(root, 'legacy', 'app-helpers.js'), 'utf8');
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__x = { DOMAIN_META, DOMAIN_ORDER, DOMAIN_FILTER_OPTIONS, domainFilterMatch, domainDot };', ctx);
  return ctx.__x;
}
