import { Platform } from "react-native";
import { confirmPlatformPayPayment, isPlatformPaySupported, PlatformPay } from "@stripe/stripe-react-native";
import { supabase } from "@/services/supabase";
import { env } from "@/services/env";
import type { BillingInterval, BillingTier } from "@/types/domain";

const BILLING_TIER_LABELS: Record<Exclude<BillingTier, "free">, string> = {
  premium: "Premium",
  unlimited: "Unlimited",
};

const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "month",
  yearly: "year",
};

type ApplePaySubscriptionRequest = {
  userId: string;
  email?: string;
  plan: Exclude<BillingTier, "free">;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
};

type ApplePaySubscriptionResult =
  | {
      completed: true;
    }
  | {
      completed: false;
      reason: "unsupported" | "not-configured" | "cancelled" | "failed";
      usedCheckoutFallback?: boolean;
      checkoutUrl?: string;
      isMock?: boolean;
    };

type ApplePayIntentResponse = {
  clientSecret?: string;
  amountCents?: number;
  currencyCode?: string;
  merchantCountryCode?: string;
  mode?: string;
  checkoutUrl?: string;
  url?: string;
};

function toMajorCurrencyAmount(amountCents: number) {
  return (Math.max(0, amountCents) / 100).toFixed(2);
}

async function createApplePayIntent(
  request: ApplePaySubscriptionRequest,
): Promise<ApplePayIntentResponse> {
  const { data, error } = await supabase.functions.invoke("billing-create-applepay-intent", {
    body: request,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? {}) as ApplePayIntentResponse;
}

export async function isNativeApplePayAvailable() {
  if (Platform.OS !== "ios") {
    return false;
  }
  return isPlatformPaySupported();
}

export async function startNativeApplePaySubscription(params: {
  userId: string;
  email?: string;
  plan: Exclude<BillingTier, "free">;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}): Promise<ApplePaySubscriptionResult> {
  if (!env.stripeBillingEnabled || !env.stripePublishableKey || !env.stripeMerchantIdentifier) {
    return { completed: false, reason: "not-configured" };
  }
  if (Platform.OS !== "ios") {
    return { completed: false, reason: "unsupported" };
  }

  const supported = await isPlatformPaySupported();
  if (!supported) {
    return { completed: false, reason: "unsupported" };
  }

  const intent = await createApplePayIntent({
    userId: params.userId,
    email: params.email,
    plan: params.plan,
    interval: params.interval,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  });

  const clientSecret = intent.clientSecret;
  if (!clientSecret) {
    const checkoutUrl = intent.checkoutUrl ?? intent.url;
    if (checkoutUrl) {
      return {
        completed: false,
        reason: "not-configured",
        usedCheckoutFallback: true,
        checkoutUrl,
      };
    }
    return {
      completed: false,
      reason: "failed",
    };
  }

  const amountCents = Math.max(0, Math.round(intent.amountCents ?? 0));
  const currencyCode = (intent.currencyCode ?? "GBP").toUpperCase();
  const merchantCountryCode = (intent.merchantCountryCode ?? "GB").toUpperCase();
  const label = `${BILLING_TIER_LABELS[params.plan]} (${BILLING_INTERVAL_LABELS[params.interval]})`;
  const amount = toMajorCurrencyAmount(amountCents);

  const cartItems: PlatformPay.CartSummaryItem[] = [
    {
      paymentType: PlatformPay.PaymentType.Immediate,
      label,
      amount,
    },
    {
      paymentType: PlatformPay.PaymentType.Immediate,
      label: "Prooof",
      amount,
    },
  ];

  const result = await confirmPlatformPayPayment(clientSecret, {
    applePay: {
      merchantCountryCode,
      currencyCode,
      cartItems,
    },
  });

  if (result.error) {
    if (result.error.code === "Canceled") {
      return { completed: false, reason: "cancelled" };
    }
    return { completed: false, reason: "failed" };
  }

  return { completed: true };
}
