# Datenschutzentwurf PACKET//FLIGHT pf-2

Prüffassung vom 26.10.2026, **nicht die aktive Datenschutzerklärung**. Keine
Rechtskonformität oder Vertragslage wird zugesichert. Verantwortlicher und
Kontakt bleiben die in Impressum/datenschutz.html genannten Angaben. Kein
Wechsel von GitHub Pages, Domain, DNS oder Mail ist vorgesehen.

## Tatsächlich beobachteter Stand

Frontend-API_URL ist leer. Der produktive Cloudflare-Worker antwortet als pf-1,
ENABLED=false, configured=true. Die bestehende D1-Datenbank enthält nur pf-1-
Tabellen. In dieser Arbeit wurden ausschließlich Schema-/Metadaten gelesen;
keine produktiven Scores übertragen, Migrationen oder Deployments ausgeführt.
Worker-Logpush ist laut API false; observability ist null. Daraus lassen sich
weder vollständige Logfreiheit noch Backup-Fristen oder Datenresidenz ableiten.
Die Antwortregion WEUR/CDG einer Anfrage ist kein Nachweis der Speicherorte.

## Entwurf des Hinweises vor einer späteren Aktivierung

Du kannst PACKET//FLIGHT vollständig lokal spielen. Ohne Online-Run und ohne
bewusstes Laden der Rangliste sendet das Spiel keine Anfrage an Cloudflare.
Auch bei später konfiguriertem Backend wird die Rangliste nicht automatisch
beim Seitenaufruf geladen. Ein Klick auf AKTUALISIEREN oder einen Ranglistenmodus
ruft sie ab und übermittelt die pseudonyme Browserkennung für deine eigene Position.

Nur mit aktivierter Online-Run-Auswahl sendet START Browserkennung, Modus und
Spielversion an den Cloudflare-Worker. Der Server erstellt einen signierten Run
mit Seed, Start-/Ablaufzeit und UTC-Tag. Das geschieht bereits vor einer möglichen
Scoreeintragung. Ein rein lokaler Run ist später nicht nachträglich einreichbar.
Es gibt keine versteckte Upload-Warteschlange.

SCORE EINTRAGEN öffnet erst das Formular. ÖFFENTLICH EINTRAGEN übermittelt den
gewählten Alias, Score, Gatezahl, Fragmentzahl, Combo-Bonuspunkte, behauptete
aktive Spielzeit, Token und Browserkennung. Abbrechen vor dem Absenden sendet
keinen Score. Nach verlorener Antwort ist eine ausschließlich manuell ausgelöste
identische Wiederholung möglich; eine schon verarbeitete Anfrage kann bereits
öffentlich sein. Kein automatischer Retry, keine Übernahme früherer Aliase.

Öffentlich beziehungsweise an den anfragenden Browser zurückgegeben werden Alias,
Score, Gate-/Fragment-/Bonussummen, Rang, Position und serverseitiger Zeitpunkt
des Bestwerts (UTC). Vollständige Browserkennungen, Kennungshashes, IP-Adressen,
Tokens und interne Entry-IDs werden nicht im Board veröffentlicht. Der Browser
erhält seinen eigenen Bestwert auch außerhalb der Top 20, keine zusätzlichen
fremden Einträge. Eine bestätigte Position ist eine zeitliche Momentaufnahme.

Ein Profil kann einen Bestwert pro Version/Modus/UTC-Tag haben. Ein anderes
Gerät, anderes Profil oder gelöschter Speicher kann weitere Kennungen erzeugen.
Es gibt kein Konto, E-Mail-Zwang oder Fingerprinting und keine verlässliche
Identitätsprüfung. Pseudonymisierte Werte und Aliase sind nicht pauschal anonym.

## Datenverarbeitung und Aufbewahrung laut pf-2-Code

- localStorage: zufällige Browserkennung, Sound, Skins, pf-2-Rekorde, kumulative
  Spielstatistik und pf-1-Archiv. Bis zur Löschung der Website-Daten; höchstens
  90 pf-2-Daily-Tageswerte. Alte pf-1-Daten bleiben getrennt erhalten. Bei
  blockiertem Speicher Sitzungsspeicher/Arbeitsspeicher mit sichtbarem Hinweis.
