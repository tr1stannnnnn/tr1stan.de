// Shared by the static game and Worker. Changing comparable rules requires a new version.
export const VERSION = 'pf-3';
export const GENERATOR_VERSION = 'escape-2';
export const RULES = Object.freeze({
  width: 480, height: 720, ceiling: 40, floor: 672,
  playerX: 120, halfWidth: 11, halfHeight: 9,
  gravity: 900, flap: -310, terminalVelocity: 520,
  step: 1 / 120, maxCatchup: 0.1,
  gateWidth: 64, firstGateX: 560, gateInterval: 1.65,
  speed: 190, maxSpeed: 310, acceleration: 12,
  gap: 210, minGap: 145, maxCenterChange: 170,
  movingAmplitude: 22, movingPeriod: 5, closingAmplitude: 12,
  fragmentRadius: 8, fragmentBehind: 48, maxCombo: 5,
  corridorCenter: 360, corridorGap: 220,
  traceWarning: .6, traceTrack: .6, traceLock: 1, projectileSpeed: 440,
  laserWarning: .8, laserCharge: .8, laserActive: .42, laserFade: .35,
  countdownMs: 1500, maxGates: 1000, maxScore: 19980, maxActiveMs: 1500000, tokenTtlMs: 1800000,
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
export function rank(gates) {
  return gates >= 50 ? 'ROOT' : gates >= 25 ? 'SYSADMIN' : gates >= 10 ? 'PACKET ROUTER' : 'SCRIPT KIDDIE';
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
export const DIFFICULTY = Object.freeze([
  Object.freeze({ gates: 0, speed: 190, gap: 210, interval: 1.65 }),
  Object.freeze({ gates: 5, speed: 225, gap: 185, interval: 1.45 }),
  Object.freeze({ gates: 12, speed: 270, gap: 160, interval: 1.30 }),
  Object.freeze({ gates: 25, speed: 310, gap: 145, interval: 1.15 }),
]);
export function difficulty(gates) {
  const progress = Math.max(0, Math.min(25, gates));
  const upper = DIFFICULTY.findIndex(point => point.gates >= progress);
  if (upper <= 0) return { ...DIFFICULTY[0] };
  const a=DIFFICULTY[upper-1], b=DIFFICULTY[upper], f=(progress-a.gates)/(b.gates-a.gates);
  return { gates: progress, speed:a.speed+(b.speed-a.speed)*f, gap:a.gap+(b.gap-a.gap)*f, interval:a.interval+(b.interval-a.interval)*f };
}
// The next spawn is313.5..356.5 units away. At spawn n, gate n-1
// cannot have passed (515-unit full travel), while n-2 already has:
// two minimum spacings minus tick quantization exceed515. Thus the spacing
// set by spawn n-1 uses progress max(0,n-3). Max speed bounds all travel.
// Cache only the short ramp; the constant tail is O(1) per verification.
const passageDistance=[0,RULES.firstGateX+RULES.gateWidth-(RULES.playerX-RULES.halfWidth)];
for(let ordinal=2;ordinal<=28;ordinal++) {
  const p=difficulty(Math.max(0,ordinal-3));
  passageDistance[ordinal]=passageDistance[ordinal-1]+p.speed*p.interval;
}
export function minimumActiveMs(gates) {
  if(gates===0)return 0;
  return Math.floor((passageDistance[Math.min(gates,28)]+Math.max(0,gates-28)*DIFFICULTY.at(-1).speed*DIFFICULTY.at(-1).interval)/RULES.maxSpeed*1000);
}
export function maximumBonus(fragments) {
  const ramp = Math.min(5, fragments);
  return ramp * (ramp + 1) + Math.max(0, fragments - 5) * 10;
}
// These bounds reject impossible aggregates; they are not proof of honest play.
export function scoreParts(gates, fragments, bonusPoints) {
  const valid = Number.isSafeInteger(gates) && gates >= 0 && gates <= RULES.maxGates
    && Number.isSafeInteger(fragments) && fragments >= 0 && fragments <= gates
    && Number.isSafeInteger(bonusPoints) && bonusPoints >= fragments * 2
    && bonusPoints <= maximumBonus(fragments) && bonusPoints % 2 === 0;
  return valid ? { ok: true, score: gates * 10 + bonusPoints } : { ok: false };
}
