import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import { getLatestVersion } from "./document"

import { calculateNextDate } from "./document-helpers"
import {
  notifyReviewSubmitted,
  notifyReviewApproved,
  notifyVersionApproved,
  notifyVersionReturned,
} from "./workflow-notifications"

/** Schließt alle offenen Tasks einer Version mit Status+Kommentar. */
function closePendingTasks(versionId: string, status: "Approved" | "Rejected", comment?: string) {
  return prisma.workflowTask.updateMany({
    where: { documentVersionId: versionId, status: "Pending" },
    data: { status, comments: comment, completedAt: new Date() },
  })
}

export async function startReviewWithoutChange(input: { documentId: string; userId: string; userRole: string; comment: string }) {
  const latest = await getLatestVersion(input.documentId)
  if (!latest || latest.status !== "Released") {
    throw new Error("Prüfung ohne Änderung kann nur für freigegebene Dokumente gestartet werden.")
  }
  const doc = await prisma.document.findUnique({ where: { id: input.documentId } })
  if (input.userRole !== "ADMIN" && doc?.ownerId !== input.userId && latest.createdById !== input.userId) {
    throw new Error("Nur der Dokument-Eigentümer oder Ersteller kann diese Prüfung starten.")
  }
  if (!latest.reviewerId || !latest.approverId) {
    throw new Error("Prüfer und Genehmiger müssen zugewiesen sein.")
  }

  const task = await prisma.workflowTask.create({
    data: { documentVersionId: latest.id, assignedToId: latest.reviewerId, taskType: "Review", status: "Pending", comments: input.comment },
  })
  await logAudit({
    userId: input.userId,
    action: "START_REVIEW_WITHOUT_CHANGE",
    entityType: "DocumentVersion",
    entityId: latest.id,
    after: { comment: input.comment },
  })
  notifyReviewSubmitted(input.documentId, latest.id, input.userId)
  return task
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
  notifyReviewSubmitted(input.documentId, v[0].id, input.userId)
  return v[0]
}

/**
 * Prüfung bestanden → In_Approval + Approval-Task für den Genehmiger.
 * Nur der zugewiesene Prüfer darf bestätigen.
 */
export async function approveReview(input: { versionId: string; userId: string }) {
  const v = await prisma.documentVersion.findUnique({ where: { id: input.versionId } })
  if (!v) throw new Error("Version nicht gefunden.")
  
  const task = await prisma.workflowTask.findFirst({
    where: { documentVersionId: v.id, taskType: "Review", status: "Pending" }
  })
  if (!task) throw new Error("Version ist nicht in Prüfung (kein offener Task).")

  if (v.reviewerId !== input.userId) {
    throw new Error("Nur der zugewiesene Prüfer kann die Prüfung bestätigen.")
  }

  const updates: any[] = []
  if (v.status === "In_Review") {
    updates.push(prisma.documentVersion.update({ where: { id: v.id }, data: { status: "In_Approval" } }))
  }

  updates.push(
    prisma.workflowTask.update({
      where: { id: task.id },
      data: { status: "Approved", completedAt: new Date() },
    }),
    prisma.workflowTask.create({
      data: {
        documentVersionId: v.id,
        assignedToId: v.approverId,
        taskType: "Approval",
        status: "Pending",
      },
    })
  )
  
  await prisma.$transaction(updates)

  await logAudit({
    userId: input.userId,
    action: "APPROVE_REVIEW",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: { major: v.majorVersion, minor: v.minorVersion, approverId: v.approverId },
  })
  notifyReviewApproved(v.documentId, v.id, input.userId)
  return v
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
  if (!v) throw new Error("Version nicht gefunden.")

  const task = await prisma.workflowTask.findFirst({
    where: { documentVersionId: v.id, status: "Pending" }
  })
  if (!task) throw new Error("Kein ausstehender Task gefunden.")

  if (task.assignedToId !== input.userId) {
    throw new Error("Nur der aktuell zuständige Prüfer/Genehmiger kann zurückgeben.")
  }

  const updates: any[] = [closePendingTasks(v.id, "Rejected", input.comment)]
  if (v.status === "In_Review" || v.status === "In_Approval") {
    updates.push(prisma.documentVersion.update({ where: { id: v.id }, data: { status: "Draft" } }))
  }

  await prisma.$transaction(updates)

  await logAudit({
    userId: input.userId,
    action: "RETURN_TO_AUTHOR",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: { major: v.majorVersion, minor: v.minorVersion, comment: input.comment },
  })
  notifyVersionReturned(v.documentId, v.id, input.comment, input.userId)
  return v
}

