# Redesign-Report — tr1stan.de

**Stand:** 2026-08-10
**Aktuelle Fassung:** v7 — persönliche Visitenkarte mit Konstruktionszeichnung, streng monochrom
**Arbeitsbranch:** `redesign/v7`
**Backup-Branch:** `backup/pre-v7-2026-08-10`

---

## 1. Rollback-Punkt

| | |
|---|---|
| **Backup-Branch** | `backup/pre-v7-2026-08-10` |
| **Zeigt auf** | `1ec3415` — die Fassung v6, die vor v7 live war |
| **Status** | gepusht, bleibt bestehen |

Der exakte Befehl steht in Abschnitt 8.

---

## 2. Die sechs Befunde und was dagegen getan wurde

| Befund | Behebung |
|---|---|
| **Tote Fläche rechts** | Der Hero ist ab 720 px zweispaltig: links Name und Satz, rechts die Kreuz-Zeichnung. Gemessen bleiben rechts nur noch 36–45 px Innenabstand statt einer leeren Hälfte. |
| **Drei identische Blöcke** | Jeder Block hat jetzt ein eigenes Muster: Pros als Label neben einem Stapel mit einer durchgehenden Regel, Cons und „Was als Nächstes kommt" als große gehaltene Aussagen ins Raster eingerückt, Basteleien als nummerierte Positionen ohne jede Regel. Auch die vertikalen Abstände wechseln (`--pad-a/b/c`). |
| **Kein visueller Ankerpunkt** | Die Kreuz-Zeichnung füllt 78 % der rechten Hero-Hälfte. |
| **Zu schwacher Kontrast** | Neue Tonleiter in fünf gemessenen Stufen. Fließtext von 9,4:1 auf **11,6:1**, Headline 18,2:1, Labels 6,1:1. Jede Stufe liegt mindestens Faktor 1,5 von der nächsten entfernt. Größensprung Headline zu Fließtext jetzt 6,3-fach, dazu Gewicht als eigenes Mittel (650 gegen 300). |
| **Marke wirkt wie ein Bedienelement** | Die Marke ist kleiner (13 auf 10 px) und ruhiger (Ink-2 auf Ink-3). Sie hatte allerdings **nie** einen Kreis im Markup — siehe Abschnitt 4, Punkt 5. |
| **Bewegung unsichtbar** | Ein feines Raster driftet jetzt mit **gemessenen 2,71 px/s** diagonal, dazu zwei deutlich stärkere Lichtflächen (Alpha 0,06 und 0,04 statt 0,032). |

---

## 3. Geänderte Dateien

**Geändert:** `index.html` (neuer Hero, drei neue Blockmuster, Zeichnung, Randstruktur),
`style.css` (neue Tonleiter, Muster, Ambient, Frame), `README.md`,
`impressum.html`, `datenschutz.html`, `404.html` (nur Asset-Version), `REDESIGN-REPORT.md`.

**Neu:** keine Datei. **Gelöscht:** keine Datei.
`script.js` und `favicon.svg` sind **unverändert** — der Cursor sollte laut Vorgabe
bleiben wie er war.

---

## 4. Selbst getroffene Entscheidungen

1. **Zweispalter ab 720 px statt ab 900 px.** Erst so gesetzt wie ursprünglich
   geplant, dann im Screenshot bei 768 px gesehen: die Zeichnung stand
   linksbündig unter dem Text und ließ rechts eine schiefe Lücke — genau der
   Eindruck von „nicht fertig geladen", der weg sollte. Schwelle heruntergezogen.

2. **Die Zeichnung wird nicht ausgeblendet, sondern verkleinert.** Unter 720 px
   rutscht sie unter den Text bei 300 px Breite. Ausblenden wäre erlaubt gewesen,
   hätte aber genau die Leere zurückgebracht, um die es ging.

3. **Beschriftung der Zeichnung: `X`, `Y`, `6a`, `2a`.** Bewusst keine
   Millimeterwerte, denn die wären erfundene Zahlen. `a` ist die halbe Armbreite;
   `6a` und `2a` beschreiben nachprüfbar die echten Proportionen der Zeichnung.
   Keine Jahreszahlen, keine Symbolik, kein erklärender Text.

4. **„Was als Nächstes kommt" ist wieder Fließtext.** In v6 hatte ich die
   Komma-Aufzählung in eine Liste zerlegt. Die Vorgabe verlangt jetzt eine
   hervorgehobene Aussage, also steht der Satz wieder als Satz. Wortlaut in
   beiden Fassungen unverändert.

