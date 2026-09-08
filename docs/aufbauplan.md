# Aufbauplan Dokumentum — Aufgaben für die Coding-KI (OpenCode)

**Stand:** 01.09.2026 · Vorarbeit durch Hermes abgeschlossen: Login, Dokumente, Versionsmodell
(Major.Minor), Freigabe-Workflow mit Prüfer/Genehmiger, Aufgaben-Inbox, Dashboard, Konto,
Organisation, Benutzer, Audit-Trail (Service-Ebene). **Nicht** enthalten: TipTap-Editor und
Schulungsinhalte/Quizze (kommen später).

**So wird gefüttert:** Projektordner in OpenCode öffnen (`cd /home/corcken/nodejs/documentum`),
dann eine Aufgabe nach der anderen als Prompt geben. Nach jeder Aufgabe: Ergebnis zurück an
Hermes zur Verifikation (tsc + E2E-Tests), erst dann die nächste Aufgabe.

**Wichtig für OpenCode:** Nach Schema-Änderungen `npx prisma migrate dev` ausführen (Migration
anlegen, **nie die DB löschen**). Nach jeder Änderung muss `npx tsc --noEmit` fehlerfrei sein.

---

## Kontext-Block (einmalig voranstellen, danach reicht „Regeln in AGENTS.md“)

```
Projekt: QM-Dokumentenlenkung „Dokumentum“ — Next.js 16 (App Router, Server Actions),
Prisma 6 + SQLite (Ziel: PostgreSQL — Portabilität!), NextAuth v5 (JWT), Tailwind 4/shadcn.

Sprache: Alle UI-Texte, Kommentare und Meldungen auf Deutsch.

Architektur-Regeln (zwingend):
- Geschäftslogik NIE in Komponenten — Service-Layer in lib/services/ (testbar, DB-unabhängig)
- Keine DB-Trigger, kein Raw-SQL mit Dialekt-Spezifika (SERIAL/INTERVAL/CYCLE), keine @db.-Annotationen
- Prisma-Enums sind erlaubt; Status-Felder als Enum
- Kein hartes Löschen (GMP): Benutzer deaktivieren (isActive=false), Dokumente/Versionen archivieren
- Jede Änderung protokollieren via lib/services/audit.ts (logAudit: wer, wann, was, vorher/nachher)
- Auth-Guards aus lib/auth-guard.ts nutzen (requireUser/requireAdmin/requireUserId)
- Formulare mit Server Actions; native <select>, kein JS-nötig fürs Funktionieren;
  „use client“ nur wenn unbedingt nötig
- Versionsmodell (Vorgabe QM): Major.Minor; neu = 0.0; Speichern mit Änderung = Minor+1;
  Einreichung = Freeze; Genehmigung = Major+1, Minor 0; alte Released-Version → Archived;
  Leser (VIEWER) sehen nur die aktuell freigegebene Version
```

---

## Runde 2.5 — i18n-Grundgerüst (Mehrsprachigkeit vorbereiten)

### Aufgabe i18n: next-intl einrichten
**Ziel:** Die App ist auf Mehrsprachigkeit vorbereitet, bevor weitere Features mit neuen
Texten entstehen. UI-Texte liegen danach in Übersetzungs-Katalogen, nicht hart im JSX.
Standard-Sprache: Deutsch.
**Umfang (Vorschlag, Architektur vorher mit Hermes abstimmen):**
- next-intl installieren; `messages/de.json` (und ggf. `messages/en.json` initial)
- Locale-Handling festlegen (URL-Präfix `/[locale]/…` vs. Cookie — Empfehlung: URL-Präfix,
  auditierbar, QM-freundlich) — **Entscheidung nötig**
- Bestehende Seiten: erst einmal unverändert lassen (Nachrüstung = eigene Aufgabe danach);
  neue Features schreiben ihre Texte ab sofort in den Katalog
**Akzeptanz:** tsc grün; Startseite/Login funktioniert unverändert; Katalogstruktur steht;
eine Beispielseite zeigt, wie Übersetzung funktioniert.
**Offene Fragen vor dem Bauen:** Welche Sprachen außer Deutsch? (Englisch?) · URL-Schema?

