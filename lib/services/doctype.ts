import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"

export type DocumentTypeInput = {
  name: string
  requiresTraining: boolean
  defaultVisibility: string
  retentionMonths: number
}

export async function createDocumentType(input: DocumentTypeInput, userId: string) {
  const dt = await prisma.documentType.create({
    data: {
      name: input.name,
      requiresTraining: input.requiresTraining,
      defaultVisibility: input.defaultVisibility,
      retentionMonths: input.retentionMonths,
    },
  })
  await logAudit({
    userId,
    action: "CREATE",
    entityType: "DocumentType",
    entityId: dt.id,
    after: { 
      name: dt.name, 
      requiresTraining: dt.requiresTraining,
      defaultVisibility: dt.defaultVisibility,
      retentionMonths: dt.retentionMonths
    },
  })
  return dt
}

export async function updateDocumentType(id: string, input: DocumentTypeInput, userId: string) {
  const before = await prisma.documentType.findUnique({ where: { id } })
  if (!before) throw new Error("Dokumenttyp nicht gefunden")

  const dt = await prisma.documentType.update({
    where: { id },
    data: {
      name: input.name,
      requiresTraining: input.requiresTraining,
      defaultVisibility: input.defaultVisibility,
      retentionMonths: input.retentionMonths,
    },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "DocumentType",
    entityId: id,
    before: { 
      name: before.name, 
      requiresTraining: before.requiresTraining,
      defaultVisibility: before.defaultVisibility,
      retentionMonths: before.retentionMonths
    },
    after: { 
      name: dt.name, 
      requiresTraining: dt.requiresTraining,
      defaultVisibility: dt.defaultVisibility,
      retentionMonths: dt.retentionMonths
    },
  })
  return dt
}

export async function deleteDocumentType(
  id: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const docs = await prisma.document.count({ where: { typeId: id } })

  if (docs > 0) {
    return { ok: false, error: "Es existieren Dokumente dieses Typs — diese zuerst ändern oder archivieren." }
  }

  const dt = await prisma.documentType.findUnique({ where: { id } })
  await prisma.documentType.delete({ where: { id } })
  await logAudit({
    userId,
    action: "DELETE",
    entityType: "DocumentType",
    entityId: id,
    before: { name: dt?.name },
  })
  return { ok: true }
}
