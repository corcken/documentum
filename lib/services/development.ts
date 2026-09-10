import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/services/audit"

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("Kritischer Konfigurationsfehler: AUTH_SECRET ist nicht definiert.")
  }
  return secret
}

/**
 * Erzeugt ein kurzlebiges, kryptografisch signiertes Token für den Identitätswechsel (Impersonation).
 * Gültig für maximal 60 Sekunden.
 */
export function createImpersonationToken(adminUserId: string, targetUserId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${adminUserId}:${targetUserId}:${timestamp}`
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
  return `${payload}:${signature}`
}

/**
 * Verifiziert das Impersonation-Token.
 * Prüft HMAC-Signatur, Ablaufzeit und ob der anfragende Admin in der DB noch aktiv ist.
 */
export async function verifyImpersonationToken(
  targetUserId: string,
  token: string
): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_IMPERSONATION !== "true") {
      return false
    }

    const parts = token.split(":")
    if (parts.length !== 4) return false
    const [adminUserId, tokenTargetId, timestampStr, signature] = parts
    if (tokenTargetId !== targetUserId) return false

    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) return false

    // Token maximal 60 Sekunden gültig, Toleranz bis zu 5s in die Zukunft (Clock Drift)
    const now = Date.now()
    if (now - timestamp > 60_000 || timestamp > now + 5000) {
      return false
    }

    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(`${adminUserId}:${tokenTargetId}:${timestampStr}`)
      .digest("hex")

    const sigBuf = Buffer.from(signature, "utf8")
    const expBuf = Buffer.from(expectedSig, "utf8")
    if (sigBuf.length !== expBuf.length) return false
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false

    // Prüfen, ob der auslösende Admin noch existiert, aktiv ist und die ADMIN-Rolle hat
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
      include: { role: true },
    })
    if (!admin || !admin.isActive || admin.role?.name !== "ADMIN") {
      return false
    }

    return true
  } catch {
    return false
  }
}

export type ImpersonationUser = {
  id: string
  name: string | null
  email: string
  roleName: string | null
  departmentName: string | null
  jobRoleName: string | null
  openTaskCount: number
}

/**
 * Lädt alle aktiven Benutzer für die Impersonation-Liste, optional gefiltert nach Suche oder Rolle.
 */
export async function getImpersonationUsers(filters: {
  search?: string
  roleFilter?: string
} = {}): Promise<ImpersonationUser[]> {
  const { search, roleFilter } = filters

  const [users, taskCounts] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        ...(roleFilter && roleFilter !== "ALL"
          ? { role: { name: roleFilter } }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { department: { name: { contains: search } } },
                { jobRole: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        role: true,
        department: true,
        jobRole: true,
      },
      orderBy: [
        { role: { name: "asc" } },
        { name: "asc" },
      ],
    }),
    prisma.workflowTask.groupBy({
      by: ["assignedToId"],
      where: { status: "Pending" },
      _count: { id: true },
    }),
  ])

  const countMap = new Map<string, number>()
  for (const tc of taskCounts) {
    if (tc.assignedToId) {
      countMap.set(tc.assignedToId, tc._count.id)
    }
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleName: u.role?.name ?? null,
    departmentName: u.department?.name ?? null,
    jobRoleName: u.jobRole?.name ?? null,
    openTaskCount: countMap.get(u.id) ?? 0,
  }))
}

/**
 * Validiert die Berechtigung des Admins und des Ziel-Benutzers,
 * protokolliert den Vorgang im GMP-Audit-Trail und erzeugt das Signatur-Token.
 */
export async function impersonateUser(adminUserId: string, targetUserId: string) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_IMPERSONATION !== "true") {
    throw new Error("Der Identitätswechsel ist in der Produktivumgebung deaktiviert.")
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    include: { role: true },
  })
  if (!admin || !admin.isActive || admin.role?.name !== "ADMIN") {
    throw new Error("Nur aktive Administratoren dürfen die Identität wechseln.")
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  })
  if (!target) {
    throw new Error("Der Ziel-Benutzer wurde nicht gefunden.")
  }
  if (!target.isActive) {
    throw new Error("Der Ziel-Benutzer ist deaktiviert.")
  }

  // GMP-Audit-Log Eintrag (Grundregel 5)
  await logAudit({
    userId: adminUserId,
    action: "DEV_IMPERSONATE",
    entityType: "User",
    entityId: targetUserId,
    before: {
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
    },
    after: {
      impersonatedUserId: target.id,
      impersonatedEmail: target.email,
      impersonatedName: target.name,
      impersonatedRole: target.role?.name ?? null,
    },
  })

  const token = createImpersonationToken(adminUserId, targetUserId)
  return { token, target }
}
