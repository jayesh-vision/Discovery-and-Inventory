import { createServer } from 'vite';
const s = await createServer({ server: { middlewareMode: true }, logLevel: 'silent', cacheDir: '/private/tmp/claude-502/-Users-bootnext-mac-27-Documents-GitHub-Discovery-and-Inventory/3313860b-622d-4a50-a33b-cb6c71f29ef5/scratchpad/.vite', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const m = await s.ssrLoadModule('/src/data/discoveryOverview.ts');
  console.log('ssrLoadModule ok', m.DOMAIN_PARENT, m.DOMAIN_FULL_LABEL);
  const r = await s.ssrLoadModule('/src/data/rules.ts');
  console.log('rules ok', r.RULES.length);
} catch (e) { console.log('ssrLoadModule failed:', e.message.slice(0, 400)); }
await s.close();
