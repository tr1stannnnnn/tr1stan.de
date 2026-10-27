import { ALARMS } from './world.mjs?v=pf3-1';
import { VERSION, RULES, SKINS, rank, utcDay, dailySeed, validateAlias } from './rules.mjs?v=pf3-1';
import { Flight, FixedClock } from './physics.mjs?v=pf3-1';
import { Records, CHOICE_KEY, memoryStorage, mergeRecords } from './storage.mjs?v=pf3-1';
import { Sound } from './audio.mjs?v=pf3-1';
import { Renderer } from './render.mjs?v=pf3-1';
import { Effects } from './effects.mjs?v=pf3-1';
import { LeaderboardAPI } from './api.mjs?v=pf3-1';
import { API_URL } from './config.mjs?v=pf3-1';

const $ = id => document.getElementById(id);
const canvas = $('flightCanvas'), renderer = new Renderer(canvas);
let localStorageAccess;
try { localStorageAccess = globalThis.localStorage; } catch { localStorageAccess = null; }
const storageWarning = message => {
  $('storageNotice').hidden = false; $('storageNotice').textContent = message;
};
let keepStorage = false;
try { keepStorage = localStorageAccess?.getItem(CHOICE_KEY) === 'yes'; } catch {}
let records = new Records(keepStorage ? localStorageAccess : memoryStorage(), storageWarning);
let memoryBaseline = {};
$('keepStorage').checked = keepStorage;
const sound = new Sound(records.data.muted), api = new LeaderboardAPI(API_URL);
const clock = new FixedClock(), effects = new Effects();
let mode = new URLSearchParams(location.search).get('mode') === 'daily' ? 'daily' : 'normal';
let state = 'ready', flight = new Flight(dailySeed(utcDay())), run = null, result = null;
let countdownUntil = 0, lastFrame = 0, generation = 0, pendingPause = false, currentDay = utcDay();
let boardMode = mode === 'daily' ? 'daily' : 'alltime', boardGeneration = 0, boardBusy = false, boardPending = false, lastBoardAt = -Infinity;
let boardRequested = false, boardDay = currentDay;
let submitting = false, pendingSubmission = null;
let startError = '';
let redraw = true;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function announce(text) { $('runStatus').textContent = text; }
function updateRoute() {
  $('gateCount').textContent = `${flight.gatesPassed} GATES`;
  $('combo').textContent = flight.combo ? `COMBO ×${flight.combo}` : 'COMBO —';
  $('alertPhase').textContent = ALARMS[flight.alarm]; document.body.dataset.alarm = flight.alarm;
  const h = flight.hazard;
  const messages = {
    'trace:warning': 'TRACE//UNIT nähert sich. Warte auf die Zielmarkierung.',
    'trace:tracking': 'Ziel wird verfolgt. Erst nach LOCKED die Höhe wechseln.',
    'trace:locked': 'LOCKED: Zielhöhe bleibt fest. Jetzt nach oben oder unten ausweichen.',
    'trace:active': 'Schuss auf die feste Zielhöhe. Halte Abstand zur Markierung.',
    'laser:warning': 'LASER: Die markierte Zone verlassen. Der breite Korridor bleibt frei.',
    'laser:charging': 'LASER lädt. Bleibe auf der angezeigten sicheren Seite.',
    'laser:active': 'LASER aktiv. Sichere Seite halten.',
    'laser:fading': 'LASER klingt ab. Die Route wird wieder frei.',
  };
  const hint = h ? messages[`${h.kind}:${h.phase}`] : 'Durch die Lücken fliegen. Goldene Fragmente sind freiwillig.';
  if ($('threatStatus').textContent !== hint) $('threatStatus').textContent = hint;
}
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
  $('stateBadge').textContent = { ready: 'BEREIT', 'start-error': 'START GESCHEITERT', starting: 'VERBINDEN', countdown: 'COUNTDOWN', running: 'LÄUFT', paused: 'PAUSIERT', gameover: 'BEENDET', entry: 'EINTRAGUNG' }[state];
  $('keepStorage').disabled = ['starting','countdown','running','paused','entry'].includes(next) || !!(result && !result.submitted && result.run.online);
  const active = ['starting', 'countdown', 'running', 'paused'].includes(state);
  document.querySelectorAll('[name="mode"]').forEach(el => { el.disabled = active || state === 'entry' || submitting || canSubmit(); });
  $('start').disabled = active && state !== 'paused';
  $('start').textContent = state === 'paused' ? 'FORTSETZEN' : 'NUR LOKAL SPIELEN';
  $('startOnline').disabled = active || !api.enabled;
  $('startOnline').hidden = state === 'paused';
  $('startOnline').textContent = startError ? 'ERNEUT VERSUCHEN' : 'MIT RANGLISTE STARTEN · EMPFOHLEN';
  $('pause').disabled = !['countdown', 'running'].includes(state);
  $('surfaceOverlay').hidden = state === 'running' || state === 'gameover';
  const labels = { ready: ['BEREIT', 'Unten mit Rangliste oder nur lokal starten'], 'start-error': ['NICHT GESTARTET', 'Erneut versuchen oder bewusst lokal spielen'], starting: ['VERBINDEN', 'Server-Run vorbereiten …'], countdown: ['2', 'Gleich geht es los'], paused: ['PAUSIERT', 'Bewusst fortsetzen · danach Countdown'], gameover: [flight.reason, 'Run beendet'], entry: ['EINTRAGUNG', 'Dein Score bleibt bis zum Absenden lokal'] };
  if (labels[state]) { $('overlayLabel').textContent = labels[state][0]; $('overlayHint').textContent = labels[state][1]; }
}
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0] || 1; }
function resetFlight(seed = dailySeed(utcDay())) {
  clock.reset(); lastFrame = 0; countdownUntil = 0;
  flight = new Flight(seed); effects.reset();
  $('score').textContent = String(flight.score); updateRoute(); redraw = true;
}
function ready() {
  if (submitting) return false;
  generation++; run = null; result = null; pendingSubmission = null; pendingPause = false;
  if ($('resultDialog').open) $('resultDialog').close();
  startError = ''; $('startFailure').hidden = true; $('startFailure').textContent = '';
  resetFlight(); resetEntryForm(); setState('ready'); best(); dayInfo();
  return true;
}
function beginCountdown() {
  sound.unlock(); clock.reset(); lastFrame = 0;
  countdownUntil = performance.now() + RULES.countdownMs;
  setState('countdown'); announce('COUNTDOWN — startet nach kurzem Countdown.'); canvas.focus({ preventScroll: true });
  canvas.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}