---

## Runde 3 — Kern-Lücken schließen

### Aufgabe 0: Struktur-Aufräumen (Dateigrößen-Regel)
**Ziel:** Bestehende Überlängen beseitigen, damit neue Arbeit auf sauberer Struktur aufsetzt
(Regel: max. ~300 Zeilen/Datei).
**Umfang:**
- `lib/services/document.ts` (444 Z.) aufteilen nach Verantwortlichkeit, z. B.:
  `document.ts` (Anlegen/Speichern/Lesen/Liste), `workflow.ts` (Einreichen/Prüfen/
  Freigeben/Zurückgeben), `tasks.ts` (Inbox/Zähler) — Importe in `app/documents/actions.ts`
  und den Seiten entsprechend anpassen
- `app/documents/[id]/page.tsx` (344 Z.): `WorkflowActions`/`ReturnForm` nach
  `components/workflow-actions.tsx` auslagern
**Akzeptanz:** Verhalten unverändert (kein Feature-Delta); `npx tsc --noEmit` grün;
alle Seiten funktionieren wie vorher (keine Schema-/DB-Änderung).

### Aufgabe 1: Deaktivierte Benutzer am Login blockieren
**Ziel:** Benutzer mit `isActive=false` können sich nicht mehr anmelden (derzeit prüft der
Login nur E-Mail + Passwort).
**Dateien:** `auth.ts` (authorize-Callback)
**Akzeptanz:** Login mit deaktiviertem Konto → Fehlermeldung „Ungültige E-Mail oder Passwort“;
Login mit aktivem Konto funktioniert weiter. Kein Schema-Umbau nötig.

### Aufgabe 2: Audit-Log-Seite (Admin)
**Ziel:** Seite `/admin/audit` zeigt alle Audit-Einträge (wer, wann, Aktion, was) — Tabellen-
ansicht mit Filter nach Aktion und Freitext-Suche.
**Dateien:** `lib/services/audit.ts` (lies das Schema: AuditLog-Modell), neue Seite
`app/admin/audit/page.tsx` + Aktion in `app/admin/layout.tsx` bzw. `app-header.tsx` ergänzen.
**Akzeptanz:** Nur ADMIN sieht die Seite; Einträge chronologisch absteigend; Filter funktionieren;
Seite ist Server-Komponente ohne Client-JS-Zwang.

### Aufgabe 3: Dokument „Zurückziehen“ (neuer Status Withdrawn)
**Ziel:** Ein freigegebenes Dokument muss zurückgezogen werden können (z. B. fehlerhaft/ersetzt),
mit Pflicht-Begründung. Zurückgezogene Dokumente sind für Leser unsichtbar, bleiben aber in der
Chronik erhalten (GMP, kein Löschen).
**Umfang:** Neuer Status `Withdrawn` im Prisma-Enum `DocumentStatus` (Migration!); Service-
Funktion `withdrawDocument` in `lib/services/document.ts` (nur Ersteller/Admin? → Regel: nur
ADMIN oder Dokument-Eigentümer; Pflicht-Kommentar; Audit-Eintrag); UI-Button auf der Detail-Seite
(freigegebene Version) mit Begründungs-Textarea; Sichtbarkeit: VIEWER sieht Withdrawn-Dokumente
nicht (listDocuments + Detailseite anpassen).
**Akzeptanz:** Workflow-Test: Released-Dokument zurückziehen → Status Withdrawn, Audit-Eintrag,
für VIEWER unsichtbar, für Beteiligte in der Historie sichtbar; tsc grün; Migration angelegt.
**Achtung:** Neuer Enum-Wert muss überall behandelt werden (Status-Labels in lib/constants.ts!).

