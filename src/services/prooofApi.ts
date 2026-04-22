import { env } from "@/services/env";
import { MOCK_CLAIMS, MOCK_PRODUCTS, MOCK_RECALLS, MOCK_RECEIPTS } from "@/services/mockData";
import { supabase } from "@/services/supabase";
import type { AppSnapshot, Claim, ClaimStatus, DashboardStats, Product, Recall, Receipt, ReceiptStatus } from "@/types/domain";

type UnknownRow = Record<string, unknown>;

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
