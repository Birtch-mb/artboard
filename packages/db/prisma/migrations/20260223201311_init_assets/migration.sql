-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('PROPS', 'SET_DRESSING', 'GRAPHICS', 'FURNITURE', 'VEHICLES', 'EXPENDABLES', 'SOFT_FURNISHINGS', 'GREENS', 'WEAPONS', 'FOOD', 'ANIMALS', 'SPECIAL_EFFECTS', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_SOURCING', 'CONFIRMED', 'ON_SET', 'RETURNED', 'STRUCK');

-- CreateEnum
CREATE TYPE "ContinuityState" AS ENUM ('PRESENT', 'ABSENT', 'MODIFIED', 'HERO', 'DAMAGED', 'DRESSED', 'STRUCK');

-- CreateTable
CREATE TABLE "AssetTag" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "dimensions" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "budgetCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_SOURCING',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetTagMap" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "AssetTagMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSetMap" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,

    CONSTRAINT "AssetSetMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetFile" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContinuityEvent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
    "state" "ContinuityState" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContinuityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContinuityEventFile" (
    "id" TEXT NOT NULL,
    "continuityEventId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContinuityEventFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetTag_productionId_name_key" ON "AssetTag"("productionId", "name");

-- CreateIndex
CREATE INDEX "Asset_productionId_idx" ON "Asset"("productionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTagMap_assetId_tagId_key" ON "AssetTagMap"("assetId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSetMap_assetId_setId_key" ON "AssetSetMap"("assetId", "setId");

-- CreateIndex
CREATE INDEX "ContinuityEvent_assetId_idx" ON "ContinuityEvent"("assetId");

-- AddForeignKey
ALTER TABLE "AssetTag" ADD CONSTRAINT "AssetTag_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTagMap" ADD CONSTRAINT "AssetTagMap_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTagMap" ADD CONSTRAINT "AssetTagMap_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "AssetTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSetMap" ADD CONSTRAINT "AssetSetMap_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSetMap" ADD CONSTRAINT "AssetSetMap_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFile" ADD CONSTRAINT "AssetFile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContinuityEvent" ADD CONSTRAINT "ContinuityEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContinuityEventFile" ADD CONSTRAINT "ContinuityEventFile_continuityEventId_fkey" FOREIGN KEY ("continuityEventId") REFERENCES "ContinuityEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
