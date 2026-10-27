# PACKET//FLIGHT pf-2 backend

GitHub Pages remains the static host. The existing Cloudflare Worker/D1 backend
is active; the approved workers.dev API is connected in game/config.mjs.
Online run is unchecked by default and no board request is sent on page load.
Workers Free / Current plan / 0 USD was manually confirmed by the operator;
D1 allowance follows the official Workers-Free pricing table. No upgrade.

Current release evidence, source/deployment IDs, controlled rollback and the
remaining manual Builds-API-403 step: [release log](../docs/PF2-RELEASE-2026-10-27.md).
Both additive migrations are applied. Existing data and the three runtime secret
bindings are preserved. Normal and Daily Release_Check entries were confirmed
and re-read; no more test runs are authorized by the two-run release budget.
The active CPU P99 is below the unchanged 8-ms gate in the observed sample;
telemetry count discrepancy and platform limits are explicitly documented.

## Historical pre-release evidence (26 October 2026)

Authenticated read-only queries confirmed the existing Worker and D1 binding
`bc462466-1ed9-41d9-ab75-dc0197d50502`. Public health reports **pf-1**, disabled,
configured. D1 contains `runs`, `scores`, `rate_buckets` and their pf-1 indexes;
`runs_v2`, `scores_v2` and `d1_migrations` are absent. The schema SELECT returned
`rows_written=0` and `changed_db=false`. Configured keys SIGNING_KEY,
PSEUDONYM_KEY and RATE_KEY were identified by binding names/types only; values
were not read or changed. Do not recreate the database or replace those keys.

Logpush was reported false and observability null. This does not establish
Cloudflare's complete logging, backup, legal or geographical configuration.
The serving region of a single response does not establish data residency.

## Isolated cloud development and checks

Node >=22; pinned Wrangler 4.100.0 and Miniflare 4.20260611.0. Website visitors
need no Node, package installation or build. Work in the existing cloud checkout.

```sh
cd /workspace/tr1stan.de/cloudflare-worker
npm_config_cache=/tmp/packet-flight-npm npm ci --no-audit --no-fund
XDG_CONFIG_HOME=/tmp/packet-flight-config WRANGLER_SEND_METRICS=false npm test
```

`npm test` bundles with **wrangler deploy --dry-run** (no upload/deployment),
then exercises real workerd and ephemeral Miniflare D1 with fake test keys. It
applies both SQL migrations only inside that test database. Strip Cloudflare
credentials from the subprocess if present; local tests do not need them.
Tests include pf-1 row preservation, repeated additive migration, missing-schema
health, SQL constraints, score components, time bounds, retries, concurrent
submissions, tie order, own position, limits and retention.

For interactive local development only, use `wrangler dev --local --env local`
with ignored `.dev.vars.local` containing three distinct disposable test keys of
at least 32 characters. Never copy production keys into a local file. Loopback
CORS origins are allowed only in that development environment. Browser tests
route mocked HTTPS APIs inside isolated profiles. Local runs keep online selection
off; never submit local test data to production.

## pf-2 contract

All replies have no-store, nosniff, no-referrer and Vary: Origin. Tokens and
browser IDs never occur in URLs. Production CORS permits only https://tr1stan.de;
CORS is not authentication. No cookies or credentialed browser requests.

| Endpoint | Request / response |
| --- | --- |
| POST /api/run/start | `{mode,version:"pf-2",playerId:UUIDv4}` → signed pf2 token, seed, start/expiry, server UTC day |
| POST /api/score | `{token,playerId,alias,score,gates,fragments,bonusPoints,activeMs}` → stable receipt, submitted components, best-value ownEntry and placement snapshot |
| GET /api/leaderboard?mode=daily or alltime | Top 20; optional X-Player-ID personalizes ownEntry, including positions outside Top 20 |
| GET /api/health | version, enabled, configured, schemaReady; no key values |
| OPTIONS | restricted CORS preflight |

POST requires application/json, at most 2048 streamed bytes and exact fields.
Aliases share the browser's NFC validator: 2–16 Unicode letters/numbers, ASCII
spaces, underscore and hyphen; no markup, control or direction characters.

Server score = **10 × gates + bonusPoints**. Gates are integers 0–1000;
fragments are integers 0–gates. Bonus is even and between 2 × fragments and the
combo ramp `2+4+6+8+10`, followed by 10 per additional fragment. The integer
score must be 0–19980. Out-of-range/malformed scores return **400**; in-range
scores inconsistent with components return **422**. SQL independently checks
integer values and component/score bounds. Ranks derive from gates, not points.

19980 is the inclusive conservative aggregate/storage bound (1000 gates,
1000 fragments, 9980 bonus), **not a promise that a timed game can reach it**.
The API also enforces 0–1,500,000 active milliseconds, gate-derived minimum time,
server wall time and a 30-minute signed-token TTL. At 1000 gates the minimum
exceeds that active-time limit; a consistent maximum aggregate therefore reaches
the time check and returns 422. Tests deliberately keep that independent check.
Signed aggregate/time checks cannot prove honest play, optional-fragment timing,
collision avoidance or unmodified clients. No replay verification is claimed.

