import { prisma } from "@/lib/prisma"
import { DEPARTMENT_ROLES } from "@/lib/constants"
import { logAudit } from "./audit"
import { calculateNextDate } from "./document-helpers"

/**
 * Ermittelt den effektiven Quorum-Modus:
 * 1. Department.quorumMode (falls gesetzt: "einer" | "alle")
 * 2. AppSetting "workflow.quorum" (falls vorhanden)
 * 3. Default: "alle"
 */
export async function getWorkflowQuorum(departmentId?: string | null): Promise<"einer" | "alle"> {
  if (departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { quorumMode: true },
    })
    if (dept?.quorumMode === "einer" || dept?.quorumMode === "alle") {
      return dept.quorumMode
    }
  }

  const setting = await prisma.appSetting.findUnique({
    where: { key: "workflow.quorum" },
  })
  if (setting?.value === "einer" || setting?.value === "alle") {
    return setting.value
  }

  return "alle"
}

/**
 * Ermittelt gültige Prüfer-Kandidaten aus den Bereichsrollen:
 * - Aktive User mit PRUEFER-Rolle im verantwortlichen Bereich (keine Vererbung)
 * - Ersteller ausgeschlossen (Vier-Augen-Prinzip)
 */
export async function getValidReviewCandidates(departmentId: string, creatorId: string) {
  const assignments = await prisma.departmentRoleAssignment.findMany({
    where: {
      departmentId,
      role: DEPARTMENT_ROLES.PRUEFER,
      user: { isActive: true },
    },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
    },
  })

  return assignments
    .map((a) => a.user)
    .filter((u) => u.id !== creatorId)
}

/**
 * Ermittelt gültige Freigeber-Kandidaten aus den Bereichsrollen:
 * - Aktive User mit FREIGEBER-Rolle im verantwortlichen Bereich (keine Vererbung)
 * - Ersteller ausgeschlossen (Vier-Augen-Prinzip)
 */
export async function getValidApprovalCandidates(departmentId: string, creatorId: string) {
  const assignments = await prisma.departmentRoleAssignment.findMany({
    where: {
      departmentId,
      role: DEPARTMENT_ROLES.FREIGEBER,
      user: { isActive: true },
    },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
    },
  })

  return assignments
    .map((a) => a.user)
    .filter((u) => u.id !== creatorId)
}

/**
 * Bricht übrige offene Tasks ab (Status Cancelled), z. B. wenn bei Quorum "einer"
 * der erste Abschluss erzielt wurde.
 */
export async function cancelRemainingTasks(
  versionId: string,
  taskType: "Review" | "Approval",
  reason: string,
  userId?: string
) {
  const pending = await prisma.workflowTask.findMany({
    where: {
      documentVersionId: versionId,
      taskType,
      status: "Pending",
    },
    select: { id: true, assignedToId: true },
  })

  if (pending.length === 0) return

  await prisma.workflowTask.updateMany({
    where: {
      documentVersionId: versionId,
      taskType,
      status: "Pending",
    },
    data: {
      status: "Cancelled",
      completedAt: new Date(),
      comments: reason,
    },
  })

  for (const t of pending) {
    await logAudit({
      userId,
      action: "CANCEL_TASK",
      entityType: "WorkflowTask",
      entityId: t.id,
      after: { status: "Cancelled", reason },
    })
  }
}

/**
 * Geht nach erfolgreicher Review-Phase in die Approval-Phase über:
 * - Setzt Status In_Approval
 * - Legt Approval-Tasks für alle Freigeber-Kandidaten an
 */
export async function advanceToApprovalPhase(
  version: {
    id: string
    createdById: string | null
    approverId: string | null
    document: { departmentId: string | null }
  },
  operatorUserId?: string
) {
  let approverId = version.approverId
  let candidateFreigeber: { id: string }[] = []

  if (version.document.departmentId) {
    const freigeber = await getValidApprovalCandidates(version.document.departmentId, version.createdById ?? "")
    if (freigeber.length > 0) {
      candidateFreigeber = freigeber
      approverId = freigeber[0].id
    }
  }

  if (candidateFreigeber.length === 0 && version.approverId) {
    candidateFreigeber = [{ id: version.approverId }]
  }

  const updates: any[] = [
    prisma.documentVersion.update({
      where: { id: version.id },
      data: { status: "In_Approval", approverId },
    }),
    ...candidateFreigeber.map((f) =>
      prisma.workflowTask.create({
        data: {
          documentVersionId: version.id,
          assignedToId: f.id,
          taskType: "Approval",
          status: "Pending",
        },
      })
    ),
  ]

  await prisma.$transaction(updates)

  await logAudit({
    userId: operatorUserId,
    action: "TRANSITION_TO_APPROVAL",
    entityType: "DocumentVersion",
    entityId: version.id,
    after: { status: "In_Approval", approverId, taskCount: candidateFreigeber.length },
  })
}

