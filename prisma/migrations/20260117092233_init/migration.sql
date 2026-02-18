-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "anthropicApiKey" TEXT,
    "apifyApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activeProfileId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'tiktok',
    "displayName" TEXT,
    "username" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "niche" TEXT,
    "persona" TEXT,
    "targetAudience" TEXT,
    "goals" TEXT,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "tiktokUsername" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "niche" TEXT,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorPost" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "tiktokId" TEXT NOT NULL,
    "webVideoUrl" TEXT,
    "coverUrl" TEXT,
    "description" TEXT,
    "hashtags" TEXT,
    "musicName" TEXT,
    "musicAuthor" TEXT,
    "duration" INTEGER,
    "slideCount" INTEGER,
    "carouselImages" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAnalysis" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "qsHookText" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsHookVerbal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsHookVisual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsHookTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsBodyValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsBodyStructure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsBodyRhythm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsBodyStory" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsBodyTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsCtaClarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsCtaTiming" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsCtaUrgency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsCtaVisibility" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsCtaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsVisualQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsVisualEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsVisualBrand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsVisualTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsMusicTrend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsMusicFit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsMusicQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsMusicTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsTimingOptimal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsTimingDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsTimingContext" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsTimingTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsPersonaFit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsNicheFit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsPersonaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "intelligentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorAnalysis" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "qsHookTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsBodyTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsCtaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsVisualTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsMusicTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsTimingTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qsPersonaTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "intelligentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "tiktokId" TEXT,
    "coverUrl" TEXT,
    "videoUrl" TEXT,
    "carouselImages" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'tiktok',
    "hookText" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "slideCount" INTEGER,
    "slides" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'generated',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metrics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "profileId" TEXT,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "humanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "hash" TEXT,
    "descriptionLong" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "mood" TEXT,
    "style" TEXT,
    "colors" TEXT,
    "filename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CollectionToImage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_platform_idx" ON "Profile"("platform");

-- CreateIndex
CREATE INDEX "Competitor_profileId_idx" ON "Competitor"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_profileId_tiktokUsername_key" ON "Competitor"("profileId", "tiktokUsername");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorPost_tiktokId_key" ON "CompetitorPost"("tiktokId");

-- CreateIndex
CREATE INDEX "CompetitorPost_competitorId_idx" ON "CompetitorPost"("competitorId");

-- CreateIndex
CREATE INDEX "CompetitorPost_publishedAt_idx" ON "CompetitorPost"("publishedAt");

-- CreateIndex
CREATE INDEX "CompetitorPost_views_idx" ON "CompetitorPost"("views");

-- CreateIndex
CREATE UNIQUE INDEX "ContentAnalysis_postId_key" ON "ContentAnalysis"("postId");

-- CreateIndex
CREATE INDEX "ContentAnalysis_profileId_idx" ON "ContentAnalysis"("profileId");

-- CreateIndex
CREATE INDEX "ContentAnalysis_intelligentScore_idx" ON "ContentAnalysis"("intelligentScore");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorAnalysis_postId_key" ON "CompetitorAnalysis"("postId");

-- CreateIndex
CREATE INDEX "CompetitorAnalysis_competitorId_idx" ON "CompetitorAnalysis"("competitorId");

-- CreateIndex
CREATE INDEX "CompetitorAnalysis_intelligentScore_idx" ON "CompetitorAnalysis"("intelligentScore");

-- CreateIndex
CREATE UNIQUE INDEX "Post_tiktokId_key" ON "Post"("tiktokId");

-- CreateIndex
CREATE INDEX "Post_profileId_idx" ON "Post"("profileId");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Metrics_postId_key" ON "Metrics"("postId");

-- CreateIndex
CREATE INDEX "FollowerSnapshot_profileId_idx" ON "FollowerSnapshot"("profileId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_profileId_idx" ON "AnalyticsSnapshot"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_profileId_date_metric_key" ON "AnalyticsSnapshot"("profileId", "date", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "Image_humanId_key" ON "Image"("humanId");

-- CreateIndex
CREATE UNIQUE INDEX "_CollectionToImage_AB_unique" ON "_CollectionToImage"("A", "B");

-- CreateIndex
CREATE INDEX "_CollectionToImage_B_index" ON "_CollectionToImage"("B");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorPost" ADD CONSTRAINT "CompetitorPost_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAnalysis" ADD CONSTRAINT "ContentAnalysis_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAnalysis" ADD CONSTRAINT "ContentAnalysis_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorAnalysis" ADD CONSTRAINT "CompetitorAnalysis_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CompetitorPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorAnalysis" ADD CONSTRAINT "CompetitorAnalysis_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metrics" ADD CONSTRAINT "Metrics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerSnapshot" ADD CONSTRAINT "FollowerSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerSnapshot" ADD CONSTRAINT "FollowerSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionToImage" ADD CONSTRAINT "_CollectionToImage_A_fkey" FOREIGN KEY ("A") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionToImage" ADD CONSTRAINT "_CollectionToImage_B_fkey" FOREIGN KEY ("B") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
