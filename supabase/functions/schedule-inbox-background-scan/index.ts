import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type EmailProviderId = "gmail" | "yahoo" | "outlook" | "office365" | "exchange" | "work-imap";

const ALL_EMAIL_PROVIDERS: EmailProviderId[] = [
  "gmail",
  "yahoo",
  "outlook",
  "office365",
  "exchange",
  "work-imap",
];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeProviders(value: unknown): EmailProviderId[] {
  if (!Array.isArray(value)) {
    return ALL_EMAIL_PROVIDERS;
  }
  const providers = value.filter((item): item is EmailProviderId => {
    return typeof item === "string" && ALL_EMAIL_PROVIDERS.includes(item as EmailProviderId);
  });
  return providers.length > 0 ? providers : ALL_EMAIL_PROVIDERS;
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing." }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const userId = asString(payload.userId);
    if (!userId) {
      return badRequest("userId is required.");
    }
    const providers = normalizeProviders(payload.providers);
    const noCap = payload.noCap !== false;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabaseAdmin.functions.invoke("scan-inbox", {
      body: {
        userId,
        providers,
        noCap,
        includeWorkDomains: true,
        source: "background-fallback",
      } satisfies Record<string, Json>,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        accepted: true,
        mode: "live",
        queuedAt: new Date().toISOString(),
        providers,
        scanResult: data ?? null,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected background scheduling error.",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
});
