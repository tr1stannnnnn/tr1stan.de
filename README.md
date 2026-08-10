# tr1stan.de

Statische private Website für `tr1stan.de` — eine kurze persönliche Visitenkarte.
Kein Framework, kein Build-Step, kein npm, keine externen Requests.

---

## Gestaltung

Streng monochrom. Es gibt **keine** Akzentfarbe: Hierarchie entsteht ausschließlich
über Helligkeit, Schriftgröße, Gewicht und Strichstärke.

### Die Tonleiter

Fünf Stufen eines warmen Neutraltons, gemessen gegen den Grund `#0A0A0A`:

| Stufe | Token | Kontrast | Verwendung |
|---|---|---|---|
| 1 | `--c-ink` | 18,2:1 | Headlines, Aussagen |
| 2 | `--c-ink-2` | 11,6:1 | Fließtext und Listen |
| 3 | `--c-ink-3` | 6,1:1 | Mono-Labels, Zeichnungsbeschriftung |
| 4 | `--c-line-2` | 1,7:1 | sichtbare Regeln, Passmarken |
| 5 | `--c-line` | 1,2:1 | feinste Haarlinien |

Jede Textstufe liegt mindestens Faktor 1,5 von der nächsten entfernt, damit die
Ebenen ohne Farbe unterscheidbar bleiben. Alle neun Farbwerte stehen am Anfang
von `style.css`; direkt darunter liegt derselbe Satz in hell — einmal
hineinkopiert und das Schema ist umgedreht.

### Die Kreuz-Zeichnung

Der Blickfang im Hero ist eine technische Konstruktionszeichnung als Inline-SVG:
ein gleichschenkliges Kreuz, nur aus Konturen, dazu Strichpunkt-Mittelachsen,
zwei bemaßte Kanten mit Pfeilenden, Konstruktionskreis und Diagonalen als
Hilfslinien sowie Passmarken an den Eckpunkten der Bounding-Box. Die
Strichstärken variieren von 1,6 (Kontur) bis 0,5 (Hilfslinien).

Die Beschriftung ist rein geometrisch — `X`, `Y`, `6a`, `2a` — und beschreibt nur
die Proportionen der Zeichnung selbst. Die Zeichnung ist `aria-hidden`, trägt
also keine Information. Die Hilfslinien atmen über 19 Sekunden kaum merklich;
bei `prefers-reduced-motion` steht alles still.

### Drei Blockmuster

Die Inhaltsblöcke verwenden bewusst unterschiedliche Layouts:

1. **Pros** — Label am äußeren Rand, Inhalt rechts daneben, eine durchgehende
   Regel hält die Gruppe. Keine Linie unter den einzelnen Punkten.
2. **Cons / Was als Nächstes kommt** — als gehaltene Aussage gesetzt, groß und
   ruhig, ins Raster eingerückt.
3. **Basteleien** — nummerierte Positionen im Stil einer Stückliste, ohne Regeln.

Auch die vertikalen Abstände wechseln zwischen den Blöcken (`--pad-a/b/c`).

### Bewegung

- **Hintergrund:** ein feines Raster driftet mit gut 2,7 px/s diagonal, dazu
  zwei sehr blasse Lichtflächen über 88 s und 119 s. Reines CSS, nur composited
  Transforms. Pausiert bei `document.hidden`, auf schmalen Viewports laufen nur
  noch die Rasterlinien, bei `prefers-reduced-motion` steht alles.
- **Korn:** Inline-SVG-Turbulenzfilter, keine Bilddatei.
- **Cursor:** Fadenkreuz folgt exakt, ein Ring läuft nach und wächst über Links.
  Nur bei `hover: hover` und `pointer: fine`; auf Touch und bei reduzierter
  Bewegung bleibt der native Zeiger. Läuft das Skript nicht, wird der native
  Zeiger nie versteckt.
- **Randstruktur:** ab 1340 px zwei Messschienen mit Teilstrichen in den äußeren
  Rändern, damit große Bildschirme keine unstrukturierte Fläche zeigen.

---

## Dateistruktur

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

Selbst gehostet in `fonts/`, `latin`-Subset mit Gewichtsachse, `font-display: swap`
und `preload`. Lizenztexte liegen daneben.

> Der Zeichenvorrat kennt `→` (U+2192) nicht. Dieses Zeichen im Inhalt vermeiden.

## Barrierefreiheit

Sichtbarer Fokusring, genau eine `h1` pro Seite, keine übersprungenen
Überschriftenebenen, vollständige Tastaturbedienung mit Skip-Link als erstes
Tab-Ziel. Fließtext erreicht 11,6:1, alle Textstufen mindestens WCAG AA.

## Lokal ansehen

Die Pfade sind root-relativ, ein Doppelklick auf die Datei reicht nicht:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Deploy

GitHub Pages liefert `main` aus dem Repository-Root aus. Kein Actions-Workflow,
kein Build-Schritt: Push auf `main` genügt.
