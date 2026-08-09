# tr1stan.de

Statische private Website für `tr1stan.de`.

Die Seite ist ein persönlicher Tech-, Cyberdeck- und Homelab-Space: kein Framework, kein
Build-Step, kein npm, keine externen Fonts, keine Tracking-Libraries. Ausgeliefert wird direkt
aus dem Repository-Root über GitHub Pages.

**Kein Portfolio, sondern ein privater Systemraum** — Systemintegration, DNS, Mail, Netzwerk,
Homelab und Automation als zusammenhängende Story statt als Standard-Visitenkarte.

---

## Dateistruktur

Alle Dateien liegen bewusst flach im Root. Es gibt **kein** `/pages/`-Verzeichnis.

```text
tr1stan.de/
├── index.html          # Startseite (Hero, HUD-Console, Identity, Stack, Missions, Lab, Kontakt)
├── impressum.html      # Impressum nach § 5 DDG
├── datenschutz.html    # Datenschutzhinweise nach Art. 13 DSGVO
├── 404.html            # GitHub-Pages-Fehlerseite inkl. Legacy-Redirects
├── style.css           # Komplettes Designsystem, Layout, Responsive, Reduced-Motion
├── script.js           # Progressive Enhancement (Nav, Command Deck, Copy, Monitor)
├── favicon.svg         # SVG-Favicon
├── robots.txt          # Crawler-Hinweise
├── sitemap.xml         # Sitemap für tr1stan.de
├── CNAME               # Custom Domain für GitHub Pages (Inhalt: tr1stan.de)
└── README.md           # Diese Datei
```

### Das visuelle Hauptobjekt

Der Blickfang der Startseite ist die **HUD-Console** in `index.html`:

- **Node-Map** als Inline-SVG — Core (`t1`) verbunden mit `MAIL`, `DNS`, `WEB`, `LAB`, `GIT`,
  inklusive animierter Datenflüsse (`stroke-dashoffset`) und rotierendem Radar-Sweep.
- **Frame-Monitor** — ein Canvas, das echte Frame-Zeiten misst und als Wellenform zeichnet.
  Die FPS-Anzeige ist eine reale Messung, keine Deko-Zahl.
- **Gauges** und **Terminal-Readout** für Status und Systemtext.

Ohne JavaScript bleiben Node-Map, Gauges und Terminal vollständig sichtbar; nur die
Wellenform-Animation entfällt.

---

## GitHub Pages Deployment

Empfohlene Einstellungen unter *Settings → Pages*:

```text
Source:        Deploy from a branch
Branch:        main
Folder:        /(root)
Custom domain: tr1stan.de
Enforce HTTPS: aktiv
```

`CNAME` muss im Repository-Root liegen und exakt `tr1stan.de` enthalten. Nach einem Push auf
`main` dauert der Rebuild in der Regel einige Sekunden bis wenige Minuten.

---

## Cache-Busting

GitHub Pages liefert Assets mit Caching aus. Damit Änderungen an CSS und JS sofort ankommen,
werden beide Dateien **versioniert eingebunden**:

```html
<link rel="stylesheet" href="style.css?v=8" />
<script src="script.js?v=8" defer></script>
```

Aktueller Stand: **`v=8`** in `index.html`, `impressum.html`, `datenschutz.html` und `404.html`
(zusätzlich `favicon.svg?v=8`).

> **Wichtig:** Nach jeder Änderung an `style.css` oder `script.js` die Versionsnummer in **allen
> HTML-Dateien gleichzeitig** erhöhen (`?v=9`, `?v=10`, …). Sonst sehen Besucher mit gefülltem
> Cache eine Mischung aus altem und neuem Stand — genau das führt zu „kaputt“ wirkenden Seiten.

---

## Legal-Seiten

Die Rechtstexte liegen im Root und sind unter diesen URLs erreichbar:

- <https://tr1stan.de/impressum.html>
- <https://tr1stan.de/datenschutz.html>

Es wird **nicht** auf `/pages/impressum.html` oder `/pages/datenschutz.html` verlinkt. Sollten
solche alten Adressen noch irgendwo kursieren, fängt `404.html` sie ab und leitet per
`location.replace()` auf den korrekten Root-Pfad um (ebenso `/impressum`, `/datenschutz`,
`/imprint`, `/privacy`).

### ⚠️ Inhalte nicht blind überschreiben

`impressum.html` und `datenschutz.html` enthalten **echte, gepflegte Angaben** (Name, Anschrift,
E-Mail, Stand-Datum).

- Diese Werte dürfen **nicht gelöscht** und **nicht durch Platzhalter ersetzt** werden.
- Vor jeder Änderung an den Legal-Seiten zuerst den vorhandenen Inhalt lesen.
- Es dürfen **keine personenbezogenen Daten erfunden** werden.
- Falls irgendwo Platzhalter stehen, dürfen diese bleiben — sie sind kein Freibrief, echte
  Werte zu entfernen.
- Design, Layout, Pfade und technische Darstellung dürfen jederzeit verbessert werden.

### Rechtlicher Rahmen

