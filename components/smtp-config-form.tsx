"use client"

import { useActionState, useState } from "react"
import { saveSmtpAction, testSmtpAction } from "@/app/[locale]/admin/email/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SmtpSettings } from "@/lib/services/email"
import { Check, AlertCircle, Send, CheckCircle2 } from "lucide-react"

export function SmtpConfigForm({ initialSettings }: { initialSettings: SmtpSettings }) {
  const [state, formAction, pending] = useActionState(saveSmtpAction, null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testSmtpAction()
      setTestResult(res)
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Test fehlgeschlagen." })
    } finally {
      setTesting(false)
    }
  }

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      {state?.ok && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" /> {state.ok}
        </div>
      )}
      {state?.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" /> {state.error}
        </div>
      )}
      {testResult && (
        <div
          className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
            testResult.success
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {testResult.success ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {testResult.message}
        </div>
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground space-y-1">
        <p className="font-semibold">Test- und Simulationsmodus:</p>
        <p>
          Wenn der E-Mail-Versand deaktiviert ist oder kein Host eingetragen wurde, werden alle E-Mails im
          Server-Log simuliert. Der reguläre Dokumenten-Workflow wird dadurch niemals blockiert.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="enabled"
          name="enabled"
          defaultChecked={initialSettings.enabled}
          className="size-4 rounded border-input accent-primary focus:ring-ring"
        />
        <Label htmlFor="enabled" className="text-sm font-medium cursor-pointer">
          E-Mail-Versand via SMTP aktivieren
        </Label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="host">SMTP Server (Host)</Label>
          <Input
            id="host"
            name="host"
            defaultValue={initialSettings.host}
            placeholder="z. B. smtp.office365.com oder mail.firmennetz.de"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            name="port"
            type="number"
            defaultValue={initialSettings.port || 587}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="secure"
          name="secure"
          defaultChecked={initialSettings.secure}
          className="size-4 rounded border-input accent-primary focus:ring-ring"
        />
        <Label htmlFor="secure" className="text-sm cursor-pointer">
          SSL/TLS Verschlüsselung erzwingen (Secure)
        </Label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="user">SMTP Benutzername</Label>
          <Input
            id="user"
            name="user"
            defaultValue={initialSettings.user}
            placeholder="benutzer@beispiel.de"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pass">SMTP Passwort</Label>
          <Input
            id="pass"
            name="pass"
            type="password"
            placeholder={initialSettings.pass ? "•••••••••••• (gesetzt)" : "Passwort eingeben"}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="from">Absender-Adresse (From)</Label>
        <Input
          id="from"
          name="from"
          defaultValue={initialSettings.from}
          placeholder='"Documentum QM" <noreply@firmennetz.de>'
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert…" : "SMTP-Einstellungen speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={testing || pending}
        >
          <Send className="size-4 mr-2" />
          {testing ? "Wird getestet…" : "Verbindung testen"}
        </Button>
      </div>
    </form>
  )
}
