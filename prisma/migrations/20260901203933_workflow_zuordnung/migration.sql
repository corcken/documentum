-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "majorVersion" INTEGER NOT NULL,
    "minorVersion" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "effectiveDate" DATETIME,
    "obsoleteDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "reviewerId" TEXT,
    "approverId" TEXT,
    CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DocumentVersion" ("content", "createdAt", "createdById", "documentId", "effectiveDate", "filePath", "id", "majorVersion", "minorVersion", "obsoleteDate", "status", "title") SELECT "content", "createdAt", "createdById", "documentId", "effectiveDate", "filePath", "id", "majorVersion", "minorVersion", "obsoleteDate", "status", "title" FROM "DocumentVersion";
DROP TABLE "DocumentVersion";
ALTER TABLE "new_DocumentVersion" RENAME TO "DocumentVersion";
CREATE UNIQUE INDEX "DocumentVersion_documentId_majorVersion_minorVersion_key" ON "DocumentVersion"("documentId", "majorVersion", "minorVersion");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
