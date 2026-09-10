import { requireAdmin, requireAdminId } from "@/lib/auth-guard"
import { getImpersonationUsers } from "@/lib/services/development"
import { prisma } from "@/lib/prisma"
import { getTranslations } from "next-intl/server"
import { impersonateUserAction } from "./actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import {
  Wrench,
  LogIn,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  ClipboardList,
} from "lucide-react"

export default async function EntwicklungPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; error?: string }>
}) {
  await requireAdmin()
  const currentAdminId = await requireAdminId()
  const t = await getTranslations("Development")
  const sp = await searchParams

  const search = sp.search?.trim() || undefined
  const roleFilter = sp.role?.trim() || undefined

  const [users, allRoles] = await Promise.all([
    getImpersonationUsers({ search, roleFilter }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  // Schnellauswahl wichtiger Test-Personas (z. B. Prüfer, Freigeber, andere Rollen)
  const personaReviewer = users.find(
    (u) => u.email === "pruefer@example.com" || u.roleName === "REVIEWER"
  )
  const personaApprover = users.find(
    (u) => u.email === "freigeber@example.com" || u.roleName === "APPROVER"
  )

  const quickPersonas = [personaReviewer, personaApprover].filter(
    (u, index, self): u is NonNullable<typeof u> =>
      Boolean(u) && self.findIndex((o) => o?.id === u?.id) === index
  )

  return (
    <div className="space-y-8">
      {/* Kopfbereich */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Wrench className="mr-1 size-3" />
              {t("badge")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Fehlermeldungen */}
      {sp.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="size-5 shrink-0" />
          <span>
            {sp.error === "missing_user"
              ? t("errorMissingUser")
              : sp.error === "ImpersonationFailed"
                ? t("errorImpersonationFailed")
                : decodeURIComponent(sp.error)}
          </span>
        </div>
      )}

      {/* Entwicklungs-Hinweisbox */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="size-5" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="font-semibold text-amber-900 dark:text-amber-200">
                {t("noticeTitle")}
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                {t("noticeDesc")}
              </p>
              <p className="font-medium text-amber-900/90 dark:text-amber-200/90">
                {t("noReturnHint")}
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 pt-1">
                {t("auditNote")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick-Switch Karten (typische Test-Personas) */}
      {quickPersonas.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">{t("quickSwitchTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("quickSwitchSubtitle")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickPersonas.map((p) => {
              const isCurrent = p.id === currentAdminId
              return (
                <Card key={p.id} className="relative overflow-hidden transition-shadow hover:shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{p.name || p.email}</CardTitle>
                        <CardDescription className="text-xs">{p.email}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {p.roleName ?? "—"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0">
                    <div className="text-xs text-muted-foreground">
                      {p.openTaskCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                          <ClipboardList className="size-3.5" />
                          {t("openTasksCount", { count: p.openTaskCount })}
                        </span>
                      ) : (
                        <span>{t("noTasks")}</span>
                      )}
                    </div>
                    {isCurrent ? (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="mr-1 size-3 text-green-600" />
                        {t("currentActive")}
                      </Badge>
                    ) : (
                      <form action={impersonateUserAction}>
                        <input type="hidden" name="targetUserId" value={p.id} />
                        <Button type="submit" size="sm" className="gap-1.5">
                          <LogIn className="size-3.5" />
                          {t("loginAs")}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Alle Benutzer mit Filter & Suche */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("allUsersTitle")}</CardTitle>
          <CardDescription>{t("allUsersSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Such- & Filterleiste (funktioniert ohne Client-JS via GET) */}
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search ?? ""}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="role-select" className="text-xs font-medium text-muted-foreground">
                {t("filterRole")}:
              </label>
              <select
                id="role-select"
                name="role"
                defaultValue={roleFilter ?? "ALL"}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">{t("allRoles")}</option>
                {allRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary" size="sm">
              {t("filterButton")}
            </Button>
            {(search || roleFilter) && (
              <Link href="/admin/entwicklung">
                <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs">
                  <RotateCcw className="size-3" />
                  {t("resetFilter")}
                </Button>
              </Link>
            )}
          </form>

          {/* Benutzer-Tabelle */}
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("thUser")}</TableHead>
                  <TableHead>{t("thRole")}</TableHead>
                  <TableHead>{t("thDepartment")}</TableHead>
                  <TableHead>{t("thJobRole")}</TableHead>
                  <TableHead>{t("thTasks")}</TableHead>
                  <TableHead className="text-right">{t("thAction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      {t("noUsersFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isCurrent = u.id === currentAdminId
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{u.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          {u.roleName ? (
                            <Badge
                              variant="outline"
                              className={
                                u.roleName === "ADMIN"
                                  ? "border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300"
                                  : u.roleName === "EDITOR"
                                    ? "border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300"
                                    : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
                              }
                            >
                              {u.roleName}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.departmentName ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.jobRoleName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {u.openTaskCount > 0 ? (
                            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <ClipboardList className="size-3" />
                              {u.openTaskCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCurrent ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <UserCheck className="mr-1 size-3 text-green-600" />
                              {t("currentActive")}
                            </Badge>
                          ) : (
                            <form action={impersonateUserAction} className="inline-block">
                              <input type="hidden" name="targetUserId" value={u.id} />
                              <Button type="submit" size="sm" variant="default" className="gap-1.5">
                                <LogIn className="size-3.5" />
                                {t("loginAs")}
                              </Button>
                            </form>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
