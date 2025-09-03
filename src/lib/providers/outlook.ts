// outlook.ts
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

// Graph client
export const createOutlookClient = (accessToken: string) =>
  Client.init({ authProvider: (done) => done(null, accessToken) });

// OAuth2 auth URL (v2 endpoint)
export const createOutlookAuthUrl = (state?: string) => {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
    response_mode: "query",
    scope: [
      "openid",
      "offline_access",
      "User.Read",
      "Mail.Read",
      "Mail.ReadWrite",
      "Mail.Send",
    ].join(" "),
    state: state || "",
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
};

// ---- Delta Sync ----

// state.delta: deltaLink (tamamlandı işareti) | skipToken (devam)
export type OutlookDeltaState = {
  folderId?: string; // default "inbox"
  cursor?: string; // deltaLink veya skipToken (raw URL query fragment)
};

// Delta endpoint’i oluşturan helper
const deltaPath = (folderId?: string) =>
  folderId
    ? `/me/mailFolders/${folderId}/messages/delta`
    : `/me/mailFolders/inbox/messages/delta`;

// Delta çağrısı: attachments ve internetMessageHeaders'ı genişlet
export const fetchOutlookDelta = async (
  graph: Client,
  state: OutlookDeltaState,
  pageSize = 50,
) => {
  let req = graph
    .api(deltaPath(state.folderId))
    .top(pageSize)
    .header("Prefer", 'outlook.body-content-type="text"'); // body.text dönmesi için

  // Headers’ı almak için
  req = req.select(
    [
      "id",
      "internetMessageId",
      "subject",
      "from",
      "toRecipients",
      "ccRecipients",
      "bccRecipients",
      "replyTo",
      "body",
      "bodyPreview",
      "categories",
      "receivedDateTime",
      "sentDateTime",
      "internetMessageHeaders",
      "hasAttachments",
      "conversationId",
    ].join(","),
  );

  // Attachments’i genişlet (yalnızca metaveri; içerik ayrı istekle alınır)
  req = req.expand(
    "attachments($select=id,name,contentType,size,isInline,contentId)",
  );

  // Cursor varsa ekle
  if (state.cursor) {
    // state.cursor: deltaLink veya skipToken’dan gelen full URL olabilir;
    // MS Graph client’ta query paramlarını set etmek için:
    const url = new URL(state.cursor);
    for (const [k, v] of url.searchParams.entries()) {
      req = req.query({ [k]: v });
    }
  }

  const res = await req.get();
  const items = res.value || [];

  // Sonraki çağrı için cursor (skipToken veya deltaLink)
  const nextLink: string | undefined = res["@odata.nextLink"];
  const deltaLink: string | undefined = res["@odata.deltaLink"];
  const nextCursor = nextLink || deltaLink || state.cursor;

  return { items, nextCursor, hasMore: Boolean(nextLink) };
};

// ---- Parsing (provider-agnostic) ----

type ParsedAddr = { name: string | null; address: string; raw: string };
const packMsAddr = (
  a?: { name?: string; address?: string } | null,
): ParsedAddr | null =>
  a?.address
    ? {
        name: a.name || null,
        address: a.address,
        raw: a.name ? `${a.name} <${a.address}>` : a.address,
      }
    : null;
const packMsList = (
  xs?: Array<{ emailAddress: { name?: string; address?: string } }>,
): ParsedAddr[] =>
  (xs || [])
    .map((r) => packMsAddr(r.emailAddress)!)
    .filter(Boolean) as ParsedAddr[];

export const parseOutlookMessage = (m: any) => {
  const from = packMsAddr(m.from?.emailAddress) ?? {
    name: null,
    address: "",
    raw: "",
  };

  return {
    providerMessageId: m.id,
    providerThreadId: m.conversationId, // Outlook “thread”
    internetMessageId: m.internetMessageId || undefined,

    subject: m.subject || "",
    body: m.body?.content || "",
    bodySnippet: m.bodyPreview || "",
    hasAttachments: Boolean(m.hasAttachments),

    sysLabels: m.categories || [], // Outlook “categories”
    keywords: [],
    sysClassifications: [],
    sensitivity: "normal" as const,
    meetingMessageMethod: null as any,

    createdTime: new Date(m.receivedDateTime),
    lastModifiedTime: new Date(m.receivedDateTime),
    sentAt: new Date(m.sentDateTime),
    receivedAt: new Date(m.receivedDateTime),

    from,
    to: packMsList(m.toRecipients),
    cc: packMsList(m.ccRecipients),
    bcc: packMsList(m.bccRecipients),
    replyTo: packMsList(m.replyTo),

    internetHeaders: (m.internetMessageHeaders || []).map((h: any) => ({
      name: h.name,
      value: h.value,
    })),
    nativeProperties: null as any,
    folderId: statefulFolderFromDeltaPath(m["@odata.id"]) || undefined, // opsiyonel: delta yanıtından çıkarabilirsin
  };
};

// (opsiyonel) delta yanıtından folder çıkarımı (basit örnek; garanti değil)
const statefulFolderFromDeltaPath = (odataId?: string) => {
  if (!odataId) return undefined;
  try {
    const u = new URL(odataId);
    const p = u.pathname.toLowerCase();
    const m = p.match(/mailfolders\/([^/]+)\/messages/);
    return m?.[1];
  } catch {
    return undefined;
  }
};
