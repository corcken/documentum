"use server"

import { requireAdmin } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requestDestruction, confirmDestruction, rejectDestruction } from "@/lib/services/archive"

function redirectWithError(e: unknown, fallbackMsg: string): never {
  const err = e as { message?: string; digest?: string }
  if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith?.("NEXT_REDIRECT")) {
    throw e
  }
  const msg = e instanceof Error ? e.message : fallbackMsg
  redirect(`/admin/archiv?error=${encodeURIComponent(msg)}`)
}

export async function requestDestructionAction(formData: FormData) {
  const session = await requireAdmin()
  const versionId = String(formData.get("versionId") ?? "")
  const comment = String(formData.get("comment") ?? "")

  try {
    await requestDestruction(versionId, comment, session.user.id!)
    revalidatePath("/admin/archiv")
  } catch (e) {
    redirectWithError(e, "Vernichtungsanforderung fehlgeschlagen.")
  }
  redirect("/admin/archiv")
}

export async function confirmDestructionAction(formData: FormData) {
  const session = await requireAdmin()
  const requestId = String(formData.get("requestId") ?? "")

  try {
    await confirmDestruction(requestId, session.user.id!)
    revalidatePath("/admin/archiv")
  } catch (e) {
    redirectWithError(e, "Bestätigung fehlgeschlagen.")
  }
  redirect("/admin/archiv")
}

export async function rejectDestructionAction(formData: FormData) {
  const session = await requireAdmin()
  const requestId = String(formData.get("requestId") ?? "")
  const comment = String(formData.get("comment") ?? "")

  try {
    await rejectDestruction(requestId, comment, session.user.id!)
    revalidatePath("/admin/archiv")
  } catch (e) {
    redirectWithError(e, "Ablehnung fehlgeschlagen.")
  }
  redirect("/admin/archiv")
}
