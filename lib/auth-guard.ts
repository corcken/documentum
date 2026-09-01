import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

/**
 * Verlangt einen eingeloggten User; sonst Redirect zur Login-Seite.
 * Prüft zusätzlich, dass der User in der Datenbank existiert — verwaiste
 * Sessions (z. B. nach DB-Reset) werden sofort zum Login geschickt,
 * statt später rätselhafte Fremdschlüssel-Fehler zu erzeugen.
 */
export async function requireUser() {
  const session = await auth()
  if (!session?.user) redirect("/")

  if (session.user.id) {
    const exists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })
    // Verwaiste Session (z. B. nach DB-Reset): Cookie über den
    // Cleanup-Route-Handler entsorgen — sonst Loop Login ↔ Dashboard.
    if (!exists) redirect("/api/auth/cleanup")
  }

  return session
}

/** Verlangt einen eingeloggten ADMIN; sonst Redirect zum Dashboard. */
export async function requireAdmin() {
  const session = await requireUser()
  if (session.user.role !== "ADMIN") redirect("/dashboard")
  return session
}

/** Wie requireUser, liefert aber direkt die User-ID (für Server Actions). */
export async function requireUserId(): Promise<string> {
  const session = await requireUser()
  if (!session.user.id) redirect("/")
  return session.user.id
}

/** Wie requireAdmin, liefert aber direkt die User-ID (für Server Actions). */
export async function requireAdminId(): Promise<string> {
  const session = await requireAdmin()
  if (!session.user.id) redirect("/")
  return session.user.id
}
