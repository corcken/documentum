"use client" // Error boundaries must be Client Components

import { useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <html lang="de">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
          <ShieldAlert className="size-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ein unerwarteter Fehler ist aufgetreten
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Leider ist bei der Verarbeitung deiner Anfrage etwas schiefgelaufen. 
            Bitte versuche es erneut oder wende dich an den Administrator.
          </p>
          <div className="mt-8 flex gap-4">
            <Button onClick={() => reset()}>Erneut versuchen</Button>
            <a href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Zurück zum Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
