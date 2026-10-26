export class Sound {
  constructor(muted = false) { this.muted = muted; this.context = null; this.failed = false; }
  async unlock() {
    if (this.failed) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      if (!this.context) this.context = new Audio();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { this.failed = true; }
  }
  play(kind) {
    if (this.muted || !this.context || this.context.state !== 'running' || this.failed) return;
    try {
      const c = this.context, now = c.currentTime;
      const osc = c.createOscillator(), gain = c.createGain();
      osc.type = 'triangle';
      const tones = { flap: [240, 480, .07], point: [600, 900, .12], end: [180, 55, .25],
        fragment: [1000, 1400, .09], alarm: [160, 220, .18], warning: [350, 290, .16], lock: [720, 720, .1], fire: [1600, 170, .12] };
      const [from, to, length] = tones[kind] || tones.flap;
      osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + length);
      gain.gain.setValueAtTime(.035, now); gain.gain.exponentialRampToValueAtTime(.001, now + length);
      osc.connect(gain); gain.connect(c.destination); osc.start(now); osc.stop(now + length);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch { this.failed = true; }
  }
}
