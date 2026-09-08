"use client"

import { useTheme } from "@/components/theme-provider"
import { setThemeAction } from "@/app/theme-actions"
import { Check } from "lucide-react"

type ThemeOption = {
  id: string
  name: string
  description: string
  cardBg: string
  cardText: string
  cardMuted: string
  cardBorder: string
  previewHeader: string
  previewPrimary: string
  previewPrimaryText: string
  previewBg: string
}

const THEMES: ThemeOption[] = [
  {
    id: "hell",
    name: "Hell",
    description: "Standard in klarem Weiß und neutralem Grau",
    cardBg: "#ffffff",
    cardText: "#18181b",
    cardMuted: "#71717a",
    cardBorder: "#e4e4e7",
    previewHeader: "#f4f4f5",
    previewPrimary: "#18181b",
    previewPrimaryText: "#ffffff",
    previewBg: "#ffffff",
  },
  {
    id: "dunkel",
    name: "Dunkel",
    description: "Modernes dunkles Design für augenschonendes Arbeiten",
    cardBg: "#18181b",
    cardText: "#fafafa",
    cardMuted: "#a1a1aa",
    cardBorder: "#3f3f46",
    previewHeader: "#27272a",
    previewPrimary: "#fafafa",
    previewPrimaryText: "#18181b",
    previewBg: "#18181b",
  },
  {
    id: "kontrast",
    name: "Starker Kontrast",
    description: "Maximaler Kontrast nach WCAG-AA (Weiß & Schwarz)",
    cardBg: "#ffffff",
    cardText: "#000000",
    cardMuted: "#000000",
    cardBorder: "#000000",
    previewHeader: "#eeeeee",
    previewPrimary: "#000000",
    previewPrimaryText: "#ffffff",
    previewBg: "#ffffff",
  },
  {
    id: "sap90",
    name: "SAP-Klassik (90er)",
    description: "Menü #316AC5, Fenster #F1F4F9, Buttons #FBF206",
    cardBg: "#f1f4f9",
    cardText: "#000000",
    cardMuted: "#333333",
    cardBorder: "#a9a9a9",
    previewHeader: "#316ac5",
    previewPrimary: "#fbf206",
    previewPrimaryText: "#000000",
    previewBg: "#ffffff",
  },
  {
    id: "kompakt",
    name: "Kompakt",
    description: "Farben wie Hell, 14px-Schrift und dichte Abstände",
    cardBg: "#ffffff",
    cardText: "#0f172a",
    cardMuted: "#64748b",
    cardBorder: "#cbd5e1",
    previewHeader: "#f8fafc",
    previewPrimary: "#0f172a",
    previewPrimaryText: "#ffffff",
    previewBg: "#ffffff",
  },
  {
    id: "gruen",
    name: "Entspannt Grün",
    description: "Sanfter Hellgrün-Grund mit gedecktem Waldgrün",
    cardBg: "#f4f8f4",
    cardText: "#1b4332",
    cardMuted: "#2d6a4f",
    cardBorder: "#b7e4c7",
    previewHeader: "#e2f0d9",
    previewPrimary: "#2d6a4f",
    previewPrimaryText: "#ffffff",
    previewBg: "#ffffff",
  },
  {
    id: "herbst",
    name: "Herbstnebel",
    description: "Nebel #90AFC5, Stein #336B87, Laub #763626",
    cardBg: "#f4f7f9",
    cardText: "#2a3132",
    cardMuted: "#336b87",
    cardBorder: "#90afc5",
    previewHeader: "#336b87",
    previewPrimary: "#763626",
    previewPrimaryText: "#ffffff",
    previewBg: "#ffffff",
  },
  {
    id: "tiefsee",
    name: "Tiefsee",
    description: "Blue Black #021C1E, Rain #2C7873, Greenery #6FB98F",
    cardBg: "#021c1e",
    cardText: "#ebf5ee",
    cardMuted: "#6fb98f",
    cardBorder: "#2c7873",
    previewHeader: "#004445",
    previewPrimary: "#6fb98f",
    previewPrimaryText: "#021c1e",
    previewBg: "#004445",
  },
  {
    id: "marine",
    name: "Marine & Elfenbein",
    description: "Elfenbein #F1F3CE, Navy #00293C, Candy #F62A00",
    cardBg: "#f1f3ce",
    cardText: "#00293c",
    cardMuted: "#1e656d",
    cardBorder: "#1e656d",
    previewHeader: "#00293c",
    previewPrimary: "#f62a00",
    previewPrimaryText: "#ffffff",
    previewBg: "#ffffff",
  },
]

export function ThemeSelector({ currentTheme }: { currentTheme?: string }) {
  const { theme, setTheme } = useTheme()
  const activeTheme = theme || currentTheme || "hell"

  return (
    <form action={setThemeAction}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((t) => {
          const isSelected = activeTheme === t.id
          return (
            <button
              key={t.id}
              type="submit"
              name="theme"
              value={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                backgroundColor: t.cardBg,
                borderColor: isSelected ? "#2563eb" : t.cardBorder,
                color: t.cardText,
                boxShadow: isSelected
                  ? "0 0 0 2px #2563eb, 0 4px 12px rgba(37,99,235,0.25)"
                  : "0 1px 3px rgba(0,0,0,0.06)",
              }}
              className="flex flex-col text-left p-3.5 rounded-lg border-2 transition-all relative cursor-pointer hover:opacity-95"
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="font-semibold text-sm" style={{ color: t.cardText }}>
                  {t.name}
                </span>
                {isSelected ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs shrink-0">
                    <Check className="size-3 stroke-[3]" />
                    Aktiv
                  </span>
                ) : (
                  <span
                    className="size-3.5 rounded-full border opacity-40 shrink-0"
                    style={{ borderColor: t.cardText }}
                  />
                )}
              </div>

              <p
                className="text-xs line-clamp-2 mb-3 min-h-[2rem]"
                style={{ color: t.cardMuted }}
              >
                {t.description}
              </p>

              {/* Mini-Fenstervorschau */}
              <div
                className="mt-auto w-full rounded border overflow-hidden shadow-2xs flex flex-col"
                style={{ borderColor: t.cardBorder, backgroundColor: t.previewBg }}
              >
                <div
                  className="h-4.5 px-2 flex items-center justify-between"
                  style={{ backgroundColor: t.previewHeader }}
                >
                  <div className="flex items-center gap-1">
                    <div className="size-1.5 rounded-full bg-white/80" />
                    <div className="h-1 w-6 rounded bg-white/40" />
                  </div>
                  <div className="h-1 w-3 rounded bg-white/40" />
                </div>
                <div className="p-2 flex items-center justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div
                      className="h-1.5 w-14 rounded opacity-75"
                      style={{ backgroundColor: t.cardText }}
                    />
                    <div
                      className="h-1 w-9 rounded opacity-45"
                      style={{ backgroundColor: t.cardMuted }}
                    />
                  </div>
                  <div
                    className="px-2 py-0.5 rounded text-[9px] font-bold shrink-0 shadow-xs"
                    style={{ backgroundColor: t.previewPrimary, color: t.previewPrimaryText }}
                  >
                    Aktion
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </form>
  )
}
