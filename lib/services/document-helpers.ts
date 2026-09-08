import { getDepartmentAncestors } from "./org"
import { prisma } from "@/lib/prisma"

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

export async function assertCanEditVersion(userId: string, versionId: string) {
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { role: true }
  })
  if (user?.role?.name === "VIEWER") throw new Error("Leser haben keine Schreibrechte.")

  const v = await prisma.documentVersion.findUnique({ 
    where: { id: versionId },
    include: { document: true }
  })
  if (!v) throw new Error("Version nicht gefunden.")

  if (user?.role?.name === "ADMIN") return true
  
  if (
    v.createdById === userId ||
    v.reviewerId === userId ||
    v.approverId === userId ||
    v.document.ownerId === userId
  ) {
    return true
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
  if (!user) return false

  const v = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { 
      document: true,
      scopeDepartments: true,
      scopeJobRoles: true
    }
  })
  if (!v) return false

  // 1. ADMIN → immer
  if (user.role?.name === "ADMIN") return true

  // 2. Beteiligte → immer
  if (
    v.createdById === userId ||
    v.reviewerId === userId ||
    v.approverId === userId ||
    v.document.ownerId === userId
  ) {
    return true
  }

  // 6. Withdrawn/Destroyed → nur Admin (Audit-Sicht) - da Admin oben abgefangen wurde, hier false
  // (Beteiligte der alten Fassung sehen es über Regel 2: Historie)
  if (v.status === "Withdrawn" || v.status === "Destroyed") return false

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
