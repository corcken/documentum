import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"
import { logAudit } from "./audit"
import crypto from "crypto"
import sharp from "sharp"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "text/csv",
  "text/plain",
]

/**
 * Überprüft den Dateiinhalt (Magic Bytes) für bekannte Typen.
 * Verhindert das Hochladen gefälschter Endungen.
 */
function verifyMagicBytes(buffer: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mime === "image/png") {
    return buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a
  }
  if (mime === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"
  }
  if (mime === "application/pdf") {
    return buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF"
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    // ZIP magic bytes (docx/xlsx)
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04
  }
  if (mime === "text/csv" || mime === "text/plain") {
    // Text-Dateien haben keine eindeutigen Magic Bytes. Wir prüfen grob, ob Null-Bytes vorhanden sind (deutet auf Binary hin).
    // Dies ist eine einfache Heuristik. Für den Prototyp ausreichend.
    const sample = buffer.slice(0, 1024)
    return !sample.includes(0x00)
  }
  return false
}

export async function uploadFile(
  file: File,
  userId: string,
  isGlobal?: boolean
) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Datei ist zu groß (Maximal 10 MB).")
  }
  if (!ALLOWED_MIMES.includes(file.type)) {
    throw new Error(`Dateityp ${file.type} wird nicht unterstützt.`)
  }

  const arrayBuffer = await file.arrayBuffer()
  let buffer = Buffer.from(arrayBuffer)

  if (!verifyMagicBytes(buffer, file.type)) {
    throw new Error("Datei-Inhalt entspricht nicht dem angegebenen Typ (Magic Bytes Prüfung fehlgeschlagen).")
  }

  let width: number | null = null
  let height: number | null = null
  let isImage = file.type.startsWith("image/")

  let previewBuffer: Buffer | null = null
  let thumbBuffer: Buffer | null = null
  let previewWidth: number | null = null
  let previewHeight: number | null = null
  let thumbWidth: number | null = null
  let thumbHeight: number | null = null

  // Wenn es ein Bild ist: EXIF-Daten entfernen und Varianten erzeugen
  if (isImage) {
    const s = sharp(buffer)
    const meta = await s.metadata()
    width = meta.width ?? null
    height = meta.height ?? null
    
    // EXIF entfernen durch Neu-Rendern des Originals
    buffer = await s.clone().toBuffer()

    // Vorschau (Preview) - max 1600px, WebP
    previewBuffer = await sharp(buffer).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp().toBuffer()
    const pMeta = await sharp(previewBuffer).metadata()
    previewWidth = pMeta.width ?? null
    previewHeight = pMeta.height ?? null

    // Thumbnail (Thumb) - max 200px, WebP
    thumbBuffer = await sharp(buffer).resize({ width: 200, height: 200, fit: "inside", withoutEnlargement: true }).webp().toBuffer()
    const tMeta = await sharp(thumbBuffer).metadata()
    thumbWidth = tMeta.width ?? null
    thumbHeight = tMeta.height ?? null
  }

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")
  const storageKey = crypto.randomBytes(16).toString("hex")

  await storage.put(storageKey, buffer)

  const asset = await prisma.fileAsset.create({
    data: {
      ownerId: userId,
      originalName: file.name,
      mimeType: file.type,
      size: buffer.length,
      storageKey,
      sha256,
      width,
      height,
      variant: "original",
      isGlobal: isGlobal ?? false,
    },
  })

  // Speichere Varianten, falls vorhanden
  if (previewBuffer && thumbBuffer) {
    const pKey = crypto.randomBytes(16).toString("hex")
    const pHash = crypto.createHash("sha256").update(previewBuffer).digest("hex")
    await storage.put(pKey, previewBuffer)
    await prisma.fileAsset.create({
      data: {
        ownerId: userId,
        originalName: file.name,
        mimeType: "image/webp",
        size: previewBuffer.length,
        storageKey: pKey,
        sha256: pHash,
        width: previewWidth,
        height: previewHeight,
        variant: "preview",
        isGlobal: isGlobal ?? false,
        parentId: asset.id,
      },
    })

    const tKey = crypto.randomBytes(16).toString("hex")
    const tHash = crypto.createHash("sha256").update(thumbBuffer).digest("hex")
    await storage.put(tKey, thumbBuffer)
    await prisma.fileAsset.create({
      data: {
        ownerId: userId,
        originalName: file.name,
        mimeType: "image/webp",
        size: thumbBuffer.length,
        storageKey: tKey,
        sha256: tHash,
        width: thumbWidth,
        height: thumbHeight,
        variant: "thumb",
        isGlobal: isGlobal ?? false,
        parentId: asset.id,
      },
    })
  }

  await logAudit({
    userId,
    action: "UPLOAD_FILE",
    entityType: "FileAsset",
    entityId: asset.id,
    after: { originalName: file.name, mimeType: file.type, size: buffer.length },
  })

  return asset
}

export async function trashFile(assetId: string, userId: string,
  isGlobal?: boolean) {
  const asset = await prisma.fileAsset.findUnique({ where: { id: assetId } })
  if (!asset) throw new Error("Datei nicht gefunden.")
  if (asset.ownerId !== userId) throw new Error("Keine Berechtigung (nur Besitzer können löschen).")

  const activeUses = await prisma.fileAssetUse.count({ where: { fileAssetId: assetId } })
  if (activeUses > 0) {
    throw new Error("Datei wird noch verwendet (Bindungen existieren). Sie kann nicht gelöscht werden.")
  }

  const trashed = await prisma.fileAsset.update({
    where: { id: assetId },
    data: { trashedAt: new Date() },
  })
  
  await prisma.fileAsset.updateMany({
    where: { parentId: assetId },
    data: { trashedAt: new Date() }
  })

  await logAudit({
    userId,
    action: "TRASH_FILE",
    entityType: "FileAsset",
    entityId: asset.id,
  })

  return trashed
}

export async function restoreFile(assetId: string, userId: string,
  isGlobal?: boolean) {
  const asset = await prisma.fileAsset.findUnique({ where: { id: assetId } })
  if (!asset) throw new Error("Datei nicht gefunden.")
  if (asset.ownerId !== userId) throw new Error("Keine Berechtigung.")

  const restored = await prisma.fileAsset.update({
    where: { id: assetId },
    data: { trashedAt: null },
  })
  
  await prisma.fileAsset.updateMany({
    where: { parentId: assetId },
    data: { trashedAt: null }
  })

  await logAudit({
    userId,
    action: "RESTORE_FILE",
    entityType: "FileAsset",
    entityId: asset.id,
  })

  return restored
}

export async function cleanupTrashedFiles() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const toDelete = await prisma.fileAsset.findMany({
    where: {
      trashedAt: { not: null, lte: thirtyDaysAgo },
    },
  })

  let deletedCount = 0
  for (const asset of toDelete) {
    // Vergewissern, dass keine Bindungen existieren (sollte bei trashed so sein, aber sicherheitshalber)
    const uses = await prisma.fileAssetUse.count({ where: { fileAssetId: asset.id } })
    if (uses > 0) continue

    await storage.delete(asset.storageKey)
    await prisma.fileAsset.deleteMany({ where: { id: asset.id } })

    // System Audit
    await logAudit({
      userId: null,
      action: "CLEANUP_FILE",
      entityType: "FileAsset",
      entityId: asset.id,
      before: { originalName: asset.originalName, storageKey: asset.storageKey },
    })
    
    deletedCount++
  }

  return deletedCount
}

