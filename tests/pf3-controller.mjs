import {gateShape} from '../game/pf3/world.mjs';
// Test-only input decisions. Never writes Flight fields, clocks, seeds or scores.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function targetHeight(f,collect=false,policy={}) {
  const g=f.gates.find(g=>!g.passed), h=f.hazard;
  const threatFree=!h || (h.kind==='trace'&&h.fired&&!f.projectiles.some(p=>p.x+p.width/2>109)) || (h.kind==='laser'&&h.phase==='fading');
  let target=g?.center??360;
  const following=f.gates.find(next=>g&&next.ordinal===g.ordinal+1);
  if(g&&following&&g.x<220&&threatFree) target=following.center;
  if(collect&&g?.fragment&&g.x<220&&threatFree) target=g.baseCenter+g.fragmentOffset;
  const lo=g?g.center-g.gap/2+9+(policy.low??60):100, hi=g?g.center+g.gap/2-9-(policy.high??35):610;
  target=clamp(target,lo+3,hi-3);
  if(h?.kind==='trace'&&h.locked!==null&&(!h.fired||f.projectiles.some(p=>p.x+p.width/2>109))) target=clamp(h.locked+(h.locked>=h.anchor?-(policy.escape??80):(policy.escape??80)),lo+3,hi-3);
  if(h?.kind==='laser' && h.phase!=='fading') target=clamp(h.target-h.side*75,lo+5,hi-5);
  const fragment=f.gates.find(g=>g.passed&&g.fragment&&!g.resolved);
  if(collect&&fragment&&!h&&g&&g.x>240) target=clamp(fragment.baseCenter+fragment.fragmentOffset,80,630);
  return target;
}
export function shouldFlap(f,collect=false,policy={}) {
 const target=targetHeight(f,collect,policy);
 return !f.dead && (f.y>target+55 ? f.vy>-240 : f.y>target+(policy.threshold??15) && f.vy>0);
}
export function preview(f,seconds) {
 const ticks=f.ticks+Math.round(seconds*120);
 return {...f,y:f.y+f.vy*seconds+450*seconds*seconds,vy:Math.min(520,f.vy+900*seconds),gates:f.gates.map(g=>{const x=g.x-f.speed*seconds;return{...g,...gateShape(g,ticks),x,passed:g.passed||x+64<109}})};
}
export function play(Flight,seed,goal=80,{collect=false,reaction=0,tapInterval=.16,latency=0,policy={},replay=null,recordInputs=false,onStep=null}={}) {
 const f=new Flight(seed);let pending=null,nextTap=0,nextRead=0,decision=false,minClearance=Infinity,taps=0,maxCombo=0;
 const phases=new Set(),stats=[],inputs=[];
 const replayTicks=replay?new Set(replay.ticks):null;
 for(let tick=0;tick<400000&&!f.dead&&f.gatesPassed<goal;tick++) {
  const time=f.time;
  let apply=false;
  if(replay&&f.ticks<replay.until) apply=replayTicks.has(f.ticks);
  else {
    if(time>=nextRead) {decision=shouldFlap(latency?preview(f,latency):f,collect,policy);nextRead=time+reaction;}
    if(decision&&pending===null&&time>=nextTap)pending=time+latency;
    if(pending!==null&&time>=pending){apply=true;pending=null;}
  }
  if(apply){if(recordInputs)inputs.push(f.ticks);f.flap();nextTap=time+tapInterval;taps++;}
  f.step();if(onStep)onStep(f);f.drainEvents();minClearance=Math.min(minClearance,f.y-9-40,672-f.y-9);maxCombo=Math.max(maxCombo,f.combo);
  if(f.hazard)phases.add(`${f.hazard.kind}:${f.hazard.phase}`);
  for(const g of f.gates) if(120+11>g.x&&120-11<g.x+64)minClearance=Math.min(minClearance,g.gap/2-Math.abs(f.y-g.center)-9);
  for(const p of f.projectiles)if(p.x-p.width/2<131&&p.x+p.width/2>109)minClearance=Math.min(minClearance,Math.abs(f.y-p.y)-9-p.height/2);
  if(f.hazard?.kind==='laser'&&f.hazard.phase==='active')minClearance=Math.min(minClearance,Math.abs(f.y-f.hazard.beamY)-17);
  if(stats.length<f.gatesPassed) {
    const g=f.gates.find(g=>g.ordinal===f.gatesPassed),last=stats.at(-1);
    stats.push({gates:f.gatesPassed,speed:f.speed,time:f.time,activeMs:f.activeMs,center:g.center,baseCenter:g.baseCenter,gap:g.gap,baseGap:g.baseGap,type:g.type,spawnTick:g.spawnTick,spawnInterval:last?(g.spawnTick-last.spawnTick)/120:null,targetInterval:g.interval});
  }
 }
 return {f,inputs,stopTick:f.ticks,summary:{seed,gates:f.gatesPassed,score:f.score,fragments:f.fragments,reason:f.reason,minClearance,taps,maxCombo,phases:[...phases],stats}};
}
