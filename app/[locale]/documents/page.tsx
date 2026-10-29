import { requireUser } from "@/lib/auth-guard"
import Link from "next/link"
import { listDocuments } from "@/lib/services/document"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants"
import { formatVersion } from "@/lib/version"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Plus, Search } from "lucide-react"

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>
}) {
  const session = await requireUser()
  const isViewer = session.user.role === "VIEWER"

  const sp = await searchParams
  const types = await prisma.documentType.findMany({ orderBy: { name: "asc" } })
  const documents = await listDocuments(
    session.user.id!,
    { search: sp.q, typeId: sp.type, status: sp.status },
    { includeDrafts: !isViewer }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dokumente"
        actions={
          !isViewer ? (
            <Link href="/documents/neu" className={buttonVariants()}>
              <Plus className="size-4" /> Neues Dokument
            </Link>
          ) : undefined
        }
      />

      <form method="get" className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Suchen…"
            className="h-9 w-56 rounded-lg border border-input bg-background pr-3 pl-8 text-sm"
          />
        </div>
        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">Alle Typen</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {!isViewer && (
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Alle Status</option>
            {Object.entries(DOCUMENT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className={buttonVariants({ variant: "outline", size: "default" })}>
          Filtern
        </button>
      </form>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gültig ab</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Keine Dokumente gefunden.
                </TableCell>
              </TableRow>
            )}
            {documents.map((d) => {
              const v = d.currentVersion
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-1.5">
                      <span>{d.documentNumber}</span>
                      {d.isTemplate && (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 px-1 py-0 text-[10px] text-primary">
                          Vorlage
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{v?.title ?? "—"}</TableCell>
                  <TableCell>{d.type?.name ?? "—"}</TableCell>
                  <TableCell>
                    {v ? formatVersion(v.majorVersion, v.minorVersion) : "—"}
                  </TableCell>
                  <TableCell>
                    {v && <StatusBadge status={v.status} />}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v?.effectiveDate ? new Date(v.effectiveDate).toLocaleDateString("de-DE") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/documents/${d.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Ansehen
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
