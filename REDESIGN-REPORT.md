# Redesign-Report — tr1stan.de

**Stand:** 2026-08-14
**Aktuelle Fassung:** v10 — Synthwave, Szene trägt die ganze Seite
**Arbeitsbranch:** `redesign/v10`
**Backup-Branch:** `backup/pre-v10-2026-08-14`

---

## 1. Rollback-Punkt

| | |
|---|---|
| **Backup-Branch** | `backup/pre-v10-2026-08-14` |
| **Zeigt auf** | `b45506a` — die Fassung v9, die vor v10 live war |
| **Status** | gepusht, bleibt bestehen |

Der exakte Befehl steht in Abschnitt 8.

---

## 2. Die beiden Sonnen-Bugs

Beide waren real und sind jetzt **messbar** behoben, nicht nur nach Augenmaß.

**a) Streifen liefen über den Kreis hinaus.** Die Streifen entstanden allein aus
einer CSS-Maske. Die Maske steuert nur die Deckkraft — die runde Beschneidung
über `border-radius` griff daneben nicht durch, sodass ein Halbkreis auf einem
Balkenblock saß. Jetzt beschneidet der Sonnen-Container die Scheibe zusätzlich
hart mit `border-radius: 50%` und `overflow: hidden`.

*Nachweis:* Ein Pixeltest blendet Berge, Horizontlinie und Halo aus, fotografiert
die Scheibe und sucht den am weitesten vom Mittelpunkt entfernten Sonnenpixel.
Ergebnis bei 1280, 1920 und 390 px: **1,000 / 1,002 / 1,004 × Radius**. Vorher
lag der Wert bei rund 1,49.

**b) Die Sonne lag vor den Bergen.** Die Reihenfolge im Markup war zwar richtig,
die Scheibe wurde aber trotzdem darüber gemalt. Statt sich auf die
Dokumentreihenfolge zu verlassen, trägt jetzt jede Szenenebene ein
ausdrückliches `z-index`: Himmel 1, Sterne 2, Halo 3, Sonne 4, Berge 5,
Horizontlinie 6, Raster 7 — der Inhalt darüber.

*Nachweis:* Derselbe Test zählt die Sonnenpixel einmal mit ausgeblendeten und
einmal mit sichtbaren Bergen. Die Berge verdecken **5,1 bis 5,6 %** der Scheibe.
Läge die Sonne davor, wäre der Wert null.

---

## 3. Szene als durchgehender Hintergrund

Die Szene liegt jetzt in einem fixierten Container (`position: fixed`,
`inset: 0`, `z-index: -3`, `pointer-events: none`) hinter der ganzen Seite. Beim
Scrollen bleibt sie stehen, der Inhalt läuft darüber; Sonne, Berge und Horizont
behalten ihre Position im Viewport, das Raster läuft durchgehend weiter.

Damit der Text lesbar bleibt, greifen zwei Schichten:

1. **Die Abdunklung** beginnt am Hero-Ende und scrollt mit dem Dokument. Sie
   verläuft nach unten in Richtung dunkel — die Szene bleibt erkennbar, wird
   aber ruhiger. Sie braucht kein JavaScript.
2. **Jeder Inhaltsblock** steht auf einer eigenen halbtransparenten Fläche mit
   feiner Neonlinie als Rand. Kein Text steht direkt auf dem Raster.

**Auf Mobilgeräten ist die Szene bewusst nicht fixiert.** Fixierte Hintergründe
sind dort unzuverlässig: mehrere Browser zeichnen sie beim Einklappen der
Adressleiste verzögert neu, was als Springen wahrgenommen wird. Die Szene ist
deshalb am obersten Screenful verankert, darunter läuft die Seite auf ruhigem
dunklem Grund. Das ist die Ausweichlösung, die die Vorgabe ausdrücklich erlaubt.

---

## 4. Die Abschnitte

Fünf verschiedene Muster, kein einziges wiederholt sich:

| Abschnitt | Muster |
|---|---|
| Wie es anfing | zweispaltig, Überschrift links, Text rechts |
| Warum es geblieben ist | breiter Block, erste Zeile per `::first-line` deutlich größer |
| Was ich mache | nummerierte Positionen, Ziffern groß in Neon, Trennlinie je Zeile, Hover-Aufhellung |
| Ehrlich gesagt | große ruhige Aussage, zentriert, mit Luft |
| Was als Nächstes kommt | drei Begriffe nebeneinander |

