# Remote-cloud validation

Tests create isolated browser profiles, mocked HTTPS API responses and temporary
Miniflare D1. They do not submit to `tr1stan.de` or any production API. Run them
only in the remote development environment.

```sh
cd /workspace/tr1stan.de
python3 -m http.server 8000 --bind 127.0.0.1
# In another cloud terminal:
node --test tests/game.test.mjs tests/escape.test.mjs
python3 tests/site_test.py
python3 tests/browser_test.py
python3 tests/visual_browser_test.py
python3 tests/escape_browser_test.py
npm_config_cache=/tmp/packet-flight-npm npm exec --yes --package=html-validate@10.5.0 -- html-validate --config tests/html-validate.json index.html game.html datenschutz.html impressum.html 404.html
cd cloudflare-worker
npm_config_cache=/tmp/packet-flight-npm npm ci --no-audit --no-fund
XDG_CONFIG_HOME=/tmp/packet-flight-config WRANGLER_SEND_METRICS=false npm test
```

Python Playwright 1.62.0 and `/usr/bin/chromium` were provided by the cloud.
`requirements.txt` records the optional cloud test dependency. No dependency or
build is required for website visitors. Screenshots go to
`/tmp/packet-flight-review`, not the repository. `tools/render-social.py` renders
the original 1200×630 PNG using the same local fonts and cloud browser.

Unit tests cover deterministic Daily, UTC boundary, 60/120/144/240 Hz and mixed
frames, catch-up bounds, full passage scoring, collisions/reset, storage failure,
records/unlocks, Unicode alias validation, audio failure and API timeout/offline.
Backend tests cover real workerd startup, D1 constraints/transactions, signature,
expiry/player binding, request bounds/types, CORS, concurrent/repeated
submissions, best-value/tie handling, board separation, midnight, rate limits and
retention. Browser tests cover the existing terminal, focus escape/skip, contact
copy, countdown/restart/pause, resize, voluntary/cancelled/retried entry, failed
start, blocked storage/audio, copy fallback and real offline reload/start.

Browser screenshots/checks include 320×568, 390×844, 430×932, 768×1024,
1440×900, 844×390, Reduced Motion, 200% CSS reflow and 200% Chromium page/pinch
scale. Device emulation and headless Chromium do not certify physical iOS/Safari,
Android or every browser's zoom implementation. Real-device checks remain a
review step. The populated Top 20 is separately checked at 320×568, 390×844,
430×932, 844×390 and 200% reflow, including rank/time text and own position 22.
Canvas action games are not claimed to be fully accessible.

## Visual revision regression coverage

`visual_browser_test.py` additionally plays Normal and Daily with real keyboard
inputs in isolated profiles, checks the separate records after reload, observes
flap/point/collision effects, freezes their clocks and canvas during pause, and
restarts twelve times without growing effect arrays or extra RAF loops. It
checks live Reduced Motion changes, the removed home links/chips, preserved
typed commands, desktop/mobile/landscape/200% reflow and actual offline reload
with the new cached assets and removal of the previous shell cache.

`game.test.mjs` compares decorated/undecorated Daily runs across all four skins,
60/240 Hz and Reduced Motion, including the next physics RNG value, hitboxes,
gates, motion and scoring. Existing cadence tests also cover 120/144 Hz. Effects
are exercised through 100 resets and expire within their bounded buffers.

Review PNGs and a real-time video are intentionally committed under
`docs/packet-flight-visuals/`. `tools/capture-packet-flight.py` reproduces the
**after** images and records an input-driven three-point Daily run with Chromium
and the cloud's `/usr/bin/ffmpeg`. In this cloud Playwright 1.62 expects its
encoder at `ffmpeg-1011`; the provided encoder was exposed using:

```sh
mkdir -p /tmp/packet-flight-playwright/ffmpeg-1011
ln -sf /usr/bin/ffmpeg /tmp/packet-flight-playwright/ffmpeg-1011/ffmpeg-linux
PLAYWRIGHT_BROWSERS_PATH=/tmp/packet-flight-playwright python3 tools/capture-packet-flight.py
```

This is a cloud review helper, not a visitor dependency or a private-computer
setup step. Video is real wall-clock playback; test-only observers read state
and count events without changing physics, scores, seeds or production modules.

Before a later backend activation, run the same suite again and verify health,
CORS and a voluntary test submission against an authorized staging Worker.
Observe the actual Free CPU/DB quotas. No production load/abuse tests are needed.

## PR #2 regression coverage

