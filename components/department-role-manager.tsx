import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, UserCheck, ArrowRightLeft, Check, ChevronLeft } from "lucide-react"
import { DEPARTMENT_ROLES } from "@/lib/constants"
import {
  addDepartmentLeadAction,
  removeDepartmentLeadAction,
  addDepartmentRoleAction,
  removeDepartmentRoleAction,
  replaceDepartmentRoleAction,
  setDepartmentQuorumAction,
} from "@/app/[locale]/admin/org/actions"

type UserItem = {
  id: string
  name: string | null
  email: string
  openTasksCount?: number
}

interface DepartmentRoleManagerProps {
  department: {
    id: string
    name: string
    abbreviation: string | null
    quorumMode: string | null
  }
  leads: UserItem[]
  ersteller: UserItem[]
  pruefer: UserItem[]
  freigeber: UserItem[]
  activeUsers: UserItem[]
  appDefaultQuorum: string
}

export async function DepartmentRoleManager({
  department,
  leads,
  ersteller,
  pruefer,
  freigeber,
  activeUsers,
  appDefaultQuorum,
}: DepartmentRoleManagerProps) {
  const t = await getTranslations("DepartmentRoles")

  const currentQuorumLabel =
    department.quorumMode === "einer"
      ? t("quorumEiner")
      : department.quorumMode === "alle"
        ? t("quorumAlle")
        : `${t("quorumDefault")} (${appDefaultQuorum === "einer" ? t("quorumEiner") : t("quorumAlle")})`

  return (
    <div className="space-y-6 rounded-xl border border-border/80 bg-card p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">
              {t("title")}: {department.name}
            </h2>
            {department.abbreviation && (
              <Badge variant="outline" className="font-mono">
                {department.abbreviation}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/admin/org"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ChevronLeft className="mr-1 size-4" />
          Zurück zur Organisation
        </Link>
      </div>

      {/* Quorum Override */}
      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">{t("quorumTitle")}</CardTitle>
              <CardDescription className="text-xs">{t("quorumDesc")}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              {currentQuorumLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form action={setDepartmentQuorumAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="departmentId" value={department.id} />
            <select
              name="quorumMode"
              defaultValue={department.quorumMode ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">{t("quorumDefault")} ({appDefaultQuorum})</option>
              <option value="alle">{t("quorumAlle")}</option>
              <option value="einer">{t("quorumEiner")}</option>
            </select>
            <Button size="sm" type="submit" variant="secondary">
              {t("saveQuorum")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bereichsleiter */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t("leads")}</CardTitle>
          <CardDescription className="text-xs">{t("leadsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t("noLeads")}</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-md border text-sm">
              {leads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between p-2.5">
                  <div>
                    <span className="font-medium text-xs sm:text-sm">{lead.name ?? lead.email}</span>
                    {lead.name && <span className="ml-2 text-xs text-muted-foreground">({lead.email})</span>}
                  </div>
                  <form action={removeDepartmentLeadAction}>
                    <input type="hidden" name="departmentId" value={department.id} />
                    <input type="hidden" name="userId" value={lead.id} />
                    <Button variant="ghost" size="sm" type="submit" className="text-destructive hover:text-destructive h-7 px-2">
                      <X className="size-3.5 mr-1" /> {t("removeUser")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {/* Add lead */}
          <form action={addDepartmentLeadAction} className="flex flex-wrap items-center gap-2 pt-1">
            <input type="hidden" name="departmentId" value={department.id} />
            <select
              name="userId"
              required
              defaultValue=""
              className="h-8 rounded-md border border-input bg-background px-3 text-xs flex-1 max-w-sm"
            >
              <option value="" disabled>{t("selectUser")}</option>
              {activeUsers
                .filter((u) => !leads.some((l) => l.id === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
            </select>
            <Button size="sm" type="submit" variant="outline" className="h-8 text-xs">
              <UserCheck className="size-3.5 mr-1" /> {t("addLead")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Rollen Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Ersteller */}
        <RoleSection
          title={t("ersteller")}
          description={t("erstellerDesc")}
          role={DEPARTMENT_ROLES.ERSTELLER}
          departmentId={department.id}
          users={ersteller}
          activeUsers={activeUsers}
          t={t}
        />

        {/* Prüfer */}
        <RoleSection
          title={t("pruefer")}
          description={t("prueferDesc")}
          role={DEPARTMENT_ROLES.PRUEFER}
          departmentId={department.id}
          users={pruefer}
          activeUsers={activeUsers}
          t={t}
        />

        {/* Freigeber */}
        <RoleSection
          title={t("freigeber")}
          description={t("freigeberDesc")}
          role={DEPARTMENT_ROLES.FREIGEBER}
          departmentId={department.id}
          users={freigeber}
          activeUsers={activeUsers}
          t={t}
        />
      </div>
    </div>
  )
}

function RoleSection({
  title,
  description,
  role,
  departmentId,
  users,
  activeUsers,
  t,
}: {
  title: string
  description: string
  role: string
  departmentId: string
  users: UserItem[]
  activeUsers: UserItem[]
  t: any
}) {
  return (
    <Card className="flex flex-col border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-3">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">{t("noUsers")}</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-md border text-sm">
            {users.map((u) => (
              <li key={u.id} className="p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs truncate">{u.name ?? u.email}</div>
                    {u.name && <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>}
                  </div>
                  <form action={removeDepartmentRoleAction}>
                    <input type="hidden" name="departmentId" value={departmentId} />
                    <input type="hidden" name="role" value={role} />
                    <input type="hidden" name="userId" value={u.id} />
                    <Button variant="ghost" size="sm" type="submit" className="text-destructive hover:text-destructive h-6 px-1.5 text-xs">
                      <X className="size-3" />
                    </Button>
                  </form>
                </div>

                {/* Neubesetzung / Replace Inline */}
                <details className="text-xs pt-1 border-t border-border/40">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1 select-none">
                    <ArrowRightLeft className="size-3" />
                    {t("replaceUser")}
                  </summary>
                  <form action={replaceDepartmentRoleAction} className="mt-2 space-y-2 rounded bg-muted/40 p-2 border border-border/60">
                    <input type="hidden" name="departmentId" value={departmentId} />
                    <input type="hidden" name="role" value={role} />
                    <input type="hidden" name="oldUserId" value={u.id} />

                    {u.openTasksCount !== undefined && u.openTasksCount > 0 && (
                      <div className="rounded border border-amber-300 bg-amber-50 p-1.5 text-[11px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        ⚠️ {t("replaceWarning", { count: u.openTasksCount })}
                      </div>
                    )}

                    <select
                      name="newUserId"
                      required
                      defaultValue=""
                      className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="" disabled>{t("selectUser")}</option>
                      {activeUsers
                        .filter((au) => au.id !== u.id && !users.some((existing) => existing.id === au.id))
                        .map((au) => (
                          <option key={au.id} value={au.id}>
                            {au.name ? `${au.name} (${au.email})` : au.email}
                          </option>
                        ))}
                    </select>
                    <Button size="sm" type="submit" variant="default" className="w-full h-7 text-xs">
                      <Check className="size-3 mr-1" /> {t("replaceUser")}
                    </Button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}

        {/* Add user form */}
        <form action={addDepartmentRoleAction} className="space-y-1.5 pt-2 border-t">
          <input type="hidden" name="departmentId" value={departmentId} />
          <input type="hidden" name="role" value={role} />
          <div className="flex items-center gap-1.5">
            <select
              name="userId"
              required
              defaultValue=""
              className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs min-w-0"
            >
              <option value="" disabled>{t("selectUser")}</option>
              {activeUsers
                .filter((au) => !users.some((existing) => existing.id === au.id))
                .map((au) => (
                  <option key={au.id} value={au.id}>
                    {au.name ? `${au.name} (${au.email})` : au.email}
                  </option>
                ))}
            </select>
            <Button size="sm" type="submit" variant="outline" className="h-8 text-xs shrink-0">
              <UserCheck className="size-3.5 mr-1" /> {t("addUser")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
