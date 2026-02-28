/*
  Warnings:

  - The values [IN_PREP,READY,SHOOTING,STRUCK] on the enum `SetStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SetStatus_new" AS ENUM ('IDEATION', 'DESIGN', 'BUILD', 'DRESS', 'REHEARSAL', 'SHOOT', 'STRIKE', 'WRAPPED');
ALTER TABLE "Set" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Set" ALTER COLUMN "status" TYPE "SetStatus_new" USING ("status"::text::"SetStatus_new");
ALTER TYPE "SetStatus" RENAME TO "SetStatus_old";
ALTER TYPE "SetStatus_new" RENAME TO "SetStatus";
DROP TYPE "SetStatus_old";
ALTER TABLE "Set" ALTER COLUMN "status" SET DEFAULT 'IDEATION';
COMMIT;

-- AlterTable
ALTER TABLE "Set" ALTER COLUMN "status" SET DEFAULT 'IDEATION';
