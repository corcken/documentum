"use server"

import { requireAdmin } from "@/lib/auth-guard"
import { saveSmtpSettings, testSmtpConnection, saveEmailTemplate } from "@/lib/services/email"
import { revalidatePath } from "next/cache"

export type SmtpFormState = { error?: string; ok?: string } | null
export type TemplateFormState = { error?: string; ok?: string } | null

export async function saveSmtpAction(_prev: SmtpFormState, formData: FormData): Promise<SmtpFormState> {
  const session = await requireAdmin()
  const userId = session.user.id!

  const host = String(formData.get("host") ?? "").trim()
  const port = parseInt(String(formData.get("port") ?? "587"), 10)
  const secure = formData.get("secure") === "true" || formData.get("secure") === "on"
  const user = String(formData.get("user") ?? "").trim()
  const pass = String(formData.get("pass") ?? "")
  const from = String(formData.get("from") ?? "").trim()
  const enabled = formData.get("enabled") === "true" || formData.get("enabled") === "on"

  try {
    const updatePayload: any = { host, port, secure, user, from, enabled }
    if (pass) {
      updatePayload.pass = pass
    }

    await saveSmtpSettings(updatePayload, userId)
    revalidatePath("/admin/email")
    return { ok: "SMTP-Einstellungen erfolgreich gespeichert." }
  } catch (e: any) {
    return { error: e?.message || "Fehler beim Speichern der SMTP-Einstellungen." }
  }
}

export async function testSmtpAction(): Promise<{ success: boolean; message: string }> {
  await requireAdmin()
  return await testSmtpConnection()
}

export async function saveTemplateAction(_prev: TemplateFormState, formData: FormData): Promise<TemplateFormState> {
  const session = await requireAdmin()
  const userId = session.user.id!

  const event = String(formData.get("event") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const subject = String(formData.get("subject") ?? "").trim()
  const bodyHtml = String(formData.get("bodyHtml") ?? "").trim()
  const bodyText = String(formData.get("bodyText") ?? "").trim()

  if (!event || !subject) {
    return { error: "Event und Betreff sind Pflichtfelder." }
  }

  try {
    await saveEmailTemplate(event, { name, subject, bodyHtml, bodyText }, userId)
    revalidatePath("/admin/email")
    return { ok: `Vorlage für "${name || event}" erfolgreich aktualisiert.` }
  } catch (e: any) {
    return { error: e?.message || "Fehler beim Speichern der E-Mail-Vorlage." }
  }
}
