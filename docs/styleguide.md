# Styleguide Dokumentum — UI-Standard der QM-Dokumentenlenkung

> **Status:** Verbindlicher UI- und Komponenten-Standard für die gesamte Dokumentum-Applikation
> **Geltungsbereich:** Alle Listen, Tabellen, Baumansichten, Formulare, Workflow-Bereiche,
> Dialoge, Dashboards, Mediathek und Administrationsseiten
> **Ziel:** Hohe Informationsdichte bei maximaler visueller Ruhe, eindeutige Statussprache
> (GMP) und volle Verträglichkeit mit dem bestehenden Mehrtheme-System.

Dieser Guide ist die Übertragung eines CAD-/IDE-Stilguides auf **unsere Anwendungsfälle**
(QM-Dokumentenlenkung). Die Richtung — dicht, ruhig, klar ausgerichtet, statusgeführt — bleibt;
die konkreten Elemente (Stücklisten, Klemmen, Adern, BMK, Schaltpläne) sind bewusst ersetzt
durch Dokumente, Versionen, Aufgaben, Audit, Organisation und Mediathek.

---

## 1. Philosophie & Gestaltungsprinzipien

In einer QM-Dokumentenlenkung steht **Nachvollziehbarkeit, schnelle Erfassung und
fehlerfreie Bedienung** an erster Stelle. Große Weißräume, dekorative Farbverläufe und
verspielte Elemente kosten Bildschirmplatz und erzeugen kognitive Unruhe — in einem
regulierten Umfeld zusätzlich ein Risiko für Fehlbedienung.

### Die 7 Säulen unseres Looks

1. **Datendichte mit Augenmaß:** Fachliche Listen (Dokumente, Versionen, Audit, Aufgaben)
   nutzen eine feste, kompakte Zeilenhöhe, damit viele Datensätze ohne Scrollen erfassbar
   sind. Lesbarkeit und Trefferflächen bleiben erhalten (kein reiner Desktop-Look).
2. **Ruhige Flächen statt Dekoration:** Flache Karten, dünne Ränder, keine dekorativen
   Schatten/Verläufe. Farbe dient der **Bedeutung**, nie der Verschönerung.
3. **Eindeutige Statussprache (GMP):** Jeder Dokumentstatus, jede Aufgabe und jedes
   Prüfsignal hat eine **fest definierte, theme-unabhängige** Farbe (siehe §6). Status ist
   auch ohne Farbe erkennbar (Text/Badge).
4. **Saubere Ausrichtung & Ziffernflucht:** Identifikatoren (Dokumentnummern, Versionen,
   Hashes) in Monospace; Zahlen und Datumsangaben mit `tabular-nums` rechts- bzw. bündig.
5. **Eindeutige Selektion:** Aktive Zeile/aktiver Datensatz erhält eine zurückhaltende
   Primärfarb-Tönung plus klaren Textkontrast — niemals grelle Kontraste.
6. **Farbdisziplin & Theme-Verträglichkeit:** Neue UI verwendet ausschließlich **semantische
   Design-Tokens** (`bg-card`, `text-muted-foreground`, `border-border`, …), damit alle
   Themes funktionieren. Keine hartcodierten `gray-*`/`slate-*`-Klassen in neuen Komponenten.
7. **Nachweisbarkeit & Barrierefreiheit:** Fokusringe sichtbar, Tastaturbedienung möglich,
   Kontrast-Theme (WCAG-AA) berücksichtigt, Signaturen/Audit klar vom Rest abgesetzt.

---

## 2. Abgrenzung — was wir bewusst NICHT übernehmen

Der Ursprungsguide beschreibt ein CAD-Werkzeug. Folgende Elemente sind für uns **nicht
relevant** und werden nicht eingeführt:

