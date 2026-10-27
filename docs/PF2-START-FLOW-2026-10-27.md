# PACKET//FLIGHT: eindeutiger Ranglistenstart

Ausgangspunkt: main/Arbeitsbranch `7ab097c7258178cf4ec58afe87f81234bdad696a`.
Cloud-only, bestehender Branch `codex/packet-flight-escape-v2`. Der Betreiber
hat diese Korrektur und Veröffentlichung über den bestehenden Weg beauftragt.

START begann zuvor ohne Online-Häkchen einen lokalen Run. Nach Game Over blieb
SCORE EINTRAGEN gesperrt. Auch ein fehlgeschlagener Online-Start fiel still auf
lokales Spielen zurück. Zwei native Buttons ersetzen jetzt das Häkchen:

- **MIT RANGLISTE STARTEN** bereitet vor dem Countdown einen Server-Run vor.
  Alias und öffentliche Scoreeintragung bleiben nach Game Over freiwillig.
- **NUR LOKAL SPIELEN** beginnt ohne Server-Anfrage. Nach Game Over erscheint
  ein klarer Hinweis und **NÄCHSTEN RUN MIT RANGLISTE STARTEN**. Dieses Ergebnis
  wird dabei weder übernommen noch nachträglich als Online-Score ausgegeben.

Ein Tap/Spiel-Key im bereiten Canvas fordert nur die Startwahl an. Während des
Spiels bleiben Tap/Space/↑/W und Pause/Fortsetzen unverändert. Nach einem
Online-Run öffnet SCORE EINTRAGEN das freiwillige Aliasformular. NOCHMAL nennt
die bisherige Startart ausdrücklich und fordert bei Online einen neuen Token an.

Ein Serverfehler, Timeout, ungültiges oder bereits abgelaufenes Start-Token
führt vor Spielbeginn in einen sichtbaren Fehlerzustand. Der Fehler erhält
Fokus/Alert; ERNEUT VERSUCHEN und NUR LOKAL SPIELEN sind bewusst auswählbar.
Es gibt keinen Countdown und keinen lokalen Ersatzstart im Fehlerzustand.
Client-Tokenablauf aktualisiert Eintragungsstatus und Erklärung. Eine definitive
HTTP 410-Antwort beendet die neue Eintragung; nach verlorener Antwort bleibt
nur die unveränderte manuelle Wiederholung möglich, auch nach Ablauf. Keine
automatische Wiederholung oder Warteschlange. Die serverseitige Sicherheits-,
Score-, Signatur-, Zeit- und Ratenprüfung bleibt unverändert.

## Nachweise vor Veröffentlichung

88 Prüfungen bestanden: 24 Spiel-/Speichertests, 17 workerd-/D1-Backendtests,
2 Website-, 20 Browser-, 8 visuelle, 2 Escape-Input-, 7 Metrik-Gate-,
6 Datenschutz/Service-Worker/Terminal- und 2 neue Browser-/Backend-Integrationstests.
HTML aller fünf Seiten, Node-Syntax und git diff --check bestanden.

Die beiden Integrationstests spielen Normal und Daily in echter Zeit gegen
echten workerd mit isolierter flüchtiger D1 und Testschlüsseln. Ein signierter
Run wird freiwillig eingetragen, bestätigt und wirklich zurückgelesen; Neustart
liefert ein neues Token. Die Test-API ist ausschließlich lokal. Der Prozess
erhält keine Cloudflare-/GitHub-Zugangsdaten. Keine öffentlichen Testeinträge.

Die Browser prüfen lokale und Online-Wahl, nächsten Ranglistenstart, Neustart,
Ablauf im Formular und am Server, Startfehler/Timeout/ungültige Antworten,
weiterhin identische manuelle Retries, Touch bei 320/390 sowie Tab, Shift+Tab,
Enter und Leertaste. Touch-Flächen mindestens 44px, kein horizontaler Überlauf,
keine unnötige Bildschirmtastatur bei Start/Fehlerwahl. Physische Geräte und
Safari bleiben ungeprüft; die Tastaturangabe belegt emulierte Fokus-/Inputprüfung.

