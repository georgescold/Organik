-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "syncPostLimit" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "ProfileInsights" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "insights" TEXT NOT NULL,
    "basedOnPostsCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileInsights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileInsights_profileId_key" ON "ProfileInsights"("profileId");

-- CreateIndex
CREATE INDEX "ProfileInsights_profileId_idx" ON "ProfileInsights"("profileId");

-- CreateIndex
CREATE INDEX "ProfileInsights_lastUpdatedAt_idx" ON "ProfileInsights"("lastUpdatedAt");

-- AddForeignKey
ALTER TABLE "ProfileInsights" ADD CONSTRAINT "ProfileInsights_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
