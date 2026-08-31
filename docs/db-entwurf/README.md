# DB-Entwurf → Prisma-Schema (Zuordnung)

Der SQL-Entwurf (01–06) ist das **Fachkonzept** (PostgreSQL-Dialekt). Die
technische Wahrheit ist `prisma/schema.prisma` (portabel: SQLite für den
Prototyp, später PostgreSQL).

| SQL-Entwurf | Prisma-Modell | Hinweis |
|---|---|---|
| 01 `tbl_department` | `Department` | Baum über `parentId`, beliebig tief |
| 01 `tbl_job_role` | `JobRole` | |
| 01 `tbl_system_role` | `Role` | existiert bereits aus Scaffold (ADMIN/EDITOR/VIEWER) |
| 01 `tbl_user` | `User` | **+ `password`** (bcrypt, für Login) |
| 02 `tbl_document_type` | `DocumentType` | `requiresTraining` steuert Schulungspflicht |
| 02 `tbl_document` | `Document` | `documentNumber` eindeutig |
| 02 `tbl_document_version` | `DocumentVersion` | **+ `content`** (TipTap), `filePath` optional |
| 03 `tbl_scope_department` | `ScopeDepartment` | Scope expandiert nach unten (Entscheidung 31.08.2026) |
| 03 `tbl_scope_job_role` | `ScopeJobRole` | |
| 03 `tbl_workflow_task` | `WorkflowTask` | **+ `createdAt`** (Audit) |
| 04 `tbl_training_record` | `TrainingRecord` | Status `Overdue` gestrichen → wird berechnet; Signatur als JSON |
| 05 Trigger (Archivierung) | — | wird **App-Code**: `releaseDocument()` |
| 06 Trigger (Schulungszuweisung) | — | wird **App-Code**: rekursive Abteilungs-Traversierung |
| — (neu) | `AuditLog` | **vollumfänglicher Audit-Trail** (wer, wann, was vorher/nachher) |

## Offen (noch nicht im Schema)
- **Schulungsinhalte/Quizze** — User denkt noch nach; kann später als eigene
  Modelle (z. B. `TrainingContent`, `QuizQuestion`) andocken, ohne
  `TrainingRecord` zu ändern
- Dateiablage-Ort für `filePath` (lokal? S3?)
- `Group` (aus Scaffold) — evtl. überflüssig neben `Department`
