# Redesign-Report — tr1stan.de

**Stand:** 2026-08-31
**Aktuelle Fassung:** v15 — die Inhalte stehen hinter dem Terminal
**Arbeitsbranch:** `redesign/v15`
**Backup-Branch:** `backup/pre-v15-2026-08-31`

---

## 1. Rollback-Punkt

| | |
|---|---|
| Backup-Branch | `backup/pre-v15-2026-08-31` |
| Commit darin | `9231703` (Live-Stand v14) |
| Zurückrollen | `git checkout main && git reset --hard backup/pre-v15-2026-08-31 && git push --force-with-lease origin main` |

`CNAME`, `robots.txt` und `favicon.svg` sind Byte für Byte dieselben wie dort.
An `impressum.html`, `datenschutz.html` und `404.html` hat sich ausschließlich
die Versionsnummer der Assets geändert.

---

## 2. Was neu ist

Die Startseite besteht aus Hero, Terminal und Footer. Die sechs Abschnitte —
Wie es anfing, Warum es geblieben ist, Was ich mache, Ehrlich gesagt, Was als
Nächstes kommt, Kontakt — sind als sichtbare Blöcke verschwunden. Was sie
gesagt haben, gibt es über Befehle.

Neue Befehle: **`all`** gibt alle Themen nacheinander aus, **`honest`** das,
was vorher unter „Ehrlich gesagt" stand. Alle bisherigen Befehle bleiben.
Die antippbaren Chips sind jetzt auch auf dem Desktop zu sehen.

Die Szene und der Hero sind unverändert geblieben — bis auf eine notwendige
Anpassung, siehe unten.

---

## 3. Die eine Entscheidung, die vom Vorschlag abweicht

Die Vorgabe schlägt vor, die Inhalte „zum Beispiel [in] einem Container mit dem
hidden-Attribut" abzulegen — mit der Begründung, dass Suchmaschinen und
Vorlesehilfen sonst nichts mehr finden.

**Genau das würde `hidden` verhindern.** Ein Element mit `hidden` ist nicht nur
unsichtbar, es ist aus dem Zugänglichkeitsbaum genommen: eine Vorlesehilfe
findet den Text dann nicht mehr. Dasselbe gilt für `display: none` und
`visibility: hidden`.

Ich habe deshalb die Begründung ernster genommen als das Beispiel. Versteckt
wird ausschließlich über die Zuschneide-Eigenschaften: ein Pixel Kantenlänge,
`overflow: hidden`, `clip-path: inset(50%)`. Der Text bleibt im Baum, wird aber
nirgends gemalt. Belegt mit einem Bildvergleich: färbt man den ganzen Speicher
knallrot ein, ändert sich am gerenderten Bild **kein einziges Pixel**.

Weitere selbst getroffene Entscheidungen:

- **Der Speicher ist die einzige Quelle.** Das Terminal liest die Themen über
  `data-topic` aus dem Dokument und setzt sie als Text. Es gibt die Texte nicht
  ein zweites Mal im Skript — nachgewiesen, siehe Prüfergebnisse.
- **Zwei Wege zurück an die Oberfläche.** `<noscript>` im Kopf hebt den
  Zuschnitt auf, wie verlangt. Zusätzlich `html:not(.has-js)`: kommt das Skript
  zwar an, scheitert aber, nimmt ein Zweizeiler im Kopf die Klasse `has-js`
  wieder ab, und es passiert dasselbe. Ohne diesen zweiten Weg hätte ein
  fehlgeschlagenes Skript ein totes Terminal und sonst nichts hinterlassen.
- **Ein sichtbarer Hinweis über dem Terminal.** Ohne ihn säße man vor einer
  Kommandozeile ohne zu wissen, dass dort etwas zu holen ist. Er nennt `help`
  und `all` und steht als echter Text auf der Seite, nicht nur in der Ausgabe.
- **Die Szene musste angepasst werden.** Die Seite ist nur noch halb so lang.
  Die Dämpfung von Sonne, Sternen und Raster hing am Scrollweg und war deshalb
  noch kaum wirksam, wenn das Terminal ins Bild kam. Sie greift jetzt nach drei
  Vierteln eines Bildschirms statt nach 1,1, und die Abschnittsschleier nehmen
  unter dem Hero mehr weg. Abgedunkelt wird die Szene, nie der Text aufgehellt.
- **Die fünf Abschnittsmuster aus v12 sind aus dem Stylesheet geflogen.** Ihre
  Abschnitte gibt es nicht mehr; sie hätten nichts mehr zu gestalten gehabt.
  138 Zeilen weniger.
- **`neofetch` zählt jetzt Themen statt Abschnitte.** „Abschnitte: 1" wäre zwar
  richtig, aber nichtssagend gewesen.

---

## 4. Prüfergebnisse

