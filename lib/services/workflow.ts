import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import { getLatestVersion } from "./document"
import { assertCanEditVersion, calculateNextDate, verifyElectronicSignature } from "./document-helpers"
import {
  notifyReviewSubmitted,
  notifyReviewApproved,
  notifyVersionApproved,
  notifyVersionReturned,
} from "./workflow-notifications"
import {
  getWorkflowQuorum,
  getValidReviewCandidates,
  getValidApprovalCandidates,
  cancelRemainingTasks,
  advanceToApprovalPhase,
  releaseVersionInternal,
} from "./workflow-quorum"

/** Schließt alle offenen Tasks einer Version mit Status+Kommentar. */
function closePendingTasks(versionId: string, status: "Approved" | "Rejected", comment?: string) {
  return prisma.workflowTask.updateMany({
    where: { documentVersionId: versionId, status: "Pending" },
    data: { status, comments: comment, completedAt: new Date() },
  })
}

export { startReviewWithoutChange } from "./workflow-quorum"

/**
 * Einreichung zur Prüfung → Freeze (In_Review) + Review-Tasks für die Bereichs-Prüfer.
 * Berechtigt sind Ersteller der Version, Dokument-Eigentümer, Bereichs-Ersteller oder Admin.
 */
export async function submitForReview(input: { documentId: string; userId: string }) {
  const latest = await getLatestVersion(input.documentId)
  if (!latest || latest.status !== "Draft") {
    throw new Error("Kein Entwurf zum Einreichen vorhanden.")
  }

  if (latest.createdById !== input.userId) {
    try {
      await assertCanEditVersion(input.userId, latest.id)
    } catch {
      throw new Error("Nur der Ersteller kann das Dokument zur Prüfung einreichen.")
    }
  }

  const doc = await prisma.document.findUnique({
    where: { id: input.documentId },
    select: { departmentId: true },
  })

  let reviewerId = latest.reviewerId
  let approverId = latest.approverId
  let candidatePruefer: { id: string }[] = []

  if (doc?.departmentId) {
    const excludeCreatorId = latest.createdById ?? input.userId
    const pruefer = (await getValidReviewCandidates(doc.departmentId, excludeCreatorId)).filter(
      (u) => u.id !== input.userId
    )
    const freigeber = (await getValidApprovalCandidates(doc.departmentId, excludeCreatorId)).filter(
      (u) => u.id !== input.userId
    )

    if (pruefer.length === 0 || freigeber.length === 0) {
      throw new Error(
        "Einreichung blockiert: Bitte erst Prüfer- und Freigeber-Rolle im Bereich besetzen (Ersteller darf nicht selbst prüfen oder freigeben)."
      )
    }

    candidatePruefer = pruefer
    reviewerId = pruefer[0].id
    approverId = freigeber[0].id
  } else {
    if (!latest.reviewerId || !latest.approverId) {
      throw new Error("Prüfer und Genehmiger müssen zugewiesen sein.")
    }
    candidatePruefer = [{ id: latest.reviewerId }]
  }

  const updates: any[] = [
    prisma.documentVersion.update({
      where: { id: latest.id },
      data: { status: "In_Review", reviewerId, approverId },
    }),
    ...candidatePruefer.map((p) =>
      prisma.workflowTask.create({
        data: {
          documentVersionId: latest.id,
          assignedToId: p.id,
          taskType: "Review",
          status: "Pending",
        },
      })
    ),
  ]

  const results = await prisma.$transaction(updates)
  const updatedVersion = results[0]

  await logAudit({
    userId: input.userId,
    action: "SUBMIT_FOR_REVIEW",
    entityType: "DocumentVersion",
    entityId: latest.id,
    after: {
      major: latest.majorVersion,
      minor: latest.minorVersion,
      reviewerId,
      approverId,
      taskCount: candidatePruefer.length,
    },
  })
  notifyReviewSubmitted(input.documentId, latest.id, input.userId)
  return updatedVersion
}

/** Findet einen offenen Task für den User (inkl. Legacy-Fallback auf reviewerId/approverId). */
async function findPendingWorkflowTask(
  versionId: string,
  taskType: "Review" | "Approval",
  userId: string,
  legacyAssigneeId: string | null
) {
  const myTask = await prisma.workflowTask.findFirst({
    where: { documentVersionId: versionId, taskType, status: "Pending", assignedToId: userId },
  })
  if (myTask) return myTask
  if (legacyAssigneeId === userId) {
    return prisma.workflowTask.findFirst({
      where: { documentVersionId: versionId, taskType, status: "Pending" },
    })
  }
  return null
}

/**
 * Prüfung bestanden → je nach Quorum In_Approval oder warten auf übrige Prüfer.
 * Autorisierung läuft über den offenen Task des Users.
 */
