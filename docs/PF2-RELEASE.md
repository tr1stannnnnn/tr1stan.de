> **Freigabe 26.10.2026:** Der Betreiber hat die vier Datenschutzentscheidungen und
> den kontrollierten Ablauf einschließlich begrenzter Tests und dokumentierter
> Rücknahmen ausdrücklich freigegeben. Keine weitere Zwischenfreigabe erforderlich.
> Aktueller konkreter Blocker: Builds-API weiterhin HTTP 403; ohne bestätigte
> tatsächliche Dashboard-Sperre kein main-Push, Merge oder produktiver Schreibzugriff.
> Keine Sperre als gesetzt behaupten. Die automatische GitHub-Überwachung benötigt
> nach der Aktivierung einen erfolgreichen manuellen Erstlauf vor der Frontend-Verbindung.
> Vollständige aktuelle Vertragsseiten sind wegen Netzwerk-403 nicht abrufbar;
> Quellen-/Vertragsstand siehe leaderboard-privacy-draft.md.

# PR #4 – ausführbarer Veröffentlichungsablauf

Stand 26.10.2026. **Kontrollierter Ablauf ausdrücklich freigegeben.**
Die produktiven Schritte sind autorisiert, bleiben aber bis zum Nachweis der
jeweiligen technischen Voraussetzungen angehalten. Keine neue allgemeine
Zwischenfreigabe anfordern. Bisher nur lesende Produktionsprüfungen, lokale
Änderungen und isolierte Datenbanktests; tatsächlicher Stand siehe
[PF2-RELEASE-STATUS.md](PF2-RELEASE-STATUS.md).

## 1. Festgestellter Ausgangszustand

| Gegenstand | Lesender Nachweis |
| --- | --- |
| Pages | GitHub API: legacy build, source main, path /, CNAME tr1stan.de, HTTPS erzwungen. Ein main-Push baut/veröffentlicht automatisch. |
| Letzter Pages-Stand | main `34e47d6e4a4e925c4ea688ac007035c38e5df53d`; erfolgreicher Pages-Build. |
| Workers Builds | main-Commit hat erfolgreichen Check „Workers Builds: packet-flight-leaderboard“, Build `6bc000fa-b1fc-4964-8dab-890e31b976e3`, Version `77300fb5-761f-4a97-91f7-343a3af74513`. Der PR-Head hatte keinen solchen Check. Automatische main-Builds sind historisch belegt. |
| Aktuelle Build-Schalter | Vom Betreiber am 26.10.2026 ausschließlich lesend im Dashboard manuell bestätigt: Produktionsbranch main, Disable builds AUS, Preview-Branches AUS. Main-Push/Merge kann damit produktive Builds/Deployments auslösen. API-Lesezugriff weiterhin 403; die manuelle Bestätigung ist als solche dokumentiert. GitHub-Hooks/Branchschutz waren ebenfalls 403. |
| Live-Worker | pf-1, enabled=false, configured=true. Aktive 100%-Version `c9ceaaf3-c911-4b41-bc6b-eb41dc493c33`. Deployment `2141879b-d313-4d03-a1c7-17b64954d733`. |
| D1 | Bestehende UUID `bc462466-1ed9-41d9-ab75-dc0197d50502`; runs/scores/rate_buckets, jeweils **0 Zeilen**. Keine pf-2-Tabellen, keine d1_migrations. SELECT meldet rows_written=0 und changed_db=false. |
| Region | running_in_region=WEUR, jurisdiction=null, Read Replication disabled. Keine EU-only-Garantie. |
| Secrets | DB-Binding und vorhandene SIGNING_KEY/PSEUDONYM_KEY/RATE_KEY-Bindungsnamen bestätigt; keine Werte gelesen/verändert. |
| Logs/Vertrag/Tarif | logpush=false, tail_consumers=[], observability nicht als expliziter Wert geliefert. Observability-Ziele, Billing/Subscriptions und Billing-Profil: 403. Das beweist keine vollständige Logfreiheit und keinen Tarif. |

