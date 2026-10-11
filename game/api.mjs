import { VERSION, dailySeed, validateAlias, RULES } from './rules.mjs';
export class LeaderboardAPI {
  constructor(base = '', fetcher = globalThis.fetch?.bind(globalThis)) { this.base = base.replace(/\/$/, ''); this.fetcher = fetcher; }
  get enabled() { return /^https:\/\/[^/]+$/.test(this.base); }
  async request(path, options = {}) {
    if (!this.enabled) throw Error('LEADERBOARD OFFLINE — das Backend ist noch nicht aktiviert.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await this.fetcher(this.base + path, { ...options, signal: controller.signal, credentials: 'omit', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || `API-Fehler ${response.status}`);
      return data;
    } catch (error) {
      if (controller.signal.aborted) throw Error('TIMEOUT — das Backend antwortet nicht.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async start(mode, playerId) {
    const data = await this.request('/api/run/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, version: VERSION, playerId }) });
    if (data.version !== VERSION || data.mode !== mode || typeof data.token !== 'string' || data.token.length > 1024 || !Number.isInteger(data.seed) || data.seed < 1 || data.seed > 4294967295 || !Number.isSafeInteger(data.startedAt) || data.expiresAt !== data.startedAt + RULES.tokenTtlMs || (mode === 'daily' && (typeof data.day !== 'string' || data.seed !== dailySeed(data.day) || !/^\d{4}-\d{2}-\d{2}$/.test(data.day)))) throw Error('Ungültige Run-Antwort; Run bleibt lokal.');
    return data;
  }
  async submit(run, playerId, alias, score, activeMs) {
    return this.request('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: run.token, playerId, alias, score, activeMs }) });
  }
  async list(mode, playerId) {
    const data = await this.request(`/api/leaderboard?mode=${mode}`, { headers: { 'X-Player-ID': playerId } });
    if (data.version !== VERSION || data.mode !== mode || (mode === 'daily' && !/^\d{4}-\d{2}-\d{2}$/.test(data.day)) || !Array.isArray(data.entries) || data.entries.length > 20 || data.entries.some(e => !e || !validateAlias(e.alias).ok || !Number.isInteger(e.score) || e.score < 0 || e.score > RULES.maxScore || typeof e.own !== 'boolean')) throw Error('Ungültige Rangliste.');
    return data;
  }
}
