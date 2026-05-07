import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const receipts = sqliteTable('receipts', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  merchant: text('merchant').notNull(),
  totalCents: integer('total_cents').notNull(),
  currency: text('currency').notNull(),
  purchaseDate: text('purchase_date').notNull(),
  source: text('source').notNull(), // EmailProviderId | 'manual'
  status: text('status').notNull(), // ReceiptStatus
  category: text('category'),
  supplierWarrantyMonths: integer('supplier_warranty_months'),
  supplierWarrantySource: text('supplier_warranty_source'),
  supplierWarrantyCheckedAt: text('supplier_warranty_checked_at'),
});

export type ReceiptLocal = InferSelectModel<typeof receipts>;
export type ReceiptInsert = InferInsertModel<typeof receipts>;

export const emailConnections = sqliteTable('email_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  provider: text('provider').notNull(),
  imapHost: text('imap_host'),
  imapPort: integer('imap_port'),
  username: text('username'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export type EmailConnectionLocal = InferSelectModel<typeof emailConnections>;
export type EmailConnectionInsert = InferInsertModel<typeof emailConnections>;

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  receiptId: text('receipt_id').references(() => receipts.id),
  purchaseDate: text('purchase_date'),
  isRecalled: integer('is_recalled', { mode: 'boolean' }).notNull().default(false),
  lastCheckedAt: text('last_checked_at'),
});

export type ProductLocal = InferSelectModel<typeof products>;
export type ProductInsert = InferInsertModel<typeof products>;

export const recalls = sqliteTable('recalls', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  productName: text('product_name').notNull(),
  title: text('title').notNull(),
  details: text('details').notNull(),
  severity: text('severity').notNull(),
  publishedAt: text('published_at').notNull(),
  source: text('source').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  estimatedPayoutCents: integer('estimated_payout_cents').notNull(),
  estimatedPayoutCurrency: text('estimated_payout_currency').notNull(),
});

export type RecallLocal = InferSelectModel<typeof recalls>;
export type RecallInsert = InferInsertModel<typeof recalls>;

export const claims = sqliteTable('claims', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  recallId: text('recall_id').notNull().references(() => recalls.id),
  productName: text('product_name').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  estimatedPayoutCents: integer('estimated_payout_cents').notNull(),
  estimatedPayoutCurrency: text('estimated_payout_currency').notNull(),
  kind: text('kind'),
  issueDescription: text('issue_description'),
  supplierName: text('supplier_name'),
  supplierEmail: text('supplier_email'),
  emailDeliveryStatus: text('email_delivery_status'),
  responseStatus: text('response_status'),
  heardBackAt: text('heard_back_at'),
});

export type ClaimLocal = InferSelectModel<typeof claims>;
export type ClaimInsert = InferInsertModel<typeof claims>;
