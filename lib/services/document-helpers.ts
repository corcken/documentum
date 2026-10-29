import { getDepartmentAncestors } from "./org"
import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import bcrypt from "bcryptjs"

export async function verifyElectronicSignature({
  userId,
  versionId,
  password,
  signatureMeaning,
}: {
  userId: string
  versionId: string
  password?: string
  signatureMeaning?: string
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  })
  if (!user || !user.isActive) {
    throw new Error("Benutzer nicht gefunden oder inaktiv.")
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error("Ihr Konto ist vorübergehend gesperrt. Bitte versuchen Sie es in 15 Minuten erneut.")
  }

  const requiresPasswordCheck = password !== undefined || user.password.startsWith("$2")
  if (requiresPasswordCheck) {
    if (!password) {
      throw new Error(
        "Zur rechtsgültigen Freigabe (FDA 21 CFR Part 11) ist die Eingabe Ihres Passworts als elektronische Signatur erforderlich."
      )
    }

    const matches = await bcrypt.compare(password, user.password)
    if (!matches) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1
      const lockAccount = newAttempts >= 5
      const lockedUntil = lockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: lockAccount ? 0 : newAttempts, lockedUntil },
      })
      await logAudit({
        userId: user.id,
        action: lockAccount ? "ACCOUNT_LOCKED" : "SIGNATURE_VERIFICATION_FAILED",
        entityType: "DocumentVersion",
        entityId: versionId,
        after: { attempts: newAttempts, locked: lockAccount },
      })
      throw new Error(
        lockAccount
          ? "Konto wegen zu vieler Fehlversuche für 15 Minuten gesperrt."
          : "Das eingegebene Passwort zur elektronischen Signatur ist nicht korrekt."
      )
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    }
  }

  return {
    signerId: user.id,
    signerName: user.name ?? user.email,
    signerEmail: user.email,
    role: user.role?.name ?? "FREIGEBER",
    meaning:
      signatureMeaning ||
      "Ich habe das Dokument geprüft und gebe es hiermit gemäß QM-Vorgaben frei.",
    timestamp: new Date().toISOString(),
  }
}

/** Prüft die Zuweisung: Prüfer und Genehmiger müssen gesetzt, verschieden und nicht der Ersteller sein. */
export function assertAssignment(ownerId: string, reviewerId: string | undefined, approverId: string | undefined) {
  if (!reviewerId || !approverId) {
    throw new Error("Prüfer und Genehmiger müssen ausgewählt werden.")
  }
  if (reviewerId === approverId) {
    throw new Error("Prüfer und Genehmiger müssen verschiedene Personen sein (Vier-Augen-Prinzip).")
  }
  if (approverId === ownerId) {
    throw new Error("Der Ersteller darf nicht selbst freigeben.")
  }
}

export async function assertCanEditVersion(userId: string, versionId: string, allowReleased = false) {
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { role: true }
  })
  if (!user || !user.isActive) throw new Error("Benutzer nicht gefunden oder inaktiv.")
  if (user.role?.name === "VIEWER") throw new Error("Leser haben keine Schreibrechte.")

  const v = await prisma.documentVersion.findUnique({ 
    where: { id: versionId },
    include: { document: true }
  })
  if (!v) throw new Error("Version nicht gefunden.")

  if (allowReleased) {
    if (v.status !== "Draft" && v.status !== "Released") {
      throw new Error("Bearbeitungen sind nur im Entwurfs-Status (Draft) oder als neue Revision einer freigegebenen Version zulässig.")
    }
  } else if (v.status !== "Draft") {
    throw new Error("Bearbeitungen sind nur im Entwurfs-Status (Draft) zulässig.")
  }

  if (user?.role?.name === "ADMIN") return true
  
  if (
    v.createdById === userId ||
    v.reviewerId === userId ||
    v.approverId === userId ||
    v.document.ownerId === userId
  ) {
    return true
  }

  if (v.document.departmentId) {
    const hasRole = await prisma.departmentRoleAssignment.findFirst({
      where: {
        departmentId: v.document.departmentId,
        userId,
        role: "ERSTELLER",
      },
    })
    if (hasRole) return true
  }
  
  throw new Error("Keine Berechtigung, dieses Dokument zu bearbeiten.")
}

