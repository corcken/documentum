# Konzept: Uploads & Mediathek (Dokumentum)

**Stand:** 01.09.2026 · **Status:** Konzeptentwurf — offene Fragen am Ende, erst nach
Abstimmung (User/Mone) bauen.

---

## 1. Anwendungsfälle (was hochgeladen wird)

| Fall | Typen | Wohin gebunden | Freigabe |
|---|---|---|---|
| **Userbild (Avatar)** | Bild (jpg/png/webp) | an Benutzerkonto | implizit (wer das Profil/den Namen sieht) |
| **Eingebettete Bilder in Dokumenten** | Bild | an Dokumentinhalt (kommt mit dem Editor) | implizit über die Dokument-Sichtbarkeit |
| **Anhang an ein Dokument** | PDF, docx, xlsx, csv, txt, Bilder | an Dokumentversion | explizit beim Anhängen |
| **Externe Dokumente** (Normen, Gesetze, Kundenvorgaben) | vor allem PDF | an externes Dokument | wie externes Dokument (siehe offene Punkte) |
| **Mediathek** | alles oben | eigenständig, wiederverwendbar | Besitzer verwaltet |

Prinzip: **Eine Datei = ein Asset mit Besitzer**, das an beliebige Stellen gebunden werden
kann (Avatar, Anhang, Inhalt, externes Dokument). Keine Datei-Kopien pro Verwendungsort.

---

## 2. Speicherort & Datenmodell

### Speicherort
- **Prototyp: lokales Dateisystem** unter `~/.documentum-uploads/` (bzw. konfigurierbar),
  **außerhalb von `public/`** — nie direkt per URL erreichbar. **(Entscheidung 01.09.2026)**
- **Ziel: Objekt-Storage (S3-kompatibel)** — Abstraktionsschicht von Tag 1, damit nur der
  Speicher-Backend-Teil getauscht wird (analog SQLite→PostgreSQL-Prinzip).

