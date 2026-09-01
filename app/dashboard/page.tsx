import { requireUser } from "@/lib/auth-guard"
import Link from "next/link"
import { countMyOpenTasks } from "@/lib/services/document"
import { prisma } from "@/lib/prisma"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardCheck, FileText, FolderOpen, Plus } from "lucide-react"

export default async function DashboardPage() {
  const session = await requireUser()
  const userId = session.user.id!
  const isViewer = session.user.role === "VIEWER"

  const [openTasks, myDocuments, totalDocuments] = await Promise.all([
    countMyOpenTasks(userId),
    prisma.document.count({ where: { ownerId: userId } }),
    prisma.document.count({
      where: isViewer ? { versions: { some: { status: "Released" } } } : {},
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hallo, {session.user.name ?? session.user.email} 👋
          </h1>
          <p className="text-sm text-gray-500">Willkommen bei Documentum.</p>
        </div>
        {!isViewer && (
          <Link href="/documents/neu" className={buttonVariants()}>
            <Plus className="size-4" /> Neues Dokument
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/aufgaben" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Offene Aufgaben
              </CardTitle>
              <ClipboardCheck className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{openTasks}</div>
              <p className="text-xs text-gray-400">Prüfungen & Freigaben, die auf dich warten</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/documents" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Meine Dokumente
              </CardTitle>
              <FileText className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{myDocuments}</div>
              <p className="text-xs text-gray-400">Von dir erstellte Dokumente</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/documents" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Dokumente gesamt
              </CardTitle>
              <FolderOpen className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalDocuments}</div>
              <p className="text-xs text-gray-400">
                {isViewer ? "Freigegebene Dokumente" : "Alle Dokumente im System"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schnellzugriff</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!isViewer && (
            <Link href="/documents/neu" className={buttonVariants()}>
              <Plus className="size-4" /> Neues Dokument
            </Link>
          )}
          <Link href="/documents" className={buttonVariants({ variant: "outline" })}>
            Dokumente ansehen
          </Link>
          <Link href="/aufgaben" className={buttonVariants({ variant: "outline" })}>
            Meine Aufgaben
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
