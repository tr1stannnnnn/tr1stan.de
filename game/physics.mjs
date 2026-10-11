import { RULES as R, randomSequence } from './rules.mjs';

export class Flight {
  constructor(seed) { this.reset(seed); }
  reset(seed) {
    this.random = randomSequence(seed);
    this.y = 360; this.previousY = this.y; this.vy = R.flap;
    this.ticks = 0; this.score = 0; this.dead = false; this.reason = '';
    this.gates = []; this.untilGate = R.gateInterval; this.center = 360;
    this.addGate(R.firstGateX);
  }
  get activeMs() { return Math.round(this.ticks * R.step * 1000); }
  flap() { if (!this.dead) this.vy = R.flap; }
  addGate(x) {
    const gap = Math.max(R.minGap, R.gap - this.score * R.gapPerPoint);
    this.center += (this.random() * 2 - 1) * R.maxCenterChange;
    this.center = Math.max(R.ceiling + gap / 2 + 36, Math.min(R.floor - gap / 2 - 36, this.center));
    this.gates.push({ x, previousX: x, center: this.center, gap, passed: false });
  }
  end(reason) { this.dead = true; this.reason = reason; }
  step() {
    if (this.dead) return;
    this.ticks++;
    this.previousY = this.y;
    this.vy = Math.min(R.terminalVelocity, this.vy + R.gravity * R.step);
    this.y += this.vy * R.step;
    if (this.y - R.halfHeight <= R.ceiling) this.end('ROUTE FAILED');
    if (this.y + R.halfHeight >= R.floor) this.end('CONNECTION LOST');
    const speed = Math.min(R.maxSpeed, R.speed + this.score * R.speedPerPoint);
    for (const gate of this.gates) {
      gate.previousX = gate.x; gate.x -= speed * R.step;
      const overlaps = R.playerX + R.halfWidth > gate.x && R.playerX - R.halfWidth < gate.x + R.gateWidth;
      if (overlaps && (this.y - R.halfHeight <= gate.center - gate.gap / 2 || this.y + R.halfHeight >= gate.center + gate.gap / 2)) this.end('PACKET LOSS');
      if (!this.dead && !gate.passed && gate.x + R.gateWidth < R.playerX - R.halfWidth) {
        gate.passed = true; this.score++;
      }
    }
    this.gates = this.gates.filter(g => g.x + R.gateWidth > -10);
    this.untilGate -= R.step;
    if (this.untilGate <= 1e-9) {
      // Spawn at the same first-gate location: spacing has no dependency on display or decoration.
      this.addGate(R.firstGateX); this.untilGate += R.gateInterval;
    }
    if (this.score >= R.maxScore || this.activeMs >= R.maxActiveMs) this.end('TIMEOUT');
  }
}

export class FixedClock {
  constructor() { this.accumulator = 0; }
  reset() { this.accumulator = 0; }
  advance(seconds, step) {
    this.accumulator += Math.max(0, Math.min(R.maxCatchup, seconds));
    let ticks = 0;
    while (this.accumulator + 1e-10 >= R.step) {
      step(); this.accumulator -= R.step; ticks++;
    }
    return { ticks, alpha: Math.max(0, this.accumulator / R.step) };
  }
}