### Datenmodell (Prisma)
```prisma
model FileAsset {
  id           String   @id @default(cuid())
  ownerId      String              // Besitzer (Pflicht — Datei gehört immer jemandem)
  owner        User     @relation(...)
  originalName String              // Anzeigename (normalisiert, ohne Pfad)
  mimeType     String              // aus Whitelist geprüft
  size         Int                 // Bytes (Original)
  storageKey   String   @unique    // interner Schlüssel (zufällig, nicht erratbar)
  sha256       String              // Integritäts-/Duplikatprüfung
  width        Int?                // nur Bilder
  height       Int?                // nur Bilder
  trashedAt    DateTime?           // Papierkorb: logisch gelöscht (s. Lösch-Konzept)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Bildvarianten:** je Bild bis zu 3 Zeilen (gleiche Tabelle, `variant`-Feld):
`original` · `preview` (max. ~1600px, WebP) · `thumb` (max. ~200px, WebP).
Varianten haben denselben Owner und dieselbe Zugriffslogik — nur anderer `storageKey`.

### Bindung an Entitäten (Verwendungszweck)
- `User.avatarFileId` → FileAsset (1:1)
- `DocumentVersion.filePath` → entfällt, ersetzt durch Bindungs-Tabelle
- Bindungs-Tabelle (viele Dateien je Version, eine Datei mehrfach nutzbar):
```prisma
model FileAssetUse {
  id                String          @id @default(cuid())
  fileAssetId       String
  fileAsset         FileAsset       @relation(...)
  documentVersionId String?         // Anhang an Version
  role              String          // "attachement" | "content_image" | "external_doc" | "avatar"
  createdAt         DateTime        @default(now())
  createdById       String
}
```
- Externe Dokumente binden später über ihren eigenen Versionstyp an `role="external_doc"`.

### Warum Bindung an die **Version**, nicht ans Dokument?
Weil jede Version ihren eigenen Anhangsbestand hat (GMP): Version 1.0 hat Anhang A,
Version 1.1 hat Anhang A + B — die Historie bleibt exakt rekonstruierbar.

---

## 3. Zugriffsschutz (Download nur mit Berechtigung)

**Kernidee (einfach erklärt):** Dateien liegen in einem abgeschlossenen Raum. Im Internet
gibt es kein Schaufenster dazu — jede Anfrage läuft durch einen **Pförtner** (Route
Handler `/api/files/[key]`), der erst den Ausweis prüft und dann entscheidet, ob die Datei
rausgegeben wird. Dateinamen sind zufällige Schlüssel, nicht erratbar; der Raum selbst ist
für niemanden direkt erreichbar.

**Regeln für den Pförtner:**
1. Keine Datei ohne gültige Session (Auth wie überall).
2. Berechtigung hängt an der **Bindung** (FileAssetUse), nicht an der Datei selbst:
   - `avatar` → nur der Besitzer selbst + wer dessen Namen/Profil sehen darf
   - `attachement` / `content_image` → abgeleitet von der **Dokument-Sichtbarkeit**:
     Anhänge **erben exakt die Sichtbarkeit der Version**, an die sie gebunden sind
     (Entscheidung 01.09.2026). Freeze-Phasen (In_Review/In_Approval) ändern daran
     **nichts** — wer die Version sehen kann, sieht auch ihre Anhänge (kein Entzug beim
     Einreichen; Freigabe erlischt erst beim Archivieren/Zurückziehen)
   - `external_doc` → Regel folgt dem Konzept externe Dokumente (offener Punkt 4)
3. Audit-Eintrag beim Download? → **bewusst nein** (sonst rauscht jeder Seitenaufruf das
   Audit-Log voll). Download-Zähler optional später.
4. Auslieferung mit korrektem `Content-Type`, `Content-Disposition` (inline bei Bildern/PDF,
   attachment bei Office/CSV) und `Cache-Control: private`.

**Technisch:** Next.js Route Handler + `sharp` (Bildvarianten), Upload via Server Action
(multipart) mit Limits; Dateien nie über `public/` ausliefern.

---

## 4. Bildverarbeitung

- Bibliothek: **sharp** (Standard bei Next.js, bereits im Ökosystem).
- Beim Upload automatisch:
  - Bild erkannt (Mime/Inhalt) → `preview` + `thumb` erzeugen (WebP, verlustarm)
  - EXIF-Daten entfernen (Datenschutz: keine GPS-/Kamera-Metadaten nach außen)
- Große Bilder (> ~1600px) werden beim Einbetten automatisch als `preview` verwendet,
  nie das Original (Ladezeit + Datenvolumen).

---

## 5. Mediathek

- **Mediathek zeigt nur die eigenen Dateien** (Besitzer-Prinzip, Entscheidung 01.09.2026) —
  Liste/Galerie mit Vorschau, Suche, Filter nach Typ; Aktionen: herunterladen (nur sich
  selbst), verwenden (an Dokument anhängen / später einbetten), Details (Größe, Typ, SHA256).
- **Kein Team-Ordner-Konzept:** jede Datei hat genau einen Besitzer; geteilt wird über die
  Bindung an ein Dokument, nie direkt.

---

## 6. Freigabe-Logik (implizit vs. explizit)

- **Implizit (automatisch, ohne Extra-Schritt):**
  - Avatar: mit dem Konto sichtbar
  - Inhalt-Bilder: **sobald die Version freigegeben (Released) ist**, gilt die Datei als
    freigegeben; beim Zurückziehen/Archivieren erlischt die Freigabe automatisch
- **Explizit (bewusster Akt):**
  - Anhang an ein Dokument anhängen = Freigabe an alle, die das Dokument (in dieser
    Version) sehen dürfen; Entfernen des Anhangs = Freigabe Ende
- **Kein Löschen mit Verweisen:** Eine Datei kann nur gelöscht werden, wenn keine
  aktiven Bindungen mehr existieren (sonst Fehler „Datei wird noch verwendet“);
  Löschen ist ein Audit-Ereignis. (Verwaiste Dateien, die nie gebunden wurden, können
  vom Besitzer jederzeit gelöscht werden.)

## 6a. Löschen & Papierkorb (Entscheidung 01.09.2026)

**Regel:** Ungebundene Dateien werden in zwei Schritten gelöscht — **Papierkorb mit
30-Tage-Frist**, dann automatisch endgültig.

1. **Logisch löschen** (Besitzer klickt „Löschen“, keine aktiven Bindungen): Datei
   bekommt `trashedAt = jetzt`, verschwindet aus Mediathek/Listen — Bytes bleiben.
   Audit-Eintrag.
2. **Papierkorb-Ansicht** in der Mediathek: gelöschte Dateien mit Rest-Tagen; Aktion
   **„Wiederherstellen“** (setzt `trashedAt = null`) — solange die Frist läuft.
3. **Automatische Bereinigung** nach 30 Tagen: physisches Löschen (Speicher + DB-Zeile +
   Varianten). Audit-Eintrag. Läuft als geplanter Job (Prototyp: Cleanup-Lauf beim
   Mediathek-Besuch bzw. später Cron/Scheduler).

Dateien mit aktiven Bindungen können nie gelöscht werden (weder logisch noch physisch) —
sie gehören zur Chronik der Version, an der sie hängen.

---

## 7. Sicherheits-Checkliste (Pflicht bei Umsetzung)

- [ ] Mime-Whitelist (Bilder, PDF, docx, xlsx, csv, txt — **keine ausführbaren Dateien**)
- [ ] Größenlimit je Datei: **10 MB** (Entscheidung 01.09.2026)
- [ ] Dateinamen normalisieren; interner Schlüssel zufällig (crypto random), nie der Originalname
- [ ] Upload prüft Inhalt gegen behaupteten Typ (Magic Bytes, nicht nur Endung)
- [ ] Pfad-Traversal ausgeschlossen (Schlüssel-only-Zugriff)
- [ ] Kein direkter Dateizugriff (außerhalb public/), nur via Route Handler mit Auth
- [ ] EXIF-Stripping bei Bildern
- [ ] Audit bei Upload/Löschen/Bindung (nicht bei Download)

---

## 8. Offene Punkte (vor dem Bauen entscheiden)

1. **Speicherort Prototyp:** → **entschieden (01.09.2026):** lokales Verzeichnis
   (`~/.documentum-uploads/`, konfigurierbar, außerhalb public/) — S3-Adapter später
2. **Größenlimit:** ~~10 MB~~ → **entschieden (01.09.2026)**
3. **Anhang-Sichtbarkeit bei Freeze-Phasen:** → **entschieden (01.09.2026):** Anhänge erben
   exakt die Sichtbarkeit der Version; Freeze ändert nichts, kein Sichtbarkeits-Entzug
4. **Externe Dokumente:** eigener Dateibereich mit eigener Sichtbarkeitsregel (Normen oft
   intern kopiert wegen Lizenz) — Regelung mit Mone abstimmen
5. **Lösch-Fristen:** → **entschieden (01.09.2026):** Papierkorb mit **30-Tage-Frist**,
   dann automatisch endgültig (logisch löschen → trashedAt → Wiederherstellen möglich →
   Cleanup-Job entfernt physisch; Audit bei beiden Schritten)
6. **Mediathek:** → **entschieden (01.09.2026):** jeder sieht **nur seine eigenen Dateien**;
   teilen nur über Dokument-Bindungen
7. **Virus-Scan:** erst relevant bei echtem Betrieb (S3) — im Prototyp nicht vorgesehen
8. **Avatar-Freigabe:** → **entschieden (01.09.2026):** alle sehen das Userbild (überall,
   wo der Name erscheint)

---

## Einordnung in den Aufbauplan

Umsetzung als **eigene Runde** (Runde 6.5 oder später): Voraussetzung ist die Klärung der
offenen Punkte; unabhängig von Editor und Schulungen. Baut auf Runde 0 (Struktur) auf.