### Manuell bestätigter Dashboard-Stand (26.10.2026)

Quelle: ausdrückliche Betreiberangabe aus Worker → Settings → Build. Nicht als
unabhängig gelesene API-Antwort ausgeben. Die Einstellungen wurden abgelesen,
**nicht verändert**. Worker packet-flight-leaderboard, Repository
tr1stannnnnn/tr1stan.de.

| Einstellung | Produktion | Previews Base |
| --- | --- | --- |
| Branch/Schalter | main; Disable builds **AUS** | Builds for Preview branches **AUS** |
| Root-Verzeichnis | / (Repository-Root) | / (Repository-Root) |
| Build-Befehl | `npm ci --prefix cloudflare-worker` | `npm ci --prefix cloudflare-worker` |
| Deploy-/Preview-Befehl | `./cloudflare-worker/node_modules/.bin/wrangler deploy --config cloudflare-worker/wrangler.toml --env=` | `npx wrangler preview` |

`/` ist die Cloudflare-Bezeichnung für den Repository-Root, kein Auftrag zum
Wechsel ins Dateisystem-Root des Cloud-Executors. Die Befehle sind mit dem
Repository vereinbar: Lockfile und Paket liegen in cloudflare-worker; Wrangler
löst main/migrations_dir relativ zur angegebenen Konfigurationsdatei auf.
Ein main-Push kann beide Systeme unabhängig anstoßen: Pages und Workers Builds.
Die Bestätigung schließt die bisherige Informationslücke zu diesen Feldern.
Watch-Paths sind nicht bestätigt; der Ablauf verlässt sich nicht auf sie.

Das Builds-Token für Git-Deployments ist unabhängig vom erfolgreich verwendeten
Codex-Netzwerk-Secret. Funktionierender Codex-Zugriff beweist kein funktionierendes
Builds-Token. Keine Tokens austauschen oder neue Runtime-Secrets anlegen.

### Verifizierbare Vorbereitung in der Cloud

```sh
cd /workspace/tr1stan.de
git fetch origin main codex/packet-flight-escape-v2
gh pr view 4 --json headRefOid,isDraft,mergeable,baseRefName
gh api repos/tr1stannnnnn/tr1stan.de/pages
gh api repos/tr1stannnnnn/tr1stan.de/commits/main/check-runs
python3 tools/pf2-release-metrics.py
```

In jedem neuen Cloud-Terminal für Wrangler erneut XDG_CONFIG_HOME auf
/tmp/packet-flight-release-config und WRANGLER_SEND_METRICS=false setzen; diese
Variablen sind nicht automatisch zwischen Agenten-Kommandos persistent.

Zum tatsächlichen Release Commit-SHAs, aktuelle Worker-100%-Version und D1-Schema
erneut lesen. Die obigen historischen IDs nicht blind auf einen inzwischen
veränderten Stand anwenden. Keine Force-Pushes oder Resets.

## 2. Automatik vor dem ersten main-Push beherrschen (PRODUKTIV)

Ein Merge von #4 veröffentlicht Pages und kann mit den bestätigten aktiven
Produktionsbuilds auch den Worker ausrollen. Vorher die Reihenfolge absichern:

1. Nach ausdrücklicher Veröffentlichungsfreigabe im bestätigten Worker-Dashboard
   **Disable builds auf AN** setzen. **Builds for Preview branches bleibt AUS**.
   Root, Build-/Deploy-Befehle und Token-/Secretfelder dabei unverändert lassen.
   Der bisher vorgeschlagene No-op-Befehlsumbau ist durch den jetzt bestätigten
   dedizierten Schalter nicht mehr erforderlich.
2. Den gesetzten Schalter manuell im Dashboard erneut bestätigen und festhalten,
   dass keine laufenden/ausstehenden alten Deploy-Jobs später fortgesetzt werden.
   Bestehende Jobs abwarten oder – nur im freigegebenen Umfang – abbrechen. Ein
   deaktivierter Trigger allein beendet keinen bereits laufenden Prozess.
