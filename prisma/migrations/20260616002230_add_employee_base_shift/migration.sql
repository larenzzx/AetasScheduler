-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "baseShiftTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_baseShiftTypeId_fkey" FOREIGN KEY ("baseShiftTypeId") REFERENCES "ShiftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
