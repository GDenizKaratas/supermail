/* eslint-disable @typescript-eslint/no-inferrable-types */
// imap.ts
import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";

/**
 * IMAP client oluştur
 */
export const createImapClient = async (config: {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}) => {
  const client = new ImapFlow(config);
  await client.connect();
  return client;
};

/**
 * Artımlı senkron durumu
 * - mailbox: "INBOX" vb.
 * - uidValidity: Sunucunun UIDVALIDITY değeri (değişirse re-sync gerekir)
 * - lastSeenUid: Son işlenen UID
 */
export type ImapSyncState = {
  mailbox: string;
  uidValidity?: number;
  lastSeenUid?: number;
};

/**
 * Bir mailbox kilitle → fetch et → kilidi bırak
 * sequence: "100:200" gibi bir aralık veya tek UID "123"
 * Not: uid: true → verilen sequence'i UID olarak yorumlar
 */
export const fetchImapBatch = async (
  imap: ImapFlow,
  mailbox = "INBOX",
  sequence: string,
  limit = 100,
): Promise<FetchMessageObject[]> => {
  const out: FetchMessageObject[] = [];
  const lock = await imap.getMailboxLock(mailbox);
  try {
    for await (const msg of imap.fetch(sequence, {
      uid: true,
      envelope: true,
      source: true,
      flags: true,
    })) {
      out.push(msg);
      if (out.length >= limit) break;
    }
  } finally {
    lock.release();
  }
  return out;
};

/**
 * Delta mantığı:
 * - UIDVALIDITY değişmişse güvenli yol: baştan senkron (lastSeenUid = 0)
 * - Değişmemişse lastSeenUid+1 .. uidNext-1 aralığını çek
 */
export const fetchImapDelta = async (
  imap: ImapFlow,
  state: ImapSyncState,
  limit = 200,
) => {
  const mailbox = state.mailbox || "INBOX";
  const lock = await imap.getMailboxLock(mailbox);
  try {
    const mbox = imap.mailbox;
    if (!mbox) throw new Error("Mailbox not selected");

    const uidValidity = Number(mbox.uidValidity);
    const uidNext: number = Number(mbox.uidNext);

    if (!state.uidValidity || state.uidValidity !== uidValidity) {
      // UIDVALIDITY değişmiş → re-sync
      state.uidValidity = uidValidity;
      state.lastSeenUid = 0;
    }

    const fromUid = (state.lastSeenUid ?? 0) + 1;
    const toUid = Math.max(fromUid, uidNext - 1);

    if (fromUid > toUid) {
      return { messages: [] as FetchMessageObject[], state };
    }

    const messages = await fetchImapBatch(
      imap,
      mailbox,
      `${fromUid}:${toUid}`, // number → string
      limit,
    );

    // lastSeenUid'yi ilerlet
    for (const m of messages) {
      if (m.uid && (!state.lastSeenUid || m.uid > state.lastSeenUid)) {
        state.lastSeenUid = m.uid;
      }
    }

    return { messages, state };
  } finally {
    lock.release();
  }
};

/* ---------------- Parsing Helpers ---------------- */

type ParsedAddr = { name: string | null; address: string; raw: string };

const packOne = (
  a?: { name?: string; address?: string } | null,
): ParsedAddr | null =>
  a?.address
    ? {
        name: a.name ?? null,
        address: a.address,
        raw: a.name ? `${a.name} <${a.address}>` : a.address,
      }
    : null;

// mailparser AddressObject bazı versiyonlarda { value: [...] } döner,
// bazı durumlarda direkt array gelebilir — hepsini normalize ediyoruz.
const toAddrArray = (
  x: unknown,
): Array<{ name?: string; address?: string }> => {
  if (!x) return [];
  if (Array.isArray(x)) return x as Array<{ name?: string; address?: string }>;
  if (typeof x === "object" && Array.isArray((x as AddressObject).value)) {
    return (x as AddressObject).value;
  }
  return [];
};

const packList = (x: unknown): ParsedAddr[] =>
  toAddrArray(x)
    .map((v) => packOne(v))
    .filter(Boolean) as ParsedAddr[];

/**
 * IMAP mesajını provider-agnostic formata parse et
 * Not: FetchMessageObject.mailbox yok → folderId'yi parametre/state ile veriyoruz
 */
export const parseImapMessage = async (
  msg: FetchMessageObject,
  mailbox: string,
) => {
  const parsed = await simpleParser(msg.source as Buffer);

  const fromList = toAddrArray(parsed.from);
  const from = packOne(fromList[0]) ?? { name: null, address: "", raw: "" };

  const to = packList(parsed.to);
  const cc = packList(parsed.cc);
  const bcc = packList(parsed.bcc);
  const replyTo = packList(parsed.replyTo);

  const bodyText = parsed.text || "";
  const bodyHtml = typeof parsed.html === "string" ? parsed.html : undefined;
  const body = bodyHtml || bodyText || "";

  const internetHeaders = Array.from(parsed.headerLines || []).map((h) => ({
    name: h.key,
    value: h.line.replace(/^.*?:\s*/, ""),
  }));

  return {
    // Provider IDs
    providerMessageId: String(msg.uid ?? ""),
    providerThreadId: undefined, // IMAP'ta doğal thread yok
    internetMessageId: parsed.messageId || undefined,

    // Core
    subject: parsed.subject || "",
    body,
    bodySnippet: (parsed.text || "").slice(0, 200),
    hasAttachments: (parsed.attachments || []).length > 0,

    // Labels/metadata
    sysLabels: [], // İstersen IMAP \Seen, \Flagged -> sysLabels'e koy
    keywords: [], // RFC 5788 keywords
    sysClassifications: [],
    sensitivity: "normal" as const,
    meetingMessageMethod: null as any,

    // Times
    createdTime: parsed.date || new Date(),
    lastModifiedTime: parsed.date || new Date(),
    sentAt: parsed.date || new Date(),
    receivedAt: parsed.date || new Date(),

    // Participants
    from,
    to,
    cc,
    bcc,
    replyTo,

    // Headers & native
    internetHeaders,
    nativeProperties: { flags: msg.flags || [], modseq: msg.modseq },

    // Folder
    folderId: mailbox,
  };
};

/**
 * (Opsiyonel) Aramayla UID listesi çekmek istersen:
 * const uids = await imap.search({ since: new Date(Date.now() - 7*86400*1000) }, { uid: true });
 * for await (const msg of imap.fetch(uids, { uid: true, envelope: true, source: true })) { ... }
 */

/**
 * (Opsiyonel) client kapatma
 */
export const closeImapClient = async (imap: ImapFlow) => {
  try {
    await imap.logout();
  } catch {
    /* noop */
  }
  try {
    await imap.close();
  } catch {
    /* noop */
  }
};
