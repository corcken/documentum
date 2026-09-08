import { requireAdmin } from "@/lib/auth-guard"
import { getQmStats } from "@/lib/services/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityLineChart, StatusPieChart, TaskBarChart, TypeBarChart } from "@/components/charts"
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants"

export default async function QmStatsPage() {
  await requireAdmin()
  const stats = await getQmStats()

  // Übersetze Statusnamen für das Pie-Chart
  const statusDataTranslated = stats.statusData.map(d => ({
    name: DOCUMENT_STATUS_LABELS[d.name] || d.name,
    value: d.value
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">QM-Auswertungen</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dokumentenbestand nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDataTranslated.length > 0 ? (
              <StatusPieChart data={statusDataTranslated} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                Keine Daten
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dokumente je Typ</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.typeData.length > 0 ? (
              <TypeBarChart data={stats.typeData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                Keine Daten
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offene Aufgaben je Benutzer</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.taskData.length > 0 ? (
              <TaskBarChart data={stats.taskData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                Alle Aufgaben erledigt
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivität (Audit-Einträge letzte 30 Tage)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.auditData.length > 0 ? (
              <ActivityLineChart data={stats.auditData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                Keine Aktivität
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
