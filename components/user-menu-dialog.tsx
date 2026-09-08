"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { logoutAction } from "@/app/actions"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, LogOut, Settings, X } from "lucide-react"

export interface UserMenuDialogProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
    avatarStorageKey?: string | null
  }
}

/**
 * Konsolidiertes Benutzermenü im Header:
 * Zeigt Profilbild (Kreis) und Namen als Trigger.
 * Beim Klick klappt ein modaler Dialog direkt unter dem Trigger aus,
 * mit Profilübersicht, Link zu den Einstellungen (/konto) und Abmelde-Aktion.
 */
export function UserMenuDialog({ user }: UserMenuDialogProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const t = useTranslations("UserMenu")
  const tHeader = useTranslations("AppHeader")

  const displayName = user.name?.trim() || user.email?.trim() || "Benutzer"

  // Schließen bei Escape-Taste
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger: Kreis mit Profilbild und Name */}
      <button
        type="button"
        data-slot="user-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-muted/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer text-inherit group select-none"
        aria-label={tHeader("userMenuAria")}
      >
        <UserAvatar
          name={user.name}
          email={user.email}
          storageKey={user.avatarStorageKey}
          size="sm"
        />
        <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px] text-inherit group-hover:opacity-90">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 opacity-60 text-inherit transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          {/* Modal-Hintergrund (Overlay): Klick schließt das Menü */}
          <div
            data-slot="dialog-overlay"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Ausklappbares Modal: Positioniert direkt unter dem Header-Trigger */}
          <div
            data-slot="dialog-content"
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm z-50 rounded-xl bg-popover p-4 text-sm text-popover-foreground border border-border shadow-2xl outline-none flex flex-col gap-3.5"
          >
            {/* Header mit Titel und Schließen-Button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base leading-none text-foreground">
                  {t("title")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("description")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer -mr-1 -mt-1"
                aria-label={t("close")}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Profilübersicht */}
            <div className="flex items-center gap-3.5 p-3 rounded-lg bg-muted/50 border border-border">
              <UserAvatar
                name={user.name}
                email={user.email}
                storageKey={user.avatarStorageKey}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm truncate">
                  {displayName}
                </div>
                {user.email && (
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                )}
                {user.role && (
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-medium">
                      {user.role}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation zu den Benutzereinstellungen */}
            <div className="space-y-1">
              <Link
                href="/konto"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/70 text-card-foreground transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                    <Settings className="size-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">
                      {t("settings")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("settingsDesc")}
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* Footer mit Schließen & Abmelden */}
            <div
              data-slot="dialog-footer"
              className="-mx-4 -mb-4 flex flex-row items-center justify-between border-t border-border bg-muted/50 p-3 rounded-b-xl"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="cursor-pointer"
              >
                {t("close")}
              </Button>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  {t("logout")}
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
