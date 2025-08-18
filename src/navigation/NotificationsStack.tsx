import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

export type NotificationsStackParamList = {
  NotificationsList: undefined;
};

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

const NotificationsStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // TopBar will handle the header
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="NotificationsList"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
        }}
      />
    </Stack.Navigator>
  );
};

export default NotificationsStack;
