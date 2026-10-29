import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { getUserAvatar } from "@/lib/services/avatar"
import { AvatarCropper } from "@/components/avatar-cropper"
import { EmailChangeForm } from "@/components/email-change-form"
import { PasswordChangeForm } from "@/components/password-change-form"
import { ThemeSelector } from "@/components/theme-selector"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { DEPARTMENT_ROLE_LABELS } from "@/lib/constants"
import { UserRound } from "lucide-react"

export default async function KontoPage() {
  const session = await requireUser()
  const userId = session.user.id!
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      department: true,
      jobRole: true,
      departmentLeads: { include: { department: true } },
      departmentRoleAssignments: { include: { department: true } },
    },
  })

  const avatar = await getUserAvatar(userId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Mein Konto" icon={UserRound} />

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
          <CardTitle className="text-base">Profil & Berechtigungen</CardTitle>
          <CardDescription>Deine hinterlegten Stammdaten und Workflow-Rollen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              Name: <span className="font-medium">{user?.name ?? "—"}</span>
            </div>
            <div>
              E-Mail: <span className="font-medium">{user?.email}</span>
            </div>
            <div>
              System-Rolle: <span className="font-medium">{user?.role?.name ?? "—"}</span>
            </div>
            <div>
              Kontotyp:{" "}
              <span className="font-medium">
                {user?.isExternal ? "Externer Benutzer" : "Interner Benutzer"}
              </span>
            </div>
            <div>
              Organisationseinheit: <span className="font-medium">{user?.department?.name ?? "—"}</span>
            </div>
            <div>
              Job-Rolle: <span className="font-medium">{user?.jobRole?.name ?? "—"}</span>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Bereichsleitungen & Workflow-Rollen
            </div>
            {user &&
            (user.departmentLeads.length > 0 || user.departmentRoleAssignments.length > 0) ? (
              <div className="flex flex-wrap gap-1.5">
                {user.departmentLeads.map((l) => (
                  <Badge
                    key={`lead-${l.departmentId}`}
                    variant="outline"
                    className="border-primary/40 bg-primary/5 text-primary"
                  >
                    Bereichsleiter: {l.department.name}
                  </Badge>
                ))}
                {user.departmentRoleAssignments.map((ra) => (
                  <Badge key={ra.id} variant="secondary">
                    {DEPARTMENT_ROLE_LABELS[ra.role] ?? ra.role} ({ra.department.name})
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Keine spezifischen Bereichsrollen zugewiesen.
              </p>
            )}
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
