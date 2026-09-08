# Anforderungen — Dokumentum

**Status:** Konzeptphase — Techstack entschieden, DB-Entwurf als Konzept (v1), Features grob definiert.

## ✅ Entschieden: Techstack (User-Vorgabe 31.08.2026)

**Framework & Runtime**
- Next.js 16 (App Router, RSC), React 19, TypeScript 5

**Datenbank / ORM**
- Prisma 6 + SQLite (dev.db) — **SQLite nur für Prototyp**, später Wechsel auf PostgreSQL (Prisma-Provider-Wechsel; Schema bleibt Single Source of Truth, keine DB-Trigger/DB-spezifischen Raw-SQLs, Geschäftslogik als App-Code)

**Auth**
- NextAuth v5 (Credentials-Provider, JWT-Sessions) + bcryptjs + zod

**UI & Styling**
- Tailwind CSS 4 + shadcn/ui (Base UI) + lucide-react
- class-variance-authority, clsx, tailwind-merge, tw-animate-css

**Editor**
- TipTap 3 (Rich-Text-Editor, Content als JSON/HTML)

**State & Daten**
- Zustand 5, TanStack Query 5, React Hook Form + @hookform/resolvers
- recharts 3 (Charts)

**Tooling**
- ESLint 9 (eslint-config-next), PostCSS/Tailwind PostCSS

## 🎯 Feature-Scope (User 31.08.2026)

**Kernfunktionen:**
- Dokumenten-Erstellung (TipTap-Editor)
- Freigabe-Workflow (Review → Approval)
- Verwaltung, Revisionierung, Dokumentenlenkung
- Umwandlung von Dokumenten in Schulungsinhalte
- Schulungstracking, abgeleitet von den Dokumenten

**Dokumentarten:** SOP, Formblätter, Protokolle, Berichte, Prüfprotokolle etc.

## 🎯 Zielbild (User 31.08.2026)

- **Jetzt:** **Testprojekt** — Wie gut funktioniert die Zusammenarbeit (Hermes + Monki + Mone)? Wie gut kommt Mone in den Workflow?
- **Möglich:** **Verkaufssoftware** (Self-Hosted oder SaaS) für Unternehmen bis ~10.000 Mitarbeiter
- **Mone = Fach-Expertin:** Ihr Review gibt dem Produkt Tiefe — QM-Konformität als Verkaufsargument

### Zielstandard (User 31.08.2026): GMP, nicht ISO 9001

**„ISO 9001 ist Kinderkacke — das geht Richtung GMP."** (User)
Ziel ist **GMP** (Good Manufacturing Practice, z. B. EU GMP Annex 11 / 21 CFR Part 11) — ISO 9001 dient nur als Basis. GMP verschärft die Anforderungen:

1. **Audit-Trail:** append-only (nur anlegen, nie ändern/löschen), fälschungssicher, präzise Zeitstempel — kein Lösch-/Änderungspfad für Audit-Daten in der App
2. **Elektronische Signatur:** rechtlich belastbar — eindeutige User-ID + Name, Zeitstempel, Grund (reviewed/approved/trained), fest verknüpft mit Datensatz + Version, nicht wiederverwendbar
3. **Datenintegrität (ALCOA+):** zurechenbar, lesbar, zeitgleich, original, genau, vollständig, konsistent, dauerhaft, verfügbar — Server-Zeitstempel, keine direkten DB-Eingriffe
4. **Kein hartes Löschen:** Dokumente, Versionen, Schulungen, Audit-Einträge nur archivieren/sperren, nie physisch löschen
5. **Aufbewahrungsfristen:** regulatorisch (oft ≥ 10 Jahre) — Archiv-Konzept nötig
6. **Validierung (CSV):** Software validierbar bauen (versionierte Releases, Testnachweise) — Prozess-Thema; Architektur (Service-Layer, Schema-Migrationen) unterstützt es
7. **Schulungsnachweise = regulatorisches Beweismittel:** wer, wann, welche Version, welcher Inhalt, Nachweis

