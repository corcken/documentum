"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { type OrgUnitNode } from "@/lib/org-tree"
import { computeGraphLayout } from "@/lib/org-graph-layout"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface OrgGraphViewProps {
  tree: OrgUnitNode[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
}

export function OrgGraphView({ tree, expandedIds, onToggle }: OrgGraphViewProps) {
  const t = useTranslations("Org")

  const { nodes, edges, totalWidth, totalHeight } = useMemo(() => {
    return computeGraphLayout(tree, expandedIds)
  }, [tree, expandedIds])

  if (tree.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    )
  }

  const canvasWidth = Math.max(totalWidth, 700)
  const canvasHeight = Math.max(totalHeight, 350)

  return (
    <div className="overflow-auto max-h-[720px] rounded-lg border border-border/80 bg-slate-50/50 p-4 shadow-inner">
      <div
        className="relative"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          minWidth: "100%",
        }}
      >
        {/* SVG Verbindungslinien (Kanten) mit weichen Bezier-Kurven */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasWidth}
          height={canvasHeight}
        >
          {edges.map((edge) => {
            const xMid = Math.round((edge.x1 + edge.x2) / 2)
            const d = `M ${edge.x1} ${edge.y1} C ${xMid} ${edge.y1}, ${xMid} ${edge.y2}, ${edge.x2} ${edge.y2}`
            return (
              <path
                key={edge.id}
                d={d}
                fill="none"
                className="stroke-slate-400 dark:stroke-slate-600"
                strokeWidth="1.5"
              />
            )
          })}
        </svg>

        {/* Knoten-Karten */}
        {nodes.map((node) => {
          const tooltip = node.description
            ? `${node.name}${node.abbreviation ? ` (${node.abbreviation})` : ""}\n\n${node.description}`
            : node.name

          return (
            <div
              key={node.id}
              role="button"
              tabIndex={node.hasChildren ? 0 : undefined}
              aria-expanded={node.hasChildren ? node.isExpanded : undefined}
              aria-label={
                node.hasChildren
                  ? `${node.isExpanded ? t("collapse") : t("expand")}: ${node.name}`
                  : node.name
              }
              title={tooltip}
              onClick={node.hasChildren ? () => onToggle(node.id) : undefined}
              onKeyDown={
                node.hasChildren
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onToggle(node.id)
                      }
                    }
                  : undefined
              }
              style={{
                position: "absolute",
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
              className={cn(
                "group z-10 flex flex-col justify-center rounded-lg border border-border/80 bg-card px-2.5 py-1.5 shadow-xs transition-all",
                node.hasChildren
                  ? "cursor-pointer hover:border-primary hover:shadow-md hover:bg-accent/50 active:scale-[0.99]"
                  : "cursor-default"
              )}
            >
              {(node.abbreviation || node.hasChildren) && (
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  {node.abbreviation ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-normal px-1 py-0 h-4"
                    >
                      {node.abbreviation}
                    </Badge>
                  ) : (
                    <span />
                  )}

                  {node.hasChildren &&
                    (!node.isExpanded ? (
                      <span
                        className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary"
                        title={`${node.childCount} ${t("directSubunits")}`}
                      >
                        +{node.childCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 group-hover:text-foreground">
                        <ChevronDown className="size-3" />
                      </span>
                    ))}
                </div>
              )}

              <div className="font-semibold text-xs leading-snug break-words [overflow-wrap:anywhere] text-foreground line-clamp-3">
                {node.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
