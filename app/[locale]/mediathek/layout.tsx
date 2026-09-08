import { requireUser } from "@/lib/auth-guard"
import { AppHeader } from "@/components/app-header"

export default async function MediathekLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUser()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-7xl p-8">{children}</main>
    </div>
  )
}
