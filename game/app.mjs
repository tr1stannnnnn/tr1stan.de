import { VERSION, RULES, SKINS, rank, utcDay, dailySeed, validateAlias } from './rules.mjs';
import { Flight, FixedClock } from './physics.mjs';
import { Records } from './storage.mjs';
import { Sound } from './audio.mjs';
import { Renderer } from './render.mjs?v=2';
import { Effects } from './effects.mjs';
import { LeaderboardAPI } from './api.mjs';
import { API_URL } from './config.mjs';

const $ = id => document.getElementById(id);
const canvas = $('flightCanvas'), renderer = new Renderer(canvas);
let localStorageAccess, sessionStorageAccess;
try { localStorageAccess = globalThis.localStorage; } catch { localStorageAccess = null; }
try { sessionStorageAccess = globalThis.sessionStorage; } catch { sessionStorageAccess = null; }
const records = new Records(localStorageAccess, message => {
  $('storageNotice').hidden = false; $('storageNotice').textContent = message;
}, sessionStorageAccess);
const sound = new Sound(records.data.muted), api = new LeaderboardAPI(API_URL);
const clock = new FixedClock(), effects = new Effects();
let mode = new URLSearchParams(location.search).get('mode') === 'daily' ? 'daily' : 'normal';
let state = 'ready', flight = new Flight(dailySeed(utcDay())), run = null, result = null;
let countdownUntil = 0, lastFrame = 0, generation = 0, pendingPause = false, currentDay = utcDay();
let boardMode = mode === 'daily' ? 'daily' : 'alltime', boardGeneration = 0, boardBusy = false, lastBoardAt = -Infinity;
let submitting = false, pendingSubmission = null;
let redraw = true;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function announce(text) { $('runStatus').textContent = text; }
function best() { $('best').textContent = records.best(mode, mode === 'daily' ? run?.day || currentDay : ''); }
function dayInfo() {
  $('dailyInfo').textContent = mode === 'daily'
    ? `DAILY / ${run?.day || currentDay} UTC / ${VERSION} · Wechsel 00:00 UTC${run?.day && run.day !== currentDay ? ' · dieser Run behält seinen Starttag' : ''}`
    : `NORMAL / ${VERSION} · neue Route bei jedem Start`;
}
function skins() {
  $('skin').replaceChildren();
  for (const skin of SKINS) {
    const option = document.createElement('option'); option.value = skin.id;
    option.disabled = records.data.highest < skin.at;
    option.textContent = skin.name + (option.disabled ? ` · ab ${skin.at}` : '');
    $('skin').appendChild(option);
  }
  $('skin').value = records.data.skin;
}
function muteLabel() {
  $('mute').textContent = records.data.muted ? 'SOUND AUS' : 'SOUND AN';
  $('mute').setAttribute('aria-pressed', String(records.data.muted));
  $('mute').setAttribute('aria-label', records.data.muted ? 'Sound einschalten' : 'Sound stummschalten');
}
function setState(next) {
  redraw = true;
  state = next; document.body.dataset.gameState = state;
  $('stateBadge').textContent = { ready: 'BEREIT', starting: 'VERBINDEN', countdown: 'COUNTDOWN', running: 'LÄUFT', paused: 'PAUSIERT', gameover: 'BEENDET', entry: 'EINTRAGUNG' }[state];
  const active = ['starting', 'countdown', 'running', 'paused'].includes(state);
  document.querySelectorAll('[name="mode"]').forEach(el => { el.disabled = active; });
  $('start').disabled = active && state !== 'paused';
  $('start').textContent = state === 'paused' ? 'FORTSETZEN' : 'START';
  $('pause').disabled = !['countdown', 'running'].includes(state);
  $('surfaceOverlay').hidden = state === 'running' || state === 'gameover';
  const labels = { ready: ['BEREIT', 'Tap oder START zum Verbinden'], starting: ['COUNTDOWN', 'Route vorbereiten …'], countdown: ['3', 'Gleich geht es los'], paused: ['PAUSIERT', 'Bewusst fortsetzen · danach Countdown'], gameover: [flight.reason, 'Run beendet'], entry: ['EINTRAGUNG', 'Dein Score bleibt bis zum Absenden lokal'] };
  if (labels[state]) { $('overlayLabel').textContent = labels[state][0]; $('overlayHint').textContent = labels[state][1]; }
}
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0] || 1; }
function beginCountdown() {
  sound.unlock(); clock.reset(); lastFrame = 0;
  countdownUntil = performance.now() + RULES.countdownMs;
  setState('countdown'); announce('COUNTDOWN — startet in drei Sekunden.'); canvas.focus({ preventScroll: true });
  canvas.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}
