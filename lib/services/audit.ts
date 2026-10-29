import { prisma } from "@/lib/prisma"
import crypto from "node:crypto"

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

function getAuditSecret(): string {
  return (
    process.env.AUDIT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "documentum-audit-seal-key"
  )
}

function canonicalize(val: any): any {
  if (val === null || val === undefined) return null
  if (typeof val !== "object") return val
  if (Array.isArray(val)) return val.map(canonicalize)
  const sortedKeys = Object.keys(val).sort()
  const result: Record<string, any> = {}
  for (const key of sortedKeys) {
    result[key] = canonicalize(val[key])
  }
  return result
}

export function canonicalJson(val: any): string {
  if (val === null || val === undefined) return ""
  return JSON.stringify(canonicalize(val))
}

export function computeAuditHash(input: {
  previousHash: string
  createdAt: Date | string
  userId?: string | null
  action: string
  entityType: string
  entityId: string
  before?: any
  after?: any
  ipAddress?: string | null
  userAgent?: string | null
}): string {
  const isoDate = input.createdAt instanceof Date ? input.createdAt.toISOString() : new Date(input.createdAt).toISOString()
  const payload = [
    input.previousHash,
    isoDate,
    input.userId ?? "",
    input.action,
    input.entityType,
    input.entityId,
    canonicalJson(input.before),
    canonicalJson(input.after),
    input.ipAddress ?? "",
    input.userAgent ?? "",
  ].join("|")

  return crypto.createHmac("sha256", getAuditSecret()).update(payload, "utf8").digest("hex")
}

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
 * Jede Schreibaktion der App protokolliert hier wer, wann, was (vorher/nachher) inkl. IP & User-Agent
 * und wird kryptographisch mit dem vorherigen Eintrag verkettet (HMAC-SHA256 Hash-Chain).
 */
export async function logAudit({
  userId, action, entityType, entityId, before, after, ipAddress, userAgent,
}: AuditInput) {
  let clientIp = ipAddress
  let clientAgent = userAgent
  if (clientIp === undefined || clientAgent === undefined) {
    const meta = await getClientMetadata()
    if (clientIp === undefined) clientIp = meta.ipAddress
    if (clientAgent === undefined) clientAgent = meta.userAgent
  }

  const lastEntry = await prisma.auditLog.findFirst({
    where: { recordHash: { not: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { recordHash: true },
  })
  const previousHash = lastEntry?.recordHash ?? GENESIS_HASH
  const createdAt = new Date()

  const recordHash = computeAuditHash({
    previousHash, createdAt, userId: userId ?? null, action, entityType, entityId,
    before, after, ipAddress: clientIp ?? null, userAgent: clientAgent ?? null,
  })

  await prisma.auditLog.create({
    data: {
      userId: userId ?? null, action, entityType, entityId,
      before: before === undefined ? undefined : (before as object),
      after: after === undefined ? undefined : (after as object),
      ipAddress: clientIp ?? null, userAgent: clientAgent ?? null,
      previousHash, recordHash, createdAt,
    },
  })
}

/**
 * Nachträgliches Versiegeln unversiegelter historischer Audit-Einträge in chronologischer Reihenfolge.
 */
export async function backfillAuditLogHashes(): Promise<number> {
  const unhashed = await prisma.auditLog.findMany({
    where: { recordHash: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  if (unhashed.length === 0) return 0

  const lastEntry = await prisma.auditLog.findFirst({
    where: { recordHash: { not: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { recordHash: true },
  })
  let currentPreviousHash = lastEntry?.recordHash ?? GENESIS_HASH

  for (const log of unhashed) {
    const recordHash = computeAuditHash({
      previousHash: currentPreviousHash, createdAt: log.createdAt, userId: log.userId,
      action: log.action, entityType: log.entityType, entityId: log.entityId,
      before: log.before, after: log.after, ipAddress: log.ipAddress, userAgent: log.userAgent,
    })
    await prisma.auditLog.update({
      where: { id: log.id },
      data: { previousHash: currentPreviousHash, recordHash },
    })
    currentPreviousHash = recordHash
  }

  return unhashed.length
}

export type IntegrityCheckResult = {
  valid: boolean
  totalChecked: number
  unhashedCount: number
  brokenAtId?: string
  brokenAtAction?: string
  reason?: string
  firstRecordDate?: Date
  lastRecordDate?: Date
}

/**
 * Prüft die mathematische Integrität der Audit-Log Hashkette (HMAC-SHA256).
 */
export async function verifyAuditLogIntegrity(limit?: number): Promise<IntegrityCheckResult> {
  const logs = await prisma.auditLog.findMany({
    where: { recordHash: { not: null } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    ...(limit && limit > 0 ? { take: limit } : {}),
  })

  const unhashedCount = await prisma.auditLog.count({
    where: { recordHash: null },
  })

  if (logs.length === 0) {
    return { valid: true, totalChecked: 0, unhashedCount }
  }

  let expectedPreviousHash = logs[0].previousHash ?? GENESIS_HASH

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i]

    if (log.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        totalChecked: i,
        unhashedCount,
        brokenAtId: log.id,
        brokenAtAction: log.action,
        reason: `Kettenbruch bei ID ${log.id}: Der Zeiger previousHash stimmt nicht mit dem Hash des Vorgängers überein.`,
        firstRecordDate: logs[0].createdAt,
        lastRecordDate: log.createdAt,
      }
    }

    const calculatedHash = computeAuditHash({
      previousHash: log.previousHash,
      createdAt: log.createdAt,
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      before: log.before,
      after: log.after,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
    })

    if (calculatedHash !== log.recordHash) {
      return {
        valid: false,
        totalChecked: i,
        unhashedCount,
        brokenAtId: log.id,
        brokenAtAction: log.action,
        reason: `Integritätsverletzung bei ID ${log.id} (${log.action}): Der Datensatzinhalt wurde nachträglich modifiziert.`,
        firstRecordDate: logs[0].createdAt,
        lastRecordDate: log.createdAt,
      }
    }

    expectedPreviousHash = log.recordHash!
  }

  return {
    valid: true,
    totalChecked: logs.length,
    unhashedCount,
    firstRecordDate: logs[0].createdAt,
    lastRecordDate: logs[logs.length - 1].createdAt,
  }
}

export type AuditLogFilters = {
  action?: string
  entityType?: string
  search?: string
}

function buildAuditWhere(filters: AuditLogFilters = {}) {
  return {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
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
  }
}

export async function listAuditLogs(
  filters: AuditLogFilters = {},
  take: number = 100,
  skip: number = 0
) {
  return prisma.auditLog.findMany({
    where: buildAuditWhere(filters),
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  })
}

export async function countAuditLogs(filters: AuditLogFilters = {}) {
  return prisma.auditLog.count({ where: buildAuditWhere(filters) })
}

export async function getAuditActions() {
  const actions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  })
  return actions.map((a) => a.action)
}

export async function getAuditEntityTypes() {
  const types = await prisma.auditLog.findMany({
    select: { entityType: true },
    distinct: ["entityType"],
    orderBy: { entityType: "asc" },
  })
  return types.map((t) => t.entityType)
}
