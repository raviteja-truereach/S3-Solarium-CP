/**
 * Main Tab Navigator
 * Bottom tab navigation for authenticated users
 */
import React, { useEffect } from 'react';
import {
  Platform,
  BackHandler,
  Alert,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import HomeStack from './HomeStack';
import { SettingsScreen } from '@screens/settings/SettingsScreen';
import type { MainTabParamList } from './types';
import { QuotationsScreen } from '@screens/quotations/QuotationsScreen';
import { CustomerStack } from './CustomerStack';
import { CommissionsScreen } from '@screens/commissions/CommissionsScreen';
import { Assets } from '../../assets';
import MyLeadsScreen from '@screens/leads/MyLeadsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * MainTabNavigator Component
 * Bottom tab navigation with Home and Settings
 */
export const MainTabNavigator: React.FC = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const handleBackPress = () => {
      Alert.alert('Exit App', 'Are you sure you want to exit?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => BackHandler.exitApp() },
      ]);
      return true; // Always prevent default back action in main tabs
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backHandler.remove();
  }, []);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#004C89',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              source={Assets.icons.home}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MyLeads"
        component={MyLeadsScreen}
        options={{
          title: 'Leads',
          headerShown: false, // CustomerStack handles its own headers
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              source={Assets.icons.group}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      {/* <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#004C89',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              source={Assets.icons.settings}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      /> */}
      <Tab.Screen
        name="Quotations"
        component={QuotationsScreen}
        options={{
          title: 'Quotations',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#004C89',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              source={Assets.icons.clipboard}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomerStack}
        options={{
          title: 'Customers',
          headerShown: false, // CustomerStack handles its own headers
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              source={Assets.icons.group}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Commissions"
        component={CommissionsScreen}
        options={{
          title: 'Commissions',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#004C89',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              source={Assets.icons.money}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Tab Icon Component using PNG Images
 * Replaces emoji icons with actual PNG assets
 */
interface TabIconProps {
  source: any;
  color: string;
  size: number;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ source, color, size, focused }) => (
  <Image
    source={source}
    style={[
      styles.tabIcon,
      {
        width: size,
        height: size,
        tintColor: color,
        opacity: focused ? 1 : 0.7, // Add slight opacity for inactive state
      },
    ]}
    resizeMode="contain"
  />
);

const styles = StyleSheet.create({
  tabIcon: {
    // Base styles for tab icons
  },
});

export default MainTabNavigator;
