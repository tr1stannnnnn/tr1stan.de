# Redesign-Report — tr1stan.de

**Stand:** 2026-08-27
**Aktuelle Fassung:** v14 — kurzer Hero-Name, Kamera nur noch vorwärts, Sternschnuppen, Terminal
**Arbeitsbranch:** `redesign/v14`
**Backup-Branch:** `backup/pre-v14-2026-08-27`

---

## 1. Rollback-Punkt

| | |
|---|---|
| Backup-Branch | `backup/pre-v14-2026-08-27` |
| Commit darin | `4be5f98` (Live-Stand v13) |
| Zurückrollen | `git checkout main && git reset --hard backup/pre-v14-2026-08-27 && git push --force-with-lease origin main` |

`CNAME`, `robots.txt` und `favicon.svg` sind Byte für Byte dieselben wie dort.
An `impressum.html`, `datenschutz.html` und `404.html` hat sich ausschließlich
die Versionsnummer der Assets geändert, sonst nichts.

---

## 2. Was neu ist

**Der Name im Hero** lautet nur noch `tr1stan`. Der bürgerliche Name ist von der
Startseite verschwunden, auch aus Titel und og-Angaben. Er steht jetzt nur noch
dort, wo er Pflichtangabe ist: in `impressum.html` und `datenschutz.html`, beide
unangetastet. Nachgeprüft über alle Dateien des Repos.

**Die Kamera fliegt nur noch geradeaus.** Kein Anheben, kein Nicken. Höhe und
Blickwinkel sind Konstanten; beim Scrollen wird sie ausschließlich schneller,
gedämpft in beide Richtungen.

**Sternschnuppen** fallen durch den oberen Himmel: drei wiederverwendete
Objekte, unregelmäßige Abstände, nie zwei am selben Ort, Textur im Code
gezeichnet.

**Ein bedienbares Terminal** zwischen „Was ich mache" und „Ehrlich gesagt", mit
fünfzehn Befehlen, Verlauf, Vervollständigung und Tippeffekt. Es ist der einzige
Kasten auf der Seite.

---

## 3. Selbst getroffene Entscheidungen

- **Der Preis für die geradeaus fliegende Kamera.** Wenn der Blickwinkel fest
  steht, bleibt der Horizont auf gleicher Bildschirmhöhe — und die Sonne stünde
  hinter dem Fließtext. Genau das war der Fehler aus v11. Zwei Dinge halten das
  auseinander: die Sonne wandert langsam zur Seite, und Sonne, Schein, Sterne
  und Rasterlinien nehmen unter dem Hero so weit zurück, dass ein ruhiger Schein
  bleibt. Abgedunkelt wird die Szene, nie der Text aufgehellt.
- **Die Sterne mussten mit gedämpft werden.** In v13 nickte die Kamera weg, der
  Himmel verschwand und die Sterne mit ihm. Jetzt stehen sie die ganze Seite
  über im Bild — als helle Punkte hinter Buchstaben, gemessen bis auf 1,5:1
  herunter. Sie gehen deshalb von 90 auf 10 Prozent Deckkraft zurück.
- **Die seitliche Drift wird am sichtbaren Ausschnitt gemessen**, nicht in
  festen Welteinheiten. Siehe Fehler 1 unten.
- **Sternschnuppen starten nur, solange der Hero im Bild ist.** Die Vorgabe
  verlangt, dass sie nie über Textbereichen laufen. Unter dem Hero ist der obere
  Himmel aber genau der Bereich, in dem Text steht. Die Bahnen liegen zusätzlich
  immer über der Oberkante der Sonnenscheibe und weit über dem Terrain.
- **Der blinkende Cursor sitzt am Ende der Ausgabe**, nicht in der Eingabezeile.
  Dort blinkt die Schreibmarke des Browsers ohnehin, und ein zweiter Block am
  rechten Rand einer breiten Eingabe sähe nach Fehler aus.
