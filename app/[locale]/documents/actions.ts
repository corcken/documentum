"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createDocument, restoreVersion, saveDraftVersion } from "@/lib/services/document"
import { approveReview, approveVersion, returnToAuthor, submitForReview } from "@/lib/services/workflow"
import { requireUser } from "@/lib/auth-guard"
import type { Prisma } from "@prisma/client"

function isRedirectError(e: unknown): boolean {
  const err = e as { message?: string; digest?: string }
  return err?.message === "NEXT_REDIRECT" || Boolean(err?.digest?.startsWith?.("NEXT_REDIRECT"))
}

function redirectWithError(fallbackPath: string, e: unknown, defaultMsg: string): never {
  if (isRedirectError(e)) throw e
  const msg = e instanceof Error ? e.message : defaultMsg
  redirect(`${fallbackPath}?error=${encodeURIComponent(msg)}`)
}

// ── Anlegen ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  documentNumber: z.string().min(1, "Dokumentnummer fehlt"),
  title: z.string().min(3, "Titel ist zu kurz"),
  typeId: z.string().min(1, "Dokumenttyp fehlt"),
  content: z.string().optional().default(""),
  departmentId: z.string().optional(),
  departmentIds: z.array(z.string()).optional().default([]),
  jobRoleIds: z.array(z.string()).optional().default([]),
  reviewerId: z.string().optional(),
  approverId: z.string().optional(),
  visibility: z.string().optional(),
  reviewIntervalMonths: z.coerce.number().optional(),
  templateId: z.string().optional(),
})

export type CreateDocumentState = { error?: string } | null