5. **Zur Marke „im Kreis":** Im Markup gab es nie einen Kreis um die
   Registermarke — sie ist seit v6 nur zwei Haarlinien. Der Kreis, der sich um
   ein Plus legt, ist der **Custom Cursor**: ein Ring mit Fadenkreuz darin. Wenn
   der Zeiger neben dem Namen steht, sieht das exakt nach „Marke im Kreis" aus.
   Da Punkt 6 der Vorgabe den Cursor ausdrücklich unverändert lassen wollte, habe
   ich ihn nicht angefasst und stattdessen die Marke wie verlangt kleiner und
   ruhiger gemacht. **Falls der Ring gemeint war, sag Bescheid — das ist eine
   Zeile.**

6. **Messschienen erst ab 1340 px.** Darunter sind die Außenränder zu schmal;
   die Schienen würden am Text kleben statt ihn zu rahmen.

7. **Raster driftet, Lichtflächen stehen auf Mobilgeräten.** „Reduziert" statt
   „aus": die Bewegung bleibt wahrnehmbar, die teureren Flächen entfallen.

8. **Fließtext bei 11,6:1 statt noch heller.** Bei ~15:1 verliert die Headline
   ihre eigene Stufe. Der Abstand Headline zu Fließtext beträgt so 1,57-fach und
   bleibt sichtbar — Hierarchie schlägt Maximalkontrast.

---

## 5. Prüfergebnisse

**Browser-Suite — 134 Einzelprüfungen, alle bestanden.** Darunter:

- keine externen Requests, keine JS-Fehler, beide Fonts geladen
- kein horizontales Scrollen bei **360 / 768 / 1280 / 1440 / 1920**
- Kontraste im gerenderten Zustand gemessen: Headline 18,2:1, Aussage 18,2:1,
  Fließtext 11,6:1, Positionsliste 11,6:1, Labels 6,1:1
- Stufen nachgerechnet: Headline zu Fließtext 1,57×, Fließtext zu Label 1,92×
- Größensprung 114,9 px zu 18,2 px = 6,3-fach; Gewichte 650 gegen 300
- die drei Muster maschinell unterschieden: Pros zweispaltig mit Gruppenregel und
  **ohne** Linie unter den Punkten, Aussage um 168 px eingerückt und 1,9-fach
  größer als Fließtext, Positionsliste zweispaltig mit Nummern und ohne Linien
- Zeichnung: `aria-hidden`, Inline-SVG, in der rechten Hälfte, 78 % Flächenanteil,
  vier verschiedene Strichstärken (1,6 / 0,7 / 0,5 / 0,5), Beschriftung rein
  geometrisch, Hilfslinien atmen, bei reduzierter Bewegung statisch
- Hintergrund: Drift **gemessen 2,71 px/s**, `pointer-events: none`, `z-index -3`,
  pausiert bei `document.hidden`, statisch bei reduzierter Bewegung, mobil reduziert
- Cursor: aktiv am Desktop, **aus auf Touch**, **aus bei reduzierter Bewegung**,
  blockiert die Zeichnung nicht, Zustandswechsel über Links
- ohne JavaScript: Inhalt lesbar, Mailadresse erreichbar, nativer Cursor sichtbar
- Fokusring sichtbar, genau eine `h1` je Seite, keine Ebenensprünge

**Statische Gates — 48 Prüfungen, alle bestanden:** keiner der verbotenen Begriffe
außerhalb der Rechtsseiten, keine Prozentwerte oder Balken, keine fremd geladene
Ressource, CNAME unverändert, Meta-Tags konsistent, alle Farbwerte chromaarm im
selben Farbton, Rechtstexte zeichengenau identisch (1499 und 4896 Zeichen),
**Fließtext auch auf dem hellstmöglichen Hintergrund noch 8,77:1** (beide
Lichtflächen und das Korn übereinandergerechnet).

**Sichtprüfung:** Screenshots bei 1920, 1440, 1280, 768 und 360 px angesehen. Der
einzige Befund war die Schieflage bei 768 px, siehe Entscheidung 1. Die
Zeichnung habe ich zusätzlich in doppelter Auflösung ausgeschnitten und geprüft.

**Gefundene und behobene Fehler:**

