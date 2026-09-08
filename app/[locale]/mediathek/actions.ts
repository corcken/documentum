"use server"

import { requireUser } from "@/lib/auth-guard"
import { uploadFile, trashFile, restoreFile } from "@/lib/services/file"
import { revalidatePath } from "next/cache"

export type UploadActionState = { error?: string; ok?: string } | null

export async function uploadAction(
  prevStateOrFormData: UploadActionState | FormData,
  maybeFormData?: FormData
): Promise<UploadActionState> {
  const formData = (maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData) as FormData

  try {
    const session = await requireUser()
    const userId = session.user.id!
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return { error: "Keine Datei ausgewählt" }
    }

    const isGlobal = formData.get("isGlobal") === "true"
    if (isGlobal && session.user.role === "VIEWER") {
      throw new Error("Nicht autorisiert")
    }

    await uploadFile(file, userId, isGlobal)
    revalidatePath("/mediathek")
    return { ok: "Datei erfolgreich hochgeladen." }
  } catch (err: any) {
    const isGlobal = formData?.get?.("isGlobal") === "true"
    if (isGlobal && err?.message === "Nicht autorisiert") {
      throw err
    }
    return { error: err?.message || "Upload fehlgeschlagen." }
  }
}

export async function trashAction(formData: FormData) {
  const session = await import("@/lib/auth-guard").then(m => m.requireUser())
  const userId = session.user.id!
  const assetId = formData.get("assetId") as string

  await trashFile(assetId, userId)
  revalidatePath("/mediathek")
}

export async function restoreAction(formData: FormData) {
  const session = await import("@/lib/auth-guard").then(m => m.requireUser())
  const userId = session.user.id!
  const assetId = formData.get("assetId") as string

  await restoreFile(assetId, userId)
  revalidatePath("/mediathek")
}
