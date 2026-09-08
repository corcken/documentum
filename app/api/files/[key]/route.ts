import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { key } = await params

  const asset = await prisma.fileAsset.findUnique({
    where: { storageKey: key },
    include: {
      uses: {
        include: {
          documentVersion: {
            include: {
              document: true
            }
          }
        }
      }
    }
  })

  if (!asset || asset.trashedAt) {
    return new NextResponse("Not Found", { status: 404 })
  }

  // Permission check
  const userId = session.user.id
  const userRole = session.user.role!
  let authorized = false

  // Wenn es eine Variante ist, prüfen wir die Berechtigung über das Original (parent)
  let targetAsset = asset
  if (asset.parentId) {
    const parent = await prisma.fileAsset.findUnique({
      where: { id: asset.parentId },
      include: {
        uses: {
          include: {
            documentVersion: {
              include: { document: true }
            }
          }
        }
      }
    })
    if (!parent || parent.trashedAt) {
      return new NextResponse("Not Found", { status: 404 })
    }
    targetAsset = parent
  }

  if (targetAsset.ownerId === userId) {
    authorized = true
  } else if (targetAsset.isGlobal && (userRole === "ADMIN" || userRole === "EDITOR")) {
    authorized = true
  } else {
    // Check uses on the target asset
    const { canReadVersion } = await import("@/lib/services/document-helpers")
    
    for (const use of targetAsset.uses) {
      if (use.role === "avatar") {
        authorized = true
        break
      }

      if (use.documentVersionId) {
        if (await canReadVersion(userId, use.documentVersionId)) {
          authorized = true
          break
        }
      }
    }
  }

  if (!authorized) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const buffer = await storage.get(key)
  if (!buffer) {
    return new NextResponse("File missing on disk", { status: 404 })
  }

  const isInline = asset.mimeType.startsWith("image/") || asset.mimeType === "application/pdf"
  const disposition = isInline ? "inline" : `attachment; filename="${encodeURIComponent(asset.originalName)}"`

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=86400",
    },
  })
}
