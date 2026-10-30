# Hauptseite: Landschaft, Terminal, Projects und Log

**Designentwurf zur Review. Nicht gemergt, nicht auf Pages veröffentlicht.**
Ausgangspunkt: main am 30.10.2026 frisch gelesen als
`5cb45b8fbe18ed9fee6d538c8929d04b03fa89b5`.
Arbeitsbranch: `codex/network-landscape-draft` im bestehenden Repository.
Die vorhandene Live-Seite wurde vor Änderungen im Cloud-Chromium angesehen;
HTML-Bytes entsprachen diesem Git-Stand. HTTPS-Transport dabei über Python mit
CA-Prüfung; keine Änderung am Chromium-Vertrauen, keine TLS-Abschaltung.
Keine produktiven Worker-Aufrufe, Scoreeinträge, Migrationen oder Deployments.

## Gestaltung

Die vorhandene Sonne, Berglandschaft, das Raster, Chrome-Schriftbild und die
Inter/JetBrains-Typografie bleiben erkennbar. Der Name ist deutlich größer,
die Sonne nach rechts versetzt. Freie Flächen und asymmetrische Gewichtung
verbinden die Landschaft mit dem darunterliegenden Terminal. Seine obere Kante
ist auf den geprüften normalen Displays bereits im ersten Bildschirm sichtbar;
auf sehr kurzem Querformat bleibt natürliches Scrollen wichtiger als Vollbild.

Nur das Terminal bleibt ein umrandeter Kasten. Projekte sind ein großer
redaktioneller Beitrag mit echtem Bildausschnitt, das Log eine lesbare Zeitfolge.
Persönliche Originaltexte sind als native, aufklappbare Notizen zugänglich.
Keine Projekt-Platzhalter, generischen Icon-Karten, Skill-Balken, Glitch-Schleifen,
Besucherzahlen oder erfundenen Systemzustände. Kein neuer Arcade-Hero-Button.

Dünne Routenlinien, kleine Knoten und CSS-gezeichnete Pfeile bilden ein Motiv.
Ein gewählter Weg leuchtet kurz auf, der Zielabschnitt erhält sofort Fokus und
eine verständliche Rückmeldung. Die Navigation selbst nutzt normale HTML-Links
und Buttons. Reduced Motion zeigt Inhalte direkt; WebGL ist nie Voraussetzung.

## Benutzung und Inhalte

- `projects` → `/#projects`: Übersicht des belegten Projekts.
- `projects packet-flight` → `/#project-packet-flight`: eigene Detailansicht.
- `log` → `/#log`: zeitlich belegte Entwicklungsnotizen.
- Übersicht/Details sind unterscheidbar, mit Rückweg, kopierbaren Ankern,
  direktem Einstieg, Reload und Browser-Zurück/Vorwärts.
- `help`, Tab-Vervollständigung, `ls` und `cat` kennen die neuen Wege.
  `cat projects` / `cat log` zeigen kurze Links, statt lange Inhalte zu kopieren.
  `all` gibt die fünf persönlichen Themen plus kurze Verweise auf Projects/Log
  aus. Es vervielfacht keine Projektdetails.
- Alle alten Befehle bleiben, einschließlich History im RAM, Strg+L, sicherer
  unbekannter Eingaben, Mail-/GitHub-Kontakt, Kopieren und der drei sofort
  navigierenden Arcade-Chips. Tab/Shift+Tab verlassen das Eingabefeld.
- Initial kein Eingabefokus; Chip-Taps öffnen keine Bildschirmtastatur.
  Neue Ausgabe zieht beim Lesen alter Terminalzeilen nicht nach unten;
  „Neue Ausgabe anzeigen“ bietet den bewussten Sprung an.

Projekttexte stehen einmal redaktionell in semantischem HTML in index.html,
nicht zusätzlich in einer JS-Datenquelle. Die Detailbeschreibung nennt Idee,
pf-3-Streckenvariation, Normal/Daily, freiwillige Rangliste, getrennten Worker/D1
und statisches Pages-Frontend. Codex-Unterstützung wird ausdrücklich genannt.
Das Bild ist ein echter Frame bei 21 s aus der bestehenden, gekennzeichneten
pf-3-Eingabeautomation; der originale 49,4 s-Clip ist auf bewusste Wiedergabe
mit nativen Controls eingebunden. Kein Autoplay, preload=none, kein Fake-Score.
Route verlassen oder Tab verbergen pausiert das Video; keine automatische
Wiederaufnahme.

### Belege für die Log-Daten

