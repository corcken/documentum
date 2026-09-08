import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"
import { logAudit } from "./audit"

export async function requestDestruction(versionId: string, comment: string, userId: string) {
  if (!comment || !comment.trim()) throw new Error("Kommentar ist Pflicht.")
  
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } })
  if (!version || version.status !== "Archived") throw new Error("Ungültige Version.")

  await prisma.destructionRequest.create({
    data: {
      documentVersionId: version.id,
      requestedById: userId,
      status: "PENDING",
      comment
    }
  })

  await logAudit({
    userId,
    action: "REQUEST_DESTRUCTION",
    entityType: "DocumentVersion",
    entityId: version.id,
  })
}

export async function confirmDestruction(requestId: string, userId: string) {
  const req = await prisma.destructionRequest.findUnique({
    where: { id: requestId },
    include: { documentVersion: { include: { fileAssetUses: { include: { fileAsset: true } } } } }
  })

  if (!req || (req.status !== "PENDING" && req.status !== "Pending")) {
    throw new Error("Ungültige Anforderung.")
  }
  if (req.requestedById === userId) {
    throw new Error("4-Augen-Prinzip: Anforderer darf nicht bestätigen.")
  }

  // 1. Physisch löschen (nur wenn es keine anderen Uses mehr gibt)
  const filesToWipe = []
  for (const use of req.documentVersion.fileAssetUses) {
    const otherUsesCount = await prisma.fileAssetUse.count({
      where: {
        fileAssetId: use.fileAssetId,
        documentVersionId: { not: req.documentVersionId }
      }
    })
    if (otherUsesCount === 0 && use.fileAsset.storageKey) {
      filesToWipe.push(use.fileAsset)
    }
  }

  const allVariantsToWipe = []
  for (const file of filesToWipe) {
    const variants = await prisma.fileAsset.findMany({ where: { parentId: file.id } })
    allVariantsToWipe.push(file, ...variants)
  }

  for (const file of allVariantsToWipe) {
    if (file.storageKey) {
      await storage.delete(file.storageKey)
    }
  }

  // 2. DB aktualisieren
  await prisma.$transaction([
    prisma.destructionRequest.update({
      where: { id: req.id },
      data: { status: "EXECUTED", confirmedById: userId }
    }),
    prisma.documentVersion.update({
      where: { id: req.documentVersionId },
      data: { status: "Destroyed", content: "[VERNICHTET]" }
    }),
    ...allVariantsToWipe.map(file => 
      prisma.fileAsset.update({
        where: { id: file.id },
        data: { destroyedAt: new Date() } // KEIN trashedAt, sonst putzt GC die DB-Zeile weg!
      })
    )
  ])

  await logAudit({
    userId,
    action: "CONFIRM_DESTRUCTION",
    entityType: "DocumentVersion",
    entityId: req.documentVersionId,
  })
}

export async function rejectDestruction(requestId: string, comment: string, userId: string) {
  if (!comment || !comment.trim()) throw new Error("Kommentar ist Pflicht.")

  const req = await prisma.destructionRequest.findUnique({
    where: { id: requestId },
  })

  if (!req || (req.status !== "PENDING" && req.status !== "Pending")) {
    throw new Error("Ungültige Anforderung.")
  }
  if (req.requestedById === userId) {
    throw new Error("4-Augen-Prinzip: Anforderer darf nicht selbst ablehnen.")
  }

  await prisma.destructionRequest.update({
    where: { id: req.id },
    data: {
      status: "REJECTED",
      confirmedById: userId,
      comment: `${req.comment ? req.comment + " | Ablehnung: " : ""}${comment.trim()}`,
    },
  })

  await logAudit({
    userId,
    action: "REJECT_DESTRUCTION",
    entityType: "DocumentVersion",
    entityId: req.documentVersionId,
    after: { status: "REJECTED", comment: comment.trim() },
  })
}

/** Zurückziehen einer freigegebenen Version (Archivierung / Withdrawn) */
export async function withdrawDocument(input: {
  documentId: string
  versionId: string
  userId: string
  userRole: string
  comment: string
}) {
  if (!input.comment.trim()) {
    throw new Error("Ein Kommentar ist Pflicht (Begründung für Rückzug).")
  }
  const v = await prisma.documentVersion.findUnique({
    where: { id: input.versionId },
    include: { document: true },
  })
  if (!v || v.status !== "Released") {
    throw new Error("Nur freigegebene Versionen können zurückgezogen werden.")
  }

  if (input.userRole !== "ADMIN" && v.document.ownerId !== input.userId) {
    throw new Error("Nur Administratoren oder der Dokument-Eigentümer können Dokumente zurückziehen.")
  }

  const docType = await prisma.documentType.findUnique({ where: { id: v.document.typeId! } })
  const retentionMonths = docType?.retentionMonths ?? null
  const retentionEndDate = retentionMonths
    ? new Date(new Date().setMonth(new Date().getMonth() + retentionMonths))
    : null

  const updated = await prisma.documentVersion.update({
    where: { id: v.id },
    data: { status: "Withdrawn", obsoleteDate: new Date(), retentionEndDate },
  })

  await logAudit({
    userId: input.userId,
    action: "WITHDRAW_DOCUMENT",
    entityType: "DocumentVersion",
    entityId: v.id,
    after: { status: "Withdrawn", comment: input.comment },
  })

  return updated
}
