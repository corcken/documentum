import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── System-Rollen ─────────────────────────────────────────────────────────
  const systemRoles: [string, string][] = [
    ['ADMIN', 'all'],
    ['EDITOR', 'create,update'],
    ['VIEWER', 'read'],
  ]
  const sysRoleMap: Record<string, { id: string }> = {}
  for (const [name, permissions] of systemRoles) {
    const r = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, permissions },
    })
    sysRoleMap[name] = r
  }

  const group = await prisma.group.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: {
      name: 'Engineering'
    }
  })

  const hashedPassword = await bcrypt.hash('password123', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      roleId: sysRoleMap['ADMIN'].id,
      groupId: group.id
    }
  })

  // ── Demo-Benutzer für den Freigabe-Workflow (Prüfer/Genehmiger) ───────────
  const reviewerUser = await prisma.user.upsert({
    where: { email: 'pruefer@example.com' },
    update: {},
    create: {
      email: 'pruefer@example.com',
      name: 'Petra Prüferin',
      password: hashedPassword,
      roleId: sysRoleMap['EDITOR'].id,
      groupId: group.id
    }
  })
  const approverUser = await prisma.user.upsert({
    where: { email: 'freigeber@example.com' },
    update: {},
    create: {
      email: 'freigeber@example.com',
      name: 'Frank Freigeber',
      password: hashedPassword,
      roleId: sysRoleMap['EDITOR'].id,
      groupId: group.id
    }
  })

  console.log('Seed completed! Admin user created: admin@example.com / password123')
  console.log('Demo-Workflow-User: pruefer@example.com / freigeber@example.com (password123)')

  // ── Zentrale Einstellungen (Start-Liste, wächst dynamisch) ──────────────
  const settings: [string, string][] = [
    ['auth.mode', 'standalone'],        // standalone | ldap
    ['company.name', ''],
    ['training.defaultDueDays', '30'],
  ]
  for (const [key, value] of settings) {
    await prisma.appSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log('Settings seeded: ' + settings.map(([k]) => k).join(', '))

  // ── Dokumenttypen ────────────────────────────────────────────────────────
  const docTypes: [string, boolean][] = [
    ['SOP', true],              // Standardarbeitsanweisung → schulungspflichtig
    ['Formblatt', false],
    ['Protokoll', false],
    ['Bericht', false],
    ['Prüfprotokoll', false],
  ]
  const typeMap: Record<string, { id: string }> = {}
  for (const [name, requiresTraining] of docTypes) {
    const t = await prisma.documentType.upsert({
      where: { name },
      update: {},
      create: { name, requiresTraining },
    })
    typeMap[name] = t
  }
  console.log('DocumentTypes seeded: ' + docTypes.map(([n]) => n).join(', '))

  // ── Abteilungsbaum (Beispiel) ────────────────────────────────────────────
  // (Department hat kein natürliches Unique-Feld → per Name suchen/anlegen)
  async function findOrCreateDept(name: string, parentId: string | null, abbreviation?: string) {
    const existing = await prisma.department.findFirst({ where: { name } })
    if (existing) {
      if (existing.parentId !== parentId) {
        await prisma.department.update({ where: { id: existing.id }, data: { parentId } })
      }
      return existing
    }
    return prisma.department.create({ data: { name, parentId, abbreviation } })
  }

  const bereichProduktion = await findOrCreateDept('Produktion', null, 'PROD')
  const fertigung = await findOrCreateDept('Fertigung', bereichProduktion.id, 'FERT')
  await findOrCreateDept('Schicht A', fertigung.id)
  await findOrCreateDept('Schicht B', fertigung.id)
  const bereichQualitaet = await findOrCreateDept('Qualität', null, 'Q')
  const qm = await findOrCreateDept('QM', bereichQualitaet.id, 'QM')
  console.log('Departments seeded: Produktion > Fertigung > Schicht A/B; Qualität > QM')

  // ── Job-Rollen ────────────────────────────────────────────────────────────
  const jobRoles: [string, string?][] = [
    ['Maschinenführer', 'Bedient und überwacht Produktionsanlagen'],
    ['Schichtleiter', 'Führt eine Schicht'],
    ['Qualitätsmanager (QMB)', 'Verantwortlich für das QM-System'],
  ]
  const roleMap: Record<string, { id: string }> = {}
  for (const [name, description] of jobRoles) {
    const r = await prisma.jobRole.upsert({
      where: { name },
      update: {},
      create: { name, description },
    })
    roleMap[name] = r
  }
  console.log('JobRoles seeded: ' + jobRoles.map(([n]) => n).join(', '))

  // ── Admin in Abteilung/Rolle einordnen ────────────────────────────────────
  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      departmentId: qm.id,
      jobRoleId: roleMap['Qualitätsmanager (QMB)'].id,
    },
  })

  // ── Demo-Dokument (freigegebene SOP) ──────────────────────────────────────
  // Hinweis: Inhalt als reiner Text (der TipTap-Editor kommt später).
  const demoContent = `Beispiel-SOP Dokumentenlenkung

Diese SOP beschreibt den Umgang mit dokumentierter Information. Sie dient als Demo-Datensatz für den Freigabe-Workflow und das Schulungstracking.

Zweck

Sicherstellung, dass nur freigegebene und aktuelle Dokumente verwendet werden.`

  const existingDoc = await prisma.document.findUnique({ where: { documentNumber: 'SOP-001' } })
  if (!existingDoc) {
    await prisma.document.create({
      data: {
        documentNumber: 'SOP-001',
        type: { connect: { id: typeMap['SOP'].id } },
        owner: { connect: { id: adminUser.id } },
        versions: {
          create: {
            majorVersion: 1,
            minorVersion: 0,
            title: 'Beispiel-SOP Dokumentenlenkung',
            content: demoContent,
            status: 'Released',
            effectiveDate: new Date(),
            createdById: adminUser.id,
            reviewerId: reviewerUser.id,
            approverId: approverUser.id,
            scopeDepartments: { create: [{ departmentId: qm.id }] },
            scopeJobRoles: { create: [{ jobRoleId: roleMap['Qualitätsmanager (QMB)'].id }] },
          },
        },
      },
    })
    console.log('Demo document seeded: SOP-001 (Released, v1)')
  } else {
    console.log('Demo document SOP-001 already exists — skipped')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
