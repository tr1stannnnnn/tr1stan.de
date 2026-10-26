# PACKET//FLIGHT pf-2: Prüfung und Freigabegrenzen

26.10.2026. Branch `codex/packet-flight-escape-v2`, gesicherte Basis
`604bd7f714b5a9dcd635434a05aad7ef88d8b38f`. Entwicklungsfortsetzung gemäß neuem
Auftrag, noch kein Release. Bestehender Fortschritt wurde erhalten.

## Überarbeiteter Stand

- Backend-Tests unterscheiden Score >19980 / Typfehler (400) von widersprüchlichen
  Aggregaten innerhalb der Grenze (422). 19980 mit 1000 Gates, 1000 Fragmenten,
  9980 Bonus wird von Formel/SQL akzeptiert. Der getrennte aktive Zeitrahmen
  bleibt unverändert: so viele Gates überschreiten dessen Mindestzeit und sind
  kein zulässiger 25-Minuten-API-Run. Keine Validierung wurde abgeschwächt.
- Zusätzliche Backend-Regressionen: echte D1-Integer-/Formelgrenzen, API-Komponenten,
  Rang nach Gates, unveränderte Retries, additive pf-1-Datenerhaltung einschließlich
  wiederholter Migration, fehlendes pf-2-Schema und 365-Tage-Normal-Aufbewahrung.
- Spielbriefing und sichtbare/Textreader-Gefahrenhinweise erklären Zielverfolgung,
  festen Lock, Ausweichen und Laserzonen. Eigene Paket-, Drohnen-, Firewall- und
  Laserformen bewahren die vorhandene Synthwave-Landschaft.
- Canvas-Größenberechnung setzt identische Abmessungen nicht erneut: kein unnötiges
  Löschen eines pausierten Bildes bei Höhen-/Browserleistenänderungen.
- Kein automatischer Board-Abruf beim Seitenaufruf einer aktivierten API. Lokales
  Spielen bleibt ohne Cloudflare-Anfragen, bis Online-START oder Board-Abruf
  bewusst ausgelöst wird. Formular/Hinweise nennen alle öffentlichen Komponenten.
- Service-Worker-Hülle shell-2 und tatsächliche style/script-v30-Dateien; Regression
  prüft alten Cache-Abwurf sowie Laden/Spielen bei wirklicher Netzabschaltung.
- README, Backendvertrag, lokaler Speicherhinweis und Datenschutzentwurf sind an
  pf-2 angepasst. Persönliche Inhalte, Impressum, DNS und Mail bleiben erhalten.

## Cloud-Prüfungen

Alle Läufe ausschließlich im Cloud-Executor, Browserprofile und Test-D1 isoliert.
Produktive Token wurden vor lokalen Backend-Prozessen entfernt.

| Prüfung | Ergebnis |
| --- | --- |
| Spiel-/Escape-Node-Tests | 22 bestanden |
| Website-/Asset-/Linkprüfung | 2 bestanden |
| Browser inkl. freiwilliger Eintragung mit API-Mocks, Offline, Storage/Audio, neuer Online-Opt-in-Grenze | 13 bestanden |
| Visuelle Browserregressionen inkl. Cache, Reduced Motion, Pause/Resize | 8 bestanden |
| Escape-Tastatur-/Touch-Runs | 2 bestanden, jeweils 30 Gates |
| Worker-Build (nur dry-run), workerd-/D1-Tests | 14 bestanden |
| HTML-Validierung, git diff --check | bestanden |

1.000 deterministische Seed-Stichproben mit einem nur Eingaben erzeugenden
Controller erreichen je 80 Gates einschließlich maximaler Schwierigkeit und
optionaler Fragmente. 100 weitere sichere-Routen-Proben und Framerate-Replays
60/120/144/240 Hz bleiben erhalten. Das belegt Stichproben-Erreichbarkeit, keine
Fairness aller Runs, keine subjektive Human-Studie und keine Cheating-Sicherheit.

Der zusätzliche Browser-Treiber erzeugt echte Tastatur-/Touch-Eingaben. Er liest
Spielzustand über Test-Beobachter, überschreibt weder Physik, Score, Seed noch
Kollisionen. Desktop pausiert in allen acht Trace-/Laserphasen jeweils drei
virtuelle Sekunden und vergleicht vollständige Flight-/Effects-Snapshots. Touch
läuft bei 390×844 mit Reduced Motion; weitere bestehende Layouttests umfassen
320/390/430/768/1440, Landschaft und 200%-Reflow/Browser-Skalierung. Physische
Geräte und Safari wurden nicht geprüft.

## Bilder und echte Echtzeitaufnahme

