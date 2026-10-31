import Link from "next/link"
import { requireAdmin } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import { DESTRUCTION_REQUEST_STATUS_STYLES } from "@/lib/constants"
import { formatVersion } from "@/lib/version"
import { Trash2 } from "lucide-react"
import { requestDestructionAction, confirmDestructionAction, rejectDestructionAction } from "./actions"
import { Button } from "@/components/ui/button"

export default async function ArchivPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>
}) {
  const session = await requireAdmin()
  const sp = await searchParams
  const tab = sp.tab === "retention" ? "retention" : "due"
  const now = new Date()

  const whereClause =
    tab === "retention"
      ? {
          status: { in: ["Archived" as const, "Withdrawn" as const] },
          OR: [{ retentionEndDate: { gt: now } }, { retentionEndDate: null }],
        }
      : {
          OR: [
            {
              status: { in: ["Archived" as const, "Withdrawn" as const] },
              retentionEndDate: { lte: now },
            },
            { status: "Destroyed" as const },
            {
              status: { in: ["Archived" as const, "Withdrawn" as const] },
              destructionRequests: { some: { status: { in: ["PENDING", "Pending"] } } },
            },
          ],
        }

  const versions = await prisma.documentVersion.findMany({
    where: whereClause,
    include: {
      document: true,
      destructionRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { requestedBy: { select: { name: true, email: true } } },
      },
    },
    orderBy: { obsoleteDate: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archiv & Vernichtung"
        icon={Trash2}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="?tab=due"
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === "due"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Vernichtung fällig & Vernichtet
            </Link>
            <Link
              href="?tab=retention"
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === "retention"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Laufende Aufbewahrungsfrist
            </Link>
          </div>
        }
      />

      {sp.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{sp.error}</div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table className="w-full table-fixed min-w-[780px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32%]">Dokument</TableHead>
              <TableHead className="w-[9%]">Version</TableHead>
              <TableHead className="w-[17%]">Ersetzt / Zurückgezogen am</TableHead>
              <TableHead className="w-[13%]">Frist-Ende</TableHead>
              <TableHead className="w-[13%]">Status</TableHead>
              <TableHead className="w-[16%] text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {tab === "retention"
                    ? "Keine archivierten Fassungen mit laufender Aufbewahrungsfrist."
                    : "Keine Dokumente zur Vernichtung anstehend."}
                </TableCell>
              </TableRow>
            )}
            {versions.map((v) => {
              const req = v.destructionRequests[0]
              const isPending = req?.status === "PENDING" || req?.status === "Pending"
              const canConfirm = isPending && req.requestedById !== session.user.id
              const isRetentionExpired = Boolean(v.retentionEndDate && v.retentionEndDate <= now)
              const canRequestDestruction =
                (v.status === "Archived" || v.status === "Withdrawn") &&
                !isPending &&
                isRetentionExpired

              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium truncate">
                    <div className="font-mono text-xs text-muted-foreground truncate">{v.document.documentNumber}</div>
                    <Link href={`/documents/${v.documentId}`} className="hover:underline truncate block" title={v.title}>
                      {v.title}
                    </Link>
                  </TableCell>
                  <TableCell className="truncate">v{formatVersion(v.majorVersion, v.minorVersion)}</TableCell>
                  <TableCell className="truncate">
                    {v.obsoleteDate ? new Date(v.obsoleteDate).toLocaleDateString("de-DE") : "—"}
                  </TableCell>
                  <TableCell className="truncate">
                    {v.retentionEndDate ? (
                      <span className={isRetentionExpired ? "text-destructive font-medium" : ""}>
                        {new Date(v.retentionEndDate).toLocaleDateString("de-DE")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={v.status} />
                      {v.status !== "Destroyed" && (
                        <>
                          {isPending ? (
                            <Badge variant="outline" className={DESTRUCTION_REQUEST_STATUS_STYLES.Pending}>
                              4-Augen-Freigabe
                            </Badge>
                          ) : req?.status === "REJECTED" ? (
                            <Badge variant="outline" className={DESTRUCTION_REQUEST_STATUS_STYLES.REJECTED}>
                              Antrag abgelehnt
                            </Badge>
                          ) : isRetentionExpired ? (
                            <Badge variant="destructive">Vernichtung fällig</Badge>
                          ) : null}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-normal">
                    {canRequestDestruction && (
                      <form action={requestDestructionAction} className="flex flex-col gap-2 items-end">
                        <input type="hidden" name="versionId" value={v.id} />
                        <textarea
                          name="comment"
                          required
                          placeholder="Begründung (Pflicht)"
                          className="w-full max-w-xs rounded-md border border-border bg-background p-1 text-xs"
                        />
                        <Button type="submit" variant="destructive" size="sm">
                          Vernichtung anfordern
                        </Button>
                      </form>
                    )}
                    {(v.status === "Archived" || v.status === "Withdrawn") && isPending && (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Angefordert von {req.requestedBy?.name || req.requestedBy?.email}
                        </span>
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
                                className="w-44 rounded-md border border-border bg-background p-1 text-xs"
                              />
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                className="border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                              >
                                Ablehnen
                              </Button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Wartet auf 2. Person
                          </span>
                        )}
                      </div>
                    )}
                    {!canRequestDestruction && !isPending && v.status !== "Destroyed" && (
                      <span className="text-xs text-muted-foreground">Aufbewahrung läuft</span>
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
