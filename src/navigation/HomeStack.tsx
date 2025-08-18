import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import MyLeadsScreen from '../screens/leads/MyLeadsScreen';
import useOverdueBadge from '../hooks/useOverdueBadge';
import { Text, TouchableOpacity, View } from 'react-native';
import AddLeadScreen from '../screens/leads/AddLeadScreen';
import LeadDetailScreen from '../screens/leads/LeadDetailScreen';
import { DocumentModuleTestScreen } from '../components/documents/screens/ManualTestScreen';
import DocumentUploadScreen from '../screens/documents/DocumentUploadScreen';
import { BackendTestScreen } from '@screens/test/BackendTestScreen';
import { TestCustomerEnhancementsScreen } from '../debug/TestCustomerEnhancementsScreen';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from 'react-native-paper'; 
import SettingsScreen from '@screens/settings/SettingsScreen';
const Stack = createNativeStackNavigator();

/**
 * Home Stack Navigator with badge integration
 */
export const HomeStack: React.FC = () => {
  const theme = useTheme();
  // ✅ ACTIVATE BADGE HOOK FOR THIS STACK
  const { overdueCount, isVisible } = useOverdueBadge();
  const navigation = useNavigation();

  console.log('🏠 HomeStack render - badge:', { overdueCount, isVisible });

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
        }}
      />

      <Stack.Screen
        name="MyLeads"
        component={MyLeadsScreen}
        options={{
          title: 'My Leads',
        }}
      />
      <Stack.Screen
        name="AddLead"
        component={AddLeadScreen}
        options={{
          title: 'Add New Lead',
        }}
      />
      <Stack.Screen
        name="LeadDetail"
        component={LeadDetailScreen} // You'll need this component
        options={({ route }) => ({
          title: `Lead ${route.params?.leadId || ''}`,
        })}
      />
      <Stack.Screen
        name="DocumentModuleTest"
        component={DocumentModuleTestScreen}
        options={{ title: 'Document Module Test' }}
      />
      <Stack.Screen 
        name="DocumentUpload" 
        component={DocumentUploadScreen}
        options={{ title: 'Upload Documents' }}
      />
      <Stack.Screen
        name="BackendTest"
        component={BackendTestScreen}
        options={{ title: 'Backend Test' }}
      />
      <Stack.Screen 
        name="TestCustomerEnhancements" 
        component={TestCustomerEnhancementsScreen}
        options={{ title: 'Test Customer Enhancements' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings', headerShown: true }}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
