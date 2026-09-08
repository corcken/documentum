"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { type OrgUnitNode, getAllNodeIdsWithChildren, countTotalNodes } from "@/lib/org-tree"
import { OrgTreeExplorer } from "@/components/org-tree-explorer"
import { OrgGraphView } from "@/components/org-graph-view"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronsDownUp, ChevronsUpDown, FolderTree, Network } from "lucide-react"

export interface OrgViewContainerProps {
  tree: OrgUnitNode[]
  showAdminActions?: boolean
}

export function OrgViewContainer({ tree, showAdminActions = true }: OrgViewContainerProps) {
  const t = useTranslations("Org")
  const [viewMode, setViewMode] = useState<"list" | "graph">("list")

  // Initial: oberste Ebene offen (Wurzel-Einheiten sichtbar, Ebene 1–2 sichtbar)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set(tree.map((node) => node.id))
  })

  // Alle IDs von Knoten mit mindestens einem Kind
  const allParentIds = useMemo(() => {
    return getAllNodeIdsWithChildren(tree)
  }, [tree])

  const totalCount = useMemo(() => {
    return countTotalNodes(tree)
  }, [tree])

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExpandAll = () => {
    setExpandedIds(new Set(allParentIds))
  }

  const handleCollapseAll = () => {
    setExpandedIds(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Steuerungsleiste: Ansichtsumschalter (Liste / Diagramm) & Aufklapp-Aktionen */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        {/* Umschalter & Zähler */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-border/80 bg-muted/60 p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-white text-foreground shadow-xs dark:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FolderTree className="size-3.5" />
              {t("viewList")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "graph"}
              onClick={() => setViewMode("graph")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                viewMode === "graph"
                  ? "bg-white text-foreground shadow-xs dark:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Network className="size-3.5" />
              {t("viewGraph")}
            </button>
          </div>

          <span className="text-xs text-muted-foreground">
            {t("unitsCount", { count: totalCount })}
          </span>
        </div>

        {/* Schnellaktionen: Alle aufklappen / Alle zuklappen */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExpandAll}
            className="text-xs h-7 gap-1 cursor-pointer"
          >
            <ChevronsUpDown className="size-3.5" />
            {t("expandAll")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCollapseAll}
            className="text-xs h-7 gap-1 cursor-pointer"
          >
            <ChevronsDownUp className="size-3.5" />
            {t("collapseAll")}
          </Button>
        </div>
      </div>

      {/* Gewählte Ansicht */}
      {viewMode === "list" ? (
        <OrgTreeExplorer
          tree={tree}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          showAdminActions={showAdminActions}
        />
      ) : (
        <OrgGraphView
          tree={tree}
          expandedIds={expandedIds}
          onToggle={handleToggle}
        />
      )}
    </div>
  )
}
