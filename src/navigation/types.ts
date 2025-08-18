import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NotificationsStackParamList } from './NotificationsStack';
import type { DocumentAsset } from '../types/document';

// Home Stack Types
export type HomeStackParamList = {
  Dashboard: undefined;
  MyLeads: undefined;
  LeadDetail: { leadId: string };
  AddLead: undefined;
  DocumentUpload: { leadId: string; initialDocuments?: DocumentAsset[] };
  NotificationsTest: undefined;
  MinimalStoreTest: undefined;
  DocumentModuleTest: undefined;
};

// Customer Stack Types (add this after HomeStackParamList)
export type CustomerStackParamList = {
  CustomersList: undefined;
  CustomerDetail: { customerId: string };
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Customers: NavigatorScreenParams<CustomerStackParamList>;
  Quotations: undefined;
  Settings: undefined;
  NotificationsTest: undefined;
};

// Root Stack Types (includes auth screens and notifications)
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  NotificationsStack: NavigatorScreenParams<NotificationsStackParamList>; // Add this
  NotificationsTest: undefined;
};

// Screen Props Types
export type HomeScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'Dashboard'
>;
export type MyLeadsScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'MyLeads'
>;

// Customer Screen Props Types
export type CustomerScreenProps = NativeStackScreenProps<
  CustomerStackParamList,
  'CustomersList'
>;
export type CustomerDetailScreenProps = NativeStackScreenProps<
  CustomerStackParamList,
  'CustomerDetail'
>;

// Main Tab Navigation Props
export type CustomersTabProps = NativeStackScreenProps<
  MainTabParamList,
  'Customers'
>;

// Navigation Ref Type for deep linking
export type RootNavigationRef = any;


// ADD after existing imports
import type { DrawerScreenProps } from '@react-navigation/drawer';

// ADD after CustomerStackParamList
export type CommissionStackParamList = {
  CommissionsList: undefined;
  CommissionDetail: { commissionId: string }; // For future implementation
};

// UPDATE MainTabParamList - REMOVE Commissions from bottom tabs
export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Customers: NavigatorScreenParams<CustomerStackParamList>;
  Quotations: undefined;
  Settings: undefined;
  NotificationsTest: undefined;
  // Commissions: undefined; // ❌ REMOVE - Moving to drawer
};

// ADD new Drawer navigation types
export type MainDrawerParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  CommissionStack: NavigatorScreenParams<CommissionStackParamList>;
};

// UPDATE RootStackParamList - Change Main to use Drawer
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainDrawerParamList>; // ✅ Changed to use Drawer
  NotificationsStack: NavigatorScreenParams<NotificationsStackParamList>;
  NotificationsTest: undefined;
};

// ADD new Commission Screen Props Types
export type CommissionScreenProps = NativeStackScreenProps<
  CommissionStackParamList,
  'CommissionsList'
>;
export type CommissionDetailScreenProps = NativeStackScreenProps<
  CommissionStackParamList,
  'CommissionDetail'
>;

// ADD Drawer Navigation Props
export type MainDrawerProps = DrawerScreenProps<MainDrawerParamList>;
export type CommissionStackProps = DrawerScreenProps<
  MainDrawerParamList,
  'CommissionStack'
>;
