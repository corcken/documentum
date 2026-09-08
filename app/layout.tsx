import type { Metadata } from "next"
import { cookies } from "next/headers"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Documentum",
  description: "QM-Dokumentenmanagement und Schulungen",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const cookieTheme = cookieStore.get("documentum_theme")?.value
  let initialTheme = cookieTheme

  if (!initialTheme) {
    const session = await auth()
    if (session?.user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { theme: true },
      })
      initialTheme = dbUser?.theme || undefined
    }
  }
  initialTheme = initialTheme || "hell"

  return (
    <html lang="de" data-theme={initialTheme} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )documentum_theme=([^;]+)/);if(m&&m[1]){document.documentElement.setAttribute('data-theme',decodeURIComponent(m[1]));}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider initialTheme={initialTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