### Aufgabe 4: Änderungsgrund bei Bearbeitung (Pflicht-Kommentar)
**Ziel:** Beim Speichern einer neuen Version wird ein Änderungsgrund verlangt und an der Version
gespeichert (QM: Änderungslenkung nachvollziehbar).
**Umfang:** Neues Feld `changeReason String?` an `DocumentVersion` (Migration); Edit-Formular
(`components/document-edit-form.tsx`) bekommt Pflicht-Textarea „Was wurde geändert?“;
`saveDraftVersion` in `lib/services/document.ts` validiert + speichert; Anzeige in der
Versions-Historie der Detailseite.
**Akzeptanz:** Ohne Änderungsgrund kein Speichern; Grund erscheint in der Historie und im Audit.

---

## Runde 4 — Verwaltungs-UIs (Admin)

### Aufgabe 5: Job-Rollen-Verwaltung
**Ziel:** Seite `/admin/jobrollen`: Liste, anlegen, umbenennen; Löschen nur, wenn keine
Verweise (Dokument-Scope, Benutzer) existieren — sonst Fehlermeldung.
**Dateien:** analog `app/admin/org/` (Org-Einheiten) aufgebaut; Service-Erweiterung in
`lib/services/` (Audit nicht vergessen).
**Akzeptanz:** CRUD funktioniert; Lösch-Schutz greift; Audit-Einträge entstehen; Header-Link im
Admin-Bereich.

### Aufgabe 6: Dokumenttypen-Verwaltung
**Ziel:** Seite `/admin/dokumenttypen`: Liste, anlegen, umbenennen (Feld `requiresTraining`
vorhanden — anzeigen, editierbar). Löschen nur ohne Verweise.
**Akzeptanz:** wie Aufgabe 5.

---

## Runde 5 — QM & System

### Aufgabe 7: QM-Auswertungen (Admin)
**Ziel:** Seite `/admin/auswertungen` mit Diagrammen (recharts ist im Stack):
Dokumentenbestand nach Status, Dokumente je Typ, offene Aufgaben je Benutzer,
Aktivität (Audit-Einträge) der letzten 30 Tage.
**Akzeptanz:** Seiten rendern serverseitig, Diagramme clientseitig („use client“ nur für die
Chart-Komponente); Werte aus echten DB-Zählungen.

### Aufgabe 8: Fehlerseiten (404/403/500)
**Ziel:** `app/not-found.tsx`, `app/error.tsx` (Root) mit deutscher Ansprache und
„Zurück zum Dashboard“-Link. Kein roher Stacktrace sichtbar.
**Akzeptanz:** Unbekannte URL → freundliche 404-Seite.

### Aufgabe 9: Status-Lebenszyklus visualisieren
**Ziel:** In der Versions-Historie (Detailseite) den Lebenszyklus als Badge-Kette
Draft → In_Review → In_Approval → Released → Archived (bzw. Withdrawn) darstellen —
für die aktuell betrachtete Version mit Zeitstempeln der Übergänge (aus AuditLog ableiten).
**Hinweis:** Aufwand abschätzen; falls Audit-Ableitung zu komplex, einfachere Variante
(Badge-Reihe ohne Zeitstempel) als Zwischenschritt.

---

## Runde 6 — Uploads & Mediathek (Konzept abgestimmt 01.09.2026)

> **Vorab:** `docs/konzept-uploads.md` im Repo lesen — enthält alle Entscheidungen
> (10 MB, lokaler Speicher außerhalb public/, S3-Adapter später, Papierkorb 30 Tage,
> Mediathek = nur eigene Dateien, Avatar öffentlich, Anhänge erben die Sichtbarkeit
> ihrer Version, kein Sichtbarkeits-Entzug im Freeze).

### Aufgabe U1: Datenmodell & Upload-Service
**Ziel:** Dateien hochladen und sicher ablegen — Grundlage für alles Weitere.
**Umfang:**
- Prisma: Modelle `FileAsset` (ownerId, originalName, mimeType, size, storageKey @unique,
  sha256, width/height?, trashedAt?) und `FileAssetUse` (fileAssetId, documentVersionId?,
  role: "attachement"|"content_image"|"external_doc"|"avatar", createdById) + Migration
