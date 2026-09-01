import { auth } from "@/auth"
import Link from "next/link"
import { logoutAction } from "@/app/actions"
import { countMyOpenTasks } from "@/lib/services/document"
import { Button } from "@/components/ui/button"

export async function AppHeader() {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const openTasks = session?.user?.id ? await countMyOpenTasks(session.user.id) : 0

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-8">
        <div className="text-xl font-bold text-blue-600">Documentum</div>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/documents" className="text-sm text-gray-600 hover:text-gray-900">
            Dokumente
          </Link>
          <Link href="/aufgaben" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            Aufgaben
            {openTasks > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {openTasks}
              </span>
            )}
          </Link>
          {isAdmin && (
            <>
              <Link href="/admin/org" className="text-sm text-gray-600 hover:text-gray-900">
                Organisation
              </Link>
              <Link href="/admin/benutzer" className="text-sm text-gray-600 hover:text-gray-900">
                Benutzer
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden text-sm text-gray-600 md:block">
          <Link href="/konto" className="hover:text-gray-900">
            <span className="font-semibold underline-offset-2 hover:underline">
              {session?.user?.name || session?.user?.email}
            </span>
          </Link>
          {session?.user?.role && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {session.user.role}
            </span>
          )}
        </div>
        <form action={logoutAction}>
          <Button variant="outline" size="sm" type="submit">
            Abmelden
          </Button>
        </form>
      </div>
    </header>
  )
}
