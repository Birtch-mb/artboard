/*
  Warnings:

  - You are about to drop the `_LocationToSet` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Set` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SetStatus" AS ENUM ('IN_PREP', 'READY', 'SHOOTING', 'STRUCK');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('REFERENCE', 'IN_PROGRESS', 'FINAL', 'ON_SET');

-- DropForeignKey
ALTER TABLE "_LocationToSet" DROP CONSTRAINT "_LocationToSet_A_fkey";

-- DropForeignKey
ALTER TABLE "_LocationToSet" DROP CONSTRAINT "_LocationToSet_B_fkey";

-- AlterTable
ALTER TABLE "LocationFile" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Set" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "parentSetId" TEXT,
ADD COLUMN     "status" "SetStatus" NOT NULL DEFAULT 'IN_PREP',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "_LocationToSet";

-- CreateTable
CREATE TABLE "SetLocation" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetFile" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "fileType" "FileCategory" NOT NULL,
    "photoCategory" "PhotoCategory",
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetLocation_setId_locationId_key" ON "SetLocation"("setId", "locationId");

-- CreateIndex
CREATE INDEX "Set_productionId_idx" ON "Set"("productionId");

-- CreateIndex
CREATE INDEX "Set_parentSetId_idx" ON "Set"("parentSetId");

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_parentSetId_fkey" FOREIGN KEY ("parentSetId") REFERENCES "Set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLocation" ADD CONSTRAINT "SetLocation_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLocation" ADD CONSTRAINT "SetLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetFile" ADD CONSTRAINT "SetFile_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