Alle Blöcke nutzen die volle Breite des Inhaltsrasters — maschinell geprüft: alle
sechs Panels sind exakt so breit wie die Inhaltsspalte. Der größte vertikale
Abstand zwischen zwei Blöcken beträgt **34 px bei 900 px Viewporthöhe**, die
Vorgabe erlaubt ein Drittel, also 300 px. Zwischen den Abschnitten laufen dünne
Neon-Trennlinien über die volle Breite.

---

## 5. Bewegung unterhalb des Hero

- Abschnitte faden ein und schieben sich leicht nach oben.
- Die Trennlinien ziehen sich beim Sichtbarwerden von links auf.
- Listenzeilen kommen versetzt nach, **60 ms pro Zeile**, gedeckelt bei 300 ms.
- Hover auf Listenzeilen, Buttons und Links hellt auf, ohne Sprung.
- Nur `transform` und `opacity`, einmalig, nicht in Schleife.

**Der Startzustand wird ausschließlich aus JavaScript gesetzt**, nie im
Stylesheet: das Skript schreibt die Anfangswerte als Inline-Styles, unterdrückt
für diesen einen Frame die Übergänge und gibt sie danach frei. Läuft das Skript
nicht, ist schlicht nichts versteckt. Ein Test ohne JavaScript bestätigt: alle
21 Abschnitte, Linien und Zeilen sind voll sichtbar.

---

## 6. Prüfergebnisse

**Browser-Suite — 200 Einzelprüfungen, alle bestanden.** Darunter:

- die beiden Sonnen-Pixeltests aus Abschnitt 2, bei drei Bildschirmbreiten
- Stapelreihenfolge der sieben Szenenebenen als aufsteigende z-index-Kette
- Szene nach 2000 px Scrollen weiterhin im Viewport, hinter allem, ohne Pointer-Events
- kein horizontales Scrollen bei **320 / 360 / 390 / 430 / 768 / 1280 / 1920**
- Text nie über der Sonne, geprüft bei sieben Kombinationen aus Breite und Höhe
  inklusive kurzer Desktop-Fenster
- **Kontrast gegen die tatsächlich gerenderten Pixel**: Text wird ausgeblendet,
  die Seite fotografiert, der hellste Pixel hinter jedem Textblock gemessen.
  Alle Fließtexte über 7:1, alle Labels über 4,5:1, bei 1280 und bei 390 px
- Panels mit eigener Fläche und Rand, volle Rasterbreite, Blockabstand unter
  einem Drittel der Viewporthöhe, fünf unterschiedliche Muster nachgewiesen
- Bewegung: Startzustand armiert, Versatz 60 ms, nach dem Scrollen alles freigegeben
- ohne JavaScript und bei `prefers-reduced-motion`: nichts versteckt, Szene sichtbar
- Tap-Ziele mindestens 44 × 44 px auf allen vier Seiten, Fokusring sichtbar,
  genau eine `h1` je Seite, alle Links, Anker und Redirects

**Statische Gates — 53 Prüfungen, alle bestanden:** keine verbotenen Begriffe
außerhalb der Rechtsseiten, keine Prozentwerte oder Balken, keine fremd geladene
Ressource, keine Bilddatei und kein `img`-Tag, CNAME unverändert, `theme-color`
konsistent, **alle Farbwerte aus der vorgegebenen Palette**, alle 17 Textbausteine
wortgleich, Rechtstexte zeichengenau identisch, keine Reste von Kreuzzeichnung,
Registermarke, Cursor oder Korn.

### Gefundene und behobene Fehler

1. **Querscrollen auf allen Breiten.** Der Hero-Scrim reicht bewusst 50 vw über
   beide Kanten hinaus; ohne `overflow: hidden` am Hero verbreiterte er das
   Dokument um bis zu 650 px.
2. **Der Zeilenversatz verschwand.** Das Skript setzte `transitionDelay` und
   danach `style.transition = ""` — die Kurzform löschte den Versatz wieder mit.
   Der Versatz wird jetzt danach gesetzt.
3. **Übersprungene Blöcke blieben unsichtbar.** Wer per Anker springt oder sehr
   schnell scrollt, löst beim Observer keinen Zustandswechsel aus. Ein
   rAF-gedrosselter Scroll-Sweep gibt genau diese Blöcke frei und hängt sich
   selbst ab, sobald nichts mehr aussteht.

Zwei weitere Treffer waren Fehler in meinem Prüfskript: die Horizontlinie wurde
bei der Kreismessung mitgezählt (sie ist selbst hell), und die Panelbreite wurde
gegen die Außen- statt die Innenbreite der Inhaltsspalte gemessen.

### Sichtprüfung