async function start() {
  if (state === 'paused') { beginCountdown(); return; }
  if (submitting || !['ready', 'gameover'].includes(state)) return;
  if ($('resultDialog').open) $('resultDialog').close();
  const attempt = ++generation;
  sound.unlock(); pendingPause = document.hidden;
  result = null; pendingSubmission = null; run = null; resetEntryForm();
  $('submitStatus').textContent = ''; $('publishQuestion').textContent = '';
  setState('starting'); announce('COUNTDOWN — Route wird vorbereitet.');
  const day = utcDay();
  let online = null, offlineReason = api.enabled ? 'Dieser Run ist nur lokal.' : 'Backend deaktiviert — nur lokaler Run.';
  if (api.enabled) {
    try { online = await api.start(mode, records.data.playerId); }
    catch (error) { offlineReason = `${error.message} Dieser Run ist nur lokal und später nicht einreichbar.`; }
  }
  if (attempt !== generation) return;
  run = { mode, day: online?.day || day, seed: online?.seed ?? (mode === 'daily' ? dailySeed(day) : randomSeed()), online, offlineReason };
  flight = new Flight(run.seed); effects.reset(); $('score').textContent = '0'; best(); dayInfo();
  if (pendingPause || document.hidden) { setState('paused'); announce('PAUSIERT — zum Start bewusst fortsetzen.'); }
  else beginCountdown();
}
function pause() {
  if (state === 'starting') { pendingPause = true; return; }
  if (!['countdown', 'running'].includes(state)) return;
  clock.reset(); setState('paused'); announce('PAUSIERT — Rückkehr startet nicht automatisch. Fortsetzen beginnt mit Countdown.');
}
function canSubmitNew() { return !!(result?.run.online && !result.submitted && Date.now() < result.run.online.expiresAt); }
function canSubmit() { return !!(result && !result.submitted && (pendingSubmission || canSubmitNew())); }
function resetEntryForm() {
  $('aliasForm').reset(); $('aliasForm').hidden = true; $('resultActions').hidden = false;
  $('alias').value = pendingSubmission?.alias || ''; $('alias').readOnly = !!pendingSubmission;
  $('alias').removeAttribute('aria-invalid'); $('aliasError').textContent = '';
  $('publish').disabled = false; $('cancelEntry').disabled = false; $('enterScore').disabled = !canSubmit();
  if (!pendingSubmission) $('submitStatus').textContent = '';
  $('publish').textContent = pendingSubmission ? 'GLEICHE EINTRAGUNG ERNEUT SENDEN' : 'ÖFFENTLICH EINTRAGEN';
}
function timestamp(ms) {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(ms) + ' UTC';
}
function placement(entry) { return `Platz ${entry.position} · ${entry.score} Punkte · ${entry.rank}`; }
function showResultActions() {
  $('aliasForm').hidden = true; $('resultActions').hidden = false;
  $('enterScore').disabled = !canSubmit();
}
function finish() {
  if (state !== 'running') return;
  sound.play('end'); clock.reset(); effects.collide(flight, records.data.skin, reduceMotion.matches);
  const local = records.record(run.mode, run.day, flight.score);
  result = { run, score: flight.score, activeMs: flight.activeMs, ...local, submitted: false, dialogShown: false, revealAt: effects.time + (reduceMotion.matches ? .15 : .5) };
  best(); skins(); setState('gameover');
  $('resultTitle').textContent = flight.reason;
  $('resultScore').textContent = String(result.score);
  $('resultRank').textContent = rank(result.score);
  $('resultSummary').textContent = `${run.mode === 'daily' ? `Daily ${run.day} UTC` : 'Normal'} · Rekord ${local.best}${local.newRecord ? ' · Neuer Rekord!' : ''}${local.unlocked.length ? ` · Skin freigeschaltet: ${local.unlocked.join(', ')}` : ''}`;
  $('publishQuestion').textContent = canSubmit() ? 'Möchtest du diesen Score öffentlich mit einem Alias veröffentlichen? Erst SCORE EINTRAGEN öffnet die Eingabe.' : `${run.online ? 'Server-Run abgelaufen; Score bleibt lokal.' : run.offlineReason} Keine öffentliche Eintragung möglich.`;
  $('submitStatus').textContent = ''; $('copyFallback').hidden = true; $('copyLabel').hidden = true;
  showResultActions();
  announce(`GAME OVER — ${result.score} Punkte, ${rank(result.score)}.`);
}
function action() {
  if (state === 'ready' || state === 'paused') { start(); return; }
  if (state !== 'running') return;
  flight.flap(); effects.flap(flight, records.data.skin, reduceMotion.matches); redraw = true; sound.play('flap');
}
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary) return;
  event.preventDefault(); canvas.focus({ preventScroll: true }); action();
});
canvas.addEventListener('keydown', event => {
  if (event.target !== canvas || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(event.code)) { event.preventDefault(); action(); }
  if (event.code === 'Escape') pause();
});
$('start').addEventListener('click', start);
$('pause').addEventListener('click', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', pause);
window.addEventListener('resize', () => { renderer.resize(); redraw = true; });
reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) { effects.trail = []; effects.rings = []; effects.particles = effects.particles.slice(-2); } redraw = true; });
document.querySelectorAll('[name="mode"]').forEach(el => {
  el.checked = el.value === mode;
  el.addEventListener('change', () => {
    if (!el.checked) return;
    mode = el.value; run = null; result = null; flight = new Flight(dailySeed(utcDay())); effects.reset();
    setState('ready'); best(); dayInfo();
    const url = new URL(location.href);
    if (mode === 'daily') url.searchParams.set('mode', 'daily'); else url.searchParams.delete('mode');
    history.replaceState(null, '', url);
    announce('BEREIT — Modus gewählt. START beginnt einen neuen Run.');
  });
});
$('mute').addEventListener('click', () => {
  records.setMuted(!records.data.muted); sound.muted = records.data.muted; sound.unlock(); muteLabel();
});
$('skin').addEventListener('change', () => { records.selectSkin($('skin').value); redraw = true; });
$('again').addEventListener('click', () => { $('resultDialog').close(); start(); });
function skip() {
  if (submitting) return;
  $('resultDialog').close(); showResultActions(); run = null; result = null; flight = new Flight(dailySeed(utcDay())); effects.reset(); setState('ready'); dayInfo(); best();
  announce(pendingSubmission ? 'Keine weitere Anfrage. Eine zuvor gesendete Eintragung kann bereits verarbeitet worden sein.' : 'Score bleibt lokal. Bereit für einen neuen Run.');
  $('start').focus();
}
$('skipScore').addEventListener('click', skip);
$('resultDialog').addEventListener('cancel', event => { event.preventDefault(); if (state === 'entry') cancelEntry(); else skip(); });
$('enterScore').addEventListener('click', () => {
  if (!canSubmit()) { $('submitStatus').textContent = 'Run abgelaufen oder nicht öffentlich einreichbar.'; $('enterScore').disabled = true; return; }
  resetEntryForm(); setState('entry'); $('resultActions').hidden = true; $('aliasForm').hidden = false;
  $('alias').focus();
});
function cancelEntry() {
  if (submitting) return;
  setState('gameover'); showResultActions(); (canSubmit() ? $('enterScore') : $('again')).focus();
  $('submitStatus').textContent = pendingSubmission ? 'Keine weitere Anfrage. Eine bereits gesendete Eintragung kann verarbeitet worden sein.' : 'Eintragung abgebrochen; nichts gesendet.';
}
$('cancelEntry').addEventListener('click', cancelEntry);
$('aliasForm').addEventListener('submit', async event => {
  event.preventDefault(); if (submitting) return;
  if (!pendingSubmission && !canSubmitNew()) { $('aliasError').textContent = 'Run abgelaufen. Score bleibt lokal; keine Eintragung möglich.'; $('publish').disabled = true; return; }
  const validation = validateAlias(pendingSubmission?.alias ?? $('alias').value);
  if (!validation.ok) { $('aliasError').textContent = validation.error; $('alias').setAttribute('aria-invalid', 'true'); $('alias').focus(); return; }
  $('alias').removeAttribute('aria-invalid'); $('aliasError').textContent = '';
  // A retry always uses these exact primitives, never current form/storage values.
  // Kept only in this dialog/session; never persisted or automatically retried.
  if (!pendingSubmission) pendingSubmission = Object.freeze({ token: result.run.online.token, playerId: records.data.playerId, alias: validation.alias, score: result.score, activeMs: result.activeMs });
  $('alias').value = pendingSubmission.alias; $('alias').readOnly = true;
  submitting = true; $('publish').disabled = true; $('cancelEntry').disabled = true; $('submitStatus').textContent = 'Eintragung wird gesendet …';
  try {
    const response = await api.submit(pendingSubmission);
    if (response.mode !== result.run.mode || response.day !== (result.run.mode === 'daily' ? result.run.day : '')) throw Error('Ungültige Bestätigung.');
    result.submitted = true; pendingSubmission = null;
    setState('gameover'); showResultActions(); $('again').focus();
    $('publishQuestion').textContent = 'Freiwillige Eintragung bestätigt. Ein schlechterer Score ersetzt keinen besseren.';
    $('submitStatus').textContent = `Eintragung bestätigt. Dein Bestwert: ${placement(response.ownEntry)} · ${response.mode === 'daily' ? `${response.day} UTC` : 'ALLZEIT'}. Position bei Bestätigung (${timestamp(response.positionAsOf)}); spätere Einträge können sie verändern.`;
    boardMode = response.mode === 'daily' ? 'daily' : 'alltime'; boardGeneration++; lastBoardAt = -Infinity; loadBoard();
  } catch (error) {
    $('submitStatus').textContent = `${error.message} Keine automatische Wiederholung. Bei verlorener Antwort dieselbe Eintragung erneut senden.`;
    $('publish').textContent = 'GLEICHE EINTRAGUNG ERNEUT SENDEN';
  } finally { submitting = false; $('publish').disabled = false; $('cancelEntry').disabled = false; }
});
$('copyScore').addEventListener('click', async () => {
  if (!result) return;
  const text = `PACKET//FLIGHT · ${result.score} · ${rank(result.score)} · ${result.run.mode === 'daily' ? `Daily ${result.run.day} UTC` : 'Normal'} · ${VERSION} · https://tr1stan.de/game.html`;
  try {
    if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text); $('submitStatus').textContent = 'Score kopiert.';
  } catch {
    $('copyLabel').hidden = false; $('copyFallback').hidden = false; $('copyFallback').value = text;
    $('copyFallback').focus(); $('copyFallback').select(); $('submitStatus').textContent = 'Kopieren hier nicht möglich. Der Text ist zum manuellen Kopieren ausgewählt.';
  }
});
async function loadBoard() {
  $('todayBoard').setAttribute('aria-pressed', String(boardMode === 'daily'));
  $('alltimeBoard').setAttribute('aria-pressed', String(boardMode === 'alltime'));
  if (!api.enabled) { $('boardStatus').textContent = 'LEADERBOARD OFFLINE'; return; }
  if (boardBusy || Date.now() - lastBoardAt < 5000) return;
  const request = ++boardGeneration, requestedMode = boardMode;
  boardBusy = true; lastBoardAt = Date.now(); $('refreshBoard').disabled = true;
  $('boardStatus').textContent = 'Rangliste lädt …'; $('boardEntries').replaceChildren(); $('ownPosition').textContent = '';
  try {
    const data = await api.list(requestedMode, records.data.playerId);
    if (request !== boardGeneration || requestedMode !== boardMode) return;
    $('boardStatus').textContent = data.entries.length ? `${requestedMode === 'daily' ? `${data.day} UTC` : 'ALLZEIT'} · ${VERSION}` : 'Noch keine Einträge in diesem Bereich.';
    for (const entry of data.entries) {
      const li = document.createElement('li');
      li.classList.toggle('own', entry.own === true);
      const line = document.createElement('div'); line.className = 'board-line';
      const alias = document.createElement('span'); alias.textContent = `${entry.position}. ${entry.alias}${entry.own ? ' · DU' : ''}`;
      const score = document.createElement('strong'); score.textContent = String(entry.score); line.append(alias, score);
      const details = document.createElement('div'); details.className = 'board-details';
      const name = document.createElement('span'); name.textContent = entry.rank;
      const time = document.createElement('time'); time.dateTime = new Date(entry.achievedAt).toISOString(); time.textContent = timestamp(entry.achievedAt);
      details.append(name, time); li.append(line, details); $('boardEntries').appendChild(li);
    }
    $('ownPosition').textContent = data.ownEntry ? `Dein Bestwert: ${placement(data.ownEntry)} · ${timestamp(data.ownEntry.achievedAt)}${data.ownEntry.position > 20 ? ' · außerhalb der Top 20' : ''}` : 'Noch kein eigener Bestwert in diesem Bereich.';
  } catch (error) { if (request === boardGeneration) $('boardStatus').textContent = `LEADERBOARD OFFLINE — ${error.message}`; }
  finally { boardBusy = false; $('refreshBoard').disabled = false; if (requestedMode !== boardMode) { lastBoardAt = -Infinity; loadBoard(); } }
}
for (const [id, value] of [['todayBoard', 'daily'], ['alltimeBoard', 'alltime']]) $(id).addEventListener('click', () => {
  if (boardMode === value) return;
  boardMode = value; boardGeneration++; lastBoardAt = -Infinity; loadBoard();
});
$('refreshBoard').addEventListener('click', loadBoard);
function frame(time) {
  const delta = lastFrame ? (time - lastFrame) / 1000 : 0; lastFrame = time;
  const today = utcDay();
  if (today !== currentDay) {
    currentDay = today; dayInfo(); best();
    if (boardMode === 'daily') { boardGeneration++; $('boardEntries').replaceChildren(); $('ownPosition').textContent = ''; $('boardStatus').textContent = 'Neuer UTC-Tag — Rangliste bitte aktualisieren.'; }
    if (state === 'ready') announce('Neuer UTC-Tag — der nächste Daily Run verwendet die neue Route.');
  }
  let alpha = 1;
  if (state === 'countdown') {
    $('overlayLabel').textContent = String(Math.max(1, Math.ceil((countdownUntil - time) / 1000)));
    if (time >= countdownUntil) {
      clock.reset(); setState('running');
      announce(run.online ? 'LÄUFT — Online-Run. Eine Veröffentlichung bleibt freiwillig.' : `LÄUFT — ${run.offlineReason}`);
    }
  } else if (state === 'running') {
    const oldScore = flight.score;
    alpha = clock.advance(delta, () => flight.step()).alpha;
    effects.advance(delta, flight, { running: true, skin: records.data.skin, reduced: reduceMotion.matches });
    if (flight.score !== oldScore) {
      $('score').textContent = String(flight.score); sound.play('point');
      effects.point(flight.gates.filter(gate => gate.passed).at(-1), flight.y, records.data.skin, reduceMotion.matches);
    }
    if (flight.dead) finish();
  } else if (state === 'gameover' || state === 'entry') {
    redraw ||= effects.active;
    effects.advance(delta, flight, { settling: effects.active || !!(result && !result.dialogShown), reduced: reduceMotion.matches });
  }
  if (state === 'gameover' && result && !result.dialogShown && effects.time >= result.revealAt) {
    result.dialogShown = true; $('resultDialog').showModal(); $('again').focus();
  }
  if (redraw || state === 'running' || ((state === 'gameover' || state === 'entry') && effects.active)) {
    renderer.draw(flight, { alpha, skin: records.data.skin, reduced: reduceMotion.matches, effects, mode });
    redraw = false;
  }
  requestAnimationFrame(frame);
}
skins(); muteLabel(); dayInfo(); best(); setState('ready');
if (renderer.ctx) { $('gameUI').hidden = false; renderer.resize(); requestAnimationFrame(frame); }
else { $('runStatus').textContent = 'Canvas ist nicht verfügbar; das Spiel kann hier nicht starten.'; $('gameUI').hidden = false; $('start').disabled = true; }
if (api.enabled) {
  announce('BEREIT — beim Online-Start gehen Spielerkennung, Version und Modus an Cloudflare. Score-Veröffentlichung bleibt freiwillig.');
  $('boardExplanation').textContent = 'Online-Runs fragen beim Start das Backend an. Alias und Score werden erst nach deiner ausdrücklichen Eintragung veröffentlicht. Ein Bestwert pro Browserprofil ist keine Identitätsprüfung.';
  $('refreshBoard').disabled = false; loadBoard();
} else loadBoard();
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/game-sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('offlineReady').textContent = 'Spieldateien für Offline-Nutzung gespeichert. Offline erreichbare Spielseite: game.html.';
  }).catch(() => { $('offlineReady').textContent = 'Offline-Cache hier nicht verfügbar. Die geladene Seite bleibt ohne Backend spielbar.'; });
}
