import { requireAdmin } from "@/lib/auth-guard"
import { getSmtpSettings, listEmailTemplates } from "@/lib/services/email"
import { SmtpConfigForm } from "@/components/smtp-config-form"
import { EmailTemplateManager } from "@/components/email-template-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Server, FileText } from "lucide-react"

export default async function AdminEmailPage() {
  await requireAdmin()

  const [smtpSettings, templates] = await Promise.all([
    getSmtpSettings(),
    listEmailTemplates(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Mail className="size-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-Mail-System & Vorlagen</h1>
          <p className="text-sm text-gray-500">
            SMTP-Verbindung konfigurieren und ereignisgesteuerte E-Mail-Vorlagen verwalten.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SMTP Konfiguration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="size-5 text-gray-600" />
              <CardTitle className="text-base">SMTP-Server Einstellungen</CardTitle>
            </div>
            <CardDescription>
              Hinterlege hier die Zugangsdaten für den Mailserver. Passwörter werden verschlüsselt gespeichert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmtpConfigForm initialSettings={smtpSettings} />
          </CardContent>
        </Card>

        {/* E-Mail Vorlagen */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Ereignisgesteuerte E-Mail-Vorlagen</h2>
          </div>
          <EmailTemplateManager templates={templates} />
        </div>
      </div>
    </div>
  )
}
