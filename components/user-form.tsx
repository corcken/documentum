"use client"

import { useActionState } from "react"
import { createUserAction, updateUserAction } from "@/app/admin/benutzer/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const NONE = "__none__"

type Unit = { id: string; name: string; depth: number }

export function UserForm({
  user,
  units,
  jobRoles,
  roles,
}: {
  user: {
    id: string
    name: string | null
    email: string
    isActive: boolean
    departmentId: string | null
    jobRoleId: string | null
    roleId: string | null
  } | null
  units: Unit[]
  jobRoles: { id: string; name: string }[]
  roles: { id: string; name: string }[]
}) {
  const isEdit = Boolean(user)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateUserAction : createUserAction,
    null
  )

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-white p-4">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}
      {isEdit && <input type="hidden" name="id" value={user!.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={user?.name ?? ""} placeholder="Vor- und Nachname" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" required defaultValue={user?.email ?? ""} placeholder="name@firma.de" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{isEdit ? "Neues Passwort (leer = unverändert)" : "Passwort"}</Label>
          <Input id="password" name="password" type="password" placeholder={isEdit ? "••••••••" : "Mindestens 6 Zeichen"} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleId">System-Rolle</Label>
          <select
            id="roleId"
            name="roleId"
            defaultValue={user?.roleId ?? NONE}
            className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"
          >
            <option value={NONE}>— keine —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="orgUnitId">Organisationseinheit</Label>
          <select
            id="orgUnitId"
            name="orgUnitId"
            defaultValue={user?.departmentId ?? NONE}
            className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"
          >
            <option value={NONE}>— keine —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {"\u00A0".repeat(u.depth * 2)}
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobRoleId">Job-Rolle</Label>
          <select
            id="jobRoleId"
            name="jobRoleId"
            defaultValue={user?.jobRoleId ?? NONE}
            className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"
          >
            <option value={NONE}>— keine —</option>
            {jobRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isEdit && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={user!.isActive} />
          Benutzer ist aktiv (kann sich anmelden)
        </label>
      )}

      <Button type="submit" disabled={pending}>
        {isEdit ? "Änderungen speichern" : "Benutzer anlegen"}
      </Button>
    </form>
  )
}
