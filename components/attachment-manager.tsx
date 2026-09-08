"use client"

import { useActionState, useRef, useEffect } from "react"
import { FileAsset, FileAssetUse } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Paperclip, Plus, Trash, AlertCircle } from "lucide-react"
import { attachAction, detachAction, uploadAndAttachAction } from "@/app/[locale]/documents/actions"

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

export function AttachmentManager({
  documentId,
  versionId,
  uses,
  myAssets,
}: {
  documentId: string
  versionId: string
  uses: (FileAssetUse & { fileAsset: FileAsset })[]
  myAssets: FileAsset[]
}) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState(uploadAndAttachAction, null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (uploadState?.ok && fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [uploadState?.ok])

  const attachedAssetIds = new Set(uses.map((u) => u.fileAsset.id))
  const availableAssets = myAssets.filter((a) => !attachedAssetIds.has(a.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="size-4" />
          Anhänge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {uses.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Anhänge vorhanden.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {uses.map((use) => (
              <li key={use.id} className="flex items-center justify-between p-3 text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="truncate font-medium">{use.fileAsset.originalName}</span>
                  <span className="text-gray-500 flex-shrink-0">({formatSize(use.fileAsset.size)})</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`/api/files/${use.fileAsset.storageKey}`} target="_blank" className="text-gray-500 hover:text-blue-600">
                    <Download className="size-4" />
                  </a>
                  <form action={detachAction}>
                    <input type="hidden" name="documentId" value={documentId} />
                    <input type="hidden" name="useId" value={use.id} />
                    <Button variant="ghost" size="icon" type="submit" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash className="size-4" />
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-4 border-t flex flex-col gap-4">
          <form action={attachAction} className="flex items-center gap-2 w-full">
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="versionId" value={versionId} />
            <select name="assetId" required className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">-- Datei aus Mediathek wählen --</option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.originalName} ({formatSize(a.size)})
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" disabled={availableAssets.length === 0}>
              <Plus className="size-4 mr-1" /> Aus Mediathek anhängen
            </Button>
          </form>

          <div className="flex flex-col gap-1 w-full">
            <form action={uploadFormAction} className="flex items-center gap-2 w-full">
              <input type="hidden" name="documentId" value={documentId} />
              <input type="hidden" name="versionId" value={versionId} />
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                required
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              />
              <Button type="submit" variant="secondary" disabled={uploadPending}>
                <Plus className="size-4 mr-1" />
                {uploadPending ? "Wird angehängt…" : "Neu hochladen & anhängen"}
              </Button>
            </form>
            {uploadState?.error && (
              <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="size-3.5 flex-shrink-0" />
                <span>{uploadState.error}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
