# Redesign-Report — tr1stan.de

**Stand:** 2026-08-27
**Aktuelle Fassung:** v13 — gerenderte 3D-Szene mit three.js, CSS-Szene als Rückfall
**Arbeitsbranch:** `redesign/v13`
**Backup-Branch:** `backup/pre-v13-2026-08-27`

---

## 1. Rollback-Punkt

| | |
|---|---|
| Backup-Branch | `backup/pre-v13-2026-08-27` |
| Commit darin | `8082679` (Live-Stand v12) |
| Zurückrollen | `git checkout main && git reset --hard backup/pre-v13-2026-08-27 && git push --force-with-lease origin main` |

`CNAME`, `robots.txt` und `favicon.svg` sind Byte für Byte dieselben wie dort,
geprüft über SHA-256. An `impressum.html` und `datenschutz.html` hat sich nur
die Versionsnummer der Assets geändert, sonst nichts.

---

## 2. Was neu ist

Die Szene war ein gekipptes Rechteck mit Rasterlinien darauf. Jetzt ist es eine
echte dreidimensionale: eine Kamerafahrt durch einen Korridor zwischen zwei
Bergketten, auf eine gestreifte Sonne am Horizont zu.

- **Terrain** ist eine Plane mit 96 × 24 Feldern. Die Vertices werden über eine
  selbst geschriebene Höhenfunktion aus fünf Sinustermen verschoben; eine weiche
  Maske hält in der Mitte den Korridor frei, nach außen werden die Kämme höher.
  Gezeichnet wird es zweimal: als dunkle Fläche, damit die Berge die Sonne
  wirklich verdecken, und als Drahtgitter in Neon-Magenta darüber.
- **Unendlich** wird es über drei Kacheln, die dieselbe Geometrie benutzen und
  im Kreis nach vorn wandern.
- **Sonne** als Scheibe mit senkrechtem Verlauf und waagerechten Streifen in der
  unteren Hälfte, dahinter ein weicher Schein. Beide Texturen entstehen im Code
  auf einem Canvas — es gibt in der ganzen Szene keine Bilddatei.
- **Tiefe** über Nebel zum Horizont und ein Sternenfeld, das der Nebel nicht
  anfasst.
- **Die Fahrt** läuft dauerhaft langsam und beschleunigt beim Scrollen, gedämpft
  in beide Richtungen. Die Maus kippt die Kamera um höchstens rund drei Grad,
  und nur bei feinem Zeiger.

three.js liegt als Datei im Repo (`/vendor/`). Nur der Kern-Build, nichts aus
`examples/`: kein EffectComposer, kein Bloom-Pass, keine Controls.

---

## 3. Selbst getroffene Entscheidungen

- **Die Kamera nickt beim Verlassen des Hero nach unten und hebt sich dabei
  an.** Eine fest stehende Szene hätte Sonne und Berge hinter jedem
  Textabschnitt stehen lassen — genau der Fehler, der zu v12 gemeldet wurde, nur
  in neuer Form. So wandern Sonne, Berge und Horizont über den oberen Rand, und
  unter dem Text läuft nur der Rasterboden weiter. Das Anheben ist nötig, weil
  aus der Froschperspektive nach unten geblickt nur zwei, drei Rasterlinien
  sichtbar wären; von oben ist der Boden ein Boden.
- **Der Boden wird leiser statt der Text heller.** Die Deckkraft der Linien
  geht mit der Fahrt von 0,92 auf 0,52 zurück, dazu nimmt die Verlaufsfläche
  über der Szene unter dem Hero mehr weg als vorher. Ohne das lagen die
  Positionsnummern bei 4,94:1, also knapp über der Grenze; jetzt bei 6,47:1.
- **Zwei Dateien im vendor-Verzeichnis, nicht eine.** `three.module.min.js`
  importiert `./three.core.min.js` relativ. Beide liegen deshalb nebeneinander;
  umgeschrieben oder neu gebündelt wurde nichts.
- **Der dynamische Import steht hinter einem `Function`-Konstruktor.** In einem
  Browser ohne `import()` wäre er sonst ein Syntaxfehler beim Parsen und würde
  das ganze Skript mitreißen — ausgerechnet auf dem Gerät, das den Rückfall am
  nötigsten braucht.
- **Die Dämpfung rechnet über die Zeit, nicht je Bild.** Ein fester Faktor je
  Bild macht dieselbe Bewegung auf einem langsamen Gerät zäh und auf einem
  schnellen hart. Aufgefallen ist das hier: bei neun Bildern je Sekunde brauchte
  das Nicken der Kamera Sekunden statt Sekundenbruchteile.
- **Die Höhenfunktion ist in z exakt kachelperiodisch.** Die z-Anteile sind
  ganzzahlige Vielfache von 2π/Kacheltiefe. Damit liegt die Naht auf dem Vertex
  genau statt nur ungefähr.
- **Der Canvas wird erst sichtbar, wenn ein Bild steht.** Bis dahin läuft die
  CSS-Szene weiter. So gibt es beim Übergang nichts Leeres zu sehen und der
  Rückfall braucht keinen Sonderweg.

