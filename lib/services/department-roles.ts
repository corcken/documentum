import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import { getDepartmentAncestors } from "./org"
import { DEPARTMENT_ROLES, type DepartmentRole } from "@/lib/constants"

/**
 * Prüft serverseitig hart, ob ein User die Bereichsrollen/Leiter eines Bereichs pflegen darf:
 * - Admin darf immer
 * - Leiter des Bereichs selbst darf
 * - Leiter eines Vorfahren-Bereichs (Baum nach oben) darf
 */
export async function canManageDepartmentRoles(userId: string, departmentId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  })
  if (!user || !user.isActive) return false
  if (user.role?.name === "ADMIN") return true

  // Prüfe, ob user Leiter des Bereichs oder eines Vorfahren-Bereichs ist
  const ancestors = await getDepartmentAncestors(departmentId)
  const leadMatch = await prisma.departmentLead.findFirst({
    where: {
      userId,
      departmentId: { in: Array.from(ancestors) },
    },
  })

  return Boolean(leadMatch)
}

/** Liefert Rollen, Leiter und Quorum-Einstellung eines Bereichs. */
export async function getDepartmentRolesAndLeads(departmentId: string) {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      leads: {
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
        },
      },
      roleAssignments: {
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
        },
      },
    },
  })

  if (!dept) throw new Error("Organisationseinheit nicht gefunden")

  const ersteller = dept.roleAssignments
    .filter((r) => r.role === DEPARTMENT_ROLES.ERSTELLER)
    .map((r) => ({ ...r.user, openTasksCount: 0 }))

  const pruefer = await Promise.all(
    dept.roleAssignments
      .filter((r) => r.role === DEPARTMENT_ROLES.PRUEFER)
      .map(async (r) => ({
        ...r.user,
        openTasksCount: await countAffectedOpenTasks(departmentId, DEPARTMENT_ROLES.PRUEFER, r.user.id),
      }))
  )

  const freigeber = await Promise.all(
    dept.roleAssignments
      .filter((r) => r.role === DEPARTMENT_ROLES.FREIGEBER)
      .map(async (r) => ({
        ...r.user,
        openTasksCount: await countAffectedOpenTasks(departmentId, DEPARTMENT_ROLES.FREIGEBER, r.user.id),
      }))
  )

  return {
    department: {
      id: dept.id,
      name: dept.name,
      abbreviation: dept.abbreviation,
      quorumMode: dept.quorumMode,
    },
    leads: dept.leads.map((l) => l.user),
    ersteller,
    pruefer,
    freigeber,
  }
}

/** Leiter zu einem Bereich hinzufügen */
export async function addDepartmentLead(operatorUserId: string, departmentId: string, targetUserId: string) {
  const allowed = await canManageDepartmentRoles(operatorUserId, departmentId)
  if (!allowed) throw new Error("Keine Berechtigung zur Verwaltung dieses Bereichs")

  const lead = await prisma.departmentLead.upsert({
    where: {
      departmentId_userId: { departmentId, userId: targetUserId },
    },
    update: {},
    create: { departmentId, userId: targetUserId },
  })

  await logAudit({
    userId: operatorUserId,
    action: "CREATE",
    entityType: "DepartmentLead",
    entityId: `${departmentId}:${targetUserId}`,
    after: { departmentId, userId: targetUserId },
  })

  return lead
}

/** Leiter aus einem Bereich entfernen */
export async function removeDepartmentLead(operatorUserId: string, departmentId: string, targetUserId: string) {
  const allowed = await canManageDepartmentRoles(operatorUserId, departmentId)
  if (!allowed) throw new Error("Keine Berechtigung zur Verwaltung dieses Bereichs")

  const existing = await prisma.departmentLead.findUnique({
    where: { departmentId_userId: { departmentId, userId: targetUserId } },
  })

  if (existing) {
    await prisma.departmentLead.delete({
      where: { departmentId_userId: { departmentId, userId: targetUserId } },
    })

    await logAudit({
      userId: operatorUserId,
      action: "DELETE",
      entityType: "DepartmentLead",
      entityId: `${departmentId}:${targetUserId}`,
      before: { departmentId, userId: targetUserId },
    })
  }

  return { ok: true }
}

