-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PRE_PRODUCTION', 'ACTIVE', 'WRAPPING', 'WRAPPED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ART_DIRECTOR', 'PRODUCTION_DESIGNER', 'COORDINATOR', 'SET_DECORATOR', 'LEADMAN', 'PROPS_MASTER', 'VIEWER');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('STUDIO_STAGE', 'EXTERIOR', 'VEHICLE', 'PRACTICAL_INTERIOR', 'BASE', 'OTHER');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('PICTURE', 'DRAWING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Production" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PRE_PRODUCTION',
    "startDate" TIMESTAMP(3),
    "wrapDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionMember" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoordinatorVisibility" (
    "id" TEXT NOT NULL,
    "productionMemberId" TEXT NOT NULL,
    "showScript" BOOLEAN NOT NULL DEFAULT true,
    "showSchedule" BOOLEAN NOT NULL DEFAULT true,
    "showSets" BOOLEAN NOT NULL DEFAULT true,
    "showAssets" BOOLEAN NOT NULL DEFAULT true,
    "showLocations" BOOLEAN NOT NULL DEFAULT true,
    "showBudget" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoordinatorVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "scriptedAliases" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationFile" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "fileType" "FileCategory" NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LocationToSet" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionMember_productionId_userId_key" ON "ProductionMember"("productionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorVisibility_productionMemberId_key" ON "CoordinatorVisibility"("productionMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "_LocationToSet_AB_unique" ON "_LocationToSet"("A", "B");

-- CreateIndex
CREATE INDEX "_LocationToSet_B_index" ON "_LocationToSet"("B");

-- AddForeignKey
ALTER TABLE "ProductionMember" ADD CONSTRAINT "ProductionMember_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionMember" ADD CONSTRAINT "ProductionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoordinatorVisibility" ADD CONSTRAINT "CoordinatorVisibility_productionMemberId_fkey" FOREIGN KEY ("productionMemberId") REFERENCES "ProductionMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationFile" ADD CONSTRAINT "LocationFile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationToSet" ADD CONSTRAINT "_LocationToSet_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationToSet" ADD CONSTRAINT "_LocationToSet_B_fkey" FOREIGN KEY ("B") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;
