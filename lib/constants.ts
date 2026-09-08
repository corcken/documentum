export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  Draft: "Entwurf",
  In_Review: "In Prüfung",
  In_Approval: "In Freigabe",
  Released: "Freigegeben",
  Archived: "Archiviert",
  Withdrawn: "Zurückgezogen",
  Destroyed: "Vernichtet",
}

export const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  In_Review: "bg-yellow-100 text-yellow-800",
  In_Approval: "bg-orange-100 text-orange-800",
  Released: "bg-green-100 text-green-800",
  Archived: "bg-gray-200 text-gray-500",
  Withdrawn: "bg-red-100 text-red-800",
  Destroyed: "bg-gray-100 text-gray-500 line-through",
}

export const DESTRUCTION_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  Pending: "Ausstehend",
  EXECUTED: "Ausgeführt",
  Confirmed: "Ausgeführt",
  REJECTED: "Abgelehnt",
}

export const DESTRUCTION_REQUEST_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  Pending: "bg-yellow-100 text-yellow-800",
  EXECUTED: "bg-gray-100 text-gray-600",
  Confirmed: "bg-gray-100 text-gray-600",
  REJECTED: "bg-red-100 text-red-800",
}

export const WORKFLOW_TASK_STATUS_LABELS: Record<string, string> = {
  Pending: "Ausstehend",
  Approved: "Angenommen",
  Rejected: "Abgelehnt",
  Cancelled: "Erloschen",
}

export const DEPARTMENT_ROLES = {
  ERSTELLER: "ERSTELLER",
  PRUEFER: "PRUEFER",
  FREIGEBER: "FREIGEBER",
} as const

export type DepartmentRole = (typeof DEPARTMENT_ROLES)[keyof typeof DEPARTMENT_ROLES]

export const DEPARTMENT_ROLE_LABELS: Record<DepartmentRole, string> = {
  [DEPARTMENT_ROLES.ERSTELLER]: "Ersteller",
  [DEPARTMENT_ROLES.PRUEFER]: "Prüfer",
  [DEPARTMENT_ROLES.FREIGEBER]: "Freigeber",
}

export const QUORUM_MODES = {
  EINER: "einer",
  ALLE: "alle",
} as const

export type QuorumMode = (typeof QUORUM_MODES)[keyof typeof QUORUM_MODES]

export const QUORUM_MODE_LABELS: Record<string, string> = {
  einer: "Einer (Erster Abschluss entscheidet)",
  alle: "Alle (Jeder muss zustimmen)",
}
