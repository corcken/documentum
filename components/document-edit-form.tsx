"use client"

import { useActionState } from "react"
import { saveDraftAction } from "@/app/[locale]/documents/actions"
import { contentToText } from "@/lib/content"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type UserOption = { id: string; name: string | null; email: string }

export function DocumentEditForm({
  documentId,
  initialTitle,
  initialContent,
  initialReviewerId,
  initialApproverId,
  users,
  hasDepartment = false,
}: {
  documentId: string
  initialTitle: string
  initialContent: string
  initialReviewerId: string
  initialApproverId: string
  users: UserOption[]
  hasDepartment?: boolean
}) {
  const [state, formAction, pending] = useActionState(saveDraftAction, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}
      <input type="hidden" name="documentId" value={documentId} />
      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required defaultValue={initialTitle} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Inhalt</Label>
        {/* Einfaches Textfeld bis der TipTap-Editor kommt (später geplant). */}
        <textarea
          id="content"
          name="content"
          rows={10}
          defaultValue={contentToText(initialContent)}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm leading-relaxed"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="changeReason">Änderungsgrund (QM-Pflicht)</Label>
        <textarea
          id="changeReason"
          name="changeReason"
          rows={2}
          required
          placeholder="Was wurde geändert und warum?"
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
        />
      </div>
      {hasDepartment ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
          ℹ️ Prüfer und Genehmiger werden beim Einreichen zur Prüfung automatisch anhand der für den verantwortlichen Bereich hinterlegten Rollen zugewiesen.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reviewerId">Prüfer (Review)</Label>
            <select
              id="reviewerId"
              name="reviewerId"
              defaultValue={initialReviewerId}
              className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"
            >
              <option value="" disabled>
                Prüfer wählen
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="approverId">Genehmiger (Freigabe)</Label>
            <select
              id="approverId"
              name="approverId"
              defaultValue={initialApproverId}
              className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"
            >
              <option value="" disabled>
                Genehmiger wählen
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Wird gespeichert…" : "Speichern (neue Version)"}
      </Button>
    </form>
  )
}
