import type { Receipt } from '@/types/domain';

/**
 * Receipt categorization service
 * Intelligently categorizes receipts by merchant, category, and amount
 */
export const receiptCategoryService = {
  /**
   * Categorize a receipt based on merchant and content
   */
  categorizeReceipt(receipt: Receipt): string {
    const merchant = receipt.merchant.toLowerCase();
    const amount = receipt.totalCents;

    // Merchant-based categorization
    const category = this.getMerchantCategory(merchant);
    if (category) {
      return category;
    }

    // Amount-based heuristics
    return this.categorizeByAmount(amount);
  },

  /**
   * Determine category based on merchant name
   */
  getMerchantCategory(merchantName: string): string | null {
    const categoryMappings: Record<string, string[]> = {
      'Groceries & Food': [
        'tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'co-op',
        'lidl', 'aldi', 'supermarket', 'grocery', 'food', 'restaurant',
        'pizza hut', 'kfc', 'mcdonalds', 'subway', 'starbucks', 'costa',
        'cafe', 'bakery', 'butcher', 'market', 'whole foods', 'farmer',
        'ocado', 'deliveroo', 'just eat', 'uber eats', 'wolt',
      ],
      'Electronics': [
        'currys', 'john lewis', 'pc world', 'argos', 'maplin', 'best buy',
        'technology', 'computer', 'phone', 'electronics', 'device',
        'laptop', 'mobile', 'iphone', 'samsung', 'sony', 'apple',
        'amazon', 'scan', 'ebuyer', 'overclockers', 'scan computer',
      ],
      'Clothing & Fashion': [
        'zara', 'h&m', 'topshop', 'gap', 'mark', 'spencer', 'next',
        'debenhams', 'fashion', 'clothes', 'apparel', 'boutique',
        'shoes', 'dress', 'shirt', 'jeans', 'uniqlo', 'primark',
        'river island', 'new look', 'asos', 'boohoo', 'shein',
      ],
      'Home & Garden': [
        'b&q', 'wickes', 'screwfix', 'homebase', 'ikea', 'dunelm',
        'wilko', 'furniture', 'home', 'garden', 'diy', 'tools',
        'decor', 'paint', 'wood', 'lowes', 'home depot', 'menards',
        'beds', 'sofa', 'table', 'chair',
      ],
      'Health & Beauty': [
        'boots', 'superdrug', 'holland', 'barrett', 'boots opticians',
        'pharmacy', 'chemist', 'beauty', 'health', 'cosmetics',
        'perfume', 'makeup', 'skincare', 'salon', 'spa', 'gym',
        'boots', 'wellcome', 'watsons', 'health',
      ],
      'Entertainment': [
        'cinema', 'spotify', 'netflix', 'disney', 'gaming', 'steam',
        'epic', 'playstation', 'xbox', 'ticket', 'concert', 'theatre',
        'movie', 'odeon', 'vue', 'picturehouse', 'hbo', 'amazon prime',
        'apple tv', 'youtube', 'twitch',
      ],
      'Travel & Transport': [
        'tfl', 'national', 'rail', 'virgin', 'ryanair', 'easyjet',
        'uber', 'taxi', 'transport', 'fuel', 'petrol', 'parking',
        'hotel', 'airbnb', 'booking', 'expedia', 'trivago', 'flight',
        'train', 'bus', 'coach', 'car hire', 'shell', 'bp', 'tesco fuel',
      ],
      'Utilities & Services': [
        'electricity', 'gas', 'water', 'internet', 'phone', 'mobile',
        'insurance', 'council', 'tax', 'subscription', 'service',
        'maintenance', 'edf', 'british gas', 'eon', 'vodafone', 'o2',
        'ee', 'three', 'sky', 'virgin media', 'talk talk',
      ],
      'Sports & Fitness': [
        'gym', 'fitness', 'sports', 'nike', 'adidas', 'puma', 'jd sports',
        'sports direct', 'decathlon', 'wiggle', 'runner needs',
      ],
      'Books & Media': [
        'waterstones', 'amazon', 'books', 'kindle', 'audible', 'library',
        'ebay', 'comic', 'dvd', 'blu-ray', 'vinyl', 'record',
      ],
    };

    for (const [category, merchants] of Object.entries(categoryMappings)) {
      if (merchants.some((merchant) => merchantName.includes(merchant))) {
        return category;
      }
    }

    return null;
  },

  /**
   * Categorize by amount when merchant is unknown
   * Used as fallback
   */
  categorizeByAmount(amountCents: number): string {
    const amount = amountCents / 100;

    // Small amounts (<£5) likely groceries or food
    if (amount < 500) {
      return 'Groceries & Food';
    }

    // Medium amounts (£5-£50) could be various
    if (amount < 5000) {
      return 'Shopping';
    }

    // Larger amounts (£50-£200) likely furniture, electronics, or services
    if (amount < 20000) {
      return 'Home & Garden';
    }

    // Very large amounts likely major purchases
    return 'Uncategorized';
  },

  /**
   * Group receipts by category
   */
  groupByCategory(receipts: Receipt[]): Record<string, Receipt[]> {
    const grouped: Record<string, Receipt[]> = {};

    for (const receipt of receipts) {
      const category = receipt.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(receipt);
    }

    return grouped;
  },

  /**
   * Get category statistics
   */
  getCategoryStats(receipts: Receipt[]): Record<string, { count: number; total: number }> {
    const stats: Record<string, { count: number; total: number }> = {};

    for (const receipt of receipts) {
      const category = receipt.category || 'Uncategorized';
      if (!stats[category]) {
        stats[category] = { count: 0, total: 0 };
      }
      stats[category].count++;
      stats[category].total += receipt.totalCents;
    }

    return stats;
  },

  /**
   * Get top spending categories
   */
  getTopCategories(receipts: Receipt[], limit: number = 5): Array<{
    category: string;
    total: number;
    count: number;
    average: number;
  }> {
    const stats = this.getCategoryStats(receipts);

    return Object.entries(stats)
      .map(([category, { count, total }]) => ({
        category,
        total,
        count,
        average: total / count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },

  /**
   * Check if receipt is in specific category
   */
  isInCategory(receipt: Receipt, category: string): boolean {
    return (receipt.category || 'Uncategorized') === category;
  },

  /**
   * Get all supported categories
   */
  getAllCategories(): string[] {
    return [
      'Groceries & Food',
      'Electronics',
      'Clothing & Fashion',
      'Home & Garden',
      'Health & Beauty',
      'Entertainment',
      'Travel & Transport',
      'Utilities & Services',
      'Sports & Fitness',
      'Books & Media',
      'Shopping',
      'Uncategorized',
    ];
  },
};
