-- AlterTable
ALTER TABLE "public"."Thread" ADD COLUMN     "draftStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inboxStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sentStatus" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Thread_done_idx" ON "public"."Thread"("done");

-- CreateIndex
CREATE INDEX "Thread_inboxStatus_idx" ON "public"."Thread"("inboxStatus");

-- CreateIndex
CREATE INDEX "Thread_draftStatus_idx" ON "public"."Thread"("draftStatus");

-- CreateIndex
CREATE INDEX "Thread_sentStatus_idx" ON "public"."Thread"("sentStatus");
