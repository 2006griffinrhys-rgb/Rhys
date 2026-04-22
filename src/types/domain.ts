export type ReceiptStatus = "pending" | "processed" | "failed";
export type ClaimStatus = "draft" | "submitted" | "processing" | "paid" | "rejected";
export type RecallSeverity = "low" | "medium" | "high";

export type Receipt = {
  id: string;
  merchant: string;
  totalCents: number;
  currency: string;
  purchaseDate: string;
  source: "gmail" | "outlook" | "yahoo" | "manual";
  status: ReceiptStatus;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  receiptId?: string;
  purchaseDate?: string;
  isRecalled: boolean;
  lastCheckedAt?: string;
};

export type Recall = {
  id: string;
  productId?: string;
  productName: string;
  title: string;
  details: string;
  severity: RecallSeverity;
  publishedAt: string;
  source: string;
  isActive: boolean;
  estimatedPayoutCents: number;
};

export type Claim = {
  id: string;
  recallId: string;
  productName: string;
  status: ClaimStatus;
  createdAt: string;
  estimatedPayoutCents: number;
};

export type AppSnapshot = {
  receipts: Receipt[];
  products: Product[];
  recalls: Recall[];
  claims: Claim[];
};

export type DashboardStats = {
  receiptCount: number;
  productsTracked: number;
  activeRecalls: number;
  claimsInProgress: number;
  totalSpendCents: number;
};
