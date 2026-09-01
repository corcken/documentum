import { requireUser } from "@/lib/auth-guard"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getDocument } from "@/lib/services/document"
import { DocumentEditForm } from "@/components/document-edit-form"
import { buttonVariants } from "@/components/ui/button"
import { formatVersion } from "@/lib/version"
import { ChevronLeft } from "lucide-react"

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")

  const { id } = await params
  const doc = await getDocument(id)
  if (!doc) notFound()

  const latest = doc.versions[0]
  if (!latest || latest.status !== "Draft") {
    redirect(`/documents/${id}?error=${encodeURIComponent("Das Dokument ist nicht im Entwurfs-Status (Freeze oder freigegeben).")}`)
  }

  // Prüfer/Genehmiger: aktive Benutzer mit Schreibrechten (ADMIN/EDITOR)
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { name: { in: ["ADMIN", "EDITOR"] } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/documents/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="size-4" /> Zurück
        </Link>
        <h1 className="text-2xl font-bold">Dokument bearbeiten</h1>
      </div>

      <p className="text-sm text-gray-500">
        Du bearbeitest Stand{" "}
        <span className="font-mono font-medium">
          {formatVersion(latest.majorVersion, latest.minorVersion)}
        </span>
        . Speichern erzeugt eine <strong>neue Bearbeitungsversion</strong> (Minor +1) — aber nur,
        wenn sich der Inhalt geändert hat.
      </p>

      <DocumentEditForm
        documentId={doc.id}
        initialTitle={latest.title}
        initialContent={latest.content ?? ""}
        initialReviewerId={latest.reviewerId ?? ""}
        initialApproverId={latest.approverId ?? ""}
        users={users}
      />
    </div>
  )
}
