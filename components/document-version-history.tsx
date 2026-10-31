import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatVersion } from "@/lib/version"
import { restoreAction } from "@/app/[locale]/documents/actions"
import { StatusBadge } from "@/components/status-badge"
import { UserAvatar } from "@/components/user-avatar"

interface VersionHistoryProps {
  documentId: string
  currentVersionId?: string
  currentStatus?: string
  isViewer: boolean
  historyAsc: any[]
  avatarMap: Map<string, string>
}

export function DocumentVersionHistory({
  documentId,
  currentVersionId,
  currentStatus,
  isViewer,
  historyAsc,
  avatarMap,
}: VersionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Versionen</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="w-full table-fixed min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32%]">Version</TableHead>
              <TableHead className="w-[16%]">Status</TableHead>
              <TableHead className="w-[18%]">Erstellt</TableHead>
              <TableHead className="w-[18%]">Von</TableHead>
              <TableHead className="w-[16%] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyAsc.map((v, idx) => {
              const prev = idx > 0 ? historyAsc[idx - 1] : null
              const canRestore =
                !isViewer && currentStatus === "Draft" && v.id !== currentVersionId
              return (
                <TableRow key={v.id}>
                  <TableCell className="truncate">
                    <div className="font-mono">
                      {formatVersion(v.majorVersion, v.minorVersion)}
                    </div>
                    {v.changeReason && (
                      <div
                        className="mt-1 text-xs text-muted-foreground italic truncate block"
                        title={v.changeReason}
                      >
                        {v.changeReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="truncate">
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate">
                    {new Date(v.createdAt).toLocaleDateString("de-DE")}
                    {v.nextReviewDate && v.nextReviewDate <= new Date() && (
                      <Badge variant="destructive" className="ml-2">
                        Prüffällig
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <UserAvatar
                        name={v.createdBy?.name}
                        email={v.createdBy?.email}
                        storageKey={v.createdById ? avatarMap.get(v.createdById) : null}
                        size="sm"
                      />
                      <span className="truncate">{v.createdBy?.name ?? v.createdBy?.email ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!isViewer && prev && (
                        <Link
                          href={`/documents/${documentId}/diff?von=${prev.id}&bis=${v.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          Diff
                        </Link>
                      )}
                      {canRestore && (
                        <form action={restoreAction}>
                          <input type="hidden" name="documentId" value={documentId} />
                          <input type="hidden" name="sourceVersionId" value={v.id} />
                          <button
                            type="submit"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            Hierher zurückspringen
                          </button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
