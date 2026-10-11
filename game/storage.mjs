import { VERSION, SKINS, validPlayerId } from './rules.mjs';
export const STORAGE_KEY = `tr1stan.packet-flight.${VERSION}.storage-1`;
function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // Identification is pseudonymous, never a credential. API refuses non-UUID IDs.
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.random() * 256;
  bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128;
  const h = [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
const scoreValue = n => Number.isInteger(n) && n >= 0 && n <= 1000 ? n : 0;
export class Records {
  constructor(storage, onWarning = () => {}, sessionStorage = null) {
    this.storage = storage; this.onWarning = onWarning; this.persistent = true;
    this.fallback = sessionStorage; this.session = false;
    this.data = { normal: 0, daily: {}, highest: 0, muted: false, skin: 'packet', playerId: newId() };
    try {
      let raw;
      try { raw = storage.getItem(STORAGE_KEY); }
      catch {
        this.storage = this.fallback; this.session = true;
        this.warn('Dauerhafter Spielspeicher ist blockiert. Werte gelten nur für diese Sitzung.');
        raw = this.storage?.getItem(STORAGE_KEY);
      }
      if (raw) {
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid storage');
        this.data.normal = scoreValue(data.normal);
        if (data.daily && typeof data.daily === 'object') for (const [day, value] of Object.entries(data.daily)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(day)) this.data.daily[day] = scoreValue(value);
        }
        this.data.highest = Math.max(scoreValue(data.highest), this.data.normal, ...Object.values(this.data.daily));
        this.data.muted = data.muted === true;
        if (validPlayerId(data.playerId)) this.data.playerId = data.playerId;
        if (SKINS.some(s => s.id === data.skin && this.data.highest >= s.at)) this.data.skin = data.skin;
      }
    } catch { this.onWarning('Beschädigte Spielwerte wurden sicher zurückgesetzt.'); }
    this.save();
  }
  warn(message) { this.persistent = false; this.onWarning(message); }
  save() {
    // Retain the most recent 90 local Daily days; unlock progress remains permanent.
    const days = Object.keys(this.data.daily).sort().reverse();
    for (const day of days.slice(90)) delete this.data.daily[day];
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.persistent = !this.session;
    } catch {
      if (!this.session && this.fallback) {
        this.storage = this.fallback; this.session = true;
        try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch {}
      }
      this.warn('Rekorde und Einstellungen bleiben nur in dieser Sitzung; dauerhafter Spielspeicher ist nicht verfügbar.');
    }
  }
  best(mode, day) { return mode === 'daily' ? this.data.daily[day] || 0 : this.data.normal; }
  record(mode, day, score) {
    const previous = this.best(mode, day);
    if (mode === 'daily') this.data.daily[day] = Math.max(previous, score);
    else this.data.normal = Math.max(previous, score);
    const unlocked = SKINS.filter(s => s.at > this.data.highest && score >= s.at).map(s => s.name);
    this.data.highest = Math.max(this.data.highest, score); this.save();
    return { best: this.best(mode, day), newRecord: score > previous, unlocked };
  }
  setMuted(value) { this.data.muted = value; this.save(); }
  selectSkin(id) {
    if (!SKINS.some(s => s.id === id && this.data.highest >= s.at)) return false;
    this.data.skin = id; this.save(); return true;
  }
}
