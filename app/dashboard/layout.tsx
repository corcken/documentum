import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { logoutAction } from "@/app/actions"
import { Button } from "@/components/ui/button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Serverseitiger Schutz: Wenn nicht eingeloggt, zurück zur Login-Seite
  if (!session?.user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl text-blue-600">Documentum</div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 hidden md:block">
            Eingeloggt als <span className="font-semibold">{session.user.name || session.user.email}</span> 
            {session.user.role && <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{session.user.role}</span>}
          </div>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">Abmelden</Button>
          </form>
        </div>
      </header>
      
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  )
}