3. Die Sperre bleibt bis einschließlich Frontend-Aktivierung und Rückkehrprüfung
   bestehen. Pages bleibt separat aktiv; Notice-/Feature-/Frontend-main-Pushes
   werden deshalb nach wie vor automatisch als Website veröffentlicht. Manuelle
   Worker-CLI-Deployments erfolgen ausschließlich in den unten genannten Phasen.
4. Ohne bestätigte tatsächliche Sperre kein erster main-Push. Das fortbestehende
   API-403 erfordert keine neue Secret-Bindung, wenn der Betreiber die Änderung
   im Dashboard ausführt und bestätigt. Es werden keine Einstellungen allein
   aufgrund einer unbekannten API-Antwort erfunden oder verändert.

Keine Ersatzsperre nur über Watch-Paths: Cloudflare umgeht diese bei leeren
Pushes sowie bei 3000+ Dateien oder 20+ Commits. Keine Produktionsbranch-Änderung,
keine Preview-Migration, kein Entfernen der Repository-Verbindung erforderlich.
Worker-Tag für spätere lesende Zuordnung: 8072e2e0903e49918118a46feb6c51af.

## 3. Datenschutzhinweise zuerst veröffentlichen (PRODUKTIV)

Alle vier Betreiberentscheidungen sind bestätigt; die Speicherwahl und der
Einwilligungstext sind implementiert und getestet. Die vorbereitete Notice steht
in datenschutz.html. Vertragliche Standardquellen und die konkrete Begrenzung
des aktuellen Wortlautabrufs stehen in
[leaderboard-privacy-draft.md](leaderboard-privacy-draft.md).

Der separate **Draft-PR #5**, Branch release/pf2-notice, Commit
`e97f6e21132c131950ae783203755a41145ea975`, liegt bereits mit ausschließlich
datenschutz.html auf Basis von main vor. Keinen Ersatz-PR erstellen. Die Fassung
nennt Empfänger/Standard-DPA/SCC, bewusstes Online-Starten und Board-Laden,
Einwilligung/Widerruf, Komponenten und konkrete Aufbewahrung. Sie beschreibt
ältere automatische Speicherfassungen und die schrittweise Umstellung ausdrücklich.
Keine API_URL-/ENABLED-Änderung oder pf-2-Spielauslieferung in diesem Notice-PR.

```sh
# Erst nach tatsächlichem Nachweis: Disable builds AN, Previews AUS, keine alten Jobs.
gh pr view 5 --json headRefOid,baseRefName,files,isDraft
gh pr ready 5
gh pr merge 5 --merge --match-head-commit e97f6e21132c131950ae783203755a41145ea975
gh api repos/tr1stannnnnn/tr1stan.de/pages/builds/latest
```

Die gelieferte https://tr1stan.de/datenschutz.html danach mit GET abrufen und auf
exakt den Notice-Commit/Inhalt prüfen; HTTP 200 allein genügt nicht. Nur nach
sichtbarer aktueller Fassung fortfahren. PR #4 anschließend mit main abgleichen,
damit er die neue Notice-Fassung nicht wieder durch alten Text ersetzt. Kein
Git-Worktree und keine Verlagerung auf den privaten Rechner.

## 4. Additive Migration mit erhaltenen Alttabellen (PRODUKTIV)

Vorher Schema, alte Zeilenzahlen und Time-Travel-Bookmark lesen/privat im
Release-Protokoll speichern. Bei jetzt unerwarteten Altdaten einen privaten
Cloud-Export mit restriktiven Dateirechten erstellen und Löschfrist festhalten;
keinen Export mit personenbezogenen Daten ins Repository schreiben. Aktuell
sind die drei Alttabellen leer. Restore/Reset ist **nicht** Teil dieses Plans.

