import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import { assertCanEditVersion } from "./document-helpers"

export async function attachFileToVersion(assetId: string, versionId: string, userId: string) {
  const asset = await prisma.fileAsset.findUnique({ where: { id: assetId } })
  if (!asset) throw new Error("Datei nicht gefunden.")
  if (asset.ownerId !== userId) throw new Error("Nur eigene Dateien können angehängt werden.")

  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } })
  if (!version) throw new Error("Version nicht gefunden.")
  
  await assertCanEditVersion(userId, versionId)

  const use = await prisma.fileAssetUse.create({
    data: {
      fileAssetId: asset.id,
      documentVersionId: version.id,
      role: "attachment",
      createdById: userId,
    }
  })

  await logAudit({
    userId,
    action: "ATTACH_FILE",
    entityType: "FileAssetUse",
    entityId: use.id,
    after: { assetId, versionId, role: "attachment" }
  })

  return use
}

export async function detachFileFromVersion(useId: string, userId: string) {
  const use = await prisma.fileAssetUse.findUnique({ 
    where: { id: useId },
    include: { documentVersion: true }
  })
  if (!use || !use.documentVersionId) throw new Error("Bindung nicht gefunden.")
  
  await assertCanEditVersion(userId, use.documentVersionId)
  
  await prisma.fileAssetUse.delete({ where: { id: useId } })

  await logAudit({
    userId,
    action: "DETACH_FILE",
    entityType: "FileAssetUse",
    entityId: useId,
    before: { assetId: use.fileAssetId, versionId: use.documentVersionId }
  })

  return true
}
