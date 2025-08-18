/**
 * OTP Verification Screen
 * Handles OTP input and verification with countdown timer
 */
import React from 'react';
import { View, Text, StyleSheet, Alert, BackHandler } from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import OTPTextInput from 'react-native-otp-textinput';
import {
  useVerifyOtpMutation,
  useRequestOtpMutation,
} from '@store/api/authApi';
import { useAppDispatch } from '@hooks/reduxHooks';
import { loginSuccess } from '@store/slices/authSlice';
import { AppButton, ScreenContainer } from '@components/common';
import { useTheme } from 'react-native-paper';
import { useConnectivity } from '@contexts/ConnectivityContext';
import { OTP_EXPIRY_SEC, OTP_RESEND_INTERVAL } from '@constants/auth';
import type { AuthStackParamList } from '@navigation/types';
import { saveToken } from '@utils/secureStorage/KeychainHelper';
import { validateBackendError } from '@utils/errorMessage';
import { initializeSyncAfterLogin } from '@store/thunks/authThunks';

type OtpScreenNavigationProp = NavigationProp<AuthStackParamList, 'Otp'>;
type OtpScreenRouteProp = RouteProp<AuthStackParamList, 'Otp'>;

/**
 * OTP Screen Component
 * Handles OTP verification with timer and resend functionality
 */
