<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Dokumentum — Projekt-Regeln (QM-Dokumentenlenkung & Schulungen)

## Projekt

GMP-orientierte Dokumentenlenkung: Dokumente erstellen, freigeben (Review → Approval),
revisionieren, verwalten. Fach-Review-Instanz ist eine QM-Expertin (Mone); Vorgaben zu
Versionen und Sichtbarkeit sind verbindlich (siehe unten).

## Techstack

- Next.js 16 (App Router, RSC, Server Actions), React 19, TypeScript 5
- Prisma 6 + SQLite (Prototyp) — **Ziel: PostgreSQL** (Portabilitätsregeln, s. u.)
- NextAuth v5 (Credentials, JWT-Strategie) + bcryptjs + zod
- Tailwind CSS 4 + shadcn/ui, lucide-react
- **next-intl (Mehrsprachigkeit vorbereitet)** — UI-Texte in Übersetzungs-Katalogen
  (`messages/de.json` …), Standard-Sprache Deutsch; Einbau als Aufgabe vor weiteren Features
- TipTap 3 ist **zurückgestellt** — Inhaltsfeld ist ein einfaches Textfeld (Textarea, Text)
- recharts (für künftige Auswertungen), Zustand/TanStack Query vorhanden, vorerst ungenutzt

## Grundregeln (zwingend)

> **Wichtig zur Einordnung:** Die Regeln 4 und 5 beschreiben das **Verhalten der ANWENDUNG**
> (Fachlogik, die du implementierst) — sie gelten nicht für deine eigene Arbeitsweise.
> Du als Programmierer darfst selbstverständlich Dateien ändern/löschen und deine Arbeit
> per Git versionieren. Die App aber darf keine Daten hart löschen und muss Änderungen
> in der AuditLog-Tabelle nachvollziehbar machen.

1. **Sprache & Mehrsprachigkeit:** UI-Texte, Kommentare, Meldungen, Commit-Messages auf
   Deutsch. **Ab dem i18n-Einbau:** UI-Texte NIE hart in Komponenten/JSX schreiben, sondern
   in den Übersetzungs-Katalog (`messages/de.json`, Schlüssel via next-intl) — auch wenn
   aktuell nur Deutsch angezeigt wird. Fachinhalte (Dokument-Inhalt) bleiben unübersetzt.
2. **Service-Layer:** Geschäftslogik gehört nach `lib/services/` — nie in Komponenten oder
   Route-Handlern (testbar, DB-unabhängig).
3. **DB-Portabilität (SQLite → PostgreSQL):** keine DB-Trigger, kein Raw-SQL mit
   Dialekt-Spezifika (SERIAL/INTERVAL/CYCLE), keine `@db.`-Annotationen; Prisma-Enums
   erlaubt (auch Status-Felder als Enum). Migrationen via `prisma migrate dev`.
4. **Kein hartes Löschen — App-Verhalten (GMP):** Die Anwendung bietet kein physisches
   Löschen von Benutzern, Dokumenten oder Versionen an. Benutzer werden deaktiviert
   (`isActive = false`), ersetzte freigegebene Versionen werden auf `Archived` gesetzt.
   Implementiere Lösch-Pfade nur, wenn die Fachlogik sie ausdrücklich vorsieht.
5. **Audit-Trail — App-Verhalten:** Jede Service-Funktion, die Daten ändert (anlegen,
   ändern, Statuswechsel), ruft `logAudit` aus `lib/services/audit.ts` auf — Eintrag mit
   wer (userId), wann, Aktion, vorher/nachher in die `AuditLog`-Tabelle. Neue Funktionen
   ohne Audit-Eintrag gelten als unvollständig.
6. **Auth:** Guards aus `lib/auth-guard.ts` (`requireUser`, `requireAdmin`, `requireUserId`)
   in jeder geschützten Seite/Action.
7. **Formulare:** Server Actions; native `<select>`; Funktionieren ohne Client-JS;
   `"use client"` nur wenn unbedingt nötig (z. B. Diagramme).
8. **Dateigröße:** Ziel max. ~300 Zeilen pro Datei. Wächst eine Datei darüber hinaus,
   wird zusammengehörige Logik regelmäßig in eigene Dateien ausgelagert (Service pro
   Domäne, Komponenten nach `components/`, Helfer nach `lib/`). Aufteilen nach
   Verantwortlichkeit, nicht mechanisch nach Zeilenzahl. Ausnahmen: reine
   Daten-/Katalogdateien (Seed-Daten, Übersetzungen, Statuslisten).

## Versionsmodell (Vorgabe QM, verbindlich)

- Format `Major.Minor`; neues Dokument = `0.0`; jedes Speichern mit Änderung = Minor +1.
- Einreichung = Freeze (`In_Review` → `In_Approval`); „Zurück mit Kommentar" = weiter im
  Draft, **Zählung läuft weiter** (kein Neustart).
- Genehmigung = Major +1, Minor 0, `Released`; alte Released-Version → `Archived`.
- Zurückspringen auf alten Stand = neue Minor-Version (Chronik bleibt, Diff möglich).
- **Sichtbarkeit:** VIEWER (Leser) sehen nur die aktuell freigegebene Version — Entwürfe
  und ältere Stände sind unsichtbar. Beteiligte (Ersteller/Prüfer/Genehmiger) sehen Entwürfe.
- Workflow-Zuordnung: jede Version hat `reviewerId` + `approverId` (Vier-Augen-Prinzip,
  Genehmiger ≠ Ersteller); nur der Zuständige darf prüfen/freigeben (Server erzwingt das).
- Status-Labels/-Styles: in `lib/constants.ts` pflegen (neue Enum-Werte überall behandeln).

## Planung & Aufgaben (lesen, bevor du Code schreibst)

- `docs/aufbauplan.md` — **Aufgaben in Runden** (2.5 i18n, 3 Kern-Lücken, 4 Verwaltung,
  5 QM & System, 6 Uploads, 7 Lenkung): die jeweils anstehende Aufgabe umsetzen; nach
  jeder Aufgabe berichten, damit Hermes verifiziert (tsc + E2E), bevor die nächste folgt.
- `docs/anforderungen.md` — fachliche Anforderungen, Entscheidungen, offene Punkte.
- `docs/konzept-uploads.md` — abgestimmtes Upload-/Mediathek-Konzept (Runde 6).
- `docs/db-entwurf/` — historischer SQL-Entwurf (Konzept; maßgeblich ist `schema.prisma`).

## Entwicklung

- Typecheck: `npx tsc --noEmit` muss fehlerfrei sein.
- Schema-Änderung: `npx prisma migrate dev` (Migration anlegen, **nie die DB löschen** —
  bestehende Demo-Daten bleiben).
- Seed: `npx -y tsx scripts/seed.ts` (idempotent); Demo-Login admin@example.com / password123,
  Workflow-Demo-User pruefer@example.com (Petra), freigeber@example.com (Frank).
- `next build`/Turbopack können auf dieser Maschine hängen → Dev: `npm run dev` (Webpack,
  Port 3300); Änderungen erst nach Server-Neustart zuverlässig sichtbar.
- Wichtige Dateien: `lib/services/document.ts` (Workflow), `app/documents/actions.ts`
  (Server Actions), `components/app-header.tsx` (Navigation).
