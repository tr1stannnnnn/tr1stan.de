import { RULES as R, SKINS } from './rules.mjs';
export class Renderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.scale = 1; this.resize(); }
  resize() {
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const width = Math.max(1, this.canvas.getBoundingClientRect().width);
    this.scale = Math.min(2, width / R.width * dpr);
    this.canvas.width = Math.round(R.width * this.scale);
    this.canvas.height = Math.round(R.height * this.scale);
  }
  draw(flight, { alpha = 1, skin = 'packet', motion = true } = {}) {
    const c = this.ctx; if (!c) return;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const sky = c.createLinearGradient(0, 0, 0, R.height);
    sky.addColorStop(0, '#06020C'); sky.addColorStop(.68, '#2F0B46'); sky.addColorStop(1, '#0B0316');
    c.fillStyle = sky; c.fillRect(0, 0, R.width, R.height);
    c.fillStyle = '#F5D0FE';
    for (let i = 0; i < 38; i++) {
      c.globalAlpha = .3 + (i % 3) * .15;
      c.fillRect((i * 137 + 27) % R.width, (i * 79 + 17) % 400, 1.5, 1.5);
    }
    c.globalAlpha = 1;
    const sun = c.createLinearGradient(0, 402, 0, 526);
    sun.addColorStop(0, '#FDA4D3'); sun.addColorStop(1, '#C026D3');
    c.save(); c.beginPath(); c.arc(350, 470, 63, 0, Math.PI * 2); c.clip();
    c.fillStyle = sun; c.globalAlpha = .5; c.fillRect(287, 407, 126, 126);
    c.fillStyle = '#2F0B46'; for (let y = 468; y < 535; y += 12) c.fillRect(280, y, 145, 5);
    c.restore();
    c.fillStyle = '#12051f'; c.strokeStyle = '#C084FC'; c.globalAlpha = .55;
    c.beginPath(); c.moveTo(0, 567);
    for (let i = 0; i < 12; i++) c.lineTo(i * 48, 516 - (i * 37 % 88));
    c.lineTo(480, 570); c.lineTo(0, 570); c.fill(); c.stroke();
    c.globalAlpha = .22; c.strokeStyle = '#E879F9';
    const offset = motion ? (flight.ticks * R.step * 18) % 24 : 0;
    for (let i = -6; i <= 6; i++) {
      c.beginPath(); c.moveTo(240 + i * 16, 570); c.lineTo(240 + i * 115, 720); c.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const y = 570 + (i * 24 + offset) ** 1.3 / 4;
      c.beginPath(); c.moveTo(0, y); c.lineTo(480, y); c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = '#0B0316'; c.fillRect(0, R.floor, 480, 48); c.fillRect(0, 0, 480, R.ceiling);
    c.strokeStyle = '#C084FC'; c.beginPath(); c.moveTo(0, R.floor); c.lineTo(480, R.floor); c.stroke();
    c.globalAlpha = .5; c.beginPath(); c.moveTo(0, R.ceiling); c.lineTo(480, R.ceiling); c.stroke(); c.globalAlpha = 1;
    for (const gate of flight.gates) {
      const x = gate.previousX + (gate.x - gate.previousX) * alpha;
      for (const [y, height] of [[R.ceiling, gate.center - gate.gap / 2 - R.ceiling], [gate.center + gate.gap / 2, R.floor - (gate.center + gate.gap / 2)]]) {
        c.fillStyle = '#170727'; c.strokeStyle = '#E879F9'; c.lineWidth = 2;
        c.fillRect(x, y, R.gateWidth, height); c.strokeRect(x + 1, y + 1, R.gateWidth - 2, height - 2);
        c.fillStyle = '#F5D0FE';
        for (let row = y + 16; row < y + height - 8; row += 22) {
          c.globalAlpha = .3; c.fillRect(x + 10, row, 24, 2); c.fillRect(x + 42, row, 10, 2);
        }
        c.globalAlpha = 1;
      }
    }
    const color = SKINS.find(s => s.id === skin)?.color || SKINS[0].color;
    c.save(); c.translate(R.playerX, flight.previousY + (flight.y - flight.previousY) * alpha);
    if (motion) c.rotate(Math.max(-.25, Math.min(.45, flight.vy / 1000)));
    c.shadowColor = color; c.shadowBlur = 12; c.fillStyle = '#240a37'; c.strokeStyle = color; c.lineWidth = 2;
    c.fillRect(-15, -12, 30, 24); c.strokeRect(-15, -12, 30, 24);
    c.shadowBlur = 0; c.fillStyle = color;
    c.fillRect(-8, -5, 4, 4); c.fillRect(4, -5, 4, 4); c.fillRect(-6, 4, 12, 2);
    c.globalAlpha = .7;
    if (skin === 'router') { c.fillRect(-19, -7, 3, 14); c.fillRect(17, -7, 3, 14); }
    if (skin === 'admin') { c.fillRect(-10, -17, 20, 3); c.fillRect(-10, 15, 20, 3); }
    if (skin === 'root') { c.fillRect(-9, -17, 3, 4); c.fillRect(-1, -19, 3, 6); c.fillRect(7, -17, 3, 4); }
    c.restore();
  }
}
