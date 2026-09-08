import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getDocument } from "@/lib/services/document"
import { DocumentContent } from "@/components/document-content"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_STYLES } from "@/lib/constants"
import { formatVersion } from "@/lib/version"
import { restoreAction, markAsTemplateAction, unmarkAsTemplateAction } from "../actions"
import { canManageDocumentTemplate } from "@/lib/services/template"
import { ChevronLeft } from "lucide-react"
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
  const isViewer = session.user.role === "VIEWER"
  const sp = await searchParams

  const { id } = await params
  const doc = await getDocument(id)
  if (!doc) notFound()

  const { canReadVersion } = await import("@/lib/services/document-helpers")
  
  const visibleVersions = []
  for (const v of doc.versions) {
    if (await canReadVersion(session.user.id!, v.id)) {
      visibleVersions.push(v)
    }
  }

  if (visibleVersions.length === 0) notFound()

  // Die Liste ist absteigend sortiert, also ist Element 0 das aktuellste sichtbare
  const current = visibleVersions[0]
  const scopeDepts = current ? [...current.scopeDepartments] : []
  const scopeRoles = current ? [...current.scopeJobRoles] : []
  const historyAsc = [...visibleVersions].reverse() // älteste zuerst

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { isExternal: true },
  })
  const isExternal = currentUser?.isExternal ?? false
  const withdrawnVersions = visibleVersions.filter((v) => v.status === "Withdrawn")

  let deptPruefer: { id: string; name: string | null; email: string }[] = []
  let deptFreigeber: { id: string; name: string | null; email: string }[] = []
  if (doc.departmentId && current?.status === "Draft") {
    const { getDepartmentRoleUsers } = await import("@/lib/services/department-roles")
    deptPruefer = await getDepartmentRoleUsers(doc.departmentId, "PRUEFER")
    deptFreigeber = await getDepartmentRoleUsers(doc.departmentId, "FREIGEBER")
  }

  const userIdsToFetch = [
    doc.ownerId,
    current?.reviewerId,
    current?.approverId,
    ...(current?.workflowTasks.map((t) => t.assignedToId) ?? []),
    ...deptPruefer.map((u) => u.id),
    ...deptFreigeber.map((u) => u.id),
    ...visibleVersions.map((v) => v.createdById),
  ].filter(Boolean) as string[]
  const avatarMap = await getUserAvatars(userIdsToFetch)
  const canManageTemplate = await canManageDocumentTemplate(doc.id, session.user.id!)

  // Zeitstempel für Lebenszyklus ermitteln
  let lifecycleTimestamps: Record<string, Date> = {}
  if (current) {
    const logs = await prisma.auditLog.findMany({
      where: { entityId: current.id, entityType: "DocumentVersion" },
      orderBy: { createdAt: "asc" },
    })
    logs.forEach((log) => {
      if (log.action === "SAVE_DRAFT" && !lifecycleTimestamps["Draft"]) lifecycleTimestamps["Draft"] = log.createdAt
      if (log.action === "SUBMIT_FOR_REVIEW" && !lifecycleTimestamps["In_Review"]) lifecycleTimestamps["In_Review"] = log.createdAt
      if (log.action === "APPROVE_REVIEW" && !lifecycleTimestamps["In_Approval"]) lifecycleTimestamps["In_Approval"] = log.createdAt
      if (log.action === "APPROVE" && !lifecycleTimestamps["Released"]) lifecycleTimestamps["Released"] = log.createdAt
      if (log.action === "WITHDRAW_DOCUMENT" && !lifecycleTimestamps["Withdrawn"]) lifecycleTimestamps["Withdrawn"] = log.createdAt
    })
    if (!lifecycleTimestamps["Draft"]) lifecycleTimestamps["Draft"] = current.createdAt
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/documents"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
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
          {!isViewer && current?.status === "Draft" && (
            <Link
              href={`/documents/${doc.id}/edit`}
              className={buttonVariants({ size: "sm" })}
            >
              Bearbeiten
            </Link>
          )}
        </div>
      </div>

      {sp.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {sp.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{doc.documentNumber}</span>
            {doc.type && <Badge variant="outline">{doc.type.name}</Badge>}
            {doc.isTemplate && (
              <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800">
                Vorlage
              </Badge>
            )}
            {current && (
              <Badge className={DOCUMENT_STATUS_STYLES[current.status] ?? ""}>
                {DOCUMENT_STATUS_LABELS[current.status] ?? current.status}
              </Badge>
            )}
            {current && (
              <Badge variant="outline">
                Version {formatVersion(current.majorVersion, current.minorVersion)}
              </Badge>
            )}
            {current?.visibility === "SCOPED" && (
              <Badge variant="destructive">Vertraulich
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">{current?.title ?? doc.documentNumber}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
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
                <span className="text-gray-500">Verantwortlicher Bereich: </span>
                <span className="font-medium text-gray-800">{doc.department.name}</span>
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
              {current.fileAssetUses.map((use) => {
                const isImage = use.fileAsset.mimeType.startsWith("image/")
                // Wir haben die Thumb-Variante hier nicht direkt geladen, aber das ist für eine einfache Liste OK.
                // Es wird ja nachher U2 für den Download genutzt.
                return (
                  <li key={use.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{use.fileAsset.originalName}</div>
                      <div className="text-gray-500">
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
                )
              })}
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
          userId={session.user.id!}
          userRole={session.user.role!}
          isDocumentOwner={doc.ownerId === session.user.id}
        />
      )}

      {current && (
        <LifecycleChain status={current.status} timestamps={lifecycleTimestamps} />
      )}

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


