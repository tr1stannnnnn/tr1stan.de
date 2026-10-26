import test from 'node:test';
import assert from 'node:assert/strict';
import { Flight, FixedClock } from '../game/physics.mjs';
import { RULES as R, dailySeed, scoreParts, maximumBonus } from '../game/rules.mjs';
import { gateShape, securityKind, corridorAt } from '../game/world.mjs';
import { Records, LEGACY_KEY, STORAGE_KEY } from '../game/storage.mjs';
import { shouldFlap } from './escape-controller.mjs';

test('Moving and closing gates have bounded continuous edges; safety corridors suppress them', () => {
  const f = new Flight(9); for(let n=0;n<150;n++) f.addGate(560);
  assert(f.gates.some(g=>g.type==='moving')); assert(f.gates.some(g=>g.type==='compress'));
  for(const g of f.gates) {
    if(corridorAt(g.ordinal)!==null) assert.equal(g.type,'static');
    let before=gateShape(g,0);
    for(let tick=1;tick<720;tick++) {
      const next=gateShape(g,tick);
      assert(next.gap>=R.minGap); assert(next.center-next.gap/2>R.ceiling+R.halfHeight);
      assert(Math.abs(next.center-before.center)<=32*R.step);
      assert(Math.abs(next.gap-before.gap)<=16*R.step); before=next;
    }
  }
  assert.equal(securityKind(12),'trace'); assert.equal(securityKind(20),'laser');
});
test('Projectile collision matches its rectangle; trace lock never follows input', () => {
  const f=new Flight(1); f.beginHazard({security:'trace',enemySide:1});
  f.hazard.age=R.traceWarning+R.traceTrack-.001; f.y=320; f.stepHazard();
  const locked=f.hazard.locked; assert.equal(locked,360);
  f.y=450; for(let n=0;n<130;n++) f.stepHazard();
  assert.equal(f.hazard.locked,locked); assert.equal(f.projectiles[0].y,locked); assert(!f.dead);
  f.projectiles=[{x:120,previousX:120,y:450,width:46,height:10}]; f.stepHazard(); assert.equal(f.reason,'TRACE INTERCEPT');
});
test('Laser warnings and charge are harmless; active strip hits; safe route exists', () => {
  for(const side of [-1,1]) {
    const f=new Flight(1); f.beginHazard({security:'laser',enemySide:side}); f.y=360+side*54;
    for(let n=0;n<180;n++) f.stepHazard(); assert(!f.dead);
    for(let n=0;n<20;n++) f.stepHazard(); assert.equal(f.reason,'LASER SWEEP');
    const safe=new Flight(1); safe.beginHazard({security:'laser',enemySide:side}); safe.y=360-side*54;
    for(let n=0;n<350;n++) safe.stepHazard(); assert(!safe.dead); assert.equal(safe.hazard,null);
  }
});
test('Fragments are after complete gates, score once, raise capped combo; misses reset', () => {
  const f=new Flight(1); f.gates=[]; f.untilGate=100;
  for(let i=1;i<=7;i++) {
    f.addGate(560); const g=f.gates.at(-1); g.fragment=true; g.type='static'; g.baseCenter=360;
    g.fragmentOffset=0; g.passed=true; f.gatesPassed=i; f.score=i*10+f.bonusPoints;
    g.x=120-R.gateWidth-R.fragmentBehind; f.y=360; f.vy=0;
    f.step(); assert(g.collected); const score=f.score; f.step(); assert.equal(f.score,score);
  }
  assert.equal(f.combo,5); assert.equal(f.bonusPoints,50); assert.equal(f.fragments,7);
  f.addGate(-30); const miss=f.gates.at(-1); miss.passed=true; miss.fragment=true; f.step(); assert.equal(f.combo,0);
  assert(scoreParts(f.gatesPassed,f.fragments,f.bonusPoints).ok);
});
test('Score formula rejects forged components and accepts the full new maximum', () => {
  assert.equal(scoreParts(1000,1000,maximumBonus(1000)).score,19980);
  for(const v of [[1,2,4],[1,1,10],[10,0,2],[-1,0,0],[2,1,3],[1.5,0,0],[1001,0,0]]) assert(!scoreParts(...v).ok,v);
  assert.equal(scoreParts(12,5,30).score,150);
});
test('pf-1 archive, UUID, mute and unlocked skins survive without point-based early unlocks', () => {
  const data=new Map(), storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  const old={normal:25,daily:{'2026-10-11':50},highest:50,muted:true,skin:'root',playerId:'bdaf0344-596f-4a61-a150-754975ad492b'};
  storage.setItem(LEGACY_KEY,JSON.stringify(old)); const r=new Records(storage);
  assert.equal(r.best('normal',''),0); assert.deepEqual(r.data.legacy.daily,old.daily);
  assert.equal(r.data.playerId,old.playerId); assert(r.data.muted); assert.equal(r.data.skin,'root');
  assert.equal(storage.getItem(LEGACY_KEY),JSON.stringify(old));
  const fresh=new Records({getItem:()=>null,setItem:()=>{}}); fresh.record('normal','',180,9,9);
  assert(!fresh.selectSkin('router')); fresh.record('normal','',100,10,0); assert(fresh.selectSkin('router'));
});
test('Persisted pf-1 archive survives deletion of the separate legacy key and another reload', () => {
  const values=new Map(), storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const old={normal:25,daily:{'2026-10-11':50},highest:50,muted:true,skin:'root',playerId:'bdaf0344-596f-4a61-a150-754975ad492b'};
  storage.setItem(LEGACY_KEY,JSON.stringify(old));
  const first=new Records(storage); first.record('normal','',150,12,5);
  values.delete(LEGACY_KEY);
  const restored=new Records(storage);
  assert.deepEqual(restored.data.legacy,first.data.legacy);
  assert.equal(restored.data.playerId,first.data.playerId); assert.equal(restored.data.skin,'root');
  assert.equal(restored.best('normal',''),150); assert.equal(restored.data.highest,50);
  assert.deepEqual(new Records(storage).data.legacy,first.data.legacy);
  const saved=JSON.parse(storage.getItem(STORAGE_KEY));
  saved.legacy.daily.invalid=100; saved.legacy.daily['2026-10-12']=1001;
  storage.setItem(STORAGE_KEY,JSON.stringify(saved));
  assert.deepEqual(new Records(storage).data.legacy.daily,old.daily);
});
test('Fixed-step replay includes reactive enemies at all cadences; pause and reset own all clocks', () => {
  function simulate(hz) {
    const f=new Flight(dailySeed('2026-10-25')), clock=new FixedClock();
    for(let frame=0;frame<hz*65;frame++) clock.advance(1/hz,()=>{if(shouldFlap(f))f.flap();f.step();});
    return JSON.stringify({y:f.y,vy:f.vy,ticks:f.ticks,dead:f.dead,score:f.score,gates:f.gates,hazard:f.hazard,projectiles:f.projectiles,nextWorld:f.random(),nextEnemy:f.enemyRandom()});
  }
  const base=simulate(60); for(const hz of [120,144,240])assert.equal(simulate(hz),base);
  for(const kind of ['trace','laser']) for(const age of [.3,1.3,2.3]) {
    const f=new Flight(1); f.beginHazard({security:kind,enemySide:1});f.hazard.age=age;
    const before=JSON.stringify(f); const clock=new FixedClock(); clock.reset(); assert.equal(JSON.stringify(f),before);
    f.reset(1);assert.equal(f.hazard,null);assert.equal(f.projectiles.length,0);assert.equal(f.events.length,0);
  }
});
test('100 deterministic seed samples: an input-only safe-route controller passes 35 gates', () => {
  const failures=[]; const types=new Set();
  for(let seed=1;seed<=100;seed++) {
    const f=new Flight(seed);
    while(!f.dead&&f.gatesPassed<35&&f.ticks<120*85) {
      if(shouldFlap(f)) f.flap(); f.step();
      for(const e of f.drainEvents()) if(e.kind==='gate') types.add(e.gate.type);
      assert(f.projectiles.length<=1); assert(f.gates.length<=6);
    }
    if(f.gatesPassed<35) failures.push({seed,gates:f.gatesPassed,reason:f.reason});
  }
  assert.deepEqual(failures,[]); assert(types.has('moving')); assert(types.has('compress'));
});
test('1000 sampled routes remain traversable with optional fragments through maximum difficulty', () => {
  let fragments=0, combo=0;
  for(let seed=1;seed<=1000;seed++) {
    const f=new Flight(Math.imul(seed,2654435761)>>>0);
    while(!f.dead&&f.gatesPassed<80&&f.time<165) {
      if(shouldFlap(f,true)) f.flap(); f.step(); f.drainEvents();
      combo=Math.max(combo,f.combo);
      assert(f.projectiles.length<=1); assert(f.gates.length<=6);
    }
    assert.equal(f.gatesPassed,80,`seed ${seed}: ${f.reason} at ${f.gatesPassed}`);
    fragments+=f.fragments;
  }
  assert(fragments>1000); assert.equal(combo,5);
});
