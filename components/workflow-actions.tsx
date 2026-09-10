import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { formatVersion } from "@/lib/version"
import { Lock, ShieldCheck, KeyRound } from "lucide-react"
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
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4 text-orange-600" />
            In Freigabe (Freeze, {versionLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Du bist als Genehmiger eingetragen. Mit der Freigabe wird die Version zu{" "}
            <span className="font-medium">{current.majorVersion + 1}.0</span>.
          </p>

          <form action={approveAction} className="rounded-lg border border-orange-200 bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-950 dark:text-orange-200">
              <ShieldCheck className="size-4 text-orange-600 dark:text-orange-400" />
              Elektronische Signatur (FDA 21 CFR Part 11 / EU GMP)
            </div>
            <p className="text-xs text-muted-foreground">
              Zur rechtsverbindlichen Freigabe ist eine Bestätigung mit Ihrem Passwort erforderlich.
            </p>
            <input type="hidden" name="versionId" value={current.id} />
            <input type="hidden" name="documentId" value={documentId} />
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Signaturbedeutung</label>
              <select
                name="signatureMeaning"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                defaultValue="Ich habe dieses Dokument geprüft und gebe es hiermit zur verbindlichen Nutzung frei."
              >
                <option value="Ich habe dieses Dokument geprüft und gebe es hiermit zur verbindlichen Nutzung frei.">
                  Ich habe dieses Dokument geprüft und gebe es hiermit zur verbindlichen Nutzung frei.
                </option>
                <option value="Fachliche und regulatorische Freigabe gemäß QM-Vorgaben.">
                  Fachliche und regulatorische Freigabe gemäß QM-Vorgaben.
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Ihr Passwort zur Bestätigung</label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Passwort eingeben…"
                  className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2">
              <ShieldCheck className="size-4" />
              Rechtsverbindlich genehmigen (wird zu {current.majorVersion + 1}.0)
            </Button>
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
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Du bist als Genehmiger eingetragen. Mit der Freigabe wird das Prüfdatum der aktuellen Version aktualisiert.
              </p>

              <form action={approveAction} className="rounded-lg border border-orange-200 bg-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-orange-950 dark:text-orange-200">
                  <ShieldCheck className="size-4 text-orange-600 dark:text-orange-400" />
                  Elektronische Signatur (FDA 21 CFR Part 11 / EU GMP)
                </div>
                <p className="text-xs text-muted-foreground">
                  Bestätigen Sie den Abschluss der periodischen Prüfung durch erneute Passworteingabe.
                </p>
                <input type="hidden" name="versionId" value={current.id} />
                <input type="hidden" name="documentId" value={documentId} />
                <input
                  type="hidden"
                  name="signatureMeaning"
                  value="Periodische Überprüfung ohne Änderung erfolgreich abgeschlossen und bestätigt."
                />

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Ihr Passwort zur Bestätigung</label>
                  <div className="relative">
                    <KeyRound className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="Passwort eingeben…"
                      className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2">
                  <ShieldCheck className="size-4" />
                  Prüfung ohne Änderung rechtsverbindlich abschließen
                </Button>
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
