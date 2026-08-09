# Redesign-Report — tr1stan.de

**Datum:** 2026-08-09
**Richtung:** Technisches Instrument / Datenblatt
**Arbeitsbranch:** `redesign/v4`
**Backup-Branch:** `backup/pre-redesign-2026-08-09`

---

## 1. Rollback-Punkt

| | |
|---|---|
| **Backup-Branch** | `backup/pre-redesign-2026-08-09` |
| **Zeigt auf** | `bf18260d` — der Stand, der vor dem Redesign live war |
| **Status** | nach GitHub gepusht, bleibt bestehen |

Der Rollback-Befehl steht am Ende dieses Dokuments.

---

## 2. Ausgangslage (Phase 0)

| Feststellung | Ergebnis | Wie ermittelt |
|---|---|---|
| Default-Branch | `main` | `git remote show origin` |
| Deploy-Weg | GitHub Pages aus **Branch-Root**, kein eigener Workflow | kein `.github/workflows/`; die Actions-API zeigt ausschließlich den eingebauten Lauf `pages build and deployment` |
| CNAME | vorhanden, Inhalt `tr1stan.de\n` (11 Bytes) | `od -c CNAME` |
| Besonderheit | Zu Beginn war `main` bereits auf `bf18260d` weitergerückt: PR #1 mit dem vorherigen v5-Design war gemergt. Das Redesign setzt darauf auf, nicht auf dem älteren Stand. | `git log origin/main` |

Die GitHub-Pages-API (`/repos/:owner/:repo/pages`) ist durch den Egress-Proxy dieser
Umgebung gesperrt (HTTP 403). Der Deploy-Weg wurde deshalb aus Repo-Fakten und den
Actions-Läufen abgeleitet statt direkt abgefragt.

---

## 3. Geänderte, neue und gelöschte Dateien

### Neu

| Datei | Zweck |
|---|---|
| `fonts/inter-var-latin.woff2` | Variable Font, Fließtext und Überschriften (48 KB) |
| `fonts/jetbrains-mono-var-latin.woff2` | Variable Font, Labels und Werte (40 KB) |
| `fonts/LICENSE-Inter.txt` | Lizenztext SIL OFL 1.1 |
| `fonts/LICENSE-JetBrainsMono.txt` | Lizenztext SIL OFL 1.1 |
| `REDESIGN-REPORT.md` | dieses Dokument |

### Geändert

| Datei | Art der Änderung |
|---|---|
| `index.html` | vollständig neu aufgebaut, fünf unterschiedlich strukturierte Sektionen |
| `style.css` | vollständig neu geschrieben und neu geordnet |
| `script.js` | neu geschrieben, Fake-Telemetrie entfernt |
| `impressum.html` | **nur** Markup und Klassen |
| `datenschutz.html` | **nur** Markup und Klassen |
| `404.html` | Styling angeglichen, Redirect-Logik unverändert übernommen |
| `README.md` | beschreibt die neue Richtung, Schriften und lokalen Betrieb |

### Gelöscht

Keine Datei wurde gelöscht. `CNAME`, `robots.txt`, `favicon.svg`, `404.html` und
`sitemap.xml` sind unangetastet bzw. inhaltlich unverändert geblieben.

---

## 4. Selbst getroffene Entscheidungen

Die Aufgabe gab die Richtung vor, nicht jede Einzelheit. Folgendes habe ich entschieden:

1. **Basis war das v5-Design, nicht der ältere Stand.** `main` war bereits weitergerückt.
   Ein Redesign gegen einen überholten Stand hätte den gemergten Fortschritt verworfen.

2. **Zwei Schriften statt einer.** Gefordert war *eine* selbst gehostete Variable Font. Die
   Vorgabe „Mono nur für Labels" verlangt aber zwangsläufig eine zweite Familie. Eine
   System-Mono hätte je nach Betriebssystem anders ausgesehen und die Präzision zerstört,
   von der dieses Design lebt. Kosten: 40 KB.

