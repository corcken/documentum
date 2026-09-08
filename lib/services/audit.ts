import { prisma } from "@/lib/prisma"

type AuditInput = {
  userId?: string | null
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
}

/**
 * Zentraler Audit-Eintrag (GMP: append-only, nie ändern/löschen).
 * Jede Schreibaktion der App protokolliert hier wer, wann, was (vorher/nachher).
 */
export async function logAudit({ userId, action, entityType, entityId, before, after }: AuditInput) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entityType,
      entityId,
      before: before === undefined ? undefined : (before as object),
      after: after === undefined ? undefined : (after as object),
    },
  })
}

export type AuditLogFilters = {
  action?: string
  search?: string
}

export async function listAuditLogs(filters: AuditLogFilters = {}, take: number = 100) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.search
        ? {
            OR: [
              { entityType: { contains: filters.search } },
              { entityId: { contains: filters.search } },
              { user: { name: { contains: filters.search } } },
              { user: { email: { contains: filters.search } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  })
}

export async function getAuditActions() {
  const actions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  })
  return actions.map((a) => a.action)
}
