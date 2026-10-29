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
  const showDevTools =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_PRODUCTION_IMPERSONATION === "true"

  return (
    <header className="flex items-center justify-between border-b bg-card text-card-foreground px-6 py-4 shadow-xs">
      <div className="flex items-center gap-8">
        <div className="text-xl font-bold text-primary">Documentum</div>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/documents" className="text-sm text-muted-foreground hover:text-foreground">
            Dokumente
          </Link>
          {session?.user?.role !== "VIEWER" && (
            <Link href="/documents/prueffaellig" className="text-sm text-muted-foreground hover:text-foreground">
              Prüffällig
            </Link>
          )}
          <Link href="/aufgaben" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            Aufgaben
            {openTasks > 0 && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                {openTasks}
              </span>
            )}
          </Link>
          <Link href="/mediathek" className="text-sm text-muted-foreground hover:text-foreground">
            Mediathek
          </Link>
          {canManageOrg && (
            <Link href="/admin/org" className="text-sm text-muted-foreground hover:text-foreground">
              Organisation
            </Link>
          )}
          {isAdmin && (
            <>
              <Link href="/admin/benutzer" className="text-sm text-muted-foreground hover:text-foreground">
                Benutzer
              </Link>
              <Link href="/admin/archiv" className="text-sm text-muted-foreground hover:text-foreground">
                Archiv & Vernichtung
              </Link>
              <Link href="/admin/email" className="text-sm text-muted-foreground hover:text-foreground">
                E-Mail & Vorlagen
              </Link>
              <Link href="/admin/einstellungen" className="text-sm text-muted-foreground hover:text-foreground">
                Einstellungen
              </Link>
              {showDevTools && (
                <Link
                  href="/admin/entwicklung"
                  className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Entwicklung
                </Link>
              )}
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
