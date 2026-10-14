-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "recordHash" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_recordHash_idx" ON "AuditLog"("recordHash");
