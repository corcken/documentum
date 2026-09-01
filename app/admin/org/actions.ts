"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createOrgUnit, deleteOrgUnit, updateOrgUnit } from "@/lib/services/org"
import { requireAdminId } from "@/lib/auth-guard"

const ROOT = "__root__"

const orgSchema = z.object({
  name: z.string().min(2, "Name ist zu kurz"),
  abbreviation: z.string().optional().default(""),
  description: z.string().optional().default(""),
  parentId: z.string().optional().default(ROOT),
})

export type OrgActionState = { error?: string } | null

function toInput(data: z.infer<typeof orgSchema>) {
  return {
    name: data.name,
    abbreviation: data.abbreviation || null,
    description: data.description || null,
    parentId: !data.parentId || data.parentId === ROOT ? null : data.parentId,
  }
}

export async function createOrgUnitAction(_prev: OrgActionState, formData: FormData) {
  const actorId = await requireAdminId()
  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    abbreviation: formData.get("abbreviation"),
    description: formData.get("description"),
    parentId: formData.get("parentId"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" · ") }
  }
  await createOrgUnit(toInput(parsed.data), actorId)
  revalidatePath("/admin/org")
  redirect("/admin/org")
}

export async function updateOrgUnitAction(_prev: OrgActionState, formData: FormData) {
  const actorId = await requireAdminId()
  const id = String(formData.get("id") ?? "")
  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    abbreviation: formData.get("abbreviation"),
    description: formData.get("description"),
    parentId: formData.get("parentId"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" · ") }
  }
  try {
    await updateOrgUnit(id, toInput(parsed.data), actorId)
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Aktualisieren fehlgeschlagen." }
  }
  revalidatePath("/admin/org")
  redirect("/admin/org")
}

export async function deleteOrgUnitAction(formData: FormData) {
  const actorId = await requireAdminId()
  const id = String(formData.get("id") ?? "")
  const result = await deleteOrgUnit(id, actorId)
  if (!result.ok) {
    redirect(`/admin/org?error=${encodeURIComponent(result.error ?? "Löschen fehlgeschlagen.")}`)
  }
  revalidatePath("/admin/org")
  redirect("/admin/org")
}
