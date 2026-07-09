# tr1stan.de — Website V2

Private Tech-Seite für **tr1stan.de**.

![Status](https://img.shields.io/badge/status-live-00e5ff?style=for-the-badge)
![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-8b5cf6?style=for-the-badge)
![Mail](https://img.shields.io/badge/mail-Proton-7cf7d4?style=for-the-badge)

## Was ist das?

Eine statische Onepage mit Dark-Tech-Design für:

- private Tech-Identität
- Domain-/Mail-Setup
- Projekte
- Homelab-Ideen
- spätere Setup-Notes
- Kontakt über `chef@tr1stan.de`

## Dateien

Alle Dateien liegen bewusst direkt im Repo-Root, damit GitHub Upload ohne Ordnerprobleme funktioniert.

```text
tr1stan.de/
├── index.html
├── style.css
├── script.js
├── impressum.html
├── datenschutz.html
├── 404.html
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── CNAME
└── README.md
```

## Live-URL

```text
https://tr1stan.de
```

## Hosting

Die Seite läuft über **GitHub Pages**.

GitHub Pages Settings:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
Custom domain: tr1stan.de
Enforce HTTPS: aktiv
```

## DNS grob

Website:

```text
A      @      185.199.108.153
A      @      185.199.109.153
A      @      185.199.110.153
A      @      185.199.111.153
CNAME  www    <github-username>.github.io
```

Mail bleibt bei Proton:

```text
MX
SPF
DKIM
DMARC
protonmail-verification
```

## Design

V2 nutzt:

- Dark background
- Cyan/Violet Aurora
- Bento-Grid
- Terminal-Komponente
- animierte Reveal-Effekte
- Hover-Glow pro Card
- Mobile Navigation
- Copy-Mail Button
- 404 Redirect für alte `/pages/...` Links

## Bearbeiten

Inhalt in `index.html` ändern.

Farben/Design in `style.css` ändern:

```css
:root {
  --cyan: #00e5ff;
  --violet: #8b5cf6;
  --mint: #7cf7d4;
}
```

Interaktionen in `script.js` ändern.

## Upload

Bei GitHub:

```text
Add file → Upload files
```

Dann alle Dateien aus dieser ZIP direkt ins Repo hochladen und committen.

Wichtig: Dateien direkt ins Root hochladen, nicht den ZIP-Ordner als Unterordner.

## Rechtliches

`impressum.html` ist aktuell ein Platzhalter. Sobald die Seite als Portfolio, Dienstleistungsseite oder geschäftlich genutzt wird, muss das Impressum sauber ergänzt werden.

`datenschutz.html` ist minimal gehalten, weil die Seite aktuell statisch ist und kein Tracking/Kontaktformular nutzt.
