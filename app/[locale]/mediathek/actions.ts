"use server"

import { requireUser } from "@/lib/auth-guard"
import { uploadFile, trashFile, restoreFile } from "@/lib/services/file"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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
  const session = await requireUser()
  const userId = session.user.id!
  const assetId = String(formData.get("assetId") ?? "")

  try {
    await trashFile(assetId, userId)
    revalidatePath("/mediathek")
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen."
    redirect(`/mediathek?error=${encodeURIComponent(msg)}`)
  }
}

export async function restoreAction(formData: FormData) {
  const session = await requireUser()
  const userId = session.user.id!
  const assetId = String(formData.get("assetId") ?? "")

  try {
    await restoreFile(assetId, userId)
    revalidatePath("/mediathek")
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Wiederherstellen fehlgeschlagen."
    redirect(`/mediathek?tab=trash&error=${encodeURIComponent(msg)}`)
  }
}
