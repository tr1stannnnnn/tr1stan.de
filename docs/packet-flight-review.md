# PACKET//FLIGHT — Entwurfsreview

Ausgangscommit: `6277ee2b4810f5ea8a461139f2cb970925e0884a`.
Entwurfsbranch: `codex/packet-flight`. Umsetzung und Tests ausschließlich in der
bereitgestellten entfernten Codex-Cloud-Arbeitskopie `/workspace/tr1stan.de`.
Der bereits vorhandene gleichnamige Online-Branch stand auf demselben Commit.

GitHub Pages wurde über die konfigurierte Verbindung geprüft: `main`, Root `/`,
Legacy Pages, HTTPS, bestehendes CNAME `tr1stan.de`. Keine dieser Einstellungen
wurde geändert. Keine Website- oder Cloudflare-Veröffentlichung. Der neue Draft
ist zur Codeprüfung bestimmt; Commit und PR-Adresse stehen im Abschlussbericht.

## Implementiert

- Eigenes Canvas-Arcade-Spiel, Normal/Daily, feste 480×720-Regeln und 120-Hz-
  Simulation; begrenztes Aufholen, deterministische Daily-Route, getrennte RNGs.
- Bewusster Start/Resume mit Countdown, eindeutige Zustände, Pause bei verborgenem
  Tab, responsive Darstellung mit begrenztem DPR. Neustarts teilen dieselbe
  einzige RAF-Schleife und bestehende Listener.
- Lokale normale/Tagesrekorde, defensiver localStorage-/sessionStorage-/Memory-
  Fallback, Sound nach Nutzeraktion, Mute, Skins bei 10/25/50, Ränge und Game Over.
- Explizit freiwillige aliasbasierte Eintragung vorbereitet; sichere Textausgabe,
  Abbruch, identischer manueller Retry, Kopieren mit auswählbarem Textfallback.
- Leere API-Adresse und deaktivierter Worker als Standard. Keine Cloudflare-
  Anfragen, echten Demo-Einträge, automatische Veröffentlichung oder Upload-Queue.
- Spiel-Service-Worker für tatsächliches Offline-Neuladen nach Erstbesuch;
  gezielter Cache nur für Spiel-HTML und benötigte lokale Assets, keine API-Daten.
- Sichtbarer Arcade-/Terminalhinweis; `play`, `play --daily`, `leaderboard`,
  konsistente Hilfe/Chips/Vervollständigung; eigenes 1200×630-PNG samt Social-Tags.
- D1-Migration, parametrisierte Queries, serverseitige HMAC-Pseudonymisierung,
  signierte Starttokens, transaktionaler Verbrauch/Bestwert, Idempotenz,
  Rate-Limits, CORS, Cleanup, Moderations-/Aktivierungsanleitung und Tests.
- Datenschutz nur um aktiven lokalen Spielspeicher ergänzt; separate Prüffassung
  für eine mögliche spätere Online-Aktivierung.

## Korrigierte Fehler

- Im Ausgangsstand reproduzierte Tab-/Shift+Tab-Falle: vollständige/unbekannte
  Befehle und nicht weiter ergänzbare Präfixe wechseln jetzt normal den Fokus.
- Skip-Link setzt tatsächlichen Fokus auf `main`, ohne doppelte IDs oder Änderung
  des Impressums. Das Terminal erhielt einen nativen SEND-Submit-Button.
- Während der Implementierung gefundene Fehler behoben: ungebundener Browser-
  `fetch`-Aufruf, anfängliche Canvas-Auflösung bei verstecktem Container,
  schmale/200%-Layouts, intrinsisch zu breite Terminal-Grid-Spalte mit
  abgeschnittenen mobilen Bedienelementen sowie Kontrast beim primären Spielbutton.

## Tatsächlich ausgeführte Prüfungen

