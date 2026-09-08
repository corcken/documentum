import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { formatVersion } from "@/lib/version"
import {
  approveAction,
  approveReviewAction,
  returnToAuthorAction,
  submitForReviewAction,
} from "@/app/[locale]/documents/actions"

export function WorkflowActions({
  current,
  documentId,
  userId,
  userRole,
  isDocumentOwner,
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
    workflowTasks: { taskType: string; status: string; assignedToId: string | null }[]
  }
  documentId: string
  userId: string
  userRole: string
  isDocumentOwner: boolean
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

  if (current.status === "Released") {
    const pendingTask = current.workflowTasks.find(t => t.status === "Pending")
    
    if (pendingTask) {
      if (pendingTask.taskType === "Review") {
        if (!isReviewer) {
          return (
            <Card className="border-yellow-200 bg-yellow-50/50 mt-6">
              <CardHeader>
                <CardTitle className="text-base">In Prüfung ohne Änderung (Freeze, {versionLabel})</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                Die Prüfung läuft — zuständig: <span className="font-medium">{reviewerName}</span>.
              </CardContent>
            </Card>
          )
        }
        return (
          <Card className="border-yellow-200 bg-yellow-50/50 mt-6">
            <CardHeader>
              <CardTitle className="text-base">In Prüfung ohne Änderung (Freeze, {versionLabel})</CardTitle>
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

      if (pendingTask.taskType === "Approval") {
        if (!isApprover) {
          return (
            <Card className="border-orange-200 bg-orange-50/50 mt-6">
              <CardHeader>
                <CardTitle className="text-base">In Freigabe ohne Änderung (Freeze, {versionLabel})</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                Die Freigabe läuft — zuständig: <span className="font-medium">{approverName}</span>.
              </CardContent>
            </Card>
          )
        }
        return (
          <Card className="border-orange-200 bg-orange-50/50 mt-6">
            <CardHeader>
              <CardTitle className="text-base">In Freigabe ohne Änderung (Freeze, {versionLabel})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Du bist als Genehmiger eingetragen. Mit der Freigabe wird das Prüfdatum der aktuellen Version aktualisiert.
              </p>
              <form action={approveAction}>
                <input type="hidden" name="versionId" value={current.id} />
                <Button type="submit">Prüfung ohne Änderung abschließen</Button>
              </form>
              <ReturnForm versionId={current.id} label="Zurück an den Ersteller mit Kommentar" />
            </CardContent>
          </Card>
        )
      }
    }

    const canWithdraw = userRole === "ADMIN" || isDocumentOwner
    if (!canWithdraw) return null

    return (
      <div className="space-y-6 mt-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-base text-green-800">Prüfung ohne Änderung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-green-700">
              Startet einen Review-Durchlauf, um das Prüfdatum zu aktualisieren, ohne den Inhalt zu ändern oder eine neue Version zu erstellen.
            </p>
            <form action={async (formData) => {
              "use server"
              const { startReviewWithoutChangeAction } = await import("@/app/[locale]/documents/actions")
              return startReviewWithoutChangeAction(formData)
            }} className="max-w-md space-y-2">
              <input type="hidden" name="documentId" value={documentId} />
              <Textarea name="comment" rows={2} placeholder="Begründung (Optional)…" />
              <Button type="submit" variant="outline" className="bg-white text-green-700 hover:text-green-800 hover:bg-green-100 border-green-300">
                Prüfung ohne Änderung starten
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-base text-red-800">Dokument zurückziehen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-700">
              Achtung: Dies zieht das aktuell freigegebene Dokument für alle Leser zurück. Es wird als "Zurückgezogen" markiert und ist nur noch in der Historie sichtbar.
            </p>
            <form action={async (formData) => {
              "use server"
              const { withdrawAction } = await import("@/app/[locale]/documents/actions")
              return withdrawAction(formData)
            }} className="max-w-md space-y-2">
              <input type="hidden" name="versionId" value={current.id} />
              <Textarea name="comment" rows={2} placeholder="Begründung für Rückzug (Pflicht)…" required />
              <Button type="submit" variant="destructive">
                Dokument zurückziehen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