export async function createDocumentAction(_prev: CreateDocumentState, formData: FormData) {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")

  const rawDept = (formData.get("responsibleDepartmentId") as string) || (formData.get("departmentId") as string)
  const departmentId = rawDept && rawDept.trim() ? rawDept.trim() : undefined

  const scopeDepts = formData.getAll("scopeDepartmentId")
  const departmentIds =
    scopeDepts.length > 0
      ? (scopeDepts as string[])
      : (formData.getAll("departmentId") as string[]).filter((id) => id !== departmentId)

  const parsed = createSchema.safeParse({
    documentNumber: formData.get("documentNumber") ?? undefined,
    title: formData.get("title") ?? undefined,
    typeId: formData.get("typeId") ?? undefined,
    content: formData.get("content") ?? undefined,
    departmentId,
    departmentIds,
    jobRoleIds: formData.getAll("jobRoleId"),
    reviewerId: (formData.get("reviewerId") as string) || undefined,
    approverId: (formData.get("approverId") as string) || undefined,
    visibility: (formData.get("visibility") as string) || undefined,
    reviewIntervalMonths: formData.get("reviewIntervalMonths")
      ? Number(formData.get("reviewIntervalMonths"))
      : undefined,
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
    return {
      error: e instanceof Error ? e.message : "Dokument konnte nicht angelegt werden. Bitte erneut versuchen.",
    }
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
  const reviewerId = (formData.get("reviewerId") as string) || undefined
  const approverId = (formData.get("approverId") as string) || undefined
  const changeReason = String(formData.get("changeReason") ?? "")
  const visibility = (formData.get("visibility") as string) || undefined
  const rawInterval = formData.get("reviewIntervalMonths")
  const reviewIntervalMonths =
    rawInterval !== null
      ? String(rawInterval).trim() !== ""
        ? Number(rawInterval)
        : null
      : undefined
  const hasScopeUpdate = formData.get("hasScopeUpdate") === "true"
  const departmentIds = hasScopeUpdate ? (formData.getAll("scopeDepartmentId") as string[]) : undefined
  const jobRoleIds = hasScopeUpdate ? (formData.getAll("jobRoleId") as string[]) : undefined

  try {
    await saveDraftVersion({
      documentId, title, content, changeReason, userId,
      reviewerId, approverId, visibility, reviewIntervalMonths, departmentIds, jobRoleIds,
    })
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
  try {
    await submitForReview({ documentId, userId })
    revalidatePath(`/documents/${documentId}`)
    redirect(`/documents/${documentId}`)
  } catch (e) {
    redirectWithError(`/documents/${documentId}`, e, "Einreichen fehlgeschlagen.")
  }
}

/** Prüfung bestanden → in Freigabe. */
export async function approveReviewAction(formData: FormData) {
  const userId = await actorId()
  const versionId = String(formData.get("versionId") ?? "")
  const docId = String(formData.get("documentId") ?? "")
  try {
    const v = await approveReview({ versionId, userId })
    revalidatePath(`/documents/${v.documentId}`)
    redirect(`/documents/${v.documentId}`)
  } catch (e) {
    redirectWithError(docId ? `/documents/${docId}` : "/documents", e, "Prüfung fehlgeschlagen.")
  }
}

/** Zurück an den Ersteller mit Kommentar. */
export async function returnToAuthorAction(formData: FormData) {
  const userId = await actorId()
  const versionId = String(formData.get("versionId") ?? "")
  const comment = String(formData.get("comment") ?? "")
  const docId = String(formData.get("documentId") ?? "")
  try {
    const v = await returnToAuthor({ versionId, comment, userId })
    revalidatePath(`/documents/${v.documentId}`)
    redirect(`/documents/${v.documentId}`)
  } catch (e) {
    redirectWithError(docId ? `/documents/${docId}` : "/documents", e, "Rückgabe fehlgeschlagen.")
  }
}

/** Genehmigen → Major+1, Minor 0, Released mit elektronischer Signatur (Part 11). */
export async function approveAction(formData: FormData) {
  const userId = await actorId()
  const versionId = String(formData.get("versionId") ?? "")
  const password = String(formData.get("password") ?? "")
  const signatureMeaning = String(formData.get("signatureMeaning") ?? "")
  const docId = String(formData.get("documentId") ?? "")

  try {
    const v = await approveVersion({ versionId, userId, password, signatureMeaning })
    revalidatePath(`/documents/${v.documentId}`)
    redirect(`/documents/${v.documentId}`)
  } catch (e) {
    redirectWithError(docId ? `/documents/${docId}` : "/documents", e, "Freigabe fehlgeschlagen.")
  }
}

/** Dokument zurückziehen (Withdrawn). */
export async function withdrawAction(formData: FormData) {
  const session = await requireUser()
  const userId = session.user.id!
  const userRole = session.user.role!

  const versionId = String(formData.get("versionId") ?? "")
  const docId = String(formData.get("documentId") ?? "")
  const comment = String(formData.get("comment") ?? "")

  try {
    const { withdrawDocument } = await import("@/lib/services/workflow")
    const v = await withdrawDocument({ documentId: docId, versionId, userId, userRole, comment })
    revalidatePath(`/documents/${v.documentId}`)
    redirect(`/documents/${v.documentId}`)
  } catch (e) {
    redirectWithError(docId ? `/documents/${docId}` : "/documents", e, "Zurückziehen fehlgeschlagen.")
  }
}

/** Zurückspringen auf einen älteren Stand (erzeugt neue Minor-Version). */
export async function restoreAction(formData: FormData) {
  const userId = await actorId()
  const documentId = String(formData.get("documentId") ?? "")
  const sourceVersionId = String(formData.get("sourceVersionId") ?? "")
  try {
    await restoreVersion({ documentId, sourceVersionId, userId })
    revalidatePath(`/documents/${documentId}`)
    redirect(`/documents/${documentId}`)
  } catch (e) {
    redirectWithError(`/documents/${documentId}`, e, "Zurückspringen fehlgeschlagen.")
  }
}

export async function attachAction(formData: FormData) {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")
  const userId = session.user.id!
  const documentId = String(formData.get("documentId") ?? "")
  const versionId = String(formData.get("versionId") ?? "")
  const assetId = String(formData.get("assetId") ?? "")

  try {
    if (!versionId || !assetId) throw new Error("Fehlende Daten")
    const { attachFileToVersion } = await import("@/lib/services/attachment")
    await attachFileToVersion(assetId, versionId, userId)
    revalidatePath(`/documents/${documentId}/edit`)
    revalidatePath(`/documents/${documentId}`)
  } catch (e) {
    redirectWithError(`/documents/${documentId}/edit`, e, "Anhängen fehlgeschlagen.")
  }
}

export async function detachAction(formData: FormData) {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")
  const userId = session.user.id!
  const documentId = String(formData.get("documentId") ?? "")
  const useId = String(formData.get("useId") ?? "")

  try {
    if (!useId) throw new Error("Fehlende Daten")
    const { detachFileFromVersion } = await import("@/lib/services/attachment")
    await detachFileFromVersion(useId, userId)
    revalidatePath(`/documents/${documentId}/edit`)
    revalidatePath(`/documents/${documentId}`)
  } catch (e) {
    redirectWithError(`/documents/${documentId}/edit`, e, "Entfernen fehlgeschlagen.")
  }
}

export type UploadAndAttachState = { error?: string; ok?: string } | null

export async function uploadAndAttachAction(
  prevStateOrFormData: UploadAndAttachState | FormData,
  maybeFormData?: FormData
): Promise<UploadAndAttachState> {
  const formData = (maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData) as FormData

  try {
    const session = await requireUser()
    if (session.user.role === "VIEWER") {
      return { error: "Leser haben keine Schreibrechte." }
    }
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

  try {
    const { startReviewWithoutChange } = await import("@/lib/services/workflow")
    await startReviewWithoutChange({
      documentId,
      userId: session.user.id!,
      userRole: session.user.role!,
      comment,
    })
    revalidatePath(`/documents/${documentId}`)
    redirect(`/documents/${documentId}`)
  } catch (e) {
    redirectWithError(`/documents/${documentId}`, e, "Prüfung ohne Änderung konnte nicht gestartet werden.")
  }
}

export async function markAsTemplateAction(formData: FormData) {
  const session = await requireUser()
  const documentId = String(formData.get("documentId") ?? "")

  try {
    const { markAsTemplate } = await import("@/lib/services/template")
    await markAsTemplate(documentId, session.user.id!)
    revalidatePath(`/documents/${documentId}`)
    revalidatePath("/documents")
  } catch (e) {
    redirectWithError(`/documents/${documentId}`, e, "Vorlagen-Markierung fehlgeschlagen.")
  }
}

export async function unmarkAsTemplateAction(formData: FormData) {
  const session = await requireUser()
  const documentId = String(formData.get("documentId") ?? "")

  try {
    const { unmarkAsTemplate } = await import("@/lib/services/template")
    await unmarkAsTemplate(documentId, session.user.id!)
    revalidatePath(`/documents/${documentId}`)
    revalidatePath("/documents")
  } catch (e) {
    redirectWithError(`/documents/${documentId}`, e, "Vorlagen-Entfernung fehlgeschlagen.")
  }
}
