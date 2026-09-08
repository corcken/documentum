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

  const doc = await prisma.document.findUnique({
    where: { id: input.documentId },
    select: { departmentId: true },
  })

  let reviewerId = latest.reviewerId
  let approverId = latest.approverId
  let candidatePruefer: { id: string }[] = []

  if (doc?.departmentId) {
    const pruefer = await getValidReviewCandidates(doc.departmentId, input.userId)
    const freigeber = await getValidApprovalCandidates(doc.departmentId, input.userId)

    if (pruefer.length === 0 || freigeber.length === 0) {
      throw new Error(
        "Einreichung blockiert: Bitte erst Prüfer- und Freigeber-Rolle im Bereich besetzen (Ersteller darf nicht selbst prüfen oder freigeben)."
      )
    }

    candidatePruefer = pruefer
    reviewerId = pruefer[0].id
    approverId = freigeber[0].id
  } else {
    // Altbestand ohne departmentId
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

  // Autorisierung: Hat der User einen offenen Review-Task?
  const myTask = await prisma.workflowTask.findFirst({
    where: {
      documentVersionId: v.id,
      taskType: "Review",
      status: "Pending",
      assignedToId: input.userId,
    },
  })
  const legacyTask =
    !myTask && v.reviewerId === input.userId
      ? await prisma.workflowTask.findFirst({
          where: { documentVersionId: v.id, taskType: "Review", status: "Pending" },
        })
      : null

  const taskToComplete = myTask ?? legacyTask
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
    // Quorum einer: Erster Abschluss gewinnt → übrige offene Review-Tasks erlöschen
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
    // Quorum alle: Erst wenn alle Prüfer Approved sind, in Approval übergehen
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

/**
 * Genehmigung: je nach Quorum Released oder warten auf übrige Freigeber.
 * Autorisierung läuft über den offenen Approval-Task des Users.
 */
export async function approveVersion(input: { versionId: string; userId: string }) {
  const v = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    include: { document: { include: { type: true } } },
  })
  if (!v) throw new Error("Version nicht gefunden.")

  const myTask = await prisma.workflowTask.findFirst({
    where: {
      documentVersionId: v.id,
      taskType: "Approval",
      status: "Pending",
      assignedToId: input.userId,
    },
  })
  const legacyTask =
    !myTask && v.approverId === input.userId
      ? await prisma.workflowTask.findFirst({
          where: { documentVersionId: v.id, taskType: "Approval", status: "Pending" },
        })
      : null

  const taskToComplete = myTask ?? legacyTask
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
    after: { status: "Approved" },
  })

  if (v.status === "Released") {
    // Prüfung ohne Änderung abgeschlossen
    const nextReview = calculateNextDate(v.document.reviewIntervalMonths)
    await prisma.documentVersion.update({
      where: { id: v.id },
      data: { nextReviewDate: nextReview },
    })

    await logAudit({
      userId: input.userId,
      action: "APPROVE_REVIEW_WITHOUT_CHANGE",
      entityType: "DocumentVersion",
      entityId: v.id,
      after: { nextReviewDate: nextReview },
    })
    notifyVersionApproved(v.documentId, v.id, input.userId)
    return v
  }

  const quorumMode = await getWorkflowQuorum(v.document.departmentId)

  if (quorumMode === "einer") {
    // Erster Abschluss gewinnt: übrige Approval-Tasks erlöschen
    await cancelRemainingTasks(v.id, "Approval", "Quorum einer erreicht", input.userId)
    await logAudit({
      userId: input.userId,
      action: "QUORUM_REACHED",
      entityType: "DocumentVersion",
      entityId: v.id,
      after: { quorum: "einer", phase: "Approval" },
    })
    await releaseVersionInternal(v, input.userId)
  } else {
    // Quorum alle: Erst wenn alle Freigeber zugestimmt haben, erfolgt Release
    const remainingPending = await prisma.workflowTask.count({
      where: { documentVersionId: v.id, taskType: "Approval", status: "Pending" },
    })
    if (remainingPending === 0) {
      await releaseVersionInternal(v, input.userId)
    }
  }

  notifyVersionApproved(v.documentId, v.id, input.userId)
  const finalVersion = await prisma.documentVersion.findUnique({ where: { id: v.id } })
  return finalVersion ?? v
}

export { withdrawDocument } from "./archive"
