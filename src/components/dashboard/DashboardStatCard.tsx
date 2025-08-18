/**
 * Dashboard Stat Card Component
 *
 * Displays individual dashboard metrics with live data updates.
 * Supports loading states, offline handling, and full accessibility compliance.
 *
 * WCAG 4.1.3 Compliance:
 * - Uses live regions to announce value changes to screen readers
 * - Provides meaningful accessibility labels
 * - Respects Dynamic Type settings
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export interface DashboardStatCardProps {
  /** Display title for the metric */
  title: string;
  /** Numeric value to display (undefined shows 0, except in offline no-cache state) */
  value: number | undefined;
  /** Test ID for testing purposes */
  testID?: string;
  /** Whether the app is offline (affects empty state display) */
  isOffline?: boolean;
  /** Whether data has been cached (affects empty state messaging) */
  hasCache?: boolean;
}

/**
 * Individual dashboard statistic card with live data binding
 *
 * States:
 * 1. Normal: Shows value or 0 if undefined
 * 2. Offline + no cache: Shows "–" with "No data yet"
 */
const DashboardStatCard: React.FC<DashboardStatCardProps> = React.memo(
  ({ title, value, testID, isOffline = false, hasCache = false }) => {
    const theme = useTheme();
    const styles = createStyles(theme);

    // Determine display state
    const isEmpty = isOffline && !hasCache;
    const displayValue = value ?? 0; // Show 0 if undefined

    // Get display value
    const getDisplayValue = (): string => {
      if (isEmpty) {
        return '–'; // Em-dash for offline + no cache
      } else {
        return displayValue.toString(); // Always show number (0 if undefined)
      }
    };

    // Get subtitle for empty state
    const getSubtitle = (): string | null => {
      if (isEmpty) {
        return 'No data yet';
      }
      return null;
    };

    // Create accessibility label
    const getAccessibilityLabel = (): string => {
      if (isEmpty) {
        return `${title}, no data available`;
      } else {
        return `${title}, ${displayValue}`;
      }
    };

    return (
      <View
        style={styles.container}
        testID={testID}
        accessibilityLabel={getAccessibilityLabel()}
        // WCAG 4.1.3: Live regions for announcing value changes
        {...(Platform.OS === 'android' && {
          accessibilityLiveRegion: 'polite' as const,
        })}
        {...(Platform.OS === 'ios' && {
          accessibilityRole: 'status' as const,
          importantForAccessibility: 'yes' as const,
        })}
        // Web accessibility
        {...(Platform.OS === 'web' && {
          'aria-live': 'polite',
          role: 'status',
        })}
      >
        {/* Title */}
        <Text
          style={styles.title}
          numberOfLines={2}
          adjustsFontSizeToFit
          allowFontScaling={true} // Respect Dynamic Type
        >
          {title}
        </Text>

        {/* Value Container */}
        <View style={styles.valueContainer}>
          <Text
            style={[styles.value, isEmpty && styles.emptyValue]}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling={true} // Respect Dynamic Type
            testID={`${testID}-value`}
          >
            {getDisplayValue()}
          </Text>

          {/* Subtitle for empty state */}
          {getSubtitle() && (
            <Text
              style={styles.subtitle}
              numberOfLines={1}
              allowFontScaling={true}
              testID={`${testID}-subtitle`}
            >
              {getSubtitle()}
            </Text>
          )}
        </View>
      </View>
    );
  }
);

/**
 * Create theme-aware styles
 */
const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      minHeight: 100,
      justifyContent: 'space-between',
      elevation: 2, // Android shadow
      shadowColor: theme.colors.shadow, // iOS shadow
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    title: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      textAlign: 'left',
      marginBottom: 8,
    },
    valueContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 40,
    },
    value: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    emptyValue: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 32,
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: 4,
      fontStyle: 'italic',
    },
  });

DashboardStatCard.displayName = 'DashboardStatCard';

export default DashboardStatCard;
