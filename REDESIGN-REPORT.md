# Redesign-Report — tr1stan.de

**Stand:** 2026-08-10
**Aktuelle Fassung:** v6 — kurze persönliche Visitenkarte, streng monochrom
**Arbeitsbranch:** `redesign/v6`
**Backup-Branch:** `backup/pre-v6-2026-08-10`

---

## 1. Rollback-Punkt

| | |
|---|---|
| **Backup-Branch** | `backup/pre-v6-2026-08-10` |
| **Zeigt auf** | `0f3ce00` — das Datenblatt-Design, das vor v6 live war |
| **Status** | gepusht, bleibt bestehen |

Der exakte Befehl steht in Abschnitt 9.

---

## 2. Ausgangslage (Phase 0)

| Feststellung | Ergebnis | Wie ermittelt |
|---|---|---|
| Default-Branch | `main` | `git remote show origin` |
| Deploy-Weg | GitHub Pages aus dem **Branch-Root** von `main`, über den eingebauten Lauf `pages build and deployment`. Kein eigener Workflow im Repo. | kein `.github/workflows/`; Actions-API |
| CNAME | vorhanden, `tr1stan.de\n`, 11 Bytes | `od -c CNAME` |
| Name für den Hero | `Tristan Witt`, wortgleich aus dem Adressblock von `impressum.html` | gezielt aus `<address>` gelesen, nicht aus dem ersten `<strong>` der Seite — dort steht die Domain |

---

## 3. Geänderte, neue und gelöschte Dateien

**Geändert:** `index.html` (vollständig neu), `style.css` (vollständig neu),
`script.js` (neu geschrieben), `favicon.svg` (neue Marke), `README.md`,
`impressum.html` und `datenschutz.html` (nur Markup), `404.html` (Styling und
zwei Formulierungen), `REDESIGN-REPORT.md`.

**Neu:** keine Datei.
**Gelöscht:** keine Datei. `CNAME`, `robots.txt`, `favicon.svg`, `404.html` und
`sitemap.xml` sind vollständig erhalten.

### Was ersatzlos entfernt wurde

Das Node-Schema samt DNS-, WEB- und MAIL-Boxen; die Zeile Host / Domain / Mail /
Build; sämtliche Hinweise auf Hosting, DNS, Mail-Provider, Build-Verfahren,
„statisch ausgeliefert", „keine externen Requests", Maßstab und Revisionsnummer;
die Command Palette samt Auslöser in der Navigation; der vertikale Sektionsindex
01–05; alle verbliebenen Platzhalterwerte.

Auf `404.html` wurden zusätzlich zwei Formulierungen entschärft: „war nie Teil
dieses Nodes" wurde zu „war nie Teil dieser Seite", und der Footer-Zusatz
„private tech node" ist entfallen. Auf den Rechtsseiten steht dieser Zusatz
weiterhin, weil dort kein Textknoten angefasst werden durfte.

---

## 4. Selbst getroffene Entscheidungen

1. **Kommagetrennte Vorgaben als Listen gesetzt.** „Pros" und „Was als Nächstes
   kommt" waren je ein langer Aufzählungssatz. Auf einer Visitenkarte mit kurzen
   Zeilen liest sich das schlecht. Ich habe die Aufzählungen an den Kommas in
   Listenpunkte zerlegt — **kein Wort geändert, keins ergänzt, keins entfernt**.
   „Cons" bleibt ein Satz.

2. **Keine Navigation auf der Startseite.** Bei vier Blöcken auf einer kurzen
   Seite wäre ein Sprungmenü Ballast. Der Header trägt nur noch die Marke, die
   Rechtslinks stehen im Footer. Die Rechtsseiten behalten ihre Navigation, weil
   sie zurückführen muss.

3. **Fortschritts-Haarlinie im Header entfernt.** Nicht in der Streichliste, aber
   auf einer Seite dieser Länge sinnlos und ein weiteres technisches Signal.

4. **Header ist deckend statt durchscheinend.** Ich hatte zuerst
   `backdrop-filter` gesetzt. Auf fast-schwarzem Grund ist der Effekt unsichtbar,
   kostet aber eine eigene Compositing-Ebene und erzeugte in der Prüfung ein
   Malartefakt auf sehr hohen Viewports (Abschnitt 6).

