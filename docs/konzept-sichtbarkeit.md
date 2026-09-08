# Konzept: Sichtbarkeit & Leserechte (Dokumentenlenkung)

> Status: **Entscheidungsgrundlage** (02.09.2026) — Entscheidungen von Mone (QM-Fachinstanz)
> und Corcken; Umsetzung folgt in Runde 7 (bzw. als Erweiterung des Lenkungs-Blocks).
> Analog zu `konzept-uploads.md`: fachliche Entscheidungen + technische Leitplanken.

---

## 1. Ausgangslage & Ziel

Mone (QM): „Es kann sehr gut sein, dass alle Dokumente für alle Betriebsangehörigen sichtbar
sein sollen — so lassen sich SOPs vergleichen, angleichen oder sogar fusionieren, wenn sie den
gleichen Vorgang für mehrere Teams/Abteilungen beschreiben. Das ist von Organisation zu
Organisation unterschiedlich. Es gibt aber auch Dokumente, die nicht öffentlich sein dürfen."

**Ziel:** Ein zweistufiges Sichtbarkeits-Modell, das pro Organisation einstellbar ist
(Standard je Dokumenttyp) und pro Dokument überschrieben werden kann — ohne eine komplexe
Rollen×Aktion-Matrix.

**Bild:** Jeder Dokumentordner trägt einen Stempel — „Betriebsöffentlich" oder
„Vertraulich – nur Geltungsbereich". Die Firma legt fest, welcher Stempel Standard ist
(je Dokumentart); einzelne Dokumente dürfen abweichen.

---

## 2. Entscheidungen (02.09.2026)

| # | Frage | Entscheidung |
|---|-------|--------------|
| 1 | Externe Benutzer (z. B. Lieferanten)? | Häkchen **„extern"** am Benutzerkonto. Externe sehen **nur** Dokumente, die ihnen explizit freigegeben sind — Betriebsöffentliches gilt für sie **nicht** automatisch. |
| 2 | Geltungsbereich pro Version oder pro Dokument? | **Pro Version** (bestehendes Modell: `ScopeDepartment`/`ScopeJobRole` an der Version). Eine neue Fassung kann einen anderen Kreis haben als die alte. |
| 3 | Rechte-Matrix (Rolle × Aktion)? | **Sichtbarkeits-Stufen reichen** (keine erweiterte Rollen×Aktion-Matrix in dieser Runde). |
| 4 | Archivierte (abgelöste) Fassungen? | **GMP-Archiv-Logik:** Leser arbeiten immer mit der aktuell freigegebenen Fassung; abgelöste Fassungen sind Archivgut — einsehbar nur für Admin und Beteiligte (Owner/Prüfer/Freigeber, Historie/Diff). |

---

## 3. Sichtbarkeits-Stufen

### Stufe A — „Betriebsöffentlich" (PUBLIC)
Freigegebene Versionen sind für **alle aktiven internen Benutzer** sichtbar und lesbar
(vergleichen, angleichen, fusionieren). Externe Konten zählen nicht dazu.

### Stufe B — „Geltungsbereich" (SCOPED)
Freigegebene Versionen sind nur für Benutzer sichtbar/lesbar, deren
**Organisationseinheit** (inkl. automatischer Expansion nach unten) oder deren
**Job-Rolle** im Geltungsbereich der Version liegt. Geltungsbereich = bestehende
`scopeDepartments` + `scopeJobRoles`.

