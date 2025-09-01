import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import {
  createGmailClient,
  fetchGmailMessages,
  fetchGmailMessageDetails,
  parseGmailMessage,
  refreshGmailToken,
} from "@/lib/gmail";

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

    if (!account || !account.accessToken) {
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
    const messagesResponse = await fetchGmailMessages(gmailClient, 50);
    const messages = messagesResponse.messages || [];

    let syncedCount = 0;
    let newEmails = 0;

    for (const message of messages) {
      // Email'in zaten var olup olmadığını kontrol et
      const existingEmail = await db.email.findUnique({
        where: { gmailMessageId: message.id },
      });

      if (existingEmail) {
        syncedCount++;
        continue;
      }

      try {
        // Email detaylarını çek
        const messageDetails = await fetchGmailMessageDetails(
          gmailClient,
          message.id,
        );
        const parsedEmail = parseGmailMessage(messageDetails);

        // Email'i veritabanına kaydet
        await db.email.create({
          data: {
            userId,
            accountId: account.id,
            ...parsedEmail,
          },
        });

        newEmails++;
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
