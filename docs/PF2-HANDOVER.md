> **Aktueller Release 27.10.2026:** Builds-Sperre und leere Job-Warteschlange
> sind vom Betreiber bestätigt. Notice und Spiel live, additive Migration erfolgreich, Worker pf-2 deaktiviert;
> tatsächlichen Fortschritt ausschließlich in [PF2-RELEASE-2026-10-27.md](PF2-RELEASE-2026-10-27.md)
> lesen. Ältere Kennungen/Blocker unten sind historisch und vor Nutzung neu zu prüfen.

> **Fortsetzung 26.10.2026:** Betreiberentscheidungen und kontrollierte Veröffentlichung
> sind ausdrücklich freigegeben. Speicherwahl, Einwilligung, Löschüberwachung und
> Terminal-Schnellbefehle wurden umgesetzt. Tatsächlicher Release-/Test-/Blockerstand:
> [PF2-RELEASE-STATUS.md](PF2-RELEASE-STATUS.md). Kein main-Push vor bestätigter
> tatsächlicher Builds-Sperre; keine weitere pauschale Zwischenfreigabe einholen.

# Aktuelle Fortsetzung — 26.10.2026

Der Nutzer hat die Entwicklungsarbeit auf diesem Branch wieder freigegeben.
Die frühere Pause im unten unverändert erhaltenen Zwischenstandsbericht ist
historisch. Weiterhin gesperrt: Merge, produktive Migrationen, Deployments und
Umgebungseinstellungen. Isolierte Testdatenbank-Migrationen sind erlaubt.

Konkreter Veröffentlichungs-/Rückkehrplan: [PF2-RELEASE.md](PF2-RELEASE.md).

Aktueller Review-/Test-/Zugriffsstand, Aufnahmen und verbleibende Freigabeschritte:
[PF2-REVIEW.md](PF2-REVIEW.md). Backendvertrag und Betrieb:
[Worker-README](../cloudflare-worker/README.md). Die Cloudflare-Bindung funktioniert;
der produktive D1-Stand wurde ausschließlich lesend als pf-1 bestätigt.

---

# PACKET//FLIGHT pf-2 — unfertiger Zwischenstand

Stand: 26.10.2026. **Nicht freigabefertig. Kein Merge, keine Veröffentlichung.**
Auf ausdrücklichen Nutzerwunsch wird die Arbeit hier für eine neue Cloud-Aufgabe
gesichert. Die frühere Veröffentlichungsfreigabe gilt nicht für diesen Zwischenstand.

Branch: `codex/packet-flight-escape-v2`.
Ausgangspunkt: `main` / `34e47d6e4a4e925c4ea688ac007035c38e5df53d`.
Nur in der entfernten Codex-Cloud arbeiten; vorhandenen Checkout verwenden.

## Ursprünglicher Auftrag — Kurzfassung

PACKET//FLIGHT als Flucht mit gestohlenem Datenpaket weiterentwickeln und danach
die öffentliche Rangliste vollständig einrichten und nachweisen:

- Eine Flap-Aktion beibehalten; bewegliche/zeitweise engere Firewalls,
  TRACE//UNIT mit festgeschriebenem Schussziel und seltene Laser mit klaren
  Warnphasen, Reaktionszeiten und erreichbarer Ausweichroute ergänzen.
- Optionale Fragmente, Combo 1–5 und Scoring 10 pro Gate plus 2 × Combo pro
  Fragment; Schwierigkeit, Rang und neue Skins nach Gates steuern.
- Synthwave-Landschaft erhalten; eigene erkennbare Gegner/Gefahren, kontrollierte
  Alarmphasen und Sound; Reduced Motion und begrenzte Effektspeicher.
- Neue Vergleichsversion, deterministischer Daily, feste Simulation, vollständige
  Pause und Erhalt alter Rekorde, Kennung, Einstellungen und kosmetischer Skins.
- Worker und D1 additiv anpassen: serverseitige Scoreberechnung, plausible
  Dauer-/Bonusgrenzen, signierte Tokens, atomare Bestwerte, identische manuelle
  Retries, Aliasprüfung, deterministische Top 20 und eigene Position erhalten.
- Datenschutz anhand tatsächlicher Verarbeitung ergänzen. Erst Hinweise
  veröffentlichen, dann geprüfte Migration/Worker und zuletzt Frontend-API
  aktivieren. Eine echte freiwillige Testeintragung speichern und wieder abrufen;
  Health allein reicht nicht. Bestehende Worker-Secrets unverändert erhalten.
- Cloud-Tests, echte Runs, mobile/Tablet/Desktop-/Zoom-Prüfung, Vorher-/Nachher-
  Bilder und eine Aufnahme aller neuen Mechaniken liefern. CPU/Fehler im
  Free-Tarif prüfen, soweit zugänglich; keine kostenpflichtigen Dienste.
- GitHub Pages, Vanilla-Frontend ohne Build/Engine, Impressum, persönliche Texte,
  DNS und Mail erhalten. Spielzugang auf der Homepage nur über Terminalbefehle.

