import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-guard"
import { buildOrgTree, flattenOrgUnits, type OrgUnitNode } from "@/lib/org-tree"
import { OrgUnitForm } from "@/components/org-unit-form"
import { deleteOrgUnitAction } from "./actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

export default async function OrgAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; parent?: string; id?: string; error?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams

  const units = await prisma.department.findMany({ orderBy: { name: "asc" } })
  const tree = buildOrgTree(units)
  const flat = flattenOrgUnits(units)

  const showForm = sp.action === "new" || sp.action === "edit"
  const editUnit = sp.action === "edit" && sp.id ? (units.find((u) => u.id === sp.id) ?? null) : null
  const deleteUnit = sp.action === "delete" && sp.id ? (units.find((u) => u.id === sp.id) ?? null) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organisation</h1>
        <Link href="?action=new" className={buttonVariants()}>
          <Plus className="size-4" /> Neue Organisationseinheit
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        Einheiten können beliebig tief verschachtelt werden — es gibt keine feste
        Ebenen-Bedeutung (z. B. „Ebene 1 = Abteilung, Ebene 2 = Team").
      </p>

      {sp.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{sp.error}</div>
      )}

      {showForm && <OrgUnitForm unit={editUnit} parentId={sp.parent} units={flat} />}

      {deleteUnit && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">
            <strong>{deleteUnit.name}</strong> wirklich endgültig löschen? Nur möglich, wenn keine
            Untereinheiten, Benutzer oder Geltungsbereiche daran hängen.
          </p>
          <form action={deleteOrgUnitAction} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={deleteUnit.id} />
            <Button variant="destructive" size="sm" type="submit">
              Endgültig löschen
            </Button>
            <Link href="/admin/org" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Abbrechen
            </Link>
          </form>
        </div>
      )}

      <OrgTreeView tree={tree} />
    </div>
  )
}

function OrgTreeView({ tree, depth = 0 }: { tree: OrgUnitNode[]; depth?: number }) {
  if (tree.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-400">
        Noch keine Organisationseinheiten angelegt.
      </div>
    )
  }
  return (
    <ul className="space-y-1">
      {tree.map((node) => (
        <li key={node.id}>
          <div
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 hover:bg-gray-50"
            style={{ marginLeft: depth * 24 }}
          >
            <span className="text-sm font-medium">{node.name}</span>
            {node.abbreviation && (
              <span className="text-xs text-gray-400">{node.abbreviation}</span>
            )}
            <span className="ml-auto flex items-center gap-1">
              <Link href={`?action=new&parent=${node.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                + Untereinheit
              </Link>
              <Link href={`?action=edit&id=${node.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Bearbeiten
              </Link>
              <Link
                href={`?action=delete&id=${node.id}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-red-600")}
              >
                Löschen
              </Link>
            </span>
          </div>
          {node.children.length > 0 && <OrgTreeView tree={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}