5. **Hintergrundbewegung als reines CSS**, nicht als Canvas: zwei sehr große,
   sehr blasse Lichtflächen driften über 104 s und 137 s aneinander vorbei. Nur
   composited Transforms, kein Neuzeichnen pro Bild, dadurch kein Messaufwand und
   nichts, was ein Skript am Laufen halten müsste. Auf Viewports unter 760 px ist
   die Bewegung ganz aus — sicherer, als sie auf schwachen Geräten zu drosseln.

6. **Cursor erscheint erst nach der ersten echten Mausbewegung.** Sonst klebt der
   Ring beim Laden sichtbar in der linken oberen Ecke. Gefunden im Screenshot,
   nicht in einem Test.

7. **Farbschema als acht Werte.** Alle Farben sind neutrale Töne desselben warmen
   Farbtons; der helle Satz steht direkt darunter im Kommentar. Umdrehen heißt
   acht Zeilen ersetzen, sonst nichts.

8. **GitHub-Link zeigt auf `github.com/tr1stannnnnn`**, hergeleitet aus dem
   Repository dieser Seite. Es ist ein Link, keine geladene Ressource — beim
   Seitenaufruf geht weiterhin kein einziger Request nach außen.

9. **Basteleien bewusst allgemein gehalten.** Vier Zeilen ohne Gerätenamen,
   Dienste oder Netzstruktur, damit dort nichts über die eigene Infrastruktur
   steht.

---

## 5. Rechtstexte: was genau passiert ist

`impressum.html` und `datenschutz.html` wurden ausschließlich in Markup und
Klassen angefasst. Maschinell geprüft gegen den vorherigen Live-Stand:

- sichtbarer Text **zu 100 % identisch** (1499 bzw. 4896 Zeichen)
- `meta description` beider Seiten unverändert

**Eine einzige Abweichung auf Markup-Ebene, offen deklariert:** Im Logo stand
bisher das Kürzel `t1` als Text in einem `aria-hidden`-Element. Es ist der neuen
Registermarke gewichen. Das Prüfskript weist nach, dass `t1` das *einzige*
entfallene Wort ist. Es ist reine Dekoration und wurde Screenreadern nie
vorgelesen — inhaltlich hat sich damit nichts geändert.

---

## 6. Prüfergebnisse (Phase 3)

Geprüft mit echtem Chromium gegen einen lokalen GitHub-Pages-Emulator.

**Browser-Suite — 107 Einzelprüfungen, alle bestanden**, unter anderem:
keine externen Requests auf allen vier Seiten; keine JS-Fehler; beide Fonts
geladen; kein horizontales Scrollen bei 360 / 768 / 1280 / 1920; alle internen
Links und Anker; genau eine `h1` je Seite ohne Ebenensprung; sichtbarer
Fokusring; Command Palette und Sektionsindex nachweislich verschwunden;
Copy-Button schreibt die Adresse wirklich in die Zwischenablage; Cursor aktiv am
Desktop, **aus auf Touch**, **aus bei reduzierter Bewegung**, Links darunter
klickbar; Hintergrunddrift läuft, liegt bei `z-index: -3`, nimmt keine
Pointer-Events, **pausiert bei `document.hidden`**, ist bei reduzierter Bewegung
und auf Mobilgeräten komplett statisch; Korn per Inline-SVG bei 4,5 % Deckkraft;
ohne JavaScript bleiben Inhalt, Mailadresse und nativer Zeiger erhalten.

**Statische Gates — 38 Prüfungen, alle bestanden:** keiner der verbotenen
Begriffe (GitHub Pages, Proton, DNS, AAAA, Build, Node-Schema, Maßstab, REV,
Ortsnamen) außerhalb der Rechtsseiten; keine Prozentwerte, Meter oder Balken
irgendwo; keine Ressource von fremden Hosts; CNAME unverändert; Meta-Tags
konsistent mit `theme-color: #0A0A0A`; alle 15 Farbwerte chromaarm im selben
Farbton (Spanne 5,4 Grad); Kontraste 16,48 / 9,37 / 5,61 : 1.

### Im Zuge der Prüfung gefunden und behoben

1. **Querscrollen bei 360 und 768 px.** Die Passmarken saßen mit `-5px`
   außerhalb ihres Containers und verbreiterten die Seite um exakt 5 px. Sie
   sitzen jetzt auf der Rasterkante.
2. **Cursor-Ring klebte beim Laden in der Ecke**, bis die Maus zum ersten Mal
   bewegt wurde.
3. **Malartefakt durch `backdrop-filter`:** Auf sehr hohen Viewports zeichnete
   Chromium einen Geisterabzug der Footer-Zeile unter den Header. Nachweis, dass
   es kein Element war: `elementFromPoint` fand dort nur die Hero-Sektion, und
   derselbe Bereich einzeln aufgenommen war leer. Der Filter ist entfernt.

