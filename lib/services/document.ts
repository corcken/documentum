import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"

/**
 * Dokumente — Service-Layer.
 * Die Geschäftslogik liegt hier (nicht in Komponenten/Route-Handlern),
 * damit sie portabel und testbar bleibt (Grundsatzentscheidung Techstack).
 *
 * Versionsmodell (Mone): Major.Minor
 * - Neu erstellt: 0.0 · jedes Speichern (mit Änderung): Minor +1
 * - Einreichung: Freeze (In_Review → In_Approval) · zurück: Draft (Minor zählt weiter)
 * - Genehmigt: Major +1, Minor 0; alte freigegebene Versionen → Archived
 * - Leser sehen nur den aktuell freigegebenen Stand; Beteiligte auch Entwürfe
 *
 * Workflow-Zuordnung (01.09.2026):
 * - Jede Version hat Prüfer (reviewer) und Genehmiger (approver)
 * - Nur der Prüfer kann „Prüfung bestanden“ / „Zurück mit Kommentar“
 * - Nur der Genehmiger kann „Genehmigen“
 * - Review muss vor Approval kommen (Task-Kette), Vier-Augen-Prinzip
 */

export type DocumentFilters = {
  search?: string
  typeId?: string
  status?: string
}

export type ListOptions = {
  /** true = auch Entwürfe (Ersteller/Prüfer/Genehmiger); false = nur freigegeben (Leser) */
  includeDrafts: boolean
}

export async function getLatestVersion(documentId: string) {
  return prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
  })
}

/**
 * Liste aller Dokumente. Für Leser (includeDrafts=false) werden nur Dokumente
 * mit freigegebenem Stand geliefert; Entwürfe bleiben unsichtbar.
 */
export async function listDocuments(filters: DocumentFilters = {}, opts: ListOptions) {
  const docs = await prisma.document.findMany({
    where: {
      ...(filters.typeId ? { typeId: filters.typeId } : {}),
      ...(!opts.includeDrafts ? { versions: { some: { status: "Released" } } } : {}),
    },
    include: {
      type: true,
      owner: { select: { id: true, name: true, email: true } },
      versions: { orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }] },
    },
    orderBy: { createdAt: "desc" },
  })

  return docs
    .map((d) => {
      const currentVersion = opts.includeDrafts
        ? (d.versions.find((v) => v.status === "Released") ?? d.versions[0] ?? null)
        : (d.versions.find((v) => v.status === "Released") ?? null)
      return { ...d, currentVersion }
    })
    .filter((d) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const hitNumber = d.documentNumber.toLowerCase().includes(q)
        const hitTitle = d.currentVersion?.title.toLowerCase().includes(q)
        if (!hitNumber && !hitTitle) return false
      }
      if (filters.status && d.currentVersion?.status !== filters.status) return false
      return true
    })
}

export async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      type: true,
      owner: { select: { id: true, name: true, email: true } },
      versions: {
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          workflowTasks: {
            orderBy: { createdAt: "asc" },
            include: { assignedTo: { select: { id: true, name: true, email: true } } },
          },
          scopeDepartments: { include: { department: true } },
          scopeJobRoles: { include: { jobRole: true } },
        },
        orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
      },
    },
  })
}

/** Prüft die Zuweisung: Prüfer und Genehmiger müssen gesetzt, verschieden und nicht der Ersteller sein. */
function assertAssignment(ownerId: string, reviewerId: string | undefined, approverId: string | undefined) {
  if (!reviewerId || !approverId) {
    throw new Error("Prüfer und Genehmiger müssen ausgewählt werden.")
  }
  if (reviewerId === approverId) {
    throw new Error("Prüfer und Genehmiger müssen verschiedene Personen sein (Vier-Augen-Prinzip).")
  }
  if (approverId === ownerId) {
    throw new Error("Der Ersteller darf nicht selbst freigeben.")
  }
}

export type CreateDocumentInput = {
  documentNumber: string
  title: string
  typeId: string
  content: string
  ownerId: string
  departmentIds: string[]
  jobRoleIds: string[]
  reviewerId: string
  approverId: string
}

/** Legt ein Dokument mit erster Version 0.0 (Draft) + Geltungsbereich an. */
export async function createDocument(input: CreateDocumentInput) {
  const {
    documentNumber, title, typeId, content, ownerId,
    departmentIds, jobRoleIds, reviewerId, approverId,
  } = input

  assertAssignment(ownerId, reviewerId, approverId)

  const doc = await prisma.document.create({
    data: {
      documentNumber,
      typeId,
      ownerId,
      versions: {
        create: {
          majorVersion: 0,
          minorVersion: 0,
          title,
          content: content || null,
          status: "Draft",
          createdById: ownerId,
          reviewerId,
          approverId,
          scopeDepartments: { create: departmentIds.map((id) => ({ departmentId: id })) },
          scopeJobRoles: { create: jobRoleIds.map((id) => ({ jobRoleId: id })) },
        },
      },
    },
    include: { versions: true },
  })

  await logAudit({
    userId: ownerId,
    action: "CREATE",
    entityType: "Document",
    entityId: doc.id,
    after: { documentNumber, title, typeId, version: "0.0", status: "Draft", reviewerId, approverId },
  })

  return doc
}

