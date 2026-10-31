import { requireAdmin } from "@/lib/auth-guard"
import {
  countAuditLogs,
  getAuditActions,
  getAuditEntityTypes,
  listAuditLogs,
  verifyAuditLogIntegrity,
} from "@/lib/services/audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { ShieldCheck, ShieldAlert, Link as LinkIcon, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

const PAGE_SIZE = 100

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string; q?: string; page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10) || 1)
  const skip = (currentPage - 1) * PAGE_SIZE
  const filters = { action: sp.action, entityType: sp.entityType, search: sp.q }

  const [logs, totalCount, allActions, allEntityTypes, integrity] = await Promise.all([
    listAuditLogs(filters, PAGE_SIZE, skip),
    countAuditLogs(filters),
    getAuditActions(),
    getAuditEntityTypes(),
    verifyAuditLogIntegrity(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function buildPageHref(page: number) {
    const params = new URLSearchParams()
    if (sp.action) params.set("action", sp.action)
    if (sp.entityType) params.set("entityType", sp.entityType)
    if (sp.q) params.set("q", sp.q)
    if (page > 1) params.set("page", String(page))
    const qs = params.toString()
    return qs ? `?${qs}` : "?"
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit-Log" icon={ShieldCheck} />

      {integrity.valid ? (
        <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                    Kryptographische Integrität bestätigt (HMAC-SHA256 Hash-Chain)
                  </h2>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-100/50 dark:border-emerald-700 dark:text-emerald-300 text-xs">
                    GAMP 5 / FDA 21 CFR Part 11 konform
                  </Badge>
                </div>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90">
                  {integrity.totalChecked} Einträge wurden lückenlos und mathematisch unverändert verifiziert.
                  Jeder Eintrag ist kryptographisch mit dem Hash seines Vorgängers versiegelt. Nachträgliche Manipulationen oder Zeilenlöschungen auf Datenbankebene sind ausgeschlossen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-red-950 dark:text-red-200">
                  Achtung: Audit-Trail Integritätsverletzung erkannt!
                </h2>
                <p className="text-xs text-red-800 dark:text-red-300">
                  {integrity.reason}
                </p>
                {integrity.brokenAtId && (
                  <p className="font-mono text-xs text-red-700 dark:text-red-400">
                    Betroffener Datensatz: ID {integrity.brokenAtId} (Aktion: {integrity.brokenAtAction})
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-center gap-3">
            <select
              name="action"
              defaultValue={sp.action || ""}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Alle Aktionen</option>
              {allActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              name="entityType"
              defaultValue={sp.entityType || ""}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Alle Entitätstypen</option>
              {allEntityTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
            <Input
              type="search"
              name="q"
              placeholder="Suchen nach Entität, Benutzer…"
              defaultValue={sp.q || ""}
              className="w-full max-w-xs"
            />
            <Button type="submit" variant="secondary" size="sm">
              Filtern
            </Button>
            {(sp.action || sp.entityType || sp.q) && (
              <a href="?" className="text-sm text-primary hover:underline">
                Filter zurücksetzen
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">
            Einträge ({totalCount} gesamt · Seite {currentPage} von {totalPages})
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link href={buildPageHref(currentPage - 1)}>
                  <Button variant="outline" size="sm" type="button">
                    <ChevronLeft className="mr-1 size-4" />
                    Vorherige
                  </Button>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={buildPageHref(currentPage + 1)}>
                  <Button variant="outline" size="sm" type="button">
                    Nächste
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Keine Einträge gefunden.</p>
          ) : (
            <Table className="w-full table-fixed min-w-[850px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[13%]">Wann</TableHead>
                  <TableHead className="w-[16%]">Wer</TableHead>
                  <TableHead className="w-[14%]">Aktion</TableHead>
                  <TableHead className="w-[15%]">Entität</TableHead>
                  <TableHead className="w-[12%]">Siegel (HMAC)</TableHead>
                  <TableHead className="w-[30%]">Änderung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground truncate">
                      {new Date(log.createdAt).toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell className="text-sm truncate">
                      <div className="truncate" title={log.user?.name ?? log.user?.email ?? "System"}>
                        {log.user?.name ?? log.user?.email ?? "System"}
                      </div>
                      {log.ipAddress && (
                        <div className="font-mono text-xs text-muted-foreground truncate">IP: {log.ipAddress}</div>
                      )}
                    </TableCell>
                    <TableCell className="truncate">
                      <Badge variant="outline" className="truncate">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-normal break-all">
                      <div>{log.entityType}</div>
                      <span className="text-[11px] text-muted-foreground/70">{log.entityId}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate">
                      {log.recordHash ? (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-help"
                          title={`HMAC-SHA256: ${log.recordHash}\nVorheriger Hash: ${log.previousHash}`}
                        >
                          <LinkIcon className="size-3 shrink-0" />
                          {log.recordHash.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Unversiegelt</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono whitespace-normal break-all">
                      {log.before && (
                        <div className="mb-1 text-destructive">
                          - {JSON.stringify(log.before)}
                        </div>
                      )}
                      {log.after && (
                        <div className="text-emerald-700 dark:text-emerald-400">
                          + {JSON.stringify(log.after)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
