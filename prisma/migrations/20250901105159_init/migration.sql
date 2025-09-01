-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "historyId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Email" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT,
    "subject" TEXT,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "body" TEXT,
    "snippet" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "labels" TEXT[],
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailAddress_key" ON "public"."User"("emailAddress");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_email_key" ON "public"."Account"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Email_gmailMessageId_key" ON "public"."Email"("gmailMessageId");

-- CreateIndex
CREATE INDEX "Email_userId_idx" ON "public"."Email"("userId");

-- CreateIndex
CREATE INDEX "Email_gmailMessageId_idx" ON "public"."Email"("gmailMessageId");

-- CreateIndex
CREATE INDEX "Email_receivedAt_idx" ON "public"."Email"("receivedAt");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Email" ADD CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
