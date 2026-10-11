import { VERSION, RULES, dailySeed, utcDay, rank, validateAlias, validPlayerId, minimumActiveMs } from '../../game/rules.mjs';

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
async function key(secret) { return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function hmac(secret, value) { return b64(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(value))); }
async function digest(value) { return b64(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
function secretsReady(env) {
  const values = [env.SIGNING_KEY, env.PSEUDONYM_KEY, env.RATE_KEY];
  return values.every(v => typeof v === 'string' && v.length >= 32) && new Set(values).size === 3;
}
async function sign(env, claims) {
  const payload = b64(encoder.encode(JSON.stringify(claims)));
  return `pf1.${payload}.${await hmac(env.SIGNING_KEY, 'pf1.' + payload)}`;
}
async function verify(env, token) {
  if (typeof token !== 'string' || token.length > 1024) fail(401, 'Ungültiger Run-Token.');
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'pf1') fail(401, 'Ungültiger Run-Token.');
  const signature = unb64(parts[2]);
  if (signature.length !== 32 || !await crypto.subtle.verify('HMAC', await key(env.SIGNING_KEY), signature, encoder.encode('pf1.' + parts[1]))) fail(401, 'Run-Signatur ungültig.');
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
  if (!['normal', 'daily'].includes(data.mode) || data.version !== VERSION || !validPlayerId(data.playerId)) fail(400, 'Modus, Version oder Spielerkennung ungültig.');
  const playerHash = await hmac(env.PSEUDONYM_KEY, data.playerId.toLowerCase());
  const day = data.mode === 'daily' ? utcDay(now) : '';
  const claims = { runId: crypto.randomUUID(), playerHash, version: VERSION, mode: data.mode, day, seed: data.mode === 'daily' ? dailySeed(day) : crypto.getRandomValues(new Uint32Array(1))[0] || 1, startedAt: now, expiresAt: now + RULES.tokenTtlMs };
  const token = await sign(env, claims);
  await env.DB.prepare('INSERT INTO runs(id,player_hash,version,mode,day,seed,started_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').bind(claims.runId, playerHash, VERSION, data.mode, day, claims.seed, now, claims.expiresAt).run();
  return { token, runId: claims.runId, version: VERSION, mode: data.mode, day, seed: claims.seed, startedAt: now, expiresAt: claims.expiresAt };
}
// Same strict ordering for Top 20 and the requesting browser's position.
const OWN_ENTRY = `SELECT s.alias,s.score,s.achieved_at,
  1+(SELECT COUNT(*) FROM scores ahead WHERE ahead.version=s.version AND ahead.mode=s.mode AND ahead.day=s.day
    AND (ahead.score>s.score OR (ahead.score=s.score AND (ahead.achieved_at<s.achieved_at
      OR (ahead.achieved_at=s.achieved_at AND ahead.entry_id<s.entry_id))))) AS position
  FROM scores s WHERE s.player_hash=? AND s.version=? AND s.mode=? AND s.day=?`;
function publicEntry(row, position, own) {
  return { position, alias: row.alias, score: row.score, rank: rank(row.score), achievedAt: row.achieved_at, own };
}
function receipt(text) {
  const data = JSON.parse(text);
  if (data.ownEntry) data.ownEntry = { ...data.ownEntry, rank: rank(data.ownEntry.score), own: true };
  return data;
}
async function submit(request, env, now) {
  const data = await body(request); keys(data, ['token', 'playerId', 'alias', 'score', 'activeMs']);
  if (!validPlayerId(data.playerId) || !integer(data.score, 0, RULES.maxScore) || !integer(data.activeMs, 0, RULES.maxActiveMs)) fail(400, 'Score, aktive Zeit oder Spielerkennung ungültig.');
  const validation = validateAlias(data.alias); if (!validation.ok) fail(400, validation.error);
  const claims = await verify(env, data.token);
  const playerHash = await hmac(env.PSEUDONYM_KEY, data.playerId.toLowerCase());
  if (claims.playerHash !== playerHash) fail(403, 'Run gehört nicht zu dieser Spielerkennung.');
  const stored = await env.DB.prepare('SELECT * FROM runs WHERE id=? AND player_hash=? AND version=? AND mode=? AND day=? AND started_at=? AND expires_at=? AND seed=?').bind(claims.runId, playerHash, VERSION, claims.mode, claims.day, claims.startedAt, claims.expiresAt, claims.seed).first();
  if (!stored) fail(410, 'Run nicht verfügbar.');
  const submissionHash = await digest(JSON.stringify([data.token, data.playerId, data.alias, data.score, data.activeMs]));
  if (stored.consumed_at !== null) {
    if (stored.submission_hash !== submissionHash) fail(409, 'Run bereits anders eingereicht.');
    return receipt(stored.confirmation);
  }
  if (now > claims.expiresAt) fail(410, 'Run abgelaufen.');
  // activeMs is only a client claim, never proof of active play. Pauses are not
  // subtracted from wall time as if the server could independently verify them.
  if (data.activeMs + 50 < minimumActiveMs(data.score) || data.activeMs > now - claims.startedAt - RULES.countdownMs + 500 || now < claims.startedAt + RULES.countdownMs - 500) fail(422, 'Score und Spielzeit passen nicht zu den Spielregeln.');
  const confirmation = JSON.stringify({ accepted: true, receipt: claims.runId, score: data.score, mode: claims.mode, day: claims.day, version: VERSION, positionAsOf: now });
  // D1 batch is one transaction. The conditional write wins once; the INSERT
  // selects only that stored submission. A competing different body cannot upsert.
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE runs SET consumed_at=?,submission_hash=?,alias=?,score=?,confirmation=? WHERE id=? AND consumed_at IS NULL AND expires_at>=?').bind(now, submissionHash, validation.alias, data.score, confirmation, claims.runId, now),
    env.DB.prepare(`INSERT INTO scores(entry_id,player_hash,version,mode,day,alias,score,achieved_at)
      SELECT id,player_hash,version,mode,day,alias,score,consumed_at FROM runs WHERE id=? AND submission_hash=?
      ON CONFLICT(player_hash,version,mode,day) DO UPDATE SET alias=excluded.alias,score=excluded.score,achieved_at=excluded.achieved_at WHERE excluded.score>scores.score`).bind(claims.runId, submissionHash),
    // Save the best-value placement in the same transaction, including outside
    // Top 20. Do not recalculate an already stored receipt on an identical retry.
    env.DB.prepare(`UPDATE runs SET confirmation=json_set(confirmation,'$.ownEntry',json((
      SELECT json_object('position',position,'alias',alias,'score',score,'achievedAt',achieved_at)
      FROM (${OWN_ENTRY})
    ))) WHERE id=? AND submission_hash=? AND json_type(confirmation,'$.ownEntry') IS NULL`)
      .bind(playerHash, VERSION, claims.mode, claims.day, claims.runId, submissionHash),
    env.DB.prepare('SELECT submission_hash,confirmation FROM runs WHERE id=?').bind(claims.runId),
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
  const queries = [env.DB.prepare('SELECT alias,score,achieved_at,player_hash FROM scores WHERE version=? AND mode=? AND day=? ORDER BY score DESC,achieved_at ASC,entry_id ASC LIMIT 20').bind(VERSION, scope, day)];
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
    env.DB.prepare('DELETE FROM runs WHERE expires_at<?').bind(now - 172800000),
    env.DB.prepare("DELETE FROM scores WHERE mode='daily' AND day<?").bind(utcDay(now - 29 * 86400000)),
    env.DB.prepare('DELETE FROM rate_buckets WHERE expires_at<?').bind(now),
  ]);
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
      if (url.pathname === '/api/health') return response({ ok: true, enabled: env.ENABLED === 'true', configured: !!env.DB && secretsReady(env), version: VERSION }, 200, cors);
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