async function start(withLeaderboard = false) {
  if (state === 'paused') { beginCountdown(); return; }
  if (submitting || !['ready', 'start-error', 'gameover'].includes(state)) return;
  if ($('resultDialog').open) $('resultDialog').close();
  const attempt = ++generation;
  sound.unlock(); pendingPause = document.hidden;
  result = null; pendingSubmission = null; run = null; resetEntryForm();
  resetFlight();
  startError = ''; $('startFailure').hidden = true; $('startFailure').textContent = '';
  $('submitStatus').textContent = ''; $('publishQuestion').textContent = '';
  setState('starting'); announce('COUNTDOWN — Route wird vorbereitet.');
  const day = utcDay();
  const playerId = records.data.playerId;
  let online = null;
  if (withLeaderboard) {
    try {
      online = await api.start(mode, playerId);
      if (Date.now() >= online.expiresAt) throw Error('Der vorbereitete Server-Run ist bereits abgelaufen.');
    } catch (error) {
      if (attempt !== generation) return;
      startError = `Ranglistenstart fehlgeschlagen: ${error.message} Es wurde kein Spiel gestartet. Erneut versuchen oder NUR LOKAL SPIELEN wählen.`;
      $('startFailure').textContent = startError; $('startFailure').hidden = false;
      setState('start-error'); announce('NICHT GESTARTET — Ranglistenstart fehlgeschlagen.');
      $('startFailure').focus({ preventScroll: true });
      $('startFailure').scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      return;
    }
  }
  if (attempt !== generation) return;
  run = { mode, playerId, day: online?.day || day, seed: online?.seed ?? (mode === 'daily' ? dailySeed(day) : randomSeed()), online, offlineReason: 'Bewusst lokaler Run — keine öffentliche Eintragung möglich.' };
  resetFlight(run.seed); best(); dayInfo();
  if (pendingPause || document.hidden) { setState('paused'); announce('PAUSIERT — zum Start bewusst fortsetzen.'); }
  else beginCountdown();
}
function pause() {
  if (state === 'starting') { pendingPause = true; return; }
  if (!['countdown', 'running'].includes(state)) return;
  clock.reset(); setState('paused'); announce('PAUSIERT — Rückkehr startet nicht automatisch. Fortsetzen beginnt mit Countdown.');
}
function canSubmitNew() { return !!(result?.run.online && !result.submitted && !result.expired && Date.now() < result.run.online.expiresAt); }
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
  updateResultAvailability();
}
function updateResultAvailability() {
  $('enterScore').disabled = !canSubmit();
  $('enterScore').hidden = !result?.run.online;
  $('nextOnline').hidden = !result || !!result.run.online;
  $('nextOnline').disabled = !api.enabled;
  $('again').textContent = result?.run.online ? 'NOCHMAL MIT RANGLISTE STARTEN' : 'NOCHMAL LOKAL SPIELEN';
  if (!result || result.submitted) return;
  $('publishQuestion').textContent = canSubmit()
    ? 'Möchtest du diesen Score öffentlich mit einem Alias veröffentlichen? Erst SCORE EINTRAGEN öffnet die Eingabe; die Veröffentlichung bleibt freiwillig.'
    : result.run.online ? 'Server-Run abgelaufen oder nicht mehr verfügbar. Dieser Score bleibt lokal. Für eine Eintragung einen neuen Run mit Rangliste starten.'
      : 'Du hast nur lokal gespielt. Dieser Score kann nicht nachträglich als verifizierter Online-Score eingetragen werden. Starte den nächsten Run mit Rangliste; die spätere Veröffentlichung bleibt freiwillig.';
  if (state === 'entry' && !canSubmit()) {
    $('publish').disabled = true;
    $('aliasError').textContent = 'Server-Run abgelaufen oder nicht mehr verfügbar. Keine neue Eintragung möglich; der Score bleibt lokal.';
  }
}
function finish() {
  if (state !== 'running') return;
  sound.play('end'); clock.reset(); effects.collide(flight, records.data.skin, reduceMotion.matches);
  const local = records.record(run.mode, run.day, flight.score, flight.gatesPassed, flight.fragments);
  result = { run, score: flight.score, gates: flight.gatesPassed, fragments: flight.fragments, bonusPoints: flight.bonusPoints, activeMs: flight.activeMs, ...local, submitted: false, dialogShown: false, revealAt: effects.time + (reduceMotion.matches ? .15 : .5) };
  best(); skins(); setState('gameover');
  $('resultTitle').textContent = flight.reason;
  $('resultScore').textContent = String(result.score);
  $('resultParts').textContent = `${result.gates} Gates × 10 = ${result.gates * 10} · ${result.fragments} Fragmente · ${result.bonusPoints} Bonuspunkte`;
  $('resultRank').textContent = rank(result.gates);
  $('resultSummary').textContent = `${run.mode === 'daily' ? `Daily ${run.day} UTC` : 'Normal'} · Rekord ${local.best}${local.newRecord ? ' · Neuer Rekord!' : ''}${local.unlocked.length ? ` · Skin freigeschaltet: ${local.unlocked.join(', ')}` : ''}`;
  $('submitStatus').textContent = ''; $('copyFallback').hidden = true; $('copyLabel').hidden = true;
  showResultActions();
  announce(`GAME OVER — ${result.score} Punkte, ${rank(result.gates)}.`);
}
function action(preventScroll = false) {
  if (state === 'ready' || state === 'start-error') {
    announce('Startart wählen: MIT RANGLISTE STARTEN oder NUR LOKAL SPIELEN.');
    (api.enabled ? $('startOnline') : $('start')).focus({ preventScroll });
    return;
  }
  if (state === 'paused') { beginCountdown(); return; }
  if (state !== 'running') return;
  flight.flap(); effects.flap(flight, records.data.skin, reduceMotion.matches); redraw = true; sound.play('flap');
}
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary) return;
  event.preventDefault(); canvas.focus({ preventScroll: true }); action(true);
});
canvas.addEventListener('keydown', event => {
  if (event.target !== canvas || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(event.code)) { event.preventDefault(); action(); }
  if (event.code === 'Escape') pause();
});
$('start').addEventListener('click', () => start(false));
$('startOnline').addEventListener('click', () => start(true));
$('pause').addEventListener('click', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', pause);
window.addEventListener('resize', () => { renderer.resize(); redraw = true; });
reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) { effects.trail = []; effects.rings = []; effects.particles = effects.particles.slice(-2); } redraw = true; });
document.querySelectorAll('[name="mode"]').forEach(el => {
  el.checked = el.value === mode;
  el.addEventListener('change', () => {
    if (!el.checked) return;
    if (el.disabled || submitting || canSubmit() || !['ready', 'start-error', 'gameover'].includes(state)) {
      document.querySelectorAll('[name="mode"]').forEach(input => { input.checked = input.value === mode; });
      return;
    }
    mode = el.value;
    ready(); selectBoard(mode === 'daily' ? 'daily' : 'alltime');
    const url = new URL(location.href);
    if (mode === 'daily') url.searchParams.set('mode', 'daily'); else url.searchParams.delete('mode');
    history.replaceState(null, '', url);
    announce('BEREIT — Modus gewählt. Mit Rangliste oder nur lokal starten.');
  });
});
$('mute').addEventListener('click', () => {
  records.setMuted(!records.data.muted); sound.muted = records.data.muted; sound.unlock(); muteLabel();
});
$('skin').addEventListener('change', () => { records.selectSkin($('skin').value); redraw = true; });
$('again').addEventListener('click', () => start(!!result?.run.online));
$('nextOnline').addEventListener('click', () => start(true));
function skip() {
  if (submitting) return;
  const uncertain = !!pendingSubmission;
  $('resultDialog').close(); ready();
  announce(uncertain ? 'Keine weitere Anfrage. Eine zuvor gesendete Eintragung kann bereits verarbeitet worden sein.' : 'Score bleibt lokal. Bereit für einen neuen Run.');
  $('start').focus();
}
$('skipScore').addEventListener('click', skip);
$('resultDialog').addEventListener('cancel', event => { event.preventDefault(); if (state === 'entry') cancelEntry(); else skip(); });
$('resultDialog').addEventListener('close', () => {
  if (!result || !['gameover', 'entry'].includes(state)) return;
  // Start/skip have already left the result state. An unrelated close must not
  // erase an in-flight submission, its retry payload or a still valid entry.
  if (submitting || canSubmit() || state === 'entry') $('resultDialog').showModal();
  else skip();
});
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
  if (!pendingSubmission) pendingSubmission = Object.freeze({ token: result.run.online.token, playerId: result.run.playerId, alias: validation.alias, score: result.score, gates: result.gates, fragments: result.fragments, bonusPoints: result.bonusPoints, activeMs: result.activeMs });
  $('alias').value = pendingSubmission.alias; $('alias').readOnly = true;
  submitting = true; $('publish').disabled = true; $('cancelEntry').disabled = true; $('submitStatus').textContent = 'Eintragung wird gesendet …';
  try {
    const response = await api.submit(pendingSubmission);
    if (response.mode !== result.run.mode || response.day !== (result.run.mode === 'daily' ? result.run.day : '')) throw Error('Ungültige Bestätigung.');
    result.submitted = true; pendingSubmission = null;
    setState('gameover'); showResultActions(); $('again').focus();
    $('publishQuestion').textContent = 'Freiwillige Eintragung bestätigt. Ein schlechterer Score ersetzt keinen besseren.';
    $('submitStatus').textContent = `Eintragung bestätigt. Dein Bestwert: ${placement(response.ownEntry)} · ${response.mode === 'daily' ? `${response.day} UTC` : 'ALLZEIT'}. Position bei Bestätigung (${timestamp(response.positionAsOf)}); spätere Einträge können sie verändern.`;
    boardRequested = true;
    selectBoard(response.mode === 'daily' ? 'daily' : 'alltime', { force: true });
  } catch (error) {
    if (error.status === 410) {
      pendingSubmission = null; result.expired = true;
      $('submitStatus').textContent = `${error.message} Dieser Score bleibt lokal. Einen neuen Run mit Rangliste starten.`;
      updateResultAvailability();
    } else {
      $('submitStatus').textContent = `${error.message} Keine automatische Wiederholung. Bei verlorener Antwort dieselbe Eintragung erneut senden.`;
      $('publish').textContent = 'GLEICHE EINTRAGUNG ERNEUT SENDEN';
    }
  } finally { submitting = false; $('publish').disabled = !canSubmit(); $('cancelEntry').disabled = false; }
});
$('copyScore').addEventListener('click', async () => {
  if (!result) return;
  const text = `PACKET//FLIGHT · ${result.score} · ${rank(result.gates)} · ${result.run.mode === 'daily' ? `Daily ${result.run.day} UTC` : 'Normal'} · ${VERSION} · https://tr1stan.de/game.html`;
  try {
    if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text); $('submitStatus').textContent = 'Score kopiert.';
  } catch {
    $('copyLabel').hidden = false; $('copyFallback').hidden = false; $('copyFallback').value = text;
    $('copyFallback').focus(); $('copyFallback').select(); $('submitStatus').textContent = 'Kopieren hier nicht möglich. Der Text ist zum manuellen Kopieren ausgewählt.';
  }
});
function boardLabel() { return boardMode === 'daily' ? 'DAILY · HEUTE' : 'NORMAL · ALLZEIT'; }
function updateBoardSelection() {
  $('todayBoard').setAttribute('aria-pressed', String(boardMode === 'daily'));
  $('alltimeBoard').setAttribute('aria-pressed', String(boardMode === 'alltime'));
  $('boardDescription').textContent = boardMode === 'daily'
    ? 'Nur Daily-Runs des angezeigten UTC-Tages. Normale Runs stehen getrennt unter NORMAL · ALLZEIT.'
    : 'Normale Runs aller Tage. Daily-Runs stehen getrennt unter DAILY · HEUTE.';
  $('boardDate').hidden = boardMode !== 'daily';
  $('boardDate').textContent = boardMode === 'daily' ? `${boardDay} (UTC) · Tageswechsel um 00:00 UTC.` : '';
}
function clearBoard() { $('boardEntries').replaceChildren(); $('ownPosition').textContent = ''; }
function selectBoard(next, { load = boardRequested, force = false } = {}) {
  if (next === boardMode && !force) return;
  boardMode = next; boardDay = currentDay; boardGeneration++; boardPending = false; lastBoardAt = -Infinity;
  clearBoard(); updateBoardSelection();
  $('boardStatus').textContent = api.enabled ? 'Rangliste erst mit AKTUALISIEREN laden. Bis dahin bleibt die Kennung lokal.' : 'LEADERBOARD OFFLINE';
  if (load) loadBoard();
}
async function loadBoard() {
  updateBoardSelection();
  if (!api.enabled) { $('boardStatus').textContent = 'LEADERBOARD OFFLINE'; return; }
  if (!boardRequested) return;
  if (boardBusy) { boardPending = true; $('boardStatus').textContent = `${boardLabel()} lädt …`; return; }
  if (Date.now() - lastBoardAt < 5000) return;
  const request = ++boardGeneration, requestedMode = boardMode, requestedDay = currentDay;
  boardBusy = true; lastBoardAt = Date.now(); $('refreshBoard').disabled = true;
  $('boardStatus').textContent = `${boardLabel()} lädt …`; clearBoard();
  try {
    const data = await api.list(requestedMode, records.data.playerId);
    if (request !== boardGeneration || requestedMode !== boardMode || (requestedMode === 'daily' && requestedDay !== currentDay)) return;
    if (requestedMode === 'daily') boardDay = data.day;
    updateBoardSelection();
    $('boardStatus').textContent = data.entries.length ? `${boardLabel()} · ${VERSION}` : `Noch keine Einträge in ${boardLabel()}.`;
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
  finally {
    boardBusy = false; $('refreshBoard').disabled = false;
    if (boardPending) { boardPending = false; lastBoardAt = -Infinity; loadBoard(); }
  }
}
for (const [id, value] of [['todayBoard', 'daily'], ['alltimeBoard', 'alltime']]) $(id).addEventListener('click', () => {
  selectBoard(value);
});
$('refreshBoard').addEventListener('click', () => { boardRequested = true; loadBoard(); });
function frame(time) {
  const delta = lastFrame ? (time - lastFrame) / 1000 : 0; lastFrame = time;
  const today = utcDay();
  if (result && !result.submitted && $('enterScore').disabled === canSubmit()) updateResultAvailability();
  if (today !== currentDay) {
    currentDay = today; dayInfo(); best();
    if (boardMode === 'daily') {
      selectBoard('daily', { load: false, force: true });
      $('boardStatus').textContent = 'Neuer UTC-Tag — Rangliste mit AKTUALISIEREN laden.';
    }
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

    alpha = clock.advance(delta, () => flight.step()).alpha;
    effects.advance(delta, flight, { running: true, skin: records.data.skin, reduced: reduceMotion.matches });
    for (const event of flight.drainEvents()) {
      if (event.kind === 'gate') { effects.point(event.gate, flight.y, records.data.skin, reduceMotion.matches, 10); sound.play('point'); }
      if (event.kind === 'fragment') { effects.point(null, event.y, records.data.skin, reduceMotion.matches, event.value); sound.play('fragment'); }
      if (event.kind === 'alarm') { sound.play('alarm'); announce(ALARMS[event.alarm]); }
      if (event.kind.endsWith('-warning')) { sound.play('warning'); announce(event.kind.startsWith('trace') ? 'TRACE DETECTED — Zielerfassung beginnt.' : 'LASER WARNING — markierte Zone verlassen.'); }
      if (['trace-locked','laser-charging'].includes(event.kind)) sound.play('lock');
      if (['trace-fire','laser-active'].includes(event.kind)) sound.play('fire');
    }
    $('score').textContent = String(flight.score); updateRoute();
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
skins(); muteLabel(); dayInfo(); best(); updateRoute(); setState('ready'); updateBoardSelection();
function archiveLabel() {
  const archives={...records.data.archives};
  if(records.data.legacy)archives['pf-1']=records.data.legacy;
  const host=$('legacyRecords');host.replaceChildren();host.hidden=!Object.keys(archives).length;
  for(const [version,old]of Object.entries(archives)) {
    const details=document.createElement('details'),title=document.createElement('summary');
    title.textContent=`Lokale alte Wertung ${version} · Normal ${old.normal}`;details.append(title);
    const list=document.createElement('ul');
    for(const [day,score]of Object.entries(old.daily).sort((a,b)=>b[0].localeCompare(a[0]))) {
      const li=document.createElement('li');li.textContent=`Daily ${day} UTC: ${score}`;list.append(li);
    }
    details.append(list);host.append(details);
  }
}
archiveLabel();
if (renderer.ctx) { $('gameUI').hidden = false; renderer.resize(); requestAnimationFrame(frame); }
else { $('runStatus').textContent = 'Canvas ist nicht verfügbar; das Spiel kann hier nicht starten.'; $('gameUI').hidden = false; $('start').disabled = true; $('startOnline').disabled = true; }
if (api.enabled) {
  announce('BEREIT — mit Rangliste oder nur lokal starten. Eine öffentliche Eintragung bleibt freiwillig.');
  $('boardExplanation').textContent = 'Online-Runs fragen beim Start das Backend an. Alias und Score werden erst nach deiner ausdrücklichen Eintragung veröffentlicht. Ein Bestwert pro Browserprofil ist keine Identitätsprüfung.';
  $('refreshBoard').disabled = false;
  $('boardStatus').textContent = 'Rangliste erst mit AKTUALISIEREN laden. Bis dahin bleibt die Kennung lokal.';
} else {
  $('onlineNotice').textContent += ' Ranglistenstart derzeit nicht verfügbar. Nur lokales Spielen ist möglich.';
  loadBoard();
}
// Storage and offline persistence share one deliberate, reversible visitor choice.
let storageTask = Promise.resolve();
async function syncOffline(enabled) {
  if (!navigator.serviceWorker || !window.isSecureContext) {
    if (enabled) throw Error('Offline-Speicher nicht unterstützt');
    return;
  }
  const registrations = await navigator.serviceWorker.getRegistrations();
  let registration = registrations.find(r => [r.active, r.waiting, r.installing].some(w => w && new URL(w.scriptURL).pathname === '/game-sw.js'));
  if (!registration && !enabled) {
    for (const key of await caches.keys()) if (key.startsWith('tr1stan-packet-flight-')) await caches.delete(key);
    return;
  }
  if (!registration) registration = await navigator.serviceWorker.register('/game-sw.js', { updateViaCache: 'none' });
  else try { await registration.update(); } catch {
    if (enabled && await caches.match('/game/.offline-choice', { cacheName: 'tr1stan-packet-flight-pf-3-shell-1' })) return;
    // Revocation must work with an already installed worker while offline.
  }
  // Upgrade pre-consent workers too: they must stop intercepting/caching requests.
  const worker = registration.installing || registration.waiting || registration.active;
  if (worker.state !== 'activated') await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Worker-Aktualisierung abgelaufen')), 15000);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') { clearTimeout(timer); resolve(); }
      else if (worker.state === 'redundant') { clearTimeout(timer); reject(Error('Worker nicht aktiv')); }
    });
  });
  await new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(Error('Offline-Speicher antwortet nicht')), 15000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close();
      event.data.ok ? resolve() : reject(Error('Offline-Speicher nicht verfügbar'));
    };
    worker.postMessage({ type: 'PF3_STORAGE', enabled }, [channel.port2]);
  });
}
function offlineChoice(enabled) {
  storageTask = storageTask.catch(() => {}).then(async () => {
    $('offlineReady').textContent = enabled ? 'Offline-Dateien werden vorbereitet …' : 'Nur Arbeitsspeicher. Bereits gespeicherte Rekorde bleiben unangetastet.';
    try {
      await syncOffline(enabled);
      $('offlineReady').textContent = enabled ? 'Spieldateien für Offline-Nutzung gespeichert. Offline erreichbare Spielseite: game.html.' : 'Nur Arbeitsspeicher. Offline-Cache entfernt; gespeicherte Rekorde bleiben erhalten und werden erst nach erneuter Auswahl gelesen.';
    } catch {
      $('offlineReady').textContent = enabled ? 'Offline-Cache nicht verfügbar. Geladene Seite bleibt spielbar.' : 'Offline-Speicher konnte nicht vollständig abgeschaltet werden. Bitte alle Spiel-Tabs schließen und Website-Cache im Browser entfernen; Rekorde dabei erhalten.';
    }
  });
}
function changeStorage(enabled, external = false) {
  if (enabled === keepStorage) return;
  if (enabled) {
    try { if (!external) localStorageAccess.setItem(CHOICE_KEY, 'yes'); }
    catch { storageWarning('Speicherwahl konnte nicht gespeichert werden. Nur Arbeitsspeicher.'); $('keepStorage').checked = false; return; }
    const saved = new Records(localStorageAccess, storageWarning);
    // Restore historical records without replacing them with a fresh empty session.
    const previous = records;
    records = mergeRecords(saved, previous, memoryBaseline);
    if (!records.persistent) {
      try { localStorageAccess?.setItem(CHOICE_KEY, 'no'); } catch {}
      $('keepStorage').checked = false; records = previous; return;
    }
  } else {
    // Preserve the last stored snapshot; future changes stay in RAM only.
    if (!external) try { localStorageAccess?.setItem(CHOICE_KEY, 'no'); } catch {
      try { localStorageAccess.removeItem(CHOICE_KEY); }
      catch { storageWarning('Die Abwahl gilt jetzt im Arbeitsspeicher, konnte aber nicht im Browser gemerkt werden. Bitte die Speicherpräferenz in den Website-Daten entfernen, bevor du das Spiel neu lädst.'); }
    }
    memoryBaseline = { ...records.data.stats };
    records.storage = memoryStorage(); records.save();
  }
  keepStorage = enabled; $('keepStorage').checked = enabled;
  sound.muted = records.data.muted; skins(); muteLabel(); best(); archiveLabel();
  offlineChoice(enabled);
}
$('keepStorage').addEventListener('change', event => changeStorage(event.target.checked));
window.addEventListener('storage', event => {
  if (event.key === CHOICE_KEY || event.key === null) changeStorage(event.newValue === 'yes', true);
});
offlineChoice(keepStorage);
