# Redesign-Report — tr1stan.de

**Stand:** 2026-08-20
**Aktuelle Fassung:** v12 — Abschnitte ohne Kästen, Hero-Szene getrennt vom laufenden Rasterboden
**Arbeitsbranch:** `redesign/v12`
**Backup-Branch:** `backup/pre-v12-2026-08-20`

---

## 1. Rollback-Punkt

| | |
|---|---|
| Backup-Branch | `backup/pre-v12-2026-08-20` |
| Commit darin | `c60a997` (Live-Stand v11) |
| Zurückrollen | `git checkout main && git reset --hard backup/pre-v12-2026-08-20 && git push --force-with-lease origin main` |

Der Branch ist auf GitHub. `CNAME`, `robots.txt` und `favicon.svg` sind Byte für
Byte dieselben wie dort — geprüft über SHA-256, nicht über Augenmaß.

---

## 2. Die zwei gemeldeten Fehler

**Fehler 1 — die Kästen.** Jeder Abschnitt saß in einem sichtbaren Rechteck
(`.panel`: eigene Fläche plus 1-px-Neonrahmen), dazwischen lagen Trennlinien.
Beides ist weg, ersatzlos. Es gibt im gesamten Inhalt kein Element mehr mit
Rahmen, Outline, Fläche oder Schattenkante — nur die Buttons behalten ihren
Neonrahmen, so wie es sein soll.

**Fehler 2 — die Szene wiederholte sich.** Die ganze Szene war viewportfest.
Beim Weiterscrollen standen Sonne, Bergzug und Horizontlinie damit mitten in den
Textabschnitten. Jetzt gehört alles, was eine eigene Form hat, zum Hero und
scrollt mit ihm weg.

---

## 3. Was neu ist

- **Zwei Ebenen statt einer.** `.scene` (Himmel, Sterne, Halo, Sonne, Berge,
  Horizont) ist am ersten Screenful verankert und scrollt weg. `.floor` trägt nur
  das Raster, bleibt am Viewport, beginnt an der Horizontlinie des Hero und läuft
  als Boden bis zum Footer.
- **Verlaufsschleier statt Kästen.** Pro Abschnitt zwei Verläufe: ein vollbreiter,
  der oben und unten auf Alpha 0 ausläuft, und eine Ellipse der Größe `50% 50%`,
  die ihre Null exakt an ihren eigenen Rändern erreicht.
- **Die Seite ist eine Fahrt.** Die Rastergeschwindigkeit folgt gedämpft der
  Scrollrate. Abschnitte kommen aus der Tiefe statt einfach einzublenden,
  Überschriften 100 ms vor ihrem Fließtext.
- **Rhythmus.** Ausrichtung, Spaltenbreite und vertikaler Abstand wechseln von
  Abschnitt zu Abschnitt; „Was ich mache" läuft in einer eigenen, breiteren Bahn.
- **Die Liste.** Die Positionsnummern sind mit 87 px ein grafisches Element, 42 px
  vom Text entfernt, ohne Linien, ohne Zebra. Hover hellt die Zeile auf und lässt
  die Nummer stärker leuchten.

Der Hero ist unverändert: Sonne, Berge, Horizont, Chrome-Typografie und
Spiegelung stehen genau wie in v11.

---

## 4. Selbst getroffene Entscheidungen

- **Horizont in `svh` statt in Prozent.** Die dokumentverankerte Szene und der
  viewportfeste Boden müssen den Horizont an dieselbe Stelle setzen. In Prozent
  hätten sie sich um bis zu 37 px unterschieden, sobald auf dem Telefon die
  Adressleiste einfährt — sichtbar als dunkler Spalt zwischen Neonlinie und
  Raster.
- **Das Raster blendet oben weich ein.** Sobald die Horizontlinie weggescrollt
  ist, wäre eine harte Oberkante des Rasters wieder ein Horizont. Im Hero deckt
  der Schein der Linie die Einblendung ohnehin zu.
- **Die Rasterfläche ist 800 % hoch statt 220 %.** Bei 220 % endete die Fläche
  mitten im Bild — der Boden las sich als Streifen, nicht als Boden. Empirisch an
  vier Perspektiv- und drei Neigungswerten gemessen und dann die Höhe erhöht,
  damit Perspektive und Neigung des Hero unangetastet bleiben.
