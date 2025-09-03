import { z } from "zod";

import type { Prisma } from "@prisma/client";
import { createTRPCRouter, privateProcedure } from "../trpc";

import { db } from "@/server/db";

const inboxFilter = (accountId: string): Prisma.ThreadWhereInput => ({
  accountId,
  inboxStatus: true,
});

const sentFilter = (accountId: string): Prisma.ThreadWhereInput => ({
  accountId,
  sentStatus: true,
});

const draftFilter = (accountId: string): Prisma.ThreadWhereInput => ({
  accountId,
  draftStatus: true,
});

export const authoriseAccountAccess = async (
  accountId: string,
  userId: string,
) => {
  const account = await db.account.findFirst({
    where: {
      id: accountId,
      userId: userId,
    },
    select: {
      id: true,
      emailAddress: true,
    },
  });
  if (!account) throw new Error("Invalid token");
  return account;
};

export const accountRouter = createTRPCRouter({
  getAccounts: privateProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.account.findMany({
      where: {
        userId: ctx.auth.userId,
      },
      select: {
        id: true,
        emailAddress: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return accounts;
  }),

  getNumThreads: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
        tab: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await authoriseAccountAccess(
        input.accountId,
        ctx.auth.userId,
      );
      let filter: Prisma.ThreadWhereInput = {};
      if (input.tab === "inbox") {
        filter = inboxFilter(account.id);
      } else if (input.tab === "sent") {
        filter = sentFilter(account.id);
      } else if (input.tab === "drafts") {
        filter = draftFilter(account.id);
      }
      return await ctx.db.thread.count({
        where: filter,
      });
    }),
});