| Element des Ursprungsguides | Warum bei uns nicht |
| :--- | :--- |
| TreeGrids für Stückliste (BOM), Klemmen, Adern, Symbole | Wir haben keine technischen Bauteildaten |
| 24px-Excel-Vollgitter (`border-r border-b` auf jeder Zelle) | Unsere Tabellen sind Auswertungslisten, keine Tabellenkalkulation |
| Inline-Editing direkt in der Tabellenzelle | Bearbeitung läuft über Formulare + Server Actions (§9) |
| Rechtsklick-Kontextmenüs (IDE-Stil) | Web-App; Aktionen sind sichtbare Buttons/Links |
| Drag&Drop-Umsortierung, Einfügemarken | Nicht vorgesehen (allenfalls später im Org-Baum) |
| Status-/Checkbox-Spalte `w-[28px]`, Batch-Checkboxen | Keine Massenauswahl-Funktionen im Datenmodell |
| Hoverkarten mit Vektor-Symbolvorschau/Pins | Keine Symbole; maximal verzögerte Textdetails (§16) |
| Spalten-Resize, Auto-Fit, Spalten-Visibility | Tabellen sind fest definierte Auswertungen |

Übernommen werden: **Prinzipien** (Dichte, Ruhe, Ausrichtung, Statussprache, Hierarchie-
Linien) und die **daraus abgeleiteten Standards** der folgenden Abschnitte.

---

## 3. Grundprinzipien (zwingend)

1. **Semantische Tokens statt Rohfarben.** Jede Komponente nutzt die Token-Klassen des
   Theme-Systems (`app/globals.css`): `bg-background`, `bg-card`, `text-foreground`,
   `text-muted-foreground`, `bg-muted`, `border-border`, `bg-primary`, `bg-destructive`,
   `ring-ring`, `chart-1…5`, `sidebar-*`. Nur **Statusfarben** (§6) sind bewusst fix.
2. **Deutsch + i18n.** UI-Texte nie hart ins JSX schreiben, sondern in `messages/de.json`
   über next-intl (Schlüssel deutsch). Fachinhalte (Dokumentinhalt) bleiben unübersetzt.
3. **Server-first.** Seiten sind Server-Komponenten; Formulare sind Server Actions und
   funktionieren **ohne Client-JS**. `"use client"` nur wenn technisch zwingend
   (z. B. Diagramme, Theme-Umschalter, Avatar-Crop, Org-Baum-Interaktion).
4. **Kein hartes Löschen sichtbar machen.** UI bietet Deaktivieren/Archivieren/Zurückziehen/
   Vernichten nach Fachlogik — nie einen nackten „Delete“-Button.
5. **Status-Labels pflegen.** Alle Enum-Labels und -Styles zentral in `lib/constants.ts`.
   Neue Enum-Werte sofort überall behandeln (Tabellen, Badges, Lebenszyklus, Auswertungen).

---

## 4. Layout & Raster

- **Seitencontainer:** `<div className="space-y-6">`, Seitenkopf als
  `flex items-center justify-between`.
- **Abstände:** `gap-2` innerhalb von Button-/Meta-Gruppen, `gap-4`/`gap-6` zwischen Blöcken,
  `p-4`/`p-6` in Karten. Keine willkürlichen Zwischenwerte.
- **Karten** (`components/ui/card.tsx`) sind der Standard-Container für jeden logischen Block.
- **KPI-Raster:** `grid gap-6 md:grid-cols-3` (Dashboard).
- **Tabellen-Container:** in eine Karte/einen Rahmen mit `rounded-lg border bg-card` gefasst,
  damit alle Themes tragen.
- **Breite:** Kein hartes `max-w-*` auf Seitenebene; Tabellen und Formulare nutzen die
  verfügbare Breite, Textblöcke begrenzen sich über `max-w-prose`/`max-w-md`.

---

## 5. Typografie & Ausrichtung

