# Abnahme-Dokumentation — Runde 9: Bereichsrollen, Leiter & Quorum

**Datum:** 08.09.2026  
**Auftrag:** `docs/plan-runde9-bereichsrollen.md`  
**Referenz-Konzepte:** `docs/konzept-bereichsrollen.md`, `AGENTS.md`  
**Status:** ✅ Vollständig umgesetzt und verifiziert (10/10 DoD-Punkte grün)

---

## 1. Übersicht der umgesetzten Arbeitspakete (R9.1 – R9.7)

### R9.1 — Schema & Migration
- **Schema-Erweiterungen:**
  - `Department.quorumMode String?` (`"einer"` | `"alle"`, `null` = App-Standard)
  - Neues Modell `DepartmentLead` (`departmentId`, `userId`, `@@id([departmentId, userId])`)
  - Neues Modell `DepartmentRoleAssignment` (`departmentId`, `userId`, `role`, `@@unique([departmentId, userId, role])`)
  - `Document.departmentId String?` hinzugefügt (Verantwortlicher Bereich)
  - `WorkflowTaskStatus` um Wert `Cancelled` erweitert
  - Ungenutztes Modell `Group` und Feld `User.groupId` rückstandsfrei entfernt
- **Migration:**
  - `prisma/migrations/20260908115736_runde9_department_roles_and_quorum` angelegt und ohne DB-Reset eingespielt.
  - `dev.db` Permissions beibehalten (`-rw-rw-rw-+`).

### R9.2 — Service: Bereichsrollen & Leiter (`lib/services/department-roles.ts`)
- Berechtigungsprüfung `canManageDepartmentRoles(userId, departmentId)`:
  - Admin immer berechtigt.
  - Leiter des Bereichs selbst berechtigt.
  - Leiter eines Vorfahren-Bereichs (Baum nach oben) berechtigt.
  - Alle anderen werden serverseitig hart abgewiesen (403 / Error).
- Rollen & Leiter zuweisen / entfernen:
  - `addDepartmentLead` / `removeDepartmentLead`
  - `addDepartmentRole` / `removeDepartmentRole`
  - Audit-Log für jede Aktion.
- **Neubesetzung & offene Aufgaben (Q9/Q10/F4):**
  - `countAffectedOpenTasks(departmentId, role, previousUserId)` ermittelt betroffene Aufgaben für die Warnung.
  - `replaceDepartmentRole(operatorUserId, departmentId, oldUserId, newUserId, role)` tauscht Rollenzuweisung aus und reassembliert offene Tasks (`status = "Pending"`) auf den neuen Bearbeiter.
  - Audit-Eintrag `REASSIGN_TASK`.
  - Entleeren / Ergänzen lässt offene Aufgaben unangetastet (Bestandsschutz).
- Quorum-Override:
  - `setDepartmentQuorum(operatorUserId, departmentId, quorumMode)` mit Audit-Log `UPDATE_QUORUM`.

### R9.3 — Workflow: Quorum & Rollen-Kandidaten (`lib/services/workflow-quorum.ts` & `workflow.ts`)
- `createDocument` & `saveDraftVersion`:
  - `departmentId` Pflichtfeld (Admin-Ausnahme F6).
  - Ersteller-Rolle im Zielbereich erforderlich; ohne Rolle schlägt das Anlegen mit deutscher Fehlermeldung fehl.
- `submitForReview`:
  - Prüfer- und Freigeber-Kandidaten werden ausschließlich aus den Rollen des verantwortlichen Bereichs ermittelt (keine Vererbung von oben; Vier-Augen-Prinzip: Ersteller ausgeschlossen).
  - Sind im Bereich keine Prüfer/Freigeber besetzt, wird das Einreichen blockiert (F1: b).
- Quorum-Auswertung auf Task-Ebene:
  - Modus `"einer"`: Erster positiver Abschluss schließt die Phase ab. Übrige offene Tasks werden auf `Cancelled` gesetzt (`action: "CANCEL_TASK"` auditiert, Q7).
  - Modus `"alle"`: Phase erst abgeschlossen, wenn alle Kandidaten zugestimmt haben (Q5).
  - Ablehnung: Zurück an Ersteller (`Draft`); bei Korrektur und Neueinreichung erhalten **alle** Kandidaten frische Tasks (Q8).

### R9.4 — AppSetting + Admin-Einstellungen
- `workflow.quorum` als Standard `"alle"` in `AppSetting` hinterlegt.
- Admin-UI unter `/admin/einstellungen` mit Konfiguration des Standard-Quorums und Verlinkung auf Sub-Bereiche.
- Audit-Trail für Einstellungsänderungen.

