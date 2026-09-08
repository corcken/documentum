"use client"

import { useTheme } from "@/components/theme-provider"
import { setThemeAction } from "@/app/theme-actions"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dunkel"
  const nextTheme = isDark ? "hell" : "dunkel"

  return (
    <form action={setThemeAction} className="inline-flex items-center">
      <input type="hidden" name="theme" value={nextTheme} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        onClick={() => setTheme(nextTheme)}
        className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
        title={isDark ? "Zu hellem Design wechseln" : "Zu dunklem Design wechseln"}
        aria-label="Design umschalten (Hell/Dunkel)"
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </form>
  )
}
