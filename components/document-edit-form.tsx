"use client"

import { useActionState, useState } from "react"
import { saveDraftAction } from "@/app/[locale]/documents/actions"
import { contentToText } from "@/lib/content"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Dept = { id: string; name: string; depth: number }
type UserOption = { id: string; name: string | null; email: string }

export function DocumentEditForm({
  documentId,
  initialTitle,
  initialContent,
  initialReviewerId,
  initialApproverId,
  initialVisibility = "PUBLIC",
  initialReviewIntervalMonths = null,
  initialDepartmentIds = [],
  initialJobRoleIds = [],
  departments = [],
  jobRoles = [],
  users,
  hasDepartment = false,
}: {
  documentId: string
  initialTitle: string
  initialContent: string
  initialReviewerId: string
  initialApproverId: string
  initialVisibility?: string
  initialReviewIntervalMonths?: number | null
  initialDepartmentIds?: string[]
  initialJobRoleIds?: string[]
  departments?: Dept[]
  jobRoles?: { id: string; name: string }[]
  users: UserOption[]
  hasDepartment?: boolean
}) {
  const [state, formAction, pending] = useActionState(saveDraftAction, null)
  const [deptIds, setDeptIds] = useState<string[]>(initialDepartmentIds)
  const [roleIds, setRoleIds] = useState<string[]>(initialJobRoleIds)

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</div>
      )}
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="hasScopeUpdate" value="true" />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="title">Titel</Label>
          <Input id="title" name="title" required defaultValue={initialTitle} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Sichtbarkeit</Label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={initialVisibility}
            className="block h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="PUBLIC">Betriebsöffentlich (PUBLIC)</option>
            <option value="SCOPED">Geltungsbereich (SCOPED)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviewIntervalMonths">Prüfintervall (Monate)</Label>
          <Input
            id="reviewIntervalMonths"
            name="reviewIntervalMonths"
            type="number"
            min="0"
            placeholder="Optional"
            defaultValue={initialReviewIntervalMonths ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Inhalt</Label>
        {/* Einfaches Textfeld bis der TipTap-Editor kommt (später geplant). */}
        <textarea
          id="content"
          name="content"
          rows={10}
          defaultValue={contentToText(initialContent)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed"
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
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {(departments.length > 0 || jobRoles.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Geltungsbereich: Organisationseinheiten</Label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
              {departments.map((d) => (
                <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="scopeDepartmentId"
                    value={d.id}
                    checked={deptIds.includes(d.id)}
                    onChange={() => toggle(deptIds, setDeptIds, d.id)}
                  />
                  <span style={{ paddingLeft: d.depth * 14 }}>{d.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Geltungsbereich: Job-Rollen</Label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
              {jobRoles.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="jobRoleId"
                    value={r.id}
                    checked={roleIds.includes(r.id)}
                    onChange={() => toggle(roleIds, setRoleIds, r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasDepartment ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
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
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
