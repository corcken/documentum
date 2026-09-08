# Konzept Runde 9: Bereichsrollen, Leiter & Quorum

> Status: **fertig zur Freigabe** (07.09.2026) — alle Klärungsfragen F1–F6 beantwortet.
> Umsetzung noch nicht gestartet.
> Grundlage: `entscheidungen-runde9.md` (alle 25 Antworten vom 07.09.2026).
> Umsetzung später durch den Coding-Agenten (Antigravity), Verifikation durch Hermes.

---

## 1. Ausgangslage (Problem)

Heute wird pro Dokumentversion **frei aus allen Usern** ein Prüfer und ein Genehmiger gewählt
(`DocumentVersion.reviewerId`/`approverId`). Wer anlegen darf, richtet sich global nach der
Systemrolle EDITOR. Abteilungen (`Department`) haben weder Leiter noch eigene Rollen.

Für den Pilotbetrieb mit der echten GeNo-Organisation (411 Bereiche, Baum-Tiefe 5) und späteren
GMP-Produktivbetrieb fehlt die Frage: **Wer darf in welchem Bereich was** — anlegen, prüfen,
freigeben — und was gilt, wenn mehrere Personen infrage kommen (**Quorum**)?

## 2. Zielbild (fachlich)

- Jeder Bereich hat **eigene Rollen**: Ersteller, Prüfer, Freigeber — je **eine oder mehrere
  Personen** aus dem Userkreis. **Wer diese Rollen innehat, benennt der Bereichsleiter** (oder
  dessen Vorgesetzte, Q3) — nicht der Ersteller eines Dokuments.
- Die Rollen gelten **nur für den eigenen Bereich**. Ein übergeordneter Bereich (z. B. Klinik)
  kann Dokumente von Unterbereichen (z. B. Team Geburtshilfe) **weder schreiben noch freigeben** —
  das macht der Unterbereich allein. *(Korrektur zu meiner ersten Lesart: keine Rollen-Vererbung
  nach unten fürs Handeln.)*
- **Sichtbarkeit/Lesepflicht** bleibt nach unten expandiert: Mitglieder der Unterbereiche sehen die
  Dokumente der übergeordneten Bereiche (und müssen darauf ggf. geschult werden — Schulungskonzept,
  später).
- Jeder Bereich hat **einen Leiter** (mehrere möglich). Der Leiter pflegt die Bereichsrollen —
  zusammen mit den Leitern der darüberliegenden Bereiche und dem Admin.
- **Quorum** („einer“ oder „alle“) bestimmt, wie viele Prüfer/Freigeber aktiv werden müssen —
  App-weit einstellbar (Default **„alle“**), je Bereich überschreibbar. Eine gemeinsame Einstellung
  für Prüfung und Freigabe.
- Ein Dokument „gehört“ dem Bereich, in dem es entsteht (`Document.departmentId`). Der Kreis der
  Anleger wird durch die **Ersteller-Rolle** begrenzt.

## 3. Datenmodell (Schema-Delta)

| Bereich | Änderung | Details |
|---|---|---|
| `Department` | + `quorumMode String?` | `"einer"` \| `"alle"`, `null` = App-Standard |
| neu `DepartmentLead` | Leiter n:m | `departmentId` + `userId`, `@@id([departmentId, userId])` — mehrere Leiter je Bereich möglich, ein User kann mehrere Bereiche leiten |
| neu `DepartmentRoleAssignment` | Bereichsrolle | `departmentId` + `userId` + `role String` (`ERSTELLER`/`PRUEFER`/`FREIGEBER`, Konstanten in `lib/constants.ts`), `@@unique([departmentId, userId, role])` — mehrere User je Rolle; ein User kann mehrere Rollen (auch in mehreren Bereichen) haben |
| `Document` | + `departmentId String?` | verantwortlicher Bereich („Dokument gehört dem Team“); nullable für Bestandsdaten, beim Anlegen gesetzt |
| `Group` + `User.groupId` | **entfernen** | nie genutzt (Entscheidung 17); kann später wiederkommen |
| `AppSetting` | + `workflow.quorum` | Default `"alle"` |
| `WorkflowTaskStatus` | + `Cancelled` | für „Quorum einer erreicht → übrige Tasks erlöschen“ (Q7) |

