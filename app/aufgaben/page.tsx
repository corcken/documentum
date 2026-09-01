import { requireUser } from "@/lib/auth-guard"
import Link from "next/link"
import { listMyTasks } from "@/lib/services/document"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatVersion } from "@/lib/version"
import { ClipboardCheck, Eye } from "lucide-react"

const TASK_LABELS: Record<string, string> = {
  Review: "Prüfung",
  Approval: "Freigabe",
}

export default async function AufgabenPage() {
  const session = await requireUser()
  const tasks = await listMyTasks(session.user.id!)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="size-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Meine Aufgaben</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Offene Aufgaben ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Keine offenen Aufgaben — alles erledigt. 🎉
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Art</TableHead>
                  <TableHead>Dokument</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Eingereicht von</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => {
                  const v = t.documentVersion
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant={t.taskType === "Approval" ? "secondary" : "outline"}>
                          {TASK_LABELS[t.taskType] ?? t.taskType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {v.document.documentNumber}
                      </TableCell>
                      <TableCell className="max-w-md truncate">{v.title}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatVersion(v.majorVersion, v.minorVersion)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {v.createdBy?.name ?? v.createdBy?.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/documents/${v.document.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Eye className="size-4" /> Bearbeiten
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
