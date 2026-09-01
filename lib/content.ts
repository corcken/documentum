/**
 * Inhalts-Helfer: Übergangszeit bis zum TipTap-Editor.
 *
 * Bis dahin wird der Dokumentinhalt als reiner Text gespeichert.
 * Ältere Demo-Inhalte liegen noch als TipTap-JSON vor — die werden
 * beim Anzeigen/Bearbeiten nach Text konvertiert, damit nichts verloren
 * geht und nichts als Roh-JSON auftaucht.
 */

/** Erkennt, ob ein Inhalt noch TipTap-JSON ist (z. B. aus der Seed-Phase). */
export function isTipTapJson(content: string | null | undefined): boolean {
  if (!content) return false
  const trimmed = content.trim()
  return trimmed.startsWith("{") && trimmed.includes('"type"')
}

/** Konvertiert TipTap-JSON (StarterKit-Subset) in lesbaren Text. */
export function tipTapJsonToText(json: string): string {
  try {
    const doc = JSON.parse(json)
    return renderNodes(doc.content ?? [])
  } catch {
    // Kein gültiges JSON — Inhalt so lassen, wie er ist.
    return json
  }
}

function renderNodes(nodes: unknown[]): string {
  return nodes.map(renderNode).join("")
}

function renderNode(node: any): string {
  switch (node.type) {
    case "paragraph":
      return `${renderNodes(node.content ?? [])}\n\n`
    case "heading":
      return `${"#".repeat(node.attrs?.level ?? 1)} ${renderNodes(node.content ?? [])}\n\n`
    case "text":
      return node.text ?? ""
    case "bulletList":
      return `${renderNodes(node.content ?? [])}\n`
    case "orderedList":
      return `${renderNodes(node.content ?? [])}\n`
    case "listItem": {
      const parent = node.parentType ?? ""
      const prefix = parent === "orderedList" ? "1. " : "- "
      return `${prefix}${renderNodes(node.content ?? []).trimEnd()}\n`
    }
    case "codeBlock":
      return `\`\`\`\n${renderNodes(node.content ?? [])}\`\`\`\n\n`
    case "blockquote":
      return `> ${renderNodes(node.content ?? [])}\n\n`
    case "horizontalRule":
      return `---\n\n`
    case "hardBreak":
      return "\n"
    default:
      return renderNodes(node.content ?? [])
  }
}

/** Liefert den Inhalt als lesbaren Text (JSON-Altdaten werden konvertiert). */
export function contentToText(content: string | null | undefined): string {
  if (!content) return ""
  return isTipTapJson(content) ? tipTapJsonToText(content) : content
}
