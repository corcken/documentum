import { prisma } from "@/lib/prisma"
import { sendNotificationEmail } from "./email"
import { formatVersion } from "@/lib/version"

const getBaseUrl = () => process.env.NEXTAUTH_URL || "http://localhost:3300"

export async function notifyReviewSubmitted(documentId: string, versionId: string, actorId: string) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } })
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { reviewer: true, createdBy: true },
    })
    if (!doc || !version || !version.reviewer?.email) return

    const actor = await prisma.user.findUnique({ where: { id: actorId } })
    await sendNotificationEmail("REVIEW_SUBMITTED", version.reviewer.email, {
      name: version.reviewer.name || version.reviewer.email,
      documentNumber: doc.documentNumber,
      title: version.title,
      version: formatVersion(version.majorVersion, version.minorVersion),
      link: `${getBaseUrl()}/documents/${doc.id}`,
      actorName: actor?.name || actor?.email || "Ein Benutzer",
    })
  } catch (err) {
    console.error("notifyReviewSubmitted failed:", err)
  }
}

export async function notifyReviewApproved(documentId: string, versionId: string, actorId: string) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } })
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { approver: true, createdBy: true },
    })
    if (!doc || !version || !version.approver?.email) return

    const actor = await prisma.user.findUnique({ where: { id: actorId } })
    await sendNotificationEmail("REVIEW_APPROVED", version.approver.email, {
      name: version.approver.name || version.approver.email,
      documentNumber: doc.documentNumber,
      title: version.title,
      version: formatVersion(version.majorVersion, version.minorVersion),
      link: `${getBaseUrl()}/documents/${doc.id}`,
      actorName: actor?.name || actor?.email || "Ein Benutzer",
    })
  } catch (err) {
    console.error("notifyReviewApproved failed:", err)
  }
}

export async function notifyVersionApproved(documentId: string, versionId: string, actorId: string) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { owner: true } })
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { createdBy: true },
    })
    if (!doc || !version) return

    const actor = await prisma.user.findUnique({ where: { id: actorId } })
    const recipients = new Set<string>()
    if (version.createdBy?.email) recipients.add(version.createdBy.email)
    if (doc.owner?.email) recipients.add(doc.owner.email)

    for (const email of recipients) {
      await sendNotificationEmail("VERSION_APPROVED", email, {
        name: email,
        documentNumber: doc.documentNumber,
        title: version.title,
        version: formatVersion(version.majorVersion, version.minorVersion),
        link: `${getBaseUrl()}/documents/${doc.id}`,
        actorName: actor?.name || actor?.email || "Ein Benutzer",
      })
    }
  } catch (err) {
    console.error("notifyVersionApproved failed:", err)
  }
}

export async function notifyVersionReturned(
  documentId: string,
  versionId: string,
  comment: string,
  actorId: string
) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } })
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { createdBy: true },
    })
    if (!doc || !version || !version.createdBy?.email) return

    const actor = await prisma.user.findUnique({ where: { id: actorId } })
    await sendNotificationEmail("VERSION_RETURNED", version.createdBy.email, {
      name: version.createdBy.name || version.createdBy.email,
      documentNumber: doc.documentNumber,
      title: version.title,
      version: formatVersion(version.majorVersion, version.minorVersion),
      comment: comment || "Keine Begründung angegeben",
      link: `${getBaseUrl()}/documents/${doc.id}`,
      actorName: actor?.name || actor?.email || "Ein Benutzer",
    })
  } catch (err) {
    console.error("notifyVersionReturned failed:", err)
  }
}

export async function notifyUserCreated(user: { id: string; email: string; name?: string | null }) {
  try {
    await sendNotificationEmail("USER_CREATED", user.email, {
      name: user.name || user.email,
      email: user.email,
      link: `${getBaseUrl()}/`,
    })
  } catch (err) {
    console.error("notifyUserCreated failed:", err)
  }
}