- Storage-Abstraktion (`lib/storage/`): Interface mit lokalem Backend
  (`~/.documentum-uploads/`, Pfad konfigurierbar) — S3-Backend später ergänzbar
- `lib/services/file.ts`: upload (Mime-Whitelist aus Konzept, Max. 10 MB, Inhalt gegen
  Endung via Magic Bytes, zufälliger storageKey, SHA256), logisches Löschen (nur ohne
  aktive Bindungen, setzt trashedAt), Wiederherstellen, Cleanup (physisch löschen wenn
  trashedAt > 30 Tage); Audit bei jedem Schritt
**Akzeptanz:** tsc grün; Upload legt Datei an (Key zufällig, nicht erratbar); falscher
Typ / >10 MB wird abgelehnt; Datei mit Bindung kann nicht gelöscht werden.

### Aufgabe U2: Geschützte Download-Schnittstelle
**Ziel:** Dateien nur mit Berechtigung ausliefern (Konzept Abschnitt 3: „Pförtner“).
**Umfang:** Route Handler `/api/files/[key]` (GET): Auth-Guard; Berechtigung aus den
Bindungen ableiten — avatar: jeder Eingeloggte; an Version gebunden: exakt die
Sichtbarkeit der Version (Released → Leser; Entwurf/Freeze → Beteiligte, kein Entzug);
Header: korrekter Content-Type, Content-Disposition (inline/attachment), Cache-Control:
private. **Kein** Audit beim Download.
**Akzeptanz:** ohne Session → 401; ohne Recht → 403; Avatar für eingeloggte andere User
ok; Anhang einer Released-Version für VIEWER ok; Anhang eines Entwurfs nur für Beteiligte.

### Aufgabe U3: Bildverarbeitung
**Ziel:** Bilder automatisch verkleinern, Metadaten entfernen.
**Umfang:** `sharp` installieren; beim Upload von Bildern automatisch zwei Varianten als
eigene FileAsset-Zeilen erzeugen: `preview` (max. ~1600px) und `thumb` (max. ~200px),
beide WebP; EXIF/GPS-Daten entfernen; Anzeige nutzt preview/thumb statt Original.
**Akzeptanz:** Testbild hochladen → Varianten existieren, Maße korrekt, keine EXIF-Metadaten
mehr (exiftool/identify-Check), Original bleibt unangetastet.

### Aufgabe U4: Mediathek
**Ziel:** Eigene Dateien verwalten (Konzept Abschnitt 5 + 6a).
**Umfang:** Seite `/mediathek` (nur eigene Dateien, nicht im Papierkorb): Liste/Galerie mit
Vorschau (thumb), Suche, Filter nach Typ, Download (über U2), Details (Größe, Typ, SHA256,
Erstelldatum); **Papierkorb-Ansicht**: logisch gelöschte Dateien mit Resttagen + Aktion
„Wiederherstellen“; Cleanup-Aufruf (U1) beim Seitenbesuch; Link im Header.
**Akzeptanz:** User A sieht nur eigene Dateien; Löschen → Papierkorb, aus Listen
verschwunden; Wiederherstellen → zurück; Datei älter als 30 Tage (Test: trashedAt in DB
manuell zurückdatieren) wird beim Cleanup physisch entfernt.

### Aufgabe U5: Anhänge an Dokumentversionen
**Ziel:** Dateien als Anhang an eine Version binden (explizite Freigabe).
**Umfang:** Detail-/Edit-Seite eines Dokuments: Anhang-Bereich (Name, Größe, Download über
U2); auf der Edit-Seite Datei hinzufügen (aus eigener Mediathek oder neu hochladen) und
entfernen — Bindung `FileAssetUse` mit role=attachement an die aktuelle Version; Entfernen
löscht nur die Bindung, nie die Datei; alte Versionen behalten ihre Anhänge (Historie).
**Akzeptanz:** Anhang an Draft nur für Beteiligte sichtbar; nach Freigabe (Released) auch
für VIEWER; Anhang einer archivierten Version bleibt über die Historie erreichbar.

