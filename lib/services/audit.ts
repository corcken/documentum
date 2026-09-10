import { prisma } from "@/lib/prisma"

type AuditInput = {
  userId?: string | null
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  ipAddress?: string | null
  userAgent?: string | null
}

async function getClientMetadata(): Promise<{ ipAddress?: string | null; userAgent?: string | null }> {
  try {
    const { headers } = await import("next/headers")
    const headerList = await headers()
    const forwarded = headerList.get("x-forwarded-for")
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : (headerList.get("x-real-ip") ?? null)
    const userAgent = headerList.get("user-agent") ?? null
    return { ipAddress, userAgent }
  } catch {
    return { ipAddress: null, userAgent: null }
  }
}

/**
 * Zentraler Audit-Eintrag (GMP: append-only, nie ändern/löschen).
 * Jede Schreibaktion der App protokolliert hier wer, wann, was (vorher/nachher) inkl. IP & User-Agent.
 */
export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  before,
  after,
  ipAddress,
  userAgent,
}: AuditInput) {
  let clientIp = ipAddress
  let clientAgent = userAgent

  if (clientIp === undefined || clientAgent === undefined) {
    const meta = await getClientMetadata()
    if (clientIp === undefined) clientIp = meta.ipAddress
    if (clientAgent === undefined) clientAgent = meta.userAgent
  }

  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entityType,
      entityId,
      before: before === undefined ? undefined : (before as object),
      after: after === undefined ? undefined : (after as object),
      ipAddress: clientIp ?? null,
      userAgent: clientAgent ?? null,
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