Zwei weitere Treffer waren **Fehler in meinen Prüfskripten**, nicht auf der
Seite, und sind dort korrigiert: die Maße `100%` des Korn-Rechtecks wurden als
Prozentwert gewertet, und der Monochromie-Test verwarf warme Grautöne wegen
eines zu strengen Schwellwerts.

---

## 7. Deploy (Phase 4)

| | |
|---|---|
| Merge | `redesign/v6` mit `--no-ff` nach `main` |
| Push | `0f3ce00..e0934e7` |
| Pages-Lauf | `pages build and deployment` für `e0934e7` — **completed / success** |
| Rückfall nötig? | Nein |

---

## 8. Offene Punkte und Risiken

| Punkt | Einschätzung |
|---|---|
| **Live-Abruf nicht möglich** | Der Egress-Proxy dieser Umgebung blockt `tr1stan.de` und `github.io`. Der Deploy ist nur über die Actions-API bestätigt, nicht durch Abruf der echten Seite. **Bitte selbst im Browser gegenprüfen.** |
| Korn per SVG-Filter | Ein Turbulenzfilter über den ganzen Viewport ist auf sehr alten Mobilgeräten spürbar. Er wird einmal gerastert; falls es dort ruckelt, `.grain { display: none }` unter einer Media Query genügt. |
| Cursor blendet den I-Beam aus | Über Text zeigt der Zeiger kein Textcursor-Symbol mehr. Markieren funktioniert unverändert, die Rückmeldung fehlt aber. |
| Kein automatischer Regressionsschutz | Die Prüfskripte liegen außerhalb des Repos; ohne Build gibt es hier keine CI. |
| `→` fehlt im Zeichensatz | Bleibt bestehen: Das `latin`-Subset kennt U+2192 nicht. |
| Zwei Blöcke überschneiden sich thematisch | „Pros" und „Basteleien" liegen inhaltlich nah beieinander, weil beide Blöcke vorgegeben waren. |

---

## 9. Was du manuell prüfen solltest

1. Startseite öffnen: nur vier Blöcke, kein Diagramm, keine Service-Zeile,
   nirgends eine Ortsangabe.
2. Maus bewegen: Fadenkreuz folgt exakt, Ring läuft nach und wächst über
   „chef@tr1stan.de" und den Buttons.
3. Auf dem Handy öffnen: **kein** Custom Cursor, Hintergrund steht still.
4. Bewegung reduzieren einschalten (macOS: Bedienungshilfen › Anzeige) und neu
   laden: nichts bewegt sich, nativer Zeiger.
5. Tab wechseln und zurückkommen: Der Hintergrund war währenddessen pausiert.
6. Copy-Button drücken und irgendwo einfügen.
7. Nur mit der Tastatur durchtabben: erster Druck zeigt den Skip-Link, der
   Fokusring ist überall sichtbar.
8. Impressum und Datenschutz gegenlesen: inhaltlich muss alles unverändert sein.
9. Legacy-Pfade: `tr1stan.de/impressum`, `/privacy`, `/pages/index`.

---

## 10. Rollback

```bash
git fetch origin
git checkout main
git reset --hard origin/backup/pre-v6-2026-08-10
git push --force-with-lease origin main
```

Zielstand ist `0f3ce00`, also das Datenblatt-Design. GitHub Pages baut nach dem
Push automatisch neu.

Nicht-destruktive Alternative:

```bash
git fetch origin
git checkout main
git revert --no-commit e0934e7^..e0934e7
git commit -m "Revert v6"
git push origin main
```

**Bestehende Branches, keiner gelöscht:** `backup/pre-v6-2026-08-10`,
`backup/pre-redesign-2026-08-09`, `redesign/v6`, `redesign/v4`,
`claude/visual-redesign-v5-yhc4qp`.

---

## Anhang: frühere Fassung (v4, 2026-08-09)

Der Vorgänger war ein technisches Datenblatt mit Amber-Akzent, Node-Schema und
selbst gehosteten Schriften. Backup-Branch `backup/pre-redesign-2026-08-09`
(`bf18260d`), Arbeitsbranch `redesign/v4`. Die Schriften und die
Barrierefreiheits-Arbeit von damals sind in v6 übernommen; Akzentfarbe,
Diagramm, Statuslabels und Befehlspalette sind entfallen.