**Einordnung:** Das sind „billige Weichen" — Design-Entscheidungen jetzt (append-only Audit, Signatur-Struktur, kein hartes Löschen), keine Umsetzung jetzt.

### Konsequenzen

**Jetzt (Testphase):** bewusst einfach, schnelle sichtbare Ergebnisse, keine Multi-Tenancy.

**Weichen jetzt schon stellen (billig):**
- Service-Layer + Prisma als Quelle (läuft bereits)
- Portabilität SQLite → PostgreSQL (läuft bereits)
- Keine Single-Company-Annahmen in Logik verstecken (z. B. Nummernkreise, Fristen als Konfiguration statt hardcoded)

**Später, falls Produkt (eigenes Arbeitspaket, nicht vorwegnehmen):**
- Multi-Tenancy (Mandanten-Konzept: company_id durchgängig)
- SSO/Login-Anbieter, E-Mail-/Reminder-Infrastruktur, Mandanten-Isolation, Backups

**Realistische Einordnung:** 10.000 Mitarbeiter **pro Firma** ist für eine einzelne Instanz gut machbar — QM-Tools werden häufig genau so (Self-Hosted je Kunde) verkauft. SaaS-Multi-Tenant wäre der große zusätzliche Umbau; Entscheidung erst, wenn es konkret wird.

## 📐 Versionsmodell (Vorgabe Mone, 31.08.2026) — Pflicht

- **Format:** `Major.Minor` (z. B. `2.045`)
- **Neu erstellt:** `0.0`
- **Bearbeitung:** jedes Speichern → Minor +1 (`0.1`, `0.2`, …)
- **Einreichung zur Prüfung:** Dokument ist **im Freeze** (keine Änderung mehr)
- **Zurück mit Kommentar:** zurück an Ersteller → Bearbeitung geht weiter (Minor zählt weiter)
- **Genehmigt:** Major +1, Minor = 0 → aus `2.045` wird `3.0`
- **Sichtbarkeit:**
  - **Leser:** sehen nur freigegebene Stände (`2.0`) — Entwürfe unsichtbar
  - **Ersteller/Prüfer/Genehmiger:** sehen auch alle Bearbeitungsstände (`2.0` bis `2.045`)
- **Konsequenz Schema:** `DocumentVersion` bekommt `majorVersion` + `minorVersion` (Int) statt `versionNumber` (String); Status-Flow: Bearbeitung → Freeze (In_Review/In_Approval) → zurück (Draft) → Released (Genehmigt)

### Präzisierungen (Mone/User, 31.08.2026)
1. **Leser-Sicht:** Nur das **aktuell genehmigte** Dokument ist sichtbar — alte freigegebene Versionen werden für Leser ausgeblendet (nur Beteiligte sehen die Historie)
2. **Speichern = neue Minor-Version, aber nur bei Änderung** — ohne Änderung keine neue Version
3. **Diff:** Die letzten beiden Versionen müssen vergleichbar sein (Änderungen anzeigen)
4. **Zurückspringen erzeugt eine neue Version:** aus 2.021/2.020 wird 2.023 (alte Stände bleiben als Chronik erhalten)
5. **Zählung läuft weiter** — nach „Zurück mit Kommentar" wird nicht neu begonnen (2.046, 2.047, …)

## ✅ Entscheidungen