27 Tests bestanden: 8 Node-Spieltests, 8 Worker-/D1-Tests, 9 Chromium-Browsertests,
2 statische/HTTP-Integritätstests. Keine übersprungenen Tests. Zusätzlich:

- HTML-Validate 10.5.0 auf allen fünf HTML-Seiten: bestanden. Bestehender
  Kleinbuchstaben-Doctype und self-closing Void-Stil werden ausdrücklich geprüft.
  Nur die Empfehlung „native button statt interaktivem Canvas“ wird am Canvas
  gezielt ausgenommen; native Start/Pause und Enter/Space-Bedienung existieren.
- Lockfile-Installation mit `npm ci`: bestanden; Wrangler-Dry-run-Bundle erstellt.
- Additive Migration mit Wrangler ausschließlich in lokalem Test-D1 angewendet;
  erneut anwendbar, keine echten Cloudflare-Datenbankänderungen.
- Reale Loopback-HTTP-Abrufe: Seiten, Module, Vendor-Code, Schriften, CSS und
  Social-PNG verfügbar. IDs, ARIA-Referenzen, Formlabels, interne Links, Sitemap
  und PNG-Maße geprüft. Git-Diff auf Impressum, 404, CNAME und robots.txt leer.
- Screenshots/Sichtprüfung bei 320×568, 390×844, 430×932, 768×1024, 1440×900
  und 844×390; Reduced Motion, 200% CSS-Reflow und Chromium-Pinch/Page-Zoom,
  Game Over und Startseite. Artefakte unter `/tmp/packet-flight-review` in der
  Cloud; keine erfundenen Produktions-Screenshots.
- Der Service Worker wurde in einem eigenen Browserprofil wirklich aktiviert;
  anschließend offline neu geladen und ein lokaler Run gestartet.
- GitHub-Git-Lesen, Push-Probelauf und Repository-/Pages-API-Zugriff geprüft.

Details und reproduzierbare Befehle: [Tests](../tests/README.md),
[Backend](../cloudflare-worker/README.md).

## Grenzen und spätere Schritte

Physische iOS-/Android-Geräte und andere Browser sind noch nicht geprüft.
200%-Emulation ersetzt nicht jede reale Browserzoom-Implementierung. Das
Canvas-Echtzeitspiel wird nicht als vollständig barrierefrei bezeichnet.
Produktions-Worker, echte Cloudflare-CPU-/Quota-Werte und Online-Einrichtung
sind ungetestet, weil keine Aktivierung genehmigt ist. Ein signierter Starttoken
und Zeitgrenzen beweisen kein ehrliches Spielen; pro Browserprofil ist keine
Personenidentität. D1-Tests laufen isoliert in Miniflare/workerd.

Später separat freigeben: Free-Account/D1/Bindings/Secrets einrichten, Datenschutz
prüfen/ergänzen, deaktivierten Worker deployen und Health/CORS/Quotas prüfen,
danach erst API-Adresse freischalten. Pages-Merge/Veröffentlichung bleibt eine
eigene Freigabe. DNS, IONOS, Proton Mail und das Impressum bleiben unverändert.

## Geänderte Dateien

Bestehend: `README.md`, `index.html`, `script.js`, `style.css`, `sitemap.xml`,
`datenschutz.html`.

Neu: `.gitignore`, `game.html`, `game-sw.js`, `social-preview.png`,
`game/{app,api,audio,config,physics,render,rules,storage}.mjs`, `game/game.css`,
`cloudflare-worker/{.gitignore,README.md,package.json,package-lock.json,wrangler.toml}`,
`cloudflare-worker/src/index.mjs`, `cloudflare-worker/migrations/0001_initial.sql`,
`cloudflare-worker/tests/worker.test.mjs`,
`docs/{packet-flight-review,leaderboard-privacy-draft}.md`,
`tests/{README.md,browser_test.py,site_test.py,game.test.mjs,html-validate.json,requirements.txt}`,
`tools/render-social.py`.
