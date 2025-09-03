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
      q: "in:inbox",
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
      format: "full",
    });

    return response.data;
  } catch (error) {
    console.error("Gmail message details fetch error:", error);
    throw error;
  }
};

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
  } catch {
    return "";
  }
}

function parseAddress(raw: string | undefined | null) {
  const safe = (raw ?? "").trim();
  // naive parse: "Name <email@domain>" or just email
  const exec = /^(.*)<([^>]+)>$/.exec(safe);
  if (exec) {
    const name = (exec?.[1] ?? "").trim().replace(/^"|"$/g, "");
    const address = (exec?.[2] ?? "").trim();
    return { name: name || null, address, raw: safe };
  }
  return { name: null as string | null, address: safe, raw: safe };
}

function splitAddresses(
  value?: string,
): Array<{ name: string | null; address: string; raw: string }> {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseAddress);
}

// Gmail message'ını provider-agnostic formata parse etme
export const parseGmailMessage = (message: any) => {
  const headers = message.payload?.headers || [];
  const headerMap: Record<string, string> = {};
  for (const h of headers) {
    if (h?.name) headerMap[h.name.toLowerCase()] = h.value ?? "";
  }

  const subject = headerMap.subject || "";
  const from = headerMap.from || "";
  const to = headerMap.to || "";
  const cc = headerMap.cc || "";
  const bcc = headerMap.bcc || "";
  const replyTo = headerMap["reply-to"] || "";
  const dateHeader = headerMap.date || undefined;

  // Timestamps
  const receivedAt = dateHeader ? new Date(dateHeader) : new Date();
  const sentAt = receivedAt;
  const createdTime = receivedAt;
  const lastModifiedTime = receivedAt;

  // Body
  let body = "";
  if (message.payload?.body?.data) {
    body = decodeBase64Url(message.payload.body.data);
  } else if (message.payload?.parts) {
    const parts = message.payload.parts as any[];
    const textPart = parts.find(
      (p) => p.mimeType === "text/plain" || p.mimeType === "text/html",
    );
    if (textPart?.body?.data) body = decodeBase64Url(textPart.body.data);
  }

  const hasAttachments = Boolean(
    (message.payload?.parts || []).some(
      (p: any) => p.filename && p.body?.attachmentId,
    ),
  );

  const internetHeaders = headers.map((h: any) => ({
    name: h?.name,
    value: h?.value,
  }));

  return {
    // Provider IDs
    providerMessageId: message.id as string,
    providerThreadId: message.threadId as string | undefined,
    internetMessageId: headerMap["message-id"] || undefined,

    // Core
    subject,
    body,
    bodySnippet: message.snippet as string | undefined,
    hasAttachments,

    // Labels/metadata
    sysLabels: (message.labelIds as string[]) || [],
    keywords: [] as string[],
    sysClassifications: [] as string[],
    sensitivity: "normal" as const,
    meetingMessageMethod: null as any,

    // Times
    createdTime,
    lastModifiedTime,
    sentAt,
    receivedAt,

    // Participants (normalized arrays of {name,address,raw})
    from: parseAddress(from),
    to: splitAddresses(to),
    cc: splitAddresses(cc),
    bcc: splitAddresses(bcc),
    replyTo: splitAddresses(replyTo),

    // Headers
    internetHeaders,
    nativeProperties: null as any,
    folderId: undefined as string | undefined,
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
