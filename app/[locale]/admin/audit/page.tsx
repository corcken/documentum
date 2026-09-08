import { requireAdmin } from "@/lib/auth-guard"
import { getAuditActions, listAuditLogs } from "@/lib/services/audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const logs = await listAuditLogs({ action: sp.action, search: sp.q })
  const allActions = await getAuditActions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit-Log</h1>
      </div>

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
                      {log.user?.name ?? log.user?.email ?? "System"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-gray-600">
                      {log.entityType}
                      <br />
                      <span className="text-xs text-gray-400">{log.entityId}</span>
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
