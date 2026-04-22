import type { EmailProviderId } from "@/types/domain";

export async function setBackgroundScanContext(
  userId: string,
  providers: EmailProviderId[],
) {
  void userId;
  void providers;
  // Background task APIs are native-only. Web keeps this as a no-op.
}

export async function clearBackgroundScanContext() {
  // No-op on web.
}

export async function registerInboxBackgroundTask() {
  // No-op on web.
}

export async function unregisterInboxBackgroundTask() {
  // No-op on web.
}
