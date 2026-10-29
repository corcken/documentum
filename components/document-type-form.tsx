"use client"

import { useActionState } from "react"
import { createDocumentTypeAction, updateDocumentTypeAction } from "@/app/[locale]/admin/dokumenttypen/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DocumentTypeForm({
  docType,
}: {
  docType?: { id: string; name: string; requiresTraining: boolean; defaultVisibility: string; retentionMonths: number }
}) {
  const isEdit = Boolean(docType)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateDocumentTypeAction : createDocumentTypeAction,
    null
  )

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-border bg-card p-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</div>
      )}
      {isEdit && <input type="hidden" name="id" value={docType!.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={docType?.name ?? ""} placeholder="z. B. SOP" />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requiresTraining"
          name="requiresTraining"
          defaultChecked={docType?.requiresTraining ?? false}
          className="size-4 rounded border-input accent-primary focus:ring-ring"
        />
        <Label htmlFor="requiresTraining" className="font-normal">
          Erfordert Schulung (Training)
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultVisibility">Standard-Sichtbarkeit</Label>
        <select
          id="defaultVisibility"
          name="defaultVisibility"
          defaultValue={docType?.defaultVisibility ?? "PUBLIC"}
          className="block h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="PUBLIC">Betriebsöffentlich (PUBLIC)</option>
          <option value="SCOPED">Geltungsbereich (SCOPED)</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="retentionMonths">Aufbewahrungsfrist (Monate)</Label>
        <Input 
          id="retentionMonths" 
          name="retentionMonths" 
          type="number" 
          min={0}
          required 
          defaultValue={docType?.retentionMonths ?? 120} 
        />
      </div>

      <Button type="submit" disabled={pending}>
        {isEdit ? "Änderungen speichern" : "Dokumenttyp anlegen"}
      </Button>
    </form>
  )
}
