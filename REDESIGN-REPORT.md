# Redesign-Report — tr1stan.de

**Stand:** 2026-08-17
**Aktuelle Fassung:** v11 — Synthwave mit Chrome-Typo, CRT und scroll-gekoppelter Szene
**Arbeitsbranch:** `redesign/v11`
**Backup-Branch:** `backup/pre-v11-2026-08-17`

---

## 1. Rollback-Punkt

| | |
|---|---|
| **Backup-Branch** | `backup/pre-v11-2026-08-17` |
| **Zeigt auf** | `6c5cf3f` — die Fassung v10, die vor v11 live war |
| **Status** | gepusht, bleibt bestehen |

Rollback:

```bash
git fetch origin
git checkout main
git reset --hard origin/backup/pre-v11-2026-08-17
git push --force-with-lease origin main
```

Nicht-destruktive Alternative:

```bash
git fetch origin
git checkout main
git revert --no-commit aec109e^..aec109e
git commit -m "Revert v11"
git push origin main
```

---

## 2. Der gemeldete Textfehler

Bestätigt und behoben. Im Markup standen Positionsnummer und Text als zwei
Spans **direkt aneinander**, ohne Trennzeichen dazwischen. Visuell sah das
richtig aus, weil beide Grid-Elemente sind — beim Kopieren und für Screenreader
ergab es aber `01Linux und Docker im Alltag`.

Zwischen den Spans steht jetzt ein Zeilenumbruch. Da Grid-Container reine
Leerraum-Textknoten nicht als Element behandeln, ändert sich am Layout nichts.
Die Prüfung liest den Text jetzt als **„01 Linux und Docker im Alltag"** aus.

---

## 3. Was neu ist

| Bereich | Umsetzung |
|---|---|
| **Chrome-Typo** | Nur der Name im Hero: mehrstufiger Verlauf, per `background-clip: text` auf die Glyphen beschnitten — weiß, helles Flieder, dunkler Umschlag, harte weiße Kante, unten rosa nach violett. Dazu ein Schlagschatten für Tiefe. |
| **Pflicht-Fallback** | Der Verlauf steht ausschließlich in einem `@supports`-Block. Die Grundregel darunter setzt Weiß. Maschinell geprüft: Wird der `@supports`-Block zur Laufzeit aus dem Stylesheet gelöscht, ist der Name `rgb(255, 255, 255)`. |
| **Spiegelung** | Geflippte Kopie, Deckkraft 0,34, per `mask-image` nach unten ausblendend, `aria-hidden`. Erscheint nur ab 860 × 720 px. |
| **CRT** | Scanlines (eine gedimmte Zeile je drei Pixel) und Vignette, beide über der Szene und **unter** dem Inhalt, ohne Pointer-Events, bei reduzierter Bewegung weiterhin sichtbar. |
| **Scroll-Kopplung** | Das Skript schreibt den Scrollversatz in eine einzige Custom Property `--sc`; nur Transforms lesen sie. Gemessen bei 900 px Scrollweg: Sonne sinkt **126 px**, Raster läuft **90 px** zusätzlich, Sterne versetzen sich **−27 px**. |
| **Neon-Details** | Überschriften mit dezentem Schein, Positionsnummern von 2,5 auf 3,6 rem und leuchtend, Neonrand fährt bei Hover von links in die Listenzeile, Buttons und Links mit Neonrahmen bei Hover und Fokus. |

---

## 4. Selbst getroffene Entscheidungen

1. **Eigene Bodendeckung eingezogen.** Sobald die Sonne beim Scrollen sinkt,
   würde sie unter dem Horizont über dem Rasterboden schweben — der Boden kam
   bisher aus dem Himmelsverlauf, der *unter* der Sonne liegt. Eine eigene
   Ebene in Bodenfarbe zwischen Sonne und Bergen verdeckt sie sauber.

2. **Horizontreserve erhöht, wenn die Spiegelung sichtbar ist.** Sie verlängert
   den Textblock um rund eine halbe Namenshöhe. Ohne Anpassung stieg der Name
   bei 1920 × 850 wieder in die Sonne — genau der Fehler, der in v10 behoben
   worden war. Die Reserve wächst jetzt in derselben Media Query von 23 auf
   28 rem mit.

