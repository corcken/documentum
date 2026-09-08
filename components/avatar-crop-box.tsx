"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Check, ZoomIn } from "lucide-react"

interface AvatarCropBoxProps {
  imageUrl: string
  originalFile: File
  onSave: (file: File) => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function AvatarCropBox({
  imageUrl,
  originalFile,
  onSave,
  onCancel,
  loading,
}: AvatarCropBoxProps) {
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      imageRef.current = img
      drawCanvas(img, 1, { x: 0, y: 0 })
    }
  }, [imageUrl])

  const drawCanvas = (
    img: HTMLImageElement,
    currentZoom: number,
    currentPan: { x: number; y: number }
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = canvas.width
    ctx.clearRect(0, 0, size, size)

    const aspect = img.width / img.height
    let drawWidth = size
    let drawHeight = size

    if (aspect > 1) {
      drawWidth = size * aspect
    } else {
      drawHeight = size / aspect
    }

    drawWidth *= currentZoom
    drawHeight *= currentZoom

    const offsetX = (size - drawWidth) / 2 + currentPan.x
    const offsetY = (size - drawHeight) / 2 + currentPan.y

    ctx.save()
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.9)"
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
    if (imageRef.current) {
      drawCanvas(imageRef.current, newZoom, pan)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imageRef.current) return
    const newPan = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }
    setPan(newPan)
    drawCanvas(imageRef.current, zoom, newPan)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleCrop = async () => {
    if (!imageRef.current) return

    const outputCanvas = document.createElement("canvas")
    outputCanvas.width = 512
    outputCanvas.height = 512
    const ctx = outputCanvas.getContext("2d")
    if (!ctx) throw new Error("Canvas Context nicht verfügbar.")

    const previewCanvas = canvasRef.current
    const previewSize = previewCanvas ? previewCanvas.width : 280
    const scale = 512 / previewSize

    const img = imageRef.current
    const aspect = img.width / img.height
    let drawWidth = previewSize
    let drawHeight = previewSize

    if (aspect > 1) {
      drawWidth = previewSize * aspect
    } else {
      drawHeight = previewSize / aspect
    }

    drawWidth *= zoom * scale
    drawHeight *= zoom * scale

    const offsetX = (512 - drawWidth) / 2 + pan.x * scale
    const offsetY = (512 - drawHeight) / 2 + pan.y * scale

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

    const blob = await new Promise<Blob | null>((resolve) =>
      outputCanvas.toBlob(resolve, "image/jpeg", 0.92)
    )

    if (!blob) throw new Error("Fehler beim Zuschneiden des Bildes.")

    const croppedFile = new File([blob], `avatar-${originalFile.name}`, {
      type: "image/jpeg",
    })

    await onSave(croppedFile)
  }

  return (
    <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
      <div className="text-sm font-medium text-gray-800">
        Bild zuschneiden & positionieren:
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="relative border-2 border-dashed border-blue-400 rounded-lg overflow-hidden bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-move block"
            title="Klicken und ziehen, um das Bild zu verschieben"
          />
        </div>

        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ZoomIn className="size-3" /> Zoom:
            </span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleCrop} disabled={loading}>
            <Check className="size-4 mr-2" />
            {loading ? "Wird gespeichert…" : "Zuschneiden & Speichern"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  )
}
