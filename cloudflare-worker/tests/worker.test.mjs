import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import worker, { cleanup, retentionOverdue } from '../src/index.mjs';
import { VERSION, RULES, utcDay, dailySeed, scoreParts, maximumBonus, minimumActiveMs } from '../../game/rules.mjs';

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
  return `pf2.${payload}.${b64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('pf2.' + payload)))}`;
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
  await DB.prepare('UPDATE runs_v2 SET started_at=?,expires_at=?,day=?,seed=? WHERE id=?').bind(claims.startedAt, claims.expiresAt, claims.day, claims.seed, claims.runId).run();
  return { ...started.data, ...claims, token: await token(claims), playerId: id };
}
const submission = (run, gates = 10, alias = 'Tester', activeMs = 100000) => ({ token: run.token, playerId: run.playerId, alias, score: gates * 10, gates, fragments: 0, bonusPoints: 0, activeMs });
before(async () => {
  mf = new Miniflare({ modules: true, script: await readFile(new URL('../.test-build/index.js', import.meta.url), 'utf8'), compatibilityDate: '2026-06-11', d1Databases: { DB: 'packet-flight-isolated-test' }, bindings: { ENABLED: 'true', ENVIRONMENT: 'production', ...secrets } });
  DB = await mf.getD1Database('DB');
  const sql = (await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8') + await readFile(new URL('../migrations/0002_escape_pf2.sql', import.meta.url), 'utf8')).replace(/^--.*$/gm, '');
  await DB.batch(sql.split(';').map(s => s.trim()).filter(Boolean).map(s => DB.prepare(s)));
  env = { DB, ENABLED: 'true', ENVIRONMENT: 'production', ...secrets };
});
beforeEach(async t => {
  await DB.batch(['runs_v2', 'scores_v2', 'rate_buckets'].map(table => DB.prepare(`DELETE FROM ${table}`)));
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
  assert.match(start.token, /^pf2\./); assert.equal(response.headers.get('Cache-Control'), 'no-store');
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
  for (const score of [-1, 1.5, '10', null, 19981]) assert.equal((await request('/api/score', { method: 'POST', body: { ...data, score } })).status, 400);
  for (const score of [101, 19971, 19980]) assert.equal((await request('/api/score', { method: 'POST', body: { ...data, score } })).status, 422);
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
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v2').first()).n, 1);
  assert.equal((await request('/api/score', { method: 'POST', body: { ...data, score: 110, gates: 11 } })).status, 409);
  now += RULES.tokenTtlMs;
  assert.deepEqual((await request('/api/score', { method: 'POST', body: data })).data, responses[0].data, 'stored retry confirmation survives token expiry during retention');
  const other = await fixture();
  const competing = await Promise.all([request('/api/score', { method: 'POST', body: submission(other, 10, 'First') }), request('/api/score', { method: 'POST', body: submission(other, 11, 'Other') })]);
  assert.deepEqual(competing.map(r => r.status).sort(), [200, 409]);
});
test('Score components are server-calculated; maximum is bounded independently of active time', async () => {
  const run = await fixture();
  const data = { ...submission(run, 12), score: 150, fragments: 5, bonusPoints: 30 };
  for (const change of [{ score: 151 }, { fragments: 13 }, { bonusPoints: 31 }, { gates: '12' }, { fragments: -1 }, { bonusPoints: 32 }]) {
    assert.equal((await request('/api/score', { method: 'POST', body: { ...data, ...change } })).status, 422);
  }
  const saved = await request('/api/score', { method: 'POST', body: data });
  assert.equal(saved.status, 200); assert.equal(saved.data.score, 150);
  assert.equal(saved.data.ownEntry.rank, 'PACKET ROUTER', 'rank follows gates, not points');
  assert.equal(saved.data.ownEntry.fragments, 5); assert.equal(saved.data.ownEntry.bonusPoints, 30);
  assert.deepEqual((await request('/api/score', { method: 'POST', body: data })).data, saved.data);
  assert.equal((await request('/api/score', { method: 'POST', body: { ...data, fragments: 4, bonusPoints: 20, score: 140 } })).status, 409);

  const bonus = maximumBonus(1000);
  assert.equal(bonus, 9980); assert.equal(scoreParts(1000, 1000, bonus).score, 19980);
  const maxRun = await fixture(player(), 'normal', RULES.maxActiveMs + RULES.countdownMs + 1000);
  const maximum = { ...submission(maxRun, 1000, 'Maximum', RULES.maxActiveMs), fragments: 1000, bonusPoints: bonus, score: 19980 };
  assert.equal((await request('/api/score', { method: 'POST', body: { ...maximum, score: 19981 } })).status, 400);
  const answer = await request('/api/score', { method: 'POST', body: maximum });
  assert.equal(answer.status, 422);
  assert.match(answer.data.message, /Spielzeit/, 'valid maximum components must still satisfy the independent time bound');
  assert(minimumActiveMs(1000) > RULES.maxActiveMs, 'conservative score cap is not a promise of a reachable timed run');
});
test('D1 enforces score formula, integer types, version, and the inclusive 19980 bound', async () => {
  const insert = (score, gates, fragments, bonus) => DB.prepare('INSERT INTO scores_v2(entry_id,player_hash,version,mode,day,alias,score,gates,fragments,bonus_points,achieved_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(player(), player(), VERSION, 'normal', '', 'Bounds', score, gates, fragments, bonus, now).run();
  await insert(19980, 1000, 1000, 9980);
  assert.equal((await DB.prepare('SELECT score FROM scores_v2').first()).score, 19980);
  for (const values of [[19981,1000,1000,9981], [19971,1000,1000,9980], [150.5,12,5,30.5], [150,12,13,30], [150,12,5,31], [150,12,'bad',30], [150,null,5,30]]) {
    await assert.rejects(insert(...values), /constraint|NOT NULL/i);
  }
  await assert.rejects(DB.prepare("UPDATE scores_v2 SET version='pf-1'").run(), /constraint/i);
  const run = await fixture();
  await assert.rejects(DB.prepare('UPDATE runs_v2 SET score=150,gates=12,fragments=5,bonus_points=31 WHERE id=?').bind(run.runId).run(), /constraint/i);
});
test('Additive migration preserves pf-1 rows; health detects missing pf-2 schema', async () => {
  const isolated = new Miniflare({ modules: true, script: await readFile(new URL('../.test-build/index.js', import.meta.url), 'utf8'), compatibilityDate: '2026-06-11', d1Databases: { DB: 'pf2-migration-preservation' } });
  try {
    const db = await isolated.getD1Database('DB');
    const apply = async name => {
      const sql = (await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8')).replace(/^--.*$/gm, '');
      await db.batch(sql.split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
    };
    await apply('0001_initial.sql');
    await db.prepare("INSERT INTO scores VALUES('legacy-entry','legacy-player','pf-1','normal','','Legacy',25,1)").run();
    await db.prepare("INSERT INTO runs(id,player_hash,version,mode,day,seed,started_at,expires_at) VALUES('legacy-run','legacy-player','pf-1','normal','',1,0,1)").run();
    const legacy = await db.batch([db.prepare('SELECT * FROM scores'), db.prepare('SELECT * FROM runs')]);
    const targetEnv = { ...env, DB: db };
    let health = await request('/api/health', { targetEnv });
    assert.equal(health.status, 200); assert.equal(health.data.configured, true); assert.equal(health.data.schemaReady, false);
    assert.equal((await request('/api/run/start', { targetEnv, method: 'POST', body: { mode: 'normal', version: VERSION, playerId: player() } })).status, 503);
    await apply('0002_escape_pf2.sql'); await apply('0002_escape_pf2.sql');
    const after = await db.batch([db.prepare('SELECT * FROM scores'), db.prepare('SELECT * FROM runs')]);
    assert.deepEqual(after.map(r => r.results), legacy.map(r => r.results));
    health = await request('/api/health', { targetEnv }); assert.equal(health.data.schemaReady, true);
    await cleanup(targetEnv, now);
    assert.deepEqual((await db.prepare('SELECT * FROM scores').all()).results, legacy[0].results);
    assert.deepEqual((await db.prepare('SELECT * FROM runs').all()).results, legacy[1].results);
  } finally { await isolated.dispose(); }
});
test('Retention keeps current Daily and recent Normal; removes one-year Normal and expired rate buckets', async () => {
  const put = async (id, mode, day, achieved) => DB.prepare('INSERT INTO scores_v2 VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, id, VERSION, mode, day, 'Retention', 10, 1, 0, 0, achieved).run();
  await put('daily-keep', 'daily', utcDay(now - 29 * 86400000), now);
  await put('daily-drop', 'daily', utcDay(now - 30 * 86400000), now);
  await put('normal-keep', 'normal', '', now - 365 * 86400000);
  await put('normal-drop', 'normal', '', now - 365 * 86400000 - 1);
  await DB.prepare("INSERT INTO rate_buckets VALUES('expired',1,?),('current',1,?)").bind(now-1,now+1).run();
  await cleanup(env, now);
  assert.deepEqual((await DB.prepare('SELECT entry_id FROM scores_v2 ORDER BY entry_id').all()).results.map(r => r.entry_id), ['daily-keep','normal-keep']);
  assert.deepEqual((await DB.prepare('SELECT bucket FROM rate_buckets').all()).results, [{ bucket: 'current' }]);
});
test('Best values do not regress, ties remain early, normal/Daily separation and own marker', async () => {
  const id = player();
  for (const [score, alias] of [[25, 'Mu\u0308ller'], [10, 'Worse'], [25, 'Equal']]) {
    const run = await fixture(id); const answer = await request('/api/score', { method: 'POST', body: submission(run, score, alias) }); assert.equal(answer.status, 200); now += 1000;
  }
  let board = await request('/api/leaderboard?mode=alltime', { headers: { 'X-Player-ID': id } });
  assert.equal(board.data.entries.length, 1); assert.equal(board.data.entries[0].score, 250); assert.equal(board.data.entries[0].alias, 'Müller'); assert(board.data.entries[0].own);
  assert(!JSON.stringify(board.data).includes(id)); assert(!('player_hash' in board.data.entries[0]));
  const id2 = player(), normal = await fixture(id2);
  await request('/api/score', { method: 'POST', body: submission(normal, 25, 'Second') });
  board = await request('/api/leaderboard?mode=alltime'); assert.equal(board.data.entries[0].alias, 'Müller');
  const daily = await fixture(id, 'daily'); await request('/api/score', { method: 'POST', body: submission(daily, 10, 'Daily') });
  assert.equal((await request('/api/leaderboard?mode=daily')).data.entries[0].alias, 'Daily');
  const improved = await fixture(id); await request('/api/score', { method: 'POST', body: submission(improved, 50, 'Root') });
  assert.equal((await request('/api/leaderboard?mode=alltime')).data.entries[0].score, 500);
});
test('Online Daily preserves server start day across UTC midnight', async () => {
  now = Date.parse('2026-10-11T23:59:58Z');
  const id = player(), response = await request('/api/run/start', { method: 'POST', body: { mode: 'daily', version: VERSION, playerId: id } });
  now = Date.parse('2026-10-12T00:00:06Z');
  const saved = await request('/api/score', { method: 'POST', body: { token: response.data.token, playerId: id, alias: 'Midnight', score: 0, gates: 0, fragments: 0, bonusPoints: 0, activeMs: 3000 } });
  assert.equal(saved.status, 200); assert.equal(saved.data.day, '2026-10-11');
  assert.equal(saved.data.ownEntry.position, 1); assert.equal(saved.data.ownEntry.achievedAt, now);
  assert.equal((await request('/api/leaderboard?mode=daily')).data.entries.length, 0);
  assert.equal((await DB.prepare("SELECT day FROM scores_v2 WHERE mode='daily'").first()).day, '2026-10-11');
});
test('Per-network rate limits survive changing player IDs; no raw IP persisted', async () => {
  const ip = '203.0.113.12';
  for (let i = 0; i < 10; i++) assert.equal((await request('/api/run/start', { method: 'POST', ip, body: { mode: 'normal', version: VERSION, playerId: player() } })).status, 200);
  assert.equal((await request('/api/run/start', { method: 'POST', ip, body: { mode: 'normal', version: VERSION, playerId: player() } })).status, 429);
  const rows = await DB.prepare('SELECT * FROM rate_buckets').all(); assert(!JSON.stringify(rows).includes(ip));
});
test('Retention cleans expired runs_v2, rate buckets and Daily days after 30 days', async () => {
  const expired = await fixture(player(), 'normal', RULES.tokenTtlMs + 172800001);
  const valid = await fixture();
  const old = await fixture(player(), 'daily');
  await request('/api/score', { method: 'POST', body: submission(old) });
  await DB.prepare("UPDATE scores_v2 SET day='2026-09-01' WHERE mode='daily'").run();
  await cleanup(env, now);
  assert.equal(await DB.prepare('SELECT id FROM runs_v2 WHERE id=?').bind(expired.runId).first(), null);
  assert(await DB.prepare('SELECT id FROM runs_v2 WHERE id=?').bind(valid.runId).first());
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM scores_v2 WHERE mode='daily'").first()).n, 0);
});

test('Lost confirmation: immutable retry after expiry, expired fresh write forbidden', async () => {
  const run = await fixture(), data = submission(run, 10, '  Änne  ');
  const saved = await request('/api/score', { method: 'POST', body: data });
  assert.equal(saved.status, 200); assert.equal(saved.data.ownEntry.alias, 'Änne');
  const unused = await fixture();
  now = Math.max(run.expiresAt, unused.expiresAt) + 1;
  const retry = await request('/api/score', { method: 'POST', body: data });
  assert.equal(retry.status, 200); assert.deepEqual(retry.data, saved.data);
  for (const change of [{ alias: 'Änne' }, { score: 110, gates: 11 }, { activeMs: 99999 }]) {
    assert.equal((await request('/api/score', { method: 'POST', body: { ...data, ...change } })).status, 409);
  }
  assert.equal((await request('/api/score', { method: 'POST', body: submission(unused) })).status, 410);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v2').first()).n, 1);
  assert.equal((await DB.prepare('SELECT consumed_at FROM runs_v2 WHERE id=?').bind(unused.runId).first()).consumed_at, null);
});
test('Rank, server timestamp and own placement outside Top 20; fully deterministic ties', async () => {
  const achieved = now - 1000;
  await DB.batch(Array.from({ length: 21 }, (_, i) => DB.prepare('INSERT INTO scores_v2(entry_id,player_hash,version,mode,day,alias,score,gates,fragments,bonus_points,achieved_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(`tie-${String(i).padStart(2, '0')}`, `private-player-${i}`, VERSION, 'normal', '', `Ahead_${i}`, 250, 25, 0, 0, achieved)).reverse());
  const id = player(), run = await fixture(id), data = submission(run);
  const saved = await request('/api/score', { method: 'POST', body: data });
  assert.equal(saved.status, 200); assert.equal(saved.data.ownEntry.position, 22);
  assert.equal(saved.data.ownEntry.rank, 'PACKET ROUTER'); assert.equal(saved.data.ownEntry.achievedAt, now);
  let board = (await request('/api/leaderboard?mode=alltime', { headers: { 'X-Player-ID': id } })).data;
  assert.equal(board.entries.length, 20); assert.deepEqual(board.entries.map(e => e.alias), Array.from({ length: 20 }, (_, i) => `Ahead_${i}`));
  assert(board.entries.every((e, i) => e.rank === 'SYSADMIN' && e.achievedAt === achieved && e.position === i + 1 && !e.own));
  assert.equal(board.ownEntry.position, 22); assert.deepEqual(board.ownEntry, saved.data.ownEntry);
  assert(!JSON.stringify(board).includes('private-player')); assert(!JSON.stringify(board).includes(id));
  for (const entry of [...board.entries, board.ownEntry]) assert.deepEqual(Object.keys(entry).sort(), ['position','alias','score','gates','fragments','bonusPoints','rank','achievedAt','own'].sort());
  assert.equal((await request('/api/leaderboard?mode=alltime')).data.ownEntry, null);
  assert.equal((await request('/api/leaderboard?mode=daily', { headers: { 'X-Player-ID': id } })).data.ownEntry, null);
  now += 1000;
  const improved = await fixture(id);
  const better = await request('/api/score', { method: 'POST', body: submission(improved, 50, 'Root') });
  assert.equal(better.data.ownEntry.position, 1); assert.equal(better.data.ownEntry.rank, 'ROOT');
  const bestTime = better.data.ownEntry.achievedAt;
  now += 1000;
  const worse = await fixture(id);
  const lower = await request('/api/score', { method: 'POST', body: submission(worse, 0, 'Lower') });
  assert.equal(lower.data.score, 0); assert.equal(lower.data.ownEntry.score, 500); assert.equal(lower.data.ownEntry.achievedAt, bestTime);
  board = (await request('/api/leaderboard?mode=alltime', { headers: { 'X-Player-ID': id } })).data;
  assert.deepEqual(board.entries[0], board.ownEntry);
  now = run.expiresAt + 1;
  assert.deepEqual((await request('/api/score', { method: 'POST', body: data })).data, saved.data, 'retry keeps its original position snapshot after later best-value changes');
});

test('Read-only retention monitor detects delayed cleanup and clears only after actual cleanup', async () => {
  assert.equal(await retentionOverdue(env, now), false);
  await DB.prepare("INSERT INTO scores_v2 VALUES('overdue','overdue','pf-2','normal','','Retention',10,1,0,0,?)").bind(now - 366 * 86400000 - 1).run();
  const first = await request('/api/health');
  assert.equal(first.data.retentionOverdue, true);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v2').first()).n, 1, 'health never deletes rows');
  await cleanup({ ...env, ENABLED: 'false' }, now);
  assert.equal(await retentionOverdue(env, now), true, 'disabled worker pauses cleanup');
  await cleanup(env, now);
  assert.equal((await request('/api/health')).data.retentionOverdue, false);
  for (const [mode, day, achieved] of [
    ['daily', utcDay(now - 31 * 86400000), now],
    ['normal', '', now - 366 * 86400000 - 1],
  ]) {
    await DB.prepare("INSERT INTO scores_v2 VALUES(?,?,?,?,?,'Retention',10,1,0,0,?)").bind(mode, mode, VERSION, mode, day, achieved).run();
    assert.equal(await retentionOverdue(env, now), true); await cleanup(env, now);
  }
  await DB.prepare("INSERT INTO rate_buckets VALUES('delayed',1,?)").bind(now - 86400001).run();
  assert.equal(await retentionOverdue(env, now), true); await cleanup(env, now);
  assert.equal(await retentionOverdue(env, now), false);
});

test('Concurrent requests increment minute, day and global rate counters once and keep exact rejection threshold', async () => {
  const ip = '203.0.113.123';
  const results = await Promise.all(Array.from({ length: 10 }, () => request('/api/run/start', {
    method: 'POST', ip, body: { mode: 'normal', version: VERSION, playerId: player() },
  })));
  assert(results.every(result => result.status === 200));
  assert.equal((await request('/api/run/start', { method: 'POST', ip, body: { mode: 'normal', version: VERSION, playerId: player() } })).status, 429);
  const counters = (await DB.prepare('SELECT bucket,hits FROM rate_buckets').all()).results;
  assert.equal(counters.length, 3);
  assert(counters.every(row => row.hits === 11));
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM runs_v2').first()).n, 10, 'rejected request cannot create a run');
  assert.equal((await request('/api/leaderboard?mode=alltime', { ip })).status, 200);
  const after = (await DB.prepare('SELECT bucket,hits FROM rate_buckets').all()).results;
  assert.equal(after.length, 5);
  assert.equal(after.find(row => row.bucket.startsWith('global:')).hits, 12);
  assert(after.filter(row => row.bucket.startsWith('start:')).every(row => row.hits === 11));
  assert(after.filter(row => row.bucket.startsWith('board:')).every(row => row.hits === 1));
});

test('Health still rejects missing required columns in empty tables after probe consolidation', async () => {
  const isolated = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("isolated")}}', compatibilityDate: '2026-06-11', d1Databases: { DB: 'health-column-isolated' } });
  try {
    const db = await isolated.getD1Database('DB');
    await db.batch([
      db.prepare('CREATE TABLE scores_v2(score INTEGER,gates INTEGER,fragments INTEGER,mode TEXT,day TEXT,achieved_at INTEGER)'),
      db.prepare('CREATE TABLE runs_v2(submission_hash TEXT,confirmation TEXT,expires_at INTEGER)'),
      db.prepare('CREATE TABLE rate_buckets(hits INTEGER,expires_at INTEGER)'),
    ]);
    const targetEnv = { ...env, DB: db };
    let health = await request('/api/health', { targetEnv });
    assert.equal(health.data.schemaReady, false); assert.equal(health.data.retentionOverdue, null);
    await db.prepare('ALTER TABLE scores_v2 ADD COLUMN bonus_points INTEGER').run();
    health = await request('/api/health', { targetEnv });
    assert.equal(health.data.schemaReady, true); assert.equal(health.data.retentionOverdue, false);
  } finally { await isolated.dispose(); }
});
