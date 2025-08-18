/**
 * Customer Stack Navigator
 * Stack navigation for customer-related screens (following HomeStack pattern)
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomersScreen } from '@screens/customers/CustomersScreen';
import { CustomerDetailScreen } from '@screens/customers/CustomerDetailScreen';

export type CustomerStackParamList = {
  CustomersList: undefined;
  CustomerDetail: { customerId: string };
};

const Stack = createNativeStackNavigator<CustomerStackParamList>();

/**
 * Customer Stack Component
 */
export const CustomerStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="CustomersList"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="CustomersList"
        component={CustomersScreen}
        options={{
          title: 'Customers',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={({ route }) => ({
          title: `Customer #${route.params.customerId}`,
          headerShown: true,
          headerStyle: {
            backgroundColor: '#004C89',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerBackTitle: 'Customers',
        })}
      />
    </Stack.Navigator>
  );
};

export default CustomerStack;
