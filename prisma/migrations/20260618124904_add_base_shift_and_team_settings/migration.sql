-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "currentShiftTypeId" TEXT;

-- AlterTable
ALTER TABLE "ShiftType" ADD COLUMN     "daysOfWeek" "DayOfWeek"[] DEFAULT ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI']::"DayOfWeek"[];

-- CreateTable
CREATE TABLE "TeamSettings" (
    "team" "Team" NOT NULL,
    "rotationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSettings_pkey" PRIMARY KEY ("team")
);

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_currentShiftTypeId_fkey" FOREIGN KEY ("currentShiftTypeId") REFERENCES "ShiftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
