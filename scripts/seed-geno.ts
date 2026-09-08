// Seed: Organisation „Gesundheit Nord" (GeNo) als Department-Baum anlegen.
// Daten: prisma/seed-data/geno-departments.ts (generiert aus ~/projekte/Geno).
// Idempotent: Jede Einheit trägt einen Marker [GenoKey: …] in description —
// bestehende Einträge werden aktualisiert, neue angelegt, keine gelöscht.
// Aufruf: npm run seed:geno
import { PrismaClient } from '@prisma/client'
import { genoDepartments } from '../prisma/seed-data/geno-departments'

const prisma = new PrismaClient()

async function main() {
  const keyToId: Record<string, string> = {}
  let neu = 0
  let aktualisiert = 0

  for (const item of genoDepartments) {
    const marker = `[GenoKey: ${item.key}]`
    const parentId = item.parentKey ? keyToId[item.parentKey] : null
    if (parentId === undefined) {
      console.warn(`⚠ Eltern fehlt für ${item.key} (${item.parentKey}) — hänge ohne Parent an`)
    }

    const existing = await prisma.department.findFirst({
      where: { description: { contains: marker } },
    })

    const data = {
      name: item.name,
      parentId,
      abbreviation: item.abbreviation,
      description: item.description,
    }

    if (existing) {
      await prisma.department.update({ where: { id: existing.id }, data })
      keyToId[item.key] = existing.id
      aktualisiert++
    } else {
      const created = await prisma.department.create({ data })
      keyToId[item.key] = created.id
      neu++
    }
  }

  const gesamt = await prisma.department.count()
  console.log(`Geno-Seed fertig: ${neu} neu angelegt, ${aktualisiert} aktualisiert.`)
  console.log(`Departments gesamt in DB: ${gesamt}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
