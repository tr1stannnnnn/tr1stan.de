import { RULES as R } from './rules.mjs?v=pf2-privacy1';
const text = (c, value, x, y) => { c.font = '600 10px "JetBrains Mono", monospace'; c.fillText(value, x, y); };
export function fragments(c, flight, alpha, reduced) {
  for (const g of flight.gates) {
    if (!g.fragment || g.resolved) continue;
    const x = g.previousX + (g.x-g.previousX)*alpha + R.gateWidth + R.fragmentBehind;
    const y = g.baseCenter + g.fragmentOffset;
    c.save(); c.translate(x,y); c.rotate(Math.PI/4); c.fillStyle='#151f35'; c.strokeStyle='#f2ce8c'; c.lineWidth=1.5;
    c.shadowColor='#f2ce8c'; c.shadowBlur=reduced?0:6; c.fillRect(-6,-6,12,12); c.strokeRect(-6,-6,12,12); c.shadowBlur=0;
    c.fillStyle='#f6e0b1'; c.fillRect(-2,-2,4,4); c.restore();
    c.fillStyle='#d3b681'; c.font='8px "JetBrains Mono",monospace'; c.fillText('DATA',x-10,y-14);
  }
}
export function security(c, flight, alpha, reduced) {
  const h=flight.hazard;
  if (h) {
    const trace=h.kind==='trace', active=h.phase==='active', target=trace?(h.locked??h.target):h.target;
    const color=active?'#ff887d':h.phase==='locked'||h.phase==='charging'?'#f1be83':'#9fc9e0';
    c.save(); c.strokeStyle=color; c.fillStyle=color;
    if (trace) {
      const x=432, y=Math.max(85,Math.min(590,target));
      c.save(); c.translate(x,y);
      const wing=reduced?0:Math.sin(flight.time*5)*3;
      c.fillStyle='#182238'; c.lineWidth=1.8;
      c.beginPath(); c.moveTo(-21,-5); c.lineTo(-12,-17-wing); c.lineTo(-3,-9); c.lineTo(15,-7); c.lineTo(23,0);
      c.lineTo(15,7); c.lineTo(-3,9); c.lineTo(-12,17+wing); c.lineTo(-21,5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle=color; c.fillRect(-5,-3,13,6); c.fillStyle='#081021'; c.fillRect(-2,-1,7,2);
      c.strokeStyle='#7883ac'; c.beginPath(); c.moveTo(-15,-6); c.lineTo(-9,0); c.lineTo(-15,6); c.stroke(); c.restore();
      c.fillStyle=color; text(c,'TRACE//UNIT',353,y-30);
      if (h.phase!=='warning') {
        c.setLineDash(h.phase==='tracking'?[3,8]:[8,5]); c.globalAlpha=.65;
        c.beginPath(); c.moveTo(20,target); c.lineTo(405,target); c.stroke(); c.setLineDash([]); c.globalAlpha=1;
        c.strokeRect(R.playerX-19,target-17,38,34);
      }
      const label={warning:'TRACE DETECTED',tracking:'ACQUIRING / DODGE AFTER LOCK',locked:'LOCKED / EVADE',active:'SHOT / HEIGHT FIXED'}[h.phase];
      text(c,label,19,66);
      if (h.locked!==null) { c.fillStyle='#9ee8ce'; text(c,target>=360?'SAFE ROUTE / UP':'SAFE ROUTE / DOWN',19,83); }
    } else {
      const fading=h.phase==='fading'; c.globalAlpha=fading?.3:1;
      if (!active) {
        c.globalAlpha=fading?.12:.07; c.fillRect(0,target-24,480,48); c.globalAlpha=fading?.3:.8;
        c.setLineDash([7,6]); c.beginPath(); c.moveTo(0,target-24); c.lineTo(480,target-24); c.moveTo(0,target+24); c.lineTo(480,target+24); c.stroke(); c.setLineDash([]);
      } else {
        c.fillStyle='#f1827b'; c.fillRect(0,h.beamY-8,480,16);
        c.fillStyle='#fff0ce'; c.fillRect(0,h.beamY-2,480,4);
      }
      c.globalAlpha=1; c.fillStyle=color;
      text(c,{warning:'SWEEPER / WARNING',charging:'LASER CHARGING',active:'LASER ACTIVE',fading:'LASER COOLING'}[h.phase],19,66);
      c.fillStyle='#9ee8ce'; text(c,h.side>0?'SAFE ROUTE / UP':'SAFE ROUTE / DOWN',19,83);
      // Emitters distinguish the warned zone from a decorative grid line.
      for (const x of [0,466]) { c.fillStyle='#2e2735'; c.fillRect(x,target-31,14,62); c.strokeStyle=color; c.strokeRect(x+.5,target-30.5,13,61); }
    }
    c.restore();
  }
  for (const p of flight.projectiles) {
    const x=p.previousX+(p.x-p.previousX)*alpha;
    c.fillStyle='#ff887d'; c.fillRect(x-p.width/2,p.y-p.height/2,p.width,p.height);
    c.fillStyle='#fff1d1'; c.fillRect(x-p.width/2,p.y-1,p.width-9,2);
  }
}
