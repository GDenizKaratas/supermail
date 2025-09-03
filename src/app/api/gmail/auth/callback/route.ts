import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { env } from "@/env";

export async function GET(request: NextRequest) {
  try {
    console.log("Gmail callback started");

    const { userId } = await auth();
    console.log("Auth userId:", userId);

    if (!userId) {
      console.log("No userId found, redirecting to sign-in");
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    console.log("Callback params:", {
      hasCode: !!code,
      codeLength: code?.length,
      state,
    });

    if (!code) {
      console.log("No authorization code found");
      return NextResponse.json(
        { error: "Authorization code not found" },
        { status: 400 },
      );
    }

    console.log("Creating OAuth2 client with:", {
      clientId: env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...",
      hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    });

    // OAuth2 client oluştur
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );

    console.log("Getting tokens from Google...");
    // Authorization code'u token'a çevir
    const { tokens } = await oauth2Client.getToken(code);

    console.log("Tokens received:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      tokenKeys: Object.keys(tokens),
    });

    if (!tokens.access_token || !tokens.refresh_token) {
      console.log("Missing tokens:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
      });
      return NextResponse.json(
        { error: "Failed to get tokens" },
        { status: 400 },
      );
    }

    // OAuth2 client'a token'ları set et
    oauth2Client.setCredentials(tokens);

    // Gmail API'den kullanıcı bilgilerini al
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: "Failed to get email address" },
        { status: 400 },
      );
    }

    // Kullanıcıyı veritabanında bul veya oluştur
    let user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Kullanıcı yoksa oluştur
      user = await db.user.create({
        data: {
          id: userId,
          emailAddress: email, // Gmail'den aldığımız email
          firstName: "User", // Varsayılan değerler
          lastName: "Name",
        },
      });
      console.log("Created new user:", user.id);
    }

    // Account'u güncelle veya oluştur (unique: provider + emailAddress)
    await db.account.upsert({
      where: {
        provider_emailAddress: {
          provider: "gmail",
          emailAddress: email,
        },
      },
      update: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        provider: "gmail",
        emailAddress: email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });

    // Başarılı yönlendirme
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Gmail OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 },
    );
  }
}