- **Die Phase kommt aus dem Skript, nicht aus einer Keyframe-Animation.** Eine
  Animation, deren Dauer sich ändert, springt. Ein selbst gerechneter Versatz,
  als Länge an `transform` übergeben, tut das nicht.
- **Auf dem Telefon läuft weiter die CSS-Schleife.** Ein konstant langsames
  Raster ist dort billiger als eine Frame-Schleife — und ausdrücklich erlaubt.
- **Nur `margin-top` an den Abschnitten.** Mit Abständen oben und unten fallen
  benachbarte Ränder zusammen; drei verschiedene Abstufungen kamen dann als eine
  heraus.
- **`overflow-x: clip` an den Abschnitten.** Die Schleier greifen absichtlich über
  beide Kanten hinaus, damit sie keine senkrechte Naht zeigen. Ohne Beschnitt
  verbreiterten sie das Dokument auf das 1,45-fache.

---

## 5. Prüfergebnisse

**347 Browserprüfungen, 95 statische Prüfungen — alle bestanden.**

| Prüfung | Ergebnis |
|---|---|
| Keine Kastenmerkmale im Inhalt | kein Rahmen, keine Outline, keine Fläche, keine Schattenkante |
| Keine Kante im Hintergrund | stärkster Sprung senkrecht 3,1e-4, waagerecht 4,0e-4 (Schwelle 3,5e-3) |
| Szene unter dem Hero | 0 sonnenartige Pixel an 16 Scrollpositionen über vier Breiten |
| Rasterboden weiterhin sichtbar | 1 200 bis 23 726 Neonpixel an jeder dieser Positionen |
| Rastergeschwindigkeit | 26 px/s Ruhe, 485 px/s beim Scrollen (18,5-fach), 437 px/s direkt danach, 29 px/s nach 1,4 s |
| Fließtext gegen echte Pixel | schlechtester Wert 12,27:1 (gefordert 7:1) |
| Bedienelemente und Labels | schlechtester Wert 8,24:1 (gefordert 4,5:1) |
| Bildrate beim Scrollen | Median 16,7 ms, 90. Perzentil 17,2 ms |
| Waagerechtes Scrollen | keins bei 320, 360, 390, 430 px |
| Ohne JavaScript | alle Abschnitte voll sichtbar, Raster läuft |
| Reduzierte Bewegung | alles sichtbar, nichts bewegt sich |
| Kopieren der Liste | „01" und „Linux und Docker im Alltag" sauber getrennt |
| Rechtstexte gegen `origin/main` | Zeichen für Zeichen identisch (1 499 und 4 896 Zeichen) |

### Gefundene und behobene Fehler

1. **Die Zellbreite war nicht messbar.** `--grid-cell` steckt in einem `clamp()`;
   eine nicht registrierte Custom Property gibt der Browser unverändert zurück,
   `parseFloat` liefert `NaN`. Das Skript wäre auf 60 px zurückgefallen und hätte
   die Phase an der falschen Stelle umgeschlagen — ein sichtbarer Ruck bei jedem
   Durchlauf. Jetzt wird die Breite an einem unsichtbaren Element gemessen.
2. **Die Schleier verbreiterten das Dokument** auf das 1,45-fache und erzeugten
   waagerechtes Scrollen auf allen Telefonbreiten. Behoben mit `overflow-x: clip`.
3. **Die Abstände variierten nicht**, weil benachbarte Ränder zusammenfielen.
4. **Der Rasterboden endete mitten im Bild** und las sich als Streifen.
5. **Nicht aus dieser Runde, aber gefunden und mitbehoben:** auf dem Impressum
   war der gefüllte Mail-Button weiß auf fast weiß, gemessen 1,0:1. `.legal-body a`
   schlug `.btn--solid` auf Spezifität. Der Fehler war schon vor v12 live.

Vier weitere Meldungen kamen aus meinen eigenen Prüfskripten, nicht von der
Seite: der Kantenscan scrollte weich und erwischte die Hero-Szene noch im Bild;
der Sonnentest zählte weißen Text als Sonne; ein Regex erwartete ein Leerzeichen
vor `px`; und die Kontrastmessung blendete Elemente samt eigener Fläche aus,
wodurch dunkle Schrift auf hellem Button gegen die dunkle Seite gemessen wurde.
Die Messung liest jetzt die echten Zeilenkästen des Textes.

