// src/app/api/emails/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const skip = (page - 1) * limit;

    // İsteğe bağlı: sadece belli accountId için filtrelemek istersen
    const accountId = searchParams.get("accountId") || undefined;

    const where = {
      account: {
        userId, // <-- Email.userId yok; Account üzerinden filtre
        ...(accountId ? { id: accountId } : {}),
      },
      // İsteğe bağlı inbox filtresi:
      // sysLabels: { has: "INBOX" },
    } as const;

    const [emails, total] = await Promise.all([
      db.email.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
        include: {
          account: {
            select: {
              id: true,
              emailAddress: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  emailAddress: true,
                },
              },
            },
          },
          thread: {
            select: {
              id: true,
              participantIds: true,
              lastMessageDate: true,
            },
          },
          from: true, // tekil relation
          to: true, // çoklu relationlar şemana göre çalışır
          cc: true,
          bcc: true,
          attachments: {
            select: {
              id: true,
              name: true,
              size: true,
              mimeType: true,
              inline: true,
              contentId: true,
            },
          },
        },
      }),
      db.email.count({ where }),
    ]);

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get emails error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 },
    );
  }
}
