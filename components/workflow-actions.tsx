import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { formatVersion } from "@/lib/version"
import { Lock } from "lucide-react"
import { ElectronicSignatureForm } from "@/components/electronic-signature-form"
import {
  approveReviewAction,
  returnToAuthorAction,
  startReviewWithoutChangeAction,
  submitForReviewAction,
  withdrawAction,
} from "@/app/[locale]/documents/actions"

export function WorkflowActions({
  current,
  documentId,
  userId,
  userRole,
  isDocumentOwner,
  canEditDraft = false,
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
    workflowTasks: {
      taskType: string
      status: string
      assignedToId: string | null
      assignedTo?: { name: string | null; email: string | null } | null
    }[]
  }
  documentId: string
  userId: string
  userRole: string
  isDocumentOwner: boolean
  canEditDraft?: boolean
}) {
  const versionLabel = formatVersion(current.majorVersion, current.minorVersion)
  const isOwner = current.createdById === userId || isDocumentOwner || canEditDraft || userRole === "ADMIN"

  const pendingReviewTasks = current.workflowTasks.filter(
    (t) => t.taskType === "Review" && t.status === "Pending"
  )
  const pendingApprovalTasks = current.workflowTasks.filter(
    (t) => t.taskType === "Approval" && t.status === "Pending"
  )

  const isReviewer =
    pendingReviewTasks.some((t) => t.assignedToId === userId) ||
    (pendingReviewTasks.length === 0 && current.reviewerId === userId) ||
    (pendingReviewTasks.some((t) => !t.assignedToId) && current.reviewerId === userId)

  const isApprover =
    pendingApprovalTasks.some((t) => t.assignedToId === userId) ||
    (pendingApprovalTasks.length === 0 && current.approverId === userId) ||
    (pendingApprovalTasks.some((t) => !t.assignedToId) && current.approverId === userId)

  const reviewerNames =
    pendingReviewTasks.length > 0
      ? pendingReviewTasks
          .map((t) => t.assignedTo?.name ?? t.assignedTo?.email)
          .filter(Boolean)
          .join(", ") || (current.reviewer?.name ?? current.reviewer?.email ?? "—")
      : (current.reviewer?.name ?? current.reviewer?.email ?? "—")

  const approverNames =
    pendingApprovalTasks.length > 0
      ? pendingApprovalTasks
          .map((t) => t.assignedTo?.name ?? t.assignedTo?.email)
          .filter(Boolean)
          .join(", ") || (current.approver?.name ?? current.approver?.email ?? "—")
      : (current.approver?.name ?? current.approver?.email ?? "—")

  if (current.status === "Draft") {
    if (!isOwner) {
      return (
        <Card className="border-border bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Bearbeitung ({versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Dieser Entwurf wird vom Ersteller bearbeitet und zur Prüfung eingereicht.
          </CardContent>
        </Card>
      )
    }
    return (
      <Card className="border-primary/20 bg-primary/5">
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
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">In Prüfung (Freeze, {versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Die Prüfung läuft — offen bei: <span className="font-medium">{reviewerNames}</span>.
          </CardContent>
        </Card>
      )
    }
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-base">In Prüfung (Freeze, {versionLabel})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sie haben eine offene Prüfaufgabe für diese Version. Nach Abschluss der Prüfphase folgt die Freigabe.
          </p>
          <form action={approveReviewAction}>
            <input type="hidden" name="versionId" value={current.id} />
            <input type="hidden" name="documentId" value={documentId} />
            <Button type="submit">Prüfung bestanden → in Freigabe</Button>
          </form>
          <ReturnForm versionId={current.id} documentId={documentId} label="Zurück an den Ersteller mit Kommentar" />
        </CardContent>
      </Card>
    )
  }

  if (current.status === "In_Approval") {
    if (!isApprover) {
      return (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-base">In Freigabe (Freeze, {versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Die Freigabe läuft — offen bei: <span className="font-medium">{approverNames}</span>.
          </CardContent>
        </Card>
      )
    }
    return (
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4 text-orange-600 dark:text-orange-400" />
            In Freigabe (Freeze, {versionLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sie haben eine offene Freigabeaufgabe. Mit Abschluss der Freigabe wird die Version zu{" "}
            <span className="font-medium">{current.majorVersion + 1}.0</span>.
          </p>
          <ElectronicSignatureForm
            versionId={current.id}
            documentId={documentId}
            buttonLabel={`Rechtsverbindlich genehmigen (wird zu ${current.majorVersion + 1}.0)`}
          />
          <ReturnForm versionId={current.id} documentId={documentId} label="Zurück an den Ersteller mit Kommentar" />
        </CardContent>
      </Card>
    )
  }

  if (current.status === "Released") {
    if (pendingReviewTasks.length > 0) {
      if (!isReviewer) {
        return (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 mt-6">
            <CardHeader>
              <CardTitle className="text-base">In Prüfung ohne Änderung (Freeze, {versionLabel})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Die Prüfung läuft — offen bei: <span className="font-medium">{reviewerNames}</span>.
            </CardContent>
          </Card>
        )
      }
      return (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 mt-6">
          <CardHeader>
            <CardTitle className="text-base">In Prüfung ohne Änderung (Freeze, {versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sie sind als Prüfer für die periodische Überprüfung eingeteilt.
            </p>
            <form action={approveReviewAction}>
              <input type="hidden" name="versionId" value={current.id} />
              <input type="hidden" name="documentId" value={documentId} />
              <Button type="submit">Prüfung bestanden → in Freigabe</Button>
            </form>
            <ReturnForm versionId={current.id} documentId={documentId} label="Zurück an den Ersteller mit Kommentar" />
          </CardContent>
        </Card>
      )
    }

    if (pendingApprovalTasks.length > 0) {
      if (!isApprover) {
        return (
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20 mt-6">
            <CardHeader>
              <CardTitle className="text-base">In Freigabe ohne Änderung (Freeze, {versionLabel})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Die Freigabe läuft — offen bei: <span className="font-medium">{approverNames}</span>.
            </CardContent>
          </Card>
        )
      }
      return (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20 mt-6">
          <CardHeader>
            <CardTitle className="text-base">In Freigabe ohne Änderung (Freeze, {versionLabel})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mit Ihrer Freigabe wird das Prüfdatum der aktuellen Version aktualisiert.
            </p>
            <ElectronicSignatureForm
              versionId={current.id}
              documentId={documentId}
              buttonLabel="Prüfung ohne Änderung rechtsverbindlich abschließen"
              fixedMeaning="Periodische Überprüfung ohne Änderung erfolgreich abgeschlossen und bestätigt."
            />
            <ReturnForm versionId={current.id} documentId={documentId} label="Zurück an den Ersteller mit Kommentar" />
          </CardContent>
        </Card>
      )
    }

    const canWithdraw = userRole === "ADMIN" || isDocumentOwner || canEditDraft
    if (!canWithdraw) return null

    return (
      <div className="space-y-6 mt-6">
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-base text-emerald-800 dark:text-emerald-300">Prüfung ohne Änderung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Startet einen Review-Durchlauf, um das Prüfdatum zu aktualisieren, ohne den Inhalt zu ändern oder eine neue Version zu erstellen.
            </p>
            <form action={startReviewWithoutChangeAction} className="max-w-md space-y-2">
              <input type="hidden" name="documentId" value={documentId} />
              <Textarea name="comment" rows={2} placeholder="Begründung (Optional)…" />
              <Button type="submit" variant="outline" className="border-emerald-300 bg-background text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                Prüfung ohne Änderung starten
              </Button>
            </form>
          </CardContent>
        </Card>

        { (userRole === "ADMIN" || isDocumentOwner) && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Dokument zurückziehen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-destructive">
                Achtung: Dies zieht das aktuell freigegebene Dokument für alle Leser zurück. Es wird als „Zurückgezogen“ markiert und ist nur noch in der Historie sichtbar.
              </p>
              <form action={withdrawAction} className="max-w-md space-y-2">
                <input type="hidden" name="versionId" value={current.id} />
                <input type="hidden" name="documentId" value={documentId} />
                <Textarea name="comment" rows={2} placeholder="Begründung für Rückzug (Pflicht)…" required />
                <Button type="submit" variant="destructive">
                  Dokument zurückziehen
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return null
}

function ReturnForm({ versionId, documentId, label }: { versionId: string; documentId: string; label: string }) {
  return (
    <form action={returnToAuthorAction} className="max-w-md space-y-2">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="documentId" value={documentId} />
      <Textarea name="comment" rows={2} placeholder="Kommentar (Pflicht)…" required />
      <Button type="submit" variant="outline" className="border-destructive/30 text-destructive">
        {label}
      </Button>
    </form>
  )
}
