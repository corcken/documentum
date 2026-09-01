"use server"

import { z } from "zod"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
  approveReview,
  approveVersion,
  createDocument,
  restoreVersion,
  returnToAuthor,
  saveDraftVersion,
  submitForReview,
} from "@/lib/services/document"
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
})

export type CreateDocumentState = { error?: string } | null

export async function createDocumentAction(_prev: CreateDocumentState, formData: FormData) {
  const session = await requireUser()
  if (session.user.role === "VIEWER") redirect("/documents")

  const parsed = createSchema.safeParse({
    documentNumber: formData.get("documentNumber"),
    title: formData.get("title"),
    typeId: formData.get("typeId"),
    content: formData.get("content"),
    departmentIds: formData.getAll("departmentId"),
    jobRoleIds: formData.getAll("jobRoleId"),
    reviewerId: formData.get("reviewerId"),
    approverId: formData.get("approverId"),
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
  try {
    await saveDraftVersion({ documentId, title, content, userId, reviewerId, approverId })
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