| Rolle | Klassen | Anmerkung |
| :--- | :--- | :--- |
| **Seitentitel (H1)** | `text-2xl font-bold` | Pro Seite genau einer |
| **Kartentitel** | `text-base font-medium` (`CardTitle`) | Kleinere Karten `text-sm font-medium` |
| **Fließtext / Bedienung** | `text-sm` | Standard für Formulare, Beschreibungen |
| **Meta / Hinweise** | `text-xs text-muted-foreground` | Zeitstempel, Hilfetexte, Zusatzinfo |
| **Tabelleninhalt** | `text-[13px]` | Etwas dichter als Fließtext |
| **Identifikatoren** | `font-mono` | Dokumentnummer, Version (`1.3`), SHA256, HMAC-Siegel |
| **Zahlen / Datum** | `tabular-nums` | Beträge, Zähler, Datums-/Zeitspalten |
| **Überlange Werte** | `truncate` + `title`-Attribut | Nie umbrechen in Tabellenzellen |

Regeln:
- **Ziffernflucht:** Numerische und Datumsspalten `text-right tabular-nums`; Versionsnummern
  `font-mono`.
- **Kein Blocksatz, keine Textverläufe.**
- **Monospace sparsam:** nur für technische Identifikatoren, nicht für Fließtext.

---

## 6. Farb- & Statussystem (Kernstück)

### 6.1 Semantische Theme-Tokens

Alle neutralen Flächen/ Texte kommen aus dem Theme (siehe `app/globals.css`). Dadurch
funktionieren **alle 9 Themes** (§18) automatisch.

| Element | Klassen (theme-abhängig) |
| :--- | :--- |
| Seitenhintergrund | `bg-background text-foreground` |
| Karte / Panel | `bg-card text-card-foreground border-border` |
| Sekundärfläche / Kopfzeile | `bg-muted text-muted-foreground` |
| Trennlinien | `border-border` |
| Primäraktion | `bg-primary text-primary-foreground` |
| Zerstörende Aktion | `text-destructive` / `bg-destructive` |
| Fokus | `ring-2 ring-ring outline-none` |

### 6.2 Status-Farbsprache (bewusst theme-unabhängig)

Status müssen in **jedem** Theme gleich gelesen werden (GMP). Daher fixe, gedeckte
Töne **mit Dark-Variante**, zentral in `lib/constants.ts`.

| Status (`DocumentStatus`) | Label | Light | Dark |
| :--- | :--- | :--- | :--- |
| `Draft` | Entwurf | `bg-slate-100 text-slate-700 border-slate-200` | `dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700` |
| `In_Review` | In Prüfung | `bg-amber-100 text-amber-800 border-amber-200` | `dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900` |
| `In_Approval` | In Freigabe | `bg-orange-100 text-orange-800 border-orange-200` | `dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900` |
| `Released` | Freigegeben | `bg-emerald-100 text-emerald-800 border-emerald-200` | `dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900` |
| `Archived` | Archiviert | `bg-slate-200 text-slate-600 border-slate-300` | `dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-700` |
| `Withdrawn` | Zurückgezogen | `bg-rose-100 text-rose-800 border-rose-200` | `dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900` |
| `Destroyed` | Vernichtet | `bg-slate-100 text-slate-500 border-slate-200 line-through` | `dark:bg-slate-800/60 dark:text-slate-500 dark:border-slate-700` |

Weitere Signale:

| Signal | Ton | Beispiel |
| :--- | :--- | :--- |
| „Prüffällig“ / überfällig | Danger | `bg-rose-100 text-rose-800` |
| Audit-Trail integer | Success | `bg-emerald-100 text-emerald-800` |
| Audit-Trail verletzt | Danger | `bg-rose-100 text-rose-800` + `border-rose-300` |
| Task-Typ „Freigabe“ | Info | `bg-sky-100 text-sky-800` |
| Task-Typ „Prüfung“ | Neutral/Outline | Outline-Badge |
| Rolle ADMIN | Betont | `bg-primary/10 text-primary` |
| Rolle EDITOR / VIEWER | Neutral | Outline-Badge |

Regeln:
- **Status ist textuell immer ausgeschrieben** — Farbe ist Verstärkung, nicht Träger.
- **Nie Farbe allein** zur Unterscheidung (Farbfehlsichtigkeit).
- **`Archived`/`Destroyed`** immer gedämpft; `Destroyed` zusätzlich `line-through`.

---

