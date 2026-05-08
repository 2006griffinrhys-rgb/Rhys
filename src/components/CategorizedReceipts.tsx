import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { receiptService } from '@/services/receiptService';
import { receiptCategoryService } from '@/services/receiptCategoryService';
import type { Receipt } from '@/types/domain';

interface CategorizedReceiptsProps {
  userId: string;
  refreshTrigger?: number; // Use this to trigger re-fetch
}

interface CategoryGroup {
  category: string;
  receipts: Receipt[];
  total: number;
  count: number;
  average: number;
}

/**
 * Component displaying receipts organized by category
 * Integrates with email fetching and auto-categorization system
 * 
 * Usage in DashboardScreen:
 * const [refreshTrigger, setRefreshTrigger] = useState(0);
 * 
 * return (
 *   <>
 *     <RefreshDataButton 
 *       userId={userId}
 *       onRefreshComplete={() => setRefreshTrigger(t => t + 1)}
 *     />
 *     <CategorizedReceipts 
 *       userId={userId}
 *       refreshTrigger={refreshTrigger}
 *     />
 *   </>
 * );
 */
export function CategorizedReceipts({
  userId,
  refreshTrigger = 0,
}: CategorizedReceiptsProps): React.ReactElement {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    loadCategorizedReceipts();
  }, [userId, refreshTrigger]);

  async function loadCategorizedReceipts() {
    setLoading(true);
    try {
      // Get receipts grouped by category
      const byCategory = await receiptService.getReceiptsByCategory(userId);

      // Get statistics
      const stats = await receiptService.getCategoryStats(userId);

      // Convert to array format
      const categoryGroups: CategoryGroup[] = Object.entries(byCategory)
        .map(([category, receipts]) => {
          const stat = stats[category] || { count: 0, total: 0 };
          return {
            category,
            receipts: receipts as Receipt[],
            total: stat.total,
            count: stat.count,
            average: stat.count > 0 ? stat.total / stat.count : 0,
          };
        })
        .sort((a, b) => b.total - a.total); // Sort by total spending

      setCategories(categoryGroups);
    } catch (error) {
      console.error('Failed to load categorized receipts:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(category: string) {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  }

  function formatCurrency(cents: number): string {
    const pounds = (cents / 100).toFixed(2);
    return `£${pounds}`;
  }

  function renderCategoryHeader(group: CategoryGroup) {
    const isExpanded = expandedCategories.has(group.category);

    return (
      <View
        key={group.category}
        style={styles.categoryHeader}
      >
        <button
          onClick={() => toggleCategory(group.category)}
          style={styles.expandButton}
        >
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
          <Text style={styles.categoryTitle}>{group.category}</Text>
        </button>

        <View style={styles.categoryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Items:</Text>
            <Text style={styles.statValue}>{group.count}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total:</Text>
            <Text style={styles.statValue}>
              {formatCurrency(group.total)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg:</Text>
            <Text style={styles.statValue}>
              {formatCurrency(group.average)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function renderReceiptItem(receipt: Receipt) {
    return (
      <View key={receipt.id} style={styles.receiptItem}>
        <View style={styles.receiptHeader}>
          <Text style={styles.merchantName}>{receipt.merchant}</Text>
          <Text style={styles.amount}>
            {formatCurrency(receipt.totalCents)}
          </Text>
        </View>
        <View style={styles.receiptDetails}>
          <Text style={styles.detailText}>
            {new Date(receipt.purchaseDate).toLocaleDateString()}
          </Text>
          <Text style={styles.detailText}>
            Source: {receipt.source}
          </Text>
        </View>
      </View>
    );
  }

  function renderCategoryContent(group: CategoryGroup) {
    if (!expandedCategories.has(group.category)) {
      return null;
    }

    return (
      <View key={`${group.category}-content`} style={styles.categoryContent}>
        {group.receipts.map((receipt) => renderReceiptItem(receipt))}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading receipts...</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text>No receipts found. Connect an email account and refresh.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Receipts by Category</Text>

      <FlatList
        data={categories}
        renderItem={({ item: group }) => (
          <View>
            {renderCategoryHeader(group)}
            {renderCategoryContent(group)}
          </View>
        )}
        keyExtractor={(item) => item.category}
        scrollEnabled={false}
      />

      {/* Summary Statistics */}
      {categories.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Total Receipts:
            </Text>
            <Text style={styles.summaryValue}>
              {categories.reduce((sum, c) => sum + c.count, 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Total Spending:
            </Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(
                categories.reduce((sum, c) => sum + c.total, 0),
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Average Receipt:
            </Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(
                categories.reduce((sum, c) => sum + c.total, 0) /
                  categories.reduce((sum, c) => sum + c.count, 0),
              )}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  categoryHeader: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  expandButton: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  expandIcon: {
    fontSize: 12,
    marginRight: 8,
    color: '#6b7280',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  categoryStats: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  categoryContent: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 4,
    marginHorizontal: 4,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#d1d5db',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  receiptDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 11,
    color: '#6b7280',
  },
  summarySection: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#1e40af',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
});

export default CategorizedReceipts;
