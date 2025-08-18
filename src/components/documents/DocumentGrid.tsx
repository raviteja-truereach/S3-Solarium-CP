/**
 * Document Grid Component
 * Displays documents in a virtualized grid layout
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { DocumentThumbnail } from './DocumentThumbnail';
import type { DocumentAsset } from '../../types/document';

const { width: screenWidth } = Dimensions.get('window');

export interface DocumentGridProps {
  /** Documents to display */
  documents: DocumentAsset[];
  /** Callback when remove button is pressed */
  onRemove?: (document: DocumentAsset) => void;
  /** Callback when document is viewed (for read-only documents) */
  onView?: (document: DocumentAsset) => void;
  /** Loading state */
  loading?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Number of columns (default: 2) */
  numColumns?: number;
  /** Enable virtualization for large lists */
  virtualized?: boolean;
  /** Accessibility label for the grid */
  accessibilityLabel?: string;
}

interface GridItem {
  item: DocumentAsset;
  index: number;
}

/**
 * DocumentGrid Component
 * Optimized grid layout for document thumbnails
 */
export const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  onRemove,
  loading = false,
  testID = 'document-grid',
  numColumns = 2,
  virtualized = true,
  accessibilityLabel,
  onView,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme, numColumns);
  const flashListRef = useRef<FlashList<DocumentAsset>>(null);

  // Calculate item dimensions
  const itemWidth = useMemo(() => {
    const padding = 24; // Container padding
    const spacing = 8; // Item spacing
    const totalSpacing = padding * 2 + spacing * (numColumns - 1);
    return (screenWidth - totalSpacing) / numColumns;
  }, [numColumns]);

  // Memoized render item
  const renderItem = useCallback(
    ({ item, index }: { item: DocumentAsset; index: number }) => {
      const isReadOnly = 'isExisting' in item && (item as any).isExisting;

      return (
        <View style={[styles.itemContainer, { width: itemWidth }]}>
          <DocumentThumbnail
            document={item}
            onRemove={onRemove}
            onView={onView}
            isReadOnly={isReadOnly}
            testID={`${testID}-item-${index}`}
            loading={loading}
            index={index}
          />
        </View>
      );
    },
    [itemWidth, onRemove, onView, loading, testID, styles.itemContainer]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: DocumentAsset) => item.id, []);

  // Get estimated item size for FlashList
  const getItemLayout = useCallback(
    (data: DocumentAsset[] | null | undefined, index: number) => {
      const itemHeight = 120 + 8; // Item height + margin
      return {
        length: itemHeight,
        offset: itemHeight * Math.floor(index / numColumns),
        index,
      };
    },
    [numColumns]
  );

  // Empty state
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.emptyText}>Loading documents...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No documents added yet</Text>
        <Text style={styles.emptySubtext}>
          Add documents using the camera, gallery, or file picker
        </Text>
      </View>
    );
  }, [loading, styles.emptyContainer, styles.emptyText, styles.emptySubtext]);

  // Loading overlay
  const renderLoadingOverlay = useCallback(() => {
    if (!loading) return null;

    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }, [loading, styles.loadingOverlay, theme.colors.primary]);

  // Use virtualization for large lists
  const shouldUseVirtualization = virtualized && documents.length > 20;

  // Accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityLabel:
      accessibilityLabel || `Document grid with ${documents.length} documents`,
    accessibilityRole: 'grid' as const,
    ...(Platform.OS === 'android' && {
      accessibilityLiveRegion: 'polite' as const,
    }),
    ...(Platform.OS === 'ios' && {
      accessibilityTraits: 'updatesFrequently' as const,
    }),
  };

  if (documents.length === 0) {
    return (
      <View style={styles.container} testID={testID} {...accessibilityProps}>
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID} {...accessibilityProps}>
      <FlashList
        ref={flashListRef}
        data={documents}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={148} // 140 + 8 margin
        // Performance optimizations
        removeClippedSubviews={shouldUseVirtualization}
        maxToRenderPerBatch={shouldUseVirtualization ? 10 : documents.length}
        windowSize={shouldUseVirtualization ? 10 : documents.length}
        initialNumToRender={shouldUseVirtualization ? 6 : documents.length}
        getItemLayout={shouldUseVirtualization ? getItemLayout : undefined}
        // Accessibility
        accessibilityLabel={`Grid of ${documents.length} documents`}
        testID={`${testID}-flashlist`}
      />
      {renderLoadingOverlay()}
    </View>
  );
};

/**
 * Create theme-aware styles
 */
const createStyles = (theme: MD3Theme, numColumns: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      padding: 0,
    },
    itemContainer: {
      marginHorizontal: 8,
      marginVertical: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 64,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background + '80',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

DocumentGrid.displayName = 'DocumentGrid';
