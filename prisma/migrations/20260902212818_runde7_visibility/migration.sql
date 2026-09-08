-- AlterTable
ALTER TABLE "Document" ADD COLUMN "reviewIntervalMonths" INTEGER;

-- CreateTable
CREATE TABLE "DestructionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentVersionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DestructionRequest_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DestructionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DestructionRequest_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocumentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "requiresTraining" BOOLEAN NOT NULL DEFAULT false,
    "defaultVisibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "retentionMonths" INTEGER NOT NULL DEFAULT 120
);
INSERT INTO "new_DocumentType" ("id", "name", "requiresTraining") SELECT "id", "name", "requiresTraining" FROM "DocumentType";
DROP TABLE "DocumentType";
ALTER TABLE "new_DocumentType" RENAME TO "DocumentType";
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");
CREATE TABLE "new_DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "majorVersion" INTEGER NOT NULL,
    "minorVersion" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "filePath" TEXT,
    "changeReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "effectiveDate" DATETIME,
    "obsoleteDate" DATETIME,
    "nextReviewDate" DATETIME,
    "retentionEndDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "reviewerId" TEXT,
    "approverId" TEXT,
    CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DocumentVersion" ("approverId", "changeReason", "content", "createdAt", "createdById", "documentId", "effectiveDate", "filePath", "id", "majorVersion", "minorVersion", "obsoleteDate", "reviewerId", "status", "title") SELECT "approverId", "changeReason", "content", "createdAt", "createdById", "documentId", "effectiveDate", "filePath", "id", "majorVersion", "minorVersion", "obsoleteDate", "reviewerId", "status", "title" FROM "DocumentVersion";
DROP TABLE "DocumentVersion";
ALTER TABLE "new_DocumentVersion" RENAME TO "DocumentVersion";
CREATE UNIQUE INDEX "DocumentVersion_documentId_majorVersion_minorVersion_key" ON "DocumentVersion"("documentId", "majorVersion", "minorVersion");
CREATE TABLE "new_FileAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "variant" TEXT NOT NULL DEFAULT 'original',
    "parentId" TEXT,
    "trashedAt" DATETIME,
    "destroyedAt" DATETIME,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FileAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FileAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FileAsset" ("createdAt", "height", "id", "mimeType", "originalName", "ownerId", "parentId", "sha256", "size", "storageKey", "trashedAt", "updatedAt", "variant", "width") SELECT "createdAt", "height", "id", "mimeType", "originalName", "ownerId", "parentId", "sha256", "size", "storageKey", "trashedAt", "updatedAt", "variant", "width" FROM "FileAsset";
DROP TABLE "FileAsset";
ALTER TABLE "new_FileAsset" RENAME TO "FileAsset";
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");
CREATE TABLE "new_FileAssetUse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileAssetId" TEXT NOT NULL,
    "documentVersionId" TEXT,
    "role" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAssetUse_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileAssetUse_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileAssetUse_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FileAssetUse" ("createdAt", "createdById", "documentVersionId", "fileAssetId", "id", "role") SELECT "createdAt", "createdById", "documentVersionId", "fileAssetId", "id", "role" FROM "FileAssetUse";
DROP TABLE "FileAssetUse";
ALTER TABLE "new_FileAssetUse" RENAME TO "FileAssetUse";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT,
    "groupId" TEXT,
    "departmentId" TEXT,
    "jobRoleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "departmentId", "email", "groupId", "id", "isActive", "jobRoleId", "name", "password", "roleId", "updatedAt", "username") SELECT "createdAt", "departmentId", "email", "groupId", "id", "isActive", "jobRoleId", "name", "password", "roleId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