1. **Lichtflächen liefen auf Mobilgeräten weiter.** `.ambient i` (Spezifität
   0,1,1) verlor gegen `.ambient i:nth-child(1)` (0,2,0). Selektoren angeglichen.
2. **Schieflage bei 768 px** (Entscheidung 1).
3. Ein Timeout in meinem eigenen Prüfskript verdeckte Abschnitt 12 — das Skript
   suchte `.mail` auf der Impressumsseite. Korrigiert, danach lief die Suite
   vollständig durch.

---

## 6. Deploy

| | |
|---|---|
| Merge | `redesign/v7` mit `--no-ff` nach `main` |
| Push | `1ec3415..9fe5bda` |
| Pages-Lauf | `pages build and deployment` für `9fe5bda` — **completed / success** |
| Rückfall nötig? | Nein. Der Backup-Branch wurde nicht angefasst. |

---

## 7. Offene Punkte und Risiken

| Punkt | Einschätzung |
|---|---|
| **Live-Abruf nicht möglich** | Der Egress-Proxy blockt `tr1stan.de`. Der Deploy ist nur über die Actions-API bestätigt. **Bitte selbst im Browser gegenprüfen.** |
| Rasterdrift als Geschmacksfrage | 2,71 px/s ist bewusst an der Wahrnehmungsschwelle. Zu langsam: `grid-drift` von 46 s runter. Zu unruhig: hoch. |
| Hilfslinien sehr zart | Konstruktionskreis und Diagonalen liegen bei `--c-line-2` und 0,5 px. In hellen Räumen kaum zu sehen. Absicht, aber leicht zu ändern. |
| Cursor blendet den I-Beam aus | Über Text fehlt die Textcursor-Rückmeldung. Markieren funktioniert. |
| Ring um die Marke | Siehe Entscheidung 5 — wenn der Cursor-Ring gemeint war, ist das eine Zeile. |
| Kein Regressionsschutz | Die Prüfskripte liegen außerhalb des Repos; ohne Build gibt es keine CI. |
| `→` fehlt im Zeichensatz | Bleibt bestehen, `latin`-Subset. |

---

## 8. Was du manuell prüfen solltest

1. Startseite auf einem breiten Monitor: rechts neben dem Namen steht die
   Zeichnung, nirgends eine große leere Fläche.
2. Etwa fünf Sekunden ruhig auf den Hintergrund schauen — die Rasterbewegung soll
   auffallen. Nach einer halben Minute soll sie nicht nerven.
3. Nach unten scrollen: die drei Blöcke müssen unterschiedlich gebaut aussehen.
4. Lesbarkeit: Fließtext soll klar heller wirken als vorher.
5. Maus über die Zeichnung führen — nichts darf blockieren oder flackern.
6. Auf dem Handy: kein Custom Cursor, Zeichnung unter dem Text, ruhiger Hintergrund.
7. Bewegung reduzieren einschalten und neu laden: alles steht still, nativer Zeiger.
8. Tab wechseln und zurückkommen: Der Hintergrund war pausiert.
9. Nur mit der Tastatur durchtabben, Fokusring muss überall sichtbar sein.
10. Impressum und Datenschutz gegenlesen: inhaltlich unverändert.

---

## 9. Rollback

```bash
git fetch origin
git checkout main
git reset --hard origin/backup/pre-v7-2026-08-10
git push --force-with-lease origin main
```

Zielstand ist `1ec3415`, also v6. GitHub Pages baut nach dem Push automatisch neu.

Nicht-destruktive Alternative:

```bash
git fetch origin
git checkout main
git revert --no-commit 9fe5bda^..9fe5bda
git commit -m "Revert v7"
git push origin main
```

**Bestehende Branches, keiner gelöscht:** `backup/pre-v7-2026-08-10`,
`backup/pre-v6-2026-08-10`, `backup/pre-redesign-2026-08-09`, `redesign/v7`,
`redesign/v6`, `redesign/v4`, `claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

- **v6** (`backup/pre-v6-2026-08-10`, `0f3ce00`): erste monochrome Visitenkarte,
  vier Blöcke, Registermarke, Cursor, Korn. Zu blass und zu gleichförmig — daraus
  entstand v7.
- **v4** (`backup/pre-redesign-2026-08-09`, `bf18260d`): technisches Datenblatt mit
  Amber-Akzent und Node-Schema. Schriften und Barrierefreiheits-Arbeit von dort
  sind bis heute in Gebrauch.
