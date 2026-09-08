import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const isAdmin = session.user.role === "ADMIN"
  if (!isAdmin) {
    const isLead = session.user.id
      ? (await prisma.departmentLead.findFirst({ where: { userId: session.user.id } })) !== null
      : false
    if (!isLead) {
      redirect("/dashboard")
    }
  }
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
    </div>
  )
}
