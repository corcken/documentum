"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth-guard"
import { createJobRole, deleteJobRole, updateJobRole } from "@/lib/services/jobrole"

const schema = z.object({
  name: z.string().min(2, "Name ist zu kurz"),
  description: z.string().optional(),
})

export type FormState = { error?: string } | null

export async function createJobRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin()
  const parsed = schema.safeParse({
    name: formData.get("name") ?? undefined,
    description: formData.get("description") ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") }
  }

  try {
    await createJobRole(parsed.data, session.user.id!)
  } catch (e: any) {
    if (e.code === "P2002") return { error: "Dieser Rollen-Name existiert bereits." }
    return { error: "Speichern fehlgeschlagen." }
  }

  revalidatePath("/admin/jobrollen")
  redirect("/admin/jobrollen")
}

export async function updateJobRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const parsed = schema.safeParse({
    name: formData.get("name") ?? undefined,
    description: formData.get("description") ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") }
  }

  try {
    await updateJobRole(id, parsed.data, session.user.id!)
  } catch (e: any) {
    if (e.code === "P2002") return { error: "Dieser Rollen-Name existiert bereits." }
    return { error: "Speichern fehlgeschlagen." }
  }

  revalidatePath("/admin/jobrollen")
  redirect("/admin/jobrollen")
}

export async function deleteJobRoleAction(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const res = await deleteJobRole(id, session.user.id!)
  if (!res.ok) {
    redirect(`/admin/jobrollen?error=${encodeURIComponent(res.error!)}`)
  }
  revalidatePath("/admin/jobrollen")
  redirect("/admin/jobrollen")
}
