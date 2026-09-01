import { requireUser } from "@/lib/auth-guard"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getDocument } from "@/lib/services/document"
import { DocumentContent } from "@/components/document-content"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_STYLES } from "@/lib/constants"
import { formatVersion } from "@/lib/version"
import {
  approveAction,
  approveReviewAction,
  restoreAction,
  returnToAuthorAction,
  submitForReviewAction,
} from "../actions"
import { ChevronLeft } from "lucide-react"

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

  const released = doc.versions.find((v) => v.status === "Released")

  // Leser sehen NUR den aktuell freigegebenen Stand — Entwürfe sind unsichtbar
  if (isViewer && !released) notFound()

  // Beteiligte sehen den aktuellsten Stand (Entwurf, falls vorhanden); Leser nur Freigegebenes
  const current = isViewer ? released! : doc.versions[0]
  const visibleVersions = isViewer ? [released!] : doc.versions
  const scopeDepts = current ? [...current.scopeDepartments] : []
  const scopeRoles = current ? [...current.scopeJobRoles] : []
  const historyAsc = [...visibleVersions].reverse() // älteste zuerst

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/documents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="size-4" /> Zurück
        </Link>
        <h1 className="text-2xl font-bold">{current?.title ?? doc.documentNumber}</h1>
      </div>

      {sp.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{sp.error}</div>
      )}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{doc.documentNumber}</span>
            {doc.type && <Badge variant="outline">{doc.type.name}</Badge>}
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
          </div>
          <div className="grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
            <div>
              Eigentümer:{" "}
              <span className="font-medium">{doc.owner?.name ?? doc.owner?.email ?? "—"}</span>
            </div>
            <div>Erstellt: {new Date(doc.createdAt).toLocaleDateString("de-DE")}</div>
            {current?.effectiveDate && (
              <div>Gültig ab: {new Date(current.effectiveDate).toLocaleDateString("de-DE")}</div>
            )}
            {current?.obsoleteDate && (
              <div>Ersetzt am: {new Date(current.obsoleteDate).toLocaleDateString("de-DE")}</div>
            )}
          </div>
          {!isViewer && current && (
            <div className="border-t pt-3 text-sm text-gray-600">
              Prüfer:{" "}
              <span className="font-medium">{current.reviewer?.name ?? current.reviewer?.email ?? "—"}</span>
              {" · "}Genehmiger:{" "}
              <span className="font-medium">{current.approver?.name ?? current.approver?.email ?? "—"}</span>
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
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Versionen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Von</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyAsc.map((v, idx) => {
                const prev = idx > 0 ? historyAsc[idx - 1] : null
                const canRestore =
                  !isViewer && current?.status === "Draft" && v.id !== current.id
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">
                      {formatVersion(v.majorVersion, v.minorVersion)}
                    </TableCell>
                    <TableCell>
                      <Badge className={DOCUMENT_STATUS_STYLES[v.status] ?? ""}>
                        {DOCUMENT_STATUS_LABELS[v.status] ?? v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(v.createdAt).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {v.createdBy?.name ?? v.createdBy?.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!isViewer && prev && (
                          <Link
                            href={`/documents/${doc.id}/diff?von=${prev.id}&bis=${v.id}`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            Diff
                          </Link>
                        )}
                        {canRestore && (
                          <form action={restoreAction}>
                            <input type="hidden" name="documentId" value={doc.id} />
                            <input type="hidden" name="sourceVersionId" value={v.id} />
                            <button
                              type="submit"
                              className={buttonVariants({ variant: "ghost", size: "sm" })}
                            >
                              Hierher zurückspringen
                            </button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function WorkflowActions({
  current,
  documentId,
  userId,
}: {
  current: {
    id: string
    status: string
    majorVersion: number
    minorVersion: number
    createdById: string | null
    reviewerId: string | null
    approverId: string | null
    reviewer?: { name: string | null; email: string | null } | null
    approver?: { name: string | null; email: string | null } | null
  }
  documentId: string
  userId: string
}) {
  const versionLabel = formatVersion(current.majorVersion, current.minorVersion)
  const isOwner = current.createdById === userId
  const isReviewer = current.reviewerId === userId
  const isApprover = current.approverId === userId
  const reviewerName = current.reviewer?.name ?? current.reviewer?.email ?? "—"
  const approverName = current.approver?.name ?? current.approver?.email ?? "—"

  if (current.status === "Draft") {
    if (!isOwner) {
      return (
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-base">Bearbeitung ({versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Dieser Entwurf wird vom Ersteller bearbeitet und zur Prüfung eingereicht.
          </CardContent>
        </Card>
      )
    }
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base">Bearbeitung ({versionLabel})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Link href={`/documents/${documentId}/edit`} className={buttonVariants()}>
            Bearbeiten (neue Version)
          </Link>
          <form action={submitForReviewAction}>
            <input type="hidden" name="documentId" value={documentId} />
            <Button type="submit" variant="outline">
              Zur Prüfung einreichen (Freeze)
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  if (current.status === "In_Review") {
    if (!isReviewer) {
      return (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="text-base">In Prüfung (Freeze, {versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Die Prüfung läuft — zuständig: <span className="font-medium">{reviewerName}</span>.
          </CardContent>
        </Card>
      )
    }
    return (
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="text-base">In Prüfung (Freeze, {versionLabel})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Du bist als Prüfer eingetragen. Danach geht die Freigabe an{" "}
            <span className="font-medium">{approverName}</span>.
          </p>
          <form action={approveReviewAction}>
            <input type="hidden" name="versionId" value={current.id} />
            <Button type="submit">Prüfung bestanden → in Freigabe</Button>
          </form>
          <ReturnForm versionId={current.id} label="Zurück an den Ersteller mit Kommentar" />
        </CardContent>
      </Card>
    )
  }

  if (current.status === "In_Approval") {
    if (!isApprover) {
      return (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-base">In Freigabe (Freeze, {versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Die Freigabe läuft — zuständig: <span className="font-medium">{approverName}</span>.
          </CardContent>
        </Card>
      )
    }
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="text-base">In Freigabe (Freeze, {versionLabel})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Du bist als Genehmiger eingetragen. Mit der Freigabe wird die Version zu{" "}
            <span className="font-medium">{current.majorVersion + 1}.0</span>.
          </p>
          <form action={approveAction}>
            <input type="hidden" name="versionId" value={current.id} />
            <Button type="submit">Genehmigen (wird zu {current.majorVersion + 1}.0)</Button>
          </form>
          <ReturnForm versionId={current.id} label="Zurück an den Ersteller mit Kommentar" />
        </CardContent>
      </Card>
    )
  }

  return null
}

function ReturnForm({ versionId, label }: { versionId: string; label: string }) {
  return (
    <form action={returnToAuthorAction} className="max-w-md space-y-2">
      <input type="hidden" name="versionId" value={versionId} />
      <Textarea name="comment" rows={2} placeholder="Kommentar (Pflicht)…" required />
      <Button type="submit" variant="outline" className="border-red-200 text-red-700">
        {label}
      </Button>
    </form>
  )
}
