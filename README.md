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

### Die Szene in drei Dimensionen

Auf Geräten, die es tragen, liegt hinter der Seite eine echte 3D-Szene: eine
Kamerafahrt durch einen Korridor zwischen zwei Bergketten, auf eine gestreifte
Sonne am Horizont zu. Gerendert mit **three.js r185**, das als Datei im Repo
liegt (`/vendor/`, MIT, siehe `vendor/README.md`) — kein CDN, kein npm, kein
Build, und zur Laufzeit kein einziger Request an einen fremden Host.

Nur der Kern-Build. Nichts aus `examples/`: kein EffectComposer, kein
Bloom-Pass, keine Controls. Das Leuchten der Sonne ist eine Textur, keine
Nachbearbeitung; sämtliche Texturen — Himmel, Sonnenscheibe, Schein — entstehen
im Code auf einem Canvas, es gibt keine einzige Bilddatei.

- **Terrain** ist eine Plane mit 96 × 24 Feldern, deren Vertices über eine
  selbst geschriebene Höhenfunktion aus fünf Sinustermen verschoben werden.
  Eine weiche Maske hält in der Mitte den Korridor frei, nach außen werden die
  Kämme höher. Gezeichnet wird es zweimal: als dunkle Fläche, damit die Berge
  die Sonne wirklich verdecken, und als Drahtgitter in Neon-Magenta darüber.
- **Unendlich** wird es über drei Kacheln, die dieselbe Geometrie benutzen und
  im Kreis nach vorn wandern. Die z-Anteile der Höhenfunktion sind ganzzahlige
  Vielfache von 2π/Kacheltiefe, die Funktion ist damit exakt kachelperiodisch
  und die Naht liegt auf dem Vertex genau — nachgerechnet, nicht geschätzt.
- **Tiefe** kommt aus Nebel in Richtung Horizont, sodass entfernte Linien weich
  verschwinden statt hart abzureißen, und aus einem Sternenfeld im oberen
  Bereich, das der Nebel nicht anfasst.
- **Die Fahrt** läuft dauerhaft langsam und beschleunigt beim Scrollen, gedämpft
  in beide Richtungen. Beim Verlassen des Hero hebt sich die Kamera an und nickt
  nach unten: Sonne, Berge und Horizont wandern über den oberen Rand, unter dem
  Text läuft nur noch der Rasterboden — und der wird dabei leiser, damit der
  Text ihn nicht erst überstrahlen muss.
- **Die Maus** kippt die Kamera um höchstens rund drei Grad, und nur auf
  Geräten mit feinem Zeiger. Es gibt keine Steuerung, keine Controls.

### Wann die 3D-Szene *nicht* läuft

Sie ist durchgehend optional. three.js wird erst angefordert, wenn alles
dafür spricht — kein WebGL 2, `prefers-reduced-motion` oder kein JavaScript
heißt: kein Download, nicht ein Byte. Scheitert der Ladevorgang, geht der
Kontext verloren oder bricht die Bildrate trotz Vergröberung ein, schaltet die
Seite still zurück. Es gibt dabei keine Fehlermeldung und keine leere Fläche:
der Canvas wird erst sichtbar, wenn das erste Bild wirklich steht.

Deshalb bleibt die CSS-Szene aus v12 **vollständig im Code** und ist unten
unverändert beschrieben. Sie ist kein Rest, sie ist der Rückfall.

### Die CSS-Szene

Sie besteht aus **zwei getrennten Ebenen**.

`.scene` trägt alles, was eine eigene Form hat — Himmel, Sterne, Halo, Sonne,
Berge, Horizontlinie. Sie ist am ersten Screenful verankert und scrollt mit dem
Hero weg. Damit kann unter dem Hero keine zweite Sonne und kein zweiter Horizont
mehr neben dem Text stehen; genau das war passiert, solange die Szene fixiert
war.

`.floor` trägt nur das Raster. Es bleibt am Viewport, beginnt an der
Horizontlinie des Hero und läuft als Boden unter der ganzen restlichen Seite bis
zum Footer. Nach unten wird es dunkler und ruhiger — über eine mitscrollende
Verlaufsfläche und über `--depth` —, bleibt aber durchgehend sichtbar. Oben
blendet es weich ein: eine harte Kante dort wäre wieder ein Horizont.

Der Horizont wird in `svh` gerechnet, nicht in Prozent. Nur so setzen die
dokumentverankerte Szene und der viewportfeste Boden ihn an dieselbe Stelle,
auch während auf dem Telefon die Adressleiste einfährt.

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
  Durchlauf, dadurch nahtlos und ohne Neuzeichnen. Die Fläche ist bewusst weit
  höher als der sichtbare Ausschnitt, damit ihre vordere Kante nie im Bild endet.

