"use client"

import { useActionState } from "react"
import Link from "next/link"
import { createUserAction, updateUserAction } from "@/app/[locale]/admin/benutzer/actions"
import { Button, buttonVariants } from "@/components/ui/button"
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
    isExternal: boolean
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
    <form action={formAction} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {isEdit ? `Benutzer bearbeiten (${user?.name || user?.email})` : "Neuen Benutzer anlegen"}
        </h2>
        <Link href="/admin/benutzer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Abbrechen
        </Link>
      </div>

      {state?.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</div>
      )}
      {isEdit && <input type="hidden" name="id" value={user!.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={user?.name ?? ""} placeholder="Vor- und Nachname" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={user?.email ?? ""}
            placeholder="name@firma.de"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">
            {isEdit ? "Neues Passwort (leer = unverändert)" : "Passwort (mind. 8 Zeichen)"}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={isEdit ? "••••••••" : "Mindestens 8 Zeichen"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleId">System-Rolle</Label>
          <select
            id="roleId"
            name="roleId"
            defaultValue={user?.roleId ?? NONE}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
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

      <div className="flex flex-col gap-2 pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="isExternal" defaultChecked={user?.isExternal ?? false} />
          <span>
            Externer Benutzer{" "}
            <span className="text-xs text-muted-foreground">
              (sieht nur Dokumente mit explizitem Rollen-Geltungsbereich, keine zurückgezogenen Fassungen)
            </span>
          </span>
        </label>

        {isEdit && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={user!.isActive} />
            Benutzer ist aktiv (kann sich anmelden)
          </label>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {isEdit ? "Änderungen speichern" : "Benutzer anlegen"}
        </Button>
        <Link href="/admin/benutzer" className={buttonVariants({ variant: "outline" })}>
          Abbrechen
        </Link>
      </div>
    </form>
  )
}
