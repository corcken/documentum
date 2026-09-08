import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { getUserAvatar } from "@/lib/services/avatar"
import { AvatarCropper } from "@/components/avatar-cropper"
import { EmailChangeForm } from "@/components/email-change-form"
import { PasswordChangeForm } from "@/components/password-change-form"
import { ThemeSelector } from "@/components/theme-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserRound } from "lucide-react"

export default async function KontoPage() {
  const session = await requireUser()
  const userId = session.user.id!
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, department: true, jobRole: true },
  })

  const avatar = await getUserAvatar(userId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <UserRound className="size-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Mein Konto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profilbild</CardTitle>
          <CardDescription>
            Dein persönlicher Avatar in Documentum. Wird im Header und bei deinen Dokument-Aktionen angezeigt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarCropper
            currentAvatarKey={avatar?.storageKey}
            userName={user?.name}
            userEmail={user?.email ?? ""}
          />
        </CardContent>
      </Card>

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
          <CardTitle className="text-base">Darstellung</CardTitle>
          <CardDescription>
            Wähle dein bevorzugtes Farbschema und Layout für Documentum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector currentTheme={user?.theme ?? "hell"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">E-Mail-Adresse ändern</CardTitle>
          <CardDescription>
            Passe deine Anmelde- und Benachrichtigungs-Adresse an. Zur Bestätigung wird dein aktuelles Passwort benötigt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailChangeForm currentEmail={user?.email ?? ""} />
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