**Aktuelle Anweisung:** Nur Zwischenstand und Übergabe sichern, Umgebung lesend
prüfen; keine weiteren Umgebungseinstellungen, Veröffentlichungsversuche, Merges
oder Deployments. Die neue Aufgabe muss diese Sperre beachten.

## Bereits umgesetzt, noch nicht vollständig abgenommen

- Regeln `pf-2`, Generator `escape-1`, feste 120-Hz-Simulation und getrennte
  Zufallszustände für Welt, Gegner und kosmetische Effekte.
- Bewegliche/komprimierende Gates; TRACE//UNIT mit Warnung, Zielerfassung,
  festgeschriebener Höhe und Projektil; Laser mit Warnung, Aufladung, aktiver
  Phase und Abklingen. Sicherheitskorridore unterdrücken bewegliche Gates und
  weitere Angriffe. Erste Drohne bei Gate 12, erster Laser bei Gate 20.
- 10 Punkte pro Gate; höchstens ein optionales Fragment hinter einem Gate;
  Fragmentbonus 2 × Combo, maximal ×5, Reset beim verpassten angebotenen Fragment.
  Ergebnis trennt Gates, Fragmente und Bonus. Konservative Score-Obergrenze 19.980.
- Neue Darstellung/Sounds/HUD, bestehende Sprungeffekte integriert; kürzerer
  Countdown (1,5 s), getrenntes Online-Run-Kontrollfeld standardmäßig aus.
- Neuer versionierter Browser-Speicher mit pf-1-Archiv; Kennung, Mute und Skins
  werden übernommen. Neue Freischaltungen basieren auf Gates, nicht Gesamtpunkten.
- Konsistente pf-2-Asset-URLs und neuer Offline-Cache inklusive neuer Module.
- Worker für pf-2-Aggregate, Gate-basierte Dauerprüfung, pf-2-Tokens,
  manuelle unveränderte Retries, neue Tabellen und `schemaReady` im Health-Endpunkt.
  Bisherige atomare Speicherung und Ranglistenfunktionen wurden angepasst.
- Additive Migration `cloudflare-worker/migrations/0002_escape_pf2.sql`:
  `runs_v2`, `scores_v2`, Indizes und Score-/Typ-Prüfungen. Keine alten Tabellen
  gelöscht oder umgeschrieben. **Nicht produktiv angewendet.**

## Tatsächlicher Teststand

Alle Tests liefen nur in der Cloud mit isolierten Browserprofilen/Testdaten.

| Prüfung | Letzter beobachteter Stand |
| --- | --- |
| `node --test tests/game.test.mjs tests/escape.test.mjs` | 21 bestanden |
| `python3 tests/browser_test.py` | 12 bestanden, 39,755 s |
| `python3 tests/visual_browser_test.py` | 7 bestanden, 75,059 s |
| Worker `npm test` (Dry-Run-Build + Miniflare/D1) | zuletzt 9 bestanden, 1 fehlgeschlagen |

Bekannter Worker-Testfehler: `cloudflare-worker/tests/worker.test.mjs` enthält
noch `19971` in der Liste ungültiger Scores mit erwarteter Antwort 400. Seit der
korrigierten Maximalgrenze **19980** ist das ein gültiger Integer innerhalb der
Grenze; wegen unpassender Aggregate kommt korrekt 422 zurück. Die Grenzfall-Fixture
muss angepasst und die ganze Backend-Suite erneut ausgeführt werden. Ein früherer
Backend-Lauf vor der Grenzwertkorrektur bestand 10/10; dieser ist keine aktuelle
Abnahme. Zusätzliche geplante Backend-Regressionen wurden noch nicht ergänzt.

Die neuen Unit-Tests prüfen u. a. 100 Seeds bis 35 Gates mit einem nur Eingaben
erzeugenden Controller, Projektil-/Laserphasen, Combo, Migration des lokalen
Speichers und Framerate-Replay. Das ist kein Beweis, dass alle möglichen Runs
fair sind. Es fehlen ausgiebige tatsächliche Spieltests und die neue Aufnahme.

Cloud-Testserver wurde auf `127.0.0.1:8000` neu gestartet; auf einer neuen Aufgabe
nicht als laufend voraussetzen. Loopback-Tests gehören zum Cloud-Executor.
Keine TLS-Prüfung ausschalten und keine externen Netzwerksperren umgehen.

## Offene Aufgaben

1. Gesamtdiff prüfen und aktuelle Tests erneut ausführen. Kleine Whitespace-Funde
   in `game/app.mjs` sind noch offen. Neue Backend-Tests für Scorekomponenten,
   SQL-Grenzen/Typen, additive Altdatenerhaltung, fehlendes Schema und neue
   Aufbewahrung ergänzen. Datenschutz, README und Deployment-Anleitung aktualisieren.
