# Prüffassung für eine spätere Ranglistenaktivierung

**Nicht die aktive Datenschutzerklärung.** Die API-URL ist leer, Cloudflare wurde
nicht aktiviert. Diese Vorlage muss vor Aktivierung fachlich und rechtlich
geprüft und auf den tatsächlichen Betreiber, Account, Vertrag und Betrieb
angepasst werden. Sie behauptet keine garantierte Rechtskonformität.

## Geplanter Ablauf und Daten

Bei einem Online-Spielstart wird bereits eine Anfrage an den später benannten
Cloudflare-Worker geschickt: zufällige pseudonyme Browserkennung, Spielversion
und Modus. Der Server legt Run-ID, Startzeit, Ablaufzeit, Tageszuordnung und Seed
fest. Er speichert einen mit einem geheimen Schlüssel abgeleiteten Kennungshash,
nicht die unveränderte Browserkennung. Ein Token kehrt zum Browser zurück.
Ein lokaler Run ohne gültigen Serverstart ist später nicht öffentlich einreichbar.

**Veröffentlichung bleibt freiwillig:** Erst SCORE EINTRAGEN öffnet das Formular;
ÖFFENTLICH EINTRAGEN sendet Alias, Score, behauptete aktive Spielzeit, Token und
Browserkennung. Abbrechen vor Absenden sendet keine Eintragung. Der öffentliche
Top-20-Eintrag zeigt Alias, Score, Position, Rang und den serverseitigen Zeitpunkt
des Bestwerts (UTC). Eigene Einträge werden ohne Veröffentlichung vollständiger
Kennungen markiert. Das anfragende Browserprofil erhält außerdem seine eigene
Bestwertposition außerhalb der Top 20; keine zusätzlichen fremden Einträge.
Es gibt weder Konto noch E-Mail-Abfrage noch Fingerprinting.

Die Kennung ermöglicht einen Bestwert pro Browserprofil, nicht pro Mensch.
Andere Geräte/Profile oder gelöschte Website-Daten ermöglichen weitere Einträge.
Pseudonymisierung ist keine vollständige Anonymität. Weder ein Alias noch
technische Metadaten dürfen pauschal als anonym bezeichnet werden.

## Anbieter und technische Verarbeitung

Der künftig konkret benannte Cloudflare-Account verarbeitet HTTPS-Anfragen als
Worker-/D1-Anbieter. Dabei können IP-Adressen und weitere Netzwerkmetadaten
verarbeitet werden. Unsere Anwendung verarbeitet eine IP vorübergehend zur
Bildung eines täglich wechselnden HMAC für Missbrauchsbegrenzung, speichert aber
keine rohen IP-Adressen dauerhaft und loggt keine Tokens oder Request-Bodies.
Cloudflares eigene Logs, Aufbewahrung, Backups, Sicherheitsverarbeitung und
gegebenenfalls internationale Übermittlungen müssen anhand des tatsächlichen
Vertrags und der Account-Einstellungen separat beschrieben werden. Die Aussage
„IP-Adressen werden niemals verarbeitet“ wäre falsch.

## Im Code vorgesehene Aufbewahrung

- Lokaler Browser-Speicher: Rekorde/Einstellungen/Skins/Kennung bis zur Löschung
  der Website-Daten; höchstens 90 gespeicherte Daily-Tagesrekorde. Offline-Dateien
  im Browser-Cache bis zur Cache-/Website-Datenlöschung oder Versionsbereinigung.
- Server-Runs: 30 Minuten Gültigkeit, Bereinigung 48 Stunden nach Ablauf beim
  nächsten täglichen Lauf um 03:17 UTC; maximal weitere 24h Verzögerung bei
  funktionierendem Cron. Verbrauchte Runs bewahren die Retry-Bestätigung.
- Daily-Rangliste: aktueller UTC-Tag plus 29 vorangegangene Tage, Löschung beim
  nächsten täglichen Bereinigungslauf.
- Allzeit-Bestwerte: bis zur Betreiberlöschung oder einem angekündigten Reset.
  Diese längere Frist muss vor Aktivierung ausdrücklich überprüft werden.
- IP-bezogene HMAC-Rate-Buckets: Minuten-Buckets 2 Minuten, Tages-Buckets 48h
  ab Anlage, jeweils Löschung beim nächsten täglichen Lauf (bis zu 24h später).
- Anbieter-Logs und Time-Travel-/Backup-Daten: **tatsächliche Fristen ergänzen**;
  diese werden durch unsere Tabellenbereinigung nicht automatisch gelöscht.

## Vor Aktivierung konkret zu ergänzen

1. Zweck und geprüfte Rechtsgrundlagen für lokalen optionalen Spielspeicher,
   Online-Run-Start, öffentliche Eintragung und Missbrauchsschutz. Keine pauschale
   Einwilligungsbehauptung für alle Anbieter-/Sicherheitsvorgänge.
2. Cloudflare-Anbieteridentität, Auftragsverarbeitung, tatsächliche Datenorte,
   Übermittlungsgrundlagen und Account-/Log-/Backup-Einstellungen.
3. Verständlicher Online-Hinweis **vor dem Spielstart**, da Cloudflare-Anfragen
   schon dann erfolgen, auch wenn später kein Score veröffentlicht wird.
4. Betreiberprozess für Moderation, Auskunft, Löschung und Beschwerden, inklusive
   Umgang mit einer vom Nutzer freiwillig übermittelten Browserkennung. Keine
   Kennungen oder Tokens öffentlich posten lassen. Keine Identitätsprüfung
   behaupten, die das kontolose Modell nicht bietet.
5. Tatsächliche Aufbewahrungsfristen, Cron-Überwachung und Löschkontrolle; prüfen,
   ob die Allzeit-Aufbewahrung begrenzt werden muss. Änderungen zuerst im Code
   und in dieser Beschreibung konsistent vornehmen.

Die vorhandene Datenschutzerklärung wird nicht ersetzt. Ihr Zusatz zum aktiven
lokalen Spielspeicher ist davon getrennt. Impressum, GitHub Pages, DNS und
E-Mail-Dienste werden durch diese Vorlage nicht verändert.
