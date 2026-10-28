import { SKINS, randomSequence } from './rules.mjs?v=pf3-1';

export const EFFECT_LIMITS = Object.freeze({ particles: 64, trail: 9, rings: 4, labels: 3, gates: 3 });
const colorOf = skin => SKINS.find(s => s.id === skin)?.color || SKINS[0].color;
const trim = (array, limit) => { if (array.length > limit) array.splice(0, array.length - limit); };

// Cosmetic RNG owns its state. It never receives the run seed or Flight.random.
export class Effects {
  constructor(seed = 0x71c0ffee) { this.seed = seed; this.reset(); }
  reset() {
    this.random = randomSequence(this.seed); this.time = 0; this.flapAt = -10;
    this.particles = []; this.trail = []; this.rings = []; this.labels = []; this.gates = [];
    this.trailClock = 0; this.broken = false;
  }
  get active() {
    return this.particles.length + this.trail.length + this.rings.length + this.labels.length + this.gates.length > 0 || this.time - this.flapAt < .2;
  }
  burst(x, y, count, skin, collision = false) {
    const color = colorOf(skin);
    for (let i = 0; i < count; i++) {
      const angle = collision ? this.random() * Math.PI * 2 : Math.PI * .55 + this.random() * Math.PI * .9;
      const speed = collision ? 55 + this.random() * 105 : 35 + this.random() * 55;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed - (collision ? 0 : 38), vy: Math.sin(angle) * speed,
        age: 0, life: collision ? .3 + this.random() * .18 : .18 + this.random() * .16, size: 2 + this.random() * 3, color });
    }
    trim(this.particles, EFFECT_LIMITS.particles);
  }
  flap(flight, skin, reduced = false) {
    if (flight.dead || this.broken) return;
    this.flapAt = this.time;
    this.burst(106, flight.y + 5, reduced ? 1 : 6, skin);
    if (reduced) this.particles = this.particles.slice(-2);
    if (!reduced) this.rings.push({ x: 120, y: flight.y, age: 0, life: .27, color: colorOf(skin) });
    trim(this.rings, EFFECT_LIMITS.rings);
  }
  point(gate, y, skin, reduced = false, value = 10) {
    this.labels.push({ x: 145, y: y - 22, value, age: 0, life: reduced ? .3 : .55, color: colorOf(skin) });
    if (gate) this.gates.push({ gate, age: 0, life: reduced ? .18 : .42 });
    trim(this.labels, EFFECT_LIMITS.labels); trim(this.gates, EFFECT_LIMITS.gates);
  }
  collide(flight, skin, reduced = false) {
    if (this.broken) return;
    this.broken = true; this.flapAt = -10; this.trail = []; this.rings = [];
    this.burst(120, flight.y, reduced ? 2 : 18, skin, true);
    if (reduced) {
      this.particles = this.particles.slice(-2);
      for (const item of this.particles) item.life = .12;
    }
  }
  advance(seconds, flight, { running = false, settling = false, reduced = false, skin = 'packet' } = {}) {
    if (!running && !settling) return;
    const dt = Math.max(0, Math.min(.1, seconds)); this.time += dt;
    for (const name of ['particles', 'trail', 'rings', 'labels', 'gates']) {
      for (const item of this[name]) item.age += dt;
      this[name] = this[name].filter(item => item.age < item.life);
    }
    if (reduced) { this.trail = []; this.rings = []; this.particles = this.particles.slice(-2); }
    if (running && !flight.dead && !reduced) {
      this.trailClock += dt;
      if (this.trailClock >= .035) {
        this.trailClock %= .035;
        this.trail.push({ x: 120, y: flight.y, angle: Math.max(-.3, Math.min(.55, flight.vy / 850)), age: 0, life: .22, color: colorOf(skin) });
        trim(this.trail, EFFECT_LIMITS.trail);
      }
    }
  }
}