---

## 4. Prüfergebnisse

**89 Browserprüfungen, 134 statische Prüfungen — alle bestanden.**

| Prüfung | Ergebnis |
|---|---|
| Externe Requests beim Seitenaufruf | keine, auf allen vier Seiten; three.js kommt aus `/vendor/` |
| Kachelnaht | größte Höhendifferenz 2,84e-13 Einheiten, Funktion exakt 300-periodisch |
| Kacheldeckung | über den ganzen Zyklus keine Lücke |
| Sonne unter dem Hero | 0 Pixel an je vier Scrollständen über vier Breiten |
| Positivprobe im Hero | 38 410 bis 63 575 Sonnenpixel — die Messung schlägt also an |
| Rasterboden unter dem Text | 17 000 bis 103 000 Neonpixel an jedem Scrollstand |
| Fließtext gegen die gerenderte Szene | mindestens 10,15:1 (gefordert 7:1) |
| Bedienelemente und Labels | mindestens 6,47:1 (gefordert 4,5:1) |
| Ohne WebGL | `has-3d` bleibt aus, three.js wird nicht geladen, CSS-Szene läuft |
| three.js nicht ladbar | stiller Rückfall, Canvas bleibt unsichtbar, keine Meldung |
| `prefers-reduced-motion` | keine 3D-Szene, kein Download, nichts bewegt sich |
| Ohne JavaScript | alle Abschnitte sichtbar, CSS-Szene läuft, kein Download |
| Im Hintergrund | es wird nicht mehr gerendert, das Bild steht still |
| Waagerechtes Scrollen | keins bei 320, 360, 390, 430, 768, 1280, 1920 |
| Kästen um Inhaltsabschnitte | keine, wie in v12 |
| Rechtstexte gegen `origin/main` | zeichenidentisch |

### Größe der vendorten Dateien

| Datei | roh | gzip |
|---|---|---|
| `vendor/three.module.min.js` | 365 552 B | 86 590 B |
| `vendor/three.core.min.js` | 385 386 B | 100 867 B |
| **zusammen** | **750 938 B** | **187 457 B** |

Geladen wird das nur, wenn die 3D-Szene tatsächlich startet.

### Bildraten

Ehrlich vorweg: **diese Zahlen sind nicht repräsentativ.** Die Prüfumgebung hat
keine GPU, Chromium rastert in Software. Was die Szene tatsächlich je Bild
zeichnet, sagt mehr als die Millisekunden:

| | hohe Stufe | niedrige Stufe |
|---|---|---|
| Zeichenaufrufe | 10 | 10 |
| Dreiecke | 13 830 | 5 382 |
| Liniensegmente | 14 184 | 5 592 |
| Punkte | 220 | 90 |
| Pixeldichte | höchstens 2 | 1 |

Gemessen wurde trotzdem, in Ruhe und beim Scrollen:

| Breite | Ruhe (Median / p90) | beim Scrollen |
|---|---|---|
| 390 px | 25,8 / 29,0 ms | 26,2 / 30,7 ms |
| 1280 px | 91,7 / 101,9 ms | 88,2 / 99,0 ms |
| 1920 px | 177,0 / 192,1 ms | 169,9 / 185,9 ms |

Zehn Zeichenaufrufe und rund 14 000 Liniensegmente sind für eine GPU nichts; auf
einem Mittelklasse-Laptop ist das eine Bildschirmaktualisierung. Belegen kann
ich das von hier aus nicht — deshalb steht es unter „manuell prüfen".

Die eingebaute Notbremse greift unabhängig davon: Unter 36 Bildern je Sekunde
wird erst die Pixeldichte gesenkt, dann das Terrain auf 56 × 16 Felder
vergröbert, und bleibt es danach unter 20 Bildern je Sekunde, gibt die Szene an
die CSS-Szene zurück. In der Prüfumgebung wurde das während der Messungen nicht
ausgelöst.

### Gefundene und behobene Fehler

1. **Die Szene stand hinter dem ganzen Text.** Sonne und Berge lagen hinter
   jedem Abschnitt — derselbe Fehler wie in v11, nur gerendert statt gezeichnet.
   Behoben über das Nicken und Anheben der Kamera.
2. **Der Boden war nach dem Nicken fast leer.** Aus der Froschperspektive nach
   unten geblickt blieben zwei, drei Linien übrig. Behoben, indem die Kamera
   mitsteigt.
3. **Die hintere Kante des Terrains war sichtbar.** Der Nebel endete hinter der
   Geometrie statt davor; Nebelweite auf 880 Einheiten gekürzt.
4. **Die Dämpfung hing an der Bildrate** und wurde auf Zeit umgestellt.
5. **Die Positionsnummern lagen bei 4,94:1**, knapp über der Grenze. Der Boden
   nimmt jetzt zurück, damit sie bei 6,47:1 liegen.

