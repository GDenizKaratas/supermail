/*
  Warnings:

  - You are about to drop the column `email` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `gmailThreadId` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Email` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,emailAddress]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[outlookMessageId]` on the table `Email` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `emailAddress` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `provider` on the `Account` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `threadId` to the `Email` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "public"."Provider" AS ENUM ('gmail', 'outlook', 'imap');

-- CreateEnum
CREATE TYPE "public"."SyncJobKind" AS ENUM ('full', 'incremental', 'backfill');

-- CreateEnum
CREATE TYPE "public"."SyncJobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'cancelled');

-- DropForeignKey
ALTER TABLE "public"."Email" DROP CONSTRAINT "Email_userId_fkey";

-- DropIndex
DROP INDEX "public"."Account_userId_email_key";

-- DropIndex
DROP INDEX "public"."Email_gmailMessageId_idx";

-- DropIndex
DROP INDEX "public"."Email_userId_idx";

-- AlterTable
ALTER TABLE "public"."Account" DROP COLUMN "email",
ADD COLUMN     "deltaToken" TEXT,
ADD COLUMN     "emailAddress" TEXT NOT NULL,
ADD COLUMN     "imapLastUid" TEXT,
ADD COLUMN     "imapUidValidity" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "syncError" TEXT,
DROP COLUMN "provider",
ADD COLUMN     "provider" "public"."Provider" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Email" DROP COLUMN "gmailThreadId",
DROP COLUMN "userId",
ADD COLUMN     "imapUid" TEXT,
ADD COLUMN     "outlookMessageId" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "threadId" TEXT NOT NULL,
ALTER COLUMN "gmailMessageId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'user',
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Thread" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "lastMessageDate" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "participantIds" TEXT[],
    "done" BOOLEAN NOT NULL DEFAULT false,
    "gmailThreadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailAttachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "inline" BOOLEAN NOT NULL,
    "contentId" TEXT,
    "content" TEXT,
    "emailId" TEXT NOT NULL,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncJob" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" "public"."SyncJobKind" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "runAt" TIMESTAMP(3),
    "status" "public"."SyncJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Thread_gmailThreadId_key" ON "public"."Thread"("gmailThreadId");

-- CreateIndex
CREATE INDEX "Thread_accountId_idx" ON "public"."Thread"("accountId");

-- CreateIndex
CREATE INDEX "Thread_lastMessageDate_idx" ON "public"."Thread"("lastMessageDate");

-- CreateIndex
CREATE UNIQUE INDEX "SyncJob_dedupeKey_key" ON "public"."SyncJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "SyncJob_accountId_status_scheduledAt_idx" ON "public"."SyncJob"("accountId", "status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_emailAddress_key" ON "public"."Account"("provider", "emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Email_outlookMessageId_key" ON "public"."Email"("outlookMessageId");

-- CreateIndex
CREATE INDEX "Email_threadId_idx" ON "public"."Email"("threadId");

-- CreateIndex
CREATE INDEX "Email_accountId_idx" ON "public"."Email"("accountId");

-- AddForeignKey
ALTER TABLE "public"."Thread" ADD CONSTRAINT "Thread_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "public"."Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncJob" ADD CONSTRAINT "SyncJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
