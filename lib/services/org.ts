import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"

/**
 * Organisationseinheiten — Service-Layer.
 * Bewusst semantik-frei: nur Eltern-Kind-Beziehung, beliebig tief.
 */

export type OrgUnitInput = {
  name: string
  abbreviation?: string | null
  description?: string | null
  parentId?: string | null
}

export async function createOrgUnit(input: OrgUnitInput, userId: string) {
  const unit = await prisma.department.create({
    data: {
      name: input.name,
      abbreviation: input.abbreviation ?? null,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
    },
  })
  await logAudit({
    userId,
    action: "CREATE",
    entityType: "OrgUnit",
    entityId: unit.id,
    after: { name: unit.name, abbreviation: unit.abbreviation, parentId: unit.parentId },
  })
  return unit
}

/** Prüft, ob sich id als Parent unter sich selbst/nachgeordnet einsortieren würde. */
async function wouldCreateCycle(id: string, newParentId: string): Promise<boolean> {
  let cur: string | null = newParentId
  while (cur) {
    if (cur === id) return true
    const p: { parentId: string | null } | null = await prisma.department.findUnique({
      where: { id: cur },
      select: { parentId: true },
    })
    cur = p?.parentId ?? null
  }
  return false
}

export async function updateOrgUnit(id: string, input: OrgUnitInput, userId: string) {
  const before = await prisma.department.findUnique({ where: { id } })
  if (!before) throw new Error("Organisationseinheit nicht gefunden")

  if (input.parentId) {
    const cycle = await wouldCreateCycle(id, input.parentId)
    if (cycle) {
      throw new Error("Eine Einheit kann nicht sich selbst oder ihrer eigenen Untereinheit untergeordnet werden.")
    }
  }

  const unit = await prisma.department.update({
    where: { id },
    data: {
      name: input.name,
      abbreviation: input.abbreviation ?? null,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
    },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "OrgUnit",
    entityId: id,
    before: { name: before.name, abbreviation: before.abbreviation, parentId: before.parentId },
    after: { name: unit.name, abbreviation: unit.abbreviation, parentId: unit.parentId },
  })
  return unit
}

export async function deleteOrgUnit(
  id: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const [children, users, scopeRefs] = await Promise.all([
    prisma.department.count({ where: { parentId: id } }),
    prisma.user.count({ where: { departmentId: id } }),
    prisma.scopeDepartment.count({ where: { departmentId: id } }),
  ])

  if (children > 0) {
    return { ok: false, error: "Die Einheit hat Untereinheiten — diese zuerst verschieben oder löschen." }
  }
  if (users > 0) {
    return { ok: false, error: "Der Einheit sind Benutzer zugeordnet — diese zuerst umhängen." }
  }
  if (scopeRefs > 0) {
    return { ok: false, error: "Die Einheit wird in Geltungsbereichen von Dokumenten verwendet." }
  }

  const unit = await prisma.department.findUnique({ where: { id } })
  await prisma.department.delete({ where: { id } })
  await logAudit({
    userId,
    action: "DELETE",
    entityType: "OrgUnit",
    entityId: id,
    before: { name: unit?.name },
  })
  return { ok: true }
}