HMAC-SHA-256 uses the fixed pf2 prefix. A token binds player hash, rule version,
mode, UTC start day, seed and deadline. Daily uses escape-1, matching offline
play. pf1 tokens are rejected as retired. New tables isolate pf-2 comparisons.

A transactional D1 batch consumes the run once and conditionally improves its
best score. An identical manually initiated retry returns the original receipt,
including after expiry while retained. Every submitted field must remain
identical. Competing different valid payloads return 409. Worse/equal scores do
not replace alias/time/best. Ordering is score DESC, server timestamp ASC, stable
entry ID ASC for both Top 20 and ownEntry. Receipts preserve their original
position snapshot; Daily receipts preserve the server's start day over midnight.

## Storage, abuse limits and deletion

Cron at 03:17 UTC removes pf-2 runs 48 hours after token expiry, Daily rows older
than current UTC day plus 29 previous days, Normal rows with achievement times
older than 365 days, and expired rate buckets. A successful daily cron can add
up to one interval to deletion times. Its success must be monitored.

Legacy pf-1 tables/rows are preserved by migration and pf-2 cleanup; decide their
retention/deletion separately with the operator before release. There is no
silently destructive reset or migration of old scores into new comparisons.

IP addresses are processed transiently into daily keyed HMAC rate buckets; raw
IPs are not stored by this application. Cloudflare may separately process/log
network metadata. Limits per minute/day: starts 10/200, submissions 8/200,
board reads 40/1000; global 20,000 operations/day. Rejected requests still cost
resources. Shared networks share limits. These controls do not guarantee
availability or protect Free quotas against distributed traffic.

Moderation/deletion uses privately reviewed operator SQL, never alias string
interpolation or a public admin endpoint. Resolve the entry/player hash privately
and remove related pf-2 scores and runs/receipts so old retries cannot restore
removed data. Do not post player IDs or hashes publicly. Do not execute deletion
SQL as part of development checks. Key rotation is a separate reviewed operation:
SIGNING_KEY invalidates tokens, PSEUDONYM_KEY changes identity linkage, RATE_KEY
changes rate-digest linkage. Preserve all existing keys for this release work.

## Historical staged release checklist

The controlled release and rollback were explicitly authorized and executed as
recorded in the dated release log. The old preparation checklist below is
historical, not a new approval requirement; current versions/state and remaining
CI action must be read from that log.

1. Complete the concrete provider/contract/log/backup/retention and legal review
   in docs/leaderboard-privacy-draft.md; publish accurate notices first. Keep
   API_URL empty and Worker disabled while doing so.
2. Re-read actual production schema and inspect both additive migrations. With
   separate approval, apply only missing schema. There is no migration ledger
   currently: do not assume a filename is already recorded. 0001 uses IF NOT
   EXISTS and must preserve existing pf-1 rows; 0002 adds the pf-2 namespace.
   Use the existing D1 database; never create/reset a replacement as a shortcut.
3. Deploy pf-2 still disabled with the existing keys and binding. Health must show
   version pf-2, configured=true and schemaReady=true. Test CORS and error/fallback
   behavior. Measure Free CPU/DB use; emulator tests cannot certify the Free
   10-ms HTTP CPU budget. Do not introduce a cpu_ms block that caused error 100328,
   upgrade a plan, or start production load tests.
4. After separate activation approval, enable the Worker and verify authorized
   staging behavior. Set the existing HTTPS Worker origin into API_URL only after
   backend evidence; bump the game shell cache and publish Pages only when approved.
5. A genuine voluntary production score submission, reload/readback, mode/rank/
   position checks, deletion procedure and production CPU evidence remain release
   checks. None were performed by the current task. Disable/fallback and an old
   open tab's loaded version must be considered in rollback planning.

References: Cloudflare official Workers Web Crypto, D1 migrations/transactions,
Workers platform limits/pricing, D1 limits, and Wrangler secrets documentation.
No DNS, IONOS, Proton Mail, website-domain or hosting-model change is required.

## Retention monitoring

Health now returns `retentionOverdue: boolean|null`: read-only existence queries
for runs, Daily/Normal bests and rate buckets beyond their retention deadline
plus one daily cleanup interval. It does not delete data and exposes no row data.
The Secret-free `.github/workflows/pf2-retention.yml` reads health daily at
04:47 UTC; GitHub schedules can be delayed. Unknown schema/status, overdue data
or a disabled Worker fail the job. Existing daily cleanup still runs 03:17 UTC
and propagates errors to scheduled invocation outcomes. Inspect failed/missing
Actions and Cloudflare cron invocations; no notification preference is changed.
Run the workflow once manually after activation and verify its actual result
before connecting the frontend. A locally passing test is not an Actions proof.