export const OtpScreen: React.FC = () => {
  const navigation = useNavigation<OtpScreenNavigationProp>();
  const route = useRoute<OtpScreenRouteProp>();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isOnline } = useConnectivity();

  const { phone } = route.params;

  const [otp, setOtp] = React.useState('');
  const [timer, setTimer] = React.useState(OTP_EXPIRY_SEC);
  const [resendTimer, setResendTimer] = React.useState(OTP_RESEND_INTERVAL);
  const [attempts, setAttempts] = React.useState(0);
  const [isLocked, setIsLocked] = React.useState(false);
  const [lockTimer, setLockTimer] = React.useState(0);

  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [requestOtp, { isLoading: isResending }] = useRequestOtpMutation();
  const otpInputRef = React.useRef<OTPTextInput>(null);

  /**
   * Timer effects for OTP expiry and resend countdown
   */
  React.useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  React.useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  React.useEffect(() => {
    if (lockTimer > 0) {
      const interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockTimer]);

  /**
   * Handle hardware back button
   */
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => subscription.remove();
    }, [navigation])
  );

  /**
   * Handle OTP verification
   */
  const handleVerifyOtp = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please check your internet connection.');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit OTP.');
      return;
    }

    if (isLocked) {
      Alert.alert(
        'Account Locked',
        `Please wait ${Math.floor(lockTimer / 60)}:${(lockTimer % 60)
          .toString()
          .padStart(2, '0')} before trying again.`
      );
      return;
    }

    try {
      const result = await verifyOtp({ phone, otp }).unwrap();
      console.log('result otp', result);
      if (result.success && result.data) {
        // Calculate token expiry (24 hours from now)
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

        // Save token to keychain first to avoid race condition
        await saveToken(result.data.token, expiresAt);
        console.log('Token saved to keychain successfully');

        // Create user object from response
        const user = {
          id: result.data.userId,
          name: 'Channel Partner', // Will be updated from backend later
          phone: phone,
        };

        // Dispatch login success
        dispatch(
          loginSuccess({
            token: result.data.token,
            expiresAt,
            user,
          })
        );
        dispatch(initializeSyncAfterLogin());
        console.log('Login successful - user authenticated');
        // Navigation will happen automatically via NavigationProvider
      }
    } catch (err: any) {
      console.warn('OTP verification failed:', err);

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
          'Backend not connected. Using mock login success for testing.',
          [
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  // Calculate token expiry (24 hours from now)
                  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

                  // Mock JWT token
                  const mockToken = 'mock-jwt-token-' + Date.now();

                  // Save token to keychain first
                  await saveToken(mockToken, expiresAt);
                  console.log('Mock token saved to keychain successfully');

                  // Create mock user object
                  const user = {
                    id: 'mock-user-' + Date.now(),
                    name: 'Channel Partner',
                    phone: phone,
                  };

                  // Dispatch login success
                  dispatch(
                    loginSuccess({
                      token: mockToken,
                      expiresAt,
                      user,
                    })
                  );

                  console.log('Mock login successful - user authenticated');
                  // Navigation will happen automatically via NavigationProvider
                } catch (error) {
                  console.error('Mock login failed:', error);
                  Alert.alert('Error', 'Mock login failed. Please try again.');
                }
              },
            },
          ]
        );
        return;
      }

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Clear OTP input
      setOtp('');
      otpInputRef.current?.clear();

      // Handle specific error cases
      if (err.code === 429 || newAttempts >= 5) {
        // Account locked
        setIsLocked(true);
        setLockTimer(15 * 60); // 15 minutes
        Alert.alert(
          'Account Locked',
          'Too many failed attempts. Your account has been locked for 15 minutes.',
          [{ text: 'OK' }]
        );
      } else if (err.status === 401 || err.status === 400) {
        Alert.alert(
          'Invalid OTP',
          `Incorrect OTP. ${5 - newAttempts} attempts remaining.`,
          [{ text: 'Try Again' }]
        );
      } else {
        Alert.alert(
          'Error',
          validateBackendError(err) ||
            'OTP verification failed. Please try again.'
        );
      }
    }
  };

  /**
   * Handle resend OTP
   */
  const handleResendOtp = async () => {
    if (!isOnline) {
      Alert.alert('No Internet', 'Please check your internet connection.');
      return;
    }

    if (resendTimer > 0) {
      Alert.alert(
        'Please Wait',
        `You can resend OTP in ${resendTimer} seconds.`
      );
      return;
    }

    if (isLocked) {
      Alert.alert(
        'Account Locked',
        `Please wait ${Math.floor(lockTimer / 60)}:${(lockTimer % 60)
          .toString()
          .padStart(2, '0')} before trying again.`
      );
      return;
    }

    try {
      const result = await requestOtp({ phone }).unwrap();

      if (result.success) {
        setTimer(OTP_EXPIRY_SEC);
        setResendTimer(OTP_RESEND_INTERVAL);
        setOtp('');
        otpInputRef.current?.clear();
        Alert.alert('OTP Sent', 'A new OTP has been sent to your phone.');
      }
    } catch (err: any) {
      // Handle network errors (backend not available) - provide mock response for testing
      if (
        err.status === 'FETCH_ERROR' ||
        err.error?.includes('Network request failed')
      ) {
        console.log(
          'Backend not available - using mock resend success for testing'
        );
        setTimer(OTP_EXPIRY_SEC);
        setResendTimer(OTP_RESEND_INTERVAL);
        setOtp('');
        otpInputRef.current?.clear();
        Alert.alert(
          'Development Mode',
          'Backend not connected. Mock OTP resent for testing.'
        );
        return;
      }

      Alert.alert(
        'Error',
        validateBackendError(err) || 'Failed to resend OTP. Please try again.'
      );
    }
  };

  /**
   * Format timer display
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format lock timer display
   */
  const formatLockTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Verify OTP
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Enter the 6-digit code sent to{'\n'}+91 {phone}
          </Text>
        </View>

        {isLocked ? (
          <View
            style={[
              styles.lockNotice,
              { backgroundColor: theme.colors.errorContainer },
            ]}
          >
            <Text
              style={[
                styles.lockText,
                { color: theme.colors.onErrorContainer },
              ]}
            >
              🔒 Account locked for {formatLockTime(lockTimer)}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.otpContainer}>
              <OTPTextInput
                ref={otpInputRef}
                inputCount={6}
                handleTextChange={setOtp}
                containerStyle={styles.otpInputContainer}
                textInputStyle={[
                  styles.otpInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    color: theme.colors.onSurface,
                  },
                ]}
                tintColor={theme.colors.primary}
                offTintColor={theme.colors.outline}
                keyboardType="phone-pad"
                autoFocus
                accessible={true}
                accessibilityLabel="OTP input"
              />

              <View style={styles.timerContainer}>
                {timer > 0 ? (
                  <Text
                    style={[
                      styles.timerText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    ⏱️ OTP expires in {formatTime(timer)}
                  </Text>
                ) : (
                  <Text
                    style={[styles.expiredText, { color: theme.colors.error }]}
                  >
                    ⚠️ OTP has expired
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.actions}>
              <AppButton
                title={isVerifying ? 'Verifying...' : 'Verify OTP'}
                variant="contained"
                size="large"
                fullWidth
                onPress={handleVerifyOtp}
                disabled={
                  otp.length !== 6 || isVerifying || !isOnline || timer === 0
                }
                style={styles.verifyButton}
              />

              <AppButton
                title={isResending ? 'Sending...' : 'Resend OTP'}
                variant="outlined"
                size="medium"
                fullWidth
                onPress={handleResendOtp}
                disabled={resendTimer > 0 || isResending || !isOnline}
                style={styles.resendButton}
              />

              {resendTimer > 0 && (
                <Text
                  style={[
                    styles.resendTimer,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Resend available in {resendTimer}s
                </Text>
              )}
            </View>

            {attempts > 0 && !isLocked && (
              <Text
                style={[styles.attemptsText, { color: theme.colors.error }]}
              >
                {5 - attempts} attempts remaining
              </Text>
            )}
          </>
        )}

        <AppButton
          title="← Back to Phone"
          variant="text"
          size="small"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  lockNotice: {
    borderRadius: 8,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  lockText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpContainer: {
    marginBottom: 40,
  },
  otpInput: {
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    height: 50,
    width: 45,
    marginHorizontal: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  expiredText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    marginBottom: 20,
  },
  verifyButton: {
    marginBottom: 16,
  },
  resendButton: {
    marginBottom: 8,
  },
  resendTimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  attemptsText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  backButton: {
    marginTop: 10,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
});

export default OtpScreen;
