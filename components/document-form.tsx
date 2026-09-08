"use client"

import { useActionState, useState } from "react"
import { createDocumentAction } from "@/app/[locale]/documents/actions"
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
  templates = [],
  selectedTemplateId,
  initialValues,
}: {
  types: { id: string; name: string }[]
  departments: Dept[]
  jobRoles: { id: string; name: string }[]
  users: UserOption[]
  templates?: { id: string; label: string }[]
  selectedTemplateId?: string
  initialValues?: {
    title?: string
    content?: string
    typeId?: string
    reviewIntervalMonths?: number | null
    visibility?: string
    sourceDocumentNumber?: string
    sourceVersion?: string
  } | null
}) {
  const [state, formAction, pending] = useActionState(createDocumentAction, null)
  const [number, setNumber] = useState("")
  const [deptIds, setDeptIds] = useState<string[]>([])
  const [roleIds, setRoleIds] = useState<string[]>([])

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  return (
    <div className="space-y-6">
      {/* Vorlagen-Auswahl (optional) */}
      {templates.length > 0 && (
        <div className="rounded-lg border bg-blue-50/50 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label htmlFor="templateSelect" className="font-semibold text-sm text-blue-900">
                Aus Vorlage übernehmen (optional)
              </Label>
              <p className="text-xs text-blue-700">
                Übernimmt Titel-Gerüst, Inhalt, Dokumenttyp, Prüfintervall und Sichtbarkeit als Startwerte.
              </p>
            </div>
            {initialValues && (
              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2.5 py-1 rounded border border-blue-200">
                Vorlage: {initialValues.sourceDocumentNumber} (v{initialValues.sourceVersion})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-xl">
            <select
              id="templateSelect"
              defaultValue={selectedTemplateId || ""}
              onChange={(e) => {
                const val = e.target.value
                window.location.href = val ? `/documents/neu?template=${val}` : `/documents/neu`
              }}
              className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Keine Vorlage (leeres Dokument) --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        {selectedTemplateId && (
          <input type="hidden" name="templateId" value={selectedTemplateId} />
        )}
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
              defaultValue={initialValues?.typeId || ""}
              key={`type-${initialValues?.typeId || "default"}`}
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
            <Input
              id="title"
              name="title"
              required
              placeholder="z. B. Arbeitsanweisung Reinigung"
              defaultValue={initialValues?.title || ""}
              key={`title-${initialValues?.title || "default"}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visibility">Sichtbarkeit</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={initialValues?.visibility || "PUBLIC"}
              key={`vis-${initialValues?.visibility || "default"}`}
              className="block w-full rounded-md border border-input h-10 px-3 bg-white"
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
              defaultValue={initialValues?.reviewIntervalMonths ?? ""}
              key={`interval-${initialValues?.reviewIntervalMonths ?? "default"}`}
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
            placeholder="Dokumentinhalt…"
            defaultValue={initialValues?.content || ""}
            key={`content-${initialValues?.content ? "loaded" : "default"}`}
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
    </div>
  )
}
