/**
 * Upload Progress Bar Component
 * Animated progress visualization with smooth updates
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export interface ProgressProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Upload status */
  status: 'idle' | 'uploading' | 'success' | 'error';
  /** Current file name being uploaded */
  fileName?: string;
  /** Bytes loaded */
  loaded?: number;
  /** Total bytes */
  total?: number;
  /** Upload speed in bytes/sec */
  speed?: number;
}

/**
 * UploadProgressBar Component
 * Smooth animated progress bar with status indicators
 */
export const UploadProgressBar: React.FC<ProgressProps> = ({
  progress,
  status,
  fileName,
  loaded = 0,
  total = 0,
  speed = 0,
}) => {
  const theme = useTheme();
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const styles = createStyles(theme);

  // Animate progress updates
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 200, // Smooth animation
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  // Get progress bar color based on status
  const getProgressColor = (): string => {
    switch (status) {
      case 'uploading':
        return theme.colors.primary;
      case 'success':
        return '#4CAF50';
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format upload speed
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '';
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  // Calculate ETA
  const getETA = (): string => {
    if (speed === 0 || progress >= 100) return '';
    const remainingBytes = total - loaded;
    const etaSeconds = Math.round(remainingBytes / speed);

    if (etaSeconds < 60) return `${etaSeconds}s remaining`;
    const minutes = Math.floor(etaSeconds / 60);
    const seconds = etaSeconds % 60;
    return `${minutes}m ${seconds}s remaining`;
  };

  return (
    <View style={styles.container}>
      {/* File name and status */}
      <View style={styles.header}>
        <Text variant="bodyMedium" style={styles.fileName} numberOfLines={1}>
          {fileName || 'Uploading document...'}
        </Text>
        <Text variant="bodySmall" style={styles.progressText}>
          {Math.round(progress)}%
        </Text>
      </View>

      {/* Progress bar container */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: animatedProgress.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>

      {/* Upload details */}
      {status === 'uploading' && (
        <View style={styles.details}>
          <Text variant="bodySmall" style={styles.detailText}>
            {formatBytes(loaded)} / {formatBytes(total)}
          </Text>
          {speed > 0 && (
            <Text variant="bodySmall" style={styles.detailText}>
              {formatSpeed(speed)} • {getETA()}
            </Text>
          )}
        </View>
      )}

      {/* Status indicator */}
      {status === 'success' && (
        <Text
          variant="bodySmall"
          style={[styles.statusText, styles.successText]}
        >
          ✅ Upload completed successfully
        </Text>
      )}

      {status === 'error' && (
        <Text variant="bodySmall" style={[styles.statusText, styles.errorText]}>
          ❌ Upload failed
        </Text>
      )}
    </View>
  );
};

const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    fileName: {
      flex: 1,
      fontWeight: '500',
      marginRight: 8,
    },
    progressText: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
    },
    details: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    detailText: {
      color: theme.colors.onSurfaceVariant,
    },
    statusText: {
      textAlign: 'center',
      marginTop: 4,
    },
    successText: {
      color: '#4CAF50',
    },
    errorText: {
      color: theme.colors.error,
    },
  });

export default UploadProgressBar;
