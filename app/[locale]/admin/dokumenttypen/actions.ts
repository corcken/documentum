"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth-guard"
import { createDocumentType, deleteDocumentType, updateDocumentType } from "@/lib/services/doctype"

const schema = z.object({
  name: z.string().min(2, "Name ist zu kurz"),
  requiresTraining: z.boolean().default(false),
  defaultVisibility: z.string().default("PUBLIC"),
  retentionMonths: z.coerce.number().min(0).default(120),
})

export type FormState = { error?: string } | null

export async function createDocumentTypeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin()
  const parsed = schema.safeParse({
    name: formData.get("name") ?? undefined,
    requiresTraining: formData.get("requiresTraining") === "on",
    defaultVisibility: (formData.get("defaultVisibility") as string) || undefined,
    retentionMonths: formData.get("retentionMonths") ? formData.get("retentionMonths") : undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") }
  }

  try {
    await createDocumentType(parsed.data, session.user.id!)
  } catch (e: any) {
    if (e.code === "P2002") return { error: "Dieser Name existiert bereits." }
    return { error: "Speichern fehlgeschlagen." }
  }

  revalidatePath("/admin/dokumenttypen")
  redirect("/admin/dokumenttypen")
}

export async function updateDocumentTypeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const parsed = schema.safeParse({
    name: formData.get("name") ?? undefined,
    requiresTraining: formData.get("requiresTraining") === "on",
    defaultVisibility: (formData.get("defaultVisibility") as string) || undefined,
    retentionMonths: formData.get("retentionMonths") ? formData.get("retentionMonths") : undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") }
  }

  try {
    await updateDocumentType(id, parsed.data, session.user.id!)
  } catch (e: any) {
    if (e.code === "P2002") return { error: "Dieser Name existiert bereits." }
    return { error: "Speichern fehlgeschlagen." }
  }

  revalidatePath("/admin/dokumenttypen")
  redirect("/admin/dokumenttypen")
}

export async function deleteDocumentTypeAction(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const res = await deleteDocumentType(id, session.user.id!)
  if (!res.ok) {
    redirect(`/admin/dokumenttypen?error=${encodeURIComponent(res.error!)}`)
  }
  revalidatePath("/admin/dokumenttypen")
  redirect("/admin/dokumenttypen")
}
