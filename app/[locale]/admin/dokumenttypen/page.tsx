import { requireAdmin } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { DocumentTypeForm } from "@/components/document-type-form"
import { deleteDocumentTypeAction } from "./actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import Link from "next/link"

export default async function DocumentTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  
  const docTypes = await prisma.documentType.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { documents: true } },
    },
  })

  const editUnit = sp.edit ? docTypes.find((r) => r.id === sp.edit) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dokumenttypen</h1>

      {sp.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{sp.error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alle Dokumenttypen</CardTitle>
          </CardHeader>
          <CardContent>
            {docTypes.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Dokumenttypen vorhanden.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {docTypes.map((r) => {
                  const isDeletable = r._count.documents === 0
                  return (
                    <li key={r.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {r.name}
                          {r.requiresTraining && (
                            <Badge variant="outline" className="text-xs">Schulungspflichtig</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {r._count.documents} Dokumente
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
                          <form action={deleteDocumentTypeAction}>
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
          <DocumentTypeForm docType={editUnit || undefined} />
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
