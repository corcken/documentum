import { prisma } from "@/lib/prisma"

export async function getQmStats() {
  // 1. Dokumentenbestand nach Status und 2. nach Typ
  // Echter Ansatz für Status: Alle Dokumente fetchen (nur IDs und letze Version)
  const allDocs = await prisma.document.findMany({
    include: {
      versions: {
        orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
        take: 1,
        select: { status: true },
      },
      type: { select: { name: true } }
    },
  })

  const statusCount: Record<string, number> = {}
  const typeCount: Record<string, number> = {}

  for (const doc of allDocs) {
    const status = doc.versions[0]?.status || "Unknown"
    statusCount[status] = (statusCount[status] || 0) + 1

    const type = doc.type?.name || "Ohne Typ"
    typeCount[type] = (typeCount[type] || 0) + 1
  }

  const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }))
  const typeData = Object.entries(typeCount).map(([name, value]) => ({ name, value }))

  // 3. Offene Aufgaben je Benutzer
  const tasks = await prisma.workflowTask.findMany({
    where: { status: "Pending" },
    include: { assignedTo: { select: { name: true, email: true } } },
  })

  const taskCount: Record<string, number> = {}
  for (const t of tasks) {
    const user = t.assignedTo?.name || t.assignedTo?.email || "Unbekannt"
    taskCount[user] = (taskCount[user] || 0) + 1
  }
  const taskData = Object.entries(taskCount).map(([name, value]) => ({ name, value }))

  // 4. Aktivität (Audit-Einträge) der letzten 30 Tage
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const audits = await prisma.auditLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  // Gruppieren nach Datum (YYYY-MM-DD)
  const auditCount: Record<string, number> = {}
  for (const a of audits) {
    const day = a.createdAt.toISOString().split("T")[0]
    auditCount[day] = (auditCount[day] || 0) + 1
  }
  const auditData = Object.entries(auditCount).map(([date, count]) => ({ date, count }))

  return {
    statusData,
    typeData,
    taskData,
    auditData,
  }
}
