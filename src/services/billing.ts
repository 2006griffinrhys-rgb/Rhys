import { env } from "@/services/env";
import { supabase } from "@/services/supabase";
import type { BillingInterval, BillingTier, PlanPricing } from "@/types/domain";

const YEARLY_DISCOUNT = 20;
const BILLING_PORTAL_FALLBACK_URL = "https://billing.stripe.com";

function computeYearlyPrice(monthlyPriceCents: number): number {
  return Math.round(monthlyPriceCents * 12 * ((100 - YEARLY_DISCOUNT) / 100));
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function invokeBillingFunction(functionName: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? {}) as Record<string, unknown>;
}

export const YEARLY_DISCOUNT_PERCENT = YEARLY_DISCOUNT;

export const PLAN_PRICING: Record<BillingTier, PlanPricing> = {
  free: {
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    yearlyDiscountPercent: 0,
  },
  premium: {
    monthlyPriceCents: 499,
    yearlyPriceCents: computeYearlyPrice(499),
    yearlyDiscountPercent: YEARLY_DISCOUNT,
  },
  unlimited: {
    monthlyPriceCents: 999,
    yearlyPriceCents: computeYearlyPrice(999),
    yearlyDiscountPercent: YEARLY_DISCOUNT,
  },
};

export function getPriceForInterval(plan: BillingTier, interval: BillingInterval): number {
  const pricing = PLAN_PRICING[plan];
  return interval === "yearly" ? pricing.yearlyPriceCents : pricing.monthlyPriceCents;
}

export async function createStripeCheckoutSession(params: {
  userId: string;
  email?: string;
  plan: Exclude<BillingTier, "free">;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!env.hasSupabaseConfig || !env.stripeBillingEnabled) {
    return { url: `${env.supportUrl}/pricing`, isMock: true };
  }

  const payload = await invokeBillingFunction("billing-create-checkout-session", {
    userId: params.userId,
    email: params.email,
    plan: params.plan,
    interval: params.interval,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  });
  const url = asOptionalString(payload.url) ?? asOptionalString(payload.checkout_url);
  if (!url) {
    throw new Error("Stripe checkout URL was not returned by billing function.");
  }
  return { url, isMock: false };
}

export async function createStripePortalSession(params: { userId: string; returnUrl: string }) {
  if (!env.hasSupabaseConfig || !env.stripeBillingEnabled) {
    return {
      url: env.stripePortalUrl || BILLING_PORTAL_FALLBACK_URL,
      isMock: true,
    };
  }

  const payload = await invokeBillingFunction("billing-create-portal-session", {
    userId: params.userId,
    returnUrl: params.returnUrl,
  });
  const url = asOptionalString(payload.url) ?? asOptionalString(payload.portal_url);
  if (!url) {
    throw new Error("Stripe billing portal URL was not returned by billing function.");
  }
  return { url, isMock: false };
}

export async function requestSubscriptionDowngrade(params: {
  userId: string;
  keepAccessUntilPeriodEnd: boolean;
}) {
  if (!env.hasSupabaseConfig || !env.stripeBillingEnabled) {
    return {
      keepAccessUntilPeriodEnd: params.keepAccessUntilPeriodEnd,
      willDowngradeAtPeriodEnd: params.keepAccessUntilPeriodEnd,
      currentPeriodEnd: undefined as string | undefined,
      isMock: true,
    };
  }

  const payload = await invokeBillingFunction("billing-cancel-subscription", {
    userId: params.userId,
    cancelAtPeriodEnd: params.keepAccessUntilPeriodEnd,
  });

  return {
    keepAccessUntilPeriodEnd: asBoolean(payload.cancel_at_period_end, params.keepAccessUntilPeriodEnd),
    willDowngradeAtPeriodEnd: asBoolean(
      payload.will_downgrade_at_period_end,
      params.keepAccessUntilPeriodEnd,
    ),
    currentPeriodEnd: asOptionalString(payload.current_period_end),
    isMock: false,
  };
}
