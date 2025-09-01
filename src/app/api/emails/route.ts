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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Email'leri çek
    const emails = await db.email.findMany({
      where: { userId },
      orderBy: { receivedAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            emailAddress: true,
          },
        },
      },
    });

    // Toplam email sayısını al
    const total = await db.email.count({
      where: { userId },
    });

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