3. **Raster wird über eine zusätzliche Ebene beschleunigt.** Die Dauer der
   laufenden Animation mitten im Lauf zu ändern, ruckelt. Stattdessen liegt ein
   Wrapper darüber, der beim Scrollen zusätzlich verschiebt — reine Transform,
   die Grundschleife bleibt unangetastet.

4. **CRT unter der Abdunklung, nicht darüber.** So werden die Scanlines in den
   unteren Abschnitten mitgedämpft und stören den Fließtext nicht.

5. **Chrome-Name aus der normalen Kontrastmessung genommen.** Er trägt keine
   Textfarbe mehr, die Standardmessung liefert dort keinen sinnvollen Wert. Die
   Vorgabe nimmt ihn ausdrücklich aus. Stattdessen misst ein eigener Test den
   hellsten Teil der Glyphen gegen den hellsten Pixel dahinter:
   **12,29:1 bei 1280 px und 20,33:1 bei 390 px**.

6. **Scroll-Kopplung mobil ganz aus.** Dort ist die Szene ohnehin nicht fixiert;
   Parallaxe auf einer mitscrollenden Szene sähe falsch aus. Eine Regel mit
   `!important` setzt `--sc` zusätzlich zurück, falls ein Fenster nachträglich
   unter die Schwelle verkleinert wird.

---

## 5. Prüfergebnisse

**Browser-Suite — 236 Einzelprüfungen, alle bestanden.** Neu darunter:

- Nummer und Text getrennt, zwei Elemente je Zeile
- Chrome-Verlauf auf dem Namen, **kein** Chrome auf Überschriften oder Fließtext
- Fallback: `@supports`-Block gelöscht, Name bleibt weiß
- Spiegelung sichtbar bei 1280 × 900 und 1920 × 1080, weggelassen bei 390 × 844
  und 768 × 600; `aria-hidden`, Deckkraft 0,34, Maske, vertikal gespiegelt
- CRT fixiert, `z-index` zwischen Szene und Inhalt, Scanlines und Vignette
  vorhanden, bei reduzierter Bewegung weiterhin sichtbar
- Scroll-Kopplung mit den Messwerten aus Abschnitt 3; mobil und bei reduzierter
  Bewegung nachweislich `--sc: 0px`
- Neon: Schein an Überschriften und Nummern, Hover-Rand fährt ein,
  Fokusring bleibt mit `solid 2px` klar vom Neonrahmen unterscheidbar
- dazu unverändert alle v10-Prüfungen: Sonne kreisrund (≤ 1,004 × Radius),
  Berge verdecken 5,1–5,6 % der Scheibe, kein Querscrollen bei
  320/360/390/430/768/1280/1920, Kontrast gegen echte Pixel, ohne JavaScript
  alles sichtbar, Tap-Ziele, Heading-Hierarchie, Links und Redirects

**Statische Gates — 62 Prüfungen, alle bestanden**, darunter: CRT, Spiegelung,
Bodendeckung und Raster-Versatz vorhanden und dekorativ ausgezeichnet, Chrome
nur hinter `@supports` mit weißem Fallback davor, Nummer und Text im Markup
getrennt, Rechtstexte zeichengenau identisch, CNAME unverändert, keine fremd
geladene Ressource, keine Bilddatei.

### Gefundene und behobene Fehler

1. **Name stieg wieder in die Sonne** bei 1920 × 850, verursacht durch die
   zusätzliche Höhe der Spiegelung. Horizontreserve mitgewachsen.
2. Zwei weitere Treffer waren Messartefakte meiner eigenen Tests, verursacht
   durch die neuen Effekte: das CRT-Overlay dämpfte die Sonne so weit, dass die
   Geometriemessung sie teilweise nicht mehr als Sonne erkannte, und der
   Chrome-Name lieferte in der Standard-Kontrastmessung keinen sinnvollen Wert.
   Beide Tests messen jetzt richtig.

### Sichtprüfung

18 Screenshots — 320, 390, 430, 768, 1280 und 1920 px, je oben, Mitte und unten.
Beurteilt: Der Name ist überall klar lesbar, die Scanlines bleiben dezent und
verdecken keinen Text, die Spiegelung wirkt nur dort, wo Platz ist.

