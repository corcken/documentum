import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Einheitlicher Leerzustand für Listen, Galerien und Tabellen-Container.
 * Siehe docs/styleguide.md §7/§15.
 */
export function EmptyState({
  message,
  description,
  icon: Icon,
  action,
  className,
}: {
  message: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-center",
        className
      )}
    >
      {Icon && <Icon className="size-8 text-muted-foreground/50" />}
      <p className="text-sm text-muted-foreground">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground/80">{description}</p>
      )}
      {action}
    </div>
  )
}
