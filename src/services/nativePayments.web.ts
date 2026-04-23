import type { BillingInterval, BillingTier } from "@/types/domain";

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

export async function isNativeApplePayAvailable() {
  return false;
}

export async function startNativeApplePaySubscription(params: {
  userId: string;
  email?: string;
  plan: Exclude<BillingTier, "free">;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}): Promise<ApplePaySubscriptionResult> {
  void params;
  return {
    completed: false,
    reason: "unsupported",
  };
}
