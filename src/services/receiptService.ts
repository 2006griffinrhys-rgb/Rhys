import { db } from '../db/client';
import { receipts } from '../db/schema';
import { Receipt } from '../types/domain';
import { eq } from 'drizzle-orm';

export const receiptService = {
  async getAllReceipts(): Promise<Receipt[]> {
    const results = await db.query.receipts.findMany();
    return results as Receipt[];
  },

  async addReceipt(receipt: Receipt) {
    return await db.insert(receipts).values({
      id: receipt.id,
      merchant: receipt.merchant,
      totalCents: receipt.totalCents,
      currency: receipt.currency,
      purchaseDate: receipt.purchaseDate,
      source: receipt.source,
      status: receipt.status,
      category: receipt.category,
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
  }
};