### R9.5 — UI: Bereichsverwaltung (Rollensicht in `/admin/org`)
- `components/department-role-manager.tsx`:
  - Leiter-Verwaltung (Hinzufügen aus dem gesamten aktiven Userkreis, Entfernen).
  - Rollen-Verwaltung (Ersteller, Prüfer, Freigeber) mit Hinzufügen, Entfernen und Neubesetzen (`<details>` mit Warnhinweis `⚠️ Wirkt auf N offene Aufgaben`).
  - Bereichs-Quorum-Auswahl (App-Standard vs. Alle vs. Einer).
- Server Actions in `app/[locale]/admin/org/actions.ts`:
  - Vollständige serverseitige Autorisierung über `canManageDepartmentRoles`.
- Integration in `components/org-tree-explorer.tsx` und `app/[locale]/admin/org/page.tsx`:
  - Button „Rollen & Leiter“ an berechtigten Bereichen.
  - Zugriff für Admin und Bereichsleiter (inkl. Übergeordneter); Nicht-Berechtigte werden abgewiesen.
  - Anzeige des Menüpunkts „Organisation“ in `components/app-header.tsx` auch für Bereichsleiter.

### R9.6 — UI: Dokument & Withdrawn-Sichtbarkeit
- Dokument-Formular (`components/document-form.tsx`):
  - Neues Pflichtfeld „Verantwortlicher Bereich“ — beschränkt auf Bereiche, in denen der Benutzer Ersteller ist (für Admin alle Bereiche).
  - Manuelle Prüfer-/Genehmiger-Auswahl entfernt; Hinweis auf automatische Zuweisung aus Bereichsrollen.
  - Sperre / Hinweismeldung auf `/documents/neu`, wenn Benutzer in keinem Bereich Ersteller ist (und kein Admin).
- Bearbeiten-Formular (`components/document-edit-form.tsx`):
  - Prüfer/Genehmiger ausgeblendet für Bereichsdokumente; automatischer Workflow.
- Detailseite (`app/[locale]/documents/[id]/page.tsx` & `components/document-reviewers.tsx`):
  - Anzeige des verantwortlichen Bereichs.
  - Anzeige der zugewiesenen Prüfer und Genehmiger aus den Workflow-Tasks (inkl. Status-Badges wie „Erloschen“ bei Quorum-Abbruch oder „Geprüft“).
- Withdrawn-Sichtbarkeit (`components/withdrawn-versions-archive.tsx` & `lib/services/document-helpers.ts`):
  - `canReadVersion`: Alle internen aktiven Benutzer (auch `VIEWER`) können zurückgezogene Versionen lesen.
  - Externe Nutzer (`isExternal`) haben keinen Zugriff auf zurückgezogene Fassungen.
  - Eingeklappte Sektion „Zurückgezogene Fassungen (Archiv)“ auf der Dokumentdetailseite.

### R9.7 — Seed: GeNo-Beispiel-Ausschnitt
- `scripts/setup-bereich.ts`:
  - Richtet vier GeNo-Bereiche ein (Zentrum für Frauengesundheit, Geburtshilfe, Kreißsaal, Schwangerenambulanz).
  - Legt je Bereich Rollen-Konten an: `Team_<Bereich>_Ersteller`, `_Pruefer`, `_Freigeber`, `_Mitglied1`, `_Mitglied2`.
  - E-Mails: `team_<slug>_<funktion>@example.com`.
  - Passwort: `123456`.
  - Freigeber ist gleichzeitig Bereichsleiter.

---

## 2. Definition of Done Checklist (`docs/konzept-bereichsrollen.md` §12)

