# PACKET//FLIGHT: bestätigte Datenschutzentscheidungen und Quellen

Stand 26.10.2026. Die vier Betreiberentscheidungen sind im Release-Chat ausdrücklich
bestätigt; es gibt hierzu keinen weiteren pauschalen Freigabevorbehalt.
Die zur separaten Veröffentlichung vorbereitete Fassung steht in
[datenschutz.html](../datenschutz.html), Abschnitte 11–14.

- Öffentliche Eintragung: ausdrückliche, freiwillige und widerrufliche Einwilligung,
  Art. 6 Abs. 1 lit. a DSGVO. Kontakt chef@tr1stan.de. Vor dem finalen Absenden nennt
  das Formular Datenumfang, Widerruf und Datenschutzhinweise. Betrieb,
  Token-/Scoreprüfung und Missbrauchsschutz werden getrennt nach Art. 6 Abs. 1
  lit. f erläutert. Online-Start und bewusstes Board-Laden übertragen schon vor
  einem Score Daten; keine Anfrage beim bloßen Spielseitenaufruf.
- Fristen: Daily aktueller UTC-Tag + 29 frühere Tage, Normal 365 Tage ab Bestwert,
  Runs 48 Stunden nach Tokenablauf. Täglicher Cron 03:17 UTC, bis zu weitere
  24 Stunden und zusätzliche Verzögerung bei Fehlern/Abschaltung. Gleiche oder
  schlechtere Scores erneuern Normal-Fristen nicht. Alte pf-1-Tabellen bleiben
  erhalten; letzte lesende Bestandsprüfung: alle drei Anwendungstabellen leer.
- Normaler Cloudflare-Self-Service-Account, keine Sondervereinbarungen oder
  zusätzlichen Logexporte: vom Betreiber bestätigt. Keine ausschließliche
  EU-Verarbeitung; WEUR ohne EU-Jurisdiktion ist keine EU-Verarbeitungsgarantie.
- Optionale dauerhafte Spielstände/Offline-Dateien erst nach bewusster Auswahl,
  ohne Auswahl nur RAM. Bestehende Rekorde werden erhalten und vorher nicht gelesen.
  Nur die technische Speicherpräferenz wird beim Laden abgefragt. Abwahl löscht
  den Spiel-Offline-Cache, meldet den Service Worker ab und stoppt weitere
  Spielstand-Schreibzugriffe; gespeicherte Rekorde bleiben unangetastet. Kein
  sessionStorage-Fallback. Gewöhnlicher Browser-HTTP-Cache bleibt Browserfunktion.

## Nachvollziehbare Standard-Vertragsquellen

Die Notice nennt den Anbieter Cloudflare, Inc., 101 Townsend Street,
San Francisco, CA 94107, USA und verweist auf die offiziellen Standardunterlagen:

- [Self-Service-Standardbedingungen](https://www.cloudflare.com/terms/)
- [Customer DPA / Art. 28 und EU-Standardvertragsklauseln](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [Cloudflare-Datenschutzerklärung](https://www.cloudflare.com/privacypolicy/)
- [Offizieller Trust Hub](https://www.cloudflare.com/trust-hub/)

Übermittlungsgrundlage in der vorbereiteten Notice sind die im Standard-DPA
enthaltenen EU-Standardvertragsklauseln (Beschluss EU 2021/914), Art. 46 Abs. 2
lit. c DSGVO. Es wird weder eine individuelle Vertragsannahme vorgenommen noch
eine besondere Vertragsfassung, eine aktuell nachgelesene DPF-Zertifizierung oder
EU-exklusive Verarbeitung behauptet. Kopien der anwendbaren Garantien können über
den Betreiberkontakt angefordert werden.

**Grenze der Quellenprüfung:** Der direkte Abruf der Vertragsseiten von
www.cloudflare.com wird in dieser Cloud weiterhin vom HTTPS-Proxy mit
`Tunnel connection failed: 403 Forbidden` gesperrt. Die Links sind die offiziellen
Standardquellen, keine Behauptung, dass deren vollständiger aktueller Wortlaut
in dieser Sitzung abgerufen werden konnte. Der Self-Service-Vertragsstand beruht
auf der ausdrücklichen Betreiberbestätigung. Keine Umgebungseinstellungen wurden
für den Abruf verändert. Diese konkrete Quellenbeschränkung muss vor dem
Notice-Merge im Release-Protokoll sichtbar bleiben; keine erfundenen Paragraphen,
Annahmezeitpunkte oder Sonderbedingungen ergänzen.

## Technische Nachweise und Löschüberwachung

- Neue Chromium-Tests lesen vor Zustimmung ausschließlich den Präferenzschlüssel,
  schreiben keine Spielwerte und registrieren keinen neuen Service Worker.
- Alte automatische Worker werden beim erreichbaren Online-Upgrade durch einen
  zunächst cachefreien Worker ersetzt; ohne Auswahl werden Cache und Registrierung
  entfernt. Vollständig offline verbliebene alte Fassungen benötigen zunächst eine
  Online-Aktualisierung. Abwahl und erneute Auswahl, alte pf-1-Werte und Offline-
  Reload sowie mehrere Tabs sind geprüft. Fehlgeschlagene Abschaltung zeigt eine
  konkrete Handlung an, statt fälschlich Erfolg zu behaupten.
- Health liefert nur `retentionOverdue: boolean|null`, keine Datensätze oder IDs.
  Es prüft Runs, beide Score-Modi und Rate-Buckets lesend auf Überschreitung der
  regulären Frist plus eines täglichen Bereinigungsintervalls.
- `.github/workflows/pf2-retention.yml` liest diesen öffentlichen Status täglich
  04:47 UTC (GitHub kann Cron-Starts verzögern) und scheitert bei Überfälligkeit,
  deaktiviertem Worker oder unbekanntem Schema/Status. Kein Token und keine neuen
  Secrets erforderlich. Der Betreiber muss fehlgeschlagene/ausgebliebene Läufe
  unter GitHub Actions und Cloudflare Cron prüfen; es wird keine persönliche
  Benachrichtigungseinstellung automatisch geändert. Vor Aktivierung prüfen,
  dass Actions zugelassen sind und der erste manuelle Monitorlauf erfolgreich ist.
  Das Lesen der Repository-Actionseinstellungen lieferte hier HTTP 403; daraus
  wird nicht auf deaktivierte Actions geschlossen.
- Anbieterfristen: D1-Analysen 31 Tage; Query Insights ohne gebundene Parameterwerte.
  Time Travel Free sieben / Paid 30 Tage. Anwendungstabellenlöschung ist kein
  sofortiger Backup-Löschnachweis. Worker-Observability ist für den vorgesehenen
  Deploy explizit false; fehlende API-Angabe allein belegt keine Logfreiheit.

Offizielle technische Quellen wurden aus cloudflare/cloudflare-docs gelesen,
Snapshot `8c30c8b4876fd857bd049ea3525fa463a5015a02`:
[D1 Datenorte](https://developers.cloudflare.com/d1/configuration/data-location/),
[Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/),
[D1 Analysen](https://developers.cloudflare.com/d1/observability/metrics-analytics/),
[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/),
[Compliance-Dokumente](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/compliance-docs/).
Die technische Reihenfolge und Rückkehr stehen in [PF2-RELEASE.md](PF2-RELEASE.md).
