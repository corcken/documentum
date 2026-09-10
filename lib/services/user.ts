import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import { notifyUserCreated } from "./workflow-notifications"

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
  isExternal?: boolean
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
      isExternal: input.isExternal ?? false,
    },
  })
  await logAudit({
    userId: actorId,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    after: { email: user.email, name: user.name },
  })
  notifyUserCreated(user)
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
  isExternal?: boolean
  } = {
    name: input.name ?? null,
    email: input.email,
    roleId: input.roleId ?? null,
    departmentId: input.orgUnitId ?? null,
    jobRoleId: input.jobRoleId ?? null,
      isExternal: input.isExternal ?? false,
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

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error("Ihr Konto ist vorübergehend gesperrt. Bitte versuchen Sie es in 15 Minuten erneut.")
  }

  const matches = await bcrypt.compare(currentPassword, user.password)
  if (!matches) {
    const newAttempts = (user.failedLoginAttempts || 0) + 1
    const lockAccount = newAttempts >= 5
    const lockedUntil = lockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: lockAccount ? 0 : newAttempts, lockedUntil },
    })
    await logAudit({
      userId,
      action: lockAccount ? "ACCOUNT_LOCKED" : "PASSWORD_CHANGE_FAILED",
      entityType: "User",
      entityId: userId,
      after: { attempts: newAttempts, locked: lockAccount },
    })
    throw new Error(lockAccount ? "Konto wegen zu vieler Fehlversuche für 15 Minuten gesperrt." : "Das aktuelle Passwort ist nicht korrekt.")
  }

  if (newPassword.length < 8) {
    throw new Error("Das neue Passwort muss mindestens 8 Zeichen lang sein.")
  }
  if (newPassword === currentPassword) {
    throw new Error("Das neue Passwort muss sich vom aktuellen unterscheiden.")
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash, failedLoginAttempts: 0, lockedUntil: null },
  })

  await logAudit({
    userId,
    action: "PASSWORD_CHANGE",
    entityType: "User",
    entityId: userId,
    after: { passwordChanged: true },
  })
}

/**
 * Eigene E-Mail-Adresse ändern (Konto-Seite).
 * Verlangt das aktuelle Passwort zur Bestätigung.
 * Prüft Format und Eindeutigkeit.
 */
export async function changeOwnEmail(userId: string, currentPassword: string, newEmail: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("Benutzer nicht gefunden")

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error("Ihr Konto ist vorübergehend gesperrt. Bitte versuchen Sie es in 15 Minuten erneut.")
  }

  const matches = await bcrypt.compare(currentPassword, user.password)
  if (!matches) {
    const newAttempts = (user.failedLoginAttempts || 0) + 1
    const lockAccount = newAttempts >= 5
    const lockedUntil = lockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: lockAccount ? 0 : newAttempts, lockedUntil },
    })
    await logAudit({
      userId,
      action: lockAccount ? "ACCOUNT_LOCKED" : "EMAIL_CHANGE_FAILED",
      entityType: "User",
      entityId: userId,
      after: { attempts: newAttempts, locked: lockAccount },
    })
    throw new Error(lockAccount ? "Konto wegen zu vieler Fehlversuche für 15 Minuten gesperrt." : "Das aktuelle Passwort ist nicht korrekt.")
  }

  const trimmedEmail = newEmail.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    throw new Error("Bitte eine gültige E-Mail-Adresse angeben.")
  }

  if (trimmedEmail === user.email.toLowerCase()) {
    throw new Error("Die neue E-Mail-Adresse entspricht der aktuellen.")
  }

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } })
  if (existing) {
    throw new Error("Diese E-Mail-Adresse wird bereits von einem anderen Benutzer verwendet.")
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: trimmedEmail },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "User",
    entityId: userId,
    before: { email: user.email },
    after: { email: updated.email },
  })

  return updated
}
