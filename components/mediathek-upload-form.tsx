"use client"

import { useActionState, useRef, useEffect } from "react"
import { uploadAction } from "@/app/[locale]/mediathek/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle } from "lucide-react"

export function MediathekUploadForm({ isGlobal }: { isGlobal?: boolean }) {
  const [state, formAction, pending] = useActionState(uploadAction, null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.ok && fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [state?.ok])

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <form action={formAction} className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          name="file"
          required
          className="max-w-[250px]"
        />
        {isGlobal && <input type="hidden" name="isGlobal" value="true" />}
        <Button type="submit" disabled={pending}>
          <Upload className="size-4 mr-2" />
          {pending ? "Wird hochgeladen…" : "Hochladen"}
        </Button>
      </form>
      {state?.error && (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="size-3.5 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
    </div>
  )
}
