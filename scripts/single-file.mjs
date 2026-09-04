/* Folds a Vite build into one self-contained HTML file for previewing where
   there is no server (an artifact, an email attachment). Not the deploy path.
   Run: VITE_ROUTER=hash npx vite build && node scripts/single-file.mjs */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
const css = assets.filter(f => f.endsWith('.css')).map(f => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
const js  = assets.filter(f => f.endsWith('.js')).map(f => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
const legacy = readFileSync(join(root, 'public', 'legacy.js'), 'utf8');

html = html
  .replace(/<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>/g, '')
  .replace(/<script type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>/g, '')
  /* function replacers: the code contains "$'"-style sequences a string replacement would expand */
  .replace('</head>', () => `<style>${css}</style></head>`)
  .replace('</body>', () => `<script>${legacy.replace(/<\/script/g, '<\\/script')}</script>\n<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script></body>`);

writeFileSync(join(dist, 'app.html'), html);
console.log('dist/app.html', html.length, 'bytes');
