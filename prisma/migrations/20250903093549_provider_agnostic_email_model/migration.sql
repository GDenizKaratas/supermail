/*
  Warnings:

  - You are about to drop the column `deltaToken` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `historyId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `imapLastUid` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `imapUidValidity` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `syncError` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `bcc` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `cc` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `from` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `gmailMessageId` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `imapUid` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `isStarred` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `labels` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `outlookMessageId` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `snippet` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `to` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `gmailThreadId` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the `SyncJob` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[accountId,providerMessageId]` on the table `Email` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accountId,providerThreadId]` on the table `Thread` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `provider` on the `Account` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `createdTime` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromId` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hasAttachments` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastModifiedTime` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Made the column `sentAt` on table `Email` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."Sensitivity" AS ENUM ('normal', 'private', 'personal', 'confidential');

-- CreateEnum
CREATE TYPE "public"."MeetingMessageMethod" AS ENUM ('request', 'reply', 'cancel', 'counter', 'other');

-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Email" DROP CONSTRAINT "Email_accountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Email" DROP CONSTRAINT "Email_threadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailAttachment" DROP CONSTRAINT "EmailAttachment_emailId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SyncJob" DROP CONSTRAINT "SyncJob_accountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Thread" DROP CONSTRAINT "Thread_accountId_fkey";

-- DropIndex
DROP INDEX "public"."Email_gmailMessageId_key";

-- DropIndex
DROP INDEX "public"."Email_outlookMessageId_key";

-- DropIndex
DROP INDEX "public"."Thread_gmailThreadId_key";

-- AlterTable
ALTER TABLE "public"."Account" DROP COLUMN "deltaToken",
DROP COLUMN "historyId",
DROP COLUMN "imapLastUid",
DROP COLUMN "imapUidValidity",
DROP COLUMN "lastSyncedAt",
DROP COLUMN "syncError",
ADD COLUMN     "syncCursor" TEXT,
DROP COLUMN "provider",
ADD COLUMN     "provider" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Email" DROP COLUMN "bcc",
DROP COLUMN "cc",
DROP COLUMN "from",
DROP COLUMN "gmailMessageId",
DROP COLUMN "imapUid",
DROP COLUMN "isRead",
DROP COLUMN "isStarred",
DROP COLUMN "labels",
DROP COLUMN "outlookMessageId",
DROP COLUMN "snippet",
DROP COLUMN "to",
ADD COLUMN     "bodySnippet" TEXT,
ADD COLUMN     "createdTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "fromId" TEXT NOT NULL,
ADD COLUMN     "hasAttachments" BOOLEAN NOT NULL,
ADD COLUMN     "inReplyTo" TEXT,
ADD COLUMN     "internetHeaders" JSONB[],
ADD COLUMN     "internetMessageId" TEXT,
ADD COLUMN     "keywords" TEXT[],
ADD COLUMN     "lastModifiedTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "meetingMessageMethod" "public"."MeetingMessageMethod",
ADD COLUMN     "nativeProperties" JSONB,
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "references" TEXT,
ADD COLUMN     "sensitivity" "public"."Sensitivity" NOT NULL DEFAULT 'normal',
ADD COLUMN     "sysClassifications" TEXT[],
ADD COLUMN     "sysLabels" TEXT[],
ADD COLUMN     "threadIndex" TEXT,
ALTER COLUMN "sentAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Thread" DROP COLUMN "gmailThreadId",
ADD COLUMN     "providerThreadId" TEXT;

-- DropTable
DROP TABLE "public"."SyncJob";

-- DropEnum
DROP TYPE "public"."Provider";

-- DropEnum
DROP TYPE "public"."SyncJobKind";

-- DropEnum
DROP TYPE "public"."SyncJobStatus";

-- CreateTable
CREATE TABLE "public"."EmailAddress" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "raw" TEXT,

    CONSTRAINT "EmailAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ToEmails" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ToEmails_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_CcEmails" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CcEmails_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_BccEmails" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BccEmails_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ReplyToEmails" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReplyToEmails_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAddress_accountId_address_key" ON "public"."EmailAddress"("accountId", "address");

-- CreateIndex
CREATE INDEX "_ToEmails_B_index" ON "public"."_ToEmails"("B");

-- CreateIndex
CREATE INDEX "_CcEmails_B_index" ON "public"."_CcEmails"("B");

-- CreateIndex
CREATE INDEX "_BccEmails_B_index" ON "public"."_BccEmails"("B");

-- CreateIndex
CREATE INDEX "_ReplyToEmails_B_index" ON "public"."_ReplyToEmails"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_emailAddress_key" ON "public"."Account"("provider", "emailAddress");

-- CreateIndex
CREATE INDEX "Email_internetMessageId_idx" ON "public"."Email"("internetMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Email_accountId_providerMessageId_key" ON "public"."Email"("accountId", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Thread_accountId_providerThreadId_key" ON "public"."Thread"("accountId", "providerThreadId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Thread" ADD CONSTRAINT "Thread_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "public"."EmailAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailAddress" ADD CONSTRAINT "EmailAddress_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailAttachment" ADD CONSTRAINT "EmailAttachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "public"."Email"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ToEmails" ADD CONSTRAINT "_ToEmails_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ToEmails" ADD CONSTRAINT "_ToEmails_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."EmailAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CcEmails" ADD CONSTRAINT "_CcEmails_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CcEmails" ADD CONSTRAINT "_CcEmails_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."EmailAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BccEmails" ADD CONSTRAINT "_BccEmails_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BccEmails" ADD CONSTRAINT "_BccEmails_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."EmailAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ReplyToEmails" ADD CONSTRAINT "_ReplyToEmails_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ReplyToEmails" ADD CONSTRAINT "_ReplyToEmails_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."EmailAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
