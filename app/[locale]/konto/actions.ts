"use server"

import { requireUser } from "@/lib/auth-guard"
import { changeOwnEmail } from "@/lib/services/user"
import { setUserAvatar, removeUserAvatar } from "@/lib/services/avatar"
import { revalidatePath } from "next/cache"

export type FormState = { error?: string; ok?: string } | null

export async function changeEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const userId = session.user.id!
  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newEmail = String(formData.get("newEmail") ?? "")

  try {
    await changeOwnEmail(userId, currentPassword, newEmail)
    revalidatePath("/konto")
    return { ok: "E-Mail-Adresse erfolgreich geändert." }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "E-Mail-Änderung fehlgeschlagen." }
  }
}

export async function uploadAvatarAction(formData: FormData) {
  const session = await requireUser()
  const userId = session.user.id!
  const file = formData.get("avatar") as File | null

  if (!file || file.size === 0) {
    throw new Error("Kein Bild übermittelt.")
  }

  await setUserAvatar(userId, file)
  revalidatePath("/konto")
  revalidatePath("/", "layout")
}

export async function removeAvatarAction() {
  const session = await requireUser()
  const userId = session.user.id!

  await removeUserAvatar(userId)
  revalidatePath("/konto")
  revalidatePath("/", "layout")
}