export async function approveReview(input: { versionId: string; userId: string }) {
  const v = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    include: { document: true },
  })
  if (!v) throw new Error("Version nicht gefunden.")

  const taskToComplete = await findPendingWorkflowTask(v.id, "Review", input.userId, v.reviewerId)
  if (!taskToComplete) {
    throw new Error("Sie sind kein zugewiesener Prüfer mit offener Aufgabe für diese Version.")
  }

  await prisma.workflowTask.update({
    where: { id: taskToComplete.id },
    data: { status: "Approved", completedAt: new Date() },
  })

  await logAudit({
    userId: input.userId,
    action: "APPROVE_REVIEW",
    entityType: "WorkflowTask",
    entityId: taskToComplete.id,
    after: { status: "Approved" },
  })

  const quorumMode = await getWorkflowQuorum(v.document.departmentId)

  if (quorumMode === "einer") {
    await cancelRemainingTasks(v.id, "Review", "Quorum einer erreicht", input.userId)
    await logAudit({
      userId: input.userId,
      action: "QUORUM_REACHED",
      entityType: "DocumentVersion",
      entityId: v.id,
      after: { quorum: "einer", phase: "Review" },
    })
    await advanceToApprovalPhase(v, input.userId)
  } else {
    const remainingPending = await prisma.workflowTask.count({
      where: { documentVersionId: v.id, taskType: "Review", status: "Pending" },
    })

    if (remainingPending === 0) {
      await advanceToApprovalPhase(v, input.userId)
    }
  }

  notifyReviewApproved(v.documentId, v.id, input.userId)
  const finalVersion = await prisma.documentVersion.findUnique({ where: { id: v.id } })
  return finalVersion ?? v
}

/**
 * Zurück an den Ersteller mit Kommentar → Draft.
 * Schließt alle offenen Tasks als Rejected. Bei erneutem Einreichen frische Tasks für alle.
 */
export async function returnToAuthor(input: { versionId: string; comment: string; userId: string }) {
  if (!input.comment.trim()) {
    throw new Error("Ein Kommentar ist Pflicht (Änderungsgrund).")
  }
  const v = await prisma.documentVersion.findUnique({ where: { id: input.versionId } })
  if (!v) throw new Error("Version nicht gefunden.")

  const userTask = await prisma.workflowTask.findFirst({
    where: { documentVersionId: v.id, status: "Pending", assignedToId: input.userId },
  })
  const isLegacyReviewer = v.status === "In_Review" && v.reviewerId === input.userId
  const isLegacyApprover = v.status === "In_Approval" && v.approverId === input.userId

  if (!userTask && !isLegacyReviewer && !isLegacyApprover) {
    throw new Error("Nur ein aktuell zuständiger Prüfer oder Genehmiger kann zurückgeben.")
  }

  const updates: any[] = [
    closePendingTasks(v.id, "Rejected", input.comment),
    prisma.documentVersion.update({ where: { id: v.id }, data: { status: "Draft" } }),
  ]
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

export type ApproveVersionInput = {
  versionId: string
  userId: string
  password?: string
  signatureMeaning?: string
}

/**
 * Genehmigung: je nach Quorum Released oder warten auf übrige Freigeber.
 * Autorisierung läuft über den offenen Approval-Task des Users + Re-Authentifizierung (Part 11).
 */
export async function approveVersion(input: ApproveVersionInput) {
  const v = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    include: { document: { include: { type: true } } },
  })
  if (!v) throw new Error("Version nicht gefunden.")

  const signature = await verifyElectronicSignature({
    userId: input.userId,
    versionId: input.versionId,
    password: input.password,
    signatureMeaning: input.signatureMeaning,
  })

  const taskToComplete = await findPendingWorkflowTask(v.id, "Approval", input.userId, v.approverId)
  if (!taskToComplete) {
    throw new Error("Sie sind kein zugewiesener Genehmiger mit offener Aufgabe für diese Version.")
  }

  await prisma.workflowTask.update({
    where: { id: taskToComplete.id },
    data: { status: "Approved", completedAt: new Date() },
  })

  await logAudit({
    userId: input.userId,
    action: "APPROVE",
    entityType: "WorkflowTask",
    entityId: taskToComplete.id,
    after: { status: "Approved", signature },
  })

  if (v.status === "Released") {
    const nextReview = calculateNextDate(v.document.reviewIntervalMonths)
    await prisma.documentVersion.update({
      where: { id: v.id },
      data: { nextReviewDate: nextReview, electronicSignature: signature },
    })

    await logAudit({
      userId: input.userId,
      action: "APPROVE_REVIEW_WITHOUT_CHANGE",
      entityType: "DocumentVersion",
      entityId: v.id,
      after: { nextReviewDate: nextReview, signature },
    })
    notifyVersionApproved(v.documentId, v.id, input.userId)
    return v
  }

  const quorumMode = await getWorkflowQuorum(v.document.departmentId)

  if (quorumMode === "einer") {
    await cancelRemainingTasks(v.id, "Approval", "Quorum einer erreicht", input.userId)
    await logAudit({
      userId: input.userId,
      action: "QUORUM_REACHED",
      entityType: "DocumentVersion",
      entityId: v.id,
      after: { quorum: "einer", phase: "Approval" },
    })
    await releaseVersionInternal(v, input.userId, signature)
  } else {
    const remainingPending = await prisma.workflowTask.count({
      where: { documentVersionId: v.id, taskType: "Approval", status: "Pending" },
    })
    if (remainingPending === 0) {
      await releaseVersionInternal(v, input.userId, signature)
    }
  }

  notifyVersionApproved(v.documentId, v.id, input.userId)
  const finalVersion = await prisma.documentVersion.findUnique({ where: { id: v.id } })
  return finalVersion ?? v
}

export { withdrawDocument } from "./archive"