1. **Scope-Verhalten (User 31.08.2026):** Scope „Abteilung X" **expandiert nach unten** — Unterabteilungen/Teams werden automatisch mit erfasst (entspricht SQL-Entwurf, rekursive CTE). Keine Ebenenbegrenzung.
2. **Audit-Trail (User 31.08.2026):** **Pflicht, vollumfänglich.** Jede Änderung wird protokolliert: wer, wann, was (vorher/nachher) → `AuditLog`-Tabelle.
3. **Schulungs-Tracking (User 31.08.2026):** **Pflicht.** „Wer muss die Schulung machen" (Zuweisung) + „Wer hat sie erledigt" (Abschluss, Zeitpunkt, Signatur/Nachweis) → `TrainingRecord`. Schulungsinhalte/Quizze: **offen**, später andockbar.
4. **Auth-Modus konfigurierbar (User 31.08.2026):** Große **Admin-Einstellungsseite** — dort umschaltbar zwischen **Standalone** (lokale Passwörter) und **LDAP**. Dafür wird eine `AppSetting`-Tabelle (Key-Value) ergänzt; Auth-Schicht liest den Modus zur Laufzeit.
5. **Inhaltsfeld (User 01.09.2026):** Bis der TipTap-Editor kommt (später geplant), ist das Inhaltsfeld ein **einfaches Textfeld** (Textarea beim Anlegen/Bearbeiten) und die Ansicht zeigt den Inhalt als **Text** — beides ohne JavaScript-Abhängigkeit (Server-gerendert). Grund: Der TipTap-Editor rendert nur clientseitig und erschien im Browser nicht zuverlässig. Alte TipTap-JSON-Inhalte werden beim Anzeigen automatisch nach Text konvertiert (`lib/content.ts`); der Editor-Code bleibt erhalten und wird später wieder aktiviert.

## 🔐 Benutzer-Anbindung (LDAP) — geprüft, machbar

**Stand 31.08.2026:** Machbar — offizielles NextAuth-Muster (Credentials-Provider + `ldapjs`). Login wird gegen das Firmenverzeichnis (Active Directory / OpenLDAP) geprüft; das Passwort liegt **nicht** in der App.

**Wie es funktioniert:** User gibt Firmen-Login ein → App fragt Verzeichnis „stimmt das Passwort?" → bei Erfolg ist er authentifiziert; App-Daten (Abteilung, Job-Rolle, Schulungen, Audit) bleiben lokal in unserer DB.

**Varianten:**
1. **Direkt gegen AD/OpenLDAP** (einfach, Standard)
2. **SSO (SAML/OIDC)** via Entra ID / Keycloak — Enterprise-Weg, falls vorhanden
3. **Hybrid** (empfohlen): LDAP authentifiziert, lokale DB hält Rollen/Abteilung

**GMP-Bonus:** zentrale Kontenverwaltung — wer im Verzeichnis deaktiviert ist (Austritt), kommt automatisch nicht mehr rein. Eindeutige User-IDs (AD objectGUID) für saubere Audit-Zuordnung.

**Schema:** Kein Umbau nötig — `User.username` = LDAP-Konto; `password`-Feld wird bei LDAP-Betrieb einfach nicht genutzt.

**Empfehlung Hermes:** Prototyp weiter mit lokalem Passwort (läuft bereits); LDAP als **konfigurierbare Ausbaustufe** — Auth-Schicht so bauen, dass der Provider umschaltbar ist.

**Offene Fragen:**
1. Welches Verzeichnis? (Active Directory / OpenLDAP / Entra ID?)
2. Benutzer-Anlage: automatisch beim ersten Login (JIT) oder Admin legt vorab an? (GMP tendiert zu kontrolliert = Admin, oder JIT mit Standard-Rolle)
3. Abteilungen/Rollen aus Verzeichnis-Gruppen übernehmen?
4. Wann umsetzen: jetzt oder als spätere Ausbaustufe?

## 🗄️ DB-Entwurf (Konzept v1, User 31.08.2026)

