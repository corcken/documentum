"use client"

import React, { createContext, useContext, useEffect, useState, useTransition } from "react"
import { setThemeAction } from "@/app/theme-actions"

type ThemeContextType = {
  theme: string
  setTheme: (theme: string) => Promise<void>
  isPending: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "hell",
  setTheme: async () => {},
  isPending: false,
})

export function ThemeProvider({
  initialTheme = "hell",
  children,
}: {
  initialTheme?: string
  children: React.ReactNode
}) {
  const [theme, setLocalTheme] = useState(initialTheme)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const syncTheme = () => {
      const current = document.documentElement.getAttribute("data-theme")
      if (current && current !== theme) {
        setLocalTheme(current)
      }
    }
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    return () => observer.disconnect()
  }, [theme])

  const setTheme = async (newTheme: string) => {
    setLocalTheme(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    document.cookie = `documentum_theme=${encodeURIComponent(newTheme)}; path=/; max-age=31536000; SameSite=Lax`

    startTransition(async () => {
      try {
        await setThemeAction(newTheme)
      } catch (err) {
        console.error("Failed to save theme:", err)
      }
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isPending }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
