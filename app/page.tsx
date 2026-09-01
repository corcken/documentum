import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { loginAction } from "@/app/actions"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()

  if (session?.user) {
    const userExists = session.user.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true },
        })
      : null

    if (userExists) {
      // Gültige Session: weiter zum Dashboard.
      redirect("/dashboard")
    }

    // Verwaiste Session (User existiert nicht mehr, z. B. nach DB-Reset):
    // über den Cleanup-Route-Handler das JWT-Cookie entsorgen lassen,
    // damit kein Redirect-Loop entsteht. Server Components dürfen Cookies
    // nicht selbst ändern.
    redirect("/api/auth/cleanup")
  }

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Documentum Login</CardTitle>
          <CardDescription>
            Melde dich mit deinen Zugangsdaten an
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error === "CredentialsSignin" && (
            <div className="mb-4 p-3 text-sm text-red-800 bg-red-100 rounded-md">
              Ungültige E-Mail oder Passwort.
            </div>
          )}
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="admin@example.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                required 
              />
            </div>
            <Button type="submit" className="w-full mt-4">
              Anmelden
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Demo Admin: admin@example.com</p>
            <p>Passwort: password123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
