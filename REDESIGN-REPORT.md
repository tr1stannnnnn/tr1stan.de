# Redesign-Report — tr1stan.de

**Stand:** 2026-08-14
**Aktuelle Fassung:** v9 — Synthwave in Schwarz und Violett
**Arbeitsbranch:** `redesign/v9`
**Backup-Branch:** `backup/pre-v9-2026-08-14`

---

## 1. Rollback-Punkt

| | |
|---|---|
| **Backup-Branch** | `backup/pre-v9-2026-08-14` |
| **Zeigt auf** | `c3ab2b0` — die Fassung, die vor v9 live war |
| **Status** | gepusht, bleibt bestehen |

Zwei Hinweise dazu:

- Die Aufgabe nannte **v8** als Basis. Im Repository gibt es kein v8: der
  Live-Stand war **v7** (`c3ab2b0`). Ich habe darauf aufgesetzt und die
  vorgegebenen Branch-Namen beibehalten.
- Ich hatte den Backup-Branch zunächst mit dem Datum aus dem alten Kontext
  angelegt (`backup/pre-v9-2026-08-10`) und danach korrekt datiert neu erstellt.
  Der Proxy dieser Umgebung lässt kein Löschen von Remote-Branches zu, deshalb
  existieren beide. **Beide zeigen auf denselben Commit `c3ab2b0`**, maßgeblich
  ist der mit dem richtigen Datum.

---

## 2. Geänderte Dateien

**Geändert:** `index.html` (Szene, neue Abschnitte), `style.css` (komplett neu),
`script.js` (Cursor entfernt), `favicon.svg` (Sonne über dem Horizont statt
Registermarke), `impressum.html`, `datenschutz.html`, `404.html` (nur Styling und
Asset-Version), `README.md`, `REDESIGN-REPORT.md`.

**Neu:** keine Datei. **Gelöscht:** keine Datei.

### Entfernt, wie verlangt

Die Kreuz-Konstruktionszeichnung samt Maßlinien und Passmarken; die
Registermarke im Header (jetzt reiner Text `tr1stan.de`); sämtliche Reste des
Custom Cursors; das monochrome Farbsystem; die Korn-Textur. Ein eigenes
Prüfskript sucht nach allen fünf Gruppen und meldet null Treffer.

---

## 3. Selbst getroffene Entscheidungen

1. **Sonnenstreifen als Maske, nicht als aufgelegte Balken.** Die Lücken zeigen
   damit den echten Himmelsverlauf dahinter statt einer nachgebauten Farbe, die
   an dieser Stelle nie exakt gepasst hätte.

2. **`vector-effect="non-scaling-stroke"` an der Bergkante.** Mit
   `preserveAspectRatio="none"` wird das SVG in der Breite gestreckt — ohne
   diesen Zusatz würde die Neonlinie mitgestreckt und ungleichmäßig dick.

3. **Der Horizont steigt auf kurzen Viewports selbst an.** Statt `61%` steht dort
   `min(61%, calc(100% - 21rem))`. Auf 1440 × 700 wäre der Name sonst 15 px in
   die Sonne geklettert. Damit ist die Vorgabe „Text nie über der Sonne"
   strukturell abgesichert und nicht nur zufällig erfüllt.

4. **Der Hero ist `calc(100svh - var(--header-h))` hoch.** Der Sticky-Header
   belegt 58 px im Fluss; mit vollen `100svh` rutschte die Unterzeile bei 320,
   360, 768 und 1280 exakt um diese 58 px unter die Falz.

5. **Die Hero-Spalte ist breiter als der Fließtext (bis 1400 px).** Bei 1920
   braucht der Name mit 10vw rund 1150 px; in der 1120-px-Spalte wäre er
   zweizeilig umgebrochen und dadurch in die Sonne gestiegen.

6. **Der Scrim ist ein senkrechtes Band, kein radiales Feld.** Der erste Versuch
   mit einem radialen Verlauf brach an der eigenen Box-Kante sichtbar ab — ein
   dunkles Rechteck neben dem Namen. Das Band läuft seitlich randlos aus.

7. **Das Raster bewegt sich über `background-position`.** Punkt 8 der Vorgabe
   verlangt Animationen über `transform` und `opacity`, Punkt 3 verlangt für das
   Raster ausdrücklich `background-position`. Ich bin der spezifischen Vorgabe
   gefolgt; `background-position` löst ohnehin nur Neuzeichnen aus, kein neues
   Layout. Alle übrigen Animationen laufen über `transform` und `opacity`.

