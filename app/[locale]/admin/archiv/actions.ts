"use server"

import { requireAdmin } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { requestDestruction, confirmDestruction } from "@/lib/services/archive"

export async function requestDestructionAction(formData: FormData) {
  const session = await requireAdmin()
  const versionId = String(formData.get("versionId") ?? "")
  const comment = String(formData.get("comment") ?? "")
  
  await requestDestruction(versionId, comment, session.user.id!)
  revalidatePath("/admin/archiv")
}

export async function confirmDestructionAction(formData: FormData) {
  const session = await requireAdmin()
  const requestId = String(formData.get("requestId") ?? "")
  
  await confirmDestruction(requestId, session.user.id!)
  revalidatePath("/admin/archiv")
}

export async function rejectDestructionAction(formData: FormData) {
  const session = await requireAdmin()
  const requestId = String(formData.get("requestId") ?? "")
  const comment = String(formData.get("comment") ?? "")

  const { rejectDestruction } = await import("@/lib/services/archive")
  await rejectDestruction(requestId, comment, session.user.id!)
  revalidatePath("/admin/archiv")
}