3. **`latin`-Subset statt vollem Zeichensatz.** Halbiert das Gewicht. Folge: `→` (U+2192)
   liegt außerhalb des Bereichs und wird im Inhalt vermieden — `↑` und `↓` sind abgedeckt
   und werden in der Befehlspalette genutzt.

4. **Sektion 03 „Vorhaben" ist die Full-Bleed-Sektion.** Sie hat die meisten Einträge und
   profitiert am stärksten von der Bandwirkung. Bewusst kontrastiert: 02 ist dicht und
   tabellarisch, 03 luftig und redaktionell.

5. **Fortschrittsbalken ersatzlos gestrichen, nicht ersetzt.** Prozentwerte wie „34 %" für
   einen geplanten Projekt-Hub waren nicht belegbar. Drei Vorhaben stehen jetzt gleichlautend
   auf `geplant` — das ist die ehrliche Antwort. Zur Differenzierung dient stattdessen das
   belegbare Feld „Bereich".

6. **Fortschritts-Haarlinie im Header behalten.** Sie ist scroll-getrieben, nicht
   selbstlaufend, und passt als Messanzeige zur Richtung.

7. **Root-relative Pfade** (`/style.css`, `/fonts/…`). Nötig, damit die Legacy-Redirects aus
   Unterpfaden wie `/pages/…` korrekt auflösen. Folge: lokal braucht es einen Webserver,
   Doppelklick auf die Datei genügt nicht. Im README dokumentiert.

8. **Auf den Rechtsseiten bleibt jeder Textknoten erhalten** — auch Nebensächliches wie
   „private tech node" im Footer oder „legal / § 5 DDG" im Logo. Damit die Startseite dazu
   nicht widersprüchlich wirkt, habe ich deren Footer auf denselben Wortlaut zurückgesetzt.

9. **`--c-ink-4` von `#55534F` auf `#7E7B76` angehoben.** Die Prüfung zeigte 2,56:1 bei
   zehn Regeln, die echten Text tragen. Das verfehlt WCAG AA. Preis: die beiden dunkelsten
   Grautöne liegen jetzt näher beieinander, die Tonhierarchie ist flacher. Zugänglichkeit
   schlägt Feinabstufung.

10. **Inline-Einzeiler im `<head>`** setzt `has-js`, damit JS-abhängige Bedienelemente ohne
    JavaScript gar nicht erst erscheinen und nicht kurz aufblitzen. Kein externer Request.

---

## 5. Verwendete Schriften und Lizenz

| Schrift | Version | Achse | Lizenz | Herkunft |
|---|---|---|---|---|
| Inter Variable | 5.3.0 (`@fontsource-variable/inter`) | `wght 100–900` | **SIL Open Font License 1.1** | rsms/inter |
| JetBrains Mono Variable | 5.3.0 (`@fontsource-variable/jetbrains-mono`) | `wght 100–800` | **SIL Open Font License 1.1** | JetBrains/JetBrainsMono |

Beide Lizenzen erlauben Weitergabe und Einbettung, auch kommerziell, solange der
Lizenztext beiliegt und die Schriften nicht einzeln verkauft werden. Die vollständigen
Texte liegen in `fonts/LICENSE-Inter.txt` und `fonts/LICENSE-JetBrainsMono.txt`.

Die Pakete wurden einmalig heruntergeladen, die `.woff2`-Dateien ins Repo gelegt und die
Paketquelle verworfen. Es gibt **keine** npm-Abhängigkeit im Projekt und zur Laufzeit
keinen externen Request.

---

## 6. Was ich bewusst nicht gemacht habe

