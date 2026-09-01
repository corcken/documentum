import { contentToText } from "@/lib/content"

/**
 * Leseansicht: zeigt den Inhalt als Text (Server-gerendert, ohne JS).
 * Bis der TipTap-Editor kommt. Alte TipTap-JSON-Inhalte werden
 * automatisch nach Text konvertiert (lib/content.ts).
 */
export function DocumentContent({ content }: { content: string | null }) {
  const text = contentToText(content)

  if (!text.trim()) {
    return <p className="text-sm text-gray-400">Kein Inhalt.</p>
  }

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
      {text}
    </div>
  )
}
