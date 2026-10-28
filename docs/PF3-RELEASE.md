# PACKET//FLIGHT pf-3 — tuning and controlled release

Release in progress, 28 October2026 (UTC evidence timestamps). Baseline main was
freshly read as8445785ef19850741a83af76d1e7d5370a089b26. All work is in cloud;
no private-computer work, new services, secrets, tariffs, DNS or mail changes.
The prior pf-2 release budgets/evidence remain historical and are not overwritten.
No new public test entries or production load tests are permitted in this task.

## Actual rules and player-visible changes

| Gates passed | Target speed | Ordinary target aperture | Target spawn interval |
| --- | ---: | ---: | ---: |
|0|190|210|1.65s|
|5|225|185|1.45s|
|12|270|160|1.30s|
|25+|310|150|1.15s|

Linear interpolation by passed gates, not score or fragments. Speed approaches
its target at12 units/s²; it never jumps at passage. A visible gate keeps its
spawn-time geometry. Therefore targets do not describe an abrupt change to gates
already on screen. The input sample at passing5/12/25 observes approximately
218/263.57/306.92, reaching310 by26. Initial spawn spacing313.5units grows to
356.5; time intervals shorten with tempo. Ordinary apertures reach150 by the
spawned gate27. Closing gates add12 and close by12, keeping the same minimum.
Gravity900, flap−310, terminal520,120Hz, hitboxes and world bounds are unchanged.

150 instead of the140 tuning target retains room for the tested delayed inputs
at310, with moving/closing apertures and subsequent gates. Earlier prototypes
were discarded; their results do not certify this final revision. Existing
Synthwave background/design/audio/Reduced Motion remain; no new background.

Ordinary centers change100–170units; bounded eight-candidate ranking mixes short
stairs and reversals, penalizes repeated alternation, and reflects at safe world
bounds. Twelve fixed RNG draws and one independent enemy draw per gate: no
unbounded rejection or player-dependent Daily world stream. Gates2–4 already
change height, gate4 moves. Motifs span substantially more height than oldpf-2.
Across1000 sampled routes, even ignoring motion/hazards, a40-unit horizontal
tube after hitbox subtraction lasts at most8gates; a60-unit tube at most6.
Thin mathematical intersections can persist longer and are not claimed absent.
Trace/laser phases further require active avoidance. Fragments remain optional. Actual reachable input routes without chasing them
are tested; collection is separately exercised in keyboard/touch play tests.

Trace at12 then every16, laser at20 then every16. The former broad five-gate
areas become four narrower trace gates(220/210/205/205) and three laser-footprint
gates(220/190/ordinary aperture); there are no two broad pre-event gates.
Trace recovery covers shot travel; anchors vary240–472 instead of fixed360.
Laser recovery changes height toward the safe side. Trace warning/track/lock
remain.6/.6/1s and projectile440: more than1.7s from target lock to player hit.
Laser warning/charge remain.8/.8s, active.42/fade.35. Targets, safe direction and
next gate are tested together with actual jump physics.

## Version, old records and privacy

New `pf-3` / `escape-2` Daily stream. New local key
`tr1stan.packet-flight.pf-3.storage-1` starts Normal/Daily scores at0, archives
pf-2 scores and inherits skins/progress/settings/pseudonymous browser ID only
with the already explicit storage choice. Original pf-2 key is not rewritten.
Declined/unselected or blocked storage still uses RAM. Old local Daily values
are individually visible in native details, rather than silently discarded.

`/game/archive.html` explicitly loads old public pf-2 Normal or retained Daily
UTC days; no automatic request, browser ID, score copying or archive storage.
Old public rows keep their existing30UTC-day/365-day retention. Run receipts
remain48h after token expiry; both namespaces receive daily cleanup monitoring.
Privacy notices explain version separation and archive access. Contact/DPA/
consent choices are retained.

