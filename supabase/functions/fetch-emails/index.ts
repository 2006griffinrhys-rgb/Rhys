import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailProvider = "gmail" | "yahoo" | "outlook" | "office365" | "exchange" | "work-imap";

type FetchRequest = {
  userId: string;
  connectionId: string;
  provider: EmailProvider;
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  limit?: number;
};

type FetchedEmail = {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  snippet: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
    },
  });
}


async function fetchEmailsViaImap(
  imapHost: string,
  imapPort: number,
  email: string,
  password: string,
  limit: number = 10,
): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapPort === 993,
    auth: {
      user: email,
      pass: password,
    },
    logger: false,
  });

  try {
    console.log(`[IMAP] Connecting to ${imapHost}:${imapPort} for ${email}`);
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    const emails: FetchedEmail[] = [];

    try {
      // Search for emails from the last 30 days containing receipt-like keywords
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const searchCriteria = {
        since: thirtyDaysAgo,
        or: [
          { subject: "receipt" },
          { subject: "invoice" },
          { subject: "order" },
          { subject: "confirmation" },
          { subject: "ticket" },
          { subject: "booking" }
        ]
      };

      console.log(`[IMAP] Searching emails for ${email}...`);
      const messages = await client.search(searchCriteria);
      
      // Get the latest 'limit' messages
      const latestMessages = messages.reverse().slice(0, limit);

      for (const uid of latestMessages) {
        const message = await client.fetchOne(uid, {
          envelope: true,
          source: false,
          bodyStructure: true,
        });

        if (message) {
          emails.push({
            messageId: message.envelope.messageId || `imap-${uid}`,
            subject: message.envelope.subject || "(No Subject)",
            from: message.envelope.from?.[0]?.address || "Unknown",
            date: message.envelope.date ? message.envelope.date.toISOString() : new Date().toISOString(),
            body: "", // We could fetch the body if needed, but for now snippet/metadata is enough
            snippet: message.envelope.subject || "",
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return emails;
  } catch (error) {
    console.error("[IMAP] Error:", error);
    try { await client.logout(); } catch { /* ignore */ }
    throw error;
  }
}

async function fetchEmailsViaGmailApi(
  email: string,
  accessToken: string,
  limit: number = 10,
): Promise<FetchedEmail[]> {
  try {
    console.log(`[Gmail] Fetching emails for ${email}`);

    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { messages?: Array<{ id: string }> };
    const messages = data.messages || [];

    const emails: FetchedEmail[] = [];

    for (const message of messages.slice(0, limit)) {
      const msgResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From,Subject,Date`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!msgResponse.ok) continue;

      const msgData = (await msgResponse.json()) as {
        id: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
        snippet?: string;
      };

      const headers = msgData.payload?.headers || [];
      const headerMap = Object.fromEntries(
        headers.map((h) => [h.name.toLowerCase(), h.value]),
      );

      emails.push({
        messageId: msgData.id,
        from: (headerMap["from"] as string) || "Unknown",
        subject: (headerMap["subject"] as string) || "(No Subject)",
        date: (headerMap["date"] as string) || new Date().toISOString(),
        body: "",
        snippet: msgData.snippet || "",
      });
    }

    return emails;
  } catch (error) {
    console.error("[Gmail] Error:", error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as FetchRequest;
    const {
      userId,
      connectionId,
      provider,
      email,
      password,
      imapHost,
      imapPort,
      limit = 10,
    } = payload;

    console.log(`[FetchEmails] Request: provider=${provider}, email=${email}`);

    let emails: FetchedEmail[] = [];

    if (provider === "gmail" && password.startsWith("ya29")) {
      // Gmail API access token
      emails = await fetchEmailsViaGmailApi(email, password, limit);
    } else {
      // IMAP fallback for Yahoo, Outlook, Exchange, custom
      emails = await fetchEmailsViaImap(imapHost, imapPort, email, password, limit);
    }

    console.log(`[FetchEmails] Fetched ${emails.length} emails`);

    return json({
      success: true,
      provider,
      email,
      fetchedCount: emails.length,
      emails,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[FetchEmails] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
});
