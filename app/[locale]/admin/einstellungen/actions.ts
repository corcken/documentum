"use server"

import { requireAdmin, requireUserId } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/services/audit"
import { revalidatePath } from "next/cache"

export async function updateWorkflowQuorumAction(formData: FormData) {
  await requireAdmin()
  const userId = await requireUserId()

  const quorum = formData.get("quorum") as string
  if (quorum !== "einer" && quorum !== "alle") {
    throw new Error("Ungültiger Quorum-Modus.")
  }

  const before = await prisma.appSetting.findUnique({
    where: { key: "workflow.quorum" },
  })

  await prisma.appSetting.upsert({
    where: { key: "workflow.quorum" },
    create: { key: "workflow.quorum", value: quorum },
    update: { value: quorum },
  })

  await logAudit({
    userId,
    action: "UPDATE",
    entityType: "AppSetting",
    entityId: "workflow.quorum",
    before: { value: before?.value ?? "alle" },
    after: { value: quorum },
  })

  revalidatePath("/admin/einstellungen")
}