**91 Browserprüfungen, 207 statische Prüfungen — alle bestanden.**

### Kein Klartext mehr, aber alles im Dokument

| Prüfung | Ergebnis |
|---|---|
| Blöcke im Inhalt | genau einer, und das ist das Terminal |
| Alte Abschnitts-IDs | keine mehr im Markup |
| Speicher | 1 × 1 px, `overflow: hidden`, `clip-path: inset(50%)` |
| Nicht `display:none`, nicht `visibility:hidden` | bestätigt — der Text bleibt im Baum |
| Bildvergleich mit knallrot gefärbtem Speicher | kein Pixel Unterschied |
| 16 Textbausteine im ausgelieferten HTML | alle vorhanden |
| Dieselben Bausteine im Skript | **keiner** — sie stehen genau einmal |
| Ausserhalb des Speichers im Markup | keiner |

### Das Terminal

Alle 18 Befehlsformen wurden ausgeführt und ihre Ausgabe gegen die Texte im
Dokument geprüft: `help`, `all`, `about`, `skills`, `honest`, `next`,
`contact`, `whoami`, `ls`, `cat` für alle fünf Themen, `neofetch`, `sudo`,
`exit`, `clear`.

| | |
|---|---|
| `all` | gibt alle 16 Textbausteine aus |
| Fokus beim Laden | auf `body`, nicht im Terminal |
| HTML- und Skript-Eingabe | bleibt Text, kein `img`, kein `script`, nichts ausgeführt |
| Links | `mailto:` und GitHub anklickbar, aus Elementen gebaut |
| Chips | neun, auf dem Desktop sichtbar, auf dem Finger 61 × 44 px |
| Mittig | 480 px links wie rechts bei 1280 px |
| Ausgabebereich | 448 px hoch, eigener Scrollbereich |
| Seitenhöhe beim Ausgeben | unverändert |

### Ohne JavaScript, ohne WebGL, mit reduzierter Bewegung

| | |
|---|---|
| Ohne JavaScript | Speicher 1216 × 1174 px sichtbar, Terminal ausgeblendet, Hinweis da, alle 16 Inhalte lesbar |
| Ohne WebGL | CSS-Szene aus v12 übernimmt, Terminal läuft, Speicher bleibt versteckt |
| Reduzierte Bewegung | keine 3D-Szene, kein Blinken, Ausgabe sofort vollständig |

### Lesbarkeit gegen die gerenderte Szene

| Breite | Fließtext mindestens | Bedienelemente mindestens |
|---|---|---|
| 390 px | 7,17:1 | 7,33:1 |
| 768 px | 11,91:1 | 7,06:1 |
| 1280 px | 12,19:1 | 5,55:1 |
| 1920 px | 12,91:1 | 7,83:1 |

### Mobil

Kein waagerechtes Scrollen bei 320, 360, 390 und 430 px. Eingabe 16 px. Chips
61 × 44 px. Beim Fokussieren der Eingabe springt die Seite um **0 px**.

### Rechtsseiten

Beide unverändert, alle Abschnitte normal sichtbar, kein Speicher eingebaut,
die Pflichtangabe steht im Klartext auf der Seite.

### Gefundene und behobene Fehler

1. **Die Szene stand noch fast ungedämpft hinter dem Terminal.** Die Dämpfung
   hing am Scrollweg, und die Seite ist seit v15 nur noch halb so lang. Der
   Hinweistext über dem Terminal kam dadurch auf 6,54:1, die Überschrift auf
   4,06:1. Behoben über die frühere Dämpfung und stärkere Schleier.

Drei weitere Meldungen kamen aus meinen eigenen Prüfskripten:

- Die Kontrastmessung liess Textzeilen gelten, die im Scrollbereich des
  Terminals längst nach oben herausgelaufen waren. Die Sichtbarkeitsprüfung
  akzeptierte jeden getroffenen Vorfahren, also auch `main`. Gemessen wurde
  dann der Hintergrund einer ganz anderen Stelle — daher Werte bis herunter auf
  1,00:1. Jetzt zählt nur der Treffer selbst oder etwas darin.
- Die Chip-Größe wurde am Rechteck gemessen. Unter der Mobil-Emulation ist das
  mit dem Seitenmaßstab multipliziert und fiel dadurch auf 42,6 px, obwohl die
  CSS-Größe 44 px beträgt. Jetzt wird `offsetHeight` genommen.
- Der „Sprung beim Fokussieren" von 977 px war das Hinscrollen des
  Testwerkzeugs zum Terminal, nicht das Fokussieren. Gemessen wird jetzt erst
  nach dem Hinscrollen — Ergebnis 0 px.

Dazu fünf veraltete Zusicherungen aus v12 und v14, die Abschnitte prüften, die
v15 absichtlich entfernt: wechselnde Ausrichtungen, wechselnde Spaltenbreiten,
die breitere Bahn, die Abstufungen und die Stelle des Terminals zwischen zwei
Abschnitten.