/**
 * Genehmigung: Major +1, Minor 0, Status Released.
 * Alle anderen freigegebenen Versionen → Archived (mit Ersetzungsdatum).
 * Nur der zugewiesene Genehmiger darf freigeben.
 */
export async function approveVersion(input: { versionId: string; userId: string }) {
  const v = await prisma.documentVersion.findUnique({ where: { id: input.versionId }, include: { document: { include: { type: true } } } })
  if (!v) throw new Error("Version nicht gefunden.")

  const task = await prisma.workflowTask.findFirst({
    where: { documentVersionId: v.id, taskType: "Approval", status: "Pending" }
  })
  if (!task) throw new Error("Version ist nicht in Freigabe (kein offener Task).")

  if (v.approverId !== input.userId) {
    throw new Error("Nur der zugewiesene Genehmiger kann freigeben.")
  }

  const updates: any[] = []
  
  updates.push(prisma.workflowTask.update({
    where: { id: task.id },
    data: { status: "Approved", completedAt: new Date() },
  }))

  const retentionEndDate = v.document.type?.retentionMonths 
    ? calculateNextDate(v.document.type.retentionMonths) 
    : undefined

  if (v.status === "Released") {
    // Prüfung ohne Änderung abgeschlossen
    const nextReview = calculateNextDate(v.document.reviewIntervalMonths)
    updates.push(prisma.documentVersion.update({
      where: { id: v.id },
      data: { nextReviewDate: nextReview }
    }))
    await prisma.$transaction(updates)

    await logAudit({
      userId: input.userId,
      action: "APPROVE_REVIEW_WITHOUT_CHANGE",
      entityType: "DocumentVersion",
      entityId: v.id,
      after: { nextReviewDate: nextReview },
    })
    notifyVersionApproved(v.documentId, v.id, input.userId)
    return v
  } else {
    // Normale Genehmigung
    const maxMajor = await prisma.documentVersion.aggregate({
      where: { documentId: v.documentId },
      _max: { majorVersion: true },
    })
    const newMajor = (maxMajor._max.majorVersion ?? 0) + 1

    updates.push(
      prisma.documentVersion.updateMany({
        where: { documentId: v.documentId, status: "Released" },
        data: { status: "Archived", obsoleteDate: new Date(), retentionEndDate },
      }),
      prisma.documentVersion.update({
        where: { id: v.id },
        data: { 
          majorVersion: newMajor, minorVersion: 0, status: "Released", effectiveDate: new Date(),
          nextReviewDate: calculateNextDate(v.document.reviewIntervalMonths)
        },
      })
    )

    await prisma.$transaction(updates)

    await logAudit({
      userId: input.userId,
      action: "APPROVE",
      entityType: "DocumentVersion",
      entityId: v.id,
      before: { major: v.majorVersion, minor: v.minorVersion, status: v.status },
      after: { major: newMajor, minor: 0, status: "Released" },
    })
    notifyVersionApproved(v.documentId, v.id, input.userId)
    return v
  }
}

export async function withdrawDocument(input: {
  documentId: string
  versionId: string
  userId: string
  userRole: string
  comment: string
}) {
  if (!input.comment.trim()) {
    throw new Error("Ein Kommentar ist Pflicht (Begründung für Rückzug).")
  }
  const v = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    include: { document: true },
  })
  if (!v || v.status !== "Released") {
    throw new Error("Nur freigegebene Versionen können zurückgezogen werden.")
  }

  // Nur ADMIN oder Dokument-Eigentümer
  if (input.userRole !== "ADMIN" && v.document.ownerId !== input.userId) {
    throw new Error("Nur Administratoren oder der Dokument-Eigentümer können Dokumente zurückziehen.")
  }

  const docType = await prisma.documentType.findUnique({ where: { id: v.document.typeId! } })
  const retentionMonths = docType?.retentionMonths ?? null
  const retentionEndDate = retentionMonths ? new Date(new Date().setMonth(new Date().getMonth() + retentionMonths)) : null
  
  const updated = await prisma.documentVersion.update({
    where: { id: v.id },
    data: { status: "Withdrawn", obsoleteDate: new Date(), retentionEndDate },
  })

  await logAudit({
    userId: input.userId,
    action: "WITHDRAW_DOCUMENT",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: { status: "Withdrawn", comment: input.comment },
  })

  return updated
}