```sh
cd /workspace/tr1stan.de/cloudflare-worker
export XDG_CONFIG_HOME=/tmp/packet-flight-release-config
export WRANGLER_SEND_METRICS=false
# Nutzt vorhandene Bindung; weder Login noch secret put.
node node_modules/wrangler/bin/wrangler.js d1 time-travel info packet-flight --env=
# Im bereits freigegebenen Ablauf, erst nach bestandenen vorherigen Gates:
node node_modules/wrangler/bin/wrangler.js d1 migrations apply packet-flight --remote --env=
node node_modules/wrangler/bin/wrangler.js d1 migrations list packet-flight --remote --env=
```

Weil kein Ledger existiert, wendet Wrangler 0001_initial.sql und
0002_escape_pf2.sql an und legt die Migrationstabelle an. Beide Dateien sind
vorher zu prüfen: nur CREATE TABLE/INDEX IF NOT EXISTS, keine Alt-UPDATEs/DROPs.
Isolierte Regressionen belegen erhaltene pf-1-Zeilen und Wiederholbarkeit.
Danach Schema/Indizes und alte Zeilenzahlen erneut per SELECT vergleichen.
Nicht nur „configured=true“ prüfen; die pf-2-Spalten müssen vorhanden sein.
Bei Abweichung stoppen; keine Datenbank zurücksetzen oder Tabellen löschen.

## 5. PR #4 mergen und pf-2 zunächst deaktiviert ausrollen (PRODUKTIV)

Erst nach Notice-Nachweis, erfolgreicher Migration und bestätigtem Disable-builds-Schalter #4
mergen. Pages liefert nun pf-2 mit **leerer API_URL**. Noch kein Browser geht
wegen des Spiels an Cloudflare. Worker-Konfiguration bleibt ENABLED=false.
Pages- und Worker-Artefakte gegen den freigegebenen Commit prüfen.

```sh
cd /workspace/tr1stan.de/cloudflare-worker
# Default-Umgebung erzwingen; niemals --env local auf Produktion anwenden.
node node_modules/wrangler/bin/wrangler.js deploy --env= --keep-vars \
  --var ENABLED:false --var ENVIRONMENT:production
```

Beide Deploy-Varianten (false/true) wurden vorab nur als lokale --dry-run-Bundles
geprüft. --keep-vars erhält zusätzliche Dashboard-Variablen; explizite ENABLED-
Flags bestimmen den gewünschten Zustand. Keine --secrets-file/secret-put-
Operation. Neue deaktivierte Version-ID als **pf2-disabled** privat notieren.

Technische Gate-Prüfungen:

- GET /api/health → pf-2, enabled=false, configured=true, schemaReady=true,
  retentionOverdue=false. Ein überfälliger Status ist kein Löschauftrag durch Health.
- OPTIONS /api/score mit Origin https://tr1stan.de → 204 und passendes CORS;
  fremde Origin → 403, keine freigegebene fremde Origin.
- Deaktivierte Run-/Board-Endpunkte → 503; dabei keine neuen Run-/Scorezeilen.
- Lokales Frontend auf veröffentlichtem Pages-Stand: Normal/Daily, Offline,
  freiwillige Eintragung deaktiviert, keine API-Anfragen ohne Online-Aktion.
- Alle drei bisherigen Secret-Bindungen vorhanden, Werte nicht auslesen.
- Ausgerollte Observability explizit deaktiviert; GraphQL-Aggregate weiter lesbar.
  Keine fehlende API-Angabe als Nachweis deaktivierter Logs auslegen.

Fehlt ein Gate, bleibt deaktiviert. Noch keine Aktivierung „zum Ausprobieren“.

## 6. Kontrollierte Aktivierung und Messfenster (PRODUKTIV)

Die Aktivierung muss im gewünschten Git-Zustand nachvollziehbar sein: in einem
kleinen separaten Commit nur das **oberste** ENABLED in wrangler.toml auf true
setzen, lokalen Dry-Run prüfen, diesen Aktivierungs-Commit nach bestandenen vorherigen Gates mergen.
Automatische Worker-Builds sind weiter deaktiviert. Damit deaktiviert ein späteres normales CI-Deployment den
Worker nicht versehentlich wieder anhand einer false-Konfiguration.

