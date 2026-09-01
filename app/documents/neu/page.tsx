import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { DocumentForm } from "@/components/document-form"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default async function NewDocumentPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const [types, departments, jobRoles, users] = await Promise.all([
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.jobRole.findMany({ orderBy: { name: "asc" } }),
    // Prüfer/Genehmiger: aktive Benutzer mit Schreibrechten (ADMIN/EDITOR)
    prisma.user.findMany({
      where: { isActive: true, role: { name: { in: ["ADMIN", "EDITOR"] } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ])

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
      <DocumentForm types={types} departments={deptTree} jobRoles={jobRoles} users={users} />
    </div>
  )
}
