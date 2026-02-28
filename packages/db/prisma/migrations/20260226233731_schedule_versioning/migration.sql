/*
  Warnings:

  - You are about to drop the column `scriptedAliases` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `locationId` on the `Scene` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WizardStatus" AS ENUM ('PENDING', 'COMPLETE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- DropForeignKey
ALTER TABLE "Scene" DROP CONSTRAINT "Scene_locationId_fkey";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "scriptedAliases";

-- AlterTable
ALTER TABLE "Scene" DROP COLUMN "locationId",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "setId" TEXT,
ADD COLUMN     "wizardStatus" "WizardStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Script" ADD COLUMN     "wizardComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Set" ADD COLUMN     "scriptedAliases" TEXT[];

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "height" TEXT,
    "photograph" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterAsset" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "setId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneCharacter" (
    "sceneId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "SceneCharacter_pkey" PRIMARY KEY ("sceneId","characterId")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "diffFromId" TEXT,
    "changeSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootDay" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneSchedule" (
    "id" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SceneSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GanttPhase" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GanttPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPhase" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetPhase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_productionId_idx" ON "Character"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_productionId_name_key" ON "Character"("productionId", "name");

-- CreateIndex
CREATE INDEX "CharacterAsset_characterId_idx" ON "CharacterAsset"("characterId");

-- CreateIndex
CREATE INDEX "CharacterAsset_assetId_idx" ON "CharacterAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAsset_characterId_assetId_key" ON "CharacterAsset"("characterId", "assetId");

-- CreateIndex
CREATE INDEX "Schedule_productionId_idx" ON "Schedule"("productionId");

-- CreateIndex
CREATE INDEX "ShootDay_scheduleId_idx" ON "ShootDay"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ShootDay_scheduleId_dayNumber_key" ON "ShootDay"("scheduleId", "dayNumber");

-- CreateIndex
CREATE INDEX "SceneSchedule_shootDayId_idx" ON "SceneSchedule"("shootDayId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneSchedule_sceneId_key" ON "SceneSchedule"("sceneId");

-- CreateIndex
CREATE INDEX "GanttPhase_productionId_idx" ON "GanttPhase"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "GanttPhase_productionId_name_key" ON "GanttPhase"("productionId", "name");

-- CreateIndex
CREATE INDEX "SetPhase_setId_idx" ON "SetPhase"("setId");

-- CreateIndex
CREATE INDEX "SetPhase_phaseId_idx" ON "SetPhase"("phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "SetPhase_setId_phaseId_key" ON "SetPhase"("setId", "phaseId");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAsset" ADD CONSTRAINT "CharacterAsset_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_diffFromId_fkey" FOREIGN KEY ("diffFromId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDay" ADD CONSTRAINT "ShootDay_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneSchedule" ADD CONSTRAINT "SceneSchedule_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneSchedule" ADD CONSTRAINT "SceneSchedule_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanttPhase" ADD CONSTRAINT "GanttPhase_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPhase" ADD CONSTRAINT "SetPhase_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPhase" ADD CONSTRAINT "SetPhase_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "GanttPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
