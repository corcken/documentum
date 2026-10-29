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
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Trash, RotateCcw, Download, Search, File as FileIcon } from "lucide-react"

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

export default async function MediathekPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; type?: string; error?: string }>
}) {
  const session = await requireUser()
  const userId = session.user.id!
  const userRole = session.user.role!
  const sp = await searchParams
  const tab = sp.tab || "active"
  const q = sp.q || ""
  const typeFilter = sp.type || ""

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
    destroyedAt: null,
  }

  if (tab === "global") {
    if (userRole === "VIEWER") {
      redirect("/mediathek")
    }
    whereClause.isGlobal = true
    whereClause.trashedAt = null
  } else if (tab === "trash") {
    if (userRole === "ADMIN") {
      whereClause.OR = [{ ownerId: userId }, { isGlobal: true }]
    } else {
      whereClause.ownerId = userId
    }
    whereClause.trashedAt = { not: null }
  } else {
    whereClause.ownerId = userId
    whereClause.trashedAt = null
  }

  if (q) {
    whereClause.originalName = { contains: q }
  }

  if (typeFilter === "image") {
    whereClause.mimeType = { startsWith: "image/" }
  } else if (typeFilter === "pdf") {
    whereClause.mimeType = "application/pdf"
  } else if (typeFilter === "office") {
    whereClause.mimeType = { startsWith: "application/vnd.openxmlformats" }
  } else if (typeFilter === "text") {
    whereClause.mimeType = { startsWith: "text/" }
  }

  const assets = await prisma.fileAsset.findMany({
    where: whereClause,
    include: {
      variants: {
        where: { variant: "thumb" },
      },
      _count: {
        select: { uses: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mediathek"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="?tab=active"
              className={`rounded-md px-4 py-2 text-sm ${
                tab === "active"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Aktive Dateien
            </Link>
            {(userRole === "ADMIN" || userRole === "EDITOR") && (
              <Link
                href="?tab=global"
                className={`rounded-md px-4 py-2 text-sm ${
                  tab === "global"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                Globale Dokumente
              </Link>
            )}
            <Link
              href="?tab=trash"
              className={`rounded-md px-4 py-2 text-sm ${
                tab === "trash"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Papierkorb
            </Link>
          </div>
        }
      />

      {sp.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{sp.error}</div>
      )}

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form method="GET" className="flex flex-wrap items-center gap-2 flex-1">
            <input type="hidden" name="tab" value={tab} />
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="q"
                placeholder="Dateiname suchen..."
                className="pl-8"
                defaultValue={q}
              />
            </div>
            <select
              name="type"
              defaultValue={typeFilter}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Alle Dateitypen</option>
              <option value="image">Bilder (JPG, PNG, WebP)</option>
              <option value="pdf">PDF-Dokumente</option>
              <option value="office">Office (DOCX, XLSX)</option>
              <option value="text">Text / CSV</option>
            </select>
            <Button type="submit" variant="secondary">
              Suchen
            </Button>
          </form>

          {(tab === "active" || tab === "global") && (
            <MediathekUploadForm isGlobal={tab === "global"} />
          )}
        </CardContent>
      </Card>

      {assets.length === 0 ? (
        <EmptyState
          message="Keine Dateien gefunden."
          icon={FileIcon}
          className="rounded-lg border border-border bg-card py-12"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => {
            const isImage = asset.mimeType.startsWith("image/")
            const thumbUrl =
              isImage && asset.variants.length > 0
                ? `/api/files/${asset.variants[0].storageKey}`
                : null
            const inUse = asset._count.uses > 0
            const canDeleteOrRestore = asset.ownerId === userId || userRole === "ADMIN"

            let daysLeft = 0
            if (asset.trashedAt) {
              const diffTime = Math.abs(new Date().getTime() - asset.trashedAt.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              daysLeft = Math.max(0, 30 - diffDays)
            }

            return (
              <Card key={asset.id} className="overflow-hidden flex flex-col">
                <div className="relative flex h-40 items-center justify-center border-b border-border bg-muted">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={asset.originalName} className="h-full w-full object-cover" />
                  ) : (
                    <FileIcon className="size-16 text-muted-foreground/50" />
                  )}
                  {inUse && (
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                      In Verwendung ({asset._count.uses})
                    </Badge>
                  )}
                  {asset.isGlobal && (
                    <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
                      Global
                    </Badge>
                  )}
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm truncate" title={asset.originalName}>
                    {asset.originalName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-1 flex-1">
                  <div className="flex justify-between">
                    <span>Größe:</span>
                    <span>{formatSize(asset.size)}</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span>Typ:</span>
                    <span className="truncate ml-2" title={asset.mimeType}>
                      {asset.mimeType.split("/").pop()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Erstellt:</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString("de-DE")}</span>
                  </div>
                  <div className="truncate pt-2" title={asset.sha256}>
                    SHA256: <span className="font-mono">{asset.sha256.substring(0, 8)}...</span>
                  </div>
                  {asset.trashedAt && (
                    <div className="mt-2 font-medium text-destructive">
                      Endgültige Löschung in {daysLeft} Tag(en)
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 border-t border-border bg-muted/50 flex gap-2 justify-between">
                  {tab !== "trash" ? (
                    <>
                      <a href={`/api/files/${asset.storageKey}`} target="_blank" className="flex-1">
                        <Button variant="secondary" className="w-full h-8 px-2" size="sm">
                          <Download className="size-3 mr-1" /> Download
                        </Button>
                      </a>
                      {canDeleteOrRestore && (
                        <form action={trashAction} className="flex-1">
                          <input type="hidden" name="assetId" value={asset.id} />
                          <Button
                            variant="destructive"
                            className="w-full h-8 px-2"
                            size="sm"
                            disabled={inUse}
                            title={inUse ? "Datei ist in Verwendung" : ""}
                          >
                            <Trash className="size-3 mr-1" /> Löschen
                          </Button>
                        </form>
                      )}
                    </>
                  ) : (
                    canDeleteOrRestore && (
                      <form action={restoreAction} className="w-full">
                        <input type="hidden" name="assetId" value={asset.id} />
                        <Button variant="outline" className="w-full h-8" size="sm">
                          <RotateCcw className="size-3 mr-1" /> Wiederherstellen
                        </Button>
                      </form>
                    )
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