[Vorher Desktop](packet-flight-pf2/before-desktop.png) ·
[Nachher Desktop](packet-flight-pf2/after-desktop.png) ·
[Vorher mobil](packet-flight-pf2/before-mobile.png) ·
[Nachher mobil](packet-flight-pf2/after-mobile.png)

Vorher: aus main/34e47d6 exportierter Baum auf einem zweiten internen Server,
kein Worktree und keine Änderung des Arbeitsbranchs. Nachher: dieser Branch.
Phasenbilder entstehen aus einem Eingabe-Run unter kontrollierter Browseruhr:
[Bewegliche Firewall](packet-flight-pf2/moving.png),
[Kompression](packet-flight-pf2/compress.png),
[Combo](packet-flight-pf2/combo.png),
[Trace-Lock](packet-flight-pf2/trace-locked.png),
[Laser aktiv](packet-flight-pf2/laser-active.png).

[54,48 Sekunden Echtzeitvideo](packet-flight-pf2/escape-run.mp4) zeigt einen
ungekürzten realen Daily-Run ohne virtuelle Uhr: 26 Gates, 294 Punkte,
10 Fragmente, 34 Bonuspunkte, Combo maximal ×4, bewegliche/komprimierende Gates,
alle acht Angriffsphasen; anschließend Tod ohne weitere Eingaben und Ergebnis.
[Metadaten](packet-flight-pf2/video-run.json) und
[virtueller Screenshot-Run](packet-flight-pf2/capture-run.json).
Der Echtzeit-Treiber berücksichtigt 100 ms Eingabelatenz des Browserprotokolls,
ändert aber keine Spielzustände. Eine erste Aufnahme scheiterte vorzeitig an
Gate 12; sie wurde nicht als abgeschlossener Nachweis verwendet.
Reproduktion: tools/capture-pf2.py, Details in tests/README.md.

## Produktionszustand: ausschließlich gelesen

Cloudflare-Token aktiv; authentifizierte Account-, Worker- und D1-Lesezugriffe
HTTP 200. Keine Secret-Werte ausgegeben. Bestehende Worker-Key-Bindungen nur
anhand Name/Typ festgestellt und unverändert erhalten.

D1 `bc462466-1ed9-41d9-ab75-dc0197d50502`: Tabellen `runs`, `scores`,
`rate_buckets`; pf-1-Indizes vorhanden. `runs_v2`, `scores_v2`, `d1_migrations`
fehlen. Ausschließlich SELECT auf sqlite_master; Cloudflare bestätigt
`rows_written=0`, `changed_db=false`. Keine personenbezogenen Zeilen abgefragt.
Eine spätere Migration darf nicht aus einer nicht vorhandenen Ledger-Tabelle
auf bereits angewandte Dateinamen schließen.

Öffentliches Health: pf-1, enabled=false, configured=true, kein schemaReady-Feld.
Logpush=false, observability=null; vollständige Plattformlogs/Backups und
Datenresidenz sind damit nicht belegt. Keine pf-2-Produktions-CPU-Messung möglich,
solange pf-2 nicht produktiv ausgerollt wird. Kein solcher Rollout ist hier erlaubt.

## Verbleibende Veröffentlichungsschritte

1. Konkrete Anbieter-/Vertrags-/Datenort-/Log-/Backup-Angaben und Rechtsgrundlagen
   im [Datenschutzentwurf](leaderboard-privacy-draft.md) vom Betreiber prüfen;
   pf-1-Altaufbewahrung und sichere Auskunfts-/Löschwege festlegen. Hinweise zuerst
   veröffentlichen, während API_URL leer und Worker deaktiviert bleiben.
2. Nach separater Freigabe produktives Schema erneut lesen und additive Migration
   kontrolliert auf bestehender D1 anwenden; Altbestände und Keys erhalten.
3. pf-2 zunächst deaktiviert deployen; configured/schemaReady und CORS/Fallback,
   Free-CPU/DB-Quoten und Cron-/Löschüberwachung nachweisen. Keine kostenpflichtige
   Erweiterung, kein cpu_ms-Block als Umgehung und keine Produktionslasttests.
4. Nach gesonderter Aktivierungsfreigabe Worker aktivieren, dann API_URL und Cache
   versionieren und Pages veröffentlichen. Ein echtes freiwilliges Ergebnis samt
   Reload-Readback, Modi, Rang/eigener Position und Operator-Löschung prüfen.
5. Physische Geräte/Safari und subjektive Spieltests ergänzen. Erst danach die
   tatsächlich geprüften Plattformen und Grenzen im Releasebericht nennen.

Kein Merge, kein produktiver SQL-Schreibzugriff, keine produktive Migration,
kein Deployment oder Scoreeintrag, keine Umgebungseinstellung geändert.
