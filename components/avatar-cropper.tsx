"use client"

import React, { useState, useRef } from "react"
import { uploadAvatarAction, removeAvatarAction } from "@/app/[locale]/konto/actions"
import { UserAvatar } from "./user-avatar"
import { AvatarCropBox } from "./avatar-crop-box"
import { Button } from "@/components/ui/button"
import { Upload, Trash2, Check, X } from "lucide-react"

interface AvatarCropperProps {
  currentAvatarKey?: string | null
  userName?: string | null
  userEmail: string
}

export function AvatarCropper({
  currentAvatarKey,
  userName,
  userEmail,
}: AvatarCropperProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Erlaubte Dateitypen: JPG, PNG, WebP.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Datei ist zu groß (maximal 10 MB).")
      return
    }

    setOriginalFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const url = event.target?.result as string
      setSelectedImage(url)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveCropped = async (croppedFile: File) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append("avatar", croppedFile)

      await uploadAvatarAction(formData)
      setSuccess("Avatar erfolgreich aktualisiert.")
      setSelectedImage(null)
      setOriginalFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm("Möchtest du deinen Avatar wirklich entfernen?")) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await removeAvatarAction()
      setSuccess("Avatar wurde entfernt.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entfernen fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelCrop = () => {
    setSelectedImage(null)
    setOriginalFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 flex items-center gap-2">
          <Check className="size-4" /> {success}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2">
          <X className="size-4" /> {error}
        </div>
      )}

      {!selectedImage || !originalFile ? (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <UserAvatar
            name={userName}
            email={userEmail}
            storageKey={currentAvatarKey}
            size="xl"
            className="ring-4 ring-blue-50"
          />
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div className="text-sm text-gray-600">
              Lade ein quadratisches Profilbild hoch (JPG, PNG oder WebP, max. 10 MB).
              Du kannst das Bild vor dem Speichern zuschneiden und anpassen.
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="avatar-file-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Upload className="size-4 mr-2" />
                {currentAvatarKey ? "Avatar ändern" : "Avatar hochladen"}
              </Button>
              {currentAvatarKey && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={loading}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="size-4 mr-2" />
                  Entfernen
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <AvatarCropBox
          imageUrl={selectedImage}
          originalFile={originalFile}
          onSave={handleSaveCropped}
          onCancel={handleCancelCrop}
          loading={loading}
        />
      )}
    </div>
  )
}
