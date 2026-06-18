/*
  Warnings:

  - You are about to drop the column `baseShiftTypeId` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `isRotating` on the `ShiftType` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_baseShiftTypeId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "baseShiftTypeId",
ADD COLUMN     "employmentType" TEXT NOT NULL DEFAULT 'SOC_OPERATIONS',
ADD COLUMN     "environmentAccess" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'MALE',
ADD COLUMN     "isFixedSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentorId" TEXT,
ADD COLUMN     "requiresMentor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ShiftType" DROP COLUMN "isRotating",
ADD COLUMN     "isNightShift" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SchedulingRuleConfig" (
    "id" TEXT NOT NULL,
    "minRestHours" INTEGER NOT NULL DEFAULT 7,
    "recommendedRestHours" INTEGER NOT NULL DEFAULT 8,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 6,
    "maxWeeklyWorkdays" INTEGER NOT NULL DEFAULT 5,
    "rotationCycleDays" INTEGER NOT NULL DEFAULT 14,
    "shiftOverlapHours" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingRuleConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
