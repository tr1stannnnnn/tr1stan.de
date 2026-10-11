import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import worker, { cleanup } from '../src/index.mjs';
import { VERSION, RULES, utcDay, dailySeed } from '../../game/rules.mjs';

// Deliberately fake keys, ephemeral D1, no production endpoints or credentials.
const secrets = { SIGNING_KEY: 'test-only-signing-key-not-for-production-000', PSEUDONYM_KEY: 'test-only-player-key-not-for-production-111', RATE_KEY: 'test-only-rate-key-not-for-production-222' };
let mf, DB, now, ipCounter = 1;
let env;
const origin = 'https://tr1stan.de';
const player = () => crypto.randomUUID();
const b64 = bytes => Buffer.from(bytes).toString('base64url');
async function token(claims) {
  const payload = b64(JSON.stringify(claims));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secrets.SIGNING_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `pf1.${payload}.${b64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('pf1.' + payload)))}`;
}
async function request(path, { method = 'GET', body, headers = {}, ip, targetEnv = env } = {}) {
  const response = await worker.fetch(new Request('https://worker.invalid' + path, {
    method, headers: { Origin: origin, 'CF-Connecting-IP': ip || `198.51.100.${ipCounter++}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), targetEnv);
  return { status: response.status, data: response.status === 204 ? null : await response.json(), response };
}
async function fixture(id = player(), mode = 'normal', elapsed = 120000) {
  const started = await request('/api/run/start', { method: 'POST', body: { playerId: id, mode, version: VERSION } });
  assert.equal(started.status, 200);
  const claims = JSON.parse(Buffer.from(started.data.token.split('.')[1], 'base64url'));
  claims.startedAt = now - elapsed; claims.expiresAt = claims.startedAt + RULES.tokenTtlMs;
  claims.day = mode === 'daily' ? utcDay(claims.startedAt) : '';
  if (mode === 'daily') claims.seed = dailySeed(claims.day);
  await DB.prepare('UPDATE runs SET started_at=?,expires_at=?,day=?,seed=? WHERE id=?').bind(claims.startedAt, claims.expiresAt, claims.day, claims.seed, claims.runId).run();
  return { ...started.data, ...claims, token: await token(claims), playerId: id };
}
const submission = (run, score = 10, alias = 'Tester', activeMs = 100000) => ({ token: run.token, playerId: run.playerId, alias, score, activeMs });
before(async () => {
  mf = new Miniflare({ modules: true, script: await readFile(new URL('../.test-build/index.js', import.meta.url), 'utf8'), compatibilityDate: '2026-06-11', d1Databases: { DB: 'packet-flight-isolated-test' }, bindings: { ENABLED: 'true', ENVIRONMENT: 'production', ...secrets } });
  DB = await mf.getD1Database('DB');
  const sql = (await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8')).replace(/^--.*$/gm, '');
  await DB.batch(sql.split(';').map(s => s.trim()).filter(Boolean).map(s => DB.prepare(s)));
  env = { DB, ENABLED: 'true', ENVIRONMENT: 'production', ...secrets };
});
beforeEach(async t => {
  await DB.batch(['runs', 'scores', 'rate_buckets'].map(table => DB.prepare(`DELETE FROM ${table}`)));
  now = Date.parse('2026-10-11T15:00:00Z'); ipCounter = 1;
  t.mock.method(Date, 'now', () => now);
});
after(async () => { if (mf) await mf.dispose(); });

test('Actual workerd runtime: health, preflight and signed start', async () => {
  const health = await mf.dispatchFetch('https://worker.invalid/api/health');
  assert.equal(health.status, 200); assert.equal((await health.json()).version, VERSION);
  const response = await mf.dispatchFetch('https://worker.invalid/api/run/start', { method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': '203.0.113.1', 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'daily', version: VERSION, playerId: player() }) });
  assert.equal(response.status, 200); const start = await response.json();
  assert.equal(start.seed, dailySeed(start.day)); assert.equal(start.expiresAt - start.startedAt, RULES.tokenTtlMs);
  assert.match(start.token, /^pf1\./); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const preflight = await request('/api/score', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await request('/api/score', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'DELETE' } })).status, 403);
});
test('Strict types, request size, CORS, methods, params and disabled config', async () => {
  assert.equal((await request('/api/run/start', { method: 'POST', body: { mode: 'normal', version: VERSION, playerId: player(), seed: 1 } })).status, 400);
  for (const id of [1, null, {}, 'short']) assert.equal((await request('/api/run/start', { method: 'POST', body: { mode: 'normal', version: VERSION, playerId: id } })).status, 400);
  assert.equal((await request('/api/run/start', { method: 'POST', body: {}, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await request('/api/run/start', { method: 'POST', body: { padding: 'x'.repeat(2200) } })).status, 413);
  assert.equal((await request('/api/run/start', { method: 'POST', body: {}, headers: { Origin: 'https://evil.invalid' } })).status, 403);
  assert.equal((await request('/api/run/start')).status, 405);
  assert.equal((await request('/api/leaderboard?mode=daily&mode=alltime')).status, 400);
  assert.equal((await request('/api/leaderboard?mode=alltime&token=bad')).status, 400);
  assert.equal((await request('/api/run/start', { method: 'POST', body: {}, targetEnv: { ...env, ENABLED: 'false' } })).status, 503);
});
test('Signature, expiry, player binding, score/time bounds and harmful aliases', async () => {
  const run = await fixture();
  const data = submission(run);
  assert.equal((await request('/api/score', { method: 'POST', body: { ...data, token: run.token.slice(0, -4) + 'AAAA' } })).status, 401);
  assert.equal((await request('/api/score', { method: 'POST', body: { ...data, playerId: player() } })).status, 403);
  for (const score of [-1, 1.5, '10', null, 1001]) assert.equal((await request('/api/score', { method: 'POST', body: { ...data, score } })).status, 400);
  for (const alias of ['<img>', 'a\u202Eb', 'a\u200Bb', 'a\nb', 'a\tb', 'a'.repeat(17), [], 42]) assert.equal((await request('/api/score', { method: 'POST', body: { ...data, alias } })).status, 400);
  assert.equal((await request('/api/score', { method: 'POST', body: { ...data, score: 500, activeMs: 1 } })).status, 422);
  assert.equal((await request('/api/score', { method: 'POST', body: { ...data, activeMs: 120000 } })).status, 422);
  const expired = await fixture(player(), 'normal', RULES.tokenTtlMs + 1);
  assert.equal((await request('/api/score', { method: 'POST', body: submission(expired) })).status, 410);
});
test('Atomic concurrent submission, identical retry and conflicting reuse', async () => {
  const run = await fixture(), data = submission(run);
  const responses = await Promise.all([request('/api/score', { method: 'POST', body: data }), request('/api/score', { method: 'POST', body: data })]);
  assert(responses.every(r => r.status === 200)); assert.deepEqual(responses[0].data, responses[1].data);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores').first()).n, 1);
  assert.equal((await request('/api/score', { method: 'POST', body: { ...data, score: 11 } })).status, 409);
  now += RULES.tokenTtlMs;
  assert.deepEqual((await request('/api/score', { method: 'POST', body: data })).data, responses[0].data, 'stored retry confirmation survives token expiry during retention');
  const other = await fixture();
  const competing = await Promise.all([request('/api/score', { method: 'POST', body: submission(other, 10, 'First') }), request('/api/score', { method: 'POST', body: submission(other, 11, 'Other') })]);
  assert.deepEqual(competing.map(r => r.status).sort(), [200, 409]);
});
test('Best values do not regress, ties remain early, normal/Daily separation and own marker', async () => {
  const id = player();
  for (const [score, alias] of [[25, 'Mu\u0308ller'], [10, 'Worse'], [25, 'Equal']]) {
    const run = await fixture(id); const answer = await request('/api/score', { method: 'POST', body: submission(run, score, alias) }); assert.equal(answer.status, 200); now += 1000;
  }
  let board = await request('/api/leaderboard?mode=alltime', { headers: { 'X-Player-ID': id } });
  assert.equal(board.data.entries.length, 1); assert.equal(board.data.entries[0].score, 25); assert.equal(board.data.entries[0].alias, 'Müller'); assert(board.data.entries[0].own);
  assert(!JSON.stringify(board.data).includes(id)); assert(!('player_hash' in board.data.entries[0]));
  const id2 = player(), normal = await fixture(id2);
  await request('/api/score', { method: 'POST', body: submission(normal, 25, 'Second') });
  board = await request('/api/leaderboard?mode=alltime'); assert.equal(board.data.entries[0].alias, 'Müller');
  const daily = await fixture(id, 'daily'); await request('/api/score', { method: 'POST', body: submission(daily, 10, 'Daily') });
  assert.equal((await request('/api/leaderboard?mode=daily')).data.entries[0].alias, 'Daily');
  const improved = await fixture(id); await request('/api/score', { method: 'POST', body: submission(improved, 50, 'Root') });
  assert.equal((await request('/api/leaderboard?mode=alltime')).data.entries[0].score, 50);
});
test('Online Daily preserves server start day across UTC midnight', async () => {
  now = Date.parse('2026-10-11T23:59:58Z');
  const id = player(), response = await request('/api/run/start', { method: 'POST', body: { mode: 'daily', version: VERSION, playerId: id } });
  now = Date.parse('2026-10-12T00:00:06Z');
  const saved = await request('/api/score', { method: 'POST', body: { token: response.data.token, playerId: id, alias: 'Midnight', score: 0, activeMs: 3000 } });
  assert.equal(saved.status, 200); assert.equal(saved.data.day, '2026-10-11');
  assert.equal((await request('/api/leaderboard?mode=daily')).data.entries.length, 0);
  assert.equal((await DB.prepare("SELECT day FROM scores WHERE mode='daily'").first()).day, '2026-10-11');
});
test('Per-network rate limits survive changing player IDs; no raw IP persisted', async () => {
  const ip = '203.0.113.12';
  for (let i = 0; i < 10; i++) assert.equal((await request('/api/run/start', { method: 'POST', ip, body: { mode: 'normal', version: VERSION, playerId: player() } })).status, 200);
  assert.equal((await request('/api/run/start', { method: 'POST', ip, body: { mode: 'normal', version: VERSION, playerId: player() } })).status, 429);
  const rows = await DB.prepare('SELECT * FROM rate_buckets').all(); assert(!JSON.stringify(rows).includes(ip));
});
test('Retention cleans expired runs, rate buckets and Daily days after 30 days', async () => {
  const expired = await fixture(player(), 'normal', RULES.tokenTtlMs + 172800001);
  const valid = await fixture();
  const old = await fixture(player(), 'daily');
  await request('/api/score', { method: 'POST', body: submission(old) });
  await DB.prepare("UPDATE scores SET day='2026-09-01' WHERE mode='daily'").run();
  await cleanup(env, now);
  assert.equal(await DB.prepare('SELECT id FROM runs WHERE id=?').bind(expired.runId).first(), null);
  assert(await DB.prepare('SELECT id FROM runs WHERE id=?').bind(valid.runId).first());
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE mode='daily'").first()).n, 0);
});