| Nicht gemacht | Grund |
|---|---|
| Rechtstexte sprachlich geglättet | Ausdrücklich untersagt. Sichtbarer Text ist maschinell als zu 100 % identisch geprüft. |
| Das Stand-Datum `09.08.2026` angefasst | Es war zuvor bereits abgestimmt; ein Redesign ist kein Anlass, ein Rechtsdatum zu ändern. |
| `noindex` auf den Rechtsseiten wieder eingeführt | Widerspräche der `sitemap.xml`. In `404.html` bleibt `noindex` bewusst stehen. |
| Cookie-Banner, Analytics, externe Fonts | Verboten und dem Datenschutztext widersprechend, der genau deren Abwesenheit zusichert. |
| Neue Inhalte oder Projekte erfunden | Regel „keine erfundenen Inhalte". Es wurde nur entfernt, nie hinzugedichtet. |
| Den v5-Branch gelöscht | Bleibt als Historie erhalten. |
| Ein Build-Setup eingeführt | Widerspräche „kein Build, kein npm". |
| Bilder oder Icon-Sets ergänzt | Die Zeichnung ist Inline-SVG; jede Bilddatei wäre zusätzliches Gewicht ohne Nutzen. |

---

## 7. Prüfergebnisse (Phase 3)

Geprüft wurde gegen einen lokalen GitHub-Pages-Emulator mit echtem Chromium, nicht durch
Sichtprüfung.

**Browser-Suite — 100 Einzelprüfungen, alle bestanden:**

- keine externen Requests auf allen vier Seiten (jeder Request mitgeschnitten)
- keine JS-Fehler, beide Variable Fonts nachweislich geladen
- kein horizontales Scrollen bei 360 / 768 / 1280 / 1920 px auf allen vier Seiten
- alle internen Links und alle 27 Sprungmarken lösen auf
- alle referenzierten Assets liefern HTTP 200
- genau eine `h1` je Seite, keine übersprungene Überschriftenebene
- alle Buttons und Links haben einen zugänglichen Namen
- Befehlspalette: `Ctrl+K` öffnet, Filter grenzt korrekt ein, `Esc` schließt
- Copy-Button schreibt tatsächlich `chef@tr1stan.de` in die Zwischenablage
- Skip-Link ist erstes Tab-Ziel
- mobiles Menü öffnet und meldet `aria-expanded="true"`
- ohne JavaScript: Inhalt sichtbar, JS-abhängige Bedienelemente ausgeblendet
- `prefers-reduced-motion`: Einblendungen sofort sichtbar, Übergänge aus
- alle sechs Legacy-Redirects der 404-Seite greifen

**Statische Gates — alle bestanden:**

- keine fremden URLs in ausgelieferten Dateien, kein `src`/`href` auf fremde Hosts
- `CNAME` byte-identisch zum Stand vor dem Redesign
- Meta-Tags konsistent, `og:url` deckt sich mit `canonical`
- `sitemap.xml` deckt sich mit den Canonicals, `404.html` korrekt nicht enthalten
- Kontraste: 17,29 / 11,19 / 6,26 / 4,67 / 6,88 : 1 — alle ≥ 4,5:1
- **Rechtstexte: sichtbarer Text zu 100 % identisch** (1502 bzw. 4899 Zeichen)

**Im Zuge der Prüfung gefunden und behoben:**

1. `--c-ink-4` bei 2,56:1 mit echtem Text in zehn Regeln — WCAG-AA-Verstoß, angehoben.
2. `.hero-title span { display:block }` traf auch verschachtelte Spans, wodurch der
   Akzentpunkt hinter „Systemraum" auf eine eigene Zeile brach — auf direkte Kinder begrenzt.
3. Zwei Selektorkollisionen in der 404-Sektion (`.nf p` hätte Akzentfarbe und Codefarbe
   überschrieben) — vor dem ersten Rendern durch eine eigene Klasse aufgelöst.

---

## 7a. Deploy (Phase 4)

| | |
|---|---|
| Merge | `redesign/v4` mit `--no-ff` nach `main` |
| Push | `bf18260..f4f7f6c` auf `main` |
| Pages-Lauf | `pages build and deployment` für `f4f7f6cc` — **completed / success** |
| Rückfall nötig? | Nein. Der Backup-Branch wurde nicht angefasst. |

