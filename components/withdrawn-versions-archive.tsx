import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DOCUMENT_STATUS_STYLES } from "@/lib/constants"
import { formatVersion } from "@/lib/version"

interface WithdrawnVersionsArchiveProps {
  versions: {
    id: string
    majorVersion: number
    minorVersion: number
    title: string
    changeReason: string | null
    createdAt: Date | string
    updatedAt?: Date | string
  }[]
}

export function WithdrawnVersionsArchive({ versions }: WithdrawnVersionsArchiveProps) {
  if (versions.length === 0) return null

  return (
    <Card className="border-border/80">
      <details className="group">
        <summary className="p-4 cursor-pointer font-semibold text-sm select-none flex items-center justify-between hover:bg-muted/30 transition-colors">
          <span>Zurückgezogene Fassungen (Archiv: {versions.length})</span>
          <span className="text-xs text-muted-foreground group-open:hidden">Einblenden</span>
          <span className="text-xs text-muted-foreground hidden group-open:inline">Ausblenden</span>
        </summary>
        <CardContent className="pt-3 space-y-3 border-t">
          {versions.map((wv) => (
            <div key={wv.id} className="rounded-lg border p-3 bg-muted/20 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Version {formatVersion(wv.majorVersion, wv.minorVersion)}: {wv.title}
                </span>
                <Badge className={DOCUMENT_STATUS_STYLES["Withdrawn"]}>Zurückgezogen</Badge>
              </div>
              {wv.changeReason && (
                <p className="text-xs text-muted-foreground italic">{wv.changeReason}</p>
              )}
              <div className="text-xs text-muted-foreground">
                Erstellt am {new Date(wv.createdAt).toLocaleDateString("de-DE")}
              </div>
            </div>
          ))}
        </CardContent>
      </details>
    </Card>
  )
}