```sh
cd /workspace/tr1stan.de/cloudflare-worker
node node_modules/wrangler/bin/wrangler.js deploy --env= --keep-vars \
  --var ENABLED:true --var ENVIRONMENT:production
```

API_URL bleibt zunächst leer. Health muss jetzt enabled=true und
retentionOverdue=false liefern. Danach den Secret-freien Monitor manuell starten:
`gh workflow run pf2-retention.yml --ref main`; anschließend den tatsächlichen
Run unter GitHub Actions bis zum Ergebnis prüfen. Fehlender/fehlgeschlagener Run
ist ein konkreter Monitorblocker vor Frontend-Verbindung. Er liest nur Health;
der tägliche Zeitplan 04:47 UTC wird erst auf main wirksam und kann verzögert starten.
Repository-Einstellungs-GET war HTTP 403, daher tatsächlichen Lauf nachweisen. Als
Testprofil ausschließlich die reale Online-Origin tr1stan.de verwenden; keine
Loopback-Origin in Produktion freischalten. Ein isolierter Cloud-Browser darf
für den kontrollierten Test die einzelne config.mjs-Antwort für diese Origin
auf den bestehenden HTTPS-Worker umleiten. Unveränderte Spielmodule, echte
Eingaben, keine manipulierten Scores/Physik, keine neue öffentliche Testdomain.

### Begrenzter freiwilliger Score-/Readback-Test

Freigabeumfang: höchstens **zwei echte Runs** (ein Normal, ein Daily), Alias
**Release_Check**, höchstens zwei ausdrücklich per Formular bestätigte Scores,
ein identischer manueller Retry nur bei tatsächlich verlorener Antwort. Kein
simulierter Score, kein automatischer Retry, keine Rate-/Lastprüfung.
Höchstens 30 Worker-API-Operationen insgesamt, inklusive Health/Preflight/Board.
Alleine ein erfolgreiches Health reicht ausdrücklich nicht.

Vor dem ersten Run UTC-T0 und Metrics-Baseline speichern. Nach Eintragung Score,
Gates/Fragmente/Bonus, Modus, UTC-Tag, Rang, eigene Position und Achievement-Zeit
mit dem echten Ergebnis vergleichen. Seite vollständig reloaden, Rangliste
bewusst erneut laden und denselben Bestwert nachweisen. Boardwechsel normal /
Daily und eigene Position verifizieren. Receipt/Browserkennung nur privat im
Cloud-Testprofil halten, nicht im PR/Chat veröffentlichen. Vor einem zweiten
Run Quoten-/Fehler-Gates kontrollieren.

```sh
cd /workspace/tr1stan.de
python3 tools/pf2-release-metrics.py > /tmp/pf2-metrics-baseline.json
date -u +%Y-%m-%dT%H:%M:%SZ > /tmp/pf2-test-start-utc
# Den tatsächlichen T0 des Fensters als ISO-Zeit mit Zeitzone einsetzen:
python3 tools/pf2-release-metrics.py --gate --min-requests 5 --since "$(cat /tmp/pf2-test-start-utc)" > /tmp/pf2-metrics-after.json
```

Der Helfer führt nur GraphQL-Leseabfragen aus. CPU-Einheit laut live abgefragtem
Schema: **Mikrosekunden**; P99 durch 1000 ergibt Millisekunden. Account-Quoten
werden für den aktuellen UTC-Tag accountweit gemessen, nicht nur für diesen
Worker. Das Projektfenster ist separat gefiltert. D1-Accountwerte berücksichtigen
auch andere Datenbanken. Keine Request-/Header-/Body-Logs zur Messung aktivieren.

Vorher im bestehenden Account den tatsächlichen Free-Plan bestätigen, weil
Subscriptions/Billing mit dem vorhandenen Token 403 liefern. Kein Upgrade,
keine kostenpflichtigen Add-ons. Offizielle Free-Grenzen: Worker 100000
Requests/Tag und 10 ms CPU/HTTP-Aufruf, D1 5 Mio gelesene/100000 geschriebene
Zeilen pro Tag. Einzelne Statements können durch Indexpflege mehr als eine
Zeile schreiben; API-Operationszahlen sind kein Ersatz für D1-Metriken.

