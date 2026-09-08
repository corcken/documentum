# Plan Runde 9: Bereichsrollen, Leiter & Quorum

> **Auftrag** (07.09.2026) — für den Coding-Agenten (Antigravity), arbeitet direkt im Repo.
> Fachlich: Corcken. Review/Verifikation: Hermes (tsc, E2E, Sichtpruefung). Abnahme erst nach Verifikation.
>
> **Pflichtlektuere (in dieser Reihenfolge):**
> 1. `docs/konzept-bereichsrollen.md` — Design + alle Entscheidungen (Fragenkatalog Q1-25, Klaerungen F1-F6)
> 2. `AGENTS.md` — Projektregeln (max. ~300 Zeilen/Datei, Audit ueberall, UI-Texte in `messages/de.json`, keine harten Loeschungen)
> 3. Bestehende Services als Muster (Runden 7/8): `lib/services/` + `docs/konzept-sichtbarkeit.md`

## Ziel (Kurzfassung)

Jede Organisationseinheit (`Department`) bekommt **vom Bereichsleiter benannte Rollen** — Ersteller,
Pruefer, Freigeber (mehrere moeglich, aus dem **gesamten aktiven Userkreis**, auch bereichsfremd).
Rollen gelten **nur fuer den eigenen Bereich** (keine Vererbung nach unten — Kinder lesen
Eltern-Dokumente, Eltern handeln nicht fuer Kinder). **Quorum** „einer/alle“: App-weit (Default
„alle“) + Override je Bereich; eine gemeinsame Einstellung fuer Pruefung und Freigabe. Dokumente
gehoeren einem Bereich (`Document.departmentId`); Anlegen nur mit Ersteller-Rolle des Bereichs
(Admin-Ausnahme vorerst). Leiter (mehrere je Bereich) pflegen die Rollen, zusammen mit Leitern
uebergeordneter Bereiche und Admin. `Group`-Modell entfaellt. Zurueckgezogene Fassungen: fuer
interne Nutzer sichtbar (eingeklapptes Archiv), externe nicht.

## Technische Vorgaben (zwingend)

1. **Workflow-Autorisierung auf Task-Ebene:** Bei mehreren Pruefern/Freigebem reichen die 1:1-Felder
   `DocumentVersion.reviewerId/approverId` nicht. Zuständigkeitspruefung laeuft ueber
   `WorkflowTask.assignedToId` + `taskType` + `status`. Die Felder bleiben erhalten (Anzeige,
   Altbestand, Bestandsschutz Q9), sind aber **nicht** mehr die alleinige Autorisierung.
2. Migration ohne DB-Reset: `npx prisma migrate dev --name <name>`; dev.db bleibt Server-User
   (hermes_agent) — Migrations-Docker-Muster `-u 1001` wie in Runde 6; **kein pauschales
   chown/chmod** auf Projekt-/Laufzeitdateien.
3. Bestehende manuell zugewiesene Versionen (Altbestand) bleiben unangetastet.
4. UI-Texte in `messages/de.json` (next-intl), keine hart kodierten Strings.
5. Keine neuen Dependencies. Dateien max. ~300 Zeilen (Ausnahme: Katalog-/Seed-Daten).
6. Abweichende Entscheidungen nicht stillschweigend — stoppen und in `ABNAHME.md` begruenden.

## Aufgaben (Reihenfolge einhalten, kleine saubere Commits, Tests mitziehen)

### R9.1 — Schema & Migration
- `Department.quorumMode String?` (`"einer"`|`"alle"`, null = App-Standard)
- neu `DepartmentLead` (`departmentId` + `userId`, `@@id([departmentId, userId])`) — Leiter n:m
- neu `DepartmentRoleAssignment` (`departmentId` + `userId` + `role String` —
  `ERSTELLER`/`PRUEFER`/`FREIGEBER` als Konstanten in `lib/constants.ts` mit deutschen Labels,
  `@@unique([departmentId, userId, role])`)
- `Document.departmentId String?` → `Department` (verantwortlicher Bereich)
- `WorkflowTaskStatus` + Wert `Cancelled`
- `Group` + `User.groupId` **entfernen** (vorher im Code verifizieren: nirgends genutzt)
- Migration anlegen, `npx prisma generate`, `npx tsc --noEmit` gruen

### R9.2 — Service Bereichsrollen & Leiter (`lib/services/department-roles.ts`, neu)
- Rollen/Leiter setzen und entfernen; Quorum-Override setzen/loeschen
- Berechtigung (serverseitig hart): Admin **oder** Leiter des Bereichs **oder** Leiter eines
  Vorfahren-Bereichs (Baum nach oben)
- **Neubesetzung (Q9/Q10/F4):** Wird eine Rolle mit neuer Person besetzt, uebernehmen deren
  **offene** Aufgaben (Pending Review/Approval am bisherigen Inhaber) den neuen Inhaber; Rueckgabe
  der Anzahl betroffener Aufgaben, damit die UI den Hinweis „Wirkt auf N offene Aufgaben“ zeigen
  kann. **Entleeren/Ergaenzen** einer Rolle: offene Aufgaben bleiben unangetastet.
