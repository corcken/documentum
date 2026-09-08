import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-guard"
import { buildOrgTree, flattenOrgUnits } from "@/lib/org-tree"
import { OrgUnitForm } from "@/components/org-unit-form"
import { OrgViewContainer } from "@/components/org-view-container"
import { deleteOrgUnitAction } from "./actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function OrgAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; parent?: string; id?: string; error?: string }>
}) {
  await requireAdmin()
  const t = await getTranslations("Org")
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
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="?action=new" className={buttonVariants()}>
          <Plus className="size-4" /> {t("newUnit")}
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("subtitle")}
      </p>

      {sp.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {sp.error}
        </div>
      )}

      {showForm && <OrgUnitForm unit={editUnit} parentId={sp.parent} units={flat} />}

      {deleteUnit && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
          <p className="text-sm text-red-900 dark:text-red-200">
            <strong>{deleteUnit.name}</strong> {t("deleteConfirm")}
          </p>
          <form action={deleteOrgUnitAction} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={deleteUnit.id} />
            <Button variant="destructive" size="sm" type="submit">
              {t("deleteConfirmButton")}
            </Button>
            <Link href="/admin/org" className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("cancel")}
            </Link>
          </form>
        </div>
      )}

      {/* Interaktive Organisations-Darstellung: Liste (Ordner-Stil) & Diagramm */}
      <OrgViewContainer tree={tree} showAdminActions={true} />
    </div>
  )
}
