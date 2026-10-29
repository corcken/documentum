import { requireUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import Link from "next/link"
import {
  Users,
  Network,
  FileText,
  Briefcase,
  Archive,
  Mail,
  ShieldCheck,
  BarChart3,
  Settings,
  Wrench,
} from "lucide-react"

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
  const showDevTools =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_PRODUCTION_IMPERSONATION === "true"

  const adminNavItems = [
    { href: "/admin/benutzer", label: "Benutzer", icon: Users, show: isAdmin },
    { href: "/admin/org", label: "Organisation", icon: Network, show: true },
    { href: "/admin/dokumenttypen", label: "Dokumenttypen", icon: FileText, show: isAdmin },
    { href: "/admin/jobrollen", label: "Job-Rollen", icon: Briefcase, show: isAdmin },
    { href: "/admin/archiv", label: "Archiv", icon: Archive, show: isAdmin },
    { href: "/admin/email", label: "E-Mail", icon: Mail, show: isAdmin },
    { href: "/admin/audit", label: "Audit-Log", icon: ShieldCheck, show: isAdmin },
    { href: "/admin/auswertungen", label: "Auswertungen", icon: BarChart3, show: isAdmin },
    { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings, show: isAdmin },
    { href: "/admin/entwicklung", label: "Entwicklung", icon: Wrench, show: isAdmin && showDevTools },
  ].filter((item) => item.show)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      {adminNavItems.length > 1 && (
        <div className="border-b border-border/60 bg-muted/30">
          <nav
            aria-label="Verwaltungs-Navigation"
            className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-6 py-2 text-xs"
          >
            {adminNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
    </div>
  )
}
