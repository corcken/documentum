import { requireUser } from "@/lib/auth-guard"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { buttonVariants } from "@/components/ui/button"
import { formatVersion } from "@/lib/version"
import { diffLines } from "diff"
import { ChevronLeft } from "lucide-react"

/** Extrahiert den Text aus einem TipTap-JSON-Dokument. */
function tiptapToText(json: string | null): string {
  if (!json) return ""
  try {
    const doc = JSON.parse(json)
    const out: string[] = []
    function walk(n: { type?: string; text?: string; content?: unknown[] }) {
      if (n.type === "text" && n.text) out.push(n.text)
      if (n.type === "paragraph" || n.type === "heading") out.push("\n")
      if (n.type === "listItem") out.push("• ")
      if (n.content) n.content.forEach((c) => walk(c as never))
    }
    walk(doc)
    return out.join("")
  } catch {
    return ""
  }
}

export default async function DiffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ von?: string; bis?: string }>
}) {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")

  const { id } = await params
  const sp = await searchParams
  if (!sp.von || !sp.bis) notFound()

  const [von, bis] = await Promise.all([
    prisma.documentVersion.findUnique({ where: { id: sp.von } }),
    prisma.documentVersion.findUnique({ where: { id: sp.bis } }),
  ])
  if (!von || !bis || von.documentId !== id || bis.documentId !== id) notFound()

  const textVon = tiptapToText(von.content)
  const textBis = tiptapToText(bis.content)
  const parts = diffLines(textVon, textBis)
  const additions = parts.filter((p) => p.added).reduce((n, p) => n + p.count, 0)
  const removals = parts.filter((p) => p.removed).reduce((n, p) => n + p.count, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/documents/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="size-4" /> Zurück
        </Link>
        <h1 className="text-2xl font-bold">Versionsvergleich</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-gray-100 px-2 py-1 font-mono">
          {formatVersion(von.majorVersion, von.minorVersion)}
        </span>
        <span>→</span>
        <span className="rounded-md bg-gray-100 px-2 py-1 font-mono">
          {formatVersion(bis.majorVersion, bis.minorVersion)}
        </span>
        <span className="ml-2 text-gray-500">
          {additions} Zeile(n) hinzugefügt · {removals} Zeile(n) entfernt
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
          Änderungen (rot = entfernt, grün = hinzugefügt)
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3 font-mono text-sm leading-relaxed">
          {parts.length === 0 && <p className="text-gray-400">Keine Text-Änderungen erkannt.</p>}
          {parts.map((part, i) => {
            const lines = part.value.replace(/\n$/, "").split("\n")
            if (part.added) {
              return (
                <div key={i} className="bg-green-50 text-green-900">
                  {lines.map((l, j) => (
                    <div key={j} className="px-2">
                      + {l || " "}
                    </div>
                  ))}
                </div>
              )
            }
            if (part.removed) {
              return (
                <div key={i} className="bg-red-50 text-red-800 line-through">
                  {lines.map((l, j) => (
                    <div key={j} className="px-2">
                      − {l || " "}
                    </div>
                  ))}
                </div>
              )
            }
            return (
              <div key={i} className="text-gray-600">
                {lines.map((l, j) => (
                  <div key={j} className="px-2">
                    {l || " "}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
