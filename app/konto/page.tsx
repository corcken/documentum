import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { PasswordChangeForm } from "@/components/password-change-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserRound } from "lucide-react"

export default async function KontoPage() {
  const session = await requireUser()
  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    include: { role: true, department: true, jobRole: true },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <UserRound className="size-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Mein Konto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil</CardTitle>
          <CardDescription>Deine hinterlegten Daten</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            Name: <span className="font-medium">{user?.name ?? "—"}</span>
          </div>
          <div>
            E-Mail: <span className="font-medium">{user?.email}</span>
          </div>
          <div>
            Rolle: <span className="font-medium">{user?.role?.name ?? "—"}</span>
          </div>
          <div>
            Abteilung: <span className="font-medium">{user?.department?.name ?? "—"}</span>
          </div>
          <div>
            Job-Rolle: <span className="font-medium">{user?.jobRole?.name ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passwort ändern</CardTitle>
          <CardDescription>
            Zur Bestätigung wird dein aktuelles Passwort benötigt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  )
}