## 7. Tabellen & Listen

Betrifft: Dokumentenliste, Versionshistorie, Audit-Log, Aufgaben-Inbox, Benutzer-,
Dokumenttypen- und Job-Rollen-Listen.

### 7.1 Anatomie & Maße

| Element | Klassen / Wert |
| :--- | :--- |
| Tabellenkopf | `bg-muted/50 text-muted-foreground text-xs font-medium` |
| Kopfzeilenhöhe | `h-(--table-head-h)` — Standard 36px · Dokumentum 32px · Kompakt 28px |
| Datenzeilenhöhe | `h-(--table-row-h)` — Standard 32px · Dokumentum 28px · Kompakt 24px |
| Zellen-Padding | `px-(--table-cell-x) py-(--table-cell-y)` |
| Tabellenschrift | `text-[length:var(--table-font)]` — Standard/Dokumentum 13px · Kompakt 12px |
| Zeilentrennung | `border-b border-border` (nur horizontal — kein Excel-Vollgitter) |
| Hover | `hover:bg-muted/50` |
| Aktive/ausgewählte Zeile | `bg-primary/5 text-foreground` (kein grelles Blau) |
| Aktionen | letzte Spalte `text-right`, Buttons `size="sm"` |
| Leerer Zustand | `py-8 text-center text-muted-foreground text-sm` mit Zeilen-`colSpan` |

### 7.2 Spalten-Reihenfolge (Standard)

1. **Identifikator** (Dokumentnummer/Version) — `font-mono`.
2. **Beschreibung** (Titel/Objekt) — `truncate`, `max-w-md`, `title`.
3. **Klassifikation** (Typ, Job-Rolle, Organisation) — `text-muted-foreground`.
4. **Status** — Badge nach §6.2.
5. **Zeitangaben** — `text-muted-foreground tabular-nums`, `de-DE`-Format.
6. **Aktionen** — rechtsbündig.

### 7.3 Referenz-Markup

