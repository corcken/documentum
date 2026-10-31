import { requireUser } from "@/lib/auth-guard"
import Link from "next/link"
import { listMyTasks } from "@/lib/services/tasks"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { formatVersion } from "@/lib/version"
import { ClipboardCheck, Eye } from "lucide-react"
import { getUserAvatars } from "@/lib/services/avatar"
import { UserAvatar } from "@/components/user-avatar"

const TASK_LABELS: Record<string, string> = {
  Review: "Prüfung",
  Approval: "Freigabe",
}

export default async function AufgabenPage() {
  const session = await requireUser()
  const tasks = await listMyTasks(session.user.id!)
  const creatorIds = tasks.map((t) => t.documentVersion.createdBy?.id).filter(Boolean) as string[]
  const avatarMap = await getUserAvatars(creatorIds)

  return (
    <div className="space-y-6">
      <PageHeader title="Meine Aufgaben" icon={ClipboardCheck} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Offene Aufgaben ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Keine offenen Aufgaben — alles erledigt. 🎉
            </p>
          ) : (
            <Table className="w-full table-fixed min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[12%]">Art</TableHead>
                  <TableHead className="w-[15%]">Dokument</TableHead>
                  <TableHead className="w-[35%]">Titel</TableHead>
                  <TableHead className="w-[10%]">Version</TableHead>
                  <TableHead className="w-[18%]">Eingereicht von</TableHead>
                  <TableHead className="w-[10%] text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => {
                  const v = t.documentVersion
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="truncate">
                        <Badge variant={t.taskType === "Approval" ? "secondary" : "outline"}>
                          {TASK_LABELS[t.taskType] ?? t.taskType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono truncate">
                        {v.document.documentNumber}
                      </TableCell>
                      <TableCell className="truncate" title={v.title}>
                        {v.title}
                      </TableCell>
                      <TableCell className="font-mono truncate">
                        {formatVersion(v.majorVersion, v.minorVersion)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <UserAvatar
                            name={v.createdBy?.name}
                            email={v.createdBy?.email}
                            storageKey={v.createdBy?.id ? avatarMap.get(v.createdBy.id) : null}
                            size="sm"
                          />
                          <span className="truncate">{v.createdBy?.name ?? v.createdBy?.email ?? "—"}</span>
                        </div>
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
