# tr1stan.de

Statische private Website fuer `tr1stan.de`.

Die Seite ist als persoenlicher Tech-, Cyberdeck- und Homelab-Space gebaut: kein Framework, kein Build-Step, keine externen Fonts, keine Tracking-Libraries. Hosting laeuft ueber GitHub Pages direkt aus dem Repository-Root.

## Dateien

```text
tr1stan.de/
├── index.html          # Startseite
├── style.css           # Komplettes Design und responsive Layout
├── script.js           # Progressive Interaktionen
├── impressum.html      # Impressum mit Platzhaltern
├── datenschutz.html    # Datenschutzhinweise mit Platzhaltern
├── 404.html            # GitHub-Pages-Fehlerseite
├── favicon.svg         # SVG-Favicon
├── robots.txt          # Crawler-Hinweise
├── sitemap.xml         # Sitemap fuer tr1stan.de
├── CNAME               # Custom Domain fuer GitHub Pages
└── README.md           # Projektdoku
```

## Deployment ueber GitHub Pages

Empfohlene GitHub-Pages-Einstellungen:

```text
Source: Deploy from a branch
Branch: main
Folder: /(root)
Custom domain: tr1stan.de
Enforce HTTPS: aktiv
```

`CNAME` muss im Repository-Root liegen und exakt `tr1stan.de` enthalten. Die Mail-Konfiguration bleibt davon getrennt und laeuft weiter ueber Proton.

## Texte bearbeiten

- Startseiten-Inhalte: `index.html`
- Impressum: `impressum.html`
- Datenschutz: `datenschutz.html`
- 404-Seite: `404.html`

Wichtige Kontaktadresse: `chef@tr1stan.de`.

## Farben und Design anpassen

Die zentralen Farben stehen am Anfang von `style.css` in `:root`:

```css
--bg: #05070d;
--cyan: #00e5ff;
--mint: #6fffd2;
--violet: #9b7cff;
--amber: #ffd166;
```

Layout, Mobile-Regeln, Animationen und Legal-Seiten-Stile liegen ebenfalls in `style.css`.

## JavaScript

`script.js` ist optional-progressiv. Der Grundinhalt bleibt sichtbar, wenn JavaScript deaktiviert ist. Mit JavaScript aktiv sind zusaetzlich verfuegbar:

- Mobile Navigation
- Command Deck per `Ctrl + K` beziehungsweise `Cmd + K`
- Mail-Adresse kopieren
- Scroll-Reveal
- dezentes Canvas-System im Hintergrund
- aktive Navigationspunkte

`prefers-reduced-motion` wird beruecksichtigt.

## Rechtliches

`impressum.html` und `datenschutz.html` enthalten klare Platzhalter:

```text
[VORNAME NACHNAME EINTRAGEN]
[STRAẞE UND HAUSNUMMER EINTRAGEN]
[PLZ UND ORT EINTRAGEN]
[DATUM EINTRAGEN]
```

Diese Angaben vor produktiver Nutzung pruefen und ergaenzen. Die Datenschutzhinweise sind auf eine statische Website ohne Tracking, ohne Cookies und ohne Kontaktformular ausgelegt.

## DNS-Hinweis

- Website-Domain: `tr1stan.de`
- GitHub Pages: `CNAME` im Repo bleibt `tr1stan.de`
- Mail bleibt bei Proton und wird nicht ueber dieses Repo konfiguriert
