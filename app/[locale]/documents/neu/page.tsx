import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { DocumentForm } from "@/components/document-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

import { listAvailableTemplates, getTemplateInitialData } from "@/lib/services/template"

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/")
  const userId = session.user.id!

  const sp = await searchParams
  const selectedTemplateId = sp.template || undefined

  const [types, departments, jobRoles, users, templates, initialValues] = await Promise.all([
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.jobRole.findMany({ orderBy: { name: "asc" } }),
    // Prüfer/Genehmiger: aktive Benutzer mit Schreibrechten (ADMIN/EDITOR)
    prisma.user.findMany({
      where: { isActive: true, role: { name: { in: ["ADMIN", "EDITOR"] } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    listAvailableTemplates(userId),
    selectedTemplateId ? getTemplateInitialData(selectedTemplateId, userId) : null,
  ])

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  })
  const isAdmin = currentUser?.role?.name === "ADMIN"

  const { getUserCreatorDepartmentIds } = await import("@/lib/services/department-roles")
  let creatorDepartments: { id: string; name: string }[] = []
  if (isAdmin) {
    creatorDepartments = departments
  } else {
    const creatorDeptIds = await getUserCreatorDepartmentIds(userId)
    creatorDepartments = departments.filter((d) => creatorDeptIds.includes(d.id))
  }

  // Abteilungsbaum flach aufbereiten (Einrückung = Tiefe)
  function flatten(
    parentId: string | null,
    depth: number,
    out: { id: string; name: string; depth: number }[] = []
  ): { id: string; name: string; depth: number }[] {
    for (const d of departments.filter((x) => x.parentId === parentId)) {
      out.push({ id: d.id, name: d.name, depth })
      flatten(d.id, depth + 1, out)
    }
    return out
  }
  const deptTree = flatten(null, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/documents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="size-4" /> Zurück
        </Link>
        <h1 className="text-2xl font-bold">Neues Dokument</h1>
      </div>

      {!isAdmin && creatorDepartments.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold mb-1">Keine Ersteller-Berechtigung</p>
          <p>
            Sie besitzen in keinem Bereich die Ersteller-Rolle. Dokumente können nur in Bereichen angelegt werden,
            in denen Ihnen die Ersteller-Rolle vom jeweiligen Bereichsleiter zugewiesen wurde.
          </p>
        </div>
      ) : (
        <DocumentForm
          types={types}
          departments={deptTree}
          creatorDepartments={creatorDepartments}
          jobRoles={jobRoles}
          users={users}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          initialValues={initialValues}
        />
      )}
    </div>
  )
}
