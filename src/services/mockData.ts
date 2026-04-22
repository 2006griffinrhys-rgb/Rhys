import type { Claim, Product, Recall, Receipt } from "@/types/domain";

export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: "r-001",
    merchant: "Tesco",
    totalCents: 5840,
    currency: "GBP",
    purchaseDate: "2026-04-05T10:35:00.000Z",
    status: "processed",
    source: "gmail",
  },
  {
    id: "r-002",
    merchant: "Amazon UK",
    totalCents: 12499,
    currency: "GBP",
    purchaseDate: "2026-04-01T17:20:00.000Z",
    status: "pending",
    source: "outlook",
  },
  {
    id: "r-003",
    merchant: "Aldi",
    totalCents: 3412,
    currency: "GBP",
    purchaseDate: "2026-03-28T12:02:00.000Z",
    status: "failed",
    source: "manual",
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-001",
    name: "Contoso Baby Formula 600g",
    brand: "Contoso",
    category: "Baby food",
    receiptId: "r-001",
    purchaseDate: "2026-04-05T10:35:00.000Z",
    isRecalled: true,
    lastCheckedAt: "2026-04-11T09:00:00.000Z",
  },
  {
    id: "p-002",
    name: "Northwind Electric Kettle",
    brand: "Northwind",
    category: "Home appliances",
    receiptId: "r-002",
    purchaseDate: "2026-04-01T17:20:00.000Z",
    isRecalled: false,
    lastCheckedAt: "2026-04-09T09:00:00.000Z",
  },
  {
    id: "p-003",
    name: "Fabrikam Whole Milk",
    brand: "Fabrikam",
    category: "Groceries",
    receiptId: "r-001",
    purchaseDate: "2026-04-05T10:35:00.000Z",
    isRecalled: false,
    lastCheckedAt: "2026-04-10T09:00:00.000Z",
  },
];

export const MOCK_RECALLS: Recall[] = [
  {
    id: "rec-001",
    productName: "Contoso Baby Formula 600g",
    title: "Potential contamination in selected batches",
    details: "Potential contamination identified in selected production batches.",
    severity: "high",
    publishedAt: "2026-04-10T09:00:00.000Z",
    source: "UK FSA",
    isActive: true,
    estimatedPayoutCents: 2350,
    estimatedPayoutCurrency: "GBP",
  },
  {
    id: "rec-002",
    productName: "Northwind Electric Kettle",
    title: "Heating element defect notice",
    details: "Faulty heating element may stop functioning prematurely.",
    severity: "medium",
    publishedAt: "2026-03-15T09:00:00.000Z",
    source: "Manufacturer Notice",
    isActive: true,
    estimatedPayoutCents: 1299,
    estimatedPayoutCurrency: "GBP",
  },
];

export const MOCK_CLAIMS: Claim[] = [
  {
    id: "c-001",
    recallId: "rec-001",
    productName: "Contoso Baby Formula 600g",
    createdAt: "2026-04-11T13:30:00.000Z",
    status: "submitted",
    estimatedPayoutCents: 2350,
    estimatedPayoutCurrency: "GBP",
  },
];

export const MOCK_INBOX_SCAN_COUNT = 18246;