### Sichtprüfung

Je vier Aufnahmen bei 390, 768, 1280 und 1920 px, dazu das Terminal im Betrieb
und die Seite ohne JavaScript. Ausser Hero, Terminal und Footer ist kein
Inhaltstext zu sehen. Die Seite wirkt nicht leer: der Hero füllt den ersten
Bildschirm, das Terminal den zweiten.

---

## 5. Deploy

| | |
|---|---|
| Merge-Commit | `85b896d` |
| Inhalts-Commit | `00ac48a` |
| Workflow | `pages build and deployment` |

Die Seite selbst kann ich aus dieser Umgebung nicht abrufen — der Egress-Proxy
sperrt `tr1stan.de` und `github.io`. Geprüft wurde gegen einen lokalen Nachbau
von GitHub Pages, bestätigt wird der Deploy über die Actions-API.

---

## 6. Offene Punkte und Risiken

- **Suchmaschinen bewerten zugeschnittenen Text zurückhaltender** als normal
  sichtbaren. Der Text ist im HTML, wird ausgeliefert und ist im
  Zugänglichkeitsbaum — mehr lässt sich nicht tun, wenn er gleichzeitig
  unsichtbar sein soll. Das ist der Preis der Vorgabe, nicht ein Fehler.
- **Vorlesehilfen bekommen alles auf einmal**, weil der Speicher im Baum steht.
  Für sie ist die Seite also keine Kommandozeile, sondern eine Textseite. Das
  halte ich für richtig, es ist aber eine Entscheidung.
- **Die Bildrate auf echter Hardware bleibt ungeprüft**, wie in v13 und v14.
- **Wer JavaScript hat, sieht ohne Tippen nichts** ausser Hero und Hinweis.
  Genau so gewollt — aber es ist eine bewusste Hürde.

---

## 7. Was du manuell prüfen solltest

1. `help`, dann `all` — kommt wirklich alles?
2. `cat honest` und `cat quatsch` — der eine gibt aus, der andere weist freundlich ab.
3. JavaScript im Browser abschalten und neu laden: steht die ganze Seite als Text da?
4. Mit dem Vorleseprogramm über die Seite gehen: sind die Inhalte auffindbar?
5. Auf dem Telefon: Chips gut zu treffen, springt beim Antippen der Eingabe nichts?
6. Impressum und Datenschutz aufrufen: unverändert und normal lesbar?

---

## 8. Bestehende Branches

Keiner wurde gelöscht: `backup/pre-v15-2026-08-31`, `backup/pre-v14-2026-08-27`,
`backup/pre-v13-2026-08-27`, `backup/pre-v12-2026-08-20`,
`backup/pre-v11-2026-08-17`, `backup/pre-v10-2026-08-14`,
`backup/pre-v9-2026-08-14`, `backup/pre-v9-2026-08-10` (gleicher Commit),
`backup/pre-v7-2026-08-10`, `backup/pre-v6-2026-08-10`,
`backup/pre-redesign-2026-08-09`, `redesign/v15`, `redesign/v14`,
`redesign/v13`, `redesign/v12`, `redesign/v11`, `redesign/v10`, `redesign/v9`,
`redesign/v7`, `redesign/v6`, `redesign/v4`, `claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

- **v14** (`backup/pre-v15-2026-08-31`, `9231703`): kurzer Hero-Name, Kamera nur
  noch vorwärts, Sternschnuppen, erstes Terminal.
- **v13** (`backup/pre-v14-2026-08-27`, `4be5f98`): gerenderte 3D-Szene mit
  three.js r185 aus `/vendor/`, CSS-Szene als Rückfall.
- **v12** (`backup/pre-v13-2026-08-27`, `8082679`): Abschnitte ohne Kästen,
  Hero-Szene getrennt vom laufenden Rasterboden. Diese CSS-Szene ist weiterhin
  der Rückfall und bleibt vollständig im Code.
- **v11** (`backup/pre-v12-2026-08-20`, `c60a997`): Chrome-Typografie,
  Spiegelung, CRT-Overlay, scroll-gekoppelte Szene.
- **v10** (`backup/pre-v11-2026-08-17`, `6c5cf3f`): Szene fixiert hinter der
  ganzen Seite, Sonne kreisrund und hinter den Bergen.
- **v9** (`backup/pre-v10-2026-08-14`, `b45506a`): erste Synthwave-Fassung.
- **v7** (`backup/pre-v9-2026-08-14`, `c3ab2b0`): monochrome Visitenkarte.
- **v4** (`backup/pre-redesign-2026-08-09`, `bf18260d`): technisches Datenblatt.
  Die selbst gehosteten Schriften stammen von dort.