Portabilitäts-Regeln wie gehabt: keine DB-Trigger, keine `@db.`-Annotationen; Rollen als String +
Konstanten (Muster `visibility`), Status-Enums bleiben (etabliert). Alle Änderungen über
`prisma migrate` (dev.db bleibt hermes_agent).

## 4. Rollen-Ermittlung & Berechtigungen (Service-Layer)

- **Anlegen** (`createDocument`/`saveDraftVersion`): Ziel-Bereich (`departmentId`) wird Pflicht.
  Berechtigt: User mit `ERSTELLER`-Rolle im Ziel-Bereich. **Ohne besetzte Ersteller-Rolle kann
  niemand anlegen** — der Weg sind dann später Vorschläge (F2; bis dahin gesperrt).
  Übergangsregel (F6): **Admin darf vorerst weiterhin alles** — auch ohne Ersteller-Rolle.
- **Zuweisungen sind nicht auf Bereichs-Mitglieder beschränkt (F1-Ergänzung):** Prüfer, Freigeber
  und Ersteller dürfen aus dem **gesamten aktiven Userkreis** kommen — auch aus anderen Bereichen
  (z. B. zentrale QM-Stelle als Prüferin für Fachbereiche). Die *Wirkung* der Rolle bleibt auf
  Dokumente des jeweiligen Bereichs begrenzt.
- **Einreichen** (`submitForReview`): Prüfer-Kandidaten = aktive User mit `PRUEFER`-Rolle im
  verantwortlichen Bereich, Freigeber-Kandidaten analog mit `FREIGEBER`. **Keine Vererbung von
  oben.** Ersteller selbst ist ausgeschlossen (Vier-Augen, Q4). Sind keine Rollen besetzt, ist die
  Einreichung **blockiert** (F1: b) mit dem Hinweis „erst Prüfer/Freigeber-Rolle besetzen“.
- **Keine freie Prüfer-/Freigeber-Wahl durch den Ersteller:** Die Zuständigen ergeben sich
  ausschließlich aus den Bereichsrollen — benannt vom Bereichsleiter bzw. dessen Vorgesetzten
  (Klarstellung User 07.09.).
- **Pflege-Berechtigung** (Bereichsrollen + Leiter verwalten, Q3): Admin **oder** Leiter des
  Bereichs **oder** Leiter eines Vorfahren-Bereichs (Baum nach oben laufen).
- **Lesen/Schulung** (`canReadVersion`): unverändert nach unten expandiert (Kinder lesen
  Eltern-Dokumente) — nur Sichtbarkeits-Anpassung für Withdrawn (Abschnitt 8).

## 5. Quorum-Logik (Workflow)

Prüfphase (Review) und Freigabephase (Approval) nutzen **dieselbe** Einstellung (Q6). Quorum-Modus:
`Department.quorumMode` ?? `AppSetting workflow.quorum` ?? `"alle"`.

**Modus „einer“:**
- Jeder Kandidat aus der Prüfer-Rolle bekommt eine Aufgabe (Inbox wie gehabt).
- Der **erste** „Prüfung bestanden“ schließt die Review-Phase ab; die übrigen offenen
  Review-Aufgaben **erlöschen** → Status `Cancelled`, Audit-Eintrag „Quorum einer erreicht“ (Q7).
- Lehnt einer ab → zurück an den Ersteller (wie bisher).

**Modus „alle“:**
- **Jeder** Kandidat muss „Prüfung bestanden“ liefern, erst dann geht es in die Freigabephase.
- Lehnt einer ab → zurück an den Ersteller. Nach der Korrektur und erneutem Einreichen bekommen
  **alle** Prüfer frische Aufgaben — nicht nur der Ablehnende (Q8). Abgeschlossene Reviews der
  alten Runde zählen nicht weiter.

**Freigabe:** analog mit der Freigeber-Rolle. Genehmigt (im „alle“-Modus erst der letzte
Freigeber) → Version Released.

**Vier-Augen bleibt strikt** (Q4): Ersteller ≠ Prüfer ≠ Freigeber je Version — auch in Bereichen
mit 2–3 Personen. Im Pilotbetrieb erfüllen die Rollen-Konten (Abschnitt 9) das strukturell.

## 6. Rollen-Änderung & offene Aufgaben (Personalwechsel, Q9/Q10)

