import { supabase } from '@/services/supabase';
import { Receipt } from '../types/domain';
import { receiptCategoryService } from './receiptCategoryService';

export const receiptService = {
  async getAllReceipts(): Promise<Receipt[]> {
    const { data, error } = await supabase.from('receipts').select('*');
    if (error) throw error;
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      merchant: row.merchant,
      totalCents: row.total_cents,
      currency: row.currency,
      purchaseDate: row.purchase_date,
      source: row.source,
      status: row.status,
      category: row.category,
      supplierWarrantyMonths: row.supplier_warranty_months,
      supplierWarrantySource: row.supplier_warranty_source,
      supplierWarrantyCheckedAt: row.supplier_warranty_checked_at,
    })) as Receipt[];
  },

  async getReceiptsByCategory(userId: string): Promise<Record<string, Receipt[]>> {
    const receipts = await this.getAllReceipts();
    const userReceipts = receipts.filter(r => r.userId === userId);
    
    return receiptCategoryService.groupByCategory(userReceipts);
  },

  async getReceiptsBySpecificCategory(userId: string, category: string): Promise<Receipt[]> {
    const receipts = await this.getAllReceipts();
    return receipts.filter(
      (r) => r.userId === userId && (r.category || 'Uncategorized') === category,
    );
  },

  async getCategoryStats(userId: string): Promise<Record<string, { count: number; total: number }>> {
    const receipts = await this.getAllReceipts();
    const userReceipts = receipts.filter((r) => r.userId === userId);
    return receiptCategoryService.getCategoryStats(userReceipts);
  },

  async getTopCategories(userId: string, limit: number = 5): Promise<Array<{
    category: string;
    total: number;
    count: number;
    average: number;
  }>> {
    const receipts = await this.getAllReceipts();
    const userReceipts = receipts.filter((r) => r.userId === userId);
    return receiptCategoryService.getTopCategories(userReceipts, limit);
  },

  async addReceipt(receipt: Receipt) {
    // Auto-categorize if not provided
    const category = receipt.category || receiptCategoryService.categorizeReceipt(receipt);
    
    const { error } = await supabase.from('receipts').insert({
      id: receipt.id,
      user_id: receipt.userId,
      merchant: receipt.merchant,
      total_cents: receipt.totalCents,
      currency: receipt.currency,
      purchase_date: receipt.purchaseDate,
      source: receipt.source,
      status: receipt.status,
      category,
      supplier_warranty_months: receipt.supplierWarrantyMonths,
      supplier_warranty_source: receipt.supplierWarrantySource,
      supplier_warranty_checked_at: receipt.supplierWarrantyCheckedAt,
    });

    if (error) throw error;
  },

  async updateReceipt(id: string, updates: Partial<Receipt>) {
    // Map updates to snake_case if needed
    const mappedUpdates: any = { ...updates };
    if (updates.userId) mappedUpdates.user_id = updates.userId;
    if (updates.totalCents) mappedUpdates.total_cents = updates.totalCents;
    if (updates.purchaseDate) mappedUpdates.purchase_date = updates.purchaseDate;
    if (updates.supplierWarrantyMonths) mappedUpdates.supplier_warranty_months = updates.supplierWarrantyMonths;
    if (updates.supplierWarrantySource) mappedUpdates.supplier_warranty_source = updates.supplierWarrantySource;
    if (updates.supplierWarrantyCheckedAt) mappedUpdates.supplier_warranty_checked_at = updates.supplierWarrantyCheckedAt;

    // Remove camelCase versions
    delete mappedUpdates.userId;
    delete mappedUpdates.totalCents;
    delete mappedUpdates.purchaseDate;
    delete mappedUpdates.supplierWarrantyMonths;
    delete mappedUpdates.supplierWarrantySource;
    delete mappedUpdates.supplierWarrantyCheckedAt;

    const { error } = await supabase
      .from('receipts')
      .update(mappedUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteReceipt(id: string) {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async searchReceipts(userId: string, query: string): Promise<Receipt[]> {
    const receipts = await this.getAllReceipts();
    const userReceipts = receipts.filter((r) => r.userId === userId);
    const lowerQuery = query.toLowerCase();
    
    return userReceipts.filter(
      (r) =>
        r.merchant.toLowerCase().includes(lowerQuery) ||
        r.category?.toLowerCase().includes(lowerQuery) ||
        r.source.toLowerCase().includes(lowerQuery),
    );
  },
};