Abgelegt: `docs/db-entwurf/01…06_*.sql` (im App-Repo)
- 01 Organisation: Abteilungen (Baum), Job-Rollen, System-Rollen, User
- 02 Dokumentenkern: Dokumenttyp (mit Schulungspflicht), Dokument (Nummer), Version (Status-Lebenszyklus Draft → In_Review → In_Approval → Released → Archived)
- 03 Geltungsbereich & Workflow: Scope nach Abteilung + Job-Rolle, Review/Approval-Aufgaben
- 04 Schulungsmanagement: Training-Records mit Fälligkeit + elektronischer Signatur
- 05 Revisions-Logik: Trigger archiviert Vorgängerversionen bei Freigabe
- 06 Schulungs-Zuweisung: rekursive CTE (Abteilungsbaum) als Konzept

**Wichtig:** Entwurf ist PostgreSQL-Dialekt (SERIAL, PL/pgSQL-Trigger). Ziel ist Prisma + SQLite → muss in `schema.prisma` überführt werden, Trigger-Logik wird App-Code (Service-Layer).

## ⚠️ Offene Punkte

**Gelöst durch Schema-Entwurf (31.08.2026):** TipTap-Content ✓ · Passwort ✓ · Audit-Trail ✓ · Signatur als JSON ✓ · Overdue berechnet ✓ (Punkte 1, 2, 4, 5, 6 des Reviews)

**Noch offen:**
1. **Schulungsinhalte/Quizze** — User überlegt noch; `TrainingRecord` ist dafür vorbereitet (Andocken ohne Umbau)
2. **Workflow-Reihenfolge** erzwingen (Review vor Approval) — App-Logik, beim Bauen
3. **Dateiablage-Ort** (`filePath`: lokal? S3?)
4. **`Group`** (aus Scaffold) — evtl. überflüssig neben `Department`
5. **Abteilungs-Chef:** Soll `Department` ein Leiter-Feld bekommen (`headId` → User)? Nutzen: Abteilungsleiter als Freigebender/Dokumentenverantwortlicher (User-Frage 31.08.2026)
6. **Verantwortliche Abteilung am Dokument:** Soll `Document` eine verantwortliche Abteilung bekommen? Und daraus abgeleitet: Wer darf in einer Abteilung anlegen/ändern — global (EDITOR-Rolle) oder abteilungsbezogen? (User-Frage 31.08.2026)

## 📋 Übernommen aus der Assist-Todo-Liste (02.09.2026)

> Diese Anforderungen standen in der alten Todo-Liste des Assist-Projekts „Documentum“
> (vor dem Aufbauplan gesammelt). Sie sind in den Aufbauplan eingearbeitet
> (Runde 8: Aufgaben 13–14, Runde 9: Bereichs-Rollen & Quorum). Hier dokumentiert, damit
> nichts verloren geht.

1. **E-Mail-Versand über SMTP** (Aufgabe 14) — Admin-SMTP-Einstellungen, Versand aus der App.
2. **E-Mail-Vorlagen** in HTML und Plaintext, bestimmten **Events** zugeordnet (Aufgabe 14).
3. **Administratormenü:** SMTP-Einstellungen (Aufgabe 14) · User-Übersicht ✅ existiert
   (`/admin/benutzer`) · Audit Trail ✅ existiert (`/admin/audit`).
4. **Bereichs-Rollen:** Jeder Bereich benennt eigene Ersteller/Prüfer/Freigeber (einer oder
   mehrere); bei mehreren Prüfern/Freigebem einstellbar, ob alle oder einer
   prüfen/freigeben müssen (**Quorum**) — Runde 9, Design vorab mit Mone/User.
5. **Benutzerkonto:** Userbild mit **Cropping** einfügbar (Aufgabe 13, baut auf dem
   Avatar-Konzept aus konzept-uploads.md auf); **E-Mail-Adresse** anpassbar (Aufgabe 13).

## Rahmen
- Name: Dokumentum
- Gemeinschaftsprojekt Hermes (default) + Monki
- App-Repo: /home/corcken/nodejs/documentum (Zugriff Hermes ✓)
- Koordination: ~/projekte/Dokumentum/

## Grundsatz
Nichts erfinden — Features nur aufnehmen, wenn User sie bestätigt.
