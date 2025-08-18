import React, { useMemo } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { CommissionKPIStats } from '../../database/models/Commission';

interface CommissionKPIBarProps {
  kpis: CommissionKPIStats;
  isOnline: boolean;
  testID?: string;
}

/**
 * CommissionKPIBar Component
 * Sticky KPI summary bar that shows real-time commission totals
 * Meets WCAG 2.1 AA accessibility standards
 */
export const CommissionKPIBar: React.FC<CommissionKPIBarProps> = ({
  kpis,
  isOnline,
  testID = 'commission-kpi-bar',
}) => {
  const theme = useTheme();

  // Format currency helper
  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(amount);
    };
  }, []);

  // Accessibility announcement for KPI changes
  const announceKPIUpdate = useMemo(() => {
    const totalEarnings = formatCurrency(kpis.totalCommission);
    const paidAmount = formatCurrency(kpis.paidCommission);
    const pendingAmount = formatCurrency(kpis.pendingCommission);

    return `Commission summary updated. Total earnings: ${totalEarnings}. Paid: ${paidAmount} for ${kpis.paidCount} commissions. Pending: ${pendingAmount} for ${kpis.pendingCount} commissions.`;
  }, [kpis, formatCurrency]);

  const styles = createStyles(theme);

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={announceKPIUpdate}
    >
      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View
          style={styles.kpiCard}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Total earnings: ${formatCurrency(
            kpis.totalCommission
          )}`}
        >
          <Text style={styles.kpiValue}>
            {formatCurrency(kpis.totalCommission)}
          </Text>
          <Text style={styles.kpiLabel}>Total Earnings</Text>
        </View>

        <View
          style={styles.kpiCard}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Paid commissions: ${formatCurrency(
            kpis.paidCommission
          )} for ${kpis.paidCount} items`}
        >
          <Text style={[styles.kpiValue, { color: '#34C759' }]}>
            {formatCurrency(kpis.paidCommission)}
          </Text>
          <Text style={styles.kpiLabel}>Paid ({kpis.paidCount})</Text>
        </View>

        <View
          style={styles.kpiCard}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Pending commissions: ${formatCurrency(
            kpis.pendingCommission
          )} for ${kpis.pendingCount} items`}
        >
          <Text style={[styles.kpiValue, { color: '#FF9500' }]}>
            {formatCurrency(kpis.pendingCommission)}
          </Text>
          <Text style={styles.kpiLabel}>Pending ({kpis.pendingCount})</Text>
        </View>
      </View>

      {/* Connection Status Indicator */}
      {isOnline && (
        <View style={styles.connectionIndicator}>
          <Text style={styles.connectionStatus}>🌐</Text>
          <Text style={styles.connectionText}>Live Data</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors?.surface || 'white',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors?.outline || '#e0e0e0',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      zIndex: 10, // Ensure it stays above other content
    },
    kpiContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: theme.colors?.surfaceVariant || '#f8f9fa',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      borderWidth: 1,
      borderColor: theme.colors?.outline || '#e0e0e0',
      minHeight: 60, // WCAG 2.1 AA - adequate touch target
    },
    kpiValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#004C89',
      textAlign: 'center',
      lineHeight: 20,
    },
    kpiLabel: {
      fontSize: 11,
      color: '#666',
      marginTop: 4,
      textAlign: 'center',
      lineHeight: 14,
    },
    connectionIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      paddingVertical: 4,
    },
    connectionStatus: {
      fontSize: 12,
      marginRight: 4,
    },
    connectionText: {
      fontSize: 11,
      color: '#34C759',
      fontWeight: '500',
    },
  });

export default CommissionKPIBar;
