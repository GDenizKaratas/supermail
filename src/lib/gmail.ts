import { google } from "googleapis";
import { env } from "@/env";

// Gmail API OAuth2 client oluşturma
export const createGmailClient = (accessToken: string) => {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
};

// Gmail OAuth2 URL oluşturma
export const createGmailAuthUrl = (state?: string) => {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state,
  });
};

// Gmail API'den email'leri çekme
export const fetchGmailMessages = async (
  gmailClient: any,
  maxResults = 50,
  pageToken?: string,
) => {
  try {
    const response = await gmailClient.users.messages.list({
      userId: "me",
      maxResults,
      pageToken,
      q: "in:inbox", // Sadece inbox'tan email'leri çek
    });

    return response.data;
  } catch (error) {
    console.error("Gmail messages fetch error:", error);
    throw error;
  }
};

// Gmail API'den email detaylarını çekme
export const fetchGmailMessageDetails = async (
  gmailClient: any,
  messageId: string,
) => {
  try {
    const response = await gmailClient.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full", // Tüm detayları al
    });

    return response.data;
  } catch (error) {
    console.error("Gmail message details fetch error:", error);
    throw error;
  }
};

// Gmail message'ını parse etme
export const parseGmailMessage = (message: any) => {
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
  const from = headers.find((h: any) => h.name === "From")?.value || "";
  const to = headers.find((h: any) => h.name === "To")?.value || "";
  const cc = headers.find((h: any) => h.name === "Cc")?.value || "";
  const bcc = headers.find((h: any) => h.name === "Bcc")?.value || "";
  const date = headers.find((h: any) => h.name === "Date")?.value || "";

  // Email body'yi çıkarma
  let body = "";
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString("utf-8");
  } else if (message.payload?.parts) {
    // Multipart message
    const textPart = message.payload.parts.find(
      (part: any) =>
        part.mimeType === "text/plain" || part.mimeType === "text/html",
    );
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  }

  return {
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    subject,
    from,
    to: to ? [to] : [],
    cc: cc ? [cc] : [],
    bcc: bcc ? [bcc] : [],
    body,
    snippet: message.snippet,
    isRead: !message.labelIds?.includes("UNREAD"),
    isStarred: message.labelIds?.includes("STARRED") || false,
    labels: message.labelIds || [],
    receivedAt: date ? new Date(date) : new Date(),
  };
};

// Access token'ı refresh etme
export const refreshGmailToken = async (refreshToken: string) => {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
};
