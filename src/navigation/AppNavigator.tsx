import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainDrawerNavigator } from './MainDrawerNavigator'; // ✅ Make sure this import works
import NotificationsStack from './NotificationsStack';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainDrawerNavigator} />
      <Stack.Screen
        name="NotificationsStack"
        component={NotificationsStack}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;