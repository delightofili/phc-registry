/*
  Warnings:

  - A unique constraint covering the columns `[cardNumber]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Phc` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cardNumber` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Phc` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "cardNumber" TEXT NOT NULL,
ADD COLUMN     "gravida" INTEGER,
ADD COLUMN     "isPregnant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "para" INTEGER;

-- AlterTable
ALTER TABLE "Phc" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "patientCounter" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ImmunizationRecord" (
    "id" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "doseNumber" INTEGER NOT NULL DEFAULT 1,
    "dateGiven" DATE NOT NULL,
    "nextDueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "ImmunizationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImmunizationRecord_patientId_idx" ON "ImmunizationRecord"("patientId");

-- CreateIndex
CREATE INDEX "ImmunizationRecord_nextDueDate_idx" ON "ImmunizationRecord"("nextDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_cardNumber_key" ON "Patient"("cardNumber");

-- CreateIndex
CREATE INDEX "Patient_isPregnant_idx" ON "Patient"("isPregnant");

-- CreateIndex
CREATE UNIQUE INDEX "Phc_code_key" ON "Phc"("code");

-- AddForeignKey
ALTER TABLE "ImmunizationRecord" ADD CONSTRAINT "ImmunizationRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
