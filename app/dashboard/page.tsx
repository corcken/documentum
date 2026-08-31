import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button>Neues Dokument</Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder für Statistiken / Übersicht */}
        <Card>
          <CardHeader>
            <CardTitle>Meine Dokumente</CardTitle>
            <CardDescription>Zuletzt bearbeitet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Du hast noch keine Dokumente angelegt.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gruppenfreigaben</CardTitle>
            <CardDescription>Geteilt mit deiner Gruppe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500">
              Keine freigegebenen Dokumente gefunden.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
