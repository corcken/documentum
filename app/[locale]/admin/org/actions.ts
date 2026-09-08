"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createOrgUnit, deleteOrgUnit, updateOrgUnit } from "@/lib/services/org"
import { requireAdminId, requireUserId } from "@/lib/auth-guard"
import {
  addDepartmentLead,
  removeDepartmentLead,
  addDepartmentRole,
  removeDepartmentRole,
  replaceDepartmentRole,
  setDepartmentQuorum,
} from "@/lib/services/department-roles"

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
    name: formData.get("name") ?? undefined,
    abbreviation: formData.get("abbreviation") ?? undefined,
    description: formData.get("description") ?? undefined,
    parentId: formData.get("parentId") ?? undefined,
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
    name: formData.get("name") ?? undefined,
    abbreviation: formData.get("abbreviation") ?? undefined,
    description: formData.get("description") ?? undefined,
    parentId: formData.get("parentId") ?? undefined,
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

export async function addDepartmentLeadAction(formData: FormData) {
  const actorId = await requireUserId()
  const departmentId = String(formData.get("departmentId") ?? "")
  const userId = String(formData.get("userId") ?? "")
  if (!departmentId || !userId) return
  try {
    await addDepartmentLead(actorId, departmentId, userId)
  } catch (e) {
    redirect(`/admin/org?action=roles&id=${departmentId}&error=${encodeURIComponent(e instanceof Error ? e.message : "Fehler")}`)
  }
  revalidatePath("/admin/org")
  redirect(`/admin/org?action=roles&id=${departmentId}`)
}

export async function removeDepartmentLeadAction(formData: FormData) {
  const actorId = await requireUserId()
  const departmentId = String(formData.get("departmentId") ?? "")
  const userId = String(formData.get("userId") ?? "")
  if (!departmentId || !userId) return
  try {
    await removeDepartmentLead(actorId, departmentId, userId)
  } catch (e) {
    redirect(`/admin/org?action=roles&id=${departmentId}&error=${encodeURIComponent(e instanceof Error ? e.message : "Fehler")}`)
  }
  revalidatePath("/admin/org")
  redirect(`/admin/org?action=roles&id=${departmentId}`)
}

export async function addDepartmentRoleAction(formData: FormData) {
  const actorId = await requireUserId()
  const departmentId = String(formData.get("departmentId") ?? "")
  const userId = String(formData.get("userId") ?? "")
  const role = String(formData.get("role") ?? "")
  if (!departmentId || !userId || !role) return
  try {
    await addDepartmentRole(actorId, departmentId, userId, role)
  } catch (e) {
    redirect(`/admin/org?action=roles&id=${departmentId}&error=${encodeURIComponent(e instanceof Error ? e.message : "Fehler")}`)
  }
  revalidatePath("/admin/org")
  redirect(`/admin/org?action=roles&id=${departmentId}`)
}

export async function removeDepartmentRoleAction(formData: FormData) {
  const actorId = await requireUserId()
  const departmentId = String(formData.get("departmentId") ?? "")
  const userId = String(formData.get("userId") ?? "")
  const role = String(formData.get("role") ?? "")
  if (!departmentId || !userId || !role) return
  try {
    await removeDepartmentRole(actorId, departmentId, userId, role)
  } catch (e) {
    redirect(`/admin/org?action=roles&id=${departmentId}&error=${encodeURIComponent(e instanceof Error ? e.message : "Fehler")}`)
  }
  revalidatePath("/admin/org")
  redirect(`/admin/org?action=roles&id=${departmentId}`)
}

export async function replaceDepartmentRoleAction(formData: FormData) {
  const actorId = await requireUserId()
  const departmentId = String(formData.get("departmentId") ?? "")
  const oldUserId = String(formData.get("oldUserId") ?? "")
  const newUserId = String(formData.get("newUserId") ?? "")
  const role = String(formData.get("role") ?? "")
  if (!departmentId || !oldUserId || !newUserId || !role) return
  try {
    await replaceDepartmentRole(actorId, departmentId, oldUserId, newUserId, role)
  } catch (e) {
    redirect(`/admin/org?action=roles&id=${departmentId}&error=${encodeURIComponent(e instanceof Error ? e.message : "Fehler")}`)
  }
  revalidatePath("/admin/org")
  redirect(`/admin/org?action=roles&id=${departmentId}`)
}

export async function setDepartmentQuorumAction(formData: FormData) {
  const actorId = await requireUserId()
  const departmentId = String(formData.get("departmentId") ?? "")
  const rawQuorum = String(formData.get("quorumMode") ?? "")
  const quorumMode = rawQuorum === "einer" || rawQuorum === "alle" ? rawQuorum : null
  if (!departmentId) return
  try {
    await setDepartmentQuorum(actorId, departmentId, quorumMode)
  } catch (e) {
    redirect(`/admin/org?action=roles&id=${departmentId}&error=${encodeURIComponent(e instanceof Error ? e.message : "Fehler")}`)
  }
  revalidatePath("/admin/org")
  redirect(`/admin/org?action=roles&id=${departmentId}`)
}

