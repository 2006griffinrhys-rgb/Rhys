import type { Receipt, EmailProviderId } from '@/types/domain';
import type { EmailAttachment, FetchedEmail } from './emailFetchingService';

/**
 * Receipt parsing service - extracts structured data from receipt PDFs and images
 * Handles OCR-like text extraction and data parsing
 */
export const receiptParsingService = {
  /**
   * Parse receipt from PDF file
   * Simulates PDF parsing - in production, use pdf-parse, tesseract.js, or AWS Textract
   */
  async parseReceiptFromPdf(
    attachment: EmailAttachment,
    provider: EmailProviderId,
    email: FetchedEmail,
  ): Promise<Receipt | null> {
    try {
      console.log(`[ReceiptParser] Parsing PDF: ${attachment.filename}`);

      // In production, you would:
      // 1. Use pdf-parse to extract text from PDF
      // 2. Use tesseract.js for OCR if PDF is scanned image
      // 3. Use AWS Textract or Google Vision API for complex receipts
      
      // For now, simulate extraction from filename and email metadata
      const extractedText = this.simulatePdfExtraction(attachment.filename);

      return this.parseReceiptText(extractedText, provider, email);
    } catch (error) {
      console.error(`[ReceiptParser] Error parsing PDF: ${error}`);
      return null;
    }
  },

  /**
   * Simulate PDF text extraction
   * In production, replace with actual PDF parsing library
   */
  simulatePdfExtraction(filename: string): string {
    // Extract merchant and amount from filename if possible
    // e.g., "Tesco_Receipt_2024-05-07_£45.50.pdf"
    const match = filename.match(/([a-zA-Z\s]+)_.*?([\d.]+)\.pdf/i);
    
    if (match) {
      return `${match[1]}\n£${match[2]}\n${new Date().toISOString().split('T')[0]}`;
    }

    return filename;
  },

  /**
   * Parse receipt data from extracted text
   */
  parseReceiptText(
    text: string,
    provider: EmailProviderId,
    email: FetchedEmail,
  ): Receipt {
    // Extract merchant
    const lines = text.split('\n').filter((l) => l.trim());
    const merchant = this.extractMerchant(lines, email.from);

    // Extract total amount
    const { amount, currency } = this.extractAmount(text);

    // Extract date
    const date = this.extractDate(text) || email.date;

    // Extract category
    const category = this.detectReceiptCategory(text, merchant);

    return {
      id: `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      merchant,
      totalCents: amount,
      currency,
      purchaseDate: date,
      source: provider,
      status: 'processed',
      category,
    };
  },

  /**
   * Extract merchant name from receipt text
   */
  extractMerchant(lines: string[], fromEmail: string): string {
    // First line is often merchant name
    if (lines[0]?.length > 2) {
      return lines[0].trim();
    }

    // Try to extract from email sender
    const emailMatch = fromEmail.match(/([a-zA-Z0-9]+)@/);
    if (emailMatch) {
      return emailMatch[1];
    }

    return 'Unknown Merchant';
  },

  /**
   * Extract amount and currency from text
   */
  extractAmount(text: string): { amount: number; currency: string } {
    // Match various currency formats
    const patterns = [
      { regex: /£\s*(\d+(?:\.\d{2})?)/g, currency: 'GBP' },
      { regex: /\$\s*(\d+(?:\.\d{2})?)/g, currency: 'USD' },
      { regex: /€\s*(\d+(?:\.\d{2})?)/g, currency: 'EUR' },
      { regex: /¥\s*(\d+(?:\.\d{2})?)/g, currency: 'JPY' },
      { regex: /Total[:\s]+(\d+(?:\.\d{2})?)/gi, currency: 'GBP' },
    ];

    for (const { regex, currency } of patterns) {
      const match = text.match(regex);
      if (match) {
        const amount = parseFloat(match[0].match(/\d+(?:\.\d{2})?/)![0]);
        return {
          amount: Math.round(amount * 100),
          currency,
        };
      }
    }

    // Default if no match found
    return { amount: 0, currency: 'GBP' };
  },

  /**
   * Extract date from receipt text
   */
  extractDate(text: string): string | null {
    // Try various date formats
    const patterns = [
      /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const dateStr = match[0];
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    return null;
  },

  /**
   * Detect receipt category based on merchant and content
   */
  detectReceiptCategory(text: string, merchant: string): string {
    const content = `${text} ${merchant}`.toLowerCase();

    const categories: Record<string, string[]> = {
      'Groceries & Food': [
        'tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'co-op',
        'lidl', 'aldi', 'supermarket', 'grocery', 'food', 'restaurant',
        'cafe', 'pizza', 'chicken', 'burger', 'takeaway',
      ],
      'Electronics': [
        'currys', 'john lewis', 'pc world', 'argos', 'maplin',
        'technology', 'computer', 'phone', 'electronics', 'device',
        'laptop', 'mobile', 'iphone', 'samsung',
      ],
      'Clothing & Fashion': [
        'zara', 'h&m', 'topshop', 'gap', 'mark', 'spencer', 'john lewis',
        'next', 'debenhams', 'fashion', 'clothes', 'apparel', 'boutique',
        'shoes', 'dress', 'shirt', 'jeans',
      ],
      'Home & Garden': [
        'b&q', 'wickes', 'screwfix', 'homebase', 'ikea', 'dunelm',
        'wilko', 'furniture', 'home', 'garden', 'diy', 'tools',
        'decor', 'paint', 'wood',
      ],
      'Health & Beauty': [
        'boots', 'superdrug', 'holland', 'barrett', 'boots opticians',
        'pharmacy', 'chemist', 'beauty', 'health', 'cosmetics',
        'perfume', 'makeup', 'skincare',
      ],
      'Entertainment': [
        'cinema', 'cinema', 'spotify', 'netflix', 'disney', 'gaming',
        'steam', 'epic', 'playstation', 'xbox', 'ticket', 'concert',
        'theatre', 'movie',
      ],
      'Travel & Transport': [
        'tfl', 'national', 'rail', 'virgin', 'ryanair', 'easyjet',
        'uber', 'taxi', 'transport', 'fuel', 'petrol', 'parking',
        'hotel', 'airbnb',
      ],
      'Utilities & Services': [
        'electricity', 'gas', 'water', 'internet', 'phone', 'mobile',
        'insurance', 'council', 'tax', 'subscription', 'service',
        'maintenance',
      ],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => content.includes(keyword))) {
        return category;
      }
    }

    return 'Uncategorized';
  },

  /**
   * Extract warranty information from receipt
   * Looks for common warranty keywords and durations
   */
  extractWarrantyInfo(text: string): { months: number; source?: string } | null {
    const warrantyPatterns = [
      { regex: /(\d+)\s*(?:year|yr)?\s*(?:extended\s+)?warranty/i, multiplier: 12 },
      { regex: /(\d+)\s*month\s*warranty/i, multiplier: 1 },
      { regex: /warranty[:\s]+(\d+)\s*(?:month|yr)/i, multiplier: 1 },
    ];

    for (const { regex, multiplier } of warrantyPatterns) {
      const match = text.match(regex);
      if (match && match[1]) {
        const months = parseInt(match[1]) * multiplier;
        return {
          months,
          source: text.includes('invoice') ? 'invoice' : 'receipt',
        };
      }
    }

    return null;
  },
};