18 Screenshots — 320, 390, 430, 768, 1280 und 1920 px, je oben, in der Mitte und
unten. Angesehen und beurteilt: die Sonne ist überall kreisrund, sie sinkt hinter
den Bergen, die Szene bleibt beim Scrollen sichtbar, und es gibt keine große
leere Fläche mehr.

---

## 7. Deploy

| | |
|---|---|
| Merge | `redesign/v10` mit `--no-ff` nach `main` |
| Merge-Commit | `22afdde` |
| Pages-Lauf | `pages build and deployment` für `22afdde` — **completed / success** |
| Rückfall nötig? | Nein. Der Backup-Branch wurde nicht angefasst. |

---

## 8. Offene Punkte und Risiken

| Punkt | Einschätzung |
|---|---|
| **Live-Abruf nicht möglich** | Der Egress-Proxy blockt `tr1stan.de`. Der Deploy ist nur über die Actions-API bestätigt. **Bitte selbst im Browser gegenprüfen**, besonders auf einem echten Telefon. |
| Fixierter Hintergrund auf Mobil | Bewusst abgeschaltet. Ich konnte das Flackern nur nachlesen, nicht auf echter Hardware messen — der Container hat keine mobilen Browser. |
| Szene hinter den Panels | Die Panels sind zu 68 % deckend, die Szene schimmert durch. Wer es ruhiger will, erhöht `--panel-bg`. |
| `mask-composite` | Die Streifen brauchen es weiterhin. Fällt es aus, ist die Sonne eine volle Scheibe ohne Streifen — sie bleibt rund, weil der Container beschneidet. |
| Rastergeschwindigkeit | 2,5 s pro Rasterzelle am Desktop, 7 s mobil. Über `--grid-speed` änderbar. |
| Ruckeln beim Scrollen | Nicht messbar aufgetreten; die Szene animiert ausschließlich über `transform`. Auf sehr alter Hardware bleibt das Restrisiko eines fixierten Hintergrunds. |

---

## 9. Was du manuell prüfen solltest

1. Langsam durch die ganze Seite scrollen: Die Szene muss stehen bleiben und
   durchgehend sichtbar sein, der Inhalt darüber laufen.
2. Die Sonne aus der Nähe ansehen: rund an jeder Stelle, und sie steckt hinter
   den Bergen.
3. Beim Hereinscrollen: Blöcke faden ein, die Linien ziehen sich von links auf,
   die Listenzeilen kommen kurz nacheinander.
4. Mit der Maus über die Listenzeilen und die Buttons fahren — nur Aufhellung,
   kein Springen.
5. Auf dem Handy: Szene oben, darunter ruhiger Grund, keine springenden
   Hintergründe beim Scrollen, Raster deutlich langsamer.
6. JavaScript abschalten: **alle** Abschnitte müssen sofort sichtbar sein.
7. Bewegung reduzieren einschalten: nichts bewegt sich, alles ist sichtbar.
8. Tab wechseln und zurückkommen: Die Szene war eingefroren.
9. Nur mit der Tastatur durchtabben, Fokusring muss überall sichtbar sein.
10. Impressum und Datenschutz gegenlesen — inhaltlich unverändert.

---

## 10. Rollback

```bash
git fetch origin
git checkout main
git reset --hard origin/backup/pre-v10-2026-08-14
git push --force-with-lease origin main
```

Zielstand ist `b45506a`, also v9. GitHub Pages baut nach dem Push automatisch neu.

Nicht-destruktive Alternative:

```bash
git fetch origin
git checkout main
git revert --no-commit 22afdde^..22afdde
git commit -m "Revert v10"
git push origin main
```

**Bestehende Branches, keiner gelöscht:** `backup/pre-v10-2026-08-14`,
`backup/pre-v9-2026-08-14`, `backup/pre-v9-2026-08-10` (gleicher Commit),
`backup/pre-v7-2026-08-10`, `backup/pre-v6-2026-08-10`,
`backup/pre-redesign-2026-08-09`, `redesign/v10`, `redesign/v9`, `redesign/v7`,
`redesign/v6`, `redesign/v4`, `claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

- **v9** (`backup/pre-v10-2026-08-14`, `b45506a`): erste Synthwave-Fassung, Szene
  nur hinter dem Hero, Sonne noch mit den beiden Bugs aus Abschnitt 2.
- **v7** (`backup/pre-v9-2026-08-14`, `c3ab2b0`): monochrome Visitenkarte mit
  Kreuz-Konstruktionszeichnung.
- **v4** (`backup/pre-redesign-2026-08-09`, `bf18260d`): technisches Datenblatt
  mit Amber-Akzent. Die selbst gehosteten Schriften stammen von dort.
