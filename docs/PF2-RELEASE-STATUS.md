> **Aktueller Release 27.10.2026:** Builds-Sperre und leere Job-Warteschlange
> sind vom Betreiber bestätigt. Notice live, additive Migration erfolgreich;
> tatsächlichen Fortschritt ausschließlich in [PF2-RELEASE-2026-10-27.md](PF2-RELEASE-2026-10-27.md)
> lesen. Ältere Kennungen/Blocker unten sind historisch und vor Nutzung neu zu prüfen.

# Freigegebener Release: tatsächlicher Stand am 26.10.2026

Der Betreiber hat Einwilligung/Widerruf, Fristen, den normalen Self-Service-
Vertragsstand und bewusste lokale Speicherwahl bestätigt. Der kontrollierte
Produktionsablauf samt begrenzten freiwilligen Tests und dokumentierten
Rücknahmen ist freigegeben. Keine weitere pauschale Freigabe einholen.

## Gesicherte Branches und PRs

- Feature: `codex/packet-flight-escape-v2`, Implementierungscommit
  `5e847594e045e5c67ff68bc5c22430b7bda72f87`, gepusht;
  [Draft-PR #4](https://github.com/tr1stannnnnn/tr1stan.de/pull/4) aktualisiert.
- Notice separat auf bisherigem main: `release/pf2-notice`,
  `e97f6e21132c131950ae783203755a41145ea975`, gepusht;
  [Draft-PR #5](https://github.com/tr1stannnnnn/tr1stan.de/pull/5).
  Nachweislich nur datenschutz.html geändert. Noch kein Merge.
- Zusätzliche Navigationsprüfung bestätigt: Der Ranglistenabschnitt ist nach
  Klick/Tap bei beiden mobilen Breiten tatsächlich im sichtbaren Viewport.
- Letzter Pages-Build weiterhin main/34e47d6, status=built, kein Fehler.

## Umgesetzter und geprüfter Arbeitsstand

- Finale Notice vorbereitet in datenschutz.html, einschließlich getrennter
  Rechtsgrundlagen, Widerruf, Fristen/Cron-Verzögerungen, Cloudflare-Standard-DPA
  und SCC-Verweisen; keine ausschließliche EU-Verarbeitung behauptet.
- Speicherwahl standardmäßig aus. Vor Zustimmung keine Spielstand-Lese-/
  Schreibzugriffe und kein neuer Service Worker; nur Präferenz wird gelesen.
  Rekorde/RAM-Fortschritt werden bei Zustimmung zusammengeführt, vorhandene
  Rekorde bei Abwahl erhalten. Keine Verdopplung kumulativer Statistik bei
  erneuter Auswahl. Abwahl stoppt weitere dauerhafte Spielstand-Schreibzugriffe.
- Cachefreie Aktualisierung alter automatischer Worker, Abmeldung/Cacheentfernung
  ohne Zustimmung, expliziter Offline-Cache nach Zustimmung. Reale alte Worker,
  mehrere Tabs, Online-/Offline-Abwahl und Offline-Reload geprüft. Vollständig
  offline verbliebene alte Spielfassungen benötigen eine Online-Aktualisierung.
- Formular nennt ausdrückliche widerrufliche Einwilligung und Kontakt vor
  ÖFFENTLICH EINTRAGEN. Run-Kennung wird beim Start festgehalten, sodass eine
  Speicheränderung in einem anderen Tab die Zuordnung beim Absenden nicht ändert.
- Terminal erhält play, play --daily, leaderboard in denselben Boxen; bestehende
  Befehle bleiben. Ausführung direkt über run(), kein Fokuswechsel zum Textfeld.
  320/390 Pixel, Touch, Tab/Enter/Space und alle drei Ziele geprüft. Keine Buttons
  außerhalb des Terminals hinzugefügt. Screenshots unter packet-flight-pf2/release/.
- Lesender Retention-Status in Health; täglicher Secret-freier Actions-Check
  vorbereitet. Produktiver erster Monitorlauf ist vor Frontend-Verbindung offen.

## Testergebnisse dieses Arbeitsstands

| Prüfung | Ergebnis |
| --- | --- |
| Node Spiel-/Regel-/Speichertests | 24 bestanden |
| Backend: echtes workerd + isolierte D1 | 15 bestanden |
| Statische Websiteprüfung | 2 bestanden |
| Browserregressionen | 14 bestanden |
| Visuelle Browser-/Spieltests | 8 bestanden |
| Escape-Spieltests mit Tastatur/Touch | 2 bestanden |
| CPU-/Quota-Gatelogik | 7 bestanden |
| Neue Datenschutz-/Worker-/Terminalprüfungen | 5 bestanden |
| Gesamt | 77 bestanden |
| HTML-Validierung aller fünf Seiten | bestanden |
| git diff --check | bestanden |

Backendtestprozess ohne CLOUDFLARE_API_TOKEN und GH_TOKEN, nur emulierte D1.
Keine gefälschten Scores oder Produktionstests als bestanden ausweisen.
Physische iOS-/Android-Geräte und Safari bleiben **ungeprüft**.

## Tatsächlicher produktiver Stand und konkrete Blocker

Erneute authentifizierte Leseprüfung am 26.10.2026, 14:48 UTC:

- Tokenverifikation HTTP 200; Worker-/D1-Metadaten HTTP 200.
- Worker noch pf-1, enabled=false, configured=true.
- Aktives Deployment `2141879b-d313-4d03-a1c7-17b64954d733`, 100%-Version
  `c9ceaaf3-c911-4b41-bc6b-eb41dc493c33`.
- D1 hat weiterhin nur _cf_KV, runs, scores, rate_buckets. Alle drei
  Anwendungstabellen leer. SELECT-Metadaten: rows_written=0, changed_db=false.
- Vorhandene SIGNING_KEY/PSEUDONYM_KEY/RATE_KEY-Bindungen unverändert vorhanden;
  keine Werte ausgegeben, keine Secrets geändert.
- main unverändert `34e47d6e4a4e925c4ea688ac007035c38e5df53d`.

**Vor erstem main-Push blockiert:** Die Builds-API liefert erneut HTTP 403,
`Authentication error` (Code 10000) für Trigger und `Forbidden` (Code 12004)
für Buildliste. Keine Dashboard-Browserverbindung steht zur Verfügung.
Deshalb konnte Disable builds nicht auf AN gesetzt/verifiziert und die
Job-Warteschlange nicht geprüft werden. Asynchron konkret angefordert:
Betreiber setzt bestätigten Dashboard-Schalter AN, Previews bleiben AUS,
laufende/ausstehende Jobs bestätigen. Eine allgemeine Freigabe ersetzt diese
technische Sperre nicht. Kein Ersatz durch Änderung von Branch/Watch-Paths.

**Vor Aktivierung noch zu belegen:** Tatsächlicher Free-Tarif für Workers/D1;
Self-Service ist kein Tarifnachweis. Billing/Subscriptions sind HTTP 403.
Tarifnamen wurden konkret beim Betreiber angefragt; keine Upgrades vornehmen.
Der erste tatsächliche Retention-Actions-Lauf muss nach Aktivierung und vor
Frontend-Verbindung erfolgreich sein. Repository-Actionseinstellungen sind
HTTP 403 (`Resource not accessible by integration`); das beweist weder
Aktivierung noch Deaktivierung. Keine Einstellungen dafür ändern.

**Quellenbeschränkung:** www.cloudflare.com Terms/DPA/Privacy scheitert am
HTTPS-Proxy mit `Tunnel connection failed: 403 Forbidden`. Offizielle Links,
Standardmodell und SCC-Grundlage sind nachvollziehbar dokumentiert; der
vollständige aktuelle Vertragswortlaut ist in dieser Sitzung nicht nachgelesen.
Keine Sonderklauseln/Annahmezeitpunkte erfinden und keine Netzwerkregel ändern.

## Noch nicht ausgeführte Veröffentlichungsschritte

Kein main-Push/Merge, keine produktive Migration, kein Worker-Deploy,
keine Aktivierung, kein Release_Check-Eintrag, keine Frontend-API-Verbindung.
Es gibt deshalb keine neuen Deployment-Nachweise oder produktiven pf-2-CPU-Werte.
Lesende aktuelle pf-1-Baseline: 5 Requests, 0 Fehler, P50 753 µs / P99 3151 µs;
D1-Tageswerte 23 gelesene / 0 geschriebene Zeilen. Kein pf-2-Leistungsnachweis.

Nach konkreter Auflösung der Sperre mit [PF2-RELEASE.md](PF2-RELEASE.md)
weiterarbeiten: Notice separat zuerst; additive 0001/0002; #4; deaktivierter
Worker; technische Gates; Aktivierung; tatsächlicher Monitorlauf; maximal zwei
freiwillige Release_Check-Einträge mit Readback/CPU-/Quotenprüfung; API_URL/Cache;
bestätigten Build-Aufbau mit --keep-vars konsistent zurückführen. Keine Datenbank-
Resets, Secret-Wechsel, kostenpflichtigen Dienste, DNS-/Mailänderungen oder
Arbeit auf einem privaten Rechner.

Live-URLs des bisher unveränderten Systems:
https://tr1stan.de/game.html,
https://tr1stan.de/datenschutz.html,
https://packet-flight-leaderboard.polished-frost-d1f8.workers.dev/api/health.
