-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "IntExt" AS ENUM ('INT', 'EXT', 'INT_EXT');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER', 'MOMENTS_LATER');

-- CreateEnum
CREATE TYPE "ChangeFlag" AS ENUM ('NONE', 'MODIFIED', 'ADDED', 'OMITTED', 'RENUMBERED');

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "diffFromId" TEXT,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
    "parentSceneId" TEXT,
    "intExt" "IntExt" NOT NULL,
    "scriptedLocationName" TEXT NOT NULL,
    "locationId" TEXT,
    "timeOfDay" "TimeOfDay" NOT NULL,
    "synopsis" TEXT,
    "pageCount" DECIMAL(5,3),
    "changeFlag" "ChangeFlag" NOT NULL DEFAULT 'NONE',
    "changeReviewed" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneAsset" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "SceneAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Script_productionId_idx" ON "Script"("productionId");

-- CreateIndex
CREATE INDEX "Scene_scriptId_idx" ON "Scene"("scriptId");

-- CreateIndex
CREATE INDEX "Scene_productionId_idx" ON "Scene"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneAsset_sceneId_assetId_key" ON "SceneAsset"("sceneId", "assetId");

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_diffFromId_fkey" FOREIGN KEY ("diffFromId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_parentSceneId_fkey" FOREIGN KEY ("parentSceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneAsset" ADD CONSTRAINT "SceneAsset_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneAsset" ADD CONSTRAINT "SceneAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