/** Rolle in einem Bereich ergänzen (entleeren/ergänzen: offene Aufgaben bleiben unangetastet) */
export async function addDepartmentRole(
  operatorUserId: string,
  departmentId: string,
  targetUserId: string,
  role: DepartmentRole | string
) {
  const allowed = await canManageDepartmentRoles(operatorUserId, departmentId)
  if (!allowed) throw new Error("Keine Berechtigung zur Verwaltung dieses Bereichs")

  const assignment = await prisma.departmentRoleAssignment.upsert({
    where: {
      departmentId_userId_role: { departmentId, userId: targetUserId, role },
    },
    update: {},
    create: { departmentId, userId: targetUserId, role },
  })

  await logAudit({
    userId: operatorUserId,
    action: "CREATE",
    entityType: "DepartmentRoleAssignment",
    entityId: `${departmentId}:${targetUserId}:${role}`,
    after: { departmentId, userId: targetUserId, role },
  })

  return assignment
}

/** Rolle aus einem Bereich entfernen (entleeren: offene Aufgaben bleiben unangetastet) */
export async function removeDepartmentRole(
  operatorUserId: string,
  departmentId: string,
  targetUserId: string,
  role: DepartmentRole | string
) {
  const allowed = await canManageDepartmentRoles(operatorUserId, departmentId)
  if (!allowed) throw new Error("Keine Berechtigung zur Verwaltung dieses Bereichs")

  const existing = await prisma.departmentRoleAssignment.findUnique({
    where: { departmentId_userId_role: { departmentId, userId: targetUserId, role } },
  })

  if (existing) {
    await prisma.departmentRoleAssignment.delete({
      where: { departmentId_userId_role: { departmentId, userId: targetUserId, role } },
    })

    await logAudit({
      userId: operatorUserId,
      action: "DELETE",
      entityType: "DepartmentRoleAssignment",
      entityId: `${departmentId}:${targetUserId}:${role}`,
      before: { departmentId, userId: targetUserId, role },
    })
  }

  return { ok: true }
}

/** Zählt offene Aufgaben, die bei einer Neubesetzung von previousUserId betroffen wären */
export async function countAffectedOpenTasks(
  departmentId: string,
  role: DepartmentRole | string,
  previousUserId: string
): Promise<number> {
  const taskType = role === DEPARTMENT_ROLES.PRUEFER ? "Review" : role === DEPARTMENT_ROLES.FREIGEBER ? "Approval" : null
  if (!taskType) return 0

  return prisma.workflowTask.count({
    where: {
      assignedToId: previousUserId,
      status: "Pending",
      taskType,
      documentVersion: {
        document: { departmentId },
      },
    },
  })
}

/**
 * Neubesetzung einer Bereichsrolle (Person B ersetzt Person A):
 * - Ersetzt Person in DepartmentRoleAssignment
 * - Offene Aufgaben (Pending Review/Approval) von oldUserId für diesen Bereich gehen auf newUserId über
 * - Auditiert
 */
