/**
 * Toast Configuration
 * Centralized toast message styling
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  BaseToast,
  ErrorToast,
  BaseToastProps,
} from 'react-native-toast-message';

/**
 * Success Toast Component
 */
const SuccessToast = (props: BaseToastProps) => (
  <BaseToast
    {...props}
    style={styles.successToast}
    contentContainerStyle={styles.contentContainer}
    text1Style={styles.text1}
    text2Style={styles.text2}
  />
);

/**
 * Error Toast Component
 */
const CustomErrorToast = (props: BaseToastProps) => (
  <ErrorToast
    {...props}
    style={styles.errorToast}
    contentContainerStyle={styles.contentContainer}
    text1Style={styles.text1}
    text2Style={styles.text2}
  />
);

/**
 * Info Toast Component
 */
const InfoToast = (props: BaseToastProps) => (
  <BaseToast
    {...props}
    style={styles.infoToast}
    contentContainerStyle={styles.contentContainer}
    text1Style={styles.text1}
    text2Style={styles.text2}
  />
);

/**
 * Toast Configuration
 */
export const toastConfig = {
  success: SuccessToast,
  error: CustomErrorToast,
  info: InfoToast,
};

const styles = StyleSheet.create({
  successToast: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  errorToast: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  infoToast: {
    borderLeftColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  contentContainer: {
    paddingHorizontal: 15,
  },
  text1: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  text2: {
    fontSize: 14,
    color: '#666',
  },
});
