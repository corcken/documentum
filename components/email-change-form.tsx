"use client"

import { useActionState } from "react"
import { changeEmailAction } from "@/app/[locale]/konto/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState(changeEmailAction, null)

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state?.ok && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{state.ok}</div>
      )}
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}
      <div className="space-y-1">
        <span className="text-xs text-gray-500">Aktuelle E-Mail:</span>
        <div className="font-medium text-sm text-gray-900">{currentEmail}</div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="newEmail">Neue E-Mail-Adresse</Label>
        <Input
          id="newEmail"
          name="newEmail"
          type="email"
          required
          placeholder="name@beispiel.de"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailCurrentPassword">Aktuelles Passwort zur Bestätigung</Label>
        <Input
          id="emailCurrentPassword"
          name="currentPassword"
          type="password"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Wird geändert…" : "E-Mail-Adresse ändern"}
      </Button>
    </form>
  )
}