Der Deploy-Status stammt aus der Actions-API. Ein Abruf der ausgelieferten Seite war aus
dieser Umgebung nicht möglich (siehe unten).

---

## 8. Offene Punkte und Risiken

| Punkt | Einschätzung |
|---|---|
| **Live-Abruf nicht möglich** | Der Egress-Proxy dieser Umgebung blockt `tr1stan.de` und `github.io` (HTTP 000). Ich konnte den Deploy nur über die Actions-API verifizieren, nicht durch Abruf der echten Seite. **Bitte einmal selbst im Browser gegenprüfen.** |
| **Root-relative Pfade** | Bei einem Umzug in ein Unterverzeichnis (z. B. Projektseite statt Apex-Domain) brechen alle Pfade. Auf der aktuellen Domain korrekt. |
| **Tonhierarchie flacher** | Folge der Kontrastanhebung. Die beiden dunkelsten Grautöne sind schwerer zu unterscheiden. |
| **Kein automatisierter Regressionsschutz** | Die Prüf-Skripte liefen außerhalb des Repos. Ohne Build-Setup gibt es im Projekt keine CI, die das dauerhaft absichert. |
| **Schriftgewicht** | 88 KB zusätzlich. Durch `preload` und `font-display: swap` entsteht kein Blockieren, aber im ersten Frame kann kurz die Systemschrift stehen. |
| **Zeichenvorrat** | `→` fehlt im Subset. Wer künftig Inhalte ergänzt, sollte das Zeichen meiden oder das Subset erweitern. |

---

## 9. Was du manuell im Browser testen solltest

1. **Alle vier Seiten aufrufen** und prüfen, ob die Schrift wirklich Inter ist (nicht Arial
   oder System-UI). Ein Fallback wäre der erste Hinweis auf einen Pfadfehler.
2. **Mit dem Handy öffnen.** Menü auf- und zuklappen, in eine Sektion springen, prüfen ob
   sich das Menü dabei schließt.
3. **`Ctrl+K` bzw. `⌘K`** drücken, „daten" tippen, mit `↑`/`↓` wählen, `Enter` drücken.
4. **Copy-Button** anklicken und irgendwo einfügen — es muss `chef@tr1stan.de` erscheinen.
5. **Nur mit der Tastatur** durch die Startseite tabben: Der Fokusring muss immer sichtbar
   sein und der erste Tab-Druck den Skip-Link zeigen.
6. **Reduzierte Bewegung einschalten** (macOS: Bedienungshilfen › Anzeige › Bewegung
   reduzieren) und neu laden — nichts darf mehr einfliegen.
7. **Legacy-Pfade prüfen:** `tr1stan.de/impressum`, `tr1stan.de/privacy`,
   `tr1stan.de/pages/impressum.html` müssen auf den richtigen Seiten landen.
8. **Impressum und Datenschutz gegenlesen** — inhaltlich darf sich nichts geändert haben.
9. **Seite drucken** (Druckvorschau genügt): Es gibt ein eigenes Print-Stylesheet mit
   hellem Grund.

---

## 10. Rollback

Falls etwas nicht stimmt, stellt dieser Befehl den Stand von vor dem Redesign wieder her:

```bash
git fetch origin
git checkout main
git reset --hard origin/backup/pre-redesign-2026-08-09
git push --force-with-lease origin main
```

Der Zielstand ist Commit `bf18260d`. GitHub Pages baut nach dem Push automatisch neu; der
Durchlauf dauert üblicherweise ein bis zwei Minuten.

Nicht-destruktive Alternative, die die Historie erhält:

```bash
git fetch origin
git checkout main
git revert --no-commit f4f7f6c^..f4f7f6c
git commit -m "Revert redesign"
git push origin main
```

**Branches, die bestehen bleiben:** `backup/pre-redesign-2026-08-09`, `redesign/v4` und
`claude/visual-redesign-v5-yhc4qp`. Keiner davon wurde gelöscht.
