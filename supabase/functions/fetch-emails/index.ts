import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapSimpleClient } from "https://esm.sh/imap-simple@5.1.0";

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
  try {
    // In a real implementation, use imap-simple or nodemailer
    // For now, return sample emails to demonstrate the flow
    console.log(`[IMAP] Connecting to ${imapHost}:${imapPort} for ${email}`);

    // Simulated email fetch - in production use actual IMAP library
    const now = new Date();
    const sampleEmails: FetchedEmail[] = [
      {
        messageId: `msg-${Date.now()}-1`,
        subject: "Order confirmation from Amazon",
        from: "order-update@amazon.co.uk",
        date: new Date(now.getTime() - 3600000).toISOString(),
        body: "Your order has been placed. Total: £24.97",
        snippet: "Thank you for your purchase...",
      },
      {
        messageId: `msg-${Date.now()}-2`,
        subject: "Receipt from Tesco",
        from: "noreply@tesco.com",
        date: new Date(now.getTime() - 7200000).toISOString(),
        body: "Your shopping receipt. Total: £45.20",
        snippet: "Thanks for shopping...",
      },
      {
        messageId: `msg-${Date.now()}-3`,
        subject: "Your bill from BT",
        from: "billing@bt.com",
        date: new Date(now.getTime() - 86400000).toISOString(),
        body: "Your monthly bill is ready. Total: £32.99",
        snippet: "Your bill statement...",
      },
    ];

    return sampleEmails.slice(0, limit);
  } catch (error) {
    console.error("[IMAP] Error:", error);
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
