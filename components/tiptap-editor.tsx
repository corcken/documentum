"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TiptapEditor({ value, onChange }: { value: string; onChange: (json: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value ? (JSON.parse(value) as object) : "",
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "tiptap min-h-[300px] px-4 py-3" },
    },
  })

  if (!editor) return null

  function ToolbarButton({
    active,
    title,
    onClick,
    children,
  }: {
    active?: boolean
    title: string
    onClick: () => void
    children: React.ReactNode
  }) {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant={active ? "secondary" : "ghost"}
        title={title}
        aria-label={title}
        onClick={onClick}
      >
        {children}
      </Button>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-gray-50 px-2 py-1.5">
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          title="Überschrift 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          title="Überschrift 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-gray-300" />
        <ToolbarButton active={editor.isActive("bold")} title="Fett" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} title="Kursiv" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-gray-300" />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          title="Aufzählung"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          title="Nummerierte Liste"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-gray-300" />
        <ToolbarButton title="Rückgängig" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton title="Wiederholen" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
