import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommissionsScreen } from '../screens/commissions/CommissionsScreen';

const Stack = createNativeStackNavigator();

export const CommissionStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#004C89' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="CommissionsList"
        component={CommissionsScreen}
        options={{ title: 'My Commissions' }}
      />
    </Stack.Navigator>
  );
};

export default CommissionStack;
