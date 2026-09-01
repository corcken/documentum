import { requireUser } from "@/lib/auth-guard"
import Link from "next/link"
import { listDocuments } from "@/lib/services/document"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_STYLES } from "@/lib/constants"
import { formatVersion } from "@/lib/version"
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
    { search: sp.q, typeId: sp.type, status: sp.status },
    { includeDrafts: !isViewer }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dokumente</h1>
        {!isViewer && (
          <Link href="/documents/neu" className={buttonVariants({ size: "default" })}>
            <Plus className="size-4" /> Neues Dokument
          </Link>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-gray-400" />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Suchen…"
            className="h-9 w-56 rounded-lg border border-input bg-white pr-3 pl-8 text-sm"
          />
        </div>
        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm"
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
            className="h-9 rounded-lg border border-input bg-white px-3 text-sm"
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

      <div className="rounded-lg border bg-white">
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
                <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                  Keine Dokumente gefunden.
                </TableCell>
              </TableRow>
            )}
            {documents.map((d) => {
              const v = d.currentVersion
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm">{d.documentNumber}</TableCell>
                  <TableCell className="max-w-md truncate">{v?.title ?? "—"}</TableCell>
                  <TableCell>{d.type?.name ?? "—"}</TableCell>
                  <TableCell>
                    {v ? formatVersion(v.majorVersion, v.minorVersion) : "—"}
                  </TableCell>
                  <TableCell>
                    {v && (
                      <Badge className={DOCUMENT_STATUS_STYLES[v.status] ?? ""}>
                        {DOCUMENT_STATUS_LABELS[v.status] ?? v.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
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
