export type ReceiptStatus = "pending" | "processed" | "failed";
export type ClaimStatus = "draft" | "submitted" | "processing" | "paid" | "rejected";
export type RecallSeverity = "low" | "medium" | "high";
export type BillingTier = "free" | "premium" | "unlimited";
export type BillingInterval = "monthly" | "yearly";
export type SupportedCurrency = "GBP" | "USD" | "EUR" | "CAD" | "AUD" | "JPY";
export type ClaimKind = "product" | "bill";
export type ProductClaimOutcome = "refund" | "replacement-exchange" | "repair" | "not-sure";
export type BillClaimOutcome = "waive-charges" | "exit-contract" | "itemised-breakdown" | "not-sure";
export type ClaimOutcome = ProductClaimOutcome | BillClaimOutcome;
export type ClaimResponseStatus =
  | "waiting"
  | "received"
  | "escalated"
  | "resolved"
  | "awaiting-customer"
  | "declined";
export type UserPlan = BillingTier;
export type PlanType = BillingTier;
export type EmailProviderId =
  | "gmail"
  | "yahoo"
  | "outlook"
  | "office365"
  | "exchange"
  | "work-imap";
export type EmailProvider = EmailProviderId;
export type InboxProvider = EmailProviderId;
export type EmailProviderTarget = EmailProviderId;

export type Receipt = {
  id: string;
  merchant: string;
  totalCents: number;
  currency: string;
  purchaseDate: string;
  source: EmailProviderId | "manual";
  status: ReceiptStatus;
  supplierWarrantyMonths?: number;
  supplierWarrantySource?: "invoice" | "supplier-site";
  supplierWarrantyCheckedAt?: string;
};

export type ReceiptImageScanInput = {
  base64Image: string;
  fileName?: string;
  mimeType?: string;
};

export type ReceiptImageScanResult = {
  receipt: Receipt;
  extractedText?: string;
  warnings: string[];
  mode: "live" | "mock";
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
  estimatedPayoutCurrency: string;
};

export type Claim = {
  id: string;
  recallId: string;
  productName: string;
  status: ClaimStatus;
  createdAt: string;
  estimatedPayoutCents: number;
  estimatedPayoutCurrency: string;
  kind?: ClaimKind;
  requestedOutcome?: ClaimOutcome;
  recommendedOutcome?: ClaimOutcome;
  issueDescription?: string;
  supplierName?: string;
  supplierEmail?: string;
  generatedLetterPreview?: string;
  emailDeliveryStatus?: "queued" | "sent" | "failed";
  followUpEnabled?: boolean;
  followUpIntervalDays?: number;
  followUpCount?: number;
  followUpsSent?: number;
  lastFollowUpAt?: string;
  nextFollowUpAt?: string;
  escalateAfterFollowUps?: number;
  escalationEnabled?: boolean;
  escalationTriggeredAt?: string;
  escalationProvider?: string;
  escalationEmail?: string;
  escalationLetterPreview?: string;
  cardLastFour?: string;
  cardProvider?: string;
  escalatedToCardProvider?: boolean;
  cardProviderName?: string;
  cardProviderEmail?: string;
  escalationEmailStatus?: "queued" | "sent" | "failed";
  responseStatus?: ClaimResponseStatus;
  responseSignals?: string[];
  heardBackAt?: string;
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

export type PlanFeatures = {
  billMonitoring: boolean;
  billAlerts: boolean;
  chasing: boolean;
  prioritySupport: boolean;
};

export type PlanFeatureFlags = PlanFeatures;

export type SubscriptionPlan = {
  tier: BillingTier;
  name: string;
  monthlyPriceLabel: string;
  yearlyPriceLabel?: string;
  yearlyDiscountPercent?: number;
  claimLimitPerMonth: number | null;
  features: PlanFeatures;
};

export type PlanPricing = {
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  yearlyDiscountPercent: number;
};

export type InboxScanResult = {
  scannedEmails: number;
  importedReceipts: Receipt[];
  scannedAt: string;
  providers: InboxScanProviderResult[];
  warnings: string[];
};

export type InboxProviderSpec = {
  id: EmailProviderId;
  label: string;
  description: string;
  hosts: string[];
  supportsWorkDomains: boolean;
};

export type InboxScanProviderResult = {
  provider: EmailProviderId;
  scannedEmails: number;
  matchedReceipts: number;
  status: "queued" | "scanned" | "failed";
};

export type InboxProviderCoverage = Record<EmailProviderId, boolean>;