- **Während eine Zeile tippt, ist sie vor der Vorlesehilfe verborgen**; erst die
  fertige Zeile taucht in der Live-Region auf. Zeichen für Zeichen vorlesen zu
  lassen wäre unbrauchbar.
- **`neofetch` zeigt nur Nachprüfbares:** Seitenname, Aufbau, Anzahl der
  Abschnitte (live gezählt), Schriften, welche Szene gerade läuft, Cookies,
  Tracker, fremde Hosts, Fenstergröße, Sprache. Keine Laufzeiten, keine
  erfundenen Systemwerte.
- **Zur Regel „nichts nur im Terminal":** Ich lese sie als Inhalte. `about`,
  `skills`, `next` und `contact` geben wortgleich das aus, was in den
  Abschnitten steht — geprüft gegen den Seitentext ohne den Terminal-Abschnitt.
  `whoami` gibt die Hero-Zeile aus. `neofetch`, `ls` und `help` beschreiben das
  Terminal selbst und tragen keinen Inhalt, der sonst fehlen würde.

---

## 4. Prüfergebnisse

**104 Browserprüfungen, 193 statische Prüfungen — alle bestanden.**

### Die Kamera

| | |
|---|---|
| Kamerahöhe über fünf Scrollstände | konstant 9,5 |
| Nicken (rotX) | 0,000 an jedem Stand |
| Gieren (rotY) | 0,000 an jedem Stand |
| Blickwinkel | konstant 62 Grad |
| Drift der Sonne | 0 → 481 → 497 Einheiten, nur in eine Richtung |
| Deckkraft der Sonne | 1,00 → 0,158 → 0,130 |
| Deckkraft der Sterne | 0,90 → 0,125 → 0,100 |

### Die Sonne bleibt sichtbar

Gemessen mit ausgeblendetem Inhalt, an vier Scrollständen je Breite:

| Breite | im Hero | unter dem Hero | Helligkeit Sonne / Himmel |
|---|---|---|---|
| 390 px | 56 793 Pixel | 1 361 Pixel | 0,020 gegen 0,005 |
| 1280 px | 50 896 Pixel | 1 071 – 1 163 Pixel | 0,020 gegen 0,003 |
| 1920 px | 93 291 Pixel | 1 949 – 2 262 Pixel | 0,020 gegen 0,002 |

Die Scheibe ist unten also rund viermal so hell wie der Himmel daneben — ein
Schein, der da ist, ohne zu drücken.

### Lesbarkeit

| Breite | Fließtext mindestens | Bedienelemente mindestens |
|---|---|---|
| 390 px | 12,17:1 | 5,67:1 |
| 768 px | 10,50:1 | 6,47:1 |
| 1280 px | 9,75:1 | 6,35:1 |
| 1920 px | 11,58:1 | 6,02:1 |

Gemessen über fünf Scrollstände je Breite, gegen die tatsächlich gerenderte
Szene, auf den echten Zeilenkästen des Textes. **Positivprobe:** mit hellem
Grund fällt derselbe Wert auf 1,00:1 — die Messung schlägt also an.

### Sternschnuppen

Über 100 Sekunden beobachtet: **acht Stück**, Abstände 13,8 / 11,6 / 11,8 / 9,4 /
9,5 / 10,8 / 14,0 Sekunden — unregelmäßig und innerhalb der Vorgabe von acht bis
fünfzehn. Der niedrigste Punkt einer Bahn lag bei 0,600 der halben Bildhöhe;
die Oberkante der Sonnenscheibe liegt bei etwa 0,57. Keine Bahn kam ihr näher,
keine berührte das Terrain.

### Das Terminal

Alle fünfzehn Befehle wurden tatsächlich ausgeführt und ihre Ausgabe geprüft:
`help`, `about`, `skills`, `next`, `contact`, `clear`, `whoami`, `ls`,
`cat about|skills|next|contact`, `neofetch`, `sudo`, `exit`.

