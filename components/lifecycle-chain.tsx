import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_STYLES } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { DocumentStatus } from "@prisma/client"

export function LifecycleChain({ status, timestamps = {} }: { status: DocumentStatus, timestamps?: Record<string, Date> }) {
  // Typical flow: Draft -> In_Review -> In_Approval -> Released
  // If it's Archived or Withdrawn, we branch off at the end.

  const baseFlow = ["Draft", "In_Review", "In_Approval", "Released"] as DocumentStatus[]
  
  let flow = [...baseFlow]
  if (status === "Archived") {
    flow.push("Archived")
  } else if (status === "Withdrawn") {
    flow.push("Withdrawn")
  } else if (status === "Destroyed") {
    flow.push("Archived", "Destroyed")
  }

  // Find where we are in the flow
  const currentIndex = flow.indexOf(status)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-4">
      <span className="text-sm font-medium mr-2 text-gray-500">Lebenszyklus:</span>
      <div className="flex flex-wrap items-center gap-2">
        {flow.map((s, idx) => {
          const isPast = idx < currentIndex
          const isCurrent = idx === currentIndex
          const ts = timestamps[s]
          
          let badgeVariant = "outline"
          let className = "text-gray-400 border-gray-200"
          
          if (isCurrent) {
            className = DOCUMENT_STATUS_STYLES[s] || ""
          } else if (isPast) {
            className = "bg-gray-100 text-gray-500 border-gray-200"
          }

          return (
            <div key={s} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <Badge variant="outline" className={className}>
                  {DOCUMENT_STATUS_LABELS[s] || s}
                </Badge>
                {ts && (
                  <span className="text-[10px] text-gray-400 mt-1">
                    {ts.toLocaleDateString("de-DE")}
                  </span>
                )}
              </div>
              {idx < flow.length - 1 && (
                <ArrowRight className={`size-4 ${isPast ? "text-gray-400" : "text-gray-200"} mb-[14px]`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
