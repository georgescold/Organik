/*
  Warnings:

  - A unique constraint covering the columns `[userId,tiktokId]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Post_tiktokId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Post_userId_tiktokId_key" ON "Post"("userId", "tiktokId");
