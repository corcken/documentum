import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-guard"
import { flattenOrgUnits } from "@/lib/org-tree"
import { getUserAvatars } from "@/lib/services/avatar"
import { UserForm } from "@/components/user-form"
import { UserAvatar } from "@/components/user-avatar"
import { setUserActiveAction, unlockUserAction } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { DEPARTMENT_ROLE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Plus, Search, LockOpen, RotateCcw } from "lucide-react"

export default async function BenutzerAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string
    id?: string
    error?: string
    q?: string
    role?: string
    dept?: string
    status?: string
  }>
}) {
  const session = await requireAdmin()
  const currentAdminId = session.user.id!
  const sp = await searchParams

  const [allUsers, units, jobRoles, roles] = await Promise.all([
    prisma.user.findMany({
      include: {
        department: true,
        jobRole: true,
        role: true,
        departmentLeads: { include: { department: { select: { name: true, abbreviation: true } } } },
        departmentRoleAssignments: { include: { department: { select: { name: true, abbreviation: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany(),
    prisma.jobRole.findMany({ orderBy: { name: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  const now = new Date()
  const avatarMap = await getUserAvatars(allUsers.map((u) => u.id))
  const flat = flattenOrgUnits(units)

  const q = sp.q?.trim().toLowerCase() ?? ""
  const roleFilter = sp.role ?? ""
  const deptFilter = sp.dept ?? ""
  const statusFilter = sp.status ?? ""

  const users = allUsers.filter((u) => {
    if (q) {
      const hitName = (u.name ?? "").toLowerCase().includes(q)
      const hitEmail = u.email.toLowerCase().includes(q)
      if (!hitName && !hitEmail) return false
    }
    if (roleFilter && u.role?.name !== roleFilter) return false
    if (deptFilter && u.departmentId !== deptFilter) return false
    const isLocked = Boolean(u.lockedUntil && u.lockedUntil > now)
    if (statusFilter === "active" && !u.isActive) return false
    if (statusFilter === "inactive" && u.isActive) return false
    if (statusFilter === "locked" && !isLocked) return false
    if (statusFilter === "external" && !u.isExternal) return false
    return true
  })

  const showForm = sp.action === "new" || sp.action === "edit"
  const editUser = sp.action === "edit" && sp.id ? (allUsers.find((u) => u.id === sp.id) ?? null) : null
  const hasFilters = Boolean(q || roleFilter || deptFilter || statusFilter)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Benutzer (${users.length}/${allUsers.length})`}
        actions={
          <Link href="?action=new" className={buttonVariants()}>
            <Plus className="size-4" /> Neuer Benutzer
          </Link>
        }
      />

      {sp.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{sp.error}</div>
      )}

      {showForm && <UserForm user={editUser} units={flat} jobRoles={jobRoles} roles={roles} />}

      {/* Such- und Filterleiste */}
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Name oder E-Mail suchen…"
            className="pl-8"
          />
        </div>
        <select
          name="role"
          defaultValue={roleFilter}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Alle System-Rollen</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          name="dept"
          defaultValue={deptFilter}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Alle Bereiche</option>
          {flat.map((u) => (
            <option key={u.id} value={u.id}>
              {"\u00A0".repeat(u.depth * 2)}
              {u.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
          <option value="locked">Vorübergehend gesperrt</option>
          <option value="external">Externe Benutzer</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filtern
        </Button>
        {hasFilters && (
          <Link href="/admin/benutzer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <RotateCcw className="mr-1 size-3.5" /> Zurücksetzen
          </Link>
        )}
      </form>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Benutzer</TableHead>
              <TableHead>Organisationseinheit & Bereichsrollen</TableHead>
              <TableHead>Job-Rolle</TableHead>
              <TableHead>System-Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Keine Benutzer gefunden.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const isLocked = Boolean(u.lockedUntil && u.lockedUntil > now)
              const isSelf = u.id === currentAdminId

              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={u.name}
                        email={u.email}
                        storageKey={avatarMap.get(u.id)}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>{u.name || "—"}</span>
                          {u.isExternal && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Extern
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="text-foreground">{u.department?.name ?? "—"}</div>
                    {(u.departmentLeads.length > 0 || u.departmentRoleAssignments.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {u.departmentLeads.map((l) => (
                          <Badge key={`lead-${l.departmentId}`} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                            Leiter: {l.department.abbreviation || l.department.name}
                          </Badge>
                        ))}
                        {u.departmentRoleAssignments.map((ra) => (
                          <Badge key={ra.id} variant="outline" className="text-[10px] px-1.5 py-0">
                            {DEPARTMENT_ROLE_LABELS[ra.role] ?? ra.role}: {ra.department.abbreviation || ra.department.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.jobRole?.name ?? "—"}</TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge variant="outline">{u.role.name}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {u.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                        >
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400"
                        >
                          Inaktiv
                        </Badge>
                      )}
                      {isLocked && (
                        <Badge variant="destructive" className="text-[10px]">
                          Gesperrt bis {new Date(u.lockedUntil!).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {isLocked && (
                        <form action={unlockUserAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            type="submit"
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "gap-1 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800"
                            )}
                            title="Sperre aufheben"
                          >
                            <LockOpen className="size-3.5" /> Entsperren
                          </button>
                        </form>
                      )}
                      <Link
                        href={`?action=edit&id=${u.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Bearbeiten
                      </Link>
                      {!isSelf && (
                        <form action={setUserActiveAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="active" value={u.isActive ? "off" : "on"} />
                          <button
                            type="submit"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              u.isActive ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {u.isActive ? "Deaktivieren" : "Aktivieren"}
                          </button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
