"use server"

import { signIn } from "@/auth"
import { requireAdminId } from "@/lib/auth-guard"
import { impersonateUser } from "@/lib/services/development"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function impersonateUserAction(formData: FormData) {
  const adminId = await requireAdminId()
  const targetUserId = String(formData.get("targetUserId") ?? "").trim()

  if (!targetUserId) {
    redirect("/admin/entwicklung?error=missing_user")
  }

  let token: string
  try {
    const result = await impersonateUser(adminId, targetUserId)
    token = result.token
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Wechsel"
    redirect(`/admin/entwicklung?error=${encodeURIComponent(msg)}`)
  }

  try {
    await signIn("impersonate", {
      targetUserId,
      token,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/admin/entwicklung?error=ImpersonationFailed")
    }
    // Next.js redirect errors (NEXT_REDIRECT) müssen erneut geworfen werden
    throw error
  }
}
