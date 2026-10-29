import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Einheitlicher Seitenkopf (Titel, optionales Icon/Beschreibung, Aktionen rechts).
 * Ausrichtung und Typografie gemäß docs/styleguide.md §5.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  iconClassName,
  actions,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  iconClassName?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <Icon className={cn("size-6 shrink-0", iconClassName ?? "text-primary")} />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
