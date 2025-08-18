/**
 * Settings Screen
 * User preferences and app settings
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  // ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '@hooks/reduxHooks';
import { cleanupSyncOnLogout, performLogout } from '@store/thunks/authThunks';
import { appConfig } from '@config/Config';
import { RadioButton } from 'react-native-paper';
import { useThemeToggle } from '@hooks/useThemeToggle';
// import type { ColorScheme } from '@store/slices/preferencesSlice';
import { useTheme } from 'react-native-paper';
import { ScreenContainer, AppButton } from '@components/common';
/**
 * Settings Screen Component
 * Displays user info and app settings
 */
export const SettingsScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const {
    colorScheme,
    toggleColorScheme,
    getThemeName,
    // isDarkMode
  } = useThemeToggle();
  const theme = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to enter OTP again to login.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed logout');
            await dispatch(performLogout());
            dispatch(cleanupSyncOnLogout());
          },
        },
      ]
    );
  };

  const handleSettingPress = (setting: string) => {
    Alert.alert(
      'Settings',
      `${setting} will be implemented in future sprints.`
    );
  };

  return (
    <ScreenContainer scrollable>
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.profileName, { color: theme.colors.onSurface }]}>
            {user?.name || 'Channel Partner'}
          </Text>
          <Text style={styles.profilePhone}>
            {user?.phone || 'Phone not set'}
          </Text>
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          App Settings
        </Text>

        <View
          style={[
            styles.settingItem,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.settingText, { color: theme.colors.onSurface }]}>
            🎨 Theme
          </Text>
          <Text style={styles.settingSubtext}>Current: {getThemeName()}</Text>

          <View style={styles.radioGroup}>
            <View style={styles.radioOption}>
              <RadioButton
                value="system"
                status={colorScheme === 'system' ? 'checked' : 'unchecked'}
                onPress={() => toggleColorScheme('system')}
              />
              <Text
                style={[styles.radioLabel, { color: theme.colors.onSurface }]}
              >
                System
              </Text>
            </View>

            <View style={styles.radioOption}>
              <RadioButton
                value="light"
                status={colorScheme === 'light' ? 'checked' : 'unchecked'}
                onPress={() => toggleColorScheme('light')}
              />
              <Text
                style={[styles.radioLabel, { color: theme.colors.onSurface }]}
              >
                Light
              </Text>
            </View>

            <View style={styles.radioOption}>
              <RadioButton
                value="dark"
                status={colorScheme === 'dark' ? 'checked' : 'unchecked'}
                onPress={() => toggleColorScheme('dark')}
              />
              <Text
                style={[styles.radioLabel, { color: theme.colors.onSurface }]}
              >
                Dark
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => handleSettingPress('Notifications')}
        >
          <Text style={[styles.settingText, { color: theme.colors.onSurface }]}>
            🔔 Notifications
          </Text>
          <Text style={styles.settingSubtext}>
            Manage notification preferences
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => handleSettingPress('Language')}
        >
          <Text style={[styles.settingText, { color: theme.colors.onSurface }]}>
            🌐 Language
          </Text>
          <Text style={styles.settingSubtext}>English (Default)</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      {/* <View style={styles.appInfoSection}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <View
          style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={styles.infoText}>
            Environment: {appConfig.env.toUpperCase()}
          </Text>
          <Text style={styles.infoText}>API: {appConfig.apiUrl}</Text>
          <Text style={styles.infoText}>
            Debug Mode: {appConfig.debugMode ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View> */}

      {/* Logout Button */}
      {/* <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>🚪 Logout</Text>
      </TouchableOpacity> */}

      <AppButton
        title="🚪 Logout"
        variant="contained"
        fullWidth
        onPress={handleLogout}
        style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
      />

      {/* <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          🚧 This is a placeholder Settings screen.{'\n'}
          Theme toggle and other settings will be implemented in ST-02.5.
        </Text>
      </View> */}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  profileSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#666',
  },
  settingsSection: {
    marginBottom: 30,
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 14,
    color: '#666',
  },
  appInfoSection: {
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 0,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  placeholderText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
});

export default SettingsScreen;
