import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type BillingTier = "premium" | "unlimited";
type BillingInterval = "monthly" | "yearly";

type ApplePayIntentRequest = {
  userId?: string;
  email?: string;
  plan?: BillingTier;
  interval?: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
};

const YEARLY_DISCOUNT_PERCENT = 20;
const PLAN_MONTHLY_PRICING_GBP: Record<BillingTier, number> = {
  premium: 499,
  unlimited: 999,
};

function withCorsHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    ...headers,
  };
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders(),
  });
}

function isBillingTier(value: unknown): value is BillingTier {
  return value === "premium" || value === "unlimited";
}

function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}

function computeAmountCents(plan: BillingTier, interval: BillingInterval) {
  const monthly = PLAN_MONTHLY_PRICING_GBP[plan];
  if (interval === "yearly") {
    return Math.round(monthly * 12 * ((100 - YEARLY_DISCOUNT_PERCENT) / 100));
  }
  return monthly;
}

function resolvePlanLabel(plan: BillingTier) {
  return plan === "premium" ? "Premium" : "Unlimited";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const applePayMerchantCountryCode =
    (Deno.env.get("APPLE_PAY_MERCHANT_COUNTRY_CODE") ?? "GB").toUpperCase();
  const applePayCurrencyCode = (Deno.env.get("APPLE_PAY_CURRENCY_CODE") ?? "GBP").toUpperCase();

  if (!stripeSecretKey) {
    return json({ error: "Missing STRIPE_SECRET_KEY secret." }, 500);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase service-role configuration." }, 500);
  }

  try {
    const payload = (await req.json()) as ApplePayIntentRequest;
    if (!payload.userId || !isBillingTier(payload.plan) || !isBillingInterval(payload.interval)) {
      return json({ error: "Missing or invalid userId/plan/interval." }, 400);
    }

    const amountCents = computeAmountCents(payload.plan, payload.interval);
    const planLabel = resolvePlanLabel(payload.plan);
    const intervalLabel = payload.interval === "yearly" ? "yearly" : "monthly";

    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amountCents),
        currency: applePayCurrencyCode.toLowerCase(),
        "automatic_payment_methods[enabled]": "true",
        "metadata[user_id]": payload.userId,
        "metadata[plan]": payload.plan,
        "metadata[interval]": payload.interval,
        "description": `Prooof ${planLabel} (${intervalLabel})`,
        ...(payload.email ? { receipt_email: payload.email } : {}),
      }).toString(),
    });

    const stripePayload = (await stripeResponse.json()) as {
      id?: string;
      client_secret?: string;
      error?: { message?: string };
    };

    if (!stripeResponse.ok || !stripePayload.client_secret || !stripePayload.id) {
      return json(
        {
          error: stripePayload.error?.message ?? "Failed to create Stripe PaymentIntent.",
        },
        502,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: insertError } = await supabase.from("billing_payment_attempts").insert({
      user_id: payload.userId,
      stripe_payment_intent_id: stripePayload.id,
      payment_provider: "stripe",
      payment_method: "apple_pay",
      billing_plan: payload.plan,
      billing_interval: payload.interval,
      amount_cents: amountCents,
      currency: applePayCurrencyCode,
      status: "requires_confirmation",
      created_at: new Date().toISOString(),
    });

    // If project doesn't have this table yet, do not block Apple Pay.
    if (insertError) {
      console.warn("billing_payment_attempts insert skipped:", insertError.message);
    }

    return json({
      clientSecret: stripePayload.client_secret,
      amountCents,
      currencyCode: applePayCurrencyCode,
      merchantCountryCode: applePayMerchantCountryCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