- Impressum nach **§ 5 DDG** (Digitale-Dienste-Gesetz, nicht mehr das alte TMG).
- Datenschutzhinweise nach **Art. 13 DSGVO**.
- Die Website ist statisch: kein Tracking, keine Cookies, kein Kontaktformular, kein Newsletter.
- Hosting über GitHub Pages, Kontakt ausschließlich per E-Mail an `chef@tr1stan.de`.
- **Kein Cookie-Banner**, solange keine einwilligungspflichtigen Cookies, Tracker oder
  Analytics eingesetzt werden. Wird später etwas davon eingebunden, müssen Datenschutzhinweise
  **und** Einwilligungslösung nachgezogen werden.
- Bewusst wird **keine** Aussage wie „100 % DSGVO-konform“ getroffen. Der Text beschreibt nur,
  was die Seite tatsächlich tut.

---

## Proton / DNS-Hinweis

- Website-Domain: `tr1stan.de`
- GitHub Pages: `CNAME` im Repo bleibt unverändert `tr1stan.de`
- **Mail läuft über Proton und wird nicht über dieses Repository konfiguriert.**

Die DNS-Records für Mail (MX, SPF, DKIM, DMARC, Proton-Verification) liegen beim
DNS-Provider und haben **nichts** mit den Dateien in diesem Repo zu tun. Änderungen am
Website-Code dürfen DNS-, Proton- oder Mail-Einstellungen niemals anfassen.

---

## Texte und Farben ändern

### Texte

| Was | Datei |
| --- | --- |
| Hero, Identity, Stack, Missions, Lab, Kontakt | `index.html` |
| Impressum | `impressum.html` |
| Datenschutz | `datenschutz.html` |
| Fehlerseite | `404.html` |

Kontaktadresse überall: `chef@tr1stan.de`. Wird sie geändert, auch die `data-copy`-Attribute
der Copy-Buttons anpassen.

### Farben

Alle Farben stehen als Custom Properties am Anfang von `style.css` in `:root`:

```css
--bg:     #04060b;   /* Grundfläche */
--ink:    #eaf2ff;   /* Textfarbe */
--muted:  #94a6be;   /* Fließtext */
--cyan:   #22e5ff;   /* Hauptakzent */
--mint:   #63ffd0;   /* Sekundärakzent */
--violet: #a07dff;   /* Tertiärakzent */
--amber:  #ffc861;   /* Warnung / "later" */
--ok:     #45f5a0;   /* Status ok */
```

Ein Wert an einer Stelle geändert wirkt auf die gesamte Seite — Buttons, Node-Map, Gauges,
Statuschips und Legal-Seiten greifen alle auf dieselben Tokens zu.

### Typografie und Abstände

Schriftgrößen nutzen `clamp()`, damit Headlines auf keinem Gerät abgeschnitten werden:

```css
--d1: clamp(2.15rem, 8.6vw, 7rem);   /* Hero */
--d2: clamp(1.75rem, 5vw, 3.7rem);   /* Sektionen */
--shell: 1240px;                      /* maximale Inhaltsbreite */
--gutter: clamp(16px, 4vw, 40px);     /* Seitenabstand */
```

---

## JavaScript

`script.js` ist reines Progressive Enhancement. **Ohne JavaScript bleibt die Website vollständig
lesbar und navigierbar.**

Das Skript setzt als Erstes die Klasse `ready` auf `<html>`. Erst diese Klasse aktiviert
Scroll-Reveal, die eingeklappte Mobile-Navigation und alle `js-only`-Buttons. Lädt `script.js`
nicht, bleibt die Navigation ausgeklappt und sichtbar, statt unbedienbar zu werden.

Mit aktivem JavaScript zusätzlich verfügbar:

- Mobile-Navigation (Hamburger, schließt bei Klick daneben und bei `Esc`)
- **Command Deck** über `Ctrl + K` / `Cmd + K` — mit Textfilter, `↑`/`↓`-Auswahl und `Enter`
- **Copy-Mail-Buttons** für `chef@tr1stan.de` (Clipboard-API mit Fallback, Statusmeldung über
  eine `aria-live`-Region)
- Scroll-Fortschrittsbalken und aktive Sektionsmarkierung
- Frame-Monitor im Canvas
- Scroll-Reveal beim Hereinscrollen

`prefers-reduced-motion: reduce` wird in CSS **und** JS berücksichtigt: Animationen werden
gestoppt, Radar-Sweep und Scan-Band ausgeblendet, der Monitor zeigt eine statische Kurve.

---

## Technische Regeln für dieses Repo

- Plain HTML, CSS, JavaScript — kein React, Astro, Tailwind, Vite, npm, kein Build-Step.
- Keine externen Libraries, keine externen Fonts, keine externen Requests.
- Alle Dateien bleiben im Root, GitHub-Pages-kompatibel.
- Valides HTML, sauberes CSS, sauberes JavaScript.
- Kein horizontales Scrollen, keine abgeschnittenen Headlines, Touch-Ziele ausreichend groß.
- `CNAME` bleibt `tr1stan.de`. DNS-, Proton- und Mail-Records werden hier nicht verwaltet.