```tsx
<div className="rounded-lg border border-border bg-card">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Nummer</TableHead>
        <TableHead>Titel</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Aktion</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
            Keine Einträge gefunden.
          </TableCell>
        </TableRow>
      )}
      {rows.map((row) => (
        <TableRow key={row.id} className="h-8">
          <TableCell className="font-mono text-[13px]">{row.number}</TableCell>
          <TableCell className="max-w-md truncate" title={row.title}>{row.title}</TableCell>
          <TableCell>
            <Badge className={statusClasses(row.status)}>{statusLabel(row.status)}</Badge>
          </TableCell>
          <TableCell className="text-right">
            <Link href={row.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Ansehen
            </Link>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### 7.4 Filter & Suche über Listen

- Server-seitig über `searchParams` + Service-Layer (kein Client-State nötig).
- Formular `method="get"`, native `<select>` und Text-Input, Absenden-Button „Filtern“.
- Aktive Filter sichtbar; „Filter zurücksetzen“ als dezenter Textlink.
- Eingabehöhe einheitlich `h-9`, Fokus `ring-2 ring-ring`.

---

## 8. Bäume & Hierarchie (Organisationseinheiten)

Für verschachtelte Organisationseinheiten (`components/org-tree-explorer.tsx`) gilt das
Prinzip der **L-Führungslinien** — ruhige Hierarchieführung statt großer Einrückung.

| Regel | Wert |
| :--- | :--- |
| Einrückung pro Ebene | `ml-6` (im Org-Baum) |
| Vertikale Linie | `absolute -left-4 top-0 w-px bg-border/70` |
| Letztes Kind | vertikale Linie nur bis zur Abzweighöhe (`h-4.5`), nicht `bottom-0` |
| Horizontale Abzweigung | `absolute -left-4 top-4.5 w-3.5 h-px bg-border/70` |
| Auf-/Zuklappen | `ChevronDown` / `ChevronRight`, `size-4`, `aria-expanded` |
| Endknoten/Blätter | kein Toggle, Ordner-Icon gedämpft, Zähler als `text-xs text-muted-foreground` |
| Zeilencontainer | `rounded-lg border border-border/70 bg-card p-2.5`, Toggle-Zeile mit
  `hover:bg-accent/50`, `select-none`, `tabIndex`/Enter/Leertaste bedienbar |

Regeln:
- **Barrierefreiheit ist Pflicht:** aufklappbare Knoten sind per Tastatur erreichbar
  (`role="button"`, `aria-expanded`, Enter/Leertaste).
- **Kein Drag&Drop** im Baum (aktuell nicht vorgesehen).
- Alternative **Diagramm-Ansicht** (`org-graph-view.tsx`) bleibt ein Client-Feature.

---

## 9. Formulare & Eingaben

Betrifft alle Verwaltungs- und Workflow-Formulare (Dokument, Benutzer, Org-Einheit,
Job-Rolle, Dokumenttyp, SMTP, E-Mail-Vorlage, Konto).

| Element | Standard |
| :--- | :--- |
| Feldhöhe | `h-9` (Input/Select), mehrzeilig `Textarea` |
| Label | oberhalb, `text-sm font-medium text-foreground` |
| Hilfe/Fehler | `text-xs text-muted-foreground` · Fehler `text-xs text-destructive` |
| Select | **nativ** (`<select>`), nie Custom-Dropdown, wenn ohne JS möglich |
| Pflichtfelder | `required` + sichtbarer Hinweis „(Pflicht)“ |
| Submit | Primärbutton; sekundäre Aktion als `outline`/`ghost` |
| Fehlerbanner | `rounded-md bg-destructive/10 p-3 text-sm text-destructive` |
| Fokus | `focus-visible:ring-2 focus-visible:ring-ring` |
| Abstände | `space-y-4`, Felder in `space-y-1` (Label/Input/Fehler) |

Regeln:
- **Doppel-Submit verhindern:** Server Actions mit Validierung (z. B. Zod) im Service-Layer.
- **Alle Änderungen auditieren** (`logAudit`) — Formulare rufen ausschließlich Services auf.
- **Kein Stillstand ohne Rückmeldung:** Erfolg über Redirect + Statusmeldung, Fehler über
  Banner mit verständlichem deutschen Text.
- **Elektronische Signatur** (Freigabe/Vernichtung) als klar abgesetztes Panel: Passwortfeld
  (`type="password"`, `KeyRound`-Icon) + „Signaturbedeutung“ (Select) + Erklärtext, visuell
  vom restlichen Formular getrennt (`rounded-lg border bg-card p-4`).

---

## 10. Dialoge & Bestätigungen

- Modal (`components/ui/dialog.tsx`) nur für klar begrenzte Aufgaben.
- Kopf: `h-10 px-4 border-b border-border bg-muted/50 font-semibold`.
- Fuß: `px-4 py-3 border-t border-border flex justify-end gap-2`.
- **Destruktive Aktionen** (Zurückziehen, Vernichtung, Deaktivieren) verlangen eine
  Pflicht-Begründung (Textarea `required`) und farblich abgesetzten Bestätigungsbutton.
- Schließen per `Escape` und Fokusfalle (shadcn-Standard).

---

## 11. Buttons & Aktionen

`components/ui/button.tsx` (Varianten: `default`, `outline`, `secondary`, `ghost`,
`destructive`, `link`; Größen `sm`, `default`, `lg`, `icon`).

| Kontext | Empfehlung |
| :--- | :--- |
| Primäre Aktion einer Seite | `default` |
| Tabellenzeile / Nebensache | `outline` oder `ghost`, `size="sm"` |
| Rückzug/Vernichtung/Deaktivieren | `destructive` bzw. `text-destructive` bei Ghost |
| Nur-Icon (Header, Schließen) | `size="icon"` + `aria-label` |
| Inline-Textaktion | `link` |

Regeln: **eine** Primäraktion pro Ansicht; destruktive Aktionen nie als Primärfarbe;
Icons `size-4`, in `sm`-Buttons `size-3.5`.

---

## 12. Badges, Chips & Kennzeichnungen

- `Badge` für Status, Rollen, Typen, Kennzeichnungen (z. B. „Vorlage“, „Prüffällig“).
- Farben nach §6.2; Neutrales als `outline`, Betontes als gefüllt.
- Kompakte Zusatz-Tags: `text-[11px] px-1.5 py-0`.
- Nie mehrere kräftige Badges nebeneinander — Hierarchie wahren.

---

## 13. Workflow- & Lebenszyklusdarstellung

Der Workflow (`components/workflow-actions.tsx`, `components/lifecycle-chain.tsx`) ist das
Herzstück. Standards:

- **Statuskarten** spiegeln den aktuellen Schritt und tragen die Statusfarbe dezent als
  Rand/Hintergrund (`border-amber-200 bg-amber-50/50` etc.), Titel `text-base`.
- **Zuständigkeit** immer sichtbar: „zuständig: *Name*“.
- **Aktionsbereich** klar getrennt: primärer Fortschritt („Prüfung bestanden“, „Freigeben“)
  vs. „Zurück an den Ersteller mit Kommentar“ (`outline`, rotakzentuiert).
- **Lebenszyklus-Kette** (`Draft → In_Review → In_Approval → Released`, plus
  `Archived`/`Withdrawn`/`Destroyed`) als Badge-Reihe mit `ArrowRight`-Verbindern;
  vergangene Schritte gedämpft, aktueller Schritt in Statusfarbe, Zeitstempel `text-[10px]`.
- **Vier-Augen-Prinzip** und Signaturbedeutung deutlich kennzeichnen (§9).

---

## 14. Dashboard & Auswertungen (Charts)

- **KPI-Karten** (`grid gap-6 md:grid-cols-3`): Label `text-sm text-muted-foreground`,
  Wert `text-3xl font-bold`, Zusatz `text-xs text-muted-foreground`, Icon `size-4`.
- **Diagramme** (recharts, `components/charts.tsx`): nur als `"use client"`-Kinder.
- **Farben** ausschließlich aus `chart-1…5` (Theme-verträglich), nie Rohfarben.
- **Leerer Zustand** je Diagramm: `h-[300px] flex items-center justify-center text-sm text-muted-foreground`.
- Dashboard-Seiten bleiben Server-Komponenten; nur die Chart-Komponente ist clientseitig.

---

## 15. Mediathek

- **Galerie:** `grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Karte:** feste Vorschaufläche `h-40 bg-muted`, Datei/ Bild-Icon als Fallback,
  Titel `text-sm truncate`, Metazeilen `text-xs text-muted-foreground`.
