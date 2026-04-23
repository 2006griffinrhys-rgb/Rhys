import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type ClaimPayload = {
  userId?: string;
  claimKind?: string;
  supplierName?: string;
  supplierEmail?: string;
  requestedOutcome?: string;
  recommendedOutcome?: string;
  legalBasis?: string;
  letterPreview?: string;
};

type ParsedLetter = {
  subject: string;
  body: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseLetter(letterPreview: string): ParsedLetter {
  const normalized = letterPreview.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const firstLine = lines[0] ?? "";
  const hasSubjectPrefix = /^subject\s*:/i.test(firstLine);
  const subject = hasSubjectPrefix
    ? firstLine.replace(/^subject\s*:\s*/i, "").trim()
    : "Consumer claim request";
  const body = hasSubjectPrefix ? lines.slice(1).join("\n").trim() : normalized;
  return {
    subject: subject || "Consumer claim request",
    body,
  };
}

async function sendWithResend(payload: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const fromEmail = Deno.env.get("CLAIM_EMAIL_FROM") ?? "";
  const defaultReplyTo = Deno.env.get("CLAIM_EMAIL_REPLY_TO") ?? "";

  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY secret");
  }
  if (!fromEmail || !isValidEmail(fromEmail)) {
    throw new Error("Missing or invalid CLAIM_EMAIL_FROM secret");
  }
  if (defaultReplyTo && !isValidEmail(defaultReplyTo)) {
    throw new Error("CLAIM_EMAIL_REPLY_TO must be a valid email when provided");
  }

  const replyTo = payload.replyTo && isValidEmail(payload.replyTo)
    ? payload.replyTo
    : defaultReplyTo || undefined;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [payload.to],
      subject: payload.subject,
      text: payload.body,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    throw new Error(`Resend API error (${resendResponse.status}): ${detail}`);
  }

  return (await resendResponse.json()) as { id?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const payload = (await req.json()) as ClaimPayload;
    if (!payload.userId || !payload.supplierName || !payload.supplierEmail || !payload.letterPreview) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!isValidEmail(payload.supplierEmail)) {
      return json({ error: "supplierEmail must be a valid email address" }, 400);
    }
    const parsedLetter = parseLetter(payload.letterPreview);
    const resendResult = await sendWithResend({
      to: payload.supplierEmail,
      subject: parsedLetter.subject,
      body: parsedLetter.body,
    });

    return json({
      accepted: true,
      mode: "live",
      dispatchedAt: new Date().toISOString(),
      supplierEmail: payload.supplierEmail,
      supplierName: payload.supplierName,
      claimKind: payload.claimKind ?? "product",
      provider: "resend",
      messageId: resendResult.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 502);
  }
});