Cache `tr1stan-packet-flight-pf-2-shell-5`, App/API/Spiel-CSS `pf2-start2`.
Ein echter vorher veröffentlichter Client/Service Worker aus 7ab097c mit Cache 4
wird im Test auf Cache 5 aktualisiert; alte Rekorde bleiben erhalten und die
neuen Startaktionen funktionieren nach echter Offline-Neuladung. Ohne bewusste
Speicherwahl weiterhin nur RAM, keine automatische Offline-Persistenz. Eine
vollständig offline verbliebene alte Fassung benötigt weiter ein Online-Update.
Die Datenschutzhinweise nennen beide Aktionen und den getrennten Zeitpunkt
von Server-Run-Vorbereitung und freiwilliger Veröffentlichung.

[Sanitisierter Testnachweis](packet-flight-pf2/start-flow/2026-10-27-tests.json),
[Start320](packet-flight-pf2/start-flow/start-choices-normal-320.png),
[Start390](packet-flight-pf2/start-flow/start-choices-normal-390.png),
[lokales Daily-Ergebnis320](packet-flight-pf2/start-flow/local-result-daily-320.png).

Frische authentifizierte Management-Leseprüfung vor Veröffentlichung:
Worker 100% `04ffc5cb-5519-4966-8bbe-f3a834f9b6b7`, ENABLED=true,
Script-ETag `a2299103df32194e959ab935aa0fb510420e20ec3ad748a1c9bc90fa98f873fa`.
Vorhandene drei Secret-Bindungen erhalten. D1: zwei Runs, zwei Bestwerte;
Release_Check Normal 10 und Daily 0 samt Komponenten/Zeitpunkten unverändert.
Alttabellen runs/scores leer, Migrationen 0001/0002 vorhanden. Sämtliche
Management-SELECTs: rows_written=0, changed_db=false.
Das vorige kontrollierte Worker-Budget bleibt 30/30; diese Korrektur erzeugt
keine neuen öffentlichen Worker-Testaufrufe oder Testeinträge. Das frühere
CPU-/Quota-Ergebnis ist historisch; keine neue Last-/CPU-Messung behaupten.

## Veröffentlichung und Rücknahme

Geprüfte Änderungen im bestehenden Branch sichern, Review-PR nach main mergen.
Automatische Workers Builds bleiben aktiv, Produktionsbranch main, Root /,
Build `npm ci --prefix cloudflare-worker`, Deploy mit `--keep-vars` wie manuell
bestätigt. Previews bleiben AUS. Main-Merge löst ebenfalls GitHub Pages aus.
Keine Umgebungseinstellungen ändern. Worker-/Migrations-/Spielregeldateien
bleiben unverändert; kein Deployment mit geänderten Secrets oder produktive
Datenbank-Schreibprüfung. Keine DNS-/Mailänderungen, kostenpflichtigen Dienste
oder Arbeiten am privaten Rechner.

Danach Pages-/Worker-Checks, tatsächlich aktive Version/Deployment und identischen
Worker-Script-ETag/erhaltene Bindungen lesend prüfen. Frontend-Dateien mit main
vergleichen, Startwahl lokal und mobil auf ausgeliefertem Code prüfen; sämtliche
API-Aufrufe im Live-Browsertest abfangen, keine öffentlichen Testeinträge.
D1 erneut ausschließlich per SELECT auf erhaltenen Datenstand prüfen.
Konkrete Source-/Build-/Deployment-Kennungen und Nachweise werden in der
zugehörigen PR-Beschreibung und im Abschlussbericht festgehalten. Kein weiterer
reiner Metadaten-Commit mit selbst auslösendem Build-Zyklus.

Bei fehlgeschlagenem Pages-/Worker-Check oder abweichendem Script/Bindings
anhalten und konkrete Ursache nennen. Bei bestätigtem Frontendfehler die
Clientkorrektur über einen Folge-PR zurücknehmen; dabei eine neue monotone
Cache-/Assetversion verwenden, statt einen alten Offline-Cache wiederzuverwenden.
Worker-Sicherheitsregeln und Produktionsdaten nicht für UI-Fehler anpassen.
Keine Datenbank zurücksetzen oder Secret-Werte ersetzen.
