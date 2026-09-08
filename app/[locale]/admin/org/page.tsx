import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth-guard"
import { canManageDepartmentRoles, getDepartmentRolesAndLeads } from "@/lib/services/department-roles"
import { buildOrgTree, flattenOrgUnits } from "@/lib/org-tree"
import { OrgUnitForm } from "@/components/org-unit-form"
import { OrgViewContainer } from "@/components/org-view-container"
import { DepartmentRoleManager } from "@/components/department-role-manager"
import { deleteOrgUnitAction } from "./actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function OrgAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; parent?: string; id?: string; error?: string }>
}) {
  const session = await requireUser()
  const isAdmin = session.user.role === "ADMIN"
  const userId = session.user.id!

  const t = await getTranslations("Org")
  const tRoles = await getTranslations("DepartmentRoles")
  const sp = await searchParams

  const units = await prisma.department.findMany({ orderBy: { name: "asc" } })

  // Berechtigte Bereiche für diesen User ermitteln
  let manageableDepartmentIds: string[] = []
  if (isAdmin) {
    manageableDepartmentIds = units.map((u) => u.id)
  } else {
    const userLeads = await prisma.departmentLead.findMany({
      where: { userId },
      select: { departmentId: true },
    })
    if (userLeads.length === 0) {
      redirect("/dashboard")
    }
    const userLeadSet = new Set(userLeads.map((l) => l.departmentId))
    const parentMap = new Map(units.map((u) => [u.id, u.parentId]))
    const manageableSet = new Set<string>()
    for (const u of units) {
      let curr: string | null = u.id
      while (curr) {
        if (userLeadSet.has(curr)) {
          manageableSet.add(u.id)
          break
        }
        curr = parentMap.get(curr) ?? null
      }
    }
    manageableDepartmentIds = Array.from(manageableSet)
  }

  const tree = buildOrgTree(units)
  const flat = flattenOrgUnits(units)

  const showForm = isAdmin && (sp.action === "new" || sp.action === "edit")
  const editUnit = isAdmin && sp.action === "edit" && sp.id ? (units.find((u) => u.id === sp.id) ?? null) : null
  const deleteUnit = isAdmin && sp.action === "delete" && sp.id ? (units.find((u) => u.id === sp.id) ?? null) : null

  // Rollen & Leiter Ansicht
  let rolesData: Awaited<ReturnType<typeof getDepartmentRolesAndLeads>> | null = null
  let activeUsers: { id: string; name: string | null; email: string }[] = []
  let appDefaultQuorum = "alle"
  let rolesAccessDenied = false

  if (sp.action === "roles" && sp.id) {
    const canManage = await canManageDepartmentRoles(userId, sp.id)
    if (!canManage) {
      rolesAccessDenied = true
    } else {
      rolesData = await getDepartmentRolesAndLeads(sp.id)
      activeUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
      const quorumSetting = await prisma.appSetting.findUnique({
        where: { key: "workflow.quorum" },
      })
      appDefaultQuorum = quorumSetting?.value ?? "alle"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {isAdmin && (
          <Link href="?action=new" className={buttonVariants()}>
            <Plus className="size-4" /> {t("newUnit")}
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

      {sp.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {sp.error}
        </div>
      )}

      {rolesAccessDenied && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {tRoles("accessDenied")}
        </div>
      )}

      {rolesData && (
        <DepartmentRoleManager
          department={rolesData.department}
          leads={rolesData.leads}
          ersteller={rolesData.ersteller}
          pruefer={rolesData.pruefer}
          freigeber={rolesData.freigeber}
          activeUsers={activeUsers}
          appDefaultQuorum={appDefaultQuorum}
        />
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
      <OrgViewContainer
        tree={tree}
        showAdminActions={isAdmin}
        manageableDepartmentIds={manageableDepartmentIds}
      />
    </div>
  )
}
