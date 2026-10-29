import { requireUser } from "@/lib/auth-guard"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getDocument } from "@/lib/services/document"
import { flattenOrgUnits } from "@/lib/org-tree"
import { DocumentEditForm } from "@/components/document-edit-form"
import { AttachmentManager } from "@/components/attachment-manager"
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
  const hasPendingPeriodicTasks = latest?.workflowTasks.some((t) => t.status === "Pending") ?? false

  if (
    !latest ||
    (latest.status !== "Draft" && (latest.status !== "Released" || hasPendingPeriodicTasks))
  ) {
    redirect(
      `/documents/${id}?error=${encodeURIComponent(
        "Das Dokument befindet sich im Freeze (Prüfung/Freigabe) und kann derzeit nicht bearbeitet werden."
      )}`
    )
  }

  const { assertCanEditVersion } = await import("@/lib/services/document-helpers")
  try {
    await assertCanEditVersion(session.user.id!, latest.id, true)
  } catch (e) {
    redirect(
      `/documents/${id}?error=${encodeURIComponent(
        e instanceof Error ? e.message : "Keine Berechtigung zur Bearbeitung."
      )}`
    )
  }

  const [users, allDepts, jobRoles, myAssets] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { name: { in: ["ADMIN", "EDITOR"] } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.jobRole.findMany({ orderBy: { name: "asc" } }),
    prisma.fileAsset.findMany({
      where: {
        OR: [
          { ownerId: session.user.id, trashedAt: null, destroyedAt: null, variant: "original" },
          { isGlobal: true, trashedAt: null, destroyedAt: null, variant: "original" },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const deptTree = flattenOrgUnits(allDepts)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/documents/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="size-4" /> Zurück
        </Link>
        <h1 className="text-2xl font-bold">
          {latest.status === "Released" ? "Neue Revision starten" : "Dokument bearbeiten"}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Du bearbeitest Stand{" "}
        <span className="font-mono font-medium">
          {formatVersion(latest.majorVersion, latest.minorVersion)}
        </span>
        . Speichern erzeugt eine <strong>neue Bearbeitungsversion</strong> (Minor +1) — sofern eine
        Änderung vorgenommen wurde.
      </p>

      <DocumentEditForm
        documentId={doc.id}
        initialTitle={latest.title}
        initialContent={latest.content ?? ""}
        initialReviewerId={latest.reviewerId ?? ""}
        initialApproverId={latest.approverId ?? ""}
        initialVisibility={latest.visibility}
        initialReviewIntervalMonths={doc.reviewIntervalMonths}
        initialDepartmentIds={latest.scopeDepartments.map((s) => s.departmentId)}
        initialJobRoleIds={latest.scopeJobRoles.map((s) => s.jobRoleId)}
        departments={deptTree}
        jobRoles={jobRoles}
        users={users}
        hasDepartment={Boolean(doc.departmentId)}
      />

      {latest.status === "Draft" ? (
        <div className="mt-8">
          <AttachmentManager
            documentId={doc.id}
            versionId={latest.id}
            uses={latest.fileAssetUses}
            myAssets={myAssets}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          Bestehende Anhänge werden beim Speichern der neuen Entwurfsversion automatisch übernommen und können anschließend im Entwurf bearbeitet werden.
        </div>
      )}
    </div>
  )
}