### Lesbarkeit hat Vorrang

Der Hero-Text steht immer **unterhalb** der Sonne; der Horizont steigt auf kurzen
Viewports selbst an, damit der Name nie in die Sonne wandert. Hinter dem Text
liegt ein weich auslaufendes dunkles Band — kein Textschatten. Gemessen gegen die
tatsächlich gerenderten Pixel erreicht der Fließtext dort 17:1.

### Chrome-Typografie und Spiegelung

Der Name im Hero — und nur er — trägt einen mehrstufigen Verlauf, per
`background-clip: text` auf die Glyphen beschnitten: weiß, helles Flieder, ein
dunkler Umschlag, direkt darunter wieder weiß als harte Kante, unten rosa nach
violett. Dazu ein feiner Schlagschatten.

Der Verlauf steht ausschließlich in einem `@supports`-Block. Fällt
`background-clip: text` aus, bleibt die Grundregel stehen und der Name ist
schlicht weiß — nie unsichtbar.

Darunter liegt eine gespiegelte Kopie: vertikal geflippt, stark reduziert, per
`mask-image` nach unten ausblendend, `aria-hidden`, damit der Name nicht doppelt
vorgelesen wird. Sie erscheint nur, wenn genug Platz da ist (ab 860 × 720 px).

### CRT-Overlay

Feine Scanlines und eine Vignette liegen über der Szene, aber **unter** dem
Inhalt — kein Text muss durch eine Scanline gelesen werden. Beide bewegen sich
nicht und bleiben auch bei `prefers-reduced-motion` sichtbar.

### Abschnitte ohne Kästen

Kein Abschnitt hat einen Rahmen, eine Umrandung, eine Fläche oder eine
Trennlinie — es gibt im Inhalt überhaupt keine Kastenform mehr. Die Lesbarkeit
kommt aus zwei Verlaufsschleiern pro Abschnitt: ein vollbreiter, der oben und
unten auf Alpha 0 ausläuft und deshalb gar keine waagerechte Kante hat, und eine
Ellipse mit der Größe `50% 50%`, die ihre Null exakt an ihren eigenen Rändern
erreicht und deshalb kein Rechteck zeichnen kann. Buttons behalten ihren
Neonrahmen, Abschnitte nicht.

Jeder Block nutzt ein eigenes Muster und eine eigene Bahn: Überschrift links
neben dem Text, nach rechts eingerückter breiter Block mit groß gesetzter erster
Zeile, deutlich breiter laufende nummerierte Positionen, zentrierte Aussage,
drei Begriffe nebeneinander, Kontakt wieder links und schmal. Ausrichtung,
Spaltenbreite und vertikaler Abstand wechseln von Abschnitt zu Abschnitt; der
größte Abstand bleibt weit unter einem Bildschirm.

### Bewegung: die Seite als Fahrt

Sterne funkeln, der Halo atmet über 11 s. Das Raster läuft langsam vor sich hin
und wird beim Scrollen deutlich schneller, danach läuft es weich aus: Die
Geschwindigkeit ist ein gedämpfter Folger der Scrollrate, kein Umschalten
zwischen zwei Zuständen. Gemessen: rund 26 px/s im Ruhezustand, rund 485 px/s
beim Scrollen, nach 1,4 s wieder bei 29 px/s.

Die Phase rechnet das Skript und übergibt sie als Länge (`--run`); dadurch muss
nie eine Keyframe-Animation neu gestartet werden, was sonst als Ruck sichtbar
wäre. Die Zellbreite wird dafür an einem unsichtbaren Element gemessen — sie
steckt in einem `clamp()`, und eine nicht registrierte Custom Property gibt es
unverändert zurück, ist also nicht als Zahl lesbar.

Ohne Skript übernimmt weiterhin die CSS-Schleife, auf dem Telefon ebenfalls:
dort ist ein konstant langsames Raster billiger als eine Frame-Schleife. Bricht
die Bildrate beim Scrollen ein, gibt das Skript den Boden von sich aus an CSS
zurück. Alles pausiert bei `document.hidden`. Bei `prefers-reduced-motion` steht
die Szene vollständig still, bleibt aber sichtbar.

Abschnitte blenden nicht einfach ein, sie kommen aus der Tiefe: leicht kleiner,
leicht von unten, dann klaren sie auf — nur `transform` und `opacity`. Die
Überschrift läuft ihrem Fließtext um 100 ms voraus.

---

## Dateistruktur

```text
tr1stan.de/
├── index.html          # Hero mit Szene, Rasterboden, sechs Abschnitte
├── scene3d.js          # die 3D-Szene, nur bei Bedarf geladen
├── vendor/             # three.js r185, MIT, unverändert übernommen
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
