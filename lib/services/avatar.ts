import { prisma } from "@/lib/prisma"
import { uploadFile, trashFile } from "./file"
import { logAudit } from "./audit"

/**
 * Avatar-Verwaltung für Benutzerkonten.
 * Bindung via FileAssetUse mit role="avatar".
 * 1:1 je Benutzer.
 */

export async function getUserAvatar(userId: string) {
  const use = await prisma.fileAssetUse.findFirst({
    where: { createdById: userId, role: "avatar" },
    include: {
      fileAsset: {
        include: {
          variants: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!use || !use.fileAsset || use.fileAsset.trashedAt || use.fileAsset.destroyedAt) {
    return null
  }

  const thumb = use.fileAsset.variants.find((v) => v.variant === "thumb")
  return {
    asset: use.fileAsset,
    storageKey: thumb ? thumb.storageKey : use.fileAsset.storageKey,
    originalKey: use.fileAsset.storageKey,
  }
}

export async function getUserAvatars(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, string>()

  const uses = await prisma.fileAssetUse.findMany({
    where: { createdById: { in: uniqueIds }, role: "avatar" },
    include: {
      fileAsset: {
        include: { variants: { where: { variant: "thumb" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const map = new Map<string, string>()
  for (const use of uses) {
    if (!map.has(use.createdById) && use.fileAsset && !use.fileAsset.trashedAt && !use.fileAsset.destroyedAt) {
      const thumb = use.fileAsset.variants[0]
      map.set(use.createdById, thumb ? thumb.storageKey : use.fileAsset.storageKey)
    }
  }
  return map
}

export async function setUserAvatar(userId: string, file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Für den Avatar sind nur JPG, PNG oder WebP erlaubt.")
  }

  // Upload durchführen (erzeugt WebP Preview & Thumb via Sharp)
  const asset = await uploadFile(file, userId)

  // Bisherige Avatar-Bindungen dieses Benutzers löschen
  const oldUses = await prisma.fileAssetUse.findMany({
    where: { createdById: userId, role: "avatar" },
  })

  for (const oldUse of oldUses) {
    await prisma.fileAssetUse.delete({ where: { id: oldUse.id } })
    const otherUses = await prisma.fileAssetUse.count({
      where: { fileAssetId: oldUse.fileAssetId },
    })
    if (otherUses === 0 && oldUse.fileAssetId !== asset.id) {
      try {
        await trashFile(oldUse.fileAssetId, userId)
      } catch {
        // Nicht blockierend
      }
    }
  }

  // Neue Avatar-Bindung anlegen
  await prisma.fileAssetUse.create({
    data: {
      fileAssetId: asset.id,
      role: "avatar",
      createdById: userId,
    },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "UserAvatar",
    entityId: userId,
    after: { fileAssetId: asset.id },
  })

  return asset
}

export async function removeUserAvatar(userId: string) {
  const oldUses = await prisma.fileAssetUse.findMany({
    where: { createdById: userId, role: "avatar" },
  })

  if (oldUses.length === 0) return

  for (const oldUse of oldUses) {
    await prisma.fileAssetUse.delete({ where: { id: oldUse.id } })
    const otherUses = await prisma.fileAssetUse.count({
      where: { fileAssetId: oldUse.fileAssetId },
    })
    if (otherUses === 0) {
      try {
        await trashFile(oldUse.fileAssetId, userId)
      } catch {
        // Nicht blockierend
      }
    }
  }

  await logAudit({
    userId,
    action: "DELETE",
    entityType: "UserAvatar",
    entityId: userId,
  })
}