2. Tatsächliche Runs mit beweglicher Firewall, Drohne, Laser und Combo spielen;
   Touch/Pointer, Pause in allen Angriffsphasen und Neustarts überprüfen.
   Neue Vorher-/Nachher-Bilder und echte Spielaufnahme erstellen. Bisherige
   Layouttests ersetzen diese inhaltliche Sichtprüfung nicht.
3. Produktionszugriff reparieren/neu verbinden und den **tatsächlichen**
   D1-Schema-/Migrationsstand vor Änderungen lesen. Die Nutzerangabe
   `configured=true` beweist keine Tabellen. Bestehende Runtime-Secrets weder
   auslesen noch ändern. Keine Produktionsdatenbank zurücksetzen.
4. Fehlende Betreiber-/Anbieterangaben zur Datenschutzergänzung konkret prüfen;
   keine Rechtsgrundlagen, Datenorte, Vertrags- oder Logeinstellungen erfinden.
5. Nach späterer ausdrücklicher Fortsetzungsfreigabe und erfolgreichen Prüfungen:
   Datenschutzhinweise zuerst veröffentlichen, Migrationen kontrolliert anwenden,
   Worker pf-2 prüfen, Produktions-ENABLED aktivieren/deployen und erst nach
   Backend-Nachweis die Frontend-API-URL aktivieren. Anschließend echten freiwilligen
   Testeintrag speichern und nach Reload abrufen, Modi/Position/Fallback/Free-CPU
   prüfen. PR und Veröffentlichungsstatus wahrheitsgemäß dokumentieren.

## Cloud-Zugriff: letzter konkreter Befund

Der Nutzer meldete am 26.10., dass die Cloud-Umgebung veröffentlicht und
`CLOUDFLARE_API_TOKEN` sicher hinterlegt sei. Der **laufende Executor** zeigte
anschließend weiterhin den alten Laufzeitstand: keine Secret-Bindung, keine
zusätzlichen Netzwerkziele, Wrangler `not authenticated`, HTTPS-Proxy 403 für
Worker und GitHub-API. Der gespeicherte Entwurf enthielt dagegen die neue
Secret-Anforderung und Freigaben für `api.cloudflare.com`, `api.github.com`,
`developers.cloudflare.com`, `tr1stan.de` und den Worker-Host. Eine neue Aufgabe
muss die veröffentlichte Konfiguration tatsächlich verwenden und dies mit
`cloud_environment.environment_status` und read-only API-Aufrufen bestätigen.
Keine Secrets im Chat anfordern oder deren Werte protokollieren.

Erneute ausschließlich lesende Prüfung am 26.10.2026: Laufzeit-Spec und
beobachtete Spec weiterhin Revision 1; Entwurf Revision 4. Der Status meldet
`running`, `connected`, `observations_current=true`, Netzwerk `enforced` und
keine zusätzlichen freigegebenen Hosts oder Secret-Bindungen. `failure=null`
bezieht sich auf diesen Laufzeitstatus. Die Diagnosehistorie liefert
`history_status=not_found`, keine Records und keinen Legacy-Snapshot.
**Der genaue Veröffentlichungsfehler und ein eventuell neuerer global
veröffentlichter Stand sind daher unbekannt.** Proxy-403 und fehlende Anmeldung
sind beobachtete Zugriffsprobleme, kein belegter Veröffentlichungsfehler.
Es wurden dabei keine Umgebungseinstellungen geändert oder Publikationen gestartet.

Git-Fetch über die konfigurierte Verbindung funktioniert. GitHub-API, PR-Anlage,
Merge, Pages-Livekontrolle und Cloudflare-Verwaltung waren im laufenden Executor
zuletzt blockiert. Der Dashboard-Hinweis „Configured API token unavailable“ für
Worker Builds wurde noch nicht unabhängig geprüft.

## Unverändert / nicht durchgeführt

- `game/config.mjs`: **API_URL leer**. Produktion: **ENABLED=false**.
- Bestehende D1-ID `bc462466-1ed9-41d9-ab75-dc0197d50502` und Binding `DB` erhalten.
- Kein `[limits]`/`cpu_ms`-Block; Fehler 100328 nicht wieder einführen.
- Kein produktiver SQL-Schreibzugriff, keine Migration, kein Worker-Deployment,
  kein echter Ranglisteneintrag, kein Merge und kein Pages-Deployment dieser Arbeit.
- Domain, DNS, Mail, Impressum und bisherige Homepage-Navigation nicht geändert.
- Keine produktiven Secret-Werte im Repository. Testdateien verwenden weiterhin
  ausdrücklich falsche, isolierte Test-Schlüssel.

Offizielle Cloudflare-Dokumentation wurde über die erlaubte offizielle
GitHub-Quelle `cloudflare/cloudflare-docs`, Branch `production`, gelesen:
`src/content/docs/d1/reference/migrations.mdx` und
`src/content/docs/workers/platform/limits.mdx`. Free HTTP-CPU bleibt laut dieser
Quelle 10 ms; echte Produktions-CPU-Werte wurden nicht gemessen.
