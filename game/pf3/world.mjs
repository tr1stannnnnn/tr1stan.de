import { RULES as R, difficulty } from './rules.mjs?v=pf3-1';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const MOTIFS = [[1,1,-1],[-1,-1,1],[1,-1,-1],[-1,1,1],[1,1,-1,-1],[-1,-1,1,1],[1,-1,1,1],[-1,1,-1,-1]];
export function securityKind(ordinal) {
  if (ordinal >= 12 && ordinal % 16 === 12) return 'trace';
  if (ordinal >= 20 && ordinal % 16 === 4) return 'laser';
  return '';
}
export function corridorAt(ordinal) {
  for(let distance=0;distance<=3;distance++) { const kind=securityKind(ordinal-distance);if(kind&&(kind==='trace'||distance<=2)) return distance; }
  return null;
}
export class RouteState {
  constructor() { this.motif=[];this.index=0;this.directions=[];this.anchor=360;this.side=1;this.attempts=0; }
}
export function gatePlan(ordinal, previous, random, enemyRandom, route=new RouteState(), progress=ordinal-1) {
  // Fixed, bounded draws. No rejection loop, player state or enemy targeting RNG
  // can change the Daily world stream. Eight ranked candidates at most.
  const draws=Array.from({length:12},()=>random()), enemySide=enemyRandom()<.5?-1:1;
  if(route.index>=route.motif.length) { route.motif=MOTIFS[Math.floor(draws[0]*MOTIFS.length)];route.index=0; }
  let direction=route.motif[route.index++];
  const p=difficulty(progress), phase=draws[1]*Math.PI*2;
  const corridor=corridorAt(ordinal), security=securityKind(ordinal);
  const type=corridor!==null || ordinal<=3?'static':ordinal>=6&&draws[2]<.23?'compress':ordinal===4||draws[2]<.66?'moving':'static';
  const amplitude=type==='moving'?14+8*Math.min(25,progress)/25:0;
  let baseGap=p.gap+(type==='compress'?R.closingAmplitude:0);
  const margin=R.halfHeight+18;
  const lo=R.ceiling+baseGap/2+amplitude+margin, hi=R.floor-baseGap/2-amplitude-margin;
  let center=previous,best=-Infinity;
  for(let i=0;i<8;i++) {
    const dir=i<4?direction:-direction, delta=100+draws[3+i]*70;
    let value=previous+dir*delta;
    if(value<lo || value>hi) value=previous-dir*delta;
    value=clamp(value,lo,hi);
    const actual=Math.sign(value-previous), recent=route.directions.slice(-4);
    const alternating=recent.length===4&&recent.every((d,j)=>j===0||d!==recent[j-1])&&actual!==recent.at(-1);
    const desired=100+draws[3]*70;
    const score=-Math.abs(Math.abs(value-previous)-desired)-(alternating?150:0)-(actual!==direction?15:0)-i*.01;
    if(score>best) {center=value;best=score;}
  }
  route.attempts=8;
  if(ordinal===1) center=336+draws[3]*32;
  if(corridor===0) { center=clamp(center,240,472);route.anchor=center;route.side=enemySide;baseGap=220; }
  else if(corridor!==null) {
    const kind=securityKind(ordinal-corridor);
    if(kind==='trace') {center=route.anchor;baseGap=corridor===1?210:205;}
    else if(corridor===1) {center=route.anchor-route.side*70;baseGap=190;}
    else center=clamp(center,route.anchor-route.side*70-70,route.anchor-route.side*70+70);
  }
  center=clamp(center,R.ceiling+baseGap/2+margin,R.floor-baseGap/2-margin);
  route.directions.push(Math.sign(center-previous));if(route.directions.length>5) route.directions.shift();
  return {ordinal,baseCenter:center,phase,type,security,enemySide,baseGap,amplitude,
    interval:p.interval,fragment:draws[11]<.8&&corridor===null,fragmentOffset:(draws[2]<.5?-1:1)*(42+draws[1]*18),corridor};
}
export function gateShape(gate,ticks) {
  const phase=gate.phase+(ticks-gate.spawnTick)*R.step*Math.PI*2/R.movingPeriod;
  return {center:gate.baseCenter+(gate.type==='moving'?Math.sin(phase)*gate.amplitude:0),gap:gate.baseGap-(gate.type==='compress'?(1+Math.sin(phase))*R.closingAmplitude/2:0)};
}
export function alarmPhase(gates) { return gates>=20?3:gates>=12?2:gates>=5?1:0; }
export const ALARMS=['GHOST ROUTE','FIREWALL ESCALATION','TRACE DETECTED','LOCKDOWN'];
