# Konzept: Runde 7 — Dokumentenlenkung (Prüffristen, Externe Dokumente, Aufbewahrung & Vernichtung)

> **Status:** Abgestimmt (02.09.2026, Corcken + Mone). Umsetzungs-Grundlage für Runde 7.
> Ergänzend gilt `docs/konzept-sichtbarkeit.md` (Sichtbarkeit & Leserechte, gleicher Tag).

---

## Aufgabe 10 — Prüffristen

**Entscheidungen (02.09.2026):**
- Prüfintervall **individuell je Dokument**: `Document.reviewIntervalMonths Int?` (optional —
  ohne Intervall keine Prüffälligkeit).
- `DocumentVersion.nextReviewDate DateTime?` — wird bei Freigabe (Released) gesetzt
  (Freigabedatum + Intervall).
- Fällig-Liste `/documents/prueffaellig`: Released-Dokumente mit `nextReviewDate <= jetzt`;
  solche Versionen tragen in der gesamten UI ein Badge **„Prüfung überfällig"**
  (Status bleibt Released).

**Prüf-Ablauf — zwei Wege, ausgehend von der Fällig-Liste:**
1. **Prüfung MIT Änderung:** Neue Minor-Bearbeitungsrunde (z. B. 1.0 → 1.1) — bestehender
   Workflow; die neue Version bekommt bei Freigabe ihr `nextReviewDate`.
2. **Prüfung OHNE Änderung (Mone-Entscheidung 02.09.2026):** Läuft **genauso wie eine
   Änderung** durch den Workflow — Ersteller gibt zur Prüfung frei, Prüfer prüft, Freigeber
   gibt frei — **aber ohne neue Revisionsnummer** (weder Minor noch Major):
   - Die Version **bleibt während der Prüfung Released** (Dokument bleibt lesbar);
     die Prüfung läuft über Aufgaben (WorkflowTask) auf derselben Version, kein Statuswechsel.
   - Der Abschluss (Freigabe) verschiebt nur `nextReviewDate` um das Intervall nach vorn
     und erzeugt einen Audit-Eintrag (wer, wann, „Prüfung ohne Änderung").
   - Dafür ist im Service ein eigener Modus nötig (z. B. `submitForReview`/`approve` mit
     Flag `reReview` bzw. eigene Funktionen), der keinen Versionssprung macht.

---

## Aufgabe 11 — Externe Dokumente (globale Dateien)

**Entscheidungen (02.09.2026, konsolidiert mit dem Upload-Strang):**
- `FileAsset.isGlobal Boolean @default(false)`.
- **Globale Liste** als Tab in der Mediathek („Globale Dokumente"), sichtbar für
  ADMIN + EDITOR; VIEWER sehen den Tab nicht.
- **Download-Pförtner (`/api/files/[key]`):** `isGlobal === true` → Download erlaubt für
  jeden angemeldeten ADMIN/EDITOR (auch ohne Dokument-Bindung); für VIEWER greift die
  normale Regel (nur über Bindung an für sie sichtbare Released-Version).
- **Schreib-/Löschrechte:** Nur ADMIN/EDITOR dürfen Dateien als global hochladen bzw.
  markieren (Rollencheck im Service, nicht nur UI). Papierkorb: nur Owner **oder ADMIN**
  (trashFile um ADMIN-Ausnahme erweitern).
- Rollenbegriff geklärt: „Ersteller/Prüfer/Freigeber" aus der ursprünglichen Vorgabe =
  Systemrollen ADMIN/EDITOR.

---

## Aufgabe 12 — Aufbewahrung & Vernichtung (Vier-Augen)

**Entscheidungen (02.09.2026):**
- `DocumentType.retentionMonths Int @default(120)` (Frist-Quelle = Dokumenttyp, keine
  „und/oder"-Regel).
- `DocumentVersion.retentionEndDate DateTime?` — gesetzt, wenn eine Version **archiviert**
  (durch neue Freigabe ersetzt) oder **zurückgezogen** wird: `obsoleteDate + retentionMonths`.
  - Achtung: `obsoleteDate` muss auch bei der **Archivierung** gesetzt werden (bei Withdrawn
    geschieht das bereits).
  - Mone bestätigt: Frist bei zurückgezogenen Dokumenten **ab Rückzugsdatum**.
- **Vernichtet werden einzelne Versionen, nie das Dokument** (Gerüst bleibt für aktuelle/
  künftige Versionen).
- **Neues Modell `DestructionRequest`:** `documentVersionId`, `requestedById`,
  `confirmedById String?`, `status` (PENDING/EXECUTED/REJECTED).
- **UI `/admin/archiv`:** listet nur Versionen mit `retentionEndDate <= jetzt`.
  - Schritt 1: Admin A beantragt Vernichtung (Pflichtkommentar).
  - Schritt 2: Admin B führt aus — **Service erzwingt hart `confirmedById !== requestedById`**
    (zwei verschiedene Admins).
- **Logische Vernichtung (Ausführung):**
  - `content` der Version → `[VERNICHTET]`.
  - FileAsset-Zeilen bleiben in der DB (Audit-Lückenlosigkeit), erhalten `destroyedAt`;
    physische Dateien (Original + Varianten) werden über das Storage-Backend gelöscht.
  - Download-Pförtner: `destroyedAt` → 404 (analog `trashedAt`); Detailansicht einer
    Destroyed-Version rendert keine Download-Links mehr.
  - Version-Status → `Destroyed` (Enum erweitern; Lebenszyklus-Kette, QM-Auswertungen und
    VIEWER-Sichtbarkeit explizit behandeln).

---

## Verknüpfung mit dem Sichtbarkeits-Konzept

`docs/konzept-sichtbarkeit.md` (PUBLIC/SCOPED, `canReadVersion`, externe Benutzer,
GMP-Archiv-Logik) ist Teil von Runde 7 — die Prüffällig-Liste, die globale Liste und das
Archiv respektieren `canReadVersion`.