Old `/game/*.mjs` and CSS remain byte-identical to8445785, verified by frozen
hashes. New modules use `/game/pf3/*?v=pf3-1`; cache is
`tr1stan-packet-flight-pf-3-shell-1`. The SW accepts old/new storage messages,
upgrades existing opted-in shells and clears/unregisters on revocation.
Unmodified cached pf-2 code therefore cannot accidentally use pf-3 rules.

Dual backend verifies token prefix+signed version+seed+identity+expiry and
selects only fixed allowlisted SQL identifiers/rules. Old valid tokens retain
their normal lifetime even once old starts return an update409. Issued new
tokens remain submittable if new starts are temporarily held. Identical retained
retries retain original receipts. Server19980/component/time/TTL/origin checks
and atomic shared rate limits remain. These aggregate checks cannot prove an
unmodified client or honest collisions; no replay verification is claimed.

Migration0003 is additive and necessary: existing v2 SQL CHECK constraints
requirepf-2. New tables/indexes only. No old row migration/copy/update/delete,
secret rotation or database reset is part of this release.

## Evidence and limits

Fresh final aggregate test results are appended below when complete. Earlier
intermediate passes are not substituted for the post-resume final run. Temporary
logs lost in the cloud restart were not treated as completed aggregate evidence.
Current raw logs persist in `/workspace/pf3-evidence`; public summaries/hashes
will be stored here before release.

[Input-automated video](packet-flight-pf3/pf3-input-automation.mp4), recorded
27 October2026,49.4s MP4 with45.88s real wall-clock gameplay to35gates,score360
(350 gates+10 incidental fragment bonus),tempo310. Real keyboard input and RAF;
no game-state/score/seed/clock writes. Overlay explicitly marks automation/local
play/no public entry. All moving/closing and eight trace/laser phases observed;
zero public API calls, zero page errors. [Metadata](packet-flight-pf3/video-metadata.json)
contains original source hashes/MP4 hash. The internal Flight has no seed field;
metadata's null seed is not a captured seed. Daily seed3484642483 derives from
the displayed2026-10-27 UTC day and immutable pf-3 rules. The clip is not a human
achievement or a human enjoyment study. `tools/capture-pf3.py` reproduces a local
real-time recording for the then-current Daily with input-only policy selection.

Reachability witnesses use actual120Hz physics/flap inputs,120ms predictive
input delay, minimum tap intervals120–200ms and≥10units separation from gates,
projectiles, active laser, ceiling and floor. They show existence under the
sampled seeds, not fairness for every seed/skill/device or human play enjoyment.
Long witnesses use bounded segmented input-policy backtracking, then replay the
complete actual input ticks from a fresh Flight. This search is test-only;
production generation never performs it. Browser tests separately use actual
keyboard/touch events; virtual-clock browser runs are labeled separately from
the real-time video. Physical devices and Safari remain untested.

## Release order and failure handling

1. Finish final tests, whole-diff/security/version review and fresh authenticated
   SELECT/metadata baseline. Save original public-row fingerprints/schema hash,
   active version/deployment, binding names and migration ledger. Never print
   credentials, private row IDs or tokens.
2. Review and apply only migration0003 to the existing D1. Verify original v2
   schema/public rows and runtime secret names unchanged; v3 tables empty. Old
   Worker ignores new empty tables. Abort on discrepancies; do not reset/drop.
3. Merge a targeted backend compatibility PR. Production flags remain
   ACTIVE_RULESET=pf-2/PF3_STARTS=false/LEGACY_STARTS=true. Auto Worker Build and
   Pages both run from main. This PR does not switch game.html/SW; old site stays
   pf-2. Preserve production branchmain, root/, npm ci --prefixcloudflare-worker,
   deploy `./cloudflare-worker/node_modules/.bin/wrangler deploy --config cloudflare-worker/wrangler.toml --env= --keep-vars`, auto Builds on, previews off.
