# Remote-cloud validation

Tests create isolated browser profiles, mocked HTTPS API responses and temporary
Miniflare D1. They do not submit to `tr1stan.de` or any production API. Run them
only in the remote development environment.

```sh
cd /workspace/tr1stan.de
python3 -m http.server 8000 --bind 127.0.0.1
# In another cloud terminal:
node --test tests/game.test.mjs
python3 tests/site_test.py
python3 tests/browser_test.py
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
review step. Canvas action games are not claimed to be fully accessible.

Before a later backend activation, run the same suite again and verify health,
CORS and a voluntary test submission against an authorized staging Worker.
Observe the actual Free CPU/DB quotas. No production load/abuse tests are needed.
