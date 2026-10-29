import { prisma } from "@/lib/prisma"
import { canReadVersion } from "./document-helpers"

export type DocumentFilters = {
  search?: string
  typeId?: string
  status?: string
}

export type ListOptions = {
  /** true = auch Entwürfe (Ersteller/Prüfer/Genehmiger); false = nur freigegeben (Leser) */
  includeDrafts: boolean
}

export async function getLatestVersion(documentId: string) {
  return prisma.documentVersion.findFirst({
    where: { documentId },
    include: { document: true },
    orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
  })
}

/**
 * Liste aller Dokumente. Für Leser (includeDrafts=false) werden nur Dokumente
 * mit freigegebenem Stand geliefert; Entwürfe bleiben unsichtbar.
 */
export async function listDocuments(userId: string, filters: DocumentFilters = {}, opts: ListOptions) {
  const docs = await prisma.document.findMany({
    where: {
      ...(filters.typeId ? { typeId: filters.typeId } : {}),
      ...(!opts.includeDrafts ? { versions: { some: { status: "Released" } } } : {}),
    },
    include: {
      type: true,
      owner: { select: { id: true, name: true, email: true } },
      versions: { orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }] },
    },
    orderBy: { createdAt: "desc" },
  })

  const filtered = docs
    .map((d) => {
      const currentVersion = opts.includeDrafts
        ? (d.versions.find((v) => v.status === "Released") ?? d.versions[0] ?? null)
        : (d.versions.find((v) => v.status === "Released") ?? null)
      return { ...d, currentVersion }
    })
    .filter((d) => {
      if (!d.currentVersion) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const hitNumber = d.documentNumber.toLowerCase().includes(q)
        const hitTitle = d.currentVersion.title.toLowerCase().includes(q)
        if (!hitNumber && !hitTitle) return false
      }
      if (filters.status && d.currentVersion.status !== filters.status) return false
      return true
    })

  const results = await Promise.all(
    filtered.map(async (d) => {
      const canRead = await canReadVersion(userId, d.currentVersion!.id)
      return { doc: d, canRead }
    })
  )

  return results.filter((r) => r.canRead).map((r) => r.doc)
}

export async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      type: true,
      department: true,
      owner: { select: { id: true, name: true, email: true } },
      versions: {
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          workflowTasks: {
            orderBy: { createdAt: "asc" },
            include: { assignedTo: { select: { id: true, name: true, email: true } } },
          },
          scopeDepartments: { include: { department: true } },
          scopeJobRoles: { include: { jobRole: true } },
          fileAssetUses: {
            where: { role: "attachment" },
            include: { fileAsset: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
      },
    },
  })
}
