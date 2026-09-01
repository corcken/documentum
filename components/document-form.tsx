"use client"

import { useActionState, useState } from "react"
import { createDocumentAction } from "@/app/documents/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Dept = { id: string; name: string; depth: number }
type UserOption = { id: string; name: string | null; email: string }

export function DocumentForm({
  types,
  departments,
  jobRoles,
  users,
}: {
  types: { id: string; name: string }[]
  departments: Dept[]
  jobRoles: { id: string; name: string }[]
  users: UserOption[]
}) {
  const [state, formAction, pending] = useActionState(createDocumentAction, null)
  const [number, setNumber] = useState("")
  const [deptIds, setDeptIds] = useState<string[]>([])
  const [roleIds, setRoleIds] = useState<string[]>([])

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="documentNumber">Dokumentnummer</Label>
          <Input
            id="documentNumber"
            name="documentNumber"
            required
            placeholder="z. B. SOP-002"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="typeId">Typ</Label>
          {/* Native select: zuverlässig in Server-Action-Formularen (kein JS nötig) */}
          <select
            id="typeId"
            name="typeId"
            required
            defaultValue=""
            className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"
          >
            <option value="" disabled>
              Typ wählen
            </option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Titel</Label>
          <Input id="title" name="title" required placeholder="z. B. Arbeitsanweisung Reinigung" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Inhalt</Label>
        {/* Einfaches Textfeld bis der TipTap-Editor kommt (später geplant). */}
        <textarea
          id="content"
          name="content"
          rows={10}
          placeholder="Dokumentinhalt…"
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
            defaultValue=""
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
          <p className="text-xs text-gray-500">Prüft den Entwurf und gibt ihn frei zur Freigabe.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="approverId">Genehmiger (Freigabe)</Label>
          <select
            id="approverId"
            name="approverId"
            required
            defaultValue=""
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
          <p className="text-xs text-gray-500">
            Gibt die geprüfte Version frei (nicht der Ersteller selbst, Vier-Augen-Prinzip).
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Geltungsbereich: Organisationseinheiten</Label>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-2">
            {departments.length === 0 && (
              <p className="text-sm text-gray-400">Keine Organisationseinheiten vorhanden.</p>
            )}
            {departments.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="departmentId"
                  value={d.id}
                  checked={deptIds.includes(d.id)}
                  onChange={() => toggle(deptIds, setDeptIds, d.id)}
                />
                <span style={{ paddingLeft: d.depth * 14 }}>{d.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">Untergeordnete Einheiten sind automatisch mit erfasst.</p>
        </div>
        <div className="space-y-2">
          <Label>Geltungsbereich: Job-Rollen</Label>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-2">
            {jobRoles.length === 0 && (
              <p className="text-sm text-gray-400">Keine Job-Rollen vorhanden.</p>
            )}
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

      <Button type="submit" disabled={pending}>
        {pending ? "Wird angelegt…" : "Dokument anlegen"}
      </Button>
    </form>
  )
}
