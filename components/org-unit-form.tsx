"use client"

import { useActionState } from "react"
import { createOrgUnitAction, updateOrgUnitAction } from "@/app/admin/org/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const ROOT = "__root__"

export function OrgUnitForm({
  unit,
  parentId,
  units,
}: {
  unit: { id: string; name: string; abbreviation: string | null; description: string | null; parentId: string | null } | null
  parentId?: string
  units: { id: string; name: string; depth: number }[]
}) {
  const isEdit = Boolean(unit)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateOrgUnitAction : createOrgUnitAction,
    null
  )
  const selectedParent = parentId ?? unit?.parentId ?? ROOT

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-white p-4">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}
      {isEdit && <input type="hidden" name="id" value={unit!.id} />}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={unit?.name ?? ""} placeholder="z. B. Fertigung" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="abbreviation">Kürzel</Label>
          <Input id="abbreviation" name="abbreviation" defaultValue={unit?.abbreviation ?? ""} placeholder="z. B. FERT" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentId">Übergeordnete Einheit</Label>
          {/* Native select: zuverlässig in Server-Action-Formularen */}
          <select
            id="parentId"
            name="parentId"
            defaultValue={selectedParent}
            className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"
          >
            <option value={ROOT}>— keine (oberste Ebene) —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {"\u00A0".repeat(u.depth * 2)}
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" defaultValue={unit?.description ?? ""} rows={2} />
      </div>

      <Button type="submit" disabled={pending}>
        {isEdit ? "Änderungen speichern" : "Einheit anlegen"}
      </Button>
    </form>
  )
}
