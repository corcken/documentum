import { requireAdmin } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { JobRoleForm } from "@/components/job-role-form"
import { deleteJobRoleAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <h1 className="text-2xl font-bold">Job-Rollen</h1>

      {sp.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{sp.error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alle Job-Rollen</CardTitle>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Job-Rollen vorhanden.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {roles.map((r) => {
                  const isDeletable = r._count.users === 0 && r._count.scopedDocuments === 0
                  return (
                    <li key={r.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div>
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-gray-500">
                          {r.description || "Keine Beschreibung"} · {r._count.users} Benutzer · {r._count.scopedDocuments} Dokumenten-Geltungsbereiche
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`?edit=${r.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Bearbeiten
                        </Link>
                        {isDeletable && (
                          <form action={deleteJobRoleAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <button
                              type="submit"
                              className="text-gray-400 hover:text-red-600"
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
            <Link href="?" className="text-sm text-blue-600 hover:underline">
              Abbrechen / Neue anlegen
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