- **Kopfbadges:** „In Verwendung (n)“ (`bg-primary text-primary-foreground`).
- **Tabs** (Aktive Dateien / Globale Dokumente / Papierkorb) als Link-Tabs; aktiver Tab
  hervorgehoben, Rollen-Guard serverseitig.
- **Papierkorb:** Resttage deutlich (`text-destructive`), Aktion „Wiederherstellen“.
- Uploads über Formular + Server Action; nie direkter Dateisystem-Zugriff im UI.

---

## 16. Tooltips & verzögerte Detailanzeige (optional)

Wo Detailinformationen nur auf Anforderung nötig sind (z. B. gekürzte Beschreibungen,
Audit-Hash-Erklärung), gilt: **nicht sofort aufpoppen.**

- Einschaltverzögerung **~0,6 s**; verlässt der Zeiger vorher das Element, wird der Timer
  verworfen.
- Erst bei tatsächlicher Anzeige laden (Lazy Loading), nicht im Initial-Payload.
- Umgesetzt über `title`-Attribut bei einfachen Fällen; für echte Karten ein portalfähiges
  Overlay (`position: fixed`), damit es nicht abgeschnitten wird.
- Kein Einsatz dort, wo ein Klick die Detailseite öffnet (z. B. Dokumenttitel).

---

## 17. Barrierefreiheit & GMP

- **Fokus immer sichtbar** (`focus-visible:ring-2 ring-ring`); das Theme „Starker Kontrast“
  verstärkt Fokus auf `3px` schwarz.
