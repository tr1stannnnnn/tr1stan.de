import { RULES as R, randomSequence } from './rules.mjs?v=pf2-privacy1';
import { gatePlan, gateShape, alarmPhase } from './world.mjs?v=pf2-privacy1';
export class Flight {
  constructor(seed) { this.reset(seed); }
  reset(seed) {
    this.random = randomSequence(seed); this.enemyRandom = randomSequence((seed ^ 0x5f3759df) >>> 0);
    this.y = 360; this.previousY = 360; this.vy = R.flap;
    this.ticks = 0; this.score = 0; this.gatesPassed = 0; this.fragments = 0; this.bonusPoints = 0; this.combo = 0;
    this.dead = false; this.reason = ''; this.gates = []; this.events = []; this.projectiles = [];
    this.hazard = null; this.alarm = 0; this.untilGate = R.gateInterval; this.center = 360; this.spawned = 0;
    this.addGate(R.firstGateX);
  }
  get activeMs() { return Math.round(this.ticks * R.step * 1000); }
  get time() { return this.ticks * R.step; }
  event(kind, data = {}) { if (this.events.length < 32) this.events.push({ kind, tick: this.ticks, ...data }); }
  drainEvents() { return this.events.splice(0); }
  flap() { if (!this.dead) this.vy = R.flap; }
  addGate(x) {
    const plan = gatePlan(++this.spawned, this.center, this.random, this.enemyRandom);
    this.center = plan.baseCenter;
    const g = { ...plan, x, previousX: x, spawnTick: this.ticks, passed: false, collected: false, resolved: false };
    Object.assign(g, gateShape(g, this.ticks)); g.previousCenter = g.center; g.previousGap = g.gap; this.gates.push(g);
  }
  end(reason) { if (!this.dead) { this.dead = true; this.reason = reason; this.event('collision'); } }
  beginHazard(g) {
    if (this.hazard) return;
    this.hazard = { kind: g.security, age: 0, phase: 'warning', target: this.y, locked: null, side: g.enemySide, fired: false };
    this.event(g.security === 'trace' ? 'trace-warning' : 'laser-warning');
  }
  stepHazard() {
    const h = this.hazard;
    if (h) {
      h.age += R.step; const before = h.phase;
      if (h.kind === 'trace') {
        const lockAt = R.traceWarning + R.traceTrack, fireAt = lockAt + R.traceLock;
        h.phase = h.age < R.traceWarning ? 'warning' : h.age < lockAt ? 'tracking' : h.age < fireAt ? 'locked' : 'active';
        if (h.phase === 'tracking') h.target = this.y;
        if (h.age >= lockAt && h.locked === null) h.locked = h.target;
        if (h.age >= fireAt && !h.fired) {
          h.fired = true; this.projectiles.push({ x: 464, previousX: 464, y: h.locked, width: 46, height: 10 }); this.event('trace-fire');
        }
        if (h.age > fireAt + 1.25) this.hazard = null;
      } else {
        const activeAt = R.laserWarning + R.laserCharge, endAt = activeAt + R.laserActive;
        h.target = 360 + h.side * 54;
        h.phase = h.age < R.laserWarning ? 'warning' : h.age < activeAt ? 'charging' : h.age < endAt ? 'active' : 'fading';
        h.beamY = h.target + (h.phase === 'active' ? Math.sin((h.age - activeAt) / R.laserActive * Math.PI) * 8 : 0);
        if (h.phase === 'active' && Math.abs(this.y - h.beamY) <= R.halfHeight + 8) this.end('LASER SWEEP');
        if (h.age >= endAt + R.laserFade) this.hazard = null;
      }
      if (h.phase !== before) this.event(`${h.kind}-${h.phase}`);
    }
    for (const p of this.projectiles) {
      p.previousX = p.x; p.x -= R.projectileSpeed * R.step;
      if (p.x - p.width / 2 < R.playerX + R.halfWidth && p.x + p.width / 2 > R.playerX - R.halfWidth && Math.abs(this.y - p.y) <= R.halfHeight + p.height / 2) this.end('TRACE INTERCEPT');
    }
    this.projectiles = this.projectiles.filter(p => p.x + p.width / 2 > -10);
  }
  step() {
    if (this.dead) return;
    this.ticks++; this.previousY = this.y;
    this.vy = Math.min(R.terminalVelocity, this.vy + R.gravity * R.step); this.y += this.vy * R.step;
    if (this.y - R.halfHeight <= R.ceiling) this.end('ROUTE FAILED');
    if (this.y + R.halfHeight >= R.floor) this.end('CONNECTION LOST');
    const speed = Math.min(R.maxSpeed, R.speed + this.gatesPassed * R.speedPerGate);
    for (const g of this.gates) {
      g.previousX = g.x; g.previousCenter = g.center; g.previousGap = g.gap;
      g.x -= speed * R.step; Object.assign(g, gateShape(g, this.ticks));
      const overlaps = R.playerX + R.halfWidth > g.x && R.playerX - R.halfWidth < g.x + R.gateWidth;
      if (overlaps && (this.y - R.halfHeight <= g.center - g.gap / 2 || this.y + R.halfHeight >= g.center + g.gap / 2)) this.end('PACKET LOSS');
      if (!this.dead && !g.passed && g.x + R.gateWidth < R.playerX - R.halfWidth) {
        g.passed = true; this.gatesPassed++; this.score += 10; this.event('gate', { gate: g, value: 10 });
        const alarm = alarmPhase(this.gatesPassed);
        if (alarm !== this.alarm) { this.alarm = alarm; this.event('alarm', { alarm }); }
        if (g.security) this.beginHazard(g);
      }
      const fx = g.x + R.gateWidth + R.fragmentBehind, fy = g.baseCenter + g.fragmentOffset;
      if (g.fragment && g.passed && !g.resolved && !this.dead) {
        if (Math.abs(fx - R.playerX) <= R.halfWidth + R.fragmentRadius && Math.abs(fy - this.y) <= R.halfHeight + R.fragmentRadius) {
          g.collected = true; g.resolved = true; this.fragments++; this.combo = Math.min(R.maxCombo, this.combo + 1);
          const value = 2 * this.combo; this.bonusPoints += value; this.score += value; this.event('fragment', { x: fx, y: fy, value, combo: this.combo });
        } else if (fx + R.fragmentRadius < R.playerX - R.halfWidth) { g.resolved = true; this.combo = 0; this.event('miss'); }
      }
    }
    this.stepHazard();
    this.gates = this.gates.filter(g => g.x + R.gateWidth + R.fragmentBehind + 12 > -10);
    this.untilGate -= R.step;
    if (this.untilGate <= 1e-9) { this.addGate(R.firstGateX); this.untilGate += R.gateInterval; }
    if (this.gatesPassed >= R.maxGates || this.activeMs >= R.maxActiveMs) this.end('TIMEOUT');
  }
}
export class FixedClock {
  constructor() { this.accumulator = 0; }
  reset() { this.accumulator = 0; }
  advance(seconds, step) {
    this.accumulator += Math.max(0, Math.min(R.maxCatchup, seconds)); let ticks = 0;
    while (this.accumulator + 1e-10 >= R.step) { step(); this.accumulator -= R.step; ticks++; }
    return { ticks, alpha: Math.max(0, this.accumulator / R.step) };
  }
}