4. Confirm actual Worker deployment/config/schema and Pages. A small fixed set
   of functional health and old/new board GETs, no starts/submissions, provides
   live compatibility/CPU checks. Rate-limit writes from board GETs are normal
   application counters, not score test entries. Aggregate GraphQL must pass the
   unchanged8ms P99 gate with at least5 project samples, success/noerrors and
   daily account requests<50000,D1reads<2500000,writes<50000. Missing data fails
   closed; wait for telemetry rather than generate load or relax thresholds.
5. Merge compatibility main into pf3 branch without force, then final frontend PR:
   ACTIVE_RULESET=pf-3/PF3_STARTS=true/LEGACY_STARTS=false and monitor expectspf-3.
   Independent build order is safe: new page before Worker gets visible start
   error/retry; Worker before page rejects only new legacy starts with explicit
   update409. Already issued pf-2 submissions stay valid. Final live module/cache
   hashes, settings/bindings, public rows, archive, mobile/UI/health/CPU/quota
   evidence must match actually published main. No extra public test entries.
6. If compatibility build/check fails before any pf-3 token issuance: keep old
   frontend, revert compatibility code by a reviewed Git commit and redeploy old
   Worker; leave additive empty tables intact. After pf-3 activation, stop new
   pf-3 starts first and retain dual-version submit handling for issued tokens.
   Roll back frontend with a fresh cache version, while retaining versioned
   modules and both SQL namespaces. Reopen old starts only with old frontend.
   Never redeploy pf-2-only code while validpf-3 tokens could remain. No DBreset,
   destructive down migration or secret changes. A failed deployment is not
   recorded as a completed publication; record actual last working IDs.

## Completed preflight,28 October2026

49/49 Node tests(24 preservedpf-2,14 portedpf-3 core,11newpf-3),27/27
backend tests,63/63 Python cases(54 browser/integration,2site,7metricsgate).
Six HTML documents validate. Whole diff checked, all original rootpf-2 modules
match frozen hashes. A later focused route-tube assertion also passes. This
is139 automated cases, not139 human play sessions. Isolated normal and Daily
submissions/readback use real wall-clock browser runs+workerd+ephemeral D1.
192-point UI fixtures are explicit UI-only fixtures, not gameplay achievements.
No production submissions/starts or loadtest.

1000×150 input witnesses: minimum clearance10.125units; six1000-gate complete
replays: minimum10.458units, duration1155.633s each, maximum209/1200 bounded
policy search attempts. Public [preflight summary](packet-flight-pf3/preflight-evidence.json),
[seed witnesses](packet-flight-pf3/reachability-evidence.json),
[full long input ticks](packet-flight-pf3/long-witnesses.json) and
[source hashes](packet-flight-pf3/review-source-hashes.json). Raw logs are hashed
in the summary and retained in the cloud workspace.

Fresh production baseline08:01UTC: Worker03b8a198-ed4f-4913-9838-43fb88a2c233,
deploymentd423ba02-632a-485a-9af3-ad0fd650bd4a. Eightpf-2 public score rows,
13old-version runs, pf-1 tables empty; migrations0001/0002. SELECT metadata
confirms rows_written0/changed_dbfalse. Three existing secret binding names
and existing D1 UUID recorded, no credential values.

## Compatibility progress

PR#16 merged at08:08:22UTC as
`ea8d47413ea7fd2799cac35affd2dd483a519a81` (head
`eb8c87d33c717ab56f8489bbfee75309d8ff1ae5`). Only migration0003 was pending
and applied successfully(6commands,1.31msD1 reported). A TimeTravel bookmark
was saved privately; no restoration was performed. Subsequent authenticated
SELECT proves all eight publicpf-2 row fingerprints and old table schema hashes
unchanged, oldpf-1 tables still empty, v3runs/scores empty, and the same three
secret binding names/D1binding. [Preservation evidence](packet-flight-pf3/migration-preservation.json).
Automatic Worker Build and Pages are running for that exact merge SHA. This
is not yet the pf-3 frontend activation.
