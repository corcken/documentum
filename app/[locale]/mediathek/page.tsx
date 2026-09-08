import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { cleanupTrashedFiles } from "@/lib/services/file"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { redirect } from "next/navigation"
import { trashAction, restoreAction } from "./actions"
import { MediathekUploadForm } from "@/components/mediathek-upload-form"
import { Upload, Trash, RotateCcw, Download, Search, File as FileIcon, Image as ImageIcon } from "lucide-react"

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

export default async function MediathekPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>
}) {
  const session = await requireUser()
  const userId = session.user.id!
  const userRole = session.user.role!
  const sp = await searchParams
  const tab = sp.tab || "active"
  const q = sp.q || ""

  // Garbage Collection nur ausführen, wenn abgelaufene Dateien vorliegen
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const hasExpiredTrash = await prisma.fileAsset.findFirst({
    where: { trashedAt: { not: null, lte: thirtyDaysAgo } },
    select: { id: true },
  })
  if (hasExpiredTrash) {
    await cleanupTrashedFiles()
  }

  const whereClause: any = {
    variant: "original",
  }

  if (tab === "global") {
    if (userRole === "VIEWER") {
      redirect("/mediathek")
    }
    whereClause.isGlobal = true
    whereClause.trashedAt = null
  } else if (tab === "trash") {
    whereClause.ownerId = userId
    whereClause.trashedAt = { not: null }
  } else {
    whereClause.ownerId = userId
    whereClause.trashedAt = null
  }

  if (q) {
    whereClause.originalName = { contains: q } // SQLite is case-insensitive for contains
  }

  const assets = await prisma.fileAsset.findMany({
    where: whereClause,
    include: {
      variants: {
        where: { variant: "thumb" },
      },
      _count: {
        select: { uses: true }
      }
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mediathek</h1>
        <div className="flex items-center gap-2">
          <Link href="?tab=active" className={`px-4 py-2 text-sm rounded-md ${tab === "active" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            Aktive Dateien
          </Link>
          {(userRole === "ADMIN" || userRole === "EDITOR") && (
            <Link href="?tab=global" className={`px-4 py-2 text-sm rounded-md ${tab === "global" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              Globale Dokumente
            </Link>
          )}
          <Link href="?tab=trash" className={`px-4 py-2 text-sm rounded-md ${tab === "trash" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            Papierkorb
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form method="GET" className="flex items-center gap-2 flex-1">
            <input type="hidden" name="tab" value={tab} />
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                name="q"
                placeholder="Dateiname suchen..."
                className="pl-8"
                defaultValue={q}
              />
            </div>
            <Button type="submit" variant="secondary">Suchen</Button>
          </form>

          {(tab === "active" || tab === "global") && (
            <MediathekUploadForm isGlobal={tab === "global"} />
          )}
        </CardContent>
      </Card>

      {assets.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
          Keine Dateien gefunden.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => {
            const isImage = asset.mimeType.startsWith("image/")
            const thumbUrl = isImage && asset.variants.length > 0 ? `/api/files/${asset.variants[0].storageKey}` : null
            const inUse = asset._count.uses > 0

            let daysLeft = 0
            if (asset.trashedAt) {
              const diffTime = Math.abs(new Date().getTime() - asset.trashedAt.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              daysLeft = Math.max(0, 30 - diffDays)
            }

            return (
              <Card key={asset.id} className="overflow-hidden flex flex-col">
                <div className="h-40 bg-gray-100 flex items-center justify-center border-b relative">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={asset.originalName} className="object-cover w-full h-full" />
                  ) : (
                    <FileIcon className="size-16 text-gray-300" />
                  )}
                  {inUse && (
                    <Badge className="absolute top-2 right-2 bg-blue-500">In Verwendung ({asset._count.uses})</Badge>
                  )}
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm truncate" title={asset.originalName}>
                    {asset.originalName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-gray-500 space-y-1 flex-1">
                  <div className="flex justify-between">
                    <span>Größe:</span>
                    <span>{formatSize(asset.size)}</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span>Typ:</span>
                    <span className="truncate ml-2" title={asset.mimeType}>{asset.mimeType.split("/").pop()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Erstellt:</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString("de-DE")}</span>
                  </div>
                  <div className="truncate pt-2" title={asset.sha256}>
                    SHA256: <span className="font-mono">{asset.sha256.substring(0, 8)}...</span>
                  </div>
                  {asset.trashedAt && (
                    <div className="text-red-500 font-medium mt-2">
                      Endgültige Löschung in {daysLeft} Tag(en)
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 border-t bg-gray-50 flex gap-2 justify-between">
                  {tab === "active" ? (
                    <>
                      <a href={`/api/files/${asset.storageKey}`} target="_blank" className="flex-1">
                        <Button variant="secondary" className="w-full h-8 px-2" size="sm">
                          <Download className="size-3 mr-1" /> Download
                        </Button>
                      </a>
                      <form action={trashAction} className="flex-1">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <Button variant="destructive" className="w-full h-8 px-2" size="sm" disabled={inUse} title={inUse ? "Datei ist in Verwendung" : ""}>
                          <Trash className="size-3 mr-1" /> Löschen
                        </Button>
                      </form>
                    </>
                  ) : (
                    <form action={restoreAction} className="w-full">
                      <input type="hidden" name="assetId" value={asset.id} />
                      <Button variant="outline" className="w-full h-8" size="sm">
                        <RotateCcw className="size-3 mr-1" /> Wiederherstellen
                      </Button>
                    </form>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