- An alias dialog with an expired token disables fresh publication; a new valid
  run and reopening reset disabled/read-only/validation/form states.
- A lost reply keeps an immutable manually retryable payload. Expiry and editing
  the DOM do not change it. No timer sends it; a new run clears it.
- D1 confirms an identical processed request after expiry, rejects changed fields
  and expired unused runs, and preserves the original position receipt on retry.
- Top 20 includes ranks and server timestamps; own position 22 is shown separately.
  Equal scores/timestamps sort by stable entry ID, even with reverse insertion.
  Lower scores preserve best-value rank/time; Daily receipts keep the start day.
- Responses contain only public entry fields, never other players’ IDs/hashes.

## pf-2 escape checks

The backend suite separates malformed/out-of-range score 400 from inconsistent
components 422, including the inclusive 19980 aggregate/SQL bound. The independent
active-time limit is preserved: maximum components do not bypass duration checks.
Additional checks cover SQL integer/formula constraints, additive pf-1 row
preservation, repeated migrations, missing-schema health and year-long Normal
retention. All SQL mutations use ephemeral emulated D1; strip production credentials
from the test subprocess. Production schema checks are SELECT-only.

`escape.test.mjs` also samples 1000 deterministic routes through 80 gates at
maximum difficulty while collecting optional fragments; this is reachability
evidence for an input-only controller, not a universal fairness or human study.
`escape_browser_test.py` plays to 30 gates via actual keyboard and touch inputs,
collects fragments, observes moving/compressing gates, all trace/laser phases and
full pause snapshots. Touch runs use 390×844 with Reduced Motion. Observers read
Flight/Effects in intercepted modules; no production debug hooks, gameplay writes,
forced scores, seeds or collision bypasses are shipped. Artifacts go to /tmp.

`tools/capture-pf2.py` generates committed before/after images, phase screenshots
and a real wall-clock input-driven run through both attacks and compression.
Serve this checkout on port 8000 and an exported main/34e47d6 tree on port 8001;
use no extra Git worktree. Run with the FFmpeg bridge already described:
`PLAYWRIGHT_BROWSERS_PATH=/workspace/cloud-tools/playwright python3 tools/capture-pf2.py`.
The real-time driver anticipates 100ms of browser/protocol input latency but
never changes physics. Initial failed captures are not evidence of completion;
the committed video metadata must show the completed current run.

The enabled-API privacy regression verifies that local play/page load sends no
backend requests until explicit online action. Physical iOS/Safari/Android, legal
review, pf-2 production CPU and a voluntary production score remain release checks.

## Release preparation regressions

`python3 tests/release_metrics_test.py` exercises seven fail-closed CPU/quota
gates without credentials or network I/O. The live read-only aggregate helper
`python3 tools/pf2-release-metrics.py --gate` uses the network-bound Cloudflare
secret only for api.cloudflare.com. CPU fields are microseconds, not milliseconds.
Empty samples are unknown, not a successful zero-CPU test. No request logs are
needed. Release commands and exact stop/rollback gates: docs/PF2-RELEASE.md.

Additional application regressions retain the persisted pf-1 archive after the
old storage key is removed and complete the final explicit board selection when
Alltime → Daily → Alltime happens during an outstanding request.

## Bestätigte Speicherwahl und Terminal-Schnellbefehle (26.10.2026)

`python3 tests/privacy_navigation_test.py` prüft fünf echte Chromium-Szenarien:
RAM ohne Zustimmung/ohne Spielstand-Zugriff, alte Rekorde + Abwahl + erneute
Auswahl + Offline-Reload, Abwahl über mehrere Tabs, Upgrade eines echten alten
automatischen Service Workers und die drei Terminal-Schnellbefehle per Touch
bei 320/390 Pixeln sowie Tab/Enter/Leertaste. Screenshots liegen unter
/tmp/packet-flight-review/terminal-shortcuts-{320,390}.png. Vorhandene Befehle
bleiben erhalten; keine neuen Hero-Links oder Arcade-Buttons außerhalb des
Terminals. Frühere Aussagen über absichtlich fehlende Chips sind durch den
neuen ausdrücklichen Nutzerauftrag ersetzt.

Der Backendtest prüft jetzt zusätzlich lesende Retention-Erkennung, erhaltene
Zeilen trotz Health-Aufruf und das Zurückkehren zu unauffälligem Status nach
wirklicher isolierter Bereinigung. Die GitHub-Überwachung ist kein lokal
nachgewiesener produktiver Actions-Lauf; dessen Erfolg ist ein Release-Gate.