/**
 * Führt die endgültige Freigabe einer Version durch:
 * - Major +1, Minor 0, Status Released
 * - Vorherige Released-Versionen werden Archived
 */
export async function releaseVersionInternal(
  v: {
    id: string
    documentId: string
    majorVersion: number
    document: {
      reviewIntervalMonths: number | null
      type?: { retentionMonths: number | null } | null
    }
  },
  userId: string,
  signature?: Record<string, any>
) {
  const maxMajor = await prisma.documentVersion.aggregate({
    where: { documentId: v.documentId },
    _max: { majorVersion: true },
  })
  const newMajor = (maxMajor._max.majorVersion ?? 0) + 1
  const retentionEndDate = v.document.type?.retentionMonths
    ? calculateNextDate(v.document.type.retentionMonths)
    : undefined

  const updates: any[] = [
    prisma.documentVersion.updateMany({
      where: { documentId: v.documentId, status: "Released" },
      data: { status: "Archived", obsoleteDate: new Date(), retentionEndDate },
    }),
    prisma.documentVersion.update({
      where: { id: v.id },
      data: {
        majorVersion: newMajor,
        minorVersion: 0,
        status: "Released",
        effectiveDate: new Date(),
        nextReviewDate: calculateNextDate(v.document.reviewIntervalMonths),
        electronicSignature: signature ? (signature as any) : undefined,
      },
    }),
  ]

  await prisma.$transaction(updates)

  await logAudit({
    userId,
    action: "APPROVE",
    entityType: "DocumentVersion",
    entityId: v.id,
    before: { major: v.majorVersion, status: "In_Approval" },
    after: { major: newMajor, minor: 0, status: "Released", signature },
  })
}

/** Prüfung ohne Änderung starten (für freigegebene Dokumente) */
export async function startReviewWithoutChange(input: {
  documentId: string
  userId: string
  userRole: string
  comment: string
}) {
  const latest = await prisma.documentVersion.findFirst({
    where: { documentId: input.documentId },
    orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
  })
  if (!latest || latest.status !== "Released") {
    throw new Error("Prüfung ohne Änderung kann nur für freigegebene Dokumente gestartet werden.")
  }
  const doc = await prisma.document.findUnique({ where: { id: input.documentId } })
  if (input.userRole !== "ADMIN" && doc?.ownerId !== input.userId && latest.createdById !== input.userId) {
    throw new Error("Nur der Dokument-Eigentümer oder Ersteller kann diese Prüfung starten.")
  }

  let candidates: { id: string }[] = []
  if (doc?.departmentId) {
    const pruefer = await getValidReviewCandidates(doc.departmentId, input.userId)
    if (pruefer.length > 0) candidates = pruefer
  }
  if (candidates.length === 0 && latest.reviewerId) {
    candidates = [{ id: latest.reviewerId }]
  }
  if (candidates.length === 0) {
    throw new Error("Prüfer müssen zugewiesen sein.")
  }

  const updates = candidates.map((c) =>
    prisma.workflowTask.create({
      data: {
        documentVersionId: latest.id,
        assignedToId: c.id,
        taskType: "Review",
        status: "Pending",
        comments: input.comment,
      },
    })
  )
  const results = await prisma.$transaction(updates)

  await logAudit({
    userId: input.userId,
    action: "START_REVIEW_WITHOUT_CHANGE",
    entityType: "DocumentVersion",
    entityId: latest.id,
    after: { comment: input.comment, taskCount: candidates.length },
  })
  const { notifyReviewSubmitted } = await import("./workflow-notifications")
  notifyReviewSubmitted(input.documentId, latest.id, input.userId)
  return results[0]
}

