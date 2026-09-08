import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { DEPARTMENT_ROLES } from "../lib/constants"

const prisma = new PrismaClient()

async function main() {
  console.log("=== Setup Bereich: GeNo-Beispiel-Ausschnitt einrichten ===")

  // Rollen laden
  const editorRole = await prisma.role.findUnique({ where: { name: "EDITOR" } })
  const viewerRole = await prisma.role.findUnique({ where: { name: "VIEWER" } })
  if (!editorRole || !viewerRole) {
    throw new Error("Systemrollen EDITOR oder VIEWER nicht gefunden.")
  }

  // Abteilungen aus GeNo suchen oder anlegen falls fehlend
  const targetDepts = [
    {
      query: "Zentrum für Frauengesundheit, Geburtshilfe und Perinatologie",
      slug: "frauengesundheit",
      shortName: "Frauengesundheit",
      fallbackName: "Zentrum für Frauengesundheit, Geburtshilfe und Perinatologie",
    },
    {
      query: "Geburtshilfe im Eltern-Kind-Zentrum Prof. Hess",
      slug: "geburtshilfe",
      shortName: "Geburtshilfe",
      fallbackName: "Geburtshilfe im Eltern-Kind-Zentrum Prof. Hess",
    },
    {
      query: "Kreißsaal",
      slug: "kreisssaal",
      shortName: "Kreißsaal",
      fallbackName: "Kreißsaal",
    },
    {
      query: "Schwangerenambulanz",
      slug: "schwangerenambulanz",
      shortName: "Schwangerenambulanz",
      fallbackName: "Schwangerenambulanz",
    },
  ]

  const passwordHash = await bcrypt.hash("123456", 10)

  for (const t of targetDepts) {
    let dept = await prisma.department.findFirst({
      where: { name: { contains: t.query } },
    })

    if (!dept) {
      console.log(`Department nicht gefunden, lege an: ${t.fallbackName}`)
      dept = await prisma.department.create({
        data: {
          name: t.fallbackName,
        },
      })
    }

    console.log(`\nRichte Bereich ein: ${dept.name} (${dept.id})`)

    // 1. Ersteller-Konto
    const erstellerEmail = `team_${t.slug}_ersteller@example.com`
    const erstellerUser = await prisma.user.upsert({
      where: { email: erstellerEmail },
      update: { isActive: true, roleId: editorRole.id, departmentId: dept.id },
      create: {
        name: `Team_${t.shortName}_Ersteller`,
        email: erstellerEmail,
        password: passwordHash,
        roleId: editorRole.id,
        departmentId: dept.id,
        isActive: true,
      },
    })
    await prisma.departmentRoleAssignment.upsert({
      where: {
        departmentId_userId_role: {
          departmentId: dept.id,
          userId: erstellerUser.id,
          role: DEPARTMENT_ROLES.ERSTELLER,
        },
      },
      update: {},
      create: {
        departmentId: dept.id,
        userId: erstellerUser.id,
        role: DEPARTMENT_ROLES.ERSTELLER,
      },
    })
    console.log(`  ✓ Ersteller: ${erstellerUser.email}`)

    // 2. Prüfer-Konto
    const prueferEmail = `team_${t.slug}_pruefer@example.com`
    const prueferUser = await prisma.user.upsert({
      where: { email: prueferEmail },
      update: { isActive: true, roleId: editorRole.id, departmentId: dept.id },
      create: {
        name: `Team_${t.shortName}_Pruefer`,
        email: prueferEmail,
        password: passwordHash,
        roleId: editorRole.id,
        departmentId: dept.id,
        isActive: true,
      },
    })
    await prisma.departmentRoleAssignment.upsert({
      where: {
        departmentId_userId_role: {
          departmentId: dept.id,
          userId: prueferUser.id,
          role: DEPARTMENT_ROLES.PRUEFER,
        },
      },
      update: {},
      create: {
        departmentId: dept.id,
        userId: prueferUser.id,
        role: DEPARTMENT_ROLES.PRUEFER,
      },
    })
    console.log(`  ✓ Prüfer: ${prueferUser.email}`)

    // 3. Freigeber-Konto (= Bereichsleiter)
    const freigeberEmail = `team_${t.slug}_freigeber@example.com`
    const freigeberUser = await prisma.user.upsert({
      where: { email: freigeberEmail },
      update: { isActive: true, roleId: editorRole.id, departmentId: dept.id },
      create: {
        name: `Team_${t.shortName}_Freigeber`,
        email: freigeberEmail,
        password: passwordHash,
        roleId: editorRole.id,
        departmentId: dept.id,
        isActive: true,
      },
    })
    await prisma.departmentRoleAssignment.upsert({
      where: {
        departmentId_userId_role: {
          departmentId: dept.id,
          userId: freigeberUser.id,
          role: DEPARTMENT_ROLES.FREIGEBER,
        },
      },
      update: {},
      create: {
        departmentId: dept.id,
        userId: freigeberUser.id,
        role: DEPARTMENT_ROLES.FREIGEBER,
      },
    })
    // Freigeber ist auch Leiter
    await prisma.departmentLead.upsert({
      where: {
        departmentId_userId: {
          departmentId: dept.id,
          userId: freigeberUser.id,
        },
      },
      update: {},
      create: {
        departmentId: dept.id,
        userId: freigeberUser.id,
      },
    })
    console.log(`  ✓ Freigeber & Leiter: ${freigeberUser.email}`)

    // 4. Mitglied 1 (Leser)
    const m1Email = `team_${t.slug}_mitglied1@example.com`
    const m1User = await prisma.user.upsert({
      where: { email: m1Email },
      update: { isActive: true, roleId: viewerRole.id, departmentId: dept.id },
      create: {
        name: `Team_${t.shortName}_Mitglied1`,
        email: m1Email,
        password: passwordHash,
        roleId: viewerRole.id,
        departmentId: dept.id,
        isActive: true,
      },
    })
    console.log(`  ✓ Mitglied 1: ${m1User.email}`)

    // 5. Mitglied 2 (Leser)
    const m2Email = `team_${t.slug}_mitglied2@example.com`
    const m2User = await prisma.user.upsert({
      where: { email: m2Email },
      update: { isActive: true, roleId: viewerRole.id, departmentId: dept.id },
      create: {
        name: `Team_${t.shortName}_Mitglied2`,
        email: m2Email,
        password: passwordHash,
        roleId: viewerRole.id,
        departmentId: dept.id,
        isActive: true,
      },
    })
    console.log(`  ✓ Mitglied 2: ${m2User.email}`)
  }

  console.log("\n=== Setup erfolgreich abgeschlossen! ===")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
