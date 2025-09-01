import { NextResponse } from "next/server";
import { env } from "@/env";

export async function GET() {
  try {
    const envCheck = {
      hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      hasGoogleRedirectUri: !!env.GOOGLE_REDIRECT_URI,
      googleClientIdLength: env.GOOGLE_CLIENT_ID?.length || 0,
      googleClientSecretLength: env.GOOGLE_CLIENT_SECRET?.length || 0,
      googleRedirectUri: env.GOOGLE_REDIRECT_URI,
      nodeEnv: env.NODE_ENV,
    };

    console.log("Environment check:", envCheck);

    return NextResponse.json({
      success: true,
      env: envCheck,
    });
  } catch (error) {
    console.error("Environment check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