Regel (F4, bestätigt 07.09.2026):
- **Offene Aufgaben bleiben offen, bis die neue Person eingesetzt ist** — sie hängen in der
  Zwischenzeit weiter beim bisherigen Bearbeiter (Bestandsschutz, Q9).
- Wird eine Rolle **neu besetzt** (Person B ersetzt A), **übernehmen die offenen Aufgaben**
  (Pending Review/Approval an A) die neue Person B. Vor dem Speichern zeigt die Oberfläche einen
  **expliziten Hinweis**: „Wirkt auf N offene Aufgaben“ (Q10).
- Wird eine Rolle nur **entleert** oder **ergänzt** (keine Ersetzung), bleibt alles unangetastet.
- Jede Änderung auditiert (`DepartmentRoleAssignment`/`DepartmentLead`, before/after).

## 7. UI

- **Org-/Admin-Seite (`admin/org`):** Bereich öffnen → Bereich „Rollen & Leiter“:
  - Leiter setzen/entfernen (mehrere möglich),
  - je Rolle (Ersteller/Prüfer/Freigeber) User hinzufügen/entfernen — Auswahl aus dem Userkreis,
  - Quorum-Override je Bereich (App-Standard / einer / alle),
  - Warnhinweis bei Neubesetzung mit offenen Aufgaben (Abschnitt 6).
  Sichtbarkeit der Seite: Admin immer; Bereichsleiter (eigener + darüberliegender Bereiche, Q3).
- **Dokument-Formular:** neues Feld „Verantwortlicher Bereich“ — nur Bereiche, in denen der User
  die Ersteller-Rolle hält (auch bereichsfremd möglich, F1-Ergänzung); ohne Ersteller-Rolle kein
  Anlegen (F2). **Keine Prüfer-/Freigeber-Auswahl im Formular** — die Zuständigen ergeben sich
  beim Einreichen aus den Bereichsrollen.
- **Detailseite:** eingeklappte Sektion **„Zurückgezogene Fassungen“** (Archiv) unter der
  aktuellen Fassung — für interne Nutzer sichtbar (Q25).
- **Aufgaben-Inbox:** unverändert; bei „einer“-Quorum Hinweis „Der erste Abschluss entscheidet“.
- **Admin-Einstellungen:** App-weites Quorum (`workflow.quorum`), auditiert wie alle AppSettings.

## 8. Sichtbarkeit von „Zurückgezogen“ (Q25)

- Bisher: Withdrawn nur für Admin + Beteiligte.
- **Neu:** alle **internen** Nutzer (auch VIEWER) sehen zurückgezogene Fassungen — in der
  Versions-Historie und als eingeklappte Archiv-Sektion auf der Detailseite. **Externe Nutzer**
  (`isExternal`) sehen weiterhin nichts davon.
- Anpassung in `canReadVersion` (document-helpers.ts) + Detailseiten-Rendering.

## 9. Seed / Befüllung (GeNo-Pilot, Q1)

- **Setup-Funktion „Bereich einrichten“** (Skript oder Admin-Aktion): legt **Rollen-Konten** an mit
  dem Namensschema `Team_<Bereich>_<Funktion>`: `…_Ersteller`, `…_Prüfer`, `…_Freigeber`,
  `…_Mitglied1`, `…_Mitglied2` (Mitglieder = normale User mit `departmentId` = Bereich, für
  Lesetests/Schulungen). **Passwort für alle Rollen-Konten: `123456`** (Prototyp, F5); E-Mail wird
  aus dem Namen abgeleitet (Slug + `@example.com`, Login läuft über die E-Mail-Adresse wie gehabt);
  der Anzeige-Name trägt die Funktion → als „Rollen-Konto“ erkennbar.
- Weist die Rollen zu und setzt bei der Befüllung **das Freigeber-Konto als Leiter** (Q1/Q12).
- **Umfang (F3): Beispiel-Ausschnitt** — nicht alle 411 GeNo-Bereiche. Konkrete Auswahl beim Bauen
  anhand der echten GeNo-Daten (Vorschlag: ein Klinikum mit 2–3 Teams, z. B. mit „Geburtshilfe“).

## 10. Bewusst NICHT in Runde 9 (Roadmap)

