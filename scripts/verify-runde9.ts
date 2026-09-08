import { PrismaClient } from "@prisma/client"
import { DEPARTMENT_ROLES } from "../lib/constants"
import { createDocument, saveDraftVersion } from "../lib/services/document"
import { submitForReview, approveReview, returnToAuthor, approveVersion } from "../lib/services/workflow"
import {
  canManageDepartmentRoles,
  addDepartmentLead,
  addDepartmentRole,
  removeDepartmentRole,
  replaceDepartmentRole,
  countAffectedOpenTasks,
  setDepartmentQuorum,
} from "../lib/services/department-roles"
import { canReadVersion } from "../lib/services/document-helpers"

const prisma = new PrismaClient()

let testCounter = 0
function assert(condition: boolean, msg: string) {
  testCounter++
  if (!condition) {
    console.error(`❌ Test #${testCounter} FAILED: ${msg}`)
    throw new Error(`Assertion failed: ${msg}`)
  }
  console.log(`  ✓ Test #${testCounter} PASSED: ${msg}`)
}

async function runVerification() {
  console.log("=== Start Runde 9 E2E Verification ===")

  // Rollen laden
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } })
  const editorRole = await prisma.role.findUniqueOrThrow({ where: { name: "EDITOR" } })
  const viewerRole = await prisma.role.findUniqueOrThrow({ where: { name: "VIEWER" } })
  const docType = await prisma.documentType.findFirstOrThrow()

  // 1. Test-Organisation anlegen: Eltern-Bereich und Kind-Bereich
  const parentDept = await prisma.department.create({
    data: { name: `Test_ParentDept_${Date.now()}` },
  })
  const childDept = await prisma.department.create({
    data: { name: `Test_ChildDept_${Date.now()}`, parentId: parentDept.id },
  })

  // Test-Benutzer anlegen
  const adminUser = await prisma.user.create({
    data: { name: "Test_Admin", email: `admin_${Date.now()}@test.com`, password: "hash", roleId: adminRole.id, isActive: true },
  })
  const parentLeadUser = await prisma.user.create({
    data: { name: "Test_ParentLead", email: `parent_lead_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const childLeadUser = await prisma.user.create({
    data: { name: "Test_ChildLead", email: `child_lead_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const creatorUser = await prisma.user.create({
    data: { name: "Test_Creator", email: `creator_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const nonCreatorUser = await prisma.user.create({
    data: { name: "Test_NonCreator", email: `non_creator_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const pruefer1 = await prisma.user.create({
    data: { name: "Test_Pruefer1", email: `pruefer1_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const pruefer2 = await prisma.user.create({
    data: { name: "Test_Pruefer2", email: `pruefer2_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const freigeber1 = await prisma.user.create({
    data: { name: "Test_Freigeber1", email: `freigeber1_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const internalViewer = await prisma.user.create({
    data: { name: "Test_InternalViewer", email: `viewer_int_${Date.now()}@test.com`, password: "hash", roleId: viewerRole.id, isActive: true, isExternal: false },
  })
  const externalViewer = await prisma.user.create({
    data: { name: "Test_ExternalViewer", email: `viewer_ext_${Date.now()}@test.com`, password: "hash", roleId: viewerRole.id, isActive: true, isExternal: true },
  })

  // Leiter zuweisen
  await addDepartmentLead(adminUser.id, parentDept.id, parentLeadUser.id)
  await addDepartmentLead(adminUser.id, childDept.id, childLeadUser.id)

  console.log("\n--- Item 7: Bereichsrollen-Pflege & Hierarchie-Rechte ---")
  assert(await canManageDepartmentRoles(adminUser.id, childDept.id), "Admin darf Kind-Bereich verwalten")
  assert(await canManageDepartmentRoles(childLeadUser.id, childDept.id), "Kind-Leiter darf Kind-Bereich verwalten")
  assert(await canManageDepartmentRoles(parentLeadUser.id, childDept.id), "Eltern-Leiter darf Kind-Bereich verwalten (Vorfahren-Hierarchie)")
  assert(!(await canManageDepartmentRoles(childLeadUser.id, parentDept.id)), "Kind-Leiter darf Eltern-Bereich NICHT verwalten")
  assert(!(await canManageDepartmentRoles(creatorUser.id, childDept.id)), "Normaler User darf Bereich NICHT verwalten")

  console.log("\n--- Item 2: Anlegen: Ersteller-Rolle & Admin-Ausnahme (F6) ---")
  // Ersteller-Rolle vergeben an creatorUser in childDept
  await addDepartmentRole(childLeadUser.id, childDept.id, creatorUser.id, DEPARTMENT_ROLES.ERSTELLER)

  // Ersteller kann anlegen
  const docNum1 = `TEST-DOC-${Date.now()}-1`
  const doc1 = await createDocument({
    documentNumber: docNum1,
    title: "Test Dokument 1",
    typeId: docType.id,
    content: "Initial Content",
    ownerId: creatorUser.id,
    departmentId: childDept.id,
    departmentIds: [],
    jobRoleIds: [],
  })
  assert(doc1.departmentId === childDept.id, "Dokument gehört dem Kind-Bereich")

  // Non-Creator versucht anzulegen -> muss scheitern
  let nonCreatorFailed = false
  try {
    await createDocument({
      documentNumber: `FAIL-${Date.now()}`,
      title: "Fail Doc",
      typeId: docType.id,
      content: "Content",
      ownerId: nonCreatorUser.id,
      departmentId: childDept.id,
      departmentIds: [],
      jobRoleIds: [],
    })
  } catch (e: any) {
    nonCreatorFailed = true
    assert(e.message.includes("Ersteller-Rolle"), "Fehlermeldung enthält Ersteller-Rolle Hinweis")
  }
  assert(nonCreatorFailed, "Benutzer ohne Ersteller-Rolle kann kein Dokument im Bereich anlegen")

  // Admin darf trotz fehlender Ersteller-Rolle anlegen (F6)
  const docAdmin = await createDocument({
    documentNumber: `ADMIN-DOC-${Date.now()}`,
    title: "Admin Doc",
    typeId: docType.id,
    content: "Admin Content",
    ownerId: adminUser.id,
    departmentId: childDept.id,
    departmentIds: [],
    jobRoleIds: [],
  })
  assert(docAdmin.id !== undefined, "Admin kann ausnahmsweise ohne Ersteller-Rolle anlegen (F6)")

  console.log("\n--- Item 4: Einreichen ohne besetzte Prüfer/Freigeber blockiert (F1) ---")
  let submitBlocked = false
  try {
    await submitForReview({ documentId: doc1.id, userId: creatorUser.id })
  } catch (e: any) {
    submitBlocked = true
    assert(e.message.includes("Einreichung blockiert"), "Blockiert mit Einreichung-blockiert-Meldung")
  }
  assert(submitBlocked, "Einreichung blockiert wenn Prüfer/Freigeber fehlen")

  console.log("\n--- Item 3: Einreichen aus Rollen ohne Vererbung & Ersteller-Ausschluss ---")
  // Weise Prüfer an Eltern zu, um Vererbungstest zu machen
  const parentPruefer = await prisma.user.create({
    data: { name: "Test_ParentPruefer", email: `pp_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  await addDepartmentRole(parentLeadUser.id, parentDept.id, parentPruefer.id, DEPARTMENT_ROLES.PRUEFER)

  // Weise Prüfer und Freigeber an childDept zu
  await addDepartmentRole(childLeadUser.id, childDept.id, pruefer1.id, DEPARTMENT_ROLES.PRUEFER)
  await addDepartmentRole(childLeadUser.id, childDept.id, freigeber1.id, DEPARTMENT_ROLES.FREIGEBER)

  // Jetzt einreichen
  await submitForReview({ documentId: doc1.id, userId: creatorUser.id })
  const latestV1 = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc1.id },
    include: { workflowTasks: true },
  })
  assert(latestV1.status === "In_Review", "Version ist In_Review")
  assert(latestV1.workflowTasks.length === 1, "Genau 1 Task für Kind-Prüfer erzeugt")
  assert(latestV1.workflowTasks[0].assignedToId === pruefer1.id, "Task ist Prüfer des Kind-Bereichs zugewiesen")
  assert(
    !latestV1.workflowTasks.some((t) => t.assignedToId === parentPruefer.id),
    "Eltern-Prüfer wurde NICHT vererbt (keine Vererbung nach unten)"
  )

  console.log("\n--- Item 5: Quorum 'einer' mit Cancelled & Audit ---")
  // Kind-Bereich auf Quorum "einer" stellen
  await setDepartmentQuorum(childLeadUser.id, childDept.id, "einer")
  // Zweiten Prüfer ergänzen
  await addDepartmentRole(childLeadUser.id, childDept.id, pruefer2.id, DEPARTMENT_ROLES.PRUEFER)

  // Neues Dokument anlegen und einreichen (jetzt 2 Prüfer)
  const doc2 = await createDocument({
    documentNumber: `DOC2-${Date.now()}`,
    title: "Doc 2 Quorum einer",
    typeId: docType.id,
    content: "Content 2",
    ownerId: creatorUser.id,
    departmentId: childDept.id,
    departmentIds: [],
    jobRoleIds: [],
  })
  await submitForReview({ documentId: doc2.id, userId: creatorUser.id })

  const v2 = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc2.id },
    include: { workflowTasks: true },
  })
  assert(v2.workflowTasks.length === 2, "2 Pending-Tasks für Review erzeugt (pruefer1 & pruefer2)")

  // pruefer1 genehmigt Review -> Quorum 'einer' schließt Phase ab
  await approveReview({
    versionId: v2.id,
    userId: pruefer1.id,
  })

  const v2AfterReview = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc2.id },
    include: { workflowTasks: true },
  })
  assert(v2AfterReview.status === "In_Approval", "Version rückt nach 1 Approval sofort zu In_Approval vor")
  const p2Task = v2AfterReview.workflowTasks.find((t) => t.assignedToId === pruefer2.id && t.taskType === "Review")
  assert(p2Task?.status === "Cancelled", "Übriger Review-Task von Prüfer 2 wurde Cancelled")

  const cancelAudit = await prisma.auditLog.findFirst({
    where: { entityId: p2Task?.id, action: "CANCEL_TASK" },
  })
  assert(Boolean(cancelAudit), "Audit-Eintrag für 'CANCEL_TASK' am stornierten Task vorhanden")

  // Freigeber1 genehmigt -> Released
  await approveVersion({
    versionId: v2.id,
    userId: freigeber1.id,
  })
  const v2Released = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc2.id },
  })
  assert(v2Released.status === "Released", "Dokument wurde erfolgreich freigegeben")
  assert(v2Released.majorVersion === 1 && v2Released.minorVersion === 0, "Version ist 1.0")

  console.log("\n--- Item 6: Quorum 'alle' mit Ablehnung & frischem Neustart (Q8) ---")
  await setDepartmentQuorum(childLeadUser.id, childDept.id, "alle")

  const doc3 = await createDocument({
    documentNumber: `DOC3-${Date.now()}`,
    title: "Doc 3 Quorum alle",
    typeId: docType.id,
    content: "Content 3",
    ownerId: creatorUser.id,
    departmentId: childDept.id,
    departmentIds: [],
    jobRoleIds: [],
  })
  await submitForReview({ documentId: doc3.id, userId: creatorUser.id })

  let v3 = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc3.id },
    include: { workflowTasks: true },
  })
  assert(v3.workflowTasks.length === 2, "2 Pending-Tasks für Review erzeugt")

  // P1 genehmigt -> Phase bleibt In_Review da 'alle' gefordert
  await approveReview({
    versionId: v3.id,
    userId: pruefer1.id,
  })
  let v3Check = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc3.id },
  })
  assert(v3Check.status === "In_Review", "Version bleibt In_Review bis alle zustimmen")

  // P2 lehnt ab -> Zurück zu Draft
  await returnToAuthor({
    versionId: v3.id,
    userId: pruefer2.id,
    comment: "Bitte Kapitel 2 überarbeiten",
  })
  v3Check = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc3.id },
  })
  assert(v3Check.status === "Draft", "Version ist zurück im Draft")

  // Ersteller korrigiert
  await saveDraftVersion({
    documentId: doc3.id,
    title: "Doc 3 Quorum alle (korrigiert)",
    content: "Content 3 mit Korrekturen",
    changeReason: "Kapitel 2 überarbeitet",
    userId: creatorUser.id,
  })

  // Wiedereinreichen -> frische Tasks für ALLE Kandidaten (Q8)
  await submitForReview({ documentId: doc3.id, userId: creatorUser.id })
  const v3New = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc3.id },
    orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
    include: { workflowTasks: true },
  })
  assert(v3New.workflowTasks.length === 2, "Frische Tasks für ALLE Prüfer erzeugt")
  assert(v3New.workflowTasks.every((t) => t.status === "Pending"), "Alle neuen Tasks sind Pending")

  console.log("\n--- Item 8: Neubesetzung mit Übernahme offener Aufgaben & Hinweis ---")
  // Prüfer 1 hat offenen Task an v3New
  const affectedCount = await countAffectedOpenTasks(childDept.id, DEPARTMENT_ROLES.PRUEFER, pruefer1.id)
  assert(affectedCount === 2, "countAffectedOpenTasks meldet genau 2 offene Aufgaben für Prüfer 1 (an doc1 und doc3)")

  // Neuer Prüfer 3 ersetzt Prüfer 1
  const pruefer3 = await prisma.user.create({
    data: { name: "Test_Pruefer3", email: `p3_${Date.now()}@test.com`, password: "hash", roleId: editorRole.id, isActive: true },
  })
  const replaceResult = await replaceDepartmentRole(
    childLeadUser.id,
    childDept.id,
    pruefer1.id,
    pruefer3.id,
    DEPARTMENT_ROLES.PRUEFER
  )
  assert(replaceResult.affectedTasksCount === 2, "replaceDepartmentRole meldet 2 betroffene Aufgaben")

  // Prüfe, dass der Task umgehängt wurde
  const reassignedTask = await prisma.workflowTask.findFirstOrThrow({
    where: { documentVersionId: v3New.id, assignedToId: pruefer3.id },
  })
  assert(reassignedTask.status === "Pending", "Offener Task wurde auf den neuen Prüfer umgehängt")

  const reassignAudit = await prisma.auditLog.findFirst({
    where: { entityId: reassignedTask.id, action: "REASSIGN_TASK" },
  })
  assert(Boolean(reassignAudit), "Audit-Log für REASSIGN_TASK geschrieben")

  console.log("\n--- Item 9: Withdrawn-Sichtbarkeit (intern vs extern, Q25) ---")
  const { withdrawDocument } = await import("../lib/services/archive")
  await withdrawDocument({
    documentId: doc2.id,
    versionId: v2Released.id,
    userId: adminUser.id,
    userRole: "ADMIN",
    comment: "Wegen neuer Richtlinie zurückgezogen",
  })

  const withdrawnV2 = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: doc2.id },
  })
  assert(withdrawnV2.status === "Withdrawn", "doc2 ist nun Withdrawn")

  // Interner Leser (auch VIEWER) sieht Withdrawn
  const internalCanRead = await canReadVersion(internalViewer.id, withdrawnV2.id)
  assert(internalCanRead, "Interner VIEWER sieht zurückgezogene Version (Q25)")

  // Externer Leser sieht Withdrawn NICHT
  const externalCanRead = await canReadVersion(externalViewer.id, withdrawnV2.id)
  assert(!externalCanRead, "Externer Nutzer sieht zurückgezogene Version NICHT (Q25)")

  console.log("\n--- Item 10: Altbestand / Bestandsschutz (Q9) ---")
  // Dokument ohne departmentId mit manueller Zuweisung
  const legacyDoc = await createDocument({
    documentNumber: `LEGACY-${Date.now()}`,
    title: "Legacy Doc",
    typeId: docType.id,
    content: "Legacy Content",
    ownerId: creatorUser.id,
    reviewerId: pruefer2.id,
    approverId: freigeber1.id,
    departmentIds: [],
    jobRoleIds: [],
  })
  assert(legacyDoc.departmentId === null, "Legacy Doc hat keine departmentId")

  await submitForReview({ documentId: legacyDoc.id, userId: creatorUser.id })
  const legacyV = await prisma.documentVersion.findFirstOrThrow({
    where: { documentId: legacyDoc.id },
    include: { workflowTasks: true },
  })
  assert(legacyV.workflowTasks[0].assignedToId === pruefer2.id, "Legacy-Task wurde an manuellen Prüfer vergeben")

  console.log("\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (10/10)")
}

runVerification()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