Abbruch: ein CPU-/Ressourcenlimit-Fehler, unerklärtes 5xx, P99 >=8000 µs,
verbrauchte Tagesquote >=50% einer obigen Free-Grenze vor Testbeginn, unerwartete
Projekt-Schreiblast oder neue personenbezogene Logs. Erst analytische Verzögerung
berücksichtigen: nach 1/3/5 Minuten in getrennten Agenten-Schritten lesen, maximal
10 Minuten; keine fehlenden/null Stichproben als „0 CPU“ ausgeben. Wenn keine
brauchbaren Messungen erscheinen, nicht das Frontend verbinden. Niedrige
P99-Werte bei zwei kleinen Runs garantieren keine Worst-Case-CPU bei großem Board.
Kein produktives Board künstlich befüllen.

## 7. Frontend verbinden und CI geordnet zurückführen (PRODUKTIV)

Nur nach erfolgreichem Readback und CPU-/Quota-Gate API_URL auf
`https://packet-flight-leaderboard.polished-frost-d1f8.workers.dev` setzen und den
Shell-Cache erneut versionieren. Separater geprüfter Frontend-Commit/PR; Merge
veröffentlicht Pages automatisch. Nach frischem Laden tatsächlich ausgelieferte
URL/Cache-Version, weiterhin deaktivierte Online-Auswahl als Standard, bewusstes
Board-Laden und lokale Offline-Alternative überprüfen. Keine neuen Scores nötig.

Anschließend die bestätigte Produktionseinstellung kontrolliert wiederherstellen:
Branch main, Root /, Build `npm ci --prefix cloudflare-worker`. Deploy-Befehl wie
bestätigt, ergänzt um den bereits lokal geprüften Erhalt zusätzlicher Variablen:

```sh
./cloudflare-worker/node_modules/.bin/wrangler deploy --config cloudflare-worker/wrangler.toml --env= --keep-vars
```

Das ist der einzige geplante Befehlsunterschied zum abgelesenen Dashboard-Stand.
Keine Runtime- oder Builds-Secrets ändern. Aktiver Git-Stand muss ENABLED=true
und den bereits freigegebenen Konfigurationsstand enthalten, sonst könnte der
nächste Auto-Deploy wieder deaktivieren. Erst danach **Disable builds wieder AUS**;
Preview-Branches bleiben AUS und ihr bisheriger Preview-Befehl bleibt unverändert.
Ein möglicher sofortiger Build beim Wiedereinschalten ist im Freigabeumfang
enthalten, muss aber den freigegebenen aktuellen main-SHA verwenden. Alte Jobs
nicht nachträglich freigeben. Kein künstlicher Push ist zur Reaktivierung nötig.

Ein später optionaler Watch-Path-Filter ist nicht Teil dieser notwendigen
Rückführung. Funktioniert das bestehende Builds-Token nicht, Builds deaktiviert
lassen und den konkreten Fehler melden; kein neues Token/Secret anlegen.

## 8. Abbruch und Rückkehr

