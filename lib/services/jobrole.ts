import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"

export type JobRoleInput = {
  name: string
  description?: string | null
}

export async function createJobRole(input: JobRoleInput, userId: string) {
  const role = await prisma.jobRole.create({
    data: {
      name: input.name,
      description: input.description ?? null,
    },
  })
  await logAudit({
    userId,
    action: "CREATE",
    entityType: "JobRole",
    entityId: role.id,
    after: { name: role.name, description: role.description },
  })
  return role
}

export async function updateJobRole(id: string, input: JobRoleInput, userId: string) {
  const before = await prisma.jobRole.findUnique({ where: { id } })
  if (!before) throw new Error("Job-Rolle nicht gefunden")

  const role = await prisma.jobRole.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description ?? null,
    },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "JobRole",
    entityId: id,
    before: { name: before.name, description: before.description },
    after: { name: role.name, description: role.description },
  })
  return role
}

export async function deleteJobRole(
  id: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const [users, scopeRefs] = await Promise.all([
    prisma.user.count({ where: { jobRoleId: id } }),
    prisma.scopeJobRole.count({ where: { jobRoleId: id } }),
  ])

  if (users > 0) {
    return { ok: false, error: "Der Job-Rolle sind Benutzer zugeordnet — diese zuerst umhängen." }
  }
  if (scopeRefs > 0) {
    return { ok: false, error: "Die Job-Rolle wird in Geltungsbereichen von Dokumenten verwendet." }
  }

  const role = await prisma.jobRole.findUnique({ where: { id } })
  await prisma.jobRole.delete({ where: { id } })
  await logAudit({
    userId,
    action: "DELETE",
    entityType: "JobRole",
    entityId: id,
    before: { name: role?.name },
  })
  return { ok: true }
}
