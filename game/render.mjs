import { fragments, security } from './security-render.mjs?v=pf2';
import { RULES as R, SKINS } from './rules.mjs?v=pf2';
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const colorOf = skin => SKINS.find(s => s.id === skin)?.color || SKINS[0].color;
function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function hull(c) {
  c.beginPath(); c.moveTo(-14, -6); c.lineTo(-9, -11); c.lineTo(9, -11); c.lineTo(15, -5);
  c.lineTo(15, 6); c.lineTo(9, 11); c.lineTo(-9, 11); c.lineTo(-14, 5); c.closePath();
}

export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.scale = 1; this.resize(); }
  resize() {
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const width = Math.max(1, this.canvas.getBoundingClientRect().width);
    this.scale = Math.min(2, width / R.width * dpr);
    const pixelWidth = Math.round(R.width * this.scale), pixelHeight = Math.round(R.height * this.scale);
    // Reassigning canvas dimensions clears its pixels, even when unchanged.
    // Height-only browser chrome/viewport changes must preserve a paused frame.
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
  }
  background(c, phase) {
    const sky = c.createLinearGradient(0, 0, 0, R.height);
    sky.addColorStop(0, '#080d24'); sky.addColorStop(.48, '#171632'); sky.addColorStop(.72, '#341438'); sky.addColorStop(1, '#080c1b');
    c.fillStyle = sky; c.fillRect(0, 0, R.width, R.height);
    const atmosphere = c.createRadialGradient(320, 315, 20, 320, 315, 245);
    atmosphere.addColorStop(0, '#b9338328'); atmosphere.addColorStop(1, '#b9338300');
    c.fillStyle = atmosphere; c.fillRect(0, 40, 480, 570);
    c.fillStyle = '#bed0f2';
    for (let i = 0; i < 52; i++) {
      c.globalAlpha = .12 + (i % 4) * .06;
      c.fillRect((i * 137 + 27 - phase * 1.6 + 4800) % 480, (i * 79 + 67) % 425 + 42, i % 7 === 0 ? 2 : 1, 1);
    }
    c.globalAlpha = .12; c.strokeStyle = '#4cbfcf'; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const x = 24 + i * 142;
      c.beginPath(); c.moveTo(x, 97 + i * 28); c.lineTo(x + 32, 97 + i * 28); c.lineTo(x + 49, 114 + i * 28); c.lineTo(x + 98, 114 + i * 28); c.stroke();
      c.fillRect(x + 97, 112 + i * 28, 3, 3);
    }
    c.globalAlpha = 1;
    const sun = c.createLinearGradient(0, 227, 0, 393);
    sun.addColorStop(0, '#f8b995'); sun.addColorStop(.45, '#e77eae'); sun.addColorStop(1, '#a747a8');
    c.save(); c.beginPath(); c.arc(320, 310, 83, 0, TAU); c.clip();
    c.globalAlpha = .72; c.fillStyle = sun; c.fillRect(235, 225, 170, 170);
    c.fillStyle = '#24152f';
    for (let i = 0; i < 10; i++) c.fillRect(232, 306 + i * 10, 176, 1 + i * .65);
    c.restore();
    c.strokeStyle = '#f2a6c533'; c.lineWidth = 1;
    c.beginPath(); c.arc(320, 310, 95, -.8, .55); c.stroke();
    c.beginPath(); c.arc(320, 310, 95, 2.15, 3.7); c.stroke();
    // Distant wireframes: muted, fine lines, clearly behind the play objects.
    this.mountains(c, phase * 4, 480, '#13192b', '#6974aa', .28);
    const serverShift = phase * 8, serverOffset = serverShift % 56;
    for (let i = -1; i < 11; i++) {
      const x = i * 56 - serverOffset, h = 36 + ((i + Math.floor(serverShift / 56) + 24) * 31 % 77);
      c.fillStyle = '#0c1523'; c.globalAlpha = .55; c.fillRect(x, 526 - h, 28, h);
      c.strokeStyle = '#516785'; c.globalAlpha = .19; c.strokeRect(x + .5, 526 - h + .5, 27, h - 1);
      for (let y = 538 - h; y < 518; y += 12) {
        c.fillStyle = '#658598'; c.fillRect(x + 5, y, 16, 1);
        c.fillStyle = '#55cee0'; c.fillRect(x + 21, y - 2, 2, 2);
      }
    }
    this.mountains(c, phase * 13, 523, '#101326', '#945aa4', .36);
    c.globalAlpha = .22; c.strokeStyle = '#ad5aae'; line(c, 0, 523, 480, 523);
    const ground = c.createLinearGradient(0, 523, 0, 720);
    ground.addColorStop(0, '#16182c'); ground.addColorStop(1, '#090e1d'); c.globalAlpha = 1;
    c.fillStyle = ground; c.fillRect(0, 524, 480, 196);
    c.lineWidth = 1; c.strokeStyle = '#467489'; c.globalAlpha = .3;
    for (let i = -10; i <= 10; i++) line(c, 300 + i * 8, 524, 300 + i * 94, 720);
    c.strokeStyle = '#995199'; c.globalAlpha = .28;
    for (let i = 0; i < 10; i++) {
      const depth = ((i + phase * .65) % 10) / 10;
      const y = 524 + depth * depth * 196; line(c, 0, y, 480, y);
    }
    for (let i = 0; i < 3; i++) {
      const depth = (phase * .13 + i * .31) % 1, y = 524 + depth * depth * 148;
      const lane = [-3, 1, 4][i], x = 300 + lane * 8 + lane * 86 * (y - 524) / 196;
      c.globalAlpha = Math.sin(depth * Math.PI) * .42; c.fillStyle = '#73d6e1'; c.fillRect(x - 2, y - 1, 4, 2);
    }
    c.globalAlpha = 1;
    const vignette = c.createRadialGradient(240, 330, 125, 240, 330, 430);
    vignette.addColorStop(0, '#03071400'); vignette.addColorStop(1, '#03071470'); c.fillStyle = vignette; c.fillRect(0, 40, 480, 632);
  }
  mountains(c, offset, base, fill, stroke, opacity) {
    offset %= 640;
    const heights = [22, 85, 42, 126, 65, 30, 101, 49];
    const peaks = Array.from({ length: 19 }, (_, n) => { const i = n - 4; return [i * 80 - offset, base - heights[(i + 32) % 8]]; });
    c.globalAlpha = .85; c.fillStyle = fill;
    c.beginPath(); c.moveTo(peaks[0][0], base); for (const [x, y] of peaks) c.lineTo(x, y); c.lineTo(peaks.at(-1)[0], base); c.closePath(); c.fill();
    c.strokeStyle = stroke; c.lineWidth = 1; c.globalAlpha = opacity;
    c.beginPath(); for (const [i, [x, y]] of peaks.entries()) { if (!i) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    for (const [x, y] of peaks) { line(c, x, y, x - 48, base); line(c, x, y, x + 58, base); }
    c.globalAlpha = 1;
  }
  gate(c, gate, alpha, flash) {
    const x = gate.previousX + (gate.x - gate.previousX) * alpha;
    const center = (gate.previousCenter ?? gate.center) + (gate.center - (gate.previousCenter ?? gate.center)) * alpha;
    const gap = (gate.previousGap ?? gate.gap) + (gate.gap - (gate.previousGap ?? gate.gap)) * alpha;
    const glow = flash ? 1 - flash.age / flash.life : 0;
    for (const [y, height, top] of [[R.ceiling, center - gap / 2 - R.ceiling, true], [center + gap / 2, R.floor - center - gap / 2, false]]) {
      c.save(); c.beginPath(); c.moveTo(x + 5, y); c.lineTo(x + 59, y); c.lineTo(x + 64, y + 5);
      c.lineTo(x + 64, y + height - 5); c.lineTo(x + 59, y + height); c.lineTo(x + 5, y + height); c.lineTo(x, y + height - 5); c.lineTo(x, y + 5); c.closePath();
      const shell = c.createLinearGradient(x, 0, x + 64, 0); shell.addColorStop(0, '#162436'); shell.addColorStop(.3, '#111729'); shell.addColorStop(1, '#25142e');
      c.fillStyle = shell; c.fill(); c.strokeStyle = glow > 0 ? '#89f2e9' : '#8c5aa8'; c.lineWidth = 1.5; c.stroke(); c.clip();
      c.strokeStyle = '#466b80'; c.lineWidth = 1; c.globalAlpha = .65;
      c.beginPath(); c.moveTo(x + 13, y + 12); c.lineTo(x + 13, y + height * .45); c.lineTo(x + 24, y + height * .45 + 11); c.lineTo(x + 24, y + height - 16); c.stroke();
      c.beginPath(); c.moveTo(x + 46, y + 17); c.lineTo(x + 46, y + height * .65); c.lineTo(x + 38, y + height * .65 + 8); c.lineTo(x + 38, y + height - 18); c.stroke();
      for (let row = y + 23; row < y + height - 18; row += 43) {
        c.fillStyle = '#718da0'; c.fillRect(x + 31, row, 15, 2); c.fillRect(x + 31, row + 5, 9, 1);
        c.fillStyle = '#67c9d5'; c.fillRect(x + 8, row, 3, 3);
        c.fillStyle = '#c57bab'; c.fillRect(x + 52, row + 7, 2, 7);
      }
      c.globalAlpha = 1;
      const edge = top ? y + height : y;
      c.fillStyle = glow > 0 ? '#92f5de' : top ? '#74dce8' : '#e28cbc';
      c.shadowColor = c.fillStyle; c.shadowBlur = 4 + glow * 6; c.fillRect(x, top ? edge - 3 : edge, 64, 3); c.shadowBlur = 0;
      c.fillStyle = '#c2cee4'; c.globalAlpha = .65; c.font = '8px "JetBrains Mono", monospace';
      if (height > 48) c.fillText(gate.type === 'moving' ? 'MOVE / ~' : gate.type === 'compress' ? 'CLAMP / !' : top ? 'IN / 01' : 'OUT / 01', x + 9, top ? edge - 12 : edge + 20);
      c.restore();
      c.strokeStyle = glow > 0 ? '#92f5de' : '#8b72b9'; c.lineWidth = 1;
      line(c, x - 4, top ? edge - 9 : edge + 9, x - 4, edge);
      line(c, x + 68, edge, x + 68, top ? edge - 9 : edge + 9);
    }
  }
  drawEffects(c, effects, reduced) {
    if (!effects) return;
    for (const item of effects.trail) {
      c.save(); c.globalAlpha = (1 - item.age / item.life) * .22;
      c.translate(item.x - item.age * 65, item.y); c.rotate(item.angle); c.strokeStyle = item.color; c.lineWidth = 1; hull(c); c.stroke(); c.restore();
    }
    for (const item of effects.rings) {
      c.globalAlpha = (1 - item.age / item.life) * .55; c.strokeStyle = item.color; c.lineWidth = 1.5;
      c.beginPath(); c.arc(item.x, item.y, 15 + item.age * 78, 0, TAU); c.stroke();
    }
    for (const item of effects.particles) {
      c.save(); c.globalAlpha = 1 - item.age / item.life;
      c.translate(item.x + item.vx * item.age, item.y + item.vy * item.age + 90 * item.age ** 2);
      c.rotate(item.age * 3); c.fillStyle = item.color; c.fillRect(-item.size / 2, -item.size / 2, item.size, item.size); c.restore();
    }
    for (const item of effects.labels) {
      c.globalAlpha = 1 - item.age / item.life; c.fillStyle = item.color; c.font = '600 17px "JetBrains Mono", monospace';
      c.fillText(`+${item.value || 10}`, item.x, item.y - (reduced ? 0 : item.age * 28));
    }
    c.globalAlpha = 1;
  }
  player(c, flight, alpha, skin, effects, reduced) {
    if (effects?.broken) return;
    const color = colorOf(skin), age = effects ? effects.time - effects.flapAt : 1;
    const impulse = clamp(1 - age / .17, 0, 1);
    c.save(); c.translate(R.playerX, flight.previousY + (flight.y - flight.previousY) * alpha);
    if (!reduced) { c.rotate(clamp(flight.vy / 850, -.3, .55)); c.scale(1 + impulse * .17, 1 - impulse * .15); }
    c.fillStyle = '#182338'; c.strokeStyle = color; c.lineWidth = 1.7; c.shadowColor = color; c.shadowBlur = 5 + impulse * 9;
    hull(c); c.fill(); c.stroke(); c.shadowBlur = 0;
    c.fillStyle = '#090e21'; c.fillRect(-8, -6, 16, 12);
    c.fillStyle = '#6ce5ef'; c.globalAlpha = .8; c.fillRect(-5, -3, 9, 2); c.fillRect(-5, 1, 6, 2);
    c.fillStyle = color; c.globalAlpha = 1; c.fillRect(10, -3, 2, 6);
    c.strokeStyle = color; c.lineWidth = 1; line(c, -18, -6, -18, 6); line(c, -17, 0, -14, 0);
    if (impulse > 0) {
      c.globalAlpha = impulse * .9; c.fillStyle = color;
      c.beginPath(); c.moveTo(-16, -4); c.lineTo(-26 - impulse * 9, 0); c.lineTo(-16, 4); c.closePath(); c.fill();
    }
    c.globalAlpha = .8;
    if (skin === 'router') { c.fillRect(-7, -14, 3, 2); c.fillRect(4, 12, 3, 2); }
    if (skin === 'admin') { c.fillRect(-7, -14, 15, 2); c.fillRect(-7, 12, 15, 2); }
    if (skin === 'root') { for (let i = -6; i <= 6; i += 6) c.fillRect(i, -15 - (i === 0 ? 2 : 0), 2, 4); }
    c.restore();
  }
  draw(flight, { alpha = 1, skin = 'packet', reduced = false, effects = null, mode = 'normal' } = {}) {
    const c = this.ctx; if (!c) return;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0); c.globalAlpha = 1;
    this.background(c, reduced ? 0 : flight.ticks * R.step);
    if (flight.alarm) { c.fillStyle = ['', '#4c2c4310', '#7e3b3012', '#983d2917'][flight.alarm]; c.fillRect(0,40,480,632); }
    // Vignette stays behind gates/player; no scanline overlay on play elements.
    for (const gate of flight.gates) this.gate(c, gate, alpha, effects?.gates.find(item => item.gate === gate));
    fragments(c, flight, alpha, reduced); security(c, flight, alpha, reduced);
    this.drawEffects(c, effects, reduced); this.player(c, flight, alpha, skin, effects, reduced);
    c.fillStyle = '#090e1dee'; c.fillRect(0, 0, 480, R.ceiling); c.fillRect(0, R.floor, 480, 48);
    c.lineWidth = 1; c.strokeStyle = '#61709966'; line(c, 0, R.ceiling, 480, R.ceiling);
    c.strokeStyle = '#65d5df66'; line(c, 0, R.floor, 480, R.floor);
    c.fillStyle = '#76859f'; c.font = '10px "JetBrains Mono", monospace';
    c.fillText(mode === 'daily' ? 'DAILY / UTC' : 'NORMAL / UPLINK', 18, 25);
    c.textAlign = 'right'; c.fillText('STOLEN PAYLOAD', 462, 25); c.textAlign = 'left';
    c.fillText('NET / TUNNEL 01', 18, 701); c.fillStyle = '#6acbd4';
    for (let i = 0; i < 5; i++) c.fillRect(410 + i * 9, 692, 4, 7 + i % 2 * 3);
  }
}
