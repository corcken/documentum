import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
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
      <PageHeader title="Prüffällige Dokumente" icon={AlertCircle} iconClassName="text-destructive" />

      <div className="rounded-lg border border-border bg-card">
        <Table className="w-full table-fixed min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18%]">Nummer</TableHead>
              <TableHead className="w-[38%]">Titel</TableHead>
              <TableHead className="w-[18%]">Eigentümer</TableHead>
              <TableHead className="w-[14%]">Fällig seit</TableHead>
              <TableHead className="w-[12%] text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aktuell keine Dokumente prüffällig.
                </TableCell>
              </TableRow>
            )}
            {visibleDocs.map(({ doc, currentVersion: v }) => (
              <TableRow key={doc.id}>
                <TableCell className="font-mono truncate">{doc.documentNumber}</TableCell>
                <TableCell className="truncate font-medium" title={v.title}>
                  <span>{v.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">v{formatVersion(v.majorVersion, v.minorVersion)}</span>
                </TableCell>
                <TableCell className="truncate">{doc.owner?.name ?? doc.owner?.email ?? "—"}</TableCell>
                <TableCell className="truncate">
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
