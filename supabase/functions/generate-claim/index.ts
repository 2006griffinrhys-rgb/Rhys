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

    // Template only: integrate with your mail provider here (Resend, Postmark, SES, etc).
    return json({
      accepted: true,
      mode: "template",
      dispatchedAt: new Date().toISOString(),
      supplierEmail: payload.supplierEmail,
      supplierName: payload.supplierName,
      claimKind: payload.claimKind ?? "product",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
