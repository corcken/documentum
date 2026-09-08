"use client"

import { useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <AlertCircle className="size-16 text-red-500 mb-6" />
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Ein unerwarteter Fehler ist aufgetreten
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Wir konnten deine Anfrage leider nicht verarbeiten. 
      </p>
      <div className="mt-8 flex gap-4">
        <Button onClick={() => reset()}>Erneut versuchen</Button>
        <a href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Zurück zum Dashboard
        </a>
      </div>
    </div>
  )
}
