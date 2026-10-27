import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile}from'node:fs/promises';
import{performance}from'node:perf_hooks';
import{VERSION,GENERATOR_VERSION,RULES as R,DIFFICULTY,difficulty,randomSequence,dailySeed,minimumActiveMs}from'../game/pf3/rules.mjs';
import{Flight}from'../game/pf3/physics.mjs';
import{gatePlan,gateShape,RouteState,securityKind,corridorAt}from'../game/pf3/world.mjs';
import{Records,STORAGE_KEY,CHOICE_KEY,memoryStorage,mergeRecords}from'../game/pf3/storage.mjs';
import{play}from'./pf3-controller.mjs';
import*as old from'../game/rules.mjs';
const CASES=[];for(const policy of [{},{escape:90},{escape:70},{threshold:12},{threshold:18},{low:65,high:38},{low:56,high:32}])for(const tapInterval of[.16,.14,.18,.12,.20])CASES.push({policy,tapInterval});
function witness(seed,goal=150,margin=10){for(let i=0;i<CASES.length;i++){const result=play(Flight,seed,goal,{...CASES[i],latency:.12});if(result.summary.gates===goal&&result.summary.minClearance>=margin)return{...result,choice:i};}return null;}
function plans(seed,count=150){const random=randomSequence(seed),enemy=randomSequence((seed^0x5f3759df)>>>0),route=new RouteState();let previous=360;return Array.from({length:count},(_,i)=>{const g=gatePlan(i+1,previous,random,enemy,route,Math.max(0,i-1));previous=g.baseCenter;return g;});}
test('pf-3 curve is gated, smooth and distinct; familiar impulse, gravity and hitbox unchanged',()=>{
 assert.equal(VERSION,'pf-3');assert.equal(GENERATOR_VERSION,'escape-2');
 assert.deepEqual(DIFFICULTY.map(p=>[p.gates,p.speed,p.gap,p.interval]),[[0,190,210,1.65],[5,225,185,1.45],[12,270,160,1.30],[25,310,150,1.15]]);
 for(const name of['gravity','flap','terminalVelocity','step','halfHeight','halfWidth','ceiling','floor'])assert.equal(R[name],old.RULES[name]);
 for(let g=0;g<25;g+=.1){const a=difficulty(g),b=difficulty(g+.1);assert(b.speed>=a.speed&&b.gap<=a.gap&&b.interval<=a.interval);assert(b.speed-a.speed<.71);}
 assert.deepEqual(difficulty(1000),difficulty(25));assert.equal(R.maxSpeed,310);
 assert.equal(dailySeed('2026-10-27'),dailySeed('2026-10-27'));assert.notEqual(dailySeed('2026-10-27'),old.dailySeed('2026-10-27'));assert.notEqual(dailySeed('2026-10-28'),dailySeed('2026-10-27'));
});
test('1000 seeded routes use real height, show early stairs and reject long flat or mechanical alternation',()=>{
 let minimumSpan=Infinity,maxFlat=0,maxAlternation=0,moving=0,compress=0;
 for(let seed=1;seed<=1000;seed++){
  const route=plans(seed);const first=route.slice(0,5).map(g=>g.baseCenter),span=Math.max(...first)-Math.min(...first);minimumSpan=Math.min(minimumSpan,span);assert(span>=230);
  assert.equal(route[0].type,'static');assert.equal(route[3].type,'moving');
  assert(Math.max(...route.map(g=>g.baseCenter))-Math.min(...route.map(g=>g.baseCenter))>=300);
  let flat=0,alternating=0,last=0;
  for(let i=1;i<route.length;i++){
   const g=route[i],delta=g.baseCenter-route[i-1].baseCenter,dir=Math.sign(delta);
   if(g.corridor===null)assert(Math.abs(delta)>=100-1e-8&&Math.abs(delta)<=170+1e-8);
   flat=Math.abs(delta)<60?flat+1:0;maxFlat=Math.max(maxFlat,flat);
   alternating=dir&&last&&dir!==last?alternating+1:0;maxAlternation=Math.max(maxAlternation,alternating);last=dir;
   if(g.type==='moving')moving++;if(g.type==='compress')compress++;
  }
 }
 assert(minimumSpan>=230);assert(maxFlat<=4);assert(maxAlternation<=8);assert(moving>20000&&compress>10000);
});
test('Moving/closing apertures stay clear of ceiling and floor throughout each cycle',()=>{
 for(let seed=1;seed<=200;seed++)for(const g of plans(seed,80))for(let tick=0;tick<=600;tick+=30){const s=gateShape({...g,spawnTick:0},tick);assert(s.center-s.gap/2>=R.ceiling+18-1e-8);assert(s.center+s.gap/2<=R.floor-18+1e-8);assert(s.gap>=150-1e-8);}
});
test('Eight bounded candidates and fixed draws retain determinism; specialist footprints match actual phases',()=>{
 const state=new RouteState();let count=0;const random=()=>{count++;return .4;};let prev=360;
 for(let n=1;n<=100;n++){const g=gatePlan(n,prev,random,()=>.3,state,n-1);assert.equal(state.attempts,8);assert.equal(count,n*12);prev=g.baseCenter;}
 assert.equal(corridorAt(10),null);assert.equal(corridorAt(11),null);
 for(let n=12;n<=15;n++)assert.notEqual(corridorAt(n),null);
 assert.equal(corridorAt(16),null);assert.equal(securityKind(12),'trace');assert.equal(securityKind(20),'laser');
 const anchors=new Set(Array.from({length:1000},(_,i)=>Math.round(plans(i+1,30)[11].baseCenter)));assert(anchors.size>100);
 assert(R.traceLock+(464-R.playerX)/R.projectileSpeed>1.7);assert(R.laserWarning+R.laserCharge>=1.6);
 assert.deepEqual(plans(1234),plans(1234));
});
test('1000 consecutive-seed witnesses survive150 gates with120ms latency and>=10units clearance', {timeout:180000},async()=>{
 const started=performance.now(),evidence=[];let minClearance=Infinity;
 for(let seed=1;seed<=1000;seed++){
  const w=witness(seed);assert(w,`No clearance witness for seed${seed}`);minClearance=Math.min(minClearance,w.summary.minClearance);
  for(const s of w.summary.stats)assert(s.activeMs>=minimumActiveMs(s.gates));
  assert.equal(w.f.speed,310);assert(w.summary.phases.includes('trace:active')&&w.summary.phases.includes('laser:active'));
  evidence.push({seed,choice:w.choice,minClearance:w.summary.minClearance});
 }
 await mkdir('/tmp/pf3-work',{recursive:true});await writeFile('/tmp/pf3-work/reachability-evidence.json',JSON.stringify({seeds:1000,gatesPerSeed:150,inputLatencyMs:120,minimumWitnessClearance:minClearance,elapsedMs:performance.now()-started,cases:CASES,witnesses:evidence}));
});
test('Long maximum-difficulty input replays reach1000 gates with adaptive input policies', {timeout:240000},async()=>{
 const evidence=[];
 for(const seed of[1,24,49,85,420,20261027]) {
  const goals=[136];for(let g=152;g<=1000;g+=16)goals.push(g);
  const stack=goals.map(goal=>({goal,next:0,result:null,choice:null}));let stage=0,attempts=0;
  while(stage<stack.length&&attempts<1200) {
    const current=stack[stage],prior=stage?stack[stage-1].result:null;
    const replay=prior?{ticks:prior.inputs,until:prior.stopTick}:null;
    let found=false;
    for(let i=current.next;i<CASES.length;i++) {
      attempts++;current.next=i+1;
      const result=play(Flight,seed,current.goal,{...CASES[i],latency:.12,replay,recordInputs:true});
      if(result.summary.gates===current.goal&&result.summary.minClearance>=10){current.result=result;current.choice=i;stage++;if(stage<stack.length){stack[stage].next=0;stack[stage].result=null;}found=true;break;}
    }
    if(!found){current.next=0;current.result=null;stage--;assert(stage>=0,`No initial witness seed${seed}`);}
  }
  assert.equal(stage,stack.length,`Bounded replay search exhausted seed${seed}`);
  const last=stack.at(-1).result,prefix={ticks:last.inputs,until:last.stopTick};
  const chosen=stack.map(s=>({goal:s.goal,choice:s.choice}));
  const replay=play(Flight,seed,1000,{replay:prefix,recordInputs:true});
  assert.equal(replay.f.gatesPassed,1000);assert.equal(replay.f.reason,'TIMEOUT');assert(replay.summary.minClearance>=10);
  for(const s of replay.summary.stats)assert(s.activeMs>=minimumActiveMs(s.gates));
  evidence.push({seed,attempts,stages:chosen,clearance:replay.summary.minClearance,inputTicks:prefix.ticks,duration:replay.f.time});
 }
 await writeFile('/tmp/pf3-work/long-witnesses.json',JSON.stringify(evidence));
});
test('Versioned minimum-time bound follows actual spawn distance and cannot be bypassed by points',()=>{
 const w=witness(24,80,5);assert(w);let lastTime=0;
 for(const s of w.summary.stats){assert(s.activeMs>=minimumActiveMs(s.gates));assert(s.time>lastTime);lastTime=s.time;if(s.gates>=28)assert(Math.abs(s.spawnInterval-1.15)<.01);}
 assert(minimumActiveMs(1000)<R.maxActiveMs);assert(old.minimumActiveMs(1000)>old.RULES.maxActiveMs);
 const a=play(Flight,dailySeed('2026-10-11'),30,{tapInterval:.14}),b=play(Flight,dailySeed('2026-10-11'),30,{tapInterval:.14,collect:true});
 assert.equal(a.summary.gates,30);assert.equal(b.summary.gates,30);assert(b.f.fragments>0);assert.notEqual(a.f.score,b.f.score);
 assert.deepEqual(a.summary.stats.map(s=>[s.speed,s.baseCenter,s.baseGap,s.spawnTick]),b.summary.stats.map(s=>[s.speed,s.baseCenter,s.baseGap,s.spawnTick]));
});
test('Local pf-2 archives retain values/identity/settings without copying bests into pf-3',()=>{
 const storage=memoryStorage(),legacy={normal:192,daily:{'2026-10-27':86},highest:50,skin:'root',muted:true,playerId:'12345678-1234-4234-8234-123456789abc',stats:{runs:9,gates:84,points:1920,fragments:10},legacy:{version:'pf-1',normal:42,daily:{}}};
 const key='tr1stan.packet-flight.pf-2.storage-1',raw=JSON.stringify(legacy);storage.setItem(key,raw);
 const current=new Records(storage);assert.equal(current.data.normal,0);assert.deepEqual(current.data.daily,{});assert.equal(current.data.archives['pf-2'].normal,192);assert.equal(current.data.archives['pf-2'].daily['2026-10-27'],86);
 assert.equal(current.data.highest,50);assert.equal(current.data.skin,'root');assert.equal(current.data.muted,true);assert.equal(current.data.playerId,legacy.playerId);assert.equal(current.data.legacy.normal,42);assert.equal(storage.getItem(key),raw);
 current.record('normal','',20,2,0);const again=new Records(storage);assert.equal(again.data.normal,20);assert.equal(again.data.archives['pf-2'].normal,192);assert.equal(storage.getItem(key),raw);assert.equal(STORAGE_KEY,'tr1stan.packet-flight.pf-3.storage-1');assert.equal(CHOICE_KEY,'tr1stan.packet-flight.storage-choice-1');
});
test('Missing archives do not create undefined entries during explicit persistence choice',()=>{
 const a=new Records(memoryStorage()),b=new Records(memoryStorage());mergeRecords(a,b);assert.deepEqual(a.data.archives,{});
});