/**
 * Speichern erzeugt eine neue Minor-Version — aber nur, wenn sich etwas geändert hat.
 * Prüfer/Genehmiger können bei der neuen Version neu zugewiesen werden.
 */
export async function saveDraftVersion(input: {
  documentId: string
  title: string
  content: string
  userId: string
  reviewerId: string
  approverId: string
}) {
  const latest = await getLatestVersion(input.documentId)
  if (!latest) throw new Error("Dokument hat keine Version.")

  if (latest.status === "In_Review" || latest.status === "In_Approval") {
    throw new Error("Das Dokument ist im Freeze (zur Prüfung eingereicht) — Änderungen sind nicht möglich.")
  }
  if ((latest.content ?? "") === (input.content ?? "")) {
    throw new Error("Keine Änderung erkannt — es wurde keine neue Version erzeugt.")
  }
  const owner = await prisma.document.findUnique({ where: { id: input.documentId }, select: { ownerId: true } })
  assertAssignment(owner?.ownerId ?? input.userId, input.reviewerId, input.approverId)

  // Draft → weiterzählen; Released → neue Bearbeitungsrunde (1.0 → 1.1)
  const v = await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      majorVersion: latest.majorVersion,
      minorVersion: latest.minorVersion + 1,
      title: input.title,
      content: input.content,
      status: "Draft",
      createdById: input.userId,
      reviewerId: input.reviewerId,
      approverId: input.approverId,
    },
  })
  await logAudit({
    userId: input.userId,
    action: "SAVE_DRAFT",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: { major: v.majorVersion, minor: v.minorVersion, reviewerId: input.reviewerId, approverId: input.approverId },
  })
  return v
}

/** Zurückspringen auf einen älteren Stand — erzeugt eine NEUE Minor-Version (Chronik bleibt). */
export async function restoreVersion(input: {
  documentId: string
  sourceVersionId: string
  userId: string
}) {
  const latest = await getLatestVersion(input.documentId)
  if (!latest || latest.status !== "Draft") {
    throw new Error("Zurückspringen ist nur im Entwurfs-Status möglich.")
  }
  const source = await prisma.documentVersion.findFirst({
    where: { id: input.sourceVersionId, documentId: input.documentId },
  })
  if (!source) throw new Error("Quell-Version nicht gefunden.")

  const v = await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      majorVersion: latest.majorVersion,
      minorVersion: latest.minorVersion + 1,
      title: source.title,
      content: source.content,
      status: "Draft",
      createdById: input.userId,
      reviewerId: latest.reviewerId,
      approverId: latest.approverId,
    },
  })
  await logAudit({
    userId: input.userId,
    action: "RESTORE_VERSION",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: {
      major: v.majorVersion,
      minor: v.minorVersion,
      restoredFrom: `${source.majorVersion}.${source.minorVersion}`,
    },
  })
  return v
}

/** Schließt alle offenen Tasks einer Version mit Status+Kommentar. */
function closePendingTasks(versionId: string, status: "Approved" | "Rejected", comment?: string) {
  return prisma.workflowTask.updateMany({
    where: { documentVersionId: versionId, status: "Pending" },
    data: { status, comments: comment, completedAt: new Date() },
  })
}

/**
 * Einreichung zur Prüfung → Freeze (In_Review) + Review-Task für den Prüfer.
 * Nur der Ersteller der aktuellen Version darf einreichen.
 */
export async function submitForReview(input: { documentId: string; userId: string }) {
  const latest = await getLatestVersion(input.documentId)
  if (!latest || latest.status !== "Draft") {
    throw new Error("Kein Entwurf zum Einreichen vorhanden.")
  }
  if (latest.createdById !== input.userId) {
    throw new Error("Nur der Ersteller kann das Dokument zur Prüfung einreichen.")
  }
  if (!latest.reviewerId || !latest.approverId) {
    throw new Error("Prüfer und Genehmiger müssen zugewiesen sein.")
  }

  const v = await prisma.$transaction([
    prisma.documentVersion.update({ where: { id: latest.id }, data: { status: "In_Review" } }),
    prisma.workflowTask.create({
      data: {
        documentVersionId: latest.id,
        assignedToId: latest.reviewerId,
        taskType: "Review",
        status: "Pending",
      },
    }),
  ])
  await logAudit({
    userId: input.userId,
    action: "SUBMIT_FOR_REVIEW",
    entityType: "DocumentVersion",
    entityId: v[0].id,
    after: { major: v[0].majorVersion, minor: v[0].minorVersion, reviewerId: latest.reviewerId },
  })
  return v[0]
}

/**
 * Prüfung bestanden → In_Approval + Approval-Task für den Genehmiger.
 * Nur der zugewiesene Prüfer darf bestätigen.
 */
