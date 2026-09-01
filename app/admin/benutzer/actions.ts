"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createUser, updateUser } from "@/lib/services/user"
import { requireAdminId } from "@/lib/auth-guard"

const NONE = "__none__"

const userSchema = z.object({
  name: z.string().optional().default(""),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().optional().default(""),
  roleId: z.string().optional().default(NONE),
  orgUnitId: z.string().optional().default(NONE),
  jobRoleId: z.string().optional().default(NONE),
})

export type UserActionState = { error?: string } | null

function toInput(data: z.infer<typeof userSchema>) {
  return {
    name: data.name || null,
    email: data.email,
    roleId: !data.roleId || data.roleId === NONE ? null : data.roleId,
    orgUnitId: !data.orgUnitId || data.orgUnitId === NONE ? null : data.orgUnitId,
    jobRoleId: !data.jobRoleId || data.jobRoleId === NONE ? null : data.jobRoleId,
  }
}

function p2002(e: unknown) {
  return (e as { code?: string })?.code === "P2002"
}

export async function createUserAction(_prev: UserActionState, formData: FormData) {
  const actorId = await requireAdminId()
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("roleId"),
    orgUnitId: formData.get("orgUnitId"),
    jobRoleId: formData.get("jobRoleId"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" · ") }
  }
  if (parsed.data.password.length < 6) {
    return { error: "Passwort muss mindestens 6 Zeichen haben." }
  }
  try {
    await createUser({ ...toInput(parsed.data), password: parsed.data.password }, actorId)
  } catch (e) {
    console.error("createUserAction:", e)
    return { error: p2002(e) ? "Diese E-Mail-Adresse ist bereits vergeben." : "Benutzer konnte nicht angelegt werden." }
  }
  revalidatePath("/admin/benutzer")
  redirect("/admin/benutzer")
}

export async function updateUserAction(_prev: UserActionState, formData: FormData) {
  const actorId = await requireAdminId()
  const id = String(formData.get("id") ?? "")
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("roleId"),
    orgUnitId: formData.get("orgUnitId"),
    jobRoleId: formData.get("jobRoleId"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" · ") }
  }
  if (parsed.data.password && parsed.data.password.length < 6) {
    return { error: "Neues Passwort muss mindestens 6 Zeichen haben." }
  }
  try {
    await updateUser(
      id,
      {
        ...toInput(parsed.data),
        password: parsed.data.password || null,
        isActive: formData.get("isActive") === "on",
      },
      actorId
    )
  } catch (e) {
    console.error("updateUserAction:", e)
    return { error: p2002(e) ? "Diese E-Mail-Adresse ist bereits vergeben." : "Speichern fehlgeschlagen." }
  }
  revalidatePath("/admin/benutzer")
  redirect("/admin/benutzer")
}

export async function setUserActiveAction(formData: FormData) {
  const actorId = await requireAdminId()
  const id = String(formData.get("id") ?? "")
  const active = formData.get("active") === "on"

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) redirect("/admin/benutzer")

  await updateUser(
    id,
    {
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      orgUnitId: user.departmentId,
      jobRoleId: user.jobRoleId,
      isActive: active,
    },
    actorId
  )
  revalidatePath("/admin/benutzer")
}