| Prüfung | Ergebnis |
|---|---|
| Fokus beim Laden | liegt auf `body`, nicht im Terminal |
| HTML- und Skript-Eingabe | bleibt Text, kein `img`, kein `script`, nichts ausgeführt |
| Rückmeldung auf unbekannten Befehl | gibt die Eingabe wortwörtlich als Text aus |
| Eingabelänge | auf 120 Zeichen begrenzt |
| Verlauf | Pfeil hoch holt zurück, Pfeil runter geht auf leer |
| Vervollständigung | `neo` → `neofetch`, `cat sk` → `cat skills` |
| Strg+L | leert |
| Klick ins Terminal | setzt den Fokus, Seite springt um 0 px |
| Seitenhöhe beim Ausgeben | 3 580 px vorher wie nachher |
| Eingabe | 16 px, iOS zoomt nicht |
| Chips | sieben, auf Fingergeräten mindestens 44 × 44 px |
| Inhalte auch außerhalb | alle 13 Textbausteine stehen im normalen Seitentext |

### Rückfall und Barrierefreiheit

| | |
|---|---|
| Ohne WebGL | CSS-Szene aus v12 übernimmt, three.js wird nicht geladen, Terminal läuft |
| `prefers-reduced-motion` | keine 3D-Szene, keine Sternschnuppen, kein Download, Cursor blinkt nicht, Ausgabe sofort vollständig |
| Ohne JavaScript | Terminal ausgeblendet, Hinweis sichtbar, alle übrigen Abschnitte unberührt |
| Fokusring | `solid 2px rgb(251,228,255)` auch auf der Terminaleingabe |
| Überschriften | eine H1, danach sieben H2 |
| Live-Region | `role="log"`, `aria-live="polite"`, `aria-relevant="additions"` |
| Externe Requests | keine, auf allen vier Seiten |
| Waagerechtes Scrollen | keins bei 320 / 360 / 390 / 430 / 768 / 1280 / 1920 |

### Gefundene und behobene Fehler

1. **Die Sonne war im Hochformat aus dem Bild geschoben.** Die seitliche Drift
   war ein fester Wert in Welteinheiten. Bei 390 × 844 sieht die Kamera auf
   Sonnenentfernung aber nur ein Drittel der Breite, die sie bei 1280 sieht —
   die Sonne stand weit außerhalb des Bildes. Die Drift wird jetzt am sichtbaren
   Ausschnitt gemessen und nach oben begrenzt, damit sie nicht über den Rand des
   Terrains hinauswandert.
2. **Der Tippeffekt verhungerte auf langsamen Geräten.** Er zählte Zeichen je
   Zeitgeber, und ein Zeitgeber wartet auf den Hauptfaden: bei zehn Bildern je
   Sekunde kamen drei Zeichen alle hundert Millisekunden heraus. Getippt wird
   jetzt nach der Uhr — die Begrüßung steht damit auch dort in 0,3 Sekunden.
3. **Die Sterne blieben hell.** Solange die Kamera in v13 wegnickte, verschwand
   der Himmel; jetzt steht er die ganze Seite über im Bild. Einzelne Sterne
   hinter Buchstaben drückten den Kontrast auf 1,5:1. Sie nehmen jetzt mit
   zurück.

Vier weitere Meldungen kamen aus meinen eigenen Prüfskripten, nicht von der
Seite: die Prüfung „ohne JavaScript ist alles sichtbar" zählte das Terminal mit,
das dort ausdrücklich ausgeblendet sein soll; die Textbaustein-Liste erwartete
noch den alten Hero-Namen; die Regel „keine fremde URL im Skript" schlug auf den
GitHub-Link an, den das Terminal als anklickbares Element ausgibt — jetzt wird
zusätzlich geprüft, dass diese URL wirklich nur ein `href` ist und nirgends
geladen wird; und eine Zusicherung nannte noch den alten Namen der
Drift-Konstante.

