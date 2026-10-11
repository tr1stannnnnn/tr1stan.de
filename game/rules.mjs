// Shared by the static game and Worker. Changing comparable rules requires a new version.
export const VERSION = 'pf-1';
export const GENERATOR_VERSION = 'daily-1';
export const RULES = Object.freeze({
  width: 480, height: 720, ceiling: 40, floor: 672,
  playerX: 120, halfWidth: 11, halfHeight: 9,
  gravity: 900, flap: -310, terminalVelocity: 520,
  step: 1 / 120, maxCatchup: 0.1,
  gateWidth: 64, firstGateX: 560, gateInterval: 1.8,
  speed: 170, maxSpeed: 230, speedPerPoint: 1.5,
  gap: 236, minGap: 188, gapPerPoint: 1.2, maxCenterChange: 94,
  countdownMs: 3000, maxScore: 1000, maxActiveMs: 1500000, tokenTtlMs: 1800000,
});
export function utcDay(time = Date.now()) { return new Date(time).toISOString().slice(0, 10); }
export function dailySeed(day) {
  const text = `${VERSION}|${GENERATOR_VERSION}|${day}`;
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash || 1;
}
export function randomSequence(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
export function rank(score) {
  return score >= 50 ? 'ROOT' : score >= 25 ? 'SYSADMIN' : score >= 10 ? 'PACKET ROUTER' : 'SCRIPT KIDDIE';
}
export const SKINS = Object.freeze([
  { id: 'packet', name: 'PACKET', at: 0, color: '#F5D0FE' },
  { id: 'router', name: 'ROUTER', at: 10, color: '#E879F9' },
  { id: 'admin', name: 'SYSADMIN', at: 25, color: '#C084FC' },
  { id: 'root', name: 'ROOT', at: 50, color: '#FFFFFF' },
]);
export function validateAlias(value) {
  if (typeof value !== 'string') return { ok: false, error: 'Alias muss Text sein.' };
  // Check the original too: trimming must not hide tabs, newlines or format controls.
  const normalized = value.normalize('NFC');
  if (!/^[\p{L}\p{N} _-]*$/u.test(normalized)) return { ok: false, error: 'Nur Buchstaben, Zahlen, Leerzeichen, _ und - sind erlaubt.' };
  const alias = normalized.trim();
  const length = [...alias].length;
  if (length < 2 || length > 16) return { ok: false, error: 'Bitte 2–16 Zeichen verwenden.' };
  return { ok: true, alias };
}
export function validPlayerId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
// Conservative lower bound: every gate is at least speed * interval apart,
// and no gate can ever travel faster than maxSpeed. Includes full hitbox passage.
export function minimumActiveMs(score) {
  if (score === 0) return 0;
  const first = (RULES.firstGateX + RULES.gateWidth - (RULES.playerX - RULES.halfWidth)) / RULES.maxSpeed;
  const next = RULES.speed * RULES.gateInterval / RULES.maxSpeed;
  return Math.floor((first + (score - 1) * next) * 1000);
}
