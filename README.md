# tr1stan.de

Statische private Website für `tr1stan.de` — eine kurze persönliche Seite im
Synthwave-Stil. Kein Framework, kein Build-Step, kein npm, keine externen Requests.

---

## Gestaltung

Schwarz und Violett, Nachthimmel mit gestreifter Sonne. Die gesamte Szene ist aus
Verläufen und einem Inline-SVG gebaut — **keine einzige Bilddatei**.

### Palette

Alle Farben liegen als CSS Custom Properties am Anfang von `style.css`. Andere
Farbfamilien kommen nicht vor, kein Cyan, kein Grün, kein Orange.

| Rolle | Token | Wert |
|---|---|---|
| Himmel oben / Seitengrund | `--sky-top` | `#06020C` |
| Himmel Mitte | `--sky-mid` | `#160628` |
| Himmel Horizont | `--sky-horizon` | `#2F0B46` |
| Boden unter dem Horizont | `--ground` | `#0B0316` |
| Neon Raster | `--neon-grid` | `#E879F9` |
| Neon Bergkante | `--neon-ridge` | `#C084FC` |
| Horizontlinie | `--horizon-line` | `#FBE4FF` |
| Sonne oben / Mitte / unten | `--sun-top/-mid/-bottom` | `#FEF3C7` `#FDA4D3` `#C026D3` |
| Text primär / sekundär | `--text-1` / `--text-2` | `#FFFFFF` `#F3ECFA` |
| Mono-Labels | `--label` | `#F5D0FE` |

### Die Szene

Sie liegt **fixiert hinter der ganzen Seite**: beim Scrollen bleibt sie stehen,
der Inhalt läuft darüber. Ab Hero-Ende legt sich eine mitscrollende
Verlaufsfläche darüber, die die Szene nach unten hin ruhiger macht. Jeder
Inhaltsblock steht zusätzlich auf einer eigenen halbtransparenten Fläche mit
feiner Neonlinie.

Auf Mobilgeräten ist die Szene **nicht** fixiert — dort ist das Verhalten
unzuverlässig und flackert. Sie ist am obersten Screenful verankert, darunter
läuft die Seite auf ruhigem dunklem Grund.

- **Himmel** als vierstufiger Verlauf, harter Schnitt zum Boden am Horizont.
- **Sterne**: dreizehn Punkte, jeder mit eigener Funkeldauer.
- **Sonne** sitzt auf dem Horizont und **hinter den Bergen**. Die Streifen der
  unteren Hälfte sind mit einer CSS-Maske ausgeschnitten; zusätzlich beschneidet
  der runde Container mit `overflow: hidden` die Scheibe, damit die Streifen
  nie über den Kreis hinauslaufen können. Der Schein kommt aus einem weichen
  radialen Halo plus `drop-shadow` — kein harter Ring, kein Rechteckrand.
- **Berge** als Inline-SVG mit `preserveAspectRatio="none"`, dunkle Silhouette in
  Bodenfarbe, obere Kante als Neonlinie. Der Strich nutzt
  `vector-effect="non-scaling-stroke"`, sonst würde ihn die Streckung verzerren.
- **Horizontlinie** mit Schein nach oben und unten.
- **Raster** über `perspective` und `rotateX`, Linien als
  `repeating-linear-gradient`, Bewegung über `transform` — eine Rasterzelle pro
  Durchlauf, dadurch nahtlos und ohne Neuzeichnen.

### Lesbarkeit hat Vorrang

Der Hero-Text steht immer **unterhalb** der Sonne; der Horizont steigt auf kurzen
Viewports selbst an, damit der Name nie in die Sonne wandert. Hinter dem Text
liegt ein weich auslaufendes dunkles Band — kein Textschatten. Gemessen gegen die
tatsächlich gerenderten Pixel erreicht der Fließtext dort 17:1.

### Abschnitte

Jeder Block nutzt ein eigenes Muster: Überschrift links neben dem Text,
breiter Block mit groß gesetzter erster Zeile, nummerierte Positionen mit
Neon-Ziffern, zentrierte Aussage, drei Begriffe nebeneinander. Dazwischen
dünne Neon-Trennlinien, die sich beim Sichtbarwerden von links aufziehen.

### Bewegung

Sterne funkeln, der Halo atmet über 11 s, das Raster läuft eine Rasterzeile in
2,5 s. Alles pausiert bei `document.hidden`. Auf schmalen Viewports läuft das
Raster mit 7 s deutlich langsamer. Bei `prefers-reduced-motion` steht die Szene
vollständig still, bleibt aber sichtbar. Ohne JavaScript ist sie ebenfalls da.

---

## Dateistruktur

```text
tr1stan.de/
├── index.html          # Hero mit Szene, fünf Textabschnitte, Kontakt
├── impressum.html      # Impressum nach § 5 DDG
├── datenschutz.html    # Datenschutzhinweise nach Art. 13 DSGVO
├── 404.html            # Fehlerseite inkl. Legacy-Redirects
├── style.css           # Tokens, Base, Layout, Szene, Komponenten, Utilities
├── script.js           # Jahr, Copy, mobiles Menü, Reveal, Pause bei hidden
├── fonts/              # selbst gehostete Variable Fonts inkl. Lizenzen
├── favicon.svg         # Sonne über dem Horizont
├── robots.txt
├── sitemap.xml
├── CNAME
└── README.md
```

## Schriften

Inter Variable und JetBrains Mono Variable, beide SIL OFL 1.1, selbst gehostet in
`fonts/`, `latin`-Subset mit Gewichtsachse. Der Zeichenvorrat kennt `→` (U+2192)
nicht — dieses Zeichen im Inhalt vermeiden.

## Barrierefreiheit

Sichtbarer Fokusring, genau eine `h1` pro Seite, keine übersprungenen
Überschriftenebenen, Skip-Link als erstes Tab-Ziel, Tap-Ziele mindestens
44 × 44 px, nichts hängt an Hover. Die Szene ist `aria-hidden` und nimmt keine
Pointer-Events.

## Lokal ansehen

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Deploy

GitHub Pages liefert `main` aus dem Repository-Root aus. Kein Actions-Workflow,
kein Build-Schritt: Push auf `main` genügt.
