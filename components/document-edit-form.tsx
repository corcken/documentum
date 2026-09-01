"use client"

import { useActionState } from "react"
import { saveDraftAction } from "@/app/documents/actions"
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
}: {
  documentId: string
  initialTitle: string
  initialContent: string
  initialReviewerId: string
  initialApproverId: string
  users: UserOption[]
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reviewerId">Prüfer (Review)</Label>
          <select
            id="reviewerId"
            name="reviewerId"
            required
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
            required
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
      <Button type="submit" disabled={pending}>
        {pending ? "Wird gespeichert…" : "Speichern (neue Version)"}
      </Button>
    </form>
  )
}
