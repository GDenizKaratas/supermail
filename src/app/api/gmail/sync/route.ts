import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import {
  createGmailClient,
  fetchGmailMessages,
  fetchGmailMessageDetails,
  parseGmailMessage,
  refreshGmailToken,
} from "@/lib/providers/gmail";

async function getOrCreateEmailAddress(
  accountId: string,
  addr: { name: string | null; address: string; raw: string },
) {
  const existing = await db.emailAddress.findUnique({
    where: {
      accountId_address: { accountId, address: addr.address },
    },
  });
  if (existing) return existing;
  return db.emailAddress.create({
    data: {
      accountId,
      address: addr.address,
      name: addr.name ?? undefined,
      raw: addr.raw,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Kullanıcının Gmail account'unu bul
    const account = await db.account.findFirst({
      where: {
        userId,
        provider: "gmail",
      },
    });

    if (!account?.accessToken) {
      return NextResponse.json(
        { error: "Gmail account not connected" },
        { status: 400 },
      );
    }

    // Token'ın expire olup olmadığını kontrol et
    let accessToken = account.accessToken;
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      if (!account.refreshToken) {
        return NextResponse.json(
          { error: "Token expired and no refresh token" },
          { status: 400 },
        );
      }

      try {
        const credentials = await refreshGmailToken(account.refreshToken);
        accessToken = credentials.access_token!;

        // Token'ı güncelle
        await db.account.update({
          where: { id: account.id },
          data: {
            accessToken,
            tokenExpiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : null,
          },
        });
      } catch (error) {
        console.error("Token refresh failed:", error);
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 400 },
        );
      }
    }

    // Gmail client oluştur
    const gmailClient = createGmailClient(accessToken);

    // Gmail'den email'leri çek
    const messagesResponse = await fetchGmailMessages(gmailClient, 100);
    const messages = messagesResponse.messages || [];

    let syncedCount = 0;
    let newEmails = 0;

    for (const message of messages) {
      try {
        // Detayları al ve normalize et
        const messageDetails = await fetchGmailMessageDetails(
          gmailClient,
          message.id,
        );
        const parsed = parseGmailMessage(messageDetails);

        // Thread'i bul veya oluştur (unique: accountId + providerThreadId)
        const providerThreadId = parsed.providerThreadId ?? null;
        let thread = providerThreadId
          ? await db.thread.findUnique({
              where: {
                accountId_providerThreadId: {
                  accountId: account.id,
                  providerThreadId,
                },
              },
            })
          : null;

        if (!thread) {
          thread = await db.thread.create({
            data: {
              accountId: account.id,
              providerThreadId,
              subject: parsed.subject ?? "",
              lastMessageDate: parsed.receivedAt,
              participantIds: [
                parsed.from.address,
                ...parsed.to.map((a) => a.address),
                ...parsed.cc.map((a) => a.address),
                ...parsed.bcc.map((a) => a.address),
              ],
            },
          });
        } else {
          await db.thread.update({
            where: { id: thread.id },
            data: { lastMessageDate: parsed.receivedAt },
          });
        }

        // EmailAddress upsert
        const fromAddr = await getOrCreateEmailAddress(account.id, parsed.from);
        const toAddrs = await Promise.all(
          parsed.to.map((a) => getOrCreateEmailAddress(account.id, a)),
        );
        const ccAddrs = await Promise.all(
          parsed.cc.map((a) => getOrCreateEmailAddress(account.id, a)),
        );
        const bccAddrs = await Promise.all(
          parsed.bcc.map((a) => getOrCreateEmailAddress(account.id, a)),
        );
        const replyToAddrs = await Promise.all(
          parsed.replyTo.map((a) => getOrCreateEmailAddress(account.id, a)),
        );

        // Email upsert (unique: accountId + providerMessageId)
        const providerMessageId = parsed.providerMessageId ?? null;

        const existing = providerMessageId
          ? await db.email.findUnique({
              where: {
                accountId_providerMessageId: {
                  accountId: account.id,
                  providerMessageId,
                },
              },
            })
          : null;

        if (existing) {
          await db.email.update({
            where: { id: existing.id },
            data: {
              threadId: thread.id,
              subject: parsed.subject,
              body: parsed.body,
              bodySnippet: parsed.bodySnippet,
              sysLabels: parsed.sysLabels,
              keywords: parsed.keywords,
              sysClassifications: parsed.sysClassifications,
              sensitivity: "normal",
              hasAttachments: parsed.hasAttachments,
              internetHeaders: parsed.internetHeaders,
              nativeProperties: parsed.nativeProperties,
              folderId: parsed.folderId ?? undefined,
              createdTime: parsed.createdTime,
              lastModifiedTime: parsed.lastModifiedTime,
              sentAt: parsed.sentAt,
              receivedAt: parsed.receivedAt,
              internetMessageId: parsed.internetMessageId ?? undefined,
              fromId: fromAddr.id,
              to: { set: toAddrs.map((a) => ({ id: a.id })) },
              cc: { set: ccAddrs.map((a) => ({ id: a.id })) },
              bcc: { set: bccAddrs.map((a) => ({ id: a.id })) },
              replyTo: { set: replyToAddrs.map((a) => ({ id: a.id })) },
            },
          });
        } else {
          await db.email.create({
            data: {
              accountId: account.id,
              threadId: thread.id,
              providerMessageId,
              internetMessageId: parsed.internetMessageId ?? undefined,
              subject: parsed.subject,
              body: parsed.body,
              bodySnippet: parsed.bodySnippet,
              sysLabels: parsed.sysLabels,
              keywords: parsed.keywords,
              sysClassifications: parsed.sysClassifications,
              sensitivity: "normal",
              meetingMessageMethod: null,
              hasAttachments: parsed.hasAttachments,
              internetHeaders: parsed.internetHeaders,
              nativeProperties: parsed.nativeProperties,
              folderId: parsed.folderId ?? undefined,
              createdTime: parsed.createdTime,
              lastModifiedTime: parsed.lastModifiedTime,
              sentAt: parsed.sentAt,
              receivedAt: parsed.receivedAt,
              fromId: fromAddr.id,
              to: { connect: toAddrs.map((a) => ({ id: a.id })) },
              cc: { connect: ccAddrs.map((a) => ({ id: a.id })) },
              bcc: { connect: bccAddrs.map((a) => ({ id: a.id })) },
              replyTo: { connect: replyToAddrs.map((a) => ({ id: a.id })) },
            },
          });
          newEmails++;
        }

        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync email ${message.id}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      newEmails,
      totalMessages: messages.length,
    });
  } catch (error) {
    console.error("Gmail sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
