import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"

interface DocumentReviewersProps {
  current: {
    reviewer?: { id: string; name: string | null; email: string } | null
    reviewerId?: string | null
    approver?: { id: string; name: string | null; email: string } | null
    approverId?: string | null
    workflowTasks: {
      id: string
      taskType: string
      status: string
      assignedToId?: string | null
      assignedTo?: { id: string; name: string | null; email: string } | null
    }[]
  }
  deptPruefer: { id: string; name: string | null; email: string }[]
  deptFreigeber: { id: string; name: string | null; email: string }[]
  avatarMap: Map<string, string>
}

export function DocumentReviewers({
  current,
  deptPruefer,
  deptFreigeber,
  avatarMap,
}: DocumentReviewersProps) {
  const reviewTasks = current.workflowTasks.filter((t) => t.taskType === "Review")
  const approvalTasks = current.workflowTasks.filter((t) => t.taskType === "Approval")

  return (
    <div className="border-t pt-3 text-sm text-gray-600 flex flex-wrap items-center gap-4">
      {/* Prüfer */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span>Prüfer:</span>
        {reviewTasks.length > 0 ? (
          reviewTasks.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-xs">
              <UserAvatar
                name={t.assignedTo?.name}
                email={t.assignedTo?.email}
                storageKey={t.assignedToId ? avatarMap.get(t.assignedToId) : null}
                size="sm"
              />
              <span className="font-medium">{t.assignedTo?.name ?? t.assignedTo?.email}</span>
              {t.status === "Cancelled" && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Erloschen</Badge>
              )}
              {t.status === "Approved" && (
                <Badge variant="default" className="text-[10px] bg-emerald-600">Geprüft</Badge>
              )}
            </span>
          ))
        ) : deptPruefer.length > 0 ? (
          deptPruefer.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded text-xs">
              <UserAvatar name={p.name} email={p.email} storageKey={avatarMap.get(p.id)} size="sm" />
              <span className="font-medium">{p.name ?? p.email}</span>
            </span>
          ))
        ) : (
          <div className="flex items-center gap-1.5">
            <UserAvatar
              name={current.reviewer?.name}
              email={current.reviewer?.email}
              storageKey={current.reviewerId ? avatarMap.get(current.reviewerId) : null}
              size="sm"
            />
            <span className="font-medium">{current.reviewer?.name ?? current.reviewer?.email ?? "—"}</span>
          </div>
        )}
      </div>

      <span>·</span>

      {/* Genehmiger */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span>Genehmiger:</span>
        {approvalTasks.length > 0 ? (
          approvalTasks.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-xs">
              <UserAvatar
                name={t.assignedTo?.name}
                email={t.assignedTo?.email}
                storageKey={t.assignedToId ? avatarMap.get(t.assignedToId) : null}
                size="sm"
              />
              <span className="font-medium">{t.assignedTo?.name ?? t.assignedTo?.email}</span>
              {t.status === "Cancelled" && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Erloschen</Badge>
              )}
              {t.status === "Approved" && (
                <Badge variant="default" className="text-[10px] bg-emerald-600">Genehmigt</Badge>
              )}
            </span>
          ))
        ) : deptFreigeber.length > 0 ? (
          deptFreigeber.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded text-xs">
              <UserAvatar name={f.name} email={f.email} storageKey={avatarMap.get(f.id)} size="sm" />
              <span className="font-medium">{f.name ?? f.email}</span>
            </span>
          ))
        ) : (
          <div className="flex items-center gap-1.5">
            <UserAvatar
              name={current.approver?.name}
              email={current.approver?.email}
              storageKey={current.approverId ? avatarMap.get(current.approverId) : null}
              size="sm"
            />
            <span className="font-medium">{current.approver?.name ?? current.approver?.email ?? "—"}</span>
          </div>
        )}
      </div>
    </div>
  )
}
