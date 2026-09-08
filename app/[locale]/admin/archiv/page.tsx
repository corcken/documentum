import { requireAdmin } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatVersion } from "@/lib/version"
import { Trash2 } from "lucide-react"
import { requestDestructionAction, confirmDestructionAction, rejectDestructionAction } from "./actions"
import { Button } from "@/components/ui/button"

export default async function ArchivPage() {
  const session = await requireAdmin()
  
  // Alle archivierten Versionen, deren Aufbewahrungsfrist abgelaufen ist ODER die bereits vernichtet sind
  const versions = await prisma.documentVersion.findMany({
    where: {
      OR: [
        { status: "Archived", retentionEndDate: { lte: new Date() } },
        { status: "Destroyed" },
        { status: "Archived", destructionRequests: { some: { status: { in: ["PENDING", "Pending"] } } } }
      ]
    },
    include: {
      document: true,
      destructionRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { requestedBy: { select: { name: true, email: true } } }
      }
    },
    orderBy: { obsoleteDate: "desc" }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="size-6 text-gray-700" />
          Archiv & Vernichtung
        </h1>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dokument</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Ersetzt am</TableHead>
              <TableHead>Frist-Ende</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                  Keine Dokumente zur Vernichtung anstehend.
                </TableCell>
              </TableRow>
            )}
            {versions.map((v) => {
              const req = v.destructionRequests[0]
              const isPending = req?.status === "PENDING" || req?.status === "Pending"
              const canConfirm = isPending && req.requestedById !== session.user.id

              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <div className="font-mono text-sm text-gray-500">{v.document.documentNumber}</div>
                    {v.title}
                  </TableCell>
                  <TableCell>v{formatVersion(v.majorVersion, v.minorVersion)}</TableCell>
                  <TableCell>{v.obsoleteDate ? new Date(v.obsoleteDate).toLocaleDateString("de-DE") : "—"}</TableCell>
                  <TableCell>
                    {v.retentionEndDate ? (
                      <span className={v.retentionEndDate <= new Date() ? "text-red-600 font-medium" : ""}>
                        {new Date(v.retentionEndDate).toLocaleDateString("de-DE")}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {v.status === "Destroyed" ? (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">Vernichtet</Badge>
                    ) : isPending ? (
                      <Badge className="bg-yellow-100 text-yellow-800">4-Augen-Freigabe</Badge>
                    ) : req?.status === "REJECTED" ? (
                      <Badge variant="outline" className="bg-red-100 text-red-800">Antrag abgelehnt</Badge>
                    ) : (
                      <Badge variant="destructive">Vernichtung fällig</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {v.status === "Archived" && !isPending && (
                      <form action={requestDestructionAction} className="flex flex-col gap-2 items-end">
                        <input type="hidden" name="versionId" value={v.id} />
                        <textarea name="comment" required placeholder="Begründung (Pflicht)" className="w-full text-xs p-1 border rounded" />
                        <Button type="submit" variant="destructive" size="sm">
                          Vernichtung anfordern
                        </Button>
                      </form>
                    )}
                    {v.status === "Archived" && isPending && (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs text-gray-500">Angefordert von {req.requestedBy?.name || req.requestedBy?.email}</span>
                        {canConfirm ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <form action={confirmDestructionAction}>
                              <input type="hidden" name="requestId" value={req.id} />
                              <Button type="submit" variant="destructive" size="sm">
                                Vernichtung bestätigen
                              </Button>
                            </form>
                            <form action={rejectDestructionAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="requestId" value={req.id} />
                              <input
                                type="text"
                                name="comment"
                                required
                                placeholder="Grund für Ablehnung (Pflicht)"
                                className="text-xs p-1 border rounded w-44"
                              />
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                              >
                                Ablehnen
                              </Button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">Wartet auf 2. Person</span>
                        )}
                      </div>
                    )}
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
