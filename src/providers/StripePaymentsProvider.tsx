import type { PropsWithChildren, ReactElement } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
import { env } from "@/services/env";

export function StripePaymentsProvider({ children }: PropsWithChildren) {
  if (!env.stripePublishableKey) {
    return <>{children}</>;
  }

  return (
    <StripeProvider
      publishableKey={env.stripePublishableKey}
      merchantIdentifier={env.stripeMerchantIdentifier || undefined}
      urlScheme="prooof"
    >
      {children as ReactElement}
    </StripeProvider>
  );
}
