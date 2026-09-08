import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import { canReadVersion } from "./document-helpers"

/**
 * Prüft, ob ein Benutzer ein Dokument als Vorlage markieren oder die Markierung aufheben darf.
 * Vorgabe: Rolle ≠ VIEWER und (Owner des Dokuments oder ADMIN oder Beteiligter der Released-Version).
 */
export async function canManageDocumentTemplate(documentId: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  })
  if (!user || user.role?.name === "VIEWER") return false

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      versions: {
        orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
        take: 1,
      },
    },
  })
  if (!doc) return false

  const latest = doc.versions[0]
  if (!latest || latest.status !== "Released") return false

  if (user.role?.name === "ADMIN") return true
  if (doc.ownerId === userId) return true
  if (
    latest.createdById === userId ||
    latest.reviewerId === userId ||
    latest.approverId === userId
  ) {
    return true
  }

  return false
}

/**
 * Markiert ein freigegebenes Dokument als Vorlage.
 * Nur freigegebene Dokumente (aktuelle Version Released) können als Vorlage markiert werden.
 */
export async function markAsTemplate(documentId: string, userId: string) {
  const isAllowed = await canManageDocumentTemplate(documentId, userId)
  if (!isAllowed) {
    throw new Error("Nur freigegebene Dokumente können von Berechtigten als Vorlage markiert werden.")
  }

  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error("Dokument nicht gefunden.")

  if (doc.isTemplate) return doc

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { isTemplate: true },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "Document",
    entityId: documentId,
    before: { isTemplate: false },
    after: { isTemplate: true },
  })

  return updated
}

/**
 * Entfernt die Vorlagen-Markierung eines Dokuments.
 */
export async function unmarkAsTemplate(documentId: string, userId: string) {
  const isAllowed = await canManageDocumentTemplate(documentId, userId)
  if (!isAllowed) {
    throw new Error("Keine Berechtigung, die Vorlagen-Markierung zu entfernen.")
  }

  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error("Dokument nicht gefunden.")

  if (!doc.isTemplate) return doc

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { isTemplate: false },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "Document",
    entityId: documentId,
    before: { isTemplate: true },
    after: { isTemplate: false },
  })

  return updated
}

export type TemplateOption = {
  id: string
  documentNumber: string
  title: string
  version: string
  label: string
  typeId: string | null
  typeName?: string
  reviewIntervalMonths?: number | null
  visibility: string
  content: string
}

/**
 * Liefert alle Vorlagen, deren aktuelle Version Released ist und die für den Nutzer lesbar sind.
 */
export async function listAvailableTemplates(userId: string): Promise<TemplateOption[]> {
  const docs = await prisma.document.findMany({
    where: { isTemplate: true },
    include: {
      type: true,
      versions: {
        where: { status: "Released" },
        orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
        take: 1,
      },
    },
    orderBy: { documentNumber: "asc" },
  })

  const available: TemplateOption[] = []
  for (const doc of docs) {
    const latest = doc.versions[0]
    if (!latest) continue

    const canRead = await canReadVersion(userId, latest.id)
    if (!canRead) continue

    available.push({
      id: doc.id,
      documentNumber: doc.documentNumber,
      title: latest.title,
      version: `${latest.majorVersion}.${latest.minorVersion}`,
      label: `${doc.documentNumber} — ${latest.title} (v${latest.majorVersion}.${latest.minorVersion})`,
      typeId: doc.typeId,
      typeName: doc.type?.name,
      reviewIntervalMonths: doc.reviewIntervalMonths,
      visibility: latest.visibility,
      content: latest.content || "",
    })
  }

  return available
}

/**
 * Liest die Vorgabewerte einer Vorlage aus, sofern sie für den Nutzer lesbar ist.
 */
export async function getTemplateInitialData(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId, isTemplate: true },
    include: {
      versions: {
        where: { status: "Released" },
        orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
        take: 1,
      },
    },
  })
  if (!doc || doc.versions.length === 0) return null

  const latest = doc.versions[0]
  const canRead = await canReadVersion(userId, latest.id)
  if (!canRead) return null

  return {
    title: latest.title,
    content: latest.content || "",
    typeId: doc.typeId || "",
    reviewIntervalMonths: doc.reviewIntervalMonths ?? undefined,
    visibility: latest.visibility || "PUBLIC",
    sourceDocumentNumber: doc.documentNumber,
    sourceVersion: `${latest.majorVersion}.${latest.minorVersion}`,
  }
}