### Aufgabe U6: Avatar (Userbild)
**Ziel:** Benutzerbild hochladen und anzeigen.
**Umfang:** Konto-Seite (`/konto`): Bild hochladen/ersetzen/entfernen (Bindung role=avatar,
1:1 je User, max. 10 MB, wird über U3 verkleinert); Anzeige im Header und überall, wo der
Name erscheint (Fallback: Kreis mit Initialen wenn kein Bild); Sichtbarkeit: alle
eingeloggten Benutzer (Entscheidung 01.09.2026).
**Akzeptanz:** Avatar erscheint nach Upload im Header; andere eingeloggte User sehen ihn
(überall, wo der Name steht); ohne Bild → Initialen-Fallback.

---

## Runde 7 — Dokumentenlenkung erweitert (abgestimmt 02.09.2026, Mone + Corcken)

> **Vorab lesen:** `docs/konzept-lenkung.md` (Aufgaben 10–12, alle Entscheidungen) und
> `docs/konzept-sichtbarkeit.md` (Sichtbarkeit & Leserechte). Beide sind Umsetzungs-Grundlage.

### Aufgabe 10: Prüffristen
`Document.reviewIntervalMonths Int?` (je Dokument) · `DocumentVersion.nextReviewDate DateTime?`
(Freigabedatum + Intervall) · Liste `/documents/prueffaellig` + Badge „Prüfung überfällig“.
Zwei Wege: (a) Prüfung MIT Änderung = neue Minor-Runde; (b) Prüfung OHNE Änderung = voller
Workflow (Ersteller → Prüfer → Freigeber) **ohne neue Revisionsnummer** — Version bleibt
Released, Prüfung läuft über Aufgaben, Abschluss verschiebt nur `nextReviewDate` + Audit.

### Aufgabe 11: Externe Dokumente (globale Dateien)
`FileAsset.isGlobal` · Mediathek-Tab „Globale Dokumente“ (nur ADMIN/EDITOR) ·
Download-Pförtner: isGlobal → ADMIN/EDITOR dürfen, VIEWER nur über Released-Bindung ·
Schreib-/Löschrechte: Rollencheck im Service (ADMIN/EDITOR), Papierkorb Owner oder ADMIN.

### Aufgabe 12: Aufbewahrung & Vernichtung (Vier-Augen)
`DocumentType.retentionMonths @default(120)` · `retentionEndDate` bei Archivierung/Withdrawn
(= obsoleteDate + Frist; obsoleteDate auch beim Archivieren setzen!) · Vernichtung **je
Version** · `DestructionRequest` (zwei verschiedene Admins, Service prüft hart) · logische
Vernichtung: content = [VERNICHTET], FileAsset-Zeilen bleiben mit `destroyedAt`, physische
Dateien weg, Pförtner 404 bei destroyedAt, Status `Destroyed` (UI-Kette/Auswertungen
mitbehandeln).

**Plus aus dem Sichtbarkeits-Konzept (gleiche Runde):** `defaultVisibility` je Dokumenttyp,
`visibility` an Versionen, `User.isExternal`, zentraler `canReadVersion`-Helper, Pförtner
und Listen auf canReadVersion umstellen (Details: docs/konzept-sichtbarkeit.md §5).

---

## Runde 8 — Konto & Kommunikation (aus Assist-Todo übernommen 02.09.2026)

> Herkunft: alte Todo-Liste im Projekt „Documentum“ der Assist-App (Themen, die dort
> gesammelt wurden, bevor der Aufbauplan existierte).

### Aufgabe 13: Benutzerkonto erweitern (Avatar + E-Mail-Adresse)
**Ziel:** `/konto` um Userbild und E-Mail-Änderung ergänzen.
- **Userbild mit Cropping:** Upload/Ersetzen/Entfernen (FileAsset role=avatar, 1:1 je User,
  max. 10 MB, Varianten über die Bild-Pipeline); **Cropping** vor dem Speichern (Client-seitig,
  z. B. einfacher Bild-Crop, bevor die Datei an die Action geht); Anzeige Header + überall,
  wo der Name steht; Fallback: Initialen-Kreis. (War als U6 in Runde 6 geplant und wurde
  nicht umgesetzt — hier nachgeholt, erweitert um Cropping.)