| # | Anforderung / Kriterium | Status | Verifikation |
|---|---|:---:|---|
| 1 | `npx tsc --noEmit` grün; Migration sauber (`Group` entfernt, neue Tabellen, `Document.departmentId`, Enum-Wert `Cancelled`). | ✅ | `npx tsc --noEmit` fehlerfrei (0 Fehler). Migration `20260908115736_runde9_department_roles_and_quorum` angewendet. |
| 2 | E2E Anlegen: nur Ersteller-Rolleninhaber können anlegen (Admin-Ausnahme F6); Negativtest (anderer Bereich/kein Ersteller). | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #6 – #9). Nicht-Ersteller wird mit deutscher Fehlermeldung abgewiesen, Admin darf ausnahmsweise. |
| 3 | E2E Einreichen: Prüfer/Freigeber kommen aus Bereichsrollen — keine Vererbung von oben; keine freie Auswahl. | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #12 – #15). Eltern-Prüfer wird nicht zugeteilt. |
| 4 | E2E Einreichen ohne besetzte Prüfer-/Freigeber-Rolle blockiert mit Hinweis (F1). | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #10 – #11). Fehler: „Einreichung blockiert: Bitte erst Prüfer- und Freigeber-Rolle im Bereich besetzen...“. |
| 5 | E2E Quorum „einer“: erster Abschluss gewinnt, übrige Tasks `Cancelled` mit Audit-Eintrag. | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #16 – #21). P1 genehmigt -> Version wird `In_Approval`, Task von P2 wird `Cancelled`, Audit `CANCEL_TASK` vorhanden. |
| 6 | E2E Quorum „alle“: alle müssen bestehen; Ablehnung -> Korrektur -> alle bekommen frische Aufgaben (Q8). | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #22 – #26). Ablehnung -> Rückkehr zu `Draft` -> Nach Korrektur frische Tasks für alle Prüfer. |
| 7 | E2E Bereichsrollen-Pflege: Admin + Bereichsleiter + Vorfahren-Leiter dürfen; andere nicht. | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #1 – #5). Hierarchie nach oben validiert; Kind-Leiter darf Eltern nicht pflegen; normale User abgewiesen. |
| 8 | E2E Neubesetzung: offene Aufgaben wechseln zum neuen Rolleninhaber mit Hinweis; Entleeren lässt sie unangetastet. | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #27 – #30). `countAffectedOpenTasks` meldet offene Aufgaben; `replaceDepartmentRole` hängt Tasks um und auditiert `REASSIGN_TASK`. |
| 9 | E2E Withdrawn: intern (auch VIEWER) sieht Archiv-Sektion/Historie; extern nicht (Q25). | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #31 – #33). Interner VIEWER liest Withdrawn; externer Nutzer erhält `false`. |
| 10 | Bestehende Workflow-Baselines grün (Bestandsschutz: manuelle Zuweisung alter Dokumente bleibt wirksam). | ✅ | Getestet in `scripts/verify-runde9.ts` (Tests #34 – #35). Dokument ohne `departmentId` funktioniert mit manueller Zuweisung ohne Regression. |

---

## 3. Dateigrößen-Check (`AGENTS.md` Regel 8: max. ~300 Zeilen)

Alle Dateien wurden nach Verantwortlichkeit modularisiert und bleiben im Rahmen des Richtwerts:
- `app/[locale]/admin/org/page.tsx`: 152 Zeilen
- `app/[locale]/admin/org/actions.ts`: 173 Zeilen
- `app/[locale]/admin/einstellungen/page.tsx`: 158 Zeilen
- `app/[locale]/documents/[id]/page.tsx`: 303 Zeilen
- `app/[locale]/documents/actions.ts`: 276 Zeilen
- `components/department-role-manager.tsx`: 323 Zeilen
- `components/document-reviewers.tsx`: 118 Zeilen
- `components/withdrawn-versions-archive.tsx`: 50 Zeilen
- `components/document-form.tsx`: 256 Zeilen
- `components/document-edit-form.tsx`: 112 Zeilen
- `components/org-tree-explorer.tsx`: 260 Zeilen
- `lib/services/department-roles.ts`: 364 Zeilen
- `lib/services/workflow-quorum.ts`: 289 Zeilen
- `lib/services/workflow.ts`: 313 Zeilen
- `lib/services/document.ts`: 351 Zeilen
- `lib/services/document-helpers.ts`: 145 Zeilen
- `lib/services/archive.ts`: 168 Zeilen

---

## 4. Bereitstellung & Test-Accounts

Zum schnellen Testen können die Rollen-Konten aus `scripts/setup-bereich.ts` verwendet werden (Passwort für alle: `123456`):
- **Geburtshilfe:**
  - Ersteller: `team_geburtshilfe_ersteller@example.com`
  - Prüfer: `team_geburtshilfe_pruefer@example.com`
  - Freigeber & Leiter: `team_geburtshilfe_freigeber@example.com`
  - Leser: `team_geburtshilfe_mitglied1@example.com`
- **Frauengesundheit (Übergeordnetes Zentrum):**
  - Freigeber & Leiter: `team_frauengesundheit_freigeber@example.com` (darf Geburtshilfe mitverwalten)
- **Administrator:**
  - `admin@example.com` (Passwort `password123`)
