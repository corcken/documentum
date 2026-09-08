import { prisma } from "@/lib/prisma"

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
