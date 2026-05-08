import { db } from '../db/client';
import { receipts } from '../db/schema';
import { Receipt } from '../types/domain';
import { eq } from 'drizzle-orm';
import { receiptCategoryService } from './receiptCategoryService';

export const receiptService = {
  async getAllReceipts(): Promise<Receipt[]> {
    const results = await db.query.receipts.findMany();
    return results as Receipt[];
  },

  async getReceiptsByCategory(userId: string): Promise<Record<string, Receipt[]>> {
    const receipts = await db.query.receipts.findMany({
      where: eq(receipts.userId, userId),
    });
    
    return receiptCategoryService.groupByCategory(receipts as Receipt[]);
  },

  async getReceiptsBySpecificCategory(userId: string, category: string): Promise<Receipt[]> {
    const results = await db.query.receipts.findMany();
    const filtered = (results as Receipt[]).filter(
      (r) => r.userId === userId && (r.category || 'Uncategorized') === category,
    );
    return filtered;
  },

  async getCategoryStats(userId: string): Promise<Record<string, { count: number; total: number }>> {
    const results = await db.query.receipts.findMany();
    const userReceipts = (results as Receipt[]).filter((r) => r.userId === userId);
    return receiptCategoryService.getCategoryStats(userReceipts);
  },

  async getTopCategories(userId: string, limit: number = 5): Promise<Array<{
    category: string;
    total: number;
    count: number;
    average: number;
  }>> {
    const results = await db.query.receipts.findMany();
    const userReceipts = (results as Receipt[]).filter((r) => r.userId === userId);
    return receiptCategoryService.getTopCategories(userReceipts, limit);
  },

  async addReceipt(receipt: Receipt) {
    // Auto-categorize if not provided
    const category = receipt.category || receiptCategoryService.categorizeReceipt(receipt);
    
    return await db.insert(receipts).values({
      id: receipt.id,
      merchant: receipt.merchant,
      totalCents: receipt.totalCents,
      currency: receipt.currency,
      purchaseDate: receipt.purchaseDate,
      source: receipt.source,
      status: receipt.status,
      category,
      supplierWarrantyMonths: receipt.supplierWarrantyMonths,
      supplierWarrantySource: receipt.supplierWarrantySource,
      supplierWarrantyCheckedAt: receipt.supplierWarrantyCheckedAt,
    });
  },

  async updateReceipt(id: string, updates: Partial<Receipt>) {
    return await db.update(receipts).set(updates).where(eq(receipts.id, id));
  },

  async deleteReceipt(id: string) {
    return await db.delete(receipts).where(eq(receipts.id, id));
  },

  async searchReceipts(userId: string, query: string): Promise<Receipt[]> {
    const results = await db.query.receipts.findMany();
    const userReceipts = (results as Receipt[]).filter((r) => r.userId === userId);
    const lowerQuery = query.toLowerCase();
    
    return userReceipts.filter(
      (r) =>
        r.merchant.toLowerCase().includes(lowerQuery) ||
        r.category?.toLowerCase().includes(lowerQuery) ||
        r.source.toLowerCase().includes(lowerQuery),
    );
  },
};
