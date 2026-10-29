import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getDocument } from "@/lib/services/document"
import { canReadVersion, getVersionLifecycleTimestamps } from "@/lib/services/document-helpers"
import { DocumentContent } from "@/components/document-content"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatVersion } from "@/lib/version"
import { markAsTemplateAction, unmarkAsTemplateAction } from "../actions"
import { canManageDocumentTemplate } from "@/lib/services/template"
import { StatusBadge } from "@/components/status-badge"
import { ChevronLeft, ShieldCheck } from "lucide-react"
import { WorkflowActions } from "@/components/workflow-actions"
import { LifecycleChain } from "@/components/lifecycle-chain"
import { DocumentVersionHistory } from "@/components/document-version-history"
import { getUserAvatars } from "@/lib/services/avatar"
import { UserAvatar } from "@/components/user-avatar"
import { WithdrawnVersionsArchive } from "@/components/withdrawn-versions-archive"
import { DocumentReviewers } from "@/components/document-reviewers"

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const session = await requireUser()
  const userId = session.user.id!
  const userRole = session.user.role!
  const isViewer = userRole === "VIEWER"
  const sp = await searchParams

  const { id } = await params
  const doc = await getDocument(id)
  if (!doc) notFound()

  const visibleVersions = []
  for (const v of doc.versions) {
    if (await canReadVersion(userId, v.id)) {
      visibleVersions.push(v)
    }
  }

  if (visibleVersions.length === 0) notFound()

  const current = visibleVersions[0]
  const scopeDepts = current ? [...current.scopeDepartments] : []
  const scopeRoles = current ? [...current.scopeJobRoles] : []
  const historyAsc = [...visibleVersions].reverse()

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isExternal: true },
  })
  const isExternal = currentUser?.isExternal ?? false
  const withdrawnVersions = visibleVersions.filter((v) => v.status === "Withdrawn")

  let deptPruefer: { id: string; name: string | null; email: string }[] = []
  let deptFreigeber: { id: string; name: string | null; email: string }[] = []
  let isDeptErsteller = false
  if (doc.departmentId) {
    const { getDepartmentRoleUsers } = await import("@/lib/services/department-roles")
    const deptErsteller = await getDepartmentRoleUsers(doc.departmentId, "ERSTELLER")
    isDeptErsteller = deptErsteller.some((u) => u.id === userId)
    if (current?.status === "Draft") {
      deptPruefer = await getDepartmentRoleUsers(doc.departmentId, "PRUEFER")
      deptFreigeber = await getDepartmentRoleUsers(doc.departmentId, "FREIGEBER")
    }
  }

  const canEditDraft =
    !isViewer &&
    (userRole === "ADMIN" ||
      doc.ownerId === userId ||
      current?.createdById === userId ||
      isDeptErsteller)

  const hasPendingPeriodicTasks =
    current?.workflowTasks.some((t) => t.status === "Pending") ?? false

  const userIdsToFetch = [
    doc.ownerId,
    current?.reviewerId,
    current?.approverId,
    ...(current?.workflowTasks.map((t) => t.assignedToId) ?? []),
    ...deptPruefer.map((u) => u.id),
    ...deptFreigeber.map((u) => u.id),
    ...visibleVersions.map((v) => v.createdById),
  ].filter(Boolean) as string[]

  const [avatarMap, canManageTemplate, lifecycleTimestamps] = await Promise.all([
    getUserAvatars(userIdsToFetch),
    canManageDocumentTemplate(doc.id, userId),
    current ? getVersionLifecycleTimestamps(current.id, current.createdAt) : Promise.resolve({}),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/documents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="mr-1 size-4" /> Zurück zu Dokumente
        </Link>
        <div className="flex items-center gap-2">
          {!isViewer && doc.isTemplate && current?.status === "Released" && (
            <Link
              href={`/documents/neu?template=${doc.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Aus Vorlage anlegen
            </Link>
          )}
          {canManageTemplate && (
            <form action={doc.isTemplate ? unmarkAsTemplateAction : markAsTemplateAction}>
              <input type="hidden" name="documentId" value={doc.id} />
              <Button type="submit" variant="outline" size="sm">
                {doc.isTemplate ? "Vorlage entfernen" : "Als Vorlage markieren"}
              </Button>
            </form>
          )}
          {canEditDraft && current?.status === "Draft" && (
            <Link href={`/documents/${doc.id}/edit`} className={buttonVariants({ size: "sm" })}>
              Bearbeiten
            </Link>
          )}
          {canEditDraft && current?.status === "Released" && !hasPendingPeriodicTasks && (
            <Link href={`/documents/${doc.id}/edit`} className={buttonVariants({ size: "sm" })}>
              Neue Revision starten
            </Link>
          )}
        </div>
      </div>

      {sp.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {sp.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{doc.documentNumber}</span>
            {doc.type && <Badge variant="outline">{doc.type.name}</Badge>}
            {doc.isTemplate && (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                Vorlage
              </Badge>
            )}
            {current && <StatusBadge status={current.status} />}
            {current && (
              <Badge variant="outline">
                Version {formatVersion(current.majorVersion, current.minorVersion)}
              </Badge>
            )}
            {current?.visibility === "SCOPED" && <Badge variant="destructive">Vertraulich</Badge>}
          </div>
          <CardTitle className="text-xl">{current?.title ?? doc.documentNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span>Eigentümer:</span>
              <UserAvatar
                name={doc.owner?.name}
                email={doc.owner?.email}
                storageKey={doc.ownerId ? avatarMap.get(doc.ownerId) : null}
                size="sm"
              />
              <span className="font-medium">{doc.owner?.name ?? doc.owner?.email ?? "—"}</span>
            </div>
            {doc.department && (
              <div>
                <span className="text-muted-foreground">Verantwortlicher Bereich: </span>
                <span className="font-medium text-foreground">{doc.department.name}</span>
                {doc.department.abbreviation && (
                  <Badge variant="outline" className="ml-1.5 font-mono text-[11px] px-1.5 py-0">
                    {doc.department.abbreviation}
                  </Badge>
                )}
              </div>
            )}
            <div>Erstellt: {new Date(doc.createdAt).toLocaleDateString("de-DE")}</div>
            {current?.effectiveDate && (
              <div>Gültig ab: {new Date(current.effectiveDate).toLocaleDateString("de-DE")}</div>
            )}
            {current?.obsoleteDate && (
              <div>Ersetzt am: {new Date(current.obsoleteDate).toLocaleDateString("de-DE")}</div>
            )}
          </div>
          {!isViewer && current && (
            <DocumentReviewers
              current={current}
              deptPruefer={deptPruefer}
              deptFreigeber={deptFreigeber}
              avatarMap={avatarMap}
            />
          )}
          {current?.electronicSignature && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Elektronisch signiert & freigegeben (FDA 21 CFR Part 11 / EU GMP Annex 11)</span>
              </div>
              <div className="mt-1 text-emerald-800 dark:text-emerald-300">
                Unterzeichnet von: <strong>{(current.electronicSignature as any).signerName}</strong> (
                {(current.electronicSignature as any).signerEmail}) ·{" "}
                {new Date((current.electronicSignature as any).timestamp).toLocaleString("de-DE")}
              </div>
              <div className="mt-0.5 italic text-emerald-700/90 dark:text-emerald-400/90">
                Bedeutung: „{(current.electronicSignature as any).meaning}“
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inhalt</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentContent content={current?.content ?? null} />
        </CardContent>
      </Card>

      {current?.fileAssetUses && current.fileAssetUses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anhänge</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-md border">
              {current.fileAssetUses.map((use) => (
                <li key={use.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{use.fileAsset.originalName}</div>
                    <div className="text-muted-foreground">
                      ({(use.fileAsset.size / 1024).toFixed(1)} KB)
                    </div>
                  </div>
                  <a
                    href={`/api/files/${use.fileAsset.storageKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(scopeDepts.length > 0 || scopeRoles.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Geltungsbereich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {scopeDepts.length > 0 && (
              <div>Organisationseinheiten: {scopeDepts.map((s) => s.department.name).join(", ")}</div>
            )}
            {scopeRoles.length > 0 && (
              <div>Job-Rollen: {scopeRoles.map((s) => s.jobRole.name).join(", ")}</div>
            )}
          </CardContent>
        </Card>
      )}

      {!isViewer && current && (
        <WorkflowActions
          current={current}
          documentId={doc.id}
          userId={userId}
          userRole={userRole}
          isDocumentOwner={doc.ownerId === userId}
          canEditDraft={canEditDraft}
        />
      )}

      {current && <LifecycleChain status={current.status} timestamps={lifecycleTimestamps} />}

      {!isExternal && withdrawnVersions.length > 0 && (
        <WithdrawnVersionsArchive versions={withdrawnVersions} />
      )}

      <DocumentVersionHistory
        documentId={doc.id}
        currentVersionId={current?.id}
        currentStatus={current?.status}
        isViewer={isViewer}
        historyAsc={historyAsc}
        avatarMap={avatarMap}
      />
    </div>
  )
}