Drei weitere Meldungen kamen aus meinen eigenen Prüfskripten, nicht von der
Seite: die Regel für „sonnenartige Pixel" aus v12 (hell und viel Rot) zählte die
hellen Magenta-Rasterlinien mit — die Regel prüft jetzt zusätzlich auf Grün und
hat eine Positivprobe im Hero, damit sie nicht stillschweigend nie anschlägt;
und zwei Prüfungen suchten verbotene Wörter im Quelltext, fanden sie aber in den
Kommentaren, in denen der Code erklärt, dass er sie gerade nicht benutzt.

### Sichtprüfung

Je vier Aufnahmen bei 390, 768, 1280 und 1920 px über die volle Seitenhöhe,
dazu Aufnahmen ohne WebGL, ohne JavaScript und mit reduzierter Bewegung. Die
Szene wirkt räumlich, der Korridor führt auf die Sonne zu, die Berge verdecken
sie. Kein sichtbarer Sprung beim Zurücksetzen der Kacheln. Unter dem Hero keine
Sonne, keine Berge, kein Horizont. Kein Text steht auf einer hellen Fläche.

---

## 5. Deploy

| | |
|---|---|
| Merge-Commit | `edb2fe6` |
| Inhalts-Commit | `ee63bc5` |
| Workflow | `pages build and deployment` |

Die Seite selbst kann ich aus dieser Umgebung nicht abrufen — der Egress-Proxy
sperrt `tr1stan.de` und `github.io`. Geprüft wurde gegen einen lokalen Nachbau
von GitHub Pages, bestätigt wird der Deploy über die Actions-API.

---

## 6. Offene Punkte und Risiken

- **Die Bildrate auf echter Hardware ist ungeprüft.** Siehe oben. Wenn es auf
  einem Gerät ruckelt, greift die Notbremse von selbst; wenn sie zu früh oder zu
  spät greift, sind die Schwellen in `scene3d.js` an einer Stelle einstellbar.
- **Der Sichtbarkeitsbeobachter am Canvas ist eine Formalie.** Der Canvas hängt
  fixiert am Viewport und ist damit praktisch immer sichtbar. Der Beobachter
  steht trotzdem da, weil die Vorgabe ihn verlangt und er greifen würde, wenn
  der Canvas je anders positioniert wird.
- **Kontextverlust ist verdrahtet, aber nicht erlebt.** Der Weg ist derselbe wie
  beim Ladefehler, und der ist geprüft.
- **`import()` und WebGL 2** setzen einen Browser ab etwa 2021 voraus. Alles
  darunter bekommt die CSS-Szene, ohne etwas zu laden.

---

## 7. Was du manuell prüfen solltest

1. Auf einem echten Rechner: läuft die Fahrt flüssig, auch beim schnellen
   Scrollen?
2. Auf dem Telefon: startet die 3D-Szene, und bleibt sie flüssig?
3. Die Maus langsam über die Seite führen — kippt die Kamera minimal mit?
4. In den Systemeinstellungen „Bewegung reduzieren" einschalten und neu laden:
   es darf nichts geladen werden und nichts sich bewegen.
5. Beim Scrollen aus dem Hero heraus: verschwinden Sonne und Berge sauber nach
   oben, ohne dass es abgeschnitten wirkt?
6. Lange scrollen und auf das Zurücksetzen der Kacheln achten — springt etwas?

---

## 8. Bestehende Branches

Keiner wurde gelöscht: `backup/pre-v13-2026-08-27`, `backup/pre-v12-2026-08-20`,
`backup/pre-v11-2026-08-17`, `backup/pre-v10-2026-08-14`,
`backup/pre-v9-2026-08-14`, `backup/pre-v9-2026-08-10` (gleicher Commit),
`backup/pre-v7-2026-08-10`, `backup/pre-v6-2026-08-10`,
`backup/pre-redesign-2026-08-09`, `redesign/v13`, `redesign/v12`, `redesign/v11`,
`redesign/v10`, `redesign/v9`, `redesign/v7`, `redesign/v6`, `redesign/v4`,
`claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

- **v12** (`backup/pre-v13-2026-08-27`, `8082679`): Abschnitte ohne Kästen,
  Hero-Szene getrennt vom laufenden Rasterboden. Diese CSS-Szene ist der
  Rückfall von v13 und bleibt vollständig im Code.
- **v11** (`backup/pre-v12-2026-08-20`, `c60a997`): Chrome-Typografie,
  Spiegelung, CRT-Overlay, scroll-gekoppelte Szene.
- **v10** (`backup/pre-v11-2026-08-17`, `6c5cf3f`): Szene fixiert hinter der
  ganzen Seite, Sonne kreisrund und hinter den Bergen.
- **v9** (`backup/pre-v10-2026-08-14`, `b45506a`): erste Synthwave-Fassung.
- **v7** (`backup/pre-v9-2026-08-14`, `c3ab2b0`): monochrome Visitenkarte.
- **v4** (`backup/pre-redesign-2026-08-09`, `bf18260d`): technisches Datenblatt.
  Die selbst gehosteten Schriften stammen von dort.