- Service Worker: lokale Spieldateien/Fonts, keine API-Antworten. Bis zur
  Versionsbereinigung oder Löschung des Browser-Caches/der Website-Daten.
- D1-Runs: HMAC der Browserkennung, Version, Modus, Seed, Tageszuordnung,
  Serverzeiten, Verbrauchsstatus und gegebenenfalls Alias, Komponenten,
  Submission-Digest und Retry-Bestätigung. 30 Minuten gültig; Löschung 48 Stunden
  nach Ablauf beim nächsten täglichen Bereinigungslauf.
- Daily-Bestwerte: aktueller UTC-Tag und 29 frühere Tage, danach tägliche Löschung.
- Normal-Bestwerte: Löschung bei einem Alter des Achievement-Zeitpunkts über
  365 Tagen beim nächsten Cron; keine unbegrenzte Allzeit-Aufbewahrung behaupten.
- Rate-Buckets: täglicher HMAC aus IP und Datum/Scope, kein roher IP-Speicher in
  dieser Anwendung. Minuten-Buckets laufen nach 2 Minuten, Tages-Buckets nach
  48 Stunden ab. Das globale Tageslimit enthält keine Profilkennung.
- Cron: 03:17 UTC; bei funktionierendem Lauf bis zu weitere 24 Stunden zur
  jeweiligen Löschung. Fehlgeschlagene Cron-Läufe verlängern die Aufbewahrung
  und benötigen Betriebsüberwachung. Bereinigung ist kein Backup-Löschnachweis.
- Legacy pf-1: Migration und pf-2-Cron löschen/überschreiben bestehende Tabellen
  nicht. Ihre tatsächlichen Daten und erforderlichen Fristen separat prüfen;
  vor Freigabe eine ausdrücklich genehmigte Archiv-/Löschentscheidung festhalten.

IP-Adressen und HTTPS-Metadaten werden bei Cloudflare verarbeitet. Die Anwendung
verwendet die IP vorübergehend für Missbrauchsschutz und loggt keine Tokenwerte
oder Request-Bodies. Das ist keine Aussage über sämtliche Anbieter-Logs.

## Konkrete Freigabepunkte für Betreiber/Datenschutzprüfung

| Punkt | Stand / erforderlicher Nachweis |
| --- | --- |
| Anbieter/Vertrag | Tatsächliche Cloudflare-Vertragspartei und Auftragsverarbeitungsvertrag anhand des bestehenden Accounts ergänzen; nicht aus der Worker-Domain ableiten. |
| Rechtsgrundlagen | Für optionalen Browserspeicher auch §25 TDDDG prüfen; für Online-Start, öffentliche Eintragung und Missbrauchsschutz jeweils Zweck, Erforderlichkeit und Art.-6-Grundlage begründen. Checkbox allein belegt keine wirksame Einwilligung für alle Verarbeitung. |
| Datenorte/Übermittlung | Tatsächliche Anbieter-/D1-Einstellungen, Unterauftragnehmer und Übermittlungsgrundlagen Art.44ff prüfen. Keine EU-only-Zusage aus einer Antwortregion. |
| Logs/Backups | Plattformlogs, Fehlerlogs, Time Travel/Backups und deren Fristen/Restore-Verfahren prüfen; logpush=false ist dafür unzureichend. |
| Betrieb | Cron-Erfolg, Quoten/Free-CPU, Missbrauch, Löscherfolg und Wiederherstellung prüfen; keine unbeobachteten Fristen zusichern. |
| Betroffenenrechte | Kontakt und Verfahren für Auskunft/Berichtigung/Löschung/Widerspruch festlegen, inklusive sicherer freiwilliger Zuordnung zur Browserkennung. Keine Kennungen oder Tokens öffentlich anfordern. |
| Moderation | Alias-Missbrauch und vollständige Löschung zugehöriger Scores/Runs/Receipts privat behandeln; keine öffentliche Admin-API. |
| pf-1-Altbestand | Bestehende Tabellen erhalten; angemessene Altaufbewahrung und erst später genehmigte Löschung dokumentieren. |

Vor der Online-Aktivierung muss aus diesem Entwurf eine geprüfte, tatsächliche
Verarbeitung beschreibende Ergänzung von datenschutz.html werden und zuerst
veröffentlicht werden. Bis dahin bleiben API_URL leer und Worker deaktiviert.
