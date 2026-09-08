import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatVersion } from "@/lib/version"
import { AlertCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function PrueffaelligPage() {
  const session = await requireUser()
  const t = await getTranslations()
  
  const docs = await prisma.document.findMany({
    where: {
      versions: {
        some: {
          status: "Released",
          nextReviewDate: { lte: new Date() }
        }
      }
    },
    include: {
      type: true,
      owner: { select: { name: true, email: true } },
      versions: {
        where: { status: "Released" }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  const { canReadVersion } = await import("@/lib/services/document-helpers")
  
  const results = await Promise.all(
    docs.map(async (d) => {
      const v = d.versions[0]
      if (!v) return null
      const canRead = await canReadVersion(session.user.id!, v.id)
      return canRead ? { doc: d, currentVersion: v } : null
    })
  )

  const visibleDocs = results.filter((r): r is NonNullable<typeof r> => r !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertCircle className="size-6 text-red-600" />
          Prüffällige Dokumente
        </h1>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead>Eigentümer</TableHead>
              <TableHead>Fällig seit</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                  Aktuell keine Dokumente prüffällig.
                </TableCell>
              </TableRow>
            )}
            {visibleDocs.map(({ doc, currentVersion: v }) => (
              <TableRow key={doc.id}>
                <TableCell className="font-mono text-sm">{doc.documentNumber}</TableCell>
                <TableCell className="max-w-md truncate font-medium">
                  {v.title}
                  <span className="ml-2 text-xs text-gray-500">v{formatVersion(v.majorVersion, v.minorVersion)}</span>
                </TableCell>
                <TableCell>{doc.owner?.name ?? doc.owner?.email ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {v.nextReviewDate ? new Date(v.nextReviewDate).toLocaleDateString("de-DE") : "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/documents/${doc.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Dokument öffnen
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
