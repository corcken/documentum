"use server"

import { z } from "zod"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
  createDocument,
  restoreVersion,
  saveDraftVersion,
} from "@/lib/services/document"
import {
  approveReview,
  approveVersion,
  returnToAuthor,
  submitForReview,
} from "@/lib/services/workflow"
import { requireUser } from "@/lib/auth-guard"
import type { Prisma } from "@prisma/client"

// ── Anlegen ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  documentNumber: z.string().min(1, "Dokumentnummer fehlt"),
  title: z.string().min(3, "Titel ist zu kurz"),
  typeId: z.string().min(1, "Dokumenttyp fehlt"),
  content: z.string().optional().default(""),
  departmentIds: z.array(z.string()).optional().default([]),
  jobRoleIds: z.array(z.string()).optional().default([]),
  reviewerId: z.string().min(1, "Prüfer fehlt"),
  approverId: z.string().min(1, "Genehmiger fehlt"),
  visibility: z.string().optional(),
  reviewIntervalMonths: z.coerce.number().optional(),
  templateId: z.string().optional(),
})

export type CreateDocumentState = { error?: string } | null

export async function createDocumentAction(_prev: CreateDocumentState, formData: FormData) {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")

  const parsed = createSchema.safeParse({
    documentNumber: formData.get("documentNumber") ?? undefined,
    title: formData.get("title") ?? undefined,
    typeId: formData.get("typeId") ?? undefined,
    content: formData.get("content") ?? undefined,
    departmentIds: formData.getAll("departmentId"),
    jobRoleIds: formData.getAll("jobRoleId"),
    reviewerId: formData.get("reviewerId") ?? undefined,
    approverId: formData.get("approverId") ?? undefined,
    visibility: (formData.get("visibility") as string) || undefined,
    reviewIntervalMonths: formData.get("reviewIntervalMonths") ? Number(formData.get("reviewIntervalMonths")) : undefined,
    templateId: (formData.get("templateId") as string) || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" · ") }
  }

  let doc
  try {
    doc = await createDocument({ ...parsed.data, ownerId: session.user.id! })
  } catch (e) {
    console.error("createDocumentAction:", e)
    if ((e as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      return { error: "Diese Dokumentnummer ist bereits vergeben." }
    }
    return { error: "Dokument konnte nicht angelegt werden. Bitte erneut versuchen." }
  }

  revalidatePath("/documents")
  redirect(`/documents/${doc.id}`)
}

// ── Workflow-Aktionen ───────────────────────────────────────────────────────

export type WorkflowActionState = { error?: string; ok?: string } | null

async function actorId() {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")
  if (!session.user.id) redirect("/")
  return session.user.id
}

/** Speichern erzeugt eine neue Minor-Version (nur bei Änderung). */
export async function saveDraftAction(_prev: WorkflowActionState, formData: FormData) {
  const userId = await actorId()
  const documentId = String(formData.get("documentId") ?? "")
  const title = String(formData.get("title") ?? "")
  const content = String(formData.get("content") ?? "")
  const reviewerId = String(formData.get("reviewerId") ?? "")
  const approverId = String(formData.get("approverId") ?? "")
  const changeReason = String(formData.get("changeReason") ?? "")
  try {
    await saveDraftVersion({ documentId, title, content, changeReason, userId, reviewerId, approverId })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }
  }
  revalidatePath(`/documents/${documentId}`)
  redirect(`/documents/${documentId}`)
}

/** Zur Prüfung einreichen (Freeze). */
export async function submitForReviewAction(formData: FormData) {
  const userId = await actorId()
  const documentId = String(formData.get("documentId") ?? "")
  await submitForReview({ documentId, userId })
  revalidatePath(`/documents/${documentId}`)
  redirect(`/documents/${documentId}`)
}

/** Prüfung bestanden → in Freigabe. */
export async function approveReviewAction(formData: FormData) {
  const userId = await actorId()
  const versionId = String(formData.get("versionId") ?? "")
  const v = await approveReview({ versionId, userId })
  revalidatePath(`/documents/${v.documentId}`)
  redirect(`/documents/${v.documentId}`)
}

/** Zurück an den Ersteller mit Kommentar. */
export async function returnToAuthorAction(formData: FormData) {
  const userId = await actorId()
  const versionId = String(formData.get("versionId") ?? "")
  const comment = String(formData.get("comment") ?? "")
  const v = await returnToAuthor({ versionId, comment, userId })
  revalidatePath(`/documents/${v.documentId}`)
  redirect(`/documents/${v.documentId}`)
}

/** Genehmigen → Major+1, Minor 0, Released. */
export async function approveAction(formData: FormData) {
  const userId = await actorId()
  const versionId = String(formData.get("versionId") ?? "")
  const v = await approveVersion({ versionId, userId })
  revalidatePath(`/documents/${v.documentId}`)
  redirect(`/documents/${v.documentId}`)
}

