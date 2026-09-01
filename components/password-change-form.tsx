"use client"

import { useActionState } from "react"
import { changePasswordAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null)

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state?.ok && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{state.ok}</div>
      )}
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Neues Passwort (mind. 8 Zeichen)</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Neues Passwort wiederholen</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Wird geändert…" : "Passwort ändern"}
      </Button>
    </form>
  )
}
