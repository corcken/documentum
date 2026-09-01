"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { requireUserId } from "@/lib/auth-guard"
import { changeOwnPassword } from "@/lib/services/user"

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", formData, { redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/?error=CredentialsSignin")
    }
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}

export type PasswordChangeState = { error?: string; ok?: string } | null

/** Eigenes Passwort ändern (Konto-Seite). */
export async function changePasswordAction(_prev: PasswordChangeState, formData: FormData) {
  const userId = await requireUserId()
  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirm = String(formData.get("confirmPassword") ?? "")

  if (newPassword !== confirm) {
    return { error: "Die neuen Passwörter stimmen nicht überein." }
  }

  try {
    await changeOwnPassword(userId, currentPassword, newPassword)
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Passwortänderung fehlgeschlagen." }
  }
  return { ok: "Passwort erfolgreich geändert." }
}
