// Test-only workerd HTTP endpoint with ephemeral D1 and deliberately fake keys.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(new URL('../cloudflare-worker/package.json', import.meta.url));
const { Miniflare } = require('miniflare');
const mf = new Miniflare({
  host: '127.0.0.1', port: 0, modules: true,
  script: await readFile(new URL('../cloudflare-worker/.test-build/index.js', import.meta.url), 'utf8'),
  compatibilityDate: '2026-06-11', d1Databases: { DB: 'start-flow-isolated-test' },
  bindings: {
    ENABLED: 'true', ENVIRONMENT: 'development', DEV_ORIGINS: 'http://127.0.0.1:8000',
    SIGNING_KEY: 'isolated-browser-signing-not-production-000',
    PSEUDONYM_KEY: 'isolated-browser-player-not-production-111',
    RATE_KEY: 'isolated-browser-rate-not-production-222',
  },
});
const db = await mf.getD1Database('DB');
const sql = (await Promise.all(['0001_initial.sql','0002_escape_pf2.sql'].map(name => readFile(new URL('../cloudflare-worker/migrations/'+name, import.meta.url), 'utf8')))).join('\n').replace(/^--.*$/gm, '');
await db.batch(sql.split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
console.log(JSON.stringify({ ready: true, url: (await mf.ready).origin }));
process.on('SIGTERM', async () => { await mf.dispose(); process.exit(0); });