### Erweiterung — externe Benutzer
- Konto-Häkchen `isExternal` am User.
- Externe sehen grundsätzlich **kein PUBLIC**.
- Zugriff erhalten sie nur über den **Geltungsbereich**: Die Version nimmt die Job-Rolle
  des externen Benutzers (bzw. eine eigene Rolle wie „Extern – Lieferant X") in ihre
  `scopeJobRoles` auf. Dann greift die normale SCOPED-Logik.
- Externe sind in der Regel VIEWER (Leserecht); Schreibrechte nur in Ausnahmefällen.

---

## 4. Wer sieht was? (Leserecht-Matrix, vereinfacht)

| Version-Status | PUBLIC | SCOPED | Archiviert (abgelöst) | Zurückgezogen / Vernichtet |
|---|---|---|---|---|
| Admin | ✓ | ✓ | ✓ | ✓ (Audit-/Archiv-Sicht) |
| Beteiligte (Owner/Ersteller/Prüfer/Freigeber) | ✓ | ✓ | ✓ (Historie) | ✓ (Historie) |
| Interner Mitarbeiter (Abteilung/Rolle im Scope) | ✓ | ✓ | – | – |
| Interner Mitarbeiter (nicht im Scope) | ✓ | – | – | – |
| Externer Benutzer | – | nur bei Rollen-Match | – | – |

Nicht-freigegebene Stände (Entwurf, In Prüfung, In Freigabe): wie bisher nur Beteiligte + Admin.

---

## 5. Technische Leitplanken (Umsetzung)

**Datenmodell (portabel, keine Enums):**
- `DocumentType.defaultVisibility String @default("PUBLIC")` — Standard-Stempel je Dokumentart
  (Werte `"PUBLIC"` / `"SCOPED"`, Konstanten in `lib/constants.ts`).
- `DocumentVersion.visibility String @default("PUBLIC")` — tatsächlicher Stempel der Fassung;
  wird beim Anlegen aus dem Typ-Default vorbelegt und darf pro Dokument überschrieben werden.
- `User.isExternal Boolean @default(false)`.
- Bestehende `scopeDepartments`/`scopeJobRoles` bleiben die einzige Quelle für „wer ist im
  Kreis" (keine dritte Scope-Ebene nötig).

**Service-Layer:**
- `canReadVersion(user, version)` als zentrale Helper-Funktion (in `document-helpers.ts`,
  analog `assertCanEditVersion`):
  1. ADMIN → immer.
  2. Beteiligte (Owner des Dokuments, createdBy/Reviewer/Approver der Version) → immer.
  3. Status Draft/In_Review/In_Approval → sonst niemand.
  4. Released: PUBLIC → interne aktive Benutzer; SCOPED → Abteilungs- (expanded) /
     Rollen-Match.
  5. Archived → nur Admin + Beteiligte (Archiv-Logik).
  6. Withdrawn/Destroyed → nur Admin (Audit-Sicht), in Listen/Ansichten für andere unsichtbar.
- Anlegen/Bearbeiten: `visibility` übernehmen; beim Versions-Kopieren
  (`buildVersionRelations`) `visibility` + Scopes mitkopieren (Scopes geschehen bereits).
- `listDocuments`, Detailseite, Historie, Download-Pförtner und (falls relevant) Mediathek
  nutzen `canReadVersion` statt der heutigen Vereinfachung „Released → jeder".
- **Download-Pförtner nachziehen:** Anhänge erben exakt die Sichtbarkeit der Version
  (bisher: Released → jeder Eingeloggte; wird auf `canReadVersion` umgestellt — betrifft
  auch `isGlobal`-Dateien aus dem Externe-Dokumente-Konzept).

**UI:**
- Dokumenttypen-Verwaltung (Runde 4): Auswahl Standard-Sichtbarkeit je Typ.
- Formular Anlegen/Bearbeiten: Auswahl PUBLIC/SCOPED (mit Typ-Default vorbelegt) +
  Geltungsbereich-Eingabe (bestehende Auswahl Abteilungen/Rollen).
- Dokumentlisten/Detail: dezentes Kennzeichen für SCOPED („Vertraulich"/Symbol).
- Benutzerverwaltung: Häkchen „extern".
- Prüffällig-Liste & Fälligkeits-Badge unverändert (nur Released-Dokumente, die der Nutzer
  lesen darf).

**Migration & Abgrenzung:**
- Eine Migration (drei Felder, zwei Defaults) — kein Umbau bestehender Daten; Bestand
  wird PUBLIC (Default), Verhalten bleibt also zunächst wie heute; die Verschärfung greift
  erst, wo Admins Typen/Dokumente auf SCOPED stellen.
- Fachliche Restfrage an Mone (nicht blockierend): Sollen **zurückgezogene** Dokumente im
  Audit sichtbar bleiben für die Beteiligten der alten Fassung (Vorschlag: ja, Historie) —
  heute sehen VIEWER Withdrawn nicht, Beteiligte schon.

---

## 6. Abgrenzung / nicht enthalten

- Keine Rollen×Aktion-Matrix (Entscheidung 3).
- Keine benutzerfeine Freigabe einzelner Dokumente an Einzelpersonen (läuft immer über
  Abteilung/Job-Rolle; externe über ihre Rolle).
- Keine Ablaufdaten für externe Zugriffe (später möglich, `scopeJobRoles`-Eintrag könnte
  ein `expiresAt` bekommen).
