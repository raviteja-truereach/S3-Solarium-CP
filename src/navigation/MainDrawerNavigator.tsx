import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MainTabNavigator } from './MainTabNavigator';
import { CommissionStack } from './CommissionStack';

const Drawer = createDrawerNavigator();

export const MainDrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: 'white', width: 280 },
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ drawerItemStyle: { display: 'none' } }}
      />

      <Drawer.Screen
        name="Commissions"
        component={CommissionStack}
        options={{
          title: '💰 My Commissions',
          drawerIcon: () => '💰',
        }}
      />
    </Drawer.Navigator>
  );
};

export default MainDrawerNavigator;
