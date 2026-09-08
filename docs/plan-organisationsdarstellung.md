# Plan: Organisations-Darstellung in Dokumentum (Text + Grafik)

> Status: **Auftrag** (05.09.2026) — für den Coding-Agenten (Antigravity).
> Fachlich: Corcken. Review/Verifikation: Hermes (tsc, E2E, Sichtprüfung).
> Betroffener Bereich: Admin-Seite „Organisation" (`app/[locale]/admin/org/`).

---

## 1. Problem

Die DB enthält jetzt die echte GeNo-Organisation (411 Departments, Baum-Tiefe 5,
Namen z. T. sehr lang, z. B. „Klinik für Allgemeine, Viszerale und Onkologische Chirurgie").
Die aktuelle Darstellung (`admin/org/page.tsx`) ist dafür nicht gebaut:

1. **Textliste rekursiv, alles aufgeklappt** — alle 417 Einheiten auf einmal gerendert
   (Server-rekursiv), keine Möglichkeit, Stränge zu- und aufzuklappen. Seite wird riesig.
2. **Keine Textumbrüche** — lange Namen/Description laufen aus dem Kasten/über den Rand
   (kein `overflow-wrap`), Layout bricht.
3. **Keine grafische Repräsentation** — nur die Textliste; es gibt kein Organigramm-Bild.

Ziel: Die Organisation **als Ordnerstruktur (Text)** und **als kompaktes Organigramm (Grafik)**
darstellen — beide auf- und zuklappbar, beide mit sauberen Textumbrüchen, ohne verschwendeten
Zwischenraum.

---

## 2. Zielbild

### 2.1 Textansicht — „Ordner-Stil" (Datei-Explorer-Metapher)

- Jede Einheit = eine **Zeile wie ein Ordner**: Chevron (▸/▾) + Ordner-Icon + Name
  (+ Kürzel `abbreviation` als kleines Badge, + Description als **umbrechende** Unterzeile,
  klein/grau, wenn vorhanden).
- **Klick auf den Chevron (oder die Zeile) klappt den Strang auf/zu.** Zustand nur
  clientseitig (kein URL-/Server-State nötig).
- **Initial:** nur die oberste Ebene offen (Wurzel-Einheiten sichtbar), alles andere zu —
  sonst explodiert die Ansicht bei 411 Einträgen.
- Zusätzlich zwei Knöpfe über der Liste: **„Alle aufklappen" / „Alle zuklappen"**.
- Einrückung + **Führungslinien** im Ordner-Stil (vertikale Linie je Tiefe,
  └─-artige Andeutung an den letzten Kindern — klassisches Tree-Outdent), damit die
  Zugehörigkeit auf einen Blick klar ist.
- **Umbruch überall:** `overflow-wrap: anywhere` (bzw. `break-words`) auf Name/Description;
  Zeile darf nie horizontal überlaufen. Die Aktions-Buttons (Untereinheit/Bearbeiten/Löschen)
  bleiben pro Zeile rechts erhalten (wie bisher, vertikal zentriert; bei schmalen
  Viewports umbrechen statt überlaufen).
- Einheiten **mit Kindern** bekommen ein Badge mit der Anzahl direkter Untereinheiten
  (z. B. „(14)") — hilft, ohne Aufklappen zu sehen, wo etwas liegt.

### 2.2 Grafik — kompaktes Organigramm

- Zweite Ansicht auf derselben Seite, Umschalter **„Liste | Diagramm"** (beide Daten
  identisch, gleiche Quelle).
- **Layout von links nach rechts** (Eltern links, Kinder rechts) — bewährte Richtung für
  tiefe Bäume; die Tiefe wächst horizontal, parallele Einheiten stapeln sich vertikal.
- **Knoten = kompakte Kästen** (abgerundet, dünne Umrandung) mit:
  - Name (fett), automatischer **Umbruch** bei langen Namen (mehrzeilige Kästen),
  - optional zweite Zeile: `abbreviation`/Description (klein, grau),
  - **kein fester Mindestabstand**: Knoten liegen dicht — vertikaler Abstand zwischen
    Geschwistern klein (≈ 6–10 px), horizontaler Ebenen-Abstand klein (≈ 24–36 px);
    die Kastenbreite ist begrenzt (z. B. max. 260 px), damit lange Namen umbrechen statt
    die Zeile in die Breite zu treiben.
- **Kollaps in der Grafik:** Klick auf einen Knoten (oder kleinen Chevron am Knoten)
  klappt den Teilbaum zu/auf; zugeklappte Knoten zeigen ein „+ n"-Badge.
- **Linien** zwischen Eltern- und Kinderkästen (orthogonal oder leicht geschwungen),
  Eltern vertikal zentriert zur Kindergruppe.
- **Initial:** alle Ebenen aufgeklappt ODER nur Ebene 1–2 (Entscheidung: nur Ebene 1–2,
  konsistent zur Textansicht; per „Alle aufklappen" erweiterbar).
- Canvas **wächst mit dem Inhalt** (Breite/Höhe = tatsächlich belegter Raum, kein
  künstlicher Zwischenraum), eingebettet in einen Scroll-Container mit fester max-Höhe.
- **Keine externe Diagramm-Bibliothek** nötig; keine neue Dependency ohne Rücksprache.

---

## 3. Technische Leitplanken (Repo-Konventionen, zwingend)

1. **Architektur:** Seite (`admin/org/page.tsx`) bleibt Server-Komponente: lädt Einheiten
   via Prisma (`prisma.department.findMany`) und reicht **serialisierbare** Props
   (flache Liste oder Baum) an Client-Komponenten. Neue, interaktive Ansichten sind
   **Client-Komponenten** (`"use client"` — hier zulässig, da Interaktion/Klappzustand).
2. **Neue Dateien** (je < 300 Zeilen, sonst aufteilen):
   - `components/org-tree-explorer.tsx` — Textansicht (Ordner-Stil)
   - `components/org-graph-view.tsx` — Diagrammansicht
   - ggf. `components/org-tree-toggle.tsx` oder Umschalter direkt in der Seite
   - Baum-Helfer in `lib/org-tree.ts` **erweitern** (z. B. `countChildren`,
     optional `buildOrgTree` unverändert lassen)
3. **Kein neues Datenmodell, keine Migration, keine Service-Änderung** — reine
   Darstellungs-Aufgabe. `OrgUnitForm`/Actions (`./actions`) bleiben unangetastet.
4. **UI-Texte** („Liste", „Diagramm", „Alle aufklappen", „Alle zuklappen", „Untereinheiten",
   Leer-Zustände, Tooltips) in den Übersetzungs-Katalog `messages/de.json` (next-intl,
   `useTranslations`) — KEINE hart kodierten UI-Texte in den neuen Komponenten.
   Bestehende harte Texte der Seite nur anfassen, wenn sie im geänderten Bereich liegen
   (dann sauber in den Katalog überführen).
5. **Stil:** Tailwind 4 (shadcn-Komponenten: `Button`, `Badge` falls vorhanden); Icons aus
   `lucide-react` (ChevronRight/ChevronDown/Folder/FolderOpen). Kein Inline-CSS-Overkill;
   Design an die bestehende Admin-Optik anlehnen (weiße Kästen, `rounded-lg`, graue
   Hover-Flächen).
6. **Kein hartes Löschen / keine Datenänderung** durch die neuen Komponenten (reine Anzeige).
7. **Barrierefreiheit/A11y:** Chevron-Buttons mit `aria-expanded`/`aria-label`; Tastatur
   bedienbar (Button statt bloßem div-Klick).
8. **Performance:** 400+ Knoten clientseitig ist unkritisch, aber: keine Re-Renderschleifen;
   Klappzustand als `Set<string>` (collapsed IDs) in einem `useState`; Diagramm-Layout nur
   bei Kollaps-Änderung neu berechnen. `useMemo` für Baum/Layout.

---

## 4. Umsetzungsschritte (Reihenfolge)

1. `lib/org-tree.ts`: Helfer ergänzen (`countChildren(nodes): Map<id, number>` oder
   rekursiv am Knoten).
2. Seite `admin/org/page.tsx`: Umschalter „Liste | Diagramm" (Default: Liste) + beide
   Ansichten bekommen dieselben Einheiten-Daten (flach + Baum); Riesen-Rekursion
   (`OrgTreeView`) durch die neue Explorer-Komponente ersetzen.
3. `components/org-tree-explorer.tsx` (Textansicht nach 2.1): rekursiver Baum mit
   Klappzustand, Führungslinien, Umbruch, Badges, Aktions-Buttons erhalten (Links werden
   als Props/`children` durchgereicht oder direkt importiert — Seite prüfen, sauberste
   Variante wählen).
4. `components/org-graph-view.tsx` (Diagramm nach 2.2): Layout-Rechenkern (post-order:
   Kinder vertikal stapeln → Eltern vertikal zentrieren; x = Ebene × (Kastenbreite +
   Abstand)), Kollaps, Kanten (SVG-Overlay oder CSS), Scroll-Container.
5. `messages/de.json`: neue Schlüssel ergänzen.
6. Selbsttest: `npm run seed:geno`-Daten (411 GeNo-Einheiten) laden, Seite öffnen,
   beide Ansichten prüfen.

---

## 5. Akzeptanzkriterien (Verifikation durch Hermes)

- [ ] `npx tsc --noEmit` grün (keine neuen Typfehler).
- [ ] Bestehende E2E-/Baseline-Tests grün (keine Regression auf org-Seite).
- [ ] Textansicht: nur oberste Ebene offen; Chevrons klappen Stränge auf/zu;
      „Alle auf-/zuklappen" funktioniert; lange Namen (z. B. „Klinik für Allgemeine,
      Viszerale und Onkologische Chirurgie") brechen **um**, kein horizontaler Overflow;
      Führungslinien sichtbar; Actions (Untereinheit/Bearbeiten/Löschen) weiterhin
      erreichbar und funktionsfähig.
- [ ] Diagramm: kompakte Kästen mit Umbruch, dichte Abstände, Kanten korrekt,
      Klick-Kollaps mit „+ n"-Badge, Scroll-Container ohne Riesencanvas,
      initial Ebene 1–2 sichtbar.
- [ ] Keine neuen Abhängigkeiten in `package.json`.
- [ ] Neue UI-Texte liegen in `messages/de.json` (keine hart kodierten Strings).
- [ ] Offene Fragen/Abweichungen im Abschlussbericht dokumentiert.

---

## 6. Offene Punkte (bewusst NICHT vorentschieden)

1. Soll der Diagramm-Knoten auch die **Description/Quellen-Zeile** zeigen oder nur den
   Namen? (Vorschlag: nur Name + optional Kürzel; Description bleibt in der Textansicht —
   sonst werden die Kästen wieder groß. Bei 411 Einheiten zählt Kompaktheit.)
2. Diagramm-Standard: „nur Ebene 1–2 offen" — reicht das, oder soll die Grafik initial
   alles zeigen (dann sehr groß, aber scrollbar)? (Vorschlag wie unter 2.2.)
3. Sollen die Ansichten auch **außerhalb** von Admin (z. B. bei der Geltungsbereichs-
   Auswahl eines Dokuments) genutzt werden? Dann lohnt es, die Explorer-Komponente
   **wiederverwendbar** zu bauen (Props: units, optional actions-Slot, initialExpanded).
   (Vorschlag: jetzt wiederverwendbar bauen, aber nur auf der Admin-Org-Seite einbauen.)
