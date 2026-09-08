import { buttonVariants } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"
import Link from "next/link"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="size-16 text-gray-400 mb-6" />
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Seite nicht gefunden (404)
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Die gesuchte Seite existiert leider nicht oder du hast keine Berechtigung, sie zu sehen.
      </p>
      <div className="mt-8">
        <Link href="/dashboard" className={buttonVariants()}>Zurück zum Dashboard</Link>
      </div>
    </div>
  )
}