export async function buildVersionRelations(scopesFromId: string, attachmentsFromId: string, userId: string) {
  const scopesFrom = await prisma.documentVersion.findUnique({
    where: { id: scopesFromId },
    include: { scopeDepartments: true, scopeJobRoles: true }
  })
  const attachmentsFrom = await prisma.documentVersion.findUnique({
    where: { id: attachmentsFromId },
    include: { fileAssetUses: { where: { role: "attachment" } } }
  })

  return {
    scopeDepartments: {
      create: scopesFrom?.scopeDepartments.map(s => ({ departmentId: s.departmentId })) || []
    },
    scopeJobRoles: {
      create: scopesFrom?.scopeJobRoles.map(s => ({ jobRoleId: s.jobRoleId })) || []
    },
    fileAssetUses: {
      create: attachmentsFrom?.fileAssetUses.map(u => ({ fileAssetId: u.fileAssetId, role: u.role, createdById: userId })) || []
    }
  }
}


export async function canReadVersion(userId: string, versionId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { role: true }
  })
  if (!user || !user.isActive) return false

  const v = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { 
      document: true,
      scopeDepartments: true,
      scopeJobRoles: true,
      workflowTasks: { select: { assignedToId: true } },
    }
  })
  if (!v) return false

  // Externe Nutzer sehen keine zurückgezogenen oder vernichteten Fassungen
  if (user.isExternal && (v.status === "Withdrawn" || v.status === "Destroyed")) {
    return false
  }

  // 1. ADMIN → immer
  if (user.role?.name === "ADMIN") return true

  // 2. Beteiligte (inkl. zugewiesener WorkflowTasks & Bereichsrollen) → immer
  if (
    v.createdById === userId ||
    v.reviewerId === userId ||
    v.approverId === userId ||
    v.document.ownerId === userId ||
    v.workflowTasks.some((t) => t.assignedToId === userId)
  ) {
    return true
  }

  if (v.document.departmentId && !user.isExternal) {
    const deptRole = await prisma.departmentRoleAssignment.findFirst({
      where: {
        departmentId: v.document.departmentId,
        userId,
      },
      select: { id: true },
    })
    if (deptRole) return true
  }

  // 6. Withdrawn → für alle internen aktiven Benutzer (auch VIEWER) sichtbar (Q25)
  if (v.status === "Withdrawn") {
    return !user.isExternal && user.isActive
  }

  // Destroyed → nur Admin (bereits oben abgehandelt)
  if (v.status === "Destroyed") return false

  // 3. Status Draft/In_Review/In_Approval → sonst niemand
  if (v.status === "Draft" || v.status === "In_Review" || v.status === "In_Approval") return false

  // 5. Archived → nur Admin + Beteiligte
  if (v.status === "Archived") return false

  // 4. Released
  if (v.status === "Released") {
    // PUBLIC → interne aktive Benutzer
    if (v.visibility === "PUBLIC" && !user.isExternal && user.isActive) {
      return true
    }

    // SCOPED → Abteilungs- (expanded) / Rollen-Match
    // Oder wenn extern, dann greift nur Rollen-Match (isExternal check is implicit because they never hit PUBLIC)
    if (v.scopeJobRoles.some(r => r.jobRoleId === user.jobRoleId)) {
      return true
    }
    
    // Abteilungs-Match: Prüfe, ob die Abteilung des Users oder ein Vorfahre im Scope ist
    const userAncestors = await getDepartmentAncestors(user.departmentId)
    if (v.scopeDepartments.some(d => userAncestors.has(d.departmentId))) {
      return true
    }
  }

  return false
}

export function calculateNextDate(months: number | null): Date | null {
  if (!months) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

export async function getVersionLifecycleTimestamps(
  versionId: string,
  createdAt: Date
): Promise<Record<string, Date>> {
  const timestamps: Record<string, Date> = {}
  const logs = await prisma.auditLog.findMany({
    where: { entityId: versionId, entityType: "DocumentVersion" },
    orderBy: { createdAt: "asc" },
  })
  for (const log of logs) {
    if (log.action === "SAVE_DRAFT" && !timestamps["Draft"]) timestamps["Draft"] = log.createdAt
    if (log.action === "SUBMIT_FOR_REVIEW" && !timestamps["In_Review"]) timestamps["In_Review"] = log.createdAt
    if ((log.action === "APPROVE_REVIEW" || log.action === "TRANSITION_TO_APPROVAL") && !timestamps["In_Approval"]) {
      timestamps["In_Approval"] = log.createdAt
    }
    if (log.action === "APPROVE" && !timestamps["Released"]) timestamps["Released"] = log.createdAt
    if (log.action === "WITHDRAW_DOCUMENT" && !timestamps["Withdrawn"]) timestamps["Withdrawn"] = log.createdAt
  }
  if (!timestamps["Draft"]) timestamps["Draft"] = createdAt
  return timestamps
}
