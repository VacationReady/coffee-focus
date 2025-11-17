-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budget" TEXT,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "stakeholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "successCriteria" TEXT,
ADD COLUMN     "targetLaunchDate" TIMESTAMP(3);