- **Tastaturbedienung** für alle interaktiven Elemente (Baum, Tabs, Dialoge).
- **Kontrast:** Text erfüllt mindestens WCAG-AA im Theme `kontrast`; Statusfarben haben
  ausreichenden Kontrast in Light und Dark.
- **Kein Informationsverlust ohne Farbe** (Textlabel ergänzt Farbe).
- **Berührungsziele** mindestens ~32 px hoch in Listenaktionen.
- **Nachvollziehbarkeit:** Alle datenändernden Aktionen laufen über Services mit
  `logAudit`; destruktive Aktionen erfordern Begründung und ggf. Vier-Augen-Prinzip.
- **Keine rohen Fehler** nach außen (`app/error.tsx`, `app/not-found.tsx`).

---

## 18. Theme-System (10 Themes)

Die App bietet zehn Themes über `data-theme` am `<html>`-Element, gespeichert als Cookie
und in `AppSetting` (`components/theme-provider.tsx`, `app/theme-actions.ts`):

`hell` · `dokumentum` · `dunkel` · `kontrast` · `sap90` · `kompakt` · `gruen` · `herbst` ·
`tiefsee` · `marine`

Das Theme **`dokumentum`** setzt den Look dieses Guides um (Slate/Blau, kleine Rundungen,
Datendichte 28px). Die **Datendichte der Tabellen** ist über CSS-Variablen theme-steuerbar:

| Variable | Standard | `dokumentum` | `kompakt` |
| :--- | :--- | :--- | :--- |
| `--table-head-h` | 36px | 32px | 28px |
| `--table-row-h` | 32px | 28px | 24px |
| `--table-cell-x` / `--table-cell-y` | 12px / 8px | 10px / 4px | 8px / 4px |
| `--table-font` | 13px | 13px | 12px |

Konsequenzen für jede neue Komponente:

- **Nur semantische Tokens** verwenden (`bg-card`, `text-muted-foreground`, `border-border`,
  `bg-muted`, `bg-primary`, `text-destructive`, `chart-*`).
- **Keine Theme-Sonderfälle** in Komponenten; Theme-Sonderlogik gehört nach `globals.css`.
- **Statusfarben sind theme-fix** (§6.2) und bleiben über alle Themes stabil.
- **Kompakt** reduziert die Grundschrift (`14px`) — Layouts müssen damit tragen.
- **SAP90/Kontrast** setzen `--radius` klein/0 — keine Abhängigkeit von großen Rundungen.
- **Dark-fähig:** Dunkle Themes (`dunkel`, `tiefsee`) sind kein Sonderfall, sondern
  Regelfall; alle Statusfarben brauchen `dark:`-Varianten.
- **Dichte kommt aus den `--table-*`-Variablen** — Tabellenhöhen/-schrift nie hart setzen.

---

## 19. Komponenten- & Code-Konventionen

- **Aufteilung:** Ziel max. ~300 Zeilen pro Datei; zusammengehörige Logik auslagern
  (Services nach `lib/services/`, Komponenten nach `components/`, Helfer nach `lib/`).
- **Service-Layer:** Geschäftslogik nie in Komponenten; Formulare/Seiten rufen Services.
- **Audit:** Jede datenändernde Service-Funktion ruft `logAudit`.
- **Kein hartes Löschen** (Benutzer deaktivieren, Versionen archivieren).
- **Auth-Guards** (`requireUser`/`requireAdmin`/`requireUserId`) in jeder geschützten
  Seite/Action.
- **UI-Texte** in `messages/de.json` (next-intl); **Status-Labels/Styles** in
  `lib/constants.ts`.
- **shadcn/ui** (`components/ui/*`) als Basis; Anpassungen über Tokens, nicht per
  Inline-Rohfarbe.
- **Wiederverwendung vor Neuentwicklung:** `PageHeader`, `StatusBadge` und `EmptyState`
  (`components/`) statt eigener Kopf-/Status-/Leerzustands-Markups.

