"use server"

import { cookies } from "next/headers"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const ALLOWED_THEMES = [
  "hell",
  "dunkel",
  "kontrast",
  "sap90",
  "kompakt",
  "gruen",
  "herbst",
  "tiefsee",
  "marine",
] as const
export type ThemeName = (typeof ALLOWED_THEMES)[number]

export async function setThemeAction(themeOrFormData: string | FormData) {
  const theme =
    typeof themeOrFormData === "string"
      ? themeOrFormData
      : String(themeOrFormData.get("theme") ?? "")

  if (!ALLOWED_THEMES.includes(theme as ThemeName)) {
    throw new Error("Ungültiges Theme")
  }

  const cookieStore = await cookies()
  cookieStore.set("documentum_theme", theme, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  })

  const session = await auth()
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { theme },
    })
  }

  revalidatePath("/konto")
}