- **E-Mail-Adresse ändern:** Bestehende E-Mail-Adresse im Konto anpassen (mit Validierung,
  Eindeutigkeit, Audit-Eintrag); Login per neuer Adresse möglich.

### Aufgabe 14: E-Mail-System (SMTP) mit Event-Vorlagen
**Ziel:** E-Mail-Versand aus der App + pflegbare Vorlagen.
- **Admin-Einstellungen:** SMTP-Server-Daten (Host, Port, Verschlüsselung, Absender,
  Zugangsdaten) — über die AppSetting-Tabelle (Key-Value, existiert) bzw. die geplante
  Admin-Einstellungsseite; Werte verschlüsselt ablegen.
- **E-Mail-Vorlagen:** je **Event** (z. B. „zur Prüfung eingereicht“, „Prüfung bestanden“,
  „Freigabe erfolgt“, „zurückgewiesen“, „Prüfung fällig/überfällig“, „Konto angelegt“) —
  jeweils **HTML und Plaintext**; platzhaltbar (Dokumentnummer, Titel, Link, Name);
  Verwaltung im Admin-Bereich.
- **Versand:** Workflow-Service stößt Benachrichtigungen an die Beteiligten an
  (Reviewer/Approver/Owner). Versandfehler loggen, nie den Workflow blockieren.
- **Offene Fragen (vor Umsetzung klären):** Welche Events genau? Empfänger immer nur
  Beteiligte? Testmodus (Log statt Versand) für die Entwicklungsphase?

---

## Runde 9 — Bereichs-Rollen & Quorum (Design vorab! — aus Assist-Todo)

> Fachlich groß, berührt das Workflow-Modell (heute: genau 1 Prüfer + 1 Genehmiger je
> Dokument, bei der Anlage zugewiesen). **Vor der Umsetzung mit Mone/User abstimmen** —
> folgende Punkte sind Vorgaben aus der Todo-Liste, keine Entscheidungen:

- **Jeder Bereich (Organisationseinheit) benennt eigene Verantwortliche:** einen oder
  mehrere **Ersteller**, **Prüfer**, **Freigeber**.
- **Quorum:** Bei mehreren Prüfern/Freigebem pro Bereich einstellbar: Muss **jeder** prüfen/
  freigeben oder genügt **einer**?
- Berührt: Anlage-Zuweisung (heute reviewerId/approverId am Dokument), Aufgaben-Inbox,
  Detailseiten-Anzeige, Audit.
- Überschneidet sich mit offenen Punkten „Abteilungs-Chef“ und „verantwortliche Abteilung“
  (siehe Klärungs-Bedarf unten) — im Design zusammenführen.

---

## Klärungs-Bedarf (vor Runde 6, nicht an OpenCode geben)

1. **Anhänge/Dateiablage** — wo liegen Dateien (lokal/S3)? (Anhänge-Aufgabe wartet darauf)
2. **Abteilungs-Chef** — Leiter-Feld an Organisationseinheit? (Freigebender pro Abteilung)
3. **Verantwortliche Abteilung am Dokument** — wer darf in einer Abteilung anlegen?
4. **Group-Modell** — überflüssig neben Department? (Schema bereinigen?)
5. **LDAP** — Ausbaustufe später (AppSetting-Tabelle existiert im Schema)
6. **PostgreSQL-Umzug** — erst wenn produktiv

---

## Schritt 0 (empfohlen, klein): AGENTS.md im Repo befüllen

Damit OpenCode die Projekt-Regeln automatisch kennt (AGENTS.md wird vom Agent gelesen),
den Kontext-Block oben nach `AGENTS.md` im Repo schreiben. Dann genügen kurze
Aufgaben-Prompts („Setze Aufgabe 3 um — Details in AGENTS.md“).
**Status:** von Hermes angeboten, noch nicht ausgeführt (wartet auf OK vom User).
