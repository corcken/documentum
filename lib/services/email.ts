import { prisma } from "@/lib/prisma"
import { logAudit } from "./audit"
import { DEFAULT_TEMPLATES } from "@/lib/email-defaults"
import crypto from "crypto"
import nodemailer from "nodemailer"

function getSecretKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("Kritischer Konfigurationsfehler: AUTH_SECRET ist nicht definiert.")
  }
  return crypto.createHash("sha256").update(secret).digest()
}

function encrypt(text: string): string {
  if (!text) return ""
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", getSecretKey(), iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}:${encrypted}`
}

function decrypt(text: string): string {
  if (!text || !text.includes(":")) return text
  try {
    const [ivHex, encrypted] = text.split(":")
    const iv = Buffer.from(ivHex, "hex")
    const decipher = crypto.createDecipheriv("aes-256-cbc", getSecretKey(), iv)
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch {
    return ""
  }
}

export interface SmtpSettings {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  enabled: boolean
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "smtp.host",
          "smtp.port",
          "smtp.secure",
          "smtp.user",
          "smtp.pass",
          "smtp.from",
          "smtp.enabled",
        ],
      },
    },
  })

  const map = new Map(settings.map((s) => [s.key, s.value]))

  return {
    host: map.get("smtp.host") || "",
    port: parseInt(map.get("smtp.port") || "587", 10),
    secure: map.get("smtp.secure") === "true",
    user: map.get("smtp.user") || "",
    pass: decrypt(map.get("smtp.pass") || ""),
    from: map.get("smtp.from") || "noreply@documentum.local",
    enabled: map.get("smtp.enabled") === "true",
  }
}

export async function saveSmtpSettings(
  input: Partial<SmtpSettings>,
  actorId: string
) {
  const current = await getSmtpSettings()
  const updated: SmtpSettings = {
    ...current,
    ...input,
  }

  const entries: [string, string][] = [
    ["smtp.host", updated.host],
    ["smtp.port", updated.port.toString()],
    ["smtp.secure", updated.secure.toString()],
    ["smtp.user", updated.user],
    ["smtp.pass", updated.pass ? encrypt(updated.pass) : ""],
    ["smtp.from", updated.from],
    ["smtp.enabled", updated.enabled.toString()],
  ]

  for (const [key, value] of entries) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }

  await logAudit({
    userId: actorId,
    action: "UPDATE",
    entityType: "AppSetting",
    entityId: "smtp",
    after: {
      host: updated.host,
      port: updated.port,
      secure: updated.secure,
      user: updated.user,
      from: updated.from,
      enabled: updated.enabled,
    },
  })

  return updated
}

export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const smtp = await getSmtpSettings()
    if (!smtp.host) {
      return { success: false, message: "Kein SMTP-Host konfiguriert." }
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    })

    await transporter.verify()
    return { success: true, message: "SMTP-Verbindung erfolgreich hergestellt!" }
  } catch (err: any) {
    return { success: false, message: `Verbindungsfehler: ${err.message}` }
  }
}

export async function listEmailTemplates() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { event: "asc" },
  })

  // Prüfen, ob Defaults fehlen, und nachpflegen
  const existingEvents = new Set(templates.map((t) => t.event))
  for (const [event, def] of Object.entries(DEFAULT_TEMPLATES)) {
    if (!existingEvents.has(event)) {
      const created = await prisma.emailTemplate.create({
        data: {
          event: def.event,
          name: def.name,
          subject: def.subject,
          bodyHtml: def.bodyHtml,
          bodyText: def.bodyText,
        },
      })
      templates.push(created)
    }
  }

  return templates
}

export async function getEmailTemplate(event: string) {
  let template = await prisma.emailTemplate.findUnique({
    where: { event },
  })

  if (!template && DEFAULT_TEMPLATES[event]) {
    const def = DEFAULT_TEMPLATES[event]
    template = await prisma.emailTemplate.create({
      data: {
        event: def.event,
        name: def.name,
        subject: def.subject,
        bodyHtml: def.bodyHtml,
        bodyText: def.bodyText,
      },
    })
  }

  return template
}

export async function saveEmailTemplate(
  event: string,
  data: { name?: string; subject: string; bodyHtml: string; bodyText: string },
  actorId: string
) {
  const template = await prisma.emailTemplate.upsert({
    where: { event },
    create: {
      event,
      name: data.name || DEFAULT_TEMPLATES[event]?.name || event,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
    },
    update: {
      name: data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
    },
  })

  await logAudit({
    userId: actorId,
    action: "UPDATE",
    entityType: "EmailTemplate",
    entityId: event,
    after: { subject: template.subject },
  })

  return template
}

export async function sendNotificationEmail(
  event: string,
  recipientEmail: string,
  placeholders: Record<string, string>
): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  try {
    if (!recipientEmail) return { success: false, error: "Keine Empfänger-Adresse" }

    const template = await getEmailTemplate(event)
    if (!template) {
      console.warn(`[EMAIL] Keine Vorlage für Event ${event} gefunden.`)
      return { success: false, error: `Keine Vorlage für ${event}` }
    }

    let subject = template.subject
    let bodyHtml = template.bodyHtml
    let bodyText = template.bodyText

    for (const [key, val] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, "g")
      subject = subject.replace(regex, val ?? "")
      bodyHtml = bodyHtml.replace(regex, val ?? "")
      bodyText = bodyText.replace(regex, val ?? "")
    }

    const smtp = await getSmtpSettings()

    if (!smtp.enabled || !smtp.host) {
      console.log(`[EMAIL SIMULATION] Event: ${event} | An: ${recipientEmail} | Betreff: ${subject}`)
      return { success: true, simulated: true }
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    })

    await transporter.sendMail({
      from: smtp.from || '"Documentum QM" <noreply@documentum.local>',
      to: recipientEmail,
      subject,
      text: bodyText,
      html: bodyHtml,
    })

    return { success: true }
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Fehler beim Versand (${event} an ${recipientEmail}):`, err?.message || err)
    return { success: false, error: err?.message || "Unbekannter Fehler" }
  }
}
