# tr1stan.de

Statische private Website für `tr1stan.de`.

Die Seite ist ein persönlicher Tech-, Homelab- und Automation-Space: kein Framework, kein
Build-Step, kein npm, keine externen Requests, keine Tracking-Libraries. Ausgeliefert wird
direkt aus dem Repository-Root über GitHub Pages.

**Kein Portfolio, sondern ein privater Systemraum** — Systemintegration, DNS, Mail, Netzwerk,
Homelab und Automation als zusammenhängende Story statt als Standard-Visitenkarte.

---

## Designrichtung: technisches Instrument / Datenblatt

Die Gestaltung folgt der Anmutung eines Messgeräts und eines gedruckten Datenblatts, nicht dem
Cyber-Neon-Klischee. Konkret heißt das:

- **Grund:** neutrales Fast-Schwarz `#0B0B0C`, abgestufte Graustufen für Flächen und Linien.
- **Text:** papierweiß `#F2F0EC`, darunter drei abgestufte Grautöne — alle mindestens 4,5:1.
- **Akzent:** genau eine Farbe, Signal-Amber `#FF6A2A`. Kein Cyan, kein Grün, kein Magenta,
  keine Glow-Effekte.
- **Struktur:** sichtbares Basisraster, feine Trennlinien, Beschriftungen wie in einer
  technischen Zeichnung. Jede Sektion hat ein eigenes Layout statt eines wiederholten
  Karten-Grids.
- **Bewegung:** ausschließlich scroll-getriggerte Einblendungen und Hover-Feedback. Nichts
  animiert dauerhaft von selbst. `prefers-reduced-motion` schaltet alles ab.

### Ehrliche Zustände statt erfundener Zahlen

Die Seite zeigt bewusst **keine** Prozentbalken, Auslastungswerte, FPS-Zähler oder Timer.
Solche Werte hatten keine Quelle. Zustände stehen jetzt als überprüfbare Labels: `live`,
`in Arbeit`, `geplant`.

---

## Dateistruktur

Alle Dateien liegen bewusst flach im Root. Es gibt **kein** `/pages/`-Verzeichnis.

```text
tr1stan.de/
├── index.html          # Startseite (Masthead, Identity, Stack, Vorhaben, Lab, Kontakt)
├── impressum.html      # Impressum nach § 5 DDG
├── datenschutz.html    # Datenschutzhinweise nach Art. 13 DSGVO
├── 404.html            # GitHub-Pages-Fehlerseite inkl. Legacy-Redirects
├── style.css           # Designsystem: Tokens, Base, Layout, Komponenten, Utilities
├── script.js           # Progressive Enhancement (Nav, Befehle, Copy, Reveal)
├── fonts/              # selbst gehostete Variable Fonts inkl. Lizenzen
├── favicon.svg         # SVG-Favicon
├── robots.txt          # Crawler-Hinweise
├── sitemap.xml         # Sitemap für tr1stan.de
├── CNAME               # Custom Domain für GitHub Pages (Inhalt: tr1stan.de)
└── README.md           # Diese Datei
```

### Das visuelle Hauptobjekt

Der Blickfang ist eine **statische technische Zeichnung** im Masthead: ein Inline-SVG, das
zeigt, wie die Domain auf ihre drei Zweige verteilt ist — DNS (`A + AAAA`), Web (GitHub Pages)
und Mail (Proton). Mit Maßlinien, Ticks und Revisionsnummer wie auf einem Datenblatt. Die
Zeichnung ist bewusst unbewegt.

---

## Schriften

Beide Schriften liegen selbst gehostet in `fonts/`, es wird nichts von einem CDN geladen.

| Schrift | Verwendung | Datei | Lizenz |
|---|---|---|---|
| Inter Variable | Fließtext, Überschriften | `inter-var-latin.woff2` (48 KB) | SIL OFL 1.1 |
| JetBrains Mono Variable | Labels, Werte, technische Kleinteile | `jetbrains-mono-var-latin.woff2` (40 KB) | SIL OFL 1.1 |

Beide sind auf das `latin`-Subset reduziert und tragen eine Gewichtsachse
(`font-weight: 100 900` bzw. `100 800`), eingebunden per `@font-face` mit `font-display: swap`
und `<link rel="preload">`. Die Lizenztexte liegen als `fonts/LICENSE-*.txt` daneben.

> Hinweis zum Zeichenvorrat: Die `unicode-range` des `latin`-Subsets deckt Umlaute, `ß`,
> typografische Anführungszeichen sowie `↑` und `↓` ab — **nicht** aber `→` (U+2192). Dieses
> Zeichen wird im Inhalt deshalb vermieden, damit kein Fallback-Glyph einspringt.

---

## Barrierefreiheit

- sichtbarer Fokusring auf allen bedienbaren Elementen
- genau eine `h1` pro Seite, keine übersprungenen Überschriftenebenen
- `aria-label` an Icon-Buttons, `aria-expanded` am mobilen Menü
- vollständige Tastaturbedienung inklusive Skip-Link als erstes Tab-Ziel
- alle Textfarben erreichen mindestens WCAG AA (4,5:1)

## Lokal ansehen

Weil die Pfade root-relativ sind (`/style.css`, `/fonts/…`), braucht es einen Server —
ein Doppelklick auf die Datei reicht nicht:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Deploy

GitHub Pages liefert den Branch `main` aus dem Repository-Root aus. Es gibt keinen
Actions-Workflow und keinen Build-Schritt: Push auf `main` genügt.
