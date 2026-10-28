# pf-3 backend compatibility stage —28 October2026

Companion to the complete pf-3 tuning/record/cache upgrade on
`codex/packet-flight-pf3` at85a763d24691a77aaf5b2683cd461748e0516919.
Baseline main8445785ef19850741a83af76d1e7d5370a089b26 was re-read today.
This stage deliberately leaves published game.html, SW and old module paths
unchanged. ACTIVE_RULESET=pf-2,PF3_STARTS=false,LEGACY_STARTS=true. New pf-3
tokens are not issued yet. Pages/Worker independent automatic build order is
therefore safe. Existing Build commands/root/main/--keep-vars remain unchanged.

Dual-version token validation and allowlisted SQL namespace dispatch accept old
valid pf-2 tokens using exactly their original rules/seed/time bounds; pf-3 uses
its immutable new rules. No public scores are copied. GET without version stays
pf-2 for cached clients. Explicit pf-2 Daily archive dates are bounded to30UTCdays.
Global/minute/day rate limits remain shared and atomic. Stable receipt retry,
score19980, time/TTL, origin, player identity and strict component checks remain.
Retention covers both namespaces; health probes both schemas. CPU P99 gate stays
<8000µs, min5 project samples, daily account quota margins stay50%.

Migration0003 is additive only. New tables are necessary because existing v2
CHECK(version='pf-2') prevents a safe shared-table version insert. Existing rows,
indexes and constraints are unchanged. No table reset, data copy or secret change.
The28 October08:01UTC baseline has eight pf-2 public scores,13pf-2 runs, empty
pf-1 score/run tables, migrations0001/0002, three existing secret bindings.
Schema/public-row fingerprints are privately recorded; no tokens/private IDs.

Complete preflight of the full proposed release:49Node,27backend,63Python cases
passed and six HTML documents validated. Backend includes isolated realworkerd/D1,
golden pre-upgrade signed token, migration old-row/schema preservation, strict
per-version time bounds/max score and parallel mixed-version limits. Browser
normal/Daily submission/readback uses isolated workerd/testD1 only. No public
score tests, new run starts or load tests have been made for this release.

After review, apply only0003 to the existing production D1, check original row
fingerprints/schema and secret names, merge this PR, inspect actual auto Worker
Build/Pages/health/settings and bounded functional GETs; enforce unchangedCPU/
quota gates. New frontend activation follows only after those checks pass.

Before pf-3 tokens exist, code rollback may restore the old Worker while leaving
additive empty tables intact. Once anypf-3 token has been issued, retain dual
submit validation and stop only new starts on rollback; do not deploy a pf-2-only
backend until their normal lifetimes have expired. No DB rollback/drop/reset.
Physical devices/Safari/human enjoyment remain untested. No fresh public entry
is needed or allowed by this task. Final actual deployment IDs/results will be
recorded in the full release PR after the compatibility stage succeeds.