| Datum | Besuchertext | Öffentlicher Beleg |
| --- | --- | --- |
|28.10.2026|pf-3 mit abwechslungsreicherer Strecke und separater Wertung|[PR17](https://github.com/tr1stannnnnn/tr1stan.de/pull/17), docs/PF3-RELEASE.md|
|27.10.2026|Normal/Allzeit, Daily/Heute, gemeinsame Anzeige-Resets|[PR15](https://github.com/tr1stannnnnn/tr1stan.de/pull/15), docs/PF2-UX-2026-10-27.md|
|27.10.2026|Expliziter Online-/Lokalstart|[PR14](https://github.com/tr1stannnnnn/tr1stan.de/pull/14), docs/PF2-START-FLOW-2026-10-27.md|
|27.10.2026|Öffentliche Rangliste aktiv|[PR12](https://github.com/tr1stannnnnn/tr1stan.de/pull/12), tatsächliches Releaseprotokoll vom27.10.|
|11.10.2026|Einführung des Browser-Spiels|[PR2](https://github.com/tr1stannnnnn/tr1stan.de/pull/2), Git-Mergezeitpunkt|

Mehrere Änderungen am selben Tag sind in ihrer belegten Reihenfolge sortiert.
Besucher bekommen keine Commitlisten, Deployment-IDs oder Testprotokolle.
Es wurden keine privaten Projekt- oder Arbeitgeberinformationen ergänzt.
Weitere Projektinformationen sind für diesen Entwurf nicht erforderlich.

## Technische Abgrenzung und Fallback

`home.css` und `home.js` werden nur von index.html geladen. Die bisher gemeinsam
verwendeten style.css und script.js bleiben bytegleich. Dadurch bleiben auch
die vorhandenen Offline-Spiel-Caches und alle Rechtstext-/404-Seiten gültig.
Die Homepage-Verhaltensdatei übernimmt bewährte Terminal-/Kontaktlogik und
entwickelt sie hier weiter; sie ersetzt keine Dateien im pf-3-Spiel.

scene3d.js erhält eine optionale `composition: landscape`: auf den Canvas
abgestimmtes Seitenverhältnis, versetzte/höhere Sonne. Ohne diese Option bleibt
die alte Bildkomposition erhalten. Niedrige Qualität bevorzugt geringen Strom.
Save-Data oder erkannte kleine RAM-/CPU-Ausstattung nutzen direkt die CSS-Szene.
Bei Kontext-/Modulausfall wird vollständig auf CSS zurückgefallen. Die
Zwischenebene des CSS-Rasters erhält preserve-3d, damit seine Perspektive auch
im Fallback erhalten bleibt. Verborgene Tabs pausieren Renderer, CSS-Effekte,
Terminal-Tippausgabe und Video; unterhalb des Hero stoppt der Canvas per Observer.

Keine neuen Speicherzugriffe, Cookies, Tracker, CDN-Fonts, Frameworks oder
Besucher-Builds. Die Terminal-History bleibt im RAM. Projektfilm preload=none;
keine dauerhaften Hintergrundanfragen. Neue Home-Assets tragen landscape-1.
Die bestehende Social-Grafik fürs Spiel bleibt unverändert; die Homepage nutzt
einen eigenen1200 × 630-Render mit passenden Metadaten. Canonical bleibt `/`;
Hash-Ansichten werden nicht als eigene Sitemap-URLs ausgegeben. lastmod-Daten
folgen den belegten Dateiänderungen. CNAME/DNS/Mail/Secrets/Build-Einstellungen
bleiben unverändert. Historische Releaseberichte wurden nicht überschrieben.

58 geschützte Dateien, darunter Spiel/Archiv/Worker/SQL/Config, gemeinsames CSS/JS,
Rechtstexte,404,CNAME,robots,alte Social-Grafik und Releaseberichte, werden gegen
Baseline-SHA256 geprüft. Kein Spiel-, Punkte-, Token-, Datenbank- oder Tarifwechsel.

## Vorschau und Aufnahmen

Diese verbundene Cloud-Umgebung stellt keine teilbare HTTP-Vorschau-URL oder
Portfreigabe bereit. Dafür wurde kein zusätzlicher Dienst eingerichtet und
keine Produktionskonfiguration geändert. Der vollständige statische Code,
17 gerenderte Ansichten,2 echte Vorheraufnahmen und der Interaktionsfilm liegen
auf diesem Reviewbranch und sind direkt über GitHub überprüfbar.

- [Desktop1440](home-design-2026-10-30/home-desktop-1440.png)
- [Desktop1280](home-design-2026-10-30/home-desktop-1280.png)
- [Handy390](home-design-2026-10-30/home-mobile-390.png) /
  [320](home-design-2026-10-30/home-mobile-320.png) /
  [430](home-design-2026-10-30/home-mobile-430.png)
- [Projektübersicht](home-design-2026-10-30/projects-desktop.png) /
  [mobil](home-design-2026-10-30/projects-mobile-390.png)
- [Projektdetails](home-design-2026-10-30/project-detail-desktop.png) /
  [mobil](home-design-2026-10-30/project-detail-mobile-390.png)
- [Log](home-design-2026-10-30/log-desktop.png) /
  [mobil](home-design-2026-10-30/log-mobile-390.png)
- [CSS/WebGL-Fallback](home-design-2026-10-30/home-css-fallback.png) /
  [ohne JavaScript](home-design-2026-10-30/projects-no-js-390.png)
- [Tablet](home-design-2026-10-30/home-tablet-768.png) /
  [Querformat](home-design-2026-10-30/home-landscape-844.png) /
  [200%CSS-Zoom](home-design-2026-10-30/home-zoom200.png)
- [Interaktionsaufnahme im Browser (GIF)](home-design-2026-10-30/interactions.gif) /
  [MP4 in voller Auflösung](home-design-2026-10-30/interactions.mp4)

GitHub liefert Repository-MP4s als application/octet-stream aus. Deshalb liegt
zusätzlich eine einmal ablaufende GIF-Vorschau(800px/6fps) derselben Aufnahme
für die direkte Browser-Review bei; keine private Installation nötig.

Die Aufnahme zeigt reale Cloud-Browserbedienung in echter Zeit: Terminalchip,
Übersicht/Details, native Videowiedergabe, Rückweg/Log, Browser-Zurück und
Tab-Vervollständigung. Sie ist als automatisierter, unveröffentlichter Entwurf
gekennzeichnet; kein simuliertes UI-Bild als funktionierende Anwendung ausgegeben.
`tools/capture-home-draft.py --video` reproduziert diese Aufnahmen ausschließlich
am Cloud-Loopbackserver, mit vorhandenen Playwright/Chromium/FFmpeg-Werkzeugen.
Das ist kein neuer Website-Build und verlangt keine lokale Installation.

## Prüfung

Der vollständige Python-Lauf hat **78/78 Fälle** bestanden:63 bestehende und
15 neue Home-Fälle. Dazu **38/38 bestehende Node-Spiel-/Speicherfälle**. Das sind
116 verschiedene automatisierte Fälle; Wiederholungen werden nicht addiert.
Nach der letzten semantischen Bereinigung wurden die 15 Home-Fälle und die zwei
gezielten bestehenden Terminalfälle nochmals geprüft. Sechs HTML-Dokumente,
Node-Syntax, Sitemap/interne Links und git diff --check sind erfolgreich.

Die bisherigen Suiten decken Spiel/Archiv, Normal/Daily, Score-/Dialogzustände,
Speicherwahl und echte Offline-Upgrades, Touch/Tastatur, Rechtstexte/404 sowie
zwei echte Browser↔workerd/Test-D1-Eintragungen samt Readback ab. Alle Daten
bleiben isoliert; keine Produktionsanfrage oder öffentliche Testeintragung.
Die 27 Backend-Unitfälle und der lange pf-3-Seed-Sweep wurden für diesen reinen
Home-Entwurf nicht neu ausgeführt; deren Quellbereiche sind bytegleich geschützt.

Die15 neuen Fälle prüfen Projektrouten/Deep-Links/History/Fokus, alle alten und
neuen Befehle, all/cat-Semantik, Tab und Fokusausstieg, sichere unbekannte Texte,
Touch-Chips/Arcadeziele, ungestörtes Lesen alter Ausgabe, Copy, fehlendes JS,
Semantik, fehlende Persistenz/Requests, acht Viewport-Kombinationen plus 200%,
Reduced Motion, Kontext-/Modulausfall/Save-Data/geringe Hardware-Ausstattung
und echte Renderer-Pause/Resume bei Sichtbarkeitswechsel und außerhalb des Hero.
Der Sichtbarkeitszustand wird im isolierten Test simuliert; Renderaufrufe werden
nur beobachtet. Der Offscreen-Test wartet auf den tatsächlichen Pause-Callback,
statt eine feste Zustellzeit des IntersectionObservers zu unterstellen.

Die Screenshots wurden tatsächlich angesehen. Erkannte Fehler wurden behoben:
Skip-Fokus, Zoom-Reflow, zu kleine Log-Touchfläche, Schrift-Subset-Pfeile,
CSS-Rasterperspektive, Headerkontrast und doppelte persönliche Überschriften.
Der Film hat 33,56 s, echte Tastatur-/Pointerereignisse, keine virtuellen Uhren,
keine fingierten UI-Zustände und keine fremden Netzwerkzugriffe.

[Capture-Nachweis](home-design-2026-10-30/capture-evidence.json),
[Quell-/Medienhashes](home-design-2026-10-30/source-and-media-hashes.json),
[Testzusammenfassung](home-design-2026-10-30/test-evidence.json).
Rohprotokolle verbleiben in /workspace/home-design-evidence im Cloud-Workspace.

Grenzen: Cloud-Chromium mit emuliertem Touch und Software-WebGL. Keine physischen
Geräte, Safari, echte schwache Hardware oder tatsächliche Screenreader-Sitzung.
200% wird über CSS-Reflow und die bestehende Chromium-PageScale-Prüfung getestet;
das zertifiziert nicht jede Browser-/OS-Zoomumsetzung. Kein Lighthouse-/Peak-FPS-
Versprechen. Keine neue produktive CPU-/Quota-Prüfung, weil Backend unverändert
und dieser Auftrag ausdrücklich keine Veröffentlichung erlaubt.
