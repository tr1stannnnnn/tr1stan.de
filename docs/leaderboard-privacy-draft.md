# Datenschutzentwurf PACKET//FLIGHT pf-2

Arbeitsfassung vom 26.10.2026, **nicht die aktive Datenschutzerklärung**.
Verantwortlicher und Kontakt bleiben die in Impressum/datenschutz.html genannten Angaben. Kein
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

## Durch Account/Dokumentation konkret geklärt

Stand 26.10.2026, ergänzend zum früheren Prüfbefund:

- Bestehende D1: running_in_region=WEUR, jurisdiction=null, Read Replication
  disabled. Laut offizieller D1-Dokumentation wäre eine EU-Jurisdiktion nur bei
  Erstellung festlegbar. Keine nachträgliche EU-only-Zusage und kein heimlicher
  Datenbankwechsel. Die aktuelle primäre Region ist nicht gleichbedeutend mit
  einer vertraglichen Beschränkung aller Datenverarbeitung auf die EU.
- Alte Tabellen runs/scores/rate_buckets enthalten jeweils **0 Zeilen**, per
  aggregiertem SELECT ohne Personenzeilen ermittelt. Für diesen vorhandenen
  leeren Altbestand muss keine Löschung freigegeben werden. Die Tabellen bleiben
  erhalten; vor Release erneut zählen, falls zwischenzeitlich Daten hinzukommen.
- D1 Time Travel: laut offizieller Dokumentation Free bis 7 Tage, Paid bis 30
  Tage. Löschung aus der Anwendung löscht historische Wiederherstellungspunkte
  nicht sofort. Es wurde kein Restore ausgeführt. Der Tarif ist über den
  vorhandenen API-Zugriff nicht lesbar (Subscriptions/Billing HTTP 403); daher
  nicht fälschlich eine accountseitig verifizierte konkrete Backup-Frist behaupten.
- D1-Analysen werden laut Dokumentation 31 Tage vorgehalten. Query Insights
  erfasst SQL-Abfragetexte, aber nicht die gebundenen Parameter. Anwendung und
  Betreiberwerkzeuge müssen Personenwerte weiterhin als Parameter übergeben.
- Workers Logs: zum 26.10.2026 nennt die offizielle Preistabelle **3 Tage Free**
  und **7 Tage Paid**. Der allgemeine Maximalwert von 7 Tagen ist kein Beleg für
  die Free-Aufbewahrung. Zum 01.12.2026 ist laut Anbieter eine Preis-/Modelländerung
  angekündigt; bei späterem Release erneut prüfen.
- Im aktuellen Worker sind logpush=false und tail_consumers=[] lesbar; die API
  liefert kein eindeutiges observability.enabled. Externe Observability-Ziele
  sind mit dem Token nicht lesbar (403). Der vorbereitete Release setzt deshalb
  observability.enabled=false explizit in der Repository-Konfiguration. Dies ist
  **noch nicht produktiv angewendet**. Es verhindert die Anwendungsspeicherung
  von Invocation-Logs; keine Aussage „Cloudflare verarbeitet keine IP-Adressen“.
- CPU-/Quota-Nachweis benötigt keine Aktivierung von Request-Logs: vorhandene
  GraphQL-Aggregate funktionieren. Personenkennungen und Tokenwerte werden dafür
  nicht abgefragt. Aktuelle Messungen sind ausschließlich pf-1-Baselinewerte.
- Betriebskontakt und Verantwortlicher sind bereits in Impressum/datenschutz.html
  genannt. Für Löschung/Moderation wird der bestehende Kontakt chef@tr1stan.de
  verwendet; es muss keine neue Kontaktadresse oder öffentliche Admin-API entstehen.

## Konkret noch vom Betreiber festzulegen oder zu bestätigen

