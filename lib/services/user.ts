import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"

/**
 * Benutzerverwaltung — Service-Layer.
 * Kein hartes Löschen: Benutzer werden nur deaktiviert (isActive = false),
 * damit Audit-/Schulungs-Historie erhalten bleibt (GMP-Grundsatz).
 */

export type UserInput = {
  name?: string | null
  email: string
  password?: string | null
  roleId?: string | null
  orgUnitId?: string | null
  jobRoleId?: string | null
  isActive?: boolean
}

export async function createUser(input: UserInput, actorId: string) {
  const hash = await bcrypt.hash(input.password ?? "", 10)
  const user = await prisma.user.create({
    data: {
      name: input.name ?? null,
      email: input.email,
      password: hash,
      roleId: input.roleId ?? null,
      departmentId: input.orgUnitId ?? null,
      jobRoleId: input.jobRoleId ?? null,
    },
  })
  await logAudit({
    userId: actorId,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    after: { email: user.email, name: user.name },
  })
  return user
}

export async function updateUser(id: string, input: UserInput, actorId: string) {
  const before = await prisma.user.findUnique({ where: { id } })
  if (!before) throw new Error("Benutzer nicht gefunden")

  const data: {
    name?: string | null
    email?: string
    password?: string
    roleId?: string | null
    departmentId?: string | null
    jobRoleId?: string | null
    isActive?: boolean
  } = {
    name: input.name ?? null,
    email: input.email,
    roleId: input.roleId ?? null,
    departmentId: input.orgUnitId ?? null,
    jobRoleId: input.jobRoleId ?? null,
  }
  if (input.isActive !== undefined) data.isActive = input.isActive
  if (input.password) data.password = await bcrypt.hash(input.password, 10)

  const user = await prisma.user.update({ where: { id }, data })

  await logAudit({
    userId: actorId,
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    before: { email: before.email, isActive: before.isActive },
    after: { email: user.email, isActive: user.isActive, passwordChanged: Boolean(input.password) },
  })
  return user
}

/**
 * Eigenes Passwort ändern (Konto-Seite). Verlangt das aktuelle Passwort
 * zur Bestätigung — Audit-Eintrag mit dem Konto selbst als Auslöser.
 */
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("Benutzer nicht gefunden")

  const matches = await bcrypt.compare(currentPassword, user.password)
  if (!matches) throw new Error("Das aktuelle Passwort ist nicht korrekt.")

  if (newPassword.length < 8) {
    throw new Error("Das neue Passwort muss mindestens 8 Zeichen lang sein.")
  }
  if (newPassword === currentPassword) {
    throw new Error("Das neue Passwort muss sich vom aktuellen unterscheiden.")
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hash } })

  await logAudit({
    userId,
    action: "PASSWORD_CHANGE",
    entityType: "User",
    entityId: userId,
    after: { passwordChanged: true },
  })
}
