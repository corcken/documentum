export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  Draft: "Entwurf",
  In_Review: "In Prüfung",
  In_Approval: "In Freigabe",
  Released: "Freigegeben",
  Archived: "Archiviert",
  Withdrawn: "Zurückgezogen",
  Destroyed: "Vernichtet",
}

// Status-Farbsprache: bewusst theme-unabhängig (GMP, s. docs/styleguide.md §6).
// Immer mit Dark-Variante und Rand, damit Status in allen Themes gleich gelesen werden.
export const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  Draft: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  In_Review: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  In_Approval: "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300",
  Released: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  Archived: "border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400",
  Withdrawn: "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  Destroyed: "border-slate-200 bg-slate-100 text-slate-500 line-through dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500",
}

export const DESTRUCTION_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  Pending: "Ausstehend",
  EXECUTED: "Ausgeführt",
  Confirmed: "Ausgeführt",
  REJECTED: "Abgelehnt",
}

export const DESTRUCTION_REQUEST_STATUS_STYLES: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  Pending: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  EXECUTED: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  Confirmed: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  REJECTED: "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
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

export const DEPARTMENT_ROLE_LABELS: Record<string, string> = {
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
