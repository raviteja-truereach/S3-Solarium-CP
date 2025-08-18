/**
 * Login Screen
 * Phone-based OTP authentication for Channel Partners
 */
import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useRequestOtpMutation } from '@store/api/authApi';
import { AppButton, AppTextInput, ScreenContainer } from '@components/common';
import { useTheme } from 'react-native-paper';
import { useConnectivity } from '@contexts/ConnectivityContext';
import type { AuthStackParamList } from '@navigation/types';
import { validateBackendError } from '@utils/errorMessage';

type LoginScreenNavigationProp = NavigationProp<AuthStackParamList, 'Login'>;

/**
 * Login Screen Component
 * Handles phone number input and OTP request
 */
export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const theme = useTheme();
  const { isOnline } = useConnectivity();

  const [phone, setPhone] = React.useState('');
  const [requestOtp, { isLoading, error }] = useRequestOtpMutation();

  /**
   * Validate phone number format
   */
  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phoneNumber);
  };

  /**
   * Handle OTP request
   */
  const handleGetOtp = async () => {
    if (!isOnline) {
      Alert.alert(
        'No Internet',
        'Please check your internet connection and try again.'
      );
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert(
        'Invalid Phone',
        'Please enter a valid 10-digit phone number.'
      );
      return;
    }

    try {
      navigation.navigate('Otp', { phone });
      // const result = await requestOtp({ phone }).unwrap();

      // if (result.success && result.data?.otpSent) {
      //   // Navigate to OTP screen
      //   navigation.navigate('Otp', { phone });
      // } else {
      //   Alert.alert('Error', 'Failed to send OTP. Please try again.');
      // }
    } catch (err: any) {
      console.warn('OTP request failed:', err);

      // Handle network errors (backend not available) - provide mock response for testing
      if (
        err.status === 'FETCH_ERROR' ||
        err.error?.includes('Network request failed')
      ) {
        console.log(
          'Backend not available - using mock success response for testing'
        );
        Alert.alert(
          'Development Mode',
          'Backend not connected. Using mock response for testing.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to OTP screen with mock success
                navigation.navigate('Otp', { phone });
              },
            },
          ]
        );
        return;
      }

      // Handle specific error cases
      if (err.code === 429) {
        Alert.alert(
          'Account Locked',
          err.message ||
            'Too many attempts. Please try again after 15 minutes.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          validateBackendError(err) || 'Failed to send OTP. Please try again.'
        );
        // Alert.alert(
        //   'Error',
        //   err.message || 'Failed to send OTP. Please try again.'
        // );
      }
    }
  };

  /**
   * Format phone number input
   */
  const handlePhoneChange = (text: string) => {
    // Remove non-digits
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    setPhone(limited);
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Welcome to Solarium
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Enter your phone number to get started
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.phoneInputContainer}>
            <View
              style={[
                styles.countryCodeContainer,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[styles.countryCode, { color: theme.colors.onSurface }]}
              >
                +91
              </Text>
            </View>
            <View style={styles.phoneInputWrapper}>
              <AppTextInput
                label="Phone Number"
                placeholder="Enter your phone number"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
                variant="outlined"
                error={
                  phone.length > 0 && !validatePhone(phone)
                    ? 'Please enter a valid 10-digit phone number'
                    : undefined
                }
                style={{ marginVertical: 0 }}
                disabled={isLoading}
              />
            </View>
          </View>
          {error && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {(error as any)?.message || 'Failed to send OTP'}
            </Text>
          )}

          <AppButton
            title={isLoading ? 'Sending OTP...' : 'Get OTP'}
            variant="contained"
            size="large"
            fullWidth
            onPress={handleGetOtp}
            disabled={!validatePhone(phone) || isLoading || !isOnline}
            style={styles.otpButton}
          />
        </View>

        {!isOnline && (
          <View
            style={[
              styles.offlineNotice,
              { backgroundColor: theme.colors.errorContainer },
            ]}
          >
            <Text
              style={[
                styles.offlineText,
                { color: theme.colors.onErrorContainer },
              ]}
            >
              📶 You're offline. OTP cannot be sent without internet connection.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  otpButton: {
    marginTop: 24,
  },
  offlineNotice: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  offlineText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  countryCodeContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginRight: 8,
    justifyContent: 'center',
    height: 52,
    marginTop: 5,
  },
  phoneInputWrapper: {
    flex: 1,
    marginBottom: 0,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