export async function approveReview(input: { versionId: string; userId: string }) {
  const v = await prisma.documentVersion.findUnique({ where: { id: input.versionId } })
  if (!v || v.status !== "In_Review") {
    throw new Error("Version ist nicht in Prüfung.")
  }
  if (v.reviewerId !== input.userId) {
    throw new Error("Nur der zugewiesene Prüfer kann die Prüfung bestätigen.")
  }

  const [updated] = await prisma.$transaction([
    prisma.documentVersion.update({ where: { id: v.id }, data: { status: "In_Approval" } }),
    prisma.workflowTask.updateMany({
      where: { documentVersionId: v.id, taskType: "Review", status: "Pending" },
      data: { status: "Approved", completedAt: new Date() },
    }),
    prisma.workflowTask.create({
      data: {
        documentVersionId: v.id,
        assignedToId: v.approverId,
        taskType: "Approval",
        status: "Pending",
      },
    }),
  ])
  await logAudit({
    userId: input.userId,
    action: "APPROVE_REVIEW",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: { major: v.majorVersion, minor: v.minorVersion, approverId: v.approverId },
  })
  return updated
}

/**
 * Zurück an den Ersteller mit Kommentar → Draft (Minor-Zählung läuft weiter).
 * Der aktuell zuständige Prüfer (In_Review) oder Genehmiger (In_Approval) darf zurückgeben.
 */
export async function returnToAuthor(input: { versionId: string; comment: string; userId: string }) {
  if (!input.comment.trim()) {
    throw new Error("Ein Kommentar ist Pflicht (Änderungsgrund).")
  }
  const v = await prisma.documentVersion.findUnique({ where: { id: input.versionId } })
  if (!v || (v.status !== "In_Review" && v.status !== "In_Approval")) {
    throw new Error("Version ist nicht in Prüfung/Freigabe.")
  }
  const responsible = v.status === "In_Review" ? v.reviewerId : v.approverId
  if (responsible !== input.userId) {
    throw new Error("Nur der aktuell zuständige Prüfer/Genehmiger kann zurückgeben.")
  }

  const updated = await prisma.$transaction([
    prisma.documentVersion.update({ where: { id: v.id }, data: { status: "Draft" } }),
    closePendingTasks(v.id, "Rejected", input.comment),
  ])
  await logAudit({
    userId: input.userId,
    action: "RETURN_TO_AUTHOR",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: { major: v.majorVersion, minor: v.minorVersion, comment: input.comment },
  })
  return updated[0]
}

/**
 * Genehmigung: Major +1, Minor 0, Status Released.
 * Alle anderen freigegebenen Versionen → Archived (mit Ersetzungsdatum).
 * Nur der zugewiesene Genehmiger darf freigeben.
 */
export async function approveVersion(input: { versionId: string; userId: string }) {
  const v = await prisma.documentVersion.findUnique({ where: { id: input.versionId } })
  if (!v || v.status !== "In_Approval") {
    throw new Error("Version ist nicht in Freigabe.")
  }
  if (v.approverId !== input.userId) {
    throw new Error("Nur der zugewiesene Genehmiger kann freigeben.")
  }

  const maxMajor = await prisma.documentVersion.aggregate({
    where: { documentId: v.documentId },
    _max: { majorVersion: true },
  })
  const newMajor = (maxMajor._max.majorVersion ?? 0) + 1

  const [, , updated] = await prisma.$transaction([
    prisma.documentVersion.updateMany({
      where: { documentId: v.documentId, status: "Released" },
      data: { status: "Archived", obsoleteDate: new Date() },
    }),
    prisma.workflowTask.updateMany({
      where: { documentVersionId: v.id, taskType: "Approval", status: "Pending" },
      data: { status: "Approved", completedAt: new Date() },
    }),
    prisma.documentVersion.update({
      where: { id: v.id },
      data: { majorVersion: newMajor, minorVersion: 0, status: "Released", effectiveDate: new Date() },
    }),
  ])

  await logAudit({
    userId: input.userId,
    action: "APPROVE",
    entityType: "DocumentVersion",
    entityId: v.id,
    before: { major: v.majorVersion, minor: v.minorVersion, status: v.status },
    after: { major: newMajor, minor: 0, status: "Released" },
  })
  return updated
}

/**
 * Offene Aufgaben (Review/Approval) eines Users — für die Aufgaben-Inbox.
 */
export async function listMyTasks(userId: string) {
  return prisma.workflowTask.findMany({
    where: { assignedToId: userId, status: "Pending" },
    include: {
      documentVersion: {
        include: {
          document: { select: { id: true, documentNumber: true } },
          reviewer: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })
}

/** Anzahl offener Aufgaben eines Users (für Header/Dashboard). */
export async function countMyOpenTasks(userId: string) {
  return prisma.workflowTask.count({
    where: { assignedToId: userId, status: "Pending" },
  })
}
