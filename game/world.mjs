import { RULES as R } from './rules.mjs?v=pf2-privacy1';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function securityKind(ordinal) {
  if (ordinal >= 12 && ordinal % 16 === 12) return 'trace';
  if (ordinal >= 20 && ordinal % 16 === 4) return 'laser';
  return '';
}
export function corridorAt(ordinal) {
  for (let offset = -2; offset <= 2; offset++) if (securityKind(ordinal + offset)) return offset;
  return null;
}
export function gatePlan(ordinal, previous, random, enemyRandom) {
  // Fixed RNG draws per gate; reactive enemy targets never consume world RNG.
  const drift = (random() * 2 - 1) * R.maxCenterChange;
  const phase = random() * Math.PI * 2, side = random() < .5 ? -1 : 1;
  const hasFragment = random() < .85, enemySide = enemyRandom() < .5 ? -1 : 1;
  const corridor = corridorAt(ordinal), security = securityKind(ordinal);
  const center = corridor === null ? clamp(previous + drift, 270, 450)
    : corridor === 2 ? previous + clamp(360 - previous, -R.maxCenterChange, R.maxCenterChange) : 360;
  const type = corridor !== null || ordinal <= 5 ? 'static'
    : ordinal >= 20 && ordinal % 8 === 0 ? 'compress' : ordinal % 3 === 0 ? 'moving' : 'static';
  return { ordinal, baseCenter: center, phase, type, security, enemySide,
    baseGap: corridor !== null ? R.corridorGap : Math.max(R.minGap + R.closingAmplitude, R.gap - ordinal * R.gapPerGate),
    fragment: hasFragment && corridor === null, fragmentOffset: side * 42 };
}
export function gateShape(gate, ticks) {
  const phase = gate.phase + (ticks - gate.spawnTick) * R.step * Math.PI * 2 / R.movingPeriod;
  return { center: gate.baseCenter + (gate.type === 'moving' ? Math.sin(phase) * R.movingAmplitude : 0),
    gap: gate.baseGap - (gate.type === 'compress' ? (1 + Math.sin(phase)) * R.closingAmplitude / 2 : 0) };
}
export function alarmPhase(gates) { return gates >= 20 ? 3 : gates >= 12 ? 2 : gates >= 6 ? 1 : 0; }
export const ALARMS = ['GHOST ROUTE', 'FIREWALL ESCALATION', 'TRACE DETECTED', 'LOCKDOWN'];
