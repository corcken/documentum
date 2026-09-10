import { auth } from "@/auth"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { countMyOpenTasks } from "@/lib/services/tasks"
import { getUserAvatar } from "@/lib/services/avatar"
import { UserMenuDialog } from "@/components/user-menu-dialog"

export async function AppHeader() {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const isLead = session?.user?.id ? (await prisma.departmentLead.findFirst({ where: { userId: session.user.id } })) !== null : false
  const canManageOrg = isAdmin || isLead
  const openTasks = session?.user?.id ? await countMyOpenTasks(session.user.id) : 0
  const avatar = session?.user?.id ? await getUserAvatar(session.user.id) : null

  return (
    <header className="flex items-center justify-between border-b bg-card text-card-foreground px-6 py-4 shadow-xs">
      <div className="flex items-center gap-8">
        <div className="text-xl font-bold text-blue-600">Documentum</div>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/documents" className="text-sm text-gray-600 hover:text-gray-900">
            Dokumente
          </Link>
          {session?.user?.role !== "VIEWER" && (
            <Link href="/documents/prueffaellig" className="text-sm text-gray-600 hover:text-gray-900">
              Prüffällig
            </Link>
          )}
          <Link href="/aufgaben" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            Aufgaben
            {openTasks > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {openTasks}
              </span>
            )}
          </Link>
          <Link href="/mediathek" className="text-sm text-gray-600 hover:text-gray-900">
            Mediathek
          </Link>
          {canManageOrg && (
            <Link href="/admin/org" className="text-sm text-gray-600 hover:text-gray-900">
              Organisation
            </Link>
          )}
          {isAdmin && (
            <>
              <Link href="/admin/benutzer" className="text-sm text-gray-600 hover:text-gray-900">
                Benutzer
              </Link>
              <Link href="/admin/archiv" className="text-sm text-gray-600 hover:text-gray-900">
                Archiv & Vernichtung
              </Link>
              <Link href="/admin/email" className="text-sm text-gray-600 hover:text-gray-900">
                E-Mail & Vorlagen
              </Link>
              <Link href="/admin/einstellungen" className="text-sm text-gray-600 hover:text-gray-900">
                Einstellungen
              </Link>
              <Link
                href="/admin/entwicklung"
                className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                Entwicklung
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {session?.user && (
          <UserMenuDialog
            user={{
              name: session.user.name,
              email: session.user.email,
              role: session.user.role,
              avatarStorageKey: avatar?.storageKey,
            }}
          />
        )}
      </div>
    </header>
  )
}