- **Vorschlags-Workflow** (Q11/Q13): Außenstehende (z. B. QM-Unterstützer) reichen Vorschläge ein,
  der Bereichs-Ersteller ändert sie oder publiziert direkt. Braucht `Document.departmentId` als
  Anker — Design später. Für Bereiche ohne Ersteller-Rolle ist das später der einzige Weg, Inhalte
  einzubringen (F2); bis dahin ist das Anlegen dort gesperrt.
- **Schulungs-Vergabe** für die geerbte Lesepflicht der Unterbereiche (Q2) — gehört ins
  Schulungskonzept (spätere Runde).
- **Datei-Ordnerstruktur je Bereich** (Q14, lokal, ID-basiert) — Storage-Interface bleibt
  vorbereitet, Struktur später.
- LDAP, PostgreSQL, Prüffrist-E-Mail-Job — „viel später“.

## 11. Klärungen F1–F6 (abgeschlossen 07.09.2026)

Alle Punkte geklärt (07.09.2026, zweite/dritte Runde):
- **F1 — Bereich ohne besetzte Prüfer/Freigeber-Rollen:** Einreichung wird **blockiert** mit
  Hinweis „erst Prüfer/Freigeber-Rolle besetzen“ — keine manuelle Ersatzauswahl (Variante b).
- **F2 — Bereich ohne Ersteller-Rolle:** niemand kann anlegen; es können nur **Vorschläge**
  eingereicht werden (Vorschlags-Workflow = Roadmap — bis dahin ist das Anlegen schlicht gesperrt).
- **F3 — Befüllung:** **Beispiel-Ausschnitt** (ein Klinikum mit 2–3 Teams), nicht alle 411 Bereiche.
- **F4 — Neubesetzung:** offene Aufgaben **bleiben beim bisherigen Bearbeiter offen, bis die neue
  Person eingesetzt ist** — dann übernehmen sie (mit Hinweis) den neuen Rolleninhaber (§6).
- **F5 — Rollen-Konten:** Name trägt die Rolle (`Team_<Bereich>_<Funktion>`), Passwort **`123456`**,
  E-Mail abgeleitet (Slug + `@example.com`).
- **F6 — Admin:** **Admin darf zur Zeit noch alles** (auch ohne Ersteller-Rolle anlegen) —
  Übergangsregel, später überdenken.
- **F1-Ergänzung / Klarstellung:** Prüfer, Freigeber und Ersteller **müssen nicht aus demselben
  Bereich/Team kommen** — Zuweisungen aus dem gesamten aktiven Userkreis (§4). **Der Ersteller
  wählt beim Anlegen/Einreichen keine Prüfer/Freigeber** — die Bereichsrollen benennt der
  Bereichsleiter bzw. dessen Vorgesetzte.

## 12. Definition of Done (Verifikation durch Hermes)

- [ ] `npx tsc --noEmit` grün; Migration sauber (Group + `User.groupId` entfernt, neue Tabellen
      + `Document.departmentId` + Enum-Wert `Cancelled`).
- [ ] E2E Anlegen: nur Ersteller-Rolleninhaber des Bereichs können anlegen (Admin-Ausnahme F6
      greift vorerst); Negativtest (anderer Bereich / kein Ersteller).
- [ ] E2E Einreichen: Prüfer/Freigeber kommen aus den Bereichsrollen des verantwortlichen
      Bereichs — nicht aus übergeordneten; keine freie Auswahl durch den Ersteller.
- [ ] E2E Einreichen ohne besetzte Prüfer-/Freigeber-Rolle → blockiert mit Hinweis (F1).
- [ ] E2E Quorum „einer“: erster Abschluss gewinnt, übrige Tasks `Cancelled` (Audit).
- [ ] E2E Quorum „alle“: alle müssen bestehen; Ablehnung → Korrektur → alle bekommen frische
      Aufgaben.
- [ ] E2E Bereichsrollen-Pflege: Admin + Bereichsleiter + Leiter übergeordneter Bereiche dürfen;
      andere nicht.
- [ ] E2E Neubesetzung: offene Aufgaben wechseln zum neuen Rolleninhaber mit Hinweis; Entleeren
      lässt sie unangetastet.
- [ ] E2E Withdrawn: intern (auch VIEWER) sieht Archiv-Sektion/Historie; extern nicht.
- [ ] Bestehende Workflow-Baselines grün (Bestandsschutz: manuelle Zuweisung alter Dokumente
      bleibt wirksam).
