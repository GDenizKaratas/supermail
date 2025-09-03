import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGmailAuthUrl } from "@/lib/providers/gmail";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // State olarak userId'yi kullan
    const authUrl = createGmailAuthUrl(userId);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Gmail auth error:", error);
    return NextResponse.json(
      { error: "Failed to create auth URL" },
      { status: 500 },
    );
  }
}