### Sichtprüfung

Je vier Aufnahmen bei 390, 768, 1280 und 1920 px, über die volle Seitenhöhe
verteilt, dazu Aufnahmen ohne JavaScript, mit reduzierter Bewegung sowie von
Impressum und 404. Kein Rechteck, keine Trennlinie, keine Tabellenoptik, unter
dem Hero keine Sonne, kein Bergzug, keine Horizontlinie. Der Boden läuft bis zum
Footer durch.

---

## 6. Deploy

| | |
|---|---|
| Merge-Commit | `2221736` |
| Inhalts-Commit | `1ea7472` |
| Workflow | `pages build and deployment` |
| Ergebnis | erfolgreich |

Die Seite selbst kann ich aus dieser Umgebung nicht abrufen — der Egress-Proxy
sperrt `tr1stan.de` und `github.io`. Bestätigt ist der Deploy über die
Actions-API, geprüft wurde gegen einen lokalen Nachbau von GitHub Pages.

---

## 7. Offene Punkte und Risiken

- **`overflow-x: clip`** braucht Safari 16. Fällt es aus, greift weiterhin
  `overflow-x: hidden` am Body: es kann dann nicht gescrollt werden, das Dokument
  meldet sich aber breiter.
- **Der viewportfeste Boden auf dem Telefon.** Er füllt immer den sichtbaren
  Bereich, kann also beim Einfahren der Adressleiste nicht springen. Sollte er auf
  einem echten Gerät trotzdem nachziehen, ist die Ebene einzeln abschaltbar.
- **Die Frame-Schleife läuft dauerhaft**, solange der Tab sichtbar ist. Gemessen
  kostet sie nichts, aber sie hat eine eingebaute Notbremse: bricht die Bildrate
  ein, gibt sie den Boden an CSS zurück.
- **`--depth` und `--run` liegen am Boden-Element**, nicht an `:root`. Wer sie
  dort sucht, findet sie nicht.

---

## 8. Was du manuell prüfen solltest

1. Auf einem echten Telefon scrollen: läuft der Boden ruhig mit, während die
   Adressleiste ein- und ausfährt?
2. Schnell und ruckartig scrollen: beschleunigt das Raster spürbar und läuft es
   weich wieder aus?
3. Mit der Maus über die Liste fahren: hellt die Zeile auf, leuchtet die Nummer?
4. Eine Zeile der Liste markieren und kopieren: steht die Nummer sauber getrennt?
5. Auf dem Impressum den gefüllten Mail-Button ansehen — er war weiß auf weiß.
6. Mit der Tastatur durch die Seite: ist der Fokusring überall klar zu sehen?

---

## 9. Bestehende Branches

Keiner wurde gelöscht: `backup/pre-v12-2026-08-20`, `backup/pre-v11-2026-08-17`,
`backup/pre-v10-2026-08-14`, `backup/pre-v9-2026-08-14`, `backup/pre-v9-2026-08-10`
(gleicher Commit), `backup/pre-v7-2026-08-10`, `backup/pre-v6-2026-08-10`,
`backup/pre-redesign-2026-08-09`, `redesign/v12`, `redesign/v11`, `redesign/v10`,
`redesign/v9`, `redesign/v7`, `redesign/v6`, `redesign/v4`,
`claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

- **v11** (`backup/pre-v12-2026-08-20`, `c60a997`): Chrome-Typografie, Spiegelung
  des Namens, CRT-Overlay, scroll-gekoppelte Szene.
- **v10** (`backup/pre-v11-2026-08-17`, `6c5cf3f`): Szene erstmals fixiert hinter
  der ganzen Seite, Sonne kreisrund und hinter den Bergen, fünf Blockmuster.
- **v9** (`backup/pre-v10-2026-08-14`, `b45506a`): erste Synthwave-Fassung.
- **v7** (`backup/pre-v9-2026-08-14`, `c3ab2b0`): monochrome Visitenkarte.
- **v4** (`backup/pre-redesign-2026-08-09`, `bf18260d`): technisches Datenblatt.
  Die selbst gehosteten Schriften stammen von dort.
