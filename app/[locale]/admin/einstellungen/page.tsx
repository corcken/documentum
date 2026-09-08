import { requireAdmin } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { getTranslations } from "next-intl/server"
import { updateWorkflowQuorumAction } from "./actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, Briefcase, History, BarChart3, ChevronRight, Check } from "lucide-react"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  await requireAdmin()
  const t = await getTranslations("Settings")
  const sp = await searchParams

  const quorumSetting = await prisma.appSetting.findUnique({
    where: { key: "workflow.quorum" },
  })
  const currentQuorum = quorumSetting?.value ?? "alle"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400">
          <Check className="size-4" />
          {t("saved")}
        </div>
      )}

      {/* Workflow-Quorum Einstellung */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("workflowQuorum")}</CardTitle>
          <CardDescription>{t("workflowQuorumDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWorkflowQuorumAction} className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="quorum"
                  value="alle"
                  defaultChecked={currentQuorum === "alle"}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">{t("quorumAlle")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Empfohlen für GMP / 4-Augen-Konformität: Jeder benannte Prüfer und Freigeber muss zustimmen.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="quorum"
                  value="einer"
                  defaultChecked={currentQuorum === "einer"}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">{t("quorumEiner")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Beschleunigter Workflow: Der erste Abschluss schließt die jeweilige Phase ab; übrige offene Aufgaben erlöschen.
                  </div>
                </div>
              </label>
            </div>

            <Button type="submit" size="sm">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Schnellzugriff auf weitere Verwaltungsbereiche */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">{t("adminAreas")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/dokumenttypen"
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <FileText className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Dokumenttypen</div>
                <div className="text-xs text-muted-foreground">{t("doctypesDesc")}</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/admin/jobrollen"
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Briefcase className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Job-Rollen</div>
                <div className="text-xs text-muted-foreground">{t("jobrolesDesc")}</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/admin/audit"
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <History className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Audit-Trail</div>
                <div className="text-xs text-muted-foreground">{t("auditDesc")}</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/admin/auswertungen"
            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <BarChart3 className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Auswertungen</div>
                <div className="text-xs text-muted-foreground">{t("statsDesc")}</div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
