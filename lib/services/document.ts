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

export {
  type DocumentFilters,
  type ListOptions,
  getLatestVersion,
  listDocuments,
  getDocument,
} from "./document-queries"
import { getLatestVersion } from "./document-queries"
import { assertAssignment, assertCanEditVersion, buildVersionRelations } from "./document-helpers"

async function assertDepartmentCreatorRole(userId: string, departmentId?: string | null, ownerId?: string | null) {
  if (!departmentId) return
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } })
  if (user?.role?.name === "ADMIN" || (ownerId && ownerId === userId)) return
  const hasRole = await prisma.departmentRoleAssignment.findFirst({
    where: { departmentId, userId, role: "ERSTELLER" },
  })
  if (!hasRole) {
    throw new Error("Sie besitzen keine Ersteller-Rolle für diesen verantwortlichen Bereich.")
  }
}

export type CreateDocumentInput = {
  documentNumber: string
  title: string
  typeId: string
  content: string
  ownerId: string
  departmentId?: string | null
  departmentIds: string[]
  jobRoleIds: string[]
  reviewerId?: string | null
  approverId?: string | null
  visibility?: string
  reviewIntervalMonths?: number
}

/** Legt ein Dokument mit erster Version 0.0 (Draft) + Geltungsbereich an. */
export async function createDocument(input: CreateDocumentInput) {
  const {
    documentNumber, title, typeId, content, ownerId, departmentId,
    departmentIds, jobRoleIds, reviewerId, approverId, reviewIntervalMonths,
  } = input

  await assertDepartmentCreatorRole(ownerId, departmentId)

  if (reviewerId && approverId) {
    assertAssignment(ownerId, reviewerId, approverId)
  }

  const doc = await prisma.document.create({
    data: {
      documentNumber,
      typeId,
      departmentId: departmentId ?? null,
      reviewIntervalMonths,
      ownerId,
      versions: {
        create: {
          majorVersion: 0,
          minorVersion: 0,
          title,
          content: content || null,
          status: "Draft",
          visibility: input.visibility || "PUBLIC",
          createdById: ownerId,
          reviewerId: reviewerId ?? null,
          approverId: approverId ?? null,
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
    after: { documentNumber, title, typeId, departmentId, reviewIntervalMonths, version: "0.0", status: "Draft", reviewerId, approverId },
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
  changeReason: string
  userId: string
  reviewerId?: string | null
  approverId?: string | null
  visibility?: string
  reviewIntervalMonths?: number | null
  departmentIds?: string[]
  jobRoleIds?: string[]
}) {
  const latest = await prisma.documentVersion.findFirst({
    where: { documentId: input.documentId },
    include: {
      document: true,
      scopeDepartments: true,
      scopeJobRoles: true,
    },
    orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
  })
  if (!latest) throw new Error("Dokument hat keine Version.")
  if (!input.changeReason?.trim()) throw new Error("Änderungsgrund ist Pflicht.")

  if (latest.status === "In_Review" || latest.status === "In_Approval") {
    throw new Error("Das Dokument ist im Freeze (zur Prüfung eingereicht) — Änderungen sind nicht möglich.")
  }

  const nextVisibility = input.visibility ?? latest.visibility
  const nextInterval =
    input.reviewIntervalMonths !== undefined
      ? input.reviewIntervalMonths
      : latest.document.reviewIntervalMonths

  const prevDeptIds = latest.scopeDepartments.map((s) => s.departmentId).sort()
  const nextDeptIds = input.departmentIds ? [...input.departmentIds].sort() : prevDeptIds
  const prevRoleIds = latest.scopeJobRoles.map((s) => s.jobRoleId).sort()
  const nextRoleIds = input.jobRoleIds ? [...input.jobRoleIds].sort() : prevRoleIds

  const contentSame = (latest.content ?? "") === (input.content ?? "")
  const titleSame = latest.title === input.title
  const visibilitySame = latest.visibility === nextVisibility
  const intervalSame = (latest.document.reviewIntervalMonths ?? null) === (nextInterval ?? null)
  const deptsSame = JSON.stringify(prevDeptIds) === JSON.stringify(nextDeptIds)
  const rolesSame = JSON.stringify(prevRoleIds) === JSON.stringify(nextRoleIds)

  if (contentSame && titleSame && visibilitySame && intervalSame && deptsSame && rolesSame) {
    throw new Error("Keine Änderung erkannt — es wurde keine neue Version erzeugt.")
  }

  await assertCanEditVersion(input.userId, latest.id, true)

  const doc = latest.document

  await assertDepartmentCreatorRole(input.userId, doc?.departmentId, doc?.ownerId)

  const effReviewerId = input.reviewerId ?? latest.reviewerId
  const effApproverId = input.approverId ?? latest.approverId
  if (effReviewerId && effApproverId) {
    assertAssignment(doc?.ownerId ?? input.userId, effReviewerId, effApproverId)
  }

  if (!intervalSame) {
    await prisma.document.update({
      where: { id: input.documentId },
      data: { reviewIntervalMonths: nextInterval ?? null },
    })
  }

  const baseRelations = await buildVersionRelations(latest.id, latest.id, input.userId)
  const relations = {
    ...baseRelations,
    ...(input.departmentIds
      ? { scopeDepartments: { create: nextDeptIds.map((departmentId) => ({ departmentId })) } }
      : {}),
    ...(input.jobRoleIds
      ? { scopeJobRoles: { create: nextRoleIds.map((jobRoleId) => ({ jobRoleId })) } }
      : {}),
  }

  // Draft → weiterzählen; Released → neue Bearbeitungsrunde (1.0 → 1.1)
  const v = await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      majorVersion: latest.majorVersion,
      minorVersion: latest.minorVersion + 1,
      title: input.title,
      content: input.content,
      changeReason: input.changeReason,
      status: "Draft",
      visibility: nextVisibility,
      createdById: input.userId,
      reviewerId: effReviewerId ?? null,
      approverId: effApproverId ?? null,
      ...relations,
    },
  })
  await logAudit({
    userId: input.userId,
    action: "SAVE_DRAFT",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: {
      major: v.majorVersion,
      minor: v.minorVersion,
      title: v.title,
      visibility: v.visibility,
      reviewerId: effReviewerId,
      approverId: effApproverId,
    },
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

  await assertCanEditVersion(input.userId, latest.id)

  const source = await prisma.documentVersion.findFirst({
    where: { id: input.sourceVersionId, documentId: input.documentId },
  })
  if (!source) throw new Error("Quell-Version nicht gefunden.")

  const relations = await buildVersionRelations(source.id, source.id, input.userId)

  const v = await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      majorVersion: latest.majorVersion,
      minorVersion: latest.minorVersion + 1,
      title: source.title,
      content: source.content,
      status: "Draft",
      visibility: latest.visibility,
      createdById: input.userId,
      reviewerId: latest.reviewerId,
      approverId: latest.approverId,
      ...relations,
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
