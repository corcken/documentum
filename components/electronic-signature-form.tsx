import { Button } from "@/components/ui/button"
import { ShieldCheck, KeyRound } from "lucide-react"
import { approveAction } from "@/app/[locale]/documents/actions"

export function ElectronicSignatureForm({
  versionId,
  documentId,
  buttonLabel,
  fixedMeaning,
}: {
  versionId: string
  documentId: string
  buttonLabel: string
  fixedMeaning?: string
}) {
  return (
    <form
      action={approveAction}
      className="rounded-lg border border-orange-200 bg-card p-4 space-y-3 shadow-xs dark:border-orange-900/50"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-orange-950 dark:text-orange-200">
        <ShieldCheck className="size-4 text-orange-600 dark:text-orange-400" />
        Elektronische Signatur (FDA 21 CFR Part 11 / EU GMP)
      </div>
      <p className="text-xs text-muted-foreground">
        {fixedMeaning
          ? "Bestätigen Sie den Abschluss der periodischen Prüfung durch erneute Passworteingabe."
          : "Zur rechtsverbindlichen Freigabe ist eine Bestätigung mit Ihrem Passwort erforderlich."}
      </p>
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="documentId" value={documentId} />

      {fixedMeaning ? (
        <input type="hidden" name="signatureMeaning" value={fixedMeaning} />
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Signaturbedeutung</label>
          <select
            name="signatureMeaning"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            defaultValue="Ich habe dieses Dokument geprüft und gebe es hiermit zur verbindlichen Nutzung frei."
          >
            <option value="Ich habe dieses Dokument geprüft und gebe es hiermit zur verbindlichen Nutzung frei.">
              Ich habe dieses Dokument geprüft und gebe es hiermit zur verbindlichen Nutzung frei.
            </option>
            <option value="Fachliche und regulatorische Freigabe gemäß QM-Vorgaben.">
              Fachliche und regulatorische Freigabe gemäß QM-Vorgaben.
            </option>
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Ihr Passwort zur Bestätigung</label>
        <div className="relative">
          <KeyRound className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            name="password"
            required
            placeholder="Passwort eingeben…"
            className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2">
        <ShieldCheck className="size-4" />
        {buttonLabel}
      </Button>
    </form>
  )
}