### Sichtprüfung

Je vier Aufnahmen bei 390, 768, 1280 und 1920 px über die volle Seitenhöhe,
dazu das Terminal im Betrieb. Die Fahrt geht sichtbar geradeaus, ohne Kippen.
Die Sonne steht durchgehend im Bild, nach unten hin als ruhiger Schein rechts
außerhalb der Textspalte. Kein Text steht auf einer hellen Fläche.

---

## 5. Deploy

| | |
|---|---|
| Merge-Commit | `990d0a1` |
| Inhalts-Commit | `95d9459` |
| Workflow | `pages build and deployment` |

Die Seite selbst kann ich aus dieser Umgebung nicht abrufen — der Egress-Proxy
sperrt `tr1stan.de` und `github.io`. Geprüft wurde gegen einen lokalen Nachbau
von GitHub Pages, bestätigt wird der Deploy über die Actions-API.

---

## 6. Offene Punkte und Risiken

- **Die Bildrate auf echter Hardware bleibt ungeprüft**, wie schon in v13: die
  Prüfumgebung rastert in Software. Sternschnuppen und Terminal ändern daran
  wenig — die Sternschnuppen sind drei Flächen, das Terminal rendert nur beim
  Tippen. Die dreistufige Notbremse aus v13 ist unverändert aktiv.
- **Die Sonne steht auf schmalen Viewports zwangsläufig hinter Text.** Bei
  390 px füllt die Textspalte die Breite; ausweichen geht dort nicht. Deshalb
  greift die Dämpfung, und deshalb ist der Kontrast dort mit 12,17:1 gemessen
  der höchste der vier Breiten.
- **Die Sternschnuppen sind im Hero zu sehen, darunter nicht.** Das ist die
  Folge der Vorgabe, sie nie über Textbereichen laufen zu lassen.
- **Die Prüfung der Szene benutzt zwei lesende Auskünfte** (`view()` und
  `meteors()`), die das Modul nach außen gibt. Ohne sie liesse sich weder
  belegen, dass die Kamera wirklich geradeaus fliegt, noch wo die Bahnen
  verlaufen. Sie ändern nichts und kosten nichts.

---

## 7. Was du manuell prüfen solltest

1. Scrollen: kippt wirklich nichts mehr, geht es nur noch vorwärts?
2. Ein bis zwei Minuten im Hero stehen bleiben: kommen Sternschnuppen, und
   wirken die Abstände zufällig?
3. Im Terminal `help`, dann ein paar Befehle. Beim Tippen während einer Ausgabe:
   springt sie sofort komplett um?
4. Auf dem Telefon: zoomt die Seite beim Antippen der Eingabe? Springt sie weg?
   Sind die Chips gut zu treffen?
5. Ganz nach unten scrollen: ist die Sonne noch als Schein zu erkennen, ohne den
   Text zu stören?
6. Mit der Tastatur durch das Terminal: Fokusring sichtbar, Pfeiltasten,
   Tabulator, Strg+L?

---

## 8. Bestehende Branches

Keiner wurde gelöscht: `backup/pre-v14-2026-08-27`, `backup/pre-v13-2026-08-27`,
`backup/pre-v12-2026-08-20`, `backup/pre-v11-2026-08-17`,
`backup/pre-v10-2026-08-14`, `backup/pre-v9-2026-08-14`,
`backup/pre-v9-2026-08-10` (gleicher Commit), `backup/pre-v7-2026-08-10`,
`backup/pre-v6-2026-08-10`, `backup/pre-redesign-2026-08-09`, `redesign/v14`,
`redesign/v13`, `redesign/v12`, `redesign/v11`, `redesign/v10`, `redesign/v9`,
`redesign/v7`, `redesign/v6`, `redesign/v4`, `claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassungen

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