- Audit je Aenderung (entityType `DepartmentRoleAssignment`/`DepartmentLead`, before/after)

### R9.3 — Workflow: Rollen als Quelle + Quorum-Logik
- Anlegen (`createDocument`/`saveDraftVersion`): `departmentId` Pflicht; nur User mit
  `ERSTELLER`-Rolle im Ziel-Bereich (Admin-Ausnahme F6); ohne besetzte Ersteller-Rolle → kein
  Anlegen (deutsche Fehlermeldung; Vorschlags-Workflow kommt spaeter)
- `submitForReview`: Pruefer-Kandidaten = aktive `PRUEFER`-Rolleninhaber, Freigeber-Kandidaten =
  aktive `FREIGEBER`-Rolleninhaber des verantwortlichen Bereichs (keine Vererbung; Ersteller
  ausgeschlossen — Vier-Augen bleibt strikt). **Keine Rolle besetzt → Einreichung blockiert**
  (F1: b) mit Hinweis „erst Pruefer/Freigeber-Rolle besetzen“. Quorum-Modus:
  `Department.quorumMode` ?? `AppSetting workflow.quorum` ?? `"alle"`. Tasks je Kandidat anlegen
  (Review-Phase), danach Approval-Phase analog.
- `approveReview`/`approveVersion` ueber Tasks autorisieren:
  - „einer“: erster „bestanden“ schliesst die Phase ab, uebrige Pending-Tasks → `Cancelled`
    (Audit-Eintrag „Quorum einer erreicht“, Q7)
  - „alle“: Phase erst abgeschlossen, wenn **jeder** Kandidat „bestanden“ hat (Q5)
  - Ablehnung (beide Modi): wie bisher zurueck an Ersteller (Kommentar-Pflicht bleibt);
    **Wiedereinreichen nach Korrektur → frische Tasks fuer ALLE Kandidaten** (Q8)
- Zaehler/Inbox (`listMyTasks`/`countMyOpenTasks`) unveraendert — Tasks je User funktionieren weiter

### R9.4 — AppSetting + Admin-Einstellungen
- `workflow.quorum` mit Default `"alle"` in den AppSetting-Seed; Admin-UI zum Aendern
  (auditiert wie alle AppSettings)

### R9.5 — UI: Bereichsverwaltung (Rollensicht)
- In `admin/org` je Bereich ein Rollen-/Leiter-Bereich: Leiter setzen/entfernen (mehrere), je Rolle
  User hinzufuegen/entfernen (Auswahl/Suche ueber den **gesamten aktiven Userkreis**), Quorum-
  Override (App-Standard / einer / alle)
- Warnhinweis bei Neubesetzung mit offenen Aufgaben (R9.2); Sicht: Admin immer, Leiter (eigener +
  Vorfahren) — andere hart abgewiesen (403)

### R9.6 — UI: Dokument
- Formular: Feld „Verantwortlicher Bereich“ — nur Bereiche mit eigener Ersteller-Rolle (Admin:
  alle); **keine** Pruefer-/Freigeber-Auswahl im Formular (Klarstellung 07.09.); nach Einreichung
  Anzeige der zustaendigen Pruefer/Freigeber aus den Bereichsrollen
- Detailseite: eingeklappte Sektion „Zurueckgezogene Fassungen“ (Archiv, Q25) — sichtbar fuer alle
  internen Nutzer (auch VIEWER), nicht fuer `isExternal`; `canReadVersion` in
  `lib/services/document-helpers.ts` entsprechend anpassen (Withdrawn: intern lesbar)

### R9.7 — Seed: Beispiel-Ausschnitt (F3)
- Setup-Skript (z. B. `scripts/setup-bereich.ts`): Beispiel-Ausschnitt aus den GeNo-Daten waehlen
  (ein Klinikum + 2–3 Teams, z. B. mit „Geburtshilfe“) und je Bereich Rollen-Konten anlegen:
  `Team_<Name>_Ersteller` / `_Pruefer` / `_Freigeber` / `_Mitglied1` / `_Mitglied2` — E-Mail aus
  Slug + `@example.com`, **Passwort `123456`** (Prototyp, F5), aktiv, Name traegt die Funktion
  (erkennbar als Rollen-Konto). Rollen zuweisen, **Freigeber-Konto = Leiter** (Q1/Q12), Mitglieder
  mit `departmentId` = Bereich. Bestehende Demo-User (Petra/Frank) bleiben.

## Definition of Done / Abnahme

Checkliste in `konzept-bereichsrollen.md` §12 (tsc, Migration, E2E: Anlegen/Ersteller-Rolle,
Einreichen aus Rollen ohne Vererbung, Blockade ohne Rollen, Quorum „einer“ mit `Cancelled`,
Quorum „alle“ mit Frisch-Start nach Korrektur, Rollen-Pflege-Berechtigung, Neubesetzung mit
Hinweis, Withdrawn-Archiv intern/extern, Workflow-Baselines gruen). Ergebnis + Abweichungen in
`ABNAHME.md` im Repo-Root dokumentieren.
