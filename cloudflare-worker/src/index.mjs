import { VERSION, RULES, dailySeed, utcDay, rank, validateAlias, validPlayerId, minimumActiveMs, scoreParts } from '../../game/rules.mjs';

const encoder = new TextEncoder();
const MAX_BODY = 2048;
const LIMITS = { start: [10, 200], score: [8, 200], board: [40, 1000] };
class APIError extends Error { constructor(status, message) { super(message); this.status = status; } }
function fail(status, message) { throw new APIError(status, message); }
function keys(obj, allowed) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || Object.keys(obj).some(key => !allowed.includes(key)) || allowed.some(key => !(key in obj))) fail(400, 'Ungültige Request-Felder.');
}
function integer(value, min, max) { return Number.isSafeInteger(value) && value >= min && value <= max; }
function b64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]+$/.test(text)) fail(401, 'Ungültiger Run-Token.');
  try { return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)), c => c.charCodeAt(0)); }
  catch { fail(401, 'Ungültiger Run-Token.'); }
}
const keyCache = new Map();
async function key(secret) {
  if (!keyCache.has(secret)) {
    if (keyCache.size >= 3) keyCache.clear();
    keyCache.set(secret, crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']));
  }
  return keyCache.get(secret);
}
async function hmac(secret, value) { return b64(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(value))); }
async function digest(value) { return b64(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
function secretsReady(env) {
  const values = [env.SIGNING_KEY, env.PSEUDONYM_KEY, env.RATE_KEY];
  return values.every(v => typeof v === 'string' && v.length >= 32) && new Set(values).size === 3;
}
async function sign(env, claims) {
  const payload = b64(encoder.encode(JSON.stringify(claims)));
  return `pf2.${payload}.${await hmac(env.SIGNING_KEY, 'pf2.' + payload)}`;
}
async function verify(env, token) {
  if (typeof token !== 'string' || token.length > 1024) fail(401, 'Ungültiger Run-Token.');
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'pf2') fail(401, 'Ungültiger Run-Token.');
  const signature = unb64(parts[2]);
  if (signature.length !== 32 || !await crypto.subtle.verify('HMAC', await key(env.SIGNING_KEY), signature, encoder.encode('pf2.' + parts[1]))) fail(401, 'Run-Signatur ungültig.');
  let claims;
  try { claims = JSON.parse(new TextDecoder().decode(unb64(parts[1]))); } catch { fail(401, 'Ungültiger Run-Token.'); }
  keys(claims, ['runId', 'playerHash', 'version', 'mode', 'day', 'seed', 'startedAt', 'expiresAt']);
  if (!validPlayerId(claims.runId) || typeof claims.playerHash !== 'string' || claims.playerHash.length !== 43 || claims.version !== VERSION || !['normal', 'daily'].includes(claims.mode) || !integer(claims.seed, 1, 4294967295) || !integer(claims.startedAt, 0, Number.MAX_SAFE_INTEGER) || claims.expiresAt !== claims.startedAt + RULES.tokenTtlMs || claims.day !== (claims.mode === 'daily' ? utcDay(claims.startedAt) : '') || (claims.mode === 'daily' && claims.seed !== dailySeed(claims.day))) fail(401, 'Ungültige Run-Daten.');
  return claims;
}
async function body(request) {
  if ((request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() !== 'application/json') fail(415, 'Content-Type application/json erforderlich.');
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) fail(413, 'Request zu groß.');
  if (!request.body) fail(400, 'Request-Body fehlt.');
  const reader = request.body.getReader(); let size = 0; const chunks = [];
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength; if (size > MAX_BODY) { await reader.cancel(); fail(413, 'Request zu groß.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail(400, 'Ungültiges JSON.'); }
}
function allowedOrigin(origin, env) {
  if (origin === 'https://tr1stan.de') return true;
  return env.ENVIRONMENT === 'development' && (env.DEV_ORIGINS || '').split(',').includes(origin) && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
function response(data, status, origin, extra = {}) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin', ...extra };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}
async function rateLimit(request, env, scope, now) {
  const rawIP = request.headers.get('CF-Connecting-IP');
  if (!rawIP && env.ENVIRONMENT !== 'development') fail(503, 'Netzwerkidentität nicht verfügbar.');
  const day = utcDay(now), minute = Math.floor(now / 60000);
  // Daily scoped keyed digests, no raw IPs or persistent cross-day IP identity in D1.
  const ipHash = await hmac(env.RATE_KEY, `${day}|${rawIP || 'isolated-local-test'}`);
  const buckets = [[`${scope}:m:${minute}:${ipHash}`, now + 120000, LIMITS[scope][0]], [`${scope}:d:${day}:${ipHash}`, now + 172800000, LIMITS[scope][1]], [`global:d:${day}`, now + 172800000, 20000]];
  const result = await env.DB.batch(buckets.map(([bucket, expiry]) => env.DB.prepare('INSERT INTO rate_buckets(bucket,hits,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits').bind(bucket, expiry)));
  if (result.some((r, i) => r.results[0].hits > buckets[i][2])) fail(429, 'Zu viele Anfragen. Bitte später erneut versuchen.');
}
async function start(request, env, now) {
  const data = await body(request); keys(data, ['mode', 'version', 'playerId']);
  if (data.version !== VERSION) fail(409, 'Spielversion veraltet. Bitte game.html online neu laden.');
  if (!['normal', 'daily'].includes(data.mode) || !validPlayerId(data.playerId)) fail(400, 'Modus, Version oder Spielerkennung ungültig.');
  const playerHash = await hmac(env.PSEUDONYM_KEY, data.playerId.toLowerCase());
  const day = data.mode === 'daily' ? utcDay(now) : '';
  const claims = { runId: crypto.randomUUID(), playerHash, version: VERSION, mode: data.mode, day, seed: data.mode === 'daily' ? dailySeed(day) : crypto.getRandomValues(new Uint32Array(1))[0] || 1, startedAt: now, expiresAt: now + RULES.tokenTtlMs };
  const token = await sign(env, claims);
  await env.DB.prepare('INSERT INTO runs_v2(id,player_hash,version,mode,day,seed,started_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').bind(claims.runId, playerHash, VERSION, data.mode, day, claims.seed, now, claims.expiresAt).run();
  return { token, runId: claims.runId, version: VERSION, mode: data.mode, day, seed: claims.seed, startedAt: now, expiresAt: claims.expiresAt };
}
// Same strict ordering for Top 20 and the requesting browser's position.
const OWN_ENTRY = `SELECT s.alias,s.score,s.achieved_at,s.gates,s.fragments,s.bonus_points,
  1+(SELECT COUNT(*) FROM scores_v2 ahead WHERE ahead.version=s.version AND ahead.mode=s.mode AND ahead.day=s.day
    AND (ahead.score>s.score OR (ahead.score=s.score AND (ahead.achieved_at<s.achieved_at
      OR (ahead.achieved_at=s.achieved_at AND ahead.entry_id<s.entry_id))))) AS position
  FROM scores_v2 s WHERE s.player_hash=? AND s.version=? AND s.mode=? AND s.day=?`;
function publicEntry(row, position, own) {
  return { position, alias: row.alias, score: row.score, rank: rank(row.gates), gates: row.gates, fragments: row.fragments, bonusPoints: row.bonus_points, achievedAt: row.achieved_at, own };
}
function receipt(text) {
  const data = JSON.parse(text);
  if (data.ownEntry) data.ownEntry = { ...data.ownEntry, rank: rank(data.ownEntry.gates), own: true };
  return data;
}
async function submit(request, env, now) {
  const data = await body(request);
  if (typeof data?.token === 'string' && data.token.startsWith('pf1.')) fail(409, 'pf-1 ist archiviert. Bitte die neue Spielversion laden.');
  keys(data, ['token', 'playerId', 'alias', 'score', 'gates', 'fragments', 'bonusPoints', 'activeMs']);
  if (!validPlayerId(data.playerId) || !integer(data.score, 0, RULES.maxScore) || !integer(data.activeMs, 0, RULES.maxActiveMs)) fail(400, 'Score, aktive Zeit oder Spielerkennung ungültig.');
  const parts = scoreParts(data.gates, data.fragments, data.bonusPoints);
  if (!parts.ok || data.score !== parts.score) fail(422, 'Gate-Zahl, Fragmente, Combo-Bonus und Gesamtpunkte passen nicht zusammen.');
  const validation = validateAlias(data.alias); if (!validation.ok) fail(400, validation.error);
  const claims = await verify(env, data.token);
  const playerHash = await hmac(env.PSEUDONYM_KEY, data.playerId.toLowerCase());
  if (claims.playerHash !== playerHash) fail(403, 'Run gehört nicht zu dieser Spielerkennung.');
  const stored = await env.DB.prepare('SELECT * FROM runs_v2 WHERE id=? AND player_hash=? AND version=? AND mode=? AND day=? AND started_at=? AND expires_at=? AND seed=?').bind(claims.runId, playerHash, VERSION, claims.mode, claims.day, claims.startedAt, claims.expiresAt, claims.seed).first();
  if (!stored) fail(410, 'Run nicht verfügbar.');
  const submissionHash = await digest(JSON.stringify([data.token, data.playerId, data.alias, data.score, data.gates, data.fragments, data.bonusPoints, data.activeMs]));
  if (stored.consumed_at !== null) {
    if (stored.submission_hash !== submissionHash) fail(409, 'Run bereits anders eingereicht.');
    return receipt(stored.confirmation);
  }
  if (now > claims.expiresAt) fail(410, 'Run abgelaufen.');
  // activeMs is only a client claim, never proof of active play. Pauses are not
  // subtracted from wall time as if the server could independently verify them.
  if (data.activeMs + 50 < minimumActiveMs(data.gates) || data.activeMs > now - claims.startedAt - RULES.countdownMs + 500 || now < claims.startedAt + RULES.countdownMs - 500) fail(422, 'Score und Spielzeit passen nicht zu den Spielregeln.');
  const confirmation = JSON.stringify({ accepted: true, receipt: claims.runId, score: parts.score, gates: data.gates, fragments: data.fragments, bonusPoints: data.bonusPoints, mode: claims.mode, day: claims.day, version: VERSION, positionAsOf: now });
  // D1 batch is one transaction. The conditional write wins once; the INSERT
  // selects only that stored submission. A competing different body cannot upsert.
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE runs_v2 SET consumed_at=?,submission_hash=?,alias=?,score=?,gates=?,fragments=?,bonus_points=?,confirmation=? WHERE id=? AND consumed_at IS NULL AND expires_at>=?').bind(now, submissionHash, validation.alias, parts.score, data.gates, data.fragments, data.bonusPoints, confirmation, claims.runId, now),
    env.DB.prepare(`INSERT INTO scores_v2(entry_id,player_hash,version,mode,day,alias,score,gates,fragments,bonus_points,achieved_at)
      SELECT id,player_hash,version,mode,day,alias,score,gates,fragments,bonus_points,consumed_at FROM runs_v2 WHERE id=? AND submission_hash=?
      ON CONFLICT(player_hash,version,mode,day) DO UPDATE SET alias=excluded.alias,score=excluded.score,gates=excluded.gates,fragments=excluded.fragments,bonus_points=excluded.bonus_points,achieved_at=excluded.achieved_at WHERE excluded.score>scores_v2.score`).bind(claims.runId, submissionHash),
    // Save the best-value placement in the same transaction, including outside
    // Top 20. Do not recalculate an already stored receipt on an identical retry.
    env.DB.prepare(`UPDATE runs_v2 SET confirmation=json_set(confirmation,'$.ownEntry',json((
      SELECT json_object('position',position,'alias',alias,'score',score,'achievedAt',achieved_at,'gates',gates,'fragments',fragments,'bonusPoints',bonus_points)
      FROM (${OWN_ENTRY})
    ))) WHERE id=? AND submission_hash=? AND json_type(confirmation,'$.ownEntry') IS NULL`)
      .bind(playerHash, VERSION, claims.mode, claims.day, claims.runId, submissionHash),
    env.DB.prepare('SELECT submission_hash,confirmation FROM runs_v2 WHERE id=?').bind(claims.runId),
  ]);
  const consumed = results[3].results[0];
  if (consumed.submission_hash !== submissionHash) fail(409, 'Run bereits anders eingereicht.');
  return receipt(consumed.confirmation);
}
async function leaderboard(url, request, env, now) {
  if ([...url.searchParams.keys()].some(key => key !== 'mode') || url.searchParams.getAll('mode').length !== 1 || !['daily', 'alltime'].includes(url.searchParams.get('mode'))) fail(400, 'Ranglistenbereich ungültig.');
  const mode = url.searchParams.get('mode'), day = mode === 'daily' ? utcDay(now) : '';
  const playerId = request.headers.get('X-Player-ID');
  if (playerId && !validPlayerId(playerId)) fail(400, 'Spielerkennung ungültig.');
  const ownHash = playerId ? await hmac(env.PSEUDONYM_KEY, playerId.toLowerCase()) : null;
  const scope = mode === 'daily' ? 'daily' : 'normal';
  const queries = [env.DB.prepare('SELECT alias,score,gates,fragments,bonus_points,achieved_at,player_hash FROM scores_v2 WHERE version=? AND mode=? AND day=? ORDER BY score DESC,achieved_at ASC,entry_id ASC LIMIT 20').bind(VERSION, scope, day)];
  if (ownHash) queries.push(env.DB.prepare(OWN_ENTRY).bind(ownHash, VERSION, scope, day));
  const results = await env.DB.batch(queries);
  const own = results[1]?.results[0];
  return { version: VERSION, mode, day,
    entries: results[0].results.map((row, i) => publicEntry(row, i + 1, row.player_hash === ownHash)),
    ownEntry: own ? publicEntry(own, own.position, true) : null };
}
export async function cleanup(env, now = Date.now()) {
  if (!env.DB || env.ENABLED !== 'true') return;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM runs_v2 WHERE expires_at<?').bind(now - 172800000),
    env.DB.prepare("DELETE FROM scores_v2 WHERE mode='daily' AND day<?").bind(utcDay(now - 29 * 86400000)),
    env.DB.prepare("DELETE FROM scores_v2 WHERE mode='normal' AND achieved_at<?").bind(now - 365 * 86400000),
    env.DB.prepare('DELETE FROM rate_buckets WHERE expires_at<?').bind(now),
  ]);
}
// Only boolean retention state leaves D1. A grace period allows the daily cron.
export async function retentionOverdue(env, now = Date.now()) {
  const grace = 86400000;
  const results = await env.DB.batch([
    env.DB.prepare('SELECT 1 FROM runs_v2 WHERE expires_at<? LIMIT 1').bind(now - 172800000 - grace),
    env.DB.prepare("SELECT 1 FROM scores_v2 WHERE mode='daily' AND day<? LIMIT 1").bind(utcDay(now - 30 * 86400000)),
    env.DB.prepare("SELECT 1 FROM scores_v2 WHERE mode='normal' AND achieved_at<? LIMIT 1").bind(now - 366 * 86400000),
    env.DB.prepare('SELECT 1 FROM rate_buckets WHERE expires_at<? LIMIT 1').bind(now - grace),
  ]);
  return results.some(result => result.results.length > 0);
}
export default {
  async fetch(request, env) {
    let cors = null;
    try {
      const url = new URL(request.url), origin = request.headers.get('Origin');
      if (origin) { if (!allowedOrigin(origin, env)) fail(403, 'Origin nicht freigegeben.'); cors = origin; }
      const routes = { '/api/run/start': 'POST', '/api/score': 'POST', '/api/leaderboard': 'GET', '/api/health': 'GET' };
      const method = routes[url.pathname]; if (!method) fail(404, 'Endpoint nicht gefunden.');
      if (url.pathname !== '/api/leaderboard' && url.search) fail(400, 'Keine URL-Parameter erlaubt.');
      if (request.method === 'OPTIONS') {
        if (!cors || request.headers.get('Access-Control-Request-Method') !== method || (request.headers.get('Access-Control-Request-Headers') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(h => !['content-type', 'x-player-id'].includes(h))) fail(403, 'Preflight nicht freigegeben.');
        return response(null, 204, cors, { 'Access-Control-Allow-Methods': method, 'Access-Control-Allow-Headers': 'Content-Type, X-Player-ID', 'Access-Control-Max-Age': '600' });
      }
      if (request.method !== method) return response({ message: 'Methode nicht erlaubt.' }, 405, cors, { Allow: `${method}, OPTIONS` });
      if (url.pathname === '/api/health') {
        let schemaReady = false;
        if (env.DB) try {
          await env.DB.batch([env.DB.prepare('SELECT score,gates,fragments,bonus_points FROM scores_v2 LIMIT 1'), env.DB.prepare('SELECT submission_hash,confirmation FROM runs_v2 LIMIT 1'), env.DB.prepare('SELECT hits FROM rate_buckets LIMIT 1')]); schemaReady = true;
        } catch {}
        const overdue = schemaReady ? await retentionOverdue(env) : null;
        return response({ ok: true, enabled: env.ENABLED === 'true', configured: !!env.DB && secretsReady(env), schemaReady, retentionOverdue: overdue, version: VERSION }, 200, cors);
      }
      if (env.ENABLED !== 'true' || !env.DB || !secretsReady(env)) fail(503, 'Leaderboard noch nicht aktiviert.');
      if (method === 'POST' && !cors) fail(403, 'Origin erforderlich.');
      const now = Date.now();
      await rateLimit(request, env, url.pathname === '/api/run/start' ? 'start' : url.pathname === '/api/score' ? 'score' : 'board', now);
      const data = url.pathname === '/api/run/start' ? await start(request, env, now) : url.pathname === '/api/score' ? await submit(request, env, now) : await leaderboard(url, request, env, now);
      return response(data, 200, cors);
    } catch (error) {
      const status = error instanceof APIError ? error.status : 503;
      return response({ message: status === 503 ? 'Backend nicht verfügbar oder noch nicht aktiviert.' : error.message }, status, cors, status === 429 ? { 'Retry-After': '60' } : {});
    }
  },
  async scheduled(controller, env, ctx) { ctx.waitUntil(cleanup(env)); },
};
