# pf-3 checkpoint — not published

Current working branch codex/packet-flight-pf3; baseline main8445785. User asked
for harder/fairer routing, distinct pf-3 records and full cloud release. No
production changes yet. Existing game/*.mjs paths deliberately remain pf-2;
new implementation lives in game/pf3 to keep cached clients and valid pf-2
tokens usable. New migration0003 only adds pf-3 tables, because existing v2
CHECK constraints enforce pf-2. Existing rows/secrets unchanged.

Prototype: speed190→225→270→310, gap210→185→160→145, target interval
1.65→1.45→1.30→1.15, gates0/5/12/25, continuous acceleration12 units/s².
Gravity/flap/hitbox unchanged. Spatial spawn schedule preserves tempo-dependent
distance and permits a version-specific O(1) minimum-time bound. Route motifs,
100–170-unit changes and variable-height specialist safety areas implemented.
These remain provisional until stronger clearance/play/browser checks pass.

Backend dual-version stage is implemented with production ACTIVE_RULESET=pf-2,
PF3_STARTS=false, LEGACY_STARTS=true. Existing17 plus new7 backendtests passed
before archive-date support was added; a fresh24-test run follows. No deploy.
Global atomic rate limits remain shared across versions. Signed token prefix,
version, seed, table and duration rules are checked together. Old issued valid
runs/retries are accepted even after old starts are disabled. Final flags will
be ACTIVE_RULESET=pf-3, PF3_STARTS=true, LEGACY_STARTS=false only after backend
compatibility/migration/gates are actually verified.

Prototype reachability:1000 seeds ×150 gates with120ms predictive input latency,
minimum taps120–200ms, finite policy variants all reachable. Six seeds reached
1000 gates. First clearance sweep:919/1000 have a witness with≥10units across
physical gates/projectiles/laser; others reachable with smaller reserves. This
is NOT yet final fair-play evidence, NOT a human fun test. Additional input
policies/targeted tuning running in /tmp/pf3-work. No score/physics writes by
the play() driver, only flap() and actual step(). All production scores untouched.

Current frontend is a WIP: separate pf-3 modules, own records/archives and old
public archive page added. Still required: final reachability/margin tuning,
version/cache upgrade, archive/date/old-token tests, port full existing browser
suite to pf-3 while preserving legacy tests, actual keyboard/touch runs and
input-automated video, HTML/privacy/docs review, full fresh tests, releaseplan
and read-only production baseline. No production schema mutation until complete
reviewable migration/testing evidence. No new secrets/paid services/DNS/mail.

Use a backend-compatibility PR before the final frontend PR because Pages and
Worker builds run independently. Old module URLs must stay byte-identical.
Do not claim historical pf-2 tests as fresh pf-3 tests. Never weaken the8ms
CPU gate or atomic limits. No extra public score entries or production loadtest.