/** Dokument zurückziehen (Withdrawn). */
export async function withdrawAction(formData: FormData) {
  const session = await requireUser()
  const userId = session.user.id!
  const userRole = session.user.role!
  
  const versionId = String(formData.get("versionId") ?? "")
  const comment = String(formData.get("comment") ?? "")
  
  // To avoid circular dependencies with `document.ts`, we can import `withdrawDocument` dynamically or just normally.
  const { withdrawDocument } = await import("@/lib/services/workflow")
  
  const v = await withdrawDocument({ documentId: "", versionId, userId, userRole, comment })
  revalidatePath(`/documents/${v.documentId}`)
  redirect(`/documents/${v.documentId}`)
}

/** Zurückspringen auf einen älteren Stand (erzeugt neue Minor-Version). */
export async function restoreAction(formData: FormData) {
  const userId = await actorId()
  const documentId = String(formData.get("documentId") ?? "")
  const sourceVersionId = String(formData.get("sourceVersionId") ?? "")
  try {
    await restoreVersion({ documentId, sourceVersionId, userId })
  } catch (e) {
    redirect(`/documents/${documentId}?error=${encodeURIComponent(e instanceof Error ? e.message : "Zurückspringen fehlgeschlagen.")}`)
  }
  revalidatePath(`/documents/${documentId}`)
  redirect(`/documents/${documentId}`)
}

export async function attachAction(formData: FormData) {
  const session = await requireUser()
  const userId = session.user.id!
  const documentId = formData.get("documentId") as string
  const versionId = formData.get("versionId") as string
  const assetId = formData.get("assetId") as string

  if (!versionId || !assetId) throw new Error("Fehlende Daten")
  
  const { attachFileToVersion } = await import("@/lib/services/attachment")
  await attachFileToVersion(assetId, versionId, userId)
  
  revalidatePath(`/documents/${documentId}/edit`)
  revalidatePath(`/documents/${documentId}`)
}

export async function detachAction(formData: FormData) {
  const session = await requireUser()
  const userId = session.user.id!
  const documentId = formData.get("documentId") as string
  const useId = formData.get("useId") as string

  if (!useId) throw new Error("Fehlende Daten")
  
  const { detachFileFromVersion } = await import("@/lib/services/attachment")
  await detachFileFromVersion(useId, userId)
  
  revalidatePath(`/documents/${documentId}/edit`)
  revalidatePath(`/documents/${documentId}`)
}

export type UploadAndAttachState = { error?: string; ok?: string } | null

export async function uploadAndAttachAction(
  prevStateOrFormData: UploadAndAttachState | FormData,
  maybeFormData?: FormData
): Promise<UploadAndAttachState> {
  const formData = (maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData) as FormData

  try {
    const session = await requireUser()
    const userId = session.user.id!
    const documentId = formData.get("documentId") as string
    const versionId = formData.get("versionId") as string
    const file = formData.get("file") as File | null

    if (!versionId || !file || file.size === 0) {
      return { error: "Keine Datei ausgewählt" }
    }
    
    const { uploadFile } = await import("@/lib/services/file")
    const { attachFileToVersion } = await import("@/lib/services/attachment")
    const asset = await uploadFile(file, userId)
    await attachFileToVersion(asset.id, versionId, userId)
    
    revalidatePath(`/documents/${documentId}/edit`)
    revalidatePath(`/documents/${documentId}`)
    return { ok: "Datei erfolgreich hochgeladen und angehängt." }
  } catch (err: any) {
    return { error: err?.message || "Upload fehlgeschlagen." }
  }
}

export async function startReviewWithoutChangeAction(formData: FormData) {
  const session = await requireUser()
  const documentId = String(formData.get("documentId") ?? "")
  const comment = String(formData.get("comment") ?? "")
  
  const { startReviewWithoutChange } = await import("@/lib/services/workflow")
  await startReviewWithoutChange({ documentId, userId: session.user.id!, userRole: session.user.role!, comment })
  
  revalidatePath(`/documents/${documentId}`)
  redirect(`/documents/${documentId}`)
}

export async function markAsTemplateAction(formData: FormData) {
  const session = await requireUser()
  const documentId = String(formData.get("documentId") ?? "")
  
  const { markAsTemplate } = await import("@/lib/services/template")
  await markAsTemplate(documentId, session.user.id!)
  
  revalidatePath(`/documents/${documentId}`)
  revalidatePath("/documents")
}

export async function unmarkAsTemplateAction(formData: FormData) {
  const session = await requireUser()
  const documentId = String(formData.get("documentId") ?? "")
  
  const { unmarkAsTemplate } = await import("@/lib/services/template")
  await unmarkAsTemplate(documentId, session.user.id!)
  
  revalidatePath(`/documents/${documentId}`)
  revalidatePath("/documents")
}
