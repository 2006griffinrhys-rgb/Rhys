import { env } from "@/services/env";
import {
  MOCK_CLAIMS,
  MOCK_INBOX_SCAN_COUNT,
  MOCK_PRODUCTS,
  MOCK_RECALLS,
  MOCK_RECEIPTS,
} from "@/services/mockData";
import { supabase } from "@/services/supabase";
import type {
  AppSnapshot,
  Claim,
  ClaimStatus,
  DashboardStats,
  EmailProviderId,
  InboxScanProviderResult,
  InboxScanResult,
  Product,
  Recall,
  Receipt,
  ReceiptStatus,
} from "@/types/domain";

type UnknownRow = Record<string, unknown>;
const ALL_EMAIL_PROVIDERS: EmailProviderId[] = [
  "gmail",
  "yahoo",
  "outlook",
  "office365",
  "exchange",
  "work-imap",
];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asDateString(value: unknown): string {
  return typeof value === "string" ? value : new Date().toISOString();
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asReceiptStatus(value: unknown): ReceiptStatus {
  if (value === "processed" || value === "pending" || value === "failed") {
    return value;
  }
  return "processed";
}

function asClaimStatus(value: unknown): ClaimStatus {
  if (
    value === "draft" ||
    value === "submitted" ||
    value === "processing" ||
    value === "paid" ||
    value === "rejected"
  ) {
    return value;
  }
  return "submitted";
}

function isEmailProviderId(value: string): value is EmailProviderId {
  return ALL_EMAIL_PROVIDERS.includes(value as EmailProviderId);
}

function mapReceipt(row: UnknownRow): Receipt {
  return {
    id: asString(row.id, Math.random().toString(36).slice(2)),
    merchant: asString(row.merchant, "Unknown merchant"),
    totalCents: Math.round(asNumber(row.total_cents, asNumber(row.total, 0) * 100)),
    currency: asString(row.currency, "GBP"),
    purchaseDate: asDateString(row.purchase_date ?? row.purchased_at),
    source: (["gmail", "outlook", "yahoo", "manual"].includes(asString(row.source))
      ? asString(row.source)
      : "manual") as Receipt["source"],
    status: asReceiptStatus(row.status),
  };
}

function mapProduct(row: UnknownRow): Product {
  return {
    id: asString(row.id, Math.random().toString(36).slice(2)),
    name: asString(row.name, "Unknown product"),
    brand: asString(row.brand, "Unknown"),
    category: asString(row.category, "Uncategorized"),
    receiptId: asOptionalString(row.receipt_id),
    purchaseDate: asOptionalString(row.purchase_date ?? row.purchased_at),
    isRecalled: Boolean(row.is_recalled ?? row.recalled ?? false),
    lastCheckedAt: asOptionalString(row.last_checked_at),
  };
}

function mapClaim(row: UnknownRow): Claim {
  return {
    id: asString(row.id, Math.random().toString(36).slice(2)),
    recallId: asString(row.recall_id),
    productName: asString(row.product_name, "Recalled product"),
    status: asClaimStatus(row.status),
    createdAt: asDateString(row.created_at),
    estimatedPayoutCents: Math.round(asNumber(row.estimated_payout_cents, 0)),
    estimatedPayoutCurrency: asString(row.estimated_payout_currency, "GBP"),
  };
}

function mapRecall(row: UnknownRow): Recall {
  return {
    id: asString(row.id, Math.random().toString(36).slice(2)),
    productId: asOptionalString(row.product_id),
    productName: asString(row.product_name, "Unknown product"),
    title: asString(row.title, "Product safety notice"),
    details: asString(row.details, asString(row.reason, "Recall details unavailable.")),
    severity: (["low", "medium", "high"].includes(asString(row.severity))
      ? asString(row.severity)
      : "medium") as Recall["severity"],
    publishedAt: asDateString(row.published_at),
    source: asString(row.source, "Regulatory feed"),
    isActive: Boolean(row.is_active ?? true),
    estimatedPayoutCents: Math.round(asNumber(row.estimated_payout_cents, 2500)),
    estimatedPayoutCurrency: asString(row.estimated_payout_currency, "GBP"),
  };
}

export function computeStats(snapshot: AppSnapshot | null): DashboardStats {
  if (!snapshot) {
    return {
      receiptCount: 0,
      productsTracked: 0,
      activeRecalls: 0,
      claimsInProgress: 0,
      totalSpendCents: 0,
    };
  }

  return {
    receiptCount: snapshot.receipts.length,
    productsTracked: snapshot.products.length,
    activeRecalls: snapshot.recalls.filter((recall) => recall.isActive).length,
    claimsInProgress: snapshot.claims.filter((claim) =>
      claim.status === "draft" || claim.status === "submitted" || claim.status === "processing",
    ).length,
    totalSpendCents: snapshot.receipts.reduce((sum, receipt) => sum + receipt.totalCents, 0),
  };
}

export async function fetchSnapshotForUser(userId: string): Promise<AppSnapshot> {
  if (!env.hasSupabaseConfig || !userId) {
    return {
      receipts: MOCK_RECEIPTS,
      products: MOCK_PRODUCTS,
      recalls: MOCK_RECALLS,
      claims: MOCK_CLAIMS,
    };
  }

  const [receiptsResult, productsResult, recallsResult, claimsResult] = await Promise.all([
    supabase.from("bills").select("*").eq("user_id", userId).order("purchased_at", { ascending: false }),
    supabase.from("products").select("*").eq("user_id", userId).order("purchased_at", { ascending: false }),
    supabase.from("recalls").select("*").order("published_at", { ascending: false }),
    supabase.from("claims").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (receiptsResult.error || productsResult.error || recallsResult.error || claimsResult.error) {
    throw new Error(
      receiptsResult.error?.message ??
        productsResult.error?.message ??
        recallsResult.error?.message ??
        claimsResult.error?.message ??
        "Unable to fetch data.",
    );
  }

  return {
    receipts: (receiptsResult.data ?? []).map((row) => mapReceipt(row as UnknownRow)),
    products: (productsResult.data ?? []).map((row) => mapProduct(row as UnknownRow)),
    recalls: (recallsResult.data ?? []).map((row) => mapRecall(row as UnknownRow)),
    claims: (claimsResult.data ?? []).map((row) => mapClaim(row as UnknownRow)),
  };
}

export async function createClaimForRecall(userId: string, recall: Recall): Promise<Claim> {
  if (!env.hasSupabaseConfig || !userId) {
    return {
      id: Math.random().toString(36).slice(2),
      recallId: recall.id,
      productName: recall.productName,
      status: "submitted",
      createdAt: new Date().toISOString(),
      estimatedPayoutCents: recall.estimatedPayoutCents,
      estimatedPayoutCurrency: recall.estimatedPayoutCurrency,
    };
  }

  const { data, error } = await supabase
    .from("claims")
    .insert({
      user_id: userId,
      recall_id: recall.id,
      product_name: recall.productName,
      status: "submitted",
      estimated_payout_cents: recall.estimatedPayoutCents,
      estimated_payout_currency: recall.estimatedPayoutCurrency,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create claim.");
  }

  return mapClaim(data as UnknownRow);
}

export async function updateReceiptStatus(
  snapshot: AppSnapshot,
  billId: string,
  status: ReceiptStatus,
): Promise<AppSnapshot> {
  return {
    ...snapshot,
    receipts: snapshot.receipts.map((receipt) =>
      receipt.id === billId
        ? {
            ...receipt,
            status,
          }
        : receipt,
    ),
  };
}

export async function markClaimStatus(
  snapshot: AppSnapshot,
  claimId: string,
  status: ClaimStatus,
): Promise<AppSnapshot> {
  return {
    ...snapshot,
    claims: snapshot.claims.map((claim) =>
      claim.id === claimId
        ? {
            ...claim,
            status,
          }
        : claim,
    ),
  };
}

export async function refreshRecallCheck(
  snapshot: AppSnapshot,
  productId: string,
): Promise<AppSnapshot> {
  return {
    ...snapshot,
    products: snapshot.products.map((product) =>
      product.id === productId
        ? {
            ...product,
            lastCheckedAt: new Date().toISOString(),
          }
        : product,
    ),
  };
}

export async function runUnlimitedInboxScan(userId: string): Promise<{ scanned: number }> {
  if (!env.hasSupabaseConfig || !userId) {
    return { scanned: MOCK_INBOX_SCAN_COUNT };
  }

  const { data, error } = await supabase.functions.invoke("scan-inbox", {
    body: { userId, noCap: true },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    scanned: asNumber((data as UnknownRow | null)?.scanned, 0),
  };
}

export async function runMultiProviderInboxScan(
  userId: string,
  providers: EmailProviderId[],
): Promise<InboxScanResult> {
  const normalizedProviders: EmailProviderId[] = providers.length ? providers : ALL_EMAIL_PROVIDERS;
  if (!env.hasSupabaseConfig || !userId) {
    return {
      scannedEmails: MOCK_INBOX_SCAN_COUNT,
      importedReceipts: [],
      scannedAt: new Date().toISOString(),
      providers: normalizedProviders.map((provider): InboxScanProviderResult => ({
        provider,
        scannedEmails: Math.floor(MOCK_INBOX_SCAN_COUNT / normalizedProviders.length),
        matchedReceipts: Math.floor(42 / normalizedProviders.length),
        status: "scanned",
      })),
      warnings: [],
    };
  }

  const { data, error } = await supabase.functions.invoke("scan-inbox", {
    body: {
      userId,
      noCap: true,
      providers: normalizedProviders,
      includeWorkDomains: true,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = (data ?? {}) as UnknownRow;
  const rawProviders = Array.isArray(payload.providers) ? payload.providers : [];
  const providerResults: InboxScanProviderResult[] = rawProviders
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const row = item as UnknownRow;
      const provider = asString(row.provider);
      if (!isEmailProviderId(provider)) return null;
      const status = asString(row.status, "queued");
      const normalizedStatus: InboxScanProviderResult["status"] =
        status === "scanned" || status === "failed" ? status : "queued";
      return {
        provider,
        scannedEmails: asNumber(row.scanned_emails, 0),
        matchedReceipts: asNumber(row.matched_receipts, 0),
        status: normalizedStatus,
      };
    })
    .filter((item): item is InboxScanProviderResult => item !== null);

  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((item): item is string => typeof item === "string")
    : [];

  return {
    scannedEmails: asNumber(payload.scanned, 0),
    importedReceipts: [],
    scannedAt: asDateString(payload.scanned_at),
    providers:
      providerResults.length > 0
        ? providerResults
        : normalizedProviders.map((provider): InboxScanProviderResult => ({
            provider,
            scannedEmails: 0,
            matchedReceipts: 0,
            status: "queued",
          })),
    warnings,
  };
}

export async function requestServerScanFallback(userId: string, providers: EmailProviderId[]) {
  if (!env.hasSupabaseConfig || !userId) {
    return { accepted: true, mode: "mock" as const };
  }
  const { error } = await supabase.functions.invoke("schedule-inbox-background-scan", {
    body: {
      userId,
      providers: providers.length ? providers : ALL_EMAIL_PROVIDERS,
      noCap: true,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
  return { accepted: true, mode: "live" as const };
}
