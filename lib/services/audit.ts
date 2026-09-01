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
