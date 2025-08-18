/**
 * Document Thumbnail Component
 * Displays individual document thumbnail with remove functionality and read-only mode
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Card, IconButton, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { MD3Theme } from 'react-native-paper';
import {
  formatFileSize,
  getFileSizeCategory,
} from '../../utils/formatFileSize';
import type { DocumentAsset } from '../../types/document';

export interface DocumentThumbnailProps {
  /** Document to display */
  document: DocumentAsset;
  /** Callback when remove button is pressed */
  onRemove?: (document: DocumentAsset) => void;
  /** Callback when document is tapped for viewing */
  onView?: (document: DocumentAsset) => void;
  /** Whether this is a read-only existing document */
  isReadOnly?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Loading state */
  loading?: boolean;
  /** Index for animation delay */
  index?: number;
}

/**
 * DocumentThumbnail Component
 * Displays document thumbnail with file info and optional remove/view actions
 */
export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = React.memo(
  ({
    document,
    onRemove,
    onView,
    isReadOnly = false,
    testID = 'document-thumbnail',
    loading = false,
    index = 0,
  }) => {
    const theme = useTheme();
    const [isRemoving, setIsRemoving] = useState(false);
    const styles = createStyles(theme);

    // Animation values
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const translateY = useSharedValue(0);

    // Get file type and properties
    const isImage = document.type.startsWith('image/');
    const isPDF = document.type === 'application/pdf';
    const sizeCategory = getFileSizeCategory(document.fileSize);
    const formattedSize = formatFileSize(document.fileSize);

    // Get file icon text
    const getIconText = (): string => {
      if (isPDF) return '📄';
      if (isImage) return '🖼️';
      return '📄';
    };

    // Get file icon color
    const getIconColor = (): string => {
      if (isPDF) return '#FF6B6B';
      if (isImage) return '#4ECDC4';
      return theme.colors.onSurface;
    };

    // Handle remove with confirmation
    const handleRemove = useCallback(() => {
      if (loading || isRemoving || isReadOnly) return;

      Alert.alert(
        'Remove Document',
        `Are you sure you want to remove "${document.fileName}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setIsRemoving(true);

              // Simple removal without complex animation
              setTimeout(() => {
                onRemove?.(document);
                setIsRemoving(false);
              }, 100);
            },
          },
        ],
        {
          cancelable: true,
        }
      );
    }, [document, onRemove, loading, isRemoving, isReadOnly]);

    // Handle document tap (for viewing)
    const handleDocumentTap = useCallback(() => {
      if (isReadOnly && onView) {
        onView(document);
      }
    }, [isReadOnly, onView, document]);

    // Handle press feedback
    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.95);
    }, [scale]);

    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1);
    }, [scale]);

    // Animated styles
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
        opacity: opacity.value,
      };
    });

    // Entry animation
    React.useEffect(() => {
      const delay = index * 100; // Stagger animation

      scale.value = 0.8;
      opacity.value = 0;
      translateY.value = 20;

      setTimeout(() => {
        scale.value = withSpring(1);
        opacity.value = withTiming(1, { duration: 300 });
        translateY.value = withSpring(0);
      }, delay);
    }, [index, scale, opacity, translateY]);

    // Accessibility label
    const getAccessibilityLabel = (): string => {
      const fileType = isPDF ? 'PDF document' : isImage ? 'Image' : 'Document';
      const statusText = isReadOnly ? ' (existing document)' : '';
      return `${fileType} ${document.fileName}${statusText}`;
    };

    return (
      <Animated.View style={[styles.container, animatedStyle]} testID={testID}>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={handleDocumentTap}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          disabled={loading}
          accessible={true}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityRole="button"
          accessibilityHint={
            isReadOnly
              ? 'Double tap to view document'
              : 'Double tap to view document details'
          }
          testID={`${testID}-container`}
        >
          <Card
            style={[styles.card, isReadOnly && styles.readOnlyCard]}
            mode="outlined"
          >
            <View style={styles.cardContent}>
              {/* File Icon/Thumbnail */}
              <View style={styles.iconContainer}>
                {isImage ? (
                  <View style={styles.imagePreview}>
                    <Text style={[styles.iconText, { color: getIconColor() }]}>
                      {getIconText()}
                    </Text>
                    <Text style={styles.imageLabel}>IMG</Text>
                  </View>
                ) : (
                  <View style={styles.documentPreview}>
                    <Text style={[styles.iconText, { color: getIconColor() }]}>
                      {getIconText()}
                    </Text>
                    <Text style={styles.documentLabel}>PDF</Text>
                  </View>
                )}
              </View>

              {/* File Information */}
              <View style={styles.fileInfo}>
                <Text
                  style={styles.fileName}
                  numberOfLines={2}
                  ellipsizeMode="middle"
                  accessible={true}
                  accessibilityLabel={`File name: ${document.fileName}`}
                >
                  {document.fileName}
                </Text>

                <View style={styles.metaInfo}>
                  {/* Show file size only for non-read-only documents */}
                  {!isReadOnly && (
                    <>
                      <Text
                        style={[
                          styles.fileSize,
                          sizeCategory === 'large' && styles.fileSizeLarge,
                        ]}
                        accessible={true}
                        accessibilityLabel={`File size: ${formattedSize}`}
                      >
                        {formattedSize}
                      </Text>

                      {sizeCategory === 'large' && (
                        <Text style={styles.warningIcon}>⚠️</Text>
                      )}
                    </>
                  )}

                  {/* Show status for existing documents */}
                  {isReadOnly &&
                    'status' in document &&
                    (document as any).status && (
                      <Text style={styles.statusText}>
                        {(document as any).status === 'pending'
                          ? '⏳ Pending'
                          : (document as any).status === 'uploaded'
                          ? '✅ Uploaded'
                          : '❌ Failed'}
                      </Text>
                    )}
                </View>
              </View>

              {/* Remove Button - only for non-read-only documents */}
              {onRemove && !isReadOnly && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={handleRemove}
                  disabled={loading || isRemoving}
                  accessible={true}
                  accessibilityLabel={`Remove ${document.fileName}`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to remove this document"
                  testID={`${testID}-remove-button`}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              )}

              {/* Read-only indicator */}
              {/* {isReadOnly && (
                <View style={styles.readOnlyIndicator}>
                  <Text style={styles.readOnlyText}>👁️</Text>
                </View>
              )} */}
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

/**
 * Create theme-aware styles
 */
const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      marginHorizontal: 4,
      marginVertical: 4,
    },
    thumbnailContainer: {
      flex: 1,
    },
    card: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    readOnlyCard: {
      backgroundColor: theme.colors.surfaceVariant,
      borderColor: theme.colors.outlineVariant,
    },
    cardContent: {
      padding: 12,
      height: 120,
      justifyContent: 'space-between',
    },
    iconContainer: {
      alignSelf: 'center',
      width: 48,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    imagePreview: {
      alignItems: 'center',
    },
    documentPreview: {
      alignItems: 'center',
    },
    imageLabel: {
      fontSize: 8,
      fontWeight: '600',
      color: '#4ECDC4',
      marginTop: 2,
    },
    documentLabel: {
      fontSize: 8,
      fontWeight: '600',
      color: '#FF6B6B',
      marginTop: 2,
    },
    fileInfo: {
      flex: 1,
      justifyContent: 'space-between',
    },
    fileName: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.onSurface,
      textAlign: 'center',
      lineHeight: 14,
    },
    metaInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      minHeight: 16,
    },
    fileSize: {
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '400',
    },
    fileSizeLarge: {
      color: theme.colors.error,
      fontWeight: '500',
    },
    warningIcon: {
      marginLeft: 4,
      fontSize: 10,
    },
    statusText: {
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    removeButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    iconText: {
      fontSize: 24,
      textAlign: 'center',
    },
    removeButtonText: {
      color: theme.colors.error,
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: 18,
    },
    readOnlyIndicator: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
    },
    readOnlyText: {
      fontSize: 12,
    },
  });

DocumentThumbnail.displayName = 'DocumentThumbnail';

export default DocumentThumbnail;
