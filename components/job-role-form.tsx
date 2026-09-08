"use client"

import { useActionState } from "react"
import { createJobRoleAction, updateJobRoleAction } from "@/app/[locale]/admin/jobrollen/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function JobRoleForm({
  role,
}: {
  role?: { id: string; name: string; description: string | null }
}) {
  const isEdit = Boolean(role)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateJobRoleAction : createJobRoleAction,
    null
  )

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-white p-4">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}
      {isEdit && <input type="hidden" name="id" value={role!.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Rollen-Name</Label>
          <Input id="name" name="name" required defaultValue={role?.name ?? ""} placeholder="z. B. Maschinenführer" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" defaultValue={role?.description ?? ""} rows={2} />
      </div>

      <Button type="submit" disabled={pending}>
        {isEdit ? "Änderungen speichern" : "Job-Rolle anlegen"}
      </Button>
    </form>
  )
}
