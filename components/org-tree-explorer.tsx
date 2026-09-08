"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { type OrgUnitNode } from "@/lib/org-tree"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react"

export interface OrgTreeExplorerProps {
  tree: OrgUnitNode[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  showAdminActions?: boolean
}

export function OrgTreeExplorer({
  tree,
  expandedIds,
  onToggle,
  showAdminActions = true,
}: OrgTreeExplorerProps) {
  const t = useTranslations("Org")

  if (tree.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    )
  }

  return (
    <ul className="space-y-1.5">
      {tree.map((rootNode, index) => (
        <OrgTreeNodeItem
          key={rootNode.id}
          node={rootNode}
          depth={0}
          isLast={index === tree.length - 1}
          expandedIds={expandedIds}
          onToggle={onToggle}
          showAdminActions={showAdminActions}
        />
      ))}
    </ul>
  )
}

interface OrgTreeNodeItemProps {
  node: OrgUnitNode
  depth: number
  isLast: boolean
  expandedIds: Set<string>
  onToggle: (id: string) => void
  showAdminActions: boolean
}

function OrgTreeNodeItem({
  node,
  depth,
  isLast,
  expandedIds,
  onToggle,
  showAdminActions,
}: OrgTreeNodeItemProps) {
  const t = useTranslations("Org")
  const hasChildren = node.children.length > 0
  const isExpanded = expandedIds.has(node.id)

  return (
    <li className="relative">
      {/* Führungslinien für verschachtelte Ebenen */}
      {depth > 0 && (
        <>
          {/* Vertikale Verbindungslinie: stoppt beim letzten Kind am horizontalen Ast */}
          <span
            className={cn(
              "absolute -left-4 top-0 w-px bg-border/70",
              isLast ? "h-4.5" : "bottom-0"
            )}
            aria-hidden="true"
          />
          {/* Horizontaler Ast zur Zeile */}
          <span
            className="absolute -left-4 top-4.5 w-3.5 h-px bg-border/70"
            aria-hidden="true"
          />
        </>
      )}

      {/* Zeilenkasten — gesamte Zeile (außer Aktions-Links) ist klickbar zum Auf-/Zuklappen */}
      <div
        role={hasChildren ? "button" : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-label={
          hasChildren
            ? `${isExpanded ? t("collapse") : t("expand")}: ${node.name}`
            : undefined
        }
        onClick={hasChildren ? () => onToggle(node.id) : undefined}
        onKeyDown={
          hasChildren
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onToggle(node.id)
                }
              }
            : undefined
        }
        className={cn(
          "group flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between transition-colors",
          hasChildren
            ? "cursor-pointer hover:bg-accent/50 hover:border-primary/40 select-none"
            : "hover:bg-accent/20"
        )}
      >
        {/* Linke Seite: Chevron, Ordner-Icon, Name, Badge, Unterzeile */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle(node.id)
              }}
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? `${t("collapse")}: ${node.name}` : `${t("expand")}: ${node.name}`}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" aria-hidden="true" />
          )}

          <span className="mt-0.5 shrink-0" aria-hidden="true">
            {hasChildren && isExpanded ? (
              <FolderOpen className="size-4 text-amber-500" />
            ) : (
              <Folder
                className={cn(
                  "size-4",
                  hasChildren ? "text-amber-500" : "text-muted-foreground/60"
                )}
              />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-foreground break-words [overflow-wrap:anywhere]">
                {node.name}
              </span>
              {node.abbreviation && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-mono font-normal px-1.5 py-0"
                >
                  {node.abbreviation}
                </Badge>
              )}
              {hasChildren && (
                <span
                  className="text-xs text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full font-medium shrink-0"
                  title={`${node.children.length} ${t("directSubunits")}`}
                >
                  ({node.children.length})
                </span>
              )}
            </div>

            {node.description && (
              <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere] mt-1 line-clamp-2 hover:line-clamp-none transition-all">
                {node.description}
              </p>
            )}
          </div>
        </div>

        {/* Rechte Seite: Aktions-Links (Untereinheit / Bearbeiten / Löschen) */}
        {showAdminActions && (
          <div
            className="flex shrink-0 items-center gap-1 sm:ml-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`?action=new&parent=${node.id}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("addSubunit")}
            </Link>
            <Link
              href={`?action=edit&id=${node.id}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("edit")}
            </Link>
            <Link
              href={`?action=delete&id=${node.id}`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-destructive hover:text-destructive"
              )}
            >
              {t("delete")}
            </Link>
          </div>
        )}
      </div>

      {/* Untereinheiten */}
      {hasChildren && isExpanded && (
        <ul className="ml-6 relative space-y-1.5 mt-1.5">
          {node.children.map((child, index) => (
            <OrgTreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              showAdminActions={showAdminActions}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
