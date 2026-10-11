# PACKET//FLIGHT leaderboard — prepared, disabled

GitHub Pages serves the unchanged static hosting model. This Worker is a separate,
optional API. No Cloudflare account, database, secret, paid plan or deployment has
been created by this change. `ENABLED = "false"` and the frontend's empty
`game/config.mjs` prevent activation. There is no automatic deployment workflow.

## Official documentation used

Reviewed during implementation on 11 October 2026:

- [Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [D1 Database and transactional batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

Only Workers, Web Crypto, D1 and a daily Cron Trigger are used. All are available
on Free. No Durable Object, paid rate-limit service, KV dependency or paid plan
is required. Free quotas can be exhausted and then the API can fail; the game
continues locally. D1 operations and cryptography still consume quota/CPU. Measure
the deployed Worker's actual CPU usage before enabling the frontend; emulator
tests cannot certify the production 10 ms Free budget. `cpu_ms = 10` is explicit.
Wrangler 4.100.0 and its stable Miniflare 4.20260611.0 are pinned in the lockfile.

## Cloud development and isolated tests

All commands below run in a remote cloud checkout, not on the owner's computer.
Node 22+ is required. The frontend has no build step.

```sh
cd /workspace/tr1stan.de/cloudflare-worker
npm_config_cache=/tmp/packet-flight-npm npm ci --no-audit --no-fund
XDG_CONFIG_HOME=/tmp/packet-flight-config WRANGLER_SEND_METRICS=false npm test
XDG_CONFIG_HOME=/tmp/packet-flight-config WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply packet-flight --local --env= --persist-to /tmp/packet-flight-d1
```

Tests use temporary Miniflare D1 and deliberately fake test keys. They run the
actual workerd bundle for health/start and exercise the production handler with
the real emulated D1 binding and an isolated clock for expiry/midnight tests.
No production service receives requests. The migration is additive and applying
it twice through Wrangler is safe.

For interactive local API development, create **ignored** `.dev.vars.local`
with three distinct disposable test keys, each at least 32 random characters:
`SIGNING_KEY`, `PSEUDONYM_KEY`, `RATE_KEY`. Use `wrangler dev --local --env local`.
Only that development environment permits the separately configured loopback
origins. Do not deploy it, reuse test keys, or commit `.dev.vars*`. Frontend browser
tests inject a mocked HTTPS API into an isolated context without editing the
shipping empty API URL.

## Later activation — requires separate approval

Do these steps in an authorized cloud session **only after the owner approves**:

1. Review `docs/leaderboard-privacy-draft.md`, complete the legal review, and add
   the real active processing to `datenschutz.html` before any live run-start
   requests are enabled. Decide operator moderation/deletion procedures.
2. Create/use a Cloudflare **Free** account and enable the Workers Free tier.
   Do not upgrade to Workers Paid. Connect it securely in the cloud. CLI login
   or a scoped Cloudflare API token is a separate connection, not a GitHub token.
3. From this folder run `npx wrangler d1 create packet-flight`. Record its
   `database_id` in the top-level D1 binding in `wrangler.toml`. Account/database
   IDs are configuration, not secrets. The all-zero ID is a placeholder.
4. Run `npx wrangler d1 migrations apply packet-flight --remote --env=`. Inspect
   the additive migration before applying it. Never reset a production database.
5. Generate three **different** cryptographically random server keys (at least
   32 random bytes each) using the authorized secret manager. Enter them securely
   with `npx wrangler secret put SIGNING_KEY --env=`, then `PSEUDONYM_KEY` and
   `RATE_KEY`. Never put values in source, frontend, chat, GitHub variables,
   logs or command arguments. For noninteractive cloud automation, use a
   separately scoped `CLOUDFLARE_API_TOKEN` secret and a nonsecret
   `CLOUDFLARE_ACCOUNT_ID`; no such automation is configured here.
6. Deploy the default **production**, still disabled, configuration with
   `npx wrangler deploy --env=`. Use its `https://…workers.dev` URL. Do not change
   the website domain, DNS, Pages configuration, IONOS or Proton Mail.
7. Check `/api/health`: `version` must be `pf-1`, `configured` true. Verify CORS,
   error handling, quotas and CPU. Set only production `ENABLED = "true"` and
   deploy again after authorization. Do not add development origins there.
8. Put that HTTPS **origin only**, without path/query/credentials, into the single
   `API_URL` export in `game/config.mjs`. Bump `game-sw.js`'s shell cache name and
   review the frontend change. Publish Pages only after separate approval.
9. In a permitted test profile, verify run-start, explicit voluntary score
   submission, identical retry, HEUTE/ALLZEIT separation, disabled/timeout
   fallback and the operator deletion procedure. No production abuse/load tests.

Disabling `API_URL` again stops every Cloudflare request from a freshly loaded
game. Remove or replace the game service-worker cache when shipping config/rule
changes. Existing open tabs retain their loaded version until reload/closure.

## API contract

All replies are JSON (except 204 OPTIONS), `Cache-Control: no-store`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Vary: Origin`.
No cookie authentication. Tokens and IDs never appear in URLs.

| Endpoint | Input | Result |
|---|---|---|
| `POST /api/run/start` | `{mode:"normal"|"daily", version:"pf-1", playerId:UUIDv4}` | signed token, run ID, server start/expiry, day, seed, version, mode |
| `POST /api/score` | `{token, playerId, alias, score, activeMs}` | stable `{accepted:true, receipt, score, mode, day, version, positionAsOf, ownEntry}` |
| `GET /api/leaderboard?mode=alltime` | optional `X-Player-ID` header | normal top 20, rank/time, `own` marker and requesting browser’s `ownEntry` |
| `GET /api/leaderboard?mode=daily` | optional `X-Player-ID` header | current UTC day's Daily top 20 and requesting browser’s `ownEntry` |
| `GET /api/health` | none | version, enabled/configured status; no secrets |
| `OPTIONS` | permitted Origin/method/headers | required CORS preflight |

POST requires `application/json`, max 2048 actual streamed bytes, strict fields
and types. Scores are finite integers 0–1000. Active milliseconds are integers
0–1,500,000. Run TTL is 30 minutes. Aliases use the **same imported validator**
as the browser: NFC, trim, 2–16 Unicode codepoints, letters/numbers/ASCII spaces/
underscore/hyphen; controls, direction marks and every other character fail.
No HTML is returned from user data.

Production CORS allows only `https://tr1stan.de`. POSTs without Origin fail;
nonbrowser clients can forge Origin, so **CORS is not authentication**. No
credentials are sent. Unknown methods, duplicate/unknown query parameters,
wrong versions and invalid players are rejected. Response codes distinguish
400/401/403/409/410/413/415/422/429/503.

Health checks from the authorized cloud after deployment:

```sh
curl -fsS https://YOUR-WORKER.workers.dev/api/health
curl -i -X OPTIONS https://YOUR-WORKER.workers.dev/api/score \
  -H 'Origin: https://tr1stan.de' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
curl -i 'https://YOUR-WORKER.workers.dev/api/leaderboard?mode=daily' \
  -H 'Origin: https://tr1stan.de'
```

For a score test, use an isolated browser profile to start a real test run and
choose SCORE EINTRAGEN. The cloud test suite already covers invalid tokens,
aliases/types, score/time bounds, identical retry and concurrency. Never log
token bodies while debugging or send fabricated scores to a public board.

## Consistency and fairness boundaries

HMAC-SHA-256 via Web Crypto is fixed in code, with a `pf1` prefix; no caller
selects an algorithm. The signature binds a server-created run to a keyed player
hash, mode, rule version, UTC start day, seed and deadline. Server data, not
client-submitted dates/modes, chooses the board. Normal randomness uses server
crypto; Daily uses the same `pf-1`/`daily-1` generator as offline play.

One transactional D1 `batch` conditionally consumes the run, inserts/upgrades
its best score, and reads the stored confirmation. A concurrent different body
cannot alter it. An identical retry receives that same confirmation, including
after token expiry while the run is retained (48 hours after expiry, subject to cleanup).
All five submitted field values must remain unchanged; even changing alias
whitespace is conflicting reuse. An expired unused run cannot make a new entry.
The frontend retains an immutable payload only in the current result dialog,
lets the user resend it explicitly, and discards it on a new run or page reload.
There is no automatic retry or hidden upload queue.
Best values are unique per player hash/version/mode/day; a worse or equal value
does not change alias, score or achievement time. Ties sort by earlier server
achievement time, then stable random entry ID. That ID never leaves the backend.

Public entry fields are `position`, `alias`, `score`, `rank`, `achievedAt` (server
Unix milliseconds) and `own`. Top 20 and own-position queries use the same
ordering in a single read transaction; `ownEntry` is null without a matching
requesting browser header. It includes the browser's best value even below the
Top 20; it never lists extra entries or identifiers of other players.

Submission receipts store that browser's best-value `ownEntry` and
`positionAsOf` in the consumption/upsert transaction, retaining the original
position on retries. It is a placement snapshot, not a promise that position
will remain unchanged. For a lower run, it shows the preserved better value and
its original achievement time. The receipt keeps the server's start-day scope
over UTC midnight, while HEUTE subsequently shows only the current UTC day.
The UI formats timestamps with an explicit UTC label and shows both confirmed
placement and the requesting browser's current placement on the board.

`minimumActiveMs` is derived from the fastest speed, first-gate distance,
full-hitbox passage and minimum gate spacing in the shared physics rules.
Both the submitted active time and server wall-time ceiling are checked with
a small fixed rounding tolerance. **Client active time is only a claim**.
The server cannot prove the duration of pauses or whether honest play occurred.
A signed start token proves neither valid flaps nor a collision-free run.
These checks hinder simple manipulation, not determined cheating. There is
no replay verifier, account identity or fingerprinting.

One browser profile can have one best value in each scope. Other devices,
profiles or cleared storage can create more entries. Full player IDs/hashes
are not publicly returned; `own` is a personalized boolean based on a header.
There is no claim of complete anonymity.

## Free-compatible abuse controls

Minute/day rate counters are atomic D1 upserts keyed by scope and a daily HMAC
of Cloudflare's `CF-Connecting-IP`. That header comes from Cloudflare in
production; missing network identity fails closed. Raw IP is used briefly to
calculate a digest, never stored by this application or logged. Cloudflare can
process/log network metadata under its own policies. Changing player IDs does
not bypass network counters. Shared networks share limits.

| Scope | Per minute / per UTC day |
|---|---|
| Run starts | 10 / 200 |
| Submissions, including retries | 8 / 200 |
| Board reads | 40 / 1000 |

An additional 20,000 API operations/day counter protects across networks. There
is no polling. Rejected requests still use platform/DB resources; IP rotation,
distributed attacks or health/preflight floods can exhaust the Free quotas.
No application rate limit guarantees availability or makes the Free quota
unlimited. Free plan exhaustion must fail locally, never trigger a paid upgrade.

## Retention, moderation and key rotation

The daily 03:17 UTC scheduled handler removes:

- Run records 48 hours **after their expiry**, then at the next daily cleanup
  (up to 72 hours after expiry). They contain keyed player hash, version/mode/
  seed/day, times, consumed state and submitted alias/score/confirmation.
- Daily scores older than the current UTC day plus 29 previous days (30 UTC
  days retained, plus at most one cleanup interval).
- Minute counters after their 2-minute expiry; daily/global counters after their
  48-hour expiry; deletion occurs at the next daily cleanup (up to 24h later).

All-time best values stay until operator deletion or an announced reset. This
longer retention needs explicit privacy review before activation. Monitor Cron
execution; a failed cron delays deletion. Cloudflare backup/Time Travel retention
is separate from our live tables and must be disclosed from the actual plan.

Moderation uses the authenticated Cloudflare dashboard or narrowly scoped
Wrangler CLI only. No public admin endpoint exists. First inspect privately:

```sql
SELECT entry_id, alias, score, mode, day FROM scores ORDER BY achieved_at DESC LIMIT 100;
```

After verifying the offending random `entry_id` as a UUID, use an operator
reviewed SQL file (never interpolate aliases or untrusted text into SQL):

```sql
DELETE FROM runs WHERE player_hash IN (SELECT player_hash FROM scores WHERE entry_id = 'VERIFIED-ENTRY-UUID');
DELETE FROM scores WHERE entry_id = 'VERIFIED-ENTRY-UUID';
```

Apply it with `wrangler d1 execute packet-flight --remote --env= --file ...` only
after operator approval. To fulfill a full profile deletion, delete **all** its
scores by the privately resolved player hash too. Existing receipt retries
cannot restore removed scores; a new run/profile can submit again. There is
no durable ban/identity system. Keep audit records outside public application
data and omit request bodies/keys.

Rotate SIGNING_KEY to invalidate outstanding tokens. Rotate RATE_KEY to reset
digest linkage/counters. PSEUDONYM_KEY rotation changes browser-to-score linkage;
plan a reviewed reset/migration and deletion of old hashes, rather than silently
duplicating existing players. Keep the three keys distinct. Retired rule versions
must not be merged into the current board.