| Zeitpunkt/Fehler | Rückkehr ohne Datenreset |
| --- | --- |
| Build-/Notice-/Zugriffsgate ungeklärt | Kein main-Push/keine Migration; aktuelles pf-1 bleibt deaktiviert. |
| Notice live, danach Stopp | Notice stehen lassen; sie beschreibt bedingte Online-Funktionen. API_URL leer, Worker deaktiviert. |
| Migration fehlerhaft/teilweise | Worker deaktiviert lassen. Erfolgreiche additive Tabellen erhalten; Ledger/Schema lesen, Ursache beheben, nur idempotent erneut anwenden. Kein DROP, Restore, Reset. |
| pf-2 deaktivierter Deploy/Gates fehlerhaft | Zur zuvor gespeicherten deaktivierten Worker-Version zurückrollen; Pages lokal/offline lassen. |
| CPU/Quota/Score-/CORS-Fehler nach Aktivierung | Sofort zur gemerkten pf2-disabled-Version zurückrollen. Noch kein Frontend-Release oder, wenn bereits verbunden, API_URL leeren und Cache erneut versionieren. |
| Bereits verbundene Frontend-Version in offenen Tabs | Worker zuerst serverseitig deaktivieren; bloßer Pages-Revert stoppt alte Tabs nicht. Alte bereits verarbeitete Einträge nicht rückwirkend als ungesendet bezeichnen. |
| Automatische Builds noch deaktiviert | Disable builds AN belassen, bis Git-Zustand und Worker-Zustand konsistent sind. Keine alte Job-Warteschlange freigeben. |

Freigegebener Code-Rollback (ID aus aktuellem Release-
Protokoll einsetzen; nicht auf eine inzwischen veraltete historische ID vertrauen):

```sh
cd /workspace/tr1stan.de/cloudflare-worker
node node_modules/wrangler/bin/wrangler.js rollback "${PF2_DISABLED_VERSION_ID:?Set the recorded disabled version ID first}" \
  --env= --message "PF2 release aborted; API disabled" --yes
```

Rollback setzt keine D1-Daten zurück und löscht keine pf-2-Ergebnisse. Nachher
Health enabled=false prüfen. Git-Aktivierungscommit separat auf false
zurücknehmen, bevor automatische Builds wieder aktiviert werden dürfen. Nicht den
alten Pages-Gesamtstand blind zurückrollen: aktuelle Datenschutzhinweise erhalten.
Keine bestehende Secret-Version bewusst rotieren oder ersetzen.

Die zwei freiwilligen Release_Check-Einträge bleiben reguläre öffentliche
Einträge unter der erklärten Aufbewahrung, sofern keine spätere konkrete
Löschanweisung erteilt wird. Ein automatisches Löschen gehört nicht stillschweigend
zur Testfreigabe. Produktive Time-Travel-Restores, Massenlöschung und Paid-Upgrades
sind ausdrücklich **nicht** von der erteilten Freigabe umfasst.

## 9. Umfang der erteilten Freigabe

Die ausdrückliche Freigabe deckt diese konkreten Vorgänge ab: Disable builds vorübergehend AN,
Preview-Branches unverändert AUS, später kontrolliert Disable builds AUS und
Deploy-Befehl um --keep-vars ergänzen (einschließlich eines möglichen sofortigen
Auto-Builds des geprüften main-SHA); separater Notice-Merge/Pages-Build;
additive 0001/0002-Migration samt Ledger in der bestehenden D1; Merge von #4;
deaktiviertes pf-2-Deployment und nach Gates Aktivierungscommit/-Deployment;
maximal zwei freiwillige Release_Check-Einträge mit Readback und begrenztem
Messfenster; separater API_URL-/Cache-Merge/Pages-Build; bei Fehlern nur die oben
beschriebenen Code-/Konfigurations-Rücknahmen. Keine Domain/DNS/Mail-Änderung,
kein privater Rechner, kein DB-Reset, keine Secret-Änderung, keine Kostenpflicht.

Physische iOS-/Android-Geräte und Safari bleiben **ungeprüft**. Headless Chromium,
Touch-Emulation und Zoomtests ersetzen diese Plattformen nicht. Das ist eine
benannte Veröffentlichungsgrenze, kein fingierter Testnachweis.

## Offizielle Quellen

- [Workers Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Workers Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Build watch paths und Ausnahmen](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/)
- [D1 Data location](https://developers.cloudflare.com/d1/configuration/data-location/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [D1 Metrics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)

Gelesen aus dem offiziellen Repository cloudflare/cloudflare-docs (production)
und cloudflare/api-schemas; keine Suchmaschinen-Zusammenfassung als Beleg.
Dokumentationsstand: 8c30c8b4876fd857bd049ea3525fa463a5015a02.