---

## 6. Deploy

| | |
|---|---|
| Merge | `redesign/v11` mit `--no-ff` nach `main` |
| Merge-Commit | `aec109e` |
| Pages-Lauf | `pages build and deployment` für `aec109e` — **completed / success** |
| Rückfall nötig? | Nein. Der Backup-Branch wurde nicht angefasst. |

---

## 7. Offene Punkte und Risiken

| Punkt | Einschätzung |
|---|---|
| **Live-Abruf nicht möglich** | Der Egress-Proxy blockt `tr1stan.de`. Der Deploy ist nur über die Actions-API bestätigt. **Bitte selbst im Browser gegenprüfen**, besonders auf einem echten Telefon. |
| Bildrate beim Scrollen | Im Container nicht belastbar messbar. Alle scrollgekoppelten Effekte laufen über `transform` und eine rAF-gedrosselte Custom Property, es wird kein Layout neu berechnet. Falls es auf schwacher Hardware doch hakt: `--sc`-Faktoren in `style.css` verkleinern oder die Kopplung wie mobil abschalten. |
| Scanline-Stärke | 16 % Deckkraft auf jeder dritten Pixelzeile. Wer es kräftiger mag, erhöht den Wert in `.crt::before` — der Kontrast muss danach neu gemessen werden. |
| Chrome auf sehr alten Browsern | Ohne `background-clip: text` ist der Name schlicht weiß. Das ist der abgesicherte Zustand, kein Fehler. |
| Spiegelung unter 860 × 720 px | Bewusst weggelassen, damit der Textblock nicht in die Sonne wächst. |

---

## 8. Was du manuell prüfen solltest

1. Den Namen ansehen: harte weiße Kante in der Mitte, Spiegelung darunter, die
   nach unten ausläuft.
2. Langsam scrollen: Die Sonne muss sichtbar weiter hinter die Berge sinken,
   das Raster etwas schneller laufen, die Sterne leicht nachhängen.
3. Scanlines aus der Nähe prüfen: gerade noch sichtbar, keine schwarzen Balken,
   kein Text schlechter lesbar.
4. Über die Listenzeilen fahren: Der Neonrand fährt von links ein, die Zeile
   hellt auf, nichts springt.
5. Mit Tab durch Buttons und Links: Der Fokusring muss deutlich anders aussehen
   als der Hover-Zustand.
6. Eine Listenzeile markieren und kopieren — es muss `01 Linux und Docker im
   Alltag` herauskommen, nicht `01Linux…`.
7. Mit Screenreader über den Hero: Der Name darf **einmal** vorgelesen werden.
8. Auf dem Handy: Chrome-Name und Scanlines da, keine Spiegelung, keine
   Scroll-Kopplung, flüssiges Scrollen.
9. Bewegung reduzieren einschalten: nichts bewegt sich, Szene und CRT bleiben da.
10. JavaScript abschalten: alle Abschnitte sichtbar, Name weiterhin lesbar.
11. Impressum und Datenschutz gegenlesen — inhaltlich unverändert.

---

## 9. Bestehende Branches

Keiner wurde gelöscht: `backup/pre-v11-2026-08-17`, `backup/pre-v10-2026-08-14`,
`backup/pre-v9-2026-08-14`, `backup/pre-v9-2026-08-10` (gleicher Commit),
`backup/pre-v7-2026-08-10`, `backup/pre-v6-2026-08-10`,
`backup/pre-redesign-2026-08-09`, `redesign/v11`, `redesign/v10`, `redesign/v9`,
`redesign/v7`, `redesign/v6`, `redesign/v4`, `claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

- **v10** (`backup/pre-v11-2026-08-17`, `6c5cf3f`): Szene erstmals fixiert hinter
  der ganzen Seite, Sonne kreisrund und hinter den Bergen, fünf Blockmuster.
- **v9** (`backup/pre-v10-2026-08-14`, `b45506a`): erste Synthwave-Fassung.
- **v7** (`backup/pre-v9-2026-08-14`, `c3ab2b0`): monochrome Visitenkarte.
- **v4** (`backup/pre-redesign-2026-08-09`, `bf18260d`): technisches Datenblatt.
  Die selbst gehosteten Schriften stammen von dort.
