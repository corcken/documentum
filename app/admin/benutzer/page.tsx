import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-guard"
import { flattenOrgUnits } from "@/lib/org-tree"
import { UserForm } from "@/components/user-form"
import { setUserActiveAction } from "./actions"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

export default async function BenutzerAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; id?: string; error?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams

  const [users, units, jobRoles, roles] = await Promise.all([
    prisma.user.findMany({
      include: { department: true, jobRole: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany(),
    prisma.jobRole.findMany({ orderBy: { name: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])
  const flat = flattenOrgUnits(units)

  const showForm = sp.action === "new" || sp.action === "edit"
  const editUser = sp.action === "edit" && sp.id ? (users.find((u) => u.id === sp.id) ?? null) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Benutzer</h1>
        <Link href="?action=new" className={buttonVariants()}>
          <Plus className="size-4" /> Neuer Benutzer
        </Link>
      </div>

      {sp.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{sp.error}</div>
      )}

      {showForm && <UserForm user={editUser} units={flat} jobRoles={jobRoles} roles={roles} />}

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Organisationseinheit</TableHead>
              <TableHead>Job-Rolle</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                  Keine Benutzer vorhanden.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || "—"}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell className="text-sm text-gray-600">{u.department?.name ?? "—"}</TableCell>
                <TableCell className="text-sm text-gray-600">{u.jobRole?.name ?? "—"}</TableCell>
                <TableCell>
                  {u.role ? (
                    <Badge variant="outline">{u.role.name}</Badge>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {u.isActive ? (
                    <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-500">Inaktiv</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`?action=edit&id=${u.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Bearbeiten
                    </Link>
                    <form action={setUserActiveAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={u.isActive ? "off" : "on"} />
                      <button
                        type="submit"
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          u.isActive ? "text-red-600" : "text-green-700"
                        )}
                      >
                        {u.isActive ? "Deaktivieren" : "Aktivieren"}
                      </button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
