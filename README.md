# tr1stan.de

Statische private Website für `tr1stan.de` — eine kurze persönliche Visitenkarte.
Kein Framework, kein Build-Step, kein npm, keine externen Requests.

---

## Gestaltung

Streng monochrom. Es gibt **keine** Akzentfarbe: Hierarchie entsteht nur über
Schriftgröße, Gewicht und Strichstärke.

- Grund `#0A0A0A`, Text `#ECEAE6`, dazwischen abgestufte Graustufen.
- Alle Farben liegen als acht CSS Custom Properties am Anfang von `style.css`.
  Direkt darunter steht ein heller Satz derselben acht Werte — einmal
  hineinkopiert und das Schema ist umgedreht, ohne eine weitere Zeile zu ändern.
- Feines Korn als Textur, erzeugt von einem Inline-SVG-Turbulenzfilter. Keine
  Bilddatei, kein Request.
- Registermarke: ein Plus aus zwei Haarlinien, wie eine Passmarke in einer
  technischen Zeichnung. Es dient als Logo und sitzt an zwei Rasterpunkten.
  Bewusst leise gehalten. Das Favicon zeigt dieselbe Marke.

### Bewegung

- **Hintergrund:** zwei sehr große, sehr blasse Lichtflächen driften langsam
  aneinander vorbei (104 s und 137 s). Reines CSS, nur composited Transforms.
  Pausiert bei `document.hidden`, auf schmalen Viewports abgeschaltet, bei
  `prefers-reduced-motion` vollständig statisch.
- **Cursor:** ein Fadenkreuz folgt exakt, ein Ring läuft mit leichter
  Verzögerung nach und wächst über Links und Buttons. Nur bei `hover: hover`
  und `pointer: fine`; auf Touch und bei reduzierter Bewegung bleibt der native
  Zeiger. Läuft das Skript nicht, wird der native Zeiger nie versteckt.

---

## Dateistruktur

Alle Dateien liegen flach im Root.

```text
tr1stan.de/
├── index.html          # Visitenkarte: Name, Über mich, Basteleien, Kontakt
├── impressum.html      # Impressum nach § 5 DDG
├── datenschutz.html    # Datenschutzhinweise nach Art. 13 DSGVO
├── 404.html            # Fehlerseite inkl. Legacy-Redirects
├── style.css           # Tokens, Base, Layout, Komponenten, Ambient, Utilities
├── script.js           # Jahr, Copy, mobiles Menü, Reveal, Cursor
├── fonts/              # selbst gehostete Variable Fonts inkl. Lizenzen
├── favicon.svg         # Registermarke
├── robots.txt
├── sitemap.xml
├── CNAME
└── README.md
```

## Schriften

| Schrift | Verwendung | Lizenz |
|---|---|---|
| Inter Variable | Fließtext und Überschriften | SIL OFL 1.1 |
| JetBrains Mono Variable | Labels und Kleinteile | SIL OFL 1.1 |

Beide selbst gehostet in `fonts/`, `latin`-Subset mit Gewichtsachse, eingebunden
per `@font-face` mit `font-display: swap` und `preload`. Lizenztexte liegen daneben.

> Der Zeichenvorrat deckt Umlaute, `ß` und typografische Anführungszeichen ab,
> aber **nicht** `→` (U+2192). Dieses Zeichen im Inhalt vermeiden.

## Barrierefreiheit

Sichtbarer Fokusring, genau eine `h1` pro Seite, keine übersprungenen
Überschriftenebenen, vollständige Tastaturbedienung mit Skip-Link als erstes
Tab-Ziel, alle Textfarben mindestens WCAG AA.

## Lokal ansehen

Die Pfade sind root-relativ, ein Doppelklick auf die Datei reicht deshalb nicht:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Deploy

GitHub Pages liefert `main` aus dem Repository-Root aus. Kein Actions-Workflow,
kein Build-Schritt: Push auf `main` genügt.
