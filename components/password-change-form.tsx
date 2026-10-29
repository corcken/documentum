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
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">{state.ok}</div>
      )}
      {state?.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</div>
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
