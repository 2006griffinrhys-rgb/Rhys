import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Categories and keywords for simple categorization
const CATEGORY_MAP: Record<string, string[]> = {
  "Groceries": ["tesco", "asda", "sainsbury", "aldi", "lidl", "waitrose", "morrisons", "ocado"],
  "Shopping": ["amazon", "ebay", "asos", "boohoo", "zara", "h&m", "john lewis", "argos"],
  "Electronics": ["apple", "currys", "pc world", "ao.com", "samsung", "dell"],
  "Utilities": ["british gas", "thames water", "edf energy", "vodafone", "ee", "o2", "three", "virgin media"],
  "Subscriptions": ["spotify", "netflix", "disney+", "prime", "deliveroo plus", "uber pass"],
  "Travel": ["uber", "bolt", "trainline", "ryanair", "easyjet", "airbnb", "tfl"],
  "Home Improvement": ["b&q", "wickes", "homebase", "screwfix"],
  "Services": ["cleaning", "gym", "dentist", "doctor", "prime home"],
};

function categorize(merchant: string): string {
  const m = merchant.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => m.includes(k))) {
      return category;
    }
  }
  return "Uncategorized";
}

type ScanInboxPayload = {
  userId: string;
  providers?: string[];
  noCap?: boolean;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { userId, providers } = (await req.json()) as ScanInboxPayload;

    if (!userId) return json({ error: "userId is required" }, 400);

    // 1. Fetch connected emails and check for Google OAuth tokens
    const { data: connections, error: connError } = await supabase
      .from("email_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (connError) throw connError;

    // 2. For Gmail connections using OAuth, we'd fetch the provider token from auth.identities
    // This requires service_role access to the auth schema
    const { data: identities, error: identError } = await supabase.auth.admin.getUserIdentities(userId);
    const googleIdentity = identities?.find(i => i.provider === "google");
    
    // In a real scenario, you would use the access_token to call Gmail API
    // For now, we continue to simulate, but acknowledging the OAuth flow
    const useGmailApi = !!googleIdentity;

    // 3. Simulated ingestion
    const simulatedNewReceipts = [
      {
        merchant: "Amazon UK",
        total_cents: 2999,
        currency: "GBP",
        purchased_at: new Date().toISOString(),
        source: "outlook",
        status: "processed",
      },
      {
        merchant: "Tesco",
        total_cents: 1250,
        currency: "GBP",
        purchased_at: new Date().toISOString(),
        source: "gmail",
        status: "processed",
      },
      {
        merchant: "Apple Store",
        total_cents: 12900,
        currency: "GBP",
        purchased_at: new Date().toISOString(),
        source: "gmail",
        status: "processed",
      },
      {
        merchant: "Uber",
        total_cents: 1850,
        currency: "GBP",
        purchased_at: new Date().toISOString(),
        source: "yahoo",
        status: "processed",
      }
    ];
    
    if (useGmailApi) {
      simulatedNewReceipts.push({
        merchant: "Google Play Store",
        total_cents: 999,
        currency: "GBP",
        purchased_at: new Date().toISOString(),
        source: "gmail",
        status: "processed",
      });
    }

    const imported = [];
    for (const r of simulatedNewReceipts) {
      const category = categorize(r.merchant);
      
      const { data, error } = await supabase
        .from("bills")
        .insert({
          user_id: userId,
          ...r,
          category,
        })
        .select()
        .single();
      
      if (!error && data) imported.push(data);
    }

    return json({
      scanned: 15,
      imported: imported,
      scanned_at: new Date().toISOString(),
      providers: connections.map(c => ({
        provider: c.provider,
        status: "scanned",
        scanned_emails: 5,
        matched_receipts: imported.filter(r => r.source === c.provider).length
      })),
      warnings: ["IMAP connection simulated for demonstration. Configure actual email credentials to enable live scanning."]
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