export async function replaceDepartmentRole(
  operatorUserId: string,
  departmentId: string,
  oldUserId: string,
  newUserId: string,
  role: DepartmentRole | string
): Promise<{ affectedTasksCount: number }> {
  const allowed = await canManageDepartmentRoles(operatorUserId, departmentId)
  if (!allowed) throw new Error("Keine Berechtigung zur Verwaltung dieses Bereichs")

  // 1. Zuweisung austauschen
  await prisma.$transaction(async (tx) => {
    await tx.departmentRoleAssignment.deleteMany({
      where: { departmentId, userId: oldUserId, role },
    })
    await tx.departmentRoleAssignment.upsert({
      where: { departmentId_userId_role: { departmentId, userId: newUserId, role } },
      update: {},
      create: { departmentId, userId: newUserId, role },
    })
  })

  await logAudit({
    userId: operatorUserId,
    action: "REPLACE_ROLE",
    entityType: "DepartmentRoleAssignment",
    entityId: `${departmentId}:${role}`,
    before: { userId: oldUserId },
    after: { userId: newUserId },
  })

  // 2. Offene Aufgaben umhängen
  const taskType = role === DEPARTMENT_ROLES.PRUEFER ? "Review" : role === DEPARTMENT_ROLES.FREIGEBER ? "Approval" : null
  let affectedTasksCount = 0

  if (taskType) {
    const tasksToReassign = await prisma.workflowTask.findMany({
      where: {
        assignedToId: oldUserId,
        status: "Pending",
        taskType,
        documentVersion: {
          document: { departmentId },
        },
      },
      select: { id: true, documentVersionId: true },
    })

    affectedTasksCount = tasksToReassign.length

    for (const task of tasksToReassign) {
      await prisma.workflowTask.update({
        where: { id: task.id },
        data: { assignedToId: newUserId },
      })

      // Halte auch DocumentVersion reviewerId/approverId synchron für Konsistenz
      if (role === DEPARTMENT_ROLES.PRUEFER) {
        await prisma.documentVersion.updateMany({
          where: { id: task.documentVersionId, reviewerId: oldUserId },
          data: { reviewerId: newUserId },
        })
      } else if (role === DEPARTMENT_ROLES.FREIGEBER) {
        await prisma.documentVersion.updateMany({
          where: { id: task.documentVersionId, approverId: oldUserId },
          data: { approverId: newUserId },
        })
      }

      await logAudit({
        userId: operatorUserId,
        action: "REASSIGN_TASK",
        entityType: "WorkflowTask",
        entityId: task.id,
        before: { assignedToId: oldUserId },
        after: { assignedToId: newUserId, role, departmentId },
      })
    }
  }

  return { affectedTasksCount }
}

/** Quorum-Override eines Bereichs setzen (null = App-Standard) */
export async function setDepartmentQuorum(
  operatorUserId: string,
  departmentId: string,
  quorumMode: string | null
) {
  const allowed = await canManageDepartmentRoles(operatorUserId, departmentId)
  if (!allowed) throw new Error("Keine Berechtigung zur Verwaltung dieses Bereichs")

  const before = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { quorumMode: true },
  })

  const updated = await prisma.department.update({
    where: { id: departmentId },
    data: { quorumMode: quorumMode ?? null },
  })

  await logAudit({
    userId: operatorUserId,
    action: "UPDATE_QUORUM",
    entityType: "Department",
    entityId: departmentId,
    before: { quorumMode: before?.quorumMode ?? null },
    after: { quorumMode: updated.quorumMode },
  })

  return updated
}

/** Liefert alle aktiven Kandidaten eines Bereichs für eine bestimmte Rolle (Ersteller/Prüfer/Freigeber) */
export async function getDepartmentRoleUsers(departmentId: string, role: DepartmentRole | string) {
  const assignments = await prisma.departmentRoleAssignment.findMany({
    where: {
      departmentId,
      role,
      user: { isActive: true },
    },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
    },
  })
  return assignments.map((a) => a.user)
}

/** Liefert IDs aller Bereiche, in denen der User die ERSTELLER-Rolle innehat */
export async function getUserCreatorDepartmentIds(userId: string): Promise<string[]> {
  const assignments = await prisma.departmentRoleAssignment.findMany({
    where: {
      userId,
      role: DEPARTMENT_ROLES.ERSTELLER,
    },
    select: { departmentId: true },
  })
  return assignments.map((a) => a.departmentId)
}
