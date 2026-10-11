import test from 'node:test';
import assert from 'node:assert/strict';
import { Flight, FixedClock } from '../game/physics.mjs';
import { RULES as R, VERSION, dailySeed, utcDay, validateAlias, rank, minimumActiveMs } from '../game/rules.mjs';
import { Records, STORAGE_KEY } from '../game/storage.mjs';
import { LeaderboardAPI } from '../game/api.mjs';
import { Sound } from '../game/audio.mjs';

const memory = () => { const data = new Map(); return { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v) }; };
test('Daily deterministic, versioned and changes at UTC midnight', () => {
  assert.equal(utcDay(Date.parse('2026-10-11T23:59:59Z')), '2026-10-11');
  assert.equal(utcDay(Date.parse('2026-10-12T00:00:00Z')), '2026-10-12');
  assert.notEqual(dailySeed('2026-10-11'), dailySeed('2026-10-12'));
  const a = new Flight(dailySeed('2026-10-11')), b = new Flight(dailySeed('2026-10-11'));
  for (let i = 0; i < 30; i++) { a.addGate(560); b.addGate(560); }
  assert.deepEqual(a.gates, b.gates);
  assert(a.gates.every(g => g.gap >= R.minGap && g.center - g.gap / 2 > R.ceiling));
});
test('Fixed physics at 60/120/144/240Hz and mixed frames', () => {
  const simulate = hz => {
    const f = new Flight(571), clock = new FixedClock();
    let simTicks = 0;
    const step = () => {
      const next = f.gates.find(g => g.x + R.gateWidth >= R.playerX - R.halfWidth);
      if (f.y > (next?.center || 360) + 18 && f.vy > 0) f.flap();
      f.step(); simTicks++;
    };
    for (let i = 0; i < hz * 12; i++) clock.advance(1 / hz, step);
    return { y: f.y, gates: f.gates, ticks: f.ticks, simTicks, score: f.score, dead: f.dead };
  };
  const baseline = simulate(60);
  assert(baseline.score > 0, 'The run must actually pass gates');
  for (const hz of [120, 144, 240]) assert.deepEqual(simulate(hz), baseline);
  const clock = new FixedClock(); let count = 0;
  for (const dt of [.004, .017, .006, .023, .05]) clock.advance(dt, () => count++);
  assert.equal(count, 12);
  clock.advance(20, () => count++); assert.equal(count, 24, 'catch-up bounded');
});
test('Score only after entire hitbox passes, once; gate and floor collisions', () => {
  const f = new Flight(1), gate = f.gates[0]; f.y = gate.center; f.vy = 0;
  gate.x = R.playerX - R.halfWidth - R.gateWidth + 3;
  f.step(); assert.equal(f.score, 0);
  f.step(); f.step(); assert.equal(f.score, 1);
  for (let i = 0; i < 10; i++) f.step(); assert.equal(f.score, 1);
  const collision = new Flight(1); collision.gates[0].x = R.playerX; collision.y = 60; collision.vy = 0;
  collision.step(); assert.equal(collision.reason, 'PACKET LOSS');
  const floor = new Flight(1); floor.y = R.floor; floor.vy = 0; floor.step(); assert(floor.dead);
});
test('Reset and pause clock preserve a run without duplicate ticks', () => {
  const f = new Flight(6), clock = new FixedClock(); clock.advance(.1, () => f.step());
  const before = f.ticks; clock.reset(); assert.equal(f.ticks, before);
  f.reset(6); assert.equal(f.ticks, 0); assert.equal(f.score, 0); assert.equal(f.gates.length, 1);
  assert.equal(minimumActiveMs(2) > minimumActiveMs(1), true);
});
test('Storage: modes/day separation, unlocks, selection, corrupt and blocked storage', () => {
  const store = memory(), warnings = [];
  const records = new Records(store, v => warnings.push(v));
  records.record('normal', '', 10); records.record('daily', '2026-10-11', 25);
  assert.equal(records.best('normal', ''), 10); assert.equal(records.best('daily', '2026-10-12'), 0);
  assert(records.selectSkin('admin')); assert(!records.selectSkin('root'));
  records.record('daily', '2026-10-12', 50); assert(records.selectSkin('root'));
  records.setMuted(true);
  const restored = new Records(store); assert.equal(restored.data.skin, 'root'); assert(restored.data.muted);
  assert.equal(restored.data.playerId, records.data.playerId);
  store.setItem(STORAGE_KEY, '{nope'); assert.doesNotThrow(() => new Records(store, v => warnings.push(v)));
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }, session = memory();
  const fallback = new Records(blocked, v => warnings.push(v), session); fallback.record('normal', '', 12);
  assert.equal(new Records(blocked, () => {}, session).best('normal', ''), 12);
  assert.equal(fallback.persistent, false); assert(warnings.length);
  const volatile = new Records(blocked); volatile.record('normal', '', 11); assert.equal(volatile.best('normal', ''), 11);
});
test('Unicode aliases and ranks', () => {
  for (const value of ['Änne', 'Mu\u0308ller', '客人', '  Root_42-AB  ', 'a'.repeat(16)]) assert(validateAlias(value).ok, value);
  for (const value of ['', 'A', 'a'.repeat(17), '<script>', 'a\u202Eb', 'a\u200Bb', 'a\nb', 'a\tb', '🚀🚀', {}, 12]) assert(!validateAlias(value).ok);
  assert.equal(validateAlias('Mu\u0308ller').alias, 'Müller');
  assert.deepEqual([0, 10, 25, 50].map(rank), ['SCRIPT KIDDIE', 'PACKET ROUTER', 'SYSADMIN', 'ROOT']);
});
test('Empty API performs no requests; error and timeout are explicit', async () => {
  let calls = 0;
  const api = new LeaderboardAPI('', () => { calls++; });
  await assert.rejects(api.start('normal', 'id'), /OFFLINE/); assert.equal(calls, 0);
  const offline = new LeaderboardAPI('https://example.invalid', async () => { throw Error('offline'); });
  await assert.rejects(offline.list('alltime', 'id'), /offline/);
  const malformed = new LeaderboardAPI('https://example.invalid', async () => new Response(JSON.stringify({ version: VERSION, entries: [{ alias: '<img>' }] })));
  await assert.rejects(malformed.list('alltime', 'id'), /Ungültige/);
  const timeout = new LeaderboardAPI('https://example.invalid', (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')))));
  await assert.rejects(timeout.list('alltime', 'id'), /TIMEOUT/);
});
test('Audio failure never blocks play', async () => {
  const before = globalThis.AudioContext;
  globalThis.AudioContext = class { constructor() { throw Error('audio denied'); } };
  try { const sound = new Sound(); await sound.unlock(); assert(sound.failed); assert.doesNotThrow(() => sound.play('flap')); }
  finally { globalThis.AudioContext = before; }
});