1. **Rechtsgrundlage der freiwilligen öffentlichen Eintragung:** vorgeschlagen ist
   Art. 6 Abs. 1 lit. a DSGVO mit eindeutigem Einwilligungstext vor ÖFFENTLICH
   EINTRAGEN und Widerruf an chef@tr1stan.de. Technischer Betrieb/Missbrauchsschutz
   separat nach Art. 6 Abs. 1 lit. f mit benanntem Interesse an einer sicheren,
   fairen Rangliste. Kein pauschales „alles durch Einwilligung“. Soll stattdessen
   die Veröffentlichung selbst auf berechtigte Interessen gestützt werden, muss
   der Betreiber dieses konkrete Modell einschließlich Interessenabwägung wählen;
   es wird nicht stillschweigend unterstellt.
2. **Aufbewahrung als Betriebsentscheidung:** vorgeschlagen sind die bereits
   implementierten 30 UTC-Tage Daily und maximal 365 Tage ab Achievement für
   Normal sowie Runs bis 48 Stunden nach Tokenablauf plus Cron-Intervall.
   Der Betreiber entscheidet über diese konkreten Fristen; keine zusätzliche
   unbestimmte „Archivaufbewahrung“ für den derzeit leeren pf-1-Bestand.
3. **Tatsächliche Vertragslage des bestehenden Accounts:** handelt es sich um
   den Standard-Self-Service-Vertrag mit Cloudflares veröffentlichter DPA oder
   gibt es abweichende Vereinbarungen/weitere vom Betreiber eingerichtete
   Logexporte? Vertragspartner und geltende Übermittlungsgrundlage müssen aus
   genau diesem Vertrag bestätigt werden. Accountname/type=standard ist kein
   Vertragsnachweis. Keine neuen Verträge automatisch abschließen.

4. **Lokale Speicherfunktion (§ 25 TDDDG):** Soll dauerhafter Spielstand und
   Offline-Cache ausdrücklich vom Besucher gewählt werden? Empfehlung: bewusste
   Auswahl „Rekorde und Offline-Nutzung auf diesem Gerät behalten“, andernfalls
   nur Arbeitsspeicher. Bestehende Rekorde dabei nicht löschen. Aktuell werden
   Kennung/Statistiken und Cache bereits beim Spielseitenaufruf angelegt; eine
   Ausnahme für sämtliche optionalen Daten wird hier nicht pauschal unterstellt.
   Diese Auswahl betrifft den Umfang des angebotenen Dienstes, nicht eine aus
   dem Account ablesbare Einstellung. Falls gewählt, ist die kleine Speicherwahl
   vor dem Notice-/Feature-Release umzusetzen und auf Erhalt der Altwerte zu testen.

Dies sind die offenen Betreiberpunkte. Nicht erneut zur Entscheidung gestellt
werden müssen: vorhandener Anbieter/Worker/D1, aktuelle Region, leere Alttabellen,
Anwendungsspeicher, implementierte Score-/Run-Daten, bekannte Standardfristen oder
vorhandene Kontaktadresse. Technisch fehlende Leserechte sind getrennt im
Veröffentlichungsplan dokumentiert, keine ersatzweise erfundenen Einstellungen.

## Konkreter Textvorschlag für die Notice-Veröffentlichung

Die vorhandenen Abschnitte zu Verantwortlichem, GitHub Pages, E-Mail und Rechten
bleiben erhalten. Den Spielabschnitt um folgende Aussagen ergänzen; Anbieter-
Vertragspartei/Übermittlungsgrundlage nach Punkt 3 eintragen und die Entscheidungen
1/2 einsetzen, bevor diese Fassung auf main gelangt:

