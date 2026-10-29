import { requireAdmin } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { JobRoleForm } from "@/components/job-role-form"
import { deleteJobRoleAction } from "./actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { Trash2 } from "lucide-react"
import Link from "next/link"

export default async function JobrollenPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  
  const roles = await prisma.jobRole.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, scopedDocuments: true } },
    },
  })

  const editUnit = sp.edit ? roles.find((r) => r.id === sp.edit) : null

  return (
    <div className="space-y-6">
      <PageHeader title="Job-Rollen" />

      {sp.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{sp.error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alle Job-Rollen</CardTitle>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Job-Rollen vorhanden.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {roles.map((r) => {
                  const isDeletable = r._count.users === 0 && r._count.scopedDocuments === 0
                  return (
                    <li key={r.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div>
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.description || "Keine Beschreibung"} · {r._count.users} Benutzer · {r._count.scopedDocuments} Dokumenten-Geltungsbereiche
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`?edit=${r.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Bearbeiten
                        </Link>
                        {isDeletable && (
                          <form action={deleteJobRoleAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <button
                              type="submit"
                              className="text-muted-foreground hover:text-destructive"
                              title="Löschen"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{editUnit ? "Bearbeiten" : "Neu anlegen"}</h2>
          <JobRoleForm role={editUnit || undefined} />
          {editUnit && (
            <Link href="?" className="text-sm text-primary hover:underline">
              Abbrechen / Neue anlegen
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
