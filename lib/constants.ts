export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  Draft: "Entwurf",
  In_Review: "In Prüfung",
  In_Approval: "In Freigabe",
  Released: "Freigegeben",
  Archived: "Archiviert",
}

export const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  In_Review: "bg-yellow-100 text-yellow-800",
  In_Approval: "bg-orange-100 text-orange-800",
  Released: "bg-green-100 text-green-800",
  Archived: "bg-gray-200 text-gray-500",
}