8. **Mobil wird das Raster verlangsamt, nicht abgeschaltet** (2,5 s auf 7 s pro
   Rasterzeile). Ganz aus wäre erlaubt gewesen, hätte der Szene aber im
   Hochformat ihren Charakter genommen.

9. **Das Favicon zeigt jetzt Sonne, Horizont und Rasterlinien.** Es war nicht
   ausdrücklich gefordert, aber eine monochrome Registermarke als Icon hätte dem
   kompletten Stilwechsel widersprochen. Datei- und Pfadname sind unverändert.

10. **Abschnittsüberschriften sind Mono in Flieder bei 1,15–1,75 rem.** Damit
    sind sie klar größer als der Fließtext und klar kleiner als der Name, wie
    verlangt — der kleine Mono-Kicker aus v7 wäre kleiner als der Fließtext
    gewesen.

11. **Umlaute ausgeschrieben.** Die Vorgabe kam in ASCII-Umschrift („Ueber das
    Zocken"); auf der Seite steht die korrekte deutsche Schreibweise. Wortlaut
    und Satzbau sind unverändert.

---

## 4. Prüfergebnisse

**Browser-Suite — 173 Einzelprüfungen, alle bestanden.** Unter anderem:

- keine externen Requests, keine JS-Fehler, beide Fonts geladen
- kein horizontales Scrollen bei **320 / 360 / 390 / 430 / 768 / 1280 / 1920**
- **Text nie über der Sonne**, geprüft bei 320, 390, 768, 1280 und 1920, zusätzlich
  bei zwölf Kombinationen aus Breite und Höhe inklusive kurzer Desktop-Fenster
- **Kontrast gegen die tatsächlich gerenderten Pixel**: Der Text wird versteckt,
  die Seite fotografiert und der hellste Pixel hinter jedem Textblock gemessen.
  Ergebnis unter anderem Name 15,6:1, Unterzeile 17,2:1, Abschnittstitel 15,0:1 —
  Fließtext liegt überall über der geforderten 7:1
- Szene: `aria-hidden`, `pointer-events: none`, `z-index -3` unter dem Inhalt,
  alle neun Teile vorhanden, Berge und Raster sitzen auf ±3 px genau auf der
  Horizontlinie, Sonne ebenso
- **pausiert bei `document.hidden`** (Raster, Halo und Sterne gleichzeitig geprüft)
- `prefers-reduced-motion`: keinerlei Animation, Szene vollständig sichtbar
- ohne JavaScript: Szene sichtbar, Inhalt lesbar, Mailadresse erreichbar
- Tap-Ziele mindestens 44 × 44 px auf allen vier Seiten, nichts hängt an Hover
- genau eine `h1` je Seite, keine Ebenensprünge, Fokusring sichtbar,
  Copy-Button schreibt die Adresse, alle Links, Anker und Redirects

**Statische Gates — 47 Prüfungen, alle bestanden:** keiner der verbotenen
Begriffe außerhalb der Rechtsseiten (inklusive `6a2a`), keine Prozentwerte oder
Balken, keine Ressource von fremden Hosts, **keine Bilddatei und kein `img`-Tag**,
CNAME unverändert, `theme-color: #06020C` auf allen Seiten, **alle 14 Farbwerte
stammen aus der vorgegebenen Palette** (Prüfung über Hex und `rgba()`), alle 16
Textbausteine wortgleich vorhanden, Rechtstexte zeichengenau identisch.

### Gefundene und behobene Fehler

1. **Scrim als sichtbares Rechteck.** Der radiale Verlauf brach an seiner Box-Kante
   ab; im Screenshot bei 1920 stand ein dunkles Rechteck links neben dem Namen.
2. **Unterzeile unter der Falz** bei 320, 360, 768 und 1280 — Ursache war die
   Höhe des Sticky-Headers.
3. **Name stieg in die Sonne** bei 1440 × 700, 1600 × 760 und 1920 × 850. Zwei
   Ursachen: zweizeiliger Umbruch bei 1920 und zu wenig Platz unter dem Horizont.
4. **Tap-Ziel „Start" im Footer nur 42 px breit.**

Drei weitere Treffer waren Fehler in meinen Prüfskripten, nicht auf der Seite:
eine zu kurze Wartezeit ließ die Einblendung von `.mail` als Hover-Abhängigkeit
erscheinen, ein Rect wurde an `getComputedStyle` übergeben, und ein Testlauf
maß vor dem Scrollen.

---

## 5. Deploy

| | |
|---|---|
| Merge | `redesign/v9` mit `--no-ff` nach `main` |
| Push | `c3ab2b0..9363b2d` |
| Pages-Lauf | `pages build and deployment` für `9363b2d` — **completed / success** |
| Rückfall nötig? | Nein. Der Backup-Branch wurde nicht angefasst. |

---

## 6. Offene Punkte und Risiken

| Punkt | Einschätzung |
|---|---|
| **Live-Abruf nicht möglich** | Der Egress-Proxy blockt `tr1stan.de`. Der Deploy ist nur über die Actions-API bestätigt. **Bitte selbst im Browser gegenprüfen.** |
| `mask-composite` | Die Sonnenstreifen brauchen `mask-composite: add` (mit `-webkit-`-Fallback). In sehr alten Browsern wäre die Sonne eine volle Scheibe ohne Streifen — sie verschwindet nicht, sie verliert nur die Streifen. |
| Rastergeschwindigkeit | 2,5 s pro Rasterzeile ist der Richtwert aus der Vorgabe. Wer es ruhiger mag, erhöht `--grid-speed`. |
| Raster auf schwachen Geräten | Ein perspektivisch gedrehtes Element mit animierter `background-position` ist teurer als eine reine Transform-Animation. Mobil auf 7 s gedrosselt; falls es dort dennoch ruckelt, `--grid-speed` weiter erhöhen oder die Animation unter 700 px ganz abschalten. |
| Kontrast auf der Szene | Gemessen am hellsten Pixel hinter dem Text. Wer den Scrim schwächer macht, muss neu messen. |
| `→` fehlt im Zeichensatz | Bleibt bestehen, `latin`-Subset. |

---

## 7. Was du manuell prüfen solltest

1. Startseite auf dem Desktop: Sonne mittig über dem Horizont, Berge davor,
   Raster läuft ruhig auf dich zu, der Name steht klar darunter.
2. Fenster schmal und niedrig ziehen — der Name darf die Sonne nie berühren und
   die Unterzeile nie unter den Rand rutschen.
3. Auf dem Handy im Hochformat: Sonne kleiner, Berge niedriger, Raster flacher,
   Bewegung deutlich langsamer.
4. Tab wechseln und zurückkommen: Die Szene war währenddessen eingefroren.
5. Bewegung reduzieren einschalten und neu laden: alles steht still, die Szene
   ist trotzdem vollständig da.
6. JavaScript abschalten: Szene und Text bleiben, nur der Copy-Button verschwindet.
7. Nur mit der Tastatur durchtabben, Fokusring muss überall sichtbar sein.
8. Impressum und Datenschutz gegenlesen — inhaltlich unverändert, nur neu gestylt.
9. Legacy-Pfade: `tr1stan.de/impressum`, `/privacy`, `/pages/index`.

---

## 8. Rollback

```bash
git fetch origin
git checkout main
git reset --hard origin/backup/pre-v9-2026-08-14
git push --force-with-lease origin main
```

Zielstand ist `c3ab2b0`, also die monochrome Fassung v7. GitHub Pages baut nach
dem Push automatisch neu.

Nicht-destruktive Alternative:

```bash
git fetch origin
git checkout main
git revert --no-commit 9363b2d^..9363b2d
git commit -m "Revert v9"
git push origin main
```

**Bestehende Branches, keiner gelöscht:** `backup/pre-v9-2026-08-14`,
`backup/pre-v9-2026-08-10` (identischer Commit), `backup/pre-v7-2026-08-10`,
`backup/pre-v6-2026-08-10`, `backup/pre-redesign-2026-08-09`, `redesign/v9`,
`redesign/v7`, `redesign/v6`, `redesign/v4`, `claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

- **v7** (`backup/pre-v9-2026-08-14`, `c3ab2b0`): monochrome Visitenkarte mit
  Kreuz-Konstruktionszeichnung, Messschienen und Custom Cursor.
- **v6** (`backup/pre-v7-2026-08-10`, `1ec3415`): erste monochrome Visitenkarte.
- **v4** (`backup/pre-redesign-2026-08-09`, `bf18260d`): technisches Datenblatt
  mit Amber-Akzent. Die selbst gehosteten Schriften stammen von dort und sind
  bis heute in Gebrauch.
