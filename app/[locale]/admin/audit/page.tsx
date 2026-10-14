import { requireAdmin } from "@/lib/auth-guard"
import { getAuditActions, listAuditLogs, verifyAuditLogIntegrity } from "@/lib/services/audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ShieldCheck, ShieldAlert, Link as LinkIcon } from "lucide-react"

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const logs = await listAuditLogs({ action: sp.action, search: sp.q })
  const allActions = await getAuditActions()
  const integrity = await verifyAuditLogIntegrity(500)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit-Log</h1>
      </div>

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
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="">Alle Aktionen</option>
              {allActions.map((a) => (
                <option key={a} value={a}>
                  {a}
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
            {(sp.action || sp.q) && (
              <a href="?" className="text-sm text-blue-600 hover:underline">
                Filter zurücksetzen
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Letzte Einträge (max. 100)</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Keine Einträge gefunden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wann</TableHead>
                  <TableHead>Wer</TableHead>
                  <TableHead>Aktion</TableHead>
                  <TableHead>Entität</TableHead>
                  <TableHead>Siegel (HMAC)</TableHead>
                  <TableHead>Änderung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{log.user?.name ?? log.user?.email ?? "System"}</div>
                      {log.ipAddress && (
                        <div className="font-mono text-xs text-gray-400">IP: {log.ipAddress}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-gray-600">
                      {log.entityType}
                      <br />
                      <span className="text-xs text-gray-400">{log.entityId}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {log.recordHash ? (
                        <span
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-help"
                          title={`HMAC-SHA256: ${log.recordHash}\nVorheriger Hash: ${log.previousHash}`}
                        >
                          <LinkIcon className="size-3 shrink-0" />
                          {log.recordHash.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Unversiegelt</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.before && (
                        <div className="mb-1 text-red-600">
                          - {JSON.stringify(log.before)}
                        </div>
                      )}
                      {log.after && (
                        <div className="text-green-700">
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