---

## 20. Checkliste für neue Ansichten

- [ ] Seite ist Server-Komponente; Formulare laufen als Server Actions **ohne Client-JS**.
- [ ] Ausschließlich **semantische Theme-Tokens** verwendet (keine `gray-*`/`slate-*`-Rohfarben
      außerhalb des Status-Systems).
- [ ] Status über zentrale Labels/Styles aus `lib/constants.ts`, textuell + farblich.
- [ ] Alle Statusfarben besitzen **Dark-Varianten**.
- [ ] Tabellen nutzen die Dichte-Variablen (`components/ui/table.tsx`), Zelltrennung nur
      `border-b border-border`.
- [ ] `PageHeader`/`StatusBadge`/`EmptyState` statt eigener Markups verwendet.
- [ ] Identifikatoren `font-mono`; Zahlen/Datum `text-right tabular-nums`.
- [ ] Leerer Zustand mit `colSpan`-Hinweis statt leerer Fläche.
- [ ] Fokus sichtbar, Tastaturbedienung möglich, `aria-label` bei Icon-Buttons.
- [ ] Destruktive Aktionen abgesetzt (`destructive`), mit Pflicht-Begründung.
- [ ] UI-Texte in `messages/de.json`; keine hartcodierten deutschen Strings im JSX.
- [ ] Datenänderungen laufen über Services mit `logAudit`; kein hartes Löschen.
- [ ] Datei bleibt unter ~300 Zeilen bzw. ist sinnvoll aufgeteilt.
- [ ] `npx tsc --noEmit` ist fehlerfrei.

---

## 21. Umsetzungsstand

Der Guide ist umgesetzt als **beides**: ein Theme (Farben/Dichte) **plus** verbindliche
Komponenten-Konventionen.

**Theme-Ebene**
- Theme **`dokumentum`** in `app/globals.css` (Slate/Blau, kleine Rundungen, Datendichte),
  registriert in `app/theme-actions.ts`, `components/theme-selector.tsx`, `messages/de.json`.
- **Dichtevariablen** `--table-head-h/-row-h/-cell-x/-cell-y/-font` in `globals.css`;
  `components/ui/table.tsx` verwendet sie (Standard · `dokumentum` · `kompakt`).

**Komponenten-Ebene**
- Zentrale **UI-Bausteine**: `components/status-badge.tsx`, `page-header.tsx`, `empty-state.tsx`.
- **Status-Farbsystem** mit Dark-Varianten in `lib/constants.ts`; `StatusBadge` überall für
  Dokument-Status genutzt (Listen, Detail, Versionshistorie, Archiv).
- **Alle Seiten und Komponenten** auf semantische Theme-Tokens umgestellt (Seitenköpfe via
  `PageHeader`, Fehlermeldungen via `bg-destructive/10 text-destructive`, Erfolg via
  Emerald-Tokens, neutrale Flächen via `bg-card`/`bg-muted`/`text-muted-foreground`).
- **Diagramme** nutzen die Theme-Tokens `--chart-1…5` statt fester Hex-Farben.
- **Dunkle Themes** tragen überall mit (`dark:`-Varianten an allen Statusflächen).

**Bewusste Ausnahmen (fachlich begründet)**
- Kategorie-Akzente im Admin (Dokumenttypen/Job-Rollen/Audit/Auswertungen/Entwicklung) und
  die Rollen-Badges (ADMIN/EDITOR/VIEWER) nutzen feste, aber dark-fähige Farbtöne zur
  Typunterscheidung.
- Ordner-Symbol im Organisationsbaum (`text-amber-500`) und Status-Signale bleiben aktiv.

**Nächste Schritte (bei Bedarf, jeweils separat verifizieren)**
- Verbleibende Alt-Lint-Schulden (repo-weit `any`/unused) getrennt aufräumen — nicht Teil
  dieses UI-Standards.
- Optional: Dichte-Variablen weiterer Themes feinjustieren; weitere Ansichten bei neuen
  Features direkt nach diesem Guide bauen.