> PACKET//FLIGHT kann lokal ohne Cloudflare-Anfrage gespielt werden. Wenn du
> bewusst die Rangliste lädst, wird deine zufällige Browserkennung an den
> Cloudflare-Worker übermittelt, um deinen eigenen Bestwert zuzuordnen. Wenn du
> einen Online-Run auswählst und START drückst, werden Kennung, Modus und Version
> bereits vor einer möglichen Eintragung übertragen. Der Server speichert einen
> HMAC der Kennung sowie Seed, Modus, UTC-Tag und Start-/Ablaufzeit. Ein lokaler
> Run wird nicht später nachträglich hochgeladen.
>
> Mit ÖFFENTLICH EINTRAGEN willigst du – bei Wahl des vorgeschlagenen
> Einwilligungsmodells – in die Veröffentlichung deines gewählten Alias, Scores,
> Gates, Fragmente, Bonuspunkte, Rangs, Zeitpunkts und deiner Ranglistenposition
> ein. Du kannst vor dem Absenden abbrechen. Es gibt keine automatische
> Wiederholung; bei verlorener Antwort kann eine bereits verarbeitete Eintragung
> öffentlich sein. Die eigene Bestwertposition erhält dein Browser auch außerhalb
> der öffentlichen Top 20. Vollständige Kennungen, HMAC-Werte, IP-Adressen und
> Tokens erscheinen nicht im Board. Ein Browserprofil ist keine Personenidentität.
>
> Betrieb/Missbrauchsschutz dient der sicheren Bereitstellung und der Begrenzung
> manipulierter oder übermäßiger Anfragen. Die Anwendung verarbeitet IP-Adressen
> vorübergehend zu täglich wechselnden HMAC-Ratewerten, speichert keine rohen IPs
> und legt keine Request-/Token-Logs an. Der Anbieter verarbeitet notwendige
> Netzwerk-/Sicherheitsdaten eigenständig gemäß seiner Datenschutzerklärung.
> Keine ausschließliche EU-Verarbeitung wird zugesichert. D1-Wiederherstellung
> und Anbieteranalysen haben von unserer Tabellenlöschung getrennte Fristen.
>
> Nach vorgeschlagenem Betriebsmodell bleiben Daily-Werte 30 UTC-Tage und Normal-
> Bestwerte maximal 365 Tage ab Erreichen gespeichert; Runs werden 48 Stunden nach
> Ablauf beim nächsten täglichen Cron um 03:17 UTC entfernt. Fehlgeschlagene Cron-
> Läufe können die Löschung verzögern und werden überwacht. Auskunft, Widerruf und
> Löschung sind über chef@tr1stan.de möglich. Kennungen/Belege nur privat übermitteln,
> niemals als öffentlichen Ranglisten-Alias. Rechte und Beschwerdemöglichkeiten
> aus den übrigen Datenschutzhinweisen gelten unverändert.

Der endgültige Text nennt die tatsächlich bestätigte Cloudflare-Vertragspartei,
DPA/Übermittlungsgrundlage und den bestätigten Tarif für Time Travel. Diese Angaben
sind keine Platzhalter, die öffentlich unverändert übernommen werden dürfen.
Die ausführbare Reihenfolge und Rückkehr stehen in [PF2-RELEASE.md](PF2-RELEASE.md).

## Offizielle Quellen und Zugriffsbeschränkung

Gelesen aus Cloudflares offiziellem Dokumentations-Repository, Stand
`8c30c8b4876fd857bd049ea3525fa463a5015a02`:

- [D1 Datenorte/Jurisdiktion](https://developers.cloudflare.com/d1/configuration/data-location/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [D1 Analyse/Query Insights](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Workers-Logs-Preistabelle](https://github.com/cloudflare/cloudflare-docs/blob/8c30c8b4876fd857bd049ea3525fa463a5015a02/src/content/partials/workers/workers_logs_pricing.mdx)
- [Cloudflare Compliance-Dokumente](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/compliance-docs/)

Cloudflares offizielle Compliance-Anleitung verweist für öffentliche Datenschutz-
und Vertragsunterlagen auf den Trust Hub. Der direkte Abruf von www.cloudflare.com
wird in dieser Cloud vom HTTPS-Proxy mit 403 gesperrt. Daher wurden konkrete
DPA-Partei, Annahme und Klauselfassung hier **nicht als gelesen bestätigt**.
[Offizielle DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) und
[Anbieter-Datenschutzerklärung](https://www.cloudflare.com/privacypolicy/) sind die
konkret zu bestätigenden Vertragsquellen, keine erfundene Freigabeanforderung.
Die Netzwerk-/Umgebungseinstellungen wurden dafür nicht verändert.
