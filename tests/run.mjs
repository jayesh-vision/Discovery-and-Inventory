/* Builds, serves the build on :4173 and runs the end-to-end harness against it. */
import { spawn, execSync } from 'node:child_process';

execSync('npx vite build --configLoader runner', { stdio: 'inherit' });
const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
let code = 0;
try { execSync('node tests/e2e.mjs', { stdio: 'inherit' }); }
catch (e) { code = e.status ?? 1; }
finally { srv.kill(); }
process.exit(code);
