import { Badge } from "@/components/ui/badge"
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_STYLES } from "@/lib/constants"
import { cn } from "@/lib/utils"

/**
 * Einheitliches Status-Badge für Dokumentstatus.
 * Label und Farben stammen zentral aus lib/constants.ts (s. docs/styleguide.md §6/§12).
 */
export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(DOCUMENT_STATUS_STYLES[status], className)}>
      {DOCUMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
